# 0032 — Implementation plan: the creature of Marketing

**Spec:** [`docs/features/0032-the-creature-of-marketing.md`](../features/0032-the-creature-of-marketing.md)
(approved 2026-11-19). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/world.md` §4, `docs/spec/gameplay.md` §3
and §7, `docs/spec/architecture.md` §2 and §5 and `docs/spec/testing.md` §5. **Written:**
2026-11-19 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0031 is merged into `main` (`786e991` or later). The branch
`feature/0032-the-creature-of-marketing` exists, cut from that `main`, and holds the seven
approved specs 0032 to 0038 and this plan. Work on it; merge the latest `main` into it
before Task 1. The specs 0033 to 0038 have no plan yet and are **not** built here.

**Goal:** Marketing has three mirages. A mirage moves only while the figure does not look at
it; the lamp freezes and captures it, and the journal shows it as its second entry.

**Approach:** five code tasks, each green on its own. The words (T1). The sheet (T2) — it
must exist before the species, because every species needs a sheet to compile. The species
with its habits (T3): `SPECIES` gets `mirage`, and with it every record over the species —
the counts, the habits, the journal's entry, the loader's sheet — after it a map with a
point named `mirage` has a creature that behaves, and the floor has none. The scene (T4):
a mirage that is looked at holds still. The floor (T5): the three points. Then the documents
(T6), the full check with the container (T7), the walk (T8) and the pull request (T9).

**How this plan was checked:** the code and the tests of Tasks 1 to 5 were run once as a
prototype on 2026-11-19, on the source of `main` at `786e991`, and then replayed task by task,
each task's tests before its code: they failed as the steps say, and after each of the five
tasks typecheck and Biome were clean and the unit tests green — 1445, 1453, 1481, 1487 and
1496 tests (1444 before). `npm run gen-sprites` wrote the prototype's `mirage.png` byte for
byte and changed no other sheet; `npm run gen-floor` gave the prototype's `floor.tmj` byte
for byte, 37 lines added and one changed. The blocks of this file, applied in order to a
clean tree, gave the prototype's files. `npm run check` with the build passed on the whole
prototype, and the smoke spec passed twice against a dev server of it: 18 passed, 3 skipped;
its changed test was run once before the code of Task 5 and failed with three creatures.
The prototype was thrown away; nothing of it is on the branch. If a step does not behave as
written, the cause is a difference to that state — stop and look; do not bend a test. The
game was **not** played in a browser — that is the walk — and the container was **not** run
with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `CreatureState` does not change, and the state gets no field. `captured` has a
  second count, `mirage`. Whether a mirage is looked at is **derived** in every step and
  every frame.
- INV-2: `isWatched` is a pure function of `game/creature`; the scene imports it from there.
- INV-4: the two strings live in `src/text/de.ts` and `src/text/en.ts`; `journal.ts` holds
  keys.
- INV-6: `mirage.png` uses the signature colour `#68386c` and is the fifth shadow asset; the
  list in `tests/unit/assets.test.ts` gets it in Task 2. It is written by
  `npm run gen-sprites` and never edited by hand.
- INV-7: no coordinate of a creature is in `src/`. The floor's three are `MIRAGES` in
  `tools/floor-layout.ts`; `public/maps/floor.tmj` is written by `npm run gen-floor`. No
  tile changes.
- **The habits are a table.** `HABITS` in `game/creature` holds, per species, the notice
  radius, the step distance and whether it is shy. It is a literal over `Species`, so a
  species without habits does not compile. `approach` reads it; the snippet's numbers are
  the ones it had.
- **No object of an earlier feature changes.** The objects 1 to 128 of the floor keep their
  id, their name and their place. A test of Task 5 holds them to a SHA-256 digest recorded
  from the generator before this feature, `785fe89a847f7c06…`; it is never recorded again.
  The three points have the ids 129 to 131, and `nextobjectid` is 132.
- **The two recorded digests of 600 steps** (`RECORDED` in `tests/unit/journal.test.ts` and
  in `tests/unit/help.test.ts`) are never recorded again. From Task 3 on both tests hash what
  was recorded: the snippets among the creatures, and the count of the snippet. That is
  criterion 10, as the spec words it since this plan.
- **Criterion 10 of the spec was corrected with this plan**, and the author was told: the
  tests of 0008 cannot pass *unchanged*, because the record of captures they compare has a
  second count now. They change in that count and in nothing else.
- **Older tests that change, and no other.**
  - Task 3: 34 literals of the record of captures get `mirage: 0`, in nine test files, and
    one more in `draw-journal.test.ts`; the three scene fixtures get the mirage's sheet; the
    two digest tests hash the snippets; `journal.test.ts` asks for the snippet's entry
    instead of the whole table.
  - Task 5, all in `floor.test.ts`: 128 objects become 131 and `nextobjectid` 129 becomes
    132; the points of the floor are 94 instead of 91, in five tests; the officer's point is
    the 91st and no longer the last; the five traces of Marketing are no longer the last
    objects; after Sales is solved the three mirages are still there; and after Marketing
    is solved the snippets are what is left. And one test of the smoke spec.
- In the scene tests two sheets that must be told apart need different objects: the mirage's
  sheet of the fixtures has an image of its own. A local helper in a test must not be named
  `after`, `before`, `beforeEach` or `afterEach`.
- What is out of the spec is not built: no picking of a creature at the source, no pages in
  the journal, no medium creature.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: `MIRAGE_NOTICE_RADIUS` 96 px; 1 px per step, 60 px
  per second; it stops 8 px from the feet; the feet (168, 1080), (616, 1048) and
  (360, 1208) on the cells (10, 67), (38, 65) and (22, 75), ids 129 to 131, `nextobjectid`
  132; `mirage.png` 48x16, three 16x16 frames, the rectangle columns 3–12 and rows 2–13,
  the head columns 7–8 and rows 5–6, the shoulders columns 6–9 in row 8 and columns 5–10 in
  rows 9–12, the ground `#c0cbdc`, lit `#ffffff`; the second entry of the journal 72 px
  below the first; `Trugbild` / `Mirage`.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | two keys: `creature.mirage-name`, `creature.mirage-text` |
| `tools/placeholder-mirage.ts` | new: the sheet's generator |
| `tools/gen-sprites.ts` | writes `mirage.png` |
| `public/sprites/mirage.png` | new, generated |
| `src/game/state.ts` | `SPECIES` gets `mirage` |
| `src/game/creature.ts` | `HABITS`, `isWatched`, the mirage's numbers; `approach` by habits; the second count |
| `src/game/journal.ts` | the mirage's entry |
| `src/main.ts` | loads the mirage's sheet |
| `src/render/draw-scene.ts` | a shy creature that is looked at holds still |
| `tools/floor-layout.ts` | `MIRAGES`; three points at the end |
| `public/maps/floor.tmj` | regenerated |
| `tests/unit/*.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/features/0032-the-creature-of-marketing.md` | criterion 10, corrected with this plan |
| `docs/spec/*`, `README.md` | Task 6 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `creature.mirage-name` and `creature.mirage-text`, in both
  languages.

- [ ] **Step 1: Write the failing test:**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -280,6 +280,23 @@
     ]);
   });
 
+  it('holds the words of the mirage in both languages (0032)', () => {
+    expect(textOf(textKey('creature.mirage-name'), 'de')).toBe('Trugbild');
+    expect(textOf(textKey('creature.mirage-name'), 'en')).toBe('Mirage');
+    expect(textOf(textKey('creature.mirage-text'), 'de').split('\n')).toStrictEqual([
+      'Ein Bild, das eine Maschine erzeugt hat und das',
+      'keiner geprüft hat. Es bewegt sich nur, solange',
+      'niemand hinsieht – und geht, sobald jemand',
+      'draufschaut, bevor es das Haus verlässt.',
+    ]);
+    expect(textOf(textKey('creature.mirage-text'), 'en').split('\n')).toStrictEqual([
+      'A picture a machine made and nobody checked.',
+      'It only moves while nobody is looking – and it',
+      'goes as soon as somebody looks at it before',
+      'it leaves the house.',
+    ]);
+  });
+
   it('holds the line of the wider cone in both languages (0029)', () => {
     expect(textOf(textKey('notice.upgrade-wide-cone'), 'de')).toBe(
       'Die Lampe leuchtet jetzt breiter und stärker.',
```

- [ ] **Step 2: Run it** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 1 of 26
  tests. `npx tsc --noEmit` reports four errors, all in this test: the two ids are not ids
  of the table yet.

- [ ] **Step 3: The words,** in both tables:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -40,6 +40,13 @@
     'allem, was dort eingefügt wird – und geht,',
     'sobald klar ist, welche Daten wohin dürfen.',
   ].join('\n'),
+  'creature.mirage-name': 'Trugbild',
+  'creature.mirage-text': [
+    'Ein Bild, das eine Maschine erzeugt hat und das',
+    'keiner geprüft hat. Es bewegt sich nur, solange',
+    'niemand hinsieht – und geht, sobald jemand',
+    'draufschaut, bevor es das Haus verlässt.',
+  ].join('\n'),
   'talk.officer-rules-1': [
     'Du siehst den Schatten also auch.',
     'Er bleibt überall dort zurück, wo Daten das',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -37,6 +37,13 @@
     'there – and it goes as soon as everyone knows',
     'which data may go where.',
   ].join('\n'),
+  'creature.mirage-name': 'Mirage',
+  'creature.mirage-text': [
+    'A picture a machine made and nobody checked.',
+    'It only moves while nobody is looking – and it',
+    'goes as soon as somebody looks at it before',
+    'it leaves the house.',
+  ].join('\n'),
   'talk.officer-rules-1': [
     'So you can see the shadow too.',
     'It stays behind wherever data leaves the house',
```

- [ ] **Step 4: Run** `npx vitest run tests/unit/text.test.ts` — green; the test that holds a
  species' name to 24 characters and its text to two to four lines of 47 covers the two.
  Then `npm run check`: 1445 unit tests.

- [ ] **Step 5: Commit** — `Add the words of the mirage`.

---

### Task 2: The sheet

**Files:**
- Create: `tools/placeholder-mirage.ts`, `public/sprites/mirage.png` (generated)
- Modify: `tools/gen-sprites.ts`
- Test: `tests/unit/gen-sprites.test.ts`, `tests/unit/assets.test.ts`

**Interfaces:**
- Produces:
  - `MIRAGE_FRAME_SIZE`, `MIRAGE_FRAMES`, `MIRAGE_SHEET_WIDTH`, `MIRAGE_SHEET_HEIGHT`,
    `MIRAGE_GROUND`, `MIRAGE_LIT`, `mirageInk(i, j)`, `renderMirage()` in
    `tools/placeholder-mirage.ts`
  - `encodeMiragePng()` in `tools/gen-sprites.ts`
  - `public/sprites/mirage.png`, 48x16, a shadow asset

- [ ] **Step 1: Write the failing tests.** `tests/unit/gen-sprites.test.ts`:

```diff
--- a/tests/unit/gen-sprites.test.ts
+++ b/tests/unit/gen-sprites.test.ts
@@ -12,6 +12,7 @@
   encodeDronePng,
   encodeLampPng,
   encodeLampWidePng,
+  encodeMiragePng,
   encodeOfficerPng,
   encodeOverviewPng,
   encodePersonPng,
@@ -33,6 +34,15 @@
   WIDE_LAMP_SHEET_HEIGHT,
   WIDE_LAMP_SHEET_WIDTH,
 } from '../../tools/placeholder-lamp.ts';
+import {
+  MIRAGE_FRAME_SIZE,
+  MIRAGE_FRAMES,
+  MIRAGE_GROUND,
+  MIRAGE_LIT,
+  MIRAGE_SHEET_HEIGHT,
+  MIRAGE_SHEET_WIDTH,
+  renderMirage,
+} from '../../tools/placeholder-mirage.ts';
 import {
   OVERVIEW_EMPTY,
   OVERVIEW_FRAME_SIZE,
@@ -342,6 +352,99 @@
   });
 });
 
+const MIRAGE_FILE = join(ROOT, 'public/sprites/mirage.png');
+const MIRAGE = renderMirage();
+
+/** The colour of pixel (i, j) of frame `index` of the mirage sheet, or null when transparent. */
+function miragePixel(index: number, i: number, j: number): string | null {
+  const o = (j * MIRAGE_SHEET_WIDTH + index * MIRAGE_FRAME_SIZE + i) * 4;
+  if (MIRAGE[o + 3] !== 255) {
+    return null;
+  }
+  return `#${[MIRAGE[o], MIRAGE[o + 1], MIRAGE[o + 2]]
+    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
+    .join('')}`;
+}
+
+function mirageFrame(index: number): (string | null)[][] {
+  return Array.from({ length: MIRAGE_FRAME_SIZE }, (_, j) =>
+    Array.from({ length: MIRAGE_FRAME_SIZE }, (_, i) => miragePixel(index, i, j)),
+  );
+}
+
+describe('the placeholder mirage generator (0032)', () => {
+  it('is deterministic: two runs give byte-identical files', () => {
+    expect(encodeMiragePng().equals(encodeMiragePng())).toBe(true);
+  });
+
+  it('matches the committed file', () => {
+    const committed = PNG.sync.read(readFileSync(MIRAGE_FILE));
+    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
+    expect(Buffer.from(MIRAGE).equals(committed.data)).toBe(true);
+  });
+
+  it('is 48x16: three 16x16 frames in one row', () => {
+    expect([
+      MIRAGE_SHEET_WIDTH,
+      MIRAGE_SHEET_HEIGHT,
+      MIRAGE_FRAME_SIZE,
+      MIRAGE_FRAMES,
+    ]).toStrictEqual([48, 16, 16, 3]);
+    expect(MIRAGE).toHaveLength(48 * 16 * 4);
+  });
+
+  it('has 120 opaque pixels per frame, 72 of them the signature colour', () => {
+    for (let index = 0; index < MIRAGE_FRAMES; index += 1) {
+      const pixels = mirageFrame(index).flat();
+      expect(
+        pixels.filter((colour) => colour !== null),
+        `frame ${index}`,
+      ).toHaveLength(120);
+      expect(
+        pixels.filter((colour) => colour === SHADOW_COLOUR),
+        `frame ${index}`,
+      ).toHaveLength(72);
+    }
+  });
+
+  it('draws frame 0 as the spec says: the rectangle 3–12 × 2–13, its border, a head and shoulders violet', () => {
+    // The border.
+    expect(miragePixel(0, 3, 2)).toBe(SHADOW_COLOUR);
+    expect(miragePixel(0, 12, 13)).toBe(SHADOW_COLOUR);
+    expect(miragePixel(0, 2, 2)).toBeNull();
+    expect(miragePixel(0, 3, 14)).toBeNull();
+    expect(miragePixel(0, 13, 7)).toBeNull();
+    // The head: columns 7–8, rows 5–6.
+    expect(miragePixel(0, 7, 5)).toBe(SHADOW_COLOUR);
+    expect(miragePixel(0, 8, 6)).toBe(SHADOW_COLOUR);
+    expect(miragePixel(0, 6, 5)).toBe(MIRAGE_GROUND);
+    expect(miragePixel(0, 7, 4)).toBe(MIRAGE_GROUND);
+    expect(miragePixel(0, 7, 7)).toBe(MIRAGE_GROUND);
+    // The shoulders: columns 6–9 in row 8, columns 5–10 in rows 9–12.
+    expect(miragePixel(0, 6, 8)).toBe(SHADOW_COLOUR);
+    expect(miragePixel(0, 9, 8)).toBe(SHADOW_COLOUR);
+    expect(miragePixel(0, 5, 8)).toBe(MIRAGE_GROUND);
+    expect(miragePixel(0, 5, 9)).toBe(SHADOW_COLOUR);
+    expect(miragePixel(0, 10, 12)).toBe(SHADOW_COLOUR);
+    expect(miragePixel(0, 4, 9)).toBe(MIRAGE_GROUND);
+    expect(miragePixel(0, 11, 12)).toBe(MIRAGE_GROUND);
+    expect([MIRAGE_GROUND, MIRAGE_LIT]).toStrictEqual(['#c0cbdc', '#ffffff']);
+  });
+
+  it('frame 1 is frame 0 moved one pixel to the right', () => {
+    expect(mirageFrame(1)).toStrictEqual(
+      mirageFrame(0).map((row) => [null, ...row.slice(0, MIRAGE_FRAME_SIZE - 1)]),
+    );
+  });
+
+  it('frame 2 is frame 0 with a white ground', () => {
+    const lit = mirageFrame(0).map((row) =>
+      row.map((colour) => (colour === MIRAGE_GROUND ? MIRAGE_LIT : colour)),
+    );
+    expect(mirageFrame(2)).toStrictEqual(lit);
+  });
+});
+
 const SNIPPET_FILE = join(ROOT, 'public/sprites/snippet.png');
 const SNIPPET = renderSnippet();
 
```

  `tests/unit/assets.test.ts` — the sheet is the fifth shadow asset:

```diff
--- a/tests/unit/assets.test.ts
+++ b/tests/unit/assets.test.ts
@@ -9,12 +9,13 @@
 
 const ROOT = fileURLToPath(new URL('../../', import.meta.url));
 const RULES = { palette: new Set<string>(ENDESGA_32), reserved: SHADOW_COLOUR };
-/** The shadow assets: the only files that may use the reserved colour (visual.md §4, 0008, 0014, 0022). */
+/** The shadow assets: the only files that may use the reserved colour (visual.md §4, 0008, 0014, 0022, 0032). */
 const SHADOW_ASSETS: ReadonlySet<string> = new Set([
   'public/sprites/snippet.png',
   'public/sprites/shadow-wall.png',
   'public/sprites/trace.png',
   'public/sprites/shadow-veil.png',
+  'public/sprites/mirage.png',
 ]);
 const rulesFor = (file: string) => ({
   ...RULES,
@@ -72,6 +73,10 @@
     expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/lamp-wide.png');
   });
 
+  it('checks the mirage sheet under public/sprites/ with every other PNG (0032)', () => {
+    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/mirage.png');
+  });
+
   it('checks the snippet sheet under public/sprites/ with every other PNG', () => {
     expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/snippet.png');
   });
@@ -96,7 +101,9 @@
       'public/sprites/shadow-wall.png',
       'public/sprites/trace.png',
       'public/sprites/shadow-veil.png',
+      'public/sprites/mirage.png',
     ]);
+    expect(checkPng('x.png', violet, rulesFor('public/sprites/mirage.png'))).toStrictEqual([]);
   });
 
   it('checks the shadow-wall sheet under public/sprites/ with every other PNG (0014)', () => {
```

- [ ] **Step 2: Run them** —
  `npx vitest run tests/unit/gen-sprites.test.ts tests/unit/assets.test.ts`. Expected: FAIL:
  `gen-sprites.test.ts` does not load — it imports a file that does not exist, so the file
  fails as a whole and none of its tests runs — and 1 of 26 fails in `assets.test.ts`.
  `npx tsc --noEmit` reports two errors.

- [ ] **Step 3: The generator.** Create `tools/placeholder-mirage.ts`:

```ts
import { type PaletteColour, SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder mirage sheet (visual.md §5, feature 0032): a small framed portrait of
 * nobody, three 16x16 frames in one row. Frame 0 and frame 1, one pixel to the right, alternate
 * while nobody looks at the creature; frame 2, the ground white, is the creature frozen in the
 * light. Frame, head and shoulders are the signature colour — a shadow asset. Pure — it returns
 * pixels; tools/gen-sprites.ts writes the file.
 */

export const MIRAGE_FRAME_SIZE = 16;
export const MIRAGE_FRAMES = 3;
export const MIRAGE_SHEET_WIDTH = MIRAGE_FRAMES * MIRAGE_FRAME_SIZE;
export const MIRAGE_SHEET_HEIGHT = MIRAGE_FRAME_SIZE;
export const MIRAGE_GROUND: PaletteColour = '#c0cbdc';
export const MIRAGE_LIT: PaletteColour = '#ffffff';

/**
 * Pixel (i, j) of frame 0: the rectangle columns 3–12, rows 2–13. Its border is `edge`; so are
 * the head, columns 7–8 and rows 5–6, and the shoulders, columns 6–9 in row 8 and columns 5–10
 * in rows 9–12. The rest of the inside is `ground`.
 */
export function mirageInk(i: number, j: number): 'edge' | 'ground' | null {
  if (i < 3 || i > 12 || j < 2 || j > 13) {
    return null;
  }
  if (i === 3 || i === 12 || j === 2 || j === 13) {
    return 'edge';
  }
  const head = i >= 7 && i <= 8 && j >= 5 && j <= 6;
  const neck = j === 8 && i >= 6 && i <= 9;
  const shoulders = j >= 9 && j <= 12 && i >= 5 && i <= 10;
  return head || neck || shoulders ? 'edge' : 'ground';
}

/** RGBA, row-major, MIRAGE_SHEET_WIDTH × MIRAGE_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderMirage(): Uint8Array {
  const data = new Uint8Array(MIRAGE_SHEET_WIDTH * MIRAGE_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < MIRAGE_FRAMES; frame += 1) {
    for (let j = 0; j < MIRAGE_FRAME_SIZE; j += 1) {
      for (let i = 0; i < MIRAGE_FRAME_SIZE; i += 1) {
        // Frame 1 is frame 0 moved one pixel to the right.
        const ink = mirageInk(frame === 1 ? i - 1 : i, j);
        if (ink === null) {
          continue;
        }
        const ground = frame === 2 ? MIRAGE_LIT : MIRAGE_GROUND;
        const colour = ink === 'edge' ? SHADOW_COLOUR : ground;
        data.set(
          [...rgb(colour), 255],
          (j * MIRAGE_SHEET_WIDTH + frame * MIRAGE_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
```

- [ ] **Step 4: `gen-sprites.ts`** writes the sheet:

```diff
--- a/tools/gen-sprites.ts
+++ b/tools/gen-sprites.ts
@@ -11,6 +11,7 @@
   WIDE_LAMP_SHEET_HEIGHT,
   WIDE_LAMP_SHEET_WIDTH,
 } from './placeholder-lamp.ts';
+import { MIRAGE_SHEET_HEIGHT, MIRAGE_SHEET_WIDTH, renderMirage } from './placeholder-mirage.ts';
 import {
   OVERVIEW_SHEET_HEIGHT,
   OVERVIEW_SHEET_WIDTH,
@@ -40,7 +41,8 @@
  * of 0017 from tools/placeholder-person.ts; and public/sprites/trace.png of 0022 from
  * tools/placeholder-trace.ts; and public/sprites/shadow-veil.png of 0023 from
  * tools/placeholder-veil.ts; and public/sprites/lamp-wide.png of 0029 from
- * tools/placeholder-lamp.ts. Deterministic — pngjs writes no timestamp — and Node
+ * tools/placeholder-lamp.ts; and public/sprites/mirage.png of 0032 from
+ * tools/placeholder-mirage.ts. Deterministic — pngjs writes no timestamp — and Node
  * runs this TypeScript file directly, without a transpiler.
  */
 
@@ -69,6 +71,13 @@
   return PNG.sync.write(png);
 }
 
+/** The mirage (0032): the second species. */
+export function encodeMiragePng(): Buffer {
+  const png = new PNG({ width: MIRAGE_SHEET_WIDTH, height: MIRAGE_SHEET_HEIGHT });
+  png.data = Buffer.from(renderMirage());
+  return PNG.sync.write(png);
+}
+
 export function encodeOverviewPng(): Buffer {
   const png = new PNG({ width: OVERVIEW_SHEET_WIDTH, height: OVERVIEW_SHEET_HEIGHT });
   png.data = Buffer.from(renderOverview());
@@ -137,6 +146,7 @@
   writeFileSync('public/sprites/lamp.png', encodeLampPng());
   writeFileSync('public/sprites/lamp-wide.png', encodeLampWidePng());
   writeFileSync('public/sprites/snippet.png', encodeSnippetPng());
+  writeFileSync('public/sprites/mirage.png', encodeMiragePng());
   writeFileSync('public/sprites/overview.png', encodeOverviewPng());
   for (const look of PERSON_SHIRTS.keys()) {
     writeFileSync(`public/sprites/person-${look + 1}.png`, encodePersonPng(look));
```

- [ ] **Step 5: Generate** — `npm run gen-sprites`. Then `git status --short public` shows one
  line, `?? public/sprites/mirage.png`: no other sheet changed.
  `shasum -a 256 public/sprites/mirage.png` gives
  `ab2ca9e81840a68fa216cf10d3358ca13a511246119bece2490c83e075684421`.
  If another sheet changed, stop.

- [ ] **Step 6: Run** the two test files of Step 2 — green — then `npm run check`: 1453 unit
  tests. The asset test holds the sheet to the palette and allows it the signature colour.

- [ ] **Step 7: Commit** — `Draw the sheet of the mirage`, with the PNG.

---

### Task 3: The species

**Files:**
- Modify: `src/game/state.ts`, `src/game/creature.ts`, `src/game/journal.ts`, `src/main.ts`
- Test: `tests/unit/creature.test.ts`, `tests/unit/state.test.ts`,
  `tests/unit/journal.test.ts`, `tests/unit/draw-journal.test.ts`, and the literals and
  fixtures of `cases.test.ts`, `draw-help.test.ts`, `draw-scene.test.ts`, `floor.test.ts`,
  `help.test.ts`, `opening.test.ts`, `overview.test.ts`

**Interfaces:**
- Consumes: the two text ids (Task 1); `/sprites/mirage.png` (Task 2).
- Produces:
  - `SPECIES = ['snippet', 'mirage']`; `Captured` with the count `mirage`
  - `MIRAGE_NOTICE_RADIUS = 96`, `MIRAGE_SPEED_PX_PER_SECOND = 60`
  - `Habits` `{ noticeRadius, stepDistance, shy }`,
    `HABITS: Readonly<Record<Species, Habits>>`
  - `isWatched(creature: CreatureState, player: PlayerState, map: TileMap): boolean`
  - `ENTRY_TEXT.mirage`; `SceneContent.creatureSheets.mirage`, loaded by `main.ts`

- [ ] **Step 1: Write the failing tests.** First the record of captures: every literal
  `{ snippet: n }` in the unit tests becomes `{ snippet: n, mirage: 0 }` — 34 of them in
  nine files, plus the one of `draw-journal.test.ts` that holds a variable. The diffs below
  show each. `tests/unit/creature.test.ts` — and one block at its end:

```diff
--- a/tests/unit/creature.test.ts
+++ b/tests/unit/creature.test.ts
@@ -6,7 +6,11 @@
   CAPTURE_STEPS,
   CREATURE_SPEED_PX_PER_SECOND,
   creaturesFrom,
+  HABITS,
   isLit,
+  isWatched,
+  MIRAGE_NOTICE_RADIUS,
+  MIRAGE_SPEED_PX_PER_SECOND,
   NOTICE_RADIUS,
   noCaptures,
   stepCreature,
@@ -248,20 +252,23 @@
     const RIGHT = figure(100, 100, 'right');
     const result = stepCreatures(
       [snippet(130, 100, 59), snippet(136, 100, 3)],
-      { snippet: 4 },
+      { snippet: 4, mirage: 0 },
       RIGHT,
       true,
       OPEN,
     );
-    expect(result).toStrictEqual({ creatures: [snippet(136, 100, 4)], captured: { snippet: 5 } });
+    expect(result).toStrictEqual({
+      creatures: [snippet(136, 100, 4)],
+      captured: { snippet: 5, mirage: 0 },
+    });
   });
 
   it('leaves its arguments unchanged', () => {
     const creatures = [snippet(130, 100, 59)];
-    const captured = { snippet: 0 };
+    const captured = { snippet: 0, mirage: 0 };
     stepCreatures(creatures, captured, figure(100, 100, 'right'), true, OPEN);
     expect(creatures).toStrictEqual([snippet(130, 100, 59)]);
-    expect(captured).toStrictEqual({ snippet: 0 });
+    expect(captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 });
 
@@ -314,7 +321,7 @@
   });
 
   it('starts every count at 0', () => {
-    expect(noCaptures()).toStrictEqual({ snippet: 0 });
+    expect(noCaptures()).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 });
 
@@ -344,10 +351,176 @@
   it('is counted by the step of all creatures with the wider cone only', () => {
     const almost = { ...BESIDE, light: CAPTURE_STEPS - 1 };
     const wide = stepCreatures([almost], noCaptures(), PLAYER, true, OPEN, WIDE_SPREAD);
-    expect(wide).toStrictEqual({ creatures: [], captured: { snippet: 1 } });
+    expect(wide).toStrictEqual({ creatures: [], captured: { snippet: 1, mirage: 0 } });
     const narrow = stepCreatures([almost], noCaptures(), PLAYER, true, OPEN);
-    expect(narrow.captured).toStrictEqual({ snippet: 0 });
+    expect(narrow.captured).toStrictEqual({ snippet: 0, mirage: 0 });
     expect(narrow.creatures).toHaveLength(1);
     expect(narrow.creatures[0]?.light).toBe(0);
   });
 });
+
+describe('the mirage (0032)', () => {
+  const mirage = (x: number, y: number, light = 0): CreatureState => ({
+    species: 'mirage',
+    x,
+    y,
+    light,
+    home: HOME,
+  });
+  /** One step with the lamp off. */
+  const stepped = (creature: CreatureState, player: PlayerState, map = OPEN): CreatureState => {
+    const next = stepCreature(creature, player, false, map);
+    if (next === null) {
+      throw new Error('captured with the lamp off');
+    }
+    return next;
+  };
+
+  it('has its habits: six tiles, 1 px per step, and it moves only while nobody looks', () => {
+    expect([MIRAGE_NOTICE_RADIUS, MIRAGE_SPEED_PX_PER_SECOND]).toStrictEqual([96, 60]);
+    expect(HABITS.mirage).toStrictEqual({ noticeRadius: 96, stepDistance: 1, shy: true });
+    expect(HABITS.snippet).toStrictEqual({ noticeRadius: 64, stepDistance: 40 / 60, shy: false });
+  });
+
+  describe('looked at', () => {
+    /** The centre of the figure's box is (100, 96). */
+    const facing = (to: Facing): PlayerState => figure(100, 100, to);
+    /** The body point of a creature with these feet is 8 px above them. */
+    const below = mirage(100, 154);
+    const above = mirage(100, 54);
+    const right = mirage(150, 104);
+    const left = mirage(50, 104);
+
+    it('is what lies ahead of the figure, for each of the four facings', () => {
+      const seen = (to: Facing): boolean[] =>
+        [below, above, right, left].map((creature) => isWatched(creature, facing(to), OPEN));
+      expect(seen('down')).toStrictEqual([true, false, false, false]);
+      expect(seen('up')).toStrictEqual([false, true, false, false]);
+      expect(seen('right')).toStrictEqual([false, false, true, false]);
+      expect(seen('left')).toStrictEqual([false, false, false, true]);
+    });
+
+    it('is half of the map: a creature far to the side counts as soon as it is a pixel ahead', () => {
+      // The body point is 1 px below the centre of the box, 60 px beside it.
+      expect(isWatched(mirage(160, 105), facing('down'), OPEN)).toBe(true);
+      expect(isWatched(mirage(40, 105), facing('down'), OPEN)).toBe(true);
+    });
+
+    it('is not a creature exactly beside the figure', () => {
+      expect(isWatched(right, facing('down'), OPEN)).toBe(false);
+      expect(isWatched(right, facing('up'), OPEN)).toBe(false);
+    });
+
+    it('is not a creature behind an opaque box, and is one across a low box', () => {
+      // Cell (9, 6) is [144, 160) × [96, 112): on the line from (100, 96) to the body (190, 100).
+      const far = mirage(190, 108);
+      const box = { x: 144, y: 96, width: 16, height: 16 };
+      const placed = solidsWith(20, 12, [{ column: 9, row: 6, box }]);
+      expect(isWatched(far, facing('right'), OPEN)).toBe(true);
+      expect(isWatched(far, facing('right'), { ...OPEN, solids: placed })).toBe(true);
+      expect(isWatched(far, facing('right'), { ...OPEN, solids: placed, opaque: placed })).toBe(
+        false,
+      );
+    });
+  });
+
+  it('stands while it is looked at: 50 px ahead, 600 steps without the lamp', () => {
+    const player = figure(160, 60, 'down');
+    let creature = mirage(160, 118);
+    for (let step = 0; step < 600; step += 1) {
+      creature = stepped(creature, player);
+    }
+    expect(creature).toStrictEqual(mirage(160, 118));
+  });
+
+  it('comes while it is not looked at: 1 px per step toward the feet, and stops 8 px from them', () => {
+    // 50 px behind a figure that looks down.
+    const player = figure(160, 110, 'down');
+    let creature = mirage(160, 60);
+    creature = stepped(creature, player);
+    expect(creature).toStrictEqual(mirage(160, 61));
+    for (let step = 0; step < 41; step += 1) {
+      creature = stepped(creature, player);
+    }
+    expect(creature).toStrictEqual(mirage(160, 102));
+    expect(stepped(creature, player)).toStrictEqual(mirage(160, 102));
+  });
+
+  it('comes from the side as well: beside the figure it is not looked at', () => {
+    // Its body point is 4 px above the centre of the figure's box: not ahead.
+    const player = figure(160, 110, 'down');
+    expect(stepped(mirage(110, 110), player)).toStrictEqual(mirage(111, 110));
+  });
+
+  it('rests at exactly 96 px and comes from 95', () => {
+    const player = figure(200, 100, 'right');
+    expect(stepped(mirage(104, 108), player)).toStrictEqual(mirage(104, 108));
+    const moved = stepped(mirage(105, 108), player);
+    expect(moved.x).toBeGreaterThan(105);
+    // A snippet rests there: its radius is 64 px.
+    expect(stepped(snippet(105, 108), player)).toStrictEqual(snippet(105, 108));
+  });
+
+  it('comes from ahead when an opaque box hides it, and stands behind a low one', () => {
+    const player = figure(100, 100, 'right');
+    const hidden = mirage(170, 108);
+    const box = { x: 128, y: 96, width: 16, height: 16 };
+    const placed = solidsWith(20, 12, [{ column: 8, row: 6, box }]);
+    expect(stepped(hidden, player, { ...OPEN, solids: placed })).toStrictEqual(hidden);
+    const came = stepped(hidden, player, { ...OPEN, solids: placed, opaque: placed });
+    expect(came.x).toBeLessThan(170);
+  });
+
+  it('is held by a solid box as the snippet is', () => {
+    // The box [112, 128) × [96, 112) lies on its way to a figure on its left that looks away.
+    const player = figure(60, 108, 'left');
+    const box = { x: 112, y: 96, width: 16, height: 16 };
+    const low = { ...OPEN, solids: solidsWith(20, 12, [{ column: 7, row: 6, box }]) };
+    let creature = mirage(140, 108);
+    for (let step = 0; step < 30; step += 1) {
+      creature = stepped(creature, player, low);
+    }
+    // Its box is 12 px wide: it stops flush at x = 128 + 6.
+    expect(creature.x).toBe(134);
+  });
+
+  it('freezes in the cone whether it is looked at or not, and is captured in the 60th lit step', () => {
+    const player = figure(100, 100, 'down');
+    let creature: CreatureState | null = mirage(100, 136);
+    for (let step = 1; step < CAPTURE_STEPS; step += 1) {
+      creature = creature === null ? null : stepCreature(creature, player, true, OPEN);
+      expect(creature).toStrictEqual(mirage(100, 136, step));
+    }
+    expect(creature === null ? null : stepCreature(creature, player, true, OPEN)).toBeNull();
+  });
+
+  it('starts its count again when the light breaks', () => {
+    const player = figure(100, 100, 'down');
+    expect(stepped(mirage(100, 136, 30), player)).toStrictEqual(mirage(100, 136));
+  });
+
+  it('is counted as a mirage, and a snippet in the same step goes by its own rule', () => {
+    // Both are 50 px ahead of a figure that looks down, outside the cone.
+    const player = figure(160, 60, 'down');
+    const both = stepCreatures(
+      [snippet(140, 118), mirage(180, 118)],
+      noCaptures(),
+      player,
+      false,
+      OPEN,
+    );
+    expect(both.creatures[0]?.y).toBeLessThan(118);
+    expect(both.creatures[1]).toStrictEqual(mirage(180, 118));
+    const almost = mirage(160, 96, CAPTURE_STEPS - 1);
+    expect(stepCreatures([almost], noCaptures(), player, true, OPEN)).toStrictEqual({
+      creatures: [],
+      captured: { snippet: 0, mirage: 1 },
+    });
+  });
+
+  it('is made from a point named after it', () => {
+    expect(creaturesFrom([{ name: 'mirage', x: 168, y: 1080 }])).toStrictEqual([
+      { species: 'mirage', x: 168, y: 1080, light: 0, home: { x: 168, y: 1080 } },
+    ]);
+  });
+});
```

  `tests/unit/state.test.ts`:

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -7,7 +7,13 @@
 import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { clearingVeil } from '../../src/game/region';
-import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../../src/game/state';
+import {
+  FACINGS,
+  type GameState,
+  PHASES_PER_FACING,
+  type PlayerState,
+  SPECIES,
+} from '../../src/game/state';
 import { createInitialState, newGame, update } from '../../src/game/update';
 import { grassMap } from './grass-map';
 
@@ -103,7 +109,7 @@
       journal: null,
       help: false,
       held: NO_INPUT,
-      captured: { snippet: 0 },
+      captured: { snippet: 0, mirage: 0 },
       overview: { current: 5, max: 5 },
       dark: 0,
     });
@@ -165,7 +171,7 @@
         journal: null,
         help: false,
         held: NO_INPUT,
-        captured: { snippet: 0 },
+        captured: { snippet: 0, mirage: 0 },
         overview: { current: 3, max: 3 },
         dark: 0,
       },
@@ -195,7 +201,7 @@
       journal: null,
       help: false,
       held: NO_INPUT,
-      captured: { snippet: 0 },
+      captured: { snippet: 0, mirage: 0 },
       overview: { current: 3, max: 3 },
       dark: 0,
     };
@@ -217,7 +223,7 @@
       journal: null,
       help: false,
       held: NO_INPUT,
-      captured: { snippet: 0 },
+      captured: { snippet: 0, mirage: 0 },
       overview: { current: 3, max: 3 },
       dark: 0,
     });
@@ -311,7 +317,7 @@
     expect(state.creatures).toStrictEqual([
       { species: 'snippet', x: 1070, y: 734, light: 0, home: { x: 1070, y: 734 } },
     ]);
-    expect(state.captured).toStrictEqual({ snippet: 0 });
+    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 
   it('rejects a point whose name is no species', () => {
@@ -332,7 +338,7 @@
     ]);
     const done = run(MAP_ONE, [60, RIGHT_SHINE]);
     expect(done.creatures).toStrictEqual([]);
-    expect(done.captured).toStrictEqual({ snippet: 1 });
+    expect(done.captured).toStrictEqual({ snippet: 1, mirage: 0 });
   });
 
   it('survives a JSON round trip with a frozen creature and a count of 1 (INV-1)', () => {
@@ -346,7 +352,7 @@
     ]);
     const DOWN: GameInput = { ...NONE, down: true };
     const state = run(map, [60, RIGHT_SHINE], [45, DOWN], [30, DOWN_SHINE]);
-    expect(state.captured).toStrictEqual({ snippet: 1 });
+    expect(state.captured).toStrictEqual({ snippet: 1, mirage: 0 });
     expect(state.creatures).toHaveLength(1);
     expect(state.creatures[0]?.light).toBe(30);
     expect(state.creatures[0]?.x).toBe(1024);
@@ -559,7 +565,7 @@
       expect(state.creatures).toStrictEqual([
         { species: 'snippet', x: 152, y: 108, light: 0, home: { x: 152, y: 120 } },
       ]);
-      expect(state.captured).toStrictEqual({ snippet: 0 });
+      expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0 });
       expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
     });
 
@@ -567,7 +573,7 @@
       const lifted: GameState = { ...createInitialState(map), shadowWalls: [] };
       const state = run(map, lifted, [60, SHINE]);
       expect(state.creatures).toStrictEqual([]);
-      expect(state.captured).toStrictEqual({ snippet: 1 });
+      expect(state.captured).toStrictEqual({ snippet: 1, mirage: 0 });
     });
 
     it('walks through the doorway once the wall is lifted', () => {
@@ -913,7 +919,7 @@
     expect(solved.solved).toStrictEqual([{ region: 'sales', at: 1005 }]);
     expect(solved.creatures).toStrictEqual([OUTSIDE]);
     expect(solved.shadowWalls).toStrictEqual([{ wall: 1, lit: false, light: 0 }]);
-    expect(solved.captured).toStrictEqual({ snippet: 0 });
+    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 
   it('removes nothing in a step that solves nothing', () => {
@@ -933,7 +939,7 @@
     expect(woken.dark).toBe(45);
     expect(woken.creatures).toStrictEqual([OUTSIDE]);
     expect(woken.shadowWalls).toStrictEqual([{ wall: 1, lit: false, light: 0 }]);
-    expect(woken.captured).toStrictEqual({ snippet: 0 });
+    expect(woken.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 
   it('keeps them gone: 600 steps later the creature and the wall are still not there', () => {
@@ -1076,17 +1082,17 @@
     ]);
     const almost = run(upgraded(SNIPPET_MAP), SNIPPET_MAP, SHINE, 59);
     expect(almost.creatures[0]?.light).toBe(59);
-    expect(almost.captured).toStrictEqual({ snippet: 0 });
+    expect(almost.captured).toStrictEqual({ snippet: 0, mirage: 0 });
     const captured = update(almost, SHINE, SNIPPET_MAP);
     expect(captured.creatures).toStrictEqual([]);
-    expect(captured.captured).toStrictEqual({ snippet: 1 });
+    expect(captured.captured).toStrictEqual({ snippet: 1, mirage: 0 });
   });
 
   it('does not light the same creature without the wider cone: it comes nearer', () => {
     const dark = update(createInitialState(SNIPPET_MAP), SHINE, SNIPPET_MAP);
     expect(dark.creatures[0]?.light).toBe(0);
     expect(dark.creatures[0]?.x).toBeLessThan(128);
-    expect(dark.captured).toStrictEqual({ snippet: 0 });
+    expect(dark.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 
   /**
@@ -1160,5 +1166,59 @@
     const held = run(createInitialState(hr), hr, SHINE, 600);
     expect(held.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
     expect(noticeOf(held)).toBe(NOTICE_SHADOW_TOO_DENSE);
+  });
+});
+
+describe('the second species in the state (0032)', () => {
+  /** The spawn (100, 100) looks down. One mirage is 30 px behind it, one 9 px. */
+  const BEHIND = grassMap(20, 12, { x: 100, y: 100 }, [{ name: 'mirage', x: 100, y: 70 }]);
+  const CLOSE = grassMap(20, 12, { x: 100, y: 100 }, [{ name: 'mirage', x: 100, y: 91 }]);
+  /** The apex is (100, 48); the body of the mirage is 40 px along the axis, in the cone. */
+  const AHEAD = grassMap(20, 12, { x: 100, y: 60 }, [{ name: 'mirage', x: 100, y: 96 }]);
+
+  it('has two species, and a count for each from the start', () => {
+    expect(SPECIES).toStrictEqual(['snippet', 'mirage']);
+    expect(createInitialState(MAP).captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(newGame(MAP).captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
+
+  it('makes a mirage from a point of the map, and it comes while the figure looks away', () => {
+    const start = createInitialState(BEHIND);
+    expect(start.creatures).toStrictEqual([
+      { species: 'mirage', x: 100, y: 70, light: 0, home: { x: 100, y: 70 } },
+    ]);
+    const next = update(start, NONE, BEHIND);
+    expect(next.creatures[0]).toMatchObject({ x: 100, y: 71, light: 0 });
+  });
+
+  it('stands while the figure looks at it', () => {
+    let state = createInitialState(AHEAD);
+    for (let step = 0; step < 120; step += 1) {
+      state = update(state, NONE, AHEAD);
+    }
+    expect(state.creatures[0]).toMatchObject({ x: 100, y: 96, light: 0 });
+  });
+
+  it('is captured in the 60th lit step and counted as a mirage', () => {
+    let state = createInitialState(AHEAD);
+    for (let step = 0; step < 59; step += 1) {
+      state = update(state, SHINE, AHEAD);
+    }
+    expect(state.creatures[0]?.light).toBe(59);
+    state = update(state, SHINE, AHEAD);
+    expect(state.creatures).toStrictEqual([]);
+    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 1 });
+    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
+  });
+
+  it('takes one point of overview and pushes the figure when it is within 10 px', () => {
+    const hit = update(createInitialState(CLOSE), NONE, CLOSE);
+    expect(hit.overview).toStrictEqual({ current: 4, max: 5 });
+    expect(hit.player.recoil.steps).toBeGreaterThan(0);
+  });
+
+  it('survives a JSON round trip at the start (INV-1)', () => {
+    const start = createInitialState(BEHIND);
+    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
+  });
 });
```

  `tests/unit/journal.test.ts` — the entry of each species, and the recording hashes the
  snippets and their count:

```diff
--- a/tests/unit/journal.test.ts
+++ b/tests/unit/journal.test.ts
@@ -12,7 +12,7 @@
 } from '../../src/engine/tiled';
 import { ENTRY_TEXT, entriesOf, openJournal, stepJournal, TAB_TEXT } from '../../src/game/journal';
 import { type GameInput, NO_INPUT, pressed } from '../../src/game/player';
-import { type GameState, JOURNAL_TABS } from '../../src/game/state';
+import { type GameState, JOURNAL_TABS, SPECIES } from '../../src/game/state';
 import { createInitialState, update } from '../../src/game/update';
 import { textKey } from '../../src/text/text';
 import { grassMap } from './grass-map';
@@ -88,15 +88,29 @@
   });
 
   it('gives the snippet its name and its text', () => {
-    expect(ENTRY_TEXT).toStrictEqual({
-      snippet: { name: textKey('creature.snippet-name'), text: textKey('creature.snippet-text') },
+    expect(ENTRY_TEXT.snippet).toStrictEqual({
+      name: textKey('creature.snippet-name'),
+      text: textKey('creature.snippet-text'),
     });
   });
 
+  it('gives the mirage its name and its text, and has an entry for every species (0032)', () => {
+    expect(ENTRY_TEXT.mirage).toStrictEqual({
+      name: textKey('creature.mirage-name'),
+      text: textKey('creature.mirage-text'),
+    });
+    expect(Object.keys(ENTRY_TEXT)).toStrictEqual([...SPECIES]);
+  });
+
+  it('lists the captured species in the order of the species, not of the captures (0032)', () => {
+    expect(entriesOf({ snippet: 0, mirage: 1 })).toStrictEqual(['mirage']);
+    expect(entriesOf({ snippet: 2, mirage: 1 })).toStrictEqual(['snippet', 'mirage']);
+  });
+
   it('lists a species as soon as one of it is captured', () => {
-    expect(entriesOf({ snippet: 0 })).toStrictEqual([]);
-    expect(entriesOf({ snippet: 1 })).toStrictEqual(['snippet']);
-    expect(entriesOf({ snippet: 3 })).toStrictEqual(['snippet']);
+    expect(entriesOf({ snippet: 0, mirage: 0 })).toStrictEqual([]);
+    expect(entriesOf({ snippet: 1, mirage: 0 })).toStrictEqual(['snippet']);
+    expect(entriesOf({ snippet: 3, mirage: 0 })).toStrictEqual(['snippet']);
   });
 });
 
@@ -327,12 +341,13 @@
     state.camera,
     // The lamp as it was recorded: without the two fields of 0026.
     { on: state.lamp.on, strength: state.lamp.strength },
-    state.creatures,
+    // The creatures and the count as they were recorded: the snippets, before 0032.
+    state.creatures.filter((creature) => creature.species === 'snippet'),
     state.movers,
     state.shadowWalls,
     state.figures,
     state.dialogue,
-    state.captured,
+    { snippet: state.captured.snippet },
     state.overview,
     state.dark,
   ];
```

  `tests/unit/help.test.ts` — the second recording, the same way:

```diff
--- a/tests/unit/help.test.ts
+++ b/tests/unit/help.test.ts
@@ -299,13 +299,14 @@
     state.camera,
     // The lamp as it was recorded: without the two fields of 0026.
     { on: state.lamp.on, strength: state.lamp.strength },
-    state.creatures,
+    // The creatures and the count as they were recorded: the snippets, before 0032.
+    state.creatures.filter((creature) => creature.species === 'snippet'),
     state.movers,
     state.shadowWalls,
     state.figures,
     state.dialogue,
     state.journal,
-    state.captured,
+    { snippet: state.captured.snippet },
     state.overview,
     state.dark,
   ];
```

  `tests/unit/draw-journal.test.ts` — the fixture, the literal, and one block at its end:

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -69,7 +69,11 @@
   playerSheet: sheet(16, 24),
   lampSheet: sheet(48, 48),
   lampWideSheet: sheet(72, 72),
-  creatureSheets: { snippet: sheet(16, 16) },
+  creatureSheets: {
+    snippet: sheet(16, 16),
+    // Its own image, so that the two sheets can be told apart.
+    mirage: { ...sheet(16, 16), image: { mirage: true } as unknown as ImageBitmap },
+  },
   overviewSheet: sheet(8, 8),
   shadowWallSheet: sheet(16, 16),
   traceSheet: sheet(16, 16),
@@ -110,7 +114,7 @@
   journal: { tab },
   help: false,
   held: NO_INPUT,
-  captured: { snippet: snippets },
+  captured: { snippet: snippets, mirage: 0 },
   overview: { current: 5, max: 5 },
   dark: 0,
 });
@@ -561,3 +565,60 @@
     expect(blocks).toContain('drawSprite 37 at 16,96');
   });
 });
+
+describe('the second entry of the creatures tab (0032)', () => {
+  const shown = (captured: GameState['captured'], settings = GERMAN) => {
+    const renderer = recordingRenderer();
+    const state: GameState = { ...reading('creatures'), captured };
+    drawJournal(renderer, state, { tab: 'creatures' }, CONTENT, settings);
+    const from = renderer.calls.indexOf(RULE) + 1;
+    return { calls: renderer.calls.slice(from), sheets: renderer.sheets.slice(from - 5) };
+  };
+
+  it('draws the mirage alone in the first place when only a mirage is captured', () => {
+    const { calls } = shown({ snippet: 0, mirage: 1 });
+    expect(calls[0]).toBe(`drawSprite ${ENTRY_FRAME} at 16,32`);
+    // `Trugbild`: `T` is glyph 52; the text starts with `Ein Bild …`, `E` is glyph 37.
+    expect(calls[1]).toBe('drawSprite 52 at 40,35');
+    expect(calls[9]).toBe('drawSprite 37 at 16,54');
+  });
+
+  it('draws it from its own sheet', () => {
+    const only = recordingRenderer();
+    drawJournal(
+      only,
+      { ...reading('creatures'), captured: { snippet: 0, mirage: 1 } },
+      { tab: 'creatures' },
+      CONTENT,
+      GERMAN,
+    );
+    expect(only.sheets).toContain(CONTENT.creatureSheets.mirage);
+    expect(only.sheets).not.toContain(CONTENT.creatureSheets.snippet);
+  });
+
+  it('draws the mirage 72 px below the snippet when both are captured', () => {
+    const both = shown({ snippet: 1, mirage: 2 }).calls;
+    const snippetOnly = shown({ snippet: 1, mirage: 0 }).calls;
+    const mirageOnly = shown({ snippet: 0, mirage: 1 }).calls;
+    // The first entry is what it was; the second is the mirage's, every call 72 px lower.
+    expect(both.slice(0, snippetOnly.length)).toStrictEqual(snippetOnly);
+    const lower = (call: string): string =>
+      call.replace(/,(\d+)$/, (_all, y: string) => `,${Number(y) + ENTRY_PITCH}`);
+    expect(both.slice(snippetOnly.length)).toStrictEqual(mirageOnly.map(lower));
+    expect(both[snippetOnly.length]).toBe(`drawSprite ${ENTRY_FRAME} at 16,104`);
+  });
+
+  it('fits the screen with both: no line starts below y = 162', () => {
+    const rows = shown({ snippet: 1, mirage: 1 }).calls.map((call) =>
+      Number(call.slice(call.lastIndexOf(',') + 1)),
+    );
+    expect(Math.max(...rows)).toBe(162);
+  });
+
+  it('reads `Mirage` in English', () => {
+    // `M` is glyph 45; the text starts with `A picture …`, `A` is glyph 33.
+    const { calls } = shown({ snippet: 0, mirage: 1 }, ENGLISH);
+    expect(calls[1]).toBe('drawSprite 45 at 40,35');
+    expect(calls[7]).toBe('drawSprite 33 at 16,54');
+  });
+});
```

  The other fixtures and literals:

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -104,7 +104,11 @@
   playerSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 },
   lampSheet: { image: {} as ImageBitmap, frameWidth: 48, frameHeight: 48 },
   lampWideSheet: { image: {} as ImageBitmap, frameWidth: 72, frameHeight: 72 },
-  creatureSheets: { snippet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 } },
+  creatureSheets: {
+    snippet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
+    // Its own image, so that toStrictEqual tells the two sheets apart.
+    mirage: { image: { mirage: true } as unknown as ImageBitmap, frameWidth: 16, frameHeight: 16 },
+  },
   overviewSheet: { image: {} as ImageBitmap, frameWidth: 8, frameHeight: 8 },
   shadowWallSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
   traceSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
@@ -207,7 +211,7 @@
   journal: null,
   help: false,
   held: NO_INPUT,
-  captured: { snippet: 0 },
+  captured: { snippet: 0, mirage: 0 },
   // No hearts: the call lists of the earlier features stay as they were (0009).
   overview: { current: 0, max: 0 },
   dark: 0,
```

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -72,7 +72,11 @@
   playerSheet: sheet(16, 24),
   lampSheet: sheet(48, 48),
   lampWideSheet: sheet(72, 72),
-  creatureSheets: { snippet: sheet(16, 16) },
+  creatureSheets: {
+    snippet: sheet(16, 16),
+    // Its own image, so that the two sheets can be told apart.
+    mirage: { ...sheet(16, 16), image: { mirage: true } as unknown as ImageBitmap },
+  },
   overviewSheet: sheet(8, 8),
   shadowWallSheet: sheet(16, 16),
   traceSheet: sheet(16, 16),
@@ -115,7 +119,7 @@
   journal: null,
   help: false,
   held: NO_INPUT,
-  captured: { snippet: 0 },
+  captured: { snippet: 0, mirage: 0 },
   overview: { current: 5, max: 5 },
   dark: 0,
   ...fields,
```

```diff
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -365,7 +365,7 @@
   const start: GameState = {
     ...createInitialState(ROOMS),
     creatures: [LEFT_HOME, VISITOR, NEIGHBOUR],
-    captured: { snippet: 2 },
+    captured: { snippet: 2, mirage: 0 },
   };
 
   it('starts with both walls standing', () => {
@@ -410,7 +410,7 @@
       shadowWalls: [{ wall: 1, lit: false, light: 0 }],
       creatures: [VISITOR, NEIGHBOUR],
     });
-    expect(clearRegion(start, 'sales', ROOMS).captured).toStrictEqual({ snippet: 2 });
+    expect(clearRegion(start, 'sales', ROOMS).captured).toStrictEqual({ snippet: 2, mirage: 0 });
   });
 
   it('removes the creatures of every area of a region with two', () => {
```

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -1488,14 +1488,14 @@
   it('leaves one creature when nothing was captured: the one whose home is (1224, 622)', () => {
     const solved = solve(ready);
     expect(solved.creatures.map((creature) => creature.home)).toStrictEqual([{ x: 1224, y: 622 }]);
-    expect(solved.captured).toStrictEqual({ snippet: 0 });
+    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 
   it('removes none when both snippets of Sales were captured before', () => {
     const corridor = start.creatures.slice(0, 1);
-    const solved = solve({ ...ready, creatures: corridor, captured: { snippet: 2 } });
+    const solved = solve({ ...ready, creatures: corridor, captured: { snippet: 2, mirage: 0 } });
     expect(solved.creatures).toStrictEqual(corridor);
-    expect(solved.captured).toStrictEqual({ snippet: 2 });
+    expect(solved.captured).toStrictEqual({ snippet: 2, mirage: 0 });
   });
 
   it('removes the shadow wall of Sales if it still stands, and no other', () => {
```

```diff
--- a/tests/unit/opening.test.ts
+++ b/tests/unit/opening.test.ts
@@ -186,7 +186,7 @@
       expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
       expect(state.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
     }
-    expect(state.captured).toStrictEqual({ snippet: 0 });
+    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 
   it('counts the key as not held: the world steps as without it, step for step', () => {
```

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -177,7 +177,7 @@
     journal: null,
     help: false,
     held: NO_INPUT,
-    captured: { snippet: 2 },
+    captured: { snippet: 2, mirage: 0 },
     overview: { current: 0, max: 3 },
     dark: 1,
   };
@@ -220,7 +220,7 @@
       journal: null,
       help: false,
       held: NO_INPUT,
-      captured: { snippet: 2 },
+      captured: { snippet: 2, mirage: 0 },
       overview: { current: 3, max: 3 },
       dark: 45,
     });
```

- [ ] **Step 2: Run them** — `npx vitest run`. Expected: FAIL, 41 tests: 16 of 47 in
  `creature.test.ts`, 16 of 91 in `state.test.ts`, 5 of 35 in `draw-journal.test.ts`, 2 of
  35 in `journal.test.ts`, 1 of 27 in `opening.test.ts` and 1 of 104 in `floor.test.ts`.
  Fourteen of them are older tests whose record now has a second count; twenty-seven are
  new. `npx tsc --noEmit` reports 31 errors. One new test is green already, and that is
  right: `freezes in the cone whether it is looked at or not` — the light freezes every
  creature, and that rule does not change. The two recordings pass before and after: they
  hash what they hashed.

- [ ] **Step 3: The species:**

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -48,8 +48,11 @@
   readonly used: boolean;
 }
 
-/** The creature species (world.md §4), in journal order. 0008 brings the first. */
-export const SPECIES = ['snippet'] as const;
+/**
+ * The creature species (world.md §4), in journal order. 0008 brings the first, 0032 the
+ * second.
+ */
+export const SPECIES = ['snippet', 'mirage'] as const;
 export type Species = (typeof SPECIES)[number];
 
 /** A creature still in the world (0008). */
```

- [ ] **Step 4: Its habits,** and what looked at means:

```diff
--- a/src/game/creature.ts
+++ b/src/game/creature.ts
@@ -2,7 +2,7 @@
 import { STEPS_PER_SECOND } from '../engine/loop';
 import { type NamedPoint, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { isFigurePoint } from './cast';
-import { inCone, lampCone, SPREAD } from './lamp';
+import { DIRECTIONS, inCone, lampCone, SPREAD } from './lamp';
 import { isRoutePoint } from './mover';
 import { WAKE_POINT } from './overview';
 import { BOX_HEIGHT, BOX_WIDTH } from './player';
@@ -17,8 +17,9 @@
 /**
  * The creatures (gameplay.md §2 and §3, feature 0008). A small creature rests until the figure
  * is near, comes straight toward it, freezes while the lamp's light is on it and is captured
- * when the light has been held for CAPTURE_STEPS steps without a break. Pure data and pure
- * functions: one creature, one step.
+ * when the light has been held for CAPTURE_STEPS steps without a break. Each species has its
+ * habits (0032): how near the figure must be, how fast it comes, and whether it moves only
+ * while nobody looks at it. Pure data and pure functions: one creature, one step.
  */
 
 /** Tune: four tiles. At this distance and beyond a creature rests. */
@@ -31,9 +32,35 @@
 export const CAPTURE_STEPS = 60;
 /** A creature's sprite is one tile, 16x16; its feet are the bottom centre. */
 export const CREATURE_SIZE = 16;
+/** Tune: six tiles. At this distance and beyond a mirage rests (0032). */
+export const MIRAGE_NOTICE_RADIUS = 96;
+/** Tune: three quarters of the figure's speed, 1 px per step (0032). */
+export const MIRAGE_SPEED_PX_PER_SECOND = 60;
 
-const STEP_DISTANCE = CREATURE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND;
+/** What a species does while the lamp is not on it. */
+export interface Habits {
+  /** At this distance from the figure's feet and beyond it rests. */
+  readonly noticeRadius: number;
+  /** How far it moves in one step, in pixels. */
+  readonly stepDistance: number;
+  /** Whether it moves only while it is not looked at. */
+  readonly shy: boolean;
+}
 
+/** A literal over the species, so a new species does not compile until it has its habits. */
+export const HABITS: Readonly<Record<Species, Habits>> = {
+  snippet: {
+    noticeRadius: NOTICE_RADIUS,
+    stepDistance: CREATURE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND,
+    shy: false,
+  },
+  mirage: {
+    noticeRadius: MIRAGE_NOTICE_RADIUS,
+    stepDistance: MIRAGE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND,
+    shy: true,
+  },
+};
+
 /** The centre of the sprite: the point the lamp is tested against. */
 export function bodyPoint(creature: CreatureState): Point {
   return { x: creature.x, y: creature.y - CREATURE_SIZE / 2 };
@@ -67,23 +94,47 @@
   );
 }
 
+/**
+ * Looked at (0032): the creature is in front of the figure and in its sight. With C the centre
+ * of the figure's collision box and B the creature's body point, the vector from C to B has a
+ * component above 0 along the figure's facing, and no opaque box lies on the line from C to B.
+ * A creature exactly beside the figure is not looked at. `map` is the map with the shadow
+ * walls standing, as for the lamp's light.
+ */
+export function isWatched(creature: CreatureState, player: PlayerState, map: TileMap): boolean {
+  const eye = { x: player.x, y: player.y - BOX_HEIGHT / 2 };
+  const body = bodyPoint(creature);
+  const direction = DIRECTIONS[player.facing];
+  const ahead = (body.x - eye.x) * direction.x + (body.y - eye.y) * direction.y;
+  return (
+    ahead > 0 &&
+    !sightBlocked(eye, body, { width: map.width, height: map.height, solids: map.opaque })
+  );
+}
+
 function clamp(value: number, min: number, max: number): number {
   return Math.min(Math.max(value, min), max);
 }
 
 /**
- * Not lit: the count starts again, and the creature moves toward the figure's feet when they are
- * closer than NOTICE_RADIUS and farther than TOUCH_DISTANCE — by 2/3 px, or by what is left to
- * TOUCH_DISTANCE. The figure's box against the solid boxes, X then Y, then the clamp to the map.
+ * Not lit: the count starts again. A shy creature that is looked at stands. Otherwise the
+ * creature moves toward the figure's feet when they are closer than its notice radius and
+ * farther than TOUCH_DISTANCE — by its step distance, or by what is left to TOUCH_DISTANCE.
+ * The figure's box against the solid boxes, X then Y, then the clamp to the map.
  */
 function approach(creature: CreatureState, player: PlayerState, map: TileMap): CreatureState {
+  const habits = HABITS[creature.species];
   const dx = player.x - creature.x;
   const dy = player.y - creature.y;
   const distance = Math.hypot(dx, dy);
-  if (distance >= NOTICE_RADIUS || distance <= TOUCH_DISTANCE) {
+  if (
+    distance >= habits.noticeRadius ||
+    distance <= TOUCH_DISTANCE ||
+    (habits.shy && isWatched(creature, player, map))
+  ) {
     return { ...creature, light: 0 };
   }
-  const reach = Math.min(STEP_DISTANCE, distance - TOUCH_DISTANCE);
+  const reach = Math.min(habits.stepDistance, distance - TOUCH_DISTANCE);
   const box = moveBox(
     {
       x: creature.x - BOX_WIDTH / 2,
@@ -173,5 +224,5 @@
 
 /** Nothing captured yet. A literal, so a new species does not compile until it is listed. */
 export function noCaptures(): Captured {
-  return { snippet: 0 };
+  return { snippet: 0, mirage: 0 };
 }
```

- [ ] **Step 5: Its entry** in the journal, and its sheet in the loader:

```diff
--- a/src/game/journal.ts
+++ b/src/game/journal.ts
@@ -41,6 +41,7 @@
 /** A literal over the species, so a new species does not compile until it has its entry. */
 export const ENTRY_TEXT: Readonly<Record<Species, EntryText>> = {
   snippet: { name: textKey('creature.snippet-name'), text: textKey('creature.snippet-text') },
+  mirage: { name: textKey('creature.mirage-name'), text: textKey('creature.mirage-text') },
 };
 
 /** The words of a region's line on the cases tab (0022): `Spuren: 1 von 5`. */
```

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -32,6 +32,7 @@
 const LAMP_SHEET_URL = '/sprites/lamp.png';
 const LAMP_WIDE_SHEET_URL = '/sprites/lamp-wide.png';
 const SNIPPET_SHEET_URL = '/sprites/snippet.png';
+const MIRAGE_SHEET_URL = '/sprites/mirage.png';
 const OVERVIEW_SHEET_URL = '/sprites/overview.png';
 /** The movers' sheets (0015): a person of look n is person-(n + 1).png. */
 const PERSON_SHEET_URLS = [
@@ -92,6 +93,11 @@
     creatureSheets: {
       snippet: {
         image: await loadImage(SNIPPET_SHEET_URL),
+        frameWidth: CREATURE_SIZE,
+        frameHeight: CREATURE_SIZE,
+      },
+      mirage: {
+        image: await loadImage(MIRAGE_SHEET_URL),
         frameWidth: CREATURE_SIZE,
         frameHeight: CREATURE_SIZE,
       },
```

- [ ] **Step 6: Run** `npx vitest run` — green, the two recordings among them, unchanged. Then
  `npm run check`: 1481 unit tests.

- [ ] **Step 7: Commit** — `Add the mirage, which moves only while nobody looks`. Body: the
  habits of a species are a table, so the third species brings numbers and no new branch.

---

### Task 4: The mirage in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `HABITS`, `isWatched` (Task 3).
- Produces: `creatureFrame(creature, tick, watched = false)`; the scene draws a shy creature
  that is looked at and not lit with frame 0.

- [ ] **Step 1: Write the failing tests** — one import, and one block at the end:

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -50,6 +50,7 @@
 import { GLYPH_WIDTH } from '../../src/render/font';
 import type { Renderer, SpriteSheet } from '../../src/render/renderer';
 import { LANGUAGES, TABLE, textOf } from '../../src/text/text';
+import { grassMap } from './grass-map';
 import { solidsOf } from './solids';
 
 /** A renderer that only records what it was asked to draw, one line per call. */
@@ -1831,3 +1832,101 @@
     expect(renderer.sheets).not.toContain(CONTENT.lampSheet);
   });
 });
+
+describe('the mirage in the scene (0032)', () => {
+  const mirage = (x: number, y: number, light = 0): CreatureState => ({
+    species: 'mirage',
+    x,
+    y,
+    light,
+    home: { x: 0, y: 0 },
+  });
+  const snippet = (x: number, y: number): CreatureState => ({
+    species: 'snippet',
+    x,
+    y,
+    light: 0,
+    home: { x: 0, y: 0 },
+  });
+  /** 20x12 cells of open floor; a strip of a shadow wall on the cells (5, 6) to (7, 6). */
+  const open: SceneContent = { ...CONTENT, map: grassMap(20, 12, { x: 100, y: 60 }) };
+  const walled: SceneContent = {
+    ...CONTENT,
+    map: grassMap(
+      20,
+      12,
+      { x: 100, y: 60 },
+      [],
+      [{ name: 'shadow:marketing', x: 80, y: 96, width: 48, height: 4 }],
+    ),
+  };
+  /** The figure at (100, 60) looks down, at a tick whose free frame is 1. */
+  const scene = (
+    creatures: readonly CreatureState[],
+    fields: Partial<GameState> = {},
+  ): GameState => ({
+    ...state({ x: 100, y: 60, facing: 'down' }),
+    tick: QUIET_TICK + 15,
+    creatures,
+    ...fields,
+  });
+  /** The frames drawn from a sheet, in the order they were drawn. */
+  const framesOf = (drawn: GameState, content: SceneContent, sheet: SpriteSheet): number[] => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, drawn, content);
+    const sprites = renderer.calls.filter((call) => call.startsWith('drawSprite'));
+    return sprites
+      .filter((_call, n) => renderer.sheets[n] === sheet)
+      .map((call) => Number(call.split(' ')[1]));
+  };
+
+  it('picks the frame by the light, the look and the tick', () => {
+    expect(creatureFrame(mirage(0, 0, 5), QUIET_TICK + 15, true)).toBe(2);
+    expect(creatureFrame(mirage(0, 0, 5), QUIET_TICK + 15, false)).toBe(2);
+    expect(creatureFrame(mirage(0, 0), QUIET_TICK + 15, true)).toBe(0);
+    expect(creatureFrame(mirage(0, 0), QUIET_TICK, true)).toBe(0);
+    expect(creatureFrame(mirage(0, 0), QUIET_TICK + 15, false)).toBe(1);
+    expect(creatureFrame(mirage(0, 0), QUIET_TICK, false)).toBe(0);
+    // Without the third argument it is the frame of 0008.
+    expect(creatureFrame(mirage(0, 0), QUIET_TICK + 15)).toBe(1);
+  });
+
+  it('draws a mirage ahead of the figure with frame 0, and one behind it with the free frame', () => {
+    const sheet = open.creatureSheets.mirage;
+    expect(framesOf(scene([mirage(100, 120)]), open, sheet)).toStrictEqual([0]);
+    expect(framesOf(scene([mirage(100, 30)]), open, sheet)).toStrictEqual([1]);
+    expect(framesOf(scene([mirage(100, 120), mirage(100, 30)]), open, sheet)).toStrictEqual([0, 1]);
+  });
+
+  it('draws a mirage in the light with frame 2, looked at or not', () => {
+    const sheet = open.creatureSheets.mirage;
+    expect(framesOf(scene([mirage(100, 120, 7), mirage(100, 30, 7)]), open, sheet)).toStrictEqual([
+      2, 2,
+    ]);
+  });
+
+  it('draws a snippet ahead of the figure as before: it flutters while it is looked at', () => {
+    const sheet = open.creatureSheets.snippet;
+    expect(framesOf(scene([snippet(100, 120)]), open, sheet)).toStrictEqual([1]);
+    expect(framesOf(scene([snippet(100, 120), mirage(100, 130)]), open, sheet)).toStrictEqual([1]);
+  });
+
+  it('counts a standing shadow wall as the step does: behind it a mirage is not looked at', () => {
+    const sheet = walled.creatureSheets.mirage;
+    const standing = scene([mirage(100, 120)], {
+      shadowWalls: [{ wall: 0, lit: false, light: 0 }],
+    });
+    expect(framesOf(standing, walled, sheet)).toStrictEqual([1]);
+    // With the wall lifted the figure sees it.
+    expect(framesOf(scene([mirage(100, 120)]), walled, sheet)).toStrictEqual([0]);
+  });
+
+  it('draws the creatures in array order, each from the sheet of its species', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, scene([snippet(100, 120), mirage(60, 120)]), open);
+    const creatures = renderer.sheets.filter(
+      (sheet) => sheet === open.creatureSheets.snippet || sheet === open.creatureSheets.mirage,
+    );
+    expect(creatures).toStrictEqual([open.creatureSheets.snippet, open.creatureSheets.mirage]);
+  });
+});
```

- [ ] **Step 2: Run them** — `npx vitest run tests/unit/draw-scene.test.ts`. Expected: FAIL, 3
  of 114 tests. `npx tsc --noEmit` reports six errors: `creatureFrame` takes two arguments.
  Three tests of the block are green already: the frame in the light, the snippet that
  flutters as before, and the order and the sheets of the creatures.

- [ ] **Step 3: The scene:**

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -2,13 +2,13 @@
 import { type Box, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { progressOf } from '../game/cases';
 import { type Figure, figuresIn, figuresOf } from '../game/cast';
-import { CREATURE_SIZE } from '../game/creature';
+import { CREATURE_SIZE, HABITS, isWatched } from '../game/creature';
 import { FRAME_APEX, LAMP_HEIGHT, WIDE_CONE, WIDE_FRAME_APEX } from '../game/lamp';
 import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
 import { DARK_STEPS } from '../game/overview';
 import { areasOf, shadowedAreas, shownVeil, veilOf } from '../game/region';
-import { LIFT_STEPS, wallsOf } from '../game/shadow';
+import { LIFT_STEPS, wallsOf, withWalls } from '../game/shadow';
 import {
   type CreatureState,
   FACINGS,
@@ -116,9 +116,15 @@
 export const FLUTTER_STEPS = 15;
 export const FROZEN_FRAME = 2;
 
-/** Frozen in the light: frame 2, still. Free: frames 0 and 1 in turn, by the state's tick. */
-export function creatureFrame(creature: CreatureState, tick: number): number {
-  return creature.light > 0 ? FROZEN_FRAME : Math.floor(tick / FLUTTER_STEPS) % 2;
+/**
+ * Frozen in the light: frame 2, still. Looked at, for a species that moves only while nobody
+ * looks (0032): frame 0, still. Otherwise frames 0 and 1 in turn, by the state's tick.
+ */
+export function creatureFrame(creature: CreatureState, tick: number, watched = false): number {
+  if (creature.light > 0) {
+    return FROZEN_FRAME;
+  }
+  return watched ? 0 : Math.floor(tick / FLUTTER_STEPS) % 2;
 }
 
 /** The top-left corner of a creature's frame on the surface: the feet are its bottom centre. */
@@ -446,11 +452,16 @@
     content,
   );
   drawFigures(renderer, state.figures, figures, (at) => at.y <= player.y, state, content);
+  // A shy creature holds still while it is looked at (0032): as in `update`, against the
+  // map with the walls standing. That map is built only when such a creature is there.
+  const shy = state.creatures.some((creature) => HABITS[creature.species].shy);
+  const sight = shy ? withWalls(content.map, walls, state.shadowWalls) : content.map;
   for (const creature of state.creatures) {
     const origin = creatureOrigin(creature, camera);
+    const watched = HABITS[creature.species].shy && isWatched(creature, player, sight);
     renderer.drawSprite(
       content.creatureSheets[creature.species],
-      creatureFrame(creature, state.tick),
+      creatureFrame(creature, state.tick, watched),
       origin.x,
       origin.y,
     );
```

- [ ] **Step 4: Run** `npx vitest run tests/unit/draw-scene.test.ts` — green, the tests of the
  creatures in the scene of 0008 unchanged. Then `npm run check`: 1487 unit tests.

- [ ] **Step 5: Commit** — `Hold a mirage still while it is looked at`. Body: the scene asks
  the same question as the step, against the same map, and builds that map only when a shy
  creature is there.

---

### Task 5: The mirages of the floor

**Files:**
- Modify: `tools/floor-layout.ts`, `public/maps/floor.tmj` (generated)
- Test: `tests/unit/floor.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: the species `mirage` (Task 3).
- Produces: `MIRAGES` in `tools/floor-layout.ts`; `floor.tmj` with the points 129 to 131,
  `mirage`, after the traces of 0028.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/floor.test.ts` the older tests
  change as the global constraints say, and one block is new, at the end:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -8,6 +8,7 @@
 import { type Box, EMPTY, type Point, parseTileMap, parseTileset } from '../../src/engine/tiled';
 import { CASES, isReady, progressOf } from '../../src/game/cases';
 import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
+import { isWatched, MIRAGE_NOTICE_RADIUS } from '../../src/game/creature';
 import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
 import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
@@ -31,6 +32,7 @@
   FURNITURE,
   floorJson,
   HORIZONTAL_WALLS,
+  MIRAGES,
   POSTS,
   REGION_AREAS,
   RESTS,
@@ -500,9 +502,9 @@
     ]);
     const json = floorJson();
     expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
-      Array.from({ length: 128 }, (_, i) => i + 1),
+      Array.from({ length: 131 }, (_, i) => i + 1),
     );
-    expect(json.nextobjectid).toBe(129);
+    expect(json.nextobjectid).toBe(132);
   });
 
   it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
@@ -948,7 +950,7 @@
       TABLE.map(([region], i) => [92 + i, `shadow:${region}`]),
     );
     expect(objects.slice(91, 99).some((object) => 'point' in object)).toBe(false);
-    expect(floor.points).toHaveLength(91);
+    expect(floor.points).toHaveLength(94);
   });
 
   it('builds the boxes from the doorway cells of the layout', () => {
@@ -1080,7 +1082,8 @@
 
   it('holds the point figure:officer after the rectangles, with the id 100', () => {
     expect(FIGURES).toStrictEqual([{ id: 'officer', at: OFFICER }]);
-    expect(floor.points.at(-1)).toStrictEqual({ name: 'figure:officer', ...OFFICER });
+    // The 91st point; the mirages of 0032 follow it.
+    expect(floor.points[90]).toStrictEqual({ name: 'figure:officer', ...OFFICER });
     const objects = floorJson().layers[3].objects;
     // The hundredth object; the traces of 0022 follow it.
     const hers = objects[99];
@@ -1228,7 +1231,7 @@
     );
     expect(objects.some((object) => 'point' in object)).toBe(false);
     expect(floor.rects.slice(8, 13).every((rect) => rect.name === 'trace:sales')).toBe(true);
-    expect(floor.points).toHaveLength(91);
+    expect(floor.points).toHaveLength(94);
   });
 
   it('lie in Sales, each on a desk with a screen whose chair stands on the cell below', () => {
@@ -1373,7 +1376,7 @@
     expect(wallsOf(floor.rects)).toHaveLength(8);
     // The five of 0022; the five of 0028 came later.
     expect(tracesOf(floor.rects)).toHaveLength(10);
-    expect(floor.points).toHaveLength(91);
+    expect(floor.points).toHaveLength(94);
   });
 
   it('give every room of a region its area, with exactly the cells of the room', () => {
@@ -1485,9 +1488,13 @@
     expect(solve(ready).solved).toStrictEqual([{ region: 'sales', at: 1005 }]);
   });
 
-  it('leaves one creature when nothing was captured: the one whose home is (1224, 622)', () => {
+  it('leaves one snippet when nothing was captured: the one whose home is (1224, 622)', () => {
     const solved = solve(ready);
-    expect(solved.creatures.map((creature) => creature.home)).toStrictEqual([{ x: 1224, y: 622 }]);
+    // The mirages of Marketing (0032) are at home in another region and stay.
+    expect(solved.creatures.map((creature) => creature.home)).toStrictEqual([
+      { x: 1224, y: 622 },
+      ...MIRAGES,
+    ]);
     expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 
@@ -1557,7 +1564,7 @@
     // The five of 0022; the five of 0028 came later.
     expect(tracesOf(floor.rects)).toHaveLength(10);
     expect(areas).toHaveLength(10);
-    expect(floor.points).toHaveLength(91);
+    expect(floor.points).toHaveLength(94);
   });
 
   it('lie each on a counter with a coffee machine, and the floor has no such tile without one', () => {
@@ -1641,16 +1648,13 @@
     );
   });
 
-  it('are the last five objects of the file, rectangles with the ids 124 to 128', () => {
+  it('are five rectangles with the ids 124 to 128, after the rests and before the mirages of 0032', () => {
     const objects = floorJson().layers[3].objects;
-    expect(objects).toHaveLength(128);
-    expect(objects.slice(123).map((object) => [object.id, object.name])).toStrictEqual(
+    expect(objects.slice(123, 128).map((object) => [object.id, object.name])).toStrictEqual(
       [124, 125, 126, 127, 128].map((id) => [id, 'trace:marketing']),
     );
-    expect(objects.slice(123).some((object) => 'point' in object)).toBe(false);
-    expect(floorJson().nextobjectid).toBe(129);
+    expect(objects.slice(123, 128).some((object) => 'point' in object)).toBe(false);
     expect(floor.rects).toHaveLength(36);
-    expect(floor.points).toHaveLength(91);
   });
 
   it('leave the 123 objects of 0027 and before exactly as they were', () => {
@@ -1804,13 +1808,15 @@
     expect([veilOf(cleared, 100, 70), veilOf(cleared, 5, 5)]).toStrictEqual([1, 2]);
   });
 
-  it('removes the shadow wall of Marketing, and no other and no creature', () => {
+  it('removes the shadow wall of Marketing and no other, and no snippet', () => {
     expect(regionsOf(ready).filter((region) => region === 'marketing')).toHaveLength(1);
     expect(regionsOf(marketing)).not.toContain('marketing');
     expect(regionsOf(marketing)).toContain('sales');
     expect(marketing.shadowWalls).toHaveLength(ready.shadowWalls.length - 1);
-    // No creature is at home in Marketing yet: its species comes with its own feature.
-    expect(marketing.creatures).toStrictEqual(ready.creatures);
+    // The mirages of 0032 are at home in Marketing and go with its shadow; the snippets stay.
+    expect(marketing.creatures).toStrictEqual(
+      ready.creatures.filter((creature) => creature.species === 'snippet'),
+    );
   });
 
   it('is followed by Sales: both solved in that order, seven of seven, both rooms clear', () => {
@@ -1916,3 +1922,142 @@
     expect(noticeOf(held)).toBe(NOTICE_SHADOW_TOO_DENSE);
   });
 });
+
+describe('the mirages of the floor (0032)', () => {
+  /** Cell and feet, in file order: the spec's table. */
+  const TABLE: readonly (readonly [number, number, Point])[] = [
+    [10, 67, { x: 168, y: 1080 }],
+    [38, 65, { x: 616, y: 1048 }],
+    [22, 75, { x: 360, y: 1208 }],
+  ];
+  const TALK: GameInput = { ...NO_INPUT, talk: true };
+  const start = createInitialState(floor);
+  const mirages = start.creatures.filter((creature) => creature.species === 'mirage');
+  const marketing = areasOf(floor.rects).filter((area) => area.region === 'marketing');
+  const standing = withWalls(floor, wallsOf(floor.rects), start.shadowWalls);
+
+  it('are the three of the table, the middle of a cell each', () => {
+    expect(MIRAGES).toStrictEqual(TABLE.map(([, , feet]) => feet));
+    expect(TABLE.map(([column, row]) => ({ x: 16 * column + 8, y: 16 * row + 8 }))).toStrictEqual([
+      ...MIRAGES,
+    ]);
+  });
+
+  it('are the last three objects of the file, points with the ids 129 to 131', () => {
+    const objects = floorJson().layers[3].objects;
+    expect(objects).toHaveLength(131);
+    expect(objects.slice(128).map((object) => [object.id, object.name])).toStrictEqual(
+      [129, 130, 131].map((id) => [id, 'mirage']),
+    );
+    expect(objects.slice(128).every((object) => 'point' in object)).toBe(true);
+    expect(floorJson().nextobjectid).toBe(132);
+    expect(floor.points.slice(91)).toStrictEqual(
+      TABLE.map(([, , feet]) => ({ name: 'mirage', ...feet })),
+    );
+  });
+
+  it('leave the 128 objects of 0028 and before exactly as they were', () => {
+    // SHA-256 over the first 128 objects, recorded from the generator before this feature.
+    const before = JSON.stringify(floorJson().layers[3].objects.slice(0, 128));
+    expect(createHash('sha256').update(before).digest('hex')).toBe(
+      '785fe89a847f7c06716adefdbcd3420bcf0c2277c8a8cc806268b33433679c0e',
+    );
+  });
+
+  it('give the floor six creatures: the three snippets, then the three mirages', () => {
+    expect(start.creatures.map((creature) => creature.species)).toStrictEqual([
+      'snippet',
+      'snippet',
+      'snippet',
+      'mirage',
+      'mirage',
+      'mirage',
+    ]);
+    expect(mirages.map((creature) => creature.home)).toStrictEqual([...MIRAGES]);
+    expect(start.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+  });
+
+  it('stand each on a free cell of Marketing that is reached on foot, at home in its area', () => {
+    expect(marketing).toHaveLength(1);
+    expect(mirages).toHaveLength(3);
+    for (const { home } of mirages) {
+      const column = Math.floor(home.x / 16);
+      const row = Math.floor(home.y / 16);
+      expect(floor.detail[cell(column, row)], `(${column}, ${row})`).toBe(EMPTY);
+      expect(floor.solids[cell(column, row)], `(${column}, ${row})`).toStrictEqual([]);
+      expect(blocked(boxAt(home)), `(${column}, ${row})`).toBe(false);
+      expect(reached(home), `(${column}, ${row})`).toBe(true);
+      expect(
+        marketing.some((area) => inArea(area, home)),
+        `(${column}, ${row})`,
+      ).toBe(true);
+    }
+  });
+
+  it('are at least 96 px from every cell of the doorway of Marketing', () => {
+    // The doorway cells (23, 58) to (25, 58): the pixels [368, 416) × [928, 944).
+    expect(mirages).toHaveLength(3);
+    for (const { home } of mirages) {
+      const dx = Math.max(368 - home.x, 0, home.x - 416);
+      const dy = Math.max(928 - home.y, 0, home.y - 944);
+      expect(Math.hypot(dx, dy), `(${home.x}, ${home.y})`).toBeGreaterThanOrEqual(
+        MIRAGE_NOTICE_RADIUS,
+      );
+    }
+  });
+
+  it('rest while the figure stands in the doorway, whichever way it looks', () => {
+    for (const facing of ['down', 'up', 'left', 'right'] as const) {
+      const entered: GameState = {
+        ...start,
+        player: { ...start.player, x: 392, y: 956, facing },
+      };
+      const next = update(entered, NO_INPUT, floor);
+      expect(next.creatures.slice(3), facing).toHaveLength(3);
+      expect(next.creatures.slice(3), facing).toStrictEqual(mirages);
+    }
+  });
+
+  it('come from behind while the figure looks at a screen of the lower row or at the printer', () => {
+    // Above the left screen of the first island of the lower row, and above the printer.
+    for (const [x, y] of [
+      [88, 1116],
+      [440, 1244],
+    ] as const) {
+      const player = { ...start.player, x, y, facing: 'down' } as const;
+      const near = mirages.filter(
+        (creature) => Math.hypot(creature.x - x, creature.y - y) < MIRAGE_NOTICE_RADIUS,
+      );
+      expect(near, `(${x}, ${y})`).toHaveLength(1);
+      expect(near.map((creature) => isWatched(creature, player, standing))).toStrictEqual([false]);
+      const next = update({ ...start, player }, NO_INPUT, floor);
+      const moved = next.creatures.filter(
+        (creature, n) =>
+          creature.x !== start.creatures[n]?.x || creature.y !== start.creatures[n]?.y,
+      );
+      expect(moved.map((creature) => creature.home)).toStrictEqual(near.map((c) => c.home));
+    }
+  });
+
+  it('go with the shadow of Marketing when its case is solved: none is captured, the snippets stay', () => {
+    const routes = routesOf(floor.points);
+    const source = start.movers.find((mover) => routes[mover.route]?.name === 'person:marketing');
+    const ready: GameState = {
+      ...start,
+      tick: 1000,
+      player: { ...start.player, x: source?.x ?? 0, y: (source?.y ?? 0) + 24 },
+      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+    };
+    const solved = [TALK, NO_INPUT, TALK, NO_INPUT, TALK].reduce(
+      (state, input) => update(state, input, floor),
+      ready,
+    );
+    expect(solved.solved).toStrictEqual([{ region: 'marketing', at: 1005 }]);
+    expect(solved.creatures.map((creature) => creature.species)).toStrictEqual([
+      'snippet',
+      'snippet',
+      'snippet',
+    ]);
+    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+  });
+});
```

  In the smoke spec the floor starts with six creatures:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -183,13 +183,15 @@
   await page.keyboard.up('Space');
 });
 
-test('the floor starts with three snippets and nothing captured', async ({ page }) => {
+test('the floor starts with three snippets and three mirages, and nothing captured', async ({
+  page,
+}) => {
   await start(page);
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.creatures.length), {
-      message: 'window.shadowAi.state.creatures holds the three snippets of the floor',
+      message: 'window.shadowAi.state.creatures holds the six creatures of the floor',
     })
-    .toBe(3);
+    .toBe(6);
   const state = await page.evaluate(() => window.shadowAi?.state);
   expect(state?.creatures[0]).toStrictEqual({
     species: 'snippet',
@@ -198,7 +200,15 @@
     light: 0,
     home: { x: 1224, y: 622 },
   });
-  expect(state?.captured).toStrictEqual({ snippet: 0 });
+  expect(state?.creatures.map((creature) => creature.species)).toStrictEqual([
+    'snippet',
+    'snippet',
+    'snippet',
+    'mirage',
+    'mirage',
+    'mirage',
+  ]);
+  expect(state?.captured).toStrictEqual({ snippet: 0, mirage: 0 });
 });
 
 test('the floor starts with its 22 movers and draws the person of the reception', async ({
```

- [ ] **Step 2: Run them** — `npx vitest run tests/unit/floor.test.ts`. Expected: FAIL, 13 of
  113 tests: six older ones that count the objects, the points or the creatures, and seven
  of the new block. `npx tsc --noEmit` reports one error: `floor-layout.ts` has no exported
  member `MIRAGES`. Five tests of the diff are green already, and that is right: the digest
  over the first 128 objects guards what must not change; solving Marketing leaves the
  three snippets before as after; and three older tests now look at a slice or at what is
  left, which holds both ways. Then `npx playwright test -g "three mirages"`. Expected:
  FAIL, `Expected: 6`, `Received: 3`.

- [ ] **Step 3: The layout.** `MIRAGES`, and the generator writes them at the end:

```diff
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -173,6 +173,18 @@
   { x: 1224, y: 622 },
   { x: 1416, y: 526 },
   { x: 1576, y: 718 },
+];
+
+/**
+ * The mirages (0032), feet in pixels: the middles of the tiles (10, 67), (38, 65) and (22, 75)
+ * of Marketing — two between the rows of desk islands, one in the lower part of the room.
+ * They are written at the end of the file, so that no object of an earlier feature changes
+ * its id.
+ */
+export const MIRAGES: readonly Point[] = [
+  { x: 168, y: 1080 },
+  { x: 616, y: 1048 },
+  { x: 360, y: 1208 },
 ];
 
 /** Where the figure wakes (0009), feet in pixels: the middle of tile (18, 31), in the data protection officer's office. */
@@ -1209,6 +1221,7 @@
   const firstRest = firstArea + REGION_AREAS.length;
   const firstLaterTrace = firstRest + RESTS.length;
   const laterTraces = TRACES.slice(FIRST_TRACES);
+  const firstMirage = firstLaterTrace + laterTraces.length;
   return {
     compressionlevel: -1,
     height: FLOOR_HEIGHT,
@@ -1246,6 +1259,7 @@
           ...laterTraces.map((trace, i) =>
             rectObject(firstLaterTrace + i, `trace:${trace.region}`, traceBox(trace.cell)),
           ),
+          ...MIRAGES.map((feet, i) => pointObject(firstMirage + i, 'mirage', feet)),
         ],
         opacity: 1,
         type: 'objectgroup',
@@ -1255,7 +1269,7 @@
       },
     ],
     nextlayerid: 5,
-    nextobjectid: firstLaterTrace + laterTraces.length,
+    nextobjectid: firstMirage + MIRAGES.length,
     orientation: 'orthogonal',
     renderorder: 'right-down',
     tiledversion: '1.11.2',
```

- [ ] **Step 4: Regenerate the floor** — `npm run gen-floor`. Then
  `shasum -a 256 public/maps/floor.tmj` gives
  `e1922ddc5fda323157d3169f3a7e8e6f1c4ac428369c2d0c429a3f3994564ef9`, and
  `git diff --stat public/maps/floor.tmj` says 37 insertions and 1 deletion: three points at
  the end of the `objects` layer and `nextobjectid`. If the diff touches anything else,
  stop.

- [ ] **Step 5: Run** `npx vitest run tests/unit/floor.test.ts` — green — then
  `npm run check`: 1496 unit tests, and `npm run test:e2e` twice: 18 passed, 3 skipped, both
  times.

- [ ] **Step 6: Commit** — `Put three mirages into Marketing`. Body: none stands near the
  doorway, and one comes from behind while the player looks at a screen of the lower row or
  at the printer.

---

### Task 6: The documents

**Files:**
- Modify: `docs/spec/world.md`, `docs/spec/gameplay.md`, `docs/spec/visual.md`,
  `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md`

The diffs are against `main` at `786e991`. If a line has moved, put the text where the diff
means it; do not change the words without a reason. `architecture.md` changes in §1 too,
beyond the sections the spec names: its directory listing names the generators.

- [ ] **Step 1: `world.md`** §4:

```diff
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -258,6 +258,18 @@
 that it goes as soon as everyone knows which data may go where. The name is a dictionary word
 for a scrap of paper, used for a species and not for a product, a company or a tool; it is fixed
 by the author's decision on that basis, and no trademark register was searched (§5).
+
+**The mirage** (*Trugbild*, feature 0032) is the species of the Marketing case: a small framed
+portrait of nobody, because it feeds on pictures a machine made and nobody checked. Small,
+layer 1. It moves only while nobody looks at it: looked at, it stands; not looked at, it comes
+at the figure from as far as six tiles, faster than a snippet. The lamp freezes and captures it
+like every creature. Its weakness is the countermeasure of its case — somebody looks. Three
+stand in Marketing, on the cells (10, 67), (38, 65) and (22, 75): none near the doorway, and
+placed so that one comes from behind while the player looks at a screen of the lower row or at
+the printer. All three have their home in the region's area and leave the game when the case of
+Marketing is solved (feature 0025). Its displayed name is *Trugbild*, in English *Mirage*:
+dictionary words for a false picture, used for a species and not for a product; fixed by the
+author's decision on that basis, and no trademark register was searched (§5).
 
 ## 5. Names
 
```

- [ ] **Step 2: `gameplay.md`** §3 and §7:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -96,6 +96,15 @@
 region's shadow wall if it still stands. A creature whose home is outside the region stays,
 wherever it is at that moment: the snippet of the east corridor is still there after Sales.
 
+**As built** (feature 0032): the mirage is the second small creature, and it does not come as
+the snippet does. It moves only while it is not looked at — while it is not ahead of the figure,
+or something opaque stands between them. Looked at, it stands at any distance; not looked at, it
+comes straight at the figure from closer than six tiles, at three quarters of the figure's
+speed, and stops at its feet. Ahead is half of the map: everything in front of the figure, by
+its facing. So one mirage is harmless while the player faces it, and two are a problem: finding
+a trace means looking at a screen with the back to the room. In the light it is frozen and
+captured like the snippet, and it hits like the snippet.
+
 ## 4. Overview
 
 Health is called **overview**. Hits from creatures take it. At zero the player is in the dark and
@@ -235,6 +244,10 @@
 solved first. The policy tab shows the two blocks in the order they were solved, the second
 60 px below the first.
 
+**As built** (feature 0032): with a second species the creatures tab shows two entries, the
+second 72 px below the first, in the order of the species — the snippet, then the mirage —
+whichever was captured first. Two entries fit the screen; pages come with the third species.
+
 **As built** (feature 0026): the journal does not open while the call is read, like under any
 dialogue. After it, J opens it with or without the lamp.
 
```

- [ ] **Step 3: `visual.md`** §4:

```diff
--- a/docs/spec/visual.md
+++ b/docs/spec/visual.md
@@ -107,14 +107,16 @@
 **The signature colour.** One violet of the palette, `#68386c`, is reserved for the shadow and
 for nothing else in the world; the asset test rejects it in every PNG under `public/` except the
 shadow assets, a list in the test: `sprites/snippet.png` (feature 0008),
-`sprites/shadow-wall.png` (feature 0014), `sprites/trace.png` (feature 0022) and
-`sprites/shadow-veil.png` (features 0023 and 0025).
+`sprites/shadow-wall.png` (feature 0014), `sprites/trace.png` (feature 0022),
+`sprites/shadow-veil.png` (features 0023 and 0025) and `sprites/mirage.png` (feature 0032).
 Every trace of shadow AI glows in
 it. The player learns in seconds what to look for, without a word of text. Because colour alone
 excludes colour-blind players, the signature colour is always accompanied by **form and
 motion** — flicker, dithering — so the shadow is unmistakable without it. The snippet carries
 the colour on its border and its lines of text, and it bobs while it is free — form and motion —
-and stands still in the light.
+and stands still in the light. The mirage (feature 0032) carries it on its frame and on the head
+and shoulders of the portrait in it; it sways one pixel to the side while nobody looks at it,
+holds still while it is looked at, and turns white in the light.
 
 The shadow wall (feature 0014) is the second shadow asset: a dithered strip 4 px thick in the
 signature colour, with `#181425` for the pattern of the densest wall. Its density is read from how
```

- [ ] **Step 4: `architecture.md`** §1, §2, §5 and §7:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -58,6 +58,7 @@
                         frame per facing, and the wider cone, one 72x72 frame per facing
                         (0029), drawn from game/lamp
   placeholder-snippet.ts the placeholder snippet sheet as pure data: three 16x16 frames
+  placeholder-mirage.ts the placeholder mirage sheet as pure data: three 16x16 frames (0032)
   placeholder-overview.ts the placeholder overview sheet as pure data: two 8x8 frames,
                         a full and an empty heart
   placeholder-person.ts the placeholder colleagues: the figure's frames in four other shirts,
@@ -190,6 +191,17 @@
 map. `createInitialState` makes the creatures from `map.points` and rejects a name that is no
 species.
 
+Each species has its **habits** (feature 0032, `HABITS` in `game/creature`): the radius at
+which it notices the figure, the distance of one step, and whether it is **shy** — whether it
+moves only while it is not looked at. The snippet: 64 px, 2/3 px, not shy. The mirage: 96 px
+(`MIRAGE_NOTICE_RADIUS`), 1 px, shy. A creature is **looked at** (`isWatched`) when the vector
+from the figure's box centre (x, y − 4) to its body point has a component above 0 along the
+figure's facing, and no opaque box lies on that line — the line of the light, against the same
+map, the one with the walls standing. A shy creature that is looked at and not lit stands, with
+`light` 0; otherwise it moves by the rule above with its own numbers. `SPECIES` is
+`['snippet', 'mirage']`, so `captured` has two counts. Whether a creature is looked at is
+derived in every step and every frame and is not in the state.
+
 `overview` is `{ current, max }`, 5 of 5 at the start (feature 0012); `dark` is 0 while the game runs (feature
 0009). The order of a step in `update`: the lamp is on when the input holds it and the figure is
 not being pushed; the figure is stepped — `grace` drops by 1, not below 0, and a pushed figure
@@ -520,7 +532,10 @@
 `lampWideSheet` instead, at the same place in the order, its 72x72 frame placed by
 `WIDE_FRAME_APEX` — down (36, 0), up (36, 71), left (71, 36), right (0, 36) — in the same way
 (`lampFrameOrigin(player, camera, apexes)`). A creature's frame has its top-left corner at (round(x) − 8 − camera.x, round(y) − 16 −
-camera.y); its frame is 2 while `light` is above 0, else ⌊tick / 15⌋ mod 2 (feature 0008).
+camera.y); its frame is 2 while `light` is above 0, else ⌊tick / 15⌋ mod 2 (feature 0008). A
+shy creature that is looked at and not lit shows frame 0 and holds still (feature 0032,
+`creatureFrame(creature, tick, watched)`); the scene asks `isWatched` against the map with the
+walls standing, as `update` does, and builds that map only when a shy creature is in the state.
 
 The shadow walls (feature 0014) lie on the floor like the cone, under every figure. A wall whose
 box is (x, y, w, h) is drawn in 16 px segments from the corner of its box: a horizontal wall
@@ -1002,6 +1017,12 @@
 `npm run gen-sprites` writes it beside the other two; it is committed, deterministic and tested
 against the generator. The art pass replaces it under the same name and frame order.
 
+`tools/placeholder-mirage.ts` draws the mirage sheet (feature 0032) the same way:
+`public/sprites/mirage.png`, 48x16, three 16x16 frames in one row — a framed portrait, the same
+one pixel to the right, and the same with a white ground. The frame, columns 3–12 and rows
+2–13, a head and shoulders are `#68386c`, the ground `#c0cbdc`, the lit ground `#ffffff`; 120
+opaque pixels per frame, 72 of them the signature colour.
+
 `tools/placeholder-overview.ts` draws the overview sheet (features 0009, 0012) and returns its
 pixels as data: `public/sprites/overview.png`, 16x8, two 8x8 frames in one row — a heart 7 wide
 and 7 high, 34 opaque pixels, with a rim of 16 in `#181425`, inside 18 in `#e43b44` for the full
@@ -1106,7 +1127,9 @@
 box. The first five (`FIRST_TRACES`), those of 0022, become rectangle objects after the figure's
 point, ids 101–105. Every later trace is written at the end of the file, after the areas and
 the rests, so that no object of an earlier feature changes its id: the five of Marketing
-(feature 0028) have the ids 124–128, and `nextobjectid` is 129.
+(feature 0028) have the ids 124–128. The mirages (feature 0032) are `MIRAGES`, their feet in
+pixels; they become three point objects named `mirage` after those traces, ids 129–131, and
+`nextobjectid` is 132.
 `floor.tmj` has the layers `ground` (id 1), `detail` (id 3), `above` (id 4) and `objects` (id 2),
 in that order. Posts are
 derived, not listed: a cell with no strip whose left neighbour has a top strip and whose upper
```

- [ ] **Step 5: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -24,7 +24,7 @@
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
 | INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
 | INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
-| INV-6 palette | the asset tests: palette, the reserved colour and its four shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022) and the veil sheet with its five frames (0023, 0025) —, the wider cone's sheet with every other PNG (0029), the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
+| INV-6 palette | the asset tests: palette, the reserved colour and its five shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022), the veil sheet with its five frames (0023, 0025) and the mirage sheet (0032) —, the wider cone's sheet with every other PNG (0029), the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
 | INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); `game/rest` refuses a rest that is not one cell, with its message, and a test holds the floor's eight rests to its coffee machines, none without a rest (0027); a test holds the floor's five traces of Marketing to the spec's table — each in the area of Marketing, on a desk with a screen or on the printer, and in the light from every reached place on the cell above — and the 123 objects of the floor before them to a recorded SHA-256 digest, so that no object of an earlier feature changes (0028); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
 
 A change to the state's shape is held against a recording: 600 steps on the floor with walking,
@@ -36,6 +36,9 @@
 differently. A feature that only adds content leaves both as they are: with the second case
 (0028) a state in which no trace of Marketing is found steps as before. So does a state
 without an upgrade (0029): the cone's spread and the lamp's strength are then what they were.
+A recording hashes what was recorded and no more: since the second species (0032) the two
+tests hash the snippets among the creatures and the count of the snippet, so three mirages
+that rest in Marketing do not change a digest that was taken before they existed.
 
 ## 3. Test first
 
```

- [ ] **Step 6: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -55,6 +55,8 @@
 shirt is the source of the second case; the two cases can be solved in either order (feature
 0028). Solving the case of Marketing earns the first upgrade of the lamp: the cone is one and
 a half times as wide, and the shadow walls of HR and Accounting give way to it (feature 0029).
+Marketing has a creature of its own: the mirage, a framed picture that moves only while nobody
+looks at it (feature 0032).
 Every merge to `main` is deployed to Cloud Run (feature 0030).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
@@ -68,7 +70,7 @@
 npm run check        # typecheck, lint, build and the headless tests
 npm run test:e2e     # the smoke test against the dev server
 npm run gen-tiles    # regenerate the placeholder tiles under public/tiles/
-npm run gen-sprites  # regenerate the placeholder figure, the lamp and its wider cone, snippet, overview, movers', shadow-wall, font and officer sheets under public/sprites/
+npm run gen-sprites  # regenerate the placeholder figure, the lamp and its wider cone, snippet, mirage, overview, movers', shadow-wall, font and officer sheets under public/sprites/
 npm run gen-floor    # regenerate the floor map with its creatures and the wake point under public/maps/
 ```
 
```

- [ ] **Step 7:** `npm run check`, then commit — `Move the mirage into the spec`.

---

### Task 7: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green: 18 passed, 3 skipped.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [ ] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [ ] **Step 5:** tick the boxes of Tasks 1 to 7 in this file and commit —
  `Tick the full check of 0032`.

---

### Task 8: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, arrow
  keys or WASD to walk, `Space` for the lamp, `J` for the journal — and that the game opens
  with the call (0026): the call is read and the lamp fetched from the data protection
  officer next door before step 1 of the plan. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–14 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 7, and start again at step 1.
- [ ] **Step 4:** after step 14 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–14`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0032`. A feel note that wants something
  else — another speed, another number, a narrower look — becomes a new draft, not a change
  on this branch. The spec marks the numbers *tune*: say so when the author asks for one.

---

### Task 9: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 7. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4, in the M6 section, say that 0032 is
  implemented and the other six are approved. Commit — `Mark 0032 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0032: the creature of Marketing`, with the walk's result and feel notes in its
  description. The pull request also carries the seven specs 0032 to 0038, which were
  drafted and approved on this branch. CI must be green. The author merges.
