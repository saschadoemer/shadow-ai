# 0024 — Implementation plan: the case of Sales

**Spec:** [`docs/features/0024-the-case-of-sales.md`](../features/0024-the-case-of-sales.md)
(approved 2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §2, §5 and §8,
`docs/spec/gameplay.md` §4, §6 and §7 and `docs/spec/testing.md` §5. **Written:** 2026-11-18
on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0023 is merged into `main` (`f235961` or later). The branch
`feature/0024-the-case-of-sales` exists, cut from that `main`, and holds an amendment of the
approved spec of 0026 and this plan. Work on it; merge the latest `main` into it before
Task 1. The specs of 0025 and 0026 are on `main`; they are approved, have no plan yet, and
are **not** built here.

**Goal:** when all five traces of Sales are found, the colleague in the pink shirt answers
honestly; the step that closes the answer solves the case — the journal shows the outcome
and the first block of the policy, and overview is six full hearts.

**Approach:** four code tasks, each green on its own. The words (T1). The cases, the solved
cases in the state and the solving step (T2) — after it the case can be solved, the hearts
grow and the notice appears, but the journal shows nothing new. The journal's two tabs (T3).
The smoke spec (T4). Then the documents (T5), the full check with the container (T6), the
walk (T7) and the pull request (T8).

**How this plan was checked:** the code and the tests of Tasks 1 to 4 were run once as a
prototype on 2026-11-18, on the source of `main` at `f235961`, and then replayed task by
task: after each of the four tasks typecheck and Biome were clean and the unit tests green —
1092, 1124, 1129 and 1129 tests (1091 before). Five smoke tests, the new one included,
passed twice against a dev server of the prototype's tree. The prototype was thrown away;
nothing of it is on the branch. If a step does not behave as written, the cause is a
difference to that state — stop and look; do not bend a test. The container was **not** run
with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `GameState.solved` is plain data: a list of `{ region, at }`. What a colleague
  says, whether a case is ready, the outcome line and the policy blocks are **derived** on
  every call from `traces`, `solved` and the map; none of it is stored.
- INV-2: `src/game/cases.ts` imports nothing from `src/render/`, uses no DOM name and not
  the type `Language`. It imports nothing from `talk.ts`; `talk.ts` imports from it.
- INV-4: the six strings live in `src/text/de.ts` and `src/text/en.ts`; `cases.ts` holds
  keys.
- The solving step is the step that closes the source's answer. It changes `tick`, `held`,
  `dialogue`, `solved` and `overview` and nothing else. No other step solves a case.
- The order of `update` stays: the dark, the help, the journal, a dialogue, the opening of
  the journal, the opening of a dialogue, the ordinary step. The help of 0021 still freezes
  an open dialogue.
- The scene must look the pages up with the same progress as `update`: both pass
  `progressOf(state, map)` to `speakersOf`. If only one of them did, the box would show a
  page the dialogue does not have.
- No tile changes, no map changes, no new sprite. The region's colours, its wall and its
  creatures are 0025.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or
  `afterEach`: Biome reads it as a duplicate test hook.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: the source is the route `person:sales`; the case is
  ready when the map has a trace of `sales` and all are found; solving gives
  `{ current: max + 1, max: max + 1 }`; `CASE_NOTICE_STEPS` 120; the notices in the order
  wall, case, trace; the outcome from (16, 60 + 36k); a policy block from (16, 36 + 60k)
  with the line pitch of 12.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | six keys: `talk.sales-source-1`, `talk.sales-source-2`, `talk.sales-after`, `case.sales-outcome`, `policy.sales`, `notice.case-solved` |
| `src/game/cases.ts` | new: `Case`, `CASES`, `CASE_OVERVIEW`, `Progress`, `progressOf`, `isSolved`, `isReady`, `pagesIn`, `answeredCase`, `solve`, `policyBlocks`, `outcomeOf` |
| `src/game/state.ts` | `SolvedCase`; `GameState.solved` |
| `src/game/talk.ts` | `speakersOf` takes the progress of the cases |
| `src/game/update.ts`, `src/game/overview.ts` | `solved` starts empty, is kept, and grows in the solving step |
| `src/game/notice.ts` | `NOTICE_CASE_SOLVED`, `CASE_NOTICE_STEPS` |
| `src/render/draw-scene.ts` | the dialogue's page with the progress of the cases |
| `src/render/draw-journal.ts` | `CASE_OUTCOME`, `POLICY_BLOCK`, `POLICY_PITCH`; the outcome line and the policy tab |
| `tests/fixtures/maps/case.tmj` | new fixture |
| `tests/unit/cases.test.ts` | new |
| `tests/unit/text.test.ts`, `state.test.ts`, `floor.test.ts`, `overview.test.ts`, `draw-scene.test.ts`, `draw-help.test.ts`, `draw-journal.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 5 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the six text ids of the file structure, in both languages.

- [x] **Step 1: Write the failing test,** and widen the rule test to the kinds `case` and
  `policy`:

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -170,19 +170,82 @@
     ]);
   });
 
-  it('holds every text of the journal to the rule of its kind (0020, 0022)', () => {
+  it('holds the words of the case of Sales in both languages (0024)', () => {
+    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
+      textOf(textKey(id), language).split('\n');
+    expect(lines('talk.sales-source-1', 'de')).toStrictEqual([
+      'Das ist von meinem Bildschirm, ich weiß.',
+      'Ich habe die Angebote in einen Chatbot kopiert,',
+      'damit sie besser klingen – drei bis zum Abend.',
+    ]);
+    expect(lines('talk.sales-source-1', 'en')).toStrictEqual([
+      'That is from my screen, I know.',
+      'I pasted the offers into a chatbot to make',
+      'them sound better – three due by tonight.',
+    ]);
+    expect(lines('talk.sales-source-2', 'de')).toStrictEqual([
+      'Wohin der Text damit geht, habe ich mir nicht',
+      'überlegt.',
+    ]);
+    expect(lines('talk.sales-source-2', 'en')).toStrictEqual([
+      'Where the text goes from there, I never',
+      'thought about.',
+    ]);
+    expect(lines('talk.sales-after', 'de')).toStrictEqual([
+      'Danke, dass du gefragt hast statt zu schimpfen.',
+      'Sag mir einfach, womit ich es beim nächsten Mal',
+      'machen darf.',
+    ]);
+    expect(lines('talk.sales-after', 'en')).toStrictEqual([
+      'Thanks for asking instead of telling me off.',
+      'Just tell me what I may use for it',
+      'next time.',
+    ]);
+    expect(lines('case.sales-outcome', 'de')).toStrictEqual([
+      'Gelöst: Angebote gingen in einen Chatbot.',
+    ]);
+    expect(lines('case.sales-outcome', 'en')).toStrictEqual([
+      'Solved: offers went into a chatbot.',
+    ]);
+    expect(lines('policy.sales', 'de')).toStrictEqual([
+      'Jeder Text hat eine Stufe: offen, intern oder',
+      'vertraulich. Vertrauliches bleibt in den',
+      'Werkzeugen, die wir freigegeben haben. Und wer',
+      'unsicher ist, fragt – ohne Ärger.',
+    ]);
+    expect(lines('policy.sales', 'en')).toStrictEqual([
+      'Every text has a level: open, internal or',
+      'confidential. Confidential text stays in tools',
+      'we have approved. And whoever is unsure',
+      'asks – without trouble.',
+    ]);
+    expect(lines('notice.case-solved', 'de')).toStrictEqual([
+      'Der Fall ist gelöst. Sieh ins Journal.',
+    ]);
+    expect(lines('notice.case-solved', 'en')).toStrictEqual([
+      'The case is solved. See the journal.',
+    ]);
+  });
+
+  it('holds every text of the journal to the rule of its kind (0020, 0022, 0024)', () => {
     /** The most lines and the most characters per line a key may have, by what its id starts or ends with. */
     const rules: readonly (readonly [(id: string) => boolean, number, number, number])[] = [
       [(id) => id.startsWith('journal.tab-'), 1, 1, 16],
       [(id) => id.startsWith('journal.no-'), 1, 1, 47],
       [(id) => id === 'journal.traces' || id === 'journal.of', 1, 1, 16],
       [(id) => id.startsWith('region.'), 1, 1, 24],
+      [(id) => id.startsWith('case.') && id.endsWith('-outcome'), 1, 1, 47],
+      [(id) => id.startsWith('policy.'), 2, 4, 47],
       [(id) => id.startsWith('creature.') && id.endsWith('-name'), 1, 1, 24],
       [(id) => id.startsWith('creature.') && id.endsWith('-text'), 2, 4, 47],
     ];
     for (const language of LANGUAGES) {
       for (const [key, text] of Object.entries(TABLE[language])) {
-        if (!['journal.', 'creature.', 'region.'].some((kind) => key.startsWith(kind))) {
+        if (
+          !['journal.', 'creature.', 'region.', 'case.', 'policy.'].some((kind) =>
+            key.startsWith(kind),
+          )
+        ) {
           continue;
         }
         const rule = rules.find(([applies]) => applies(key));
```

- [x] **Step 2: Run it and see it fail.**

Run: `npx vitest run tests/unit/text.test.ts`
Expected: the new test FAILS — the ids do not exist. `npm run typecheck` fails too.

- [x] **Step 3: Add the strings.** The dash is `–`.

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -64,6 +64,25 @@
     'Die Hälfte davon in Sprachen, die hier',
     'keiner spricht. Irgendwie geht es immer.',
   ].join('\n'),
+  'talk.sales-source-1': [
+    'Das ist von meinem Bildschirm, ich weiß.',
+    'Ich habe die Angebote in einen Chatbot kopiert,',
+    'damit sie besser klingen – drei bis zum Abend.',
+  ].join('\n'),
+  'talk.sales-source-2': ['Wohin der Text damit geht, habe ich mir nicht', 'überlegt.'].join('\n'),
+  'talk.sales-after': [
+    'Danke, dass du gefragt hast statt zu schimpfen.',
+    'Sag mir einfach, womit ich es beim nächsten Mal',
+    'machen darf.',
+  ].join('\n'),
+  'case.sales-outcome': 'Gelöst: Angebote gingen in einen Chatbot.',
+  'policy.sales': [
+    'Jeder Text hat eine Stufe: offen, intern oder',
+    'vertraulich. Vertrauliches bleibt in den',
+    'Werkzeugen, die wir freigegeben haben. Und wer',
+    'unsicher ist, fragt – ohne Ärger.',
+  ].join('\n'),
+  'notice.case-solved': 'Der Fall ist gelöst. Sieh ins Journal.',
   'talk.sales-everyday': [
     'Drei Angebote bis heute Abend, und jedes soll',
     'klingen, als hätte ich eine Woche Zeit gehabt.',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -60,6 +60,25 @@
     'Half of them in languages nobody here',
     'speaks. Somehow it always works out.',
   ].join('\n'),
+  'talk.sales-source-1': [
+    'That is from my screen, I know.',
+    'I pasted the offers into a chatbot to make',
+    'them sound better – three due by tonight.',
+  ].join('\n'),
+  'talk.sales-source-2': ['Where the text goes from there, I never', 'thought about.'].join('\n'),
+  'talk.sales-after': [
+    'Thanks for asking instead of telling me off.',
+    'Just tell me what I may use for it',
+    'next time.',
+  ].join('\n'),
+  'case.sales-outcome': 'Solved: offers went into a chatbot.',
+  'policy.sales': [
+    'Every text has a level: open, internal or',
+    'confidential. Confidential text stays in tools',
+    'we have approved. And whoever is unsure',
+    'asks – without trouble.',
+  ].join('\n'),
+  'notice.case-solved': 'The case is solved. See the journal.',
   'talk.sales-everyday': [
     'Three offers by tonight, and each one should',
     'sound as if I had had a week for it.',
```

- [x] **Step 4: Run the tests.**

Run: `npx vitest run tests/unit/text.test.ts tests/unit/font.test.ts tests/unit/draw-scene.test.ts`
Expected: PASS — the three pages of talk obey the page rule, the notice fits the bar, every
character has a glyph. `npm run test`: 1092 tests.

- [x] **Step 5:** `npm run check`, then commit — `Give the case of Sales its words`.

---

### Task 2: The cases, and the step that solves one

After this task the case can be solved: the hearts grow and the notice appears. The journal
shows nothing of it yet.

**Files:**
- Create: `src/game/cases.ts`, `tests/unit/cases.test.ts`, `tests/fixtures/maps/case.tmj`
- Modify: `src/game/state.ts`, `src/game/talk.ts`, `src/game/update.ts`,
  `src/game/overview.ts`, `src/game/notice.ts`, `src/render/draw-scene.ts`
- Test: `tests/unit/state.test.ts`, `floor.test.ts`, `overview.test.ts`,
  `draw-scene.test.ts`, `draw-help.test.ts`, `draw-journal.test.ts`

**Interfaces:**
- Consumes: the six text ids of Task 1; `Trace`, `tracesOf` of `game/trace`; `Route` of
  `game/mover`.
- Produces, in `game/state`: `interface SolvedCase { region: string; at: number }`;
  `GameState.solved: readonly SolvedCase[]`.
- Produces, in `game/cases`: `interface Case`, `CASES`, `CASE_OVERVIEW = 1`,
  `interface Progress { traces; places; solved }`, `progressOf(state, map): Progress`,
  `isSolved(region, solved)`, `isReady(region, progress)`,
  `pagesIn(progress, route, everyday, cases?): readonly TextKey[]`,
  `answeredCase(dialogue, state, routes, progress, cases?): Case | null`,
  `solve(state, region): GameState`, `policyBlocks(solved, cases?): TextKey[]`,
  `outcomeOf(region, solved, cases?): TextKey | null`.
- Produces, in `game/talk`: `speakersOf(figures, movers, routes, colleagues?, progress?)`.
- Produces, in `game/notice`: `NOTICE_CASE_SOLVED`, `CASE_NOTICE_STEPS = 120`.

- [x] **Step 1: Create the fixture** `tests/fixtures/maps/case.tmj` from `figures.tmj` with a
  one-off script. Do not commit the script. Run from the repository root:

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';

const map = JSON.parse(readFileSync('tests/fixtures/maps/figures.tmj', 'utf8'));
const object = (id, name, x, y, width, height, pause) => ({
  height,
  id,
  name,
  ...(width === 0 ? { point: true } : {}),
  ...(pause === undefined ? {} : { properties: [{ name: 'pause', type: 'int', value: pause }] }),
  rotation: 0,
  type: '',
  visible: true,
  width,
  x,
  y,
});
const objects = map.layers.find((layer) => layer.type === 'objectgroup');
objects.objects = [
  object(1, 'spawn', 104, 48, 0, 0),
  object(2, 'person:sales:1', 64, 48, 0, 0, 600),
  object(3, 'person:sales:2', 128, 48, 0, 0),
  object(4, 'trace:sales', 160, 80, 16, 16),
  object(5, 'trace:sales', 192, 80, 16, 16),
];
map.nextobjectid = 6;
const text = JSON.stringify(map, null, 2).replace(
  /"data": \[[^\]]*\]/,
  (data) => data.replace(/\s+/g, ' ').replace('[ ', '[').replace(' ]', ']'),
);
writeFileSync('tests/fixtures/maps/case.tmj', `${text}\n`);
EOF
```

  It holds five objects, ids 1 to 5, `nextobjectid` 6: the point `spawn` (104, 48); the
  route `person:sales` with point 1 at (64, 48), pause 600, and point 2 at (128, 48); and
  two rectangles `trace:sales`, (160, 80, 16, 16) and (192, 80, 16, 16).

- [x] **Step 2: Create `tests/unit/cases.test.ts`.** Its ready state stands at step 1000
  with both traces found long ago, so that no notice of a find is due.

```ts
import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import {
  answeredCase,
  CASE_OVERVIEW,
  CASES,
  type Case,
  isReady,
  isSolved,
  outcomeOf,
  type Progress,
  pagesIn,
  policyBlocks,
  progressOf,
  solve,
} from '../../src/game/cases';
import { routesOf } from '../../src/game/mover';
import { CASE_NOTICE_STEPS, noticeOf } from '../../src/game/notice';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { GameState, TraceState } from '../../src/game/state';
import { speakerOf, speakersOf } from '../../src/game/talk';
import type { Trace } from '../../src/game/trace';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
const EVERYDAY = [textKey('talk.sales-everyday')];
const ANSWER = [textKey('talk.sales-source-1'), textKey('talk.sales-source-2')];
const AFTER = [textKey('talk.sales-after')];
/** The colleague of Sales on a route of two points, waiting ten seconds on the first. */
const SOURCE: readonly NamedPoint[] = [
  { name: 'person:sales:1', x: 64, y: 48, pause: 600 },
  { name: 'person:sales:2', x: 128, y: 48 },
];
const trace = (x: number): NamedRect => ({ name: 'trace:sales', x, y: 80, width: 16, height: 16 });
/** 20x12 cells of open floor: the player 40 px right of the source, two traces of Sales. */
const MAP: TileMap = grassMap(20, 12, { x: 104, y: 48 }, SOURCE, [trace(160), trace(192)]);
const found = (...ticks: readonly (number | null)[]): TraceState[] =>
  ticks.map((tick, index) => ({ trace: index, light: 0, found: tick }));
/** The start of MAP with its two traces found, or not, as given. */
const withTraces = (...ticks: readonly (number | null)[]): GameState => ({
  ...createInitialState(MAP),
  traces: found(...ticks),
});
const run = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, MAP), start);
/** The pages of the speaker of the state's open dialogue. */
const spoken = (state: GameState) =>
  state.dialogue === null
    ? null
    : speakerOf(
        state.dialogue,
        speakersOf([], state.movers, routesOf(MAP.points), undefined, progressOf(state, MAP)),
      )?.pages;
/** Both traces were found long ago: the game is at step 1000, and no notice of a find is due. */
const T0 = 1000;
const READY: GameState = { ...withTraces(10, 20), tick: T0 };

describe('the cases (0024)', () => {
  it('holds the case of Sales: its source, its answer, its afterwards, its outcome, its block', () => {
    expect(CASES).toStrictEqual([
      {
        region: 'sales',
        source: 'person:sales',
        answer: ANSWER,
        after: AFTER,
        outcome: textKey('case.sales-outcome'),
        policy: textKey('policy.sales'),
      },
    ]);
    expect(CASE_OVERVIEW).toBe(1);
  });
});

describe('a case that is ready (0024)', () => {
  const places: Trace[] = [
    { region: 'sales', box: { x: 0, y: 0, width: 16, height: 16 } },
    { region: 'sales', box: { x: 16, y: 0, width: 16, height: 16 } },
    { region: 'hr', box: { x: 32, y: 0, width: 16, height: 16 } },
  ];
  const progress = (...ticks: readonly (number | null)[]): Progress => ({
    traces: found(...ticks),
    places,
    solved: [],
  });

  it('is ready exactly when every trace of its region on the map is found', () => {
    expect(isReady('sales', progress(null, null, null))).toBe(false);
    expect(isReady('sales', progress(10, null, 30))).toBe(false);
    expect(isReady('sales', progress(10, 20, null))).toBe(true);
    expect(isReady('hr', progress(10, 20, null))).toBe(false);
    expect(isReady('hr', progress(null, null, 30))).toBe(true);
  });

  it('is never ready for a region without traces on the map', () => {
    expect(isReady('marketing', progress(10, 20, 30))).toBe(false);
    expect(isReady('sales', { traces: [], places: [], solved: [] })).toBe(false);
  });

  it('with four of five found is not ready, and with five it is', () => {
    const five: Trace[] = [0, 1, 2, 3, 4].map((n) => ({
      region: 'sales',
      box: { x: 16 * n, y: 0, width: 16, height: 16 },
    }));
    const of = (...ticks: readonly (number | null)[]): Progress => ({
      traces: found(...ticks),
      places: five,
      solved: [],
    });
    expect(isReady('sales', of(1, 2, 3, 4, null))).toBe(false);
    expect(isReady('sales', of(1, 2, 3, 4, 5))).toBe(true);
  });

  it('is solved when its region is in the list', () => {
    expect(isSolved('sales', [])).toBe(false);
    expect(isSolved('sales', [{ region: 'sales', at: 9 }])).toBe(true);
    expect(isSolved('hr', [{ region: 'sales', at: 9 }])).toBe(false);
  });
});

describe('what a colleague says (0024)', () => {
  const places: Trace[] = [{ region: 'sales', box: { x: 0, y: 0, width: 16, height: 16 } }];
  const at = (tick: number | null, solved = false): Progress => ({
    traces: found(tick),
    places,
    solved: solved ? [{ region: 'sales', at: 50 }] : [],
  });

  it('is the everyday line of the source while its case is not ready', () => {
    expect(pagesIn(at(null), 'person:sales', EVERYDAY)).toBe(EVERYDAY);
  });

  it("is the source's answer while the case is ready and not solved", () => {
    expect(pagesIn(at(10), 'person:sales', EVERYDAY)).toStrictEqual(ANSWER);
  });

  it('is "afterwards" once the case is solved', () => {
    expect(pagesIn(at(10, true), 'person:sales', EVERYDAY)).toStrictEqual(AFTER);
  });

  it('stays the everyday line of everyone who is no source, in all three states', () => {
    const lines = [textKey('talk.reception-everyday')];
    for (const progress of [at(null), at(10), at(10, true)]) {
      for (const route of ['person:reception', 'person:marketing', 'person:support']) {
        expect(pagesIn(progress, route, lines)).toBe(lines);
      }
    }
  });

  it('reads the cases it is given: the game passes its own', () => {
    const cases: readonly Case[] = [{ ...(CASES[0] as Case), source: 'person:hr' }];
    expect(pagesIn(at(10), 'person:hr', EVERYDAY, cases)).toStrictEqual(ANSWER);
    expect(pagesIn(at(10), 'person:sales', EVERYDAY, cases)).toBe(EVERYDAY);
  });

  it('reaches the dialogue through the speakers of the step', () => {
    expect(spoken(run(withTraces(10, null), TALK))).toStrictEqual(EVERYDAY);
    expect(spoken(run(READY, TALK))).toStrictEqual(ANSWER);
    const solved: GameState = { ...READY, solved: [{ region: 'sales', at: 1 }] };
    expect(spoken(run(solved, TALK))).toStrictEqual(AFTER);
  });
});

describe('solving the case (0024)', () => {
  it('starts with no case solved', () => {
    expect(createInitialState(MAP).solved).toStrictEqual([]);
  });

  it('opens the answer on page 0, turns to page 1, and the press on page 1 solves', () => {
    const opened = run(READY, TALK);
    expect(opened.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
    expect(opened.solved).toStrictEqual([]);
    const second = run(opened, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 1 });
    expect(second.solved).toStrictEqual([]);
    const closed = run(second, NONE, TALK);
    expect(closed.tick).toBe(T0 + 5);
    expect(closed.dialogue).toBeNull();
    expect(closed.solved).toStrictEqual([{ region: 'sales', at: T0 + 5 }]);
    expect(closed.overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('changes nothing in that step but the tick, the input, the dialogue, solved and overview', () => {
    const second = run(READY, TALK, NONE, TALK, NONE);
    const closed = update(second, TALK, MAP);
    expect(closed).toStrictEqual({
      ...second,
      tick: T0 + 5,
      held: TALK,
      dialogue: null,
      solved: [{ region: 'sales', at: T0 + 5 }],
      overview: { current: 6, max: 6 },
    });
  });

  it('fills overview from any stand: two of five become six of six', () => {
    const hurt: GameState = { ...READY, overview: { current: 2, max: 5 } };
    expect(run(hurt, TALK, NONE, TALK, NONE, TALK).overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('solves nothing while the answer is open: 600 steps with every key but talk', () => {
    const opened = run(READY, TALK);
    const others: GameInput = {
      ...NONE,
      up: true,
      down: true,
      left: true,
      right: true,
      lamp: true,
    };
    let state = opened;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, others, MAP);
    }
    expect(state.solved).toStrictEqual([]);
    expect(state.dialogue).toStrictEqual(opened.dialogue);
    expect(state.overview).toStrictEqual(opened.overview);
  });

  it('solves nothing by a held key: it turns one page', () => {
    const held = run(READY, TALK, TALK, TALK, TALK);
    expect(held.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
    expect(held.solved).toStrictEqual([]);
  });

  it('solves nothing when the everyday line is closed', () => {
    const closed = run(withTraces(10, null), TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.solved).toStrictEqual([]);
    expect(closed.overview).toStrictEqual({ current: 5, max: 5 });
  });

  it('solves a case once: closing "afterwards" changes neither solved nor overview', () => {
    const solved = run(READY, TALK, NONE, TALK, NONE, TALK);
    const again = run(solved, NONE, TALK);
    expect(spoken(again)).toStrictEqual(AFTER);
    const closed = run(again, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.solved).toStrictEqual(solved.solved);
    expect(closed.overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('is what answeredCase and solve say', () => {
    const second = run(READY, TALK, NONE, TALK, NONE);
    const routes = routesOf(MAP.points);
    const dialogue = second.dialogue ?? { speaker: 'mover', index: 0, page: 1 };
    expect(answeredCase(dialogue, second, routes, progressOf(second, MAP))?.region).toBe('sales');
    const figure = { speaker: 'figure', index: 0, page: 0 } as const;
    expect(answeredCase(figure, second, routes, progressOf(second, MAP))).toBeNull();
    const notReady = withTraces(10, null);
    expect(answeredCase(dialogue, notReady, routes, progressOf(notReady, MAP))).toBeNull();
    expect(solve({ ...second, tick: 40 }, 'sales')).toStrictEqual({
      ...second,
      tick: 40,
      solved: [{ region: 'sales', at: 40 }],
      overview: { current: 6, max: 6 },
    });
  });

  it('keeps the solved case through the wake', () => {
    const solved = run(READY, TALK, NONE, TALK, NONE, TALK);
    const woken = update({ ...solved, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.solved).toStrictEqual([{ region: 'sales', at: T0 + 5 }]);
    expect(woken.overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('survives a JSON round trip with the case solved (INV-1)', () => {
    const solved = run(READY, TALK, NONE, TALK, NONE, TALK);
    expect(JSON.parse(JSON.stringify(solved))).toStrictEqual(solved);
  });
});

describe('the notice of a solved case (0024)', () => {
  const solved = run(READY, TALK, NONE, TALK, NONE, TALK);
  const key = textKey('notice.case-solved');

  it('is shown for 120 steps from the solving step and not after', () => {
    expect(CASE_NOTICE_STEPS).toBe(120);
    expect(noticeOf(run(READY, TALK, NONE, TALK, NONE))).toBeNull();
    expect(noticeOf(solved)).toBe(key);
    expect(noticeOf({ ...solved, tick: T0 + 5 + 119 })).toBe(key);
    expect(noticeOf({ ...solved, tick: T0 + 5 + 120 })).toBeNull();
  });

  it('comes before a found trace and after a wall that holds', () => {
    // Both traces found a step before the case was solved: both notices are due.
    const both: GameState = { ...solved, traces: found(T0 + 4, T0 + 4) };
    expect(noticeOf(both)).toBe(key);
    expect(noticeOf({ ...both, solved: [] })).toBe(textKey('notice.trace-found'));
    const holding: GameState = {
      ...both,
      lamp: { on: true, strength: 1 },
      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    };
    expect(noticeOf(holding)).toBe(textKey('notice.shadow-too-dense'));
  });
});

describe('what the journal takes from the cases (0024)', () => {
  it('gives a solved case its outcome and an unsolved one none', () => {
    expect(outcomeOf('sales', [])).toBeNull();
    expect(outcomeOf('sales', [{ region: 'sales', at: 5 }])).toBe(textKey('case.sales-outcome'));
    expect(outcomeOf('hr', [{ region: 'hr', at: 5 }])).toBeNull();
  });

  it('gives the policy one block per solved case, in the order they were solved', () => {
    expect(policyBlocks([])).toStrictEqual([]);
    expect(policyBlocks([{ region: 'sales', at: 5 }])).toStrictEqual([textKey('policy.sales')]);
    const two: readonly Case[] = [
      { ...(CASES[0] as Case), region: 'hr', policy: textKey('policy.sales') },
      CASES[0] as Case,
    ];
    expect(
      policyBlocks(
        [
          { region: 'sales', at: 5 },
          { region: 'hr', at: 9 },
        ],
        two,
      ),
    ).toHaveLength(2);
  });
});
```

- [x] **Step 3: Change the tests that build a state, and add the state's and the floor's
  tests.** Every `GameState` literal gets `solved: []` after `traces`.

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -169,6 +169,7 @@
     movers: [],
     shadowWalls: [{ wall: 1, lit: true, light: 30 }],
     traces: [],
+    solved: [],
     figures: [],
     dialogue: null,
     journal: null,
@@ -207,6 +208,7 @@
       movers: [],
       shadowWalls: [{ wall: 1, lit: false, light: 0 }],
       traces: [],
+      solved: [],
       figures: [],
       dialogue: null,
       journal: null,
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -155,6 +155,7 @@
   movers: [],
   shadowWalls: [],
   traces: [],
+  solved: [],
   figures: [],
   dialogue: null,
   journal: null,
```

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -101,6 +101,7 @@
   movers: [],
   shadowWalls: [],
   traces: [],
+  solved: [],
   figures: [{ figure: 0, facing: 'down' }],
   dialogue: null,
   journal: null,
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -98,6 +98,7 @@
   movers: [],
   shadowWalls: [],
   traces: [],
+  solved: [],
   figures: [],
   dialogue: null,
   journal: { tab },
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -42,6 +42,8 @@
   'tests/fixtures/maps/traces.tmj',
   'tests/fixtures/maps/fixture-tiles.tsj',
 );
+/** The colleague of Sales and two traces of Sales on open floor, the spawn 40 px from it (0024). */
+const CASE_MAP = loadMap('tests/fixtures/maps/case.tmj', 'tests/fixtures/maps/fixture-tiles.tsj');
 /** The floor the game loads. */
 const FLOOR_MAP = loadMap('public/maps/floor.tmj', 'public/tiles/placeholder.tsj');
 
@@ -89,6 +91,7 @@
       movers: [],
       shadowWalls: [],
       traces: [],
+      solved: [],
       figures: [],
       dialogue: null,
       journal: null,
@@ -148,6 +151,7 @@
         movers: [],
         shadowWalls: [],
         traces: [],
+        solved: [],
         figures: [],
         dialogue: null,
         journal: null,
@@ -175,6 +179,7 @@
       movers: [],
       shadowWalls: [],
       traces: [],
+      solved: [],
       figures: [],
       dialogue: null,
       journal: null,
@@ -194,6 +199,7 @@
       movers: [],
       shadowWalls: [],
       traces: [],
+      solved: [],
       figures: [],
       dialogue: null,
       journal: null,
@@ -795,5 +801,45 @@
     const talking = update(update(lit, NONE, map), TALK, map);
     expect(talking.dialogue).not.toBeNull();
     expect(stepping(map, talking, SHINE, 600).traces).toStrictEqual(talking.traces);
+  });
+});
+
+describe('the solved cases in the state (0024)', () => {
+  const TALK: GameInput = { ...NONE, talk: true };
+  const through = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
+    inputs.reduce((state, input) => update(state, input, CASE_MAP), start);
+
+  it('starts with none, on the floor and on the fixture', () => {
+    expect(createInitialState(FLOOR_MAP).solved).toStrictEqual([]);
+    const state = createInitialState(CASE_MAP);
+    expect(state.solved).toStrictEqual([]);
+    expect(state.traces).toHaveLength(2);
+    expect(state.movers.map((mover) => mover.kind)).toStrictEqual(['person']);
+  });
+
+  it('solves the case of a parsed map: both traces found, three presses beside the source', () => {
+    const start = createInitialState(CASE_MAP);
+    const ready: GameState = {
+      ...start,
+      tick: 1000,
+      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+    };
+    const solved = through(ready, TALK, NONE, TALK, NONE, TALK);
+    expect(solved.dialogue).toBeNull();
+    expect(solved.solved).toStrictEqual([{ region: 'sales', at: 1005 }]);
+    expect(solved.overview).toStrictEqual({ current: 6, max: 6 });
+    expect(JSON.parse(JSON.stringify(solved))).toStrictEqual(solved);
   });
+
+  it('solves nothing on the same map with one trace still to find', () => {
+    const start = createInitialState(CASE_MAP);
+    const one: GameState = {
+      ...start,
+      tick: 1000,
+      traces: start.traces.map((trace, i) => (i === 0 ? { ...trace, found: 10 } : trace)),
+    };
+    const closed = through(one, TALK, NONE, TALK);
+    expect(closed.dialogue).toBeNull();
+    expect(closed.solved).toStrictEqual([]);
+  });
 });
```

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -5,6 +5,7 @@
 import { cameraFor } from '../../src/engine/camera';
 import { moveBox } from '../../src/engine/collision';
 import { type Box, EMPTY, type Point, parseTileMap, parseTileset } from '../../src/engine/tiled';
+import { CASES, isReady, progressOf } from '../../src/game/cases';
 import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
 import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
@@ -1410,5 +1411,30 @@
     }
     // The wall below Sales lies on the cells of the south corridor: no veil.
     expect(veilOf(areas, 90, 52)).toBe(0);
+  });
+});
+
+describe('the case of Sales on the floor (0024)', () => {
+  it('has a source that walks the floor and has lines, and a region with traces', () => {
+    const routes = routesOf(floor.points).map((route) => route.name);
+    const traces = tracesOf(floor.rects);
+    for (const { region, source } of CASES) {
+      expect(routes, source).toContain(source);
+      expect(pagesOfRoute(source), source).not.toHaveLength(0);
+      expect(
+        traces.some((trace) => trace.region === region),
+        region,
+      ).toBe(true);
+      expect(REGION_NAME[region], region).toBeDefined();
+    }
   });
+
+  it('is not ready at the start, nor with four of its five traces found, and ready with five', () => {
+    const start = createInitialState(floor);
+    expect(isReady('sales', progressOf(start, floor))).toBe(false);
+    const four = { ...start, traces: start.traces.map((t, i) => (i < 4 ? { ...t, found: 1 } : t)) };
+    expect(isReady('sales', progressOf(four, floor))).toBe(false);
+    const five = { ...start, traces: start.traces.map((t) => ({ ...t, found: 1 })) };
+    expect(isReady('sales', progressOf(five, floor))).toBe(true);
+  });
 });
```

- [x] **Step 4: Run and see it fail.**

Run: `npm run typecheck`
Expected: errors — `src/game/cases` does not exist, `solved` is no property of `GameState`,
and `speakersOf` takes four arguments.

- [x] **Step 5: The state,** in `src/game/state.ts`:

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -102,6 +102,12 @@
   readonly found: number | null;
 }
 
+/** A solved case (0024): its region, and the tick of the step that solved it. */
+export interface SolvedCase {
+  readonly region: string;
+  readonly at: number;
+}
+
 /** A standing figure of the cast (0017). Its place stays in the map, its pages in game/cast. */
 export interface FigureState {
   /** The index of the figure in `figuresOf(map.points)`. */
@@ -164,6 +170,8 @@
   readonly shadowWalls: readonly ShadowWallState[];
   /** The traces of the map, in file order (0022): found or not, all of them. */
   readonly traces: readonly TraceState[];
+  /** The solved cases, in the order they were solved (0024). */
+  readonly solved: readonly SolvedCase[];
   /** The standing figures of the map, in file order (0017). */
   readonly figures: readonly FigureState[];
   /** The dialogue that is open, or null. While it is open nothing else is stepped (0017). */
```

- [x] **Step 6: Create `src/game/cases.ts`:**

```ts
import type { TileMap } from '../engine/tiled';
import { type TextKey, textKey } from '../text/text';
import type { Route } from './mover';
import type { Dialogue, GameState, SolvedCase, TraceState } from './state';
import { type Trace, tracesOf } from './trace';

/**
 * The cases (gameplay.md §6, world.md §2, feature 0024). A case belongs to a region and has a
 * source: the colleague where the data flow begins. When every trace of the region is found,
 * the case is ready, and the source no longer says its everyday line: shown what the lamp
 * found, it answers honestly. The step that closes that answer solves the case. Nobody gets
 * into trouble. Pure data and pure functions.
 */

export interface Case {
  readonly region: string;
  /** The route of the colleague who is the source, `person:<room>`. */
  readonly source: string;
  /** What the source says when the case is ready: its honest answer, page by page. */
  readonly answer: readonly TextKey[];
  /** What the source says once the case is solved. */
  readonly after: readonly TextKey[];
  /** The case's line on the journal's cases tab once it is solved. */
  readonly outcome: TextKey;
  /** The case's building block of the policy. */
  readonly policy: TextKey;
}

export const CASES: readonly Case[] = [
  {
    region: 'sales',
    source: 'person:sales',
    answer: [textKey('talk.sales-source-1'), textKey('talk.sales-source-2')],
    after: [textKey('talk.sales-after')],
    outcome: textKey('case.sales-outcome'),
    policy: textKey('policy.sales'),
  },
];

/** Solving a case raises the maximum of overview by this much, and fills it. */
export const CASE_OVERVIEW = 1;

/** What the cases follow from: the traces in the state, their places in the map, what is solved. */
export interface Progress {
  readonly traces: readonly TraceState[];
  readonly places: readonly Trace[];
  readonly solved: readonly SolvedCase[];
}

export function progressOf(state: GameState, map: TileMap): Progress {
  return { traces: state.traces, places: tracesOf(map.rects), solved: state.solved };
}

/** Solved: the region is in the list of solved cases. */
export function isSolved(region: string, solved: readonly SolvedCase[]): boolean {
  return solved.some((entry) => entry.region === region);
}

/** Ready: the map has at least one trace of the region, and every one of them is found. */
export function isReady(region: string, progress: Progress): boolean {
  const mine = progress.traces.filter((state) => progress.places[state.trace]?.region === region);
  return mine.length > 0 && mine.every((state) => state.found !== null);
}

/**
 * The pages a colleague says, by the name of its route: the source of a solved case says
 * "afterwards"; the source of a case that is ready and not solved says its answer; everyone
 * else, and a source before its case is ready, says the everyday pages.
 */
export function pagesIn(
  progress: Progress,
  route: string,
  everyday: readonly TextKey[],
  cases: readonly Case[] = CASES,
): readonly TextKey[] {
  const mine = cases.find((candidate) => candidate.source === route);
  if (mine === undefined) {
    return everyday;
  }
  if (isSolved(mine.region, progress.solved)) {
    return mine.after;
  }
  return isReady(mine.region, progress) ? mine.answer : everyday;
}

/**
 * The case a closing dialogue solves, or null: the dialogue was a colleague's, the colleague
 * is the source of a case, and the case was ready and not solved — so what was just read to
 * its end was the source's answer.
 */
export function answeredCase(
  dialogue: Dialogue,
  state: GameState,
  routes: readonly Route[],
  progress: Progress,
  cases: readonly Case[] = CASES,
): Case | null {
  if (dialogue.speaker !== 'mover') {
    return null;
  }
  const route = routes[state.movers[dialogue.index]?.route ?? -1]?.name;
  const mine = cases.find((candidate) => candidate.source === route);
  if (mine === undefined || isSolved(mine.region, progress.solved)) {
    return null;
  }
  return isReady(mine.region, progress) ? mine : null;
}

/**
 * The state with a case solved in this step: the region joins `solved` with the state's tick,
 * and overview grows by CASE_OVERVIEW and is full. Nothing else changes.
 */
export function solve(state: GameState, region: string): GameState {
  const max = state.overview.max + CASE_OVERVIEW;
  return {
    ...state,
    solved: [...state.solved, { region, at: state.tick }],
    overview: { current: max, max },
  };
}

/** The policy blocks of the journal: the solved cases' blocks, in the order they were solved. */
export function policyBlocks(
  solved: readonly SolvedCase[],
  cases: readonly Case[] = CASES,
): TextKey[] {
  return solved.flatMap((entry) => {
    const mine = cases.find((candidate) => candidate.region === entry.region);
    return mine === undefined ? [] : [mine.policy];
  });
}

/** The outcome line of a region's case when it is solved, or null. */
export function outcomeOf(
  region: string,
  solved: readonly SolvedCase[],
  cases: readonly Case[] = CASES,
): TextKey | null {
  const mine = cases.find((candidate) => candidate.region === region);
  return mine !== undefined && isSolved(region, solved) ? mine.outcome : null;
}
```

- [x] **Step 7: Let the speakers follow the cases,** in `src/game/talk.ts`:

```diff
--- a/src/game/talk.ts
+++ b/src/game/talk.ts
@@ -1,6 +1,7 @@
 import { sightBlocked } from '../engine/collision';
 import type { Point, TileMap } from '../engine/tiled';
 import type { TextKey } from '../text/text';
+import { type Progress, pagesIn } from './cases';
 import { COLLEAGUES, type Colleague, type Figure, pagesOfRoute } from './cast';
 import type { Route } from './mover';
 import { BOX_HEIGHT, type GameInput, pressed } from './player';
@@ -53,13 +54,15 @@
 /**
  * The speakers of a step (0018): the standing figures in the map's order, then the colleagues
  * — the movers of the kind `person` whose route has lines — in the order of the state's
- * movers. A person without lines, a dog, a vacuum and a drone are no speakers.
+ * movers. A person without lines, a dog, a vacuum and a drone are no speakers. With the
+ * progress of the cases, the source of a case says its answer or its "afterwards" (0024).
  */
 export function speakersOf(
   figures: readonly Figure[],
   movers: readonly MoverState[],
   routes: readonly Route[],
   colleagues: readonly Colleague[] = COLLEAGUES,
+  progress?: Progress,
 ): Speaker[] {
   const standing = figures.map(
     (figure, index): Speaker => ({
@@ -71,8 +74,13 @@
     }),
   );
   const walking = movers.flatMap((mover, index): Speaker[] => {
+    const route = routes[mover.route]?.name ?? '';
+    const everyday = mover.kind === 'person' ? pagesOfRoute(route, colleagues) : [];
+    // What a colleague says follows from the cases (0024); without them, the everyday pages.
     const pages =
-      mover.kind === 'person' ? pagesOfRoute(routes[mover.route]?.name ?? '', colleagues) : [];
+      progress === undefined || everyday.length === 0
+        ? everyday
+        : pagesIn(progress, route, everyday);
     return pages.length === 0 ? [] : [{ speaker: 'mover', index, x: mover.x, y: mover.y, pages }];
   });
   return [...standing, ...walking];
```

- [x] **Step 8: Start, keep and solve,** in `src/game/update.ts` and `src/game/overview.ts`.
  Update the two doc comments of `update.ts` too: the initial state has no case solved; a
  step that closes the source's answer of a ready case solves it (0024).

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -1,5 +1,6 @@
 import type { TileMap } from '../engine/tiled';
 import { followPlayer } from './camera';
+import { answeredCase, progressOf, solve } from './cases';
 import { figuresFrom, figuresOf } from './cast';
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
 import { openHelp, stepHelp } from './help';
@@ -52,6 +53,7 @@
     movers: moversFrom(routes),
     shadowWalls: standingWalls(walls),
     traces: hiddenTraces(tracesOf(map.rects)),
+    solved: [],
     figures: figuresFrom(figures),
     dialogue: null,
     journal: null,
@@ -99,9 +101,14 @@
     return stepJournal(state, state.journal, input);
   }
   const routes = routesOf(content.points);
-  const speakers = speakersOf(figuresOf(content.points), state.movers, routes);
+  const progress = progressOf(state, content);
+  const speakers = speakersOf(figuresOf(content.points), state.movers, routes, undefined, progress);
   if (state.dialogue !== null) {
-    return stepDialogue(state, state.dialogue, input, speakers);
+    const stepped = stepDialogue(state, state.dialogue, input, speakers);
+    // The step that closes the source's answer solves its case (0024).
+    const answered =
+      stepped.dialogue === null ? answeredCase(state.dialogue, state, routes, progress) : null;
+    return answered === null ? stepped : solve(stepped, answered.region);
   }
   const journal = openJournal(state, input);
   if (journal !== null) {
@@ -150,6 +157,7 @@
       walled,
       state.tick + 1,
     ),
+    solved: state.solved,
     figures: state.figures,
     dialogue: null,
     journal: null,
```

```diff
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -143,6 +143,7 @@
     movers: state.movers,
     shadowWalls: restedWalls(state.shadowWalls),
     traces: restedTraces(state.traces),
+    solved: state.solved,
     figures: state.figures,
     dialogue: null,
     journal: null,
```

- [x] **Step 9: The notice of a solved case,** in `src/game/notice.ts`:

```diff
--- a/src/game/notice.ts
+++ b/src/game/notice.ts
@@ -10,6 +10,11 @@
 /** A shadow wall holds against the lamp: its density is above the lamp's strength (0014). */
 export const NOTICE_SHADOW_TOO_DENSE: TextKey = textKey('notice.shadow-too-dense');
 
+/** A case was solved (0024). */
+export const NOTICE_CASE_SOLVED: TextKey = textKey('notice.case-solved');
+/** Tune: two seconds from the solving step. */
+export const CASE_NOTICE_STEPS = 120;
+
 /** A trace was found and is in the journal now (0022). */
 export const NOTICE_TRACE_FOUND: TextKey = textKey('notice.trace-found');
 /** Tune: two seconds from the find. */
@@ -18,14 +23,18 @@
 /**
  * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
  * is on and cannot lift: a wall that gives way counts from 1 in its first step; that notice
- * comes first. Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was found
- * (0022).
+ * comes first. Then, for CASE_NOTICE_STEPS steps from the solving step, that a case is solved
+ * (0024). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was found (0022).
  */
 export function noticeOf(state: GameState): TextKey | null {
   const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
   if (state.lamp.on && holds) {
     return NOTICE_SHADOW_TOO_DENSE;
   }
+  const solved = state.solved.some((entry) => state.tick - entry.at < CASE_NOTICE_STEPS);
+  if (solved) {
+    return NOTICE_CASE_SOLVED;
+  }
   const found = state.traces.some(
     (trace) => trace.found !== null && state.tick - trace.found < TRACE_NOTICE_STEPS,
   );
```

- [x] **Step 10: The same pages in the scene,** in `src/render/draw-scene.ts`. Without this
  the box would show the everyday line while the dialogue has two pages:

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -1,5 +1,6 @@
 import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
 import { type Box, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
+import { progressOf } from '../game/cases';
 import { type Figure, figuresOf } from '../game/cast';
 import { CREATURE_SIZE } from '../game/creature';
 import { HELP_HINT, helpHintDue } from '../game/help';
@@ -471,8 +472,16 @@
   const page =
     state.dialogue === null
       ? undefined
-      : speakerOf(state.dialogue, speakersOf(figures, state.movers, routesOf(content.map.points)))
-          ?.pages[state.dialogue.page];
+      : speakerOf(
+          state.dialogue,
+          speakersOf(
+            figures,
+            state.movers,
+            routesOf(content.map.points),
+            undefined,
+            progressOf(state, content.map),
+          ),
+        )?.pages[state.dialogue.page];
   const notice = noticeOf(state);
   if (page !== undefined) {
     renderer.fillRect(
```

- [x] **Step 11: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/cases.test.ts tests/unit/talk.test.ts tests/unit/state.test.ts`
Expected: PASS — `cases.test.ts` has 26 tests. Then `npm run test`: 1124 tests. The digest
test of 0020 in `journal.test.ts` still holds: in its 600 steps no case is ready.

- [x] **Step 12:** `npm run check`, then commit —
  `Solve the case of Sales by the talk with its source`. The body says that the step which
  closes the answer is the gesture of the spec: no key, no screen, nobody gets into trouble.

---

### Task 3: The outcome and the policy in the journal

**Files:**
- Modify: `src/render/draw-journal.ts`
- Test: `tests/unit/draw-journal.test.ts`

**Interfaces:**
- Consumes: `outcomeOf`, `policyBlocks` of Task 2.
- Produces, in `render/draw-journal`: `CASE_OUTCOME`, `POLICY_BLOCK`, `POLICY_PITCH`.

- [x] **Step 1: Write the failing tests.** The helper is named `shown`, not `after`.

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -4,6 +4,7 @@
 import {
   CASE_LINE,
   CASE_NAME,
+  CASE_OUTCOME,
   CASE_PITCH,
   drawJournal,
   ENTRY_FRAME,
@@ -13,6 +14,8 @@
   ENTRY_PITCH,
   JOURNAL_RULE,
   NOTHING_TEXT,
+  POLICY_BLOCK,
+  POLICY_PITCH,
   TAB_CLOSED,
   TAB_OPEN,
   tabBox,
@@ -320,3 +323,83 @@
     }
   });
 });
+
+describe('a solved case in the journal (0024)', () => {
+  /** Five traces of Sales, all found. */
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
+  const all: TraceState[] = [0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: 60 }));
+  const shown = (tab: JournalTab, solved: boolean, settings = GERMAN): string[] => {
+    const renderer = recordingRenderer();
+    const state: GameState = {
+      ...reading(tab),
+      traces: all,
+      solved: solved ? [{ region: 'sales', at: 900 }] : [],
+    };
+    drawJournal(renderer, state, { tab }, content, settings);
+    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
+  };
+
+  it('places the outcome and the blocks as the spec says', () => {
+    expect([CASE_OUTCOME, POLICY_BLOCK, POLICY_PITCH]).toStrictEqual([
+      { x: 16, y: 60 },
+      { x: 16, y: 36 },
+      60,
+    ]);
+    // Two blocks of four lines fit the surface: the second ends at y = 142.
+    expect(POLICY_BLOCK.y + POLICY_PITCH + 3 * 12 + 10).toBe(142);
+  });
+
+  it('adds the outcome as the third line of the case, under its name and its count', () => {
+    const open = shown('cases', false);
+    const solved = shown('cases', true);
+    // `Gelöst: Angebote gingen in einen Chatbot.`: 41 characters, 36 drawn; `G` is glyph 39.
+    expect(solved).toHaveLength(open.length + 36);
+    expect(solved.slice(0, open.length)).toStrictEqual(open);
+    expect(solved[open.length]).toBe('drawSprite 39 at 16,60');
+    expect(open.some((call) => call.endsWith(',60'))).toBe(false);
+  });
+
+  it('shows the block of the solved case on the policy tab, and its line for nothing before', () => {
+    expect(shown('policy', false)).toStrictEqual(
+      draw(reading('policy')).calls.slice(draw(reading('policy')).calls.indexOf(RULE) + 1),
+    );
+    const block = shown('policy', true);
+    // 45 + 40 + 46 + 33 characters with 7 + 4 + 6 + 5 spaces: 142 glyphs.
+    expect(block).toHaveLength(142);
+    expect(block[0]).toBe('drawSprite 42 at 16,36');
+    expect(block).toContain('drawSprite 86 at 16,48');
+    expect(block).toContain('drawSprite 55 at 16,60');
+    expect(block).toContain('drawSprite 85 at 16,72');
+  });
+
+  it('draws both in English with the language `en`', () => {
+    // `Solved: …` starts with glyph 51, `Every text …` with glyph 37.
+    const cases = shown('cases', true, ENGLISH);
+    expect(cases).toContain('drawSprite 51 at 16,60');
+    expect(shown('policy', true, ENGLISH)[0]).toBe('drawSprite 37 at 16,36');
+  });
+
+  it('leaves the creatures tab as it was', () => {
+    const renderer = recordingRenderer();
+    drawJournal(
+      renderer,
+      { ...reading('creatures', 1), solved: [{ region: 'sales', at: 900 }] },
+      { tab: 'creatures' },
+      content,
+      GERMAN,
+    );
+    expect(renderer.calls).toStrictEqual(draw(reading('creatures', 1)).calls);
+  });
+});
```

- [x] **Step 2: Run and see them fail.**

Run: `npm run typecheck`
Expected: errors — `CASE_OUTCOME`, `POLICY_BLOCK` and `POLICY_PITCH` are not exported.

- [x] **Step 3: Draw the outcome and the blocks,** in `src/render/draw-journal.ts`:

```diff
--- a/src/render/draw-journal.ts
+++ b/src/render/draw-journal.ts
@@ -1,4 +1,5 @@
 import type { Box, Point } from '../engine/tiled';
+import { outcomeOf, policyBlocks } from '../game/cases';
 import { CASE_TEXT, ENTRY_TEXT, entriesOf, REGION_NAME, TAB_TEXT } from '../game/journal';
 import { type GameState, JOURNAL_TABS, type JournalState } from '../game/state';
 import { caseEntries, tracesOf } from '../game/trace';
@@ -40,6 +41,11 @@
 export const CASE_NAME: Point = { x: 16, y: 36 };
 export const CASE_LINE: Point = { x: 16, y: 48 };
 export const CASE_PITCH = 36;
+/** The third line of a solved case: its outcome (0024). */
+export const CASE_OUTCOME: Point = { x: 16, y: 60 };
+/** A block k of the policy, from 0, starts POLICY_PITCH below block k − 1 (0024). */
+export const POLICY_BLOCK: Point = { x: 16, y: 36 };
+export const POLICY_PITCH = 60;
 
 /** The rectangle of tab k. */
 export function tabBox(k: number): Box {
@@ -85,10 +91,12 @@
     TAB_OPEN,
   );
   const entries = journal.tab === 'creatures' ? entriesOf(state.captured) : [];
-  // The cases are the regions with a found trace (0022); the policy comes with M5.
+  // The cases are the regions with a found trace (0022).
   const cases =
     journal.tab === 'cases' ? caseEntries(state.traces, tracesOf(content.map.rects)) : [];
-  if (entries.length === 0 && cases.length === 0) {
+  // The policy is one block per solved case (0024).
+  const blocks = journal.tab === 'policy' ? policyBlocks(state.solved) : [];
+  if (entries.length === 0 && cases.length === 0 && blocks.length === 0) {
     drawText(
       renderer,
       content.fontSheet,
@@ -120,7 +128,28 @@
     count(entry.found);
     word(CASE_TEXT.of);
     count(entry.all);
+    const outcome = outcomeOf(entry.region, state.solved);
+    if (outcome !== null) {
+      drawText(
+        renderer,
+        content.fontSheet,
+        outcome,
+        language,
+        CASE_OUTCOME.x,
+        CASE_OUTCOME.y + down,
+      );
+    }
   }
+  for (const [k, block] of blocks.entries()) {
+    drawText(
+      renderer,
+      content.fontSheet,
+      block,
+      language,
+      POLICY_BLOCK.x,
+      POLICY_BLOCK.y + k * POLICY_PITCH,
+    );
+  }
   for (const [k, species] of entries.entries()) {
     const down = k * ENTRY_PITCH;
     const { name, text } = ENTRY_TEXT[species];
```

- [x] **Step 4: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/draw-journal.test.ts`
Expected: PASS. Then `npm run test`: 1129 tests.

- [x] **Step 5:** `npm run check`, then commit —
  `Show a solved case's outcome and its policy block`.

---

### Task 4: The smoke spec

**Files:**
- Test: `tests/e2e/smoke.spec.ts`

- [x] **Step 1: Add the test** at the end of the file:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -341,3 +341,16 @@
     )
     .toStrictEqual([0x8b, 0x9b, 0xb4, 255]);
 });
+
+test('the game starts with no case solved and five hearts', async ({ page }) => {
+  await page.goto('/');
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.solved), {
+      message: 'window.shadowAi.state.solved is there and empty',
+    })
+    .toStrictEqual([]);
+  expect(await page.evaluate(() => window.shadowAi?.state.overview)).toStrictEqual({
+    current: 5,
+    max: 5,
+  });
+});
```

- [x] **Step 2: Run.**

Run: `npm run test:e2e`
Expected: PASS — fifteen tests, three skipped (they need the container). This test passes at
once: Task 2 built what it checks.

- [x] **Step 3:** `npm run check`, then commit — `Check the unsolved start in the smoke spec`.

---

### Task 5: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/architecture.md`,
  `docs/spec/testing.md`, `README.md`

- [x] **Step 1: `gameplay.md`.** §4: as built (feature 0024), the maximum of overview grows
  by one with a solved case and is filled — six hearts after Sales. §6: add a paragraph
  **As built** (feature 0024): the case of Sales — its source is the colleague who walks
  between the cubicles and the coffee; while a trace is missing the colleague says the
  everyday line; with all five found, a talk is the gesture: the colleague answers honestly
  in two pages, the hero says nothing, there is no key and no screen for it; the press that
  closes the answer solves the case; afterwards the colleague says something else. Picking
  a creature from the journal comes with the second species. §7: the cases tab shows the
  outcome of a solved case as a third line; the policy tab shows one block per solved case.

- [x] **Step 2: `world.md`.** §2, at Sales: as built (feature 0024), the case is solved by
  the talk with its source once its five traces are found; its policy block is the one of
  the table, in the words of the spec. §3, at "Per department": the colleague of Sales is
  the source of the first case; what the colleague says follows from the case — the
  everyday line, the answer, the line afterwards.

- [x] **Step 3: `architecture.md`.** §1 directory list: `game/cases.ts`. §2: `solved`, a
  list of `{ region, at }`; a case is ready and solved by rule, not by a field; the pages
  of a colleague follow from the progress of the cases in `update` and in the scene alike;
  the solving step and what it changes; the wake keeps `solved`; the notices in their order.
  §5: the outcome line and the policy tab with their places. §8: the kinds `case` and
  `policy` and their rules.

- [x] **Step 4: `testing.md` §2.** The INV-1 row gains the round trip with a case solved.
  The INV-4 row gains the rules of the kinds `case` and `policy`. §6: `case.tmj`, if the
  section lists the fixtures.

- [x] **Step 5: `README.md`:** one sentence after the one on the shadow over the regions —
  with all five traces found, the colleague of Sales answers honestly, the case is solved,
  the journal records its outcome and the first block of the policy, and overview grows by
  one (feature 0024).

- [x] **Step 6:** `npm run check`, then commit — `Move the case of Sales into the spec`.

---

### Task 6: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 6 in this file and commit —
  `Tick the full check of 0024`.

---

### Task 7: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk,
  `J` for the journal, `L` for the language. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–22 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself. The rooms under shadow are grey since 0023; the
  spec's steps do not mention it, and it is no finding of this walk.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 6, and start again at step 1.
- [ ] **Step 4:** after step 22 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–22`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0024`. A feel note that wants something
  else — other words, fewer traces, a picture of the gesture — becomes a new draft, not a
  change on this branch.

---

### Task 8: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 6. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M5 section, say that 0022,
  0023 and 0024 are implemented and 0025 and 0026 approved; commit —
  `Mark 0024 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0024: the case of Sales`, with the walk's result and feel notes in its
  description, and one line that the branch also carries an amendment of the approved spec
  of 0026. CI must be green. The author merges.
