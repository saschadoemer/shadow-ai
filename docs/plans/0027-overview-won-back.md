# 0027 — Implementation plan: overview won back

**Spec:** [`docs/features/0027-overview-won-back.md`](../features/0027-overview-won-back.md)
(approved 2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §2, §6 and §8,
`docs/spec/gameplay.md` §4 and §8 and `docs/spec/testing.md` §5. **Written:** 2026-11-18 on
the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0026 is merged into `main` (`fcb55b7` or later). The branch
`feature/0027-overview-won-back` exists, cut from that `main`, and holds this plan. Work on
it; merge the latest `main` into it before Task 1. The specs of 0028 and 0029 are on `main`;
they are approved, have no plan yet, and are **not** built here.

**Goal:** a press of `E` at a coffee machine in reach fills overview where the machine's
room is not under shadow, and a line at the bottom answers every press for two seconds.

**Approach:** six code tasks, each green on its own. The words (T1). The rests as a fourth
kind of rectangle: reading them, which one is in reach, whether one is under shadow (T2) —
after it the game knows the name `rest:` and refuses a faulty one. The floor's eight (T3) —
the map may hold them only once the game knows the kind. The coffee: `GameState.rested` and
the press in `update` (T4) — after it the hearts fill, without a word. The notice (T5). The
smoke spec (T6). Then the documents (T7), the full check with the container (T8), the walk
(T9) and the pull request (T10).

**How this plan was checked:** the code and the tests of Tasks 1 to 6 were run once as a
prototype on 2026-11-18, on the source of `main` at `fcb55b7`, and then replayed task by
task, each task's tests before its code: they failed as the steps say, and after each of the
six tasks typecheck and Biome were clean and the unit tests green — 1263, 1289, 1297, 1321,
1329 and 1329 tests (1262 before). `npm run gen-floor` gave the prototype's `floor.tmj` byte
for byte. The diffs of this file, applied in order to a clean tree, gave the prototype's
files. `npm run check` with the build passed on the whole prototype, and the smoke spec
passed twice against a dev server of it: 17 passed, 3 skipped. The prototype was thrown away;
nothing of it is on the branch. If a step does not behave as written, the cause is a
difference to that state — stop and look; do not bend a test. The game was **not** played in
a browser — that is the walk — and the container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `GameState.rested` is plain data: `null` or `{ at, result }`. Which rest is in reach,
  whether it is under shadow and the notice are **derived** on every call; none of it is
  stored.
- INV-2: `src/game/rest.ts` imports nothing from `src/render/` and uses no DOM name. It
  imports from `rects.ts`, `region.ts`, `player.ts` and the types of `state.ts`; nothing in
  `src/game/` but `update.ts` imports from it.
- INV-4: the three strings live in `src/text/de.ts` and `src/text/en.ts`; `notice.ts` holds
  keys.
- INV-7: no coordinate of a rest is in `src/`. The floor's eight are `RESTS` in
  `tools/floor-layout.ts`; `public/maps/floor.tmj` is written by `npm run gen-floor` and
  never edited by hand. No tile changes.
- The order of `update` stays: the dark, the help, the journal, a dialogue, the opening of
  the journal, the opening of a dialogue, the ordinary step. A rest is taken **inside** the
  ordinary step, before anything else of it, so a speaker in reach, the journal and the help
  come first without any new rule.
- "The input does not hold `lamp`" is meant as `update` counts it since 0026: a player
  without the lamp holds none. `takeRest` gets the input `update` acts on.
- `rested.at` is the `tick` of the state the step gives, `tick` + 1, as the find of a trace
  and the solving of a case are stamped. So the notice shows in 120 frames, from that state
  on.
- **The order of the notices.** The spec names four: a wall that holds, a solved case, a
  found trace, a rest. Feature 0026 put the line that names the lamp's key last. The plan
  keeps both: the rest comes after the trace and **before** the lamp's line. The lamp's line
  has no time and would hide the answer to a coffee for good; the spec says a press always
  has an answer.
- `isCell` moves from `trace.ts` to `rects.ts`, because the rests need the same test;
  `trace.ts` imports it. Nothing else of `trace.ts` changes, and its tests pass unchanged.
- Two tests of earlier features count the objects of the floor and must change their
  numbers in Task 3: 115 objects become 123, `nextobjectid` 116 becomes 124, and the areas
  are no longer the last objects of the file. Every object of 0023 and before keeps its id.
- The two recorded digests (`RECORDED` in `tests/unit/journal.test.ts` and in
  `tests/unit/help.test.ts`) pass as they are — that is criterion 13; never record them
  again.
- The help of 0021 is not changed: `E` stays listed as the key to talk.
- In the scene tests two sheets or tilesets that must be told apart need different objects.
  A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: the eight cells (104, 8), (27, 19), (52, 19), (35, 26),
  (42, 26), (104, 26), (12, 78) and (52, 78), ids 116 to 123, `nextobjectid` 124;
  `REST_DISTANCE` 32 from the feet to the centre of the cell; `REST_NOTICE_STEPS` 120; the
  results `restored`, `full`, `shadow`; the message
  `rest rest:coffee (568, 418, 16, 16) is not one cell`.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | three keys: `notice.rest`, `notice.rest-full`, `notice.rest-shadow` |
| `src/game/rects.ts` | `REST_PREFIX`; `isCell` |
| `src/game/trace.ts` | imports `isCell` |
| `src/game/rest.ts` | new: `Rest`, `REST_DISTANCE`, `restsOf`, `restCentre`, `restInReach`, `restUnderShadow`, `takeRest` |
| `src/game/state.ts` | `REST_RESULTS`, `RestResult`, `Rested`; `GameState.rested` |
| `src/game/update.ts` | refuses a faulty rest; `rested` starts `null`; the press in the ordinary step |
| `src/game/overview.ts` | the wake keeps `rested` |
| `src/game/notice.ts` | `NOTICE_REST`, `REST_NOTICE_STEPS` |
| `tools/floor-layout.ts` | `RESTS`; eight rectangles after the areas |
| `public/maps/floor.tmj` | regenerated |
| `tests/fixtures/maps/rests.tmj` | new fixture |
| `tests/unit/rest.test.ts` | new |
| `tests/unit/text.test.ts`, `floor.test.ts`, `state.test.ts`, `notice.test.ts`, `overview.test.ts`, `draw-scene.test.ts`, `draw-help.test.ts`, `draw-journal.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 7 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `notice.rest`, `notice.rest-full`, `notice.rest-shadow`, in both
  languages.

- [x] **Step 1: Write the failing test:**

```diff
diff --git a/tests/unit/text.test.ts b/tests/unit/text.test.ts
index 9268cee..0486d5d 100644
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -303,6 +303,25 @@ describe('the language table (INV-4, 0016)', () => {
     }
   });
 
+  it('holds the words of a coffee in both languages (0027)', () => {
+    const both = (id: Parameters<typeof textKey>[0]): string[] => [
+      textOf(textKey(id), 'de'),
+      textOf(textKey(id), 'en'),
+    ];
+    expect(both('notice.rest')).toStrictEqual([
+      'Kaffee. Der Überblick ist wieder da.',
+      'Coffee. Your overview is back.',
+    ]);
+    expect(both('notice.rest-full')).toStrictEqual([
+      'Kaffee. Den Überblick hast du schon.',
+      'Coffee. You have your overview already.',
+    ]);
+    expect(both('notice.rest-shadow')).toStrictEqual([
+      'Dieser Kaffee schmeckt nach nichts.',
+      'This coffee tastes of nothing.',
+    ]);
+  });
+
   it('holds the words of the call, the first meeting and the lamp in both languages (0026)', () => {
     const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
       textOf(textKey(id), language).split('\n');
```

- [x] **Step 2: Run it** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 1 of 22
  tests.

- [x] **Step 3: The words,** in both tables:

```diff
diff --git a/src/text/de.ts b/src/text/de.ts
index e27a315..fe358eb 100644
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -70,6 +70,9 @@ export const de = {
     'Datenschutzbeauftragten, brennt Licht.',
   ].join('\n'),
   'notice.lamp': 'Die Lampe: Leertaste halten.',
+  'notice.rest': 'Kaffee. Der Überblick ist wieder da.',
+  'notice.rest-full': 'Kaffee. Den Überblick hast du schon.',
+  'notice.rest-shadow': 'Dieser Kaffee schmeckt nach nichts.',
   'talk.reception-everyday': [
     'Morgen! Heute haben schon drei Leute gefragt,',
     'ob wir endlich ein WLAN für Gäste haben.',
```

```diff
diff --git a/src/text/en.ts b/src/text/en.ts
index 8c3d485..d074707 100644
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -66,6 +66,9 @@ export const en: Readonly<Record<keyof typeof de, string>> = {
     'data protection officer has her light on.',
   ].join('\n'),
   'notice.lamp': 'The lamp: hold Space.',
+  'notice.rest': 'Coffee. Your overview is back.',
+  'notice.rest-full': 'Coffee. You have your overview already.',
+  'notice.rest-shadow': 'This coffee tastes of nothing.',
   'talk.reception-everyday': [
     'Morning! Three people have asked already',
     'whether we finally have a network for guests.',
```

- [x] **Step 4: Run** `npx vitest run tests/unit/text.test.ts tests/unit/draw-scene.test.ts` —
  green; the scene test that holds every notice to the bar's 49 characters covers the three —
  then `npm run check`: 1263 unit tests.

- [x] **Step 5: Commit** — `Add the words of a coffee`.

---

### Task 2: The rests of a map

**Files:**
- Create: `src/game/rest.ts`, `tests/unit/rest.test.ts`
- Modify: `src/game/rects.ts`, `src/game/trace.ts`, `src/game/update.ts`

**Interfaces:**
- Produces:
  - `REST_PREFIX = 'rest:'`, `isCell(box: Box): boolean` in `game/rects`
  - `Rest` `{ what, box }`, `REST_DISTANCE = 32`
  - `restsOf(rects: readonly NamedRect[]): Rest[]`
  - `restCentre(rest: Rest): Point`
  - `restInReach(player: Point, rests: readonly Rest[], map: TileMap): Rest | null`
  - `restUnderShadow(rest: Rest, rects: readonly NamedRect[], solved: readonly SolvedCase[]): boolean`
  - `createInitialState` refuses a map with a rest that is not one cell.

- [x] **Step 1: Write the failing tests,** `tests/unit/rest.test.ts`, new:

```ts
import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import {
  REGION_PREFIX,
  REST_PREFIX,
  rectsOf,
  TRACE_PREFIX,
  WALL_PREFIX,
} from '../../src/game/rects';
import { areasOf } from '../../src/game/region';
import {
  REST_DISTANCE,
  type Rest,
  restCentre,
  restInReach,
  restsOf,
  restUnderShadow,
} from '../../src/game/rest';
import { wallsOf } from '../../src/game/shadow';
import { tracesOf } from '../../src/game/trace';
import { createInitialState } from '../../src/game/update';
import { grassMap } from './grass-map';

const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});
/** A coffee machine on cell (10, 5): its centre is (168, 88). */
const COFFEE = rect('rest:coffee', 160, 80);
/** A second one on cell (4, 5), centre (72, 88), in a room of HR: the cells (2, 3) to (6, 7). */
const SHADOWED = rect('rest:coffee', 64, 80);
const HR = rect('region:hr', 32, 48, 80, 80);
/** 20x12 cells of open floor with the player at (x, y). */
const mapAt = (
  x: number,
  y: number,
  rects: readonly NamedRect[] = [COFFEE],
  points: readonly NamedPoint[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);

describe('the rests among the rectangles of a map (0027)', () => {
  const rects = [
    rect('shadow:hr', 32, 48, 16, 4),
    rect('trace:sales', 160, 112),
    HR,
    COFFEE,
    SHADOWED,
  ];

  it('are known by the prefix of the name: the fourth kind of rectangle', () => {
    expect(REST_PREFIX).toBe('rest:');
    expect(rectsOf(rects, REST_PREFIX)).toStrictEqual([COFFEE, SHADOWED]);
  });

  it('are read in file order, each with what it is and its cell', () => {
    expect(restsOf(rects)).toStrictEqual([
      { what: 'coffee', box: { x: 160, y: 80, width: 16, height: 16 } },
      { what: 'coffee', box: { x: 64, y: 80, width: 16, height: 16 } },
    ]);
    expect(restsOf([rect('rest:sofa', 0, 0)])).toStrictEqual([
      { what: 'sofa', box: { x: 0, y: 0, width: 16, height: 16 } },
    ]);
  });

  it('are skipped by the walls, the traces and the areas, and skip them', () => {
    expect(wallsOf(rects)).toHaveLength(1);
    expect(tracesOf(rects)).toHaveLength(1);
    expect(areasOf(rects)).toHaveLength(1);
    expect(rectsOf(rects, WALL_PREFIX)).toHaveLength(1);
    expect(rectsOf(rects, TRACE_PREFIX)).toHaveLength(1);
    expect(rectsOf(rects, REGION_PREFIX)).toHaveLength(1);
  });

  it('are none on a map without them', () => {
    expect(restsOf([])).toStrictEqual([]);
    expect(restsOf([HR, rect('trace:sales', 160, 112)])).toStrictEqual([]);
  });

  it('do not excuse a rectangle of no known kind', () => {
    expect(() => restsOf([COFFEE, rect('door:hr', 0, 0)])).toThrow(
      'unknown rectangle object "door:hr"',
    );
  });

  it.each([
    [568, 418, 16, 16],
    [570, 416, 16, 16],
    [560, 416, 32, 16],
    [560, 416, 16, 4],
  ])('refuses the box (%d, %d, %d, %d): it is not one cell', (x, y, width, height) => {
    expect(() => restsOf([rect('rest:coffee', x, y, width, height)])).toThrow(
      `rest rest:coffee (${x}, ${y}, ${width}, ${height}) is not one cell`,
    );
  });

  it('refuses such a map before the game starts', () => {
    const map = mapAt(40, 40, [rect('rest:coffee', 568, 418)]);
    expect(() => createInitialState(map)).toThrow(
      'rest rest:coffee (568, 418, 16, 16) is not one cell',
    );
  });

  it('starts a map with rests like one without: the state has nothing of them', () => {
    expect(createInitialState(mapAt(40, 40))).toStrictEqual(createInitialState(mapAt(40, 40, [])));
  });
});

describe('a rest in reach (0027)', () => {
  const map = mapAt(40, 40);
  const [coffee] = restsOf(map.rects) as [Rest];
  const reached = (x: number, y: number, on: TileMap = map): boolean =>
    restInReach({ x, y }, restsOf(on.rects), on) !== null;
  /** The map with a wall strip on the upper edge of the rest's cell, as on the floor. */
  const walled: TileMap = {
    ...map,
    opaque: map.opaque.map((boxes, cell) => {
      const strip: Box = { x: 160, y: 80, width: 16, height: 4 };
      return cell === 5 * map.width + 10 ? [strip] : boxes;
    }),
  };

  it('is two tiles: from the feet to the centre of the cell', () => {
    expect(REST_DISTANCE).toBe(32);
    expect(restCentre(coffee)).toStrictEqual({ x: 168, y: 88 });
  });

  it.each([
    ['below', 168, 120, 168, 120.1],
    ['above', 168, 56, 168, 55.9],
    ['left', 136, 88, 135.9, 88],
    ['right', 200, 88, 200.1, 88],
  ])('is in reach at 32 px from %s and not at 32.1 px', (_side, x, y, farX, farY) => {
    expect(reached(x, y)).toBe(true);
    expect(reached(farX, farY)).toBe(false);
  });

  it('is in reach on a diagonal inside the circle and not outside it', () => {
    expect(reached(168 + 20, 88 + 24)).toBe(true);
    expect(reached(168 + 24, 88 + 24)).toBe(false);
  });

  it('is in reach standing on its cell', () => {
    expect(reached(168, 96)).toBe(true);
    expect(restInReach({ x: 168, y: 96 }, restsOf(map.rects), map)).toStrictEqual(coffee);
  });

  it('is not in reach at 8 px with an opaque box on the line: from behind the wall', () => {
    expect(reached(168, 80)).toBe(true);
    expect(reached(168, 80, walled)).toBe(false);
    // From the room's side the same wall is not on the line.
    expect(reached(168, 104, walled)).toBe(true);
  });

  it('is not stopped by a box that is solid and not opaque: a counter', () => {
    const counter: TileMap = {
      ...map,
      solids: map.solids.map((boxes, cell) =>
        cell === 5 * map.width + 10 ? [{ x: 160, y: 80, width: 16, height: 16 }] : boxes,
      ),
    };
    expect(reached(168, 104, counter)).toBe(true);
  });

  it('is none on a map without rests', () => {
    const bare = mapAt(40, 40, []);
    expect(restInReach({ x: 168, y: 96 }, restsOf(bare.rects), bare)).toBeNull();
  });

  it('is the nearer of two in reach, and the first in the file of two equally near', () => {
    const left = rect('rest:coffee', 144, 80);
    const right = rect('rest:tea', 176, 80);
    const both = mapAt(40, 40, [left, right]);
    const at = (x: number, order: readonly NamedRect[] = [left, right]): string | undefined =>
      restInReach({ x, y: 104 }, restsOf(order), both)?.what;
    expect(at(160)).toBe('coffee');
    expect(at(176)).toBe('tea');
    // (168, 104) is as far from the centre (152, 88) as from (184, 88).
    expect(at(168)).toBe('coffee');
    expect(at(168, [right, left])).toBe('tea');
  });
});

describe('a rest under shadow (0027)', () => {
  const rects = [COFFEE, SHADOWED, HR];
  const [open, shadowed] = restsOf(rects) as [Rest, Rest];

  it('is one whose cell lies in an area of a region with shadow', () => {
    expect(restUnderShadow(open, rects, [])).toBe(false);
    expect(restUnderShadow(shadowed, rects, [])).toBe(true);
  });

  it('is not under shadow in a region without shadow, or on a map without areas', () => {
    const reception = [SHADOWED, rect('region:reception', 32, 48, 80, 80)];
    expect(restUnderShadow(shadowed, reception, [])).toBe(false);
    expect(restUnderShadow(shadowed, [SHADOWED], [])).toBe(false);
  });

  it('is not under shadow once the region is cleared, from the step that solved its case', () => {
    expect(restUnderShadow(shadowed, rects, [{ region: 'hr', at: 500 }])).toBe(false);
    expect(restUnderShadow(shadowed, rects, [{ region: 'sales', at: 500 }])).toBe(true);
  });
});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/rest.test.ts`. Expected: FAIL — the
  file does not load: `src/game/rest` does not exist.

- [x] **Step 3: The fourth kind,** in `rects.ts`, with the test for one cell:

```diff
diff --git a/src/game/rects.ts b/src/game/rects.ts
index 8a98db5..13734e2 100644
--- a/src/game/rects.ts
+++ b/src/game/rects.ts
@@ -1,9 +1,11 @@
-import type { NamedRect } from '../engine/tiled';
+import type { Box } from '../engine/collision';
+import { type NamedRect, TILE_SIZE } from '../engine/tiled';
 
 /**
  * The kinds of rectangle a map may hold (architecture.md §6): what a rectangle is, is the
  * game's business, and its name says it. A shadow wall is `shadow:<region>` (0014), a trace
- * `trace:<region>` (0022), an area of a region `region:<id>` (0023). Pure.
+ * `trace:<region>` (0022), an area of a region `region:<id>` (0023), a rest `rest:<what>`
+ * (0027). Pure.
  */
 
 /** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
@@ -12,8 +14,20 @@ export const WALL_PREFIX = 'shadow:';
 export const TRACE_PREFIX = 'trace:';
 /** A rectangle whose name starts with this is an area of a region; the rest is the region (0023). */
 export const REGION_PREFIX = 'region:';
+/** A rectangle whose name starts with this is a rest; the rest of the name is what it is (0027). */
+export const REST_PREFIX = 'rest:';
 
-const PREFIXES: readonly string[] = [WALL_PREFIX, TRACE_PREFIX, REGION_PREFIX];
+const PREFIXES: readonly string[] = [WALL_PREFIX, TRACE_PREFIX, REGION_PREFIX, REST_PREFIX];
+
+/** Exactly one cell: the corner on the grid, a tile wide and a tile high. */
+export function isCell(box: Box): boolean {
+  return (
+    box.x % TILE_SIZE === 0 &&
+    box.y % TILE_SIZE === 0 &&
+    box.width === TILE_SIZE &&
+    box.height === TILE_SIZE
+  );
+}
 
 /**
  * The rectangles of one kind, in the order of the map. Rejects a rectangle of no known kind,
```

  `trace.ts` takes the test from there:

```diff
diff --git a/src/game/trace.ts b/src/game/trace.ts
index ca6b870..6c706db 100644
--- a/src/game/trace.ts
+++ b/src/game/trace.ts
@@ -1,8 +1,8 @@
 import { type Box, sightBlocked } from '../engine/collision';
-import { type NamedRect, TILE_SIZE, type TileMap } from '../engine/tiled';
+import type { NamedRect, TileMap } from '../engine/tiled';
 import { lampCone } from './lamp';
 import { BOX_HEIGHT } from './player';
-import { rectsOf, TRACE_PREFIX } from './rects';
+import { isCell, rectsOf, TRACE_PREFIX } from './rects';
 import { meetsCone } from './shadow';
 import type { PlayerState, TraceState } from './state';
 import { densityOf, REGIONS, type Region } from './world';
@@ -24,15 +24,6 @@ export interface Trace {
 /** Tune: one second of unbroken light finds a trace, as it captures a creature and lifts a wall. */
 export const FIND_STEPS = 60;
 
-function isCell(box: Box): boolean {
-  return (
-    box.x % TILE_SIZE === 0 &&
-    box.y % TILE_SIZE === 0 &&
-    box.width === TILE_SIZE &&
-    box.height === TILE_SIZE
-  );
-}
-
 /**
  * The traces of a map, in the order of its rectangles. Rejects a region the world data does
  * not know and a box that is not one cell.
```

- [x] **Step 4: The rests,** `src/game/rest.ts`, new:

```ts
import { type Box, sightBlocked } from '../engine/collision';
import type { NamedRect, Point, TileMap } from '../engine/tiled';
import { BOX_HEIGHT } from './player';
import { isCell, REST_PREFIX, rectsOf } from './rects';
import { areasOf, shadowedAreas, veilOf } from './region';
import type { SolvedCase } from './state';

/**
 * The rests (gameplay.md §4, feature 0027): where overview is won back without falling into
 * the dark. A rest is a rectangle of the map named `rest:<what>`, exactly one cell, on the cell
 * of the thing it is — a coffee machine. Pure data and pure functions; the rests are read from
 * the map's rectangles on every call and kept nowhere.
 */

export interface Rest {
  /** What the rest is: `coffee`. */
  readonly what: string;
  /** Map pixels: one cell. */
  readonly box: Box;
}

/** Tune: two tiles from the player's feet to the centre of the rest's cell. */
export const REST_DISTANCE = 32;

/** The rests of a map, in the order of its rectangles. Rejects a box that is not one cell. */
export function restsOf(rects: readonly NamedRect[]): Rest[] {
  return rectsOf(rects, REST_PREFIX).map((rect) => {
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (!isCell(box)) {
      throw new Error(
        `rest ${rect.name} (${box.x}, ${box.y}, ${box.width}, ${box.height}) is not one cell`,
      );
    }
    return { what: rect.name.slice(REST_PREFIX.length), box };
  });
}

/** The centre of a rest's cell. */
export function restCentre(rest: Rest): Point {
  return { x: rest.box.x + rest.box.width / 2, y: rest.box.y + rest.box.height / 2 };
}

/**
 * The rest a press takes: the nearest whose cell centre is at most REST_DISTANCE from the
 * player's feet and in sight — no opaque box of the map as loaded on the line from the centre
 * of the player's box to the centre of the cell, the lamp's test — the first in the file of two
 * equally near; null when none is. A machine behind a wall is not in reach, however near.
 */
export function restInReach(player: Point, rests: readonly Rest[], map: TileMap): Rest | null {
  let nearest: Rest | null = null;
  let reach = REST_DISTANCE;
  for (const rest of rests) {
    const centre = restCentre(rest);
    const distance = Math.hypot(centre.x - player.x, centre.y - player.y);
    if (
      distance <= reach &&
      (nearest === null || distance < reach) &&
      !sightBlocked({ x: player.x, y: player.y - BOX_HEIGHT / 2 }, centre, {
        width: map.width,
        height: map.height,
        solids: map.opaque,
      })
    ) {
      nearest = rest;
      reach = distance;
    }
  }
  return nearest;
}

/** Whether a rest's cell is under shadow: in an area of a region with shadow that is not cleared. */
export function restUnderShadow(
  rest: Rest,
  rects: readonly NamedRect[],
  solved: readonly SolvedCase[],
): boolean {
  const areas = shadowedAreas(areasOf(rects), solved);
  return veilOf(areas, rest.box.x / rest.box.width, rest.box.y / rest.box.height) > 0;
}
```

- [x] **Step 5: A faulty rest stops the game,** in `update.ts`:

```diff
diff --git a/src/game/update.ts b/src/game/update.ts
index 873470f..3a60b38 100644
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -9,6 +9,7 @@ import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
 import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
 import { type GameInput, NO_INPUT, stepPlayer } from './player';
 import { areasOf } from './region';
+import { restsOf } from './rest';
 import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
 import {
   type Dialogue,
@@ -43,6 +44,8 @@ export function createInitialState(map: TileMap): GameState {
   const walls = wallsOf(map.rects);
   // The areas of the regions are only drawn (0023); a map with a faulty one still does not start.
   areasOf(map.rects);
+  // Nor does a map with a rest that is not one cell (0027).
+  restsOf(map.rects);
   const figures = figuresOf(map.points);
   const player: PlayerState = {
     x: map.spawn.x,
```

- [x] **Step 6: Run** `npx vitest run tests/unit/rest.test.ts tests/unit/trace.test.ts
  tests/unit/region.test.ts` — green, the tests of 0022 and 0023 unchanged — then
  `npm run check`: 1289 unit tests; the architecture test now covers `src/game/rest.ts`.

- [x] **Step 7: Commit** — `Read the rests of a map and say which one is in reach`. Body: a
  rest is a rectangle like a trace; it is reached from inside its room and not through the
  wall behind it.

---

### Task 3: The coffee machines of the floor

**Files:**
- Modify: `tools/floor-layout.ts`, `public/maps/floor.tmj` (generated)
- Test: `tests/unit/floor.test.ts`

**Interfaces:**
- Consumes: `restsOf`, `restInReach`, `restUnderShadow` (Task 2).
- Produces: `RESTS` in `tools/floor-layout.ts`; eight rectangles `rest:coffee` in the floor
  with the ids 116 to 123.

- [x] **Step 1: Write the failing tests.** Two tests of 0015 and 0023 get their new numbers,
  and one block is added at the end of the file:

```diff
diff --git a/tests/unit/floor.test.ts b/tests/unit/floor.test.ts
index dafea41..83f2af6 100644
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -11,6 +11,7 @@ import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { areasOf, inArea, shadowedAreas, veilOf } from '../../src/game/region';
+import { restInReach, restsOf, restUnderShadow } from '../../src/game/rest';
 import { standingWalls, wallsOf, withWalls } from '../../src/game/shadow';
 import { type GameState, NO_RECOIL } from '../../src/game/state';
 import { speakerInReach, speakersOf, TALK_DISTANCE } from '../../src/game/talk';
@@ -29,6 +30,7 @@ import {
   HORIZONTAL_WALLS,
   POSTS,
   REGION_AREAS,
+  RESTS,
   ROOMS,
   ROUTES,
   SHADOW_WALLS,
@@ -495,9 +497,9 @@ describe('the routes of the floor (0015)', () => {
     ]);
     const json = floorJson();
     expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
-      Array.from({ length: 115 }, (_, i) => i + 1),
+      Array.from({ length: 123 }, (_, i) => i + 1),
     );
-    expect(json.nextobjectid).toBe(116);
+    expect(json.nextobjectid).toBe(124);
   });
 
   it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
@@ -1353,15 +1355,13 @@ describe('the areas of the regions on the floor (0023)', () => {
     );
   });
 
-  it('are the last ten objects of the file, rectangles with the ids 106 to 115', () => {
+  it('are ten rectangles with the ids 106 to 115, after the traces and before the rests of 0027', () => {
     const objects = floorJson().layers[3].objects;
-    expect(objects).toHaveLength(115);
-    expect(objects.slice(105).map((object) => [object.id, object.name])).toStrictEqual(
+    expect(objects.slice(105, 115).map((object) => [object.id, object.name])).toStrictEqual(
       TABLE.map(([region], i) => [106 + i, `region:${region}`]),
     );
-    expect(objects.slice(105).some((object) => 'point' in object)).toBe(false);
-    expect(floorJson().nextobjectid).toBe(116);
-    expect(floor.rects).toHaveLength(23);
+    expect(objects.slice(105, 115).some((object) => 'point' in object)).toBe(false);
+    expect(areasOf(floor.rects)).toHaveLength(10);
   });
 
   it('leave the walls and the traces as they were', () => {
@@ -1510,3 +1510,101 @@ describe('the cleared region on the floor (0025)', () => {
     expect([veil(5, 5), veil(30, 10), veil(60, 10)]).toStrictEqual([2, 2, 3]);
   });
 });
+
+describe('the rests of the floor (0027)', () => {
+  /** Cell, room and the veil of the cell at the start: the spec's table. */
+  const TABLE: readonly (readonly [number, number, string, number])[] = [
+    [104, 8, 'meeting room north', 1],
+    [27, 19, 'accounting', 2],
+    [52, 19, 'development', 3],
+    [35, 26, 'break room', 0],
+    [42, 26, 'break room', 0],
+    [104, 26, 'sales', 1],
+    [12, 78, 'marketing', 1],
+    [52, 78, 'support', 1],
+  ];
+  const rests = restsOf(floor.rects);
+  const areas = areasOf(floor.rects);
+  const reached = (x: number, y: number) => restInReach({ x, y }, rests, floor);
+
+  it('are the eight of the table, in the layout and in the file', () => {
+    expect(RESTS).toStrictEqual(TABLE.map(([x, y]) => ({ what: 'coffee', cell: { x, y } })));
+    expect(rests).toStrictEqual(
+      TABLE.map(([x, y]) => ({
+        what: 'coffee',
+        box: { x: 16 * x, y: 16 * y, width: 16, height: 16 },
+      })),
+    );
+  });
+
+  it('are the last eight objects of the file, rectangles with the ids 116 to 123', () => {
+    const objects = floorJson().layers[3].objects;
+    expect(objects).toHaveLength(123);
+    expect(objects.slice(115).map((object) => [object.id, object.name])).toStrictEqual(
+      TABLE.map((_row, i) => [116 + i, 'rest:coffee']),
+    );
+    expect(objects.slice(115).some((object) => 'point' in object)).toBe(false);
+    expect(floorJson().nextobjectid).toBe(124);
+    expect(floor.rects).toHaveLength(31);
+  });
+
+  it('leave the objects of 0023 and before as they were', () => {
+    expect(wallsOf(floor.rects)).toHaveLength(8);
+    expect(tracesOf(floor.rects)).toHaveLength(5);
+    expect(areas).toHaveLength(10);
+    expect(floor.points).toHaveLength(91);
+  });
+
+  it('lie each on a counter with a coffee machine, and the floor has no such tile without one', () => {
+    const machines: string[] = [];
+    floor.detail.forEach((id, at) => {
+      if (id === COUNTER_COFFEE) {
+        machines.push(`${at % 108},${Math.floor(at / 108)}`);
+      }
+    });
+    expect(machines.sort()).toStrictEqual(TABLE.map(([x, y]) => `${x},${y}`).sort());
+  });
+
+  it('lie each in its room', () => {
+    for (const [x, y, name] of TABLE) {
+      const room = ROOMS.find((candidate) => candidate.name === name);
+      expect(room, name).toBeDefined();
+      const { c0, c1, r0, r1 } = room?.cells ?? { c0: 0, c1: 0, r0: 0, r1: 0 };
+      expect(x >= c0 && x <= c1 && y >= r0 && y <= r1, `(${x}, ${y}) in ${name}`).toBe(true);
+    }
+  });
+
+  it('have the veil of the table: only the two of the break room are not under shadow at the start', () => {
+    expect(TABLE.map(([x, y]) => veilOf(areas, x, y))).toStrictEqual(
+      TABLE.map(([, , , veil]) => veil),
+    );
+    expect(rests.map((rest) => restUnderShadow(rest, floor.rects, []))).toStrictEqual([
+      true,
+      true,
+      true,
+      false,
+      false,
+      true,
+      true,
+      true,
+    ]);
+  });
+
+  it('are in reach from inside their room and not from the corridor behind the wall', () => {
+    // The machine of Sales, cell (104, 26): from below it, and from the north corridor.
+    expect(reached(1672, 440)).toStrictEqual(rests[5]);
+    expect(reached(1672, 416)).toBeNull();
+    // The left machine of the break room, cell (35, 26).
+    expect(reached(568, 440)).toStrictEqual(rests[3]);
+    expect(reached(568, 416)).toBeNull();
+  });
+
+  it('give the machine of Sales its use once Sales is solved', () => {
+    const sales = rests[5];
+    expect(sales).toBeDefined();
+    if (sales !== undefined) {
+      expect(restUnderShadow(sales, floor.rects, [])).toBe(true);
+      expect(restUnderShadow(sales, floor.rects, [{ region: 'sales', at: 1005 }])).toBe(false);
+    }
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/floor.test.ts`. Expected: FAIL, 6 of
  85 tests.

- [x] **Step 3: The layout:**

```diff
diff --git a/tools/floor-layout.ts b/tools/floor-layout.ts
index 4b1a07a..15c688d 100644
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -263,6 +263,21 @@ export function areaBox(rect: CellRect): Box {
   };
 }
 
+/**
+ * The rests (0027): per rest what it is and its cell. Every coffee machine of the floor is one,
+ * in the order of the rows and, in a row, from left to right: the order in the file.
+ */
+export const RESTS: readonly { readonly what: string; readonly cell: Point }[] = [
+  { what: 'coffee', cell: { x: 104, y: 8 } },
+  { what: 'coffee', cell: { x: 27, y: 19 } },
+  { what: 'coffee', cell: { x: 52, y: 19 } },
+  { what: 'coffee', cell: { x: 35, y: 26 } },
+  { what: 'coffee', cell: { x: 42, y: 26 } },
+  { what: 'coffee', cell: { x: 104, y: 26 } },
+  { what: 'coffee', cell: { x: 12, y: 78 } },
+  { what: 'coffee', cell: { x: 52, y: 78 } },
+];
+
 /** The box of a trace in map pixels: its cell. */
 export function traceBox(cell: Point): Box {
   return { x: cell.x * TILE_SIZE, y: cell.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
@@ -1177,6 +1192,7 @@ export function floorJson(): MapJson {
   const firstFigure = firstWall + SHADOW_WALLS.length;
   const firstTrace = firstFigure + FIGURES.length;
   const firstArea = firstTrace + TRACES.length;
+  const firstRest = firstArea + REGION_AREAS.length;
   return {
     compressionlevel: -1,
     height: FLOOR_HEIGHT,
@@ -1208,6 +1224,9 @@ export function floorJson(): MapJson {
           ...REGION_AREAS.map((area, i) =>
             rectObject(firstArea + i, `region:${area.region}`, areaBox(area.cells)),
           ),
+          ...RESTS.map((rest, i) =>
+            rectObject(firstRest + i, `rest:${rest.what}`, traceBox(rest.cell)),
+          ),
         ],
         opacity: 1,
         type: 'objectgroup',
@@ -1217,7 +1236,7 @@ export function floorJson(): MapJson {
       },
     ],
     nextlayerid: 5,
-    nextobjectid: firstArea + REGION_AREAS.length,
+    nextobjectid: firstRest + RESTS.length,
     orientation: 'orthogonal',
     renderorder: 'right-down',
     tiledversion: '1.11.2',
```

- [x] **Step 4: Write the floor** — `npm run gen-floor`. Expected: `git status` shows
  `public/maps/floor.tmj` changed and nothing else under `public/`; its diff adds eight
  objects after the last area and changes `nextobjectid` from 116 to 124, and nothing else.
  SHA-256 of the file:
  `e3407f270c769beb2097165559d5037452a793c65e615c04635801ef065e70e5`.

- [x] **Step 5: Run** `npx vitest run tests/unit/floor.test.ts` — green — then
  `npm run check`: 1297 unit tests.

- [x] **Step 6: Commit** — `Make every coffee machine of the floor a rest`.

---

### Task 4: A coffee

**Files:**
- Create: `tests/fixtures/maps/rests.tmj`
- Modify: `src/game/state.ts`, `src/game/rest.ts`, `src/game/update.ts`,
  `src/game/overview.ts`
- Test: `tests/unit/rest.test.ts`, `tests/unit/state.test.ts`, `overview.test.ts`,
  `draw-scene.test.ts`, `draw-help.test.ts`, `draw-journal.test.ts`

**Interfaces:**
- Consumes: `restsOf`, `restInReach`, `restUnderShadow` (Task 2).
- Produces:
  - `REST_RESULTS = ['restored', 'full', 'shadow']`, `RestResult`, `Rested` `{ at, result }`,
    `GameState.rested: Rested | null`
  - `takeRest(state: GameState, input: GameInput, map: TileMap): Pick<GameState, 'overview' | 'rested'> | null`
  - `update` takes a rest in the ordinary step; the wake keeps `rested`.

- [x] **Step 1: Make the fixture.** `tests/fixtures/maps/rests.tmj` is `figures.tmj` with other
  objects: the spawn at (168, 112), two rectangles `rest:coffee` on the cells (10, 5) and
  (4, 5), and a rectangle `region:hr` over the cells (2, 3) to (6, 7). Run this once from the
  repository root, and do not keep the script:

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';

const map = JSON.parse(readFileSync('tests/fixtures/maps/figures.tmj', 'utf8'));
const object = (id, name, x, y, width, height) => ({
  height,
  id,
  name,
  ...(width === 0 ? { point: true } : {}),
  rotation: 0,
  type: '',
  visible: true,
  width,
  x,
  y,
});
const objects = map.layers.find((layer) => layer.type === 'objectgroup');
objects.objects = [
  object(1, 'spawn', 168, 112, 0, 0),
  object(2, 'rest:coffee', 160, 80, 16, 16),
  object(3, 'rest:coffee', 64, 80, 16, 16),
  object(4, 'region:hr', 32, 48, 80, 80),
];
map.nextobjectid = 5;
const text = JSON.stringify(map, null, 2).replace(
  /"data": \[[^\]]*\]/,
  (data) => data.replace(/\s+/g, ' ').replace('[ ', '[').replace(' ]', ']'),
);
writeFileSync('tests/fixtures/maps/rests.tmj', `${text}\n`);
EOF
```

  Expected: `git status` shows the new file; its SHA-256 is
  `7a12d03729bda626146e86a6d4ab8b56c18a7c46b9b96dee2017cce6fad6be33`.

- [x] **Step 2: Write the failing tests.** `rest.test.ts` gains the press, step by step:

```diff
--- a/tests/unit/rest.test.ts
+++ b/tests/unit/rest.test.ts
@@ -1,6 +1,7 @@
 import { describe, expect, it } from 'vitest';
 import type { Box } from '../../src/engine/collision';
 import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
+import { type GameInput, NO_INPUT } from '../../src/game/player';
 import {
   REGION_PREFIX,
   REST_PREFIX,
@@ -16,12 +17,16 @@
   restInReach,
   restsOf,
   restUnderShadow,
+  takeRest,
 } from '../../src/game/rest';
 import { wallsOf } from '../../src/game/shadow';
+import { type GameState, REST_RESULTS } from '../../src/game/state';
 import { tracesOf } from '../../src/game/trace';
-import { createInitialState } from '../../src/game/update';
+import { createInitialState, newGame, update } from '../../src/game/update';
 import { grassMap } from './grass-map';
 
+const NONE = NO_INPUT;
+const TALK: GameInput = { ...NONE, talk: true };
 const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
   name,
   x,
@@ -41,6 +46,13 @@
   rects: readonly NamedRect[] = [COFFEE],
   points: readonly NamedPoint[] = [],
 ): TileMap => grassMap(20, 12, { x, y }, points, rects);
+const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
+  inputs.reduce((state, input) => update(state, input, map), start);
+/** The state with `current` of five hearts. */
+const tired = (map: TileMap, current = 2): GameState => ({
+  ...createInitialState(map),
+  overview: { current, max: 5 },
+});
 
 describe('the rests among the rectangles of a map (0027)', () => {
   const rects = [
@@ -106,6 +118,7 @@
 
   it('starts a map with rests like one without: the state has nothing of them', () => {
     expect(createInitialState(mapAt(40, 40))).toStrictEqual(createInitialState(mapAt(40, 40, [])));
+    expect(createInitialState(mapAt(40, 40)).rested).toBeNull();
   });
 });
 
@@ -204,3 +217,157 @@
     expect(restUnderShadow(shadowed, rects, [{ region: 'sales', at: 500 }])).toBe(true);
   });
 });
+
+describe('a coffee (0027)', () => {
+  const rects = [COFFEE, SHADOWED, HR];
+  /** The player 24 px below the open machine. */
+  const OPEN = mapAt(168, 112, rects);
+  /** The player 24 px below the machine in HR. */
+  const DARK = mapAt(72, 112, rects);
+
+  it('has three results', () => {
+    expect(REST_RESULTS).toStrictEqual(['restored', 'full', 'shadow']);
+  });
+
+  it('fills overview at a rest that is not under shadow, and remembers the step', () => {
+    const start = tired(OPEN);
+    const drunk = update(start, TALK, OPEN);
+    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
+    expect(drunk.rested).toStrictEqual({ at: 1, result: 'restored' });
+    expect(drunk.tick).toBe(1);
+  });
+
+  it('fills it from any number of hearts, and to a maximum a solved case has raised', () => {
+    for (const current of [0, 1, 4]) {
+      expect(update(tired(OPEN, current), TALK, OPEN).overview).toStrictEqual({
+        current: 5,
+        max: 5,
+      });
+    }
+    const grown: GameState = { ...tired(OPEN), overview: { current: 3, max: 6 } };
+    expect(update(grown, TALK, OPEN).overview).toStrictEqual({ current: 6, max: 6 });
+  });
+
+  it('changes no heart with overview full, and says so', () => {
+    const drunk = update(createInitialState(OPEN), TALK, OPEN);
+    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
+    expect(drunk.rested).toStrictEqual({ at: 1, result: 'full' });
+  });
+
+  it('changes no heart at a rest under shadow, whatever the hearts', () => {
+    for (const current of [2, 5]) {
+      const drunk = update(tired(DARK, current), TALK, DARK);
+      expect(drunk.overview).toStrictEqual({ current, max: 5 });
+      expect(drunk.rested).toStrictEqual({ at: 1, result: 'shadow' });
+    }
+  });
+
+  it('restores at that rest once its region is cleared', () => {
+    const cleared: GameState = { ...tired(DARK), tick: 700, solved: [{ region: 'hr', at: 650 }] };
+    const drunk = update(cleared, TALK, DARK);
+    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
+    expect(drunk.rested).toStrictEqual({ at: 701, result: 'restored' });
+  });
+
+  it('is an ordinary step otherwise: only overview, rested, tick and held change', () => {
+    const start = tired(OPEN);
+    expect(update(start, TALK, OPEN)).toStrictEqual({
+      ...start,
+      tick: 1,
+      held: TALK,
+      overview: { current: 5, max: 5 },
+      rested: { at: 1, result: 'restored' },
+    });
+  });
+
+  it('lets the world go on in the same step: the figure walks', () => {
+    const walking = update(tired(OPEN), { ...TALK, right: true }, OPEN);
+    expect(walking.player.x).toBeGreaterThan(168);
+    expect(walking.rested?.result).toBe('restored');
+  });
+
+  it('does not save from a creature that reaches the figure in the same step', () => {
+    // A snippet at 6-8-10 from the spawn hits in step 1 (0009).
+    const map = mapAt(168, 112, rects, [{ name: 'snippet', x: 162, y: 104 }]);
+    const hit = update(tired(map), TALK, map);
+    expect(hit.rested).toStrictEqual({ at: 1, result: 'restored' });
+    expect(hit.overview).toStrictEqual({ current: 4, max: 5 });
+  });
+
+  it('is taken once by a key that is held: the next press takes the next', () => {
+    const held = run(OPEN, tired(OPEN), TALK, TALK, TALK);
+    expect(held.rested).toStrictEqual({ at: 1, result: 'restored' });
+    const again = run(OPEN, held, NONE, TALK);
+    expect(again.rested).toStrictEqual({ at: 5, result: 'full' });
+  });
+
+  it('is not taken with the lamp held or during a push', () => {
+    const start = tired(OPEN);
+    expect(update(start, { ...TALK, lamp: true }, OPEN).rested).toBeNull();
+    const pushed: GameState = {
+      ...start,
+      player: { ...start.player, recoil: { dx: 3, dy: 0, steps: 8 } },
+    };
+    const during = update(pushed, TALK, OPEN);
+    expect(during.rested).toBeNull();
+    expect(during.overview).toStrictEqual({ current: 2, max: 5 });
+  });
+
+  it('is taken with Space held by a player who has no lamp: there is none to hold (0026)', () => {
+    const called = run(OPEN, newGame(OPEN), TALK, NONE, TALK, NONE, TALK, NONE);
+    expect(called.lamp.owned).toBe(false);
+    const drunk = update(called, { ...TALK, lamp: true }, OPEN);
+    expect(drunk.rested).toStrictEqual({ at: called.tick + 1, result: 'full' });
+  });
+
+  it('is not taken out of reach: the step is an ordinary one', () => {
+    const far = mapAt(168, 121, rects);
+    expect(update(tired(far), TALK, far).rested).toBeNull();
+  });
+
+  it('is not taken in the dark, with the help open, with the journal open or in a dialogue', () => {
+    const start = tired(OPEN);
+    const frozen: readonly GameState[] = [
+      { ...start, dark: 10 },
+      { ...start, help: true },
+      { ...start, journal: { tab: 'creatures' } },
+      { ...start, dialogue: { speaker: 'story', index: 0, page: 0 } },
+    ];
+    for (const state of frozen) {
+      const stepped = update(state, TALK, OPEN);
+      expect(stepped.rested).toBeNull();
+      expect(stepped.overview.current).toBeLessThanOrEqual(2);
+    }
+  });
+
+  it('is not taken by the press that opens the journal', () => {
+    const opened = update(tired(OPEN), { ...TALK, journal: true }, OPEN);
+    expect(opened.journal).toStrictEqual({ tab: 'creatures' });
+    expect(opened.rested).toBeNull();
+  });
+
+  it('gives way to a speaker in reach: the press opens the dialogue and takes no rest', () => {
+    const map = mapAt(168, 112, rects, [{ name: 'figure:officer', x: 192, y: 112 }]);
+    const opened = update(tired(map), TALK, map);
+    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
+    expect(opened.rested).toBeNull();
+    expect(opened.overview).toStrictEqual({ current: 2, max: 5 });
+  });
+
+  it('is what takeRest says, and takeRest changes nothing itself', () => {
+    const start = tired(OPEN);
+    const before = JSON.stringify(start);
+    expect(takeRest(start, TALK, OPEN)).toStrictEqual({
+      overview: { current: 5, max: 5 },
+      rested: { at: 1, result: 'restored' },
+    });
+    expect(takeRest(start, NONE, OPEN)).toBeNull();
+    expect(takeRest({ ...start, held: TALK }, TALK, OPEN)).toBeNull();
+    expect(JSON.stringify(start)).toBe(before);
+  });
+
+  it('survives a JSON round trip after a coffee (INV-1)', () => {
+    const drunk = update(tired(OPEN), TALK, OPEN);
+    expect(JSON.parse(JSON.stringify(drunk))).toStrictEqual(drunk);
+  });
+});
```

  `state.test.ts` — the fixture, and every state written out in full gains `rested: null`:

```diff
diff --git a/tests/unit/state.test.ts b/tests/unit/state.test.ts
index d51d970..37d37a3 100644
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -45,6 +45,8 @@ const TRACES_MAP = loadMap(
 );
 /** The colleague of Sales and two traces of Sales on open floor, the spawn 40 px from it (0024). */
 const CASE_MAP = loadMap('tests/fixtures/maps/case.tmj', 'tests/fixtures/maps/fixture-tiles.tsj');
+/** Two coffee machines on open floor, one in a room of HR, the spawn below the other (0027). */
+const RESTS_MAP = loadMap('tests/fixtures/maps/rests.tmj', 'tests/fixtures/maps/fixture-tiles.tsj');
 /** The floor the game loads. */
 const FLOOR_MAP = loadMap('public/maps/floor.tmj', 'public/tiles/placeholder.tsj');
 
@@ -78,6 +80,7 @@ describe('GameState (INV-1)', () => {
     expect(createInitialState(MAP)).toStrictEqual({
       tick: 0,
       started: 0,
+      rested: null,
       player: {
         x: 136,
         y: 120,
@@ -147,6 +150,7 @@ describe('update', () => {
       {
         tick: 41,
         started: 0,
+        rested: null,
         player,
         camera: { x: 0, y: 12 },
         lamp: { on: false, strength: 1, owned: true, used: true },
@@ -176,6 +180,7 @@ describe('update', () => {
     const state: GameState = {
       tick: 7,
       started: 0,
+      rested: null,
       player,
       camera: { x: 0, y: 12 },
       lamp: { on: false, strength: 1, owned: true, used: true },
@@ -197,6 +202,7 @@ describe('update', () => {
     expect(state).toStrictEqual({
       tick: 7,
       started: 0,
+      rested: null,
       player,
       camera: { x: 0, y: 12 },
       lamp: { on: false, strength: 1, owned: true, used: true },
@@ -948,3 +954,53 @@ describe('the cleared region in the state (0025)', () => {
     expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
   });
 });
+
+describe('the rests in the state (0027)', () => {
+  const TALK: GameInput = { ...NONE, talk: true };
+  const start = createInitialState(RESTS_MAP);
+  const tired: GameState = { ...start, overview: { current: 2, max: 5 } };
+
+  it('starts with no rest taken, on the floor and on the fixture', () => {
+    expect(createInitialState(FLOOR_MAP).rested).toBeNull();
+    expect(start.rested).toBeNull();
+    expect(RESTS_MAP.rects.map((rect) => rect.name)).toStrictEqual([
+      'rest:coffee',
+      'rest:coffee',
+      'region:hr',
+    ]);
+  });
+
+  it('takes a coffee on a parsed map: a press below the machine fills overview', () => {
+    const drunk = update(tired, TALK, RESTS_MAP);
+    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
+    expect(drunk.rested).toStrictEqual({ at: 1, result: 'restored' });
+  });
+
+  it('gets nothing from the machine under shadow on the same map', () => {
+    const there: GameState = { ...tired, player: { ...tired.player, x: 72, y: 112 } };
+    const drunk = update(there, TALK, RESTS_MAP);
+    expect(drunk.overview).toStrictEqual({ current: 2, max: 5 });
+    expect(drunk.rested).toStrictEqual({ at: 1, result: 'shadow' });
+  });
+
+  it('survives a JSON round trip at the start and after a coffee (INV-1)', () => {
+    const drunk = update(tired, TALK, RESTS_MAP);
+    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
+    expect(JSON.parse(JSON.stringify(drunk))).toStrictEqual(drunk);
+  });
+
+  it('keeps the rest through the wake (0009)', () => {
+    const drunk = update(tired, TALK, RESTS_MAP);
+    const woken = update({ ...drunk, dark: 44 }, NONE, RESTS_MAP);
+    expect(woken.dark).toBe(45);
+    expect(woken.rested).toStrictEqual({ at: 1, result: 'restored' });
+  });
+
+  it('steps a game without a press at a rest as before: rested stays null for 600 steps', () => {
+    let state = start;
+    for (let i = 0; i < 600; i += 1) {
+      state = update(state, { ...NONE, right: i < 200, lamp: i >= 300 && i < 400 }, RESTS_MAP);
+      expect(state.rested).toBeNull();
+    }
+  });
+});
```

  The other tests that write a state out in full:

```diff
diff --git a/tests/unit/overview.test.ts b/tests/unit/overview.test.ts
index 17936f4..fae69b3 100644
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -163,6 +163,7 @@ describe('stepDark', () => {
   const FALLEN: GameState = {
     tick: 500,
     started: 0,
+    rested: null,
     player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
     camera: { x: 140, y: 106 },
     lamp: { on: true, strength: 1, owned: true, used: true },
@@ -193,6 +194,7 @@ describe('stepDark', () => {
       ...FALLEN,
       tick: 543,
       started: 0,
+      rested: null,
       lamp: { on: false, strength: 1, owned: true, used: true },
       dark: 44,
     });
@@ -204,6 +206,7 @@ describe('stepDark', () => {
     expect(woken).toStrictEqual({
       tick: 544,
       started: 0,
+      rested: null,
       player,
       camera: followPlayer(player, MAP),
       lamp: { on: false, strength: 1, owned: true, used: true },
```

```diff
diff --git a/tests/unit/draw-scene.test.ts b/tests/unit/draw-scene.test.ts
index af26aee..b04ffbe 100644
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -150,6 +150,7 @@ const state = (
 ): GameState => ({
   tick: QUIET_TICK,
   started: 0,
+  rested: null,
   player: player(fields),
   camera,
   lamp: { on: lampOn, strength: 1, owned: true, used: true },
```

```diff
diff --git a/tests/unit/draw-help.test.ts b/tests/unit/draw-help.test.ts
index a89a7b7..62f98c1 100644
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -87,6 +87,7 @@ const BAR = 'fillRect 8,158 304x18 #181425';
 const playing = (fields: Partial<GameState> = {}): GameState => ({
   tick: 700,
   started: 0,
+  rested: null,
   player: {
     x: 184,
     y: 96,
```

```diff
diff --git a/tests/unit/draw-journal.test.ts b/tests/unit/draw-journal.test.ts
index 4e8c298..029a4ef 100644
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -87,6 +87,7 @@ const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
 const reading = (tab: JournalTab, snippets = 0): GameState => ({
   tick: 100,
   started: 0,
+  rested: null,
   player: {
     x: 160,
     y: 96,
```

- [x] **Step 3: Run** `npx vitest run` and `npm run typecheck`. Expected: FAIL — 25 unit tests
  and 30 type errors in the tests.

- [x] **Step 4: The state:**

```diff
diff --git a/src/game/state.ts b/src/game/state.ts
index bf6dfd0..12a29d6 100644
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -115,6 +115,16 @@ export interface SolvedCase {
   readonly at: number;
 }
 
+/** What a press at a rest gave (0027): overview filled, nothing to fill, or nothing under shadow. */
+export const REST_RESULTS = ['restored', 'full', 'shadow'] as const;
+export type RestResult = (typeof REST_RESULTS)[number];
+
+/** The last rest the player took (0027): the tick of that step, and what it gave. */
+export interface Rested {
+  readonly at: number;
+  readonly result: RestResult;
+}
+
 /** A standing figure of the cast (0017). Its place stays in the map, its pages in game/cast. */
 export interface FigureState {
   /** The index of the figure in `figuresOf(map.points)`. */
@@ -187,6 +197,8 @@ export interface GameState {
   readonly traces: readonly TraceState[];
   /** The solved cases, in the order they were solved (0024). */
   readonly solved: readonly SolvedCase[];
+  /** The last rest taken, or null (0027); the notice of a rest is derived from it. */
+  readonly rested: Rested | null;
   /** The standing figures of the map, in file order (0017). */
   readonly figures: readonly FigureState[];
   /** The dialogue that is open, or null. While it is open nothing else is stepped (0017). */
```

- [x] **Step 5: The press,** in `rest.ts`:

```diff
--- a/src/game/rest.ts
+++ b/src/game/rest.ts
@@ -1,15 +1,16 @@
 import { type Box, sightBlocked } from '../engine/collision';
 import type { NamedRect, Point, TileMap } from '../engine/tiled';
-import { BOX_HEIGHT } from './player';
+import { BOX_HEIGHT, type GameInput, pressed } from './player';
 import { isCell, REST_PREFIX, rectsOf } from './rects';
 import { areasOf, shadowedAreas, veilOf } from './region';
-import type { SolvedCase } from './state';
+import type { GameState, RestResult, SolvedCase } from './state';
 
 /**
  * The rests (gameplay.md §4, feature 0027): where overview is won back without falling into
  * the dark. A rest is a rectangle of the map named `rest:<what>`, exactly one cell, on the cell
- * of the thing it is — a coffee machine. Pure data and pure functions; the rests are read from
- * the map's rectangles on every call and kept nowhere.
+ * of the thing it is — a coffee machine. A press of `talk` at a rest in reach takes it: it
+ * fills overview, unless its cell is under shadow. Pure data and pure functions; the rests are
+ * read from the map's rectangles on every call and kept nowhere.
  */
 
 export interface Rest {
@@ -77,3 +78,35 @@
   const areas = shadowedAreas(areasOf(rects), solved);
   return veilOf(areas, rest.box.x / rest.box.width, rest.box.y / rest.box.height) > 0;
 }
+
+/**
+ * What a press at a rest in reach changes, or null when this step takes none: `talk` is not
+ * pressed, the lamp is held, the player is being pushed, or no rest is in reach. Under shadow
+ * the rest gives nothing; with overview full there is nothing to give; otherwise overview is
+ * filled. `rested` remembers the tick of the step and the result. The caller steps the world
+ * from the result: taking a rest is part of an ordinary step.
+ */
+export function takeRest(
+  state: GameState,
+  input: GameInput,
+  map: TileMap,
+): Pick<GameState, 'overview' | 'rested'> | null {
+  if (!pressed(state.held, input, 'talk') || input.lamp || state.player.recoil.steps > 0) {
+    return null;
+  }
+  const rest = restInReach(state.player, restsOf(map.rects), map);
+  if (rest === null) {
+    return null;
+  }
+  const { current, max } = state.overview;
+  let result: RestResult = 'restored';
+  if (restUnderShadow(rest, map.rects, state.solved)) {
+    result = 'shadow';
+  } else if (current === max) {
+    result = 'full';
+  }
+  return {
+    overview: result === 'restored' ? { current: max, max } : state.overview,
+    rested: { at: state.tick + 1, result },
+  };
+}
```

- [x] **Step 6: The step,** in `update.ts`, and the wake in `overview.ts`:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -9,7 +9,7 @@
 import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
 import { type GameInput, NO_INPUT, stepPlayer } from './player';
 import { areasOf } from './region';
-import { restsOf } from './rest';
+import { restsOf, takeRest } from './rest';
 import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
 import {
   type Dialogue,
@@ -67,6 +67,7 @@
     shadowWalls: standingWalls(walls),
     traces: hiddenTraces(tracesOf(map.rects)),
     solved: [],
+    rested: null,
     figures: figuresFrom(figures),
     dialogue: null,
     journal: null,
@@ -183,6 +184,10 @@
   }
   // Without the lamp the input's `lamp` counts as not held: for the light and for the figure.
   const acting: GameInput = { ...input, lamp: input.lamp && state.lamp.owned };
+  // A press at a coffee machine in reach takes the rest (0027); the step goes on from there.
+  const rest = takeRest(state, acting, content);
+  const rested = rest === null ? state.rested : rest.rested;
+  const before = rest === null ? state.overview : rest.overview;
   const on = acting.lamp && state.player.recoil.steps === 0;
   const lamp: LampState = { ...state.lamp, on, used: state.lamp.used || on };
   const walls = wallsOf(content.rects);
@@ -199,8 +204,8 @@
   const hitter = hittingCreature(creatures, stepped);
   const { player, overview, dark } =
     hitter === null
-      ? { player: stepped, overview: state.overview, dark: 0 }
-      : applyHit(stepped, state.overview, hitter);
+      ? { player: stepped, overview: before, dark: 0 }
+      : applyHit(stepped, before, hitter);
   return {
     tick: state.tick + 1,
     started: state.started,
@@ -221,6 +226,7 @@
       state.tick + 1,
     ),
     solved: state.solved,
+    rested,
     figures: state.figures,
     dialogue: null,
     journal: null,
```

```diff
diff --git a/src/game/overview.ts b/src/game/overview.ts
index ba8c851..461416c 100644
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -145,6 +145,7 @@ function woken(state: GameState, map: TileMap): GameState {
     shadowWalls: restedWalls(state.shadowWalls),
     traces: restedTraces(state.traces),
     solved: state.solved,
+    rested: state.rested,
     figures: state.figures,
     dialogue: null,
     journal: null,
```

- [x] **Step 7: Run** `npx vitest run tests/unit/rest.test.ts tests/unit/state.test.ts` —
  green — and `npx vitest run tests/unit/journal.test.ts tests/unit/help.test.ts`: both
  recordings of 600 steps pass with their hashes unchanged (criterion 13). Then
  `npm run check`: 1321 unit tests.

- [x] **Step 8: Commit** — `Fill overview with a coffee where no shadow lies`. Body: the press
  is part of an ordinary step, so the world goes on and a hit in the same step still counts.

---

### Task 5: The notice

**Files:**
- Modify: `src/game/notice.ts`
- Test: `tests/unit/notice.test.ts`

**Interfaces:**
- Consumes: `GameState.rested` (Task 4); the text ids of Task 1.
- Produces: `NOTICE_REST: Readonly<Record<RestResult, TextKey>>`, `REST_NOTICE_STEPS = 120`;
  `noticeOf` with the rest after the trace and before the lamp's line.

- [x] **Step 1: Write the failing tests** — the imports, and one block at the end:

```diff
diff --git a/tests/unit/notice.test.ts b/tests/unit/notice.test.ts
index d82fad2..c7e1a7d 100644
--- a/tests/unit/notice.test.ts
+++ b/tests/unit/notice.test.ts
@@ -2,12 +2,14 @@ import { describe, expect, it } from 'vitest';
 import {
   NOTICE_CASE_SOLVED,
   NOTICE_LAMP,
+  NOTICE_REST,
   NOTICE_SHADOW_TOO_DENSE,
   NOTICE_TRACE_FOUND,
   noticeOf,
+  REST_NOTICE_STEPS,
 } from '../../src/game/notice';
 import type { GameInput } from '../../src/game/player';
-import type { GameState, ShadowWallState } from '../../src/game/state';
+import { type GameState, REST_RESULTS, type ShadowWallState } from '../../src/game/state';
 import { createInitialState, newGame, update } from '../../src/game/update';
 import { textKey } from '../../src/text/text';
 import { grassMap } from './grass-map';
@@ -173,3 +175,82 @@ describe("the line that names the lamp's key (0026)", () => {
     );
   });
 });
+
+describe('the notice of a rest (0027)', () => {
+  /** A game at step 1000, a rest taken `elapsed` steps ago with `result`. */
+  const rested = (result: (typeof REST_RESULTS)[number], elapsed: number): GameState => ({
+    ...BASE,
+    tick: 1000,
+    rested: { at: 1000 - elapsed, result },
+  });
+
+  it('has a line for each result, and two seconds', () => {
+    expect(NOTICE_REST).toStrictEqual({
+      restored: textKey('notice.rest'),
+      full: textKey('notice.rest-full'),
+      shadow: textKey('notice.rest-shadow'),
+    });
+    expect(Object.keys(NOTICE_REST)).toStrictEqual([...REST_RESULTS]);
+    expect(REST_NOTICE_STEPS).toBe(120);
+  });
+
+  it.each(REST_RESULTS)(
+    'shows the line of `%s` for 120 steps from the press, and none after',
+    (result) => {
+      expect(noticeOf(rested(result, 0))).toBe(NOTICE_REST[result]);
+      expect(noticeOf(rested(result, 119))).toBe(NOTICE_REST[result]);
+      expect(noticeOf(rested(result, 120))).toBeNull();
+      expect(noticeOf(rested(result, 5000))).toBeNull();
+    },
+  );
+
+  it('shows none while no rest was taken', () => {
+    expect(noticeOf({ ...BASE, tick: 1000, rested: null })).toBeNull();
+  });
+
+  it('comes after a wall that holds, a solved case and a found trace', () => {
+    const coffee = rested('restored', 10);
+    expect(
+      noticeOf({
+        ...coffee,
+        lamp: { on: true, strength: 1, owned: true, used: true },
+        shadowWalls: [HOLDS],
+      }),
+    ).toBe(NOTICE_SHADOW_TOO_DENSE);
+    expect(noticeOf({ ...coffee, solved: [{ region: 'sales', at: 950 }] })).toBe(
+      NOTICE_CASE_SOLVED,
+    );
+    expect(noticeOf({ ...coffee, traces: [{ trace: 0, light: 0, found: 950 }] })).toBe(
+      NOTICE_TRACE_FOUND,
+    );
+    // Once theirs are over, the coffee's is still due.
+    expect(noticeOf({ ...coffee, traces: [{ trace: 0, light: 0, found: 100 }] })).toBe(
+      NOTICE_REST.restored,
+    );
+  });
+
+  it("comes before the line that names the lamp's key, which is back when it is over", () => {
+    const waiting = { on: false, strength: 1, owned: true, used: false };
+    expect(noticeOf({ ...rested('full', 10), lamp: waiting })).toBe(NOTICE_REST.full);
+    expect(noticeOf({ ...rested('full', 120), lamp: waiting })).toBe(NOTICE_LAMP);
+  });
+
+  it('follows the game: a press at a coffee machine, and 120 steps later it is gone', () => {
+    const TALK: GameInput = { ...NONE, talk: true };
+    /** The player 24 px below a machine on cell (10, 5). */
+    const map = grassMap(
+      20,
+      12,
+      { x: 168, y: 112 },
+      [],
+      [{ name: 'rest:coffee', x: 160, y: 80, width: 16, height: 16 }],
+    );
+    let state = update(createInitialState(map), TALK, map);
+    expect(noticeOf(state)).toBe(NOTICE_REST.full);
+    for (let step = 0; step < 119; step += 1) {
+      state = update(state, NONE, map);
+      expect(noticeOf(state), `step ${step}`).toBe(NOTICE_REST.full);
+    }
+    expect(noticeOf(update(state, NONE, map))).toBeNull();
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/notice.test.ts`. Expected: FAIL, 7 of
  23 tests.

- [x] **Step 3: The notice:**

```diff
diff --git a/src/game/notice.ts b/src/game/notice.ts
index 753c567..f282aae 100644
--- a/src/game/notice.ts
+++ b/src/game/notice.ts
@@ -1,5 +1,5 @@
 import { type TextKey, textKey } from '../text/text';
-import type { GameState } from './state';
+import type { GameState, RestResult } from './state';
 
 /**
  * The notice (gameplay.md §2, feature 0016): one line the game itself says, shown at the
@@ -20,6 +20,15 @@ export const NOTICE_TRACE_FOUND: TextKey = textKey('notice.trace-found');
 /** Tune: two seconds from the find. */
 export const TRACE_NOTICE_STEPS = 120;
 
+/** A rest was taken (0027): what the coffee did, by its result. */
+export const NOTICE_REST: Readonly<Record<RestResult, TextKey>> = {
+  restored: textKey('notice.rest'),
+  full: textKey('notice.rest-full'),
+  shadow: textKey('notice.rest-shadow'),
+};
+/** Tune: two seconds from the press. */
+export const REST_NOTICE_STEPS = 120;
+
 /** The lamp's key (0026): shown from the step the lamp is handed over until it is held once. */
 export const NOTICE_LAMP: TextKey = textKey('notice.lamp');
 
@@ -28,8 +37,9 @@ export const NOTICE_LAMP: TextKey = textKey('notice.lamp');
  * is on and cannot lift: a wall that gives way counts from 1 in its first step; that notice
  * comes first. Then, for CASE_NOTICE_STEPS steps from the solving step, that a case is solved
  * (0024). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was found (0022).
- * Last, while the lamp is owned and was never on, the line that names its key (0026): it has no
- * time, and it does not come back.
+ * Then, for REST_NOTICE_STEPS steps from a press at a rest, what the rest gave (0027). Last,
+ * while the lamp is owned and was never on, the line that names its key (0026): it has no time,
+ * and it does not come back.
  */
 export function noticeOf(state: GameState): TextKey | null {
   const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
@@ -46,5 +56,8 @@ export function noticeOf(state: GameState): TextKey | null {
   if (found) {
     return NOTICE_TRACE_FOUND;
   }
+  if (state.rested !== null && state.tick - state.rested.at < REST_NOTICE_STEPS) {
+    return NOTICE_REST[state.rested.result];
+  }
   return state.lamp.owned && !state.lamp.used ? NOTICE_LAMP : null;
 }
```

- [x] **Step 4: Run** `npx vitest run tests/unit/notice.test.ts` — green, the tests of 0016,
  0022, 0024 and 0026 unchanged — then `npm run check`: 1329 unit tests.

- [x] **Step 5: Commit** — `Answer every coffee with a line`. Body: the line of a rest comes
  before the line that names the lamp's key, which has no time and would hide it.

---

### Task 6: The smoke spec

**Files:**
- Test: `tests/e2e/smoke.spec.ts`

- [x] **Step 1: Add the test:**

```diff
diff --git a/tests/e2e/smoke.spec.ts b/tests/e2e/smoke.spec.ts
index 376070e..a0a4315 100644
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -413,3 +413,13 @@ test('the game starts with no case solved and five hearts', async ({ page }) =>
     max: 5,
   });
 });
+
+test('the game starts with no rest taken', async ({ page }) => {
+  await start(page);
+  // One poll for the whole value: nothing is read from a page that might still be loading.
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.rested), {
+      message: 'window.shadowAi.state.rested is there and null: no coffee yet',
+    })
+    .toBeNull();
+});
```

- [x] **Step 2: Run** `npm run test:e2e` twice — 17 passed, 3 skipped, both times.

- [x] **Step 3: Commit** — `Check the start without a rest in the smoke spec`.

---

### Task 7: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/architecture.md`,
  `docs/spec/testing.md`, `README.md`

The diffs are against `main` at `fcb55b7`. If a line has moved, put the text where the diff
means it; do not change the words without a reason. `gameplay.md` §4 loses its **Open**
sentence: this feature closes it.

- [x] **Step 1: `gameplay.md`** §4 and §8:

```diff
diff --git a/docs/spec/gameplay.md b/docs/spec/gameplay.md
index 4f030b6..f98e9a5 100644
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -99,9 +99,18 @@ from the creature — a wall holds the push — and leaves it safe for a second
 all three numbers *tune*. The start value tunes as well. A frozen creature never hits: the lamp is the defence. At zero the screen
 closes like an eye and opens again a second and a half later: the figure stands in the data
 protection officer's office (feature 0010) with full overview, the creatures still in the world are back
-at their places, and what was captured stays captured. **Open:** how overview is won back
-without falling into the dark — a conversation, a place, a find — is decided when there are
-figures to talk to and rooms to enter (M4, M5).
+at their places, and what was captured stays captured.
+
+**As built** (feature 0027): overview is won back with a coffee. A press of E or Enter at a
+coffee machine — at most two tiles from its cell, and not through a wall — fills the hearts,
+all of them, as often as the player walks there: the walk is the price. A line at the bottom
+answers every press for two seconds: `Kaffee. Der Überblick ist wieder da.`, or
+`Kaffee. Den Überblick hast du schon.` when the hearts were full. Every coffee machine of the
+floor counts, but one in a room under shadow gives nothing — `Dieser Kaffee schmeckt nach
+nichts.` — until that room is cleared. At the start only the two of the break room work; every
+solved case brings a safe place nearer. The game goes on while the figure drinks: a creature
+that reaches it in the same moment still hits. A coffee never raises the maximum; only a solved
+case does.
 
 **As built** (feature 0024): the step that solves a case raises the maximum by one and fills
 overview to it, whatever it stood at — six full hearts after Sales.
@@ -235,6 +244,11 @@ There is no way to skip it before M8. In the first meeting the data protection o
 first page and then the page that hands the lamp over; afterwards she says her two pages of
 0017. A press of E opens a dialogue with Space held as long as the player has no lamp.
 
+**As built** (feature 0027): E and Enter also take a coffee at a coffee machine (§4). A
+colleague or a figure in reach comes first: then the press opens the dialogue. The press does
+nothing at a machine while the lamp is held or the figure is being pushed. The help still lists
+E as the key to talk.
+
 **As built** (feature 0021): a press of H opens the help, a box over the game with seven rows —
 a key and what it does — and a second press closes it. The game stands still while it is open,
 and everything goes on where it stood when it closes. The help opens over a dialogue and over
```

- [x] **Step 2: `world.md`** §1:

```diff
diff --git a/docs/spec/world.md b/docs/spec/world.md
index f7e9b5f..d578aa2 100644
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -127,6 +127,14 @@ are no longer under shadow, whatever its density in the table: the density stays
 region, and the solved case is what takes the shadow off it. Sales is the first cleared region;
 every other region with a density above 0 stays under shadow until its case is solved.
 
+**As built** (feature 0027): every coffee machine of the floor is a **rest** — a rectangle named
+`rest:coffee` in the `objects` layer, on the cell of the machine. There are eight: one in the
+meeting room north (104, 8), one in Accounting (27, 19), one in Development (52, 19), two in the
+break room (35, 26) and (42, 26), one in Sales (104, 26), one in Marketing (12, 78) and one in
+Support (52, 78). A rest fills overview where its cell is not under shadow (`gameplay.md` §4):
+at the start the two of the break room, after the case of Sales the one of Sales too. The
+water dispensers, the sofas and the table football are no rests.
+
 | Area | Cells | Density |
 |---|---|---|
 | `region:hr` | (1, 1)–(21, 19) | 2 |
```

- [x] **Step 3: `architecture.md`** §1, §2, §6 and §8:

```diff
diff --git a/docs/spec/architecture.md b/docs/spec/architecture.md
index 64a32ab..67377dc 100644
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -31,7 +31,8 @@ src/
                  game/cases.ts the cases, when one is ready, what its source says, the
                  step that solves it (0024) and what goes with the region's shadow (0025);
                  game/story.ts the scenes of the story — text with no figure — and the
-                 scene a game opens with (0026)
+                 scene a game opens with (0026); game/rest.ts the rests, which one is in
+                 reach and what a press at it does (0027)
   render/        the Renderer interface and its Canvas 2D implementation; scaling and letterbox;
                  the draw order of a frame (draw-scene); render/font.ts the glyph order and the
                  cell size of the font, render/draw-text.ts text by TextKey, line by line
@@ -187,7 +188,10 @@ With `dark` above 0 a step is `stepDark` and nothing else: `dark` and `tick` gro
 is off, the input is not read; in the step `dark` becomes 45 the figure stands on the wake point
 facing down, standing, not safe and not pushed, overview is full and every creature still in the
 array is at its home with `light` 0, `captured` unchanged, the camera on the figure; in the step
-it would become 90 it is 0. The wake point is the map's point named `wake`, the spawn when there
+it would become 90 it is 0. `rested` is `null`, or `{ at, result }` (feature 0027, `game/rest`):
+the last rest the player took — `at` the `tick` of the state that step gave, `result` one of
+`REST_RESULTS`, `restored`, `full` or `shadow`. It is `null` at the start, the wake keeps it,
+and the notice of a rest is derived from it (§8). The wake point is the map's point named `wake`, the spawn when there
 is none; two stop the game at the start (`createInitialState`).
 
 `movers` is an array of `{ kind, look, route, x, y, facing, frame, frameTimer, target, wait }`,
@@ -361,7 +365,15 @@ is the larger one, up or down otherwise, unchanged on the same spot), the player
 0, timer 0, the lamp is off, and `tick` grows by 1. A colleague that is spoken to gets `frame` 0,
 `frameTimer` 0 and the facing toward the player, and nothing else of it changes, so `game/mover`
 steps it on unchanged after the dialogue. Without such a press the
-step is the one described above. Every step, of every kind, sets `held` from its input, so a
+step is the one described above, with one addition (feature 0027, `takeRest`): when `talk` is
+pressed, `lamp` is not held — as `update` counts it —, the player is not pushed and a rest is in
+reach (§6), the player takes it before anything else of the step. The result is `shadow` when
+the rest's cell is under shadow — `veilOf` on the areas not cleared, above 0 —, else `full` when
+`overview.current` equals `overview.max`, else `restored`, and only then `overview.current`
+becomes `overview.max`. `rested` is set to `{ at: tick + 1, result }`, and the step goes on from
+there as an ordinary one: the hit of this step, if there is one, takes its point from the
+filled overview. A speaker in reach comes first, because the opening of a dialogue is looked at
+before; so do the journal and the help. Every step, of every kind, sets `held` from its input, so a
 key held down is pressed once. The wake keeps `figures` and `held` and has no dialogue and no
 journal, and its help is closed: the help does not open in the dark, and no dark begins while it
 is open. A state without speakers, in which `talk` is never held, steps exactly as before 0018;
@@ -763,13 +775,14 @@ stands; its position is the feet. It is no route point and makes no creature: `i
 point object "figure:officer"`). A map without such points has no figures; a figure of the cast
 without a point is simply not there.
 
-**Kinds of rectangle** (features 0022, 0023). A rectangle has a kind by the prefix of its name:
-`shadow:` a shadow wall, `trace:` a trace, `region:` an area of a region. `game/rects` is the one
-place that knows the prefixes;
+**Kinds of rectangle** (features 0022, 0023, 0027). A rectangle has a kind by the prefix of its
+name: `shadow:` a shadow wall, `trace:` a trace, `region:` an area of a region, `rest:` a rest.
+`game/rects` is the one place that knows the prefixes, and holds `isCell`, the test for a box
+that is exactly one cell;
 `rectsOf(rects, prefix)` gives the rectangles of one kind in file order and refuses a map with a
 rectangle of no known kind (`unknown rectangle object "door"`), whichever kind is asked for.
-`game/shadow`, `game/trace` and `game/region` read their rectangles through it and skip the
-other kinds; none imports another's rectangles.
+`game/shadow`, `game/trace`, `game/region` and `game/rest` read their rectangles through it and
+skip the other kinds; none imports another's rectangles.
 
 **Shadow walls** (feature 0014). A rectangle named `shadow:<region>` is a shadow wall: a strip
 4 px thick on the top or the left edge of whole cells, where a doorway's wall strip is missing. A
@@ -806,6 +819,19 @@ under shadow — asked of the areas that are not cleared, `shadowedAreas(areas,
 0025, §5): the areas of a region whose case is solved drop out of it. No coordinate of an area is in `src/` (INV-7); `tools/floor-layout.ts` builds the
 floor's ten, `REGION_AREAS`, from its rooms, each with its upper and its left wall (`areaBox`).
 
+**Rests** (feature 0027). A rectangle named `rest:<what>` is a rest: exactly one cell, on the
+cell of the thing it is. `game/rest` reads them with `restsOf(map.rects)` in file order as
+`{ what, box }` and refuses the map for a box that is not one cell (`rest rest:coffee (568, 418,
+16, 16) is not one cell`); `createInitialState` calls it once, and the state keeps nothing of the
+rests. A rest is **in reach** (`restInReach`) when the centre of its cell is at most
+`REST_DISTANCE`, 32 px, from the player's feet and no opaque box of the map as loaded lies on
+the line from the centre of the player's box, (x, y − 4), to that centre — the lamp's
+`sightBlocked`. So a machine in the wall's row of its room is reached from inside the room and
+not from the corridor behind the wall. Of two in reach the nearer counts, of two equally near
+the first in the file. `restUnderShadow` asks the rest's cell of the areas not cleared (§5).
+No coordinate of a rest is in `src/` (INV-7); `tools/floor-layout.ts` holds the floor's eight,
+`RESTS`, written after the areas with the ids 116 to 123.
+
 Flipped and rotated tiles, more than one tileset per map, embedded tilesets, encoded or
 compressed data and infinite maps stay rejected until a feature needs one and lifts its rule. A
 tileset tile with an `animation` is rejected too: the game has no animated tiles, and a still
@@ -1093,7 +1119,9 @@ The notice is the first text: `game/notice` derives from the state, in every fra
 it shows, if any. While the lamp is on and a standing shadow wall has `lit` true and `light` 0 —
 a wall in the light that holds (0014) — it is `notice.shadow-too-dense`; otherwise, for two
 seconds from the step that solved a case, `notice.case-solved` (0024); otherwise, for two
-seconds from the last find of a trace, `notice.trace-found` (0022); otherwise, while the lamp is
+seconds from the last find of a trace, `notice.trace-found` (0022); otherwise, for two seconds
+(`REST_NOTICE_STEPS`, 120) from a press at a rest, the line of its result — `notice.rest`,
+`notice.rest-full` or `notice.rest-shadow` (0027, `NOTICE_REST`); otherwise, while the lamp is
 owned and was never on, `notice.lamp`, the line that names its key (0026) — it has no time and
 does not come back; otherwise there is none.
 The state has no field for it (INV-1). A notice stays one line.
```

- [x] **Step 4: `testing.md`** §2 and §6:

```diff
diff --git a/docs/spec/testing.md b/docs/spec/testing.md
index 7b468e6..7c131d9 100644
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -19,13 +19,13 @@ All four run in CI on every pull request (`ops.md` §4). Red blocks the merge.
 
 | Invariant | Test |
 |---|---|
-| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state and one with the help open (0021) |
+| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the help open (0021) |
 | INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/`, and on the type `Language` there — the game does not know the language (0019) |
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
 | INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
 | INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
 | INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet with its five frames (0023, 0025) —, the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
-| INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
+| INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); `game/rest` refuses a rest that is not one cell, with its message, and a test holds the floor's eight rests to its coffee machines, none without a rest (0027); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
 
 A change to the state's shape is held against a recording: 600 steps on the floor with walking,
 a word with the colleague behind the counter and the lamp, whose SHA-256 digest was taken with
@@ -128,7 +128,9 @@ route `person:reception` of two points and a route `dog:reception`, and `traces.
 20x12 on the same tiles, with the spawn at (168, 128), a rectangle `trace:sales` on cell (10, 5)
 and a rectangle `shadow:marketing` between the two, and `case.tmj` of 0024, 20x12 on the same
 tiles, with the spawn at (104, 48), the route `person:sales` of two points with a pause of 600
-on the first, and two rectangles `trace:sales`), a tiny
+on the first, and two rectangles `trace:sales`, and `rests.tmj` of 0027, 20x12 on the same
+tiles, with the spawn at (168, 112), two rectangles `rest:coffee` on the cells (10, 5) and
+(4, 5) and a rectangle `region:hr` over the second), a tiny
 PNG with one off-palette pixel.
 Fixtures are hand-made and committed; they are never generated from the real content, so a
 change to the floor map cannot silently change what a test proves.
```

- [x] **Step 5: `README.md`:**

```diff
diff --git a/README.md b/README.md
index ddc3ca6..acda8e5 100644
--- a/README.md
+++ b/README.md
@@ -48,6 +48,8 @@ overview grows by one (feature 0024). In the same moment the room gets its colou
 veil thins out over two seconds, and its shadow wall and the snippets that were left in it are
 gone (feature 0025). The game opens with the call — three pages of story — and without the
 lamp: the data protection officer next door hands it over in the first talk (feature 0026).
+A coffee at a coffee machine wins overview back — in the break room from the start, in a
+department once its case is solved (feature 0027).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
 ## Run it
```

- [x] **Step 6:** `npm run check`, then commit — `Move the coffee into the spec`.

---

### Task 8: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 17 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 8 in this file and commit —
  `Tick the full check of 0027`.

---

### Task 9: The acceptance walk

- [x] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow
  keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk — and that the game
  opens with the call (0026): the call is read and the lamp fetched from the data protection
  officer next door before step 1 of the plan. Wait until the author is ready.
- [x] **Step 2:** guide the author through steps 1–12 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [x] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 8, and start again at step 1.
- [x] **Step 4:** after step 12 ask the five feel questions, one per message.
- [x] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–12`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0027`. A feel note that wants something
  else — one heart per coffee, a cup, other words — becomes a new draft, not a change on this
  branch.

---

### Task 10: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 8. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M5 section, say that 0027 is
  implemented too — with it M5 is complete, if 0022 to 0026 are implemented on that day.
  Commit — `Mark 0027 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0027: overview won back`, with the walk's result and feel notes in its
  description. CI must be green. The author merges.
