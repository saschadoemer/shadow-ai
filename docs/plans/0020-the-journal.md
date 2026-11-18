# 0020 — Implementation plan: the journal

**Spec:** [`docs/features/0020-the-journal.md`](../features/0020-the-journal.md) (approved
2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read the spec
first, then `CLAUDE.md`, then `docs/spec/architecture.md` §2, §4, §5 and §8,
`docs/spec/gameplay.md` §7 and `docs/spec/testing.md` §5. **Written:** 2026-11-18 on the
planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0019 is merged into `main` (`f096a86` or later). The branch
`feature/0020-the-journal` exists, cut from that `main`, and holds the approval and this plan.
Work on it; merge the latest `main` into it before Task 1.

**Goal:** a press of `J` opens the journal — three tabs, turned with the left and right keys —
and a second press closes it; the game stands still while it is open; a captured snippet has
its entry under the creatures, and the other two tabs say that they are empty.

**Approach:** four code tasks, each green on its own. The words (T1). The state and the rules
(T2): the state remembers the whole input of the last step, `held`, in place of `talkHeld`;
`game/journal` opens, turns and closes; `update` gains the journal's step. After T2 the key
works and the world stands still, but the scene still shows the world. The screen (T3):
`render/draw-journal`, drawn by the scene instead of the world. The smoke spec (T4). Then the
documents (T5), the full check with the container (T6), the walk (T7) and the pull request
(T8).

**How this plan was checked:** the code and the tests of Tasks 1 to 4 were run once as a
prototype on 2026-11-18 in a separate tree, on the source of `main` at `f096a86`: typecheck,
Biome, the build and 927 unit tests were green (877 before), and the new smoke test passed
three times in a row against a dev server of that tree. The state after Task 2 alone was
checked too: typecheck and Biome clean, 916 tests. The prototype was thrown away; nothing of
it is on the branch. If a step does not behave as written, the cause is a difference to that
state — stop and look; do not bend a test. The container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `GameState.journal` is `null` or `{ tab }`, `GameState.held` is a plain `GameInput`.
  What a tab shows is **not** in the state: `entriesOf(state.captured)` derives it in every
  frame.
- INV-2: `src/game/journal.ts` imports nothing from `src/render/`, uses no DOM name and not the
  type `Language` (the rule of 0019). `src/render/draw-journal.ts` may import from `game/`.
- INV-4: every word of the journal lives in `src/text/de.ts` and `src/text/en.ts`;
  `game/journal` holds keys; `drawText` stays the only function that draws text.
- `GameState.talkHeld` is **removed**, not kept beside `held`. `talkPressed(state, input)`
  stays and reads `held`.
- With the journal open, `update` returns the state with `tick`, `held` and `journal` changed
  and nothing else. Opening changes nothing else either — not the lamp, not a push, not the
  player's frame.
- The order of a step in `update`: the dark; the journal open; a dialogue open; a press of
  `journal`; a press of `talk`; the ordinary step.
- `engine/input` is **not** changed. No tile changes, no map changes, no new sprite.
- `draw-journal.ts` imports only **types** from `draw-scene.ts`; `draw-scene.ts` imports
  `drawJournal`. So the frozen frame is the constant `ENTRY_FRAME` of `draw-journal.ts`, and a
  test holds it equal to `FROZEN_FRAME`.
- The game reads the held keys once per frame: a key that goes down and up within one frame
  is not seen. That is so since 0017 and is why the smoke test holds a key until the state
  shows it. Do not change the input for it.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: `journal` ← `KeyJ`; the tabs `creatures`, `cases`,
  `policy`; tab k is the rectangle (8 + 102k, 6, 100, 16), `#3a4466` when open and `#262b44`
  otherwise; a title of n characters starts at (58 + 102k − 3n, 9); the rule is
  (8, 22, 304, 2) in `#3a4466`; the line for nothing starts at (16, 36); entry k has its
  picture — frame 2 of the species' sheet — at (16, 32 + 72k), its name from (40, 35 + 72k)
  and its text from (16, 54 + 72k), lines 12 px apart; a title has at most 16 characters, a
  line for nothing at most 47, a name at most 24, a text two to four lines of at most 47.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | eight keys of the kinds `journal` and `creature` |
| `src/game/player.ts` | `GameInput.journal`, `NO_INPUT`, `pressed` |
| `src/game/state.ts` | `JOURNAL_TABS`, `JournalTab`, `JournalState`; `GameState.journal`; `GameState.held` replaces `talkHeld` |
| `src/game/journal.ts` | new: `TAB_TEXT`, `ENTRY_TEXT`, `entriesOf`, `openJournal`, `stepJournal` |
| `src/game/talk.ts`, `src/game/overview.ts`, `src/game/update.ts` | `held` in place of `talkHeld`; the journal's step and its opening in `update` |
| `src/main.ts` | the binding `journal` ← `KeyJ`; `readInput` returns seven actions |
| `src/render/draw-journal.ts` | new: the screen |
| `src/render/draw-scene.ts` | draws the journal instead of the world while it is open |
| `tests/unit/journal.test.ts`, `tests/unit/draw-journal.test.ts` | new |
| `tests/unit/text.test.ts`, `state.test.ts`, `talk.test.ts`, `overview.test.ts`, `player.test.ts`, `notice.test.ts`, `draw-scene.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 5 |

---

### Task 1: The words of the journal

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `journal.tab-creatures`, `journal.tab-cases`, `journal.tab-policy`,
  `journal.no-creatures`, `journal.no-cases`, `journal.no-policy`, `creature.snippet-name`,
  `creature.snippet-text`, in both languages.

- [ ] **Step 1: Write the failing tests** — the words, and the rule of each kind:

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -121,6 +121,68 @@ describe('the language table (INV-4, 0016)', () => {
     ]);
   });
 
+  it('holds the words of the journal in both languages (0020)', () => {
+    const both = (id: Parameters<typeof textKey>[0]): string[] => [
+      textOf(textKey(id), 'de'),
+      textOf(textKey(id), 'en'),
+    ];
+    expect(both('journal.tab-creatures')).toStrictEqual(['Kreaturen', 'Creatures']);
+    expect(both('journal.tab-cases')).toStrictEqual(['Fälle', 'Cases']);
+    expect(both('journal.tab-policy')).toStrictEqual(['Richtlinie', 'Policy']);
+    expect(both('journal.no-creatures')).toStrictEqual([
+      'Noch keine Kreatur gefangen.',
+      'No creature captured yet.',
+    ]);
+    expect(both('journal.no-cases')).toStrictEqual([
+      'Noch kein Fall aufgenommen.',
+      'No case opened yet.',
+    ]);
+    expect(both('journal.no-policy')).toStrictEqual([
+      'Die Richtlinie ist noch leer.',
+      'The policy is still empty.',
+    ]);
+    expect(both('creature.snippet-name')).toStrictEqual(['Schnipsel', 'Snippet']);
+    expect(textOf(textKey('creature.snippet-text'), 'de').split('\n')).toStrictEqual([
+      'Ein Stück Text, das jemand in einen',
+      'öffentlichen Chatbot kopiert hat. Es lebt von',
+      'allem, was dort eingefügt wird – und geht,',
+      'sobald klar ist, welche Daten wohin dürfen.',
+    ]);
+    expect(textOf(textKey('creature.snippet-text'), 'en').split('\n')).toStrictEqual([
+      'A piece of text somebody pasted into a public',
+      'chatbot. It lives on whatever is pasted',
+      'there – and it goes as soon as everyone knows',
+      'which data may go where.',
+    ]);
+  });
+
+  it('holds every text of the journal to the rule of its kind (0020)', () => {
+    /** The most lines and the most characters per line a key may have, by what its id starts or ends with. */
+    const rules: readonly (readonly [(id: string) => boolean, number, number, number])[] = [
+      [(id) => id.startsWith('journal.tab-'), 1, 1, 16],
+      [(id) => id.startsWith('journal.no-'), 1, 1, 47],
+      [(id) => id.startsWith('creature.') && id.endsWith('-name'), 1, 1, 24],
+      [(id) => id.startsWith('creature.') && id.endsWith('-text'), 2, 4, 47],
+    ];
+    for (const language of LANGUAGES) {
+      for (const [key, text] of Object.entries(TABLE[language])) {
+        if (!key.startsWith('journal.') && !key.startsWith('creature.')) {
+          continue;
+        }
+        const rule = rules.find(([applies]) => applies(key));
+        expect(rule, `${key} has a rule`).toBeDefined();
+        const [, fewest, most, width] = rule ?? [null, 0, 0, 0];
+        const lines = text.split('\n');
+        expect(lines.length, `${language} ${key}`).toBeGreaterThanOrEqual(fewest);
+        expect(lines.length, `${language} ${key}`).toBeLessThanOrEqual(most);
+        for (const line of lines) {
+          expect(line.length, `${language} ${key}: "${line}"`).toBeLessThanOrEqual(width);
+          expect(line.trim(), `${language} ${key}`).not.toBe('');
+        }
+      }
+    }
+  });
+
   it('gives a page of talk at most three lines of at most 47 characters, none empty', () => {
     for (const language of LANGUAGES) {
       for (const [key, text] of Object.entries(TABLE[language])) {
```

- [ ] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/unit/text.test.ts`
Expected: the first new test FAILS — the ids do not exist. `npm run typecheck` fails too:
the eight ids are no `TextId`. The rule test passes on an empty set; it bites after Step 3.

- [ ] **Step 3: Add the strings.** The dash is `–`.

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -7,6 +7,19 @@
 export const de = {
   'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
   'notice.language': 'Sprache: Deutsch',
+  'journal.tab-creatures': 'Kreaturen',
+  'journal.tab-cases': 'Fälle',
+  'journal.tab-policy': 'Richtlinie',
+  'journal.no-creatures': 'Noch keine Kreatur gefangen.',
+  'journal.no-cases': 'Noch kein Fall aufgenommen.',
+  'journal.no-policy': 'Die Richtlinie ist noch leer.',
+  'creature.snippet-name': 'Schnipsel',
+  'creature.snippet-text': [
+    'Ein Stück Text, das jemand in einen',
+    'öffentlichen Chatbot kopiert hat. Es lebt von',
+    'allem, was dort eingefügt wird – und geht,',
+    'sobald klar ist, welche Daten wohin dürfen.',
+  ].join('\n'),
   'talk.officer-rules-1': [
     'Du siehst den Schatten also auch.',
     'Er bleibt überall dort zurück, wo Daten das',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -4,6 +4,19 @@ import type { de } from './de';
 export const en: Readonly<Record<keyof typeof de, string>> = {
   'notice.shadow-too-dense': 'This shadow is too dense for the lamp.',
   'notice.language': 'Language: English',
+  'journal.tab-creatures': 'Creatures',
+  'journal.tab-cases': 'Cases',
+  'journal.tab-policy': 'Policy',
+  'journal.no-creatures': 'No creature captured yet.',
+  'journal.no-cases': 'No case opened yet.',
+  'journal.no-policy': 'The policy is still empty.',
+  'creature.snippet-name': 'Snippet',
+  'creature.snippet-text': [
+    'A piece of text somebody pasted into a public',
+    'chatbot. It lives on whatever is pasted',
+    'there – and it goes as soon as everyone knows',
+    'which data may go where.',
+  ].join('\n'),
   'talk.officer-rules-1': [
     'So you can see the shadow too.',
     'It stays behind wherever data leaves the house',
```

- [ ] **Step 4: Run the tests.**

Run: `npx vitest run tests/unit/text.test.ts tests/unit/font.test.ts`
Expected: PASS — the glyph test covers the new strings. `npm run test`: 879 tests.

- [ ] **Step 5:** `npm run check`, then commit — `Give the journal its words`.

---

### Task 2: The whole input in the state, and the journal's rules

One commit: `held` replaces `talkHeld` in the state, so the state, the three modules that set
it and every test that builds a state or an input change together.

**Files:**
- Create: `src/game/journal.ts`, `tests/unit/journal.test.ts`
- Modify: `src/game/player.ts`, `src/game/state.ts`, `src/game/talk.ts`,
  `src/game/overview.ts`, `src/game/update.ts`, `src/main.ts`
- Test: `tests/unit/state.test.ts`, `talk.test.ts`, `overview.test.ts`, `player.test.ts`,
  `notice.test.ts`, `draw-scene.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: the eight text ids of Task 1.
- Produces, in `game/player`: `GameInput` with `journal: boolean`; `NO_INPUT: GameInput`;
  `pressed(held: GameInput, input: GameInput, action: keyof GameInput): boolean`.
- Produces, in `game/state`: `JOURNAL_TABS`, `type JournalTab`,
  `interface JournalState { readonly tab: JournalTab }`; `GameState.journal: JournalState | null`;
  `GameState.held: GameInput`.
- Produces, in `game/journal`: `TAB_TEXT: Record<JournalTab, { title: TextKey; nothing: TextKey }>`;
  `ENTRY_TEXT: Record<Species, { name: TextKey; text: TextKey }>`;
  `entriesOf(captured: Captured): Species[]`;
  `openJournal(state, input): GameState | null`;
  `stepJournal(state, journal: JournalState, input): GameState`.

- [ ] **Step 1: Create `tests/unit/journal.test.ts`:**

```ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  type NamedPoint,
  type NamedRect,
  parseTileMap,
  parseTileset,
  type TileMap,
} from '../../src/engine/tiled';
import { ENTRY_TEXT, entriesOf, openJournal, stepJournal, TAB_TEXT } from '../../src/game/journal';
import { type GameInput, NO_INPUT, pressed } from '../../src/game/player';
import { type GameState, JOURNAL_TABS } from '../../src/game/state';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const JOURNAL: GameInput = { ...NONE, journal: true };
const LEFT: GameInput = { ...NONE, left: true };
const RIGHT: GameInput = { ...NONE, right: true };
const TALK: GameInput = { ...NONE, talk: true };
/** 20x12 cells of open floor with the player at (x, y). */
const mapAt = (
  x: number,
  y: number,
  points: readonly NamedPoint[] = [],
  rects: readonly NamedRect[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);
const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, map), start);
const OPEN = mapAt(160, 96);
const opened = update(createInitialState(OPEN), JOURNAL, OPEN);

describe('the press of an action (0020)', () => {
  it.each(['talk', 'journal', 'left', 'right'] as const)(
    'sees %s pressed in exactly one of 600 steps with the key held',
    (action) => {
      const input: GameInput = { ...NONE, [action]: true };
      let state = createInitialState(OPEN);
      let presses = 0;
      for (let step = 0; step < 600; step += 1) {
        presses += pressed(state.held, input, action) ? 1 : 0;
        state = update(state, input, OPEN);
      }
      expect(presses).toBe(1);
    },
  );

  it('sees a press again after a step without the key', () => {
    const held = run(OPEN, createInitialState(OPEN), LEFT, LEFT);
    expect(pressed(held.held, LEFT, 'left')).toBe(false);
    const released = update(held, NONE, OPEN);
    expect(pressed(released.held, LEFT, 'left')).toBe(true);
    expect(pressed(released.held, NONE, 'left')).toBe(false);
  });

  it('remembers the whole input in every kind of step: ordinary, dark, dialogue and journal', () => {
    const both: GameInput = { ...NONE, left: true, lamp: true };
    const start = createInitialState(OPEN);
    expect(start.held).toStrictEqual(NO_INPUT);
    expect(update(start, both, OPEN).held).toStrictEqual(both);
    expect(update({ ...start, dark: 5 }, both, OPEN).held).toStrictEqual(both);
    expect(update(opened, both, OPEN).held).toStrictEqual(both);
    const talking = mapAt(184, 96, [{ name: 'figure:officer', x: 160, y: 96 }]);
    const dialogue = update(createInitialState(talking), TALK, talking);
    expect(dialogue.dialogue).not.toBeNull();
    expect(update(dialogue, both, talking).held).toStrictEqual(both);
  });
});

describe("the journal's data (0020)", () => {
  it('has three tabs: creatures, cases, policy', () => {
    expect(JOURNAL_TABS).toStrictEqual(['creatures', 'cases', 'policy']);
  });

  it('gives every tab a title and a line for nothing', () => {
    expect(TAB_TEXT).toStrictEqual({
      creatures: {
        title: textKey('journal.tab-creatures'),
        nothing: textKey('journal.no-creatures'),
      },
      cases: { title: textKey('journal.tab-cases'), nothing: textKey('journal.no-cases') },
      policy: { title: textKey('journal.tab-policy'), nothing: textKey('journal.no-policy') },
    });
  });

  it('gives the snippet its name and its text', () => {
    expect(ENTRY_TEXT).toStrictEqual({
      snippet: { name: textKey('creature.snippet-name'), text: textKey('creature.snippet-text') },
    });
  });

  it('lists a species as soon as one of it is captured', () => {
    expect(entriesOf({ snippet: 0 })).toStrictEqual([]);
    expect(entriesOf({ snippet: 1 })).toStrictEqual(['snippet']);
    expect(entriesOf({ snippet: 3 })).toStrictEqual(['snippet']);
  });
});

describe('opening the journal (0020)', () => {
  it('opens on the creatures with a press, and changes nothing else', () => {
    const start = createInitialState(OPEN);
    expect(start.journal).toBeNull();
    expect(opened).toStrictEqual({
      ...start,
      tick: 1,
      held: JOURNAL,
      journal: { tab: 'creatures' },
    });
  });

  it('opens whatever else is held, and in the middle of a push: nothing is stepped', () => {
    const input: GameInput = { ...JOURNAL, right: true, lamp: true, talk: true };
    const start = createInitialState(OPEN);
    const pushed: GameState = {
      ...start,
      player: { ...start.player, frame: 2, recoil: { dx: -3, dy: 0, steps: 4 } },
      lamp: { on: true, strength: 1 },
    };
    expect(update(pushed, input, OPEN)).toStrictEqual({
      ...pushed,
      tick: 1,
      held: input,
      journal: { tab: 'creatures' },
    });
  });

  it('opens instead of a dialogue when both keys are pressed next to a figure', () => {
    const map = mapAt(184, 96, [{ name: 'figure:officer', x: 160, y: 96 }]);
    const next = update(createInitialState(map), { ...JOURNAL, talk: true }, map);
    expect(next.journal).toStrictEqual({ tab: 'creatures' });
    expect(next.dialogue).toBeNull();
  });

  it('is what openJournal returns, and null without a press', () => {
    const start = createInitialState(OPEN);
    expect(openJournal(start, JOURNAL)).toStrictEqual(opened);
    expect(openJournal(start, NONE)).toBeNull();
    expect(openJournal({ ...start, held: JOURNAL }, JOURNAL)).toBeNull();
  });

  it('does not open with a dialogue open', () => {
    const map = mapAt(184, 96, [{ name: 'figure:officer', x: 160, y: 96 }]);
    const talking = update(createInitialState(map), TALK, map);
    const next = run(map, talking, NONE, JOURNAL);
    expect(next.journal).toBeNull();
    expect(next.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
  });

  it('does not open in the dark, and not after it by the key still held', () => {
    const dark = update({ ...createInitialState(OPEN), dark: 88 }, JOURNAL, OPEN);
    expect(dark.dark).toBe(89);
    expect(dark.journal).toBeNull();
    const awake = update(dark, JOURNAL, OPEN);
    expect(awake.dark).toBe(0);
    expect(update(awake, JOURNAL, OPEN).journal).toBeNull();
  });
});

describe('the tabs of the journal (0020)', () => {
  const tab = (state: GameState): string | undefined => state.journal?.tab;

  it('turns right to the cases and to the policy, and stays there', () => {
    const cases = run(OPEN, opened, NONE, RIGHT);
    expect(tab(cases)).toBe('cases');
    const policy = run(OPEN, cases, NONE, RIGHT);
    expect(tab(policy)).toBe('policy');
    expect(tab(run(OPEN, policy, NONE, RIGHT))).toBe('policy');
  });

  it('turns left back to the creatures, and stays there', () => {
    const policy = run(OPEN, opened, NONE, RIGHT, NONE, RIGHT);
    const cases = run(OPEN, policy, NONE, LEFT);
    expect(tab(cases)).toBe('cases');
    const creatures = run(OPEN, cases, NONE, LEFT);
    expect(tab(creatures)).toBe('creatures');
    expect(tab(run(OPEN, creatures, NONE, LEFT))).toBe('creatures');
  });

  it('turns one tab for a key held for 600 steps', () => {
    let state = update(opened, NONE, OPEN);
    for (let step = 0; step < 600; step += 1) {
      state = update(state, RIGHT, OPEN);
    }
    expect(tab(state)).toBe('cases');
  });

  it('turns none when left and right are pressed in the same step', () => {
    const cases = run(OPEN, opened, NONE, RIGHT, NONE);
    expect(tab(update(cases, { ...NONE, left: true, right: true }, OPEN))).toBe('cases');
  });

  it('turns right when right is pressed while left is only held', () => {
    const held = run(OPEN, opened, NONE, RIGHT, NONE, LEFT, LEFT);
    expect(tab(held)).toBe('creatures');
    expect(tab(update(held, { ...LEFT, right: true }, OPEN))).toBe('cases');
  });

  it('turns no tab with a direction key that was held when the journal opened', () => {
    const walking = run(OPEN, createInitialState(OPEN), RIGHT, RIGHT);
    const input: GameInput = { ...RIGHT, journal: true };
    const state = run(OPEN, walking, input, input, RIGHT, RIGHT);
    expect(tab(state)).toBe('creatures');
    expect(state.player).toStrictEqual(walking.player);
  });

  it('is what stepJournal returns: the tick, the input and the tab, nothing else', () => {
    const stepped = stepJournal(opened, { tab: 'creatures' }, RIGHT);
    expect(stepped).toStrictEqual({ ...opened, tick: 2, held: RIGHT, journal: { tab: 'cases' } });
  });
});

describe('closing the journal (0020)', () => {
  it('closes with a press, and the next step is an ordinary one', () => {
    const closed = run(OPEN, opened, NONE, JOURNAL);
    expect(closed.journal).toBeNull();
    expect(closed.tick).toBe(3);
    expect(closed.player.x).toBe(160);
    const walked = run(OPEN, closed, RIGHT);
    expect(walked.player.x).toBeCloseTo(160 + 80 / 60, 6);
  });

  it('closes even when a direction is pressed in the same step', () => {
    const closed = run(OPEN, opened, NONE, { ...JOURNAL, right: true });
    expect(closed.journal).toBeNull();
  });

  it('stays open while the key that opened it is held', () => {
    expect(run(OPEN, opened, JOURNAL, JOURNAL).journal).toStrictEqual({ tab: 'creatures' });
  });

  it('opens on the creatures again, whatever tab it was closed on', () => {
    const closed = run(OPEN, opened, NONE, RIGHT, NONE, JOURNAL);
    expect(closed.journal).toBeNull();
    expect(run(OPEN, closed, NONE, JOURNAL).journal).toStrictEqual({ tab: 'creatures' });
  });

  it('walks the figure at once with a direction key held through the closing', () => {
    const closed = run(OPEN, opened, RIGHT, { ...RIGHT, journal: true });
    expect(closed.journal).toBeNull();
    expect(closed.player.x).toBe(160);
    expect(update(closed, RIGHT, OPEN).player.x).toBeCloseTo(160 + 80 / 60, 6);
  });
});

describe('the world while the journal is open (0020)', () => {
  /** A snippet 30 px from the player, a colleague on a leg and a wall that was giving way. */
  const map = mapAt(
    104,
    48,
    [
      { name: 'snippet', x: 134, y: 48 },
      { name: 'person:reception:1', x: 64, y: 80, pause: 0 },
      { name: 'person:reception:2', x: 128, y: 80 },
    ],
    [{ name: 'shadow:marketing', x: 128, y: 160, width: 48, height: 4 }],
  );
  const start: GameState = {
    ...run(map, createInitialState(map), NONE, NONE, NONE),
    shadowWalls: [{ wall: 0, lit: true, light: 30 }],
    lamp: { on: true, strength: 1 },
  };
  const ALL_OTHERS: GameInput = { ...NONE, up: true, down: true, lamp: true, talk: true };

  it('is not stepped in the step that opens it', () => {
    expect(start.movers[0]?.x).toBeGreaterThan(64);
    const open = update(start, JOURNAL, map);
    expect(open).toStrictEqual({ ...start, tick: 4, held: JOURNAL, journal: { tab: 'creatures' } });
  });

  it('stands still for 600 steps with every key but journal, left and right held', () => {
    const open = update(start, JOURNAL, map);
    let state = open;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, ALL_OTHERS, map);
    }
    expect(state).toStrictEqual({ ...open, tick: open.tick + 600, held: ALL_OTHERS });
  });

  it('moves again once the journal is closed', () => {
    const closed = run(map, update(start, JOURNAL, map), NONE, JOURNAL);
    expect(closed.journal).toBeNull();
    const later = run(map, closed, NONE, NONE);
    expect(later.creatures[0]?.x).toBeLessThan(start.creatures[0]?.x ?? 0);
    expect(later.movers[0]?.x).toBeGreaterThan(start.movers[0]?.x ?? 0);
    expect(later.lamp.on).toBe(false);
  });
});

describe('the journal in a saved state (INV-1, 0020)', () => {
  it('survives a JSON round trip at the start and open on the cases', () => {
    const start = createInitialState(OPEN);
    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
    const cases = run(OPEN, opened, NONE, RIGHT);
    expect(cases.journal).toStrictEqual({ tab: 'cases' });
    expect(JSON.parse(JSON.stringify(cases))).toStrictEqual(cases);
  });
});

describe('a game in which the journal is never opened (0020)', () => {
  const ROOT = fileURLToPath(new URL('../../', import.meta.url));
  const read = (file: string): unknown => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  const FLOOR = parseTileMap(
    read('public/maps/floor.tmj'),
    parseTileset(read('public/tiles/placeholder.tsj'), 'public/tiles/placeholder.tsj'),
    'public/maps/floor.tmj',
  );
  const within = (i: number, from: number, to: number): boolean => i >= from && i < to;
  /** To the counter, a word with the colleague behind it, the lamp, then right and down. */
  const inputAt = (i: number): GameInput => ({
    up: within(i, 0, 40),
    left: within(i, 40, 70),
    talk: within(i, 100, 103) || within(i, 140, 143),
    lamp: within(i, 200, 260),
    right: within(i, 300, 400),
    down: within(i, 450, 500),
    journal: false,
  });
  /** Everything of the state but what this feature added or replaced. */
  const world = (state: GameState): unknown => [
    state.tick,
    state.player,
    state.camera,
    state.lamp,
    state.creatures,
    state.movers,
    state.shadowWalls,
    state.figures,
    state.dialogue,
    state.captured,
    state.overview,
    state.dark,
  ];
  /** SHA-256 over the 600 states, recorded with the code of 0019 before this feature. */
  const RECORDED = '2556614ed7a215891b4389c620458f8965e7cd54e6b190c59b81f8f02ce070e0';

  it('steps exactly as before: 600 steps on the floor against the recording', () => {
    const hash = createHash('sha256');
    let state = createInitialState(FLOOR);
    let talked = false;
    for (let i = 0; i < 600; i += 1) {
      state = update(state, inputAt(i), FLOOR);
      hash.update(JSON.stringify(world(state)));
      talked ||= state.dialogue !== null;
      expect(state.journal).toBeNull();
    }
    expect(talked).toBe(true);
    expect(hash.digest('hex')).toBe(RECORDED);
  });
});
```

  `RECORDED` is the SHA-256 over 600 steps on the floor, computed with the code of `main` at
  `f096a86`, before this feature. It is the proof of criterion 14. Never change it: if the
  test fails, the world stepped differently, and that is the bug.

- [ ] **Step 2: Change the tests that build an input or a state.** Every complete `GameInput`
  literal gets `journal: false`; every `GameState` literal gets `journal: null` and
  `held: NO_INPUT` in place of `talkHeld: false`; every expectation on `talkHeld` becomes one
  on `held`, which is the input of the step before.

```diff
--- a/tests/unit/player.test.ts
+++ b/tests/unit/player.test.ts
@@ -21,6 +21,7 @@ const NONE: GameInput = {
   right: false,
   lamp: false,
   talk: false,
+  journal: false,
 };
 
 function press(...actions: readonly (keyof MovementInput)[]): GameInput {
@@ -31,6 +32,7 @@ function press(...actions: readonly (keyof MovementInput)[]): GameInput {
     right: actions.includes('right'),
     lamp: false,
     talk: false,
+    journal: false,
   };
 }
 
```

```diff
--- a/tests/unit/notice.test.ts
+++ b/tests/unit/notice.test.ts
@@ -13,6 +13,7 @@ const NONE: GameInput = {
   right: false,
   lamp: false,
   talk: false,
+  journal: false,
 };
 const SHINE: GameInput = { ...NONE, lamp: true };
 const HOLDS: ShadowWallState = { wall: 0, lit: true, light: 0 };
```

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -16,7 +16,7 @@ import {
   WAKE_STEP,
   wakePoint,
 } from '../../src/game/overview';
-import type { GameInput } from '../../src/game/player';
+import { type GameInput, NO_INPUT } from '../../src/game/player';
 import {
   type CreatureState,
   type Facing,
@@ -170,7 +170,8 @@ describe('stepDark', () => {
     shadowWalls: [{ wall: 1, lit: true, light: 30 }],
     figures: [],
     dialogue: null,
-    talkHeld: false,
+    journal: null,
+    held: NO_INPUT,
     captured: { snippet: 2 },
     overview: { current: 0, max: 3 },
     dark: 1,
@@ -205,7 +206,8 @@ describe('stepDark', () => {
       shadowWalls: [{ wall: 1, lit: false, light: 0 }],
       figures: [],
       dialogue: null,
-      talkHeld: false,
+      journal: null,
+      held: NO_INPUT,
       captured: { snippet: 2 },
       overview: { current: 3, max: 3 },
       dark: 45,
@@ -237,10 +239,19 @@ describe('overview in update', () => {
     right: false,
     lamp: false,
     talk: false,
+    journal: false,
   };
   const SHINE: GameInput = { ...NONE, lamp: true };
   const LEFT_SHINE: GameInput = { ...NONE, left: true, lamp: true };
-  const ALL: GameInput = { up: true, down: true, left: true, right: true, lamp: true, talk: false };
+  const ALL: GameInput = {
+    up: true,
+    down: true,
+    left: true,
+    right: true,
+    lamp: true,
+    talk: false,
+    journal: false,
+  };
   /** The figure at (160, 100) facing right, with these creatures. */
   const game = (
     creatures: readonly CreatureState[],
```

```diff
--- a/tests/unit/talk.test.ts
+++ b/tests/unit/talk.test.ts
@@ -26,6 +26,7 @@ const NONE: GameInput = {
   right: false,
   lamp: false,
   talk: false,
+  journal: false,
 };
 const TALK: GameInput = { ...NONE, talk: true };
 const RIGHT: GameInput = { ...NONE, right: true };
@@ -112,7 +113,7 @@ describe('opening a dialogue (0017)', () => {
     expect(opened).toStrictEqual({
       ...start,
       tick: 1,
-      talkHeld: true,
+      held: TALK,
       player: { ...start.player, facing: 'left' },
       figures: [{ figure: 0, facing: 'right' }],
       dialogue: { speaker: 'figure', index: 0, page: 0 },
@@ -123,7 +124,7 @@ describe('opening a dialogue (0017)', () => {
     const map = mapAt(200.1, 96);
     const next = update(createInitialState(map), TALK, map);
     expect(next.dialogue).toBeNull();
-    expect(next.talkHeld).toBe(true);
+    expect(next.held).toStrictEqual(TALK);
     expect(next.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
     expect(next.player.facing).toBe('down');
   });
@@ -209,7 +210,7 @@ describe('the pages of a dialogue (0017)', () => {
     });
     const released = update(opened, NONE, map);
     expect(released.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
-    expect(released.talkHeld).toBe(false);
+    expect(released.held).toStrictEqual(NONE);
     expect(update(released, TALK, map).dialogue).toStrictEqual({
       speaker: 'figure',
       index: 0,
@@ -258,6 +259,7 @@ describe('the world while a dialogue is open (0017)', () => {
     right: true,
     lamp: true,
     talk: false,
+    journal: false,
   };
 
   it('is not stepped in the step that opens it', () => {
@@ -274,7 +276,7 @@ describe('the world while a dialogue is open (0017)', () => {
     for (let step = 0; step < 600; step += 1) {
       state = update(state, ALL_BUT_TALK, map);
     }
-    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, talkHeld: false });
+    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, held: ALL_BUT_TALK });
   });
 
   it('moves again once it is closed', () => {
@@ -298,6 +300,7 @@ describe('a game without figures (0017)', () => {
       right: i % 240 < 60,
       lamp: i % 97 < 20,
       talk: false,
+      journal: false,
     }));
     let a = createInitialState(withFigure);
     let b = createInitialState(without);
@@ -402,7 +405,7 @@ describe('in sight (0018)', () => {
     const map = boxed(mapAt(184, 96), 'solids', 'opaque');
     const next = update(createInitialState(map), TALK, map);
     expect(next.dialogue).toBeNull();
-    expect(next.talkHeld).toBe(true);
+    expect(next.held).toStrictEqual(TALK);
     expect(next.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
   });
 
@@ -431,7 +434,7 @@ describe('talking to a colleague (0018)', () => {
     expect(opened).toStrictEqual({
       ...start,
       tick: 1,
-      talkHeld: true,
+      held: TALK,
       player: { ...start.player, facing: 'left' },
       movers: [{ ...start.movers[0], facing: 'right' }],
       dialogue: MOVER_TALK,
@@ -478,7 +481,7 @@ describe('talking to a colleague (0018)', () => {
     ]);
     const next = update(createInitialState(silent), TALK, silent);
     expect(next.dialogue).toBeNull();
-    expect(next.talkHeld).toBe(true);
+    expect(next.held).toStrictEqual(TALK);
     const dog = mapAt(74, 48, [
       { name: 'dog:reception:1', x: 64, y: 48, pause: 600 },
       { name: 'dog:reception:2', x: 128, y: 48 },
@@ -516,6 +519,7 @@ describe('a colleague during and after its saying (0018)', () => {
     right: true,
     lamp: true,
     talk: false,
+    journal: false,
   };
 
   it('stands still for 600 steps with every other key held: only the tick grows', () => {
@@ -541,7 +545,7 @@ describe('a colleague during and after its saying (0018)', () => {
     for (let step = 0; step < 600; step += 1) {
       state = update(state, ALL_BUT_TALK, map);
     }
-    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, talkHeld: false });
+    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, held: ALL_BUT_TALK });
   });
 
   it('closes with the first press after the opening: a saying has one page', () => {
@@ -626,6 +630,7 @@ describe('a game without speakers (0018)', () => {
       right: i % 240 < 60,
       lamp: i % 97 < 20,
       talk: false,
+      journal: false,
     }));
     let a = createInitialState(withSpeakers);
     let b = createInitialState(without);
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -1,5 +1,6 @@
 import { describe, expect, it } from 'vitest';
 import { EMPTY, type TileMap } from '../../src/engine/tiled';
+import { NO_INPUT } from '../../src/game/player';
 import {
   type CreatureState,
   type FigureState,
@@ -141,7 +142,8 @@ const state = (
   shadowWalls: [],
   figures: [],
   dialogue: null,
-  talkHeld: false,
+  journal: null,
+  held: NO_INPUT,
   captured: { snippet: 0 },
   // No hearts: the call lists of the earlier features stay as they were (0009).
   overview: { current: 0, max: 0 },
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -4,7 +4,7 @@ import { fileURLToPath } from 'node:url';
 import { describe, expect, it } from 'vitest';
 import { parseTileMap, parseTileset, type TileMap } from '../../src/engine/tiled';
 import { followPlayer } from '../../src/game/camera';
-import type { GameInput } from '../../src/game/player';
+import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../../src/game/state';
 import { createInitialState, update } from '../../src/game/update';
 import { grassMap } from './grass-map';
@@ -47,6 +47,7 @@ const NONE: GameInput = {
   right: false,
   lamp: false,
   talk: false,
+  journal: false,
 };
 const RIGHT: GameInput = { ...NONE, right: true };
 const UP_LEFT: GameInput = { ...NONE, up: true, left: true };
@@ -83,7 +84,8 @@ describe('GameState (INV-1)', () => {
       shadowWalls: [],
       figures: [],
       dialogue: null,
-      talkHeld: false,
+      journal: null,
+      held: NO_INPUT,
       captured: { snippet: 0 },
       overview: { current: 5, max: 5 },
       dark: 0,
@@ -139,7 +141,8 @@ describe('update', () => {
         shadowWalls: [],
         figures: [],
         dialogue: null,
-        talkHeld: false,
+        journal: null,
+        held: NO_INPUT,
         captured: { snippet: 0 },
         overview: { current: 3, max: 3 },
         dark: 0,
@@ -163,7 +166,8 @@ describe('update', () => {
       shadowWalls: [],
       figures: [],
       dialogue: null,
-      talkHeld: false,
+      journal: null,
+      held: NO_INPUT,
       captured: { snippet: 0 },
       overview: { current: 3, max: 3 },
       dark: 0,
@@ -179,7 +183,8 @@ describe('update', () => {
       shadowWalls: [],
       figures: [],
       dialogue: null,
-      talkHeld: false,
+      journal: null,
+      held: NO_INPUT,
       captured: { snippet: 0 },
       overview: { current: 3, max: 3 },
       dark: 0,
@@ -418,6 +423,7 @@ describe('movers in the state (0015)', () => {
       right: i % 240 < 60,
       lamp: i % 97 < 20,
       talk: false,
+      journal: false,
     }));
     let withMovers = createInitialState(FLOOR_MAP);
     let without: GameState = { ...withMovers, movers: [] };
@@ -577,6 +583,7 @@ describe('shadow walls in the state (0014)', () => {
       right: i % 240 < 60,
       lamp: i % 97 < 20,
       talk: false,
+      journal: false,
     }));
     const bare: TileMap = { ...FLOOR_MAP, rects: [] };
     let open: GameState = { ...createInitialState(FLOOR_MAP), shadowWalls: [] };
@@ -597,7 +604,7 @@ describe('standing figures in the state (0017)', () => {
     const state = createInitialState(FIGURES_MAP);
     expect(state.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
     expect(state.dialogue).toBeNull();
-    expect(state.talkHeld).toBe(false);
+    expect(state.held).toStrictEqual(NO_INPUT);
     expect(state.creatures).toHaveLength(1);
     expect(state.movers).toStrictEqual([]);
   });
@@ -614,12 +621,12 @@ describe('standing figures in the state (0017)', () => {
   it('remembers in every step whether talk was held: an ordinary step and a step of the dark', () => {
     const start = createInitialState(MAP);
     const held = update(start, TALK, MAP);
-    expect(held.talkHeld).toBe(true);
-    expect(update(held, NONE, MAP).talkHeld).toBe(false);
+    expect(held.held).toStrictEqual(TALK);
+    expect(update(held, NONE, MAP).held).toStrictEqual(NONE);
     const dark = update({ ...start, dark: 1 }, TALK, MAP);
     expect(dark.dark).toBe(2);
-    expect(dark.talkHeld).toBe(true);
-    expect(update(dark, NONE, MAP).talkHeld).toBe(false);
+    expect(dark.held).toStrictEqual(TALK);
+    expect(update(dark, NONE, MAP).held).toStrictEqual(NONE);
   });
 
   it('keeps the figures through the wake', () => {
@@ -666,3 +673,30 @@ describe('colleagues with lines in the state (0018)', () => {
     expect(JSON.parse(JSON.stringify(opened))).toStrictEqual(opened);
   });
 });
+
+describe('the journal in the state (0020)', () => {
+  const JOURNAL: GameInput = { ...NONE, journal: true };
+
+  it('starts closed, with no key remembered', () => {
+    const state = createInitialState(FLOOR_MAP);
+    expect(state.journal).toBeNull();
+    expect(state.held).toStrictEqual(NO_INPUT);
+    expect(NONE).toStrictEqual(NO_INPUT);
+  });
+
+  it('opens on the floor with a press and closes with the next, and nothing has moved', () => {
+    const start = createInitialState(FLOOR_MAP);
+    const open = update(start, JOURNAL, FLOOR_MAP);
+    expect(open).toStrictEqual({ ...start, tick: 1, held: JOURNAL, journal: { tab: 'creatures' } });
+    const closed = update(update(open, NONE, FLOOR_MAP), JOURNAL, FLOOR_MAP);
+    expect(closed).toStrictEqual({ ...start, tick: 3, held: JOURNAL });
+  });
+
+  it('keeps the journal closed through the wake', () => {
+    let state: GameState = { ...createInitialState(FLOOR_MAP), dark: 44 };
+    state = update(state, JOURNAL, FLOOR_MAP);
+    expect(state.dark).toBe(45);
+    expect(state.journal).toBeNull();
+    expect(state.held).toStrictEqual(JOURNAL);
+  });
+});
```

  And in `tests/e2e/smoke.spec.ts`, in the test of the officer, the line
  `expect(state?.talkHeld).toBe(false);` becomes `expect(state?.held.talk).toBe(false);`.

- [ ] **Step 3: Run and see it fail.**

Run: `npm run typecheck`
Expected: errors — `src/game/journal` does not exist, `NO_INPUT` and `pressed` are not
exported, and `journal` and `held` are no properties of the input and the state.

- [ ] **Step 4: The input and its press,** in `src/game/player.ts`:

```diff
--- a/src/game/player.ts
+++ b/src/game/player.ts
@@ -12,10 +12,34 @@ export interface MovementInput {
   readonly right: boolean;
 }
 
-/** Everything the game reads from the keys: the movement actions, `lamp`, on while Space is held (0007), and `talk`, on while E or Enter is held (0017). */
+/**
+ * Everything the game reads from the keys: the movement actions, `lamp`, on while Space is held
+ * (0007), `talk`, on while E or Enter is held (0017), and `journal`, on while J is held (0020).
+ */
 export interface GameInput extends MovementInput {
   readonly lamp: boolean;
   readonly talk: boolean;
+  readonly journal: boolean;
+}
+
+/** No key held: what the state remembers before the first step. */
+export const NO_INPUT: GameInput = {
+  up: false,
+  down: false,
+  left: false,
+  right: false,
+  lamp: false,
+  talk: false,
+  journal: false,
+};
+
+/**
+ * Whether `action` is pressed in this step: the input holds it and the last step's did not. The
+ * keyboard keeps no press (architecture.md §4), so the state does: `held` is the last step's
+ * input (0020; `talkHeld` until then).
+ */
+export function pressed(held: GameInput, input: GameInput, action: keyof GameInput): boolean {
+  return input[action] && !held[action];
 }
 
 /** Tune: 80 px/s is 1.333 px per step. */
```

- [ ] **Step 5: The state,** in `src/game/state.ts`. The import of `GameInput` is a type
  import; `player.ts` imports values from `state.ts`, and that stays the only direction at run
  time.

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -1,4 +1,5 @@
 import type { Point } from '../engine/tiled';
+import type { GameInput } from './player';
 
 /** The facings in sprite-sheet order: frame index = facing × PHASES_PER_FACING + phase. */
 export const FACINGS = ['down', 'up', 'left', 'right'] as const;
@@ -112,6 +113,15 @@ export interface Dialogue {
   readonly page: number;
 }
 
+/** The tabs of the journal (gameplay.md §7), in their order on the screen (0020). */
+export const JOURNAL_TABS = ['creatures', 'cases', 'policy'] as const;
+export type JournalTab = (typeof JOURNAL_TABS)[number];
+
+/** The open journal (0020). What its tabs show is derived from the rest of the state. */
+export interface JournalState {
+  readonly tab: JournalTab;
+}
+
 /** How many creatures of each species were captured. */
 export type Captured = Readonly<Record<Species, number>>;
 
@@ -146,8 +156,10 @@ export interface GameState {
   readonly figures: readonly FigureState[];
   /** The dialogue that is open, or null. While it is open nothing else is stepped (0017). */
   readonly dialogue: Dialogue | null;
-  /** Whether the last step's input held `talk`: a press is held now and not then (0017). */
-  readonly talkHeld: boolean;
+  /** The journal that is open, or null. While it is open nothing else is stepped (0020). */
+  readonly journal: JournalState | null;
+  /** The last step's input: an action is pressed when it is held now and was not then (0020). */
+  readonly held: GameInput;
   /** Captured creatures per species; the journal (M4) reads it. */
   readonly captured: Captured;
   readonly overview: Overview;
```

- [ ] **Step 6: Create `src/game/journal.ts`:**

```ts
import { type TextKey, textKey } from '../text/text';
import { type GameInput, pressed } from './player';
import {
  type Captured,
  type GameState,
  JOURNAL_TABS,
  type JournalState,
  type JournalTab,
  SPECIES,
  type Species,
} from './state';

/**
 * The journal (gameplay.md §7, feature 0020): the only screen besides the game itself. A press
 * of `journal` opens it on the creatures; `left` and `right` turn its three tabs; a press of
 * `journal` closes it. While it is open nothing in the world is stepped — time passes, and
 * that is all. What a tab shows is derived from the state. Pure data and pure functions.
 */

/** A tab's title, and the line it shows while it has nothing. */
export interface TabText {
  readonly title: TextKey;
  readonly nothing: TextKey;
}

export const TAB_TEXT: Readonly<Record<JournalTab, TabText>> = {
  creatures: {
    title: textKey('journal.tab-creatures'),
    nothing: textKey('journal.no-creatures'),
  },
  cases: { title: textKey('journal.tab-cases'), nothing: textKey('journal.no-cases') },
  policy: { title: textKey('journal.tab-policy'), nothing: textKey('journal.no-policy') },
};

/** A species' entry: its name and what it is, what it lives on and what makes it go. */
export interface EntryText {
  readonly name: TextKey;
  readonly text: TextKey;
}

/** A literal over the species, so a new species does not compile until it has its entry. */
export const ENTRY_TEXT: Readonly<Record<Species, EntryText>> = {
  snippet: { name: textKey('creature.snippet-name'), text: textKey('creature.snippet-text') },
};

/** The entries of the creatures tab: every species captured at least once, in SPECIES order. */
export function entriesOf(captured: Captured): Species[] {
  return SPECIES.filter((species) => captured[species] > 0);
}

/**
 * The state after a press that opens the journal, or null when `journal` is not pressed: the
 * journal on its first tab, the tick grown, the input remembered. Nothing else changes,
 * whatever else the input holds: a figure in mid-step, a push and a lamp that is on stay as
 * they are and go on when the journal closes.
 */
export function openJournal(state: GameState, input: GameInput): GameState | null {
  if (!pressed(state.held, input, 'journal')) {
    return null;
  }
  return { ...state, tick: state.tick + 1, held: input, journal: { tab: JOURNAL_TABS[0] } };
}

/**
 * One step with the journal open: the tick grows and the input is remembered. A press of
 * `journal` closes it. Otherwise a press of `right` alone turns to the next tab and a press of
 * `left` alone to the one before; at either end the tab stays. Nothing else changes.
 */
export function stepJournal(state: GameState, journal: JournalState, input: GameInput): GameState {
  const stepped = { ...state, tick: state.tick + 1, held: input };
  if (pressed(state.held, input, 'journal')) {
    return { ...stepped, journal: null };
  }
  const turn =
    (pressed(state.held, input, 'right') ? 1 : 0) - (pressed(state.held, input, 'left') ? 1 : 0);
  const index = JOURNAL_TABS.indexOf(journal.tab) + turn;
  return { ...stepped, journal: { tab: JOURNAL_TABS[index] ?? journal.tab } };
}
```

- [ ] **Step 7: `held` in place of `talkHeld`,** in `src/game/talk.ts` and
  `src/game/overview.ts`:

```diff
--- a/src/game/talk.ts
+++ b/src/game/talk.ts
@@ -3,7 +3,7 @@ import type { Point, TileMap } from '../engine/tiled';
 import type { TextKey } from '../text/text';
 import { COLLEAGUES, type Colleague, type Figure, pagesOfRoute } from './cast';
 import type { Route } from './mover';
-import { BOX_HEIGHT, type GameInput } from './player';
+import { BOX_HEIGHT, type GameInput, pressed } from './player';
 import type { Dialogue, Facing, GameState, MoverState, SpeakerKind } from './state';
 
 /**
@@ -19,10 +19,10 @@ export const TALK_DISTANCE = 40;
 
 /**
  * Whether `talk` is pressed in this step: the input holds it and the last step's did not. The
- * keyboard keeps no press (architecture.md §4), so the state does, in `talkHeld`.
+ * keyboard keeps no press (architecture.md §4), so the state does, in `held`.
  */
 export function talkPressed(state: GameState, input: GameInput): boolean {
-  return input.talk && !state.talkHeld;
+  return pressed(state.held, input, 'talk');
 }
 
 /**
@@ -147,7 +147,7 @@ export function openDialogue(
   return {
     ...state,
     tick: state.tick + 1,
-    talkHeld: true,
+    held: input,
     player: {
       ...player,
       facing: facingToward(player, speaker, player.facing),
@@ -181,7 +181,7 @@ export function openDialogue(
 }
 
 /**
- * One step with a dialogue open: the tick grows, the key is remembered, and a press turns to
+ * One step with a dialogue open: the tick grows, the input is remembered, and a press turns to
  * the next page or, on the last page, closes the dialogue. Nothing else changes.
  */
 export function stepDialogue(
@@ -195,7 +195,7 @@ export function stepDialogue(
   return {
     ...state,
     tick: state.tick + 1,
-    talkHeld: input.talk,
+    held: input,
     dialogue: page < pages ? { ...dialogue, page } : null,
   };
 }
```

```diff
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -143,7 +143,8 @@ function woken(state: GameState, map: TileMap): GameState {
     shadowWalls: restedWalls(state.shadowWalls),
     figures: state.figures,
     dialogue: null,
-    talkHeld: state.talkHeld,
+    journal: null,
+    held: state.held,
     captured: state.captured,
     overview: { current: state.overview.max, max: state.overview.max },
     dark: state.dark,
```

- [ ] **Step 8: The journal's step in `update`,** `src/game/update.ts`. Update the two doc
  comments of the file as well: the initial state has the journal closed and no key
  remembered; a step with the journal open is the journal's and nothing else, and a press of
  `journal` opens it before a press of `talk` is looked at (0020).

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -2,9 +2,10 @@ import type { TileMap } from '../engine/tiled';
 import { followPlayer } from './camera';
 import { figuresFrom, figuresOf } from './cast';
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
+import { openJournal, stepJournal } from './journal';
 import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
 import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
-import { type GameInput, stepPlayer } from './player';
+import { type GameInput, NO_INPUT, stepPlayer } from './player';
 import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
 import { type GameState, type LampState, NO_RECOIL, type PlayerState } from './state';
 import { openDialogue, speakersOf, stepDialogue } from './talk';
@@ -45,7 +46,8 @@ export function createInitialState(map: TileMap): GameState {
     shadowWalls: standingWalls(walls),
     figures: figuresFrom(figures),
     dialogue: null,
-    talkHeld: false,
+    journal: null,
+    held: NO_INPUT,
     captured: noCaptures(),
     overview: initialOverview(),
     dark: 0,
@@ -69,13 +71,20 @@ export function createInitialState(map: TileMap): GameState {
  */
 export function update(state: GameState, input: GameInput, content: TileMap): GameState {
   if (state.dark > 0) {
-    return { ...stepDark(state, content), talkHeld: input.talk };
+    return { ...stepDark(state, content), held: input };
+  }
+  if (state.journal !== null) {
+    return stepJournal(state, state.journal, input);
   }
   const routes = routesOf(content.points);
   const speakers = speakersOf(figuresOf(content.points), state.movers, routes);
   if (state.dialogue !== null) {
     return stepDialogue(state, state.dialogue, input, speakers);
   }
+  const journal = openJournal(state, input);
+  if (journal !== null) {
+    return journal;
+  }
   // In sight is tested against the map as loaded: a shadow wall does not stop a conversation.
   const opened = openDialogue(state, input, speakers, content);
   if (opened !== null) {
@@ -112,7 +121,8 @@ export function update(state: GameState, input: GameInput, content: TileMap): Ga
     shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content),
     figures: state.figures,
     dialogue: null,
-    talkHeld: input.talk,
+    journal: null,
+    held: input,
     captured,
     overview,
     dark,
```

- [ ] **Step 9: The key,** in `src/main.ts`:

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -177,6 +177,7 @@ const BINDINGS: Bindings<Action> = {
   right: ['ArrowRight', 'KeyD'],
   lamp: ['Space'],
   talk: ['KeyE', 'Enter'],
+  journal: ['KeyJ'],
   fullscreen: ['KeyF'],
   language: ['KeyL'],
 };
@@ -204,8 +205,8 @@ window.addEventListener('keydown', (event) => {
 
 /** The game's actions of this frame; `fullscreen` and `language` stay in main.ts. */
 function readInput(): GameInput {
-  const { up, down, left, right, lamp, talk } = resolveActions(keyboard.held, BINDINGS);
-  return { up, down, left, right, lamp, talk };
+  const { up, down, left, right, lamp, talk, journal } = resolveActions(keyboard.held, BINDINGS);
+  return { up, down, left, right, lamp, talk, journal };
 }
 
 /** Loading finishes before the first frame; until then the page shows its background. */
```

- [ ] **Step 10: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/journal.test.ts`
Expected: PASS — 33 tests. Then `npm run test`: 916 tests, every file green; the
architecture test now also checks `journal.ts`.

- [ ] **Step 11:** `npm run check`, then commit —
  `Remember the whole input, and open the journal with J`. The body says why the state holds
  the whole input now: the journal needs presses of three actions, and one field per key does
  not scale.

---

### Task 3: The journal's screen

**Files:**
- Create: `src/render/draw-journal.ts`, `tests/unit/draw-journal.test.ts`
- Modify: `src/render/draw-scene.ts`

**Interfaces:**
- Consumes: `TAB_TEXT`, `ENTRY_TEXT`, `entriesOf` from `game/journal`; `JOURNAL_TABS`,
  `JournalState` from `game/state`; the types `SceneContent` and `SceneSettings` from
  `render/draw-scene`.
- Produces, in `render/draw-journal`: the constants `TAB_LEFT`, `TAB_TOP`, `TAB_WIDTH`,
  `TAB_HEIGHT`, `TAB_PITCH`, `TAB_TITLE_INSET`, `TAB_OPEN`, `TAB_CLOSED`, `JOURNAL_RULE`,
  `NOTHING_TEXT`, `ENTRY_PICTURE`, `ENTRY_NAME`, `ENTRY_LINES`, `ENTRY_PITCH`, `ENTRY_FRAME`;
  `tabBox(k): Box`; `tabTitleOrigin(k, length): Point`;
  `drawJournal(renderer, state, journal, content, settings): void`.

- [ ] **Step 1: Create `tests/unit/draw-journal.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import { NO_INPUT } from '../../src/game/player';
import { type GameState, type JournalTab, NO_RECOIL } from '../../src/game/state';
import {
  drawJournal,
  ENTRY_FRAME,
  ENTRY_LINES,
  ENTRY_NAME,
  ENTRY_PICTURE,
  ENTRY_PITCH,
  JOURNAL_RULE,
  NOTHING_TEXT,
  TAB_CLOSED,
  TAB_OPEN,
  tabBox,
  tabTitleOrigin,
} from '../../src/render/draw-journal';
import {
  drawScene,
  FROZEN_FRAME,
  type SceneContent,
  type SceneSettings,
} from '../../src/render/draw-scene';
import type { Renderer, SpriteSheet } from '../../src/render/renderer';
import { grassMap } from './grass-map';

/** A renderer that only records what it was asked to draw, one line per call. */
function recordingRenderer(): Renderer & {
  readonly calls: string[];
  readonly sheets: SpriteSheet[];
} {
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

const sheet = (frameWidth: number, frameHeight: number): SpriteSheet => ({
  image: {} as ImageBitmap,
  frameWidth,
  frameHeight,
});
const CONTENT: SceneContent = {
  map: grassMap(20, 12, { x: 160, y: 96 }),
  tileset: { image: {} as ImageBitmap, columns: 7 },
  playerSheet: sheet(16, 24),
  lampSheet: sheet(48, 48),
  creatureSheets: { snippet: sheet(16, 16) },
  overviewSheet: sheet(8, 8),
  shadowWallSheet: sheet(16, 16),
  moverSheets: {
    person: [0, 1, 2, 3].map(() => sheet(16, 24)),
    dog: sheet(16, 16),
    vacuum: sheet(16, 16),
    drone: sheet(16, 16),
  },
  fontSheet: sheet(6, 10),
  figureSheets: { officer: sheet(16, 24) },
};
const GERMAN: SceneSettings = { language: 'de', switchedAt: null };
const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
/** A game with the journal open on `tab`: five hearts, the lamp on, `snippets` captured. */
const reading = (tab: JournalTab, snippets = 0): GameState => ({
  tick: 100,
  player: {
    x: 160,
    y: 96,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
    grace: 0,
    recoil: NO_RECOIL,
  },
  camera: { x: 0, y: 0 },
  lamp: { on: true, strength: 1 },
  creatures: [],
  movers: [],
  shadowWalls: [],
  figures: [],
  dialogue: null,
  journal: { tab },
  held: NO_INPUT,
  captured: { snippet: snippets },
  overview: { current: 5, max: 5 },
  dark: 0,
});
const draw = (state: GameState, settings = GERMAN) => {
  const renderer = recordingRenderer();
  if (state.journal !== null) {
    drawJournal(renderer, state, state.journal, CONTENT, settings);
  }
  return renderer;
};
const RULE = 'fillRect 8,22 304x2 #3a4466';

describe('the journal on the surface (0020)', () => {
  it('places the tabs, the rule and the content as the spec says', () => {
    expect([0, 1, 2].map(tabBox)).toStrictEqual([
      { x: 8, y: 6, width: 100, height: 16 },
      { x: 110, y: 6, width: 100, height: 16 },
      { x: 212, y: 6, width: 100, height: 16 },
    ]);
    expect([TAB_OPEN, TAB_CLOSED]).toStrictEqual(['#3a4466', '#262b44']);
    expect(JOURNAL_RULE).toStrictEqual({ x: 8, y: 22, width: 304, height: 2 });
    expect(NOTHING_TEXT).toStrictEqual({ x: 16, y: 36 });
    expect([ENTRY_PICTURE, ENTRY_NAME, ENTRY_LINES]).toStrictEqual([
      { x: 16, y: 32 },
      { x: 40, y: 35 },
      { x: 16, y: 54 },
    ]);
    expect(ENTRY_PITCH).toBe(72);
    // The creature as the light shows it.
    expect(ENTRY_FRAME).toBe(FROZEN_FRAME);
    // A second entry of four lines ends at y = 172, on the surface.
    expect(ENTRY_LINES.y + ENTRY_PITCH + 3 * 12 + 10).toBe(172);
  });

  it('centres a title of n characters in tab k: (58 + 102k − 3n, 9)', () => {
    expect(tabTitleOrigin(0, 9)).toStrictEqual({ x: 31, y: 9 });
    expect(tabTitleOrigin(1, 5)).toStrictEqual({ x: 145, y: 9 });
    expect(tabTitleOrigin(2, 10)).toStrictEqual({ x: 232, y: 9 });
    expect(tabTitleOrigin(2, 6)).toStrictEqual({ x: 244, y: 9 });
    expect(tabTitleOrigin(0, 16)).toStrictEqual({ x: 10, y: 9 });
  });

  it('draws the clear, the three tabs with their titles, the rule and the line for nothing', () => {
    const { calls, sheets } = draw(reading('creatures'));
    expect(calls[0]).toBe('clear #181425');
    expect(calls[1]).toBe('fillRect 8,6 100x16 #3a4466');
    // `Kreaturen`: nine glyphs, the first is `K`.
    expect(calls[2]).toBe('drawSprite 43 at 31,9');
    expect(calls[11]).toBe('fillRect 110,6 100x16 #262b44');
    // `Fälle`: five glyphs.
    expect(calls[12]).toBe('drawSprite 38 at 145,9');
    expect(calls[17]).toBe('fillRect 212,6 100x16 #262b44');
    // `Richtlinie`: ten glyphs.
    expect(calls[18]).toBe('drawSprite 50 at 232,9');
    expect(calls[28]).toBe(RULE);
    // `Noch keine Kreatur gefangen.`: 28 characters, 25 of them drawn.
    expect(calls[29]).toBe('drawSprite 46 at 16,36');
    expect(calls).toHaveLength(29 + 25);
    expect(calls.at(-1)).toBe('drawSprite 14 at 178,36');
    // Nothing of the world: no tile, and every sprite is a glyph.
    expect(calls.some((call) => call.startsWith('drawTile'))).toBe(false);
    expect(sheets.every((used) => used === CONTENT.fontSheet)).toBe(true);
  });

  it.each<readonly [JournalTab, number, string]>([
    ['creatures', 0, 'drawSprite 46 at 16,36'],
    ['cases', 1, 'drawSprite 46 at 16,36'],
    ['policy', 2, 'drawSprite 36 at 16,36'],
  ])('lights the tab %s and shows its line for nothing', (tab, open, first) => {
    const { calls } = draw(reading(tab));
    const tabs = calls.filter((call) => call.startsWith('fillRect') && call.includes(' 100x16 '));
    expect(tabs).toStrictEqual(
      [8, 110, 212].map((x, k) => `fillRect ${x},6 100x16 ${k === open ? '#3a4466' : '#262b44'}`),
    );
    expect(calls[calls.indexOf(RULE) + 1]).toBe(first);
  });

  it('shows the cases and the policy empty also when a snippet is captured', () => {
    for (const tab of ['cases', 'policy'] as const) {
      expect(draw(reading(tab, 2)).calls).toStrictEqual(draw(reading(tab)).calls);
    }
  });

  it("shows a captured snippet's entry: its picture, its name and its four lines", () => {
    const { calls, sheets } = draw(reading('creatures', 1));
    const entry = calls.slice(calls.indexOf(RULE) + 1);
    expect(entry[0]).toBe('drawSprite 2 at 16,32');
    // Five calls before it are no sprites: the clear, the three tabs and the rule.
    expect(sheets[calls.indexOf(RULE) + 1 - 5]).toBe(CONTENT.creatureSheets.snippet);
    // `Schnipsel`: nine glyphs from (40, 35).
    expect(entry[1]).toBe('drawSprite 51 at 40,35');
    expect(entry[9]).toBe('drawSprite 76 at 88,35');
    const text = entry.slice(10);
    // 35 + 45 + 42 + 43 characters with 6 + 6 + 7 + 6 spaces: 140 glyphs.
    expect(text).toHaveLength(140);
    expect(text[0]).toBe('drawSprite 37 at 16,54');
    expect(text).toContain('drawSprite 99 at 16,66');
    expect(text).toContain('drawSprite 65 at 16,78');
    expect(text).toContain('drawSprite 83 at 16,90');
    // The line for nothing is gone: nothing is drawn at its place.
    expect(calls.some((call) => call.endsWith(' at 16,36'))).toBe(false);
    // One capture or three: the same entry.
    expect(draw(reading('creatures', 3)).calls).toStrictEqual(calls);
  });

  it('draws in the language of the settings', () => {
    const { calls } = draw(reading('creatures', 1), ENGLISH);
    // `Creatures`, `Cases`, `Policy`.
    expect(calls[2]).toBe('drawSprite 35 at 31,9');
    expect(calls[12]).toBe('drawSprite 35 at 145,9');
    expect(calls[18]).toBe('drawSprite 48 at 244,9');
    const entry = calls.slice(calls.indexOf(RULE) + 1);
    // `Snippet`: seven glyphs, then `A piece of text …`.
    expect(entry[1]).toBe('drawSprite 51 at 40,35');
    expect(entry[8]).toBe('drawSprite 33 at 16,54');
    const nothing = draw(reading('cases'), ENGLISH).calls;
    // `No case opened yet.`: 19 characters, 16 drawn.
    expect(nothing.slice(nothing.indexOf(RULE) + 1)).toHaveLength(16);
  });
});

describe('the journal in the scene (0020)', () => {
  it('is all the scene draws while it is open: no world, no heart, no notice, no lid', () => {
    for (const settings of [GERMAN, ENGLISH, { language: 'en', switchedAt: 100 } as const]) {
      const scene = recordingRenderer();
      drawScene(scene, reading('creatures', 1), CONTENT, settings);
      expect(scene.calls).toStrictEqual(draw(reading('creatures', 1), settings).calls);
    }
  });

  it('gives way to the world when it is closed', () => {
    const scene = recordingRenderer();
    drawScene(scene, { ...reading('creatures'), journal: null }, CONTENT, GERMAN);
    expect(scene.calls.filter((call) => call.startsWith('drawTile')).length).toBeGreaterThan(0);
    expect(scene.calls).not.toContain(RULE);
    expect(scene.sheets).toContain(CONTENT.playerSheet);
    expect(scene.sheets).toContain(CONTENT.overviewSheet);
  });
});
```

- [ ] **Step 2: Run it and see it fail.**

Run: `npx vitest run tests/unit/draw-journal.test.ts`
Expected: FAIL — `src/render/draw-journal` does not exist.

- [ ] **Step 3: Create `src/render/draw-journal.ts`:**

```ts
import type { Box, Point } from '../engine/tiled';
import { ENTRY_TEXT, entriesOf, TAB_TEXT } from '../game/journal';
import { type GameState, JOURNAL_TABS, type JournalState } from '../game/state';
import { textOf } from '../text/text';
import type { SceneContent, SceneSettings } from './draw-scene';
import { drawText } from './draw-text';
import { GLYPH_WIDTH } from './font';
import { PAGE_BACKGROUND, type PaletteColour } from './palette';
import type { Renderer } from './renderer';

/**
 * The journal's screen (gameplay.md §7, visual.md §3, feature 0020): three tabs along the top,
 * a rule under them, and the open tab's content — its entries, or one line that it has none.
 * It is drawn instead of the world, on the surface, in the language of the scene's settings.
 */

/** Tab k, from 0, is TAB_WIDTH wide and starts TAB_PITCH right of tab k − 1. */
export const TAB_LEFT = 8;
export const TAB_TOP = 6;
export const TAB_WIDTH = 100;
export const TAB_HEIGHT = 16;
export const TAB_PITCH = 102;
/** The room above a title in its tab: the title is 10 px high in 16. */
export const TAB_TITLE_INSET = 3;
export const TAB_OPEN: PaletteColour = '#3a4466';
export const TAB_CLOSED: PaletteColour = '#262b44';
/** The rule the open tab stands on, in the open tab's colour. */
export const JOURNAL_RULE: Box = { x: 8, y: 22, width: 304, height: 2 };
/** Where a tab's line for nothing starts. */
export const NOTHING_TEXT: Point = { x: 16, y: 36 };
/** Entry k, from 0, starts ENTRY_PITCH below entry k − 1: the picture, the name, the text. */
export const ENTRY_PICTURE: Point = { x: 16, y: 32 };
export const ENTRY_NAME: Point = { x: 40, y: 35 };
export const ENTRY_LINES: Point = { x: 16, y: 54 };
export const ENTRY_PITCH = 72;
/** The creature as the light shows it: the frozen frame of its sheet. */
export const ENTRY_FRAME = 2;

/** The rectangle of tab k. */
export function tabBox(k: number): Box {
  return { x: TAB_LEFT + k * TAB_PITCH, y: TAB_TOP, width: TAB_WIDTH, height: TAB_HEIGHT };
}

/** Where a title of `length` characters starts in tab k: centred, (58 + 102k − 3n, 9). */
export function tabTitleOrigin(k: number, length: number): Point {
  const box = tabBox(k);
  return {
    x: box.x + (box.width - length * GLYPH_WIDTH) / 2,
    y: box.y + TAB_TITLE_INSET,
  };
}

export function drawJournal(
  renderer: Renderer,
  state: GameState,
  journal: JournalState,
  content: SceneContent,
  settings: SceneSettings,
): void {
  const { language } = settings;
  renderer.clear(PAGE_BACKGROUND);
  for (const [k, tab] of JOURNAL_TABS.entries()) {
    const box = tabBox(k);
    renderer.fillRect(
      box.x,
      box.y,
      box.width,
      box.height,
      tab === journal.tab ? TAB_OPEN : TAB_CLOSED,
    );
    const { title } = TAB_TEXT[tab];
    const origin = tabTitleOrigin(k, textOf(title, language).length);
    drawText(renderer, content.fontSheet, title, language, origin.x, origin.y);
  }
  renderer.fillRect(
    JOURNAL_RULE.x,
    JOURNAL_RULE.y,
    JOURNAL_RULE.width,
    JOURNAL_RULE.height,
    TAB_OPEN,
  );
  // Only the creatures have entries so far; the cases and the policy come with M5.
  const entries = journal.tab === 'creatures' ? entriesOf(state.captured) : [];
  if (entries.length === 0) {
    drawText(
      renderer,
      content.fontSheet,
      TAB_TEXT[journal.tab].nothing,
      language,
      NOTHING_TEXT.x,
      NOTHING_TEXT.y,
    );
    return;
  }
  for (const [k, species] of entries.entries()) {
    const down = k * ENTRY_PITCH;
    const { name, text } = ENTRY_TEXT[species];
    renderer.drawSprite(
      content.creatureSheets[species],
      ENTRY_FRAME,
      ENTRY_PICTURE.x,
      ENTRY_PICTURE.y + down,
    );
    drawText(renderer, content.fontSheet, name, language, ENTRY_NAME.x, ENTRY_NAME.y + down);
    drawText(renderer, content.fontSheet, text, language, ENTRY_LINES.x, ENTRY_LINES.y + down);
  }
}
```

- [ ] **Step 4: Let the scene draw it,** in `src/render/draw-scene.ts`:

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -20,6 +20,7 @@ import {
 } from '../game/state';
 import { speakerOf, speakersOf } from '../game/talk';
 import { type Language, textKey, textOf } from '../text/text';
+import { drawJournal } from './draw-journal';
 import { drawLayer } from './draw-map';
 import { drawText } from './draw-text';
 import { GLYPH_HEIGHT, GLYPH_WIDTH } from './font';
@@ -320,7 +321,8 @@ export function lidHeight(dark: number): number {
  * (0017), else the notice — the bar and its line (0016) — else, for two seconds after a switch
  * of the language, the language line in the same bar (0019); all on the surface and not
  * shifted by the camera; and last the two lids of the dark (0009). Every text is drawn in the
- * language of the settings. A safe figure blinks; its cone and the movers do not.
+ * language of the settings. A safe figure blinks; its cone and the movers do not. While the
+ * journal is open the frame is the journal's alone (0020, render/draw-journal).
  */
 export function drawScene(
   renderer: Renderer,
@@ -328,6 +330,10 @@ export function drawScene(
   content: SceneContent,
   settings: SceneSettings,
 ): void {
+  if (state.journal !== null) {
+    drawJournal(renderer, state, state.journal, content, settings);
+    return;
+  }
   const { language } = settings;
   const { player, camera } = state;
   renderer.clear(PAGE_BACKGROUND);
```

- [ ] **Step 5: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/draw-journal.test.ts`
Expected: PASS — 11 tests. Then `npm run test`: 927 tests.

- [ ] **Step 6:** `npm run check`, then commit — `Draw the journal instead of the world`.

---

### Task 4: The smoke spec

**Files:**
- Test: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Add the test** at the end of the file. The keys are held until the state
  shows them, because the game reads the held keys once per frame:

```ts
test('J opens the journal on the creatures and closes it again', async ({ page }) => {
  await page.goto('/');
  const journal = () => page.evaluate(() => window.shadowAi?.state.journal);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.held.journal), {
      message: 'window.shadowAi.state.held is there: the game runs, and J is not held',
    })
    .toBe(false);
  expect(await journal()).toBeNull();
  // The game reads the held keys once per frame, so a key stays down until the state shows it.
  await page.keyboard.down('KeyJ');
  await expect.poll(journal, { message: 'J opens the journal' }).toStrictEqual({
    tab: 'creatures',
  });
  await page.keyboard.up('KeyJ');
  await page.keyboard.down('ArrowRight');
  await expect.poll(journal, { message: 'the right arrow turns to the cases' }).toStrictEqual({
    tab: 'cases',
  });
  await page.keyboard.up('ArrowRight');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.held.journal), {
      message: 'J was let go',
    })
    .toBe(false);
  await page.keyboard.down('KeyJ');
  await expect.poll(journal, { message: 'a second press of J closes it' }).toBeNull();
  await page.keyboard.up('KeyJ');
});
```

- [ ] **Step 2: Run.**

Run: `npm run test:e2e`
Expected: PASS — eleven tests, three skipped (they need the container). If a dev server
already runs on port 5173, Playwright uses it. This test passes at once: Tasks 2 and 3 built
what it checks.

- [ ] **Step 3:** `npm run check`, then commit — `Open and close the journal in the smoke spec`.

---

### Task 5: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/architecture.md`,
  `docs/spec/visual.md`, `docs/spec/testing.md`, `README.md`

- [ ] **Step 1: `gameplay.md`.** §7: add a paragraph **As built** (feature 0020): `J` opens
  the journal on the creatures and closes it; the left and right keys of walking turn the
  three tabs, and stop at either end; the game stands still while it is open; a species has
  its entry as soon as one of it is captured — its picture, its name and two to four lines;
  the cases and the policy say in one line that they are empty until M5; no count of
  captures, no pages yet. §8: the list of keys gains `J`.

- [ ] **Step 2: `world.md` §4,** at the snippet: its displayed name is `Schnipsel`, in English
  `Snippet`, and its journal text is fixed with feature 0020 — replace the sentence that says
  both are fixed with the journal (M4). Keep the note on the name check in the words of the
  spec's settled question: a dictionary word, fixed by the author's decision; no trademark
  register was searched.

- [ ] **Step 3: `architecture.md`.** §1 directory list: `game/journal.ts` and
  `render/draw-journal.ts`. §2: `journal` is `null` or `{ tab }`; `held` is the last step's
  input and replaces `talkHeld` — an action is pressed when the input holds it and `held` does
  not; a step is now one of four kinds — dark, journal, dialogue, ordinary — and what the
  journal's step changes; the opening of the journal comes before the opening of a dialogue;
  the entries are derived from `captured`. §4: the action `journal` ← J, the game gets seven
  actions; correct the sentences on `talkHeld` and on "later `journal`". §5: while the journal
  is open the scene draws the journal and nothing else — the tabs, the rule, the content,
  with their rectangles and origins. §8: the kinds `journal` and `creature` and the rule of
  each.

- [ ] **Step 4: `visual.md` §3:** "The display" gains the journal: a dark screen, three tabs
  in two blues — `#3a4466` open, `#262b44` closed — a rule in the open tab's colour, the
  creature's own 16x16 picture beside its name.

- [ ] **Step 5: `testing.md` §2.** The INV-1 row gains the round trips at the start and with
  the journal open on the cases (0020). The INV-4 row gains the rules of the journal's texts.
  Add where the section speaks of regression: the 600 recorded steps on the floor whose
  digest was taken before 0020.

- [ ] **Step 6: `README.md`:** one sentence after the one on the language — `J` opens the
  journal with its three tabs; a captured snippet has its entry there (feature 0020).
  Milestone M4 is complete with this feature: say so where the README says that M3 is, and
  in `docs/plan.md` §4 end the M4 section with "M4 is done: 0020 was the last of the five" —
  in Task 8, with the status.

- [ ] **Step 7:** `npm run check`, then commit — `Move the journal into the spec`.

---

### Task 6: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [ ] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [ ] **Step 5:** tick the boxes of Tasks 1 to 6 in this file and commit —
  `Tick the full check of 0020`.

---

### Task 7: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow keys
  or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk, `L` for the language, `J` for
  the journal, and that the walk begins with a reload. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–26 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 6, and start again at step 1.
- [ ] **Step 4:** after step 26 ask the six feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–26`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0020`. A feel note that wants something
  else — another key, a count, a larger picture, a hint on the keys, other words — becomes a
  new draft, not a change on this branch.

---

### Task 8: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 6. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`; in `docs/plan.md` §4 change "0020 is approved" to say that all
  five are implemented and that M4 is done: 0020 was the last of the five; commit —
  `Mark 0020 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0020: the journal`, with the walk's result and feel notes in its description. CI
  must be green. The author merges.
