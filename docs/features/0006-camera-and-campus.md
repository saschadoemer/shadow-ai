# 0006 — Camera and campus

**Status:** approved 2026-11-11
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

The camera follows the figure across a map larger than the screen, and that map is the company's
campus: every region of `world.md` §1 laid out as a footprint. After this feature there is a
world to walk, and M2 is complete.

## Scope

**In:**

- `src/engine/camera.ts`, generic and game-agnostic (`architecture.md` §1): `VIEW_WIDTH` 320 and
  `VIEW_HEIGHT` 180, and `cameraFor(target, map)` — the top-left corner of a view centred on
  `target`, clamped so the view never leaves a map of `width` × `height` **pixels** — a
  `TileMap`, whose width and height are tiles, is not one — rounded to integers (see
  behaviour). `render/renderer.ts` keeps `SURFACE_WIDTH` and `SURFACE_HEIGHT` as
  re-exports of the two constants, so there is one 320 and one 180.
- the camera joins the state, as `architecture.md` §2 foresees: `GameState.camera`, a `Point` in
  map pixels — the view's top-left corner. `src/game/camera.ts`: `followPlayer(player, map)`
  centres the view on the collision box of 0005. `update` sets the camera after the player's
  step; `createInitialState(map)` sets it from the spawn and moves to `src/game/update.ts`
  beside `update`, so that `state.ts` holds types and constants only and no module imports in a
  circle.
- `render/draw-map.ts`: `drawLayer(renderer, map, tileset, name, camera)` draws cell (c, r) at
  (16c − camera.x, 16r − camera.y) and only the cells the view intersects. `drawMap`, unused
  since 0004, is removed; `drawScene` draws the player at
  (round(x) − 8 − camera.x, round(y) − 24 − camera.y).
- `tools/campus-layout.ts` and `tools/gen-campus.ts`, run with `npm run gen-campus`, in the
  pattern of the tile generator (`architecture.md` §7): the first holds the campus as data — the
  rectangles of path and water on `ground`, the buildings and fences on `detail`, the spawn —
  and builds the three layers from them; the second writes `public/maps/campus.tmj`
  deterministically, in the JSON Tiled 1.11 writes, so the file opens in Tiled. The layout
  exports its regions — name, footprint, doors — for the tests. The tables under behaviour are
  the layout; the generator is retired when the art pass takes the map over by hand, as for the
  tilesets (`visual.md` §5).
- `public/maps/campus.tmj`: **128x96 tiles** (2048x1536 px), referencing
  `../tiles/placeholder.tsj`, committed; `main.ts` loads it instead of the test map
- `public/maps/test.tmj` moves to `tests/fixtures/maps/test.tmj` and references a hand-made
  seven-tile fixture tileset, `tests/fixtures/maps/seven-tiles.tsj` (ids and `solid` as the
  placeholder's; its image, like `fixture-tiles.png`, is never loaded); its test follows it
- the loader additionally checks the spawn: inside the map and on an open cell (rule 13)
- the smoke spec on the campus: the surface's top-left pixel is still grass, the spawn is now
  x = 1024, and the camera is read from `window.shadowAi.state`
- with the implementation: `architecture.md` §2 carries the camera in the state, §5 the camera
  offset, §6 rule 13 and the campus file, §7 the campus generator and its retirement;
  `world.md` §1 the campus map as built; `testing.md` §1 and §2 the new tests; `plan.md` §4 M2 as
  done; the README its status, `npm run gen-campus` and the Tiled sentence

**Out, explicitly:** entering any building (M6) · camera smoothing or dead zone (deferred,
`plan.md` §5) · region names on screen or any text (M4) · shadow density data (M3) · a map id in
`GameState` — one map until the first interior (M6) · NPCs, doors that open, triggers (M4–M6) ·
an `above` layer on the campus — nothing to walk behind yet · detailing the campus region by
region or by hand (the art pass, `visual.md` §5).

## Behaviour

### The camera

- The view is 320x180 px of the map. The camera is the view's top-left corner in map pixels,
  two integers in `GameState.camera`.
- The target is the centre of the collision box of 0005: for feet at (x, y) the box is
  [x − 6, x + 6) × [y − 8, y), its centre (x, y − 4).
- camera.x = round(clamp(target.x − 160, 0, mapWidth − 320)); camera.y =
  round(clamp(target.y − 90, 0, mapHeight − 180)). Clamp first, then round; `round` is
  `Math.round`. On the campus the ranges are [0, 1728] and [0, 1356]. On a map exactly
  320x180 px the camera is (0, 0) for every target; on the smallest map the loader accepts,
  320x192, x is always 0 and y lies in [0, 12].
- The camera is set in `createInitialState` from the spawn and in every `update` from the
  stepped player, after collision and clamp. It is derived state, kept in `GameState` because a
  saved game should come back looking as it was left and because every later camera behaviour —
  the deferred lerp, a cut-scene pan — is a change to this number and nothing else.
- Away from the map's edges the figure sits still on the screen: the sprite's top-left corner at
  (152, 70), the box's centre at the screen's centre (160, 90). This holds for every fractional
  position, because 160 and 94 are integers and `Math.round(v − n) = Math.round(v) − n` for
  integer n: camera and sprite round the same fraction the same way, so the figure never jitters
  against the tiles. Near an edge the clamp holds the camera and the figure walks toward the
  screen's edge.

### Drawing

- A layer draws the cells whose columns lie in ⌊camera.x / 16⌋ … ⌊(camera.x + 319) / 16⌋ and
  whose rows lie in ⌊camera.y / 16⌋ … ⌊(camera.y + 179) / 16⌋, each range cut to the map:
  20 or 21 columns, 12 or 13 rows, at most 273 cells per layer per frame. A cell at the view's
  edge is drawn partly off the surface and clipped by it.
- Cell (c, r) is drawn at (16c − camera.x, 16r − camera.y); the player's sprite at
  (round(x) − 8 − camera.x, round(y) − 24 − camera.y). All of it integers: the camera is
  rounded before drawing, never after (`architecture.md` §5).
- The draw order of 0004 stays: clear, `ground`, `detail`, the player, `above`.

### The campus

Tile coordinates are (column, row), 0-based, columns 0–127, rows 0–95; a rectangle is written as
columns c0–c1 × rows r0–r1, both ends inclusive. `ground` is grass everywhere except the paths
and the water; `detail` is empty everywhere except the buildings and the fences; there is no
`above` layer. A **building** is a block of roof tiles whose lowest row is wall, with one or two
door tiles in that row; every building is closed, its door closed. In front of every door, the
cell below it, is a path cell — except the meeting rooms', which opens on grass inside its
fence. Everything is placeholder tiles: ids as in `architecture.md` §7.

| Region | Footprint | Doors |
|---|---|---|
| Main building — Management, the server-room door in its ground floor | 56–71 × 28–41 (16x14) | entrance (64, 41); server room (57, 41) |
| Data protection officer's office | 46–53 × 41–45 (8x5) | (49, 45) |
| Reception | 55–60 × 58–61 (6x4) | (58, 61) |
| Sales | 90–105 × 38–45 (16x8) | (97, 45) |
| Marketing | 70–85 × 64–71 (16x8) | (77, 71) |
| Support | 92–107 × 64–71 (16x8) | (99, 71) |
| HR | 20–35 × 12–19 (16x8) | (27, 19) |
| Accounting | 20–35 × 38–45 (16x8) | (27, 45) |
| Development | 92–111 × 10–19 (20x10) | (101, 19) |
| Meeting rooms | 90–101 × 26–31 (12x6) | (95, 31) |
| Canteen | 40–55 × 64–71 (16x8) | (47, 71) |

| Path (`ground`, path) | Rectangle |
|---|---|
| courtyard | 56–71 × 42–51 |
| west avenue | 20–55 × 46–48 |
| east avenue | 72–107 × 46–48 |
| north avenue | 20–107 × 20–22 |
| west link | 40–42 × 23–45 |
| east link | 84–86 × 23–45 |
| south avenue | 62–65 × 52–75 |
| parking road | 22–61 × 72–75 |
| south-east avenue | 66–107 × 72–75 |
| reception path | 55–61 × 62–62 |
| parking lot | 6–23 × 68–89 |

| Water (`ground`, water) | Rectangle |
|---|---|
| pond, by the canteen | 30–37 × 62–69 |
| canal, the eastern boundary | 120–126 × 1–94 |

| Fence (`detail`, fence) | Where |
|---|---|
| outer ring | row 0, row 95, column 0, column 127 |
| parking lot | the ring of 5–24 × 67–90, open at column 24, rows 72–75, where the road enters |
| meeting rooms | the ring of 88–103 × 24–34, open at (95, 34) only: found, not on the way |

**Spawn:** the point (1024, 734) in `objects` — tile (64, 45), in the courtyard, in front of the
main building's entrance. Its collision box, [1018, 1030) × [726, 734), lies in row 45, columns
63–64, both path. Row 45 is path from column 56 to 71, so the smoke test's second of walking
right — 80 px, to x = 1104 — is free.

**What follows at the spawn.** The box's centre is (1024, 730), so the camera is (864, 640): the
view shows columns 54–73 and rows 40–51, the last of them 4 px. Its top-left cell, (54, 40), is
grass with nothing on `detail`, and the camera lies on a tile corner, so the surface's pixel
(0, 0) is the grass base colour `#63c74d` — the smoke test keeps its check. The screen shows the
main building's facade with its two doors along the top, the courtyard, and grass to both sides.

**Reachability.** On foot means over open cells, four-connected, from the spawn's cell. Every
door's front cell is reachable, the parking lot's cell (14, 78) too, and the meeting rooms' front
(95, 32) only through the gap (95, 34). The right edge is reachable at column 119, the bank of the
canal: feet x up to 1914, which clamps the camera to 1728. The outer ring is solid all round.

The picture below is the layout as the tables draw it, for orientation only — the tables are the
truth. `R` roof, `W` wall, `D` door, `F` fence, `:` path, `~` water, `.` grass, `S` the spawn.

```
FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F...........................................................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...........................................................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...................RRRRRRRRRRRRRRRR........................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...................RRRRRRRRRRRRRRRR........................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...................RRRRRRRRRRRRRRRR........................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...................RRRRRRRRRRRRRRRR........................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...................RRRRRRRRRRRRRRRR........................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...................RRRRRRRRRRRRRRRR........................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...................RRRRRRRRRRRRRRRR........................................................RRRRRRRRRRRRRRRRRRRR........~~~~~~~F
F...................WWWWWWWDWWWWWWWW........................................................WWWWWWWWWDWWWWWWWWWW........~~~~~~~F
F...................::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F...................::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F...................::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F.......................................:::.........................................:::.................................~~~~~~~F
F.......................................:::.........................................:::.FFFFFFFFFFFFFFFF................~~~~~~~F
F.......................................:::.........................................:::.F..............F................~~~~~~~F
F.......................................:::.........................................:::.F.RRRRRRRRRRRR.F................~~~~~~~F
F.......................................:::.........................................:::.F.RRRRRRRRRRRR.F................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.F.RRRRRRRRRRRR.F................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.F.RRRRRRRRRRRR.F................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.F.RRRRRRRRRRRR.F................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.F.WWWWWDWWWWWW.F................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.F..............F................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.F..............F................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.FFFFFFF.FFFFFFFF................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.................................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.................................~~~~~~~F
F.......................................:::.............RRRRRRRRRRRRRRRR............:::.................................~~~~~~~F
F...................RRRRRRRRRRRRRRRR....:::.............RRRRRRRRRRRRRRRR............:::...RRRRRRRRRRRRRRRR..............~~~~~~~F
F...................RRRRRRRRRRRRRRRR....:::.............RRRRRRRRRRRRRRRR............:::...RRRRRRRRRRRRRRRR..............~~~~~~~F
F...................RRRRRRRRRRRRRRRR....:::.............RRRRRRRRRRRRRRRR............:::...RRRRRRRRRRRRRRRR..............~~~~~~~F
F...................RRRRRRRRRRRRRRRR....:::...RRRRRRRR..WDWWWWWWDWWWWWWW............:::...RRRRRRRRRRRRRRRR..............~~~~~~~F
F...................RRRRRRRRRRRRRRRR....:::...RRRRRRRR..::::::::::::::::............:::...RRRRRRRRRRRRRRRR..............~~~~~~~F
F...................RRRRRRRRRRRRRRRR....:::...RRRRRRRR..::::::::::::::::............:::...RRRRRRRRRRRRRRRR..............~~~~~~~F
F...................RRRRRRRRRRRRRRRR....:::...RRRRRRRR..::::::::::::::::............:::...RRRRRRRRRRRRRRRR..............~~~~~~~F
F...................WWWWWWWDWWWWWWWW....:::...WWWDWWWW..::::::::S:::::::............:::...WWWWWWWDWWWWWWWW..............~~~~~~~F
F...................::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F...................::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F...................::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F.......................................................::::::::::::::::................................................~~~~~~~F
F.......................................................::::::::::::::::................................................~~~~~~~F
F.......................................................::::::::::::::::................................................~~~~~~~F
F.............................................................::::......................................................~~~~~~~F
F.............................................................::::......................................................~~~~~~~F
F.............................................................::::......................................................~~~~~~~F
F.............................................................::::......................................................~~~~~~~F
F.............................................................::::......................................................~~~~~~~F
F.............................................................::::......................................................~~~~~~~F
F......................................................RRRRRR.::::......................................................~~~~~~~F
F......................................................RRRRRR.::::......................................................~~~~~~~F
F......................................................RRRRRR.::::......................................................~~~~~~~F
F......................................................WWWDWW.::::......................................................~~~~~~~F
F.............................~~~~~~~~.................:::::::::::......................................................~~~~~~~F
F.............................~~~~~~~~........................::::......................................................~~~~~~~F
F.............................~~~~~~~~..RRRRRRRRRRRRRRRR......::::....RRRRRRRRRRRRRRRR......RRRRRRRRRRRRRRRR............~~~~~~~F
F.............................~~~~~~~~..RRRRRRRRRRRRRRRR......::::....RRRRRRRRRRRRRRRR......RRRRRRRRRRRRRRRR............~~~~~~~F
F.............................~~~~~~~~..RRRRRRRRRRRRRRRR......::::....RRRRRRRRRRRRRRRR......RRRRRRRRRRRRRRRR............~~~~~~~F
F....FFFFFFFFFFFFFFFFFFFF.....~~~~~~~~..RRRRRRRRRRRRRRRR......::::....RRRRRRRRRRRRRRRR......RRRRRRRRRRRRRRRR............~~~~~~~F
F....F::::::::::::::::::F.....~~~~~~~~..RRRRRRRRRRRRRRRR......::::....RRRRRRRRRRRRRRRR......RRRRRRRRRRRRRRRR............~~~~~~~F
F....F::::::::::::::::::F.....~~~~~~~~..RRRRRRRRRRRRRRRR......::::....RRRRRRRRRRRRRRRR......RRRRRRRRRRRRRRRR............~~~~~~~F
F....F::::::::::::::::::F...............RRRRRRRRRRRRRRRR......::::....RRRRRRRRRRRRRRRR......RRRRRRRRRRRRRRRR............~~~~~~~F
F....F::::::::::::::::::F...............WWWWWWWDWWWWWWWW......::::....WWWWWWWDWWWWWWWW......WWWWWWWDWWWWWWWW............~~~~~~~F
F....F::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F....F::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F....F::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F....F::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::............~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....F::::::::::::::::::F...............................................................................................~~~~~~~F
F....FFFFFFFFFFFFFFFFFFFF...............................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
F.......................................................................................................................~~~~~~~F
FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
```

### The loader, rule 13

After the spawn is read (rule 4) and the solid grid is built: the spawn's cell is
(⌊x / 16⌋, ⌊y / 16⌋). The spawn must lie inside the map — 0 ≤ x < 16 × width, 0 ≤ y <
16 × height — and its cell must not be solid. Otherwise, with the file in front:
`spawn (x, y) is outside the map (W x H px)` or `spawn (x, y) is on a solid tile (c, r)`. The
cell, not the box: the loader knows no figure. That the box fits is the campus test's job.

### The test map

`tests/fixtures/maps/test.tmj` is the map of 0003 unchanged except its tileset reference,
`seven-tiles.tsj`; `tests/fixtures/maps/seven-tiles.tsj` is a hand-made tileset of seven 16x16
tiles in one row, `solid` on ids 2–6, image `seven-tiles.png`, 112x16. Fixtures are never
generated from the real content (`testing.md` §6), so the fixture map does not reference the
real tileset.

## Acceptance criteria

1. The game opens on the courtyard: the figure at (1024, 734), the camera at (864, 640), the main
   building's facade with two doors along the top of the screen, grass left and right of it.
2. Walking moves the camera with the figure; away from the edges the sprite stays at screen
   (152, 70) and the box's centre at (160, 90).
3. At every edge and corner of the map the view stops at the map boundary and the figure walks
   toward the screen's edge; nothing outside the map is ever visible: the camera stays within
   [0, 1728] × [0, 1356].
4. No seams between tiles and no shimmering edges while scrolling, at factors 3, 4 and 6.
5. Every region of `world.md` §1 can be reached on foot and identified by its footprint: the
   courtyard, the main building with its two doors, the data protection officer's office, the
   reception, Sales, Marketing, Support, HR, Accounting, Development, the meeting rooms behind
   their fence, the canteen by the pond, the parking lot.
6. Every building is closed: its footprint is solid and its door is a closed-door tile.
7. Camera unit tests pass: centring, all four clamps, the corners, rounding; the state carries
   the camera and survives the JSON round trip.
8. The loader rejects a map whose spawn is on a solid tile, and one whose spawn is outside the
   map, each with its message.
9. The campus test passes: the generator is deterministic and equal to the committed file; the
   map is 128x96; every building's footprint is solid and its doors are door tiles with an open
   cell in front; every door's front cell and the parking lot are reachable from the spawn; the
   outer ring is solid; the spawn's box is free and row 45 is path from column 64 to 71; the
   view's top-left cell at the spawn is grass with nothing on `detail`.
10. CI is green, both smoke runs.

## Test plan

Every number is a pixel unless it says tile or cell.

- `tests/unit/camera.test.ts` — `cameraFor` on a 2048x1536 map:
  - centring: target (1024, 730) gives (864, 640);
  - the four clamps: (100, 730) gives x 0; (2000, 730) gives x 1728; (1024, 50) gives y 0;
    (1024, 1500) gives y 1356;
  - the corners: (0, 0) gives (0, 0); (2048, 1536) gives (1728, 1356);
  - rounding, half up: (1024.4, 730.5) gives (864, 641); (1024.6, 730.4) gives (865, 640);
  - a 320x180 map gives (0, 0) for (160, 90) and for (10, 10); a 320x192 map gives (0, 12) for
    (300, 191);
  - `VIEW_WIDTH` is 320 and `VIEW_HEIGHT` 180, and the renderer's surface constants equal them.
- `tests/unit/state.test.ts` extended — on a 128x96 grass map with the spawn at (1024, 734):
  the initial state's camera is (864, 640); after 60 steps right the player's x is 1104 and the
  camera's x is 944; the round-trip state includes the camera; `followPlayer` on a 20x12 map
  yields (0, 12) at the spawn (136, 120), (0, 0) for feet at (160, 94) and (0, 12) for feet at
  (300, 191).
- `tests/unit/draw-map.test.ts` rewritten for `drawLayer` with a camera — on a 40x30 map whose
  `ground` is all grass:
  - camera (0, 0) draws columns 0–19 and rows 0–11, the first at (0, 0), the last at (304, 176);
  - camera (8, 8) draws columns 0–20 and rows 0–11, the first at (−8, −8);
  - camera (15, 15) draws columns 0–20 and rows 0–12, 273 cells;
  - camera (320, 300) — the far corner of a 640x480 map — draws columns 20–39 and rows 18–29,
    the first at (0, −12), the last at (304, 164);
  - empty cells are skipped, and `detail` draws only its own cells.
- `tests/unit/draw-scene.test.ts` extended — with camera (5, 7) the sprite for feet (20.4, 30.6)
  is drawn at (7, 0) and the tiles shift by (−5, −7); the draw order is unchanged.
- `tests/unit/tiled.test.ts` extended — rejects `tests/fixtures/maps/spawn-on-solid.tmj` (a
  20x12 map on `fixture-tiles.tsj`, one solid tile at (1, 2), the spawn at (24, 40)) with
  `tests/fixtures/maps/spawn-on-solid.tmj: spawn (24, 40) is on a solid tile (1, 2)`; rejects
  the corridor fixture with its spawn moved to (330, 40) with `… spawn (330, 40) is outside the
  map (320x192 px)`; a spawn on the last pixel row, y = 191, is inside.
- `tests/unit/test-map.test.ts` — on the moved fixture, minus the assertion that it references
  the placeholder tileset.
- `tests/unit/campus.test.ts` — acceptance criterion 9, one `it` per clause, the map loaded from
  `public/maps/campus.tmj` through `parseTileset` and `parseTileMap` with the real placeholder
  tileset; the regions from `tools/campus-layout.ts`.
- Smoke spec — the top-left pixel is grass as before; the player starts at x = 1024 and the
  camera at (864, 640); one second of ArrowRight leaves x ≥ 1094, the camera's x ≥ 934 and the
  facing right.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not maximized.
The campus: the figure starts in the courtyard below the main building; the wide paths lead west,
east and south from it, and a path circles the main building to the north avenue.

1. Open `http://localhost:5173`.
2. Expected: the figure stands on a beige courtyard; along the top of the screen a grey facade
   with two dark doors, red roof above it; grass left and right of the courtyard; the whole
   screen is map.
3. Hold `D` for two seconds.
4. Expected: the courtyard scrolls left under the figure, the figure stays in the middle of the
   screen, the courtyard's right edge and the grass beyond come into view.
5. Walk to the top-left corner of the campus: left along the wide path, up the path west of the
   main building, left along the north avenue, then up and left over the grass.
6. Expected: the view stops at the map's edge before the figure does; the figure walks into the
   screen's top-left corner, up to the fence; no dark area appears beyond the fence.
7. Walk to the bottom-right corner: back to the courtyard, down the south path, right along the
   south-east avenue, then right and down over the grass to the canal.
8. Expected: the same at the bottom and the right: the fence along the bottom, the canal and the
   fence along the right, the figure at the canal's bank near the screen's corner.
9. While scrolling, watch the tile edges.
10. Expected: no flicker, no thin lines between tiles, no jitter of the figure against the tiles.
11. Press `F` for fullscreen and scroll; leave fullscreen with `F`, shrink the window to about
    1000x600 and scroll again.
12. Expected: still no flicker, lines or jitter, at factor 6 and at factor 3.
13. Walk the campus and find each region: the parking lot, the canteen by the pond, the
    reception, the main building with its two doors, the data protection officer's office, the
    fenced meeting rooms behind Sales, Sales, Marketing, Support, HR, Accounting, Development.
14. Expected: all are found without help, and every door is closed: the figure stops at it.

**Feel:** Does the campus read as a company's grounds in placeholder tiles? Which region is
hardest to identify? Does the map feel large enough to explore — or too large to walk —
crossing it from fence to fence takes about 25 seconds?

**Result:** not yet walked.

## Open questions

None.
