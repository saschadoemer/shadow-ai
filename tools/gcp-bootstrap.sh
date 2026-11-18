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
  billingbudgets.googleapis.com
)

# Every gcloud call works on this project and counts against its API quota.
export CLOUDSDK_CORE_PROJECT="$PROJECT_ID"
export CLOUDSDK_BILLING_QUOTA_PROJECT="$PROJECT_ID"
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

step="start"
trap 'echo "failed: ${step}" >&2' ERR

report() {
  printf '%-22s %s\n' "$step" "$1"
}

# Runs a command that changes something. Its output is shown only when it fails, so a good run
# prints one line per step.
quiet() {
  local output
  if ! output="$("$@" 2>&1)"; then
    echo "$output" >&2
    return 1
  fi
}

# An API that was enabled or an account that was created seconds ago is not always visible to
# the next call. Such calls are tried up to six times, ten seconds apart.
retry() {
  local attempt
  for attempt in 1 2 3 4 5 6; do
    if "$@"; then
      return 0
    fi
    if [[ $attempt -lt 6 ]]; then
      sleep 10
    fi
  done
  return 1
}

# has_binding <role> <member> <a get-iam-policy command…>
has_binding() {
  local role="$1" member="$2"
  shift 2
  [[ -n "$("$@" --flatten='bindings[].members' \
    --filter="bindings.role=\"${role}\" AND bindings.members=\"${member}\"" \
    --format='value(bindings.role)' 2>/dev/null)" ]]
}

# ---------------------------------------------------------------------------------------------
step="apis"
enabled="$(gcloud services list --enabled --format='value(config.name)')"
missing=()
for api in "${APIS[@]}"; do
  if ! grep -qxF "$api" <<<"$enabled"; then
    missing+=("$api")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  quiet gcloud services enable "${missing[@]}"
  report created
else
  report exists
fi

# The facts every later step needs. A name on GitHub can be registered again by somebody else;
# the numeric ID cannot, so the login is bound to the ID.
step="facts"
GITHUB_REPO="$(git remote get-url origin | sed -E 's#^(https://github\.com/|git@github\.com:)##; s#\.git$##')"
REPOSITORY_ID="$(gh api "repos/${GITHUB_REPO}" --jq .id)"
PROJECT_NUMBER="$(retry gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
BILLING_ACCOUNT="$(retry gcloud billing projects describe "$PROJECT_ID" --format='value(billingAccountName)')"
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
if gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" >/dev/null 2>&1; then
  report exists
else
  retry quiet gcloud artifacts repositories create "$REPOSITORY" --location="$REGION" \
    --repository-format=docker --description="Images of the game, pushed by the deploy job"
  report created
fi

step="cleanup rule"
policies="$(gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" \
  --format='value(cleanupPolicies.keep.id,cleanupPolicies.delete.id,cleanupPolicyDryRun)' 2>/dev/null)"
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
  quiet gcloud artifacts repositories set-cleanup-policies "$REPOSITORY" --location="$REGION" \
    --policy="$policy_file" --no-dry-run
  rm -f "$policy_file"
  report created
fi

step="identity pool"
if gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1; then
  report exists
else
  retry quiet gcloud iam workload-identity-pools create "$POOL" --location=global \
    --display-name="GitHub Actions"
  report created
fi

step="identity provider"
if gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global \
  --workload-identity-pool="$POOL" >/dev/null 2>&1; then
  report exists
else
  retry quiet gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" \
    --display-name="shadow-ai on GitHub" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref" \
    --attribute-condition="$CONDITION"
  report created
fi

step="deploy account"
if gcloud iam service-accounts describe "$DEPLOY_EMAIL" >/dev/null 2>&1; then
  report exists
else
  retry quiet gcloud iam service-accounts create shadow-ai-deploy \
    --display-name="Deploys the game from GitHub Actions"
  report created
fi

step="runtime account"
if gcloud iam service-accounts describe "$RUNTIME_EMAIL" >/dev/null 2>&1; then
  report exists
else
  retry quiet gcloud iam service-accounts create shadow-ai-run \
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
  retry quiet gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_EMAIL" \
    --member="$login_member" --role=roles/iam.workloadIdentityUser
  report created
fi

# Push images, deploy the one service, run it as the runtime account. Nothing else.
step="deploy rights"
deploy_member="serviceAccount:${DEPLOY_EMAIL}"
granted=0
if ! has_binding roles/artifactregistry.writer "$deploy_member" \
  gcloud artifacts repositories get-iam-policy "$REPOSITORY" --location="$REGION"; then
  retry quiet gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" \
    --location="$REGION" --member="$deploy_member" --role=roles/artifactregistry.writer
  granted=1
fi
if ! has_binding roles/run.admin "$deploy_member" gcloud projects get-iam-policy "$PROJECT_ID"; then
  retry quiet gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$deploy_member" --role=roles/run.admin --condition=None
  granted=1
fi
if ! has_binding roles/iam.serviceAccountUser "$deploy_member" \
  gcloud iam service-accounts get-iam-policy "$RUNTIME_EMAIL"; then
  retry quiet gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_EMAIL" \
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
if gcloud logging sinks describe _Default --format='value(exclusions[].name)' | grep -q "$EXCLUSION"; then
  report exists
else
  quiet gcloud logging sinks update _Default \
    --add-exclusion="name=${EXCLUSION},filter=${EXCLUSION_FILTER}"
  report created
fi

step="budget"
if [[ -n "$(gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" \
  --filter="displayName=\"${BUDGET}\"" --format='value(name)')" ]]; then
  report exists
else
  retry quiet gcloud billing budgets create --billing-account="$BILLING_ACCOUNT" \
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
    quiet gh variable set "$name" --repo "$GITHUB_REPO" --body "$value"
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
for account in $(gcloud iam service-accounts list --format='value(email)'); do
  count="$(gcloud iam service-accounts keys list --iam-account="$account" --managed-by=user \
    --format='value(name)' | wc -l)"
  keys=$((keys + count))
done

older="$(gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" \
  --format='value(cleanupPolicies.delete.condition.olderThan)' 2>/dev/null)"
if [[ "$older" =~ ^[0-9]+s$ ]]; then
  older="$((${older%s} / 86400)) d"
fi

echo
echo "login condition:   $(gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --location=global --workload-identity-pool="$POOL" --format='value(attributeCondition)')"
echo "cleanup rule:      keep $(gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" --format='value(cleanupPolicies.keep.mostRecentVersions.keepCount)' 2>/dev/null) newest, delete others older than ${older}, dry run: $(gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" --format='value(cleanupPolicyDryRun)' 2>/dev/null)"
echo "user-managed keys: ${keys}"
echo "log exclusion:     $(gcloud logging sinks describe _Default --flatten='exclusions[]' \
  --filter="exclusions.name=\"${EXCLUSION}\"" --format='value(exclusions.filter)')"
echo "budget:            $(gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" \
  --filter="displayName=\"${BUDGET}\"" \
  --format='value(amount.specifiedAmount.units,amount.specifiedAmount.currencyCode,thresholdRules[].thresholdPercent)') (amount, currency, thresholds as fractions)"
