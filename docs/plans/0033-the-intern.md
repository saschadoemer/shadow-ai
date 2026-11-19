# 0033 — Implementation plan: the intern

**Spec:** [`docs/features/0033-the-intern.md`](../features/0033-the-intern.md) (approved
2026-11-19). The plan argues from the spec; where they differ, the spec wins. Read the spec
first, then `CLAUDE.md`, then `docs/spec/world.md` §3, `docs/spec/gameplay.md` §8,
`docs/spec/architecture.md` §2 and §6 and `docs/spec/testing.md` §5. **Written:** 2026-11-19
on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0032 is merged into `main` (`9794d43` or later). The branch
`feature/0033-the-intern` exists, cut from that `main`, and holds this plan. Work on it;
merge the latest `main` into it before Task 1. The specs 0034 to 0038 are on `main`; they are
approved, have no plan yet, and are **not** built here.

**Goal:** the intern stands in the break room and says one page when he is asked: where the
next step is, picked from how far the player has come.

**Approach:** four code tasks, each green on its own. The words (T1). The sheet (T2) — it
must exist before the cast has the intern, because the loader asks for one sheet per member
of the cast. The hints (T3): the cast gets the intern, `game/hints` picks his page, and the
step and the scene give it to him — after it a map with a point `figure:intern` has a figure
that says the hint of the moment, and the floor has none. The floor (T4): his point. Then
the documents (T5), the full check with the container (T6), the walk (T7) and the pull
request (T8).

**How this plan was checked:** the code and the tests of Tasks 1 to 4 were run once as a
prototype on 2026-11-19, on the source of `main` at `9794d43`, and then replayed task by task,
each task's tests before its code: they failed as the steps say, and after each of the four
tasks typecheck and Biome were clean and the unit tests green — 1497, 1500, 1525 and 1536
tests (1496 before). `npm run gen-sprites` wrote the prototype's `intern.png` byte for byte
and changed no other sheet; `npm run gen-floor` gave the prototype's `floor.tmj` byte for
byte, 13 lines added and one changed. The blocks of this file, applied in order to a clean
tree, gave the prototype's files. `npm run check` with the build passed on the whole
prototype, and the smoke spec passed twice against a dev server of it: 18 passed, 3 skipped;
its changed test was run once before the code of Task 4 and failed with one figure. On the
floor as loaded, the intern is out of reach from every feet position from which a coffee
machine is in reach — criterion 3 holds with the cell of the spec. The prototype was thrown
away; nothing of it is on the branch. If a step does not behave as written, the cause is a
difference to that state — stop and look; do not bend a test. The game was **not** played in
a browser — that is the walk — and the container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: the state gets no field. `figures` has a second entry on the floor. The hint is
  **derived** on every call from the lamp, the traces and the solved cases.
- INV-2: `game/hints` imports from `game/cases`, `game/cast` and the text table; the scene
  imports `hintOf` and `withHint` from it.
- INV-4: the eight strings live in `src/text/de.ts` and `src/text/en.ts`; `hints.ts` and
  `cast.ts` hold keys.
- INV-6: `intern.png` uses the figure's palette colours and `#0099db`; it is written by
  `npm run gen-sprites` and never edited by hand.
- INV-7: his place is the point `figure:intern` of the map; `tools/floor-layout.ts` holds it
  in `FIGURES`. No tile changes.
- **One place picks the page.** `hintOf(lampOwned, progress)` picks it, and
  `withHint(figures, hint)` gives it to the figure `HINT_FIGURE`. `update` and the scene both
  call the two right after `figuresIn`, so the box shows the page the dialogue has. No other
  code knows that the intern is special.
- **The cast needs a page.** A member of the cast has at least one page (0017). The intern's
  is the page of the lamp; `withHint` replaces it in every step.
- **No object of an earlier feature changes.** The objects 1 to 131 of the floor keep their
  id, their name and their place. A test of Task 4 holds them to a SHA-256 digest recorded
  from the generator before this feature, `db04c22504878d12…`; it is never recorded again.
  `FIRST_FIGURES`, 1, is how many figures the generator writes after the shadow walls, where
  0017 put the officer; the intern goes to the end of the file, id 132, and `nextobjectid`
  is 133.
- **The two recorded digests of 600 steps** (`RECORDED` in `tests/unit/journal.test.ts` and
  in `tests/unit/help.test.ts`) are never recorded again. From Task 4 on both tests hash the
  first figure of the state, the officer, as she was recorded — that is criterion 12.
- **The size of the sheet was corrected in the spec with this plan**, and the author was
  told: a figure's sheet is 320x24, twenty 16x24 frames in one row, as `officer.png` is. The
  spec said 80x96.
- **Older tests that change, and no other.** `cast.test.ts`: the officer is the first member,
  not the whole cast. `floor.test.ts`: 131 objects become 132 and `nextobjectid` 132 becomes
  133; the points of the floor are 95 instead of 94, in four tests; the officer is the first
  of `FIGURES` and the first figure of the state; the floor has six speakers instead of
  five; and the three mirages are no longer the last objects. The two digest tests. One test
  of the smoke spec.
- In the scene tests two sheets that must be told apart need different objects: the intern's
  sheet of the fixture has an image of its own. A local helper in a test must not be named
  `after`, `before`, `beforeEach` or `afterEach`.
- What is out of the spec is not built: no hint that is shown unasked, no hints for a case
  the game does not have, no second page.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: the point `figure:intern`, feet (616, 488), the middle
  of tile (38, 30), id 132, `nextobjectid` 133; out of reach is more than 40 px; no route
  within 24 px; the shirt `#0099db`; eight keys, each a page of three lines of at most 47
  characters.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | eight keys, `talk.intern-…` |
| `tools/placeholder-person.ts`, `tools/gen-sprites.ts` | `INTERN_SHIRT`; writes `intern.png` |
| `public/sprites/intern.png` | new, generated |
| `src/game/hints.ts` | new: `HINT_FIGURE`, `HINTS`, `HINT_LAMP`, `HINT_DONE`, `hintOf`, `withHint` |
| `src/game/cast.ts` | the cast's second member |
| `src/game/update.ts`, `src/render/draw-scene.ts` | the figures speak with the hint |
| `tools/floor-layout.ts` | the intern in `FIGURES`; `FIRST_FIGURES`; later figures at the end |
| `public/maps/floor.tmj` | regenerated |
| `tests/unit/hints.test.ts` | new |
| `tests/unit/*.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/features/0033-the-intern.md` | the sheet's size, corrected with this plan |
| `docs/spec/*`, `README.md` | Task 5 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `talk.intern-lamp`, `talk.intern-sales-start`,
  `talk.intern-sales-traces`, `talk.intern-sales-source`, `talk.intern-marketing-start`,
  `talk.intern-marketing-traces`, `talk.intern-marketing-source` and `talk.intern-done`, in
  both languages.

- [x] **Step 1: Write the failing test:**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -277,7 +277,59 @@
       'What a machine has made, a person looks at',
       'before it leaves the house.',
       'Image or text – rather once too often.',
+    ]);
+  });
+
+  it('holds the eight pages of the intern in both languages (0033)', () => {
+    const first = (id: Parameters<typeof textKey>[0]): string[] => [
+      textOf(textKey(id), 'de').split('\n')[0] ?? '',
+      textOf(textKey(id), 'en').split('\n')[0] ?? '',
+    ];
+    expect(first('talk.intern-lamp')).toStrictEqual([
+      'Du willst in den Vertrieb? Geh erst nach',
+      'Off to Sales? Go next door first, to the data',
+    ]);
+    expect(first('talk.intern-sales-start')).toStrictEqual([
+      'Vertrieb? Am Ende des Flurs nach Osten.',
+      'Sales? At the end of the corridor to the east.',
+    ]);
+    expect(first('talk.intern-sales-traces')).toStrictEqual([
+      'Im Vertrieb stehen sechzehn Bildschirme, und',
+      'Sales has sixteen screens, and you have not',
+    ]);
+    expect(first('talk.intern-sales-source')).toStrictEqual([
+      'Du weißt doch längst, wer es war. Rosa Hemd,',
+      'You know who it was by now. Pink shirt,',
+    ]);
+    expect(first('talk.intern-marketing-start')).toStrictEqual([
+      'Als Nächstes? Marketing, unten links am',
+      'Next? Marketing, down at the left of the',
     ]);
+    expect(first('talk.intern-marketing-traces')).toStrictEqual([
+      'Im Marketing sind es die Bildschirme auf den',
+      'In Marketing it is the screens on the desk',
+    ]);
+    expect(first('talk.intern-marketing-source')).toStrictEqual([
+      'Rotes Hemd, pendelt zwischen den Tischinseln',
+      'Red shirt, goes back and forth between the',
+    ]);
+    expect(first('talk.intern-done')).toStrictEqual([
+      'Mehr weiß ich gerade auch nicht. Am Nordflur',
+      'That is all I know for now. Off the north',
+    ]);
+    expect(textOf(textKey('talk.intern-done'), 'de').split('\n')).toStrictEqual([
+      'Mehr weiß ich gerade auch nicht. Am Nordflur',
+      'kommst du jetzt in HR und Buchhaltung rein –',
+      'was da los ist, erzählst du mir.',
+    ]);
+    // Eight keys, each one page of three lines.
+    const ids = Object.keys(TABLE.de).filter((id) => id.startsWith('talk.intern-'));
+    expect(ids).toHaveLength(8);
+    for (const language of LANGUAGES) {
+      for (const id of ids) {
+        expect(TABLE[language][id as TextId].split('\n'), `${language} ${id}`).toHaveLength(3);
+      }
+    }
   });
 
   it('holds the words of the mirage in both languages (0032)', () => {
```

- [x] **Step 2: Run it** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 1 of 27
  tests. `npx tsc --noEmit` reports nine errors, all in this test: the eight ids are not ids
  of the table yet.

- [x] **Step 3: The words,** in both tables:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -137,6 +137,46 @@
     'ein Mensch an, bevor es das Haus verlässt.',
     'Bild oder Text – lieber einmal zu viel.',
   ].join('\n'),
+  'talk.intern-lamp': [
+    'Du willst in den Vertrieb? Geh erst nach',
+    'nebenan, zur Datenschutzbeauftragten. Sie hat',
+    'etwas, das du brauchen wirst.',
+  ].join('\n'),
+  'talk.intern-sales-start': [
+    'Vertrieb? Am Ende des Flurs nach Osten.',
+    'Die tippen ihre Angebote neuerdings nicht mehr',
+    'selbst. Schau dir mal die Bildschirme an.',
+  ].join('\n'),
+  'talk.intern-sales-traces': [
+    'Im Vertrieb stehen sechzehn Bildschirme, und',
+    'du hast noch nicht alle gesehen. In jeder',
+    'Reihe lohnt sich einer.',
+  ].join('\n'),
+  'talk.intern-sales-source': [
+    'Du weißt doch längst, wer es war. Rosa Hemd,',
+    'läuft zwischen Schreibtisch und Kaffee.',
+    'Frag einfach – da beißt keiner.',
+  ].join('\n'),
+  'talk.intern-marketing-start': [
+    'Als Nächstes? Marketing, unten links am',
+    'Südflur. Deren Plakate sehen seit Kurzem',
+    'verdächtig gut aus.',
+  ].join('\n'),
+  'talk.intern-marketing-traces': [
+    'Im Marketing sind es die Bildschirme auf den',
+    'Tischinseln. Und vergiss den Drucker nicht –',
+    'der druckt ja alles doppelt.',
+  ].join('\n'),
+  'talk.intern-marketing-source': [
+    'Rotes Hemd, pendelt zwischen den Tischinseln',
+    'und dem Drucker. Die Antwort kennst du schon,',
+    'du musst sie nur noch hören.',
+  ].join('\n'),
+  'talk.intern-done': [
+    'Mehr weiß ich gerade auch nicht. Am Nordflur',
+    'kommst du jetzt in HR und Buchhaltung rein –',
+    'was da los ist, erzählst du mir.',
+  ].join('\n'),
   'talk.sales-everyday': [
     'Drei Angebote bis heute Abend, und jedes soll',
     'klingen, als hätte ich eine Woche Zeit gehabt.',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -133,6 +133,46 @@
     'before it leaves the house.',
     'Image or text – rather once too often.',
   ].join('\n'),
+  'talk.intern-lamp': [
+    'Off to Sales? Go next door first, to the data',
+    'protection officer. She has something you',
+    'are going to need.',
+  ].join('\n'),
+  'talk.intern-sales-start': [
+    'Sales? At the end of the corridor to the east.',
+    'They no longer type their offers themselves.',
+    'Have a look at their screens.',
+  ].join('\n'),
+  'talk.intern-sales-traces': [
+    'Sales has sixteen screens, and you have not',
+    'seen them all. One in every row is worth',
+    'a look.',
+  ].join('\n'),
+  'talk.intern-sales-source': [
+    'You know who it was by now. Pink shirt,',
+    'walks between the desks and the coffee.',
+    'Just ask – nobody bites.',
+  ].join('\n'),
+  'talk.intern-marketing-start': [
+    'Next? Marketing, down at the left of the',
+    'south corridor. Their posters have looked',
+    'suspiciously good lately.',
+  ].join('\n'),
+  'talk.intern-marketing-traces': [
+    'In Marketing it is the screens on the desk',
+    'islands. And do not forget the printer – it',
+    'prints everything twice, after all.',
+  ].join('\n'),
+  'talk.intern-marketing-source': [
+    'Red shirt, goes back and forth between the',
+    'desk islands and the printer. You know the',
+    'answer already – you only have to hear it.',
+  ].join('\n'),
+  'talk.intern-done': [
+    'That is all I know for now. Off the north',
+    'corridor you can get into HR and Accounting',
+    'now – what goes on there, you tell me.',
+  ].join('\n'),
   'talk.sales-everyday': [
     'Three offers by tonight, and each one should',
     'sound as if I had had a week for it.',
```

- [x] **Step 4: Run** `npx vitest run tests/unit/text.test.ts` — green; the test that gives a
  page of talk at most three lines of at most 47 characters covers the eight. Then
  `npm run check`: 1497 unit tests.

- [x] **Step 5: Commit** — `Add the words of the intern`.

---

### Task 2: The sheet

**Files:**
- Modify: `tools/placeholder-person.ts`, `tools/gen-sprites.ts`
- Create: `public/sprites/intern.png` (generated)
- Test: `tests/unit/gen-sprites.test.ts`, `tests/unit/assets.test.ts`

**Interfaces:**
- Produces: `INTERN_SHIRT = '#0099db'` in `tools/placeholder-person.ts`;
  `encodeInternPng()` in `tools/gen-sprites.ts`; `public/sprites/intern.png`, 320x24.

- [x] **Step 1: Write the failing tests.** `tests/unit/gen-sprites.test.ts`:

```diff
--- a/tests/unit/gen-sprites.test.ts
+++ b/tests/unit/gen-sprites.test.ts
@@ -10,6 +10,7 @@
 import {
   encodeDogPng,
   encodeDronePng,
+  encodeInternPng,
   encodeLampPng,
   encodeLampWidePng,
   encodeMiragePng,
@@ -54,6 +55,7 @@
   renderOverview,
 } from '../../tools/placeholder-overview.ts';
 import {
+  INTERN_SHIRT,
   OFFICER_SHIRT,
   PERSON_SHIRTS,
   renderFigure,
@@ -620,7 +622,41 @@
   const pixel = (data: Uint8Array, width: number, x: number, y: number) => [
     ...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4),
   ];
+
+  it('intern.png equals its generator and is the officer in a blue shirt (0033)', () => {
+    const png = read('intern.png');
+    expect([png.width, png.height]).toStrictEqual([320, 24]);
+    expect(encodeInternPng().equals(file('intern.png'))).toBe(true);
+    expect(encodeInternPng().equals(encodeInternPng())).toBe(true);
+    expect(Buffer.from(renderFigure(INTERN_SHIRT)).equals(png.data)).toBe(true);
+    // Pixel for pixel the officer's sheet, with the shirt's colour swapped.
+    const officer = renderFigure(OFFICER_SHIRT);
+    const intern = renderFigure(INTERN_SHIRT);
+    const hex = (data: Uint8Array, i: number): string =>
+      `#${[data[i], data[i + 1], data[i + 2]]
+        .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
+        .join('')}`;
+    let shirt = 0;
+    for (let i = 0; i < officer.length; i += 4) {
+      expect(intern[i + 3], `alpha at ${i}`).toBe(officer[i + 3]);
+      if (officer[i + 3] !== 255) {
+        continue;
+      }
+      if (hex(officer, i) === OFFICER_SHIRT) {
+        expect(hex(intern, i), `shirt at ${i}`).toBe(INTERN_SHIRT);
+        shirt += 1;
+      } else {
+        expect(hex(intern, i), `pixel at ${i}`).toBe(hex(officer, i));
+      }
+    }
+    expect(shirt).toBeGreaterThan(0);
+  });
 
+  it('gives the intern a shirt no other figure has (0033)', () => {
+    expect(INTERN_SHIRT).toBe('#0099db');
+    expect([...PERSON_SHIRTS, OFFICER_SHIRT]).not.toContain(INTERN_SHIRT);
+  });
+
   it('officer.png equals its generator and is the player in a light grey shirt, without the lanyard (0017)', () => {
     const png = read('officer.png');
     expect([png.width, png.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
```

  `tests/unit/assets.test.ts`:

```diff
--- a/tests/unit/assets.test.ts
+++ b/tests/unit/assets.test.ts
@@ -73,6 +73,10 @@
     expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/lamp-wide.png');
   });
 
+  it("checks the intern's sheet under public/sprites/ with every other PNG (0033)", () => {
+    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/intern.png');
+  });
+
   it('checks the mirage sheet under public/sprites/ with every other PNG (0032)', () => {
     expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/mirage.png');
   });
```

- [x] **Step 2: Run them** —
  `npx vitest run tests/unit/gen-sprites.test.ts tests/unit/assets.test.ts`. Expected: FAIL,
  3 tests: 2 of 64 in `gen-sprites.test.ts`, 1 of 27 in `assets.test.ts`. `npx tsc --noEmit`
  reports two errors: the two names are not exported.

- [x] **Step 3: The shirt and the sheet:**

```diff
--- a/tools/placeholder-person.ts
+++ b/tools/placeholder-person.ts
@@ -16,6 +16,9 @@
 /** The data protection officer's shirt (0017): light grey, the colour of no other shirt. */
 export const OFFICER_SHIRT: PaletteColour = '#c0cbdc';
 
+/** The intern's shirt (0033): blue, the colour of no other shirt. */
+export const INTERN_SHIRT: PaletteColour = '#0099db';
+
 /** The player's twenty frames in a shirt of `shirt`, without the lanyard. RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
 export function renderFigure(shirt: PaletteColour): Uint8Array {
   const colours = new Map<string, PaletteColour>(Object.entries({ ...INKS, T: shirt, L: shirt }));
```

```diff
--- a/tools/gen-sprites.ts
+++ b/tools/gen-sprites.ts
@@ -17,7 +17,13 @@
   OVERVIEW_SHEET_WIDTH,
   renderOverview,
 } from './placeholder-overview.ts';
-import { OFFICER_SHIRT, PERSON_SHIRTS, renderFigure, renderPerson } from './placeholder-person.ts';
+import {
+  INTERN_SHIRT,
+  OFFICER_SHIRT,
+  PERSON_SHIRTS,
+  renderFigure,
+  renderPerson,
+} from './placeholder-person.ts';
 import { renderPlayer, SHEET_HEIGHT, SHEET_WIDTH } from './placeholder-player.ts';
 import {
   renderShadowWall,
@@ -42,7 +48,8 @@
  * tools/placeholder-trace.ts; and public/sprites/shadow-veil.png of 0023 from
  * tools/placeholder-veil.ts; and public/sprites/lamp-wide.png of 0029 from
  * tools/placeholder-lamp.ts; and public/sprites/mirage.png of 0032 from
- * tools/placeholder-mirage.ts. Deterministic — pngjs writes no timestamp — and Node
+ * tools/placeholder-mirage.ts; and public/sprites/intern.png of 0033 from
+ * tools/placeholder-person.ts. Deterministic — pngjs writes no timestamp — and Node
  * runs this TypeScript file directly, without a transpiler.
  */
 
@@ -98,6 +105,13 @@
   return PNG.sync.write(png);
 }
 
+/** The intern (0033): the second figure of the cast with a sheet of its own. */
+export function encodeInternPng(): Buffer {
+  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
+  png.data = Buffer.from(renderFigure(INTERN_SHIRT));
+  return PNG.sync.write(png);
+}
+
 export function encodeDogPng(): Buffer {
   const png = new PNG({ width: DOG_SHEET_WIDTH, height: DOG_SHEET_HEIGHT });
   png.data = Buffer.from(renderDog());
@@ -157,6 +171,7 @@
   writeFileSync('public/sprites/shadow-wall.png', encodeShadowWallPng());
   writeFileSync('public/sprites/font.png', encodeFontPng());
   writeFileSync('public/sprites/officer.png', encodeOfficerPng());
+  writeFileSync('public/sprites/intern.png', encodeInternPng());
   writeFileSync('public/sprites/trace.png', encodeTracePng());
   writeFileSync('public/sprites/shadow-veil.png', encodeVeilPng());
 }
```

- [x] **Step 4: Generate** — `npm run gen-sprites`. Then `git status --short public` shows one
  line, `?? public/sprites/intern.png`: no other sheet changed.
  `shasum -a 256 public/sprites/intern.png` gives
  `935b07c5147ab65cd7d542ab6b5f4cfb0da56d70113ec5c2572a8776fe7cf8a3`.
  If another sheet changed, stop.

- [x] **Step 5: Run** the two test files of Step 2 — green — then `npm run check`: 1500 unit
  tests.

- [x] **Step 6: Commit** — `Draw the sheet of the intern`, with the PNG.

---

### Task 3: The hints

**Files:**
- Create: `src/game/hints.ts`, `tests/unit/hints.test.ts`
- Modify: `src/game/cast.ts`, `src/game/update.ts`, `src/render/draw-scene.ts`
- Test: `tests/unit/hints.test.ts`, `tests/unit/cast.test.ts`,
  `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: the eight text ids (Task 1); `/sprites/intern.png` (Task 2), which `main.ts`
  loads for every member of the cast; `Progress`, `CASES`, `isReady`, `isSolved` of
  `game/cases`; `Figure`, `figuresIn` of `game/cast`.
- Produces, in `game/hints`:
  - `HINT_FIGURE = 'intern'`
  - `CaseHints` `{ start, traces, source }`,
    `HINTS: Readonly<Partial<Record<string, CaseHints>>>`
  - `HINT_LAMP`, `HINT_DONE`
  - `hintOf(lampOwned: boolean, progress: Progress, cases = CASES, hints = HINTS): TextKey`
  - `withHint(figures: readonly Figure[], hint: TextKey): readonly Figure[]`
- Produces: `CAST[1]`, the intern.

- [x] **Step 1: Write the failing tests.** Create `tests/unit/hints.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { CASES, type Case, type Progress } from '../../src/game/cases';
import { CAST, FIRST_MEETING, type Figure, figuresIn, figuresOf } from '../../src/game/cast';
import {
  type CaseHints,
  HINT_DONE,
  HINT_FIGURE,
  HINT_LAMP,
  HINTS,
  hintOf,
  withHint,
} from '../../src/game/hints';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { GameState, SolvedCase, TraceState } from '../../src/game/state';
import type { Trace } from '../../src/game/trace';
import { createInitialState, newGame, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
const box = { x: 0, y: 0, width: 16, height: 16 };
/** Two traces of Sales, then two of Marketing. */
const PLACES: readonly Trace[] = [
  { region: 'sales', box },
  { region: 'sales', box },
  { region: 'marketing', box },
  { region: 'marketing', box },
];
/** The progress with the traces of the given indices found and the given regions solved. */
const progress = (found: readonly number[], ...solved: readonly string[]): Progress => ({
  traces: PLACES.map(
    (_place, trace): TraceState => ({
      trace,
      light: 0,
      found: found.includes(trace) ? 10 : null,
    }),
  ),
  places: PLACES,
  solved: solved.map((region, n): SolvedCase => ({ region, at: 100 + n })),
});
const SALES = HINTS.sales as CaseHints;
const MARKETING = HINTS.marketing as CaseHints;

describe('the hints (0033)', () => {
  it('are said by the intern, a member of the cast', () => {
    expect(HINT_FIGURE).toBe('intern');
    expect(CAST.map((member) => member.id)).toContain(HINT_FIGURE);
  });

  it('are three pages for every case, and for no region without a case', () => {
    expect(Object.keys(HINTS)).toStrictEqual(CASES.map((entry) => entry.region));
    expect(HINTS).toStrictEqual({
      sales: {
        start: textKey('talk.intern-sales-start'),
        traces: textKey('talk.intern-sales-traces'),
        source: textKey('talk.intern-sales-source'),
      },
      marketing: {
        start: textKey('talk.intern-marketing-start'),
        traces: textKey('talk.intern-marketing-traces'),
        source: textKey('talk.intern-marketing-source'),
      },
    });
    expect([HINT_LAMP, HINT_DONE]).toStrictEqual([
      textKey('talk.intern-lamp'),
      textKey('talk.intern-done'),
    ]);
  });
});

describe('the hint of a moment (0033)', () => {
  it('is the page of the lamp while the player has none, whatever is found or solved', () => {
    expect(hintOf(false, progress([]))).toBe(HINT_LAMP);
    expect(hintOf(false, progress([0, 1, 2, 3]))).toBe(HINT_LAMP);
    expect(hintOf(false, progress([0, 1, 2, 3], 'sales', 'marketing'))).toBe(HINT_LAMP);
  });

  it('is the start of Sales while no trace of Sales is found', () => {
    expect(hintOf(true, progress([]))).toBe(SALES.start);
  });

  it('is what to look at while some traces of Sales are found and not all', () => {
    expect(hintOf(true, progress([0]))).toBe(SALES.traces);
    expect(hintOf(true, progress([1]))).toBe(SALES.traces);
  });

  it('is whom to ask once every trace of Sales is found and the case is not solved', () => {
    expect(hintOf(true, progress([0, 1]))).toBe(SALES.source);
  });

  it('stays with Sales whatever is found or solved in Marketing', () => {
    expect(hintOf(true, progress([2]))).toBe(SALES.start);
    expect(hintOf(true, progress([2, 3]))).toBe(SALES.start);
    expect(hintOf(true, progress([0, 2, 3]))).toBe(SALES.traces);
    expect(hintOf(true, progress([0, 1, 2, 3]))).toBe(SALES.source);
    expect(hintOf(true, progress([2, 3], 'marketing'))).toBe(SALES.start);
    expect(hintOf(true, progress([0, 2, 3], 'marketing'))).toBe(SALES.traces);
  });

  it('goes on to Marketing once Sales is solved, by the same rule', () => {
    expect(hintOf(true, progress([0, 1], 'sales'))).toBe(MARKETING.start);
    expect(hintOf(true, progress([0, 1, 2], 'sales'))).toBe(MARKETING.traces);
    expect(hintOf(true, progress([0, 1, 2, 3], 'sales'))).toBe(MARKETING.source);
  });

  it('is the last page once every case is solved, in either order', () => {
    expect(hintOf(true, progress([0, 1, 2, 3], 'sales', 'marketing'))).toBe(HINT_DONE);
    expect(hintOf(true, progress([0, 1, 2, 3], 'marketing', 'sales'))).toBe(HINT_DONE);
  });

  it('asks the cases in the order of the table it is given: the game passes its own', () => {
    const turned: readonly Case[] = [...CASES].reverse();
    expect(hintOf(true, progress([]), turned)).toBe(MARKETING.start);
    expect(hintOf(true, progress([0]), turned)).toBe(MARKETING.start);
    expect(hintOf(true, progress([], 'marketing'), turned)).toBe(SALES.start);
  });

  it('points to the start of a region that has no trace on the map', () => {
    const none: Progress = { traces: [], places: [], solved: [] };
    expect(hintOf(true, none)).toBe(SALES.start);
  });

  it('passes over a case without hints', () => {
    expect(hintOf(true, progress([]), CASES, { marketing: MARKETING })).toBe(MARKETING.start);
    expect(hintOf(true, progress([]), CASES, {})).toBe(HINT_DONE);
  });
});

describe('the intern speaks (0033)', () => {
  const figure = (id: string, x: number): Figure => ({
    id,
    x,
    y: 48,
    pages: [textKey('talk.officer-rules-1')],
  });

  it('gives the intern the hint as his one page, and leaves every other figure as it is', () => {
    const officer = figure('officer', 40);
    const intern = figure('intern', 80);
    const spoken = withHint([officer, intern], SALES.traces);
    expect(spoken[0]).toBe(officer);
    expect(spoken[1]).toStrictEqual({ ...intern, pages: [SALES.traces] });
    expect(withHint([officer], SALES.traces)).toStrictEqual([officer]);
  });

  /** The intern at (64, 48), the officer 96 px below him, and one trace of Sales. */
  const POINTS: readonly NamedPoint[] = [
    { name: 'figure:intern', x: 64, y: 48 },
    { name: 'figure:officer', x: 64, y: 144 },
  ];
  const RECTS: readonly NamedRect[] = [
    { name: 'trace:sales', x: 240, y: 32, width: 16, height: 16 },
  ];
  /** 20x12 cells of open floor; the spawn stands 40 px right of the intern. */
  const MAP: TileMap = grassMap(20, 12, { x: 104, y: 48 }, POINTS, RECTS);
  const start = createInitialState(MAP);
  /** What the figures say in a state, as `update` and the scene put it together. */
  const pagesIn = (state: GameState) => {
    const said = withHint(
      figuresIn(figuresOf(MAP.points), state.lamp.owned),
      hintOf(state.lamp.owned, {
        traces: state.traces,
        places: [{ region: 'sales', box: { x: 240, y: 32, width: 16, height: 16 } }],
        solved: state.solved,
      }),
    );
    return Object.fromEntries(said.map((speaker) => [speaker.id, speaker.pages]));
  };

  it('opens a talk with him at a press, and the next press closes it: he has one page', () => {
    const opened = update(start, TALK, MAP);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    const closed = update(update(opened, NONE, MAP), TALK, MAP);
    expect(closed.dialogue).toBeNull();
  });

  it('changes nothing but what a talk changes: the two turn to each other', () => {
    const closed = update(update(update(start, TALK, MAP), NONE, MAP), TALK, MAP);
    expect(closed).toStrictEqual({
      ...start,
      tick: 3,
      held: TALK,
      player: { ...start.player, facing: 'left' },
      figures: [
        { figure: 0, facing: 'right' },
        { figure: 1, facing: 'down' },
      ],
    });
  });

  it('says the page of the lamp in a game that has none, and the officer the first meeting', () => {
    const without = newGame(MAP);
    expect(pagesIn(without)).toStrictEqual({
      intern: [HINT_LAMP],
      officer: FIRST_MEETING.pages,
    });
    // One press closes the call's last page first: the talk opens afterwards.
    let state: GameState = { ...without, dialogue: null };
    state = update(state, TALK, MAP);
    expect(state.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    state = update(update(state, NONE, MAP), TALK, MAP);
    expect(state.dialogue).toBeNull();
    // Reading the hint hands no lamp over.
    expect(state.lamp.owned).toBe(false);
  });

  it('says the hint of the moment, and the officer her own pages', () => {
    expect(pagesIn(start).intern).toStrictEqual([SALES.start]);
    expect(pagesIn(start).officer).toStrictEqual(CAST[0]?.pages);
    const ready: GameState = { ...start, traces: [{ trace: 0, light: 0, found: 5 }] };
    expect(pagesIn(ready).intern).toStrictEqual([SALES.source]);
    const solved: GameState = { ...ready, solved: [{ region: 'sales', at: 9 }] };
    expect(pagesIn(solved).intern).toStrictEqual([MARKETING.start]);
  });

  it('survives a JSON round trip with his talk open (INV-1)', () => {
    const opened = update(start, TALK, MAP);
    expect(JSON.parse(JSON.stringify(opened))).toStrictEqual(opened);
  });
});
```

  `tests/unit/cast.test.ts` — the officer is the first member, and the intern follows:

```diff
--- a/tests/unit/cast.test.ts
+++ b/tests/unit/cast.test.ts
@@ -24,9 +24,14 @@
 
 describe('the cast (0017)', () => {
   it('has the officer with her two pages', () => {
-    expect(CAST).toStrictEqual([{ id: 'officer', pages: [FIRST, SECOND] }]);
+    expect(CAST[0]).toStrictEqual({ id: 'officer', pages: [FIRST, SECOND] });
   });
 
+  it('has the intern after her, with the one page he has before anything is known (0033)', () => {
+    expect(CAST.map((member) => member.id)).toStrictEqual(['officer', 'intern']);
+    expect(CAST[1]?.pages).toStrictEqual([textKey('talk.intern-lamp')]);
+  });
+
   it('gives every member at least one page', () => {
     for (const member of CAST) {
       expect(member.pages.length, member.id).toBeGreaterThan(0);
```

  `tests/unit/draw-scene.test.ts` — one block at its end:

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -1930,3 +1930,92 @@
     expect(creatures).toStrictEqual([open.creatureSheets.snippet, open.creatureSheets.mirage]);
   });
 });
+
+describe('the intern in the scene (0033)', () => {
+  /** The intern at (40, 20) on the 3x2 map, with a sheet of his own, and one trace of Sales. */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...MAP,
+      points: [{ name: 'figure:intern', x: 40, y: 20 }],
+      rects: [{ name: 'trace:sales', x: 0, y: 0, width: 16, height: 16 }],
+    },
+    figureSheets: {
+      ...CONTENT.figureSheets,
+      intern: {
+        image: { intern: true } as unknown as ImageBitmap,
+        frameWidth: 16,
+        frameHeight: 24,
+      },
+    },
+  };
+  /** The figure beside him; his talk open or not, a trace found or not. */
+  const beside = (fields: Partial<GameState> = {}): GameState => ({
+    ...state({ x: 20, y: 30 }),
+    figures: [{ figure: 0, facing: 'left' }],
+    traces: [{ trace: 0, light: 0, found: null }],
+    ...fields,
+  });
+  const talking: Partial<GameState> = { dialogue: { speaker: 'figure', index: 0, page: 0 } };
+  /** The sprites drawn from a sheet, in the order they were drawn. */
+  const spritesOn = (
+    renderer: ReturnType<typeof recordingRenderer>,
+    sheet: SpriteSheet,
+  ): string[] =>
+    renderer.calls
+      .filter((call) => call.startsWith('drawSprite'))
+      .filter((_call, n) => renderer.sheets[n] === sheet);
+  const firstGlyph = (scene: GameState, settings: SceneSettings = GERMAN): string | undefined => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, scene, content, settings);
+    return spritesOn(renderer, content.fontSheet).find((call) => call.endsWith(' at 12,138'));
+  };
+
+  it('draws him from his own sheet, turned as he stands', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, beside(), content);
+    expect(renderer.sheets).toContain(content.figureSheets.intern);
+    expect(renderer.sheets).not.toContain(content.figureSheets.officer);
+    expect(spritesOn(renderer, content.figureSheets.intern as SpriteSheet)).toStrictEqual([
+      'drawSprite 10 at 32,-4',
+    ]);
+  });
+
+  it('draws the hint of the moment in the box: the start of Sales, `V` or `S`', () => {
+    expect(firstGlyph(beside(talking))).toBe('drawSprite 54 at 12,138');
+    expect(firstGlyph(beside(talking), ENGLISH)).toBe('drawSprite 51 at 12,138');
+  });
+
+  it('draws the page of the lamp while the player has none: `D` or `O`', () => {
+    const without = beside({
+      ...talking,
+      lamp: { on: false, strength: 1, owned: false, used: false },
+    });
+    expect(firstGlyph(without)).toBe('drawSprite 36 at 12,138');
+    expect(firstGlyph(without, ENGLISH)).toBe('drawSprite 47 at 12,138');
+  });
+
+  it('draws the page that follows from the traces and the cases', () => {
+    const found = beside({ ...talking, traces: [{ trace: 0, light: 0, found: 5 }] });
+    // All traces of Sales found: `Du weißt doch …`, `D`.
+    expect(firstGlyph(found)).toBe('drawSprite 36 at 12,138');
+    // Sales solved: `Als Nächstes? …`, `A`.
+    expect(firstGlyph({ ...found, solved: [{ region: 'sales', at: 9 }] })).toBe(
+      'drawSprite 33 at 12,138',
+    );
+    // Both solved: `Mehr weiß ich …`, `M`.
+    const both = [
+      { region: 'sales', at: 9 },
+      { region: 'marketing', at: 19 },
+    ];
+    expect(firstGlyph({ ...found, solved: both })).toBe('drawSprite 45 at 12,138');
+  });
+
+  it('draws no box while nobody talks', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, beside(), content);
+    expect(spritesOn(renderer, content.fontSheet).some((call) => call.endsWith(',138'))).toBe(
+      false,
+    );
+  });
+});
```

- [x] **Step 2: Run them** —
  `npx vitest run tests/unit/hints.test.ts tests/unit/cast.test.ts tests/unit/draw-scene.test.ts`.
  Expected: FAIL: `hints.test.ts` does not load — it imports a file that does not exist, so
  the file fails as a whole and none of its tests runs —, 1 of 20 fails in `cast.test.ts`,
  and 5 of 119 in `draw-scene.test.ts`: the cast does not know the figure of the fixture.
  `npx tsc --noEmit` reports two errors.

- [x] **Step 3: The rule.** Create `src/game/hints.ts`:

```ts
import { type TextKey, textKey } from '../text/text';
import { CASES, type Case, isReady, isSolved, type Progress } from './cases';
import type { Figure } from './cast';

/**
 * The hints (world.md §3, feature 0033): the intern in the break room says where the next step
 * is. He says exactly one page, picked from how far the player has come: before the lamp, per
 * case where the room is, what to look at and whom to ask, and at the end that he knows no
 * more. He does not see the shadow: he speaks of rooms, devices and people. The hint is
 * derived from the state on every call and kept nowhere. Pure data and pure functions.
 */

/** The figure of the cast that says the hint. */
export const HINT_FIGURE = 'intern';

/** The three pages of a case, one for each stand of its traces. */
export interface CaseHints {
  /** No trace of the region is found: where the room is and what is odd there. */
  readonly start: TextKey;
  /** Some traces are found and not all: what to look at. */
  readonly traces: TextKey;
  /** All are found and the case is not solved: whom to ask. */
  readonly source: TextKey;
}

/** The hints of the cases, by the region of the case. Every case has an entry; a test says so. */
export const HINTS: Readonly<Partial<Record<string, CaseHints>>> = {
  sales: {
    start: textKey('talk.intern-sales-start'),
    traces: textKey('talk.intern-sales-traces'),
    source: textKey('talk.intern-sales-source'),
  },
  marketing: {
    start: textKey('talk.intern-marketing-start'),
    traces: textKey('talk.intern-marketing-traces'),
    source: textKey('talk.intern-marketing-source'),
  },
};

/** The page while the player has no lamp. */
export const HINT_LAMP: TextKey = textKey('talk.intern-lamp');
/** The page when every case is solved. */
export const HINT_DONE: TextKey = textKey('talk.intern-done');

/**
 * The hint of this moment. Without the lamp: HINT_LAMP. Else the cases are asked in their
 * order, and the first that is not solved decides, whatever is found in a later one: its
 * `start` page while no trace of its region is found, its `traces` page while some are and
 * not all, its `source` page once it is ready. With every case solved: HINT_DONE.
 */
export function hintOf(
  lampOwned: boolean,
  progress: Progress,
  cases: readonly Case[] = CASES,
  hints: Readonly<Partial<Record<string, CaseHints>>> = HINTS,
): TextKey {
  if (!lampOwned) {
    return HINT_LAMP;
  }
  for (const { region } of cases) {
    const pages = hints[region];
    if (pages === undefined || isSolved(region, progress.solved)) {
      continue;
    }
    if (isReady(region, progress)) {
      return pages.source;
    }
    const found = progress.traces.some(
      (state) => state.found !== null && progress.places[state.trace]?.region === region,
    );
    return found ? pages.traces : pages.start;
  }
  return HINT_DONE;
}

/** The figures as they speak with the hint of this moment: HINT_FIGURE says that one page. */
export function withHint(figures: readonly Figure[], hint: TextKey): readonly Figure[] {
  return figures.map((figure) =>
    figure.id === HINT_FIGURE ? { ...figure, pages: [hint] } : figure,
  );
}
```

- [x] **Step 4: The cast** gets its second member:

```diff
--- a/src/game/cast.ts
+++ b/src/game/cast.ts
@@ -24,6 +24,9 @@
     id: 'officer',
     pages: [textKey('talk.officer-rules-1'), textKey('talk.officer-rules-2')],
   },
+  // The intern (0033). What he says is picked in every step by `game/hints`; this is the
+  // page he has before anything is known.
+  { id: 'intern', pages: [textKey('talk.intern-lamp')] },
 ];
 
 /**
```

- [x] **Step 5: The step and the scene** give him the hint of the moment:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -4,6 +4,7 @@
 import { figuresFrom, figuresIn, figuresOf, isFirstMeeting } from './cast';
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
 import { openHelp, stepHelp } from './help';
+import { hintOf, withHint } from './hints';
 import { openJournal, stepJournal } from './journal';
 import { spreadOf } from './lamp';
 import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
@@ -165,8 +166,12 @@
   }
   const routes = routesOf(content.points);
   const progress = progressOf(state, content);
-  // Without the lamp the data protection officer says the first meeting (0026).
-  const figures = figuresIn(figuresOf(content.points), state.lamp.owned);
+  // Without the lamp the data protection officer says the first meeting (0026); the intern
+  // says the hint of this moment (0033).
+  const figures = withHint(
+    figuresIn(figuresOf(content.points), state.lamp.owned),
+    hintOf(state.lamp.owned, progress),
+  );
   const speakers = speakersOf(figures, state.movers, routes, undefined, progress);
   if (state.dialogue !== null) {
     const stepped = stepDialogue(state, state.dialogue, input, speakers);
```

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -3,6 +3,7 @@
 import { progressOf } from '../game/cases';
 import { type Figure, figuresIn, figuresOf } from '../game/cast';
 import { CREATURE_SIZE, HABITS, isWatched } from '../game/creature';
+import { hintOf, withHint } from '../game/hints';
 import { FRAME_APEX, LAMP_HEIGHT, WIDE_CONE, WIDE_FRAME_APEX } from '../game/lamp';
 import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
@@ -498,18 +499,20 @@
   }
   // The label that names the help's key (0031): in every frame of the world, whatever else is on it.
   drawHelpLabel(renderer, content.fontSheet, language);
+  const progress = progressOf(state, content.map);
   const page =
     state.dialogue === null
       ? undefined
       : pagesOf(
           state.dialogue,
           speakersOf(
-            // As in `update`: without the lamp the officer says the first meeting (0026).
-            figuresIn(figures, state.lamp.owned),
+            // As in `update`: without the lamp the officer says the first meeting (0026), and
+            // the intern says the hint of this moment (0033).
+            withHint(figuresIn(figures, state.lamp.owned), hintOf(state.lamp.owned, progress)),
             state.movers,
             routesOf(content.map.points),
             undefined,
-            progressOf(state, content.map),
+            progress,
           ),
         )[state.dialogue.page];
   const notice = noticeOf(state);
```

- [x] **Step 6: Run** the three test files of Step 2 — green, the tests of 0017, 0018 and 0026
  unchanged but for the one of the cast. Then `npm run check`: 1525 unit tests.

- [x] **Step 7: Commit** — `Let the intern say where the next step is`. Body: one rule picks
  the page from the lamp, the traces and the solved cases; nothing of it is stored.

---

### Task 4: The intern on the floor

**Files:**
- Modify: `tools/floor-layout.ts`, `public/maps/floor.tmj` (generated)
- Test: `tests/unit/floor.test.ts`, `tests/unit/journal.test.ts`,
  `tests/unit/help.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: the cast's second member (Task 3).
- Produces: `FIGURES[1]`, `FIRST_FIGURES = 1` in `tools/floor-layout.ts`; `floor.tmj` with
  the point 132, `figure:intern`, at the end.

- [x] **Step 1: Write the failing tests.** In `tests/unit/floor.test.ts` the older tests
  change as the global constraints say, and one block is new, at the end:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -9,6 +9,7 @@
 import { CASES, isReady, progressOf } from '../../src/game/cases';
 import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
 import { isWatched, MIRAGE_NOTICE_RADIUS } from '../../src/game/creature';
+import { HINT_FIGURE, HINTS } from '../../src/game/hints';
 import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
 import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
@@ -26,6 +27,7 @@
   CLOSED_DOORS,
   CORRIDORS,
   FIGURES,
+  FIRST_FIGURES,
   FIRST_TRACES,
   FLOOR_HEIGHT,
   FLOOR_WIDTH,
@@ -502,9 +504,9 @@
     ]);
     const json = floorJson();
     expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
-      Array.from({ length: 131 }, (_, i) => i + 1),
+      Array.from({ length: 132 }, (_, i) => i + 1),
     );
-    expect(json.nextobjectid).toBe(132);
+    expect(json.nextobjectid).toBe(133);
   });
 
   it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
@@ -950,7 +952,7 @@
       TABLE.map(([region], i) => [92 + i, `shadow:${region}`]),
     );
     expect(objects.slice(91, 99).some((object) => 'point' in object)).toBe(false);
-    expect(floor.points).toHaveLength(94);
+    expect(floor.points).toHaveLength(95);
   });
 
   it('builds the boxes from the doorway cells of the layout', () => {
@@ -1081,7 +1083,8 @@
   const figures = figuresOf(floor.points);
 
   it('holds the point figure:officer after the rectangles, with the id 100', () => {
-    expect(FIGURES).toStrictEqual([{ id: 'officer', at: OFFICER }]);
+    // The first of the figures; the intern of 0033 follows her.
+    expect(FIGURES[0]).toStrictEqual({ id: 'officer', at: OFFICER });
     // The 91st point; the mirages of 0032 follow it.
     expect(floor.points[90]).toStrictEqual({ name: 'figure:officer', ...OFFICER });
     const objects = floorJson().layers[3].objects;
@@ -1096,11 +1099,12 @@
     expect(hers !== undefined && 'point' in hers).toBe(true);
   });
 
-  it('gives the floor one figure, the officer, with her two pages', () => {
+  it('gives the floor the officer as its first figure, with her two pages', () => {
+    // The intern of 0033 is the second.
     expect(
-      figures.map((figure) => [figure.id, figure.x, figure.y, figure.pages.length]),
+      figures.slice(0, 1).map((figure) => [figure.id, figure.x, figure.y, figure.pages.length]),
     ).toStrictEqual([['officer', 264, 472, 2]]);
-    expect(createInitialState(floor).figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
+    expect(createInitialState(floor).figures[0]).toStrictEqual({ figure: 0, facing: 'down' });
   });
 
   it("stands in the middle of tile (16, 29), in the data protection officer's office", () => {
@@ -1161,10 +1165,12 @@
     }
   });
 
-  it('has five speakers: the officer, then the four colleagues in the order of the movers', () => {
+  it('has six speakers: the two standing figures, then the four colleagues in the order of the movers', () => {
     const speakers = speakersOf(figuresOf(floor.points), start.movers, routes);
     expect(speakers.map((speaker) => [speaker.speaker, speaker.index])).toStrictEqual([
       ['figure', 0],
+      // The intern (0033).
+      ['figure', 1],
       ['mover', 0],
       ['mover', 1],
       ['mover', 2],
@@ -1231,7 +1237,7 @@
     );
     expect(objects.some((object) => 'point' in object)).toBe(false);
     expect(floor.rects.slice(8, 13).every((rect) => rect.name === 'trace:sales')).toBe(true);
-    expect(floor.points).toHaveLength(94);
+    expect(floor.points).toHaveLength(95);
   });
 
   it('lie in Sales, each on a desk with a screen whose chair stands on the cell below', () => {
@@ -1376,7 +1382,7 @@
     expect(wallsOf(floor.rects)).toHaveLength(8);
     // The five of 0022; the five of 0028 came later.
     expect(tracesOf(floor.rects)).toHaveLength(10);
-    expect(floor.points).toHaveLength(94);
+    expect(floor.points).toHaveLength(95);
   });
 
   it('give every room of a region its area, with exactly the cells of the room', () => {
@@ -1564,7 +1570,7 @@
     // The five of 0022; the five of 0028 came later.
     expect(tracesOf(floor.rects)).toHaveLength(10);
     expect(areas).toHaveLength(10);
-    expect(floor.points).toHaveLength(94);
+    expect(floor.points).toHaveLength(95);
   });
 
   it('lie each on a counter with a coffee machine, and the floor has no such tile without one', () => {
@@ -1943,15 +1949,13 @@
     ]);
   });
 
-  it('are the last three objects of the file, points with the ids 129 to 131', () => {
+  it('are three points with the ids 129 to 131, after the traces of 0028 and before the intern of 0033', () => {
     const objects = floorJson().layers[3].objects;
-    expect(objects).toHaveLength(131);
-    expect(objects.slice(128).map((object) => [object.id, object.name])).toStrictEqual(
+    expect(objects.slice(128, 131).map((object) => [object.id, object.name])).toStrictEqual(
       [129, 130, 131].map((id) => [id, 'mirage']),
     );
-    expect(objects.slice(128).every((object) => 'point' in object)).toBe(true);
-    expect(floorJson().nextobjectid).toBe(132);
-    expect(floor.points.slice(91)).toStrictEqual(
+    expect(objects.slice(128, 131).every((object) => 'point' in object)).toBe(true);
+    expect(floor.points.slice(91, 94)).toStrictEqual(
       TABLE.map(([, , feet]) => ({ name: 'mirage', ...feet })),
     );
   });
@@ -2061,3 +2065,134 @@
     expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 });
+
+describe('the intern of the floor (0033)', () => {
+  const INTERN = { x: 616, y: 488 };
+  const TALK: GameInput = { ...NO_INPUT, talk: true };
+  const figures = figuresOf(floor.points);
+  const start = createInitialState(floor);
+  const rests = restsOf(floor.rects);
+  const breakRoom = ROOMS.find((room) => room.name === 'break room');
+
+  it('is the second figure of the layout, and the only one written at the end of the file', () => {
+    expect(FIGURES[1]).toStrictEqual({ id: 'intern', at: INTERN });
+    expect(FIGURES).toHaveLength(2);
+    expect(FIRST_FIGURES).toBe(1);
+    expect(HINT_FIGURE).toBe('intern');
+  });
+
+  it('is the last object of the file, the point figure:intern with the id 132', () => {
+    const objects = floorJson().layers[3].objects;
+    expect(objects).toHaveLength(132);
+    const his = objects[131];
+    expect([his?.id, his?.name, his?.x, his?.y]).toStrictEqual([132, 'figure:intern', 616, 488]);
+    expect(his !== undefined && 'point' in his).toBe(true);
+    expect(floorJson().nextobjectid).toBe(133);
+    expect(floor.points.at(-1)).toStrictEqual({ name: 'figure:intern', ...INTERN });
+  });
+
+  it('leaves the 131 objects of 0032 and before exactly as they were', () => {
+    // SHA-256 over the first 131 objects, recorded from the generator before this feature.
+    const before = JSON.stringify(floorJson().layers[3].objects.slice(0, 131));
+    expect(createHash('sha256').update(before).digest('hex')).toBe(
+      'db04c22504878d1281eac2cb8dd3e7c9e789f5ef8ac201420bead11da87d8e92',
+    );
+  });
+
+  it('gives the floor two figures: the officer, then the intern with one page', () => {
+    expect(
+      figures.map((figure) => [figure.id, figure.x, figure.y, figure.pages.length]),
+    ).toStrictEqual([
+      ['officer', 264, 472, 2],
+      ['intern', 616, 488, 1],
+    ]);
+    expect(start.figures).toStrictEqual([
+      { figure: 0, facing: 'down' },
+      { figure: 1, facing: 'down' },
+    ]);
+  });
+
+  it('stands in the middle of tile (38, 30), in the break room, four tiles below the counter', () => {
+    expect(figures[1]).toMatchObject(INTERN);
+    expect([(INTERN.x - 8) / 16, (INTERN.y - 8) / 16]).toStrictEqual([38, 30]);
+    const { c0, c1, r0, r1 } = breakRoom?.cells ?? { c0: 0, c1: -1, r0: 0, r1: -1 };
+    expect(38 >= c0 && 38 <= c1 && 30 >= r0 && 30 <= r1).toBe(true);
+    // The counter with the two coffee machines is row 26.
+    expect(floor.detail[cell(35, 26)]).toBe(COUNTER_COFFEE);
+    expect(floor.detail[cell(42, 26)]).toBe(COUNTER_COFFEE);
+    expect(floor.detail[cell(38, 26)]).toBe(COUNTER);
+  });
+
+  it('is free of every solid box and reached on foot from the spawn', () => {
+    expect(figures[1]).toMatchObject(INTERN);
+    expect(floor.solids[cell(38, 30)]).toStrictEqual([]);
+    expect(blocked(boxAt(INTERN))).toBe(false);
+    expect(reached(INTERN)).toBe(true);
+  });
+
+  it('has no route passing within 24 px of him', () => {
+    expect(figures[1]).toMatchObject(INTERN);
+    for (const route of routesOf(floor.points)) {
+      route.points.forEach((from, i) => {
+        const to = route.points[(i + 1) % route.points.length] ?? from;
+        const x = Math.min(Math.max(INTERN.x, Math.min(from.x, to.x)), Math.max(from.x, to.x));
+        const y = Math.min(Math.max(INTERN.y, Math.min(from.y, to.y)), Math.max(from.y, to.y));
+        expect(
+          Math.hypot(x - INTERN.x, y - INTERN.y),
+          `${route.name} leg ${i + 1}`,
+        ).toBeGreaterThan(24);
+      });
+    }
+  });
+
+  it('is out of reach from every place where a coffee machine is in reach: the coffee stays a press', () => {
+    const { c0, c1, r0, r1 } = breakRoom?.cells ?? { c0: 0, c1: -1, r0: 0, r1: -1 };
+    const speakers = speakersOf(figures, [], []);
+    expect(speakers.map((speaker) => [speaker.x, speaker.y])).toContainEqual([INTERN.x, INTERN.y]);
+    let places = 0;
+    for (let x = c0 * 16; x <= (c1 + 1) * 16; x += 2) {
+      for (let y = r0 * 16; y <= (r1 + 1) * 16; y += 2) {
+        if (!reached({ x, y }) || restInReach({ x, y }, rests, floor) === null) {
+          continue;
+        }
+        places += 1;
+        expect(speakerInReach({ x, y }, speakers, floor), `(${x}, ${y})`).toBeNull();
+      }
+    }
+    expect(places).toBeGreaterThan(0);
+  });
+
+  it('takes a coffee at the machine and opens no talk there', () => {
+    // Below the left machine of the break room, cell (35, 26).
+    const there: GameState = {
+      ...start,
+      player: { ...start.player, x: 568, y: 440 },
+      overview: { current: 2, max: 5 },
+    };
+    const drunk = update(there, TALK, floor);
+    expect(drunk.dialogue).toBeNull();
+    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
+  });
+
+  it('is spoken to from 24 px below him, and has one page', () => {
+    const there: GameState = {
+      ...start,
+      player: { ...start.player, x: INTERN.x, y: INTERN.y + 24 },
+    };
+    expect(reached(there.player)).toBe(true);
+    const opened = update(there, TALK, floor);
+    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 1, page: 0 });
+    expect(opened.figures[1]).toStrictEqual({ figure: 1, facing: 'down' });
+    expect(opened.player.facing).toBe('up');
+    const closed = update(update(opened, NO_INPUT, floor), TALK, floor);
+    expect(closed.dialogue).toBeNull();
+  });
+
+  it('has hints for every case that has traces on the floor', () => {
+    const regions = [...new Set(tracesOf(floor.rects).map((trace) => trace.region))];
+    expect(regions).toStrictEqual(CASES.map((entry) => entry.region));
+    for (const region of regions) {
+      expect(HINTS[region], region).toBeDefined();
+    }
+  });
+});
```

  The two recordings hash the figure that was recorded:

```diff
--- a/tests/unit/journal.test.ts
+++ b/tests/unit/journal.test.ts
@@ -345,7 +345,8 @@
     state.creatures.filter((creature) => creature.species === 'snippet'),
     state.movers,
     state.shadowWalls,
-    state.figures,
+    // The figure that was recorded: the officer, before the intern of 0033.
+    state.figures.slice(0, 1),
     state.dialogue,
     { snippet: state.captured.snippet },
     state.overview,
```

```diff
--- a/tests/unit/help.test.ts
+++ b/tests/unit/help.test.ts
@@ -303,7 +303,8 @@
     state.creatures.filter((creature) => creature.species === 'snippet'),
     state.movers,
     state.shadowWalls,
-    state.figures,
+    // The figure that was recorded: the officer, before the intern of 0033.
+    state.figures.slice(0, 1),
     state.dialogue,
     state.journal,
     { snippet: state.captured.snippet },
```

  In the smoke spec the floor starts with two figures:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -250,15 +250,20 @@
   expect(state?.lamp.strength).toBe(1);
 });
 
-test('the floor starts with the officer standing and no dialogue open', async ({ page }) => {
+test('the floor starts with the officer and the intern standing and no dialogue open', async ({
+  page,
+}) => {
   await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.figures.length), {
-      message: 'window.shadowAi.state.figures holds the one figure of the floor',
+      message: 'window.shadowAi.state.figures holds the two figures of the floor',
     })
-    .toBe(1);
+    .toBe(2);
   const state = await page.evaluate(() => window.shadowAi?.state);
-  expect(state?.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
+  expect(state?.figures).toStrictEqual([
+    { figure: 0, facing: 'down' },
+    { figure: 1, facing: 'down' },
+  ]);
   expect(state?.dialogue).toBeNull();
   expect(state?.held.talk).toBe(false);
 });
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/floor.test.ts`. Expected: FAIL, 14 of
  124 tests: six older ones that count the objects, the points or the speakers, and eight
  of the new block. `npx tsc --noEmit` reports one error: `floor-layout.ts` has no exported
  member `FIRST_FIGURES`. Six tests of the diff are green already, and that is right: the
  digest over the first 131 objects guards what must not change; the coffee is taken at the
  machine before as after; every case with traces has its hints since Task 3; and three
  older tests now look at the first figure or at a slice, which holds both ways. The two
  recordings pass before and after. Then `npx playwright test -g "the officer and the intern"`.
  Expected: FAIL, `Expected: 2`, `Received: 1`.

- [x] **Step 3: The layout.** The intern in `FIGURES`, `FIRST_FIGURES`, and the generator
  writes the later figures at the end:

```diff
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -219,13 +219,22 @@
 }
 
 /**
- * The standing figures (0017): per figure its id in the cast and its feet in pixels. The
+ * The standing figures (0017, 0033): per figure its id in the cast and its feet in pixels. The
  * data protection officer stands in the middle of tile (16, 29), in her office — two tiles
- * left of and two above the wake point, in the view when the player wakes.
+ * left of and two above the wake point, in the view when the player wakes. The intern stands
+ * in the middle of tile (38, 30), in the break room, four tiles below the counter.
  */
 export const FIGURES: readonly { readonly id: string; readonly at: Point }[] = [
   { id: 'officer', at: { x: 264, y: 472 } },
+  { id: 'intern', at: { x: 616, y: 488 } },
 ];
+
+/**
+ * How many figures stand after the shadow walls in the file: the one of 0017. Every later
+ * figure is written at the end of the file, so that no object of an earlier feature changes
+ * its id (0033).
+ */
+export const FIRST_FIGURES = 1;
 
 /**
  * The traces (0022, 0028): per trace its region and the cell of the device it lies on. Five in
@@ -1216,12 +1225,14 @@
   const routes = routePoints();
   const firstWall = SNIPPETS.length + 3 + routes.length;
   const firstFigure = firstWall + SHADOW_WALLS.length;
-  const firstTrace = firstFigure + FIGURES.length;
+  const firstTrace = firstFigure + FIRST_FIGURES;
   const firstArea = firstTrace + FIRST_TRACES;
   const firstRest = firstArea + REGION_AREAS.length;
   const firstLaterTrace = firstRest + RESTS.length;
   const laterTraces = TRACES.slice(FIRST_TRACES);
   const firstMirage = firstLaterTrace + laterTraces.length;
+  const firstLaterFigure = firstMirage + MIRAGES.length;
+  const laterFigures = FIGURES.slice(FIRST_FIGURES);
   return {
     compressionlevel: -1,
     height: FLOOR_HEIGHT,
@@ -1244,7 +1255,7 @@
           ...SHADOW_WALLS.map((wall, i) =>
             rectObject(firstWall + i, `shadow:${wall.region}`, shadowWallBox(wall.cells)),
           ),
-          ...FIGURES.map((figure, i) =>
+          ...FIGURES.slice(0, FIRST_FIGURES).map((figure, i) =>
             pointObject(firstFigure + i, `figure:${figure.id}`, figure.at),
           ),
           ...TRACES.slice(0, FIRST_TRACES).map((trace, i) =>
@@ -1260,6 +1271,9 @@
             rectObject(firstLaterTrace + i, `trace:${trace.region}`, traceBox(trace.cell)),
           ),
           ...MIRAGES.map((feet, i) => pointObject(firstMirage + i, 'mirage', feet)),
+          ...laterFigures.map((figure, i) =>
+            pointObject(firstLaterFigure + i, `figure:${figure.id}`, figure.at),
+          ),
         ],
         opacity: 1,
         type: 'objectgroup',
@@ -1269,7 +1283,7 @@
       },
     ],
     nextlayerid: 5,
-    nextobjectid: firstMirage + MIRAGES.length,
+    nextobjectid: firstLaterFigure + laterFigures.length,
     orientation: 'orthogonal',
     renderorder: 'right-down',
     tiledversion: '1.11.2',
```

- [x] **Step 4: Regenerate the floor** — `npm run gen-floor`. Then
  `shasum -a 256 public/maps/floor.tmj` gives
  `66dfcaab17cd4fd650be051c6b9e6bc624f11ce8c618fc39daadb9dd494b65d8`, and
  `git diff --stat public/maps/floor.tmj` says 13 insertions and 1 deletion: one point at the
  end of the `objects` layer and `nextobjectid`. If the diff touches anything else, stop.

- [x] **Step 5: Run** `npx vitest run tests/unit/floor.test.ts tests/unit/journal.test.ts tests/unit/help.test.ts` —
  green — then `npm run check`: 1536 unit tests, and `npm run test:e2e` twice: 18 passed, 3
  skipped, both times.

- [x] **Step 6: Commit** — `Put the intern into the break room`. Body: he stands out of reach
  of every place from which a coffee machine is in reach, so a press there still takes the
  coffee.

---

### Task 5: The documents

**Files:**
- Modify: `docs/spec/world.md`, `docs/spec/gameplay.md`, `docs/spec/architecture.md`,
  `docs/spec/testing.md`, `README.md`

The diffs are against `main` at `9794d43`. If a line has moved, put the text where the diff
means it; do not change the words without a reason. `architecture.md` changes in §1 too,
beyond the sections the spec names: its directory listing names the figures' generator.

- [x] **Step 1: `world.md`** §3:

```diff
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -218,6 +218,13 @@
 - **The intern.** Sits in the break room, knows everything, likes to say it. This is the hint
   system in diegetic form: a player who is stuck goes to the break room. For a game played at home
   without a walkthrough, this matters more than it sounds.
+  *As built* (feature 0033): he stands, until the art pass gives him a chair — in the middle
+  of tile (38, 30), four tiles below the counter of the break room, in a blue shirt. He says one
+  page, picked from how far the player has come: before the lamp, that the data protection
+  officer has something; per case where the room is, what to look at, and whom to ask; and at
+  the end that he knows no more. The cases are asked in their order, Sales first, whatever the
+  player has begun. He does not see the shadow and never speaks of it: he speaks of rooms,
+  screens, the printer and shirts. Nothing is shown unasked — no arrow, no marker.
 - **The works council.** Not a global character but part of the HR case. Nothing moves there
   without him, and he is the one who asks about fairness. A German specific that gives the case
   depth.
```

- [x] **Step 2: `gameplay.md`** §8:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -273,6 +273,12 @@
 conversation, a wall does. The colleague stands where it is and turns to the player. Each has one
 saying of one page, the same every time. After it the colleague goes on its round, and keeps its
 facing until it moves.
+
+**As built** (feature 0033): a player who does not know where to go asks the intern in the break
+room. He is spoken to like the data protection officer and has one page — the hint of that
+moment (`world.md` §3). Asking costs nothing and changes nothing. At a coffee machine a press
+of E still takes the coffee: he stands out of reach of every place from which a machine is in
+reach.
 
 **As built** (feature 0019): a press of L switches the language at any moment — while walking,
 with the lamp held, with a dialogue open, in the dark. Every text on screen changes at once: the
```

- [x] **Step 3: `architecture.md`** §1, §2, §6 and §7:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -62,7 +62,8 @@
   placeholder-overview.ts the placeholder overview sheet as pure data: two 8x8 frames,
                         a full and an empty heart
   placeholder-person.ts the placeholder colleagues: the figure's frames in four other shirts,
-                        and the data protection officer in a fifth (0017)
+                        the data protection officer in a fifth (0017) and the intern in a
+                        sixth (0033)
   placeholder-dog.ts    the placeholder office dog: one row of 24 16x16 frames, two coats
   placeholder-vacuum.ts the placeholder robot vacuum: two 16x16 frames, the light on and off
   placeholder-drone.ts  the placeholder drone: two 16x16 frames, the rotors as bars and dots
@@ -317,6 +318,18 @@
 `talk.officer-meeting-2`. While the lamp is not owned, `figuresIn(figures, owned)` gives that
 figure the meeting's pages instead of its own; `update` and the scene both build the speakers
 from it, so the box shows the pages the dialogue has.
+
+The **hints** (feature 0033) are data and one rule of `game/hints`. `HINT_FIGURE` names the
+figure that says them, `intern`; `HINTS` holds per case — by its region — three pages, `start`,
+`traces` and `source`; `HINT_LAMP` and `HINT_DONE` are the page before the lamp and the page
+after the last case. `hintOf(lampOwned, progress)` picks one: without the lamp `HINT_LAMP`;
+else the first case of `CASES` that is not solved decides — `start` while no trace of its
+region is found, `traces` while some are and not all, `source` once it is ready (`isReady`);
+with every case solved `HINT_DONE`. `withHint(figures, hint)` gives `HINT_FIGURE` that one page
+instead of its own, after `figuresIn`; `update` and the scene both do it, so the box shows the
+page the dialogue has. The hint is derived on every call and is not in the state; a talk with
+the intern changes what a talk changes and nothing more. `CAST` holds the intern as its second
+member, with the page of the lamp as the page he has before anything is known.
 
 `held` is the last step's input, a plain `GameInput`, every action false at the start
 (`NO_INPUT`); it replaced `talkHeld`, the `talk` of the last step, with feature 0020, because the
@@ -814,7 +827,8 @@
 `createInitialState`, refuses the map — each with its message — for an id the cast does not have
 (`figure point figure:cellar names no figure`) and for two points with the same id (`more than one
 point object "figure:officer"`). A map without such points has no figures; a figure of the cast
-without a point is simply not there.
+without a point is simply not there. The floor has two: `figure:officer`, and since feature
+0033 `figure:intern`.
 
 **Kinds of rectangle** (features 0022, 0023, 0027). A rectangle has a kind by the prefix of its
 name: `shadow:` a shadow wall, `trace:` a trace, `region:` an area of a region, `rest:` a rest.
@@ -1038,8 +1052,9 @@
 `#f77622` or `#b55088` and the lanyard's pixels in the shirt's colour; a person of `look` n uses
 `person-(n + 1)`. The data protection officer's sheet (feature 0017), `officer.png`, comes
 from the same generator: the size and frame order of `player.png`, with the shirt and the
-lanyard's pixels in `#c0cbdc`, the colour of no other shirt. A figure of the cast `<id>` has the
-sheet `public/sprites/<id>.png`, and `main.ts` loads one per member of the cast.
+lanyard's pixels in `#c0cbdc`, the colour of no other shirt. The intern's sheet (feature 0033),
+`intern.png`, is the same with `#0099db`, blue, which no other shirt has. A figure of the cast
+`<id>` has the sheet `public/sprites/<id>.png`, and `main.ts` loads one per member of the cast.
 `tools/placeholder-dog.ts`: `dog.png`, 384x16, one row of 24 frames of 16x16,
 frame = `look` × 12 + facing × 3 + phase, facings in `FACINGS` order, phase 0 stands, 1 steps,
 2 sits; `look` 0 has the coat `#b86f50`, `look` 1 `#ead4aa`, ears, nose and eyes `#3e2731`; left
@@ -1130,7 +1145,10 @@
 the rests, so that no object of an earlier feature changes its id: the five of Marketing
 (feature 0028) have the ids 124–128. The mirages (feature 0032) are `MIRAGES`, their feet in
 pixels; they become three point objects named `mirage` after those traces, ids 129–131, and
-`nextobjectid` is 132.
+`nextobjectid` is 132. The standing figures are `FIGURES`; the first (`FIRST_FIGURES`, 1), the
+officer, keeps her place after the shadow walls, and every later one is written at the end of
+the file: the intern (feature 0033) is the point `figure:intern` with the id 132, and
+`nextobjectid` is 133.
 `floor.tmj` has the layers `ground` (id 1), `detail` (id 3), `above` (id 4) and `objects` (id 2),
 in that order. Posts are
 derived, not listed: a cell with no strip whose left neighbour has a top strip and whose upper
```

- [x] **Step 4: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -38,7 +38,9 @@
 without an upgrade (0029): the cone's spread and the lamp's strength are then what they were.
 A recording hashes what was recorded and no more: since the second species (0032) the two
 tests hash the snippets among the creatures and the count of the snippet, so three mirages
-that rest in Marketing do not change a digest that was taken before they existed.
+that rest in Marketing do not change a digest that was taken before they existed. Since the
+second standing figure (0033) they hash the first figure of the state, the officer, for the
+same reason.
 
 ## 3. Test first
 
```

- [x] **Step 5: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -56,7 +56,8 @@
 0028). Solving the case of Marketing earns the first upgrade of the lamp: the cone is one and
 a half times as wide, and the shadow walls of HR and Accounting give way to it (feature 0029).
 Marketing has a creature of its own: the mirage, a framed picture that moves only while nobody
-looks at it (feature 0032).
+looks at it (feature 0032). An intern stands in the break room and says, when asked, where the
+next step is (feature 0033).
 Every merge to `main` is deployed to Cloud Run (feature 0030).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
@@ -70,7 +71,7 @@
 npm run check        # typecheck, lint, build and the headless tests
 npm run test:e2e     # the smoke test against the dev server
 npm run gen-tiles    # regenerate the placeholder tiles under public/tiles/
-npm run gen-sprites  # regenerate the placeholder figure, the lamp and its wider cone, snippet, mirage, overview, movers', shadow-wall, font and officer sheets under public/sprites/
+npm run gen-sprites  # regenerate the placeholder figure, the lamp and its wider cone, snippet, mirage, overview, movers', shadow-wall, font, officer and intern sheets under public/sprites/
 npm run gen-floor    # regenerate the floor map with its creatures and the wake point under public/maps/
 ```
 
```

- [x] **Step 6:** `npm run check`, then commit — `Move the intern into the spec`.

---

### Task 6: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 18 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 6 in this file and commit —
  `Tick the full check of 0033`.

---

### Task 7: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow
  keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk — and that this walk
  begins **before** the lamp is fetched: the call is read, and step 1 follows at once. Wait
  until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–14 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 6, and start again at step 1.
- [ ] **Step 4:** after step 14 ask the four feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–14`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0033`. A feel note that wants something
  else — other words, another place, a first line of his own — becomes a new draft, not a
  change on this branch.

---

### Task 8: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 6. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M6 section, say that 0032 and
  0033 are implemented and the other five are approved. Commit — `Mark 0033 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0033: the intern`, with the walk's result and feel notes in its description. CI
  must be green. The author merges.
