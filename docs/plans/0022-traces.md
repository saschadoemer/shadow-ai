# 0022 — Implementation plan: traces

**Spec:** [`docs/features/0022-traces.md`](../features/0022-traces.md) (approved 2026-11-18).
The plan argues from the spec; where they differ, the spec wins. Read the spec first, then
`CLAUDE.md`, then `docs/spec/architecture.md` §2, §5, §6 and §8, `docs/spec/gameplay.md` §2,
§6 and §7 and `docs/spec/testing.md` §5. **Written:** 2026-11-18 on the planning model. A
working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0020 is merged into `main` (`896c782` or later). The branch
`feature/0022-traces` exists, cut from that `main`, and holds the drafts of 0022 and 0023 with
their settled questions, the cut of M5 in `docs/plan.md`, the approval of 0022 and this plan.
Work on it; merge the latest `main` into it before Task 1. The draft of 0023 travels with this
branch and is **not** built here.

**Goal:** the lamp finds the five traces of Sales — residue on a screen that shows only in
the light, grows for a second and is found; a line says so, and the journal's cases tab
reads `Vertrieb`, `Spuren: 1 von 5`.

**Approach:** five code tasks, each green on its own. The words and the two small tables of
the journal that name them (T1). The traces in the map, in the state and in the lamp's light,
with the notice of a find and the five rectangles of the floor (T2) — after it the game finds
traces and says so, but draws none. The trace's sheet and its place in the scene (T3).
`drawNumber` and the cases tab (T4). The smoke spec (T5). Then the documents (T6), the full
check with the container (T7), the walk (T8) and the pull request (T9).

**How this plan was checked:** the code and the tests of Tasks 1 to 5 were run once as a
prototype on 2026-11-18, on `main` at `896c782`, and then replayed task by task: after each
of the five tasks typecheck and Biome were clean and the unit tests green — 928, 972, 983,
992 and 992 tests (927 before). The smoke spec passed three times in a row against the dev
server. The prototype was thrown away; nothing of it is on the branch. If a step does not
behave as written, the cause is a difference to that state — stop and look; do not bend a
test. The container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No
new dependency.

## Global constraints

- INV-1: `GameState.traces` is plain data: `{ trace, light, found }` per trace of the map,
  `found` a number or `null`, never `undefined`. All traces stay in the state for the whole
  game. The traces' places are **not** in the state and **not** cached: `update` and the
  scene build them from `map.rects` on every call with `tracesOf`. The entries of the cases
  tab are derived, not stored.
- INV-2: `src/game/rects.ts` and `src/game/trace.ts` import nothing from `src/render/`, use no
  DOM name and not the type `Language`.
- INV-4: the four new strings live in `src/text/de.ts` and `src/text/en.ts`. `drawNumber`
  takes a number and nothing else; `drawText` still takes a `TextKey` only.
- INV-6: `trace.png` uses the signature colour `#68386c` and nothing else; it is the third
  shadow asset in the list of the asset test.
- INV-7: no coordinate of a trace appears in `src/`. A trace is a rectangle of
  `public/maps/floor.tmj`; `tools/floor-layout.ts` is the only place that names the cells.
- `rects.ts` is the one place that knows the prefixes. `shadow.ts` re-exports `WALL_PREFIX`
  and imports nothing from `trace.ts`; `trace.ts` imports `meetsCone` from `shadow.ts`. No
  cycle.
- A trace is tested against the map **with the shadow walls standing** (`walled` in `update`),
  as a creature is; a shadow wall is tested against the map as loaded. Do not unify the two.
- `found` is the tick of the step that finds: `state.tick + 1` in `update`.
- No tile changes. The objects of 0017 in `floor.tmj` keep their ids; the five rectangles are
  appended after the figure's point.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`:
  Biome reads it as a duplicate test hook.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: a trace is one cell, 16x16 on the grid; `FIND_STEPS`
  60; `TRACE_NOTICE_STEPS` 120; the five cells (83, 28), (98, 28), (93, 34), (88, 40) and
  (98, 46), ids 101 to 105, `nextobjectid` 106; `trace.png` is 48x16 with 18, 50 and 98
  pixels; a trace with `light` L above 0 shows the frame ⌊(L − 1) / 20⌋; a case's name starts
  at (16, 36 + 36k) and its line at (16, 48 + 36k), one empty cell of 6 px between two parts.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | four keys: `region.sales`, `journal.traces`, `journal.of`, `notice.trace-found` |
| `src/game/journal.ts` | `CASE_TEXT`, `REGION_NAME` |
| `src/game/rects.ts` | new: `WALL_PREFIX`, `TRACE_PREFIX`, `rectsOf` |
| `src/game/trace.ts` | new: `Trace`, `tracesOf`, `FIND_STEPS`, `hiddenTraces`, `restedTraces`, `traceInLight`, `stepTraces`, `CaseEntry`, `caseEntries` |
| `src/game/shadow.ts` | `wallsOf` reads its rectangles through `rectsOf` |
| `src/game/state.ts` | `TraceState`; `GameState.traces` |
| `src/game/update.ts`, `src/game/overview.ts` | the traces start hidden, are stepped, and rest at the wake |
| `src/game/notice.ts` | `NOTICE_TRACE_FOUND`, `TRACE_NOTICE_STEPS`; `noticeOf` knows the find |
| `tools/floor-layout.ts`, `public/maps/floor.tmj` | `TRACES`, `traceBox`; five rectangles |
| `tools/placeholder-trace.ts`, `tools/gen-sprites.ts`, `public/sprites/trace.png` | new sheet |
| `src/render/draw-scene.ts`, `src/main.ts` | `traceSheet`, `TRACE_LOOKS`, `traceFrame`; the traces in the scene |
| `src/render/draw-text.ts` | `drawNumber` |
| `src/render/draw-journal.ts` | `CASE_NAME`, `CASE_LINE`, `CASE_PITCH`; the cases tab |
| `tests/fixtures/maps/traces.tmj` | new fixture |
| `tests/unit/trace.test.ts`, `tests/unit/trace-sheet.test.ts` | new |
| `tests/unit/text.test.ts`, `floor.test.ts`, `state.test.ts`, `overview.test.ts`, `draw-scene.test.ts`, `draw-journal.test.ts`, `draw-text.test.ts`, `assets.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 6 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`, `src/game/journal.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `region.sales`, `journal.traces`, `journal.of`,
  `notice.trace-found`; in `game/journal`: `CASE_TEXT: { traces: TextKey; of: TextKey }` and
  `REGION_NAME: Readonly<Partial<Record<string, TextKey>>>`.

- [ ] **Step 1: Write the failing test,** and widen the rule test of 0020 to the two new
  keys of the kind `journal` and to the kind `region`:

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -156,17 +156,33 @@
     ]);
   });
 
-  it('holds every text of the journal to the rule of its kind (0020)', () => {
+  it('holds the words of the traces in both languages (0022)', () => {
+    const both = (id: Parameters<typeof textKey>[0]): string[] => [
+      textOf(textKey(id), 'de'),
+      textOf(textKey(id), 'en'),
+    ];
+    expect(both('region.sales')).toStrictEqual(['Vertrieb', 'Sales']);
+    expect(both('journal.traces')).toStrictEqual(['Spuren:', 'Traces:']);
+    expect(both('journal.of')).toStrictEqual(['von', 'of']);
+    expect(both('notice.trace-found')).toStrictEqual([
+      'Spur gefunden. Sie steht im Journal.',
+      'Trace found. It is in the journal.',
+    ]);
+  });
+
+  it('holds every text of the journal to the rule of its kind (0020, 0022)', () => {
     /** The most lines and the most characters per line a key may have, by what its id starts or ends with. */
     const rules: readonly (readonly [(id: string) => boolean, number, number, number])[] = [
       [(id) => id.startsWith('journal.tab-'), 1, 1, 16],
       [(id) => id.startsWith('journal.no-'), 1, 1, 47],
+      [(id) => id === 'journal.traces' || id === 'journal.of', 1, 1, 16],
+      [(id) => id.startsWith('region.'), 1, 1, 24],
       [(id) => id.startsWith('creature.') && id.endsWith('-name'), 1, 1, 24],
       [(id) => id.startsWith('creature.') && id.endsWith('-text'), 2, 4, 47],
     ];
     for (const language of LANGUAGES) {
       for (const [key, text] of Object.entries(TABLE[language])) {
-        if (!key.startsWith('journal.') && !key.startsWith('creature.')) {
+        if (!['journal.', 'creature.', 'region.'].some((kind) => key.startsWith(kind))) {
           continue;
         }
         const rule = rules.find(([applies]) => applies(key));
```

- [ ] **Step 2: Run it and see it fail.**

Run: `npx vitest run tests/unit/text.test.ts`
Expected: the new test FAILS — the ids do not exist. `npm run typecheck` fails too.

- [ ] **Step 3: Add the strings.**

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -7,12 +7,16 @@
 export const de = {
   'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
   'notice.language': 'Sprache: Deutsch',
+  'notice.trace-found': 'Spur gefunden. Sie steht im Journal.',
   'journal.tab-creatures': 'Kreaturen',
   'journal.tab-cases': 'Fälle',
   'journal.tab-policy': 'Richtlinie',
   'journal.no-creatures': 'Noch keine Kreatur gefangen.',
   'journal.no-cases': 'Noch kein Fall aufgenommen.',
   'journal.no-policy': 'Die Richtlinie ist noch leer.',
+  'journal.traces': 'Spuren:',
+  'journal.of': 'von',
+  'region.sales': 'Vertrieb',
   'creature.snippet-name': 'Schnipsel',
   'creature.snippet-text': [
     'Ein Stück Text, das jemand in einen',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -4,12 +4,16 @@
 export const en: Readonly<Record<keyof typeof de, string>> = {
   'notice.shadow-too-dense': 'This shadow is too dense for the lamp.',
   'notice.language': 'Language: English',
+  'notice.trace-found': 'Trace found. It is in the journal.',
   'journal.tab-creatures': 'Creatures',
   'journal.tab-cases': 'Cases',
   'journal.tab-policy': 'Policy',
   'journal.no-creatures': 'No creature captured yet.',
   'journal.no-cases': 'No case opened yet.',
   'journal.no-policy': 'The policy is still empty.',
+  'journal.traces': 'Traces:',
+  'journal.of': 'of',
+  'region.sales': 'Sales',
   'creature.snippet-name': 'Snippet',
   'creature.snippet-text': [
     'A piece of text somebody pasted into a public',
```

- [ ] **Step 4: Name them in `src/game/journal.ts`,** above `entriesOf`:

```diff
--- a/src/game/journal.ts
+++ b/src/game/journal.ts
@@ -43,6 +43,17 @@
   snippet: { name: textKey('creature.snippet-name'), text: textKey('creature.snippet-text') },
 };
 
+/** The words of a region's line on the cases tab (0022): `Spuren: 1 von 5`. */
+export const CASE_TEXT = {
+  traces: textKey('journal.traces'),
+  of: textKey('journal.of'),
+} as const;
+
+/** The displayed names of the regions that have traces, by the region's id (0022). */
+export const REGION_NAME: Readonly<Partial<Record<string, TextKey>>> = {
+  sales: textKey('region.sales'),
+};
+
 /** The entries of the creatures tab: every species captured at least once, in SPECIES order. */
 export function entriesOf(captured: Captured): Species[] {
   return SPECIES.filter((species) => captured[species] > 0);
```

- [ ] **Step 5: Run the tests.**

Run: `npx vitest run tests/unit/text.test.ts tests/unit/font.test.ts tests/unit/draw-scene.test.ts`
Expected: PASS — the notice fits the bar, every character has a glyph. `npm run test`: 928
tests.

- [ ] **Step 6:** `npm run check`, then commit — `Give the traces their words`.

---

### Task 2: The traces in the map, in the state and in the light

After this task the game finds the traces of the floor and says so in the notice; the scene
does not draw them yet, and the journal does not list them.

**Files:**
- Create: `src/game/rects.ts`, `src/game/trace.ts`, `tests/unit/trace.test.ts`,
  `tests/fixtures/maps/traces.tmj`
- Modify: `src/game/shadow.ts`, `src/game/state.ts`, `src/game/update.ts`,
  `src/game/overview.ts`, `src/game/notice.ts`, `tools/floor-layout.ts`,
  `public/maps/floor.tmj` (generated)
- Test: `tests/unit/floor.test.ts`, `state.test.ts`, `overview.test.ts`,
  `draw-scene.test.ts`, `draw-journal.test.ts`

**Interfaces:**
- Consumes: `REGION_NAME` of Task 1; `meetsCone`, `withWalls` of `game/shadow`; `lampCone`;
  `sightBlocked`; `densityOf` and `REGIONS` of `game/world`.
- Produces, in `game/rects`: `WALL_PREFIX`, `TRACE_PREFIX`,
  `rectsOf(rects: readonly NamedRect[], prefix: string): NamedRect[]`.
- Produces, in `game/state`:
  `interface TraceState { trace: number; light: number; found: number | null }`;
  `GameState.traces: readonly TraceState[]`.
- Produces, in `game/trace`: `interface Trace { region: string; box: Box }`;
  `tracesOf(rects): Trace[]`; `FIND_STEPS = 60`; `hiddenTraces(traces): TraceState[]`;
  `restedTraces(states): TraceState[]`;
  `traceInLight(trace, player, lampOn, map): boolean`;
  `stepTraces(states, traces, player, lampOn, map, tick): TraceState[]`;
  `interface CaseEntry { region: string; found: number; all: number }`;
  `caseEntries(states, traces, regions?): CaseEntry[]`.
- Produces, in `game/notice`: `NOTICE_TRACE_FOUND`, `TRACE_NOTICE_STEPS = 120`.
- Produces, in `tools/floor-layout`: `TRACES`, `traceBox(cell: Point): Box`.

- [ ] **Step 1: Create the fixture** `tests/fixtures/maps/traces.tmj` from `figures.tmj` with
  a one-off script. Do not commit the script. Run from the repository root:

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
  object(1, 'spawn', 168, 128, 0, 0),
  object(2, 'trace:sales', 160, 80, 16, 16),
  object(3, 'shadow:marketing', 144, 112, 48, 4),
];
map.nextobjectid = 4;
const text = JSON.stringify(map, null, 2).replace(
  /"data": \[[^\]]*\]/,
  (data) => data.replace(/\s+/g, ' ').replace('[ ', '[').replace(' ]', ']'),
);
writeFileSync('tests/fixtures/maps/traces.tmj', `${text}\n`);
EOF
```

  It holds three objects, ids 1 to 3, `nextobjectid` 4: the point `spawn` (168, 128), the
  rectangle `trace:sales` (160, 80, 16, 16) and the rectangle `shadow:marketing`
  (144, 112, 48, 4) between the two.

- [ ] **Step 2: Create `tests/unit/trace.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import type { NamedRect, TileMap } from '../../src/engine/tiled';
import { noticeOf, TRACE_NOTICE_STEPS } from '../../src/game/notice';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import { rectsOf, TRACE_PREFIX, WALL_PREFIX } from '../../src/game/rects';
import { wallsOf } from '../../src/game/shadow';
import type { Facing, GameState, TraceState } from '../../src/game/state';
import {
  caseEntries,
  FIND_STEPS,
  hiddenTraces,
  restedTraces,
  type Trace,
  traceInLight,
  tracesOf,
} from '../../src/game/trace';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const SHINE: GameInput = { ...NONE, lamp: true };
const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});
/** One trace on cell (10, 5). */
const TRACE = rect('trace:sales', 160, 80);
/** A wall strip on the top edge of the cells (9, 7) to (11, 7), between the trace and (168, 128). */
const strip = (region: string): NamedRect => rect(`shadow:${region}`, 144, 112, 48, 4);
/** 20x12 cells of open floor with the player at (x, y) and the given rectangles. */
const mapAt = (x: number, y: number, rects: readonly NamedRect[] = [TRACE]): TileMap =>
  grassMap(20, 12, { x, y }, [], rects);
/** The start of `map` with the player looking `facing`. */
const facing = (map: TileMap, to: Facing): GameState => {
  const start = createInitialState(map);
  return { ...start, player: { ...start.player, facing: to } };
};
const steps = (map: TileMap, start: GameState, input: GameInput, count: number): GameState => {
  let state = start;
  for (let step = 0; step < count; step += 1) {
    state = update(state, input, map);
  }
  return state;
};
/** The map with one box put into the cell (10, 6), on the line from (168, 124) to the trace. */
const boxed = (map: TileMap, ...layers: readonly ('solids' | 'opaque')[]): TileMap => {
  const box: Box = { x: 160, y: 100, width: 16, height: 4 };
  const cells = (layer: 'solids' | 'opaque') =>
    map[layer].map((boxes, cell) => (cell === 6 * map.width + 10 ? [box] : boxes));
  return {
    ...map,
    solids: layers.includes('solids') ? cells('solids') : map.solids,
    opaque: layers.includes('opaque') ? cells('opaque') : map.opaque,
  };
};
const BELOW = mapAt(168, 128);

describe('the rectangles of a map by their kind (0022)', () => {
  it('knows a wall and a trace by the prefix of the name', () => {
    expect([WALL_PREFIX, TRACE_PREFIX]).toStrictEqual(['shadow:', 'trace:']);
    const rects = [TRACE, strip('marketing'), rect('trace:sales', 32, 32)];
    expect(rectsOf(rects, TRACE_PREFIX)).toStrictEqual([TRACE, rect('trace:sales', 32, 32)]);
    expect(rectsOf(rects, WALL_PREFIX)).toStrictEqual([strip('marketing')]);
    expect(rectsOf([], TRACE_PREFIX)).toStrictEqual([]);
  });

  it('refuses a rectangle of no known kind, whatever kind is asked for', () => {
    const rects = [TRACE, rect('door:sales', 0, 0)];
    expect(() => rectsOf(rects, TRACE_PREFIX)).toThrow('unknown rectangle object "door:sales"');
    expect(() => wallsOf(rects)).toThrow('unknown rectangle object "door:sales"');
    expect(() => tracesOf(rects)).toThrow('unknown rectangle object "door:sales"');
  });

  it('lets the walls skip the traces and the traces skip the walls', () => {
    const rects = [TRACE, strip('marketing')];
    expect(wallsOf(rects)).toStrictEqual([
      { region: 'marketing', density: 1, box: { x: 144, y: 112, width: 48, height: 4 } },
    ]);
    expect(tracesOf(rects)).toStrictEqual([
      { region: 'sales', box: { x: 160, y: 80, width: 16, height: 16 } },
    ]);
  });
});

describe('the traces of a map (0022)', () => {
  it('reads them in file order, each with its region and its cell', () => {
    expect(tracesOf([rect('trace:sales', 32, 48), rect('trace:hr', 0, 0)])).toStrictEqual([
      { region: 'sales', box: { x: 32, y: 48, width: 16, height: 16 } },
      { region: 'hr', box: { x: 0, y: 0, width: 16, height: 16 } },
    ]);
    expect(tracesOf([])).toStrictEqual([]);
  });

  it('refuses a region the world data does not know', () => {
    expect(() => tracesOf([rect('trace:cellar', 160, 80)])).toThrow(
      'trace trace:cellar names no region',
    );
  });

  it.each([
    [1330, 448, 16, 16],
    [160, 80, 32, 16],
    [160, 80, 16, 4],
    [160, 82, 16, 16],
  ])('refuses the box (%d, %d, %d, %d): it is not one cell', (x, y, width, height) => {
    expect(() => tracesOf([rect('trace:sales', x, y, width, height)])).toThrow(
      `trace trace:sales (${x}, ${y}, ${width}, ${height}) is not one cell`,
    );
  });

  it('refuses such a map before the game starts', () => {
    expect(() => createInitialState(mapAt(40, 40, [rect('trace:cellar', 160, 80)]))).toThrow(
      'trace trace:cellar names no region',
    );
  });

  it('starts every trace unseen and not found, and a map without traces with none', () => {
    expect(hiddenTraces(tracesOf([TRACE, rect('trace:sales', 32, 32)]))).toStrictEqual([
      { trace: 0, light: 0, found: null },
      { trace: 1, light: 0, found: null },
    ]);
    expect(createInitialState(BELOW).traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    expect(createInitialState(mapAt(40, 40, [])).traces).toStrictEqual([]);
  });
});

describe('a trace in the light (0022)', () => {
  const trace: Trace = { region: 'sales', box: { x: 160, y: 80, width: 16, height: 16 } };
  const player = (x: number, y: number, to: Facing) => ({
    ...createInitialState(BELOW).player,
    x,
    y,
    facing: to,
  });

  it('is one second', () => {
    expect(FIND_STEPS).toBe(60);
  });

  it('is lit when the lamp is on, its box meets the cone and nothing opaque is between', () => {
    expect(traceInLight(trace, player(168, 128, 'up'), true, BELOW)).toBe(true);
    expect(traceInLight(trace, player(168, 128, 'up'), false, BELOW)).toBe(false);
    expect(traceInLight(trace, player(168, 128, 'down'), true, BELOW)).toBe(false);
    // 48 px is the cone's length: from two cells farther down the light does not reach.
    expect(traceInLight(trace, player(168, 160, 'up'), true, BELOW)).toBe(false);
    // From the side, a cell left of it.
    expect(traceInLight(trace, player(140, 96, 'right'), true, BELOW)).toBe(true);
  });

  it('is not lit behind an opaque box, and is lit over a low one', () => {
    expect(traceInLight(trace, player(168, 128, 'up'), true, boxed(BELOW, 'opaque'))).toBe(false);
    expect(traceInLight(trace, player(168, 128, 'up'), true, boxed(BELOW, 'solids'))).toBe(true);
  });

  it('counts the lit steps and is found in the 60th: its tick is kept', () => {
    const lit59 = steps(BELOW, facing(BELOW, 'up'), SHINE, 59);
    expect(lit59.traces).toStrictEqual([{ trace: 0, light: 59, found: null }]);
    const found = update(lit59, SHINE, BELOW);
    expect(found.tick).toBe(60);
    expect(found.traces).toStrictEqual([{ trace: 0, light: 0, found: 60 }]);
  });

  it('starts again after a step without the light', () => {
    const lit30 = steps(BELOW, facing(BELOW, 'up'), SHINE, 30);
    expect(lit30.traces[0]?.light).toBe(30);
    const dark = update(lit30, NONE, BELOW);
    expect(dark.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    const again = steps(BELOW, dark, SHINE, 59);
    expect(again.traces).toStrictEqual([{ trace: 0, light: 59, found: null }]);
    expect(update(again, SHINE, BELOW).traces[0]?.found).toBe(91);
  });

  it('stays unseen with the lamp off, with the player turned away, and behind an opaque box', () => {
    const hidden = [{ trace: 0, light: 0, found: null }];
    expect(steps(BELOW, facing(BELOW, 'up'), NONE, 120).traces).toStrictEqual(hidden);
    expect(steps(BELOW, facing(BELOW, 'down'), SHINE, 120).traces).toStrictEqual(hidden);
    const wall = boxed(BELOW, 'solids', 'opaque');
    expect(steps(wall, facing(wall, 'up'), SHINE, 120).traces).toStrictEqual(hidden);
  });

  it('is found over a box that is solid and not opaque', () => {
    const desk = boxed(BELOW, 'solids');
    expect(steps(desk, facing(desk, 'up'), SHINE, 60).traces[0]?.found).toBe(60);
  });

  it('is not found through a standing shadow wall, and a second after the wall is lifted', () => {
    const map = mapAt(168, 128, [TRACE, strip('marketing')]);
    const lifting = steps(map, facing(map, 'up'), SHINE, 60);
    expect(lifting.shadowWalls).toStrictEqual([]);
    expect(lifting.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    const after = steps(map, lifting, SHINE, 59);
    expect(after.traces).toStrictEqual([{ trace: 0, light: 59, found: null }]);
    expect(update(after, SHINE, map).traces[0]?.found).toBe(120);
  });

  it('is never found behind a wall that holds', () => {
    const map = mapAt(168, 128, [TRACE, strip('hr')]);
    const held = steps(map, facing(map, 'up'), SHINE, 600);
    expect(held.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
    expect(held.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
  });

  it('never changes once it is found: 600 lit steps', () => {
    const found = steps(BELOW, facing(BELOW, 'up'), SHINE, 60);
    expect(steps(BELOW, found, SHINE, 600).traces).toStrictEqual(found.traces);
  });

  it('finds two traces in one cone in the same step', () => {
    const map = mapAt(168, 128, [TRACE, rect('trace:sales', 176, 80)]);
    expect(steps(map, facing(map, 'up'), SHINE, 60).traces).toStrictEqual([
      { trace: 0, light: 0, found: 60 },
      { trace: 1, light: 0, found: 60 },
    ]);
  });
});

describe('the traces when the figure wakes (0022)', () => {
  it('start their second again and keep what was found', () => {
    const states: TraceState[] = [
      { trace: 0, light: 30, found: null },
      { trace: 1, light: 0, found: 77 },
    ];
    expect(restedTraces(states)).toStrictEqual([
      { trace: 0, light: 0, found: null },
      { trace: 1, light: 0, found: 77 },
    ]);
  });

  it('rest in the step of the wake', () => {
    const map = mapAt(168, 128, [TRACE, rect('trace:sales', 32, 32)]);
    const start: GameState = {
      ...createInitialState(map),
      traces: [
        { trace: 0, light: 30, found: null },
        { trace: 1, light: 0, found: 12 },
      ],
      dark: 44,
    };
    const woken = update(start, NONE, map);
    expect(woken.dark).toBe(45);
    expect(woken.traces).toStrictEqual([
      { trace: 0, light: 0, found: null },
      { trace: 1, light: 0, found: 12 },
    ]);
  });
});

describe('the notice of a find (0022)', () => {
  const found = steps(BELOW, facing(BELOW, 'up'), SHINE, 60);
  const key = textKey('notice.trace-found');

  it('is shown for 120 steps from the find and not after', () => {
    expect(TRACE_NOTICE_STEPS).toBe(120);
    expect(noticeOf(steps(BELOW, facing(BELOW, 'up'), SHINE, 59))).toBeNull();
    expect(noticeOf(found)).toBe(key);
    expect(noticeOf(steps(BELOW, found, NONE, 119))).toBe(key);
    expect(noticeOf(steps(BELOW, found, NONE, 120))).toBeNull();
  });

  it('starts again with a second find', () => {
    const state: GameState = {
      ...found,
      tick: 130,
      traces: [
        { trace: 0, light: 0, found: 60 },
        { trace: 1, light: 0, found: 120 },
      ],
    };
    expect(noticeOf(state)).toBe(key);
    expect(noticeOf({ ...state, tick: 240 })).toBeNull();
  });

  it('gives way to the notice of a wall that holds', () => {
    const state: GameState = {
      ...found,
      lamp: { on: true, strength: 1 },
      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    };
    expect(noticeOf(state)).toBe(textKey('notice.shadow-too-dense'));
  });
});

describe('the cases the traces open (0022)', () => {
  const traces: Trace[] = [
    { region: 'sales', box: { x: 0, y: 0, width: 16, height: 16 } },
    { region: 'hr', box: { x: 16, y: 0, width: 16, height: 16 } },
    { region: 'sales', box: { x: 32, y: 0, width: 16, height: 16 } },
    { region: 'marketing', box: { x: 48, y: 0, width: 16, height: 16 } },
  ];
  const state = (...found: readonly (number | null)[]): TraceState[] =>
    found.map((tick, trace) => ({ trace, light: 0, found: tick }));

  it('are none while no trace is found', () => {
    expect(caseEntries(state(null, null, null, null), traces)).toStrictEqual([]);
    expect(caseEntries([], [])).toStrictEqual([]);
  });

  it('are the regions with a found trace, with how many of all their traces are found', () => {
    expect(caseEntries(state(60, null, null, null), traces)).toStrictEqual([
      { region: 'sales', found: 1, all: 2 },
    ]);
    expect(caseEntries(state(60, null, 90, null), traces)).toStrictEqual([
      { region: 'sales', found: 2, all: 2 },
    ]);
  });

  it('come in the order of the world data, not of the map', () => {
    expect(caseEntries(state(60, 70, null, 80), traces)).toStrictEqual([
      { region: 'sales', found: 1, all: 2 },
      { region: 'marketing', found: 1, all: 1 },
      { region: 'hr', found: 1, all: 1 },
    ]);
  });
});
```

- [ ] **Step 3: Change the tests that build a state, and add the floor's and the state's
  tests.** Every `GameState` literal gets `traces: []` after `shadowWalls`. In
  `floor.test.ts` three tests of 0014, 0015 and 0017 learn that five rectangles follow the
  officer's point, and a block of six tests is added. In `state.test.ts` the test of 0014
  that compared the floor with a map without rectangles now takes only the walls out, and a
  block of six tests is added — its helper is named `stepping`, not `after`.

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -168,6 +168,7 @@
     creatures: [snippet(310, 200)],
     movers: [],
     shadowWalls: [{ wall: 1, lit: true, light: 30 }],
+    traces: [],
     figures: [],
     dialogue: null,
     journal: null,
@@ -204,6 +205,7 @@
       creatures: [{ ...snippet(40, 40), home: { x: 40, y: 40 } }],
       movers: [],
       shadowWalls: [{ wall: 1, lit: false, light: 0 }],
+      traces: [],
       figures: [],
       dialogue: null,
       journal: null,
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -140,6 +140,7 @@
   creatures: [],
   movers: [],
   shadowWalls: [],
+  traces: [],
   figures: [],
   dialogue: null,
   journal: null,
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -91,6 +91,7 @@
   creatures: [],
   movers: [],
   shadowWalls: [],
+  traces: [],
   figures: [],
   dialogue: null,
   journal: { tab },
```

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -6,9 +6,12 @@
 import { moveBox } from '../../src/engine/collision';
 import { type Box, EMPTY, type Point, parseTileMap, parseTileset } from '../../src/engine/tiled';
 import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
+import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
 import { standingWalls, wallsOf, withWalls } from '../../src/game/shadow';
+import { NO_RECOIL } from '../../src/game/state';
 import { speakerInReach, speakersOf, TALK_DISTANCE } from '../../src/game/talk';
+import { traceInLight, tracesOf } from '../../src/game/trace';
 import { createInitialState } from '../../src/game/update';
 import {
   type CellRect,
@@ -27,6 +30,8 @@
   SNIPPETS,
   SPAWN,
   shadowWallBox,
+  TRACES,
+  traceBox,
   VERTICAL_WALLS,
   WAKE,
 } from '../../tools/floor-layout.ts';
@@ -485,9 +490,9 @@
     ]);
     const json = floorJson();
     expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
-      Array.from({ length: 100 }, (_, i) => i + 1),
+      Array.from({ length: 105 }, (_, i) => i + 1),
     );
-    expect(json.nextobjectid).toBe(101);
+    expect(json.nextobjectid).toBe(106);
   });
 
   it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
@@ -923,7 +928,8 @@
     a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
 
   it('holds the eight rectangles of the spec after the 91 points, with the ids 92–99', () => {
-    expect(floor.rects).toStrictEqual(
+    // The walls are the first eight rectangles; the traces of 0022 follow them.
+    expect(floor.rects.slice(0, 8)).toStrictEqual(
       TABLE.map(([region, , box]) => ({ name: `shadow:${region}`, ...box })),
     );
     const objects = floorJson().layers[3].objects;
@@ -1066,16 +1072,15 @@
     expect(FIGURES).toStrictEqual([{ id: 'officer', at: OFFICER }]);
     expect(floor.points.at(-1)).toStrictEqual({ name: 'figure:officer', ...OFFICER });
     const objects = floorJson().layers[3].objects;
-    expect(objects).toHaveLength(100);
-    const last = objects.at(-1);
-    expect([last?.id, last?.name, last?.x, last?.y]).toStrictEqual([
+    // The hundredth object; the traces of 0022 follow it.
+    const hers = objects[99];
+    expect([hers?.id, hers?.name, hers?.x, hers?.y]).toStrictEqual([
       100,
       'figure:officer',
       264,
       472,
     ]);
-    expect(last !== undefined && 'point' in last).toBe(true);
-    expect(floorJson().nextobjectid).toBe(101);
+    expect(hers !== undefined && 'point' in hers).toBe(true);
   });
 
   it('gives the floor one figure, the officer, with her two pages', () => {
@@ -1180,5 +1185,110 @@
       speaker: 'mover',
       index: 3,
     });
+  });
+});
+
+describe('the traces of the floor (0022)', () => {
+  /** Region, cell and box, in file order: the spec's table. */
+  const TABLE: readonly (readonly [string, number, number, Box])[] = [
+    ['sales', 83, 28, { x: 1328, y: 448, width: 16, height: 16 }],
+    ['sales', 98, 28, { x: 1568, y: 448, width: 16, height: 16 }],
+    ['sales', 93, 34, { x: 1488, y: 544, width: 16, height: 16 }],
+    ['sales', 88, 40, { x: 1408, y: 640, width: 16, height: 16 }],
+    ['sales', 98, 46, { x: 1568, y: 736, width: 16, height: 16 }],
+  ];
+  const traces = tracesOf(floor.rects);
+
+  it('are five, all of Sales, on the cells of the spec', () => {
+    expect(traces).toStrictEqual(TABLE.map(([region, , , box]) => ({ region, box })));
+    expect(TRACES.map((trace) => [trace.region, trace.cell.x, trace.cell.y])).toStrictEqual(
+      TABLE.map(([region, column, row]) => [region, column, row]),
+    );
+    expect(TRACES.map((trace) => traceBox(trace.cell))).toStrictEqual(
+      TABLE.map(([, , , box]) => box),
+    );
+  });
+
+  it('are the last five objects of the file, rectangles with the ids 101 to 105', () => {
+    const objects = floorJson().layers[3].objects;
+    expect(objects).toHaveLength(105);
+    expect(objects.slice(100).map((object) => [object.id, object.name])).toStrictEqual(
+      [101, 102, 103, 104, 105].map((id) => [id, 'trace:sales']),
+    );
+    expect(objects.slice(100).some((object) => 'point' in object)).toBe(false);
+    expect(floorJson().nextobjectid).toBe(106);
+    expect(floor.rects).toHaveLength(13);
+    expect(floor.points).toHaveLength(91);
+  });
+
+  it('lie in Sales, each on a desk with a screen whose chair stands on the cell below', () => {
+    const sales = ROOMS.find((room) => room.name === 'sales');
+    for (const [, column, row] of TABLE) {
+      expect(sales !== undefined && column >= sales.cells.c0 && column <= sales.cells.c1).toBe(
+        true,
+      );
+      expect(sales !== undefined && row >= sales.cells.r0 && row <= sales.cells.r1).toBe(true);
+      expect(floor.detail[cell(column, row)], `(${column}, ${row})`).toBe(DESK_MONITOR_PARTITION);
+      expect(floor.detail[cell(column, row + 1)], `(${column}, ${row + 1})`).toBe(CHAIR);
+      expect(floor.detail[cell(column, row + 2)], `(${column}, ${row + 2})`).toBe(EMPTY);
+    }
   });
+
+  it('are in the light of a player who looks up from any place on the cell below the chair', () => {
+    for (const [, column, row] of TABLE) {
+      const trace = traces.find(
+        (candidate) => candidate.box.x === column * 16 && candidate.box.y === row * 16,
+      );
+      let places = 0;
+      for (let x = column * 16; x <= column * 16 + 16; x += 2) {
+        for (let y = (row + 2) * 16 + 2; y <= (row + 3) * 16; y += 2) {
+          if (!reached({ x, y })) {
+            continue;
+          }
+          places += 1;
+          const player = {
+            x,
+            y,
+            facing: 'up',
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
+      expect(places, `(${column}, ${row})`).toBe(54);
+    }
+  });
+
+  it('leave eleven of the sixteen screens of Sales without a trace, and no row without one', () => {
+    const screens: [number, number][] = [];
+    for (let row = 26; row <= 51; row += 1) {
+      for (let column = 79; column <= 106; column += 1) {
+        if (floor.detail[cell(column, row)] === DESK_MONITOR_PARTITION) {
+          screens.push([column, row]);
+        }
+      }
+    }
+    expect(screens).toHaveLength(16);
+    const rows = [...new Set(screens.map(([, row]) => row))];
+    expect(rows).toStrictEqual([28, 34, 40, 46]);
+    for (const row of rows) {
+      expect(
+        TABLE.some(([, , traceRow]) => traceRow === row),
+        `row ${row}`,
+      ).toBe(true);
+    }
+  });
+
+  it('have a name for their region, and start unseen in the state', () => {
+    for (const { region } of traces) {
+      expect(REGION_NAME[region], region).toBeDefined();
+    }
+    expect(createInitialState(floor).traces).toHaveLength(5);
+  });
 });
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -37,6 +37,11 @@
   'tests/fixtures/maps/talkers.tmj',
   'tests/fixtures/maps/fixture-tiles.tsj',
 );
+/** One trace on cell (10, 5) behind a wall strip of Marketing, the spawn below both (0022). */
+const TRACES_MAP = loadMap(
+  'tests/fixtures/maps/traces.tmj',
+  'tests/fixtures/maps/fixture-tiles.tsj',
+);
 /** The floor the game loads. */
 const FLOOR_MAP = loadMap('public/maps/floor.tmj', 'public/tiles/placeholder.tsj');
 
@@ -82,6 +87,7 @@
       creatures: [],
       movers: [],
       shadowWalls: [],
+      traces: [],
       figures: [],
       dialogue: null,
       journal: null,
@@ -139,6 +145,7 @@
         creatures: [],
         movers: [],
         shadowWalls: [],
+        traces: [],
         figures: [],
         dialogue: null,
         journal: null,
@@ -164,6 +171,7 @@
       creatures: [],
       movers: [],
       shadowWalls: [],
+      traces: [],
       figures: [],
       dialogue: null,
       journal: null,
@@ -181,6 +189,7 @@
       creatures: [],
       movers: [],
       shadowWalls: [],
+      traces: [],
       figures: [],
       dialogue: null,
       journal: null,
@@ -575,7 +584,7 @@
     expect(woken.lamp).toStrictEqual({ on: false, strength: 1 });
   });
 
-  it('steps a state without standing walls exactly as a map without rectangles (600 steps)', () => {
+  it('steps a state without standing walls exactly as a map without walls (600 steps)', () => {
     const inputs = Array.from({ length: 600 }, (_, i) => ({
       up: i % 240 >= 180,
       down: i % 240 >= 60 && i % 240 < 120,
@@ -585,7 +594,11 @@
       talk: false,
       journal: false,
     }));
-    const bare: TileMap = { ...FLOOR_MAP, rects: [] };
+    // Without its walls; the traces of 0022 are rectangles too, and they stay.
+    const bare: TileMap = {
+      ...FLOOR_MAP,
+      rects: FLOOR_MAP.rects.filter((rect) => !rect.name.startsWith('shadow:')),
+    };
     let open: GameState = { ...createInitialState(FLOOR_MAP), shadowWalls: [] };
     let without = createInitialState(bare);
     expect(open).toStrictEqual(without);
@@ -698,5 +711,82 @@
     expect(state.dark).toBe(45);
     expect(state.journal).toBeNull();
     expect(state.held).toStrictEqual(JOURNAL);
+  });
+});
+
+describe('traces in the state (0022)', () => {
+  const JOURNAL: GameInput = { ...NONE, journal: true };
+  const TALK: GameInput = { ...NONE, talk: true };
+  const lookingUp = (map: TileMap): GameState => {
+    const start = createInitialState(map);
+    return { ...start, player: { ...start.player, facing: 'up' } };
+  };
+  const stepping = (map: TileMap, start: GameState, input: GameInput, count: number): GameState => {
+    let state = start;
+    for (let step = 0; step < count; step += 1) {
+      state = update(state, input, map);
+    }
+    return state;
+  };
+
+  it('starts on the floor with five traces, unseen and not found', () => {
+    expect(createInitialState(FLOOR_MAP).traces).toStrictEqual(
+      [0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: null })),
+    );
+    expect(createInitialState(MAP).traces).toStrictEqual([]);
+  });
+
+  it('reads a trace and a wall from a parsed map, each by its kind', () => {
+    const state = createInitialState(TRACES_MAP);
+    expect(state.player).toMatchObject({ x: 168, y: 128 });
+    expect(state.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
+    expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
+  });
+
+  it('lifts the wall in a second and finds the trace behind it in the next', () => {
+    const lifted = stepping(TRACES_MAP, lookingUp(TRACES_MAP), SHINE, 60);
+    expect(lifted.shadowWalls).toStrictEqual([]);
+    expect(lifted.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
+    const found = stepping(TRACES_MAP, lifted, SHINE, 60);
+    expect(found.traces).toStrictEqual([{ trace: 0, light: 0, found: 120 }]);
   });
+
+  it('survives a JSON round trip at the start and with a trace found (INV-1)', () => {
+    const start = createInitialState(TRACES_MAP);
+    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
+    const found = stepping(TRACES_MAP, lookingUp(TRACES_MAP), SHINE, 120);
+    expect(found.traces[0]?.found).toBe(120);
+    expect(JSON.parse(JSON.stringify(found))).toStrictEqual(found);
+  });
+
+  it('steps no trace while the journal is open: 600 steps with the lamp held', () => {
+    const lit = stepping(
+      TRACES_MAP,
+      stepping(TRACES_MAP, lookingUp(TRACES_MAP), SHINE, 60),
+      SHINE,
+      30,
+    );
+    expect(lit.traces).toStrictEqual([{ trace: 0, light: 30, found: null }]);
+    const open = update(lit, { ...SHINE, journal: true }, TRACES_MAP);
+    expect(open.journal).not.toBeNull();
+    expect(stepping(TRACES_MAP, open, SHINE, 600).traces).toStrictEqual(lit.traces);
+    expect(open.traces).toStrictEqual(lit.traces);
+    expect(JOURNAL.journal).toBe(true);
+  });
+
+  it('steps no trace while a dialogue is open', () => {
+    const map = grassMap(
+      20,
+      12,
+      { x: 168, y: 128 },
+      [{ name: 'figure:officer', x: 190, y: 128 }],
+      [{ name: 'trace:sales', x: 160, y: 80, width: 16, height: 16 }],
+    );
+    const lit = stepping(map, lookingUp(map), SHINE, 30);
+    expect(lit.traces).toStrictEqual([{ trace: 0, light: 30, found: null }]);
+    // Without the lamp the count starts again in an ordinary step; the step that opens steps nothing.
+    const talking = update(update(lit, NONE, map), TALK, map);
+    expect(talking.dialogue).not.toBeNull();
+    expect(stepping(map, talking, SHINE, 600).traces).toStrictEqual(talking.traces);
+  });
 });
```

- [ ] **Step 4: Run and see it fail.**

Run: `npm run typecheck`
Expected: errors — `src/game/rects` and `src/game/trace` do not exist, `traces` is no
property of `GameState`, and `TRACES` and `traceBox` are not exported by the layout.

- [ ] **Step 5: Create `src/game/rects.ts`:**

```ts
import type { NamedRect } from '../engine/tiled';

/**
 * The kinds of rectangle a map may hold (architecture.md §6): what a rectangle is, is the
 * game's business, and its name says it. A shadow wall is `shadow:<region>` (0014), a trace
 * `trace:<region>` (0022). Pure.
 */

/** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
export const WALL_PREFIX = 'shadow:';
/** A rectangle whose name starts with this is a trace; the rest of the name is its region. */
export const TRACE_PREFIX = 'trace:';

const PREFIXES: readonly string[] = [WALL_PREFIX, TRACE_PREFIX];

/**
 * The rectangles of one kind, in the order of the map. Rejects a rectangle of no known kind,
 * so that a typing mistake in the map is not a silently missing wall or trace.
 */
export function rectsOf(rects: readonly NamedRect[], prefix: string): NamedRect[] {
  for (const rect of rects) {
    if (!PREFIXES.some((known) => rect.name.startsWith(known))) {
      throw new Error(`unknown rectangle object "${rect.name}"`);
    }
  }
  return rects.filter((rect) => rect.name.startsWith(prefix));
}
```

- [ ] **Step 6: Let `wallsOf` read through it,** in `src/game/shadow.ts`. The message for a
  rectangle of no known kind stays word for word, so the tests of 0014 hold:

```diff
--- a/src/game/shadow.ts
+++ b/src/game/shadow.ts
@@ -2,6 +2,7 @@
 import { type NamedRect, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { CONE_LENGTH, type Cone, DIRECTIONS, lampCone } from './lamp';
 import { BOX_HEIGHT } from './player';
+import { rectsOf, WALL_PREFIX } from './rects';
 import type { LampState, PlayerState, ShadowWallState } from './state';
 import { densityOf } from './world';
 
@@ -14,8 +15,7 @@
  * the map's rectangles on every call and kept nowhere.
  */
 
-/** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
-export const WALL_PREFIX = 'shadow:';
+export { WALL_PREFIX } from './rects';
 /** A wall is as thick as a wall strip (0010). */
 export const WALL_THICKNESS = 4;
 
@@ -40,15 +40,13 @@
 }
 
 /**
- * The shadow walls of a map, in the order of its rectangles. Rejects a rectangle with another
- * name, a region the world data does not know, a region without shadow and a box that is no
- * strip on a cell edge, so that a typing mistake in the map is not a silently missing wall.
+ * The shadow walls of a map, in the order of its rectangles; the rectangles of another kind —
+ * the traces of 0022 — are skipped. Rejects a rectangle of no known kind (`rectsOf`), a region
+ * the world data does not know, a region without shadow and a box that is no strip on a cell
+ * edge, so that a typing mistake in the map is not a silently missing wall.
  */
 export function wallsOf(rects: readonly NamedRect[]): ShadowWall[] {
-  return rects.map((rect) => {
-    if (!rect.name.startsWith(WALL_PREFIX)) {
-      throw new Error(`unknown rectangle object "${rect.name}"`);
-    }
+  return rectsOf(rects, WALL_PREFIX).map((rect) => {
     const region = rect.name.slice(WALL_PREFIX.length);
     const density = densityOf(region);
     if (density === undefined) {
```

- [ ] **Step 7: The state,** in `src/game/state.ts`:

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -92,6 +92,16 @@
   readonly light: number;
 }
 
+/** A trace of the map (0022). Its place stays in the map; all of them stay in the state for good. */
+export interface TraceState {
+  /** The index of the trace in `tracesOf(map.rects)`. */
+  readonly trace: number;
+  /** Steps the light has been on it without a break, 0–59; above 0 it is seen. */
+  readonly light: number;
+  /** The tick of the step in which it was found, or null. A found trace never changes. */
+  readonly found: number | null;
+}
+
 /** A standing figure of the cast (0017). Its place stays in the map, its pages in game/cast. */
 export interface FigureState {
   /** The index of the figure in `figuresOf(map.points)`. */
@@ -152,6 +162,8 @@
   readonly movers: readonly MoverState[];
   /** The shadow walls still standing, in the map's order (0014); a lifted wall has left it for good. */
   readonly shadowWalls: readonly ShadowWallState[];
+  /** The traces of the map, in file order (0022): found or not, all of them. */
+  readonly traces: readonly TraceState[];
   /** The standing figures of the map, in file order (0017). */
   readonly figures: readonly FigureState[];
   /** The dialogue that is open, or null. While it is open nothing else is stepped (0017). */
```

- [ ] **Step 8: Create `src/game/trace.ts`:**

```ts
import { type Box, sightBlocked } from '../engine/collision';
import { type NamedRect, TILE_SIZE, type TileMap } from '../engine/tiled';
import { lampCone } from './lamp';
import { BOX_HEIGHT } from './player';
import { rectsOf, TRACE_PREFIX } from './rects';
import { meetsCone } from './shadow';
import type { PlayerState, TraceState } from './state';
import { densityOf, REGIONS, type Region } from './world';

/**
 * The traces (gameplay.md §2 and §6, feature 0022): shadow residue on devices. A trace is a
 * rectangle of the map named `trace:<region>`, exactly one cell, on the cell of its device. It
 * cannot be seen until the lamp's light is on it; after FIND_STEPS steps of unbroken light it
 * is found and goes into the journal. Pure data and pure functions; the traces are read from
 * the map's rectangles on every call and kept nowhere.
 */

export interface Trace {
  readonly region: string;
  /** Map pixels: one cell. */
  readonly box: Box;
}

/** Tune: one second of unbroken light finds a trace, as it captures a creature and lifts a wall. */
export const FIND_STEPS = 60;

function isCell(box: Box): boolean {
  return (
    box.x % TILE_SIZE === 0 &&
    box.y % TILE_SIZE === 0 &&
    box.width === TILE_SIZE &&
    box.height === TILE_SIZE
  );
}

/**
 * The traces of a map, in the order of its rectangles. Rejects a region the world data does
 * not know and a box that is not one cell.
 */
export function tracesOf(rects: readonly NamedRect[]): Trace[] {
  return rectsOf(rects, TRACE_PREFIX).map((rect) => {
    const region = rect.name.slice(TRACE_PREFIX.length);
    if (densityOf(region) === undefined) {
      throw new Error(`trace ${rect.name} names no region`);
    }
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (!isCell(box)) {
      throw new Error(
        `trace ${rect.name} (${box.x}, ${box.y}, ${box.width}, ${box.height}) is not one cell`,
      );
    }
    return { region, box };
  });
}

/** Every trace of the map unseen and not found: the traces a game starts with. */
export function hiddenTraces(traces: readonly Trace[]): TraceState[] {
  return traces.map((_trace, trace) => ({ trace, light: 0, found: null }));
}

/** The traces when the figure wakes (0009): the second not begun; what was found stays found. */
export function restedTraces(states: readonly TraceState[]): TraceState[] {
  return states.map((state) => ({ ...state, light: 0 }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * In the light: the lamp is on, the trace's box, its edges included, meets the cone, and no
 * opaque box lies on the line from the centre of the figure's collision box to the nearest
 * pixel of the trace's box. `map` is the map with the shadow walls standing, as for a
 * creature: a trace is not found through a standing wall. A desk, a screen and a partition
 * are low and do not stop the light.
 */
export function traceInLight(
  trace: Trace,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): boolean {
  if (!lampOn || !meetsCone(trace.box, lampCone(player))) {
    return false;
  }
  const { box } = trace;
  const centre = { x: player.x, y: player.y - BOX_HEIGHT / 2 };
  const nearest = {
    x: clamp(centre.x, box.x, box.x + box.width - 1),
    y: clamp(centre.y, box.y, box.y + box.height - 1),
  };
  return !sightBlocked(centre, nearest, {
    width: map.width,
    height: map.height,
    solids: map.opaque,
  });
}

/**
 * One step of the traces against the stepped figure and the lamp of that step. A found trace
 * never changes. A trace in the light counts one step more, and in the step it reaches
 * FIND_STEPS it is found: `found` is `tick`, the tick of this step, and the count is 0 again.
 * A trace out of the light starts again from 0.
 */
export function stepTraces(
  states: readonly TraceState[],
  traces: readonly Trace[],
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
  tick: number,
): TraceState[] {
  return states.map((state) => {
    const trace = traces[state.trace];
    if (state.found !== null || trace === undefined) {
      return state;
    }
    if (!traceInLight(trace, player, lampOn, map)) {
      return state.light === 0 ? state : { ...state, light: 0 };
    }
    return state.light + 1 < FIND_STEPS
      ? { ...state, light: state.light + 1 }
      : { ...state, light: 0, found: tick };
  });
}

/** A region's line on the cases tab: how many of its traces on this map are found. */
export interface CaseEntry {
  readonly region: string;
  readonly found: number;
  readonly all: number;
}

/**
 * The entries of the journal's cases tab: the regions of which at least one trace is found, in
 * the order of the world data. Derived from the state and the map; kept nowhere.
 */
export function caseEntries(
  states: readonly TraceState[],
  traces: readonly Trace[],
  regions: readonly Region[] = REGIONS,
): CaseEntry[] {
  return regions.flatMap(({ id }) => {
    const mine = states.filter((state) => traces[state.trace]?.region === id);
    const found = mine.filter((state) => state.found !== null).length;
    return found === 0 ? [] : [{ region: id, found, all: mine.length }];
  });
}
```

- [ ] **Step 9: Start, step and rest the traces,** in `src/game/update.ts` and
  `src/game/overview.ts`. Update the two doc comments of `update.ts` too: the initial state
  has every trace of the map unseen and not found; an ordinary step steps the traces against
  the stepped figure, on the map with the walls standing at the start of the step (0022).

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -9,6 +9,7 @@
 import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
 import { type GameState, type LampState, NO_RECOIL, type PlayerState } from './state';
 import { openDialogue, speakersOf, stepDialogue } from './talk';
+import { hiddenTraces, stepTraces, tracesOf } from './trace';
 import { BASE_STRENGTH } from './world';
 
 /**
@@ -44,6 +45,7 @@
     creatures: creaturesFrom(map.points),
     movers: moversFrom(routes),
     shadowWalls: standingWalls(walls),
+    traces: hiddenTraces(tracesOf(map.rects)),
     figures: figuresFrom(figures),
     dialogue: null,
     journal: null,
@@ -121,6 +123,15 @@
     movers: stepMovers(state.movers, routes, player),
     // The light on a wall is tested against the map as loaded: a wall does not block itself.
     shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content),
+    // A trace is tested against the map with the walls standing: none is found through one.
+    traces: stepTraces(
+      state.traces,
+      tracesOf(content.rects),
+      stepped,
+      lamp.on,
+      walled,
+      state.tick + 1,
+    ),
     figures: state.figures,
     dialogue: null,
     journal: null,
```

```diff
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -10,6 +10,7 @@
   type PlayerState,
   type Recoil,
 } from './state';
+import { restedTraces } from './trace';
 
 /**
  * Overview (gameplay.md §4, feature 0009): the hit of a free creature, the push and the safe
@@ -141,6 +142,7 @@
     })),
     movers: state.movers,
     shadowWalls: restedWalls(state.shadowWalls),
+    traces: restedTraces(state.traces),
     figures: state.figures,
     dialogue: null,
     journal: null,
```

- [ ] **Step 10: The notice of a find,** in `src/game/notice.ts`:

```diff
--- a/src/game/notice.ts
+++ b/src/game/notice.ts
@@ -4,18 +4,30 @@
 /**
  * The notice (gameplay.md §2, feature 0016): one line the game itself says, shown at the
  * bottom of the screen while its cause lasts. Derived from the state in every frame and kept
- * nowhere — the state has no field for it. There is one notice. Pure.
+ * nowhere — the state has no field for it. One notice is shown at a time. Pure.
  */
 
 /** A shadow wall holds against the lamp: its density is above the lamp's strength (0014). */
 export const NOTICE_SHADOW_TOO_DENSE: TextKey = textKey('notice.shadow-too-dense');
 
+/** A trace was found and is in the journal now (0022). */
+export const NOTICE_TRACE_FOUND: TextKey = textKey('notice.trace-found');
+/** Tune: two seconds from the find. */
+export const TRACE_NOTICE_STEPS = 120;
+
 /**
  * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
- * is on and cannot lift: a wall that gives way counts from 1 in its first step. In the dark
- * the lamp is off, so there is no notice.
+ * is on and cannot lift: a wall that gives way counts from 1 in its first step; that notice
+ * comes first. Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was found
+ * (0022).
  */
 export function noticeOf(state: GameState): TextKey | null {
   const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
-  return state.lamp.on && holds ? NOTICE_SHADOW_TOO_DENSE : null;
+  if (state.lamp.on && holds) {
+    return NOTICE_SHADOW_TOO_DENSE;
+  }
+  const found = state.traces.some(
+    (trace) => trace.found !== null && state.tick - trace.found < TRACE_NOTICE_STEPS,
+  );
+  return found ? NOTICE_TRACE_FOUND : null;
 }
```

- [ ] **Step 11: The five traces of the floor,** in `tools/floor-layout.ts`, then
  `npm run gen-floor`. The generator appends five rectangles after the figure's point.

```diff
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -213,7 +213,25 @@
  */
 export const FIGURES: readonly { readonly id: string; readonly at: Point }[] = [
   { id: 'officer', at: { x: 264, y: 472 } },
+];
+
+/**
+ * The traces (0022): per trace its region and the cell of the device it lies on. Five in
+ * Sales, each on the desk with a screen of a cubicle, spread over the room with at least one
+ * in every row of cubicles. The order is the order in the file.
+ */
+export const TRACES: readonly { readonly region: string; readonly cell: Point }[] = [
+  { region: 'sales', cell: { x: 83, y: 28 } },
+  { region: 'sales', cell: { x: 98, y: 28 } },
+  { region: 'sales', cell: { x: 93, y: 34 } },
+  { region: 'sales', cell: { x: 88, y: 40 } },
+  { region: 'sales', cell: { x: 98, y: 46 } },
 ];
+
+/** The box of a trace in map pixels: its cell. */
+export function traceBox(cell: Point): Box {
+  return { x: cell.x * TILE_SIZE, y: cell.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
+}
 
 /**
  * The routes of the movers (0015): per route its points as [column, row, pause in steps]; a
@@ -1122,6 +1140,7 @@
   const routes = routePoints();
   const firstWall = SNIPPETS.length + 3 + routes.length;
   const firstFigure = firstWall + SHADOW_WALLS.length;
+  const firstTrace = firstFigure + FIGURES.length;
   return {
     compressionlevel: -1,
     height: FLOOR_HEIGHT,
@@ -1147,6 +1166,9 @@
           ...FIGURES.map((figure, i) =>
             pointObject(firstFigure + i, `figure:${figure.id}`, figure.at),
           ),
+          ...TRACES.map((trace, i) =>
+            rectObject(firstTrace + i, `trace:${trace.region}`, traceBox(trace.cell)),
+          ),
         ],
         opacity: 1,
         type: 'objectgroup',
@@ -1156,7 +1178,7 @@
       },
     ],
     nextlayerid: 5,
-    nextobjectid: firstFigure + FIGURES.length,
+    nextobjectid: firstTrace + TRACES.length,
     orientation: 'orthogonal',
     renderorder: 'right-down',
     tiledversion: '1.11.2',
```

  `git diff --stat public/maps/floor.tmj` shows one file changed: the five objects with the
  ids 101 to 105 and `nextobjectid` 106, nothing else.

- [ ] **Step 12: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/trace.test.ts tests/unit/floor.test.ts tests/unit/state.test.ts`
Expected: PASS — `trace.test.ts` has 30 tests. Then `npm run test`: 972 tests, every file
green. The digest test of 0020 in `journal.test.ts` still holds: the traces change nothing
else in the world.

- [ ] **Step 13:** `npm run check`, then commit —
  `Find the traces of Sales with the lamp`. The body says that the rectangles of a map now
  have kinds, and that a trace is tested against the walls standing, so that none is found
  through one.

---

### Task 3: The trace's sheet, and the trace in the scene

**Files:**
- Create: `tools/placeholder-trace.ts`, `public/sprites/trace.png` (generated),
  `tests/unit/trace-sheet.test.ts`
- Modify: `tools/gen-sprites.ts`, `src/render/draw-scene.ts`, `src/main.ts`
- Test: `tests/unit/assets.test.ts`, `tests/unit/draw-scene.test.ts`,
  `tests/unit/draw-journal.test.ts`

**Interfaces:**
- Consumes: `TraceState`, `tracesOf`, `FIND_STEPS`.
- Produces, in `tools/placeholder-trace`: `TRACE_FRAME_SIZE`, `TRACE_FRAMES`,
  `TRACE_SHEET_WIDTH`, `TRACE_SHEET_HEIGHT`, `TRACE_SQUARES`, `traceInk(frame, i, j)`,
  `renderTrace()`; in `tools/gen-sprites`: `encodeTracePng()`.
- Produces, in `render/draw-scene`: `SceneContent.traceSheet`, `TRACE_LOOKS = 3`,
  `traceFrame(trace: TraceState): number`.

- [ ] **Step 1: Create `tests/unit/trace-sheet.test.ts`:**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { SHADOW_COLOUR } from '../../src/render/palette';
import { encodeTracePng } from '../../tools/gen-sprites.ts';
import { rgb } from '../../tools/placeholder-tiles.ts';
import {
  renderTrace,
  TRACE_FRAME_SIZE,
  TRACE_FRAMES,
  TRACE_SHEET_HEIGHT,
  TRACE_SHEET_WIDTH,
  TRACE_SQUARES,
  traceInk,
} from '../../tools/placeholder-trace.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TRACE = renderTrace();
/** Whether pixel (i, j) of frame `frame` is opaque, and that an opaque pixel is the signature colour. */
function inked(frame: number, i: number, j: number): boolean {
  const at = (j * TRACE_SHEET_WIDTH + frame * TRACE_FRAME_SIZE + i) * 4;
  const [r, g, b, a] = TRACE.slice(at, at + 4);
  if (a === 0) {
    return false;
  }
  expect([r, g, b, a]).toStrictEqual([...rgb(SHADOW_COLOUR), 255]);
  return true;
}

describe('the placeholder trace generator (0022)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeTracePng().equals(encodeTracePng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(join(ROOT, 'public/sprites/trace.png')));
    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
    expect(Buffer.from(TRACE).equals(committed.data)).toBe(true);
  });

  it('is 48x16: three 16x16 frames in one row', () => {
    expect([TRACE_SHEET_WIDTH, TRACE_SHEET_HEIGHT, TRACE_FRAME_SIZE, TRACE_FRAMES]).toStrictEqual([
      48, 16, 16, 3,
    ]);
    expect(TRACE).toHaveLength(48 * 16 * 4);
  });

  it('holds 18, 50 and 98 pixels of the signature colour, and nothing else', () => {
    expect(TRACE_SQUARES).toStrictEqual([6, 10, 14]);
    const counts = [0, 1, 2].map((frame) => {
      let count = 0;
      for (let j = 0; j < TRACE_FRAME_SIZE; j += 1) {
        for (let i = 0; i < TRACE_FRAME_SIZE; i += 1) {
          count += inked(frame, i, j) ? 1 : 0;
        }
      }
      return count;
    });
    expect(counts).toStrictEqual([18, 50, 98]);
  });

  it('draws a checkerboard inside a centred square: 6, 10 and 14 px', () => {
    // Frame 0: the square is the columns and rows 5 to 10.
    expect([traceInk(0, 5, 5), traceInk(0, 6, 5), traceInk(0, 10, 10)]).toStrictEqual([
      true,
      false,
      true,
    ]);
    expect([traceInk(0, 4, 4), traceInk(0, 11, 11)]).toStrictEqual([false, false]);
    // Frame 2: the columns and rows 1 to 14.
    expect([traceInk(2, 1, 1), traceInk(2, 14, 14), traceInk(2, 0, 0)]).toStrictEqual([
      true,
      true,
      false,
    ]);
    for (let frame = 0; frame < TRACE_FRAMES; frame += 1) {
      for (let j = 0; j < TRACE_FRAME_SIZE; j += 1) {
        for (let i = 0; i < TRACE_FRAME_SIZE; i += 1) {
          expect(inked(frame, i, j)).toBe(traceInk(frame, i, j));
        }
      }
    }
  });

  it('grows: every pixel of a frame is in the next', () => {
    for (let j = 0; j < TRACE_FRAME_SIZE; j += 1) {
      for (let i = 0; i < TRACE_FRAME_SIZE; i += 1) {
        expect(!traceInk(0, i, j) || traceInk(1, i, j)).toBe(true);
        expect(!traceInk(1, i, j) || traceInk(2, i, j)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Change the asset test and the scene tests.** The trace sheet joins the list
  of shadow assets; both scene test files give their content a `traceSheet`; a block of five
  tests is added to `draw-scene.test.ts`.

```diff
--- a/tests/unit/assets.test.ts
+++ b/tests/unit/assets.test.ts
@@ -9,10 +9,11 @@
 
 const ROOT = fileURLToPath(new URL('../../', import.meta.url));
 const RULES = { palette: new Set<string>(ENDESGA_32), reserved: SHADOW_COLOUR };
-/** The shadow assets: the only files that may use the reserved colour (visual.md §4, 0008, 0014). */
+/** The shadow assets: the only files that may use the reserved colour (visual.md §4, 0008, 0014, 0022). */
 const SHADOW_ASSETS: ReadonlySet<string> = new Set([
   'public/sprites/snippet.png',
   'public/sprites/shadow-wall.png',
+  'public/sprites/trace.png',
 ]);
 const rulesFor = (file: string) => ({
   ...RULES,
@@ -84,9 +85,11 @@
     expect(checkPng('x.png', violet, rulesFor('public/sprites/player.png'))).toStrictEqual([
       'x.png: pixel (0, 0) uses the reserved shadow colour #68386c',
     ]);
+    expect(checkPng('x.png', violet, rulesFor('public/sprites/trace.png'))).toStrictEqual([]);
     expect([...SHADOW_ASSETS]).toStrictEqual([
       'public/sprites/snippet.png',
       'public/sprites/shadow-wall.png',
+      'public/sprites/trace.png',
     ]);
   });
 
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -63,6 +63,7 @@
   creatureSheets: { snippet: sheet(16, 16) },
   overviewSheet: sheet(8, 8),
   shadowWallSheet: sheet(16, 16),
+  traceSheet: sheet(16, 16),
   moverSheets: {
     person: [0, 1, 2, 3].map(() => sheet(16, 24)),
     dog: sheet(16, 16),
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -40,6 +40,8 @@
   playerVisible,
   type SceneContent,
   type SceneSettings,
+  TRACE_LOOKS,
+  traceFrame,
   wallLook,
   wallSegments,
 } from '../../src/render/draw-scene';
@@ -95,6 +97,7 @@
   creatureSheets: { snippet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 } },
   overviewSheet: { image: {} as ImageBitmap, frameWidth: 8, frameHeight: 8 },
   shadowWallSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
+  traceSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
   moverSheets: {
     person: [0, 1, 2, 3].map(() => ({
       image: {} as ImageBitmap,
@@ -1042,6 +1045,65 @@
     expect(renderer.calls.slice(-2)).toStrictEqual([
       'fillRect 0,0 320x30 #181425',
       'fillRect 0,150 320x30 #181425',
+    ]);
+  });
+});
+
+describe('the traces in the scene (0022)', () => {
+  /** A wall strip under cell (0, 0) and a trace on cell (1, 0) of the 3x2 map. */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...MAP,
+      rects: [
+        { name: 'shadow:marketing', x: 0, y: 16, width: 16, height: 4 },
+        { name: 'trace:sales', x: 16, y: 0, width: 16, height: 16 },
+      ],
+    },
+  };
+  const seen = (light: number, found: number | null = null): GameState => ({
+    ...state({ x: 20, y: 30 }),
+    shadowWalls: [{ wall: 0, lit: false, light: 0 }],
+    traces: [{ trace: 0, light, found }],
+    movers: [mover({ kind: 'dog', x: 60, y: 10 })],
+  });
+
+  it('has three looks, one per third of a second', () => {
+    expect(TRACE_LOOKS).toBe(3);
+    expect(
+      [1, 20, 21, 40, 41, 59].map((light) => traceFrame({ trace: 0, light, found: null })),
+    ).toStrictEqual([0, 0, 1, 1, 2, 2]);
+  });
+
+  it('draws a trace the light is on at its cell, after the walls and before the movers', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, seen(21), content);
+    expect(renderer.sheets).toStrictEqual([
+      content.shadowWallSheet,
+      content.traceSheet,
+      content.moverSheets.dog,
+      content.playerSheet,
     ]);
+    expect(renderer.calls).toContain('drawSprite 1 at 16,0');
   });
+
+  it('shifts it by the camera', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, { ...seen(59), camera: { x: 5, y: 7 } }, content);
+    expect(renderer.calls).toContain('drawSprite 2 at 11,-7');
+  });
+
+  it('draws no trace the light is not on, and none that is found', () => {
+    for (const scene of [seen(0), seen(0, 60)]) {
+      const renderer = recordingRenderer();
+      drawScene(renderer, scene, content);
+      expect(renderer.sheets).not.toContain(content.traceSheet);
+    }
+  });
+
+  it('draws no trace the map does not have', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, { ...seen(21), shadowWalls: [] }, CONTENT);
+    expect(renderer.sheets).not.toContain(CONTENT.traceSheet);
+  });
 });
```

- [ ] **Step 3: Run and see it fail.**

Run: `npm run typecheck`
Expected: errors — `tools/placeholder-trace.ts` does not exist, `encodeTracePng`,
`TRACE_LOOKS` and `traceFrame` are not exported, `traceSheet` is no property of
`SceneContent`.

- [ ] **Step 4: Create `tools/placeholder-trace.ts`:**

```ts
import { SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder trace sheet (visual.md §4, feature 0022): shadow residue on a device, three
 * 16x16 frames in one row — the trace as it grows in the lamp's light. Frame k holds a
 * checkerboard in the signature colour inside a centred square of 6, 10 and 14 px; everything
 * else is transparent. The third shadow asset. Pure — it returns pixels; tools/gen-sprites.ts
 * writes the file.
 */

export const TRACE_FRAME_SIZE = 16;
export const TRACE_FRAMES = 3;
export const TRACE_SHEET_WIDTH = TRACE_FRAMES * TRACE_FRAME_SIZE;
export const TRACE_SHEET_HEIGHT = TRACE_FRAME_SIZE;
/** The side of the square of each frame: 18, 50 and 98 pixels of the checkerboard. */
export const TRACE_SQUARES = [6, 10, 14] as const;

/** Whether pixel (i, j) of frame `frame` is residue. */
export function traceInk(frame: number, i: number, j: number): boolean {
  const side = TRACE_SQUARES[frame] ?? 0;
  const first = (TRACE_FRAME_SIZE - side) / 2;
  const inside = i >= first && i < first + side && j >= first && j < first + side;
  return inside && (i + j) % 2 === 0;
}

/** RGBA, row-major, TRACE_SHEET_WIDTH × TRACE_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderTrace(): Uint8Array {
  const data = new Uint8Array(TRACE_SHEET_WIDTH * TRACE_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < TRACE_FRAMES; frame += 1) {
    for (let j = 0; j < TRACE_FRAME_SIZE; j += 1) {
      for (let i = 0; i < TRACE_FRAME_SIZE; i += 1) {
        if (traceInk(frame, i, j)) {
          data.set(
            [...rgb(SHADOW_COLOUR), 255],
            (j * TRACE_SHEET_WIDTH + frame * TRACE_FRAME_SIZE + i) * 4,
          );
        }
      }
    }
  }
  return data;
}
```

- [ ] **Step 5: Write the sheet with the others,** in `tools/gen-sprites.ts`, then
  `npm run gen-sprites`. Only `public/sprites/trace.png` is new; no other sheet changes.

```diff
--- a/tools/gen-sprites.ts
+++ b/tools/gen-sprites.ts
@@ -17,6 +17,7 @@
   WALL_SHEET_WIDTH,
 } from './placeholder-shadow-wall.ts';
 import { renderSnippet, SNIPPET_SHEET_HEIGHT, SNIPPET_SHEET_WIDTH } from './placeholder-snippet.ts';
+import { renderTrace, TRACE_SHEET_HEIGHT, TRACE_SHEET_WIDTH } from './placeholder-trace.ts';
 import { renderVacuum, VACUUM_SHEET_HEIGHT, VACUUM_SHEET_WIDTH } from './placeholder-vacuum.ts';
 
 /**
@@ -28,7 +29,8 @@
  * vacuum.png and drone.png from tools/placeholder-dog.ts, -vacuum.ts and -drone.ts; and
  * public/sprites/shadow-wall.png of 0014 from tools/placeholder-shadow-wall.ts; and
  * public/sprites/font.png of 0016 from tools/placeholder-font.ts; and public/sprites/officer.png
- * of 0017 from tools/placeholder-person.ts. Deterministic — pngjs writes no timestamp — and Node
+ * of 0017 from tools/placeholder-person.ts; and public/sprites/trace.png of 0022 from
+ * tools/placeholder-trace.ts. Deterministic — pngjs writes no timestamp — and Node
  * runs this TypeScript file directly, without a transpiler.
  */
 
@@ -100,6 +102,12 @@
   return PNG.sync.write(png);
 }
 
+export function encodeTracePng(): Buffer {
+  const png = new PNG({ width: TRACE_SHEET_WIDTH, height: TRACE_SHEET_HEIGHT });
+  png.data = Buffer.from(renderTrace());
+  return PNG.sync.write(png);
+}
+
 if (import.meta.main) {
   mkdirSync('public/sprites', { recursive: true });
   writeFileSync('public/sprites/player.png', encodePng());
@@ -115,4 +123,5 @@
   writeFileSync('public/sprites/shadow-wall.png', encodeShadowWallPng());
   writeFileSync('public/sprites/font.png', encodeFontPng());
   writeFileSync('public/sprites/officer.png', encodeOfficerPng());
+  writeFileSync('public/sprites/trace.png', encodeTracePng());
 }
```

- [ ] **Step 6: Draw the traces,** in `src/render/draw-scene.ts`, and load the sheet in
  `src/main.ts`:

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -17,8 +17,10 @@
   type PlayerState,
   type ShadowWallState,
   type Species,
+  type TraceState,
 } from '../game/state';
 import { speakerOf, speakersOf } from '../game/talk';
+import { FIND_STEPS, tracesOf } from '../game/trace';
 import { type Language, textKey, textOf } from '../text/text';
 import { drawJournal } from './draw-journal';
 import { drawLayer } from './draw-map';
@@ -46,6 +48,8 @@
   readonly overviewSheet: SpriteSheet;
   /** Sixteen 16x16 frames: orientation × 8 + look (0014). */
   readonly shadowWallSheet: SpriteSheet;
+  /** Three 16x16 frames: a trace as it grows in the light (0022). */
+  readonly traceSheet: SpriteSheet;
   /** The movers' sheets (0015): one per person, the dogs' 24 frames, two frames each for the vacuum and the drone. */
   readonly moverSheets: {
     readonly person: readonly SpriteSheet[];
@@ -239,6 +243,14 @@
   };
 }
 
+/** The trace sheet (0022) has three looks, one per third of FIND_STEPS. */
+export const TRACE_LOOKS = 3;
+
+/** The frame of a trace the light is on: ⌊(light − 1) / 20⌋ — small, larger, largest. */
+export function traceFrame(trace: TraceState): number {
+  return Math.floor(((trace.light - 1) * TRACE_LOOKS) / FIND_STEPS);
+}
+
 /** The hearts of overview (0009, 0012): 8x8, 4 px from the corner, one every 10 px. */
 export const HEART_SIZE = 8;
 export const HEART_MARGIN = 4;
@@ -310,7 +322,8 @@
 
 /**
  * One frame: ground, detail, the cone when the lamp is on, the standing shadow walls in array
- * order (0014), the ground movers whose feet are at or above the player's, then the standing
+ * order (0014), the traces the light is on (0022), the ground movers whose feet are at or above
+ * the player's, then the standing
  * figures whose feet are at or above the player's (0017), the creatures in array order, the
  * player, the other standing figures, the other ground movers, above, the drones (0015), all
  * shifted by the camera. The sprite's top-left corner is at (round(x) − 8 − camera.x,
@@ -355,6 +368,20 @@
       renderer.drawSprite(content.shadowWallSheet, frame, origin.x, origin.y);
     }
   }
+  const traces = tracesOf(content.map.rects);
+  for (const seen of state.traces) {
+    const trace = traces[seen.trace];
+    // A trace shows only while the light is on it; a found one never.
+    if (trace === undefined || seen.found !== null || seen.light === 0) {
+      continue;
+    }
+    renderer.drawSprite(
+      content.traceSheet,
+      traceFrame(seen),
+      trace.box.x - camera.x,
+      trace.box.y - camera.y,
+    );
+  }
   const figures = figuresOf(content.map.points);
   const ground = state.movers.filter((mover) => mover.kind !== 'drone');
   drawMovers(
```

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -43,6 +43,7 @@
 const VACUUM_SHEET_URL = '/sprites/vacuum.png';
 const DRONE_SHEET_URL = '/sprites/drone.png';
 const SHADOW_WALL_SHEET_URL = '/sprites/shadow-wall.png';
+const TRACE_SHEET_URL = '/sprites/trace.png';
 const FONT_SHEET_URL = '/sprites/font.png';
 
 /**
@@ -87,6 +88,11 @@
       frameWidth: TILE_SIZE,
       frameHeight: TILE_SIZE,
     },
+    traceSheet: {
+      image: await loadImage(TRACE_SHEET_URL),
+      frameWidth: TILE_SIZE,
+      frameHeight: TILE_SIZE,
+    },
     moverSheets: {
       person: await Promise.all(
         PERSON_SHEET_URLS.map(async (url) => ({
```

- [ ] **Step 7: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/trace-sheet.test.ts tests/unit/assets.test.ts tests/unit/draw-scene.test.ts`
Expected: PASS. Then `npm run test`: 983 tests.

- [ ] **Step 8:** `npm run check`, then commit — `Show a trace while the light is on it`.

---

### Task 4: Numbers, and the cases tab

**Files:**
- Modify: `src/render/draw-text.ts`, `src/render/draw-journal.ts`
- Test: `tests/unit/draw-text.test.ts`, `tests/unit/draw-journal.test.ts`

**Interfaces:**
- Consumes: `CASE_TEXT`, `REGION_NAME` of Task 1; `caseEntries`, `tracesOf` of Task 2.
- Produces, in `render/draw-text`:
  `drawNumber(renderer, font: SpriteSheet, value: number, x: number, y: number): void`.
- Produces, in `render/draw-journal`: `CASE_NAME`, `CASE_LINE`, `CASE_PITCH`.

- [ ] **Step 1: Write the failing tests.** The digits 0 to 9 are the glyphs 16 to 25.

```diff
--- a/tests/unit/draw-text.test.ts
+++ b/tests/unit/draw-text.test.ts
@@ -1,5 +1,5 @@
 import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
-import { drawText, LINE_PITCH } from '../../src/render/draw-text';
+import { drawNumber, drawText, LINE_PITCH } from '../../src/render/draw-text';
 import type { Renderer, SpriteSheet } from '../../src/render/renderer';
 import { type TextKey, textKey } from '../../src/text/text';
 
@@ -107,3 +107,28 @@
     expectTypeOf<string>().not.toExtend<TextKey>();
   });
 });
+
+describe('drawNumber (0022)', () => {
+  const drawn = (value: number, x = 64, y = 48): string[] => {
+    const { renderer, calls } = recorder();
+    drawNumber(renderer, FONT, value, x, y);
+    return calls;
+  };
+
+  it('draws the decimal digits of a whole number from the left, 6 px apart', () => {
+    // The digits 0 to 9 are the glyphs 16 to 25.
+    expect(drawn(0)).toStrictEqual(['16 at 64,48']);
+    expect(drawn(7)).toStrictEqual(['23 at 64,48']);
+    expect(drawn(10)).toStrictEqual(['17 at 64,48', '16 at 70,48']);
+    expect(drawn(123, 16, 36)).toStrictEqual(['17 at 16,36', '18 at 22,36', '19 at 28,36']);
+  });
+
+  it('takes a number and nothing else: no key, no string', () => {
+    expectTypeOf(drawNumber).parameter(2).toEqualTypeOf<number>();
+  });
+
+  it('draws a number below 0 as 0 and a fraction as its whole part', () => {
+    expect(drawn(-3)).toStrictEqual(['16 at 64,48']);
+    expect(drawn(4.9)).toStrictEqual(['20 at 64,48']);
+  });
+});
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -1,7 +1,10 @@
 import { describe, expect, it } from 'vitest';
 import { NO_INPUT } from '../../src/game/player';
-import { type GameState, type JournalTab, NO_RECOIL } from '../../src/game/state';
+import { type GameState, type JournalTab, NO_RECOIL, type TraceState } from '../../src/game/state';
 import {
+  CASE_LINE,
+  CASE_NAME,
+  CASE_PITCH,
   drawJournal,
   ENTRY_FRAME,
   ENTRY_LINES,
@@ -237,3 +240,79 @@
     expect(scene.sheets).toContain(CONTENT.overviewSheet);
   });
 });
+
+describe('the cases tab (0022)', () => {
+  /** Five traces of Sales, as on the floor; where they lie does not matter to the journal. */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...CONTENT.map,
+      rects: [0, 1, 2, 3, 4].map((n) => ({
+        name: 'trace:sales',
+        x: 16 * n,
+        y: 0,
+        width: 16,
+        height: 16,
+      })),
+    },
+  };
+  const traces = (found: number): TraceState[] =>
+    [0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: trace < found ? 60 : null }));
+  const cases = (found: number, settings = GERMAN): string[] => {
+    const renderer = recordingRenderer();
+    const state: GameState = { ...reading('cases'), traces: traces(found) };
+    drawJournal(renderer, state, { tab: 'cases' }, content, settings);
+    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
+  };
+
+  it('places a case as the spec says', () => {
+    expect([CASE_NAME, CASE_LINE, CASE_PITCH]).toStrictEqual([
+      { x: 16, y: 36 },
+      { x: 16, y: 48 },
+      36,
+    ]);
+  });
+
+  it('shows its line for nothing while no trace is found', () => {
+    expect(cases(0)).toStrictEqual(
+      draw(reading('cases')).calls.slice(draw(reading('cases')).calls.indexOf(RULE) + 1),
+    );
+    expect(cases(0)[0]).toBe('drawSprite 46 at 16,36');
+  });
+
+  it('shows the region and `Spuren: 1 von 5` with one of five found', () => {
+    const entry = cases(1);
+    // `Vertrieb` 8 glyphs, `Spuren:` 7, `1`, `von` 3, `5`.
+    expect(entry).toHaveLength(8 + 7 + 1 + 3 + 1);
+    expect(entry[0]).toBe('drawSprite 54 at 16,36');
+    expect(entry[8]).toBe('drawSprite 51 at 16,48');
+    expect(entry[15]).toBe('drawSprite 17 at 64,48');
+    expect(entry[16]).toBe('drawSprite 86 at 76,48');
+    expect(entry[19]).toBe('drawSprite 21 at 100,48');
+  });
+
+  it('counts up to `5 von 5`', () => {
+    const entry = cases(5);
+    expect(entry[15]).toBe('drawSprite 21 at 64,48');
+    expect(entry[19]).toBe('drawSprite 21 at 100,48');
+  });
+
+  it('reads `Sales` and `Traces: 2 of 5` in English', () => {
+    const entry = cases(2, ENGLISH);
+    // `Sales` 5 glyphs, `Traces:` 7, `2`, `of` 2, `5`.
+    expect(entry).toHaveLength(5 + 7 + 1 + 2 + 1);
+    expect(entry[0]).toBe('drawSprite 51 at 16,36');
+    expect(entry[5]).toBe('drawSprite 52 at 16,48');
+    expect(entry[12]).toBe('drawSprite 18 at 64,48');
+    expect(entry[13]).toBe('drawSprite 79 at 76,48');
+    expect(entry[15]).toBe('drawSprite 21 at 94,48');
+  });
+
+  it('leaves the creatures and the policy as they were', () => {
+    for (const tab of ['creatures', 'policy'] as const) {
+      const renderer = recordingRenderer();
+      drawJournal(renderer, { ...reading(tab), traces: traces(3) }, { tab }, content, GERMAN);
+      expect(renderer.calls).toStrictEqual(draw(reading(tab)).calls);
+    }
+  });
+});
```

- [ ] **Step 2: Run and see them fail.**

Run: `npm run typecheck`
Expected: errors — `drawNumber`, `CASE_NAME`, `CASE_LINE` and `CASE_PITCH` are not exported.

- [ ] **Step 3: Add `drawNumber`,** at the end of `src/render/draw-text.ts`:

```diff
--- a/src/render/draw-text.ts
+++ b/src/render/draw-text.ts
@@ -40,3 +40,21 @@
     column += 1;
   }
 }
+
+/**
+ * A whole number of 0 or more (0022): its decimal digits from the left, digit n with its
+ * top-left corner at (x + 6n, y). It takes a number and nothing else — a number is no text of
+ * a language and needs no key (INV-4); words still go through `drawText`.
+ */
+export function drawNumber(
+  renderer: Renderer,
+  font: SpriteSheet,
+  value: number,
+  x: number,
+  y: number,
+): void {
+  const digits = String(Math.max(0, Math.floor(value)));
+  for (const [n, digit] of [...digits].entries()) {
+    renderer.drawSprite(font, glyphIndex(digit), x + n * GLYPH_WIDTH, y);
+  }
+}
```

- [ ] **Step 4: Draw the cases,** in `src/render/draw-journal.ts`:

```diff
--- a/src/render/draw-journal.ts
+++ b/src/render/draw-journal.ts
@@ -1,9 +1,10 @@
 import type { Box, Point } from '../engine/tiled';
-import { ENTRY_TEXT, entriesOf, TAB_TEXT } from '../game/journal';
+import { CASE_TEXT, ENTRY_TEXT, entriesOf, REGION_NAME, TAB_TEXT } from '../game/journal';
 import { type GameState, JOURNAL_TABS, type JournalState } from '../game/state';
-import { textOf } from '../text/text';
+import { caseEntries, tracesOf } from '../game/trace';
+import { type TextKey, textOf } from '../text/text';
 import type { SceneContent, SceneSettings } from './draw-scene';
-import { drawText } from './draw-text';
+import { drawNumber, drawText } from './draw-text';
 import { GLYPH_WIDTH } from './font';
 import { PAGE_BACKGROUND, type PaletteColour } from './palette';
 import type { Renderer } from './renderer';
@@ -35,6 +36,10 @@
 export const ENTRY_PITCH = 72;
 /** The creature as the light shows it: the frozen frame of its sheet. */
 export const ENTRY_FRAME = 2;
+/** A case k, from 0, starts CASE_PITCH below case k − 1: the region's name, then its traces (0022). */
+export const CASE_NAME: Point = { x: 16, y: 36 };
+export const CASE_LINE: Point = { x: 16, y: 48 };
+export const CASE_PITCH = 36;
 
 /** The rectangle of tab k. */
 export function tabBox(k: number): Box {
@@ -79,9 +84,11 @@
     JOURNAL_RULE.height,
     TAB_OPEN,
   );
-  // Only the creatures have entries so far; the cases and the policy come with M5.
   const entries = journal.tab === 'creatures' ? entriesOf(state.captured) : [];
-  if (entries.length === 0) {
+  // The cases are the regions with a found trace (0022); the policy comes with M5.
+  const cases =
+    journal.tab === 'cases' ? caseEntries(state.traces, tracesOf(content.map.rects)) : [];
+  if (entries.length === 0 && cases.length === 0) {
     drawText(
       renderer,
       content.fontSheet,
@@ -92,6 +99,28 @@
     );
     return;
   }
+  for (const [k, entry] of cases.entries()) {
+    const down = k * CASE_PITCH;
+    const name = REGION_NAME[entry.region];
+    if (name !== undefined) {
+      drawText(renderer, content.fontSheet, name, language, CASE_NAME.x, CASE_NAME.y + down);
+    }
+    // `Spuren: 1 von 5`: four parts, one empty cell between two.
+    let x = CASE_LINE.x;
+    const y = CASE_LINE.y + down;
+    const word = (key: TextKey): void => {
+      drawText(renderer, content.fontSheet, key, language, x, y);
+      x += (textOf(key, language).length + 1) * GLYPH_WIDTH;
+    };
+    const count = (value: number): void => {
+      drawNumber(renderer, content.fontSheet, value, x, y);
+      x += (String(value).length + 1) * GLYPH_WIDTH;
+    };
+    word(CASE_TEXT.traces);
+    count(entry.found);
+    word(CASE_TEXT.of);
+    count(entry.all);
+  }
   for (const [k, species] of entries.entries()) {
     const down = k * ENTRY_PITCH;
     const { name, text } = ENTRY_TEXT[species];
```

- [ ] **Step 5: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/draw-text.test.ts tests/unit/draw-journal.test.ts`
Expected: PASS. Then `npm run test`: 992 tests.

- [ ] **Step 6:** `npm run check`, then commit — `Count the found traces on the cases tab`.

---

### Task 5: The smoke spec

**Files:**
- Test: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Add the test** at the end of the file. It reads the whole value in one
  poll, so that nothing is read from a page that might still be loading:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -282,4 +282,14 @@
   await page.keyboard.down('KeyJ');
   await expect.poll(journal, { message: 'a second press of J closes it' }).toBeNull();
   await page.keyboard.up('KeyJ');
+});
+
+test('the floor starts with its five traces, none seen and none found', async ({ page }) => {
+  await page.goto('/');
+  // One poll for the whole value: nothing is read from a page that might still be loading.
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.traces), {
+      message: 'window.shadowAi.state.traces holds the five traces of Sales',
+    })
+    .toStrictEqual([0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: null })));
 });
```

- [ ] **Step 2: Run.**

Run: `npm run test:e2e`
Expected: PASS — twelve tests, three skipped (they need the container). This test passes at
once: Task 2 built what it checks.

- [ ] **Step 3:** `npm run check`, then commit — `Check the floor's traces in the smoke spec`.

---

### Task 6: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/architecture.md`,
  `docs/spec/visual.md`, `docs/spec/testing.md`, `README.md`

- [ ] **Step 1: `gameplay.md`.** §2: add a paragraph **As built** (feature 0022): a trace is
  residue on a device, unseen until the lamp's light is on it; in the light it shows and
  grows; after one second of unbroken light — 60 steps, the number of a capture — it is found
  and gone from the world; a break starts the second again; a trace is not found through a
  standing shadow wall; a line at the bottom says for two seconds that a trace was found.
  §6, at step 1: as built, the five traces of Sales (feature 0022). §7: the cases tab lists
  every department of which a trace is found — its name and `found of all` — and shows its
  line for nothing until then; the rest of a case comes with 0024.

- [ ] **Step 2: `world.md` §2,** at Sales: five traces lie on the screens of five of its
  sixteen cubicle desks, at least one in every row (feature 0022); the table of the spec is
  the placement until the art pass.

- [ ] **Step 3: `architecture.md`.** §1 directory list: `game/rects.ts`, `game/trace.ts`,
  `tools/placeholder-trace.ts`. §2: `traces` — one entry per trace of the map for the whole
  game, `{ trace, light, found }`; the step of a trace and when it is found; the wake rests
  them; the notice of a find is derived from `found` and `tick`. §5: the traces in the draw
  order, their frame and place; `drawNumber`; the cases tab — a case's two lines and how the
  second is composed. §6: a rectangle has a kind by the prefix of its name — `shadow:` and
  `trace:` — read through `rectsOf`; the refusals of `game/trace`, each with its message.
  §7: `trace.png`. §8: the kind `region` and its rule; a number is drawn by `drawNumber` and
  needs no key.

- [ ] **Step 4: `visual.md`.** §4: `sprites/trace.png` is the third shadow asset; the trace
  is a checkerboard in the signature colour that grows in three looks while the light is on
  it, and is not drawn otherwise — form and motion beside the colour. §3, at the journal:
  the cases tab shows a department's name and its count in two lines.

- [ ] **Step 5: `testing.md` §2.** The INV-1 row gains the round trip with a trace found.
  The INV-4 row gains the rules of the kind `region` and of the two new `journal` keys. The
  INV-6 row names three shadow assets. The INV-7 row gains: a rectangle of no known kind, a
  trace of an unknown region and a trace that is not one cell are refused, each with its
  message. §6: `traces.tmj`, if the section lists the fixtures.

- [ ] **Step 6: `README.md`:** one sentence after the one on the journal — the lamp finds
  traces on the screens of Sales, and the journal counts them (feature 0022). Say that M5
  has begun where the README names the milestone.

- [ ] **Step 7:** `npm run check`, then commit — `Move the traces into the spec`.

---

### Task 7: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [ ] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [ ] **Step 5:** tick the boxes of Tasks 1 to 7 in this file and commit —
  `Tick the full check of 0022`.

---

### Task 8: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp, `J` for the journal, `L`
  for the language. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–22 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 7, and start again at step 1.
- [ ] **Step 4:** after step 22 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–22`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0022`. A feel note that wants something
  else — a hint where to look, another time, a trace that stays, other words — becomes a new
  draft, not a change on this branch.

---

### Task 9: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 7. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M5 section, change "0022 is
  approved" to say that 0022 is implemented; commit — `Mark 0022 implemented`. The row of
  0023 stays as it is.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0022: traces`, with the walk's result and feel notes in its description, and one
  line that the branch also carries the draft of 0023 and the cut of M5. CI must be green.
  The author merges.
