# 0006 — Implementation plan: camera and campus

**Spec:** [`docs/features/0006-camera-and-campus.md`](../features/0006-camera-and-campus.md)
(approved 2026-11-11). The plan argues from the spec; where they differ, the spec wins. Read the
spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §1, §2, §5, §6 and §7,
`docs/spec/testing.md` §1–§3, §5 and §6, `docs/spec/world.md` §1 and `docs/spec/visual.md` §5.
**Written:** 2026-11-11 on the planning model. A working document, not specification: once the
feature is implemented, what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. Every
expected number below was checked on 2026-11-11 against the real collision resolver and a
simulation of the spec's camera and layout rules; if a test disagrees with its number, the
implementation is wrong, not the number — read the spec's "Behaviour" again before touching the
test. One number of the spec was corrected on the way (see "Decisions", 1).

**Goal:** the camera follows the figure over a map larger than the screen, and that map is the
campus: `cameraFor` in `src/engine/camera.ts`, the camera in `GameState`, `drawLayer` culling to
the view, loader rule 13, a generated `public/maps/campus.tmj` of 128x96 tiles with every region
of `world.md` §1 as a footprint, the test map kept as a fixture, and the smoke spec on the
campus.

**Approach:** engine math first, then the state, then the drawing, then the loader, then the
content, then the switch of `main.ts` and the smoke spec, then the paperwork. Each task leaves
`npm run check` green and the game running on whatever map `main.ts` loads at that point. The
campus is data in `tools/campus-layout.ts` — the spec's tables, one entry per row — and a
generator writes the file; a test proves the committed file equals the generator and the
layout obeys the spec's reachability and closure rules. The acceptance run is a Playwright
script, because the app's browser pane cannot hold a key down.

## Global constraints

- No new dependency, runtime or development.
- `src/game/` touches no browser (INV-2). `tests/arch/` scans the source text of `src/game/`,
  comments included, for the words `window`, `document`, `HTMLCanvasElement`, `Image` and
  `fetch` as whole words, case-sensitive. The new `src/game/camera.ts` says "view" and "screen",
  never "the window".
- `src/engine/` imports nothing from outside `src/engine/`: `camera.ts` imports `Point` from
  `./tiled` and nothing else. `src/render/` may import `src/engine/` (`architecture.md` §1), so
  `renderer.ts` re-exports the view constants from `engine/camera` and `draw-map.ts` imports
  them.
- `GameState` stays plain data (INV-1): the camera is `{ x, y }`, two integers. The round-trip
  test in `tests/unit/state.test.ts` keeps proving it.
- No module cycle in `src/game/`: `state.ts` holds types and constants only; `createInitialState`
  moves to `update.ts`. (`state.ts` → `camera.ts` → `player.ts` → `state.ts` would be a cycle with
  a value import, `WALK_PHASES`.)
- No literal text a player can read (INV-4): the loader's rule-13 messages and the generator's
  errors are developer messages, like every loader message before them.
- Fixtures are never generated from the real content (`testing.md` §6): the moved test map
  references the hand-made `seven-tiles.tsj`, never `public/tiles/placeholder.tsj`. The campus
  test reads `public/` on purpose, as the test-map test did before: it proves the map the game
  loads.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on, `verbatimModuleSyntax` forces `import type`. `npm run
  lint` is `biome check .`; `npx biome check --write .` sorts imports and formats. Biome ignores
  `.tmj` and `.tsj` files (unknown extension), so the one-line layer data does not trip the
  formatter. `noUncheckedIndexedAccess` is why `drawLayer` checks `id === undefined`.
- `npm run check` is typecheck, Biome, build, Vitest, in that order. `npm run test:e2e` runs the
  smoke spec against the dev server, which Playwright starts; with `BASE_URL` set it runs against
  that URL and starts nothing.
- Branch `feature/0006-camera-and-campus` (this worktree); it already carries "Mark 0005
  implemented" (also open as PR #10), the revised spec, its approval and this plan. Commit
  messages: imperative subject, a body with the why, and the trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Design notes

- **The camera is a function of the target and the map's pixel size.** `cameraFor(target, map)`
  returns the view's top-left corner: `clamp(target − half view, 0, map − view)`, then
  `Math.round`, per axis. `map` is `{ width, height }` in pixels, named `PixelSize`; a `TileMap`
  has the same two members in tiles, and TypeScript cannot tell them apart, so the one place
  that converts is `followPlayer` in `src/game/camera.ts`, which multiplies by `TILE_SIZE`. The
  tests on the 20x12 map (camera y up to 12) catch a forgotten conversion.
- **The target is the collision box's centre.** `followPlayer(player, map)` calls
  `collisionBox(player)` from 0005 and takes `(box.x + 6, box.y + 4)` = `(x, y − 4)` for feet at
  `(x, y)`. Away from the edges the sprite sits at screen (152, 70) for every fractional
  position: `round(x) − 8 − round(x − 160) = 152` because 160 is an integer, and the same on y
  with 94. That is the whole no-jitter argument; nothing else is needed.
- **The camera is derived state, set twice.** `createInitialState(map)` sets it from the spawn,
  `update` from the stepped player, both through `followPlayer`. It lives in the state so a
  saved game comes back as it was left, and so the deferred lerp is a change to this one number.
- **Culling by cell ranges.** A layer draws columns `⌊camera.x / 16⌋ … ⌊(camera.x + 319) / 16⌋`
  and rows `⌊camera.y / 16⌋ … ⌊(camera.y + 179) / 16⌋`, each cut to the map: at most 21 × 13 =
  273 cells. Cell `(c, r)` lands at `(16c − camera.x, 16r − camera.y)`; a partly visible cell is
  drawn off the surface's edge and clipped. Iteration is row-major, as before, so the recorded
  call order of the old tests still reads top to bottom.
- **The campus is the spec's tables, verbatim.** `tools/campus-layout.ts` writes each rectangle
  as `cells(c0, c1, r0, r1)` — columns c0–c1, rows r0–r1, inclusive — exactly as the spec writes
  it, named as the spec names it, so a reviewer can check the file against the tables line by
  line. `buildLayers()` paints `ground` (grass, then paths, then water) and `detail` (fences,
  then buildings: roof rows, a wall row with its doors). Two structures never share a `detail`
  cell; the builder throws if they would. `campusJson()` is the `.tmj` object with Tiled's keys
  in Tiled's order; gids are ids + 1, `EMPTY` is 0.
- **The file is JSON.stringify's, with one line per layer.** `encodeCampus()` writes the object
  with two-space indentation and each layer's `data` array on one line, `[1, 1, 1, …]`, as Tiled
  does — 12288 cells per line, about 75 KB and 72 lines for the file. The whitespace is not
  Tiled's (the `.tsj` generator took the same liberty); Tiled reads it, and a save in Tiled
  reformats it and fails the determinism test. Until the art pass, the layout changes in
  `campus-layout.ts`; the README says so.
- **Rule 13 is the last map check.** After the spawn is read and the solid grid is built,
  `checkSpawn` fails on a spawn outside `[0, 16 × width) × [0, 16 × height)` or on a solid cell
  `(⌊x / 16⌋, ⌊y / 16⌋)`. The cell, not the box: the loader knows no figure.
- **Reachability is a flood fill in the test.** `campus.test.ts` walks the loaded map's `solid`
  grid four-connected from the spawn's cell and asserts every door's front cell, the parking
  lot's cell (14, 78) and the meeting rooms' front (95, 32) are reached — and that (95, 32) is
  not reached once the gap (95, 34) is made solid. This is a test-only helper in the test file.

## File map

| File | Responsibility |
|---|---|
| `src/engine/camera.ts` | `VIEW_WIDTH`, `VIEW_HEIGHT`, `PixelSize`, `cameraFor(target, map)` (new) |
| `src/render/renderer.ts` | `SURFACE_WIDTH`, `SURFACE_HEIGHT` become re-exports of the view constants |
| `src/game/camera.ts` | `followPlayer(player, map)` (new) |
| `src/game/state.ts` | `GameState.camera`; `createInitialState` leaves |
| `src/game/update.ts` | `createInitialState(map)` arrives; `update` sets the camera after the step |
| `src/main.ts` | imports `createInitialState` from `game/update`; loads `/maps/campus.tmj` |
| `src/render/draw-map.ts` | `drawLayer(renderer, map, tileset, name, camera)` with culling; `drawMap` removed |
| `src/render/draw-scene.ts` | passes the camera to the layers and subtracts it from the sprite |
| `src/engine/tiled.ts` | rule 13, `checkSpawn` |
| `tools/campus-layout.ts` | the campus as data; `buildLayers()`, `campusJson()`, the exported regions (new) |
| `tools/gen-campus.ts` | `encodeCampus()`; writes `public/maps/campus.tmj` (new) |
| `package.json` | `"gen-campus": "node tools/gen-campus.ts"` |
| `public/maps/campus.tmj` | the generated campus, committed (new) |
| `public/maps/test.tmj` | moves to `tests/fixtures/maps/test.tmj`, referencing `seven-tiles.tsj` |
| `tests/fixtures/maps/seven-tiles.tsj` | hand-made seven-tile fixture tileset (new) |
| `tests/fixtures/maps/spawn-on-solid.tmj` | fixture for rule 13 (new) |
| `tests/unit/camera.test.ts` | `cameraFor`: centring, clamps, corners, rounding, small maps, the constants (new) |
| `tests/unit/state.test.ts` | the camera in the state; `createInitialState` from `update` |
| `tests/unit/player.test.ts` | `createInitialState` from `update` (import only) |
| `tests/unit/draw-map.test.ts` | rewritten for `drawLayer` with a camera |
| `tests/unit/draw-scene.test.ts` | the camera offset on tiles and sprite |
| `tests/unit/tiled.test.ts` | rule 13 |
| `tests/unit/test-map.test.ts` | on the moved fixture |
| `tests/unit/campus.test.ts` | acceptance criterion 9, plus the meeting-room gap (new) |
| `tests/e2e/smoke.spec.ts` | the campus spawn and the camera |
| `docs/spec/architecture.md` | §1, §2, §5, §6, §7 |
| `docs/spec/world.md` | §1: the campus map as built |
| `docs/spec/testing.md` | §1, §2, §6 |
| `docs/plan.md` | §4: M2 done |
| `README.md` | status, `npm run gen-campus`, the Tiled sentence |

---

### Task 1: The camera math

**Files:**
- Create: `src/engine/camera.ts`, `tests/unit/camera.test.ts`
- Modify: `src/render/renderer.ts`

**Interfaces — produces:**

```ts
// src/engine/camera.ts
/**
 * The view and where it sits on the map (architecture.md §5, feature 0006). A view of
 * VIEW_WIDTH × VIEW_HEIGHT pixels is centred on a target and clamped so it never leaves the
 * map; its top-left corner is rounded to whole pixels, so everything drawn from it is drawn on
 * whole pixels. Pure: a function of the target and the map's size.
 */
import type { Point } from './tiled';

/** The view in game pixels (visual.md §1). It never changes size. */
export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 180;

/** A map's size in pixels — not a TileMap, whose width and height are tiles. */
export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The view's top-left corner for a view centred on `target`: clamped to
 * [0, map.width − VIEW_WIDTH] × [0, map.height − VIEW_HEIGHT], then rounded, per axis. The
 * loader accepts no map smaller than the view, so the clamp's bounds are never inverted.
 */
export function cameraFor(target: Point, map: PixelSize): Point {
  return {
    x: Math.round(clamp(target.x - VIEW_WIDTH / 2, 0, map.width - VIEW_WIDTH)),
    y: Math.round(clamp(target.y - VIEW_HEIGHT / 2, 0, map.height - VIEW_HEIGHT)),
  };
}
```

```ts
// src/render/renderer.ts (change): replace the two constants with re-exports
/** The game surface is the view (engine/camera): one 320 and one 180 in the code. */
export { VIEW_HEIGHT as SURFACE_HEIGHT, VIEW_WIDTH as SURFACE_WIDTH } from '../engine/camera';
```

`scale.ts` and `canvas2d-renderer.ts` keep importing `SURFACE_WIDTH` and `SURFACE_HEIGHT` from
`./renderer` and `../renderer`; nothing else in `render/` changes in this task.

- [ ] **Step 1: write the failing tests** `tests/unit/camera.test.ts`, the spec's test plan one
  `it` per bullet:

```ts
import { describe, expect, it } from 'vitest';
import { cameraFor, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/engine/camera';
import type { Point } from '../../src/engine/tiled';
import { SURFACE_HEIGHT, SURFACE_WIDTH } from '../../src/render/renderer';

/** The campus: 128x96 tiles, 2048x1536 px; the camera ranges over [0, 1728] × [0, 1356]. */
const CAMPUS = { width: 2048, height: 1536 };

function at(x: number, y: number, map = CAMPUS): Point {
  return cameraFor({ x, y }, map);
}

describe('cameraFor on the campus', () => {
  it('centres the view on the target: (1024, 730) gives (864, 640)', () => {
    expect(at(1024, 730)).toStrictEqual({ x: 864, y: 640 });
  });

  it('clamps at the left, right, top and bottom edges', () => {
    expect(at(100, 730).x).toBe(0);
    expect(at(2000, 730).x).toBe(1728);
    expect(at(1024, 50).y).toBe(0);
    expect(at(1024, 1500).y).toBe(1356);
  });

  it('holds at the corners', () => {
    expect(at(0, 0)).toStrictEqual({ x: 0, y: 0 });
    expect(at(2048, 1536)).toStrictEqual({ x: 1728, y: 1356 });
  });

  it('rounds half up after clamping', () => {
    expect(at(1024.4, 730.5)).toStrictEqual({ x: 864, y: 641 });
    expect(at(1024.6, 730.4)).toStrictEqual({ x: 865, y: 640 });
  });
});

describe('cameraFor on small maps', () => {
  it('is (0, 0) for every target on a map the size of the view', () => {
    const view = { width: 320, height: 180 };
    expect(at(160, 90, view)).toStrictEqual({ x: 0, y: 0 });
    expect(at(10, 10, view)).toStrictEqual({ x: 0, y: 0 });
  });

  it('moves on y only, by at most 12, on the smallest map the loader accepts, 320x192', () => {
    expect(at(300, 191, { width: 320, height: 192 })).toStrictEqual({ x: 0, y: 12 });
  });
});

describe('the view', () => {
  it('is 320x180, and the renderer surface is the same size', () => {
    expect([VIEW_WIDTH, VIEW_HEIGHT]).toStrictEqual([320, 180]);
    expect([SURFACE_WIDTH, SURFACE_HEIGHT]).toStrictEqual([VIEW_WIDTH, VIEW_HEIGHT]);
  });
});
```

- [ ] **Step 2: run it, see it fail** (`npx vitest run tests/unit/camera.test.ts`): module
  missing.
- [ ] **Step 3: write** `src/engine/camera.ts` and change `renderer.ts` as above. See the tests
  pass; `tests/unit/scale.test.ts` still passes untouched.
- [ ] **Step 4: `npm run check`; commit** — `Add the camera math`; why: the view's corner is a
  pure function of the target and the map's size, clamped then rounded, so that every later
  camera behaviour is a change to this function and the no-jitter argument of the spec rests on
  one integer subtraction.

---

### Task 2: The camera in the state

**Files:**
- Create: `src/game/camera.ts`
- Modify: `src/game/state.ts`, `src/game/update.ts`, `src/main.ts`, `tests/unit/state.test.ts`,
  `tests/unit/player.test.ts`, `tests/unit/draw-scene.test.ts`

**Interfaces — produces:**

```ts
// src/game/camera.ts
import { cameraFor } from '../engine/camera';
import { type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { collisionBox } from './player';
import type { PlayerState } from './state';

/**
 * The view's top-left corner for a figure (feature 0006): centred on the centre of its collision
 * box — (x, y − 4) for feet at (x, y) — and clamped to the map, in pixels. The map's size is in
 * tiles; this is the one place that converts it.
 */
export function followPlayer(player: PlayerState, map: TileMap): Point {
  const box = collisionBox(player);
  return cameraFor(
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    { width: map.width * TILE_SIZE, height: map.height * TILE_SIZE },
  );
}
```

```ts
// src/game/state.ts (changes): import Point; the camera joins GameState; createInitialState leaves
import type { Point } from '../engine/tiled';

export interface GameState {
  /** Logic steps since the start; one step is 1/60 s (INV-3). */
  readonly tick: number;
  readonly player: PlayerState;
  /**
   * The view's top-left corner in map pixels, two integers (0006). Derived from the player after
   * every step and kept here so a saved game comes back as it was left.
   */
  readonly camera: Point;
}
```

The `TileMap` import and `createInitialState` are removed from `state.ts`; what remains is
`FACINGS`, `Facing`, `WALK_PHASES`, `PHASES_PER_FACING`, `PlayerState`, `GameState`.

```ts
// src/game/update.ts
import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { type MovementInput, stepPlayer } from './player';
import type { GameState, PlayerState } from './state';

/** The state before the first step: the player at the map's spawn, facing down, standing; the camera on it. */
export function createInitialState(map: TileMap): GameState {
  const player: PlayerState = {
    x: map.spawn.x,
    y: map.spawn.y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
  };
  return { tick: 0, player, camera: followPlayer(player, map) };
}

/**
 * Advances the game by exactly one logic step and returns the new state; its arguments are not
 * mutated. The camera follows the stepped player, after collision and clamp.
 */
export function update(state: GameState, input: MovementInput, content: TileMap): GameState {
  const player = stepPlayer(state.player, input, content);
  return { tick: state.tick + 1, player, camera: followPlayer(player, content) };
}
```

`src/main.ts`: `import type { GameState } from './game/state';` and
`import { createInitialState, update } from './game/update';`. Nothing else in `main.ts` changes
in this task.

- [ ] **Step 1: write the failing tests.** In `tests/unit/state.test.ts`: import
  `createInitialState` from `../../src/game/update` (beside `update`), `followPlayer` from
  `../../src/game/camera` and `type PlayerState` from `../../src/game/state`. Change the first
  expectation to include the camera — on the 20x12 map the spawn's target (136, 116) lies 26 px
  below the view's centre, and the map allows 12:

```ts
  it('starts at tick 0 with the player at the spawn, facing down, standing, the camera on it', () => {
    expect(createInitialState(MAP)).toStrictEqual({
      tick: 0,
      player: { x: 136, y: 120, facing: 'down', frame: 0, frameTimer: 0 },
      camera: { x: 0, y: 12 },
    });
  });
```

  In the round-trip test add, before the copy, `expect(state.camera).toStrictEqual({ x: 0, y: 0 });`
  (after 37 up-left steps the feet are at y ≈ 85.1, the target 8.9 px above the view's centre,
  so the clamp holds the camera at 0). In the `update` describe, give the two literal states a
  camera: `{ tick: 41, player, camera: { x: 0, y: 12 } }` and
  `const state: GameState = { tick: 7, player, camera: { x: 0, y: 12 } };`. Append:

```ts
describe('the camera in the state (0006)', () => {
  /** The campus's size and spawn on open ground: 128x96 tiles, the spawn at (1024, 734). */
  const CAMPUS = grassMap(128, 96, { x: 1024, y: 734 });
  const feet = (x: number, y: number): PlayerState => ({
    x,
    y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
  });

  it('starts centred on the spawn: (864, 640)', () => {
    expect(createInitialState(CAMPUS).camera).toStrictEqual({ x: 864, y: 640 });
  });

  it('follows the player: 60 steps right move the player and the camera 80 px', () => {
    let state = createInitialState(CAMPUS);
    for (let i = 0; i < 60; i += 1) {
      state = update(state, RIGHT, CAMPUS);
    }
    expect(state.player.x).toBeCloseTo(1104, 6); // 60 × 1.3333… within floating-point noise
    expect(state.camera).toStrictEqual({ x: 944, y: 640 });
  });

  it('followPlayer on the 20x12 map is clamped to x 0 and y 0–12', () => {
    expect(followPlayer(feet(136, 120), MAP)).toStrictEqual({ x: 0, y: 12 });
    expect(followPlayer(feet(160, 94), MAP)).toStrictEqual({ x: 0, y: 0 });
    expect(followPlayer(feet(300, 191), MAP)).toStrictEqual({ x: 0, y: 12 });
  });
});
```

  In `tests/unit/player.test.ts`, change the import on line 4 to
  `import type { Facing, PlayerState } from '../../src/game/state';` and add
  `import { createInitialState } from '../../src/game/update';` — its `createInitialState`
  describe checks `.player` only and stays as it is. In `tests/unit/draw-scene.test.ts`, give the
  `state` helper a camera so the file compiles:
  `const state = (fields: Partial<PlayerState>): GameState => ({ tick: 0, player: player(fields), camera: { x: 0, y: 0 } });`
  (Task 3 extends it.)
- [ ] **Step 2: run `npx vitest run tests/unit/state.test.ts`, see it fail** (and `npm run
  typecheck` fail on the missing `camera`).
- [ ] **Step 3: write** `src/game/camera.ts`, change `state.ts`, `update.ts` and `main.ts` as
  above; see everything pass, `tests/arch/` included. If the initial camera on the 20x12 map is
  `(0, 0)` instead of `(0, 12)`, `followPlayer` is passing the map's size in tiles; if the 60-step
  camera is `945`, the camera is rounded before the clamp, or the target is the feet and not the
  box's centre on y (that one shows as `camera.y` 644).
- [ ] **Step 4: `npm run check`; `npm run dev`, open `http://localhost:5173` in the browser pane:**
  the test map looks as before, shifted up by 12 px (the camera is (0, 12) at the spawn; the
  drawing does not yet use it, so nothing moves). Tap `W` a few times: nothing changes on screen
  yet. That is expected until Task 3.
- [ ] **Step 5: commit** — `Carry the camera in the state`; why: the camera is derived from the
  player after every step and kept in `GameState`, so a saved game comes back as it was left and
  the deferred lerp is a change to one number; `createInitialState` moves beside `update` so that
  `state.ts` holds types and constants only and no module imports in a circle.

---

### Task 3: Drawing the view

**Files:**
- Modify: `src/render/draw-map.ts`, `src/render/draw-scene.ts`, `tests/unit/draw-map.test.ts`,
  `tests/unit/draw-scene.test.ts`

**Interfaces — produces:**

```ts
// src/render/draw-map.ts
import { VIEW_HEIGHT, VIEW_WIDTH } from '../engine/camera';
import { EMPTY, type Point, TILE_SIZE, type TileLayerName, type TileMap } from '../engine/tiled';
import type { Renderer, TilesetImage } from './renderer';

/** The first and last cell a span of `length` pixels from `offset` touches, cut to `count` cells. */
function cellRange(offset: number, length: number, count: number): readonly [number, number] {
  return [
    Math.max(0, Math.floor(offset / TILE_SIZE)),
    Math.min(count - 1, Math.floor((offset + length - 1) / TILE_SIZE)),
  ];
}

/**
 * Draws one layer as the camera sees it: every non-empty cell (column, row) the view
 * intersects, at (16 × column − camera.x, 16 × row − camera.y), row by row. At most 21 columns
 * and 13 rows; a cell at the view's edge is drawn partly off the surface and clipped by it.
 */
export function drawLayer(
  renderer: Renderer,
  map: TileMap,
  tileset: TilesetImage,
  name: TileLayerName,
  camera: Point,
): void {
  const [firstColumn, lastColumn] = cellRange(camera.x, VIEW_WIDTH, map.width);
  const [firstRow, lastRow] = cellRange(camera.y, VIEW_HEIGHT, map.height);
  const cells = map[name];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const id = cells[row * map.width + column];
      if (id === undefined || id === EMPTY) {
        continue;
      }
      renderer.drawTile(tileset, id, column * TILE_SIZE - camera.x, row * TILE_SIZE - camera.y);
    }
  }
}
```

`drawMap` and the `PAGE_BACKGROUND` and `TILE_LAYER_NAMES` imports are removed from
`draw-map.ts`.

```ts
// src/render/draw-scene.ts (changes)
/**
 * One frame: ground, detail, the player, above, all shifted by the camera. The sprite's top-left
 * corner is at (round(x) − 8 − camera.x, round(y) − 24 − camera.y): the feet are its bottom
 * centre, and the camera is already whole pixels (engine/camera).
 */
export function drawScene(renderer: Renderer, state: GameState, content: SceneContent): void {
  const { player, camera } = state;
  renderer.clear(PAGE_BACKGROUND);
  drawLayer(renderer, content.map, content.tileset, 'ground', camera);
  drawLayer(renderer, content.map, content.tileset, 'detail', camera);
  renderer.drawSprite(
    content.playerSheet,
    playerFrame(player),
    Math.round(player.x) - FRAME_WIDTH / 2 - camera.x,
    Math.round(player.y) - FRAME_HEIGHT - camera.y,
  );
  drawLayer(renderer, content.map, content.tileset, 'above', camera);
}
```

- [ ] **Step 1: write the failing tests.** Rewrite `tests/unit/draw-map.test.ts`: keep the
  recording renderer, `TILESET` and the 3x2 `MAP`; drop the `drawMap` import and its three
  tests; import `grassMap` from `./grass-map`; add `const WIDE = grassMap(40, 30, { x: 0, y: 0 });`
  (640x480 px) and:

```ts
describe('drawLayer draws the cells the view intersects', () => {
  function drawn(camera: { x: number; y: number }): string[] {
    const renderer = recordingRenderer();
    drawLayer(renderer, WIDE, TILESET, 'ground', camera);
    return renderer.calls;
  }

  it('camera (0, 0): columns 0–19 and rows 0–11, from (0, 0) to (304, 176)', () => {
    const calls = drawn({ x: 0, y: 0 });
    expect(calls).toHaveLength(240);
    expect(calls[0]).toBe('drawTile 0 at 0,0');
    expect(calls[19]).toBe('drawTile 0 at 304,0');
    expect(calls[20]).toBe('drawTile 0 at 0,16');
    expect(calls.at(-1)).toBe('drawTile 0 at 304,176');
  });

  it('camera (8, 8): columns 0–20 and rows 0–11, the first at (−8, −8)', () => {
    const calls = drawn({ x: 8, y: 8 });
    expect(calls).toHaveLength(252);
    expect(calls[0]).toBe('drawTile 0 at -8,-8');
    expect(calls.at(-1)).toBe('drawTile 0 at 312,168');
  });

  it('camera (15, 15): columns 0–20 and rows 0–12, 273 cells', () => {
    const calls = drawn({ x: 15, y: 15 });
    expect(calls).toHaveLength(273);
    expect(calls[0]).toBe('drawTile 0 at -15,-15');
    expect(calls.at(-1)).toBe('drawTile 0 at 305,177');
  });

  it('camera (320, 300), the far corner of a 640x480 map: columns 20–39 and rows 18–29', () => {
    const calls = drawn({ x: 320, y: 300 });
    expect(calls).toHaveLength(240);
    expect(calls[0]).toBe('drawTile 0 at 0,-12');
    expect(calls[20]).toBe('drawTile 0 at 0,4');
    expect(calls.at(-1)).toBe('drawTile 0 at 304,164');
  });
});

describe('drawLayer on the 3x2 map', () => {
  it('skips empty cells and draws only the named layer, without clearing', () => {
    const renderer = recordingRenderer();
    drawLayer(renderer, MAP, TILESET, 'ground', { x: 0, y: 0 });
    drawLayer(renderer, MAP, TILESET, 'detail', { x: 0, y: 0 });
    drawLayer(renderer, MAP, TILESET, 'above', { x: 0, y: 0 });
    expect(renderer.calls).toStrictEqual([
      'drawTile 0 at 0,0',
      'drawTile 1 at 16,0',
      'drawTile 2 at 0,16',
      'drawTile 2 at 16,16',
      'drawTile 2 at 32,16',
      'drawTile 4 at 16,16',
      'drawTile 6 at 0,0',
    ]);
  });

  it('draws every tile from the tileset it was given', () => {
    const renderer = recordingRenderer();
    drawLayer(renderer, MAP, TILESET, 'ground', { x: 0, y: 0 });
    expect(renderer.tilesets).toHaveLength(5);
    expect(renderer.tilesets.every((tileset) => tileset === TILESET)).toBe(true);
  });

  it('draws nothing for a layer of empty cells', () => {
    const renderer = recordingRenderer();
    const empty = new Array<number>(6).fill(EMPTY);
    drawLayer(renderer, { ...MAP, ground: empty }, TILESET, 'ground', { x: 0, y: 0 });
    expect(renderer.calls).toStrictEqual([]);
  });
});
```

  In `tests/unit/draw-scene.test.ts`, give the helper a camera parameter —
  `const state = (fields: Partial<PlayerState>, camera = { x: 0, y: 0 }): GameState => ({ tick: 0, player: player(fields), camera });`
  — keep the three existing tests (camera (0, 0), unchanged expectations), and append to the
  `drawScene` describe:

```ts
  it('shifts tiles and sprite by the camera: camera (5, 7), feet (20.4, 30.6) draw the sprite at (7, 0)', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }, { x: 5, y: 7 }), CONTENT);
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
      'drawTile 0 at -5,-7',
      'drawTile 1 at 11,-7',
      'drawTile 2 at -5,9',
      'drawTile 2 at 11,9',
      'drawTile 2 at 27,9',
      'drawTile 4 at 11,9',
      'drawSprite 13 at 7,0', // round(20.4) − 8 − 5, round(30.6) − 24 − 7
      'drawTile 6 at -5,-7',
    ]);
  });
```

- [ ] **Step 2: run both files, see them fail** (`drawLayer` takes four arguments; `drawMap`
  still exists).
- [ ] **Step 3: change `draw-map.ts` and `draw-scene.ts`** as above; see everything pass. If
  camera (8, 8) draws 240 cells, the last column is `⌊(camera.x + 320) / 16⌋ − 1` or the like —
  the spec's range ends at `⌊(camera.x + 319) / 16⌋`, inclusive. If camera (320, 300) draws 260
  cells, the row range is not cut to the map.
- [ ] **Step 4: `npm run check`; `npm run test:e2e`.** The smoke spec still runs on the test map:
  the camera at its spawn is (0, 12), so the surface's pixel (0, 0) shows the grass tile's pixel
  (0, 12), which is the base colour (the grass pattern's second colour sits at (11, 12), not
  (0, 12)); the spec stays green. Then `npm run dev` and look: the test map is drawn 12 px up and
  moves with `W`/`S` in the 12-px band; the figure stays put on the screen while it does.
- [ ] **Step 5: commit** — `Draw the view the camera selects`; why: a layer draws only the cells
  the view intersects, at the camera offset, so a 128x96 map costs the same per frame as the
  20x12 one; `drawMap`, unused since 0004, goes.

---

### Task 4: The loader, rule 13

**Files:**
- Create: `tests/fixtures/maps/spawn-on-solid.tmj`
- Modify: `src/engine/tiled.ts`, `tests/unit/tiled.test.ts`

**Interfaces — produces:**

```ts
// src/engine/tiled.ts (addition, before parseTileMap)
/** Rule 13: the spawn lies inside the map, on a cell that is not solid. The cell, not a box. */
function checkSpawn(
  spawn: Point,
  width: number,
  height: number,
  solid: readonly boolean[],
  file: string,
): void {
  const widthPx = width * TILE_SIZE;
  const heightPx = height * TILE_SIZE;
  if (spawn.x < 0 || spawn.y < 0 || spawn.x >= widthPx || spawn.y >= heightPx) {
    fail(file, `spawn (${spawn.x}, ${spawn.y}) is outside the map (${widthPx}x${heightPx} px)`);
  }
  const column = Math.floor(spawn.x / TILE_SIZE);
  const row = Math.floor(spawn.y / TILE_SIZE);
  if (solid[row * width + column] === true) {
    fail(file, `spawn (${spawn.x}, ${spawn.y}) is on a solid tile (${column}, ${row})`);
  }
}
```

In `parseTileMap`, after `solid` is built and before the `return`:
`checkSpawn(spawn, width, height, solid, mapFile);`.

The fixture, hand-made in Tiled's key order: a 20x12 map on `fixture-tiles.tsj`, `ground` all
tile 0 (gid 1) except cell (1, 2) = tile 1 (gid 2, solid), no `detail` or `above`, the spawn at
(24, 40):

```json
{
  "compressionlevel": -1,
  "height": 12,
  "infinite": false,
  "layers": [
    {
      "data": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      "height": 12,
      "id": 1,
      "name": "ground",
      "opacity": 1,
      "type": "tilelayer",
      "visible": true,
      "width": 20,
      "x": 0,
      "y": 0
    },
    {
      "draworder": "topdown",
      "id": 2,
      "name": "objects",
      "objects": [
        {
          "height": 0,
          "id": 1,
          "name": "spawn",
          "point": true,
          "rotation": 0,
          "type": "",
          "visible": true,
          "width": 0,
          "x": 24,
          "y": 40
        }
      ],
      "opacity": 1,
      "type": "objectgroup",
      "visible": true,
      "x": 0,
      "y": 0
    }
  ],
  "nextlayerid": 3,
  "nextobjectid": 2,
  "orientation": "orthogonal",
  "renderorder": "right-down",
  "tiledversion": "1.11.2",
  "tileheight": 16,
  "tilesets": [
    {
      "firstgid": 1,
      "source": "fixture-tiles.tsj"
    }
  ],
  "tilewidth": 16,
  "type": "map",
  "version": "1.10",
  "width": 20
}
```

(The `2` is the 42nd entry: index 41 = row 2 × 20 + column 1.)

- [ ] **Step 1: write the failing tests.** In the `parseTileMap rejects` describe of
  `tests/unit/tiled.test.ts`, append:

```ts
  it('a spawn on a solid tile (rule 13)', () => {
    const { file, json } = fixture('spawn-on-solid.tmj');
    expect(rejection(json, file)).toBe(`${file}: spawn (24, 40) is on a solid tile (1, 2)`);
  });

  it('a spawn outside the map (rule 13)', () => {
    const moved = (x: number, y: number) =>
      variant((m) => {
        for (const object of layer(m, 'objects').objects ?? []) {
          object.x = x;
          object.y = y;
        }
      });
    expect(rejection(moved(330, 40))).toBe(
      `${FILE}: spawn (330, 40) is outside the map (320x192 px)`,
    );
    expect(rejection(moved(40, 192))).toBe(
      `${FILE}: spawn (40, 192) is outside the map (320x192 px)`,
    );
    expect(rejection(moved(-1, 40))).toBe(`${FILE}: spawn (-1, 40) is outside the map (320x192 px)`);
  });

  it('accepts a spawn on the last pixel row, y = 191 (rule 13)', () => {
    const map = variant((m) => {
      for (const object of layer(m, 'objects').objects ?? []) {
        object.y = 191;
      }
    });
    expect(rejection(map)).toBe('(no error)');
  });
```

- [ ] **Step 2: run `npx vitest run tests/unit/tiled.test.ts`, see the three fail.**
- [ ] **Step 3: add `checkSpawn`** and its call; create the fixture; see everything pass — the
  corridor's spawn (40, 56) sits on open cell (2, 3), the test map's (136, 120) on grass (8, 7),
  so no other test moves.
- [ ] **Step 4: `npm run check`; commit** — `Reject a spawn outside the map or on a solid tile`;
  why: a figure that starts inside a wall never resolves out of it (the resolver of 0005 touches
  only an axis that moved), so the loader is where a bad spawn is caught, with the file in front.

---

### Task 5: The campus

**Files:**
- Create: `tools/campus-layout.ts`, `tools/gen-campus.ts`, `public/maps/campus.tmj`,
  `tests/unit/campus.test.ts`
- Modify: `package.json`

**Interfaces — produces:**

```ts
// tools/campus-layout.ts
import { EMPTY, type Point, TILE_SIZE } from '../src/engine/tiled.ts';

/**
 * The campus as data (feature 0006, world.md §1): rectangles of path and water on `ground`,
 * buildings and fences on `detail`, and the spawn. The tables of the feature spec are the
 * layout; this file mirrors them, one entry per row, columns c0–c1 and rows r0–r1 inclusive.
 * Pure — it returns the layers and the .tmj object; tools/gen-campus.ts writes the file. Retired
 * when the art pass takes the map over by hand in Tiled (visual.md §5).
 */

export const CAMPUS_WIDTH = 128;
export const CAMPUS_HEIGHT = 96;

/** Tileset ids of the placeholder tileset (architecture.md §7). */
export const GRASS = 0;
export const PATH = 1;
export const WALL = 2;
export const WATER = 3;
export const FENCE = 4;
export const DOOR = 5;
export const ROOF = 6;

/** A rectangle of cells as the spec's tables write it: columns c0–c1, rows r0–r1, both ends inclusive. */
export interface CellRect {
  readonly c0: number;
  readonly c1: number;
  readonly r0: number;
  readonly r1: number;
}

function cells(c0: number, c1: number, r0: number, r1: number): CellRect {
  return { c0, c1, r0, r1 };
}

export interface Area {
  readonly name: string;
  readonly cells: CellRect;
}

/** A block of roof tiles whose lowest row is wall, with its doors in that row. */
export interface Building {
  readonly name: string;
  readonly footprint: CellRect;
  /** Door cells; each lies in the footprint's last row. */
  readonly doors: readonly Point[];
}

/** The border of a rectangle, minus the gap cells. */
export interface Fence {
  readonly name: string;
  readonly ring: CellRect;
  readonly gaps: readonly Point[];
}

export const PATHS: readonly Area[] = [
  { name: 'courtyard', cells: cells(56, 71, 42, 51) },
  { name: 'west avenue', cells: cells(20, 55, 46, 48) },
  { name: 'east avenue', cells: cells(72, 107, 46, 48) },
  { name: 'north avenue', cells: cells(20, 107, 20, 22) },
  { name: 'west link', cells: cells(40, 42, 23, 45) },
  { name: 'east link', cells: cells(84, 86, 23, 45) },
  { name: 'south avenue', cells: cells(62, 65, 52, 75) },
  { name: 'parking road', cells: cells(22, 61, 72, 75) },
  { name: 'south-east avenue', cells: cells(66, 107, 72, 75) },
  { name: 'reception path', cells: cells(55, 61, 62, 62) },
  { name: 'parking lot', cells: cells(6, 23, 68, 89) },
];

export const WATERS: readonly Area[] = [
  { name: 'pond', cells: cells(30, 37, 62, 69) },
  { name: 'canal', cells: cells(120, 126, 1, 94) },
];

export const BUILDINGS: readonly Building[] = [
  {
    name: 'main building',
    footprint: cells(56, 71, 28, 41),
    doors: [
      { x: 64, y: 41 },
      { x: 57, y: 41 },
    ],
  },
  { name: "data protection officer's office", footprint: cells(46, 53, 41, 45), doors: [{ x: 49, y: 45 }] },
  { name: 'reception', footprint: cells(55, 60, 58, 61), doors: [{ x: 58, y: 61 }] },
  { name: 'sales', footprint: cells(90, 105, 38, 45), doors: [{ x: 97, y: 45 }] },
  { name: 'marketing', footprint: cells(70, 85, 64, 71), doors: [{ x: 77, y: 71 }] },
  { name: 'support', footprint: cells(92, 107, 64, 71), doors: [{ x: 99, y: 71 }] },
  { name: 'hr', footprint: cells(20, 35, 12, 19), doors: [{ x: 27, y: 19 }] },
  { name: 'accounting', footprint: cells(20, 35, 38, 45), doors: [{ x: 27, y: 45 }] },
  { name: 'development', footprint: cells(92, 111, 10, 19), doors: [{ x: 101, y: 19 }] },
  { name: 'meeting rooms', footprint: cells(90, 101, 26, 31), doors: [{ x: 95, y: 31 }] },
  { name: 'canteen', footprint: cells(40, 55, 64, 71), doors: [{ x: 47, y: 71 }] },
];

export const FENCES: readonly Fence[] = [
  { name: 'outer ring', ring: cells(0, 127, 0, 95), gaps: [] },
  {
    name: 'parking lot',
    ring: cells(5, 24, 67, 90),
    gaps: [
      { x: 24, y: 72 },
      { x: 24, y: 73 },
      { x: 24, y: 74 },
      { x: 24, y: 75 },
    ],
  },
  { name: 'meeting rooms', ring: cells(88, 103, 24, 34), gaps: [{ x: 95, y: 34 }] },
];

/** The spawn in pixels: tile (64, 45), in the courtyard in front of the main building's entrance. */
export const SPAWN: Point = { x: 1024, y: 734 };

function index(column: number, row: number): number {
  return row * CAMPUS_WIDTH + column;
}

function fill(layer: number[], rect: CellRect, id: number): void {
  for (let row = rect.r0; row <= rect.r1; row += 1) {
    for (let column = rect.c0; column <= rect.c1; column += 1) {
      layer[index(column, row)] = id;
    }
  }
}

/** Places a structure tile on `detail`; two structures never share a cell. */
function put(detail: number[], column: number, row: number, id: number, what: string): void {
  const at = index(column, row);
  if (detail[at] !== EMPTY) {
    throw new Error(`${what}: cell (${column}, ${row}) is already taken`);
  }
  detail[at] = id;
}

function onRing(rect: CellRect, column: number, row: number): boolean {
  return row === rect.r0 || row === rect.r1 || column === rect.c0 || column === rect.c1;
}

export interface CampusLayers {
  readonly ground: readonly number[];
  readonly detail: readonly number[];
}

/** The two layers as tileset ids, row-major; `detail` is EMPTY where nothing stands. */
export function buildLayers(): CampusLayers {
  const ground = new Array<number>(CAMPUS_WIDTH * CAMPUS_HEIGHT).fill(GRASS);
  const detail = new Array<number>(CAMPUS_WIDTH * CAMPUS_HEIGHT).fill(EMPTY);
  for (const path of PATHS) {
    fill(ground, path.cells, PATH);
  }
  for (const water of WATERS) {
    fill(ground, water.cells, WATER);
  }
  for (const { name, ring, gaps } of FENCES) {
    for (let row = ring.r0; row <= ring.r1; row += 1) {
      for (let column = ring.c0; column <= ring.c1; column += 1) {
        const gap = gaps.some((cell) => cell.x === column && cell.y === row);
        if (onRing(ring, column, row) && !gap) {
          put(detail, column, row, FENCE, `fence ${name}`);
        }
      }
    }
  }
  for (const { name, footprint, doors } of BUILDINGS) {
    const { c0, c1, r0, r1 } = footprint;
    for (const door of doors) {
      if (door.y !== r1 || door.x < c0 || door.x > c1) {
        throw new Error(`${name}: door (${door.x}, ${door.y}) is not in the wall row ${r1}`);
      }
    }
    for (let row = r0; row < r1; row += 1) {
      for (let column = c0; column <= c1; column += 1) {
        put(detail, column, row, ROOF, name);
      }
    }
    for (let column = c0; column <= c1; column += 1) {
      const door = doors.some((cell) => cell.x === column);
      put(detail, column, r1, door ? DOOR : WALL, name);
    }
  }
  return { ground, detail };
}

interface TileLayerJson {
  readonly data: readonly number[];
  readonly height: number;
  readonly id: number;
  readonly name: string;
  readonly opacity: 1;
  readonly type: 'tilelayer';
  readonly visible: true;
  readonly width: number;
  readonly x: 0;
  readonly y: 0;
}

interface SpawnJson {
  readonly height: 0;
  readonly id: 1;
  readonly name: 'spawn';
  readonly point: true;
  readonly rotation: 0;
  readonly type: '';
  readonly visible: true;
  readonly width: 0;
  readonly x: number;
  readonly y: number;
}

interface ObjectLayerJson {
  readonly draworder: 'topdown';
  readonly id: number;
  readonly name: 'objects';
  readonly objects: readonly SpawnJson[];
  readonly opacity: 1;
  readonly type: 'objectgroup';
  readonly visible: true;
  readonly x: 0;
  readonly y: 0;
}

/** The .tmj object, keys in Tiled's order (as Tiled 1.11 writes a map), so the file opens in Tiled. */
export interface MapJson {
  readonly compressionlevel: -1;
  readonly height: number;
  readonly infinite: false;
  readonly layers: readonly [TileLayerJson, TileLayerJson, ObjectLayerJson];
  readonly nextlayerid: number;
  readonly nextobjectid: number;
  readonly orientation: 'orthogonal';
  readonly renderorder: 'right-down';
  readonly tiledversion: '1.11.2';
  readonly tileheight: number;
  readonly tilesets: readonly [{ readonly firstgid: 1; readonly source: string }];
  readonly tilewidth: number;
  readonly type: 'map';
  readonly version: '1.10';
  readonly width: number;
}

/** Tileset ids as gids: EMPTY is 0, id n is n + 1 (firstgid 1). */
function gids(ids: readonly number[]): number[] {
  return ids.map((id) => (id === EMPTY ? 0 : id + 1));
}

function tileLayer(id: number, name: string, ids: readonly number[]): TileLayerJson {
  return {
    data: gids(ids),
    height: CAMPUS_HEIGHT,
    id,
    name,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: CAMPUS_WIDTH,
    x: 0,
    y: 0,
  };
}

export function campusJson(): MapJson {
  const { ground, detail } = buildLayers();
  return {
    compressionlevel: -1,
    height: CAMPUS_HEIGHT,
    infinite: false,
    layers: [
      tileLayer(1, 'ground', ground),
      tileLayer(2, 'detail', detail),
      {
        draworder: 'topdown',
        id: 3,
        name: 'objects',
        objects: [
          {
            height: 0,
            id: 1,
            name: 'spawn',
            point: true,
            rotation: 0,
            type: '',
            visible: true,
            width: 0,
            x: SPAWN.x,
            y: SPAWN.y,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
    nextlayerid: 4,
    nextobjectid: 2,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.2',
    tileheight: TILE_SIZE,
    tilesets: [{ firstgid: 1, source: '../tiles/placeholder.tsj' }],
    tilewidth: TILE_SIZE,
    type: 'map',
    version: '1.10',
    width: CAMPUS_WIDTH,
  };
}
```

```ts
// tools/gen-campus.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { campusJson } from './campus-layout.ts';

/**
 * `npm run gen-campus`: writes public/maps/campus.tmj from tools/campus-layout.ts. Deterministic,
 * and Node runs this TypeScript file directly. The layer data goes on one line per layer, as
 * Tiled writes it; JSON.stringify alone would write one cell per line, 12288 lines per layer.
 */

export function encodeCampus(): string {
  const dataLines: string[] = [];
  const text = JSON.stringify(
    campusJson(),
    (key, value: unknown) => {
      if (key === 'data' && Array.isArray(value)) {
        dataLines.push(`[${value.join(', ')}]`);
        return `__DATA_${dataLines.length - 1}__`;
      }
      return value;
    },
    2,
  );
  return `${text.replace(/"__DATA_(\d+)__"/g, (_match, i: string) => dataLines[Number(i)] ?? '')}\n`;
}

if (import.meta.main) {
  mkdirSync('public/maps', { recursive: true });
  writeFileSync('public/maps/campus.tmj', encodeCampus());
}
```

`package.json`, scripts: `"gen-campus": "node tools/gen-campus.ts",` after `gen-sprites`.

- [ ] **Step 1: write the failing test** `tests/unit/campus.test.ts` — acceptance criterion 9,
  one `it` per clause, and one for the meeting-room gap from the spec's reachability paragraph:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/engine/camera';
import { EMPTY, parseTileMap, parseTileset, type Point, type TileMap } from '../../src/engine/tiled';
import { BUILDINGS, DOOR, GRASS, PATH, SPAWN } from '../../tools/campus-layout.ts';
import { encodeCampus } from '../../tools/gen-campus.ts';

/**
 * The campus the game loads, read from public/ on purpose (testing.md §6 forbids generated
 * fixtures, not tests of the shipped content): the committed file equals the generator, and the
 * layout obeys the spec — closed buildings, reachable doors, a solid ring, a free spawn.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MAP_FILE = 'public/maps/campus.tmj';
const TILESET_FILE = 'public/tiles/placeholder.tsj';

function read(file: string): string {
  return readFileSync(join(ROOT, file), 'utf8');
}

const tileset = parseTileset(JSON.parse(read(TILESET_FILE)), TILESET_FILE);
const campus = parseTileMap(JSON.parse(read(MAP_FILE)), tileset, MAP_FILE);
const cell = (column: number, row: number): number => row * campus.width + column;

/** Which cells a figure reaches from `from` over open cells, four-connected; index → reached. */
function reachableFrom(map: TileMap, from: Point): boolean[] {
  const reached = new Array<boolean>(map.width * map.height).fill(false);
  const queue: number[] = [from.y * map.width + from.x];
  reached[from.y * map.width + from.x] = true;
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const column = next % map.width;
    const row = Math.floor(next / map.width);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const c = column + (dc ?? 0);
      const r = row + (dr ?? 0);
      if (c < 0 || r < 0 || c >= map.width || r >= map.height) {
        continue;
      }
      const at = r * map.width + c;
      if (!reached[at] && map.solid[at] !== true) {
        reached[at] = true;
        queue.push(at);
      }
    }
  }
  return reached;
}

/** The spawn's cell, (64, 45), and the cell in front of a door: the one below it. */
const SPAWN_CELL: Point = { x: 64, y: 45 };
const front = (door: Point): Point => ({ x: door.x, y: door.y + 1 });

describe('public/maps/campus.tmj (acceptance criterion 9)', () => {
  it('is generated deterministically and equals the committed file', () => {
    expect(encodeCampus()).toBe(encodeCampus());
    expect(read(MAP_FILE)).toBe(encodeCampus());
  });

  it('is 128x96 tiles with the spawn at (1024, 734)', () => {
    expect([campus.width, campus.height]).toStrictEqual([128, 96]);
    expect(campus.spawn).toStrictEqual(SPAWN);
    expect(SPAWN).toStrictEqual({ x: 1024, y: 734 });
  });

  it("every building's footprint is solid and its doors are door tiles with an open cell in front", () => {
    for (const { name, footprint, doors } of BUILDINGS) {
      for (let row = footprint.r0; row <= footprint.r1; row += 1) {
        for (let column = footprint.c0; column <= footprint.c1; column += 1) {
          expect(campus.solid[cell(column, row)], `${name} (${column}, ${row})`).toBe(true);
        }
      }
      expect(doors.length, name).toBeGreaterThan(0);
      for (const door of doors) {
        expect(campus.detail[cell(door.x, door.y)], `${name} door`).toBe(DOOR);
        expect(campus.solid[cell(front(door).x, front(door).y)], `${name} door front`).toBe(false);
      }
    }
  });

  it("every door's front cell and the parking lot are reachable from the spawn", () => {
    const reached = reachableFrom(campus, SPAWN_CELL);
    for (const { name, doors } of BUILDINGS) {
      for (const door of doors) {
        expect(reached[cell(front(door).x, front(door).y)], `${name} door front`).toBe(true);
      }
    }
    expect(reached[cell(14, 78)], 'the parking lot').toBe(true);
  });

  it('the meeting rooms are found, not on the way: their front is reached only through the gap (95, 34)', () => {
    expect(reachableFrom(campus, SPAWN_CELL)[cell(95, 32)]).toBe(true);
    const closed = campus.solid.map((solid, at) => solid || at === cell(95, 34));
    expect(reachableFrom({ ...campus, solid: closed }, SPAWN_CELL)[cell(95, 32)]).toBe(false);
  });

  it('the outer ring is solid', () => {
    for (let column = 0; column < campus.width; column += 1) {
      expect(campus.solid[cell(column, 0)], `(${column}, 0)`).toBe(true);
      expect(campus.solid[cell(column, 95)], `(${column}, 95)`).toBe(true);
    }
    for (let row = 0; row < campus.height; row += 1) {
      expect(campus.solid[cell(0, row)], `(0, ${row})`).toBe(true);
      expect(campus.solid[cell(127, row)], `(127, ${row})`).toBe(true);
    }
  });

  it("the spawn's box is free and row 45 is path from column 64 to 71", () => {
    // The box [1018, 1030) × [726, 734) covers cells (63, 45) and (64, 45).
    expect(campus.solid[cell(63, 45)]).toBe(false);
    expect(campus.solid[cell(64, 45)]).toBe(false);
    for (let column = 64; column <= 71; column += 1) {
      expect(campus.ground[cell(column, 45)], `(${column}, 45)`).toBe(PATH);
    }
  });

  it("the view's top-left cell at the spawn is grass with nothing on detail, on a tile corner", () => {
    // The box's centre is (1024, 730); the smoke test reads the surface's pixel (0, 0).
    const camera = cameraFor({ x: 1024, y: 730 }, { width: 2048, height: 1536 });
    expect(camera).toStrictEqual({ x: 864, y: 640 });
    expect([camera.x % 16, camera.y % 16]).toStrictEqual([0, 0]);
    expect(campus.ground[cell(54, 40)]).toBe(GRASS);
    expect(campus.detail[cell(54, 40)]).toBe(EMPTY);
  });
});
```

  `noUncheckedIndexedAccess` is why the direction tuple reads `dc ?? 0`; if Biome or `tsc`
  complain about the tuple, type it as `const DIRECTIONS: readonly (readonly [number, number])[]`
  and destructure.
- [ ] **Step 2: run it, see it fail** (modules and file missing).
- [ ] **Step 3: write** `tools/campus-layout.ts` and `tools/gen-campus.ts` as above, add the
  script, run `npm run gen-campus`; the file is about 75 KB and 72 lines. See the test pass. If
  "every building's footprint is solid" fails on a door cell, the door was placed before the
  wall row and overwritten — the wall row is placed cell by cell with the door decided per
  column, as above. If the determinism test fails after `npx biome check --write .`, Biome
  touched the `.tmj`; it must not (unknown extension) — check that the file is not named `.json`.
- [ ] **Step 4: `npm run check`.** The asset tests do not look at maps; the dist scan finds no
  URL in the file. Commit — `Generate the campus map`; why: the campus is the spec's tables as
  data, built into a Tiled-compatible file by a deterministic generator, so the layout is
  reviewed line by line against the spec and every reachability and closure rule is a number in
  a test; the generator retires at the art pass, as the tile generator will.

---

### Task 6: The game loads the campus; the test map becomes a fixture

**Files:**
- Move: `public/maps/test.tmj` → `tests/fixtures/maps/test.tmj` (`git mv`)
- Create: `tests/fixtures/maps/seven-tiles.tsj`
- Modify: `tests/fixtures/maps/test.tmj` (the tileset reference), `tests/unit/test-map.test.ts`,
  `src/main.ts`, `tests/e2e/smoke.spec.ts`

The fixture tileset, hand-made like `fixture-tiles.tsj`, seven tiles in one row, `solid` on
2–6, an image that is never loaded:

```json
{
 "columns":7,
 "image":"seven-tiles.png",
 "imageheight":16,
 "imagewidth":112,
 "margin":0,
 "name":"seven-tiles",
 "spacing":0,
 "tilecount":7,
 "tiledversion":"1.11.2",
 "tileheight":16,
 "tiles":[
        {
         "id":2,
         "properties":[
                {
                 "name":"solid",
                 "type":"bool",
                 "value":true
                }]
        },
        {
         "id":3,
         "properties":[
                {
                 "name":"solid",
                 "type":"bool",
                 "value":true
                }]
        },
        {
         "id":4,
         "properties":[
                {
                 "name":"solid",
                 "type":"bool",
                 "value":true
                }]
        },
        {
         "id":5,
         "properties":[
                {
                 "name":"solid",
                 "type":"bool",
                 "value":true
                }]
        },
        {
         "id":6,
         "properties":[
                {
                 "name":"solid",
                 "type":"bool",
                 "value":true
                }]
        }],
 "tilewidth":16,
 "type":"tileset",
 "version":"1.10"
}
```

- [ ] **Step 1: move the map.** `git mv public/maps/test.tmj tests/fixtures/maps/test.tmj`; in
  the moved file change `"source":"../tiles/placeholder.tsj"` to `"source":"seven-tiles.tsj"`
  and nothing else. Create `seven-tiles.tsj` as above.
- [ ] **Step 2: follow with the test.** In `tests/unit/test-map.test.ts`: `MAP_FILE` becomes
  `'tests/fixtures/maps/test.tmj'`, `tilesetFile` is `join('tests/fixtures/maps', source)`, the
  describe is named `'tests/fixtures/maps/test.tmj'`, and the file comment says: the test map of
  0003, kept as a fixture since 0006: three layers, a wall ring with a doorway, a roof on
  `above`, on a hand-made seven-tile tileset — the one fixture that exercises every layer and
  every tile id. Replace the first `it` with:

```ts
  it('references the hand-made seven-tile fixture tileset, never the real one', () => {
    expect(source).toBe('seven-tiles.tsj');
    expect(tileset.tileCount).toBe(7);
    expect(tileset.solid).toStrictEqual([false, false, true, true, true, true, true]);
  });
```

  The other five tests stay word for word.
- [ ] **Step 3: switch `main.ts`** to `const MAP_URL = '/maps/campus.tmj';`.
- [ ] **Step 4: the smoke spec.** In `tests/e2e/smoke.spec.ts`, the second test's poll message
  becomes `'the top-left pixel is grass #63c74d at tile (54, 40), the view's corner at the spawn: the map is drawn'`;
  the third test becomes:

```ts
test('one second of ArrowRight moves the figure and the camera right by at least 70 px', async ({
  page,
}) => {
  await page.goto('/');
  // The handle appears with the first frame; the figure starts at the campus spawn, x = 1024.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.player.x), {
      message: 'window.shadowAi.state.player.x is the spawn: the game runs',
    })
    .toBe(1024);
  expect(await page.evaluate(() => window.shadowAi?.state.camera)).toStrictEqual({
    x: 864,
    y: 640,
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1000);
  await page.keyboard.up('ArrowRight');
  const state = await page.evaluate(() => window.shadowAi?.state);
  // 60 steps of 1.333 px are 80; CI may drop a few frames. Row 45 is path to x = 1104.
  expect(state?.player.x).toBeGreaterThanOrEqual(1024 + 70);
  expect(state?.camera.x).toBeGreaterThanOrEqual(864 + 70);
  expect(state?.player.facing).toBe('right');
});
```

- [ ] **Step 5: `npm run check`; `npm run test:e2e`** — three green against the dev server.
  Then `npm run dev`, open `http://localhost:5173` in the browser pane and look: the figure in
  the courtyard, the facade with two doors along the top, grass left and right. Tap `D` a few
  times: the courtyard scrolls under the figure.
- [ ] **Step 6: commit** — `Load the campus and keep the test map as a fixture`; why: the game
  now opens on the campus, and the 0003 map stays as the one fixture with every layer and tile
  id, on its own hand-made tileset, because fixtures never reference the real content
  (`testing.md` §6).

---

### Task 7: Specification and README

**Files:**
- Modify: `docs/spec/architecture.md`, `docs/spec/world.md`, `docs/spec/testing.md`,
  `docs/plan.md`, `README.md`

- [ ] `architecture.md` §1: in the tree, under `public/maps/`, add that the campus,
  `campus.tmj`, is generated by `tools/gen-campus.ts` until the art pass; under `tools/`, add
  `campus-layout.ts` ("the campus as pure data: the rectangles of path, water, buildings and
  fences, and the spawn (`world.md` §1)") and `gen-campus.ts` ("writes it to `public/maps/`;
  `npm run gen-campus`").
- [ ] `architecture.md` §2: "Today that is `tick`, the logic steps since the start, and the
  player; later the current map id, the camera position, NPCs, …" → "…, the player and the
  camera; later the current map id, NPCs, …". After the collision paragraph add one on the
  camera: `camera` is the view's top-left corner in map pixels, two integers; `followPlayer`
  (`game/camera`, feature 0006) centres the 320x180 view on the collision box's centre, (x, y −
  4), clamps it to [0, mapWidth − 320] × [0, mapHeight − 180] and rounds (`engine/camera`,
  `cameraFor`); it is derived from the player after every step and from the spawn at the start,
  and kept in the state so a saved game comes back as it was left. `createInitialState(map)`
  lives in `game/update` beside `update`, so that `game/state` holds types and constants only.
- [ ] `architecture.md` §5: the sentence "The player's sprite has its top-left corner at
  (round(x) − 8, round(y) − 24)" → "… at (round(x) − 8 − camera.x, round(y) − 24 − camera.y)";
  after "the camera offset is rounded before drawing, never after." add: `drawLayer` draws cell
  (c, r) at (16c − camera.x, 16r − camera.y) and only the columns ⌊camera.x / 16⌋ … ⌊(camera.x +
  319) / 16⌋ and rows ⌊camera.y / 16⌋ … ⌊(camera.y + 179) / 16⌋, cut to the map — at most 21 × 13
  cells per layer; a cell at the view's edge is clipped by the surface. Away from the map's edges
  the figure sits at screen (152, 70) for every fractional position, because the camera and the
  sprite round the same value.
- [ ] `architecture.md` §6: in the first paragraph add that the campus, `public/maps/campus.tmj`,
  128x96 tiles, is generated from `tools/campus-layout.ts` until the art pass (§7) and opens in
  Tiled like any other map. Under "What the loader accepts" add "a spawn inside the map on a
  cell that is not solid"; under "What it rejects", after the spawn bullet, add "- a spawn
  outside the map, or on a solid cell."
- [ ] `architecture.md` §7: a paragraph after the sprite sheet: `tools/campus-layout.ts` holds
  the campus as data — the rectangles of path and water on `ground`, the buildings (roof rows,
  a wall row with its doors) and fence rings on `detail`, and the spawn, as the tables of feature
  0006 write them — and builds the two layers and the `.tmj` object with Tiled's keys;
  `tools/gen-campus.ts`, `npm run gen-campus`, writes `public/maps/campus.tmj`, deterministic,
  with each layer's data on one line as Tiled writes it. A unit test fails when the committed
  file and the generator disagree, and proves the layout: closed buildings, reachable doors, a
  solid outer ring, a free spawn. The file's whitespace is not Tiled's; a save in Tiled
  reformats it and fails that test, so until the art pass the layout changes in
  `campus-layout.ts`. When the art pass takes the campus over by hand (`visual.md` §5), the
  layout, the generator and the determinism test are removed and `campus.tmj` is authored in
  Tiled like every other map; the layout test's reachability and closure checks stay.
- [ ] `world.md` §1: after "… and detailed region by region." add a paragraph "**The map as
  built** (feature 0006)": 128x96 tiles, 2048x1536 px, in placeholder tiles, generated from
  `tools/campus-layout.ts` until the art pass. The main building stands north of the courtyard
  with the entrance and the server-room door in its ground floor; the data protection officer's
  office west of the courtyard, Sales east of it; HR and Accounting along the west, Development
  in the north-east, the meeting rooms behind a fence with one gap between Development and
  Sales; the reception south of the courtyard; the canteen by the pond and Marketing and
  Support along the south avenue; the parking lot, fenced, in the south-west; a canal along the
  east, a fence all round. Every building is closed. The player starts in the courtyard in front
  of the entrance. The tables in `docs/features/0006-camera-and-campus.md` are the layout until
  the art pass.
- [ ] `testing.md` §1, Unit row: "engine math (movement, collision, camera), among it the box
  resolver …" → add "and the camera: centring, the four clamps, the corners, rounding, the view
  constants"; "game rules (…)" → add "and the camera in the state: the spawn's camera, following
  the walk, the clamp on the small map"; "the map loader against Tiled JSON fixtures and the
  shipped test map" → "… and the test map fixture"; add "the campus map against its generator and
  the spec's layout: closed buildings, reachable doors, the solid ring, the free spawn, the view's
  first cell"; "the draw order of the map and of the scene" → "the cells a layer draws for a
  camera, and the draw order of the scene with the camera offset". Smoke row: "the picture's
  corner shows the map's first tile (grass `#63c74d`)" → "the picture's corner shows grass
  `#63c74d`, the view's first cell at the spawn"; "one second of ArrowRight moves the player by at
  least 70 px and leaves it facing right" → "the player starts at x = 1024 with the camera at
  (864, 640); one second of ArrowRight moves the player and the camera right by at least 70 px
  and leaves the player facing right".
- [ ] `testing.md` §2, INV-7 row: add "a spawn outside the map or on a solid tile" to the list of
  rejections.
- [ ] `testing.md` §6: "(a corridor with one solid tile, a map with an unknown layer)" → "(a
  corridor of solid tiles, a map with an unknown layer, the test map of 0003 on its own
  seven-tile tileset)".
- [ ] `plan.md` §4, M2: "M2 is done when 0006 is implemented." → "M2 is done: 0006 was the last
  of the six."
- [ ] `README.md`: status — after the 0005 sentence: "The camera follows the figure over the
  campus (feature 0006): 128x96 tiles, every region of the world as a footprint in placeholder
  tiles, every building closed. M2, walking the campus, is complete." Run block: add
  `npm run gen-campus   # regenerate the campus map under public/maps/`. The Tiled sentence:
  "Maps are edited in [Tiled](https://www.mapeditor.org/) 1.10 or newer. The campus,
  `public/maps/campus.tmj`, is generated until the art pass: change `tools/campus-layout.ts`,
  run `npm run gen-campus`, reload the page. It opens in Tiled for looking; a save there
  reformats the file and fails the generator test."
- [ ] Commit — `Record the camera and the campus as built`.

---

### Task 8: Acceptance

- [ ] Merge `origin/main` into the branch (`git fetch origin && git merge origin/main`). PR #10
  ("Mark 0005 implemented") carries the same commit this branch starts with, so the merge is
  clean whether or not it has landed. Rerun `npm run check`, `npm run test:e2e`, then
  `docker build -t shadow-ai .`, `docker run --rm -p 8080:8080 shadow-ai` and
  `BASE_URL=http://localhost:8080 npm run test:e2e`.
- [ ] Run the spec's acceptance plan, steps 1–14, and report every step with its result. The
  app's browser pane cannot hold a key down or go fullscreen (memory:
  acceptance-run-browser-limits), so: steps 1–2 in the pane (a screenshot for the author);
  steps 3–14 with a Playwright Chromium script run from the repository root
  (`require(require.resolve('@playwright/test', { paths: [process.cwd()] }))`, viewport 1920x1080,
  `deviceScaleFactor` 1, against the dev server): `keyboard.down` and `keyboard.up` with
  `waitForTimeout` for the holds, `page.evaluate(() => window.shadowAi.state)` for every
  position and the camera, a screenshot to the scratchpad after each expected result. The script
  does not teleport: `window.shadowAi.state` is replaced every frame, so the figure walks every
  route. Timings at 80 px/s, checked on 2026-11-11 against the resolver; a hold that ends at a
  wall or fence may be longer than the distance needs, the stop is the point:

  | Step | Hold | Expected feet (x, y) | Expected camera |
  |---|---|---|---|
  | 1–2 | — | (1024, 734), facing down | (864, 640) |
  | 3–4 | `KeyD` 2000 ms | (1184, 734) | (1024, 640); sprite at screen (152, 70) throughout |
  | 5 | `KeyA` 2000 ms | (1024, 734) | (864, 640) |
  | 5 | `KeyS` 350 ms | (1024, 762) | (864, 668) |
  | 5 | `KeyA` 4600 ms | (656, 762), in the west link | (496, 668) |
  | 5 | `KeyW` 5250 ms | (656, 342), on the north avenue | (496, 248) |
  | 5 | `KeyA` 6250 ms | (156, 342), on grass west of HR | (0, 248): the clamp holds x |
  | 5 | `KeyW` 4500 ms | (156, 24), stopped by the fence | (0, 0) |
  | 5–6 | `KeyA` 2000 ms | (22, 24), stopped by the fence | (0, 0); sprite at screen (14, 0) |
  | 7 | `KeyD` 1700 ms | (158, 24) | (0, 0) |
  | 7 | `KeyS` 3950 ms | (158, 340) | (0, 246) |
  | 7 | `KeyD` 6250 ms | (658, 340) | (498, 246) |
  | 7 | `KeyS` 5250 ms | (658, 760), on the west avenue | (498, 666) |
  | 7 | `KeyD` 4575 ms | (1024.67, 760), on the south avenue | (865, 666) |
  | 7 | `KeyS` 5400 ms | (1024.67, 1192), on the south-east avenue | (865, 1098) |
  | 7 | `KeyD` 11500 ms | (1914, 1192), stopped by the canal | (1728, 1098): the clamp holds x |
  | 7–8 | `KeyS` 4500 ms | (1914, 1520), stopped by the fence | (1728, 1356); sprite at screen (178, 140) |

  Step 2's expected picture, as pixels of the 320x180 surface (read the visible canvas at
  factor × the coordinate, or `getImageData` on the surface through the renderer's canvas): (0, 0)
  grass `#63c74d`; (0, 48) and (304, 48) grass — left and right of the courtyard; (32, 0) roof
  `#be4a2f`; (32, 16) wall `#8b9bb4`; (48, 16) and (160, 16) door `#733e39` — the server room and
  the entrance; (160, 48) and (160, 96) path `#e8b796`. "The whole screen is map": no pixel of the
  canvas is the page background `#181425`. Steps 9–10 and 12 (no seams, no flicker, no jitter):
  during each hold take three screenshots 300 ms apart and assert, per screenshot, that no pixel
  inside the canvas is `#181425` (a seam between tiles would show the clear colour) and that
  `(round(player.x) − camera.x, round(player.y) − camera.y)` is (160, 94) whenever the camera is
  not clamped — that is the no-jitter property. Steps 11–12: `page.keyboard.press('KeyF')` and
  check `document.fullscreenElement`; if headless Chromium refuses fullscreen, use a 1920x1080
  viewport as the stand-in for factor 6 (the canvas is 1920x1080) and say so, then
  `page.setViewportSize({ width: 1000, height: 600 })` for factor 3 (the canvas is 960x540) and
  repeat the seam and jitter checks while holding `KeyD` for a second. Steps 13–14, three doors
  from the spawn, each route starting at the spawn (walk back, or reload the page): the
  entrance — `KeyD` 100 ms, `KeyW` 1500 ms, stops at (1032, 680); the server-room door — `KeyA`
  1300 ms, `KeyW` 1500 ms, stops at (920, 680); the data protection officer's office — `KeyS`
  350 ms, `KeyA` 2900 ms, `KeyW` 500 ms, stops at (792, 744); the reception — `KeyS` 3450 ms,
  `KeyA` 1100 ms, `KeyW` 300 ms, stops at (936, 1000). Each stop proves the door is closed. For
  the other eight doors the campus test proves closure and reachability; say so in the report,
  and say which steps only the author can judge by eye: finding every region without help
  (steps 13–14), fullscreen itself (step 11), and the feel questions. Answer the feel questions
  with what the script shows — crossing the campus from fence to fence at 80 px/s takes 2048 /
  80 ≈ 26 s on x and 1536 / 80 ≈ 19 s on y.
- [ ] Push `feature/0006-camera-and-campus`; open the pull request against `main` with the step
  results, "no new dependency", and the attribution line. Bind the PR with the app's PR tools
  and read CI: both smoke runs (dev server and container) must be green.
- [ ] Hand back to the author for the acceptance run. The merge is the acceptance; then a
  follow-up sets `Status: implemented`, and M2 is complete.

## Self-review against the spec

- Scope "In": `engine/camera.ts` with `VIEW_WIDTH`, `VIEW_HEIGHT`, `cameraFor` and the renderer
  re-exports (T1); `GameState.camera`, `game/camera.ts` with `followPlayer`, `update` setting the
  camera, `createInitialState` in `update.ts` (T2); `drawLayer` with camera and culling,
  `drawMap` removed, `drawScene` subtracting the camera (T3); `campus-layout.ts`, `gen-campus.ts`,
  `npm run gen-campus`, `public/maps/campus.tmj` 128x96 on the placeholder tileset, regions
  exported (T5); `main.ts` loads the campus, the test map moves with `seven-tiles.tsj` and its
  test follows (T6); rule 13 (T4); the smoke spec on the campus (T6); the documents (T7). Scope
  "Out": nothing here enters a building, smooths the camera, shows text, carries densities, a
  map id, NPCs, doors that open, an `above` layer on the campus, or detail by hand.
- Behaviour "The camera": the target (x, y − 4) → `followPlayer`; clamp then round →
  `cameraFor` and the rounding test; the ranges [0, 1728] × [0, 1356] → the clamp tests; the
  320x180 and 320x192 cases → the small-map tests; set in `createInitialState` and `update` →
  T2; screen (152, 70) → the draw-scene camera test and the acceptance script's jitter check.
  "Drawing": the column and row ranges, 273 cells, the clipping, the integer positions, the
  draw order → T3. "The campus": the tables → `campus-layout.ts` verbatim; buildings as roof
  rows plus a wall row with doors → `buildLayers`; the spawn and its box → the campus test;
  reachability, the meeting-room gap, the outer ring → the campus test; the view's first cell →
  the campus test and the smoke spec. "The loader, rule 13": the two messages → T4. "The test
  map": the move and `seven-tiles.tsj` → T6.
- Acceptance criteria 1–10: 1 → T6 smoke, T8 steps 1–2; 2 → T3 draw-scene test, T8 steps 3–4;
  3 → T1 clamps, T8 steps 5–8; 4 → T8 steps 9–12; 5 → T5 reachability, T8 steps 13–14; 6 → T5
  closure, T8 door stops; 7 → T1, T2; 8 → T4; 9 → T5; 10 → T8.
- Test plan: `camera.test.ts` → T1, one `it` per bullet; `state.test.ts` → T2; `draw-map.test.ts`
  → T3; `draw-scene.test.ts` → T3; `tiled.test.ts` → T4; `test-map.test.ts` → T6;
  `campus.test.ts` → T5; the smoke spec → T6.
- Names used across tasks: `VIEW_WIDTH`, `VIEW_HEIGHT`, `PixelSize`, `cameraFor`, `followPlayer`,
  `createInitialState`, `update`, `drawLayer`, `drawScene`, `checkSpawn`, `cells`, `CellRect`,
  `Area`, `Building`, `Fence`, `PATHS`, `WATERS`, `BUILDINGS`, `FENCES`, `SPAWN`, `buildLayers`,
  `campusJson`, `encodeCampus`, `reachableFrom` — each defined once above and used with the same
  signature.

## Decisions by the planning session

Eight readings the spec leaves to the implementation, decided on 2026-11-11 so that the work
does not stop. The first corrects a number in the approved spec; none changes what the author
sees in the acceptance run.

1. **One number of the spec's test plan was wrong and is corrected in the same commit as this
   plan.** The spec said `followPlayer` on a 20x12 map yields (0, 0) at the spawn (136, 120). By
   the spec's own formula the target is (136, 116), 26 px below the view's centre, and the map
   allows 12, so the camera is (0, 12) — the spec's own sentence "on the smallest map the loader
   accepts, 320x192, x is always 0 and y lies in [0, 12]" says as much. The test plan now reads
   (0, 12) at the spawn, (0, 0) for feet at (160, 94), (0, 12) for feet at (300, 191). The initial
   state on the 20x12 map carries (0, 12) accordingly.
2. **`toBeCloseTo(1104, 6)` for the player after 60 steps.** 60 × 1.3333… is 1103.9999999999964
   in floating point; the camera, rounded, is exactly 944 and is asserted exactly.
3. **The map's size type is `PixelSize`, structurally like a `TileMap`.** TypeScript cannot keep
   a `TileMap` out of `cameraFor`; the name, the doc comment and the small-map tests in
   `state.test.ts` are the guard. `followPlayer` is the one place that converts tiles to pixels.
4. **The layout file mirrors the spec's tables, inclusive ranges, named entries.** `cells(c0, c1,
   r0, r1)` reads as the table reads, so a reviewer checks the file against the spec line by
   line; the names are not used by the game.
5. **The `.tmj` is `JSON.stringify` with two spaces and one line per layer's data.** Tiled's keys
   and key order, not Tiled's whitespace — the `.tsj` generator set the precedent, and a
   byte-exact copy of Tiled's writer would be work for no behaviour. A save in Tiled fails the
   determinism test; the README says to change the layout in `campus-layout.ts` until the art
   pass.
6. **One `it` beyond criterion 9**: the meeting rooms' front is unreachable once the gap
   (95, 34) is solid — the "found, not on the way" sentence of the spec's reachability
   paragraph, cheap to prove and easy to lose in a later edit of the layout.
7. **The test-map test's first assertion is replaced, not dropped.** It now proves the fixture
   tileset's shape (seven tiles, 2–6 solid) instead of the reference to the real tileset, so the
   moved test still says what its map is built on.
8. **Steps 13–14 of the acceptance plan are scripted for four doors.** The entrance, the
   server-room door, the data protection officer's office and the reception are walked and
   their stops asserted; the other eight doors are proven closed and reachable by the campus
   test, and the tour of every region is the author's by eye, as the spec's step 14 ("found
   without help") intends.

## Questions for the author

None.
