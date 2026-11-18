# 0025 — Implementation plan: the cleared region

**Spec:** [`docs/features/0025-the-cleared-region.md`](../features/0025-the-cleared-region.md)
(approved 2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §2, §5 and §6,
`docs/spec/visual.md` §4, `docs/spec/gameplay.md` §6 and `docs/spec/testing.md` §5.
**Written:** 2026-11-18 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0024 is merged into `main` (`702a0e6` or later). The branch
`feature/0025-the-cleared-region` exists, cut from that `main`, and holds this plan and the
**drafts** of 0027, 0028 and 0029 with their rows in `docs/plan.md` and
`docs/features/README.md`. Work on it; merge the latest `main` into it before Task 1. The
drafts are not approved and are **not** built here; do not change them. The spec of 0026 is
on `main`; it is approved, has no plan yet, and is not built here either.

**Goal:** the step that solves a case clears its region for good: the room is in colour from
the next frame, its violet veil thins out in three parts over two seconds and is gone, and
the region's shadow wall and the creatures at home in it leave the game.

**Approach:** four code tasks, each green on its own. Two more frames on the veil's sheet
(T1). The rules in `game/region`: when a region is cleared, which areas are still under
shadow, and which veil a cell shows (T2). The scene asks them (T3) — after it a solved
region is drawn in colour and its veil thins out. The solving step removes the region's
walls and creatures (T4). Then the documents (T5), the full check with the container (T6),
the walk (T7) and the pull request (T8).

**How this plan was checked:** the code and the tests of Tasks 1 to 4 were run once as a
prototype on 2026-11-18, on the source of `main` at `702a0e6`, and then replayed task by
task: after each of the four tasks typecheck and Biome were clean and the unit tests green —
1132, 1163, 1181 and 1202 tests (1129 before). Each task's tests were also run before its
code and failed as the steps say. The diffs of this file, applied to a clean tree and
followed by `npm run gen-sprites`, gave the prototype's files byte for byte. `npm run check`
with the build passed on the whole prototype, and the smoke spec passed unchanged against a dev server of it: 15 passed, 3
skipped. The prototype was thrown away; nothing of it is on the branch. If a step does not
behave as written, the cause is a difference to that state — stop and look; do not bend a
test. The clearing was **not** played in a browser — that is the walk — and the container
was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: this feature adds **no field** to `GameState`; `src/game/state.ts` is not touched.
  A region is cleared exactly when it is in `solved`. Whether a cell is under shadow, which
  veil it shows and how far a clearing has come are **derived** on every call from `solved`,
  `tick` and the map's areas. Do not add a test that counts the fields of the state: the
  next feature adds one.
- INV-2: `src/game/region.ts` imports the type `SolvedCase` from `state.ts` and nothing from
  `cases.ts` — `cases.ts` imports from `region.ts`, and the other way round would be a
  cycle. Nothing in `src/game/` imports from `src/render/` or uses a DOM name.
- INV-6: `public/sprites/shadow-veil.png` is written by `npm run gen-sprites` and never
  edited by hand. It stays in the list of shadow assets of `tests/unit/assets.test.ts`,
  which is not changed. `npm run gen-tiles` and `npm run gen-floor` change nothing.
- INV-7: no coordinate of the floor is in `src/`. No map change, no tile change.
- `src/render/draw-map.ts` and `tests/unit/draw-map.test.ts` are **not** changed. `Shadow`
  keeps its meaning — a cell whose `veilOf` is above 0 is drawn from the shadow tileset — and
  `drawVeil` keeps drawing the frame veil − 1. The scene hands the two a different function
  each: the tiles follow the areas that are not cleared, the veil follows `shownVeil`.
- A veil is a number: 0 none, 1 to 3 the densities (0023), 4 and 5 the two thin veils of a
  clearing — the frames 3 and 4 of the sheet.
- `solve` of 0024 keeps its signature and its tests. What goes with the shadow is a function
  of its own, `clearRegion`, called on the result of `solve` in `update`.
- The tests of 0023 and 0024 pass unchanged, with one exception: `veil-sheet.test.ts`, whose
  numbers this feature changes (Task 1). The digest of 0020 in `tests/unit/journal.test.ts`
  (`RECORDED`) must pass as it is — it is criterion 11; never record it again.
- The spec does not say what a cell shows that lies in two areas of which one is clearing.
  The plan settles it the way the rest of the game does: a standing shadow counts first; of
  two clearing areas, the first in the file. No two areas of the floor overlap, so nothing
  of it is seen in the game.
- The smoke spec is not changed, no fixture is added, and no text.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or
  `afterEach`: Biome reads it as a duplicate test hook.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: `CLEAR_STEPS` 120; with e = `tick` − `at`, the veil of
  the density for e 0 to 39, frame 3 for 40 to 79, frame 4 for 80 to 119, none from 120;
  the sheet 80x16 with 32, 64, 128, 16 and 8 opaque pixels, all `#68386c`; frame 3 where x
  and y are both multiples of 4, frame 4 where, besides, x + y is a multiple of 8; a home
  lies in an area inside its rectangle, the left and the upper edge included; on the floor
  the snippet at home at (1224, 622) stays.

## File structure

| File | Change |
|---|---|
| `tools/placeholder-veil.ts` | `VEIL_FRAMES` 5; `veilInk` for the frames 3 and 4 |
| `public/sprites/shadow-veil.png` | regenerated: 80x16 |
| `src/game/region.ts` | `inArea`, `CLEAR_STEPS`, `CLEAR_PART_STEPS`, `THIN_VEIL`, `THINNEST_VEIL`, `clearedAt`, `shadowedAreas`, `clearingVeil`, `shownVeil`; `veilOf` uses `inArea` |
| `src/render/draw-scene.ts` | the tiles by the areas not cleared, the veil by `shownVeil` |
| `src/game/cases.ts` | `clearRegion` |
| `src/game/update.ts` | the solving step calls `clearRegion` |
| `tests/unit/veil-sheet.test.ts`, `region.test.ts`, `draw-scene.test.ts`, `cases.test.ts`, `state.test.ts`, `floor.test.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 5 |

---

### Task 1: Two more frames on the veil's sheet

**Files:**
- Modify: `tools/placeholder-veil.ts`, `public/sprites/shadow-veil.png` (generated)
- Test: `tests/unit/veil-sheet.test.ts`

**Interfaces:**
- Produces: `VEIL_FRAMES` 5, `VEIL_SHEET_WIDTH` 80; `veilInk(3, i, j)` and
  `veilInk(4, i, j)`. The scene draws from these frames in Task 3; until then nothing uses
  them.

- [x] **Step 1: Change the test** to the sheet of criterion 6:

```diff
diff --git a/tests/unit/veil-sheet.test.ts b/tests/unit/veil-sheet.test.ts
index b6efc1e..9ae3472 100644
--- a/tests/unit/veil-sheet.test.ts
+++ b/tests/unit/veil-sheet.test.ts
@@ -35,33 +35,33 @@ const everyPixel = (visit: (i: number, j: number) => void): void => {
   }
 };
 
-describe('the placeholder veil generator (0023)', () => {
+describe('the placeholder veil generator (0023, 0025)', () => {
   it('is deterministic: two runs give byte-identical files', () => {
     expect(encodeVeilPng().equals(encodeVeilPng())).toBe(true);
   });
 
   it('matches the committed file', () => {
     const committed = PNG.sync.read(readFileSync(join(ROOT, 'public/sprites/shadow-veil.png')));
-    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
+    expect([committed.width, committed.height]).toStrictEqual([80, 16]);
     expect(Buffer.from(VEIL).equals(committed.data)).toBe(true);
   });
 
-  it('is 48x16: three 16x16 frames in one row, one per density', () => {
+  it('is 80x16: five 16x16 frames in one row, three of the densities and two of a clearing', () => {
     expect([VEIL_SHEET_WIDTH, VEIL_SHEET_HEIGHT, VEIL_FRAME_SIZE, VEIL_FRAMES]).toStrictEqual([
-      48, 16, 16, 3,
+      80, 16, 16, 5,
     ]);
-    expect(VEIL).toHaveLength(48 * 16 * 4);
+    expect(VEIL).toHaveLength(80 * 16 * 4);
   });
 
-  it('holds 32, 64 and 128 pixels of the signature colour, and nothing else', () => {
-    const counts = [0, 1, 2].map((frame) => {
+  it('holds 32, 64, 128, 16 and 8 pixels of the signature colour, and nothing else', () => {
+    const counts = [0, 1, 2, 3, 4].map((frame) => {
       let count = 0;
       everyPixel((i, j) => {
         count += inked(frame, i, j) ? 1 : 0;
       });
       return count;
     });
-    expect(counts).toStrictEqual([32, 64, 128]);
+    expect(counts).toStrictEqual([32, 64, 128, 16, 8]);
   });
 
   it('puts the pixels where the spec says', () => {
@@ -78,8 +78,27 @@ describe('the placeholder veil generator (0023)', () => {
     ]);
   });
 
-  it('repeats every 4 px, so that the frames join without a seam', () => {
-    for (let frame = 0; frame < VEIL_FRAMES; frame += 1) {
+  it('puts the pixels of a clearing where the spec says (0025)', () => {
+    everyPixel((i, j) => {
+      const grid = i % 4 === 0 && j % 4 === 0;
+      expect(inked(3, i, j), `frame 3 (${i}, ${j})`).toBe(grid);
+      expect(inked(4, i, j), `frame 4 (${i}, ${j})`).toBe(grid && (i + j) % 8 === 0);
+    });
+    expect([veilInk(3, 0, 0), veilInk(3, 4, 0), veilInk(3, 2, 2)]).toStrictEqual([
+      true,
+      true,
+      false,
+    ]);
+    expect([veilInk(4, 0, 0), veilInk(4, 4, 4), veilInk(4, 4, 0), veilInk(4, 0, 4)]).toStrictEqual([
+      true,
+      true,
+      false,
+      false,
+    ]);
+  });
+
+  it('repeats the three of the densities every 4 px, so that the frames join without a seam', () => {
+    for (let frame = 0; frame < 3; frame += 1) {
       everyPixel((i, j) => {
         expect(veilInk(frame, i, j)).toBe(veilInk(frame, (i + 4) % 16, j));
         expect(veilInk(frame, i, j)).toBe(veilInk(frame, i, (j + 4) % 16));
@@ -87,6 +106,15 @@ describe('the placeholder veil generator (0023)', () => {
     }
   });
 
+  it('repeats the two of a clearing every 8 px: they join without a seam too (0025)', () => {
+    for (const frame of [3, 4]) {
+      everyPixel((i, j) => {
+        expect(veilInk(frame, i, j)).toBe(veilInk(frame, (i + 8) % 16, j));
+        expect(veilInk(frame, i, j)).toBe(veilInk(frame, i, (j + 8) % 16));
+      });
+    }
+  });
+
   it('grows with the density: every pixel of a frame is in the next', () => {
     everyPixel((i, j) => {
       expect(!veilInk(0, i, j) || veilInk(1, i, j)).toBe(true);
@@ -94,9 +122,16 @@ describe('the placeholder veil generator (0023)', () => {
     });
   });
 
-  it('has no fourth frame', () => {
+  it('thins out in a clearing: every pixel of frame 4 is in frame 3, and every one of that in frame 0 (0025)', () => {
+    everyPixel((i, j) => {
+      expect(!veilInk(4, i, j) || veilInk(3, i, j)).toBe(true);
+      expect(!veilInk(3, i, j) || veilInk(0, i, j)).toBe(true);
+    });
+  });
+
+  it('has no sixth frame', () => {
     everyPixel((i, j) => {
-      expect(veilInk(3, i, j)).toBe(false);
+      expect(veilInk(5, i, j)).toBe(false);
     });
   });
 });
```

- [x] **Step 2: Run it** — `npx vitest run tests/unit/veil-sheet.test.ts`. Expected: FAIL,
  4 of 11 tests: the sheet is 48x16 with 3 frames, and frame 3 is empty.

- [x] **Step 3: The generator:**

```diff
diff --git a/tools/placeholder-veil.ts b/tools/placeholder-veil.ts
index 6663db5..7b502de 100644
--- a/tools/placeholder-veil.ts
+++ b/tools/placeholder-veil.ts
@@ -2,19 +2,23 @@ import { SHADOW_COLOUR } from '../src/render/palette.ts';
 import { rgb } from './placeholder-tiles.ts';
 
 /**
- * The placeholder veil sheet (visual.md §4, feature 0023): the shadow over a region, three
- * 16x16 frames in one row, one per density. A frame is a pattern in the signature colour that
- * repeats every 4 px, so the frames join without a seam from cell to cell: 32, 64 and 128
- * pixels. The fourth shadow asset. Pure — it returns pixels; tools/gen-sprites.ts writes the
- * file.
+ * The placeholder veil sheet (visual.md §4, features 0023 and 0025): the shadow over a region,
+ * five 16x16 frames in one row. The first three are one per density: patterns in the signature
+ * colour that repeat every 4 px — 32, 64 and 128 pixels. The last two are the veil of a region
+ * that is clearing: 16 and 8 pixels, repeating every 8 px. So every frame joins without a seam
+ * from cell to cell. The fourth shadow asset. Pure — it returns pixels; tools/gen-sprites.ts
+ * writes the file.
  */
 
 export const VEIL_FRAME_SIZE = 16;
-export const VEIL_FRAMES = 3;
+export const VEIL_FRAMES = 5;
 export const VEIL_SHEET_WIDTH = VEIL_FRAMES * VEIL_FRAME_SIZE;
 export const VEIL_SHEET_HEIGHT = VEIL_FRAME_SIZE;
 
-/** Whether pixel (i, j) of frame `frame` is veil: frame d − 1 is the veil of density d. */
+/**
+ * Whether pixel (i, j) of frame `frame` is veil: frame d − 1 is the veil of density d; frames 3
+ * and 4 are the two parts of a clearing after the first.
+ */
 export function veilInk(frame: number, i: number, j: number): boolean {
   switch (frame) {
     case 0:
@@ -26,6 +30,12 @@ export function veilInk(frame: number, i: number, j: number): boolean {
     case 2:
       // A checkerboard: every second pixel.
       return (i + j) % 2 === 0;
+    case 3:
+      // Both multiples of 4: one pixel in sixteen.
+      return i % 4 === 0 && j % 4 === 0;
+    case 4:
+      // Every second of those, in a diamond: one pixel in thirty-two.
+      return i % 4 === 0 && j % 4 === 0 && (i + j) % 8 === 0;
     default:
       return false;
   }
```

- [x] **Step 4: Write the sheet** — `npm run gen-sprites`. Expected: `git status` shows
  `public/sprites/shadow-veil.png` changed and no other file under `public/`.

- [x] **Step 5: Run** `npx vitest run tests/unit/veil-sheet.test.ts tests/unit/assets.test.ts
  tests/unit/gen-sprites.test.ts` — green — then `npm run check`: 1132 unit tests.

- [x] **Step 6: Commit** — `Add the two frames of a clearing to the veil's sheet`. Body: the
  veil of a cleared region thins out in two steps before it is gone; the sheet gets the two
  frames first, so that the scene can draw from them.

---

### Task 2: Cleared regions and the veil of a clearing

**Files:**
- Modify: `src/game/region.ts`
- Test: `tests/unit/region.test.ts`

**Interfaces:**
- Consumes: `SolvedCase` (`{ region, at }`) from `src/game/state.ts`; `Area`, `areasOf`,
  `veilOf` of 0023.
- Produces:
  - `inArea(area: Area, point: Point): boolean`
  - `CLEAR_STEPS = 120`, `CLEAR_PART_STEPS = 40`, `THIN_VEIL = 4`, `THINNEST_VEIL = 5`
  - `clearedAt(region: string, solved: readonly SolvedCase[]): number | null`
  - `shadowedAreas(areas: readonly Area[], solved: readonly SolvedCase[]): Area[]`
  - `clearingVeil(density: number, elapsed: number): number`
  - `shownVeil(areas, solved, tick: number, column: number, row: number): number`
  - `veilOf` unchanged in what it returns.

- [x] **Step 1: Write the failing tests** — the imports at the top, the five new blocks at
  the end of the file:

```diff
diff --git a/tests/unit/region.test.ts b/tests/unit/region.test.ts
index 1ddc55b..bf870a9 100644
--- a/tests/unit/region.test.ts
+++ b/tests/unit/region.test.ts
@@ -1,8 +1,22 @@
 import { describe, expect, it } from 'vitest';
 import type { NamedRect } from '../../src/engine/tiled';
 import { REGION_PREFIX, rectsOf, TRACE_PREFIX, WALL_PREFIX } from '../../src/game/rects';
-import { type Area, areasOf, veilOf } from '../../src/game/region';
+import {
+  type Area,
+  areasOf,
+  CLEAR_PART_STEPS,
+  CLEAR_STEPS,
+  clearedAt,
+  clearingVeil,
+  inArea,
+  shadowedAreas,
+  shownVeil,
+  THIN_VEIL,
+  THINNEST_VEIL,
+  veilOf,
+} from '../../src/game/region';
 import { wallsOf } from '../../src/game/shadow';
+import type { SolvedCase } from '../../src/game/state';
 import { tracesOf } from '../../src/game/trace';
 import { createInitialState } from '../../src/game/update';
 import { grassMap } from './grass-map';
@@ -134,3 +148,200 @@ describe('the veil of a cell (0023)', () => {
     }
   });
 });
+
+describe('a point in an area (0025)', () => {
+  const [hr] = areasOf([HR]) as [Area];
+
+  it('lies in it inside the rectangle, the left and the upper edge included', () => {
+    expect(inArea(hr, { x: 32, y: 32 })).toBe(true);
+    expect(inArea(hr, { x: 100.5, y: 90 })).toBe(true);
+    expect(inArea(hr, { x: 159.9, y: 159.9 })).toBe(true);
+  });
+
+  it('does not lie in it on the right or the lower edge, or outside', () => {
+    expect(inArea(hr, { x: 160, y: 90 })).toBe(false);
+    expect(inArea(hr, { x: 90, y: 160 })).toBe(false);
+    expect(inArea(hr, { x: 31.9, y: 90 })).toBe(false);
+    expect(inArea(hr, { x: 90, y: 31.9 })).toBe(false);
+  });
+});
+
+describe('a cleared region (0025)', () => {
+  /** Two rooms of density 1: the cells (2, 2) to (5, 5) and (10, 2) to (13, 5). */
+  const areas = areasOf([
+    rect('region:sales', 32, 32, 64, 64),
+    rect('region:marketing', 160, 32, 64, 64),
+  ]);
+  const sales: SolvedCase = { region: 'sales', at: 500 };
+  const marketing: SolvedCase = { region: 'marketing', at: 700 };
+  const under = (solved: readonly SolvedCase[], column: number, row: number): boolean =>
+    veilOf(shadowedAreas(areas, solved), column, row) > 0;
+
+  it('is cleared exactly when its case is solved, since the step that solved it', () => {
+    expect(clearedAt('sales', [])).toBeNull();
+    expect(clearedAt('sales', [sales])).toBe(500);
+    expect(clearedAt('marketing', [sales])).toBeNull();
+    expect(clearedAt('marketing', [sales, marketing])).toBe(700);
+  });
+
+  it('is cleared from step 0 on: a case solved at tick 0 counts', () => {
+    expect(clearedAt('sales', [{ region: 'sales', at: 0 }])).toBe(0);
+  });
+
+  it('is under shadow while its case is not solved, and not once it is', () => {
+    expect([under([], 3, 3), under([], 11, 3)]).toStrictEqual([true, true]);
+    expect([under([sales], 3, 3), under([sales], 11, 3)]).toStrictEqual([false, true]);
+    expect([under([sales, marketing], 3, 3), under([sales, marketing], 11, 3)]).toStrictEqual([
+      false,
+      false,
+    ]);
+  });
+
+  it('keeps the areas of the other regions as they are, in file order', () => {
+    expect(shadowedAreas(areas, [])).toStrictEqual(areas);
+    expect(shadowedAreas(areas, [sales])).toStrictEqual([areas[1]]);
+    expect(shadowedAreas(areas, [marketing, sales])).toStrictEqual([]);
+  });
+
+  it('loses every area of a region with two', () => {
+    const rooms = areasOf([
+      rect('region:meeting-rooms', 0, 0, 32, 32),
+      rect('region:sales', 32, 32, 64, 64),
+      rect('region:meeting-rooms', 0, 32, 32, 48),
+    ]);
+    const left = shadowedAreas(rooms, [{ region: 'meeting-rooms', at: 9 }]);
+    expect(left.map((area) => area.region)).toStrictEqual(['sales']);
+  });
+});
+
+describe('the veil of a clearing (0025)', () => {
+  it('lasts two seconds in three parts, and has two veils of its own after the three densities', () => {
+    expect([CLEAR_STEPS, CLEAR_PART_STEPS, THIN_VEIL, THINNEST_VEIL]).toStrictEqual([
+      120, 40, 4, 5,
+    ]);
+  });
+
+  it.each([
+    [0, 1],
+    [39, 1],
+    [40, 4],
+    [79, 4],
+    [80, 5],
+    [119, 5],
+    [120, 0],
+    [5000, 0],
+  ])('of density 1 is, %d steps after the clearing, the veil %d', (elapsed, veil) => {
+    expect(clearingVeil(1, elapsed)).toBe(veil);
+  });
+
+  it.each([
+    [0, 3],
+    [39, 3],
+    [40, 4],
+    [79, 4],
+    [80, 5],
+    [119, 5],
+    [120, 0],
+  ])('of density 3 is, %d steps after the clearing, the veil %d', (elapsed, veil) => {
+    expect(clearingVeil(3, elapsed)).toBe(veil);
+  });
+
+  it('is none at any time over a region without shadow', () => {
+    expect([0, 39, 40, 80, 119, 120].map((elapsed) => clearingVeil(0, elapsed))).toStrictEqual([
+      0, 0, 0, 0, 0, 0,
+    ]);
+  });
+});
+
+describe('the veil drawn over a cell (0025)', () => {
+  /** Sales and Marketing, density 1, and Development, density 3; the reception has no shadow. */
+  const areas = areasOf([
+    rect('region:sales', 32, 32, 64, 64),
+    rect('region:marketing', 160, 32, 64, 64),
+    rect('region:development', 32, 112, 64, 64),
+    rect('region:reception', 160, 112, 64, 64),
+  ]);
+  const TICKS = [500, 539, 540, 579, 580, 619, 620, 9000];
+
+  it('is the veil of the density everywhere while no case is solved', () => {
+    for (let row = 0; row < 12; row += 1) {
+      for (let column = 0; column < 20; column += 1) {
+        expect(shownVeil(areas, [], 777, column, row)).toBe(veilOf(areas, column, row));
+      }
+    }
+  });
+
+  it('thins out over a cleared region, step for step by the table of the spec', () => {
+    const solved: SolvedCase[] = [{ region: 'sales', at: 500 }];
+    expect(TICKS.map((tick) => shownVeil(areas, solved, tick, 3, 3))).toStrictEqual([
+      1, 1, 4, 4, 5, 5, 0, 0,
+    ]);
+    expect(TICKS.map((tick) => shownVeil(areas, solved, tick, 5, 5))).toStrictEqual([
+      1, 1, 4, 4, 5, 5, 0, 0,
+    ]);
+  });
+
+  it('stays as it was over the regions that are not cleared, and outside every area', () => {
+    const solved: SolvedCase[] = [{ region: 'sales', at: 500 }];
+    for (const tick of TICKS) {
+      expect(shownVeil(areas, solved, tick, 11, 3)).toBe(1);
+      expect(shownVeil(areas, solved, tick, 3, 8)).toBe(3);
+      expect(shownVeil(areas, solved, tick, 8, 3)).toBe(0);
+    }
+  });
+
+  it('starts from the veil of the density: a region of density 3 shows 3, then 4 and 5', () => {
+    const solved: SolvedCase[] = [{ region: 'development', at: 500 }];
+    expect(TICKS.map((tick) => shownVeil(areas, solved, tick, 3, 8))).toStrictEqual([
+      3, 3, 4, 4, 5, 5, 0, 0,
+    ]);
+  });
+
+  it('is none over a cleared region without shadow', () => {
+    const solved: SolvedCase[] = [{ region: 'reception', at: 500 }];
+    expect(TICKS.map((tick) => shownVeil(areas, solved, tick, 11, 8))).toStrictEqual([
+      0, 0, 0, 0, 0, 0, 0, 0,
+    ]);
+  });
+
+  it('is the standing shadow where a cleared area and one under shadow overlap', () => {
+    const thin: Area = { region: 'sales', density: 1, box: { x: 0, y: 0, width: 64, height: 64 } };
+    const dense: Area = {
+      region: 'development',
+      density: 3,
+      box: { x: 32, y: 32, width: 64, height: 64 },
+    };
+    const solved: SolvedCase[] = [{ region: 'sales', at: 500 }];
+    for (const both of [
+      [thin, dense],
+      [dense, thin],
+    ]) {
+      expect(TICKS.map((tick) => shownVeil(both, solved, tick, 2, 2))).toStrictEqual([
+        3, 3, 3, 3, 3, 3, 3, 3,
+      ]);
+      expect(TICKS.map((tick) => shownVeil(both, solved, tick, 1, 1))).toStrictEqual([
+        1, 1, 4, 4, 5, 5, 0, 0,
+      ]);
+    }
+  });
+
+  it('is that of the first area in the file where two clearing areas overlap', () => {
+    const first: Area = { region: 'sales', density: 1, box: { x: 0, y: 0, width: 64, height: 64 } };
+    const second: Area = {
+      region: 'marketing',
+      density: 1,
+      box: { x: 32, y: 32, width: 64, height: 64 },
+    };
+    const solved: SolvedCase[] = [
+      { region: 'sales', at: 500 },
+      { region: 'marketing', at: 560 },
+    ];
+    // At 590 Sales is in its third part and Marketing in its first.
+    expect(shownVeil([first, second], solved, 590, 2, 2)).toBe(5);
+    expect(shownVeil([second, first], solved, 590, 2, 2)).toBe(1);
+    // At 625 the clearing of Sales is over, and Marketing is in its second part.
+    expect(shownVeil([first, second], solved, 625, 2, 2)).toBe(4);
+    expect(shownVeil([second, first], solved, 625, 2, 2)).toBe(4);
+    expect(shownVeil([first, second], solved, 680, 2, 2)).toBe(0);
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/region.test.ts`. Expected: FAIL, 31
  of 47 tests, with `clearedAt is not a function` and the like. The 16 tests of 0023 pass.

- [x] **Step 3: The rules:**

```diff
diff --git a/src/game/region.ts b/src/game/region.ts
index d70ae43..656c3cc 100644
--- a/src/game/region.ts
+++ b/src/game/region.ts
@@ -1,14 +1,17 @@
 import type { Box } from '../engine/collision';
-import { type NamedRect, TILE_SIZE } from '../engine/tiled';
+import { type NamedRect, type Point, TILE_SIZE } from '../engine/tiled';
 import { REGION_PREFIX, rectsOf } from './rects';
+import type { SolvedCase } from './state';
 import { densityOf } from './world';
 
 /**
  * The areas of the regions (world.md §1, feature 0023). An area is a rectangle of the map
  * named `region:<id>`: whole cells that belong to a region of the world data. A region may
  * have several. A cell in an area of a region with shadow is under shadow, and its veil is the
- * region's density. Pure data and pure functions; the areas are read from the map's
- * rectangles on every call and kept nowhere.
+ * region's density — until the region's case is solved: a solved region is cleared, its cells
+ * are no longer under shadow, and its veil thins out over CLEAR_STEPS steps (0025). Pure data
+ * and pure functions; the areas are read from the map's rectangles on every call and kept
+ * nowhere.
  */
 
 export interface Area {
@@ -47,25 +50,96 @@ export function areasOf(rects: readonly NamedRect[]): Area[] {
   });
 }
 
+/** Whether a point lies in an area: inside its rectangle, the left and the upper edge included. */
+export function inArea(area: Area, point: Point): boolean {
+  const { box } = area;
+  return (
+    point.x >= box.x &&
+    point.x < box.x + box.width &&
+    point.y >= box.y &&
+    point.y < box.y + box.height
+  );
+}
+
 /**
  * The veil of the cell (column, row): the density of the area it lies in, the largest when
  * areas overlap, and 0 when it lies in no area or only in areas without shadow. A cell with a
- * veil above 0 is under shadow.
+ * veil above 0 is under shadow. Given the areas still under shadow (`shadowedAreas`), a cell
+ * of a cleared region has no veil (0025).
  */
 export function veilOf(areas: readonly Area[], column: number, row: number): number {
-  const x = column * TILE_SIZE;
-  const y = row * TILE_SIZE;
+  const corner: Point = { x: column * TILE_SIZE, y: row * TILE_SIZE };
   let veil = 0;
-  for (const { density, box } of areas) {
-    if (
-      density > veil &&
-      x >= box.x &&
-      x < box.x + box.width &&
-      y >= box.y &&
-      y < box.y + box.height
-    ) {
-      veil = density;
+  for (const area of areas) {
+    if (area.density > veil && inArea(area, corner)) {
+      veil = area.density;
     }
   }
   return veil;
 }
+
+/** A cleared region's veil thins out for this many steps, two seconds, and is gone (0025). */
+export const CLEAR_STEPS = 120;
+/** The clearing has three parts of equal length: the region's own veil, then the two thin ones. */
+export const CLEAR_PART_STEPS = CLEAR_STEPS / 3;
+/**
+ * The two veils of a clearing, after the three of the densities: 16 and 8 pixels a cell. Like
+ * every veil, each is drawn from the frame veil − 1 of the veil's sheet: frames 3 and 4.
+ */
+export const THIN_VEIL = 4;
+export const THINNEST_VEIL = 5;
+
+/** The tick of the step that cleared a region — the one that solved its case — or null. */
+export function clearedAt(region: string, solved: readonly SolvedCase[]): number | null {
+  return solved.find((entry) => entry.region === region)?.at ?? null;
+}
+
+/** The areas still under shadow: those of the regions that are not cleared. */
+export function shadowedAreas(areas: readonly Area[], solved: readonly SolvedCase[]): Area[] {
+  return areas.filter((area) => clearedAt(area.region, solved) === null);
+}
+
+/**
+ * The veil over a region of the given density, `elapsed` steps after it was cleared: its own
+ * for the first part, THIN_VEIL for the second, THINNEST_VEIL for the third, and none from
+ * CLEAR_STEPS on. A region without shadow has none at any time.
+ */
+export function clearingVeil(density: number, elapsed: number): number {
+  if (density === 0 || elapsed >= CLEAR_STEPS) {
+    return 0;
+  }
+  if (elapsed < CLEAR_PART_STEPS) {
+    return density;
+  }
+  return elapsed < 2 * CLEAR_PART_STEPS ? THIN_VEIL : THINNEST_VEIL;
+}
+
+/**
+ * The veil drawn over the cell (column, row) at step `tick`: where the cell is under shadow,
+ * the veil of its density (`veilOf` on the areas still under shadow); else the clearing veil of
+ * the first area in file order that the cell lies in and whose region is still clearing; else
+ * 0. The cell's tiles do not follow it: they are in colour from the step that cleared it.
+ */
+export function shownVeil(
+  areas: readonly Area[],
+  solved: readonly SolvedCase[],
+  tick: number,
+  column: number,
+  row: number,
+): number {
+  const standing = veilOf(shadowedAreas(areas, solved), column, row);
+  if (standing > 0) {
+    return standing;
+  }
+  const corner: Point = { x: column * TILE_SIZE, y: row * TILE_SIZE };
+  for (const area of areas) {
+    const at = clearedAt(area.region, solved);
+    if (at !== null && inArea(area, corner)) {
+      const veil = clearingVeil(area.density, tick - at);
+      if (veil > 0) {
+        return veil;
+      }
+    }
+  }
+  return 0;
+}
```

- [x] **Step 4: Run** `npx vitest run tests/unit/region.test.ts` — green, the tests of 0023
  unchanged — then `npm run check`: 1163 unit tests.

- [x] **Step 5: Commit** — `Say when a region is cleared and which veil it shows`. Body: a
  region is cleared when its case is solved; the rules live in `game/region` and read
  `solved`, so the state needs no field for it.

---

### Task 3: The scene

**Files:**
- Modify: `src/render/draw-scene.ts`
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `shadowedAreas`, `shownVeil`, `veilOf` (Task 2); the five frames (Task 1);
  `drawLayer`, `drawVeil` and `Shadow` of `render/draw-map`, unchanged.
- Produces: nothing new for later tasks.

- [x] **Step 1: Write the failing tests** — one new block at the end of the file. The block
  of 0023 above it is not touched:

```diff
diff --git a/tests/unit/draw-scene.test.ts b/tests/unit/draw-scene.test.ts
index bf21cd6..1719167 100644
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -1329,3 +1329,151 @@ describe('the shadow over the regions in the scene (0023)', () => {
     expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet]);
   });
 });
+
+describe('the cleared region in the scene (0025)', () => {
+  /**
+   * The 3x2 map in three rooms: the left column is Sales and the middle one Marketing, both of
+   * density 1; the right column is Development, density 3.
+   */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...MAP,
+      rects: [
+        { name: 'region:sales', x: 0, y: 0, width: 16, height: 32 },
+        { name: 'region:marketing', x: 16, y: 0, width: 16, height: 32 },
+        { name: 'region:development', x: 32, y: 0, width: 16, height: 32 },
+      ],
+    },
+  };
+  /** The scene `elapsed` steps after the case of `region` was solved. */
+  const cleared = (region: string, elapsed: number): GameState => ({
+    ...state({ x: 40, y: 30 }),
+    solved: [{ region, at: QUIET_TICK - elapsed }],
+  });
+  /** The frames of the veil's sheet the scene drew, each with its place. */
+  const veils = (scene: GameState): string[] => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, scene, content);
+    const sprites = renderer.calls.filter((call) => call.startsWith('drawSprite'));
+    return sprites.filter((_call, i) => renderer.sheets[i] === content.veilSheet);
+  };
+  /** Marketing and Development, row by row, as long as they are under shadow. */
+  const OTHERS_TOP = ['drawSprite 0 at 16,0', 'drawSprite 2 at 32,0'];
+  const OTHERS_BOTTOM = ['drawSprite 0 at 16,16', 'drawSprite 2 at 32,16'];
+
+  it('draws the three rooms under shadow before a case is solved', () => {
+    expect(veils(state({ x: 40, y: 30 }))).toStrictEqual([
+      'drawSprite 0 at 0,0',
+      ...OTHERS_TOP,
+      'drawSprite 0 at 0,16',
+      ...OTHERS_BOTTOM,
+    ]);
+  });
+
+  it('draws the cells of the cleared region from the tileset on all three layers, at once', () => {
+    for (const elapsed of [0, 39, 40, 119, 120, 5000]) {
+      const renderer = recordingRenderer();
+      drawScene(renderer, cleared('sales', elapsed), content);
+      const tiles = renderer.calls.filter((call) => call.startsWith('drawTile'));
+      expect(tiles).toStrictEqual([
+        'drawTile 0 at 0,0',
+        'drawTile 1 at 16,0',
+        'drawTile 2 at 0,16',
+        'drawTile 2 at 16,16',
+        'drawTile 2 at 32,16',
+        'drawTile 4 at 16,16',
+        'drawTile 6 at 0,0',
+      ]);
+      expect(renderer.tilesets, `${elapsed} steps`).toStrictEqual([
+        content.tileset,
+        content.shadowTileset,
+        content.tileset,
+        content.shadowTileset,
+        content.shadowTileset,
+        content.shadowTileset,
+        content.tileset,
+      ]);
+    }
+  });
+
+  it.each([
+    [0, 0],
+    [39, 0],
+    [40, 3],
+    [79, 3],
+    [80, 4],
+    [119, 4],
+  ])(
+    '%d steps after the solving it draws frame %d of the veil over the cleared cells',
+    (elapsed, frame) => {
+      expect(veils(cleared('sales', elapsed))).toStrictEqual([
+        `drawSprite ${frame} at 0,0`,
+        ...OTHERS_TOP,
+        `drawSprite ${frame} at 0,16`,
+        ...OTHERS_BOTTOM,
+      ]);
+    },
+  );
+
+  it('draws no veil over them from 120 steps on, and the other rooms as before', () => {
+    for (const elapsed of [120, 121, 5000]) {
+      expect(veils(cleared('sales', elapsed))).toStrictEqual([...OTHERS_TOP, ...OTHERS_BOTTOM]);
+    }
+  });
+
+  it.each([
+    [0, 2],
+    [39, 2],
+    [40, 3],
+    [79, 3],
+    [80, 4],
+    [119, 4],
+  ])('over a cleared region of density 3 it draws, after %d steps, frame %d', (elapsed, frame) => {
+    expect(veils(cleared('development', elapsed))).toStrictEqual([
+      'drawSprite 0 at 0,0',
+      'drawSprite 0 at 16,0',
+      `drawSprite ${frame} at 32,0`,
+      'drawSprite 0 at 0,16',
+      'drawSprite 0 at 16,16',
+      `drawSprite ${frame} at 32,16`,
+    ]);
+  });
+
+  it('lays the thinning veil where the veil lies: after detail and before the cone', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, { ...cleared('sales', 40), lamp: { on: true, strength: 1 } }, content);
+    const detail = renderer.calls.indexOf('drawTile 4 at 16,16');
+    expect(renderer.calls[detail + 1]).toBe('drawSprite 3 at 0,0');
+    expect(renderer.sheets.slice(0, 7)).toStrictEqual([
+      content.veilSheet,
+      content.veilSheet,
+      content.veilSheet,
+      content.veilSheet,
+      content.veilSheet,
+      content.veilSheet,
+      content.lampSheet,
+    ]);
+  });
+
+  it('shifts the thinning veil with the camera', () => {
+    const scene: GameState = { ...cleared('sales', 80), camera: { x: 5, y: 7 } };
+    expect(veils(scene)).toContain('drawSprite 4 at -5,-7');
+    expect(veils(scene)).toContain('drawSprite 4 at -5,9');
+  });
+
+  it('draws a scene in which every region is cleared long ago like a map without areas', () => {
+    const renderer = recordingRenderer();
+    const scene: GameState = {
+      ...state({ x: 40, y: 30 }),
+      solved: [
+        { region: 'sales', at: 0 },
+        { region: 'marketing', at: 100 },
+        { region: 'development', at: 200 },
+      ],
+    };
+    drawScene(renderer, scene, content);
+    expect(renderer.tilesets.every((tileset) => tileset === content.tileset)).toBe(true);
+    expect(renderer.sheets).toStrictEqual([content.playerSheet]);
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/draw-scene.test.ts`. Expected: FAIL,
  12 of 93 tests: the cleared cells are still drawn from the shadow tileset and under frame
  0. The first test of the block and the rows for 0 and 39 steps of Sales pass already.

- [x] **Step 3: The scene:**

```diff
diff --git a/src/render/draw-scene.ts b/src/render/draw-scene.ts
index 6456f84..a9ace7a 100644
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -8,7 +8,7 @@ import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
 import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
 import { DARK_STEPS } from '../game/overview';
-import { areasOf, veilOf } from '../game/region';
+import { areasOf, shadowedAreas, shownVeil, veilOf } from '../game/region';
 import { LIFT_STEPS, wallsOf } from '../game/shadow';
 import {
   type CreatureState,
@@ -45,7 +45,7 @@ export interface SceneContent {
   readonly tileset: TilesetImage;
   /** The tileset's sheet in the greys of a region under shadow: same size, same ids (0023). */
   readonly shadowTileset: TilesetImage;
-  /** Three 16x16 frames: the veil of density 1, 2 and 3 (0023). */
+  /** Five 16x16 frames: the veil of density 1, 2 and 3 (0023), and the two of a clearing (0025). */
   readonly veilSheet: SpriteSheet;
   readonly playerSheet: SpriteSheet;
   /** Four 48x48 frames, one per facing in FACINGS order (0007). */
@@ -346,7 +346,8 @@ export function lidHeight(dark: number): number {
 
 /**
  * One frame: ground and detail — a cell under shadow from the shadow tileset (0023) — the veil
- * over the cells under shadow (0023), the cone when the lamp is on, the standing shadow walls in array
+ * over the cells under shadow (0023) and, thinning, over those of a region cleared less than two
+ * seconds ago (0025), the cone when the lamp is on, the standing shadow walls in array
  * order (0014), the traces the light is on (0022), the ground movers whose feet are at or above
  * the player's, then the standing figures whose feet are at or above the player's (0017), the
  * creatures in array order, the player, the other standing figures, the other ground movers,
@@ -383,13 +384,21 @@ export function drawScene(
   renderer.clear(PAGE_BACKGROUND);
   // A map without areas has no shadow, and is drawn exactly as before 0023.
   const areas = areasOf(content.map.rects);
-  const veil = (column: number, row: number): number => veilOf(areas, column, row);
+  // A cleared region is in colour at once (0025); its veil thins out for two seconds more.
+  const shadowed = shadowedAreas(areas, state.solved);
   const shadow: Shadow | undefined =
-    areas.length === 0 ? undefined : { tileset: content.shadowTileset, veilOf: veil };
+    areas.length === 0
+      ? undefined
+      : {
+          tileset: content.shadowTileset,
+          veilOf: (column, row) => veilOf(shadowed, column, row),
+        };
   drawLayer(renderer, content.map, content.tileset, 'ground', camera, shadow);
   drawLayer(renderer, content.map, content.tileset, 'detail', camera, shadow);
   if (shadow !== undefined) {
-    drawVeil(renderer, content.map, content.veilSheet, camera, veil);
+    drawVeil(renderer, content.map, content.veilSheet, camera, (column, row) =>
+      shownVeil(areas, state.solved, state.tick, column, row),
+    );
   }
   if (state.lamp.on) {
     const origin = lampFrameOrigin(player, camera);
```

- [x] **Step 4: Run** `npx vitest run tests/unit/draw-scene.test.ts tests/unit/draw-map.test.ts`
  — green, the block of 0023 unchanged — then `npm run check`: 1181 unit tests.

- [x] **Step 5: Commit** — `Draw a cleared region in colour and thin its veil out`. Body: the
  tiles follow the areas that are not cleared, so the colours are back in the frame after
  the solving step; the veil follows the clearing and is gone after two seconds.

---

### Task 4: What goes with the shadow

**Files:**
- Modify: `src/game/cases.ts`, `src/game/update.ts`
- Test: `tests/unit/cases.test.ts`, `tests/unit/state.test.ts`, `tests/unit/floor.test.ts`

**Interfaces:**
- Consumes: `areasOf`, `inArea`, `shadowedAreas`, `clearingVeil` (Task 2); `wallsOf` of
  `game/shadow`; `solve` of 0024, unchanged.
- Produces: `clearRegion(state: GameState, region: string, map: TileMap): GameState`.

- [x] **Step 1: Write the failing tests.** `cases.test.ts` — the rule on a map of two rooms:

```diff
diff --git a/tests/unit/cases.test.ts b/tests/unit/cases.test.ts
index 481bdf1..a600887 100644
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -5,6 +5,7 @@ import {
   CASE_OVERVIEW,
   CASES,
   type Case,
+  clearRegion,
   isReady,
   isSolved,
   outcomeOf,
@@ -17,7 +18,7 @@ import {
 import { routesOf } from '../../src/game/mover';
 import { CASE_NOTICE_STEPS, noticeOf } from '../../src/game/notice';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
-import type { GameState, TraceState } from '../../src/game/state';
+import type { CreatureState, GameState, TraceState } from '../../src/game/state';
 import { speakerOf, speakersOf } from '../../src/game/talk';
 import type { Trace } from '../../src/game/trace';
 import { createInitialState, update } from '../../src/game/update';
@@ -324,3 +325,119 @@ describe('what the journal takes from the cases (0024)', () => {
     ).toHaveLength(2);
   });
 });
+
+describe('what goes with the shadow of a solved region (0025)', () => {
+  const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
+    name,
+    x,
+    y,
+    width,
+    height,
+  });
+  /**
+   * 20x12 cells of open floor. Sales is the cells (2, 2) to (7, 7), Marketing the cells (12, 2)
+   * to (17, 7); each has a shadow wall on the upper edge of its first cell.
+   */
+  const ROOMS: TileMap = grassMap(
+    20,
+    12,
+    { x: 160, y: 160 },
+    [],
+    [
+      rect('region:sales', 32, 32, 96, 96),
+      rect('region:marketing', 192, 32, 96, 96),
+      rect('shadow:sales', 32, 32, 16, 4),
+      rect('shadow:marketing', 192, 32, 16, 4),
+    ],
+  );
+  const snippet = (home: { x: number; y: number }, at = home): CreatureState => ({
+    species: 'snippet',
+    x: at.x,
+    y: at.y,
+    light: 0,
+    home,
+  });
+  /** At home in Sales and out of it; at home outside and standing in Sales; at home in Marketing. */
+  const LEFT_HOME = snippet({ x: 80, y: 80 }, { x: 300, y: 170 });
+  const VISITOR = snippet({ x: 160, y: 150 }, { x: 80, y: 80 });
+  const NEIGHBOUR = snippet({ x: 240, y: 80 });
+  const start: GameState = {
+    ...createInitialState(ROOMS),
+    creatures: [LEFT_HOME, VISITOR, NEIGHBOUR],
+    captured: { snippet: 2 },
+  };
+
+  it('starts with both walls standing', () => {
+    expect(start.shadowWalls.map((wall) => wall.wall)).toStrictEqual([0, 1]);
+  });
+
+  it('removes every standing wall of the region and leaves the walls of the other regions', () => {
+    expect(clearRegion(start, 'sales', ROOMS).shadowWalls).toStrictEqual([
+      { wall: 1, lit: false, light: 0 },
+    ]);
+    expect(clearRegion(start, 'marketing', ROOMS).shadowWalls).toStrictEqual([
+      { wall: 0, lit: false, light: 0 },
+    ]);
+  });
+
+  it('removes a wall that is giving way, and none where the wall was lifted before', () => {
+    const giving: GameState = { ...start, shadowWalls: [{ wall: 0, lit: true, light: 30 }] };
+    expect(clearRegion(giving, 'sales', ROOMS).shadowWalls).toStrictEqual([]);
+    const lifted: GameState = { ...start, shadowWalls: [{ wall: 1, lit: false, light: 0 }] };
+    expect(clearRegion(lifted, 'sales', ROOMS).shadowWalls).toStrictEqual(lifted.shadowWalls);
+  });
+
+  it('removes every creature at home in the region, wherever it is, and keeps the others', () => {
+    expect(clearRegion(start, 'sales', ROOMS).creatures).toStrictEqual([VISITOR, NEIGHBOUR]);
+    expect(clearRegion(start, 'marketing', ROOMS).creatures).toStrictEqual([LEFT_HOME, VISITOR]);
+  });
+
+  it('counts the left and the upper edge of the area to it, and not the right or the lower', () => {
+    const edges = [
+      snippet({ x: 32, y: 32 }),
+      snippet({ x: 127.5, y: 127.5 }),
+      snippet({ x: 128, y: 80 }),
+      snippet({ x: 80, y: 128 }),
+    ];
+    const cleared = clearRegion({ ...start, creatures: edges }, 'sales', ROOMS);
+    expect(cleared.creatures).toStrictEqual([edges[2], edges[3]]);
+  });
+
+  it('captures nothing, and changes nothing else', () => {
+    expect(clearRegion(start, 'sales', ROOMS)).toStrictEqual({
+      ...start,
+      shadowWalls: [{ wall: 1, lit: false, light: 0 }],
+      creatures: [VISITOR, NEIGHBOUR],
+    });
+    expect(clearRegion(start, 'sales', ROOMS).captured).toStrictEqual({ snippet: 2 });
+  });
+
+  it('removes the creatures of every area of a region with two', () => {
+    const two = grassMap(
+      20,
+      12,
+      { x: 160, y: 160 },
+      [],
+      [rect('region:meeting-rooms', 0, 0, 32, 32), rect('region:meeting-rooms', 64, 0, 32, 48)],
+    );
+    const creatures = [
+      snippet({ x: 8, y: 8 }),
+      snippet({ x: 48, y: 8 }),
+      snippet({ x: 72, y: 40 }),
+    ];
+    const cleared = clearRegion({ ...createInitialState(two), creatures }, 'meeting-rooms', two);
+    expect(cleared.creatures).toStrictEqual([creatures[1]]);
+  });
+
+  it('changes nothing on a map without areas and walls, or for a region the map does not have', () => {
+    const state: GameState = { ...createInitialState(MAP), creatures: [VISITOR] };
+    expect(clearRegion(state, 'sales', MAP)).toStrictEqual(state);
+    expect(clearRegion(start, 'hr', ROOMS)).toStrictEqual(start);
+  });
+
+  it('does not change its arguments', () => {
+    const before = JSON.stringify(start);
+    clearRegion(start, 'sales', ROOMS);
+    expect(JSON.stringify(start)).toBe(before);
+  });
+});
```

  `state.test.ts` — the step, the wake and the round trip, on the fixture of 0024 with a
  room built round its traces:

```diff
diff --git a/tests/unit/state.test.ts b/tests/unit/state.test.ts
index 2cdf12c..9edd646 100644
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -5,6 +5,7 @@ import { describe, expect, it } from 'vitest';
 import { parseTileMap, parseTileset, type TileMap } from '../../src/engine/tiled';
 import { followPlayer } from '../../src/game/camera';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
+import { clearingVeil } from '../../src/game/region';
 import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../../src/game/state';
 import { createInitialState, update } from '../../src/game/update';
 import { grassMap } from './grass-map';
@@ -843,3 +844,93 @@ describe('the solved cases in the state (0024)', () => {
     expect(closed.solved).toStrictEqual([]);
   });
 });
+
+describe('the cleared region in the state (0025)', () => {
+  const TALK: GameInput = { ...NONE, talk: true };
+  /**
+   * The fixture of 0024 with a room round its traces: Sales is the cells (8, 4) to (19, 11),
+   * with a shadow wall on its first cell and a snippet at home in it; a second snippet is at
+   * home outside, and a wall of HR stands outside.
+   */
+  const ROOM_MAP: TileMap = {
+    ...CASE_MAP,
+    points: [
+      ...CASE_MAP.points,
+      { name: 'snippet', x: 240, y: 150 },
+      { name: 'snippet', x: 40, y: 150 },
+    ],
+    rects: [
+      ...CASE_MAP.rects,
+      { name: 'region:sales', x: 128, y: 64, width: 192, height: 128 },
+      { name: 'shadow:sales', x: 128, y: 64, width: 16, height: 4 },
+      { name: 'shadow:hr', x: 16, y: 160, width: 16, height: 4 },
+    ],
+  };
+  const through = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
+    inputs.reduce((state, input) => update(state, input, ROOM_MAP), start);
+  const start = createInitialState(ROOM_MAP);
+  const ready: GameState = {
+    ...start,
+    tick: 1000,
+    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+  };
+  const OUTSIDE = { species: 'snippet', x: 40, y: 150, light: 0, home: { x: 40, y: 150 } };
+
+  it('starts with both creatures and both walls', () => {
+    expect(start.creatures.map((creature) => creature.home)).toStrictEqual([
+      { x: 240, y: 150 },
+      { x: 40, y: 150 },
+    ]);
+    expect(start.shadowWalls.map((wall) => wall.wall)).toStrictEqual([0, 1]);
+  });
+
+  it('removes the wall of the region and the creature at home in it in the step that solves the case', () => {
+    const before = through(ready, TALK, NONE, TALK, NONE);
+    expect(before.creatures).toHaveLength(2);
+    expect(before.shadowWalls).toHaveLength(2);
+    const solved = update(before, TALK, ROOM_MAP);
+    expect(solved.solved).toStrictEqual([{ region: 'sales', at: 1005 }]);
+    expect(solved.creatures).toStrictEqual([OUTSIDE]);
+    expect(solved.shadowWalls).toStrictEqual([{ wall: 1, lit: false, light: 0 }]);
+    expect(solved.captured).toStrictEqual({ snippet: 0 });
+  });
+
+  it('removes nothing in a step that solves nothing', () => {
+    const one: GameState = {
+      ...ready,
+      traces: ready.traces.map((trace, i) => (i === 0 ? trace : { ...trace, found: null })),
+    };
+    const closed = through(one, TALK, NONE, TALK);
+    expect(closed.dialogue).toBeNull();
+    expect(closed.creatures).toHaveLength(2);
+    expect(closed.shadowWalls).toHaveLength(2);
+  });
+
+  it('brings back no creature that left this way when the figure wakes (0009)', () => {
+    const solved = through(ready, TALK, NONE, TALK, NONE, TALK);
+    const woken = update({ ...solved, dark: 44 }, NONE, ROOM_MAP);
+    expect(woken.dark).toBe(45);
+    expect(woken.creatures).toStrictEqual([OUTSIDE]);
+    expect(woken.shadowWalls).toStrictEqual([{ wall: 1, lit: false, light: 0 }]);
+    expect(woken.captured).toStrictEqual({ snippet: 0 });
+  });
+
+  it('keeps them gone: 600 steps later the creature and the wall are still not there', () => {
+    let state = through(ready, TALK, NONE, TALK, NONE, TALK);
+    for (let i = 0; i < 600; i += 1) {
+      state = update(state, NONE, ROOM_MAP);
+    }
+    expect(state.creatures.map((creature) => creature.home)).toStrictEqual([{ x: 40, y: 150 }]);
+    expect(state.shadowWalls.map((wall) => wall.wall)).toStrictEqual([1]);
+  });
+
+  it('survives a JSON round trip in the middle of a clearing (INV-1)', () => {
+    let state = through(ready, TALK, NONE, TALK, NONE, TALK);
+    for (let i = 0; i < 60; i += 1) {
+      state = update(state, NONE, ROOM_MAP);
+    }
+    expect(state.tick).toBe(1065);
+    expect(clearingVeil(1, state.tick - (state.solved[0]?.at ?? 0))).toBe(4);
+    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
+  });
+});
```

  `floor.test.ts` — criterion 9 on the floor as loaded:

```diff
diff --git a/tests/unit/floor.test.ts b/tests/unit/floor.test.ts
index 41f7b5a..dafea41 100644
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -9,12 +9,13 @@ import { CASES, isReady, progressOf } from '../../src/game/cases';
 import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
 import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
-import { areasOf, veilOf } from '../../src/game/region';
+import { type GameInput, NO_INPUT } from '../../src/game/player';
+import { areasOf, inArea, shadowedAreas, veilOf } from '../../src/game/region';
 import { standingWalls, wallsOf, withWalls } from '../../src/game/shadow';
-import { NO_RECOIL } from '../../src/game/state';
+import { type GameState, NO_RECOIL } from '../../src/game/state';
 import { speakerInReach, speakersOf, TALK_DISTANCE } from '../../src/game/talk';
 import { traceInLight, tracesOf } from '../../src/game/trace';
-import { createInitialState } from '../../src/game/update';
+import { createInitialState, update } from '../../src/game/update';
 import {
   areaBox,
   type CellRect,
@@ -1438,3 +1439,74 @@ describe('the case of Sales on the floor (0024)', () => {
     expect(isReady('sales', progressOf(five, floor))).toBe(true);
   });
 });
+
+describe('the cleared region on the floor (0025)', () => {
+  const TALK: GameInput = { ...NO_INPUT, talk: true };
+  const areas = areasOf(floor.rects);
+  const walls = wallsOf(floor.rects);
+  const start = createInitialState(floor);
+  const source = start.movers.find(
+    (mover) => routesOf(floor.points)[mover.route]?.name === 'person:sales',
+  );
+  /** Every trace found long ago, the figure 24 px below the colleague of Sales. */
+  const ready: GameState = {
+    ...start,
+    tick: 1000,
+    player: { ...start.player, x: source?.x ?? 0, y: (source?.y ?? 0) + 24 },
+    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+  };
+  const solve = (from: GameState): GameState =>
+    [TALK, NO_INPUT, TALK, NO_INPUT, TALK].reduce(
+      (state, input) => update(state, input, floor),
+      from,
+    );
+  const regionsOf = (state: GameState): (string | undefined)[] =>
+    state.shadowWalls.map((standing) => walls[standing.wall]?.region);
+
+  it('has two of the three snippets at home in the area of Sales, and one in the east corridor', () => {
+    const sales = areas.filter((area) => area.region === 'sales');
+    expect(sales).toHaveLength(1);
+    expect(SNIPPETS.map((home) => sales.some((area) => inArea(area, home)))).toStrictEqual([
+      false,
+      true,
+      true,
+    ]);
+    // The corridor is no region: the first snippet's home lies in no area at all.
+    expect(areas.some((area) => inArea(area, SNIPPETS[0] as Point))).toBe(false);
+  });
+
+  it('solves the case of Sales from beside its source', () => {
+    expect(solve(ready).solved).toStrictEqual([{ region: 'sales', at: 1005 }]);
+  });
+
+  it('leaves one creature when nothing was captured: the one whose home is (1224, 622)', () => {
+    const solved = solve(ready);
+    expect(solved.creatures.map((creature) => creature.home)).toStrictEqual([{ x: 1224, y: 622 }]);
+    expect(solved.captured).toStrictEqual({ snippet: 0 });
+  });
+
+  it('removes none when both snippets of Sales were captured before', () => {
+    const corridor = start.creatures.slice(0, 1);
+    const solved = solve({ ...ready, creatures: corridor, captured: { snippet: 2 } });
+    expect(solved.creatures).toStrictEqual(corridor);
+    expect(solved.captured).toStrictEqual({ snippet: 2 });
+  });
+
+  it('removes the shadow wall of Sales if it still stands, and no other', () => {
+    expect(regionsOf(ready).filter((region) => region === 'sales')).toHaveLength(1);
+    const solved = solve(ready);
+    expect(regionsOf(solved)).not.toContain('sales');
+    expect(solved.shadowWalls).toHaveLength(ready.shadowWalls.length - 1);
+    const lifted = ready.shadowWalls.filter((standing) => walls[standing.wall]?.region !== 'sales');
+    expect(solve({ ...ready, shadowWalls: lifted }).shadowWalls).toStrictEqual(lifted);
+  });
+
+  it('takes the shadow from the cells of Sales and leaves it on every other region', () => {
+    const cleared = shadowedAreas(areas, solve(ready).solved);
+    const veil = (column: number, row: number): number => veilOf(cleared, column, row);
+    expect(veilOf(areas, 90, 30)).toBe(1);
+    expect(veil(90, 30)).toBe(0);
+    expect([veil(10, 70), veil(100, 70), veil(95, 5)]).toStrictEqual([1, 1, 1]);
+    expect([veil(5, 5), veil(30, 10), veil(60, 10)]).toStrictEqual([2, 2, 3]);
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/cases.test.ts tests/unit/state.test.ts
  tests/unit/floor.test.ts`. Expected: FAIL, 13 of 180 tests: `clearRegion is not a
  function`, and after the solving step the creatures and the wall are still there.

- [x] **Step 3: The rule,** in `cases.ts`:

```diff
diff --git a/src/game/cases.ts b/src/game/cases.ts
index 5f66cdf..01545a5 100644
--- a/src/game/cases.ts
+++ b/src/game/cases.ts
@@ -1,6 +1,8 @@
 import type { TileMap } from '../engine/tiled';
 import { type TextKey, textKey } from '../text/text';
 import type { Route } from './mover';
+import { areasOf, inArea } from './region';
+import { wallsOf } from './shadow';
 import type { Dialogue, GameState, SolvedCase, TraceState } from './state';
 import { type Trace, tracesOf } from './trace';
 
@@ -119,6 +121,24 @@ export function solve(state: GameState, region: string): GameState {
   };
 }
 
+/**
+ * What goes with the shadow of a region whose case was solved in this step (0025): every
+ * shadow wall of the region that still stands leaves `shadowWalls`, as a lifted wall does, and
+ * every creature whose home lies in an area of the region leaves `creatures`, wherever it is.
+ * Such a creature is not captured: `captured` does not change. Nothing else changes.
+ */
+export function clearRegion(state: GameState, region: string, map: TileMap): GameState {
+  const walls = wallsOf(map.rects);
+  const areas = areasOf(map.rects).filter((area) => area.region === region);
+  return {
+    ...state,
+    shadowWalls: state.shadowWalls.filter((standing) => walls[standing.wall]?.region !== region),
+    creatures: state.creatures.filter(
+      (creature) => !areas.some((area) => inArea(area, creature.home)),
+    ),
+  };
+}
+
 /** The policy blocks of the journal: the solved cases' blocks, in the order they were solved. */
 export function policyBlocks(
   solved: readonly SolvedCase[],
```

- [x] **Step 4: The step,** in `update.ts`:

```diff
diff --git a/src/game/update.ts b/src/game/update.ts
index 31b83cc..aa00b75 100644
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -1,6 +1,6 @@
 import type { TileMap } from '../engine/tiled';
 import { followPlayer } from './camera';
-import { answeredCase, progressOf, solve } from './cases';
+import { answeredCase, clearRegion, progressOf, solve } from './cases';
 import { figuresFrom, figuresOf } from './cast';
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
 import { openHelp, stepHelp } from './help';
@@ -71,7 +71,8 @@ export function createInitialState(map: TileMap): GameState {
  * the step is the help's and nothing else, and a press of `help` opens it over whatever is there
  * — an open journal and an open dialogue too (0021). With the journal open the step is the
  * journal's and nothing else (0020). With a dialogue open the step is the dialogue's and nothing
- * else; the step that closes the source's answer of a ready case solves the case (0024). A press of `journal` opens the journal instead of an ordinary
+ * else; the step that closes the source's answer of a ready case solves the case (0024) and
+ * removes the region's standing shadow walls and the creatures at home in it (0025). A press of `journal` opens the journal instead of an ordinary
  * step, before a press of `talk` is looked at (0020); a press of `talk` near a speaker — a
  * standing figure or a colleague — in reach and in sight opens a dialogue instead of an
  * ordinary step (0017, 0018). Otherwise: the lamp is on when the input holds
@@ -105,10 +106,13 @@ export function update(state: GameState, input: GameInput, content: TileMap): Ga
   const speakers = speakersOf(figuresOf(content.points), state.movers, routes, undefined, progress);
   if (state.dialogue !== null) {
     const stepped = stepDialogue(state, state.dialogue, input, speakers);
-    // The step that closes the source's answer solves its case (0024).
+    // The step that closes the source's answer solves its case (0024), and what is left of the
+    // region's shadow goes with it (0025).
     const answered =
       stepped.dialogue === null ? answeredCase(state.dialogue, state, routes, progress) : null;
-    return answered === null ? stepped : solve(stepped, answered.region);
+    return answered === null
+      ? stepped
+      : clearRegion(solve(stepped, answered.region), answered.region, content);
   }
   const journal = openJournal(state, input);
   if (journal !== null) {
```

- [x] **Step 5: Run** the three files again — green, the tests of 0024 unchanged — and
  `npx vitest run tests/unit/journal.test.ts`: the digest of 0020 passes as recorded
  (criterion 11). Then `npm run check`: 1202 unit tests.

- [x] **Step 6: Commit** — `Take the region's wall and creatures with the solved case`. Body:
  a cleared room has no shadow left in it; the creatures at home in it leave without being
  captured, and the one of the corridor stays because its home is in no region.

---

### Task 5: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/visual.md`,
  `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md`

The diffs are against `main` at `702a0e6`. If a line has moved, put the text where the diff
means it; do not change the words without a reason.

- [x] **Step 1: `gameplay.md`** §3 and §6:

```diff
diff --git a/docs/spec/gameplay.md b/docs/spec/gameplay.md
index ecb76ee..2915c11 100644
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -74,6 +74,12 @@ Combat matters but is never the whole answer. Every piece of shadow belongs to o
    browser window — and then the lamp.
 3. **The source** of a case gives way only to the conversation with the person behind it.
 
+**As built** (feature 0025): when a case is solved, what is left of its region's shadow goes
+with it. The creatures whose home is in the region and that were not captured leave the game
+in that step — they are not captured, and the journal does not count them — and so does the
+region's shadow wall if it still stands. A creature whose home is outside the region stays,
+wherever it is at that moment: the snippet of the east corridor is still there after Sales.
+
 ## 4. Overview
 
 Health is called **overview**. Hits from creatures take it. At zero the player is in the dark and
@@ -134,9 +140,15 @@ says the everyday line. With all five found, a talk is the gesture: the colleagu
 honestly in two pages, and the hero says nothing. There is no key, no screen and no picture for
 the gesture. The press that closes the answer solves the case: the journal gains the outcome
 and the policy block, a notice says so for two seconds, and overview grows by one. Afterwards
-the colleague says something else, every time. The region does not clear yet, and no further
-colleague sees the shadow (0025, M6). Picking a creature from the journal comes with the second
-species (M6).
+the colleague says something else, every time. Picking a creature from the journal comes with
+the second species (M6).
+
+**As built** (feature 0025): the solved case clears its region for good. In the frame after
+the press the room is in its colours again, and the violet veil over it thins out in three
+parts over two seconds and is gone (`visual.md` §4). The game goes on while it happens. A
+region is cleared exactly when its case is solved; nothing else is stored about it. More
+colleagues who see the shadow, as a rule of the game, come with M6, and the first act has no
+end card: it ends in the cleared room, and the game goes on.
 
 ## 7. The journal
 
```

- [x] **Step 2: `world.md`** §1 and §4:

```diff
diff --git a/docs/spec/world.md b/docs/spec/world.md
index 528e8c4..a5c8ec1 100644
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -122,6 +122,11 @@ room are not. The corridors, the side passage, the lift, the stairwell and the d
 officer's office are no regions and have no area. Lifting the shadow wall of a doorway does not
 change the room behind it: the wall was the door, not the shadow.
 
+**As built** (feature 0025): a region whose case is solved is **cleared**, for good. Its cells
+are no longer under shadow, whatever its density in the table: the density stays what gates the
+region, and the solved case is what takes the shadow off it. Sales is the first cleared region;
+every other region with a density above 0 stays under shadow until its case is solved.
+
 | Area | Cells | Density |
 |---|---|---|
 | `region:hr` | (1, 1)–(21, 19) | 2 |
@@ -212,7 +217,10 @@ Species names, looks and behaviours are defined in the feature spec that introdu
 
 **The snippet** (*Schnipsel*, feature 0008) is the species of the Sales case: a scrap of paper
 with lines of text, because it feeds on text pasted into a public chatbot. Small, layer 1. Three
-stand on the floor: one in the east corridor in front of the Sales doorway, two in Sales. Its displayed name is *Schnipsel*, in English
+stand on the floor: one in the east corridor in front of the Sales doorway, two in Sales. The
+two of Sales have their home in the region's area and leave the game when the case of Sales is
+solved, captured or not; the one of the corridor has its home in no region and stays (feature
+0025). Its displayed name is *Schnipsel*, in English
 *Snippet*, and its journal text is fixed with feature 0020: what it is, what it lives on, and
 that it goes as soon as everyone knows which data may go where. The name is a dictionary word
 for a scrap of paper, used for a species and not for a product, a company or a tool; it is fixed
```

- [x] **Step 3: `visual.md`** §4:

```diff
diff --git a/docs/spec/visual.md b/docs/spec/visual.md
index d2b4ee9..852db1c 100644
--- a/docs/spec/visual.md
+++ b/docs/spec/visual.md
@@ -101,7 +101,7 @@ The colour of a transparent pixel is not checked. The palette is data in
 for nothing else in the world; the asset test rejects it in every PNG under `public/` except the
 shadow assets, a list in the test: `sprites/snippet.png` (feature 0008),
 `sprites/shadow-wall.png` (feature 0014), `sprites/trace.png` (feature 0022) and
-`sprites/shadow-veil.png` (feature 0023).
+`sprites/shadow-veil.png` (features 0023 and 0025).
 Every trace of shadow AI glows in
 it. The player learns in seconds what to look for, without a word of text. Because colour alone
 excludes colour-blind players, the signature colour is always accompanied by **form and
@@ -143,8 +143,18 @@ else: the cone, the shadow walls, the traces, the people, the dogs, the machines
 and the player keep their colours and get no veil, and `above` is drawn grey without one. So a
 person in a room under shadow stands out in colour against a floor that has none. The form
 beside the colour is the grey itself and the dithering of the veil, whose density tells the
-regions apart. The reception, the break room and the corridors are not under shadow. A region
-that clears and gets its colours back comes with feature 0025.
+regions apart. The reception, the break room and the corridors are not under shadow.
+
+*As built* (feature 0025). A region whose case is solved is cleared: from the frame after the
+solving step its cells are drawn from the tileset, in their colours, on all three layers. The
+veil stays a moment longer and thins out over `CLEAR_STEPS`, 120 steps or two seconds, *tune*,
+in three parts of 40 steps: first the veil of the region's density as before, then a veil of 16
+pixels a cell, then one of 8, then none. So the room does not fade: it comes clear. The colours
+come at once and the dots go in three steps. The veil's sheet has two more frames for it, after
+the three of the densities: frame 3 holds the pixels where x and y, counted in the frame, are
+both multiples of 4, and frame 4 those of them where x + y is a multiple of 8. Both are in the
+signature colour, repeat every 8 px and join without a seam. A cleared room looks like the
+reception: colours, no dots.
 
 ## 5. Assets
 
```

- [x] **Step 4: `architecture.md`** §1, §2, §5, §6 and §7:

```diff
diff --git a/docs/spec/architecture.md b/docs/spec/architecture.md
index cb3f051..3a54d46 100644
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -26,9 +26,10 @@ src/
                  rectangle a map holds, by the prefix of the name; game/trace.ts the traces,
                  their light test, their step and the entries of the cases tab (0022);
                  game/help.ts the help's step and when the start hint is due (0021);
-                 game/region.ts the areas of the regions and the veil of a cell (0023);
-                 game/cases.ts the cases, when one is ready, what its source says, and the
-                 step that solves it (0024)
+                 game/region.ts the areas of the regions and the veil of a cell (0023), the
+                 cleared regions and the veil of a clearing (0025);
+                 game/cases.ts the cases, when one is ready, what its source says, the
+                 step that solves it (0024) and what goes with the region's shadow (0025)
   render/        the Renderer interface and its Canvas 2D implementation; scaling and letterbox;
                  the draw order of a frame (draw-scene); render/font.ts the glyph order and the
                  cell size of the font, render/draw-text.ts text by TextKey, line by line
@@ -64,8 +65,8 @@ tools/
                         orientations of eight looks (0014)
   placeholder-trace.ts  the placeholder trace sheet: three 16x16 frames, a checkerboard in
                         the signature colour in a growing square (0022)
-  placeholder-veil.ts   the placeholder veil sheet: three 16x16 frames in the signature
-                        colour, one per density (0023)
+  placeholder-veil.ts   the placeholder veil sheet: five 16x16 frames in the signature
+                        colour, one per density (0023) and two of a clearing (0025)
   placeholder-font.ts   the placeholder font: 108 glyphs of 6x10 drawn as pictures, and the
                         sheet as pure pixel data (0016)
   floor-layout.ts       the floor as pure data: the corridors and rooms, the walls and their
@@ -240,6 +241,11 @@ trace of its region and every one of them is found (`isReady`), and solved when
 in `solved` (`isSolved`). Both read the **progress** of the cases, `progressOf(state, map)`: the
 state's `traces`, the map's traces and `solved`, derived on every call and kept nowhere.
 
+A region is **cleared** when it is in `solved` (feature 0025, `game/region`): `clearedAt(region,
+solved)` is the `at` of its entry, or `null`. The state has no field for it. Whether a cell is
+under shadow, which veil it shows and how far a clearing has come are derived from `solved`,
+`tick` and the map's areas on every call (§5, §6).
+
 `figures` is an array of `{ figure, facing }`, one entry per standing figure of the map, in file
 order (feature 0017, `game/cast`). `figure` is the index of the figure among
 `figuresOf(map.points)`; its place stays in the map and its pages in the cast, and neither is in
@@ -295,9 +301,15 @@ on the last page, sets `dialogue` to `null`; nothing else changes — not the pl
 creatures, the movers, the walls or the traces — and a press of `journal` does nothing. The
 step whose press closes the source's answer of a ready case that is not solved **solves** it
 (`answeredCase`, `solve`, feature 0024): besides the above it adds `{ region, at }` with the
-step's `tick` to `solved`, and sets `overview` to `{ current: max + 1, max: max + 1 }`. It changes
-`tick`, `held`, `dialogue`, `solved` and `overview` and nothing else; no other step solves a
-case, and a solved case is not solved again. **Ordinary:** otherwise, a press of `journal` opens the journal on `creatures`, whatever else
+step's `tick` to `solved`, and sets `overview` to `{ current: max + 1, max: max + 1 }`. The same
+step takes what is left of the region's shadow with it (`clearRegion`, feature 0025): every
+entry of `shadowWalls` whose wall belongs to the region leaves the list, as a lifted wall does,
+and every creature whose `home` lies in an area of the region (`inArea`: inside the rectangle,
+the left and the upper edge included) leaves `creatures`, wherever it is; `captured` does not
+change, and a creature at home outside the region stays. The step changes
+`tick`, `held`, `dialogue`, `solved`, `overview`, `shadowWalls` and `creatures` and nothing
+else; no other step solves a case, and a solved case is not solved again. The wake brings back
+only the creatures still in `creatures`, so none that left this way. **Ordinary:** otherwise, a press of `journal` opens the journal on `creatures`, whatever else
 the input holds: `tick` grows by 1, `held` is set, and nothing else changes in this step — a
 figure in mid-step, a push and a lamp that is on stay as they are and go on when it closes
 (`openJournal`). This comes before a press of `talk` is looked at. Otherwise a press of `talk` while the input does not
@@ -423,7 +435,8 @@ sprite round the same value.
 `frameWidth × frameHeight` in one row; the figure's are 16x24, the lamp's 48x48 — with its
 top-left corner at (x, y), from the decoded image like `drawTile`, smoothing off.
 `render/draw-scene` holds the draw order of a frame: clear, then `ground`, `detail`, the veil
-over the cells under shadow (feature 0023), the lamp's cone when the lamp is on, the standing shadow walls in array order (feature 0014), the traces
+over the cells under shadow (feature 0023) and over those of a region that is clearing (feature
+0025), the lamp's cone when the lamp is on, the standing shadow walls in array order (feature 0014), the traces
 the light is on in array order (feature 0022), the ground movers whose feet y is at most the player's in array order, the standing figures whose feet y is
 at most the player's (feature 0017), the creatures in array order, the player, the other
 standing figures, the other ground movers in array order, `above` (§6), the drones (feature
@@ -462,6 +475,18 @@ creatures, the player, `above` — is drawn as before, so the people keep their
 room and `above` gets no veil. A map without areas passes no shadow to `drawLayer` and draws no
 veil: it is drawn exactly as before.
 
+The cleared region (feature 0025). The veil sheet has five frames, and the scene asks two
+questions per cell. Which tileset: `drawLayer` gets `veilOf` on `shadowedAreas(areas, solved)`,
+the areas of the regions that are not cleared, so a cell of a cleared region is drawn from the
+tileset from the frame after the solving step. Which veil: `drawVeil` gets
+`shownVeil(areas, solved, tick, column, row)` and draws, as before, the frame veil − 1. Over a
+cell under shadow that is the veil of its density, 1 to 3. Over a cell of a region cleared e =
+`tick` − `at` steps ago it is `clearingVeil(density, e)`: the density for e below 40, 4 for e
+below 80, 5 for e below 120 (`CLEAR_STEPS`), and 0 — no veil — from then on; the veils 4 and 5
+are the frames 3 and 4 of the sheet. Where a cleared area and one under shadow overlap, the
+shadow counts; of two clearing areas, the first in the file. A region without shadow has no
+veil at any time.
+
 The traces (feature 0022) lie on their devices like the walls on the floor, under every figure.
 A trace with `light` L above 0 is drawn with frame ⌊(L − 1) / 20⌋ of the trace sheet — 0, 1 or
 2, small, larger, largest (`traceFrame`, `TRACE_LOOKS` 3) — with its top-left corner at
@@ -732,7 +757,8 @@ the game before it starts; the state keeps nothing of the areas. A map without s
 has no areas, and a region without an area on a map is simply not on it. `veilOf(areas, column,
 row)` is the veil of a cell: the density of the area it lies in, the largest where areas
 overlap, 0 for a cell in no area or only in areas of density 0. A cell with a veil above 0 is
-under shadow. No coordinate of an area is in `src/` (INV-7); `tools/floor-layout.ts` builds the
+under shadow — asked of the areas that are not cleared, `shadowedAreas(areas, solved)` (feature
+0025, §5): the areas of a region whose case is solved drop out of it. No coordinate of an area is in `src/` (INV-7); `tools/floor-layout.ts` builds the
 floor's ten, `REGION_AREAS`, from its rooms, each with its upper and its left wall (`areaBox`).
 
 Flipped and rotated tiles, more than one tileset per map, embedded tilesets, encoded or
@@ -927,13 +953,16 @@ generator pixel by pixel. The art pass replaces it under the same name and frame
 | 6 | giving way, second third | `#68386c` where i + j is even and i mod 4 is 0 or 1 — 16 |
 | 7 | giving way, last third | `#68386c` where (i + j) mod 8 = 0 — 8 |
 
-`tools/placeholder-veil.ts` draws the veil sheet (feature 0023) and returns its pixels as data:
-`public/sprites/shadow-veil.png`, 48x16, three 16x16 frames in one row, frame d − 1 the veil of
-density d. Every opaque pixel is the signature colour `#68386c`; with (i, j) counted in the
+`tools/placeholder-veil.ts` draws the veil sheet (features 0023 and 0025) and returns its pixels
+as data: `public/sprites/shadow-veil.png`, 80x16, five 16x16 frames in one row, frame d − 1 the
+veil of density d and frames 3 and 4 the two thin veils of a clearing. Every opaque pixel is the signature colour `#68386c`; with (i, j) counted in the
 frame, frame 0 holds the pixels where i and j are both multiples of 4 or both 2 more than one —
 32; frame 1 those where i + j is a multiple of 4 — 64; frame 2 those where i + j is even — 128.
 Each pattern repeats every 4 px, so the frames join without a seam from cell to cell, and every
-pixel of a frame is in the next. It is the fourth shadow asset (`visual.md` §4). `npm run
+pixel of a frame is in the next. Frame 3 holds the pixels where i and j are both multiples of
+4 — 16; frame 4 those of them where i + j is a multiple of 8 — 8. These two repeat every 8 px,
+and every pixel of frame 4 is in frame 3, and every one of that in frame 0. It is the fourth
+shadow asset (`visual.md` §4). `npm run
 gen-sprites` writes it beside the others; it is committed, deterministic and tested against the
 generator pixel by pixel. The art pass replaces it under the same name and frame order.
 
```

- [x] **Step 5: `testing.md`** §2, the rows of INV-1 and INV-6:

```diff
diff --git a/docs/spec/testing.md b/docs/spec/testing.md
index 4129a6e..017aa21 100644
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -19,12 +19,12 @@ All four run in CI on every pull request (`ops.md` §4). Red blocks the merge.
 
 | Invariant | Test |
 |---|---|
-| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); the initial state and one with the help open (0021) |
+| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); the initial state and one with the help open (0021) |
 | INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/`, and on the type `Language` there — the game does not know the language (0019) |
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
 | INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
 | INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
-| INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet (0023) —, the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
+| INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet with its five frames (0023, 0025) —, the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
 | INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
 
 A change to the state's shape is held against a recording: 600 steps on the floor with walking,
```

- [x] **Step 6: `README.md`:**

```diff
diff --git a/README.md b/README.md
index 9907e39..e1293b7 100644
--- a/README.md
+++ b/README.md
@@ -44,7 +44,9 @@ the screens of Sales, and the journal counts them on its cases tab (feature 0022
 under shadow are drawn darker, without colour and under a violet veil whose density is the
 region's (feature 0023). With all five traces found, the colleague of Sales answers honestly,
 the case is solved, the journal records its outcome and the first block of the policy, and
-overview grows by one (feature 0024). The roadmap is in [docs/plan.md](docs/plan.md).
+overview grows by one (feature 0024). In the same moment the room gets its colours back, its
+veil thins out over two seconds, and its shadow wall and the snippets that were left in it are
+gone (feature 0025). The roadmap is in [docs/plan.md](docs/plan.md).
 
 ## Run it
 
```

- [x] **Step 7:** `npm run check`, then commit — `Move the cleared region into the spec`.

---

### Task 6: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green; the smoke spec is unchanged:
  15 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 6 in this file and commit —
  `Tick the full check of 0025`.

---

### Task 7: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk.
  Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–16 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself. Two things the steps do not mention are no findings
  of this walk: the line `Der Fall ist gelöst. Sieh ins Journal.` at the bottom for two
  seconds after step 5 (0024), and the hint of the help in the first ten seconds (0021).
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 6, and start again at step 1.
- [ ] **Step 4:** after step 16 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–16`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0025`. A feel note that wants something
  else — the colour last, another length, a creature seen going — becomes a new draft, not a
  change on this branch.

---

### Task 8: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 6. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M5 section, say that 0025 is
  implemented too; leave what the sentence says about 0026 and 0027 as it is on that day.
  Commit — `Mark 0025 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0025: the cleared region`, with the walk's result and feel notes in its
  description, and one line that the branch also carries the drafts of 0027, 0028 and 0029
  with their rows in the plan. CI must be green. The author merges.
