# 0004 — Implementation plan: the figure

**Spec:** [`docs/features/0004-the-figure.md`](../features/0004-the-figure.md) (approved 2026-11-02).
The plan argues from the spec; where they differ, the spec wins. Read the spec first, then
`CLAUDE.md`, then `docs/spec/architecture.md` §1–§5 and §7, `docs/spec/testing.md` and
`docs/spec/visual.md` §3–§5.
**Written:** 2026-11-02 on the planning model. A working document, not specification: once the
feature is implemented, what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The
"Questions for the author" at the end are open; each names the default the plan takes so that
work need not wait for the answer.

**Goal:** the player's figure stands at the test map's spawn and walks in eight directions with a
walk cycle, drawn between `detail` and `above`, driven by the arrow keys and WASD; the smoke test
reads its position through `window.shadowAi.state`.

**Approach:** every rule is a pure function tested in Node before it exists: the sprite generator
(pixels), the keyboard state and the binding resolver, the loop's once-per-frame input, movement
and facing, the clamp, the walk cycle, and the draw order of the scene. The browser-facing parts
— the DOM listeners, `drawImage` from the sheet, the global handle — are thin and are covered by
the smoke spec and the acceptance plan. The pixel art is fixed here, row by row, so the
implementation session draws nothing of its own.

## Global constraints

- No new dependency, runtime or development. Node 26 runs `.ts` files natively, and a tool may
  import only project modules whose own imports are type-only or carry a `.ts` extension — Node
  resolves no extensionless import. Checked 2026-11-02: a module with
  `import type { X } from '../engine/does-not-exist'` runs under `node` (the type import is
  stripped before resolution) and `import.meta.main` is `true` in the entry file. Today the
  runnable modules are `src/engine/tiled.ts`, `src/engine/loop.ts`, `src/render/palette.ts`, the
  new `src/engine/sprite.ts` and `src/game/state.ts` (type imports only). `src/game/player.ts`
  is **not** runnable (it imports values from `engine/loop`); no tool imports it.
- `src/game/` touches no browser (INV-2). `tests/arch/` scans the source text of `src/game/`,
  comments included, for the words `window`, `document`, `HTMLCanvasElement`, `Image` and
  `fetch` as whole words, case-sensitive. So no comment in `src/game/` may start a sentence with
  "Image" or mention "the window"; write "sprite sheet", "picture", "page". The global
  declaration for `window.shadowAi` lives in `src/main.ts`, never in `src/game/`.
- `GameState` stays plain data (INV-1): numbers and strings only in the player; `facing` is one
  of four string literals. The round-trip test runs on a state that has walked.
- `src/engine/` imports nothing from the project; `src/game/` imports `src/engine/` values and
  types (`loop`, `sprite`, `tiled`); `src/render/` imports `src/engine/` and `src/game/`
  (`architecture.md` §1). `src/render/draw-scene.ts` imports `FACINGS` and `PHASES_PER_FACING`
  from `src/game/state.ts` — that direction is allowed.
- No literal text a player can read (INV-4). Error messages in tools go to the console.
- The dist scan forbids `http://` and `https://` anywhere in `dist/` (INV-5): no URL in a
  comment of `src/`.
- Every pixel of `public/sprites/player.png` is one of six Endesga 32 colours or transparent
  (INV-6). Checked 2026-11-02 against `src/render/palette.ts`: `#3e2731`, `#e8b796`, `#124e89`,
  `#262b44`, `#181425` and `#feae34` are all in `ENDESGA_32`; none is the reserved `#68386c`.
  The sheet is 320x24; the multiple-of-16 check applies to `public/tiles/` only, the palette,
  alpha and reserved-colour checks to every PNG under `public/` (`tests/unit/assets.test.ts`
  globs `public/**/*.png`), so the sheet is checked without any change to the rules.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on, `verbatimModuleSyntax` forces `import type`. `npm run
  lint` is `biome check .`; `npx biome check --write .` sorts imports and formats. Biome's
  recommended set does not flag an empty arrow body (checked 2026-11-02 through
  `--stdin-file-path`; Biome refuses a path outside the repository), but the tests below avoid
  one anyway.
- `npm run check` is typecheck, Biome, build, Vitest — in that order, because the dist scan reads
  the build. `npm run test:e2e` runs the smoke spec against the dev server, which Playwright
  starts; with `BASE_URL` set it runs against that URL and starts nothing (`playwright.config.ts`,
  `ops.md` §4). The smoke spec must pass both ways: the handle exists in every build.
- Branch `feature/0004-the-figure` (this worktree). Commit messages: imperative subject, a body
  with the why, and the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Design notes

- **The loop reads the input, once per frame.** `runLoop` gains a third callback:
  `LoopCallbacks<S, I> = { readInput(): I; update(state: S, input: I): S; render(state: S): void }`.
  Each frame calls `readInput()` once, before the steps, and passes the result to every step —
  the spec's rule becomes a property of the loop and is tested with the fake clock. `main.ts`
  supplies `readInput` (resolve the held keys through the table, keep the four movement actions)
  and wraps the game's `update` to close over the content:
  `update: (state, input) => update(state, input, content.map)`. The content is not the loop's
  business. In `tests/unit/loop.test.ts` only `startCounting()` changes (its callbacks gain
  `readInput: () => undefined`), and one test is added; every existing INV-3 assertion stays as it
  is. Doing it the other way — resolving inside `update` — would resolve per step, not per frame.
- **The keyboard ignores a repeated keydown, and that is what makes criterion 6 hold.** After
  `releaseAll()` on `blur`, a key still physically held keeps repeating when the window regains
  focus, and every repeat arrives with `repeat: true`. Ignoring repeats means the key is not
  pressed again until it is really pressed again: the figure stands until the player lets go.
  `Keyboard.held` is a live `ReadonlySet<string>` of codes; `keyDown({ code, repeat })`,
  `keyUp({ code })` and `releaseAll()` are the whole state machine, tested in Node.
  `listenToKeyboard(keyboard, window)` is four lines of DOM wiring — `keydown`, `keyup`, `blur`
  on the window, `visibilitychange` on its document — covered by the smoke spec and the
  acceptance plan, like `loadImage`.
- **One keydown listener in `main.ts` owns the table.** For a bound code without Ctrl, Alt or
  Cmd it calls `preventDefault()` (the arrows never scroll) and, for F without `repeat`, toggles
  fullscreen. With a modifier it returns at once, so Cmd+F, Cmd+ArrowLeft (history) and every
  other browser shortcut survive. Shift is not a modifier here: Shift+ArrowRight is still the
  game's key. Preventing the default of a keydown does not cost the user activation
  `requestFullscreen` needs. `fullscreen` is a row of the table so that `BOUND_CODES` and the
  future remapping see it, and it never reaches the game: `readInput()` returns only `up`, `down`,
  `left`, `right`.
- **The frame timer is exact.** `STEPS_PER_PHASE = 60 / 8 = 7.5`; every value the timer takes is a
  multiple of 0.5, and multiples of 0.5 are exact in binary floating point, so `>= 7.5` and
  `- 7.5` never drift. From standing (timer 0) the step that starts the walk sets phase 1 and
  timer 0 — the cycle's origin; every further moving step adds 1. Step 9 makes timer 8, so
  phase 2 with timer 0.5; step 16 makes timer 7.5, so phase 3 with timer 0; step 24 phase 4
  (0.5), step 31 phase 1 (0), step 39 phase 2, step 46 phase 3, step 54 phase 4, step 61 phase 1
  with timer 0 — eight advances per second, 8 and 7 steps in turn, the first phase a full 8 as
  the spec's test plan says. The tests assert `[frame, frameTimer]` with `toStrictEqual`, no
  tolerance.
- **Movement is three pure pieces.** `movementVector(input)` sums the actions and normalizes
  (opposite actions cancel to zero; a diagonal has length 1). `facingOf(vector, current)` lets a
  horizontal component win, then vertical, then keeps the current facing. `stepPlayer(player,
  input, map)` moves by `80 / 60` px along the vector, clamps the feet to
  `[8, mapWidth − 8] × [24, mapHeight]`, sets the facing, and runs the walk cycle on "moving",
  which is the vector before the clamp — so a figure at the edge keeps stepping and facing.
  `update(state, input, content)` is `{ tick: tick + 1, player: stepPlayer(...) }`; `tick` stays.
- **The initial state takes the map.** `createInitialState(map: TileMap)` reads `map.spawn`.
  Callers today: `src/main.ts` (passes `content.map`), `tests/unit/state.test.ts` (an in-memory
  map), and the loop tests, which use a number as state and never call it. A small helper
  `tests/unit/grass-map.ts` builds an in-memory map of grass for every game test; the spec allows
  no new fixture files, and a helper is not a fixture.
- **One source for the frame size.** `src/engine/sprite.ts` holds `FRAME_WIDTH = 16` and
  `FRAME_HEIGHT = 24` (visual.md §3), like `TILE_SIZE` in `engine/tiled`; the clamp, the sprite
  offset, `drawSprite` and the generator all read it. The facing order and the phase count are
  game facts: `FACINGS = ['down', 'up', 'left', 'right']` and `PHASES_PER_FACING = 5` live in
  `src/game/state.ts`, and the generator imports them so that the sheet and the game cannot
  disagree on frame `facing × 5 + phase`.
- **The art is composed from parts, and facing right is facing left mirrored.** A frame is 24
  rows of 16 letters: two blank rows, a head (9 rows), a torso (6 rows) and legs (7 rows). Phase
  0 is the standing pose; phases 1 and 3 swap the leg rows (and, in the side views, the hand);
  phases 2 and 4 are the standing rows shifted up by one with a blank row appended. The
  rows are in Task 2, complete. Side views carry a one-pixel lanyard strap at the chest's front
  edge and swing a hand, so that the two strides differ in pixels too (identical legs seen from
  the side would otherwise make phases 1 and 3 the same picture).
- **The renderer gets a `SpriteSheet`:** `{ image: ImageBitmap }`, frames of 16x24 in one row,
  frame `n` at source x `n × 16`. Tests pass `{} as ImageBitmap`, as for `TilesetImage`.
- **`draw-map` keeps `drawMap` and gains `drawLayer`.** `drawScene(renderer, state, content)`
  clears, draws `ground`, `detail`, the player at `(round(x) − 8, round(y) − 24)` with frame
  `playerFrame(player)`, then `above`. `drawMap` stays for a map without a figure; nothing in
  `src/` calls it after this feature, its test keeps it honest.
- **The debug handle is typed in `main.ts`.** A `declare global { interface Window { shadowAi?:
  { state: GameState } } }` block in `src/main.ts` — the one file that knows both sides — makes
  `window.shadowAi` compile in `main.ts` and in the smoke spec (both are in the `tsc` program via
  `tsconfig.json`'s `include`). The property is optional because it does not exist before the
  content has loaded; the smoke spec polls for it. `main.ts` creates one handle object before the
  loop and assigns `handle.state = state` in `render`, so the handle holds exactly the state of
  the last render. Nothing in `src/game/` mentions it.
- **Canvas 2D smoothing** is already off on the surface context (set once after creation); the
  present path switches it off on every blit. `drawSprite` needs nothing more.

## File map

| File | Responsibility |
|---|---|
| `src/engine/sprite.ts` | `FRAME_WIDTH`, `FRAME_HEIGHT` (new) |
| `src/game/state.ts` | `FACINGS`, `Facing`, `WALK_PHASES`, `PHASES_PER_FACING`, `PlayerState`, `GameState` with `player`, `createInitialState(map)` |
| `src/game/player.ts` | `MovementInput`, speed and cycle constants, `movementVector`, `stepPlayer` (new) |
| `src/game/update.ts` | `update(state, input, content)` |
| `src/engine/input.ts` | `Keyboard`, `createKeyboard`, `listenToKeyboard`, `Bindings`, `resolveActions` (new) |
| `src/engine/loop.ts` | `STEPS_PER_SECOND`; `LoopCallbacks<S, I>` with `readInput`; `runLoop` reads input once per frame |
| `src/render/renderer.ts` | `SpriteSheet`; `Renderer.drawSprite(sheet, frame, x, y)` |
| `src/render/canvas2d/canvas2d-renderer.ts` | `drawSprite` with `drawImage` from the sheet |
| `src/render/draw-map.ts` | `drawLayer(renderer, map, tileset, name)`; `drawMap` uses it |
| `src/render/draw-scene.ts` | `SceneContent`, `playerFrame`, `drawScene` (new) |
| `src/main.ts` | binding table, keyboard wiring, prevented defaults, F, `readInput`, loads the sheet, draws the scene, `window.shadowAi` |
| `tools/placeholder-player.ts` | pure: `INKS`, `frameRows(facing, phase)`, `renderPlayer()` → RGBA 320x24 (new) |
| `tools/gen-sprites.ts` | `node` entry: `encodePng()`, writes `public/sprites/player.png` (new) |
| `tools/placeholder-tiles.ts` | exports `rgb` for the sprite generator |
| `public/sprites/player.png` | generated, committed |
| `package.json` | script `gen-sprites` |
| `tests/unit/grass-map.ts` | `grassMap(width, height, spawn)`: an in-memory `TileMap` for game tests (new) |
| `tests/unit/state.test.ts` | initial state from the map; round trip of a state that has walked; `update` |
| `tests/unit/player.test.ts` | vector, step distances, cancel, facing, clamp, walk cycle, initial state (new) |
| `tests/unit/input.test.ts` | keyboard state, repeat, release-all, `resolveActions` (new) |
| `tests/unit/loop.test.ts` | `startCounting` gains `readInput`; one test: input once per frame |
| `tests/unit/gen-sprites.test.ts` | determinism, committed file, size, standing vs walking, facings, raised phases (new) |
| `tests/unit/assets.test.ts` | the glob includes `public/sprites/player.png` |
| `tests/unit/draw-map.test.ts` | fake renderer gains `drawSprite`; `drawLayer` test |
| `tests/unit/draw-scene.test.ts` | draw order, sprite position and frame index (new) |
| `tests/e2e/smoke.spec.ts` | one second of ArrowRight moves `window.shadowAi.state.player.x` by ≥ 70 |
| `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md` | §1, §2, §3, §4, §5, §7; §1, §2; status and `gen-sprites` |

---

### Task 1: The player in the game state

**Files:**
- Create: `src/engine/sprite.ts`, `tests/unit/grass-map.ts`
- Modify: `src/game/state.ts`, `tests/unit/state.test.ts`, `src/main.ts` (one call)

**Interfaces — produces:**

```ts
// src/engine/sprite.ts
/**
 * Figures are 16x24 (visual.md §3): one tile wide, one and a half high. A sprite sheet holds
 * frames of this size in one row; Renderer.drawSprite reads them by index.
 */
export const FRAME_WIDTH = 16;
export const FRAME_HEIGHT = 24;
```

```ts
// src/game/state.ts
import type { TileMap } from '../engine/tiled';

/** The facings in sprite-sheet order: frame index = facing × PHASES_PER_FACING + phase. */
export const FACINGS = ['down', 'up', 'left', 'right'] as const;
export type Facing = (typeof FACINGS)[number];

/** Phase 0 stands; phases 1–WALK_PHASES are the walk cycle, in order. */
export const WALK_PHASES = 4;
export const PHASES_PER_FACING = WALK_PHASES + 1;

export interface PlayerState {
  /** The feet position in map pixels, floating point; rounded only for drawing. */
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  /** The phase, 0–WALK_PHASES. */
  readonly frame: number;
  /** Steps spent in the current phase; a multiple of 0.5, which floating point holds exactly. */
  readonly frameTimer: number;
}

export interface GameState {
  /** Logic steps since the start; one step is 1/60 s (INV-3). */
  readonly tick: number;
  readonly player: PlayerState;
}

/** The state before the first step: the player at the map's spawn, facing down, standing. */
export function createInitialState(map: TileMap): GameState {
  return {
    tick: 0,
    player: { x: map.spawn.x, y: map.spawn.y, facing: 'down', frame: 0, frameTimer: 0 },
  };
}
```

`state.ts` keeps only type imports (the sprite generator of Task 2 imports its constants under
`node`).

```ts
// tests/unit/grass-map.ts
import { EMPTY, type Point, type TileMap } from '../../src/engine/tiled';

/** A map of width × height grass tiles (id 0), nothing solid, with the given spawn. */
export function grassMap(width: number, height: number, spawn: Point): TileMap {
  const cells = width * height;
  return {
    width,
    height,
    ground: new Array<number>(cells).fill(0),
    detail: new Array<number>(cells).fill(EMPTY),
    above: new Array<number>(cells).fill(EMPTY),
    spawn,
    solid: new Array<boolean>(cells).fill(false),
  };
}
```

- [ ] **Step 1: write the failing tests.** Replace `tests/unit/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  FACINGS,
  type GameState,
  PHASES_PER_FACING,
} from '../../src/game/state';
import { update } from '../../src/game/update';
import { grassMap } from './grass-map';

/** The test map's size and spawn, in memory: 20x12 tiles, spawn at (136, 120). */
const MAP = grassMap(20, 12, { x: 136, y: 120 });

function afterSteps(steps: number): GameState {
  let state = createInitialState(MAP);
  for (let i = 0; i < steps; i += 1) {
    state = update(state);
  }
  return state;
}

describe('GameState (INV-1)', () => {
  it('starts at tick 0 with the player at the spawn, facing down, standing', () => {
    expect(createInitialState(MAP)).toStrictEqual({
      tick: 0,
      player: { x: 136, y: 120, facing: 'down', frame: 0, frameTimer: 0 },
    });
  });

  it('takes the spawn from the map it is given', () => {
    const state = createInitialState(grassMap(20, 12, { x: 40, y: 56 }));
    expect([state.player.x, state.player.y]).toStrictEqual([40, 56]);
  });

  it('survives a JSON round trip unchanged when populated', () => {
    const state = afterSteps(1234);
    expect(state.tick).toBe(1234);
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('is a plain object', () => {
    expect(Object.getPrototypeOf(afterSteps(3))).toBe(Object.prototype);
  });

  it('lists the facings in sprite-sheet order with five phases each', () => {
    expect(FACINGS).toStrictEqual(['down', 'up', 'left', 'right']);
    expect(PHASES_PER_FACING).toBe(5);
  });
});

describe('update', () => {
  const player = { x: 136, y: 120, facing: 'down', frame: 0, frameTimer: 0 } as const;

  it('advances tick by exactly one', () => {
    expect(update({ tick: 41, player })).toStrictEqual({ tick: 42, player });
  });

  it('leaves its input unchanged', () => {
    const state: GameState = { tick: 7, player };
    update(state);
    expect(state).toStrictEqual({ tick: 7, player });
  });
});
```

- [ ] **Step 2: run it, see it fail** (`npx vitest run tests/unit/state.test.ts`): `grass-map`
  missing, `createInitialState` takes no argument, no `FACINGS`.
- [ ] **Step 3: write** `src/engine/sprite.ts`, `tests/unit/grass-map.ts` and the new
  `src/game/state.ts` as above. `src/game/update.ts` is unchanged for now (`{ ...state, tick:
  state.tick + 1 }` keeps the player). In `src/main.ts` change `createInitialState()` to
  `createInitialState(content.map)`.
- [ ] **Step 4: see the tests pass; `npm run check`** — the architecture test now checks a state
  file with a player in it; green.
- [ ] **Step 5: commit** — `Add the player to the game state`; why: the figure's position,
  facing and animation are the first thing a save state would hold, and the initial state comes
  from the map so that the spawn is map truth (INV-7), not code.

---

### Task 2: The placeholder figure generator

**Files:**
- Create: `tools/placeholder-player.ts`, `tools/gen-sprites.ts`, `tests/unit/gen-sprites.test.ts`
- Create (generated): `public/sprites/player.png`
- Modify: `tools/placeholder-tiles.ts` (export `rgb`), `package.json` (script
  `"gen-sprites": "node tools/gen-sprites.ts"`), `tests/unit/assets.test.ts` (one test)

**Interfaces — produces:**

```ts
// tools/placeholder-player.ts
import { FRAME_HEIGHT, FRAME_WIDTH } from '../src/engine/sprite.ts';
import { type Facing, FACINGS, PHASES_PER_FACING } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

export const FRAME_COUNT: number;      // FACINGS.length × PHASES_PER_FACING = 20
export const SHEET_WIDTH: number;      // FRAME_COUNT × FRAME_WIDTH = 320
export const SHEET_HEIGHT: number;     // FRAME_HEIGHT = 24
/** One letter per colour; `.` is transparent. */
export const INKS: { readonly H: '#3e2731'; readonly S: '#e8b796'; readonly T: '#124e89'; readonly P: '#262b44'; readonly K: '#181425'; readonly L: '#feae34' };
/** The 24 rows of 16 letters of one frame. */
export function frameRows(facing: Facing, phase: number): readonly string[];
/** RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderPlayer(): Uint8Array;
```

`INKS` is declared `as const satisfies Record<string, PaletteColour>`, so a colour outside the
palette does not compile. The letters: `H` hair, `S` skin, `T` shirt, `P` trousers, `K` shoes
and eyes, `L` lanyard. Frame index = facing × 5 + phase, facings in `FACINGS` order.

**The parts.** Every row is exactly 16 characters; `renderPlayer` throws on any other length or
on a letter outside `INKS`, so a typo fails the test instead of drawing garbage. Columns are
0–15 from the left; the rows are listed top to bottom.

Rows 2–10, the head. Facing right is facing left mirrored (each row reversed).

```ts
const HEAD_DOWN = [
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HSSSSH.....',
  '.....SSSSSS.....',
  '.....SKSSKS.....', // two eyes at columns 6 and 9
  '.....SSSSSS.....',
  '......SSSS......',
  '.......SS.......',
];
const HEAD_UP = [
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '......HHHH......',
  '.......SS.......', // the neck
];
const HEAD_LEFT = [
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HSSSHH.....',
  '.....SSSSHH.....',
  '.....KSSSHH.....', // one eye at column 5, the left edge of the face
  '.....SSSSHH.....',
  '......SSSH......',
  '.......SS.......',
];
```

Rows 11–16, the torso. Front: the lanyard as a V from both shoulders (columns 6 and 9) to the
chest (7 and 8), hands at columns 4 and 11. Back: plain shirt. Side: a one-pixel strap at the
chest's front edge (column 5); in phase 1 the front hand swings forward and up, in phase 3 the
back hand swings back and up.

```ts
const TORSO_DOWN = [
  '.....TLTTLT.....',
  '....TTLTTLTT....',
  '....TTTLLTTT....',
  '....TTTLLTTT....',
  '....STTTTTTS....',
  '.....TTTTTT.....',
];
const TORSO_UP = [
  '.....TTTTTT.....',
  '....TTTTTTTT....',
  '....TTTTTTTT....',
  '....TTTTTTTT....',
  '....STTTTTTS....',
  '.....TTTTTT.....',
];
const TORSO_LEFT_STANDING = [
  '.....LTTTTT.....',
  '....TLTTTTTT....',
  '....TLTTTTTT....',
  '....TLTTTTTT....',
  '....STTTTTTS....',
  '.....TTTTTT.....',
];
const TORSO_LEFT_HAND_FORWARD = [
  '.....LTTTTT.....',
  '....TLTTTTTT....',
  '....TLTTTTTT....',
  '...STLTTTTTT....', // the front hand at (3, 14)
  '.....TTTTTTS....',
  '.....TTTTTT.....',
];
const TORSO_LEFT_HAND_BACK = [
  '.....LTTTTT.....',
  '....TLTTTTTT....',
  '....TLTTTTTT....',
  '....TLTTTTTTS...', // the back hand at (12, 14)
  '....STTTTTT.....',
  '.....TTTTTT.....',
];
```

Rows 17–23, the legs. Standing: two legs at columns 5–6 and 9–10, shoes on the last two rows.
Front and back view, phase 1: the left leg (viewer's left) on the ground, the right leg lifted by
one pixel; phase 3 is the mirror. Side view, phase 1: the front leg reaches two pixels ahead, the
back leg is lifted; phase 3: the front leg is lifted, the back leg trails two pixels behind.
"Left" and "right" are the viewer's in every facing; the back view uses the front view's legs.

```ts
const LEGS_STANDING = [
  '.....PPPPPP.....',
  '.....PPPPPP.....',
  '.....PP..PP.....',
  '.....PP..PP.....',
  '.....PP..PP.....',
  '.....KK..KK.....',
  '.....KK..KK.....',
];
const LEGS_FRONT_LEFT_FORWARD = [
  '.....PPPPPP.....',
  '.....PPPPPP.....',
  '.....PP..PP.....',
  '.....PP..PP.....',
  '.....PP..KK.....',
  '.....KK..KK.....',
  '.....KK.........',
];
const LEGS_LEFT_STRIDE_FORWARD = [
  '.....PPPPPP.....',
  '....PPPPPPP.....',
  '...PP....PP.....',
  '...PP....PP.....',
  '...PP....KK.....',
  '...KK....KK.....',
  '...KK...........',
];
const LEGS_LEFT_STRIDE_BACK = [
  '.....PPPPPP.....',
  '.....PPPPPPP....',
  '.....PP....PP...',
  '.....PP....PP...',
  '.....KK....PP...',
  '.....KK....KK...',
  '...........KK...',
];
```

**Composition rules.** `BLANK` is sixteen dots.

- `mirror(rows)` reverses every row. `raised(rows)` is `[...rows.slice(1), BLANK]`: row 0 was
  blank, so nothing is lost.
- The three poses of a facing — `standing`, `stride1`, `stride3` — are each
  `[BLANK, BLANK, ...head, ...torso, ...legs]` (2 + 9 + 6 + 7 = 24 rows):
  - `down`: `HEAD_DOWN`; torso `TORSO_DOWN` in all three; legs `LEGS_STANDING`,
    `LEGS_FRONT_LEFT_FORWARD`, `mirror(LEGS_FRONT_LEFT_FORWARD)`.
  - `up`: `HEAD_UP`; torso `TORSO_UP` in all three; the same legs as `down`.
  - `left`: `HEAD_LEFT`; torsos `TORSO_LEFT_STANDING`, `TORSO_LEFT_HAND_FORWARD`,
    `TORSO_LEFT_HAND_BACK`; legs `LEGS_STANDING`, `LEGS_LEFT_STRIDE_FORWARD`,
    `LEGS_LEFT_STRIDE_BACK`.
  - `right`: every pose of `left`, mirrored.
- `frameRows(facing, phase)`: phase 0 → `standing`; 1 → `stride1`; 3 → `stride3`; 2 and 4 →
  `raised(standing)`; anything else throws. Use `if` chains, not a `switch` with fall-through.
- `renderPlayer()`: for each facing index `f` and phase `p`, frame `n = f × 5 + p`; for each row
  `y` and column `x`, a letter other than `.` writes `[...rgb(colour), 255]` at
  `((y × SHEET_WIDTH) + n × FRAME_WIDTH + x) × 4`. Look colours up through
  `new Map<string, PaletteColour>(Object.entries(INKS))` so that `.get(letter)` is typed
  `PaletteColour | undefined` without a cast.

What the rows guarantee, and the test checks: the standing frame differs from phases 1 and 3
(legs) and from 2 and 4 (raised); the four standing frames differ (eyes and the lanyard V facing
down; hair only, no `L`, facing up; one eye at column 5 and a strap at column 5 facing left;
mirrored facing right); phases 2 and 4 are identical to each other, which the spec allows.

```ts
// tools/gen-sprites.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { renderPlayer, SHEET_HEIGHT, SHEET_WIDTH } from './placeholder-player.ts';

export function encodePng(): Buffer {
  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
  png.data = Buffer.from(renderPlayer());
  return PNG.sync.write(png);
}

if (import.meta.main) {
  mkdirSync('public/sprites', { recursive: true });
  writeFileSync('public/sprites/player.png', encodePng());
}
```

- [ ] **Step 1: tooling.** Add the `gen-sprites` script to `package.json`; change `function rgb`
  in `tools/placeholder-tiles.ts` to `export function rgb`. `npm run typecheck` still green.
- [ ] **Step 2: write the failing test** `tests/unit/gen-sprites.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { FRAME_HEIGHT, FRAME_WIDTH } from '../../src/engine/sprite';
import { FACINGS, PHASES_PER_FACING } from '../../src/game/state';
import { encodePng } from '../../tools/gen-sprites.ts';
import {
  FRAME_COUNT,
  INKS,
  renderPlayer,
  SHEET_HEIGHT,
  SHEET_WIDTH,
} from '../../tools/placeholder-player.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PNG_FILE = join(ROOT, 'public/sprites/player.png');
const BLANK = '................';
/** Colour → letter, the generator's own notation, so a failure prints a readable frame. */
const LETTERS = new Map(Object.entries(INKS).map(([letter, colour]) => [colour, letter]));

/** Frame `index` of the sheet as 24 rows of letters; `.` is transparent, `?` an unknown colour. */
function frameText(data: Uint8Array, index: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    let row = '';
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      const o = (y * SHEET_WIDTH + index * FRAME_WIDTH + x) * 4;
      const colour = `#${[data[o], data[o + 1], data[o + 2]]
        .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
        .join('')}`;
      row += data[o + 3] === 0 ? '.' : (LETTERS.get(colour) ?? '?');
    }
    rows.push(row);
  }
  return rows;
}

const SHEET = renderPlayer();
const frame = (facing: number, phase: number) =>
  frameText(SHEET, facing * PHASES_PER_FACING + phase);

describe('the placeholder figure generator', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodePng().equals(encodePng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(PNG_FILE));
    expect([committed.width, committed.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
    expect(Buffer.from(SHEET).equals(committed.data)).toBe(true);
  });

  it('is 320x24: twenty 16x24 frames in one row', () => {
    expect(FRAME_COUNT).toBe(FACINGS.length * PHASES_PER_FACING);
    expect([SHEET_WIDTH, SHEET_HEIGHT]).toStrictEqual([320, 24]);
    expect(SHEET).toHaveLength(320 * 24 * 4);
  });

  it('uses only the six figure colours, each pixel opaque or transparent', () => {
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      expect(frameText(SHEET, index).join('\n'), `frame ${index}`).not.toContain('?');
    }
  });

  it('differs the standing frame from every walking frame, per facing', () => {
    for (const [f, facing] of FACINGS.entries()) {
      for (let phase = 1; phase < PHASES_PER_FACING; phase += 1) {
        expect(frame(f, phase), `${facing} phase ${phase}`).not.toStrictEqual(frame(f, 0));
      }
    }
  });

  it('differs the four standing frames from each other', () => {
    for (let a = 0; a < FACINGS.length; a += 1) {
      for (let b = a + 1; b < FACINGS.length; b += 1) {
        expect(frame(a, 0), `${FACINGS[a]} vs ${FACINGS[b]}`).not.toStrictEqual(frame(b, 0));
      }
    }
  });

  it('raises phases 2 and 4 by one pixel from the standing pose', () => {
    for (const [f, facing] of FACINGS.entries()) {
      const raised = [...frame(f, 0).slice(1), BLANK];
      expect(frame(f, 2), facing).toStrictEqual(raised);
      expect(frame(f, 4), facing).toStrictEqual(raised);
    }
  });

  it('shows the facing by the eyes and the lanyard', () => {
    const [down, up, left, right] = [frame(0, 0), frame(1, 0), frame(2, 0), frame(3, 0)];
    expect([down[7]?.[6], down[7]?.[9]], 'two eyes facing down').toStrictEqual(['K', 'K']);
    expect(down.join(''), 'the lanyard facing down').toContain('L');
    expect(up.slice(2, 10).join(''), 'hair only facing up').toMatch(/^[H.]+$/);
    expect(up.join(''), 'no lanyard facing up').not.toContain('L');
    expect(left[7]?.[5], 'the eye at the left edge of the face').toBe('K');
    expect(left[7]?.[10]).not.toBe('K');
    expect(right[7]?.[10], 'the eye at the right edge of the face').toBe('K');
    expect(right[7]?.[5]).not.toBe('K');
  });

  it('keeps everything outside the figure transparent: the first and last rows of a standing frame', () => {
    expect(frame(0, 0)[0]).toBe(BLANK);
    expect(frame(0, 2)[23]).toBe(BLANK);
  });
});
```

- [ ] **Step 3: run it, see it fail** (`npx vitest run tests/unit/gen-sprites.test.ts`): modules
  missing.
- [ ] **Step 4: write `tools/placeholder-player.ts`** with the parts, the composition rules and
  `renderPlayer()`, then `tools/gen-sprites.ts` as given.
- [ ] **Step 5: generate** — `npm run gen-sprites` (this is also the proof that Node runs the
  tool and its imports; if Node reports an unresolved import, a value import crept into
  `src/game/state.ts` — fix that, do not add `.ts` extensions to `src/`). Run the test file:
  green. Run `npm run gen-sprites` a second time and `git status`: nothing beyond the new files.
- [ ] **Step 6: the asset test names the sheet.** In `tests/unit/assets.test.ts`, inside
  `describe('every PNG under public/ is a palette PNG (INV-6)')`, add:

```ts
  it('checks the player sheet under public/sprites/ with every other PNG', () => {
    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/player.png');
  });
```

  Run `npx vitest run tests/unit/assets.test.ts`: the glob test and the palette test over every
  PNG both pass on the sheet; the multiple-of-16 test still globs `public/tiles/` only.
- [ ] **Step 7: look at it.** Read `public/sprites/player.png` with the Read tool (it shows
  images). Twenty frames: down, up, left, right, the first of each five standing. Fix a row
  before committing if a frame is visibly wrong; the rows above are the plan's, the result is
  the author's call in acceptance.
- [ ] **Step 8: `npm run check`; commit** — `Add the placeholder figure generator`; why: a
  deterministic, in-palette sheet fixes the frame layout — facing × 5 + phase — before any art
  exists, so the art pass replaces one file and no code (`visual.md` §5).

---

### Task 3: The keyboard and the binding resolver

**Files:**
- Create: `src/engine/input.ts`, `tests/unit/input.test.ts`

**Interfaces — produces:**

```ts
// src/engine/input.ts
/**
 * The keyboard (architecture.md §4): which physical keys are down, by KeyboardEvent.code, so W
 * is W on QWERTZ and on QWERTY. A repeated keydown changes nothing — that matters after
 * releaseAll: a key still held when the page regains focus keeps repeating and must not press
 * itself again. The edge ("went down this step") is not here yet; the lamp (M3) brings it.
 */

export interface Keyboard {
  /** The codes down right now. Live: read it once per frame, do not keep it. */
  readonly held: ReadonlySet<string>;
  /** A keydown; one with `repeat` changes nothing. */
  keyDown(event: { readonly code: string; readonly repeat: boolean }): void;
  keyUp(event: { readonly code: string }): void;
  /** On blur and when the page is hidden: no keyup will come for what is held. */
  releaseAll(): void;
}

export function createKeyboard(): Keyboard {
  const held = new Set<string>();
  return {
    held,
    keyDown(event) {
      if (!event.repeat) {
        held.add(event.code);
      }
    },
    keyUp(event) {
      held.delete(event.code);
    },
    releaseAll() {
      held.clear();
    },
  };
}

/** Feeds a window's keydown, keyup and blur and its document's visibilitychange into the keyboard. */
export function listenToKeyboard(keyboard: Keyboard, target: Window): void {
  target.addEventListener('keydown', (event) => keyboard.keyDown(event));
  target.addEventListener('keyup', (event) => keyboard.keyUp(event));
  target.addEventListener('blur', () => keyboard.releaseAll());
  target.document.addEventListener('visibilitychange', () => {
    if (target.document.visibilityState === 'hidden') {
      keyboard.releaseAll();
    }
  });
}

/** Keys per action, by KeyboardEvent.code. The table itself lives in main.ts. */
export type Bindings<A extends string> = Readonly<Record<A, readonly string[]>>;

/** An action is on when any of its keys is down. Pure. */
export function resolveActions<A extends string>(
  held: ReadonlySet<string>,
  bindings: Bindings<A>,
): Readonly<Record<A, boolean>> {
  const actions: Partial<Record<A, boolean>> = {};
  // Object.keys is typed string[]; the cast narrows it to the table's own keys.
  for (const action of Object.keys(bindings) as A[]) {
    actions[action] = bindings[action].some((code) => held.has(code));
  }
  return actions as Record<A, boolean>;
}
```

- [ ] **Step 1: write the failing tests** `tests/unit/input.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type Bindings, createKeyboard, resolveActions } from '../../src/engine/input';

describe('the keyboard', () => {
  it('records a key going down and up by its code', () => {
    const keyboard = createKeyboard();
    keyboard.keyDown({ code: 'KeyW', repeat: false });
    expect([...keyboard.held]).toStrictEqual(['KeyW']);
    keyboard.keyUp({ code: 'KeyW' });
    expect(keyboard.held.size).toBe(0);
  });

  it('holds several keys at once and releases them one by one', () => {
    const keyboard = createKeyboard();
    keyboard.keyDown({ code: 'ArrowRight', repeat: false });
    keyboard.keyDown({ code: 'KeyW', repeat: false });
    expect([...keyboard.held].sort()).toStrictEqual(['ArrowRight', 'KeyW']);
    keyboard.keyUp({ code: 'ArrowRight' });
    expect([...keyboard.held]).toStrictEqual(['KeyW']);
  });

  it('ignores a repeated keydown, also for a key released by releaseAll', () => {
    const keyboard = createKeyboard();
    keyboard.keyDown({ code: 'KeyD', repeat: true });
    expect(keyboard.held.size).toBe(0);
    keyboard.keyDown({ code: 'KeyD', repeat: false });
    keyboard.keyDown({ code: 'KeyD', repeat: true });
    expect([...keyboard.held]).toStrictEqual(['KeyD']);
    keyboard.releaseAll();
    // The OS keeps repeating a key that is still held when the page regains focus.
    keyboard.keyDown({ code: 'KeyD', repeat: true });
    expect(keyboard.held.size).toBe(0);
  });

  it('ignores a keyup for a key that is not down', () => {
    const keyboard = createKeyboard();
    keyboard.keyUp({ code: 'KeyA' });
    expect(keyboard.held.size).toBe(0);
  });

  it('releases every key at once', () => {
    const keyboard = createKeyboard();
    for (const code of ['KeyA', 'KeyD', 'ArrowUp']) {
      keyboard.keyDown({ code, repeat: false });
    }
    keyboard.releaseAll();
    expect(keyboard.held.size).toBe(0);
  });
});

describe('resolveActions', () => {
  type Action = 'up' | 'down' | 'left' | 'right' | 'fullscreen';
  const BINDINGS: Bindings<Action> = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    fullscreen: ['KeyF'],
  };
  const OFF = { up: false, down: false, left: false, right: false, fullscreen: false };

  it('turns held keys into actions, one action from either of its keys', () => {
    expect(resolveActions(new Set(['KeyW']), BINDINGS)).toStrictEqual({ ...OFF, up: true });
    expect(resolveActions(new Set(['ArrowUp']), BINDINGS)).toStrictEqual({ ...OFF, up: true });
    expect(resolveActions(new Set(['ArrowUp', 'KeyD']), BINDINGS)).toStrictEqual({
      ...OFF,
      up: true,
      right: true,
    });
  });

  it('gives every action off for no keys and for unbound keys', () => {
    expect(resolveActions(new Set(), BINDINGS)).toStrictEqual(OFF);
    expect(resolveActions(new Set(['Space', 'KeyQ']), BINDINGS)).toStrictEqual(OFF);
  });

  it('does not mind both keys of one action being down', () => {
    expect(resolveActions(new Set(['ArrowUp', 'KeyW']), BINDINGS)).toStrictEqual({
      ...OFF,
      up: true,
    });
  });
});
```

- [ ] **Step 2: see them fail; write `src/engine/input.ts`; see them pass.**
- [ ] **Step 3: `npm run check`; commit** — `Record the keyboard by key code`; why: the physical
  key counts so that WASD works on QWERTZ, and ignoring repeats is what keeps a key released on
  blur released until it is pressed again.

---

### Task 4: The loop reads the input once per frame, and `main.ts` wires the table

**Files:**
- Modify: `src/engine/loop.ts`, `tests/unit/loop.test.ts`, `src/main.ts`
- Create: `src/game/player.ts` (the `MovementInput` type only; Task 5 adds the rules)

**Interfaces — produces:**

```ts
// src/engine/loop.ts (changes)
export const STEPS_PER_SECOND = 60;
export const STEP_MS = 1000 / STEPS_PER_SECOND;

export interface LoopCallbacks<S, I> {
  /** Called once per frame, before that frame's steps; every step of the frame sees the result. */
  readInput(): I;
  update(state: S, input: I): S;
  render(state: S): void;
}

export function runLoop<S, I>(
  initial: S,
  callbacks: LoopCallbacks<S, I>,
  requestFrame: RequestFrame,
): void;
```

In `frame`, after `accumulator = result.accumulator`: `const input = callbacks.readInput();`
then `state = callbacks.update(state, input)` in the loop. Update the file comment: the input is
read once per frame so that every step of a frame sees the same actions (`architecture.md` §3).

```ts
// src/game/player.ts (Task 4 content)
/** The four movement actions, resolved by main.ts once per frame from the held keys. */
export interface MovementInput {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}
```

`src/main.ts` additions (the existing F listener is replaced):

```ts
import { type Bindings, createKeyboard, listenToKeyboard, resolveActions } from './engine/input';
import type { MovementInput } from './game/player';

type Action = keyof MovementInput | 'fullscreen';

/** architecture.md §4: the one table from physical keys to actions. */
const BINDINGS: Bindings<Action> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  fullscreen: ['KeyF'],
};
const BOUND_CODES: ReadonlySet<string> = new Set(Object.values(BINDINGS).flat());

const keyboard = createKeyboard();
listenToKeyboard(keyboard, window);

// A bound key without Ctrl, Alt or Cmd belongs to the game: its default is prevented, so the
// arrows never scroll the page; with a modifier the browser keeps its own shortcut. F toggles
// fullscreen once per press here and never reaches the game.
window.addEventListener('keydown', (event) => {
  if (!BOUND_CODES.has(event.code) || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  event.preventDefault();
  if (BINDINGS.fullscreen.includes(event.code) && !event.repeat) {
    toggleFullscreen();
  }
});

/** The movement actions of this frame; `fullscreen` stays in main.ts. */
function readInput(): MovementInput {
  const { up, down, left, right } = resolveActions(keyboard.held, BINDINGS);
  return { up, down, left, right };
}
```

and in `start()`: `runLoop(createInitialState(content.map), { readInput, update, render() { … } }, …)`.
The game's `update` still takes one parameter here; a function with fewer parameters is
assignable to `update(state, input)`, so nothing else changes until Task 5.

- [ ] **Step 1: write the failing test.** In `tests/unit/loop.test.ts`, change `startCounting`
  to pass `readInput: () => undefined` and add to `describe('runLoop with a fake clock (INV-3)')`:

```ts
  it('reads the input once per frame, before the steps, and every step of the frame sees it', () => {
    const frames = fakeFrames();
    let reads = 0;
    const seen: number[] = [];
    runLoop(
      0,
      {
        readInput: () => {
          reads += 1;
          return reads;
        },
        update: (n: number, input: number) => {
          seen.push(input);
          return n + 1;
        },
        render: () => undefined,
      },
      frames.request,
    );
    frames.fire(1000); // the first frame runs no step and still reads the input once
    frames.fire(1100); // 100 ms: five steps, one read
    expect(reads).toBe(2);
    expect(seen).toStrictEqual([2, 2, 2, 2, 2]);
  });
```

  Also assert, in the existing `'has a step of 1/60 s'`, that `STEPS_PER_SECOND` is 60.
- [ ] **Step 2: run the loop tests, see the new one fail** (and the others fail to compile until
  `readInput` exists); change `loop.ts`; all loop tests green — the four existing `runLoop` tests
  and every `advance` test unchanged.
- [ ] **Step 3: wire `main.ts`** as above and create `src/game/player.ts` with the type.
  `npm run check` green; `npm run test:e2e` green (nothing moves yet).
- [ ] **Step 4: look at it.** `npm run dev`, open the page in the browser pane, press an arrow:
  the page does not scroll (it could not anyway, `overflow: hidden`), F still toggles fullscreen
  for the author (the pane cannot — see Task 10), no console error.
- [ ] **Step 5: commit** — `Read the input once per frame`; why: the spec wants every step of a
  frame to see the same actions, and the loop is the one place that knows where a frame begins.

---

### Task 5: Movement, facing and the clamp

**Files:**
- Modify: `src/game/player.ts`, `src/game/update.ts`, `src/main.ts`, `tests/unit/state.test.ts`
- Create: `tests/unit/player.test.ts`

**Interfaces — produces:**

```ts
// src/game/player.ts
import { STEPS_PER_SECOND } from '../engine/loop';
import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import { TILE_SIZE, type TileMap } from '../engine/tiled';
import type { Facing, PlayerState } from './state';

export interface MovementInput { … }           // from Task 4

/** Tune: 80 px/s is 1.333 px per step. */
export const SPEED_PX_PER_SECOND = 80;
const STEP_DISTANCE = SPEED_PX_PER_SECOND / STEPS_PER_SECOND;

export interface Vector { readonly x: number; readonly y: number }

/** The sum of the active actions, normalized: opposite actions cancel; a diagonal has length 1. */
export function movementVector(input: MovementInput): Vector {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

/** A horizontal component wins; a vertical one alone faces up or down; nothing keeps the facing. */
function facingOf(vector: Vector, current: Facing): Facing {
  if (vector.x !== 0) {
    return vector.x > 0 ? 'right' : 'left';
  }
  if (vector.y !== 0) {
    return vector.y > 0 ? 'down' : 'up';
  }
  return current;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * One step: move along the vector, clamp the feet so the whole 16x24 sprite stays inside the
 * map, turn. "Moving" is the vector before the clamp, so a figure held at an edge keeps its
 * facing and its walk cycle.
 */
export function stepPlayer(player: PlayerState, input: MovementInput, map: TileMap): PlayerState {
  const vector = movementVector(input);
  const halfWidth = FRAME_WIDTH / 2;
  return {
    x: clamp(player.x + vector.x * STEP_DISTANCE, halfWidth, map.width * TILE_SIZE - halfWidth),
    y: clamp(player.y + vector.y * STEP_DISTANCE, FRAME_HEIGHT, map.height * TILE_SIZE),
    facing: facingOf(vector, player.facing),
    frame: player.frame,          // Task 6 replaces these two lines with the walk cycle
    frameTimer: player.frameTimer,
  };
}
```

```ts
// src/game/update.ts
import type { TileMap } from '../engine/tiled';
import { type MovementInput, stepPlayer } from './player';
import type { GameState } from './state';

/** Advances the game by exactly one logic step and returns the new state; the input is kept. */
export function update(state: GameState, input: MovementInput, content: TileMap): GameState {
  return { tick: state.tick + 1, player: stepPlayer(state.player, input, content) };
}
```

`src/main.ts`: `update: (state, input) => update(state, input, content.map)` in the callbacks.

- [ ] **Step 1: write the failing tests** `tests/unit/player.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type MovementInput, movementVector, stepPlayer } from '../../src/game/player';
import { createInitialState, type Facing, type PlayerState } from '../../src/game/state';
import { grassMap } from './grass-map';

/** 20x12 tiles, 320x192 px, like the test map; the player starts mid-map. */
const MAP = grassMap(20, 12, { x: 160, y: 96 });
const NONE: MovementInput = { up: false, down: false, left: false, right: false };

function press(...actions: readonly (keyof MovementInput)[]): MovementInput {
  return {
    up: actions.includes('up'),
    down: actions.includes('down'),
    left: actions.includes('left'),
    right: actions.includes('right'),
  };
}

function standing(x: number, y: number, facing: Facing = 'down'): PlayerState {
  return { x, y, facing, frame: 0, frameTimer: 0 };
}

function walk(player: PlayerState, input: MovementInput, steps: number): PlayerState {
  let current = player;
  for (let i = 0; i < steps; i += 1) {
    current = stepPlayer(current, input, MAP);
  }
  return current;
}

describe('movementVector', () => {
  it('is zero for no input, for opposite actions and for all four', () => {
    for (const input of [NONE, press('left', 'right'), press('up', 'down'), press('up', 'down', 'left', 'right')]) {
      expect(movementVector(input)).toStrictEqual({ x: 0, y: 0 });
    }
  });

  it('has length 1 on an axis and on a diagonal', () => {
    expect(movementVector(press('right'))).toStrictEqual({ x: 1, y: 0 });
    expect(movementVector(press('up'))).toStrictEqual({ x: 0, y: -1 });
    const diagonal = movementVector(press('down', 'right'));
    expect(diagonal.x).toBeCloseTo(0.7071, 4);
    expect(diagonal.y).toBeCloseTo(0.7071, 4);
  });
});

describe('stepPlayer: movement at 80 px/s', () => {
  it('moves 1.333 px per step on an axis', () => {
    const moved = stepPlayer(standing(160, 96), press('right'), MAP);
    expect(moved.x).toBeCloseTo(161.3333, 3);
    expect(moved.y).toBe(96);
  });

  it('moves 0.943 px on each axis per diagonal step, so diagonal speed equals axis speed', () => {
    const moved = stepPlayer(standing(160, 96), press('up', 'left'), MAP);
    expect(moved.x).toBeCloseTo(159.0572, 3);
    expect(moved.y).toBeCloseTo(95.0572, 3);
  });

  it('crosses the 304 px from the left edge to the right edge in 228 steps: 3.8 s', () => {
    expect(walk(standing(8, 96), press('right'), 227).x).toBeLessThan(312);
    expect(walk(standing(8, 96), press('right'), 228).x).toBeCloseTo(312, 6);
  });

  it('does not move when opposite actions cancel or all four are held', () => {
    for (const input of [press('left', 'right'), press('up', 'down'), press('up', 'down', 'left', 'right')]) {
      const moved = stepPlayer(standing(160, 96), input, MAP);
      expect([moved.x, moved.y]).toStrictEqual([160, 96]);
    }
  });

  it('leaves its input unchanged', () => {
    const player = standing(160, 96);
    stepPlayer(player, press('right'), MAP);
    expect(player).toStrictEqual(standing(160, 96));
  });
});

describe('stepPlayer: facing', () => {
  it('follows the horizontal component on a diagonal', () => {
    expect(stepPlayer(standing(160, 96), press('down', 'right'), MAP).facing).toBe('right');
    expect(stepPlayer(standing(160, 96), press('up', 'left'), MAP).facing).toBe('left');
  });

  it('faces up or down on vertical movement alone', () => {
    expect(stepPlayer(standing(160, 96), press('up'), MAP).facing).toBe('up');
    expect(stepPlayer(standing(160, 96, 'left'), press('down'), MAP).facing).toBe('down');
  });

  it('keeps the last facing when standing still and when opposite actions cancel', () => {
    const faced = walk(standing(160, 96), press('right'), 3);
    expect(stepPlayer(faced, NONE, MAP).facing).toBe('right');
    expect(stepPlayer(faced, press('left', 'right'), MAP).facing).toBe('right');
    expect(stepPlayer(standing(160, 96, 'up'), NONE, MAP).facing).toBe('up');
  });
});

describe('stepPlayer: the clamp keeps the whole sprite inside the map', () => {
  it('keeps the feet x within [8, mapWidth − 8]', () => {
    expect(stepPlayer(standing(8.5, 96), press('left'), MAP).x).toBe(8);
    expect(stepPlayer(standing(311.5, 96), press('right'), MAP).x).toBe(312);
  });

  it('keeps the feet y within [24, mapHeight]', () => {
    expect(stepPlayer(standing(160, 24.5), press('up'), MAP).y).toBe(24);
    expect(stepPlayer(standing(160, 191.5), press('down'), MAP).y).toBe(192);
  });

  it('holds the figure at a corner on a diagonal', () => {
    const cornered = walk(standing(10, 26), press('up', 'left'), 5);
    expect([cornered.x, cornered.y]).toStrictEqual([8, 24]);
  });

  it('leaves a figure held by the clamp facing its actions', () => {
    const held = walk(standing(8, 96), press('left'), 3);
    expect([held.x, held.facing]).toStrictEqual([8, 'left']);
  });
});

describe('createInitialState', () => {
  it("puts the player at the map's spawn, facing down, standing", () => {
    expect(createInitialState(grassMap(20, 12, { x: 40, y: 56 })).player).toStrictEqual({
      x: 40,
      y: 56,
      facing: 'down',
      frame: 0,
      frameTimer: 0,
    });
  });
});
```

  The diagonal numbers: `80 / 60 / √2 = 0.9428…`; `160 − 0.9428 = 159.0572`. The crossing: `228 ×
  1.3333… = 304` lands on the clamp at 312 within floating-point noise, hence `toBeCloseTo(…, 6)`;
  step 227 is still short of it.

  And `tests/unit/state.test.ts` follows the new signature. Replace `afterSteps` and the two
  tests that walk or call `update`; the rest of the file stays:

```ts
const NONE: MovementInput = { up: false, down: false, left: false, right: false };
const RIGHT: MovementInput = { ...NONE, right: true };
const UP_LEFT: MovementInput = { ...NONE, up: true, left: true };

/** Runs `steps` steps of each input in turn, from the initial state. */
function afterSteps(...legs: readonly (readonly [number, MovementInput])[]): GameState {
  let state = createInitialState(MAP);
  for (const [steps, input] of legs) {
    for (let i = 0; i < steps; i += 1) {
      state = update(state, input, MAP);
    }
  }
  return state;
}

  // in describe('GameState (INV-1)'):
  it('survives a JSON round trip unchanged when populated: a player that has walked', () => {
    const state = afterSteps([100, RIGHT], [37, UP_LEFT], [1097, NONE]);
    expect(state.tick).toBe(1234);
    expect(Number.isInteger(state.player.x), 'x is fractional after a diagonal').toBe(false);
    expect(state.player.facing).toBe('left');
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('is a plain object', () => {
    expect(Object.getPrototypeOf(afterSteps([3, RIGHT]))).toBe(Object.prototype);
  });

  // in describe('update'):
  it('advances tick by exactly one and steps the player', () => {
    const next = update({ tick: 41, player }, RIGHT, MAP);
    expect(next.tick).toBe(42);
    expect(next.player.x).toBeCloseTo(137.3333, 3);
    expect(next.player.facing).toBe('right');
  });

  it('leaves its input unchanged', () => {
    const state: GameState = { tick: 7, player };
    update(state, RIGHT, MAP);
    expect(state).toStrictEqual({ tick: 7, player });
  });
```

  (`MovementInput` is imported from `../../src/game/player`.) After 100 steps right from
  (136, 120) and 37 diagonal steps, `x` is `136 + 133.33 − 34.88 = 234.45…` and `y` is
  `85.11…`: fractional, inside the clamp, and the round trip of such numbers is exact because
  `JSON.stringify` prints doubles so that they parse back to the same double.

- [ ] **Step 2: see them fail; write `player.ts` and `update.ts`; change `main.ts`; see them
  pass.** The tests that mention the walk cycle come in Task 6.
- [ ] **Step 3: `npm run check`; commit** — `Move the figure in eight directions, clamped to the
  map`; why: speed is one number, diagonals are normalized so eight directions feel alike, and
  the clamp is the map-edge guard that collision (0005) keeps as a second line.

---

### Task 6: The walk cycle

**Files:**
- Modify: `src/game/player.ts`, `tests/unit/player.test.ts`

**Interfaces — produces:**

```ts
// src/game/player.ts (additions)
import { type Facing, type PlayerState, WALK_PHASES } from './state';

export const WALK_FRAMES_PER_SECOND = 8;
/**
 * Steps per phase: 7.5, so phases take 8 and 7 steps in turn. Every timer value is a multiple
 * of 0.5, which floating point holds exactly; the cycle never drifts.
 */
export const STEPS_PER_PHASE = STEPS_PER_SECOND / WALK_FRAMES_PER_SECOND;

/** Standing: phase 0, timer 0. The step that starts moving: phase 1, timer 0. Then +1 per step; at 7.5 the next phase. */
function walkCycle(
  player: PlayerState,
  moving: boolean,
): { readonly frame: number; readonly frameTimer: number } {
  if (!moving) {
    return { frame: 0, frameTimer: 0 };
  }
  if (player.frame === 0) {
    return { frame: 1, frameTimer: 0 };
  }
  const frameTimer = player.frameTimer + 1;
  if (frameTimer < STEPS_PER_PHASE) {
    return { frame: player.frame, frameTimer };
  }
  return { frame: (player.frame % WALK_PHASES) + 1, frameTimer: frameTimer - STEPS_PER_PHASE };
}
```

In `stepPlayer`: `const moving = vector.x !== 0 || vector.y !== 0;` and
`...walkCycle(player, moving)` in place of the two placeholder lines.

- [ ] **Step 1: write the failing tests**, a new `describe` in `tests/unit/player.test.ts`:

```ts
describe('stepPlayer: the walk cycle at 8 frames per second', () => {
  const at = (steps: number): [number, number] => {
    const walked = walk(standing(160, 96), press('right'), steps);
    return [walked.frame, walked.frameTimer];
  };

  it('shows phase 1 with timer 0 on the step that starts moving', () => {
    expect(at(1)).toStrictEqual([1, 0]);
  });

  it('advances the phase after 8, then 7 steps, exactly, and cycles 1–4', () => {
    expect(at(8)).toStrictEqual([1, 7]);
    expect(at(9)).toStrictEqual([2, 0.5]);
    expect(at(15)).toStrictEqual([2, 6.5]);
    expect(at(16)).toStrictEqual([3, 0]);
    expect(at(23)).toStrictEqual([3, 7]);
    expect(at(24)).toStrictEqual([4, 0.5]);
    expect(at(30)).toStrictEqual([4, 6.5]);
    expect(at(31)).toStrictEqual([1, 0]);
    // 60 steps after the origin are 8 phases of 7.5: the cycle is back where it started.
    expect(at(61)).toStrictEqual([1, 0]);
  });

  it('keeps the timer a multiple of 0.5 over a long walk: the arithmetic is exact', () => {
    let player = standing(160, 96);
    for (let step = 1; step <= 600; step += 1) {
      player = stepPlayer(player, press('down', 'left'), MAP);
      expect(Number.isInteger(player.frameTimer * 2), `step ${step}`).toBe(true);
      expect(player.frame, `step ${step}`).toBeGreaterThanOrEqual(1);
      expect(player.frame, `step ${step}`).toBeLessThanOrEqual(4);
    }
  });

  it('resets to the standing frame and timer 0 when the figure stops', () => {
    const walking = walk(standing(160, 96), press('right'), 5);
    expect([walking.frame, walking.frameTimer]).toStrictEqual([1, 4]);
    const stopped = stepPlayer(walking, NONE, MAP);
    expect([stopped.frame, stopped.frameTimer]).toStrictEqual([0, 0]);
  });

  it('resets when opposite actions cancel', () => {
    const walking = walk(standing(160, 96), press('right'), 5);
    const cancelled = stepPlayer(walking, press('left', 'right'), MAP);
    expect([cancelled.frame, cancelled.frameTimer]).toStrictEqual([0, 0]);
  });

  it('keeps stepping in place when the clamp holds the figure', () => {
    const held = walk(standing(8, 96), press('left'), 9);
    expect([held.x, held.facing, held.frame, held.frameTimer]).toStrictEqual([8, 'left', 2, 0.5]);
  });
});
```

- [ ] **Step 2: see them fail; add `walkCycle`; see them pass.** If `at(1)` gives `[1, 1]`, the
  step that starts the walk is counting itself — it sets the timer to 0. If `at(9)` gives
  `[2, 0.5]` but `at(16)` does not give `[3, 0]`, the timer is being compared before the
  increment — increment first, then compare.
- [ ] **Step 3: `npm run check`; commit** — `Animate the walk cycle at eight frames per second`;
  why: 60 / 8 is 7.5, and counting steps in halves keeps the cycle exact where milliseconds
  would drift (`architecture.md` §3 says the same about the accumulator).

---

### Task 7: Drawing the figure between `detail` and `above`

**Files:**
- Modify: `src/render/renderer.ts`, `src/render/canvas2d/canvas2d-renderer.ts`,
  `src/render/draw-map.ts`, `tests/unit/draw-map.test.ts`, `src/main.ts`
- Create: `src/render/draw-scene.ts`, `tests/unit/draw-scene.test.ts`

**Interfaces — produces:**

```ts
// src/render/renderer.ts (additions)
/** A decoded sprite sheet: frames of FRAME_WIDTH × FRAME_HEIGHT in one row (engine/sprite). */
export interface SpriteSheet {
  readonly image: ImageBitmap;
}
export interface Renderer {
  // … clear, fillRect, drawTile as before …
  /** Draws frame `frame` of the sheet with its top-left corner at (x, y), 16x24. */
  drawSprite(sheet: SpriteSheet, frame: number, x: number, y: number): void;
}

// src/render/draw-map.ts (additions)
/** Draws one layer: every non-empty cell (column, row) at (column × 16, row × 16). */
export function drawLayer(renderer: Renderer, map: TileMap, tileset: TilesetImage, name: TileLayerName): void;
// drawMap clears, then drawLayer for each of TILE_LAYER_NAMES — unchanged in behaviour.

// src/render/draw-scene.ts
import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import type { TileMap } from '../engine/tiled';
import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../game/state';
import { drawLayer } from './draw-map';
import { PAGE_BACKGROUND } from './palette';
import type { Renderer, SpriteSheet, TilesetImage } from './renderer';

/** Everything a frame draws from, loaded once by main.ts. */
export interface SceneContent {
  readonly map: TileMap;
  readonly tileset: TilesetImage;
  readonly playerSheet: SpriteSheet;
}

/** The frame in the player sheet: facing × 5 + phase, facings in FACINGS order. */
export function playerFrame(player: PlayerState): number {
  return FACINGS.indexOf(player.facing) * PHASES_PER_FACING + player.frame;
}

/**
 * One frame: ground, detail, the player, above. The sprite's top-left corner is at
 * (round(x) − 8, round(y) − 24): the feet are its bottom centre.
 */
export function drawScene(renderer: Renderer, state: GameState, content: SceneContent): void {
  renderer.clear(PAGE_BACKGROUND);
  drawLayer(renderer, content.map, content.tileset, 'ground');
  drawLayer(renderer, content.map, content.tileset, 'detail');
  const { player } = state;
  renderer.drawSprite(
    content.playerSheet,
    playerFrame(player),
    Math.round(player.x) - FRAME_WIDTH / 2,
    Math.round(player.y) - FRAME_HEIGHT,
  );
  drawLayer(renderer, content.map, content.tileset, 'above');
}
```

Canvas 2D: `drawSprite(sheet, frame, x, y)` calls
`draw.drawImage(sheet.image, frame * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT, x, y, FRAME_WIDTH, FRAME_HEIGHT)`.
Change the comment on `imageSmoothingEnabled` from "every tile" to "every tile and sprite".

`src/main.ts`: `const PLAYER_SHEET_URL = '/sprites/player.png';`; `loadContent()` returns
`SceneContent` with `playerSheet: { image: await loadImage(PLAYER_SHEET_URL) }` (load it after the
tileset image, sequentially — three small files, no need for `Promise.all`); `render(state)`
calls `drawScene(renderer, state, content)` instead of `drawMap`. `drawMap` is no longer imported
by `main.ts`.

- [ ] **Step 1: write the failing tests.** `tests/unit/draw-scene.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY, type TileMap } from '../../src/engine/tiled';
import type { GameState, PlayerState } from '../../src/game/state';
import { drawScene, playerFrame, type SceneContent } from '../../src/render/draw-scene';
import type { Renderer, SpriteSheet } from '../../src/render/renderer';

/** A renderer that only records what it was asked to draw, one line per call. */
function recordingRenderer(): Renderer & { readonly calls: string[]; readonly sheets: SpriteSheet[] } {
  const calls: string[] = [];
  const sheets: SpriteSheet[] = [];
  return {
    calls,
    sheets,
    clear(colour) {
      calls.push(`clear ${colour}`);
    },
    fillRect(x, y, width, height, colour) {
      calls.push(`fillRect ${x},${y} ${width}x${height} ${colour}`);
    },
    drawTile(_tileset, id, x, y) {
      calls.push(`drawTile ${id} at ${x},${y}`);
    },
    drawSprite(sheet, frame, x, y) {
      sheets.push(sheet);
      calls.push(`drawSprite ${frame} at ${x},${y}`);
    },
  };
}

/** The 3x2 map of draw-map.test.ts: ground with one empty cell, one detail tile, one above tile. */
const MAP: TileMap = {
  width: 3,
  height: 2,
  ground: [0, 1, EMPTY, 2, 2, 2],
  detail: [EMPTY, EMPTY, EMPTY, EMPTY, 4, EMPTY],
  above: [6, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  spawn: { x: 8, y: 8 },
  solid: [false, false, false, true, true, true],
};
const CONTENT: SceneContent = {
  map: MAP,
  tileset: { image: {} as ImageBitmap, columns: 7 },
  playerSheet: { image: {} as ImageBitmap },
};
const player = (fields: Partial<PlayerState>): PlayerState => ({
  x: 0,
  y: 0,
  facing: 'down',
  frame: 0,
  frameTimer: 0,
  ...fields,
});
const state = (fields: Partial<PlayerState>): GameState => ({ tick: 0, player: player(fields) });

describe('playerFrame', () => {
  it('is facing × 5 + phase, facings in the order down, up, left, right', () => {
    expect(playerFrame(player({ facing: 'down', frame: 0 }))).toBe(0);
    expect(playerFrame(player({ facing: 'down', frame: 4 }))).toBe(4);
    expect(playerFrame(player({ facing: 'up', frame: 3 }))).toBe(8);
    expect(playerFrame(player({ facing: 'left', frame: 1 }))).toBe(11);
    expect(playerFrame(player({ facing: 'right', frame: 4 }))).toBe(19);
  });
});

describe('drawScene', () => {
  it('clears, then draws ground, detail, the player, above', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }), CONTENT);
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
      'drawTile 0 at 0,0',
      'drawTile 1 at 16,0',
      'drawTile 2 at 0,16',
      'drawTile 2 at 16,16',
      'drawTile 2 at 32,16',
      'drawTile 4 at 16,16',
      'drawSprite 13 at 12,7', // round(20.4) − 8, round(30.6) − 24
      'drawTile 6 at 0,0',
    ]);
    expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet]);
  });

  it('puts the sprite so that the feet are its bottom centre: the spawn (136, 120) draws at (128, 96)', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 136, y: 120 }), CONTENT);
    expect(renderer.calls).toContain('drawSprite 0 at 128,96');
  });

  it('rounds the feet position before subtracting the offset', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 10.5, y: 24.5 }), CONTENT);
    expect(renderer.calls).toContain('drawSprite 0 at 3,1'); // round(10.5) = 11, round(24.5) = 25
  });
});
```

  And in `tests/unit/draw-map.test.ts`: the fake renderer gains
  `drawSprite(_sheet, frame, x, y) { calls.push(\`drawSprite ${frame} at ${x},${y}\`); }`, and a
  test:

```ts
  it('drawLayer draws one layer without clearing', () => {
    const renderer = recordingRenderer();
    drawLayer(renderer, MAP, TILESET, 'detail');
    expect(renderer.calls).toStrictEqual(['drawTile 4 at 16,16']);
  });
```

- [ ] **Step 2: see them fail; add `SpriteSheet` and `drawSprite` to the interface, the Canvas
  2D implementation, `drawLayer`, and `draw-scene.ts`; see them pass.** `drawMap`'s existing
  tests stay green.
- [ ] **Step 3: wire `main.ts`**; `npm run test:e2e` stays green (the corner pixel is still grass:
  the figure is drawn at (128, 96)).
- [ ] **Step 4: look at it.** `npm run dev`, open `http://localhost:5173` in the browser pane: the
  figure stands below and left of the path crossing, facing down, both eyes and the lanyard
  visible, feet in tile (8, 7). Press keys in the pane: a tap moves it a frame's worth. Fix what
  is off before committing.
- [ ] **Step 5: `npm run check`; commit** — `Draw the figure between detail and above`; why: the
  draw order is a property of one function with a test, and the sprite is anchored at its feet
  so that `above` tiles hide a head and never a foot.

---

### Task 8: The debug handle and the smoke test

**Files:**
- Modify: `src/main.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces — produces:**

```ts
// src/main.ts (additions)
declare global {
  interface Window {
    /**
     * The game's one global (0004): the state passed to the last render, so that the smoke test
     * can read the player's position. Read-only by convention; absent until the content loaded.
     */
    shadowAi?: { state: GameState };
  }
}

async function start(): Promise<void> {
  const renderer = createCanvas2dRenderer(findCanvas());
  const content = await loadContent();
  const handle = { state: createInitialState(content.map) };
  window.shadowAi = handle;
  runLoop(
    handle.state,
    {
      readInput,
      update: (state, input) => update(state, input, content.map),
      render(state) {
        handle.state = state;
        drawScene(renderer, state, content);
        renderer.present(
          computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio),
        );
      },
    },
    (callback) => {
      window.requestAnimationFrame(callback);
    },
  );
}
```

- [ ] **Step 1: write the failing smoke test.** Append to `tests/e2e/smoke.spec.ts`, before the
  container block:

```ts
test('one second of ArrowRight moves the figure right by at least 70 px', async ({ page }) => {
  await page.goto('/');
  // The handle appears with the first frame; the figure starts at the spawn, x = 136.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.player.x), {
      message: 'window.shadowAi.state.player.x is the spawn: the game runs',
    })
    .toBe(136);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1000);
  await page.keyboard.up('ArrowRight');
  const player = await page.evaluate(() => window.shadowAi?.state.player);
  expect(player?.x).toBeGreaterThanOrEqual(136 + 70); // 60 steps of 1.333 px are 80; CI may drop a few frames
  expect(player?.facing).toBe('right');
});
```

  Playwright's `keyboard.down` sends one keydown with `repeat: false` (checked 2026-11-02 in
  `@playwright/test`'s types: only subsequent `down` calls for the same key repeat), so the
  keyboard of Task 3 records it like a real press.
- [ ] **Step 2: run `npm run test:e2e`; see it fail** (`window.shadowAi` undefined).
- [ ] **Step 3: add the declaration and the handle to `main.ts`; `npm run typecheck`** — the
  spec compiles against the global; `npm run test:e2e` green.
- [ ] **Step 4: `npm run check`** — the architecture test still passes: `window` appears in
  `main.ts` only. Commit — `Expose the rendered state for the smoke test`; why: the smoke test
  proves the game reacts, and reading the state is the one way to do that without comparing
  pixels (`testing.md` §4).

---

### Task 9: Specification and README

**Files:**
- Modify: `docs/spec/architecture.md` §1, §2, §3, §4, §5, §7; `docs/spec/testing.md` §1, §2;
  `README.md`

- [ ] `architecture.md` §1: `main.ts` also "keeps the state it rendered last as
  `window.shadowAi.state`, the game's one global"; `game/` is "`update(state, input, content)`";
  `render/` gains "the draw order of a frame (`draw-scene`)"; `public/sprites/` "sprite sheets
  as PNG, generated by `tools/gen-sprites.ts` and committed"; `tools/placeholder-player.ts` and
  `gen-sprites.ts` lines. §2: the player as `{ x, y, facing, frame, frameTimer }` — the feet in
  pixels, floating point; `facing` one of `down`, `up`, `left`, `right`; `frame` the phase 0–4;
  `frameTimer` in steps — and `createInitialState(map)` from the map's spawn; `input` is the
  four movement actions as booleans, `content` the map. §3: `input = readInput()` once per
  frame before the `while`, and `runLoop` takes `readInput`. §4 as built: which keys are down by
  `code`, released on `blur` and when hidden, a repeated keydown ignored and why; `main.ts`
  resolves the table once per frame; a bound key without Ctrl, Alt or Cmd has its default
  prevented; `fullscreen` is toggled in `main.ts` and never reaches the game; "which went down
  this step" is not there yet — the lamp brings it. §5: `drawSprite(sheet, frame, x, y)` from a
  sheet of 16x24 frames in one row; the scene order ground, detail, player, above; the sprite at
  `(round(x) − 8, round(y) − 24)`. §7: the sprite generator paragraph — `placeholder-player.ts`
  pure, `gen-sprites.ts` writes `public/sprites/player.png`, 320x24, frame `facing × 5 + phase`,
  facings down, up, left, right, phase 0 standing; not a tileset: no `.tsj`, the multiple-of-16
  rule is for `public/tiles/` only; the committed-file test; the art pass replaces the file.
- [ ] `testing.md` §1 Unit row: add the player's movement, facing, clamp and walk cycle; the
  keyboard state and the binding resolver; the loop's once-per-frame input; the sprite generator
  against the committed sheet; the draw order of the scene. Smoke row: "one second of ArrowRight
  moves the player by at least 70 px" without "from 0004". §2: INV-1 row "a populated `GameState`
  whose player has walked"; INV-3 row adds "the input is read once per frame and every step of
  the frame sees it".
- [ ] `README.md` status: the figure walks (0004); collision is 0005. "Run it": add
  `npm run gen-sprites    # regenerate the placeholder figure under public/sprites/`.
- [ ] Commit — `Record the figure, the input path and the sprite pipeline as built`.

---

### Task 10: Acceptance

- [ ] Merge `origin/main` into the branch (`git fetch origin && git merge origin/main`); rerun
  `npm run check`, `npm run test:e2e`, then `docker build -t shadow-ai .`,
  `docker run --rm -p 8080:8080 shadow-ai` and `BASE_URL=http://localhost:8080 npm run test:e2e`
  — the handle and the key test must pass against nginx too.
- [ ] Run the spec's acceptance plan, steps 1–22, and report every step with its result. The
  app's browser pane cannot hold a key down, cannot hide the game tab and never resolves
  `requestFullscreen` (memory: acceptance-run-browser-limits). So: steps 1–2 and 17–18 in the
  pane (screenshot; `shadowAi.state.player` through the JavaScript tool). Steps 3–16 with a
  Playwright Chromium script run from the repository root
  (`require(require.resolve('@playwright/test', { paths: [process.cwd()] }))`, headed or
  headless, against the dev server): `keyboard.down`/`up` with waits for the holds, a
  screenshot to the scratchpad after each expected result, `page.evaluate(() =>
  window.shadowAi.state.player)` for positions and facings; for steps 15–16 open a second page,
  `bringToFront()` it while `KeyD` is down, wait two seconds, bring the game back, and read the
  state — if headless Chromium does not fire `visibilitychange` or `blur` for that, say so and
  additionally dispatch `window.dispatchEvent(new Event('blur'))` to show the release path, and
  name the real tab switch as the author's step. Steps 19–20 in the shell. Steps 21–22: read
  `public/sprites/player.png` with the Read tool. Note the feel questions (speed, cycle, does it
  read as a person) with your own observations; the numbers are the author's.
- [ ] Push `feature/0004-the-figure`; open the pull request against `main` with the step
  results, "no new dependency", and the attribution trailer. Bind the PR with the app's PR tools
  and read CI: both smoke runs (dev server and container) must be green.
- [ ] Hand back to the author for the acceptance run. The merge is the acceptance; then the
  author or a follow-up sets `Status: implemented`.

## Self-review against the spec

- Scope "In": generator and `npm run gen-sprites` (T2); `engine/input` with blur and hidden
  release and the pure resolver (T3); the binding table in `main.ts` with `fullscreen` (T4);
  `GameState.player` and the initial state from the map (T1); `update(state, input, content)`
  (T5); `player.ts` — 80 px/s, normalized diagonal, cancelling, facing, 8 fps cycle, the clamp
  (T5, T6); `drawSprite`, `draw-scene`, `drawLayer` (T7); `window.shadowAi.state` (T8); the spec
  files and the README (T9). Scope "Out": nothing here reads `solid`, moves a camera, reads a
  gamepad, remaps a key or records a key edge.
- Behaviour: the sheet's layout and colours → T2 rows and `INKS`; not a tileset → the glob test
  in T2; `drawSprite` → T7. Input by `code`, repeat ignored, blur and hidden → T3; once per frame
  → T4 loop test; `fullscreen` in `main.ts`, prevented defaults without a modifier → T4.
  Speed, normalization, cancelling, facing, clamp, moving-before-clamp → T5. Timer arithmetic,
  phase 1 at once, standing resets → T6. Sprite anchor → T7. State shape and strings → T1,
  round trip after walking → T5. The handle in every build → T8 and the container run in T10.
- Acceptance criteria 1–11: 1 → T1, T7, T10; 2 → T3–T6, T10; 3 → T5 (228 steps), T10 feel;
  4 → T5; 5 → T5; 6 → T3 (repeat and release-all) with T4 wiring, T10; 7 → T7 order, T10;
  8 → T5 clamp, T6 stepping in place; 9 → T2; 10 → T8; 11 → T10.
- Test plan: `player.test.ts` → T5, T6; `input.test.ts` → T3; `gen-sprites.test.ts` → T2;
  `draw-scene.test.ts` → T7; `state.test.ts` → T1, T5; `tests/arch/` unchanged, now over three
  files; the smoke extension → T8; no new fixtures — `grass-map.ts` is a helper module, not a
  fixture file.
- Names used across tasks: `FRAME_WIDTH`, `FRAME_HEIGHT`, `FACINGS`, `Facing`, `WALK_PHASES`,
  `PHASES_PER_FACING`, `PlayerState`, `GameState`, `createInitialState`, `MovementInput`,
  `movementVector`, `stepPlayer`, `STEPS_PER_PHASE`, `update`, `Keyboard`, `createKeyboard`,
  `listenToKeyboard`, `Bindings`, `resolveActions`, `STEPS_PER_SECOND`, `LoopCallbacks`,
  `runLoop`, `SpriteSheet`, `drawSprite`, `drawLayer`, `drawMap`, `SceneContent`, `playerFrame`,
  `drawScene`, `INKS`, `frameRows`, `renderPlayer`, `encodePng`, `grassMap` — each defined once
  above and used with the same signature.

## Decisions by the planning session

Two readings the spec left open, decided on 2026-11-03 so that the implementation does not have
to stop. The author sees both in the acceptance run and can still flip them.

1. **The lanyard in the side views.** The spec fixes the lanyard for facing down (shown) and up
   (not shown) and says nothing for left and right. The side views show a one-pixel strap at the
   chest's front edge, and a hand swings in phases 1 and 3, so that the two side strides differ
   in pixels. Two rows in `tools/placeholder-player.ts` if the author wants them without.
2. **The first phase lasts a full 8 steps.** Read literally, "the timer grows by 1 per step" would
   let the step that starts the walk count itself, and the first phase would last 7 steps. The
   spec's test plan says "after 8, then 7 steps", so the step that starts moving sets phase 1 and
   timer 0, and the counting begins with the next step. The spec's animation rule now says so.
   Task 6 pins it: `at(1)` is `[1, 0]`, `at(9)` is `[2, 0.5]`.
