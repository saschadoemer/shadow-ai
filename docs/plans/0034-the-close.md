# 0034 — Implementation plan: the close

**Spec:** [`docs/features/0034-the-close.md`](../features/0034-the-close.md) (approved
2026-11-19). The plan argues from the spec; where they differ, the spec wins. Read the spec
first, then `CLAUDE.md`, then `docs/spec/vision.md` §4, `docs/spec/gameplay.md` §6,
`docs/spec/architecture.md` §2 and `docs/spec/testing.md` §5. **Written:** 2026-11-19 on the
planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0033 is merged into `main` (`199085c` or later). The branch
`feature/0034-the-close` exists, cut from that `main`, and holds this plan. Work on it; merge
the latest `main` into it before Task 1. The specs 0035 to 0038 are on `main`; they are
approved, have no plan yet, and are **not** built here.

**Goal:** five seconds after the last case of the game is solved, the story opens a scene of
three pages by itself, once; then the game goes on.

**Approach:** three code tasks, each green on its own. The words (T1). The scene and the rule
(T2): `SCENES` gets the close, and `closeDue` says when it is due — after it the pages exist
and the rule can be asked, and no step asks it. The state and the step (T3):
`GameState.finished`, the step that opens the scene by itself and the step that closes it.
Then the documents (T4), the full check with the container (T5), the walk (T6) and the pull
request (T7).

**How this plan was checked:** the code and the tests of Tasks 1 to 3 were run once as a
prototype on 2026-11-19, on the source of `main` at `199085c`, and then replayed task by task,
each task's tests before its code: they failed as the steps say, and after each of the three
tasks typecheck and Biome were clean and the unit tests green — 1537, 1547 and 1560 tests
(1536 before). The diffs of this file, applied in order to a clean tree, gave the prototype's
files. `npm run check` with the build passed on the whole prototype, and the smoke spec
passed twice against a dev server of it: 19 passed, 3 skipped; its new test was run once
before the code of Task 3 and failed. On the floor as loaded, with both cases solved from
beside their sources, the scene opens exactly 300 steps after the second. The prototype was
thrown away; nothing of it is on the branch. If a step does not behave as written, the cause
is a difference to that state — stop and look; do not bend a test. The game was **not**
played in a browser — that is the walk — and the container was **not** run with the
prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `GameState.finished` is plain data: `null`, or the tick of the step that closed the
  close. Whether the close is due is **derived** in every step; it is not stored.
- INV-2: `game/story` imports the cases and types of the state; it uses no DOM name.
- INV-4: the three strings live in `src/text/de.ts` and `src/text/en.ts`; `story.ts` holds
  keys.
- INV-7: no map changes, no tile changes, no new sprite.
- **The order of `update`** stays: the dark, the help, the journal, an open dialogue — and
  then, new, the close when it is due and the figure is not being pushed — then the opening
  of the journal, the opening of a talk, the ordinary step. So everything that has the step
  keeps it, and the close comes before a press of `journal` or of `talk`.
- **Due is counted on the state before the step:** the close is due when
  `state.tick − at ≥ 300`, with `at` the largest tick among the solved cases of `CASES`.
  With the last case solved at T, the step from the state with tick T + 299 is ordinary, and
  the step from the state with tick T + 300 opens the scene.
- **The rule reads `CASES`.** Nothing names Sales or Marketing. A test gives the rule a table
  of three cases; the feature that adds the third case needs no change here.
- **`openScene` is the only new way a dialogue opens.** It sets the scene's dialogue, makes
  the figure stand and the lamp go out, as a talk does (0017), and steps nothing else. The
  step that closes the scene is the dialogue's own step (0017, 0026); `closed` in `update`
  sets `finished` there.
- **Older tests that change, and no other.** `story.test.ts`: the call is the first scene,
  not the whole list, and the index without a scene is the one past the last. Ten full
  literals of a `GameState` get `finished: null` — in `state.test.ts` (4),
  `overview.test.ts` (3), `draw-scene.test.ts`, `draw-journal.test.ts` and
  `draw-help.test.ts`. No assertion of an older test changes.
- The two recorded digests of 600 steps (`RECORDED` in `tests/unit/journal.test.ts` and in
  `tests/unit/help.test.ts`) pass as they are — that is criterion 14; never record them
  again. They do not hash `finished`.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`.
- What is out of the spec is not built: no end of the game, no credits, no count on a page,
  no way to read the scene again.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: `CLOSE_DELAY_STEPS` 300; `CLOSE_SCENE` 1; the
  dialogue `{ speaker: 'story', index: 1, page: 0 }`; three pages; `finished` the tick of
  the step that closes the third.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | three keys: `story.close-1` to `story.close-3` |
| `src/game/story.ts` | the scene `close`; `CLOSE_SCENE`, `CLOSE_DELAY_STEPS`, `closeDue`, `openScene` |
| `src/game/state.ts` | `GameState.finished` |
| `src/game/update.ts` | `finished` starts `null`; the step that opens the close; the closing sets `finished` |
| `src/game/overview.ts` | the wake keeps `finished` |
| `tests/unit/*.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 4 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `story.close-1`, `story.close-2` and `story.close-3`, in both
  languages.

- [x] **Step 1: Write the failing test:**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -280,6 +280,47 @@
     ]);
   });
 
+  it('holds the three pages of the close in both languages (0034)', () => {
+    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
+      textOf(textKey(id), language).split('\n');
+    expect(lines('story.close-1', 'de')).toStrictEqual([
+      'Abend. Auf der Etage ist es ruhiger geworden.',
+      'Wo du warst, sind die Farben zurück – und',
+      'niemand hat Ärger bekommen.',
+    ]);
+    expect(lines('story.close-1', 'en')).toStrictEqual([
+      'Evening. The floor has grown quieter.',
+      'Where you have been, the colours are back –',
+      'and nobody got into trouble.',
+    ]);
+    expect(lines('story.close-2', 'de')).toStrictEqual([
+      'Die Geschäftsführung ruft an: „Gut. Aber das',
+      'war erst der Anfang, oder?“ Über den anderen',
+      'Türen liegt der Schatten noch.',
+    ]);
+    expect(lines('story.close-2', 'en')).toStrictEqual([
+      'The managing director calls: “Good. But that',
+      'was only the beginning, was it not?” The',
+      'shadow still lies over the other doors.',
+    ]);
+    expect(lines('story.close-3', 'de')).toStrictEqual([
+      'So weit reicht das Spiel bis heute.',
+      'Die übrigen Abteilungen folgen. Du kannst',
+      'dich weiter auf der Etage umsehen.',
+    ]);
+    expect(lines('story.close-3', 'en')).toStrictEqual([
+      'This is how far the game goes today.',
+      'The other departments will follow. You can',
+      'go on looking round the floor.',
+    ]);
+    // No page names a number: the text holds when a case is added.
+    for (const language of LANGUAGES) {
+      for (const id of ['story.close-1', 'story.close-2', 'story.close-3'] as const) {
+        expect(/[0-9]/.test(TABLE[language][id]), `${language} ${id}`).toBe(false);
+      }
+    }
+  });
+
   it('holds the eight pages of the intern in both languages (0033)', () => {
     const first = (id: Parameters<typeof textKey>[0]): string[] => [
       textOf(textKey(id), 'de').split('\n')[0] ?? '',
```

- [x] **Step 2: Run it** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 1 of 28
  tests. `npx tsc --noEmit` reports seven errors, all in this test: the three ids are not
  ids of the table yet.

- [x] **Step 3: The words,** in both tables:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -77,6 +77,21 @@
     'vorher nicht da war. Nebenan, bei der',
     'Datenschutzbeauftragten, brennt Licht.',
   ].join('\n'),
+  'story.close-1': [
+    'Abend. Auf der Etage ist es ruhiger geworden.',
+    'Wo du warst, sind die Farben zurück – und',
+    'niemand hat Ärger bekommen.',
+  ].join('\n'),
+  'story.close-2': [
+    'Die Geschäftsführung ruft an: „Gut. Aber das',
+    'war erst der Anfang, oder?“ Über den anderen',
+    'Türen liegt der Schatten noch.',
+  ].join('\n'),
+  'story.close-3': [
+    'So weit reicht das Spiel bis heute.',
+    'Die übrigen Abteilungen folgen. Du kannst',
+    'dich weiter auf der Etage umsehen.',
+  ].join('\n'),
   'notice.lamp': 'Die Lampe: Leertaste halten.',
   'notice.rest': 'Kaffee. Der Überblick ist wieder da.',
   'notice.rest-full': 'Kaffee. Den Überblick hast du schon.',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -73,6 +73,21 @@
     'that was not there before. Next door, the',
     'data protection officer has her light on.',
   ].join('\n'),
+  'story.close-1': [
+    'Evening. The floor has grown quieter.',
+    'Where you have been, the colours are back –',
+    'and nobody got into trouble.',
+  ].join('\n'),
+  'story.close-2': [
+    'The managing director calls: “Good. But that',
+    'was only the beginning, was it not?” The',
+    'shadow still lies over the other doors.',
+  ].join('\n'),
+  'story.close-3': [
+    'This is how far the game goes today.',
+    'The other departments will follow. You can',
+    'go on looking round the floor.',
+  ].join('\n'),
   'notice.lamp': 'The lamp: hold Space.',
   'notice.rest': 'Coffee. Your overview is back.',
   'notice.rest-full': 'Coffee. You have your overview already.',
```

- [x] **Step 4: Run** `npx vitest run tests/unit/text.test.ts` — green; the test that gives a
  page of talk and of the story at most three lines of at most 47 characters covers the
  three. Then `npm run check`: 1537 unit tests.

- [x] **Step 5: Commit** — `Add the words of the close`.

---

### Task 2: The scene and its rule

**Files:**
- Modify: `src/game/story.ts`
- Test: `tests/unit/story.test.ts`, `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: the three text ids (Task 1); `CASES`, `Case` of `game/cases`; `SolvedCase` of
  `game/state`.
- Produces:
  - `SCENES[1]`, the scene `close`; `CLOSE_SCENE = 1`; `CLOSE_DELAY_STEPS = 300`
  - `closeDue(tick: number, solved: readonly SolvedCase[], finished: number | null, cases: readonly Pick<Case, 'region'>[] = CASES): boolean`

- [x] **Step 1: Write the failing tests.** `tests/unit/story.test.ts` — two older tests no
  longer take the call for the whole list, and one block is new, at the end:

```diff
--- a/tests/unit/story.test.ts
+++ b/tests/unit/story.test.ts
@@ -3,7 +3,15 @@
 import { figuresOf } from '../../src/game/cast';
 import { routesOf } from '../../src/game/mover';
 import type { Dialogue } from '../../src/game/state';
-import { OPENING_SCENE, SCENES, type Scene, scenePages } from '../../src/game/story';
+import {
+  CLOSE_DELAY_STEPS,
+  CLOSE_SCENE,
+  closeDue,
+  OPENING_SCENE,
+  SCENES,
+  type Scene,
+  scenePages,
+} from '../../src/game/story';
 import { pagesOf, speakerOf, speakersOf } from '../../src/game/talk';
 import { createInitialState } from '../../src/game/update';
 import { textKey } from '../../src/text/text';
@@ -22,14 +30,15 @@
 
 describe('the scenes of the story (0026)', () => {
   it('holds the call with its three pages, and opens a game with it', () => {
-    expect(SCENES).toStrictEqual([{ id: 'call', pages: CALL }]);
+    // The first of the scenes; the close of 0034 follows it.
+    expect(SCENES[0]).toStrictEqual({ id: 'call', pages: CALL });
     expect(OPENING_SCENE).toBe(0);
     expect(SCENES[OPENING_SCENE]?.id).toBe('call');
   });
 
   it('gives the pages of a scene by its index, and none for an index without a scene', () => {
     expect(scenePages(0)).toStrictEqual(CALL);
-    expect(scenePages(1)).toStrictEqual([]);
+    expect(scenePages(SCENES.length)).toStrictEqual([]);
     expect(scenePages(-1)).toStrictEqual([]);
     const scenes: readonly Scene[] = [{ id: 'other', pages: [textKey('notice.language')] }];
     expect(scenePages(0, scenes)).toStrictEqual([textKey('notice.language')]);
@@ -56,3 +65,62 @@
     expect(pagesOf({ speaker: 'figure', index: 3, page: 0 }, speakers)).toStrictEqual([]);
   });
 });
+
+describe('the close (0034)', () => {
+  const CLOSE = [textKey('story.close-1'), textKey('story.close-2'), textKey('story.close-3')];
+  const SALES = { region: 'sales', at: 400 };
+  const MARKETING = { region: 'marketing', at: 700 };
+
+  it('is the second scene, with its three pages', () => {
+    expect(SCENES).toStrictEqual([
+      { id: 'call', pages: CALL },
+      { id: 'close', pages: CLOSE },
+    ]);
+    expect(CLOSE_SCENE).toBe(1);
+    expect(scenePages(CLOSE_SCENE)).toStrictEqual(CLOSE);
+    expect(CLOSE_DELAY_STEPS).toBe(300);
+  });
+
+  it('has the pages of its dialogue, whoever stands near', () => {
+    const story: Dialogue = { speaker: 'story', index: CLOSE_SCENE, page: 0 };
+    expect(pagesOf(story, [])).toStrictEqual(CLOSE);
+  });
+
+  it('is never due while a case is not solved, however many steps pass', () => {
+    expect(closeDue(100000, [], null)).toBe(false);
+    expect(closeDue(100000, [SALES], null)).toBe(false);
+    expect(closeDue(100000, [MARKETING], null)).toBe(false);
+  });
+
+  it('is due 300 steps after the step that solved the last case, and not one before', () => {
+    expect(closeDue(700, [SALES, MARKETING], null)).toBe(false);
+    expect(closeDue(999, [SALES, MARKETING], null)).toBe(false);
+    expect(closeDue(1000, [SALES, MARKETING], null)).toBe(true);
+    expect(closeDue(5000, [SALES, MARKETING], null)).toBe(true);
+  });
+
+  it('counts from the later case, in either order', () => {
+    const turned = [
+      { region: 'marketing', at: 400 },
+      { region: 'sales', at: 700 },
+    ];
+    expect(closeDue(999, turned, null)).toBe(false);
+    expect(closeDue(1000, turned, null)).toBe(true);
+    expect(closeDue(1000, [MARKETING, SALES], null)).toBe(true);
+  });
+
+  it('is not due once it was closed', () => {
+    expect(closeDue(1000, [SALES, MARKETING], 1010)).toBe(false);
+    expect(closeDue(100000, [SALES, MARKETING], 0)).toBe(false);
+  });
+
+  it('follows the table of cases it is given: a third case moves it behind that case', () => {
+    const three = [{ region: 'sales' }, { region: 'marketing' }, { region: 'support' }];
+    expect(closeDue(100000, [SALES, MARKETING], null, three)).toBe(false);
+    const all = [SALES, MARKETING, { region: 'support', at: 900 }];
+    expect(closeDue(1199, all, null, three)).toBe(false);
+    expect(closeDue(1200, all, null, three)).toBe(true);
+    // A table without a case never makes it due.
+    expect(closeDue(100000, all, null, [])).toBe(false);
+  });
+});
```

  `tests/unit/draw-scene.test.ts` — one block at its end:

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -2017,5 +2017,37 @@
     expect(spritesOn(renderer, content.fontSheet).some((call) => call.endsWith(',138'))).toBe(
       false,
     );
+  });
+});
+
+describe('the close in the scene (0034)', () => {
+  /** The close open on the given page. */
+  const closing = (page: number): GameState => ({
+    ...state({ x: 20, y: 30 }),
+    dialogue: { speaker: 'story', index: 1, page },
+  });
+  const firstGlyph = (scene: GameState, settings: SceneSettings = GERMAN): string | undefined => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, scene, CONTENT, settings);
+    const sprites = renderer.calls.filter((call) => call.startsWith('drawSprite'));
+    return sprites
+      .filter((_call, n) => renderer.sheets[n] === CONTENT.fontSheet)
+      .find((call) => call.endsWith(' at 12,138'));
+  };
+
+  it('draws its three pages in the box, as it draws the call: `A`, `D` and `S`', () => {
+    expect(firstGlyph(closing(0))).toBe('drawSprite 33 at 12,138');
+    expect(firstGlyph(closing(1))).toBe('drawSprite 36 at 12,138');
+    expect(firstGlyph(closing(2))).toBe('drawSprite 51 at 12,138');
   });
+
+  it('draws them in English with the language `en`: `E`, `T` and `T`', () => {
+    expect(firstGlyph(closing(0), ENGLISH)).toBe('drawSprite 37 at 12,138');
+    expect(firstGlyph(closing(1), ENGLISH)).toBe('drawSprite 52 at 12,138');
+    expect(firstGlyph(closing(2), ENGLISH)).toBe('drawSprite 52 at 12,138');
+  });
+
+  it('draws no page beyond the third', () => {
+    expect(firstGlyph(closing(3))).toBeUndefined();
+  });
 });
```

- [x] **Step 2: Run them** —
  `npx vitest run tests/unit/story.test.ts tests/unit/draw-scene.test.ts`. Expected: FAIL, 9
  tests: 7 of 11 in `story.test.ts`, 2 of 122 in `draw-scene.test.ts`. `npx tsc --noEmit`
  reports three errors: the three names are not exported. One new test is green already —
  no page beyond the third is drawn, which holds for a scene that does not exist too — and
  the two older tests of `story.test.ts` hold before and after.

- [x] **Step 3: The scene and the rule:**

```diff
--- a/src/game/story.ts
+++ b/src/game/story.ts
@@ -1,9 +1,12 @@
 import { type TextKey, textKey } from '../text/text';
+import { CASES, type Case } from './cases';
+import type { SolvedCase } from './state';
 
 /**
  * The story (vision.md §4, feature 0026). A scene is text the story itself says: pages in the
  * dialogue box, with no figure that speaks. The game opens a scene, never a press; nobody
- * turns to anybody. Pure data.
+ * turns to anybody. The close (0034) follows the last case of the game: the story says once
+ * that the rest of the floor follows. Pure data and pure functions.
  */
 
 export interface Scene {
@@ -17,11 +20,45 @@
     id: 'call',
     pages: [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')],
   },
+  {
+    id: 'close',
+    pages: [textKey('story.close-1'), textKey('story.close-2'), textKey('story.close-3')],
+  },
 ];
 
 /** The scene a new game opens with: the call. The step that closes it ends the game's opening. */
 export const OPENING_SCENE = 0;
+/** The scene that follows the last case of the game (0034): the close. */
+export const CLOSE_SCENE = 1;
+/** Tune: five seconds from the step that solved the last case to the close. */
+export const CLOSE_DELAY_STEPS = 300;
 
+/**
+ * Whether the close is due (0034): it was not closed before, every case is solved, and at
+ * least CLOSE_DELAY_STEPS steps have passed since the step that solved the last of them. A
+ * table without a case never makes it due. Derived on every call; the state has no field for
+ * it. A case that joins the table moves the close behind it.
+ */
+export function closeDue(
+  tick: number,
+  solved: readonly SolvedCase[],
+  finished: number | null,
+  cases: readonly Pick<Case, 'region'>[] = CASES,
+): boolean {
+  if (finished !== null || cases.length === 0) {
+    return false;
+  }
+  let last = 0;
+  for (const { region } of cases) {
+    const entry = solved.find((candidate) => candidate.region === region);
+    if (entry === undefined) {
+      return false;
+    }
+    last = Math.max(last, entry.at);
+  }
+  return tick - last >= CLOSE_DELAY_STEPS;
+}
+
 /** The pages of the scene with this index; none when there is no such scene. */
 export function scenePages(index: number, scenes: readonly Scene[] = SCENES): readonly TextKey[] {
   return scenes[index]?.pages ?? [];
```

- [x] **Step 4: Run** the two test files of Step 2 — green, the tests of the call unchanged.
  Then `npm run check`: 1547 unit tests.

- [x] **Step 5: Commit** — `Add the close and the rule that says when it is due`. Body: the
  rule reads the list of the cases, so a case that is added moves the close behind it.

---

### Task 3: The close in the state and in the step

**Files:**
- Modify: `src/game/state.ts`, `src/game/story.ts`, `src/game/update.ts`,
  `src/game/overview.ts`
- Test: `tests/unit/state.test.ts`, `tests/unit/floor.test.ts`,
  `tests/unit/overview.test.ts`, `tests/unit/draw-scene.test.ts`,
  `tests/unit/draw-journal.test.ts`, `tests/unit/draw-help.test.ts`,
  `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `CLOSE_SCENE`, `closeDue` (Task 2).
- Produces:
  - `GameState.finished: number | null`, `null` in `createInitialState` and in `newGame`
  - `openScene(state: GameState, input: GameInput, scene: number): GameState` in
    `game/story`
  - `update`: opens the close when it is due; the step that closes it sets `finished`

- [x] **Step 1: Write the failing tests.** `tests/unit/state.test.ts` — four literals get the
  field, and one block is new, at the end:

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -14,6 +14,7 @@
   type PlayerState,
   SPECIES,
 } from '../../src/game/state';
+import { CLOSE_SCENE } from '../../src/game/story';
 import { createInitialState, newGame, update } from '../../src/game/update';
 import { grassMap } from './grass-map';
 
@@ -87,6 +88,7 @@
     expect(createInitialState(MAP)).toStrictEqual({
       tick: 0,
       rested: null,
+      finished: null,
       upgrades: [],
       player: {
         x: 136,
@@ -157,6 +159,7 @@
       {
         tick: 41,
         rested: null,
+        finished: null,
         upgrades: [],
         player,
         camera: { x: 0, y: 12 },
@@ -187,6 +190,7 @@
     const state: GameState = {
       tick: 7,
       rested: null,
+      finished: null,
       upgrades: [],
       player,
       camera: { x: 0, y: 12 },
@@ -209,6 +213,7 @@
     expect(state).toStrictEqual({
       tick: 7,
       rested: null,
+      finished: null,
       upgrades: [],
       player,
       camera: { x: 0, y: 12 },
@@ -1220,5 +1225,220 @@
   it('survives a JSON round trip at the start (INV-1)', () => {
     const start = createInitialState(BEHIND);
     expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
+  });
+});
+
+describe('the close in the state (0034)', () => {
+  const TALK: GameInput = { ...NONE, talk: true };
+  /** Both sources, each waiting ten seconds on its first point, and one trace of each case. */
+  const BOTH = grassMap(
+    20,
+    12,
+    { x: 104, y: 48 },
+    [
+      { name: 'person:sales:1', x: 64, y: 48, pause: 600 },
+      { name: 'person:sales:2', x: 128, y: 48 },
+      { name: 'person:marketing:1', x: 64, y: 144, pause: 600 },
+      { name: 'person:marketing:2', x: 128, y: 144 },
+    ],
+    [
+      { name: 'trace:sales', x: 240, y: 32, width: 16, height: 16 },
+      { name: 'trace:marketing', x: 240, y: 128, width: 16, height: 16 },
+    ],
+  );
+  const start = createInitialState(BOTH);
+  /** Both cases solved, the later one at step 700; the game stands at the given tick. */
+  const solvedAt = (tick: number, fields: Partial<GameState> = {}): GameState => ({
+    ...start,
+    tick,
+    // Far from both sources: a press of talk reaches nobody.
+    player: { ...start.player, x: 280, y: 96 },
+    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+    solved: [
+      { region: 'sales', at: 400 },
+      { region: 'marketing', at: 700 },
+    ],
+    overview: { current: 7, max: 7 },
+    ...fields,
+  });
+  const run = (from: GameState, ...inputs: readonly GameInput[]): GameState =>
+    inputs.reduce((state, input) => update(state, input, BOTH), from);
+  const OPEN = { speaker: 'story', index: CLOSE_SCENE, page: 0 } as const;
+
+  it('starts with the close not closed, in a played game too', () => {
+    expect(start.finished).toBeNull();
+    expect(newGame(BOTH).finished).toBeNull();
+    expect(createInitialState(FLOOR_MAP).finished).toBeNull();
+  });
+
+  it('opens by itself in the step with tick 1000 before it: 300 steps after the last case', () => {
+    const before = run(solvedAt(998), RIGHT);
+    expect(before.tick).toBe(999);
+    expect(before.dialogue).toBeNull();
+    expect(before.player.x).toBeGreaterThan(280);
+    const last = update(before, RIGHT, BOTH);
+    expect(last.tick).toBe(1000);
+    expect(last.dialogue).toBeNull();
+    const opened = update(last, RIGHT, BOTH);
+    expect(opened.dialogue).toStrictEqual(OPEN);
+    expect(opened).toStrictEqual({
+      ...last,
+      tick: 1001,
+      held: RIGHT,
+      player: { ...last.player, frame: 0, frameTimer: 0 },
+      dialogue: OPEN,
+    });
+  });
+
+  it('opens with the lamp off, and the figure does not move in that step', () => {
+    const shining = run(solvedAt(999), SHINE);
+    expect(shining.lamp.on).toBe(true);
+    const opened = update(shining, SHINE, BOTH);
+    expect(opened.dialogue).toStrictEqual(OPEN);
+    expect(opened.lamp).toStrictEqual({ ...shining.lamp, on: false });
+    expect([opened.player.x, opened.player.y]).toStrictEqual([shining.player.x, shining.player.y]);
+  });
+
+  it('does not open with one case solved, however long the game runs', () => {
+    let state = solvedAt(1000, { solved: [{ region: 'sales', at: 400 }] });
+    for (let step = 0; step < 6000; step += 1) {
+      state = update(state, NONE, BOTH);
+    }
+    expect(state.dialogue).toBeNull();
+    expect(state.finished).toBeNull();
+  });
+
+  it('turns its pages with a press each, and the third press closes it and sets `finished`', () => {
+    const opened = update(solvedAt(1000), NONE, BOTH);
+    const second = run(opened, TALK);
+    expect(second.dialogue).toStrictEqual({ ...OPEN, page: 1 });
+    // A held key turns one page.
+    expect(run(second, TALK, TALK).dialogue).toStrictEqual({ ...OPEN, page: 1 });
+    const third = run(second, NONE, TALK);
+    expect(third.dialogue).toStrictEqual({ ...OPEN, page: 2 });
+    expect(third.finished).toBeNull();
+    const closed = run(third, NONE, TALK);
+    expect(closed.dialogue).toBeNull();
+    expect(closed.tick).toBe(1006);
+    expect(closed.finished).toBe(1006);
+    expect(closed).toStrictEqual({
+      ...third,
+      tick: 1006,
+      held: TALK,
+      dialogue: null,
+      finished: 1006,
+    });
+  });
+
+  it('steps nothing else while it is open, and `J` does nothing, as under the call', () => {
+    const opened = update(solvedAt(1000), NONE, BOTH);
+    const waited = run(opened, RIGHT, { ...NONE, journal: true }, SHINE);
+    expect(waited).toStrictEqual({ ...opened, tick: opened.tick + 3, held: SHINE });
   });
+
+  it('never opens again: 6000 steps later no dialogue has opened by itself', () => {
+    let state = run(update(solvedAt(1000), NONE, BOTH), TALK, NONE, TALK, NONE, TALK);
+    expect(state.finished).toBe(1006);
+    for (let step = 0; step < 6000; step += 1) {
+      state = update(state, NONE, BOTH);
+      expect(state.dialogue).toBeNull();
+    }
+    expect(state.finished).toBe(1006);
+  });
+
+  it('comes before the journal and before a talk in the step it opens', () => {
+    expect(update(solvedAt(1000), { ...NONE, journal: true }, BOTH)).toMatchObject({
+      dialogue: OPEN,
+      journal: null,
+    });
+    // Beside the colleague of Sales, with a press of talk.
+    const beside = solvedAt(1000, { player: { ...start.player, x: 104, y: 48 } });
+    expect(update(beside, TALK, BOTH).dialogue).toStrictEqual(OPEN);
+    // One step earlier the same press opens the talk.
+    const early = solvedAt(999, { player: { ...start.player, x: 104, y: 48 } });
+    expect(update(early, TALK, BOTH).dialogue).toStrictEqual({
+      speaker: 'mover',
+      index: 0,
+      page: 0,
+    });
+  });
+
+  it('waits while the dark, the help, the journal, a talk or a push has the step, and opens after it', () => {
+    // The journal: open over the due step, closed with a press, and the close opens next.
+    const reading = solvedAt(1000, { journal: { tab: 'creatures' } });
+    const stillReading = update(reading, NONE, BOTH);
+    expect(stillReading.dialogue).toBeNull();
+    const shut = update(stillReading, { ...NONE, journal: true }, BOTH);
+    expect(shut.journal).toBeNull();
+    expect(update(shut, NONE, BOTH).dialogue).toStrictEqual(OPEN);
+    // The help.
+    const helped = update(solvedAt(1000, { help: true }), NONE, BOTH);
+    expect(helped.dialogue).toBeNull();
+    expect(helped.help).toBe(true);
+    // The dark: nothing opens until it is over.
+    let dark = solvedAt(1000, { dark: 80 });
+    for (let step = 0; step < 9; step += 1) {
+      dark = update(dark, NONE, BOTH);
+      expect(dark.dialogue).toBeNull();
+    }
+    dark = update(dark, NONE, BOTH);
+    expect(dark.dark).toBe(0);
+    expect(update(dark, NONE, BOTH).dialogue).toStrictEqual(OPEN);
+    // A talk that is open: its own pages first.
+    const talking = solvedAt(1000, { dialogue: { speaker: 'mover', index: 0, page: 0 } });
+    const after = update(talking, TALK, BOTH);
+    expect(after.dialogue).toBeNull();
+    expect(update(after, NONE, BOTH).dialogue).toStrictEqual(OPEN);
+    // A push: the figure is carried on, and the close opens when it stands.
+    const pushed = solvedAt(1000, {
+      player: { ...solvedAt(1000).player, recoil: { dx: 3, dy: 0, steps: 2 } },
+    });
+    const first = update(pushed, NONE, BOTH);
+    expect(first.dialogue).toBeNull();
+    expect(first.player.recoil.steps).toBe(1);
+    const second = update(first, NONE, BOTH);
+    expect(second.dialogue).toBeNull();
+    expect(update(second, NONE, BOTH).dialogue).toStrictEqual(OPEN);
+  });
+
+  it('keeps `finished` through the wake, closed or not', () => {
+    const closed = solvedAt(2000, { finished: 1006, dark: 44 });
+    const woken = update(closed, NONE, BOTH);
+    expect(woken.dark).toBe(45);
+    expect(woken.finished).toBe(1006);
+    const fresh = update(solvedAt(900, { dark: 44 }), NONE, BOTH);
+    expect(fresh.finished).toBeNull();
+  });
+
+  it('follows the solving step of a game: the last answer, 300 steps, the close', () => {
+    // Marketing ready, Sales solved long ago; the figure beside the colleague of Marketing.
+    let state: GameState = {
+      ...start,
+      tick: 1000,
+      player: { ...start.player, x: 104, y: 144 },
+      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+      solved: [{ region: 'sales', at: 400 }],
+    };
+    state = run(state, TALK, NONE, TALK, NONE, TALK);
+    expect(state.solved[1]).toStrictEqual({ region: 'marketing', at: 1005 });
+    const opensAt: number[] = [];
+    for (let step = 0; step < 310; step += 1) {
+      const next = update(state, NONE, BOTH);
+      if (state.dialogue === null && next.dialogue !== null) {
+        opensAt.push(state.tick);
+      }
+      state = next;
+    }
+    expect(opensAt).toStrictEqual([1305]);
+    expect(state.dialogue).toStrictEqual(OPEN);
+  });
+
+  it('survives a JSON round trip at the start, with the close open and after it (INV-1)', () => {
+    const opened = update(solvedAt(1000), NONE, BOTH);
+    const closed = run(opened, TALK, NONE, TALK, NONE, TALK);
+    for (const state of [start, opened, closed]) {
+      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
+    }
+    expect(closed.finished).toBe(1006);
+  });
 });
```

  `tests/unit/floor.test.ts` — one block at its end:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -18,6 +18,7 @@
 import { restInReach, restsOf, restUnderShadow } from '../../src/game/rest';
 import { standingWalls, wallsOf, withWalls } from '../../src/game/shadow';
 import { type GameState, NO_RECOIL } from '../../src/game/state';
+import { CLOSE_SCENE } from '../../src/game/story';
 import { speakerInReach, speakersOf, TALK_DISTANCE } from '../../src/game/talk';
 import { traceInLight, tracesOf } from '../../src/game/trace';
 import { createInitialState, update } from '../../src/game/update';
@@ -2196,3 +2197,47 @@
     }
   });
 });
+
+describe('the close on the floor (0034)', () => {
+  const TALK: GameInput = { ...NO_INPUT, talk: true };
+  const routes = routesOf(floor.points);
+  const start = createInitialState(floor);
+  /** The state with the figure 24 px below the colleague of the given route, where it is now. */
+  const beside = (state: GameState, route: string): GameState => {
+    const source = state.movers.find((mover) => routes[mover.route]?.name === route);
+    return {
+      ...state,
+      player: { ...state.player, x: source?.x ?? 0, y: (source?.y ?? 0) + 24 },
+    };
+  };
+  const answer = (from: GameState): GameState =>
+    [TALK, NO_INPUT, TALK, NO_INPUT, TALK, NO_INPUT].reduce(
+      (state, input) => update(state, input, floor),
+      from,
+    );
+  /** Every trace found long ago. */
+  const ready: GameState = {
+    ...start,
+    tick: 1000,
+    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+  };
+
+  it('opens 300 steps after the second of the two cases of the floor, and not after the first', () => {
+    let state = answer(beside(ready, 'person:sales'));
+    expect(state.solved.map((entry) => entry.region)).toStrictEqual(['sales']);
+    for (let step = 0; step < 400; step += 1) {
+      state = update(state, NO_INPUT, floor);
+    }
+    expect(state.dialogue).toBeNull();
+    state = answer(beside(state, 'person:marketing'));
+    const last = state.solved[1];
+    expect(last?.region).toBe('marketing');
+    while (state.tick < (last?.at ?? 0) + 300) {
+      state = update(state, NO_INPUT, floor);
+      expect(state.dialogue).toBeNull();
+    }
+    state = update(state, NO_INPUT, floor);
+    expect(state.dialogue).toStrictEqual({ speaker: 'story', index: CLOSE_SCENE, page: 0 });
+    expect(state.finished).toBeNull();
+  });
+});
```

  The other full literals of a state get the field:

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -163,6 +163,7 @@
   const FALLEN: GameState = {
     tick: 500,
     rested: null,
+    finished: null,
     upgrades: [],
     player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
     camera: { x: 140, y: 106 },
@@ -194,6 +195,7 @@
       ...FALLEN,
       tick: 543,
       rested: null,
+      finished: null,
       upgrades: [],
       lamp: { on: false, strength: 1, owned: true, used: true },
       dark: 44,
@@ -206,6 +208,7 @@
     expect(woken).toStrictEqual({
       tick: 544,
       rested: null,
+      finished: null,
       upgrades: [],
       player,
       camera: followPlayer(player, MAP),
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -198,6 +198,7 @@
 ): GameState => ({
   tick: QUIET_TICK,
   rested: null,
+  finished: null,
   upgrades: [],
   player: player(fields),
   camera,
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -92,6 +92,7 @@
 const reading = (tab: JournalTab, snippets = 0): GameState => ({
   tick: 100,
   rested: null,
+  finished: null,
   upgrades: [],
   player: {
     x: 160,
```

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -97,6 +97,7 @@
 const playing = (fields: Partial<GameState> = {}): GameState => ({
   tick: 700,
   rested: null,
+  finished: null,
   upgrades: [],
   player: {
     x: 184,
```

  And the smoke spec gets a test, at its end:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -451,4 +451,14 @@
     })
     .toStrictEqual([]);
   expect(await page.evaluate(() => window.shadowAi?.state.lamp.strength)).toBe(1);
+});
+
+test('the game starts with the close not closed', async ({ page }) => {
+  await start(page);
+  // One poll for the whole value: nothing is read from a page that might still be loading.
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.finished), {
+      message: 'window.shadowAi.state.finished is there and null: the close has not been read',
+    })
+    .toBeNull();
 });
```

- [x] **Step 2: Run them** —
  `npx vitest run tests/unit/state.test.ts tests/unit/overview.test.ts tests/unit/floor.test.ts`.
  Expected: FAIL, 15 tests: 13 of 103 in `state.test.ts`, 1 of 26 in `overview.test.ts` —
  the wake, whose literal now has the field — and 1 of 125 in `floor.test.ts`.
  `npx tsc --noEmit` reports 20 errors: `finished` is no field of the state. Then
  `npx playwright test -g "close not closed"`. Expected: FAIL, `Received: undefined`.

- [x] **Step 3: The field:**

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -202,6 +202,11 @@
   readonly solved: readonly SolvedCase[];
   /** The last rest taken, or null (0027); the notice of a rest is derived from it. */
   readonly rested: Rested | null;
+  /**
+   * The tick of the step that closed the close — the scene after the last case — or null
+   * (0034). It opens once.
+   */
+  readonly finished: number | null;
   /** The standing figures of the map, in file order (0017). */
   readonly figures: readonly FigureState[];
   /** The dialogue that is open, or null. While it is open nothing else is stepped (0017). */
```

- [x] **Step 4: A scene that the game opens by itself:**

```diff
--- a/src/game/story.ts
+++ b/src/game/story.ts
@@ -1,6 +1,7 @@
 import { type TextKey, textKey } from '../text/text';
 import { CASES, type Case } from './cases';
-import type { SolvedCase } from './state';
+import type { GameInput } from './player';
+import type { GameState, SolvedCase } from './state';
 
 /**
  * The story (vision.md §4, feature 0026). A scene is text the story itself says: pages in the
@@ -59,6 +60,22 @@
   return tick - last >= CLOSE_DELAY_STEPS;
 }
 
+/**
+ * The state after a step in which the game opens a scene by itself (0034): the scene on its
+ * first page, the figure standing, the lamp off, the tick grown and the input remembered, as
+ * when a talk opens (0017). Nothing else changes, and nothing else is stepped.
+ */
+export function openScene(state: GameState, input: GameInput, scene: number): GameState {
+  return {
+    ...state,
+    tick: state.tick + 1,
+    held: input,
+    player: { ...state.player, frame: 0, frameTimer: 0 },
+    lamp: { ...state.lamp, on: false },
+    dialogue: { speaker: 'story', index: scene, page: 0 },
+  };
+}
+
 /** The pages of the scene with this index; none when there is no such scene. */
 export function scenePages(index: number, scenes: readonly Scene[] = SCENES): readonly TextKey[] {
   return scenes[index]?.pages ?? [];
```

- [x] **Step 5: The step** starts with the close not closed, opens it when it is due, and
  remembers the step that closes it:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -20,7 +20,7 @@
   NO_RECOIL,
   type PlayerState,
 } from './state';
-import { OPENING_SCENE } from './story';
+import { CLOSE_SCENE, closeDue, OPENING_SCENE, openScene } from './story';
 import { openDialogue, speakersOf, stepDialogue } from './talk';
 import { hiddenTraces, stepTraces, tracesOf } from './trace';
 import { BASE_STRENGTH } from './world';
@@ -71,6 +71,7 @@
     traces: hiddenTraces(tracesOf(map.rects)),
     solved: [],
     rested: null,
+    finished: null,
     figures: figuresFrom(figures),
     dialogue: null,
     journal: null,
@@ -99,8 +100,8 @@
  * What the step that closed a dialogue changes besides closing it (0024, 0025, 0026). Closing
  * the first meeting hands the lamp over. Closing the source's answer of a ready case solves the
  * case, earns the upgrade of its region if it has one (0029), and what is left of the region's
- * shadow goes with it. Every other closing — that of a scene of the story, the call among them
- * — changes nothing more.
+ * shadow goes with it. Closing the close sets `finished` to the step's tick, so it opens once
+ * (0034). Every other closing — that of the call among them — changes nothing more.
  */
 function closed(
   stepped: GameState,
@@ -109,7 +110,7 @@
   content: TileMap,
 ): GameState {
   if (dialogue.speaker === 'story') {
-    return stepped;
+    return dialogue.index === CLOSE_SCENE ? { ...stepped, finished: stepped.tick } : stepped;
   }
   if (isFirstMeeting(dialogue, figuresOf(content.points), before.lamp.owned)) {
     return { ...stepped, lamp: { ...stepped.lamp, owned: true } };
@@ -177,6 +178,11 @@
     const stepped = stepDialogue(state, state.dialogue, input, speakers);
     return stepped.dialogue === null ? closed(stepped, state.dialogue, state, content) : stepped;
   }
+  // The close opens by itself once it is due and the figure is not being pushed (0034) —
+  // instead of the journal, a talk or an ordinary step.
+  if (state.player.recoil.steps === 0 && closeDue(state.tick, state.solved, state.finished)) {
+    return openScene(state, input, CLOSE_SCENE);
+  }
   const journal = openJournal(state, input);
   if (journal !== null) {
     return journal;
@@ -236,6 +242,7 @@
     ),
     solved: state.solved,
     rested,
+    finished: state.finished,
     figures: state.figures,
     dialogue: null,
     journal: null,
```

- [x] **Step 6: The wake** keeps it:

```diff
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -146,6 +146,7 @@
     traces: restedTraces(state.traces),
     solved: state.solved,
     rested: state.rested,
+    finished: state.finished,
     figures: state.figures,
     dialogue: null,
     journal: null,
```

- [x] **Step 7: Run** the three test files of Step 2 — green — then `npm run check`: 1560 unit
  tests, the two recorded digests among them, and `npm run test:e2e` twice: 19 passed, 3
  skipped, both times.

- [x] **Step 8: Commit** — `Open the close once, five seconds after the last case`. Body: it
  waits for whatever has the step and comes before the journal and a talk; the step that
  closes it is remembered, so it never opens again.

---

### Task 4: The documents

**Files:**
- Modify: `docs/spec/vision.md`, `docs/spec/gameplay.md`, `docs/spec/architecture.md`,
  `docs/spec/testing.md`, `README.md`

The diffs are against `main` at `199085c`. If a line has moved, put the text where the diff
means it; do not change the words without a reason.

- [x] **Step 1: `vision.md`** §4:

```diff
--- a/docs/spec/vision.md
+++ b/docs/spec/vision.md
@@ -63,6 +63,13 @@
 room of the player's own, so nobody can stand in its door. The third page points next door, to
 the data protection officer, who hands the lamp over in the first talk.
 
+*As built* (feature 0034): while the game is unfinished, the story speaks once more after the
+last case there is — three pages, five seconds after it is solved. The evening, and nobody got
+into trouble; a second call of the managing director, one sentence again; and one page in which
+the game says how far it goes today and that the other departments follow. That third page is
+the one text that is not the story's. Then the game goes on. The scene follows whatever the
+last case is, and the epilogue of Act 3 replaces it.
+
 **The shadow.** A residue, not a being. Wherever data leaves the house without anybody watching,
 something stays behind and grows with the flow. It darkens rooms, lies over screens, blocks
 corridors like a wall of flicker. Where the use gets dense, it condenses into creatures — one
```

- [x] **Step 2: `gameplay.md`** §6:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -193,6 +193,15 @@
 colleagues who see the shadow, as a rule of the game, come with M6, and the first act has no
 end card: it ends in the cleared room, and the game goes on.
 
+**As built** (feature 0034): the game says when the player has done everything there is. This
+is no end card of an act: it follows the last case of the game, not Act 1, and nothing ends.
+Five seconds after the step that solved the last case — the line of the solved case and the
+line of an upgrade are over, and a second of quiet has followed — the story opens a scene of
+three pages by itself (`vision.md` §4). It waits while the dark, the help, the journal, a talk
+or a push has the step, and it comes before the journal and before a talk in the step it
+opens. E or Enter turns its pages; the last press closes it, and it never opens again. The
+rule reads the list of the cases: a case that is added moves the close behind it.
+
 **As built** (feature 0028): the case of Marketing, by the same rules and with nothing added
 to them. Its source is the colleague in the red shirt who walks between the desk islands and
 the printer. Its five traces lie on four screens and on the printer. With all five found the
```

- [x] **Step 3: `architecture.md`** §2 and §8:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -102,7 +102,8 @@
 
 One `GameState` object holds everything that changes while playing. Today that is `tick`, the
 logic steps since the start, the player, the camera, the lamp, the upgrades, the creatures, the movers, the
-standing shadow walls, the traces, the solved cases, the standing figures, the open dialogue,
+standing shadow walls, the traces, the solved cases, the step that closed the close, the
+standing figures, the open dialogue,
 the open journal,
 whether the help is open, the input of the last step, the captured count, overview and the step
 of the dark; later the current map id
@@ -313,6 +314,18 @@
 stepped like any other. The game opens a scene, never a press; in this feature only `newGame`
 does.
 
+The **close** (feature 0034) is the second scene, `CLOSE_SCENE`, 1. `closeDue(tick, solved,
+finished)` in `game/story` says whether it is due: `finished` is `null`, every case of `CASES`
+is in `solved`, and `tick` minus the largest `at` among them is at least `CLOSE_DELAY_STEPS`,
+300. In `update` a step in which it is due and the player is not being pushed opens it
+(`openScene`) — after the dark, the help, the journal and an open dialogue have had the step,
+and before a press of `journal` or of `talk` is looked at: `dialogue` becomes
+`{ speaker: 'story', index: 1, page: 0 }`, the player's `frame` and `frameTimer` are 0, the
+lamp is off, `tick` grows by 1 and the input is remembered; nothing else is stepped. `finished`
+is the `tick` of the step that closes the scene, or `null`: `null` at the start and in a new
+game, and the wake keeps it. Whether the close is due is derived in every step and is not in
+the state.
+
 The **first meeting** (feature 0026) is data of `game/cast`: `FIRST_MEETING` names the figure
 that hands the lamp over, `officer`, and its pages, `talk.officer-rules-1` and
 `talk.officer-meeting-2`. While the lamp is not owned, `figuresIn(figures, owned)` gives that
@@ -1255,7 +1268,9 @@
 
 The story (feature 0026) adds the kind `story`: `story.<scene>-<n>` is a page of a scene, under
 the rule of a page of talk — at most three lines of at most 47 characters, none empty — and the
-test of that rule covers both kinds. `game/story` names the pages by key in `SCENES`.
+test of that rule covers both kinds. `game/story` names the pages by key in `SCENES`. The close
+(feature 0034) adds three pages of the kind, `story.close-1` to `story.close-3`; none of them
+holds a number.
 `talk.officer-meeting-2` is the page of the first meeting that hands the lamp over, named in
 `FIRST_MEETING`; `notice.lamp` is a notice.
 
```

- [x] **Step 4: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -19,7 +19,7 @@
 
 | Invariant | Test |
 |---|---|
-| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the wider cone earned, by hand and by solving the case of Marketing (0029); the initial state and one with the help open (0021) |
+| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the wider cone earned, by hand and by solving the case of Marketing (0029); the initial state, one with the close open and one after it (0034); the initial state and one with the help open (0021) |
 | INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/`, and on the type `Language` there — the game does not know the language (0019) |
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
 | INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
```

- [x] **Step 5: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -57,7 +57,8 @@
 a half times as wide, and the shadow walls of HR and Accounting give way to it (feature 0029).
 Marketing has a creature of its own: the mirage, a framed picture that moves only while nobody
 looks at it (feature 0032). An intern stands in the break room and says, when asked, where the
-next step is (feature 0033).
+next step is (feature 0033). Five seconds after the last case there is, the story says once
+that the rest of the floor follows, and the game goes on (feature 0034).
 Every merge to `main` is deployed to Cloud Run (feature 0030).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
```

- [x] **Step 6:** `npm run check`, then commit — `Move the close into the spec`.

---

### Task 5: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 19 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 5 in this file and commit —
  `Tick the full check of 0034`.

---

### Task 6: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow
  keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk — that the game opens
  with the call (0026), so the call is read and the lamp fetched before step 1 — and that
  this walk solves both cases and takes about ten minutes. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–16 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 5, and start again at step 1.
- [ ] **Step 4:** after step 16 ask the four feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–16`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0034`. A feel note that wants something
  else — another delay, other words, no third page — becomes a new draft, not a change on
  this branch. The spec marks the delay *tune*: say so when the author asks for another.

---

### Task 7: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 5. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M6 section, say that 0032 to
  0034 are implemented and the other four are approved. Commit — `Mark 0034 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0034: the close`, with the walk's result and feel notes in its description. CI
  must be green. The author merges.
