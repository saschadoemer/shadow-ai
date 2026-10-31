# Testing — Shadow AI

What is tested, how, and what is deliberately left to a human. The strategy rests on ADR-0001:
because game logic is plain data and pure functions, almost everything that can go wrong in a
rule can be proved without a browser.

## 1. Four layers

| Layer | Runs with | Covers |
|---|---|---|
| **Unit** | Vitest, Node | engine math (movement, collision, camera), game rules, the map loader against Tiled JSON fixtures, the loop with a fake clock, the language table |
| **Architecture** | Vitest, Node | the import graph and source text of `src/game/` (INV-2); the branded text type is enforced by the compiler (INV-4) |
| **Assets** | Vitest, Node | every PNG under `public/` against Endesga 32 and the reserved colour; tileset dimensions; `.tsj` files against their PNG (INV-6) |
| **Smoke** | Playwright, one spec | the page loads, the canvas exists, one second of "right" moves the player, the CSP header is present — against the dev server and against the built container |

All four run in CI on every pull request (`ops.md` §4). Red blocks the merge.

## 2. The test behind each invariant

| Invariant | Test |
|---|---|
| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` |
| INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/` |
| INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder |
| INV-4 text through keys | the compiler, via `TextKey`; a unit test that `de` and `en` have identical key sets |
| INV-5 own origin only | a test over `dist/` for `http://` and `https://`; the smoke test reads the CSP header |
| INV-6 palette | the asset tests |
| INV-7 map truth | loader tests reject unknown layers, a missing spawn and a non-16 tile size; a world-data test orders regions by density against the upgrades that precede them |

## 3. Test first

For logic, the test is written before the code: the failing test, the smallest change that
passes it, then the cleanup. This is not ceremony. Collision sliding, camera clamping and
diagonal normalization are exactly the places where "it looks right" hides an off-by-one that a
player feels as a snag at a wall. A test with the numbers in it catches that; a glance does not.

Every guard that exists to make something impossible — a loader rejection, an architecture rule,
a palette check — gets a test that proves it fires: feed it the bad input and assert the failure.
A guard without such a test is a comment.

## 4. Not tested, on purpose

- **Pixel-exact screenshots.** Brittle across platforms and expensive to maintain. The smoke test
  checks that the game runs and reacts; what it looks like is a human's job.
- **Animation timing by image comparison.** Frame indices are unit-tested as numbers; whether the
  walk looks right is judged by eye.
- **Performance by benchmark in CI.** Frame budget is checked by a person on an ordinary laptop
  during acceptance. A number in CI would measure the runner, not the game.
- **Tiled itself.** The loader is tested against committed fixtures, not against the editor.

## 5. Human acceptance

The last test of every feature is the author playing it (`CLAUDE.md` §3). Each feature spec
carries a short **feel checklist** — the handful of things only a player notices: does the figure
snag at corners, does the camera shimmer, does the walk speed feel right. The agent runs through
it in a browser before asking for acceptance and reports what it saw. The author's merge is the
sign-off.

## 6. Test data

Fixtures live beside the tests under `tests/fixtures/`: small Tiled maps built for a purpose (a
corridor with one solid tile, a map with an unknown layer), a tiny PNG with one off-palette
pixel. Fixtures are hand-made and committed; they are never generated from the real content, so a
change to the campus map cannot silently change what a test proves.
