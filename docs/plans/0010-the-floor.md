# 0010 — Implementation plan: the floor

**Spec:** [`docs/features/0010-the-floor.md`](../features/0010-the-floor.md) (approved
2026-11-13). The plan argues from the spec; where they differ, the spec wins. Read the spec
first, then `CLAUDE.md`, then `docs/spec/architecture.md` §1, §6 and §7, `docs/spec/testing.md`
§1–§3, §5 and §6, and `docs/spec/world.md` §1. **Written:** 2026-11-13 on the planning model. A
working document, not specification: once the feature is implemented, what is durable lives in
`docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The layout
numbers in the spec — tile counts, posts, reachability, the spawn's view — come from a model
the planning session ran on 2026-11-13; the collision numbers were worked out by hand. If a
test disagrees with its number, read the spec's "Behaviour" again and redo the arithmetic
before touching either side; if the spec and the number really disagree, stop and ask. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Goal:** the campus is replaced by one office floor. Tiles are solid in boxes, so a wall is a
4 px strip; the placeholder tileset holds thirteen office tiles; `public/maps/floor.tmj`,
108x80 tiles, is generated from `tools/floor-layout.ts`; the snippets stand in and before
Sales; the specification speaks of the floor.

**Approach:** bottom up, each task green on its own. First the tileset parser learns boxes
while the map still reduces them to one boolean per cell (T1). Then the map, the resolver and
the sight line move to boxes (T2) — the game still shows the campus, unchanged, because every
campus tile is solid or open as a whole. Then the tileset and the map are swapped in one task
(T3), because the campus cannot be drawn with the office tiles. Then the smoke spec (T4), the
documents (T5), the full check with the container (T6), the walk (T7) and the pull request
(T8).

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- No new dependency, runtime or development.
- `src/engine/` imports nothing from the project; `src/game/` imports only `src/engine/`
  (INV-2). `tests/arch/` scans the source text of `src/game/`, comments included, for the words
  `window`, `document`, `HTMLCanvasElement`, `Image` and `fetch` as whole words — the new
  outer-wall tile is a "window" only in `tools/`, `tests/` and the documents, never in a
  comment under `src/game/`.
- The map is content, not state: `GameState` does not change in this feature (INV-1).
- INV-6: `public/tiles/placeholder.png` uses only Endesga 32, alpha 0 or 255, and never
  `#68386c`.
- INV-7: `solid` and the collision rectangles are both properties of the tile in the tileset.
  No code names a tile id to decide what is solid.
- `src/engine/tiled.ts` is run by Node for `tools/`: erasable TypeScript only — no `enum`, no
  parameter properties, no namespaces.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on, `verbatimModuleSyntax` forces `import type`. Run
  `npx biome check --write .` before `npm run check`.
- `npm run check` is typecheck, Biome, build, Vitest. `npm run test:e2e` runs the smoke spec
  against the dev server; with `BASE_URL` set it runs against that URL.
- Fixtures are hand-made and committed, never generated (`testing.md` §6).
- Branch `feature/0010-the-floor`, this worktree; it carries the spec, its approval and this
  plan. The planning session merged `main` at 44f02d4 (feature 0009, overview) into it on
  2026-11-13; before Task 1, merge `main` again if it has moved (`CLAUDE.md` §4). Commit messages: imperative
  subject, a body with the why, and the `Co-Authored-By` trailer the session's own attribution
  reminder names. Commits are signed through 1Password, which fails inside the Bash sandbox:
  run `git commit` with the sandbox disabled.
- Feature specs and plans 0001–0009 are history and are not edited, whatever they say about
  the campus.

## Design notes

- **One box type.** `Box` — `{ x, y, width, height }`, half-open — moves from
  `engine/collision.ts` to `engine/tiled.ts`, because the loader produces boxes and
  `collision.ts` already imports from `tiled.ts`. `collision.ts` re-exports the type, so no
  importer changes.
- **Tile-local in the tileset, map pixels in the map.** `Tileset.boxes[id]` holds boxes inside
  [0, 16)²; `TileMap.solids[cell]` holds the same boxes moved by the cell's origin. The
  resolver then needs no cell arithmetic beyond finding the cells a box touches.
- **A cell's boxes may overlap** (the corner tile's two strips do). Nothing depends on them
  being disjoint.
- **The resolver's rule does not change, only what it collects.** Today: the solid cells the
  moved box overlaps; now: the solid boxes it overlaps. Flush is still min of near edges or max
  of far edges.
- **Walls live on `ground`.** A wall tile is its floor with the strip drawn in; `detail` and
  `above` are absent from the map. That is why the floor has eight wall tiles instead of four.
- **Posts are derived, not listed.** The generator places a post where the rule of the spec
  says; the test asserts the three cells.
- **Overview (0009) rides along.** Its code reads the map only through `moveBox`,
  `sightBlocked` and `TileMap.points`, so it needs no change beyond the tests' maps taking
  `solids`. The floor carries its `wake` point, now inside the data protection officer's
  office; creatures carry `home`.
- **The flood is a test helper.** Reachability over a 2 px lattice of feet positions lives in
  `tests/unit/flood.ts`; the engine gets nothing it does not use at run time.

## File map

| File | Change |
|---|---|
| `src/engine/tiled.ts` | `Box`; `Tileset.boxes`; collision rectangles and their four rejections (T1); `TileMap.solids`; rule 13 on boxes (T2) |
| `src/engine/collision.ts` | `SolidGrid.solids`; `moveBox` and `sightBlocked` on boxes; `Box` re-exported (T2) |
| `tests/unit/solids.ts` | new: `solidsOf(flags, width)` — full boxes from booleans (T2) |
| `tests/unit/grass-map.ts`, `picture-map.ts` | `solids` (T2) |
| `tests/fixtures/maps/boxes.tsj`, `shape-ellipse.tsj`, `shape-rotated.tsj`, `shape-outside.tsj`, `shape-fraction.tsj`, `solid-and-shape.tsj` | new (T1) |
| `tests/fixtures/maps/thin-walls.tmj`, `thin-walls-spawn-in-strip.tmj` | new (T2) |
| `tools/placeholder-tiles.ts`, `public/tiles/placeholder.png`, `placeholder.tsj` | thirteen office tiles (T3) |
| `tools/floor-layout.ts`, `tools/gen-floor.ts`, `public/maps/floor.tmj` | new (T3) |
| `tools/campus-layout.ts`, `tools/gen-campus.ts`, `public/maps/campus.tmj`, `tests/unit/campus.test.ts` | removed (T3) |
| `tests/unit/flood.ts`, `tests/unit/floor.test.ts` | new (T3) |
| `src/main.ts`, `package.json` | `MAP_URL`, `gen-floor` (T3) |
| `tests/e2e/smoke.spec.ts` | the floor's numbers (T4) |
| `CLAUDE.md`, `docs/spec/*.md`, `README.md`, `docs/features/README.md` | as built (T5) |

Tests: `tiled.test.ts` (T1, T2), `test-map.test.ts` (T1, T2), `collision.test.ts`,
`creature.test.ts`, `player.test.ts`, `overview.test.ts`, `state.test.ts`, `draw-map.test.ts`,
`draw-scene.test.ts` (T2), `gen-tiles.test.ts`,
`floor.test.ts` (T3).

---

### Task 1: Boxes in the tileset

**Files:** modify `src/engine/tiled.ts`, `src/engine/collision.ts` (the `Box` move only),
`tests/unit/tiled.test.ts`, `tests/unit/test-map.test.ts`; create the six `.tsj` fixtures.

**Interfaces — produces:**

```ts
/** Half-open: covers [x, x + width) × [y, y + height). */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Tileset {
  readonly image: string;
  readonly columns: number;
  readonly tileCount: number;
  /** Index: tile id. The tile's solid boxes in tile-local pixels; [] is an open tile. */
  readonly boxes: readonly (readonly Box[])[];
}
```

`Tileset.solid` is removed. In this task `parseTileMap` still builds `TileMap.solid`, one
boolean per cell: true when any of the cell's three tiles has at least one box.

- [ ] **Step 1: the fixtures.** Hand-write `tests/fixtures/maps/boxes.tsj`: `columns` 4,
  `tilecount` 4, `image` `boxes.png` (never loaded), `imagewidth` 64, `imageheight` 16, tile
  size 16. Tile 0 has no entry. Tile 1 has `solid: true`. Tile 2 has one rectangle
  (0, 0, 16, 4). Tile 3 has two rectangles, (0, 0, 16, 4) and (0, 0, 4, 16). A collision
  rectangle is written the way Tiled 1.11 writes it:

```json
{
 "id":2,
 "objectgroup":
    {
     "draworder":"index",
     "id":2,
     "name":"",
     "objects":[
            {
             "height":4,
             "id":1,
             "name":"",
             "rotation":0,
             "type":"",
             "visible":true,
             "width":16,
             "x":0,
             "y":0
            }],
     "opacity":1,
     "type":"objectgroup",
     "visible":true,
     "x":0,
     "y":0
    }
}
```

  The five bad tilesets are copies of `boxes.tsj` with tile 2 changed: `shape-ellipse.tsj` adds
  `"ellipse":true` to the object; `shape-rotated.tsj` sets `"rotation":90`;
  `shape-outside.tsj` makes the rectangle (8, 0, 12, 4); `shape-fraction.tsj` makes it
  (0, 0.5, 16, 4); `solid-and-shape.tsj` adds the `solid` property to tile 2.
- [ ] **Step 2: the failing tests.** In `tiled.test.ts`: `boxes.tsj` parses to `boxes` equal to
  `[[], [{ x: 0, y: 0, width: 16, height: 16 }], [{ x: 0, y: 0, width: 16, height: 4 }],
  [{ x: 0, y: 0, width: 16, height: 4 }, { x: 0, y: 0, width: 4, height: 16 }]]`; the five bad
  files are rejected with, after the file and a colon: `tile 2 has a collision shape that is
  not a rectangle`; `tile 2 has a rotated collision shape`; `tile 2 has a collision shape
  (8, 0, 12, 4) that is not whole pixels inside the tile`; `tile 2 has a collision shape
  (0, 0.5, 16, 4) that is not whole pixels inside the tile`; `tile 2 is solid and has collision
  shapes; only one of the two is allowed`. One in-memory case each for a point, a polygon, a
  polyline, a text and a tile object (`gid`), a zero width, a negative x. The two existing
  assertions on `tileset.solid` (`tiled.test.ts` lines 23 and 58, `test-map.test.ts` line 31)
  become assertions on `boxes`: a solid tile is `[FULL]`, an open one `[]`.
- [ ] **Step 3: run** `npx vitest run tests/unit/tiled.test.ts` — fails.
- [ ] **Step 4: implement.** Move `Box` to `tiled.ts`; in `collision.ts` replace the interface
  by `export type { Box } from './tiled';` plus the import it needs. In `parseTileset`, per
  tile entry: `solid` as today; the shapes from `tile.objectgroup` (absent → none; otherwise an
  object with an `objects` array). An object is not a rectangle when `ellipse === true`,
  `point === true`, or any of `polygon`, `polyline`, `text`, `gid` is present. Its rotation is
  `rotation ?? 0`. It is "whole pixels inside the tile" when x, y, width and height are
  integers, width ≥ 1, height ≥ 1, x ≥ 0, y ≥ 0, x + width ≤ 16 and y + height ≤ 16. Check in
  this order: not a rectangle, rotated, not whole pixels inside, then solid-and-shape for the
  tile. `boxes[id]` is `[FULL]` for a solid tile, the shapes for a tile with shapes, else one
  shared empty array. In `parseTileMap`, `isSolid(id)` becomes
  `(tileset.boxes[id]?.length ?? 0) > 0`.
- [ ] **Step 5: run** the two test files — green. `npm run check`.
- [ ] **Step 6: commit** — `Read collision rectangles from the tileset`; why: a wall thinner
  than a tile needs a tile that is solid in part, and INV-7 wants that part to be the tile's
  own property, edited in Tiled.

---

### Task 2: Boxes in the map, the resolver and the sight line

**Files:** modify `src/engine/tiled.ts`, `src/engine/collision.ts`, `tests/unit/grass-map.ts`,
`tests/unit/picture-map.ts`, `tests/unit/collision.test.ts`, `tiled.test.ts`,
`test-map.test.ts`, `creature.test.ts`, `draw-map.test.ts`, `draw-scene.test.ts`, and the
comments in `src/game/player.ts` and `creature.ts` that say "solid cell" or "solid grid";
create `tests/unit/solids.ts`, `tests/fixtures/maps/thin-walls.tmj`,
`thin-walls-spawn-in-strip.tmj`.

**Interfaces — produces:**

```ts
// tiled.ts
export interface TileMap {
  // … as before, and instead of `solid`:
  /** Row-major, width × height: the solid boxes of the cell's tiles on the three layers, in map pixels. */
  readonly solids: readonly (readonly Box[])[];
}

// collision.ts
export interface SolidGrid {
  readonly width: number;
  readonly height: number;
  readonly solids: readonly (readonly Box[])[];
}

// tests/unit/solids.ts
/** One full 16x16 box, in map pixels, for every true flag; row-major, `width` cells per row. */
export function solidsOf(flags: readonly boolean[], width: number): Box[][];
```

- [ ] **Step 1: the helper and the fixtures.** `solids.ts` as above. `picture-map.ts` builds
  `solids` with it; `grass-map.ts` fills `solids` with empty arrays. `thin-walls.tmj`: 20x12
  on `boxes.tsj`, `ground` all tile 0 (gid 1) except tile 2 (gid 3) at cell (1, 2), an
  `objects` layer with the spawn at (24, 40). `thin-walls-spawn-in-strip.tmj`: the same with
  the spawn at (24, 34).
- [ ] **Step 2: the failing tests.**
  - `collision.test.ts`: the literal `solid: [...]` grids become `solids: solidsOf([...], w)`;
    `corridor.solid` against `GRID.solid` becomes `solids` against `solids`. Append a
    `describe('boxes thinner than a cell (0010)')` with exactly the cases of the spec's test
    plan, first bullet — the 10x10 grid with (80, 48, 4, 16) in cell (5, 3) and
    (32, 96, 16, 4) in cell (2, 6); a second grid for the post (48, 48, 4, 4) in cell (3, 3); a
    third for the doorway, (16, 128, 16, 4) in cell (1, 8) and (64, 128, 16, 4) in cell (4, 8).
    Build these grids by hand: an array of 100 empty arrays with the boxes put at their cells.
  - `tiled.test.ts`: `map.solid[...]` becomes the length of `map.solids[...]`, the count of
    solid cells `map.solids.filter((boxes) => boxes.length > 0)`; `thin-walls.tmj` gives
    `solids[cell(1, 2)]` equal to `[{ x: 16, y: 32, width: 16, height: 4 }]` and loads; the
    second fixture is rejected with `…: spawn (24, 34) is on a solid tile (1, 2)`.
    `test-map.test.ts` follows the same way.
  - `creature.test.ts`: a snippet whose body point lies in the cone with the box
    (x, y, 4, 16) of a left strip on the line from the figure's box centre is not lit; without
    the box it is. Take the positions of the existing wall-in-the-light test and replace its
    solid cell by a strip inside that cell.
  - `player.test.ts`: beside 0009's "a wall holds the push", the spec's case: feet (144, 92),
    `recoil: { dx: 3, dy: 0, steps: 8 }`, a grass map with the box (160, 80, 4, 16) put into
    `solids` at cell (10, 5); after 8 steps the feet are at (154, 92).
  - `draw-map.test.ts`, `draw-scene.test.ts`, `overview.test.ts`, `state.test.ts` and every
    other `TileMap` or `SolidGrid` literal `tsc` names take `solids`.
- [ ] **Step 3: run** `npx vitest run` — fails to compile on `solids`.
- [ ] **Step 4: implement.**

```ts
// collision.ts — the heart of it
function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** The solid boxes the box overlaps: those of every cell it touches, cells outside the grid being open. */
function overlappedSolids(box: Box, grid: SolidGrid): Box[] {
  const [firstColumn, lastColumn] = cellRange(box.x, box.x + box.width);
  const [firstRow, lastRow] = cellRange(box.y, box.y + box.height);
  const hits: Box[] = [];
  for (let row = Math.max(0, firstRow); row <= Math.min(grid.height - 1, lastRow); row += 1) {
    for (let column = Math.max(0, firstColumn); column <= Math.min(grid.width - 1, lastColumn); column += 1) {
      for (const solid of grid.solids[row * grid.width + column] ?? []) {
        if (overlaps(box, solid)) {
          hits.push(solid);
        }
      }
    }
  }
  return hits;
}
```

  `moveBox`: after the move on X, `x = dx > 0 ? min(hit.x) − box.width : max(hit.x +
  hit.width)`; the same on Y with `y` and `height`. `sightBlocked`: a sample point (x, y) is
  blocked when a box of the cell (⌊x / 16⌋, ⌊y / 16⌋) contains it, half-open; cells outside the
  grid are open. The file's header comment says boxes and "below 4 px per call". In
  `parseTileMap`, `solids[index]` is the three tiles' boxes, each moved by
  (16 × column, 16 × row), or one shared empty array; `checkPosition` fails when a box of the
  point's cell contains the point.
- [ ] **Step 5: run** — green. `npm run check`. Start `npm run dev` and look: the campus is
  unchanged, walls stop the figure as before.
- [ ] **Step 6: commit** — `Collide with boxes instead of whole cells`; why: the resolver, the
  sight line and the spawn check have to agree on what a thin wall covers before a map may use
  one.

---

### Task 3: The office tileset and the floor map

One commit: the campus cannot be drawn with the office tiles, so tileset and map change
together.

**Files:** rewrite `tools/placeholder-tiles.ts`; `git mv tools/campus-layout.ts
tools/floor-layout.ts` and rewrite its data; `git mv tools/gen-campus.ts tools/gen-floor.ts`
(`encodeFloor`, the path); `git rm public/maps/campus.tmj tests/unit/campus.test.ts`; create
`tests/unit/flood.ts`, `tests/unit/floor.test.ts`; modify `tests/unit/gen-tiles.test.ts`,
`package.json` (`gen-floor` replaces `gen-campus`), `src/main.ts` (`MAP_URL =
'/maps/floor.tmj'`).

**Interfaces — produces**, in `tools/placeholder-tiles.ts`:

```ts
export interface TileKind {
  readonly id: number;
  readonly name: string;
  /** The whole tile is solid: the `solid` property in the .tsj. */
  readonly solid: boolean;
  /** Collision rectangles in tile-local pixels, for a tile that is solid in part. */
  readonly boxes: readonly Box[];
}
export const CARPET = 0, CORRIDOR = 1, OUTER_WALL = 2, WINDOW = 3;
export const WALL_TOP = 4, WALL_LEFT = 5, WALL_CORNER = 6, WALL_POST = 7; // on carpet
export const CORRIDOR_WALLS = 4; // id of a wall tile on corridor = its carpet id + 4
export const DOOR_CLOSED = 12;
export const SHEET_WIDTH = 208, SHEET_HEIGHT = 16;
```

(Written as separate `export const` lines; Biome forbids the comma form.) `tilesetJson()`
writes a tile entry for ids 2–12: `properties` with `solid` for 2 and 3, an `objectgroup` as
in Task 1's fixture for 4–12, object ids counting from 1, the group's `id` 2.

And in `tools/floor-layout.ts`, the tables of the spec as data — copy them from here:

```ts
export const FLOOR_WIDTH = 108;
export const FLOOR_HEIGHT = 80;

export const CORRIDORS: readonly Area[] = [
  { name: 'north corridor', cells: cells(1, 106, 20, 25) },
  { name: 'south corridor', cells: cells(1, 106, 52, 57) },
  { name: 'west corridor', cells: cells(23, 28, 26, 51) },
  { name: 'east corridor', cells: cells(73, 78, 26, 51) },
  { name: 'side passage', cells: cells(85, 88, 1, 19) },
];

export const ROOMS: readonly Area[] = [
  { name: 'hr', cells: cells(1, 21, 1, 19) },
  { name: 'accounting', cells: cells(22, 43, 1, 19) },
  { name: 'development', cells: cells(44, 84, 1, 19) },
  { name: 'meeting room north', cells: cells(89, 106, 1, 9) },
  { name: 'meeting room south', cells: cells(89, 106, 10, 19) },
  { name: "data protection officer's office", cells: cells(1, 22, 26, 37) },
  { name: 'reception', cells: cells(1, 22, 38, 51) },
  { name: 'break room', cells: cells(29, 48, 26, 51) },
  { name: 'lift', cells: cells(49, 60, 26, 51) },
  { name: 'stairwell', cells: cells(61, 72, 26, 51) },
  { name: 'sales', cells: cells(79, 106, 26, 51) },
  { name: 'marketing', cells: cells(1, 48, 58, 78) },
  { name: 'support', cells: cells(49, 106, 58, 78) },
];

/** A top strip on the cells (from..to, row), minus the openings (columns). */
export interface HorizontalWall {
  readonly row: number;
  readonly from: number;
  readonly to: number;
  readonly openings: readonly number[];
}
/** A left strip on the cells (column, from..to), minus the openings (rows). */
export interface VerticalWall {
  readonly column: number;
  readonly from: number;
  readonly to: number;
  readonly openings: readonly number[];
}

export const HORIZONTAL_WALLS: readonly HorizontalWall[] = [
  { row: 20, from: 1, to: 106, openings: [10, 11, 12, 31, 32, 33, 63, 64, 65, 85, 86, 87, 88] },
  { row: 26, from: 1, to: 22, openings: [] },
  { row: 26, from: 29, to: 72, openings: [] },
  { row: 26, from: 79, to: 106, openings: [] },
  { row: 52, from: 1, to: 22, openings: [] },
  { row: 52, from: 29, to: 72, openings: [] },
  { row: 52, from: 79, to: 106, openings: [] },
  { row: 58, from: 1, to: 106, openings: [23, 24, 25, 77, 78, 79] },
  { row: 38, from: 1, to: 22, openings: [] },
  { row: 10, from: 89, to: 106, openings: [] },
];

export const VERTICAL_WALLS: readonly VerticalWall[] = [
  { column: 22, from: 1, to: 19, openings: [] },
  { column: 44, from: 1, to: 19, openings: [] },
  { column: 85, from: 1, to: 19, openings: [] },
  { column: 89, from: 1, to: 19, openings: [4, 5, 6, 14, 15, 16] },
  { column: 23, from: 26, to: 51, openings: [30, 31, 32, 42, 43, 44, 45, 46] },
  { column: 29, from: 26, to: 51, openings: [37, 38, 39] },
  { column: 49, from: 26, to: 51, openings: [] },
  { column: 61, from: 26, to: 51, openings: [] },
  { column: 73, from: 26, to: 51, openings: [] },
  { column: 79, from: 26, to: 51, openings: [37, 38, 39] },
  { column: 49, from: 58, to: 78, openings: [] },
];

/** Closed doors, in the wall of row 52: the lift, the stairwell. They replace the wall tile. */
export const CLOSED_DOORS: readonly Point[] = [
  { x: 54, y: 52 },
  { x: 55, y: 52 },
  { x: 66, y: 52 },
  { x: 67, y: 52 },
];

/** The posts the rule must yield; the layout derives them, the test compares. */
export const POSTS: readonly Point[] = [
  { x: 85, y: 20 },
  { x: 23, y: 52 },
  { x: 73, y: 52 },
];

/** Tile (16, 44), in the reception, level with its opening. */
export const SPAWN: Point = { x: 256, y: 718 };

/** Tiles (76, 38), (88, 32), (98, 44): before the Sales doorway, and two in Sales. */
export const SNIPPETS: readonly Point[] = [
  { x: 1224, y: 622 },
  { x: 1416, y: 526 },
  { x: 1576, y: 718 },
];

/** Where the figure wakes (0009): the middle of tile (18, 31), in the data protection officer's office. */
export const WAKE: Point = { x: 296, y: 504 };
```

`buildGround(): number[]` builds the one tile layer, in this order: every cell carpet; the
corridors' cells corridor; two boolean grids `top` and `left` from the walls; then per interior
cell: both → corner, `top` → top, `left` → left, neither but `top` at (c − 1, r) and `left` at
(c, r − 1) → post, each on the cell's own floor (carpet id, or carpet id + 4 on corridor); the
closed doors over their wall tiles — throw if one is not a top wall on corridor; last the
ring: `WINDOW` where the spec's rule says, else `OUTER_WALL`. `floorJson()` returns the map
with two layers, `ground` (id 1) and `objects` (id 2), `nextlayerid` 3, and the points as in the campus file: the spawn (id 1), the three snippets
(ids 2–4), `wake` (id 5), `nextobjectid` 6.

- [ ] **Step 1: the tileset test first.** `gen-tiles.test.ts`: deterministic and equal to the
  committed files, as today; 208x16, thirteen tiles; `tilesetJson()` has `columns` 13,
  `tilecount` 13, `imagewidth` 208; `solid` on ids 2 and 3 only; the boxes of ids 4–12 as the
  spec's table; pixel (0, 0) of ids 0 and 1 is the base colour; for ids 4–11 the set of pixels
  coloured `#262b44` or `#3a4466` is exactly the union of the tile's boxes, and for id 12 the
  set coloured `#733e39` or `#3e2731`; every other pixel of ids 4–12 equals the same pixel of
  its floor tile; no pixel is `#68386c`; every pixel is opaque.
- [ ] **Step 2: the tiles.** Rewrite the kinds and patterns from the spec's table. Carpet takes
  the scatter points of the old grass, corridor those of the old path, the outer wall the old
  brick joints. Window: `#3a4466` where x or y is 0, 1, 14 or 15, else `#2ce8f5`. A wall tile:
  its floor's pixel, unless the pixel lies in a box — then `#262b44`, or `#3a4466` on the
  strip's inner line (y = 3 for a top strip, x = 3 for a left strip); where the two strips of
  a corner overlap, and in the post, `#262b44`. The door: corridor, the strip `#733e39` with
  the row y = 3 `#3e2731`. `npm run gen-tiles`; the tileset test is green; `assets.test.ts`
  still passes.
- [ ] **Step 3: the flood helper.** `tests/unit/flood.ts`:
  `reachableFeet(map: SolidGrid, from: Point): (feet: Point) => boolean`. Feet positions are
  the even pixel coordinates; a position is free when the box [x − 6, x + 6) × [y − 8, y) lies
  inside the map and overlaps no box of the cells it touches; the flood is four-connected in
  steps of 2 px from `from`, over a `Uint8Array` of (width × 8) × (height × 8) entries, with an
  explicit stack. It throws when `from` is not free. A cell (c, r) is probed at its feet point
  (16c + 8, 16r + 14).
- [ ] **Step 4: the floor test.** `tests/unit/floor.test.ts`, one `it` per clause of the
  spec's test plan for `floor.test.ts`, in its order, the map loaded from
  `public/maps/floor.tmj` through `parseTileset` and `parseTileMap`. The eleven tile counts
  come from counting `map.ground`. For "with strips added" build a copy of the map's `solids`
  with the box (16c, 320, 16, 4) appended at the cells (85, 20)–(88, 20) and flood that. The wake
  point: `map.points` is the three snippets then `{ name: 'wake', x: 296, y: 504 }`; the box
  [290, 302) × [496, 504) is free; the feet point is reached; cell (18, 31) lies in the
  office's rectangle; `cameraFor({ x: 296, y: 500 }, { width: 1728, height: 1280 })` is
  (136, 410). "None
  in the first view": no snippet inside [96, 416) × [624, 804), and none within 64 px of the
  spawn. Run it: fails, there is no floor.
- [ ] **Step 5: the layout and the generator.** As above; `npm run gen-floor`; remove the
  campus files; `package.json`; `main.ts`. The floor test is green.
- [ ] **Step 6: sweep.** `tests/unit/camera.test.ts` and `state.test.ts` keep their numbers;
  their comments say "a 128x96 map" instead of "the campus". `grep -rni campus src tools tests
  public package.json` returns nothing.
- [ ] **Step 7:** `npm run check`. Start `npm run dev` and look: the figure stands in the
  reception, walls are thin lines, the corridor is beige. The smoke spec is red until Task 4.
- [ ] **Step 8: commit** — `Replace the campus by an office floor`; why: the grounds were too
  far from a classic office to show as an interim state; the floor is rooms and corridors
  behind thin walls.

---

### Task 4: The smoke spec

**Files:** `tests/e2e/smoke.spec.ts`.

- [ ] **Step 1:** the corner pixel is `[0x8b, 0x9b, 0xb4, 255]`, its message naming carpet at
  tile (6, 39); the spawn x is 256 in the three places that wait for it; the camera
  `{ x: 96, y: 624 }`; after one second right `x ≥ 326` and camera `x ≥ 166`, the comment
  saying row 44 is free to x = 458; the lamp test holds x = 256; the last test is "the floor
  starts with three snippets and nothing captured", its first creature
  `{ species: 'snippet', x: 1224, y: 622, light: 0, home: { x: 1224, y: 622 } }`. The overview
  test of 0009 stays as it is. No comment says "campus".
- [ ] **Step 2:** `npm run test:e2e` — green.
- [ ] **Step 3: commit** — `Point the smoke spec at the floor`; why: the spawn, the camera and
  the first creature moved with the map.

---

### Task 5: The documents

Every change the spec lists under "The specification, changed in the open". Write what is
built, in the present tense, in the documents' own style.

- [ ] `CLAUDE.md` — INV-7's second sentence: "Whether a tile is solid, and which part of it,
  is a property of the tile in the tileset — not a separate collision layer, not code." §7:
  `world.md` covers "the floor and its regions, …".
- [ ] `docs/spec/world.md` — the title line: "The floor, its regions, …". §1 becomes "The
  floor": the overworld is one floor of the company's office building, seen from above; an
  outer wall with windows, a ring of four corridors round a core, the departments as rooms
  behind thin walls with doorways; Management on the top floor and the server room in the
  basement are their own maps, reached later through the lift and the stairwell in the core,
  both closed today. "The map as built (feature 0010)": 108x80 tiles, 1728x1280 px, generated
  from `tools/floor-layout.ts` until the art pass; where each room lies, in three sentences;
  the tables in `docs/features/0010-the-floor.md` are the layout until the art pass; the
  sentence about waking reads: "The figure wakes in the data protection officer's office, at
  the map's `wake` point, tile (18, 31) (features 0009, 0010)." The
  region table: Courtyard becomes **Reception** ("The hub. The player starts here; the data
  protection officer's office is next door, the ring of corridors leads to every
  department."); Canteen becomes **Break room**; **Parking lot** is removed; Management reads
  "(top floor, through the lift)"; Server room "(basement, through the stairwell)"; Meeting
  rooms "Found, not on the way: off a side passage." The shadow-density paragraph stays. §3:
  the data protection officer's office is "beside the reception"; the intern sits "in the
  break room", a stuck player "goes to the break room". §4: three snippets stand on the floor,
  "one in the east corridor in front of the Sales doorway, two in Sales".
- [ ] `docs/spec/vision.md` lines 13, 65, 66, 78 and `gameplay.md` lines 58 and 80 — campus →
  floor, courtyard → reception, canteen → break room, the sentences otherwise unchanged.
- [ ] `docs/spec/architecture.md` — §1 the directory tree (`floor.tmj`, `floor-layout.ts`,
  `gen-floor.ts`) and "collision of a box against solid boxes"; §6: a tile is solid as a whole
  through `solid` or in part through collision rectangles, the loader builds `solids` from
  both, the four tileset rejections, rule 13 on boxes, the floor file; §7: the thirteen tiles
  with their ids and boxes, the wall-on-the-edge rule, the floor generator and its test, the
  retirement at the art pass.
- [ ] `docs/spec/testing.md` — §1 Unit: the resolver against boxes thinner than a cell, the
  floor map against its generator and the spec's layout; Smoke: carpet `#8b9bb4`, x = 256,
  camera (96, 624), "the floor starts with three snippets". §2 INV-7: the solid boxes as the
  union of the three layers, and the four tileset rejections. §6: the new fixtures; "a change
  to the floor map".
- [ ] `docs/spec/visual.md` — only if a sentence names the campus tiles; §3 gains one
  sentence: interior walls are strips 4 px thick on a tile's top or left edge.
- [ ] `docs/plan.md` §4 M3 — no change needed; check that it still agrees.
- [ ] `README.md` — the status paragraph (the figure wakes "in the data protection officer's
  office"), `npm run gen-floor`, the Tiled paragraph.
- [ ] `grep -rni "campus\|courtyard\|canteen\|parking" CLAUDE.md README.md docs/spec` returns
  nothing. `docs/plan.md`, `docs/features/` and `docs/plans/` are not swept.
- [ ] `npm run check`; **commit** — `Describe the floor in the specification`; why: the spec
  is the source of truth and the campus no longer exists.

---

### Task 6: The full check

- [ ] `npm run check`, `npm run test:e2e`.
- [ ] Build and run the container as `docs/spec/ops.md` §3 says, then
  `BASE_URL=http://localhost:<port> npm run test:e2e`.
- [ ] Report failures as failures. Nothing is committed in this task unless something was
  fixed.

---

### Task 7: The acceptance walk

`CLAUDE.md` §3.4 and `docs/spec/testing.md` §5. Start `npm run dev`, state the preconditions
of the spec's acceptance plan in one message, wait for the author. Then one action step with
its expected step per message, 1–24, in the spec's words; record each answer as given. A
`fail` ends the walk: fix on the branch or ask, rerun Task 6, start again at step 1. After
step 24 the five feel questions, one per message. Then write the `Result` line —
`passed YYYY-MM-DD, steps 1–24`, followed by the feel notes — and commit it:
`Record the acceptance walk of 0010`.

The feel answers matter beyond this feature: 0011 furnishes these rooms. If the author would
change a room's size, a corridor's width or a doorway, that is a new draft or a revision of
0011's tables before its approval — not a change on this branch after a passed walk.

---

### Task 8: The pull request

`CLAUDE.md` §3.5. Merge `main` into the branch; rerun Task 6; if the merge changed code, run
Task 7 again. Set `Status: implemented` with the date in the spec and in the table of
`docs/features/README.md` and commit that on the branch — the status travels with the pull
request. Open the pull request against `main`: title `Feature 0010: the floor`; the
description says what was built, quotes the `Result` line, and ends with the attribution line
the session's reminder names. Bind it with the app's PR tools and read CI; CI must be green.
The author merges.

## Self-review against the spec

- Scope "In": boxes in the collision → T1, T2; the tileset → T3; the floor map, its generator,
  the removals → T3; the snippets → T3 data, T4; the smoke spec → T4; the specification → T5.
  Scope "Out": nothing here adds furniture, an `above` layer, `low`, glass, opening doors, a
  second map, shadow walls, overview, figures or a swept test.
- Behaviour "Boxes" → T1 (tileset, four rejections), T2 (map, `moveBox`, `sightBlocked`,
  rule 13). "The tileset" → T3 steps 1–2. "The floor" → T3 data and `buildGround`; posts,
  closed doors, counts, spawn, first view, snippets, reachability → T3 step 4.
- Acceptance criteria: 1 → T3, T4, walk 1–2; 2 → T2, walk 3–12; 3 and 4 → T3 floor test, walk
  5–6 and 13–16; 5 → T3 floor test, walk 13–14; 6 → T3, walk 17–18; 7 → walk 19–20; 8 → T2
  creature and player tests, T3 wake point, walk 21–24; 9 → T1, T2; 10 → T3 step 6, T5; 11 → T8.
- Test plan: `collision.test.ts` → T2; `tiled.test.ts` → T1, T2; `player`, `creature`,
  `state`, the helpers → T2; `gen-tiles.test.ts` → T3; `floor.test.ts` → T3; `camera`,
  `state` comments → T3; smoke → T4.

## Decisions by the planning session

Readings the spec leaves to the implementation, decided on 2026-11-13 so that the work does
not stop. None changes what the author sees in the walk.

1. **`Box` lives in `engine/tiled.ts`** and is re-exported from `engine/collision.ts`.
2. **`Tileset.solid` is removed, not kept beside `boxes`.** One truth; a solid tile is the
   tile whose boxes are the one full box.
3. **Boxes in `TileMap.solids` are in map pixels;** cells without a box share one empty array.
4. **The order of the tileset's checks** is: not a rectangle, rotated, not whole pixels
   inside, solid-and-shape.
5. **The spec's `thin-walls.tmj` with two spawns is two files,** `thin-walls.tmj` and
   `thin-walls-spawn-in-strip.tmj`, because a fixture is one map.
6. **The corridor wall tiles are the carpet ones plus 4,** so the generator picks a tile by
   shape and floor without a table.
7. **`POSTS` is exported data the test compares against the derived posts;** the generator
   does not read it.
8. **The flood lives in `tests/unit/flood.ts`,** not in the engine.
9. **Task 3 is one commit,** tileset and map together, because no state between them is green.

## Questions for the author

None.
