# Operations — Shadow AI

How the game is built, packaged and run. There is no backend: the deliverable is a container
that serves static files. That is the whole operational surface, and it is kept that way.

## 1. Build

`npm run build` produces `dist/`: one HTML file, the bundled script, the maps, the tilesets and
later the fonts and audio. Everything the game needs is in that directory, and nothing in it
references another host (INV-5). `npm run dev` starts the Vite dev server for local work.

## 2. The container

One multi-stage `Dockerfile` at the repository root:

1. **Build stage** — the pinned Node image, `npm ci`, `npm run build`.
2. **Serve stage** — the unprivileged nginx image, `dist/` copied to its web root, listening on
   port 8080.

The nginx configuration (`nginx.conf`) lives in the repository and does four things: serves
`dist/`, with `Cache-Control: public, max-age=31536000, immutable` for the hashed files under
`/assets/` and `Cache-Control: no-cache` for everything else, `index.html` included; compresses
text responses with gzip; sends the security headers below on every response, 404s included;
returns 404 for anything that is not a file, directories included. There is no rewrite to
`index.html` — the game is one page, not a routed application.

**Headers, on every response:**

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

The CSP is the structural half of INV-5: the browser refuses any request to another origin
before the game could make one. `style-src 'unsafe-inline'` exists only for Vite's injected
styles and is removed if the build stops needing it. No cookies are set. nginx writes its access
log to standard output: locally that is the terminal, and on Cloud Run it is not stored (§5).

## 3. Running locally

```
docker build -t shadow-ai .
docker run --rm -p 8080:8080 shadow-ai
```

The game is then at `http://localhost:8080`. This is how the game runs on the author's machine.
Every merge to `main` also goes to Cloud Run (§5). The smoke test runs against the built container as well as the dev server —
`BASE_URL=http://localhost:8080 npm run test:e2e` — so the headers and the static serving are
tested, not assumed.

## 4. Continuous integration

GitHub Actions, one workflow with two jobs: `ci` on every pull request and on `main`, and
`deploy` after it on `main` only (§5). The steps of `ci`:

1. install with `npm ci`
2. typecheck
3. Biome check
4. `shellcheck` over the shell scripts under `tools/`
5. build
6. unit, architecture and asset tests — after the build, because the dist scan reads it
7. the Playwright smoke test against the dev server
8. build the container, start it, and run the smoke test again with `BASE_URL` pointing at it
9. on `main` only: save the image that was just tested as an artifact for `deploy`, kept for 1
   day

Red blocks the merge: `main` is protected so that the check `ci` must pass before a pull request
can be merged — a GitHub setting the author keeps. `deploy` is not a required check: it does not
run on a pull request. There is no separate "fast" path; the whole run is short enough to wait
for.

Before step 7 the job installs the Playwright browser alone, `npx playwright install chromium`,
not `--with-deps`: the system packages that flag installs are font packages fetched from the
Ubuntu mirrors, which the runner could not resolve on 2026-11-11 and which the game, drawing no
browser text, does not need; every library Chromium itself needs is on the runner image. If a
future image lacks one, the smoke test fails with a clear "shared library" error, and that
library is added to the job by name.

## 5. Deployment

**What runs where.** One Cloud Run service, `shadow-ai`, in a Google Cloud project of the
author's own, region `europe-west1` unless the bootstrap was given another. It is public, without
login, and serves the newest `main`. Until M8 its address is a preview of an unfinished game. The
author announces it all the same, from 2026-11-19: the README names it and says that it is a
preview, and the graphic in `docs/promo/` carries it as text and as a QR code, for talks.
Whether an announced site needs an imprint or a privacy notice (feature 0030) stays a question
the author has checked by a qualified person; this spec does not decide law.

**What the author does once.** Creates the project and links it to a billing account, by hand —
no script holds the right to do either. Then, logged in to `gcloud` as an owner of the project
and to `gh` as an admin of the repository, runs:

```
tools/gcp-bootstrap.sh <project-id> [region]
```

It reads the repository from the `origin` remote and creates:

| Thing | Value |
|---|---|
| APIs | Cloud Run, Artifact Registry, IAM, IAM Credentials, Security Token Service, Cloud Resource Manager, Cloud Billing, Cloud Billing Budget |
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

The script is safe to run again: every step first looks for what it would create and leaves it
alone when it is there. It prints one line per step, `created` or `exists`, and ends with a
summary of five lines read back from the project, not from its own variables: the provider's
condition, the cleanup rule, the number of user-managed service-account keys, the filter of the
log exclusion, and the budget with its thresholds. A step that fails stops the script with its
name; the run is repeated after the cause is fixed. A project, an API or a billing link that is minutes old
is not visible to every service at once, so every call is tried again for about two minutes
before it counts as failed; an error is never read as "not there".

Cloud Run Admin on the project is more than a second deployment needs: it is what creates the
service on the first run and makes it public. The project holds nothing but this game, so the
right reaches nothing else.

**Why there is no secret.** GitHub logs in to Google Cloud through Workload Identity Federation:
GitHub signs a short-lived token for the workflow run, and the provider accepts it only when the
token's numeric repository ID is this repository's and its ref is `refs/heads/main`. The ID, not
the name: a name can be registered again by somebody else, an ID cannot. No pull request and no
other branch can log in, whatever its workflow file says. No key file exists and no GitHub secret
is set; the four repository variables are identifiers, and the repository is public.

**The service.** `tools/gcp-deploy.sh <local-image> <tag>` reads `GCP_PROJECT_ID` and
`GCP_REGION` from the environment, pushes the image as
`<region>-docker.pkg.dev/<project>/shadow-ai/shadow-ai:<tag>`, deploys it, sends all traffic to
the new revision, and prints the service URL as its only line on standard output. On the
author's machine it adds one line to `~/.docker/config.json`: `gcloud` as Docker's credential
helper for the registry host. Cloud Run runs only `linux/amd64` images; a Mac with an Apple chip
builds `arm64` by default, so an image for a deployment by hand is built with
`docker build --platform linux/amd64 -t shadow-ai .`, and the script refuses any other platform
before it pushes. It sets, on every deployment:

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

A setting changed by hand in the console does not survive the next deployment. One instance
answers 250 requests at once; the game makes requests only while it loads, so the limit of 1 is
there for the bill, not for the load. A request beyond it waits or is refused with status 429.

**The job `deploy`.** It runs after `ci` and only when `ci` succeeded, the event is a push to
`main`, and the variable `GCP_PROJECT_ID` is set — before the bootstrap, and in a fork, it is
skipped and `main` stays green. Its permissions are `contents: read` and `id-token: write`,
nothing else. All runs share one concurrency group that never cancels a running deployment:
merges go live in order, never side by side. A newer merge that waits replaces an older one that
waits; the older run then shows as cancelled, which is not a failure.

The job loads the image `ci` saved — it does not build a second one, and both jobs print the
image ID —, logs in through the provider as the deploy account, runs `tools/gcp-deploy.sh` with
the commit SHA as the tag, runs the smoke test with `BASE_URL` set to the URL the script printed,
and writes the URL and the commit SHA into the job summary. The two actions that log in and
install `gcloud` are pinned to a full commit SHA: this is the one job that carries a cloud
identity. A red live smoke test leaves the job red and the new revision live.

**Logs.** Cloud Run would store one entry per request with the caller's IP address, and nginx's
access log on standard output would store it a second time, both for 30 days by default. The
exclusion keeps both from being stored at all. Standard error is kept for the default 30 days:
container start failures and nginx errors. An nginx error line can name a client address; such
lines are rare.

**Cost.** Prices in US dollars for a region of price tier 1 (`europe-west1` is one), read on
2026-11-17 from the provider's price list:

| | Free each month | Then |
|---|---|---|
| CPU | 180,000 vCPU-seconds | 0.000024 per vCPU-second |
| Memory | 360,000 GiB-seconds | 0.0000025 per GiB-second |
| Requests | 2,000,000 | 0.40 per million |
| Image storage | 0.5 GiB | about 0.10 per GiB and month |
| Data sent to players | nothing in Europe | 0.12 per GiB |

The rate for data sent is the Premium Tier internet rate from `europe-west1` to Europe for the
first 1,024 GiB of a month, read on 2026-11-18. The free amounts belong to the billing account,
not to the project: other Cloud Run use on the same account draws on them too.

- **Idle:** 0. With no request there is no instance.
- **Preview traffic:** a first visit loads less than 1 MiB and keeps an instance busy for about
  2 seconds. 1,000 first visits a month are about 2,000 vCPU-seconds, about 30,000 requests and
  less than 1 GiB sent: everything but the data is inside the free amounts, and the data costs
  less than 0.12.
- **Ceiling for CPU and memory:** 1 instance answering requests during every second of a 30-day
  month is 2,592,000 vCPU-seconds and 324,000 GiB-seconds — 57.89 for CPU after the free amount,
  and 0 for memory. Requests and data come on top and have no ceiling.
- **The guard:** the budget alert at 5 tells the author within about a day — billing data lags
  by hours. It warns and stops nothing; Google Cloud has no hard spending stop to switch on. The
  instance limit is the other half of the guard.

**Putting the previous revision back.** When a deployment is broken:

```
gcloud run revisions list --service=shadow-ai --region=<region>
gcloud run services update-traffic shadow-ai --region=<region> --to-revisions=<revision>=100
```

The next deployment sends all traffic to the newest revision again.

**The address.** The service answers at `https://shadow-ai-<project-number>.<region>.run.app`.
The address is made of three values: the service name, the project's number and the region. A
deployment adds a revision behind it and never changes it. It changes only when the service is
renamed, or the project or the region is replaced — so none of the three is changed, and the
project and the service are not created anew.

**The redirect.** `shadow-ai.sascha-doemer.de` is a redirect at the author's web host to the
address above, kept by hand outside this repository. It needs a TLS certificate for the
subdomain at the host, or `https://` fails before the redirect is sent. The redirect is
permanent (301), and a browser remembers a 301: if the address ever did change, earlier
visitors would still be sent to the old one. The container knows nothing of the redirect:
nginx checks no host name, and the CSP's `'self'` is whatever origin the game was loaded from.

**A custom domain** mapped to the service itself, so that the game's own address stays in the
address bar, comes with M8, with the title and the distribution.

## 6. Configuration

There is no runtime configuration. Everything the game needs is decided at build time and lives
in the repository. If a feature ever needs a build-time switch, it is a Vite environment variable
with its default committed, and this section grows a table.
