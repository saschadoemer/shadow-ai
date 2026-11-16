# 0014 — Implementation plan: shadow walls and density

**Spec:** [`docs/features/0014-shadow-walls-and-density.md`](../features/0014-shadow-walls-and-density.md)
(approved 2026-11-16). The plan argues from the spec; where they differ, the spec wins. Read the
spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §2, §5, §6 and §7 and
`docs/spec/testing.md` §5. **Written:** 2026-11-16 on the planning model. A working document,
not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0015 is merged into `main` (`38e702f` or later). The branch
`feature/0014-shadow-walls-and-density` exists, cut from that `main`, and holds the draft, the
approval and this plan. Work on it; merge the latest `main` into it before Task 1.

**Goal:** every region of the floor has a density in the world data; eight shadow walls read
from the map close the doorways of the regions under shadow; the lamp lifts a wall it is strong
enough for after 60 steps of unbroken light; the gating order is tested (INV-7).

**Approach:** eight code tasks, each green on its own. The world data and its check (T1). The
loader learns rectangle objects (T2). `game/shadow` reads the walls and tests the light (T3),
then steps them and makes them solid, and the state carries them (T4) — all pure, tested
without a browser. Then the data: the eight rectangles in the floor generator (T5). Then the
picture (T6), the scene (T7) and the smoke spec (T8). Then the documents (T9), the full check
with the container (T10), the walk (T11) and the pull request (T12).

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- INV-1: `GameState.lamp.strength` and `GameState.shadowWalls` are plain data. The walls are
  **not** in the state and **not** cached in a module: `update` and `drawScene` build them from
  `map.rects` on every call with `wallsOf`, which parses eight names. Do not add a cache, a
  `Map` at module level or a field on `TileMap` beyond `rects`.
- INV-2: `src/game/world.ts` and `src/game/shadow.ts` import nothing from `src/render/` and use
  no DOM name.
- INV-4: no visible text is added.
- INV-6: `shadow-wall.png` uses `#68386c` and `#181425` only and joins the list of shadow
  assets. No other PNG changes, and no other PNG may use `#68386c` but the snippet.
- INV-7: a wall's box comes from `public/maps/floor.tmj`, its density from
  `src/game/world.ts`. No coordinate of a wall appears in `src/`.
- Two maps in one step. The figure, the push and the creatures are stepped against the map
  **with** the standing walls (`withWalls`). The light test of a wall, the camera, the movers
  and the dark use the map **as loaded**. Do not mix them up: against the map with walls, a
  wall would block its own light.
- No `any`, no `@ts-ignore`. `exactOptionalPropertyTypes` and unchecked index access are on.
- No tile changes and no point moves: the three tile layers of `floor.tmj` and its 91 point
  objects stay byte for byte as 0015 left them.
- Commits: imperative subject, a body that says why, signed (run `git commit` outside the
  sandbox). Format with `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: `BASE_STRENGTH` 1; densities 0 for `reception` and
  `break-room`, 1 for `sales`, `marketing`, `support` and `meeting-rooms`, 2 for `hr` and
  `accounting`, 3 for `development`; upgrades `wide-cone` earned in `marketing` and `filter`
  earned in `hr`; a wall is 4 px thick; `LIFT_STEPS` 60; the looks change at `light` 20 and
  40; a wall flickers every 15 steps; the sheet is 256x16 with sixteen 16x16 frames; the
  rectangles have the ids 92–99 and `nextobjectid` is 100.

## File structure

| File | Responsibility |
|---|---|
| `src/game/world.ts` (create) | regions and densities, the lamp's base strength, the upgrades, `gatingFaults` |
| `src/engine/tiled.ts` (modify) | `NamedRect`, `TileMap.rects`, read from the `objects` layer |
| `src/game/state.ts` (modify) | `LampState.strength`, `ShadowWallState`, `GameState.shadowWalls` |
| `src/game/shadow.ts` (create) | walls from rectangles, the light test, the step, the map with walls |
| `src/game/update.ts` (modify) | walls in the initial state and in the step |
| `src/game/overview.ts` (modify) | the wake resets the standing walls; the lamp keeps its strength |
| `tools/floor-layout.ts` (modify) | `SHADOW_WALLS` and the eight rectangle objects |
| `tools/placeholder-shadow-wall.ts` (create) | the sheet as pure pixel data |
| `tools/gen-sprites.ts` (modify) | writes `shadow-wall.png` |
| `src/render/draw-scene.ts` (modify) | the walls' looks, segments and place in the draw order |
| `src/main.ts` (modify) | loads the sheet |
| `tests/unit/world.test.ts`, `tests/unit/shadow.test.ts` (create) | world data; reading, light, step |
| `tests/fixtures/maps/walls.tmj` and four rejected maps (create) | rectangle objects |

---

### Task 1: The world data

**Files:**
- Create: `src/game/world.ts`, `tests/unit/world.test.ts`

**Interfaces:**
- Produces: `Region { id, density }`, `Upgrade { id, earnedIn }`, `BASE_STRENGTH`,
  `MAX_DENSITY`, `REGIONS`, `UPGRADES`, `strengthAfter(earned: number): number`,
  `densityOf(id: string, regions?: readonly Region[]): number | undefined`,
  `gatingFaults(regions: readonly Region[], upgrades: readonly Upgrade[]): string[]`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/world.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  BASE_STRENGTH,
  densityOf,
  gatingFaults,
  MAX_DENSITY,
  REGIONS,
  strengthAfter,
  UPGRADES,
  type Upgrade,
} from '../../src/game/world';

const WIDE_CONE: Upgrade = { id: 'wide-cone', earnedIn: 'marketing' };
const FILTER: Upgrade = { id: 'filter', earnedIn: 'hr' };

describe('the world data (0014)', () => {
  it('gives every region of the floor its density', () => {
    expect(REGIONS).toStrictEqual([
      { id: 'reception', density: 0 },
      { id: 'break-room', density: 0 },
      { id: 'sales', density: 1 },
      { id: 'marketing', density: 1 },
      { id: 'support', density: 1 },
      { id: 'meeting-rooms', density: 1 },
      { id: 'hr', density: 2 },
      { id: 'accounting', density: 2 },
      { id: 'development', density: 3 },
    ]);
  });

  it('lists the two upgrades in the order they are earned, each with its region', () => {
    expect(UPGRADES).toStrictEqual([WIDE_CONE, FILTER]);
  });

  it('starts the lamp at strength 1 and raises it by 1 with every upgrade', () => {
    expect([BASE_STRENGTH, MAX_DENSITY]).toStrictEqual([1, 3]);
    expect([0, 1, 2].map(strengthAfter)).toStrictEqual([1, 2, 3]);
  });

  it('looks a density up by the region id, and knows no other id', () => {
    expect(densityOf('hr')).toBe(2);
    expect(densityOf('reception')).toBe(0);
    expect(densityOf('cellar')).toBeUndefined();
  });
});

describe('gatingFaults: no region needs an upgrade that cannot be earned before it (INV-7)', () => {
  it('finds no fault in the world data', () => {
    expect(gatingFaults(REGIONS, UPGRADES)).toStrictEqual([]);
  });

  it('reports a density that is no whole number from 0 to 3', () => {
    expect(gatingFaults([{ id: 'hr', density: 2.5 }], UPGRADES)).toStrictEqual([
      'region hr has density 2.5, 0 to 3 are allowed',
    ]);
    expect(gatingFaults([{ id: 'hr', density: 4 }], UPGRADES)).toStrictEqual([
      'region hr has density 4, 0 to 3 are allowed',
    ]);
    expect(gatingFaults([{ id: 'hr', density: -1 }], UPGRADES)).toStrictEqual([
      'region hr has density -1, 0 to 3 are allowed',
    ]);
  });

  it('reports a density the lamp never reaches', () => {
    expect(gatingFaults(REGIONS, [WIDE_CONE])).toStrictEqual([
      'region development has density 3, the lamp reaches 2',
    ]);
  });

  it('reports an upgrade earned in no region of the table', () => {
    expect(gatingFaults(REGIONS, [{ id: 'wide-cone', earnedIn: 'cellar' }, FILTER])).toStrictEqual(
      ['upgrade wide-cone is earned in cellar, which is no region'],
    );
  });

  it('reports an upgrade earned behind a wall the lamp cannot lift yet', () => {
    expect(gatingFaults(REGIONS, [{ id: 'wide-cone', earnedIn: 'hr' }, FILTER])).toStrictEqual([
      'upgrade wide-cone is earned in hr, density 2, with a lamp of strength 1',
    ]);
  });

  it('reports every fault, regions first, then upgrades', () => {
    expect(
      gatingFaults(
        [
          { id: 'sales', density: 1 },
          { id: 'hr', density: 3 },
        ],
        [{ id: 'wide-cone', earnedIn: 'hr' }],
      ),
    ).toStrictEqual([
      'region hr has density 3, the lamp reaches 2',
      'upgrade wide-cone is earned in hr, density 3, with a lamp of strength 1',
    ]);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/world.test.ts` — expected: fails, the module
  does not exist.

- [ ] **Step 3: Implement** `src/game/world.ts`:

```ts
/**
 * The world data (world.md §1, gameplay.md §5, feature 0014): the regions of the floor with
 * their shadow density, the lamp's strength and the upgrades that raise it. One rule gates the
 * world — density against strength — and `gatingFaults` checks that the data obeys it: no
 * region requires an upgrade that cannot be earned before it (INV-7). Content, not state: pure
 * data and one pure function. Management, the server room and the third upgrade join the
 * tables with their maps (M6, M7).
 */

export interface Region {
  readonly id: string;
  /** Shadow density, a whole number from 0 to MAX_DENSITY; 0 is a region without shadow. */
  readonly density: number;
}

export interface Upgrade {
  readonly id: string;
  /** The id of the region whose case earns it. */
  readonly earnedIn: string;
}

/** The lamp's strength before any upgrade. */
export const BASE_STRENGTH = 1;
/** The densest shadow there is: the wall sheet has three looks. */
export const MAX_DENSITY = 3;

export const REGIONS: readonly Region[] = [
  { id: 'reception', density: 0 },
  { id: 'break-room', density: 0 },
  { id: 'sales', density: 1 },
  { id: 'marketing', density: 1 },
  { id: 'support', density: 1 },
  { id: 'meeting-rooms', density: 1 },
  { id: 'hr', density: 2 },
  { id: 'accounting', density: 2 },
  { id: 'development', density: 3 },
];

/** In the order they are earned: each raises the lamp's strength by 1. */
export const UPGRADES: readonly Upgrade[] = [
  { id: 'wide-cone', earnedIn: 'marketing' },
  { id: 'filter', earnedIn: 'hr' },
];

/** The lamp's strength with the first `earned` upgrades. */
export function strengthAfter(earned: number): number {
  return BASE_STRENGTH + earned;
}

/** The density of the region with this id, or undefined when the id names none. */
export function densityOf(id: string, regions: readonly Region[] = REGIONS): number | undefined {
  return regions.find((region) => region.id === id)?.density;
}

/**
 * What is wrong with the gating order, one message per fault; empty when the data is
 * consistent. Regions first, in table order: a density that is no whole number from 0 to
 * MAX_DENSITY, or one above the strength of a lamp with every upgrade. Then the upgrades, in
 * the order they are earned: one earned in no region of the table, or in a region denser than
 * the lamp is before it.
 */
export function gatingFaults(
  regions: readonly Region[],
  upgrades: readonly Upgrade[],
): string[] {
  const faults: string[] = [];
  const reach = strengthAfter(upgrades.length);
  for (const { id, density } of regions) {
    if (!Number.isInteger(density) || density < 0 || density > MAX_DENSITY) {
      faults.push(`region ${id} has density ${density}, 0 to ${MAX_DENSITY} are allowed`);
    } else if (density > reach) {
      faults.push(`region ${id} has density ${density}, the lamp reaches ${reach}`);
    }
  }
  upgrades.forEach((upgrade, earnedBefore) => {
    const density = densityOf(upgrade.earnedIn, regions);
    const strength = strengthAfter(earnedBefore);
    if (density === undefined) {
      faults.push(`upgrade ${upgrade.id} is earned in ${upgrade.earnedIn}, which is no region`);
    } else if (density > strength) {
      faults.push(
        `upgrade ${upgrade.id} is earned in ${upgrade.earnedIn}, density ${density}, with a lamp of strength ${strength}`,
      );
    }
  });
  return faults;
}
```

- [ ] **Step 4: Run** `npm run check` — expected: green. The architecture test now lists
  `world.ts` and finds it clean.

- [ ] **Step 5: Commit** — `Put the densities and the gating check into the world data`,
  body: INV-7 names a world-data test that did not exist; the densities of the floor and the
  places the two upgrades are earned are what it checks.

---

### Task 2: Rectangles in the map

**Files:**
- Modify: `src/engine/tiled.ts` (`NamedRect`, `TileMap.rects`, `readRects`, `parseTileMap`)
- Modify: `tests/unit/grass-map.ts`, `tests/unit/picture-map.ts`, `tests/unit/draw-map.test.ts`,
  `tests/unit/draw-scene.test.ts` (the `TileMap` literals get `rects`)
- Create: `tests/fixtures/maps/walls.tmj`, `rect-without-name.tmj`, `rect-rotated.tmj`,
  `rect-outside.tmj`, `object-ellipse.tmj`
- Test: `tests/unit/tiled.test.ts`

**Interfaces:**
- Produces: `NamedRect { name: string; x: number; y: number; width: number; height: number }`
  and `TileMap.rects: readonly NamedRect[]`, in file order; `[]` on a map without rectangles.
  `grassMap(width, height, spawn, points = [], rects = [])`.

- [ ] **Step 1: Make the fixtures.** Copy `tests/fixtures/maps/points.tmj` to
  `tests/fixtures/maps/walls.tmj`. In the copy: set every cell of the `ground` data to `1`
  (`points.tmj` has one `2`, at index 41), set `nextobjectid` to `6`, and replace the `objects`
  array by these five, in this order:

```json
[
  { "height": 0, "id": 1, "name": "spawn", "point": true, "rotation": 0, "type": "", "visible": true, "width": 0, "x": 40, "y": 152 },
  { "height": 0, "id": 2, "name": "snippet", "point": true, "rotation": 0, "type": "", "visible": true, "width": 0, "x": 200, "y": 152 },
  { "height": 4, "id": 3, "name": "shadow:marketing", "rotation": 0, "type": "", "visible": true, "width": 48, "x": 128, "y": 96 },
  { "height": 48, "id": 4, "name": "shadow:sales", "rotation": 0, "type": "", "visible": true, "width": 4, "x": 240, "y": 32 },
  { "height": 4, "id": 5, "name": "shadow:hr", "rotation": 0, "type": "", "visible": true, "width": 48, "x": 32, "y": 96 }
]
```

  Write them in the file's own style, one key per line. Then make four copies of `walls.tmj`,
  each with one change to the object `shadow:sales`:

  | File | Change |
  |---|---|
  | `rect-without-name.tmj` | `"name": ""` |
  | `rect-rotated.tmj` | `"rotation": 90` |
  | `rect-outside.tmj` | `"x": 318` |
  | `object-ellipse.tmj` | add `"ellipse": true` |

- [ ] **Step 2: Write the failing tests.** In `tests/unit/tiled.test.ts`, rename the test
  `returns the named points besides the spawn in file order, and ignores other objects` to
  `returns the named points besides the spawn in file order` (its assertions stay), and add
  after the `describe` of the named points:

```ts
describe('parseTileMap: rectangle objects (0014)', () => {
  const tiles = fixture('fixture-tiles.tsj');
  const tileset = parseTileset(tiles.json, tiles.file);
  const parse = (name: string) => {
    const { file, json } = fixture(name);
    return parseTileMap(json, tileset, file);
  };
  /** walls.tmj with one change to its object `shadow:sales`. */
  const rejection = (change: (object: Record<string, unknown>) => void): string => {
    const { file, json } = fixture('walls.tmj');
    const copy = structuredClone(json) as MapJson;
    const sales = copy.layers
      .find((layer) => layer.name === 'objects')
      ?.objects?.find((object) => object.name === 'shadow:sales');
    if (sales === undefined) {
      throw new Error('walls.tmj has no object "shadow:sales"');
    }
    change(sales);
    return messageOf(() => parseTileMap(copy, tileset, file));
  };
  const FILE = 'tests/fixtures/maps/walls.tmj';

  it('reads the rectangles in file order, beside the points', () => {
    const map = parse('walls.tmj');
    expect(map.spawn).toStrictEqual({ x: 40, y: 152 });
    expect(map.points).toStrictEqual([{ name: 'snippet', x: 200, y: 152 }]);
    expect(map.rects).toStrictEqual([
      { name: 'shadow:marketing', x: 128, y: 96, width: 48, height: 4 },
      { name: 'shadow:sales', x: 240, y: 32, width: 4, height: 48 },
      { name: 'shadow:hr', x: 32, y: 96, width: 48, height: 4 },
    ]);
  });

  it('leaves `rects` empty on a map without rectangles', () => {
    expect(parse('corridor.tmj').rects).toStrictEqual([]);
  });

  it('reads the rectangle of points.tmj, whatever its name means', () => {
    expect(parse('points.tmj').rects).toStrictEqual([
      { name: 'zone', x: 64, y: 64, width: 16, height: 16 },
    ]);
  });

  it.each([
    ['rect-without-name.tmj', 'layer "objects" has a rectangle object without a name'],
    ['rect-rotated.tmj', 'rectangle "shadow:sales" is rotated'],
    [
      'rect-outside.tmj',
      'rectangle "shadow:sales" (318, 32, 4, 48) is not whole pixels inside the map',
    ],
    ['object-ellipse.tmj', 'layer "objects" has an object that is neither a point nor a rectangle'],
  ])('rejects %s', (name, problem) => {
    expect(messageOf(() => parse(name))).toBe(`tests/fixtures/maps/${name}: ${problem}`);
  });

  it.each(['polygon', 'polyline', 'text', 'gid'])('rejects an object with `%s`', (field) => {
    expect(
      rejection((object) => {
        object[field] = field === 'gid' ? 1 : [];
      }),
    ).toBe(`${FILE}: layer "objects" has an object that is neither a point nor a rectangle`);
  });

  it.each([
    [{ x: 240.5 }, '(240.5, 32, 4, 48)'],
    [{ width: 0 }, '(240, 32, 0, 48)'],
    [{ height: 0.5 }, '(240, 32, 4, 0.5)'],
    [{ x: -4 }, '(-4, 32, 4, 48)'],
    [{ y: 160 }, '(240, 160, 4, 48)'],
  ])('rejects a rectangle changed by %o', (change, box) => {
    expect(rejection((object) => Object.assign(object, change))).toBe(
      `${FILE}: rectangle "shadow:sales" ${box} is not whole pixels inside the map`,
    );
  });

  it('accepts a rectangle that ends on the last pixel of the map', () => {
    const { file, json } = fixture('walls.tmj');
    const copy = structuredClone(json) as MapJson;
    const objects = copy.layers.find((layer) => layer.name === 'objects')?.objects ?? [];
    Object.assign(objects[3] ?? {}, { x: 316, y: 144 });
    expect(parseTileMap(copy, tileset, file).rects[1]).toStrictEqual({
      name: 'shadow:sales',
      x: 316,
      y: 144,
      width: 4,
      height: 48,
    });
  });

  it('applies the rules for points first', () => {
    const { file, json } = fixture('rect-rotated.tmj');
    const copy = structuredClone(json) as MapJson;
    const objects = copy.layers.find((layer) => layer.name === 'objects')?.objects ?? [];
    Object.assign(objects[1] ?? {}, { name: '' });
    expect(messageOf(() => parseTileMap(copy, tileset, file))).toBe(
      `${file}: layer "objects" has a point object without a name`,
    );
  });
});
```

  `MapJson`, `messageOf` and `fixture` are the helpers the file already has; `messageOf` and
  the two interfaces are declared further up than this `describe`, so no move is needed.

- [ ] **Step 3: Run** `npx vitest run tests/unit/tiled.test.ts` — expected: the new tests fail
  (`rects` is undefined, nothing is rejected).

- [ ] **Step 4: Implement** in `src/engine/tiled.ts`. After `NamedPoint`:

```ts
/** A rectangle object of the `objects` layer (0014), in map pixels: what it is, is the game's business. */
export interface NamedRect extends Box {
  readonly name: string;
}
```

  In `TileMap`, after `points`:

```ts
  /** The rectangle objects, in file order; each unrotated, of whole pixels, inside the map (0014). */
  readonly rects: readonly NamedRect[];
```

  After `readPause`:

```ts
/**
 * Every object that is not a point, in file order (0014): a rectangle with a name, unrotated,
 * of whole pixels, inside the map. Anything else — an ellipse, a polygon, a polyline, a text,
 * a tile object — is rejected, so that a shape the game cannot read is not silently ignored.
 */
function readRects(layer: Json, columns: number, rows: number, file: string): NamedRect[] {
  const what = `layer "${OBJECT_LAYER_NAME}"`;
  return asArray(layer.objects, file, `${what} objects`)
    .map((value) => asRecord(value, file, 'object'))
    .filter((object) => object.point !== true)
    .map((object) => {
      if (
        object.ellipse === true ||
        NON_RECTANGLE_FIELDS.some((field) => object[field] !== undefined)
      ) {
        fail(file, `${what} has an object that is neither a point nor a rectangle`);
      }
      if (typeof object.name !== 'string' || object.name === '') {
        fail(file, `${what} has a rectangle object without a name`);
      }
      const name = object.name;
      const rotation =
        object.rotation === undefined
          ? 0
          : asNumber(object.rotation, file, `rectangle "${name}" rotation`);
      if (rotation !== 0) {
        fail(file, `rectangle "${name}" is rotated`);
      }
      const x = asNumber(object.x, file, `rectangle "${name}" x`);
      const y = asNumber(object.y, file, `rectangle "${name}" y`);
      const width = asNumber(object.width, file, `rectangle "${name}" width`);
      const height = asNumber(object.height, file, `rectangle "${name}" height`);
      const inside =
        [x, y, width, height].every(Number.isInteger) &&
        width >= 1 &&
        height >= 1 &&
        x >= 0 &&
        y >= 0 &&
        x + width <= columns * TILE_SIZE &&
        y + height <= rows * TILE_SIZE;
      if (!inside) {
        fail(
          file,
          `rectangle "${name}" (${x}, ${y}, ${width}, ${height}) is not whole pixels inside the map`,
        );
      }
      return { name, x, y, width, height };
    });
}
```

  In `parseTileMap`, after the loop that checks the points' positions and before the `return`:

```ts
  const rects = readRects(objects, width, height, mapFile);
  return { width, height, ground, detail, above, spawn, points, rects, solids, opaque };
```

  The rectangles are read last on purpose: the spec puts their rules after the rules for
  points, and the existing test "a spawn that is not a point object" must still see the
  spawn's message.

- [ ] **Step 5: Give the in-memory maps their `rects`.** `tests/unit/grass-map.ts`:

```ts
import {
  EMPTY,
  type NamedPoint,
  type NamedRect,
  type Point,
  type TileMap,
} from '../../src/engine/tiled';

/** A map of width × height grass tiles (id 0), nothing solid, with the given spawn, named points and rectangles. */
export function grassMap(
  width: number,
  height: number,
  spawn: Point,
  points: readonly NamedPoint[] = [],
  rects: readonly NamedRect[] = [],
): TileMap {
```

  and `rects,` after `points,` in the returned object. `tests/unit/picture-map.ts`: `rects: [],`
  after `points: [],`. The `MAP` literals of `tests/unit/draw-map.test.ts` and
  `tests/unit/draw-scene.test.ts`: `rects: [],` after `points: [],`. Run `npm run typecheck`;
  every remaining error is a `TileMap` literal that needs the field.

- [ ] **Step 6: Run** `npm run check` — expected: green.

- [ ] **Step 7: Commit** — `Read rectangle objects from the map`, body: a shadow wall's place
  is map truth (INV-7), and a doorway is a rectangle, not a point; an object the loader cannot
  read is rejected instead of ignored.

---

### Task 3: The walls and the light

**Files:**
- Create: `src/game/shadow.ts`, `tests/unit/shadow.test.ts`

**Interfaces:**
- Consumes: `NamedRect`, `TileMap` (T2); `densityOf` (T1); `Cone`, `CONE_LENGTH`,
  `DIRECTIONS`, `lampCone` from `src/game/lamp`; `BOX_HEIGHT` (8) from `src/game/player`;
  `sightBlocked` from `src/engine/collision`.
- Produces: `WALL_PREFIX`, `WALL_THICKNESS`, `ShadowWall { region: string; density: number;
  box: Box }`, `wallsOf(rects: readonly NamedRect[]): ShadowWall[]`,
  `meetsCone(box: Box, cone: Cone): boolean`,
  `wallInLight(wall: ShadowWall, player: PlayerState, lampOn: boolean, map: TileMap): boolean`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/shadow.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import { type NamedRect, parseTileMap, parseTileset, type TileMap } from '../../src/engine/tiled';
import { lampCone } from '../../src/game/lamp';
import { meetsCone, type ShadowWall, wallInLight, wallsOf } from '../../src/game/shadow';
import { type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';
import { grassMap } from './grass-map';
import { solidsWith } from './solids';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function loadMap(mapFile: string, tilesetFile: string): TileMap {
  const read = (file: string): unknown => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  return parseTileMap(read(mapFile), parseTileset(read(tilesetFile), tilesetFile), mapFile);
}

const WALLS_MAP = loadMap('tests/fixtures/maps/walls.tmj', 'tests/fixtures/maps/fixture-tiles.tsj');

/** The horizontal and the vertical box of the spec's test plan. */
const H: Box = { x: 128, y: 96, width: 48, height: 4 };
const V: Box = { x: 240, y: 32, width: 4, height: 48 };
/** 20x12 cells of open floor. */
const OPEN = grassMap(20, 12, { x: 40, y: 152 });

const figure = (x: number, y: number, facing: Facing): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
});
const wall = (box: Box, region = 'marketing', density = 1): ShadowWall => ({
  region,
  density,
  box,
});
const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});

describe('wallsOf (0014)', () => {
  it('reads the walls of a map with region, density and box, in file order', () => {
    expect(wallsOf(WALLS_MAP.rects)).toStrictEqual([
      { region: 'marketing', density: 1, box: H },
      { region: 'sales', density: 1, box: V },
      { region: 'hr', density: 2, box: { x: 32, y: 96, width: 48, height: 4 } },
    ]);
  });

  it('reads no wall from a map without rectangles', () => {
    expect(wallsOf([])).toStrictEqual([]);
  });

  it.each([
    [rect('door', 128, 96, 48, 4), 'unknown rectangle object "door"'],
    [rect('shadow:cellar', 128, 96, 48, 4), 'shadow wall shadow:cellar names no region'],
    [
      rect('shadow:reception', 128, 96, 48, 4),
      'shadow wall shadow:reception stands in a region without shadow',
    ],
    [rect('shadow:sales', 130, 96, 48, 4), '(130, 96, 48, 4) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 98, 48, 4), '(128, 98, 48, 4) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 96, 40, 4), '(128, 96, 40, 4) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 96, 48, 8), '(128, 96, 48, 8) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 96, 4, 40), '(128, 96, 4, 40) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 96, 4, 4), '(128, 96, 4, 4) is no strip on a cell edge'],
  ])('refuses %o', (bad, message) => {
    expect(() => wallsOf([bad])).toThrow(message);
  });

  it('names the wall in the message of a strip that is none', () => {
    expect(() => wallsOf([rect('shadow:sales', 130, 96, 48, 4)])).toThrow(
      'shadow wall shadow:sales (130, 96, 48, 4) is no strip on a cell edge',
    );
  });
});

describe('a wall in the light (0014)', () => {
  const CASES: readonly (readonly [Box, number, number, Facing, boolean])[] = [
    [H, 152, 96, 'down', true],
    [H, 152, 61, 'down', true],
    [H, 152, 60, 'down', false],
    [H, 120, 88, 'down', true],
    [H, 110, 88, 'down', false],
    [H, 152, 96, 'up', false],
    [H, 152, 88, 'left', false],
    [H, 152, 108, 'up', true],
    [H, 118, 108, 'up', false],
    [H, 152.4, 116, 'up', true],
    [V, 234, 60, 'right', true],
    [V, 234, 40, 'right', true],
    [V, 234, 36, 'right', false],
  ];

  it.each(CASES)('box %o, feet (%d, %d) facing %s: meets the cone %s', (box, x, y, facing, meets) => {
    expect(meetsCone(box, lampCone(figure(x, y, facing)))).toBe(meets);
    expect(wallInLight(wall(box), figure(x, y, facing), true, OPEN)).toBe(meets);
  });

  it('is not in the light with the lamp off', () => {
    for (const [box, x, y, facing] of CASES) {
      expect(wallInLight(wall(box), figure(x, y, facing), false, OPEN)).toBe(false);
    }
  });

  it('is kept out of the light by a full opaque tile on the line, not by a low box', () => {
    const tile = { x: 144, y: 64, width: 16, height: 16 };
    const boxes = solidsWith(20, 12, [{ column: 9, row: 4, box: tile }]);
    const player = figure(152, 61, 'down');
    expect(wallInLight(wall(H), player, true, { ...OPEN, solids: boxes, opaque: boxes })).toBe(
      false,
    );
    expect(wallInLight(wall(H), player, true, { ...OPEN, solids: boxes })).toBe(true);
  });

  it('is lit past its far end, where the next wall strip begins', () => {
    const strip = { x: 176, y: 96, width: 16, height: 4 };
    const boxes = solidsWith(20, 12, [{ column: 11, row: 6, box: strip }]);
    const map = { ...OPEN, solids: boxes, opaque: boxes };
    expect(wallInLight(wall(H), figure(186, 88, 'down'), true, map)).toBe(true);
  });

  it('is lit past the far end of a vertical wall too', () => {
    const strip = { x: 240, y: 80, width: 4, height: 16 };
    const boxes = solidsWith(20, 12, [{ column: 15, row: 5, box: strip }]);
    const map = { ...OPEN, solids: boxes, opaque: boxes };
    expect(wallInLight(wall(V, 'sales'), figure(230, 96, 'right'), true, map)).toBe(true);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/shadow.test.ts` — expected: fails, the module
  does not exist.

- [ ] **Step 3: Implement** `src/game/shadow.ts`:

```ts
import { type Box, sightBlocked } from '../engine/collision';
import { type NamedRect, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { CONE_LENGTH, type Cone, DIRECTIONS, lampCone } from './lamp';
import { BOX_HEIGHT } from './player';
import type { PlayerState } from './state';
import { densityOf } from './world';

/**
 * The shadow walls (gameplay.md §2 and §5, feature 0014). A wall is a rectangle of the map
 * named `shadow:<region>`: a strip 4 px thick on the top or the left edge of whole cells, in a
 * doorway. It has its region's density. While it stands it is solid and stops the light; the
 * lamp lifts it for good when its light has been on it for LIFT_STEPS steps without a break
 * and its strength meets the density. Pure data and pure functions; the walls are read from
 * the map's rectangles on every call and kept nowhere.
 */

/** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
export const WALL_PREFIX = 'shadow:';
/** A wall is as thick as a wall strip (0010). */
export const WALL_THICKNESS = 4;

export interface ShadowWall {
  readonly region: string;
  /** The region's density, 1–3 (game/world). */
  readonly density: number;
  /** Map pixels. */
  readonly box: Box;
}

function isSpan(length: number): boolean {
  return length > 0 && length % TILE_SIZE === 0;
}

/** A strip on a cell edge: the corner on the grid, 4 px one way and whole cells the other. */
function isStrip(box: Box): boolean {
  const onGrid = box.x % TILE_SIZE === 0 && box.y % TILE_SIZE === 0;
  const horizontal = box.height === WALL_THICKNESS && isSpan(box.width);
  const vertical = box.width === WALL_THICKNESS && isSpan(box.height);
  return onGrid && (horizontal || vertical);
}

/**
 * The shadow walls of a map, in the order of its rectangles. Rejects a rectangle with another
 * name, a region the world data does not know, a region without shadow and a box that is no
 * strip on a cell edge, so that a typing mistake in the map is not a silently missing wall.
 */
export function wallsOf(rects: readonly NamedRect[]): ShadowWall[] {
  return rects.map((rect) => {
    if (!rect.name.startsWith(WALL_PREFIX)) {
      throw new Error(`unknown rectangle object "${rect.name}"`);
    }
    const region = rect.name.slice(WALL_PREFIX.length);
    const density = densityOf(region);
    if (density === undefined) {
      throw new Error(`shadow wall ${rect.name} names no region`);
    }
    if (density === 0) {
      throw new Error(`shadow wall ${rect.name} stands in a region without shadow`);
    }
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (!isStrip(box)) {
      throw new Error(
        `shadow wall ${rect.name} (${box.x}, ${box.y}, ${box.width}, ${box.height}) is no strip on a cell edge`,
      );
    }
    return { region, density, box };
  });
}

/** The distance from 0 to the interval [from, to]; 0 when it contains 0. */
function gapTo(from: number, to: number): number {
  if (from > 0) {
    return from;
  }
  return to < 0 ? 0 - to : 0;
}

/**
 * Whether a box, its edges included, meets the cone. In the cone's own coordinates the box
 * spans d0 to d1 along the facing and s0 to s1 across it. With near = max(d0, 0), far =
 * min(d1, CONE_LENGTH) and gap the distance from 0 to [s0, s1], it meets the cone when
 * near ≤ far, near < CONE_LENGTH and gap ≤ far / 2: every case in which a point of the box
 * lies in the cone (lamp.inCone), and the limiting case in which the box touches the cone's
 * end. A sample of points would miss a figure flush below a wall, whose apex lies on the
 * wall's far edge.
 */
export function meetsCone(box: Box, cone: Cone): boolean {
  const direction = DIRECTIONS[cone.facing];
  const left = box.x - cone.apex.x;
  const right = left + box.width;
  const top = box.y - cone.apex.y;
  const bottom = top + box.height;
  const sideways = direction.x !== 0;
  const [a0, a1] = sideways ? [left, right] : [top, bottom];
  const [s0, s1] = sideways ? [top, bottom] : [left, right];
  // Facing left or up, "along" runs against the axis: the interval is mirrored.
  const forward = direction.x + direction.y > 0;
  const d0 = forward ? a0 : 0 - a1;
  const d1 = forward ? a1 : 0 - a0;
  const near = Math.max(d0, 0);
  const far = Math.min(d1, CONE_LENGTH);
  return near <= far && near < CONE_LENGTH && gapTo(s0, s1) <= far / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The point of the wall's box nearest to `from`. Along the wall the box ends at its last
 * pixel: the corner beyond it belongs to the next wall strip, whose box is half-open, and a
 * line that ended there would end inside that strip.
 */
function sightTarget(box: Box, from: Point): Point {
  const horizontal = box.width > box.height;
  return {
    x: clamp(from.x, box.x, box.x + box.width - (horizontal ? 1 : 0)),
    y: clamp(from.y, box.y, box.y + box.height - (horizontal ? 0 : 1)),
  };
}

/**
 * In the light: the lamp is on, the wall's box meets the cone, and no opaque box of the map
 * lies on the line from the centre of the figure's collision box to the nearest point of the
 * wall's box. `map` is the map as loaded, without the standing walls: against the map with
 * walls, a wall would block its own light, and other walls do not count on that line.
 */
export function wallInLight(
  wall: ShadowWall,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): boolean {
  if (!lampOn || !meetsCone(wall.box, lampCone(player))) {
    return false;
  }
  const centre = { x: player.x, y: player.y - BOX_HEIGHT / 2 };
  return !sightBlocked(centre, sightTarget(wall.box, centre), {
    width: map.width,
    height: map.height,
    solids: map.opaque,
  });
}
```

- [ ] **Step 4: Run** `npm run check` — expected: green. If one of the thirteen cases of the
  spec's test plan fails, the rule is implemented wrong — do not change the expected value.

- [ ] **Step 5: Commit** — `Read the shadow walls and test the light on them`, body: a wall is
  a strip, not a point, so the light test is the box against the cone in closed form; sample
  points miss the figure that stands flush below a wall.

---

### Task 4: The step, and the walls in the state

**Files:**
- Modify: `src/game/state.ts`, `src/game/shadow.ts`, `src/game/update.ts`,
  `src/game/overview.ts`
- Modify: `tests/unit/shadow.test.ts`, `tests/unit/state.test.ts`,
  `tests/unit/overview.test.ts`, `tests/unit/draw-scene.test.ts` (state literals)

**Interfaces:**
- Consumes: T1–T3.
- Produces, in `state.ts`: `LampState { on; strength }`, `ShadowWallState { wall; lit;
  light }`, `GameState.shadowWalls`. In `shadow.ts`: `LIFT_STEPS` (60),
  `standingWalls(walls): ShadowWallState[]`, `restedWalls(standing): ShadowWallState[]`,
  `stepWalls(standing, walls, player, lamp: LampState, map): ShadowWallState[]`,
  `withWalls(map: TileMap, walls, standing): TileMap`.

- [ ] **Step 1: Change the types** in `src/game/state.ts`. Replace `LampState`:

```ts
/** The lamp (0007, 0014): on in every step whose input holds `lamp`. Later field: charge (M6). */
export interface LampState {
  readonly on: boolean;
  /** Against a region's density (gameplay.md §5): BASE_STRENGTH plus the upgrades earned. */
  readonly strength: number;
}
```

  Add before `Captured`:

```ts
/** A shadow wall still standing (0014). Its box stays in the map, its density in the world data. */
export interface ShadowWallState {
  /** The index of the wall in `wallsOf(map.rects)`. */
  readonly wall: number;
  /** Whether the light was on it in the last step. */
  readonly lit: boolean;
  /** Steps it has been giving way without a break, 0–59. */
  readonly light: number;
}
```

  and in `GameState`, after `movers`:

```ts
  /** The shadow walls still standing, in the map's order (0014); a lifted wall has left it for good. */
  readonly shadowWalls: readonly ShadowWallState[];
```

- [ ] **Step 2: Write the failing unit tests** at the end of `tests/unit/shadow.test.ts`. Add
  `LIFT_STEPS`, `restedWalls`, `standingWalls`, `stepWalls` and `withWalls` to the import from
  `shadow`, and `ShadowWallState` to the import from `state`:

```ts
describe('the step of the walls (0014)', () => {
  /** A thin horizontal wall and a dense vertical one, both in the cone of a figure at (152, 80) facing down. */
  const WALLS: readonly ShadowWall[] = [
    wall(H),
    wall({ x: 160, y: 80, width: 4, height: 32 }, 'hr', 2),
  ];
  const PLAYER = figure(152, 80, 'down');
  const BASIC = { on: true, strength: 1 };
  const run = (
    standing: readonly ShadowWallState[],
    steps: number,
    lamp = BASIC,
    player = PLAYER,
  ): readonly ShadowWallState[] => {
    let next = standing;
    for (let i = 0; i < steps; i += 1) {
      next = stepWalls(next, WALLS, player, lamp, OPEN);
    }
    return next;
  };

  it('every wall stands at the start, unlit', () => {
    expect(standingWalls(WALLS)).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(LIFT_STEPS).toBe(60);
  });

  it('two walls in the cone both count: the thin one gives way, the dense one holds', () => {
    expect(run(standingWalls(WALLS), 1)).toStrictEqual([
      { wall: 0, lit: true, light: 1 },
      { wall: 1, lit: true, light: 0 },
    ]);
  });

  it('a wall of density 1 has light 59 after 59 steps and is gone after the 60th', () => {
    expect(run(standingWalls(WALLS), 59)).toStrictEqual([
      { wall: 0, lit: true, light: 59 },
      { wall: 1, lit: true, light: 0 },
    ]);
    expect(run(standingWalls(WALLS), 60)).toStrictEqual([{ wall: 1, lit: true, light: 0 }]);
  });

  it('the wall that leaves keeps the index of the others', () => {
    const left = run(standingWalls(WALLS), 60);
    expect(left.map((standing) => standing.wall)).toStrictEqual([1]);
    expect(run(left, 1)).toStrictEqual([{ wall: 1, lit: true, light: 0 }]);
  });

  it('a wall of density 2 holds against strength 1 however long, and is gone after 60 steps of strength 2', () => {
    expect(run(standingWalls(WALLS), 600)).toStrictEqual([{ wall: 1, lit: true, light: 0 }]);
    const strong = { on: true, strength: 2 };
    expect(run([{ wall: 1, lit: false, light: 0 }], 59, strong)).toStrictEqual([
      { wall: 1, lit: true, light: 59 },
    ]);
    expect(run([{ wall: 1, lit: false, light: 0 }], 60, strong)).toStrictEqual([]);
  });

  it('a step out of the light starts the second again', () => {
    const half = run(standingWalls(WALLS), 30);
    expect(half[0]).toStrictEqual({ wall: 0, lit: true, light: 30 });
    const broken = run(half, 1, { on: false, strength: 1 });
    expect(broken).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(run(broken, 1)[0]).toStrictEqual({ wall: 0, lit: true, light: 1 });
  });

  it('a figure that turns away breaks the light as well', () => {
    const half = run(standingWalls(WALLS), 30);
    expect(run(half, 1, BASIC, figure(152, 80, 'up'))).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
      { wall: 1, lit: false, light: 0 },
    ]);
  });

  it('rests the standing walls and brings no lifted wall back', () => {
    expect(restedWalls([{ wall: 1, lit: true, light: 30 }])).toStrictEqual([
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(restedWalls([])).toStrictEqual([]);
  });
});

describe('the map with its standing walls (0014)', () => {
  const WALLS: readonly ShadowWall[] = [wall(H), wall(V, 'sales')];

  it('is the map itself when no wall stands', () => {
    expect(withWalls(OPEN, WALLS, [])).toBe(OPEN);
  });

  it('adds the box of a standing wall to every cell it covers, as solid and as opaque', () => {
    const walled = withWalls(OPEN, WALLS, [{ wall: 0, lit: false, light: 0 }]);
    const cellsWith = (grid: readonly (readonly Box[])[]) =>
      grid.flatMap((boxes, at) => (boxes.length > 0 ? [at] : []));
    expect(cellsWith(walled.solids)).toStrictEqual([6 * 20 + 8, 6 * 20 + 9, 6 * 20 + 10]);
    expect(cellsWith(walled.opaque)).toStrictEqual([6 * 20 + 8, 6 * 20 + 9, 6 * 20 + 10]);
    expect(walled.solids[6 * 20 + 9]).toStrictEqual([H]);
    expect(cellsWith(OPEN.solids)).toStrictEqual([]);
  });

  it('covers three rows for a vertical wall and keeps the boxes the map already has', () => {
    const tile = { x: 240, y: 32, width: 16, height: 16 };
    const boxes = solidsWith(20, 12, [{ column: 15, row: 2, box: tile }]);
    const walled = withWalls({ ...OPEN, solids: boxes, opaque: boxes }, WALLS, [
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(walled.solids[2 * 20 + 15]).toStrictEqual([tile, V]);
    expect(walled.solids[3 * 20 + 15]).toStrictEqual([V]);
    expect(walled.solids[4 * 20 + 15]).toStrictEqual([V]);
    expect(walled.solids[5 * 20 + 15]).toStrictEqual([]);
  });
});
```

- [ ] **Step 3: Implement** in `src/game/shadow.ts`. Change the state import to
  `import type { LampState, PlayerState, ShadowWallState } from './state';` and add:

```ts
/** Tune: one second of unbroken light lifts a wall, as it captures a creature. */
export const LIFT_STEPS = 60;

/** Every wall of the map standing, unlit: the walls a game starts with. */
export function standingWalls(walls: readonly ShadowWall[]): ShadowWallState[] {
  return walls.map((_wall, wall) => ({ wall, lit: false, light: 0 }));
}

/** The standing walls when the figure wakes (0009): unlit, the second not begun. No lifted wall comes back. */
export function restedWalls(standing: readonly ShadowWallState[]): ShadowWallState[] {
  return standing.map(({ wall }) => ({ wall, lit: false, light: 0 }));
}

/**
 * One step of the standing walls against the stepped figure and the lamp of that step. Not in
 * the light: unlit, and the count starts again. In the light of a lamp weaker than its
 * density: lit, and it holds. In the light of a lamp strong enough: the count grows by 1, and
 * in the step it would reach LIFT_STEPS the wall leaves the list. `map` is the map as loaded.
 */
export function stepWalls(
  standing: readonly ShadowWallState[],
  walls: readonly ShadowWall[],
  player: PlayerState,
  lamp: LampState,
  map: TileMap,
): ShadowWallState[] {
  const next: ShadowWallState[] = [];
  for (const state of standing) {
    const wall = walls[state.wall];
    if (wall === undefined || !wallInLight(wall, player, lamp.on, map)) {
      next.push({ wall: state.wall, lit: false, light: 0 });
    } else if (lamp.strength < wall.density) {
      next.push({ wall: state.wall, lit: true, light: 0 });
    } else if (state.light + 1 < LIFT_STEPS) {
      next.push({ wall: state.wall, lit: true, light: state.light + 1 });
    }
  }
  return next;
}

/**
 * The map with the box of every standing wall added to each cell it covers, as a solid box and
 * as an opaque one: what the figure, the push and the creatures are stepped against. The map
 * itself when no wall stands. A new object; the map is not changed.
 */
export function withWalls(
  map: TileMap,
  walls: readonly ShadowWall[],
  standing: readonly ShadowWallState[],
): TileMap {
  if (standing.length === 0) {
    return map;
  }
  const solids = [...map.solids];
  const opaque = [...map.opaque];
  for (const { wall } of standing) {
    const box = walls[wall]?.box;
    if (box === undefined) {
      continue;
    }
    const lastColumn = Math.ceil((box.x + box.width) / TILE_SIZE) - 1;
    const lastRow = Math.ceil((box.y + box.height) / TILE_SIZE) - 1;
    for (let row = Math.floor(box.y / TILE_SIZE); row <= lastRow; row += 1) {
      for (let column = Math.floor(box.x / TILE_SIZE); column <= lastColumn; column += 1) {
        const at = row * map.width + column;
        solids[at] = [...(solids[at] ?? []), box];
        opaque[at] = [...(opaque[at] ?? []), box];
      }
    }
  }
  return { ...map, solids, opaque };
}
```

- [ ] **Step 4: Run** `npx vitest run tests/unit/shadow.test.ts` — expected: green.

- [ ] **Step 5: Write the failing state tests.** In `tests/unit/state.test.ts`: add
  `lamp: { on: false, strength: 1 }` in place of every `lamp: { on: false }` (lines 61, 113,
  133, 145) and `shadowWalls: [],` after every `movers: [],` of those four literals. Add
  beside `ROUTES_MAP`:

```ts
/** Three walls on open floor (0014): marketing and hr horizontal, sales vertical. */
const WALLS_MAP = loadMap('tests/fixtures/maps/walls.tmj', 'tests/fixtures/maps/fixture-tiles.tsj');
```

  and at the end of the file:

```ts
describe('shadow walls in the state (0014)', () => {
  const DOWN: GameInput = { ...NONE, down: true };
  const UP: GameInput = { ...NONE, up: true };
  const LEFT: GameInput = { ...NONE, left: true };
  const THIN = { name: 'shadow:marketing', x: 128, y: 96, width: 48, height: 4 };
  const DENSE = { name: 'shadow:hr', x: 128, y: 96, width: 48, height: 4 };
  const SIDE = { name: 'shadow:sales', x: 240, y: 32, width: 4, height: 48 };
  const run = (
    map: TileMap,
    start: GameState,
    ...legs: readonly (readonly [number, GameInput])[]
  ): GameState => {
    let state = start;
    for (const [steps, input] of legs) {
      for (let i = 0; i < steps; i += 1) {
        state = update(state, input, map);
      }
    }
    return state;
  };
  const from = (map: TileMap, ...legs: readonly (readonly [number, GameInput])[]): GameState =>
    run(map, createInitialState(map), ...legs);

  it('starts with every wall of the map standing and a lamp of strength 1', () => {
    const state = createInitialState(WALLS_MAP);
    expect(state.lamp).toStrictEqual({ on: false, strength: 1 });
    expect(state.shadowWalls).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
      { wall: 1, lit: false, light: 0 },
      { wall: 2, lit: false, light: 0 },
    ]);
  });

  it('starts without walls on a map without rectangles', () => {
    expect(createInitialState(MAP).shadowWalls).toStrictEqual([]);
  });

  it('refuses a map with a rectangle that is no shadow wall before the game starts', () => {
    const map = grassMap(20, 12, { x: 40, y: 152 }, [], [{ ...THIN, name: 'door' }]);
    expect(() => createInitialState(map)).toThrow('unknown rectangle object "door"');
  });

  it('stops the figure flush at a standing wall from each of the four sides', () => {
    const above = from(grassMap(20, 12, { x: 152, y: 80 }, [], [THIN]), [30, DOWN]);
    expect([above.player.x, above.player.y]).toStrictEqual([152, 96]);
    const below = from(grassMap(20, 12, { x: 152, y: 124 }, [], [THIN]), [30, UP]);
    expect([below.player.x, below.player.y]).toStrictEqual([152, 108]);
    const left = from(grassMap(20, 12, { x: 220, y: 60 }, [], [SIDE]), [30, RIGHT]);
    expect([left.player.x, left.player.y]).toStrictEqual([234, 60]);
    const right = from(grassMap(20, 12, { x: 260, y: 60 }, [], [SIDE]), [30, LEFT]);
    expect([right.player.x, right.player.y]).toStrictEqual([250, 60]);
  });

  it('lets the figure slide along a standing wall', () => {
    const map = grassMap(20, 12, { x: 152, y: 80 }, [], [THIN]);
    const state = from(map, [30, DOWN], [10, { ...NONE, down: true, right: true }]);
    expect(state.player.y).toBe(96);
    expect(state.player.x).toBeCloseTo(152 + (10 * (80 / 60)) / Math.SQRT2, 6);
  });

  it('holds a push of 3 px per step', () => {
    const map = grassMap(20, 12, { x: 152, y: 90 }, [], [THIN]);
    const start = createInitialState(map);
    const pushed = run(
      map,
      { ...start, player: { ...start.player, recoil: { dx: 0, dy: 3, steps: 8 } } },
      [8, NONE],
    );
    expect([pushed.player.x, pushed.player.y]).toStrictEqual([152, 96]);
    expect(pushed.player.recoil.steps).toBe(0);
  });

  describe('a snippet beyond a wall', () => {
    /** The figure at (152, 80) faces down; the snippet's body point (152, 112) is in the cone. */
    const map = grassMap(
      20,
      12,
      { x: 152, y: 80 },
      [{ name: 'snippet', x: 152, y: 120 }],
      [DENSE],
    );

    it('is not lit through a standing wall and is held by it', () => {
      const state = from(map, [90, SHINE]);
      expect(state.creatures).toStrictEqual([
        { species: 'snippet', x: 152, y: 108, light: 0, home: { x: 152, y: 120 } },
      ]);
      expect(state.captured).toStrictEqual({ snippet: 0 });
      expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
    });

    it('is lit and captured once the wall is lifted', () => {
      const lifted: GameState = { ...createInitialState(map), shadowWalls: [] };
      const state = run(map, lifted, [60, SHINE]);
      expect(state.creatures).toStrictEqual([]);
      expect(state.captured).toStrictEqual({ snippet: 1 });
    });

    it('walks through the doorway once the wall is lifted', () => {
      const lifted: GameState = { ...createInitialState(map), shadowWalls: [] };
      const state = run(map, lifted, [30, NONE]);
      expect(state.creatures[0]?.y).toBeCloseTo(100, 6);
    });
  });

  it('lifts a thin wall in the 60th step of light; from the next step the doorway is open', () => {
    const map = grassMap(20, 12, { x: 152, y: 96 }, [], [THIN]);
    expect(from(map, [3, DOWN]).player.y).toBe(96);
    const almost = from(map, [59, SHINE]);
    expect(almost.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 59 }]);
    const lifted = run(map, almost, [1, SHINE]);
    expect(lifted.shadowWalls).toStrictEqual([]);
    expect(lifted.player.y).toBe(96);
    expect(run(map, lifted, [3, DOWN]).player.y).toBeCloseTo(100, 6);
  });

  it('survives a JSON round trip with a wall at light 30 and with a wall lifted (INV-1)', () => {
    const map = grassMap(20, 12, { x: 152, y: 96 }, [], [THIN, SIDE]);
    const half = from(map, [30, SHINE]);
    expect(half.shadowWalls).toStrictEqual([
      { wall: 0, lit: true, light: 30 },
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(JSON.parse(JSON.stringify(half))).toStrictEqual(half);
    const lifted = run(map, half, [30, SHINE]);
    expect(lifted.shadowWalls).toStrictEqual([{ wall: 1, lit: false, light: 0 }]);
    expect(JSON.parse(JSON.stringify(lifted))).toStrictEqual(lifted);
  });

  it('changes no wall in the dark, rests the standing ones at the wake and brings none back', () => {
    const map = grassMap(20, 12, { x: 152, y: 96 }, [], [THIN, SIDE]);
    const half = from(map, [30, SHINE]);
    const fallen: GameState = { ...half, shadowWalls: [{ wall: 0, lit: true, light: 30 }], dark: 1 };
    const before = run(map, fallen, [43, SHINE]);
    expect(before.dark).toBe(44);
    expect(before.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 30 }]);
    const woken = run(map, before, [1, SHINE]);
    expect(woken.dark).toBe(45);
    expect(woken.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
    expect(woken.lamp).toStrictEqual({ on: false, strength: 1 });
  });

  it('steps a state without standing walls exactly as a map without rectangles (600 steps)', () => {
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
    }));
    const bare: TileMap = { ...FLOOR_MAP, rects: [] };
    let open: GameState = { ...createInitialState(FLOOR_MAP), shadowWalls: [] };
    let without = createInitialState(bare);
    expect(open).toStrictEqual(without);
    for (const input of inputs) {
      open = update(open, input, FLOOR_MAP);
      without = update(without, input, bare);
    }
    expect(open).toStrictEqual(without);
  });
});
```

  In `tests/unit/overview.test.ts`: `FALLEN` gets `lamp: { on: true, strength: 1 }` and, after
  `movers: [],`, `shadowWalls: [{ wall: 1, lit: true, light: 30 }],`. The test of the 43 steps
  expects `lamp: { on: false, strength: 1 }`. The test of the 44th step expects
  `lamp: { on: false, strength: 1 }` and
  `shadowWalls: [{ wall: 1, lit: false, light: 0 }],`. In `tests/unit/draw-scene.test.ts` the
  helper `state` gets `lamp: { on: lampOn, strength: 1 }` and `shadowWalls: [],` after
  `movers: [],`.

- [ ] **Step 6: Run** `npx vitest run tests/unit/state.test.ts tests/unit/overview.test.ts` —
  expected: the new tests fail; `npm run typecheck` names `update.ts` and `overview.ts`.

- [ ] **Step 7: Implement** `src/game/update.ts`. Imports: add
  `import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';`,
  `import { BASE_STRENGTH } from './world';` and `type LampState` to the import from `state`.
  In `createInitialState`, after `checkRoutes(routes, map);`:

```ts
  const walls = wallsOf(map.rects);
```

  and in the returned state `lamp: { on: false, strength: BASE_STRENGTH },` and, after
  `movers`, `shadowWalls: standingWalls(walls),`. Extend its comment: a lamp of strength
  `BASE_STRENGTH`; every shadow wall of the map standing (0014); a rectangle that is no shadow
  wall is rejected here. Replace the body of `update` after the dark:

```ts
  const lamp: LampState = {
    on: input.lamp && state.player.recoil.steps === 0,
    strength: state.lamp.strength,
  };
  const walls = wallsOf(content.rects);
  // The figure, the push and the creatures meet the walls standing at the start of the step.
  const walled = withWalls(content, walls, state.shadowWalls);
  const stepped = stepPlayer(state.player, input, walled);
  const { creatures, captured } = stepCreatures(
    state.creatures,
    state.captured,
    stepped,
    lamp.on,
    walled,
  );
  const hitter = hittingCreature(creatures, stepped);
  const { player, overview, dark } =
    hitter === null
      ? { player: stepped, overview: state.overview, dark: 0 }
      : applyHit(stepped, state.overview, hitter);
  return {
    tick: state.tick + 1,
    player,
    camera: followPlayer(player, content),
    lamp,
    creatures,
    movers: stepMovers(state.movers, routesOf(content.points), player),
    // The light on a wall is tested against the map as loaded: a wall does not block itself.
    shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content),
    captured,
    overview,
    dark,
  };
```

  Extend the comment of `update`: the figure and the creatures are stepped against the map
  with the walls standing at the start of the step; then every standing wall is stepped
  against the stepped figure, on walls rebuilt from the map's rectangles (0014).

  `src/game/overview.ts`: import `restedWalls` from `./shadow`. In `woken`:
  `lamp: { on: false, strength: state.lamp.strength },` and, after `movers`,
  `shadowWalls: restedWalls(state.shadowWalls),`; extend its comment by "every standing wall
  unlit, no lifted wall back (0014)". In `stepDark`: `lamp: { on: false, strength:
  state.lamp.strength },`.

- [ ] **Step 8: Run** `npm run check` — expected: green. Every remaining type error is a
  `GameState` or `LampState` literal in a test that needs the new field.

- [ ] **Step 9: Commit** — `Step the shadow walls and make them solid`, body: the gating rule
  needs something it gates; a wall that stands is a solid and opaque box for the step, added
  to a copy of the map's grids, so the collision and the light of 0005 and 0008 stay as they
  are and the state stays plain data (INV-1).

---

### Task 5: The walls on the floor

**Files:**
- Modify: `tools/floor-layout.ts`, `public/maps/floor.tmj` (generated)
- Test: `tests/unit/floor.test.ts`

**Interfaces:**
- Consumes: `wallsOf`, `standingWalls`, `withWalls` (T3, T4).
- Produces: `SHADOW_WALLS`, `shadowWallBox(cells: CellRect): Box` in `tools/floor-layout.ts`;
  eight rectangle objects in `floor.tmj`.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/floor.test.ts`: import
  `standingWalls`, `wallsOf` and `withWalls` from `../../src/game/shadow`, and `SHADOW_WALLS`
  and `shadowWallBox` from `../../tools/floor-layout.ts`. In the existing test `keeps the five
  points of 0010 first, with their ids` change the expected ids to
  `Array.from({ length: 99 }, (_, i) => i + 1)` and `nextobjectid` to `100`. Add at the end of
  the file:

```ts
describe('the shadow walls of the floor (0014)', () => {
  /** The spec's table: region, density, box. */
  const TABLE: readonly (readonly [string, number, Box])[] = [
    ['sales', 1, { x: 1264, y: 592, width: 4, height: 48 }],
    ['marketing', 1, { x: 368, y: 928, width: 48, height: 4 }],
    ['support', 1, { x: 1232, y: 928, width: 48, height: 4 }],
    ['meeting-rooms', 1, { x: 1424, y: 64, width: 4, height: 48 }],
    ['meeting-rooms', 1, { x: 1424, y: 224, width: 4, height: 48 }],
    ['hr', 2, { x: 160, y: 320, width: 48, height: 4 }],
    ['accounting', 2, { x: 496, y: 320, width: 48, height: 4 }],
    ['development', 3, { x: 1008, y: 320, width: 48, height: 4 }],
  ];
  const walls = wallsOf(floor.rects);
  const overlap = (a: Box, b: Box): boolean =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  it('holds the eight rectangles of the spec after the 91 points, with the ids 92–99', () => {
    expect(floor.rects).toStrictEqual(
      TABLE.map(([region, , box]) => ({ name: `shadow:${region}`, ...box })),
    );
    const objects = floorJson().layers[3].objects;
    expect(objects.slice(0, 91).every((object) => 'point' in object)).toBe(true);
    expect(objects.slice(91).map((object) => [object.id, object.name])).toStrictEqual(
      TABLE.map(([region], i) => [92 + i, `shadow:${region}`]),
    );
    expect(objects.slice(91).some((object) => 'point' in object)).toBe(false);
    expect(floor.points).toHaveLength(90);
  });

  it('builds the boxes from the doorway cells of the layout', () => {
    expect(SHADOW_WALLS.map((wall) => [wall.region, shadowWallBox(wall.cells)])).toStrictEqual(
      TABLE.map(([region, , box]) => [region, box]),
    );
  });

  it('reads them as walls with region, density and box', () => {
    expect(walls).toStrictEqual(TABLE.map(([region, density, box]) => ({ region, density, box })));
  });

  it('puts each wall on the cells of exactly one opening', () => {
    for (const { region, box } of walls) {
      const column = box.x / 16;
      const row = box.y / 16;
      if (box.height === 4) {
        const line = HORIZONTAL_WALLS.find(
          (wall) => wall.row === row && wall.from <= column && column <= wall.to,
        );
        const columns = Array.from({ length: box.width / 16 }, (_, k) => column + k);
        expect(
          columns.every((c) => line?.openings.includes(c)),
          region,
        ).toBe(true);
        expect(line?.openings.includes(column - 1), region).toBe(false);
        expect(line?.openings.includes(column + columns.length), region).toBe(false);
      } else {
        const line = VERTICAL_WALLS.find(
          (wall) => wall.column === column && wall.from <= row && row <= wall.to,
        );
        const rows = Array.from({ length: box.height / 16 }, (_, k) => row + k);
        expect(
          rows.every((r) => line?.openings.includes(r)),
          region,
        ).toBe(true);
        expect(line?.openings.includes(row - 1), region).toBe(false);
        expect(line?.openings.includes(row + rows.length), region).toBe(false);
      }
    }
  });

  it('keeps every wall clear of every solid box of the map', () => {
    for (const { region, box } of walls) {
      for (let row = Math.floor(box.y / 16); row <= Math.ceil((box.y + box.height) / 16) - 1; row += 1) {
        for (
          let column = Math.floor(box.x / 16);
          column <= Math.ceil((box.x + box.width) / 16) - 1;
          column += 1
        ) {
          for (const solid of floor.solids[cell(column, row)] ?? []) {
            expect(overlap(box, solid), `${region} at (${column}, ${row})`).toBe(false);
          }
        }
      }
    }
  });

  it('keeps the spawn, the wake point and the snippets clear of every wall', () => {
    for (const feet of [SPAWN, WAKE, ...SNIPPETS]) {
      for (const { region, box } of walls) {
        expect(overlap(boxAt(feet), box), `(${feet.x}, ${feet.y}) against ${region}`).toBe(false);
      }
    }
  });

  describe('reachability on foot', () => {
    const OPEN: readonly (readonly [string, number, number])[] = [
      ['data protection officer', 19, 34],
      ['reception', 5, 48],
      ['break room', 38, 38],
      ['north corridor', 2, 21],
      ['south corridor', 105, 56],
      ['west corridor', 24, 27],
      ['east corridor', 77, 50],
      ['side passage', 86, 2],
    ];
    const THIN: readonly (readonly [string, number, number])[] = [
      ['sales', 80, 38],
      ['marketing', 24, 60],
      ['support', 78, 59],
      ['meeting room north', 91, 8],
      ['meeting room south', 91, 18],
    ];
    const DENSE: readonly (readonly [string, number, number])[] = [
      ['hr', 11, 17],
      ['accounting', 32, 17],
    ];
    const DENSEST: readonly (readonly [string, number, number])[] = [['development', 64, 13]];
    /** The flood with every wall of a density up to `lifted` gone. */
    const flood = (lifted: number) =>
      reachableFeet(
        withWalls(
          floor,
          walls,
          standingWalls(walls).filter(({ wall }) => (walls[wall]?.density ?? 0) > lifted),
        ),
        SPAWN,
      );
    const names = (
      reached: (feet: Point) => boolean,
      probes: readonly (readonly [string, number, number])[],
    ) => probes.filter(([, column, row]) => reached(feetIn(column, row))).map(([name]) => name);
    const all = (probes: readonly (readonly [string, number, number])[]) =>
      probes.map(([name]) => name);

    it.each([
      [0, all(OPEN), [], [], []],
      [1, all(OPEN), all(THIN), [], []],
      [2, all(OPEN), all(THIN), all(DENSE), []],
      [3, all(OPEN), all(THIN), all(DENSE), all(DENSEST)],
    ])('with the walls up to density %d lifted', (lifted, open, thin, dense, densest) => {
      const reached = flood(lifted);
      expect(names(reached, OPEN)).toStrictEqual(open);
      expect(names(reached, THIN)).toStrictEqual(thin);
      expect(names(reached, DENSE)).toStrictEqual(dense);
      expect(names(reached, DENSEST)).toStrictEqual(densest);
    });
  });
});
```

  `cell`, `boxAt`, `floor`, `feetIn` and `reachableFeet` are the helpers the file already has.

- [ ] **Step 2: Run** `npx vitest run tests/unit/floor.test.ts` — expected: the new tests fail
  (`SHADOW_WALLS` does not exist).

- [ ] **Step 3: Implement** in `tools/floor-layout.ts`. Import `type Box` beside `type Point`.
  After `WAKE`:

```ts
/**
 * The shadow walls (0014): per wall its region and the cells of the doorway it closes. A
 * doorway in a row of cells gets a strip on their top edge, one in a column a strip on their
 * left edge — where the wall strip is missing. The order is the order in the file.
 */
export const SHADOW_WALLS: readonly { readonly region: string; readonly cells: CellRect }[] = [
  { region: 'sales', cells: cells(79, 79, 37, 39) },
  { region: 'marketing', cells: cells(23, 25, 58, 58) },
  { region: 'support', cells: cells(77, 79, 58, 58) },
  { region: 'meeting-rooms', cells: cells(89, 89, 4, 6) },
  { region: 'meeting-rooms', cells: cells(89, 89, 14, 16) },
  { region: 'hr', cells: cells(10, 12, 20, 20) },
  { region: 'accounting', cells: cells(31, 33, 20, 20) },
  { region: 'development', cells: cells(63, 65, 20, 20) },
];

/** A shadow wall is as thick as a wall strip. */
const SHADOW_WALL_THICKNESS = 4;

/** The box of a shadow wall in map pixels: 4 px on the top edge of a row, or on the left edge of a column. */
export function shadowWallBox(rect: CellRect): Box {
  const x = rect.c0 * TILE_SIZE;
  const y = rect.r0 * TILE_SIZE;
  return rect.r0 === rect.r1
    ? { x, y, width: (rect.c1 - rect.c0 + 1) * TILE_SIZE, height: SHADOW_WALL_THICKNESS }
    : { x, y, width: SHADOW_WALL_THICKNESS, height: (rect.r1 - rect.r0 + 1) * TILE_SIZE };
}
```

  After `PointJson`:

```ts
/** A rectangle object as Tiled writes it: no `point` key (0014). */
interface RectJson {
  readonly height: number;
  readonly id: number;
  readonly name: string;
  readonly rotation: 0;
  readonly type: '';
  readonly visible: true;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}
```

  `ObjectLayerJson.objects` becomes `readonly (PointJson | RectJson)[]`. After `pointObject`:

```ts
function rectObject(id: number, name: string, box: Box): RectJson {
  return {
    height: box.height,
    id,
    name,
    rotation: 0,
    type: '',
    visible: true,
    width: box.width,
    x: box.x,
    y: box.y,
  };
}
```

  In `floorJson`: `const firstWall = SNIPPETS.length + 3 + routes.length;` after `routes`; after
  the route points in `objects`:

```ts
          ...SHADOW_WALLS.map((wall, i) =>
            rectObject(firstWall + i, `shadow:${wall.region}`, shadowWallBox(wall.cells)),
          ),
```

  and `nextobjectid: firstWall + SHADOW_WALLS.length,`. Extend the file's head comment by the
  shadow walls of 0014.

- [ ] **Step 4: Generate** — `npm run gen-floor`. Then check that only objects were added:
  `git diff -U0 public/maps/floor.tmj | grep -c '^[-+] *"data"'` prints `0`, and
  `git diff --stat public/maps/floor.tmj` shows insertions and the two changed lines (the comma
  after the last point, `nextobjectid`) and nothing else removed.

- [ ] **Step 5: Run** `npm run check` — expected: green. The four floods are the spec's
  criterion 12 and were checked against the map when this plan was written; if one fails, a
  box is wrong — stop and compare with the spec's table, do not move a probe. The test of
  600 steps of Task 4 now runs on a floor with walls.

- [ ] **Step 6: Commit** — `Close the doorways of the floor with shadow walls`, body: the eight
  rectangles are the first thing the density rule gates; they come from the layout's table so
  the map stays generated until the art pass.

---

### Task 6: The sheet

**Files:**
- Create: `tools/placeholder-shadow-wall.ts`, `public/sprites/shadow-wall.png` (generated)
- Modify: `tools/gen-sprites.ts`
- Test: `tests/unit/gen-sprites.test.ts`, `tests/unit/assets.test.ts`

**Interfaces:**
- Produces: `WALL_FRAME_SIZE` (16), `WALL_STRIP` (4), `WALL_LOOKS` (8), `WALL_ORIENTATIONS`
  (2), `WALL_SHEET_WIDTH` (256), `WALL_SHEET_HEIGHT` (16), `WALL_DARK`,
  `wallInk(look, i, j): PaletteColour | null`, `renderShadowWall(): Uint8Array`;
  `encodeShadowWallPng(): Buffer` in `tools/gen-sprites.ts`.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/gen-sprites.test.ts` import
  `encodeShadowWallPng` from `gen-sprites.ts` and the names above from
  `../../tools/placeholder-shadow-wall.ts`; add at the end:

```ts
describe('the placeholder shadow-wall generator (0014)', () => {
  const FILE = join(ROOT, 'public/sprites/shadow-wall.png');
  const WALL = renderShadowWall();
  /** The colour of pixel (x, y) of a frame, or null when it is transparent. */
  const pixel = (frame: number, x: number, y: number): string | null => {
    const o = (y * WALL_SHEET_WIDTH + frame * WALL_FRAME_SIZE + x) * 4;
    if (WALL[o + 3] === 0) {
      return null;
    }
    expect(WALL[o + 3]).toBe(255);
    return `#${[WALL[o], WALL[o + 1], WALL[o + 2]]
      .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
      .join('')}`;
  };
  const frameOf = (frame: number): (string | null)[] =>
    Array.from({ length: 256 }, (_, at) => pixel(frame, at % 16, Math.floor(at / 16)));

  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeShadowWallPng().equals(encodeShadowWallPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(FILE));
    expect([committed.width, committed.height]).toStrictEqual([256, 16]);
    expect(Buffer.from(WALL).equals(committed.data)).toBe(true);
  });

  it('is 256x16: sixteen 16x16 frames in one row, two orientations of eight looks', () => {
    expect([
      WALL_SHEET_WIDTH,
      WALL_SHEET_HEIGHT,
      WALL_FRAME_SIZE,
      WALL_STRIP,
      WALL_ORIENTATIONS,
      WALL_LOOKS,
    ]).toStrictEqual([256, 16, 16, 4, 2, 8]);
    expect(WALL).toHaveLength(256 * 16 * 4);
  });

  it('draws every look by its rule', () => {
    const violet = SHADOW_COLOUR;
    const rules: readonly ((i: number, j: number) => string | null)[] = [
      (i, j) => ((i + j) % 2 === 0 ? violet : null),
      (i, j) => ((i + j) % 2 === 1 ? violet : null),
      (i, j) => (i % 2 === 0 && j % 2 === 0 ? null : violet),
      (i, j) => (i % 2 === 1 && j % 2 === 1 ? null : violet),
      () => violet,
      (i, j) => ((i + j) % 4 === 0 ? '#181425' : violet),
      (i, j) => ((i + j) % 2 === 0 && i % 4 <= 1 ? violet : null),
      (i, j) => ((i + j) % 8 === 0 ? violet : null),
    ];
    rules.forEach((rule, look) => {
      for (let i = 0; i < 16; i += 1) {
        for (let j = 0; j < 4; j += 1) {
          expect(wallInk(look, i, j), `look ${look} (${i}, ${j})`).toBe(rule(i, j));
          expect(pixel(look, i, j), `horizontal look ${look} (${i}, ${j})`).toBe(rule(i, j));
          expect(pixel(8 + look, j, i), `vertical look ${look} (${i}, ${j})`).toBe(rule(i, j));
        }
      }
    });
  });

  it('has the pixel counts of the spec: a denser wall has more, a wall that gives way loses them', () => {
    for (const orientation of [0, 1]) {
      const frames = Array.from({ length: 8 }, (_, look) => frameOf(orientation * 8 + look));
      expect(frames.map((frame) => frame.filter((colour) => colour !== null).length)).toStrictEqual(
        [32, 32, 48, 48, 64, 64, 16, 8],
      );
      expect(
        frames.map((frame) => frame.filter((colour) => colour === SHADOW_COLOUR).length),
      ).toStrictEqual([32, 32, 48, 48, 64, 48, 16, 8]);
      expect(frames[5]?.filter((colour) => colour === WALL_DARK)).toHaveLength(16);
    }
  });

  it('keeps everything outside the strip transparent: rows 4–15 or columns 4–15', () => {
    for (let look = 0; look < 8; look += 1) {
      for (let a = 0; a < 16; a += 1) {
        for (let b = 4; b < 16; b += 1) {
          expect(pixel(look, a, b)).toBeNull();
          expect(pixel(8 + look, b, a)).toBeNull();
        }
      }
    }
  });

  it('rejects a look outside 0–7', () => {
    expect(() => wallInk(8, 0, 0)).toThrow('a shadow wall has looks 0 to 7, not 8');
  });
});
```

  In `tests/unit/assets.test.ts`: `SHADOW_ASSETS` becomes
  `new Set(['public/sprites/snippet.png', 'public/sprites/shadow-wall.png'])`, its comment
  names 0014; in `allows the reserved colour in a shadow asset and nowhere else` add
  `expect(checkPng('x.png', violet, rulesFor('public/sprites/shadow-wall.png'))).toStrictEqual([]);`
  and expect the list to be exactly those two paths; add:

```ts
  it('checks the shadow-wall sheet under public/sprites/ with every other PNG (0014)', () => {
    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/shadow-wall.png');
  });
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/gen-sprites.test.ts tests/unit/assets.test.ts`
  — expected: fails, the generator does not exist.

- [ ] **Step 3: Implement** `tools/placeholder-shadow-wall.ts`:

```ts
import { type PaletteColour, SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder shadow-wall sheet (visual.md §4, feature 0014): sixteen 16x16 frames in one
 * row, frame = orientation × 8 + look. Orientation 0 is a horizontal wall, a strip on the
 * frame's rows 0–3; orientation 1 a vertical wall, the same strip on its columns 0–3. Looks 0
 * and 1 are a wall of density 1 in its two phases, 2 and 3 density 2, 4 and 5 density 3; looks
 * 6 and 7 are a wall that gives way. A denser wall has more pixels. The second shadow asset:
 * the signature colour, and one dark colour for the densest wall's pattern. Pure — it returns
 * pixels; tools/gen-sprites.ts writes the file.
 */

export const WALL_FRAME_SIZE = 16;
/** The strip is as thick as a wall. */
export const WALL_STRIP = 4;
export const WALL_LOOKS = 8;
export const WALL_ORIENTATIONS = 2;
export const WALL_SHEET_WIDTH = WALL_ORIENTATIONS * WALL_LOOKS * WALL_FRAME_SIZE;
export const WALL_SHEET_HEIGHT = WALL_FRAME_SIZE;
export const WALL_DARK: PaletteColour = '#181425';

/** Pixel (i, j) of a strip of `look`: i counts along it, 0–15, j across it, 0–3. */
export function wallInk(look: number, i: number, j: number): PaletteColour | null {
  switch (look) {
    case 0:
      return (i + j) % 2 === 0 ? SHADOW_COLOUR : null;
    case 1:
      return (i + j) % 2 === 1 ? SHADOW_COLOUR : null;
    case 2:
      return i % 2 === 0 && j % 2 === 0 ? null : SHADOW_COLOUR;
    case 3:
      return i % 2 === 1 && j % 2 === 1 ? null : SHADOW_COLOUR;
    case 4:
      return SHADOW_COLOUR;
    case 5:
      return (i + j) % 4 === 0 ? WALL_DARK : SHADOW_COLOUR;
    case 6:
      return (i + j) % 2 === 0 && i % 4 <= 1 ? SHADOW_COLOUR : null;
    case 7:
      return (i + j) % 8 === 0 ? SHADOW_COLOUR : null;
    default:
      throw new Error(`a shadow wall has looks 0 to ${WALL_LOOKS - 1}, not ${look}`);
  }
}

/** RGBA, row-major, WALL_SHEET_WIDTH × WALL_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderShadowWall(): Uint8Array {
  const data = new Uint8Array(WALL_SHEET_WIDTH * WALL_SHEET_HEIGHT * 4);
  for (let orientation = 0; orientation < WALL_ORIENTATIONS; orientation += 1) {
    for (let look = 0; look < WALL_LOOKS; look += 1) {
      const left = (orientation * WALL_LOOKS + look) * WALL_FRAME_SIZE;
      for (let i = 0; i < WALL_FRAME_SIZE; i += 1) {
        for (let j = 0; j < WALL_STRIP; j += 1) {
          const colour = wallInk(look, i, j);
          if (colour === null) {
            continue;
          }
          const x = orientation === 0 ? i : j;
          const y = orientation === 0 ? j : i;
          data.set([...rgb(colour), 255], (y * WALL_SHEET_WIDTH + left + x) * 4);
        }
      }
    }
  }
  return data;
}
```

  `tools/gen-sprites.ts`: import the generator, add

```ts
export function encodeShadowWallPng(): Buffer {
  const png = new PNG({ width: WALL_SHEET_WIDTH, height: WALL_SHEET_HEIGHT });
  png.data = Buffer.from(renderShadowWall());
  return PNG.sync.write(png);
}
```

  write `public/sprites/shadow-wall.png` in the main block, and name the file in the head
  comment.

- [ ] **Step 4: Generate** — `npm run gen-sprites`; `git status --short public/sprites` shows
  one new file and no changed one.

- [ ] **Step 5: Run** `npm run check` — expected: green.

- [ ] **Step 6: Commit** — `Draw the shadow wall's sheet`, body: the shadow needs colour, form
  and motion (visual.md §4); density is read from how many pixels a wall has, and a wall that
  gives way loses them.

---

### Task 7: The walls in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`, `src/main.ts`
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `wallsOf`, `LIFT_STEPS` (T3, T4); `ShadowWallState` (T4).
- Produces: `SceneContent.shadowWallSheet`; `WALL_LOOKS` (8), `WALL_FLICKER_STEPS` (15),
  `wallLook(wall: ShadowWallState, density: number, tick: number): number`,
  `wallSegments(box: Box, camera: Point): { orientation: number; origins: readonly Point[] }`.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/draw-scene.test.ts`: `CONTENT` gets
  `shadowWallSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },`; import
  `wallLook` and `wallSegments` from `draw-scene` and `type ShadowWallState` from `state`. Add
  at the end (the helper `mover` is declared above the movers' tests):

```ts
describe('the shadow walls in the scene (0014)', () => {
  /** A thin horizontal wall and a dense vertical one, three segments each. */
  const WALLED: SceneContent = {
    ...CONTENT,
    map: {
      ...MAP,
      rects: [
        { name: 'shadow:marketing', x: 16, y: 16, width: 48, height: 4 },
        { name: 'shadow:hr', x: 32, y: 0, width: 4, height: 48 },
      ],
    },
  };
  const standing = (wall: number, fields: Partial<ShadowWallState> = {}): ShadowWallState => ({
    wall,
    lit: false,
    light: 0,
    ...fields,
  });

  it('flickers every 15 steps by its density while the light is not on it', () => {
    const looks = (density: number) =>
      [0, 14, 15, 29, 30].map((tick) => wallLook(standing(0), density, tick));
    expect(looks(1)).toStrictEqual([0, 0, 1, 1, 0]);
    expect(looks(2)).toStrictEqual([2, 2, 3, 3, 2]);
    expect(looks(3)).toStrictEqual([4, 4, 5, 5, 4]);
  });

  it('stands still while it holds against the light', () => {
    expect([0, 15, 30].map((tick) => wallLook(standing(0, { lit: true }), 2, tick))).toStrictEqual([
      2, 2, 2,
    ]);
    expect(wallLook(standing(0, { lit: true }), 3, 15)).toBe(4);
  });

  it('thins out in thirds while it gives way, whatever the tick', () => {
    const look = (light: number) => wallLook(standing(0, { lit: true, light }), 1, 15);
    expect([1, 19, 20, 39, 40, 59].map(look)).toStrictEqual([0, 0, 6, 6, 7, 7]);
  });

  it('cuts a wall into 16 px segments from the corner of its box, shifted by the camera', () => {
    expect(wallSegments({ x: 16, y: 16, width: 48, height: 4 }, { x: 5, y: 7 })).toStrictEqual({
      orientation: 0,
      origins: [
        { x: 11, y: 9 },
        { x: 27, y: 9 },
        { x: 43, y: 9 },
      ],
    });
    expect(wallSegments({ x: 32, y: 0, width: 4, height: 48 }, { x: 5, y: 7 })).toStrictEqual({
      orientation: 1,
      origins: [
        { x: 27, y: -7 },
        { x: 27, y: 9 },
        { x: 27, y: 25 },
      ],
    });
  });

  it('draws the walls after the cone and before the ground movers, in array order', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      {
        ...state({ x: 20, y: 30 }, { x: 5, y: 7 }, true),
        movers: [mover({ kind: 'dog', x: 60, y: 20 })],
        shadowWalls: [standing(0), standing(1)],
      },
      WALLED,
    );
    expect(renderer.sheets[0]).toBe(WALLED.lampSheet);
    expect(renderer.sheets.slice(1, 7).every((sheet) => sheet === WALLED.shadowWallSheet)).toBe(
      true,
    );
    expect(renderer.sheets[7]).toBe(WALLED.moverSheets.dog);
    expect(renderer.sheets[8]).toBe(WALLED.playerSheet);
    expect(renderer.calls.filter((call) => call.startsWith('drawSprite')).slice(1, 7)).toStrictEqual(
      [
        'drawSprite 0 at 11,9',
        'drawSprite 0 at 27,9',
        'drawSprite 0 at 43,9',
        'drawSprite 10 at 27,-7',
        'drawSprite 10 at 27,9',
        'drawSprite 10 at 27,25',
      ],
    );
  });

  it('draws no lifted wall, and no wall on a map without them', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...state({ x: 20, y: 30 }), shadowWalls: [standing(1)] }, WALLED);
    expect(renderer.sheets.filter((sheet) => sheet === WALLED.shadowWallSheet)).toHaveLength(3);
    const bare = recordingRenderer();
    drawScene(bare, state({ x: 20, y: 30 }), CONTENT);
    expect(bare.sheets.filter((sheet) => sheet === CONTENT.shadowWallSheet)).toHaveLength(0);
  });
});
```

  The sheets of `CONTENT` are separate objects, so `toBe` tells them apart: the lamp's sheet
  first, then six frames of the wall sheet, then the dog's, then the figure's.

- [ ] **Step 2: Run** `npx vitest run tests/unit/draw-scene.test.ts` — expected: the new tests
  fail.

- [ ] **Step 3: Implement** in `src/render/draw-scene.ts`. Imports: `type Box` and `TILE_SIZE`
  from `../engine/tiled`, `LIFT_STEPS` and `wallsOf` from `../game/shadow`,
  `type ShadowWallState` from `../game/state`. In `SceneContent`:

```ts
  /** Sixteen 16x16 frames: orientation × 8 + look (0014). */
  readonly shadowWallSheet: SpriteSheet;
```

  After the creatures' functions:

```ts
/** The shadow-wall sheet (0014): frame = orientation × WALL_LOOKS + look. */
export const WALL_LOOKS = 8;
/** A wall the light is not on changes its phase every 15 steps: four changes per second. */
export const WALL_FLICKER_STEPS = 15;
/** The looks of a wall that gives way, one per third of LIFT_STEPS. */
const GIVING_WAY_LOOKS = [0, 6, 7] as const;

/**
 * The look of a standing wall. Giving way: the thin wall's still look, then the two thinner
 * ones, a third of LIFT_STEPS each. Holding against the light: its density's first look,
 * still. Otherwise its density's two looks in turn, by the state's tick.
 */
export function wallLook(wall: ShadowWallState, density: number, tick: number): number {
  if (wall.light > 0) {
    const third = Math.floor((wall.light * GIVING_WAY_LOOKS.length) / LIFT_STEPS);
    return GIVING_WAY_LOOKS[Math.min(third, GIVING_WAY_LOOKS.length - 1)] ?? 0;
  }
  const still = (density - 1) * 2;
  return wall.lit ? still : still + (Math.floor(tick / WALL_FLICKER_STEPS) % 2);
}

/**
 * A wall's frames on the surface: one per 16 px of its length, from the corner of its box. A
 * wall wider than high is horizontal, orientation 0; the camera is whole pixels and so is the
 * box.
 */
export function wallSegments(
  box: Box,
  camera: Point,
): { readonly orientation: number; readonly origins: readonly Point[] } {
  const horizontal = box.width > box.height;
  const count = (horizontal ? box.width : box.height) / TILE_SIZE;
  return {
    orientation: horizontal ? 0 : 1,
    origins: Array.from({ length: count }, (_, k) => ({
      x: box.x + (horizontal ? k * TILE_SIZE : 0) - camera.x,
      y: box.y + (horizontal ? 0 : k * TILE_SIZE) - camera.y,
    })),
  };
}
```

  In `drawScene`, after the cone and before `const ground = …`:

```ts
  const walls = wallsOf(content.map.rects);
  for (const standing of state.shadowWalls) {
    const wall = walls[standing.wall];
    if (wall === undefined) {
      continue;
    }
    const { orientation, origins } = wallSegments(wall.box, camera);
    const frame = orientation * WALL_LOOKS + wallLook(standing, wall.density, state.tick);
    for (const origin of origins) {
      renderer.drawSprite(content.shadowWallSheet, frame, origin.x, origin.y);
    }
  }
```

  Extend the comment of `drawScene`: after the cone come the standing shadow walls in array
  order (0014), then the ground movers. `src/main.ts`:
  `const SHADOW_WALL_SHEET_URL = '/sprites/shadow-wall.png';`, import `TILE_SIZE` from
  `./engine/tiled`, and in `loadContent`:

```ts
    shadowWallSheet: {
      image: await loadImage(SHADOW_WALL_SHEET_URL),
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    },
```

  and name the sheet in the comment of `loadContent`.

- [ ] **Step 4: Run** `npm run check` — expected: green. Then `npm run dev` and look: the
  violet strips stand in the eight doorways and flicker; the game loads without an error in
  the console. Looking is not walking the plan — do not go through the acceptance steps.

- [ ] **Step 5: Commit** — `Draw the shadow walls`, body: the walls lie on the floor like the
  cone and under every figure; the look is derived from the state, so the renderer keeps no
  state of its own.

---

### Task 8: The smoke spec

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Add the test** after the test of the movers:

```ts
test('the floor starts with its eight shadow walls standing and a lamp of strength 1', async ({
  page,
}) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.shadowWalls.length), {
      message: 'window.shadowAi.state.shadowWalls holds the eight walls of the floor',
    })
    .toBe(8);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.shadowWalls).toStrictEqual(
    Array.from({ length: 8 }, (_, wall) => ({ wall, lit: false, light: 0 })),
  );
  expect(state?.lamp.strength).toBe(1);
});
```

- [ ] **Step 2: Run** `npm run test:e2e` — expected: green, the existing tests included (the
  figure's second of walking right from the spawn meets no wall).

- [ ] **Step 3: Commit** — `Check the shadow walls in the smoke spec`, body: the real browser
  must load the rectangles and the sheet; the unit tests cannot see that.

---

### Task 9: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/architecture.md`,
  `docs/spec/visual.md`, `docs/spec/testing.md`, `docs/plan.md`, `README.md`

- [ ] **Step 1: `gameplay.md`.** §2: the sentence that nothing is lit yet and that strength
  and the density rule arrive later is replaced — the lamp has a strength, 1 at the start; a
  shadow wall is in the light when its box meets the cone and nothing opaque lies between the
  figure and it; after one second of unbroken light a wall whose density the strength meets
  is lifted for good; a denser wall stands still in the light and holds. §5: the rule lives in
  `src/game/world.ts` — densities per region, the base strength, the upgrades with the region
  each is earned in — and `gatingFaults` checks the order; nothing earns an upgrade before M6.

- [ ] **Step 2: `world.md` §1**, at "Shadow density": the table of the nine regions with their
  densities; the eight shadow walls and the doorways they close (the spec's table, without the
  ids); the openings that stay open — reception, the data protection officer's office, the
  break room, the side passage; HR, Accounting and Development stay closed until the upgrades
  of M6; the two upgrades and where they are earned, with the note that a case spec of M6 may
  move them.

- [ ] **Step 3: `architecture.md`.** §1 directory list: `game/world.ts`, `game/shadow.ts`,
  `tools/placeholder-shadow-wall.ts`. §2: `lamp.strength`; `shadowWalls` — the three fields,
  that a lifted wall leaves the array, that the walls are rebuilt from `map.rects` in every
  step; the order of a step (figure and creatures against the map with the walls standing at
  its start, then the walls against the stepped figure and the map as loaded); the wake. §5:
  the new draw order, the look rule and the segments. §6: rectangle objects — `TileMap.rects`,
  the loader's four rejections with their messages, the name form `shadow:<region>`, the four
  refusals of `game/shadow`. §7: the generator and the sheet, frame = orientation × 8 + look,
  the table of looks.

- [ ] **Step 4: `visual.md` §4:** the shadow-wall sheet is the second shadow asset; it uses
  the signature colour and `#181425`; three densities by pixel count; flicker four times a
  second; still in the light; two thinner looks while it gives way.

- [ ] **Step 5: `testing.md`.** §1: the world-data test among the unit tests. §2: the INV-6
  row names two shadow assets; the INV-7 row gains the gating test (`gatingFaults` on the
  world data and on four faulty tables), the loader's rejections for rectangle objects and the
  refusals of `game/shadow`. §6: `walls.tmj` and the four maps it rejects,
  `rect-without-name.tmj`, `rect-rotated.tmj`, `rect-outside.tmj`, `object-ellipse.tmj`.

- [ ] **Step 6: `plan.md` §4**, at the end of M3: M3 is done, 0014 was the last of the nine.
  **`README.md`:** one sentence after the moving floor — shadow walls close the doorways of
  the regions under shadow (feature 0014); the lamp lifts the thin ones in a second, the dense
  ones hold until the lamp is stronger; M3 is complete.

- [ ] **Step 7: Run** `npm run check`, **commit** — `Move the shadow walls into the spec`.

---

### Task 10: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [ ] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.

---

### Task 11: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp. Wait until the author is
  ready.
- [ ] **Step 2:** guide the author through steps 1–32 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 10, and start again at step 1.
- [ ] **Step 4:** after step 32 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–32`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0014`. A feel note that wants another
  number — a thicker wall, a shorter second — becomes a new draft, not a change on this branch.

---

### Task 12: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 10. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`; commit — `Mark 0014 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0014: shadow walls and density`, with the walk's result and feel notes in its
  description. CI must be green. The author merges.
