# 0023 — Implementation plan: the shadow over the regions

**Spec:**
[`docs/features/0023-the-shadow-over-the-regions.md`](../features/0023-the-shadow-over-the-regions.md)
(approved 2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §5, §6 and §7,
`docs/spec/visual.md` §4 and §5 and `docs/spec/testing.md` §5. **Written:** 2026-11-18 on the
planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** features 0021 and 0022 are merged into `main` (`e7f9335` or later). The
branch `feature/0023-the-shadow-over-the-regions` exists, cut from that `main`, and holds the
approval of 0023, the approved specs of 0024, 0025 and 0026, and this plan. Work on it; merge
the latest `main` into it before Task 1. The specs of 0024 to 0026 travel with this branch
and are **not** built here.

**Goal:** a room under shadow is drawn darker and without colour, under a violet veil whose
density is the region's; the reception, the break room and the corridors keep their colours.

**Approach:** six code tasks, each green on its own. The areas as a kind of rectangle and
the veil of a cell (T1). The ten areas of the floor (T2). The shadow tileset — the tileset in
six greys, one step darker (T3). The veil's sheet (T4). The scene: cells under shadow from
the shadow tileset, the veil over them (T5) — only after it does anything look different.
The smoke spec (T6). Then the documents (T7), the full check with the container (T8), the
walk (T9) and the pull request (T10).

**How this plan was checked:** the code and the tests of Tasks 1 to 6 were run once as a
prototype on 2026-11-18, on `main` at `e7f9335`, and then replayed task by task: after each
of the six tasks typecheck and Biome were clean and the unit tests green — 1055, 1062, 1071,
1079, 1091 and 1091 tests (1038 before). The smoke spec passed twice in a row against the dev
server. A picture of two parts of the floor was rendered from the prototype's two images and
looked at: the grey rooms and the three densities are told apart at a glance. The prototype
was thrown away; nothing of it is on the branch. If a step does not behave as written, the
cause is a difference to that state — stop and look; do not bend a test. The container was
**not** run with the prototype, and nobody has seen the feature in the running game.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No
new dependency.

## Global constraints

- **The state does not change.** `GameState` and `GameInput` get no field. The areas are
  read from `map.rects` on every call with `areasOf`; the veil of a cell is derived. The
  digest test of 0020 in `tests/unit/journal.test.ts` must hold unchanged.
- INV-2: `src/game/region.ts` imports nothing from `src/render/`, uses no DOM name and not
  the type `Language`.
- INV-6: `placeholder-shadow.png` uses only the five darker greys of the ramp and never
  `#68386c`; `shadow-veil.png` uses only `#68386c` and is the fourth shadow asset in the list
  of the asset test.
- INV-7: no coordinate of an area appears in `src/`. An area is a rectangle of
  `public/maps/floor.tmj`; `tools/floor-layout.ts` builds the ten from its rooms.
- `src/game/rects.ts` stays the one place that knows the prefixes.
- The shadow tileset has no `.tsj`. It is drawn with the tileset's ids and found beside the
  tileset's image by the name with `-shadow` before `.png`.
- A map without areas is drawn exactly as before: the scene passes no shadow to `drawLayer`
  and draws no veil. The scene tests of the earlier features must pass unchanged.
- Sprites are not touched: the player, the movers, the figures, the creatures, the walls
  and the traces are drawn from their own sheets, after the veil.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: the ramp `#181425`, `#262b44`, `#3a4466`, `#5a6988`,
  `#8b9bb4`, `#c0cbdc`; the weight 299 R + 587 G + 114 B; the grey is the ramp colour nearest
  in weight, then one step darker; the veil's frames hold 32, 64 and 128 pixels; the ten
  areas with the ids 106 to 115, `nextobjectid` 116; the veil is drawn after `detail` and
  before the cone, frame density − 1, at (16 × column − camera.x, 16 × row − camera.y).

## File structure

| File | Change |
|---|---|
| `src/game/rects.ts` | `REGION_PREFIX`; the third known kind |
| `src/game/region.ts` | new: `Area`, `areasOf`, `veilOf` |
| `src/game/update.ts` | `createInitialState` reads the areas, so that a faulty one stops the game |
| `tools/floor-layout.ts`, `public/maps/floor.tmj` | `REGION_AREAS`, `areaBox`; ten rectangles |
| `tools/placeholder-tiles.ts`, `tools/gen-tiles.ts`, `public/tiles/placeholder-shadow.png` | `SHADOW_RAMP`, `weightOf`, `shadowGrey`, `renderShadowTiles`, `encodeShadowPng` |
| `tools/placeholder-veil.ts`, `tools/gen-sprites.ts`, `public/sprites/shadow-veil.png` | new sheet |
| `src/render/draw-map.ts` | `Shadow`; `drawLayer` takes it; `drawVeil` |
| `src/render/draw-scene.ts`, `src/main.ts` | `shadowTileset`, `veilSheet`; the shadow in the scene |
| `tests/unit/region.test.ts`, `tests/unit/veil-sheet.test.ts` | new |
| `tests/unit/floor.test.ts`, `gen-tiles.test.ts`, `assets.test.ts`, `draw-map.test.ts`, `draw-scene.test.ts`, `draw-journal.test.ts`, `draw-help.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 7 |

---

### Task 1: The areas, and the veil of a cell

**Files:**
- Create: `src/game/region.ts`, `tests/unit/region.test.ts`
- Modify: `src/game/rects.ts`, `src/game/update.ts`

**Interfaces:**
- Consumes: `rectsOf` of `game/rects`; `densityOf` of `game/world`.
- Produces, in `game/rects`: `REGION_PREFIX = 'region:'`.
- Produces, in `game/region`: `interface Area { region: string; density: number; box: Box }`;
  `areasOf(rects: readonly NamedRect[]): Area[]`;
  `veilOf(areas: readonly Area[], column: number, row: number): number` — 0 for a cell that
  is not under shadow.

- [x] **Step 1: Create `tests/unit/region.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import type { NamedRect } from '../../src/engine/tiled';
import { REGION_PREFIX, rectsOf, TRACE_PREFIX, WALL_PREFIX } from '../../src/game/rects';
import { type Area, areasOf, veilOf } from '../../src/game/region';
import { wallsOf } from '../../src/game/shadow';
import { tracesOf } from '../../src/game/trace';
import { createInitialState } from '../../src/game/update';
import { grassMap } from './grass-map';

const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});
/** The cells (2, 2) to (9, 9), density 2, and (12, 2) to (17, 9), density 0. */
const HR = rect('region:hr', 32, 32, 128, 128);
const RECEPTION = rect('region:reception', 192, 32, 96, 128);

describe('the areas among the rectangles of a map (0023)', () => {
  it('are known by the prefix of the name', () => {
    expect(REGION_PREFIX).toBe('region:');
    const rects = [HR, rect('trace:sales', 160, 80, 16, 16), rect('shadow:hr', 32, 32, 48, 4)];
    expect(rectsOf(rects, REGION_PREFIX)).toStrictEqual([HR]);
    expect(rectsOf(rects, TRACE_PREFIX)).toHaveLength(1);
    expect(rectsOf(rects, WALL_PREFIX)).toHaveLength(1);
  });

  it('are skipped by the walls and the traces, and skip them', () => {
    const rects = [HR, rect('trace:sales', 160, 80, 16, 16), rect('shadow:hr', 32, 32, 48, 4)];
    expect(wallsOf(rects)).toHaveLength(1);
    expect(tracesOf(rects)).toHaveLength(1);
    expect(areasOf(rects)).toHaveLength(1);
  });

  it('do not excuse a rectangle of no known kind', () => {
    expect(() => areasOf([HR, rect('door:hr', 0, 0, 16, 16)])).toThrow(
      'unknown rectangle object "door:hr"',
    );
  });
});

describe('the areas of a map (0023)', () => {
  it('reads them in file order, each with its region, its density and its box', () => {
    expect(areasOf([RECEPTION, HR])).toStrictEqual([
      { region: 'reception', density: 0, box: { x: 192, y: 32, width: 96, height: 128 } },
      { region: 'hr', density: 2, box: { x: 32, y: 32, width: 128, height: 128 } },
    ]);
    expect(areasOf([])).toStrictEqual([]);
  });

  it('gives a region with two areas both of them', () => {
    const rooms = [
      rect('region:meeting-rooms', 0, 0, 32, 32),
      rect('region:meeting-rooms', 0, 32, 32, 48),
    ];
    expect(areasOf(rooms).map((area) => [area.region, area.density, area.box.y])).toStrictEqual([
      ['meeting-rooms', 1, 0],
      ['meeting-rooms', 1, 32],
    ]);
  });

  it('refuses a region the world data does not know', () => {
    expect(() => areasOf([rect('region:cellar', 32, 32, 128, 128)])).toThrow(
      'region region:cellar names no region',
    );
  });

  it.each([
    [1264, 418, 448, 416],
    [1270, 416, 448, 416],
    [1264, 416, 440, 416],
    [1264, 416, 448, 4],
  ])('refuses the box (%d, %d, %d, %d): it is not whole cells', (x, y, width, height) => {
    expect(() => areasOf([rect('region:sales', x, y, width, height)])).toThrow(
      `region region:sales (${x}, ${y}, ${width}, ${height}) is not whole cells`,
    );
  });

  it('refuses such a map before the game starts', () => {
    const map = grassMap(20, 12, { x: 40, y: 40 }, [], [rect('region:cellar', 32, 32, 128, 128)]);
    expect(() => createInitialState(map)).toThrow('region region:cellar names no region');
  });

  it('starts a map with areas like one without: the state has nothing of them', () => {
    const plain = grassMap(20, 12, { x: 40, y: 40 });
    const shadowed = grassMap(20, 12, { x: 40, y: 40 }, [], [HR, RECEPTION]);
    expect(createInitialState(shadowed)).toStrictEqual(createInitialState(plain));
  });
});

describe('the veil of a cell (0023)', () => {
  const areas = areasOf([HR, RECEPTION]);

  it("is the density of the area's region, on every cell of the area", () => {
    expect(veilOf(areas, 2, 2)).toBe(2);
    expect(veilOf(areas, 5, 5)).toBe(2);
    expect(veilOf(areas, 9, 9)).toBe(2);
    expect(veilOf(areas, 9, 2)).toBe(2);
    expect(veilOf(areas, 2, 9)).toBe(2);
  });

  it('is 0 beyond the last column and the last row, and before the first', () => {
    expect(veilOf(areas, 10, 5)).toBe(0);
    expect(veilOf(areas, 5, 10)).toBe(0);
    expect(veilOf(areas, 1, 5)).toBe(0);
    expect(veilOf(areas, 5, 1)).toBe(0);
  });

  it('is 0 in an area of a region without shadow, and where no area is', () => {
    expect(veilOf(areas, 12, 2)).toBe(0);
    expect(veilOf(areas, 17, 9)).toBe(0);
    expect(veilOf(areas, 19, 11)).toBe(0);
    expect(veilOf([], 5, 5)).toBe(0);
  });

  it('is the larger density where two areas overlap, in either order', () => {
    const thin: Area = { region: 'sales', density: 1, box: { x: 0, y: 0, width: 64, height: 64 } };
    const dense: Area = {
      region: 'development',
      density: 3,
      box: { x: 32, y: 32, width: 64, height: 64 },
    };
    for (const both of [
      [thin, dense],
      [dense, thin],
    ]) {
      expect(veilOf(both, 1, 1)).toBe(1);
      expect(veilOf(both, 2, 2)).toBe(3);
      expect(veilOf(both, 3, 3)).toBe(3);
      expect(veilOf(both, 4, 4)).toBe(3);
      expect(veilOf(both, 6, 6)).toBe(0);
    }
  });
});
```

- [x] **Step 2: Run it and see it fail.**

Run: `npx vitest run tests/unit/region.test.ts`
Expected: FAIL — `src/game/region` does not exist and `REGION_PREFIX` is not exported.

- [x] **Step 3: The third kind of rectangle,** in `src/game/rects.ts`:

```diff
--- a/src/game/rects.ts
+++ b/src/game/rects.ts
@@ -3,15 +3,17 @@
 /**
  * The kinds of rectangle a map may hold (architecture.md §6): what a rectangle is, is the
  * game's business, and its name says it. A shadow wall is `shadow:<region>` (0014), a trace
- * `trace:<region>` (0022). Pure.
+ * `trace:<region>` (0022), an area of a region `region:<id>` (0023). Pure.
  */
 
 /** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
 export const WALL_PREFIX = 'shadow:';
 /** A rectangle whose name starts with this is a trace; the rest of the name is its region. */
 export const TRACE_PREFIX = 'trace:';
+/** A rectangle whose name starts with this is an area of a region; the rest is the region (0023). */
+export const REGION_PREFIX = 'region:';
 
-const PREFIXES: readonly string[] = [WALL_PREFIX, TRACE_PREFIX];
+const PREFIXES: readonly string[] = [WALL_PREFIX, TRACE_PREFIX, REGION_PREFIX];
 
 /**
  * The rectangles of one kind, in the order of the map. Rejects a rectangle of no known kind,
```

- [x] **Step 4: Create `src/game/region.ts`:**

```ts
import type { Box } from '../engine/collision';
import { type NamedRect, TILE_SIZE } from '../engine/tiled';
import { REGION_PREFIX, rectsOf } from './rects';
import { densityOf } from './world';

/**
 * The areas of the regions (world.md §1, feature 0023). An area is a rectangle of the map
 * named `region:<id>`: whole cells that belong to a region of the world data. A region may
 * have several. A cell in an area of a region with shadow is under shadow, and its veil is the
 * region's density. Pure data and pure functions; the areas are read from the map's
 * rectangles on every call and kept nowhere.
 */

export interface Area {
  readonly region: string;
  /** The region's density, 0–3 (game/world); 0 is a region without shadow. */
  readonly density: number;
  /** Map pixels: whole cells. */
  readonly box: Box;
}

function isCells(box: Box): boolean {
  const onGrid = box.x % TILE_SIZE === 0 && box.y % TILE_SIZE === 0;
  const spans =
    box.width > 0 && box.height > 0 && box.width % TILE_SIZE === 0 && box.height % TILE_SIZE === 0;
  return onGrid && spans;
}

/**
 * The areas of a map, in the order of its rectangles. Rejects a region the world data does
 * not know and a box that is not whole cells.
 */
export function areasOf(rects: readonly NamedRect[]): Area[] {
  return rectsOf(rects, REGION_PREFIX).map((rect) => {
    const region = rect.name.slice(REGION_PREFIX.length);
    const density = densityOf(region);
    if (density === undefined) {
      throw new Error(`region ${rect.name} names no region`);
    }
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (!isCells(box)) {
      throw new Error(
        `region ${rect.name} (${box.x}, ${box.y}, ${box.width}, ${box.height}) is not whole cells`,
      );
    }
    return { region, density, box };
  });
}

/**
 * The veil of the cell (column, row): the density of the area it lies in, the largest when
 * areas overlap, and 0 when it lies in no area or only in areas without shadow. A cell with a
 * veil above 0 is under shadow.
 */
export function veilOf(areas: readonly Area[], column: number, row: number): number {
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  let veil = 0;
  for (const { density, box } of areas) {
    if (
      density > veil &&
      x >= box.x &&
      x < box.x + box.width &&
      y >= box.y &&
      y < box.y + box.height
    ) {
      veil = density;
    }
  }
  return veil;
}
```

- [x] **Step 5: Stop the game on a faulty area,** in `src/game/update.ts`. Add to the doc
  comment of `createInitialState` that an area of an unknown region or of a box that is not
  whole cells is rejected there too (0023).

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -7,6 +7,7 @@
 import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
 import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
 import { type GameInput, NO_INPUT, stepPlayer } from './player';
+import { areasOf } from './region';
 import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
 import { type GameState, type LampState, NO_RECOIL, type PlayerState } from './state';
 import { openDialogue, speakersOf, stepDialogue } from './talk';
@@ -29,6 +30,8 @@
   const routes = routesOf(map.points);
   checkRoutes(routes, map);
   const walls = wallsOf(map.rects);
+  // The areas of the regions are only drawn (0023); a map with a faulty one still does not start.
+  areasOf(map.rects);
   const figures = figuresOf(map.points);
   const player: PlayerState = {
     x: map.spawn.x,
```

- [x] **Step 6: Run the tests.**

Run: `npx vitest run tests/unit/region.test.ts tests/unit/shadow.test.ts tests/unit/trace.test.ts`
Expected: PASS — `region.test.ts` has 16 tests. Then `npm run test`: 1055 tests; the
architecture test now also checks `region.ts`.

- [x] **Step 7:** `npm run check`, then commit — `Read the areas of the regions from the map`.

---

### Task 2: The ten areas of the floor

**Files:**
- Modify: `tools/floor-layout.ts`, `public/maps/floor.tmj` (generated)
- Test: `tests/unit/floor.test.ts`

**Interfaces:**
- Consumes: `areasOf`, `veilOf` of Task 1.
- Produces, in `tools/floor-layout`: `REGION_AREAS`, `areaBox(rect: CellRect): Box`.

- [x] **Step 1: Change the floor tests.** Two tests of 0015 and 0022 learn that ten
  rectangles follow the traces, and a block of seven tests is added.

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -8,12 +8,14 @@
 import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
 import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
+import { areasOf, veilOf } from '../../src/game/region';
 import { standingWalls, wallsOf, withWalls } from '../../src/game/shadow';
 import { NO_RECOIL } from '../../src/game/state';
 import { speakerInReach, speakersOf, TALK_DISTANCE } from '../../src/game/talk';
 import { traceInLight, tracesOf } from '../../src/game/trace';
 import { createInitialState } from '../../src/game/update';
 import {
+  areaBox,
   type CellRect,
   CLOSED_DOORS,
   CORRIDORS,
@@ -24,6 +26,7 @@
   floorJson,
   HORIZONTAL_WALLS,
   POSTS,
+  REGION_AREAS,
   ROOMS,
   ROUTES,
   SHADOW_WALLS,
@@ -490,9 +493,9 @@
     ]);
     const json = floorJson();
     expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
-      Array.from({ length: 105 }, (_, i) => i + 1),
+      Array.from({ length: 115 }, (_, i) => i + 1),
     );
-    expect(json.nextobjectid).toBe(106);
+    expect(json.nextobjectid).toBe(116);
   });
 
   it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
@@ -1209,15 +1212,14 @@
     );
   });
 
-  it('are the last five objects of the file, rectangles with the ids 101 to 105', () => {
-    const objects = floorJson().layers[3].objects;
-    expect(objects).toHaveLength(105);
-    expect(objects.slice(100).map((object) => [object.id, object.name])).toStrictEqual(
+  it('are five rectangles with the ids 101 to 105, after the objects of 0017', () => {
+    // The areas of 0023 follow them.
+    const objects = floorJson().layers[3].objects.slice(100, 105);
+    expect(objects.map((object) => [object.id, object.name])).toStrictEqual(
       [101, 102, 103, 104, 105].map((id) => [id, 'trace:sales']),
     );
-    expect(objects.slice(100).some((object) => 'point' in object)).toBe(false);
-    expect(floorJson().nextobjectid).toBe(106);
-    expect(floor.rects).toHaveLength(13);
+    expect(objects.some((object) => 'point' in object)).toBe(false);
+    expect(floor.rects.slice(8, 13).every((rect) => rect.name === 'trace:sales')).toBe(true);
     expect(floor.points).toHaveLength(91);
   });
 
@@ -1290,5 +1292,123 @@
       expect(REGION_NAME[region], region).toBeDefined();
     }
     expect(createInitialState(floor).traces).toHaveLength(5);
+  });
+});
+
+describe('the areas of the regions on the floor (0023)', () => {
+  /** Region, the room's cells and its box, in file order: the spec's table. */
+  const TABLE: readonly (readonly [string, CellRect, Box, number])[] = [
+    ['hr', { c0: 1, c1: 21, r0: 1, r1: 19 }, { x: 16, y: 16, width: 336, height: 304 }, 2],
+    [
+      'accounting',
+      { c0: 22, c1: 43, r0: 1, r1: 19 },
+      { x: 352, y: 16, width: 352, height: 304 },
+      2,
+    ],
+    [
+      'development',
+      { c0: 44, c1: 84, r0: 1, r1: 19 },
+      { x: 704, y: 16, width: 656, height: 304 },
+      3,
+    ],
+    [
+      'meeting-rooms',
+      { c0: 89, c1: 106, r0: 1, r1: 9 },
+      { x: 1424, y: 16, width: 288, height: 144 },
+      1,
+    ],
+    [
+      'meeting-rooms',
+      { c0: 89, c1: 106, r0: 10, r1: 19 },
+      { x: 1424, y: 160, width: 288, height: 160 },
+      1,
+    ],
+    ['reception', { c0: 1, c1: 22, r0: 38, r1: 51 }, { x: 16, y: 608, width: 352, height: 224 }, 0],
+    [
+      'break-room',
+      { c0: 29, c1: 48, r0: 26, r1: 51 },
+      { x: 464, y: 416, width: 320, height: 416 },
+      0,
+    ],
+    ['sales', { c0: 79, c1: 106, r0: 26, r1: 51 }, { x: 1264, y: 416, width: 448, height: 416 }, 1],
+    ['marketing', { c0: 1, c1: 48, r0: 58, r1: 78 }, { x: 16, y: 928, width: 768, height: 336 }, 1],
+    [
+      'support',
+      { c0: 49, c1: 106, r0: 58, r1: 78 },
+      { x: 784, y: 928, width: 928, height: 336 },
+      1,
+    ],
+  ];
+  const areas = areasOf(floor.rects);
+
+  it('are the ten of the spec, each with its region, its box and its density', () => {
+    expect(areas).toStrictEqual(
+      TABLE.map(([region, , box, density]) => ({ region, density, box })),
+    );
+    expect(REGION_AREAS).toStrictEqual(TABLE.map(([region, cells]) => ({ region, cells })));
+    expect(REGION_AREAS.map((area) => areaBox(area.cells))).toStrictEqual(
+      TABLE.map(([, , box]) => box),
+    );
   });
+
+  it('are the last ten objects of the file, rectangles with the ids 106 to 115', () => {
+    const objects = floorJson().layers[3].objects;
+    expect(objects).toHaveLength(115);
+    expect(objects.slice(105).map((object) => [object.id, object.name])).toStrictEqual(
+      TABLE.map(([region], i) => [106 + i, `region:${region}`]),
+    );
+    expect(objects.slice(105).some((object) => 'point' in object)).toBe(false);
+    expect(floorJson().nextobjectid).toBe(116);
+    expect(floor.rects).toHaveLength(23);
+  });
+
+  it('leave the walls and the traces as they were', () => {
+    expect(wallsOf(floor.rects)).toHaveLength(8);
+    expect(tracesOf(floor.rects)).toHaveLength(5);
+    expect(floor.points).toHaveLength(91);
+  });
+
+  it('give every room of a region its area, with exactly the cells of the room', () => {
+    const rooms = ROOMS.filter(
+      (room) => !['lift', 'stairwell', "data protection officer's office"].includes(room.name),
+    );
+    expect(rooms.map((room) => room.cells)).toStrictEqual(TABLE.map(([, cells]) => cells));
+    expect(REGION_AREAS).toHaveLength(ROOMS.length - 3);
+  });
+
+  it('put the right veil on the cells of the spec', () => {
+    const veil = (column: number, row: number): number => veilOf(areas, column, row);
+    expect([veil(90, 30), veil(10, 70), veil(100, 70), veil(95, 5)]).toStrictEqual([1, 1, 1, 1]);
+    expect([veil(5, 5), veil(30, 10)]).toStrictEqual([2, 2]);
+    expect(veil(60, 10)).toBe(3);
+    // The reception, the break room, the west corridor, the officer's office and the lift.
+    expect([veil(10, 45), veil(40, 40), veil(25, 30), veil(10, 30), veil(55, 40)]).toStrictEqual([
+      0, 0, 0, 0, 0,
+    ]);
+  });
+
+  it('leave every cell of the corridors, the lift, the stairwell and the office without a veil', () => {
+    const open = [
+      ...CORRIDORS,
+      ...ROOMS.filter((room) =>
+        ['lift', 'stairwell', "data protection officer's office"].includes(room.name),
+      ),
+    ];
+    for (const { name, cells } of open) {
+      for (let row = cells.r0; row <= cells.r1; row += 1) {
+        for (let column = cells.c0; column <= cells.c1; column += 1) {
+          expect(veilOf(areas, column, row), `${name} (${column}, ${row})`).toBe(0);
+        }
+      }
+    }
+  });
+
+  it('put a veil on every cell of a shadowed room, its upper and its left wall included', () => {
+    for (const [region, cells, , density] of TABLE) {
+      expect(veilOf(areas, cells.c0, cells.r0), region).toBe(density);
+      expect(veilOf(areas, cells.c1, cells.r1), region).toBe(density);
+    }
+    // The wall below Sales lies on the cells of the south corridor: no veil.
+    expect(veilOf(areas, 90, 52)).toBe(0);
+  });
 });
```

- [x] **Step 2: Run and see it fail.**

Run: `npm run typecheck`
Expected: errors — `REGION_AREAS` and `areaBox` are not exported by the layout.

- [x] **Step 3: Build the areas from the rooms,** in `tools/floor-layout.ts`, then
  `npm run gen-floor`:

```diff
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -228,6 +228,41 @@
   { region: 'sales', cell: { x: 98, y: 46 } },
 ];
 
+/**
+ * The areas of the regions (0023): which room of the layout belongs to which region of the
+ * world data. The meeting rooms are one region with two rooms. The corridors, the lift, the
+ * stairwell and the data protection officer's office are no regions.
+ */
+const ROOM_REGIONS: Readonly<Record<string, string>> = {
+  hr: 'hr',
+  accounting: 'accounting',
+  development: 'development',
+  'meeting room north': 'meeting-rooms',
+  'meeting room south': 'meeting-rooms',
+  reception: 'reception',
+  'break room': 'break-room',
+  sales: 'sales',
+  marketing: 'marketing',
+  support: 'support',
+};
+
+/** Per area its region and the room's cells, in the order of ROOMS: the order in the file. */
+export const REGION_AREAS: readonly { readonly region: string; readonly cells: CellRect }[] =
+  ROOMS.flatMap((room) => {
+    const region = ROOM_REGIONS[room.name];
+    return region === undefined ? [] : [{ region, cells: room.cells }];
+  });
+
+/** The box of an area in map pixels: the room's cells, with its upper and its left wall. */
+export function areaBox(rect: CellRect): Box {
+  return {
+    x: rect.c0 * TILE_SIZE,
+    y: rect.r0 * TILE_SIZE,
+    width: (rect.c1 - rect.c0 + 1) * TILE_SIZE,
+    height: (rect.r1 - rect.r0 + 1) * TILE_SIZE,
+  };
+}
+
 /** The box of a trace in map pixels: its cell. */
 export function traceBox(cell: Point): Box {
   return { x: cell.x * TILE_SIZE, y: cell.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
@@ -1141,6 +1176,7 @@
   const firstWall = SNIPPETS.length + 3 + routes.length;
   const firstFigure = firstWall + SHADOW_WALLS.length;
   const firstTrace = firstFigure + FIGURES.length;
+  const firstArea = firstTrace + TRACES.length;
   return {
     compressionlevel: -1,
     height: FLOOR_HEIGHT,
@@ -1169,6 +1205,9 @@
           ...TRACES.map((trace, i) =>
             rectObject(firstTrace + i, `trace:${trace.region}`, traceBox(trace.cell)),
           ),
+          ...REGION_AREAS.map((area, i) =>
+            rectObject(firstArea + i, `region:${area.region}`, areaBox(area.cells)),
+          ),
         ],
         opacity: 1,
         type: 'objectgroup',
@@ -1178,7 +1217,7 @@
       },
     ],
     nextlayerid: 5,
-    nextobjectid: firstTrace + TRACES.length,
+    nextobjectid: firstArea + REGION_AREAS.length,
     orientation: 'orthogonal',
     renderorder: 'right-down',
     tiledversion: '1.11.2',
```

  `git diff --stat public/maps/floor.tmj` shows one file changed: ten objects with the ids
  106 to 115 and `nextobjectid` 116, nothing else.

- [x] **Step 4: Run the tests.** `npx vitest run tests/unit/floor.test.ts` — PASS. Then
  `npm run test`: 1062 tests. The game still looks as before: nothing draws the areas yet.

- [x] **Step 5:** `npm run check`, then commit — `Give every region of the floor its area`.

---

### Task 3: The shadow tileset

**Files:**
- Modify: `tools/placeholder-tiles.ts`, `tools/gen-tiles.ts`,
  `public/tiles/placeholder-shadow.png` (generated)
- Test: `tests/unit/gen-tiles.test.ts`

**Interfaces:**
- Produces, in `tools/placeholder-tiles`: `SHADOW_RAMP: readonly PaletteColour[]`,
  `weightOf(colour): number`, `shadowGrey(colour): PaletteColour`,
  `renderShadowTiles(): Uint8Array`; in `tools/gen-tiles`: `encodeShadowPng(): Buffer`.

- [x] **Step 1: Write the failing tests:**

```diff
--- a/tests/unit/gen-tiles.test.ts
+++ b/tests/unit/gen-tiles.test.ts
@@ -4,15 +4,19 @@
 import { PNG } from 'pngjs';
 import { describe, expect, it } from 'vitest';
 import { type Box, parseTileset } from '../../src/engine/tiled';
-import { encodePng, encodeTsj } from '../../tools/gen-tiles.ts';
+import { ENDESGA_32, SHADOW_COLOUR } from '../../src/render/palette';
+import { encodePng, encodeShadowPng, encodeTsj } from '../../tools/gen-tiles.ts';
 import {
   CARPET,
   CORRIDOR,
   DOOR_CLOSED,
+  renderShadowTiles,
   renderTiles,
+  SHADOW_RAMP,
   SHEET_COLUMNS,
   SHEET_HEIGHT,
   SHEET_WIDTH,
+  shadowGrey,
   TILE_KINDS,
   TILE_SIZE,
   tilesetJson,
@@ -21,6 +25,7 @@
   WALL_POST,
   WALL_TOP,
   WINDOW,
+  weightOf,
 } from '../../tools/placeholder-tiles.ts';
 
 const ROOT = fileURLToPath(new URL('../../', import.meta.url));
@@ -531,3 +536,91 @@
     expect(tileHex(data, id, x, y)).toBe(colour);
   });
 });
+
+describe('the shadow tileset (0023)', () => {
+  const SHADOW_FILE = join(ROOT, 'public/tiles/placeholder-shadow.png');
+  const tiles = renderTiles();
+  const shadow = renderShadowTiles();
+
+  it('has a ramp of six greys of the palette, from dark to light', () => {
+    expect(SHADOW_RAMP).toStrictEqual([
+      '#181425',
+      '#262b44',
+      '#3a4466',
+      '#5a6988',
+      '#8b9bb4',
+      '#c0cbdc',
+    ]);
+    const weights = SHADOW_RAMP.map(weightOf);
+    expect(weights).toStrictEqual([...weights].sort((a, b) => a - b));
+    expect(weightOf('#ffffff')).toBe(255000);
+    expect(weightOf('#181425')).toBe(299 * 0x18 + 587 * 0x14 + 114 * 0x25);
+  });
+
+  it('gives a colour the grey nearest in weight, one step darker', () => {
+    expect(shadowGrey('#8b9bb4')).toBe('#5a6988');
+    expect(shadowGrey('#e4a672')).toBe('#8b9bb4');
+    expect(shadowGrey('#3e8948')).toBe('#3a4466');
+    expect(shadowGrey('#ffffff')).toBe('#8b9bb4');
+    expect(shadowGrey('#262b44')).toBe('#181425');
+    expect(shadowGrey('#181425')).toBe('#181425');
+  });
+
+  it('gives every colour of the palette a grey of the ramp, and none the lightest', () => {
+    for (const colour of ENDESGA_32) {
+      expect(SHADOW_RAMP.slice(0, 5), colour).toContain(shadowGrey(colour));
+    }
+  });
+
+  it('has no colour of the palette exactly between two greys of the ramp', () => {
+    for (const colour of ENDESGA_32) {
+      const gaps = SHADOW_RAMP.map((grey) => Math.abs(weightOf(grey) - weightOf(colour)));
+      const nearest = Math.min(...gaps);
+      expect(
+        gaps.filter((gap) => gap === nearest),
+        colour,
+      ).toHaveLength(1);
+    }
+  });
+
+  it('is deterministic and matches the committed file', () => {
+    expect(encodeShadowPng().equals(encodeShadowPng())).toBe(true);
+    const committed = PNG.sync.read(readFileSync(SHADOW_FILE));
+    expect([committed.width, committed.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
+    expect(Buffer.from(shadow).equals(committed.data)).toBe(true);
+  });
+
+  it('keeps the size and the alpha of the tileset, pixel for pixel', () => {
+    expect(shadow).toHaveLength(tiles.length);
+    for (let offset = 3; offset < tiles.length; offset += 4) {
+      expect(shadow[offset]).toBe(tiles[offset]);
+    }
+  });
+
+  it('turns every opaque pixel into the grey of the pixel at its place', () => {
+    for (let y = 0; y < SHEET_HEIGHT; y += 1) {
+      for (let x = 0; x < SHEET_WIDTH; x += 1) {
+        if (tiles[(y * SHEET_WIDTH + x) * 4 + 3] === 0) {
+          continue;
+        }
+        const colour = hexAt(tiles, x, y) as (typeof ENDESGA_32)[number];
+        expect(hexAt(shadow, x, y), `(${x}, ${y})`).toBe(shadowGrey(colour));
+      }
+    }
+  });
+
+  it('makes the carpet darker and leaves the tileset itself as it was', () => {
+    expect(hexAt(tiles, tileX(CARPET), 0)).toBe('#8b9bb4');
+    expect(hexAt(shadow, tileX(CARPET), 0)).toBe('#5a6988');
+    expect(hexAt(shadow, tileX(CORRIDOR), 0)).toBe('#8b9bb4');
+    expect(encodePng().equals(readFileSync(PNG_FILE))).toBe(true);
+  });
+
+  it('never uses the shadow colour: the veil carries it', () => {
+    for (let y = 0; y < SHEET_HEIGHT; y += 1) {
+      for (let x = 0; x < SHEET_WIDTH; x += 1) {
+        expect(hexAt(shadow, x, y)).not.toBe(SHADOW_COLOUR);
+      }
+    }
+  });
+});
```

- [x] **Step 2: Run and see them fail.**

Run: `npm run typecheck`
Expected: errors — `renderShadowTiles`, `SHADOW_RAMP`, `shadowGrey`, `weightOf` and
`encodeShadowPng` are not exported.

- [x] **Step 3: The greys,** in `tools/placeholder-tiles.ts`, above `SolidProperty`:

```diff
--- a/tools/placeholder-tiles.ts
+++ b/tools/placeholder-tiles.ts
@@ -717,8 +717,60 @@
           data.set([...rgb(colour), 255], offset);
         }
       }
+    }
+  }
+  return data;
+}
+
+/** The greys a tile under shadow is drawn in (feature 0023), from dark to light. */
+export const SHADOW_RAMP: readonly PaletteColour[] = [
+  '#181425',
+  '#262b44',
+  '#3a4466',
+  '#5a6988',
+  '#8b9bb4',
+  '#c0cbdc',
+];
+
+/** How light a colour is, in whole numbers: 299 R + 587 G + 114 B. */
+export function weightOf(colour: PaletteColour): number {
+  const [r, g, b] = rgb(colour);
+  return 299 * r + 587 * g + 114 * b;
+}
+
+/**
+ * The grey of a colour under shadow: the colour of the ramp nearest in weight — the darker of
+ * two equally near — and from there one step darker; the darkest stays.
+ */
+export function shadowGrey(colour: PaletteColour): PaletteColour {
+  const weight = weightOf(colour);
+  let nearest = 0;
+  for (const [index, grey] of SHADOW_RAMP.entries()) {
+    const best = SHADOW_RAMP[nearest] ?? grey;
+    if (Math.abs(weightOf(grey) - weight) < Math.abs(weightOf(best) - weight)) {
+      nearest = index;
     }
   }
+  return SHADOW_RAMP[Math.max(nearest - 1, 0)] ?? colour;
+}
+
+function hex(r: number, g: number, b: number): PaletteColour {
+  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}` as PaletteColour;
+}
+
+/**
+ * The shadow tileset (feature 0023): the sheet of `renderTiles` with every opaque pixel turned
+ * into its grey. Same size, same tiles at the same places, the same transparent pixels.
+ */
+export function renderShadowTiles(): Uint8Array {
+  const data = renderTiles();
+  for (let offset = 0; offset < data.length; offset += 4) {
+    if (data[offset + 3] === 0) {
+      continue;
+    }
+    const colour = hex(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
+    data.set(rgb(shadowGrey(colour)), offset);
+  }
   return data;
 }
 
```

- [x] **Step 4: Write the file with the tileset,** in `tools/gen-tiles.ts`, then
  `npm run gen-tiles`. `placeholder.png` and `placeholder.tsj` do not change; only
  `public/tiles/placeholder-shadow.png` is new.

```diff
--- a/tools/gen-tiles.ts
+++ b/tools/gen-tiles.ts
@@ -1,10 +1,17 @@
 import { mkdirSync, writeFileSync } from 'node:fs';
 import { PNG } from 'pngjs';
-import { renderTiles, SHEET_HEIGHT, SHEET_WIDTH, tilesetJson } from './placeholder-tiles.ts';
+import {
+  renderShadowTiles,
+  renderTiles,
+  SHEET_HEIGHT,
+  SHEET_WIDTH,
+  tilesetJson,
+} from './placeholder-tiles.ts';
 
 /**
  * `npm run gen-tiles`: writes public/tiles/placeholder.png and placeholder.tsj from
- * tools/placeholder-tiles.ts. Deterministic — pngjs writes no timestamp — and Node runs this
+ * tools/placeholder-tiles.ts, and public/tiles/placeholder-shadow.png, the same sheet in the
+ * greys of a region under shadow (0023). Deterministic — pngjs writes no timestamp — and Node runs this
  * TypeScript file directly, without a transpiler.
  */
 
@@ -14,6 +21,13 @@
   return PNG.sync.write(png);
 }
 
+/** The shadow tileset (0023): it has no .tsj of its own and is drawn with the tileset's ids. */
+export function encodeShadowPng(): Buffer {
+  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
+  png.data = Buffer.from(renderShadowTiles());
+  return PNG.sync.write(png);
+}
+
 export function encodeTsj(): string {
   return `${JSON.stringify(tilesetJson(), null, 2)}\n`;
 }
@@ -21,5 +35,6 @@
 if (import.meta.main) {
   mkdirSync('public/tiles', { recursive: true });
   writeFileSync('public/tiles/placeholder.png', encodePng());
+  writeFileSync('public/tiles/placeholder-shadow.png', encodeShadowPng());
   writeFileSync('public/tiles/placeholder.tsj', encodeTsj());
 }
```

- [x] **Step 5: Run the tests.**

Run: `npx vitest run tests/unit/gen-tiles.test.ts tests/unit/assets.test.ts`
Expected: PASS — the asset test finds the new PNG palette-only, with alpha 0 or 255, sized
in multiples of 16. Then `npm run test`: 1071 tests.

- [x] **Step 6:** `npm run check`, then commit —
  `Render the tileset in the greys of a room under shadow`. The body says why the greys are
  one step darker: the carpet of the rooms is grey already.

---

### Task 4: The veil's sheet

**Files:**
- Create: `tools/placeholder-veil.ts`, `public/sprites/shadow-veil.png` (generated),
  `tests/unit/veil-sheet.test.ts`
- Modify: `tools/gen-sprites.ts`
- Test: `tests/unit/assets.test.ts`

**Interfaces:**
- Produces, in `tools/placeholder-veil`: `VEIL_FRAME_SIZE`, `VEIL_FRAMES`,
  `VEIL_SHEET_WIDTH`, `VEIL_SHEET_HEIGHT`, `veilInk(frame, i, j): boolean`, `renderVeil()`;
  in `tools/gen-sprites`: `encodeVeilPng()`.

- [x] **Step 1: Create `tests/unit/veil-sheet.test.ts`:**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { SHADOW_COLOUR } from '../../src/render/palette';
import { encodeVeilPng } from '../../tools/gen-sprites.ts';
import { rgb } from '../../tools/placeholder-tiles.ts';
import {
  renderVeil,
  VEIL_FRAME_SIZE,
  VEIL_FRAMES,
  VEIL_SHEET_HEIGHT,
  VEIL_SHEET_WIDTH,
  veilInk,
} from '../../tools/placeholder-veil.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const VEIL = renderVeil();
/** Whether pixel (i, j) of frame `frame` is opaque, and that an opaque pixel is the signature colour. */
function inked(frame: number, i: number, j: number): boolean {
  const at = (j * VEIL_SHEET_WIDTH + frame * VEIL_FRAME_SIZE + i) * 4;
  const [r, g, b, a] = VEIL.slice(at, at + 4);
  if (a === 0) {
    return false;
  }
  expect([r, g, b, a]).toStrictEqual([...rgb(SHADOW_COLOUR), 255]);
  return true;
}
const everyPixel = (visit: (i: number, j: number) => void): void => {
  for (let j = 0; j < VEIL_FRAME_SIZE; j += 1) {
    for (let i = 0; i < VEIL_FRAME_SIZE; i += 1) {
      visit(i, j);
    }
  }
};

describe('the placeholder veil generator (0023)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeVeilPng().equals(encodeVeilPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(join(ROOT, 'public/sprites/shadow-veil.png')));
    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
    expect(Buffer.from(VEIL).equals(committed.data)).toBe(true);
  });

  it('is 48x16: three 16x16 frames in one row, one per density', () => {
    expect([VEIL_SHEET_WIDTH, VEIL_SHEET_HEIGHT, VEIL_FRAME_SIZE, VEIL_FRAMES]).toStrictEqual([
      48, 16, 16, 3,
    ]);
    expect(VEIL).toHaveLength(48 * 16 * 4);
  });

  it('holds 32, 64 and 128 pixels of the signature colour, and nothing else', () => {
    const counts = [0, 1, 2].map((frame) => {
      let count = 0;
      everyPixel((i, j) => {
        count += inked(frame, i, j) ? 1 : 0;
      });
      return count;
    });
    expect(counts).toStrictEqual([32, 64, 128]);
  });

  it('puts the pixels where the spec says', () => {
    everyPixel((i, j) => {
      const dots = (i % 4 === 0 && j % 4 === 0) || (i % 4 === 2 && j % 4 === 2);
      expect(inked(0, i, j), `frame 0 (${i}, ${j})`).toBe(dots);
      expect(inked(1, i, j), `frame 1 (${i}, ${j})`).toBe((i + j) % 4 === 0);
      expect(inked(2, i, j), `frame 2 (${i}, ${j})`).toBe((i + j) % 2 === 0);
    });
    expect([veilInk(0, 0, 0), veilInk(0, 2, 2), veilInk(0, 2, 0)]).toStrictEqual([
      true,
      true,
      false,
    ]);
  });

  it('repeats every 4 px, so that the frames join without a seam', () => {
    for (let frame = 0; frame < VEIL_FRAMES; frame += 1) {
      everyPixel((i, j) => {
        expect(veilInk(frame, i, j)).toBe(veilInk(frame, (i + 4) % 16, j));
        expect(veilInk(frame, i, j)).toBe(veilInk(frame, i, (j + 4) % 16));
      });
    }
  });

  it('grows with the density: every pixel of a frame is in the next', () => {
    everyPixel((i, j) => {
      expect(!veilInk(0, i, j) || veilInk(1, i, j)).toBe(true);
      expect(!veilInk(1, i, j) || veilInk(2, i, j)).toBe(true);
    });
  });

  it('has no fourth frame', () => {
    everyPixel((i, j) => {
      expect(veilInk(3, i, j)).toBe(false);
    });
  });
});
```

- [x] **Step 2: Add the veil to the shadow assets** of the asset test:

```diff
--- a/tests/unit/assets.test.ts
+++ b/tests/unit/assets.test.ts
@@ -14,6 +14,7 @@
   'public/sprites/snippet.png',
   'public/sprites/shadow-wall.png',
   'public/sprites/trace.png',
+  'public/sprites/shadow-veil.png',
 ]);
 const rulesFor = (file: string) => ({
   ...RULES,
@@ -90,6 +91,7 @@
       'public/sprites/snippet.png',
       'public/sprites/shadow-wall.png',
       'public/sprites/trace.png',
+      'public/sprites/shadow-veil.png',
     ]);
   });
 
```

- [x] **Step 3: Run and see it fail.**

Run: `npm run typecheck`
Expected: errors — `tools/placeholder-veil.ts` does not exist and `encodeVeilPng` is not
exported.

- [x] **Step 4: Create `tools/placeholder-veil.ts`:**

```ts
import { SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder veil sheet (visual.md §4, feature 0023): the shadow over a region, three
 * 16x16 frames in one row, one per density. A frame is a pattern in the signature colour that
 * repeats every 4 px, so the frames join without a seam from cell to cell: 32, 64 and 128
 * pixels. The fourth shadow asset. Pure — it returns pixels; tools/gen-sprites.ts writes the
 * file.
 */

export const VEIL_FRAME_SIZE = 16;
export const VEIL_FRAMES = 3;
export const VEIL_SHEET_WIDTH = VEIL_FRAMES * VEIL_FRAME_SIZE;
export const VEIL_SHEET_HEIGHT = VEIL_FRAME_SIZE;

/** Whether pixel (i, j) of frame `frame` is veil: frame d − 1 is the veil of density d. */
export function veilInk(frame: number, i: number, j: number): boolean {
  switch (frame) {
    case 0:
      // Both multiples of 4, or both 2 more than one: one pixel in eight.
      return (i % 4 === 0 && j % 4 === 0) || (i % 4 === 2 && j % 4 === 2);
    case 1:
      // Diagonal lines: one pixel in four.
      return (i + j) % 4 === 0;
    case 2:
      // A checkerboard: every second pixel.
      return (i + j) % 2 === 0;
    default:
      return false;
  }
}

/** RGBA, row-major, VEIL_SHEET_WIDTH × VEIL_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderVeil(): Uint8Array {
  const data = new Uint8Array(VEIL_SHEET_WIDTH * VEIL_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < VEIL_FRAMES; frame += 1) {
    for (let j = 0; j < VEIL_FRAME_SIZE; j += 1) {
      for (let i = 0; i < VEIL_FRAME_SIZE; i += 1) {
        if (veilInk(frame, i, j)) {
          data.set(
            [...rgb(SHADOW_COLOUR), 255],
            (j * VEIL_SHEET_WIDTH + frame * VEIL_FRAME_SIZE + i) * 4,
          );
        }
      }
    }
  }
  return data;
}
```

- [x] **Step 5: Write the sheet with the others,** in `tools/gen-sprites.ts`, then
  `npm run gen-sprites`. Only `public/sprites/shadow-veil.png` is new.

```diff
--- a/tools/gen-sprites.ts
+++ b/tools/gen-sprites.ts
@@ -19,6 +19,7 @@
 import { renderSnippet, SNIPPET_SHEET_HEIGHT, SNIPPET_SHEET_WIDTH } from './placeholder-snippet.ts';
 import { renderTrace, TRACE_SHEET_HEIGHT, TRACE_SHEET_WIDTH } from './placeholder-trace.ts';
 import { renderVacuum, VACUUM_SHEET_HEIGHT, VACUUM_SHEET_WIDTH } from './placeholder-vacuum.ts';
+import { renderVeil, VEIL_SHEET_HEIGHT, VEIL_SHEET_WIDTH } from './placeholder-veil.ts';
 
 /**
  * `npm run gen-sprites`: writes public/sprites/player.png from tools/placeholder-player.ts and
@@ -30,7 +31,8 @@
  * public/sprites/shadow-wall.png of 0014 from tools/placeholder-shadow-wall.ts; and
  * public/sprites/font.png of 0016 from tools/placeholder-font.ts; and public/sprites/officer.png
  * of 0017 from tools/placeholder-person.ts; and public/sprites/trace.png of 0022 from
- * tools/placeholder-trace.ts. Deterministic — pngjs writes no timestamp — and Node
+ * tools/placeholder-trace.ts; and public/sprites/shadow-veil.png of 0023 from
+ * tools/placeholder-veil.ts. Deterministic — pngjs writes no timestamp — and Node
  * runs this TypeScript file directly, without a transpiler.
  */
 
@@ -108,6 +110,12 @@
   return PNG.sync.write(png);
 }
 
+export function encodeVeilPng(): Buffer {
+  const png = new PNG({ width: VEIL_SHEET_WIDTH, height: VEIL_SHEET_HEIGHT });
+  png.data = Buffer.from(renderVeil());
+  return PNG.sync.write(png);
+}
+
 if (import.meta.main) {
   mkdirSync('public/sprites', { recursive: true });
   writeFileSync('public/sprites/player.png', encodePng());
@@ -124,4 +132,5 @@
   writeFileSync('public/sprites/font.png', encodeFontPng());
   writeFileSync('public/sprites/officer.png', encodeOfficerPng());
   writeFileSync('public/sprites/trace.png', encodeTracePng());
+  writeFileSync('public/sprites/shadow-veil.png', encodeVeilPng());
 }
```

- [x] **Step 6: Run the tests.**

Run: `npx vitest run tests/unit/veil-sheet.test.ts tests/unit/assets.test.ts`
Expected: PASS. Then `npm run test`: 1079 tests.

- [x] **Step 7:** `npm run check`, then commit — `Draw the veil of the three densities`.

---

### Task 5: The shadow in the scene

**Files:**
- Modify: `src/render/draw-map.ts`, `src/render/draw-scene.ts`, `src/main.ts`
- Test: `tests/unit/draw-map.test.ts`, `tests/unit/draw-scene.test.ts`,
  `tests/unit/draw-journal.test.ts`, `tests/unit/draw-help.test.ts`

**Interfaces:**
- Consumes: `areasOf`, `veilOf` of Task 1; both images of Tasks 3 and 4.
- Produces, in `render/draw-map`:
  `interface Shadow { tileset: TilesetImage; veilOf: (column: number, row: number) => number }`;
  `drawLayer(renderer, map, tileset, name, camera, shadow?: Shadow)`;
  `drawVeil(renderer, map, sheet: SpriteSheet, camera, veilOf): void`.
- Produces, in `render/draw-scene`: `SceneContent.shadowTileset: TilesetImage`,
  `SceneContent.veilSheet: SpriteSheet`.

- [x] **Step 1: Write the failing tests.** In `draw-scene.test.ts` the recorder also notes
  which tileset a tile was drawn from, and a block of six tests is added. The three files
  that build a `SceneContent` give it the two new images.

```diff
--- a/tests/unit/draw-map.test.ts
+++ b/tests/unit/draw-map.test.ts
@@ -1,7 +1,7 @@
 import { describe, expect, it } from 'vitest';
 import { EMPTY, type TileMap } from '../../src/engine/tiled';
-import { drawLayer } from '../../src/render/draw-map';
-import type { Renderer, TilesetImage } from '../../src/render/renderer';
+import { drawLayer, drawVeil, type Shadow } from '../../src/render/draw-map';
+import type { Renderer, SpriteSheet, TilesetImage } from '../../src/render/renderer';
 import { grassMap } from './grass-map';
 import { solidsOf } from './solids';
 
@@ -120,3 +120,83 @@
     expect(renderer.calls).toStrictEqual([]);
   });
 });
+
+describe('a layer under shadow (0023)', () => {
+  const SHADOW_TILESET: TilesetImage = { image: {} as ImageBitmap, columns: 7 };
+  /** The left column of the 3x2 map is under a veil of 2; the rest is not. */
+  const shadow: Shadow = {
+    tileset: SHADOW_TILESET,
+    veilOf: (column) => (column === 0 ? 2 : 0),
+  };
+
+  it('draws a cell under shadow from the shadow tileset, with the same id at the same place', () => {
+    const plain = recordingRenderer();
+    drawLayer(plain, MAP, TILESET, 'ground', { x: 0, y: 0 });
+    const renderer = recordingRenderer();
+    drawLayer(renderer, MAP, TILESET, 'ground', { x: 0, y: 0 }, shadow);
+    expect(renderer.calls).toStrictEqual(plain.calls);
+    // Ground: (0, 0), (1, 0), (0, 1), (1, 1), (2, 1) — the cells of column 0 are the 1st and 3rd.
+    expect(renderer.tilesets).toStrictEqual([
+      SHADOW_TILESET,
+      TILESET,
+      SHADOW_TILESET,
+      TILESET,
+      TILESET,
+    ]);
+  });
+
+  it('does so on every layer', () => {
+    const renderer = recordingRenderer();
+    drawLayer(renderer, MAP, TILESET, 'detail', { x: 0, y: 0 }, shadow);
+    drawLayer(renderer, MAP, TILESET, 'above', { x: 0, y: 0 }, shadow);
+    expect(renderer.calls).toStrictEqual(['drawTile 4 at 16,16', 'drawTile 6 at 0,0']);
+    expect(renderer.tilesets).toStrictEqual([TILESET, SHADOW_TILESET]);
+  });
+
+  it('draws every cell from the tileset where no veil lies', () => {
+    const renderer = recordingRenderer();
+    drawLayer(
+      renderer,
+      MAP,
+      TILESET,
+      'ground',
+      { x: 0, y: 0 },
+      {
+        tileset: SHADOW_TILESET,
+        veilOf: () => 0,
+      },
+    );
+    expect(renderer.tilesets.every((tileset) => tileset === TILESET)).toBe(true);
+  });
+});
+
+describe('drawVeil (0023)', () => {
+  const VEIL: SpriteSheet = { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 };
+
+  it('draws the frame of the veil − 1 on every cell under shadow, row by row, empty cells too', () => {
+    const renderer = recordingRenderer();
+    // Column 0 has the veil 2, column 2 the veil 3; cell (2, 0) has no ground tile.
+    drawVeil(renderer, MAP, VEIL, { x: 0, y: 0 }, (column) => [2, 0, 3][column] ?? 0);
+    expect(renderer.calls).toStrictEqual([
+      'drawSprite 1 at 0,0',
+      'drawSprite 2 at 32,0',
+      'drawSprite 1 at 0,16',
+      'drawSprite 2 at 32,16',
+    ]);
+  });
+
+  it('shifts the veil by the camera and draws only the cells the view intersects', () => {
+    const renderer = recordingRenderer();
+    drawVeil(renderer, WIDE, VEIL, { x: 100, y: 50 }, (column, row) =>
+      column === 6 && row <= 4 ? 1 : 0,
+    );
+    // The view starts in cell (6, 3): rows 3 and 4 of column 6, at x = 96 − 100.
+    expect(renderer.calls).toStrictEqual(['drawSprite 0 at -4,-2', 'drawSprite 0 at -4,14']);
+  });
+
+  it('draws nothing where no cell has a veil', () => {
+    const renderer = recordingRenderer();
+    drawVeil(renderer, WIDE, VEIL, { x: 0, y: 0 }, () => 0);
+    expect(renderer.calls).toStrictEqual([]);
+  });
+});
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -54,19 +54,23 @@
 function recordingRenderer(): Renderer & {
   readonly calls: string[];
   readonly sheets: SpriteSheet[];
+  readonly tilesets: unknown[];
 } {
   const calls: string[] = [];
   const sheets: SpriteSheet[] = [];
+  const tilesets: unknown[] = [];
   return {
     calls,
     sheets,
+    tilesets,
     clear(colour) {
       calls.push(`clear ${colour}`);
     },
     fillRect(x, y, width, height, colour) {
       calls.push(`fillRect ${x},${y} ${width}x${height} ${colour}`);
     },
-    drawTile(_tileset, id, x, y) {
+    drawTile(tileset, id, x, y) {
+      tilesets.push(tileset);
       calls.push(`drawTile ${id} at ${x},${y}`);
     },
     drawSprite(sheet, frame, x, y) {
@@ -92,6 +96,8 @@
 const CONTENT: SceneContent = {
   map: MAP,
   tileset: { image: {} as ImageBitmap, columns: 7 },
+  shadowTileset: { image: {} as ImageBitmap, columns: 7 },
+  veilSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
   playerSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 },
   lampSheet: { image: {} as ImageBitmap, frameWidth: 48, frameHeight: 48 },
   creatureSheets: { snippet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 } },
@@ -1223,3 +1229,102 @@
     }
   });
 });
+
+describe('the shadow over the regions in the scene (0023)', () => {
+  /** The left column of the 3x2 map is HR, density 2; the middle column is the reception. */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...MAP,
+      rects: [
+        { name: 'region:hr', x: 0, y: 0, width: 16, height: 32 },
+        { name: 'region:reception', x: 16, y: 0, width: 16, height: 32 },
+      ],
+    },
+  };
+
+  it('draws the cells under shadow from the shadow tileset on all three layers', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, state({ x: 40, y: 30 }), content);
+    const tiles = renderer.calls.filter((call) => call.startsWith('drawTile'));
+    expect(tiles).toStrictEqual([
+      'drawTile 0 at 0,0',
+      'drawTile 1 at 16,0',
+      'drawTile 2 at 0,16',
+      'drawTile 2 at 16,16',
+      'drawTile 2 at 32,16',
+      'drawTile 4 at 16,16',
+      'drawTile 6 at 0,0',
+    ]);
+    expect(renderer.tilesets).toStrictEqual([
+      content.shadowTileset,
+      content.tileset,
+      content.shadowTileset,
+      content.tileset,
+      content.tileset,
+      content.tileset,
+      content.shadowTileset,
+    ]);
+  });
+
+  it('lays the veil of the density over them after detail and before the cone', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, state({ x: 40, y: 30 }, { x: 0, y: 0 }, true), content);
+    const detail = renderer.calls.indexOf('drawTile 4 at 16,16');
+    expect(renderer.calls.slice(detail + 1, detail + 3)).toStrictEqual([
+      'drawSprite 1 at 0,0',
+      'drawSprite 1 at 0,16',
+    ]);
+    expect(renderer.sheets.slice(0, 4)).toStrictEqual([
+      content.veilSheet,
+      content.veilSheet,
+      content.lampSheet,
+      content.playerSheet,
+    ]);
+  });
+
+  it('draws no veil over a region without shadow or outside every area', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, state({ x: 40, y: 30 }), content);
+    const veils = renderer.calls.filter(
+      (_call, i) => renderer.calls[i]?.startsWith('drawSprite') === true,
+    );
+    expect(renderer.sheets.filter((sheet) => sheet === content.veilSheet)).toHaveLength(2);
+    expect(veils).not.toContain('drawSprite 1 at 16,0');
+    expect(veils).not.toContain('drawSprite 1 at 32,16');
+  });
+
+  it('shifts the veil with the camera', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, state({ x: 40, y: 30 }, { x: 5, y: 7 }), content);
+    expect(renderer.calls).toContain('drawSprite 1 at -5,-7');
+    expect(renderer.calls).toContain('drawSprite 1 at -5,9');
+  });
+
+  it('draws the player, the movers and the creatures from their own sheets, over the veil', () => {
+    const renderer = recordingRenderer();
+    drawScene(
+      renderer,
+      {
+        ...state({ x: 8, y: 30 }),
+        movers: [mover({ kind: 'dog', x: 8, y: 10 })],
+        creatures: [{ species: 'snippet', x: 8, y: 25, light: 0, home: { x: 0, y: 0 } }],
+      },
+      content,
+    );
+    expect(renderer.sheets).toStrictEqual([
+      content.veilSheet,
+      content.veilSheet,
+      content.moverSheets.dog,
+      content.creatureSheets.snippet,
+      content.playerSheet,
+    ]);
+  });
+
+  it('draws a map without areas exactly as before: every tile from the tileset, no veil', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, state({ x: 40, y: 30 }), CONTENT);
+    expect(renderer.tilesets.every((tileset) => tileset === CONTENT.tileset)).toBe(true);
+    expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet]);
+  });
+});
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -61,6 +61,8 @@
 const CONTENT: SceneContent = {
   map: grassMap(20, 12, { x: 160, y: 96 }),
   tileset: { image: {} as ImageBitmap, columns: 7 },
+  shadowTileset: { image: {} as ImageBitmap, columns: 7 },
+  veilSheet: sheet(16, 16),
   playerSheet: sheet(16, 24),
   lampSheet: sheet(48, 48),
   creatureSheets: { snippet: sheet(16, 16) },
```

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -62,6 +62,8 @@
 const CONTENT: SceneContent = {
   map: grassMap(20, 12, { x: 184, y: 96 }, [{ name: 'figure:officer', x: 160, y: 96 }]),
   tileset: { image: {} as ImageBitmap, columns: 7 },
+  shadowTileset: { image: {} as ImageBitmap, columns: 7 },
+  veilSheet: sheet(16, 16),
   playerSheet: sheet(16, 24),
   lampSheet: sheet(48, 48),
   creatureSheets: { snippet: sheet(16, 16) },
```

- [x] **Step 2: Run and see them fail.**

Run: `npm run typecheck`
Expected: errors — `drawVeil` and `Shadow` are not exported, `drawLayer` takes five
arguments, and `shadowTileset` and `veilSheet` are no properties of `SceneContent`.

- [x] **Step 3: The layer and the veil,** in `src/render/draw-map.ts`:

```diff
--- a/src/render/draw-map.ts
+++ b/src/render/draw-map.ts
@@ -1,6 +1,6 @@
 import { VIEW_HEIGHT, VIEW_WIDTH } from '../engine/camera';
 import { EMPTY, type Point, TILE_SIZE, type TileLayerName, type TileMap } from '../engine/tiled';
-import type { Renderer, TilesetImage } from './renderer';
+import type { Renderer, SpriteSheet, TilesetImage } from './renderer';
 
 /** The first and last cell a span of `length` pixels from `offset` touches, cut to `count` cells. */
 function cellRange(offset: number, length: number, count: number): readonly [number, number] {
@@ -10,10 +10,18 @@
   ];
 }
 
+/** The shadow over the cells (0023): the tileset in greys, and each cell's veil — 0 for none. */
+export interface Shadow {
+  readonly tileset: TilesetImage;
+  readonly veilOf: (column: number, row: number) => number;
+}
+
 /**
  * Draws one layer as the camera sees it: every non-empty cell (column, row) the view
  * intersects, at (16 × column − camera.x, 16 × row − camera.y), row by row. At most 21 columns
  * and 13 rows; a cell at the view's edge is drawn partly off the surface and clipped by it.
+ * With a shadow, a cell under it is drawn from the shadow's tileset — the same id at the same
+ * place — and every other cell from the tileset (0023).
  */
 export function drawLayer(
   renderer: Renderer,
@@ -21,6 +29,7 @@
   tileset: TilesetImage,
   name: TileLayerName,
   camera: Point,
+  shadow?: Shadow,
 ): void {
   const [firstColumn, lastColumn] = cellRange(camera.x, VIEW_WIDTH, map.width);
   const [firstRow, lastRow] = cellRange(camera.y, VIEW_HEIGHT, map.height);
@@ -31,7 +40,41 @@
       if (id === undefined || id === EMPTY) {
         continue;
       }
-      renderer.drawTile(tileset, id, column * TILE_SIZE - camera.x, row * TILE_SIZE - camera.y);
+      const under = shadow !== undefined && shadow.veilOf(column, row) > 0;
+      renderer.drawTile(
+        under ? shadow.tileset : tileset,
+        id,
+        column * TILE_SIZE - camera.x,
+        row * TILE_SIZE - camera.y,
+      );
     }
   }
 }
+
+/**
+ * The veil (0023): on every cell under shadow the view intersects, the frame of its veil − 1,
+ * at the cell's place. Row by row, like a layer; a cell without a veil gets nothing.
+ */
+export function drawVeil(
+  renderer: Renderer,
+  map: TileMap,
+  sheet: SpriteSheet,
+  camera: Point,
+  veilOf: (column: number, row: number) => number,
+): void {
+  const [firstColumn, lastColumn] = cellRange(camera.x, VIEW_WIDTH, map.width);
+  const [firstRow, lastRow] = cellRange(camera.y, VIEW_HEIGHT, map.height);
+  for (let row = firstRow; row <= lastRow; row += 1) {
+    for (let column = firstColumn; column <= lastColumn; column += 1) {
+      const veil = veilOf(column, row);
+      if (veil > 0) {
+        renderer.drawSprite(
+          sheet,
+          veil - 1,
+          column * TILE_SIZE - camera.x,
+          row * TILE_SIZE - camera.y,
+        );
+      }
+    }
+  }
+}
```

- [x] **Step 4: The scene,** in `src/render/draw-scene.ts`:

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -7,6 +7,7 @@
 import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
 import { DARK_STEPS } from '../game/overview';
+import { areasOf, veilOf } from '../game/region';
 import { LIFT_STEPS, wallsOf } from '../game/shadow';
 import {
   type CreatureState,
@@ -25,7 +26,7 @@
 import { type Language, type TextKey, textKey, textOf } from '../text/text';
 import { drawHelp } from './draw-help';
 import { drawJournal } from './draw-journal';
-import { drawLayer } from './draw-map';
+import { drawLayer, drawVeil, type Shadow } from './draw-map';
 import { drawText } from './draw-text';
 import { GLYPH_HEIGHT, GLYPH_WIDTH } from './font';
 import { PAGE_BACKGROUND, type PaletteColour } from './palette';
@@ -41,6 +42,10 @@
 export interface SceneContent {
   readonly map: TileMap;
   readonly tileset: TilesetImage;
+  /** The tileset's sheet in the greys of a region under shadow: same size, same ids (0023). */
+  readonly shadowTileset: TilesetImage;
+  /** Three 16x16 frames: the veil of density 1, 2 and 3 (0023). */
+  readonly veilSheet: SpriteSheet;
   readonly playerSheet: SpriteSheet;
   /** Four 48x48 frames, one per facing in FACINGS order (0007). */
   readonly lampSheet: SpriteSheet;
@@ -339,7 +344,8 @@
 }
 
 /**
- * One frame: ground, detail, the cone when the lamp is on, the standing shadow walls in array
+ * One frame: ground and detail — a cell under shadow from the shadow tileset (0023) — the veil
+ * over the cells under shadow (0023), the cone when the lamp is on, the standing shadow walls in array
  * order (0014), the traces the light is on (0022), the ground movers whose feet are at or above
  * the player's, then the standing figures whose feet are at or above the player's (0017), the
  * creatures in array order, the player, the other standing figures, the other ground movers,
@@ -374,8 +380,16 @@
   const { language } = settings;
   const { player, camera } = state;
   renderer.clear(PAGE_BACKGROUND);
-  drawLayer(renderer, content.map, content.tileset, 'ground', camera);
-  drawLayer(renderer, content.map, content.tileset, 'detail', camera);
+  // A map without areas has no shadow, and is drawn exactly as before 0023.
+  const areas = areasOf(content.map.rects);
+  const veil = (column: number, row: number): number => veilOf(areas, column, row);
+  const shadow: Shadow | undefined =
+    areas.length === 0 ? undefined : { tileset: content.shadowTileset, veilOf: veil };
+  drawLayer(renderer, content.map, content.tileset, 'ground', camera, shadow);
+  drawLayer(renderer, content.map, content.tileset, 'detail', camera, shadow);
+  if (shadow !== undefined) {
+    drawVeil(renderer, content.map, content.veilSheet, camera, veil);
+  }
   if (state.lamp.on) {
     const origin = lampFrameOrigin(player, camera);
     renderer.drawSprite(content.lampSheet, lampFrame(player), origin.x, origin.y);
@@ -439,7 +453,7 @@
     state,
     content,
   );
-  drawLayer(renderer, content.map, content.tileset, 'above', camera);
+  drawLayer(renderer, content.map, content.tileset, 'above', camera, shadow);
   drawMovers(
     renderer,
     state.movers.filter((mover) => mover.kind === 'drone'),
```

- [x] **Step 5: Load the two images,** in `src/main.ts`:

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -44,6 +44,9 @@
 const DRONE_SHEET_URL = '/sprites/drone.png';
 const SHADOW_WALL_SHEET_URL = '/sprites/shadow-wall.png';
 const TRACE_SHEET_URL = '/sprites/trace.png';
+const VEIL_SHEET_URL = '/sprites/shadow-veil.png';
+/** The shadow tileset lies beside the tileset's image, with this before `.png` (0023). */
+const SHADOW_SUFFIX = '-shadow';
 const FONT_SHEET_URL = '/sprites/font.png';
 
 /**
@@ -58,9 +61,18 @@
   const tileset = parseTileset(await loadJson(tilesetUrl), tilesetUrl);
   const map = parseTileMap(mapJson, tileset, MAP_URL);
   const image = await loadImage(resolvePath(tileset.image, tilesetUrl));
+  const shadowImage = await loadImage(
+    resolvePath(tileset.image.replace(/\.png$/, `${SHADOW_SUFFIX}.png`), tilesetUrl),
+  );
   return {
     map,
     tileset: { image, columns: tileset.columns },
+    shadowTileset: { image: shadowImage, columns: tileset.columns },
+    veilSheet: {
+      image: await loadImage(VEIL_SHEET_URL),
+      frameWidth: TILE_SIZE,
+      frameHeight: TILE_SIZE,
+    },
     playerSheet: {
       image: await loadImage(PLAYER_SHEET_URL),
       frameWidth: FRAME_WIDTH,
```

- [x] **Step 6: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/draw-map.test.ts tests/unit/draw-scene.test.ts`
Expected: PASS. Then `npm run test`: 1091 tests. Every scene test of the earlier features
passes unchanged: their maps have no areas.

- [x] **Step 7:** `npm run check`, then commit — `Draw a room under shadow grey and veiled`.

---

### Task 6: The smoke spec

**Files:**
- Test: `tests/e2e/smoke.spec.ts`

- [x] **Step 1: Add the test** at the end of the file. A game that loads at all has both new
  images: `loadContent` fails otherwise. This test adds that the reception is not shadowed.

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -320,3 +320,24 @@
   await expect.poll(help, { message: 'a second press of H closes it' }).toBe(false);
   await page.keyboard.up('KeyH');
 });
+
+test('the reception keeps its colours: no shadow lies over it', async ({ page }) => {
+  await page.goto('/');
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.camera), {
+      message: 'the first view is the reception',
+    })
+    .toStrictEqual({ x: 96, y: 624 });
+  // Cell (7, 43) is carpet, with no furniture and on no route. Its corner is at (16, 64) on the
+  // surface, the factor is 4, and the corner pixel of the carpet tile is its base colour.
+  const canvas = page.locator('canvas#game');
+  await expect
+    .poll(
+      () =>
+        canvas.evaluate((element: HTMLCanvasElement) =>
+          Array.from(element.getContext('2d')?.getImageData(16 * 4, 64 * 4, 1, 1).data ?? []),
+        ),
+      { message: 'the pixel is the carpet #8b9bb4, not its grey under shadow #5a6988' },
+    )
+    .toStrictEqual([0x8b, 0x9b, 0xb4, 255]);
+});
```

- [x] **Step 2: Run.**

Run: `npm run test:e2e`
Expected: PASS — fourteen tests, three skipped (they need the container). The test of 0015
on the shirt of the reception's colleague still passes.

- [x] **Step 3:** `npm run check`, then commit — `Check the reception's colours in the smoke spec`.

---

### Task 7: The documents

**Files:**
- Modify: `docs/spec/world.md`, `docs/spec/architecture.md`, `docs/spec/visual.md`,
  `docs/spec/testing.md`, `README.md`

- [x] **Step 1: `world.md` §1,** at "Shadow density": add a paragraph **As built** (feature
  0023): every region has an area in the map — its room as the layout knows it, with its
  upper and its left wall; the meeting rooms have two; a room whose region has a density
  above 0 is under shadow and is drawn so; the corridors, the lift, the stairwell and the
  data protection officer's office are no regions. Lifting a doorway's shadow wall does not
  change the room behind it.

- [x] **Step 2: `architecture.md`.** §1 directory list: `game/region.ts`,
  `tools/placeholder-veil.ts`. §5: the draw order with the shadow — a cell under shadow from
  the shadow tileset on `ground`, `detail` and `above`, the veil after `detail` and before
  the cone, frame density − 1; `SceneContent.shadowTileset` and `veilSheet`; a map without
  areas is drawn as before. §6: the third kind of rectangle, `region:<id>` — whole cells; a
  region may have several; the two refusals of `game/region`, each with its message; the
  veil of a cell and the larger density where areas overlap. §7: the shadow tileset —
  generated with the tileset, no `.tsj`, found by the name with `-shadow`; the veil's sheet.

- [x] **Step 3: `visual.md`.** §4, "Shadowed and cleared": as built (feature 0023) — the
  ramp of six greys, the weight, nearest and one step darker; the veil's three frames with
  their pixel counts, standing still; people and everything that is no tile keep their
  colours; a cleared region is 0025. The list of shadow assets names four. §5: the generator
  writes the shadow tileset beside the tileset.

- [x] **Step 4: `testing.md` §2.** The INV-6 row names four shadow assets and the shadow
  tileset: every opaque pixel the grey of the pixel at its place. The INV-7 row gains: an
  area of an unknown region and an area that is not whole cells are refused, each with its
  message, and a test holds the floor's ten areas to its rooms.

- [x] **Step 5: `README.md`:** one sentence after the one on the traces — the regions under
  shadow are drawn darker, without colour and under a violet veil whose density is the
  region's (feature 0023).

- [x] **Step 6:** `npm run check`, then commit — `Move the shadow over the regions into the spec`.

---

### Task 8: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 8 in this file and commit —
  `Tick the full check of 0023`.

---

### Task 9: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp. The start hint of the
  help (0021) is at the bottom for the first ten seconds; it is not part of this walk. Wait
  until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–20 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 8, and start again at step 1.
- [ ] **Step 4:** after step 20 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–20`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0023`. A feel note that wants something
  else — lighter or darker rooms, another veil, grey people, a veil that moves — becomes a
  new draft, not a change on this branch. This is the feature whose look nobody has seen in
  the running game: expect notes, and record them exactly.

---

### Task 10: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 8. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M5 section, say that 0022 and
  0023 are implemented and 0024, 0025 and 0026 approved; commit — `Mark 0023 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0023: the shadow over the regions`, with the walk's result and feel notes in its
  description, and one line that the branch also carries the approved specs of 0024, 0025
  and 0026 and a sentence added to `docs/spec/vision.md` §2. CI must be green. The author
  merges.
