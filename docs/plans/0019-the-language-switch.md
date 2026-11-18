# 0019 — Implementation plan: the language switch

**Spec:** [`docs/features/0019-the-language-switch.md`](../features/0019-the-language-switch.md)
(approved 2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §4, §5 and §8 and
`docs/spec/testing.md` §5. **Written:** 2026-11-18 on the planning model. A working document,
not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0018 is merged into `main`. The branch
`feature/0019-the-language-switch` exists on that `main` and holds the settled questions of
0019 and 0020, the approval of 0019 and this plan. Work on it; merge the latest `main` into it
before Task 1. The draft of 0020 is on `main` and is **not** built here.

**Goal:** a press of `L` switches the game between German and English at any moment; every
text on screen changes with the next frame, and where no text is on screen a line names the
language for two seconds.

**Approach:** four code tasks, each green on its own. The text: `nextLanguage` and the line's
key (T1). The scene: the settings as its fourth argument, and the language line (T2) — with
the two lines of `main.ts` that keep it compiling. The key: the handler in `main.ts`, proved by
the smoke spec (T3). The architecture rule that keeps the type `Language` out of `src/game/`
(T4). Then the documents (T5), the full check with the container (T6), the walk (T7) and the
pull request (T8).

**How this plan was checked:** the code and the tests of Tasks 1 to 4 were run once as a
prototype on 2026-11-18, on the tip of 0018 as its pull request holds it: typecheck, Biome,
the build, 877 unit tests (868 before) and the smoke spec against the dev server were green,
the new smoke test included. The state after Task 2 alone was checked too: typecheck clean,
876 tests. The prototype was thrown away; nothing of it is on the branch. If a step does not
behave as written, the cause is a difference to that state — stop and look; do not bend a
test. The container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- **No file under `src/game/` is touched.** `GameState` and `GameInput` do not change. The
  language is a setting of the player: `main.ts` holds it, the scene draws with it.
- INV-1: nothing is added to the state. `switchedAt` is a number of `main.ts`, not a field of
  `GameState`.
- INV-4: the line's words live in `src/text/de.ts` and `src/text/en.ts`; `draw-scene.ts` holds
  the key.
- INV-5: nothing is stored: no `localStorage`, no cookie. A reload starts in German.
- The key is handled like `fullscreen`: in the `keydown` listener of `main.ts`, without
  `repeat`, without Ctrl, Alt or Cmd, never passed to the game. `engine/input` is **not**
  changed, and `readInput` still returns the six actions of the game.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: `language` ← `KeyL`; `LANGUAGE_NOTICE_STEPS` 120; the
  line is drawn while `switchedAt` is not `null` and 0 ≤ `tick` − `switchedAt` < 120, no
  dialogue is open and the notice of 0016 does not show; it is drawn like that notice: the bar
  (8, 158, 304, 18) in `#181425`, the line centred — `Sprache: Deutsch` from (112, 162),
  `Language: English` from (109, 162).

## File structure

| File | Change |
|---|---|
| `src/text/text.ts` | `nextLanguage` |
| `src/text/de.ts`, `src/text/en.ts` | the key `notice.language` |
| `src/render/draw-scene.ts` | `SceneSettings`; `SceneContent` loses `language`; `drawScene` takes the settings; `LANGUAGE_NOTICE`, `LANGUAGE_NOTICE_STEPS`, `languageNoticeVisible`; the language line |
| `src/main.ts` | the settings, `switchLanguage`, the binding `language` ← `KeyL`, `window.shadowAi.language`, the page's `lang` |
| `tests/arch/game-boundary.ts` | the rule against the type `Language` in `src/game/` |
| `tests/unit/text.test.ts`, `tests/unit/draw-scene.test.ts`, `tests/arch/game-boundary.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 5 |

---

### Task 1: The next language, and the line's words

**Files:**
- Modify: `src/text/text.ts`, `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: `nextLanguage(language: Language): Language`; the text id `notice.language`.

- [x] **Step 1: Write the failing tests.**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -2,6 +2,7 @@ import { describe, expect, expectTypeOf, it } from 'vitest';
 import {
   DEFAULT_LANGUAGE,
   LANGUAGES,
+  nextLanguage,
   TABLE,
   type TextId,
   type TextKey,
@@ -15,6 +16,18 @@ describe('the language table (INV-4, 0016)', () => {
     expect(DEFAULT_LANGUAGE).toBe('de');
   });
 
+  it('goes from each language to the next, and from the last to the first (0019)', () => {
+    expect(nextLanguage('de')).toBe('en');
+    expect(nextLanguage('en')).toBe('de');
+    expect(LANGUAGES.map(nextLanguage)).toStrictEqual(['en', 'de']);
+  });
+
+  it('names the language that is on, in that language (0019)', () => {
+    const key = textKey('notice.language');
+    expect(textOf(key, 'de')).toBe('Sprache: Deutsch');
+    expect(textOf(key, 'en')).toBe('Language: English');
+  });
+
   it('has the same keys in `de` and in `en`', () => {
     expect(Object.keys(TABLE.en).sort()).toStrictEqual(Object.keys(TABLE.de).sort());
   });
```

- [x] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/unit/text.test.ts`
Expected: FAIL — `nextLanguage` is not exported, and `notice.language` is no key.

- [x] **Step 3: Add the function and the strings.**

```diff
--- a/src/text/text.ts
+++ b/src/text/text.ts
@@ -9,9 +9,14 @@ import { en } from './en';
 /** German first, English second (vision.md §7). */
 export const LANGUAGES = ['de', 'en'] as const;
 export type Language = (typeof LANGUAGES)[number];
-/** The language the game shows until it can be switched (0019). */
+/** The language of every load; `L` switches it while the game runs (0019). */
 export const DEFAULT_LANGUAGE: Language = 'de';
 
+/** The language after `language` in LANGUAGES, the first after the last (0019). */
+export function nextLanguage(language: Language): Language {
+  return LANGUAGES[(LANGUAGES.indexOf(language) + 1) % LANGUAGES.length] ?? DEFAULT_LANGUAGE;
+}
+
 /** The ids of the table: the keys of `de`. */
 export type TextId = keyof typeof de;
 
```

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -6,6 +6,7 @@
  */
 export const de = {
   'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
+  'notice.language': 'Sprache: Deutsch',
   'talk.officer-rules-1': [
     'Du siehst den Schatten also auch.',
     'Er bleibt überall dort zurück, wo Daten das',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -3,6 +3,7 @@ import type { de } from './de';
 /** English, the second language: exactly the keys of `de`, or it does not compile. */
 export const en: Readonly<Record<keyof typeof de, string>> = {
   'notice.shadow-too-dense': 'This shadow is too dense for the lamp.',
+  'notice.language': 'Language: English',
   'talk.officer-rules-1': [
     'So you can see the shadow too.',
     'It stays behind wherever data leaves the house',
```

- [x] **Step 4: Run the tests.**

Run: `npx vitest run tests/unit/text.test.ts tests/unit/font.test.ts tests/unit/draw-scene.test.ts`
Expected: PASS. The tests of 0016 hold the new notice to one line and to the bar's 49
characters without a change.

- [x] **Step 5:** `npm run check`, then commit — `Name the language that is on`.

---

### Task 2: The settings and the language line in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`, `src/main.ts` (two lines, so that it compiles)
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `notice.language` and `Language` from Task 1 and `text/text`.
- Produces, in `render/draw-scene`:
  `interface SceneSettings { readonly language: Language; readonly switchedAt: number | null }`;
  `SceneContent` without `language`;
  `drawScene(renderer, state, content, settings: SceneSettings): void`;
  `LANGUAGE_NOTICE: TextKey`; `LANGUAGE_NOTICE_STEPS = 120`;
  `languageNoticeVisible(tick: number, switchedAt: number | null): boolean`.

- [x] **Step 1: Change the scene tests.** The file's own `drawScene` becomes a wrapper that
  passes the settings of a fresh game, `{ language: 'de', switchedAt: null }`, so the 33
  existing calls stay as they are and expect what they expected. The two English tests of
  0016 and 0017 pass `ENGLISH`. A new block of six tests follows at the end of the file.

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -17,14 +17,16 @@ import {
   DIALOGUE_LINES,
   DIALOGUE_MARKER,
   DIALOGUE_TEXT,
-  drawScene,
+  drawScene as drawSceneWith,
   figureFrame,
   figureOrigin,
   HEART_MARGIN,
   HEART_PITCH,
   HEART_SIZE,
+  LANGUAGE_NOTICE_STEPS,
   lampFrame,
   lampFrameOrigin,
+  languageNoticeVisible,
   lidHeight,
   MARKER_BLINK_STEPS,
   markerVisible,
@@ -36,6 +38,7 @@ import {
   playerFrame,
   playerVisible,
   type SceneContent,
+  type SceneSettings,
   wallLook,
   wallSegments,
 } from '../../src/render/draw-scene';
@@ -103,8 +106,17 @@ const CONTENT: SceneContent = {
   },
   fontSheet: { image: {} as ImageBitmap, frameWidth: 6, frameHeight: 10 },
   figureSheets: { officer: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 } },
-  language: 'de',
 };
+/** The settings of a game in which the language was never switched (0019). */
+const GERMAN: SceneSettings = { language: 'de', switchedAt: null };
+const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
+/** The scene with the settings of a fresh game, unless a test hands over its own. */
+const drawScene = (
+  renderer: Renderer,
+  scene: GameState,
+  content: SceneContent,
+  settings: SceneSettings = GERMAN,
+): void => drawSceneWith(renderer, scene, content, settings);
 const player = (fields: Partial<PlayerState>): PlayerState => ({
   x: 0,
   y: 0,
@@ -682,8 +694,7 @@ describe('the notice in the scene (0016)', () => {
 
   it('draws the English line when the language is `en`', () => {
     const renderer = recordingRenderer();
-    const english: SceneContent = { ...CONTENT, language: 'en' };
-    drawScene(renderer, holding(), english);
+    drawScene(renderer, holding(), CONTENT, ENGLISH);
     const line = spritesOn(renderer, CONTENT.fontSheet);
     expect(line).toHaveLength(31);
     expect(line[0]).toBe('drawSprite 52 at 46,162');
@@ -851,7 +862,7 @@ describe('the dialogue box in the scene (0017)', () => {
 
   it('draws the page in English when the language is `en`', () => {
     const renderer = recordingRenderer();
-    drawScene(renderer, talking(0), { ...content, language: 'en' });
+    drawScene(renderer, talking(0), content, ENGLISH);
     const line = spritesOn(renderer, content.fontSheet);
     expect(line).toHaveLength(82);
     expect(line[0]).toBe('drawSprite 51 at 12,138');
@@ -926,3 +937,108 @@ describe('the dialogue box in the scene (0017)', () => {
     }
   });
 });
+
+describe('the language line in the scene (0019)', () => {
+  const BAR = 'fillRect 8,158 304x18 #181425';
+  /** One full and one empty heart, no notice, no dialogue. */
+  const quiet = (tick: number, fields: Partial<GameState> = {}): GameState => ({
+    ...state({ x: 20, y: 30 }),
+    tick,
+    overview: { current: 1, max: 2 },
+    ...fields,
+  });
+  const switched = (language: SceneSettings['language'], switchedAt: number | null) => ({
+    language,
+    switchedAt,
+  });
+  const fontCalls = (renderer: ReturnType<typeof recordingRenderer>): string[] =>
+    renderer.calls
+      .filter((call) => call.startsWith('drawSprite'))
+      .filter((_call, i) => renderer.sheets[i] === CONTENT.fontSheet);
+
+  it('is due for 120 steps from the switch, and never without one', () => {
+    expect(LANGUAGE_NOTICE_STEPS).toBe(120);
+    expect([99, 100, 219, 220].map((tick) => languageNoticeVisible(tick, 100))).toStrictEqual([
+      false,
+      true,
+      true,
+      false,
+    ]);
+    expect(languageNoticeVisible(0, 0)).toBe(true);
+    expect(languageNoticeVisible(100, null)).toBe(false);
+  });
+
+  it('names the language that is on, in that language, centred in the bar after the hearts', () => {
+    const english = recordingRenderer();
+    drawScene(english, quiet(100), CONTENT, switched('en', 100));
+    const bar = english.calls.indexOf(BAR);
+    expect(bar).toBeGreaterThan(english.calls.indexOf('drawSprite 1 at 14,4'));
+    const line = english.calls.slice(bar + 1);
+    // `Language: English` has 17 characters, 16 of them drawn; `L` is glyph 44.
+    expect(line).toHaveLength(16);
+    expect(line[0]).toBe('drawSprite 44 at 109,162');
+    expect(line.at(-1)).toBe('drawSprite 72 at 205,162');
+    expect(fontCalls(english)).toStrictEqual(line);
+
+    const german = recordingRenderer();
+    drawScene(german, quiet(219), CONTENT, switched('de', 100));
+    // `Sprache: Deutsch` has 16 characters, 15 of them drawn; `S` is glyph 51.
+    const lineDe = german.calls.slice(german.calls.indexOf(BAR) + 1);
+    expect(lineDe).toHaveLength(15);
+    expect(lineDe[0]).toBe('drawSprite 51 at 112,162');
+  });
+
+  it('draws neither bar nor line before the switch, after two seconds, or without a switch', () => {
+    for (const [tick, switchedAt] of [
+      [99, 100],
+      [220, 100],
+      [100, null],
+    ] as const) {
+      const renderer = recordingRenderer();
+      drawScene(renderer, quiet(tick), CONTENT, switched('en', switchedAt));
+      expect(renderer.calls, `tick ${tick}`).not.toContain(BAR);
+      expect(fontCalls(renderer)).toStrictEqual([]);
+    }
+  });
+
+  it('leaves the bar to the notice of 0016, which itself changes its language', () => {
+    const holding = quiet(100, {
+      lamp: { on: true, strength: 1 },
+      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
+    });
+    const renderer = recordingRenderer();
+    drawScene(renderer, holding, CONTENT, switched('en', 100));
+    const line = fontCalls(renderer);
+    // `This shadow is too dense for the lamp.`: 38 characters, 31 drawn, `T` is glyph 52.
+    expect(line).toHaveLength(31);
+    expect(line[0]).toBe('drawSprite 52 at 46,162');
+    expect(renderer.calls.filter((call) => call === BAR)).toHaveLength(1);
+  });
+
+  it('draws no line while a dialogue is open: the page changes its language instead', () => {
+    const content: SceneContent = {
+      ...CONTENT,
+      map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
+    };
+    const talking = quiet(100, {
+      figures: [{ figure: 0, facing: 'left' }],
+      dialogue: { speaker: 'figure', index: 0, page: 0 },
+    });
+    const renderer = recordingRenderer();
+    drawScene(renderer, talking, content, switched('en', 100));
+    expect(renderer.calls).not.toContain(BAR);
+    const page = fontCalls(renderer);
+    expect(page).toHaveLength(82);
+    expect(page[0]).toBe('drawSprite 51 at 12,138');
+  });
+
+  it('closes the lids over the line', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, quiet(100, { dark: 10 }), CONTENT, switched('en', 100));
+    expect(renderer.calls).toContain(BAR);
+    expect(renderer.calls.slice(-2)).toStrictEqual([
+      'fillRect 0,0 320x30 #181425',
+      'fillRect 0,150 320x30 #181425',
+    ]);
+  });
+});
```

- [x] **Step 2: Run and see it fail.**

Run: `npm run typecheck`
Expected: errors in `tests/unit/draw-scene.test.ts` — `SceneSettings`, `LANGUAGE_NOTICE_STEPS`
and `languageNoticeVisible` are not exported, and `drawScene` takes three arguments.

- [x] **Step 3: Change the scene.**

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -19,7 +19,7 @@ import {
   type Species,
 } from '../game/state';
 import { speakerOf, speakersOf } from '../game/talk';
-import { type Language, textOf } from '../text/text';
+import { type Language, textKey, textOf } from '../text/text';
 import { drawLayer } from './draw-map';
 import { drawText } from './draw-text';
 import { GLYPH_HEIGHT, GLYPH_WIDTH } from './font';
@@ -56,8 +56,17 @@ export interface SceneContent {
   readonly fontSheet: SpriteSheet;
   /** One sheet per figure of the cast, by its id: twenty 16x24 frames like the player's (0017). */
   readonly figureSheets: Readonly<Record<string, SpriteSheet>>;
+}
+
+/**
+ * The player's settings of the scene (0019): not part of the game's state and not loaded
+ * content — main.ts holds them and hands them over with every frame.
+ */
+export interface SceneSettings {
   /** The language text is drawn in. */
   readonly language: Language;
+  /** The state's tick at the last switch of the language; null when it was never switched. */
+  readonly switchedAt: number | null;
 }
 
 /** The frame in the player sheet: facing × 5 + phase, facings in FACINGS order. */
@@ -251,6 +260,16 @@ export function noticeOrigin(length: number): Point {
   };
 }
 
+/** The language line (0019): which language is on, in that language, in the notice's bar. */
+export const LANGUAGE_NOTICE = textKey('notice.language');
+/** Tune: two seconds. */
+export const LANGUAGE_NOTICE_STEPS = 120;
+
+/** Whether the language line is due at `tick`: for LANGUAGE_NOTICE_STEPS steps from the switch. */
+export function languageNoticeVisible(tick: number, switchedAt: number | null): boolean {
+  return switchedAt !== null && tick >= switchedAt && tick - switchedAt < LANGUAGE_NOTICE_STEPS;
+}
+
 /** The dialogue box (0017): the notice's bar grown upwards to three lines, the same bottom edge. */
 export const DIALOGUE_BOX: Box = { x: 8, y: 134, width: 304, height: 42 };
 /** Where the first line of a page starts; the lines are left-aligned. */
@@ -298,11 +317,18 @@ export function lidHeight(dark: number): number {
  * pixels (engine/camera). The cone lies under the figure, so the body hides the apex. After
  * `above` come the hearts of overview, on the surface and not shifted by the camera; then,
  * while a dialogue is open, the dialogue box with the page's lines and its blinking marker
- * (0017), else the notice — the bar and its line (0016) — both on the surface and not shifted
- * by the camera; and last the two lids of the dark (0009). A safe figure blinks; its cone and
- * the movers do not.
+ * (0017), else the notice — the bar and its line (0016) — else, for two seconds after a switch
+ * of the language, the language line in the same bar (0019); all on the surface and not
+ * shifted by the camera; and last the two lids of the dark (0009). Every text is drawn in the
+ * language of the settings. A safe figure blinks; its cone and the movers do not.
  */
-export function drawScene(renderer: Renderer, state: GameState, content: SceneContent): void {
+export function drawScene(
+  renderer: Renderer,
+  state: GameState,
+  content: SceneContent,
+  settings: SceneSettings,
+): void {
+  const { language } = settings;
   const { player, camera } = state;
   renderer.clear(PAGE_BACKGROUND);
   drawLayer(renderer, content.map, content.tileset, 'ground', camera);
@@ -385,22 +411,28 @@ export function drawScene(renderer: Renderer, state: GameState, content: SceneCo
       DIALOGUE_BOX.height,
       PAGE_BACKGROUND,
     );
-    drawText(renderer, content.fontSheet, page, content.language, DIALOGUE_TEXT.x, DIALOGUE_TEXT.y);
+    drawText(renderer, content.fontSheet, page, language, DIALOGUE_TEXT.x, DIALOGUE_TEXT.y);
     if (markerVisible(state.tick)) {
       for (const part of DIALOGUE_MARKER) {
         renderer.fillRect(part.x, part.y, part.width, part.height, MARKER_COLOUR);
       }
     }
-  } else if (notice !== null) {
-    renderer.fillRect(
-      NOTICE_BAR.x,
-      NOTICE_BAR.y,
-      NOTICE_BAR.width,
-      NOTICE_BAR.height,
-      PAGE_BACKGROUND,
-    );
-    const origin = noticeOrigin(textOf(notice, content.language).length);
-    drawText(renderer, content.fontSheet, notice, content.language, origin.x, origin.y);
+  } else {
+    // Where a text is on screen, that text changes with the language; the line answers a
+    // switch only where nothing else would.
+    const line =
+      notice ?? (languageNoticeVisible(state.tick, settings.switchedAt) ? LANGUAGE_NOTICE : null);
+    if (line !== null) {
+      renderer.fillRect(
+        NOTICE_BAR.x,
+        NOTICE_BAR.y,
+        NOTICE_BAR.width,
+        NOTICE_BAR.height,
+        PAGE_BACKGROUND,
+      );
+      const origin = noticeOrigin(textOf(line, language).length);
+      drawText(renderer, content.fontSheet, line, language, origin.x, origin.y);
+    }
   }
   const lid = lidHeight(state.dark);
   if (lid > 0) {
```

- [x] **Step 4: Keep `main.ts` compiling.** The content no longer carries the language; until
  Task 3 the scene is drawn with constant settings:

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -128,7 +128,6 @@
         ]),
       ),
     ),
-    language: DEFAULT_LANGUAGE,
   };
 }
 
@@ -201,7 +200,7 @@
       update: (state, input) => update(state, input, content.map),
       render(state) {
         handle.state = state;
-        drawScene(renderer, state, content);
+        drawScene(renderer, state, content, { language: DEFAULT_LANGUAGE, switchedAt: null });
         // Read every frame: this covers resize, zoom, fullscreen and a move to another monitor.
         renderer.present(
           computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio),
```

- [x] **Step 5: Run the tests.**

Run: `npm run typecheck && npx vitest run tests/unit/draw-scene.test.ts`
Expected: PASS — the file has 58 tests. Then `npm run test`: 876 tests, every file green.

- [x] **Step 6:** `npm run check`, then commit —
  `Draw the scene in the language of its settings`. The body says that the language is a
  setting of the player and not a fact of the game, so it stays out of the state.

---

### Task 3: The key

The handler lives in `main.ts`, which no unit test loads; the smoke spec is its test.

**Files:**
- Modify: `src/main.ts`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `nextLanguage`, `SceneSettings`.
- Produces: `window.shadowAi: { state: GameState; language: Language }`; the binding
  `language` ← `KeyL`.

- [x] **Step 1: Write the failing smoke test,** at the end of `tests/e2e/smoke.spec.ts`. A
  second `keydown` without a `keyup` is what a held key sends: Playwright marks it `repeat`.

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -232,3 +232,24 @@ test.describe('served by the container', () => {
     expect(page.headers['content-encoding']).toBe('gzip');
   });
 });
+
+test('L switches the language once per press, and the page says which one is on', async ({
+  page,
+}) => {
+  await page.goto('/');
+  const language = () => page.evaluate(() => window.shadowAi?.language);
+  const lang = () => page.evaluate(() => document.documentElement.lang);
+  await expect
+    .poll(language, { message: 'window.shadowAi.language is German after loading' })
+    .toBe('de');
+  expect(await lang()).toBe('de');
+  await page.keyboard.press('KeyL');
+  await expect.poll(language, { message: 'one press of L switches to English' }).toBe('en');
+  expect(await lang()).toBe('en');
+  // A second keydown without a keyup is the repeat of a held key: it switches nothing.
+  await page.keyboard.down('KeyL');
+  await page.keyboard.down('KeyL');
+  await page.keyboard.up('KeyL');
+  await expect.poll(language, { message: 'a held L switches once, back to German' }).toBe('de');
+  expect(await lang()).toBe('de');
+});
```

- [x] **Step 2: Run it and see it fail.**

Run: `npm run test:e2e`
Expected: the new test FAILS at its first poll — `window.shadowAi.language` is `undefined`.
`npm run typecheck` fails too: `language` is no property of `window.shadowAi`. If a dev
server already runs on port 5173, Playwright uses it.

- [x] **Step 3: Hold the settings in `main.ts` and switch them on `L`.**

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -11,18 +11,19 @@
 import type { GameState } from './game/state';
 import { createInitialState, update } from './game/update';
 import { createCanvas2dRenderer } from './render/canvas2d/canvas2d-renderer';
-import { drawScene, HEART_SIZE, type SceneContent } from './render/draw-scene';
+import { drawScene, HEART_SIZE, type SceneContent, type SceneSettings } from './render/draw-scene';
 import { GLYPH_HEIGHT, GLYPH_WIDTH } from './render/font';
 import { computeLayout } from './render/scale';
-import { DEFAULT_LANGUAGE } from './text/text';
+import { DEFAULT_LANGUAGE, type Language, nextLanguage } from './text/text';
 
 declare global {
   interface Window {
     /**
-     * The game's one global (0004): the state passed to the last render, so that the smoke test
-     * can read the player's position. Read-only by convention; absent until the content loaded.
+     * The game's one global (0004): the state passed to the last render and the language it was
+     * drawn in (0019), so that the smoke test can read them. Read-only by convention; absent
+     * until the content loaded.
      */
-    shadowAi?: { state: GameState };
+    shadowAi?: { state: GameState; language: Language };
   }
 }
 
@@ -150,8 +151,24 @@
   });
 }
 
-type Action = keyof GameInput | 'fullscreen';
+/**
+ * The player's settings (0019): the language, German on every load, and the tick of its last
+ * switch. Not part of the game's state: a saved game does not carry them.
+ */
+let settings: SceneSettings = { language: DEFAULT_LANGUAGE, switchedAt: null };
 
+/** L goes to the next language. Before the content has loaded there is no tick to note. */
+function switchLanguage(): void {
+  const handle = window.shadowAi;
+  if (handle === undefined) {
+    return;
+  }
+  settings = { language: nextLanguage(settings.language), switchedAt: handle.state.tick };
+  document.documentElement.lang = settings.language;
+}
+
+type Action = keyof GameInput | 'fullscreen' | 'language';
+
 /** architecture.md §4: the one table from physical keys to actions. */
 const BINDINGS: Bindings<Action> = {
   up: ['ArrowUp', 'KeyW'],
@@ -161,6 +178,7 @@
   lamp: ['Space'],
   talk: ['KeyE', 'Enter'],
   fullscreen: ['KeyF'],
+  language: ['KeyL'],
 };
 const BOUND_CODES: ReadonlySet<string> = new Set(Object.values(BINDINGS).flat());
 
@@ -169,8 +187,8 @@
 
 // A bound key without Ctrl, Alt or Cmd belongs to the game: its default is prevented, so the
 // arrows never scroll the page and Space neither scrolls nor clicks a focused control; with a
-// modifier the browser keeps its own shortcut. F toggles fullscreen once per press here and
-// never reaches the game.
+// modifier the browser keeps its own shortcut. F toggles fullscreen and L switches the language,
+// each once per press, here: neither reaches the game.
 window.addEventListener('keydown', (event) => {
   if (!BOUND_CODES.has(event.code) || event.ctrlKey || event.altKey || event.metaKey) {
     return;
@@ -179,9 +197,12 @@
   if (BINDINGS.fullscreen.includes(event.code) && !event.repeat) {
     toggleFullscreen();
   }
+  if (BINDINGS.language.includes(event.code) && !event.repeat) {
+    switchLanguage();
+  }
 });
 
-/** The game's actions of this frame; `fullscreen` stays in main.ts. */
+/** The game's actions of this frame; `fullscreen` and `language` stay in main.ts. */
 function readInput(): GameInput {
   const { up, down, left, right, lamp, talk } = resolveActions(keyboard.held, BINDINGS);
   return { up, down, left, right, lamp, talk };
@@ -191,7 +212,7 @@
 async function start(): Promise<void> {
   const renderer = createCanvas2dRenderer(findCanvas());
   const content = await loadContent();
-  const handle = { state: createInitialState(content.map) };
+  const handle = { state: createInitialState(content.map), language: settings.language };
   window.shadowAi = handle;
   runLoop(
     handle.state,
@@ -200,7 +221,8 @@
       update: (state, input) => update(state, input, content.map),
       render(state) {
         handle.state = state;
-        drawScene(renderer, state, content, { language: DEFAULT_LANGUAGE, switchedAt: null });
+        handle.language = settings.language;
+        drawScene(renderer, state, content, settings);
         // Read every frame: this covers resize, zoom, fullscreen and a move to another monitor.
         renderer.present(
           computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio),
```

  The handler reads the tick from `window.shadowAi`, which exists once the content has
  loaded; before that `L` does nothing. `handle.language` is set in `render`, so the global
  reports the language of the last frame.

- [x] **Step 4: Run.**

Run: `npm run typecheck && npm run test:e2e`
Expected: PASS — ten tests, three skipped (they need the container).

- [x] **Step 5:** `npm run check`, then commit — `Switch the language with L`.

---

### Task 4: Keep the language out of the game

**Files:**
- Modify: `tests/arch/game-boundary.ts`
- Test: `tests/arch/game-boundary.test.ts`

- [x] **Step 1: Write the failing test.**

```diff
--- a/tests/arch/game-boundary.test.ts
+++ b/tests/arch/game-boundary.test.ts
@@ -69,6 +69,18 @@ describe('src/game/ touches no browser and no renderer (INV-2)', () => {
     expect(checkGameSource('src/game/ok.ts', source)).toStrictEqual([]);
   });
 
+  it('reports the type Language: the game does not know the language (0019)', () => {
+    const source = [
+      "import { type Language, type TextKey } from '../text/text';",
+      'const spoken: Language = pick();',
+      '// the language of the scene is a setting',
+    ].join('\n');
+    expect(checkGameSource('src/game/bad.ts', source)).toStrictEqual([
+      "src/game/bad.ts:1: uses the type 'Language'",
+      "src/game/bad.ts:2: uses the type 'Language'",
+    ]);
+  });
+
   it('allows imports from engine/ and text/', () => {
     const source =
       "import { clamp } from '../engine/math';\nimport type { TextKey } from '../text/keys';\n";
```

- [x] **Step 2: Run it and see it fail.**

Run: `npx vitest run tests/arch`
Expected: FAIL in the new test — the check reports nothing.

- [x] **Step 3: Add the rule.** It is over the source text, like the browser names; the word
  `language` in lower case stays allowed.

```diff
--- a/tests/arch/game-boundary.ts
+++ b/tests/arch/game-boundary.ts
@@ -1,10 +1,15 @@
 /**
  * The rule behind INV-2: nothing in src/game/ reaches src/render/ or the browser. The check runs
  * over the source text, line by line — comments included — so a forbidden name cannot hide.
+ * Since 0019 it also keeps the type `Language` out: the game passes keys and does not know
+ * which language they are drawn in.
  */
 
 const FORBIDDEN_NAMES = ['window', 'document', 'HTMLCanvasElement', 'Image', 'fetch'] as const;
 
+/** The type of the player's language setting (text/text.ts). Case matters: `language` is a word. */
+const LANGUAGE_TYPE = /\bLanguage\b/;
+
 /** `from '…'`, `import '…'` and `import('…')` — the specifier is group 1. */
 const IMPORT_SPECIFIER = /\b(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g;
 
@@ -27,6 +32,9 @@ export function checkGameSource(file: string, source: string): string[] {
         findings.push(`${file}:${lineNumber}: uses the browser name '${name}'`);
       }
     }
+    if (LANGUAGE_TYPE.test(line)) {
+      findings.push(`${file}:${lineNumber}: uses the type 'Language'`);
+    }
   }
   return findings;
 }
```

- [x] **Step 4: Run.** `npx vitest run tests/arch` — PASS, and every file under `src/game/`
  is still clean. `npm run test`: 877 tests.

- [x] **Step 5:** `npm run check`, then commit — `Keep the type Language out of the game`.

---

### Task 5: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/architecture.md`, `docs/spec/vision.md`,
  `docs/spec/testing.md`, `README.md`

- [x] **Step 1: `gameplay.md` §8.** The list of keys gains: `L` switches between German and
  English. Add a paragraph **As built** (feature 0019): a press of `L` switches the language
  at any moment — while walking, with the lamp held, with a dialogue open, in the dark; every
  text on screen changes at once; where no text is on screen a line names the language that
  is on, in that language, for two seconds; every load starts in German and nothing is
  remembered; the title screen of M8 will hold the switch.

- [x] **Step 2: `architecture.md`.** §4: the action `language` ← L, handled in `main.ts` on
  `keydown` without `repeat` and without Ctrl, Alt or Cmd, like `fullscreen`; it never reaches
  the game, which still gets six actions. §5: `drawScene` takes the settings
  `{ language, switchedAt }` as its fourth argument; `SceneContent` holds loaded content only;
  the language line — when it is drawn, where, and that the dialogue box and the notice come
  first. §8: replace "Until the language switch (0019) the game shows German only; English is
  in the table and tested" — the language is a setting that `main.ts` holds, `DEFAULT_LANGUAGE`
  on every load, changed by `nextLanguage`; it is not in the state and `src/game/` does not
  know it; `window.shadowAi` carries it for the smoke test. Where §2 or §5 says that `main.ts`
  sets the content's language, correct it.

- [x] **Step 3: `vision.md` §7.** After "The language is switched on the title screen": until
  the title screen exists (M8), `L` switches it while playing (feature 0019).

- [x] **Step 4: `testing.md` §2.** The INV-2 row gains the rule that `tests/arch/` fails on
  the type `Language` in `src/game/` (0019). The INV-4 row gains: the scene tests draw the
  notice and a page in both languages, and the smoke test switches the language with `L`.

- [x] **Step 5: `README.md`:** one sentence after the one on the colleagues — `L` switches
  the game between German and English at any moment (feature 0019). Add `L` where the README
  lists the keys, if it does.

- [x] **Step 6:** `npm run check`, then commit — `Move the language switch into the spec`.

---

### Task 6: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing. `git diff main -- src/game` is empty.
- [x] **Step 5:** tick the boxes of Tasks 1 to 6 in this file and commit —
  `Tick the full check of 0019`.

---

### Task 7: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk,
  `L` for the language. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–20 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 6, and start again at step 1.
- [ ] **Step 4:** after step 20 ask the four feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–20`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0019`. A feel note that wants something
  else — another key, the browser's language at the start, other English words — becomes a
  new draft, not a change on this branch.

---

### Task 8: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 6. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4 change "0019 is approved" to say that
  0019 is implemented; commit — `Mark 0019 implemented`. The row of 0020 stays as it is.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0019: the language switch`, with the walk's result and feel notes in its
  description. CI must be green. The author merges.
