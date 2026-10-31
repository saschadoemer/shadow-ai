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

The nginx configuration lives in the repository and does four things: serves `dist/` with
long-lived cache headers for hashed assets and no caching for `index.html`; compresses text
responses; sends the security headers below; returns 404 for anything that is not a file. There
is no rewrite to `index.html` — the game is one page, not a routed application.

**Headers, on every response:**

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

The CSP is the structural half of INV-5: the browser refuses any request to another origin
before the game could make one. `style-src 'unsafe-inline'` exists only for Vite's injected
styles and is removed if the build stops needing it. No cookies are set; nothing is logged beyond
nginx's access log.

## 3. Running locally

```
docker build -t shadow-ai .
docker run --rm -p 8080:8080 shadow-ai
```

The game is then at `http://localhost:8080`. This is how the game runs until the end of the
project (plan M8). The smoke test runs against the built container as well as the dev server, so
the headers and the static serving are tested, not assumed.

## 4. Continuous integration

GitHub Actions, on every pull request and on `main`, one workflow:

1. install with `npm ci`
2. typecheck
3. Biome check
4. unit, architecture and asset tests
5. build
6. build the container and run the Playwright smoke test against it

Red blocks the merge. There is no separate "fast" path; the whole run is short enough to wait for.

## 5. Deployment target

**Cloud Run**, when the time comes: a stateless HTTP container, scale to zero, HTTPS included,
a custom domain later. The pipeline is a feature in M8 and consists of: a GCP project, an
Artifact Registry repository, a Cloud Run service, and a GitHub Actions job on `main` that builds
the image, pushes it and deploys it. Authentication from GitHub to GCP uses **Workload Identity
Federation** — no service-account key file exists anywhere, so a game without a backend also has
no secret.

Nothing about the container changes for Cloud Run; it already listens on 8080 and holds no
state. Until M8 this section describes an intention, not an installation.

## 6. Configuration

There is no runtime configuration. Everything the game needs is decided at build time and lives
in the repository. If a feature ever needs a build-time switch, it is a Vite environment variable
with its default committed, and this section grows a table.
