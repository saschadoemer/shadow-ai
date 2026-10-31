# 0003 — Tile map

**Status:** draft
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

A map authored in Tiled renders on the surface from generated placeholder tiles, with the three
draw layers in order. The loader refuses maps that break the rules. The test pattern of 0002 is
gone; the game shows a place.

## Scope

**In:**

- `tools/gen-tiles.ts`, run with `npm run gen-tiles`: writes `public/tiles/placeholder.png` and
  `public/tiles/placeholder.tsj` deterministically. Seven tile kinds, ids 0–6: grass, path, wall,
  water, fence, door-closed, roof. `solid` is true for wall, water, fence, door-closed and roof.
  Each tile is a flat palette colour with a simple two-colour pattern (grass dither, path speckle,
  wall bricks, water waves, fence posts on transparent, door frame, roof shingles).
- `src/engine/tiled.ts`: loads a `.tmj` and its external `.tsj`; reads the tile layers `ground`,
  `detail`, `above`, the object layer `objects` and its point object `spawn`; builds a solid grid
  from the tileset property; rejects anything else (see behaviour)
- `src/engine/assets.ts`: loads JSON and images from the game's own origin
- `Renderer.drawTile(image, tileId, x, y)` and the Canvas 2D implementation
- `public/maps/test.tmj`: a 20x12 map (320x192 px) made in Tiled, using all seven kinds, with a
  `spawn` in the open, a wall block, a pond, a fence line, one closed door in a wall, and a roof
  patch whose lower edge lies on `above`
- draw order per frame: `ground`, `detail`, `above`; the camera is fixed at the top-left corner
- the asset test of 0001 now has real files to check

**Out, explicitly:** the player (0004) · collision (0005) · a moving camera and the campus
(0006) · any tile beyond the seven.

## Behaviour

- The loader rejects, with a message that names the problem: a tile layer with a name outside
  the fixed set; a missing `objects` layer or a missing `spawn`; a tileset whose tile size is not
  16; a map smaller than 320x180 px; an external tileset that cannot be loaded.
- Tile ids in the map are Tiled's global ids; the loader maps them to tileset ids. Id 0 in a
  layer means empty and draws nothing.
- `gen-tiles` run twice produces byte-identical files. Running it is part of `npm run check` in
  verify mode: the committed files must equal a fresh generation.

## Acceptance criteria

1. `npm run dev` shows the test map: grass with a path, a wall block, a pond, a fence line, a
   closed door, a roof patch.
2. The roof's lower edge is drawn from `above` (visible because it is drawn last; the effect
   matters from 0004 on).
3. `npm run gen-tiles` twice in a row leaves `git status` clean.
4. The asset test passes on `public/tiles/placeholder.png` and reports its 16-px alignment.
5. Loader tests reject the four fixture maps with the expected messages.
6. CI is green.

## Test plan

- `tests/unit/tiled.test.ts` — loads `tests/fixtures/corridor.tmj` and checks the solid grid;
  rejects `unknown-layer.tmj`, `no-spawn.tmj`, `tile-32.tmj` and `too-small.tmj` (INV-7).
- `tests/unit/gen-tiles.test.ts` — generation is deterministic and matches the committed files.
- Assets test, now non-vacuous.
- Smoke spec unchanged.
- Fixtures: the five maps above, hand-made in Tiled, each the smallest that proves its point.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080.

1. Open `http://localhost:5173`.
2. Expected: a tile map replaces the checkerboard — mostly grass, with a path crossing it.
3. Look for each of: a grey wall block, a blue pond, a brown fence line, one dark door in the
   wall, a red-brown roof patch.
4. Expected: all five are present and distinguishable at a glance.
5. Resize the window to about 1000x600.
6. Expected: the map scales down crisply; tile edges stay sharp.
7. In a terminal run `npm run gen-tiles` twice, then `git status`.
8. Expected: no changes.
9. Open `public/tiles/placeholder.png` in an image viewer.
10. Expected: seven 16x16 tiles in one row, in the order grass, path, wall, water, fence, door,
    roof.

**Feel:** Do the placeholder tiles read as what they are without a legend? Which one is least
clear?

**Result:** pass or fail per step.

## Open questions

None.
