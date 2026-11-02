# 0001 — Implementation plan: toolchain, CI and container

**Spec:** [`docs/features/0001-toolchain-ci-container.md`](../features/0001-toolchain-ci-container.md)
(approved 2026-11-02). The plan argues from the spec; where they differ, the spec wins.
**Written:** 2026-11-02. A working document, not specification: once the feature is
implemented, what is durable lives in `docs/spec/`.

**Goal:** a repository that installs, typechecks, lints, builds, tests in four layers, ships as
an nginx container and is checked by GitHub Actions on every pull request — with nothing drawn.

**Approach:** Vite project in strict TypeScript; Vitest for unit, architecture and asset tests;
Playwright for one smoke spec that also checks the container's headers when `BASE_URL` is set;
a two-stage Dockerfile; one workflow. Every guard gets a negative test that proves it fires
(`testing.md` §3). Work is test-first and lands in small commits on
`feature/0001-toolchain-ci-container`.

## Global constraints

- Node `26` in `.nvmrc`, `engines.node` `>=26 <27`, build image `node:26-alpine`.
- TypeScript `strict`, no `any`, no `@ts-ignore`; Biome as the one lint and format config.
- Runtime dependencies: none. Development dependencies: Vite, Vitest, Biome, Playwright,
  TypeScript, `@types/node`, and `pngjs` with `@types/pngjs` — the one extra, named in the PR.
- No literal text a player can read in `src/` (INV-4); error messages for developers are fine.
- `src/game/` imports nothing from `src/render/` and names no DOM API (INV-2).
- Versions current at writing: Vite 8.3, Vitest 5.0, Biome 2.6, Playwright 1.64, pngjs 7.0.
  TypeScript 7.0 is `latest` on npm (the native compiler); if `tsc --noEmit` rejects the config
  or Vite's types, pin the newest 6.x and say so in the PR.

## File map

| File | Responsibility |
|---|---|
| `package.json`, `package-lock.json`, `.nvmrc` | scripts `dev build preview typecheck lint test test:e2e check`, pins |
| `tsconfig.json` | strict compiler settings for `src/`, `tests/`, `tools/` and the config files |
| `vite.config.ts` | dev server on 5173 (`strictPort`), build target ES2022, Vitest `test` block with `include` for `tests/unit/**` and `tests/arch/**` |
| `biome.json` | formatter (2 spaces, width 100, single quotes) and recommended lint rules |
| `playwright.config.ts` | `baseURL` from `BASE_URL` or `http://localhost:5173`; `webServer` runs `npm run dev` only when `BASE_URL` is unset; Chromium only |
| `index.html`, `src/style.css` | title "Shadow AI", `<canvas id="game">`, body background `#181425`; CSS linked, not inline |
| `src/main.ts` | `findCanvas(): HTMLCanvasElement` — throws if `#game` is missing; nothing else |
| `src/game/state.ts` | `type GameState = Record<string, never>`, `createInitialState(): GameState` |
| `src/render/palette.ts` | `ENDESGA_32` (32 lowercase hex strings, `as const`), `PaletteColour`, `SHADOW_COLOUR = '#68386c'`, `PAGE_BACKGROUND = '#181425'` |
| `tests/unit/state.test.ts` | INV-1 round trip |
| `tests/arch/game-boundary.ts`, `tests/arch/game-boundary.test.ts` | `checkGameSource(file, source): string[]` and the tests over `src/game/` plus the negative case |
| `tests/unit/png-check.ts`, `tests/unit/assets.test.ts` | `checkPng(buffer, rules): string[]` and the tests over `public/`, `public/tiles/` and the fixture |
| `tests/fixtures/off-palette.png` | 2x2 opaque, three `#181425`, one `#123456` at (1, 1) |
| `tests/unit/dist-scan.ts`, `tests/unit/dist.test.ts` | `findUrls(text): string[]`, the scan over `dist/`, the negative case, the missing-`dist/` message |
| `tests/e2e/smoke.spec.ts` | title, canvas, background; with `BASE_URL`: headers on `/`, an asset and a 404; gzip |
| `Dockerfile`, `.dockerignore`, `nginx.conf` | build stage and `nginxinc/nginx-unprivileged:stable-alpine`; headers via a `map` for `Cache-Control` |
| `.github/workflows/ci.yml` | job `ci`: install, typecheck, lint, build, test, Playwright against dev server, container build, Playwright against the container |
| `README.md`, `docs/spec/{visual,ops,testing}.md`, `CLAUDE.md` §7 | status and how to run; `#68386c` fixed; CI order, `BASE_URL`, branch protection; alpha rule; `docs/plans/` in the file map |

## Tasks

Each task ends with its checks green and one commit. Commands run from the repository root.

### Task 1 — Project skeleton and `check`

1. `npm init -y`; set `private`, `type: module`, `engines`, scripts. Install dev dependencies.
2. `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
   `noImplicitOverride`, `verbatimModuleSyntax`, `isolatedModules`, `target`/`lib` ES2022 + DOM,
   `module` ESNext, `moduleResolution` bundler, `types` `vite/client` and `node`, `noEmit`.
3. `biome.json` from `npx @biomejs/biome init`, then the settings above and `dist`,
   `playwright-report`, `test-results` excluded.
4. `index.html`, `src/style.css`, `src/main.ts`. `npm run dev` shows the dark page.
5. `vite.config.ts` with the Vitest block. `npm run check` passes with zero test files
   (Vitest `passWithNoTests` is **not** set: the first test arrives in Task 2 before this
   commit, so the ordering is: write `state.test.ts` first, see it fail, then finish this task).
6. Commit: "Set up Vite, TypeScript, Vitest and Biome".

### Task 2 — INV-1: state round trip (test first)

1. `tests/unit/state.test.ts`: `JSON.parse(JSON.stringify(createInitialState()))` deep-equals the
   original and is a plain object. Run: fails (module missing).
2. `src/game/state.ts`. Run: passes. Commit: "Add the empty GameState with its round-trip test".

### Task 3 — INV-2: the game boundary (test first)

1. `tests/arch/game-boundary.test.ts`: (a) every `.ts` under `src/game/` yields no findings;
   (b) the in-memory source `import { x } from '../render/palette';\nwindow.alert(1);` yields two
   findings, one naming the import and one naming `window`. Run: fails.
2. `tests/arch/game-boundary.ts`: `checkGameSource(file, source)` — import specifiers from
   `import … from '…'`, `import '…'`, `export … from '…'` and `import('…')` whose path has a
   `render` segment; the words `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` on word
   boundaries, over the whole text including comments. Run: passes.
3. Commit: "Enforce the game boundary (INV-2) in tests/arch".

### Task 4 — INV-6: palette, alpha and alignment (test first)

1. Write the fixture once with pngjs (a throwaway node one-liner, not committed as a tool) and
   commit the PNG.
2. `tests/unit/assets.test.ts`: (a) all PNGs under `public/` pass (none yet: the list is empty and
   the assertion is on an empty findings array); (b) every PNG under `public/tiles/` has width and
   height divisible by 16; (c) the fixture yields exactly one finding that names the file, `1, 1`
   and `#123456`. Run: fails.
3. `tests/unit/png-check.ts`: `checkPng(buffer, { palette, reserved, multipleOf16 })` decodes with
   `PNG.sync.read`, walks RGBA, applies the rule of the spec (alpha 0 passes; alpha 255 passes
   when the hex is in the palette and is not the reserved colour; anything else is a finding with
   file, x, y, value), and checks the dimensions when asked. Run: passes.
4. Commit: "Check every PNG under public/ against Endesga 32 (INV-6)".

### Task 5 — INV-5: the dist scan (test first)

1. `tests/unit/dist.test.ts`: (a) `findUrls('fetch("https://evil.example")')` returns one hit;
   (b) `dist/` exists, else the test fails with "dist/ is missing — run `npm run build` first";
   (c) every `.html .js .css .json .svg .txt .webmanifest` under `dist/` has no hit. Run `npm test`
   without a build: (b) fails with that message. Run `npm run check`: passes.
2. `tests/unit/dist-scan.ts`: `findUrls(text)` matches `https?://` and returns the matches with
   their line numbers.
3. Commit: "Scan the build output for foreign URLs (INV-5)".

### Task 6 — The smoke spec

1. `playwright.config.ts` and `tests/e2e/smoke.spec.ts`: title `Shadow AI`, exactly one
   `canvas#game`, computed body background `rgb(24, 20, 37)`. The header tests live in a
   `describe` that is skipped unless `BASE_URL` is set: four headers on `/` with the exact values
   of `ops.md` §2, the same four on `/does-not-exist` with status 404, `Cache-Control: no-cache` on
   `/`, `Cache-Control: public, max-age=31536000, immutable` on the first `/assets/*.js` linked
   from `index.html`, `Content-Encoding: gzip` on `/` when requesting with `Accept-Encoding: gzip`
   (use Node's `http.get` for this one if Playwright's request client hides the header).
2. `npx playwright install chromium`; `npm run test:e2e` passes against the dev server.
3. Commit: "Add the Playwright smoke spec".

### Task 7 — Container

1. `nginx.conf`: `map $uri $cache_control { ~^/assets/ "public, max-age=31536000, immutable";
   default "no-cache"; }`; server on 8080, root `/usr/share/nginx/html`, `index index.html`,
   `gzip on` with `gzip_types` for CSS, JS, JSON, SVG and plain text (HTML is always included),
   `gzip_vary on`; the four security headers and `Cache-Control $cache_control`, all `always`, at
   server level so every location and every 404 inherits them; `location / { try_files $uri =404; }`
   and no fallback.
2. `Dockerfile` (two stages), `.dockerignore`.
3. `docker build -t shadow-ai .`; run it; `BASE_URL=http://localhost:8080 npm run test:e2e`
   passes, including the header tests. Commit: "Serve dist/ from an unprivileged nginx container".

### Task 8 — CI

1. `.github/workflows/ci.yml`, job `ci`, on `pull_request` and `push` to `main`:
   `actions/checkout@v7`, `actions/setup-node@v7` with `node-version-file: .nvmrc` and npm cache,
   then `npm ci`, `typecheck`, `lint`, `build`, `test`, `npx playwright install --with-deps
   chromium`, `test:e2e`, `docker build`, `docker run -d -p 8080:8080`, a curl wait loop of at
   most 30 s, `BASE_URL=http://localhost:8080 npm run test:e2e`, `docker stop` with `if: always()`.
2. Commit: "Run the whole check on every pull request".

### Task 9 — Documentation

1. `README.md`: status paragraph, "Run it" section (dev server, container).
2. `docs/spec/visual.md` §4: the signature colour is `#68386c`. `docs/spec/ops.md` §4: build
   before tests, `BASE_URL`, `main` protected by the required check `ci`. `docs/spec/testing.md`
   §1 and §2: the alpha rule and the 16-px rule for `public/tiles/`. `CLAUDE.md` §7: a row for
   `docs/plans/`.
3. Commit: "Record what 0001 fixed in the spec".

### Task 10 — Merge main, push, pull request, acceptance

1. Merge `origin/main` into the branch (`CLAUDE.md` §4), rerun `npm run check` and both
   `test:e2e` runs. Push. Open the pull request against `main` with the dependency note for
   `pngjs` and the acceptance plan's results.
2. Run the acceptance plan of the spec, steps 1–18, and report every step. Steps 19 and 20 are the
   author's, after the merge.
