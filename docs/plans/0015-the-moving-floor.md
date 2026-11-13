# 0015 — Implementation plan: the moving floor

**Spec:** [`docs/features/0015-the-moving-floor.md`](../features/0015-the-moving-floor.md)
(approved 2026-11-13). The plan argues from the spec; where they differ, the spec wins. Read the
spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §3, §5, §6 and §7 and
`docs/spec/testing.md` §5. **Written:** 2026-11-13 on the planning model. A working document,
not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0013 is merged into `main`. The routes are checked against the
furniture of 0013; without it Task 4 cannot be green. If 0013's walk moved furniture, stop and
ask the author before Task 4 — the route tables of the spec are revised first. Feature 0014 is
not merged; if it is, stop and ask.

**Goal:** 22 movers — 4 persons, 8 dogs, 8 robot vacuums, 2 drones — follow fixed routes read
from the map's `objects` layer, yield to the figure when they walk on the ground, block nothing
and are drawn in the scene.

**Approach:** seven code tasks, each green on its own. The loader learns the `pause` property
(T1). The routes are built and checked from the map's points (T2), then the step (T3), both
pure and tested without a browser, and wired into the state (T3). Then the data: the route
table in the floor generator (T4). Then the pictures (T5), the scene (T6) and the smoke spec
(T7). Then the documents (T8), the full check with the container (T9), the walk (T10) and the
pull request (T11).

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- INV-1: `GameState.movers` is plain data. The routes are **not** in the state and **not**
  cached in a module: `update` builds them from `map.points` in every step with `routesOf`,
  which only parses 86 names. Do not add a cache, a `Map` at module level or a field on
  `TileMap`.
- INV-2: `src/game/mover.ts` imports nothing from `src/render/` and uses no DOM name.
- INV-4: no visible text is added.
- INV-6: every new PNG uses Endesga 32 only and never `#68386c`.
- INV-7: every route point and every pause comes from `public/maps/floor.tmj`; no coordinate of
  a route appears in `src/`.
- No `any`, no `@ts-ignore`. `exactOptionalPropertyTypes` and unchecked index access are on:
  an optional field is left out, never set to `undefined`.
- Branch `feature/0015-the-moving-floor`, cut from the latest `main`. Commits: imperative
  subject, a body that says why, signed (run `git commit` outside the sandbox).
- The numbers, verbatim from the spec: speeds 40, 60, 20 and 30 px/s for person, dog, vacuum and
  drone; yield under 20 px; pause 0 to 600 steps; 2 to 4 points per route; a person's walk cycle
  15 steps per phase; a dog's 8 steps per phase; the vacuum's light changes every 30 steps; the
  drone's rotors every 4 steps and its 1 px bob every 30 steps.

## File structure

| File | Responsibility |
|---|---|
| `src/engine/tiled.ts` (modify) | `NamedPoint.pause`, read from the object's `properties` |
| `src/game/state.ts` (modify) | `MOVER_KINDS`, `MoverKind`, `MoverState`, `GameState.movers` |
| `src/game/mover.ts` (create) | routes from points, their checks, the initial movers, the step |
| `src/game/creature.ts` (modify) | `creaturesFrom` skips route points |
| `src/game/update.ts` (modify) | movers in the initial state and in the step |
| `tools/floor-layout.ts` (modify) | the route table and its 86 point objects |
| `tools/placeholder-person.ts`, `-dog.ts`, `-vacuum.ts`, `-drone.ts` (create) | the sheets as pure pixel data |
| `tools/gen-sprites.ts` (modify) | writes the seven sheets |
| `src/render/draw-scene.ts` (modify) | the movers' frames, origins and place in the draw order |
| `src/main.ts` (modify) | loads the seven sheets |
| `tests/unit/mover.test.ts` (create) | routes, checks, step |
| `tests/fixtures/maps/routes.tmj` (create) | a 20x12 map with one route of each kind |

---

### Task 1: `pause` on a point

**Files:**
- Modify: `src/engine/tiled.ts` (`NamedPoint`, `readPoints`)
- Test: `tests/unit/tiled.test.ts`

**Interfaces:**
- Produces: `NamedPoint { name: string; x: number; y: number; pause?: number }`. `pause` is
  present only when the object carries the custom property; the loader does not check its
  range.

- [ ] **Step 1: Write the failing tests** in `tests/unit/tiled.test.ts`, beside the tests of the
  named points. Use the file's existing helper that builds a map JSON with an `objects` layer
  (read the tests for "named points" and follow their pattern); the three cases:

```ts
it('reads the pause of a point object from its int property', () => {
  const map = parseWithObjects([
    spawnObject(),
    { id: 2, name: 'dog:hr:1', point: true, x: 40, y: 40,
      properties: [{ name: 'pause', type: 'int', value: 300 }] },
  ]);
  expect(map.points).toStrictEqual([{ name: 'dog:hr:1', x: 40, y: 40, pause: 300 }]);
});

it('leaves pause out when the object has no such property, and ignores other properties', () => {
  const map = parseWithObjects([
    spawnObject(),
    { id: 2, name: 'snippet', point: true, x: 40, y: 40,
      properties: [{ name: 'colour', type: 'string', value: 'red' }] },
  ]);
  expect(map.points).toStrictEqual([{ name: 'snippet', x: 40, y: 40 }]);
});

it('rejects a pause that is not an int property', () => {
  expect(() =>
    parseWithObjects([
      spawnObject(),
      { id: 2, name: 'dog:hr:1', point: true, x: 40, y: 40,
        properties: [{ name: 'pause', type: 'string', value: '300' }] },
    ]),
  ).toThrow('point "dog:hr:1" has a pause that is not an int property');
});
```

  `parseWithObjects` and `spawnObject` stand for the helpers the file already has; if it has
  none, add them at the top of the `describe` from the existing inline map JSON.

- [ ] **Step 2: Run** `npx vitest run tests/unit/tiled.test.ts` — expected: the three fail.

- [ ] **Step 3: Implement.** In `src/engine/tiled.ts`:

```ts
/** A point object of the `objects` layer other than the spawn (0008): what it is, is the game's business. */
export interface NamedPoint extends Point {
  readonly name: string;
  /** The custom property `pause` (0015), in steps; absent when the object has none. */
  readonly pause?: number;
}

/** The `pause` of a point object: an int property, or nothing (0015). */
function readPause(object: Json, name: string, file: string): number | undefined {
  if (object.properties === undefined) {
    return undefined;
  }
  for (const entry of asArray(object.properties, file, `point "${name}" properties`)) {
    const property = asRecord(entry, file, `point "${name}" property`);
    if (property.name !== 'pause') {
      continue;
    }
    if (property.type !== 'int' || typeof property.value !== 'number') {
      fail(file, `point "${name}" has a pause that is not an int property`);
    }
    return property.value;
  }
  return undefined;
}
```

  and in `readPoints`, where the point is built: compute `const pause = readPause(object, name,
  file)` and return `pause === undefined ? { name, x, y } : { name, x, y, pause }`. Keep the
  existing message prefix of `fail`; the test matches a substring.

- [ ] **Step 4: Run** `npm run check` — expected: green.

- [ ] **Step 5: Commit** — `Read the pause of a point object`, body: routes of 0015 need a pause
  per point and the map is where it lives (INV-7).

---

### Task 2: Routes from the map's points

**Files:**
- Modify: `src/game/state.ts`, `src/game/creature.ts`
- Create: `src/game/mover.ts`, `tests/unit/mover.test.ts`

**Interfaces:**
- Consumes: `NamedPoint` with `pause?` (T1); `SolidGrid` from `src/engine/collision`;
  `BOX_WIDTH` (12) and `BOX_HEIGHT` (8) from `src/game/player`.
- Produces, in `state.ts`: `MOVER_KINDS`, `MoverKind`, `MoverState`. In `mover.ts`:
  `ROOMS`, `isRoutePoint(name)`, `RoutePoint`, `Route`, `routesOf(points): Route[]`,
  `checkRoutes(routes, grid): void`, `moversFrom(routes): MoverState[]`.

- [ ] **Step 1: Add the types** to `src/game/state.ts` (no test of its own; T3 adds the field to
  `GameState`):

```ts
/** What moves on the floor without a role in a case (0015), in the order of the spec's tables. */
export const MOVER_KINDS = ['person', 'dog', 'vacuum', 'drone'] as const;
export type MoverKind = (typeof MOVER_KINDS)[number];

/** A mover on its route (0015). The route's points stay in the map. */
export interface MoverState {
  readonly kind: MoverKind;
  /** Which picture: a person's number among the persons, a dog's among the dogs modulo 2, else 0. */
  readonly look: number;
  /** The index of its route in `routesOf(map.points)`. */
  readonly route: number;
  /** The feet in map pixels, floating point: the bottom centre of its sprite. */
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  /** A person: 0 stands, 1–4 walk. A dog: 0 stands, 1 steps, 2 sits. Others: 0. */
  readonly frame: number;
  /** Steps spent in the current phase. */
  readonly frameTimer: number;
  /** The index of the route point it is heading for. */
  readonly target: number;
  /** Steps it still waits on the point it stands on. */
  readonly wait: number;
}
```

- [ ] **Step 2: Write the failing tests** in `tests/unit/mover.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { SolidGrid } from '../../src/engine/collision';
import type { NamedPoint } from '../../src/engine/tiled';
import { creaturesFrom } from '../../src/game/creature';
import { checkRoutes, isRoutePoint, moversFrom, routesOf } from '../../src/game/mover';
import { solidsOf } from './solids';

/** Cell (c, r) as the spec writes it: the middle of the cell. */
function at(name: string, c: number, r: number, pause?: number): NamedPoint {
  const point = { name, x: 16 * c + 8, y: 16 * r + 8 };
  return pause === undefined ? point : { ...point, pause };
}

/** 10x6 cells, all open but (5, 2). */
const GRID: SolidGrid = {
  width: 10,
  height: 6,
  solids: solidsOf(
    Array.from({ length: 60 }, (_, i) => i === 2 * 10 + 5),
    10,
  ),
};

const DOG = [at('dog:hr:1', 1, 1, 300), at('dog:hr:2', 3, 1), at('dog:hr:3', 3, 3, 420)];

describe('routesOf', () => {
  it('builds a route from its points, in number order, pause 0 when absent', () => {
    expect(routesOf([DOG[2], DOG[0], DOG[1]] as NamedPoint[])).toStrictEqual([
      {
        name: 'dog:hr',
        kind: 'dog',
        points: [
          { x: 24, y: 24, pause: 300 },
          { x: 56, y: 24, pause: 0 },
          { x: 56, y: 56, pause: 420 },
        ],
      },
    ]);
  });

  it('orders routes by the first appearance of one of their points and skips other points', () => {
    const routes = routesOf([
      at('snippet', 0, 0),
      at('vacuum:sales:2', 2, 0),
      at('dog:hr:1', 1, 1),
      at('wake', 0, 1),
      at('vacuum:sales:1', 1, 0),
      at('dog:hr:2', 3, 1),
    ]);
    expect(routes.map((route) => route.name)).toStrictEqual(['vacuum:sales', 'dog:hr']);
  });

  it.each([
    [[at('dog:hr:1', 1, 1)], 'route dog:hr has 1 point, 2 to 4 are allowed'],
    [
      [1, 2, 3, 4, 5].map((n) => at(`dog:hr:${n}`, n, 1)),
      'route dog:hr has 5 points, 2 to 4 are allowed',
    ],
    [[at('dog:hr:1', 1, 1), at('dog:hr:3', 3, 1)], 'route dog:hr has no point 2'],
    [
      [at('dog:hr:1', 1, 1), at('dog:hr:2', 3, 1), at('dog:hr:2', 3, 3)],
      'route dog:hr has two points 2',
    ],
    [[at('dog:hr', 1, 1)], 'point dog:hr is not a route point'],
    [[at('cat:hr:1', 1, 1)], 'point cat:hr:1 is not a route point'],
    [[at('dog:hr:0', 1, 1)], 'point dog:hr:0 is not a route point'],
    [[at('dog:hr:1:2', 1, 1)], 'point dog:hr:1:2 is not a route point'],
    [[at('dog:cellar:1', 1, 1)], 'point dog:cellar:1 names no room'],
    [[at('dog:hr:1', 1, 1, 700)], 'point dog:hr:1 has pause 700, 0 to 600 are allowed'],
    [[at('dog:hr:1', 1, 1, -1)], 'point dog:hr:1 has pause -1, 0 to 600 are allowed'],
    [[at('dog:hr:1', 1, 1, 1.5)], 'point dog:hr:1 has pause 1.5, 0 to 600 are allowed'],
  ])('rejects %#', (points, message) => {
    expect(() => routesOf(points)).toThrow(message);
  });
});

describe('checkRoutes', () => {
  it('accepts straight legs on open cells, the closing leg included', () => {
    const square = [
      at('dog:hr:1', 1, 1),
      at('dog:hr:2', 3, 1),
      at('dog:hr:3', 3, 3),
      at('dog:hr:4', 1, 3),
    ];
    expect(() => checkRoutes(routesOf(square), GRID)).not.toThrow();
  });

  it('rejects a closing leg that is not straight', () => {
    expect(() => checkRoutes(routesOf(DOG), GRID)).toThrow('route dog:hr leg 3 is not straight');
  });

  it('rejects a ground leg across a solid cell and names the cell', () => {
    const across = [at('vacuum:hr:1', 3, 2), at('vacuum:hr:2', 7, 2)];
    expect(() => checkRoutes(routesOf(across), GRID)).toThrow(
      'route vacuum:hr leg 1 crosses a solid tile (5, 2)',
    );
  });

  it('lets a box pass flush beside a solid cell: the box is 12 px wide and 8 px high', () => {
    // Feet on row 1's middle: the box is y 16–24, the solid cell starts at y 32.
    const beside = [at('person:hr:1', 3, 1), at('person:hr:2', 7, 1)];
    expect(() => checkRoutes(routesOf(beside), GRID)).not.toThrow();
  });

  it('lets a drone cross anything', () => {
    const over = [at('drone:hr:1', 3, 2), at('drone:hr:2', 7, 2)];
    expect(() => checkRoutes(routesOf(over), GRID)).not.toThrow();
  });
});

describe('moversFrom', () => {
  it('puts each mover on its point 1, facing down, waiting its pause, heading for point 2', () => {
    expect(moversFrom(routesOf(DOG))).toStrictEqual([
      {
        kind: 'dog',
        look: 0,
        route: 0,
        x: 24,
        y: 24,
        facing: 'down',
        frame: 0,
        frameTimer: 0,
        target: 1,
        wait: 300,
      },
    ]);
  });

  it('numbers persons 0–3 and dogs 0, 1 in turn; vacuums and drones are 0', () => {
    const pair = (name: string, r: number) => [at(`${name}:1`, 1, r), at(`${name}:2`, 3, r)];
    const routes = routesOf([
      ...pair('person:hr', 0),
      ...pair('dog:hr', 1),
      ...pair('person:sales', 2),
      ...pair('dog:sales', 3),
      ...pair('dog:support', 4),
      ...pair('vacuum:hr', 5),
      ...pair('vacuum:sales', 0),
      ...pair('drone:hr', 1),
    ]);
    expect(moversFrom(routes).map((mover) => `${mover.kind} ${mover.look}`)).toStrictEqual([
      'person 0',
      'dog 0',
      'person 1',
      'dog 1',
      'dog 0',
      'vacuum 0',
      'vacuum 0',
      'drone 0',
    ]);
  });
});

describe('route points and creatures', () => {
  it('knows a route point by its colon', () => {
    expect(isRoutePoint('dog:hr:1')).toBe(true);
    expect(isRoutePoint('snippet')).toBe(false);
  });

  it('creaturesFrom skips route points and still rejects an unknown name', () => {
    expect(creaturesFrom([at('dog:hr:1', 1, 1), at('snippet', 2, 2)])).toHaveLength(1);
    expect(() => creaturesFrom([at('ghost', 1, 1)])).toThrow('unknown point object "ghost"');
  });
});
```

- [ ] **Step 3: Run** `npx vitest run tests/unit/mover.test.ts` — expected: fails, `mover` does
  not exist.

- [ ] **Step 4: Implement** `src/game/mover.ts`:

```ts
import type { Box, SolidGrid } from '../engine/collision';
import { type NamedPoint, type Point, TILE_SIZE } from '../engine/tiled';
import { BOX_HEIGHT, BOX_WIDTH } from './player';
import { MOVER_KINDS, type MoverKind, type MoverState } from './state';

/**
 * The movers (world.md §1, feature 0015): colleagues, dogs, robot vacuums and drones on fixed
 * routes. A route is two to four points of the map, named `<kind>:<room>:<n>`; a mover goes
 * from point to point in a straight line, waits each point's pause and starts again after the
 * last. Nothing here is solid. Pure data and pure functions; the routes are read from the
 * map's points on every call and kept nowhere.
 */

/** The rooms that have movers; `<room>` in a point's name. */
export const ROOMS = [
  'hr',
  'accounting',
  'development',
  'reception',
  'break-room',
  'sales',
  'marketing',
  'support',
] as const;

export const MIN_ROUTE_POINTS = 2;
export const MAX_ROUTE_POINTS = 4;
/** Ten seconds. */
export const MAX_PAUSE = 600;
/** Dogs come in two coats. */
export const DOG_LOOKS = 2;

export interface RoutePoint extends Point {
  /** Steps a mover waits here. */
  readonly pause: number;
}

export interface Route {
  /** `<kind>:<room>`. */
  readonly name: string;
  readonly kind: MoverKind;
  readonly points: readonly RoutePoint[];
}

/** A route point has a colon in its name; every other point is a creature's or `wake`. */
export function isRoutePoint(name: string): boolean {
  return name.includes(':');
}

function isKind(value: string | undefined): value is MoverKind {
  return (MOVER_KINDS as readonly (string | undefined)[]).includes(value);
}

function isRoom(value: string): boolean {
  return (ROOMS as readonly string[]).includes(value);
}

/**
 * The routes of a map, in the order in which each route's first point appears. Rejects a name
 * that is no route point, an unknown room, a pause outside 0–MAX_PAUSE, a number used twice, a
 * route with fewer than two or more than four points, and a gap in the numbers.
 */
export function routesOf(points: readonly NamedPoint[]): Route[] {
  const groups = new Map<string, { kind: MoverKind; numbered: Map<number, RoutePoint> }>();
  for (const point of points) {
    if (!isRoutePoint(point.name)) {
      continue;
    }
    const [kind, room, n, ...rest] = point.name.split(':');
    if (
      !isKind(kind) ||
      room === undefined ||
      n === undefined ||
      rest.length > 0 ||
      !/^[1-9]\d*$/.test(n)
    ) {
      throw new Error(`point ${point.name} is not a route point`);
    }
    if (!isRoom(room)) {
      throw new Error(`point ${point.name} names no room`);
    }
    const pause = point.pause ?? 0;
    if (!Number.isInteger(pause) || pause < 0 || pause > MAX_PAUSE) {
      throw new Error(`point ${point.name} has pause ${pause}, 0 to ${MAX_PAUSE} are allowed`);
    }
    const name = `${kind}:${room}`;
    const group = groups.get(name) ?? { kind, numbered: new Map<number, RoutePoint>() };
    groups.set(name, group);
    const number = Number(n);
    if (group.numbered.has(number)) {
      throw new Error(`route ${name} has two points ${number}`);
    }
    group.numbered.set(number, { x: point.x, y: point.y, pause });
  }
  return [...groups].map(([name, group]) => {
    const count = group.numbered.size;
    if (count < MIN_ROUTE_POINTS || count > MAX_ROUTE_POINTS) {
      throw new Error(
        `route ${name} has ${count} ${count === 1 ? 'point' : 'points'}, ${MIN_ROUTE_POINTS} to ${MAX_ROUTE_POINTS} are allowed`,
      );
    }
    const ordered: RoutePoint[] = [];
    for (let number = 1; number <= count; number += 1) {
      const point = group.numbered.get(number);
      if (point === undefined) {
        throw new Error(`route ${name} has no point ${number}`);
      }
      ordered.push(point);
    }
    return { name, kind: group.kind, points: ordered };
  });
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** The first cell, row by row, in which the box meets a solid box; null when it meets none. */
function firstSolidCell(box: Box, grid: SolidGrid): Point | null {
  const lastColumn = Math.min(Math.ceil((box.x + box.width) / TILE_SIZE) - 1, grid.width - 1);
  const lastRow = Math.min(Math.ceil((box.y + box.height) / TILE_SIZE) - 1, grid.height - 1);
  for (let row = Math.max(Math.floor(box.y / TILE_SIZE), 0); row <= lastRow; row += 1) {
    for (let column = Math.max(Math.floor(box.x / TILE_SIZE), 0); column <= lastColumn; column += 1) {
      const solids = grid.solids[row * grid.width + column] ?? [];
      if (solids.some((solid) => overlaps(box, solid))) {
        return { x: column, y: row };
      }
    }
  }
  return null;
}

/**
 * Every leg, the one from the last point to the first included, is horizontal or vertical; on
 * a ground route the mover's box — the figure's, [x − 6, x + 6) × [y − 8, y) — meets no solid
 * box on the way. A drone's legs may cross anything.
 */
export function checkRoutes(routes: readonly Route[], grid: SolidGrid): void {
  for (const route of routes) {
    for (const [index, from] of route.points.entries()) {
      const to = route.points[(index + 1) % route.points.length];
      if (to === undefined) {
        continue;
      }
      if (from.x !== to.x && from.y !== to.y) {
        throw new Error(`route ${route.name} leg ${index + 1} is not straight`);
      }
      if (route.kind === 'drone') {
        continue;
      }
      const cell = firstSolidCell(
        {
          x: Math.min(from.x, to.x) - BOX_WIDTH / 2,
          y: Math.min(from.y, to.y) - BOX_HEIGHT,
          width: Math.abs(to.x - from.x) + BOX_WIDTH,
          height: Math.abs(to.y - from.y) + BOX_HEIGHT,
        },
        grid,
      );
      if (cell !== null) {
        throw new Error(
          `route ${route.name} leg ${index + 1} crosses a solid tile (${cell.x}, ${cell.y})`,
        );
      }
    }
  }
}

/** One mover per route, in route order: on point 1, facing down, waiting point 1's pause. */
export function moversFrom(routes: readonly Route[]): MoverState[] {
  return routes.flatMap((route, index) => {
    const first = route.points[0];
    if (first === undefined) {
      return [];
    }
    const earlier = routes.slice(0, index).filter((other) => other.kind === route.kind).length;
    const look = route.kind === 'person' ? earlier : route.kind === 'dog' ? earlier % DOG_LOOKS : 0;
    return [
      {
        kind: route.kind,
        look,
        route: index,
        x: first.x,
        y: first.y,
        facing: 'down' as const,
        frame: 0,
        frameTimer: 0,
        target: 1,
        wait: first.pause,
      },
    ];
  });
}
```

  If `Box` is not exported from `src/engine/collision` under that name, import it from
  `src/engine/tiled`. If `BOX_WIDTH` or `BOX_HEIGHT` have other values than 12 and 8, stop and
  ask.

  In `src/game/creature.ts`, `creaturesFrom`: import `isRoutePoint` from `./mover` and extend
  the filter to `point.name !== WAKE_POINT && !isRoutePoint(point.name)`. Check that this adds
  no import cycle that breaks at load: `mover.ts` must not import from `creature.ts`.

- [ ] **Step 5: Run** `npm run check` — expected: green.

- [ ] **Step 6: Commit** — `Build and check routes from the map's points`, body: the map is the
  truth of where things move (INV-7); a route that crosses furniture is a map fault and is
  refused before the game starts.

---

### Task 3: The step, and the movers in the state

**Files:**
- Modify: `src/game/mover.ts`, `src/game/state.ts` (`GameState.movers`), `src/game/update.ts`
- Test: `tests/unit/mover.test.ts`, `tests/unit/state.test.ts`
- Create: `tests/fixtures/maps/routes.tmj`

**Interfaces:**
- Consumes: `Route`, `routesOf`, `checkRoutes`, `moversFrom` (T2).
- Produces: `SPEED_PX_PER_SECOND`, `YIELD_DISTANCE`, `PERSON_STEPS_PER_PHASE`,
  `DOG_STEPS_PER_PHASE`, `DOG_SIT_FRAME`, `MOVER_SIZE`, `stepMover(mover, route, player)`,
  `stepMovers(movers, routes, player)`; `GameState.movers: readonly MoverState[]`.

- [ ] **Step 1: Write the failing step tests**, appended to `tests/unit/mover.test.ts` (add
  `stepMover`, `YIELD_DISTANCE` and the types to the imports; `PlayerState` and `NO_RECOIL` come
  from `src/game/state`):

```ts
function playerAt(x: number, y: number): PlayerState {
  return { x, y, facing: 'down', frame: 0, frameTimer: 0, grace: 0, recoil: NO_RECOIL };
}
const FAR = playerAt(1000, 1000);

/** A route of `kind` from (24, 24) right to (136, 24): 112 px, pauses 3 and 2. */
function line(kind: MoverKind): Route {
  return routesOf([at(`${kind}:hr:1`, 1, 1, 3), at(`${kind}:hr:2`, 8, 1, 2)])[0] as Route;
}
function start(route: Route): MoverState {
  return moversFrom([route])[0] as MoverState;
}
function run(mover: MoverState, route: Route, steps: number, player = FAR): MoverState {
  let current = mover;
  for (let i = 0; i < steps; i += 1) {
    current = stepMover(current, route, player);
  }
  return current;
}

describe('stepMover', () => {
  it('waits the pause of its point, then moves by its speed', () => {
    const route = line('dog');
    const waited = run(start(route), route, 3);
    expect(waited).toMatchObject({ x: 24, y: 24, wait: 0, frame: 2 });
    expect(run(waited, route, 1)).toMatchObject({ x: 25, y: 24, facing: 'right', frame: 0 });
  });

  it.each([
    ['person', 168],
    ['dog', 112],
    ['vacuum', 336],
    ['drone', 224],
  ] as const)('a %s covers 112 px in %i steps and stands exactly on the point', (kind, steps) => {
    const route = line(kind);
    const before = run(start(route), route, 3 + steps - 1);
    expect(before.x).toBeLessThan(136);
    expect(before.target).toBe(1);
    const arrived = run(before, route, 1);
    expect(arrived).toMatchObject({ x: 136, y: 24, target: 0, wait: 2 });
  });

  it('goes back to the first point after the last', () => {
    const route = line('dog');
    const back = run(start(route), route, 3 + 112 + 2 + 112);
    expect(back).toMatchObject({ x: 24, y: 24, target: 1, wait: 3, facing: 'left' });
  });

  it('faces along each leg of a square', () => {
    const route = routesOf([
      at('dog:hr:1', 1, 1),
      at('dog:hr:2', 2, 1),
      at('dog:hr:3', 2, 2),
      at('dog:hr:4', 1, 2),
    ])[0] as Route;
    const facings = [1, 17, 33, 49].map((steps) => run(start(route), route, steps).facing);
    expect(facings).toStrictEqual(['right', 'down', 'left', 'up']);
  });

  it('a person stands while it waits and walks 1, 2, 3, 4, 1 at 15 steps per phase', () => {
    const route = line('person');
    const waited = run(start(route), route, 3);
    expect(waited.frame).toBe(0);
    const frames = [1, 15, 16, 31, 46, 61].map((steps) => run(waited, route, steps).frame);
    expect(frames).toStrictEqual([1, 1, 2, 3, 4, 1]);
  });

  it('a dog sits while it waits and steps 0, 1 in turn every 8 steps', () => {
    const route = line('dog');
    const waited = run(start(route), route, 3);
    const frames = [1, 8, 9, 17].map((steps) => run(waited, route, steps).frame);
    expect(frames).toStrictEqual([0, 0, 1, 0]);
  });

  it('a vacuum and a drone keep frame 0 and face down', () => {
    for (const kind of ['vacuum', 'drone'] as const) {
      const route = line(kind);
      expect(run(start(route), route, 20)).toMatchObject({ frame: 0, facing: 'down' });
    }
  });

  it('yields under 20 px: only frame and frameTimer change, and wait is not counted', () => {
    const route = line('dog');
    const walking = run(start(route), route, 3 + 12);
    const near = playerAt(walking.x + 19.9, walking.y);
    const held = run(walking, route, 30, near);
    expect(held).toStrictEqual({ ...walking, frame: 0, frameTimer: 0 });
    const waiting = start(route);
    expect(run(waiting, route, 30, playerAt(24, 24))).toStrictEqual({
      ...waiting,
      frame: 0,
      frameTimer: 0,
    });
  });

  it('goes on at exactly 20 px and beyond', () => {
    const route = line('dog');
    const walking = run(start(route), route, 3 + 12);
    for (const distance of [YIELD_DISTANCE, 20.1]) {
      const moved = stepMover(walking, route, playerAt(walking.x, walking.y + distance));
      expect(moved.x).toBe(walking.x + 1);
    }
  });

  it('a drone does not yield', () => {
    const route = line('drone');
    const flying = run(start(route), route, 3 + 12);
    expect(stepMover(flying, route, playerAt(flying.x, flying.y)).x).toBe(flying.x + 0.5);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/mover.test.ts` — expected: the new block fails.

- [ ] **Step 3: Implement the step** in `src/game/mover.ts` (add `STEPS_PER_SECOND` from
  `../engine/loop`, `Facing` and `PlayerState` from `./state`):

```ts
/** Tune: half the figure's speed for a person; a dog trots, a vacuum crawls. */
export const SPEED_PX_PER_SECOND: Readonly<Record<MoverKind, number>> = {
  person: 40,
  dog: 60,
  vacuum: 20,
  drone: 30,
};
/** Tune: closer than this to the figure's feet, a ground mover stands. */
export const YIELD_DISTANCE = 20;
/** Tune: four phases per second, half the figure's rate at half its speed. */
export const PERSON_STEPS_PER_PHASE = 15;
export const PERSON_WALK_PHASES = 4;
export const DOG_STEPS_PER_PHASE = 8;
export const DOG_SIT_FRAME = 2;
/** A dog's, a vacuum's and a drone's sprite is one tile; a person's is the figure's 16x24. */
export const MOVER_SIZE = 16;

/** Sums of thirds do not land exactly; this is far below a pixel and far above the error. */
const ARRIVAL_SLACK = 1e-6;

/** The frame of a mover that moves in this step. */
function walkFrame(mover: MoverState): { readonly frame: number; readonly frameTimer: number } {
  if (mover.kind === 'person') {
    if (mover.frame === 0) {
      return { frame: 1, frameTimer: 0 };
    }
    return mover.frameTimer + 1 < PERSON_STEPS_PER_PHASE
      ? { frame: mover.frame, frameTimer: mover.frameTimer + 1 }
      : { frame: (mover.frame % PERSON_WALK_PHASES) + 1, frameTimer: 0 };
  }
  if (mover.kind === 'dog') {
    if (mover.frame === DOG_SIT_FRAME) {
      return { frame: 0, frameTimer: 0 };
    }
    return mover.frameTimer + 1 < DOG_STEPS_PER_PHASE
      ? { frame: mover.frame, frameTimer: mover.frameTimer + 1 }
      : { frame: 1 - mover.frame, frameTimer: 0 };
  }
  return { frame: 0, frameTimer: 0 };
}

function legFacing(mover: MoverState, dx: number, dy: number): Facing {
  if (mover.kind === 'vacuum' || mover.kind === 'drone') {
    return 'down';
  }
  if (dx !== 0) {
    return dx > 0 ? 'right' : 'left';
  }
  if (dy !== 0) {
    return dy > 0 ? 'down' : 'up';
  }
  return mover.facing;
}

/**
 * One mover, one step (0015). A ground mover closer than YIELD_DISTANCE to the figure's feet
 * stands, and nothing else changes. Otherwise it waits, or moves toward its target by its speed
 * or by what is left; on arrival it stands on the point, takes the point's pause and turns to
 * the next point, the first after the last.
 */
export function stepMover(mover: MoverState, route: Route, player: PlayerState): MoverState {
  if (
    mover.kind !== 'drone' &&
    Math.hypot(player.x - mover.x, player.y - mover.y) < YIELD_DISTANCE
  ) {
    return { ...mover, frame: 0, frameTimer: 0 };
  }
  if (mover.wait > 0) {
    return {
      ...mover,
      wait: mover.wait - 1,
      frame: mover.kind === 'dog' ? DOG_SIT_FRAME : 0,
      frameTimer: 0,
    };
  }
  const target = route.points[mover.target];
  if (target === undefined) {
    return mover;
  }
  const dx = target.x - mover.x;
  const dy = target.y - mover.y;
  const left = Math.abs(dx) + Math.abs(dy);
  const distance = SPEED_PX_PER_SECOND[mover.kind] / STEPS_PER_SECOND;
  const moving = { ...mover, ...walkFrame(mover), facing: legFacing(mover, dx, dy) };
  if (left <= distance + ARRIVAL_SLACK) {
    return {
      ...moving,
      x: target.x,
      y: target.y,
      target: (mover.target + 1) % route.points.length,
      wait: target.pause,
    };
  }
  return {
    ...moving,
    x: mover.x + Math.sign(dx) * distance,
    y: mover.y + Math.sign(dy) * distance,
  };
}

/** Every mover against the figure, in array order. */
export function stepMovers(
  movers: readonly MoverState[],
  routes: readonly Route[],
  player: PlayerState,
): MoverState[] {
  return movers.map((mover) => {
    const route = routes[mover.route];
    return route === undefined ? mover : stepMover(mover, route, player);
  });
}
```

  A leg is horizontal or vertical (`checkRoutes`), so `|dx| + |dy|` is its length and only one
  of the two signs is not 0.

- [ ] **Step 4: Run** `npx vitest run tests/unit/mover.test.ts` — expected: green. If a count of
  steps is off by one for one kind, the fault is in the test's arithmetic or in
  `ARRIVAL_SLACK`; do not change a speed.

- [ ] **Step 5: Create the fixture** `tests/fixtures/maps/routes.tmj`: copy the smallest
  existing 20x12 fixture map that has an open floor and a `spawn` (read `tests/fixtures/maps/`
  and `tests/unit/test-map.test.ts` for the loading helper), keep its tile layers, and set the
  `objects` layer to the spawn plus these points, ids from 2, cells as (16c + 8, 16r + 8), on
  open cells of that map (move a route by whole cells if the fixture has a wall there, and keep
  the shape):

  | Name | Cell | `pause` |
  |---|---|---|
  | `person:reception:1` | (2, 2) | 3 |
  | `person:reception:2` | (6, 2) | — |
  | `dog:hr:1` | (2, 4) | 3 |
  | `dog:hr:2` | (6, 4) | 2 |
  | `vacuum:sales:1` | (2, 6) | — |
  | `vacuum:sales:2` | (6, 6) | — |
  | `drone:marketing:1` | (2, 8) | — |
  | `drone:marketing:2` | (6, 8) | — |

- [ ] **Step 6: Write the failing state tests** in `tests/unit/state.test.ts`, loading
  `routes.tmj` with the file's existing loader helper as `ROUTES_MAP`:

```ts
describe('movers in the state (0015)', () => {
  it('starts with one mover per route, in route order, on point 1', () => {
    const state = createInitialState(ROUTES_MAP);
    expect(state.movers.map((m) => [m.kind, m.x, m.y, m.wait, m.target])).toStrictEqual([
      ['person', 40, 40, 3, 1],
      ['dog', 40, 72, 3, 1],
      ['vacuum', 40, 104, 0, 1],
      ['drone', 40, 136, 0, 1],
    ]);
    expect(state.creatures).toStrictEqual([]);
  });

  it('refuses a map whose route crosses a solid tile before the game starts', () => {
    const blocked = {
      ...ROUTES_MAP,
      solids: ROUTES_MAP.solids.map((boxes, i) =>
        i === 4 * ROUTES_MAP.width + 4 ? [{ x: 64, y: 64, width: 16, height: 16 }] : boxes,
      ),
    };
    expect(() => createInitialState(blocked)).toThrow(
      'route dog:hr leg 1 crosses a solid tile (4, 4)',
    );
  });

  it('steps the movers and survives a JSON round trip at the start and after 600 steps', () => {
    let state = createInitialState(ROUTES_MAP);
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    for (let i = 0; i < 600; i += 1) {
      state = update(state, IDLE, ROUTES_MAP);
    }
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    expect(state.movers.some((m) => m.x !== 40)).toBe(true);
  });

  it('moves no mover in the dark', () => {
    const running = createInitialState(ROUTES_MAP);
    const dark = { ...running, dark: 1 };
    expect(update(dark, IDLE, ROUTES_MAP).movers).toStrictEqual(dark.movers);
  });

  it('leaves the figure and the creatures as they are without movers (criterion 8)', () => {
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
    }));
    let withMovers = createInitialState(FLOOR_MAP);
    let without = { ...withMovers, movers: [] };
    for (const input of inputs) {
      withMovers = update(withMovers, input, FLOOR_MAP);
      without = update(without, input, FLOOR_MAP);
    }
    expect({ ...withMovers, movers: [] }).toStrictEqual(without);
  });
});
```

  `IDLE` is an input with every key false; `FLOOR_MAP` is the loaded `public/maps/floor.tmj` —
  use the file's existing constants if it has them, else load them as `floor.test.ts` does.
  Until T4 the floor has no routes, so the last test is green trivially; it becomes meaningful
  with T4 and must still be green then.

- [ ] **Step 7: Run** — expected: the first four fail on `movers`.

- [ ] **Step 8: Wire the state.** `src/game/state.ts`, in `GameState` after `creatures`:

```ts
  /** The movers on their routes, in route order (0015). */
  readonly movers: readonly MoverState[];
```

  `src/game/update.ts`:

```ts
import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
```

  in `createInitialState`, before the `return`:

```ts
  const routes = routesOf(map.points);
  checkRoutes(routes, map);
```

  and `movers: moversFrom(routes),` after `creatures`. In `update`, in the returned object after
  `creatures`:

```ts
    movers: stepMovers(state.movers, routesOf(content.points), player),
```

  `player` is the figure after the hit was applied. `stepDark` spreads the state, so the dark
  already leaves `movers` alone — check that `woken` in `src/game/overview.ts` does too. Extend
  the doc comments of both functions by one sentence each. Then `npm run typecheck` and add
  `movers: []` to every `GameState` literal the compiler names in `tests/`.

- [ ] **Step 9: Run** `npm run check` — expected: green.

- [ ] **Step 10: Commit** — `Step the movers along their routes`, body: fixed routes without
  chance keep every step testable; yielding instead of blocking means a mover can never close a
  doorway or pin the figure against a creature.

---

### Task 4: The routes on the floor

**Files:**
- Modify: `tools/floor-layout.ts`, `public/maps/floor.tmj` (generated), `tests/unit/floor.test.ts`

**Interfaces:**
- Produces: `ROUTES` in `tools/floor-layout.ts`; `floor.tmj` with 91 point objects.

- [ ] **Step 1: Write the failing tests** in `tests/unit/floor.test.ts`. The file loads the
  floor as a `TileMap` (use its constant, called `FLOOR` here) and imports from the generator:

```ts
describe('the routes of the floor (0015)', () => {
  const routes = routesOf(FLOOR.points);

  it('holds 86 route points in 22 routes: 4 persons, 8 dogs, 8 vacuums, 2 drones, in table order', () => {
    expect(FLOOR.points.filter((point) => isRoutePoint(point.name))).toHaveLength(86);
    expect(routes.map((route) => route.name)).toStrictEqual([
      'person:reception', 'person:marketing', 'person:support', 'person:sales',
      'dog:hr', 'dog:accounting', 'dog:development', 'dog:reception',
      'dog:break-room', 'dog:sales', 'dog:marketing', 'dog:support',
      'vacuum:hr', 'vacuum:accounting', 'vacuum:development', 'vacuum:reception',
      'vacuum:break-room', 'vacuum:sales', 'vacuum:marketing', 'vacuum:support',
      'drone:development', 'drone:marketing',
    ]);
  });

  it('has the cells and pauses of the spec', () => {
    const cells = (name: string) =>
      routes
        .find((route) => route.name === name)
        ?.points.map((p) => [(p.x - 8) / 16, (p.y - 8) / 16, p.pause]);
    expect(cells('person:reception')).toStrictEqual([
      [12, 40, 300], [19, 40, 0], [19, 47, 180], [19, 40, 0],
    ]);
    expect(cells('dog:development')).toStrictEqual([[68, 18, 300], [76, 18, 420]]);
    expect(cells('dog:reception')).toStrictEqual([
      [11, 47, 300], [16, 47, 180], [16, 49, 420], [11, 49, 240],
    ]);
    expect(cells('vacuum:support')).toStrictEqual([
      [51, 71, 60], [105, 71, 60], [105, 72, 60], [51, 72, 60],
    ]);
    expect(cells('drone:marketing')).toStrictEqual([
      [5, 61, 120], [15, 61, 120], [15, 72, 120], [5, 72, 120],
    ]);
    expect(routes.map((route) => route.points.map((p) => [(p.x - 8) / 16, (p.y - 8) / 16, p.pause]))).toStrictEqual(
      ROUTES.map((route) => route.cells.map((cell) => [...cell])),
    );
  });

  it('keeps every ground leg clear of every solid box and every leg straight (criterion 10)', () => {
    expect(() => checkRoutes(routes, FLOOR)).not.toThrow();
  });

  it('keeps the five points of 0010 first, with their ids', () => {
    expect(FLOOR.points.slice(0, 4).map((point) => point.name)).toStrictEqual([
      'snippet', 'snippet', 'snippet', 'wake',
    ]);
    const objects = floorJson().layers.find((layer) => layer.name === 'objects');
    expect(objects?.objects.map((object) => object.id)).toStrictEqual(
      Array.from({ length: 91 }, (_, i) => i + 1),
    );
  });

  it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
    const movers = createInitialState(FLOOR).movers;
    const inView = (m: { x: number; y: number }) =>
      m.x >= 96 && m.x < 96 + 320 && m.y >= 624 && m.y < 624 + 180;
    expect(movers.filter(inView).map((m) => [m.kind, m.x, m.y])).toStrictEqual([
      ['person', 200, 648],
      ['dog', 184, 760],
    ]);
  });
});
```

  Adjust the layer lookup to the shape `floorJson()` really returns. The existing tests of this
  file that count the point objects or list the `objects` layer (five objects, ids 1 to 5) are
  updated to 91 objects; every tile-layer test of 0010, 0011 and 0013 stays as it is and stays
  green — that is the proof that no tile changed.

- [ ] **Step 2: Run** `npx vitest run tests/unit/floor.test.ts` — expected: the new block fails.

- [ ] **Step 3: Add the route table** to `tools/floor-layout.ts`, after `WAKE`:

```ts
/**
 * The routes of the movers (0015): per route its points as [column, row, pause in steps]; a
 * cell stands for its middle, (16c + 8, 16r + 8). The order is the order in the file.
 */
export const ROUTES: readonly {
  readonly name: string;
  readonly cells: readonly (readonly [number, number, number])[];
}[] = [
  { name: 'person:reception', cells: [[12, 40, 300], [19, 40, 0], [19, 47, 180], [19, 40, 0]] },
  { name: 'person:marketing', cells: [[8, 64, 300], [28, 64, 0], [28, 78, 180], [28, 64, 0]] },
  { name: 'person:support', cells: [[70, 64, 300], [77, 64, 0], [77, 78, 180], [77, 64, 0]] },
  { name: 'person:sales', cells: [[86, 31, 300], [104, 31, 0], [104, 27, 180], [104, 31, 0]] },
  { name: 'dog:hr', cells: [[2, 14, 300], [7, 14, 180], [7, 16, 420], [2, 16, 240]] },
  { name: 'dog:accounting', cells: [[38, 13, 300], [42, 13, 180], [42, 15, 420], [38, 15, 240]] },
  { name: 'dog:development', cells: [[68, 18, 300], [76, 18, 420]] },
  { name: 'dog:reception', cells: [[11, 47, 300], [16, 47, 180], [16, 49, 420], [11, 49, 240]] },
  { name: 'dog:break-room', cells: [[35, 35, 300], [40, 35, 180], [40, 37, 420], [35, 37, 240]] },
  { name: 'dog:sales', cells: [[83, 49, 300], [88, 49, 180], [88, 51, 420], [83, 51, 240]] },
  { name: 'dog:marketing', cells: [[19, 65, 300], [24, 65, 180], [24, 67, 420], [19, 67, 240]] },
  { name: 'dog:support', cells: [[85, 76, 300], [90, 76, 180], [90, 78, 420], [85, 78, 240]] },
  { name: 'vacuum:hr', cells: [[2, 7, 60], [20, 7, 60], [20, 8, 60], [2, 8, 60]] },
  { name: 'vacuum:accounting', cells: [[24, 5, 60], [42, 5, 60], [42, 6, 60], [24, 6, 60]] },
  { name: 'vacuum:development', cells: [[46, 7, 60], [83, 7, 60], [83, 8, 60], [46, 8, 60]] },
  { name: 'vacuum:reception', cells: [[2, 45, 60], [21, 45, 60], [21, 46, 60], [2, 46, 60]] },
  { name: 'vacuum:break-room', cells: [[31, 44, 60], [47, 44, 60], [47, 45, 60], [31, 45, 60]] },
  { name: 'vacuum:sales', cells: [[81, 44, 60], [105, 44, 60], [105, 45, 60], [81, 45, 60]] },
  { name: 'vacuum:marketing', cells: [[2, 72, 60], [47, 72, 60], [47, 73, 60], [2, 73, 60]] },
  { name: 'vacuum:support', cells: [[51, 71, 60], [105, 71, 60], [105, 72, 60], [51, 72, 60]] },
  { name: 'drone:development', cells: [[48, 6, 120], [58, 6, 120], [58, 12, 120], [48, 12, 120]] },
  { name: 'drone:marketing', cells: [[5, 61, 120], [15, 61, 120], [15, 72, 120], [5, 72, 120]] },
];
```

  Extend `PointJson` by `readonly properties?: readonly { readonly name: 'pause'; readonly
  type: 'int'; readonly value: number }[]`, give `pointObject` an optional fourth parameter
  `pause?: number` that adds `properties: [{ name: 'pause', type: 'int', value: pause }]` only
  when `pause` is above 0, and append to the `objects` array in `floorJson`, after `wake`:

```ts
          ...ROUTES.flatMap((route) => route.cells.map((cell, n) => ({ route, cell, n }))).map(
            ({ route, cell, n }, i) =>
              pointObject(
                SNIPPETS.length + 3 + i,
                `${route.name}:${n + 1}`,
                { x: cell[0] * TILE_SIZE + TILE_SIZE / 2, y: cell[1] * TILE_SIZE + TILE_SIZE / 2 },
                cell[2],
              ),
          ),
```

  Biome will reformat the table; let it.

- [ ] **Step 4: Generate** — `npm run gen-floor`, then `npx vitest run tests/unit/floor.test.ts`.
  Expected: green. If `checkRoutes` names a cell, the furniture of 0013 as merged differs from
  the spec's picture: stop and ask the author; do not move a route yourself.

- [ ] **Step 5: Run** `npm run check` — expected: green, the criterion-8 test of T3 included.

- [ ] **Step 6: Commit** — `Put 22 routes on the floor`, body: one dog and one vacuum per room,
  four colleagues, two drones; the tables of the spec are the placement.

---

### Task 5: The sheets

**Files:**
- Create: `tools/placeholder-person.ts`, `tools/placeholder-dog.ts`,
  `tools/placeholder-vacuum.ts`, `tools/placeholder-drone.ts`
- Modify: `tools/gen-sprites.ts`, `tests/unit/gen-sprites.test.ts`, `tests/unit/assets.test.ts`
- Generated: `public/sprites/person-1.png` … `person-4.png`, `dog.png`, `vacuum.png`,
  `drone.png`

**Interfaces:**
- Produces: `PERSON_SHIRTS`, `renderPerson(look)`; `DOG_SHEET_WIDTH` (384), `DOG_SHEET_HEIGHT`
  (16), `DOG_COATS`, `renderDog()`; `VACUUM_SHEET_WIDTH` (32), `renderVacuum()`,
  `vacuumInk(i, j)`; `DRONE_SHEET_WIDTH` (32), `renderDrone()`, `droneInk(frame, i, j)`;
  `encodePersonPng(look)`, `encodeDogPng()`, `encodeVacuumPng()`, `encodeDronePng()`.
- The dog sheet is **one row** of 24 frames, 384x16 — a `SpriteSheet` is one row
  (`src/render/renderer.ts`). Frame = look × 12 + facing × 3 + phase.

- [ ] **Step 1: Write the failing tests** in `tests/unit/gen-sprites.test.ts`, following the
  file's pattern for the snippet (generator against committed PNG, then pixels):

```ts
describe('the movers’ sheets (0015)', () => {
  const read = (name: string) => PNG.sync.read(readFileSync(join(ROOT, 'public/sprites', name)));
  const pixel = (data: Uint8Array, width: number, x: number, y: number) =>
    [...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4)];

  it.each([0, 1, 2, 3])('person-%i + 1 equals its generator and is the figure in another shirt', (look) => {
    const png = read(`person-${look + 1}.png`);
    expect([png.width, png.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
    expect(encodePersonPng(look).equals(readFileSync(join(ROOT, 'public/sprites', `person-${look + 1}.png`)))).toBe(true);
    const person = renderPerson(look);
    const player = renderPlayer();
    const shirt = [...rgb(PERSON_SHIRTS[look] as PaletteColour), 255];
    const figureShirt = [...rgb(INKS.T), 255];
    const lanyard = [...rgb(INKS.L), 255];
    for (let i = 0; i < player.length; i += 4) {
      const was = [...player.slice(i, i + 4)];
      const is = [...person.slice(i, i + 4)];
      const isShirt = was.join() === figureShirt.join() || was.join() === lanyard.join();
      expect(is).toStrictEqual(isShirt ? shirt : was);
    }
  });

  it('the shirts are green, red, orange and pink, none the figure’s', () => {
    expect(PERSON_SHIRTS).toStrictEqual(['#3e8948', '#e43b44', '#f77622', '#b55088']);
  });

  it('the down-facing standing frame has shirt at (7, 13): the smoke test reads it', () => {
    expect(['T', 'L']).toContain(frameRows('down', 0)[13]?.[7]);
  });

  it('dog.png is 384x16, equals its generator, and holds two coats of twelve frames', () => {
    const png = read('dog.png');
    expect([png.width, png.height]).toStrictEqual([384, 16]);
    expect(encodeDogPng().equals(readFileSync(join(ROOT, 'public/sprites/dog.png')))).toBe(true);
    const data = renderDog();
    const colours = (from: number) => {
      const seen = new Set<string>();
      for (let x = from; x < from + 192; x += 1) {
        for (let y = 0; y < 16; y += 1) {
          const [r, g, b, a] = pixel(data, 384, x, y);
          if (a === 255) {
            seen.add(`${r},${g},${b}`);
          }
        }
      }
      return seen;
    };
    expect(colours(0)).toStrictEqual(new Set([rgb('#b86f50').join(), rgb('#3e2731').join()]));
    expect(colours(192)).toStrictEqual(new Set([rgb('#ead4aa').join(), rgb('#3e2731').join()]));
    // Every frame has pixels, and facing left is facing right mirrored.
    for (let frame = 0; frame < 24; frame += 1) {
      const filled = Array.from({ length: 256 }, (_, n) => pixel(data, 384, frame * 16 + (n % 16), Math.floor(n / 16))[3]);
      expect(filled.includes(255)).toBe(true);
    }
    for (let phase = 0; phase < 3; phase += 1) {
      for (let y = 0; y < 16; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          expect(pixel(data, 384, (2 * 3 + phase) * 16 + x, y)).toStrictEqual(
            pixel(data, 384, (3 * 3 + phase) * 16 + (15 - x), y),
          );
        }
      }
    }
  });

  it('vacuum.png is 32x16: a disc 12 px wide in the lower 12 px, the light on and off', () => {
    const png = read('vacuum.png');
    expect([png.width, png.height]).toStrictEqual([32, 16]);
    expect(encodeVacuumPng().equals(readFileSync(join(ROOT, 'public/sprites/vacuum.png')))).toBe(true);
    const data = renderVacuum();
    const colour = { rim: '#262b44', body: '#3a4466' } as const;
    for (let frame = 0; frame < 2; frame += 1) {
      for (let j = 0; j < 16; j += 1) {
        for (let i = 0; i < 16; i += 1) {
          const ink = vacuumInk(i, j);
          const expected =
            ink === null
              ? [0, 0, 0, 0]
              : [...rgb(ink === 'light' ? (frame === 0 ? '#63c74d' : '#265c42') : colour[ink]), 255];
          expect(pixel(data, 32, frame * 16 + i, j)).toStrictEqual(expected);
        }
      }
    }
    const columns = Array.from({ length: 16 }, (_, i) => i).filter((i) =>
      Array.from({ length: 16 }, (_, j) => vacuumInk(i, j)).some((ink) => ink !== null),
    );
    const rows = Array.from({ length: 16 }, (_, j) => j).filter((j) =>
      Array.from({ length: 16 }, (_, i) => vacuumInk(i, j)).some((ink) => ink !== null),
    );
    expect([columns[0], columns.at(-1), rows[0], rows.at(-1)]).toStrictEqual([2, 13, 4, 15]);
    expect([7, 8].flatMap((i) => [8, 9].map((j) => vacuumInk(i, j)))).toStrictEqual(
      Array.from({ length: 4 }, () => 'light'),
    );
  });

  it('drone.png is 32x16: a 6x4 body, a light, rotors as bars and as dots', () => {
    const png = read('drone.png');
    expect([png.width, png.height]).toStrictEqual([32, 16]);
    expect(encodeDronePng().equals(readFileSync(join(ROOT, 'public/sprites/drone.png')))).toBe(true);
    const data = renderDrone();
    const colour = { body: '#5a6988', rotor: '#c0cbdc', light: '#e43b44' } as const;
    for (let frame = 0; frame < 2; frame += 1) {
      for (let j = 0; j < 16; j += 1) {
        for (let i = 0; i < 16; i += 1) {
          const ink = droneInk(frame, i, j);
          expect(pixel(data, 32, frame * 16 + i, j)).toStrictEqual(
            ink === null ? [0, 0, 0, 0] : [...rgb(colour[ink]), 255],
          );
        }
      }
    }
    const count = (frame: number, ink: string) =>
      Array.from({ length: 256 }, (_, n) => droneInk(frame, n % 16, Math.floor(n / 16))).filter(
        (found) => found === ink,
      ).length;
    expect([count(0, 'rotor'), count(1, 'rotor')]).toStrictEqual([20, 4]);
    expect(count(0, 'light')).toBe(2);
    expect(count(0, 'body')).toBe(6 * 4 - 2 + 4);
  });
});
```

  Add the imports the block needs (`rgb` from `tools/placeholder-tiles.ts`, `PaletteColour`,
  the four generators, the four encoders). In `tests/unit/assets.test.ts` add one test in the
  style of the snippet's that the glob contains the seven files.

- [ ] **Step 2: Run** `npx vitest run tests/unit/gen-sprites.test.ts` — expected: fails on the
  missing modules.

- [ ] **Step 3: `tools/placeholder-person.ts`:**

```ts
import { FRAME_HEIGHT, FRAME_WIDTH } from '../src/engine/sprite.ts';
import { FACINGS, PHASES_PER_FACING } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { frameRows, INKS, SHEET_HEIGHT, SHEET_WIDTH } from './placeholder-player.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder colleagues (feature 0015): the figure's twenty frames in the figure's order,
 * in another shirt and without the lanyard — its pixels take the shirt's colour. Pure.
 */

/** One shirt per person, in route order: reception, marketing, support, sales. */
export const PERSON_SHIRTS: readonly PaletteColour[] = ['#3e8948', '#e43b44', '#f77622', '#b55088'];

/** RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderPerson(look: number): Uint8Array {
  const shirt = PERSON_SHIRTS[look];
  if (shirt === undefined) {
    throw new Error(`person ${look} has no shirt`);
  }
  const colours = new Map<string, PaletteColour>(Object.entries({ ...INKS, T: shirt, L: shirt }));
  const data = new Uint8Array(SHEET_WIDTH * SHEET_HEIGHT * 4);
  for (const [f, facing] of FACINGS.entries()) {
    for (let phase = 0; phase < PHASES_PER_FACING; phase += 1) {
      const n = f * PHASES_PER_FACING + phase;
      for (const [y, row] of frameRows(facing, phase).entries()) {
        for (const [x, letter] of [...row].entries()) {
          const colour = colours.get(letter);
          if (colour !== undefined && x < FRAME_WIDTH && y < FRAME_HEIGHT) {
            data.set([...rgb(colour), 255], (y * SHEET_WIDTH + n * FRAME_WIDTH + x) * 4);
          }
        }
      }
    }
  }
  return data;
}
```

- [ ] **Step 4: `tools/placeholder-dog.ts`:**

```ts
import { FACINGS, type Facing } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder office dog (feature 0015): 24 frames of 16x16 in one row — per coat twelve,
 * frame = look × 12 + facing × 3 + phase, facings in FACINGS order; phase 0 stands, 1 steps,
 * 2 sits. `C` is the coat, `D` ears, nose, eyes and tail tip. Pure.
 */

export const DOG_FRAME_SIZE = 16;
export const DOG_PHASES = 3;
export const DOG_COATS: readonly PaletteColour[] = ['#b86f50', '#ead4aa'];
export const DOG_DARK: PaletteColour = '#3e2731';
export const DOG_FRAMES = DOG_COATS.length * FACINGS.length * DOG_PHASES;
export const DOG_SHEET_WIDTH = DOG_FRAMES * DOG_FRAME_SIZE;
export const DOG_SHEET_HEIGHT = DOG_FRAME_SIZE;

type Rows = readonly string[];
const BLANK = '................';
const blanks = (count: number): Rows => Array.from({ length: count }, () => BLANK);

const RIGHT_HEAD: Rows = [
  '...........D.D..',
  '...........CCCC.',
  'D..........CDCD.',
  '.C.........CCCC.',
];
const RIGHT_BODY: Rows = ['.CCCCCCCCCCCC...', '.CCCCCCCCCCCC...', '.CCCCCCCCCCCC...'];
const RIGHT_STAND: Rows = [
  ...blanks(6),
  ...RIGHT_HEAD,
  ...RIGHT_BODY,
  '.CC......CC.....',
  '.CC......CC.....',
  '.CC......CC.....',
];
const RIGHT_STEP: Rows = [
  ...blanks(6),
  ...RIGHT_HEAD,
  ...RIGHT_BODY,
  '.CC......CC.....',
  'CC........CC....',
  'C..........C....',
];
const RIGHT_SIT: Rows = [
  ...blanks(5),
  '...........D.D..',
  '...........CCCC.',
  '...........CDCD.',
  '...........CCCC.',
  '..........CCCC..',
  '.........CCCCC..',
  '........CCCCCC..',
  '.......CCCCCCC..',
  '......CCCCCCCC..',
  '.....CCCCCC.CC..',
  '.D..CCCCCCC.CC..',
];

const DOWN_HEAD: Rows = [
  '.....D....D.....',
  '.....CCCCCC.....',
  '.....CDCCDC.....',
  '.....CCDDCC.....',
  '.....CCCCCC.....',
];
const UP_HEAD: Rows = [
  '.....D....D.....',
  '.....CCCCCC.....',
  '.....CCCCCC.....',
  '.....CCCCCC.....',
  '.....CCCCCC.....',
];
const FRONT_BODY: Rows = [
  '....CCCCCCCC....',
  '....CCCCCCCC....',
  '....CCCCCCCC....',
  '....CCCCCCCC....',
];
const BACK_BODY: Rows = [
  '....CCCCCCCC....',
  '....CCCDDCCC....',
  '....CCCCCCCC....',
  '....CCCCCCCC....',
];
const FRONT_LEGS: Rows = ['....CC....CC....', '....CC....CC....'];
const FRONT_LEGS_STEP: Rows = ['....CC....CC....', '....CC..........'];
const SIT_BODY: Rows = [
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '....CC....CC....',
];

function mirror(rows: Rows): Rows {
  return rows.map((row) => [...row].reverse().join(''));
}

/** Per facing: stand, step, sit. */
const POSES: Readonly<Record<Facing, readonly Rows[]>> = {
  down: [
    [...blanks(5), ...DOWN_HEAD, ...FRONT_BODY, ...FRONT_LEGS],
    [...blanks(5), ...DOWN_HEAD, ...FRONT_BODY, ...FRONT_LEGS_STEP],
    [...blanks(5), ...DOWN_HEAD, ...SIT_BODY],
  ],
  up: [
    [...blanks(5), ...UP_HEAD, ...BACK_BODY, ...FRONT_LEGS],
    [...blanks(5), ...UP_HEAD, ...BACK_BODY, ...FRONT_LEGS_STEP],
    [...blanks(5), ...UP_HEAD, ...SIT_BODY],
  ],
  left: [mirror(RIGHT_STAND), mirror(RIGHT_STEP), mirror(RIGHT_SIT)],
  right: [RIGHT_STAND, RIGHT_STEP, RIGHT_SIT],
};

/** RGBA, row-major, DOG_SHEET_WIDTH × DOG_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderDog(): Uint8Array {
  const data = new Uint8Array(DOG_SHEET_WIDTH * DOG_SHEET_HEIGHT * 4);
  for (const [look, coat] of DOG_COATS.entries()) {
    for (const [f, facing] of FACINGS.entries()) {
      for (const [phase, rows] of POSES[facing].entries()) {
        const frame = look * FACINGS.length * DOG_PHASES + f * DOG_PHASES + phase;
        if (rows.length !== DOG_FRAME_SIZE || rows.some((row) => row.length !== DOG_FRAME_SIZE)) {
          throw new Error(`dog ${facing} phase ${phase} is not 16x16`);
        }
        for (const [y, row] of rows.entries()) {
          for (const [x, letter] of [...row].entries()) {
            if (letter === '.') {
              continue;
            }
            const colour = letter === 'C' ? coat : DOG_DARK;
            data.set([...rgb(colour), 255], (y * DOG_SHEET_WIDTH + frame * DOG_FRAME_SIZE + x) * 4);
          }
        }
      }
    }
  }
  return data;
}
```

  Count the rows of every pose: each must be 16 (`renderDog` throws otherwise). The picture is a
  placeholder; if a pose reads badly in the game, that is a feel note of the walk, not a reason
  to redraw it now.

- [ ] **Step 5: `tools/placeholder-vacuum.ts`:**

```ts
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder robot vacuum (feature 0015): a plain disc, 12 px wide, in the lower 12 px of
 * a 16x16 frame, with a light of 2x2 px that is on in frame 0 and off in frame 1. Pure.
 */

export const VACUUM_FRAME_SIZE = 16;
export const VACUUM_FRAMES = 2;
export const VACUUM_SHEET_WIDTH = VACUUM_FRAMES * VACUUM_FRAME_SIZE;
export const VACUUM_SHEET_HEIGHT = VACUUM_FRAME_SIZE;
export const VACUUM_BODY: PaletteColour = '#3a4466';
export const VACUUM_RIM: PaletteColour = '#262b44';
export const VACUUM_LIGHTS: readonly [PaletteColour, PaletteColour] = ['#63c74d', '#265c42'];

/** Rows 4–15; `R` rim, `B` body, `L` light. */
const DISC: readonly string[] = [
  '.....RRRRRR.....',
  '...RRBBBBBBRR...',
  '..RBBBBBBBBBBR..',
  '..RBBBBBBBBBBR..',
  '..RBBBBLLBBBBR..',
  '..RBBBBLLBBBBR..',
  '..RBBBBBBBBBBR..',
  '..RBBBBBBBBBBR..',
  '..RBBBBBBBBBBR..',
  '..RBBBBBBBBBBR..',
  '...RRBBBBBBRR...',
  '.....RRRRRR.....',
];
const INK = { R: 'rim', B: 'body', L: 'light' } as const;

/** Pixel (i, j) of a frame. */
export function vacuumInk(i: number, j: number): 'rim' | 'body' | 'light' | null {
  const letter = DISC[j - 4]?.[i];
  return letter === 'R' || letter === 'B' || letter === 'L' ? INK[letter] : null;
}

/** RGBA, row-major, VACUUM_SHEET_WIDTH × VACUUM_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderVacuum(): Uint8Array {
  const data = new Uint8Array(VACUUM_SHEET_WIDTH * VACUUM_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < VACUUM_FRAMES; frame += 1) {
    for (let j = 0; j < VACUUM_FRAME_SIZE; j += 1) {
      for (let i = 0; i < VACUUM_FRAME_SIZE; i += 1) {
        const ink = vacuumInk(i, j);
        if (ink === null) {
          continue;
        }
        const light = VACUUM_LIGHTS[frame] ?? VACUUM_LIGHTS[0];
        const colour = ink === 'rim' ? VACUUM_RIM : ink === 'body' ? VACUUM_BODY : light;
        data.set(
          [...rgb(colour), 255],
          (j * VACUUM_SHEET_WIDTH + frame * VACUUM_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
```

- [ ] **Step 6: `tools/placeholder-drone.ts`:**

```ts
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder drone (feature 0015): a body of 6x4 px with a light, four arms and four
 * rotors — bars of 5 px in frame 0, dots in frame 1, so the rotors turn. Pure.
 */

export const DRONE_FRAME_SIZE = 16;
export const DRONE_FRAMES = 2;
export const DRONE_SHEET_WIDTH = DRONE_FRAMES * DRONE_FRAME_SIZE;
export const DRONE_SHEET_HEIGHT = DRONE_FRAME_SIZE;
export const DRONE_BODY: PaletteColour = '#5a6988';
export const DRONE_ROTOR: PaletteColour = '#c0cbdc';
export const DRONE_LIGHT: PaletteColour = '#e43b44';

/** Rows 4–11 of each frame; `R` rotor, `B` body and arms, `L` light. */
const FRAMES: readonly (readonly string[])[] = [
  [
    '.RRRRR....RRRRR.',
    '....B......B....',
    '.....BBBBBB.....',
    '.....BBLLBB.....',
    '.....BBBBBB.....',
    '.....BBBBBB.....',
    '....B......B....',
    '.RRRRR....RRRRR.',
  ],
  [
    '...R........R...',
    '....B......B....',
    '.....BBBBBB.....',
    '.....BBLLBB.....',
    '.....BBBBBB.....',
    '.....BBBBBB.....',
    '....B......B....',
    '...R........R...',
  ],
];
const INK = { R: 'rotor', B: 'body', L: 'light' } as const;

/** Pixel (i, j) of frame `frame`. */
export function droneInk(frame: number, i: number, j: number): 'rotor' | 'body' | 'light' | null {
  const letter = FRAMES[frame]?.[j - 4]?.[i];
  return letter === 'R' || letter === 'B' || letter === 'L' ? INK[letter] : null;
}

/** RGBA, row-major, DRONE_SHEET_WIDTH × DRONE_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderDrone(): Uint8Array {
  const data = new Uint8Array(DRONE_SHEET_WIDTH * DRONE_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < DRONE_FRAMES; frame += 1) {
    for (let j = 0; j < DRONE_FRAME_SIZE; j += 1) {
      for (let i = 0; i < DRONE_FRAME_SIZE; i += 1) {
        const ink = droneInk(frame, i, j);
        if (ink === null) {
          continue;
        }
        const colour = ink === 'rotor' ? DRONE_ROTOR : ink === 'body' ? DRONE_BODY : DRONE_LIGHT;
        data.set(
          [...rgb(colour), 255],
          (j * DRONE_SHEET_WIDTH + frame * DRONE_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
```

- [ ] **Step 7: `tools/gen-sprites.ts`:** four encoders in the pattern of `encodeSnippetPng`
  (`encodePersonPng(look)` with `SHEET_WIDTH` × `SHEET_HEIGHT` and `renderPerson(look)`,
  `encodeDogPng`, `encodeVacuumPng`, `encodeDronePng`), and in the `import.meta.main` block:

```ts
  for (const look of PERSON_SHIRTS.keys()) {
    writeFileSync(`public/sprites/person-${look + 1}.png`, encodePersonPng(look));
  }
  writeFileSync('public/sprites/dog.png', encodeDogPng());
  writeFileSync('public/sprites/vacuum.png', encodeVacuumPng());
  writeFileSync('public/sprites/drone.png', encodeDronePng());
```

  Extend the file's doc comment by the seven sheets.

- [ ] **Step 8: Generate and run** — `npm run gen-sprites`, then `npm run check`. Expected:
  green, the asset test (Endesga 32, no `#68386c`) included. `git status` shows seven new PNGs
  and no change to the four old ones.

- [ ] **Step 9: Commit** — `Draw the placeholder movers`, body: seven sheets from code, as the
  figure and the snippet are; the dog sheet is one row because a sprite sheet is one row.

---

### Task 6: The movers in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`, `src/main.ts`, `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `MoverState`, `MOVER_SIZE`, `DOG_LOOKS` — and nothing else from `game/mover`.
- Produces: `SceneContent.moverSheets: { person: readonly SpriteSheet[]; dog: SpriteSheet;
  vacuum: SpriteSheet; drone: SpriteSheet }`; `moverFrame(mover, tick)`,
  `moverOrigin(mover, camera, tick)`; constants `VACUUM_BLINK_STEPS` 30, `DRONE_ROTOR_STEPS` 4,
  `DRONE_BOB_STEPS` 30, `DOG_FRAMES_PER_LOOK` 12, `DOG_PHASES` 3.

- [ ] **Step 1: Write the failing tests** in `tests/unit/draw-scene.test.ts`. Extend `CONTENT`
  by

```ts
  moverSheets: {
    person: [0, 1, 2, 3].map(() => ({ image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 })),
    dog: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
    vacuum: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
    drone: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
  },
```

  and add (`STATE` stands for the file's base state, with the player at its usual place;
  `mover` builds a `MoverState` with defaults `look 0, route 0, facing 'down', frame 0,
  frameTimer 0, target 1, wait 0`):

```ts
describe('the movers in the scene (0015)', () => {
  it('frames: a person as the figure, a dog by look, facing and phase, the others by the tick', () => {
    expect(moverFrame(mover({ kind: 'person', facing: 'left', frame: 3 }), 0)).toBe(2 * 5 + 3);
    expect(moverFrame(mover({ kind: 'dog', look: 1, facing: 'up', frame: 2 }), 0)).toBe(12 + 3 + 2);
    expect([0, 29, 30, 59, 60].map((tick) => moverFrame(mover({ kind: 'vacuum' }), tick))).toStrictEqual([0, 0, 1, 1, 0]);
    expect([0, 3, 4, 7, 8].map((tick) => moverFrame(mover({ kind: 'drone' }), tick))).toStrictEqual([0, 0, 1, 1, 0]);
  });

  it('origins: the feet are the bottom centre; a drone is 1 px higher in every second half second', () => {
    const camera = { x: 10, y: 20 };
    expect(moverOrigin(mover({ kind: 'person', x: 100.4, y: 80.6 }), camera, 0)).toStrictEqual({ x: 82, y: 37 });
    expect(moverOrigin(mover({ kind: 'dog', x: 100.4, y: 80.6 }), camera, 0)).toStrictEqual({ x: 82, y: 45 });
    expect(moverOrigin(mover({ kind: 'drone', x: 100, y: 80 }), camera, 29)).toStrictEqual({ x: 82, y: 44 });
    expect(moverOrigin(mover({ kind: 'drone', x: 100, y: 80 }), camera, 30)).toStrictEqual({ x: 82, y: 43 });
    expect(moverOrigin(mover({ kind: 'vacuum', x: 100, y: 80 }), camera, 30)).toStrictEqual({ x: 82, y: 44 });
  });

  it('draws ground movers at or above the figure before it, the others after it, drones over `above`', () => {
    const { player } = STATE;
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      {
        ...STATE,
        creatures: [],
        movers: [
          mover({ kind: 'drone', x: 200, y: 100 }),
          mover({ kind: 'dog', look: 1, x: player.x, y: player.y + 1 }),
          mover({ kind: 'person', look: 2, x: player.x, y: player.y }),
          mover({ kind: 'vacuum', x: player.x, y: player.y - 1 }),
        ],
      },
      CONTENT,
    );
    const sprites = renderer.sheets.map((sheet) =>
      sheet === CONTENT.playerSheet
        ? 'player'
        : sheet === CONTENT.moverSheets.person[2]
          ? 'person 2'
          : sheet === CONTENT.moverSheets.dog
            ? 'dog'
            : sheet === CONTENT.moverSheets.vacuum
              ? 'vacuum'
              : sheet === CONTENT.moverSheets.drone
                ? 'drone'
                : 'other',
    );
    expect(sprites.filter((name) => name !== 'other')).toStrictEqual([
      'person 2',
      'vacuum',
      'player',
      'dog',
      'drone',
    ]);
    // The drone comes after the last tile of `above` and before the first heart.
    const droneCall = renderer.calls.findLastIndex((call) => call.startsWith('drawSprite 0 at'));
    expect(renderer.calls.slice(0, droneCall).findLastIndex((call) => call.startsWith('drawTile 6 '))).toBeGreaterThan(-1);
  });
});
```

  Read the file's existing draw-order test first and follow how it tells calls apart; tighten
  the last assertion to its style (the tile of `above` in `MAP` is id 6, and the hearts are the
  last sprites). The `mover` helper's objects need `x` and `y` defaults too.

- [ ] **Step 2: Run** — expected: fails on `moverFrame`.

- [ ] **Step 3: Implement** in `src/render/draw-scene.ts`. Imports: `MOVER_SIZE`, `DOG_LOOKS`
  from `../game/mover`; `MoverState` from `../game/state`. In `SceneContent`:

```ts
  /** The movers' sheets (0015): one per person, the dogs' 24 frames, two frames each for the vacuum and the drone. */
  readonly moverSheets: {
    readonly person: readonly SpriteSheet[];
    readonly dog: SpriteSheet;
    readonly vacuum: SpriteSheet;
    readonly drone: SpriteSheet;
  };
```

  and:

```ts
/** A dog's sheet holds, per look, facing × 3 + phase. */
export const DOG_PHASES = 3;
export const DOG_FRAMES_PER_LOOK = FACINGS.length * DOG_PHASES;
/** The vacuum's light changes twice a second; the rotors change 15 times a second. */
export const VACUUM_BLINK_STEPS = 30;
export const DRONE_ROTOR_STEPS = 4;
/** The drone hangs 1 px higher in every second half second. */
export const DRONE_BOB_STEPS = 30;

/** The frame of a mover in its sheet (0015). */
export function moverFrame(mover: MoverState, tick: number): number {
  const facing = FACINGS.indexOf(mover.facing);
  switch (mover.kind) {
    case 'person':
      return facing * PHASES_PER_FACING + mover.frame;
    case 'dog':
      return (mover.look % DOG_LOOKS) * DOG_FRAMES_PER_LOOK + facing * DOG_PHASES + mover.frame;
    case 'vacuum':
      return Math.floor(tick / VACUUM_BLINK_STEPS) % 2;
    case 'drone':
      return Math.floor(tick / DRONE_ROTOR_STEPS) % 2;
  }
}

/** The top-left corner of a mover's frame on the surface: the feet are its bottom centre. */
export function moverOrigin(mover: MoverState, camera: Point, tick: number): Point {
  const height = mover.kind === 'person' ? FRAME_HEIGHT : MOVER_SIZE;
  const bob = mover.kind === 'drone' ? Math.floor(tick / DRONE_BOB_STEPS) % 2 : 0;
  return {
    x: Math.round(mover.x) - MOVER_SIZE / 2 - camera.x,
    y: Math.round(mover.y) - height - bob - camera.y,
  };
}

function moverSheet(content: SceneContent, mover: MoverState): SpriteSheet | undefined {
  return mover.kind === 'person'
    ? content.moverSheets.person[mover.look]
    : content.moverSheets[mover.kind];
}

function drawMovers(
  renderer: Renderer,
  movers: readonly MoverState[],
  state: GameState,
  content: SceneContent,
): void {
  for (const mover of movers) {
    const sheet = moverSheet(content, mover);
    if (sheet === undefined) {
      continue;
    }
    const origin = moverOrigin(mover, state.camera, state.tick);
    renderer.drawSprite(sheet, moverFrame(mover, state.tick), origin.x, origin.y);
  }
}
```

  In `drawScene`: before the creatures' loop

```ts
  const ground = state.movers.filter((mover) => mover.kind !== 'drone');
  drawMovers(renderer, ground.filter((mover) => mover.y <= player.y), state, content);
```

  after the player's sprite and before `drawLayer(… 'above' …)`

```ts
  drawMovers(renderer, ground.filter((mover) => mover.y > player.y), state, content);
```

  and after `above`, before the hearts

```ts
  drawMovers(renderer, state.movers.filter((mover) => mover.kind === 'drone'), state, content);
```

  The movers are drawn whether or not the figure blinks. Update the doc comment of `drawScene`
  with the new order: ground, detail, the cone, the ground movers at or above the figure, the
  creatures, the figure, the other ground movers, above, the drones, the hearts, the lids.

- [ ] **Step 4: `src/main.ts`:** URLs `/sprites/person-1.png` … `-4.png`, `/sprites/dog.png`,
  `/sprites/vacuum.png`, `/sprites/drone.png`, and in `loadContent`:

```ts
    moverSheets: {
      person: await Promise.all(
        PERSON_SHEET_URLS.map(async (url) => ({
          image: await loadImage(url),
          frameWidth: FRAME_WIDTH,
          frameHeight: FRAME_HEIGHT,
        })),
      ),
      dog: { image: await loadImage(DOG_SHEET_URL), frameWidth: MOVER_SIZE, frameHeight: MOVER_SIZE },
      vacuum: { image: await loadImage(VACUUM_SHEET_URL), frameWidth: MOVER_SIZE, frameHeight: MOVER_SIZE },
      drone: { image: await loadImage(DRONE_SHEET_URL), frameWidth: MOVER_SIZE, frameHeight: MOVER_SIZE },
    },
```

  with `MOVER_SIZE` from `./game/mover`. If `tests/unit/asset-loading.test.ts` lists the files
  the game loads, add the seven.

- [ ] **Step 5: Run** `npm run check`, then `npm run dev` and look at the reception in a
  browser: the person, the dog and — to the left — the vacuum are there and move. This is a
  look that the feature runs, not the walk: do not go through the acceptance plan.

- [ ] **Step 6: Commit** — `Draw the movers`, body: the order between figure and mover follows
  the feet, so walking past a colleague reads as depth; the drone flies over `above`.

---

### Task 7: The smoke spec

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Add the test**, after the test of the three snippets:

```ts
test('the floor starts with its 22 movers and draws the person of the reception', async ({
  page,
}) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.movers.length), {
      message: 'window.shadowAi.state.movers holds the 22 movers of the floor',
    })
    .toBe(22);
  // The person stands at feet (200, 648) for its first five seconds: its frame's corner is at
  // (96, 0) on the surface, its shirt at (7, 13) in the frame, and the factor is 4.
  const canvas = page.locator('canvas#game');
  await expect
    .poll(
      () =>
        canvas.evaluate((element: HTMLCanvasElement) =>
          Array.from(element.getContext('2d')?.getImageData((96 + 7) * 4, 13 * 4, 1, 1).data ?? []),
        ),
      { message: 'the pixel is the shirt #3e8948 of the person in the reception' },
    )
    .toStrictEqual([0x3e, 0x89, 0x48, 255]);
});
```

- [ ] **Step 2: Run** `npm run test:e2e` — expected: green. If the pixel is another colour,
  read which: carpet means the person is not drawn or stands elsewhere — fix the code, not the
  coordinates, unless `frameRows('down', 0)[13][7]` (tested in T5) says otherwise.

- [ ] **Step 3: Commit** — `Smoke: the movers are on the floor and drawn`.

---

### Task 8: The documents

**Files:**
- Modify: `docs/spec/world.md`, `docs/spec/architecture.md`, `docs/spec/visual.md`,
  `docs/spec/testing.md`, `README.md`

- [ ] **Step 1: `world.md` §1**, after the paragraph on the furniture, a paragraph **What
  moves** (feature 0015): four colleagues, a dog and a robot vacuum in each of the eight rooms,
  two drones (Development, Marketing); fixed routes of two to four points with a pause each;
  nothing is solid; ground movers stand while the figure is closer than 20 px; the tables in
  `docs/features/0015-the-moving-floor.md` are the routes until the art pass. **§3**, under
  "Per department, three to five figures": the colleague of the reception, of Marketing, of
  Support and of Sales walk since 0015, without a line; their lines come with M4.

- [ ] **Step 2: `architecture.md`.** §1 directory list: `game/mover.ts` and the four
  placeholder generators. §3: `movers` in the state — the fields, that the routes stay in the
  map and are rebuilt from `map.points` in every step, the order of a step (yield, wait, move),
  the arrival slack, `createInitialState` building and checking the routes, the dark leaving
  the movers alone. §5: the new draw order and the three origin and frame rules. §6: the
  `pause` property of a point object, the name form `<kind>:<room>:<n>`, the rejections of
  `game/mover` with their messages. §7: the four generators and seven sheets, the dog sheet's
  frame order.

- [ ] **Step 3: `visual.md` §3:** a person is 16x24 like the figure; a dog, a vacuum and a
  drone are 16x16; the drone has no drop shadow, and why.

- [ ] **Step 4: `testing.md` §2:** extend the unit row by the movers — routes and their
  rejections, the step, yield at 19.9, 20 and 20.1 px, the 22 routes of the floor and their
  free legs, the state with movers against the state without, the scene's order, the seven
  sheets — and the INV-7 row by the route checks; §6 by `routes.tmj`.

- [ ] **Step 5: `README.md`:** one sentence where it describes what the floor shows.

- [ ] **Step 6: Run** `npm run check`, **commit** — `Move the moving floor into the spec`.

---

### Task 9: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [ ] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.

---

### Task 10: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–30 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 9, and start again at step 1.
- [ ] **Step 4:** after step 30 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–30`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0015`. A feel note that wants another
  number becomes a new draft, not a change on this branch.

---

### Task 11: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 9. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`; commit — `Mark 0015 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0015: the moving floor`, with the walk's result and feel notes in its description.
  CI must be green. The author merges.
