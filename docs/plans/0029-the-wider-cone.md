# 0029 — Implementation plan: the wider cone

**Spec:** [`docs/features/0029-the-wider-cone.md`](../features/0029-the-wider-cone.md)
(approved 2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/gameplay.md` §2 and §5,
`docs/spec/architecture.md` §2, §5 and §7 and `docs/spec/testing.md` §5. **Written:**
2026-11-18 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0028 is merged into `main` (`715e295` or later). The branch
`feature/0029-the-wider-cone` exists, cut from that `main`, and holds this plan. Work on it;
merge the latest `main` into it before Task 1.

**Goal:** solving the case of Marketing earns the wider cone: the cone is one and a half times
as wide, the lamp's strength is 2, and the shadow walls of HR and Accounting give way to it.

**Approach:** seven code tasks, each green on its own. The words (T1). The spread of the cone
as a number the light tests take (T2) — after it the game can test a wider cone, and nothing
asks for one. The state: `GameState.upgrades`, and the step hands the spread on (T3) — after
it a state with the upgrade shines wider, and no step earns it. Earning: the step that solves
a case earns the upgrade of its region (T4) — after it the feature works, without a word and
with the narrow picture. The notice (T5). The wider cone's sheet (T6). The scene draws it
(T7). Then the documents (T8), the full check with the container (T9), the walk (T10) and
the pull request (T11).

**How this plan was checked:** the code and the tests of Tasks 1 to 7 were run once as a
prototype on 2026-11-18, on the source of `main` at `715e295`, and then replayed task by task,
each task's tests before its code: they failed as the steps say, and after each of the seven
tasks typecheck and Biome were clean and the unit tests green — 1359, 1392, 1403, 1419, 1426,
1437 and 1442 tests (1358 before). `npm run gen-sprites` wrote the prototype's
`lamp-wide.png` byte for byte and changed no other sheet. The diffs of this file, applied in
order to a clean tree, gave the prototype's files. `npm run check` with the build passed on
the whole prototype, and the smoke spec passed twice against a dev server of it: 18 passed, 3
skipped; its new test was run once before the code of Task 3 and failed. The prototype was
thrown away; nothing of it is on the branch. If a step does not behave as written, the cause
is a difference to that state — stop and look; do not bend a test. The game was **not**
played in a browser — that is the walk — and the container was **not** run with the
prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `GameState.upgrades` is plain data: an array of ids, in the order they were earned.
  The cone's spread, the notice of an upgrade and which sheet the cone is drawn from are
  **derived** on every call; none of it is stored. The lamp's strength stays a field of
  `lamp`; the step that earns an upgrade sets it to `strengthAfter(upgrades.length)`.
- INV-2: `src/game/` imports nothing from `src/render/`. `game/lamp` holds the spread and the
  apex pixels of both sheets; the renderer and the generator read them from there.
- INV-4: the one new string lives in `src/text/de.ts` and `src/text/en.ts`; `notice.ts` holds
  its key.
- INV-6: `lamp-wide.png` holds one colour, the lamp's yellow `#fee761`, and transparent
  pixels. It is written by `npm run gen-sprites` and never edited by hand.
- INV-7: no map changes, no tile changes. `public/maps/floor.tmj` is not touched.
- **The spread is a last argument with a default.** `inCone`, `meetsCone`, `isLit`,
  `stepCreature`, `stepCreatures`, `wallInLight`, `stepWalls`, `traceInLight` and `stepTraces`
  each take `spread` last, and without it they test the narrow cone. That is what keeps
  criterion 13: the tests of 0007, 0008, 0014 and 0022 call them without it and pass
  unchanged. `Cone` and `lampCone` do not change.
- **Earning is its own function.** `earn(state, region)` in `game/cases` earns the upgrade;
  `solve` stays what it is. `update` calls `solve`, then `earn`, then `clearRegion`.
- **The order of the notices:** a wall that holds, a solved case, **the upgrade**, a found
  trace, a rest, the lamp's key. The upgrade's line is shown while 120 ≤ `tick` − `at` < 240
  for the case that earned it, and only while the player has the upgrade. If another case is
  solved in those two seconds, its line comes first — the order says so.
- `NOTICE_UPGRADE` has a line for `wide-cone` only. The filter gets its line with its own
  feature; nothing is prepared for it here.
- **Older tests that change, and no other.** Ten full literals of a `GameState` get
  `upgrades: []` — in `state.test.ts` (4), `overview.test.ts` (3), `draw-scene.test.ts`,
  `draw-journal.test.ts` and `draw-help.test.ts` — and the three scene fixtures get
  `lampWideSheet`. No assertion of an older test changes. The tests of 0007, 0008, 0014 and
  0022 in `lamp.test.ts`, `creature.test.ts`, `shadow.test.ts` and `trace.test.ts` are not
  edited: those files get imports and new blocks at their end.
- The two recorded digests of 600 steps (`RECORDED` in `tests/unit/journal.test.ts` and in
  `tests/unit/help.test.ts`) pass as they are — that is criterion 13; never record them
  again. They do not hash `upgrades`.
- In the scene tests two sheets that must be told apart need different objects: the wide
  sheet of the fixtures is 72x72, the lamp's 48x48. A local helper in a test must not be
  named `after`, `before`, `beforeEach` or `afterEach`.
- What is out of the spec is not built: no larger creature, no case of HR or Accounting, no
  upgrade in the journal, no longer cone, no person who hands the upgrade over.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: the spread 1/2 without `wide-cone` and 3/4 with it;
  the length 48 px with either; 72 px wide at the end; a strength of 2 after Marketing;
  `UPGRADE_NOTICE_STEPS` 120, shown while 120 ≤ `tick` − `at` < 240; `lamp-wide.png` 288x72,
  four 72x72 frames, the apex at (36, 0) for down, (36, 71) for up, (71, 36) for left and
  (0, 36) for right; the words `Die Lampe leuchtet jetzt breiter und stärker.` and
  `The lamp now shines wider and stronger.`

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | one key: `notice.upgrade-wide-cone` |
| `src/game/lamp.ts` | `SPREAD`, `WIDE_SPREAD`, `WIDE_CONE`, `spreadOf`; `inCone` takes a spread; `WIDE_FRAME_SIZE`, `WIDE_FRAME_APEX` |
| `src/game/shadow.ts`, `creature.ts`, `trace.ts` | the light tests and their steps take a spread |
| `src/game/state.ts` | `GameState.upgrades` |
| `src/game/update.ts` | `upgrades` starts empty; the step derives the spread and hands it on; the solving step earns |
| `src/game/overview.ts` | the wake keeps `upgrades` |
| `src/game/cases.ts` | `earn` |
| `src/game/notice.ts` | `NOTICE_UPGRADE`, `UPGRADE_NOTICE_STEPS`; the upgrade's line in `noticeOf` |
| `tools/placeholder-lamp.ts`, `tools/gen-sprites.ts` | the wider cone's sheet |
| `public/sprites/lamp-wide.png` | new, generated |
| `src/render/draw-scene.ts`, `src/main.ts` | `SceneContent.lampWideSheet`; the cone from the wide sheet |
| `tests/unit/*.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 8 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text id `notice.upgrade-wide-cone`, in both languages.

- [x] **Step 1: Write the failing test:**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -280,6 +280,15 @@
     ]);
   });
 
+  it('holds the line of the wider cone in both languages (0029)', () => {
+    expect(textOf(textKey('notice.upgrade-wide-cone'), 'de')).toBe(
+      'Die Lampe leuchtet jetzt breiter und stärker.',
+    );
+    expect(textOf(textKey('notice.upgrade-wide-cone'), 'en')).toBe(
+      'The lamp now shines wider and stronger.',
+    );
+  });
+
   it('holds every text of the journal to the rule of its kind (0020, 0022, 0024)', () => {
     /** The most lines and the most characters per line a key may have, by what its id starts or ends with. */
     const rules: readonly (readonly [(id: string) => boolean, number, number, number])[] = [
```

- [x] **Step 2: Run it** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 1 of 24
  tests. `npx tsc --noEmit` reports two errors, both in this test: the id is not an id of
  the table yet.

- [x] **Step 3: The words,** in both tables:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -108,6 +108,7 @@
     'unsicher ist, fragt – ohne Ärger.',
   ].join('\n'),
   'notice.case-solved': 'Der Fall ist gelöst. Sieh ins Journal.',
+  'notice.upgrade-wide-cone': 'Die Lampe leuchtet jetzt breiter und stärker.',
   'talk.marketing-source-1': [
     'Die Motive macht ein Bildgenerator – in zehn',
     'Minuten statt in zwei Tagen, und die Agentur',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -104,6 +104,7 @@
     'asks – without trouble.',
   ].join('\n'),
   'notice.case-solved': 'The case is solved. See the journal.',
+  'notice.upgrade-wide-cone': 'The lamp now shines wider and stronger.',
   'talk.marketing-source-1': [
     'An image generator makes the visuals – in ten',
     'minutes instead of two days, and we saved',
```

- [x] **Step 4: Run** `npx vitest run tests/unit/text.test.ts tests/unit/draw-scene.test.ts` —
  green; the tests that keep a notice on one line and inside the bar's 49 characters cover
  the new line. Then `npm run check`: 1359 unit tests.

- [x] **Step 5: Commit** — `Add the line of the wider cone`.

---

### Task 2: The spread of the cone

**Files:**
- Modify: `src/game/lamp.ts`, `src/game/shadow.ts`, `src/game/creature.ts`,
  `src/game/trace.ts`
- Test: `tests/unit/lamp.test.ts`, `tests/unit/shadow.test.ts`,
  `tests/unit/creature.test.ts`, `tests/unit/trace.test.ts`

**Interfaces:**
- Produces, in `game/lamp`:
  - `SPREAD = 1 / 2`, `WIDE_SPREAD = 3 / 4`, `WIDE_CONE = 'wide-cone'`
  - `spreadOf(upgrades: readonly string[]): number`
  - `inCone(point: Point, cone: Cone, spread: number = SPREAD): boolean`
- Produces, each with `spread: number = SPREAD` as its last parameter:
  `meetsCone(box, cone, spread)`, `wallInLight(wall, player, lampOn, map, spread)`,
  `stepWalls(standing, walls, player, lamp, map, spread)` in `game/shadow`;
  `isLit(creature, player, lampOn, map, spread)`, `stepCreature(…, map, spread)`,
  `stepCreatures(…, map, spread)` in `game/creature`;
  `traceInLight(trace, player, lampOn, map, spread)`,
  `stepTraces(states, traces, player, lampOn, map, tick, spread)` in `game/trace`.

- [x] **Step 1: Write the failing tests.** Each file gets imports and blocks at its end; no
  older test is edited. `tests/unit/lamp.test.ts`:

```diff
--- a/tests/unit/lamp.test.ts
+++ b/tests/unit/lamp.test.ts
@@ -8,8 +8,13 @@
   inCone,
   LAMP_HEIGHT,
   lampCone,
+  SPREAD,
+  spreadOf,
+  WIDE_CONE,
+  WIDE_SPREAD,
 } from '../../src/game/lamp';
 import { FACINGS, type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';
+import { UPGRADES } from '../../src/game/world';
 
 const APEX: Point = { x: 100, y: 100 };
 
@@ -86,3 +91,55 @@
     });
   });
 });
+
+describe('the spread of the cone (0029)', () => {
+  it('is one half without the wider cone and three quarters with it', () => {
+    expect([SPREAD, WIDE_SPREAD]).toStrictEqual([0.5, 0.75]);
+    expect(spreadOf([])).toBe(0.5);
+    expect(spreadOf(['wide-cone'])).toBe(0.75);
+    expect(spreadOf(['filter'])).toBe(0.5);
+    expect(spreadOf(['filter', 'wide-cone'])).toBe(0.75);
+  });
+
+  it('follows from an upgrade the world data has', () => {
+    expect(WIDE_CONE).toBe('wide-cone');
+    expect(UPGRADES.map((upgrade) => upgrade.id)).toContain(WIDE_CONE);
+  });
+});
+
+describe.each(FACINGS)('inCone with a spread, facing %s (0029)', (facing) => {
+  const cone: Cone = { apex: APEX, facing };
+  const inside = (along: number, aside: number, spread: number): boolean =>
+    inCone(at(facing, along, aside), cone, spread);
+
+  it('with one half: 40 px along, 20 px beside the axis is in and 20.5 px is not', () => {
+    expect(inside(40, 20, SPREAD)).toBe(true);
+    expect(inside(40, -20, SPREAD)).toBe(true);
+    expect(inside(40, 20.5, SPREAD)).toBe(false);
+    expect(inside(40, -20.5, SPREAD)).toBe(false);
+  });
+
+  it('with three quarters: 40 px along, 30 px beside the axis is in and 30.5 px is not', () => {
+    expect(inside(40, 30, WIDE_SPREAD)).toBe(true);
+    expect(inside(40, -30, WIDE_SPREAD)).toBe(true);
+    expect(inside(40, 30.5, WIDE_SPREAD)).toBe(false);
+    expect(inside(40, -30.5, WIDE_SPREAD)).toBe(false);
+  });
+
+  it('is 48 px long with either: 47.99 on the axis is in, 48 is out', () => {
+    for (const spread of [SPREAD, WIDE_SPREAD]) {
+      expect(inside(47.99, 0, spread)).toBe(true);
+      expect(inside(48, 0, spread)).toBe(false);
+      expect(inside(-0.01, 0, spread)).toBe(false);
+    }
+  });
+
+  it('gives without a spread what it gives with one half', () => {
+    for (let along = -4; along <= 52; along += 4) {
+      for (let aside = -40; aside <= 40; aside += 0.5) {
+        const point = at(facing, along, aside);
+        expect(inCone(point, cone), `${along}, ${aside}`).toBe(inCone(point, cone, SPREAD));
+      }
+    }
+  });
+});
```

  `tests/unit/shadow.test.ts`:

```diff
--- a/tests/unit/shadow.test.ts
+++ b/tests/unit/shadow.test.ts
@@ -4,7 +4,7 @@
 import { describe, expect, it } from 'vitest';
 import type { Box } from '../../src/engine/collision';
 import { type NamedRect, parseTileMap, parseTileset, type TileMap } from '../../src/engine/tiled';
-import { lampCone } from '../../src/game/lamp';
+import { type Cone, lampCone, SPREAD, WIDE_SPREAD } from '../../src/game/lamp';
 import {
   LIFT_STEPS,
   meetsCone,
@@ -270,3 +270,66 @@
     expect(walled.solids[5 * 20 + 15]).toStrictEqual([]);
   });
 });
+
+describe('a box and the wider cone (0029)', () => {
+  /** A cone from (100, 100): down, and to the right. */
+  const DOWN: Cone = { apex: { x: 100, y: 100 }, facing: 'down' };
+  const RIGHT: Cone = { apex: { x: 100, y: 100 }, facing: 'right' };
+  /** Each box begins 40 px along the axis and 26 px beside it: a strip across, and one along. */
+  const BOXES: readonly (readonly [string, Cone, Box])[] = [
+    ['down, a strip across', DOWN, { x: 126, y: 140, width: 16, height: 4 }],
+    ['down, a strip along', DOWN, { x: 126, y: 140, width: 4, height: 16 }],
+    ['down, on the other side', DOWN, { x: 58, y: 140, width: 16, height: 4 }],
+    ['right, a strip across', RIGHT, { x: 140, y: 126, width: 4, height: 16 }],
+    ['right, a strip along', RIGHT, { x: 140, y: 126, width: 16, height: 4 }],
+    ['right, on the other side', RIGHT, { x: 140, y: 58, width: 4, height: 16 }],
+  ];
+
+  it.each(BOXES)('%s: meets the wider cone and not the narrow one', (_name, cone, box) => {
+    expect(meetsCone(box, cone, WIDE_SPREAD)).toBe(true);
+    expect(meetsCone(box, cone, SPREAD)).toBe(false);
+    expect(meetsCone(box, cone)).toBe(false);
+  });
+
+  it('gives without a spread what it gives with one half', () => {
+    for (const cone of [DOWN, RIGHT]) {
+      for (let x = 40; x <= 160; x += 6) {
+        for (let y = 40; y <= 160; y += 6) {
+          const box: Box = { x, y, width: 16, height: 4 };
+          expect(meetsCone(box, cone), `${x}, ${y}`).toBe(meetsCone(box, cone, SPREAD));
+        }
+      }
+    }
+  });
+
+  it('is 48 px long with either spread', () => {
+    // Half-open, as for a point: a box that begins 48 px along the axis is out.
+    const beyond: Box = { x: 92, y: 148, width: 16, height: 4 };
+    const atTheEnd: Box = { x: 92, y: 147.5, width: 16, height: 4 };
+    for (const spread of [SPREAD, WIDE_SPREAD]) {
+      expect(meetsCone(beyond, DOWN, spread)).toBe(false);
+      expect(meetsCone(atTheEnd, DOWN, spread)).toBe(true);
+    }
+  });
+
+  it('puts a wall at the wider edge in the light of the wider cone only', () => {
+    // The figure's apex is (100, 100): the strip begins 26 px beside the axis, 40 px along.
+    const strip = wall({ x: 126, y: 140, width: 16, height: 4 });
+    const player = figure(100, 112, 'down');
+    expect(wallInLight(strip, player, true, OPEN, WIDE_SPREAD)).toBe(true);
+    expect(wallInLight(strip, player, true, OPEN)).toBe(false);
+    expect(wallInLight(strip, player, false, OPEN, WIDE_SPREAD)).toBe(false);
+  });
+
+  it('steps a wall at the wider edge with the wider cone only', () => {
+    const walls = [wall({ x: 126, y: 140, width: 16, height: 4 })];
+    const player = figure(100, 112, 'down');
+    const lamp = { on: true, strength: 1, owned: true, used: true };
+    expect(stepWalls(standingWalls(walls), walls, player, lamp, OPEN, WIDE_SPREAD)).toStrictEqual([
+      { wall: 0, lit: true, light: 1 },
+    ]);
+    expect(stepWalls(standingWalls(walls), walls, player, lamp, OPEN)).toStrictEqual([
+      { wall: 0, lit: false, light: 0 },
+    ]);
+  });
+});
```

  `tests/unit/creature.test.ts`:

```diff
--- a/tests/unit/creature.test.ts
+++ b/tests/unit/creature.test.ts
@@ -13,6 +13,7 @@
   stepCreatures,
   TOUCH_DISTANCE,
 } from '../../src/game/creature';
+import { SPREAD, WIDE_SPREAD } from '../../src/game/lamp';
 import { type CreatureState, type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';
 import { grassMap } from './grass-map';
 import { pictureMap } from './picture-map';
@@ -316,3 +317,37 @@
     expect(noCaptures()).toStrictEqual({ snippet: 0 });
   });
 });
+
+describe('a creature and the wider cone (0029)', () => {
+  /** The apex is (100, 88). The body of the creature is 40 px along the axis and 28 px beside it. */
+  const PLAYER = figure(100, 100, 'down');
+  const BESIDE = snippet(128, 136);
+
+  it('is lit 28 px beside the axis at 40 px in the wider cone, and not in the narrow one', () => {
+    expect(isLit(BESIDE, PLAYER, true, OPEN, WIDE_SPREAD)).toBe(true);
+    expect(isLit(BESIDE, PLAYER, true, OPEN, SPREAD)).toBe(false);
+    expect(isLit(BESIDE, PLAYER, true, OPEN)).toBe(false);
+    expect(isLit(BESIDE, PLAYER, false, OPEN, WIDE_SPREAD)).toBe(false);
+  });
+
+  it('freezes there and is captured in the 60th step', () => {
+    let creature: CreatureState | null = BESIDE;
+    for (let step = 1; step < CAPTURE_STEPS; step += 1) {
+      creature = creature === null ? null : stepCreature(creature, PLAYER, true, OPEN, WIDE_SPREAD);
+      expect(creature).toStrictEqual({ ...BESIDE, light: step });
+    }
+    expect(
+      creature === null ? null : stepCreature(creature, PLAYER, true, OPEN, WIDE_SPREAD),
+    ).toBeNull();
+  });
+
+  it('is counted by the step of all creatures with the wider cone only', () => {
+    const almost = { ...BESIDE, light: CAPTURE_STEPS - 1 };
+    const wide = stepCreatures([almost], noCaptures(), PLAYER, true, OPEN, WIDE_SPREAD);
+    expect(wide).toStrictEqual({ creatures: [], captured: { snippet: 1 } });
+    const narrow = stepCreatures([almost], noCaptures(), PLAYER, true, OPEN);
+    expect(narrow.captured).toStrictEqual({ snippet: 0 });
+    expect(narrow.creatures).toHaveLength(1);
+    expect(narrow.creatures[0]?.light).toBe(0);
+  });
+});
```

  `tests/unit/trace.test.ts`:

```diff
--- a/tests/unit/trace.test.ts
+++ b/tests/unit/trace.test.ts
@@ -1,6 +1,7 @@
 import { describe, expect, it } from 'vitest';
 import type { Box } from '../../src/engine/collision';
 import type { NamedRect, TileMap } from '../../src/engine/tiled';
+import { WIDE_SPREAD } from '../../src/game/lamp';
 import { noticeOf, TRACE_NOTICE_STEPS } from '../../src/game/notice';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { rectsOf, TRACE_PREFIX, WALL_PREFIX } from '../../src/game/rects';
@@ -11,6 +12,7 @@
   FIND_STEPS,
   hiddenTraces,
   restedTraces,
+  stepTraces,
   type Trace,
   traceInLight,
   tracesOf,
@@ -317,3 +319,30 @@
     ]);
   });
 });
+
+describe('a trace and the wider cone (0029)', () => {
+  /**
+   * The player at (168, 128) looks up: the apex is (168, 116). The trace on cell (12, 5) begins
+   * 24 px beside the axis and ends 36 px along it: outside the narrow cone, inside the wider.
+   */
+  const map = mapAt(168, 128, [rect('trace:sales', 192, 80)]);
+  const [trace] = tracesOf(map.rects);
+  const player = facing(map, 'up').player;
+
+  it('is in the light at the wider edge with the wider cone, and not with the narrow one', () => {
+    expect(trace).toBeDefined();
+    if (trace !== undefined) {
+      expect(traceInLight(trace, player, true, map, WIDE_SPREAD)).toBe(true);
+      expect(traceInLight(trace, player, true, map)).toBe(false);
+      expect(traceInLight(trace, player, false, map, WIDE_SPREAD)).toBe(false);
+    }
+  });
+
+  it('counts its lit steps with the wider cone only', () => {
+    const hidden = hiddenTraces(tracesOf(map.rects));
+    expect(
+      stepTraces(hidden, tracesOf(map.rects), player, true, map, 7, WIDE_SPREAD),
+    ).toStrictEqual([{ trace: 0, light: 1, found: null }]);
+    expect(stepTraces(hidden, tracesOf(map.rects), player, true, map, 7)).toStrictEqual(hidden);
+  });
+});
```

- [x] **Step 2: Run them** —
  `npx vitest run tests/unit/lamp.test.ts tests/unit/shadow.test.ts tests/unit/creature.test.ts tests/unit/trace.test.ts`.
  Expected: FAIL, 19 tests: 6 of 41 in `lamp.test.ts`, 8 of 50 in `shadow.test.ts`, 3 of 32
  in `creature.test.ts`, 2 of 32 in `trace.test.ts`. `npx tsc --noEmit` reports 28 errors,
  all in these four files: the names do not exist, and the functions take no spread.
  Fourteen tests of the diffs are green already, and that is right: they hold the narrow
  cone to what it was — one half, 48 px long, and the same with and without the argument —
  twelve in `lamp.test.ts` (three for each facing) and two in `shadow.test.ts`.

- [x] **Step 3: The lamp:**

```diff
--- a/src/game/lamp.ts
+++ b/src/game/lamp.ts
@@ -7,13 +7,20 @@
  * is as wide at its end as it is long. `inCone` is the one test the game makes on it; 0008
  * freezes a creature whose point passes it. Pure data and pure functions: the renderer draws the
  * same cone from a sprite sheet whose frames hold it (FRAME_APEX), the generator draws that sheet
- * from `inCone`.
+ * from `inCone`. The slope is the cone's spread (0029): with the upgrade `wide-cone` it is 3/4,
+ * and the cone is one and a half times as wide at its end.
  */
 
 /** Tune: 48 px is three tiles. Half-open: a point at exactly 48 is outside. */
 export const CONE_LENGTH = 48;
 /** The lamp is held at chest height: the apex is this many pixels above the feet. */
 export const LAMP_HEIGHT = 12;
+/** The cone's spread, its slope to each side: one half makes it as wide at its end as it is long. */
+export const SPREAD = 1 / 2;
+/** Tune: the spread with the wider cone (0029). 72 px wide at the end, one and a half times as wide. */
+export const WIDE_SPREAD = 3 / 4;
+/** The id of the upgrade that widens the cone, as the world data names it. */
+export const WIDE_CONE = 'wide-cone';
 
 export interface Cone {
   /** Map pixels, floating point like the feet. */
@@ -48,15 +55,23 @@
 }
 
 /**
+ * The spread of the lamp of a player with these upgrades (0029): WIDE_SPREAD with `wide-cone`,
+ * SPREAD without. Derived in every step and every frame; the state has no field for it.
+ */
+export function spreadOf(upgrades: readonly string[]): number {
+  return upgrades.includes(WIDE_CONE) ? WIDE_SPREAD : SPREAD;
+}
+
+/**
  * Whether a point lies in the cone: with d its distance from the apex along the direction and
- * s its distance from the axis, 0 ≤ d < CONE_LENGTH and |s| ≤ d / 2. The apex is in; a point
- * beside it or behind it is not.
+ * s its distance from the axis, 0 ≤ d < CONE_LENGTH and |s| ≤ d × spread. The apex is in; a
+ * point beside it or behind it is not.
  */
-export function inCone(point: Point, cone: Cone): boolean {
+export function inCone(point: Point, cone: Cone, spread: number = SPREAD): boolean {
   const direction = DIRECTIONS[cone.facing];
   const dx = point.x - cone.apex.x;
   const dy = point.y - cone.apex.y;
   const along = dx * direction.x + dy * direction.y;
   const aside = Math.abs(dx * direction.y - dy * direction.x);
-  return along >= 0 && along < CONE_LENGTH && aside <= along / 2;
+  return along >= 0 && along < CONE_LENGTH && aside <= along * spread;
 }
```

- [x] **Step 4: The walls,** the creatures and the traces take the spread and hand it on:

```diff
--- a/src/game/shadow.ts
+++ b/src/game/shadow.ts
@@ -1,6 +1,6 @@
 import { type Box, sightBlocked } from '../engine/collision';
 import { type NamedRect, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
-import { CONE_LENGTH, type Cone, DIRECTIONS, lampCone } from './lamp';
+import { CONE_LENGTH, type Cone, DIRECTIONS, lampCone, SPREAD } from './lamp';
 import { BOX_HEIGHT } from './player';
 import { rectsOf, WALL_PREFIX } from './rects';
 import type { LampState, PlayerState, ShadowWallState } from './state';
@@ -77,12 +77,12 @@
  * Whether a box, its edges included, meets the cone. In the cone's own coordinates the box
  * spans d0 to d1 along the facing and s0 to s1 across it. With near = max(d0, 0), far =
  * min(d1, CONE_LENGTH) and gap the distance from 0 to [s0, s1], it meets the cone when
- * near ≤ far, near < CONE_LENGTH and gap ≤ far / 2: every case in which a point of the box
- * lies in the cone (lamp.inCone), and the limiting case in which the box touches the cone's
+ * near ≤ far, near < CONE_LENGTH and gap ≤ far × spread: every case in which a point of the
+ * box lies in the cone (lamp.inCone), and the limiting case in which the box touches the cone's
  * end. A sample of points would miss a figure flush below a wall, whose apex lies on the
  * wall's far edge.
  */
-export function meetsCone(box: Box, cone: Cone): boolean {
+export function meetsCone(box: Box, cone: Cone, spread: number = SPREAD): boolean {
   const direction = DIRECTIONS[cone.facing];
   const left = box.x - cone.apex.x;
   const right = left + box.width;
@@ -97,7 +97,7 @@
   const d1 = forward ? a1 : 0 - a0;
   const near = Math.max(d0, 0);
   const far = Math.min(d1, CONE_LENGTH);
-  return near <= far && near < CONE_LENGTH && gapTo(s0, s1) <= far / 2;
+  return near <= far && near < CONE_LENGTH && gapTo(s0, s1) <= far * spread;
 }
 
 function clamp(value: number, min: number, max: number): number {
@@ -122,14 +122,16 @@
  * lies on the line from the centre of the figure's collision box to the nearest point of the
  * wall's box. `map` is the map as loaded, without the standing walls: against the map with
  * walls, a wall would block its own light, and other walls do not count on that line.
+ * `spread` is the cone's (0029).
  */
 export function wallInLight(
   wall: ShadowWall,
   player: PlayerState,
   lampOn: boolean,
   map: TileMap,
+  spread: number = SPREAD,
 ): boolean {
-  if (!lampOn || !meetsCone(wall.box, lampCone(player))) {
+  if (!lampOn || !meetsCone(wall.box, lampCone(player), spread)) {
     return false;
   }
   const centre = { x: player.x, y: player.y - BOX_HEIGHT / 2 };
@@ -165,11 +167,12 @@
   player: PlayerState,
   lamp: LampState,
   map: TileMap,
+  spread: number = SPREAD,
 ): ShadowWallState[] {
   const next: ShadowWallState[] = [];
   for (const state of standing) {
     const wall = walls[state.wall];
-    if (wall === undefined || !wallInLight(wall, player, lamp.on, map)) {
+    if (wall === undefined || !wallInLight(wall, player, lamp.on, map, spread)) {
       next.push({ wall: state.wall, lit: false, light: 0 });
     } else if (lamp.strength < wall.density) {
       next.push({ wall: state.wall, lit: true, light: 0 });
```

```diff
--- a/src/game/creature.ts
+++ b/src/game/creature.ts
@@ -2,7 +2,7 @@
 import { STEPS_PER_SECOND } from '../engine/loop';
 import { type NamedPoint, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { isFigurePoint } from './cast';
-import { inCone, lampCone } from './lamp';
+import { inCone, lampCone, SPREAD } from './lamp';
 import { isRoutePoint } from './mover';
 import { WAKE_POINT } from './overview';
 import { BOX_HEIGHT, BOX_WIDTH } from './player';
@@ -44,19 +44,21 @@
  * the centre of the figure's collision box to the body point. The line starts at the box and
  * not at the cone's apex, because the apex is inside a wall when the figure stands under one.
  * Furniture that is low does not block the light; it still stops the walk (feature 0011).
+ * `spread` is the cone's (0029).
  */
 export function isLit(
   creature: CreatureState,
   player: PlayerState,
   lampOn: boolean,
   map: TileMap,
+  spread: number = SPREAD,
 ): boolean {
   if (!lampOn) {
     return false;
   }
   const body = bodyPoint(creature);
   return (
-    inCone(body, lampCone(player)) &&
+    inCone(body, lampCone(player), spread) &&
     !sightBlocked({ x: player.x, y: player.y - BOX_HEIGHT / 2 }, body, {
       width: map.width,
       height: map.height,
@@ -108,8 +110,9 @@
   player: PlayerState,
   lampOn: boolean,
   map: TileMap,
+  spread: number = SPREAD,
 ): CreatureState | null {
-  if (!isLit(creature, player, lampOn, map)) {
+  if (!isLit(creature, player, lampOn, map, spread)) {
     return approach(creature, player, map);
   }
   const light = creature.light + 1;
@@ -123,11 +126,12 @@
   player: PlayerState,
   lampOn: boolean,
   map: TileMap,
+  spread: number = SPREAD,
 ): { readonly creatures: readonly CreatureState[]; readonly captured: Captured } {
   const remaining: CreatureState[] = [];
   const counts: Record<Species, number> = { ...captured };
   for (const creature of creatures) {
-    const next = stepCreature(creature, player, lampOn, map);
+    const next = stepCreature(creature, player, lampOn, map, spread);
     if (next === null) {
       counts[creature.species] += 1;
     } else {
```

```diff
--- a/src/game/trace.ts
+++ b/src/game/trace.ts
@@ -1,6 +1,6 @@
 import { type Box, sightBlocked } from '../engine/collision';
 import type { NamedRect, TileMap } from '../engine/tiled';
-import { lampCone } from './lamp';
+import { lampCone, SPREAD } from './lamp';
 import { BOX_HEIGHT } from './player';
 import { isCell, rectsOf, TRACE_PREFIX } from './rects';
 import { meetsCone } from './shadow';
@@ -63,15 +63,16 @@
  * opaque box lies on the line from the centre of the figure's collision box to the nearest
  * pixel of the trace's box. `map` is the map with the shadow walls standing, as for a
  * creature: a trace is not found through a standing wall. A desk, a screen and a partition
- * are low and do not stop the light.
+ * are low and do not stop the light. `spread` is the cone's (0029).
  */
 export function traceInLight(
   trace: Trace,
   player: PlayerState,
   lampOn: boolean,
   map: TileMap,
+  spread: number = SPREAD,
 ): boolean {
-  if (!lampOn || !meetsCone(trace.box, lampCone(player))) {
+  if (!lampOn || !meetsCone(trace.box, lampCone(player), spread)) {
     return false;
   }
   const { box } = trace;
@@ -100,13 +101,14 @@
   lampOn: boolean,
   map: TileMap,
   tick: number,
+  spread: number = SPREAD,
 ): TraceState[] {
   return states.map((state) => {
     const trace = traces[state.trace];
     if (state.found !== null || trace === undefined) {
       return state;
     }
-    if (!traceInLight(trace, player, lampOn, map)) {
+    if (!traceInLight(trace, player, lampOn, map, spread)) {
       return state.light === 0 ? state : { ...state, light: 0 };
     }
     return state.light + 1 < FIND_STEPS
```

- [x] **Step 5: Run** the four test files of Step 2 — green, every older test of 0007, 0008,
  0014 and 0022 unchanged. Then `npm run check`: 1392 unit tests.

- [x] **Step 6: Commit** — `Give the cone a spread`. Body: the light tests take the spread as
  a last argument and test the narrow cone without it, so nothing that calls them changes.

---

### Task 3: The upgrades in the state

**Files:**
- Modify: `src/game/state.ts`, `src/game/update.ts`, `src/game/overview.ts`
- Test: `tests/unit/state.test.ts`, `tests/unit/overview.test.ts`,
  `tests/unit/draw-scene.test.ts`, `tests/unit/draw-journal.test.ts`,
  `tests/unit/draw-help.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `spreadOf` and the spread parameters of Task 2.
- Produces: `GameState.upgrades: readonly string[]`, empty in `createInitialState` and in
  `newGame`; every step keeps it, the wake included; an ordinary step lights with
  `spreadOf(state.upgrades)`.

- [x] **Step 1: Write the failing tests.** `tests/unit/state.test.ts` — four literals get the
  field, and one block is new, at the end:

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -4,10 +4,11 @@
 import { describe, expect, it } from 'vitest';
 import { parseTileMap, parseTileset, type TileMap } from '../../src/engine/tiled';
 import { followPlayer } from '../../src/game/camera';
+import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { clearingVeil } from '../../src/game/region';
 import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../../src/game/state';
-import { createInitialState, update } from '../../src/game/update';
+import { createInitialState, newGame, update } from '../../src/game/update';
 import { grassMap } from './grass-map';
 
 /** The test map's size and spawn, in memory: 20x12 tiles, spawn at (136, 120). */
@@ -81,6 +82,7 @@
       tick: 0,
       started: 0,
       rested: null,
+      upgrades: [],
       player: {
         x: 136,
         y: 120,
@@ -151,6 +153,7 @@
         tick: 41,
         started: 0,
         rested: null,
+        upgrades: [],
         player,
         camera: { x: 0, y: 12 },
         lamp: { on: false, strength: 1, owned: true, used: true },
@@ -181,6 +184,7 @@
       tick: 7,
       started: 0,
       rested: null,
+      upgrades: [],
       player,
       camera: { x: 0, y: 12 },
       lamp: { on: false, strength: 1, owned: true, used: true },
@@ -203,6 +207,7 @@
       tick: 7,
       started: 0,
       rested: null,
+      upgrades: [],
       player,
       camera: { x: 0, y: 12 },
       lamp: { on: false, strength: 1, owned: true, used: true },
@@ -1001,6 +1006,163 @@
     for (let i = 0; i < 600; i += 1) {
       state = update(state, { ...NONE, right: i < 200, lamp: i >= 300 && i < 400 }, RESTS_MAP);
       expect(state.rested).toBeNull();
+    }
+  });
+});
+
+describe('the upgrades in the state (0029)', () => {
+  /** The start of a map with the wider cone earned: the upgrade, and a strength of 2. */
+  const upgraded = (map: TileMap): GameState => {
+    const start = createInitialState(map);
+    return { ...start, upgrades: ['wide-cone'], lamp: { ...start.lamp, strength: 2 } };
+  };
+  const run = (start: GameState, map: TileMap, input: GameInput, count: number): GameState => {
+    let state = start;
+    for (let step = 0; step < count; step += 1) {
+      state = update(state, input, map);
+    }
+    return state;
+  };
+
+  it('starts with no upgrade and a strength of 1, in a played game too', () => {
+    expect(createInitialState(MAP).upgrades).toStrictEqual([]);
+    expect(createInitialState(MAP).lamp.strength).toBe(1);
+    expect(newGame(MAP).upgrades).toStrictEqual([]);
+    expect(newGame(MAP).lamp.strength).toBe(1);
+    expect(createInitialState(FLOOR_MAP).upgrades).toStrictEqual([]);
+  });
+
+  it('survives a JSON round trip at the start and with the wider cone earned (INV-1)', () => {
+    const start = createInitialState(MAP);
+    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
+    const earned = update(upgraded(MAP), SHINE, MAP);
+    expect(earned.upgrades).toStrictEqual(['wide-cone']);
+    expect(JSON.parse(JSON.stringify(earned))).toStrictEqual(earned);
+  });
+
+  it('keeps the upgrades and the strength in every kind of step', () => {
+    const start = upgraded(TALKERS_MAP);
+    const steps: readonly GameState[] = [
+      update(start, RIGHT, TALKERS_MAP),
+      update(start, SHINE, TALKERS_MAP),
+      update(start, { ...NONE, talk: true }, TALKERS_MAP),
+      update(start, { ...NONE, journal: true }, TALKERS_MAP),
+      update(start, { ...NONE, help: true }, TALKERS_MAP),
+      update({ ...start, journal: { tab: 'cases' } }, NONE, TALKERS_MAP),
+      update({ ...start, help: true }, NONE, TALKERS_MAP),
+      update({ ...start, dark: 10 }, NONE, TALKERS_MAP),
+    ];
+    for (const [n, state] of steps.entries()) {
+      expect(state.upgrades, `step ${n}`).toStrictEqual(['wide-cone']);
+      expect(state.lamp.strength, `step ${n}`).toBe(2);
     }
+    expect(steps[2]?.dialogue).not.toBeNull();
+  });
+
+  it('keeps the upgrades and the strength through the wake (0009)', () => {
+    const woken = update({ ...upgraded(MAP), dark: 44 }, NONE, MAP);
+    expect(woken.dark).toBe(45);
+    expect(woken.upgrades).toStrictEqual(['wide-cone']);
+    expect(woken.lamp.strength).toBe(2);
+    expect(run(woken, MAP, NONE, 45).upgrades).toStrictEqual(['wide-cone']);
+  });
+
+  /**
+   * The spawn (100, 60) looks down: the apex is (100, 48). The snippet's body is 40 px along
+   * the axis and 28 px beside it — outside the narrow cone, inside the wider.
+   */
+  const SNIPPET_MAP = grassMap(20, 12, { x: 100, y: 60 }, [{ name: 'snippet', x: 128, y: 96 }]);
+
+  it('freezes a creature 28 px beside the axis at 40 px with the wider cone, and captures it in the 60th step', () => {
+    const lit = update(upgraded(SNIPPET_MAP), SHINE, SNIPPET_MAP);
+    expect(lit.creatures).toStrictEqual([
+      { species: 'snippet', x: 128, y: 96, light: 1, home: { x: 128, y: 96 } },
+    ]);
+    const almost = run(upgraded(SNIPPET_MAP), SNIPPET_MAP, SHINE, 59);
+    expect(almost.creatures[0]?.light).toBe(59);
+    expect(almost.captured).toStrictEqual({ snippet: 0 });
+    const captured = update(almost, SHINE, SNIPPET_MAP);
+    expect(captured.creatures).toStrictEqual([]);
+    expect(captured.captured).toStrictEqual({ snippet: 1 });
   });
+
+  it('does not light the same creature without the wider cone: it comes nearer', () => {
+    const dark = update(createInitialState(SNIPPET_MAP), SHINE, SNIPPET_MAP);
+    expect(dark.creatures[0]?.light).toBe(0);
+    expect(dark.creatures[0]?.x).toBeLessThan(128);
+    expect(dark.captured).toStrictEqual({ snippet: 0 });
+  });
+
+  /**
+   * The spawn (102, 100) looks down: the apex is (102, 88). The rectangle on cell (8, 8) begins
+   * 40 px along the axis and 26 px beside it — a strip of a wall, or the cell of a trace.
+   */
+  const EDGE_WALL = grassMap(
+    20,
+    12,
+    { x: 102, y: 100 },
+    [],
+    [{ name: 'shadow:marketing', x: 128, y: 128, width: 16, height: 4 }],
+  );
+  const EDGE_TRACE = grassMap(
+    20,
+    12,
+    { x: 102, y: 100 },
+    [],
+    [{ name: 'trace:sales', x: 128, y: 128, width: 16, height: 16 }],
+  );
+
+  it('lights a wall at the wider edge with the wider cone only, and lifts it in the 60th step', () => {
+    expect(update(upgraded(EDGE_WALL), SHINE, EDGE_WALL).shadowWalls).toStrictEqual([
+      { wall: 0, lit: true, light: 1 },
+    ]);
+    expect(run(upgraded(EDGE_WALL), EDGE_WALL, SHINE, 60).shadowWalls).toStrictEqual([]);
+    expect(run(createInitialState(EDGE_WALL), EDGE_WALL, SHINE, 60).shadowWalls).toStrictEqual([
+      { wall: 0, lit: false, light: 0 },
+    ]);
+  });
+
+  it('finds a trace at the wider edge with the wider cone only', () => {
+    expect(update(upgraded(EDGE_TRACE), SHINE, EDGE_TRACE).traces).toStrictEqual([
+      { trace: 0, light: 1, found: null },
+    ]);
+    expect(run(upgraded(EDGE_TRACE), EDGE_TRACE, SHINE, 60).traces).toStrictEqual([
+      { trace: 0, light: 0, found: 60 },
+    ]);
+    expect(run(createInitialState(EDGE_TRACE), EDGE_TRACE, SHINE, 60).traces).toStrictEqual([
+      { trace: 0, light: 0, found: null },
+    ]);
+  });
+
+  /** A strip of the given region straight ahead of the spawn (152, 96), 28 px along the axis. */
+  const ahead = (region: string): TileMap =>
+    grassMap(
+      20,
+      12,
+      { x: 152, y: 96 },
+      [],
+      [{ name: `shadow:${region}`, x: 144, y: 112, width: 16, height: 4 }],
+    );
+
+  it('lifts a wall of density 2 with a strength of 2 in the 60th lit step', () => {
+    const hr = ahead('hr');
+    const almost = run(upgraded(hr), hr, SHINE, 59);
+    expect(almost.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 59 }]);
+    expect(noticeOf(almost)).toBeNull();
+    expect(update(almost, SHINE, hr).shadowWalls).toStrictEqual([]);
+  });
+
+  it('holds a wall of density 3 against a strength of 2, with the notice of 0016', () => {
+    const development = ahead('development');
+    const held = run(upgraded(development), development, SHINE, 600);
+    expect(held.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
+    expect(noticeOf(held)).toBe(NOTICE_SHADOW_TOO_DENSE);
+  });
+
+  it('holds the wall of density 2 against a strength of 1, as before', () => {
+    const hr = ahead('hr');
+    const held = run(createInitialState(hr), hr, SHINE, 600);
+    expect(held.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
+    expect(noticeOf(held)).toBe(NOTICE_SHADOW_TOO_DENSE);
+  });
 });
```

  The other full literals of a state get the field:

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -164,6 +164,7 @@
     tick: 500,
     started: 0,
     rested: null,
+    upgrades: [],
     player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
     camera: { x: 140, y: 106 },
     lamp: { on: true, strength: 1, owned: true, used: true },
@@ -195,6 +196,7 @@
       tick: 543,
       started: 0,
       rested: null,
+      upgrades: [],
       lamp: { on: false, strength: 1, owned: true, used: true },
       dark: 44,
     });
@@ -207,6 +209,7 @@
       tick: 544,
       started: 0,
       rested: null,
+      upgrades: [],
       player,
       camera: followPlayer(player, MAP),
       lamp: { on: false, strength: 1, owned: true, used: true },
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -151,6 +151,7 @@
   tick: QUIET_TICK,
   started: 0,
   rested: null,
+  upgrades: [],
   player: player(fields),
   camera,
   lamp: { on: lampOn, strength: 1, owned: true, used: true },
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -88,6 +88,7 @@
   tick: 100,
   started: 0,
   rested: null,
+  upgrades: [],
   player: {
     x: 160,
     y: 96,
```

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -88,6 +88,7 @@
   tick: 700,
   started: 0,
   rested: null,
+  upgrades: [],
   player: {
     x: 184,
     y: 96,
```

  And the smoke spec gets a test, at its end:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -430,3 +430,14 @@
     })
     .toBeNull();
 });
+
+test('the game starts with no upgrade of the lamp', async ({ page }) => {
+  await start(page);
+  // One poll for the whole value: nothing is read from a page that might still be loading.
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.upgrades), {
+      message: 'window.shadowAi.state.upgrades is there and empty',
+    })
+    .toStrictEqual([]);
+  expect(await page.evaluate(() => window.shadowAi?.state.lamp.strength)).toBe(1);
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/state.test.ts tests/unit/overview.test.ts`.
  Expected: FAIL, 9 tests: 8 of 85 in `state.test.ts`, 1 of 26 in `overview.test.ts` — the
  wake, whose literal now has the field. `npx tsc --noEmit` reports 15 errors: `upgrades`
  is no field of the state. Four tests of the new block are green already, and that is
  right: the creature that is not lit without the upgrade, and the three that hold what a
  strength of 1 and of 2 does to a wall of density 2 and 3 — the rule of 0014, which this
  feature only reaches. Then `npx playwright test -g "no upgrade"`. Expected: FAIL,
  `Received: undefined`.

- [x] **Step 3: The field:**

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -187,6 +187,11 @@
   readonly camera: Point;
   /** Derived from the input every step and kept here so the renderer knows what to draw. */
   readonly lamp: LampState;
+  /**
+   * The ids of the upgrades the player has earned, in the order they were earned (0029). The
+   * lamp's strength and the cone's spread follow from it.
+   */
+  readonly upgrades: readonly string[];
   /** The creatures still in the world, in the order of the map's points (0008). */
   readonly creatures: readonly CreatureState[];
   /** The movers on their routes, in route order (0015). */
```

- [x] **Step 4: The step** starts with no upgrade, derives the spread and hands it on, and
  keeps the upgrades:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -5,6 +5,7 @@
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
 import { openHelp, stepHelp } from './help';
 import { openJournal, stepJournal } from './journal';
+import { spreadOf } from './lamp';
 import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
 import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
 import { type GameInput, NO_INPUT, stepPlayer } from './player';
@@ -30,9 +31,10 @@
  * (0015); a lamp of strength BASE_STRENGTH and every shadow wall of the map standing (0014);
  * every standing figure of the map facing down and no dialogue (0017); the journal closed and
  * no key remembered (0020); the help closed (0021); every trace of the map unseen and not found
- * (0022); no case solved (0024). It is a game past its opening (0026): the lamp is owned and
- * was used, no scene is open, and the opening ended at tick 0; `newGame` is the state a player
- * starts with. A map with two wake points, a route that is malformed or crosses a solid tile, a
+ * (0022); no case solved (0024); no upgrade earned (0029). It is a game past its opening
+ * (0026): the lamp is owned and was used, no scene is open, and the opening ended at tick 0;
+ * `newGame` is the state a player starts with.
+ * A map with two wake points, a route that is malformed or crosses a solid tile, a
  * rectangle of no known kind, a shadow wall or a trace the world data or the grid refuses, an
  * area of a region the world data does not know or of a box that is not whole cells (0023), or
  * a figure point the cast does not know or names twice is rejected here, before the game starts.
@@ -62,6 +64,7 @@
     player,
     camera: followPlayer(player, map),
     lamp: { on: false, strength: BASE_STRENGTH, owned: true, used: true },
+    upgrades: [],
     creatures: creaturesFrom(map.points),
     movers: moversFrom(routes),
     shadowWalls: standingWalls(walls),
@@ -190,6 +193,9 @@
   const before = rest === null ? state.overview : rest.overview;
   const on = acting.lamp && state.player.recoil.steps === 0;
   const lamp: LampState = { ...state.lamp, on, used: state.lamp.used || on };
+  // The cone is as wide as the upgrades make it (0029): for the creatures, the walls and the
+  // traces.
+  const spread = spreadOf(state.upgrades);
   const walls = wallsOf(content.rects);
   // The figure, the push and the creatures meet the walls standing at the start of the step.
   const walled = withWalls(content, walls, state.shadowWalls);
@@ -200,6 +206,7 @@
     stepped,
     lamp.on,
     walled,
+    spread,
   );
   const hitter = hittingCreature(creatures, stepped);
   const { player, overview, dark } =
@@ -212,10 +219,11 @@
     player,
     camera: followPlayer(player, content),
     lamp,
+    upgrades: state.upgrades,
     creatures,
     movers: stepMovers(state.movers, routes, player),
     // The light on a wall is tested against the map as loaded: a wall does not block itself.
-    shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content),
+    shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content, spread),
     // A trace is tested against the map with the walls standing: none is found through one.
     traces: stepTraces(
       state.traces,
@@ -224,6 +232,7 @@
       lamp.on,
       walled,
       state.tick + 1,
+      spread,
     ),
     solved: state.solved,
     rested,
```

- [x] **Step 5: The wake** keeps them:

```diff
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -135,6 +135,7 @@
     player,
     camera: followPlayer(player, map),
     lamp: { ...state.lamp, on: false },
+    upgrades: state.upgrades,
     creatures: state.creatures.map((creature) => ({
       ...creature,
       x: creature.home.x,
```

- [x] **Step 6: Run** the two test files of Step 2 — green — then `npm run check`: 1403 unit
  tests, and `npx playwright test -g "no upgrade"`: 1 passed.

- [x] **Step 7: Commit** — `Keep the upgrades in the state`. Body: the spread follows from
  them in every step; no step earns one yet.

---

### Task 4: Earning the upgrade

**Files:**
- Modify: `src/game/cases.ts`, `src/game/update.ts`
- Test: `tests/unit/cases.test.ts`, `tests/unit/floor.test.ts`

**Interfaces:**
- Consumes: `GameState.upgrades` (Task 3); `UPGRADES`, `strengthAfter` of `game/world`.
- Produces: `earn(state: GameState, region: string, upgrades: readonly Upgrade[] = UPGRADES): GameState`
  in `game/cases`; the step that solves a case calls it.

- [x] **Step 1: Write the failing tests.** `tests/unit/cases.test.ts` — imports, and one
  block at the end:

```diff
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -6,6 +6,7 @@
   CASES,
   type Case,
   clearRegion,
+  earn,
   isReady,
   isSolved,
   outcomeOf,
@@ -22,6 +23,7 @@
 import { speakerOf, speakersOf } from '../../src/game/talk';
 import type { Trace } from '../../src/game/trace';
 import { createInitialState, update } from '../../src/game/update';
+import { UPGRADES } from '../../src/game/world';
 import { textKey } from '../../src/text/text';
 import { grassMap } from './grass-map';
 
@@ -555,5 +557,119 @@
       textKey('policy.sales'),
       textKey('policy.marketing'),
     ]);
+  });
+});
+
+describe('the upgrade a case earns (0029)', () => {
+  /** Both sources, each waiting ten seconds on its first point, 96 px apart. */
+  const SOURCES: readonly NamedPoint[] = [
+    { name: 'person:sales:1', x: 64, y: 48, pause: 600 },
+    { name: 'person:sales:2', x: 128, y: 48 },
+    { name: 'person:marketing:1', x: 64, y: 144, pause: 600 },
+    { name: 'person:marketing:2', x: 128, y: 144 },
+  ];
+  /** 20x12 cells of open floor: one trace of Sales, one of Marketing. */
+  const BOTH: TileMap = grassMap(20, 12, { x: 104, y: 48 }, SOURCES, [
+    { name: 'trace:sales', x: 240, y: 32, width: 16, height: 16 },
+    { name: 'trace:marketing', x: 240, y: 128, width: 16, height: 16 },
+  ]);
+  /** Both traces found long ago: both cases are ready. */
+  const ready: GameState = { ...createInitialState(BOTH), tick: T0, traces: found(10, 20) };
+  /** The figure 40 px right of the colleague of Sales, or of the colleague of Marketing. */
+  const beside = (state: GameState, source: 'sales' | 'marketing'): GameState => ({
+    ...state,
+    player: { ...state.player, x: 104, y: source === 'sales' ? 48 : 144 },
+  });
+  const step = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
+    inputs.reduce((state, input) => update(state, input, BOTH), start);
+  /** Three presses of talk: the pages of a colleague open, turn and close. */
+  const talk = (start: GameState): GameState => step(start, TALK, NONE, TALK, NONE, TALK, NONE);
+
+  it('is the upgrade of the region, with a strength one above the base', () => {
+    const earned = earn(ready, 'marketing');
+    expect(earned).toStrictEqual({
+      ...ready,
+      upgrades: ['wide-cone'],
+      lamp: { ...ready.lamp, strength: 2 },
+    });
+    expect(ready.upgrades).toStrictEqual([]);
+  });
+
+  it('is nothing in a region without an upgrade: the state itself', () => {
+    expect(earn(ready, 'sales')).toBe(ready);
+    expect(earn(ready, 'reception')).toBe(ready);
+    expect(earn(ready, 'cellar')).toBe(ready);
+  });
+
+  it('is never earned twice', () => {
+    const once = earn(ready, 'marketing');
+    expect(earn(once, 'marketing')).toBe(once);
+  });
+
+  it('holds for every upgrade of the table: the second makes a strength of 3', () => {
+    const second = earn(earn(ready, 'marketing'), 'hr');
+    expect(second.upgrades).toStrictEqual(['wide-cone', 'filter']);
+    expect(second.lamp.strength).toBe(3);
+    // The strength follows from how many upgrades there are, not from which.
+    expect(earn(ready, 'hr').lamp.strength).toBe(2);
+    expect(earn(ready, 'hr').upgrades).toStrictEqual(['filter']);
+  });
+
+  it('reads the table it is given: the game passes its own', () => {
+    const table = [{ id: 'battery', earnedIn: 'sales' }];
+    expect(earn(ready, 'sales', table).upgrades).toStrictEqual(['battery']);
+    expect(earn(ready, 'marketing', table)).toBe(ready);
   });
+
+  it('comes with the step that solves Marketing: the wider cone and a strength of 2', () => {
+    const before = step(beside(ready, 'marketing'), TALK, NONE, TALK, NONE);
+    expect(before.upgrades).toStrictEqual([]);
+    expect(before.lamp.strength).toBe(1);
+    const solved = update(before, TALK, BOTH);
+    expect(solved.solved).toStrictEqual([{ region: 'marketing', at: T0 + 5 }]);
+    expect(solved.upgrades).toStrictEqual(['wide-cone']);
+    expect(solved.lamp.strength).toBe(2);
+    expect(solved.overview).toStrictEqual({ current: 6, max: 6 });
+  });
+
+  it('does not come with the step that solves Sales', () => {
+    const solved = talk(beside(ready, 'sales'));
+    expect(solved.solved).toStrictEqual([{ region: 'sales', at: T0 + 5 }]);
+    expect(solved.upgrades).toStrictEqual([]);
+    expect(solved.lamp.strength).toBe(1);
+  });
+
+  it('is the same in either order of the two cases', () => {
+    const marketingFirst = talk(beside(talk(beside(ready, 'marketing')), 'sales'));
+    const salesFirst = talk(beside(talk(beside(ready, 'sales')), 'marketing'));
+    for (const state of [marketingFirst, salesFirst]) {
+      expect(state.solved).toHaveLength(2);
+      expect(state.upgrades).toStrictEqual(['wide-cone']);
+      expect(state.lamp.strength).toBe(2);
+    }
+  });
+
+  it('is not earned again by a talk with the source of the solved case', () => {
+    const solved = talk(beside(ready, 'marketing'));
+    // "Afterwards" is one page: a press opens it, the next closes it.
+    const again = step(solved, TALK, NONE, TALK, NONE);
+    expect(again.dialogue).toBeNull();
+    expect(again.solved).toStrictEqual(solved.solved);
+    expect(again.upgrades).toStrictEqual(['wide-cone']);
+    expect(again.lamp.strength).toBe(2);
+  });
+
+  it('is never earned in a region without a case', () => {
+    const without = UPGRADES.filter(
+      (upgrade) => !CASES.some((entry) => entry.region === upgrade.earnedIn),
+    ).map((upgrade) => upgrade.id);
+    expect(without).toStrictEqual(['filter']);
+    const all = talk(beside(talk(beside(ready, 'marketing')), 'sales'));
+    expect(all.upgrades).not.toContain('filter');
+  });
+
+  it('survives a JSON round trip with the upgrade earned (INV-1)', () => {
+    const solved = talk(beside(ready, 'marketing'));
+    expect(JSON.parse(JSON.stringify(solved))).toStrictEqual(solved);
+  });
 });
```

  `tests/unit/floor.test.ts` — one import, and one block at the end:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -10,6 +10,7 @@
 import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
 import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
+import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { areasOf, inArea, shadowedAreas, veilOf } from '../../src/game/region';
 import { restInReach, restsOf, restUnderShadow } from '../../src/game/rest';
@@ -1835,3 +1836,83 @@
     }
   });
 });
+
+describe('the wider cone on the floor (0029)', () => {
+  const TALK: GameInput = { ...NO_INPUT, talk: true };
+  const SHINE: GameInput = { ...NO_INPUT, lamp: true };
+  const walls = wallsOf(floor.rects);
+  const routes = routesOf(floor.points);
+  const start = createInitialState(floor);
+  const sourceOf = (route: string) =>
+    start.movers.find((mover) => routes[mover.route]?.name === route);
+  /** Every trace found long ago, the figure 24 px below the colleague of the given route. */
+  const beside = (route: string): GameState => ({
+    ...start,
+    tick: 1000,
+    player: {
+      ...start.player,
+      x: sourceOf(route)?.x ?? 0,
+      y: (sourceOf(route)?.y ?? 0) + 24,
+    },
+    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+  });
+  const answer = (from: GameState): GameState =>
+    [TALK, NO_INPUT, TALK, NO_INPUT, TALK, NO_INPUT].reduce(
+      (state, input) => update(state, input, floor),
+      from,
+    );
+  /** The state with the figure 20 px below the wall of a region in the top corridor, looking up. */
+  const below = (state: GameState, region: string): GameState => {
+    const box = walls.find((wall) => wall.region === region)?.box ?? { x: 0, y: 0, width: 0 };
+    return {
+      ...state,
+      player: { ...state.player, x: box.x + box.width / 2, y: box.y + 24, facing: 'up' },
+    };
+  };
+  const shine = (from: GameState, count: number): GameState => {
+    let state = from;
+    for (let step = 0; step < count; step += 1) {
+      state = update(state, SHINE, floor);
+    }
+    return state;
+  };
+  const regionsOf = (state: GameState): (string | undefined)[] =>
+    state.shadowWalls.map((standing) => walls[standing.wall]?.region);
+  const marketing = answer(beside('person:marketing'));
+
+  it('has room for the figure below the walls of HR, Accounting and Development', () => {
+    for (const region of ['hr', 'accounting', 'development']) {
+      expect(reached(below(start, region).player), region).toBe(true);
+    }
+  });
+
+  it('is earned by the case of Marketing and not by the case of Sales', () => {
+    expect(marketing.upgrades).toStrictEqual(['wide-cone']);
+    expect(marketing.lamp.strength).toBe(2);
+    const sales = answer(beside('person:sales'));
+    expect(sales.upgrades).toStrictEqual([]);
+    expect(sales.lamp.strength).toBe(1);
+  });
+
+  it('holds the walls of HR and Accounting before it, with the basic lamp', () => {
+    for (const region of ['hr', 'accounting']) {
+      const held = shine(below(start, region), 180);
+      expect(regionsOf(held), region).toContain(region);
+      expect(noticeOf(held), region).toBe(NOTICE_SHADOW_TOO_DENSE);
+    }
+  });
+
+  it('lifts the walls of HR and Accounting after it, each in the 60th lit step', () => {
+    for (const region of ['hr', 'accounting']) {
+      const almost = shine(below(marketing, region), 59);
+      expect(regionsOf(almost), region).toContain(region);
+      expect(regionsOf(update(almost, SHINE, floor)), region).not.toContain(region);
+    }
+  });
+
+  it('still holds the wall of Development, with the notice of 0016', () => {
+    const held = shine(below(marketing, 'development'), 180);
+    expect(regionsOf(held)).toContain('development');
+    expect(noticeOf(held)).toBe(NOTICE_SHADOW_TOO_DENSE);
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/cases.test.ts tests/unit/floor.test.ts`.
  Expected: FAIL, 10 tests: 8 of 52 in `cases.test.ts`, 2 of 104 in `floor.test.ts`.
  `npx tsc --noEmit` reports one error: `cases.ts` has no exported member `earn`. Six tests
  of the diffs are green already, and that is right: they say what must **not** happen or
  what the others stand on — Sales earns nothing, no upgrade without a case, the round
  trip; the room below the three walls, and the walls that hold with the basic lamp and the
  wall of Development that holds with the stronger one.

- [x] **Step 3: Earning:**

```diff
--- a/src/game/cases.ts
+++ b/src/game/cases.ts
@@ -5,6 +5,7 @@
 import { wallsOf } from './shadow';
 import type { Dialogue, GameState, SolvedCase, TraceState } from './state';
 import { type Trace, tracesOf } from './trace';
+import { strengthAfter, UPGRADES, type Upgrade } from './world';
 
 /**
  * The cases (gameplay.md §6, world.md §2, features 0024 and 0028). A case belongs to a region
@@ -130,6 +131,29 @@
 }
 
 /**
+ * The state with the upgrade of a region earned (0029): when the world data has an upgrade
+ * that is earned in the region and the player does not have it yet, its id joins `upgrades`,
+ * and the lamp's strength is the base strength plus the number of upgrades. Otherwise the
+ * state itself: a region without an upgrade earns nothing, and no upgrade is earned twice.
+ */
+export function earn(
+  state: GameState,
+  region: string,
+  upgrades: readonly Upgrade[] = UPGRADES,
+): GameState {
+  const mine = upgrades.find((upgrade) => upgrade.earnedIn === region);
+  if (mine === undefined || state.upgrades.includes(mine.id)) {
+    return state;
+  }
+  const earned = [...state.upgrades, mine.id];
+  return {
+    ...state,
+    upgrades: earned,
+    lamp: { ...state.lamp, strength: strengthAfter(earned.length) },
+  };
+}
+
+/**
  * What goes with the shadow of a region whose case was solved in this step (0025): every
  * shadow wall of the region that still stands leaves `shadowWalls`, as a lifted wall does, and
  * every creature whose home lies in an area of the region leaves `creatures`, wherever it is.
```

- [x] **Step 4: The solving step** earns:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -1,6 +1,6 @@
 import type { TileMap } from '../engine/tiled';
 import { followPlayer } from './camera';
-import { answeredCase, clearRegion, progressOf, solve } from './cases';
+import { answeredCase, clearRegion, earn, progressOf, solve } from './cases';
 import { figuresFrom, figuresIn, figuresOf, isFirstMeeting } from './cast';
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
 import { openHelp, stepHelp } from './help';
@@ -100,8 +100,8 @@
  * What the step that closed a dialogue changes besides closing it (0024, 0025, 0026). Closing
  * the scene a game opens with ends the opening: `started` is this step's tick. Closing the
  * first meeting hands the lamp over. Closing the source's answer of a ready case solves the
- * case, and what is left of the region's shadow goes with it. Every other closing changes
- * nothing more.
+ * case, earns the upgrade of its region if it has one (0029), and what is left of the region's
+ * shadow goes with it. Every other closing changes nothing more.
  */
 function closed(
   stepped: GameState,
@@ -125,7 +125,7 @@
   );
   return answered === null
     ? stepped
-    : clearRegion(solve(stepped, answered.region), answered.region, content);
+    : clearRegion(earn(solve(stepped, answered.region), answered.region), answered.region, content);
 }
 
 /**
```

- [x] **Step 5: Run** the two test files of Step 2 — green, the tests of 0024, 0025 and 0028
  unchanged. Then `npm run check`: 1419 unit tests, the two recorded digests among them.

- [x] **Step 6: Commit** — `Earn the upgrade of a region with its case`. Body: the upgrade
  comes in the step that solves the case; solving stays what it was, and earning is a step
  of its own after it.

---

### Task 5: The notice

**Files:**
- Modify: `src/game/notice.ts`
- Test: `tests/unit/notice.test.ts`

**Interfaces:**
- Consumes: `notice.upgrade-wide-cone` (Task 1); `GameState.upgrades` (Task 3).
- Produces: `NOTICE_UPGRADE: Readonly<Partial<Record<string, TextKey>>>`,
  `UPGRADE_NOTICE_STEPS = 120`; `noticeOf` with the upgrade's line after the solved case's
  and before a found trace's.

- [x] **Step 1: Write the failing tests** — the imports, and one block at the end:

```diff
--- a/tests/unit/notice.test.ts
+++ b/tests/unit/notice.test.ts
@@ -1,12 +1,15 @@
 import { describe, expect, it } from 'vitest';
 import {
+  CASE_NOTICE_STEPS,
   NOTICE_CASE_SOLVED,
   NOTICE_LAMP,
   NOTICE_REST,
   NOTICE_SHADOW_TOO_DENSE,
   NOTICE_TRACE_FOUND,
+  NOTICE_UPGRADE,
   noticeOf,
   REST_NOTICE_STEPS,
+  UPGRADE_NOTICE_STEPS,
 } from '../../src/game/notice';
 import type { GameInput } from '../../src/game/player';
 import { type GameState, REST_RESULTS, type ShadowWallState } from '../../src/game/state';
@@ -254,3 +257,111 @@
     expect(noticeOf(update(state, NONE, map))).toBeNull();
   });
 });
+
+describe('the notice of an upgrade (0029)', () => {
+  const WIDER = textKey('notice.upgrade-wide-cone');
+  /** Marketing was solved at step 1000 and earned the wider cone; `since` steps have passed. */
+  const earned = (since: number): GameState => ({
+    ...BASE,
+    tick: 1000 + since,
+    solved: [{ region: 'marketing', at: 1000 }],
+    upgrades: ['wide-cone'],
+    lamp: { ...BASE.lamp, strength: 2 },
+  });
+
+  it('is the line of the wider cone, for two seconds', () => {
+    expect(NOTICE_UPGRADE['wide-cone']).toBe(WIDER);
+    expect([CASE_NOTICE_STEPS, UPGRADE_NOTICE_STEPS]).toStrictEqual([120, 120]);
+  });
+
+  it('follows the notice of the solved case: the case for 120 steps, the upgrade for the next 120', () => {
+    expect(noticeOf(earned(0))).toBe(NOTICE_CASE_SOLVED);
+    expect(noticeOf(earned(119))).toBe(NOTICE_CASE_SOLVED);
+    expect(noticeOf(earned(120))).toBe(WIDER);
+    expect(noticeOf(earned(239))).toBe(WIDER);
+    expect(noticeOf(earned(240))).toBeNull();
+    expect(noticeOf(earned(6000))).toBeNull();
+  });
+
+  it('is not shown after Sales is solved: that case earns nothing', () => {
+    for (const since of [0, 119, 120, 239, 240]) {
+      const sales: GameState = { ...earned(since), solved: [{ region: 'sales', at: 1000 }] };
+      expect(noticeOf(sales), `${since}`).toBe(since < 120 ? NOTICE_CASE_SOLVED : null);
+    }
+  });
+
+  it('is not shown for a solved case whose upgrade the player does not have', () => {
+    expect(noticeOf({ ...earned(150), upgrades: [] })).toBeNull();
+    expect(noticeOf({ ...earned(150), upgrades: ['filter'] })).toBeNull();
+  });
+
+  it('counts from the case that earned it, with Sales solved before or after', () => {
+    const before: GameState = {
+      ...earned(150),
+      solved: [
+        { region: 'sales', at: 400 },
+        { region: 'marketing', at: 1000 },
+      ],
+    };
+    expect(noticeOf(before)).toBe(WIDER);
+    // Sales solved 30 steps ago: its notice comes first, the upgrade's when it is over.
+    const after: GameState = {
+      ...earned(150),
+      solved: [
+        { region: 'marketing', at: 1000 },
+        { region: 'sales', at: 1120 },
+      ],
+    };
+    expect(noticeOf(after)).toBe(NOTICE_CASE_SOLVED);
+    expect(noticeOf({ ...after, tick: 1239 })).toBe(NOTICE_CASE_SOLVED);
+  });
+
+  it('comes after a wall that holds and before a found trace, a rest and the lamp key', () => {
+    const holds: GameState = {
+      ...earned(150),
+      lamp: { on: true, strength: 2, owned: true, used: true },
+      shadowWalls: [HOLDS],
+    };
+    expect(noticeOf(holds)).toBe(NOTICE_SHADOW_TOO_DENSE);
+    const found: GameState = {
+      ...earned(150),
+      traces: [{ trace: 0, light: 0, found: 1140 }],
+      rested: { at: 1140, result: 'restored' },
+      lamp: { on: false, strength: 2, owned: true, used: false },
+    };
+    expect(noticeOf(found)).toBe(WIDER);
+    expect(noticeOf({ ...found, tick: 1240 })).toBe(NOTICE_TRACE_FOUND);
+  });
+
+  it('is what a game shows that solves Marketing: the case, then the upgrade, then nothing', () => {
+    const map = grassMap(
+      20,
+      12,
+      { x: 104, y: 144 },
+      [
+        { name: 'person:marketing:1', x: 64, y: 144, pause: 600 },
+        { name: 'person:marketing:2', x: 128, y: 144 },
+      ],
+      [{ name: 'trace:marketing', x: 240, y: 128, width: 16, height: 16 }],
+    );
+    const TALK: GameInput = { ...NONE, talk: true };
+    const start = createInitialState(map);
+    let state: GameState = {
+      ...start,
+      tick: 1000,
+      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+    };
+    for (const input of [TALK, NONE, TALK, NONE, TALK]) {
+      state = update(state, input, map);
+    }
+    expect(state.solved).toStrictEqual([{ region: 'marketing', at: 1005 }]);
+    const shown: (string | null)[] = [];
+    for (let step = 0; step < 242; step += 1) {
+      shown.push(noticeOf(state));
+      state = update(state, NONE, map);
+    }
+    expect(shown.slice(0, 120).every((key) => key === NOTICE_CASE_SOLVED)).toBe(true);
+    expect(shown.slice(120, 240).every((key) => key === WIDER)).toBe(true);
+    expect(shown.slice(240)).toStrictEqual([null, null]);
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/notice.test.ts`. Expected: FAIL, 5 of
  30 tests. `npx tsc --noEmit` reports two errors: the two names are not exported. Two tests
  of the block are green already: no line after Sales, and none for an upgrade the player
  does not have.

- [x] **Step 3: The notice:**

```diff
--- a/src/game/notice.ts
+++ b/src/game/notice.ts
@@ -1,5 +1,6 @@
 import { type TextKey, textKey } from '../text/text';
 import type { GameState, RestResult } from './state';
+import { UPGRADES } from './world';
 
 /**
  * The notice (gameplay.md §2, feature 0016): one line the game itself says, shown at the
@@ -15,6 +16,13 @@
 /** Tune: two seconds from the solving step. */
 export const CASE_NOTICE_STEPS = 120;
 
+/** An upgrade was earned with a solved case (0029): what it does, by the upgrade's id. */
+export const NOTICE_UPGRADE: Readonly<Partial<Record<string, TextKey>>> = {
+  'wide-cone': textKey('notice.upgrade-wide-cone'),
+};
+/** Tune: two seconds, after the two seconds of the solved case's notice. */
+export const UPGRADE_NOTICE_STEPS = 120;
+
 /** A trace was found and is in the journal now (0022). */
 export const NOTICE_TRACE_FOUND: TextKey = textKey('notice.trace-found');
 /** Tune: two seconds from the find. */
@@ -33,10 +41,34 @@
 export const NOTICE_LAMP: TextKey = textKey('notice.lamp');
 
 /**
+ * The notice of an upgrade, or null (0029): a case was solved at least CASE_NOTICE_STEPS and
+ * less than CASE_NOTICE_STEPS + UPGRADE_NOTICE_STEPS steps ago, the world data has an upgrade
+ * that is earned in its region, the player has it, and the upgrade has a line.
+ */
+function upgradeNotice(state: GameState): TextKey | null {
+  for (const entry of state.solved) {
+    const since = state.tick - entry.at;
+    if (since < CASE_NOTICE_STEPS || since >= CASE_NOTICE_STEPS + UPGRADE_NOTICE_STEPS) {
+      continue;
+    }
+    const earned = UPGRADES.find(
+      (upgrade) => upgrade.earnedIn === entry.region && state.upgrades.includes(upgrade.id),
+    );
+    const key = earned === undefined ? undefined : NOTICE_UPGRADE[earned.id];
+    if (key !== undefined) {
+      return key;
+    }
+  }
+  return null;
+}
+
+/**
  * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
  * is on and cannot lift: a wall that gives way counts from 1 in its first step; that notice
  * comes first. Then, for CASE_NOTICE_STEPS steps from the solving step, that a case is solved
- * (0024). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was found (0022).
+ * (0024), and for the UPGRADE_NOTICE_STEPS steps after them what the case earned, if it earned
+ * an upgrade (0029). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was
+ * found (0022).
  * Then, for REST_NOTICE_STEPS steps from a press at a rest, what the rest gave (0027). Last,
  * while the lamp is owned and was never on, the line that names its key (0026): it has no time,
  * and it does not come back.
@@ -50,6 +82,10 @@
   if (solved) {
     return NOTICE_CASE_SOLVED;
   }
+  const earned = upgradeNotice(state);
+  if (earned !== null) {
+    return earned;
+  }
   const found = state.traces.some(
     (trace) => trace.found !== null && state.tick - trace.found < TRACE_NOTICE_STEPS,
   );
```

- [x] **Step 4: Run** `npx vitest run tests/unit/notice.test.ts` — green, the tests of 0016,
  0022, 0024, 0026 and 0027 unchanged — then `npm run check`: 1426 unit tests.

- [x] **Step 5: Commit** — `Say what the case of Marketing earned`. Body: the line follows the
  line of the solved case, so the player reads first that the case is solved and then what
  it earned.

---

### Task 6: The sheet of the wider cone

**Files:**
- Modify: `src/game/lamp.ts`, `tools/placeholder-lamp.ts`, `tools/gen-sprites.ts`
- Create: `public/sprites/lamp-wide.png` (generated)
- Test: `tests/unit/lamp.test.ts`, `tests/unit/gen-sprites.test.ts`,
  `tests/unit/assets.test.ts`

**Interfaces:**
- Consumes: `inCone` with a spread, `WIDE_SPREAD` (Task 2).
- Produces:
  - `WIDE_FRAME_SIZE = 72`, `WIDE_FRAME_APEX: Readonly<Record<Facing, Point>>` in `game/lamp`
  - `WIDE_LAMP_FRAME_SIZE`, `WIDE_LAMP_SHEET_WIDTH`, `WIDE_LAMP_SHEET_HEIGHT`,
    `isLitWide(facing, i, j)`, `renderWideLamp()` in `tools/placeholder-lamp.ts`
  - `encodeLampWidePng()` in `tools/gen-sprites.ts`
  - `public/sprites/lamp-wide.png`, 288x72

- [x] **Step 1: Write the failing tests.** `tests/unit/lamp.test.ts`:

```diff
--- a/tests/unit/lamp.test.ts
+++ b/tests/unit/lamp.test.ts
@@ -11,6 +11,8 @@
   SPREAD,
   spreadOf,
   WIDE_CONE,
+  WIDE_FRAME_APEX,
+  WIDE_FRAME_SIZE,
   WIDE_SPREAD,
 } from '../../src/game/lamp';
 import { FACINGS, type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';
@@ -143,3 +145,38 @@
     }
   });
 });
+
+describe('the frames of the wider cone (0029)', () => {
+  it('are 72 px wide: the width of the cone of three quarters at its end', () => {
+    expect(WIDE_FRAME_SIZE).toBe(72);
+    expect(WIDE_FRAME_SIZE).toBe(2 * CONE_LENGTH * WIDE_SPREAD);
+  });
+
+  it("puts each frame's apex at the middle of the edge the cone opens from", () => {
+    expect(WIDE_FRAME_APEX).toStrictEqual({
+      down: { x: 36, y: 0 },
+      up: { x: 36, y: 71 },
+      left: { x: 71, y: 36 },
+      right: { x: 0, y: 36 },
+    });
+  });
+
+  it('holds the whole cone in the frame, for every facing', () => {
+    for (const facing of FACINGS) {
+      const cone: Cone = { apex: WIDE_FRAME_APEX[facing], facing };
+      // One pixel round the frame: none of it is in the cone.
+      for (let k = -1; k <= WIDE_FRAME_SIZE; k += 1) {
+        for (const point of [
+          { x: k, y: -1 },
+          { x: k, y: WIDE_FRAME_SIZE },
+          { x: -1, y: k },
+          { x: WIDE_FRAME_SIZE, y: k },
+        ]) {
+          expect(inCone(point, cone, WIDE_SPREAD), `${facing} (${point.x}, ${point.y})`).toBe(
+            false,
+          );
+        }
+      }
+    }
+  });
+});
```

  `tests/unit/gen-sprites.test.ts`:

```diff
--- a/tests/unit/gen-sprites.test.ts
+++ b/tests/unit/gen-sprites.test.ts
@@ -4,13 +4,14 @@
 import { PNG } from 'pngjs';
 import { describe, expect, it } from 'vitest';
 import { FRAME_HEIGHT, FRAME_WIDTH } from '../../src/engine/sprite';
-import { FRAME_APEX, inCone } from '../../src/game/lamp';
+import { FRAME_APEX, inCone, WIDE_FRAME_APEX, WIDE_SPREAD } from '../../src/game/lamp';
 import { FACINGS, PHASES_PER_FACING } from '../../src/game/state';
 import { type PaletteColour, SHADOW_COLOUR } from '../../src/render/palette';
 import {
   encodeDogPng,
   encodeDronePng,
   encodeLampPng,
+  encodeLampWidePng,
   encodeOfficerPng,
   encodeOverviewPng,
   encodePersonPng,
@@ -27,6 +28,10 @@
   LAMP_SHEET_HEIGHT,
   LAMP_SHEET_WIDTH,
   renderLamp,
+  renderWideLamp,
+  WIDE_LAMP_FRAME_SIZE,
+  WIDE_LAMP_SHEET_HEIGHT,
+  WIDE_LAMP_SHEET_WIDTH,
 } from '../../tools/placeholder-lamp.ts';
 import {
   OVERVIEW_EMPTY,
@@ -258,7 +263,85 @@
     expect(LAMP[lampOffset(right, 47, 0) + 3]).toBe(0);
   });
 });
+
+const LAMP_WIDE_FILE = join(ROOT, 'public/sprites/lamp-wide.png');
+const LAMP_WIDE = renderWideLamp();
+
+/** The byte offset of pixel (i, j) of frame `index` of the wider cone's sheet. */
+function wideOffset(index: number, i: number, j: number): number {
+  return (j * WIDE_LAMP_SHEET_WIDTH + index * WIDE_LAMP_FRAME_SIZE + i) * 4;
+}
+
+describe('the sheet of the wider cone (0029)', () => {
+  it('is deterministic: two runs give byte-identical files', () => {
+    expect(encodeLampWidePng().equals(encodeLampWidePng())).toBe(true);
+  });
+
+  it('matches the committed file', () => {
+    const committed = PNG.sync.read(readFileSync(LAMP_WIDE_FILE));
+    expect([committed.width, committed.height]).toStrictEqual([288, 72]);
+    expect(Buffer.from(LAMP_WIDE).equals(committed.data)).toBe(true);
+  });
 
+  it('is 288x72: four 72x72 frames in one row, one per facing', () => {
+    expect([WIDE_LAMP_SHEET_WIDTH, WIDE_LAMP_SHEET_HEIGHT]).toStrictEqual([288, 72]);
+    expect(WIDE_LAMP_FRAME_SIZE).toBe(72);
+    expect(LAMP_WIDE).toHaveLength(288 * 72 * 4);
+  });
+
+  it("lights exactly the checkerboard inside each frame's cone of three quarters, pixel by pixel", () => {
+    const [r, g, b] = [0xfe, 0xe7, 0x61];
+    expect(LAMP_COLOUR).toBe('#fee761');
+    for (const [index, facing] of FACINGS.entries()) {
+      const cone = { apex: WIDE_FRAME_APEX[facing], facing };
+      for (let j = 0; j < WIDE_LAMP_FRAME_SIZE; j += 1) {
+        for (let i = 0; i < WIDE_LAMP_FRAME_SIZE; i += 1) {
+          const lit = (i + j) % 2 === 0 && inCone({ x: i, y: j }, cone, WIDE_SPREAD);
+          const o = wideOffset(index, i, j);
+          expect(
+            [LAMP_WIDE[o], LAMP_WIDE[o + 1], LAMP_WIDE[o + 2], LAMP_WIDE[o + 3]],
+            `${facing} (${i}, ${j})`,
+          ).toStrictEqual(lit ? [r, g, b, 255] : [0, 0, 0, 0]);
+        }
+      }
+    }
+  });
+
+  it('has exactly 852 opaque pixels per frame', () => {
+    const counts = FACINGS.map((_facing, index) => {
+      let opaque = 0;
+      for (let j = 0; j < WIDE_LAMP_FRAME_SIZE; j += 1) {
+        for (let i = 0; i < WIDE_LAMP_FRAME_SIZE; i += 1) {
+          opaque += LAMP_WIDE[wideOffset(index, i, j) + 3] === 255 ? 1 : 0;
+        }
+      }
+      return opaque;
+    });
+    expect(counts).toStrictEqual([852, 852, 852, 852]);
+  });
+
+  it('starts the right-facing cone at the apex alone and ends it 71 rows wide', () => {
+    const right = FACINGS.indexOf('right');
+    expect(LAMP_WIDE[wideOffset(right, 0, 36) + 3]).toBe(255);
+    expect(LAMP_WIDE[wideOffset(right, 0, 35) + 3]).toBe(0);
+    expect(LAMP_WIDE[wideOffset(right, 0, 37) + 3]).toBe(0);
+    expect(LAMP_WIDE[wideOffset(right, 47, 1) + 3]).toBe(255); // 47 + 1 is even
+    expect(LAMP_WIDE[wideOffset(right, 47, 71) + 3]).toBe(255);
+    expect(LAMP_WIDE[wideOffset(right, 47, 0) + 3]).toBe(0);
+    // The cone is 48 px long: the frame's last 24 columns are empty.
+    for (let i = 48; i < 72; i += 1) {
+      for (let j = 0; j < 72; j += 1) {
+        expect(LAMP_WIDE[wideOffset(right, i, j) + 3], `(${i}, ${j})`).toBe(0);
+      }
+    }
+  });
+
+  it('leaves the lamp sheet of 0007 as it was', () => {
+    const committed = PNG.sync.read(readFileSync(LAMP_FILE));
+    expect(Buffer.from(renderLamp()).equals(committed.data)).toBe(true);
+  });
+});
+
 const SNIPPET_FILE = join(ROOT, 'public/sprites/snippet.png');
 const SNIPPET = renderSnippet();
 
```

  `tests/unit/assets.test.ts`:

```diff
--- a/tests/unit/assets.test.ts
+++ b/tests/unit/assets.test.ts
@@ -68,6 +68,10 @@
     expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/lamp.png');
   });
 
+  it('checks the sheet of the wider cone under public/sprites/ with every other PNG (0029)', () => {
+    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/lamp-wide.png');
+  });
+
   it('checks the snippet sheet under public/sprites/ with every other PNG', () => {
     expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/snippet.png');
   });
```

- [x] **Step 2: Run them** —
  `npx vitest run tests/unit/lamp.test.ts tests/unit/gen-sprites.test.ts tests/unit/assets.test.ts`.
  Expected: FAIL: 3 of 44 in `lamp.test.ts`, 1 of 25 in `assets.test.ts`, and
  `gen-sprites.test.ts` does not load — it imports names that do not exist, so the file
  fails as a whole and none of its tests runs. `npx tsc --noEmit` reports 8 errors.

- [x] **Step 3: The frames** of the wide sheet, in `game/lamp`:

```diff
--- a/src/game/lamp.ts
+++ b/src/game/lamp.ts
@@ -49,6 +49,20 @@
   right: { x: 0, y: 24 },
 };
 
+/** The side of a frame of the wider cone's sheet (0029): the cone's width at its end, 72 px. */
+export const WIDE_FRAME_SIZE = 2 * CONE_LENGTH * WIDE_SPREAD;
+
+/**
+ * Where the apex sits in a WIDE_FRAME_SIZE × WIDE_FRAME_SIZE frame of the wider cone's sheet,
+ * per facing: the middle of the edge the cone opens from, as in FRAME_APEX (0029).
+ */
+export const WIDE_FRAME_APEX: Readonly<Record<Facing, Point>> = {
+  down: { x: 36, y: 0 },
+  up: { x: 36, y: 71 },
+  left: { x: 71, y: 36 },
+  right: { x: 0, y: 36 },
+};
+
 /** The cone the figure's lamp casts: the apex LAMP_HEIGHT above the feet, in the facing. */
 export function lampCone(player: PlayerState): Cone {
   return { apex: { x: player.x, y: player.y - LAMP_HEIGHT }, facing: player.facing };
```

- [x] **Step 4: The generator.** Both sheets come from one loop; the lamp's sheet must come
  out as it was:

```diff
--- a/tools/placeholder-lamp.ts
+++ b/tools/placeholder-lamp.ts
@@ -1,4 +1,11 @@
-import { CONE_LENGTH, FRAME_APEX, inCone } from '../src/game/lamp.ts';
+import {
+  CONE_LENGTH,
+  FRAME_APEX,
+  inCone,
+  WIDE_FRAME_APEX,
+  WIDE_FRAME_SIZE,
+  WIDE_SPREAD,
+} from '../src/game/lamp.ts';
 import { FACINGS, type Facing } from '../src/game/state.ts';
 import type { PaletteColour } from '../src/render/palette.ts';
 import { rgb } from './placeholder-tiles.ts';
@@ -7,8 +14,9 @@
  * The placeholder lamp sheet (visual.md §5, feature 0007): the cone of light as four 48x48
  * frames in one row, one per facing in FACINGS order, each a checkerboard of one palette colour
  * cut to the cone from the frame's apex pixel (game/lamp, FRAME_APEX). Drawn from the same
- * predicate the game tests with, so the picture is the rule. Pure — it returns pixels;
- * tools/gen-sprites.ts writes the file.
+ * predicate the game tests with, so the picture is the rule. The wider cone of 0029 has a sheet
+ * of its own, four 72x72 frames, drawn the same way with the wider spread. Pure — it returns
+ * pixels; tools/gen-sprites.ts writes the files.
  */
 
 /** The palette's yellow: neither the grass nor the path of the placeholder tiles. */
@@ -16,24 +24,49 @@
 export const LAMP_FRAME_SIZE = CONE_LENGTH;
 export const LAMP_SHEET_WIDTH = FACINGS.length * LAMP_FRAME_SIZE;
 export const LAMP_SHEET_HEIGHT = LAMP_FRAME_SIZE;
+export const WIDE_LAMP_FRAME_SIZE = WIDE_FRAME_SIZE;
+export const WIDE_LAMP_SHEET_WIDTH = FACINGS.length * WIDE_LAMP_FRAME_SIZE;
+export const WIDE_LAMP_SHEET_HEIGHT = WIDE_LAMP_FRAME_SIZE;
 
 /** Pixel (i, j) of a facing's frame is lit when it lies in the cone from the frame's apex and i + j is even. */
 export function isLit(facing: Facing, i: number, j: number): boolean {
   return (i + j) % 2 === 0 && inCone({ x: i, y: j }, { apex: FRAME_APEX[facing], facing });
 }
 
-/** RGBA, row-major, LAMP_SHEET_WIDTH × LAMP_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
-export function renderLamp(): Uint8Array {
-  const data = new Uint8Array(LAMP_SHEET_WIDTH * LAMP_SHEET_HEIGHT * 4);
+/** The same for a frame of the wider cone's sheet: the cone of WIDE_SPREAD from its apex (0029). */
+export function isLitWide(facing: Facing, i: number, j: number): boolean {
+  return (
+    (i + j) % 2 === 0 &&
+    inCone({ x: i, y: j }, { apex: WIDE_FRAME_APEX[facing], facing }, WIDE_SPREAD)
+  );
+}
+
+/** Four square frames of `size` in one row, one per facing: RGBA, row-major, alpha 0 or 255. */
+function renderSheet(
+  size: number,
+  lit: (facing: Facing, i: number, j: number) => boolean,
+): Uint8Array {
+  const width = FACINGS.length * size;
+  const data = new Uint8Array(width * size * 4);
   const [r, g, b] = rgb(LAMP_COLOUR);
   for (const [n, facing] of FACINGS.entries()) {
-    for (let j = 0; j < LAMP_FRAME_SIZE; j += 1) {
-      for (let i = 0; i < LAMP_FRAME_SIZE; i += 1) {
-        if (isLit(facing, i, j)) {
-          data.set([r, g, b, 255], (j * LAMP_SHEET_WIDTH + n * LAMP_FRAME_SIZE + i) * 4);
+    for (let j = 0; j < size; j += 1) {
+      for (let i = 0; i < size; i += 1) {
+        if (lit(facing, i, j)) {
+          data.set([r, g, b, 255], (j * width + n * size + i) * 4);
         }
       }
     }
   }
   return data;
 }
+
+/** RGBA, row-major, LAMP_SHEET_WIDTH × LAMP_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
+export function renderLamp(): Uint8Array {
+  return renderSheet(LAMP_FRAME_SIZE, isLit);
+}
+
+/** RGBA, row-major, WIDE_LAMP_SHEET_WIDTH × WIDE_LAMP_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
+export function renderWideLamp(): Uint8Array {
+  return renderSheet(WIDE_LAMP_FRAME_SIZE, isLitWide);
+}
```

```diff
--- a/tools/gen-sprites.ts
+++ b/tools/gen-sprites.ts
@@ -3,8 +3,15 @@
 import { DOG_SHEET_HEIGHT, DOG_SHEET_WIDTH, renderDog } from './placeholder-dog.ts';
 import { DRONE_SHEET_HEIGHT, DRONE_SHEET_WIDTH, renderDrone } from './placeholder-drone.ts';
 import { FONT_SHEET_HEIGHT, FONT_SHEET_WIDTH, renderFont } from './placeholder-font.ts';
-import { LAMP_SHEET_HEIGHT, LAMP_SHEET_WIDTH, renderLamp } from './placeholder-lamp.ts';
 import {
+  LAMP_SHEET_HEIGHT,
+  LAMP_SHEET_WIDTH,
+  renderLamp,
+  renderWideLamp,
+  WIDE_LAMP_SHEET_HEIGHT,
+  WIDE_LAMP_SHEET_WIDTH,
+} from './placeholder-lamp.ts';
+import {
   OVERVIEW_SHEET_HEIGHT,
   OVERVIEW_SHEET_WIDTH,
   renderOverview,
@@ -32,7 +39,8 @@
  * public/sprites/font.png of 0016 from tools/placeholder-font.ts; and public/sprites/officer.png
  * of 0017 from tools/placeholder-person.ts; and public/sprites/trace.png of 0022 from
  * tools/placeholder-trace.ts; and public/sprites/shadow-veil.png of 0023 from
- * tools/placeholder-veil.ts. Deterministic — pngjs writes no timestamp — and Node
+ * tools/placeholder-veil.ts; and public/sprites/lamp-wide.png of 0029 from
+ * tools/placeholder-lamp.ts. Deterministic — pngjs writes no timestamp — and Node
  * runs this TypeScript file directly, without a transpiler.
  */
 
@@ -48,6 +56,13 @@
   return PNG.sync.write(png);
 }
 
+/** The wider cone's sheet (0029). */
+export function encodeLampWidePng(): Buffer {
+  const png = new PNG({ width: WIDE_LAMP_SHEET_WIDTH, height: WIDE_LAMP_SHEET_HEIGHT });
+  png.data = Buffer.from(renderWideLamp());
+  return PNG.sync.write(png);
+}
+
 export function encodeSnippetPng(): Buffer {
   const png = new PNG({ width: SNIPPET_SHEET_WIDTH, height: SNIPPET_SHEET_HEIGHT });
   png.data = Buffer.from(renderSnippet());
@@ -120,6 +135,7 @@
   mkdirSync('public/sprites', { recursive: true });
   writeFileSync('public/sprites/player.png', encodePng());
   writeFileSync('public/sprites/lamp.png', encodeLampPng());
+  writeFileSync('public/sprites/lamp-wide.png', encodeLampWidePng());
   writeFileSync('public/sprites/snippet.png', encodeSnippetPng());
   writeFileSync('public/sprites/overview.png', encodeOverviewPng());
   for (const look of PERSON_SHIRTS.keys()) {
```

- [x] **Step 5: Generate** — `npm run gen-sprites`. Then `git status --short public` shows one
  line, `?? public/sprites/lamp-wide.png`: no other sheet changed.
  `shasum -a 256 public/sprites/lamp-wide.png` gives
  `fd1f4422d52389261422fb67a11af997a1858d979de233bc24d9a109addbe5cd`.
  If another sheet changed, stop.

- [x] **Step 6: Run** the three test files of Step 2 — green, the tests of the lamp sheet of
  0007 unchanged. Then `npm run check`: 1437 unit tests. The asset test holds the new sheet
  to the palette with every other PNG.

- [x] **Step 7: Commit** — `Draw the sheet of the wider cone`, with the PNG.

---

### Task 7: The wider cone in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`, `src/main.ts`
- Test: `tests/unit/draw-scene.test.ts`, `tests/unit/draw-journal.test.ts`,
  `tests/unit/draw-help.test.ts`

**Interfaces:**
- Consumes: `WIDE_CONE`, `WIDE_FRAME_APEX`, `WIDE_FRAME_SIZE` (Tasks 2 and 6);
  `GameState.upgrades` (Task 3); `/sprites/lamp-wide.png` (Task 6).
- Produces: `SceneContent.lampWideSheet: SpriteSheet`;
  `lampFrameOrigin(player, camera, apexes = FRAME_APEX)`; the scene draws the cone from the
  wide sheet while `upgrades` holds `wide-cone`.

- [x] **Step 1: Write the failing tests.** The three scene fixtures get the sheet, and
  `tests/unit/draw-scene.test.ts` gets one block at its end:

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -1,5 +1,6 @@
 import { describe, expect, it } from 'vitest';
 import { EMPTY, type TileMap } from '../../src/engine/tiled';
+import { WIDE_FRAME_APEX } from '../../src/game/lamp';
 import { NO_INPUT } from '../../src/game/player';
 import {
   type CreatureState,
@@ -101,6 +102,7 @@
   veilSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
   playerSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 },
   lampSheet: { image: {} as ImageBitmap, frameWidth: 48, frameHeight: 48 },
+  lampWideSheet: { image: {} as ImageBitmap, frameWidth: 72, frameHeight: 72 },
   creatureSheets: { snippet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 } },
   overviewSheet: { image: {} as ImageBitmap, frameWidth: 8, frameHeight: 8 },
   shadowWallSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
@@ -1622,5 +1624,87 @@
     const used = recordingRenderer();
     drawScene(used, { ...waiting, lamp: { ...waiting.lamp, used: true } }, CONTENT);
     expect(used.calls).not.toContain(BAR);
+  });
+});
+
+describe('the wider cone in the scene (0029)', () => {
+  const camera = { x: 5, y: 7 };
+  const feet = { x: 20.4, y: 30.6 };
+  /** The lamp on, with the wider cone earned or not. */
+  const shining = (facing: PlayerState['facing'], wide: boolean): GameState => ({
+    ...state({ ...feet, facing }, camera, true),
+    upgrades: wide ? ['wide-cone'] : [],
+  });
+  const cone = (scene: GameState): { call: string | undefined; sheet: unknown } => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, scene, CONTENT);
+    return {
+      call: renderer.calls.find((call) => call.startsWith('drawSprite')),
+      sheet: renderer.sheets[0],
+    };
+  };
+
+  it('places a frame of the wide sheet by its own apex: feet (20.4, 30.6), camera (5, 7)', () => {
+    // The apex is (20, 19) on the map: (15, 12) on the surface.
+    const origin = (facing: PlayerState['facing']) =>
+      lampFrameOrigin(player({ ...feet, facing }), camera, WIDE_FRAME_APEX);
+    expect(origin('down')).toStrictEqual({ x: -21, y: 12 });
+    expect(origin('up')).toStrictEqual({ x: -21, y: -59 });
+    expect(origin('left')).toStrictEqual({ x: -56, y: -24 });
+    expect(origin('right')).toStrictEqual({ x: 15, y: -24 });
+  });
+
+  it('draws the cone from the wide sheet, by the facing, when the player has the wider cone', () => {
+    expect(cone(shining('down', true))).toStrictEqual({
+      call: 'drawSprite 0 at -21,12',
+      sheet: CONTENT.lampWideSheet,
+    });
+    expect(cone(shining('up', true))).toStrictEqual({
+      call: 'drawSprite 1 at -21,-59',
+      sheet: CONTENT.lampWideSheet,
+    });
+    expect(cone(shining('left', true))).toStrictEqual({
+      call: 'drawSprite 2 at -56,-24',
+      sheet: CONTENT.lampWideSheet,
+    });
+    expect(cone(shining('right', true))).toStrictEqual({
+      call: 'drawSprite 3 at 15,-24',
+      sheet: CONTENT.lampWideSheet,
+    });
   });
+
+  it('draws the cone from the lamp sheet as in 0007 without it', () => {
+    expect(cone(shining('down', false))).toStrictEqual({
+      call: 'drawSprite 0 at -9,12',
+      sheet: CONTENT.lampSheet,
+    });
+    expect(cone(shining('left', false))).toStrictEqual({
+      call: 'drawSprite 2 at -32,-12',
+      sheet: CONTENT.lampSheet,
+    });
+    expect(CONTENT.lampWideSheet).not.toStrictEqual(CONTENT.lampSheet);
+  });
+
+  it('draws it where the narrow cone is drawn: after detail and before the player', () => {
+    const calls = (wide: boolean): string[] => {
+      const renderer = recordingRenderer();
+      drawScene(renderer, shining('left', wide), CONTENT);
+      return renderer.calls;
+    };
+    const narrow = calls(false);
+    const wide = calls(true);
+    expect(wide).toHaveLength(narrow.length);
+    const at = narrow.indexOf('drawSprite 2 at -32,-12');
+    expect(wide[at]).toBe('drawSprite 2 at -56,-24');
+    expect(wide.filter((_call, n) => n !== at)).toStrictEqual(
+      narrow.filter((_call, n) => n !== at),
+    );
+  });
+
+  it('draws no cone with the lamp off, whatever the upgrades', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, { ...shining('down', true), lamp: state({}).lamp }, CONTENT);
+    expect(renderer.sheets).not.toContain(CONTENT.lampWideSheet);
+    expect(renderer.sheets).not.toContain(CONTENT.lampSheet);
+  });
 });
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -68,6 +68,7 @@
   veilSheet: sheet(16, 16),
   playerSheet: sheet(16, 24),
   lampSheet: sheet(48, 48),
+  lampWideSheet: sheet(72, 72),
   creatureSheets: { snippet: sheet(16, 16) },
   overviewSheet: sheet(8, 8),
   shadowWallSheet: sheet(16, 16),
```

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -66,6 +66,7 @@
   veilSheet: sheet(16, 16),
   playerSheet: sheet(16, 24),
   lampSheet: sheet(48, 48),
+  lampWideSheet: sheet(72, 72),
   creatureSheets: { snippet: sheet(16, 16) },
   overviewSheet: sheet(8, 8),
   shadowWallSheet: sheet(16, 16),
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/draw-scene.test.ts`. Expected: FAIL, 3
  of 106 tests. `npx tsc --noEmit` reports 10 errors: `lampWideSheet` is no field of the
  content, and `lampFrameOrigin` takes two arguments. Two tests of the block are green
  already: the narrow cone as in 0007, and no cone with the lamp off.

- [x] **Step 3: The scene:**

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -4,7 +4,7 @@
 import { type Figure, figuresIn, figuresOf } from '../game/cast';
 import { CREATURE_SIZE } from '../game/creature';
 import { HELP_HINT, startHintDue } from '../game/help';
-import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
+import { FRAME_APEX, LAMP_HEIGHT, WIDE_CONE, WIDE_FRAME_APEX } from '../game/lamp';
 import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
 import { DARK_STEPS } from '../game/overview';
@@ -13,6 +13,7 @@
 import {
   type CreatureState,
   FACINGS,
+  type Facing,
   type FigureState,
   type GameState,
   type MoverState,
@@ -50,6 +51,8 @@
   readonly playerSheet: SpriteSheet;
   /** Four 48x48 frames, one per facing in FACINGS order (0007). */
   readonly lampSheet: SpriteSheet;
+  /** Four 72x72 frames, one per facing: the cone with the upgrade `wide-cone` (0029). */
+  readonly lampWideSheet: SpriteSheet;
   /** One sheet per species: three 16x16 frames — two free, one frozen (0008). */
   readonly creatureSheets: Readonly<Record<Species, SpriteSheet>>;
   /** Two 8x8 frames: a full heart, an empty heart (0009, 0012). */
@@ -95,10 +98,15 @@
 /**
  * The top-left corner of the lamp frame on the surface (0007): the apex, (round(x),
  * round(y) − 12), rounded as the figure's sprite rounds, minus the frame's apex pixel, minus
- * the camera — so cone and figure agree pixel for pixel.
+ * the camera — so cone and figure agree pixel for pixel. `apexes` are the apex pixels of the
+ * sheet the frame is from: FRAME_APEX, or WIDE_FRAME_APEX for the wider cone (0029).
  */
-export function lampFrameOrigin(player: PlayerState, camera: Point): Point {
-  const apex = FRAME_APEX[player.facing];
+export function lampFrameOrigin(
+  player: PlayerState,
+  camera: Point,
+  apexes: Readonly<Record<Facing, Point>> = FRAME_APEX,
+): Point {
+  const apex = apexes[player.facing];
   return {
     x: Math.round(player.x) - apex.x - camera.x,
     y: Math.round(player.y) - LAMP_HEIGHT - apex.y - camera.y,
@@ -401,8 +409,11 @@
     );
   }
   if (state.lamp.on) {
-    const origin = lampFrameOrigin(player, camera);
-    renderer.drawSprite(content.lampSheet, lampFrame(player), origin.x, origin.y);
+    // With the upgrade the cone is drawn from its own sheet, placed by its own apex (0029).
+    const wide = state.upgrades.includes(WIDE_CONE);
+    const origin = lampFrameOrigin(player, camera, wide ? WIDE_FRAME_APEX : FRAME_APEX);
+    const sheet = wide ? content.lampWideSheet : content.lampSheet;
+    renderer.drawSprite(sheet, lampFrame(player), origin.x, origin.y);
   }
   const walls = wallsOf(content.map.rects);
   for (const standing of state.shadowWalls) {
```

- [x] **Step 4: The loader:**

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -5,7 +5,7 @@
 import { parseTileMap, parseTileset, TILE_SIZE, tilesetSource } from './engine/tiled';
 import { CAST } from './game/cast';
 import { CREATURE_SIZE } from './game/creature';
-import { CONE_LENGTH } from './game/lamp';
+import { CONE_LENGTH, WIDE_FRAME_SIZE } from './game/lamp';
 import { MOVER_SIZE } from './game/mover';
 import type { GameInput } from './game/player';
 import type { GameState } from './game/state';
@@ -30,6 +30,7 @@
 const MAP_URL = '/maps/floor.tmj';
 const PLAYER_SHEET_URL = '/sprites/player.png';
 const LAMP_SHEET_URL = '/sprites/lamp.png';
+const LAMP_WIDE_SHEET_URL = '/sprites/lamp-wide.png';
 const SNIPPET_SHEET_URL = '/sprites/snippet.png';
 const OVERVIEW_SHEET_URL = '/sprites/overview.png';
 /** The movers' sheets (0015): a person of look n is person-(n + 1).png. */
@@ -82,6 +83,11 @@
       image: await loadImage(LAMP_SHEET_URL),
       frameWidth: CONE_LENGTH,
       frameHeight: CONE_LENGTH,
+    },
+    lampWideSheet: {
+      image: await loadImage(LAMP_WIDE_SHEET_URL),
+      frameWidth: WIDE_FRAME_SIZE,
+      frameHeight: WIDE_FRAME_SIZE,
     },
     creatureSheets: {
       snippet: {
```

- [x] **Step 5: Run** `npx vitest run tests/unit/draw-scene.test.ts tests/unit/draw-journal.test.ts tests/unit/draw-help.test.ts` —
  green, the tests of the lamp in the scene of 0007 unchanged. Then `npm run check`: 1442
  unit tests, and `npm run test:e2e` twice: 18 passed, 3 skipped, both times.

- [x] **Step 6: Commit** — `Draw the wider cone from its own sheet`.

---

### Task 8: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/visual.md`,
  `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md`

The diffs are against `main` at `715e295`. If a line has moved, put the text where the diff
means it; do not change the words without a reason. `architecture.md` changes in §1 and §8
too, beyond the sections the spec names: its directory listing names the generator's sheets,
and §8 lists the notices in their order.

- [x] **Step 1: `gameplay.md`** §2 and §5:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -69,6 +69,15 @@
 `Spur gefunden. Sie steht im Journal.` for two seconds; a wall that holds says its own line
 first.
 
+**As built** (feature 0029): the wider cone is the first upgrade. It comes with the step that
+solves the case of Marketing; nobody hands it over. From then on the cone opens with slope 3/4
+to each side instead of 1/2 — 72 px wide at its end, one and a half times as wide, *tune* —
+and stays 48 px long. Everything the light does, it does in the wider cone: a creature
+freezes, a wall is lit and a trace is seen. The same step raises the lamp's strength to 2. A
+line at the bottom says `Die Lampe leuchtet jetzt breiter und stärker.` for two seconds, after
+the two seconds of the solved case's line. Larger creatures that only the wider cone captures
+come with the first of them.
+
 ## 3. Three layers of opposition
 
 Combat matters but is never the whole answer. Every piece of shadow belongs to one layer:
@@ -128,6 +137,14 @@
 outside 0–3, none above what the lamp reaches with every upgrade, and no upgrade earned in a region
 the lamp cannot open before it. Nothing earns an upgrade before M6.
 
+**As built** (feature 0029): the step that solves a case earns the upgrade of its region, when
+the table has one and the player does not have it yet. The upgrades the player has are in the
+state, in the order they were earned, and the lamp's strength is the base strength plus their
+number. Solving Marketing earns the wider cone and a strength of 2: the shadow walls of HR and
+Accounting give way after one second of light, and the wall of Development still holds.
+Solving Sales earns nothing. The rooms of HR and Accounting can be entered from then on; their
+cases come with their own features.
+
 Two keys where the story demands them: the keycard to the server room, handed over by the
 convinced managing director, and one further door chosen in the case specs.
 
```

- [x] **Step 2: `world.md`** §1:

```diff
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -114,6 +114,11 @@
 the wider cone in Marketing (strength 2), the colour filter in HR (strength 3). A case spec of M6
 may move either; the gating test then guards the new place.
 
+**As built** (feature 0029): the case of Marketing earns the wider cone. With it the walls of
+HR and Accounting are lifted like the thin ones, and the player enters both rooms; they are
+under their shadow and have nothing of their own until their cases come. The wall of
+Development holds until the colour filter.
+
 **As built** (feature 0023): every region of the floor has an area in the map — a rectangle
 named `region:<id>` in the `objects` layer that covers its room as the layout knows it, with its
 upper and its left wall. The meeting rooms have two areas, one per room. A room whose region has
```

- [x] **Step 3: `visual.md`** §3:

```diff
--- a/docs/spec/visual.md
+++ b/docs/spec/visual.md
@@ -59,6 +59,12 @@
 like a colleague, drawn from the figure's frames in a shirt no one else wears, so it is told from
 the colleagues at a glance. The data protection officer's shirt is `#c0cbdc`, light grey.
 
+**The lamp's cone** (features 0007, 0029) is a yellow checkerboard, `#fee761`, on the floor
+under every figure: a 48x48 frame per facing, as wide at its end as it is long. With the wider
+cone it is a 72x72 frame per facing from a sheet of its own, `lamp-wide.png`: 72 px wide at
+its end and still 48 px long, so a third of the frame along the facing stays empty. Either
+frame is placed by its apex pixel, the middle of the edge the cone opens from.
+
 **The display.** Two things are drawn over the world. The row of overview hearts in the
 top-left corner (features 0009, 0012): 8x8, 4 px from the corner, one every 10 px, one per point
 of the maximum. And the notice (feature 0016), while there is one: a bar in `#181425` at the
```

- [x] **Step 4: `architecture.md`** §1, §2, §5, §7 and §8:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -52,10 +52,11 @@
   placeholder-player.ts the placeholder figure as pure data: the pixels of its sprite sheet
   gen-sprites.ts        writes the figure, the lamp, the snippet, the overview sheet, the
                         movers' seven sheets, the shadow-wall sheet, the font sheet, the
-                        officer's sheet, the trace sheet and the veil sheet to
-                        public/sprites/; `npm run gen-sprites`
-  placeholder-lamp.ts   the placeholder lamp sheet as pure data: the cone of light, one 48x48
-                        frame per facing, drawn from game/lamp
+                        officer's sheet, the trace sheet, the veil sheet and the wider
+                        cone's sheet to public/sprites/; `npm run gen-sprites`
+  placeholder-lamp.ts   the placeholder lamp sheets as pure data: the cone of light, one 48x48
+                        frame per facing, and the wider cone, one 72x72 frame per facing
+                        (0029), drawn from game/lamp
   placeholder-snippet.ts the placeholder snippet sheet as pure data: three 16x16 frames
   placeholder-overview.ts the placeholder overview sheet as pure data: two 8x8 frames,
                         a full and an empty heart
@@ -98,7 +99,7 @@
 ## 2. The state model
 
 One `GameState` object holds everything that changes while playing. Today that is `tick`, the
-logic steps since the start, the player, the camera, the lamp, the creatures, the movers, the
+logic steps since the start, the player, the camera, the lamp, the upgrades, the creatures, the movers, the
 standing shadow walls, the traces, the solved cases, the standing figures, the open dialogue,
 the open journal,
 whether the help is open, the input of the last step, the captured count, overview and the step
@@ -160,6 +161,20 @@
 half-open, opening with slope 1/2 to each side; `inCone(point, cone)` is the one test the game
 makes on it, and `FRAME_APEX` names where the apex sits in a 48x48 frame of the lamp sheet, per
 facing.
+
+`upgrades` is an array of the ids of the upgrades the player has earned, in the order they
+were earned (feature 0029); the ids are those of `UPGRADES` in `game/world`. It is empty at the
+start, and the wake keeps it. The step that solves a case also earns the upgrade of its region
+(`earn` in `game/cases`): when `UPGRADES` has an upgrade that is earned in the region and
+`upgrades` does not hold it, its id is appended and `lamp.strength` becomes
+`strengthAfter(upgrades.length)`, the base strength plus the number of upgrades. No other step
+changes either. Solving Sales earns nothing; solving Marketing earns `wide-cone` and a strength
+of 2. The cone's **spread** is its slope to each side and is derived, not stored
+(`spreadOf(upgrades)` in `game/lamp`): `SPREAD`, 1/2, without `wide-cone` and `WIDE_SPREAD`,
+3/4, with it. `update` derives it once per ordinary step and hands it to the step of the
+creatures, the walls and the traces; `inCone(point, cone, spread)` and
+`meetsCone(box, cone, spread)` take it as their last argument, and without it they test the
+narrow cone. A state whose `upgrades` is empty steps exactly as before 0029.
 
 `creatures` is an array of `{ species, x, y, light, home }` in the order of the map's points
 (feature 0008). `home` is the point the creature was made from; it never changes (feature 0009). `x` and `y` are the feet in map pixels, floating point, the bottom centre of a 16x16
@@ -229,7 +244,7 @@
 stepped figure and the map **as loaded**, so a wall does not block its own light. A wall is in
 the light when the lamp is on, its box meets the cone (`meetsCone`, closed form: in the cone's
 coordinates, near = max(d0, 0), far = min(d1, 48), and the gap from 0 across the facing to the
-box is at most far / 2, with near ≤ far and near < 48), and no opaque box lies on the line from
+box is at most far × spread — far / 2 for the narrow cone —, with near ≤ far and near < 48), and no opaque box lies on the line from
 (x, y − 4) to the point of the wall's box nearest to it — along the wall the box ends at its last
 pixel. Not in the light: `lit` false, `light` 0. In the light with `lamp.strength` below the
 wall's density: `lit` true, `light` 0, it holds. Otherwise `light` grows by 1, and in the step it
@@ -340,6 +355,7 @@
 step whose press closes the source's answer of a ready case that is not solved **solves** it
 (`answeredCase`, `solve`, feature 0024): besides the above it adds `{ region, at }` with the
 step's `tick` to `solved`, and sets `overview` to `{ current: max + 1, max: max + 1 }`. The same
+step earns the upgrade of the region, if it has one (`earn`, feature 0029). The same
 step takes what is left of the region's shadow with it (`clearRegion`, feature 0025): every
 entry of `shadowWalls` whose wall belongs to the region leaves the list, as a lifted wall does,
 and every creature whose `home` lies in an area of the region (`inArea`: inside the rectangle,
@@ -487,7 +503,7 @@
 sprite round the same value.
 
 `drawSprite(sheet, frame, x, y)` draws frame `frame` of a sprite sheet — frames of the sheet's own
-`frameWidth × frameHeight` in one row; the figure's are 16x24, the lamp's 48x48 — with its
+`frameWidth × frameHeight` in one row; the figure's are 16x24, the lamp's 48x48, the wider cone's 72x72 — with its
 top-left corner at (x, y), from the decoded image like `drawTile`, smoothing off.
 `render/draw-scene` holds the draw order of a frame: clear, then `ground`, `detail`, the veil
 over the cells under shadow (feature 0023) and over those of a region that is clearing (feature
@@ -504,7 +520,10 @@
 (round(x), round(y) − 12), minus the frame's apex pixel (`game/lamp`, `FRAME_APEX`: down (24, 0),
 up (24, 47), left (47, 24), right (0, 24)), minus the camera; its frame is the facing's index.
 Cone and figure round the same values, so they agree pixel for pixel, and the cone lies under the
-figure. A creature's frame has its top-left corner at (round(x) − 8 − camera.x, round(y) − 16 −
+figure. While `upgrades` holds `wide-cone` (feature 0029) the cone is drawn from
+`lampWideSheet` instead, at the same place in the order, its 72x72 frame placed by
+`WIDE_FRAME_APEX` — down (36, 0), up (36, 71), left (71, 36), right (0, 36) — in the same way
+(`lampFrameOrigin(player, camera, apexes)`). A creature's frame has its top-left corner at (round(x) − 8 − camera.x, round(y) − 16 −
 camera.y); its frame is 2 while `light` is above 0, else ⌊tick / 15⌋ mod 2 (feature 0008).
 
 The shadow walls (feature 0014) lie on the floor like the cone, under every figure. A wall whose
@@ -963,6 +982,13 @@
 generator and its tests go; the frame size and the apex pixels stay, because the renderer places
 the frame by them.
 
+The same file draws the wider cone's sheet (feature 0029): `public/sprites/lamp-wide.png`,
+288x72, four 72x72 frames in the same order, each the checkerboard cut to the cone of spread
+3/4 from the frame's apex pixel (`WIDE_FRAME_APEX`), drawn from `inCone` with `WIDE_SPREAD`.
+The cone is 48 px long, so 24 px of each frame along the facing are empty. A unit test fails
+when the committed file and the generator disagree, re-derives every pixel from `inCone` and
+counts 852 opaque pixels per frame.
+
 `tools/placeholder-snippet.ts` draws the snippet sheet (feature 0008) and returns its pixels as
 data: `public/sprites/snippet.png`, 48x16, three 16x16 frames in one row — the scrap, the scrap
 2 px higher, the scrap with white paper. Border and lines of text are `#68386c`, the paper
@@ -1124,7 +1150,9 @@
 The notice is the first text: `game/notice` derives from the state, in every frame, which notice
 it shows, if any. While the lamp is on and a standing shadow wall has `lit` true and `light` 0 —
 a wall in the light that holds (0014) — it is `notice.shadow-too-dense`; otherwise, for two
-seconds from the step that solved a case, `notice.case-solved` (0024); otherwise, for two
+seconds from the step that solved a case, `notice.case-solved` (0024); otherwise, for the two
+seconds after those (`UPGRADE_NOTICE_STEPS`, 120), the line of the upgrade the case earned, if
+the player has it — `notice.upgrade-wide-cone` (0029, `NOTICE_UPGRADE`); otherwise, for two
 seconds from the last find of a trace, `notice.trace-found` (0022); otherwise, for two seconds
 (`REST_NOTICE_STEPS`, 120) from a press at a rest, the line of its result — `notice.rest`,
 `notice.rest-full` or `notice.rest-shadow` (0027, `NOTICE_REST`); otherwise, while the lamp is
```

- [x] **Step 5: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -19,12 +19,12 @@
 
 | Invariant | Test |
 |---|---|
-| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the help open (0021) |
+| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the wider cone earned, by hand and by solving the case of Marketing (0029); the initial state and one with the help open (0021) |
 | INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/`, and on the type `Language` there — the game does not know the language (0019) |
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
 | INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
 | INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
-| INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet with its five frames (0023, 0025) —, the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
+| INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet with its five frames (0023, 0025) —, the wider cone's sheet with every other PNG (0029), the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
 | INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); `game/rest` refuses a rest that is not one cell, with its message, and a test holds the floor's eight rests to its coffee machines, none without a rest (0027); a test holds the floor's five traces of Marketing to the spec's table — each in the area of Marketing, on a desk with a screen or on the printer, and in the light from every reached place on the cell above — and the 123 objects of the floor before them to a recorded SHA-256 digest, so that no object of an earlier feature changes (0028); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
 
 A change to the state's shape is held against a recording: 600 steps on the floor with walking,
@@ -34,7 +34,8 @@
 opened, turned to the cases and closed, whose digest was taken with the code before the help was
 added. The digests are never changed; a test that fails on one found a world that steps
 differently. A feature that only adds content leaves both as they are: with the second case
-(0028) a state in which no trace of Marketing is found steps as before.
+(0028) a state in which no trace of Marketing is found steps as before. So does a state
+without an upgrade (0029): the cone's spread and the lamp's strength are then what they were.
 
 ## 3. Test first
 
```

- [x] **Step 6: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -52,7 +52,9 @@
 department once its case is solved (feature 0027). M6, the second act, has begun: Marketing
 has five traces of its own, on four screens and on the printer, and the colleague in the red
 shirt is the source of the second case; the two cases can be solved in either order (feature
-0028). Every merge to `main` is deployed to Cloud Run (feature 0030).
+0028). Solving the case of Marketing earns the first upgrade of the lamp: the cone is one and
+a half times as wide, and the shadow walls of HR and Accounting give way to it (feature 0029).
+Every merge to `main` is deployed to Cloud Run (feature 0030).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
 ## Run it
@@ -65,7 +67,7 @@
 npm run check        # typecheck, lint, build and the headless tests
 npm run test:e2e     # the smoke test against the dev server
 npm run gen-tiles    # regenerate the placeholder tiles under public/tiles/
-npm run gen-sprites  # regenerate the placeholder figure, the lamp, snippet, overview, movers', shadow-wall, font and officer sheets under public/sprites/
+npm run gen-sprites  # regenerate the placeholder figure, the lamp and its wider cone, snippet, overview, movers', shadow-wall, font and officer sheets under public/sprites/
 npm run gen-floor    # regenerate the floor map with its creatures and the wake point under public/maps/
 ```
 
```

- [x] **Step 7:** `npm run check`, then commit — `Move the wider cone into the spec`.

---

### Task 9: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 18 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 9 in this file and commit —
  `Tick the full check of 0029`.

---

### Task 10: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow
  keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk — and that the game
  opens with the call (0026): the call is read and the lamp fetched from the data protection
  officer next door before step 1 of the plan. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–16 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 9, and start again at step 1.
- [ ] **Step 4:** after step 16 ask the four feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–16`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0029`. A feel note that wants something
  else — another width, a person who hands the upgrade over, other words — becomes a new
  draft, not a change on this branch.

---

### Task 11: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 9. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M6 section, say that 0028 and
  0029 are implemented. Commit — `Mark 0029 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0029: the wider cone`, with the walk's result and feel notes in its description.
  CI must be green. The author merges.
