# 0009 — Implementation plan: overview

**Spec:** [`docs/features/0009-overview.md`](../features/0009-overview.md) (approved 2026-11-13).
The plan argues from the spec; where they differ, the spec wins. Read the spec first, then
`CLAUDE.md`, then `docs/spec/architecture.md` §1, §2, §5 and §7, `docs/spec/testing.md` §1–§3
and §5, `docs/spec/gameplay.md` §3 and §4 and `docs/spec/world.md` §1. **Written:** 2026-11-13
on the planning model. A working document, not specification: once the feature is implemented,
what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The expected
numbers below were worked out by hand from the spec's rules on 2026-11-13, not by a simulation.
If a test disagrees with its number, read the spec's "Behaviour" again and redo the arithmetic
before touching either side; if the spec and the number really disagree, stop and ask. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Goal:** a free creature within 10 px of the figure takes one of three points of overview,
pushes the figure 24 px away and leaves it safe for 90 steps; at zero the screen closes, the
figure wakes at the map's `wake` point with full overview and the creatures are back at their
homes; three lights in the top-left corner show the count.

**Approach:** bottom up, each task green on its own: the new fields of the state with their
initial values, then grace and the push in the player's step, then the hit as pure functions,
then the dark as pure functions, then the wiring in `update`, then the campus point, then the
sheet, then the drawing, then the smoke spec, then the paperwork, then the walk and the pull
request. The game behaves as in 0008 until Task 5; it shows nothing new until Task 8.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- No new dependency, runtime or development.
- `src/game/` touches no browser (INV-2). `tests/arch/` scans the source text of `src/game/`,
  comments included, for the words `window`, `document`, `HTMLCanvasElement`, `Image` and
  `fetch` as whole words, case-sensitive. In `src/game/overview.ts` write "screen", "sprite" and
  "picture"; never "window" and never "Image" with a capital I.
- `src/game/` imports from `src/engine/` and nothing else of the project. `src/render/` may
  import the constants and types of `src/game/`. `tools/` imports from `src/` as the other
  generators do.
- `GameState` stays plain data (INV-1): numbers, strings, booleans, arrays, plain objects.
- No literal text a player can read (INV-4): this feature shows no text. Error messages for the
  console are not player text.
- INV-6: `public/sprites/overview.png` uses only Endesga 32, alpha 0 or 255, and not `#68386c`.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on, `verbatimModuleSyntax` forces `import type`. `npx biome
  check --write .` sorts imports and formats; run it before `npm run check`.
- `npm run check` is typecheck, Biome, build, Vitest, in that order. `npm run test:e2e` runs the
  smoke spec against the dev server, which Playwright starts; with `BASE_URL` set it runs against
  that URL and starts nothing.
- Branch `feature/0009-overview`, this worktree; it carries the spec, its approval and this
  plan. Commit messages: imperative subject, a body with the why, and the `Co-Authored-By`
  trailer the session's own attribution reminder names. Commits are signed through 1Password,
  which fails inside the Bash sandbox: run `git commit` with the sandbox disabled.
- Vitest's `toStrictEqual` distinguishes +0 from −0. The code below never negates a zero: the
  opposite of a facing is written `0 - value`, which gives +0 for 0. Keep it that way.

## Design notes

- **Where each rule lives.** `game/state` gets the types and the constant `NO_RECOIL`.
  `game/player` gets grace and the push, because they are part of the figure's own step.
  `game/overview` gets the constants of the spec, the hit and the dark. `game/update` wires
  them in the order of the spec's "One step". `game/creature` only learns `home` and skips the
  `wake` point.
- **`stepPlayer` keeps its signature.** A figure with `recoil.steps` above 0 is pushed and the
  input is not read. `update` computes `lampOn = input.lamp && state.player.recoil.steps === 0`
  from the state *before* the step and uses it for the creatures and for `lamp.on`.
- **The hit reads the stepped world.** `hittingCreature(creatures, player)` gets the creatures
  and the figure after their own steps. It returns `null` while `player.grace` is above 0. A
  creature captured in this step is no longer in the list; a creature lit in this step has
  `light` above 0 and is skipped.
- **The grace count.** A hit sets `grace` to 90. `stepPlayer` lowers it by 1 at the start of
  every later step. So in the 90th step after the hit it is 0 again and the hit test runs.
- **The dark is its own step function.** `update` starts with
  `if (state.dark > 0) return stepDark(state, content)`. `stepDark` takes no input.
- **The wake point is content, not state.** `wakePoint(map)` reads it from `map.points` when it
  is needed. `createInitialState` calls it once so that a second `wake` stops the game at the
  start.
- **New required fields.** `PlayerState`, `CreatureState` and `GameState` grow. Every literal
  of them in the tests needs the new fields; `tsc` names each one. Task 1 lists the helpers.
- **The old draw lists stay.** The `state` helper of `draw-scene.test.ts` gets
  `overview: { current: 0, max: 0 }`: with a maximum of 0 no light is drawn, so the call lists
  of 0004–0008 stay as they are. The new tests set their own overview.

## File map

| File | Change |
|---|---|
| `src/game/state.ts` | `Recoil`, `NO_RECOIL`, `PlayerState.grace`, `.recoil`, `CreatureState.home`, `Overview`, `GameState.overview`, `.dark` (T1) |
| `src/game/overview.ts` | new: the constants, `initialOverview` (T1); `hittingCreature`, `recoilFrom`, `applyHit` (T3); `WAKE_POINT`, `wakePoint`, `stepDark` (T4) |
| `src/game/player.ts` | carries the new fields (T1); grace and the push (T2) |
| `src/game/creature.ts` | `home` (T1); skips the `wake` point (T4) |
| `src/game/update.ts` | the initial values (T1); the order of a step, the wake check (T5) |
| `tools/campus-layout.ts`, `public/maps/campus.tmj` | the `wake` point (T6) |
| `tools/placeholder-overview.ts`, `tools/gen-sprites.ts`, `public/sprites/overview.png` | the sheet (T7) |
| `src/render/draw-scene.ts`, `src/main.ts` | the lights, the lids, the blink; loading (T8) |
| `tests/e2e/smoke.spec.ts` | `home` in the creature (T1); overview and dark (T9) |
| `docs/spec/*.md`, `README.md` | as built (T10) |

Tests: `state.test.ts` (T1, T5), `creature.test.ts` (T1, T4), `player.test.ts` (T2),
`overview.test.ts` new (T3, T4, T5), `campus.test.ts` (T6), `gen-sprites.test.ts` (T7),
`draw-scene.test.ts` (T1, T8).

---

### Task 1: The new fields of the state

**Files:**
- Modify: `src/game/state.ts`, `src/game/player.ts`, `src/game/creature.ts`,
  `src/game/update.ts`
- Create: `src/game/overview.ts`
- Test: `tests/unit/state.test.ts`, `tests/unit/creature.test.ts`,
  `tests/unit/draw-scene.test.ts`, `tests/unit/player.test.ts`, `tests/unit/lamp.test.ts`,
  `tests/e2e/smoke.spec.ts`

**Interfaces — produces:** `Recoil`, `NO_RECOIL`, `Overview`, the new fields; the constants
`INITIAL_OVERVIEW`, `HIT_DISTANCE`, `GRACE_STEPS`, `RECOIL_STEPS`, `RECOIL_PX_PER_STEP`,
`DARK_STEPS`, `WAKE_STEP`; `initialOverview(): Overview`.

- [ ] **Step 1: the failing tests.** In `tests/unit/state.test.ts`:
  - the test "starts at tick 0 …" expects

```ts
    expect(createInitialState(MAP)).toStrictEqual({
      tick: 0,
      player: {
        x: 136,
        y: 120,
        facing: 'down',
        frame: 0,
        frameTimer: 0,
        grace: 0,
        recoil: { dx: 0, dy: 0, steps: 0 },
      },
      camera: { x: 0, y: 12 },
      lamp: { on: false },
      creatures: [],
      captured: { snippet: 0 },
      overview: { current: 3, max: 3 },
      dark: 0,
    });
```

  - in `describe('update')` the constant `player` gains `grace: 0, recoil: { dx: 0, dy: 0,
    steps: 0 }`, and each of the three state literals gains `overview: { current: 3, max: 3 },
    dark: 0`;
  - the helper `feet` in "the camera in the state" gains the same two player fields;
  - in "the creatures in the state" the two expected creature literals gain
    `home: { x: 1070, y: 734 }`.

  In `tests/unit/creature.test.ts` import `NO_RECOIL` from `../../src/game/state` (a value
  import beside the type imports) and change the helpers to

```ts
const figure = (x: number, y: number, facing: Facing = 'down'): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
});
/** Every test creature has the same home, so that two of them compare equal after a move. */
const HOME = { x: 0, y: 0 };
const snippet = (x: number, y: number, light = 0): CreatureState => ({
  species: 'snippet',
  x,
  y,
  light,
  home: HOME,
});
```

  and add, in the `describe` that tests `creaturesFrom`:

```ts
  it("sets a creature's home to its point, and a step leaves the home unchanged (0009)", () => {
    const [made] = creaturesFrom([{ name: 'snippet', x: 100, y: 100 }]);
    expect(made).toStrictEqual({
      species: 'snippet',
      x: 100,
      y: 100,
      light: 0,
      home: { x: 100, y: 100 },
    });
    if (made === undefined) {
      throw new Error('no creature');
    }
    const moved = stepCreature(made, figure(160, 100), false, OPEN);
    expect(moved?.x).toBeCloseTo(100.6667, 3);
    expect(moved?.home).toStrictEqual({ x: 100, y: 100 });
  });
```

  Any other expected literal of `creaturesFrom` in that file gains `home` equal to its point.

- [ ] **Step 2:** run `npx vitest run tests/unit/state.test.ts tests/unit/creature.test.ts`.
  Expected: failures — `grace`, `recoil`, `home`, `overview` and `dark` are missing.

- [ ] **Step 3: `src/game/state.ts`.** Add before `PlayerState`:

```ts
/** The push a hit leaves (0009): the move per step in pixels and the steps it still lasts, 0–8. */
export interface Recoil {
  readonly dx: number;
  readonly dy: number;
  readonly steps: number;
}

/** No push. With `steps` 0, `dx` and `dy` are 0. */
export const NO_RECOIL: Recoil = { dx: 0, dy: 0, steps: 0 };
```

  `PlayerState` gains, after `frameTimer`:

```ts
  /** Steps the figure is still safe from a hit, 0–90 (0009). */
  readonly grace: number;
  /** The push the figure is still carrying out (0009). */
  readonly recoil: Recoil;
```

  `CreatureState` gains, after `light`:

```ts
  /** The map point it started at; it returns there when the figure wakes (0009). Never changes. */
  readonly home: Point;
```

  Add before `GameState`, and the two fields at its end:

```ts
/** Overview is the game's health (gameplay.md §4): whole numbers, 0 ≤ current ≤ max. */
export interface Overview {
  readonly current: number;
  readonly max: number;
}
```

```ts
  readonly overview: Overview;
  /** The step of the dark sequence, 1–89; 0 while the game runs (0009). */
  readonly dark: number;
```

- [ ] **Step 4: `src/game/overview.ts`, new.**

```ts
import type { Overview } from './state';

/**
 * Overview (gameplay.md §4, feature 0009): the hit of a free creature, the push and the safe
 * time it leaves, and the dark the figure falls into at zero. Pure data and pure functions.
 */

/** The points of overview the game starts with; the maximum grows with solved cases (M5). */
export const INITIAL_OVERVIEW = 3;
/** Tune: a free creature this close to the figure's feet hits; 2 px more than its stop at 8. */
export const HIT_DISTANCE = 10;
/** Tune: 1.5 s safe after a hit. */
export const GRACE_STEPS = 90;
/** Tune: the push lasts 8 steps of 3 px: 24 px, a tile and a half. */
export const RECOIL_STEPS = 8;
export const RECOIL_PX_PER_STEP = 3;
/** Tune: the dark sequence, 1.5 s; the world is set right in its 45th step. */
export const DARK_STEPS = 90;
export const WAKE_STEP = 45;

export function initialOverview(): Overview {
  return { current: INITIAL_OVERVIEW, max: INITIAL_OVERVIEW };
}
```

- [ ] **Step 5: carry the fields.** In `src/game/player.ts`, the returned literal at the end of
  `stepPlayer` gains `grace: player.grace, recoil: player.recoil` (Task 2 gives them their
  rules). In `src/game/creature.ts`, `creaturesFrom` returns
  `{ species: point.name, x: point.x, y: point.y, light: 0, home: { x: point.x, y: point.y } }`.
  In `src/game/update.ts`: the initial player gains `grace: 0, recoil: NO_RECOIL`; the initial
  state gains `overview: initialOverview(), dark: 0`; `update` returns
  `overview: state.overview, dark: state.dark` unchanged. Update the two doc comments.

- [ ] **Step 6: the other literals.** Run `npm run typecheck` and give every literal it names
  the new fields, with these values:
  - `tests/unit/player.test.ts`: `standing` returns `grace: 0, recoil: NO_RECOIL` too (import
    `NO_RECOIL` from `../../src/game/state`); any other `PlayerState` literal the same;
  - `tests/unit/lamp.test.ts`: the literal in line 24 the same;
  - `tests/unit/draw-scene.test.ts`: the `player` helper gains `grace: 0, recoil: NO_RECOIL`;
    the `state` helper gains `overview: { current: 0, max: 0 }, dark: 0`, with the comment
    `// No lights: the call lists of the earlier features stay as they were (0009).`; the
    `snippet` helper gains `home: { x: 0, y: 0 }`;
  - `tests/e2e/smoke.spec.ts`: the expected first creature becomes
    `{ species: 'snippet', x: 1288, y: 760, light: 0, home: { x: 1288, y: 760 } }`.

  A test that compares a whole stepped player with `toStrictEqual` gains the two fields in its
  expectation.

- [ ] **Step 7:** `npx biome check --write .`, then `npm run check`. Expected: green.

- [ ] **Step 8: commit** — `Carry overview, grace, the push and a home in the state`; why: the
  fields exist with their initial values before any rule reads them, so each later task changes
  one rule and no literals.

---

### Task 2: Grace and the push in the figure's step

**Files:**
- Modify: `src/game/player.ts`
- Test: `tests/unit/player.test.ts`

**Interfaces — consumes:** `Recoil`, `NO_RECOIL` (T1). **Produces:** `stepPlayer` with the
same signature: `grace` drops by 1 per step, not below 0; with `recoil.steps` above 0 the figure
is pushed and the input is not read.

- [ ] **Step 1: the failing tests.** Append to `tests/unit/player.test.ts`:

```ts
describe('grace and the push (0009)', () => {
  const figureWith = (fields: Partial<PlayerState>): PlayerState => ({
    ...standing(160, 96, 'right'),
    ...fields,
  });

  it('grace drops by one per step, walking, standing or shining, and stops at 0', () => {
    expect(stepPlayer(figureWith({ grace: 2 }), NONE, MAP).grace).toBe(1);
    expect(stepPlayer(figureWith({ grace: 2 }), press('left'), MAP).grace).toBe(1);
    expect(stepPlayer(figureWith({ grace: 2 }), shining(), MAP).grace).toBe(1);
    expect(stepPlayer(figureWith({ grace: 0 }), NONE, MAP).grace).toBe(0);
  });

  it('a push moves the figure by (dx, dy) and ignores the keys', () => {
    const next = stepPlayer(
      figureWith({ grace: 90, recoil: { dx: 3, dy: 0, steps: 8 } }),
      shining('left'),
      MAP,
    );
    expect(next).toStrictEqual({
      x: 163,
      y: 96,
      facing: 'right',
      frame: 0,
      frameTimer: 0,
      grace: 89,
      recoil: { dx: 3, dy: 0, steps: 7 },
    });
  });

  it('eight steps of 3 px are 24 px, then the push is over and the keys work again', () => {
    const pushed = walk(figureWith({ recoil: { dx: 3, dy: 0, steps: 8 } }), press('left'), 8);
    expect(pushed.x).toBe(184);
    expect(pushed.facing).toBe('right');
    expect(pushed.recoil).toStrictEqual({ dx: 0, dy: 0, steps: 0 });
    const after = stepPlayer(pushed, press('left'), MAP);
    expect(after.x).toBeCloseTo(182.6667, 3);
    expect(after.facing).toBe('left');
  });

  it('a diagonal push ends with no push left', () => {
    const next = stepPlayer(figureWith({ recoil: { dx: 1.8, dy: 2.4, steps: 1 } }), NONE, MAP);
    expect(next.x).toBeCloseTo(161.8, 6);
    expect(next.y).toBeCloseTo(98.4, 6);
    expect(next.recoil).toStrictEqual({ dx: 0, dy: 0, steps: 0 });
  });

  it('a push resets the walk cycle to standing', () => {
    const next = stepPlayer(
      figureWith({ frame: 3, frameTimer: 2.5, recoil: { dx: 3, dy: 0, steps: 2 } }),
      press('right'),
      MAP,
    );
    expect([next.frame, next.frameTimer]).toStrictEqual([0, 0]);
  });

  it('a wall holds the push: a solid cell 10 px behind the box stops it flush', () => {
    // Column 7 is [112, 128). The box of feet (96, 100) is [90, 102) × [92, 100): rows 5 and 6.
    const rows = Array.from({ length: 12 }, (_, row) =>
      row === 5 || row === 6 ? '.......#............' : '....................',
    );
    const walled = pictureMap(rows, { x: 96, y: 100 });
    const pushed = walk(
      { ...standing(96, 100, 'left'), recoil: { dx: 3, dy: 0, steps: 8 } },
      NONE,
      8,
      walled,
    );
    expect(pushed.x).toBe(106); // the box's right edge at 112
    expect(pushed.y).toBe(100);
  });

  it("the map's edge holds the push: the clamp keeps x at 8", () => {
    const pushed = walk(
      { ...standing(10, 96, 'right'), recoil: { dx: -3, dy: 0, steps: 8 } },
      NONE,
      8,
    );
    expect(pushed.x).toBe(8);
  });
});
```

- [ ] **Step 2:** run `npx vitest run tests/unit/player.test.ts`. Expected: the new tests fail —
  `grace` does not drop and the figure is not pushed.

- [ ] **Step 3: implement.** In `src/game/player.ts` import `NO_RECOIL` from `./state` and
  replace `stepPlayer` by:

```ts
/** The feet from a moved box, clamped so the whole 16x24 sprite stays inside the map. */
function feetOf(box: Point, map: TileMap): { readonly x: number; readonly y: number } {
  const halfWidth = FRAME_WIDTH / 2;
  return {
    x: clamp(box.x + BOX_WIDTH / 2, halfWidth, map.width * TILE_SIZE - halfWidth),
    y: clamp(box.y + BOX_HEIGHT, FRAME_HEIGHT, map.height * TILE_SIZE),
  };
}

/**
 * One step of a push (0009): the box moves by the push against the solid grid and the clamp,
 * like a walking step. The keys are not read, the facing stays, the walk cycle is standing.
 */
function pushed(player: PlayerState, grace: number, map: TileMap): PlayerState {
  const { dx, dy, steps } = player.recoil;
  return {
    ...feetOf(moveBox(collisionBox(player), dx, dy, map), map),
    facing: player.facing,
    frame: 0,
    frameTimer: 0,
    grace,
    recoil: steps > 1 ? { dx, dy, steps: steps - 1 } : NO_RECOIL,
  };
}

/**
 * One step. `grace` drops by 1, not below 0 (0009). A figure that is being pushed is moved by
 * the push and nothing else. With the lamp on (0007) the figure stands where it is and the
 * direction keys only turn it, by the same rule as walking; the walk cycle is standing.
 * Otherwise: move the box along the vector against the solid grid, X then Y (engine/collision),
 * clamp the feet so the whole 16x24 sprite stays inside the map, turn. "Moving" is the vector
 * before collision and clamp, so a figure held by a wall or an edge keeps its facing and its
 * walk cycle.
 */
export function stepPlayer(player: PlayerState, input: GameInput, map: TileMap): PlayerState {
  const grace = Math.max(0, player.grace - 1);
  if (player.recoil.steps > 0) {
    return pushed(player, grace, map);
  }
  const vector = movementVector(input);
  if (input.lamp) {
    return { ...player, facing: facingOf(vector, player.facing), frame: 0, frameTimer: 0, grace };
  }
  const moving = vector.x !== 0 || vector.y !== 0;
  const box = moveBox(
    collisionBox(player),
    vector.x * STEP_DISTANCE,
    vector.y * STEP_DISTANCE,
    map,
  );
  return {
    ...feetOf(box, map),
    facing: facingOf(vector, player.facing),
    ...walkCycle(player, moving),
    grace,
    recoil: player.recoil,
  };
}
```

  `Point` comes from `../engine/tiled` as a type import (`moveBox` returns it).

- [ ] **Step 4:** `npx biome check --write .`, then `npm run check`. Expected: green.

- [ ] **Step 5: commit** — `Push the figure and count its grace down`; why: both are part of
  the figure's own step, so the rule that a wall holds a walking figure holds a pushed one too.

---

### Task 3: The hit

**Files:**
- Modify: `src/game/overview.ts`
- Test: `tests/unit/overview.test.ts` (new)

**Interfaces — consumes:** the constants (T1), `DIRECTIONS` from `game/lamp`. **Produces:**

```ts
export function hittingCreature(
  creatures: readonly CreatureState[],
  player: PlayerState,
): CreatureState | null;
export function recoilFrom(creature: CreatureState, player: PlayerState): Recoil;
export interface HitResult {
  readonly player: PlayerState;
  readonly overview: Overview;
  readonly dark: number;
}
export function applyHit(
  player: PlayerState,
  overview: Overview,
  creature: CreatureState,
): HitResult;
```

- [ ] **Step 1: the failing tests.** Create `tests/unit/overview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  applyHit,
  DARK_STEPS,
  GRACE_STEPS,
  HIT_DISTANCE,
  hittingCreature,
  INITIAL_OVERVIEW,
  initialOverview,
  RECOIL_PX_PER_STEP,
  RECOIL_STEPS,
  recoilFrom,
  WAKE_STEP,
} from '../../src/game/overview';
import {
  type CreatureState,
  type Facing,
  NO_RECOIL,
  type PlayerState,
} from '../../src/game/state';

const figure = (
  x: number,
  y: number,
  facing: Facing = 'right',
  fields: Partial<PlayerState> = {},
): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
  ...fields,
});
const snippet = (x: number, y: number, light = 0): CreatureState => ({
  species: 'snippet',
  x,
  y,
  light,
  home: { x: 40, y: 40 },
});
const AT = figure(160, 100);

describe('the constants (0009)', () => {
  it('are the spec numbers', () => {
    expect([
      INITIAL_OVERVIEW,
      HIT_DISTANCE,
      GRACE_STEPS,
      RECOIL_STEPS,
      RECOIL_PX_PER_STEP,
      DARK_STEPS,
      WAKE_STEP,
    ]).toStrictEqual([3, 10, 90, 8, 3, 90, 45]);
    expect(initialOverview()).toStrictEqual({ current: 3, max: 3 });
  });
});

describe('hittingCreature', () => {
  it('is a free creature at most 10 px from the feet', () => {
    expect(hittingCreature([snippet(150, 100)], AT)).toStrictEqual(snippet(150, 100));
    expect(hittingCreature([snippet(154, 92)], AT)).toStrictEqual(snippet(154, 92)); // 6-8-10
    expect(hittingCreature([snippet(149.9, 100)], AT)).toBeNull();
    expect(hittingCreature([], AT)).toBeNull();
  });

  it('is never a frozen creature, however close', () => {
    expect(hittingCreature([snippet(155, 100, 1)], AT)).toBeNull();
    expect(hittingCreature([snippet(160, 100, 59)], AT)).toBeNull();
  });

  it('is the first in array order', () => {
    const creatures = [snippet(200, 100), snippet(170, 100), snippet(150, 100)];
    expect(hittingCreature(creatures, AT)).toStrictEqual(snippet(170, 100));
  });

  it('is nobody while the figure is safe', () => {
    expect(hittingCreature([snippet(150, 100)], figure(160, 100, 'right', { grace: 1 }))).toBeNull();
  });
});

describe('recoilFrom', () => {
  it('pushes 3 px per step for 8 steps, straight away from the creature', () => {
    expect(recoilFrom(snippet(150, 100), AT)).toStrictEqual({ dx: 3, dy: 0, steps: 8 });
    expect(recoilFrom(snippet(160, 108), AT)).toStrictEqual({ dx: 0, dy: -3, steps: 8 });
  });

  it('follows the line between the feet: from (154.4, 92.533) it is (1.8, 2.4)', () => {
    const recoil = recoilFrom(snippet(154.4, 100 - 7.4667), AT);
    expect(recoil.dx).toBeCloseTo(1.8, 3);
    expect(recoil.dy).toBeCloseTo(2.4, 3);
    expect(recoil.steps).toBe(8);
  });

  it('on the same spot it is the opposite of the facing, without a negated zero', () => {
    expect(recoilFrom(snippet(160, 100), AT)).toStrictEqual({ dx: -3, dy: 0, steps: 8 });
    expect(recoilFrom(snippet(160, 100), figure(160, 100, 'up'))).toStrictEqual({
      dx: 0,
      dy: 3,
      steps: 8,
    });
  });
});

describe('applyHit', () => {
  it('takes one point, makes the figure safe for 90 steps and pushes it', () => {
    expect(applyHit(AT, { current: 3, max: 3 }, snippet(150, 100))).toStrictEqual({
      player: { ...AT, grace: 90, recoil: { dx: 3, dy: 0, steps: 8 } },
      overview: { current: 2, max: 3 },
      dark: 0,
    });
  });

  it('the last point starts the dark and leaves grace and the push as they are', () => {
    expect(applyHit(AT, { current: 1, max: 3 }, snippet(150, 100))).toStrictEqual({
      player: AT,
      overview: { current: 0, max: 3 },
      dark: 1,
    });
  });
});
```

- [ ] **Step 2:** run `npx vitest run tests/unit/overview.test.ts`. Expected: it fails to
  import `hittingCreature`, `recoilFrom` and `applyHit`.

- [ ] **Step 3: implement.** In `src/game/overview.ts` the imports become

```ts
import { DIRECTIONS } from './lamp';
import type { CreatureState, Overview, PlayerState, Recoil } from './state';
```

  and after `initialOverview` add:

```ts
/**
 * The creature that hits in this step, or null: the first in array order that is free — not
 * frozen in the light — and at most HIT_DISTANCE from the figure's feet. Nobody hits a figure
 * that is still safe. Called with the creatures and the figure after their own steps.
 */
export function hittingCreature(
  creatures: readonly CreatureState[],
  player: PlayerState,
): CreatureState | null {
  if (player.grace > 0) {
    return null;
  }
  for (const creature of creatures) {
    const distance = Math.hypot(player.x - creature.x, player.y - creature.y);
    if (creature.light === 0 && distance <= HIT_DISTANCE) {
      return creature;
    }
  }
  return null;
}

/**
 * The push a hit leaves: RECOIL_PX_PER_STEP along the line from the creature's feet to the
 * figure's, for RECOIL_STEPS steps. On the same spot the line is the opposite of the facing;
 * `0 - value` and not `-value`, so that no component is a negated zero.
 */
export function recoilFrom(creature: CreatureState, player: PlayerState): Recoil {
  const dx = player.x - creature.x;
  const dy = player.y - creature.y;
  const distance = Math.hypot(dx, dy);
  const facing = DIRECTIONS[player.facing];
  const unit =
    distance === 0
      ? { x: 0 - facing.x, y: 0 - facing.y }
      : { x: dx / distance, y: dy / distance };
  return {
    dx: unit.x * RECOIL_PX_PER_STEP,
    dy: unit.y * RECOIL_PX_PER_STEP,
    steps: RECOIL_STEPS,
  };
}

/** What a hit leaves behind. `dark` is 1 when it took the last point, else 0. */
export interface HitResult {
  readonly player: PlayerState;
  readonly overview: Overview;
  readonly dark: number;
}

/**
 * One point less. Above zero the figure is safe for GRACE_STEPS and is pushed away; at zero
 * the dark begins and the figure is left as it is — the dark sets it right.
 */
export function applyHit(
  player: PlayerState,
  overview: Overview,
  creature: CreatureState,
): HitResult {
  const left: Overview = { current: overview.current - 1, max: overview.max };
  if (left.current <= 0) {
    return { player, overview: { current: 0, max: overview.max }, dark: 1 };
  }
  return {
    player: { ...player, grace: GRACE_STEPS, recoil: recoilFrom(creature, player) },
    overview: left,
    dark: 0,
  };
}
```

- [ ] **Step 4:** `npx biome check --write .`, then `npm run check`. Expected: green. If
  `recoilFrom(snippet(160, 108), AT)` gives `dx: -0`, the subtraction order is wrong: it must be
  `player.x - creature.x`, which is +0 for equal values.

- [ ] **Step 5: commit** — `Let a free creature take a point of overview`; why: the hit, its
  push and its last point are three pure functions, proven before `update` calls them.

---

### Task 4: The dark

**Files:**
- Modify: `src/game/overview.ts`, `src/game/creature.ts`
- Test: `tests/unit/overview.test.ts`, `tests/unit/creature.test.ts`

**Interfaces — consumes:** `followPlayer(player, map)` from `game/camera`. **Produces:**

```ts
export const WAKE_POINT = 'wake';
export function wakePoint(map: TileMap): Point;
export function stepDark(state: GameState, map: TileMap): GameState;
```

  and `creaturesFrom`, which makes no creature from a `wake` point.

- [ ] **Step 1: the failing tests.** Append to `tests/unit/overview.test.ts` (add `stepDark`,
  `WAKE_POINT` and `wakePoint` to the import from `overview`, `GameState` to the type imports
  from `state`, and import `followPlayer` from `../../src/game/camera` and `grassMap` from
  `./grass-map`):

```ts
describe('wakePoint', () => {
  const spawn = { x: 160, y: 100 };

  it("is the map's point named wake", () => {
    expect(WAKE_POINT).toBe('wake');
    const map = grassMap(20, 12, spawn, [
      { name: 'snippet', x: 30, y: 30 },
      { name: 'wake', x: 80, y: 60 },
    ]);
    expect(wakePoint(map)).toStrictEqual({ x: 80, y: 60 });
  });

  it('is the spawn on a map without one', () => {
    expect(wakePoint(grassMap(20, 12, spawn))).toStrictEqual(spawn);
  });

  it('rejects a second one', () => {
    const map = grassMap(20, 12, spawn, [
      { name: 'wake', x: 80, y: 60 },
      { name: 'wake', x: 90, y: 60 },
    ]);
    expect(() => wakePoint(map)).toThrow('more than one point object "wake"');
  });
});

describe('stepDark', () => {
  /** 40x30 tiles, 640x480 px, with the wake point at (80, 60). */
  const MAP = grassMap(40, 30, { x: 320, y: 240 }, [{ name: 'wake', x: 80, y: 60 }]);
  const FALLEN: GameState = {
    tick: 500,
    player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
    camera: { x: 140, y: 106 },
    lamp: { on: true },
    creatures: [snippet(310, 200)],
    captured: { snippet: 2 },
    overview: { current: 0, max: 3 },
    dark: 1,
  };
  const after = (steps: number): GameState => {
    let state = FALLEN;
    for (let i = 0; i < steps; i += 1) {
      state = stepDark(state, MAP);
    }
    return state;
  };

  it('for 43 steps only dark and tick grow, and the lamp is off', () => {
    expect(after(43)).toStrictEqual({ ...FALLEN, tick: 543, lamp: { on: false }, dark: 44 });
  });

  it('the 44th step, dark 45, sets the world right', () => {
    const woken = after(44);
    const player = figure(80, 60, 'down');
    expect(woken).toStrictEqual({
      tick: 544,
      player,
      camera: followPlayer(player, MAP),
      lamp: { on: false },
      creatures: [{ ...snippet(40, 40), home: { x: 40, y: 40 } }],
      captured: { snippet: 2 },
      overview: { current: 3, max: 3 },
      dark: 45,
    });
    expect(woken.camera).toStrictEqual({ x: 0, y: 0 });
  });

  it('a frozen creature comes home free', () => {
    const state = stepDark({ ...FALLEN, creatures: [snippet(310, 200, 30)], dark: 44 }, MAP);
    expect(state.creatures).toStrictEqual([snippet(40, 40)]);
  });

  it('after 88 steps dark is 89, and the 89th ends it', () => {
    expect(after(88).dark).toBe(89);
    const ended = after(89);
    expect(ended.dark).toBe(0);
    expect(ended.tick).toBe(589);
    expect(ended.player).toStrictEqual(figure(80, 60, 'down'));
  });
});
```

  In `tests/unit/creature.test.ts`, in the `describe` that tests `creaturesFrom`:

```ts
  it('makes no creature from the wake point (0009)', () => {
    expect(
      creaturesFrom([
        { name: 'wake', x: 80, y: 60 },
        { name: 'snippet', x: 100, y: 100 },
      ]),
    ).toHaveLength(1);
    expect(() => creaturesFrom([{ name: 'wak', x: 80, y: 60 }])).toThrow(
      'unknown point object "wak" at (80, 60)',
    );
  });
```

- [ ] **Step 2:** run `npx vitest run tests/unit/overview.test.ts tests/unit/creature.test.ts`.
  Expected: the import of `stepDark` fails; `creaturesFrom` throws on `wake`.

- [ ] **Step 3: implement.** In `src/game/overview.ts` the imports become

```ts
import type { Point, TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { DIRECTIONS } from './lamp';
import {
  type CreatureState,
  type GameState,
  NO_RECOIL,
  type Overview,
  type PlayerState,
  type Recoil,
} from './state';
```

  and at the end add:

```ts
/** The name of the map point the figure wakes at. */
export const WAKE_POINT = 'wake';

/**
 * Where the figure wakes: the map's point named `wake`, or its spawn when it has none. Two are
 * an error, so that a copied point in the map is not a silently ignored one.
 */
export function wakePoint(map: TileMap): Point {
  const wakes = map.points.filter((point) => point.name === WAKE_POINT);
  if (wakes.length > 1) {
    throw new Error(`more than one point object "${WAKE_POINT}"`);
  }
  const [wake] = wakes;
  return wake === undefined ? map.spawn : { x: wake.x, y: wake.y };
}

/** The world set right: the figure at the wake point, overview full, every creature at home. */
function woken(state: GameState, map: TileMap): GameState {
  const wake = wakePoint(map);
  const player: PlayerState = {
    x: wake.x,
    y: wake.y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
    grace: 0,
    recoil: NO_RECOIL,
  };
  return {
    tick: state.tick,
    player,
    camera: followPlayer(player, map),
    lamp: { on: false },
    creatures: state.creatures.map((creature) => ({
      ...creature,
      x: creature.home.x,
      y: creature.home.y,
      light: 0,
    })),
    captured: state.captured,
    overview: { current: state.overview.max, max: state.overview.max },
    dark: state.dark,
  };
}

/**
 * One step of the dark (state.dark above 0): `dark` and `tick` grow by 1, the lamp is off and
 * nothing else moves. In the step `dark` becomes WAKE_STEP the world is set right, unseen behind
 * the closed screen; in the step it would become DARK_STEPS it is 0 and the game runs again.
 */
export function stepDark(state: GameState, map: TileMap): GameState {
  const dark = state.dark + 1;
  const next: GameState = {
    ...state,
    tick: state.tick + 1,
    lamp: { on: false },
    dark: dark >= DARK_STEPS ? 0 : dark,
  };
  return dark === WAKE_STEP ? woken(next, map) : next;
}
```

  In `src/game/creature.ts` import `WAKE_POINT` from `./overview` and let `creaturesFrom` skip
  it: `return points.filter((point) => point.name !== WAKE_POINT).map((point) => { … });` with
  the body unchanged. Extend its doc comment: the `wake` point (0009) is the one name besides
  the species, and it makes no creature.

- [ ] **Step 4:** `npx biome check --write .`, then `npm run check`. Expected: green.
  `tests/arch/` must stay green: `overview.ts` imports `engine/tiled` and its own siblings only.

- [ ] **Step 5: commit** — `Let the figure wake where the map says`; why: the dark is a
  sequence of its own with no input, so it is one function, and the wake point is a point of the
  map like every other place.

---

### Task 5: The order of a step

**Files:**
- Modify: `src/game/update.ts`
- Test: `tests/unit/overview.test.ts`, `tests/unit/state.test.ts`

**Interfaces — consumes:** `stepPlayer` (T2), `hittingCreature`, `applyHit` (T3), `stepDark`,
`wakePoint` (T4). **Produces:** `update` and `createInitialState` as the spec's "One step" and
"The dark" say.

- [ ] **Step 1: the failing tests.** Append to `tests/unit/overview.test.ts` (import
  `createInitialState` and `update` from `../../src/game/update` and the type `GameInput` from
  `../../src/game/player`):

```ts
describe('overview in update', () => {
  /** Open ground, 20x12 tiles, with the wake point at (80, 60). */
  const MAP = grassMap(20, 12, { x: 160, y: 100 }, [{ name: 'wake', x: 80, y: 60 }]);
  const NONE: GameInput = { up: false, down: false, left: false, right: false, lamp: false };
  const SHINE: GameInput = { ...NONE, lamp: true };
  const LEFT_SHINE: GameInput = { ...NONE, left: true, lamp: true };
  const ALL: GameInput = { up: true, down: true, left: true, right: true, lamp: true };
  /** The figure at (160, 100) facing right, with these creatures. */
  const game = (creatures: readonly CreatureState[], fields: Partial<GameState> = {}): GameState => ({
    ...createInitialState(MAP),
    player: AT,
    creatures,
    ...fields,
  });
  const run = (state: GameState, steps: number, input: GameInput): GameState => {
    let current = state;
    for (let i = 0; i < steps; i += 1) {
      current = update(current, input, MAP);
    }
    return current;
  };

  it('a creature at 10 px comes 2/3 px closer and hits in that step', () => {
    const next = update(game([snippet(150, 100)]), NONE, MAP);
    expect(next.overview).toStrictEqual({ current: 2, max: 3 });
    expect(next.player.grace).toBe(90);
    expect(next.player.recoil.dx).toBeCloseTo(3, 9);
    expect(next.player.recoil.dy).toBe(0);
    expect(next.player.recoil.steps).toBe(8);
    expect(next.player.x).toBe(160);
    expect(next.creatures[0]?.x).toBeCloseTo(150.6667, 3);
    expect(next.dark).toBe(0);
  });

  it('a creature at 11 px does not hit in the first step and hits in the second', () => {
    const first = update(game([snippet(149, 100)]), NONE, MAP);
    expect(first.overview.current).toBe(3);
    expect(first.creatures[0]?.x).toBeCloseTo(149.6667, 3);
    expect(update(first, NONE, MAP).overview.current).toBe(2);
  });

  it('the push ignores the keys and holds the lamp off for eight steps', () => {
    let state = update(game([snippet(150, 100)]), NONE, MAP);
    const xs: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      state = update(state, LEFT_SHINE, MAP);
      xs.push(Math.round(state.player.x * 1000) / 1000);
      expect(state.lamp.on, `step ${i + 1}`).toBe(false);
      expect(state.player.facing).toBe('right');
      expect(state.player.frame).toBe(0);
    }
    expect(xs).toStrictEqual([163, 166, 169, 172, 175, 178, 181, 184]);
    expect(state.player.recoil).toStrictEqual({ dx: 0, dy: 0, steps: 0 });
    const ninth = update(state, LEFT_SHINE, MAP);
    expect(ninth.lamp.on).toBe(true);
    expect(ninth.player.facing).toBe('left');
    expect(ninth.player.x).toBeCloseTo(184, 6);
  });

  it('with grace 2 there is no hit; one step later there is', () => {
    const safe = game([snippet(151, 100)], { player: { ...AT, grace: 2 } });
    const first = update(safe, NONE, MAP);
    expect([first.overview.current, first.player.grace]).toStrictEqual([3, 1]);
    expect(update(first, NONE, MAP).overview.current).toBe(2);
  });

  it('a creature that stays at the figure hits again in the 90th step after a hit, not sooner', () => {
    let state = update(game([snippet(150, 100)]), NONE, MAP);
    for (let i = 1; i <= 89; i += 1) {
      state = update(state, NONE, MAP);
      expect(state.overview.current, `step ${i} after the hit`).toBe(2);
    }
    expect(update(state, NONE, MAP).overview.current).toBe(1);
  });

  it('the lamp is the defence: a lit creature at 10 px does not hit', () => {
    // Apex (160, 88), body (170, 92): d = 10, s = 4.
    const lit = update(game([snippet(170, 100)]), SHINE, MAP);
    expect(lit.creatures[0]?.light).toBe(1);
    expect(lit.overview.current).toBe(3);
    expect(update(game([snippet(170, 100)]), NONE, MAP).overview.current).toBe(2);
  });

  it('one step holds one hit, from the first creature in the array', () => {
    const next = update(game([snippet(150, 100), snippet(170, 100)]), NONE, MAP);
    expect(next.overview.current).toBe(2);
    expect(next.player.recoil.dx).toBeCloseTo(3, 9);
  });

  it('the last point starts the dark', () => {
    const next = update(
      game([snippet(150, 100)], { overview: { current: 1, max: 3 } }),
      NONE,
      MAP,
    );
    expect(next.overview).toStrictEqual({ current: 0, max: 3 });
    expect(next.dark).toBe(1);
    expect(next.player.grace).toBe(0);
    expect(next.player.recoil).toStrictEqual({ dx: 0, dy: 0, steps: 0 });
  });

  it('in the dark the keys do nothing; 89 steps later the figure is awake at the wake point', () => {
    const fallen = update(
      game([snippet(150, 100)], { overview: { current: 1, max: 3 } }),
      NONE,
      MAP,
    );
    const middle = run(fallen, 43, ALL);
    expect(middle.dark).toBe(44);
    expect(middle.player).toStrictEqual(fallen.player);
    expect(middle.creatures).toStrictEqual(fallen.creatures);
    expect(middle.lamp.on).toBe(false);
    const ended = run(middle, 46, ALL);
    expect(ended.dark).toBe(0);
    expect(ended.overview).toStrictEqual({ current: 3, max: 3 });
    expect([ended.player.x, ended.player.y, ended.player.facing]).toStrictEqual([80, 60, 'down']);
    expect(ended.creatures).toStrictEqual([snippet(40, 40)]);
    const moved = update(ended, { ...NONE, right: true }, MAP);
    expect(moved.player.x).toBeCloseTo(81.3333, 3);
  });
});
```

  In `tests/unit/state.test.ts` append:

```ts
describe('overview in the state (0009)', () => {
  const point = (name: string, x: number, y: number) => ({ name, x, y });
  const SPAWN = { x: 1024, y: 734 };
  /** A snippet at 6-8-10 from the spawn: it hits in step 1 and pushes along (0.6, 0.8). */
  const MAP_HIT = grassMap(128, 96, SPAWN, [point('snippet', 1018, 726)]);
  const run = (steps: number): GameState => {
    let state = createInitialState(MAP_HIT);
    for (let i = 0; i < steps; i += 1) {
      state = update(state, NONE, MAP_HIT);
    }
    return state;
  };

  it('a map with one wake point starts, and the point makes no creature', () => {
    const map = grassMap(128, 96, SPAWN, [point('wake', 792, 744)]);
    expect(createInitialState(map).creatures).toStrictEqual([]);
  });

  it('a map with two wake points does not start', () => {
    const map = grassMap(128, 96, SPAWN, [point('wake', 792, 744), point('wake', 800, 744)]);
    expect(() => createInitialState(map)).toThrow('more than one point object "wake"');
  });

  it('survives a JSON round trip in the middle of a push (INV-1)', () => {
    const state = run(6); // the hit in step 1, five steps of the push
    expect(state.overview).toStrictEqual({ current: 2, max: 3 });
    expect(state.player.grace).toBe(85);
    expect(state.player.recoil.dx).toBeCloseTo(1.8, 3);
    expect(state.player.recoil.dy).toBeCloseTo(2.4, 3);
    expect(state.player.recoil.steps).toBe(3);
    expect(state.creatures[0]?.x).not.toBe(1018);
    expect(state.creatures[0]?.home).toStrictEqual({ x: 1018, y: 726 });
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('three hits, 90 steps apart, lead into the dark; it survives the round trip at step 30', () => {
    expect(run(90).overview.current).toBe(2);
    expect(run(91).overview.current).toBe(1);
    expect(run(180).dark).toBe(0);
    expect(run(181).dark).toBe(1);
    const state = run(210);
    expect(state.overview).toStrictEqual({ current: 0, max: 3 });
    expect(state.dark).toBe(30);
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('without a wake point the figure wakes at the spawn, the creature at its home', () => {
    const state = run(225); // 181 + 44: dark is 45
    expect(state.dark).toBe(45);
    expect([state.player.x, state.player.y]).toStrictEqual([1024, 734]);
    expect(state.overview).toStrictEqual({ current: 3, max: 3 });
    expect(state.creatures).toStrictEqual([
      { species: 'snippet', x: 1018, y: 726, light: 0, home: { x: 1018, y: 726 } },
    ]);
  });
});
```

  One test of 0008 in the same file must change, because its second snippet walks up to the
  figure with the lamp turned away and would now hit it. In "survives a JSON round trip with a
  frozen creature and a count of 1 (INV-1)" the second point becomes
  `point('snippet', 1024, 834)`, the legs become `[60, RIGHT_SHINE], [45, DOWN], [30, DOWN_SHINE]`
  with `const DOWN: GameInput = { ...NONE, down: true };`, the comment becomes "The second
  snippet rests 100 px below the spawn while the first is captured. Then the figure walks 60 px
  down; from its 28th step the snippet comes 2/3 px closer per step, 12 px in all. Then the
  figure holds the light on it for 30 steps, 28 px away.", and the expected `y` becomes
  `toBeCloseTo(822, 6)`. The other expectations stay: count 1, one creature, `light` 30, `x`
  1024. The arithmetic: the figure's y after step k is 734 + 4k/3; the distance drops below 64
  when y is above 770, in step 28; steps 28–45 are 18 moves of 2/3 px; apex (1024, 782), body
  (1024, 814), d = 32, s = 0.

  The arithmetic behind "90 steps apart": the hit in step 1 sets `grace` to 90; step k lowers
  it to 90 − (k − 1), so it is 0 in step 91. By then the push is long over and the creature
  rests 8 px from the feet, so it hits in step 91, and again in step 181, which takes the last
  point.

- [ ] **Step 2:** run `npx vitest run tests/unit/overview.test.ts tests/unit/state.test.ts`.
  Expected: the new tests fail — nothing hits, and two wake points are accepted.

- [ ] **Step 3: implement.** `src/game/update.ts` becomes:

```ts
import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { creaturesFrom, noCaptures, stepCreatures } from './creature';
import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
import { type GameInput, stepPlayer } from './player';
import { type GameState, NO_RECOIL, type PlayerState } from './state';

/**
 * The state before the first step: the player at the map's spawn, facing down, standing, not
 * pushed and not safe; the camera on it; the lamp off; one creature per named point of the map
 * (0008); overview full and the dark not running (0009). A map with two wake points is
 * rejected here, before the game starts.
 */
export function createInitialState(map: TileMap): GameState {
  wakePoint(map);
  const player: PlayerState = {
    x: map.spawn.x,
    y: map.spawn.y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
    grace: 0,
    recoil: NO_RECOIL,
  };
  return {
    tick: 0,
    player,
    camera: followPlayer(player, map),
    lamp: { on: false },
    creatures: creaturesFrom(map.points),
    captured: noCaptures(),
    overview: initialOverview(),
    dark: 0,
  };
}

/**
 * Advances the game by exactly one logic step and returns the new state; its arguments are not
 * mutated. In the dark the step is the dark sequence and nothing else (0009). Otherwise: the
 * lamp is on when the input holds it and the figure is not being pushed; the figure is stepped;
 * each creature is stepped against the stepped figure (0008); the first free creature within
 * reach of a figure that is not safe hits; the camera follows the figure.
 */
export function update(state: GameState, input: GameInput, content: TileMap): GameState {
  if (state.dark > 0) {
    return stepDark(state, content);
  }
  const lampOn = input.lamp && state.player.recoil.steps === 0;
  const stepped = stepPlayer(state.player, input, content);
  const { creatures, captured } = stepCreatures(
    state.creatures,
    state.captured,
    stepped,
    lampOn,
    content,
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
    lamp: { on: lampOn },
    creatures,
    captured,
    overview,
    dark,
  };
}
```

- [ ] **Step 4:** `npx biome check --write .`, then `npm run check`. Expected: green. An
  earlier test of 0008 that lets a creature reach the figure with the lamp off now sees a hit;
  if one fails for that reason, it compares a whole player or a whole state — give its
  expectation the hit's fields only after checking the numbers by the rules above, and say so in
  the commit body.

- [ ] **Step 5: commit** — `Give a step its order: lamp, figure, creatures, hit`; why: the
  rules of the three earlier tasks become the game's behaviour in one place, in the order the
  spec names.

---

### Task 6: The wake point on the campus

**Files:**
- Modify: `tools/campus-layout.ts`, `public/maps/campus.tmj` (generated)
- Test: `tests/unit/campus.test.ts`

**Interfaces — produces:** `export const WAKE: Point = { x: 792, y: 744 }`.

- [ ] **Step 1: the failing tests.** In `tests/unit/campus.test.ts` add `WAKE` to the import
  from `campus-layout.ts`; in "holds the three snippets of 0008, in order" the last expectation
  becomes

```ts
    expect(campus.points).toStrictEqual([
      ...SNIPPETS.map((feet) => ({ name: 'snippet', ...feet })),
      { name: 'wake', ...WAKE },
    ]);
```

  and add after it:

```ts
  it('holds the wake point of 0009 in front of the door of the data protection office', () => {
    expect(WAKE).toStrictEqual({ x: 792, y: 744 });
    // The box [786, 798) × [736, 744) lies in cell (49, 46), flush under the door (49, 45).
    expect([Math.floor(WAKE.x / 16), Math.floor((WAKE.y - 1) / 16)]).toStrictEqual([49, 46]);
    const office = BUILDINGS.find((building) => building.name.startsWith('data protection'));
    expect(office?.doors).toStrictEqual([{ x: 49, y: 45 }]);
    expect(campus.detail[cell(49, 45)]).toBe(DOOR);
    expect(campus.solid[cell(49, 46)]).toBe(false);
    expect(reachableFrom(campus, SPAWN_CELL)[cell(49, 46)]).toBe(true);
    expect(cameraFor({ x: WAKE.x, y: WAKE.y - 4 }, { width: 2048, height: 1536 })).toStrictEqual({
      x: 632,
      y: 650,
    });
  });
```

  The two tests that loop over `campus.points` ("every snippet's box is free …", "no snippet is
  in the first view …") now cover the wake point too and stay as they are: its box is free, its
  cell is reachable, it is 232 px from the spawn and left of the first view. If `BUILDINGS`
  types `doors` differently or the door is not on `detail`, read `tools/campus-layout.ts` and
  adapt the two lines; what must be proven is that cell (49, 45) is that office's door.

- [ ] **Step 2:** run `npx vitest run tests/unit/campus.test.ts`. Expected: `WAKE` is not
  exported.

- [ ] **Step 3: implement.** In `tools/campus-layout.ts`, after `SNIPPETS`:

```ts
/**
 * Where the figure wakes after losing overview (feature 0009), feet in pixels: the middle of
 * tile (49, 46), straight under the door of the data protection officer's office.
 */
export const WAKE: Point = { x: 792, y: 744 };
```

  In `campusJson` the objects become

```ts
          pointObject(1, 'spawn', SPAWN),
          ...SNIPPETS.map((feet, n) => pointObject(n + 2, 'snippet', feet)),
          pointObject(SNIPPETS.length + 2, 'wake', WAKE),
```

  and `nextobjectid` becomes `SNIPPETS.length + 3`. Extend the file's head comment: "the spawn,
  the creatures' points and the wake point".

- [ ] **Step 4:** `npm run gen-campus`, then again, then `git status`: only `campus.tmj`
  changed after the first run, nothing after the second. `npx biome check --write .`, `npm run
  check`. Expected: green.

- [ ] **Step 5: commit** — `Put the wake point in front of the data protection office`; why:
  `world.md` names the office as the place the figure wakes, and its interior arrives with M5.

---

### Task 7: The overview sheet

**Files:**
- Create: `tools/placeholder-overview.ts`, `public/sprites/overview.png` (generated)
- Modify: `tools/gen-sprites.ts`
- Test: `tests/unit/gen-sprites.test.ts`

**Interfaces — produces:** `OVERVIEW_FRAME_SIZE` 8, `OVERVIEW_FRAMES` 2, `OVERVIEW_SHEET_WIDTH`
16, `OVERVIEW_SHEET_HEIGHT` 8, `OVERVIEW_RIM`, `OVERVIEW_ON`, `OVERVIEW_OUT`,
`overviewInk(i, j)`, `renderOverview(): Uint8Array`, `encodeOverviewPng(): Buffer`.

- [ ] **Step 1: the failing tests.** In `tests/unit/gen-sprites.test.ts` add `encodeOverviewPng`
  to the import from `gen-sprites.ts`, import the names above from
  `../../tools/placeholder-overview.ts`, and append:

```ts
const OVERVIEW_FILE = join(ROOT, 'public/sprites/overview.png');
const OVERVIEW = renderOverview();

/** The colour of pixel (i, j) of frame `index` of the overview sheet, or null when transparent. */
function overviewPixel(index: number, i: number, j: number): string | null {
  const o = (j * OVERVIEW_SHEET_WIDTH + index * OVERVIEW_FRAME_SIZE + i) * 4;
  if (OVERVIEW[o + 3] !== 255) {
    return null;
  }
  return `#${[OVERVIEW[o], OVERVIEW[o + 1], OVERVIEW[o + 2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Frame `index` as 8 rows of 8 colours or nulls. */
function overviewFrame(index: number): (string | null)[][] {
  return Array.from({ length: OVERVIEW_FRAME_SIZE }, (_, j) =>
    Array.from({ length: OVERVIEW_FRAME_SIZE }, (_, i) => overviewPixel(index, i, j)),
  );
}

describe('the placeholder overview generator (0009)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeOverviewPng().equals(encodeOverviewPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(OVERVIEW_FILE));
    expect([committed.width, committed.height]).toStrictEqual([16, 8]);
    expect(Buffer.from(OVERVIEW).equals(committed.data)).toBe(true);
  });

  it('is 16x8: two 8x8 frames in one row', () => {
    expect([
      OVERVIEW_SHEET_WIDTH,
      OVERVIEW_SHEET_HEIGHT,
      OVERVIEW_FRAME_SIZE,
      OVERVIEW_FRAMES,
    ]).toStrictEqual([16, 8, 8, 2]);
    expect(OVERVIEW).toHaveLength(16 * 8 * 4);
  });

  it('has 32 opaque pixels per frame, 16 of them the rim', () => {
    expect([OVERVIEW_RIM, OVERVIEW_ON, OVERVIEW_OUT]).toStrictEqual([
      '#181425',
      '#fee761',
      '#3a4466',
    ]);
    for (let index = 0; index < OVERVIEW_FRAMES; index += 1) {
      const pixels = overviewFrame(index).flat();
      expect(
        pixels.filter((colour) => colour !== null),
        `frame ${index}`,
      ).toHaveLength(32);
      expect(
        pixels.filter((colour) => colour === OVERVIEW_RIM),
        `frame ${index}`,
      ).toHaveLength(16);
    }
  });

  it('draws frame 0 as the spec says: a disc with cut corners, a dark rim, yellow inside', () => {
    const R = OVERVIEW_RIM;
    const Y = OVERVIEW_ON;
    const N = null;
    expect(overviewFrame(0)).toStrictEqual([
      [N, N, N, N, N, N, N, N],
      [N, N, R, R, R, R, N, N],
      [N, R, Y, Y, Y, Y, R, N],
      [N, R, Y, Y, Y, Y, R, N],
      [N, R, Y, Y, Y, Y, R, N],
      [N, R, Y, Y, Y, Y, R, N],
      [N, N, R, R, R, R, N, N],
      [N, N, N, N, N, N, N, N],
    ]);
  });

  it('frame 1 is frame 0 with the light out', () => {
    const out = overviewFrame(0).map((row) =>
      row.map((colour) => (colour === OVERVIEW_ON ? OVERVIEW_OUT : colour)),
    );
    expect(overviewFrame(1)).toStrictEqual(out);
  });
});
```

- [ ] **Step 2:** run `npx vitest run tests/unit/gen-sprites.test.ts`. Expected: the import
  fails.

- [ ] **Step 3: `tools/placeholder-overview.ts`, new.**

```ts
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder overview sheet (feature 0009): a small light, two 8x8 frames in one row.
 * Frame 0 is the light that is on, frame 1 the light that is out. A disc of 32 pixels with a
 * dark rim, so that it reads on grass, path and roof alike. Pure — it returns pixels;
 * tools/gen-sprites.ts writes the file.
 */

export const OVERVIEW_FRAME_SIZE = 8;
export const OVERVIEW_FRAMES = 2;
export const OVERVIEW_SHEET_WIDTH = OVERVIEW_FRAMES * OVERVIEW_FRAME_SIZE;
export const OVERVIEW_SHEET_HEIGHT = OVERVIEW_FRAME_SIZE;
export const OVERVIEW_RIM: PaletteColour = '#181425';
export const OVERVIEW_ON: PaletteColour = '#fee761';
export const OVERVIEW_OUT: PaletteColour = '#3a4466';

/**
 * Pixel (i, j) of a frame: the disc is rows 1 and 6 in columns 2–5 and rows 2–5 in columns
 * 1–6; its rim is rows 1 and 6 and columns 1 and 6, the 4x4 inside is the glow.
 */
export function overviewInk(i: number, j: number): 'rim' | 'glow' | null {
  const inDisc =
    j === 1 || j === 6 ? i >= 2 && i <= 5 : j >= 2 && j <= 5 && i >= 1 && i <= 6;
  if (!inDisc) {
    return null;
  }
  return i === 1 || i === 6 || j === 1 || j === 6 ? 'rim' : 'glow';
}

/** RGBA, row-major, OVERVIEW_SHEET_WIDTH × OVERVIEW_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderOverview(): Uint8Array {
  const data = new Uint8Array(OVERVIEW_SHEET_WIDTH * OVERVIEW_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < OVERVIEW_FRAMES; frame += 1) {
    for (let j = 0; j < OVERVIEW_FRAME_SIZE; j += 1) {
      for (let i = 0; i < OVERVIEW_FRAME_SIZE; i += 1) {
        const ink = overviewInk(i, j);
        if (ink === null) {
          continue;
        }
        const glow = frame === 0 ? OVERVIEW_ON : OVERVIEW_OUT;
        data.set(
          [...rgb(ink === 'rim' ? OVERVIEW_RIM : glow), 255],
          (j * OVERVIEW_SHEET_WIDTH + frame * OVERVIEW_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
```

- [ ] **Step 4: `tools/gen-sprites.ts`.** Import `OVERVIEW_SHEET_HEIGHT`,
  `OVERVIEW_SHEET_WIDTH` and `renderOverview`; add

```ts
export function encodeOverviewPng(): Buffer {
  const png = new PNG({ width: OVERVIEW_SHEET_WIDTH, height: OVERVIEW_SHEET_HEIGHT });
  png.data = Buffer.from(renderOverview());
  return PNG.sync.write(png);
}
```

  write it in the `import.meta.main` block —
  `writeFileSync('public/sprites/overview.png', encodeOverviewPng());` — and name the fourth
  file in the head comment.

- [ ] **Step 5:** `npm run gen-sprites`, then again, then `git status`: only the new
  `overview.png` after the first run, nothing after the second. `npx biome check --write .`,
  `npm run check`. Expected: green; `tests/unit/assets.test.ts` checks the new file with every
  other PNG and needs no change.

- [ ] **Step 6: commit** — `Generate the overview sheet: a light on and a light out`; why: the
  display is pictures only, and a generated placeholder keeps the asset under test until the art
  pass replaces it.

---

### Task 8: Drawing the lights, the lids and the blink

**Files:**
- Modify: `src/render/draw-scene.ts`, `src/main.ts`
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces — consumes:** `DARK_STEPS` from `game/overview`; `SURFACE_WIDTH`, `SURFACE_HEIGHT`
from `render/renderer`. **Produces:** `SceneContent.overviewSheet`; `LIGHT_SIZE` 8,
`LIGHT_MARGIN` 4, `LIGHT_PITCH` 10, `BLINK_STEPS` 4, `LID_PX_PER_STEP` 3;
`playerVisible(player): boolean`; `lidHeight(dark): number`.

- [ ] **Step 1: the failing tests.** In `tests/unit/draw-scene.test.ts`: `CONTENT` gains
  `overviewSheet: { image: {} as ImageBitmap, frameWidth: 8, frameHeight: 8 }`; add `lidHeight`
  and `playerVisible` to the import from `draw-scene`; append:

```ts
describe('overview in the scene (0009)', () => {
  const scene = (fields: Partial<GameState>): GameState => ({
    ...state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }),
    ...fields,
  });
  const MAP_CALLS = [
    'clear #181425',
    'drawTile 0 at 0,0',
    'drawTile 1 at 16,0',
    'drawTile 2 at 0,16',
    'drawTile 2 at 16,16',
    'drawTile 2 at 32,16',
    'drawTile 4 at 16,16',
  ];

  it('draws one light per point of the maximum after above: on, on, out for 2 of 3', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene({ overview: { current: 2, max: 3 } }), CONTENT);
    expect(renderer.calls).toStrictEqual([
      ...MAP_CALLS,
      'drawSprite 13 at 12,7',
      'drawTile 6 at 0,0',
      'drawSprite 0 at 4,4',
      'drawSprite 0 at 14,4',
      'drawSprite 1 at 24,4',
    ]);
    expect(renderer.sheets).toStrictEqual([
      CONTENT.playerSheet,
      CONTENT.overviewSheet,
      CONTENT.overviewSheet,
      CONTENT.overviewSheet,
    ]);
  });

  it('does not shift the lights with the camera', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      { ...scene({ overview: { current: 1, max: 1 } }), camera: { x: 5, y: 7 } },
      CONTENT,
    );
    expect(renderer.calls.at(-1)).toBe('drawSprite 0 at 4,4');
  });

  it('draws no lid while the game runs', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene({ overview: { current: 3, max: 3 } }), CONTENT);
    expect(renderer.calls.filter((call) => call.startsWith('fillRect'))).toStrictEqual([]);
  });

  it('draws the two lids last, in the page colour', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene({ overview: { current: 0, max: 3 }, dark: 15 }), CONTENT);
    expect(renderer.calls.slice(-3)).toStrictEqual([
      'drawSprite 1 at 24,4',
      'fillRect 0,0 320x45 #181425',
      'fillRect 0,135 320x45 #181425',
    ]);
  });

  it('the lids close in 30 steps, stay closed for 30 and open in 30', () => {
    expect([0, 1, 15, 30, 45, 60, 75, 89].map(lidHeight)).toStrictEqual([
      0, 3, 45, 90, 90, 90, 45, 3,
    ]);
  });

  it('leaves the figure out in every second group of four steps while it is safe', () => {
    const visible = (grace: number): boolean => playerVisible(player({ grace }));
    expect([90, 88, 87, 84, 83, 4, 3, 0].map(visible)).toStrictEqual([
      true, true, false, false, true, false, true, true,
    ]);
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 20.4, y: 30.6, grace: 87 }), CONTENT);
    expect(renderer.calls).toStrictEqual([...MAP_CALLS, 'drawTile 6 at 0,0']);
  });

  it('still draws the cone while the figure blinks', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 20.4, y: 30.6, grace: 87 }, { x: 0, y: 0 }, true), CONTENT);
    expect(renderer.sheets).toStrictEqual([CONTENT.lampSheet]);
  });
});
```

  The blink numbers: ⌊90 / 4⌋ = 22, ⌊88 / 4⌋ = 22, ⌊87 / 4⌋ = 21, ⌊84 / 4⌋ = 21, ⌊83 / 4⌋ = 20,
  ⌊4 / 4⌋ = 1, ⌊3 / 4⌋ = 0; odd is left out.

- [ ] **Step 2:** run `npx vitest run tests/unit/draw-scene.test.ts`. Expected: the import
  fails.

- [ ] **Step 3: implement.** In `src/render/draw-scene.ts` import `DARK_STEPS` from
  `../game/overview` and `SURFACE_HEIGHT`, `SURFACE_WIDTH` from `./renderer` (values, beside
  the type imports). `SceneContent` gains

```ts
  /** Two 8x8 frames: a light that is on, a light that is out (0009). */
  readonly overviewSheet: SpriteSheet;
```

  Add before `drawScene`:

```ts
/** The lights of overview (0009): 8x8, 4 px from the corner, one every 10 px. */
export const LIGHT_SIZE = 8;
export const LIGHT_MARGIN = 4;
export const LIGHT_PITCH = 10;
const LIGHT_ON_FRAME = 0;
const LIGHT_OUT_FRAME = 1;

/** A safe figure is left out in every second group of four steps. */
export const BLINK_STEPS = 4;

export function playerVisible(player: PlayerState): boolean {
  return Math.floor(player.grace / BLINK_STEPS) % 2 === 0;
}

/** The lids move 3 px per step: closed, 90 px each, from step 30 to step 60 of the dark. */
export const LID_PX_PER_STEP = 3;
const LID_CLOSED = SURFACE_HEIGHT / 2;

/** The height of each lid at step `dark`: 3d closing, 90 closed, 3 × (90 − d) opening; 0 at 0. */
export function lidHeight(dark: number): number {
  return Math.min(LID_PX_PER_STEP * Math.min(dark, DARK_STEPS - dark), LID_CLOSED);
}
```

  In `drawScene` wrap the player's `drawSprite` in `if (playerVisible(player)) { … }`, and after
  the `above` layer add:

```ts
  for (let i = 0; i < state.overview.max; i += 1) {
    renderer.drawSprite(
      content.overviewSheet,
      i < state.overview.current ? LIGHT_ON_FRAME : LIGHT_OUT_FRAME,
      LIGHT_MARGIN + i * LIGHT_PITCH,
      LIGHT_MARGIN,
    );
  }
  const lid = lidHeight(state.dark);
  if (lid > 0) {
    renderer.fillRect(0, 0, SURFACE_WIDTH, lid, PAGE_BACKGROUND);
    renderer.fillRect(0, SURFACE_HEIGHT - lid, SURFACE_WIDTH, lid, PAGE_BACKGROUND);
  }
```

  Extend the doc comment of `drawScene`: after `above` come the lights, on the surface and not
  shifted by the camera, and the two lids of the dark; a safe figure blinks.

  `lidHeight(0)` is `min(3 × min(0, 90), 90)` = 0, so the state `dark` 0 draws nothing.

- [ ] **Step 4: `src/main.ts`.** Add `const OVERVIEW_SHEET_URL = '/sprites/overview.png';`,
  import `LIGHT_SIZE` from `./render/draw-scene`, and in `loadContent` return also

```ts
    overviewSheet: {
      image: await loadImage(OVERVIEW_SHEET_URL),
      frameWidth: LIGHT_SIZE,
      frameHeight: LIGHT_SIZE,
    },
```

  Name the sheet in the doc comment of `loadContent`.

- [ ] **Step 5:** `npx biome check --write .`, then `npm run check`. Expected: green. Then
  start `npm run dev`, open `http://localhost:5173` in the app's browser pane and look once:
  three yellow lights in the top-left corner, the top-left pixel still grass. This is a look at
  the picture, not the walk; do not play the plan's steps.

- [ ] **Step 6: commit** — `Draw the lights, the closing screen and the blink`; why: the state
  of the earlier tasks becomes visible, with rectangles and sprites in palette colours only.

---

### Task 9: The smoke spec

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1:** add after the test of the three snippets:

```ts
test('the game starts with full overview and outside the dark', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.overview), {
      message: 'window.shadowAi.state.overview is three of three',
    })
    .toStrictEqual({ current: 3, max: 3 });
  expect(await page.evaluate(() => window.shadowAi?.state.dark)).toBe(0);
});
```

  The test of the top-left pixel stays as it is: the first light's opaque pixels start at
  surface (5, 5), and pixel (0, 0) is still grass.

- [ ] **Step 2:** `npm run test:e2e`. Expected: green, the creature test with its `home`
  included (Task 1). Then the container: `docker build -t shadow-ai .`, `docker run --rm -d -p
  8080:8080 --name shadow-ai-smoke shadow-ai`, `BASE_URL=http://localhost:8080 npm run
  test:e2e`, `docker stop shadow-ai-smoke`. Expected: green.

- [ ] **Step 3: commit** — `Read overview in the smoke test`; why: the built game, in the
  browser and in the container, starts with the state the spec names.

---

### Task 10: Specification and README

**Files:**
- Modify: `docs/spec/architecture.md`, `docs/spec/gameplay.md`, `docs/spec/visual.md`,
  `docs/spec/world.md`, `docs/spec/testing.md`, `README.md`

Write each change in the document's own plain style; the content is fixed here, the wording may
follow the surrounding text.

- [ ] `architecture.md` §1: in the tree under `tools/`, after `placeholder-snippet.ts`, add
  `placeholder-overview.ts` — "the placeholder overview sheet as pure data: two 8x8 frames"; the
  `gen-sprites.ts` line now writes "the figure, the lamp, the snippet and the overview sheet";
  the `campus-layout.ts` line gains "and the wake point".
- [ ] `architecture.md` §2: the opening list becomes "`tick`, the player, the camera, the lamp,
  the creatures, the captured count, overview and the step of the dark". The player paragraph:
  the player is `{ x, y, facing, frame, frameTimer, grace, recoil }`; `grace` counts the steps
  it is still safe from a hit, 0–90; `recoil` is `{ dx, dy, steps }`, the push per step and the
  steps it still lasts, all 0 when there is none. The creature paragraph: a creature also
  carries `home`, the point it was made from. Add a paragraph on overview (feature 0009):
  `overview` is `{ current, max }`, 3 of 3 at the start; `dark` is 0 while the game runs. The
  order of a step in `update`: the lamp is on when the input holds it and the figure is not
  being pushed; the figure is stepped — `grace` drops by 1, and a pushed figure moves by its
  push through `moveBox` and the clamp, 3 px per step for 8 steps, without reading the keys; the
  creatures are stepped; then the first free creature within 10 px of a figure whose `grace` is
  0 hits (`game/overview`): one point less, `grace` 90 and a push straight away from it — or,
  with the last point, `dark` 1. With `dark` above 0 a step is `stepDark` and nothing else:
  `dark` and `tick` grow, the lamp is off; in the step `dark` becomes 45 the figure stands on
  the wake point facing down, overview is full and every creature is at its home with `light` 0;
  in the step it would become 90 it is 0. The wake point is the map's point named `wake`, the
  spawn when there is none; two stop the game at the start.
- [ ] `architecture.md` §5: the draw order becomes "clear, then `ground`, `detail`, the lamp's
  cone when the lamp is on, the creatures in array order, the player, `above`, the lights of
  overview, the lids of the dark". Add: light i has its top-left corner at (4 + 10i, 4) on the
  surface, not shifted by the camera, for i below `max`; frame 0 when i is below `current`, else
  frame 1. With `dark` = d above 0 two rectangles in `#181425` are drawn last, (0, 0, 320, L)
  and (0, 180 − L, 320, L), with L = min(3 × min(d, 90 − d), 90). While `grace` is above 0 the
  player's sprite is left out in every frame in which ⌊grace / 4⌋ is odd. The sentence "later
  … rectangles for UI" in the first paragraph: rectangles are used from 0009 on.
- [ ] `architecture.md` §6: where the named points are described, add: the game knows the
  species' names and `wake` (feature 0009).
- [ ] `architecture.md` §7: after the snippet paragraph, one on `tools/placeholder-overview.ts`:
  `public/sprites/overview.png`, 16x8, two 8x8 frames — a disc of 32 pixels with a rim in
  `#181425`, inside `#fee761` for the light that is on and `#3a4466` for the light that is out;
  committed, deterministic, tested against the generator; replaced by the art pass under the
  same name and frame order. In the campus paragraph: the layout also holds the wake point, and
  the campus test proves its box free, its cell reachable and the cell above it the door of the
  data protection officer's office.
- [ ] `gameplay.md` §2: in the "As built (feature 0007)" paragraph, after "Space holds the
  lamp; there is no toggle.", add: "A figure that is being pushed cannot hold it (0009)."
- [ ] `gameplay.md` §3, item 1: replace "Its touch costs nothing until overview exists (0009)."
  by "Free and within 10 px of the figure's feet it takes one point of overview (§4); frozen in
  the light it takes nothing."
- [ ] `gameplay.md` §4: after the existing paragraph add "**As built** (feature 0009)": the
  figure starts with three points, shown as three lights in the top-left corner. A hit takes
  one, pushes the figure a tile and a half straight away from the creature — a wall holds the
  push — and leaves it safe for a second and a half, blinking; all three numbers *tune*. A
  frozen creature never hits: the lamp is the defence. At zero the screen closes like an eye
  and opens again a second and a half later: the figure stands in front of the data protection
  officer's office with full overview, the creatures still in the world are back at their
  places, and what was captured stays captured. **Open:** how overview is won back without
  falling into the dark — a conversation, a place, a find — is decided when there are figures
  to talk to and rooms to enter (M4, M5). The maximum grows with the first solved case (M5).
- [ ] `visual.md`: at the end of §3 add a paragraph "**The display.**" — the only thing drawn
  over the world is the row of overview lights in the top-left corner (feature 0009): 8x8, 4 px
  from the corner, one every 10 px, one per point of the maximum; no text. The screen of the
  dark is two rectangles in `#181425` that close from the top and the bottom; nothing is
  blended, so no pixel leaves the palette.
- [ ] `world.md` §1, Courtyard row or the paragraph under the table: add that until the office
  has an interior (M5) the figure wakes in front of its door, at the map's `wake` point, tile
  (49, 46) (feature 0009).
- [ ] `testing.md` §1, Unit row: in "game rules (…)" add "the hit: reach, the frozen creature,
  array order, grace, the push and its direction, the last point; the dark: the sequence step by
  step, the wake point and its fallback and rejection; overview, grace and the push in the
  state"; the campus "and its wake point: a free box, a reachable cell, the door above it"; the
  draw order "the lights, the lids and the blink"; the sprite generators "the overview sheet
  pixel by pixel". Smoke row: after the snippets sentence add "; overview is three of three and
  the dark is not running".
- [ ] `testing.md` §2: INV-1 row — add "one in the middle of a push and one at step 30 of the
  dark".
- [ ] `README.md`: status — after the sentence on the first creature add "A snippet's touch
  costs one of three points of overview and pushes the figure back; at zero the figure wakes in
  front of the data protection officer's office (feature 0009)." Run block: `npm run
  gen-sprites` regenerates "the placeholder figure, the lamp sheet, the snippet sheet and the
  overview sheet"; `npm run gen-campus` the campus "with its creatures and the wake point".
- [ ] `npm run check` (the documents are linted with the rest); commit — `Record overview as
  built`; why: what is durable about the feature moves into `docs/spec/`, and the feature spec
  stays as history.

---

### Task 11: The acceptance walk (`CLAUDE.md` §3.4)

The implementation is complete when Tasks 1–10 are committed, `npm run check` and `npm run
test:e2e` are green, the container builds and passes the smoke spec, and the documents are
updated. First merge `main` (`git fetch origin && git merge origin/main`) and rerun the checks
if it brought anything. Then the walk, by `docs/spec/testing.md` §5 — the agent guides, the
author judges:

- [ ] **Set-up.** Start `npm run dev` and state the preconditions in one message: the URL
  `http://localhost:5173`, Chrome at 1920x1080 at 100 % zoom, window not maximized, the
  developer console open beside the game, the figure at the spawn in the courtyard, a terminal
  in the repository root on the branch. Wait until the author says they are ready.
- [ ] **One step per message.** Name the next action step together with its expected step, in
  the spec's numbering and words — steps 1–23 of the spec's acceptance plan; step 10 and step 11
  are two expected steps after the action of step 9, name them together — and nothing more: no
  hint at what a failure would look like, no summary of the steps to come. Wait for `pass` or
  `fail`, with the author's note if there is one, and record it as given. Never answer a step
  yourself, never skip one, never take silence or a general remark as a pass.
- [ ] **Fail ends the walk.** Record "step n failed" with the author's words and stop. Fix the
  branch — or ask, when the fix needs a decision the spec or this plan does not make — rerun
  `npm run check` and `npm run test:e2e`, and start the walk again at step 1. Record the failed
  walk in the fix's commit message, not in the spec.
- [ ] **Feel last.** After step 23 ask the spec's eight feel questions, one per message, and
  record the answers with their numbers and notes. A feel note is not a failure: a number the
  author would change becomes a new draft, not a change on this branch.
- [ ] **The record.** Write `passed YYYY-MM-DD, steps 1–23` and the feel notes into the spec's
  `Result` line in `docs/features/0009-overview.md`, and commit on the branch — `Record the
  walk of 0009`.

---

### Task 12: The pull request (`CLAUDE.md` §3.5)

- [ ] Merge `main` once more: `git fetch origin && git merge origin/main`. Rerun `npm run
  check`, `npm run test:e2e`, then `docker build -t shadow-ai .`, `docker run --rm -p 8080:8080
  shadow-ai` and `BASE_URL=http://localhost:8080 npm run test:e2e`. If the merge changed code —
  anything under `src/`, `public/`, `tools/` or `tests/` — the walk is run again (Task 11)
  before going on.
- [ ] Set `Status: implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md` only if the author wants it in this pull request, as 0008 did;
  otherwise it follows on `main` after the merge. Ask.
- [ ] Push `feature/0009-overview`; open the pull request against `main` with the walk's result
  from the spec's `Result` line, the feel notes, "no new dependency", and the attribution line.
  Bind the pull request with the app's PR tools and read CI: both smoke runs, dev server and
  container, must be green.
- [ ] Hand back to the author. The author merges; the merge closes the feature.

## Self-review against the spec

- Scope "In": `GameState.overview` and `.dark` → T1; `game/overview.ts` with the seven constants
  → T1, the hit → T3, the dark → T4; `grace`, `recoil`, `home` → T1, their rules → T2, T4; the
  hit in the game → T5; the wake point → T4 (`wakePoint`), T6 (campus); the display and
  `overview.png` → T7, T8; `placeholder-overview.ts` and `gen-sprites` → T7; `draw-scene` → T8;
  the documents → T10. Scope "Out": nothing here grows the maximum, gives overview back, adds an
  interior, a capture sign, a sound, text, a darker screen, a pause or a second map.
- Behaviour "The state" → T1. "One step" → T5 `update`, in the spec's order; the lamp off
  during a push → T5 test "the push ignores the keys". "The hit" → T3 `applyHit`, `recoilFrom`,
  T5 the 90-step test. "The push" → T2. "The dark" → T4 `stepDark`, T5 the end-to-end test; the
  wake point and its two rules → T4, T5 (`createInitialState`). "The campus" → T6. "The lights"
  → T7 the sheet, T8 the row. "Drawing" → T8: order, blink, lids.
- Acceptance criteria: 1 → T1, T8, T9, walk step 2; 2 → T3, T5, walk step 4; 3 → T2, T5, walk
  steps 4 and 17; 4 → T5 the 90-step test, T8 the blink, walk step 6; 5 → T3, T5, walk step 8;
  6 → T4, T5, T8 `lidHeight`, walk step 10; 7 → T4, T5, walk steps 11–15; 8 → T2–T5; 9 → T4,
  T5; 10 → T6; 11 → T6 step 4, T7 step 5, walk steps 20–23; 12 → T5 state tests; 13 → T9;
  14 → T12.
- Test plan: `overview.test.ts` → T3, T4, T5; the wall and the push step by step →
  `player.test.ts` T2 (decision 2 below); `creature.test.ts` → T1, T4; `state.test.ts` → T1, T5;
  `campus.test.ts` → T6; `draw-scene.test.ts` → T8; `gen-sprites.test.ts` → T7;
  `assets.test.ts` and `tests/arch/` untouched; the smoke spec → T1, T9; no new fixture files.
- Names used across tasks: `Recoil`, `NO_RECOIL`, `Overview`, `INITIAL_OVERVIEW`,
  `HIT_DISTANCE`, `GRACE_STEPS`, `RECOIL_STEPS`, `RECOIL_PX_PER_STEP`, `DARK_STEPS`,
  `WAKE_STEP`, `initialOverview`, `hittingCreature`, `recoilFrom`, `HitResult`, `applyHit`,
  `WAKE_POINT`, `wakePoint`, `stepDark`, `WAKE`, `OVERVIEW_FRAME_SIZE`, `OVERVIEW_FRAMES`,
  `OVERVIEW_SHEET_WIDTH`, `OVERVIEW_SHEET_HEIGHT`, `OVERVIEW_RIM`, `OVERVIEW_ON`,
  `OVERVIEW_OUT`, `overviewInk`, `renderOverview`, `encodeOverviewPng`,
  `SceneContent.overviewSheet`, `LIGHT_SIZE`, `LIGHT_MARGIN`, `LIGHT_PITCH`, `BLINK_STEPS`,
  `LID_PX_PER_STEP`, `playerVisible`, `lidHeight` — each defined once above and used with the
  same signature.

## Decisions by the planning session

Readings the spec leaves to the implementation, decided on 2026-11-13 so that the work does not
stop. None changes what the author sees in the walk.

1. **Grace and the push live in `game/player`,** the hit and the dark in `game/overview`. The
   spec names `overview.ts` for "the hit rule and the dark sequence"; the push is the figure's
   movement and shares `moveBox` and the clamp with walking.
2. **The push is tested in `player.test.ts`,** step by step and against a wall; `overview.test.ts`
   tests it once more through `update`. The spec lists both under `overview.test.ts`.
3. **`hittingCreature` checks the grace itself.** `update` then has no condition of its own.
4. **`NO_RECOIL` is one shared constant** in `game/state`. It is plain data and never mutated.
5. **The spec's test "a creature kept at D = 9"** is realized by a creature that follows the
   pushed figure and rests at its feet; it is within reach when the grace ends, which is what
   the test must show.
6. **`stepDark` takes no input.** The keys cannot do anything in the dark if the function never
   sees them.
7. **`createInitialState` calls `wakePoint` once and drops the result.** That is the check
   "before the game starts".
8. **The old draw tests keep their call lists** through a maximum of 0 in their helper.
9. **`lidHeight` is one formula,** min(3 × min(d, 90 − d), 90); it gives the spec's three
   ranges and 0 for `dark` 0.
10. **The smoke spec's creature literal changes in Task 1,** so the spec stays green from the
    first commit; the new smoke test comes in Task 9.

## Questions for the author

None.
