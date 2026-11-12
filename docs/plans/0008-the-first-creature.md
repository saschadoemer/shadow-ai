# 0008 — Implementation plan: the first creature

**Spec:** [`docs/features/0008-the-first-creature.md`](../features/0008-the-first-creature.md)
(approved 2026-11-12). The plan argues from the spec; where they differ, the spec wins. Read the
spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §1, §2, §5, §6 and §7,
`docs/spec/testing.md` §1–§3 and §5, `docs/spec/gameplay.md` §2 and §3, `docs/spec/visual.md` §4
and `docs/spec/world.md` §4. **Written:** 2026-11-12 on the planning model. A working document,
not specification: once the feature is implemented, what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The expected
numbers below were worked out by hand from the spec's rules on 2026-11-12, not by a simulation.
If a test disagrees with its number, read the spec's "Behaviour" again and redo the arithmetic
before touching either side; if the spec and the number really disagree, stop and ask. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Goal:** three snippets stand on the campus, come toward the figure, freeze in the lamp's cone
and are captured after 60 lit steps in a row: `sightBlocked` in `engine/collision`, named points
in the loader, `src/game/creature.ts`, the creatures and the captured count in `GameState`, the
three points in the campus map, a generated `public/sprites/snippet.png`, the creatures drawn
between the cone and the figure, and the smoke spec reading them.

**Approach:** bottom up, each task green on its own: the sight line, then the loader's points,
then the creature's step as pure functions, then the state, then the campus data, then the
sheet with its palette exception, then the drawing, then the smoke spec, then the paperwork,
then the walk and the pull request. The game shows nothing new until Task 7; from Task 5 on
`window.shadowAi.state.creatures` holds the three snippets.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- No new dependency, runtime or development.
- `src/game/` touches no browser (INV-2). `tests/arch/` scans the source text of `src/game/`,
  comments included, for the words `window`, `document`, `HTMLCanvasElement`, `Image` and
  `fetch` as whole words, case-sensitive. In `src/game/creature.ts` write "sprite" and
  "picture", never "Image" with a capital I.
- `src/game/` imports from `src/engine/` and nothing else of the project. `src/render/` may
  import the constants and types of `src/game/`. `src/engine/` imports nothing from the project:
  the loader returns named points and does not know what a species is. `tools/` imports from
  `src/` as the other generators do.
- `GameState` stays plain data (INV-1): arrays and plain objects, no `Map`, no `Set`.
- No literal text a player can read (INV-4): this feature shows no text. Error messages for the
  console are not player text.
- INV-6: `public/sprites/snippet.png` uses only Endesga 32, alpha 0 or 255. It is the one file
  that may hold `#68386c`.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on, `verbatimModuleSyntax` forces `import type`. `npx biome
  check --write .` sorts imports and formats; run it before `npm run check`.
- `npm run check` is typecheck, Biome, build, Vitest, in that order. `npm run test:e2e` runs the
  smoke spec against the dev server, which Playwright starts; with `BASE_URL` set it runs against
  that URL and starts nothing.
- Branch `feature/0008-the-first-creature`, this worktree; it carries the spec, its approval and
  this plan. Commit messages: imperative subject, a body with the why, and the `Co-Authored-By`
  trailer the session's own attribution reminder names. Commits are signed through 1Password,
  which fails inside the Bash sandbox: run `git commit` with the sandbox disabled.
- Vitest's `toStrictEqual` distinguishes +0 from −0. Where a test compares a whole object, the
  inputs below are chosen so that no coordinate is computed as a negated zero.

## Design notes

- **Feet, box, body.** A creature's `x`, `y` are its feet, the bottom centre of its 16x16
  sprite. Its collision box is the figure's, `[x − 6, x + 6) × [y − 8, y)` — reuse `BOX_WIDTH`
  and `BOX_HEIGHT` from `game/player`. Its body point is (x, y − 8). The cone is tested against
  the body point; the sight line runs from the figure's box centre (x, y − 4) to the body point.
- **One step, in `update`:** lamp from the input, `stepPlayer`, then every creature against the
  stepped player. A lit creature does not move and counts up; the 60th lit step removes it. A
  creature that is not lit gets `light` 0 and moves by the approach rule in the same step.
- **Captured is `null`.** `stepCreature` returns the next creature, or `null` in the step it is
  captured. `stepCreatures` drops the `null`s and counts them.
- **The loader stays generic.** `TileMap.points` holds every named point besides the spawn.
  `creaturesFrom` in `game/creature` turns them into creatures and throws on a name that is no
  species.
- **`TileMap` gains a required field.** Every `TileMap` literal in the tests needs `points: []`.
  `tsc` names each one; the helpers `grass-map.ts` and `picture-map.ts` cover most.
- **One sheet per species.** `SceneContent.creatureSheets` is a record keyed by species, so the
  second species adds a key and no code path.

## File map

| File | Change |
|---|---|
| `src/engine/collision.ts` | `sightBlocked` (T1) |
| `src/engine/tiled.ts` | `NamedPoint`, `TileMap.points`, the three checks (T2) |
| `tests/unit/grass-map.ts`, `tests/unit/picture-map.ts` | `points` (T2) |
| `tests/fixtures/maps/points.tmj`, `point-without-name.tmj`, `point-outside.tmj`, `point-on-solid.tmj` | new (T2) |
| `src/game/state.ts` | `SPECIES`, `Species`, `CreatureState` (T3); `GameState.creatures`, `.captured` (T4) |
| `src/game/creature.ts` | new: the constants, `bodyPoint`, `isLit`, `stepCreature`, `stepCreatures`, `creaturesFrom`, `noCaptures` (T3) |
| `src/game/update.ts` | creatures in the initial state and in `update` (T4) |
| `tools/campus-layout.ts`, `public/maps/campus.tmj` | the three points (T5) |
| `tools/placeholder-snippet.ts`, `tools/gen-sprites.ts`, `public/sprites/snippet.png` | the sheet (T6) |
| `tests/unit/png-check.ts`, `tests/unit/assets.test.ts` | the reserved-colour exception (T6) |
| `src/render/draw-scene.ts`, `src/main.ts` | drawing and loading (T7) |
| `tests/e2e/smoke.spec.ts` | the creatures in the state (T8) |
| `docs/spec/*.md`, `README.md`, `docs/features/README.md` | as built (T9) |

Tests: `collision.test.ts` (T1), `tiled.test.ts` (T2), `creature.test.ts` new (T3),
`state.test.ts` (T4), `campus.test.ts` (T5), `gen-sprites.test.ts` and `assets.test.ts` (T6),
`draw-scene.test.ts` (T7).

---

### Task 1: The sight line

**Files:**
- Modify: `src/engine/collision.ts`
- Test: `tests/unit/collision.test.ts`

**Interfaces — produces:** `sightBlocked(a: Point, b: Point, grid: SolidGrid): boolean`.

- [ ] **Step 1: the failing tests.** Append to `tests/unit/collision.test.ts`, and add
  `sightBlocked` to its import from `../../src/engine/collision`:

```ts
describe('sightBlocked (0008)', () => {
  /** 4x3 cells; the only solid cell is (2, 1), the square [32, 48) × [16, 32). */
  const ONE: SolidGrid = {
    width: 4,
    height: 3,
    solid: [false, false, false, false, false, false, true, false, false, false, false, false],
  };
  const blocked = (ax: number, ay: number, bx: number, by: number): boolean =>
    sightBlocked({ x: ax, y: ay }, { x: bx, y: by }, ONE);

  it('is blocked by a solid cell on the line, in both directions', () => {
    expect(blocked(24, 24, 56, 24)).toBe(true);
    expect(blocked(56, 24, 24, 24)).toBe(true);
    expect(blocked(40, 0, 40, 40)).toBe(true);
  });

  it('is clear above and below the cell', () => {
    expect(blocked(24, 8, 56, 8)).toBe(false);
    expect(blocked(24, 40, 56, 40)).toBe(false);
  });

  it("treats the cell as half-open: y = 32 is the next row, y = 31.5 is the cell's", () => {
    expect(blocked(24, 32, 56, 32)).toBe(false);
    expect(blocked(24, 31.5, 56, 31.5)).toBe(true);
  });

  it('tests a single point when both ends are the same', () => {
    expect(blocked(24, 24, 24, 24)).toBe(false);
    expect(blocked(40, 24, 40, 24)).toBe(true);
  });

  it('treats cells outside the grid as open', () => {
    expect(blocked(24, 8, -20, 8)).toBe(false);
  });
});
```

- [ ] **Step 2: run** `npx vitest run tests/unit/collision.test.ts` — fails: `sightBlocked` is
  not exported.
- [ ] **Step 3: implement.** Append to `src/engine/collision.ts`:

```ts
/**
 * Whether a solid cell lies on the straight line from a to b (feature 0008): the line is
 * tested at n + 1 points a + (b − a) × i / n, n = max(1, ⌈|b − a|⌉), so the points are at most
 * one pixel apart. A point is in the cell (⌊x / 16⌋, ⌊y / 16⌋); cells outside the grid are open.
 * A line that cuts less than a pixel off a cell's corner may pass.
 */
export function sightBlocked(a: Point, b: Point, grid: SolidGrid): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let i = 0; i <= steps; i += 1) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    if (isSolid(grid, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE))) {
      return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: run** the file again — green. `npm run check`.
- [ ] **Step 5: commit** — `Test a sight line against the solid grid`; why: 0007 left open
  whether walls block the lamp's light, 0008 decides they do, and the creature's step needs one
  pure test for it.

---

### Task 2: Named points in the map

**Files:**
- Modify: `src/engine/tiled.ts`, `tests/unit/grass-map.ts`, `tests/unit/picture-map.ts`, every
  other `TileMap` literal `tsc` names
- Create: `tests/fixtures/maps/points.tmj`, `point-without-name.tmj`, `point-outside.tmj`,
  `point-on-solid.tmj`
- Test: `tests/unit/tiled.test.ts`, `tests/unit/test-map.test.ts`

**Interfaces — produces:** `interface NamedPoint extends Point { readonly name: string }`;
`TileMap.points: readonly NamedPoint[]`; `grassMap(width, height, spawn, points?)`.

- [ ] **Step 1: the fixtures.** Copy `tests/fixtures/maps/spawn-on-solid.tmj` four times with
  `cp`, under the four names. It is a 20x12 map on `fixture-tiles.tsj` with one solid tile at
  cell (1, 2) and the spawn at (24, 40). In each copy edit only the `objects` array and
  `nextobjectid`; leave the `data` line as it is. In all four, move the spawn to `"x": 40,
  "y": 56`. Then add after the spawn object, each new object with the spawn's keys (`height` 0,
  `point` true, `rotation` 0, `type` "", `visible` true, `width` 0) unless said otherwise:
  - `points.tmj`: id 2, name `snippet`, x 100, y 60; id 3, name `other`, x 200.5, y 150; id 4,
    name `zone`, a rectangle — `"height": 16, "width": 16, "x": 64, "y": 64` and **no** `point`
    key. `nextobjectid` 5.
  - `point-without-name.tmj`: id 2, name `""`, x 100, y 60. `nextobjectid` 3.
  - `point-outside.tmj`: id 2, name `snippet`, x 330, y 60. `nextobjectid` 3.
  - `point-on-solid.tmj`: id 2, name `snippet`, x 24, y 40. `nextobjectid` 3.
- [ ] **Step 2: the failing tests.** Append to `tests/unit/tiled.test.ts`:

```ts
describe('parseTileMap: named points (0008)', () => {
  const tiles = fixture('fixture-tiles.tsj');
  const tileset = parseTileset(tiles.json, tiles.file);
  const parse = (name: string) => {
    const { file, json } = fixture(name);
    return parseTileMap(json, tileset, file);
  };
  const failure = (name: string): string => {
    try {
      parse(name);
      return '(no error)';
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };

  it('returns the named points besides the spawn in file order, and ignores other objects', () => {
    const map = parse('points.tmj');
    expect(map.spawn).toStrictEqual({ x: 40, y: 56 });
    expect(map.points).toStrictEqual([
      { name: 'snippet', x: 100, y: 60 },
      { name: 'other', x: 200.5, y: 150 },
    ]);
  });

  it('returns no points for a map that has only the spawn', () => {
    expect(parse('corridor.tmj').points).toStrictEqual([]);
  });

  it('rejects a point without a name', () => {
    expect(failure('point-without-name.tmj')).toBe(
      'tests/fixtures/maps/point-without-name.tmj: layer "objects" has a point object without a name',
    );
  });

  it('rejects a point outside the map', () => {
    expect(failure('point-outside.tmj')).toBe(
      'tests/fixtures/maps/point-outside.tmj: point "snippet" (330, 60) is outside the map (320x192 px)',
    );
  });

  it('rejects a point on a solid tile', () => {
    expect(failure('point-on-solid.tmj')).toBe(
      'tests/fixtures/maps/point-on-solid.tmj: point "snippet" (24, 40) is on a solid tile (1, 2)',
    );
  });
});
```

  In `tests/unit/test-map.test.ts` add inside the `describe`:

```ts
  it('has no named points', () => {
    expect(map.points).toStrictEqual([]);
  });
```

- [ ] **Step 3: run** `npx vitest run tests/unit/tiled.test.ts` — the new tests fail.
- [ ] **Step 4: implement** in `src/engine/tiled.ts`.

  After the `Point` interface:

```ts
/** A point object of the `objects` layer other than the spawn (0008): what it is, is the game's business. */
export interface NamedPoint extends Point {
  readonly name: string;
}
```

  In `TileMap`, after `spawn`:

```ts
  /** The named point objects besides the spawn, in file order; each inside the map on an open cell. */
  readonly points: readonly NamedPoint[];
```

  After `readSpawn`:

```ts
/** Every point object that is not the spawn, in file order; each needs a name (0008). */
function readPoints(layer: Json, file: string): NamedPoint[] {
  const what = `layer "${OBJECT_LAYER_NAME}"`;
  return asArray(layer.objects, file, `${what} objects`)
    .map((value) => asRecord(value, file, 'object'))
    .filter((object) => object.point === true && object.name !== 'spawn')
    .map((object) => {
      if (typeof object.name !== 'string' || object.name === '') {
        fail(file, `${what} has a point object without a name`);
      }
      return {
        name: object.name,
        x: asNumber(object.x, file, `point "${object.name}" x`),
        y: asNumber(object.y, file, `point "${object.name}" y`),
      };
    });
}
```

  Replace `checkSpawn` by a function that serves both, and keep the spawn's messages
  word for word:

```ts
/** Rule 13: a point lies inside the map, on a cell that is not solid. The cell, not a box. */
function checkPosition(
  what: string,
  point: Point,
  width: number,
  height: number,
  solid: readonly boolean[],
  file: string,
): void {
  const widthPx = width * TILE_SIZE;
  const heightPx = height * TILE_SIZE;
  if (point.x < 0 || point.y < 0 || point.x >= widthPx || point.y >= heightPx) {
    fail(file, `${what} (${point.x}, ${point.y}) is outside the map (${widthPx}x${heightPx} px)`);
  }
  const column = Math.floor(point.x / TILE_SIZE);
  const row = Math.floor(point.y / TILE_SIZE);
  if (solid[row * width + column] === true) {
    fail(file, `${what} (${point.x}, ${point.y}) is on a solid tile (${column}, ${row})`);
  }
}
```

  In `parseTileMap`: after `const spawn = readSpawn(objects, mapFile);` add
  `const points = readPoints(objects, mapFile);`. Replace the `checkSpawn(...)` call by:

```ts
  checkPosition('spawn', spawn, width, height, solid, mapFile);
  for (const point of points) {
    checkPosition(`point "${point.name}"`, point, width, height, solid, mapFile);
  }
  return { width, height, ground, detail, above, spawn, points, solid };
```

- [ ] **Step 5: the helpers.** `tests/unit/grass-map.ts`: import `NamedPoint` as a type, give
  `grassMap` a fourth parameter `points: readonly NamedPoint[] = []` and put `points` into the
  returned map; update its doc comment ("… with the given spawn and named points").
  `tests/unit/picture-map.ts`: add `points: []` to the returned map. Run `npm run typecheck` and
  add `points: []` to every `TileMap` literal it names (at least the `MAP` constants of
  `draw-scene.test.ts` and `draw-map.test.ts`). If an existing test compares a whole parsed map
  with `toStrictEqual`, add `points: []` to its expectation.
- [ ] **Step 6: run** `npx biome check --write .` and `npm run check` — green.
- [ ] **Step 7: commit** — `Read named points from the objects layer`; why: creatures are placed
  in the map, not in code (INV-7), and the loader checks them like the spawn so a misplaced
  point stops the game instead of putting a creature into a wall.

---

### Task 3: The creature's step

**Files:**
- Modify: `src/game/state.ts`
- Create: `src/game/creature.ts`
- Test: `tests/unit/creature.test.ts` (new)

**Interfaces — consumes:** `sightBlocked` (T1), `NamedPoint` (T2), `moveBox`, `inCone`,
`lampCone`, `BOX_WIDTH`, `BOX_HEIGHT`.
**Produces:** in `state.ts` `SPECIES`, `Species`, `CreatureState`, `Captured`; in `creature.ts`
`NOTICE_RADIUS`, `TOUCH_DISTANCE`, `CREATURE_SPEED_PX_PER_SECOND`, `CAPTURE_STEPS`,
`CREATURE_SIZE`, `bodyPoint(creature): Point`, `isLit(creature, player, lampOn, map): boolean`,
`stepCreature(creature, player, lampOn, map): CreatureState | null`,
`stepCreatures(creatures, captured, player, lampOn, map): { creatures, captured }`,
`creaturesFrom(points): CreatureState[]`, `noCaptures(): Captured`.

- [ ] **Step 1: the types.** In `src/game/state.ts`, before `GameState`:

```ts
/** The creature species (world.md §4), in journal order. 0008 brings the first. */
export const SPECIES = ['snippet'] as const;
export type Species = (typeof SPECIES)[number];

/** A creature still in the world (0008). */
export interface CreatureState {
  readonly species: Species;
  /** The feet in map pixels, floating point: the bottom centre of its 16x16 sprite. */
  readonly x: number;
  readonly y: number;
  /** Steps lit without a break, 0–59; above 0 the creature is frozen. */
  readonly light: number;
}

/** How many creatures of each species were captured. */
export type Captured = Readonly<Record<Species, number>>;
```

- [ ] **Step 2: the failing tests.** Create `tests/unit/creature.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  bodyPoint,
  CAPTURE_STEPS,
  CREATURE_SPEED_PX_PER_SECOND,
  creaturesFrom,
  isLit,
  NOTICE_RADIUS,
  noCaptures,
  stepCreature,
  stepCreatures,
  TOUCH_DISTANCE,
} from '../../src/game/creature';
import type { CreatureState, Facing, PlayerState } from '../../src/game/state';
import { grassMap } from './grass-map';
import { pictureMap } from './picture-map';

/** Open ground, 20x12 tiles: 320x192 px. */
const OPEN = grassMap(20, 12, { x: 160, y: 100 });

const figure = (x: number, y: number, facing: Facing = 'down'): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
});
const snippet = (x: number, y: number, light = 0): CreatureState => ({
  species: 'snippet',
  x,
  y,
  light,
});
/** One step with the lamp off; the creature is never captured that way. */
function approached(creature: CreatureState, player: PlayerState, map = OPEN): CreatureState {
  const next = stepCreature(creature, player, false, map);
  if (next === null) {
    throw new Error('captured with the lamp off');
  }
  return next;
}

describe('the constants (0008)', () => {
  it('are the spec numbers', () => {
    expect([NOTICE_RADIUS, TOUCH_DISTANCE, CREATURE_SPEED_PX_PER_SECOND, CAPTURE_STEPS]).toStrictEqual(
      [64, 8, 40, 60],
    );
  });

  it('puts the body point 8 px above the feet', () => {
    expect(bodyPoint(snippet(130, 100))).toStrictEqual({ x: 130, y: 92 });
  });
});

describe('rest and approach', () => {
  const AT = figure(160, 100);

  it('moves 2/3 px toward the figure when it is closer than 64 px', () => {
    const next = approached(snippet(100, 100), AT);
    expect(next.x).toBeCloseTo(100.6667, 3);
    expect(next.y).toBe(100);
  });

  it('rests at exactly 64 px', () => {
    expect(approached(snippet(96, 100), AT)).toStrictEqual(snippet(96, 100));
  });

  it('stops exactly 8 px away: from 8.5 px it moves half a pixel', () => {
    expect(approached(snippet(151.5, 100), AT)).toStrictEqual(snippet(152, 100));
  });

  it('rests at 8 px and closer', () => {
    expect(approached(snippet(152, 100), AT)).toStrictEqual(snippet(152, 100));
    expect(approached(snippet(155, 100), AT)).toStrictEqual(snippet(155, 100));
  });

  it('moves along the straight line: from (130, 60), 50 px away, by (0.4, 0.533)', () => {
    const next = approached(snippet(130, 60), AT);
    expect(next.x).toBeCloseTo(130.4, 6);
    expect(next.y).toBeCloseTo(60.5333, 3);
  });
});

describe('walls and the map edge', () => {
  /** One solid cell at (10, 5): [160, 176) × [80, 96). */
  const WALL = pictureMap(
    [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '..........#.........',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
    { x: 40, y: 40 },
  );

  it('is held by a solid cell: flush left of it, the figure straight behind', () => {
    // The box [148, 160) × [84, 92) touches the cell's left edge.
    expect(approached(snippet(154, 92), figure(200, 92), WALL)).toStrictEqual(snippet(154, 92));
  });

  it('slides: with the figure down-right it keeps x and moves down', () => {
    const next = approached(snippet(154, 92), figure(190, 122), WALL);
    expect(next.x).toBe(154);
    expect(next.y).toBeCloseTo(92.4268, 3);
  });

  it('is clamped so the sprite stays on the map', () => {
    expect(approached(snippet(8.2, 50), figure(-20, 50)).x).toBe(8);
    expect(approached(snippet(50, 16.2), figure(50, -20)).y).toBe(16);
  });
});

describe('in the light', () => {
  const RIGHT = figure(100, 100, 'right');

  it('is lit in the cone with the lamp on: body (130, 92), d = 30, s = 4', () => {
    expect(isLit(snippet(130, 100), RIGHT, true, OPEN)).toBe(true);
  });

  it('does not move and counts one step', () => {
    expect(stepCreature(snippet(130, 100), RIGHT, true, OPEN)).toStrictEqual(snippet(130, 100, 1));
  });

  it('is still in the world after 59 lit steps and captured in the 60th', () => {
    expect(stepCreature(snippet(130, 100, 58), RIGHT, true, OPEN)).toStrictEqual(
      snippet(130, 100, 59),
    );
    expect(stepCreature(snippet(130, 100, 59), RIGHT, true, OPEN)).toBeNull();
  });

  it('is not lit with the lamp off, with the figure facing away, or beside the cone', () => {
    expect(isLit(snippet(130, 100), RIGHT, false, OPEN)).toBe(false);
    expect(isLit(snippet(130, 100), figure(100, 100, 'left'), true, OPEN)).toBe(false);
    // Body (130, 112): s = 24 against d / 2 = 15.
    expect(isLit(snippet(130, 120), RIGHT, true, OPEN)).toBe(false);
  });

  it('starts again after a break: light 30, not lit, becomes 0 and it moves 2/3 px in that step', () => {
    const next = approached(snippet(130, 100, 30), RIGHT);
    expect(next.light).toBe(0);
    expect(next.x).toBeCloseTo(129.3333, 3);
    expect(next.y).toBe(100);
  });
});

describe('a wall in the light', () => {
  const rows = (wallRow: number): string[] =>
    Array.from({ length: 12 }, (_, row) =>
      row === wallRow ? '.......#............' : '....................',
    );
  /** The figure's box centre is (100, 96); the creature's body is (136, 92). */
  const RIGHT = figure(100, 100, 'right');
  const CREATURE = snippet(136, 100);

  it('is not lit when a solid cell lies between the figure and its body', () => {
    // Cell (7, 5) is [112, 128) × [80, 96); the line passes it at y ≈ 94.
    const map = pictureMap(rows(5), { x: 40, y: 40 });
    expect(isLit(CREATURE, RIGHT, true, map)).toBe(false);
    const next = stepCreature(CREATURE, RIGHT, true, map);
    expect(next?.light).toBe(0);
    expect(next?.x).toBeLessThan(136);
  });

  it('is lit when the cell lies beside the line', () => {
    const map = pictureMap(rows(3), { x: 40, y: 40 });
    expect(isLit(CREATURE, RIGHT, true, map)).toBe(true);
  });
});

describe('stepCreatures', () => {
  it('steps every creature in order, drops the captured one and counts it', () => {
    const RIGHT = figure(100, 100, 'right');
    const result = stepCreatures(
      [snippet(130, 100, 59), snippet(136, 100, 3)],
      { snippet: 4 },
      RIGHT,
      true,
      OPEN,
    );
    expect(result).toStrictEqual({ creatures: [snippet(136, 100, 4)], captured: { snippet: 5 } });
  });

  it('leaves its arguments unchanged', () => {
    const creatures = [snippet(130, 100, 59)];
    const captured = { snippet: 0 };
    stepCreatures(creatures, captured, figure(100, 100, 'right'), true, OPEN);
    expect(creatures).toStrictEqual([snippet(130, 100, 59)]);
    expect(captured).toStrictEqual({ snippet: 0 });
  });
});

describe('creaturesFrom', () => {
  it('makes one creature per point whose name is a species, light 0, in order', () => {
    expect(
      creaturesFrom([
        { name: 'snippet', x: 1288, y: 760 },
        { name: 'snippet', x: 1560, y: 760 },
      ]),
    ).toStrictEqual([snippet(1288, 760), snippet(1560, 760)]);
  });

  it('rejects a name that is no species', () => {
    expect(() => creaturesFrom([{ name: 'snipet', x: 1070, y: 734 }])).toThrow(
      'unknown point object "snipet" at (1070, 734)',
    );
  });

  it('starts every count at 0', () => {
    expect(noCaptures()).toStrictEqual({ snippet: 0 });
  });
});
```

- [ ] **Step 3: run** `npx vitest run tests/unit/creature.test.ts` — fails: the module does not
  exist.
- [ ] **Step 4: implement.** Create `src/game/creature.ts`:

```ts
import { moveBox, sightBlocked } from '../engine/collision';
import { STEPS_PER_SECOND } from '../engine/loop';
import { type NamedPoint, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { inCone, lampCone } from './lamp';
import { BOX_HEIGHT, BOX_WIDTH } from './player';
import {
  type Captured,
  type CreatureState,
  type PlayerState,
  SPECIES,
  type Species,
} from './state';

/**
 * The creatures (gameplay.md §2 and §3, feature 0008). A small creature rests until the figure
 * is near, comes straight toward it, freezes while the lamp's light is on it and is captured
 * when the light has been held for CAPTURE_STEPS steps without a break. Pure data and pure
 * functions: one creature, one step.
 */

/** Tune: four tiles. At this distance and beyond a creature rests. */
export const NOTICE_RADIUS = 64;
/** Tune: by its own movement a creature never comes closer than this. */
export const TOUCH_DISTANCE = 8;
/** Tune: half the figure's speed, 2/3 px per step. */
export const CREATURE_SPEED_PX_PER_SECOND = 40;
/** Tune: one second of unbroken light. */
export const CAPTURE_STEPS = 60;
/** A creature's sprite is one tile, 16x16; its feet are the bottom centre. */
export const CREATURE_SIZE = 16;

const STEP_DISTANCE = CREATURE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND;

/** The centre of the sprite: the point the lamp is tested against. */
export function bodyPoint(creature: CreatureState): Point {
  return { x: creature.x, y: creature.y - CREATURE_SIZE / 2 };
}

/**
 * Lit: the lamp is on, the body point is in the cone, and no solid cell lies on the line from
 * the centre of the figure's collision box to the body point. The line starts at the box and
 * not at the cone's apex, because the apex is inside a wall when the figure stands under one.
 */
export function isLit(
  creature: CreatureState,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): boolean {
  if (!lampOn) {
    return false;
  }
  const body = bodyPoint(creature);
  return (
    inCone(body, lampCone(player)) &&
    !sightBlocked({ x: player.x, y: player.y - BOX_HEIGHT / 2 }, body, map)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Not lit: the count starts again, and the creature moves toward the figure's feet when they are
 * closer than NOTICE_RADIUS and farther than TOUCH_DISTANCE — by 2/3 px, or by what is left to
 * TOUCH_DISTANCE. The figure's box against the solid grid, X then Y, then the clamp to the map.
 */
function approach(creature: CreatureState, player: PlayerState, map: TileMap): CreatureState {
  const dx = player.x - creature.x;
  const dy = player.y - creature.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= NOTICE_RADIUS || distance <= TOUCH_DISTANCE) {
    return { ...creature, light: 0 };
  }
  const reach = Math.min(STEP_DISTANCE, distance - TOUCH_DISTANCE);
  const box = moveBox(
    {
      x: creature.x - BOX_WIDTH / 2,
      y: creature.y - BOX_HEIGHT,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
    },
    (dx / distance) * reach,
    (dy / distance) * reach,
    map,
  );
  const half = CREATURE_SIZE / 2;
  return {
    ...creature,
    x: clamp(box.x + BOX_WIDTH / 2, half, map.width * TILE_SIZE - half),
    y: clamp(box.y + BOX_HEIGHT, CREATURE_SIZE, map.height * TILE_SIZE),
    light: 0,
  };
}

/** One step of one creature against the stepped figure; null in the step it is captured. */
export function stepCreature(
  creature: CreatureState,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): CreatureState | null {
  if (!isLit(creature, player, lampOn, map)) {
    return approach(creature, player, map);
  }
  const light = creature.light + 1;
  return light >= CAPTURE_STEPS ? null : { ...creature, light };
}

/** One step of all creatures, in order: the captured ones leave the list and are counted. */
export function stepCreatures(
  creatures: readonly CreatureState[],
  captured: Captured,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): { readonly creatures: readonly CreatureState[]; readonly captured: Captured } {
  const remaining: CreatureState[] = [];
  const counts: Record<Species, number> = { ...captured };
  for (const creature of creatures) {
    const next = stepCreature(creature, player, lampOn, map);
    if (next === null) {
      counts[creature.species] += 1;
    } else {
      remaining.push(next);
    }
  }
  return { creatures: remaining, captured: counts };
}

function isSpecies(name: string): name is Species {
  return (SPECIES as readonly string[]).includes(name);
}

/**
 * The creatures a map starts with: one per named point, whose name is its species. Any other
 * name is an error, so a typing mistake in the map is not a silently missing creature.
 */
export function creaturesFrom(points: readonly NamedPoint[]): CreatureState[] {
  return points.map((point) => {
    if (!isSpecies(point.name)) {
      throw new Error(`unknown point object "${point.name}" at (${point.x}, ${point.y})`);
    }
    return { species: point.name, x: point.x, y: point.y, light: 0 };
  });
}

/** Nothing captured yet. A literal, so a new species does not compile until it is listed. */
export function noCaptures(): Captured {
  return { snippet: 0 };
}
```

- [ ] **Step 5: run** the file — green; `npx vitest run tests/arch` — green; `npx biome check
  --write .`; `npm run check`.
- [ ] **Step 6: commit** — `Step a creature: rest, approach, freeze, capture`; why: the rule is
  pure and carries all of the feature's numbers, so it is proven before anything draws it.

---

### Task 4: The creatures in the state

**Files:**
- Modify: `src/game/state.ts`, `src/game/update.ts`
- Test: `tests/unit/state.test.ts`, `tests/unit/draw-scene.test.ts` (its `state` helper only)

**Interfaces — produces:** `GameState.creatures: readonly CreatureState[]`,
`GameState.captured: Captured`.

- [ ] **Step 1: the failing tests.** In `tests/unit/state.test.ts`:
  - the first test's expectation gains `creatures: [], captured: { snippet: 0 },` after `lamp`;
  - in `describe('update')` both `GameState` literals and the expectation gain the same two
    fields;
  - append:

```ts
describe('the creatures in the state (0008)', () => {
  /** The campus's size and spawn on open ground, one snippet 46 px right of the spawn. */
  const point = (name: string, x: number, y: number) => ({ name, x, y });
  const MAP_ONE = grassMap(128, 96, { x: 1024, y: 734 }, [point('snippet', 1070, 734)]);
  const RIGHT_SHINE: GameInput = { ...NONE, right: true, lamp: true };
  const DOWN_SHINE: GameInput = { ...NONE, down: true, lamp: true };
  const run = (map: typeof MAP_ONE, ...legs: readonly (readonly [number, GameInput])[]) => {
    let state = createInitialState(map);
    for (const [steps, input] of legs) {
      for (let i = 0; i < steps; i += 1) {
        state = update(state, input, map);
      }
    }
    return state;
  };

  it('starts with one creature per point, light 0, and nothing captured', () => {
    const state = createInitialState(MAP_ONE);
    expect(state.creatures).toStrictEqual([{ species: 'snippet', x: 1070, y: 734, light: 0 }]);
    expect(state.captured).toStrictEqual({ snippet: 0 });
  });

  it('rejects a point whose name is no species', () => {
    const map = grassMap(128, 96, { x: 1024, y: 734 }, [point('snipet', 1070, 734)]);
    expect(() => createInitialState(map)).toThrow('unknown point object "snipet" at (1070, 734)');
  });

  it('a creature 46 px away comes 2/3 px closer in one step', () => {
    const [creature] = run(MAP_ONE, [1, NONE]).creatures;
    expect(creature?.x).toBeCloseTo(1069.3333, 3);
    expect(creature?.light).toBe(0);
  });

  it('in the light from the first step it never moves, has light 59 after 59 steps, and is captured in the 60th', () => {
    // The figure turns right in step 1: apex (1024, 722), body (1070, 726), d = 46, s = 4.
    expect(run(MAP_ONE, [59, RIGHT_SHINE]).creatures).toStrictEqual([
      { species: 'snippet', x: 1070, y: 734, light: 59 },
    ]);
    const done = run(MAP_ONE, [60, RIGHT_SHINE]);
    expect(done.creatures).toStrictEqual([]);
    expect(done.captured).toStrictEqual({ snippet: 1 });
  });

  it('survives a JSON round trip with a frozen creature and a count of 1 (INV-1)', () => {
    // The second snippet, 30 px below the spawn, walks up to 8 px below the feet while the
    // first is captured; then the figure turns down and holds the light on it for 30 steps.
    const map = grassMap(128, 96, { x: 1024, y: 734 }, [
      point('snippet', 1070, 734),
      point('snippet', 1024, 764),
    ]);
    const state = run(map, [60, RIGHT_SHINE], [30, DOWN_SHINE]);
    expect(state.captured).toStrictEqual({ snippet: 1 });
    expect(state.creatures).toHaveLength(1);
    expect(state.creatures[0]?.light).toBe(30);
    expect(state.creatures[0]?.x).toBe(1024);
    expect(state.creatures[0]?.y).toBeCloseTo(742, 6);
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });
});
```

- [ ] **Step 2: run** `npx vitest run tests/unit/state.test.ts` — fails.
- [ ] **Step 3: implement.** In `src/game/state.ts`, `GameState` gains after `lamp`:

```ts
  /** The creatures still in the world, in the order of the map's points (0008). */
  readonly creatures: readonly CreatureState[];
  /** Captured creatures per species; the journal (M4) reads it. */
  readonly captured: Captured;
```

  In `src/game/update.ts` import `creaturesFrom`, `noCaptures` and `stepCreatures` from
  `./creature`. `createInitialState` returns

```ts
  return {
    tick: 0,
    player,
    camera: followPlayer(player, map),
    lamp: { on: false },
    creatures: creaturesFrom(map.points),
    captured: noCaptures(),
  };
```

  and `update` becomes

```ts
export function update(state: GameState, input: GameInput, content: TileMap): GameState {
  const player = stepPlayer(state.player, input, content);
  const { creatures, captured } = stepCreatures(
    state.creatures,
    state.captured,
    player,
    input.lamp,
    content,
  );
  return {
    tick: state.tick + 1,
    player,
    camera: followPlayer(player, content),
    lamp: { on: input.lamp },
    creatures,
    captured,
  };
}
```

  Extend both doc comments by one clause each: the initial state holds one creature per named
  point; each creature is stepped against the stepped player (0008).
- [ ] **Step 4: the other literal.** `tests/unit/draw-scene.test.ts`: its `state` helper returns
  a `GameState`; add `creatures: [], captured: { snippet: 0 },`. `npm run typecheck` names any
  other.
- [ ] **Step 5:** `npx biome check --write .`; `npm run check` — green.
- [ ] **Step 6: commit** — `Carry the creatures and the captured count in the state`; why: what
  a save state would hold belongs in `GameState`, and `update` is the one place a step happens.

---

### Task 5: Three snippets on the campus

**Files:**
- Modify: `tools/campus-layout.ts`, `public/maps/campus.tmj` (generated)
- Test: `tests/unit/campus.test.ts`

**Interfaces — produces:** `SNIPPETS: readonly Point[]` in `tools/campus-layout.ts`.

- [ ] **Step 1: the failing tests.** In `tests/unit/campus.test.ts` add `SNIPPETS` to the import
  from `campus-layout.ts` and append inside the `describe`:

```ts
  it('holds the three snippets of 0008, in order', () => {
    expect(SNIPPETS).toStrictEqual([
      { x: 1288, y: 760 },
      { x: 1560, y: 760 },
      { x: 1592, y: 540 },
    ]);
    expect(campus.points).toStrictEqual(SNIPPETS.map((feet) => ({ name: 'snippet', ...feet })));
  });

  it("every snippet's box is free and its cell is reachable from the spawn", () => {
    const reached = reachableFrom(campus, SPAWN_CELL);
    for (const { x, y } of campus.points) {
      // The box [x − 6, x + 6) × [y − 8, y).
      for (let row = Math.floor((y - 8) / 16); row <= Math.ceil(y / 16) - 1; row += 1) {
        for (let column = Math.floor((x - 6) / 16); column <= Math.ceil((x + 6) / 16) - 1; column += 1) {
          expect(campus.solid[cell(column, row)], `(${column}, ${row})`).toBe(false);
        }
      }
      expect(reached[cell(Math.floor(x / 16), Math.floor(y / 16))], `(${x}, ${y})`).toBe(true);
    }
  });

  it('no snippet is in the first view or within 64 px of the spawn', () => {
    // The first view is [864, 1184) × [640, 820); a sprite is [x − 8, x + 8) × [y − 16, y).
    for (const { x, y } of campus.points) {
      const inView = x + 8 > 864 && x - 8 < 1184 && y > 640 && y - 16 < 820;
      expect(inView, `(${x}, ${y})`).toBe(false);
      expect(Math.hypot(x - SPAWN.x, y - SPAWN.y)).toBeGreaterThanOrEqual(64);
    }
  });

  it('the third snippet stands inside the meeting rooms fence, on tile (99, 33)', () => {
    const closed = campus.solid.map((solid, at) => solid || at === cell(95, 34));
    expect(reachableFrom({ ...campus, solid: closed }, SPAWN_CELL)[cell(99, 33)]).toBe(false);
  });
```

- [ ] **Step 2: run** `npx vitest run tests/unit/campus.test.ts` — fails.
- [ ] **Step 3: implement** in `tools/campus-layout.ts`. After `SPAWN`:

```ts
/**
 * The snippets of feature 0008, feet in pixels: two on the east avenue — tile (80, 47) and
 * tile (97, 47), in front of the Sales door — and one inside the meeting rooms' fence, tile
 * (99, 33). Placeholders like the campus; they move inside when Sales has an interior (M5).
 */
export const SNIPPETS: readonly Point[] = [
  { x: 1288, y: 760 },
  { x: 1560, y: 760 },
  { x: 1592, y: 540 },
];
```

  Rename `SpawnJson` to `PointJson` with `readonly id: number` and `readonly name: string`, and
  let `ObjectLayerJson.objects` be `readonly PointJson[]`. In `campusJson` build the objects
  from one helper, keys in the same order as today:

```ts
function pointObject(id: number, name: string, at: Point): PointJson {
  return {
    height: 0,
    id,
    name,
    point: true,
    rotation: 0,
    type: '',
    visible: true,
    width: 0,
    x: at.x,
    y: at.y,
  };
}
```

  `objects: [pointObject(1, 'spawn', SPAWN), ...SNIPPETS.map((feet, n) => pointObject(n + 2,
  'snippet', feet))]` and `nextobjectid: SNIPPETS.length + 2`. Update the file's head comment:
  it now also holds the creatures' points.
- [ ] **Step 4: generate.** `npm run gen-campus`; `git diff --stat public/maps/campus.tmj` shows
  only the objects and `nextobjectid` changed. Run it again: `git status` shows no further
  change.
- [ ] **Step 5:** `npx biome check --write .`; `npm run check` — green. `npm run dev`, open the
  page, and read `shadowAi.state.creatures.length` in the console: 3. Nothing is drawn yet.
- [ ] **Step 6: commit** — `Place three snippets on the campus`; why: the first creature lives
  near Sales, where its case is, and one stands behind a fence so the walk can show what a fence
  does to a creature and to the light.

---

### Task 6: The snippet sheet and the palette exception

**Files:**
- Create: `tools/placeholder-snippet.ts`, `public/sprites/snippet.png` (generated)
- Modify: `tools/gen-sprites.ts`, `tests/unit/png-check.ts`
- Test: `tests/unit/gen-sprites.test.ts`, `tests/unit/assets.test.ts`

**Interfaces — produces:** `SNIPPET_FRAME_SIZE` 16, `SNIPPET_FRAMES` 3, `SNIPPET_SHEET_WIDTH`
48, `SNIPPET_SHEET_HEIGHT` 16, `SNIPPET_PAPER`, `SNIPPET_LIT`, `snippetInk(i, j)`,
`renderSnippet(): Uint8Array`, `encodeSnippetPng(): Buffer`; `PngRules.reserved: string | null`.

- [ ] **Step 1: the failing tests.** Append to `tests/unit/gen-sprites.test.ts` (add the imports
  `encodeSnippetPng` from `gen-sprites.ts`, the names above from `placeholder-snippet.ts`, and
  `SHADOW_COLOUR` from `../../src/render/palette`):

```ts
const SNIPPET_FILE = join(ROOT, 'public/sprites/snippet.png');
const SNIPPET = renderSnippet();

/** The colour of pixel (i, j) of frame `index` of the snippet sheet, or null when transparent. */
function snippetPixel(index: number, i: number, j: number): string | null {
  const o = (j * SNIPPET_SHEET_WIDTH + index * SNIPPET_FRAME_SIZE + i) * 4;
  if (SNIPPET[o + 3] !== 255) {
    return null;
  }
  return `#${[SNIPPET[o], SNIPPET[o + 1], SNIPPET[o + 2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Frame `index` as 16 rows of 16 colours or nulls. */
function snippetFrame(index: number): (string | null)[][] {
  return Array.from({ length: SNIPPET_FRAME_SIZE }, (_, j) =>
    Array.from({ length: SNIPPET_FRAME_SIZE }, (_, i) => snippetPixel(index, i, j)),
  );
}

describe('the placeholder snippet generator (0008)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeSnippetPng().equals(encodeSnippetPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(SNIPPET_FILE));
    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
    expect(Buffer.from(SNIPPET).equals(committed.data)).toBe(true);
  });

  it('is 48x16: three 16x16 frames in one row', () => {
    expect([SNIPPET_SHEET_WIDTH, SNIPPET_SHEET_HEIGHT, SNIPPET_FRAME_SIZE, SNIPPET_FRAMES]).toStrictEqual(
      [48, 16, 16, 3],
    );
    expect(SNIPPET).toHaveLength(48 * 16 * 4);
  });

  it('has 100 opaque pixels per frame, 52 of them the signature colour', () => {
    for (let index = 0; index < SNIPPET_FRAMES; index += 1) {
      const pixels = snippetFrame(index).flat();
      expect(pixels.filter((colour) => colour !== null), `frame ${index}`).toHaveLength(100);
      expect(pixels.filter((colour) => colour === SHADOW_COLOUR), `frame ${index}`).toHaveLength(52);
    }
  });

  it('draws frame 0 as the spec says: the square 3–12 × 4–13, its border and three lines violet', () => {
    expect(snippetPixel(0, 3, 4)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 12, 13)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 2, 4)).toBeNull();
    expect(snippetPixel(0, 3, 14)).toBeNull();
    expect(snippetPixel(0, 4, 5)).toBe(SNIPPET_PAPER);
    expect(snippetPixel(0, 5, 7)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 10, 9)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 11, 9)).toBe(SNIPPET_PAPER);
    expect(snippetPixel(0, 8, 11)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 9, 11)).toBe(SNIPPET_PAPER);
    expect(snippetPixel(0, 5, 8)).toBe(SNIPPET_PAPER);
    expect([SNIPPET_PAPER, SNIPPET_LIT]).toStrictEqual(['#c0cbdc', '#ffffff']);
  });

  it('frame 1 is frame 0 moved up by 2 px', () => {
    const blank = new Array<string | null>(SNIPPET_FRAME_SIZE).fill(null);
    expect(snippetFrame(1)).toStrictEqual([...snippetFrame(0).slice(2), blank, blank]);
  });

  it('frame 2 is frame 0 with white paper', () => {
    const lit = snippetFrame(0).map((row) =>
      row.map((colour) => (colour === SNIPPET_PAPER ? SNIPPET_LIT : colour)),
    );
    expect(snippetFrame(2)).toStrictEqual(lit);
  });
});
```

  In `tests/unit/assets.test.ts`: add, after `RULES`,

```ts
/** The shadow assets: the only files that may use the reserved colour (visual.md §4, 0008). */
const SHADOW_ASSETS: ReadonlySet<string> = new Set(['public/sprites/snippet.png']);
const rulesFor = (file: string) => ({
  ...RULES,
  reserved: SHADOW_ASSETS.has(file) ? null : SHADOW_COLOUR,
});
```

  use `rulesFor(file)` in the two tests that walk `public/` (in the tileset one:
  `{ ...rulesFor(file), multipleOf16: true }`), and add:

```ts
  it('checks the snippet sheet under public/sprites/ with every other PNG', () => {
    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/snippet.png');
  });

  it('allows the reserved colour in a shadow asset and nowhere else', () => {
    const violet = onePixel(0x68, 0x38, 0x6c, 255);
    expect(checkPng('x.png', violet, rulesFor('public/sprites/snippet.png'))).toStrictEqual([]);
    expect(checkPng('x.png', violet, rulesFor('public/sprites/player.png'))).toStrictEqual([
      'x.png: pixel (0, 0) uses the reserved shadow colour #68386c',
    ]);
    expect([...SHADOW_ASSETS]).toStrictEqual(['public/sprites/snippet.png']);
  });

  it('holds a shadow asset to the palette all the same', () => {
    expect(
      checkPng('x.png', onePixel(0x12, 0x34, 0x56, 255), rulesFor('public/sprites/snippet.png')),
    ).toStrictEqual(['x.png: pixel (0, 0) has colour #123456, which is not in Endesga 32']);
  });
```

- [ ] **Step 2: run** both files — fail.
- [ ] **Step 3: the rule.** In `tests/unit/png-check.ts` change the field and its comment:

```ts
  /** A palette colour that may appear nowhere in the file; null for a shadow asset, which may use it. */
  readonly reserved: string | null;
```

  The comparison `colour === rules.reserved` stays; with `null` it never holds.
- [ ] **Step 4: the generator.** Create `tools/placeholder-snippet.ts`:

```ts
import { type PaletteColour, SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder snippet sheet (visual.md §5, feature 0008): a scrap of paper with three lines
 * of text, three 16x16 frames in one row. Frame 0 and frame 1, two pixels higher, alternate
 * while the creature is free; frame 2, the paper white, is the creature frozen in the light.
 * Border and text are the signature colour — this is the first shadow asset. Pure — it returns
 * pixels; tools/gen-sprites.ts writes the file.
 */

export const SNIPPET_FRAME_SIZE = 16;
export const SNIPPET_FRAMES = 3;
export const SNIPPET_SHEET_WIDTH = SNIPPET_FRAMES * SNIPPET_FRAME_SIZE;
export const SNIPPET_SHEET_HEIGHT = SNIPPET_FRAME_SIZE;
export const SNIPPET_PAPER: PaletteColour = '#c0cbdc';
export const SNIPPET_LIT: PaletteColour = '#ffffff';

/** The lines of text: row → first and last column. */
const LINES: Readonly<Record<number, readonly [number, number]>> = {
  7: [5, 10],
  9: [5, 10],
  11: [5, 8],
};

/** Pixel (i, j) of frame 0: the square columns 3–12, rows 4–13; its border and the lines are `edge`. */
export function snippetInk(i: number, j: number): 'edge' | 'paper' | null {
  if (i < 3 || i > 12 || j < 4 || j > 13) {
    return null;
  }
  if (i === 3 || i === 12 || j === 4 || j === 13) {
    return 'edge';
  }
  const line = LINES[j];
  return line !== undefined && i >= line[0] && i <= line[1] ? 'edge' : 'paper';
}

/** RGBA, row-major, SNIPPET_SHEET_WIDTH × SNIPPET_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderSnippet(): Uint8Array {
  const data = new Uint8Array(SNIPPET_SHEET_WIDTH * SNIPPET_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < SNIPPET_FRAMES; frame += 1) {
    for (let j = 0; j < SNIPPET_FRAME_SIZE; j += 1) {
      for (let i = 0; i < SNIPPET_FRAME_SIZE; i += 1) {
        // Frame 1 is frame 0 moved up by two pixels.
        const ink = snippetInk(i, frame === 1 ? j + 2 : j);
        if (ink === null) {
          continue;
        }
        const paper = frame === 2 ? SNIPPET_LIT : SNIPPET_PAPER;
        const colour = ink === 'edge' ? SHADOW_COLOUR : paper;
        data.set(
          [...rgb(colour), 255],
          (j * SNIPPET_SHEET_WIDTH + frame * SNIPPET_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
```

  In `tools/gen-sprites.ts` import `renderSnippet`, `SNIPPET_SHEET_HEIGHT`,
  `SNIPPET_SHEET_WIDTH`; add

```ts
export function encodeSnippetPng(): Buffer {
  const png = new PNG({ width: SNIPPET_SHEET_WIDTH, height: SNIPPET_SHEET_HEIGHT });
  png.data = Buffer.from(renderSnippet());
  return PNG.sync.write(png);
}
```

  write `public/sprites/snippet.png` in the `import.meta.main` block, and name the third file in
  the head comment.
- [ ] **Step 5: generate.** `npm run gen-sprites`; a second run leaves `git status` unchanged
  beyond the new file. Look at `public/sprites/snippet.png` with the Read tool: three scraps,
  the second two pixels higher, the third with white paper.
- [ ] **Step 6:** `npx biome check --write .`; `npm run check` — green.
- [ ] **Step 7: commit** — `Generate the snippet sheet and name the palette exception`; why: the
  shadow is recognised by one reserved colour, the first shadow asset has to be allowed to use
  it, and the asset test must keep rejecting it everywhere else.

---

### Task 7: Drawing the creatures

**Files:**
- Modify: `src/render/draw-scene.ts`, `src/main.ts`
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces — produces:** `SceneContent.creatureSheets: Readonly<Record<Species, SpriteSheet>>`,
`FLUTTER_STEPS` 15, `FROZEN_FRAME` 2, `creatureFrame(creature, tick): number`,
`creatureOrigin(creature, camera): Point`.

- [ ] **Step 1: the failing tests.** In `tests/unit/draw-scene.test.ts`: `CONTENT` gains
  `creatureSheets: { snippet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 } },`;
  import `creatureFrame`, `creatureOrigin` and the type `CreatureState`; append:

```ts
describe('the creatures in the scene (0008)', () => {
  const camera = { x: 5, y: 7 };
  const snippet = (x: number, y: number, light = 0): CreatureState => ({
    species: 'snippet',
    x,
    y,
    light,
  });

  it('draws them after the cone and before the player, in array order', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      {
        ...state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }, camera, true),
        tick: 15,
        creatures: [snippet(40.4, 50.6), snippet(60, 40, 5)],
      },
      CONTENT,
    );
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
      'drawTile 0 at -5,-7',
      'drawTile 1 at 11,-7',
      'drawTile 2 at -5,9',
      'drawTile 2 at 11,9',
      'drawTile 2 at 27,9',
      'drawTile 4 at 11,9',
      'drawSprite 2 at -32,-12', // the cone
      'drawSprite 1 at 27,28', // free at tick 15: frame 1; round(40.4) − 8 − 5, round(50.6) − 16 − 7
      'drawSprite 2 at 47,17', // frozen: frame 2; 60 − 8 − 5, 40 − 16 − 7
      'drawSprite 13 at 7,0',
      'drawTile 6 at -5,-7',
    ]);
    expect(renderer.sheets).toStrictEqual([
      CONTENT.lampSheet,
      CONTENT.creatureSheets.snippet,
      CONTENT.creatureSheets.snippet,
      CONTENT.playerSheet,
    ]);
  });

  it('places the frame by the feet: (40.4, 50.6) with camera (5, 7) is (27, 28)', () => {
    expect(creatureOrigin(snippet(40.4, 50.6), camera)).toStrictEqual({ x: 27, y: 28 });
  });

  it('bobs every 15 steps while free and shows frame 2 while frozen', () => {
    expect([0, 14, 15, 29, 30].map((tick) => creatureFrame(snippet(0, 0), tick))).toStrictEqual([
      0, 0, 1, 1, 0,
    ]);
    expect(creatureFrame(snippet(0, 0, 1), 0)).toBe(2);
    expect(creatureFrame(snippet(0, 0, 59), 15)).toBe(2);
  });
});
```

  The existing tests stay as they are: with no creatures their call lists are 0007's.
- [ ] **Step 2: run** the file — fails.
- [ ] **Step 3: implement** in `src/render/draw-scene.ts`. Import `CREATURE_SIZE` from
  `../game/creature` and the types `CreatureState`, `Species` from `../game/state`.
  `SceneContent` gains

```ts
  /** One sheet per species: three 16x16 frames — two free, one frozen (0008). */
  readonly creatureSheets: Readonly<Record<Species, SpriteSheet>>;
```

  and, before `drawScene`:

```ts
/** A free creature changes its frame every 15 steps: four changes per second. */
export const FLUTTER_STEPS = 15;
export const FROZEN_FRAME = 2;

/** Frozen in the light: frame 2, still. Free: frames 0 and 1 in turn, by the state's tick. */
export function creatureFrame(creature: CreatureState, tick: number): number {
  return creature.light > 0 ? FROZEN_FRAME : Math.floor(tick / FLUTTER_STEPS) % 2;
}

/** The top-left corner of a creature's frame on the surface: the feet are its bottom centre. */
export function creatureOrigin(creature: CreatureState, camera: Point): Point {
  return {
    x: Math.round(creature.x) - CREATURE_SIZE / 2 - camera.x,
    y: Math.round(creature.y) - CREATURE_SIZE - camera.y,
  };
}
```

  In `drawScene`, between the cone and the player:

```ts
  for (const creature of state.creatures) {
    const origin = creatureOrigin(creature, camera);
    renderer.drawSprite(
      content.creatureSheets[creature.species],
      creatureFrame(creature, state.tick),
      origin.x,
      origin.y,
    );
  }
```

  Update the doc comment of `drawScene`: ground, detail, the cone when the lamp is on, the
  creatures, the player, above.
- [ ] **Step 4: load the sheet.** `src/main.ts`: import `CREATURE_SIZE` from `./game/creature`;
  `const SNIPPET_SHEET_URL = '/sprites/snippet.png';`; in `loadContent` add

```ts
    creatureSheets: {
      snippet: {
        image: await loadImage(SNIPPET_SHEET_URL),
        frameWidth: CREATURE_SIZE,
        frameHeight: CREATURE_SIZE,
      },
    },
```

  and name the creature sheets in the function's comment.
- [ ] **Step 5:** `npx biome check --write .`; `npm run check` — green.
- [ ] **Step 6: look at it.** `npm run dev`, open `http://localhost:5173`, hold `D`: a scrap
  comes into view on the avenue and bobs. This is the agent's own look that the build draws at
  all — it is **not** the walk, and the acceptance plan is not run here.
- [ ] **Step 7: commit** — `Draw the creatures between the cone and the figure`; why: a creature
  in the light has to be seen on the light, and the figure stays readable in front of both.

---

### Task 8: The smoke spec

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1:** add a test after the lamp test:

```ts
test('the campus starts with three snippets and nothing captured', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.creatures.length), {
      message: 'window.shadowAi.state.creatures holds the three snippets of the campus',
    })
    .toBe(3);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.creatures[0]).toStrictEqual({ species: 'snippet', x: 1288, y: 760, light: 0 });
  expect(state?.captured).toStrictEqual({ snippet: 0 });
});
```

- [ ] **Step 2:** `npm run test:e2e` — green, the existing tests included: the first second of
  ArrowRight ends at x ≈ 1104, 186 px from the first snippet, so nothing notices the figure.
- [ ] **Step 3: the container.** `npm run build`, `docker build -t shadow-ai .`, `docker run
  --rm -p 8080:8080 shadow-ai`, then `BASE_URL=http://localhost:8080 npm run test:e2e`: all
  green, the header tests included. Stop the container.
- [ ] **Step 4:** `npm run check`; commit — `Read the creatures in the smoke test`; why: the
  smoke test proves the path from the map file to the state in the browser, against the dev
  server and the container alike.

---

### Task 9: Specification and README

**Files:**
- Modify: `docs/spec/architecture.md`, `docs/spec/gameplay.md`, `docs/spec/visual.md`,
  `docs/spec/world.md`, `docs/spec/testing.md`, `README.md`

Write each change in the document's own plain style; the content is fixed here, the wording may
follow the surrounding text.

- [ ] `architecture.md` §1: in the tree under `tools/`, after `placeholder-lamp.ts`, add
  `placeholder-snippet.ts` — "the placeholder snippet sheet as pure data: three 16x16 frames";
  the `gen-sprites.ts` line now writes "the figure, the lamp and the snippet sheet"; the
  `campus-layout.ts` line gains "and the creatures' points".
- [ ] `architecture.md` §2: the opening list becomes "`tick`, the player, the camera, the lamp,
  the creatures and the captured count; later the current map id, NPCs, cleared regions and the
  journal". After the lamp paragraph add one on creatures: `creatures` is an array of
  `{ species, x, y, light }` in the order of the map's points — the feet in map pixels, floating
  point, the bottom centre of a 16x16 sprite; the collision box is the figure's; the body point
  is (x, y − 8). `captured` is one whole number per species. `update` steps the player, then
  each creature against the stepped player (`game/creature`): lit — the lamp on, the body point
  in the cone, no solid cell on the line from the figure's box centre (x, y − 4) to the body
  point (`engine/collision`, `sightBlocked`) — it stands and `light` grows by 1, and at 60 it
  leaves the array and its species' count grows; not lit, `light` is 0 and it moves toward the
  figure's feet when they are closer than 64 px and farther than 8 px, by 2/3 px or what is left
  to 8 px, through `moveBox`, then clamped to the map. `createInitialState` makes the creatures
  from `map.points` and rejects a name that is no species.
- [ ] `architecture.md` §5: the draw order becomes "clear, then `ground`, `detail`, the lamp's
  cone when the lamp is on, the creatures in array order, the player, `above`". Add: a
  creature's frame has its top-left corner at (round(x) − 8 − camera.x, round(y) − 16 −
  camera.y); its frame is 2 while `light` is above 0, else ⌊tick / 15⌋ mod 2.
- [ ] `architecture.md` §6: in "Fixed layer names", `objects` holds the spawn point and named
  points — creatures today, later doors, NPCs and triggers. In "Parsing": `TileMap.points` are
  the point objects other than the spawn, as `{ name, x, y }` in file order; `engine/` does not
  know what a name means. In "What the loader accepts": every named point inside the map on a
  cell that is not solid. In "What it rejects", after the spawn's lines: a point object without
  a name; a named point outside the map, or on a solid cell. In "The TileMap": add `points`.
- [ ] `architecture.md` §7: after the lamp paragraph, one on `tools/placeholder-snippet.ts`:
  `public/sprites/snippet.png`, 48x16, three 16x16 frames — the scrap, the scrap 2 px higher,
  the scrap with white paper; border and lines `#68386c`, paper `#c0cbdc`, lit paper `#ffffff`;
  100 opaque pixels per frame, 52 of them the signature colour; committed, deterministic,
  tested against the generator; replaced by the art pass under the same name and frame order.
  In the campus paragraph: the layout also holds the three snippet points, and the campus test
  proves each box free, each cell reachable and none in the first view.
- [ ] `gameplay.md` §2: after the "As built (feature 0007)" paragraph add "**As built** (feature
  0008)": a creature whose body is in the cone, with no solid tile between it and the figure,
  freezes; after one second of unbroken light — 60 steps, *tune* — it is captured and gone. A
  break starts the second again. Solid tiles block the light: walls, and fences and water too.
  The cone's picture is not cut at a wall.
- [ ] `gameplay.md` §3, item 1: add "The snippet (0008) is the first: it rests until the figure
  is closer than four tiles, comes straight at it at half the figure's speed, and stops at its
  feet. A wall or a fence holds it. Its touch costs nothing until overview exists (0009)."
- [ ] `visual.md` §4, "The signature colour": replace "the asset test rejects it in every PNG
  under `public/` until the feature that introduces the shadow assets names the exception" by:
  the asset test rejects it in every PNG under `public/` except the shadow assets, a list in the
  test whose first entry is `sprites/snippet.png` (feature 0008). Add: the snippet carries the
  colour on its border and its lines of text, and it bobs while it is free — form and motion —
  and stands still in the light.
- [ ] `world.md` §4: after the last paragraph add: **The snippet** (*Schnipsel*, feature 0008),
  the species of the Sales case: a scrap of paper with lines of text, because it feeds on text
  pasted into a public chatbot. Small, layer 1. Three stand on the campus until Sales has an
  interior: two on the east avenue, one inside the meeting rooms' fence. Its displayed name and
  its journal text are fixed with the journal (M4), the name check of §5 included.
- [ ] `testing.md` §1, Unit row: in the engine part add "a sight line against the solid grid";
  in "game rules (…)" add "the creature's step: rest, approach, the stop at 8 px, sliding and
  the clamp, the light, the count to 60, the break, a wall in the light; the creatures and the
  captured count in the state"; the map loader "and the named points with their three
  rejections"; the campus "and its three snippets: free boxes, reachable cells, none in the
  first view"; the draw order "and the creatures' frames"; the sprite generators "the snippet
  sheet pixel by pixel". Assets row: "the reserved colour, allowed only in the listed shadow
  assets". Smoke row: after the lamp sentence add "; the campus starts with three snippets and
  nothing captured".
- [ ] `testing.md` §2: INV-1 row — "… whose player has walked and whose lamp is on, and one with
  a frozen creature and a captured count of 1". INV-6 row — "the reserved colour and its one
  exception, each with a negative case". INV-7 row — add "a point object without a name, a named
  point outside the map or on a solid tile".
- [ ] `testing.md` §6: add the four point fixtures to the list of examples.
- [ ] `README.md`: status — after the lamp sentence add "The first creature is on the campus
  (feature 0008): snippets come toward the figure, freeze in the light and are captured after
  one second." Run block: `npm run gen-sprites` regenerates "the placeholder figure, the lamp
  sheet and the snippet sheet"; `npm run gen-campus` the campus "with its creatures".
- [ ] `npm run check` (the documents are linted with the rest); commit — `Record the first
  creature as built`; why: what is durable about the feature moves into `docs/spec/`, and the
  feature spec stays as history.

---

### Task 10: The acceptance walk (`CLAUDE.md` §3.4)

The implementation is complete when Tasks 1–9 are committed, `npm run check` and `npm run
test:e2e` are green, the container builds and passes the smoke spec, and the documents are
updated. First merge `main` (`git fetch origin && git merge origin/main`) and rerun the checks
if it brought anything. Then the walk, by `docs/spec/testing.md` §5 — the agent guides, the
author judges:

- [ ] **Set-up.** Start `npm run dev` and state the preconditions in one message: the URL
  `http://localhost:5173`, Chrome at 1920x1080 at 100 % zoom, window not maximized, the
  developer console open beside the game, the figure at the spawn in the courtyard, a terminal
  in the repository root on the branch. Wait until the author says they are ready.
- [ ] **One step per message.** Name the next action step together with its expected step, in
  the spec's numbering and words — steps 1–26 of the spec's acceptance plan — and nothing more:
  no hint at what a failure would look like, no summary of the steps to come. Wait for `pass`
  or `fail`, with the author's note if there is one, and record it as given. Never answer a step
  yourself, never skip one, never take silence or a general remark as a pass.
- [ ] **Fail ends the walk.** Record "step n failed" with the author's words and stop. Fix the
  branch — or ask, when the fix needs a decision the spec or this plan does not make — rerun
  `npm run check` and `npm run test:e2e`, and start the walk again at step 1. Record the failed
  walk in the fix's commit message, not in the spec.
- [ ] **Feel last.** After step 26 ask the spec's six feel questions, one per message, and
  record the answers with their numbers and notes. A feel note is not a failure: a number the
  author would change becomes a new draft, not a change on this branch.
- [ ] **The record.** Write `passed YYYY-MM-DD, steps 1–26` and the feel notes into the spec's
  `Result` line in `docs/features/0008-the-first-creature.md`, and commit on the branch —
  `Record the walk of 0008`.

---

### Task 11: The pull request (`CLAUDE.md` §3.5)

- [ ] Merge `main` once more: `git fetch origin && git merge origin/main`. Rerun `npm run
  check`, `npm run test:e2e`, then `docker build -t shadow-ai .`, `docker run --rm -p 8080:8080
  shadow-ai` and `BASE_URL=http://localhost:8080 npm run test:e2e`. If the merge changed code —
  anything under `src/`, `public/`, `tools/` or `tests/` — the walk is run again (Task 10)
  before going on.
- [ ] Set `Status: implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md` only if the author wants it in this pull request, as 0007 did;
  otherwise it follows on `main` after the merge, as "Mark 0006 implemented" did. Ask.
- [ ] Push `feature/0008-the-first-creature`; open the pull request against `main` with the
  walk's result from the spec's `Result` line, the feel notes, "no new dependency", and the
  attribution line. Bind the pull request with the app's PR tools and read CI: both smoke runs,
  dev server and container, must be green.
- [ ] Hand back to the author. The author merges; the merge closes the feature.

## Self-review against the spec

- Scope "In": the species and its layer → `SPECIES` (T3), `world.md` (T9); `game/creature.ts`
  with the four constants (T3); `GameState.creatures` and `.captured` (T4); `sightBlocked` (T1);
  `TileMap.points` with the spawn's checks (T2); the campus points and `gen-campus` (T5);
  `placeholder-snippet.ts` and `gen-sprites` (T6); the reserved-colour exception (T6); the draw
  order (T7); the documents (T9). Scope "Out": nothing here hits, costs overview, reads a
  density, writes a journal entry or text, animates the capture, brings a creature back, finds a
  path, collides creatures, cuts the cone's picture, adds an `opaque` property, sorts by y or
  plays a sound.
- Behaviour "The creature as data" → T3 types, T4 state, `creaturesFrom` and its error. "One
  step" → T3 `stepCreature`, `stepCreatures`, T4 `update` order. "Rest and approach" → T3
  `approach` and its five tests, the wall tests, the clamp test. "The sight line" → T1; the box
  centre as its start and the body point as its end → `isLit` and the wall-in-the-light tests.
  "Points in the map" → T2 with the three messages. "The campus" → T5 table and tests. "The
  sprite sheet" → T6, every count and pixel rule; the frame rule → T7 `creatureFrame`.
  "Drawing" → T7. "State" → T4 round trip.
- Acceptance criteria: 1 → T5 first-view test, walk step 2; 2 → T3, walk steps 3–6; 3 → T3, T4,
  T7, walk steps 7–10; 4 → T3 break test, walk steps 11–14; 5 → T3 wall tests, walk step 16;
  6 → T3 wall-in-the-light tests, walk steps 17–18; 7 → T1, T3; 8 → T2, T3 `creaturesFrom`,
  T4; 9 → T5; 10 → T5 step 4, T6 step 5, walk steps 23–26; 11 → T6; 12 → T4; 13 → T8; 14 → T11.
- Test plan: `collision.test.ts` → T1; `creature.test.ts` → T3; `state.test.ts` → T4;
  `tiled.test.ts` and the four fixtures → T2; `campus.test.ts` → T5; `draw-scene.test.ts` → T7;
  `gen-sprites.test.ts` and `assets.test.ts` → T6; `tests/arch/` untouched; the smoke spec → T8.
- Names used across tasks: `sightBlocked`, `NamedPoint`, `TileMap.points`, `SPECIES`, `Species`,
  `CreatureState`, `Captured`, `NOTICE_RADIUS`, `TOUCH_DISTANCE`,
  `CREATURE_SPEED_PX_PER_SECOND`, `CAPTURE_STEPS`, `CREATURE_SIZE`, `bodyPoint`, `isLit`,
  `stepCreature`, `stepCreatures`, `creaturesFrom`, `noCaptures`, `SNIPPETS`,
  `SNIPPET_FRAME_SIZE`, `SNIPPET_FRAMES`, `SNIPPET_SHEET_WIDTH`, `SNIPPET_SHEET_HEIGHT`,
  `SNIPPET_PAPER`, `SNIPPET_LIT`, `snippetInk`, `renderSnippet`, `encodeSnippetPng`,
  `SceneContent.creatureSheets`, `FLUTTER_STEPS`, `FROZEN_FRAME`, `creatureFrame`,
  `creatureOrigin` — each defined once above and used with the same signature.

## Decisions by the planning session

Readings the spec leaves to the implementation, decided on 2026-11-12 so that the work does not
stop. None changes what the author sees in the walk.

1. **A captured creature is `null` from `stepCreature`.** The array has no "captured" state to
   carry; `stepCreatures` drops and counts.
2. **`CREATURE_SIZE` 16 is a fifth constant in `game/creature`.** The body point, the clamp and
   the renderer's origin all need the sprite's size; one name for it.
3. **The creature's box reuses `BOX_WIDTH` and `BOX_HEIGHT` of `game/player`.** The spec says
   the box is the figure's.
4. **`checkSpawn` becomes `checkPosition(what, …)`.** The spawn's two messages stay word for
   word; the points share the rule.
5. **The point fixtures are copies of `spawn-on-solid.tmj` with the spawn moved to (40, 56).**
   Hand-made as `testing.md` §6 asks; the solid tile at (1, 2) serves `point-on-solid.tmj`.
6. **`points.tmj` also holds a rectangle object.** It proves that objects which are not points
   are still ignored.
7. **The exception list lives in `assets.test.ts`; `PngRules.reserved` may be `null`.** The rule
   is a test rule, and the spec asks for a list whose only entry is `sprites/snippet.png`.
8. **`SceneContent.creatureSheets` is a record by species.** One key today.
9. **`creatureFrame` and `creatureOrigin` live in `draw-scene.ts`,** beside `lampFrame`.
10. **The smoke spec gets its own test.** It reads the state and presses no key, so it cannot
    disturb the two tests that do.

## Questions for the author

None.
