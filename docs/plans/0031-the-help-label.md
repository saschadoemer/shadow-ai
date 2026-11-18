# 0031 — Implementation plan: the help label

**Spec:** [`docs/features/0031-the-help-label.md`](../features/0031-the-help-label.md) (approved
2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read the spec
first, then `CLAUDE.md`, then `docs/spec/architecture.md` §2, §5 and §8, `docs/spec/visual.md`
§3, `docs/spec/gameplay.md` §8 and `docs/spec/testing.md` §5. **Written:** 2026-11-18 on the
planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed. Where the session has the skill
`superpowers:executing-plans`, it follows it for Tasks 1 to 7.

**Precondition:** feature 0027 is merged into `main` (`69f04d4`), as the spec's order asks.
The branch `feature/0031-the-help-label` exists and holds the spec, its approval and this plan,
with `main` at `eeefcd6` merged in. Work on it, and merge the latest `main` into it before
Task 1. The specs of 0028 and 0029 are approved and are **not** built here. The roadmap names
the creature of Marketing as 0032 since the merge on this branch; `main` still says 0031
there until this feature's pull request is merged.

**Goal:** a small label in the top right corner — `H Hilfe` or `H Help` — names the key of the
help for as long as the world is on screen, and the line that named it in the bar for ten
seconds is gone, with the field of the state that only it read.

**Approach:** five code tasks, each green on its own. The words (T1). The label as
`render/draw-help` draws it, with its place by the number of characters (T2). The scene draws
it after the hearts (T3); from here the game a browser shows has the label, and still the
start hint. The start hint goes: `quietLine`, the four names of `game/help`, the key
`notice.help` (T4). `GameState.started` goes (T5). Then the documents (T6), the full check
with the container (T7), the walk (T8) and the pull request (T9). Additions come before
removals, so that no task leaves the player without a pointer to the help.

**How this plan was checked:** the code and the tests of Tasks 1 to 5 were written once as a
prototype on 2026-11-18, task by task, the tests of each task before its code. That was on
`main` at `58268c8`, before 0027. After 0027 merged, the diffs were applied from this file to
a clean tree of this branch (`defef2b`, `main` at `eeefcd6` merged in), step by step: Tasks 1
to 4 and 6 applied as written; the diffs of Task 5 that take the field out of the fixtures
were taken anew, because 0027 had changed the lines beside them. After each of the five tasks
typecheck and Biome were clean and the unit tests green — 1330, 1337, 1343, 1334 and 1331
tests (1329 before) — and after each test step the tests failed as the steps say.
`npm run check` with the build passed on the result. The smoke spec was run with `BASE_URL`
against a dev server of that tree on a port of its own: 17 passed, and the three tests of the
container failed there, as they must without nginx; without `BASE_URL` they are skipped. The
trees were thrown away; nothing of them is on the branch. If a step does not behave as
written, the cause is a difference to that state — a later merge of `main`, most likely — so
stop and look; do not bend a test. The game was **not** played in a browser — that is the
walk — and the container was **not** run.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1 and INV-2: the label is not in the state, and `src/game/` does not know it. Its
  key, its numbers and its drawing live in `src/render/draw-help.ts`. After Task 4
  `src/game/help.ts` imports nothing from `src/text/`.
- INV-4: the words are the key `help.label` in `src/text/de.ts` and `src/text/en.ts`.
  `drawHelpLabel` draws them with `drawText`, which takes a `TextKey` only.
- INV-6: no picture changes. The label is two rectangles in `#3a4466` and `#181425` — the
  colours of the help's box — and glyphs of the font sheet.
- **Nothing decides the label but the screen.** The scene draws it in every frame in which it
  draws the world, directly after the hearts: not by `tick`, not by a dialogue, a notice, the
  help or the dark. On the journal's screen it is not drawn; `drawScene` returns there before
  the hearts, and that stays so.
- **The scene tests keep their lists.** `tests/unit/draw-scene.test.ts` compares whole lists
  of calls in about ninety places. Its local `drawScene` hands the scene a renderer that
  leaves the label's calls out (`withoutLabel`, Task 3); the tests of this feature call
  `drawSceneWith`, the scene as it is. Do not rewrite the earlier lists, and do not loosen
  `withoutLabel`: its last test holds it to the label's eight calls and to nothing else.
- **The digests are not recorded again.** `RECORDED` in `tests/unit/journal.test.ts` and in
  `tests/unit/help.test.ts` never hashed `started`; both stay as they are. That is
  criterion 11.
- **A dev server of another worktree.** `playwright.config.ts` reuses a server that already
  listens on port 5173. If another session's dev server runs there, the smoke spec tests that
  session's code, and fails or passes for no reason of this branch. Before `npm run test:e2e`
  check that nothing listens on 5173, or start this branch's server on a port of its own and
  set `BASE_URL`; with `BASE_URL` set to a dev server the three tests of the container fail,
  as they must without nginx.
- **Red between two steps.** Vitest does not check types. After the test step of Tasks 1, 2
  and 5 `npm run typecheck` is red until the code step — a test names a key or a function
  that does not exist yet, or a fixture lacks a field the type still has. Never commit there.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`:
  Biome reads it as a duplicate test hook.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: `help.label` is `H Hilfe` in `de` and `H Help` in
  `en`, one line of at most 8 characters. With n characters the frame is
  (311 − 6n, 4, 6n + 5, 14) in `#3a4466`, the field (312 − 6n, 5, 6n + 3, 12) in `#181425`,
  and the text begins at (314 − 6n, 6). German, n = 7: (269, 4, 47, 14), (270, 5, 45, 12),
  (272, 6). English, n = 6: (275, 4, 41, 14), (276, 5, 39, 12), (278, 6).

## After a merge of `main`

0028 and 0029 are in work in other sessions and may reach `main` while this branch is open.
Neither touches the help, the label's corner or the bar's order by its spec. After a merge,
expect this and nothing more:

- **Counts.** Every number of tests in this plan is higher by the tests the merge brought.
  The differences between the tasks stay: +1, +7, +6, −9, −3.
- **Context lines.** A diff of this plan may not apply as it stands where a neighbouring line
  changed — in the object literals of `src/game/update.ts` and `src/game/overview.ts`, in the
  fixtures of the tests and in the language tables. Put each change where the diff means it.
  In Task 5 that is: take the line with `started` out of every literal and every fixture and
  leave everything else alone.
- **More fixtures.** A merge may bring a test file with a fixture of a whole `GameState`.
  After Task 5 `grep -rn "started" src tests` must show two comments — the one in
  `src/game/state.ts` on where a mover started, and the one in `tests/unit/player.test.ts` on
  a walk cycle — and the new test of `tests/unit/opening.test.ts`, and nothing else.
- **Seven hearts.** 0028 raises the maximum of overview to seven. The label's test of Task 2
  already holds it clear of seven hearts.

If a merge shows something else in these files — a new reader of `started`, a second thing in
the top right corner, a new line in `quietLine` — stop and ask.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | the key `help.label` comes (T1); the key `notice.help` goes (T4) |
| `src/render/draw-help.ts` | `HELP_LABEL`, `HELP_LABEL_CAPACITY`, `HelpLabelPlace`, `helpLabelPlace`, `drawHelpLabel` (T2) |
| `src/render/draw-scene.ts` | draws the label after the hearts (T3); `quietLine` without the start hint (T4) |
| `src/game/help.ts` | loses `HELP_HINT`, `HELP_HINT_STEPS`, `helpHintDue`, `startHintDue` (T4) |
| `src/game/state.ts`, `src/game/update.ts`, `src/game/overview.ts` | `GameState.started` goes (T5) |
| `tests/unit/text.test.ts`, `draw-help.test.ts`, `draw-scene.test.ts`, `help.test.ts`, `story.test.ts`, `opening.test.ts`, `draw-journal.test.ts`, `overview.test.ts`, `state.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 6 |

No file is created, and none grows a second responsibility: `draw-help.ts` already holds
everything the help shows, and the label is the smallest thing it shows.

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text id `help.label` in both languages — `H Hilfe`, `H Help`. `notice.help`
  stays until Task 4.

- [x] **Step 1: Write the failing test,** and give the kind `help` its third rule:

```diff
diff --git a/tests/unit/text.test.ts b/tests/unit/text.test.ts
index 9268cee..fc71f38 100644
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -284,14 +284,20 @@ describe('the language table (INV-4, 0016)', () => {
     expect(both('help.do-help')).toStrictEqual(['Hilfe schließen', 'Close help']);
   });
 
-  it('holds every text of the help to the rule of its kind (0021)', () => {
+  it('holds the words of the help label in both languages (0031)', () => {
+    expect(textOf(textKey('help.label'), 'de')).toBe('H Hilfe');
+    expect(textOf(textKey('help.label'), 'en')).toBe('H Help');
+  });
+
+  it('holds every text of the help to the rule of its kind (0021, 0031)', () => {
     /** The most characters a key of the help may have, by what its id starts with. */
     const rules: readonly (readonly [string, number])[] = [
       ['help.key-', 17],
       ['help.do-', 16],
+      ['help.label', 8],
     ];
     const ids = Object.keys(TABLE.de).filter((key) => key.startsWith('help.'));
-    expect(ids).toHaveLength(14);
+    expect(ids).toHaveLength(15);
     for (const language of LANGUAGES) {
       for (const id of ids) {
         const rule = rules.find(([start]) => id.startsWith(start));
```

- [x] **Step 2: Run it and see it fail.**

Run: `npx vitest run tests/unit/text.test.ts`
Expected: 2 failed — `holds the words of the help label in both languages (0031)` with
`expected undefined to be 'H Hilfe'`, and the rule test with `to have a length of 15 but got
14`.

- [x] **Step 3: Add the words,** after the last row of the help in both tables:

```diff
diff --git a/src/text/de.ts b/src/text/de.ts
index e27a315..12c42a9 100644
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -23,6 +23,7 @@ export const de = {
   'help.do-fullscreen': 'Vollbild',
   'help.key-help': 'H',
   'help.do-help': 'Hilfe schließen',
+  'help.label': 'H Hilfe',
   'journal.tab-creatures': 'Kreaturen',
   'journal.tab-cases': 'Fälle',
   'journal.tab-policy': 'Richtlinie',
```

```diff
diff --git a/src/text/en.ts b/src/text/en.ts
index 8c3d485..989a852 100644
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -20,6 +20,7 @@ export const en: Readonly<Record<keyof typeof de, string>> = {
   'help.do-fullscreen': 'Fullscreen',
   'help.key-help': 'H',
   'help.do-help': 'Close help',
+  'help.label': 'H Help',
   'journal.tab-creatures': 'Creatures',
   'journal.tab-cases': 'Cases',
   'journal.tab-policy': 'Policy',
```

- [x] **Step 4: Run the tests.**

Run: `npx vitest run tests/unit/text.test.ts`
Expected: all pass. The glyph test and the key test of the same file cover the new strings.

- [x] **Step 5:** `npm run check` — 1330 tests — then commit: `Add the words of the help
  label`. The body: the label names the key first, as the rows of the help do, and its rule
  keeps it to 8 characters so that it stays clear of the hearts.

---

### Task 2: The label on the surface

**Files:**
- Modify: `src/render/draw-help.ts`
- Test: `tests/unit/draw-help.test.ts`

**Interfaces:**
- Consumes: the text id `help.label` (Task 1); `drawText`, `GLYPH_WIDTH`, `GLYPH_HEIGHT`,
  `SURFACE_WIDTH`, `PAGE_BACKGROUND`, `HELP_FRAME_COLOUR`.
- Produces, all exported from `src/render/draw-help.ts`:
  `HELP_LABEL: TextKey`; `HELP_LABEL_CAPACITY = 8`;
  `interface HelpLabelPlace { readonly frame: Box; readonly field: Box; readonly text: Point }`;
  `helpLabelPlace(length: number): HelpLabelPlace`;
  `drawHelpLabel(renderer: Renderer, font: SpriteSheet, language: Language): void`.

- [x] **Step 1: Write the failing tests** — a new describe before `the help in the scene
  (0021)`, and the imports it needs. This is criterion 2, and criterion 3 for the label
  alone:

```diff
diff --git a/tests/unit/draw-help.test.ts b/tests/unit/draw-help.test.ts
index a89a7b7..a702993 100644
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -3,6 +3,7 @@ import { NO_INPUT } from '../../src/game/player';
 import { type GameState, NO_RECOIL } from '../../src/game/state';
 import {
   drawHelp,
+  drawHelpLabel,
   HELP_DOES,
   HELP_DOES_CAPACITY,
   HELP_FIELD,
@@ -10,14 +11,18 @@ import {
   HELP_FRAME_COLOUR,
   HELP_KEY_CAPACITY,
   HELP_KEYS,
+  HELP_LABEL,
+  HELP_LABEL_CAPACITY,
   HELP_ROW_PITCH,
   HELP_ROWS,
+  helpLabelPlace,
 } from '../../src/render/draw-help';
 import { JOURNAL_RULE } from '../../src/render/draw-journal';
 import {
   DIALOGUE_BOX,
   drawScene,
   HEART_MARGIN,
+  HEART_PITCH,
   HEART_SIZE,
   type SceneContent,
   type SceneSettings,
@@ -226,6 +231,87 @@ describe('the help on the surface (0021)', () => {
   });
 });
 
+describe('the help label on the surface (0031)', () => {
+  const label = (language: SceneSettings['language']): string[] => {
+    const renderer = recordingRenderer();
+    drawHelpLabel(renderer, CONTENT.fontSheet, language);
+    return renderer.calls;
+  };
+
+  it('is the key `help.label`, of at most 8 characters in both languages', () => {
+    expect(HELP_LABEL).toBe(textKey('help.label'));
+    expect(HELP_LABEL_CAPACITY).toBe(8);
+    for (const language of LANGUAGES) {
+      expect(textOf(HELP_LABEL, language).length, language).toBeLessThanOrEqual(
+        HELP_LABEL_CAPACITY,
+      );
+    }
+  });
+
+  it('places the frame, the field and the words by the number of characters', () => {
+    for (const n of [1, 6, 7, 8]) {
+      expect(helpLabelPlace(n), `${n} characters`).toStrictEqual({
+        frame: { x: 311 - 6 * n, y: 4, width: 6 * n + 5, height: 14 },
+        field: { x: 312 - 6 * n, y: 5, width: 6 * n + 3, height: 12 },
+        text: { x: 314 - 6 * n, y: 6 },
+      });
+    }
+    expect(helpLabelPlace(7).frame).toStrictEqual({ x: 269, y: 4, width: 47, height: 14 });
+    expect(helpLabelPlace(6).frame).toStrictEqual({ x: 275, y: 4, width: 41, height: 14 });
+  });
+
+  it('ends 4 px from the right edge and begins 4 px from the top, whatever its length', () => {
+    for (const n of [1, 6, 7, 8]) {
+      const { frame } = helpLabelPlace(n);
+      expect(frame.x + frame.width, `${n} characters`).toBe(316);
+      expect(frame.y).toBe(HEART_MARGIN);
+    }
+  });
+
+  it('keeps clear of seven hearts and of the box of the help', () => {
+    const longest = helpLabelPlace(HELP_LABEL_CAPACITY).frame;
+    // Seven hearts (0028) end at x = 71.
+    expect(HEART_MARGIN + 6 * HEART_PITCH + HEART_SIZE).toBe(72);
+    expect(longest.x).toBe(263);
+    expect(longest.y + longest.height).toBe(18);
+    expect(longest.y + longest.height).toBeLessThan(HELP_FRAME.y);
+  });
+
+  it('draws the frame, the field and `H Hilfe` in German', () => {
+    // `H` is glyph 40, `i` 73, `l` 76, `f` 70, `e` 69; the space is not drawn.
+    expect(label('de')).toStrictEqual([
+      'fillRect 269,4 47x14 #3a4466',
+      'fillRect 270,5 45x12 #181425',
+      'drawSprite 40 at 272,6',
+      'drawSprite 40 at 284,6',
+      'drawSprite 73 at 290,6',
+      'drawSprite 76 at 296,6',
+      'drawSprite 70 at 302,6',
+      'drawSprite 69 at 308,6',
+    ]);
+  });
+
+  it('draws `H Help` in English: narrower, with the same right edge', () => {
+    // `p` is glyph 80.
+    expect(label('en')).toStrictEqual([
+      'fillRect 275,4 41x14 #3a4466',
+      'fillRect 276,5 39x12 #181425',
+      'drawSprite 40 at 278,6',
+      'drawSprite 40 at 290,6',
+      'drawSprite 69 at 296,6',
+      'drawSprite 76 at 302,6',
+      'drawSprite 80 at 308,6',
+    ]);
+  });
+
+  it('draws its glyphs from the font sheet and nothing else', () => {
+    const renderer = recordingRenderer();
+    drawHelpLabel(renderer, CONTENT.fontSheet, 'de');
+    expect(renderer.sheets).toHaveLength(6);
+    expect(renderer.sheets.every((used) => used === CONTENT.fontSheet)).toBe(true);
+  });
+});
+
 describe('the help in the scene (0021)', () => {
   it('lies over the world: everything the scene draws without it, then the help, and nothing after', () => {
     const without = scene(playing());
```

- [x] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/unit/draw-help.test.ts`
Expected: the 7 tests of the new describe fail — `expected undefined to be 'help.label'`,
`helpLabelPlace is not a function`, `drawHelpLabel is not a function`.

- [x] **Step 3: Write the label.** The numbers of the spec come out of four small constants,
  so that the formula can be read: the frame's right edge is 4 px from the surface's, 1 px of
  frame, 2 px of field beside the letters, 1 px of field above and below a glyph's cell.

```diff
diff --git a/src/render/draw-help.ts b/src/render/draw-help.ts
index 1aa901c..cbad038 100644
--- a/src/render/draw-help.ts
+++ b/src/render/draw-help.ts
@@ -1,14 +1,17 @@
 import type { Box, Point } from '../engine/tiled';
-import { type Language, type TextKey, textKey } from '../text/text';
+import { type Language, type TextKey, textKey, textOf } from '../text/text';
 import { drawText } from './draw-text';
+import { GLYPH_HEIGHT, GLYPH_WIDTH } from './font';
 import { PAGE_BACKGROUND, type PaletteColour } from './palette';
-import type { Renderer, SpriteSheet } from './renderer';
+import { type Renderer, type SpriteSheet, SURFACE_WIDTH } from './renderer';
 
 /**
  * The help (gameplay.md §8, visual.md §3, feature 0021): a framed box over whatever is on
  * screen, with one row per thing the player can do — the key, and what it does. It is drawn on
  * the surface, not shifted by the camera, in the language of the scene's settings. The rows
- * are what the box shows and no rule of the game reads them, so they live here.
+ * are what the box shows and no rule of the game reads them, so they live here. So does the
+ * label (feature 0031): the words in the top right corner that name the help's key for as long
+ * as the world is on screen.
  */
 
 /** A row of the help: the name of the key, and what it does. */
@@ -62,3 +65,57 @@ export function drawHelp(renderer: Renderer, font: SpriteSheet, language: Langua
     drawText(renderer, font, row.does, language, HELP_DOES.x, HELP_DOES.y + down);
   }
 }
+
+/** The label (0031): the key of the help and the word for it, as the rows name a key first. */
+export const HELP_LABEL: TextKey = textKey('help.label');
+/** The longest label, in characters; a test holds both languages to it. */
+export const HELP_LABEL_CAPACITY = 8;
+/** The frame is this far from the surface's right edge and from its top, as the hearts are from their corner. */
+const LABEL_MARGIN = 4;
+/** The frame's width on every side of the field. */
+const LABEL_FRAME = 1;
+/** The field left and right of the letters; a glyph's cell ends with an empty column. */
+const LABEL_PADDING_X = 2;
+/** The field above and below a glyph's cell. */
+const LABEL_PADDING_Y = 1;
+
+/** Where a label of `length` characters is drawn: its frame, the field inside it, and its words. */
+export interface HelpLabelPlace {
+  readonly frame: Box;
+  readonly field: Box;
+  readonly text: Point;
+}
+
+/**
+ * The place of a label of `length` characters: the frame (311 − 6n, 4, 6n + 5, 14), the field
+ * (312 − 6n, 5, 6n + 3, 12) and the words from (314 − 6n, 6). The right edge stays where it is
+ * in every language; the left edge moves with the words.
+ */
+export function helpLabelPlace(length: number): HelpLabelPlace {
+  // The last cell's empty column is not part of the letters.
+  const letters = length * GLYPH_WIDTH - 1;
+  const field: Box = {
+    x: SURFACE_WIDTH - LABEL_MARGIN - LABEL_FRAME - letters - 2 * LABEL_PADDING_X,
+    y: LABEL_MARGIN + LABEL_FRAME,
+    width: letters + 2 * LABEL_PADDING_X,
+    height: GLYPH_HEIGHT + 2 * LABEL_PADDING_Y,
+  };
+  return {
+    frame: {
+      x: field.x - LABEL_FRAME,
+      y: field.y - LABEL_FRAME,
+      width: field.width + 2 * LABEL_FRAME,
+      height: field.height + 2 * LABEL_FRAME,
+    },
+    field,
+    text: { x: field.x + LABEL_PADDING_X, y: field.y + LABEL_PADDING_Y },
+  };
+}
+
+/** The label in `language`: the frame, the field in it, and the words — in the help's colours. */
+export function drawHelpLabel(renderer: Renderer, font: SpriteSheet, language: Language): void {
+  const { frame, field, text } = helpLabelPlace(textOf(HELP_LABEL, language).length);
+  renderer.fillRect(frame.x, frame.y, frame.width, frame.height, HELP_FRAME_COLOUR);
+  renderer.fillRect(field.x, field.y, field.width, field.height, PAGE_BACKGROUND);
+  drawText(renderer, font, HELP_LABEL, language, text.x, text.y);
+}
```

- [x] **Step 4: Run the tests.**

Run: `npx vitest run tests/unit/draw-help.test.ts`
Expected: all pass.

- [x] **Step 5:** `npm run check` — 1337 tests — then commit: `Draw the help label`. The
  body: the label lives with the help's box because it shows the same thing in the same
  colours, and its place is a function of the number of characters so that both languages end
  at the same right edge.

---

### Task 3: The label in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`
- Test: `tests/unit/draw-scene.test.ts`, `tests/unit/draw-help.test.ts`

**Interfaces:**
- Consumes: `drawHelpLabel`, `HELP_LABEL`, `helpLabelPlace` (Task 2).
- Produces: `drawScene` draws the label after the last heart in every frame of the world. In
  `tests/unit/draw-scene.test.ts`: `withoutLabel(renderer, language, font): Renderer`; the
  local `drawScene` now draws through it; `drawSceneWith` is the scene as it is.

- [x] **Step 1: Write the failing tests.** Three things in `draw-scene.test.ts`: the imports;
  `withoutLabel` and the local `drawScene` that uses it; and a new describe at the end of the
  file — criteria 3 to 6 and the test that holds `withoutLabel`. And one line in
  `draw-help.test.ts`: the last call of the world is now the label's last glyph.

```diff
diff --git a/tests/unit/draw-scene.test.ts b/tests/unit/draw-scene.test.ts
index af26aee..930fd5f 100644
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -10,6 +10,7 @@ import {
   type PlayerState,
   type ShadowWallState,
 } from '../../src/game/state';
+import { drawHelpLabel, HELP_LABEL, helpLabelPlace } from '../../src/render/draw-help';
 import {
   creatureFrame,
   creatureOrigin,
@@ -47,7 +48,7 @@ import {
 } from '../../src/render/draw-scene';
 import { GLYPH_WIDTH } from '../../src/render/font';
 import type { Renderer, SpriteSheet } from '../../src/render/renderer';
-import { LANGUAGES, TABLE } from '../../src/text/text';
+import { LANGUAGES, TABLE, textOf } from '../../src/text/text';
 import { solidsOf } from './solids';
 
 /** A renderer that only records what it was asked to draw, one line per call. */
@@ -121,13 +122,53 @@ const CONTENT: SceneContent = {
 /** The settings of a game in which the language was never switched (0019). */
 const GERMAN: SceneSettings = { language: 'de', switchedAt: null };
 const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
-/** The scene with the settings of a fresh game, unless a test hands over its own. */
+/**
+ * A renderer that passes everything on to `renderer` but the help label (0031): its frame, its
+ * field and its glyphs. The scene draws the label in every frame of the world, so the tests of
+ * the earlier features, which compare whole lists of calls, look at the scene through this.
+ * The last describe of this file holds it to the label's calls and to nothing else.
+ */
+function withoutLabel(
+  renderer: Renderer,
+  language: SceneSettings['language'],
+  font: SpriteSheet,
+): Renderer {
+  const { frame, field, text } = helpLabelPlace(textOf(HELP_LABEL, language).length);
+  const ofLabel = (x: number, y: number, width: number, height: number): boolean =>
+    [frame, field].some(
+      (box) => box.x === x && box.y === y && box.width === width && box.height === height,
+    );
+  return {
+    clear: (colour) => renderer.clear(colour),
+    fillRect: (x, y, width, height, colour) => {
+      if (!ofLabel(x, y, width, height)) {
+        renderer.fillRect(x, y, width, height, colour);
+      }
+    },
+    drawTile: (tileset, id, x, y) => renderer.drawTile(tileset, id, x, y),
+    drawSprite: (sheet, index, x, y) => {
+      if (!(sheet === font && y === text.y && x >= text.x)) {
+        renderer.drawSprite(sheet, index, x, y);
+      }
+    },
+  };
+}
+/**
+ * The scene with the settings of a fresh game, unless a test hands over its own — and without
+ * the help label (0031), which the last describe of this file looks at through `drawSceneWith`.
+ */
 const drawScene = (
   renderer: Renderer,
   scene: GameState,
   content: SceneContent,
   settings: SceneSettings = GERMAN,
-): void => drawSceneWith(renderer, scene, content, settings);
+): void =>
+  drawSceneWith(
+    withoutLabel(renderer, settings.language, content.fontSheet),
+    scene,
+    content,
+    settings,
+  );
 const player = (fields: Partial<PlayerState>): PlayerState => ({
   x: 0,
   y: 0,
@@ -1622,3 +1663,153 @@ describe('the story in the scene (0026)', () => {
     expect(used.calls).not.toContain(BAR);
   });
 });
+
+describe('the help label in the scene (0031)', () => {
+  const BAR = 'fillRect 8,158 304x18 #181425';
+  const BOX = 'fillRect 8,134 304x42 #181425';
+  const HELP_FRAME = 'fillRect 48,30 224x98 #3a4466';
+  const LAST_HEART = 'drawSprite 0 at 44,4';
+  const GERMAN_LABEL = [
+    'fillRect 269,4 47x14 #3a4466',
+    'fillRect 270,5 45x12 #181425',
+    'drawSprite 40 at 272,6',
+    'drawSprite 40 at 284,6',
+    'drawSprite 73 at 290,6',
+    'drawSprite 76 at 296,6',
+    'drawSprite 70 at 302,6',
+    'drawSprite 69 at 308,6',
+  ];
+  const ENGLISH_LABEL = [
+    'fillRect 275,4 41x14 #3a4466',
+    'fillRect 276,5 39x12 #181425',
+    'drawSprite 40 at 278,6',
+    'drawSprite 40 at 290,6',
+    'drawSprite 69 at 296,6',
+    'drawSprite 76 at 302,6',
+    'drawSprite 80 at 308,6',
+  ];
+  /** The officer on the 3x2 map, so that a dialogue has its speaker. */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
+  };
+  /** Five full hearts, nothing else on the surface. */
+  const playing = (fields: Partial<GameState> = {}): GameState => ({
+    ...state({ x: 20, y: 30 }),
+    overview: { current: 5, max: 5 },
+    figures: [{ figure: 0, facing: 'left' }],
+    ...fields,
+  });
+  /** Every call of the scene as it is, the label among them. */
+  const whole = (scene: GameState, settings: SceneSettings = GERMAN): string[] => {
+    const renderer = recordingRenderer();
+    drawSceneWith(renderer, scene, content, settings);
+    return renderer.calls;
+  };
+  /** The calls from the label's frame to its last glyph, or none where there is no frame. */
+  const labelIn = (calls: readonly string[], label: readonly string[]): string[] => {
+    const from = calls.indexOf(label[0] ?? '');
+    return from < 0 ? [] : calls.slice(from, from + label.length);
+  };
+
+  it('is what render/draw-help draws', () => {
+    for (const [language, label] of [
+      ['de', GERMAN_LABEL],
+      ['en', ENGLISH_LABEL],
+    ] as const) {
+      const renderer = recordingRenderer();
+      drawHelpLabel(renderer, CONTENT.fontSheet, language);
+      expect(renderer.calls, language).toStrictEqual(label);
+    }
+  });
+
+  it('follows the last heart: the frame, the field and the words, and nothing after them', () => {
+    const german = whole(playing());
+    expect(german.slice(german.indexOf(LAST_HEART) + 1)).toStrictEqual(GERMAN_LABEL);
+    const english = whole(playing(), ENGLISH);
+    expect(english.slice(english.indexOf(LAST_HEART) + 1)).toStrictEqual(ENGLISH_LABEL);
+  });
+
+  it('is there at every tick and does not move with the camera', () => {
+    for (const tick of [0, 599, 600, 100000]) {
+      expect(labelIn(whole(playing({ tick })), GERMAN_LABEL), `tick ${tick}`).toStrictEqual(
+        GERMAN_LABEL,
+      );
+    }
+    const moved = whole(playing({ camera: { x: 48, y: 32 } }));
+    expect(labelIn(moved, GERMAN_LABEL)).toStrictEqual(GERMAN_LABEL);
+  });
+
+  it('stays under the call, a dialogue, a notice, the language line, the help and the dark, and comes before each', () => {
+    const cases: readonly (readonly [string, GameState, SceneSettings, string])[] = [
+      [
+        'the call',
+        playing({
+          lamp: { on: false, strength: 1, owned: false, used: false },
+          dialogue: { speaker: 'story', index: 0, page: 0 },
+        }),
+        GERMAN,
+        BOX,
+      ],
+      ['a dialogue', playing({ dialogue: { speaker: 'figure', index: 0, page: 0 } }), GERMAN, BOX],
+      [
+        'a notice',
+        playing({
+          lamp: { on: true, strength: 1, owned: true, used: true },
+          shadowWalls: [{ wall: 0, lit: true, light: 0 }],
+        }),
+        GERMAN,
+        BAR,
+      ],
+      ['the language line', playing({ tick: 700 }), { language: 'de', switchedAt: 700 }, BAR],
+      ['the help', playing({ help: true }), GERMAN, HELP_FRAME],
+      ['the dark', playing({ dark: 30 }), GERMAN, 'fillRect 0,0 320x90 #181425'],
+    ];
+    for (const [name, scene, settings, next] of cases) {
+      const calls = whole(scene, settings);
+      expect(labelIn(calls, GERMAN_LABEL), name).toStrictEqual(GERMAN_LABEL);
+      expect(calls.indexOf(next), `${name}: what lies over the world is drawn`).toBeGreaterThan(-1);
+      expect(calls.indexOf(next), `${name}: after the label`).toBeGreaterThan(
+        calls.indexOf(GERMAN_LABEL[0] ?? ''),
+      );
+      expect(calls.indexOf(GERMAN_LABEL[0] ?? ''), `${name}: after the hearts`).toBeGreaterThan(
+        calls.indexOf(LAST_HEART),
+      );
+    }
+  });
+
+  it('is not on the screen of the journal, with or without the help over it', () => {
+    for (const help of [false, true]) {
+      const calls = whole(playing({ journal: { tab: 'policy' }, help }));
+      for (const call of GERMAN_LABEL) {
+        expect(calls, `help ${help}: ${call}`).not.toContain(call);
+      }
+    }
+  });
+
+  it('is all that `drawScene` of this file leaves out, in both languages', () => {
+    for (const [settings, label] of [
+      [GERMAN, GERMAN_LABEL],
+      [ENGLISH, ENGLISH_LABEL],
+    ] as const) {
+      for (const scene of [
+        playing(),
+        playing({ dialogue: { speaker: 'figure', index: 0, page: 0 } }),
+        playing({ help: true }),
+        playing({ journal: { tab: 'cases' } }),
+      ]) {
+        const seen = recordingRenderer();
+        drawScene(seen, scene, content, settings);
+        const all = recordingRenderer();
+        drawSceneWith(all, scene, content, settings);
+        const from = all.calls.indexOf(label[0] ?? '');
+        const rest =
+          from < 0
+            ? all.calls
+            : [...all.calls.slice(0, from), ...all.calls.slice(from + label.length)];
+        expect(seen.calls).toStrictEqual(rest);
+        expect(all.sheets.length - seen.sheets.length).toBe(from < 0 ? 0 : label.length - 2);
+      }
+    }
+  });
+});
```

```diff
diff --git a/tests/unit/draw-help.test.ts b/tests/unit/draw-help.test.ts
index a702993..9f300a6 100644
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -316,7 +316,9 @@ describe('the help in the scene (0021)', () => {
   it('lies over the world: everything the scene draws without it, then the help, and nothing after', () => {
     const without = scene(playing());
     expect(without).not.toContain(FRAME);
-    expect(without.at(-1)).toBe('drawSprite 0 at 44,4');
+    // The last heart, and after it the help label (0031), whose last glyph is the `e` of `Hilfe`.
+    expect(without).toContain('drawSprite 0 at 44,4');
+    expect(without.at(-1)).toBe('drawSprite 69 at 308,6');
     expect(scene(playing({ help: true }))).toStrictEqual([...without, ...help('de')]);
   });
 
```

- [x] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/unit/draw-scene.test.ts tests/unit/draw-help.test.ts`
Expected: 4 failed. In `draw-scene.test.ts` three of the new describe — `follows the last
heart …`, `is there at every tick …`, `stays under the call …` — each with `expected [] to
strictly equal [ Array(8) ]`. In `draw-help.test.ts` `lies over the world …`. The other tests
of the new describe pass already: without a label nothing is left out and nothing is on the
journal's screen.

- [x] **Step 3: Draw it.** One call after the loop of the hearts, and the comment of
  `drawScene` says so:

```diff
diff --git a/src/render/draw-scene.ts b/src/render/draw-scene.ts
index 5c6a747..c98aaeb 100644
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -25,7 +25,7 @@ import {
 import { pagesOf, speakersOf } from '../game/talk';
 import { FIND_STEPS, tracesOf } from '../game/trace';
 import { type Language, type TextKey, textKey, textOf } from '../text/text';
-import { drawHelp } from './draw-help';
+import { drawHelp, drawHelpLabel } from './draw-help';
 import { drawJournal } from './draw-journal';
 import { drawLayer, drawVeil, type Shadow } from './draw-map';
 import { drawText } from './draw-text';
@@ -354,13 +354,15 @@ export function lidHeight(dark: number): number {
  * above, the drones (0015), all shifted by the camera. The sprite's top-left corner is at (round(x) − 8 − camera.x,
  * round(y) − 24 − camera.y): the feet are its bottom centre, and the camera is already whole
  * pixels (engine/camera). The cone lies under the figure, so the body hides the apex. After
- * `above` come the hearts of overview, on the surface and not shifted by the camera; then,
+ * `above` come the hearts of overview, on the surface and not shifted by the camera, and the
+ * label that names the help's key in the top right corner (0031, render/draw-help); then,
  * while a dialogue is open, the dialogue box with the page's lines and its blinking marker
  * (0017), else the notice — the bar and its line (0016) — else, for two seconds after a switch
  * of the language, the language line in the same bar (0019); all on the surface and not
  * shifted by the camera; and last the two lids of the dark (0009). Every text is drawn in the
  * language of the settings. A safe figure blinks; its cone and the movers do not. While the
- * journal is open the frame is the journal's alone (0020, render/draw-journal).
+ * journal is open the frame is the journal's alone (0020, render/draw-journal), without the
+ * label.
  * While the help is open (0021, render/draw-help) its box is drawn last but for the lids, over
  * the world and over the journal alike, and the bar shows neither the language line nor the
  * start hint — the line that names the help's key in the first ten seconds of a game, which
@@ -478,6 +480,8 @@ export function drawScene(
       HEART_MARGIN,
     );
   }
+  // The label that names the help's key (0031): in every frame of the world, whatever else is on it.
+  drawHelpLabel(renderer, content.fontSheet, language);
   const page =
     state.dialogue === null
       ? undefined
```

- [x] **Step 4: Run the tests.**

Run: `npx vitest run tests/unit/draw-scene.test.ts tests/unit/draw-help.test.ts`
Expected: all pass — the new ones, and every earlier list of calls unchanged. If an earlier
test of `draw-scene.test.ts` fails now, it calls `drawSceneWith` directly or builds its own
renderer; make it draw through the local `drawScene`. Do not add the label's calls to its
list.

- [x] **Step 5:** `npm run check` — 1343 tests — then commit: `Show the help label over the
  world`. The body: the label is drawn with the hearts and decided by nothing in the state,
  and the earlier scene tests look past it through one helper that a test of its own holds.

---

### Task 4: The start hint goes

**Files:**
- Modify: `src/game/help.ts`, `src/render/draw-scene.ts`, `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/draw-scene.test.ts`, `tests/unit/help.test.ts`,
  `tests/unit/draw-help.test.ts`, `tests/unit/text.test.ts`, `tests/unit/story.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `src/game/help.ts` exports `openHelp` and `stepHelp` and nothing else.
  `quietLine(state, settings)` returns `LANGUAGE_NOTICE` when the language line is due and
  the help is not open, else `null`. The text id `notice.help` no longer exists.
  `GameState.started` is still there and no longer read by anything; Task 5 takes it.

- [x] **Step 1: Write the tests of a game without the hint.** In `draw-scene.test.ts`: the
  test of 0019 on the empty bar gets the ticks of the first ten seconds back, and the test
  that left the bar to the hint goes; the describe of the hint becomes
  `the bar without a start hint (0031)` — criteria 7 and 8; the test of 0026 on the hint
  after the call goes. In `help.test.ts`: the two describes on the hint go, and one new
  describe is criterion 10. `draw-help.test.ts` loses its line on the hint's bar,
  `text.test.ts` its line on the words, and `story.test.ts` takes another key for its scene
  of one page.

```diff
diff --git a/tests/unit/draw-scene.test.ts b/tests/unit/draw-scene.test.ts
index 930fd5f..3803f9c 100644
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -180,7 +180,7 @@ const player = (fields: Partial<PlayerState>): PlayerState => ({
   ...fields,
 });
 /**
- * A tick past the start hint (0021). 600 is a multiple of every period a frame is chosen by —
+ * The tick of the scenes of this file. 600 is a multiple of every period a frame is chosen by —
  * 4, 15, 30 and 60 steps — so a scene at 600 + n shows the frames of tick n.
  */
 const QUIET_TICK = 600;
@@ -1051,8 +1051,11 @@ describe('the language line in the scene (0019)', () => {
   });
 
   it('draws neither bar nor line before the switch, after two seconds, or without a switch', () => {
-    // Past the start hint (0021): the ticks of 0019, 600 later.
+    // In the first ten seconds of a game as well as later: no start hint has the bar (0031).
     for (const [tick, switchedAt] of [
+      [99, 100],
+      [220, 100],
+      [100, null],
       [699, 700],
       [820, 700],
       [700, null],
@@ -1064,22 +1067,6 @@ describe('the language line in the scene (0019)', () => {
     }
   });
 
-  it('leaves the bar to the start hint where the line is not due in the first ten seconds (0021)', () => {
-    for (const [tick, switchedAt] of [
-      [99, 100],
-      [220, 100],
-      [100, null],
-    ] as const) {
-      const renderer = recordingRenderer();
-      drawScene(renderer, quiet(tick), CONTENT, switched('en', switchedAt));
-      expect(renderer.calls.filter((call) => call === BAR)).toHaveLength(1);
-      // `Help: press H`: 13 characters, 11 of them drawn; `H` is glyph 40.
-      const line = fontCalls(renderer);
-      expect(line, `tick ${tick}`).toHaveLength(11);
-      expect(line[0]).toBe('drawSprite 40 at 121,162');
-    }
-  });
-
   it('leaves the bar to the notice of 0016, which itself changes its language', () => {
     const holding = quiet(100, {
       lamp: { on: true, strength: 1, owned: true, used: true },
@@ -1181,7 +1168,7 @@ describe('the traces in the scene (0022)', () => {
   });
 });
 
-describe('the start hint in the scene (0021)', () => {
+describe('the bar without a start hint (0031)', () => {
   const BAR = 'fillRect 8,158 304x18 #181425';
   /** One full and one empty heart, no notice, no dialogue, at `tick`. */
   const fresh = (tick: number, fields: Partial<GameState> = {}): GameState => ({
@@ -1195,82 +1182,39 @@ describe('the start hint in the scene (0021)', () => {
       .filter((call) => call.startsWith('drawSprite'))
       .filter((_call, i) => renderer.sheets[i] === CONTENT.fontSheet);
 
-  it('names the key of the help for the first 600 steps, centred in the bar after the hearts', () => {
-    for (const tick of [0, 599]) {
-      const german = recordingRenderer();
-      drawScene(german, fresh(tick), CONTENT);
-      const bar = german.calls.indexOf(BAR);
-      expect(bar).toBeGreaterThan(german.calls.indexOf('drawSprite 1 at 14,4'));
-      const line = german.calls.slice(bar + 1);
-      // `Hilfe: Taste H` has 14 characters, 12 of them drawn; `H` is glyph 40.
-      expect(line, `tick ${tick}`).toHaveLength(12);
-      expect(line[0]).toBe('drawSprite 40 at 118,162');
-      expect(line.at(-1)).toBe('drawSprite 40 at 196,162');
-      expect(fontCalls(german)).toStrictEqual(line);
-
-      const english = recordingRenderer();
-      drawScene(english, fresh(tick), CONTENT, ENGLISH);
-      // `Help: press H` has 13 characters, 11 of them drawn.
-      const lineEn = english.calls.slice(english.calls.indexOf(BAR) + 1);
-      expect(lineEn, `tick ${tick}`).toHaveLength(11);
-      expect(lineEn[0]).toBe('drawSprite 40 at 121,162');
-      expect(lineEn.at(-1)).toBe('drawSprite 40 at 193,162');
+  it('is not drawn where nothing else is on screen, from the first step on, in both languages', () => {
+    for (const tick of [0, 100, 599, 600]) {
+      for (const settings of [GERMAN, ENGLISH]) {
+        const renderer = recordingRenderer();
+        drawScene(renderer, fresh(tick), CONTENT, settings);
+        expect(renderer.calls, `tick ${tick}, ${settings.language}`).not.toContain(BAR);
+        expect(fontCalls(renderer)).toStrictEqual([]);
+      }
     }
   });
 
-  it('is gone at step 600', () => {
-    const renderer = recordingRenderer();
-    drawScene(renderer, fresh(600), CONTENT);
-    expect(renderer.calls).not.toContain(BAR);
-    expect(fontCalls(renderer)).toStrictEqual([]);
-  });
-
-  it('leaves the bar to the notice of 0016', () => {
-    const holding = fresh(100, {
-      lamp: { on: true, strength: 1, owned: true, used: true },
-      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
-    });
-    const renderer = recordingRenderer();
-    drawScene(renderer, holding, CONTENT);
-    // `Dieser Schatten ist zu dicht für die Lampe.`: 43 characters, 36 drawn, `D` is glyph 36.
-    const line = fontCalls(renderer);
-    expect(line).toHaveLength(36);
-    expect(line[0]).toBe('drawSprite 36 at 31,162');
-    expect(renderer.calls.filter((call) => call === BAR)).toHaveLength(1);
+  it('is not drawn after the call either, while the lamp is not owned', () => {
+    const closed = { lamp: { on: false, strength: 1, owned: false, used: false } };
+    for (const tick of [5, 100, 604, 605]) {
+      const renderer = recordingRenderer();
+      drawScene(renderer, fresh(tick, closed), CONTENT);
+      expect(renderer.calls, `tick ${tick}`).not.toContain(BAR);
+      expect(fontCalls(renderer)).toStrictEqual([]);
+    }
   });
 
-  it('leaves the bar to the language line, and has it back when the two seconds are over', () => {
+  it('holds the language line for 120 steps after a switch, and is not drawn from the 121st', () => {
     const settings: SceneSettings = { language: 'en', switchedAt: 50 };
     const line = recordingRenderer();
     drawScene(line, fresh(169), CONTENT, settings);
     // `Language: English`: 16 glyphs, `L` is glyph 44.
+    expect(line.calls.filter((call) => call === BAR)).toHaveLength(1);
     expect(fontCalls(line)).toHaveLength(16);
     expect(fontCalls(line)[0]).toBe('drawSprite 44 at 109,162');
-    const hint = recordingRenderer();
-    drawScene(hint, fresh(170), CONTENT, settings);
-    expect(fontCalls(hint)).toHaveLength(11);
-    expect(fontCalls(hint)[0]).toBe('drawSprite 40 at 121,162');
-  });
-
-  it('is not drawn with a dialogue open, with the journal open or with the help open', () => {
-    const content: SceneContent = {
-      ...CONTENT,
-      map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
-    };
-    for (const fields of [
-      {
-        figures: [{ figure: 0, facing: 'left' }],
-        dialogue: { speaker: 'figure', index: 0, page: 0 },
-      },
-      { journal: { tab: 'creatures' } },
-      { help: true },
-    ] as const satisfies readonly Partial<GameState>[]) {
-      const renderer = recordingRenderer();
-      drawScene(renderer, fresh(100, fields), content);
-      expect(renderer.calls, Object.keys(fields).join()).not.toContain(BAR);
-      // The first glyph of `Hilfe: Taste H`, at its place in the bar.
-      expect(renderer.calls).not.toContain('drawSprite 40 at 118,162');
-    }
+    const after = recordingRenderer();
+    drawScene(after, fresh(170), CONTENT, settings);
+    expect(after.calls).not.toContain(BAR);
+    expect(fontCalls(after)).toStrictEqual([]);
   });
 });
 
@@ -1598,20 +1542,6 @@ describe('the story in the scene (0026)', () => {
     expect(renderer.calls).not.toContain(BOX);
   });
 
-  it('shows no start hint while the opening has not ended, and counts it from the end of the call', () => {
-    const quiet = (tick: number, started: number | null): string[] => {
-      const renderer = recordingRenderer();
-      drawScene(renderer, { ...calling(0, tick), started, dialogue: null }, CONTENT);
-      return fontCalls(renderer);
-    };
-    expect(quiet(10, null)).toStrictEqual([]);
-    expect(quiet(5000, null)).toStrictEqual([]);
-    // `Hilfe: Taste H`, as in 0021, for 600 steps from the step that closed the call.
-    expect(quiet(900, 900)[0]).toBe('drawSprite 40 at 118,162');
-    expect(quiet(1499, 900)).toHaveLength(12);
-    expect(quiet(1500, 900)).toStrictEqual([]);
-  });
-
   it('draws no cone while the lamp is not owned, whatever is held', () => {
     const renderer = recordingRenderer();
     drawScene(renderer, { ...calling(0), dialogue: null, started: 5 }, CONTENT);
```

```diff
diff --git a/tests/unit/help.test.ts b/tests/unit/help.test.ts
index 0c24aa3..46144a9 100644
--- a/tests/unit/help.test.ts
+++ b/tests/unit/help.test.ts
@@ -10,18 +10,12 @@ import {
   parseTileset,
   type TileMap,
 } from '../../src/engine/tiled';
-import {
-  HELP_HINT,
-  HELP_HINT_STEPS,
-  helpHintDue,
-  openHelp,
-  startHintDue,
-  stepHelp,
-} from '../../src/game/help';
+import * as help from '../../src/game/help';
+import { openHelp, stepHelp } from '../../src/game/help';
 import { type GameInput, NO_INPUT, pressed } from '../../src/game/player';
 import type { GameState } from '../../src/game/state';
-import { createInitialState, newGame, update } from '../../src/game/update';
-import { textKey } from '../../src/text/text';
+import { createInitialState, update } from '../../src/game/update';
+import { TABLE } from '../../src/text/text';
 import { grassMap } from './grass-map';
 
 const NONE = NO_INPUT;
@@ -255,20 +249,14 @@ describe('the world while the help is open (0021)', () => {
   });
 });
 
-describe('the start hint (0021)', () => {
-  it('is the line that names the key, due for the first 600 steps', () => {
-    expect(HELP_HINT).toBe(textKey('notice.help'));
-    expect(HELP_HINT_STEPS).toBe(600);
-    expect([0, 599, 600, 601].map(helpHintDue)).toStrictEqual([true, true, false, false]);
+describe('what game/help knows (0031)', () => {
+  it('is the step of the help and nothing of a hint', () => {
+    expect(Object.keys(help).sort()).toStrictEqual(['openHelp', 'stepHelp']);
   });
 
-  it('runs out behind an open help: the tick grows in its steps', () => {
-    let state = opened;
-    for (let step = 0; step < 599; step += 1) {
-      state = update(state, NONE, OPEN);
-    }
-    expect(state.help).toBe(true);
-    expect(helpHintDue(state.tick)).toBe(false);
+  it("has no words of its own: the label that names the key is the scene's", () => {
+    expect(Object.keys(TABLE.de)).not.toContain('notice.help');
+    expect(Object.keys(TABLE.en)).not.toContain('notice.help');
   });
 });
 
@@ -341,73 +329,3 @@ describe('a game in which the help is never opened (0021)', () => {
     expect(hash.digest('hex')).toBe(RECORDED);
   });
 });
-
-describe('the start hint and the call (0026)', () => {
-  const due = (tick: number, started: number | null): boolean => startHintDue({ tick, started });
-
-  it('is not due at any tick while the opening has not ended', () => {
-    expect([0, 1, 599, 600, 5000].map((tick) => due(tick, null))).toStrictEqual([
-      false,
-      false,
-      false,
-      false,
-      false,
-    ]);
-  });
-
-  it('is due for 600 steps from the step that closed the call', () => {
-    for (const started of [40, 900]) {
-      expect(due(started, started), `closed at ${started}`).toBe(true);
-      expect(due(started + 599, started)).toBe(true);
-      expect(due(started + 600, started)).toBe(false);
-      expect(due(started + 6000, started)).toBe(false);
-    }
-  });
-
-  it('is as in 0021 in a game past its opening: due at 0 and at 599 and not at 600', () => {
-    expect([0, 599, 600, 601].map((tick) => due(tick, 0))).toStrictEqual([
-      true,
-      true,
-      false,
-      false,
-    ]);
-    const start = createInitialState(OPEN);
-    expect(start.started).toBe(0);
-    expect(startHintDue(start)).toBe(helpHintDue(start.tick));
-  });
-
-  it('follows the game: not due under the call, due when it closes, gone 600 steps later', () => {
-    let state = newGame(OPEN);
-    for (let step = 0; step < 35; step += 1) {
-      state = update(state, NONE, OPEN);
-      expect(startHintDue(state)).toBe(false);
-    }
-    for (const input of [TALK, NONE, TALK, NONE, TALK]) {
-      state = update(state, input, OPEN);
-    }
-    expect(state.dialogue).toBeNull();
-    expect(state.started).toBe(40);
-    expect(startHintDue(state)).toBe(true);
-    for (let step = 0; step < 599; step += 1) {
-      state = update(state, NONE, OPEN);
-    }
-    expect(state.tick).toBe(639);
-    expect(startHintDue(state)).toBe(true);
-    expect(startHintDue(update(state, NONE, OPEN))).toBe(false);
-  });
-
-  it('runs on behind an open help, as in 0021', () => {
-    let state = [TALK, NONE, TALK, NONE, TALK].reduce(
-      (now, input) => update(now, input, OPEN),
-      newGame(OPEN),
-    );
-    state = update(update(state, NONE, OPEN), HELP, OPEN);
-    expect(state.help).toBe(true);
-    for (let step = 0; step < 598; step += 1) {
-      state = update(state, NONE, OPEN);
-    }
-    expect(state.started).toBe(5);
-    expect(state.tick).toBe(605);
-    expect(startHintDue(state)).toBe(false);
-  });
-});
```

```diff
diff --git a/tests/unit/draw-help.test.ts b/tests/unit/draw-help.test.ts
index 9f300a6..db6f0e0 100644
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -88,7 +88,7 @@ const GERMAN: SceneSettings = { language: 'de', switchedAt: null };
 const FRAME = 'fillRect 48,30 224x98 #3a4466';
 const FIELD = 'fillRect 49,31 222x96 #181425';
 const BAR = 'fillRect 8,158 304x18 #181425';
-/** A game past the start hint with five hearts and the officer standing; the help as `fields` say. */
+/** A game with five hearts and the officer standing; the help as `fields` say. */
 const playing = (fields: Partial<GameState> = {}): GameState => ({
   tick: 700,
   started: 0,
@@ -327,15 +327,14 @@ describe('the help in the scene (0021)', () => {
     expect(english.slice(-100)).toStrictEqual(help('en'));
   });
 
-  it('shows no language line and no start hint while it is open', () => {
+  it('shows no language line while it is open', () => {
     for (const tick of [100, 219, 700, 819]) {
       for (const switchedAt of [100, 700, null]) {
         const calls = scene(playing({ help: true, tick }), { language: 'en', switchedAt });
         expect(calls, `tick ${tick}, switched at ${switchedAt}`).not.toContain(BAR);
       }
     }
-    // Without the help the same frames have the bar: the hint, or the language line.
-    expect(scene(playing({ tick: 100 }))).toContain(BAR);
+    // Without the help the frame of a switch has the bar: the language line.
     expect(scene(playing({ tick: 700 }), { language: 'en', switchedAt: 700 })).toContain(BAR);
   });
 
```

```diff
diff --git a/tests/unit/text.test.ts b/tests/unit/text.test.ts
index fc71f38..c50145d 100644
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -267,7 +267,6 @@ describe('the language table (INV-4, 0016)', () => {
       textOf(textKey(id), 'de'),
       textOf(textKey(id), 'en'),
     ];
-    expect(both('notice.help')).toStrictEqual(['Hilfe: Taste H', 'Help: press H']);
     expect(both('help.key-walk')).toStrictEqual(['Pfeiltasten, WASD', 'Arrow keys, WASD']);
     expect(both('help.do-walk')).toStrictEqual(['Gehen', 'Walk']);
     expect(both('help.key-lamp')).toStrictEqual(['Leertaste', 'Space']);
```

```diff
diff --git a/tests/unit/story.test.ts b/tests/unit/story.test.ts
index ebee670..5ddc943 100644
--- a/tests/unit/story.test.ts
+++ b/tests/unit/story.test.ts
@@ -31,8 +31,8 @@ describe('the scenes of the story (0026)', () => {
     expect(scenePages(0)).toStrictEqual(CALL);
     expect(scenePages(1)).toStrictEqual([]);
     expect(scenePages(-1)).toStrictEqual([]);
-    const scenes: readonly Scene[] = [{ id: 'other', pages: [textKey('notice.help')] }];
-    expect(scenePages(0, scenes)).toStrictEqual([textKey('notice.help')]);
+    const scenes: readonly Scene[] = [{ id: 'other', pages: [textKey('notice.language')] }];
+    expect(scenePages(0, scenes)).toStrictEqual([textKey('notice.language')]);
   });
 
   it('is no speaker of a step: the pages of its dialogue are its own, whoever stands near', () => {
```

- [x] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/unit`
Expected: 6 failed. In `draw-scene.test.ts`: `draws neither bar nor line before the switch,
after two seconds, or without a switch`, and the three tests of
`the bar without a start hint (0031)`. In `help.test.ts`: the two tests of
`what game/help knows (0031)`.

- [x] **Step 3: Take the hint away.**

```diff
diff --git a/src/game/help.ts b/src/game/help.ts
index a4db5bc..d9a13b7 100644
--- a/src/game/help.ts
+++ b/src/game/help.ts
@@ -1,4 +1,3 @@
-import { type TextKey, textKey } from '../text/text';
 import { type GameInput, pressed } from './player';
 import type { GameState } from './state';
 
@@ -6,33 +5,10 @@ import type { GameState } from './state';
  * The help (gameplay.md §8, feature 0021): a box over the game that lists every key. A press
  * of `help` opens it over whatever is there — the world, an open dialogue, the open journal —
  * and a press closes it. While it is open nothing is stepped: time passes, and that is all.
- * For the first seconds of a game one line names its key. Pure data and pure functions.
+ * The label that names its key is drawn by the scene and is no matter of the game (feature
+ * 0031). Pure data and pure functions.
  */
 
-/** The start hint: the line that names the key of the help. */
-export const HELP_HINT: TextKey = textKey('notice.help');
-/** Tune: ten seconds. */
-export const HELP_HINT_STEPS = 600;
-
-/**
- * Whether the start hint is due at `tick`: for the first HELP_HINT_STEPS steps of a game. The
- * tick grows in every step, so the time runs on behind an open help, dialogue or journal; the
- * scene decides what else has the bar first.
- */
-export function helpHintDue(tick: number): boolean {
-  return tick < HELP_HINT_STEPS;
-}
-
-/**
- * Whether the start hint is due in a state (0026): the game's opening has ended, and fewer
- * than HELP_HINT_STEPS steps have passed since. While the call is open it is not due, so the
- * call does not use its ten seconds up. A game past its opening started at 0, and there this
- * is `helpHintDue(tick)`.
- */
-export function startHintDue(state: Pick<GameState, 'tick' | 'started'>): boolean {
-  return state.started !== null && helpHintDue(state.tick - state.started);
-}
-
 /**
  * The state after a press that opens the help, or null when `help` is not pressed: the help
  * open, the tick grown, the input remembered. Nothing else changes, whatever else is open and
```

```diff
diff --git a/src/render/draw-scene.ts b/src/render/draw-scene.ts
index c98aaeb..1c65184 100644
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -3,7 +3,6 @@ import { type Box, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { progressOf } from '../game/cases';
 import { type Figure, figuresIn, figuresOf } from '../game/cast';
 import { CREATURE_SIZE } from '../game/creature';
-import { HELP_HINT, startHintDue } from '../game/help';
 import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
 import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
@@ -294,17 +293,14 @@ export function languageNoticeVisible(tick: number, switchedAt: number | null):
 /**
  * The line the bar shows where no dialogue is open and no notice shows, or null. Where a text
  * is on screen, that text changes with the language; the language line answers a switch only
- * where nothing else would (0019). The start hint has the last place (0021). With the help
- * open the bar shows neither: the box is the answer.
+ * where nothing else would (0019). With the help open the bar does not show it: the box is the
+ * answer. The start hint of 0021 had the last place here until 0031 took it away.
  */
 export function quietLine(state: GameState, settings: SceneSettings): TextKey | null {
   if (state.help) {
     return null;
   }
-  if (languageNoticeVisible(state.tick, settings.switchedAt)) {
-    return LANGUAGE_NOTICE;
-  }
-  return startHintDue(state) ? HELP_HINT : null;
+  return languageNoticeVisible(state.tick, settings.switchedAt) ? LANGUAGE_NOTICE : null;
 }
 
 /** The dialogue box (0017): the notice's bar grown upwards to three lines, the same bottom edge. */
@@ -364,9 +360,7 @@ export function lidHeight(dark: number): number {
  * journal is open the frame is the journal's alone (0020, render/draw-journal), without the
  * label.
  * While the help is open (0021, render/draw-help) its box is drawn last but for the lids, over
- * the world and over the journal alike, and the bar shows neither the language line nor the
- * start hint — the line that names the help's key in the first ten seconds of a game, which
- * has the bar only where nothing else has it.
+ * the world and over the journal alike, and the bar does not show the language line.
  */
 export function drawScene(
   renderer: Renderer,
```

```diff
diff --git a/src/text/de.ts b/src/text/de.ts
index 12c42a9..02cd2d0 100644
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -8,7 +8,6 @@ export const de = {
   'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
   'notice.language': 'Sprache: Deutsch',
   'notice.trace-found': 'Spur gefunden. Sie steht im Journal.',
-  'notice.help': 'Hilfe: Taste H',
   'help.key-walk': 'Pfeiltasten, WASD',
   'help.do-walk': 'Gehen',
   'help.key-lamp': 'Leertaste',
```

```diff
diff --git a/src/text/en.ts b/src/text/en.ts
index 989a852..cbda376 100644
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -5,7 +5,6 @@ export const en: Readonly<Record<keyof typeof de, string>> = {
   'notice.shadow-too-dense': 'This shadow is too dense for the lamp.',
   'notice.language': 'Language: English',
   'notice.trace-found': 'Trace found. It is in the journal.',
-  'notice.help': 'Help: press H',
   'help.key-walk': 'Arrow keys, WASD',
   'help.do-walk': 'Walk',
   'help.key-lamp': 'Space',
```

- [x] **Step 4: Run the tests.**

Run: `npx vitest run tests/unit` and `npm run typecheck`
Expected: all pass, typecheck clean. `tests/arch` now finds no import from `src/text/` in
`src/game/help.ts`, and needs no change.

- [x] **Step 5:** `npm run check` — 1334 tests — then commit: `Take the start hint away`. The
  body: the label of Task 3 names the key for as long as the world is on screen, so the line
  that held the bar for ten seconds says nothing new; the author found it on screen too long.

---

### Task 5: The state forgets when the opening ended

**Files:**
- Modify: `src/game/state.ts`, `src/game/update.ts`, `src/game/overview.ts`
- Test: `tests/unit/opening.test.ts`, `tests/unit/draw-scene.test.ts`,
  `tests/unit/draw-help.test.ts`, `tests/unit/draw-journal.test.ts`,
  `tests/unit/overview.test.ts`, `tests/unit/state.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: nothing reads `started` since Task 4.
- Produces: `GameState` has no field `started`. `newGame(map)` is `createInitialState(map)`
  with the call open and the lamp not owned, and nothing else differs. The step that closes
  the call changes `tick`, `held` and `dialogue`.

- [x] **Step 1: Write the failing tests, and take the field out of every fixture.**
  `opening.test.ts` is criterion 9: the two starts without the field, the closing step of the
  call, and one describe in place of `when the opening ended (0026)`. The other files only
  lose their `started` lines. The smoke spec reads the dialogue and the lamp and no longer
  `started`.

```diff
diff --git a/tests/unit/opening.test.ts b/tests/unit/opening.test.ts
index 17010cc..45b5909 100644
--- a/tests/unit/opening.test.ts
+++ b/tests/unit/opening.test.ts
@@ -54,10 +54,9 @@ const spoken = (map: TileMap, state: GameState) =>
       );
 
 describe('the two starts (0026)', () => {
-  it('starts a played game with the call open, without the lamp, the opening not ended', () => {
+  it('starts a played game with the call open and without the lamp', () => {
     expect(newGame(MAP)).toStrictEqual({
       ...createInitialState(MAP),
-      started: null,
       lamp: { on: false, strength: 1, owned: false, used: false },
       dialogue: { speaker: 'story', index: 0, page: 0 },
     });
@@ -66,7 +65,6 @@ describe('the two starts (0026)', () => {
   it('keeps the initial state a game past its opening: the lamp owned and used, no dialogue', () => {
     const state = createInitialState(MAP);
     expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
-    expect(state.started).toBe(0);
     expect(state.dialogue).toBeNull();
   });
 
@@ -116,10 +114,10 @@ describe('the call (0026)', () => {
     expect(spoken(MAP, second)).toStrictEqual(CALL);
   });
 
-  it('changes nothing but tick, held and dialogue while it is read, and started when it closes', () => {
+  it('changes nothing but tick, held and dialogue, also in the step that closes it (0031)', () => {
     const start = newGame(MAP);
     const closed = called(MAP);
-    expect(closed).toStrictEqual({ ...start, tick: 5, held: TALK, dialogue: null, started: 5 });
+    expect(closed).toStrictEqual({ ...start, tick: 5, held: TALK, dialogue: null });
   });
 
   it('lets the game run once it is closed', () => {
@@ -129,36 +127,23 @@ describe('the call (0026)', () => {
   });
 });
 
-describe('when the opening ended (0026)', () => {
-  it('is not known while the call is open, on any page', () => {
-    expect(newGame(MAP).started).toBeNull();
-    expect(run(MAP, newGame(MAP), TALK, NONE, TALK, NONE).started).toBeNull();
-    expect(steps(MAP, newGame(MAP), OTHERS, 900).started).toBeNull();
-  });
-
-  it('is the tick of the step that closes the call', () => {
-    expect(called(MAP).started).toBe(5);
-    const late = run(MAP, steps(MAP, newGame(MAP), NONE, 895), TALK, NONE, TALK, NONE, TALK);
-    expect(late.dialogue).toBeNull();
-    expect(late.started).toBe(900);
-  });
-
-  it('is changed by no other step: 600 steps, a talk with the officer, the dark and the wake', () => {
+describe('no record of when the opening ended (0031)', () => {
+  it('has no field `started`: not at either start, not after the call, the meeting and the wake', () => {
     const closed = called(MAP);
-    expect(steps(MAP, closed, RIGHT, 600).started).toBe(5);
     const met = run(MAP, closed, NONE, TALK, NONE, TALK, NONE, TALK);
-    expect(met.dialogue).toBeNull();
-    expect(met.started).toBe(5);
+    expect(met.lamp.owned).toBe(true);
     const woken = update({ ...met, dark: 44 }, NONE, MAP);
     expect(woken.dark).toBe(45);
-    expect(woken.started).toBe(5);
-  });
-
-  it('is 0 in a game past its opening, and stays 0', () => {
-    const state = createInitialState(MAP);
-    expect(state.started).toBe(0);
-    expect(run(MAP, state, TALK, NONE, TALK, NONE, TALK).started).toBe(0);
-    expect(update({ ...state, dark: 44 }, NONE, MAP).started).toBe(0);
+    for (const state of [
+      createInitialState(MAP),
+      newGame(MAP),
+      closed,
+      steps(MAP, closed, RIGHT, 600),
+      met,
+      woken,
+    ]) {
+      expect(Object.keys(state)).not.toContain('started');
+    }
   });
 });
 
```

```diff
diff --git a/tests/unit/draw-scene.test.ts b/tests/unit/draw-scene.test.ts
index e40893a..70b3ac4 100644
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -190,7 +190,6 @@ const state = (
   lampOn = false,
 ): GameState => ({
   tick: QUIET_TICK,
-  started: 0,
   rested: null,
   player: player(fields),
   camera,
@@ -1474,11 +1473,10 @@ describe('the story in the scene (0026)', () => {
   const BOX = 'fillRect 8,134 304x42 #181425';
   const BAR = 'fillRect 8,158 304x18 #181425';
   const NO_LAMP = { on: false, strength: 1, owned: false, used: false };
-  /** A new game on the 3x2 map: the call open on `page`, no lamp, the opening not ended. */
+  /** A new game on the 3x2 map: the call open on `page`, no lamp. */
   const calling = (page: number, tick = 0): GameState => ({
     ...state({ x: 20, y: 30 }),
     tick,
-    started: null,
     lamp: NO_LAMP,
     dialogue: { speaker: 'story', index: 0, page },
     overview: { current: 1, max: 2 },
@@ -1545,7 +1543,7 @@ describe('the story in the scene (0026)', () => {
 
   it('draws no cone while the lamp is not owned, whatever is held', () => {
     const renderer = recordingRenderer();
-    drawScene(renderer, { ...calling(0), dialogue: null, started: 5 }, CONTENT);
+    drawScene(renderer, { ...calling(0), dialogue: null }, CONTENT);
     expect(renderer.sheets).not.toContain(CONTENT.lampSheet);
     const owned = recordingRenderer();
     drawScene(owned, state({ x: 20, y: 30 }, { x: 0, y: 0 }, true), CONTENT);
```

```diff
diff --git a/tests/unit/draw-help.test.ts b/tests/unit/draw-help.test.ts
index 9fe62b1..ce762ae 100644
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -91,7 +91,6 @@ const BAR = 'fillRect 8,158 304x18 #181425';
 /** A game with five hearts and the officer standing; the help as `fields` say. */
 const playing = (fields: Partial<GameState> = {}): GameState => ({
   tick: 700,
-  started: 0,
   rested: null,
   player: {
     x: 184,
```

```diff
diff --git a/tests/unit/draw-journal.test.ts b/tests/unit/draw-journal.test.ts
index 029a4ef..8f23a05 100644
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -86,7 +86,6 @@ const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
 /** A game with the journal open on `tab`: five hearts, the lamp on, `snippets` captured. */
 const reading = (tab: JournalTab, snippets = 0): GameState => ({
   tick: 100,
-  started: 0,
   rested: null,
   player: {
     x: 160,
```

```diff
diff --git a/tests/unit/overview.test.ts b/tests/unit/overview.test.ts
index fae69b3..a1513bf 100644
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -162,7 +162,6 @@ describe('stepDark', () => {
   const MAP = grassMap(40, 30, { x: 320, y: 240 }, [{ name: 'wake', x: 80, y: 60 }]);
   const FALLEN: GameState = {
     tick: 500,
-    started: 0,
     rested: null,
     player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
     camera: { x: 140, y: 106 },
@@ -193,7 +192,6 @@ describe('stepDark', () => {
     expect(darkSteps(43)).toStrictEqual({
       ...FALLEN,
       tick: 543,
-      started: 0,
       rested: null,
       lamp: { on: false, strength: 1, owned: true, used: true },
       dark: 44,
@@ -205,7 +203,6 @@ describe('stepDark', () => {
     const player = figure(80, 60, 'down');
     expect(woken).toStrictEqual({
       tick: 544,
-      started: 0,
       rested: null,
       player,
       camera: followPlayer(player, MAP),
```

```diff
diff --git a/tests/unit/state.test.ts b/tests/unit/state.test.ts
index 37d37a3..54700a5 100644
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -79,7 +79,6 @@ describe('GameState (INV-1)', () => {
   it('starts at tick 0 with the player at the spawn, facing down, standing, the camera on it', () => {
     expect(createInitialState(MAP)).toStrictEqual({
       tick: 0,
-      started: 0,
       rested: null,
       player: {
         x: 136,
@@ -149,7 +148,6 @@ describe('update', () => {
     const next = update(
       {
         tick: 41,
-        started: 0,
         rested: null,
         player,
         camera: { x: 0, y: 12 },
@@ -179,7 +177,6 @@ describe('update', () => {
   it('leaves its input unchanged', () => {
     const state: GameState = {
       tick: 7,
-      started: 0,
       rested: null,
       player,
       camera: { x: 0, y: 12 },
@@ -201,7 +198,6 @@ describe('update', () => {
     update(state, RIGHT, MAP);
     expect(state).toStrictEqual({
       tick: 7,
-      started: 0,
       rested: null,
       player,
       camera: { x: 0, y: 12 },
```

```diff
diff --git a/tests/e2e/smoke.spec.ts b/tests/e2e/smoke.spec.ts
index f533697..6bc2452 100644
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -86,21 +86,17 @@ test('the game opens with the call, without the lamp, and three presses of E clo
       () =>
         page.evaluate(() => {
           const state = window.shadowAi?.state;
-          return state === undefined
-            ? undefined
-            : { dialogue: state.dialogue, lamp: state.lamp, started: state.started };
+          return state === undefined ? undefined : { dialogue: state.dialogue, lamp: state.lamp };
         }),
-      { message: 'a new game: the call on page 0, no lamp, the opening not ended' },
+      { message: 'a new game: the call on page 0, no lamp' },
     )
     .toStrictEqual({
       dialogue: call(0),
       lamp: { on: false, strength: 1, owned: false, used: false },
-      started: null,
     });
   await start(page);
   const state = await page.evaluate(() => window.shadowAi?.state);
   expect(state?.dialogue).toBeNull();
-  expect(state?.started).toBeGreaterThan(0);
   expect(state?.lamp.owned).toBe(false);
 });
 
```

- [x] **Step 2: Run them and see them fail.**

Run: `npx vitest run`
Expected: 5 failed. Three in `opening.test.ts` — `starts a played game with the call open and
without the lamp`, `changes nothing but tick, held and dialogue, also in the step that closes
it (0031)` and `has no field `started` …`. And two that compare a state with a fixture that
has lost the field the state still has: `the 44th step, dark 45, sets the world right` in
`overview.test.ts` and `starts at tick 0 with the player at the spawn …` in `state.test.ts`.
`npm run typecheck` is red between this step and the next: the fixtures no longer have a
field the type still asks for. That is expected.

- [x] **Step 3: Take the field out of the state,** and out of the four places that set or
  carry it: the two starts, the closing of the call, the ordinary step and the wake.

```diff
diff --git a/src/game/state.ts b/src/game/state.ts
index 12a29d6..f531ff8 100644
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -174,11 +174,6 @@ export interface Overview {
 export interface GameState {
   /** Logic steps since the start; one step is 1/60 s (INV-3). */
   readonly tick: number;
-  /**
-   * The tick of the step in which the game's opening ended — the step that closed the call — or
-   * null while it has not (0026). The start hint of the help counts from it.
-   */
-  readonly started: number | null;
   readonly player: PlayerState;
   /**
    * The view's top-left corner in map pixels, two integers (0006). Derived from the player after
```

```diff
diff --git a/src/game/update.ts b/src/game/update.ts
index 641aa07..f241fe8 100644
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -58,7 +58,6 @@ export function createInitialState(map: TileMap): GameState {
   };
   return {
     tick: 0,
-    started: 0,
     player,
     camera: followPlayer(player, map),
     lamp: { on: false, strength: BASE_STRENGTH, owned: true, used: true },
@@ -81,13 +80,12 @@ export function createInitialState(map: TileMap): GameState {
 
 /**
  * The state a played game starts with (0026): the initial state with the call open on its
- * first page, the lamp not yet owned, and the opening not ended. `main.ts` starts with it; the
- * tests of the earlier features step from `createInitialState`.
+ * first page and the lamp not yet owned. `main.ts` starts with it; the tests of the earlier
+ * features step from `createInitialState`.
  */
 export function newGame(map: TileMap): GameState {
   return {
     ...createInitialState(map),
-    started: null,
     lamp: { on: false, strength: BASE_STRENGTH, owned: false, used: false },
     dialogue: { speaker: 'story', index: OPENING_SCENE, page: 0 },
   };
@@ -95,10 +93,9 @@ export function newGame(map: TileMap): GameState {
 
 /**
  * What the step that closed a dialogue changes besides closing it (0024, 0025, 0026). Closing
- * the scene a game opens with ends the opening: `started` is this step's tick. Closing the
- * first meeting hands the lamp over. Closing the source's answer of a ready case solves the
- * case, and what is left of the region's shadow goes with it. Every other closing changes
- * nothing more.
+ * the first meeting hands the lamp over. Closing the source's answer of a ready case solves the
+ * case, and what is left of the region's shadow goes with it. Every other closing — that of a
+ * scene of the story, the call among them — changes nothing more.
  */
 function closed(
   stepped: GameState,
@@ -107,9 +104,7 @@ function closed(
   content: TileMap,
 ): GameState {
   if (dialogue.speaker === 'story') {
-    return dialogue.index === OPENING_SCENE && stepped.started === null
-      ? { ...stepped, started: stepped.tick }
-      : stepped;
+    return stepped;
   }
   if (isFirstMeeting(dialogue, figuresOf(content.points), before.lamp.owned)) {
     return { ...stepped, lamp: { ...stepped.lamp, owned: true } };
@@ -208,7 +203,6 @@ export function update(state: GameState, input: GameInput, content: TileMap): Ga
       : applyHit(stepped, before, hitter);
   return {
     tick: state.tick + 1,
-    started: state.started,
     player,
     camera: followPlayer(player, content),
     lamp,
```

```diff
diff --git a/src/game/overview.ts b/src/game/overview.ts
index 461416c..7d02555 100644
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -131,7 +131,6 @@ function woken(state: GameState, map: TileMap): GameState {
   };
   return {
     tick: state.tick,
-    started: state.started,
     player,
     camera: followPlayer(player, map),
     lamp: { ...state.lamp, on: false },
```

- [x] **Step 4: Run the tests.**

Run: `npx vitest run` and `npm run typecheck`
Expected: all pass, typecheck clean. Then `grep -rn "started" src tests`: two comments, in
`src/game/state.ts` and in `tests/unit/player.test.ts`, and the new test of
`opening.test.ts`. The two recordings of 600 steps pass with their hashes unchanged.

- [x] **Step 5:** `npm run check` — 1331 tests — then commit: `Take the end of the opening
  out of the state`. The body: 0026 kept `started` for the start hint alone; with the hint
  gone nothing reads it, and a state should hold nothing that no rule and no picture needs.
  No save state exists yet, so no stored state loses a field.

---

### Task 6: The documents

**Files:**
- Modify: `docs/spec/vision.md`, `docs/spec/gameplay.md`, `docs/spec/visual.md`,
  `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md`

The diffs are against this branch at `defef2b`. If a line has moved, put the text where the diff
means it; do not change the words without a reason. The words of steps 1 to 3 are the spec's,
from "What this settles in the specification".

- [x] **Step 1: `vision.md`** §2:

```diff
diff --git a/docs/spec/vision.md b/docs/spec/vision.md
index dbd6c18..b56e701 100644
--- a/docs/spec/vision.md
+++ b/docs/spec/vision.md
@@ -27,8 +27,8 @@ Two purposes, in this order:
    and show a situation the visitor recognizes from their own company within the first minutes.
    Tutorial text is text that explains the game: what the shadow is, what the lamp is for, what
    to do next. The game has none. The help (feature 0021) is not tutorial text: a list of keys
-   the player calls up, and one line at the start that names its key. It says which key does
-   what, and nothing about why. The line that names the lamp's key when the lamp is handed
+   the player calls up, and a small label in a corner of the screen that names its key (feature
+   0031). It says which key does what, and nothing about why. The line that names the lamp's key when the lamp is handed
    over (feature 0026) is of the same kind.
 
 The game is presented by LMIS, and one real product stands in its world: Harmonic (§10). Both
```

- [x] **Step 2: `gameplay.md`** §8 — the paragraph of 0021 loses its sentences on the line,
  and 0031 gets its own:

```diff
diff --git a/docs/spec/gameplay.md b/docs/spec/gameplay.md
index b75e0d7..dc6daa2 100644
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -238,11 +238,12 @@ first page and then the page that hands the lamp over; afterwards she says her t
 **As built** (feature 0021): a press of H opens the help, a box over the game with seven rows —
 a key and what it does — and a second press closes it. The game stands still while it is open,
 and everything goes on where it stood when it closes. The help opens over a dialogue and over
-the journal, which keep their page and their tab, and not in the dark. For the first ten
-seconds of a game one line in the notice's bar names the key — `Hilfe: Taste H` or
-`Help: press H` — behind every other text, and it does not come back. A held key counts once.
-Since feature 0026 the ten seconds begin when the call is closed, so that the call does not
-hide the line.
+the journal, which keep their page and their tab, and not in the dark. A held key counts once.
+
+**As built** (feature 0031): a small label in the top right corner names the key of the help
+for as long as the world is on screen — `H Hilfe` or `H Help` — also during a dialogue and with
+the help open. The journal's screen does not have it. The line that named the key at the start
+is gone.
 
 ## 9. Deliberately simple in the first draft
 
```

- [x] **Step 3: `visual.md`** §3 — three things over the world, and no start hint in the
  bar:

```diff
diff --git a/docs/spec/visual.md b/docs/spec/visual.md
index 852db1c..f758a85 100644
--- a/docs/spec/visual.md
+++ b/docs/spec/visual.md
@@ -59,16 +59,17 @@ The drone has no drop shadow: a dark patch on the floor would read as the shadow
 like a colleague, drawn from the figure's frames in a shirt no one else wears, so it is told from
 the colleagues at a glance. The data protection officer's shirt is `#c0cbdc`, light grey.
 
-**The display.** Two things are drawn over the world. The row of overview hearts in the
+**The display.** Three things are drawn over the world. The row of overview hearts in the
 top-left corner (features 0009, 0012): 8x8, 4 px from the corner, one every 10 px, one per point
-of the maximum. And the notice (feature 0016), while there is one: a bar in `#181425` at the
+of the maximum. The help label in the top-right corner (feature 0031): the words `H Hilfe` or
+`H Help` in white on a field in `#181425` with a frame of 1 px in `#3a4466` — the colours of the
+help's box —, 47x14 in German and 41x14 in English, 4 px from the corner; the frame's right edge
+stays where it is in both languages. And the notice (feature 0016), while there is one: a bar in `#181425` at the
 bottom, 8 px from the left, the right and the bottom edge, 304x18, with one white line centred in
 it. While a dialogue is open the dialogue box (feature 0017) is drawn in the notice's place: the
 notice's bar grown upwards to three lines, (8, 134, 304, 42) in `#181425`, with the page's white
 lines left-aligned from (12, 138), 12 px apart, and in its lower right corner a small white
-triangle that points down and blinks once a second — a press goes on. For the first ten
-seconds of a game the same bar holds the start hint (feature 0021), one white line that names
-the key of the help, where no other text has the bar. A heart is 7x7 with a rim
+triangle that points down and blinks once a second — a press goes on. A heart is 7x7 with a rim
 in `#181425`, red `#e43b44` when full and
 `#3a4466` when empty. The screen of the dark is two rectangles in `#181425` that close from the top
 and the bottom; nothing is blended, so no pixel leaves the palette.
```

- [x] **Step 4: `architecture.md`** §1, §2, §5 and §8 — the directory line of `game/help.ts`;
  the two starts and the state without `started`; the label's paragraph, the order of the
  scene and the bar without the hint; the kind `help` with its third rule:

```diff
diff --git a/docs/spec/architecture.md b/docs/spec/architecture.md
index 64a32ab..192eaa3 100644
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -25,7 +25,7 @@ src/
                  journal's tabs, entries and step (0020); game/rects.ts the kinds of
                  rectangle a map holds, by the prefix of the name; game/trace.ts the traces,
                  their light test, their step and the entries of the cases tab (0022);
-                 game/help.ts the help's step and when the start hint is due (0021);
+                 game/help.ts the help's step (0021);
                  game/region.ts the areas of the regions and the veil of a cell (0023), the
                  cleared regions and the veil of a clearing (0025);
                  game/cases.ts the cases, when one is ready, what its source says, the
@@ -135,14 +135,13 @@ start, and kept in the state so a saved game comes back as it was left.
 types and constants only.
 
 There are two starts (feature 0026). `createInitialState(map)` is a game **past its opening**:
-no dialogue open, the lamp owned and used, `started` 0. The tests of the earlier features step
+no dialogue open, the lamp owned and used. The tests of the earlier features step
 from it. `newGame(map)` is what a player gets, and what `main.ts` starts with: the same state
-with `dialogue` `{ speaker: 'story', index: 0, page: 0 }` — the call on its first page —,
-`lamp` `{ on: false, strength: 1, owned: false, used: false }` and `started` `null`.
+with `dialogue` `{ speaker: 'story', index: 0, page: 0 }` — the call on its first page — and
+`lamp` `{ on: false, strength: 1, owned: false, used: false }`.
 
-`started` is the `tick` of the step in which the game's opening ended, or `null` while it has
-not (feature 0026). The step that closes the call sets it to its own `tick`; no other step
-changes it, and the wake keeps it. The start hint of the help counts from it (§5).
+The state does not record when the opening ended. Feature 0026 kept that as `started`, for the
+start hint of the help alone; feature 0031 took the hint and the field away.
 
 `lamp` is `{ on, strength, owned, used }` (features 0007, 0014, 0026): `owned` says whether the
 player has the lamp, and `used` whether it was on in any step since — `false` after the first
@@ -302,10 +301,8 @@ traces in every frame by `caseEntries` (feature 0022). A solved case's entry als
 outcome, `outcomeOf`; the policy's blocks are the solved cases' blocks in the order they were
 solved, `policyBlocks` — both derived from `solved` in every frame (feature 0024).
 `help` is a boolean, `false` at the start: whether the help is open (feature 0021,
-`game/help`). The rows the help shows and whether the start hint is due are not in the state:
-the rows are constants of `render/draw-help`, and the hint is derived from `tick` and `started`
-in every frame (`startHintDue`, feature 0026: `started` is not `null` and `tick` − `started` <
-`HELP_HINT_STEPS`; `helpHintDue` is the same test on the steps since the start).
+`game/help`). The rows the help shows and the label that names its key (feature 0031) are not
+in the state: they are constants of `render/draw-help`, and no rule of the game reads them.
 
 The **speakers** of a step (feature 0018, `speakersOf` in `game/talk`) are the standing figures in
 file order, then the movers of the kind `person` whose route is in `COLLEAGUES` (`game/cast`), in
@@ -343,9 +340,8 @@ the left and the upper edge included) leaves `creatures`, wherever it is; `captu
 change, and a creature at home outside the region stays. The step changes
 `tick`, `held`, `dialogue`, `solved`, `overview`, `shadowWalls` and `creatures` and nothing
 else; no other step solves a case, and a solved case is not solved again. The wake brings back
-only the creatures still in `creatures`, so none that left this way. Two more closings change
-something (feature 0026): the step that closes the call — the scene `OPENING_SCENE`, while
-`started` is `null` — sets `started` to its `tick`; and the step that closes the first meeting
+only the creatures still in `creatures`, so none that left this way. One more closing changes
+something (feature 0026): the step that closes the first meeting
 (`isFirstMeeting`: the lamp is not owned, and the speaker is the figure of `FIRST_MEETING`) sets
 `lamp.owned` to `true` and leaves `lamp.used` `false`. Closing any other dialogue changes
 neither. **Ordinary:** otherwise, a press of `journal` opens the journal on `creatures`, whatever else
@@ -483,7 +479,7 @@ over the cells under shadow (feature 0023) and over those of a region that is cl
 the light is on in array order (feature 0022), the ground movers whose feet y is at most the player's in array order, the standing figures whose feet y is
 at most the player's (feature 0017), the creatures in array order, the player, the other
 standing figures, the other ground movers in array order, `above` (§6), the drones (feature
-0015), the hearts of overview, the dialogue box while a dialogue is open or else the notice
+0015), the hearts of overview, the help label (feature 0031), the dialogue box while a dialogue is open or else the notice
 (features 0016, 0017), the help while it is open (feature 0021), the lids of the dark. A ground mover is a person, a dog or a vacuum; comparing the feet makes walking past a colleague read as depth, and a
 drone flies over the tops of `above`. The player's sprite has its top-left corner at
 (round(x) − 8 − camera.x, round(y) − 24 − camera.y): the feet are the bottom centre of the
@@ -551,8 +547,20 @@ camera: heart i, for i below `max`, has its top-left corner at (4 + 10i, 4), wit
 steps, stay closed for 30 and open in 30. While `grace` is above 0 the player's sprite is left
 out in every frame in which ⌊grace / 4⌋ is odd; the cone is drawn as before.
 
+The help label (feature 0031, `drawHelpLabel` in `render/draw-help`) is drawn on the surface,
+not shifted by the camera, directly after the hearts, in every frame in which the scene draws
+the world: nothing of the state decides it — not `tick`, not a dialogue, not a notice, not the
+help, not the dark. With n the number of characters of the key `help.label` in the language of
+the settings, `helpLabelPlace(n)` gives the frame, a rectangle (311 − 6n, 4, 6n + 5, 14) in
+`#3a4466`; the field, (312 − 6n, 5, 6n + 3, 12) in `#181425`; and the origin of the words,
+(314 − 6n, 6). In German that is (269, 4, 47, 14), (270, 5, 45, 12) and (272, 6); in English
+(275, 4, 41, 14), (276, 5, 39, 12) and (278, 6). The frame ends 4 px from the surface's right
+edge in every language. A label of 8 characters, the most the rule allows, begins at x = 263,
+right of seven hearts, which end at x = 71; the label ends at y = 17, above the help's box. The
+journal's screen has no label: its third tab has that corner.
+
 The notice (feature 0016) is drawn on the surface, not shifted by the camera, after the hearts
-and before the lids: when `game/notice` names one, a rectangle (8, 158, 304, 18) in `#181425`,
+and the help label and before the lids: when `game/notice` names one, a rectangle (8, 158, 304, 18) in `#181425`,
 then its line, a string of n characters from (160 − 3n, 162). The bar leaves 4 px around the
 10 px line and holds at most 49 characters; a test holds every notice of the table to that in
 both languages. Text is drawn by `render/draw-text`, the one function that draws it: it takes a
@@ -577,15 +585,13 @@ every frame. `SceneContent` holds loaded content only. Every text of the scene i
 `language`. The language line, the key `notice.language`, is drawn like the notice — the bar
 (8, 158, 304, 18) in `#181425` and the line centred in it — when `switchedAt` is not null and
 0 ≤ `tick` − `switchedAt` < `LANGUAGE_NOTICE_STEPS` (120, two seconds), no dialogue is open and
-no notice shows. The start hint (feature 0021), the key `notice.help`, is drawn the same way
-when it is due — `startHintDue` in `game/help`: the opening has ended, `started` is not `null`,
-and `tick` − `started` < `HELP_HINT_STEPS` (600, ten seconds; feature 0026, it was `tick` <
-600) —, no dialogue is open, no notice shows and the language line is not due. The dialogue box comes first, then the
-notice, then the language line, then the start hint: where a text is on screen, that text
-changes with the language and is the answer to a switch. `quietLine` names the line of the bar
-where no dialogue is open and no notice shows: none while the help is open, else the language
-line when it is due, else the start hint when it is due. The lids of the dark close over the
-line as over everything.
+no notice shows. The dialogue box comes first, then the notice, then the language line: where
+a text is on screen, that text changes with the language and is the answer to a switch.
+`quietLine` names the line of the bar where no dialogue is open and no notice shows: none while
+the help is open, else the language line when it is due, else none. The start hint of feature
+0021, a line that named the help's key for ten seconds, had the last place in the bar until
+feature 0031 replaced it with the help label. The lids of the dark close over the line as over
+everything.
 
 A standing figure (feature 0017) is drawn from its own sheet, `<id>.png`, like a colleague who
 stands: frame facing × 5, top-left corner at (round(x) − 8 − camera.x, round(y) − 24 −
@@ -624,8 +630,8 @@ second ending at y = 142. `draw-journal` imports only types
 from `draw-scene`, and `draw-scene` imports `drawJournal`.
 
 The help (feature 0021, `render/draw-help`). While `help` is `true`, `drawScene` draws what it
-draws otherwise — the world with its hearts and the dialogue box or the notice, or the journal —
-but neither the language line nor the start hint, and then the help: after everything else and
+draws otherwise — the world with its hearts, the help label and the dialogue box or the notice,
+or the journal — but not the language line, and then the help: after everything else and
 before the lids, and after the journal when the journal is open. The lids never meet it: the
 help does not open in the dark, and no dark begins while it is open. In the language of the
 settings, on the surface and not shifted by the camera, it draws the frame, a rectangle
@@ -636,7 +642,7 @@ fullscreen, help — row k from 0 with its key from (56, 38 + 12k) and what it d
 of 16 characters ends at x = 266; the last row ends at y = 120, 7 px above the field's lower
 edge. The box keeps clear of the hearts (to y = 12), the journal's tabs and rule (to y = 24) and
 the dialogue box (from y = 134). `draw-help` imports nothing from `draw-scene`, and `draw-scene`
-imports `drawHelp`.
+imports `drawHelp` and `drawHelpLabel`.
 
 The interface exists so the implementation can change (ADR-0001 names PixiJS as the candidate)
 without touching `game/`. It is not an abstraction for its own sake: it has exactly one
@@ -1126,9 +1132,10 @@ one line of at most 24 characters, and every region with a trace on the floor ha
 of a language: `render/draw-text` draws it with `drawNumber`, which takes a number and nothing
 else, and it needs no key; `drawText` still takes a `TextKey` only.
 
-The help (feature 0021) adds the key `notice.help`, the start hint, one line that the notice's
-bar holds like every notice, and one kind. `help.key-<what>` is the name of a key, one line of
-at most 17 characters; `help.do-<what>` what it does, one line of at most 16. `HELP_ROWS` in
+The help (feature 0021) adds one kind. `help.key-<what>` is the name of a key, one line of
+at most 17 characters; `help.do-<what>` what it does, one line of at most 16; and `help.label`
+(feature 0031) the words of the help label, one line of at most 8. The key `notice.help`, the
+start hint of 0021, is gone with feature 0031. `HELP_ROWS` in
 `render/draw-help` names them by key, seven rows in the order walk, lamp, talk, journal,
 language, fullscreen, help; a test holds every key of the kind to the rule of its kind in both
 languages. The letter of a key is a string of the table like every other text, also where it is
```

- [x] **Step 5: `testing.md`** §1, the row of the unit tests:

```diff
diff --git a/docs/spec/testing.md b/docs/spec/testing.md
index 7b468e6..aa445cc 100644
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -8,7 +8,7 @@ rule can be proved without a browser.
 
 | Layer | Runs with | Covers |
 |---|---|---|
-| **Unit** | Vitest, Node | engine math (movement, collision, camera), among it the box resolver against a picture grid and the loaded corridor fixture and against boxes thinner than a cell — strips, a post, a doorway between two strips — a sight line against the solid boxes, a 2 px strip, a 3 px push against it, a chair's box and a screen's panel (0011), and the camera: centring, the four clamps, the corners, rounding, the view constants; game rules (the player's movement, facing, clamp and walk cycle, and the player's box against solid tiles: flush stops, the slide, corners and a one-tile gap, and a wall strip that holds a push; and the camera in the state: the spawn's camera, following the walk, the clamp on the small map; the lamp's cone: the apex, the half-open length, the slope, what lies behind and beside the apex, per facing; the figure holding the lamp: standing, turning, the reset of the walk cycle, the resumed walk; the lamp in the state; the creature's step: rest, approach, the stop at 8 px, sliding and the clamp, the light, the count to 60, the break, a wall and a 4 px strip in the light, the light across a low box that still stops the walk and behind an opaque one; the arcade cabinet and a beanbag of the placeholder tileset in the light (0013); the creatures and the captured count in the state; the hit: reach, the frozen creature, array order, grace, the push and its direction, the last point; the dark: the sequence step by step, the wake point and its fallback and rejection; overview, grace and the push in the state), the keyboard state and the binding resolver, the map loader against Tiled JSON fixtures and the test map fixture, the named points with their three rejections, and collision rectangles in the tileset with their four rejections and a spawn in a strip, low tiles and the opaque boxes with the rejection of a low tile without a box, the floor map against its generator and the spec's layout: the ring and its windows, the areas, every wall cell's strip and every opening, the posts, the closed doors, the tile counts, the free spawn, the view's first cell, reachability on foot over a 2 px lattice — every room but the lift and the stairwell, the meeting rooms only through the side passage — and its three snippets: free boxes, reached, none in the first view, and its wake point: a free box, reached, in the data protection officer's office; the furnished floor against the spec's picture, its tile counts, its pieces, the empty areas, its tall things, every cubicle reached, the counter in the first view and the opaque boxes; the lounge and the gadgets against the picture of 0013, their counts and pieces, the ten replaced cells, every cell without a solid box reached, row 18 of Development, the seating corner in the first view; path resolution, the cells a layer draws for a camera, and the draw order of the scene with the camera offset and the cone's frame per facing, and the creatures' frames, the hearts, the lids and the blink, the tile generator against the committed tileset and each strip's pixels against its boxes, the furniture tiles pixel by pixel with their boxes and `low`, the tiles of 0013 likewise and ids 0–29 against the sheet of 0011, the sprite generators against the committed sheets, the lamp sheet pixel by pixel against the cone, the snippet sheet pixel by pixel, the overview sheet pixel by pixel; the movers (0015): routes from points — their order, `look`, the `pause` property in the loader and its rejection, and the route rejections with their messages on points built in the test — the step: wait, move, the exact arrival, the wrap to the first point, the speeds of the four kinds, facing per leg, the frames of a person and a dog, yield at 19.9, 20 and 20.1 px, the drone that does not yield; the movers in the state: the round trip after 600 steps, the dark, a map refused for a crossing route, and 600 recorded steps on the floor with movers against the same run without; the 22 routes of the floor against the spec's tables and every ground leg free, the first view's person and dog; the scene's order of ground movers, figure and drones, their origins and frames by `tick`; the seven sheets against their generators, the vacuum and the drone pixel by pixel; the world data (0014): the densities and upgrades of the spec, the strength after each upgrade, `gatingFaults` on the real data and on four tables with one fault each; the shadow walls (0014): rectangles in the loader with their four rejections, the walls read from them with their four refusals, the box against the cone at the thirteen positions of the spec, the sight line to a wall's last pixel, the step to 60 and the break, the dense wall that holds, the map with the walls as solid and opaque boxes; the walls in the state: the round trips, the figure flush from four sides and sliding, the held push, the snippet held and kept out of the light, the dark and the wake, 600 recorded steps without walls against a map without rectangles; the eight walls of the floor against the spec's table, on their openings, clear of every solid box, and the four floods; the walls' looks, segments and place in the scene; the wall sheet pixel by pixel; the loop with a fake clock and its once-per-frame input, the language table; the help (0021): opening over the world, over a dialogue and over the journal, which keep their page and their tab, with other keys held and in the middle of a push, the 600 steps that stand still with every other key held, closing with keys held through it, the held key that opens once, the dark, the start hint by `tick`, the rows and the box with their origins in both languages, and the scene with the help over the world, a dialogue and the journal, the start hint in the bar and its place behind the dialogue box, the notice and the language line |
+| **Unit** | Vitest, Node | engine math (movement, collision, camera), among it the box resolver against a picture grid and the loaded corridor fixture and against boxes thinner than a cell — strips, a post, a doorway between two strips — a sight line against the solid boxes, a 2 px strip, a 3 px push against it, a chair's box and a screen's panel (0011), and the camera: centring, the four clamps, the corners, rounding, the view constants; game rules (the player's movement, facing, clamp and walk cycle, and the player's box against solid tiles: flush stops, the slide, corners and a one-tile gap, and a wall strip that holds a push; and the camera in the state: the spawn's camera, following the walk, the clamp on the small map; the lamp's cone: the apex, the half-open length, the slope, what lies behind and beside the apex, per facing; the figure holding the lamp: standing, turning, the reset of the walk cycle, the resumed walk; the lamp in the state; the creature's step: rest, approach, the stop at 8 px, sliding and the clamp, the light, the count to 60, the break, a wall and a 4 px strip in the light, the light across a low box that still stops the walk and behind an opaque one; the arcade cabinet and a beanbag of the placeholder tileset in the light (0013); the creatures and the captured count in the state; the hit: reach, the frozen creature, array order, grace, the push and its direction, the last point; the dark: the sequence step by step, the wake point and its fallback and rejection; overview, grace and the push in the state), the keyboard state and the binding resolver, the map loader against Tiled JSON fixtures and the test map fixture, the named points with their three rejections, and collision rectangles in the tileset with their four rejections and a spawn in a strip, low tiles and the opaque boxes with the rejection of a low tile without a box, the floor map against its generator and the spec's layout: the ring and its windows, the areas, every wall cell's strip and every opening, the posts, the closed doors, the tile counts, the free spawn, the view's first cell, reachability on foot over a 2 px lattice — every room but the lift and the stairwell, the meeting rooms only through the side passage — and its three snippets: free boxes, reached, none in the first view, and its wake point: a free box, reached, in the data protection officer's office; the furnished floor against the spec's picture, its tile counts, its pieces, the empty areas, its tall things, every cubicle reached, the counter in the first view and the opaque boxes; the lounge and the gadgets against the picture of 0013, their counts and pieces, the ten replaced cells, every cell without a solid box reached, row 18 of Development, the seating corner in the first view; path resolution, the cells a layer draws for a camera, and the draw order of the scene with the camera offset and the cone's frame per facing, and the creatures' frames, the hearts, the lids and the blink, the tile generator against the committed tileset and each strip's pixels against its boxes, the furniture tiles pixel by pixel with their boxes and `low`, the tiles of 0013 likewise and ids 0–29 against the sheet of 0011, the sprite generators against the committed sheets, the lamp sheet pixel by pixel against the cone, the snippet sheet pixel by pixel, the overview sheet pixel by pixel; the movers (0015): routes from points — their order, `look`, the `pause` property in the loader and its rejection, and the route rejections with their messages on points built in the test — the step: wait, move, the exact arrival, the wrap to the first point, the speeds of the four kinds, facing per leg, the frames of a person and a dog, yield at 19.9, 20 and 20.1 px, the drone that does not yield; the movers in the state: the round trip after 600 steps, the dark, a map refused for a crossing route, and 600 recorded steps on the floor with movers against the same run without; the 22 routes of the floor against the spec's tables and every ground leg free, the first view's person and dog; the scene's order of ground movers, figure and drones, their origins and frames by `tick`; the seven sheets against their generators, the vacuum and the drone pixel by pixel; the world data (0014): the densities and upgrades of the spec, the strength after each upgrade, `gatingFaults` on the real data and on four tables with one fault each; the shadow walls (0014): rectangles in the loader with their four rejections, the walls read from them with their four refusals, the box against the cone at the thirteen positions of the spec, the sight line to a wall's last pixel, the step to 60 and the break, the dense wall that holds, the map with the walls as solid and opaque boxes; the walls in the state: the round trips, the figure flush from four sides and sliding, the held push, the snippet held and kept out of the light, the dark and the wake, 600 recorded steps without walls against a map without rectangles; the eight walls of the floor against the spec's table, on their openings, clear of every solid box, and the four floods; the walls' looks, segments and place in the scene; the wall sheet pixel by pixel; the loop with a fake clock and its once-per-frame input, the language table; the help (0021): opening over the world, over a dialogue and over the journal, which keep their page and their tab, with other keys held and in the middle of a push, the 600 steps that stand still with every other key held, closing with keys held through it, the held key that opens once, the dark, the rows and the box with their origins in both languages, and the scene with the help over the world, a dialogue and the journal; the help label (0031): its place by the number of characters, its calls in both languages, its place after the hearts in every frame of the world and its absence on the journal's screen, and the bar that holds no start hint |
 | **Architecture** | Vitest, Node | the import graph and source text of `src/game/` (INV-2); the branded text type is enforced by the compiler (INV-4) |
 | **Assets** | Vitest, Node | every PNG under `public/` against Endesga 32 and the reserved colour, allowed only in the listed shadow assets, alpha 0 or 255 with transparent pixels exempt; tilesets under `public/tiles/` sized in multiples of 16; `.tsj` files against their PNG (INV-6) |
 | **Smoke** | Playwright, one spec | the page loads, the canvas exists at the full factor and unclipped, the picture's corner shows carpet `#8b9bb4`, the view's first cell at the spawn; the player starts at x = 256 with the camera at (96, 624); one second of ArrowRight moves the player and the camera right by at least 70 px and leaves the player facing right; a held Space turns the lamp on and holds the figure in place with ArrowRight held, and the release turns it off; the floor starts with three snippets and nothing captured; the floor starts with its 22 movers and the reception's person is drawn in its shirt `#3e8948`; overview is five of five and the dark is not running; the floor starts with its eight shadow walls standing and a lamp of strength 1, read from `window.shadowAi.state`; `L` switches `window.shadowAi.language` and the page's `lang` from `de` to `en` and back, once per press, a held key once (0019); `H` opens the help, the figure stands under it with `ArrowRight` held, and `H` closes it (0021) — against the dev server and against the built container; against the container (`BASE_URL`) also the four security headers, the cache headers and gzip (INV-5) |
```

- [x] **Step 6: `README.md`:**

```diff
diff --git a/README.md b/README.md
index ddc3ca6..f56f0e8 100644
--- a/README.md
+++ b/README.md
@@ -38,7 +38,8 @@ world stands still while it is open. The four colleagues who walk the floor can
 well, across the counter too, and each has a saying (feature 0018). `L` switches the game between
 German and English at any moment (feature 0019). `J` opens the journal with its three tabs;
 a captured snippet has its entry there (feature 0020). `H` opens the help, a box that lists
-every key, and for the first ten seconds a line at the bottom names it (feature 0021).
+every key (feature 0021), and a small label in the top right corner names that key for as
+long as the world is on screen (feature 0031).
 Milestones M3 and M4 are complete, and M5, the first act, has begun: the lamp finds traces on
 the screens of Sales, and the journal counts them on its cases tab (feature 0022). The regions
 under shadow are drawn darker, without colour and under a violet veil whose density is the
```

- [x] **Step 7:** `grep -rn "start hint\|notice\.help\|HELP_HINT\|helpHintDue\|startHintDue"
  docs/spec README.md src` shows only sentences that say the hint is gone — in
  `architecture.md` §2, §5 and §8, in `testing.md` §1 and in the comment of `quietLine`.
  `docs/features/` and `docs/plans/` are history and are not changed. Then `npm run check`,
  and commit — `Move the help label into the spec`.

---

### Task 7: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 17 passed, 3 skipped. Mind the constraint on a dev server of another worktree.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 7 in this file and commit —
  `Tick the full check of 0031`.

---

### Task 8: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow
  keys or WASD to walk, `E` or `Enter` to talk, `J` for the journal, `L` for the language,
  `H` for the help, and that the walk begins with a reload. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–20 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each
  answer as given. Never answer a step yourself, and do not look at the game in a browser
  beforehand: the automated checks are the only pre-check.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 7, and start again at step 1.
- [ ] **Step 4:** after step 20 ask the six feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–20`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0031`. A feel note that wants something
  else — a colon, no frame, another corner, the label on the journal's screen, a line at the
  start after all — becomes a new draft, not a change on this branch.

---

### Task 9: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 7. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M5 section, say that 0031 is
  implemented too and that M5 is done: 0031 was the last of the seven. Commit — `Mark 0031 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0031: the help label`, with the walk's result and feel notes in its description,
  and one line for the features in work: `GameState.started` is gone, so a branch that holds
  a fixture of the whole state loses that line when it merges `main`. CI must be green. The
  author merges.
