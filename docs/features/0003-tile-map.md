# 0003 — Tile map

**Status:** implemented 2026-11-02
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

A map authored in Tiled renders on the surface from generated placeholder tiles, with the three
draw layers in order. The loader refuses maps that break the rules. The test pattern of 0002 is
gone; the game shows a place.

## Scope

**In:**

- `tools/gen-tiles.ts`, run with `npm run gen-tiles`: writes `public/tiles/placeholder.png`
  (112x16, seven 16x16 tiles in one row) and `public/tiles/placeholder.tsj` deterministically.
  Seven tile kinds, ids 0–6, each a base colour with a two-colour pattern; pixel (0, 0) of every
  tile is its base colour:

  | Id | Kind | Base | Second | Pattern | `solid` |
  |---|---|---|---|---|---|
  | 0 | grass | `#63c74d` | `#3e8948` | sparse dither | no |
  | 1 | path | `#e8b796` | `#c28569` | speckle | no |
  | 2 | wall | `#8b9bb4` | `#5a6988` | brick joints | yes |
  | 3 | water | `#0099db` | `#2ce8f5` | wave lines | yes |
  | 4 | fence | `#b86f50` | `#733e39` | posts and rails on transparent | yes |
  | 5 | door-closed | `#733e39` | `#3e2731` | frame and panel | yes |
  | 6 | roof | `#be4a2f` | `#a22633` | shingle rows | yes |

- `src/engine/tiled.ts`: a pure function from the parsed JSON of a `.tmj` and of its one
  external `.tsj` to a `TileMap` — width and height in tiles, the cells of `ground`, `detail`
  and `above` as tileset ids or empty, the `spawn` position in pixels, and the solid grid — or
  an error that names the problem (see behaviour)
- `src/engine/assets.ts`: `loadJson(url)` and `loadImage(url)` from the game's own origin;
  relative paths are resolved against the file that references them
- `Renderer.drawTile(tileset, id, x, y)`: draws tile `id` of a loaded tileset — the decoded
  image and its column count — with its top-left corner at (x, y); the Canvas 2D implementation
- `src/render/draw-map.ts`: draws a `TileMap` layer by layer, `ground`, `detail`, `above`,
  skipping empty cells, cell (column, row) at (column × 16, row × 16); the camera is fixed at
  the top-left corner until 0006
- `public/maps/test.tmj`: a 20x12 map (320x192 px) in Tiled's JSON format, referencing
  `../tiles/placeholder.tsj`, with the layout below
- `main.ts` loads the map, its tileset and its image before the loop starts and draws the map
  each frame; `src/render/test-pattern.ts` and `tests/unit/pattern.test.ts` are deleted
- the asset test gains the `.tsj`-against-PNG check that `testing.md` §1 already names
- `tsconfig.json` gains `allowImportingTsExtensions`, so `tools/` can import `src/` with `.ts`
  extensions and Node 26 runs the generator without a transpiler
- with the implementation: `architecture.md` §6 and §7 carry the loader rules and the tileset
  check, `testing.md` §1 and §2 the new tests and the smoke change, the README its status

**Out, explicitly:** the player (0004) · collision (0005) · a moving camera, a map id in
`GameState` and the campus (0006) · any tile beyond the seven · flipped or rotated tiles,
animated tiles, more than one tileset per map, embedded tilesets, base64 or compressed layer
data, infinite maps — each rejected by the loader; the feature that needs one lifts the rule.

## Behaviour

### The test map

Tile coordinates are (column, row), 0-based, column 0–19, row 0–11. Everything not listed is
grass on `ground` and empty on `detail` and `above`.

| Element | Layer | Tiles |
|---|---|---|
| path | `ground` | row 6, columns 0–19; column 9, rows 0–11 |
| roof patch | `ground` | columns 2–5, rows 1–2 |
| roof patch, lower edge | `above` | columns 2–5, row 3 — grass on `ground` beneath |
| wall ring | `ground` | the border of columns 12–16, rows 1–4; the interior (columns 13–15, rows 2–3) is grass |
| doorway | `ground` | (14, 4) is grass: a one-tile opening in the ring |
| closed door | `ground` | (12, 2), in the ring's left side |
| pond | `ground` | columns 3–6, rows 8–10 |
| fence line | `detail` | row 9, columns 11–18 |
| spawn | `objects` | a point object named `spawn` at pixel (136, 120): tile (8, 7), in the open |

The map is 192 px high so that the surface is covered: 11 rows would leave a 4-px strip. With
the camera fixed, the surface shows rows 0–11 and clips row 11 to 4 px; the rest of the map
becomes visible with 0006. Tile (0, 0) is grass with nothing above it, so the surface's top-left
pixel is `#63c74d`; the smoke test reads it.

### Files and paths

`test.tmj` references its tileset as `../tiles/placeholder.tsj`; the `.tsj` references its
image as `placeholder.png`. The loader resolves each relative path against the file that
contains it, so the three files load from `/maps/test.tmj`, `/tiles/placeholder.tsj` and
`/tiles/placeholder.png` — the game's own origin (INV-5). The map is content, not state
(`architecture.md` §2): `GameState` does not change in this feature. Loading finishes before the
first frame; until then the page shows its background. A loading or parsing error stops the
game before it starts and names the problem in the console; nothing is drawn.

### What the loader reads

Of the map: `orientation`, `infinite`, `width`, `height`, `tilewidth`, `tileheight`,
`tilesets` and `layers`. Of a layer: `name`, `type`, `data`, `encoding`, `compression` and, for the object
layer, `objects` with `name`, `point`, `x`, `y`. Of the
tileset: `tilewidth`, `tileheight`, `columns`, `tilecount`, `image` and, per tile, the boolean
property `solid`. Everything else Tiled writes — `visible`, `opacity`, offsets, tint,
`properties` on the map — is ignored; a layer hidden in Tiled is drawn by the game.

### Rules

- Tile ids in layer data are Tiled's global ids; local id = gid − `firstgid`. Gid 0 means
  empty: it draws nothing and is not solid.
- A cell of the solid grid is solid when `ground`, `detail` or `above` holds a tile whose
  `solid` is true; the union, so that 0005 has one grid to ask.
- `ground` and `objects` are required; `detail` and `above` are optional; a layer name appears
  at most once.
- The loader rejects, with a message that names the file and the problem:
  1. a layer whose name is not `ground`, `detail`, `above` or `objects`, whatever its type
  2. a layer whose type does not match its name: `objects` must be an object layer, the other
     three tile layers
  3. a missing `ground` layer, a missing `objects` layer, or a layer name used twice
  4. no point object named `spawn` in `objects`, or more than one
  5. a map or tileset whose tile size is not 16x16
  6. a map smaller than 320x180 px: fewer than 20 columns or fewer than 12 rows
  7. `infinite: true`, or layer data with an `encoding` or `compression` set — only Tiled's
     default, CSV, where `data` is an array of numbers; a `data` whose length is not the
     map's `width × height`
  8. a gid with any of Tiled's four flag bits set (`0x80000000`, `0x40000000`, `0x20000000`,
     `0x10000000`): flipped or rotated tiles are not supported
  9. a gid outside the tileset: above `firstgid + tilecount − 1`
  10. not exactly one tileset, an embedded tileset (no `source`), a `source` that does not end in
      `.tsj`, or an external tileset or image that cannot be loaded
  11. `orientation` other than `orthogonal`
  12. a tileset tile with an `animation`: animated tiles are not supported
- `gen-tiles` run twice produces byte-identical files; the PNG carries no timestamp. A unit test
  generates in memory and compares with the committed files, so `npm run check` fails when the
  committed files and the generator disagree.
- The `.tsj` the generator writes is a Tiled tileset: `tilewidth` and `tileheight` 16,
  `columns` 7, `tilecount` 7, `image` `placeholder.png`, `imagewidth` 112, `imageheight` 16,
  and a `solid` property of type `bool` on tiles 2–6.
- The asset layer checks every `.tsj` under `public/tiles/` against its PNG: `imagewidth` and
  `imageheight` equal the PNG's size, `tilewidth` and `tileheight` are 16, `columns` equals
  `imagewidth / 16`, and `tilecount` equals `columns × imageheight / 16`.

## Acceptance criteria

1. `npm run dev` shows the test map: grass with a path crossing, a roof patch, a wall ring with
   a doorway and a closed door, a pond, a fence line.
2. The roof's lower edge is drawn from `above`, last; the effect becomes visible with 0004.
3. The surface's top-left pixel is `#63c74d`.
4. `npm run gen-tiles` twice in a row leaves `git status` clean.
5. The asset tests pass on `public/tiles/placeholder.png` and `public/tiles/placeholder.tsj`,
   including the `.tsj`-against-PNG check, and that check fails on a mismatching pair.
6. Loader tests accept the corridor fixture — size, cells, spawn, solid grid — and reject every
   case of rules 1–12 with a message that names the problem.
7. `public/maps/test.tmj` opens in Tiled with its four layers and its tileset, and the map Tiled
   shows is the map the game shows.
8. The smoke test no longer asserts the border colour or a changing picture; it asserts the
   canvas size at the full factor and criterion 3.
9. CI is green.

## Test plan

- `tests/unit/tiled.test.ts` — parses `tests/fixtures/maps/corridor.tmj` with
  `tests/fixtures/maps/fixture-tiles.tsj` (two tiles: floor, wall with `solid`) and checks width,
  height, the cells of each layer, the spawn position and the solid grid (INV-7). Rejects the
  fixtures `unknown-layer.tmj`, `no-spawn.tmj`, `tile-32.tmj` with `fixture-tiles-32.tsj`, and
  `too-small.tmj`; the remaining cases of rules 1–12 are in-memory variants of the corridor —
  each case asserts the message.
- `tests/unit/gen-tiles.test.ts` — generation in memory is byte-identical on two runs and equal
  to the committed PNG and `.tsj`; the PNG is 112x16; pixel (0, 0) of each tile is its base
  colour; `solid` is set on exactly tiles 2–6.
- `tests/unit/draw-map.test.ts` — with a recording fake renderer on a small in-memory
  `TileMap`: layer order `ground`, `detail`, `above`; empty cells draw nothing; cell (c, r) is
  drawn at (16c, 16r).
- `tests/unit/assets.test.ts` — the `.tsj`-against-PNG check over `public/tiles/`, with a
  negative case on an in-memory tileset whose `tilecount` does not match.
- `tests/unit/pattern.test.ts` — deleted with the pattern.
- `tests/e2e/smoke.spec.ts` — canvas 1280x720 at Playwright's page area, unclipped; the
  top-left pixel is `#63c74d`. The "picture changes" assertion is dropped and returns in 0004 as
  "one second of `ArrowRight` moves the player"; `testing.md` §1 says so.
- Fixtures under `tests/fixtures/maps/`: the five maps and the two tilesets above, each the
  smallest that proves its point, in Tiled's JSON format. The fixtures reference their own
  tileset JSON, never the generated one (`testing.md` §6); the parser needs no image.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not
maximized; Tiled 1.10 or newer installed; a terminal in the repository root on the feature
branch.

1. Open `http://localhost:5173`.
2. Expected: a tile map replaces the checkerboard — green grass with a sand-coloured path
   running across the middle and a second one running top to bottom left of centre.
3. Look for each of: a red-brown roof patch at the top left; a grey wall ring at the top right
   with an opening at the bottom and one dark door in its left side; a blue pond at the bottom
   left; a brown fence line at the bottom right.
4. Expected: all four are present and distinguishable at a glance, and the lowest tile row is
   cut to a thin strip.
5. Drag the window's corner to make the page about 1000x600.
6. Expected: the map scales down in whole steps; tile edges stay sharp; nothing blurs.
7. Press `F`.
8. Expected: fullscreen; the map fills the screen edge to edge, still sharp.
9. Press `F`.
10. Expected: back to the window at the size of step 6.
11. In the terminal run `npm run gen-tiles`, then again, then `git status`.
12. Expected: no changes.
13. Open `public/tiles/placeholder.png` in an image viewer.
14. Expected: seven 16x16 tiles in one row, in the order grass, path, wall, water, fence, door,
    roof.
15. Open `public/maps/test.tmj` in Tiled.
16. Expected: it opens without a warning; the layers panel lists `ground`, `detail`, `above`
    and `objects`; the tilesets panel shows `placeholder` with seven tiles; the map looks like
    step 2; the `spawn` point sits on grass below and left of the path crossing.
17. In Tiled choose File → Save.
18. In the terminal run `git status`.
19. Expected: clean, or `public/maps/test.tmj` is the only change and differs only in Tiled's
    own formatting.
20. Reload the browser tab.
21. Expected: the map looks exactly like step 2. If step 19 showed a change, the saved file is
    committed on the branch as the authored map.

**Feel:** Do the placeholder tiles read as what they are without a legend? Which one is least
clear? Does the 4-px strip at the bottom bother you?

**Result:** pass or fail per step.

## Open questions

None.
