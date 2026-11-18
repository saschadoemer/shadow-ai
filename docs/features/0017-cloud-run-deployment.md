# 0017 — Cloud Run deployment

**Status:** approved 2026-11-17
**Milestone:** M8, pulled forward
**Drafted:** 2026-11-17

## Goal

Every merge to `main` puts the game on a public URL, without anyone touching a console: when
`ci` is green on `main`, a second job publishes the image `ci` tested to Cloud Run and proves
the live URL with the smoke test. What the pipeline cannot create for itself — the trust between
GitHub and Google Cloud — one script creates, once, from the author's machine. An idle game
costs nothing.

## Scope

**In:**

- `tools/gcp-bootstrap.sh`, run once by the author, safe to run again: the APIs, the image
  repository with its cleanup rule, the keyless login from GitHub, the two service accounts, the
  log exclusion, the budget alert, and the four repository variables on GitHub
- `tools/gcp-deploy.sh`: pushes one local image and deploys it to the Cloud Run service with the
  settings below, creating the service when it does not exist — the same script for the pipeline
  and for a deployment by hand
- a job `deploy` in `.github/workflows/ci.yml`, after `ci`, on a push to `main` only
- the smoke spec learns to speak HTTPS, so it runs unchanged against the live URL
- `shellcheck` over both scripts as a step of `ci`
- `docs/spec/ops.md` §2 to §5 describe the installation instead of an intention; `docs/plan.md`
  §2 and `CLAUDE.md` §1 lose "until M8 the game runs locally"; the `README.md` section "Run it"
  names the two scripts
- `docs/spec/testing.md` §5 gains one paragraph: what can only exist after the merge is not a
  step of the walk; it is checked right after the merge and recorded on the pull request (see
  "Acceptance in two parts")

**Out, explicitly:**

- creating the Google Cloud project and linking it to a billing account — the author does both
  by hand before the bootstrap; no script holds the right to do it
- a custom domain — M8, with the title and the distribution
- a second environment, preview deployments per pull request, a gate that holds traffic back
  until the live test has passed — one service, the newest `main` is live; added when a broken
  deployment has cost something
- Terraform or any other infrastructure tool — five resources do not carry it
- an imprint or a privacy notice inside the game — a publicly reachable site can need both
  under German law, and this spec does not decide law: the author has it checked by a
  qualified person. If something has to be shown, it is a feature of its own; the game has
  drawn text since feature 0016, one sentence at a time, and has no screen for a notice
- announcing the URL — the README names no address until that check has an answer
- a hard spending stop — Google Cloud has none to switch on; the instance limit and the alert
  are the guard
- distribution as such — M8 keeps that mark; until then the URL is a preview of an unfinished
  game

## Behaviour

Refines `ops.md` §4 and §5 and replaces their last sentence, "until M8 this section describes an
intention".

### What the author does once

1. Creates a new Google Cloud project of their own and links it to a billing account.
2. Runs `tools/gcp-bootstrap.sh <project-id>` in the repository, logged in to `gcloud` as an
   owner of the project and to `gh` as an admin of the repository.

The script needs nothing else. It takes the region from an optional second argument, default
`europe-west1`. It reads the repository from the `origin` remote. Every step first looks for
what it would create and leaves it alone when it is there, so a second run changes nothing and
ends with exit code 0. A step that fails stops the script with the name of the step; the run is
repeated after the cause is fixed. The script prints one line per step: `created` or `exists`.
Enabling the APIs is one step; it prints `created` when it had to enable at least one.

The script ends with a summary of five lines that it reads back from the project, not from its
own variables: the provider's condition, the cleanup rule, the number of user-managed
service-account keys in the project, the filter of the log exclusion, and the budget with its
thresholds. The summary is what the author checks; nobody has to click through a console.

### What the bootstrap creates

| Thing | Value |
|---|---|
| APIs | Cloud Run, Artifact Registry, IAM, IAM Credentials, Security Token Service, Cloud Resource Manager, Cloud Billing Budget |
| Image repository | Artifact Registry, format Docker, name `shadow-ai`, in the region |
| Cleanup rule | the 5 newest image versions are kept; every other version older than 1 day is deleted |
| Workload identity pool | `github`, with one OIDC provider `shadow-ai` for the issuer `https://token.actions.githubusercontent.com` |
| Provider condition | the token's `repository_id` is this repository's numeric ID **and** its `ref` is `refs/heads/main` |
| Deploy account | service account `shadow-ai-deploy`; the pool may act as it for this repository only |
| Rights of the deploy account | Artifact Registry Writer on the repository `shadow-ai`; Cloud Run Admin on the project; Service Account User on the runtime account — nothing else |
| Runtime account | service account `shadow-ai-run`, with no role at all; the service runs as it |
| Log exclusion | on the `_Default` sink: request logs and standard output of Cloud Run revisions are not stored |
| Budget | 5 units of the billing account's currency per month, scoped to the project, e-mail to the billing admins at 50 %, 90 % and 100 % |
| Repository variables | `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT` |

The numeric repository ID is read with `gh` at run time: a name can be registered again by
somebody else, an ID cannot. The condition on `ref` means that no pull request and no other
branch can log in, whatever its workflow file says. No key file is created and no GitHub secret
is set; the four variables are identifiers, and the repository is public.

Cloud Run Admin on the project is more than deploying needs on the second run: it is what
creates the service on the first run and makes it public. The project holds nothing but this
game, so the right reaches nothing else.

### The service

`tools/gcp-deploy.sh <local-image> <tag>` reads project and region from the environment
(`GCP_PROJECT_ID`, `GCP_REGION`), registers `gcloud` as Docker's credential helper for the
registry host, tags the image `<region>-docker.pkg.dev/<project>/shadow-ai/shadow-ai:<tag>`,
pushes it, deploys it, and prints the service URL as its last line. On the author's machine the
credential helper is one added line in `~/.docker/config.json`. The deployment sets, every
time:

| Setting | Value |
|---|---|
| Service | `shadow-ai`, in the region |
| Access | public, without login — the invoker check is switched off |
| Instances | 0 to 1 |
| CPU and memory | 1 vCPU, 128 MiB, first-generation execution environment |
| Concurrency | 250 requests per instance |
| Billing | request-based: CPU is paid only while a request is being answered |
| Port | 8080 |
| Identity | `shadow-ai-run` |

One instance answers 250 requests at once. The game makes requests only while it loads, so
that is far more than a preview needs; the limit of 1 is there for the bill, not for the load.
A request beyond it waits or is refused with status 429.

Nothing about the container changes: the `Dockerfile` and `nginx.conf` are untouched. If the
container does not start within 128 MiB, the implementation stops and asks; it does not raise
the number on its own.

### The pipeline

`ci.yml` keeps its one required check, `ci`. On a push to `main`, and only then, `ci` ends by
saving the image it built and tested as an artifact, kept for 1 day. The new job `deploy`:

- runs only when `ci` succeeded, the event is a push to `main`, and the variable
  `GCP_PROJECT_ID` is set — before the bootstrap, and in a fork, the job is skipped and `main`
  stays green
- has the permissions `contents: read` and `id-token: write`, and nothing else
- shares one concurrency group that never cancels a running deployment: merges go live in
  order, never side by side
- loads the image from the artifact — it does not build a second one —, logs in to Google Cloud
  through the provider as the deploy account, and runs `tools/gcp-deploy.sh` with the commit
  SHA as the tag
- runs the smoke test with `BASE_URL` set to the URL the script printed
- writes the URL and the commit SHA into the job summary

The two actions that log in and install `gcloud` are pinned to a full commit SHA with the
version as a comment: this is the one job that carries a cloud identity.

A red `ci` deploys nothing. A red live smoke test leaves the job red and the new revision live;
`ops.md` §5 names the one command that puts the previous revision back.

### The smoke test against the live URL

`tests/e2e/smoke.spec.ts` fetches headers with Node's `http` module today, which refuses an
`https://` address. Its `get` helper chooses `http` or `https` by the scheme of `BASE_URL`;
nothing else in the spec changes. Against the live URL it asserts what it asserts against the
container: the page, the drawn map, the movement, the four headers of `ops.md` §2 on `/` and on
a 404, the two `Cache-Control` values, and gzip on `/`. If Google's front end alters one of
these on the way out, the implementation stops and asks.

### Cost

Prices as read on 2026-11-17 from the provider's price list, in US dollars, for a region of
price tier 1 (`europe-west1` is one; Frankfurt, `europe-west3`, is tier 2).

| | Free each month | Then |
|---|---|---|
| CPU | 180,000 vCPU-seconds | 0.000024 per vCPU-second |
| Memory | 360,000 GiB-seconds | 0.0000025 per GiB-second |
| Requests | 2,000,000 | 0.40 per million |
| Image storage | 0.5 GiB | about 0.10 per GiB and month |
| Data sent to players | nothing in Europe | Premium Tier internet rate, see below |

The free amounts belong to the billing account, not to the project: other Cloud Run use on the
same account draws on them too.

- **Idle:** 0. With no request there is no instance.
- **Preview traffic:** a first visit loads less than 1 MiB — `public/` is 192 KiB today — and
  keeps an instance busy for about 2 seconds. 1,000 first visits a month are about 2,000
  vCPU-seconds, about 30,000 requests and less than 1 GiB sent: everything but the data is
  inside the free amounts.
- **Data sent** is the one line that is never free. The rate was about 0.12 per GiB in 2024 and
  could not be confirmed for 2026 from the price list; the implementation plan reads the
  current rate before the first deployment. At that rate 1,000 first visits cost less than
  0.12.
- **Ceiling for CPU and memory:** 1 instance answering requests during every second of a
  30-day month is 2,592,000 vCPU-seconds and 324,000 GiB-seconds — 57.89 for CPU after the free
  amount, and 0 for memory, which stays inside its free amount. That is what sustained abuse of
  the public URL can cost in computing; requests and data come on top and have no ceiling. The
  budget alert at 5 is how the author learns of it within about a day — billing data lags by
  hours — and not at the month's end.

### Acceptance in two parts

`CLAUDE.md` §3.4 opens no pull request before the walk has passed, and the job `deploy` cannot
run before the merge: only `main` may log in. Letting the feature branch log in for the walk
would open the keyless login wider than the finished feature allows, so it is not done.

The walk proves everything that exists before the merge: the bootstrap, and a deployment by
hand with the script the pipeline uses. The pipeline's first run is checked right after the
merge, by the author with the agent, in the steps the acceptance plan lists under "After the
merge"; the answers are recorded as a comment on the pull request. A red first run is a defect
and is fixed by a follow-up change. `testing.md` §5 says this in general terms, for any feature
whose last part only exists on `main`.

### Logs

Cloud Run would store one entry per request with the caller's IP address, and nginx's access
log on standard output would store it a second time, both for 30 days by default. The exclusion
keeps both from being stored at all. Standard error is kept: container start failures and nginx
errors. An nginx error line can name a client address; such lines are rare and stay for the
default 30 days. `ops.md` §2 says so in place of "nothing is logged beyond nginx's access log".

## Acceptance criteria

1. On a project that holds nothing but its billing link, `tools/gcp-bootstrap.sh <project-id>`
   ends with exit code 0 and every step line says `created`.
2. A second run right after ends with exit code 0, every step line says `exists`, and the
   summary is the same as after the first run.
3. The summary reports 0 user-managed service-account keys, and the repository has no secret
   that this feature created.
4. `tools/gcp-deploy.sh` on a project without the service creates it; on a project with the
   service it adds a revision. Both runs print an `https://` URL as their last line.
5. The service has the eight settings of the table "The service".
6. The URL answers a browser that is not logged in to anything with the game.
7. `BASE_URL=<url> npm run test:e2e` passes against the live URL, header checks included.
8. A pull request runs `ci` and skips `deploy`.
9. A push to `main` with a green `ci` runs `deploy`; the deployed image has the digest of the
   image `ci` saved, and its tag is the commit SHA.
10. A push to `main` with a red `ci` does not run `deploy`.
11. With `GCP_PROJECT_ID` unset, `deploy` is skipped and the workflow is green.
12. The provider's condition, read back in the summary, names this repository's numeric ID and
    `refs/heads/main`, and the pool has no other provider: a workflow run on any other ref
    cannot log in.
13. After 10 requests to the URL, the project's logs hold no request entry and no access-log
    line for the service.
14. The cleanup rule, read back in the summary, keeps the 5 newest versions and deletes every
    other version older than 1 day, and it is not in dry-run mode.
15. `shellcheck` passes on both scripts, in `ci`.
16. `npm run check` and the smoke test against the dev server and the local container pass as
    before.

## Test plan

- `tests/e2e/smoke.spec.ts` — the `get` helper follows the scheme of `BASE_URL`. No new
  assertion: the spec that proves the container proves the live service (criterion 7). It runs
  against the dev server and the local container in `ci` as before, and against the live URL in
  `deploy`.
- `ci` — a step runs `shellcheck tools/gcp-bootstrap.sh tools/gcp-deploy.sh` (criterion 15).
- No unit, architecture or asset test is added: this feature changes no game code. The dist
  scan of INV-5 keeps passing because no URL enters `dist/`; the scripts and the workflow are
  not part of the build.
- Not tested by a machine: the bootstrap against a real project (criteria 1 to 3, 12 and 14),
  the deployment by hand (4 to 6), the log exclusion (13). A test double for a cloud proves the
  double. These are steps of the walk. The keyless login and the handover of the tested image
  (9) are proved by the first run on `main`, and criterion 8 by the workflow run of the pull
  request. Criteria 10 and 11 are read in the job's condition, not provoked: nobody turns
  `main` red or deletes a variable to watch a job being skipped.
- No fixture is added.

## Acceptance plan (manual test)

The walk covers everything that exists before the merge, steps 1 to 20. The pipeline itself
only runs on `main`; its first run is checked after the merge, steps 21 to 24 ("Acceptance in
two parts").

**Preconditions:** a new Google Cloud project with a billing account linked and nothing else in
it; `gcloud` logged in as an owner of that project; `gh` logged in as an admin of the
repository; Docker running; a terminal in the repository root on the feature branch, brought up
to date with `main`; Chrome, and a second device on another network — a phone on mobile data.

1. Run `tools/gcp-bootstrap.sh <project-id>`.
2. Expected: exit code 0; every step line says `created`.
3. Read the five summary lines.
4. Expected: the condition names `refs/heads/main` and a numeric repository ID; the cleanup
   rule keeps 5 and deletes after 1 day; user-managed keys: 0; the exclusion names request
   logs and standard output; the budget is 5 with thresholds at 50 %, 90 % and 100 %.
5. Run the same command again.
6. Expected: exit code 0; every step line says `exists`; the summary is unchanged.
7. On GitHub, open Settings → Secrets and variables → Actions → Variables.
8. Expected: the four variables `GCP_PROJECT_ID`, `GCP_REGION`,
   `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_DEPLOY_SERVICE_ACCOUNT` are there, and the tab
   Secrets holds nothing this feature added.
9. Run `docker build -t shadow-ai .`, then
   `GCP_PROJECT_ID=<project-id> GCP_REGION=<region> tools/gcp-deploy.sh shadow-ai walk-1`.
10. Expected: the script ends with exit code 0 and its last line is an `https://` URL.
11. Open the URL in a private Chrome window.
12. Expected: the game runs as it does locally — the floor is drawn and the arrow keys move the
    figure.
13. Open the URL on the second device.
14. Expected: the floor is drawn; no login page and no error page appears.
15. Run `BASE_URL=<url> npm run test:e2e`.
16. Expected: every test passes.
17. In the Google Cloud console, open Cloud Run → `shadow-ai` → Revisions and select the
    revision.
18. Expected: 1 vCPU, 128 MiB, concurrency 250, minimum 0 and maximum 1 instance, service
    account `shadow-ai-run`.
19. Reload the URL ten times, wait one minute, then open Logging → Logs Explorer and search for
    the service `shadow-ai` over the last hour.
20. Expected: no entry carries a request path or an IP address.

**After the merge**, recorded as a comment on the pull request, not in the walk:

21. Open the workflow run of the merge commit on GitHub.
22. Expected: `ci` is green, `deploy` is green, and the job summary shows the URL of step 10
    and the merge commit's SHA.
23. Open the URL.
24. Expected: the game runs, and Cloud Run → `shadow-ai` → Revisions shows a second revision
    with all the traffic.

**Feel:**

- How long does the first load take on the second device after the service has been idle for
  15 minutes — in seconds, and does it feel like a wait?
- Does the address look like something you would send to a colleague, or does the custom
  domain have to come before M8?

**Result:** not yet walked.

## Open questions

None.
