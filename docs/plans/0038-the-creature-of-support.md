# 0038 — Implementation plan: the creature of Support

**Spec:** [`docs/features/0038-the-creature-of-support.md`](../features/0038-the-creature-of-support.md)
(approved 2026-11-19, its names corrected the same day). The plan argues from the spec; where
they differ, the spec wins. Read the spec first, then `CLAUDE.md`, then `docs/spec/world.md`
§4, `docs/spec/gameplay.md` §3, §6 and §7, `docs/spec/architecture.md` §2, §5, §6 and §7,
`docs/spec/visual.md` §4 and `docs/spec/testing.md` §5. **Written:** 2026-11-19 on the
planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0039 is merged into `main` (`20b56bc`). The branch
`feature/0038-the-creature-of-support` exists, cut from that `main`. It holds one commit that
corrects the names in the spec, and this plan. Work on it; merge the latest `main` into it
before Task 1.

**Goal:** Support has a creature of its own, the lurker. It sits in a window that is open on
a screen, where the lamp does not hold it; a press of `E` closes the window, the lurker drops
to the floor and is captured like a snippet. Two of the five traces of Support lie under such
a window. With a third species the journal's creatures tab gets pages.

**The one thing to know before anything else — the name.** The thing is a window on a
screen, and the game's text says so. In `src/game/`, in the state and in the map it is a
**pane**. The architecture test (INV-2) runs over the source text of `src/game/` and reports
the browser name `window` wherever it stands as a word: in an identifier, in a comment, in a
string, in a text id. That test is not changed. So: no file, no identifier, no comment and
no text id in `src/game/` holds the word `window`. Write `pane`. The plural `windows` and
longer words are not reported, but do not lean on that: write `panes`. Files outside
`src/game/` may say window in prose; identifiers there follow the game's names
(`PANE_FRAME`, `PANES`, `paneInk`).

**Approach:** nine code tasks, each green on its own, in three groups. *The species:* the
words (T1); the sheet with its generator (T2); the species in the state, in the creature's
habits and in the journal (T3). *The journal:* pages on the creatures tab (T4) — it needs
three species to have a second page. *The panes:* reading them from a map and holding them in
the state (T5) — a map has panes that do nothing yet; an open pane hides its trace and holds
against the light, with its notice (T6); a press closes one and its lurker drops, and a
solved case takes the open ones along (T7); the scene draws an open pane (T8); the three
panes of the floor (T9) — only then the game has any. Then the documents (T10), the full
check with the container (T11), the walk (T12) and the pull request (T13).

**How this plan was checked:** the code and the tests of Tasks 1 to 9 were run once as a
prototype on 2026-11-19 and then replayed task by task, each task's tests before its code:
they failed as the steps say, and after each of the nine tasks typecheck and Biome were clean
and the unit tests green — 1611, 1620, 1625, 1643, 1661, 1669, 1683, 1689 and 1700 tests (1610
before). The blocks of this file, applied in order to a clean tree, with
`npm run gen-sprites` after the generator and `npm run gen-floor` after the layout, gave the
prototype's files; the generated `lurker.png` has the SHA-256
`b80eade42f32b5a972985199c1a577b3f294bdb625cb899a7d0c261e036e93df` and the generated
`floor.tmj` `b3d80959c8ebd1b04fa8cda933e8f0839cd8278ecfed33898f7fa638b715f408`. `npm run check`
with the build passed on the whole prototype, and the smoke spec passed twice against a dev
server of it: 21 passed, 3 skipped. The new smoke test was run once before the code of Task 9 and
failed, and once with that code and passed. The prototype was thrown away; nothing of it is
on the branch. If a step does not behave as written, the cause is a difference to that state
— stop and look; do not bend a test. The game was **not** played in a browser — that is the
walk — and the container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `GameState.panes` is plain data, `{ pane, lit }` per open pane; `JournalState` gets
  `page`. Nothing else is added to the state. A lurker in its pane is not in the state as a
  creature: it is one only once the pane is closed.
- INV-2: see **the name** above. `game/pane` imports the engine, `game/lamp`, `game/player`,
  `game/rects`, `game/trace`, `game/world` and the types of the state; nothing of `render/`.
- INV-4: three new keys and one changed page in both tables; code holds keys. The notice's
  key is `notice.pane-open`.
- INV-6: `public/sprites/lurker.png` is generated by `npm run gen-sprites`, never edited by
  hand. It is the sixth shadow asset: the list is in `tests/unit/assets.test.ts`.
- INV-7: no coordinate of a pane is in `src/`. `tools/floor-layout.ts` holds the cells, and
  `public/maps/floor.tmj` is generated by `npm run gen-floor`. The three rectangles are
  written at the end of the file with the ids 138 to 140; `nextobjectid` is 141; a test holds
  the 137 objects before them to a recorded digest.
- **The order of a press of `E`:** a talk, then a pane, then a coffee. With a colleague in
  reach the talk opens and the pane stays open — the tests on the floor take the movers out
  of the state for that reason.
- **The lurker on the floor is a snippet with another face:** `HABITS.lurker` has the
  snippet's numbers. No rule of a creature changes.
- **An open pane is not a creature.** It cannot be frozen, captured or hit, and it does not
  hit. The light on it only sets `lit`.
- **`stepTraces` gets the cells of the open panes** as a last argument with the default `[]`:
  every call of an earlier feature stays as it is.
- **Every full literal of the state gets the field** `panes: []` before `rested: null` — ten
  literals in five test files (Task 5). **Every literal of the captures gets** `lurker: 0` —
  50 literals (Task 3). **Every literal of the open journal gets** `page: 0` — 34 literals
  (Task 4). The plan shows the results as diffs; the same replacement by a script gives them.
- **The two recorded digests of 600 steps** (`RECORDED` in `tests/unit/journal.test.ts` and
  in `tests/unit/help.test.ts`) are never recorded again. The one of the help hashes the open
  journal as its tab from Task 4 on, as it was recorded — criterion 19.
- **The architecture test** has one test per file of `src/game/`: the new `pane.ts` adds one
  test to the count of Task 5.
- **Glyphs:** a space is not drawn; the frame of a character is its code minus 32. `1` is
  17, `2` 18, `v` 86, `o` 79, `n` 78, `f` 70, `M` 45, `L` 44, `E` 37.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`.
- What is out of the spec is not built: no second medium creature, no pages on the cases tab
  or the policy tab, no pane that opens again, no pane in another department, no sound.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox; if signing fails, retry once, then stop and ask — never
  pass `--no-gpg-sign`), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`. Do not stop a dev server that is
  not yours. Push nothing before the walk has passed.
- The numbers, verbatim from the spec: the panes on the cells (72, 61), (93, 67) and
  (62, 73), their drop points (1192, 1000), (1528, 1096) and (1032, 1192); the reach of a
  pane 40 px; the lurker's sheet 64x16 with four frames, the pane's frame 3; pages of two
  entries; the mark of the page right-aligned to x = 304 on the line y = 35.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | three keys, one changed page |
| `tools/placeholder-lurker.ts` | new: the sheet as pure data |
| `tools/gen-sprites.ts`, `public/sprites/lurker.png` | `encodeLurkerPng`; the sheet, generated |
| `src/game/state.ts` | `SPECIES` with `lurker`; `JournalState.page`; `PaneState`; `GameState.panes` |
| `src/game/creature.ts`, `src/game/journal.ts`, `src/main.ts` | the habits, the entry, the sheet of the species; the pages of the tab |
| `src/render/draw-journal.ts` | the entries of the open page; the mark of the page |
| `src/game/rects.ts` | `PANE_PREFIX` |
| `src/game/pane.ts` | new: `panesOf`, `dropPoint`, `openPanes`, `restedPanes`, `coveredCells`, `stepPanes`, `paneInReach`, `closePane` |
| `src/game/update.ts`, `src/game/overview.ts`, `src/game/trace.ts`, `src/game/notice.ts`, `src/game/cases.ts` | the panes in the step, the wake, the traces, the notices and a solved case |
| `src/render/draw-scene.ts` | `PANE_FRAME`; an open pane on its cell |
| `tools/floor-layout.ts`, `public/maps/floor.tmj` | `PANES`; the map, generated |
| `tests/unit/lurker.test.ts`, `tests/unit/pane.test.ts` | new |
| other tests | as the tasks say |
| `docs/spec/*`, `README.md` | Task 10 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `notice.pane-open`, `creature.lurker-name`, `creature.lurker-text`;
  new words for `talk.intern-support-traces`.

- [x] **Step 1: Write the failing tests:**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -372,15 +372,16 @@
       'corridor. They answer mails in eleven',
       'languages – ask yourself how.',
     ]);
+    // Since 0038 this page says what to do at a screen: close the window that is open on it.
     expect(lines('talk.intern-support-traces', 'de')).toStrictEqual([
       'Im Support sind es wieder die Bildschirme.',
-      'Drei Reihen, und in jeder sitzt jemand, der',
-      'gerade etwas übersetzen lässt.',
+      'Auf manchen ist ein Fenster offen, das keiner',
+      'aufgemacht hat – mach es ruhig zu.',
     ]);
     expect(lines('talk.intern-support-traces', 'en')).toStrictEqual([
-      'In Support it is the screens again. Three',
-      'rows, and in each somebody is having',
-      'something translated right now.',
+      'In Support it is the screens again. On some',
+      'a window is open that nobody opened – go',
+      'ahead and close it.',
     ]);
     expect(lines('talk.intern-support-source', 'de')).toStrictEqual([
       'Oranges Hemd, läuft zwischen den Tischen und',
@@ -391,6 +392,33 @@
       'Orange shirt, walks between the desks and the',
       'printer. Forty tickets before the first',
       'coffee – ask about the languages.',
+    ]);
+  });
+
+  it('holds the words of the lurker in both languages (0038)', () => {
+    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
+      textOf(textKey(id), language).split('\n');
+    expect(lines('notice.pane-open', 'de')).toStrictEqual([
+      'Hier liest etwas mit. Das Licht hält es nicht.',
+    ]);
+    expect(lines('notice.pane-open', 'en')).toStrictEqual([
+      'It reads along here. The light does not hold it.',
+    ]);
+    expect([
+      lines('creature.lurker-name', 'de'),
+      lines('creature.lurker-name', 'en'),
+    ]).toStrictEqual([['Mitleser'], ['Lurker']]);
+    expect(lines('creature.lurker-text', 'de')).toStrictEqual([
+      'Eine Erweiterung im Browser, die jemand',
+      'installiert hat und die seither alles mitliest.',
+      'Solange ihr Fenster offen ist, hält sie kein',
+      'Licht – sie geht, wenn nur Freigegebenes läuft.',
+    ]);
+    expect(lines('creature.lurker-text', 'en')).toStrictEqual([
+      'A browser extension somebody installed, which',
+      'has read everything along ever since. While',
+      'its window is open no light holds it – it',
+      'goes when only approved tools are running.',
     ]);
   });
 
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL,
  2 of 36 tests: the new test, and the test of the words of Support, whose page of the intern
  changes. `npx tsc --noEmit` reports six errors, in this test only: the ids are not ids of the
  table yet.

- [x] **Step 3: The words,** in both tables. Copy them; they are the spec's:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -8,6 +8,7 @@
   'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
   'notice.language': 'Sprache: Deutsch',
   'notice.trace-found': 'Spur gefunden. Sie steht im Journal.',
+  'notice.pane-open': 'Hier liest etwas mit. Das Licht hält es nicht.',
   'help.key-walk': 'Pfeiltasten, WASD',
   'help.do-walk': 'Gehen',
   'help.key-lamp': 'Leertaste',
@@ -48,6 +49,13 @@
     'niemand hinsieht – und geht, sobald jemand',
     'draufschaut, bevor es das Haus verlässt.',
   ].join('\n'),
+  'creature.lurker-name': 'Mitleser',
+  'creature.lurker-text': [
+    'Eine Erweiterung im Browser, die jemand',
+    'installiert hat und die seither alles mitliest.',
+    'Solange ihr Fenster offen ist, hält sie kein',
+    'Licht – sie geht, wenn nur Freigegebenes läuft.',
+  ].join('\n'),
   'talk.officer-rules-1': [
     'Du siehst den Schatten also auch.',
     'Er bleibt überall dort zurück, wo Daten das',
@@ -211,8 +219,8 @@
   ].join('\n'),
   'talk.intern-support-traces': [
     'Im Support sind es wieder die Bildschirme.',
-    'Drei Reihen, und in jeder sitzt jemand, der',
-    'gerade etwas übersetzen lässt.',
+    'Auf manchen ist ein Fenster offen, das keiner',
+    'aufgemacht hat – mach es ruhig zu.',
   ].join('\n'),
   'talk.intern-support-source': [
     'Oranges Hemd, läuft zwischen den Tischen und',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -5,6 +5,7 @@
   'notice.shadow-too-dense': 'This shadow is too dense for the lamp.',
   'notice.language': 'Language: English',
   'notice.trace-found': 'Trace found. It is in the journal.',
+  'notice.pane-open': 'It reads along here. The light does not hold it.',
   'help.key-walk': 'Arrow keys, WASD',
   'help.do-walk': 'Walk',
   'help.key-lamp': 'Space',
@@ -45,6 +46,13 @@
     'goes as soon as somebody looks at it before',
     'it leaves the house.',
   ].join('\n'),
+  'creature.lurker-name': 'Lurker',
+  'creature.lurker-text': [
+    'A browser extension somebody installed, which',
+    'has read everything along ever since. While',
+    'its window is open no light holds it – it',
+    'goes when only approved tools are running.',
+  ].join('\n'),
   'talk.officer-rules-1': [
     'So you can see the shadow too.',
     'It stays behind wherever data leaves the house',
@@ -205,9 +213,9 @@
     'languages – ask yourself how.',
   ].join('\n'),
   'talk.intern-support-traces': [
-    'In Support it is the screens again. Three',
-    'rows, and in each somebody is having',
-    'something translated right now.',
+    'In Support it is the screens again. On some',
+    'a window is open that nobody opened – go',
+    'ahead and close it.',
   ].join('\n'),
   'talk.intern-support-source': [
     'Orange shirt, walks between the desks and the',
```

- [x] **Step 4: Run** `npm run check` — 1611 unit tests. The rule tests cover the new
  keys: a notice is one line that fits the bar, and an entry of the journal has at most four
  lines.

- [x] **Step 5: Commit** — `Add the words of the lurker`. Body: the notice says what is and
  tells the player nothing to do; the intern's page does, because a player who never presses
  E at a screen could not solve the case.

---

### Task 2: The sheet

**Files:**
- Create: `tools/placeholder-lurker.ts`, `public/sprites/lurker.png` (generated)
- Modify: `tools/gen-sprites.ts`
- Test: `tests/unit/gen-sprites.test.ts`, `tests/unit/assets.test.ts`

**Interfaces:**
- Produces: `LURKER_FRAME_SIZE`, `LURKER_FRAMES`, `LURKER_SHEET_WIDTH`,
  `LURKER_SHEET_HEIGHT`, `LURKER_GROUND`, `LURKER_LIT`, `LURKER_PANE_FRAME = 3`,
  `eyeInk(i, j, from)`, `paneInk(i, j)`, `renderLurker()` in `tools/placeholder-lurker.ts`;
  `encodeLurkerPng()` in `tools/gen-sprites.ts`; `public/sprites/lurker.png`, 64x16, a
  shadow asset.

- [x] **Step 1: Write the failing tests.** The generator's test, and the sixth shadow asset:

```diff
--- a/tests/unit/gen-sprites.test.ts
+++ b/tests/unit/gen-sprites.test.ts
@@ -13,6 +13,7 @@
   encodeInternPng,
   encodeLampPng,
   encodeLampWidePng,
+  encodeLurkerPng,
   encodeMiragePng,
   encodeOfficerPng,
   encodeOverviewPng,
@@ -35,6 +36,18 @@
   WIDE_LAMP_SHEET_HEIGHT,
   WIDE_LAMP_SHEET_WIDTH,
 } from '../../tools/placeholder-lamp.ts';
+import {
+  eyeInk,
+  LURKER_FRAME_SIZE,
+  LURKER_FRAMES,
+  LURKER_GROUND,
+  LURKER_LIT,
+  LURKER_PANE_FRAME,
+  LURKER_SHEET_HEIGHT,
+  LURKER_SHEET_WIDTH,
+  paneInk,
+  renderLurker,
+} from '../../tools/placeholder-lurker.ts';
 import {
   MIRAGE_FRAME_SIZE,
   MIRAGE_FRAMES,
@@ -898,3 +911,139 @@
     expect(() => wallInk(8, 0, 0)).toThrow('a shadow wall has looks 0 to 7, not 8');
   });
 });
+
+const LURKER_FILE = join(ROOT, 'public/sprites/lurker.png');
+const LURKER = renderLurker();
+
+/** The colour of pixel (i, j) of frame `index` of the lurker sheet, or null when transparent. */
+function lurkerPixel(index: number, i: number, j: number): string | null {
+  const o = (j * LURKER_SHEET_WIDTH + index * LURKER_FRAME_SIZE + i) * 4;
+  if (LURKER[o + 3] !== 255) {
+    return null;
+  }
+  return `#${[LURKER[o], LURKER[o + 1], LURKER[o + 2]]
+    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
+    .join('')}`;
+}
+
+function lurkerFrame(index: number): (string | null)[][] {
+  return Array.from({ length: LURKER_FRAME_SIZE }, (_, j) =>
+    Array.from({ length: LURKER_FRAME_SIZE }, (_, i) => lurkerPixel(index, i, j)),
+  );
+}
+
+describe('the placeholder lurker generator (0038)', () => {
+  it('is deterministic', () => {
+    expect(encodeLurkerPng().equals(encodeLurkerPng())).toBe(true);
+  });
+
+  it('matches the committed public/sprites/lurker.png', () => {
+    const committed = PNG.sync.read(readFileSync(LURKER_FILE));
+    expect([committed.width, committed.height]).toStrictEqual([64, 16]);
+    expect(Buffer.from(LURKER).equals(committed.data)).toBe(true);
+  });
+
+  it('is 64x16: four frames of 16x16 in one row, the fourth the lurker in its window', () => {
+    expect([
+      LURKER_SHEET_WIDTH,
+      LURKER_SHEET_HEIGHT,
+      LURKER_FRAME_SIZE,
+      LURKER_FRAMES,
+      LURKER_PANE_FRAME,
+    ]).toStrictEqual([64, 16, 16, 4, 3]);
+    expect(LURKER).toHaveLength(64 * 16 * 4);
+    expect([LURKER_GROUND, LURKER_LIT]).toStrictEqual(['#c0cbdc', '#ffffff']);
+  });
+
+  it('uses the signature colour and one ground colour per frame, and nothing else', () => {
+    for (let index = 0; index < LURKER_FRAMES; index += 1) {
+      const colours = new Set(lurkerFrame(index).flat());
+      colours.delete(null);
+      expect([...colours].sort(), `frame ${index}`).toStrictEqual(
+        [SHADOW_COLOUR, index === 2 ? LURKER_LIT : LURKER_GROUND].sort(),
+      );
+    }
+  });
+
+  it('draws frame 0 as an eye: the lids, the corners, the inside and the pupil of the spec', () => {
+    // The lids: rows 6 and 10, columns 5–10.
+    for (const j of [6, 10]) {
+      expect(lurkerPixel(0, 4, j)).toBeNull();
+      expect(lurkerPixel(0, 5, j)).toBe(SHADOW_COLOUR);
+      expect(lurkerPixel(0, 10, j)).toBe(SHADOW_COLOUR);
+      expect(lurkerPixel(0, 11, j)).toBeNull();
+    }
+    // The corners: columns 4 and 11, rows 7–9.
+    for (const i of [4, 11]) {
+      expect(lurkerPixel(0, i, 6)).toBeNull();
+      expect([7, 8, 9].map((j) => lurkerPixel(0, i, j))).toStrictEqual([
+        SHADOW_COLOUR,
+        SHADOW_COLOUR,
+        SHADOW_COLOUR,
+      ]);
+      expect(lurkerPixel(0, i, 10)).toBeNull();
+    }
+    // The inside, columns 5–10 and rows 7–9, with the pupil on columns 7–8.
+    for (const j of [7, 8, 9]) {
+      expect([5, 6, 7, 8, 9, 10].map((i) => lurkerPixel(0, i, j))).toStrictEqual([
+        LURKER_GROUND,
+        LURKER_GROUND,
+        SHADOW_COLOUR,
+        SHADOW_COLOUR,
+        LURKER_GROUND,
+        LURKER_GROUND,
+      ]);
+    }
+    expect(
+      lurkerFrame(0)
+        .flat()
+        .filter((colour) => colour !== null),
+    ).toHaveLength(12 + 6 + 18);
+    expect([eyeInk(7, 8, 7), eyeInk(9, 8, 7), eyeInk(3, 8, 7)]).toStrictEqual([
+      'edge',
+      'ground',
+      null,
+    ]);
+  });
+
+  it('draws frame 1 as frame 0 with the pupil on columns 8–9: it looks to the side', () => {
+    const moved = lurkerFrame(0).map((row, j) =>
+      row.map((colour, i) => {
+        if (j < 7 || j > 9 || i < 7 || i > 9) {
+          return colour;
+        }
+        return i === 7 ? LURKER_GROUND : SHADOW_COLOUR;
+      }),
+    );
+    expect(lurkerFrame(1)).toStrictEqual(moved);
+  });
+
+  it('draws frame 2 as frame 0 with the inside white: the lurker in the light', () => {
+    const lit = lurkerFrame(0).map((row) =>
+      row.map((colour) => (colour === LURKER_GROUND ? LURKER_LIT : colour)),
+    );
+    expect(lurkerFrame(2)).toStrictEqual(lit);
+  });
+
+  it('draws frame 3 as the window: its border, its title bar, its inside and the pupil', () => {
+    const frame = lurkerFrame(LURKER_PANE_FRAME);
+    for (let j = 0; j < 16; j += 1) {
+      for (let i = 0; i < 16; i += 1) {
+        const inside = i >= 2 && i <= 13 && j >= 3 && j <= 12;
+        const border = i === 2 || i === 13 || j === 3 || j === 12;
+        const pupil = i >= 7 && i <= 8 && j >= 7 && j <= 9;
+        let expected: string | null = null;
+        if (inside) {
+          expected = border || j === 4 || pupil ? SHADOW_COLOUR : LURKER_GROUND;
+        }
+        expect(frame[j]?.[i], `(${i}, ${j})`).toBe(expected);
+      }
+    }
+    expect([paneInk(2, 3), paneInk(5, 4), paneInk(5, 5), paneInk(1, 5)]).toStrictEqual([
+      'edge',
+      'edge',
+      'ground',
+      null,
+    ]);
+  });
+});
```

```diff
--- a/tests/unit/assets.test.ts
+++ b/tests/unit/assets.test.ts
@@ -9,13 +9,14 @@
 
 const ROOT = fileURLToPath(new URL('../../', import.meta.url));
 const RULES = { palette: new Set<string>(ENDESGA_32), reserved: SHADOW_COLOUR };
-/** The shadow assets: the only files that may use the reserved colour (visual.md §4, 0008, 0014, 0022, 0032). */
+/** The shadow assets: the only files that may use the reserved colour (visual.md §4, 0008, 0014, 0022, 0032, 0038). */
 const SHADOW_ASSETS: ReadonlySet<string> = new Set([
   'public/sprites/snippet.png',
   'public/sprites/shadow-wall.png',
   'public/sprites/trace.png',
   'public/sprites/shadow-veil.png',
   'public/sprites/mirage.png',
+  'public/sprites/lurker.png',
 ]);
 const rulesFor = (file: string) => ({
   ...RULES,
@@ -77,6 +78,10 @@
     expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/intern.png');
   });
 
+  it('checks the lurker sheet under public/sprites/ with every other PNG (0038)', () => {
+    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/lurker.png');
+  });
+
   it('checks the mirage sheet under public/sprites/ with every other PNG (0032)', () => {
     expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/mirage.png');
   });
@@ -106,8 +111,11 @@
       'public/sprites/trace.png',
       'public/sprites/shadow-veil.png',
       'public/sprites/mirage.png',
+      'public/sprites/lurker.png',
     ]);
     expect(checkPng('x.png', violet, rulesFor('public/sprites/mirage.png'))).toStrictEqual([]);
+    // The sixth: the lurker and its window (0038).
+    expect(checkPng('x.png', violet, rulesFor('public/sprites/lurker.png'))).toStrictEqual([]);
   });
 
   it('checks the shadow-wall sheet under public/sprites/ with every other PNG (0014)', () => {
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/gen-sprites.test.ts
  tests/unit/assets.test.ts`. Expected: `gen-sprites.test.ts` does not load — the generator
  does not exist — and the test `checks the lurker sheet under public/sprites/ with every
  other PNG (0038)` fails: there is no such file.

- [x] **Step 3: The sheet as data.** Create `tools/placeholder-lurker.ts`:

```ts
import { type PaletteColour, SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder lurker sheet (visual.md §5, feature 0038): an eye, four 16x16 frames in one
 * row. Frame 0 and frame 1, the pupil one pixel to the right, alternate while the creature is
 * free; frame 2, the inside white, is the creature frozen in the light; frame 3 is the lurker
 * in its window on a screen, where no light holds it. The lids, the pupil and the window's
 * frame are the signature colour — a shadow asset. Pure — it returns pixels;
 * tools/gen-sprites.ts writes the file.
 */

export const LURKER_FRAME_SIZE = 16;
export const LURKER_FRAMES = 4;
export const LURKER_SHEET_WIDTH = LURKER_FRAMES * LURKER_FRAME_SIZE;
export const LURKER_SHEET_HEIGHT = LURKER_FRAME_SIZE;
export const LURKER_GROUND: PaletteColour = '#c0cbdc';
export const LURKER_LIT: PaletteColour = '#ffffff';
/** The frame of the lurker in its window. */
export const LURKER_PANE_FRAME = 3;

/** The pupil: columns `from` and `from` + 1, rows 7–9. */
function pupil(i: number, j: number, from: number): boolean {
  return i >= from && i <= from + 1 && j >= 7 && j <= 9;
}

/**
 * Pixel (i, j) of the eye, its pupil starting at column `from`: rows 6 and 10 in columns 5–10
 * and columns 4 and 11 in rows 7–9 are `edge`, and so is the pupil; the rest of the inside,
 * columns 5–10 and rows 7–9, is `ground`.
 */
export function eyeInk(i: number, j: number, from: number): 'edge' | 'ground' | null {
  const lids = (j === 6 || j === 10) && i >= 5 && i <= 10;
  const corners = (i === 4 || i === 11) && j >= 7 && j <= 9;
  if (lids || corners) {
    return 'edge';
  }
  if (i < 5 || i > 10 || j < 7 || j > 9) {
    return null;
  }
  return pupil(i, j, from) ? 'edge' : 'ground';
}

/**
 * Pixel (i, j) of the window: the rectangle columns 2–13, rows 3–12. Its border and row 4, the
 * title bar, are `edge`, and so is the pupil in columns 7–8; the rest of the inside is `ground`.
 */
export function paneInk(i: number, j: number): 'edge' | 'ground' | null {
  if (i < 2 || i > 13 || j < 3 || j > 12) {
    return null;
  }
  if (i === 2 || i === 13 || j === 3 || j === 12 || j === 4) {
    return 'edge';
  }
  return pupil(i, j, 7) ? 'edge' : 'ground';
}

/** RGBA, row-major, LURKER_SHEET_WIDTH × LURKER_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderLurker(): Uint8Array {
  const data = new Uint8Array(LURKER_SHEET_WIDTH * LURKER_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < LURKER_FRAMES; frame += 1) {
    for (let j = 0; j < LURKER_FRAME_SIZE; j += 1) {
      for (let i = 0; i < LURKER_FRAME_SIZE; i += 1) {
        // Frame 1 looks to the side: the pupil one pixel to the right.
        const ink = frame === LURKER_PANE_FRAME ? paneInk(i, j) : eyeInk(i, j, frame === 1 ? 8 : 7);
        if (ink === null) {
          continue;
        }
        const ground = frame === 2 ? LURKER_LIT : LURKER_GROUND;
        const colour = ink === 'edge' ? SHADOW_COLOUR : ground;
        data.set(
          [...rgb(colour), 255],
          (j * LURKER_SHEET_WIDTH + frame * LURKER_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
```

- [x] **Step 4: The generator writes it:**

```diff
--- a/tools/gen-sprites.ts
+++ b/tools/gen-sprites.ts
@@ -11,6 +11,7 @@
   WIDE_LAMP_SHEET_HEIGHT,
   WIDE_LAMP_SHEET_WIDTH,
 } from './placeholder-lamp.ts';
+import { LURKER_SHEET_HEIGHT, LURKER_SHEET_WIDTH, renderLurker } from './placeholder-lurker.ts';
 import { MIRAGE_SHEET_HEIGHT, MIRAGE_SHEET_WIDTH, renderMirage } from './placeholder-mirage.ts';
 import {
   OVERVIEW_SHEET_HEIGHT,
@@ -85,6 +86,13 @@
   return PNG.sync.write(png);
 }
 
+/** The lurker (0038): the third species, and its window. */
+export function encodeLurkerPng(): Buffer {
+  const png = new PNG({ width: LURKER_SHEET_WIDTH, height: LURKER_SHEET_HEIGHT });
+  png.data = Buffer.from(renderLurker());
+  return PNG.sync.write(png);
+}
+
 export function encodeOverviewPng(): Buffer {
   const png = new PNG({ width: OVERVIEW_SHEET_WIDTH, height: OVERVIEW_SHEET_HEIGHT });
   png.data = Buffer.from(renderOverview());
@@ -161,6 +169,7 @@
   writeFileSync('public/sprites/lamp-wide.png', encodeLampWidePng());
   writeFileSync('public/sprites/snippet.png', encodeSnippetPng());
   writeFileSync('public/sprites/mirage.png', encodeMiragePng());
+  writeFileSync('public/sprites/lurker.png', encodeLurkerPng());
   writeFileSync('public/sprites/overview.png', encodeOverviewPng());
   for (const look of PERSON_SHIRTS.keys()) {
     writeFileSync(`public/sprites/person-${look + 1}.png`, encodePersonPng(look));
```

- [x] **Step 5: Generate** — `npm run gen-sprites`. `public/sprites/lurker.png` is new, 64x16,
  SHA-256 `b80eade42f32b5a972985199c1a577b3f294bdb625cb899a7d0c261e036e93df`; no other sheet
  changes.

- [x] **Step 6: Run** `npm run check` — 1620 unit tests.

- [x] **Step 7: Commit** — `Draw the lurker and its window`. Body: an eye, because it reads
  along; the fourth frame is the eye in a small window, where no light holds it.

---

### Task 3: The species

**Files:**
- Create: `tests/unit/lurker.test.ts`
- Modify: `src/game/state.ts`, `src/game/creature.ts`, `src/game/journal.ts`, `src/main.ts`,
  `src/render/draw-scene.ts` (a comment)
- Test: the test files with a literal of the captures; `tests/unit/state.test.ts`

**Interfaces:**
- Consumes: the two text ids of the entry (Task 1); `/sprites/lurker.png` (Task 2).
- Produces: `SPECIES = ['snippet', 'mirage', 'lurker']`; `Captured` with the count `lurker`;
  `HABITS.lurker`; `ENTRY_TEXT.lurker`; `SceneContent.creatureSheets.lurker`, loaded by
  `main.ts`.

- [x] **Step 1: The third count in every literal of the captures** — 50 literals — and a
  sheet for the species in the three contents of the scene tests:

```diff
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -365,7 +365,7 @@
   const start: GameState = {
     ...createInitialState(ROOMS),
     creatures: [LEFT_HOME, VISITOR, NEIGHBOUR],
-    captured: { snippet: 2, mirage: 0 },
+    captured: { snippet: 2, mirage: 0, lurker: 0 },
   };
 
   it('starts with both walls standing', () => {
@@ -410,7 +410,11 @@
       shadowWalls: [{ wall: 1, lit: false, light: 0 }],
       creatures: [VISITOR, NEIGHBOUR],
     });
-    expect(clearRegion(start, 'sales', ROOMS).captured).toStrictEqual({ snippet: 2, mirage: 0 });
+    expect(clearRegion(start, 'sales', ROOMS).captured).toStrictEqual({
+      snippet: 2,
+      mirage: 0,
+      lurker: 0,
+    });
   });
 
   it('removes the creatures of every area of a region with two', () => {
```

```diff
--- a/tests/unit/creature.test.ts
+++ b/tests/unit/creature.test.ts
@@ -252,23 +252,23 @@
     const RIGHT = figure(100, 100, 'right');
     const result = stepCreatures(
       [snippet(130, 100, 59), snippet(136, 100, 3)],
-      { snippet: 4, mirage: 0 },
+      { snippet: 4, mirage: 0, lurker: 0 },
       RIGHT,
       true,
       OPEN,
     );
     expect(result).toStrictEqual({
       creatures: [snippet(136, 100, 4)],
-      captured: { snippet: 5, mirage: 0 },
+      captured: { snippet: 5, mirage: 0, lurker: 0 },
     });
   });
 
   it('leaves its arguments unchanged', () => {
     const creatures = [snippet(130, 100, 59)];
-    const captured = { snippet: 0, mirage: 0 };
+    const captured = { snippet: 0, mirage: 0, lurker: 0 };
     stepCreatures(creatures, captured, figure(100, 100, 'right'), true, OPEN);
     expect(creatures).toStrictEqual([snippet(130, 100, 59)]);
-    expect(captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 });
 
@@ -321,7 +321,7 @@
   });
 
   it('starts every count at 0', () => {
-    expect(noCaptures()).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(noCaptures()).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 });
 
@@ -351,9 +351,9 @@
   it('is counted by the step of all creatures with the wider cone only', () => {
     const almost = { ...BESIDE, light: CAPTURE_STEPS - 1 };
     const wide = stepCreatures([almost], noCaptures(), PLAYER, true, OPEN, WIDE_SPREAD);
-    expect(wide).toStrictEqual({ creatures: [], captured: { snippet: 1, mirage: 0 } });
+    expect(wide).toStrictEqual({ creatures: [], captured: { snippet: 1, mirage: 0, lurker: 0 } });
     const narrow = stepCreatures([almost], noCaptures(), PLAYER, true, OPEN);
-    expect(narrow.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(narrow.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
     expect(narrow.creatures).toHaveLength(1);
     expect(narrow.creatures[0]?.light).toBe(0);
   });
@@ -514,7 +514,7 @@
     const almost = mirage(160, 96, CAPTURE_STEPS - 1);
     expect(stepCreatures([almost], noCaptures(), player, true, OPEN)).toStrictEqual({
       creatures: [],
-      captured: { snippet: 0, mirage: 1 },
+      captured: { snippet: 0, mirage: 1, lurker: 0 },
     });
   });
 
```

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -76,6 +76,7 @@
     snippet: sheet(16, 16),
     // Its own image, so that the two sheets can be told apart.
     mirage: { ...sheet(16, 16), image: { mirage: true } as unknown as ImageBitmap },
+    lurker: { ...sheet(16, 16), image: { lurker: true } as unknown as ImageBitmap },
   },
   overviewSheet: sheet(8, 8),
   shadowWallSheet: sheet(16, 16),
@@ -121,7 +122,7 @@
   journal: null,
   help: false,
   held: NO_INPUT,
-  captured: { snippet: 0, mirage: 0 },
+  captured: { snippet: 0, mirage: 0, lurker: 0 },
   overview: { current: 5, max: 5 },
   dark: 0,
   ...fields,
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -75,6 +75,7 @@
     snippet: sheet(16, 16),
     // Its own image, so that the two sheets can be told apart.
     mirage: { ...sheet(16, 16), image: { mirage: true } as unknown as ImageBitmap },
+    lurker: { ...sheet(16, 16), image: { lurker: true } as unknown as ImageBitmap },
   },
   overviewSheet: sheet(8, 8),
   shadowWallSheet: sheet(16, 16),
@@ -118,7 +119,7 @@
   journal: { tab },
   help: false,
   held: NO_INPUT,
-  captured: { snippet: snippets, mirage: 0 },
+  captured: { snippet: snippets, mirage: 0, lurker: 0 },
   overview: { current: 5, max: 5 },
   dark: 0,
 });
@@ -581,7 +582,7 @@
   };
 
   it('draws the mirage alone in the first place when only a mirage is captured', () => {
-    const { calls } = shown({ snippet: 0, mirage: 1 });
+    const { calls } = shown({ snippet: 0, mirage: 1, lurker: 0 });
     expect(calls[0]).toBe(`drawSprite ${ENTRY_FRAME} at 16,32`);
     // `Trugbild`: `T` is glyph 52; the text starts with `Ein Bild …`, `E` is glyph 37.
     expect(calls[1]).toBe('drawSprite 52 at 40,35');
@@ -592,7 +593,7 @@
     const only = recordingRenderer();
     drawJournal(
       only,
-      { ...reading('creatures'), captured: { snippet: 0, mirage: 1 } },
+      { ...reading('creatures'), captured: { snippet: 0, mirage: 1, lurker: 0 } },
       { tab: 'creatures' },
       CONTENT,
       GERMAN,
@@ -602,9 +603,9 @@
   });
 
   it('draws the mirage 72 px below the snippet when both are captured', () => {
-    const both = shown({ snippet: 1, mirage: 2 }).calls;
-    const snippetOnly = shown({ snippet: 1, mirage: 0 }).calls;
-    const mirageOnly = shown({ snippet: 0, mirage: 1 }).calls;
+    const both = shown({ snippet: 1, mirage: 2, lurker: 0 }).calls;
+    const snippetOnly = shown({ snippet: 1, mirage: 0, lurker: 0 }).calls;
+    const mirageOnly = shown({ snippet: 0, mirage: 1, lurker: 0 }).calls;
     // The first entry is what it was; the second is the mirage's, every call 72 px lower.
     expect(both.slice(0, snippetOnly.length)).toStrictEqual(snippetOnly);
     const lower = (call: string): string =>
@@ -614,7 +615,7 @@
   });
 
   it('fits the screen with both: no line starts below y = 162', () => {
-    const rows = shown({ snippet: 1, mirage: 1 }).calls.map((call) =>
+    const rows = shown({ snippet: 1, mirage: 1, lurker: 0 }).calls.map((call) =>
       Number(call.slice(call.lastIndexOf(',') + 1)),
     );
     expect(Math.max(...rows)).toBe(162);
@@ -622,7 +623,7 @@
 
   it('reads `Mirage` in English', () => {
     // `M` is glyph 45; the text starts with `A picture …`, `A` is glyph 33.
-    const { calls } = shown({ snippet: 0, mirage: 1 }, ENGLISH);
+    const { calls } = shown({ snippet: 0, mirage: 1, lurker: 0 }, ENGLISH);
     expect(calls[1]).toBe('drawSprite 45 at 40,35');
     expect(calls[7]).toBe('drawSprite 33 at 16,54');
   });
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -110,6 +110,7 @@
     snippet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
     // Its own image, so that toStrictEqual tells the two sheets apart.
     mirage: { image: { mirage: true } as unknown as ImageBitmap, frameWidth: 16, frameHeight: 16 },
+    lurker: { image: { lurker: true } as unknown as ImageBitmap, frameWidth: 16, frameHeight: 16 },
   },
   overviewSheet: { image: {} as ImageBitmap, frameWidth: 8, frameHeight: 8 },
   shadowWallSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
@@ -215,7 +216,7 @@
   journal: null,
   help: false,
   held: NO_INPUT,
-  captured: { snippet: 0, mirage: 0 },
+  captured: { snippet: 0, mirage: 0, lurker: 0 },
   // No hearts: the call lists of the earlier features stay as they were (0009).
   overview: { current: 0, max: 0 },
   dark: 0,
```

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -1503,14 +1503,18 @@
       { x: 1224, y: 622 },
       ...MIRAGES,
     ]);
-    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 
   it('removes none when both snippets of Sales were captured before', () => {
     const corridor = start.creatures.slice(0, 1);
-    const solved = solve({ ...ready, creatures: corridor, captured: { snippet: 2, mirage: 0 } });
+    const solved = solve({
+      ...ready,
+      creatures: corridor,
+      captured: { snippet: 2, mirage: 0, lurker: 0 },
+    });
     expect(solved.creatures).toStrictEqual(corridor);
-    expect(solved.captured).toStrictEqual({ snippet: 2, mirage: 0 });
+    expect(solved.captured).toStrictEqual({ snippet: 2, mirage: 0, lurker: 0 });
   });
 
   it('removes the shadow wall of Sales if it still stands, and no other', () => {
@@ -1982,7 +1986,7 @@
       'mirage',
     ]);
     expect(mirages.map((creature) => creature.home)).toStrictEqual([...MIRAGES]);
-    expect(start.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(start.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 
   it('stand each on a free cell of Marketing that is reached on foot, at home in its area', () => {
@@ -2066,7 +2070,7 @@
       'snippet',
       'snippet',
     ]);
-    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 });
 
```

```diff
--- a/tests/unit/journal.test.ts
+++ b/tests/unit/journal.test.ts
@@ -103,14 +103,14 @@
   });
 
   it('lists the captured species in the order of the species, not of the captures (0032)', () => {
-    expect(entriesOf({ snippet: 0, mirage: 1 })).toStrictEqual(['mirage']);
-    expect(entriesOf({ snippet: 2, mirage: 1 })).toStrictEqual(['snippet', 'mirage']);
+    expect(entriesOf({ snippet: 0, mirage: 1, lurker: 0 })).toStrictEqual(['mirage']);
+    expect(entriesOf({ snippet: 2, mirage: 1, lurker: 0 })).toStrictEqual(['snippet', 'mirage']);
   });
 
   it('lists a species as soon as one of it is captured', () => {
-    expect(entriesOf({ snippet: 0, mirage: 0 })).toStrictEqual([]);
-    expect(entriesOf({ snippet: 1, mirage: 0 })).toStrictEqual(['snippet']);
-    expect(entriesOf({ snippet: 3, mirage: 0 })).toStrictEqual(['snippet']);
+    expect(entriesOf({ snippet: 0, mirage: 0, lurker: 0 })).toStrictEqual([]);
+    expect(entriesOf({ snippet: 1, mirage: 0, lurker: 0 })).toStrictEqual(['snippet']);
+    expect(entriesOf({ snippet: 3, mirage: 0, lurker: 0 })).toStrictEqual(['snippet']);
   });
 });
 
```

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -179,7 +179,7 @@
     journal: null,
     help: false,
     held: NO_INPUT,
-    captured: { snippet: 2, mirage: 0 },
+    captured: { snippet: 2, mirage: 0, lurker: 0 },
     overview: { current: 0, max: 3 },
     dark: 1,
   };
@@ -226,7 +226,7 @@
       journal: null,
       help: false,
       held: NO_INPUT,
-      captured: { snippet: 2, mirage: 0 },
+      captured: { snippet: 2, mirage: 0, lurker: 0 },
       overview: { current: 3, max: 3 },
       dark: 45,
     });
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -112,7 +112,7 @@
       journal: null,
       help: false,
       held: NO_INPUT,
-      captured: { snippet: 0, mirage: 0 },
+      captured: { snippet: 0, mirage: 0, lurker: 0 },
       overview: { current: 5, max: 5 },
       dark: 0,
     });
@@ -176,7 +176,7 @@
         journal: null,
         help: false,
         held: NO_INPUT,
-        captured: { snippet: 0, mirage: 0 },
+        captured: { snippet: 0, mirage: 0, lurker: 0 },
         overview: { current: 3, max: 3 },
         dark: 0,
       },
@@ -208,7 +208,7 @@
       journal: null,
       help: false,
       held: NO_INPUT,
-      captured: { snippet: 0, mirage: 0 },
+      captured: { snippet: 0, mirage: 0, lurker: 0 },
       overview: { current: 3, max: 3 },
       dark: 0,
     };
@@ -232,7 +232,7 @@
       journal: null,
       help: false,
       held: NO_INPUT,
-      captured: { snippet: 0, mirage: 0 },
+      captured: { snippet: 0, mirage: 0, lurker: 0 },
       overview: { current: 3, max: 3 },
       dark: 0,
     });
@@ -324,7 +324,7 @@
     expect(state.creatures).toStrictEqual([
       { species: 'snippet', x: 1070, y: 734, light: 0, home: { x: 1070, y: 734 } },
     ]);
-    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 
   it('rejects a point whose name is no species', () => {
@@ -345,7 +345,7 @@
     ]);
     const done = run(MAP_ONE, [60, RIGHT_SHINE]);
     expect(done.creatures).toStrictEqual([]);
-    expect(done.captured).toStrictEqual({ snippet: 1, mirage: 0 });
+    expect(done.captured).toStrictEqual({ snippet: 1, mirage: 0, lurker: 0 });
   });
 
   it('survives a JSON round trip with a frozen creature and a count of 1 (INV-1)', () => {
@@ -359,7 +359,7 @@
     ]);
     const DOWN: GameInput = { ...NONE, down: true };
     const state = run(map, [60, RIGHT_SHINE], [45, DOWN], [30, DOWN_SHINE]);
-    expect(state.captured).toStrictEqual({ snippet: 1, mirage: 0 });
+    expect(state.captured).toStrictEqual({ snippet: 1, mirage: 0, lurker: 0 });
     expect(state.creatures).toHaveLength(1);
     expect(state.creatures[0]?.light).toBe(30);
     expect(state.creatures[0]?.x).toBe(1024);
@@ -572,7 +572,7 @@
       expect(state.creatures).toStrictEqual([
         { species: 'snippet', x: 152, y: 108, light: 0, home: { x: 152, y: 120 } },
       ]);
-      expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+      expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
       expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
     });
 
@@ -580,7 +580,7 @@
       const lifted: GameState = { ...createInitialState(map), shadowWalls: [] };
       const state = run(map, lifted, [60, SHINE]);
       expect(state.creatures).toStrictEqual([]);
-      expect(state.captured).toStrictEqual({ snippet: 1, mirage: 0 });
+      expect(state.captured).toStrictEqual({ snippet: 1, mirage: 0, lurker: 0 });
     });
 
     it('walks through the doorway once the wall is lifted', () => {
@@ -926,7 +926,7 @@
     expect(solved.solved).toStrictEqual([{ region: 'sales', at: 1005 }]);
     expect(solved.creatures).toStrictEqual([OUTSIDE]);
     expect(solved.shadowWalls).toStrictEqual([{ wall: 1, lit: false, light: 0 }]);
-    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 
   it('removes nothing in a step that solves nothing', () => {
@@ -946,7 +946,7 @@
     expect(woken.dark).toBe(45);
     expect(woken.creatures).toStrictEqual([OUTSIDE]);
     expect(woken.shadowWalls).toStrictEqual([{ wall: 1, lit: false, light: 0 }]);
-    expect(woken.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(woken.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 
   it('keeps them gone: 600 steps later the creature and the wall are still not there', () => {
@@ -1089,17 +1089,17 @@
     ]);
     const almost = run(upgraded(SNIPPET_MAP), SNIPPET_MAP, SHINE, 59);
     expect(almost.creatures[0]?.light).toBe(59);
-    expect(almost.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(almost.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
     const captured = update(almost, SHINE, SNIPPET_MAP);
     expect(captured.creatures).toStrictEqual([]);
-    expect(captured.captured).toStrictEqual({ snippet: 1, mirage: 0 });
+    expect(captured.captured).toStrictEqual({ snippet: 1, mirage: 0, lurker: 0 });
   });
 
   it('does not light the same creature without the wider cone: it comes nearer', () => {
     const dark = update(createInitialState(SNIPPET_MAP), SHINE, SNIPPET_MAP);
     expect(dark.creatures[0]?.light).toBe(0);
     expect(dark.creatures[0]?.x).toBeLessThan(128);
-    expect(dark.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+    expect(dark.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 
   /**
@@ -1183,10 +1183,10 @@
   /** The apex is (100, 48); the body of the mirage is 40 px along the axis, in the cone. */
   const AHEAD = grassMap(20, 12, { x: 100, y: 60 }, [{ name: 'mirage', x: 100, y: 96 }]);
 
-  it('has two species, and a count for each from the start', () => {
-    expect(SPECIES).toStrictEqual(['snippet', 'mirage']);
-    expect(createInitialState(MAP).captured).toStrictEqual({ snippet: 0, mirage: 0 });
-    expect(newGame(MAP).captured).toStrictEqual({ snippet: 0, mirage: 0 });
+  it('has three species, and a count for each from the start (0032, 0038)', () => {
+    expect(SPECIES).toStrictEqual(['snippet', 'mirage', 'lurker']);
+    expect(createInitialState(MAP).captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
+    expect(newGame(MAP).captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
   });
 
   it('makes a mirage from a point of the map, and it comes while the figure looks away', () => {
@@ -1214,7 +1214,7 @@
     expect(state.creatures[0]?.light).toBe(59);
     state = update(state, SHINE, AHEAD);
     expect(state.creatures).toStrictEqual([]);
-    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 1 });
+    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 1, lurker: 0 });
     expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
   });
 
```

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -221,7 +221,7 @@
     'mirage',
     'mirage',
   ]);
-  expect(state?.captured).toStrictEqual({ snippet: 0, mirage: 0 });
+  expect(state?.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
 });
 
 test('the floor starts with its 22 movers and draws the person of the reception', async ({
```

- [x] **Step 2: The tests of the species.** Create `tests/unit/lurker.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  CAPTURE_STEPS,
  HABITS,
  NOTICE_RADIUS,
  noCaptures,
  stepCreature,
  stepCreatures,
} from '../../src/game/creature';
import { ENTRY_TEXT, entriesOf } from '../../src/game/journal';
import {
  type CreatureState,
  type Facing,
  NO_RECOIL,
  type PlayerState,
  SPECIES,
  type Species,
} from '../../src/game/state';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

/** 20x12 cells of open floor. */
const MAP = grassMap(20, 12, { x: 40, y: 40 });
const at = (species: Species, x: number, y: number): CreatureState => ({
  species,
  x,
  y,
  light: 0,
  home: { x, y },
});
const figure = (x: number, y: number, facing: Facing = 'down'): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
});

describe('the lurker, the third species (0038)', () => {
  it('comes after the snippet and the mirage, with a count from the start', () => {
    expect(SPECIES).toStrictEqual(['snippet', 'mirage', 'lurker']);
    expect(noCaptures()).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
  });

  it('has the habits of the snippet on the floor', () => {
    expect(HABITS.lurker).toStrictEqual(HABITS.snippet);
    expect(HABITS.lurker.shy).toBe(false);
  });

  it('steps exactly as a snippet at the same place would, step for step', () => {
    const player = figure(160, 100, 'up');
    let lurker = at('lurker', 200, 100);
    let snippet = at('snippet', 200, 100);
    for (let step = 0; step < 120; step += 1) {
      lurker = stepCreature(lurker, player, false, MAP) ?? lurker;
      snippet = stepCreature(snippet, player, false, MAP) ?? snippet;
      expect({ ...lurker, species: 'snippet' }, `step ${step}`).toStrictEqual(snippet);
    }
    // It came, and stopped 8 px from the feet.
    expect(lurker.x).toBeCloseTo(168, 6);
    // At the notice radius and beyond it rests.
    const far = at('lurker', 160 + NOTICE_RADIUS, 100);
    expect(stepCreature(far, player, false, MAP)).toStrictEqual(far);
  });

  it('freezes in the light and is captured in the 60th lit step: its count grows', () => {
    const player = figure(104, 100, 'down');
    let state = {
      creatures: [at('lurker', 104, 140)] as readonly CreatureState[],
      captured: noCaptures(),
    };
    for (let step = 1; step < CAPTURE_STEPS; step += 1) {
      state = stepCreatures(state.creatures, state.captured, player, true, MAP);
      expect(state.creatures).toStrictEqual([{ ...at('lurker', 104, 140), light: step }]);
    }
    state = stepCreatures(state.creatures, state.captured, player, true, MAP);
    expect(state).toStrictEqual({
      creatures: [],
      captured: { snippet: 0, mirage: 0, lurker: 1 },
    });
    expect(CAPTURE_STEPS).toBe(60);
  });

  it('has its entry in the journal, after the other two', () => {
    expect(ENTRY_TEXT.lurker).toStrictEqual({
      name: textKey('creature.lurker-name'),
      text: textKey('creature.lurker-text'),
    });
    expect(entriesOf({ snippet: 1, mirage: 1, lurker: 1 })).toStrictEqual([...SPECIES]);
    expect(entriesOf({ snippet: 0, mirage: 0, lurker: 2 })).toStrictEqual(['lurker']);
  });
});
```

- [x] **Step 3: Run** `npx tsc --noEmit` — errors in the test files of Step 1 and 2: the
  literals have a count the type does not know. Run `npx vitest run`. Expected: 23 tests fail in four files — the five of `lurker.test.ts`, three of the creatures, twelve of the state and three of the floor.

- [x] **Step 4: The species,** its habits and its entry:

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -48,9 +48,9 @@
 
 /**
  * The creature species (world.md §4), in journal order. 0008 brings the first, 0032 the
- * second.
+ * second, 0038 the third.
  */
-export const SPECIES = ['snippet', 'mirage'] as const;
+export const SPECIES = ['snippet', 'mirage', 'lurker'] as const;
 export type Species = (typeof SPECIES)[number];
 
 /** A creature still in the world (0008). */
```

```diff
--- a/src/game/creature.ts
+++ b/src/game/creature.ts
@@ -59,6 +59,12 @@
     stepDistance: MIRAGE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND,
     shy: true,
   },
+  // On the floor a lurker goes by the snippet's rule in everything (0038).
+  lurker: {
+    noticeRadius: NOTICE_RADIUS,
+    stepDistance: CREATURE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND,
+    shy: false,
+  },
 };
 
 /** The centre of the sprite: the point the lamp is tested against. */
@@ -224,5 +230,5 @@
 
 /** Nothing captured yet. A literal, so a new species does not compile until it is listed. */
 export function noCaptures(): Captured {
-  return { snippet: 0, mirage: 0 };
+  return { snippet: 0, mirage: 0, lurker: 0 };
 }
```

```diff
--- a/src/game/journal.ts
+++ b/src/game/journal.ts
@@ -42,6 +42,7 @@
 export const ENTRY_TEXT: Readonly<Record<Species, EntryText>> = {
   snippet: { name: textKey('creature.snippet-name'), text: textKey('creature.snippet-text') },
   mirage: { name: textKey('creature.mirage-name'), text: textKey('creature.mirage-text') },
+  lurker: { name: textKey('creature.lurker-name'), text: textKey('creature.lurker-text') },
 };
 
 /** The words of a region's line on the cases tab (0022): `Spuren: 1 von 5`. */
```

- [x] **Step 5: Its sheet in the content:**

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -33,6 +33,7 @@
 const LAMP_WIDE_SHEET_URL = '/sprites/lamp-wide.png';
 const SNIPPET_SHEET_URL = '/sprites/snippet.png';
 const MIRAGE_SHEET_URL = '/sprites/mirage.png';
+const LURKER_SHEET_URL = '/sprites/lurker.png';
 const OVERVIEW_SHEET_URL = '/sprites/overview.png';
 /** The movers' sheets (0015): a person of look n is person-(n + 1).png. */
 const PERSON_SHEET_URLS = [
@@ -98,6 +99,11 @@
       },
       mirage: {
         image: await loadImage(MIRAGE_SHEET_URL),
+        frameWidth: CREATURE_SIZE,
+        frameHeight: CREATURE_SIZE,
+      },
+      lurker: {
+        image: await loadImage(LURKER_SHEET_URL),
         frameWidth: CREATURE_SIZE,
         frameHeight: CREATURE_SIZE,
       },
```

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -55,7 +55,10 @@
   readonly lampSheet: SpriteSheet;
   /** Four 72x72 frames, one per facing: the cone with the upgrade `wide-cone` (0029). */
   readonly lampWideSheet: SpriteSheet;
-  /** One sheet per species: three 16x16 frames — two free, one frozen (0008). */
+  /**
+   * One sheet per species: three 16x16 frames — two free, one frozen (0008). The lurker's has a
+   * fourth: the lurker in its window (0038).
+   */
   readonly creatureSheets: Readonly<Record<Species, SpriteSheet>>;
   /** Two 8x8 frames: a full heart, an empty heart (0009, 0012). */
   readonly overviewSheet: SpriteSheet;
```

- [x] **Step 6: Run** `npm run check` — 1625 unit tests.

- [x] **Step 7: Commit** — `Add the lurker as the third species`. Body: on the floor it goes
  by the snippet's rule in everything; what makes it a creature of the second layer is where
  it sits before, and that comes with the panes.

---

### Task 4: The pages of the creatures tab

**Files:**
- Modify: `src/game/state.ts`, `src/game/journal.ts`, `src/render/draw-journal.ts`
- Test: `tests/unit/journal.test.ts`, `tests/unit/draw-journal.test.ts`,
  `tests/unit/help.test.ts`, and the test files with a literal of the open journal

**Interfaces:**
- Consumes: the species of Task 3 — two pages need three species.
- Produces: `JournalState` `{ tab, page }`; `ENTRIES_PER_PAGE = 2`,
  `entryPages(captured): number`, `entriesOn(captured, page): Species[]` in `game/journal`;
  `PAGE_MARK_RIGHT = 304`, `pageMarkOrigin(page, pages, language): Point` in
  `render/draw-journal`.

- [x] **Step 1: The page in every literal of the open journal** — 34 literals — and the
  recording of the help hashes the journal as its tab:

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -367,7 +367,7 @@
   });
 
   it('lies over the journal: the journal, then the help', () => {
-    const reading = playing({ journal: { tab: 'cases' } });
+    const reading = playing({ journal: { tab: 'cases', page: 0 } });
     const without = scene(reading);
     expect(without[0]).toBe('clear #181425');
     expect(without).toContain('fillRect 8,22 304x2 #3a4466');
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -1726,7 +1726,7 @@
 
   it('is not on the screen of the journal, with or without the help over it', () => {
     for (const help of [false, true]) {
-      const calls = whole(playing({ journal: { tab: 'policy' }, help }));
+      const calls = whole(playing({ journal: { tab: 'policy', page: 0 }, help }));
       for (const call of GERMAN_LABEL) {
         expect(calls, `help ${help}: ${call}`).not.toContain(call);
       }
@@ -1742,7 +1742,7 @@
         playing(),
         playing({ dialogue: { speaker: 'figure', index: 0, page: 0 } }),
         playing({ help: true }),
-        playing({ journal: { tab: 'cases' } }),
+        playing({ journal: { tab: 'cases', page: 0 } }),
       ]) {
         const seen = recordingRenderer();
         drawScene(seen, scene, content, settings);
@@ -2113,7 +2113,7 @@
     // The language was switched in this step: its line is not on the card either.
     expect(drawn(card(), { language: 'de', switchedAt: QUIET_TICK }).calls).toStrictEqual(plain);
     expect(drawn(card({ help: true })).calls).toStrictEqual(plain);
-    expect(drawn(card({ journal: { tab: 'creatures' } })).calls).toStrictEqual(plain);
+    expect(drawn(card({ journal: { tab: 'creatures', page: 0 } })).calls).toStrictEqual(plain);
     expect(drawn(card({ overview: { current: 1, max: 5 } })).calls).toStrictEqual(plain);
     expect(plain.some((call) => call.startsWith('fillRect'))).toBe(false);
   });
```

```diff
--- a/tests/unit/help.test.ts
+++ b/tests/unit/help.test.ts
@@ -75,7 +75,7 @@
   });
 
   it('opens over the journal on the cases, which keeps its tab', () => {
-    expect(reading.journal).toStrictEqual({ tab: 'cases' });
+    expect(reading.journal).toStrictEqual({ tab: 'cases', page: 0 });
     expect(update(reading, HELP, OPEN)).toStrictEqual({
       ...reading,
       tick: reading.tick + 1,
@@ -146,7 +146,7 @@
   it('turns no tab of the journal under it, and a press of `journal` does not close that', () => {
     const over = run(OPEN, reading, HELP, NONE, RIGHT, NONE, JOURNAL, NONE);
     expect(over.help).toBe(true);
-    expect(over.journal).toStrictEqual({ tab: 'cases' });
+    expect(over.journal).toStrictEqual({ tab: 'cases', page: 0 });
   });
 });
 
@@ -190,9 +190,9 @@
   it('leaves the journal on its tab when `right` is held since before the closing', () => {
     const closed = run(OPEN, reading, HELP, RIGHT, { ...RIGHT, help: true });
     expect(closed.help).toBe(false);
-    expect(closed.journal).toStrictEqual({ tab: 'cases' });
-    expect(update(closed, RIGHT, OPEN).journal).toStrictEqual({ tab: 'cases' });
-    expect(run(OPEN, closed, NONE, RIGHT).journal).toStrictEqual({ tab: 'policy' });
+    expect(closed.journal).toStrictEqual({ tab: 'cases', page: 0 });
+    expect(update(closed, RIGHT, OPEN).journal).toStrictEqual({ tab: 'cases', page: 0 });
+    expect(run(OPEN, closed, NONE, RIGHT).journal).toStrictEqual({ tab: 'policy', page: 0 });
   });
 });
 
@@ -306,7 +306,8 @@
     // The figure that was recorded: the officer, before the intern of 0033.
     state.figures.slice(0, 1),
     state.dialogue,
-    state.journal,
+    // The journal as it was recorded: its tab, before the page of 0038.
+    state.journal === null ? null : { tab: state.journal.tab },
     { snippet: state.captured.snippet },
     state.overview,
     state.dark,
```

```diff
--- a/tests/unit/rest.test.ts
+++ b/tests/unit/rest.test.ts
@@ -337,7 +337,7 @@
     const frozen: readonly GameState[] = [
       { ...start, dark: 10 },
       { ...start, help: true },
-      { ...start, journal: { tab: 'creatures' } },
+      { ...start, journal: { tab: 'creatures', page: 0 } },
       { ...start, dialogue: { speaker: 'story', index: 0, page: 0 } },
     ];
     for (const state of frozen) {
@@ -349,7 +349,7 @@
 
   it('is not taken by the press that opens the journal', () => {
     const opened = update(tired(OPEN), { ...TALK, journal: true }, OPEN);
-    expect(opened.journal).toStrictEqual({ tab: 'creatures' });
+    expect(opened.journal).toStrictEqual({ tab: 'creatures', page: 0 });
     expect(opened.rested).toBeNull();
   });
 
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -748,7 +748,12 @@
   it('opens on the floor with a press and closes with the next, and nothing has moved', () => {
     const start = createInitialState(FLOOR_MAP);
     const open = update(start, JOURNAL, FLOOR_MAP);
-    expect(open).toStrictEqual({ ...start, tick: 1, held: JOURNAL, journal: { tab: 'creatures' } });
+    expect(open).toStrictEqual({
+      ...start,
+      tick: 1,
+      held: JOURNAL,
+      journal: { tab: 'creatures', page: 0 },
+    });
     const closed = update(update(open, NONE, FLOOR_MAP), JOURNAL, FLOOR_MAP);
     expect(closed).toStrictEqual({ ...start, tick: 3, held: JOURNAL });
   });
@@ -1057,7 +1062,7 @@
       update(start, { ...NONE, talk: true }, TALKERS_MAP),
       update(start, { ...NONE, journal: true }, TALKERS_MAP),
       update(start, { ...NONE, help: true }, TALKERS_MAP),
-      update({ ...start, journal: { tab: 'cases' } }, NONE, TALKERS_MAP),
+      update({ ...start, journal: { tab: 'cases', page: 0 } }, NONE, TALKERS_MAP),
       update({ ...start, help: true }, NONE, TALKERS_MAP),
       update({ ...start, dark: 10 }, NONE, TALKERS_MAP),
     ];
@@ -1374,7 +1379,7 @@
 
   it('waits while the dark, the help, the journal, a talk or a push has the step, and opens after it', () => {
     // The journal: open over the due step, closed with a press, and the close opens next.
-    const reading = solvedAt(1000, { journal: { tab: 'creatures' } });
+    const reading = solvedAt(1000, { journal: { tab: 'creatures', page: 0 } });
     const stillReading = update(reading, NONE, BOTH);
     expect(stillReading.dialogue).toBeNull();
     const shut = update(stillReading, { ...NONE, journal: true }, BOTH);
```

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -355,11 +355,13 @@
   await page.keyboard.down('KeyJ');
   await expect.poll(journal, { message: 'J opens the journal' }).toStrictEqual({
     tab: 'creatures',
+    page: 0,
   });
   await page.keyboard.up('KeyJ');
   await page.keyboard.down('ArrowRight');
   await expect.poll(journal, { message: 'the right arrow turns to the cases' }).toStrictEqual({
     tab: 'cases',
+    page: 0,
   });
   await page.keyboard.up('ArrowRight');
   await expect
```

- [x] **Step 2: The pages in the journal's rules:**

```diff
--- a/tests/unit/journal.test.ts
+++ b/tests/unit/journal.test.ts
@@ -10,7 +10,16 @@
   parseTileset,
   type TileMap,
 } from '../../src/engine/tiled';
-import { ENTRY_TEXT, entriesOf, openJournal, stepJournal, TAB_TEXT } from '../../src/game/journal';
+import {
+  ENTRIES_PER_PAGE,
+  ENTRY_TEXT,
+  entriesOf,
+  entriesOn,
+  entryPages,
+  openJournal,
+  stepJournal,
+  TAB_TEXT,
+} from '../../src/game/journal';
 import { type GameInput, NO_INPUT, pressed } from '../../src/game/player';
 import { type GameState, JOURNAL_TABS, SPECIES } from '../../src/game/state';
 import { createInitialState, update } from '../../src/game/update';
@@ -122,7 +131,7 @@
       ...start,
       tick: 1,
       held: JOURNAL,
-      journal: { tab: 'creatures' },
+      journal: { tab: 'creatures', page: 0 },
     });
   });
 
@@ -138,14 +147,14 @@
       ...pushed,
       tick: 1,
       held: input,
-      journal: { tab: 'creatures' },
+      journal: { tab: 'creatures', page: 0 },
     });
   });
 
   it('opens instead of a dialogue when both keys are pressed next to a figure', () => {
     const map = mapAt(184, 96, [{ name: 'figure:officer', x: 160, y: 96 }]);
     const next = update(createInitialState(map), { ...JOURNAL, talk: true }, map);
-    expect(next.journal).toStrictEqual({ tab: 'creatures' });
+    expect(next.journal).toStrictEqual({ tab: 'creatures', page: 0 });
     expect(next.dialogue).toBeNull();
   });
 
@@ -222,8 +231,13 @@
   });
 
   it('is what stepJournal returns: the tick, the input and the tab, nothing else', () => {
-    const stepped = stepJournal(opened, { tab: 'creatures' }, RIGHT);
-    expect(stepped).toStrictEqual({ ...opened, tick: 2, held: RIGHT, journal: { tab: 'cases' } });
+    const stepped = stepJournal(opened, { tab: 'creatures', page: 0 }, RIGHT);
+    expect(stepped).toStrictEqual({
+      ...opened,
+      tick: 2,
+      held: RIGHT,
+      journal: { tab: 'cases', page: 0 },
+    });
   });
 });
 
@@ -243,13 +257,16 @@
   });
 
   it('stays open while the key that opened it is held', () => {
-    expect(run(OPEN, opened, JOURNAL, JOURNAL).journal).toStrictEqual({ tab: 'creatures' });
+    expect(run(OPEN, opened, JOURNAL, JOURNAL).journal).toStrictEqual({
+      tab: 'creatures',
+      page: 0,
+    });
   });
 
   it('opens on the creatures again, whatever tab it was closed on', () => {
     const closed = run(OPEN, opened, NONE, RIGHT, NONE, JOURNAL);
     expect(closed.journal).toBeNull();
-    expect(run(OPEN, closed, NONE, JOURNAL).journal).toStrictEqual({ tab: 'creatures' });
+    expect(run(OPEN, closed, NONE, JOURNAL).journal).toStrictEqual({ tab: 'creatures', page: 0 });
   });
 
   it('walks the figure at once with a direction key held through the closing', () => {
@@ -282,7 +299,12 @@
   it('is not stepped in the step that opens it', () => {
     expect(start.movers[0]?.x).toBeGreaterThan(64);
     const open = update(start, JOURNAL, map);
-    expect(open).toStrictEqual({ ...start, tick: 4, held: JOURNAL, journal: { tab: 'creatures' } });
+    expect(open).toStrictEqual({
+      ...start,
+      tick: 4,
+      held: JOURNAL,
+      journal: { tab: 'creatures', page: 0 },
+    });
   });
 
   it('stands still for 600 steps with every key but journal, left and right held', () => {
@@ -309,7 +331,7 @@
     const start = createInitialState(OPEN);
     expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
     const cases = run(OPEN, opened, NONE, RIGHT);
-    expect(cases.journal).toStrictEqual({ tab: 'cases' });
+    expect(cases.journal).toStrictEqual({ tab: 'cases', page: 0 });
     expect(JSON.parse(JSON.stringify(cases))).toStrictEqual(cases);
   });
 });
@@ -367,5 +389,107 @@
     }
     expect(talked).toBe(true);
     expect(hash.digest('hex')).toBe(RECORDED);
+  });
+});
+
+describe('the pages of the creatures tab (0038)', () => {
+  const UP: GameInput = { ...NONE, up: true };
+  const DOWN: GameInput = { ...NONE, down: true };
+  const ALL = { snippet: 1, mirage: 1, lurker: 1 };
+  /** The journal open on the creatures, with one of every species captured. */
+  const full: GameState = { ...opened, captured: ALL };
+
+  it('has pages of two entries: one page up to two species, two pages with three', () => {
+    expect(ENTRIES_PER_PAGE).toBe(2);
+    expect(entryPages({ snippet: 0, mirage: 0, lurker: 0 })).toBe(1);
+    expect(entryPages({ snippet: 0, mirage: 0, lurker: 4 })).toBe(1);
+    expect(entryPages({ snippet: 1, mirage: 1, lurker: 0 })).toBe(1);
+    expect(entryPages(ALL)).toBe(2);
+    expect(entriesOn(ALL, 0)).toStrictEqual(['snippet', 'mirage']);
+    expect(entriesOn(ALL, 1)).toStrictEqual(['lurker']);
+    expect(entriesOn(ALL, 2)).toStrictEqual([]);
+    expect(entriesOn({ snippet: 1, mirage: 0, lurker: 1 }, 0)).toStrictEqual(['snippet', 'lurker']);
+  });
+
+  it('opens on page 0', () => {
+    expect(opened.journal).toStrictEqual({ tab: 'creatures', page: 0 });
+    expect(openJournal(createInitialState(OPEN), JOURNAL)?.journal).toStrictEqual({
+      tab: 'creatures',
+      page: 0,
+    });
+  });
+
+  it('turns to the next page with a press of down and back with a press of up', () => {
+    const second = run(OPEN, full, NONE, DOWN);
+    expect(second.journal).toStrictEqual({ tab: 'creatures', page: 1 });
+    const first = run(OPEN, second, NONE, UP);
+    expect(first.journal).toStrictEqual({ tab: 'creatures', page: 0 });
+    // Nothing else changes: the tick, the input, the page.
+    expect(second).toStrictEqual({
+      ...full,
+      tick: full.tick + 2,
+      held: DOWN,
+      journal: { tab: 'creatures', page: 1 },
+    });
   });
+
+  it('turns one page for a key held for 600 steps, and none past either end', () => {
+    let state = update(full, NONE, OPEN);
+    for (let step = 0; step < 600; step += 1) {
+      state = update(state, DOWN, OPEN);
+    }
+    expect(state.journal?.page).toBe(1);
+    // At the last page another press stays there; at the first, a press of up.
+    expect(run(OPEN, state, NONE, DOWN).journal?.page).toBe(1);
+    expect(run(OPEN, full, NONE, UP).journal?.page).toBe(0);
+  });
+
+  it('turns none when up and down are pressed in the same step', () => {
+    const both: GameInput = { ...NONE, up: true, down: true };
+    expect(run(OPEN, full, NONE, both).journal?.page).toBe(0);
+  });
+
+  it('stays on page 0 while there is one page, whatever is pressed', () => {
+    const two: GameState = { ...opened, captured: { snippet: 1, mirage: 1, lurker: 0 } };
+    expect(run(OPEN, two, NONE, DOWN).journal).toStrictEqual({ tab: 'creatures', page: 0 });
+    expect(run(OPEN, opened, NONE, DOWN, NONE, DOWN).journal?.page).toBe(0);
+  });
+
+  it('is page 0 after a turn of the tab and after the journal opens again', () => {
+    const second = run(OPEN, full, NONE, DOWN);
+    const cases = run(OPEN, second, NONE, RIGHT);
+    expect(cases.journal).toStrictEqual({ tab: 'cases', page: 0 });
+    expect(run(OPEN, cases, NONE, LEFT).journal).toStrictEqual({ tab: 'creatures', page: 0 });
+    const again = run(OPEN, second, NONE, JOURNAL, NONE, JOURNAL);
+    expect(again.journal).toStrictEqual({ tab: 'creatures', page: 0 });
+  });
+
+  it('keeps the page when left is pressed on the first tab: no other tab is opened', () => {
+    const second = run(OPEN, full, NONE, DOWN);
+    expect(run(OPEN, second, NONE, LEFT).journal).toStrictEqual({ tab: 'creatures', page: 1 });
+  });
+
+  it('does nothing with up and down on the cases tab and the policy tab', () => {
+    const cases = run(OPEN, full, NONE, RIGHT);
+    const policy = run(OPEN, cases, NONE, RIGHT);
+    for (const on of [cases, policy]) {
+      expect(run(OPEN, on, NONE, DOWN).journal).toStrictEqual(on.journal);
+      expect(run(OPEN, on, NONE, UP).journal).toStrictEqual(on.journal);
+    }
+  });
+
+  it('is what stepJournal returns: the tick, the input and the journal, nothing else', () => {
+    const waiting = update(full, NONE, OPEN);
+    expect(stepJournal(waiting, { tab: 'creatures', page: 0 }, DOWN)).toStrictEqual({
+      ...waiting,
+      tick: waiting.tick + 1,
+      held: DOWN,
+      journal: { tab: 'creatures', page: 1 },
+    });
+  });
+
+  it('survives a JSON round trip on the second page (INV-1)', () => {
+    const second = run(OPEN, full, NONE, DOWN);
+    expect(JSON.parse(JSON.stringify(second))).toStrictEqual(second);
+  });
 });
```

- [x] **Step 3: The pages on the screen:**

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -14,8 +14,10 @@
   ENTRY_PITCH,
   JOURNAL_RULE,
   NOTHING_TEXT,
+  PAGE_MARK_RIGHT,
   POLICY_BLOCK,
   POLICY_GAP,
+  pageMarkOrigin,
   policyOrigins,
   TAB_CLOSED,
   TAB_OPEN,
@@ -116,7 +118,7 @@
   solved: [],
   figures: [],
   dialogue: null,
-  journal: { tab },
+  journal: { tab, page: 0 },
   help: false,
   held: NO_INPUT,
   captured: { snippet: snippets, mirage: 0, lurker: 0 },
@@ -280,7 +282,7 @@
   const cases = (found: number, settings = GERMAN): string[] => {
     const renderer = recordingRenderer();
     const state: GameState = { ...reading('cases'), traces: traces(found) };
-    drawJournal(renderer, state, { tab: 'cases' }, content, settings);
+    drawJournal(renderer, state, { tab: 'cases', page: 0 }, content, settings);
     return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
   };
 
@@ -330,7 +332,13 @@
   it('leaves the creatures and the policy as they were', () => {
     for (const tab of ['creatures', 'policy'] as const) {
       const renderer = recordingRenderer();
-      drawJournal(renderer, { ...reading(tab), traces: traces(3) }, { tab }, content, GERMAN);
+      drawJournal(
+        renderer,
+        { ...reading(tab), traces: traces(3) },
+        { tab, page: 0 },
+        content,
+        GERMAN,
+      );
       expect(renderer.calls).toStrictEqual(draw(reading(tab)).calls);
     }
   });
@@ -359,7 +367,7 @@
       traces: all,
       solved: solved ? [{ region: 'sales', at: 900 }] : [],
     };
-    drawJournal(renderer, state, { tab }, content, settings);
+    drawJournal(renderer, state, { tab, page: 0 }, content, settings);
     return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
   };
 
@@ -407,7 +415,7 @@
     drawJournal(
       renderer,
       { ...reading('creatures', 1), solved: [{ region: 'sales', at: 900 }] },
-      { tab: 'creatures' },
+      { tab: 'creatures', page: 0 },
       content,
       GERMAN,
     );
@@ -440,7 +448,7 @@
   const cases = (found: readonly number[], settings = GERMAN): string[] => {
     const renderer = recordingRenderer();
     const state: GameState = { ...reading('cases'), traces: traces(...found) };
-    drawJournal(renderer, state, { tab: 'cases' }, content, settings);
+    drawJournal(renderer, state, { tab: 'cases', page: 0 }, content, settings);
     return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
   };
 
@@ -509,7 +517,7 @@
       })),
       solved,
     };
-    drawJournal(renderer, state, { tab }, content, settings);
+    drawJournal(renderer, state, { tab, page: 0 }, content, settings);
     return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
   };
   const ALL_OF_MARKETING = [5, 6, 7, 8, 9];
@@ -576,7 +584,7 @@
   const shown = (captured: GameState['captured'], settings = GERMAN) => {
     const renderer = recordingRenderer();
     const state: GameState = { ...reading('creatures'), captured };
-    drawJournal(renderer, state, { tab: 'creatures' }, CONTENT, settings);
+    drawJournal(renderer, state, { tab: 'creatures', page: 0 }, CONTENT, settings);
     const from = renderer.calls.indexOf(RULE) + 1;
     return { calls: renderer.calls.slice(from), sheets: renderer.sheets.slice(from - 5) };
   };
@@ -594,7 +602,7 @@
     drawJournal(
       only,
       { ...reading('creatures'), captured: { snippet: 0, mirage: 1, lurker: 0 } },
-      { tab: 'creatures' },
+      { tab: 'creatures', page: 0 },
       CONTENT,
       GERMAN,
     );
@@ -652,7 +660,13 @@
       light: 0,
       found: found.includes(trace) ? 60 : null,
     }));
-    drawJournal(renderer, { ...reading('cases'), traces }, { tab: 'cases' }, content, settings);
+    drawJournal(
+      renderer,
+      { ...reading('cases'), traces },
+      { tab: 'cases', page: 0 },
+      content,
+      settings,
+    );
     return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
   };
 
@@ -750,7 +764,7 @@
       traces: Array.from({ length: 15 }, (_, trace) => ({ trace, light: 0, found: 60 })),
       solved,
     };
-    drawJournal(renderer, state, { tab }, content, settings);
+    drawJournal(renderer, state, { tab, page: 0 }, content, settings);
     return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
   };
   /** The calls that draw on the line with its top at y. */
@@ -828,5 +842,107 @@
     // `Solved: customer mails went into a translator.`
     expect(at(entries, 132)[0]).toBe('drawSprite 51 at 16,132');
     expect(at(entries, 132)).toHaveLength(40);
+  });
+});
+
+describe('the pages of the creatures tab in the journal (0038)', () => {
+  const ALL = { snippet: 1, mirage: 1, lurker: 1 };
+  const shown = (captured: GameState['captured'], page = 0, settings = GERMAN): string[] => {
+    const renderer = recordingRenderer();
+    const state: GameState = { ...reading('creatures'), captured };
+    drawJournal(renderer, state, { tab: 'creatures', page }, CONTENT, settings);
+    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
+  };
+  /** The calls that draw right of x = 256 on the line of the first name. */
+  const mark = (calls: readonly string[]): string[] =>
+    calls.filter((call) => / at (2[6-9]\d|30\d),35$/.test(call));
+
+  it('places the mark with its right end at x = 304, on the line of the first name', () => {
+    expect([PAGE_MARK_RIGHT, ENTRY_NAME]).toStrictEqual([304, { x: 40, y: 35 }]);
+    // `1 von 2`: seven cells; `1 of 2`: six.
+    expect(pageMarkOrigin(0, 2, 'de')).toStrictEqual({ x: 262, y: 35 });
+    expect(pageMarkOrigin(1, 2, 'en')).toStrictEqual({ x: 268, y: 35 });
+    expect(pageMarkOrigin(9, 12, 'de')).toStrictEqual({ x: 250, y: 35 });
+  });
+
+  it('shows the first two species on page 0, as with two captured, and the mark `1 von 2`', () => {
+    const two = shown({ snippet: 1, mirage: 1, lurker: 0 });
+    const first = shown(ALL);
+    expect(first.slice(0, two.length)).toStrictEqual(two);
+    // `1`, `v`, `o`, `n`, `2`: glyphs 17, 86, 79, 78 and 18, one empty cell between two parts.
+    expect(first.slice(two.length)).toStrictEqual([
+      'drawSprite 17 at 262,35',
+      'drawSprite 86 at 274,35',
+      'drawSprite 79 at 280,35',
+      'drawSprite 78 at 286,35',
+      'drawSprite 18 at 298,35',
+    ]);
   });
+
+  it('shows the lurker alone on page 1, in the first place, and the mark `2 von 2`', () => {
+    const second = shown(ALL, 1);
+    const alone = shown({ snippet: 0, mirage: 0, lurker: 1 });
+    // The entry is drawn as when the lurker is the only species captured.
+    expect(second.slice(0, alone.length)).toStrictEqual(alone);
+    expect(second[0]).toBe(`drawSprite ${ENTRY_FRAME} at 16,32`);
+    // `Mitleser`: `M` is glyph 45; the text starts with `Eine Erweiterung …`, `E` is glyph 37.
+    expect(second[1]).toBe('drawSprite 45 at 40,35');
+    expect(second[9]).toBe('drawSprite 37 at 16,54');
+    expect(mark(second)).toStrictEqual([
+      'drawSprite 18 at 262,35',
+      'drawSprite 86 at 274,35',
+      'drawSprite 79 at 280,35',
+      'drawSprite 78 at 286,35',
+      'drawSprite 18 at 298,35',
+    ]);
+  });
+
+  it('draws the lurker from its own sheet, and four lines of text', () => {
+    const renderer = recordingRenderer();
+    drawJournal(
+      renderer,
+      { ...reading('creatures'), captured: ALL },
+      { tab: 'creatures', page: 1 },
+      CONTENT,
+      GERMAN,
+    );
+    expect(renderer.sheets).toContain(CONTENT.creatureSheets.lurker);
+    expect(renderer.sheets).not.toContain(CONTENT.creatureSheets.snippet);
+    expect(renderer.sheets).not.toContain(CONTENT.creatureSheets.mirage);
+    const rows = renderer.calls
+      .filter((call) => call.startsWith('drawSprite'))
+      .map((call) => Number(call.slice(call.lastIndexOf(',') + 1)));
+    expect([...new Set(rows)].filter((row) => row >= 54)).toStrictEqual([54, 66, 78, 90]);
+  });
+
+  it('reads `1 of 2` and `Lurker` in English', () => {
+    // `1`, `o`, `f`, `2`: glyphs 17, 79, 70 and 18.
+    expect(mark(shown(ALL, 0, ENGLISH))).toStrictEqual([
+      'drawSprite 17 at 268,35',
+      'drawSprite 79 at 280,35',
+      'drawSprite 70 at 286,35',
+      'drawSprite 18 at 298,35',
+    ]);
+    // `Lurker`: `L` is glyph 44.
+    expect(shown(ALL, 1, ENGLISH)[1]).toBe('drawSprite 44 at 40,35');
+  });
+
+  it('draws no mark with one page: one species, two species, or none', () => {
+    for (const captured of [
+      { snippet: 0, mirage: 0, lurker: 0 },
+      { snippet: 0, mirage: 0, lurker: 1 },
+      { snippet: 1, mirage: 1, lurker: 0 },
+      { snippet: 1, mirage: 0, lurker: 1 },
+    ]) {
+      expect(mark(shown(captured))).toStrictEqual([]);
+    }
+  });
+
+  it('draws no mark on the cases tab and the policy tab', () => {
+    for (const tab of ['cases', 'policy'] as const) {
+      const renderer = recordingRenderer();
+      drawJournal(renderer, { ...reading(tab), captured: ALL }, { tab, page: 0 }, CONTENT, GERMAN);
+      expect(mark(renderer.calls)).toStrictEqual([]);
+    }
+  });
 });
```

- [x] **Step 4: Run** `npx tsc --noEmit` — errors in the test files of Steps 1 to 3. Run
  `npx vitest run`. Expected: 27 tests fail in five files — seventeen of the journal, five of its drawing, three of the help, and one each of the rest and the state.

- [x] **Step 5: The state and the rules:**

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -157,6 +157,8 @@
 /** The open journal (0020). What its tabs show is derived from the rest of the state. */
 export interface JournalState {
   readonly tab: JournalTab;
+  /** The page of the creatures tab, from 0 (0038). 0 on the other tabs. */
+  readonly page: number;
 }
 
 /** How many creatures of each species were captured. */
```

```diff
--- a/src/game/journal.ts
+++ b/src/game/journal.ts
@@ -63,6 +63,19 @@
   return SPECIES.filter((species) => captured[species] > 0);
 }
 
+/** Two entries fit the screen: the creatures tab has pages of two (0038). */
+export const ENTRIES_PER_PAGE = 2;
+
+/** How many pages the creatures tab has: at least one, also while nothing is captured. */
+export function entryPages(captured: Captured): number {
+  return Math.max(1, Math.ceil(entriesOf(captured).length / ENTRIES_PER_PAGE));
+}
+
+/** The entries of one page of the creatures tab, in SPECIES order. */
+export function entriesOn(captured: Captured, page: number): Species[] {
+  return entriesOf(captured).slice(page * ENTRIES_PER_PAGE, (page + 1) * ENTRIES_PER_PAGE);
+}
+
 /**
  * The state after a press that opens the journal, or null when `journal` is not pressed: the
  * journal on its first tab, the tick grown, the input remembered. Nothing else changes,
@@ -73,13 +86,20 @@
   if (!pressed(state.held, input, 'journal')) {
     return null;
   }
-  return { ...state, tick: state.tick + 1, held: input, journal: { tab: JOURNAL_TABS[0] } };
+  return {
+    ...state,
+    tick: state.tick + 1,
+    held: input,
+    journal: { tab: JOURNAL_TABS[0], page: 0 },
+  };
 }
 
 /**
  * One step with the journal open: the tick grows and the input is remembered. A press of
  * `journal` closes it. Otherwise a press of `right` alone turns to the next tab and a press of
- * `left` alone to the one before; at either end the tab stays. Nothing else changes.
+ * `left` alone to the one before; at either end the tab stays. A turn to another tab opens it
+ * on page 0. On the creatures tab a press of `down` alone turns to the next page and a press
+ * of `up` alone to the one before; at either end the page stays (0038). Nothing else changes.
  */
 export function stepJournal(state: GameState, journal: JournalState, input: GameInput): GameState {
   const stepped = { ...state, tick: state.tick + 1, held: input };
@@ -88,6 +108,16 @@
   }
   const turn =
     (pressed(state.held, input, 'right') ? 1 : 0) - (pressed(state.held, input, 'left') ? 1 : 0);
-  const index = JOURNAL_TABS.indexOf(journal.tab) + turn;
-  return { ...stepped, journal: { tab: JOURNAL_TABS[index] ?? journal.tab } };
+  const tab = JOURNAL_TABS[JOURNAL_TABS.indexOf(journal.tab) + turn] ?? journal.tab;
+  if (tab !== journal.tab) {
+    return { ...stepped, journal: { tab, page: 0 } };
+  }
+  if (tab !== 'creatures') {
+    return { ...stepped, journal };
+  }
+  const leaf =
+    (pressed(state.held, input, 'down') ? 1 : 0) - (pressed(state.held, input, 'up') ? 1 : 0);
+  const last = entryPages(state.captured) - 1;
+  const page = Math.min(Math.max(journal.page + leaf, 0), last);
+  return { ...stepped, journal: { tab, page } };
 }
```

- [x] **Step 6: The drawing:**

```diff
--- a/src/render/draw-journal.ts
+++ b/src/render/draw-journal.ts
@@ -1,6 +1,13 @@
 import type { Box, Point } from '../engine/tiled';
 import { outcomeOf, policyBlocks } from '../game/cases';
-import { CASE_TEXT, ENTRY_TEXT, entriesOf, REGION_NAME, TAB_TEXT } from '../game/journal';
+import {
+  CASE_TEXT,
+  ENTRY_TEXT,
+  entriesOn,
+  entryPages,
+  REGION_NAME,
+  TAB_TEXT,
+} from '../game/journal';
 import { type GameState, JOURNAL_TABS, type JournalState } from '../game/state';
 import { caseEntries, tracesOf } from '../game/trace';
 import { type Language, type TextKey, textOf } from '../text/text';
@@ -43,6 +50,16 @@
 export const CASE_PITCH = 36;
 /** The third line of a solved case: its outcome (0024). */
 export const CASE_OUTCOME: Point = { x: 16, y: 60 };
+/** The mark of the open page ends here: `1 von 2`, right-aligned on the first name's line (0038). */
+export const PAGE_MARK_RIGHT = 304;
+
+/** Where the mark of page `page` of `pages` starts: its parts with one empty cell between two. */
+export function pageMarkOrigin(page: number, pages: number, language: Language): Point {
+  const cells =
+    String(page + 1).length + 1 + textOf(CASE_TEXT.of, language).length + 1 + String(pages).length;
+  return { x: PAGE_MARK_RIGHT - cells * GLYPH_WIDTH, y: ENTRY_NAME.y };
+}
+
 /** The first block of the policy starts here (0024). */
 export const POLICY_BLOCK: Point = { x: 16, y: 36 };
 /** A block starts this far below the last line of the block before it (0037). */
@@ -107,7 +124,8 @@
     JOURNAL_RULE.height,
     TAB_OPEN,
   );
-  const entries = journal.tab === 'creatures' ? entriesOf(state.captured) : [];
+  // The creatures tab shows the entries of its open page (0038).
+  const entries = journal.tab === 'creatures' ? entriesOn(state.captured, journal.page) : [];
   // The cases are the regions with a found trace (0022).
   const cases =
     journal.tab === 'cases' ? caseEntries(state.traces, tracesOf(content.map.rects)) : [];
@@ -174,4 +192,15 @@
     drawText(renderer, content.fontSheet, name, language, ENTRY_NAME.x, ENTRY_NAME.y + down);
     drawText(renderer, content.fontSheet, text, language, ENTRY_LINES.x, ENTRY_LINES.y + down);
   }
+  // With more than one page the tab says which one is open: `1 von 2` (0038).
+  const pages = journal.tab === 'creatures' ? entryPages(state.captured) : 1;
+  if (pages > 1) {
+    const origin = pageMarkOrigin(journal.page, pages, language);
+    let { x } = origin;
+    drawNumber(renderer, content.fontSheet, journal.page + 1, x, origin.y);
+    x += (String(journal.page + 1).length + 1) * GLYPH_WIDTH;
+    drawText(renderer, content.fontSheet, CASE_TEXT.of, language, x, origin.y);
+    x += (textOf(CASE_TEXT.of, language).length + 1) * GLYPH_WIDTH;
+    drawNumber(renderer, content.fontSheet, pages, x, origin.y);
+  }
 }
```

- [x] **Step 7: Run** `npm run check` — 1643 unit tests. The recorded digest of the
  help passes: it hashes the journal's tab. With a dev server running,
  `npx playwright test -g "J opens the journal"` passes: the smoke test reads the page too.

- [x] **Step 8: Commit** — `Give the creatures tab pages of two entries`. Body: a third
  species does not fit the screen; down and up turn the page, and the tab says which one is
  open.

---

### Task 5: The panes of a map, and the state

**Files:**
- Create: `src/game/pane.ts`, `tests/unit/pane.test.ts`
- Modify: `src/game/rects.ts`, `src/game/state.ts`, `src/game/update.ts`,
  `src/game/overview.ts`
- Test: the five test files with a full literal of the state

**Interfaces:**
- Produces: `PANE_PREFIX = 'pane:'`; `Pane` `{ region, box, drop }`; `dropPoint(box): Point`;
  `panesOf(map: TileMap): Pane[]`; `openPanes(panes): PaneState[]`;
  `restedPanes(states): PaneState[]`; `PaneState` `{ pane, lit }`; `GameState.panes`.

After this task a map may hold panes. They are open in the state and do nothing.

- [x] **Step 1: The field in every full literal of the state** — ten literals:

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -97,6 +97,7 @@
 /** A game with five hearts and the officer standing; the help as `fields` say. */
 const playing = (fields: Partial<GameState> = {}): GameState => ({
   tick: 700,
+  panes: [],
   rested: null,
   finished: null,
   presented: 0,
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -96,6 +96,7 @@
 /** A game with the journal open on `tab`: five hearts, the lamp on, `snippets` captured. */
 const reading = (tab: JournalTab, snippets = 0): GameState => ({
   tick: 100,
+  panes: [],
   rested: null,
   finished: null,
   presented: 0,
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -199,6 +199,7 @@
   lampOn = false,
 ): GameState => ({
   tick: QUIET_TICK,
+  panes: [],
   rested: null,
   finished: null,
   presented: 0,
```

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -162,6 +162,7 @@
   const MAP = grassMap(40, 30, { x: 320, y: 240 }, [{ name: 'wake', x: 80, y: 60 }]);
   const FALLEN: GameState = {
     tick: 500,
+    panes: [],
     rested: null,
     finished: null,
     presented: 0,
@@ -195,6 +196,7 @@
     expect(darkSteps(43)).toStrictEqual({
       ...FALLEN,
       tick: 543,
+      panes: [],
       rested: null,
       finished: null,
       presented: 0,
@@ -209,6 +211,7 @@
     const player = figure(80, 60, 'down');
     expect(woken).toStrictEqual({
       tick: 544,
+      panes: [],
       rested: null,
       finished: null,
       presented: 0,
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -87,6 +87,7 @@
   it('starts at tick 0 with the player at the spawn, facing down, standing, the camera on it', () => {
     expect(createInitialState(MAP)).toStrictEqual({
       tick: 0,
+      panes: [],
       rested: null,
       finished: null,
       presented: 0,
@@ -159,6 +160,7 @@
     const next = update(
       {
         tick: 41,
+        panes: [],
         rested: null,
         finished: null,
         presented: 0,
@@ -191,6 +193,7 @@
   it('leaves its input unchanged', () => {
     const state: GameState = {
       tick: 7,
+      panes: [],
       rested: null,
       finished: null,
       presented: 0,
@@ -215,6 +218,7 @@
     update(state, RIGHT, MAP);
     expect(state).toStrictEqual({
       tick: 7,
+      panes: [],
       rested: null,
       finished: null,
       presented: 0,
```

- [x] **Step 2: The tests of the panes.** Create `tests/unit/pane.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { dropPoint, openPanes, panesOf, restedPanes } from '../../src/game/pane';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import { PANE_PREFIX, rectsOf } from '../../src/game/rects';
import { restsOf } from '../../src/game/rest';
import type { GameState } from '../../src/game/state';
import { tracesOf } from '../../src/game/trace';
import { createInitialState, newGame, update } from '../../src/game/update';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});
/** A pane on cell (6, 8): its centre is (104, 136), 36 px below the spawn. */
const NEAR = rect('pane:support', 96, 128);
/** A second pane on cell (15, 3), far from the spawn, over nothing. */
const FAR = rect('pane:support', 240, 48);
/** The trace under the near pane, and a trace beside it that no pane covers. */
const UNDER = rect('trace:support', 96, 128);
const BESIDE = rect('trace:support', 80, 128);
const RECTS: readonly NamedRect[] = [UNDER, BESIDE, NEAR, FAR];
/** 20x12 cells of open floor; the figure at (x, y) looks down. */
const mapAt = (
  x = 104,
  y = 100,
  rects: readonly NamedRect[] = RECTS,
  points: readonly NamedPoint[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);
const MAP = mapAt();
const steps = (start: GameState, input: GameInput, count: number, map = MAP): GameState => {
  let state = start;
  for (let i = 0; i < count; i += 1) {
    state = update(state, input, map);
  }
  return state;
};

describe('the panes among the rectangles of a map (0038)', () => {
  it('are known by the prefix of the name: the sixth kind of rectangle', () => {
    expect(PANE_PREFIX).toBe('pane:');
    expect(rectsOf(RECTS, PANE_PREFIX)).toStrictEqual([NEAR, FAR]);
  });

  it('are read in file order, each with its region, its cell and its drop point', () => {
    expect(panesOf(MAP)).toStrictEqual([
      {
        region: 'support',
        box: { x: 96, y: 128, width: 16, height: 16 },
        drop: { x: 136, y: 152 },
      },
      {
        region: 'support',
        box: { x: 240, y: 48, width: 16, height: 16 },
        drop: { x: 280, y: 72 },
      },
    ]);
  });

  it('drop their lurker in the middle of the cell two to the right and one below', () => {
    const cell = (x: number, y: number) => dropPoint({ x, y, width: 16, height: 16 });
    // The three of the floor: (72, 61), (93, 67) and (62, 73).
    expect(cell(1152, 976)).toStrictEqual({ x: 1192, y: 1000 });
    expect(cell(1488, 1072)).toStrictEqual({ x: 1528, y: 1096 });
    expect(cell(992, 1168)).toStrictEqual({ x: 1032, y: 1192 });
  });

  it('are skipped by the traces and the rests, and skip them', () => {
    expect(tracesOf(RECTS)).toHaveLength(2);
    expect(restsOf(RECTS)).toStrictEqual([]);
    expect(panesOf(mapAt(104, 100, [UNDER, rect('rest:coffee', 0, 0)]))).toStrictEqual([]);
    expect(panesOf(mapAt(104, 100, []))).toStrictEqual([]);
  });

  it.each([
    [98, 128, 16, 16],
    [96, 130, 16, 16],
    [96, 128, 32, 16],
    [96, 128, 16, 4],
  ])('refuses the box (%d, %d, %d, %d): it is not one cell', (x, y, width, height) => {
    expect(() => panesOf(mapAt(104, 100, [rect('pane:support', x, y, width, height)]))).toThrow(
      `pane pane:support (${x}, ${y}, ${width}, ${height}) is not one cell`,
    );
  });

  it('refuses a region the world data does not know', () => {
    expect(() => panesOf(mapAt(104, 100, [rect('pane:cellar', 96, 128)]))).toThrow(
      'pane pane:cellar names no region',
    );
  });

  it('refuses a pane whose drop point lies outside the map', () => {
    // Two cells from the right edge, and in the lowest row.
    expect(() => panesOf(mapAt(104, 100, [rect('pane:support', 288, 80)]))).toThrow(
      'pane pane:support (288, 80, 16, 16) has no free drop point',
    );
    expect(() => panesOf(mapAt(104, 100, [rect('pane:support', 96, 176)]))).toThrow(
      'pane pane:support (96, 176, 16, 16) has no free drop point',
    );
  });

  it('refuses a pane whose drop point lies in a solid box, and takes one beside the box', () => {
    // The drop point of the near pane is (136, 152), in cell (8, 9).
    const withBox = (box: { x: number; y: number; width: number; height: number }): TileMap => ({
      ...MAP,
      solids: MAP.solids.map((boxes, i) => (i === 9 * 20 + 8 ? [box] : boxes)),
    });
    expect(() => panesOf(withBox({ x: 128, y: 144, width: 16, height: 16 }))).toThrow(
      'pane pane:support (96, 128, 16, 16) has no free drop point',
    );
    // A strip on the cell's top edge does not hold the point.
    expect(panesOf(withBox({ x: 128, y: 144, width: 16, height: 4 }))).toHaveLength(2);
  });

  it('refuses such a map before the game starts', () => {
    expect(() => createInitialState(mapAt(104, 100, [rect('pane:cellar', 96, 128)]))).toThrow(
      'pane pane:cellar names no region',
    );
    expect(() => createInitialState(mapAt(104, 100, [rect('pane:support', 288, 80)]))).toThrow(
      'pane pane:support (288, 80, 16, 16) has no free drop point',
    );
  });
});

describe('the panes in the state (0038)', () => {
  const start = createInitialState(MAP);

  it('start open and not lit, in the order of the map', () => {
    const open = [
      { pane: 0, lit: false },
      { pane: 1, lit: false },
    ];
    expect(start.panes).toStrictEqual(open);
    expect(newGame(MAP).panes).toStrictEqual(open);
    expect(openPanes(panesOf(MAP))).toStrictEqual(open);
  });

  it('are none on a map without them', () => {
    expect(createInitialState(mapAt(104, 100, [])).panes).toStrictEqual([]);
  });

  it('stay open through 600 steps in which nothing is pressed', () => {
    expect(steps(start, NONE, 600).panes).toStrictEqual(start.panes);
    expect(steps(start, { ...NONE, right: true }, 60).panes).toStrictEqual(start.panes);
  });

  it('survive the wake: the open ones stay open, the closed ones closed, and none is lit', () => {
    expect(restedPanes([{ pane: 1, lit: true }])).toStrictEqual([{ pane: 1, lit: false }]);
    expect(restedPanes([])).toStrictEqual([]);
    // The 44th step of the dark is the wake (0009).
    const woken = update({ ...start, panes: [{ pane: 1, lit: true }], dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.panes).toStrictEqual([{ pane: 1, lit: false }]);
  });

  it('survives a JSON round trip at the start and with a pane closed (INV-1)', () => {
    for (const state of [start, { ...start, panes: [{ pane: 1, lit: true }] }]) {
      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    }
  });
});
```

- [x] **Step 3: Run** `npx tsc --noEmit` — errors: the field and the module do not exist. Run
  `npx vitest run`. Expected: `pane.test.ts` does not load, and two tests fail — `the 44th step, dark 45, sets the world right` (overview) and `starts at tick 0 with the player at the spawn, facing down, standing, the camera on it` (state).

- [x] **Step 4: The kind of rectangle:**

```diff
--- a/src/game/rects.ts
+++ b/src/game/rects.ts
@@ -5,7 +5,7 @@
  * The kinds of rectangle a map may hold (architecture.md §6): what a rectangle is, is the
  * game's business, and its name says it. A shadow wall is `shadow:<region>` (0014), a trace
  * `trace:<region>` (0022), an area of a region `region:<id>` (0023), a rest `rest:<what>`
- * (0027). Pure.
+ * (0027), a pane `pane:<region>` (0038). Pure.
  */
 
 /** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
@@ -16,8 +16,16 @@
 export const REGION_PREFIX = 'region:';
 /** A rectangle whose name starts with this is a rest; the rest of the name is what it is (0027). */
 export const REST_PREFIX = 'rest:';
+/** A rectangle whose name starts with this is a pane; the rest of the name is its region (0038). */
+export const PANE_PREFIX = 'pane:';
 
-const PREFIXES: readonly string[] = [WALL_PREFIX, TRACE_PREFIX, REGION_PREFIX, REST_PREFIX];
+const PREFIXES: readonly string[] = [
+  WALL_PREFIX,
+  TRACE_PREFIX,
+  REGION_PREFIX,
+  REST_PREFIX,
+  PANE_PREFIX,
+];
 
 /** Exactly one cell: the corner on the grid, a tile wide and a tile high. */
 export function isCell(box: Box): boolean {
```

- [x] **Step 5: The panes.** Create `src/game/pane.ts`:

```ts
import type { Box } from '../engine/collision';
import { type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { isCell, PANE_PREFIX, rectsOf } from './rects';
import type { PaneState } from './state';
import { densityOf } from './world';

/**
 * The panes (gameplay.md §3, feature 0038). On a screen of the room a small pane is open that
 * nobody opened, and a lurker sits in it where no light holds it. The text of the game and the
 * spec call the thing by its everyday name; in the map, in the state and in this directory it
 * is a pane, because the architecture test keeps that browser name out of `src/game/` (INV-2).
 * A pane is a rectangle of the map named `pane:<region>`, exactly one cell, on the cell of a
 * desk with a screen. While it is open it hides the trace on its cell; a press of `talk` in
 * reach closes it, and its lurker drops to the floor. Pure data and pure functions; the panes
 * are read from the map on every call and kept nowhere.
 */

export interface Pane {
  readonly region: string;
  /** Map pixels: one cell. */
  readonly box: Box;
  /** The feet of the lurker that drops when the pane is closed, in map pixels. */
  readonly drop: Point;
}

/**
 * Where the lurker of a pane drops: the middle of the cell two to the right of the pane and
 * one below — inside the cubicle, beside the chair.
 */
export function dropPoint(box: Box): Point {
  return { x: box.x + 2 * TILE_SIZE + TILE_SIZE / 2, y: box.y + TILE_SIZE + TILE_SIZE / 2 };
}

/** Whether a point lies in the map and in no solid box of its cell. */
function isFree(point: Point, map: TileMap): boolean {
  const column = Math.floor(point.x / TILE_SIZE);
  const row = Math.floor(point.y / TILE_SIZE);
  if (column < 0 || row < 0 || column >= map.width || row >= map.height) {
    return false;
  }
  const boxes = map.solids[row * map.width + column] ?? [];
  return !boxes.some(
    (box) =>
      point.x >= box.x &&
      point.x < box.x + box.width &&
      point.y >= box.y &&
      point.y < box.y + box.height,
  );
}

/**
 * The panes of a map, in the order of its rectangles. Rejects a box that is not one cell, a
 * region the world data does not know, and a pane whose drop point lies outside the map or
 * in a solid box.
 */
export function panesOf(map: TileMap): Pane[] {
  return rectsOf(map.rects, PANE_PREFIX).map((rect) => {
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    const at = `(${box.x}, ${box.y}, ${box.width}, ${box.height})`;
    if (!isCell(box)) {
      throw new Error(`pane ${rect.name} ${at} is not one cell`);
    }
    const region = rect.name.slice(PANE_PREFIX.length);
    if (densityOf(region) === undefined) {
      throw new Error(`pane ${rect.name} names no region`);
    }
    const drop = dropPoint(box);
    if (!isFree(drop, map)) {
      throw new Error(`pane ${rect.name} ${at} has no free drop point`);
    }
    return { region, box, drop };
  });
}

/** Every pane of the map open and not lit: the panes a game starts with. */
export function openPanes(panes: readonly Pane[]): PaneState[] {
  return panes.map((_pane, pane) => ({ pane, lit: false }));
}

/** The panes when the figure wakes (0009): the open ones stay open, and none is lit. */
export function restedPanes(states: readonly PaneState[]): PaneState[] {
  return states.map((state) => ({ ...state, lit: false }));
}
```

- [x] **Step 6: The state, the start and the wake:**

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -150,6 +150,14 @@
   readonly page: number;
 }
 
+/** A pane that is open (0038). A closed pane has left the list for good. */
+export interface PaneState {
+  /** Index among the panes of the map. */
+  readonly pane: number;
+  /** Whether the lamp's light was on it in the last step: the light does not hold it. */
+  readonly lit: boolean;
+}
+
 /** The tabs of the journal (gameplay.md §7), in their order on the screen (0020). */
 export const JOURNAL_TABS = ['creatures', 'cases', 'policy'] as const;
 export type JournalTab = (typeof JOURNAL_TABS)[number];
@@ -200,6 +208,8 @@
   readonly traces: readonly TraceState[];
   /** The solved cases, in the order they were solved (0024). */
   readonly solved: readonly SolvedCase[];
+  /** The open panes, in the map's order (0038). */
+  readonly panes: readonly PaneState[];
   /** The last rest taken, or null (0027); the notice of a rest is derived from it. */
   readonly rested: Rested | null;
   /**
```

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -10,6 +10,7 @@
 import { spreadOf } from './lamp';
 import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
 import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
+import { openPanes, panesOf } from './pane';
 import { type GameInput, NO_INPUT, stepPlayer } from './player';
 import { areasOf } from './region';
 import { restsOf, takeRest } from './rest';
@@ -71,6 +72,7 @@
     shadowWalls: standingWalls(walls),
     traces: hiddenTraces(tracesOf(map.rects)),
     solved: [],
+    panes: openPanes(panesOf(map)),
     rested: null,
     finished: null,
     presented: 0,
@@ -240,6 +242,7 @@
       spread,
     ),
     solved: state.solved,
+    panes: state.panes,
     rested,
     finished: state.finished,
     presented: state.presented,
```

```diff
--- a/src/game/overview.ts
+++ b/src/game/overview.ts
@@ -1,6 +1,7 @@
 import type { Point, TileMap } from '../engine/tiled';
 import { followPlayer } from './camera';
 import { DIRECTIONS } from './lamp';
+import { restedPanes } from './pane';
 import { restedWalls } from './shadow';
 import {
   type CreatureState,
@@ -145,6 +146,7 @@
     shadowWalls: restedWalls(state.shadowWalls),
     traces: restedTraces(state.traces),
     solved: state.solved,
+    panes: restedPanes(state.panes),
     rested: state.rested,
     finished: state.finished,
     presented: state.presented,
```

- [x] **Step 7: Run** `npm run check` — 1661 unit tests; one of them is the
  architecture test of `pane.ts`. If it reports the browser name `window`, a comment or an
  identifier says window: write pane.

- [x] **Step 8: Commit** — `Read the panes of a map and keep the open ones in the state`.
  Body: a pane is the window of the spec; `src/game/` may not say that word (INV-2).

---

### Task 6: An open pane

**Files:**
- Modify: `src/game/pane.ts`, `src/game/trace.ts`, `src/game/notice.ts`, `src/game/update.ts`
- Test: `tests/unit/pane.test.ts`

**Interfaces:**
- Consumes: Task 5; `notice.pane-open` (Task 1).
- Produces: `coveredCells(states, panes): Box[]`; `stepPanes(states, panes, player, lampOn,
  map, spread?)`; `stepTraces(..., spread?, covered?)`; `NOTICE_PANE_OPEN`.

- [x] **Step 1: Write the failing tests:**

```diff
--- a/tests/unit/pane.test.ts
+++ b/tests/unit/pane.test.ts
@@ -1,15 +1,26 @@
 import { describe, expect, it } from 'vitest';
 import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
-import { dropPoint, openPanes, panesOf, restedPanes } from '../../src/game/pane';
+import { SPREAD } from '../../src/game/lamp';
+import { NOTICE_PANE_OPEN, NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
+import {
+  coveredCells,
+  dropPoint,
+  openPanes,
+  panesOf,
+  restedPanes,
+  stepPanes,
+} from '../../src/game/pane';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { PANE_PREFIX, rectsOf } from '../../src/game/rects';
 import { restsOf } from '../../src/game/rest';
 import type { GameState } from '../../src/game/state';
-import { tracesOf } from '../../src/game/trace';
+import { stepTraces, tracesOf } from '../../src/game/trace';
 import { createInitialState, newGame, update } from '../../src/game/update';
+import { textKey } from '../../src/text/text';
 import { grassMap } from './grass-map';
 
 const NONE = NO_INPUT;
+const SHINE: GameInput = { ...NONE, lamp: true };
 const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
   name,
   x,
@@ -164,3 +175,92 @@
     }
   });
 });
+
+describe('an open pane (0038)', () => {
+  const start = createInitialState(MAP);
+  const LIT = [
+    { pane: 0, lit: true },
+    { pane: 1, lit: false },
+  ];
+
+  it('is lit while the light is on its cell, and not with the lamp off or turned away', () => {
+    const lit = update(start, SHINE, MAP);
+    expect(lit.panes).toStrictEqual(LIT);
+    expect(update(lit, NONE, MAP).panes).toStrictEqual(start.panes);
+    // With the lamp on a direction key only turns the figure: up, away from the pane.
+    const away = update(lit, { ...SHINE, up: true }, MAP);
+    expect([away.lamp.on, away.player.facing]).toStrictEqual([true, 'up']);
+    expect(away.panes).toStrictEqual(start.panes);
+  });
+
+  it('is what stepPanes returns: the same state while nothing changes', () => {
+    const panes = panesOf(MAP);
+    expect(stepPanes(start.panes, panes, start.player, true, MAP)).toStrictEqual(LIT);
+    const dark = stepPanes(start.panes, panes, start.player, false, MAP);
+    expect(dark).toStrictEqual(start.panes);
+    expect(dark[0]).toBe(start.panes[0]);
+  });
+
+  it('holds against the light: 600 lit steps close nothing and capture nothing', () => {
+    const held = steps(start, SHINE, 600);
+    expect(held.panes).toStrictEqual(LIT);
+    expect(held.creatures).toStrictEqual([]);
+    expect(held.captured).toStrictEqual(start.captured);
+  });
+
+  it('hides the trace on its cell: it is not found in 600 lit steps, and its count stays 0', () => {
+    let state = start;
+    for (let step = 0; step < 600; step += 1) {
+      state = update(state, SHINE, MAP);
+      expect(state.traces[0], `step ${step}`).toStrictEqual({ trace: 0, light: 0, found: null });
+    }
+  });
+
+  it('does not hide the trace beside it: that one is found in the 60th lit step', () => {
+    const before = steps(start, SHINE, 59);
+    expect(before.traces[1]).toStrictEqual({ trace: 1, light: 59, found: null });
+    expect(update(before, SHINE, MAP).traces[1]).toStrictEqual({ trace: 1, light: 0, found: 60 });
+  });
+
+  it('is told to the traces as a covered cell: out of the light, whatever the lamp does', () => {
+    const traces = tracesOf(RECTS);
+    const covered = coveredCells(start.panes, panesOf(MAP));
+    expect(covered).toStrictEqual([
+      { x: 96, y: 128, width: 16, height: 16 },
+      { x: 240, y: 48, width: 16, height: 16 },
+    ]);
+    expect(coveredCells([{ pane: 1, lit: false }], panesOf(MAP))).toStrictEqual([covered[1]]);
+    const lights = (cells: typeof covered): number[] =>
+      stepTraces(start.traces, traces, start.player, true, MAP, 5, SPREAD, cells).map(
+        (trace) => trace.light,
+      );
+    expect(lights(covered)).toStrictEqual([0, 1]);
+    expect(lights([])).toStrictEqual([1, 1]);
+  });
+
+  it('says so in the notice while the light is on it, and no longer', () => {
+    expect(NOTICE_PANE_OPEN).toBe(textKey('notice.pane-open'));
+    expect(noticeOf(start)).toBeNull();
+    const lit = update(start, SHINE, MAP);
+    expect(noticeOf(lit)).toBe(NOTICE_PANE_OPEN);
+    expect(noticeOf(steps(lit, SHINE, 300))).toBe(NOTICE_PANE_OPEN);
+    expect(noticeOf(update(lit, NONE, MAP))).toBeNull();
+  });
+
+  it('comes right after a wall that holds in the order of the notices, before everything else', () => {
+    const lit = update(start, SHINE, MAP);
+    const walled: GameState = { ...lit, shadowWalls: [{ wall: 0, lit: true, light: 0 }] };
+    expect(noticeOf(walled)).toBe(NOTICE_SHADOW_TOO_DENSE);
+    // A case solved and a trace found in this very step, and a coffee taken: the pane's line.
+    const busy: GameState = {
+      ...lit,
+      solved: [{ region: 'sales', at: lit.tick }],
+      traces: [
+        { trace: 0, light: 0, found: lit.tick },
+        { trace: 1, light: 0, found: null },
+      ],
+      rested: { at: lit.tick, result: 'restored' },
+    };
+    expect(noticeOf(busy)).toBe(NOTICE_PANE_OPEN);
+  });
+});
```

- [x] **Step 2: Run them.** `npx tsc --noEmit` reports four errors in this test: the functions
  and the notice do not exist. `npx vitest run tests/unit/pane.test.ts` — 7 of 25 tests fail,
  all of the new block. Its eighth, that the trace beside the pane is found in the 60th lit
  step, is green before the code: it holds what is already there. Vitest does not check
  types: the file loads, and what is missing is `undefined`.

- [x] **Step 3: The traces skip a covered cell:**

```diff
--- a/src/game/trace.ts
+++ b/src/game/trace.ts
@@ -92,7 +92,8 @@
  * One step of the traces against the stepped figure and the lamp of that step. A found trace
  * never changes. A trace in the light counts one step more, and in the step it reaches
  * FIND_STEPS it is found: `found` is `tick`, the tick of this step, and the count is 0 again.
- * A trace out of the light starts again from 0.
+ * A trace out of the light starts again from 0. A trace whose cell is one of `covered` — the
+ * cells of the open panes (0038) — is not in the light, whatever the lamp does.
  */
 export function stepTraces(
   states: readonly TraceState[],
@@ -102,13 +103,15 @@
   map: TileMap,
   tick: number,
   spread: number = SPREAD,
+  covered: readonly Box[] = [],
 ): TraceState[] {
   return states.map((state) => {
     const trace = traces[state.trace];
     if (state.found !== null || trace === undefined) {
       return state;
     }
-    if (!traceInLight(trace, player, lampOn, map, spread)) {
+    const hidden = covered.some((box) => box.x === trace.box.x && box.y === trace.box.y);
+    if (hidden || !traceInLight(trace, player, lampOn, map, spread)) {
       return state.light === 0 ? state : { ...state, light: 0 };
     }
     return state.light + 1 < FIND_STEPS
```

- [x] **Step 4: The step of the open panes:**

```diff
--- a/src/game/pane.ts
+++ b/src/game/pane.ts
@@ -1,7 +1,9 @@
 import type { Box } from '../engine/collision';
 import { type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
+import { SPREAD } from './lamp';
 import { isCell, PANE_PREFIX, rectsOf } from './rects';
-import type { PaneState } from './state';
+import type { PaneState, PlayerState } from './state';
+import { traceInLight } from './trace';
 import { densityOf } from './world';
 
 /**
@@ -77,6 +79,35 @@
   return panes.map((_pane, pane) => ({ pane, lit: false }));
 }
 
+/** The cells of the open panes: a trace on one of them is hidden. */
+export function coveredCells(states: readonly PaneState[], panes: readonly Pane[]): Box[] {
+  return states.flatMap((state) => {
+    const pane = panes[state.pane];
+    return pane === undefined ? [] : [pane.box];
+  });
+}
+
+/**
+ * One step of the open panes against the stepped figure and the lamp of that step: a pane
+ * is lit while the light is on its cell, by the test of a trace — and nothing else happens to
+ * it. The light does not hold a lurker in its pane. `map` is the map with the shadow walls
+ * standing, as for a trace.
+ */
+export function stepPanes(
+  states: readonly PaneState[],
+  panes: readonly Pane[],
+  player: PlayerState,
+  lampOn: boolean,
+  map: TileMap,
+  spread: number = SPREAD,
+): PaneState[] {
+  return states.map((state) => {
+    const pane = panes[state.pane];
+    const lit = pane !== undefined && traceInLight(pane, player, lampOn, map, spread);
+    return lit === state.lit ? state : { ...state, lit };
+  });
+}
+
 /** The panes when the figure wakes (0009): the open ones stay open, and none is lit. */
 export function restedPanes(states: readonly PaneState[]): PaneState[] {
   return states.map((state) => ({ ...state, lit: false }));
```

- [x] **Step 5: The notice,** right after a wall that holds:

```diff
--- a/src/game/notice.ts
+++ b/src/game/notice.ts
@@ -37,6 +37,9 @@
 /** Tune: two seconds from the press. */
 export const REST_NOTICE_STEPS = 120;
 
+/** The light is on an open pane (0038): shown while it is, like the line of a wall that holds. */
+export const NOTICE_PANE_OPEN: TextKey = textKey('notice.pane-open');
+
 /** The lamp's key (0026): shown from the step the lamp is handed over until it is held once. */
 export const NOTICE_LAMP: TextKey = textKey('notice.lamp');
 
@@ -65,7 +68,8 @@
 /**
  * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
  * is on and cannot lift: a wall that gives way counts from 1 in its first step; that notice
- * comes first. Then, for CASE_NOTICE_STEPS steps from the solving step, that a case is solved
+ * comes first; then, while the light is on an open pane, that the light does not hold what
+ * reads along there (0038). Then, for CASE_NOTICE_STEPS steps from the solving step, that a case is solved
  * (0024), and for the UPGRADE_NOTICE_STEPS steps after them what the case earned, if it earned
  * an upgrade (0029). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was
  * found (0022).
@@ -78,6 +82,10 @@
   if (state.lamp.on && holds) {
     return NOTICE_SHADOW_TOO_DENSE;
   }
+  // The light is on an open pane, and does not hold what sits in it (0038).
+  if (state.lamp.on && state.panes.some((pane) => pane.lit)) {
+    return NOTICE_PANE_OPEN;
+  }
   const solved = state.solved.some((entry) => state.tick - entry.at < CASE_NOTICE_STEPS);
   if (solved) {
     return NOTICE_CASE_SOLVED;
```

- [x] **Step 6: `update`** steps the panes and tells the traces which cells are covered:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -10,7 +10,7 @@
 import { spreadOf } from './lamp';
 import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
 import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
-import { openPanes, panesOf } from './pane';
+import { coveredCells, openPanes, panesOf, stepPanes } from './pane';
 import { type GameInput, NO_INPUT, stepPlayer } from './player';
 import { areasOf } from './region';
 import { restsOf, takeRest } from './rest';
@@ -208,6 +208,7 @@
   // The figure, the push and the creatures meet the walls standing at the start of the step.
   const walled = withWalls(content, walls, state.shadowWalls);
   const stepped = stepPlayer(state.player, input, walled);
+  const panes = panesOf(content);
   const { creatures, captured } = stepCreatures(
     state.creatures,
     state.captured,
@@ -240,9 +241,12 @@
       walled,
       state.tick + 1,
       spread,
+      // A trace under an open pane is hidden (0038).
+      coveredCells(state.panes, panes),
     ),
     solved: state.solved,
-    panes: state.panes,
+    // The light does not hold a lurker in its pane; the pane only knows it is lit.
+    panes: stepPanes(state.panes, panes, stepped, lamp.on, walled, spread),
     rested,
     finished: state.finished,
     presented: state.presented,
```

- [x] **Step 7: Run** `npm run check` — 1669 unit tests.

- [x] **Step 8: Commit** — `Let an open pane hide its trace and hold against the light`.
  Body: the lamp alone does not get this creature; the line says what is and nothing more.

---

### Task 7: Closing a pane

**Files:**
- Modify: `src/game/pane.ts`, `src/game/update.ts`, `src/game/cases.ts`
- Test: `tests/unit/pane.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 5 and 6.
- Produces: `PANE_DISTANCE = 40`; `paneCentre(pane): Point`; `paneInReach(player, states,
  panes, map): PaneState | null`; `closePane(state, input, map): { panes, lurker } | null`;
  `clearRegion` removes the open panes of the region.

- [x] **Step 1: Write the failing tests:**

```diff
--- a/tests/unit/pane.test.ts
+++ b/tests/unit/pane.test.ts
@@ -1,11 +1,16 @@
 import { describe, expect, it } from 'vitest';
 import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
+import { clearRegion } from '../../src/game/cases';
 import { SPREAD } from '../../src/game/lamp';
 import { NOTICE_PANE_OPEN, NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
 import {
+  closePane,
   coveredCells,
   dropPoint,
   openPanes,
+  PANE_DISTANCE,
+  paneCentre,
+  paneInReach,
   panesOf,
   restedPanes,
   stepPanes,
@@ -13,7 +18,7 @@
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { PANE_PREFIX, rectsOf } from '../../src/game/rects';
 import { restsOf } from '../../src/game/rest';
-import type { GameState } from '../../src/game/state';
+import type { CreatureState, GameState } from '../../src/game/state';
 import { stepTraces, tracesOf } from '../../src/game/trace';
 import { createInitialState, newGame, update } from '../../src/game/update';
 import { textKey } from '../../src/text/text';
@@ -21,6 +26,7 @@
 
 const NONE = NO_INPUT;
 const SHINE: GameInput = { ...NONE, lamp: true };
+const TALK: GameInput = { ...NONE, talk: true };
 const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
   name,
   x,
@@ -262,5 +268,171 @@
       rested: { at: lit.tick, result: 'restored' },
     };
     expect(noticeOf(busy)).toBe(NOTICE_PANE_OPEN);
+  });
+});
+
+describe('closing a pane (0038)', () => {
+  const start = createInitialState(MAP);
+  const panes = panesOf(MAP);
+  /** The lurker of the near pane, where it drops: two cells right of the pane and one below. */
+  const LURKER: CreatureState = {
+    species: 'lurker',
+    x: 136,
+    y: 152,
+    light: 0,
+    home: { x: 136, y: 152 },
+  };
+  const run = (from: GameState, ...inputs: readonly GameInput[]): GameState =>
+    inputs.reduce((state, input) => update(state, input, MAP), from);
+
+  it('has the reach of a talk: 40 px from the feet to the centre of the cell', () => {
+    expect(PANE_DISTANCE).toBe(40);
+    const [near] = panes;
+    expect(near === undefined ? null : paneCentre(near)).toStrictEqual({ x: 104, y: 136 });
+    expect(paneInReach({ x: 104, y: 96 }, start.panes, panes, MAP)).toStrictEqual(start.panes[0]);
+    expect(paneInReach({ x: 104, y: 95 }, start.panes, panes, MAP)).toBeNull();
+    // A closed pane is in nobody's reach.
+    expect(paneInReach({ x: 104, y: 100 }, [{ pane: 1, lit: false }], panes, MAP)).toBeNull();
+  });
+
+  it('is the nearest of two in reach, and the first in the order of the map of two equally near', () => {
+    // Two panes side by side, two cells apart: their centres are (104, 136) and (136, 136).
+    const two = mapAt(120, 110, [NEAR, rect('pane:support', 128, 128)]);
+    const open = createInitialState(two).panes;
+    const both = panesOf(two);
+    expect(paneInReach({ x: 120, y: 110 }, open, both, two)).toStrictEqual(open[0]);
+    expect(paneInReach({ x: 124, y: 110 }, open, both, two)).toStrictEqual(open[1]);
+    expect(paneInReach({ x: 116, y: 110 }, open, both, two)).toStrictEqual(open[0]);
+  });
+
+  it('removes the pane and drops its lurker at the drop point, which is its home', () => {
+    const closed = update(start, TALK, MAP);
+    expect(closed.panes).toStrictEqual([{ pane: 1, lit: false }]);
+    expect(closed.creatures).toStrictEqual([LURKER]);
+    expect(closed.captured).toStrictEqual(start.captured);
+    expect(closed.tick).toBe(1);
+    expect(closePane(start, TALK, MAP)).toStrictEqual({
+      panes: [{ pane: 1, lit: false }],
+      lurker: LURKER,
+    });
+    expect(closePane(start, NONE, MAP)).toBeNull();
+  });
+
+  it('steps the lurker from the next step on: it comes at the figure', () => {
+    const closed = update(start, TALK, MAP);
+    // 61 px from the figure: inside the 64 px at which it notices.
+    const [lurker] = update(closed, NONE, MAP).creatures;
+    expect(lurker?.x).toBeLessThan(136);
+    expect(lurker?.y).toBeLessThan(152);
+    expect(lurker?.home).toStrictEqual({ x: 136, y: 152 });
+  });
+
+  it('adds the lurker after the creatures of the map', () => {
+    const map = mapAt(104, 100, RECTS, [{ name: 'snippet', x: 280, y: 170 }]);
+    const closed = update(createInitialState(map), TALK, map);
+    expect(closed.creatures.map((creature) => creature.species)).toStrictEqual([
+      'snippet',
+      'lurker',
+    ]);
+  });
+
+  it('is not taken out of reach', () => {
+    // The centre of the pane is 46 px below the feet.
+    const far = mapAt(104, 90);
+    const pressed = update(createInitialState(far), TALK, far);
+    expect(pressed.panes).toHaveLength(2);
+    expect(pressed.creatures).toStrictEqual([]);
+  });
+
+  it('is not taken behind an opaque box, and is taken over a low one', () => {
+    const box = { x: 96, y: 112, width: 16, height: 16 };
+    const at = 7 * 20 + 6;
+    const walled: TileMap = {
+      ...MAP,
+      opaque: MAP.opaque.map((boxes, i) => (i === at ? [box] : boxes)),
+    };
+    expect(update(createInitialState(walled), TALK, walled).panes).toHaveLength(2);
+    // A desk is solid and low: it stops the walk and not the line.
+    const low: TileMap = {
+      ...MAP,
+      solids: MAP.solids.map((boxes, i) => (i === at ? [box] : boxes)),
+    };
+    expect(update(createInitialState(low), TALK, low).panes).toHaveLength(1);
   });
+
+  it('is not taken with the lamp held or during a push', () => {
+    const held = update(start, { ...TALK, lamp: true }, MAP);
+    expect(held.panes).toStrictEqual([
+      { pane: 0, lit: true },
+      { pane: 1, lit: false },
+    ]);
+    expect(held.creatures).toStrictEqual([]);
+    const pushed: GameState = {
+      ...start,
+      player: { ...start.player, recoil: { dx: 3, dy: 0, steps: 8 } },
+    };
+    expect(update(pushed, TALK, MAP).panes).toHaveLength(2);
+  });
+
+  it('gives way to a talk: with a speaker in reach the talk opens, and the pane stays open', () => {
+    const map = mapAt(104, 100, RECTS, [{ name: 'figure:officer', x: 128, y: 100 }]);
+    const talking = update(createInitialState(map), TALK, map);
+    expect(talking.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
+    expect(talking.panes).toHaveLength(2);
+    expect(talking.creatures).toStrictEqual([]);
+  });
+
+  it('does nothing at a closed pane: a second press finds none in reach', () => {
+    const closed = update(start, TALK, MAP);
+    const again = run(closed, NONE, TALK);
+    expect(again.panes).toStrictEqual(closed.panes);
+    expect(again.creatures.filter((creature) => creature.species === 'lurker')).toHaveLength(1);
+  });
+
+  it('comes before a rest: the press closes the pane, and the next one takes the coffee', () => {
+    // A coffee machine on cell (7, 7): its centre is 26 px from the feet.
+    const map = mapAt(104, 100, [...RECTS, rect('rest:coffee', 112, 112)]);
+    const closed = update(createInitialState(map), TALK, map);
+    expect(closed.panes).toHaveLength(1);
+    expect(closed.rested).toBeNull();
+    const drunk = update(update(closed, NONE, map), TALK, map);
+    expect(drunk.rested).toStrictEqual({ at: 3, result: 'full' });
+  });
+
+  it('lets the trace under it be found: in the 60th lit step after it is closed', () => {
+    // The lurker would come and push; it is taken out of this state.
+    const closed: GameState = { ...update(start, TALK, MAP), creatures: [] };
+    const before = steps(update(closed, NONE, MAP), SHINE, 59);
+    expect(before.traces[0]).toStrictEqual({ trace: 0, light: 59, found: null });
+    const found = update(before, SHINE, MAP);
+    expect(found.traces[0]).toStrictEqual({ trace: 0, light: 0, found: found.tick });
+  });
+
+  it('keeps a closed pane closed at the wake, and brings a free lurker back to its drop point', () => {
+    const moved = steps(update(start, TALK, MAP), NONE, 20);
+    expect(moved.creatures[0]?.x).not.toBe(136);
+    // The 44th step of the dark is the wake (0009).
+    const woken = update({ ...moved, dark: 44 }, NONE, MAP);
+    expect(woken.dark).toBe(45);
+    expect(woken.panes).toStrictEqual([{ pane: 1, lit: false }]);
+    expect(woken.creatures).toStrictEqual([LURKER]);
+  });
+
+  it('goes with the shadow of its region when the case is solved: no lurker drops, none is counted', () => {
+    // The lower half of the map is the area of Support; a third pane belongs to Sales.
+    const map = mapAt(104, 100, [
+      ...RECTS,
+      rect('pane:sales', 240, 112),
+      rect('region:support', 0, 96, 320, 96),
+    ]);
+    const outside: CreatureState = { ...LURKER, x: 280, y: 72, home: { x: 280, y: 72 } };
+    const state: GameState = { ...createInitialState(map), creatures: [LURKER, outside] };
+    expect(state.panes).toHaveLength(3);
+    const cleared = clearRegion(state, 'support', map);
+    // Both panes of Support leave, the open ones too; the pane of Sales stays.
+    expect(cleared.panes).toStrictEqual([{ pane: 2, lit: false }]);
+    // By the rule of 0025: the lurker at home in the area leaves, the other stays.
+    expect(cleared.creatures).toStrictEqual([outside]);
+    expect(cleared.captured).toStrictEqual(state.captured);
+  });
 });
```

- [x] **Step 2: Run them.** `npx tsc --noEmit` reports four errors in this test.
  `npx vitest run tests/unit/pane.test.ts` — 11 of 39 tests fail, all of the new block.

- [x] **Step 3: The reach and the press:**

```diff
--- a/src/game/pane.ts
+++ b/src/game/pane.ts
@@ -1,8 +1,9 @@
-import type { Box } from '../engine/collision';
+import { type Box, sightBlocked } from '../engine/collision';
 import { type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { SPREAD } from './lamp';
+import { BOX_HEIGHT, type GameInput, pressed } from './player';
 import { isCell, PANE_PREFIX, rectsOf } from './rects';
-import type { PaneState, PlayerState } from './state';
+import type { CreatureState, GameState, PaneState, PlayerState } from './state';
 import { traceInLight } from './trace';
 import { densityOf } from './world';
 
@@ -108,6 +109,80 @@
   });
 }
 
+/** Tune: the reach of a talk (0017), two and a half tiles from the feet to the cell's centre. */
+export const PANE_DISTANCE = 40;
+
+/** The centre of a pane's cell. */
+export function paneCentre(pane: Pane): Point {
+  return { x: pane.box.x + pane.box.width / 2, y: pane.box.y + pane.box.height / 2 };
+}
+
+/**
+ * The open pane a press closes: the nearest whose cell centre is at most PANE_DISTANCE from
+ * the player's feet and in sight — no opaque box of the map as loaded on the line from the
+ * centre of the player's box to that centre, the test of a talk — the first in the map's order
+ * of two equally near; null when none is. A desk, a chair and a partition are low and do not
+ * block the line.
+ */
+export function paneInReach(
+  player: Point,
+  states: readonly PaneState[],
+  panes: readonly Pane[],
+  map: TileMap,
+): PaneState | null {
+  let nearest: PaneState | null = null;
+  let reach = PANE_DISTANCE;
+  for (const state of states) {
+    const pane = panes[state.pane];
+    if (pane === undefined) {
+      continue;
+    }
+    const centre = paneCentre(pane);
+    const distance = Math.hypot(centre.x - player.x, centre.y - player.y);
+    if (
+      distance <= reach &&
+      (nearest === null || distance < reach) &&
+      !sightBlocked({ x: player.x, y: player.y - BOX_HEIGHT / 2 }, centre, {
+        width: map.width,
+        height: map.height,
+        solids: map.opaque,
+      })
+    ) {
+      nearest = state;
+      reach = distance;
+    }
+  }
+  return nearest;
+}
+
+/**
+ * What a press at an open pane in reach changes, or null when this step closes none: `talk`
+ * is not pressed, the lamp is held, the player is being pushed, or no open pane is in reach.
+ * The pane leaves the open ones for good, and its lurker drops to the floor: a creature at
+ * the pane's drop point, which is its home too. The caller steps the world from the result
+ * and adds the lurker after the creatures of the step: it is stepped from the next step on.
+ */
+export function closePane(
+  state: GameState,
+  input: GameInput,
+  map: TileMap,
+): { readonly panes: PaneState[]; readonly lurker: CreatureState } | null {
+  if (!pressed(state.held, input, 'talk') || input.lamp || state.player.recoil.steps > 0) {
+    return null;
+  }
+  const panes = panesOf(map);
+  const open = paneInReach(state.player, state.panes, panes, map);
+  const pane = open === null ? undefined : panes[open.pane];
+  if (open === null || pane === undefined) {
+    return null;
+  }
+  const { drop } = pane;
+  return {
+    panes: state.panes.filter((candidate) => candidate !== open),
+    lurker: { species: 'lurker', x: drop.x, y: drop.y, light: 0, home: { x: drop.x, y: drop.y } },
+  };
+}
+
 /** The panes when the figure wakes (0009): the open ones stay open, and none is lit. */
 export function restedPanes(states: readonly PaneState[]): PaneState[] {
   return states.map((state) => ({ ...state, lit: false }));
```

- [x] **Step 4: `update`** looks at a pane after a talk and before a rest, and adds the lurker
  after the creatures of the step:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -10,7 +10,7 @@
 import { spreadOf } from './lamp';
 import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
 import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
-import { coveredCells, openPanes, panesOf, stepPanes } from './pane';
+import { closePane, coveredCells, openPanes, panesOf, stepPanes } from './pane';
 import { type GameInput, NO_INPUT, stepPlayer } from './player';
 import { areasOf } from './region';
 import { restsOf, takeRest } from './rest';
@@ -195,8 +195,12 @@
   if (opened !== null) {
     return opened;
   }
+  // A press at an open pane in reach closes it, and its lurker drops to the floor (0038); a
+  // pane comes before a rest. The step goes on from there.
+  const shut = closePane(state, input, content);
+  const open = shut === null ? state.panes : shut.panes;
   // A press at a coffee machine in reach takes the rest (0027); the step goes on from there.
-  const rest = takeRest(state, input, content);
+  const rest = shut === null ? takeRest(state, input, content) : null;
   const rested = rest === null ? state.rested : rest.rested;
   const before = rest === null ? state.overview : rest.overview;
   const on = input.lamp && state.player.recoil.steps === 0;
@@ -228,7 +232,8 @@
     camera: followPlayer(player, content),
     lamp,
     upgrades: state.upgrades,
-    creatures,
+    // The lurker of a pane closed in this step is stepped from the next step on.
+    creatures: shut === null ? creatures : [...creatures, shut.lurker],
     movers: stepMovers(state.movers, routes, player),
     // The light on a wall is tested against the map as loaded: a wall does not block itself.
     shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content, spread),
@@ -242,11 +247,11 @@
       state.tick + 1,
       spread,
       // A trace under an open pane is hidden (0038).
-      coveredCells(state.panes, panes),
+      coveredCells(open, panes),
     ),
     solved: state.solved,
     // The light does not hold a lurker in its pane; the pane only knows it is lit.
-    panes: stepPanes(state.panes, panes, stepped, lamp.on, walled, spread),
+    panes: stepPanes(open, panes, stepped, lamp.on, walled, spread),
     rested,
     finished: state.finished,
     presented: state.presented,
```

- [x] **Step 5: A solved case takes its open panes along:**

```diff
--- a/src/game/cases.ts
+++ b/src/game/cases.ts
@@ -1,6 +1,7 @@
 import type { TileMap } from '../engine/tiled';
 import { type TextKey, textKey } from '../text/text';
 import type { Route } from './mover';
+import { panesOf } from './pane';
 import { areasOf, inArea } from './region';
 import { wallsOf } from './shadow';
 import type { Dialogue, GameState, SolvedCase, TraceState } from './state';
@@ -165,14 +166,17 @@
  * What goes with the shadow of a region whose case was solved in this step (0025): every
  * shadow wall of the region that still stands leaves `shadowWalls`, as a lifted wall does, and
  * every creature whose home lies in an area of the region leaves `creatures`, wherever it is.
- * Such a creature is not captured: `captured` does not change. Nothing else changes.
+ * Such a creature is not captured: `captured` does not change. Every pane of the region that
+ * is still open leaves `panes`, and no lurker drops from it (0038). Nothing else changes.
  */
 export function clearRegion(state: GameState, region: string, map: TileMap): GameState {
   const walls = wallsOf(map.rects);
+  const panes = panesOf(map);
   const areas = areasOf(map.rects).filter((area) => area.region === region);
   return {
     ...state,
     shadowWalls: state.shadowWalls.filter((standing) => walls[standing.wall]?.region !== region),
+    panes: state.panes.filter((open) => panes[open.pane]?.region !== region),
     creatures: state.creatures.filter(
       (creature) => !areas.some((area) => inArea(area, creature.home)),
     ),
```

- [x] **Step 6: Run** `npm run check` — 1683 unit tests.

- [x] **Step 7: Commit** — `Close a pane with a press, and drop its lurker`. Body: an action
  in the room first, then the lamp — the second layer; a talk comes first and a coffee after.

---

### Task 8: The pane in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `panesOf` (Task 5); `creatureSheets.lurker` (Task 3).
- Produces: `PANE_FRAME = 3`; the scene draws every open pane on its cell.

- [x] **Step 1: Write the failing tests:**

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -39,6 +39,7 @@
   NOTICE_BAR,
   NOTICE_CAPACITY,
   noticeOrigin,
+  PANE_FRAME,
   playerFrame,
   playerVisible,
   type SceneContent,
@@ -2130,3 +2131,103 @@
     expect(renderer.calls.some((call) => call.endsWith(' at 112,74'))).toBe(false);
   });
 });
+
+describe('the panes in the scene (0038)', () => {
+  const rect = (name: string, x: number, y: number) => ({ name, x, y, width: 16, height: 16 });
+  /** 20x12 cells of open floor: a trace on cell (5, 8), a pane on cell (6, 8) and one on (15, 3). */
+  const content: SceneContent = {
+    ...CONTENT,
+    map: grassMap(
+      20,
+      12,
+      { x: 104, y: 100 },
+      [],
+      [
+        rect('trace:support', 80, 128),
+        rect('pane:support', 96, 128),
+        rect('pane:support', 240, 48),
+      ],
+    ),
+  };
+  const lurkerSheet = content.creatureSheets.lurker;
+  const scene = (fields: Partial<GameState> = {}): GameState => ({
+    ...state({ x: 104, y: 100, facing: 'down' }),
+    tick: QUIET_TICK,
+    traces: [{ trace: 0, light: 0, found: null }],
+    panes: [
+      { pane: 0, lit: false },
+      { pane: 1, lit: false },
+    ],
+    ...fields,
+  });
+  /** The calls that draw from a sheet, in the order they were drawn. */
+  const spritesOn = (drawn: GameState, sheet: SpriteSheet): string[] => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, drawn, content);
+    return renderer.calls
+      .filter((call) => call.startsWith('drawSprite'))
+      .filter((_call, i) => renderer.sheets[i] === sheet);
+  };
+
+  it('draws every open pane with frame 3 of the lurker sheet on its cell', () => {
+    expect(PANE_FRAME).toBe(3);
+    expect(spritesOn(scene(), lurkerSheet)).toStrictEqual([
+      'drawSprite 3 at 96,128',
+      'drawSprite 3 at 240,48',
+    ]);
+  });
+
+  it('draws it in the light as out of it: the eye stays', () => {
+    const lit = scene({
+      lamp: { on: true, strength: 1, used: true },
+      panes: [
+        { pane: 0, lit: true },
+        { pane: 1, lit: false },
+      ],
+    });
+    expect(spritesOn(lit, lurkerSheet)).toStrictEqual(spritesOn(scene(), lurkerSheet));
+  });
+
+  it('draws a closed pane not at all', () => {
+    expect(spritesOn(scene({ panes: [{ pane: 1, lit: false }] }), lurkerSheet)).toStrictEqual([
+      'drawSprite 3 at 240,48',
+    ]);
+    expect(spritesOn(scene({ panes: [] }), lurkerSheet)).toStrictEqual([]);
+  });
+
+  it('moves with the camera', () => {
+    const moved = { ...scene(), camera: { x: 10, y: 20 } };
+    expect(spritesOn(moved, lurkerSheet)[0]).toBe('drawSprite 3 at 86,108');
+  });
+
+  it('draws the panes after the traces and before the player', () => {
+    const renderer = recordingRenderer();
+    drawScene(renderer, scene({ traces: [{ trace: 0, light: 30, found: null }] }), content);
+    const order = [content.traceSheet, lurkerSheet, content.playerSheet].map((sheet) =>
+      renderer.sheets.indexOf(sheet),
+    );
+    expect(order.every((index) => index >= 0)).toBe(true);
+    expect([...order].sort((a, b) => a - b)).toStrictEqual(order);
+    expect(renderer.sheets.lastIndexOf(lurkerSheet)).toBeLessThan(
+      renderer.sheets.indexOf(content.playerSheet),
+    );
+  });
+
+  it('draws a lurker on the floor as every creature: frames 0 and 1 in turn, frame 2 in the light', () => {
+    const lurker = (light: number): CreatureState => ({
+      species: 'lurker',
+      x: 150,
+      y: 100,
+      light,
+      home: { x: 136, y: 152 },
+    });
+    const free = scene({ panes: [], creatures: [lurker(0)] });
+    expect(spritesOn(free, lurkerSheet)).toStrictEqual(['drawSprite 0 at 142,84']);
+    expect(spritesOn({ ...free, tick: QUIET_TICK + 15 }, lurkerSheet)).toStrictEqual([
+      'drawSprite 1 at 142,84',
+    ]);
+    expect(spritesOn(scene({ panes: [], creatures: [lurker(12)] }), lurkerSheet)).toStrictEqual([
+      'drawSprite 2 at 142,84',
+    ]);
+  });
+});
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/draw-scene.test.ts`. Expected:
  FAIL, 4 of 132 tests. Two tests of the new block are green before the code, because they hold what is already there: the lurker on the floor is drawn as every creature, and a pane is drawn in the light as out of it.

- [x] **Step 3: The scene:**

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -9,6 +9,7 @@
 import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
 import { DARK_STEPS } from '../game/overview';
+import { panesOf } from '../game/pane';
 import { areasOf, shadowedAreas, shownVeil, veilOf } from '../game/region';
 import { LIFT_STEPS, wallsOf, withWalls } from '../game/shadow';
 import {
@@ -121,6 +122,8 @@
 /** A free creature changes its frame every 15 steps: four changes per second. */
 export const FLUTTER_STEPS = 15;
 export const FROZEN_FRAME = 2;
+/** The frame of the lurker's sheet that shows it in its pane (0038). */
+export const PANE_FRAME = 3;
 
 /**
  * Frozen in the light: frame 2, still. Looked at, for a species that moves only while nobody
@@ -452,6 +455,21 @@
       traceFrame(seen),
       trace.box.x - camera.x,
       trace.box.y - camera.y,
+    );
+  }
+  // An open pane shows the lurker that sits in it, in the light or not (0038): on its cell,
+  // over the traces and under every figure. A closed pane is not drawn.
+  const panes = state.panes.length === 0 ? [] : panesOf(content.map);
+  for (const open of state.panes) {
+    const pane = panes[open.pane];
+    if (pane === undefined) {
+      continue;
+    }
+    renderer.drawSprite(
+      content.creatureSheets.lurker,
+      PANE_FRAME,
+      pane.box.x - camera.x,
+      pane.box.y - camera.y,
     );
   }
   const figures = figuresOf(content.map.points);
```

- [x] **Step 4: Run** `npm run check` — 1689 unit tests.

- [x] **Step 5: Commit** — `Draw an open pane on its screen`. Body: the eye in its window, in
  the light as out of it, over the traces and under every figure.

---

### Task 9: The panes of the floor

**Files:**
- Modify: `tools/floor-layout.ts`, `public/maps/floor.tmj` (generated)
- Test: `tests/unit/floor.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: everything before.
- Produces: `PANES` in `tools/floor-layout.ts`; `floor.tmj` with the rectangles 138 to 140,
  `pane:support`, and `nextobjectid` 141.

- [x] **Step 1: Write the failing tests.** Two older tests of the floor change their numbers,
  and one block is new, at the end; the smoke spec gets one test:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -13,6 +13,7 @@
 import { REGION_NAME } from '../../src/game/journal';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
 import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
+import { paneInReach, panesOf } from '../../src/game/pane';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import { areasOf, inArea, shadowedAreas, veilOf } from '../../src/game/region';
 import { restInReach, restsOf, restUnderShadow } from '../../src/game/rest';
@@ -36,6 +37,7 @@
   floorJson,
   HORIZONTAL_WALLS,
   MIRAGES,
+  PANES,
   POSTS,
   REGION_AREAS,
   RESTS,
@@ -506,9 +508,9 @@
     ]);
     const json = floorJson();
     expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
-      Array.from({ length: 137 }, (_, i) => i + 1),
+      Array.from({ length: 140 }, (_, i) => i + 1),
     );
-    expect(json.nextobjectid).toBe(138);
+    expect(json.nextobjectid).toBe(141);
   });
 
   it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
@@ -2281,16 +2283,13 @@
     );
   });
 
-  it('are the last five objects of the file, rectangles with the ids 133 to 137, after the intern of 0033', () => {
+  it('are five rectangles with the ids 133 to 137, after the intern of 0033 and before the panes of 0038', () => {
     const objects = floorJson().layers[3].objects;
-    expect(objects).toHaveLength(137);
-    expect(objects.slice(132).map((object) => [object.id, object.name])).toStrictEqual(
+    expect(objects.slice(132, 137).map((object) => [object.id, object.name])).toStrictEqual(
       [133, 134, 135, 136, 137].map((id) => [id, 'trace:support']),
     );
-    expect(objects.slice(132).some((object) => 'point' in object)).toBe(false);
-    expect(floorJson().nextobjectid).toBe(138);
-    expect(floor.rects).toHaveLength(41);
-    expect(floor.rects.slice(36).every((rect) => rect.name === 'trace:support')).toBe(true);
+    expect(objects.slice(132, 137).some((object) => 'point' in object)).toBe(false);
+    expect(floor.rects.slice(36, 41).every((rect) => rect.name === 'trace:support')).toBe(true);
   });
 
   it('leave the 132 objects of 0033 and before exactly as they were', () => {
@@ -2494,6 +2493,187 @@
       ).toBe(true);
       expect(restUnderShadow(machine, floor.rects, [])).toBe(true);
       expect(restUnderShadow(machine, floor.rects, support.solved)).toBe(false);
+    }
+  });
+});
+
+describe('the panes of Support on the floor (0038)', () => {
+  /** Cell, box, the cell of the drop point and its feet, in file order: the spec's table. */
+  const TABLE: readonly (readonly [number, number, Box, number, number, Point])[] = [
+    [72, 61, { x: 1152, y: 976, width: 16, height: 16 }, 74, 62, { x: 1192, y: 1000 }],
+    [93, 67, { x: 1488, y: 1072, width: 16, height: 16 }, 95, 68, { x: 1528, y: 1096 }],
+    [62, 73, { x: 992, y: 1168, width: 16, height: 16 }, 64, 74, { x: 1032, y: 1192 }],
+  ];
+  const TALK: GameInput = { ...NO_INPUT, talk: true };
+  const SHINE: GameInput = { ...NO_INPUT, lamp: true };
+  const panes = panesOf(floor);
+  const traces = tracesOf(floor.rects);
+  const start = createInitialState(floor);
+  /**
+   * The figure in the middle of the cell below the chair of the cubicle, looking up at its
+   * screen — and nobody walking the floor: with a colleague in reach a talk would come first.
+   */
+  const below = (state: GameState, column: number, row: number): GameState => ({
+    ...state,
+    movers: [],
+    player: { ...state.player, x: column * 16 + 8, y: (row + 2) * 16 + 8, facing: 'up' },
+  });
+  const steps = (from: GameState, input: GameInput, count: number): GameState => {
+    let state = from;
+    for (let i = 0; i < count; i += 1) {
+      state = update(state, input, floor);
+    }
+    return state;
+  };
+
+  it('are three, on the cells of the spec, each with its drop point', () => {
+    expect(PANES).toStrictEqual(TABLE.map(([x, y]) => ({ region: 'support', cell: { x, y } })));
+    expect(panes).toStrictEqual(
+      TABLE.map(([, , box, , , drop]) => ({ region: 'support', box, drop })),
+    );
+  });
+
+  it('are the last three objects of the file, rectangles with the ids 138 to 140, after the traces of 0037', () => {
+    const objects = floorJson().layers[3].objects;
+    expect(objects).toHaveLength(140);
+    expect(objects.slice(137).map((object) => [object.id, object.name])).toStrictEqual(
+      [138, 139, 140].map((id) => [id, 'pane:support']),
+    );
+    expect(objects.slice(137).some((object) => 'point' in object)).toBe(false);
+    expect(floorJson().nextobjectid).toBe(141);
+    expect(floor.rects).toHaveLength(44);
+    expect(floor.rects.slice(41).every((rect) => rect.name === 'pane:support')).toBe(true);
+  });
+
+  it('leave the 137 objects of 0037 and before exactly as they were', () => {
+    // SHA-256 over the first 137 objects, recorded from the generator before this feature.
+    const before = JSON.stringify(floorJson().layers[3].objects.slice(0, 137));
+    expect(createHash('sha256').update(before).digest('hex')).toBe(
+      'cdabacf45496c2e915a980f35322360f22cc08b085236bff53c478f0e7870cec',
+    );
+  });
+
+  it('lie in the area of Support, each on a desk with a screen whose chair stands on the cell below', () => {
+    const support = areasOf(floor.rects).filter((area) => area.region === 'support');
+    for (const [column, row, box] of TABLE) {
+      expect(
+        support.some((area) => inArea(area, { x: box.x, y: box.y })),
+        `(${column}, ${row})`,
+      ).toBe(true);
+      expect(floor.detail[cell(column, row)], `(${column}, ${row})`).toBe(DESK_MONITOR_PARTITION);
+      expect(floor.detail[cell(column, row + 1)], `(${column}, ${row + 1})`).toBe(CHAIR);
+    }
+  });
+
+  it('drop their lurkers on the middle of a cell without a solid box, reached on foot', () => {
+    const support = areasOf(floor.rects).filter((area) => area.region === 'support');
+    for (const [, , , column, row, drop] of TABLE) {
+      expect(drop).toStrictEqual({ x: column * 16 + 8, y: row * 16 + 8 });
+      expect(floor.solids[cell(column, row)], `(${column}, ${row})`).toStrictEqual([]);
+      expect(reached(drop), `(${column}, ${row})`).toBe(true);
+      // At home in the area: the lurker goes with the shadow of Support (0025).
+      expect(support.some((area) => inArea(area, drop))).toBe(true);
+    }
+  });
+
+  it('lie over the traces of 0037 on (72, 61) and (62, 73), and over none on (93, 67)', () => {
+    const under = TABLE.map(([, , box]) =>
+      traces.findIndex((trace) => trace.box.x === box.x && trace.box.y === box.y),
+    );
+    expect(under).toStrictEqual([11, -1, 13]);
+  });
+
+  it('start open in the state: three panes, none lit, six creatures, nothing captured', () => {
+    expect(start.panes).toStrictEqual([0, 1, 2].map((pane) => ({ pane, lit: false })));
+    expect(start.creatures).toHaveLength(6);
+    expect(start.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
+    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
+  });
+
+  it('are in reach from every place on the cell below the chair', () => {
+    for (const [index, [column, row]] of TABLE.entries()) {
+      let places = 0;
+      for (let x = column * 16; x <= column * 16 + 16; x += 2) {
+        for (let y = (row + 2) * 16 + 2; y < (row + 3) * 16; y += 2) {
+          if (!reached({ x, y })) {
+            continue;
+          }
+          places += 1;
+          expect(
+            paneInReach({ x, y }, start.panes, panes, floor)?.pane,
+            `(${column}, ${row}) from (${x}, ${y})`,
+          ).toBe(index);
+        }
+      }
+      expect(places, `(${column}, ${row})`).toBe(45);
     }
   });
+
+  it('keep their trace hidden while they are open, and give it up once they are closed', () => {
+    for (const [index, trace] of [
+      [0, 11],
+      [2, 13],
+    ] as const) {
+      const [column, row] = TABLE[index] ?? [0, 0];
+      // A second of light finds a trace; ten seconds do not find this one.
+      const lit = steps(below(start, column, row), SHINE, 600);
+      expect(lit.traces[trace]).toStrictEqual({ trace, light: 0, found: null });
+      expect(lit.panes[index]).toStrictEqual({ pane: index, lit: true });
+      // Let go, then a press of E: the pane closes, and its lurker drops beside the chair.
+      const closed = steps(update(lit, NO_INPUT, floor), TALK, 1);
+      expect(closed.panes.map((open) => open.pane)).not.toContain(index);
+      expect(closed.creatures.at(-1)).toStrictEqual({
+        species: 'lurker',
+        x: TABLE[index]?.[5].x,
+        y: TABLE[index]?.[5].y,
+        light: 0,
+        home: TABLE[index]?.[5],
+      });
+      // Without the lurker in the way, the trace is found in the 60th lit step.
+      const free: GameState = { ...update(closed, NO_INPUT, floor), creatures: [] };
+      const found = steps(free, SHINE, 60);
+      expect(found.traces[trace]?.found).toBe(found.tick);
+    }
+  });
+
+  it('keep the case of Support from being ready while the two over a trace are open', () => {
+    const ready = (state: GameState): boolean => isReady('support', progressOf(state, floor));
+    // Every trace of Support that no pane covers is found: three of five.
+    const three: GameState = {
+      ...start,
+      traces: start.traces.map((trace) =>
+        [10, 12, 14].includes(trace.trace) ? { ...trace, found: 1 } : trace,
+      ),
+    };
+    expect(ready(three)).toBe(false);
+    // Ten seconds of light under each of the two panes find nothing.
+    const first = TABLE[0] ?? [0, 0];
+    const third = TABLE[2] ?? [0, 0];
+    const tried = steps(
+      below(steps(below(three, first[0], first[1]), SHINE, 600), third[0], third[1]),
+      SHINE,
+      600,
+    );
+    expect(ready(tried)).toBe(false);
+    expect(tried.traces.filter((trace) => trace.found !== null)).toHaveLength(3);
+  });
+
+  it('go with the shadow when the case of Support is solved: no pane is left, and no lurker dropped', () => {
+    const routes = routesOf(floor.points);
+    const source = start.movers.find((mover) => routes[mover.route]?.name === 'person:support');
+    const ready: GameState = {
+      ...start,
+      tick: 1000,
+      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+      player: { ...start.player, x: source?.x ?? 0, y: (source?.y ?? 0) + 24 },
+    };
+    const solved = [TALK, NO_INPUT, TALK, NO_INPUT, TALK, NO_INPUT].reduce(
+      (state, input) => update(state, input, floor),
+      ready,
+    );
+    expect(solved.solved).toStrictEqual([{ region: 'support', at: 1005 }]);
+    expect(solved.panes).toStrictEqual([]);
+    expect(solved.creatures.some((creature) => creature.species === 'lurker')).toBe(false);
+    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
+  });
 });
```

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -383,6 +383,16 @@
         'window.shadowAi.state.traces holds five traces each of Sales, Marketing and Support',
     })
     .toStrictEqual(Array.from({ length: 15 }, (_, trace) => ({ trace, light: 0, found: null })));
+});
+
+test('the floor starts with its three panes open, none lit', async ({ page }) => {
+  await start(page);
+  // The windows that are open on three screens of Support (0038); in the state they are panes.
+  await expect
+    .poll(() => page.evaluate(() => window.shadowAi?.state.panes), {
+      message: 'window.shadowAi.state.panes holds the three open panes of Support',
+    })
+    .toStrictEqual([0, 1, 2].map((pane) => ({ pane, lit: false })));
 });
 
 test('H opens the help, the game stands still under it, and H closes it again', async ({
```

- [x] **Step 2: Run them.** `npx tsc --noEmit` reports one error: `PANES` is not exported
  yet. `npx vitest run tests/unit/floor.test.ts` — 7 of 151 tests fail: `keeps the five points of 0010 first, with their ids` and six of the new block. Four tests of the new block are green before the code: they hold the digest of the 137 objects, the desks and chairs, the free drop cells, and that a solved case leaves no pane. With a dev server running,
  `npx playwright test -g "three panes"` fails: the state holds none.

- [x] **Step 3: The layout:**

```diff
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -275,6 +275,18 @@
  * that no object of an earlier feature changes its id (0037).
  */
 export const SECOND_TRACES = 10;
+
+/**
+ * The panes (0038): per pane its region and the cell of the screen it is open on. Three in
+ * Support, each on the desk with a screen of a cubicle; the first and the third lie over a
+ * trace of 0037. They are written at the end of the file, after the traces of 0037. The order
+ * is the order in the file.
+ */
+export const PANES: readonly { readonly region: string; readonly cell: Point }[] = [
+  { region: 'support', cell: { x: 72, y: 61 } },
+  { region: 'support', cell: { x: 93, y: 67 } },
+  { region: 'support', cell: { x: 62, y: 73 } },
+];
 
 /**
  * The areas of the regions (0023): which room of the layout belongs to which region of the
@@ -1248,6 +1260,7 @@
   const laterFigures = FIGURES.slice(FIRST_FIGURES);
   const firstLastTrace = firstLaterFigure + laterFigures.length;
   const lastTraces = TRACES.slice(SECOND_TRACES);
+  const firstPane = firstLastTrace + lastTraces.length;
   return {
     compressionlevel: -1,
     height: FLOOR_HEIGHT,
@@ -1291,6 +1304,9 @@
           ),
           ...lastTraces.map((trace, i) =>
             rectObject(firstLastTrace + i, `trace:${trace.region}`, traceBox(trace.cell)),
+          ),
+          ...PANES.map((pane, i) =>
+            rectObject(firstPane + i, `pane:${pane.region}`, traceBox(pane.cell)),
           ),
         ],
         opacity: 1,
@@ -1301,7 +1317,7 @@
       },
     ],
     nextlayerid: 5,
-    nextobjectid: firstLastTrace + lastTraces.length,
+    nextobjectid: firstPane + PANES.length,
     orientation: 'orthogonal',
     renderorder: 'right-down',
     tiledversion: '1.11.2',
```

- [x] **Step 4: Generate the map** — `npm run gen-floor`. `public/maps/floor.tmj` gets three
  rectangles at the end of its objects and `nextobjectid` 141; nothing else in it changes.
  Its SHA-256 is `b3d80959c8ebd1b04fa8cda933e8f0839cd8278ecfed33898f7fa638b715f408`.

- [x] **Step 5: Run** `npm run check` — 1700 unit tests. Then `npm run test:e2e`:
  21 passed, 3 skipped.

- [x] **Step 6: Commit** — `Open three windows on the screens of Support`. Body: two of them
  lie over a trace, so the case of Support cannot be solved with the lamp alone.

---

### Task 10: The documents

**Files:**
- Modify: `docs/spec/world.md`, `docs/spec/gameplay.md`, `docs/spec/visual.md`,
  `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md`

The diffs are against the branch as it stands before Task 1. If a line has moved, put the
text where the diff means it; do not change the words without a reason.

- [x] **Step 1: `world.md`** §4:

```diff
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -296,6 +296,21 @@
 dictionary words for a false picture, used for a species and not for a product; fixed by the
 author's decision on that basis, and no trademark register was searched (§5).
 
+**The lurker** (*Mitleser*, feature 0038) is the species of the Support case: an eye, because
+it is a browser extension somebody installed and that has read everything along ever since.
+Medium, layer 2 — the first creature the lamp alone does not get. It sits in a small window
+that is open on a screen, where no light holds it; the player closes the window with E, and the
+lurker drops to the floor beside the chair. There it goes by the snippet's rule in everything
+and is captured like a snippet. Its weakness is the countermeasure of its case: only approved
+tools and extensions run. Three windows are open in Support, on the screens of the cells
+(72, 61), (93, 67) and (62, 73); the first and the third lie over a trace, which cannot be
+found while the window is open, so the case cannot be solved without closing them. Every
+lurker has its home at its drop point in the region's area and leaves the game when the case
+of Support is solved, and so does every window still open (feature 0025). Its displayed name
+is *Mitleser*, in English *Lurker*: dictionary words, used for a species and not for a
+product; fixed by the author's decision on that basis, and no trademark register was searched
+(§5).
+
 ## 5. Names
 
 Every product, company and tool in the game is fictional, with two exceptions: LMIS, which
```

- [x] **Step 2: `gameplay.md`** §3, §6 and §7:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -111,6 +111,15 @@
 a trace means looking at a screen with the back to the room. In the light it is frozen and
 captured like the snippet, and it hits like the snippet.
 
+**As built** (feature 0038): the lurker is the first creature of the second layer — an action
+in the room first, then the lamp. It sits in a window that is open on a screen. The light on
+that screen holds nothing: the window stays, nothing is captured, and a line says `Hier liest
+etwas mit. Das Licht hält es nicht.` for as long as the light is on it. A press of E in reach
+of the window — the reach and the sight of a talk, 40 px — closes it for good, and the lurker
+drops to the floor two cells beside the screen; from the next step it comes at the figure and
+is frozen, captured and counted like a snippet. A press of E is looked at in this order: a
+talk, then a window, then a coffee. The lamp must not be held, as for a talk.
+
 ## 4. Overview
 
 Health is called **overview**. Hits from creatures take it. At zero the player is in the dark and
@@ -225,6 +234,13 @@
 depend on each other and may be solved in any order. The case earns no upgrade. The close
 (feature 0034) follows the last case of the game, so it now waits for Support too.
 
+**As built** (feature 0038): two of the five traces of Support lie under a window that is open
+on their screen. An open window hides its trace: the light finds nothing there until the
+window is closed. So the case of Support cannot be made ready with the lamp alone. The intern
+says so while traces of Support are missing: `Auf manchen ist ein Fenster offen, das keiner
+aufgemacht hat – mach es ruhig zu.` When the case is solved, the windows that are still open
+close with it, and no lurker drops from them.
+
 **As built** (feature 0036): three pages of talk name Harmonic, and no rule of a case changed
 (`vision.md` §10). The page the colleague of Sales says after the case no longer asks what to
 use next time: it says that something like Harmonic would have shown where the text goes. On
@@ -285,6 +301,13 @@
 second 72 px below the first, in the order of the species — the snippet, then the mirage —
 whichever was captured first. Two entries fit the screen; pages come with the third species.
 
+**As built** (feature 0038): with the third species the creatures tab has pages of two
+entries. The down arrow, pressed alone, turns to the next page and the up arrow to the one
+before; at either end the page stays. The journal opens on the first page, and a turn to
+another tab opens that tab on its first. With more than one page the tab says which one is
+open — `1 von 2` — at the right of the first entry's name; with one page it shows nothing
+more than before. The cases tab and the policy tab have no pages.
+
 **As built** (feature 0026): the journal does not open while the call is read, like under any
 dialogue. After it, J opens it with or without the lamp.
 
```

- [x] **Step 3: `visual.md`** §4:

```diff
--- a/docs/spec/visual.md
+++ b/docs/spec/visual.md
@@ -113,7 +113,8 @@
 for nothing else in the world; the asset test rejects it in every PNG under `public/` except the
 shadow assets, a list in the test: `sprites/snippet.png` (feature 0008),
 `sprites/shadow-wall.png` (feature 0014), `sprites/trace.png` (feature 0022),
-`sprites/shadow-veil.png` (features 0023 and 0025) and `sprites/mirage.png` (feature 0032).
+`sprites/shadow-veil.png` (features 0023 and 0025), `sprites/mirage.png` (feature 0032) and
+`sprites/lurker.png` (feature 0038).
 Every trace of shadow AI glows in
 it. The player learns in seconds what to look for, without a word of text. Because colour alone
 excludes colour-blind players, the signature colour is always accompanied by **form and
@@ -121,7 +122,11 @@
 the colour on its border and its lines of text, and it bobs while it is free — form and motion —
 and stands still in the light. The mirage (feature 0032) carries it on its frame and on the head
 and shoulders of the portrait in it; it sways one pixel to the side while nobody looks at it,
-holds still while it is looked at, and turns white in the light.
+holds still while it is looked at, and turns white in the light. The lurker (feature 0038) is an
+eye: its lids and its pupil carry the colour, the pupil goes to the side and back while it is
+free, and the eye turns white in the light. In its window on a screen it is the same pupil in a
+small frame with a title bar, 12x10 px on the cell of the screen, and it stands still: an open
+window is drawn in the light as out of it, over the traces and under every figure.
 
 The shadow wall (feature 0014) is the second shadow asset: a dithered strip 4 px thick in the
 signature colour, with `#181425` for the pattern of the densest wall. Its density is read from how
```

- [x] **Step 4: `architecture.md`** §1, §2, §5, §6 and §7:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -59,6 +59,7 @@
                         (0029), drawn from game/lamp
   placeholder-snippet.ts the placeholder snippet sheet as pure data: three 16x16 frames
   placeholder-mirage.ts the placeholder mirage sheet as pure data: three 16x16 frames (0032)
+  placeholder-lurker.ts the placeholder lurker sheet as pure data: four 16x16 frames (0038)
   placeholder-overview.ts the placeholder overview sheet as pure data: two 8x8 frames,
                         a full and an empty heart
   placeholder-person.ts the placeholder colleagues: the figure's frames in four other shirts,
@@ -228,7 +229,13 @@
 it would become 90 it is 0. `rested` is `null`, or `{ at, result }` (feature 0027, `game/rest`):
 the last rest the player took — `at` the `tick` of the state that step gave, `result` one of
 `REST_RESULTS`, `restored`, `full` or `shadow`. It is `null` at the start, the wake keeps it,
-and the notice of a rest is derived from it (§8). The wake point is the map's point named `wake`, the spawn when there
+and the notice of a rest is derived from it (§8). `panes` is the list of the windows that are
+open on screens of the map (feature 0038, `game/pane`), `{ pane, lit }` in the map's order:
+`pane` is the index among the panes of the map, `lit` whether the lamp's light was on its cell
+in the last step. Every pane of the map is open at the start; a closed one has left the list
+for good; the wake keeps the list and sets every `lit` to `false`. In `src/game/` and in the
+map the thing is a pane, because the test of INV-2 keeps the browser name `window` out of
+that directory's source text; the game's text calls it a window. The wake point is the map's point named `wake`, the spawn when there
 is none; two stop the game at the start (`createInitialState`).
 
 `movers` is an array of `{ kind, look, route, x, y, facing, frame, frameTimer, target, wait }`,
@@ -360,8 +367,11 @@
 (`NO_INPUT`); it replaced `talkHeld`, the `talk` of the last step, with feature 0020, because the
 journal needs presses of three actions. An action is **pressed** in a step when the input holds
 it and `held` does not (`game/player`, `pressed`; `talkPressed` in `game/talk` reads it for
-`talk`). `journal` is `null`, or `{ tab }` with one of `JOURNAL_TABS` — `creatures`, `cases`,
-`policy` — (feature 0020, `game/journal`). What a tab shows is not in the state: the **entries**
+`talk`). `journal` is `null`, or `{ tab, page }` with one of `JOURNAL_TABS` — `creatures`, `cases`,
+`policy` — and the page of the creatures tab from 0 (feature 0020, `game/journal`; the page
+since feature 0038: `ENTRIES_PER_PAGE` is 2, `entryPages` and `entriesOn` derive the pages from
+`captured`, and a press of `down` or `up` alone turns one page, never past an end; a turn to
+another tab and the opening of the journal give page 0). What a tab shows is not in the state: the **entries**
 of the creatures tab are the species of which at least one was captured, in `SPECIES` order,
 derived from `captured` in every frame by `entriesOf`. The entries of the cases tab are the
 regions of which at least one trace is found, in the order of the world data, each with the
@@ -556,7 +566,7 @@
 `render/draw-scene` holds the draw order of a frame: clear, then `ground`, `detail`, the veil
 over the cells under shadow (feature 0023) and over those of a region that is clearing (feature
 0025), the lamp's cone when the lamp is on, the standing shadow walls in array order (feature 0014), the traces
-the light is on in array order (feature 0022), the ground movers whose feet y is at most the player's in array order, the standing figures whose feet y is
+the light is on in array order (feature 0022), every open pane with frame 3 (`PANE_FRAME`) of the lurker's sheet on its cell, lit or not (feature 0038), the ground movers whose feet y is at most the player's in array order, the standing figures whose feet y is
 at most the player's (feature 0017), the creatures in array order, the player, the other
 standing figures, the other ground movers in array order, `above` (§6), the drones (feature
 0015), the hearts of overview, the help label (feature 0031), the dialogue box while a dialogue is open or else the notice
@@ -710,7 +720,11 @@
 of the species' sheet — the creature as the light shows it, `ENTRY_FRAME`, held equal to
 `FROZEN_FRAME` by a test — with its top-left corner at (16, 32 + 72k), the name from
 (40, 35 + 72k) and the text from (16, 54 + 72k), lines 12 px apart. A line of 47 characters ends
-at x = 298; two entries fit, the second ending at y = 172. On the cases tab (feature 0022) case
+at x = 298; two entries fit, the second ending at y = 172. Since feature 0038 the tab draws
+the entries of its open page, `entriesOn(captured, page)`, and with more than one page the
+mark of the page — its number, `journal.of` and the number of pages, one empty cell between
+two parts — on the line y = 35 with its right end at x = 304 (`PAGE_MARK_RIGHT`,
+`pageMarkOrigin`): `1 von 2` from x = 262, `1 of 2` from x = 268. On the cases tab (feature 0022) case
 k from 0 is two lines: the region's name, `region.<id>`, from (16, 36 + 36k), and from
 (16, 48 + 36k) four parts — `journal.traces`, the number of found traces, `journal.of`, the
 number of all the region's traces on the map — with one empty cell of 6 px between two parts:
@@ -926,6 +940,25 @@
 No coordinate of a rest is in `src/` (INV-7); `tools/floor-layout.ts` holds the floor's eight,
 `RESTS`, written after the areas with the ids 116 to 123.
 
+**Panes** (feature 0038). A rectangle named `pane:<region>` is a window that is open on a
+screen: exactly one cell, on the cell of a desk with a screen. `game/pane` reads them with
+`panesOf(map)` in file order as `{ region, box, drop }` — `drop` is where the pane's lurker
+falls, the middle of the cell two to the right of the pane and one below (`dropPoint`) — and
+refuses the map for a box that is not one cell, for a region the world data does not know
+(`pane pane:cellar names no region`) and for a drop point outside the map or in a solid box
+(`pane pane:support (288, 80, 16, 16) has no free drop point`). In an ordinary step, after the
+speakers had their turn and before a rest is looked at, `closePane` takes a press of `talk`
+when the input does not hold `lamp`, the figure is not being pushed and an open pane is **in
+reach** (`paneInReach`): the centre of its cell at most `PANE_DISTANCE`, 40 px, from the feet,
+and no opaque box of the map as loaded on the line from (x, y − 4) to that centre. The pane
+leaves `panes`, and a lurker joins `creatures` after the creatures of the step, at the drop
+point, which is its home; it is stepped from the next step on. Then `stepPanes` sets `lit` for
+every pane still open, by the test of a trace against the map with the walls standing, and
+`stepTraces` gets the cells of the open panes (`coveredCells`): a trace on one of them is not
+in the light. `clearRegion` removes the open panes of a solved region. No coordinate of a pane
+is in `src/` (INV-7); `tools/floor-layout.ts` holds the floor's three, `PANES`, written at the
+end of the file with the ids 138 to 140, and `nextobjectid` is 141.
+
 Flipped and rotated tiles, more than one tileset per map, embedded tilesets, encoded or
 compressed data and infinite maps stay rejected until a feature needs one and lifts its rule. A
 tileset tile with an `animation` is rejected too: the game has no animated tiles, and a still
@@ -1076,6 +1109,14 @@
 one pixel to the right, and the same with a white ground. The frame, columns 3–12 and rows
 2–13, a head and shoulders are `#68386c`, the ground `#c0cbdc`, the lit ground `#ffffff`; 120
 opaque pixels per frame, 72 of them the signature colour.
+
+`tools/placeholder-lurker.ts` draws the lurker sheet (feature 0038) the same way:
+`public/sprites/lurker.png`, 64x16, four 16x16 frames in one row. Frames 0 to 2 are an eye —
+lids on rows 6 and 10, the inside on columns 5–10 and rows 7–9, the pupil two columns wide —
+with the pupil on columns 7–8, on columns 8–9, and with a white inside. Frame 3
+(`LURKER_PANE_FRAME`) is the lurker in its window: a frame on columns 2–13 and rows 3–12 with
+a title bar on row 4, and the pupil. Lids, pupil and frame are `#68386c`, the inside `#c0cbdc`,
+the lit inside `#ffffff`.
 
 `tools/placeholder-overview.ts` draws the overview sheet (features 0009, 0012) and returns its
 pixels as data: `public/sprites/overview.png`, 16x8, two 8x8 frames in one row — a heart 7 wide
```

- [x] **Step 5: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -24,7 +24,7 @@
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
 | INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); each line of the card is one line that fits the surface, no other key of either table holds the presenter's name, and the name Harmonic is in three pages of talk and in no other key (0036); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
 | INV-5 own origin only | a test over `dist/` for `http://` and `https://`, which is why `npm run check` builds before it tests; the smoke test reads the CSP header from the container |
-| INV-6 palette | the asset tests: palette, the reserved colour and its five shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022), the veil sheet with its five frames (0023, 0025) and the mirage sheet (0032) —, the wider cone's sheet with every other PNG (0029), the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
+| INV-6 palette | the asset tests: palette, the reserved colour and its six shadow assets — the snippet, the shadow-wall sheet (0014), the trace sheet (0022), the veil sheet with its five frames (0023, 0025), the mirage sheet (0032) and the lurker sheet (0038) —, the wider cone's sheet with every other PNG (0029), the shadow tileset without the reserved colour and with every opaque pixel the grey of the pixel at its place (0023), alpha, tileset size, each `.tsj` against its PNG, each with a negative case |
 | INV-7 map truth | loader tests read the solid boxes as the union of the three tile layers, in map pixels, and the opaque boxes from the tiles that are not `low`, and reject, each with its message: an unknown layer name, a layer whose type does not match its name, a missing `ground` or `objects` layer or a name used twice, no spawn or two, a tile size other than 16x16, a map under 20x12 tiles, an infinite map or encoded, compressed or mis-sized layer data, a flipped or rotated tile, a gid outside the tileset, anything but one external `.tsj`, an animated tile in the tileset, a collision shape that is not a rectangle, a rotated one, one that is not whole pixels inside the tile, a tile that is `solid` and has collision shapes, a tile that is `low` and has no box, an orientation other than orthogonal, a spawn outside the map or in a solid box, a point object without a name, a named point outside the map or in a solid box, a `pause` that is not an `int` property (`architecture.md` §6); `game/mover` rejects a malformed route point, an unknown room, a pause outside 0–600, a number used twice or missing, a route of one or more than four points, a leg that is not straight and a ground leg across a solid box, each with its message, and a test proves every ground leg of the floor free (0015); the loader rejects an object that is neither a point nor a rectangle, a rectangle without a name, a rotated rectangle and one that is not whole pixels inside the map, and `game/rects` refuses a rectangle of no known kind (0022), `game/shadow` a region the world data does not know, a region without shadow and a box that is no strip on a cell edge, each with its message (0014), and `game/trace` a trace of a region the world data does not know and a trace that is not one cell, each with its message (0022), and `game/region` an area of a region the world data does not know and an area that is not whole cells, each with its message, and a test holds the floor's ten areas to its rooms (0023); `game/rest` refuses a rest that is not one cell, with its message, and a test holds the floor's eight rests to its coffee machines, none without a rest (0027); a test holds the floor's five traces of Marketing to the spec's table — each in the area of Marketing, on a desk with a screen or on the printer, and in the light from every reached place on the cell above — and the 123 objects of the floor before them to a recorded SHA-256 digest, so that no object of an earlier feature changes (0028); a test holds the floor's five traces of Support to the spec's table — each in the area of Support, on a desk with a screen whose chair stands on the cell below, and in the light from every reached place on the cell below that chair — and the 132 objects before them to a recorded digest (0037); the world-data test, `gatingFaults` on `src/game/world.ts` and on four faulty tables, proves that no density lies outside 0–3 or above what the lamp reaches and that no upgrade is earned behind a wall the lamp cannot lift before it (0014); `game/cast` refuses a figure point whose id the cast does not have and two points with the same id, each with its message, and a figure point is no route point and makes no creature (0017) |
 
 A change to the state's shape is held against a recording: 600 steps on the floor with walking,
@@ -41,7 +41,8 @@
 tests hash the snippets among the creatures and the count of the snippet, so three mirages
 that rest in Marketing do not change a digest that was taken before they existed. Since the
 second standing figure (0033) they hash the first figure of the state, the officer, for the
-same reason.
+same reason. Since the pages of the journal (0038) the recording of the help hashes the open
+journal as its tab, without the page.
 
 ## 3. Test first
 
```

- [x] **Step 6: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -66,7 +66,11 @@
 Sales after the case, and the management at the close (feature 0036). Support has five traces
 of its own, on five of its twenty-seven screens, and the colleague in the orange shirt is the
 source of the third case; the three cases can be solved in any order, and the close follows the
-last of them (feature 0037).
+last of them (feature 0037). Support has a creature of its own: the lurker, an eye in a small
+window that is open on three screens. The lamp does not hold it there — `E` closes the window,
+the lurker drops to the floor and can be captured, and two of the room's traces show only
+then. With three species the journal's creatures tab has two pages, turned with the up and
+down arrows (feature 0038).
 Every merge to `main` is deployed to Cloud Run (feature 0030).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
```

- [x] **Step 7:** `npm run check`, then commit — `Move the creature of Support into the spec`.

---

### Task 11: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 21 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 11 in this file and commit —
  `Tick the full check of 0038`.

---

### Task 12: The acceptance walk

- [x] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the keys
  of the spec's preconditions, and where to begin — the card and the call passed. Say one
  thing more, because it follows from the order of a press of `E`: if the colleague in the
  orange shirt stands within reach when `E` is pressed at a window, the talk opens instead;
  close it and press again once the colleague has walked on. Wait until the author is ready.
- [x] **Step 2:** guide the author through steps 1–16 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [x] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 11, and start again at step 1.
- [x] **Step 4:** after step 16 ask the five feel questions, one per message.
- [x] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–16`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0038`. A feel note that wants something
  else — a move of its own for the lurker, another place to drop, other words — becomes a
  new draft, not a change on this branch.

---

### Task 13: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 11. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`. In `docs/plan.md` §4, in the M6 section, say that the seven
  features of the playable build are implemented: 0032 to 0034 and 0036 to 0039. Do not
  declare the milestone M6 done: its other cases are still open. Commit —
  `Mark 0038 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0038: the creature of Support`, with the walk's result and feel notes in its
  description. Say in one line that the spec's names were corrected before any code: the
  window is a pane in code, because the test of INV-2 is not weakened. CI must be green. The
  author merges.
