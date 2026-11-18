# 0028 — Implementation plan: the case of Marketing

**Spec:** [`docs/features/0028-the-case-of-marketing.md`](../features/0028-the-case-of-marketing.md)
(approved 2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/world.md` §2 and §3, `docs/spec/gameplay.md`
§6 and §7, `docs/spec/architecture.md` §6 and §7 and `docs/spec/testing.md` §5. **Written:**
2026-11-18 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0027 is merged into `main` (`69f04d4` or later). The branch
`feature/0028-the-case-of-marketing` exists, cut from that `main`, and holds this plan. Work
on it; merge the latest `main` into it before Task 1. The spec of 0029 is on `main`; it is
approved, has no plan yet, and is **not** built here.

**Goal:** Marketing has five traces — on four screens and on the printer — and is the second
case: with all five found the colleague in the red shirt answers, and the press that closes
the answer solves the case by the rules of the first.

**Approach:** three code tasks, each green on its own. The words (T1). The traces: the
region's name for the journal and the five rectangles of the floor (T2) — after it the lamp
finds them and the journal counts them, and nothing follows from it yet. The case: the second
entry of `CASES` (T3) — after it the colleague answers and the case is solved. The order is
forced by two older tests: every trace of the floor needs a name for its region (0022), and
every case needs traces on the floor (0024). Then the documents (T4), the full check with
the container (T5), the walk (T6) and the pull request (T7).

**This feature is content.** It adds data and no rule: one entry to `CASES`, one to
`REGION_NAME`, five to `TRACES`, six keys to each language table. No function of `src/game/`
and nothing in `src/render/` changes. The one piece of code is in the generator
(`tools/floor-layout.ts`): it writes the new rectangles at the end of the file, so that no
object of an earlier feature changes its id. If a step seems to need a change to a rule,
stop and ask.

**How this plan was checked:** the code and the tests of Tasks 1 to 3 were run once as a
prototype on 2026-11-18, on the source of `main` at `69f04d4`, and then replayed task by task,
each task's tests before its code: they failed as the steps say, and after each of the three
tasks typecheck and Biome were clean and the unit tests green — 1330, 1341 and 1358 tests
(1329 before). `npm run gen-floor` gave the prototype's `floor.tmj` byte for byte, and its
diff to the file before is 56 lines added and one changed, `nextobjectid`. The diffs of this
file, applied in order to a clean tree, gave the prototype's files. `npm run check` with the
build passed on the whole prototype, and the smoke spec passed twice against a dev server of
it: 17 passed, 3 skipped; its changed test was run once before the code of Task 2 and failed
with five traces. The prototype was thrown away; nothing of it is on the branch. If a step
does not behave as written, the cause is a difference to that state — stop and look; do not
bend a test. The game was **not** played in a browser — that is the walk — and the container
was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `GameState` gets no field. On the floor `traces` has ten entries instead of five;
  `solved` may hold two cases, in the order they were solved.
- INV-4: the six strings live in `src/text/de.ts` and `src/text/en.ts`; `cases.ts` and
  `journal.ts` hold keys.
- INV-7: no coordinate of a trace is in `src/`. The floor's ten are `TRACES` in
  `tools/floor-layout.ts`; `public/maps/floor.tmj` is written by `npm run gen-floor` and
  never edited by hand. No tile changes, no new sprite.
- **No object of an earlier feature changes.** The objects 1 to 123 of the floor keep their
  id, their name and their place. A test of Task 2 holds them to a SHA-256 digest recorded
  from the generator before this feature, `958d049dff30dc32…`; it is never recorded again.
  The new rectangles have the ids 124 to 128, and `nextobjectid` is 129.
- **The order of the traces.** The traces of Sales keep their indices 0 to 4 in the state;
  those of Marketing are 5 to 9. `FIRST_TRACES`, 5, is how many traces the generator writes
  before the areas, where 0022 put them; every later one goes to the end of the file.
- The two recorded digests of 600 steps (`RECORDED` in `tests/unit/journal.test.ts` and in
  `tests/unit/help.test.ts`) pass as they are — that is criterion 12; never record them
  again.
- **Older tests that change, and no other.** Six tests of `tests/unit/floor.test.ts` counted
  the objects or the traces of the floor: 123 objects become 128, `nextobjectid` 124 becomes
  129, five traces become ten, the five of Sales are the *first* five, and the rests are no
  longer the last objects of the file. One test of `tests/unit/state.test.ts` and one of the
  smoke spec expected five traces at the start. Two tests of `tests/unit/cases.test.ts`
  change in Task 3: the case of Sales is the first of the list, not the whole list, and the
  colleague of Marketing is no bystander any more. The tasks show each change.
- No creature is at home in Marketing: its species comes with its own feature. Solving the
  case removes the room's shadow wall and no creature.
- No Harmonic station is built here (`gameplay.md` §10): none is in the spec of this
  feature.
- The texts name no brand and no person (`CLAUDE.md` §2).
- A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: the five cells (6, 62), (15, 62), (41, 62), (5, 70)
  and (27, 78), their rectangles (96, 992), (240, 992), (656, 992), (80, 1120) and
  (432, 1248), each 16x16, ids 124 to 128, `nextobjectid` 129; ten traces at the start; the
  source `person:marketing`; overview six of six after one case and seven of seven after two;
  the second entry of the cases tab 36 px below the first, the second block of the policy at
  (16, 96).

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | six keys: `region.marketing`, `talk.marketing-source-1`, `talk.marketing-source-2`, `talk.marketing-after`, `case.marketing-outcome`, `policy.marketing` |
| `src/game/journal.ts` | `REGION_NAME.marketing` |
| `src/game/cases.ts` | the second entry of `CASES` |
| `tools/floor-layout.ts` | five entries of `TRACES`; `FIRST_TRACES`; the later traces written at the end |
| `public/maps/floor.tmj` | regenerated |
| `tests/unit/text.test.ts`, `floor.test.ts`, `state.test.ts`, `draw-journal.test.ts`, `cases.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 4 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `region.marketing`, `talk.marketing-source-1`,
  `talk.marketing-source-2`, `talk.marketing-after`, `case.marketing-outcome` and
  `policy.marketing`, in both languages.

- [x] **Step 1: Write the failing test:**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -227,6 +227,59 @@
     ]);
   });
 
+  it('holds the words of the case of Marketing in both languages (0028)', () => {
+    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
+      textOf(textKey(id), language).split('\n');
+    expect(lines('region.marketing', 'de')).toStrictEqual(['Marketing']);
+    expect(lines('region.marketing', 'en')).toStrictEqual(['Marketing']);
+    expect(lines('talk.marketing-source-1', 'de')).toStrictEqual([
+      'Die Motive macht ein Bildgenerator – in zehn',
+      'Minuten statt in zwei Tagen, und die Agentur',
+      'haben wir uns gespart.',
+    ]);
+    expect(lines('talk.marketing-source-1', 'en')).toStrictEqual([
+      'An image generator makes the visuals – in ten',
+      'minutes instead of two days, and we saved',
+      'the agency.',
+    ]);
+    expect(lines('talk.marketing-source-2', 'de')).toStrictEqual([
+      'Dass fremde Logos und Gesichter darin stecken,',
+      'habe ich erst auf dem Plakat gesehen.',
+      'Geprüft hat das vor dem Druck niemand.',
+    ]);
+    expect(lines('talk.marketing-source-2', 'en')).toStrictEqual([
+      'That other logos and faces are in them,',
+      'I only saw on the poster.',
+      'Nobody checked it before it went to print.',
+    ]);
+    expect(lines('talk.marketing-after', 'de')).toStrictEqual([
+      'Danke. Ab jetzt schaut jemand drauf, bevor',
+      'etwas rausgeht – und sei es nur jemand vom',
+      'Nachbartisch.',
+    ]);
+    expect(lines('talk.marketing-after', 'en')).toStrictEqual([
+      'Thanks. From now on somebody looks at it',
+      'before it goes out – even if it is only',
+      'somebody at the next desk.',
+    ]);
+    expect(lines('case.marketing-outcome', 'de')).toStrictEqual([
+      'Gelöst: Bilder gingen ungeprüft raus.',
+    ]);
+    expect(lines('case.marketing-outcome', 'en')).toStrictEqual([
+      'Solved: images went out unchecked.',
+    ]);
+    expect(lines('policy.marketing', 'de')).toStrictEqual([
+      'Was eine Maschine erzeugt hat, sieht sich',
+      'ein Mensch an, bevor es das Haus verlässt.',
+      'Bild oder Text – lieber einmal zu viel.',
+    ]);
+    expect(lines('policy.marketing', 'en')).toStrictEqual([
+      'What a machine has made, a person looks at',
+      'before it leaves the house.',
+      'Image or text – rather once too often.',
+    ]);
+  });
+
   it('holds every text of the journal to the rule of its kind (0020, 0022, 0024)', () => {
     /** The most lines and the most characters per line a key may have, by what its id starts or ends with. */
     const rules: readonly (readonly [(id: string) => boolean, number, number, number])[] = [
```

- [x] **Step 2: Run it** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 1 of 23
  tests. `npx tsc --noEmit` reports twelve errors, all in this test: the six ids are not ids
  of the table yet.

- [x] **Step 3: The words,** in both tables:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -32,6 +32,7 @@
   'journal.traces': 'Spuren:',
   'journal.of': 'von',
   'region.sales': 'Vertrieb',
+  'region.marketing': 'Marketing',
   'creature.snippet-name': 'Schnipsel',
   'creature.snippet-text': [
     'Ein Stück Text, das jemand in einen',
@@ -107,6 +108,27 @@
     'unsicher ist, fragt – ohne Ärger.',
   ].join('\n'),
   'notice.case-solved': 'Der Fall ist gelöst. Sieh ins Journal.',
+  'talk.marketing-source-1': [
+    'Die Motive macht ein Bildgenerator – in zehn',
+    'Minuten statt in zwei Tagen, und die Agentur',
+    'haben wir uns gespart.',
+  ].join('\n'),
+  'talk.marketing-source-2': [
+    'Dass fremde Logos und Gesichter darin stecken,',
+    'habe ich erst auf dem Plakat gesehen.',
+    'Geprüft hat das vor dem Druck niemand.',
+  ].join('\n'),
+  'talk.marketing-after': [
+    'Danke. Ab jetzt schaut jemand drauf, bevor',
+    'etwas rausgeht – und sei es nur jemand vom',
+    'Nachbartisch.',
+  ].join('\n'),
+  'case.marketing-outcome': 'Gelöst: Bilder gingen ungeprüft raus.',
+  'policy.marketing': [
+    'Was eine Maschine erzeugt hat, sieht sich',
+    'ein Mensch an, bevor es das Haus verlässt.',
+    'Bild oder Text – lieber einmal zu viel.',
+  ].join('\n'),
   'talk.sales-everyday': [
     'Drei Angebote bis heute Abend, und jedes soll',
     'klingen, als hätte ich eine Woche Zeit gehabt.',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -29,6 +29,7 @@
   'journal.traces': 'Traces:',
   'journal.of': 'of',
   'region.sales': 'Sales',
+  'region.marketing': 'Marketing',
   'creature.snippet-name': 'Snippet',
   'creature.snippet-text': [
     'A piece of text somebody pasted into a public',
@@ -103,6 +104,27 @@
     'asks – without trouble.',
   ].join('\n'),
   'notice.case-solved': 'The case is solved. See the journal.',
+  'talk.marketing-source-1': [
+    'An image generator makes the visuals – in ten',
+    'minutes instead of two days, and we saved',
+    'the agency.',
+  ].join('\n'),
+  'talk.marketing-source-2': [
+    'That other logos and faces are in them,',
+    'I only saw on the poster.',
+    'Nobody checked it before it went to print.',
+  ].join('\n'),
+  'talk.marketing-after': [
+    'Thanks. From now on somebody looks at it',
+    'before it goes out – even if it is only',
+    'somebody at the next desk.',
+  ].join('\n'),
+  'case.marketing-outcome': 'Solved: images went out unchecked.',
+  'policy.marketing': [
+    'What a machine has made, a person looks at',
+    'before it leaves the house.',
+    'Image or text – rather once too often.',
+  ].join('\n'),
   'talk.sales-everyday': [
     'Three offers by tonight, and each one should',
     'sound as if I had had a week for it.',
```

- [x] **Step 4: Run** `npx vitest run tests/unit/text.test.ts` — green. The tests that hold
  every key to the rule of its kind — a region's name, a case's outcome, a policy block, a
  page of talk — cover the six without a change. Then `npm run check`: 1330 unit tests.

- [x] **Step 5: Commit** — `Add the words of the case of Marketing`.

---

### Task 2: The traces of Marketing

**Files:**
- Modify: `src/game/journal.ts`, `tools/floor-layout.ts`, `public/maps/floor.tmj`
  (generated)
- Test: `tests/unit/floor.test.ts`, `tests/unit/state.test.ts`,
  `tests/unit/draw-journal.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `region.marketing` (Task 1).
- Produces:
  - `REGION_NAME.marketing` in `game/journal`
  - `TRACES` with ten entries, `FIRST_TRACES = 5` in `tools/floor-layout.ts`
  - `floor.tmj` with the rectangles 124 to 128, `trace:marketing`, after the rests

- [x] **Step 1: Write the failing tests.** In `tests/unit/floor.test.ts` six older tests
  change their numbers, as the global constraints say, and one block is new, at the end:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -1,3 +1,4 @@
+import { createHash } from 'node:crypto';
 import { readFileSync } from 'node:fs';
 import { join } from 'node:path';
 import { fileURLToPath } from 'node:url';
@@ -23,6 +24,7 @@
   CLOSED_DOORS,
   CORRIDORS,
   FIGURES,
+  FIRST_TRACES,
   FLOOR_HEIGHT,
   FLOOR_WIDTH,
   FURNITURE,
@@ -497,9 +499,9 @@
     ]);
     const json = floorJson();
     expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
-      Array.from({ length: 123 }, (_, i) => i + 1),
+      Array.from({ length: 128 }, (_, i) => i + 1),
     );
-    expect(json.nextobjectid).toBe(124);
+    expect(json.nextobjectid).toBe(129);
   });
 
   it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
@@ -1206,12 +1208,13 @@
   ];
   const traces = tracesOf(floor.rects);
 
-  it('are five, all of Sales, on the cells of the spec', () => {
-    expect(traces).toStrictEqual(TABLE.map(([region, , , box]) => ({ region, box })));
-    expect(TRACES.map((trace) => [trace.region, trace.cell.x, trace.cell.y])).toStrictEqual(
-      TABLE.map(([region, column, row]) => [region, column, row]),
-    );
-    expect(TRACES.map((trace) => traceBox(trace.cell))).toStrictEqual(
+  it('are five, all of Sales, on the cells of the spec: the first five of the floor', () => {
+    // The five of Marketing follow them (0028).
+    expect(traces.slice(0, 5)).toStrictEqual(TABLE.map(([region, , , box]) => ({ region, box })));
+    expect(
+      TRACES.slice(0, 5).map((trace) => [trace.region, trace.cell.x, trace.cell.y]),
+    ).toStrictEqual(TABLE.map(([region, column, row]) => [region, column, row]));
+    expect(TRACES.slice(0, 5).map((trace) => traceBox(trace.cell))).toStrictEqual(
       TABLE.map(([, , , box]) => box),
     );
   });
@@ -1295,7 +1298,8 @@
     for (const { region } of traces) {
       expect(REGION_NAME[region], region).toBeDefined();
     }
-    expect(createInitialState(floor).traces).toHaveLength(5);
+    // Five of Sales and, since 0028, five of Marketing.
+    expect(createInitialState(floor).traces).toHaveLength(10);
   });
 });
 
@@ -1366,7 +1370,8 @@
 
   it('leave the walls and the traces as they were', () => {
     expect(wallsOf(floor.rects)).toHaveLength(8);
-    expect(tracesOf(floor.rects)).toHaveLength(5);
+    // The five of 0022; the five of 0028 came later.
+    expect(tracesOf(floor.rects)).toHaveLength(10);
     expect(floor.points).toHaveLength(91);
   });
 
@@ -1537,20 +1542,19 @@
     );
   });
 
-  it('are the last eight objects of the file, rectangles with the ids 116 to 123', () => {
+  it('are eight rectangles with the ids 116 to 123, after the areas and before the traces of 0028', () => {
     const objects = floorJson().layers[3].objects;
-    expect(objects).toHaveLength(123);
-    expect(objects.slice(115).map((object) => [object.id, object.name])).toStrictEqual(
+    expect(objects.slice(115, 123).map((object) => [object.id, object.name])).toStrictEqual(
       TABLE.map((_row, i) => [116 + i, 'rest:coffee']),
     );
-    expect(objects.slice(115).some((object) => 'point' in object)).toBe(false);
-    expect(floorJson().nextobjectid).toBe(124);
-    expect(floor.rects).toHaveLength(31);
+    expect(objects.slice(115, 123).some((object) => 'point' in object)).toBe(false);
+    expect(floor.rects.slice(23, 31).every((rect) => rect.name === 'rest:coffee')).toBe(true);
   });
 
   it('leave the objects of 0023 and before as they were', () => {
     expect(wallsOf(floor.rects)).toHaveLength(8);
-    expect(tracesOf(floor.rects)).toHaveLength(5);
+    // The five of 0022; the five of 0028 came later.
+    expect(tracesOf(floor.rects)).toHaveLength(10);
     expect(areas).toHaveLength(10);
     expect(floor.points).toHaveLength(91);
   });
@@ -1605,6 +1609,146 @@
     if (sales !== undefined) {
       expect(restUnderShadow(sales, floor.rects, [])).toBe(true);
       expect(restUnderShadow(sales, floor.rects, [{ region: 'sales', at: 1005 }])).toBe(false);
+    }
+  });
+});
+
+describe('the traces of Marketing on the floor (0028)', () => {
+  /** Cell, box and the tile of the device, in file order: the spec's table. */
+  const TABLE: readonly (readonly [number, number, Box, number])[] = [
+    [6, 62, { x: 96, y: 992, width: 16, height: 16 }, DESK_MONITOR],
+    [15, 62, { x: 240, y: 992, width: 16, height: 16 }, DESK_MONITOR],
+    [41, 62, { x: 656, y: 992, width: 16, height: 16 }, DESK_MONITOR],
+    [5, 70, { x: 80, y: 1120, width: 16, height: 16 }, DESK_MONITOR],
+    [27, 78, { x: 432, y: 1248, width: 16, height: 16 }, PRINTER],
+  ];
+  const traces = tracesOf(floor.rects);
+  const start = createInitialState(floor);
+  /** The state with the traces of the given indices found. */
+  const found = (...indices: readonly number[]): GameState => ({
+    ...start,
+    traces: start.traces.map((trace, i) => (indices.includes(i) ? { ...trace, found: 1 } : trace)),
+  });
+
+  it('are five, on the cells of the spec, after the five of Sales', () => {
+    expect(FIRST_TRACES).toBe(5);
+    expect(traces).toHaveLength(10);
+    expect(traces.slice(0, 5).every((trace) => trace.region === 'sales')).toBe(true);
+    expect(traces.slice(5)).toStrictEqual(TABLE.map(([, , box]) => ({ region: 'marketing', box })));
+    expect(TRACES.slice(5)).toStrictEqual(
+      TABLE.map(([x, y]) => ({ region: 'marketing', cell: { x, y } })),
+    );
+  });
+
+  it('are the last five objects of the file, rectangles with the ids 124 to 128', () => {
+    const objects = floorJson().layers[3].objects;
+    expect(objects).toHaveLength(128);
+    expect(objects.slice(123).map((object) => [object.id, object.name])).toStrictEqual(
+      [124, 125, 126, 127, 128].map((id) => [id, 'trace:marketing']),
+    );
+    expect(objects.slice(123).some((object) => 'point' in object)).toBe(false);
+    expect(floorJson().nextobjectid).toBe(129);
+    expect(floor.rects).toHaveLength(36);
+    expect(floor.points).toHaveLength(91);
+  });
+
+  it('leave the 123 objects of 0027 and before exactly as they were', () => {
+    // SHA-256 over the first 123 objects, recorded from the generator before this feature.
+    const before = JSON.stringify(floorJson().layers[3].objects.slice(0, 123));
+    expect(createHash('sha256').update(before).digest('hex')).toBe(
+      '958d049dff30dc32799e5239794ad7c18aabafe0f9f81d984eb503b392a14cbb',
+    );
+  });
+
+  it('lie in the area of Marketing, four on a desk with a screen and one on the printer', () => {
+    const marketing = areasOf(floor.rects).filter((area) => area.region === 'marketing');
+    expect(marketing).toHaveLength(1);
+    const mine = traces.filter((trace) => trace.region === 'marketing');
+    expect(mine).toHaveLength(5);
+    for (const [i, { box }] of mine.entries()) {
+      const column = box.x / 16;
+      const row = box.y / 16;
+      expect(
+        marketing.some((area) => inArea(area, { x: box.x, y: box.y })),
+        `(${column}, ${row})`,
+      ).toBe(true);
+      expect(floor.detail[cell(column, row)], `(${column}, ${row})`).toBe(TABLE[i]?.[3]);
+      // The cell above the device is free: the player stands there.
+      expect(floor.detail[cell(column, row - 1)], `(${column}, ${row - 1})`).toBe(EMPTY);
     }
   });
+
+  it('are in the light of a player who looks down from any place on the cell above', () => {
+    for (const [column, row] of TABLE) {
+      const trace = traces.find(
+        (candidate) => candidate.box.x === column * 16 && candidate.box.y === row * 16,
+      );
+      let places = 0;
+      for (let x = column * 16; x <= column * 16 + 16; x += 2) {
+        for (let y = (row - 1) * 16 + 2; y <= row * 16; y += 2) {
+          if (!reached({ x, y })) {
+            continue;
+          }
+          places += 1;
+          const player = {
+            x,
+            y,
+            facing: 'down',
+            frame: 0,
+            frameTimer: 0,
+            grace: 0,
+            recoil: NO_RECOIL,
+          } as const;
+          expect(
+            trace !== undefined && traceInLight(trace, player, true, floor),
+            `(${column}, ${row}) from (${x}, ${y})`,
+          ).toBe(true);
+        }
+      }
+      expect(places, `(${column}, ${row})`).toBe(72);
+    }
+  });
+
+  it('leave twelve of the sixteen screens of Marketing without a trace, and it has one printer', () => {
+    const room = ROOMS.find((candidate) => candidate.name === 'marketing');
+    const { c0, c1, r0, r1 } = room?.cells ?? { c0: 0, c1: -1, r0: 0, r1: -1 };
+    const count = (tile: number): number => {
+      let cells = 0;
+      for (let row = r0; row <= r1; row += 1) {
+        for (let column = c0; column <= c1; column += 1) {
+          cells += floor.detail[cell(column, row)] === tile ? 1 : 0;
+        }
+      }
+      return cells;
+    };
+    expect(count(DESK_MONITOR)).toBe(16);
+    expect(count(PRINTER)).toBe(1);
+  });
+
+  it('start unseen in the state: ten traces, none found, Sales 0 to 4 and Marketing 5 to 9', () => {
+    expect(start.traces).toStrictEqual(
+      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({ trace, light: 0, found: null })),
+    );
+    expect(start.traces.map((state) => traces[state.trace]?.region)).toStrictEqual([
+      ...Array.from({ length: 5 }, () => 'sales'),
+      ...Array.from({ length: 5 }, () => 'marketing'),
+    ]);
+    expect(REGION_NAME.marketing).toBeDefined();
+  });
+
+  it('make Marketing ready exactly when its five are found, whatever is found in Sales', () => {
+    const ready = (state: GameState): boolean[] => [
+      isReady('sales', progressOf(state, floor)),
+      isReady('marketing', progressOf(state, floor)),
+    ];
+    expect(ready(start)).toStrictEqual([false, false]);
+    // Five: those of Sales, or those of Marketing.
+    expect(ready(found(0, 1, 2, 3, 4))).toStrictEqual([true, false]);
+    expect(ready(found(5, 6, 7, 8, 9))).toStrictEqual([false, true]);
+    // Nine: all but one of Marketing, or all but one of Sales.
+    expect(ready(found(0, 1, 2, 3, 4, 5, 6, 7, 8))).toStrictEqual([true, false]);
+    expect(ready(found(1, 2, 3, 4, 5, 6, 7, 8, 9))).toStrictEqual([false, true]);
+    // Ten.
+    expect(ready(found(0, 1, 2, 3, 4, 5, 6, 7, 8, 9))).toStrictEqual([true, true]);
+  });
 });
```

  In `tests/unit/state.test.ts` the start of the floor has ten traces:

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -763,9 +763,9 @@
     return state;
   };
 
-  it('starts on the floor with five traces, unseen and not found', () => {
+  it('starts on the floor with ten traces, unseen and not found (0022, 0028)', () => {
     expect(createInitialState(FLOOR_MAP).traces).toStrictEqual(
-      [0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: null })),
+      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({ trace, light: 0, found: null })),
     );
     expect(createInitialState(MAP).traces).toStrictEqual([]);
   });
```

  In `tests/unit/draw-journal.test.ts` one block is new, at the end:

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -405,3 +405,64 @@
     expect(renderer.calls).toStrictEqual(draw(reading('creatures', 1)).calls);
   });
 });
+
+describe('the cases tab with two regions (0028)', () => {
+  /** Five traces of Sales and five of Marketing, in the order of the floor. */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...CONTENT.map,
+      rects: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
+        name: n < 5 ? 'trace:sales' : 'trace:marketing',
+        x: 16 * n,
+        y: 0,
+        width: 16,
+        height: 16,
+      })),
+    },
+  };
+  /** The traces with those of the given indices found. */
+  const traces = (...found: readonly number[]): TraceState[] =>
+    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({
+      trace,
+      light: 0,
+      found: found.includes(trace) ? 60 : null,
+    }));
+  const cases = (found: readonly number[], settings = GERMAN): string[] => {
+    const renderer = recordingRenderer();
+    const state: GameState = { ...reading('cases'), traces: traces(...found) };
+    drawJournal(renderer, state, { tab: 'cases' }, content, settings);
+    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
+  };
+
+  it('shows Marketing alone, in the first place, while no trace of Sales is found', () => {
+    const entry = cases([5, 6]);
+    // `Marketing` 9 glyphs, `Spuren:` 7, `2`, `von` 3, `5`.
+    expect(entry).toHaveLength(9 + 7 + 1 + 3 + 1);
+    expect(entry[0]).toBe('drawSprite 45 at 16,36');
+    expect(entry[9]).toBe('drawSprite 51 at 16,48');
+    expect(entry[16]).toBe('drawSprite 18 at 64,48');
+    expect(entry[20]).toBe('drawSprite 21 at 100,48');
+  });
+
+  it('shows Sales first and Marketing second, 36 px lower, with a trace of each found', () => {
+    const both = cases([0, 9]);
+    const sales = cases([0]);
+    // The entry of Sales is what it was; the 21 glyphs of Marketing follow it.
+    expect(both.slice(0, sales.length)).toStrictEqual(sales);
+    const marketing = both.slice(sales.length);
+    expect(marketing).toHaveLength(9 + 7 + 1 + 3 + 1);
+    expect(marketing[0]).toBe('drawSprite 45 at 16,72');
+    expect(marketing[9]).toBe('drawSprite 51 at 16,84');
+    expect(marketing[16]).toBe('drawSprite 17 at 64,84');
+  });
+
+  it('reads `Marketing` and `Traces: 5 of 5` in English', () => {
+    const entry = cases([5, 6, 7, 8, 9], ENGLISH);
+    // `Marketing` 9 glyphs, `Traces:` 7, `5`, `of` 2, `5`.
+    expect(entry).toHaveLength(9 + 7 + 1 + 2 + 1);
+    expect(entry[0]).toBe('drawSprite 45 at 16,36');
+    expect(entry[9]).toBe('drawSprite 52 at 16,48');
+    expect(entry[16]).toBe('drawSprite 21 at 64,48');
+  });
+});
```

  In the smoke spec the floor starts with ten traces:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -343,14 +343,16 @@
   await page.keyboard.up('KeyJ');
 });
 
-test('the floor starts with its five traces, none seen and none found', async ({ page }) => {
+test('the floor starts with its ten traces, none seen and none found', async ({ page }) => {
   await start(page);
   // One poll for the whole value: nothing is read from a page that might still be loading.
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.traces), {
-      message: 'window.shadowAi.state.traces holds the five traces of Sales',
+      message: 'window.shadowAi.state.traces holds five traces of Sales and five of Marketing',
     })
-    .toStrictEqual([0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: null })));
+    .toStrictEqual(
+      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({ trace, light: 0, found: null })),
+    );
 });
 
 test('H opens the help, the game stands still under it, and H closes it again', async ({
```

- [x] **Step 2: Run them** —
  `npx vitest run tests/unit/floor.test.ts tests/unit/state.test.ts tests/unit/draw-journal.test.ts`.
  Expected: FAIL, 14 tests: 10 of 93 in `floor.test.ts`, 1 of 74 in `state.test.ts`, 3 of 25
  in `draw-journal.test.ts`. `npx tsc --noEmit` reports one error: `floor-layout.ts` has no
  exported member `FIRST_TRACES`. Four tests of the diff are green already, and that is
  right: the two older tests that now look at a slice — the first five traces, the eight
  rests — hold before and after; the digest over the first 123 objects guards what must not
  change; and the count of the screens of Marketing is a fact of the room, not of this
  feature. Then `npx playwright test -g "ten traces"`. Expected: FAIL, the page holds five
  traces.

- [x] **Step 3: The name of the region:**

```diff
--- a/src/game/journal.ts
+++ b/src/game/journal.ts
@@ -52,6 +52,7 @@
 /** The displayed names of the regions that have traces, by the region's id (0022). */
 export const REGION_NAME: Readonly<Partial<Record<string, TextKey>>> = {
   sales: textKey('region.sales'),
+  marketing: textKey('region.marketing'),
 };
 
 /** The entries of the creatures tab: every species captured at least once, in SPECIES order. */
```

- [x] **Step 4: The layout.** Five entries of `TRACES`, `FIRST_TRACES`, and the generator
  writes the later traces after the rests:

```diff
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -216,9 +216,11 @@
 ];
 
 /**
- * The traces (0022): per trace its region and the cell of the device it lies on. Five in
+ * The traces (0022, 0028): per trace its region and the cell of the device it lies on. Five in
  * Sales, each on the desk with a screen of a cubicle, spread over the room with at least one
- * in every row of cubicles. The order is the order in the file.
+ * in every row of cubicles. Five in Marketing: four on a screen of a desk island, three in the
+ * upper row and one in the lower, and one on the printer at the lower wall. The order is the
+ * order in the file.
  */
 export const TRACES: readonly { readonly region: string; readonly cell: Point }[] = [
   { region: 'sales', cell: { x: 83, y: 28 } },
@@ -226,9 +228,21 @@
   { region: 'sales', cell: { x: 93, y: 34 } },
   { region: 'sales', cell: { x: 88, y: 40 } },
   { region: 'sales', cell: { x: 98, y: 46 } },
+  { region: 'marketing', cell: { x: 6, y: 62 } },
+  { region: 'marketing', cell: { x: 15, y: 62 } },
+  { region: 'marketing', cell: { x: 41, y: 62 } },
+  { region: 'marketing', cell: { x: 5, y: 70 } },
+  { region: 'marketing', cell: { x: 27, y: 78 } },
 ];
 
 /**
+ * How many traces stand before the areas in the file: the five of 0022. Every later trace is
+ * written at the end of the file, so that no object of an earlier feature changes its id
+ * (0028).
+ */
+export const FIRST_TRACES = 5;
+
+/**
  * The areas of the regions (0023): which room of the layout belongs to which region of the
  * world data. The meeting rooms are one region with two rooms. The corridors, the lift, the
  * stairwell and the data protection officer's office are no regions.
@@ -1191,8 +1205,10 @@
   const firstWall = SNIPPETS.length + 3 + routes.length;
   const firstFigure = firstWall + SHADOW_WALLS.length;
   const firstTrace = firstFigure + FIGURES.length;
-  const firstArea = firstTrace + TRACES.length;
+  const firstArea = firstTrace + FIRST_TRACES;
   const firstRest = firstArea + REGION_AREAS.length;
+  const firstLaterTrace = firstRest + RESTS.length;
+  const laterTraces = TRACES.slice(FIRST_TRACES);
   return {
     compressionlevel: -1,
     height: FLOOR_HEIGHT,
@@ -1218,7 +1234,7 @@
           ...FIGURES.map((figure, i) =>
             pointObject(firstFigure + i, `figure:${figure.id}`, figure.at),
           ),
-          ...TRACES.map((trace, i) =>
+          ...TRACES.slice(0, FIRST_TRACES).map((trace, i) =>
             rectObject(firstTrace + i, `trace:${trace.region}`, traceBox(trace.cell)),
           ),
           ...REGION_AREAS.map((area, i) =>
@@ -1227,6 +1243,9 @@
           ...RESTS.map((rest, i) =>
             rectObject(firstRest + i, `rest:${rest.what}`, traceBox(rest.cell)),
           ),
+          ...laterTraces.map((trace, i) =>
+            rectObject(firstLaterTrace + i, `trace:${trace.region}`, traceBox(trace.cell)),
+          ),
         ],
         opacity: 1,
         type: 'objectgroup',
@@ -1236,7 +1255,7 @@
       },
     ],
     nextlayerid: 5,
-    nextobjectid: firstRest + RESTS.length,
+    nextobjectid: firstLaterTrace + laterTraces.length,
     orientation: 'orthogonal',
     renderorder: 'right-down',
     tiledversion: '1.11.2',
```

- [x] **Step 5: Regenerate the floor** — `npm run gen-floor`. Then
  `shasum -a 256 public/maps/floor.tmj` gives
  `767e4b60108e95d1d2aa7b21520af7b97e68c68b2fdb1f7452ece09337f3883f`, and
  `git diff --stat public/maps/floor.tmj` says 56 insertions and 1 deletion: five rectangles
  at the end of the `objects` layer and `nextobjectid`. If the diff touches anything else,
  stop.

- [x] **Step 6: Run** the three test files of Step 2 — green — then `npm run check`: 1341
  unit tests, and `npm run test:e2e`: 17 passed, 3 skipped.

- [x] **Step 7: Commit** — `Lay five traces in Marketing`. Body: the new rectangles are
  written at the end of the file, so that no object of an earlier feature changes its id.

---

### Task 3: The case

**Files:**
- Modify: `src/game/cases.ts`
- Test: `tests/unit/cases.test.ts`, `tests/unit/floor.test.ts`,
  `tests/unit/draw-journal.test.ts`

**Interfaces:**
- Consumes: the five text ids of the case (Task 1); the traces of Marketing on the floor and
  `REGION_NAME.marketing` (Task 2).
- Produces: `CASES[1]`, the case of Marketing: `region` `'marketing'`, `source`
  `'person:marketing'`, `answer` of two pages, `after` of one, `outcome`, `policy`.

- [x] **Step 1: Write the failing tests.** In `tests/unit/cases.test.ts` two older tests
  change — the case of Sales is the first entry, and the colleague of Marketing leaves the
  list of bystanders — and one block is new, at the end:

```diff
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -60,17 +60,15 @@
 const READY: GameState = { ...withTraces(10, 20), tick: T0 };
 
 describe('the cases (0024)', () => {
-  it('holds the case of Sales: its source, its answer, its afterwards, its outcome, its block', () => {
-    expect(CASES).toStrictEqual([
-      {
-        region: 'sales',
-        source: 'person:sales',
-        answer: ANSWER,
-        after: AFTER,
-        outcome: textKey('case.sales-outcome'),
-        policy: textKey('policy.sales'),
-      },
-    ]);
+  it('holds the case of Sales first: its source, its answer, its afterwards, its outcome, its block', () => {
+    expect(CASES[0]).toStrictEqual({
+      region: 'sales',
+      source: 'person:sales',
+      answer: ANSWER,
+      after: AFTER,
+      outcome: textKey('case.sales-outcome'),
+      policy: textKey('policy.sales'),
+    });
     expect(CASE_OVERVIEW).toBe(1);
   });
 });
@@ -144,7 +142,8 @@
   it('stays the everyday line of everyone who is no source, in all three states', () => {
     const lines = [textKey('talk.reception-everyday')];
     for (const progress of [at(null), at(10), at(10, true)]) {
-      for (const route of ['person:reception', 'person:marketing', 'person:support']) {
+      // The colleague of Marketing is a source since 0028.
+      for (const route of ['person:reception', 'person:support']) {
         expect(pagesIn(progress, route, lines)).toBe(lines);
       }
     }
@@ -439,5 +438,122 @@
     const before = JSON.stringify(start);
     clearRegion(start, 'sales', ROOMS);
     expect(JSON.stringify(start)).toBe(before);
+  });
+});
+
+describe('the case of Marketing (0028)', () => {
+  const SALES_EVERYDAY = [textKey('talk.sales-everyday')];
+  const MARKETING_EVERYDAY = [textKey('talk.marketing-everyday')];
+  const MARKETING_ANSWER = [textKey('talk.marketing-source-1'), textKey('talk.marketing-source-2')];
+  const MARKETING_AFTER = [textKey('talk.marketing-after')];
+  /** Both sources, each waiting ten seconds on its first point, 96 px apart. */
+  const SOURCES: readonly NamedPoint[] = [
+    { name: 'person:sales:1', x: 64, y: 48, pause: 600 },
+    { name: 'person:sales:2', x: 128, y: 48 },
+    { name: 'person:marketing:1', x: 64, y: 144, pause: 600 },
+    { name: 'person:marketing:2', x: 128, y: 144 },
+  ];
+  const rect = (name: string, x: number, y: number): NamedRect => ({
+    name,
+    x,
+    y,
+    width: 16,
+    height: 16,
+  });
+  /** 20x12 cells of open floor: two traces of Sales, then two of Marketing. */
+  const BOTH: TileMap = grassMap(20, 12, { x: 104, y: 48 }, SOURCES, [
+    rect('trace:sales', 240, 32),
+    rect('trace:sales', 272, 32),
+    rect('trace:marketing', 240, 128),
+    rect('trace:marketing', 272, 128),
+  ]);
+  /** The start of BOTH at step 1000 with its four traces found, or not, as given. */
+  const having = (...ticks: readonly (number | null)[]): GameState => ({
+    ...createInitialState(BOTH),
+    tick: T0,
+    traces: found(...ticks),
+  });
+  /** The figure 40 px right of the colleague of Sales, or of the colleague of Marketing. */
+  const beside = (state: GameState, source: 'sales' | 'marketing'): GameState => ({
+    ...state,
+    player: { ...state.player, x: 104, y: source === 'sales' ? 48 : 144 },
+  });
+  const step = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
+    inputs.reduce((state, input) => update(state, input, BOTH), start);
+  /** Three presses of talk: the answer opens, turns to its second page and closes. */
+  const answer = (start: GameState): GameState => step(start, TALK, NONE, TALK, NONE, TALK, NONE);
+  const said = (state: GameState) =>
+    state.dialogue === null
+      ? null
+      : speakerOf(
+          state.dialogue,
+          speakersOf([], state.movers, routesOf(BOTH.points), undefined, progressOf(state, BOTH)),
+        )?.pages;
+
+  it('is the second case, after Sales: its source, its answer, its afterwards, its outcome, its block', () => {
+    expect(CASES).toHaveLength(2);
+    expect(CASES.map((entry) => entry.region)).toStrictEqual(['sales', 'marketing']);
+    expect(CASES[1]).toStrictEqual({
+      region: 'marketing',
+      source: 'person:marketing',
+      answer: MARKETING_ANSWER,
+      after: MARKETING_AFTER,
+      outcome: textKey('case.marketing-outcome'),
+      policy: textKey('policy.marketing'),
+    });
   });
+
+  it('gives each source its answer only when its own case is ready', () => {
+    const marketing = having(null, null, 10, 20);
+    expect(said(step(beside(marketing, 'marketing'), TALK))).toStrictEqual(MARKETING_ANSWER);
+    expect(said(step(beside(marketing, 'sales'), TALK))).toStrictEqual(SALES_EVERYDAY);
+    const sales = having(10, 20, null, null);
+    expect(said(step(beside(sales, 'marketing'), TALK))).toStrictEqual(MARKETING_EVERYDAY);
+    expect(said(step(beside(sales, 'sales'), TALK))).toStrictEqual(ANSWER);
+    // One trace of Marketing is missing: the everyday line, whatever is found in Sales.
+    const almost = having(10, 20, 30, null);
+    expect(said(step(beside(almost, 'marketing'), TALK))).toStrictEqual(MARKETING_EVERYDAY);
+  });
+
+  it('says "afterwards" once its case is solved, and Sales still its everyday line', () => {
+    const solved = answer(beside(having(null, null, 10, 20), 'marketing'));
+    expect(said(step(solved, TALK))).toStrictEqual(MARKETING_AFTER);
+    expect(said(step(beside(solved, 'sales'), TALK))).toStrictEqual(SALES_EVERYDAY);
+  });
+
+  it('is solved first when the player solves it first: six of six, then seven of seven', () => {
+    const first = answer(beside(having(10, 20, 30, 40), 'marketing'));
+    expect(first.solved).toStrictEqual([{ region: 'marketing', at: T0 + 5 }]);
+    expect(first.overview).toStrictEqual({ current: 6, max: 6 });
+    const second = answer(beside(first, 'sales'));
+    expect(second.solved).toStrictEqual([
+      { region: 'marketing', at: T0 + 5 },
+      { region: 'sales', at: T0 + 11 },
+    ]);
+    expect(second.overview).toStrictEqual({ current: 7, max: 7 });
+  });
+
+  it('is solved second when Sales is solved first', () => {
+    const first = answer(beside(having(10, 20, 30, 40), 'sales'));
+    expect(first.solved).toStrictEqual([{ region: 'sales', at: T0 + 5 }]);
+    const second = answer(beside(first, 'marketing'));
+    expect(second.solved.map((entry) => entry.region)).toStrictEqual(['sales', 'marketing']);
+    expect(second.overview).toStrictEqual({ current: 7, max: 7 });
+  });
+
+  it('gives the journal its outcome and its block, the blocks in the order they were solved', () => {
+    const marketing = [{ region: 'marketing', at: 5 }];
+    expect(outcomeOf('marketing', [])).toBeNull();
+    expect(outcomeOf('marketing', marketing)).toBe(textKey('case.marketing-outcome'));
+    expect(outcomeOf('sales', marketing)).toBeNull();
+    expect(policyBlocks(marketing)).toStrictEqual([textKey('policy.marketing')]);
+    expect(policyBlocks([...marketing, { region: 'sales', at: 9 }])).toStrictEqual([
+      textKey('policy.marketing'),
+      textKey('policy.sales'),
+    ]);
+    expect(policyBlocks([{ region: 'sales', at: 5 }, ...marketing])).toStrictEqual([
+      textKey('policy.sales'),
+      textKey('policy.marketing'),
+    ]);
+  });
 });
```

  In `tests/unit/floor.test.ts` one block is new, at the end:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -1752,3 +1752,86 @@
     expect(ready(found(0, 1, 2, 3, 4, 5, 6, 7, 8, 9))).toStrictEqual([true, true]);
   });
 });
+
+describe('the case of Marketing on the floor (0028)', () => {
+  const TALK: GameInput = { ...NO_INPUT, talk: true };
+  const areas = areasOf(floor.rects);
+  const walls = wallsOf(floor.rects);
+  const routes = routesOf(floor.points);
+  const start = createInitialState(floor);
+  const sourceOf = (route: string) =>
+    start.movers.find((mover) => routes[mover.route]?.name === route);
+  /** The figure 24 px below the colleague of the given route, where it stands at the start. */
+  const beside = (state: GameState, route: string): GameState => ({
+    ...state,
+    player: {
+      ...state.player,
+      x: sourceOf(route)?.x ?? 0,
+      y: (sourceOf(route)?.y ?? 0) + 24,
+    },
+  });
+  /** Every trace of the floor found long ago. */
+  const ready: GameState = {
+    ...start,
+    tick: 1000,
+    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+  };
+  const answer = (from: GameState): GameState =>
+    [TALK, NO_INPUT, TALK, NO_INPUT, TALK, NO_INPUT].reduce(
+      (state, input) => update(state, input, floor),
+      from,
+    );
+  const regionsOf = (state: GameState): (string | undefined)[] =>
+    state.shadowWalls.map((standing) => walls[standing.wall]?.region);
+  const marketing = answer(beside(ready, 'person:marketing'));
+
+  it('has a source that stands free at the start, with room 24 px below it', () => {
+    expect(sourceOf('person:marketing')).toBeDefined();
+    expect(reached(beside(ready, 'person:marketing').player)).toBe(true);
+  });
+
+  it('is solved from beside its source, before Sales: six of six', () => {
+    expect(marketing.solved).toStrictEqual([{ region: 'marketing', at: 1005 }]);
+    expect(marketing.overview).toStrictEqual({ current: 6, max: 6 });
+  });
+
+  it('takes the shadow from the cells of Marketing and leaves it on Sales', () => {
+    const cleared = shadowedAreas(areas, marketing.solved);
+    expect(veilOf(areas, 10, 70)).toBe(1);
+    expect(veilOf(cleared, 10, 70)).toBe(0);
+    expect(veilOf(cleared, 90, 30)).toBe(1);
+    expect([veilOf(cleared, 100, 70), veilOf(cleared, 5, 5)]).toStrictEqual([1, 2]);
+  });
+
+  it('removes the shadow wall of Marketing, and no other and no creature', () => {
+    expect(regionsOf(ready).filter((region) => region === 'marketing')).toHaveLength(1);
+    expect(regionsOf(marketing)).not.toContain('marketing');
+    expect(regionsOf(marketing)).toContain('sales');
+    expect(marketing.shadowWalls).toHaveLength(ready.shadowWalls.length - 1);
+    // No creature is at home in Marketing yet: its species comes with its own feature.
+    expect(marketing.creatures).toStrictEqual(ready.creatures);
+  });
+
+  it('is followed by Sales: both solved in that order, seven of seven, both rooms clear', () => {
+    const both = answer(beside(marketing, 'person:sales'));
+    expect(both.solved).toStrictEqual([
+      { region: 'marketing', at: 1005 },
+      { region: 'sales', at: 1011 },
+    ]);
+    expect(both.overview).toStrictEqual({ current: 7, max: 7 });
+    const cleared = shadowedAreas(areas, both.solved);
+    expect([veilOf(cleared, 10, 70), veilOf(cleared, 90, 30)]).toStrictEqual([0, 0]);
+    expect(
+      regionsOf(both).filter((region) => region === 'sales' || region === 'marketing'),
+    ).toStrictEqual([]);
+  });
+
+  it('gives the machine of Marketing its use once Marketing is solved', () => {
+    const machine = restsOf(floor.rects)[6];
+    expect(machine).toBeDefined();
+    if (machine !== undefined) {
+      expect(restUnderShadow(machine, floor.rects, [])).toBe(true);
+      expect(restUnderShadow(machine, floor.rects, marketing.solved)).toBe(false);
+    }
+  });
+});
```

  In `tests/unit/draw-journal.test.ts` one block is new, at the end:

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -463,6 +463,100 @@
     expect(entry).toHaveLength(9 + 7 + 1 + 2 + 1);
     expect(entry[0]).toBe('drawSprite 45 at 16,36');
     expect(entry[9]).toBe('drawSprite 52 at 16,48');
+    expect(entry[16]).toBe('drawSprite 21 at 64,48');
+  });
+});
+
+describe('two solved cases in the journal (0028)', () => {
+  /** Five traces of Sales and five of Marketing, in the order of the floor. */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...CONTENT.map,
+      rects: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
+        name: n < 5 ? 'trace:sales' : 'trace:marketing',
+        x: 16 * n,
+        y: 0,
+        width: 16,
+        height: 16,
+      })),
+    },
+  };
+  const MARKETING = { region: 'marketing', at: 900 };
+  const SALES = { region: 'sales', at: 950 };
+  const shown = (
+    tab: JournalTab,
+    found: readonly number[],
+    solved: GameState['solved'],
+    settings = GERMAN,
+  ): string[] => {
+    const renderer = recordingRenderer();
+    const state: GameState = {
+      ...reading(tab),
+      traces: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({
+        trace,
+        light: 0,
+        found: found.includes(trace) ? 60 : null,
+      })),
+      solved,
+    };
+    drawJournal(renderer, state, { tab }, content, settings);
+    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
+  };
+  const ALL_OF_MARKETING = [5, 6, 7, 8, 9];
+
+  it('shows Marketing alone with its count and its outcome when only Marketing is solved', () => {
+    const entry = shown('cases', ALL_OF_MARKETING, [MARKETING]);
+    // `Marketing` 9, `Spuren: 5 von 5` 12, `Gelöst: Bilder gingen ungeprüft raus.` 33 glyphs.
+    expect(entry).toHaveLength(9 + 12 + 33);
+    expect(entry[0]).toBe('drawSprite 45 at 16,36');
+    expect(entry[9]).toBe('drawSprite 51 at 16,48');
     expect(entry[16]).toBe('drawSprite 21 at 64,48');
+    expect(entry[21]).toBe('drawSprite 39 at 16,60');
   });
+
+  it('shows Sales first and Marketing 36 px lower with one trace of Sales found too', () => {
+    const entries = shown('cases', [0, ...ALL_OF_MARKETING], [MARKETING]);
+    // `Vertrieb` 8 and `Spuren: 1 von 5` 12 glyphs, and no outcome: Sales is not solved.
+    expect(entries).toHaveLength(8 + 12 + 9 + 12 + 33);
+    expect(entries[0]).toBe('drawSprite 54 at 16,36');
+    expect(entries.slice(0, 20).some((call) => call.endsWith(',60'))).toBe(false);
+    expect(entries[20]).toBe('drawSprite 45 at 16,72');
+    expect(entries[29]).toBe('drawSprite 51 at 16,84');
+    expect(entries[41]).toBe('drawSprite 39 at 16,96');
+  });
+
+  it('draws the block of the case solved first from (16, 36) and the other from (16, 96)', () => {
+    const all = [0, 1, 2, 3, 4, ...ALL_OF_MARKETING];
+    // `Was eine Maschine …`: three lines of 35, 36 and 31 glyphs; `Jeder Text …`: 142.
+    const marketingFirst = shown('policy', all, [MARKETING, SALES]);
+    expect(marketingFirst).toHaveLength(102 + 142);
+    expect(marketingFirst[0]).toBe('drawSprite 55 at 16,36');
+    expect(marketingFirst[102]).toBe('drawSprite 42 at 16,96');
+    expect(marketingFirst.slice(0, 102).every((call) => /,(36|48|60)$/.test(call))).toBe(true);
+    expect(marketingFirst.slice(102).every((call) => /,(96|108|120|132)$/.test(call))).toBe(true);
+    const salesFirst = shown('policy', all, [
+      { region: 'sales', at: 900 },
+      { region: 'marketing', at: 950 },
+    ]);
+    expect(salesFirst).toHaveLength(142 + 102);
+    expect(salesFirst[0]).toBe('drawSprite 42 at 16,36');
+    expect(salesFirst[142]).toBe('drawSprite 55 at 16,96');
+  });
+
+  it('draws the block of Marketing alone from (16, 36) when only Marketing is solved', () => {
+    const block = shown('policy', ALL_OF_MARKETING, [MARKETING]);
+    expect(block).toHaveLength(102);
+    expect(block[0]).toBe('drawSprite 55 at 16,36');
+  });
+
+  it('draws both tabs in English with the language `en`', () => {
+    // `Solved: images went out unchecked.`: 30 glyphs; `What a machine …` and `Every text …`.
+    const cases = shown('cases', ALL_OF_MARKETING, [MARKETING], ENGLISH);
+    expect(cases).toHaveLength(9 + 11 + 30);
+    expect(cases[20]).toBe('drawSprite 51 at 16,60');
+    const blocks = shown('policy', ALL_OF_MARKETING, [MARKETING, SALES], ENGLISH);
+    expect(blocks[0]).toBe('drawSprite 55 at 16,36');
+    expect(blocks).toContain('drawSprite 37 at 16,96');
+  });
 });
```

- [x] **Step 2: Run them** —
  `npx vitest run tests/unit/cases.test.ts tests/unit/floor.test.ts tests/unit/draw-journal.test.ts`.
  Expected: FAIL, 16 tests: 6 of 41 in `cases.test.ts`, 5 of 99 in `floor.test.ts`, 5 of 30
  in `draw-journal.test.ts`. `npx tsc --noEmit` is clean. Three tests of the diff are green
  already: the two older tests of `cases.test.ts`, which hold before and after, and
  `has a source that stands free at the start, with room 24 px below it`, which checks what
  the other tests of its block stand on.

- [x] **Step 3: The case:**

```diff
--- a/src/game/cases.ts
+++ b/src/game/cases.ts
@@ -7,11 +7,11 @@
 import { type Trace, tracesOf } from './trace';
 
 /**
- * The cases (gameplay.md §6, world.md §2, feature 0024). A case belongs to a region and has a
- * source: the colleague where the data flow begins. When every trace of the region is found,
- * the case is ready, and the source no longer says its everyday line: shown what the lamp
- * found, it answers honestly. The step that closes that answer solves the case. Nobody gets
- * into trouble. Pure data and pure functions.
+ * The cases (gameplay.md §6, world.md §2, features 0024 and 0028). A case belongs to a region
+ * and has a source: the colleague where the data flow begins. When every trace of the region
+ * is found, the case is ready, and the source no longer says its everyday line: shown what
+ * the lamp found, it answers honestly. The step that closes that answer solves the case.
+ * Nobody gets into trouble. Pure data and pure functions.
  */
 
 export interface Case {
@@ -37,6 +37,14 @@
     outcome: textKey('case.sales-outcome'),
     policy: textKey('policy.sales'),
   },
+  {
+    region: 'marketing',
+    source: 'person:marketing',
+    answer: [textKey('talk.marketing-source-1'), textKey('talk.marketing-source-2')],
+    after: [textKey('talk.marketing-after')],
+    outcome: textKey('case.marketing-outcome'),
+    policy: textKey('policy.marketing'),
+  },
 ];
 
 /** Solving a case raises the maximum of overview by this much, and fills it. */
```

- [x] **Step 4: Run** the three test files of Step 2 — green. The test of 0024 that asks
  every case for a source on the floor, lines, traces and a name for its region covers the
  new case without a change. Then `npm run check`: 1358 unit tests, the two recorded digests
  among them, unchanged.

- [x] **Step 5: Commit** — `Make Marketing the second case`. Body: the case uses the rules of
  the first without a change; the two cases do not depend on each other.

---

### Task 4: The documents

**Files:**
- Modify: `docs/spec/world.md`, `docs/spec/gameplay.md`, `docs/spec/architecture.md`,
  `docs/spec/testing.md`, `README.md`

The diffs are against `main` at `69f04d4`. If a line has moved, put the text where the diff
means it; do not change the words without a reason. `architecture.md` is not in the spec's
list of documents; it is changed all the same, in four places, because it would say
something false otherwise: that the floor has five traces, and that `nextobjectid` follows
the traces of 0022.

- [x] **Step 1: `world.md`** §2 and §3:

```diff
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -172,6 +172,18 @@
 five traces are found. Its policy block, in the words of `docs/features/0024-the-case-of-sales.md`:
 every text has a level — open, internal or confidential; confidential text stays in tools we
 have approved; whoever is unsure asks, without trouble.
+
+**Traces of Marketing** (feature 0028): five traces lie on four of the sixteen screens of the
+desk islands of Marketing — three in the upper row, one in the lower — and on the printer at
+the room's lower wall. The table of `docs/features/0028-the-case-of-marketing.md` is the
+placement until the art pass.
+
+**The case of Marketing** (feature 0028): the second case, by the rules of the first. An image
+generator makes the visuals, other companies' logos and faces are in them, and nobody looked
+before they went to print. Its policy block, in the words of
+`docs/features/0028-the-case-of-marketing.md`: what a machine has made, a person looks at
+before it leaves the house — image or text, rather once too often. The two cases do not depend
+on each other: the player may solve Marketing before Sales.
 
 **Order and gating.** Marketing and Support are open from the start (thin shadow). HR and
 Accounting open after the first upgrade, Development after the second. Management is last: without
@@ -211,6 +223,8 @@
   Since feature 0024 the colleague of Sales is the source of the first case. What the colleague
   says follows from the case: the everyday line while a trace is missing, the honest answer
   once all five are found, and the line afterwards once the case is solved.
+  Since feature 0028 the colleague of Marketing — the one in the red shirt, with the printer —
+  is the source of the second case, by the same rule.
 - **The managing director.** The last case. In the first act a sentence of the call (feature
   0026); a figure with the map of Management (M6).
 - **The customer.** A voice on the phone at the start — one sentence of the call (feature 0026).
```

- [x] **Step 2: `gameplay.md`** §6 and §7:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -139,7 +139,8 @@
 alternative):
 
 1. Traces found in the region are shadow residue on devices, visible in the lamp's light; each
-   goes into the journal. *As built* (feature 0022): the five traces of Sales.
+   goes into the journal. *As built* (feature 0022): the five traces of Sales; (feature 0028)
+   the five of Marketing.
 2. Conversations in the department and the break room lead to the source — the person where the
    data flow begins.
 3. At the source the player **shows a matching trace** from the journal. It is a gesture, not an
@@ -166,6 +167,15 @@
 colleagues who see the shadow, as a rule of the game, come with M6, and the first act has no
 end card: it ends in the cleared room, and the game goes on.
 
+**As built** (feature 0028): the case of Marketing, by the same rules and with nothing added
+to them. Its source is the colleague in the red shirt who walks between the desk islands and
+the printer. Its five traces lie on four screens and on the printer. With all five found the
+colleague answers in two pages, and the press that closes the answer solves the case and
+clears the room: overview grows by one again, to seven with both cases solved. The two cases
+do not depend on each other: Marketing is open from the start, and the player may solve it
+before Sales. What a case of Act 2 has more than the first — its species, the upgrade it
+earns, the vendor — comes with features of their own.
+
 ## 7. The journal
 
 The only screen besides the game itself, and the only inventory. One screen, three tabs, nothing
@@ -203,6 +213,11 @@
 each; until a case is solved it shows its line for nothing. Two blocks fit the screen; pages
 within the tab come with the third (M6).
 
+**As built** (feature 0028): with two cases the cases tab shows two entries, the second 36 px
+below the first, in the order of the world data — Sales, then Marketing — whichever was
+solved first. The policy tab shows the two blocks in the order they were solved, the second
+60 px below the first.
+
 **As built** (feature 0026): the journal does not open while the call is read, like under any
 dialogue. After it, J opens it with or without the lamp.
 
```

- [x] **Step 3: `architecture.md`** §6, §7 and §8:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -802,7 +802,7 @@
 not in the world data (`trace trace:cellar names no region`) and a box that is not one cell
 (`trace trace:sales (1330, 448, 16, 16) is not one cell`). A map without such rectangles has no
 traces. No coordinate of a trace is in `src/` (INV-7); `tools/floor-layout.ts` names the cells
-of the floor's five, `TRACES`.
+of the floor's ten, `TRACES`: five of Sales (feature 0022) and five of Marketing (feature 0028).
 
 **Areas of the regions** (feature 0023). A rectangle named `region:<id>` is an area of a region
 of the world data: whole cells, its corner on the grid, its width and its height multiples of 16
@@ -1071,7 +1071,10 @@
 edge of a column — and the walls become rectangle objects after the route points, ids following
 theirs (92–99 today). The standing figure's point follows them (100), and the traces (feature
 0022) are `TRACES`, per trace its region and the cell of its device; `traceBox` makes the cell's
-box, and they become rectangle objects after the figure's point, ids 101–105, `nextobjectid` 106.
+box. The first five (`FIRST_TRACES`), those of 0022, become rectangle objects after the figure's
+point, ids 101–105. Every later trace is written at the end of the file, after the areas and
+the rests, so that no object of an earlier feature changes its id: the five of Marketing
+(feature 0028) have the ids 124–128, and `nextobjectid` is 129.
 `floor.tmj` has the layers `ground` (id 1), `detail` (id 3), `above` (id 4) and `objects` (id 2),
 in that order. Posts are
 derived, not listed: a cell with no strip whose left neighbour has a top strip and whose upper
@@ -1095,7 +1098,10 @@
 the id 100 after the rectangles, its box free of every solid box, reached from the spawn, in the
 view of the wake point, and no route leg within 24 px of it; and the traces of 0022 against
 the spec's table — each on a desk with a screen in Sales, its chair on the cell below, and in the
-light of a player who looks up from every reached place on the cell below that chair. The file's whitespace is not Tiled's; a save in Tiled reformats it and fails that
+light of a player who looks up from every reached place on the cell below that chair; and the
+traces of 0028 against theirs — each in the area of Marketing, on a desk with a screen or on
+the printer, and in the light of a player who looks down from every reached place on the cell
+above — with the 123 objects before them held to a recorded digest. The file's whitespace is not Tiled's; a save in Tiled reformats it and fails that
 test, so until the art pass the layout changes in `floor-layout.ts`. When the art pass takes the
 floor over by hand (`visual.md` §5), the layout, the generator and the determinism test are
 removed and `floor.tmj` is authored in Tiled like every other map; the layout test's
@@ -1167,7 +1173,8 @@
 to four lines of at most 47 and no empty line. The source's answer and what it says afterwards
 are pages of the kind `talk`, `talk.<region>-source-<n>` and `talk.<region>-after`, under the
 rule of a page; `notice.case-solved` is a notice. `game/cases` names them by key in `CASES`,
-and the rule test covers both new kinds in both languages.
+and the rule test covers both new kinds in both languages. The case of Marketing (feature
+0028) adds six keys — `region.marketing` and five of these — and no kind.
 
 The story (feature 0026) adds the kind `story`: `story.<scene>-<n>` is a page of a scene, under
 the rule of a page of talk — at most three lines of at most 47 characters, none empty — and the
```

- [x] **Step 4: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -25,7 +25,7 @@
 | INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
 | INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
 | INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet with its five frames (0023, 0025) —, the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
-| INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); `game/rest` refuses a rest that is not one cell, with its message, and a test holds the floor's eight rests to its coffee machines, none without a rest (0027); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
+| INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); `game/rest` refuses a rest that is not one cell, with its message, and a test holds the floor's eight rests to its coffee machines, none without a rest (0027); a test holds the floor's five traces of Marketing to the spec's table — each in the area of Marketing, on a desk with a screen or on the printer, and in the light from every reached place on the cell above — and the 123 objects of the floor before them to a recorded SHA-256 digest, so that no object of an earlier feature changes (0028); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
 
 A change to the state's shape is held against a recording: 600 steps on the floor with walking,
 a word with the colleague behind the counter and the lamp, whose SHA-256 digest was taken with
@@ -33,7 +33,8 @@
 0021: 600 steps on the floor with walking, a word with the colleague, the lamp and the journal
 opened, turned to the cases and closed, whose digest was taken with the code before the help was
 added. The digests are never changed; a test that fails on one found a world that steps
-differently.
+differently. A feature that only adds content leaves both as they are: with the second case
+(0028) a state in which no trace of Marketing is found steps as before.
 
 ## 3. Test first
 
```

- [x] **Step 5: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -49,7 +49,10 @@
 gone (feature 0025). The game opens with the call — three pages of story — and without the
 lamp: the data protection officer next door hands it over in the first talk (feature 0026).
 A coffee at a coffee machine wins overview back — in the break room from the start, in a
-department once its case is solved (feature 0027).
+department once its case is solved (feature 0027). M6, the second act, has begun: Marketing
+has five traces of its own, on four screens and on the printer, and the colleague in the red
+shirt is the source of the second case; the two cases can be solved in either order (feature
+0028).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
 ## Run it
```

- [x] **Step 6:** `npm run check`, then commit — `Move the case of Marketing into the spec`.

---

### Task 5: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 17 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 5 in this file and commit —
  `Tick the full check of 0028`.

---

### Task 6: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow
  keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk, `J` for the journal —
  and that the game opens with the call (0026): the call is read and the lamp fetched from
  the data protection officer next door before step 1 of the plan. Wait until the author is
  ready.
- [ ] **Step 2:** guide the author through steps 1–22 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 5, and start again at step 1.
- [ ] **Step 4:** after step 22 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–22`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0028`. A feel note that wants something
  else — another device for a trace, other words, something new in a second case — becomes a
  new draft, not a change on this branch.

---

### Task 7: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 5. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M6 section, say that 0028 is
  implemented and 0029 is approved. Commit — `Mark 0028 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0028: the case of Marketing`, with the walk's result and feel notes in its
  description. CI must be green. The author merges.
