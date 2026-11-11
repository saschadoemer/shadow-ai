# 0007 — Implementation plan: the lamp

**Spec:** [`docs/features/0007-the-lamp.md`](../features/0007-the-lamp.md) (approved
2026-11-11). The plan argues from the spec; where they differ, the spec wins. Read the spec
first, then `CLAUDE.md`, then `docs/spec/architecture.md` §1, §2, §4, §5 and §7,
`docs/spec/testing.md` §1–§3 and §5, `docs/spec/gameplay.md` §2 and `docs/spec/visual.md` §4
and §5. **Written:** 2026-11-11 on the planning model. A working document, not specification:
once the feature is implemented, what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. Every
expected number below was checked on 2026-11-11 against a simulation of the spec's cone rule
and against the real `stepPlayer`; if a test disagrees with its number, the implementation is
wrong, not the number — read the spec's "Behaviour" again before touching the test. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Goal:** holding Space shows a cone of light in front of the figure and the direction keys
sweep it: `inCone` in `src/game/lamp.ts`, the lamp in `GameState` and in the input, the figure
standing and turning while the lamp is on, a generated `public/sprites/lamp.png` of four 48x48
frames, the cone drawn under the figure, and the smoke spec holding Space.

**Approach:** the cone's math first, then the lamp in the input, the player and the state, then
the sheet, then the drawing, then the smoke spec, then the paperwork, then the walk and the pull
request. Each task leaves `npm run check` green and the game running. The cone's picture is
generated from the same predicate the logic tests with, and a unit test re-derives every pixel
from that predicate, so the sheet cannot drift from the rule.

## Global constraints

- No new dependency, runtime or development.
- `src/game/` touches no browser (INV-2). `tests/arch/` scans the source text of `src/game/`,
  comments included, for the words `window`, `document`, `HTMLCanvasElement`, `Image` and
  `fetch` as whole words, case-sensitive. The new `src/game/lamp.ts` says "sprite sheet" and
  "picture", never "Image" with a capital I.
- `src/game/` imports from `src/engine/` and nothing else of the project; `src/render/` may
  import the constants and types of `src/game/` (`architecture.md` §1): `draw-scene.ts` reads
  `FRAME_APEX` and `LAMP_HEIGHT` from `game/lamp`. `tools/` imports from `src/` as the figure
  generator does.
- `GameState` stays plain data (INV-1): the lamp is `{ on: boolean }`. The round-trip test in
  `tests/unit/state.test.ts` keeps proving it, now with the lamp on.
- No module cycle in `src/game/` with a value import. `GameInput` lives in `player.ts` beside
  `MovementInput`, so `update.ts` imports it from where it already imports `stepPlayer`.
- No literal text a player can read (INV-4): nothing in this feature shows text.
- INV-6 on the new sheet: one palette colour, alpha 0 or 255, never `#68386c`. The asset test
  already walks every PNG under `public/`; a new `it` proves the lamp sheet is among them.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on, `verbatimModuleSyntax` forces `import type`. `npm run
  lint` is `biome check .`; `npx biome check --write .` sorts imports and formats.
- `npm run check` is typecheck, Biome, build, Vitest, in that order. `npm run test:e2e` runs the
  smoke spec against the dev server, which Playwright starts; with `BASE_URL` set it runs against
  that URL and starts nothing.
- Branch `feature/0007-the-lamp`, this worktree; it carries the spec, its approval and this
  plan. Commit messages: imperative subject, a body with the why, and the `Co-Authored-By`
  trailer the session's own attribution reminder names. Commits are signed through 1Password,
  which fails inside the Bash sandbox: run `git commit` with the sandbox disabled.
- Vitest's `toStrictEqual` and `toEqual` distinguish +0 from −0. Every constant that may be zero
  is written as a literal, never as a negation of another constant (see "Design notes").

## Design notes

- **One sector test for four facings.** `inCone(point, cone)` projects the point's offset from
  the apex onto the facing's unit vector — `along = dx·ux + dy·uy` — and onto its normal —
  `aside = |dx·uy − dy·ux|` — and holds when `0 ≤ along < 48` and `aside ≤ along / 2`. For
  facing right that is `dx ∈ [0, 48)` and `|dy| ≤ dx / 2`, for facing down `dy ∈ [0, 48)` and
  `|dx| ≤ dy / 2`; the formula does the mirroring. The apex is in (0 ≤ 0, 0 ≤ 0); a point
  beside it is out (0.5 > 0); a point at exactly 48 is out, half-open like the collision
  intervals.
- **The apex pixels are literals in `game/lamp.ts`.** The spec puts "the constants the renderer
  places the cone with" there. `FRAME_APEX` is the spec's table — down (24, 0), up (24, 47),
  left (47, 24), right (0, 24) — written as numbers, not derived by negating a box origin: a
  derived `-0` would fail `toStrictEqual({ x: 0 })`. The renderer subtracts the apex pixel from
  the rounded apex; the generator draws the cone from it; `tests/unit/lamp.test.ts` pins the
  four values.
- **The lamp state is derived, like the camera.** `update` sets `lamp: { on: input.lamp }`
  every step. It is in the state so the renderer, which reads state only, knows what to draw,
  and so a saved game comes back as it was left. Nothing else reads it in this feature.
- **`stepPlayer` returns early with the lamp on.** `{ ...player, facing, frame: 0, frameTimer:
  0 }` with `facing = facingOf(movementVector(input), player.facing)`: the feet stay, so no
  collision or clamp is needed — the position was valid after the last step and did not change.
  The step after the release is an ordinary step: from phase 0 the walk cycle rule of 0004
  gives phase 1, timer 0, and the figure moves 1.333 px.
- **`GameInput extends MovementInput`.** `movementVector` keeps taking a `MovementInput`;
  `stepPlayer` and `update` take a `GameInput`; `main.ts` builds one from five actions. The
  loop is generic over the input type and does not change.
- **A sprite sheet carries its own frame size.** `SpriteSheet` gains `frameWidth` and
  `frameHeight`; the Canvas 2D `drawSprite` reads the source rectangle from them and drops its
  import of `engine/sprite`. `engine/sprite` keeps `FRAME_WIDTH` 16 and `FRAME_HEIGHT` 24 as
  the figure's frame size; `main.ts` passes them when it builds the player sheet, and
  `CONE_LENGTH` twice for the lamp sheet.
- **The checkerboard is in frame coordinates.** Pixel (i, j) of a frame is lit when it is in the
  cone from the frame's apex pixel and `i + j` is even. Per frame 1152 pixels lie in the cone and
  exactly 576 are lit: column pairs (2k, 2k + 1) of the right-facing frame hold 2k + 1 lit pixels
  each, and Σ (2k + 1) for k = 0…23 is 24² = 576; the other three frames are the same cone turned
  or mirrored, and the parity flip of a mirror swaps which column of a pair holds k + 1, not the
  sum. The simulation on 2026-11-11 confirmed 1152 and 576 for all four frames and that no
  integer point of the cone falls outside its 48x48 box.
- **The generator imports the rule; the test re-derives it.** `tools/placeholder-lamp.ts` calls
  `inCone` with the frame's apex; `tests/unit/gen-sprites.test.ts` computes the expected alpha
  of every pixel from `inCone` and the parity itself and compares it with the generated bytes,
  then with the committed file. If someone edits the generator's loop, the test says which pixel.
- **The cone is drawn between `detail` and the player.** `drawScene` reads `state.lamp.on` and
  draws one sprite from `content.lampSheet` at `lampFrameOrigin(player, camera)` with frame
  `FACINGS.indexOf(facing)`. The origin is `(round(x) − apex.x − camera.x, round(y) − 12 −
  apex.y − camera.y)`: the same `round(x)` and `round(y)` the figure's sprite uses, so cone and
  figure agree pixel for pixel. At the spawn, feet (1024, 734) and camera (864, 640), the
  down-facing frame lands at screen (136, 82) with its apex at (160, 82), the figure's chest row.
- **The smoke spec holds Space with Playwright's `keyboard.down('Space')`.** The key name
  `Space` maps to `KeyboardEvent.code` `Space`, the code `main.ts` binds. The figure's `x` is
  asserted exactly, 1024, because nothing moves while the lamp is on.
- **The walk is the author's.** Since PR #12 the acceptance walk is guided one step per message
  and ends in the spec's `Result` line before any pull request (`docs/spec/testing.md` §5). The
  scripted acceptance run of the 0006 plan is history; do not repeat it.

## File map

| File | Responsibility |
|---|---|
| `src/game/lamp.ts` | `CONE_LENGTH`, `LAMP_HEIGHT`, `Cone`, `DIRECTIONS`, `FRAME_APEX`, `lampCone(player)`, `inCone(point, cone)` (new) |
| `src/game/player.ts` | `GameInput`; `stepPlayer` stands and turns while `input.lamp` |
| `src/game/state.ts` | `LampState`, `GameState.lamp` |
| `src/game/update.ts` | `createInitialState` starts the lamp off; `update` sets `lamp` from the input, takes a `GameInput` |
| `src/main.ts` | `lamp` ← Space in the binding table; `readInput` returns five actions; loads `/sprites/lamp.png`; builds both sheets with their frame size |
| `src/render/renderer.ts` | `SpriteSheet.frameWidth`, `.frameHeight`; `drawSprite` documented for any frame size |
| `src/render/canvas2d/canvas2d-renderer.ts` | `drawSprite` reads the frame size from the sheet |
| `src/engine/sprite.ts` | comment: the figure's frame size, one sheet among others |
| `src/render/draw-scene.ts` | `SceneContent.lampSheet`, `lampFrame(player)`, `lampFrameOrigin(player, camera)`; the cone in the draw order |
| `tools/placeholder-lamp.ts` | `LAMP_COLOUR`, `LAMP_FRAME_SIZE`, `LAMP_SHEET_WIDTH`, `LAMP_SHEET_HEIGHT`, `isLit(facing, i, j)`, `renderLamp()` (new) |
| `tools/gen-sprites.ts` | `encodeLampPng()`; writes `public/sprites/lamp.png` beside `player.png` |
| `public/sprites/lamp.png` | the generated lamp sheet, 192x48, committed (new) |
| `tests/unit/lamp.test.ts` | `lampCone`, `inCone` per facing, the constants (new) |
| `tests/unit/player.test.ts` | holding the lamp: standing, turning, the reset, the resumed walk |
| `tests/unit/state.test.ts` | the lamp in the state; the round trip with the lamp on |
| `tests/unit/input.test.ts` | `resolveActions` with `lamp` ← Space |
| `tests/unit/draw-scene.test.ts` | the cone in the draw order, `lampFrameOrigin` per facing, `lampFrame` |
| `tests/unit/gen-sprites.test.ts` | the lamp sheet: determinism, the committed file, every pixel against `inCone`, 576 per frame |
| `tests/unit/assets.test.ts` | the lamp sheet is among the PNGs the palette test walks |
| `tests/e2e/smoke.spec.ts` | a held Space turns the lamp on and holds the figure |
| `docs/spec/architecture.md` | §1, §2, §4, §5, §7 |
| `docs/spec/gameplay.md` | §2 the lamp as built, §8 the keys |
| `docs/spec/testing.md` | §1, §2 |
| `README.md` | status, the `gen-sprites` line |
| `docs/features/0007-the-lamp.md` | the `Result` line after the walk |

---

### Task 1: The cone

**Files:**
- Create: `src/game/lamp.ts`, `tests/unit/lamp.test.ts`

**Interfaces — produces:**

```ts
// src/game/lamp.ts
import type { Point } from '../engine/tiled';
import type { Facing, PlayerState } from './state';

/**
 * The lamp's cone of light (gameplay.md §2, feature 0007): a sector from an apex at chest
 * height in the facing's direction, CONE_LENGTH long, opening with slope 1/2 to each side so it
 * is as wide at its end as it is long. `inCone` is the one test the game makes on it; 0008
 * freezes a creature whose point passes it. Pure data and pure functions: the renderer draws the
 * same cone from a sprite sheet whose frames hold it (FRAME_APEX), the generator draws that sheet
 * from `inCone`.
 */

/** Tune: 48 px is three tiles. Half-open: a point at exactly 48 is outside. */
export const CONE_LENGTH = 48;
/** The lamp is held at chest height: the apex is this many pixels above the feet. */
export const LAMP_HEIGHT = 12;

export interface Cone {
  /** Map pixels, floating point like the feet. */
  readonly apex: Point;
  readonly facing: Facing;
}

/** The unit vector of each facing. */
export const DIRECTIONS: Readonly<Record<Facing, Point>> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Where the apex sits in a CONE_LENGTH × CONE_LENGTH frame of the lamp sheet, per facing, as
 * (column, row): the middle of the edge the cone opens from. The renderer places a frame by
 * subtracting this from the apex; the generator draws the cone from it. Literals, so that no
 * value is a negated zero.
 */
export const FRAME_APEX: Readonly<Record<Facing, Point>> = {
  down: { x: 24, y: 0 },
  up: { x: 24, y: 47 },
  left: { x: 47, y: 24 },
  right: { x: 0, y: 24 },
};

/** The cone the figure's lamp casts: the apex LAMP_HEIGHT above the feet, in the facing. */
export function lampCone(player: PlayerState): Cone {
  return { apex: { x: player.x, y: player.y - LAMP_HEIGHT }, facing: player.facing };
}

/**
 * Whether a point lies in the cone: with d its distance from the apex along the direction and
 * s its distance from the axis, 0 ≤ d < CONE_LENGTH and |s| ≤ d / 2. The apex is in; a point
 * beside it or behind it is not.
 */
export function inCone(point: Point, cone: Cone): boolean {
  const direction = DIRECTIONS[cone.facing];
  const dx = point.x - cone.apex.x;
  const dy = point.y - cone.apex.y;
  const along = dx * direction.x + dy * direction.y;
  const aside = Math.abs(dx * direction.y - dy * direction.x);
  return along >= 0 && along < CONE_LENGTH && aside <= along / 2;
}
```

- [ ] **Step 0: start from the latest `main`** (`CLAUDE.md` §4): `git fetch origin && git merge
  origin/main`. The branch was cut from `main`'s tip on 2026-11-11, so this is a no-op unless
  `main` moved; a conflict is resolved here, never on `main`. Run `npm ci` if `package-lock.json`
  changed, then `npm run check` to see the starting point green.
- [ ] **Step 1: write the failing tests** `tests/unit/lamp.test.ts`, the spec's test plan one
  `it` per clause, the four facings through `describe.each`:

```ts
import { describe, expect, it } from 'vitest';
import type { Point } from '../../src/engine/tiled';
import {
  type Cone,
  CONE_LENGTH,
  DIRECTIONS,
  FRAME_APEX,
  inCone,
  LAMP_HEIGHT,
  lampCone,
} from '../../src/game/lamp';
import { FACINGS, type Facing, type PlayerState } from '../../src/game/state';

const APEX: Point = { x: 100, y: 100 };

/** The point `along` pixels from the apex in the facing's direction and `aside` pixels to its side. */
function at(facing: Facing, along: number, aside: number): Point {
  const d = DIRECTIONS[facing];
  return { x: APEX.x + d.x * along - d.y * aside, y: APEX.y + d.y * along + d.x * aside };
}

describe('lampCone', () => {
  it('puts the apex 12 px above the feet, in the facing', () => {
    const player: PlayerState = { x: 20.4, y: 30.6, facing: 'left', frame: 0, frameTimer: 0 };
    expect(lampCone(player)).toStrictEqual({ apex: { x: 20.4, y: 18.6 }, facing: 'left' });
    expect(LAMP_HEIGHT).toBe(12);
  });
});

describe.each(FACINGS)('inCone, facing %s', (facing) => {
  const cone: Cone = { apex: APEX, facing };
  const inside = (along: number, aside: number): boolean => inCone(at(facing, along, aside), cone);

  it('holds the apex', () => {
    expect(inCone(APEX, cone)).toBe(true);
  });

  it('is 48 px long, half-open: 47.99 on the axis is in, 48 is out', () => {
    expect(CONE_LENGTH).toBe(48);
    expect(inside(47.99, 0)).toBe(true);
    expect(inside(48, 0)).toBe(false);
  });

  it('opens with slope 1/2 to each side: at d = 40, s = ±20 is in and ±20.01 is out', () => {
    expect(inside(40, 20)).toBe(true);
    expect(inside(40, -20)).toBe(true);
    expect(inside(40, 20.01)).toBe(false);
    expect(inside(40, -20.01)).toBe(false);
  });

  it('is 10 px wide at d = 10: s = 5 is in, 5.5 is out', () => {
    expect(inside(10, 5)).toBe(true);
    expect(inside(10, 5.5)).toBe(false);
  });

  it('excludes what lies behind the apex and beside it', () => {
    expect(inside(-0.01, 0)).toBe(false);
    expect(inside(0, 0.5)).toBe(false);
  });
});

describe('the directions and the frame apexes', () => {
  it('has one unit vector per facing', () => {
    expect(DIRECTIONS).toStrictEqual({
      down: { x: 0, y: 1 },
      up: { x: 0, y: -1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    });
  });

  it("puts each frame's apex at the middle of the edge the cone opens from", () => {
    expect(FRAME_APEX).toStrictEqual({
      down: { x: 24, y: 0 },
      up: { x: 24, y: 47 },
      left: { x: 47, y: 24 },
      right: { x: 0, y: 24 },
    });
  });
});
```

- [ ] **Step 2: run it, see it fail** (`npx vitest run tests/unit/lamp.test.ts`): module
  missing.
- [ ] **Step 3: write** `src/game/lamp.ts` as above. See the tests pass; `npm test` shows
  `tests/arch/` still green with the new file under its rule.
- [ ] **Step 4: `npm run check`; commit** — `Add the lamp's cone`; why: the cone is a sector
  test on two projections, one formula for four facings, so that freezing a creature (0008) and
  drawing the cone (this feature) rest on the same predicate; the frame apexes are literals
  because the renderer and the generator both place the cone by them.

---

### Task 2: Holding the lamp — input, player, state

**Files:**
- Modify: `src/game/player.ts`, `src/game/state.ts`, `src/game/update.ts`, `src/main.ts`,
  `tests/unit/player.test.ts`, `tests/unit/state.test.ts`, `tests/unit/input.test.ts`,
  `tests/unit/draw-scene.test.ts`

**Interfaces — produces:**

```ts
// src/game/player.ts (additions and changes)
/** Everything the game reads from the keys (0007): the movement actions and `lamp`, on while Space is held. */
export interface GameInput extends MovementInput {
  readonly lamp: boolean;
}

/**
 * One step. With the lamp on (0007) the figure stands where it is and the direction keys only
 * turn it, by the same rule as walking; the walk cycle is standing. Otherwise: move the box
 * along the vector against the solid grid, X then Y (engine/collision), clamp the feet so the
 * whole 16x24 sprite stays inside the map, turn. "Moving" is the vector before collision and
 * clamp, so a figure held by a wall or an edge keeps its facing and its walk cycle.
 */
export function stepPlayer(player: PlayerState, input: GameInput, map: TileMap): PlayerState {
  const vector = movementVector(input);
  if (input.lamp) {
    return { ...player, facing: facingOf(vector, player.facing), frame: 0, frameTimer: 0 };
  }
  // … the rest unchanged
}
```

```ts
// src/game/state.ts (addition)
/** The lamp (0007): on in every step whose input holds `lamp`. Later fields: strength (0010), charge (M6). */
export interface LampState {
  readonly on: boolean;
}

export interface GameState {
  readonly tick: number;
  readonly player: PlayerState;
  readonly camera: Point;
  /** Derived from the input every step and kept here so the renderer knows what to draw. */
  readonly lamp: LampState;
}
```

```ts
// src/game/update.ts
import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { type GameInput, stepPlayer } from './player';
import type { GameState, PlayerState } from './state';

/** The state before the first step: the player at the map's spawn, facing down, standing; the camera on it; the lamp off. */
export function createInitialState(map: TileMap): GameState {
  const player: PlayerState = {
    x: map.spawn.x,
    y: map.spawn.y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
  };
  return { tick: 0, player, camera: followPlayer(player, map), lamp: { on: false } };
}

/**
 * Advances the game by exactly one logic step and returns the new state; its arguments are not
 * mutated. The camera follows the stepped player, after collision and clamp; the lamp is on in
 * exactly the steps whose input holds it (0007).
 */
export function update(state: GameState, input: GameInput, content: TileMap): GameState {
  const player = stepPlayer(state.player, input, content);
  return {
    tick: state.tick + 1,
    player,
    camera: followPlayer(player, content),
    lamp: { on: input.lamp },
  };
}
```

```ts
// src/main.ts (changes)
import type { GameInput } from './game/player';

type Action = keyof GameInput | 'fullscreen';

/** architecture.md §4: the one table from physical keys to actions. */
const BINDINGS: Bindings<Action> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  lamp: ['Space'],
  fullscreen: ['KeyF'],
};

// (the keydown comment) A bound key without Ctrl, Alt or Cmd belongs to the game: its default
// is prevented, so the arrows never scroll the page and Space neither scrolls nor clicks a
// focused control; with a modifier the browser keeps its own shortcut. F toggles fullscreen
// once per press here and never reaches the game.

/** The game's actions of this frame; `fullscreen` stays in main.ts. */
function readInput(): GameInput {
  const { up, down, left, right, lamp } = resolveActions(keyboard.held, BINDINGS);
  return { up, down, left, right, lamp };
}
```

- [ ] **Step 1: write the failing tests.** In `tests/unit/player.test.ts` the helpers become:

```ts
import { type GameInput, type MovementInput, movementVector, stepPlayer } from '../../src/game/player';

const NONE: GameInput = { up: false, down: false, left: false, right: false, lamp: false };

function press(...actions: readonly (keyof MovementInput)[]): GameInput {
  return {
    up: actions.includes('up'),
    down: actions.includes('down'),
    left: actions.includes('left'),
    right: actions.includes('right'),
    lamp: false,
  };
}

/** The movement actions with Space held: the lamp on. */
function shining(...actions: readonly (keyof MovementInput)[]): GameInput {
  return { ...press(...actions), lamp: true };
}

function walk(player: PlayerState, input: GameInput, steps: number, map: TileMap = MAP): PlayerState {
  // unchanged body
}
```

  and a new describe, after the walk-cycle describe:

```ts
describe('stepPlayer: holding the lamp (0007)', () => {
  it('does not move on an axis, on a diagonal or with all four held', () => {
    for (const input of [
      shining('right'),
      shining('up', 'left'),
      shining('up', 'down', 'left', 'right'),
    ]) {
      const held = stepPlayer(standing(160, 96), input, MAP);
      expect([held.x, held.y]).toStrictEqual([160, 96]);
    }
  });

  it('turns in place by the walking rule: horizontal wins, vertical alone, cancelling keeps', () => {
    expect(stepPlayer(standing(160, 96), shining('right'), MAP).facing).toBe('right');
    expect(stepPlayer(standing(160, 96), shining('up', 'left'), MAP).facing).toBe('left');
    expect(stepPlayer(standing(160, 96), shining('up'), MAP).facing).toBe('up');
    expect(stepPlayer(standing(160, 96, 'right'), shining('left', 'right'), MAP).facing).toBe(
      'right',
    );
    expect(stepPlayer(standing(160, 96, 'up'), shining(), MAP).facing).toBe('up');
  });

  it('shows the standing frame at once, at the position reached: phase 3, timer 4 becomes 0, 0', () => {
    const walking = walk(standing(160, 96), press('right'), 20);
    expect([walking.frame, walking.frameTimer]).toStrictEqual([3, 4]);
    const stopped = stepPlayer(walking, shining('right'), MAP);
    expect([stopped.frame, stopped.frameTimer, stopped.facing]).toStrictEqual([0, 0, 'right']);
    expect(stopped.x).toBeCloseTo(186.6667, 3);
    expect(stopped.y).toBe(96);
  });

  it('walks from standing on the step after the release: phase 1, timer 0, 1.333 px', () => {
    const stopped = stepPlayer(walk(standing(160, 96), press('right'), 20), shining('right'), MAP);
    const resumed = stepPlayer(stopped, press('right'), MAP);
    expect([resumed.frame, resumed.frameTimer]).toStrictEqual([1, 0]);
    expect(resumed.x).toBeCloseTo(188, 6);
  });

  it('leaves its input unchanged', () => {
    const input = shining('right');
    stepPlayer(standing(160, 96), input, MAP);
    expect(input).toStrictEqual(shining('right'));
  });
});
```

  In `tests/unit/state.test.ts`: `NONE`, `RIGHT`, `UP_LEFT` become `GameInput` with
  `lamp: false`; add `const SHINE: GameInput = { ...NONE, lamp: true };`; `afterSteps` takes
  `GameInput` legs. The initial-state expectation gains `lamp: { on: false }`; the two `update`
  tests build their state with `lamp: { on: false }` and expect it back unchanged in "leaves its
  input unchanged". The round-trip test ends with the lamp on — the legs become
  `[100, RIGHT], [37, UP_LEFT], [1096, NONE], [1, SHINE]` (still tick 1234, x fractional, facing
  left, camera (0, 0)) and asserts `expect(state.lamp).toStrictEqual({ on: true })` before the
  round trip. New describe:

```ts
describe('the lamp in the state (0007)', () => {
  it('starts off', () => {
    expect(createInitialState(MAP).lamp).toStrictEqual({ on: false });
  });

  it('is on in a step whose input holds lamp; the figure stays, turns, and the camera stays on it', () => {
    const state = update(createInitialState(MAP), { ...SHINE, right: true }, MAP);
    expect(state.lamp).toStrictEqual({ on: true });
    expect([state.player.x, state.player.y, state.player.facing]).toStrictEqual([136, 120, 'right']);
    expect([state.player.frame, state.player.frameTimer]).toStrictEqual([0, 0]);
    expect(state.camera).toStrictEqual({ x: 0, y: 12 });
  });

  it('is off again in the first step without it', () => {
    const shone = update(createInitialState(MAP), SHINE, MAP);
    expect(update(shone, NONE, MAP).lamp).toStrictEqual({ on: false });
  });
});
```

  In `tests/unit/input.test.ts`, the `resolveActions` describe: `type Action = 'up' | 'down' |
  'left' | 'right' | 'lamp' | 'fullscreen'`; `BINDINGS` gains `lamp: ['Space']`; `OFF` gains
  `lamp: false`; the unbound-key example `new Set(['Space', 'KeyQ'])` becomes
  `new Set(['Enter', 'KeyQ'])`, because Space is bound now; and a new `it`:

```ts
  it('turns Space into lamp, beside the movement keys', () => {
    expect(resolveActions(new Set(['Space']), BINDINGS)).toStrictEqual({ ...OFF, lamp: true });
    expect(resolveActions(new Set(['Space', 'KeyA']), BINDINGS)).toStrictEqual({
      ...OFF,
      lamp: true,
      left: true,
    });
  });
```

  In `tests/unit/draw-scene.test.ts` the `state` helper gains the lamp so the file still
  compiles: `const state = (fields, camera = { x: 0, y: 0 }): GameState => ({ tick: 0, player:
  player(fields), camera, lamp: { on: false } });`. The drawing itself is Task 4.

- [ ] **Step 2: run the four files, see them fail** (`npx vitest run tests/unit/player.test.ts
  tests/unit/state.test.ts tests/unit/input.test.ts tests/unit/draw-scene.test.ts`): type
  errors on `lamp`, then the new assertions.
- [ ] **Step 3: write** the changes to `player.ts`, `state.ts`, `update.ts` and `main.ts` as
  above. See the tests pass. `npm run typecheck` proves `main.ts` and the loop agree on
  `GameInput`.
- [ ] **Step 4: look at it.** `npm run dev`, open `http://localhost:5173`: hold Space and press
  `D` — the figure turns right without moving; release Space with `D` held — it walks. No cone
  yet, that is Task 4.
- [ ] **Step 5: `npm run check`; commit** — `Hold the lamp: the figure stands and turns`; why:
  the lamp is a fifth held action, on in exactly the steps that hold it and kept in the state
  for the renderer; while it is on the figure stands and the direction keys sweep, so capturing
  (0008) becomes a deliberate act, and no key-press edge is needed.

---

### Task 3: The lamp sheet

**Files:**
- Create: `tools/placeholder-lamp.ts`, `public/sprites/lamp.png`
- Modify: `tools/gen-sprites.ts`, `tests/unit/gen-sprites.test.ts`, `tests/unit/assets.test.ts`

**Interfaces — produces:**

```ts
// tools/placeholder-lamp.ts
import { CONE_LENGTH, FRAME_APEX, inCone } from '../src/game/lamp.ts';
import { FACINGS, type Facing } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder lamp sheet (visual.md §5, feature 0007): the cone of light as four 48x48
 * frames in one row, one per facing in FACINGS order, each a checkerboard of one palette colour
 * cut to the cone from the frame's apex pixel (game/lamp, FRAME_APEX). Drawn from the same
 * predicate the game tests with, so the picture is the rule. Pure — it returns pixels;
 * tools/gen-sprites.ts writes the file.
 */

/** The palette's yellow: neither the grass nor the path of the placeholder tiles. */
export const LAMP_COLOUR: PaletteColour = '#fee761';
export const LAMP_FRAME_SIZE = CONE_LENGTH;
export const LAMP_SHEET_WIDTH = FACINGS.length * LAMP_FRAME_SIZE;
export const LAMP_SHEET_HEIGHT = LAMP_FRAME_SIZE;

/** Pixel (i, j) of a facing's frame is lit when it lies in the cone from the frame's apex and i + j is even. */
export function isLit(facing: Facing, i: number, j: number): boolean {
  return (i + j) % 2 === 0 && inCone({ x: i, y: j }, { apex: FRAME_APEX[facing], facing });
}

/** RGBA, row-major, LAMP_SHEET_WIDTH × LAMP_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderLamp(): Uint8Array {
  const data = new Uint8Array(LAMP_SHEET_WIDTH * LAMP_SHEET_HEIGHT * 4);
  const [r, g, b] = rgb(LAMP_COLOUR);
  for (const [n, facing] of FACINGS.entries()) {
    for (let j = 0; j < LAMP_FRAME_SIZE; j += 1) {
      for (let i = 0; i < LAMP_FRAME_SIZE; i += 1) {
        if (isLit(facing, i, j)) {
          data.set([r, g, b, 255], (j * LAMP_SHEET_WIDTH + n * LAMP_FRAME_SIZE + i) * 4);
        }
      }
    }
  }
  return data;
}
```

```ts
// tools/gen-sprites.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { LAMP_SHEET_HEIGHT, LAMP_SHEET_WIDTH, renderLamp } from './placeholder-lamp.ts';
import { renderPlayer, SHEET_HEIGHT, SHEET_WIDTH } from './placeholder-player.ts';

/**
 * `npm run gen-sprites`: writes public/sprites/player.png from tools/placeholder-player.ts and
 * public/sprites/lamp.png from tools/placeholder-lamp.ts. Deterministic — pngjs writes no
 * timestamp — and Node runs this TypeScript file directly, without a transpiler.
 */

export function encodePng(): Buffer {
  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
  png.data = Buffer.from(renderPlayer());
  return PNG.sync.write(png);
}

export function encodeLampPng(): Buffer {
  const png = new PNG({ width: LAMP_SHEET_WIDTH, height: LAMP_SHEET_HEIGHT });
  png.data = Buffer.from(renderLamp());
  return PNG.sync.write(png);
}

if (import.meta.main) {
  mkdirSync('public/sprites', { recursive: true });
  writeFileSync('public/sprites/player.png', encodePng());
  writeFileSync('public/sprites/lamp.png', encodeLampPng());
}
```

- [ ] **Step 1: write the failing tests.** In `tests/unit/gen-sprites.test.ts` add the imports
  `FRAME_APEX`, `inCone` from `../../src/game/lamp`, `encodeLampPng` from
  `../../tools/gen-sprites.ts`, and `LAMP_COLOUR`, `LAMP_FRAME_SIZE`, `LAMP_SHEET_HEIGHT`,
  `LAMP_SHEET_WIDTH`, `renderLamp` from `../../tools/placeholder-lamp.ts`; then:

```ts
const LAMP_FILE = join(ROOT, 'public/sprites/lamp.png');
const LAMP = renderLamp();

/** The byte offset of pixel (i, j) of frame `index` of the lamp sheet. */
function lampOffset(index: number, i: number, j: number): number {
  return (j * LAMP_SHEET_WIDTH + index * LAMP_FRAME_SIZE + i) * 4;
}

function lampColour(index: number, i: number, j: number): string {
  const o = lampOffset(index, i, j);
  return `#${[LAMP[o], LAMP[o + 1], LAMP[o + 2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('the placeholder lamp generator (0007)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeLampPng().equals(encodeLampPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(LAMP_FILE));
    expect([committed.width, committed.height]).toStrictEqual([LAMP_SHEET_WIDTH, LAMP_SHEET_HEIGHT]);
    expect(Buffer.from(LAMP).equals(committed.data)).toBe(true);
  });

  it('is 192x48: four 48x48 frames in one row, one per facing', () => {
    expect([LAMP_SHEET_WIDTH, LAMP_SHEET_HEIGHT]).toStrictEqual([192, 48]);
    expect(LAMP_FRAME_SIZE).toBe(48);
    expect(LAMP).toHaveLength(192 * 48 * 4);
  });

  it("lights exactly the checkerboard inside each frame's cone, in the lamp colour, pixel by pixel", () => {
    for (const [index, facing] of FACINGS.entries()) {
      const cone = { apex: FRAME_APEX[facing], facing };
      for (let j = 0; j < LAMP_FRAME_SIZE; j += 1) {
        for (let i = 0; i < LAMP_FRAME_SIZE; i += 1) {
          const lit = (i + j) % 2 === 0 && inCone({ x: i, y: j }, cone);
          const alpha = LAMP[lampOffset(index, i, j) + 3];
          expect(alpha, `${facing} (${i}, ${j})`).toBe(lit ? 255 : 0);
          if (lit) {
            expect(lampColour(index, i, j), `${facing} (${i}, ${j})`).toBe(LAMP_COLOUR);
          }
        }
      }
    }
  });

  it('has exactly 576 opaque pixels per frame', () => {
    for (const [index, facing] of FACINGS.entries()) {
      let opaque = 0;
      for (let j = 0; j < LAMP_FRAME_SIZE; j += 1) {
        for (let i = 0; i < LAMP_FRAME_SIZE; i += 1) {
          if (LAMP[lampOffset(index, i, j) + 3] === 255) {
            opaque += 1;
          }
        }
      }
      expect(opaque, facing).toBe(576);
    }
  });

  it('starts the right-facing cone at the apex alone and ends it 47 rows wide, with row 0 dark', () => {
    const right = FACINGS.indexOf('right');
    expect(LAMP[lampOffset(right, 0, 24) + 3]).toBe(255);
    expect(LAMP[lampOffset(right, 0, 23) + 3]).toBe(0);
    expect(LAMP[lampOffset(right, 0, 25) + 3]).toBe(0);
    expect(LAMP[lampOffset(right, 47, 1) + 3]).toBe(255); // 47 + 1 is even
    expect(LAMP[lampOffset(right, 47, 47) + 3]).toBe(255);
    expect(LAMP[lampOffset(right, 47, 0) + 3]).toBe(0);
  });
});
```

  In `tests/unit/assets.test.ts`, beside the player-sheet `it`:

```ts
  it('checks the lamp sheet under public/sprites/ with every other PNG', () => {
    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/lamp.png');
  });
```

- [ ] **Step 2: run them, see them fail** (`npx vitest run tests/unit/gen-sprites.test.ts
  tests/unit/assets.test.ts`): module missing, then the file missing.
- [ ] **Step 3: write** `tools/placeholder-lamp.ts` and change `tools/gen-sprites.ts` as above;
  run `npm run gen-sprites` (it rewrites `player.png` byte-identically) and look at
  `public/sprites/lamp.png` in an image viewer: four yellow checkerboard cones, down, up, left,
  right. See the tests pass; run `npm run gen-sprites` again and `git status` — only the new
  file.
- [ ] **Step 4: `npm run check`; commit** `tools/placeholder-lamp.ts`, `tools/gen-sprites.ts`,
  `public/sprites/lamp.png` and the two tests — `Generate the lamp sheet`; why: the cone's
  picture is drawn from the predicate the game tests with, and a test re-derives every pixel
  from it, so the picture and the rule cannot drift apart until the art pass replaces the
  picture by hand.

---

### Task 4: Drawing the cone

**Files:**
- Modify: `src/render/renderer.ts`, `src/render/canvas2d/canvas2d-renderer.ts`,
  `src/engine/sprite.ts`, `src/render/draw-scene.ts`, `src/main.ts`,
  `tests/unit/draw-scene.test.ts`

**Interfaces — produces:**

```ts
// src/render/renderer.ts (changes)
/** A decoded sprite sheet: frames of frameWidth × frameHeight in one row (the figure's 16x24, the lamp's 48x48). */
export interface SpriteSheet {
  readonly image: ImageBitmap;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

export interface Renderer {
  // …
  /** Draws frame `frame` of the sheet with its top-left corner at (x, y), frameWidth × frameHeight. */
  drawSprite(sheet: SpriteSheet, frame: number, x: number, y: number): void;
}
```

```ts
// src/render/canvas2d/canvas2d-renderer.ts (change; the import of engine/sprite goes)
    drawSprite(sheet, frame, x, y) {
      const { frameWidth, frameHeight } = sheet;
      draw.drawImage(
        sheet.image,
        frame * frameWidth,
        0,
        frameWidth,
        frameHeight,
        x,
        y,
        frameWidth,
        frameHeight,
      );
    },
```

```ts
// src/engine/sprite.ts (comment only)
/**
 * Figures are 16x24 (visual.md §3): one tile wide, one and a half high. The player's sprite
 * sheet holds frames of this size in one row; a sheet carries its own frame size
 * (render/renderer, SpriteSheet), and this is the figure's.
 */
export const FRAME_WIDTH = 16;
export const FRAME_HEIGHT = 24;
```

```ts
// src/render/draw-scene.ts
import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import type { Point, TileMap } from '../engine/tiled';
import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../game/state';
import { drawLayer } from './draw-map';
import { PAGE_BACKGROUND } from './palette';
import type { Renderer, SpriteSheet, TilesetImage } from './renderer';

/** Everything a frame draws from, loaded once by main.ts. */
export interface SceneContent {
  readonly map: TileMap;
  readonly tileset: TilesetImage;
  readonly playerSheet: SpriteSheet;
  /** Four 48x48 frames, one per facing in FACINGS order (0007). */
  readonly lampSheet: SpriteSheet;
}

/** The frame in the player sheet: facing × 5 + phase, facings in FACINGS order. */
export function playerFrame(player: PlayerState): number {
  return FACINGS.indexOf(player.facing) * PHASES_PER_FACING + player.frame;
}

/** The frame in the lamp sheet: the facing's index. */
export function lampFrame(player: PlayerState): number {
  return FACINGS.indexOf(player.facing);
}

/**
 * The top-left corner of the lamp frame on the surface (0007): the apex, (round(x),
 * round(y) − 12), rounded as the figure's sprite rounds, minus the frame's apex pixel, minus
 * the camera — so cone and figure agree pixel for pixel.
 */
export function lampFrameOrigin(player: PlayerState, camera: Point): Point {
  const apex = FRAME_APEX[player.facing];
  return {
    x: Math.round(player.x) - apex.x - camera.x,
    y: Math.round(player.y) - LAMP_HEIGHT - apex.y - camera.y,
  };
}

/**
 * One frame: ground, detail, the cone when the lamp is on, the player, above, all shifted by
 * the camera. The sprite's top-left corner is at (round(x) − 8 − camera.x, round(y) − 24 −
 * camera.y): the feet are its bottom centre, and the camera is already whole pixels
 * (engine/camera). The cone lies under the figure, so the body hides the apex.
 */
export function drawScene(renderer: Renderer, state: GameState, content: SceneContent): void {
  const { player, camera } = state;
  renderer.clear(PAGE_BACKGROUND);
  drawLayer(renderer, content.map, content.tileset, 'ground', camera);
  drawLayer(renderer, content.map, content.tileset, 'detail', camera);
  if (state.lamp.on) {
    const origin = lampFrameOrigin(player, camera);
    renderer.drawSprite(content.lampSheet, lampFrame(player), origin.x, origin.y);
  }
  renderer.drawSprite(
    content.playerSheet,
    playerFrame(player),
    Math.round(player.x) - FRAME_WIDTH / 2 - camera.x,
    Math.round(player.y) - FRAME_HEIGHT - camera.y,
  );
  drawLayer(renderer, content.map, content.tileset, 'above', camera);
}
```

```ts
// src/main.ts (changes)
import { FRAME_HEIGHT, FRAME_WIDTH } from './engine/sprite';
import { CONE_LENGTH } from './game/lamp';

const MAP_URL = '/maps/campus.tmj';
const PLAYER_SHEET_URL = '/sprites/player.png';
const LAMP_SHEET_URL = '/sprites/lamp.png';

/**
 * The map, its tileset and the tileset's image, each resolved against the file naming it, then
 * the player's sprite sheet and the lamp's.
 */
async function loadContent(): Promise<SceneContent> {
  // … map, tileset, image as before
  return {
    map,
    tileset: { image, columns: tileset.columns },
    playerSheet: {
      image: await loadImage(PLAYER_SHEET_URL),
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    },
    lampSheet: {
      image: await loadImage(LAMP_SHEET_URL),
      frameWidth: CONE_LENGTH,
      frameHeight: CONE_LENGTH,
    },
  };
}
```

- [ ] **Step 1: write the failing tests** in `tests/unit/draw-scene.test.ts`. The fixtures:

```ts
import { drawScene, lampFrame, lampFrameOrigin, playerFrame, type SceneContent } from '../../src/render/draw-scene';

const CONTENT: SceneContent = {
  map: MAP,
  tileset: { image: {} as ImageBitmap, columns: 7 },
  playerSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 },
  lampSheet: { image: {} as ImageBitmap, frameWidth: 48, frameHeight: 48 },
};
const state = (fields: Partial<PlayerState>, camera = { x: 0, y: 0 }, lampOn = false): GameState => ({
  tick: 0,
  player: player(fields),
  camera,
  lamp: { on: lampOn },
});
```

  The two existing `drawScene` tests that assert the whole call list also assert
  `expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet])` — the lamp sheet is not
  touched while the lamp is off. New describe:

```ts
describe('the lamp in the scene (0007)', () => {
  const camera = { x: 5, y: 7 };

  it('draws the cone after detail and before the player, from the lamp sheet, when the lamp is on', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }, camera, true), CONTENT);
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
      'drawTile 0 at -5,-7',
      'drawTile 1 at 11,-7',
      'drawTile 2 at -5,9',
      'drawTile 2 at 11,9',
      'drawTile 2 at 27,9',
      'drawTile 4 at 11,9',
      'drawSprite 2 at -32,-12', // the cone facing left: apex (20, 19) − (47, 24) − camera
      'drawSprite 13 at 7,0',
      'drawTile 6 at -5,-7',
    ]);
    expect(renderer.sheets).toStrictEqual([CONTENT.lampSheet, CONTENT.playerSheet]);
  });

  it('places the frame by the facing: feet (20.4, 30.6), camera (5, 7)', () => {
    const feet = { x: 20.4, y: 30.6 };
    expect(lampFrameOrigin(player({ ...feet, facing: 'down' }), camera)).toStrictEqual({ x: -9, y: 12 });
    expect(lampFrameOrigin(player({ ...feet, facing: 'up' }), camera)).toStrictEqual({ x: -9, y: -35 });
    expect(lampFrameOrigin(player({ ...feet, facing: 'left' }), camera)).toStrictEqual({ x: -32, y: -12 });
    expect(lampFrameOrigin(player({ ...feet, facing: 'right' }), camera)).toStrictEqual({ x: 15, y: -12 });
  });

  it('puts the down-facing frame at (136, 82) at the spawn, its apex on the chest row (160, 82)', () => {
    expect(lampFrameOrigin(player({ x: 1024, y: 734 }), { x: 864, y: 640 })).toStrictEqual({ x: 136, y: 82 });
  });

  it("uses the facing's index as the frame", () => {
    expect(lampFrame(player({ facing: 'down' }))).toBe(0);
    expect(lampFrame(player({ facing: 'up' }))).toBe(1);
    expect(lampFrame(player({ facing: 'left' }))).toBe(2);
    expect(lampFrame(player({ facing: 'right' }))).toBe(3);
  });
});
```

- [ ] **Step 2: run it, see it fail** (`npx vitest run tests/unit/draw-scene.test.ts`): type
  errors on `lampSheet` and the frame sizes, then the missing exports.
- [ ] **Step 3: write** the changes to `renderer.ts`, `canvas2d-renderer.ts`, `sprite.ts`,
  `draw-scene.ts` and `main.ts` as above. See the tests pass; `tests/unit/gen-sprites.test.ts`
  keeps using `FRAME_WIDTH` and `FRAME_HEIGHT` from `engine/sprite` for the figure and is
  untouched.
- [ ] **Step 4: look at it.** `npm run dev`, open `http://localhost:5173`: hold Space — a yellow
  checkerboard cone below the figure, under its body; press `D`, `W`, `A` with Space held — it
  swings; release — it vanishes. Walk to the facade, face up, hold Space — the cone lies over
  the wall. Check the console for errors (a 404 on `lamp.png` would show here).
- [ ] **Step 5: `npm run check`; commit** — `Draw the lamp's cone under the figure`; why: a sprite
  sheet now carries its own frame size so one `drawSprite` serves 16x24 and 48x48 frames; the
  cone's frame is placed from the same rounded feet as the figure's sprite, so the two agree
  pixel for pixel; drawn between `detail` and the player, the body hides the apex.

---

### Task 5: The smoke spec

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: write the test**, after the ArrowRight test:

```ts
test('a held Space turns the lamp on and holds the figure in place', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.player.x), {
      message: 'window.shadowAi.state.player.x is the spawn: the game runs',
    })
    .toBe(1024);
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => window.shadowAi?.state.lamp.on)).toBe(true);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  const held = await page.evaluate(() => window.shadowAi?.state);
  // Nothing moves while the lamp is on; the direction key only turns the figure.
  expect(held?.player.x).toBe(1024);
  expect(held?.player.facing).toBe('right');
  expect(held?.player.frame).toBe(0);
  expect(held?.lamp.on).toBe(true);
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => window.shadowAi?.state.lamp.on)).toBe(false);
  await page.keyboard.up('ArrowRight');
});
```

- [ ] **Step 2: run it** (`npm run test:e2e`, which starts the dev server): the new test passes
  with the other three; if it does not, the keydown of Space is reaching the game — check
  `BINDINGS.lamp` and `readInput` in `main.ts`, not the test.
- [ ] **Step 3: the container.** `npm run build`, `docker build -t shadow-ai .`, `docker run
  --rm -p 8080:8080 shadow-ai`, then `BASE_URL=http://localhost:8080 npm run test:e2e`: all
  tests green, the header tests included. Stop the container.
- [ ] **Step 4: `npm run check`; commit** — `Hold Space in the smoke test`; why: the smoke test
  proves the lamp's path end to end — key, action, state, debug handle — against the dev server
  and the container alike, the way it proves walking.

---

### Task 6: Specification and README

**Files:**
- Modify: `docs/spec/architecture.md`, `docs/spec/gameplay.md`, `docs/spec/testing.md`,
  `README.md`

- [ ] `architecture.md` §1: in the tree, under `tools/`, after the `gen-sprites.ts` line, add
  `placeholder-lamp.ts` — "the placeholder lamp sheet as pure data: the cone of light, one
  48x48 frame per facing, drawn from game/lamp" — and change the `gen-sprites.ts` line to
  "writes it and the lamp sheet to public/sprites/; `npm run gen-sprites`".
- [ ] `architecture.md` §2: "Today that is `tick`, the logic steps since the start, the player
  and the camera; later …" → "…, the player, the camera and the lamp; later …". After the
  camera paragraph add one on the lamp: `lamp` is `{ on }` (feature 0007): on in every step
  whose input holds `lamp`, derived from the input and kept in the state so the renderer knows
  what to draw and so later fields — strength (0010), charge (M6) — join it. While it is on,
  `stepPlayer` keeps the feet where they are, resets the walk cycle to standing and turns the
  facing by the walking rule; no collision or clamp runs. The cone is `game/lamp`: the apex 12
  px above the feet, the facing's unit vector, 48 px long and half-open, opening with slope 1/2
  to each side; `inCone(point, cone)` is the one test the game makes on it, and `FRAME_APEX`
  names where the apex sits in a 48x48 frame of the lamp sheet, per facing. In the `update`
  paragraph: "`input` is the four movement actions `up`, `down`, `left`, `right` as booleans
  (§4)" → "`input` is `GameInput`: the four movement actions and `lamp`, as booleans (§4)".
- [ ] `architecture.md` §4: "The keyboard does not yet keep which keys went down this step, the
  edge a single press needs; the lamp (M3) brings it." → "The keyboard does not keep which keys
  went down this step, the edge a single press needs: nothing in the game needs one — the lamp
  is held, not toggled — so the journal (M4) is the first that may." "The game reads named
  actions — `up`, `down`, `left`, `right`, later `lamp` and `journal` — never key codes." →
  "— `up`, `down`, `left`, `right` and `lamp`, later `journal` —". In the table sentence add
  "`lamp` ← Space" before "`fullscreen` ← F". "The game gets the four movement actions as
  booleans and nothing else." → "The game gets the five actions as booleans and nothing else."
  "so the arrow keys never scroll the page" → "so the arrow keys never scroll the page and Space
  neither scrolls nor clicks a focused control".
- [ ] `architecture.md` §5: "`drawSprite(sheet, frame, x, y)` draws frame `frame` of a sprite
  sheet — frames of 16x24 in one row — with its top-left corner at (x, y), from the decoded
  image like `drawTile`, smoothing off." → "… of a sprite sheet — frames of the sheet's own
  `frameWidth × frameHeight` in one row; the figure's are 16x24, the lamp's 48x48 — with its
  top-left corner at (x, y), from the decoded image like `drawTile`, smoothing off."
  "`render/draw-scene` holds the draw order of a frame: clear, then `ground`, `detail`, the
  player, `above` (§6)." → "…: clear, then `ground`, `detail`, the lamp's cone when the lamp is
  on, the player, `above` (§6)." After the sentence on the player's frame add: "The cone's frame
  is drawn with its top-left corner at the apex, (round(x), round(y) − 12), minus the frame's
  apex pixel (`game/lamp`, `FRAME_APEX`: down (24, 0), up (24, 47), left (47, 24), right
  (0, 24)), minus the camera; its frame is the facing's index. Cone and figure round the same
  values, so they agree pixel for pixel, and the cone lies under the figure."
- [ ] `architecture.md` §7: after the player-sheet paragraphs add: `tools/placeholder-lamp.ts`
  draws the lamp sheet the same way and returns its pixels as data: `public/sprites/lamp.png`,
  192x48, four 48x48 frames in one row in facing order down, up, left, right, each a
  checkerboard of `#fee761` cut to the cone from the frame's apex pixel, drawn from `inCone` of
  `game/lamp` so the picture is the rule. `npm run gen-sprites` writes both sheets; both are
  committed, the generator is deterministic, and a unit test fails when the committed file and
  the generator disagree — for the lamp it re-derives every pixel from `inCone` and counts 576
  opaque pixels per frame. When the art pass draws the cone by hand (`visual.md` §5), the
  hand-drawn PNG replaces the file under the same name, frame order and apex pixels, and the
  generator and its tests go; the frame size and the apex pixels stay, because the renderer
  places the frame by them.
- [ ] `gameplay.md` §2: after the upgrade table add a paragraph "**As built** (feature 0007)":
  Space holds the lamp; there is no toggle. While it is held the figure stands and the
  direction keys turn it, so a sweep is a deliberate act. The cone starts at the chest, 12 px
  above the feet, is 48 px long — three tiles — and opens with slope 1/2 to each side, so it is
  as wide at its end as it is long; both numbers *tune*. It is drawn as a yellow checkerboard
  under the figure. Nothing is lit yet: strength and the density rule arrive with 0010, the
  battery with M6.
- [ ] `gameplay.md` §8: after the first sentence add "Arrow keys or WASD walk, Space holds the
  lamp, F toggles fullscreen."
- [ ] `testing.md` §1, Unit row: in "game rules (…)" add "the lamp's cone: the apex, the
  half-open length, the slope, what lies behind and beside the apex, per facing; the figure
  holding the lamp: standing, turning, the reset of the walk cycle, the resumed walk; the lamp
  in the state"; "the sprite generator against the committed sheet" → "the sprite generators
  against the committed sheets, the lamp sheet pixel by pixel against the cone"; "the draw order
  of the scene with the camera offset" → "the draw order of the scene with the camera offset and
  the cone's frame per facing". Smoke row: after "leaves the player facing right" add "; a held
  Space turns the lamp on and holds the figure in place with ArrowRight held, and the release
  turns it off".
- [ ] `testing.md` §2, INV-1 row: "a populated `GameState` whose player has walked" → "a
  populated `GameState` whose player has walked and whose lamp is on".
- [ ] `README.md`: status — after "M2, walking the campus, is complete." add "The lamp shines
  (feature 0007): hold `Space` and a cone of light appears in front of the figure; the direction
  keys turn it." Run block: `npm run gen-sprites  # regenerate the placeholder figure and the
  lamp sheet under public/sprites/`.
- [ ] Commit — `Record the lamp as built`; why: what is durable about the feature moves into
  `docs/spec/`, and the feature spec stays as history.

---

### Task 7: The acceptance walk (`CLAUDE.md` §3.4)

The implementation is complete when Tasks 1–6 are committed, `npm run check` and `npm run
test:e2e` are green, the container builds and passes the smoke spec, and the documents are
updated. Then the walk, by `docs/spec/testing.md` §5 — the agent guides, the author judges:

- [ ] **Set-up.** Start `npm run dev` and state the preconditions in one message: the URL
  `http://localhost:5173`, Chrome at 1920x1080 at 100 % zoom, window not maximized, the figure
  at the spawn in the courtyard, a terminal in the repository root on the branch. Wait until
  the author says they are ready.
- [ ] **One step per message.** Name the next action step together with its expected step, in
  the spec's numbering and words — steps 1–20 of the spec's acceptance plan — and nothing more:
  no hint at what a failure would look like, no summary of the steps to come. Wait for `pass`
  or `fail`, with the author's note if there is one, and record it as given. Never answer a step
  yourself, never skip one, never take silence or a general remark as a pass.
- [ ] **Fail ends the walk.** Record "step n failed" with the author's words and stop. Fix the
  branch — or ask, when the fix needs a decision the spec or this plan does not make — rerun
  `npm run check` and `npm run test:e2e`, and start the walk again at step 1. Record the failed
  walk in the fix's commit message, not in the spec.
- [ ] **Feel last.** After step 20 ask the spec's four feel questions, one per message, and
  record the answers with their numbers and notes. A feel note is not a failure: a number the
  author would change becomes a new draft, not a change on this branch.
- [ ] **The record.** Write `passed YYYY-MM-DD, steps 1–20` and the feel notes into the spec's
  `Result` line in `docs/features/0007-the-lamp.md`, and commit on the branch — `Record the
  walk of 0007`.

---

### Task 8: The pull request (`CLAUDE.md` §3.5)

- [ ] Merge `main` once more: `git fetch origin && git merge origin/main`. Rerun `npm run
  check`, `npm run test:e2e`, then `docker build -t shadow-ai .`, `docker run --rm -p 8080:8080
  shadow-ai` and `BASE_URL=http://localhost:8080 npm run test:e2e`. If the merge changed code —
  anything under `src/`, `public/`, `tools/` or `tests/` — the walk is run again (Task 7) before
  going on.
- [ ] Push `feature/0007-the-lamp`; open the pull request against `main` with the walk's result
  from the spec's `Result` line, the feel notes, "no new dependency", and the attribution line.
  Bind the pull request with the app's PR tools and read CI: both smoke runs, dev server and
  container, must be green.
- [ ] Hand back to the author. The author merges; the merge closes the feature. A follow-up on
  `main` then sets `Status: implemented` with the date in the spec and the README table, as
  "Mark 0006 implemented" did.

## Self-review against the spec

- Scope "In": `src/game/lamp.ts` with `CONE_LENGTH`, `lampCone`, `inCone` and the placing
  constants `FRAME_APEX`, `LAMP_HEIGHT` (T1); `GameInput`, `lamp` ← Space, `readInput` with five
  actions (T2); `GameState.lamp`, `createInitialState` off (T2); standing and turning in
  `stepPlayer` (T2); `tools/placeholder-lamp.ts`, `npm run gen-sprites` writing `lamp.png`, the
  checkerboard from the predicate (T3); `SpriteSheet.frameWidth/frameHeight` and `drawSprite`
  for any frame size (T4); the cone between `detail` and the player (T4); the documents (T6).
  Scope "Out": nothing here acts on the light, carries a strength, a battery, a pose, a
  key-press edge, a gamepad, a sound or a wall that blocks light.
- Behaviour "Holding the lamp": the action, no toggle, no edge → T2 `readInput` and `update`;
  `lamp.on` derived every step → T2; `releaseAll` → unchanged `engine/input`, proven by the walk's
  step 13–14. "Standing and turning": no movement, no collision, no clamp → T2 early return and
  the no-movement test; the facing rule → the turning test; standing phase at once → the reset
  test; the step after the release → the resumed test. "The cone": apex (x, y − 12) →
  `lampCone` test; the directions → `DIRECTIONS` test; 0 ≤ d < 48, |s| ≤ d / 2 → the
  `describe.each` tests; the map ignored → nothing in `inCone` reads a map. "The sprite sheet":
  192x48, facing order, the apex pixels, the checkerboard rule, 1152 and 576 → T3 tests and
  `FRAME_APEX` test; INV-6 → the asset test's glob `it`; the retirement at the art pass → T6
  §7 text. "Drawing": the order → T4 call-list test; the table of origins → T4 origin tests; the
  spawn example (136, 82) → T4 test; `drawSprite` with the sheet's frame size → T4; the edge
  clipping → the camera clamp of 0006, nothing to code. "State": plain, round trip with the lamp
  on → T2 state tests.
- Acceptance criteria 1–10: 1 → T4, walk steps 3–4 and 9–10; 2 → T2 tests, walk steps 5–8;
  3 → T2 reset and resumed tests, walk steps 11–12; 4 → T4 call order, walk step 6; 5 → walk
  steps 13–14; 6 → T1; 7 → T3, walk steps 17–20; 8 → T2 round trip; 9 → T5; 10 → T8.
- Test plan: `lamp.test.ts` → T1; `player.test.ts` → T2; `state.test.ts` → T2;
  `draw-scene.test.ts` → T4; `gen-sprites.test.ts` → T3; `input.test.ts` → T2; `tests/arch/`
  untouched; the smoke spec → T5; no new fixtures.
- Names used across tasks: `CONE_LENGTH`, `LAMP_HEIGHT`, `Cone`, `DIRECTIONS`, `FRAME_APEX`,
  `lampCone`, `inCone`, `GameInput`, `LampState`, `stepPlayer`, `update`, `createInitialState`,
  `SpriteSheet.frameWidth`, `SpriteSheet.frameHeight`, `SceneContent.lampSheet`, `lampFrame`,
  `lampFrameOrigin`, `LAMP_COLOUR`, `LAMP_FRAME_SIZE`, `LAMP_SHEET_WIDTH`, `LAMP_SHEET_HEIGHT`,
  `isLit`, `renderLamp`, `encodeLampPng` — each defined once above and used with the same
  signature.

## Decisions by the planning session

Readings the spec leaves to the implementation, decided on 2026-11-11 so that the work does not
stop. None changes what the author sees in the walk.

1. **`GameInput` lives in `player.ts` beside `MovementInput`.** `stepPlayer` is its consumer,
   `update.ts` already imports from there, and no new module or cycle is needed.
2. **`FRAME_APEX` is in `game/lamp.ts`, as literals; `DIRECTIONS` is exported.** The spec puts the
   placing constants there; literals avoid a negated zero, which Vitest's strict equality
   rejects; the test helper `at` needs the direction vectors.
3. **The lamp branch of `stepPlayer` is an early return.** It spreads the player, sets the
   facing from the vector and the cycle to standing, and touches neither collision nor clamp.
4. **The lamp sheet's tests join `gen-sprites.test.ts`.** One generator command, one test file;
   `assets.test.ts` gains the glob check the player sheet has.
5. **The round-trip state ends with one lamp step.** The legs become 100, 37, 1096 and 1, so the
   tick stays 1234 and every earlier assertion holds.
6. **`input.test.ts`'s unbound-key example changes from Space to Enter.** Space is bound now.
7. **`lampFrame` and `lampFrameOrigin` live in `draw-scene.ts`.** Two short functions beside
   `playerFrame`; a module of their own would hold nothing else.
8. **The walk follows PR #12.** Task 7 is the guided walk of `testing.md` §5, not the scripted
   acceptance run of the 0006 plan; the agent runs the automated checks and nothing else before
   it.

## Questions for the author

None.
