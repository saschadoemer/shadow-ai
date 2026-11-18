# 0030 — Implementation plan: Cloud Run deployment

**Spec:** [`docs/features/0030-cloud-run-deployment.md`](../features/0030-cloud-run-deployment.md)
(approved 2026-11-17). The plan argues from the spec; where they differ, the spec wins. Read the
spec first, then `CLAUDE.md`, then `docs/spec/ops.md` and `docs/spec/testing.md` §5.
**Written:** 2026-11-17 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0016 is merged into `main` (`d620c07` or later). The draft, the
approval and this plan are on the planning branch
`claude/github-pipelines-gcloud-deploy-c5bdd3`. Cut `feature/0030-cloud-run-deployment` from
its tip, merge the latest `main` into it, and work there.

**Goal:** when `ci` is green on `main`, a job `deploy` publishes the image `ci` tested to Cloud
Run and proves the live URL with the smoke test; one script creates, once, what the pipeline
cannot create for itself.

**Approach:** four code tasks. The smoke spec follows the scheme of `BASE_URL` (T1). The deploy
script (T2). The bootstrap script (T3). The workflow: `shellcheck`, the image handover and the
job `deploy` (T4). Then the documents (T5), the full check (T6), the walk (T7) and the pull
request with the check after the merge (T8).

**Tech stack:** Bash, `gcloud` (577 was used to check every flag below), `gh`, Docker, GitHub
Actions, Playwright. No new npm dependency.

## Global constraints

- **No cloud before the walk.** The agent runs neither script against a real project. The
  automated pre-checks are `bash -n`, `shellcheck` and `npm run check`; the first real run of
  the bootstrap is step 1 of the walk, and it is the author's.
- **No game code changes.** Nothing under `src/`, `public/`, `Dockerfile` or `nginx.conf` is
  touched. The only file under `tests/` that changes is `tests/e2e/smoke.spec.ts`.
- **Bash 3.2.** macOS ships Bash 3.2 and the author runs the scripts there: no associative
  arrays, no `mapfile`, no `${var,,}`, and an empty array is never expanded under `set -u`.
- **Quiet scripts.** The bootstrap prints one line per step and five summary lines, nothing
  else, when it succeeds. The deploy script prints one line on standard output: the URL.
  Everything else goes to standard error.
- **No secret, no key.** No `gcloud iam service-accounts keys create`, no `gh secret set`, no
  key file. The four repository variables are identifiers.
- **Names, verbatim from the spec:** service `shadow-ai`; image repository `shadow-ai`; image
  `<region>-docker.pkg.dev/<project>/shadow-ai/shadow-ai:<tag>`; pool `github`; provider
  `shadow-ai`; service accounts `shadow-ai-deploy` and `shadow-ai-run`; variables
  `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`,
  `GCP_DEPLOY_SERVICE_ACCOUNT`; default region `europe-west1`.
- **Numbers, verbatim from the spec:** 0 to 1 instance; 1 vCPU; 128 MiB; first-generation
  execution environment; concurrency 250; port 8080; request-based billing; the 5 newest image
  versions kept, others deleted when older than 1 day; a budget of 5 with thresholds at 50 %,
  90 % and 100 %; the image artifact kept for 1 day.
- **If 128 MiB is not enough, or Google's front end alters a header the smoke spec asserts:**
  stop and ask. Do not raise the number and do not loosen the assertion.
- Commits: imperative subject, a body that says why, signed (run `git commit` outside the
  sandbox). Format with `npx biome check --write <files>` before `npm run check`.

## File structure

| File | Responsibility |
|---|---|
| `tests/e2e/smoke.spec.ts` | modified: the `get` helper picks `http` or `https` by the scheme of the URL |
| `tools/gcp-deploy.sh` | new: push one local image, deploy it, send all traffic to it, print the URL |
| `tools/gcp-bootstrap.sh` | new: everything the deploy job cannot create for itself, and a summary read back from the project |
| `.github/workflows/ci.yml` | modified: `shellcheck`, the image artifact on `main`, the job `deploy` |
| `docs/spec/ops.md` | modified: §2, §3, §4 and §5 describe the installation |
| `docs/spec/testing.md` | modified: §5 gains "What only exists after the merge" |
| `docs/plan.md`, `CLAUDE.md`, `README.md` | modified: the game no longer runs only locally |
| `docs/features/0030-cloud-run-deployment.md`, `docs/features/README.md` | modified in T7 and T8: the result, the status |

---

### Task 1: The smoke spec speaks HTTPS

**Files:**
- Modify: `tests/e2e/smoke.spec.ts:1-46`

**Interfaces:**
- Produces: `BASE_URL=https://… npm run test:e2e` works; T4 and the walk rely on it.

There is no failing test to write first: the spec is the test, and an `https://` address to
run it against does not exist before the walk. The proof that nothing broke is the run against
the local container.

- [ ] **Step 1: Change the imports and the helper.** Replace the first import line and the
  `get` function, and correct the two comments that say "container":

```ts
import http from 'node:http';
import https from 'node:https';
import { expect, test } from '@playwright/test';

/** Set when the spec runs against a served build — the container or the live service. */
const containerUrl = process.env.BASE_URL;
```

```ts
/**
 * A plain GET that reports headers exactly as sent — nothing decompresses or redirects. The
 * module follows the scheme: the local container speaks HTTP, the live service HTTPS.
 */
function get(url: string, headers: Record<string, string> = {}): Promise<RawResponse> {
  const client = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    client
      .get(url, { headers }, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      })
      .on('error', reject);
  });
}
```

  Leave every test and every assertion as it is. The `test.skip` message at the header block
  becomes `'header checks run against a served build (BASE_URL)'`.

- [ ] **Step 2: Run** `npx biome check --write tests/e2e/smoke.spec.ts` and `npm run check`.
  Expected: green.

- [ ] **Step 3: Prove the container run is unchanged.**

```bash
docker build -t shadow-ai .
docker run -d --rm -p 8080:8080 --name shadow-ai shadow-ai
curl -sf --retry 30 --retry-delay 1 --retry-all-errors -o /dev/null http://localhost:8080/
BASE_URL=http://localhost:8080 npm run test:e2e
docker stop shadow-ai
```

  Expected: every test passes, the three header tests included (not skipped).

- [ ] **Step 4: Commit** — `Let the smoke spec follow the scheme of BASE_URL`. Body: the live
  service speaks HTTPS and Node's `http` module refuses such an address.

---

### Task 2: The deploy script

**Files:**
- Create: `tools/gcp-deploy.sh` (mode 755)

**Interfaces:**
- Consumes: environment `GCP_PROJECT_ID`, `GCP_REGION`; a local Docker image; `gcloud` logged
  in; the repository and the runtime account that T3's script creates.
- Produces: `tools/gcp-deploy.sh <local-image> <tag>` — standard output is exactly one line,
  the service URL; exit code 0 on success, 64 on wrong usage. T4 captures the URL with
  `url="$(tools/gcp-deploy.sh shadow-ai "$GITHUB_SHA")"`.

- [ ] **Step 1: Write the script.**

```bash
#!/usr/bin/env bash
# Pushes one local image and deploys it to the Cloud Run service (docs/spec/ops.md §5). The
# deploy job and a deployment by hand run this same script, so the walk proves the commands the
# pipeline uses.
#
# usage: GCP_PROJECT_ID=<project> GCP_REGION=<region> tools/gcp-deploy.sh <local-image> <tag>
# prints: the service URL, as the only line on standard output.
set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: GCP_PROJECT_ID=<project> GCP_REGION=<region> tools/gcp-deploy.sh <local-image> <tag>" >&2
  exit 64
fi
: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is not set}"
: "${GCP_REGION:?GCP_REGION is not set}"

readonly LOCAL_IMAGE="$1"
readonly TAG="$2"
readonly SERVICE="shadow-ai"
readonly HOST="${GCP_REGION}-docker.pkg.dev"
readonly IMAGE="${HOST}/${GCP_PROJECT_ID}/shadow-ai/shadow-ai:${TAG}"
readonly RUNTIME="shadow-ai-run@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

export CLOUDSDK_CORE_PROJECT="$GCP_PROJECT_ID"
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

# Everything but the URL goes to standard error, so a caller can capture the URL.
{
  # One line in ~/.docker/config.json: gcloud hands Docker a token for this registry host.
  gcloud auth configure-docker "$HOST"
  docker tag "$LOCAL_IMAGE" "$IMAGE"
  docker push "$IMAGE"

  # Creates the service on the first run and adds a revision on every later one. The settings
  # are the table "The service" of feature 0030; they are set every time, so a change made by
  # hand in the console does not survive the next deployment.
  gcloud run deploy "$SERVICE" \
    --region="$GCP_REGION" \
    --image="$IMAGE" \
    --service-account="$RUNTIME" \
    --execution-environment=gen1 \
    --cpu=1 \
    --memory=128Mi \
    --concurrency=250 \
    --min-instances=0 \
    --max-instances=1 \
    --port=8080 \
    --cpu-throttling \
    --no-invoker-iam-check

  # After a rollback the traffic is pinned to an old revision and a new one would get none.
  # The newest main is live, always.
  gcloud run services update-traffic "$SERVICE" --region="$GCP_REGION" --to-latest
} >&2

gcloud run services describe "$SERVICE" --region="$GCP_REGION" --format='value(status.url)'
```

  `--cpu-throttling` is request-based billing: CPU is allocated only while a request is
  answered. `--no-invoker-iam-check` is the documented way to make a service public; it needs
  the right to set the service's IAM policy, which is why the deploy account is Cloud Run
  Admin.

- [ ] **Step 2: Make it executable and check it.**

```bash
chmod +x tools/gcp-deploy.sh
bash -n tools/gcp-deploy.sh
shellcheck tools/gcp-deploy.sh
tools/gcp-deploy.sh; echo "exit: $?"
GCP_REGION=europe-west1 tools/gcp-deploy.sh shadow-ai x; echo "exit: $?"
```

  Expected: `bash -n` and `shellcheck` print nothing. The third command prints the usage line
  and `exit: 64`. The fourth prints `GCP_PROJECT_ID is not set` and `exit: 1`, and has called
  neither `gcloud` nor `docker`. Do **not** run it with both variables set.

- [ ] **Step 3: Check every flag against the installed `gcloud`** — the help pages need no
  project:

```bash
gcloud run deploy --help | grep -E -- '--(execution-environment|max-instances|min-instances|concurrency|cpu-throttling|invoker-iam-check|service-account)'
gcloud run services update-traffic --help | grep -- '--to-latest'
```

  Expected: every flag appears. If one does not, stop and ask.

- [ ] **Step 4: Commit** — `Add the script that deploys an image to Cloud Run`. Body: one
  script for the pipeline and for a deployment by hand, so the walk proves what the pipeline
  runs.

---

### Task 3: The bootstrap script

**Files:**
- Create: `tools/gcp-bootstrap.sh` (mode 755)

**Interfaces:**
- Consumes: `gcloud` logged in as an owner of the project, `gh` logged in as an admin of the
  repository, the `origin` remote.
- Produces: `tools/gcp-bootstrap.sh <project-id> [region]` — twelve step lines, a blank line,
  five summary lines; exit code 0, or the failing step's name on standard error. It creates the
  image repository `shadow-ai` and the account `shadow-ai-run` that T2's script uses, and the
  four repository variables that T4's job reads.

The twelve steps, in this order and with these names: `apis`, `image repository`,
`cleanup rule`, `identity pool`, `identity provider`, `deploy account`, `runtime account`,
`keyless login`, `deploy rights`, `log exclusion`, `budget`, `repository variables`.

- [ ] **Step 1: Write the script.**

```bash
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
```

  Notes for the implementer, not for the file:

  - `facts` is a step name for the error trap only; it prints no line. That keeps the count at
    twelve step lines.
  - `false` after the billing message fires the `ERR` trap, so the failing step is named.
  - `dry run:` prints empty or `False` when the rule is live. The walk's step 4 reads it.
  - `gcloud artifacts repositories describe` writes notes about encryption and size to
    standard error; the `2>/dev/null` on those calls keeps them out of the output.
  - Both scripts were checked on 2026-11-17 with Bash 3.2 (`bash -n`), `shellcheck` 0.11 and
    their usage paths, as written here. No line of them has run against a project.
  - The field paths in `--format` (`cleanupPolicies.<id>…`, `cleanupPolicyDryRun`,
    `attributeCondition`, `exclusions[].filter`, `amount.specifiedAmount…`,
    `thresholdRules[].thresholdPercent`) are the names of the REST resources `Repository`,
    `WorkloadIdentityPoolProvider`, `LogSink` and `Budget`. They cannot be run before the walk.
    Read each resource's REST reference once and compare the names; a wrong name prints an
    empty value and fails the walk at step 4.

- [ ] **Step 2: Make it executable and check it.**

```bash
chmod +x tools/gcp-bootstrap.sh
bash -n tools/gcp-bootstrap.sh
shellcheck tools/gcp-bootstrap.sh
tools/gcp-bootstrap.sh; echo "exit: $?"
```

  Expected: `bash -n` prints nothing; the last command prints the usage line and `exit: 64`.
  `shellcheck` 0.11 prints nothing for the script as written here; a finding is fixed, not
  disabled. Do **not** run the script with a project ID.

- [ ] **Step 3: Check every flag against the installed `gcloud` and `gh`:**

```bash
gcloud artifacts repositories set-cleanup-policies --help | grep -E -- '--(policy|dry-run)'
gcloud iam workload-identity-pools providers create-oidc --help | grep -E -- '--(attribute-condition|attribute-mapping|issuer-uri)'
gcloud logging sinks update --help | grep -- '--add-exclusion'
gcloud billing budgets create --help | grep -E -- '--(budget-amount|calendar-period|filter-projects|threshold-rule)'
gcloud iam service-accounts keys list --help | grep -- '--managed-by'
gh variable get --help | head -3
```

  Expected: every flag appears and `gh variable get` exists. If one does not, stop and ask.

- [ ] **Step 4: Read the script once against the spec's table "What the bootstrap creates"**,
  row by row: seven APIs, the repository, the cleanup rule (5, 1 day), the pool `github`, the
  provider `shadow-ai` with issuer and condition, the deploy account with exactly three roles,
  the runtime account with none, the exclusion on `_Default`, the budget of 5 at 50 %, 90 % and
  100 % for this project, the four variables.

- [ ] **Step 5: Commit** — `Add the script that prepares a project for the deploy job`. Body:
  the pipeline cannot create the trust it needs to log in; one script does it once, and reads
  back what it made so the walk checks five lines instead of five console pages.

---

### Task 4: The workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `tools/gcp-deploy.sh` (T2), the four repository variables (T3), the smoke spec that
  speaks HTTPS (T1).
- Produces: the job `deploy`. The required check stays the job named `ci`.

- [ ] **Step 1: Resolve the two pinned actions again** — the releases may have moved since the
  plan was written:

```bash
for r in google-github-actions/auth google-github-actions/setup-gcloud; do
  tag="$(gh api "repos/$r/releases/latest" --jq .tag_name)"
  echo "$r $tag $(gh api "repos/$r/commits/$tag" --jq .sha)"
done
```

  On 2026-11-17 this printed `auth v3 7c6bc770dae815cd3e89ee6cdf493a5fab2cc093` and
  `setup-gcloud v3.0.1 aa5489c8933f4cc7a4f7d45035b3b1440c9c10db`. Use what it prints today.

- [ ] **Step 2: Change the header comment and add `shellcheck`.** The first comment becomes:

```yaml
# The whole check on every pull request and on main, and the deployment of main (ops.md §4
# and §5). The required status check for branch protection is the job "ci"; "deploy" runs
# after it, on main only.
```

  After the step `- run: npm run lint`:

```yaml
      - name: Check the shell scripts
        run: shellcheck tools/gcp-bootstrap.sh tools/gcp-deploy.sh
```

- [ ] **Step 3: Hand the tested image over.** After the step "Smoke test against the
  container" and before "Stop the container":

```yaml
      - name: Save the tested image for the deploy job
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        # The image ID is printed here and again after the deploy job loads it: the same ID
        # is the proof that what was tested is what goes live.
        run: |
          docker image inspect --format '{{.Id}}' shadow-ai
          docker save shadow-ai | gzip > shadow-ai-image.tar.gz

      - name: Hand the image to the deploy job
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v7
        with:
          name: shadow-ai-image
          path: shadow-ai-image.tar.gz
          retention-days: 1
          if-no-files-found: error
```

- [ ] **Step 4: Add the job** at the end of the file, at the indentation of `ci:`:

```yaml
  deploy:
    name: deploy
    needs: ci
    # Only main, only after a green ci, and only when the bootstrap has run: before it, and in
    # a fork, the variable is empty and the job is skipped.
    if: github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.GCP_PROJECT_ID != ''
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: read
      id-token: write
    # Merges go live in order, never side by side; a running deployment is never cancelled.
    concurrency:
      group: deploy
      cancel-in-progress: false
    env:
      GCP_PROJECT_ID: ${{ vars.GCP_PROJECT_ID }}
      GCP_REGION: ${{ vars.GCP_REGION }}
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm

      - uses: actions/download-artifact@v8
        with:
          name: shadow-ai-image

      - name: Load the image ci tested
        run: |
          gunzip -c shadow-ai-image.tar.gz | docker load
          docker image inspect --format '{{.Id}}' shadow-ai

      # The two actions below are pinned to a commit: this is the one job that carries a cloud
      # identity. No key exists; the login is a token GitHub signs for this run (ops.md §5).
      - name: Log in to Google Cloud without a key
        uses: google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093 # v3
        with:
          workload_identity_provider: ${{ vars.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ vars.GCP_DEPLOY_SERVICE_ACCOUNT }}

      - uses: google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db # v3.0.1

      - name: Deploy
        id: deploy
        run: |
          url="$(tools/gcp-deploy.sh shadow-ai "$GITHUB_SHA")"
          echo "url=$url" >> "$GITHUB_OUTPUT"

      - run: npm ci

      - name: Install the Playwright browser
        run: npx playwright install chromium

      - name: Smoke test against the live URL
        run: npm run test:e2e
        env:
          BASE_URL: ${{ steps.deploy.outputs.url }}

      - name: Say what is live
        if: always() && steps.deploy.outputs.url != ''
        env:
          URL: ${{ steps.deploy.outputs.url }}
        run: echo "Deployed \`$GITHUB_SHA\` to $URL" >> "$GITHUB_STEP_SUMMARY"

      - name: Keep the Playwright report of a failed run
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report-live
          path: playwright-report
          retention-days: 7
```

  The workflow-level `permissions: contents: read` stays; the job's own block is what gives
  `deploy`, and only `deploy`, the right to ask for a login token.

- [ ] **Step 5: Check the file.**

```bash
node -e "
const text = require('node:fs').readFileSync('.github/workflows/ci.yml', 'utf8');
for (const needle of ['needs: ci', \"vars.GCP_PROJECT_ID != ''\", 'id-token: write', 'cancel-in-progress: false', 'retention-days: 1', 'shellcheck tools/gcp-bootstrap.sh tools/gcp-deploy.sh']) {
  if (!text.includes(needle)) { console.error('missing: ' + needle); process.exitCode = 1; }
}
if ((text.match(/id-token: write/g) ?? []).length !== 1) { console.error('id-token: write must appear once'); process.exitCode = 1; }
"
shellcheck tools/gcp-bootstrap.sh tools/gcp-deploy.sh
npm run check
```

  Expected: no output from the first two commands, `npm run check` green. If `actionlint` is
  installed, run it too; it is not a dependency and is not added.

- [ ] **Step 6: Commit** — `Deploy main to Cloud Run after a green ci`. Body: the job loads the
  image `ci` tested rather than building a second one, logs in without a key, and proves the
  live URL with the smoke test; it is skipped until the bootstrap has set the variables.

---

### Task 5: The documents

**Files:**
- Modify: `docs/spec/ops.md`, `docs/spec/testing.md`, `docs/plan.md`, `CLAUDE.md`, `README.md`

- [ ] **Step 1: Read the price of data sent to players.** The spec could not confirm it. Open
  the provider's network price list in a browser and find the Premium Tier price per GiB for
  data sent to the internet from a European region, first tier of volume. If the page gives a
  number, use it in step 5 below. If it cannot be read, ask the author; do not write the 2024
  figure as a fact.

- [ ] **Step 2: `ops.md` §2.** The last sentence, "No cookies are set; nothing is logged beyond
  nginx's access log.", becomes: "No cookies are set. nginx writes its access log to standard
  output: locally that is the terminal, and on Cloud Run it is not stored (§5)."

- [ ] **Step 3: `ops.md` §3.** "This is how the game runs until the end of the project (plan
  M8)." becomes: "This is how the game runs on the author's machine. Every merge to `main` also
  goes to Cloud Run (§5)."

- [ ] **Step 4: `ops.md` §4.** The first sentence becomes: "GitHub Actions, one workflow with
  two jobs: `ci` on every pull request and on `main`, and `deploy` after it on `main` only
  (§5). The steps of `ci`:". The list gains, after the Biome check, "`shellcheck` over the
  shell scripts under `tools/`", and at its end "on `main` only: save the image that was just
  tested as an artifact for `deploy`, kept for 1 day"; renumber. "Red blocks the merge" stays;
  add that `deploy` is not a required check, because it does not run on a pull request.

- [ ] **Step 5: `ops.md` §5.** Replace the whole section. Title: "Deployment". It says, in
  this order and in the document's own plain style — take every name and number from the spec,
  none from memory:

  1. What runs where: one Cloud Run service `shadow-ai` in a project of the author's own,
     public without login, the newest `main` live; the address is a preview until M8 and is
     not announced.
  2. What the author does once: creates the project, links billing, runs
     `tools/gcp-bootstrap.sh <project-id> [region]`. The table of what it creates, copied from
     the spec. The script is safe to run again, prints one line per step and a summary read
     back from the project.
  3. Why there is no secret: Workload Identity Federation, the provider's condition (numeric
     repository ID and `refs/heads/main`), no key file, four repository variables that are
     identifiers.
  4. The service: the table of eight settings from the spec, and that `tools/gcp-deploy.sh`
     sets them on every deployment, so a change by hand does not survive the next one.
  5. The job `deploy`: its condition, its two permissions, the concurrency group, the image
     from the artifact, the live smoke test, the job summary. A newer merge that waits
     replaces an older one that waits; the older run then shows as cancelled, which is not a
     failure.
  6. Logs: what is not stored and why, what is (standard error, 30 days), and that an nginx
     error line can name a client address.
  7. Cost: the table of free amounts and prices from the spec with the date they were read,
     the price from step 1, the ceiling for computing with 1 instance (57.89 a month), the
     budget alert at 5, and that the alert warns and stops nothing.
  8. Putting the previous revision back, the two commands:

     ```
     gcloud run revisions list --service=shadow-ai --region=<region>
     gcloud run services update-traffic shadow-ai --region=<region> --to-revisions=<revision>=100
     ```

     and that the next deployment sends all traffic to the newest revision again.
  9. A custom domain comes with M8.

  The sentences "The pipeline is a feature in M8" and "Until M8 this section describes an
  intention, not an installation" go.

- [ ] **Step 6: `testing.md` §5.** After the paragraph that begins "A walk takes a few
  minutes", add:

  > **What only exists after the merge.** A feature can end in something that only exists on
  > `main` — a job that runs on a merge, for example. That part is not a step of the walk. The
  > spec lists it under "After the merge"; the author checks it with the agent right after
  > merging, one step per message as in the walk, and the answers are recorded as a comment on
  > the pull request. A failure there is a defect and is fixed by a follow-up change.
  > Everything that can be proved before the merge stays in the walk.

- [ ] **Step 7: `docs/plan.md` §2.** The M8 row becomes "**Save states, title screen, polish,
  English complete, the custom domain**"; its mark stays **Distribution**. The sentence "Until
  M8 the game runs locally from its container (`docs/spec/ops.md` §3); the Dockerfile and CI
  exist from M2." becomes: "The Dockerfile and CI exist from M2. From feature 0030 on, every
  merge to `main` is deployed to Cloud Run (`docs/spec/ops.md` §5): until M8 that address is a
  preview of an unfinished game and is not announced; distribution stays with M8."

- [ ] **Step 8: `CLAUDE.md` §1.** "Cloud Run is the target; until the end of the project the
  container runs locally." becomes: "Every merge to `main` is deployed to Cloud Run
  (`docs/spec/ops.md` §5); the same container runs locally."

- [ ] **Step 9: `README.md`.** In "Status", one sentence: every merge to `main` is deployed to
  Cloud Run (feature 0030). No address. In "Run it", after the container block:

  ````
  Every merge to `main` is deployed by the workflow. A new Google Cloud project is prepared
  once; a deployment by hand uses the script the workflow uses:

  ```
  tools/gcp-bootstrap.sh <project-id>      # once: registry, keyless login, accounts, budget, repository variables
  GCP_PROJECT_ID=<project-id> GCP_REGION=europe-west1 tools/gcp-deploy.sh shadow-ai <tag>
  ```

  What they create and what it costs is in [docs/spec/ops.md](docs/spec/ops.md) §5.
  ````

- [ ] **Step 10: Run** `npm run check`, **commit** — `Move the deployment into the spec`.

---

### Task 6: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the header tests included.
- [ ] **Step 4:** `shellcheck tools/gcp-bootstrap.sh tools/gcp-deploy.sh` — no output.
- [ ] **Step 5:** `git status` is clean; `git diff main --stat` shows no file under `src/`,
  `public/`, and neither `Dockerfile` nor `nginx.conf`.

---

### Task 7: The acceptance walk

- [ ] **Step 1:** state the spec's preconditions in one message and wait until the author says
  they are met: a new Google Cloud project with a billing account linked and nothing else in
  it; `gcloud` logged in as an owner of it; `gh` logged in as an admin of the repository;
  Docker running; a terminal in the repository root on `feature/0030-cloud-run-deployment`;
  Chrome; a second device on another network. Ask for the project ID — an identifier, not a
  secret — and for the region if it is not `europe-west1`.
- [ ] **Step 2:** guide the author through steps 1–20 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words, with the project
  ID filled in. The author runs every command in their own terminal. Record each answer as
  given. Never answer a step yourself, and never run a script for the author.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 6, and start again at step 1. **A restarted walk needs a project in
  which the bootstrap has not run**, because step 2 expects `created` on every line: ask the
  author to delete the project and create a new one, and say so before fixing anything, so the
  author can decide whether to change the spec's step instead.
- [ ] **Step 4:** after step 20 ask the two feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–20`, followed by the feel
  notes, into the spec and commit it — `Record the walk of 0030`. Steps 21–24 are not part of
  this line.

---

### Task 8: The pull request, and the check after the merge

- [ ] **Step 1:** merge the latest `main` again and rerun Task 6. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`; commit — `Mark 0030 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0030: Cloud Run deployment`, with the walk's result and feel notes in its
  description, and one sentence that steps 21–24 follow the merge. CI must be green: `ci`
  passes and `deploy` shows as skipped (criterion 8). The author merges.
- [ ] **Step 4:** when the author says the pull request is merged, guide steps 21–24 of the
  spec, one action step with its expected step per message. In step 22, also ask the author to
  compare the image ID printed by "Save the tested image for the deploy job" with the one
  printed by "Load the image ci tested": they are the same (criterion 9).
- [ ] **Step 5:** with the author's go, record the four answers as a comment on the pull
  request. A red `deploy` or a failed step is a defect: say so, and propose the follow-up
  change; do not reopen the feature.
