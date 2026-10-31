# 0001 — Toolchain, CI and container

**Status:** draft
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

The repository builds, tests, lints and ships as a container, and every pull request from here
on has to be green. Nothing is drawn yet: this feature puts the four test layers, the container and
CI in place before the first game rule exists, so that no later feature can skip them.

## Scope

**In:**

- Vite project with TypeScript `strict`; `index.html` with the title "Shadow AI" and one empty
  `<canvas id="game">` on a dark page; `src/main.ts` that finds the canvas and does nothing else
- the directory structure of `architecture.md` §1, with `src/engine/`, `src/game/`, `src/render/`
  and `src/text/` present as empty modules
- Endesga 32 as data in `src/render/palette.ts`, with the reserved shadow colour `#68386c`
- Vitest with the four test layers, each with one real test (see test plan); Playwright with one
  smoke spec
- Biome for lint and format; npm scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `test`,
  `test:e2e`, `check` (typecheck, lint, test)
- `.nvmrc` and `engines` pinned to the current Node LTS at the time of implementation;
  `package-lock.json` committed
- `Dockerfile` and `nginx.conf` as in `ops.md` §2; GitHub Actions workflow as in `ops.md` §4

**Out, explicitly:** any drawing on the canvas (0002) · game state beyond an empty object (0002)
· maps, tiles, sprites (0003, 0004) · deployment to Cloud Run (M8).

## Behaviour

- `npm run dev` serves the page at `http://localhost:5173`. `npm run build` writes `dist/`.
- The container serves `dist/` on port 8080 with the headers of `ops.md` §2 on every response,
  no caching for `index.html`, long-lived caching for hashed assets, and 404 for any path that is
  not a file.
- `npm run check` runs typecheck, Biome and the unit, architecture and asset tests. `npm run
  test:e2e` runs the smoke spec against the dev server; in CI it also runs against the built
  container.
- CI runs on every pull request and on `main`: install, typecheck, lint, tests, build, container
  build, smoke against the container. Any failure fails the workflow.
- The asset test reads every PNG under `public/` (none yet) with a PNG decoder and checks each
  pixel against the palette and the reserved colour; it also runs against the fixture
  `tests/fixtures/off-palette.png` and asserts that it fails. A PNG decoder for Node is the one
  development dependency this adds beyond the tools.

## Acceptance criteria

1. `npm ci && npm run check` passes on a clean checkout.
2. `npm run dev` serves a page titled "Shadow AI" with a dark background and nothing else.
3. `docker build` succeeds; the container serves the same page on port 8080.
4. Every response from the container carries the four headers of `ops.md` §2 with the values
   given there.
5. A request for a path that does not exist returns 404.
6. `tests/arch/` fails when a file in `src/game/` imports from `src/render/` or mentions `window`
   (proved by a test that feeds it such a file).
7. The asset test fails on `tests/fixtures/off-palette.png` and passes on `public/`.
8. The JSON round-trip test passes on the (empty) `GameState`.
9. The smoke spec passes against the dev server and against the container.
10. The GitHub Actions workflow is green on the pull request.

## Test plan

- `tests/unit/state.test.ts` — round trip of `GameState` (INV-1); trivial now, the place later
  features extend.
- `tests/arch/game-boundary.test.ts` — the forbidden-import and forbidden-name rule over
  `src/game/`, plus a negative test with an in-memory offending source (INV-2).
- `tests/unit/assets.test.ts` — palette and 16-px alignment over `public/`, negative test with
  the fixture (INV-6).
- `tests/e2e/smoke.spec.ts` — the page loads, the canvas exists, the CSP header is present when
  run against the container (INV-5).
- Fixture: `tests/fixtures/off-palette.png`, 2x2 pixels, one of them `#123456`.

## Acceptance plan (manual test)

**Preconditions:** the pinned Node LTS and Docker installed; Chrome; a terminal in the repository
root on the feature branch.

1. Run `npm ci`.
2. Expected: finishes without errors.
3. Run `npm run check`.
4. Expected: typecheck, lint and all tests pass; the output names the four test files.
5. Run `npm run dev` and open `http://localhost:5173`.
6. Expected: the tab is titled "Shadow AI"; the page is dark and shows nothing else.
7. Stop the dev server. Run `docker build -t shadow-ai .`.
8. Expected: the build finishes without errors.
9. Run `docker run --rm -p 8080:8080 shadow-ai` and open `http://localhost:8080`.
10. Expected: the same page as in step 6.
11. Run `curl -sI http://localhost:8080/`.
12. Expected: the response contains `Content-Security-Policy: default-src 'self'`,
    `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.
13. Open `http://localhost:8080/does-not-exist`.
14. Expected: a 404 page from nginx.
15. Open the pull request on GitHub.
16. Expected: the CI check is green.

**Feel:** none — this feature has nothing to feel.

**Result:** pass or fail per step.

## Open questions

None.
