# 0036 — Implementation plan: LMIS and Harmonic

**Spec:** [`docs/features/0036-lmis-and-harmonic.md`](../features/0036-lmis-and-harmonic.md)
(approved 2026-11-19). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/vision.md` §10, `docs/spec/gameplay.md` §6
and §8, `docs/spec/architecture.md` §2, §3 and §5 and `docs/spec/testing.md` §5.
**Written:** 2026-11-19 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** the branch `feature/0036-lmis-and-harmonic` exists, cut from `main` at
`0d7dedf`. It already holds four commits of documents and this plan: the spec no longer
describes Harmonic stations, feature 0035 is marked rejected, the rule about naming Harmonic
is reworded (`CLAUDE.md` §2, `vision.md` §6 and §10), and this feature's spec is approved.
Work on this branch; merge the latest `main` into it before Task 1. The local branch
`feature/0035-the-harmonic-station` is history the author keeps: do not touch, merge or
delete it, and take no code from it. The specs 0037 and 0038 are approved, have no plan yet,
and are **not** built here.

**Goal:** a game opens with a dark card that says `LMIS präsentiert` over the title; after
three seconds, or at a press of `E` or `Enter`, the call follows. In the game three voices
name Harmonic once each and say what it would have shown.

**Approach:** four code tasks, each green on its own. The words of the card (T1). The state
and the step (T2): `GameState.presented`, `game/card` with the step of the card, and `update`
gives the step to the card while it is shown — after it a new game waits 180 steps or for a
press before the call can be read, and the scene still draws the world under it. The card in
the scene (T3): `render/draw-card`, and `drawScene` draws the card and nothing else while it
is shown. The three lines (T4): one new key, new words for two keys, and a third page in the
officer's own talk — no rule of the game changes. Then the documents (T5), the full check
with the container (T6), the walk (T7) and the pull request (T8).

**How this plan was checked:** the code and the tests of Tasks 1 to 4 were run once as a
prototype on 2026-11-19 and then replayed task by task, each task's tests before its code:
they failed as the steps say, and after each of the four tasks typecheck and Biome were clean
and the unit tests green — 1563, 1580, 1585 and 1589 tests (1560 before). The blocks of this
file, applied in order to a clean tree, gave the prototype's files. `npm run check` with the
build passed on the whole prototype, and the smoke spec passed twice against a dev server of
it: 20 passed, 3 skipped. The changed helper of the smoke spec was run once before the code
of Task 2 and failed with `Received: undefined`; with that code the 19 tests of the spec
passed; the new smoke test was run once before the code of Task 3 and failed, because the
corner of the screen showed the map. The prototype was thrown away; nothing of it is on the
branch. If a step does not behave as written, the cause is a difference to that state — stop
and look; do not bend a test. The game was **not** played in a browser — that is the walk —
and the container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `GameState.presented` is plain data: `null` while the card is shown, else the tick
  of the step in which it ended. Whether the card is shown is `presented === null`
  (`cardShown`); nothing else is stored. The three lines add nothing to the state.
- INV-2: `game/card` imports the text table, `game/player` and the type of the state; it uses
  no DOM name. `render/draw-card` imports from `game/card`, never the other way.
- INV-4: every string lives in `src/text/de.ts` and `src/text/en.ts`; code holds keys.
- INV-6: no new image. The card is a clear to `#181425` and text.
- INV-7: no map changes.
- **The name LMIS** appears in exactly one key, `card.presents`. A test of Task 1 holds every
  other key of both tables free of it, and a test of Task 2 the tables of the world data. No
  logo is drawn. No figure names LMIS.
- **The name Harmonic** appears in exactly three keys: `talk.officer-rules-3`,
  `story.close-2` and `talk.sales-after`. A test of Task 4 holds every other key free of it.
  Harmonic is a monitoring product (`vision.md` §10): it shows which AI tools are used and
  where data leaves the house. It is not a tool anybody works in, and it does nothing in the
  game. **The words of the three lines are the author's, approved letter by letter. Do not
  reword, shorten or "improve" them**, in either language, and do not add the name anywhere
  else — not in a notice, not in the help, not in the journal, not in a fixture's text.
- **No praise.** No line says the product is good, tells the player to get it, says what it
  costs or where to get it (`CLAUDE.md` §2). The three lines say what it would have shown.
- **The order of `update`:** the card comes first, before the dark, the help and everything
  after them. While it is shown a step changes `tick`, `held` and, in its last step,
  `presented` — nothing else.
- **`createInitialState` is the game past its opening** and has `presented: 0`; `newGame` has
  `presented: null`. The tests of the earlier features step from `createInitialState` and
  never see the card.
- **The tests of 0026 start past the card.** `tests/unit/opening.test.ts` gets a helper
  `opening(map)`, `{ ...newGame(map), presented: 0 }`, and its tests start from it; their
  expectations do not change. That is what criterion 10 means by "the tests of 0026 pass
  with `presented` 0". The same one-line change is made where `rest.test.ts`,
  `notice.test.ts` and `hints.test.ts` read the call from a new game.
- **Every full literal of the state gets the field.** Ten literals in five test files get
  `presented: 0,` after `finished: null,` (Task 2).
- **The two recorded digests of 600 steps** (`RECORDED` in `tests/unit/journal.test.ts` and
  in `tests/unit/help.test.ts`) are never recorded again. They pass unchanged — criterion 10.
- **The smoke spec's helper `start` presses `E` once more:** it waits for `presented` to be
  `null`, ends the card with one press, and reads the call as before. Every smoke test but
  the new one starts through it.
- **The scene:** while the card is shown `drawScene` calls `drawCard` and returns, before
  the journal and the help are looked at. The card has no hearts, no label of the help, no
  box, no bar, no language line and no lids.
- **`L` and `F` need no change.** `main.ts` handles both outside the game; the card draws its
  lines in the language of the settings. `main.ts` is not touched.
- **The officer's own talk has three pages; the first meeting keeps its two.** The tests of
  earlier features that read her own talk to its end press once more (Task 4).
- **The architecture test** has one test per file of `src/game/`: the new `card.ts` adds one
  test to the count of Task 2.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`.
- What is out of the spec is not built: no title screen, no menu, no logo, no line about
  Harmonic on the card, no credits, imprint or licence text, no fourth line that names
  Harmonic, nothing in the world that carries a name, no sound.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox; if signing fails, retry once, then stop and ask — never
  pass `--no-gpg-sign`), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`. Do not stop a dev server that is
  not yours. Push nothing before the walk has passed.
- The numbers, verbatim from the spec: `CARD_STEPS` 180; the presenter's line with its top at
  y = 74, the title at y = 94; a line of n characters starts at x = 160 − 3n — the
  presenter's at 112 in German and 121 in English, the title at 133; the background
  `#181425`; a page of talk has at most three lines of at most 47 characters.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | three keys: `card.presents`, `card.title`, `talk.officer-rules-3`; new words for `talk.sales-after` and `story.close-2` |
| `src/game/card.ts` | new: `CARD_PRESENTS`, `CARD_TITLE`, `CARD_STEPS`, `cardShown`, `stepCard` |
| `src/game/state.ts` | `GameState.presented` |
| `src/game/update.ts` | `presented` 0 in the initial state and `null` in a new game; the card's step first |
| `src/game/overview.ts` | the wake keeps `presented` |
| `src/game/cast.ts` | the officer's third page |
| `src/render/draw-card.ts` | new: `CARD_PRESENTS_Y`, `CARD_TITLE_Y`, `centredX`, `drawCard` |
| `src/render/draw-scene.ts` | the card's frame |
| `tests/unit/card.test.ts` | new |
| other `tests/unit/*.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 5 |

---

### Task 1: The words of the card

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `card.presents` and `card.title`, in both languages.

- [x] **Step 1: Write the failing tests:**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -278,8 +278,40 @@
       'before it leaves the house.',
       'Image or text – rather once too often.',
     ]);
+  });
+
+  it('holds the two lines of the card in both languages (0036)', () => {
+    const both = (id: Parameters<typeof textKey>[0]): string[] => [
+      textOf(textKey(id), 'de'),
+      textOf(textKey(id), 'en'),
+    ];
+    expect(both('card.presents')).toStrictEqual(['LMIS präsentiert', 'LMIS presents']);
+    expect(both('card.title')).toStrictEqual(['Shadow AI', 'Shadow AI']);
+  });
+
+  it('keeps each line of the card on one line that fits the surface (0036)', () => {
+    const ids = Object.keys(TABLE.de).filter((id) => id.startsWith('card.'));
+    expect(ids).toStrictEqual(['card.presents', 'card.title']);
+    for (const language of LANGUAGES) {
+      for (const id of ['card.presents', 'card.title'] as const) {
+        const text = TABLE[language][id];
+        expect(text.includes('\n'), `${language} ${id}`).toBe(false);
+        // 320 px of surface, 6 px a character.
+        expect(text.length, `${language} ${id}`).toBeLessThanOrEqual(53);
+      }
+    }
   });
 
+  it('names the presenter on the card and nowhere else (0036)', () => {
+    for (const language of LANGUAGES) {
+      const named = Object.entries(TABLE[language])
+        .filter(([, text]) => text.toLowerCase().includes('lmis'))
+        .map(([id]) => id);
+      // No page of a figure, no notice and no entry of the journal names who presents the game.
+      expect(named, language).toStrictEqual(['card.presents']);
+    }
+  });
+
   it('holds the three pages of the close in both languages (0034)', () => {
     const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
       textOf(textKey(id), language).split('\n');
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 3 of 31
  tests. `npx tsc --noEmit` reports three errors, all in this test: the two ids are not ids
  of the table yet.

- [x] **Step 3: The words,** at the end of both tables:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -197,4 +197,6 @@
     'klingen, als hätte ich eine Woche Zeit gehabt.',
     'Erst mal Kaffee.',
   ].join('\n'),
+  'card.presents': 'LMIS präsentiert',
+  'card.title': 'Shadow AI',
 } as const;
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -193,4 +193,6 @@
     'sound as if I had had a week for it.',
     'Coffee first.',
   ].join('\n'),
+  'card.presents': 'LMIS presents',
+  'card.title': 'Shadow AI',
 };
```

- [x] **Step 4: Run** `npx vitest run tests/unit/text.test.ts` — green; the test that every
  character of both tables has a glyph covers the two lines. Then `npm run check`: 1563 unit
  tests.

- [x] **Step 5: Commit** — `Add the words of the card`. Body: the presenter's name stands in
  one key and a test keeps it out of every other, because LMIS presents the game and is
  nowhere in its world (`vision.md` §10).

---

### Task 2: The state and the step

**Files:**
- Create: `src/game/card.ts`, `tests/unit/card.test.ts`
- Modify: `src/game/state.ts`, `src/game/update.ts`, `src/game/overview.ts`
- Test: `tests/unit/opening.test.ts`, `tests/unit/rest.test.ts`, `tests/unit/notice.test.ts`,
  `tests/unit/hints.test.ts`, the five files with a full literal of the state,
  `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: the text ids of Task 1; `pressed` and `GameInput` of `game/player`.
- Produces: `GameState.presented: number | null`; `CARD_PRESENTS`, `CARD_TITLE`: `TextKey`;
  `CARD_STEPS = 180`; `cardShown(state): boolean`; `stepCard(state, input): GameState`.

After this task a new game steps the card, but the scene still draws the world and the call
under it: the card is drawn in Task 3.

- [x] **Step 1: The field in every full literal of the state.** Ten literals in five files
  get `presented: 0,` after `finished: null,`:

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -98,6 +98,7 @@
   tick: 700,
   rested: null,
   finished: null,
+  presented: 0,
   upgrades: [],
   player: {
     x: 184,
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -93,6 +93,7 @@
   tick: 100,
   rested: null,
   finished: null,
+  presented: 0,
   upgrades: [],
   player: {
     x: 160,
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -199,6 +199,7 @@
   tick: QUIET_TICK,
   rested: null,
   finished: null,
+  presented: 0,
   upgrades: [],
   player: player(fields),
   camera,
```

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -164,6 +164,7 @@
     tick: 500,
     rested: null,
     finished: null,
+    presented: 0,
     upgrades: [],
     player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
     camera: { x: 140, y: 106 },
@@ -196,6 +197,7 @@
       tick: 543,
       rested: null,
       finished: null,
+      presented: 0,
       upgrades: [],
       lamp: { on: false, strength: 1, owned: true, used: true },
       dark: 44,
@@ -209,6 +211,7 @@
       tick: 544,
       rested: null,
       finished: null,
+      presented: 0,
       upgrades: [],
       player,
       camera: followPlayer(player, MAP),
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -89,6 +89,7 @@
       tick: 0,
       rested: null,
       finished: null,
+      presented: 0,
       upgrades: [],
       player: {
         x: 136,
@@ -160,6 +161,7 @@
         tick: 41,
         rested: null,
         finished: null,
+        presented: 0,
         upgrades: [],
         player,
         camera: { x: 0, y: 12 },
@@ -191,6 +193,7 @@
       tick: 7,
       rested: null,
       finished: null,
+      presented: 0,
       upgrades: [],
       player,
       camera: { x: 0, y: 12 },
@@ -214,6 +217,7 @@
       tick: 7,
       rested: null,
       finished: null,
+      presented: 0,
       upgrades: [],
       player,
       camera: { x: 0, y: 12 },
```

- [x] **Step 2: The tests of the card.** Create `tests/unit/card.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { TileMap } from '../../src/engine/tiled';
import { CARD_PRESENTS, CARD_STEPS, CARD_TITLE, cardShown, stepCard } from '../../src/game/card';
import { CASES } from '../../src/game/cases';
import { CAST, COLLEAGUES, FIRST_MEETING } from '../../src/game/cast';
import { HINTS } from '../../src/game/hints';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { GameState } from '../../src/game/state';
import { SCENES } from '../../src/game/story';
import { createInitialState, newGame, update } from '../../src/game/update';
import { REGIONS, UPGRADES } from '../../src/game/world';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
/** Every key but `talk`. */
const OTHERS: GameInput = {
  up: true,
  down: false,
  left: true,
  right: false,
  lamp: true,
  talk: false,
  journal: true,
  help: true,
};
/** 20x12 cells of open floor, the officer 24 px right of the spawn. */
const MAP: TileMap = grassMap(20, 12, { x: 136, y: 96 }, [
  { name: 'figure:officer', x: 160, y: 96 },
]);
const steps = (start: GameState, input: GameInput, count: number): GameState => {
  let state = start;
  for (let i = 0; i < count; i += 1) {
    state = update(state, input, MAP);
  }
  return state;
};
const CALL = { speaker: 'story', index: 0 } as const;

describe('the card a game opens with (0036)', () => {
  const start = newGame(MAP);

  it('has two lines and three seconds', () => {
    expect(CARD_PRESENTS).toBe(textKey('card.presents'));
    expect(CARD_TITLE).toBe(textKey('card.title'));
    expect(CARD_STEPS).toBe(180);
  });

  it('is shown in a new game and not in a game past its opening', () => {
    expect(start.presented).toBeNull();
    expect(cardShown(start)).toBe(true);
    expect(createInitialState(MAP).presented).toBe(0);
    expect(cardShown(createInitialState(MAP))).toBe(false);
  });

  it('survives a JSON round trip while it is shown and after it (INV-1)', () => {
    for (const state of [start, steps(start, NONE, 90), update(start, TALK, MAP)]) {
      expect('presented' in state).toBe(true);
      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    }
  });

  it('stays for 179 steps without a press and changes nothing but the tick', () => {
    let state = start;
    for (let n = 1; n < 180; n += 1) {
      state = update(state, NONE, MAP);
      expect(state, `step ${n}`).toStrictEqual({ ...start, tick: n });
    }
  });

  it('ends by itself in step 180', () => {
    const ended = steps(start, NONE, 180);
    expect(ended).toStrictEqual({ ...start, tick: 180, presented: 180 });
    expect(cardShown(ended)).toBe(false);
  });

  it.each([1, 37, 179])('ends at a press of talk in step %i', (n) => {
    const ended = update(steps(start, NONE, n - 1), TALK, MAP);
    expect(ended).toStrictEqual({ ...start, tick: n, held: TALK, presented: n });
  });

  it('does not end at a key that was held before: only a press ends it', () => {
    const held: GameState = { ...start, held: TALK };
    expect(update(held, TALK, MAP).presented).toBeNull();
    expect(update(update(held, NONE, MAP), TALK, MAP).presented).toBe(2);
  });

  it('takes no other key: help, journal, lamp and the directions change nothing but `held`', () => {
    const pressed = steps(start, OTHERS, 100);
    expect(pressed).toStrictEqual({ ...start, tick: 100, held: OTHERS });
    expect(stepCard(start, OTHERS)).toStrictEqual({ ...start, tick: 1, held: OTHERS });
  });

  it('gives way to the call on its first page: the press that ended it does not turn the page', () => {
    const ended = update(start, TALK, MAP);
    expect(ended.dialogue).toStrictEqual({ ...CALL, page: 0 });
    // Still held: a held key is no second press (0020).
    const held = steps(ended, TALK, 30);
    expect(held.dialogue).toStrictEqual({ ...CALL, page: 0 });
    expect(held.presented).toBe(1);
    // Let go and pressed again, it turns the page.
    const turned = update(update(held, NONE, MAP), TALK, MAP);
    expect(turned.dialogue).toStrictEqual({ ...CALL, page: 1 });
  });

  it('gives way to the call when it ended by itself too, and a press turns the page', () => {
    const ended = steps(start, NONE, 180);
    expect(ended.dialogue).toStrictEqual({ ...CALL, page: 0 });
    expect(update(ended, TALK, MAP).dialogue).toStrictEqual({ ...CALL, page: 1 });
  });

  it('never comes back: later steps and the wake keep `presented`', () => {
    const read = [TALK, NONE, TALK, NONE, TALK, NONE, TALK].reduce(
      (state, input) => update(state, input, MAP),
      start,
    );
    expect(read.dialogue).toBeNull();
    expect(read.presented).toBe(1);
    expect(steps(read, NONE, 600).presented).toBe(1);
    // The 44th step of the dark is the wake (0009).
    const woken = update({ ...read, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.presented).toBe(1);
  });

  it('is never seen by a game past its opening: its first step is an ordinary step', () => {
    const first = update(createInitialState(MAP), { ...NONE, right: true }, MAP);
    expect(first.presented).toBe(0);
    expect(first.player.x).toBeGreaterThan(136);
  });

  it('is the only place of the presenter: no table of the world data holds either name', () => {
    const world = JSON.stringify([
      REGIONS,
      UPGRADES,
      CAST,
      FIRST_MEETING,
      COLLEAGUES,
      CASES,
      SCENES,
      HINTS,
    ]);
    // The cast, the cases and the scenes hold keys, never words: LMIS is on the card alone,
    // and Harmonic is a word in three pages of talk (vision.md §10).
    expect(world.toLowerCase().includes('lmis')).toBe(false);
    expect(world.toLowerCase().includes('harmonic')).toBe(false);
  });
});
```

- [x] **Step 3: The tests of 0026 start past the card,** and one new test plays card, call
  and first meeting in a row:

```diff
--- a/tests/unit/opening.test.ts
+++ b/tests/unit/opening.test.ts
@@ -42,8 +42,13 @@
   }
   return state;
 };
+/**
+ * The new game past its card (0036): the call open on its first page, as a game began when
+ * these tests were written. The card has its own tests.
+ */
+const opening = (map: TileMap): GameState => ({ ...newGame(map), presented: 0 });
 /** The new game with the call read to its end: five steps, three presses. */
-const called = (map: TileMap): GameState => run(map, newGame(map), TALK, NONE, TALK, NONE, TALK);
+const called = (map: TileMap): GameState => run(map, opening(map), TALK, NONE, TALK, NONE, TALK);
 /** The pages of the state's open dialogue, as `update` and the scene look them up. */
 const spoken = (map: TileMap, state: GameState) =>
   state.dialogue === null
@@ -54,11 +59,12 @@
       );
 
 describe('the two starts (0026)', () => {
-  it('starts a played game with the call open and without the lamp', () => {
+  it('starts a played game with the card, the call open under it, and without the lamp', () => {
     expect(newGame(MAP)).toStrictEqual({
       ...createInitialState(MAP),
       lamp: { on: false, strength: 1, owned: false, used: false },
       dialogue: { speaker: 'story', index: 0, page: 0 },
+      presented: null,
     });
   });
 
@@ -69,7 +75,7 @@
   });
 
   it('survives a JSON round trip: at the start, on page 2 of the call, after the first meeting (INV-1)', () => {
-    const start = newGame(MAP);
+    const start = opening(MAP);
     const second = run(MAP, start, TALK, NONE, TALK);
     const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
     expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 2 });
@@ -82,7 +88,7 @@
 
 describe('the call (0026)', () => {
   it('shows its pages one by one and closes with the third press', () => {
-    const start = newGame(MAP);
+    const start = opening(MAP);
     expect(spoken(MAP, start)).toStrictEqual(CALL);
     const pages: (number | null)[] = [];
     let state = start;
@@ -94,13 +100,13 @@
   });
 
   it('stands still for 600 steps with every key but talk held: only the tick and the held keys change', () => {
-    const start = newGame(MAP);
+    const start = opening(MAP);
     const later = steps(MAP, start, OTHERS, 600);
     expect(later).toStrictEqual({ ...start, tick: 600, held: OTHERS });
   });
 
   it('turns nobody: the figure, the colleague and the player look where they looked', () => {
-    const start = newGame(MAP);
+    const start = opening(MAP);
     const closed = called(MAP);
     expect(closed.dialogue).toBeNull();
     expect(closed.figures).toStrictEqual(start.figures);
@@ -109,13 +115,13 @@
   });
 
   it('is not the dialogue of the figure or the colleague in reach', () => {
-    const second = run(MAP, newGame(MAP), TALK);
+    const second = run(MAP, opening(MAP), TALK);
     expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 1 });
     expect(spoken(MAP, second)).toStrictEqual(CALL);
   });
 
   it('changes nothing but tick, held and dialogue, also in the step that closes it (0031)', () => {
-    const start = newGame(MAP);
+    const start = opening(MAP);
     const closed = called(MAP);
     expect(closed).toStrictEqual({ ...start, tick: 5, held: TALK, dialogue: null });
   });
@@ -136,7 +142,7 @@
     expect(woken.dark).toBe(45);
     for (const state of [
       createInitialState(MAP),
-      newGame(MAP),
+      opening(MAP),
       closed,
       steps(MAP, closed, RIGHT, 600),
       met,
@@ -336,3 +342,26 @@
     expect(during.lamp.used).toBe(false);
   });
 });
+
+describe('card, call and first meeting in a row (0036)', () => {
+  it('goes from the card through the call to the lamp, one press each', () => {
+    let state = newGame(MAP);
+    expect(state.presented).toBeNull();
+    // The press that ends the card.
+    state = update(state, TALK, MAP);
+    expect(state.presented).toBe(1);
+    expect(spoken(MAP, state)).toStrictEqual(CALL);
+    expect(state.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 0 });
+    // Three presses read the call.
+    state = run(MAP, state, NONE, TALK, NONE, TALK, NONE, TALK);
+    expect(state.dialogue).toBeNull();
+    expect(state.lamp.owned).toBe(false);
+    // Three more are the first meeting: the lamp is handed over.
+    state = run(MAP, state, NONE, TALK, NONE, TALK, NONE, TALK);
+    expect(state.dialogue).toBeNull();
+    expect(state.lamp.owned).toBe(true);
+    // The same game as one that began past the card, two steps later.
+    const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
+    expect(state).toStrictEqual({ ...met, tick: met.tick + 2, presented: 1 });
+  });
+});
```

```diff
--- a/tests/unit/rest.test.ts
+++ b/tests/unit/rest.test.ts
@@ -314,7 +314,9 @@
   });
 
   it('is taken with Space held by a player who has no lamp: there is none to hold (0026)', () => {
-    const called = run(OPEN, newGame(OPEN), TALK, NONE, TALK, NONE, TALK, NONE);
+    // Past the card (0036): the first press turns the page of the call.
+    const past: GameState = { ...newGame(OPEN), presented: 0 };
+    const called = run(OPEN, past, TALK, NONE, TALK, NONE, TALK, NONE);
     expect(called.lamp.owned).toBe(false);
     const drunk = update(called, { ...TALK, lamp: true }, OPEN);
     expect(drunk.rested).toStrictEqual({ at: called.tick + 1, result: 'full' });
```

```diff
--- a/tests/unit/notice.test.ts
+++ b/tests/unit/notice.test.ts
@@ -115,7 +115,8 @@
   const map = grassMap(20, 12, { x: 136, y: 96 }, [{ name: 'figure:officer', x: 160, y: 96 }]);
   const run = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
     inputs.reduce((state, input) => update(state, input, map), start);
-  const called = run(newGame(map), TALK, NONE, TALK, NONE, TALK);
+  // Past the card (0036): the first press turns the page of the call.
+  const called = run({ ...newGame(map), presented: 0 }, TALK, NONE, TALK, NONE, TALK);
   const met = run(called, NONE, TALK, NONE, TALK, NONE, TALK);
 
   it('is the key `notice.lamp`', () => {
```

```diff
--- a/tests/unit/hints.test.ts
+++ b/tests/unit/hints.test.ts
@@ -191,7 +191,8 @@
   });
 
   it('says the page of the lamp in a game that has none, and the officer the first meeting', () => {
-    const without = newGame(MAP);
+    // Past the card (0036).
+    const without: GameState = { ...newGame(MAP), presented: 0 };
     expect(pagesIn(without)).toStrictEqual({
       intern: [HINT_LAMP],
       officer: FIRST_MEETING.pages,
```

- [x] **Step 4: The smoke helper** ends the card before it reads the call:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -53,13 +53,30 @@
 /** The call on its page, as the state holds it (0026). */
 const call = (page: number) => ({ speaker: 'story', index: 0, page });
 
+/** Waits until the state has seen E let go, so that the next press is a press. */
+async function letGo(page: Page): Promise<void> {
+  await page.keyboard.up('KeyE');
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.held.talk), {
+      message: 'E was let go',
+    })
+    .toBe(false);
+}
+
 /**
- * Loads the game and reads the call to its end (0026): three presses of E. The game reads the
- * held keys once per frame, so a key stays down until the state shows the page it turned to, and
- * the next press waits until the state has seen the key let go.
+ * Loads the game, ends the card with one press of E (0036) and reads the call to its end
+ * (0026): three more. The game reads the held keys once per frame, so a key stays down until
+ * the state shows what it did, and the next press waits until the state has seen the key let go.
  */
 async function start(page: Page): Promise<void> {
   await page.goto('/');
+  const presented = () => page.evaluate(() => window.shadowAi?.state.presented);
+  await expect.poll(presented, { message: 'the game opens with the card' }).toBeNull();
+  await page.keyboard.down('KeyE');
+  await expect
+    .poll(async () => typeof (await presented()), { message: 'E ends the card' })
+    .toBe('number');
+  await letGo(page);
   const dialogue = () => page.evaluate(() => window.shadowAi?.state.dialogue);
   await expect
     .poll(dialogue, { message: 'the game opens with the call on its first page' })
@@ -67,12 +84,7 @@
   for (const next of [call(1), call(2), null]) {
     await page.keyboard.down('KeyE');
     await expect.poll(dialogue, { message: 'E turns the page of the call' }).toStrictEqual(next);
-    await page.keyboard.up('KeyE');
-    await expect
-      .poll(() => page.evaluate(() => window.shadowAi?.state.held.talk), {
-        message: 'E was let go',
-      })
-      .toBe(false);
+    await letGo(page);
   }
 }
 
```

- [x] **Step 5: Run** `npx tsc --noEmit` — 23 errors, in the files of Steps 1 to 4: the field
  and the module do not exist yet. Run `npx vitest run`. Expected: `card.test.ts` does not
  load, and four tests fail: `the 44th step, dark 45, sets the world right` (overview),
  `starts a played game with the card, the call open under it, and without the lamp` and
  `goes from the card through the call to the lamp, one press each` (opening), and `starts at
  tick 0 with the player at the spawn, facing down, standing, the camera on it` (state). With
  a dev server running, `npx playwright test -g "the close not closed"` fails in the helper:
  `the game opens with the card`, `Received: undefined`.

- [x] **Step 6: The card.** Create `src/game/card.ts`:

```ts
import { type TextKey, textKey } from '../text/text';
import { type GameInput, pressed } from './player';
import type { GameState } from './state';

/**
 * The card a game opens with (vision.md §10, feature 0036): two lines on an empty screen that
 * say who presents the game — the stand-in for the title screen of M8. It is shown while
 * `presented` is null, and ends by itself or at a press of `talk`. Pure data and pure
 * functions.
 */

/** The presenter's line. */
export const CARD_PRESENTS: TextKey = textKey('card.presents');
/** The title of the game. */
export const CARD_TITLE: TextKey = textKey('card.title');
/** Tune: three seconds. The card ends in the step with which it has been shown this long. */
export const CARD_STEPS = 180;

/** Whether the card is shown: it has not ended yet. */
export function cardShown(state: GameState): boolean {
  return state.presented === null;
}

/**
 * One step of the card: the tick grows and the input is remembered, and nothing of the world
 * is stepped. A press of `talk`, or the step with which the card has been shown for
 * CARD_STEPS, ends it: `presented` becomes the tick of that step. No other key does anything.
 */
export function stepCard(state: GameState, input: GameInput): GameState {
  const tick = state.tick + 1;
  const ends = pressed(state.held, input, 'talk') || tick >= CARD_STEPS;
  return { ...state, tick, held: input, presented: ends ? tick : null };
}
```

- [x] **Step 7: The state:**

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -207,6 +207,11 @@
    * (0034). It opens once.
    */
   readonly finished: number | null;
+  /**
+   * The tick of the step in which the card ended — the card a game opens with — or null while
+   * it is shown (0036). A game past its opening has 0.
+   */
+  readonly presented: number | null;
   /** The standing figures of the map, in file order (0017). */
   readonly figures: readonly FigureState[];
   /** The dialogue that is open, or null. While it is open nothing else is stepped (0017). */
```

- [x] **Step 8: The step.** The initial state is past the card, a new game is not, and
  `update` gives the step to the card first:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -1,5 +1,6 @@
 import type { TileMap } from '../engine/tiled';
 import { followPlayer } from './camera';
+import { cardShown, stepCard } from './card';
 import { answeredCase, clearRegion, earn, progressOf, solve } from './cases';
 import { figuresFrom, figuresIn, figuresOf, isFirstMeeting } from './cast';
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
@@ -33,8 +34,8 @@
  * every standing figure of the map facing down and no dialogue (0017); the journal closed and
  * no key remembered (0020); the help closed (0021); every trace of the map unseen and not found
  * (0022); no case solved (0024); no upgrade earned (0029). It is a game past its opening
- * (0026): the lamp is owned and was used, no scene is open, and the opening ended at tick 0;
- * `newGame` is the state a player starts with.
+ * (0026): the lamp is owned and was used, no scene is open, and the card ended at tick 0
+ * (0036); `newGame` is the state a player starts with.
  * A map with two wake points, a route that is malformed or crosses a solid tile, a
  * rectangle of no known kind, a shadow wall or a trace the world data or the grid refuses, an
  * area of a region the world data does not know or of a box that is not whole cells (0023), or
@@ -72,6 +73,7 @@
     solved: [],
     rested: null,
     finished: null,
+    presented: 0,
     figures: figuresFrom(figures),
     dialogue: null,
     journal: null,
@@ -85,14 +87,16 @@
 
 /**
  * The state a played game starts with (0026): the initial state with the call open on its
- * first page and the lamp not yet owned. `main.ts` starts with it; the tests of the earlier
- * features step from `createInitialState`.
+ * first page and the lamp not yet owned — and, before the call, the card that says who
+ * presents the game (0036). `main.ts` starts with it; the tests of the earlier features step
+ * from `createInitialState`.
  */
 export function newGame(map: TileMap): GameState {
   return {
     ...createInitialState(map),
     lamp: { on: false, strength: BASE_STRENGTH, owned: false, used: false },
     dialogue: { speaker: 'story', index: OPENING_SCENE, page: 0 },
+    presented: null,
   };
 }
 
@@ -128,7 +132,8 @@
 
 /**
  * Advances the game by exactly one logic step and returns the new state; its arguments are not
- * mutated. In the dark the step is the dark sequence and nothing else (0009). With the help open
+ * mutated. While the card is shown the step is the card's and nothing else (0036, game/card).
+ * In the dark the step is the dark sequence and nothing else (0009). With the help open
  * the step is the help's and nothing else, and a press of `help` opens it over whatever is there
  * — an open journal and an open dialogue too (0021). With the journal open the step is the
  * journal's and nothing else (0020). With a dialogue open — a speaker's or a scene's (0026) —
@@ -152,6 +157,9 @@
  * that the next step can tell a press from a held key (0017, 0020).
  */
 export function update(state: GameState, input: GameInput, content: TileMap): GameState {
+  if (cardShown(state)) {
+    return stepCard(state, input);
+  }
   if (state.dark > 0) {
     return { ...stepDark(state, content), held: input };
   }
@@ -243,6 +251,7 @@
     solved: state.solved,
     rested,
     finished: state.finished,
+    presented: state.presented,
     figures: state.figures,
     dialogue: null,
     journal: null,
```

- [x] **Step 9: The wake keeps it:**

```diff
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -147,6 +147,7 @@
     solved: state.solved,
     rested: state.rested,
     finished: state.finished,
+    presented: state.presented,
     figures: state.figures,
     dialogue: null,
     journal: null,
```

- [x] **Step 10: Run** `npm run check` — 1580 unit tests: 15 in `card.test.ts`, one more in
  `opening.test.ts`, and one of the architecture test for the new file. Then
  `npm run test:e2e`: 19 passed, 3 skipped.

- [x] **Step 11: Commit** — `Step the card before the call`. Body: a new game waits three
  seconds or for a press before the call; the state holds the tick in which the card ended,
  so the wake keeps it and the card never comes back.

---

### Task 3: The card in the scene

**Files:**
- Create: `src/render/draw-card.ts`
- Modify: `src/render/draw-scene.ts`
- Test: `tests/unit/draw-scene.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `cardShown`, `CARD_PRESENTS`, `CARD_TITLE` of Task 2.
- Produces: `CARD_PRESENTS_Y = 74`, `CARD_TITLE_Y = 94`, `centredX(length): number`,
  `drawCard(renderer, font, language)`.

- [x] **Step 1: Write the failing tests:**

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -11,6 +11,7 @@
   type PlayerState,
   type ShadowWallState,
 } from '../../src/game/state';
+import { CARD_PRESENTS_Y, CARD_TITLE_Y, centredX } from '../../src/render/draw-card';
 import { drawHelpLabel, HELP_LABEL, helpLabelPlace } from '../../src/render/draw-help';
 import {
   creatureFrame,
@@ -47,7 +48,7 @@
   wallLook,
   wallSegments,
 } from '../../src/render/draw-scene';
-import { GLYPH_WIDTH } from '../../src/render/font';
+import { GLYPH_WIDTH, glyphIndex } from '../../src/render/font';
 import type { Renderer, SpriteSheet } from '../../src/render/renderer';
 import { LANGUAGES, TABLE, textOf } from '../../src/text/text';
 import { grassMap } from './grass-map';
@@ -2051,5 +2052,80 @@
 
   it('draws no page beyond the third', () => {
     expect(firstGlyph(closing(3))).toBeUndefined();
+  });
+});
+
+describe('the card in the scene (0036)', () => {
+  /** A new game as the scene gets it: the card shown, the call open under it, no lamp. */
+  const card = (fields: Partial<GameState> = {}): GameState => ({
+    ...state({ x: 8, y: 8 }),
+    lamp: { on: false, strength: 1, owned: false, used: false },
+    dialogue: { speaker: 'story', index: 0, page: 0 },
+    presented: null,
+    ...fields,
+  });
+  /** The calls that draw `text` from (x, y): one sprite per character that is no space. */
+  const line = (text: string, x: number, y: number): string[] =>
+    [...text].flatMap((character, i) =>
+      character === ' '
+        ? []
+        : [`drawSprite ${glyphIndex(character)} at ${x + i * GLYPH_WIDTH},${y}`],
+    );
+  const drawn = (scene: GameState, settings: SceneSettings = GERMAN) => {
+    const renderer = recordingRenderer();
+    // The whole scene, the help label included: the card has none.
+    drawSceneWith(renderer, scene, CONTENT, settings);
+    return renderer;
+  };
+
+  it('puts the presenter at y = 74 and the title at y = 94, each centred on the 320 px', () => {
+    expect([CARD_PRESENTS_Y, CARD_TITLE_Y]).toStrictEqual([74, 94]);
+    expect([16, 13, 9].map(centredX)).toStrictEqual([112, 121, 133]);
+  });
+
+  it('draws the clear and the two lines and nothing else, in German', () => {
+    const renderer = drawn(card());
+    expect(renderer.calls).toStrictEqual([
+      'clear #181425',
+      ...line('LMIS präsentiert', 112, 74),
+      ...line('Shadow AI', 133, 94),
+    ]);
+    // `L` is glyph 44 and `S` glyph 51: each line starts where the spec puts it.
+    expect(renderer.calls[1]).toBe('drawSprite 44 at 112,74');
+    expect(renderer.calls[16]).toBe('drawSprite 51 at 133,94');
+    expect(renderer.sheets.every((sheet) => sheet === CONTENT.fontSheet)).toBe(true);
+    expect(renderer.tilesets).toStrictEqual([]);
   });
+
+  it('draws the presenter from x = 121 in English, and the title where it was', () => {
+    const renderer = drawn(card(), ENGLISH);
+    expect(renderer.calls).toStrictEqual([
+      'clear #181425',
+      ...line('LMIS presents', 121, 74),
+      ...line('Shadow AI', 133, 94),
+    ]);
+    expect(renderer.calls[1]).toBe('drawSprite 44 at 121,74');
+    expect(renderer.calls[13]).toBe('drawSprite 51 at 133,94');
+  });
+
+  it('shows nothing of the world whatever the state holds: no heart, no label, no box, no bar', () => {
+    const plain = drawn(card()).calls;
+    // The language was switched in this step: its line is not on the card either.
+    expect(drawn(card(), { language: 'de', switchedAt: QUIET_TICK }).calls).toStrictEqual(plain);
+    expect(drawn(card({ help: true })).calls).toStrictEqual(plain);
+    expect(drawn(card({ journal: { tab: 'creatures' } })).calls).toStrictEqual(plain);
+    expect(drawn(card({ overview: { current: 1, max: 5 } })).calls).toStrictEqual(plain);
+    expect(plain.some((call) => call.startsWith('fillRect'))).toBe(false);
+  });
+
+  it('gives way to the world in the frame after it: the map, and the call in its box', () => {
+    const renderer = drawn(card({ presented: 1 }));
+    expect(renderer.calls[0]).toBe('clear #181425');
+    expect(renderer.tilesets.length).toBeGreaterThan(0);
+    const box = `fillRect ${DIALOGUE_BOX.x},${DIALOGUE_BOX.y} ${DIALOGUE_BOX.width}x${DIALOGUE_BOX.height} #181425`;
+    expect(renderer.calls).toContain(box);
+    // The first letter of the call, `M`, where a page starts.
+    expect(renderer.calls).toContain(`drawSprite 45 at ${DIALOGUE_TEXT.x},${DIALOGUE_TEXT.y}`);
+    expect(renderer.calls.some((call) => call.endsWith(' at 112,74'))).toBe(false);
+  });
 });
```

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -474,3 +474,54 @@
     })
     .toBeNull();
 });
+
+test('the game opens with the card of its presenter, and a press of E goes on to the call', async ({
+  page,
+}) => {
+  await page.goto('/');
+  const shown = () =>
+    page.evaluate(() => {
+      const state = window.shadowAi?.state;
+      return state === undefined
+        ? undefined
+        : { presented: state.presented === null ? null : 'ended', dialogue: state.dialogue };
+    });
+  // One poll for the whole value: nothing is read from a page that might still be loading.
+  await expect
+    .poll(shown, { message: 'a new game: the card is shown, the call waits under it' })
+    .toStrictEqual({ presented: null, dialogue: call(0) });
+  const canvas = page.locator('canvas#game');
+  /** The game pixel (0, 0), and how many pixels of the dialogue box are not background. */
+  const drawn = () =>
+    canvas.evaluate((element: HTMLCanvasElement) => {
+      // Desktop Chrome in Playwright draws at factor 4; the box is (8, 134, 304, 42).
+      const context = element.getContext('2d');
+      const box = context?.getImageData(32, 536, 1216, 168).data ?? [];
+      let ink = 0;
+      for (let i = 0; i < box.length; i += 4) {
+        if (box[i] !== 0x18 || box[i + 1] !== 0x14 || box[i + 2] !== 0x25) {
+          ink += 1;
+        }
+      }
+      return { corner: Array.from(context?.getImageData(0, 0, 1, 1).data ?? []), ink };
+    });
+  await expect
+    .poll(drawn, { message: 'the card: no map in the corner, no page of the call drawn' })
+    .toStrictEqual({ corner: [0x18, 0x14, 0x25, 255], ink: 0 });
+  await page.keyboard.down('KeyE');
+  await expect
+    .poll(shown, { message: 'E ends the card; the press does not turn the page of the call' })
+    .toStrictEqual({ presented: 'ended', dialogue: call(0) });
+  await expect
+    .poll(async () => (await drawn()).ink, { message: 'the call is drawn in its box' })
+    .toBeGreaterThan(0);
+  expect((await drawn()).corner).toStrictEqual([0x8b, 0x9b, 0xb4, 255]);
+  // Still held, E turns nothing: the call stays on its first page.
+  expect((await shown())?.dialogue).toStrictEqual(call(0));
+  await letGo(page);
+  await page.keyboard.down('KeyE');
+  await expect
+    .poll(async () => (await shown())?.dialogue, { message: 'a new press turns the page' })
+    .toStrictEqual(call(1));
+  await page.keyboard.up('KeyE');
+});
```

- [x] **Step 2: Run them.** `npx tsc --noEmit` reports one error: `draw-card` does not exist.
  `npx vitest run tests/unit/draw-scene.test.ts` does not load. With a dev server running,
  `npx playwright test -g "card of its presenter"` fails at `the card: no map in the corner,
  no page of the call drawn` — the corner is carpet and the box holds the call.

- [x] **Step 3: The card.** Create `src/render/draw-card.ts`:

```ts
import { CARD_PRESENTS, CARD_TITLE } from '../game/card';
import { type Language, textOf } from '../text/text';
import { drawText } from './draw-text';
import { GLYPH_WIDTH } from './font';
import { PAGE_BACKGROUND } from './palette';
import { type Renderer, type SpriteSheet, SURFACE_WIDTH } from './renderer';

/**
 * The card a game opens with (vision.md §10, visual.md §3, feature 0036): the page background
 * and two centred lines in the game's font — who presents the game, and its title. Nothing of
 * the world is on it: no tile, no figure, no heart, no label, no bar.
 */

/** The top of the presenter's line. */
export const CARD_PRESENTS_Y = 74;
/** The top of the title, 20 px below. */
export const CARD_TITLE_Y = 94;

/** Where a line of `length` characters starts so that it is centred on the surface: 160 − 3n. */
export function centredX(length: number): number {
  return SURFACE_WIDTH / 2 - (length * GLYPH_WIDTH) / 2;
}

export function drawCard(renderer: Renderer, font: SpriteSheet, language: Language): void {
  renderer.clear(PAGE_BACKGROUND);
  for (const [key, y] of [
    [CARD_PRESENTS, CARD_PRESENTS_Y],
    [CARD_TITLE, CARD_TITLE_Y],
  ] as const) {
    drawText(renderer, font, key, language, centredX(textOf(key, language).length), y);
  }
}
```

- [x] **Step 4: The scene** draws the card alone while it is shown:

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -1,5 +1,6 @@
 import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
 import { type Box, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
+import { cardShown } from '../game/card';
 import { progressOf } from '../game/cases';
 import { type Figure, figuresIn, figuresOf } from '../game/cast';
 import { CREATURE_SIZE, HABITS, isWatched } from '../game/creature';
@@ -26,6 +27,7 @@
 import { pagesOf, speakersOf } from '../game/talk';
 import { FIND_STEPS, tracesOf } from '../game/trace';
 import { type Language, type TextKey, textKey, textOf } from '../text/text';
+import { drawCard } from './draw-card';
 import { drawHelp, drawHelpLabel } from './draw-help';
 import { drawJournal } from './draw-journal';
 import { drawLayer, drawVeil, type Shadow } from './draw-map';
@@ -376,6 +378,7 @@
  * label.
  * While the help is open (0021, render/draw-help) its box is drawn last but for the lids, over
  * the world and over the journal alike, and the bar does not show the language line.
+ * While the card is shown the frame is the card's alone (0036, render/draw-card).
  */
 export function drawScene(
   renderer: Renderer,
@@ -383,6 +386,10 @@
   content: SceneContent,
   settings: SceneSettings,
 ): void {
+  if (cardShown(state)) {
+    drawCard(renderer, content.fontSheet, settings.language);
+    return;
+  }
   if (state.journal !== null) {
     drawJournal(renderer, state, state.journal, content, settings);
     if (state.help) {
```

- [x] **Step 5: Run** `npm run check`: 1585 unit tests, and `npm run test:e2e` twice: 20
  passed, 3 skipped, both times.

- [x] **Step 6: Commit** — `Draw the card and nothing of the world under it`. Body: two
  centred lines on the page colour, in the game's own font and the language of the
  settings; a name, never a logo.

---

### Task 4: The three lines that name Harmonic

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`, `src/game/cast.ts`
- Test: `tests/unit/text.test.ts`, `tests/unit/cast.test.ts`, `tests/unit/story.test.ts`,
  `tests/unit/cases.test.ts`, `tests/unit/opening.test.ts`, `tests/unit/talk.test.ts`,
  `tests/unit/floor.test.ts`

**Interfaces:**
- Produces: the text id `talk.officer-rules-3`; `CAST[0].pages` with three keys. The keys
  `talk.sales-after` and `story.close-2` keep their names and their places in `CASES` and
  `SCENES`; only their words change.

No rule of the game changes in this task. The words are fixed by the spec's table; copy them
from the diffs and change nothing.

- [x] **Step 1: The words, tested line by line,** and the test that holds the name to the
  three pages:

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -76,6 +76,35 @@
     ]);
   });
 
+  it('holds the third page of the officer, which names Harmonic, in both languages (0036)', () => {
+    const third = textKey('talk.officer-rules-3');
+    expect(textOf(third, 'de').split('\n')).toStrictEqual([
+      'Die Lampe hast nur du. Etwas wie Harmonic',
+      'würde dem Haus zeigen, welche KI hier läuft',
+      'und wohin die Daten gehen.',
+    ]);
+    expect(textOf(third, 'en').split('\n')).toStrictEqual([
+      'Only you have the lamp. Something like Harmonic',
+      'would show the house which AI runs here',
+      'and where the data goes.',
+    ]);
+  });
+
+  it('names Harmonic in three pages of talk and nowhere else (0036)', () => {
+    for (const language of LANGUAGES) {
+      const named = Object.entries(TABLE[language])
+        .filter(([, text]) => text.toLowerCase().includes('harmonic'))
+        .map(([id]) => id);
+      // The officer, the management in the close and the source of Sales after its case, in
+      // the order of the table. No notice, no entry of the journal and no other page.
+      expect(named, language).toStrictEqual([
+        'talk.officer-rules-3',
+        'story.close-2',
+        'talk.sales-after',
+      ]);
+    }
+  });
+
   it('holds the four sayings of the colleagues in both languages (0018)', () => {
     const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
       textOf(textKey(id), language).split('\n');
@@ -191,15 +220,16 @@
       'Where the text goes from there, I never',
       'thought about.',
     ]);
+    // Since 0036 the page after the case names Harmonic: what it would have shown.
     expect(lines('talk.sales-after', 'de')).toStrictEqual([
       'Danke, dass du gefragt hast statt zu schimpfen.',
-      'Sag mir einfach, womit ich es beim nächsten Mal',
-      'machen darf.',
+      'Hätte mir etwas wie Harmonic vorher gezeigt,',
+      'wohin der Text geht – ich hätte es gelassen.',
     ]);
     expect(lines('talk.sales-after', 'en')).toStrictEqual([
       'Thanks for asking instead of telling me off.',
-      'Just tell me what I may use for it',
-      'next time.',
+      'Had something like Harmonic shown me where',
+      'the text goes, I would have left it.',
     ]);
     expect(lines('case.sales-outcome', 'de')).toStrictEqual([
       'Gelöst: Angebote gingen in einen Chatbot.',
@@ -325,15 +355,16 @@
       'Where you have been, the colours are back –',
       'and nobody got into trouble.',
     ]);
+    // Since 0036 the management names Harmonic on the second page.
     expect(lines('story.close-2', 'de')).toStrictEqual([
-      'Die Geschäftsführung ruft an: „Gut. Aber das',
-      'war erst der Anfang, oder?“ Über den anderen',
-      'Türen liegt der Schatten noch.',
+      'Die Geschäftsführung ruft an: „Gut. Mit',
+      'Harmonic hätten wir es vor dem Kunden gesehen.“',
+      'Über den anderen Türen liegt der Schatten noch.',
     ]);
     expect(lines('story.close-2', 'en')).toStrictEqual([
-      'The managing director calls: “Good. But that',
-      'was only the beginning, was it not?” The',
-      'shadow still lies over the other doors.',
+      'The managing director calls: “Good. With',
+      'Harmonic we would have seen it before the',
+      'customer did.” Other doors are still in shadow.',
     ]);
     expect(lines('story.close-3', 'de')).toStrictEqual([
       'So weit reicht das Spiel bis heute.',
```

- [x] **Step 2: The officer has three pages.** The cast, the speakers of a step, and the
  floor's figures:

```diff
--- a/tests/unit/cast.test.ts
+++ b/tests/unit/cast.test.ts
@@ -21,10 +21,11 @@
 const point = (name: string, x: number, y: number): NamedPoint => ({ name, x, y });
 const FIRST = textKey('talk.officer-rules-1');
 const SECOND = textKey('talk.officer-rules-2');
+const THIRD = textKey('talk.officer-rules-3');
 
 describe('the cast (0017)', () => {
-  it('has the officer with her two pages', () => {
-    expect(CAST[0]).toStrictEqual({ id: 'officer', pages: [FIRST, SECOND] });
+  it('has the officer with her three pages: the third names Harmonic (0036)', () => {
+    expect(CAST[0]).toStrictEqual({ id: 'officer', pages: [FIRST, SECOND, THIRD] });
   });
 
   it('has the intern after her, with the one page he has before anything is known (0033)', () => {
@@ -47,7 +48,7 @@
       point('wake', 40, 40),
     ];
     expect(figuresOf(points)).toStrictEqual([
-      { id: 'officer', pages: [FIRST, SECOND], x: 160, y: 96 },
+      { id: 'officer', pages: [FIRST, SECOND, THIRD], x: 160, y: 96 },
     ]);
   });
 
```

```diff
--- a/tests/unit/story.test.ts
+++ b/tests/unit/story.test.ts
@@ -18,7 +18,11 @@
 import { grassMap } from './grass-map';
 
 const CALL = [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')];
-const RULES = [textKey('talk.officer-rules-1'), textKey('talk.officer-rules-2')];
+const RULES = [
+  textKey('talk.officer-rules-1'),
+  textKey('talk.officer-rules-2'),
+  textKey('talk.officer-rules-3'),
+];
 const OFFICER: NamedPoint = { name: 'figure:officer', x: 160, y: 96 };
 /** The colleague of the reception, waiting ten seconds 32 px above the spawn. */
 const COLLEAGUE: readonly NamedPoint[] = [
```

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -1100,11 +1100,11 @@
     expect(hers !== undefined && 'point' in hers).toBe(true);
   });
 
-  it('gives the floor the officer as its first figure, with her two pages', () => {
+  it('gives the floor the officer as its first figure, with her three pages', () => {
     // The intern of 0033 is the second.
     expect(
       figures.slice(0, 1).map((figure) => [figure.id, figure.x, figure.y, figure.pages.length]),
-    ).toStrictEqual([['officer', 264, 472, 2]]);
+    ).toStrictEqual([['officer', 264, 472, 3]]);
     expect(createInitialState(floor).figures[0]).toStrictEqual({ figure: 0, facing: 'down' });
   });
 
@@ -2104,7 +2104,7 @@
     expect(
       figures.map((figure) => [figure.id, figure.x, figure.y, figure.pages.length]),
     ).toStrictEqual([
-      ['officer', 264, 472, 2],
+      ['officer', 264, 472, 3],
       ['intern', 616, 488, 1],
     ]);
     expect(start.figures).toStrictEqual([
```

- [x] **Step 3: The tests that read her own talk to its end press once more,** and one new
  test reads the three pages after the meeting:

```diff
--- a/tests/unit/opening.test.ts
+++ b/tests/unit/opening.test.ts
@@ -296,14 +296,15 @@
     expect(closed.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
   });
 
-  it('says the two pages of 0017 once the lamp is owned, and closing them changes neither field', () => {
+  it('says her own three pages once the lamp is owned, and closing them changes neither field', () => {
     const met = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK);
     const again = run(MAP, met, NONE, TALK);
     expect(again.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
-    const closed = run(MAP, again, NONE, TALK, NONE, TALK);
+    // The two pages of 0017 and the third of 0036.
+    const closed = run(MAP, again, NONE, TALK, NONE, TALK, NONE, TALK);
     expect(closed.dialogue).toBeNull();
     expect(closed.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
-    const past = run(MAP, createInitialState(MAP), TALK, NONE, TALK, NONE, TALK);
+    const past = run(MAP, createInitialState(MAP), TALK, NONE, TALK, NONE, TALK, NONE, TALK);
     expect(past.dialogue).toBeNull();
     expect(past.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
   });
@@ -365,3 +366,21 @@
     expect(state).toStrictEqual({ ...met, tick: met.tick + 2, presented: 1 });
   });
 });
+
+describe('the officer after the meeting (0036)', () => {
+  it('says her three pages once the lamp is handed over, and a fourth press closes them', () => {
+    const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
+    expect(met.lamp.owned).toBe(true);
+    const opened = run(MAP, met, NONE, TALK);
+    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
+    // The third is the page that names Harmonic; the first meeting did not have it.
+    expect(spoken(MAP, opened)).toStrictEqual([
+      textKey('talk.officer-rules-1'),
+      textKey('talk.officer-rules-2'),
+      textKey('talk.officer-rules-3'),
+    ]);
+    const third = run(MAP, opened, NONE, TALK, NONE, TALK);
+    expect(third.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 2 });
+    expect(run(MAP, third, NONE, TALK).dialogue).toBeNull();
+  });
+});
```

```diff
--- a/tests/unit/talk.test.ts
+++ b/tests/unit/talk.test.ts
@@ -220,9 +220,10 @@
   });
 
   it('closes with a press on the last page; she keeps her facing; the next step is an ordinary one', () => {
-    const closed = run(map, opened, NONE, TALK, NONE, TALK);
+    // She has three pages since 0036.
+    const closed = run(map, opened, NONE, TALK, NONE, TALK, NONE, TALK);
     expect(closed.dialogue).toBeNull();
-    expect(closed.tick).toBe(5);
+    expect(closed.tick).toBe(7);
     expect(closed.figures).toStrictEqual([{ figure: 0, facing: 'right' }]);
     expect(closed.player.x).toBe(184);
     const walked = run(map, closed, NONE, RIGHT);
@@ -283,7 +284,7 @@
 
   it('moves again once it is closed', () => {
     const opened = update(start, TALK, map);
-    const closed = run(map, opened, NONE, TALK, NONE, TALK);
+    const closed = run(map, opened, NONE, TALK, NONE, TALK, NONE, TALK);
     expect(closed.dialogue).toBeNull();
     const later = run(map, closed, NONE, NONE);
     expect(later.creatures[0]?.x).toBeLessThan(214);
```

- [x] **Step 4: The source of Sales** names it after the case and on no page before it:

```diff
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -24,7 +24,7 @@
 import type { Trace } from '../../src/game/trace';
 import { createInitialState, update } from '../../src/game/update';
 import { UPGRADES } from '../../src/game/world';
-import { textKey } from '../../src/text/text';
+import { type TextKey, textKey, textOf } from '../../src/text/text';
 import { grassMap } from './grass-map';
 
 const NONE = NO_INPUT;
@@ -673,3 +673,20 @@
     expect(JSON.parse(JSON.stringify(solved))).toStrictEqual(solved);
   });
 });
+
+describe('Harmonic in the case of Sales (0036)', () => {
+  /** Whether a page of these names the product, in either language. */
+  const named = (keys: readonly TextKey[]): boolean =>
+    keys.some((key) =>
+      (['de', 'en'] as const).some((language) => textOf(key, language).includes('Harmonic')),
+    );
+
+  it('is named by the source on the page after the case, and on no page before it', () => {
+    const sales = CASES[0];
+    expect(sales?.region).toBe('sales');
+    expect(named(EVERYDAY)).toBe(false);
+    expect(named(sales?.answer ?? [])).toBe(false);
+    expect(sales?.after).toStrictEqual(AFTER);
+    expect(named(AFTER)).toBe(true);
+  });
+});
```

- [x] **Step 5: Run** `npx tsc --noEmit` — four errors, one each in the tests of the cast,
  the opening, the story and the text: the id is not an id of the table yet. Run
  `npx vitest run`. Expected: 14 tests fail in seven files —
  `holds the third page of the officer, which names Harmonic, in both languages (0036)`,
  `names Harmonic in three pages of talk and nowhere else (0036)`,
  `holds the words of the case of Sales in both languages (0024)` and
  `holds the three pages of the close in both languages (0034)` (text);
  `has the officer with her three pages: the third names Harmonic (0036)` and
  `reads the figures of a map in file order, with their place and their pages` (cast);
  `leaves the pages of a figure and of a colleague to the speakers of the step` (story);
  `is named by the source on the page after the case, and on no page before it` (cases);
  `closes with a press on the last page; she keeps her facing; the next step is an ordinary
  one` and `moves again once it is closed` (talk);
  `says her own three pages once the lamp is owned, and closing them changes neither field`
  and `says her three pages once the lamp is handed over, and a fourth press closes them`
  (opening); and the two tests of the floor's figures.

- [x] **Step 6: The words,** in both tables:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -57,6 +57,11 @@
     'regt – nicht um es zu vertreiben, sondern um',
     'es zu verstehen.',
   ].join('\n'),
+  'talk.officer-rules-3': [
+    'Die Lampe hast nur du. Etwas wie Harmonic',
+    'würde dem Haus zeigen, welche KI hier läuft',
+    'und wohin die Daten gehen.',
+  ].join('\n'),
   'talk.officer-meeting-2': [
     'Nimm die Lampe: Sie hält fest, was sich darin',
     'regt – nicht um es zu vertreiben, sondern um',
@@ -83,9 +88,9 @@
     'niemand hat Ärger bekommen.',
   ].join('\n'),
   'story.close-2': [
-    'Die Geschäftsführung ruft an: „Gut. Aber das',
-    'war erst der Anfang, oder?“ Über den anderen',
-    'Türen liegt der Schatten noch.',
+    'Die Geschäftsführung ruft an: „Gut. Mit',
+    'Harmonic hätten wir es vor dem Kunden gesehen.“',
+    'Über den anderen Türen liegt der Schatten noch.',
   ].join('\n'),
   'story.close-3': [
     'So weit reicht das Spiel bis heute.',
@@ -119,8 +124,8 @@
   'talk.sales-source-2': ['Wohin der Text damit geht, habe ich mir nicht', 'überlegt.'].join('\n'),
   'talk.sales-after': [
     'Danke, dass du gefragt hast statt zu schimpfen.',
-    'Sag mir einfach, womit ich es beim nächsten Mal',
-    'machen darf.',
+    'Hätte mir etwas wie Harmonic vorher gezeigt,',
+    'wohin der Text geht – ich hätte es gelassen.',
   ].join('\n'),
   'case.sales-outcome': 'Gelöst: Angebote gingen in einen Chatbot.',
   'policy.sales': [
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -53,6 +53,11 @@
     'The lamp holds still whatever stirs in it –',
     'not to drive it away, but to understand it.',
   ].join('\n'),
+  'talk.officer-rules-3': [
+    'Only you have the lamp. Something like Harmonic',
+    'would show the house which AI runs here',
+    'and where the data goes.',
+  ].join('\n'),
   'talk.officer-meeting-2': [
     'Take the lamp: it holds still whatever stirs',
     'in it – not to drive it away, but to',
@@ -79,9 +84,9 @@
     'and nobody got into trouble.',
   ].join('\n'),
   'story.close-2': [
-    'The managing director calls: “Good. But that',
-    'was only the beginning, was it not?” The',
-    'shadow still lies over the other doors.',
+    'The managing director calls: “Good. With',
+    'Harmonic we would have seen it before the',
+    'customer did.” Other doors are still in shadow.',
   ].join('\n'),
   'story.close-3': [
     'This is how far the game goes today.',
@@ -115,8 +120,8 @@
   'talk.sales-source-2': ['Where the text goes from there, I never', 'thought about.'].join('\n'),
   'talk.sales-after': [
     'Thanks for asking instead of telling me off.',
-    'Just tell me what I may use for it',
-    'next time.',
+    'Had something like Harmonic shown me where',
+    'the text goes, I would have left it.',
   ].join('\n'),
   'case.sales-outcome': 'Solved: offers went into a chatbot.',
   'policy.sales': [
```

- [x] **Step 7: The officer's third page:**

```diff
--- a/src/game/cast.ts
+++ b/src/game/cast.ts
@@ -22,7 +22,13 @@
 export const CAST: readonly CastMember[] = [
   {
     id: 'officer',
-    pages: [textKey('talk.officer-rules-1'), textKey('talk.officer-rules-2')],
+    // Her third page names Harmonic (0036, vision.md §10); the pages of the first meeting do
+    // not: the line compares it with the lamp, which she has handed over by then.
+    pages: [
+      textKey('talk.officer-rules-1'),
+      textKey('talk.officer-rules-2'),
+      textKey('talk.officer-rules-3'),
+    ],
   },
   // The intern (0033). What he says is picked in every step by `game/hints`; this is the
   // page he has before anything is known.
```

- [x] **Step 8: Run** `npm run check` — 1589 unit tests. The test that gives a page of talk
  and of the story at most three lines of at most 47 characters covers the three pages, and
  the test that every character has a glyph covers their quotation marks and the dash.

- [x] **Step 9: Commit** — `Name Harmonic in three pages of talk`. Body: the data protection
  officer, the colleague of Sales after the case and the management in the close each say
  once what Harmonic would have shown; it is monitoring, it does nothing in the game, and
  nobody praises it (`vision.md` §10).

---

### Task 5: The documents

**Files:**
- Modify: `docs/spec/vision.md`, `docs/spec/gameplay.md`, `docs/spec/world.md`,
  `docs/spec/architecture.md`, `docs/spec/visual.md`, `docs/spec/testing.md`, `README.md`

The diffs are against the branch as it stands before Task 1. If a line has moved, put the
text where the diff means it; do not change the words without a reason.

- [x] **Step 1: `vision.md`** §10. The text records what the author settled; do not reword
  it and do not add advice of your own:

```diff
--- a/docs/spec/vision.md
+++ b/docs/spec/vision.md
@@ -226,3 +226,16 @@
 - **The advertising is recognizable.** The presenter's line tells a player that the product in
   the game is there on purpose. Whether that is enough has to be checked by a competent person
   before the first public release, together with the licences (§9).
+
+*As built* (feature 0036). The presenter's line stands on a card before the call — `LMIS
+präsentiert` over the title, on an otherwise empty screen, for three seconds or until a press.
+It is the one text of the game that holds the presenter's name, and a test keeps it so. The
+card has no line about Harmonic; one is added if the person who checks the release asks for it.
+
+The three voices, each on one page of talk. The data protection officer, on the third page of
+her own talk, once the lamp is handed over: `Die Lampe hast nur du. Etwas wie Harmonic würde
+dem Haus zeigen, welche KI hier läuft und wohin die Daten gehen.` The colleague of Sales, on
+the page after the case: `Hätte mir etwas wie Harmonic vorher gezeigt, wohin der Text geht –
+ich hätte es gelassen.` The management, on the second page of the close: `Mit Harmonic hätten
+wir es vor dem Kunden gesehen.` A test holds the name to these three pages, in both languages,
+and no table of the world data holds either name.
```

- [x] **Step 2: `gameplay.md`** §6 and §8:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -210,6 +210,13 @@
 do not depend on each other: Marketing is open from the start, and the player may solve it
 before Sales. What a case of Act 2 has more than the first — its species, the upgrade it
 earns, the vendor — comes with features of their own.
+
+**As built** (feature 0036): three pages of talk name Harmonic, and no rule of a case changed
+(`vision.md` §10). The page the colleague of Sales says after the case no longer asks what to
+use next time: it says that something like Harmonic would have shown where the text goes. On
+the second page of the close the management says that with Harmonic the house would have seen
+it before the customer did. The third is a page of the data protection officer (§8). No page
+of an answer and no everyday line holds the name.
 
 ## 7. The journal
 
@@ -304,6 +311,16 @@
 first page and then the page that hands the lamp over; afterwards she says her two pages of
 0017. A press of E opens a dialogue with Space held as long as the player has no lamp.
 
+**As built** (feature 0036): before the call a game shows a card — a dark screen with two
+lines in its middle, `LMIS präsentiert` and, below it, `Shadow AI`. It ends by itself after
+three seconds, or at a press of E or Enter, and the call follows on its first page; the press
+that ended the card does not turn that page. While the card is shown no other key of the game
+does anything. L switches the language on it as everywhere, and F toggles fullscreen. The
+card is the stand-in for the title screen of M8 and goes when that comes. A page that is
+loaded anew shows it again. The data protection officer's own talk has a third page since
+this feature, the one that compares Harmonic with the lamp; the first meeting keeps its two
+pages, so she says it only once the lamp is handed over.
+
 **As built** (feature 0027): E and Enter also take a coffee at a coffee machine (§4). A
 colleague or a figure in reach comes first: then the press opens the dialogue. The press does
 nothing at a machine while the lamp is held or the figure is being pushed. The help still lists
```

- [x] **Step 3: `world.md`** §3:

```diff
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -210,7 +210,8 @@
   from which she can be spoken to: 40 px, and in sight.
   Feature 0026 brings the first meeting: while the player has no lamp she says her first page
   and then `Nimm die Lampe: …` — three sentences in all — and the press that closes it hands
-  the lamp over. From then on she says the two pages of 0017.
+  the lamp over. From then on she says the two pages of 0017 and, since feature 0036, a third
+  that names Harmonic (`vision.md` §10).
 - **The vendor.** See `vision.md` §4. Recurring in every department, never an enemy, changing
   over the game from seller to advisor. As advisor he supplies the approved alternatives that
   solve the later cases. They are fictional products; Harmonic is not his (`vision.md` §10).
```

- [x] **Step 4: `architecture.md`** §2, §3 and §5:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -142,9 +142,20 @@
 There are two starts (feature 0026). `createInitialState(map)` is a game **past its opening**:
 no dialogue open, the lamp owned and used. The tests of the earlier features step
 from it. `newGame(map)` is what a player gets, and what `main.ts` starts with: the same state
-with `dialogue` `{ speaker: 'story', index: 0, page: 0 }` — the call on its first page — and
-`lamp` `{ on: false, strength: 1, owned: false, used: false }`.
+with `dialogue` `{ speaker: 'story', index: 0, page: 0 }` — the call on its first page —,
+`lamp` `{ on: false, strength: 1, owned: false, used: false }` and, since feature 0036,
+`presented` `null`: the card is shown.
 
+`presented` is the tick of the step in which the card ended, or `null` while it is shown
+(feature 0036, `game/card`); a game past its opening has 0. While it is `null` — `cardShown`
+— a step is `stepCard` and nothing else, before the dark, the help and everything after them:
+`tick` grows by one, the input is remembered in `held`, and nothing of the world is stepped.
+The card ends in the step in which `talk` is pressed — `pressed` against `held`, so a key held
+from before does not count — or in the step whose tick reaches `CARD_STEPS`, 180: that step
+sets `presented` to its tick and changes nothing else. The call is open under the card from
+the start, so the next step is the dialogue's, and the key that ended the card, still held, is
+no press for it. The wake keeps `presented`; nothing sets it back to `null`.
+
 The state does not record when the opening ended. Feature 0026 kept that as `started`, for the
 start hint of the help alone; feature 0031 took the hint and the field away.
 
@@ -330,7 +341,8 @@
 that hands the lamp over, `officer`, and its pages, `talk.officer-rules-1` and
 `talk.officer-meeting-2`. While the lamp is not owned, `figuresIn(figures, owned)` gives that
 figure the meeting's pages instead of its own; `update` and the scene both build the speakers
-from it, so the box shows the pages the dialogue has.
+from it, so the box shows the pages the dialogue has. Her own pages are three since feature
+0036: `talk.officer-rules-3` names Harmonic, and the meeting's pages do not.
 
 The **hints** (feature 0033) are data and one rule of `game/hints`. `HINT_FIGURE` names the
 figure that says them, `intern`; `HINTS` holds per case — by its region — three pages, `start`,
@@ -469,6 +481,10 @@
 a 60 Hz display advances exactly one step per frame and a 120 Hz display one every second frame;
 on 59.94 Hz the game runs 0.1 % slow, which nobody sees. Other rates, such as 144 Hz, are not
 snapped and show the uneven cadence that a fixed step without interpolation implies.
+
+**The card counts steps.** The card of a new game (feature 0036) lasts 180 steps, not three
+seconds of a clock: steps the cap drops after a stall are not counted, so a tab that was in the
+background shows the card for its whole length when it comes back.
 
 **Steps, not milliseconds.** The accumulator counts steps. In milliseconds floating point loses a
 step: five capped steps of `1000 / 60` ms, subtracted one by one, leave 16.66666666666666 and run
@@ -679,6 +695,13 @@
 5, 1), (300, 170, 3, 1) and (301, 171, 1, 1), a small triangle that points down and blinks once a
 second, on every page. A line of 47 characters ends at x = 294, left of the marker.
 
+The card (feature 0036, `render/draw-card`). While `presented` is `null`, `drawScene` calls
+`drawCard` and returns, before it looks at the journal or the help: `clear` to the page
+background, then `card.presents` with its top at y = 74 and `card.title` at y = 94, each from
+x = `centredX(n)`, 160 − 3n for the n characters of the line in the language of the settings —
+112 and 133 in German, 121 and 133 in English. Nothing else is drawn: no layer, no figure, no
+heart, no label of the help, no box, no bar and no lid.
+
 The journal (feature 0020, `render/draw-journal`). While `journal` is not `null`, `drawScene`
 draws the journal and nothing else: no tile, no figure, no heart, no notice, no language line,
 no lid. In the language of the settings it draws: the surface cleared in `#181425`; the three
```

- [x] **Step 5: `visual.md`** §3:

```diff
--- a/docs/spec/visual.md
+++ b/docs/spec/visual.md
@@ -95,6 +95,11 @@
 `Spuren: 1 von 5`. The help is the one thing drawn over the journal; its frame is what makes it
 a box on the journal's screen, which has the field's colour.
 
+**The card** a game opens with (feature 0036) is the page colour `#181425` over the whole
+surface and two lines in the game's font: the presenter's with its top at y = 74 and the title
+at y = 94, each centred — a line of n characters starts at x = 160 − 3n. No logo, no frame and
+no picture is on it.
+
 ## 4. Palette
 
 Every colour in the game comes from **Endesga 32** — thirty-two colours, warm, enough for office
```

- [x] **Step 6: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -19,10 +19,10 @@
 
 | Invariant | Test |
 |---|---|
-| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the wider cone earned, by hand and by solving the case of Marketing (0029); the initial state, one with the close open and one after it (0034); the initial state and one with the help open (0021) |
+| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the wider cone earned, by hand and by solving the case of Marketing (0029); the initial state, one with the close open and one after it (0034); a new game with the card shown, one in the middle of it and one after it (0036); the initial state and one with the help open (0021) |
 | INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/`, and on the type `Language` there — the game does not know the language (0019) |
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
-| INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
+| INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); each line of the card is one line that fits the surface, no other key of either table holds the presenter's name, and the name Harmonic is in three pages of talk and in no other key (0036); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
 | INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
 | INV-6 palette | the asset tests: palette, the reserved colour and its five shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022), the veil sheet with its five frames (0023, 0025) and the mirage sheet (0032) —, the wider cone's sheet with every other PNG (0029), the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
 | INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); `game/rest` refuses a rest that is not one cell, with its message, and a test holds the floor's eight rests to its coffee machines, none without a rest (0027); a test holds the floor's five traces of Marketing to the spec's table — each in the area of Marketing, on a desk with a screen or on the printer, and in the light from every reached place on the cell above — and the 123 objects of the floor before them to a recorded SHA-256 digest, so that no object of an earlier feature changes (0028); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
```

- [x] **Step 7: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -58,7 +58,11 @@
 Marketing has a creature of its own: the mirage, a framed picture that moves only while nobody
 looks at it (feature 0032). An intern stands in the break room and says, when asked, where the
 next step is (feature 0033). Five seconds after the last case there is, the story says once
-that the rest of the floor follows, and the game goes on (feature 0034).
+that the rest of the floor follows, and the game goes on (feature 0034). A game opens with a
+card that says who presents it — `LMIS präsentiert` over the title — for three seconds or
+until `E` is pressed; then the call follows. Three people name Harmonic, a monitoring product,
+once each and say what it would have shown: the data protection officer, the colleague of
+Sales after the case, and the management at the close (feature 0036).
 Every merge to `main` is deployed to Cloud Run (feature 0030).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
```

- [x] **Step 8:** `npm run check`, then commit — `Move the card and the three lines into the
  spec`.

---

### Task 6: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 20 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 6 in this file and commit —
  `Tick the full check of 0036`.

---

### Task 7: The acceptance walk

- [ ] **Step 1:** start the dev server as the spec's preconditions say (`npm run dev`), and tell
  the author in one message: the URL — **not to be loaded yet**, because the walk begins with
  loading the page —, a desktop browser, a window of at least 1280x720, the keys of the
  spec's preconditions, and that the walk solves both cases and takes about twenty minutes.
  Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–24 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 6, and start again at step 1. A step that fails because the author
  wants other words for a line is a decision: ask, and change the spec's table first.
- [ ] **Step 4:** after step 24 ask the seven feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–24`, followed by the feel
  notes, into the spec and commit it — `Record the walk of 0036`. A feel note that wants
  something else — another length of the card, a fourth line, a softer cut to the call —
  becomes a new draft, not a change on this branch. The spec marks the three seconds *tune*:
  say so when the author asks for another length.

---

### Task 8: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 6. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`. In `docs/plan.md` §4: in the M6 section say that 0032 to 0034
  and 0036 are implemented and the other two are approved; in the M5 section, where the
  text says that the one named below is not implemented and that M5 stays open until it is
  built, say that it is implemented. Do not declare the milestone done in other words than
  the text already uses for a finished milestone; if it is unclear whether M5 is done, ask
  the author. Commit — `Mark 0036 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0036: LMIS and Harmonic`, with the walk's result and feel notes in its
  description. Say in the description that the branch also carries the change of the
  specification: 0035, the Harmonic station, was rejected in its walk, and the rule about
  naming Harmonic was reworded. Add one line, as the spec settled it: whether the
  advertising is recognizable enough, whether the lines say only what the product does, and
  how the licences leave out the two names is for the competent person who checks the
  release (`vision.md` §9 and §10), before the address of the deployed game is announced to
  anybody outside — a condition of announcing, not of this merge. CI must be green. The
  author merges.
