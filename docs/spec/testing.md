# Testing — Shadow AI

What is tested, how, and what is deliberately left to a human. The strategy rests on ADR-0001:
because game logic is plain data and pure functions, almost everything that can go wrong in a
rule can be proved without a browser.

## 1. Four layers

| Layer | Runs with | Covers |
|---|---|---|
| **Unit** | Vitest, Node | engine math (movement, collision, camera), among it the box resolver against a picture grid and the loaded corridor fixture and against boxes thinner than a cell — strips, a post, a doorway between two strips — a sight line against the solid boxes, a 2 px strip, a 3 px push against it, a chair's box and a screen's panel (0011), and the camera: centring, the four clamps, the corners, rounding, the view constants; game rules (the player's movement, facing, clamp and walk cycle, and the player's box against solid tiles: flush stops, the slide, corners and a one-tile gap, and a wall strip that holds a push; and the camera in the state: the spawn's camera, following the walk, the clamp on the small map; the lamp's cone: the apex, the half-open length, the slope, what lies behind and beside the apex, per facing; the figure holding the lamp: standing, turning, the reset of the walk cycle, the resumed walk; the lamp in the state; the creature's step: rest, approach, the stop at 8 px, sliding and the clamp, the light, the count to 60, the break, a wall and a 4 px strip in the light, the light across a low box that still stops the walk and behind an opaque one; the arcade cabinet and a beanbag of the placeholder tileset in the light (0013); the creatures and the captured count in the state; the hit: reach, the frozen creature, array order, grace, the push and its direction, the last point; the dark: the sequence step by step, the wake point and its fallback and rejection; overview, grace and the push in the state), the keyboard state and the binding resolver, the map loader against Tiled JSON fixtures and the test map fixture, the named points with their three rejections, and collision rectangles in the tileset with their four rejections and a spawn in a strip, low tiles and the opaque boxes with the rejection of a low tile without a box, the floor map against its generator and the spec's layout: the ring and its windows, the areas, every wall cell's strip and every opening, the posts, the closed doors, the tile counts, the free spawn, the view's first cell, reachability on foot over a 2 px lattice — every room but the lift and the stairwell, the meeting rooms only through the side passage — and its three snippets: free boxes, reached, none in the first view, and its wake point: a free box, reached, in the data protection officer's office; the furnished floor against the spec's picture, its tile counts, its pieces, the empty areas, its tall things, every cubicle reached, the counter in the first view and the opaque boxes; the lounge and the gadgets against the picture of 0013, their counts and pieces, the ten replaced cells, every cell without a solid box reached, row 18 of Development, the seating corner in the first view; path resolution, the cells a layer draws for a camera, and the draw order of the scene with the camera offset and the cone's frame per facing, and the creatures' frames, the hearts, the lids and the blink, the tile generator against the committed tileset and each strip's pixels against its boxes, the furniture tiles pixel by pixel with their boxes and `low`, the tiles of 0013 likewise and ids 0–29 against the sheet of 0011, the sprite generators against the committed sheets, the lamp sheet pixel by pixel against the cone, the snippet sheet pixel by pixel, the overview sheet pixel by pixel; the movers (0015): routes from points — their order, `look`, the `pause` property in the loader and its rejection, and the route rejections with their messages on points built in the test — the step: wait, move, the exact arrival, the wrap to the first point, the speeds of the four kinds, facing per leg, the frames of a person and a dog, yield at 19.9, 20 and 20.1 px, the drone that does not yield; the movers in the state: the round trip after 600 steps, the dark, a map refused for a crossing route, and 600 recorded steps on the floor with movers against the same run without; the 22 routes of the floor against the spec's tables and every ground leg free, the first view's person and dog; the scene's order of ground movers, figure and drones, their origins and frames by `tick`; the seven sheets against their generators, the vacuum and the drone pixel by pixel; the world data (0014): the densities and upgrades of the spec, the strength after each upgrade, `gatingFaults` on the real data and on four tables with one fault each; the shadow walls (0014): rectangles in the loader with their four rejections, the walls read from them with their four refusals, the box against the cone at the thirteen positions of the spec, the sight line to a wall's last pixel, the step to 60 and the break, the dense wall that holds, the map with the walls as solid and opaque boxes; the walls in the state: the round trips, the figure flush from four sides and sliding, the held push, the snippet held and kept out of the light, the dark and the wake, 600 recorded steps without walls against a map without rectangles; the eight walls of the floor against the spec's table, on their openings, clear of every solid box, and the four floods; the walls' looks, segments and place in the scene; the wall sheet pixel by pixel; the loop with a fake clock and its once-per-frame input, the language table; the help (0021): opening over the world, over a dialogue and over the journal, which keep their page and their tab, with other keys held and in the middle of a push, the 600 steps that stand still with every other key held, closing with keys held through it, the held key that opens once, the dark, the start hint by `tick`, the rows and the box with their origins in both languages, and the scene with the help over the world, a dialogue and the journal, the start hint in the bar and its place behind the dialogue box, the notice and the language line |
| **Architecture** | Vitest, Node | the import graph and source text of `src/game/` (INV-2); the branded text type is enforced by the compiler (INV-4) |
| **Assets** | Vitest, Node | every PNG under `public/` against Endesga 32 and the reserved colour, allowed only in the listed shadow assets, alpha 0 or 255 with transparent pixels exempt; tilesets under `public/tiles/` sized in multiples of 16; `.tsj` files against their PNG (INV-6) |
| **Smoke** | Playwright, one spec | the page loads, the canvas exists at the full factor and unclipped, the picture's corner shows carpet `#8b9bb4`, the view's first cell at the spawn; the player starts at x = 256 with the camera at (96, 624); one second of ArrowRight moves the player and the camera right by at least 70 px and leaves the player facing right; a held Space turns the lamp on and holds the figure in place with ArrowRight held, and the release turns it off; the floor starts with three snippets and nothing captured; the floor starts with its 22 movers and the reception's person is drawn in its shirt `#3e8948`; overview is five of five and the dark is not running; the floor starts with its eight shadow walls standing and a lamp of strength 1, read from `window.shadowAi.state`; `L` switches `window.shadowAi.language` and the page's `lang` from `de` to `en` and back, once per press, a held key once (0019); `H` opens the help, the figure stands under it with `ArrowRight` held, and `H` closes it (0021) — against the dev server and against the built container; against the container (`BASE_URL`) also the four security headers, the cache headers and gzip (INV-5) |

All four run in CI on every pull request (`ops.md` §4). Red blocks the merge.

## 2. The test behind each invariant

| Invariant | Test |
|---|---|
| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); the initial state and one with the help open (0021) |
| INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/`, and on the type `Language` there — the game does not know the language (0019) |
| INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
| INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
| INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
| INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet (0023) —, the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
| INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |

A change to the state's shape is held against a recording: 600 steps on the floor with walking,
a word with the colleague behind the counter and the lamp, whose SHA-256 digest was taken with
the code before feature 0020 replaced `talkHeld` with `held`. A second recording holds feature
0021: 600 steps on the floor with walking, a word with the colleague, the lamp and the journal
opened, turned to the cases and closed, whose digest was taken with the code before the help was
added. The digests are never changed; a test that fails on one found a world that steps
differently.

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

**What only exists after the merge.** A feature can end in something that only exists on
`main` — a job that runs on a merge, for example. That part is not a step of the walk. The
spec lists it under "After the merge"; the author checks it with the agent right after
merging, one step per message as in the walk, and the answers are recorded as a comment on
the pull request. A failure there is a defect and is fixed by a follow-up change.
Everything that can be proved before the merge stays in the walk.

## 6. Test data

Fixtures live beside the tests under `tests/fixtures/`: small Tiled maps built for a purpose (a
corridor of solid tiles, a map with an unknown layer, the test map of 0003 on its own seven-tile
tileset, the four maps of 0008 with named points: `points.tmj`, `point-without-name.tmj`,
`point-outside.tmj`, `point-on-solid.tmj`, the tilesets of 0010 with collision rectangles:
`boxes.tsj` and the five it rejects, `shape-ellipse.tsj`, `shape-rotated.tsj`,
`shape-outside.tsj`, `shape-fraction.tsj`, `solid-and-shape.tsj`, and the two maps on it,
`thin-walls.tmj` and `thin-walls-spawn-in-strip.tmj`, and `routes.tmj` of 0015, one route of each
kind of mover with `pause` properties, on the tiles of `points.tmj`, and `walls.tmj` of 0014,
three shadow walls on open floor, with the four maps it rejects: `rect-without-name.tmj`,
`rect-rotated.tmj`, `rect-outside.tmj` and `object-ellipse.tmj`, and `figures.tmj` of 0017, 20x12
on the tiles of `points.tmj`, with the spawn, a snippet and `figure:officer` at (160, 96), and
`talkers.tmj` of 0018, 20x12 on the same tiles, with the spawn, `figure:officer` at (160, 96), the
route `person:reception` of two points and a route `dog:reception`, and `traces.tmj` of 0022,
20x12 on the same tiles, with the spawn at (168, 128), a rectangle `trace:sales` on cell (10, 5)
and a rectangle `shadow:marketing` between the two, and `case.tmj` of 0024, 20x12 on the same
tiles, with the spawn at (104, 48), the route `person:sales` of two points with a pause of 600
on the first, and two rectangles `trace:sales`), a tiny
PNG with one off-palette pixel.
Fixtures are hand-made and committed; they are never generated from the real content, so a
change to the floor map cannot silently change what a test proves.
