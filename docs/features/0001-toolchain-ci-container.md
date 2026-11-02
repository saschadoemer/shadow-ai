# 0001 — Toolchain, CI and container

**Status:** implemented 2026-11-02
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

The repository builds, tests, lints and ships as a container, and every pull request from here
on has to be green. Nothing is drawn yet: this feature puts the four test layers, the container and
CI in place before the first game rule exists, so that no later feature can skip them.

## Scope

**In:**

- Vite project with TypeScript `strict`; `index.html` with the title "Shadow AI" and one empty
  `<canvas id="game">` on a page with background `#181425`; `src/main.ts` that finds the canvas
  and does nothing else
- `src/game/state.ts` with the `GameState` type, empty for now, and `createInitialState()`;
  `src/engine/` and `src/text/` are not created — each directory of `architecture.md` §1 appears
  with the first feature that puts a file in it (0002 for `engine/`, M4 for `text/`)
- Endesga 32 as data in `src/render/palette.ts`, with the reserved shadow colour `#68386c`
- Vitest for the unit, architecture and asset layers, one real test behind each of INV-1, INV-2,
  INV-5 and INV-6 (see test plan); Playwright with one smoke spec
- Biome for lint and format; npm scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `test`,
  `test:e2e`, `check` (typecheck, lint, build, test — in that order, because the dist scan
  reads the build output)
- `.nvmrc` with `26` and `engines.node` with `>=26 <27` — Node 26 is the current LTS since
  2026-10-28; `package-lock.json` committed
- `Dockerfile` (build stage `node:26-alpine`, serve stage the unprivileged nginx image) and
  `nginx.conf` as in `ops.md` §2; GitHub Actions workflow as in `ops.md` §4
- `README.md`: the status says the toolchain exists and a section says how to run the game
  locally, with the dev server and with the container
- branch protection on `main` that requires the workflow's check to pass before a merge — a
  GitHub setting the author enables after this feature is merged (acceptance plan, step 19)

**Out, explicitly:** any drawing on the canvas (0002) · game state beyond an empty object (0002)
· maps, tiles, sprites (0003, 0004) · deployment to Cloud Run (M8).

## Behaviour

- `npm run dev` serves the page at `http://localhost:5173`. `npm run build` writes `dist/`.
- The container serves `dist/` on port 8080 with the four headers of `ops.md` §2 on every
  response, 404 included. `index.html` is sent with `Cache-Control: no-cache`; everything under
  `/assets/` (Vite's hashed files) with `Cache-Control: public, max-age=31536000, immutable`.
  Text responses (HTML, CSS, JavaScript, JSON, SVG) are gzip-compressed when the client accepts
  it. A path that is not a file returns 404; there is no fallback to `index.html`.
- `npm run check` runs typecheck, Biome, the build, and then the unit, architecture and asset
  tests. `npm run test:e2e` starts the dev server and runs the smoke spec against it; with
  `BASE_URL` set (for example `http://localhost:8080`) it runs against that URL and starts
  nothing. CI uses this to run the spec against the built container.
- CI runs on every pull request and on `main`: install, typecheck, lint, build, tests, container
  build, smoke against the container. Any failure fails the workflow.
- The asset test reads every PNG under `public/` (none yet) with a PNG decoder. A pixel passes
  when its alpha is 0, or when its alpha is 255 and its colour is one of the 32 palette colours
  other than the reserved `#68386c`. Any other pixel fails, and the failure names file, x, y
  and the value. The feature that introduces the shadow assets names where the reserved colour
  is allowed. Every PNG under `public/tiles/` has a width and a height that are multiples of
  16. The test also runs against the fixture `tests/fixtures/off-palette.png` and asserts that
  it fails. The decoder is `pngjs` with its types, the one development dependency this adds
  beyond the tools.

## Acceptance criteria

1. `npm ci && npm run check` passes on a clean checkout.
2. `npm run dev` serves a page titled "Shadow AI" with background `#181425` and nothing else.
3. `docker build` succeeds; the container serves the same page on port 8080.
4. Every response from the container carries the four headers of `ops.md` §2 with the values
   given there.
5. A request for a path that does not exist returns 404.
6. `tests/arch/` fails when a file in `src/game/` imports from `src/render/` or mentions one of
   the names of INV-2 (`window`, `document`, `HTMLCanvasElement`, `Image`, `fetch`), proved
   by a test that feeds it such a file.
7. The asset test fails on `tests/fixtures/off-palette.png` and passes on `public/`.
8. The JSON round-trip test passes on the (empty) `GameState`.
9. The dist scan finds no `http://` and no `https://` in `dist/`, and fails with a message that
   says so when `dist/` is missing (proved by a test on an in-memory offending text).
10. The smoke spec passes against the dev server and against the container.
11. The GitHub Actions workflow is green on the pull request.
12. The container sends `index.html` with `Cache-Control: no-cache`, a file under `/assets/`
    with `Cache-Control: public, max-age=31536000, immutable`, and `/` with
    `Content-Encoding: gzip` when the request carries `Accept-Encoding: gzip`.

## Test plan

- `tests/unit/state.test.ts` — round trip of `GameState` (INV-1); trivial now, the place later
  features extend.
- `tests/arch/game-boundary.test.ts` — the forbidden-import and forbidden-name rule over
  `src/game/`, plus a negative test with an in-memory offending source (INV-2).
- `tests/unit/assets.test.ts` — palette and alpha over `public/`, 16-px alignment over
  `public/tiles/`, negative test with the fixture (INV-6).
- `tests/unit/dist.test.ts` — every text file under `dist/` is free of `http://` and `https://`;
  a negative test on an in-memory string proves the scan fires (INV-5).
- `tests/e2e/smoke.spec.ts` — the page loads, the canvas exists. With `BASE_URL` set (the
  container) it also asserts the four headers of `ops.md` §2 on `/` and on a 404, the two
  `Cache-Control` values and gzip on `/` (INV-5, criteria 4, 5 and 12).
- Fixture: `tests/fixtures/off-palette.png`, 2x2 opaque pixels, three in `#181425` and one in
  `#123456`.

## Acceptance plan (manual test)

**Preconditions:** the pinned Node LTS and Docker installed; Chrome; a terminal in the repository
root on the feature branch, brought up to date with `main` (`CLAUDE.md` §4).

1. Run `npm ci`.
2. Expected: finishes without errors.
3. Run `npm run check`.
4. Expected: typecheck, lint, build and all tests pass; the output names the four test files
   `state`, `game-boundary`, `assets` and `dist`.
5. Run `npm run dev` and open `http://localhost:5173`.
6. Expected: the tab is titled "Shadow AI"; the page is dark (`#181425`) and shows nothing
   else.
7. Stop the dev server. Run `docker build -t shadow-ai .`.
8. Expected: the build finishes without errors.
9. Run `docker run --rm -p 8080:8080 shadow-ai` and open `http://localhost:8080`.
10. Expected: the same page as in step 6.
11. Run `curl -sI http://localhost:8080/`.
12. Expected: the response contains the four headers of `ops.md` §2 with these values:
    `Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'
    'unsafe-inline'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
    `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
13. Run `curl -sI -H 'Accept-Encoding: gzip' http://localhost:8080/`.
14. Expected: the response contains `Cache-Control: no-cache` and `Content-Encoding: gzip`.
15. Run `curl -sI http://localhost:8080/does-not-exist`.
16. Expected: status 404 and the same four headers as in step 12.
17. Open the pull request on GitHub.
18. Expected: the CI check is green and GitHub reports no conflicts with `main`.
19. After the merge: on GitHub, under Settings → Branches, add a rule for `main` that requires
    the status check of the workflow to pass before merging.
20. Expected: a pull request whose check is red or still running cannot be merged.

**Feel:** none — this feature has nothing to feel.

**Result:** pass or fail per step.

## Open questions

None.
