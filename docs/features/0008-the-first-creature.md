# 0008 — The first creature

**Status:** approved 2026-11-12
**Milestone:** M3
**Drafted:** 2026-11-12

## Goal

Three small creatures live on the campus near Sales. They come toward the figure, freeze in the
lamp's light, and are captured when the light is held on them for one second. After this feature
the lamp has something to act on, and the player has done the game's central gesture once:
capture, not defeat.

## Scope

**In:**

- the species `snippet` (German working name *Schnipsel*): a scrap of paper with lines of text,
  the creature of the Sales case — it feeds on pasted text (`world.md` §2, §4). Small, layer 1
  (`gameplay.md` §3): it gives way to the lamp alone
- `src/game/creature.ts`: the creature as data and its step — rest, approach, freeze, capture —
  with the constants `NOTICE_RADIUS` 64, `TOUCH_DISTANCE` 8, `CREATURE_SPEED_PX_PER_SECOND` 40
  and `CAPTURE_STEPS` 60
- `GameState.creatures`, the creatures still in the world, and `GameState.captured`, the count
  of captured creatures per species
- `engine/collision`: `sightBlocked(a, b, grid)`, a sight line against the solid grid. Solid
  tiles block the lamp's light — the decision 0007 left to this feature
- `engine/tiled`: `TileMap.points`, the named point objects of the `objects` layer other than the
  spawn, each checked like the spawn: inside the map, on a cell that is not solid
- `tools/campus-layout.ts` and `npm run gen-campus`: three point objects named `snippet` in the
  campus map
- `tools/placeholder-snippet.ts`, pure, in the pattern of the figure and the lamp, and
  `npm run gen-sprites`, which now also writes `public/sprites/snippet.png`: three 16x16 frames
- the asset test's reserved-colour rule gains its first exception: `public/sprites/snippet.png`
  may use the signature colour `#68386c` (`visual.md` §4)
- `render/draw-scene.ts`: the creatures are drawn after the cone and before the player
- with the implementation: `architecture.md` §1 the new tool, §2 the creatures and the captured
  count in the state, §5 the draw order, §6 the points and their rules, §7 the snippet generator
  and the campus objects; `gameplay.md` §2 and §3 the freeze and the capture as built;
  `visual.md` §4 the named exception; `world.md` §4 the species and where it lives;
  `testing.md` §1 and §2 the new tests; the README its status

**Out, explicitly:** a hit and anything a touch costs (0009, overview) · light strength, density
and shadow walls (0010) · the journal entry, the species' displayed name and its text, with the
trademark check of that name (M4; this feature shows no text) · medium creatures and actions in
the environment (M6) · a capture animation — the creature vanishes in the step it is captured ·
creatures that come back: a captured creature is gone for the session · path finding: a creature
walks straight at the figure and a wall holds it · collision between creatures, and between a
creature and the figure · clipping the cone's picture at walls: the picture of 0007 stays, only
the light's effect is blocked · a separate `opaque` tile property: light is blocked by `solid`,
so fences and water block it too; a see-through fence is a decision for the art pass · sorting
figures and creatures by their y position · a sound (audio, after M5) · creatures inside
buildings (M5, when Sales has an interior).

## Behaviour

Every number is a pixel or a logic step (1/60 s). Numbers marked *tune* are starting values.

### The creature as data

- A creature is `{ species, x, y, light }`. `species` is `'snippet'`, the only member of
  `SPECIES` so far. `x` and `y` are its feet in map pixels, floating point, the bottom centre of
  its 16x16 sprite — the convention of the figure. `light` counts the steps it has been lit
  without a break, a whole number from 0 to 59; a creature with `light` above 0 is frozen.
- Its collision box is the figure's: `[x − 6, x + 6) × [y − 8, y)`, derived when needed.
- Its **body point** is B = (x, y − 8), the centre of its sprite. The lamp is tested against B.
- `GameState.creatures` is an array of creatures in the order of the map's points.
  `GameState.captured` is `{ snippet: number }`, one whole number per species.
- `createInitialState(map)` makes one creature per entry of `map.points` whose name is a
  species, at the point's position, with `light` 0, and sets every count of `captured` to 0. A
  point with any other name stops the game before it starts:
  `unknown point object "<name>" at (<x>, <y>)`. Until a later feature adds doors, figures or
  triggers, every point besides the spawn is a creature, and a typing mistake is not a silently
  missing creature.

### One step

`update` sets the lamp from the input and steps the player as before (0007). Then, with the
stepped player, each creature is stepped in array order:

1. **Lit?** The creature is lit in this step when all three hold: the lamp is on;
   `inCone(B, lampCone(player))`; and the sight line from the centre of the figure's collision
   box, (player.x, player.y − 4), to B is not blocked (below).
2. **Lit:** the creature does not move, and `light` grows by 1. When `light` reaches
   `CAPTURE_STEPS`, 60, the creature is **captured** in that step: it leaves `creatures`, and
   `captured[species]` grows by 1. A creature lit in 60 steps in a row is captured in the 60th.
3. **Not lit:** `light` becomes 0 — the count starts again the next time, however long it was —
   and the creature moves by the rule below, in the same step.

Creatures do not affect each other or the figure. Two creatures may stand on the same spot, and
the figure walks through a creature. Nothing happens on touch; 0009 gives the touch its cost.

### Rest and approach

- With D the distance between the creature's feet and the figure's feet:
  - D ≥ 64 (`NOTICE_RADIUS`, *tune*, four tiles): the creature rests where it is.
  - 8 < D < 64: it moves toward the figure's feet by m = min(2/3, D − 8) along the unit vector
    from its feet to the figure's. 2/3 px per step is 40 px/s (*tune*), half the figure's speed.
  - D ≤ 8 (`TOUCH_DISTANCE`, *tune*): it rests. By its own movement a creature never comes
    closer than 8 px.
- A creature that lost the figure stays where it stopped. It has no home to return to.
- The movement runs through `moveBox` like the figure's (0005): X first, then Y, each axis
  snapped flush to the first solid cell. So a creature slides along a wall, is held by a fence
  and by water, and does not find its way around a building.
- After the move the feet are clamped so the 16x16 sprite stays on the map: x to
  [8, 16 × width − 8], y to [16, 16 × height].

### The sight line

- `sightBlocked(a, b, grid)` in `engine/collision`: with n = max(1, ⌈|b − a|⌉), it tests the
  n + 1 points a + (b − a) × i / n, i = 0 … n. The line is blocked when one of them lies in a
  solid cell — the cell (⌊x / 16⌋, ⌊y / 16⌋); cells outside the grid are open, as for `moveBox`.
- The points are at most 1 px apart. A line that cuts less than that off a cell's corner may
  pass; nobody sees the difference.
- The line starts at the centre of the figure's collision box and not at the cone's apex: the
  box is never in a solid cell, the apex — 12 px above the feet — is, whenever the figure stands
  flush under a wall. B is never in a solid cell either: it lies on the upper edge of the
  creature's box.
- Solid means the `solid` grid of the map (INV-7): walls, roofs and doors, and also fences and
  water. The cone is 48 px long and the pond and the canal are wider, so on the campus only the
  fence is a case where it shows: a creature behind a fence cannot be frozen through it.
- The cone's picture is not cut: it still lies over a wall, as 0007 draws it.

### Points in the map

- `engine/tiled` reads every object of the `objects` layer with `point` true. The one named
  `spawn` stays the spawn (rule 4). Every other point becomes an entry `{ name, x, y }` of
  `TileMap.points`, in file order. Objects that are not points are ignored as before.
- Checks, after the spawn's, with the spawn's wording: a point without a name that is a
  non-empty string — `layer "objects" has a point object without a name`; a point outside the
  map — `point "<name>" (<x>, <y>) is outside the map (<W>x<H> px)`; a point on a solid cell —
  `point "<name>" (<x>, <y>) is on a solid tile (<c>, <r>)`.
- `engine/` does not know what a name means; `game/` does (above).

### The campus

Three points named `snippet` in `objects`, after the spawn, in this order:

| # | Feet | Tile | Where |
|---|---|---|---|
| 1 | (1288, 760) | (80, 47) | on the east avenue, between the courtyard and Sales |
| 2 | (1560, 760) | (97, 47) | on the east avenue in front of the Sales door |
| 3 | (1592, 540) | (99, 33) | inside the meeting rooms' fence, on its south side |

- All three are more than 64 px from the spawn (1024, 734) and outside the first view
  (864–1183 × 640–819), so the game opens as in 0007 and the smoke test's first second is
  unchanged.
- The third stands behind the fence row 34 and comes out only through the gap at (95, 34). It is
  the place where the walk shows that a fence holds a creature and blocks the light.
- The places are placeholders like the campus itself. When Sales has an interior (M5) its
  creatures move inside.

### The sprite sheet

- `public/sprites/snippet.png` is 48x16: three 16x16 frames in one row.
- Frame 0, in frame coordinates (column, row): the sheet of paper is the square columns 3–12,
  rows 4–13. Its border, 36 pixels, is `#68386c`. Three lines of text are `#68386c` too: row 7
  columns 5–10, row 9 columns 5–10, row 11 columns 5–8, 16 pixels. The remaining 48 pixels of
  the square are `#c0cbdc`. Everything else is transparent. 100 opaque pixels, 52 of them the
  signature colour.
- Frame 1 is frame 0 moved up by 2 px: the square in rows 2–11, the lines in rows 5, 7 and 9.
- Frame 2 is frame 0 with `#ffffff` in place of `#c0cbdc`: the paper in the light.
- A creature that is not frozen shows frame ⌊tick / 15⌋ mod 2: it bobs 2 px, four changes per
  second. A frozen creature shows frame 2 and does not move. The shadow is recognised by its
  colour, and by motion for whoever does not see the colour (`visual.md` §4); the light is what
  stops the motion.
- `#68386c` is the reserved colour. This is the first shadow asset, and it names the exception
  `visual.md` §4 asks for: the asset test allows the reserved colour in the files of a list,
  `sprites/snippet.png` its only entry, and rejects it everywhere else as before.
- `tools/placeholder-snippet.ts` returns the pixels as data; `npm run gen-sprites` writes the
  file beside the other two. Committed, deterministic, and a unit test fails when file and
  generator disagree. The art pass replaces the file under the same name and frame order.

### Drawing

- The draw order of a frame becomes: clear, `ground`, `detail`, the cone when the lamp is on,
  **the creatures in array order**, the player, `above`.
- A creature's frame has its top-left corner at (round(x) − 8 − camera.x,
  round(y) − 16 − camera.y). Creatures outside the view are drawn too; the surface clips them.
- The frame is 2 when `light` > 0, else ⌊tick / 15⌋ mod 2, with `tick` from the state.

### State

- `GameState = { tick, player, camera, lamp, creatures, captured }`: plain data, the JSON round
  trip exact (INV-1).
- `update(state, input, content)` keeps its signature. The camera follows the player as before.

## Acceptance criteria

1. The game opens as in 0007: no creature in view, the figure at (1024, 734).
2. A snippet rests until the figure's feet are closer than 64 px, then comes toward the figure at
   40 px/s and stops 8 px from its feet; when the figure is 64 px or more away it stays where it
   is.
3. A snippet in the lamp's cone stops, shows the white frame and does not bob; after 60 lit steps
   in a row it vanishes and `captured.snippet` is one higher.
4. A snippet that leaves the light before the 60th step moves again in that step and needs the
   full 60 steps the next time.
5. A wall or a fence holds a snippet: it slides along it and does not pass.
6. A snippet whose sight line to the figure crosses a solid tile is not frozen, although the
   cone's picture lies over it.
7. `sightBlocked` and the creature's step are proven by unit tests with the numbers of the test
   plan.
8. The loader returns the named points, and rejects a point without a name, outside the map or on
   a solid tile, each with its message; the game rejects a point with an unknown name.
9. The campus map holds the three snippets of the table; each one's box is free of solid cells
   and its cell is reachable on foot from the spawn.
10. `npm run gen-sprites` and `npm run gen-campus`, each twice in a row, leave `git status`
    clean; `snippet.png` is 48x16 with 100 opaque pixels per frame, 52 of them `#68386c`.
11. The asset test accepts `#68386c` in `sprites/snippet.png` and rejects it in every other PNG.
12. The state carries the creatures and the captured count and survives the JSON round trip with
    a frozen creature and a count of 1.
13. In the smoke test `window.shadowAi.state.creatures` has three entries, the first at
    (1288, 760), and `captured.snippet` is 0.
14. CI is green, both smoke runs.

## Test plan

- `tests/unit/collision.test.ts` extended — `sightBlocked` on a grid whose only solid cell is
  (2, 1), the square [32, 48) × [16, 32): (24, 24) → (56, 24) is blocked; (24, 8) → (56, 8) and
  (24, 40) → (56, 40) are clear; (24, 32) → (56, 32) is clear and (24, 31.5) → (56, 31.5) is
  blocked, the half-open edge; (40, 0) → (40, 40) is blocked; (24, 24) → (24, 24), a point, is
  clear, and (40, 24) → (40, 24) is blocked; a line that leaves the grid, (24, 8) → (−20, 8), is
  clear.
- `tests/unit/creature.test.ts`, new, on an open grass map, lamp off unless said, the figure's
  feet at (160, 100):
  - rest and approach: a creature at (100, 100), D = 60, moves to x = 100.667; at (96, 100),
    D = 64, it stays; at (151.5, 100), D = 8.5, it moves to 152 exactly; at (152, 100) and at
    (155, 100) it stays; at (130, 60), D = 50, it moves by (0.4, 0.533);
  - walls, on a picture grid: a creature whose box is flush left of a solid cell with the figure
    straight behind that cell keeps its x; with the figure down-right of it, it keeps its x and
    moves down; at the map's edge the clamp holds x at 8 and y at 16;
  - lit: the figure at (100, 100) facing right, the lamp on, a creature at (130, 100), so
    B = (130, 92), d = 30, s = 4: it does not move and `light` is 1; from `light` 58 it goes to
    59 and stays in the world; from 59 it is captured; the same creature with the lamp off, or
    with the figure facing left, or at (130, 120) — s = 24 against d / 2 = 15 — is not lit:
    `light` is 0 and it has moved;
  - the break: a creature with `light` 30 that is not lit has `light` 0 and has moved 2/3 px in
    that step;
  - the wall in the light: with a solid cell between the figure's box centre and B the creature
    in the cone is not lit; with the cell beside the line it is.
- `tests/unit/state.test.ts` extended — on a 128x96 grass map with the spawn at (1024, 734) and
  one point `snippet` at (1070, 734): the initial state has that creature with `light` 0 and
  `captured` `{ snippet: 0 }`; one step with no input moves it to x = 1069.333; with `right` and
  `lamp` held from the first step it never moves, has `light` 59 after 59 steps, and after the
  60th `creatures` is empty and `captured.snippet` is 1; a point named `snipet` throws
  `unknown point object "snipet" at (1070, 734)`; the populated round-trip state holds a creature
  with `light` 30 and a count of 1.
- `tests/unit/tiled.test.ts` extended — the test map fixture returns no points; a fixture with
  two points returns them in file order; the three rejections with their messages:
  `tests/fixtures/maps/point-without-name.tmj`, `point-outside.tmj`, `point-on-solid.tmj`.
- `tests/unit/campus.test.ts` extended — the map's points are the three of the table, in order;
  each box `[x − 6, x + 6) × [y − 8, y)` is free of solid cells; each cell is reachable from the
  spawn; none lies in the first view; file and generator still agree.
- `tests/unit/draw-scene.test.ts` extended — with two creatures the two `drawSprite` calls of the
  snippet sheet come after the cone's and before the player's, in array order; for feet
  (40.4, 50.6) and camera (5, 7) the top-left corner is (27, 28); the frame is 0 at tick 0 and
  14, 1 at tick 15 and 29, 0 at tick 30, and 2 whenever `light` is above 0; with no creatures
  the call list is 0007's.
- `tests/unit/gen-sprites.test.ts` extended — the snippet sheet: two runs byte-identical and
  equal to the committed file; 48x16; per frame 100 opaque pixels, 52 of them `#68386c`; frame 1
  is frame 0 moved up by 2; frame 2 differs from frame 0 only in `#ffffff` for `#c0cbdc`.
- `tests/unit/assets.test.ts` extended — the reserved colour passes in a file on the exception
  list and still fails, with its message, in one that is not.
- `tests/arch/` unchanged; `src/game/creature.ts` falls under its rule.
- Smoke spec extended: after the handle appears, `state.creatures` has length 3,
  `state.creatures[0]` is at (1288, 760) and `state.captured.snippet` is 0.
- New fixtures: the three rejected maps above and `points.tmj`, each 20x12 on
  `fixture-tiles.tsj`.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not
maximized, the developer console open beside the game; the campus of 0006, the figure at the
spawn in the courtyard; a terminal in the repository root on the feature branch.

1. Open `http://localhost:5173`.
2. Expected: the figure stands in the courtyard facing down; no creature is in view.
3. Hold `D` until a small scrap of paper comes into view on the beige path to the right, then
   release at once.
4. Expected: a grey scrap with a violet edge and violet lines stands on the path, near the right
   edge of the screen. It bobs up and down and stays in its place.
5. Walk toward it in short taps of `D` until it starts to move, then stand still.
6. Expected: from about four tiles away the scrap comes toward the figure, clearly slower than
   the figure walks, and stops at the figure's feet. Nothing else happens.
7. Hold `A` for about one second, release, tap `D` once so the figure faces the scrap, then hold
   `Space`.
8. Expected: as the scrap comes into the light it stops, turns white and stands still. After
   about one second in the light it vanishes.
9. Release `Space`. In the console enter `shadowAi.state.captured.snippet`.
10. Expected: `1`.
11. Walk right along the path until a second scrap comes toward the figure, in front of a door.
    Let it reach the figure. Hold `A` for about one second, tap `D`, hold `Space` until the scrap
    turns white, and release `Space` after about half a second.
12. Expected: the scrap bobs again at once and comes on toward the figure.
13. Hold `A` for about one second, tap `D`, hold `Space` and keep it held.
14. Expected: the scrap freezes again and vanishes only after a full second in the light, not
    sooner.
15. Walk back left to the path that leads up, follow it up to the lower-left corner of the fence
    on its right, and walk right along the outside of the fence's lower side until a third scrap
    appears inside the fence. Stand still below it.
16. Expected: the scrap comes down to the fence and stays behind it, bobbing. It does not pass
    the fence.
17. Tap `W` so the figure faces the scrap through the fence, and hold `Space` for three seconds.
18. Expected: the cone lies over the fence and the scrap; the scrap keeps bobbing and does not
    vanish.
19. Walk left along the fence to its gap. Get the scrap onto the figure's side of the fence, or
    walk in through the gap; line the scrap up and hold `Space` on it.
20. Expected: with no fence between them the scrap freezes and vanishes after about one second.
21. In the console enter `shadowAi.state.captured.snippet`, then
    `shadowAi.state.creatures.length`.
22. Expected: `3`, then `0`.
23. In the terminal run `npm run gen-sprites`, `npm run gen-campus`, both again, then
    `git status`.
24. Expected: no changes.
25. Open `public/sprites/snippet.png` in an image viewer.
26. Expected: three 16x16 frames in one row: the scrap, the scrap two pixels higher, the scrap
    with white paper.

**Feel:** Is one second in the light too long, too short or right? Write down the time you would
prefer. Is 40 px/s a creature you can deal with, or one you wait for? Is four tiles the right
distance for it to notice the figure? Was lining the scrap up in the cone a small skill or a
nuisance? Does the frozen scrap read as held by the light without any further sign that the
capture is running? Does the scrap read as shadow — as something that does not belong on the
path?

**Result:** not yet walked.

## Open questions

None.
