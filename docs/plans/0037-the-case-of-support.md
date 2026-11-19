# 0037 — Implementation plan: the case of Support

**Spec:** [`docs/features/0037-the-case-of-support.md`](../features/0037-the-case-of-support.md)
(approved 2026-11-19). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/world.md` §2 and §3, `docs/spec/gameplay.md`
§6 and §7, `docs/spec/architecture.md` §5, §6 and §8 and `docs/spec/testing.md` §5.
**Written:** 2026-11-19 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0036 is merged into `main` (`5c058ad`). The branch
`feature/0037-the-case-of-support` exists, cut from that `main`. It already holds one commit
of documents — the **draft** of feature 0039, the lamp from the start — and this plan. 0039 is
not approved: build nothing of it, and do not change its file. Work on this branch; merge the
latest `main` into it before Task 1. The spec 0038 is approved, has no plan yet, and is
**not** built here.

**Goal:** the player can solve a third case, in Support, by the rules of the first two: five
traces on five screens, the colleague in the orange shirt as the source, the third entry and
the third policy block in the journal, overview eight of eight, and the room in its colours.

**Approach:** four code tasks, each green on its own. The words (T1): nine keys. The traces
(T2): the name of the region for the journal, five more entries of `TRACES`, and five
rectangles at the end of `floor.tmj` — after this task Support has traces that can be found
and counted, and no case. The policy tab (T3): its blocks are stacked by their height, so
that three fit — a change of one rule of drawing, tested with the two blocks of today. The
case (T4): the third entry of `CASES` and the three hints of the intern — the rules of 0024,
0025, 0033 and 0034 do the rest, because they read the tables. Then the documents (T5), the
full check with the container (T6), the walk (T7) and the pull request (T8).

**How this plan was checked:** the code and the tests of Tasks 1 to 4 were run once as a
prototype on 2026-11-19 and then replayed task by task, each task's tests before its code:
they failed as the steps say, and after each of the four tasks typecheck and Biome were clean
and the unit tests green — 1590, 1601, 1603 and 1623 tests (1589 before). The blocks of this
file, applied in order to a clean tree, with `npm run gen-floor` after the layout, gave the
prototype's files; the generated `floor.tmj` has the SHA-256
`a93f8c06b9945d1310afa6f7575463c73cf339cbcbb947c81d4a6b933353bbc7`. `npm run check` with
the build passed on the whole prototype, and the smoke spec passed twice against a dev server
of it: 20 passed, 3 skipped. The changed smoke test was run once before the code of Task 2
and failed, and once with that code and passed. The prototype was thrown away; nothing of it
is on the branch. If a step does not behave as written, the cause is a difference to that
state — stop and look; do not bend a test. The game was **not** played in a browser — that
is the walk — and the container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: no field is added to `GameState`. The state of the floor has fifteen traces instead
  of ten; nothing else in its shape changes.
- INV-2: `game/cases`, `game/hints` and `game/journal` get data only.
- INV-4: every string lives in `src/text/de.ts` and `src/text/en.ts`; code holds keys. The
  words are the spec's table; copy them from the diffs and change nothing.
- INV-6: no new image and no tile change.
- INV-7: no coordinate of a trace is in `src/`. `tools/floor-layout.ts` holds the cells, and
  `public/maps/floor.tmj` is generated: **never edit it by hand**, run `npm run gen-floor`.
- **No object of an earlier feature changes its id.** The five rectangles of Support are
  written at the end of the file, after the intern of 0033, with the ids 133 to 137;
  `nextobjectid` is 138. A test holds the 132 objects before them to a recorded digest.
- **The order of the traces is the order in the file:** Sales 0 to 4, Marketing 5 to 9,
  Support 10 to 14.
- **The order of `CASES` is Sales, Marketing, Support.** The cases tab, the intern's hints
  and the close follow that order; the policy tab follows the order in which cases were
  solved.
- **The close (0034) follows the last case of `CASES`.** With Task 4 it is due only when
  Support is solved too. No code of the close changes; its tests get a third case.
- **The policy tab** stacks its blocks: the first from (16, 36), each further one 12 px below
  the last line of the block before it. `POLICY_PITCH` goes; `POLICY_GAP` and `policyOrigins`
  come. The lines counted are those of the language the tab is drawn in.
- **The two recorded digests of 600 steps** (`RECORDED` in `tests/unit/journal.test.ts` and
  in `tests/unit/help.test.ts`) are never recorded again. They pass unchanged — criterion 14.
- **Glyphs:** a space is not drawn; the frame of a character is its code minus 32. `S` is
  51, `V` 54, `M` 45, `G` 39, `W` 55, `J` 42, `D` 36, `T` 52.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`.
- What is out of the spec is not built: no species of Support (0038), no upgrade, no pages
  on the policy tab, no second saying for the other colleagues, no brand and no person in a
  text.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox; if signing fails, retry once, then stop and ask — never
  pass `--no-gpg-sign`), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`. Do not stop a dev server that is
  not yours. Push nothing before the walk has passed.
- The numbers, verbatim from the spec: the cells (52, 61), (72, 61), (88, 67), (62, 73) and
  (98, 73); the ids 133 to 137 and `nextobjectid` 138; fifteen traces; a block of n lines is
  followed by the next one 12n + 12 px lower; with the three blocks of today the last line
  starts at y = 168 and ends at y = 178; overview eight of eight; the close 300 steps after
  the last case.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | nine keys |
| `src/game/journal.ts` | `REGION_NAME.support` |
| `tools/floor-layout.ts` | five entries of `TRACES`, `SECOND_TRACES`, the rectangles at the end of the file |
| `public/maps/floor.tmj` | generated |
| `src/render/draw-journal.ts` | `POLICY_GAP`, `policyOrigins`; `POLICY_PITCH` goes |
| `src/game/cases.ts` | the third entry of `CASES` |
| `src/game/hints.ts` | the three pages of Support |
| `tests/unit/*.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 5 |

---

### Task 1: The words

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `region.support`, `talk.support-source-1`, `talk.support-source-2`,
  `talk.support-after`, `case.support-outcome`, `policy.support`,
  `talk.intern-support-start`, `talk.intern-support-traces`, `talk.intern-support-source`.

- [ ] **Step 1: Write the failing tests.** One new test holds the nine keys line by line; the
  test of the intern's pages counts eleven instead of eight:

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -307,7 +307,91 @@
       'What a machine has made, a person looks at',
       'before it leaves the house.',
       'Image or text – rather once too often.',
+    ]);
+  });
+
+  it('holds the words of the case of Support in both languages (0037)', () => {
+    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
+      textOf(textKey(id), language).split('\n');
+    expect([lines('region.support', 'de'), lines('region.support', 'en')]).toStrictEqual([
+      ['Support'],
+      ['Support'],
+    ]);
+    expect(lines('talk.support-source-1', 'de')).toStrictEqual([
+      'Die Mails kommen in elf Sprachen. Ich kopiere',
+      'sie in einen Übersetzer aus dem Netz – sonst',
+      'wartet der Kunde drei Tage auf Antwort.',
+    ]);
+    expect(lines('talk.support-source-1', 'en')).toStrictEqual([
+      'The mails come in eleven languages. I paste',
+      'them into a translator from the web – or the',
+      'customer waits three days for an answer.',
+    ]);
+    expect(lines('talk.support-source-2', 'de')).toStrictEqual([
+      'Dass da Namen und Adressen drinstehen, war mir',
+      'klar. Dass die Erweiterung im Browser gleich',
+      'das ganze Postfach mitliest, nicht.',
+    ]);
+    expect(lines('talk.support-source-2', 'en')).toStrictEqual([
+      'That names and addresses are in them, I knew.',
+      'That the browser extension reads the whole',
+      'mailbox along with it, I did not.',
+    ]);
+    expect(lines('talk.support-after', 'de')).toStrictEqual([
+      'Danke. Sag mir, welchen Übersetzer ich nehmen',
+      'darf – und die Erweiterung fliegt heute noch',
+      'raus.',
+    ]);
+    expect(lines('talk.support-after', 'en')).toStrictEqual([
+      'Thanks. Tell me which translator I may use –',
+      'and the extension goes today.',
+    ]);
+    expect(lines('case.support-outcome', 'de')).toStrictEqual([
+      'Gelöst: Kundenmails gingen in einen Übersetzer.',
+    ]);
+    expect(lines('case.support-outcome', 'en')).toStrictEqual([
+      'Solved: customer mails went into a translator.',
+    ]);
+    expect(lines('policy.support', 'de')).toStrictEqual([
+      'Werkzeuge und Erweiterungen kommen von der',
+      'freigegebenen Liste – und nur von dort. Fehlt',
+      'eines, sag es: Dann kommt es auf die Liste.',
+    ]);
+    expect(lines('policy.support', 'en')).toStrictEqual([
+      'Tools and extensions come from the approved',
+      'list – and only from there. If one is missing,',
+      'say so: then it gets onto the list.',
+    ]);
+    expect(lines('talk.intern-support-start', 'de')).toStrictEqual([
+      'Dann der Support, unten rechts am Südflur.',
+      'Die beantworten Mails in elf Sprachen –',
+      'frag dich mal, wie.',
+    ]);
+    expect(lines('talk.intern-support-start', 'en')).toStrictEqual([
+      'Support next, down at the right of the south',
+      'corridor. They answer mails in eleven',
+      'languages – ask yourself how.',
+    ]);
+    expect(lines('talk.intern-support-traces', 'de')).toStrictEqual([
+      'Im Support sind es wieder die Bildschirme.',
+      'Drei Reihen, und in jeder sitzt jemand, der',
+      'gerade etwas übersetzen lässt.',
     ]);
+    expect(lines('talk.intern-support-traces', 'en')).toStrictEqual([
+      'In Support it is the screens again. Three',
+      'rows, and in each somebody is having',
+      'something translated right now.',
+    ]);
+    expect(lines('talk.intern-support-source', 'de')).toStrictEqual([
+      'Oranges Hemd, läuft zwischen den Tischen und',
+      'dem Drucker hin und her. Vierzig Tickets vor',
+      'dem ersten Kaffee – frag nach den Sprachen.',
+    ]);
+    expect(lines('talk.intern-support-source', 'en')).toStrictEqual([
+      'Orange shirt, walks between the desks and the',
+      'printer. Forty tickets before the first',
+      'coffee – ask about the languages.',
+    ]);
   });
 
   it('holds the two lines of the card in both languages (0036)', () => {
@@ -426,9 +510,9 @@
       'kommst du jetzt in HR und Buchhaltung rein –',
       'was da los ist, erzählst du mir.',
     ]);
-    // Eight keys, each one page of three lines.
+    // Eight keys of 0033 and the three of Support (0037), each one page of three lines.
     const ids = Object.keys(TABLE.de).filter((id) => id.startsWith('talk.intern-'));
-    expect(ids).toHaveLength(8);
+    expect(ids).toHaveLength(11);
     for (const language of LANGUAGES) {
       for (const id of ids) {
         expect(TABLE[language][id as TextId].split('\n'), `${language} ${id}`).toHaveLength(3);
```

- [ ] **Step 2: Run them** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 2 of 34
  tests: `holds the words of the case of Support in both languages (0037)` and `holds the
  eight pages of the intern in both languages (0033)`. `npx tsc --noEmit` reports 18 errors,
  all in this test: the ids are not ids of the table yet.

- [ ] **Step 3: The words,** in both tables:

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -33,6 +33,7 @@
   'journal.of': 'von',
   'region.sales': 'Vertrieb',
   'region.marketing': 'Marketing',
+  'region.support': 'Support',
   'creature.snippet-name': 'Schnipsel',
   'creature.snippet-text': [
     'Ein Stück Text, das jemand in einen',
@@ -157,6 +158,27 @@
     'ein Mensch an, bevor es das Haus verlässt.',
     'Bild oder Text – lieber einmal zu viel.',
   ].join('\n'),
+  'talk.support-source-1': [
+    'Die Mails kommen in elf Sprachen. Ich kopiere',
+    'sie in einen Übersetzer aus dem Netz – sonst',
+    'wartet der Kunde drei Tage auf Antwort.',
+  ].join('\n'),
+  'talk.support-source-2': [
+    'Dass da Namen und Adressen drinstehen, war mir',
+    'klar. Dass die Erweiterung im Browser gleich',
+    'das ganze Postfach mitliest, nicht.',
+  ].join('\n'),
+  'talk.support-after': [
+    'Danke. Sag mir, welchen Übersetzer ich nehmen',
+    'darf – und die Erweiterung fliegt heute noch',
+    'raus.',
+  ].join('\n'),
+  'case.support-outcome': 'Gelöst: Kundenmails gingen in einen Übersetzer.',
+  'policy.support': [
+    'Werkzeuge und Erweiterungen kommen von der',
+    'freigegebenen Liste – und nur von dort. Fehlt',
+    'eines, sag es: Dann kommt es auf die Liste.',
+  ].join('\n'),
   'talk.intern-lamp': [
     'Du willst in den Vertrieb? Geh erst nach',
     'nebenan, zur Datenschutzbeauftragten. Sie hat',
@@ -192,6 +214,21 @@
     'und dem Drucker. Die Antwort kennst du schon,',
     'du musst sie nur noch hören.',
   ].join('\n'),
+  'talk.intern-support-start': [
+    'Dann der Support, unten rechts am Südflur.',
+    'Die beantworten Mails in elf Sprachen –',
+    'frag dich mal, wie.',
+  ].join('\n'),
+  'talk.intern-support-traces': [
+    'Im Support sind es wieder die Bildschirme.',
+    'Drei Reihen, und in jeder sitzt jemand, der',
+    'gerade etwas übersetzen lässt.',
+  ].join('\n'),
+  'talk.intern-support-source': [
+    'Oranges Hemd, läuft zwischen den Tischen und',
+    'dem Drucker hin und her. Vierzig Tickets vor',
+    'dem ersten Kaffee – frag nach den Sprachen.',
+  ].join('\n'),
   'talk.intern-done': [
     'Mehr weiß ich gerade auch nicht. Am Nordflur',
     'kommst du jetzt in HR und Buchhaltung rein –',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -30,6 +30,7 @@
   'journal.of': 'of',
   'region.sales': 'Sales',
   'region.marketing': 'Marketing',
+  'region.support': 'Support',
   'creature.snippet-name': 'Snippet',
   'creature.snippet-text': [
     'A piece of text somebody pasted into a public',
@@ -153,6 +154,26 @@
     'before it leaves the house.',
     'Image or text – rather once too often.',
   ].join('\n'),
+  'talk.support-source-1': [
+    'The mails come in eleven languages. I paste',
+    'them into a translator from the web – or the',
+    'customer waits three days for an answer.',
+  ].join('\n'),
+  'talk.support-source-2': [
+    'That names and addresses are in them, I knew.',
+    'That the browser extension reads the whole',
+    'mailbox along with it, I did not.',
+  ].join('\n'),
+  'talk.support-after': [
+    'Thanks. Tell me which translator I may use –',
+    'and the extension goes today.',
+  ].join('\n'),
+  'case.support-outcome': 'Solved: customer mails went into a translator.',
+  'policy.support': [
+    'Tools and extensions come from the approved',
+    'list – and only from there. If one is missing,',
+    'say so: then it gets onto the list.',
+  ].join('\n'),
   'talk.intern-lamp': [
     'Off to Sales? Go next door first, to the data',
     'protection officer. She has something you',
@@ -188,6 +209,21 @@
     'desk islands and the printer. You know the',
     'answer already – you only have to hear it.',
   ].join('\n'),
+  'talk.intern-support-start': [
+    'Support next, down at the right of the south',
+    'corridor. They answer mails in eleven',
+    'languages – ask yourself how.',
+  ].join('\n'),
+  'talk.intern-support-traces': [
+    'In Support it is the screens again. Three',
+    'rows, and in each somebody is having',
+    'something translated right now.',
+  ].join('\n'),
+  'talk.intern-support-source': [
+    'Orange shirt, walks between the desks and the',
+    'printer. Forty tickets before the first',
+    'coffee – ask about the languages.',
+  ].join('\n'),
   'talk.intern-done': [
     'That is all I know for now. Off the north',
     'corridor you can get into HR and Accounting',
```

- [ ] **Step 4: Run** `npx vitest run tests/unit/text.test.ts` — green. The rule tests of
  0017, 0022 and 0024 cover the new keys: a page of talk has at most three lines of at most
  47 characters, and every text of the journal obeys the rule of its kind. Then
  `npm run check`: 1590 unit tests.

- [ ] **Step 5: Commit** — `Add the words of the case of Support`. Body: the answer says why
  first and then what went wrong; the block names the approved list and the way onto it,
  because a list that only forbids is the shadow's cause.

---

### Task 2: The traces of Support

**Files:**
- Modify: `src/game/journal.ts`, `tools/floor-layout.ts`, `public/maps/floor.tmj`
  (generated)
- Test: `tests/unit/floor.test.ts`, `tests/unit/state.test.ts`,
  `tests/unit/draw-journal.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `region.support` (Task 1).
- Produces:
  - `REGION_NAME.support` in `game/journal`
  - `TRACES` with fifteen entries, `SECOND_TRACES = 10` in `tools/floor-layout.ts`
  - `floor.tmj` with the rectangles 133 to 137, `trace:support`, after the intern

After this task Support has five traces that the lamp finds and the cases tab counts. It has
no case yet: its colleague says the everyday line whatever is found.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/floor.test.ts` older tests change
  their numbers, and one block is new, at the end. The test `has hints for every case that
  has traces on the floor` becomes `has hints for every case, and every case has traces on
  the floor`: between this task and Task 4 Support has traces and no case.

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -41,6 +41,7 @@
   RESTS,
   ROOMS,
   ROUTES,
+  SECOND_TRACES,
   SHADOW_WALLS,
   SNIPPETS,
   SPAWN,
@@ -505,9 +506,9 @@
     ]);
     const json = floorJson();
     expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
-      Array.from({ length: 132 }, (_, i) => i + 1),
+      Array.from({ length: 137 }, (_, i) => i + 1),
     );
-    expect(json.nextobjectid).toBe(133);
+    expect(json.nextobjectid).toBe(138);
   });
 
   it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
@@ -1309,8 +1310,8 @@
     for (const { region } of traces) {
       expect(REGION_NAME[region], region).toBeDefined();
     }
-    // Five of Sales and, since 0028, five of Marketing.
-    expect(createInitialState(floor).traces).toHaveLength(10);
+    // Five of Sales, since 0028 five of Marketing, and since 0037 five of Support.
+    expect(createInitialState(floor).traces).toHaveLength(15);
   });
 });
 
@@ -1381,8 +1382,8 @@
 
   it('leave the walls and the traces as they were', () => {
     expect(wallsOf(floor.rects)).toHaveLength(8);
-    // The five of 0022; the five of 0028 came later.
-    expect(tracesOf(floor.rects)).toHaveLength(10);
+    // The five of 0022; the five of 0028 and the five of 0037 came later.
+    expect(tracesOf(floor.rects)).toHaveLength(15);
     expect(floor.points).toHaveLength(95);
   });
 
@@ -1568,8 +1569,8 @@
 
   it('leave the objects of 0023 and before as they were', () => {
     expect(wallsOf(floor.rects)).toHaveLength(8);
-    // The five of 0022; the five of 0028 came later.
-    expect(tracesOf(floor.rects)).toHaveLength(10);
+    // The five of 0022; the five of 0028 and the five of 0037 came later.
+    expect(tracesOf(floor.rects)).toHaveLength(15);
     expect(areas).toHaveLength(10);
     expect(floor.points).toHaveLength(95);
   });
@@ -1647,10 +1648,12 @@
 
   it('are five, on the cells of the spec, after the five of Sales', () => {
     expect(FIRST_TRACES).toBe(5);
-    expect(traces).toHaveLength(10);
+    // The five of Support follow them (0037).
     expect(traces.slice(0, 5).every((trace) => trace.region === 'sales')).toBe(true);
-    expect(traces.slice(5)).toStrictEqual(TABLE.map(([, , box]) => ({ region: 'marketing', box })));
-    expect(TRACES.slice(5)).toStrictEqual(
+    expect(traces.slice(5, 10)).toStrictEqual(
+      TABLE.map(([, , box]) => ({ region: 'marketing', box })),
+    );
+    expect(TRACES.slice(5, 10)).toStrictEqual(
       TABLE.map(([x, y]) => ({ region: 'marketing', cell: { x, y } })),
     );
   });
@@ -1661,7 +1664,7 @@
       [124, 125, 126, 127, 128].map((id) => [id, 'trace:marketing']),
     );
     expect(objects.slice(123, 128).some((object) => 'point' in object)).toBe(false);
-    expect(floor.rects).toHaveLength(36);
+    expect(floor.rects.slice(31, 36).every((rect) => rect.name === 'trace:marketing')).toBe(true);
   });
 
   it('leave the 123 objects of 0027 and before exactly as they were', () => {
@@ -1737,11 +1740,11 @@
     expect(count(PRINTER)).toBe(1);
   });
 
-  it('start unseen in the state: ten traces, none found, Sales 0 to 4 and Marketing 5 to 9', () => {
-    expect(start.traces).toStrictEqual(
+  it('start unseen in the state, none found, Sales 0 to 4 and Marketing 5 to 9', () => {
+    expect(start.traces.slice(0, 10)).toStrictEqual(
       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({ trace, light: 0, found: null })),
     );
-    expect(start.traces.map((state) => traces[state.trace]?.region)).toStrictEqual([
+    expect(start.traces.slice(0, 10).map((state) => traces[state.trace]?.region)).toStrictEqual([
       ...Array.from({ length: 5 }, () => 'sales'),
       ...Array.from({ length: 5 }, () => 'marketing'),
     ]);
@@ -2082,13 +2085,13 @@
     expect(HINT_FIGURE).toBe('intern');
   });
 
-  it('is the last object of the file, the point figure:intern with the id 132', () => {
+  it('is the point figure:intern with the id 132, the last point of the file', () => {
+    // The traces of 0037 follow him; they are rectangles.
     const objects = floorJson().layers[3].objects;
-    expect(objects).toHaveLength(132);
     const his = objects[131];
     expect([his?.id, his?.name, his?.x, his?.y]).toStrictEqual([132, 'figure:intern', 616, 488]);
     expect(his !== undefined && 'point' in his).toBe(true);
-    expect(floorJson().nextobjectid).toBe(133);
+    expect(objects.slice(132).some((object) => 'point' in object)).toBe(false);
     expect(floor.points.at(-1)).toStrictEqual({ name: 'figure:intern', ...INTERN });
   });
 
@@ -2189,10 +2192,10 @@
     expect(closed.dialogue).toBeNull();
   });
 
-  it('has hints for every case that has traces on the floor', () => {
+  it('has hints for every case, and every case has traces on the floor', () => {
     const regions = [...new Set(tracesOf(floor.rects).map((trace) => trace.region))];
-    expect(regions).toStrictEqual(CASES.map((entry) => entry.region));
-    for (const region of regions) {
+    for (const { region } of CASES) {
+      expect(regions, region).toContain(region);
       expect(HINTS[region], region).toBeDefined();
     }
   });
@@ -2239,5 +2242,146 @@
     state = update(state, NO_INPUT, floor);
     expect(state.dialogue).toStrictEqual({ speaker: 'story', index: CLOSE_SCENE, page: 0 });
     expect(state.finished).toBeNull();
+  });
+});
+
+describe('the traces of Support on the floor (0037)', () => {
+  /** Cell and box, in file order: the spec's table. */
+  const TABLE: readonly (readonly [number, number, Box])[] = [
+    [52, 61, { x: 832, y: 976, width: 16, height: 16 }],
+    [72, 61, { x: 1152, y: 976, width: 16, height: 16 }],
+    [88, 67, { x: 1408, y: 1072, width: 16, height: 16 }],
+    [62, 73, { x: 992, y: 1168, width: 16, height: 16 }],
+    [98, 73, { x: 1568, y: 1168, width: 16, height: 16 }],
+  ];
+  const traces = tracesOf(floor.rects);
+  const start = createInitialState(floor);
+  /** The state with the traces of the given indices found. */
+  const found = (...indices: readonly number[]): GameState => ({
+    ...start,
+    traces: start.traces.map((trace, i) => (indices.includes(i) ? { ...trace, found: 1 } : trace)),
+  });
+  const SALES = [0, 1, 2, 3, 4];
+  const MARKETING = [5, 6, 7, 8, 9];
+  const SUPPORT = [10, 11, 12, 13, 14];
+
+  it('are five, on the cells of the spec, after the five of Marketing', () => {
+    expect(SECOND_TRACES).toBe(10);
+    expect(traces).toHaveLength(15);
+    expect(traces.slice(10)).toStrictEqual(TABLE.map(([, , box]) => ({ region: 'support', box })));
+    expect(TRACES.slice(10)).toStrictEqual(
+      TABLE.map(([x, y]) => ({ region: 'support', cell: { x, y } })),
+    );
+  });
+
+  it('are the last five objects of the file, rectangles with the ids 133 to 137, after the intern of 0033', () => {
+    const objects = floorJson().layers[3].objects;
+    expect(objects).toHaveLength(137);
+    expect(objects.slice(132).map((object) => [object.id, object.name])).toStrictEqual(
+      [133, 134, 135, 136, 137].map((id) => [id, 'trace:support']),
+    );
+    expect(objects.slice(132).some((object) => 'point' in object)).toBe(false);
+    expect(floorJson().nextobjectid).toBe(138);
+    expect(floor.rects).toHaveLength(41);
+    expect(floor.rects.slice(36).every((rect) => rect.name === 'trace:support')).toBe(true);
+  });
+
+  it('leave the 132 objects of 0033 and before exactly as they were', () => {
+    // SHA-256 over the first 132 objects, recorded from the generator before this feature.
+    const before = JSON.stringify(floorJson().layers[3].objects.slice(0, 132));
+    expect(createHash('sha256').update(before).digest('hex')).toBe(
+      '68289246f8cf80a03e0cb21c72646f2cdb7953472e97fd2cbc9e183de366db44',
+    );
   });
+
+  it('lie in the area of Support, each on a desk with a screen whose chair stands on the cell below', () => {
+    const support = areasOf(floor.rects).filter((area) => area.region === 'support');
+    expect(support).toHaveLength(1);
+    for (const [column, row, box] of TABLE) {
+      expect(
+        support.some((area) => inArea(area, { x: box.x, y: box.y })),
+        `(${column}, ${row})`,
+      ).toBe(true);
+      expect(floor.detail[cell(column, row)], `(${column}, ${row})`).toBe(DESK_MONITOR_PARTITION);
+      expect(floor.detail[cell(column, row + 1)], `(${column}, ${row + 1})`).toBe(CHAIR);
+      expect(floor.detail[cell(column, row + 2)], `(${column}, ${row + 2})`).toBe(EMPTY);
+    }
+  });
+
+  it('are in the light of a player who looks up from any place on the cell below the chair', () => {
+    for (const [column, row] of TABLE) {
+      const trace = traces.find(
+        (candidate) => candidate.box.x === column * 16 && candidate.box.y === row * 16,
+      );
+      let places = 0;
+      for (let x = column * 16; x <= column * 16 + 16; x += 2) {
+        for (let y = (row + 2) * 16 + 2; y <= (row + 3) * 16; y += 2) {
+          if (!reached({ x, y })) {
+            continue;
+          }
+          places += 1;
+          const player = {
+            x,
+            y,
+            facing: 'up',
+            frame: 0,
+            frameTimer: 0,
+            grace: 0,
+            recoil: NO_RECOIL,
+          } as const;
+          expect(
+            trace !== undefined && traceInLight(trace, player, true, floor),
+            `(${column}, ${row}) from (${x}, ${y})`,
+          ).toBe(true);
+        }
+      }
+      expect(places, `(${column}, ${row})`).toBe(54);
+    }
+  });
+
+  it('leave twenty-two of the twenty-seven screens of Support without a trace, and no row without one', () => {
+    const screens: [number, number][] = [];
+    for (let row = 58; row <= 78; row += 1) {
+      for (let column = 49; column <= 106; column += 1) {
+        if (floor.detail[cell(column, row)] === DESK_MONITOR_PARTITION) {
+          screens.push([column, row]);
+        }
+      }
+    }
+    expect(screens).toHaveLength(27);
+    const rows = [...new Set(screens.map(([, row]) => row))];
+    expect(rows).toStrictEqual([61, 67, 73]);
+    for (const row of rows) {
+      expect(
+        TABLE.some(([, traceRow]) => traceRow === row),
+        `row ${row}`,
+      ).toBe(true);
+    }
+  });
+
+  it('start unseen in the state: fifteen traces, none found, Support 10 to 14', () => {
+    expect(start.traces).toStrictEqual(
+      Array.from({ length: 15 }, (_, trace) => ({ trace, light: 0, found: null })),
+    );
+    expect(start.traces.slice(10).map((state) => traces[state.trace]?.region)).toStrictEqual(
+      Array.from({ length: 5 }, () => 'support'),
+    );
+    expect(REGION_NAME.support).toBeDefined();
+  });
+
+  it('make each region ready exactly when its own five are found, whatever is found in the others', () => {
+    const ready = (state: GameState): boolean[] =>
+      ['sales', 'marketing', 'support'].map((region) => isReady(region, progressOf(state, floor)));
+    expect(ready(start)).toStrictEqual([false, false, false]);
+    // Five.
+    expect(ready(found(...SUPPORT))).toStrictEqual([false, false, true]);
+    expect(ready(found(...SALES))).toStrictEqual([true, false, false]);
+    // Ten: the other two, or one of them and Support.
+    expect(ready(found(...SALES, ...MARKETING))).toStrictEqual([true, true, false]);
+    expect(ready(found(...MARKETING, ...SUPPORT))).toStrictEqual([false, true, true]);
+    // Fourteen: all but one of Support.
+    expect(ready(found(...SALES, ...MARKETING, 10, 11, 12, 13))).toStrictEqual([true, true, false]);
+    // Fifteen.
+    expect(ready(found(...SALES, ...MARKETING, ...SUPPORT))).toStrictEqual([true, true, true]);
+  });
 });
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -779,9 +779,9 @@
     return state;
   };
 
-  it('starts on the floor with ten traces, unseen and not found (0022, 0028)', () => {
+  it('starts on the floor with fifteen traces, unseen and not found (0022, 0028, 0037)', () => {
     expect(createInitialState(FLOOR_MAP).traces).toStrictEqual(
-      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({ trace, light: 0, found: null })),
+      Array.from({ length: 15 }, (_, trace) => ({ trace, light: 0, found: null })),
     );
     expect(createInitialState(MAP).traces).toStrictEqual([]);
   });
```

  The cases tab with three regions:

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -624,3 +624,56 @@
     expect(calls[7]).toBe('drawSprite 33 at 16,54');
   });
 });
+
+describe('the cases tab with three regions (0037)', () => {
+  /** Five traces each of Sales, Marketing and Support, in the order of the floor. */
+  const REGION_OF = ['sales', 'marketing', 'support'] as const;
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...CONTENT.map,
+      rects: Array.from({ length: 15 }, (_, n) => ({
+        name: `trace:${REGION_OF[Math.floor(n / 5)]}`,
+        x: 16 * n,
+        y: 0,
+        width: 16,
+        height: 16,
+      })),
+    },
+  };
+  const cases = (found: readonly number[], settings = GERMAN): string[] => {
+    const renderer = recordingRenderer();
+    const traces: TraceState[] = Array.from({ length: 15 }, (_, trace) => ({
+      trace,
+      light: 0,
+      found: found.includes(trace) ? 60 : null,
+    }));
+    drawJournal(renderer, { ...reading('cases'), traces }, { tab: 'cases' }, content, settings);
+    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
+  };
+
+  it('shows Support alone, in the first place, while no trace of the other two is found', () => {
+    const entry = cases([10]);
+    // `Support` 7 and `Spuren: 1 von 5` 12 glyphs.
+    expect(entry).toHaveLength(7 + 12);
+    expect(entry[0]).toBe('drawSprite 51 at 16,36');
+    expect(entry[7]).toBe('drawSprite 51 at 16,48');
+  });
+
+  it('shows Sales, Marketing and Support 36 px apart, with a trace of each found', () => {
+    const entries = cases([0, 5, 10]);
+    // `Vertrieb` 8, `Marketing` 9 and `Support` 7 glyphs, each with its count of 12.
+    expect(entries).toHaveLength(8 + 12 + 9 + 12 + 7 + 12);
+    expect(entries[0]).toBe('drawSprite 54 at 16,36');
+    expect(entries[20]).toBe('drawSprite 45 at 16,72');
+    expect(entries[41]).toBe('drawSprite 51 at 16,108');
+    expect(entries[48]).toBe('drawSprite 51 at 16,120');
+  });
+
+  it('reads `Support` and `Traces: 5 of 5` in English', () => {
+    const entry = cases([10, 11, 12, 13, 14], ENGLISH);
+    expect(entry).toHaveLength(7 + 11);
+    expect(entry[0]).toBe('drawSprite 51 at 16,36');
+    expect(entry[7]).toBe('drawSprite 52 at 16,48');
+  });
+});
```

  The smoke test of the traces:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -371,16 +371,15 @@
   await page.keyboard.up('KeyJ');
 });
 
-test('the floor starts with its ten traces, none seen and none found', async ({ page }) => {
+test('the floor starts with its fifteen traces, none seen and none found', async ({ page }) => {
   await start(page);
   // One poll for the whole value: nothing is read from a page that might still be loading.
   await expect
     .poll(() => page.evaluate(() => window.shadowAi?.state.traces), {
-      message: 'window.shadowAi.state.traces holds five traces of Sales and five of Marketing',
+      message:
+        'window.shadowAi.state.traces holds five traces each of Sales, Marketing and Support',
     })
-    .toStrictEqual(
-      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({ trace, light: 0, found: null })),
-    );
+    .toStrictEqual(Array.from({ length: 15 }, (_, trace) => ({ trace, light: 0, found: null })));
 });
 
 test('H opens the help, the game stands still under it, and H closes it again', async ({
```

- [ ] **Step 2: Run them.** `npx tsc --noEmit` reports one error: `SECOND_TRACES` is not
  exported yet. `npx vitest run` — 13 tests fail in three files: the three of `the cases tab
  with three regions (0037)`; `starts on the floor with fifteen traces, unseen and not found
  (0022, 0028, 0037)`; and nine of the floor — `keeps the five points of 0010 first, with
  their ids`, `have a name for their region, and start unseen in the state`, `leave the walls
  and the traces as they were`, `leave the objects of 0023 and before as they were`, and five
  of the new block. Three tests of the new block are green before the code, because they hold
  what is already there: the digest of the 132 objects, the desks and chairs of the five
  cells, and the count of the screens. With a dev server running,
  `npx playwright test -g "fifteen traces"` fails: the state holds ten.

- [ ] **Step 3: The name of the region:**

```diff
--- a/src/game/journal.ts
+++ b/src/game/journal.ts
@@ -54,6 +54,7 @@
 export const REGION_NAME: Readonly<Partial<Record<string, TextKey>>> = {
   sales: textKey('region.sales'),
   marketing: textKey('region.marketing'),
+  support: textKey('region.support'),
 };
 
 /** The entries of the creatures tab: every species captured at least once, in SPECIES order. */
```

- [ ] **Step 4: The layout.** Five entries of `TRACES`, and the traces from the eleventh on
  are written at the end of the file:

```diff
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -237,11 +237,12 @@
 export const FIRST_FIGURES = 1;
 
 /**
- * The traces (0022, 0028): per trace its region and the cell of the device it lies on. Five in
- * Sales, each on the desk with a screen of a cubicle, spread over the room with at least one
- * in every row of cubicles. Five in Marketing: four on a screen of a desk island, three in the
- * upper row and one in the lower, and one on the printer at the lower wall. The order is the
- * order in the file.
+ * The traces (0022, 0028, 0037): per trace its region and the cell of the device it lies on.
+ * Five in Sales, each on the desk with a screen of a cubicle, spread over the room with at
+ * least one in every row of cubicles. Five in Marketing: four on a screen of a desk island,
+ * three in the upper row and one in the lower, and one on the printer at the lower wall. Five
+ * in Support, each on the desk with a screen of a cubicle, with at least one in every row.
+ * The order is the order in the file.
  */
 export const TRACES: readonly { readonly region: string; readonly cell: Point }[] = [
   { region: 'sales', cell: { x: 83, y: 28 } },
@@ -254,6 +255,11 @@
   { region: 'marketing', cell: { x: 41, y: 62 } },
   { region: 'marketing', cell: { x: 5, y: 70 } },
   { region: 'marketing', cell: { x: 27, y: 78 } },
+  { region: 'support', cell: { x: 52, y: 61 } },
+  { region: 'support', cell: { x: 72, y: 61 } },
+  { region: 'support', cell: { x: 88, y: 67 } },
+  { region: 'support', cell: { x: 62, y: 73 } },
+  { region: 'support', cell: { x: 98, y: 73 } },
 ];
 
 /**
@@ -262,6 +268,13 @@
  * (0028).
  */
 export const FIRST_TRACES = 5;
+
+/**
+ * How many traces stand before the mirages in the file: the five of 0022 and the five of
+ * 0028. Every later trace is written at the end of the file, after the figures of 0033, so
+ * that no object of an earlier feature changes its id (0037).
+ */
+export const SECOND_TRACES = 10;
 
 /**
  * The areas of the regions (0023): which room of the layout belongs to which region of the
@@ -1229,10 +1242,12 @@
   const firstArea = firstTrace + FIRST_TRACES;
   const firstRest = firstArea + REGION_AREAS.length;
   const firstLaterTrace = firstRest + RESTS.length;
-  const laterTraces = TRACES.slice(FIRST_TRACES);
+  const laterTraces = TRACES.slice(FIRST_TRACES, SECOND_TRACES);
   const firstMirage = firstLaterTrace + laterTraces.length;
   const firstLaterFigure = firstMirage + MIRAGES.length;
   const laterFigures = FIGURES.slice(FIRST_FIGURES);
+  const firstLastTrace = firstLaterFigure + laterFigures.length;
+  const lastTraces = TRACES.slice(SECOND_TRACES);
   return {
     compressionlevel: -1,
     height: FLOOR_HEIGHT,
@@ -1274,6 +1289,9 @@
           ...laterFigures.map((figure, i) =>
             pointObject(firstLaterFigure + i, `figure:${figure.id}`, figure.at),
           ),
+          ...lastTraces.map((trace, i) =>
+            rectObject(firstLastTrace + i, `trace:${trace.region}`, traceBox(trace.cell)),
+          ),
         ],
         opacity: 1,
         type: 'objectgroup',
@@ -1283,7 +1301,7 @@
       },
     ],
     nextlayerid: 5,
-    nextobjectid: firstLaterFigure + laterFigures.length,
+    nextobjectid: firstLastTrace + lastTraces.length,
     orientation: 'orthogonal',
     renderorder: 'right-down',
     tiledversion: '1.11.2',
```

- [ ] **Step 5: Generate the map** — `npm run gen-floor`. `public/maps/floor.tmj` gets five
  rectangles at the end of its objects and `nextobjectid` 138; nothing else in it changes.
  Its SHA-256 is `a93f8c06b9945d1310afa6f7575463c73cf339cbcbb947c81d4a6b933353bbc7`.

- [ ] **Step 6: Run** `npm run check` — 1601 unit tests. Then
  `npx playwright test -g "fifteen traces"`: passed.

- [ ] **Step 7: Commit** — `Put the traces of Support on the floor`. Body: five screens in
  three rows of cubicles; written at the end of the file so that no object of an earlier
  feature changes its id.

---

### Task 3: The policy tab stacks its blocks

**Files:**
- Modify: `src/render/draw-journal.ts`
- Test: `tests/unit/draw-journal.test.ts`

**Interfaces:**
- Consumes: `policy.support` (Task 1), for the test of three blocks.
- Produces: `POLICY_GAP = 12`; `policyOrigins(blocks: readonly TextKey[], language: Language):
  Point[]`. `POLICY_PITCH` is removed.

- [ ] **Step 1: Write the failing tests.** Three tests of 0024 and 0028 change: the second
  block after the three lines of Marketing starts at y = 84, not 96. One block is new:

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -15,7 +15,8 @@
   JOURNAL_RULE,
   NOTHING_TEXT,
   POLICY_BLOCK,
-  POLICY_PITCH,
+  POLICY_GAP,
+  policyOrigins,
   TAB_CLOSED,
   TAB_OPEN,
   tabBox,
@@ -28,6 +29,7 @@
   type SceneSettings,
 } from '../../src/render/draw-scene';
 import type { Renderer, SpriteSheet } from '../../src/render/renderer';
+import { textKey, textOf } from '../../src/text/text';
 import { grassMap } from './grass-map';
 
 /** A renderer that only records what it was asked to draw, one line per call. */
@@ -361,13 +363,12 @@
   };
 
   it('places the outcome and the blocks as the spec says', () => {
-    expect([CASE_OUTCOME, POLICY_BLOCK, POLICY_PITCH]).toStrictEqual([
+    expect([CASE_OUTCOME, POLICY_BLOCK, POLICY_GAP]).toStrictEqual([
       { x: 16, y: 60 },
       { x: 16, y: 36 },
-      60,
+      12,
     ]);
-    // Two blocks of four lines fit the surface: the second ends at y = 142.
-    expect(POLICY_BLOCK.y + POLICY_PITCH + 3 * 12 + 10).toBe(142);
+    // Since 0037 a block starts 12 px below the last line of the block before it.
   });
 
   it('adds the outcome as the third line of the case, under its name and its count', () => {
@@ -533,15 +534,17 @@
     expect(entries[41]).toBe('drawSprite 39 at 16,96');
   });
 
-  it('draws the block of the case solved first from (16, 36) and the other from (16, 96)', () => {
+  it('draws the block of the case solved first from (16, 36) and the other 12 px below its last line', () => {
     const all = [0, 1, 2, 3, 4, ...ALL_OF_MARKETING];
     // `Was eine Maschine …`: three lines of 35, 36 and 31 glyphs; `Jeder Text …`: 142.
+    // After the three lines of Marketing the second block starts at y = 84 (0037).
     const marketingFirst = shown('policy', all, [MARKETING, SALES]);
     expect(marketingFirst).toHaveLength(102 + 142);
     expect(marketingFirst[0]).toBe('drawSprite 55 at 16,36');
-    expect(marketingFirst[102]).toBe('drawSprite 42 at 16,96');
+    expect(marketingFirst[102]).toBe('drawSprite 42 at 16,84');
     expect(marketingFirst.slice(0, 102).every((call) => /,(36|48|60)$/.test(call))).toBe(true);
-    expect(marketingFirst.slice(102).every((call) => /,(96|108|120|132)$/.test(call))).toBe(true);
+    expect(marketingFirst.slice(102).every((call) => /,(84|96|108|120)$/.test(call))).toBe(true);
+    // After the four lines of Sales it starts at y = 96, as before.
     const salesFirst = shown('policy', all, [
       { region: 'sales', at: 900 },
       { region: 'marketing', at: 950 },
@@ -564,7 +567,7 @@
     expect(cases[20]).toBe('drawSprite 51 at 16,60');
     const blocks = shown('policy', ALL_OF_MARKETING, [MARKETING, SALES], ENGLISH);
     expect(blocks[0]).toBe('drawSprite 55 at 16,36');
-    expect(blocks).toContain('drawSprite 37 at 16,96');
+    expect(blocks).toContain('drawSprite 37 at 16,84');
   });
 });
 
@@ -675,5 +678,50 @@
     expect(entry).toHaveLength(7 + 11);
     expect(entry[0]).toBe('drawSprite 51 at 16,36');
     expect(entry[7]).toBe('drawSprite 52 at 16,48');
+  });
+});
+
+describe('the policy tab stacks its blocks (0037)', () => {
+  const SALES = textKey('policy.sales');
+  const MARKETING = textKey('policy.marketing');
+  const SUPPORT = textKey('policy.support');
+
+  it('starts the first block at (16, 36) and each further one 12 px below the last line before it', () => {
+    expect(policyOrigins([], 'de')).toStrictEqual([]);
+    expect(policyOrigins([SALES], 'de')).toStrictEqual([{ x: 16, y: 36 }]);
+    // Four lines, then 12 px: 36 + 4 × 12 + 12.
+    expect(policyOrigins([SALES, MARKETING], 'de')).toStrictEqual([
+      { x: 16, y: 36 },
+      { x: 16, y: 96 },
+    ]);
+    // Three lines, then 12 px: 36 + 3 × 12 + 12.
+    expect(policyOrigins([MARKETING, SALES], 'de')).toStrictEqual([
+      { x: 16, y: 36 },
+      { x: 16, y: 84 },
+    ]);
+    expect(policyOrigins([SUPPORT, SALES], 'en')).toStrictEqual([
+      { x: 16, y: 36 },
+      { x: 16, y: 84 },
+    ]);
   });
+
+  it('fits the three blocks of today on the surface in every order, in both languages', () => {
+    const orders = [
+      [SALES, MARKETING, SUPPORT],
+      [SALES, SUPPORT, MARKETING],
+      [MARKETING, SALES, SUPPORT],
+      [MARKETING, SUPPORT, SALES],
+      [SUPPORT, SALES, MARKETING],
+      [SUPPORT, MARKETING, SALES],
+    ];
+    for (const language of ['de', 'en'] as const) {
+      for (const order of orders) {
+        const origins = policyOrigins(order, language);
+        const last = order[2];
+        const lines = last === undefined ? 0 : textOf(last, language).split('\n').length;
+        // The top of the last line is y = 168: it ends at 178, inside the 180 px.
+        expect((origins[2]?.y ?? 0) + (lines - 1) * 12, `${language} ${order.join()}`).toBe(168);
+      }
+    }
+  });
 });
```

- [ ] **Step 2: Run them.** `npx tsc --noEmit` reports two errors: `POLICY_GAP` and
  `policyOrigins` do not exist. `npx vitest run tests/unit/draw-journal.test.ts` — 5 of 40
  tests fail: `places the outcome and the blocks as the spec says`, `draws the block of the
  case solved first from (16, 36) and the other 12 px below its last line`, the test that
  draws both tabs in English, and the two of `the policy tab stacks its blocks (0037)`.

- [ ] **Step 3: The origins of the blocks:**

```diff
--- a/src/render/draw-journal.ts
+++ b/src/render/draw-journal.ts
@@ -3,9 +3,9 @@
 import { CASE_TEXT, ENTRY_TEXT, entriesOf, REGION_NAME, TAB_TEXT } from '../game/journal';
 import { type GameState, JOURNAL_TABS, type JournalState } from '../game/state';
 import { caseEntries, tracesOf } from '../game/trace';
-import { type TextKey, textOf } from '../text/text';
+import { type Language, type TextKey, textOf } from '../text/text';
 import type { SceneContent, SceneSettings } from './draw-scene';
-import { drawNumber, drawText } from './draw-text';
+import { drawNumber, drawText, LINE_PITCH } from './draw-text';
 import { GLYPH_WIDTH } from './font';
 import { PAGE_BACKGROUND, type PaletteColour } from './palette';
 import type { Renderer } from './renderer';
@@ -43,10 +43,27 @@
 export const CASE_PITCH = 36;
 /** The third line of a solved case: its outcome (0024). */
 export const CASE_OUTCOME: Point = { x: 16, y: 60 };
-/** A block k of the policy, from 0, starts POLICY_PITCH below block k − 1 (0024). */
+/** The first block of the policy starts here (0024). */
 export const POLICY_BLOCK: Point = { x: 16, y: 36 };
-export const POLICY_PITCH = 60;
+/** A block starts this far below the last line of the block before it (0037). */
+export const POLICY_GAP = 12;
 
+/**
+ * Where the blocks of the policy start (0037): they are stacked by their height. The first
+ * starts at POLICY_BLOCK, and each further one POLICY_GAP below the last line of the block
+ * before it — a block of n lines is followed by the next one 12n + 12 px lower. The lines of
+ * a block are those of the language it is drawn in.
+ */
+export function policyOrigins(blocks: readonly TextKey[], language: Language): Point[] {
+  const origins: Point[] = [];
+  let y = POLICY_BLOCK.y;
+  for (const block of blocks) {
+    origins.push({ x: POLICY_BLOCK.x, y });
+    y += textOf(block, language).split('\n').length * LINE_PITCH + POLICY_GAP;
+  }
+  return origins;
+}
+
 /** The rectangle of tab k. */
 export function tabBox(k: number): Box {
   return { x: TAB_LEFT + k * TAB_PITCH, y: TAB_TOP, width: TAB_WIDTH, height: TAB_HEIGHT };
@@ -140,15 +157,10 @@
       );
     }
   }
+  const origins = policyOrigins(blocks, language);
   for (const [k, block] of blocks.entries()) {
-    drawText(
-      renderer,
-      content.fontSheet,
-      block,
-      language,
-      POLICY_BLOCK.x,
-      POLICY_BLOCK.y + k * POLICY_PITCH,
-    );
+    const origin = origins[k] ?? POLICY_BLOCK;
+    drawText(renderer, content.fontSheet, block, language, origin.x, origin.y);
   }
   for (const [k, species] of entries.entries()) {
     const down = k * ENTRY_PITCH;
```

- [ ] **Step 4: Run** `npm run check` — 1603 unit tests.

- [ ] **Step 5: Commit** — `Stack the blocks of the policy by their height`. Body: three
  blocks do not fit 60 px apart; 12 px below the last line of the block before, the three of
  today end at y = 178 in every order.

---

### Task 4: The case

**Files:**
- Modify: `src/game/cases.ts`, `src/game/hints.ts`
- Test: `tests/unit/cases.test.ts`, `tests/unit/hints.test.ts`, `tests/unit/story.test.ts`,
  `tests/unit/state.test.ts`, `tests/unit/floor.test.ts`, `tests/unit/draw-journal.test.ts`,
  `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: the keys of Task 1; the traces of Task 2; `policyOrigins` of Task 3.
- Produces: `CASES[2]`, the case of Support; `HINTS.support`.

No rule changes in this task. The tests of the close, of the hints and of the scene that
knew two cases get the third.

- [ ] **Step 1: The case, tested through its rules:**

```diff
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -493,8 +493,8 @@
         )?.pages;
 
   it('is the second case, after Sales: its source, its answer, its afterwards, its outcome, its block', () => {
-    expect(CASES).toHaveLength(2);
-    expect(CASES.map((entry) => entry.region)).toStrictEqual(['sales', 'marketing']);
+    // Support is the third (0037).
+    expect(CASES.slice(0, 2).map((entry) => entry.region)).toStrictEqual(['sales', 'marketing']);
     expect(CASES[1]).toStrictEqual({
       region: 'marketing',
       source: 'person:marketing',
@@ -690,3 +690,142 @@
     expect(named(AFTER)).toBe(true);
   });
 });
+
+describe('the case of Support (0037)', () => {
+  type Region = 'sales' | 'marketing' | 'support';
+  const REGIONS_IN_ORDER: readonly Region[] = ['sales', 'marketing', 'support'];
+  const EVERYDAY_OF: Readonly<Record<Region, readonly TextKey[]>> = {
+    sales: [textKey('talk.sales-everyday')],
+    marketing: [textKey('talk.marketing-everyday')],
+    support: [textKey('talk.support-everyday')],
+  };
+  const SUPPORT_ANSWER = [textKey('talk.support-source-1'), textKey('talk.support-source-2')];
+  const SUPPORT_AFTER = [textKey('talk.support-after')];
+  const ROW: Readonly<Record<Region, number>> = { sales: 48, marketing: 96, support: 144 };
+  /** The three sources, each waiting ten seconds on its first point, 48 px apart. */
+  const SOURCES: readonly NamedPoint[] = REGIONS_IN_ORDER.flatMap((region) => [
+    { name: `person:${region}:1`, x: 64, y: ROW[region], pause: 600 },
+    { name: `person:${region}:2`, x: 128, y: ROW[region] },
+  ]);
+  /** 20x12 cells of open floor: two traces of each region, in the order of the cases. */
+  const THREE: TileMap = grassMap(
+    20,
+    12,
+    { x: 104, y: 48 },
+    SOURCES,
+    REGIONS_IN_ORDER.flatMap((region): NamedRect[] =>
+      [240, 272].map((x) => ({
+        name: `trace:${region}`,
+        x,
+        y: ROW[region] - 16,
+        width: 16,
+        height: 16,
+      })),
+    ),
+  );
+  /** The start of THREE at step 1000 with its six traces found, or not, as given. */
+  const having = (...ticks: readonly (number | null)[]): GameState => ({
+    ...createInitialState(THREE),
+    tick: T0,
+    traces: found(...ticks),
+  });
+  const ALL = having(10, 20, 30, 40, 50, 60);
+  /** The figure 40 px right of the colleague of the region: in reach of that one alone. */
+  const beside = (state: GameState, region: Region): GameState => ({
+    ...state,
+    player: { ...state.player, x: 104, y: ROW[region] },
+  });
+  const step = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
+    inputs.reduce((state, input) => update(state, input, THREE), start);
+  /** Three presses of talk: the answer opens, turns to its second page and closes. */
+  const answer = (start: GameState): GameState => step(start, TALK, NONE, TALK, NONE, TALK, NONE);
+  const said = (state: GameState) =>
+    state.dialogue === null
+      ? null
+      : speakerOf(
+          state.dialogue,
+          speakersOf([], state.movers, routesOf(THREE.points), undefined, progressOf(state, THREE)),
+        )?.pages;
+
+  it('is the third case, after Marketing: its source, its answer, its afterwards, its outcome, its block', () => {
+    expect(CASES).toHaveLength(3);
+    expect(CASES.map((entry) => entry.region)).toStrictEqual(REGIONS_IN_ORDER);
+    expect(CASES[2]).toStrictEqual({
+      region: 'support',
+      source: 'person:support',
+      answer: SUPPORT_ANSWER,
+      after: SUPPORT_AFTER,
+      outcome: textKey('case.support-outcome'),
+      policy: textKey('policy.support'),
+    });
+  });
+
+  it('is ready exactly when its own traces are found, whatever is found in the other two', () => {
+    const ready = (state: GameState): boolean[] =>
+      REGIONS_IN_ORDER.map((region) => isReady(region, progressOf(state, THREE)));
+    expect(ready(having(null, null, null, null, 10, 20))).toStrictEqual([false, false, true]);
+    expect(ready(having(10, 20, 30, 40, 50, null))).toStrictEqual([true, true, false]);
+    expect(ready(having(10, null, 30, null, 50, 60))).toStrictEqual([false, false, true]);
+    expect(ready(ALL)).toStrictEqual([true, true, true]);
+  });
+
+  it('gives its source the answer when it is ready, and the other two their everyday pages', () => {
+    const support = having(null, null, null, null, 10, 20);
+    expect(said(step(beside(support, 'support'), TALK))).toStrictEqual(SUPPORT_ANSWER);
+    expect(said(step(beside(support, 'sales'), TALK))).toStrictEqual(EVERYDAY_OF.sales);
+    expect(said(step(beside(support, 'marketing'), TALK))).toStrictEqual(EVERYDAY_OF.marketing);
+    // One trace of Support is missing: the everyday line, whatever is found elsewhere.
+    const almost = having(10, 20, 30, 40, 50, null);
+    expect(said(step(beside(almost, 'support'), TALK))).toStrictEqual(EVERYDAY_OF.support);
+    expect(said(step(beside(almost, 'sales'), TALK))).toStrictEqual(ANSWER);
+  });
+
+  it('says "afterwards" once its case is solved, and the other two still their everyday lines', () => {
+    const solved = answer(beside(having(null, null, null, null, 10, 20), 'support'));
+    expect(said(step(solved, TALK))).toStrictEqual(SUPPORT_AFTER);
+    expect(said(step(beside(solved, 'sales'), TALK))).toStrictEqual(EVERYDAY_OF.sales);
+    expect(said(step(beside(solved, 'marketing'), TALK))).toStrictEqual(EVERYDAY_OF.marketing);
+  });
+
+  it('is solved first when the player solves it first: six of six, and it earns no upgrade', () => {
+    const first = answer(beside(ALL, 'support'));
+    expect(first.solved).toStrictEqual([{ region: 'support', at: T0 + 5 }]);
+    expect(first.overview).toStrictEqual({ current: 6, max: 6 });
+    expect(first.upgrades).toStrictEqual([]);
+  });
+
+  it('gives eight of eight and the wider cone with all three solved, in every order', () => {
+    const orders: readonly (readonly Region[])[] = [
+      ['sales', 'marketing', 'support'],
+      ['sales', 'support', 'marketing'],
+      ['marketing', 'sales', 'support'],
+      ['marketing', 'support', 'sales'],
+      ['support', 'sales', 'marketing'],
+      ['support', 'marketing', 'sales'],
+    ];
+    for (const order of orders) {
+      const all = order.reduce((state, region) => answer(beside(state, region)), ALL);
+      expect(
+        all.solved.map((entry) => entry.region),
+        order.join(),
+      ).toStrictEqual(order);
+      expect(all.overview, order.join()).toStrictEqual({ current: 8, max: 8 });
+      expect(all.upgrades, order.join()).toStrictEqual(['wide-cone']);
+    }
+  });
+
+  it('gives the journal its outcome and its block, the blocks in the order they were solved', () => {
+    const support = [{ region: 'support', at: 5 }];
+    expect(outcomeOf('support', [])).toBeNull();
+    expect(outcomeOf('support', support)).toBe(textKey('case.support-outcome'));
+    expect(outcomeOf('sales', support)).toBeNull();
+    expect(policyBlocks(support)).toStrictEqual([textKey('policy.support')]);
+    expect(
+      policyBlocks([{ region: 'marketing', at: 2 }, ...support, { region: 'sales', at: 9 }]),
+    ).toStrictEqual([
+      textKey('policy.marketing'),
+      textKey('policy.support'),
+      textKey('policy.sales'),
+    ]);
+  });
+});
```

- [ ] **Step 2: The hints:**

```diff
--- a/tests/unit/hints.test.ts
+++ b/tests/unit/hints.test.ts
@@ -21,12 +21,14 @@
 const NONE = NO_INPUT;
 const TALK: GameInput = { ...NONE, talk: true };
 const box = { x: 0, y: 0, width: 16, height: 16 };
-/** Two traces of Sales, then two of Marketing. */
+/** Two traces of Sales, then two of Marketing, then two of Support (0037). */
 const PLACES: readonly Trace[] = [
   { region: 'sales', box },
   { region: 'sales', box },
   { region: 'marketing', box },
   { region: 'marketing', box },
+  { region: 'support', box },
+  { region: 'support', box },
 ];
 /** The progress with the traces of the given indices found and the given regions solved. */
 const progress = (found: readonly number[], ...solved: readonly string[]): Progress => ({
@@ -42,6 +44,7 @@
 });
 const SALES = HINTS.sales as CaseHints;
 const MARKETING = HINTS.marketing as CaseHints;
+const SUPPORT = HINTS.support as CaseHints;
 
 describe('the hints (0033)', () => {
   it('are said by the intern, a member of the cast', () => {
@@ -62,6 +65,11 @@
         traces: textKey('talk.intern-marketing-traces'),
         source: textKey('talk.intern-marketing-source'),
       },
+      support: {
+        start: textKey('talk.intern-support-start'),
+        traces: textKey('talk.intern-support-traces'),
+        source: textKey('talk.intern-support-source'),
+      },
     });
     expect([HINT_LAMP, HINT_DONE]).toStrictEqual([
       textKey('talk.intern-lamp'),
@@ -105,16 +113,29 @@
     expect(hintOf(true, progress([0, 1, 2, 3], 'sales'))).toBe(MARKETING.source);
   });
 
-  it('is the last page once every case is solved, in either order', () => {
-    expect(hintOf(true, progress([0, 1, 2, 3], 'sales', 'marketing'))).toBe(HINT_DONE);
-    expect(hintOf(true, progress([0, 1, 2, 3], 'marketing', 'sales'))).toBe(HINT_DONE);
+  it('goes on to Support once Sales and Marketing are solved, by the same rule (0037)', () => {
+    const both = ['sales', 'marketing'] as const;
+    expect(hintOf(true, progress([0, 1, 2, 3], ...both))).toBe(SUPPORT.start);
+    expect(hintOf(true, progress([0, 1, 2, 3, 4], ...both))).toBe(SUPPORT.traces);
+    expect(hintOf(true, progress([0, 1, 2, 3, 4, 5], ...both))).toBe(SUPPORT.source);
+    // Whatever is found in Support, the earlier cases come first.
+    expect(hintOf(true, progress([4, 5]))).toBe(SALES.start);
+    expect(hintOf(true, progress([0, 1, 4, 5], 'sales'))).toBe(MARKETING.start);
   });
 
+  it('is the last page once every case is solved, in any order', () => {
+    const all = [0, 1, 2, 3, 4, 5];
+    expect(hintOf(true, progress(all, 'sales', 'marketing', 'support'))).toBe(HINT_DONE);
+    expect(hintOf(true, progress(all, 'support', 'marketing', 'sales'))).toBe(HINT_DONE);
+    expect(hintOf(true, progress(all, 'marketing', 'support', 'sales'))).toBe(HINT_DONE);
+  });
+
   it('asks the cases in the order of the table it is given: the game passes its own', () => {
     const turned: readonly Case[] = [...CASES].reverse();
-    expect(hintOf(true, progress([]), turned)).toBe(MARKETING.start);
-    expect(hintOf(true, progress([0]), turned)).toBe(MARKETING.start);
-    expect(hintOf(true, progress([], 'marketing'), turned)).toBe(SALES.start);
+    expect(hintOf(true, progress([]), turned)).toBe(SUPPORT.start);
+    expect(hintOf(true, progress([0]), turned)).toBe(SUPPORT.start);
+    expect(hintOf(true, progress([], 'support'), turned)).toBe(MARKETING.start);
+    expect(hintOf(true, progress([], 'support', 'marketing'), turned)).toBe(SALES.start);
   });
 
   it('points to the start of a region that has no trace on the map', () => {
```

- [ ] **Step 3: The close waits for the third case:**

```diff
--- a/tests/unit/story.test.ts
+++ b/tests/unit/story.test.ts
@@ -73,7 +73,10 @@
 describe('the close (0034)', () => {
   const CLOSE = [textKey('story.close-1'), textKey('story.close-2'), textKey('story.close-3')];
   const SALES = { region: 'sales', at: 400 };
-  const MARKETING = { region: 'marketing', at: 700 };
+  const MARKETING = { region: 'marketing', at: 550 };
+  /** The third case of the game since 0037, and here the one solved last. */
+  const SUPPORT = { region: 'support', at: 700 };
+  const ALL = [SALES, MARKETING, SUPPORT];
 
   it('is the second scene, with its three pages', () => {
     expect(SCENES).toStrictEqual([
@@ -94,28 +97,32 @@
     expect(closeDue(100000, [], null)).toBe(false);
     expect(closeDue(100000, [SALES], null)).toBe(false);
     expect(closeDue(100000, [MARKETING], null)).toBe(false);
+    // With Sales and Marketing solved and Support not, it is not due (0037).
+    expect(closeDue(100000, [SALES, MARKETING], null)).toBe(false);
+    expect(closeDue(100000, [SUPPORT, SALES], null)).toBe(false);
   });
 
   it('is due 300 steps after the step that solved the last case, and not one before', () => {
-    expect(closeDue(700, [SALES, MARKETING], null)).toBe(false);
-    expect(closeDue(999, [SALES, MARKETING], null)).toBe(false);
-    expect(closeDue(1000, [SALES, MARKETING], null)).toBe(true);
-    expect(closeDue(5000, [SALES, MARKETING], null)).toBe(true);
+    expect(closeDue(700, ALL, null)).toBe(false);
+    expect(closeDue(999, ALL, null)).toBe(false);
+    expect(closeDue(1000, ALL, null)).toBe(true);
+    expect(closeDue(5000, ALL, null)).toBe(true);
   });
 
-  it('counts from the later case, in either order', () => {
+  it('counts from the latest case, in any order', () => {
     const turned = [
-      { region: 'marketing', at: 400 },
-      { region: 'sales', at: 700 },
+      { region: 'support', at: 400 },
+      { region: 'sales', at: 550 },
+      { region: 'marketing', at: 700 },
     ];
     expect(closeDue(999, turned, null)).toBe(false);
     expect(closeDue(1000, turned, null)).toBe(true);
-    expect(closeDue(1000, [MARKETING, SALES], null)).toBe(true);
+    expect(closeDue(1000, [SUPPORT, MARKETING, SALES], null)).toBe(true);
   });
 
   it('is not due once it was closed', () => {
-    expect(closeDue(1000, [SALES, MARKETING], 1010)).toBe(false);
-    expect(closeDue(100000, [SALES, MARKETING], 0)).toBe(false);
+    expect(closeDue(1000, ALL, 1010)).toBe(false);
+    expect(closeDue(100000, ALL, 0)).toBe(false);
   });
 
   it('follows the table of cases it is given: a third case moves it behind that case', () => {
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -1234,7 +1234,10 @@
 
 describe('the close in the state (0034)', () => {
   const TALK: GameInput = { ...NONE, talk: true };
-  /** Both sources, each waiting ten seconds on its first point, and one trace of each case. */
+  /**
+   * The sources of the three cases (0037), each waiting ten seconds on its first point, and one
+   * trace of each case. The map kept its name from the time of two cases.
+   */
   const BOTH = grassMap(
     20,
     12,
@@ -1242,27 +1245,31 @@
     [
       { name: 'person:sales:1', x: 64, y: 48, pause: 600 },
       { name: 'person:sales:2', x: 128, y: 48 },
-      { name: 'person:marketing:1', x: 64, y: 144, pause: 600 },
-      { name: 'person:marketing:2', x: 128, y: 144 },
+      { name: 'person:marketing:1', x: 64, y: 96, pause: 600 },
+      { name: 'person:marketing:2', x: 128, y: 96 },
+      { name: 'person:support:1', x: 64, y: 144, pause: 600 },
+      { name: 'person:support:2', x: 128, y: 144 },
     ],
     [
       { name: 'trace:sales', x: 240, y: 32, width: 16, height: 16 },
-      { name: 'trace:marketing', x: 240, y: 128, width: 16, height: 16 },
+      { name: 'trace:marketing', x: 240, y: 80, width: 16, height: 16 },
+      { name: 'trace:support', x: 240, y: 128, width: 16, height: 16 },
     ],
   );
   const start = createInitialState(BOTH);
-  /** Both cases solved, the later one at step 700; the game stands at the given tick. */
+  /** Every case solved, the last one at step 700; the game stands at the given tick. */
   const solvedAt = (tick: number, fields: Partial<GameState> = {}): GameState => ({
     ...start,
     tick,
-    // Far from both sources: a press of talk reaches nobody.
+    // Far from every source: a press of talk reaches nobody.
     player: { ...start.player, x: 280, y: 96 },
     traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
     solved: [
-      { region: 'sales', at: 400 },
-      { region: 'marketing', at: 700 },
+      { region: 'sales', at: 100 },
+      { region: 'marketing', at: 400 },
+      { region: 'support', at: 700 },
     ],
-    overview: { current: 7, max: 7 },
+    overview: { current: 8, max: 8 },
     ...fields,
   });
   const run = (from: GameState, ...inputs: readonly GameInput[]): GameState =>
@@ -1415,16 +1422,20 @@
   });
 
   it('follows the solving step of a game: the last answer, 300 steps, the close', () => {
-    // Marketing ready, Sales solved long ago; the figure beside the colleague of Marketing.
+    // Support ready, the other two solved long ago; the figure beside the colleague of Support.
     let state: GameState = {
       ...start,
       tick: 1000,
       player: { ...start.player, x: 104, y: 144 },
       traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
-      solved: [{ region: 'sales', at: 400 }],
+      solved: [
+        { region: 'sales', at: 100 },
+        { region: 'marketing', at: 400 },
+      ],
+      overview: { current: 7, max: 7 },
     };
     state = run(state, TALK, NONE, TALK, NONE, TALK);
-    expect(state.solved[1]).toStrictEqual({ region: 'marketing', at: 1005 });
+    expect(state.solved[2]).toStrictEqual({ region: 'support', at: 1005 });
     const opensAt: number[] = [];
     for (let step = 0; step < 310; step += 1) {
       const next = update(state, NONE, BOTH);
```

- [ ] **Step 4: The case on the floor,** and the close on the floor:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -2225,16 +2225,19 @@
     traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
   };
 
-  it('opens 300 steps after the second of the two cases of the floor, and not after the first', () => {
+  it('opens 300 steps after the last of the three cases of the floor, and not after the second', () => {
     let state = answer(beside(ready, 'person:sales'));
     expect(state.solved.map((entry) => entry.region)).toStrictEqual(['sales']);
+    state = answer(beside(state, 'person:marketing'));
+    expect(state.solved.map((entry) => entry.region)).toStrictEqual(['sales', 'marketing']);
+    // Support is not solved (0037): nothing opens, however long the figure waits.
     for (let step = 0; step < 400; step += 1) {
       state = update(state, NO_INPUT, floor);
     }
     expect(state.dialogue).toBeNull();
-    state = answer(beside(state, 'person:marketing'));
-    const last = state.solved[1];
-    expect(last?.region).toBe('marketing');
+    state = answer(beside(state, 'person:support'));
+    const last = state.solved[2];
+    expect(last?.region).toBe('support');
     while (state.tick < (last?.at ?? 0) + 300) {
       state = update(state, NO_INPUT, floor);
       expect(state.dialogue).toBeNull();
@@ -2383,5 +2386,110 @@
     expect(ready(found(...SALES, ...MARKETING, 10, 11, 12, 13))).toStrictEqual([true, true, false]);
     // Fifteen.
     expect(ready(found(...SALES, ...MARKETING, ...SUPPORT))).toStrictEqual([true, true, true]);
+  });
+});
+
+describe('the case of Support on the floor (0037)', () => {
+  const TALK: GameInput = { ...NO_INPUT, talk: true };
+  const areas = areasOf(floor.rects);
+  const walls = wallsOf(floor.rects);
+  const routes = routesOf(floor.points);
+  const start = createInitialState(floor);
+  /** The figure 24 px below the colleague of the given route, where it stands in the state. */
+  const beside = (state: GameState, route: string): GameState => {
+    const source = state.movers.find((mover) => routes[mover.route]?.name === route);
+    return {
+      ...state,
+      player: { ...state.player, x: source?.x ?? 0, y: (source?.y ?? 0) + 24 },
+    };
+  };
+  /** Every trace of the floor found long ago. */
+  const ready: GameState = {
+    ...start,
+    tick: 1000,
+    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
+  };
+  const answer = (from: GameState): GameState =>
+    [TALK, NO_INPUT, TALK, NO_INPUT, TALK, NO_INPUT].reduce(
+      (state, input) => update(state, input, floor),
+      from,
+    );
+  const regionsOf = (state: GameState): (string | undefined)[] =>
+    state.shadowWalls.map((standing) => walls[standing.wall]?.region);
+  const support = answer(beside(ready, 'person:support'));
+
+  it('is the case of every region that has traces on the floor: Sales, Marketing, Support', () => {
+    const regions = [...new Set(tracesOf(floor.rects).map((trace) => trace.region))];
+    expect(regions).toStrictEqual(CASES.map((entry) => entry.region));
+    expect(regions).toStrictEqual(['sales', 'marketing', 'support']);
+  });
+
+  it('has a source that stands free at the start, with room 24 px below it', () => {
+    expect(routes.some((route) => route.name === 'person:support')).toBe(true);
+    expect(reached(beside(ready, 'person:support').player)).toBe(true);
+  });
+
+  it('is solved from beside its source, before the other two: six of six and no upgrade', () => {
+    expect(support.solved).toStrictEqual([{ region: 'support', at: 1005 }]);
+    expect(support.overview).toStrictEqual({ current: 6, max: 6 });
+    expect(support.upgrades).toStrictEqual([]);
+  });
+
+  it('takes the shadow from the cells of Support and leaves it on the other regions', () => {
+    const cleared = shadowedAreas(areas, support.solved);
+    expect(veilOf(areas, 100, 70)).toBe(1);
+    expect(veilOf(cleared, 100, 70)).toBe(0);
+    expect(veilOf(cleared, 60, 60)).toBe(0);
+    // Marketing, Sales and HR.
+    expect([veilOf(cleared, 10, 70), veilOf(cleared, 90, 30), veilOf(cleared, 5, 5)]).toStrictEqual(
+      [1, 1, 2],
+    );
   });
+
+  it('removes the shadow wall of Support and no other, and no creature', () => {
+    expect(regionsOf(ready).filter((region) => region === 'support')).toHaveLength(1);
+    expect(regionsOf(support)).not.toContain('support');
+    expect(regionsOf(support)).toContain('sales');
+    expect(regionsOf(support)).toContain('marketing');
+    expect(support.shadowWalls).toHaveLength(ready.shadowWalls.length - 1);
+    // No species is at home in Support yet (0038): every creature of the floor stays.
+    expect(support.creatures).toStrictEqual(ready.creatures);
+  });
+
+  it('is followed by the other two: eight of eight, the wider cone, three rooms clear', () => {
+    const two = answer(beside(support, 'person:sales'));
+    expect(two.overview).toStrictEqual({ current: 7, max: 7 });
+    const all = answer(beside(two, 'person:marketing'));
+    expect(all.solved.map((entry) => entry.region)).toStrictEqual([
+      'support',
+      'sales',
+      'marketing',
+    ]);
+    expect(all.overview).toStrictEqual({ current: 8, max: 8 });
+    expect(all.upgrades).toStrictEqual(['wide-cone']);
+    const cleared = shadowedAreas(areas, all.solved);
+    expect([
+      veilOf(cleared, 100, 70),
+      veilOf(cleared, 10, 70),
+      veilOf(cleared, 90, 30),
+    ]).toStrictEqual([0, 0, 0]);
+    expect(
+      regionsOf(all).filter((region) => ['sales', 'marketing', 'support'].includes(region ?? '')),
+    ).toStrictEqual([]);
+  });
+
+  it('gives the machine of Support its use once Support is solved', () => {
+    const machine = restsOf(floor.rects)[7];
+    expect(machine).toBeDefined();
+    if (machine !== undefined) {
+      // The eighth machine of the floor stands in Support.
+      expect(
+        areas
+          .filter((area) => area.region === 'support')
+          .some((area) => inArea(area, { x: machine.box.x, y: machine.box.y })),
+      ).toBe(true);
+      expect(restUnderShadow(machine, floor.rects, [])).toBe(true);
+      expect(restUnderShadow(machine, floor.rects, support.solved)).toBe(false);
+    }
+  });
 });
```

- [ ] **Step 5: The journal with three solved cases, and the intern's box:**

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -721,7 +721,111 @@
         const lines = last === undefined ? 0 : textOf(last, language).split('\n').length;
         // The top of the last line is y = 168: it ends at 178, inside the 180 px.
         expect((origins[2]?.y ?? 0) + (lines - 1) * 12, `${language} ${order.join()}`).toBe(168);
+      }
+    }
+  });
+});
+
+describe('three solved cases in the journal (0037)', () => {
+  /** Five traces each of Sales, Marketing and Support, in the order of the floor. */
+  const REGION_OF = ['sales', 'marketing', 'support'] as const;
+  const content: SceneContent = {
+    ...CONTENT,
+    map: {
+      ...CONTENT.map,
+      rects: Array.from({ length: 15 }, (_, n) => ({
+        name: `trace:${REGION_OF[Math.floor(n / 5)]}`,
+        x: 16 * n,
+        y: 0,
+        width: 16,
+        height: 16,
+      })),
+    },
+  };
+  const shown = (tab: JournalTab, solved: GameState['solved'], settings = GERMAN): string[] => {
+    const renderer = recordingRenderer();
+    const state: GameState = {
+      ...reading(tab),
+      traces: Array.from({ length: 15 }, (_, trace) => ({ trace, light: 0, found: 60 })),
+      solved,
+    };
+    drawJournal(renderer, state, { tab }, content, settings);
+    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
+  };
+  /** The calls that draw on the line with its top at y. */
+  const at = (calls: readonly string[], y: number): string[] =>
+    calls.filter((call) => call.endsWith(`,${y}`));
+  /** The lowest top of a line that is drawn. */
+  const lowest = (calls: readonly string[]): number =>
+    Math.max(...calls.map((call) => Number(call.slice(call.lastIndexOf(',') + 1))));
+  const SALES = { region: 'sales', at: 900 };
+  const MARKETING = { region: 'marketing', at: 930 };
+  const SUPPORT = { region: 'support', at: 960 };
+
+  it('draws three entries on the cases tab, 36 px apart, each with its outcome', () => {
+    const entries = shown('cases', [SUPPORT, SALES, MARKETING]);
+    // The order is that of the cases, not the order they were solved in: `V`, `M`, `S`.
+    expect(at(entries, 36)[0]).toBe('drawSprite 54 at 16,36');
+    expect(at(entries, 72)[0]).toBe('drawSprite 45 at 16,72');
+    expect(at(entries, 108)[0]).toBe('drawSprite 51 at 16,108');
+    expect(at(entries, 108)).toHaveLength(7);
+    // `Spuren: 5 von 5`, and `Gelöst: …` on the third line of each entry.
+    expect(at(entries, 120)).toHaveLength(12);
+    expect([60, 96, 132].map((y) => at(entries, y)[0])).toStrictEqual([
+      'drawSprite 39 at 16,60',
+      'drawSprite 39 at 16,96',
+      'drawSprite 39 at 16,132',
+    ]);
+    // `Gelöst: Kundenmails gingen in einen Übersetzer.`: 42 glyphs.
+    expect(at(entries, 132)).toHaveLength(42);
+    expect(lowest(entries)).toBe(132);
+  });
+
+  it('draws the block of Support alone from (16, 36): three lines', () => {
+    const block = shown('policy', [SUPPORT]);
+    // `Werkzeuge und Erweiterungen …`: `W`.
+    expect(block[0]).toBe('drawSprite 55 at 16,36');
+    expect(block.every((call) => /,(36|48|60)$/.test(call))).toBe(true);
+  });
+
+  it('stacks the three blocks in the order they were solved, and none below y = 168', () => {
+    // Support, Marketing, Sales: three, three and four lines.
+    const calls = shown('policy', [SUPPORT, MARKETING, SALES]);
+    expect(at(calls, 36)[0]).toBe('drawSprite 55 at 16,36');
+    expect(at(calls, 84)[0]).toBe('drawSprite 55 at 16,84');
+    expect(at(calls, 132)[0]).toBe('drawSprite 42 at 16,132');
+    expect(at(calls, 72)).toStrictEqual([]);
+    expect(at(calls, 120)).toStrictEqual([]);
+    expect(lowest(calls)).toBe(168);
+    // Sales first: its four lines, then Support from y = 96 and Marketing from y = 144.
+    const salesFirst = shown('policy', [SALES, SUPPORT, MARKETING]);
+    expect(at(salesFirst, 36)[0]).toBe('drawSprite 42 at 16,36');
+    expect(at(salesFirst, 96)[0]).toBe('drawSprite 55 at 16,96');
+    expect(at(salesFirst, 144)[0]).toBe('drawSprite 55 at 16,144');
+    expect(lowest(salesFirst)).toBe(168);
+  });
+
+  it('keeps every order of the three inside the surface, in both languages', () => {
+    const orders = [
+      [SALES, MARKETING, SUPPORT],
+      [SALES, SUPPORT, MARKETING],
+      [MARKETING, SALES, SUPPORT],
+      [MARKETING, SUPPORT, SALES],
+      [SUPPORT, SALES, MARKETING],
+      [SUPPORT, MARKETING, SALES],
+    ];
+    for (const settings of [GERMAN, ENGLISH]) {
+      for (const order of orders) {
+        expect(lowest(shown('policy', order, settings))).toBe(168);
       }
     }
   });
+
+  it('draws the cases tab in English: `Support`, and its outcome 42 glyphs', () => {
+    const entries = shown('cases', [SUPPORT], ENGLISH);
+    expect(at(entries, 108)[0]).toBe('drawSprite 51 at 16,108');
+    // `Solved: customer mails went into a translator.`
+    expect(at(entries, 132)[0]).toBe('drawSprite 51 at 16,132');
+    expect(at(entries, 132)).toHaveLength(40);
+  });
 });
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -2006,12 +2006,15 @@
     expect(firstGlyph({ ...found, solved: [{ region: 'sales', at: 9 }] })).toBe(
       'drawSprite 33 at 12,138',
     );
-    // Both solved: `Mehr weiß ich …`, `M`.
+    // Both solved: Support is next (0037), `Dann der Support …`, `D`.
     const both = [
       { region: 'sales', at: 9 },
       { region: 'marketing', at: 19 },
     ];
-    expect(firstGlyph({ ...found, solved: both })).toBe('drawSprite 45 at 12,138');
+    expect(firstGlyph({ ...found, solved: both })).toBe('drawSprite 36 at 12,138');
+    // All three solved: `Mehr weiß ich …`, `M`.
+    const all = [...both, { region: 'support', at: 29 }];
+    expect(firstGlyph({ ...found, solved: all })).toBe('drawSprite 45 at 12,138');
   });
 
   it('draws no box while nobody talks', () => {
```

- [ ] **Step 6: Run** `npx tsc --noEmit` — no error: the keys exist since Task 1. Run
  `npx vitest run`. Expected: 28 tests fail in seven files — six of `the case of Support
  (0037)` (cases); three of the hints; two of the close (story) and four of the close in the
  state; the five of `three solved cases in the journal (0037)`; `draws the page that follows
  from the traces and the cases` (scene); and seven of the floor: `opens 300 steps after the
  last of the three cases of the floor, and not after the second` and six of `the case of
  Support on the floor (0037)`. Green before the code, because they hold what is already
  there: that Support is ready exactly when its own traces are found, that its colleague
  stands free on the floor, and the tests of the close and of the hints that do not ask for a
  third case.

- [ ] **Step 7: The case:**

```diff
--- a/src/game/cases.ts
+++ b/src/game/cases.ts
@@ -46,6 +46,14 @@
     outcome: textKey('case.marketing-outcome'),
     policy: textKey('policy.marketing'),
   },
+  {
+    region: 'support',
+    source: 'person:support',
+    answer: [textKey('talk.support-source-1'), textKey('talk.support-source-2')],
+    after: [textKey('talk.support-after')],
+    outcome: textKey('case.support-outcome'),
+    policy: textKey('policy.support'),
+  },
 ];
 
 /** Solving a case raises the maximum of overview by this much, and fills it. */
```

- [ ] **Step 8: The hints:**

```diff
--- a/src/game/hints.ts
+++ b/src/game/hints.ts
@@ -35,6 +35,11 @@
     traces: textKey('talk.intern-marketing-traces'),
     source: textKey('talk.intern-marketing-source'),
   },
+  support: {
+    start: textKey('talk.intern-support-start'),
+    traces: textKey('talk.intern-support-traces'),
+    source: textKey('talk.intern-support-source'),
+  },
 };
 
 /** The page while the player has no lamp. */
```

- [ ] **Step 9: Run** `npm run check` — 1623 unit tests. Then `npm run test:e2e`: 20 passed,
  3 skipped.

- [ ] **Step 10: Commit** — `Add the case of Support`. Body: the third case by the rules of
  the first two; the tables of the cases and of the hints are all that changes, and the
  close now follows the third.

---

### Task 5: The documents

**Files:**
- Modify: `docs/spec/world.md`, `docs/spec/gameplay.md`, `docs/spec/architecture.md`,
  `docs/spec/testing.md`, `README.md`

The diffs are against the branch as it stands before Task 1. If a line has moved, put the
text where the diff means it; do not change the words without a reason.

- [ ] **Step 1: `world.md`** §2 and §3:

```diff
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -190,6 +190,18 @@
 before it leaves the house — image or text, rather once too often. The two cases do not depend
 on each other: the player may solve Marketing before Sales.
 
+**Traces of Support** (feature 0037): five traces lie on five of the twenty-seven screens of
+the cubicles of Support, at least one in each of its three rows. The table of
+`docs/features/0037-the-case-of-support.md` is the placement until the art pass.
+
+**The case of Support** (feature 0037): the third case, by the rules of the first two. The
+customers' mails come in eleven languages and go into a translator from the web, and a browser
+extension reads the whole mailbox along. Its policy block, in the words of
+`docs/features/0037-the-case-of-support.md`: tools and extensions come from the approved list,
+and only from there — and a tool that is missing gets onto the list when somebody says so. The
+three cases do not depend on each other and may be solved in any order. The case earns no
+upgrade, and its species comes with feature 0038.
+
 **Order and gating.** Marketing and Support are open from the start (thin shadow). HR and
 Accounting open after the first upgrade, Development after the second. Management is last: without
 the filter nothing is visible there, and without the vendor as advisor there is no alternative
@@ -236,7 +248,8 @@
   says follows from the case: the everyday line while a trace is missing, the honest answer
   once all five are found, and the line afterwards once the case is solved.
   Since feature 0028 the colleague of Marketing — the one in the red shirt, with the printer —
-  is the source of the second case, by the same rule.
+  is the source of the second case, by the same rule. Since feature 0037 the colleague of
+  Support — the one in the orange shirt, with the forty tickets — is the source of the third.
 - **The managing director.** The last case. In the first act a sentence of the call (feature
   0026); a figure with the map of Management (M6).
 - **The customer.** A voice on the phone at the start — one sentence of the call (feature 0026).
```

- [ ] **Step 2: `gameplay.md`** §6 and §7:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -166,7 +166,7 @@
 
 1. Traces found in the region are shadow residue on devices, visible in the lamp's light; each
    goes into the journal. *As built* (feature 0022): the five traces of Sales; (feature 0028)
-   the five of Marketing.
+   the five of Marketing; (feature 0037) the five of Support.
 2. Conversations in the department and the break room lead to the source — the person where the
    data flow begins.
 3. At the source the player **shows a matching trace** from the journal. It is a gesture, not an
@@ -211,6 +211,14 @@
 before Sales. What a case of Act 2 has more than the first — its species, the upgrade it
 earns, the vendor — comes with features of their own.
 
+**As built** (feature 0037): the case of Support, by the same rules. Its source is the
+colleague in the orange shirt who walks between the cubicles and the printer. Its five traces
+lie on five screens, at least one in each row of cubicles. With all five found the colleague
+answers in two pages, and the press that closes the answer solves the case and clears the
+room: overview grows by one, to eight with all three cases solved. The three cases do not
+depend on each other and may be solved in any order. The case earns no upgrade. The close
+(feature 0034) follows the last case of the game, so it now waits for Support too.
+
 **As built** (feature 0036): three pages of talk name Harmonic, and no rule of a case changed
 (`vision.md` §10). The page the colleague of Sales says after the case no longer asks what to
 use next time: it says that something like Harmonic would have shown where the text goes. On
@@ -260,6 +268,13 @@
 solved first. The policy tab shows the two blocks in the order they were solved, the second
 60 px below the first.
 
+**As built** (feature 0037): with three cases the cases tab shows three entries, 36 px apart,
+in the order Sales, Marketing, Support. The policy tab stacks its blocks by their height: the
+first starts at (16, 36), and each further one 12 px below the last line of the block before
+it — after a block of four lines 60 px lower, as before, and after a block of three lines 48
+px lower. The three blocks of today, of four, three and three lines, fit the screen in every
+order: the last line ends at y = 178. Pages on this tab come with the fourth block.
+
 **As built** (feature 0032): with a second species the creatures tab shows two entries, the
 second 72 px below the first, in the order of the species — the snippet, then the mirage —
 whichever was captured first. Two entries fit the screen; pages come with the third species.
```

- [ ] **Step 3: `architecture.md`** §2, §5, §6, §7 and §8:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -350,7 +350,9 @@
 after the last case. `hintOf(lampOwned, progress)` picks one: without the lamp `HINT_LAMP`;
 else the first case of `CASES` that is not solved decides — `start` while no trace of its
 region is found, `traces` while some are and not all, `source` once it is ready (`isReady`);
-with every case solved `HINT_DONE`. `withHint(figures, hint)` gives `HINT_FIGURE` that one page
+with every case solved `HINT_DONE`. Since feature 0037 `HINTS` holds the three pages of Support
+too, and the cases are asked in the order Sales, Marketing, Support.
+`withHint(figures, hint)` gives `HINT_FIGURE` that one page
 instead of its own, after `figuresIn`; `update` and the scene both do it, so the box shows the
 page the dialogue has. The hint is derived on every call and is not in the state; a talk with
 the intern changes what a talk changes and nothing more. `CAST` holds the intern as its second
@@ -719,9 +721,13 @@
 `Spuren: 1 von 5`, the numbers drawn by `drawNumber`. A solved case (feature 0024) has a third
 line, its outcome, from (16, 60 + 36k) (`CASE_OUTCOME`), and is still 36 px high. On the policy
 tab (feature 0024) block k from 0 is the policy block of the k-th solved case, in the order
-they were solved, from (16, 36 + 60k) (`POLICY_BLOCK`, `POLICY_PITCH`) with lines 12 px apart;
-without a solved case the tab shows its line for nothing. Two blocks of four lines fit, the
-second ending at y = 142. `draw-journal` imports only types
+they were solved, with lines 12 px apart. Since feature 0037 the blocks are stacked by their
+height: `policyOrigins(blocks, language)` gives the first the origin (16, 36) (`POLICY_BLOCK`)
+and each further one the origin 12 px (`POLICY_GAP`) below the last line of the block before
+it, so a block of n lines is followed by the next one 12n + 12 px lower; the lines counted are
+those of the language the tab is drawn in. Without a solved case the tab shows its line for
+nothing. The three blocks of today — four, three and three lines in both languages — fit in
+every order, the last line ending at y = 178. `draw-journal` imports only types
 from `draw-scene`, and `draw-scene` imports `drawJournal`.
 
 The help (feature 0021, `render/draw-help`). While `help` is `true`, `drawScene` draws what it
@@ -893,7 +899,8 @@
 not in the world data (`trace trace:cellar names no region`) and a box that is not one cell
 (`trace trace:sales (1330, 448, 16, 16) is not one cell`). A map without such rectangles has no
 traces. No coordinate of a trace is in `src/` (INV-7); `tools/floor-layout.ts` names the cells
-of the floor's ten, `TRACES`: five of Sales (feature 0022) and five of Marketing (feature 0028).
+of the floor's fifteen, `TRACES`: five of Sales (feature 0022), five of Marketing (feature 0028)
+and five of Support (feature 0037).
 
 **Areas of the regions** (feature 0023). A rectangle named `region:<id>` is an area of a region
 of the world data: whole cells, its corner on the grid, its width and its height multiples of 16
@@ -1183,8 +1190,9 @@
 pixels; they become three point objects named `mirage` after those traces, ids 129–131, and
 `nextobjectid` is 132. The standing figures are `FIGURES`; the first (`FIRST_FIGURES`, 1), the
 officer, keeps her place after the shadow walls, and every later one is written at the end of
-the file: the intern (feature 0033) is the point `figure:intern` with the id 132, and
-`nextobjectid` is 133.
+the file: the intern (feature 0033) is the point `figure:intern` with the id 132. The traces
+from the eleventh on (`SECOND_TRACES`, 10) are written after him: the five of Support (feature
+0037) are rectangles with the ids 133–137, and `nextobjectid` is 138.
 `floor.tmj` has the layers `ground` (id 1), `detail` (id 3), `above` (id 4) and `objects` (id 2),
 in that order. Posts are
 derived, not listed: a cell with no strip whose left neighbour has a top strip and whose upper
@@ -1211,7 +1219,10 @@
 light of a player who looks up from every reached place on the cell below that chair; and the
 traces of 0028 against theirs — each in the area of Marketing, on a desk with a screen or on
 the printer, and in the light of a player who looks down from every reached place on the cell
-above — with the 123 objects before them held to a recorded digest. The file's whitespace is not Tiled's; a save in Tiled reformats it and fails that
+above — with the 123 objects before them held to a recorded digest; and the traces of 0037
+against theirs — each in the area of Support, on a desk with a screen whose chair stands on the
+cell below, and in the light of a player who looks up from every reached place on the cell below
+that chair — with the 132 objects before them held to a recorded digest. The file's whitespace is not Tiled's; a save in Tiled reformats it and fails that
 test, so until the art pass the layout changes in `floor-layout.ts`. When the art pass takes the
 floor over by hand (`visual.md` §5), the layout, the generator and the determinism test are
 removed and `floor.tmj` is authored in Tiled like every other map; the layout test's
@@ -1287,7 +1298,8 @@
 are pages of the kind `talk`, `talk.<region>-source-<n>` and `talk.<region>-after`, under the
 rule of a page; `notice.case-solved` is a notice. `game/cases` names them by key in `CASES`,
 and the rule test covers both new kinds in both languages. The case of Marketing (feature
-0028) adds six keys — `region.marketing` and five of these — and no kind.
+0028) adds six keys — `region.marketing` and five of these — and no kind. The case of Support
+(feature 0037) adds nine: `region.support`, five of these, and the three hints of the intern.
 
 The story (feature 0026) adds the kind `story`: `story.<scene>-<n>` is a page of a scene, under
 the rule of a page of talk — at most three lines of at most 47 characters, none empty — and the
```

- [ ] **Step 4: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -34,7 +34,8 @@
 opened, turned to the cases and closed, whose digest was taken with the code before the help was
 added. The digests are never changed; a test that fails on one found a world that steps
 differently. A feature that only adds content leaves both as they are: with the second case
-(0028) a state in which no trace of Marketing is found steps as before. So does a state
+(0028) a state in which no trace of Marketing is found steps as before, and with the third
+(0037) one in which no trace of Support is. So does a state
 without an upgrade (0029): the cone's spread and the lamp's strength are then what they were.
 A recording hashes what was recorded and no more: since the second species (0032) the two
 tests hash the snippets among the creatures and the count of the snippet, so three mirages
```

- [ ] **Step 5: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -62,7 +62,10 @@
 card that says who presents it — `LMIS präsentiert` over the title — for three seconds or
 until `E` is pressed; then the call follows. Three people name Harmonic, a monitoring product,
 once each and say what it would have shown: the data protection officer, the colleague of
-Sales after the case, and the management at the close (feature 0036).
+Sales after the case, and the management at the close (feature 0036). Support has five traces
+of its own, on five of its twenty-seven screens, and the colleague in the orange shirt is the
+source of the third case; the three cases can be solved in any order, and the close follows the
+last of them (feature 0037).
 Every merge to `main` is deployed to Cloud Run (feature 0030).
 The roadmap is in [docs/plan.md](docs/plan.md).
 
```

- [ ] **Step 6:** `npm run check`, then commit — `Move the case of Support into the spec`.

---

### Task 6: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green: 20 passed, 3 skipped.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [ ] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [ ] **Step 5:** tick the boxes of Tasks 1 to 6 in this file and commit —
  `Tick the full check of 0037`.

---

### Task 7: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the keys
  of the spec's preconditions, and where to begin — the card and the call passed, the lamp
  fetched from the data protection officer. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–22 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 6, and start again at step 1.
- [ ] **Step 4:** after step 22 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–22`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0037`. A feel note that wants something
  else — other words, another place for a trace, a creature — becomes a new draft, not a
  change on this branch; the creature of Support is 0038.

---

### Task 8: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 6. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`. In `docs/plan.md` §4, in the M6 section, say that 0032 to 0034,
  0036 and 0037 are implemented and that 0038 is approved; leave the sentence about the
  draft 0039 as it is. Commit — `Mark 0037 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0037: the case of Support`, with the walk's result and feel notes in its
  description. Say in one line that the branch also carries the draft of 0039, which is not
  approved and of which nothing is built. CI must be green. The author merges.
