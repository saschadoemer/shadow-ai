# Testing — Shadow AI

What is tested, how, and what is deliberately left to a human. The strategy rests on ADR-0001:
because game logic is plain data and pure functions, almost everything that can go wrong in a
rule can be proved without a browser.

## 1. Four layers

| Layer | Runs with | Covers |
|---|---|---|
| **Unit** | Vitest, Node | engine math (movement, collision, camera), among it the box resolver against a picture grid and the loaded corridor fixture and against boxes thinner than a cell — strips, a post, a doorway between two strips — a sight line against the solid boxes, a 2 px strip, a 3 px push against it, a chair's box and a screen's panel (0011), and the camera: centring, the four clamps, the corners, rounding, the view constants; game rules (the player's movement, facing, clamp and walk cycle, and the player's box against solid tiles: flush stops, the slide, corners and a one-tile gap, and a wall strip that holds a push; and the camera in the state: the spawn's camera, following the walk, the clamp on the small map; the lamp's cone: the apex, the half-open length, the slope, what lies behind and beside the apex, per facing; the figure holding the lamp: standing, turning, the reset of the walk cycle, the resumed walk; the lamp in the state; the creature's step: rest, approach, the stop at 8 px, sliding and the clamp, the light, the count to 60, the break, a wall and a 4 px strip in the light, the light across a low box that still stops the walk and behind an opaque one; the creatures and the captured count in the state; the hit: reach, the frozen creature, array order, grace, the push and its direction, the last point; the dark: the sequence step by step, the wake point and its fallback and rejection; overview, grace and the push in the state), the keyboard state and the binding resolver, the map loader against Tiled JSON fixtures and the test map fixture, the named points with their three rejections, and collision rectangles in the tileset with their four rejections and a spawn in a strip, low tiles and the opaque boxes with the rejection of a low tile without a box, the floor map against its generator and the spec's layout: the ring and its windows, the areas, every wall cell's strip and every opening, the posts, the closed doors, the tile counts, the free spawn, the view's first cell, reachability on foot over a 2 px lattice — every room but the lift and the stairwell, the meeting rooms only through the side passage — and its three snippets: free boxes, reached, none in the first view, and its wake point: a free box, reached, in the data protection officer's office; the furnished floor against the spec's picture, its tile counts, its pieces, the empty areas, its tall things, every cubicle reached, the counter in the first view and the opaque boxes; path resolution, the cells a layer draws for a camera, and the draw order of the scene with the camera offset and the cone's frame per facing, and the creatures' frames, the hearts, the lids and the blink, the tile generator against the committed tileset and each strip's pixels against its boxes, the furniture tiles pixel by pixel with their boxes and `low`, the sprite generators against the committed sheets, the lamp sheet pixel by pixel against the cone, the snippet sheet pixel by pixel, the overview sheet pixel by pixel, the loop with a fake clock and its once-per-frame input, the language table |
| **Architecture** | Vitest, Node | the import graph and source text of `src/game/` (INV-2); the branded text type is enforced by the compiler (INV-4) |
| **Assets** | Vitest, Node | every PNG under `public/` against Endesga 32 and the reserved colour, allowed only in the listed shadow assets, alpha 0 or 255 with transparent pixels exempt; tilesets under `public/tiles/` sized in multiples of 16; `.tsj` files against their PNG (INV-6) |
| **Smoke** | Playwright, one spec | the page loads, the canvas exists at the full factor and unclipped, the picture's corner shows carpet `#8b9bb4`, the view's first cell at the spawn; the player starts at x = 256 with the camera at (96, 624); one second of ArrowRight moves the player and the camera right by at least 70 px and leaves the player facing right; a held Space turns the lamp on and holds the figure in place with ArrowRight held, and the release turns it off; the floor starts with three snippets and nothing captured; overview is five of five and the dark is not running, read from `window.shadowAi.state` — against the dev server and against the built container; against the container (`BASE_URL`) also the four security headers, the cache headers and gzip (INV-5) |

All four run in CI on every pull request (`ops.md` §4). Red blocks the merge.

## 2. The test behind each invariant

| Invariant | Test |
|---|---|
| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark |
| INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/` |
| INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
| INV-4 text through keys | the compiler, via `TextKey`; a unit test that `de` and `en` have identical key sets |
| INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
| INV-6 palette | the asset tests: palette, the reserved colour and its one exception, alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
| INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box (`architecture.md` §6); a world-data test orders regions by density against the upgrades that precede them |

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
  during the walk. A number in CI would measure the runner, not the game.
- **Tiled itself.** The loader is tested against committed fixtures, not against the editor.

## 5. Human acceptance: the walk

The last test of every feature is the **acceptance walk**: the author runs the feature's
acceptance plan — the manual test written into the feature spec and mandatory for approval
(`CLAUDE.md` §3) — guided by the agent, one step at a time. The automated layers prove the rules
hold; the walk proves they are *reachable* — that the screen shows what the spec says, and that
the game feels the way the numbers intended. **The walk is the quality gate: no pull request is
opened before it has passed.**

An acceptance plan has three parts:

- **Preconditions.** How to start — `npm run dev` or the container — which browser, which window
  size, and where in the game to begin. Nothing the tester has to work out.
- **Steps.** One flat numbered list from start to finish. An action step says what to press or do,
  in the words of the keys and the screen. **Every expected result is its own numbered step**,
  never a parenthesis on the action step, so a failure is reported as "step 7" and needs no
  interpretation.
- **Feel.** The few things only a player notices — a snag at a corner, a shimmer, a speed that is
  off — as questions with room for a number or a note.

### The walk

The walk begins when the implementation is complete (`CLAUDE.md` §3 step 3): all four layers
green, typecheck and Biome clean, build and container running, `docs/spec/` updated. The agent
does not run the plan itself before the walk; the automated layers are the only pre-check, and
the walk belongs to the author.

1. **Set-up.** The agent starts the game as the preconditions say — the dev server or the
   container — and states them in one message: the URL, the browser, the window size, where in
   the game to begin. The author opens the game in their own browser and says when they are
   ready. Nothing else happens until then.
2. **One step per message.** The agent names the next action step together with its expected
   step, in the spec's numbering and words, and nothing more: no hint at what a failure would
   look like, no summary of the steps to come. The step is the only question of that message,
   and the agent waits for the answer.
3. **The author answers.** `pass` or `fail`, with a note if there is one. The agent records the
   answer as given. It never answers a step itself, never skips one, and never takes silence or
   a general remark as a pass.
4. **Fail ends the walk.** The agent records "step n failed" with the author's words and stops
   the walk. It fixes the branch — or asks, when the fix needs a decision the spec or the plan
   does not make — reruns the automated checks, and the walk starts again at step 1. A fixed
   branch is a new build; nothing before the failed step counts as still proven. The failed walk
   is recorded in the fix's commit message, not in the spec.
5. **Feel last.** After the last step the agent asks the feel questions, one per message, and
   records the answers with their numbers and notes. A feel note is not a failure: a number the
   author would change becomes a new draft, not a change on this branch.
6. **The record.** When every step has passed and the feel questions are answered, the agent
   writes the result into the spec's `Result` line — `passed YYYY-MM-DD, steps 1–n`, followed by
   the feel notes — and commits it on the branch. The pull request description points to it.
   Only then does `CLAUDE.md` §3 step 5 begin.

A walk takes a few minutes, not an afternoon. If it does not fit, the feature is too big and is
cut. A merge of `main` after the walk that changes code counts as a fix: the walk is run again.

## 6. Test data

Fixtures live beside the tests under `tests/fixtures/`: small Tiled maps built for a purpose (a
corridor of solid tiles, a map with an unknown layer, the test map of 0003 on its own seven-tile
tileset, the four maps of 0008 with named points: `points.tmj`, `point-without-name.tmj`,
`point-outside.tmj`, `point-on-solid.tmj`, the tilesets of 0010 with collision rectangles:
`boxes.tsj` and the five it rejects, `shape-ellipse.tsj`, `shape-rotated.tsj`,
`shape-outside.tsj`, `shape-fraction.tsj`, `solid-and-shape.tsj`, and the two maps on it,
`thin-walls.tmj` and `thin-walls-spawn-in-strip.tmj`), a tiny PNG with one off-palette pixel.
Fixtures are hand-made and committed; they are never generated from the real content, so a
change to the floor map cannot silently change what a test proves.
