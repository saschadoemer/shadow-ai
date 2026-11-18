#!/usr/bin/env bash
# Creates, once, what the deploy job cannot create for itself: the trust between GitHub and
# Google Cloud and everything around it (docs/spec/ops.md §5). Safe to run again — every step
# looks first and leaves alone what is there.
#
# usage: tools/gcp-bootstrap.sh <project-id> [region]
# needs: gcloud logged in as an owner of the project, gh logged in as an admin of the
#        repository, and a project that is linked to a billing account.
set -Eeuo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: tools/gcp-bootstrap.sh <project-id> [region]" >&2
  exit 64
fi

readonly PROJECT_ID="$1"
readonly REGION="${2:-europe-west1}"
readonly REPOSITORY="shadow-ai"
readonly POOL="github"
readonly PROVIDER="shadow-ai"
readonly DEPLOY_EMAIL="shadow-ai-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
readonly RUNTIME_EMAIL="shadow-ai-run@${PROJECT_ID}.iam.gserviceaccount.com"
readonly EXCLUSION="shadow-ai-no-access-logs"
readonly EXCLUSION_FILTER='resource.type="cloud_run_revision" AND (log_id("run.googleapis.com/requests") OR log_id("run.googleapis.com/stdout"))'
readonly BUDGET="shadow-ai"
readonly APIS=(
  run.googleapis.com
  artifactregistry.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  sts.googleapis.com
  cloudresourcemanager.googleapis.com
  cloudbilling.googleapis.com
  billingbudgets.googleapis.com
)

# Every gcloud call works on this project and counts against its API quota.
export CLOUDSDK_CORE_PROJECT="$PROJECT_ID"
export CLOUDSDK_BILLING_QUOTA_PROJECT="$PROJECT_ID"
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

# A project, an API or a billing link that is minutes old is not visible to every service at
# once. Every call is tried up to 12 times, 10 seconds apart — about two minutes.
readonly ATTEMPTS=12
ERRORS="$(mktemp)"
readonly ERRORS
trap 'rm -f "$ERRORS"' EXIT

step="start"
trap 'echo "failed: ${step}" >&2' ERR

report() {
  printf '%-22s %s\n' "$step" "$1"
}

# Stops the script with the name of the step, where the ERR trap does not reach: inside a
# condition.
die() {
  echo "failed: ${step}" >&2
  exit 1
}

pause() {
  if [[ $1 -lt $ATTEMPTS ]]; then
    sleep 10
  fi
}

# read_back <command…> — runs a command that only reads, and prints what it printed. An error is
# tried again; after the last try it is shown and read_back fails. An error never reads as an
# empty answer. It always runs inside a command substitution, where the caller reports the
# failure; the trap is cleared so the step is not named twice.
read_back() {
  local attempt output
  trap - ERR
  for ((attempt = 1; attempt <= ATTEMPTS; attempt++)); do
    if output="$(trap - ERR; "$@" 2>"$ERRORS")"; then
      if [[ -n "$output" ]]; then
        printf '%s\n' "$output"
      fi
      return 0
    fi
    pause "$attempt"
  done
  cat "$ERRORS" >&2
  return 1
}

# exists <describe command…> — true when the thing is there, false when Google answers NOT_FOUND.
# Any other error — a permission or an API not visible yet — is tried again and then stops the
# script: it never reads as "missing".
exists() {
  local attempt
  for ((attempt = 1; attempt <= ATTEMPTS; attempt++)); do
    if (trap - ERR; "$@") >/dev/null 2>"$ERRORS"; then
      return 0
    fi
    if grep -q 'NOT_FOUND' "$ERRORS"; then
      return 1
    fi
    pause "$attempt"
  done
  cat "$ERRORS" >&2
  die
}

# change <command…> — runs a command that changes something. Its output is shown only when the
# last try has failed, so a good run prints one line per step. ALREADY_EXISTS counts as done: an
# earlier try made the thing and its answer was lost.
change() {
  local attempt
  for ((attempt = 1; attempt <= ATTEMPTS; attempt++)); do
    if (trap - ERR; "$@") >"$ERRORS" 2>&1 || grep -q 'ALREADY_EXISTS' "$ERRORS"; then
      return 0
    fi
    pause "$attempt"
  done
  cat "$ERRORS" >&2
  return 1
}

# has_binding <role> <member> <a get-iam-policy command…>
has_binding() {
  local role="$1" member="$2" found
  shift 2
  found="$(read_back "$@" --flatten='bindings[].members' \
    --filter="bindings.role=\"${role}\" AND bindings.members=\"${member}\"" \
    --format='value(bindings.role)')" || die
  [[ -n "$found" ]]
}

# ---------------------------------------------------------------------------------------------
step="apis"
enabled="$(read_back gcloud services list --enabled --format='value(config.name)')"
missing=()
for api in "${APIS[@]}"; do
  if ! grep -qxF "$api" <<<"$enabled"; then
    missing+=("$api")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  change gcloud services enable "${missing[@]}"
  report created
else
  report exists
fi

# The facts every later step needs. A name on GitHub can be registered again by somebody else;
# the numeric ID cannot, so the login is bound to the ID.
step="facts"
GITHUB_REPO="$(git remote get-url origin | sed -E 's#^(https://github\.com/|git@github\.com:)##; s#\.git$##')"
REPOSITORY_ID="$(read_back gh api "repos/${GITHUB_REPO}" --jq .id)"
PROJECT_NUMBER="$(read_back gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
BILLING_ACCOUNT="$(read_back gcloud billing projects describe "$PROJECT_ID" --format='value(billingAccountName)')"
BILLING_ACCOUNT="${BILLING_ACCOUNT#billingAccounts/}"
if [[ -z "$BILLING_ACCOUNT" ]]; then
  echo "the project is not linked to a billing account" >&2
  false
fi
readonly GITHUB_REPO REPOSITORY_ID PROJECT_NUMBER BILLING_ACCOUNT
readonly POOL_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}"
readonly CONDITION="assertion.repository_id == '${REPOSITORY_ID}' && assertion.ref == 'refs/heads/main'"

# ---------------------------------------------------------------------------------------------
step="image repository"
if exists gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION"; then
  report exists
else
  change gcloud artifacts repositories create "$REPOSITORY" --location="$REGION" \
    --repository-format=docker --description="Images of the game, pushed by the deploy job"
  report created
fi

step="cleanup rule"
policies="$(read_back gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" \
  --format='value(cleanupPolicies.keep.id,cleanupPolicies.delete.id,cleanupPolicyDryRun)')"
if [[ "$policies" == *keep*delete* && "$policies" != *True* ]]; then
  report exists
else
  policy_file="$(mktemp)"
  cat >"$policy_file" <<'JSON'
[
  {"name": "keep", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 5}},
  {"name": "delete", "action": {"type": "Delete"}, "condition": {"tagState": "any", "olderThan": "1d"}}
]
JSON
  change gcloud artifacts repositories set-cleanup-policies "$REPOSITORY" --location="$REGION" \
    --policy="$policy_file" --no-dry-run
  rm -f "$policy_file"
  report created
fi

step="identity pool"
if exists gcloud iam workload-identity-pools describe "$POOL" --location=global; then
  report exists
else
  change gcloud iam workload-identity-pools create "$POOL" --location=global \
    --display-name="GitHub Actions"
  report created
fi

step="identity provider"
if exists gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global \
  --workload-identity-pool="$POOL"; then
  report exists
else
  change gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" \
    --display-name="shadow-ai on GitHub" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref" \
    --attribute-condition="$CONDITION"
  report created
fi

step="deploy account"
if exists gcloud iam service-accounts describe "$DEPLOY_EMAIL"; then
  report exists
else
  change gcloud iam service-accounts create shadow-ai-deploy \
    --display-name="Deploys the game from GitHub Actions"
  report created
fi

step="runtime account"
if exists gcloud iam service-accounts describe "$RUNTIME_EMAIL"; then
  report exists
else
  change gcloud iam service-accounts create shadow-ai-run \
    --display-name="The identity the game runs as; it holds no role"
  report created
fi

# The pool may act as the deploy account, for tokens of this repository only.
step="keyless login"
login_member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository_id/${REPOSITORY_ID}"
if has_binding roles/iam.workloadIdentityUser "$login_member" \
  gcloud iam service-accounts get-iam-policy "$DEPLOY_EMAIL"; then
  report exists
else
  change gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_EMAIL" \
    --member="$login_member" --role=roles/iam.workloadIdentityUser
  report created
fi

# Push images, deploy the one service, run it as the runtime account. Nothing else.
step="deploy rights"
deploy_member="serviceAccount:${DEPLOY_EMAIL}"
granted=0
if ! has_binding roles/artifactregistry.writer "$deploy_member" \
  gcloud artifacts repositories get-iam-policy "$REPOSITORY" --location="$REGION"; then
  change gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" \
    --location="$REGION" --member="$deploy_member" --role=roles/artifactregistry.writer
  granted=1
fi
if ! has_binding roles/run.admin "$deploy_member" gcloud projects get-iam-policy "$PROJECT_ID"; then
  change gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$deploy_member" --role=roles/run.admin --condition=None
  granted=1
fi
if ! has_binding roles/iam.serviceAccountUser "$deploy_member" \
  gcloud iam service-accounts get-iam-policy "$RUNTIME_EMAIL"; then
  change gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_EMAIL" \
    --member="$deploy_member" --role=roles/iam.serviceAccountUser
  granted=1
fi
if [[ $granted -eq 1 ]]; then
  report created
else
  report exists
fi

# Request logs and nginx's access log carry the caller's IP address. They are not stored.
step="log exclusion"
exclusions="$(read_back gcloud logging sinks describe _Default --format='value(exclusions[].name)')"
if grep -q "$EXCLUSION" <<<"$exclusions"; then
  report exists
else
  change gcloud logging sinks update _Default \
    --add-exclusion="name=${EXCLUSION},filter=${EXCLUSION_FILTER}"
  report created
fi

step="budget"
budgets="$(read_back gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" \
  --filter="displayName=\"${BUDGET}\"" --format='value(name)')"
if [[ -n "$budgets" ]]; then
  report exists
else
  change gcloud billing budgets create --billing-account="$BILLING_ACCOUNT" \
    --display-name="$BUDGET" --budget-amount=5 --calendar-period=month \
    --filter-projects="projects/${PROJECT_ID}" \
    --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0
  report created
fi

step="repository variables"
changed=0
put_variable() {
  local name="$1" value="$2" current
  current="$(gh variable get "$name" --repo "$GITHUB_REPO" 2>/dev/null || true)"
  if [[ "$current" != "$value" ]]; then
    change gh variable set "$name" --repo "$GITHUB_REPO" --body "$value"
    changed=1
  fi
}
put_variable GCP_PROJECT_ID "$PROJECT_ID"
put_variable GCP_REGION "$REGION"
put_variable GCP_WORKLOAD_IDENTITY_PROVIDER "${POOL_NAME}/providers/${PROVIDER}"
put_variable GCP_DEPLOY_SERVICE_ACCOUNT "$DEPLOY_EMAIL"
if [[ $changed -eq 1 ]]; then
  report created
else
  report exists
fi

# ---------------------------------------------------------------------------------------------
# The summary is read back from the project, not from the variables above: it shows what is
# there, not what this script meant to create.
step="summary"
keys=0
for account in $(read_back gcloud iam service-accounts list --format='value(email)'); do
  count="$(read_back gcloud iam service-accounts keys list --iam-account="$account" --managed-by=user \
    --format='value(name)' | wc -l)"
  keys=$((keys + count))
done

older="$(read_back gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" \
  --format='value(cleanupPolicies.delete.condition.olderThan)')"
if [[ "$older" =~ ^[0-9]+s$ ]]; then
  older="$((${older%s} / 86400)) d"
fi

echo
echo "login condition:   $(read_back gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --location=global --workload-identity-pool="$POOL" --format='value(attributeCondition)')"
echo "cleanup rule:      keep $(read_back gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" --format='value(cleanupPolicies.keep.mostRecentVersions.keepCount)') newest, delete others older than ${older}, dry run: $(read_back gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" --format='value(cleanupPolicyDryRun)')"
echo "user-managed keys: ${keys}"
# A describe takes no --filter: every exclusion is listed as "name<TAB>filter" and ours is picked.
exclusion_lines="$(read_back gcloud logging sinks describe _Default --flatten='exclusions[]' \
  --format='value(exclusions.name,exclusions.filter)')"
echo "log exclusion:     $(sed -n "s/^${EXCLUSION}"$'\t'"//p" <<<"$exclusion_lines")"
echo "budget:            $(read_back gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" \
  --filter="displayName=\"${BUDGET}\"" \
  --format='value(amount.specifiedAmount.units,amount.specifiedAmount.currencyCode,thresholdRules[].thresholdPercent)') (amount, currency, thresholds as fractions)"
