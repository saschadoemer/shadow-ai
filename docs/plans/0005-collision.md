# 0005 — Implementation plan: collision

**Spec:** [`docs/features/0005-collision.md`](../features/0005-collision.md) (approved 2026-11-04).
The plan argues from the spec; where they differ, the spec wins. Read the spec first, then
`CLAUDE.md`, then `docs/spec/architecture.md` §1, §2 and §6, `docs/spec/testing.md` §1–§3 and
§5, and `docs/spec/visual.md` §3.
**Written:** 2026-11-04 on the planning model. A working document, not specification: once the
feature is implemented, what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. Every
expected number below was checked on 2026-11-04 against a simulation of the spec's rules; if a
test disagrees with its number, the implementation is wrong, not the number — read the spec's
"Resolving a step" again before touching the test.

**Goal:** solid tiles stop the figure, flush, and the figure slides along them: a generic box
resolver in `src/engine/collision.ts`, used by `src/game/player.ts` for a 12x8 box under the
feet, pinned by unit tests on an in-memory picture of the corridor fixture and on the fixture
itself; the smoke spec is untouched.

**Approach:** two pure functions and their tests, then the paperwork. The resolver is tested on
boxes and a grid, in pixels, with no player in sight; the player test proves the box sits where
the spec says and that the clamp still follows. Nothing in `src/render/`, `src/main.ts`, the
loop, the input or the assets changes. The acceptance run is a Playwright script, because the
app's browser pane cannot hold a key down.

## Global constraints

- No new dependency, runtime or development.
- `src/game/` touches no browser (INV-2). `tests/arch/` scans the source text of `src/game/`,
  comments included, for the words `window`, `document`, `HTMLCanvasElement`, `Image` and
  `fetch` as whole words, case-sensitive. A comment in `player.ts` says "picture" or "sprite",
  never "image" with a capital I, and never "the window".
- `src/engine/` imports nothing from outside `src/engine/`: `collision.ts` imports `TILE_SIZE`
  and `Point` from `./tiled` and nothing else. `src/game/player.ts` imports the resolver from
  `../engine/collision` (`architecture.md` §1: `game/` imports the math, constants and types of
  `engine/`).
- `GameState` does not change (INV-1): the player is still `{ x, y, facing, frame, frameTimer }`,
  and `tests/unit/state.test.ts` is untouched. The box is derived from the feet position when a
  step needs it; it is never stored.
- No literal text a player can read (INV-4): the picture-map helper's errors are test-only
  messages, in `tests/`.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on, `verbatimModuleSyntax` forces `import type`. `npm run
  lint` is `biome check .`; `npx biome check --write .` sorts imports and formats.
  `noUncheckedIndexedAccess` is why `isSolid` compares with `=== true` and `pictureMap`
  destructures the first row.
- `npm run check` is typecheck, Biome, build, Vitest, in that order. `npm run test:e2e` runs the
  smoke spec against the dev server, which Playwright starts; with `BASE_URL` set it runs against
  that URL and starts nothing.
- Branch `feature/0005-collision` (this worktree); it already carries the revised spec, its
  approval and this plan. Commit messages: imperative subject, a body with the why, and the
  trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Design notes

- **The resolver is a box against a grid, nothing more.** `moveBox(box, dx, dy, grid)` takes a
  `Box` — top-left corner, width, height, in pixels — a displacement and a `SolidGrid`, and
  returns the box's new top-left corner as a `Point`. `SolidGrid` is `{ width, height, solid }`
  in cells and row-major booleans; a `TileMap` has exactly these members, so `player.ts` passes
  the map and TypeScript's structural typing does the rest. The engine knows no feet, no sprite
  and no clamp.
- **Half-open intervals, cell ranges by floor and ceil.** The box covers `[x, x + width)` and
  `[y, y + height)`; cell `(c, r)` covers `[16c, 16c + 16) × [16r, 16r + 16)`. The columns a
  box touches are `⌊x / 16⌋` to `⌈(x + width) / 16⌉ − 1`, the rows likewise. With `x + width`
  exactly on a cell edge, `⌈·⌉ − 1` stops one cell short, so touching is not overlapping. That
  one `Math.ceil` is the whole reason a figure stops at distance 0 and then slides freely; do not
  replace it with `Math.floor((x + width − 1) / 16)`, which is wrong for fractional positions.
- **Per axis: move, collect, snap.** On X, if `dx !== 0`: add `dx`, collect the solid cells the
  moved box overlaps, and if there are any, set the right edge to the smallest left edge among
  them (`dx > 0`) or the left edge to the largest right edge among them (`dx < 0`). Then Y with
  top and bottom edges, against the box at its new x. An axis with `dx === 0` is not touched, so
  a box already inside a solid cell and standing still stays there — the spec says so, and the
  loader of 0006 is where a bad spawn is caught. Cells outside the grid are open; the clamp in
  `player.ts` keeps the figure on the map.
- **Why X first, and what it means at a corner.** Each axis is checked against the cells the box
  overlaps after that axis moved, so a diagonal into a corner is caught by whichever axis
  actually overlaps the cell. When both do — the box left of a tile, rows overlapping, moving
  up-right — X is snapped first, the box then touches the tile on its right, and Y moves freely:
  the figure slides up the tile's left face. The three corner tests in Task 1 pin exactly this.
- **The player's box is the lowest 8 px of the sprite, 12 px wide.** With feet at `(x, y)`:
  `{ x: x − 6, y: y − 8, width: 12, height: 8 }`. `collisionBox(player)` is exported from
  `player.ts` because 0006 centres the camera on this box. After `moveBox`, the feet are
  `box.x + 6` and `box.y + 8`, and the 0004 clamp is applied to them, so the step is: vector →
  `moveBox` → clamp → facing and walk cycle from the vector, as the spec orders it. "Moving" is
  still the vector, so a figure held by a wall steps in place and faces its input, exactly like
  one held by the clamp.
- **Exact where the arithmetic is exact, close where it is not.** A snapped edge is an integer
  (`16c − 12`, `16c + 16`, `16r − 8`, `16r + 16`) and the feet derived from it are integers, so
  those assertions use `toBe` and `toStrictEqual`. A diagonal step adds `0.94280…`, so positions
  that include one use `toBeCloseTo(value, 2)` — within 0.005, tighter than the spec's ± 0.01 —
  with the value written to three decimals. `30 × 1.3333…` is `40` within floating-point noise,
  so "through the gap" uses `toBeCloseTo(180, 6)`.
- **The picture is the fixture.** `tests/unit/picture-map.ts` builds a `TileMap` from rows of `#`
  and `.` and exports `CORRIDOR`, the picture of `tests/fixtures/maps/corridor.tmj`'s solid grid.
  One test loads the fixture through `parseTileset` and `parseTileMap` and asserts its `solid`
  array equals the picture's, so the picture and the fixture cannot drift apart, and one more
  runs the gap case on the loaded fixture, which proves the resolver reads the grid the loader
  builds (INV-7). Every other test reads the picture, so a failure prints a wall you can see.

## File map

| File | Responsibility |
|---|---|
| `src/engine/collision.ts` | `Box`, `SolidGrid`, `moveBox(box, dx, dy, grid)` (new) |
| `src/game/player.ts` | `BOX_WIDTH`, `BOX_HEIGHT`, `collisionBox(player)`; `stepPlayer` resolves against the map before the clamp |
| `tests/unit/picture-map.ts` | `pictureMap(rows, spawn)`, `CORRIDOR` (new) |
| `tests/unit/collision.test.ts` | the resolver: flush stops, touching, sliding, corners, the gap, no movement, outside the grid, the loaded fixture (new) |
| `tests/unit/player.test.ts` | `walk` takes a map; a new `describe` for solid tiles |
| `docs/spec/architecture.md` | §2: the collision box and the step order |
| `docs/spec/testing.md` | §1: the resolver and the player's collision in the Unit row |
| `README.md` | status: walls stop the figure (0005); the camera is 0006 |

---

### Task 1: The resolver

**Files:**
- Create: `src/engine/collision.ts`, `tests/unit/picture-map.ts`, `tests/unit/collision.test.ts`

**Interfaces — produces:**

```ts
// src/engine/collision.ts
/**
 * An axis-aligned box against a grid of solid cells (architecture.md §1, feature 0005). The box
 * moves on X, then on Y; on each axis it is snapped flush to the solid cell it would enter.
 * Intervals are half-open, so a box whose edge lies exactly on a cell's edge does not overlap
 * that cell: a box flush against a wall slides along it. Cells outside the grid are open; the
 * map edge is the caller's business. The displacement is assumed to be below one cell per call
 * — this is not a swept test.
 */
import { type Point, TILE_SIZE } from './tiled';

export interface Box {
  /** The top-left corner, in pixels. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** What the resolver asks of a map: its size in cells and the row-major solid grid. A TileMap is one. */
export interface SolidGrid {
  readonly width: number;
  readonly height: number;
  readonly solid: readonly boolean[];
}

function isSolid(grid: SolidGrid, column: number, row: number): boolean {
  if (column < 0 || row < 0 || column >= grid.width || row >= grid.height) {
    return false;
  }
  return grid.solid[row * grid.width + column] === true;
}

/** The first and last cell an interval [from, to) touches: ⌊from / 16⌋ to ⌈to / 16⌉ − 1. */
function cellRange(from: number, to: number): readonly [number, number] {
  return [Math.floor(from / TILE_SIZE), Math.ceil(to / TILE_SIZE) - 1];
}

/** The solid cells the box overlaps, as (column, row). */
function overlappedSolidCells(box: Box, grid: SolidGrid): Point[] {
  const [firstColumn, lastColumn] = cellRange(box.x, box.x + box.width);
  const [firstRow, lastRow] = cellRange(box.y, box.y + box.height);
  const cells: Point[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      if (isSolid(grid, column, row)) {
        cells.push({ x: column, y: row });
      }
    }
  }
  return cells;
}

/**
 * Moves the box by (dx, dy): X first, then Y. On each axis the box is moved back flush against
 * the nearest solid cell it overlaps afterwards — for a positive displacement its far edge goes
 * to the smallest near edge among them, for a negative one the other way round. An axis with
 * no displacement is not resolved. Returns the new top-left corner.
 */
export function moveBox(box: Box, dx: number, dy: number, grid: SolidGrid): Point {
  let { x, y } = box;
  if (dx !== 0) {
    x += dx;
    const hits = overlappedSolidCells({ ...box, x, y }, grid);
    if (hits.length > 0) {
      x =
        dx > 0
          ? Math.min(...hits.map((cell) => cell.x)) * TILE_SIZE - box.width
          : (Math.max(...hits.map((cell) => cell.x)) + 1) * TILE_SIZE;
    }
  }
  if (dy !== 0) {
    y += dy;
    const hits = overlappedSolidCells({ ...box, x, y }, grid);
    if (hits.length > 0) {
      y =
        dy > 0
          ? Math.min(...hits.map((cell) => cell.y)) * TILE_SIZE - box.height
          : (Math.max(...hits.map((cell) => cell.y)) + 1) * TILE_SIZE;
    }
  }
  return { x, y };
}
```

The two axis blocks are the same shape; keep them as written rather than folding them into one
helper that takes an axis name — two plain blocks read better than one clever one, and the test
tells them apart.

```ts
// tests/unit/picture-map.ts
import { EMPTY, type Point, type TileMap } from '../../src/engine/tiled';

/**
 * The solid grid of tests/fixtures/maps/corridor.tmj as a picture: a wall in column 10 with a
 * one-tile gap in row 6, a lone tile at (4, 3) and one at (2, 2). collision.test.ts asserts that
 * the loaded fixture and this picture agree.
 */
export const CORRIDOR: readonly string[] = [
  '....................',
  '....................',
  '..#.......#.........',
  '....#.....#.........',
  '..........#.........',
  '..........#.........',
  '....................',
  '..........#.........',
  '..........#.........',
  '..........#.........',
  '....................',
  '....................',
];

/**
 * An in-memory map from a picture, one string per row: `#` is a solid cell, `.` an open one.
 * `ground` is all grass (id 0) and `detail` and `above` are empty, so only `solid` carries the
 * picture — a test that needs walls shows them.
 */
export function pictureMap(rows: readonly string[], spawn: Point): TileMap {
  const [first] = rows;
  if (first === undefined) {
    throw new Error('a picture needs at least one row');
  }
  const width = first.length;
  const solid: boolean[] = [];
  for (const [index, row] of rows.entries()) {
    if (row.length !== width) {
      throw new Error(`row ${index} has ${row.length} cells; ${width} are required`);
    }
    for (const cell of row) {
      if (cell !== '#' && cell !== '.') {
        throw new Error(`row ${index} has "${cell}"; only # and . are allowed`);
      }
      solid.push(cell === '#');
    }
  }
  const cells = width * rows.length;
  return {
    width,
    height: rows.length,
    ground: new Array<number>(cells).fill(0),
    detail: new Array<number>(cells).fill(EMPTY),
    above: new Array<number>(cells).fill(EMPTY),
    spawn,
    solid,
  };
}
```

- [ ] **Step 1: write the failing tests** `tests/unit/collision.test.ts`. The numbers are the
  spec's test plan, one `it` per line of it:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Box, moveBox, type SolidGrid } from '../../src/engine/collision';
import { parseTileMap, parseTileset } from '../../src/engine/tiled';
import { CORRIDOR, pictureMap } from './picture-map';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The corridor picture in pixels: the wall in column 10 spans x [160, 176); the lone tile at
 * (4, 3) spans [64, 80) × [48, 64); the gap in row 6 spans y [96, 112).
 */
const GRID = pictureMap(CORRIDOR, { x: 40, y: 56 });

/** The figure's box, 12x8, named by its top-left corner. */
function box(x: number, y: number): Box {
  return { x, y, width: 12, height: 8 };
}

/** Where the box ends up, as [x, y]. */
function moved(from: Box, dx: number, dy: number, grid: SolidGrid = GRID): [number, number] {
  const to = moveBox(from, dx, dy, grid);
  return [to.x, to.y];
}

/** Twenty moves of (2, 0) from (148, 100): through the gap when the grid is the corridor. */
function throughTheGap(grid: SolidGrid): [number, number] {
  let current = box(148, 100);
  for (let i = 0; i < 20; i += 1) {
    current = { ...current, ...moveBox(current, 2, 0, grid) };
  }
  return [current.x, current.y];
}

describe('moveBox: stopping flush against a solid cell', () => {
  it("moving right ends with the right edge at the cell's left edge", () => {
    expect(moved(box(147, 64), 2, 0)).toStrictEqual([148, 64]);
  });

  it("moving left ends with the left edge at the cell's right edge", () => {
    expect(moved(box(177, 64), -2, 0)).toStrictEqual([176, 64]);
  });

  it("moving down ends with the bottom edge at the cell's top edge", () => {
    expect(moved(box(66, 39), 0, 2)).toStrictEqual([66, 40]);
  });

  it("moving up ends with the top edge at the cell's bottom edge", () => {
    expect(moved(box(66, 65), 0, -2)).toStrictEqual([66, 64]);
  });

  it('snaps a larger displacement the same way', () => {
    expect(moved(box(147, 64), 10, 0)).toStrictEqual([148, 64]);
  });
});

describe('moveBox: touching is not overlapping', () => {
  it('moves freely along a wall it is flush against', () => {
    expect(moved(box(148, 64), 0, 2)).toStrictEqual([148, 66]);
  });

  it('stays flush when pushed into the wall', () => {
    expect(moved(box(148, 64), 2, 0)).toStrictEqual([148, 64]);
  });

  it('keeps the free component of a diagonal: the slide', () => {
    const to = moveBox(box(148, 64), 0.943, 0.943, GRID);
    expect(to.x).toBe(148);
    expect(to.y).toBeCloseTo(64.943, 6);
  });
});

describe('moveBox: corners do not snag', () => {
  it('from below-left, moving up-right: full x, stopped on y', () => {
    expect(moved(box(51, 65), 2, -2)).toStrictEqual([53, 64]);
  });

  it('from above-right, moving down-left: full x, stopped on y', () => {
    expect(moved(box(81, 39), -2, 2)).toStrictEqual([79, 40]);
  });

  it('from the left with overlapping rows, moving up-right: stopped on x, full y', () => {
    expect(moved(box(51, 60), 2, -2)).toStrictEqual([52, 58]);
  });
});

describe('moveBox: the gap, standing still and the grid edge', () => {
  it('passes a one-tile gap', () => {
    expect(throughTheGap(GRID)).toStrictEqual([188, 100]);
  });

  it('is stopped when the box also covers the row above the gap', () => {
    expect(moved(box(148, 94), 2, 0)).toStrictEqual([148, 94]);
  });

  it('resolves nothing without movement, even inside a solid cell', () => {
    expect(moved(box(66, 52), 0, 0)).toStrictEqual([66, 52]);
  });

  it('treats cells outside the grid as open', () => {
    expect(moved(box(1, 64), -2, 0)).toStrictEqual([-1, 64]);
    expect(moved(box(308, 64), 2, 0)).toStrictEqual([310, 64]);
  });

  it('leaves its input unchanged', () => {
    const from = box(147, 64);
    moveBox(from, 2, 0, GRID);
    expect(from).toStrictEqual(box(147, 64));
  });
});

describe('moveBox on the loaded corridor fixture', () => {
  const FIXTURES = 'tests/fixtures/maps';
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(join(ROOT, FIXTURES, name), 'utf8'));
  const tileset = parseTileset(read('fixture-tiles.tsj'), `${FIXTURES}/fixture-tiles.tsj`);
  const corridor = parseTileMap(read('corridor.tmj'), tileset, `${FIXTURES}/corridor.tmj`);

  it('has the solid grid the picture draws', () => {
    expect(corridor.solid).toStrictEqual(GRID.solid);
  });

  it('reads the loaded grid: through the gap, stopped above it', () => {
    expect(throughTheGap(corridor)).toStrictEqual([188, 100]);
    expect(moved(box(148, 94), 2, 0, corridor)).toStrictEqual([148, 94]);
  });
});
```

- [ ] **Step 2: run it, see it fail** (`npx vitest run tests/unit/collision.test.ts`): modules
  missing.
- [ ] **Step 3: write** `tests/unit/picture-map.ts` and `src/engine/collision.ts` as above.
- [ ] **Step 4: see the tests pass.** If "from the left with overlapping rows" gives `[53, 58]`,
  the X check is reading the rows of the box before the move or ignoring them — it must use the
  box's current `y`. If "moves freely along a wall it is flush against" gives `[148, 64]`, the
  column range includes the touched cell — check the `Math.ceil(...) − 1`. If "passes a one-tile
  gap" stops at 148, the row range is one too wide the same way.
- [ ] **Step 5: `npm run check`; commit** — `Resolve a box against the solid grid`; why: the
  resolver is generic engine math with the numbers of every stop, slide and corner in a test, so
  that "feels right" at a wall is a property proven in Node and never a glance at the screen
  (`testing.md` §3).

---

### Task 2: The figure uses it

**Files:**
- Modify: `src/game/player.ts`, `tests/unit/player.test.ts`

**Interfaces — produces:**

```ts
// src/game/player.ts (changes)
import { type Box, moveBox } from '../engine/collision';

/** The collision box (0005): the lowest 8 px of the 16x24 sprite, 12 px wide, centred under the feet. */
export const BOX_WIDTH = 12;
export const BOX_HEIGHT = 8;

/** The box of a figure whose feet are at (x, y): [x − 6, x + 6) × [y − 8, y). 0006 centres the camera on it. */
export function collisionBox(player: PlayerState): Box {
  return {
    x: player.x - BOX_WIDTH / 2,
    y: player.y - BOX_HEIGHT,
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  };
}

/**
 * One step: move the box along the vector against the solid grid, X then Y (engine/collision),
 * clamp the feet so the whole 16x24 sprite stays inside the map, turn. "Moving" is the vector
 * before collision and clamp, so a figure held by a wall or an edge keeps its facing and its
 * walk cycle.
 */
export function stepPlayer(player: PlayerState, input: MovementInput, map: TileMap): PlayerState {
  const vector = movementVector(input);
  const moving = vector.x !== 0 || vector.y !== 0;
  const box = moveBox(
    collisionBox(player),
    vector.x * STEP_DISTANCE,
    vector.y * STEP_DISTANCE,
    map,
  );
  const halfWidth = FRAME_WIDTH / 2;
  return {
    x: clamp(box.x + BOX_WIDTH / 2, halfWidth, map.width * TILE_SIZE - halfWidth),
    y: clamp(box.y + BOX_HEIGHT, FRAME_HEIGHT, map.height * TILE_SIZE),
    facing: facingOf(vector, player.facing),
    ...walkCycle(player, moving),
  };
}
```

Everything else in `player.ts` — `MovementInput`, `SPEED_PX_PER_SECOND`, `movementVector`,
`facingOf`, `walkCycle`, `clamp` — stays as it is.

- [ ] **Step 1: write the failing tests.** In `tests/unit/player.test.ts`, import
  `type TileMap` from `../../src/engine/tiled` and `CORRIDOR, pictureMap` from `./picture-map`;
  give `walk` a fourth parameter `map: TileMap = MAP` and pass it to `stepPlayer`; every existing
  call stays as it is. Append:

```ts
describe('stepPlayer: solid tiles stop the figure (0005)', () => {
  /**
   * The corridor picture in pixels: the wall in column 10 spans x [160, 176), so a figure flush
   * against it from the left has its feet at x = 154; the lone tile at (4, 3) spans
   * [64, 80) × [48, 64); the gap in row 6 spans y [96, 112).
   */
  const WALLS = pictureMap(CORRIDOR, { x: 40, y: 56 });

  it("stops flush against a wall from the left: feet x at the wall's left edge − 6", () => {
    expect(walk(standing(152, 72), press('right'), 2, WALLS).x).toBe(154);
  });

  it('keeps stepping in place and facing its input while held by a wall', () => {
    const held = walk(standing(152, 72), press('right'), 10, WALLS);
    expect([held.x, held.y, held.facing, held.frame, held.frameTimer]).toStrictEqual([
      154,
      72,
      'right',
      2,
      1.5,
    ]);
  });

  it("stops flush against a tile from below (feet at its bottom edge + 8) and from above (feet at its top edge)", () => {
    expect(walk(standing(72, 74), press('up'), 2, WALLS).y).toBe(72);
    expect(walk(standing(72, 46), press('down'), 2, WALLS).y).toBe(48);
  });

  it('slides along a wall at the component speed, facing the input', () => {
    const slid = stepPlayer(standing(154, 72), press('up', 'right'), WALLS);
    expect(slid.x).toBe(154);
    expect(slid.y).toBeCloseTo(71.057, 3);
    expect(slid.facing).toBe('right');
  });

  it('passes a corner without a snag: held on x until the box clears the wall, then diagonal', () => {
    const held = walk(standing(154, 150), press('down', 'right'), 20, WALLS);
    expect(held.x).toBe(154);
    expect(held.y).toBeCloseTo(168.856, 2);
    const past = walk(standing(154, 150), press('down', 'right'), 30, WALLS);
    expect(past.x).toBeCloseTo(163.428, 2);
    expect(past.y).toBeCloseTo(178.284, 2);
  });

  it('walks through a one-tile gap, and is stopped when the box also covers the row above it', () => {
    expect(walk(standing(140, 108), press('right'), 30, WALLS).x).toBeCloseTo(180, 6);
    expect(walk(standing(140, 100), press('right'), 30, WALLS).x).toBe(154);
  });

  it("slides along a wall into the gap and along the gap's ceiling through it", () => {
    const atWall = walk(standing(154, 120), press('up', 'right'), 9, WALLS);
    expect(atWall.x).toBe(154);
    expect(atWall.y).toBeCloseTo(111.515, 2);
    const inGap = walk(standing(154, 120), press('up', 'right'), 38, WALLS);
    expect(inGap.y).toBe(104);
    expect(inGap.x).toBeCloseTo(181.341, 2);
    const through = walk(standing(154, 120), press('up', 'right'), 40, WALLS);
    expect(through.x).toBeCloseTo(183.227, 2);
    expect(through.y).toBeCloseTo(102.114, 2);
  });

  it('never moves x backwards while sliding into the gap', () => {
    let current = standing(154, 120);
    for (let step = 1; step <= 40; step += 1) {
      const next = stepPlayer(current, press('up', 'right'), WALLS);
      expect(next.x, `step ${step}`).toBeGreaterThanOrEqual(current.x);
      current = next;
    }
  });

  it('still clamps the feet at the map edge on open ground', () => {
    expect(walk(standing(8.5, 96), press('left'), 1, WALLS).x).toBe(8);
    expect(walk(standing(160, 191.5), press('down'), 1, WALLS).y).toBe(192);
  });
});
```

  Where the numbers come from: a step is `80 / 60 = 1.3333…` px, a diagonal step `0.94281…` per
  axis. Held by a wall, the walk cycle is the 0004 cycle: step 1 phase 1 timer 0, step 9 phase 2
  timer 0.5, step 10 timer 1.5. The corner: the wall's lower end is row 9, bottom edge 160; the
  box clears it once the feet pass 168, which takes 20 steps of 0.94281 from 150 (`150 + 20 ×
  0.94281 = 168.856`), so steps 21–30 move x by `10 × 0.94281 = 9.428`. Into the gap: 9 steps up
  the wall, then x moves and y keeps shrinking until the box top meets row 5 at step 17 and is
  snapped to 96 (feet 104); the box leaves column 10 at step 39, after `29 × 0.94281 = 27.341`
  of x from 154, and rises again.

- [ ] **Step 2: run `npx vitest run tests/unit/player.test.ts`, see the new block fail** (and
  nothing else: the first eleven `describe` blocks are untouched and still pass on `MAP`, which
  has no walls).
- [ ] **Step 3: change `player.ts`** as above; see everything pass. If "stops flush against a
  wall from the left" ends at `152` or `153.33`, the box is being clamped before it is resolved
  or the resolved box is not converted back to feet. If `inGap.y` is `102.11` rather than `104`,
  the slide reached step 40, not 38 — count the steps.
- [ ] **Step 4: `npm run check`; `npm run test:e2e`** — the smoke spec walks right along row 7 of
  the test map, which is open ground, and stays green.
- [ ] **Step 5: look at it.** `npm run dev`, open `http://localhost:5173` in the browser pane,
  tap `D` a few times and `W` a few times: the figure moves; tap it toward the pond and watch it
  stop. A tap moves it a frame's worth, which is enough to see a stop.
- [ ] **Step 6: commit** — `Stop the figure at solid tiles`; why: the box is the feet, so a figure
  stands in front of a wall with its body over it (`visual.md` §3), and the clamp stays as the
  second guard because the campus of 0006 is larger than any wall ring.

---

### Task 3: Specification and README

**Files:**
- Modify: `docs/spec/architecture.md` §2, `docs/spec/testing.md` §1, `README.md`

- [ ] `architecture.md` §2, after the sentence "How the player moves, turns and stays inside the
  map is specified in feature 0004": add that the player's collision box is the lowest 8 px of
  the sprite, 12 px wide, centred under the feet — `[x − 6, x + 6) × [y − 8, y)` — and that a
  step moves the box on X, then on Y, each axis snapped flush to the first solid cell it would
  enter (`engine/collision`, feature 0005), then clamps the feet to the map; touching is not
  overlapping, and the solid grid is the union of the three tile layers (§6).
- [ ] `testing.md` §1, Unit row: "engine math (movement, collision, camera)" already names
  collision; add "the box resolver against a picture grid and the loaded corridor fixture" and,
  in the game rules, "the player's box against solid tiles: flush stops, the slide, corners and a
  one-tile gap".
- [ ] `README.md` status: walls, the pond and the fence stop the figure, which slides along
  them (feature 0005); the camera and the campus are feature 0006.
- [ ] Commit — `Record the collision box and the step order as built`.

---

### Task 4: Acceptance

- [ ] Merge `origin/main` into the branch (`git fetch origin && git merge origin/main`); the
  branch already contains the commit of #8 ("Mark 0004 implemented"), so the merge is clean or
  trivial. Rerun `npm run check`, `npm run test:e2e`, then `docker build -t shadow-ai .`,
  `docker run --rm -p 8080:8080 shadow-ai` and `BASE_URL=http://localhost:8080 npm run test:e2e`.
- [ ] Run the spec's acceptance plan, steps 1–28, and report every step with its result. The
  app's browser pane cannot hold a key down (memory: acceptance-run-browser-limits), so: steps
  1–2 in the pane (a screenshot); steps 3–28 with a Playwright Chromium script run from the
  repository root (`require(require.resolve('@playwright/test', { paths: [process.cwd()] }))`,
  1920x1080, `deviceScaleFactor` 1, against the dev server): `keyboard.down` and `keyboard.up`
  with `waitForTimeout` for the holds, `page.evaluate(() => window.shadowAi.state.player)` for
  every position and facing, a screenshot to the scratchpad after each expected result. The
  numbers to compare against, feet position in map pixels: step 4 and 6, `x` = 186 at the ring's
  left side; step 8, `y` = 24 at the top; step 10, `y` > 88 and `x` > 186 under the ring; step
  12, `y` ≤ 64 and 214 ≤ `x` ≤ 250 inside the ring; step 14, 230 ≤ `x` ≤ 234 and 72 ≤ `y` ≤ 80
  in the opening; step 16, `x` = 118; step 18, `y` = 128; step 20, `y` = 144; step 22, `y` = 168;
  step 24, `x` = 186 at row 2; step 26, `y` = 72; step 28, `x` = 102. Step 4's visible gap of
  about two pixels between the body and the wall follows from the box (12 px) being wider than
  the placeholder's body (8 px); a screenshot shows it. Answer the feel questions with what the
  script and the screenshots show, and say which steps only the author can judge by eye (the
  jerk at the corner, step 10).
- [ ] Push `feature/0005-collision`; open the pull request against `main` with the step results,
  "no new dependency", and the attribution trailer. Bind the PR with the app's PR tools and read
  CI: both smoke runs (dev server and container) must be green.
- [ ] Hand back to the author for the acceptance run. The merge is the acceptance; then a
  follow-up sets `Status: implemented`.

## Self-review against the spec

- Scope "In": the 12x8 box under the feet (T2, `collisionBox`); `src/engine/collision.ts` with
  `moveBox(box, dx, dy, grid)`, `Box` and `SolidGrid` (T1); the step order in `player.ts` with the
  clamp as second guard (T2); `tests/unit/picture-map.ts` (T1); the tests at walls, corners and
  gaps, one on the loaded fixture (T1, T2); `architecture.md` §2, `testing.md` §1, the README
  (T3). Scope "Out": nothing here touches NPCs, objects, knock-back, corner correction, a swept
  test, the spawn check or the smoke spec.
- Behaviour "The box and the grid": the box's edges → `collisionBox`; the union grid → the
  loaded-fixture test; half-open intervals and the cell ranges → `cellRange` and the "touching"
  tests; cells outside the map open → the "grid edge" test and the clamp test. "Resolving a
  step": the six-point order → `stepPlayer`; stopping → the flush tests and the held-by-a-wall
  test (walk cycle, facing); sliding at 0.943 → the slide tests; corners → the three corner
  tests and the player's corner test; gaps → the gap tests and the slide into the gap; the 4-px
  window of a doorway in a horizontal wall has no counterpart on the corridor, whose gap is
  entered sideways, and is exercised by the acceptance plan's steps 11–14 on the test map;
  already inside → the no-movement test.
- Acceptance criteria 1–7: 1 → T1 flush, T2 held, T4 steps 4–6; 2 → T1 and T2 slide, T4 step 8;
  3 → T1 corners, T2 corner, T4 step 10; 4 → T1 and T2 gap, T4 steps 12–14; 5 → T4 steps 16–28;
  6 → T1, T2; 7 → T2 step 4, T4.
- Test plan: `collision.test.ts` → T1, every bullet one `it`; `player.test.ts` → T2, every bullet
  one `it`; `state.test.ts` unchanged; the smoke spec unchanged.
- Names used across tasks: `Box`, `SolidGrid`, `moveBox`, `pictureMap`, `CORRIDOR`, `BOX_WIDTH`,
  `BOX_HEIGHT`, `collisionBox`, `stepPlayer`, `walk` — each defined once above and used with the
  same signature.

## Decisions by the planning session

Three readings the spec leaves to the implementation, decided on 2026-11-04 so that the work
does not stop. None changes what the author sees in the acceptance run.

1. **`collisionBox` is exported from `player.ts`.** The spec names the box's edges and says 0006
   centres the camera on the box; one function that both the step and the camera call is the
   way to keep them from disagreeing. It takes the `PlayerState`, not a point, so the call site
   reads as what it is.
2. **Tolerances.** Snapped positions are integers and are asserted exactly; positions that
   include a diagonal step are asserted to within 0.005 with three-decimal values. The spec's
   ± 0.01 is the outer bound; the tests are tighter so that a wrong order of operations (clamp
   before resolve, Y before X) cannot hide inside the tolerance.
3. **The picture lives beside its builder.** `CORRIDOR` is exported from `picture-map.ts` rather
   than copied into two test files, and the loaded fixture is asserted equal to it. A helper
   module is not a fixture (`testing.md` §6); the fixture stays the hand-made `.tmj`.

## Questions for the author

None. The one feel decision — the slide keeps the component speed — was made in conversation on
2026-11-04 and is in the spec.
