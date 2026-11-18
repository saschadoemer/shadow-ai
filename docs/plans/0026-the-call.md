# 0026 — Implementation plan: the call

**Spec:** [`docs/features/0026-the-call.md`](../features/0026-the-call.md) (approved
2026-11-18, amended the same day with the start hint). The plan argues from the spec; where
they differ, the spec wins. Read the spec first, then `CLAUDE.md`, then
`docs/spec/architecture.md` §2, §4, §5 and §8, `docs/spec/gameplay.md` §2 and §8,
`docs/spec/vision.md` §4 and `docs/spec/testing.md` §5. **Written:** 2026-11-18 on the
planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0025 is merged into `main` (`8020f24` or later). The branch
`feature/0026-the-call` exists, cut from that `main`, and holds this plan. Work on it; merge
the latest `main` into it before Task 1. The specs of 0027, 0028 and 0029 are on `main`; they
are approved, have no plan yet, and are **not** built here.

**Goal:** a played game opens with the call — three pages of story in the dialogue box —
and without the lamp; the data protection officer hands the lamp over in the first talk, a
line names its key until it is held once, and the help's start hint counts its ten seconds
from the end of the call.

**Approach:** six code tasks, each green on its own. The words (T1). The new fields of the
state — `lamp.owned`, `lamp.used`, `started` — with the values of a game past its opening,
so that nothing behaves differently yet (T2). The data: the scenes of the story, the first
meeting, and the pages of a dialogue (T3). The opening in `update`: `newGame`, the call,
the lamp that is not owned, the hand-over (T4). The bar and the scene: the lamp's line, the
start hint, the page of a scene (T5). Only then does the game start with it: `main.ts` and
the smoke spec (T6). Until Task 6 the game a browser shows is the one of `main`. Then the
documents (T7), the full check with the container (T8), the walk (T9) and the pull request
(T10).

**How this plan was checked:** the code and the tests of Tasks 1 to 6 were run once as a
prototype on 2026-11-18, on the source of `main` at `8020f24`, and then replayed task by
task: after each of the six tasks typecheck and Biome were clean and the unit tests green —
1203, 1203, 1213, 1243, 1262 and 1262 tests (1202 before). The tests of Tasks 1 to 5 were
also run before their code and failed as the steps say. The diffs of this file, applied to a
clean tree, gave the prototype's files byte for byte. `npm run check` with the build passed
on the whole prototype, and the smoke spec passed three times against a dev server of it:
16 passed, 3 skipped. The prototype was thrown away; nothing of it is on the branch. If a
step does not behave as written, the cause is a difference to that state — stop and look; do
not bend a test. The game was **not** played in a browser — that is the walk — the smoke
test of Task 6 was not run before its code, and the container was **not** run with the
prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `lamp.owned`, `lamp.used` and `started` are plain data. The pages of a dialogue,
  who says the first meeting, the lamp's line and whether the start hint is due are
  **derived** on every call; none of it is stored.
- INV-2: `src/game/story.ts` imports only from `src/text/`. `talk.ts` imports from
  `story.ts` and `cast.ts`; `cast.ts` imports the types `Dialogue` and `FigureState` from
  `state.ts` and nothing from `talk.ts` or `update.ts`.
- INV-4: the five strings live in `src/text/de.ts` and `src/text/en.ts`; `story.ts`,
  `cast.ts` and `notice.ts` hold keys.
- **Two starts.** `createInitialState` stays a game past its opening — the lamp owned and
  used, no dialogue, `started` 0 — and every test of an earlier feature steps from it
  unchanged. `newGame` is what a player gets. Only `main.ts` calls `newGame`.
- **The input is not changed.** `held` remembers the input as it came. `update` counts
  `lamp` as not held while the lamp is not owned: for `lamp.on`, for `stepPlayer` and for
  the press of `talk` in `openDialogue`.
- The order of `update` stays: the dark, the help, the journal, a dialogue, the opening of
  the journal, the opening of a dialogue, the ordinary step. The help of 0021 opens over the
  call like over any dialogue.
- A scene is no speaker: `speakersOf` and `Speaker` are not changed, and nobody can walk up
  to a scene. The pages of any dialogue come from `pagesOf`; `update` and the scene must
  both use it, and both must build the figures with `figuresIn(figures, lamp.owned)`. If
  only one of them did, the box would show a page the dialogue does not have.
- **The digests are not recorded again.** The two recordings of 600 steps — `RECORDED` in
  `tests/unit/journal.test.ts` and in `tests/unit/help.test.ts` — hash `state.lamp`, which
  gains two fields. Task 2 changes what is hashed to `{ on, strength }`, the lamp as it was
  recorded; the two hashes stay as they are. That is criterion 13.
- `helpHintDue(tick)` keeps its signature and its tests of 0021. The rule with `started` is a
  function of its own, `startHintDue(state)`.
- The spec's test plan names areas, not files. The tests of the opening are in one new file,
  `tests/unit/opening.test.ts`; those of the scenes in `tests/unit/story.test.ts`.
- No tile changes, no map changes, no new sprite, no fixture.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or
  `afterEach`: Biome reads it as a duplicate test hook.
- In the scene tests two sheets or tilesets that must be told apart need different objects:
  `toStrictEqual` cannot tell two structurally equal ones apart. Compare a sheet with `===`
  or `toContain`, as the tests of this plan do.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: the call is the scene with index 0 and three pages;
  a new game has `dialogue` `{ speaker: 'story', index: 0, page: 0 }`, `lamp`
  `{ on: false, strength: 1, owned: false, used: false }` and `started` `null`; the first
  meeting is `talk.officer-rules-1` and `talk.officer-meeting-2`; the lamp's line is shown
  while `owned` and not `used`, after a wall that holds, a solved case and a found trace;
  the start hint is due while `started` is not `null` and `tick` − `started` < 600.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | five keys: `story.call-1`, `story.call-2`, `story.call-3`, `talk.officer-meeting-2`, `notice.lamp` |
| `src/game/state.ts` | `LampState.owned`, `LampState.used`; `GameState.started`; the speaker kind `'story'` |
| `src/game/story.ts` | new: `Scene`, `SCENES`, `OPENING_SCENE`, `scenePages` |
| `src/game/cast.ts` | `Meeting`, `FIRST_MEETING`, `figuresIn`, `isFirstMeeting` |
| `src/game/talk.ts` | `pagesOf`; `stepDialogue` uses it; `openDialogue` asks whether the lamp is owned |
| `src/game/update.ts` | the new fields in `createInitialState` and in the ordinary step; `newGame`; what a closing step changes |
| `src/game/overview.ts` | the wake keeps the lamp's fields and `started` |
| `src/game/help.ts` | `startHintDue` |
| `src/game/notice.ts` | `NOTICE_LAMP` |
| `src/render/draw-scene.ts` | the page by `pagesOf` and `figuresIn`; the start hint by `startHintDue` |
| `src/main.ts` | starts with `newGame` |
| `tests/unit/story.test.ts`, `tests/unit/opening.test.ts` | new |
| `tests/unit/text.test.ts`, `cast.test.ts`, `help.test.ts`, `notice.test.ts`, `draw-scene.test.ts`, `state.test.ts`, `journal.test.ts`, `cases.test.ts`, `overview.test.ts`, `shadow.test.ts`, `trace.test.ts`, `draw-help.test.ts`, `draw-journal.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 7 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the five text ids of the file structure, in both languages.

- [x] **Step 1: Write the failing test,** and widen the page rule to the kind `story`:

```diff
diff --git a/tests/unit/text.test.ts b/tests/unit/text.test.ts
index 7fab8db..9268cee 100644
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -303,12 +303,61 @@ describe('the language table (INV-4, 0016)', () => {
     }
   });
 
-  it('gives a page of talk at most three lines of at most 47 characters, none empty', () => {
+  it('holds the words of the call, the first meeting and the lamp in both languages (0026)', () => {
+    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
+      textOf(textKey(id), language).split('\n');
+    expect(lines('story.call-1', 'de')).toStrictEqual([
+      'Montagmorgen. Das Telefon – ein Kunde:',
+      '„Sätze aus unserem vertraulichen Angebot stehen',
+      'in der Antwort eines öffentlichen Chatbots.“',
+    ]);
+    expect(lines('story.call-1', 'en')).toStrictEqual([
+      'Monday morning. The phone – a customer:',
+      '“Sentences from our confidential offer are in',
+      'the answer of a public chatbot.”',
+    ]);
+    expect(lines('story.call-2', 'de')).toStrictEqual([
+      'Die Geschäftsführung fängt dich am Empfang ab:',
+      '„Das Angebot kam aus dem Vertrieb. Finde',
+      'heraus, wie das passieren konnte.“',
+    ]);
+    expect(lines('story.call-2', 'en')).toStrictEqual([
+      'The managing director stops you at reception:',
+      '“The offer came from Sales. Find out how',
+      'that could happen.”',
+    ]);
+    expect(lines('story.call-3', 'de')).toStrictEqual([
+      'Über den Türen im Flur liegt etwas, das',
+      'vorher nicht da war. Nebenan, bei der',
+      'Datenschutzbeauftragten, brennt Licht.',
+    ]);
+    expect(lines('story.call-3', 'en')).toStrictEqual([
+      'Something lies over the doors in the corridor',
+      'that was not there before. Next door, the',
+      'data protection officer has her light on.',
+    ]);
+    expect(lines('talk.officer-meeting-2', 'de')).toStrictEqual([
+      'Nimm die Lampe: Sie hält fest, was sich darin',
+      'regt – nicht um es zu vertreiben, sondern um',
+      'es zu verstehen.',
+    ]);
+    expect(lines('talk.officer-meeting-2', 'en')).toStrictEqual([
+      'Take the lamp: it holds still whatever stirs',
+      'in it – not to drive it away, but to',
+      'understand it.',
+    ]);
+    expect(lines('notice.lamp', 'de')).toStrictEqual(['Die Lampe: Leertaste halten.']);
+    expect(lines('notice.lamp', 'en')).toStrictEqual(['The lamp: hold Space.']);
+  });
+
+  it('gives a page of talk and of the story at most three lines of at most 47 characters, none empty', () => {
+    const kinds = new Set<string>();
     for (const language of LANGUAGES) {
       for (const [key, text] of Object.entries(TABLE[language])) {
-        if (!key.startsWith('talk.')) {
+        if (!key.startsWith('talk.') && !key.startsWith('story.')) {
           continue;
         }
+        kinds.add(key.slice(0, key.indexOf('.')));
         const lines = text.split('\n');
         expect(lines.length, `${language} ${key}`).toBeLessThanOrEqual(3);
         for (const line of lines) {
@@ -317,6 +366,7 @@ describe('the language table (INV-4, 0016)', () => {
         }
       }
     }
+    expect([...kinds].sort()).toStrictEqual(['story', 'talk']);
   });
 
   it('keeps a notice on one line', () => {
```

- [x] **Step 2: Run it** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 2 of 21
  tests: the keys are not in the table, and the page rule finds no key of the kind `story`.

- [x] **Step 3: The words,** in both tables:

```diff
diff --git a/src/text/de.ts b/src/text/de.ts
index ecf3c55..e27a315 100644
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -49,6 +49,27 @@ export const de = {
     'regt – nicht um es zu vertreiben, sondern um',
     'es zu verstehen.',
   ].join('\n'),
+  'talk.officer-meeting-2': [
+    'Nimm die Lampe: Sie hält fest, was sich darin',
+    'regt – nicht um es zu vertreiben, sondern um',
+    'es zu verstehen.',
+  ].join('\n'),
+  'story.call-1': [
+    'Montagmorgen. Das Telefon – ein Kunde:',
+    '„Sätze aus unserem vertraulichen Angebot stehen',
+    'in der Antwort eines öffentlichen Chatbots.“',
+  ].join('\n'),
+  'story.call-2': [
+    'Die Geschäftsführung fängt dich am Empfang ab:',
+    '„Das Angebot kam aus dem Vertrieb. Finde',
+    'heraus, wie das passieren konnte.“',
+  ].join('\n'),
+  'story.call-3': [
+    'Über den Türen im Flur liegt etwas, das',
+    'vorher nicht da war. Nebenan, bei der',
+    'Datenschutzbeauftragten, brennt Licht.',
+  ].join('\n'),
+  'notice.lamp': 'Die Lampe: Leertaste halten.',
   'talk.reception-everyday': [
     'Morgen! Heute haben schon drei Leute gefragt,',
     'ob wir endlich ein WLAN für Gäste haben.',
```

```diff
diff --git a/src/text/en.ts b/src/text/en.ts
index c7ad2e4..8c3d485 100644
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -45,6 +45,27 @@ export const en: Readonly<Record<keyof typeof de, string>> = {
     'The lamp holds still whatever stirs in it –',
     'not to drive it away, but to understand it.',
   ].join('\n'),
+  'talk.officer-meeting-2': [
+    'Take the lamp: it holds still whatever stirs',
+    'in it – not to drive it away, but to',
+    'understand it.',
+  ].join('\n'),
+  'story.call-1': [
+    'Monday morning. The phone – a customer:',
+    '“Sentences from our confidential offer are in',
+    'the answer of a public chatbot.”',
+  ].join('\n'),
+  'story.call-2': [
+    'The managing director stops you at reception:',
+    '“The offer came from Sales. Find out how',
+    'that could happen.”',
+  ].join('\n'),
+  'story.call-3': [
+    'Something lies over the doors in the corridor',
+    'that was not there before. Next door, the',
+    'data protection officer has her light on.',
+  ].join('\n'),
+  'notice.lamp': 'The lamp: hold Space.',
   'talk.reception-everyday': [
     'Morning! Three people have asked already',
     'whether we finally have a network for guests.',
```

- [x] **Step 4: Run** `npx vitest run tests/unit/text.test.ts` — green — then `npm run check`:
  1203 unit tests.

- [x] **Step 5: Commit** — `Add the words of the call, the first meeting and the lamp`.

---

### Task 2: The lamp that can be owned, and when the opening ended

**Files:**
- Modify: `src/game/state.ts`, `src/game/update.ts`, `src/game/overview.ts`,
  `src/game/talk.ts`
- Test: `tests/unit/state.test.ts`, `journal.test.ts`, `help.test.ts`, `notice.test.ts`,
  `cases.test.ts`, `overview.test.ts`, `shadow.test.ts`, `trace.test.ts`,
  `draw-scene.test.ts`, `draw-help.test.ts`, `draw-journal.test.ts`

**Interfaces:**
- Produces: `LampState` `{ on, strength, owned, used }`; `GameState.started: number | null`;
  `SPEAKER_KINDS` with `'story'`. `createInitialState` gives `owned` and `used` `true` and
  `started` 0. Every step keeps the three as they are. Nothing behaves differently after
  this task: it is the ground the next three stand on.

- [x] **Step 1: Change the tests** to the state of a game past its opening. Every lamp a
  test writes out gains `owned: true, used: true`; every state a test writes out in full
  gains `started: 0`; the two recordings hash the lamp as it was recorded:

```diff
diff --git a/tests/unit/state.test.ts b/tests/unit/state.test.ts
index 9edd646..d51d970 100644
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -77,6 +77,7 @@ describe('GameState (INV-1)', () => {
   it('starts at tick 0 with the player at the spawn, facing down, standing, the camera on it', () => {
     expect(createInitialState(MAP)).toStrictEqual({
       tick: 0,
+      started: 0,
       player: {
         x: 136,
         y: 120,
@@ -87,7 +88,7 @@ describe('GameState (INV-1)', () => {
         recoil: { dx: 0, dy: 0, steps: 0 },
       },
       camera: { x: 0, y: 12 },
-      lamp: { on: false, strength: 1 },
+      lamp: { on: false, strength: 1, owned: true, used: true },
       creatures: [],
       movers: [],
       shadowWalls: [],
@@ -115,7 +116,7 @@ describe('GameState (INV-1)', () => {
     expect(Number.isInteger(state.player.x), 'x is fractional after a diagonal').toBe(false);
     expect(state.player.facing).toBe('left');
     expect(state.camera).toStrictEqual({ x: 0, y: 0 });
-    expect(state.lamp).toStrictEqual({ on: true, strength: 1 });
+    expect(state.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
     const copy: unknown = JSON.parse(JSON.stringify(state));
     expect(copy).toStrictEqual(state);
   });
@@ -145,9 +146,10 @@ describe('update', () => {
     const next = update(
       {
         tick: 41,
+        started: 0,
         player,
         camera: { x: 0, y: 12 },
-        lamp: { on: false, strength: 1 },
+        lamp: { on: false, strength: 1, owned: true, used: true },
         creatures: [],
         movers: [],
         shadowWalls: [],
@@ -173,9 +175,10 @@ describe('update', () => {
   it('leaves its input unchanged', () => {
     const state: GameState = {
       tick: 7,
+      started: 0,
       player,
       camera: { x: 0, y: 12 },
-      lamp: { on: false, strength: 1 },
+      lamp: { on: false, strength: 1, owned: true, used: true },
       creatures: [],
       movers: [],
       shadowWalls: [],
@@ -193,9 +196,10 @@ describe('update', () => {
     update(state, RIGHT, MAP);
     expect(state).toStrictEqual({
       tick: 7,
+      started: 0,
       player,
       camera: { x: 0, y: 12 },
-      lamp: { on: false, strength: 1 },
+      lamp: { on: false, strength: 1, owned: true, used: true },
       creatures: [],
       movers: [],
       shadowWalls: [],
@@ -248,12 +252,17 @@ describe('the camera in the state (0006)', () => {
 
 describe('the lamp in the state (0007)', () => {
   it('starts off', () => {
-    expect(createInitialState(MAP).lamp).toStrictEqual({ on: false, strength: 1 });
+    expect(createInitialState(MAP).lamp).toStrictEqual({
+      on: false,
+      strength: 1,
+      owned: true,
+      used: true,
+    });
   });
 
   it('is on in a step whose input holds lamp; the figure stays, turns, and the camera stays on it', () => {
     const state = update(createInitialState(MAP), { ...SHINE, right: true }, MAP);
-    expect(state.lamp).toStrictEqual({ on: true, strength: 1 });
+    expect(state.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
     expect([state.player.x, state.player.y, state.player.facing]).toStrictEqual([
       136,
       120,
@@ -265,7 +274,12 @@ describe('the lamp in the state (0007)', () => {
 
   it('is off again in the first step without it', () => {
     const shone = update(createInitialState(MAP), SHINE, MAP);
-    expect(update(shone, NONE, MAP).lamp).toStrictEqual({ on: false, strength: 1 });
+    expect(update(shone, NONE, MAP).lamp).toStrictEqual({
+      on: false,
+      strength: 1,
+      owned: true,
+      used: true,
+    });
   });
 });
 
@@ -482,7 +496,7 @@ describe('shadow walls in the state (0014)', () => {
 
   it('starts with every wall of the map standing and a lamp of strength 1', () => {
     const state = createInitialState(WALLS_MAP);
-    expect(state.lamp).toStrictEqual({ on: false, strength: 1 });
+    expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
     expect(state.shadowWalls).toStrictEqual([
       { wall: 0, lit: false, light: 0 },
       { wall: 1, lit: false, light: 0 },
@@ -594,7 +608,7 @@ describe('shadow walls in the state (0014)', () => {
     const woken = run(map, before, [1, SHINE]);
     expect(woken.dark).toBe(45);
     expect(woken.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
-    expect(woken.lamp).toStrictEqual({ on: false, strength: 1 });
+    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
   });
 
   it('steps a state without standing walls exactly as a map without walls (600 steps)', () => {
```

```diff
diff --git a/tests/unit/journal.test.ts b/tests/unit/journal.test.ts
index 9068103..59fe48e 100644
--- a/tests/unit/journal.test.ts
+++ b/tests/unit/journal.test.ts
@@ -118,7 +118,7 @@ describe('opening the journal (0020)', () => {
     const pushed: GameState = {
       ...start,
       player: { ...start.player, frame: 2, recoil: { dx: -3, dy: 0, steps: 4 } },
-      lamp: { on: true, strength: 1 },
+      lamp: { on: true, strength: 1, owned: true, used: true },
     };
     expect(update(pushed, input, OPEN)).toStrictEqual({
       ...pushed,
@@ -261,7 +261,7 @@ describe('the world while the journal is open (0020)', () => {
   const start: GameState = {
     ...run(map, createInitialState(map), NONE, NONE, NONE),
     shadowWalls: [{ wall: 0, lit: true, light: 30 }],
-    lamp: { on: true, strength: 1 },
+    lamp: { on: true, strength: 1, owned: true, used: true },
   };
   const ALL_OTHERS: GameInput = { ...NONE, up: true, down: true, lamp: true, talk: true };
 
@@ -325,7 +325,8 @@ describe('a game in which the journal is never opened (0020)', () => {
     state.tick,
     state.player,
     state.camera,
-    state.lamp,
+    // The lamp as it was recorded: without the two fields of 0026.
+    { on: state.lamp.on, strength: state.lamp.strength },
     state.creatures,
     state.movers,
     state.shadowWalls,
```

```diff
diff --git a/tests/unit/help.test.ts b/tests/unit/help.test.ts
index 8902c0f..47d2f19 100644
--- a/tests/unit/help.test.ts
+++ b/tests/unit/help.test.ts
@@ -53,7 +53,7 @@ describe('opening the help (0021)', () => {
     const pushed: GameState = {
       ...start,
       player: { ...start.player, frame: 2, recoil: { dx: -3, dy: 0, steps: 4 } },
-      lamp: { on: true, strength: 1 },
+      lamp: { on: true, strength: 1, owned: true, used: true },
     };
     expect(update(pushed, input, OPEN)).toStrictEqual({
       ...pushed,
@@ -210,7 +210,7 @@ describe('the world while the help is open (0021)', () => {
   const start: GameState = {
     ...run(map, createInitialState(map), NONE, NONE, NONE),
     shadowWalls: [{ wall: 0, lit: true, light: 30 }],
-    lamp: { on: true, strength: 1 },
+    lamp: { on: true, strength: 1, owned: true, used: true },
   };
   /** Every key but `help`. */
   const ALL_OTHERS: GameInput = {
@@ -302,7 +302,8 @@ describe('a game in which the help is never opened (0021)', () => {
     state.tick,
     state.player,
     state.camera,
-    state.lamp,
+    // The lamp as it was recorded: without the two fields of 0026.
+    { on: state.lamp.on, strength: state.lamp.strength },
     state.creatures,
     state.movers,
     state.shadowWalls,
```

```diff
diff --git a/tests/unit/notice.test.ts b/tests/unit/notice.test.ts
index 3b69849..5e15fd4 100644
--- a/tests/unit/notice.test.ts
+++ b/tests/unit/notice.test.ts
@@ -21,7 +21,7 @@ const HOLDS: ShadowWallState = { wall: 0, lit: true, light: 0 };
 const BASE = createInitialState(grassMap(20, 12, { x: 152, y: 96 }));
 const withWalls = (lampOn: boolean, ...shadowWalls: ShadowWallState[]): GameState => ({
   ...BASE,
-  lamp: { on: lampOn, strength: 1 },
+  lamp: { on: lampOn, strength: 1, owned: true, used: true },
   shadowWalls,
 });
 
```

```diff
diff --git a/tests/unit/cases.test.ts b/tests/unit/cases.test.ts
index a600887..447be52 100644
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -293,7 +293,7 @@ describe('the notice of a solved case (0024)', () => {
     expect(noticeOf({ ...both, solved: [] })).toBe(textKey('notice.trace-found'));
     const holding: GameState = {
       ...both,
-      lamp: { on: true, strength: 1 },
+      lamp: { on: true, strength: 1, owned: true, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     };
     expect(noticeOf(holding)).toBe(textKey('notice.shadow-too-dense'));
```

```diff
diff --git a/tests/unit/overview.test.ts b/tests/unit/overview.test.ts
index cdbbca2..17936f4 100644
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -162,9 +162,10 @@ describe('stepDark', () => {
   const MAP = grassMap(40, 30, { x: 320, y: 240 }, [{ name: 'wake', x: 80, y: 60 }]);
   const FALLEN: GameState = {
     tick: 500,
+    started: 0,
     player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
     camera: { x: 140, y: 106 },
-    lamp: { on: true, strength: 1 },
+    lamp: { on: true, strength: 1, owned: true, used: true },
     creatures: [snippet(310, 200)],
     movers: [],
     shadowWalls: [{ wall: 1, lit: true, light: 30 }],
@@ -191,7 +192,8 @@ describe('stepDark', () => {
     expect(darkSteps(43)).toStrictEqual({
       ...FALLEN,
       tick: 543,
-      lamp: { on: false, strength: 1 },
+      started: 0,
+      lamp: { on: false, strength: 1, owned: true, used: true },
       dark: 44,
     });
   });
@@ -201,9 +203,10 @@ describe('stepDark', () => {
     const player = figure(80, 60, 'down');
     expect(woken).toStrictEqual({
       tick: 544,
+      started: 0,
       player,
       camera: followPlayer(player, MAP),
-      lamp: { on: false, strength: 1 },
+      lamp: { on: false, strength: 1, owned: true, used: true },
       creatures: [{ ...snippet(40, 40), home: { x: 40, y: 40 } }],
       movers: [],
       shadowWalls: [{ wall: 1, lit: false, light: 0 }],
```

```diff
diff --git a/tests/unit/shadow.test.ts b/tests/unit/shadow.test.ts
index bd3fdd3..55d4629 100644
--- a/tests/unit/shadow.test.ts
+++ b/tests/unit/shadow.test.ts
@@ -162,7 +162,7 @@ describe('the step of the walls (0014)', () => {
     wall({ x: 160, y: 80, width: 4, height: 32 }, 'hr', 2),
   ];
   const PLAYER = figure(152, 80, 'down');
-  const BASIC = { on: true, strength: 1 };
+  const BASIC = { on: true, strength: 1, owned: true, used: true };
   const run = (
     standing: readonly ShadowWallState[],
     steps: number,
@@ -207,7 +207,7 @@ describe('the step of the walls (0014)', () => {
 
   it('a wall of density 2 holds against strength 1 however long, and is gone after 60 steps of strength 2', () => {
     expect(run(standingWalls(WALLS), 600)).toStrictEqual([{ wall: 1, lit: true, light: 0 }]);
-    const strong = { on: true, strength: 2 };
+    const strong = { on: true, strength: 2, owned: true, used: true };
     expect(run([{ wall: 1, lit: false, light: 0 }], 59, strong)).toStrictEqual([
       { wall: 1, lit: true, light: 59 },
     ]);
@@ -217,7 +217,7 @@ describe('the step of the walls (0014)', () => {
   it('a step out of the light starts the second again', () => {
     const half = run(standingWalls(WALLS), 30);
     expect(half[0]).toStrictEqual({ wall: 0, lit: true, light: 30 });
-    const broken = run(half, 1, { on: false, strength: 1 });
+    const broken = run(half, 1, { on: false, strength: 1, owned: true, used: true });
     expect(broken).toStrictEqual([
       { wall: 0, lit: false, light: 0 },
       { wall: 1, lit: false, light: 0 },
```

```diff
diff --git a/tests/unit/trace.test.ts b/tests/unit/trace.test.ts
index 9d93650..123acfc 100644
--- a/tests/unit/trace.test.ts
+++ b/tests/unit/trace.test.ts
@@ -278,7 +278,7 @@ describe('the notice of a find (0022)', () => {
   it('gives way to the notice of a wall that holds', () => {
     const state: GameState = {
       ...found,
-      lamp: { on: true, strength: 1 },
+      lamp: { on: true, strength: 1, owned: true, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     };
     expect(noticeOf(state)).toBe(textKey('notice.shadow-too-dense'));
```

```diff
diff --git a/tests/unit/draw-scene.test.ts b/tests/unit/draw-scene.test.ts
index 7fb04ec..5fa3661 100644
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -149,9 +149,10 @@ const state = (
   lampOn = false,
 ): GameState => ({
   tick: QUIET_TICK,
+  started: 0,
   player: player(fields),
   camera,
-  lamp: { on: lampOn, strength: 1 },
+  lamp: { on: lampOn, strength: 1, owned: true, used: true },
   creatures: [],
   movers: [],
   shadowWalls: [],
@@ -725,7 +726,7 @@ describe('the notice in the scene (0016)', () => {
     for (const scene of [
       holding({ shadowWalls: [{ wall: 0, lit: true, light: 1 }] }),
       holding({ shadowWalls: [] }),
-      holding({ lamp: { on: false, strength: 1 } }),
+      holding({ lamp: { on: false, strength: 1, owned: true, used: true } }),
     ]) {
       const renderer = recordingRenderer();
       drawScene(renderer, scene, CONTENT);
@@ -1040,7 +1041,7 @@ describe('the language line in the scene (0019)', () => {
 
   it('leaves the bar to the notice of 0016, which itself changes its language', () => {
     const holding = quiet(100, {
-      lamp: { on: true, strength: 1 },
+      lamp: { on: true, strength: 1, owned: true, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     });
     const renderer = recordingRenderer();
@@ -1185,7 +1186,7 @@ describe('the start hint in the scene (0021)', () => {
 
   it('leaves the bar to the notice of 0016', () => {
     const holding = fresh(100, {
-      lamp: { on: true, strength: 1 },
+      lamp: { on: true, strength: 1, owned: true, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     });
     const renderer = recordingRenderer();
@@ -1443,7 +1444,11 @@ describe('the cleared region in the scene (0025)', () => {
 
   it('lays the thinning veil where the veil lies: after detail and before the cone', () => {
     const renderer = recordingRenderer();
-    drawScene(renderer, { ...cleared('sales', 40), lamp: { on: true, strength: 1 } }, content);
+    drawScene(
+      renderer,
+      { ...cleared('sales', 40), lamp: { on: true, strength: 1, owned: true, used: true } },
+      content,
+    );
     const detail = renderer.calls.indexOf('drawTile 4 at 16,16');
     expect(renderer.calls[detail + 1]).toBe('drawSprite 3 at 0,0');
     expect(renderer.sheets.slice(0, 7)).toStrictEqual([
```

```diff
diff --git a/tests/unit/draw-help.test.ts b/tests/unit/draw-help.test.ts
index 39659d2..a89a7b7 100644
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -86,6 +86,7 @@ const BAR = 'fillRect 8,158 304x18 #181425';
 /** A game past the start hint with five hearts and the officer standing; the help as `fields` say. */
 const playing = (fields: Partial<GameState> = {}): GameState => ({
   tick: 700,
+  started: 0,
   player: {
     x: 184,
     y: 96,
@@ -96,7 +97,7 @@ const playing = (fields: Partial<GameState> = {}): GameState => ({
     recoil: NO_RECOIL,
   },
   camera: { x: 0, y: 0 },
-  lamp: { on: false, strength: 1 },
+  lamp: { on: false, strength: 1, owned: true, used: true },
   creatures: [],
   movers: [],
   shadowWalls: [],
@@ -253,7 +254,7 @@ describe('the help in the scene (0021)', () => {
   it('leaves the notice of 0016 under it', () => {
     const holding = playing({
       help: true,
-      lamp: { on: true, strength: 1 },
+      lamp: { on: true, strength: 1, owned: true, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     });
     const calls = scene(holding);
```

```diff
diff --git a/tests/unit/draw-journal.test.ts b/tests/unit/draw-journal.test.ts
index a77beb2..4e8c298 100644
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -86,6 +86,7 @@ const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
 /** A game with the journal open on `tab`: five hearts, the lamp on, `snippets` captured. */
 const reading = (tab: JournalTab, snippets = 0): GameState => ({
   tick: 100,
+  started: 0,
   player: {
     x: 160,
     y: 96,
@@ -96,7 +97,7 @@ const reading = (tab: JournalTab, snippets = 0): GameState => ({
     recoil: NO_RECOIL,
   },
   camera: { x: 0, y: 0 },
-  lamp: { on: true, strength: 1 },
+  lamp: { on: true, strength: 1, owned: true, used: true },
   creatures: [],
   movers: [],
   shadowWalls: [],
```

- [x] **Step 2: Run** `npx vitest run` and `npm run typecheck`. Expected: FAIL — 9 unit
  tests, those that compare a whole lamp or a whole state, and 18 type errors in the tests.

- [x] **Step 3: The state:**

```diff
diff --git a/src/game/state.ts b/src/game/state.ts
index 80c9bef..bf6dfd0 100644
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -34,11 +34,18 @@ export interface PlayerState {
   readonly recoil: Recoil;
 }
 
-/** The lamp (0007, 0014): on in every step whose input holds `lamp`. Later field: charge (M6). */
+/**
+ * The lamp (0007, 0014, 0026): on in every step whose input holds `lamp`, once the player has
+ * it. Later field: charge (M6).
+ */
 export interface LampState {
   readonly on: boolean;
   /** Against a region's density (gameplay.md §5): BASE_STRENGTH plus the upgrades earned. */
   readonly strength: number;
+  /** Whether the player has the lamp (0026). Without it the input's `lamp` counts as not held. */
+  readonly owned: boolean;
+  /** Whether the lamp was on in any step since it was owned (0026). It never goes back. */
+  readonly used: boolean;
 }
 
 /** The creature species (world.md §4), in journal order. 0008 brings the first. */
@@ -116,14 +123,17 @@ export interface FigureState {
   readonly facing: Facing;
 }
 
-/** Who speaks in a dialogue (0018): a standing figure of the cast, or a colleague on its round. */
-export const SPEAKER_KINDS = ['figure', 'mover'] as const;
+/**
+ * Who speaks in a dialogue: a standing figure of the cast, a colleague on its round (0018), or
+ * the story itself — a scene of `game/story`, with no figure (0026).
+ */
+export const SPEAKER_KINDS = ['figure', 'mover', 'story'] as const;
 export type SpeakerKind = (typeof SPEAKER_KINDS)[number];
 
-/** An open dialogue (0017, 0018). */
+/** An open dialogue (0017, 0018, 0026). */
 export interface Dialogue {
   readonly speaker: SpeakerKind;
-  /** The index of the speaker in `GameState.figures` or in `GameState.movers`. */
+  /** The index of the speaker in `GameState.figures`, in `GameState.movers` or in `SCENES`. */
   readonly index: number;
   /** The page shown, from 0. */
   readonly page: number;
@@ -154,6 +164,11 @@ export interface Overview {
 export interface GameState {
   /** Logic steps since the start; one step is 1/60 s (INV-3). */
   readonly tick: number;
+  /**
+   * The tick of the step in which the game's opening ended — the step that closed the call — or
+   * null while it has not (0026). The start hint of the help counts from it.
+   */
+  readonly started: number | null;
   readonly player: PlayerState;
   /**
    * The view's top-left corner in map pixels, two integers (0006). Derived from the player after
```

- [x] **Step 4: The steps keep the fields.** `update.ts`:

```diff
diff --git a/src/game/update.ts b/src/game/update.ts
index aa00b75..7f5ccc5 100644
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -22,7 +22,9 @@ import { BASE_STRENGTH } from './world';
  * (0015); a lamp of strength BASE_STRENGTH and every shadow wall of the map standing (0014);
  * every standing figure of the map facing down and no dialogue (0017); the journal closed and
  * no key remembered (0020); the help closed (0021); every trace of the map unseen and not found
- * (0022); no case solved (0024). A map with two wake points, a route that is malformed or crosses a solid tile, a
+ * (0022); no case solved (0024). It is a game past its opening (0026): the lamp is owned and
+ * was used, no scene is open, and the opening ended at tick 0; `newGame` is the state a player
+ * starts with. A map with two wake points, a route that is malformed or crosses a solid tile, a
  * rectangle of no known kind, a shadow wall or a trace the world data or the grid refuses, an
  * area of a region the world data does not know or of a box that is not whole cells (0023), or
  * a figure point the cast does not know or names twice is rejected here, before the game starts.
@@ -46,9 +48,10 @@ export function createInitialState(map: TileMap): GameState {
   };
   return {
     tick: 0,
+    started: 0,
     player,
     camera: followPlayer(player, map),
-    lamp: { on: false, strength: BASE_STRENGTH },
+    lamp: { on: false, strength: BASE_STRENGTH, owned: true, used: true },
     creatures: creaturesFrom(map.points),
     movers: moversFrom(routes),
     shadowWalls: standingWalls(walls),
@@ -124,8 +127,8 @@ export function update(state: GameState, input: GameInput, content: TileMap): Ga
     return opened;
   }
   const lamp: LampState = {
+    ...state.lamp,
     on: input.lamp && state.player.recoil.steps === 0,
-    strength: state.lamp.strength,
   };
   const walls = wallsOf(content.rects);
   // The figure, the push and the creatures meet the walls standing at the start of the step.
@@ -145,6 +148,7 @@ export function update(state: GameState, input: GameInput, content: TileMap): Ga
       : applyHit(stepped, state.overview, hitter);
   return {
     tick: state.tick + 1,
+    started: state.started,
     player,
     camera: followPlayer(player, content),
     lamp,
```

  `overview.ts`, the dark and the wake:

```diff
diff --git a/src/game/overview.ts b/src/game/overview.ts
index fb8664d..ba8c851 100644
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -131,9 +131,10 @@ function woken(state: GameState, map: TileMap): GameState {
   };
   return {
     tick: state.tick,
+    started: state.started,
     player,
     camera: followPlayer(player, map),
-    lamp: { on: false, strength: state.lamp.strength },
+    lamp: { ...state.lamp, on: false },
     creatures: state.creatures.map((creature) => ({
       ...creature,
       x: creature.home.x,
@@ -165,7 +166,7 @@ export function stepDark(state: GameState, map: TileMap): GameState {
   const next: GameState = {
     ...state,
     tick: state.tick + 1,
-    lamp: { on: false, strength: state.lamp.strength },
+    lamp: { ...state.lamp, on: false },
     dark: dark >= DARK_STEPS ? 0 : dark,
   };
   return dark === WAKE_STEP ? woken(next, map) : next;
```

  `talk.ts`, the step that opens a dialogue:

```diff
diff --git a/src/game/talk.ts b/src/game/talk.ts
index bd1a392..369de62 100644
--- a/src/game/talk.ts
+++ b/src/game/talk.ts
@@ -162,7 +162,7 @@ export function openDialogue(
       frame: 0,
       frameTimer: 0,
     },
-    lamp: { on: false, strength: state.lamp.strength },
+    lamp: { ...state.lamp, on: false },
     figures:
       speaker.speaker === 'figure'
         ? state.figures.map((standing, index) =>
```

- [x] **Step 5: Run** `npm run check` — green, 1203 unit tests, both recordings of 600 steps
  with their hashes unchanged.

- [x] **Step 6: Commit** — `Give the lamp an owner and the game the end of its opening`.
  Body: the fields come first, with the values of a game past its opening, so that every
  earlier test steps as before; the game that starts without the lamp follows.

---

### Task 3: The scenes, the first meeting and the pages of a dialogue

**Files:**
- Create: `src/game/story.ts`, `tests/unit/story.test.ts`
- Modify: `src/game/cast.ts`, `src/game/talk.ts`
- Test: `tests/unit/story.test.ts`, `tests/unit/cast.test.ts`

**Interfaces:**
- Consumes: the text ids of Task 1; the speaker kind `'story'` of Task 2.
- Produces:
  - `Scene` `{ id, pages }`, `SCENES`, `OPENING_SCENE = 0`,
    `scenePages(index: number, scenes?: readonly Scene[]): readonly TextKey[]`
  - `Meeting` `{ figure, pages }`, `FIRST_MEETING`,
    `figuresIn(figures: readonly Figure[], lampOwned: boolean, meeting?: Meeting): readonly Figure[]`,
    `isFirstMeeting(dialogue: Dialogue, figures: readonly Figure[], lampOwned: boolean, meeting?: Meeting): boolean`
  - `pagesOf(dialogue: Dialogue, speakers: readonly Speaker[], scenes?: readonly Scene[]): readonly TextKey[]`

- [x] **Step 1: Write the failing tests.** `tests/unit/story.test.ts`, new:

```ts
import { describe, expect, it } from 'vitest';
import type { NamedPoint, TileMap } from '../../src/engine/tiled';
import { figuresOf } from '../../src/game/cast';
import { routesOf } from '../../src/game/mover';
import type { Dialogue } from '../../src/game/state';
import { OPENING_SCENE, SCENES, type Scene, scenePages } from '../../src/game/story';
import { pagesOf, speakerOf, speakersOf } from '../../src/game/talk';
import { createInitialState } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const CALL = [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')];
const RULES = [textKey('talk.officer-rules-1'), textKey('talk.officer-rules-2')];
const OFFICER: NamedPoint = { name: 'figure:officer', x: 160, y: 96 };
/** The colleague of the reception, waiting ten seconds 32 px above the spawn. */
const COLLEAGUE: readonly NamedPoint[] = [
  { name: 'person:reception:1', x: 136, y: 64, pause: 600 },
  { name: 'person:reception:2', x: 64, y: 64 },
];
/** 20x12 cells of open floor: the spawn 24 px left of the officer and 32 px below the colleague. */
const MAP: TileMap = grassMap(20, 12, { x: 136, y: 96 }, [OFFICER, ...COLLEAGUE]);

describe('the scenes of the story (0026)', () => {
  it('holds the call with its three pages, and opens a game with it', () => {
    expect(SCENES).toStrictEqual([{ id: 'call', pages: CALL }]);
    expect(OPENING_SCENE).toBe(0);
    expect(SCENES[OPENING_SCENE]?.id).toBe('call');
  });

  it('gives the pages of a scene by its index, and none for an index without a scene', () => {
    expect(scenePages(0)).toStrictEqual(CALL);
    expect(scenePages(1)).toStrictEqual([]);
    expect(scenePages(-1)).toStrictEqual([]);
    const scenes: readonly Scene[] = [{ id: 'other', pages: [textKey('notice.help')] }];
    expect(scenePages(0, scenes)).toStrictEqual([textKey('notice.help')]);
  });

  it('is no speaker of a step: the pages of its dialogue are its own, whoever stands near', () => {
    const state = createInitialState(MAP);
    const speakers = speakersOf(figuresOf(MAP.points), state.movers, routesOf(MAP.points));
    expect(speakers.map((speaker) => speaker.speaker)).toStrictEqual(['figure', 'mover']);
    const story: Dialogue = { speaker: 'story', index: 0, page: 0 };
    expect(speakerOf(story, speakers)).toBeUndefined();
    expect(pagesOf(story, speakers)).toStrictEqual(CALL);
    expect(pagesOf(story, [])).toStrictEqual(CALL);
    expect(pagesOf({ speaker: 'story', index: 7, page: 0 }, speakers)).toStrictEqual([]);
  });

  it('leaves the pages of a figure and of a colleague to the speakers of the step', () => {
    const state = createInitialState(MAP);
    const speakers = speakersOf(figuresOf(MAP.points), state.movers, routesOf(MAP.points));
    expect(pagesOf({ speaker: 'figure', index: 0, page: 0 }, speakers)).toStrictEqual(RULES);
    expect(pagesOf({ speaker: 'mover', index: 0, page: 0 }, speakers)).toStrictEqual([
      textKey('talk.reception-everyday'),
    ]);
    expect(pagesOf({ speaker: 'figure', index: 3, page: 0 }, speakers)).toStrictEqual([]);
  });
});
```

  `tests/unit/cast.test.ts`:

```diff
diff --git a/tests/unit/cast.test.ts b/tests/unit/cast.test.ts
index 2b481e2..467193c 100644
--- a/tests/unit/cast.test.ts
+++ b/tests/unit/cast.test.ts
@@ -4,9 +4,14 @@ import {
   CAST,
   type CastMember,
   COLLEAGUES,
+  FIRST_MEETING,
+  type Figure,
   figuresFrom,
+  figuresIn,
   figuresOf,
   isFigurePoint,
+  isFirstMeeting,
+  type Meeting,
   pagesOfRoute,
 } from '../../src/game/cast';
 import { creaturesFrom } from '../../src/game/creature';
@@ -121,3 +126,44 @@ describe('the colleagues and their lines (0018)', () => {
     expect(pagesOfRoute('person:sales', table)).toStrictEqual([]);
   });
 });
+
+describe('the first meeting (0026)', () => {
+  const HANDS_OVER = textKey('talk.officer-meeting-2');
+  const officer: Figure = { id: 'officer', pages: [FIRST, SECOND], x: 160, y: 96 };
+  const other: Figure = { id: 'director', pages: [SECOND], x: 40, y: 40 };
+
+  it('is the officer with her first page and the page that hands the lamp over', () => {
+    expect(FIRST_MEETING).toStrictEqual({ figure: 'officer', pages: [FIRST, HANDS_OVER] });
+    expect(CAST.some((member) => member.id === FIRST_MEETING.figure)).toBe(true);
+  });
+
+  it('gives her the pages of the meeting while the lamp is not owned, and nobody else', () => {
+    expect(figuresIn([other, officer], false)).toStrictEqual([
+      other,
+      { ...officer, pages: [FIRST, HANDS_OVER] },
+    ]);
+  });
+
+  it('gives every figure its own pages once the lamp is owned', () => {
+    expect(figuresIn([other, officer], true)).toStrictEqual([other, officer]);
+  });
+
+  it('reads the meeting it is given: the game passes its own', () => {
+    const meeting: Meeting = { figure: 'director', pages: [FIRST] };
+    expect(figuresIn([other, officer], false, meeting)).toStrictEqual([
+      { ...other, pages: [FIRST] },
+      officer,
+    ]);
+  });
+
+  it('is the dialogue of that figure while the lamp is not owned, and no other', () => {
+    const figures = [other, officer];
+    expect(isFirstMeeting({ speaker: 'figure', index: 1, page: 1 }, figures, false)).toBe(true);
+    expect(isFirstMeeting({ speaker: 'figure', index: 1, page: 0 }, figures, false)).toBe(true);
+    expect(isFirstMeeting({ speaker: 'figure', index: 1, page: 1 }, figures, true)).toBe(false);
+    expect(isFirstMeeting({ speaker: 'figure', index: 0, page: 0 }, figures, false)).toBe(false);
+    expect(isFirstMeeting({ speaker: 'mover', index: 1, page: 0 }, figures, false)).toBe(false);
+    expect(isFirstMeeting({ speaker: 'story', index: 1, page: 0 }, figures, false)).toBe(false);
+    expect(isFirstMeeting({ speaker: 'figure', index: 5, page: 0 }, figures, false)).toBe(false);
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/story.test.ts tests/unit/cast.test.ts`.
  Expected: FAIL — `story.test.ts` does not load, `src/game/story` does not exist; 5 of the
  19 tests of `cast.test.ts` fail.

- [x] **Step 3: The scenes,** `src/game/story.ts`, new:

```ts
import { type TextKey, textKey } from '../text/text';

/**
 * The story (vision.md §4, feature 0026). A scene is text the story itself says: pages in the
 * dialogue box, with no figure that speaks. The game opens a scene, never a press; nobody
 * turns to anybody. Pure data.
 */

export interface Scene {
  readonly id: string;
  /** What the story says, page by page; at least one. */
  readonly pages: readonly TextKey[];
}

export const SCENES: readonly Scene[] = [
  {
    id: 'call',
    pages: [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')],
  },
];

/** The scene a new game opens with: the call. The step that closes it ends the game's opening. */
export const OPENING_SCENE = 0;

/** The pages of the scene with this index; none when there is no such scene. */
export function scenePages(index: number, scenes: readonly Scene[] = SCENES): readonly TextKey[] {
  return scenes[index]?.pages ?? [];
}
```

- [x] **Step 4: The first meeting,** in `cast.ts`:

```diff
diff --git a/src/game/cast.ts b/src/game/cast.ts
index 8944dbc..18a9854 100644
--- a/src/game/cast.ts
+++ b/src/game/cast.ts
@@ -1,6 +1,6 @@
 import type { NamedPoint, Point } from '../engine/tiled';
 import { type TextKey, textKey } from '../text/text';
-import type { FigureState } from './state';
+import type { Dialogue, FigureState } from './state';
 
 /**
  * The cast (world.md §3, feature 0017): the figures that can be spoken to and what they say.
@@ -26,6 +26,21 @@ export const CAST: readonly CastMember[] = [
   },
 ];
 
+/**
+ * The first meeting (world.md §3, feature 0026): while the player has no lamp, this figure says
+ * these pages instead of its own, and the step that closes them hands the lamp over.
+ */
+export interface Meeting {
+  /** The id of the figure in the cast. */
+  readonly figure: string;
+  readonly pages: readonly TextKey[];
+}
+
+export const FIRST_MEETING: Meeting = {
+  figure: 'officer',
+  pages: [textKey('talk.officer-rules-1'), textKey('talk.officer-meeting-2')],
+};
+
 /** The lines of a colleague who walks the floor (0018), by the name of its route. */
 export interface Colleague {
   /** The route's name, `person:<room>`. */
@@ -90,3 +105,35 @@ export function figuresOf(
 export function figuresFrom(figures: readonly Figure[]): FigureState[] {
   return figures.map((_figure, figure) => ({ figure, facing: 'down' }));
 }
+
+/**
+ * The figures as they speak in a step (0026): while the lamp is not owned, the figure of the
+ * first meeting has the meeting's pages; with the lamp owned every figure has its own.
+ */
+export function figuresIn(
+  figures: readonly Figure[],
+  lampOwned: boolean,
+  meeting: Meeting = FIRST_MEETING,
+): readonly Figure[] {
+  if (lampOwned) {
+    return figures;
+  }
+  return figures.map((figure) =>
+    figure.id === meeting.figure ? { ...figure, pages: meeting.pages } : figure,
+  );
+}
+
+/**
+ * Whether the dialogue is the first meeting: the lamp is not owned, and the speaker is the
+ * figure that hands it over. The step that closes such a dialogue gives the lamp.
+ */
+export function isFirstMeeting(
+  dialogue: Dialogue,
+  figures: readonly Figure[],
+  lampOwned: boolean,
+  meeting: Meeting = FIRST_MEETING,
+): boolean {
+  return (
+    !lampOwned && dialogue.speaker === 'figure' && figures[dialogue.index]?.id === meeting.figure
+  );
+}
```

- [x] **Step 5: The pages of a dialogue,** in `talk.ts`:

```diff
--- a/src/game/talk.ts
+++ b/src/game/talk.ts
@@ -6,13 +6,15 @@
 import type { Route } from './mover';
 import { BOX_HEIGHT, type GameInput, pressed } from './player';
 import type { Dialogue, Facing, GameState, MoverState, SpeakerKind } from './state';
+import { SCENES, type Scene, scenePages } from './story';
 
 /**
  * Talking (gameplay.md §8, features 0017 and 0018). A press of `talk` near a speaker — a
  * standing figure, or a colleague on its round — opens a dialogue: the two turn to each other
  * and the speaker's first page is shown. A press turns to the next page; a press on the last
  * page closes the dialogue. While it is open nothing in the world is stepped — time passes,
- * and that is all. Pure data and pure functions.
+ * and that is all. A scene of the story is a dialogue too, with no speaker on the floor (0026).
+ * Pure data and pure functions.
  */
 
 /** Tune: two and a half tiles between the feet of the two — across a counter (0018). */
@@ -45,6 +47,7 @@
 
 /** Someone who can be spoken to, where it is in this step: the feet in map pixels. */
 export interface Speaker extends Point {
+  /** A figure or a colleague; the story is no speaker on the floor (0026). */
   readonly speaker: SpeakerKind;
   /** The index in `GameState.figures` or in `GameState.movers`. */
   readonly index: number;
@@ -94,6 +97,21 @@
 }
 
 /**
+ * The pages of a dialogue (0026): a scene's own when the story speaks, else those of its
+ * speaker among the speakers of the step; none when neither is there.
+ */
+export function pagesOf(
+  dialogue: Dialogue,
+  speakers: readonly Speaker[],
+  scenes: readonly Scene[] = SCENES,
+): readonly TextKey[] {
+  if (dialogue.speaker === 'story') {
+    return scenePages(dialogue.index, scenes);
+  }
+  return speakerOf(dialogue, speakers)?.pages ?? [];
+}
+
+/**
  * In sight (0018): no opaque box of the map lies on the line from the centre of the player's
  * box to the point as high above the other's feet. The lamp's test, against the map as loaded:
  * a wall stops a conversation; a counter, a desk or a chair does not.
@@ -198,7 +216,7 @@
   input: GameInput,
   speakers: readonly Speaker[],
 ): GameState {
-  const pages = speakerOf(dialogue, speakers)?.pages.length ?? 0;
+  const pages = pagesOf(dialogue, speakers).length;
   const page = talkPressed(state, input) ? dialogue.page + 1 : dialogue.page;
   return {
     ...state,
```

- [x] **Step 6: Run** the two files — green — then `npm run check`: 1213 unit tests; the
  architecture test now covers `src/game/story.ts`.

- [x] **Step 7: Commit** — `Add the scenes of the story and the first meeting`. Body: a scene
  is a dialogue without a speaker on the floor, so its pages are looked up beside the
  speakers, not among them.

---

### Task 4: The opening

**Files:**
- Create: `tests/unit/opening.test.ts`
- Modify: `src/game/update.ts`, `src/game/talk.ts`

**Interfaces:**
- Consumes: `OPENING_SCENE`, `figuresIn`, `isFirstMeeting`, `pagesOf` (Task 3); the fields
  of Task 2.
- Produces: `newGame(map: TileMap): GameState`. `update` steps a scene's dialogue, sets
  `started` in the step that closes the call, hands the lamp over in the step that closes
  the first meeting, counts `lamp` as not held without the lamp, and sets `lamp.used` in
  the first step in which the lamp is on.

- [x] **Step 1: Write the failing tests,** `tests/unit/opening.test.ts`, new:

```ts
import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { figuresIn, figuresOf } from '../../src/game/cast';
import { routesOf } from '../../src/game/mover';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { Dialogue, GameState } from '../../src/game/state';
import { pagesOf, speakersOf } from '../../src/game/talk';
import { createInitialState, newGame, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
const SHINE: GameInput = { ...NONE, lamp: true };
const RIGHT: GameInput = { ...NONE, right: true };
/** Every key but `talk`. */
const OTHERS: GameInput = {
  up: true,
  down: false,
  left: true,
  right: false,
  lamp: true,
  talk: false,
  journal: true,
  help: false,
};
const CALL = [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')];
const OFFICER: NamedPoint = { name: 'figure:officer', x: 160, y: 96 };
/** The colleague of the reception, waiting ten seconds 32 px above the spawn. */
const COLLEAGUE: readonly NamedPoint[] = [
  { name: 'person:reception:1', x: 136, y: 64, pause: 600 },
  { name: 'person:reception:2', x: 64, y: 64 },
];
/** 20x12 cells of open floor: the spawn 24 px left of the officer and 32 px below the colleague. */
const MAP: TileMap = grassMap(20, 12, { x: 136, y: 96 }, [OFFICER, ...COLLEAGUE]);
const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, map), start);
const steps = (map: TileMap, start: GameState, input: GameInput, count: number): GameState => {
  let state = start;
  for (let i = 0; i < count; i += 1) {
    state = update(state, input, map);
  }
  return state;
};
/** The new game with the call read to its end: five steps, three presses. */
const called = (map: TileMap): GameState => run(map, newGame(map), TALK, NONE, TALK, NONE, TALK);
/** The pages of the state's open dialogue, as `update` and the scene look them up. */
const spoken = (map: TileMap, state: GameState) =>
  state.dialogue === null
    ? null
    : pagesOf(
        state.dialogue,
        speakersOf(figuresOf(map.points), state.movers, routesOf(map.points)),
      );

describe('the two starts (0026)', () => {
  it('starts a played game with the call open, without the lamp, the opening not ended', () => {
    expect(newGame(MAP)).toStrictEqual({
      ...createInitialState(MAP),
      started: null,
      lamp: { on: false, strength: 1, owned: false, used: false },
      dialogue: { speaker: 'story', index: 0, page: 0 },
    });
  });

  it('keeps the initial state a game past its opening: the lamp owned and used, no dialogue', () => {
    const state = createInitialState(MAP);
    expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
    expect(state.started).toBe(0);
    expect(state.dialogue).toBeNull();
  });

  it('survives a JSON round trip: at the start, on page 2 of the call, after the first meeting (INV-1)', () => {
    const start = newGame(MAP);
    const second = run(MAP, start, TALK, NONE, TALK);
    const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 2 });
    expect(met.lamp.owned).toBe(true);
    for (const state of [start, second, met, createInitialState(MAP)]) {
      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    }
  });
});

describe('the call (0026)', () => {
  it('shows its pages one by one and closes with the third press', () => {
    const start = newGame(MAP);
    expect(spoken(MAP, start)).toStrictEqual(CALL);
    const pages: (number | null)[] = [];
    let state = start;
    for (const input of [TALK, NONE, TALK, NONE, TALK]) {
      state = update(state, input, MAP);
      pages.push(state.dialogue?.page ?? null);
    }
    expect(pages).toStrictEqual([1, 1, 2, 2, null]);
  });

  it('stands still for 600 steps with every key but talk held: only the tick and the held keys change', () => {
    const start = newGame(MAP);
    const later = steps(MAP, start, OTHERS, 600);
    expect(later).toStrictEqual({ ...start, tick: 600, held: OTHERS });
  });

  it('turns nobody: the figure, the colleague and the player look where they looked', () => {
    const start = newGame(MAP);
    const closed = called(MAP);
    expect(closed.dialogue).toBeNull();
    expect(closed.figures).toStrictEqual(start.figures);
    expect(closed.movers).toStrictEqual(start.movers);
    expect(closed.player).toStrictEqual(start.player);
  });

  it('is not the dialogue of the figure or the colleague in reach', () => {
    const second = run(MAP, newGame(MAP), TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 1 });
    expect(spoken(MAP, second)).toStrictEqual(CALL);
  });

  it('changes nothing but tick, held and dialogue while it is read, and started when it closes', () => {
    const start = newGame(MAP);
    const closed = called(MAP);
    expect(closed).toStrictEqual({ ...start, tick: 5, held: TALK, dialogue: null, started: 5 });
  });

  it('lets the game run once it is closed', () => {
    const walked = steps(MAP, called(MAP), RIGHT, 10);
    expect(walked.player.x).toBeGreaterThan(136);
    expect(walked.dialogue).toBeNull();
  });
});

describe('when the opening ended (0026)', () => {
  it('is not known while the call is open, on any page', () => {
    expect(newGame(MAP).started).toBeNull();
    expect(run(MAP, newGame(MAP), TALK, NONE, TALK, NONE).started).toBeNull();
    expect(steps(MAP, newGame(MAP), OTHERS, 900).started).toBeNull();
  });

  it('is the tick of the step that closes the call', () => {
    expect(called(MAP).started).toBe(5);
    const late = run(MAP, steps(MAP, newGame(MAP), NONE, 895), TALK, NONE, TALK, NONE, TALK);
    expect(late.dialogue).toBeNull();
    expect(late.started).toBe(900);
  });

  it('is changed by no other step: 600 steps, a talk with the officer, the dark and the wake', () => {
    const closed = called(MAP);
    expect(steps(MAP, closed, RIGHT, 600).started).toBe(5);
    const met = run(MAP, closed, NONE, TALK, NONE, TALK, NONE, TALK);
    expect(met.dialogue).toBeNull();
    expect(met.started).toBe(5);
    const woken = update({ ...met, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.started).toBe(5);
  });

  it('is 0 in a game past its opening, and stays 0', () => {
    const state = createInitialState(MAP);
    expect(state.started).toBe(0);
    expect(run(MAP, state, TALK, NONE, TALK, NONE, TALK).started).toBe(0);
    expect(update({ ...state, dark: 44 }, NONE, MAP).started).toBe(0);
  });
});

describe('without the lamp (0026)', () => {
  const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
    name,
    x,
    y,
    width,
    height,
  });
  /**
   * 20x12 cells of open floor: the figure at (104, 100) looks down at a snippet 40 px below it,
   * with a shadow wall of Sales right of the snippet's way and a trace of Sales left of it,
   * both in the cone.
   */
  const LIT: TileMap = grassMap(
    20,
    12,
    { x: 104, y: 100 },
    [{ name: 'snippet', x: 104, y: 140 }],
    [rect('shadow:sales', 112, 128, 16, 4), rect('trace:sales', 80, 128, 16, 16)],
  );
  const start = called(LIT);

  it('has the map for it: with the lamp owned the same keys light all three', () => {
    const owned = steps(LIT, createInitialState(LIT), SHINE, 10);
    expect(owned.lamp.on).toBe(true);
    expect(owned.shadowWalls[0]?.lit).toBe(true);
    expect(owned.traces[0]?.light).toBe(10);
    expect(owned.creatures[0]?.light).toBe(10);
  });

  it('leaves the lamp off for 600 steps with the key held, and lights nothing', () => {
    let state = start;
    for (let i = 0; i < 600; i += 1) {
      state = update(state, SHINE, LIT);
      expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
      expect(state.creatures.every((creature) => creature.light === 0)).toBe(true);
      expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
      expect(state.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    }
    expect(state.captured).toStrictEqual({ snippet: 0 });
  });

  it('counts the key as not held: the world steps as without it, step for step', () => {
    let held = start;
    let free = start;
    for (let i = 0; i < 600; i += 1) {
      held = update(held, SHINE, LIT);
      free = update(free, NONE, LIT);
      expect({ ...held, held: NONE }).toStrictEqual(free);
    }
  });

  it('lets the figure walk with the key held, as without it', () => {
    const both: GameInput = { ...RIGHT, lamp: true };
    let held = start;
    let free = start;
    for (let i = 0; i < 60; i += 1) {
      held = update(held, both, LIT);
      free = update(free, RIGHT, LIT);
      expect(held.player).toStrictEqual(free.player);
    }
    expect(held.player.x).toBeGreaterThan(104 + 50);
  });

  it('holds the figure in place with the lamp owned, as 0007 says', () => {
    const both: GameInput = { ...RIGHT, lamp: true };
    const owned = steps(LIT, createInitialState(LIT), both, 60);
    expect(owned.player.x).toBe(104);
    expect(owned.lamp.on).toBe(true);
  });

  it('is hit as always, and wakes without the lamp', () => {
    const hit = steps(LIT, start, NONE, 120);
    expect(hit.overview.current).toBeLessThan(5);
    const woken = update({ ...start, dark: 44 }, SHINE, LIT);
    expect(woken.dark).toBe(45);
    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
  });
});

describe('the first meeting (0026)', () => {
  const start = called(MAP);
  const TALK_SHINE: GameInput = { ...TALK, lamp: true };

  it('opens with the key of the lamp held while the player has none', () => {
    const opened = run(MAP, start, NONE, TALK_SHINE);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(opened.lamp.on).toBe(false);
  });

  it('does not open with the lamp held once the lamp is owned, as in 0017', () => {
    const held = run(MAP, createInitialState(MAP), TALK_SHINE);
    expect(held.dialogue).toBeNull();
    expect(held.lamp.on).toBe(true);
  });

  it('has her first page and the page that hands the lamp over', () => {
    const opened = run(MAP, start, NONE, TALK);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    const figures = figuresIn(figuresOf(MAP.points), opened.lamp.owned);
    expect(pagesOf(opened.dialogue as Dialogue, speakersOf(figures, [], []))).toStrictEqual([
      textKey('talk.officer-rules-1'),
      textKey('talk.officer-meeting-2'),
    ]);
    const second = run(MAP, opened, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 1 });
    // A third press closes it: the meeting has two pages.
    expect(run(MAP, second, NONE, TALK).dialogue).toBeNull();
  });

  it('hands the lamp over in the step that closes it, and changes nothing else', () => {
    const second = run(MAP, start, NONE, TALK, NONE, TALK, NONE);
    expect(second.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
    const closed = update(second, TALK, MAP);
    expect(closed).toStrictEqual({
      ...second,
      tick: second.tick + 1,
      held: TALK,
      dialogue: null,
      lamp: { on: false, strength: 1, owned: true, used: false },
    });
  });

  it('gives no lamp while the dialogue is open, on either page', () => {
    for (const inputs of [
      [NONE, TALK],
      [NONE, TALK, NONE, TALK],
      [NONE, TALK, NONE, TALK, NONE],
    ]) {
      expect(run(MAP, start, ...inputs).lamp.owned).toBe(false);
    }
  });

  it('gives none for the saying of a colleague', () => {
    // 32 px below the colleague and 24 px left of the officer: the officer is nearer. Away from her:
    const near: GameState = { ...start, player: { ...start.player, x: 136, y: 72 } };
    const opened = run(MAP, near, NONE, TALK);
    expect(opened.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
    const closed = run(MAP, opened, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
  });

  it('says the two pages of 0017 once the lamp is owned, and closing them changes neither field', () => {
    const met = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK);
    const again = run(MAP, met, NONE, TALK);
    expect(again.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    const closed = run(MAP, again, NONE, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
    const past = run(MAP, createInitialState(MAP), TALK, NONE, TALK, NONE, TALK);
    expect(past.dialogue).toBeNull();
    expect(past.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
  });

  it('keeps both fields through the wake', () => {
    const met = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK);
    const woken = update({ ...met, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
  });
});

describe('the lamp used for the first time (0026)', () => {
  const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);

  it('is not used by steps without the key', () => {
    expect(steps(MAP, met, RIGHT, 600).lamp.used).toBe(false);
  });

  it('is used from the first step in which the lamp is on, and stays so', () => {
    const first = run(MAP, met, NONE, SHINE);
    expect(first.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
    const off = update(first, NONE, MAP);
    expect(off.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
    expect(steps(MAP, off, NONE, 600).lamp.used).toBe(true);
    expect(update({ ...off, dark: 44 }, NONE, MAP).lamp.used).toBe(true);
  });

  it('is not used by a key held during a push: the lamp is off there', () => {
    const pushed: GameState = {
      ...met,
      player: { ...met.player, recoil: { dx: 3, dy: 0, steps: 8 } },
    };
    const during = update(pushed, SHINE, MAP);
    expect(during.lamp.on).toBe(false);
    expect(during.lamp.used).toBe(false);
  });
});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/opening.test.ts`. Expected: FAIL —
  the file does not load: `update.ts` exports no `newGame`.

- [x] **Step 3: The step.** `update.ts` — `newGame`, what a closing step changes, and the
  lamp that is not owned:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -1,7 +1,7 @@
 import type { TileMap } from '../engine/tiled';
 import { followPlayer } from './camera';
 import { answeredCase, clearRegion, progressOf, solve } from './cases';
-import { figuresFrom, figuresOf } from './cast';
+import { figuresFrom, figuresIn, figuresOf, isFirstMeeting } from './cast';
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
 import { openHelp, stepHelp } from './help';
 import { openJournal, stepJournal } from './journal';
@@ -10,7 +10,14 @@
 import { type GameInput, NO_INPUT, stepPlayer } from './player';
 import { areasOf } from './region';
 import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
-import { type GameState, type LampState, NO_RECOIL, type PlayerState } from './state';
+import {
+  type Dialogue,
+  type GameState,
+  type LampState,
+  NO_RECOIL,
+  type PlayerState,
+} from './state';
+import { OPENING_SCENE } from './story';
 import { openDialogue, speakersOf, stepDialogue } from './talk';
 import { hiddenTraces, stepTraces, tracesOf } from './trace';
 import { BASE_STRENGTH } from './world';
@@ -69,17 +76,66 @@
 }
 
 /**
+ * The state a played game starts with (0026): the initial state with the call open on its
+ * first page, the lamp not yet owned, and the opening not ended. `main.ts` starts with it; the
+ * tests of the earlier features step from `createInitialState`.
+ */
+export function newGame(map: TileMap): GameState {
+  return {
+    ...createInitialState(map),
+    started: null,
+    lamp: { on: false, strength: BASE_STRENGTH, owned: false, used: false },
+    dialogue: { speaker: 'story', index: OPENING_SCENE, page: 0 },
+  };
+}
+
+/**
+ * What the step that closed a dialogue changes besides closing it (0024, 0025, 0026). Closing
+ * the scene a game opens with ends the opening: `started` is this step's tick. Closing the
+ * first meeting hands the lamp over. Closing the source's answer of a ready case solves the
+ * case, and what is left of the region's shadow goes with it. Every other closing changes
+ * nothing more.
+ */
+function closed(
+  stepped: GameState,
+  dialogue: Dialogue,
+  before: GameState,
+  content: TileMap,
+): GameState {
+  if (dialogue.speaker === 'story') {
+    return dialogue.index === OPENING_SCENE && stepped.started === null
+      ? { ...stepped, started: stepped.tick }
+      : stepped;
+  }
+  if (isFirstMeeting(dialogue, figuresOf(content.points), before.lamp.owned)) {
+    return { ...stepped, lamp: { ...stepped.lamp, owned: true } };
+  }
+  const answered = answeredCase(
+    dialogue,
+    before,
+    routesOf(content.points),
+    progressOf(before, content),
+  );
+  return answered === null
+    ? stepped
+    : clearRegion(solve(stepped, answered.region), answered.region, content);
+}
+
+/**
  * Advances the game by exactly one logic step and returns the new state; its arguments are not
  * mutated. In the dark the step is the dark sequence and nothing else (0009). With the help open
  * the step is the help's and nothing else, and a press of `help` opens it over whatever is there
  * — an open journal and an open dialogue too (0021). With the journal open the step is the
- * journal's and nothing else (0020). With a dialogue open the step is the dialogue's and nothing
- * else; the step that closes the source's answer of a ready case solves the case (0024) and
- * removes the region's standing shadow walls and the creatures at home in it (0025). A press of `journal` opens the journal instead of an ordinary
+ * journal's and nothing else (0020). With a dialogue open — a speaker's or a scene's (0026) —
+ * the step is the dialogue's and nothing else; the step that closes the source's answer of a
+ * ready case solves the case (0024) and removes the region's standing shadow walls and the
+ * creatures at home in it (0025), the step that closes the first meeting hands the lamp over,
+ * and the step that closes the call ends the opening (0026). A press of `journal` opens the journal instead of an ordinary
  * step, before a press of `talk` is looked at (0020); a press of `talk` near a speaker — a
  * standing figure or a colleague — in reach and in sight opens a dialogue instead of an
- * ordinary step (0017, 0018). Otherwise: the lamp is on when the input holds
- * it and the figure is not being pushed; the figure is stepped; each creature is stepped
+ * ordinary step (0017, 0018). Otherwise: the lamp is on when the player has it, the input holds
+ * it and the figure is not being pushed — without the lamp the input's `lamp` counts as not
+ * held, for the figure too (0026); the figure is stepped; each creature is stepped
  * against the stepped figure (0008); the first free creature within reach of a figure that is
  * not safe hits; the camera follows the figure; each mover is stepped against the figure after
  * the hit, on routes rebuilt from the map's points (0015). The figure and the creatures are
@@ -106,16 +162,12 @@
   }
   const routes = routesOf(content.points);
   const progress = progressOf(state, content);
-  const speakers = speakersOf(figuresOf(content.points), state.movers, routes, undefined, progress);
+  // Without the lamp the data protection officer says the first meeting (0026).
+  const figures = figuresIn(figuresOf(content.points), state.lamp.owned);
+  const speakers = speakersOf(figures, state.movers, routes, undefined, progress);
   if (state.dialogue !== null) {
     const stepped = stepDialogue(state, state.dialogue, input, speakers);
-    // The step that closes the source's answer solves its case (0024), and what is left of the
-    // region's shadow goes with it (0025).
-    const answered =
-      stepped.dialogue === null ? answeredCase(state.dialogue, state, routes, progress) : null;
-    return answered === null
-      ? stepped
-      : clearRegion(solve(stepped, answered.region), answered.region, content);
+    return stepped.dialogue === null ? closed(stepped, state.dialogue, state, content) : stepped;
   }
   const journal = openJournal(state, input);
   if (journal !== null) {
@@ -126,14 +178,14 @@
   if (opened !== null) {
     return opened;
   }
-  const lamp: LampState = {
-    ...state.lamp,
-    on: input.lamp && state.player.recoil.steps === 0,
-  };
+  // Without the lamp the input's `lamp` counts as not held: for the light and for the figure.
+  const acting: GameInput = { ...input, lamp: input.lamp && state.lamp.owned };
+  const on = acting.lamp && state.player.recoil.steps === 0;
+  const lamp: LampState = { ...state.lamp, on, used: state.lamp.used || on };
   const walls = wallsOf(content.rects);
   // The figure, the push and the creatures meet the walls standing at the start of the step.
   const walled = withWalls(content, walls, state.shadowWalls);
-  const stepped = stepPlayer(state.player, input, walled);
+  const stepped = stepPlayer(state.player, acting, walled);
   const { creatures, captured } = stepCreatures(
     state.creatures,
     state.captured,
```

- [x] **Step 4: The press of `talk` without the lamp,** in `talk.ts`:

```diff
--- a/src/game/talk.ts
+++ b/src/game/talk.ts
@@ -152,9 +152,10 @@
 
 /**
  * The state after a press that opens a dialogue, or null when this step opens none: `talk` is
- * not pressed, the lamp is held, the player is being pushed, or no speaker is in reach. The
- * player and the speaker turn to each other, the player stands, a colleague stands where it
- * is, the lamp is off; nothing else is stepped.
+ * not pressed, the lamp is held, the player is being pushed, or no speaker is in reach. A
+ * player without the lamp holds none, whatever the input says (0026). The player and the
+ * speaker turn to each other, the player stands, a colleague stands where it is, the lamp is
+ * off; nothing else is stepped.
  */
 export function openDialogue(
   state: GameState,
@@ -162,7 +163,8 @@
   speakers: readonly Speaker[],
   map: TileMap,
 ): GameState | null {
-  if (!talkPressed(state, input) || input.lamp || state.player.recoil.steps > 0) {
+  const lampHeld = state.lamp.owned && input.lamp;
+  if (!talkPressed(state, input) || lampHeld || state.player.recoil.steps > 0) {
     return null;
   }
   const { player } = state;
```

- [x] **Step 5: Run** `npx vitest run tests/unit/opening.test.ts` — green, 30 tests — and
  `npx vitest run tests/unit/cases.test.ts tests/unit/state.test.ts tests/unit/talk.test.ts`:
  the solving step of 0024 and 0025 and the dialogues of 0017 and 0018 pass unchanged. Then
  `npm run check`: 1243 unit tests.

- [x] **Step 6: Commit** — `Open a new game with the call and without the lamp`. Body:
  `newGame` is what a player gets; `createInitialState` stays a game past its opening for
  the tests. The lamp is handed over by the step that closes the first meeting.

---

### Task 5: The bar and the scene

**Files:**
- Modify: `src/game/help.ts`, `src/game/notice.ts`, `src/render/draw-scene.ts`
- Test: `tests/unit/help.test.ts`, `tests/unit/notice.test.ts`,
  `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `newGame` (Task 4); `pagesOf`, `figuresIn` (Task 3).
- Produces: `startHintDue(state: Pick<GameState, 'tick' | 'started'>): boolean`;
  `NOTICE_LAMP`; `noticeOf` with the lamp's line in the last place; the scene draws a
  scene's page and the page of the first meeting.

- [x] **Step 1: Write the failing tests.** `help.test.ts` — criterion 15:

```diff
--- a/tests/unit/help.test.ts
+++ b/tests/unit/help.test.ts
@@ -10,10 +10,17 @@
   parseTileset,
   type TileMap,
 } from '../../src/engine/tiled';
-import { HELP_HINT, HELP_HINT_STEPS, helpHintDue, openHelp, stepHelp } from '../../src/game/help';
+import {
+  HELP_HINT,
+  HELP_HINT_STEPS,
+  helpHintDue,
+  openHelp,
+  startHintDue,
+  stepHelp,
+} from '../../src/game/help';
 import { type GameInput, NO_INPUT, pressed } from '../../src/game/player';
 import type { GameState } from '../../src/game/state';
-import { createInitialState, update } from '../../src/game/update';
+import { createInitialState, newGame, update } from '../../src/game/update';
 import { textKey } from '../../src/text/text';
 import { grassMap } from './grass-map';
 
@@ -334,3 +341,73 @@
     expect(hash.digest('hex')).toBe(RECORDED);
   });
 });
+
+describe('the start hint and the call (0026)', () => {
+  const due = (tick: number, started: number | null): boolean => startHintDue({ tick, started });
+
+  it('is not due at any tick while the opening has not ended', () => {
+    expect([0, 1, 599, 600, 5000].map((tick) => due(tick, null))).toStrictEqual([
+      false,
+      false,
+      false,
+      false,
+      false,
+    ]);
+  });
+
+  it('is due for 600 steps from the step that closed the call', () => {
+    for (const started of [40, 900]) {
+      expect(due(started, started), `closed at ${started}`).toBe(true);
+      expect(due(started + 599, started)).toBe(true);
+      expect(due(started + 600, started)).toBe(false);
+      expect(due(started + 6000, started)).toBe(false);
+    }
+  });
+
+  it('is as in 0021 in a game past its opening: due at 0 and at 599 and not at 600', () => {
+    expect([0, 599, 600, 601].map((tick) => due(tick, 0))).toStrictEqual([
+      true,
+      true,
+      false,
+      false,
+    ]);
+    const start = createInitialState(OPEN);
+    expect(start.started).toBe(0);
+    expect(startHintDue(start)).toBe(helpHintDue(start.tick));
+  });
+
+  it('follows the game: not due under the call, due when it closes, gone 600 steps later', () => {
+    let state = newGame(OPEN);
+    for (let step = 0; step < 35; step += 1) {
+      state = update(state, NONE, OPEN);
+      expect(startHintDue(state)).toBe(false);
+    }
+    for (const input of [TALK, NONE, TALK, NONE, TALK]) {
+      state = update(state, input, OPEN);
+    }
+    expect(state.dialogue).toBeNull();
+    expect(state.started).toBe(40);
+    expect(startHintDue(state)).toBe(true);
+    for (let step = 0; step < 599; step += 1) {
+      state = update(state, NONE, OPEN);
+    }
+    expect(state.tick).toBe(639);
+    expect(startHintDue(state)).toBe(true);
+    expect(startHintDue(update(state, NONE, OPEN))).toBe(false);
+  });
+
+  it('runs on behind an open help, as in 0021', () => {
+    let state = [TALK, NONE, TALK, NONE, TALK].reduce(
+      (now, input) => update(now, input, OPEN),
+      newGame(OPEN),
+    );
+    state = update(update(state, NONE, OPEN), HELP, OPEN);
+    expect(state.help).toBe(true);
+    for (let step = 0; step < 598; step += 1) {
+      state = update(state, NONE, OPEN);
+    }
+    expect(state.started).toBe(5);
+    expect(state.tick).toBe(605);
+    expect(startHintDue(state)).toBe(false);
+  });
+});
```

  `notice.test.ts` — criterion 10:

```diff
--- a/tests/unit/notice.test.ts
+++ b/tests/unit/notice.test.ts
@@ -1,8 +1,14 @@
 import { describe, expect, it } from 'vitest';
-import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
+import {
+  NOTICE_CASE_SOLVED,
+  NOTICE_LAMP,
+  NOTICE_SHADOW_TOO_DENSE,
+  NOTICE_TRACE_FOUND,
+  noticeOf,
+} from '../../src/game/notice';
 import type { GameInput } from '../../src/game/player';
 import type { GameState, ShadowWallState } from '../../src/game/state';
-import { createInitialState, update } from '../../src/game/update';
+import { createInitialState, newGame, update } from '../../src/game/update';
 import { textKey } from '../../src/text/text';
 import { grassMap } from './grass-map';
 
@@ -97,3 +103,73 @@
     expect(noticeOf(dark)).toBeNull();
   });
 });
+
+describe("the line that names the lamp's key (0026)", () => {
+  const TALK: GameInput = { ...NONE, talk: true };
+  /** The officer 24 px right of the spawn. */
+  const map = grassMap(20, 12, { x: 136, y: 96 }, [{ name: 'figure:officer', x: 160, y: 96 }]);
+  const run = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
+    inputs.reduce((state, input) => update(state, input, map), start);
+  const called = run(newGame(map), TALK, NONE, TALK, NONE, TALK);
+  const met = run(called, NONE, TALK, NONE, TALK, NONE, TALK);
+
+  it('is the key `notice.lamp`', () => {
+    expect(NOTICE_LAMP).toBe(textKey('notice.lamp'));
+  });
+
+  it('is not shown in a new game, under the call or after it, before the first meeting', () => {
+    expect(noticeOf(newGame(map))).toBeNull();
+    expect(noticeOf(called)).toBeNull();
+    expect(noticeOf(run(called, NONE, TALK, NONE, TALK, NONE))).toBeNull();
+  });
+
+  it('is shown from the step that hands the lamp over, for as long as the lamp is not held', () => {
+    expect(met.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    let state = met;
+    for (let step = 0; step < 600; step += 1) {
+      expect(noticeOf(state), `step ${step}`).toBe(NOTICE_LAMP);
+      state = update(state, { ...NONE, right: step % 2 === 0 }, map);
+    }
+  });
+
+  it('is gone with the first step in which the lamp is on, and does not come back', () => {
+    const lit = run(met, NONE, SHINE);
+    expect(noticeOf(lit)).toBeNull();
+    let state = lit;
+    for (let step = 0; step < 600; step += 1) {
+      state = update(state, NONE, map);
+      expect(noticeOf(state)).toBeNull();
+    }
+  });
+
+  it('is never shown in a game past its opening', () => {
+    expect(noticeOf(createInitialState(map))).toBeNull();
+    expect(noticeOf(BASE)).toBeNull();
+  });
+
+  it('has the last place: a wall that holds, a solved case and a found trace come first', () => {
+    const waiting: GameState = {
+      ...BASE,
+      tick: 1000,
+      lamp: { on: false, strength: 1, owned: true, used: false },
+    };
+    expect(noticeOf(waiting)).toBe(NOTICE_LAMP);
+    expect(noticeOf({ ...waiting, traces: [{ trace: 0, light: 0, found: 950 }] })).toBe(
+      NOTICE_TRACE_FOUND,
+    );
+    expect(noticeOf({ ...waiting, solved: [{ region: 'sales', at: 950 }] })).toBe(
+      NOTICE_CASE_SOLVED,
+    );
+    expect(
+      noticeOf({
+        ...waiting,
+        lamp: { ...waiting.lamp, on: true },
+        shadowWalls: [HOLDS],
+      }),
+    ).toBe(NOTICE_SHADOW_TOO_DENSE);
+    // Once their time is over the lamp's line is back: it has none of its own.
+    expect(noticeOf({ ...waiting, traces: [{ trace: 0, light: 0, found: 100 }] })).toBe(
+      NOTICE_LAMP,
+    );
+  });
+});
```

  `draw-scene.test.ts` — criterion 12, one new block at the end of the file:

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -1483,3 +1483,142 @@
     expect(renderer.sheets).toStrictEqual([content.playerSheet]);
   });
 });
+
+describe('the story in the scene (0026)', () => {
+  const BOX = 'fillRect 8,134 304x42 #181425';
+  const BAR = 'fillRect 8,158 304x18 #181425';
+  const NO_LAMP = { on: false, strength: 1, owned: false, used: false };
+  /** A new game on the 3x2 map: the call open on `page`, no lamp, the opening not ended. */
+  const calling = (page: number, tick = 0): GameState => ({
+    ...state({ x: 20, y: 30 }),
+    tick,
+    started: null,
+    lamp: NO_LAMP,
+    dialogue: { speaker: 'story', index: 0, page },
+    overview: { current: 1, max: 2 },
+  });
+  const fontCalls = (
+    renderer: ReturnType<typeof recordingRenderer>,
+    content: SceneContent = CONTENT,
+  ): string[] =>
+    renderer.calls
+      .filter((call) => call.startsWith('drawSprite'))
+      .filter((_call, i) => renderer.sheets[i] === content.fontSheet);
+
+  it("draws the call's first page in the dialogue box, on a map without any figure", () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, calling(0), CONTENT);
+    const box = renderer.calls.indexOf(BOX);
+    expect(box).toBeGreaterThan(renderer.calls.indexOf('drawSprite 1 at 14,4'));
+    const line = fontCalls(renderer);
+    // `Montagmorgen. Das Telefon – ein Kunde:` — `M` is glyph 45; the second line opens with `„`.
+    expect(line[0]).toBe('drawSprite 45 at 12,138');
+    expect(line[33]).toBe('drawSprite 102 at 12,150');
+    // 33, 42 and 39 glyphs on its three lines.
+    expect(line).toHaveLength(114);
+    expect(renderer.calls).not.toContain(BAR);
+  });
+
+  it('draws it in English when the language is `en`', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, calling(0), CONTENT, ENGLISH);
+    const line = fontCalls(renderer);
+    // `Monday morning. The phone – a customer:` — the second line opens with `“`.
+    expect(line[0]).toBe('drawSprite 45 at 12,138');
+    expect(line[33]).toBe('drawSprite 103 at 12,150');
+    // 33, 39 and 27 glyphs.
+    expect(line).toHaveLength(99);
+  });
+
+  it('draws the second and the third page, and the marker of 0017', () => {
+    const second = recordingRenderer();
+    drawScene(second, calling(1), CONTENT);
+    // `Die Geschäftsführung …`: `D` is glyph 36.
+    expect(fontCalls(second)[0]).toBe('drawSprite 36 at 12,138');
+    expect(second.calls.slice(-3)).toStrictEqual([
+      'fillRect 299,169 5x1 #ffffff',
+      'fillRect 300,170 3x1 #ffffff',
+      'fillRect 301,171 1x1 #ffffff',
+    ]);
+    const third = recordingRenderer();
+    drawScene(third, calling(2, 30), CONTENT);
+    // `Über den Türen …`: `Ü` is glyph 97. No marker in the second half second.
+    expect(fontCalls(third)[0]).toBe('drawSprite 97 at 12,138');
+    expect(third.calls.some((call) => call.endsWith('#ffffff'))).toBe(false);
+  });
+
+  it('draws no box for a scene the story does not have', () => {
+    const renderer = recordingRenderer();
+    drawScene(
+      renderer,
+      { ...calling(0), dialogue: { speaker: 'story', index: 4, page: 0 } },
+      CONTENT,
+    );
+    expect(renderer.calls).not.toContain(BOX);
+  });
+
+  it('shows no start hint while the opening has not ended, and counts it from the end of the call', () => {
+    const quiet = (tick: number, started: number | null): string[] => {
+      const renderer = recordingRenderer();
+      drawScene(renderer, { ...calling(0, tick), started, dialogue: null }, CONTENT);
+      return fontCalls(renderer);
+    };
+    expect(quiet(10, null)).toStrictEqual([]);
+    expect(quiet(5000, null)).toStrictEqual([]);
+    // `Hilfe: Taste H`, as in 0021, for 600 steps from the step that closed the call.
+    expect(quiet(900, 900)[0]).toBe('drawSprite 40 at 118,162');
+    expect(quiet(1499, 900)).toHaveLength(12);
+    expect(quiet(1500, 900)).toStrictEqual([]);
+  });
+
+  it('draws no cone while the lamp is not owned, whatever is held', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, { ...calling(0), dialogue: null, started: 5 }, CONTENT);
+    expect(renderer.sheets).not.toContain(CONTENT.lampSheet);
+    const owned = recordingRenderer();
+    drawScene(owned, state({ x: 20, y: 30 }, { x: 0, y: 0 }, true), CONTENT);
+    expect(owned.sheets).toContain(CONTENT.lampSheet);
+  });
+
+  it('draws the page that hands the lamp over while the lamp is not owned, and her own page after', () => {
+    const content: SceneContent = {
+      ...CONTENT,
+      map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
+    };
+    const meeting = (lamp: GameState['lamp']): GameState => ({
+      ...state({ x: 20, y: 30 }),
+      lamp,
+      figures: [{ figure: 0, facing: 'left' }],
+      dialogue: { speaker: 'figure', index: 0, page: 1 },
+    });
+    const first = recordingRenderer();
+    drawScene(first, meeting(NO_LAMP), content);
+    // `Nimm die Lampe: …`: `N` is glyph 46.
+    expect(fontCalls(first, content)[0]).toBe('drawSprite 46 at 12,138');
+    const english = recordingRenderer();
+    drawScene(english, meeting(NO_LAMP), content, ENGLISH);
+    // `Take the lamp: …`: `T` is glyph 52.
+    expect(fontCalls(english, content)[0]).toBe('drawSprite 52 at 12,138');
+    const later = recordingRenderer();
+    drawScene(later, meeting({ ...NO_LAMP, owned: true }), content);
+    // `Mit der Lampe hältst du fest, …`: `M` is glyph 45.
+    expect(fontCalls(later, content)[0]).toBe('drawSprite 45 at 12,138');
+  });
+
+  it("shows the lamp's line in the bar from the hand-over until the lamp was held once", () => {
+    const waiting: GameState = {
+      ...state({ x: 20, y: 30 }),
+      lamp: { on: false, strength: 1, owned: true, used: false },
+    };
+    const renderer = recordingRenderer();
+    drawScene(renderer, waiting, CONTENT);
+    expect(renderer.calls.filter((call) => call === BAR)).toHaveLength(1);
+    // `Die Lampe: Leertaste halten.`: 28 characters, 25 drawn, `D` is glyph 36.
+    const line = fontCalls(renderer);
+    expect(line).toHaveLength(25);
+    expect(line[0]).toBe('drawSprite 36 at 76,162');
+    const used = recordingRenderer();
+    drawScene(used, { ...waiting, lamp: { ...waiting.lamp, used: true } }, CONTENT);
+    expect(used.calls).not.toContain(BAR);
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/help.test.ts tests/unit/notice.test.ts
  tests/unit/draw-scene.test.ts`. Expected: FAIL, 14 of 145 tests.

- [x] **Step 3: The start hint,** in `help.ts`:

```diff
diff --git a/src/game/help.ts b/src/game/help.ts
index 0f22ff6..a4db5bc 100644
--- a/src/game/help.ts
+++ b/src/game/help.ts
@@ -23,6 +23,16 @@ export function helpHintDue(tick: number): boolean {
   return tick < HELP_HINT_STEPS;
 }
 
+/**
+ * Whether the start hint is due in a state (0026): the game's opening has ended, and fewer
+ * than HELP_HINT_STEPS steps have passed since. While the call is open it is not due, so the
+ * call does not use its ten seconds up. A game past its opening started at 0, and there this
+ * is `helpHintDue(tick)`.
+ */
+export function startHintDue(state: Pick<GameState, 'tick' | 'started'>): boolean {
+  return state.started !== null && helpHintDue(state.tick - state.started);
+}
+
 /**
  * The state after a press that opens the help, or null when `help` is not pressed: the help
  * open, the tick grown, the input remembered. Nothing else changes, whatever else is open and
```

- [x] **Step 4: The lamp's line,** in `notice.ts`:

```diff
diff --git a/src/game/notice.ts b/src/game/notice.ts
index dd907a5..753c567 100644
--- a/src/game/notice.ts
+++ b/src/game/notice.ts
@@ -20,11 +20,16 @@ export const NOTICE_TRACE_FOUND: TextKey = textKey('notice.trace-found');
 /** Tune: two seconds from the find. */
 export const TRACE_NOTICE_STEPS = 120;
 
+/** The lamp's key (0026): shown from the step the lamp is handed over until it is held once. */
+export const NOTICE_LAMP: TextKey = textKey('notice.lamp');
+
 /**
  * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
  * is on and cannot lift: a wall that gives way counts from 1 in its first step; that notice
  * comes first. Then, for CASE_NOTICE_STEPS steps from the solving step, that a case is solved
  * (0024). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was found (0022).
+ * Last, while the lamp is owned and was never on, the line that names its key (0026): it has no
+ * time, and it does not come back.
  */
 export function noticeOf(state: GameState): TextKey | null {
   const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
@@ -38,5 +43,8 @@ export function noticeOf(state: GameState): TextKey | null {
   const found = state.traces.some(
     (trace) => trace.found !== null && state.tick - trace.found < TRACE_NOTICE_STEPS,
   );
-  return found ? NOTICE_TRACE_FOUND : null;
+  if (found) {
+    return NOTICE_TRACE_FOUND;
+  }
+  return state.lamp.owned && !state.lamp.used ? NOTICE_LAMP : null;
 }
```

- [x] **Step 5: The scene:**

```diff
diff --git a/src/render/draw-scene.ts b/src/render/draw-scene.ts
index a9ace7a..5c6a747 100644
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -1,9 +1,9 @@
 import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
 import { type Box, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { progressOf } from '../game/cases';
-import { type Figure, figuresOf } from '../game/cast';
+import { type Figure, figuresIn, figuresOf } from '../game/cast';
 import { CREATURE_SIZE } from '../game/creature';
-import { HELP_HINT, helpHintDue } from '../game/help';
+import { HELP_HINT, startHintDue } from '../game/help';
 import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
 import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
@@ -22,7 +22,7 @@ import {
   type Species,
   type TraceState,
 } from '../game/state';
-import { speakerOf, speakersOf } from '../game/talk';
+import { pagesOf, speakersOf } from '../game/talk';
 import { FIND_STEPS, tracesOf } from '../game/trace';
 import { type Language, type TextKey, textKey, textOf } from '../text/text';
 import { drawHelp } from './draw-help';
@@ -304,7 +304,7 @@ export function quietLine(state: GameState, settings: SceneSettings): TextKey |
   if (languageNoticeVisible(state.tick, settings.switchedAt)) {
     return LANGUAGE_NOTICE;
   }
-  return helpHintDue(state.tick) ? HELP_HINT : null;
+  return startHintDue(state) ? HELP_HINT : null;
 }
 
 /** The dialogue box (0017): the notice's bar grown upwards to three lines, the same bottom edge. */
@@ -481,16 +481,17 @@ export function drawScene(
   const page =
     state.dialogue === null
       ? undefined
-      : speakerOf(
+      : pagesOf(
           state.dialogue,
           speakersOf(
-            figures,
+            // As in `update`: without the lamp the officer says the first meeting (0026).
+            figuresIn(figures, state.lamp.owned),
             state.movers,
             routesOf(content.map.points),
             undefined,
             progressOf(state, content.map),
           ),
-        )?.pages[state.dialogue.page];
+        )[state.dialogue.page];
   const notice = noticeOf(state);
   if (page !== undefined) {
     renderer.fillRect(
```

- [x] **Step 6: Run** the three files — green, the tests of 0021 on the hint unchanged —
  then `npm run check`: 1262 unit tests.

- [x] **Step 7: Commit** — `Show the call, the lamp's line and the start hint after the call`.
  Body: the hint's ten seconds begin when the call is closed, so the call does not hide it.

---

### Task 6: The game starts with it

**Files:**
- Modify: `src/main.ts`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `newGame` (Task 4).

- [x] **Step 1: Change the smoke spec.** A new test for the start; a helper `start` that
  loads the page and reads the call to its end, used by every other test in place of
  `page.goto('/')`; and the test of 0007 turned round — without the lamp a held Space turns
  no light on and does not hold the figure:

```diff
diff --git a/tests/e2e/smoke.spec.ts b/tests/e2e/smoke.spec.ts
index db1202b..376070e 100644
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -1,5 +1,5 @@
 import http from 'node:http';
-import { expect, test } from '@playwright/test';
+import { expect, type Page, test } from '@playwright/test';
 
 /** Set when the spec runs against the container; the header checks need nginx. */
 const containerUrl = process.env.BASE_URL;
@@ -45,8 +45,62 @@ function container(): string {
   return containerUrl.replace(/\/$/, '');
 }
 
-test('the page loads with its title, its canvas and the dark background', async ({ page }) => {
+/** The call on its page, as the state holds it (0026). */
+const call = (page: number) => ({ speaker: 'story', index: 0, page });
+
+/**
+ * Loads the game and reads the call to its end (0026): three presses of E. The game reads the
+ * held keys once per frame, so a key stays down until the state shows the page it turned to, and
+ * the next press waits until the state has seen the key let go.
+ */
+async function start(page: Page): Promise<void> {
   await page.goto('/');
+  const dialogue = () => page.evaluate(() => window.shadowAi?.state.dialogue);
+  await expect
+    .poll(dialogue, { message: 'the game opens with the call on its first page' })
+    .toStrictEqual(call(0));
+  for (const next of [call(1), call(2), null]) {
+    await page.keyboard.down('KeyE');
+    await expect.poll(dialogue, { message: 'E turns the page of the call' }).toStrictEqual(next);
+    await page.keyboard.up('KeyE');
+    await expect
+      .poll(() => page.evaluate(() => window.shadowAi?.state.held.talk), {
+        message: 'E was let go',
+      })
+      .toBe(false);
+  }
+}
+
+test('the game opens with the call, without the lamp, and three presses of E close it', async ({
+  page,
+}) => {
+  await page.goto('/');
+  // One poll for the whole value: nothing is read from a page that might still be loading.
+  await expect
+    .poll(
+      () =>
+        page.evaluate(() => {
+          const state = window.shadowAi?.state;
+          return state === undefined
+            ? undefined
+            : { dialogue: state.dialogue, lamp: state.lamp, started: state.started };
+        }),
+      { message: 'a new game: the call on page 0, no lamp, the opening not ended' },
+    )
+    .toStrictEqual({
+      dialogue: call(0),
+      lamp: { on: false, strength: 1, owned: false, used: false },
+      started: null,
+    });
+  await start(page);
+  const state = await page.evaluate(() => window.shadowAi?.state);
+  expect(state?.dialogue).toBeNull();
+  expect(state?.started).toBeGreaterThan(0);
+  expect(state?.lamp.owned).toBe(false);
+});
+
+test('the page loads with its title, its canvas and the dark background', async ({ page }) => {
+  await start(page);
   await expect(page).toHaveTitle('Shadow AI');
   await expect(page.locator('canvas#game')).toHaveCount(1);
   const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
@@ -55,7 +109,7 @@ test('the page loads with its title, its canvas and the dark background', async
 });
 
 test('the map is drawn at the full factor, unclipped', async ({ page }) => {
-  await page.goto('/');
+  await start(page);
   const canvas = page.locator('canvas#game');
   // Desktop Chrome in Playwright: a 1280x720 page area at device pixel ratio 1, so factor 4.
   await expect
@@ -80,7 +134,7 @@ test('the map is drawn at the full factor, unclipped', async ({ page }) => {
 test('one second of ArrowRight moves the figure and the camera right by at least 70 px', async ({
   page,
 }) => {
-  await page.goto('/');
+  await start(page);
   // The handle appears with the first frame; the figure starts at the floor's spawn, x = 256.
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.player.x), {
@@ -101,30 +155,35 @@ test('one second of ArrowRight moves the figure and the camera right by at least
   expect(state?.player.facing).toBe('right');
 });
 
-test('a held Space turns the lamp on and holds the figure in place', async ({ page }) => {
-  await page.goto('/');
+test('without the lamp a held Space turns no light on and does not hold the figure', async ({
+  page,
+}) => {
+  await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.player.x), {
       message: 'window.shadowAi.state.player.x is the spawn: the game runs',
     })
     .toBe(256);
   await page.keyboard.down('Space');
-  await expect.poll(() => page.evaluate(() => window.shadowAi?.state.lamp.on)).toBe(true);
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.held.lamp), {
+      message: 'the state has seen Space held',
+    })
+    .toBe(true);
   await page.keyboard.down('ArrowRight');
-  await page.waitForTimeout(300);
+  await page.waitForTimeout(500);
   const held = await page.evaluate(() => window.shadowAi?.state);
-  // Nothing moves while the lamp is on; the direction key only turns the figure.
-  expect(held?.player.x).toBe(256);
+  // The player has no lamp before the first meeting (0026): Space counts as not held. The lamp
+  // that shines and holds the figure is covered by the unit tests.
+  expect(held?.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
+  expect(held?.player.x).toBeGreaterThanOrEqual(256 + 20);
   expect(held?.player.facing).toBe('right');
-  expect(held?.player.frame).toBe(0);
-  expect(held?.lamp.on).toBe(true);
-  await page.keyboard.up('Space');
-  await expect.poll(() => page.evaluate(() => window.shadowAi?.state.lamp.on)).toBe(false);
   await page.keyboard.up('ArrowRight');
+  await page.keyboard.up('Space');
 });
 
 test('the floor starts with three snippets and nothing captured', async ({ page }) => {
-  await page.goto('/');
+  await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.creatures.length), {
       message: 'window.shadowAi.state.creatures holds the three snippets of the floor',
@@ -144,7 +203,7 @@ test('the floor starts with three snippets and nothing captured', async ({ page
 test('the floor starts with its 22 movers and draws the person of the reception', async ({
   page,
 }) => {
-  await page.goto('/');
+  await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.movers.length), {
       message: 'window.shadowAi.state.movers holds the 22 movers of the floor',
@@ -167,7 +226,7 @@ test('the floor starts with its 22 movers and draws the person of the reception'
 test('the floor starts with its eight shadow walls standing and a lamp of strength 1', async ({
   page,
 }) => {
-  await page.goto('/');
+  await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.shadowWalls.length), {
       message: 'window.shadowAi.state.shadowWalls holds the eight walls of the floor',
@@ -181,7 +240,7 @@ test('the floor starts with its eight shadow walls standing and a lamp of streng
 });
 
 test('the floor starts with the officer standing and no dialogue open', async ({ page }) => {
-  await page.goto('/');
+  await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.figures.length), {
       message: 'window.shadowAi.state.figures holds the one figure of the floor',
@@ -194,7 +253,7 @@ test('the floor starts with the officer standing and no dialogue open', async ({
 });
 
 test('the game starts with full overview and outside the dark', async ({ page }) => {
-  await page.goto('/');
+  await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.overview), {
       message: 'window.shadowAi.state.overview is five of five',
@@ -236,7 +295,7 @@ test.describe('served by the container', () => {
 test('L switches the language once per press, and the page says which one is on', async ({
   page,
 }) => {
-  await page.goto('/');
+  await start(page);
   const language = () => page.evaluate(() => window.shadowAi?.language);
   const lang = () => page.evaluate(() => document.documentElement.lang);
   await expect
@@ -255,7 +314,7 @@ test('L switches the language once per press, and the page says which one is on'
 });
 
 test('J opens the journal on the creatures and closes it again', async ({ page }) => {
-  await page.goto('/');
+  await start(page);
   const journal = () => page.evaluate(() => window.shadowAi?.state.journal);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.held.journal), {
@@ -285,7 +344,7 @@ test('J opens the journal on the creatures and closes it again', async ({ page }
 });
 
 test('the floor starts with its five traces, none seen and none found', async ({ page }) => {
-  await page.goto('/');
+  await start(page);
   // One poll for the whole value: nothing is read from a page that might still be loading.
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.traces), {
@@ -297,7 +356,7 @@ test('the floor starts with its five traces, none seen and none found', async ({
 test('H opens the help, the game stands still under it, and H closes it again', async ({
   page,
 }) => {
-  await page.goto('/');
+  await start(page);
   const help = () => page.evaluate(() => window.shadowAi?.state.help);
   await expect
     .poll(help, { message: 'window.shadowAi.state.help is there: the game runs, the help closed' })
@@ -322,7 +381,7 @@ test('H opens the help, the game stands still under it, and H closes it again',
 });
 
 test('the reception keeps its colours: no shadow lies over it', async ({ page }) => {
-  await page.goto('/');
+  await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.camera), {
       message: 'the first view is the reception',
@@ -343,7 +402,7 @@ test('the reception keeps its colours: no shadow lies over it', async ({ page })
 });
 
 test('the game starts with no case solved and five hearts', async ({ page }) => {
-  await page.goto('/');
+  await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.solved), {
       message: 'window.shadowAi.state.solved is there and empty',
```

- [x] **Step 2: Run it** — `npm run test:e2e`. Expected: FAIL — the game starts without a
  dialogue, so `start` times out waiting for the call.

- [x] **Step 3: The start,** in `main.ts`:

```diff
diff --git a/src/main.ts b/src/main.ts
index 3e3944c..15f2200 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -9,7 +9,7 @@ import { CONE_LENGTH } from './game/lamp';
 import { MOVER_SIZE } from './game/mover';
 import type { GameInput } from './game/player';
 import type { GameState } from './game/state';
-import { createInitialState, update } from './game/update';
+import { newGame, update } from './game/update';
 import { createCanvas2dRenderer } from './render/canvas2d/canvas2d-renderer';
 import { drawScene, HEART_SIZE, type SceneContent, type SceneSettings } from './render/draw-scene';
 import { GLYPH_HEIGHT, GLYPH_WIDTH } from './render/font';
@@ -235,7 +235,7 @@ function readInput(): GameInput {
 async function start(): Promise<void> {
   const renderer = createCanvas2dRenderer(findCanvas());
   const content = await loadContent();
-  const handle = { state: createInitialState(content.map), language: settings.language };
+  const handle = { state: newGame(content.map), language: settings.language };
   window.shadowAi = handle;
   runLoop(
     handle.state,
```

- [x] **Step 4: Run** `npm run test:e2e` twice — 16 passed, 3 skipped, both times — and
  `npm run check`: 1262 unit tests.

- [x] **Step 5: Commit** — `Start the game with the call`.

---

### Task 7: The documents

**Files:**
- Modify: `docs/spec/vision.md`, `docs/spec/gameplay.md`, `docs/spec/world.md`,
  `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md`

The diffs are against `main` at `8020f24`. If a line has moved, put the text where the diff
means it; do not change the words without a reason. `vision.md` §2 already allows the line
that names the lamp's key; it is not changed here.

- [x] **Step 1: `vision.md`** §4:

```diff
diff --git a/docs/spec/vision.md b/docs/spec/vision.md
index acf4f08..2cab999 100644
--- a/docs/spec/vision.md
+++ b/docs/spec/vision.md
@@ -52,6 +52,13 @@ offer in the answer of a public AI chatbot. The managing director stands in your
 how that could happen. On the way to Sales, where the offer came from, you see the shadow for the
 first time.
 
+*As built* (feature 0026): the trigger is three pages of text before the first step — the
+customer's call, the managing director's order, the first sight of the shadow. The customer and
+the managing director say one sentence each and are not on the map in the first act. The
+managing director stops the player at the reception, where the game begins: the floor has no
+room of the player's own, so nobody can stand in its door. The third page points next door, to
+the data protection officer, who hands the lamp over in the first talk.
+
 **The shadow.** A residue, not a being. Wherever data leaves the house without anybody watching,
 something stays behind and grows with the flow. It darkens rooms, lies over screens, blocks
 corridors like a wall of flicker. Where the use gets dense, it condenses into creatures — one
```

- [x] **Step 2: `gameplay.md`** §2, §7 and §8:

```diff
diff --git a/docs/spec/gameplay.md b/docs/spec/gameplay.md
index 2915c11..4f030b6 100644
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -35,6 +35,13 @@ the chest, 12 px above the feet, is 48 px long — three tiles — and opens wit
 side, so it is as wide at its end as it is long; both numbers *tune*. It is drawn as a yellow
 checkerboard under the figure. The battery arrives with M6.
 
+**As built** (feature 0026): the player starts without the lamp. Until the data protection
+officer hands it over, Space does nothing: no cone, nothing freezes, no wall is lit, no trace is
+seen, and the figure walks with the key held. The creatures hit as always, and the dark wakes
+the figure in her office — beside her. From the step that closes the first meeting a line at
+the bottom says `Die Lampe: Leertaste halten.`, until the lamp is held once; it does not come
+back.
+
 **As built** (feature 0008): a creature whose body is in the cone, with no solid tile between it
 and the figure, freezes. After one second of unbroken light — 60 steps, *tune* — it is captured
 and gone. A break starts the second again. Solid tiles block the light: walls, and fences and
@@ -187,6 +194,9 @@ policy tab shows one block per solved case, in the order they were solved, two t
 each; until a case is solved it shows its line for nothing. Two blocks fit the screen; pages
 within the tab come with the third (M6).
 
+**As built** (feature 0026): the journal does not open while the call is read, like under any
+dialogue. After it, J opens it with or without the lamp.
+
 ## 8. Controls and presentation
 
 Desktop browser with keyboard; a gamepad is deferred (`docs/plan.md` §5); touch and
@@ -218,12 +228,21 @@ language, for two seconds: `Sprache: Deutsch` or `Language: English`. A held key
 Every load starts in German, and nothing is remembered. The title screen of M8 will hold the
 switch.
 
+**As built** (feature 0026): the game opens with the call — three pages in the dialogue box
+that the story itself says, with no figure speaking. E or Enter turns the page and closes the
+third; until then the world stands still and the other keys do nothing, as with every dialogue.
+There is no way to skip it before M8. In the first meeting the data protection officer says her
+first page and then the page that hands the lamp over; afterwards she says her two pages of
+0017. A press of E opens a dialogue with Space held as long as the player has no lamp.
+
 **As built** (feature 0021): a press of H opens the help, a box over the game with seven rows —
 a key and what it does — and a second press closes it. The game stands still while it is open,
 and everything goes on where it stood when it closes. The help opens over a dialogue and over
 the journal, which keep their page and their tab, and not in the dark. For the first ten
 seconds of a game one line in the notice's bar names the key — `Hilfe: Taste H` or
 `Help: press H` — behind every other text, and it does not come back. A held key counts once.
+Since feature 0026 the ten seconds begin when the call is closed, so that the call does not
+hide the line.
 
 ## 9. Deliberately simple in the first draft
 
```

- [x] **Step 3: `world.md`** §3:

```diff
diff --git a/docs/spec/world.md b/docs/spec/world.md
index a5c8ec1..f7e9b5f 100644
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -183,6 +183,9 @@ Kept as small as the story allows. About thirty figures in all.
   same two pages every time, until M5 brings the first meeting. She has no name yet and is not
   solid: the player walks through her. Feature 0018 changed nothing for her but the distance
   from which she can be spoken to: 40 px, and in sight.
+  Feature 0026 brings the first meeting: while the player has no lamp she says her first page
+  and then `Nimm die Lampe: …` — three sentences in all — and the press that closes it hands
+  the lamp over. From then on she says the two pages of 0017.
 - **The vendor.** See `vision.md` §4. Recurring in every department, never an enemy, changing
   over the game from seller to advisor. As advisor he supplies the approved alternatives that
   solve the later cases.
@@ -199,8 +202,10 @@ Kept as small as the story allows. About thirty figures in all.
   Since feature 0024 the colleague of Sales is the source of the first case. What the colleague
   says follows from the case: the everyday line while a trace is missing, the honest answer
   once all five are found, and the line afterwards once the case is solved.
-- **The managing director.** The last case.
-- **The customer.** A voice on the phone at the start. One line in the epilogue: he called again.
+- **The managing director.** The last case. In the first act a sentence of the call (feature
+  0026); a figure with the map of Management (M6).
+- **The customer.** A voice on the phone at the start — one sentence of the call (feature 0026).
+  One line in the epilogue: he called again.
 
 ## 4. The creatures
 
```

- [x] **Step 4: `architecture.md`** §1, §2, §4, §5 and §8:

```diff
diff --git a/docs/spec/architecture.md b/docs/spec/architecture.md
index 3a54d46..64a32ab 100644
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -29,7 +29,9 @@ src/
                  game/region.ts the areas of the regions and the veil of a cell (0023), the
                  cleared regions and the veil of a clearing (0025);
                  game/cases.ts the cases, when one is ready, what its source says, the
-                 step that solves it (0024) and what goes with the region's shadow (0025)
+                 step that solves it (0024) and what goes with the region's shadow (0025);
+                 game/story.ts the scenes of the story — text with no figure — and the
+                 scene a game opens with (0026)
   render/        the Renderer interface and its Canvas 2D implementation; scaling and letterbox;
                  the draw order of a frame (draw-scene); render/font.ts the glyph order and the
                  cell size of the font, render/draw-text.ts text by TextKey, line by line
@@ -132,7 +134,23 @@ start, and kept in the state so a saved game comes back as it was left.
 `createInitialState(map)` lives in `game/update` beside `update`, so that `game/state` holds
 types and constants only.
 
-`lamp` is `{ on, strength }` (features 0007, 0014): `on` in every step whose input holds `lamp`,
+There are two starts (feature 0026). `createInitialState(map)` is a game **past its opening**:
+no dialogue open, the lamp owned and used, `started` 0. The tests of the earlier features step
+from it. `newGame(map)` is what a player gets, and what `main.ts` starts with: the same state
+with `dialogue` `{ speaker: 'story', index: 0, page: 0 }` — the call on its first page —,
+`lamp` `{ on: false, strength: 1, owned: false, used: false }` and `started` `null`.
+
+`started` is the `tick` of the step in which the game's opening ended, or `null` while it has
+not (feature 0026). The step that closes the call sets it to its own `tick`; no other step
+changes it, and the wake keeps it. The start hint of the help counts from it (§5).
+
+`lamp` is `{ on, strength, owned, used }` (features 0007, 0014, 0026): `owned` says whether the
+player has the lamp, and `used` whether it was on in any step since — `false` after the first
+meeting, `true` from the first step in which `on` is `true`, and never `false` again. While the
+lamp is not owned, the input's `lamp` counts as not held everywhere in `update`: `on` stays
+`false`, `stepPlayer` gets the input without it, so the figure walks, and a press of `talk`
+opens a dialogue with the key held. `held` still remembers the input as it came. The wake keeps
+`owned` and `used`. `on` is true in every step whose input holds `lamp` once the lamp is owned,
 derived from the input and kept in the state so the renderer knows what to draw; `strength` is
 `BASE_STRENGTH`, 1, from `createInitialState` on, and no step changes it before the upgrades of
 M6 — the wake keeps it. A later field, charge (M6), joins them. While it is on, `stepPlayer` keeps the feet where they are, resets
@@ -255,6 +273,21 @@ was spoken to. A standing figure never moves and is not solid. `dialogue` is `nu
 `{ speaker, index, page }` (feature 0018): `speaker` is `'figure'` or `'mover'`, `index` the index
 of the speaker in `figures` or in `movers`, and `page` the page shown, from 0.
 
+A third kind of speaker is the story itself (feature 0026): `{ speaker: 'story', index, page }`,
+with `index` the index of a **scene** in `SCENES` (`game/story`). A scene is pages with no figure
+that speaks; `SCENES` holds one, the call, and `OPENING_SCENE`, 0, names it as the scene a game
+opens with. A scene is no speaker of a step — nobody can walk up to it, and nobody turns. The
+pages of a dialogue are `pagesOf(dialogue, speakers)` in `game/talk`: the scene's own for
+`'story'`, else those of the speaker among the speakers of the step. A scene's dialogue is
+stepped like any other. The game opens a scene, never a press; in this feature only `newGame`
+does.
+
+The **first meeting** (feature 0026) is data of `game/cast`: `FIRST_MEETING` names the figure
+that hands the lamp over, `officer`, and its pages, `talk.officer-rules-1` and
+`talk.officer-meeting-2`. While the lamp is not owned, `figuresIn(figures, owned)` gives that
+figure the meeting's pages instead of its own; `update` and the scene both build the speakers
+from it, so the box shows the pages the dialogue has.
+
 `held` is the last step's input, a plain `GameInput`, every action false at the start
 (`NO_INPUT`); it replaced `talkHeld`, the `talk` of the last step, with feature 0020, because the
 journal needs presses of three actions. An action is **pressed** in a step when the input holds
@@ -270,8 +303,9 @@ outcome, `outcomeOf`; the policy's blocks are the solved cases' blocks in the or
 solved, `policyBlocks` — both derived from `solved` in every frame (feature 0024).
 `help` is a boolean, `false` at the start: whether the help is open (feature 0021,
 `game/help`). The rows the help shows and whether the start hint is due are not in the state:
-the rows are constants of `render/draw-help`, and the hint is derived from `tick` in every frame
-(`helpHintDue`).
+the rows are constants of `render/draw-help`, and the hint is derived from `tick` and `started`
+in every frame (`startHintDue`, feature 0026: `started` is not `null` and `tick` − `started` <
+`HELP_HINT_STEPS`; `helpHintDue` is the same test on the steps since the start).
 
 The **speakers** of a step (feature 0018, `speakersOf` in `game/talk`) are the standing figures in
 file order, then the movers of the kind `person` whose route is in `COLLEAGUES` (`game/cast`), in
@@ -309,11 +343,16 @@ the left and the upper edge included) leaves `creatures`, wherever it is; `captu
 change, and a creature at home outside the region stays. The step changes
 `tick`, `held`, `dialogue`, `solved`, `overview`, `shadowWalls` and `creatures` and nothing
 else; no other step solves a case, and a solved case is not solved again. The wake brings back
-only the creatures still in `creatures`, so none that left this way. **Ordinary:** otherwise, a press of `journal` opens the journal on `creatures`, whatever else
+only the creatures still in `creatures`, so none that left this way. Two more closings change
+something (feature 0026): the step that closes the call — the scene `OPENING_SCENE`, while
+`started` is `null` — sets `started` to its `tick`; and the step that closes the first meeting
+(`isFirstMeeting`: the lamp is not owned, and the speaker is the figure of `FIRST_MEETING`) sets
+`lamp.owned` to `true` and leaves `lamp.used` `false`. Closing any other dialogue changes
+neither. **Ordinary:** otherwise, a press of `journal` opens the journal on `creatures`, whatever else
 the input holds: `tick` grows by 1, `held` is set, and nothing else changes in this step — a
 figure in mid-step, a push and a lamp that is on stay as they are and go on when it closes
 (`openJournal`). This comes before a press of `talk` is looked at. Otherwise a press of `talk` while the input does not
-hold `lamp`, the player is not pushed and a speaker stands at most 40 px (`TALK_DISTANCE`) from
+hold `lamp` — or the player has no lamp to hold (feature 0026) —, the player is not pushed and a speaker stands at most 40 px (`TALK_DISTANCE`) from
 the player's feet and in sight opens a dialogue with the nearest one — the first in the speakers'
 order of two equally near — on page 0, and nothing else is stepped. In sight (`inSight`) is the
 lamp's `sightBlocked` between the centres of the two boxes, (x, y − 4) of each, against the opaque
@@ -413,6 +452,10 @@ the last frame as `switchedAt`, and sets the `lang` attribute of the page's root
 key switches once; with Ctrl, Alt or Cmd the browser keeps its shortcut and the language stays;
 before the content has loaded the key does nothing. The game still gets its eight actions.
 
+The input is what the keys say, not what the player can do with them: `lamp` is on while Space
+is held also before the player has the lamp (feature 0026). `update` is the place that knows
+the lamp is not owned and counts the action as not held; `held` keeps the input as it came.
+
 ## 5. The renderer interface
 
 `render/renderer.ts` declares what the game needs drawn, in game pixels on a 320x180 surface:
@@ -535,8 +578,9 @@ every frame. `SceneContent` holds loaded content only. Every text of the scene i
 (8, 158, 304, 18) in `#181425` and the line centred in it — when `switchedAt` is not null and
 0 ≤ `tick` − `switchedAt` < `LANGUAGE_NOTICE_STEPS` (120, two seconds), no dialogue is open and
 no notice shows. The start hint (feature 0021), the key `notice.help`, is drawn the same way
-when `tick` < `HELP_HINT_STEPS` (600, ten seconds, `helpHintDue` in `game/help`), no dialogue is
-open, no notice shows and the language line is not due. The dialogue box comes first, then the
+when it is due — `startHintDue` in `game/help`: the opening has ended, `started` is not `null`,
+and `tick` − `started` < `HELP_HINT_STEPS` (600, ten seconds; feature 0026, it was `tick` <
+600) —, no dialogue is open, no notice shows and the language line is not due. The dialogue box comes first, then the
 notice, then the language line, then the start hint: where a text is on screen, that text
 changes with the language and is the answer to a switch. `quietLine` names the line of the bar
 where no dialogue is open and no notice shows: none while the help is open, else the language
@@ -547,9 +591,10 @@ A standing figure (feature 0017) is drawn from its own sheet, `<id>.png`, like a
 stands: frame facing × 5, top-left corner at (round(x) − 8 − camera.x, round(y) − 24 −
 camera.y). The figures are rebuilt from `map.points` every frame, as in `update`. While a dialogue
 is open the dialogue box is drawn in the notice's place, on the surface and not shifted by the
-camera, and no notice is drawn. The page is the speaker's (feature 0018): the scene finds it
-among the speakers of the frame with `speakerOf` — built with `progressOf(state, map)`, as in
-`update` (feature 0024) — and draws no box when the map does not have it.
+camera, and no notice is drawn. The page is the speaker's (feature 0018) or the scene's (feature
+0026): the scene finds it with `pagesOf` among the speakers of the frame — built with
+`progressOf(state, map)` (feature 0024) and `figuresIn(figures, lamp.owned)` (feature 0026), as
+in `update` — and draws no box when neither the map nor the story has it.
 The box is a rectangle (8, 134, 304, 42) in `#181425` — the notice's bar
 grown upwards to three lines, with the same bottom edge —, the page's lines left-aligned from
 (12, 138), and, while ⌊tick / 30⌋ is even, the marker: three rectangles in `#ffffff`, (299, 169,
@@ -1048,7 +1093,9 @@ The notice is the first text: `game/notice` derives from the state, in every fra
 it shows, if any. While the lamp is on and a standing shadow wall has `lit` true and `light` 0 —
 a wall in the light that holds (0014) — it is `notice.shadow-too-dense`; otherwise, for two
 seconds from the step that solved a case, `notice.case-solved` (0024); otherwise, for two
-seconds from the last find of a trace, `notice.trace-found` (0022); otherwise there is none.
+seconds from the last find of a trace, `notice.trace-found` (0022); otherwise, while the lamp is
+owned and was never on, `notice.lamp`, the line that names its key (0026) — it has no time and
+does not come back; otherwise there is none.
 The state has no field for it (INV-1). A notice stays one line.
 
 The language is a setting of the player (feature 0019), not a fact of the game. `main.ts` holds
@@ -1094,6 +1141,12 @@ are pages of the kind `talk`, `talk.<region>-source-<n>` and `talk.<region>-afte
 rule of a page; `notice.case-solved` is a notice. `game/cases` names them by key in `CASES`,
 and the rule test covers both new kinds in both languages.
 
+The story (feature 0026) adds the kind `story`: `story.<scene>-<n>` is a page of a scene, under
+the rule of a page of talk — at most three lines of at most 47 characters, none empty — and the
+test of that rule covers both kinds. `game/story` names the pages by key in `SCENES`.
+`talk.officer-meeting-2` is the page of the first meeting that hands the lamp over, named in
+`FIRST_MEETING`; `notice.lamp` is a notice.
+
 ## 9. Tooling
 
 | Concern | Tool |
```

- [x] **Step 5: `testing.md`** §2, the rows of INV-1 and INV-4:

```diff
diff --git a/docs/spec/testing.md b/docs/spec/testing.md
index 017aa21..7b468e6 100644
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -19,10 +19,10 @@ All four run in CI on every pull request (`ops.md` §4). Red blocks the merge.
 
 | Invariant | Test |
 |---|---|
-| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); the initial state and one with the help open (0021) |
+| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state and one with the help open (0021) |
 | INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/`, and on the type `Language` there — the game does not know the language (0019) |
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
-| INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
+| INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
 | INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
 | INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet with its five frames (0023, 0025) —, the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
 | INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
```

- [x] **Step 6: `README.md`:**

```diff
diff --git a/README.md b/README.md
index e1293b7..ddc3ca6 100644
--- a/README.md
+++ b/README.md
@@ -46,7 +46,9 @@ region's (feature 0023). With all five traces found, the colleague of Sales answ
 the case is solved, the journal records its outcome and the first block of the policy, and
 overview grows by one (feature 0024). In the same moment the room gets its colours back, its
 veil thins out over two seconds, and its shadow wall and the snippets that were left in it are
-gone (feature 0025). The roadmap is in [docs/plan.md](docs/plan.md).
+gone (feature 0025). The game opens with the call — three pages of story — and without the
+lamp: the data protection officer next door hands it over in the first talk (feature 0026).
+The roadmap is in [docs/plan.md](docs/plan.md).
 
 ## Run it
 
```

- [x] **Step 7:** `npm run check`, then commit — `Move the call into the spec`.

---

### Task 8: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 16 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 8 in this file and commit —
  `Tick the full check of 0026`.

---

### Task 9: The acceptance walk

- [x] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow
  keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk, `L` for the language,
  and that the walk begins with a reload. Wait until the author is ready.
- [x] **Step 2:** guide the author through steps 1–26 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [x] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 8, and start again at step 1.
- [x] **Step 4:** after step 26 ask the five feel questions, one per message.
- [x] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–26`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0026`. A feel note that wants something
  else — fewer pages, other words, a figure for the managing director, no line for the key —
  becomes a new draft, not a change on this branch.

---

### Task 10: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 8. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M5 section, say that 0026 is
  implemented too; leave what the sentence says about 0027 as it is on that day. Commit —
  `Mark 0026 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0026: the call`, with the walk's result and feel notes in its description, and
  one line for the next walks: from this feature on every acceptance walk begins with the
  call and the way to the lamp. CI must be green. The author merges.
