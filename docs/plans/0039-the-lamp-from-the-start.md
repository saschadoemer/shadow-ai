# 0039 — Implementation plan: the lamp from the start

**Spec:** [`docs/features/0039-the-lamp-from-the-start.md`](../features/0039-the-lamp-from-the-start.md)
(approved 2026-11-19). The plan argues from the spec; where they differ, the spec wins. Read
the spec first, then `CLAUDE.md`, then `docs/spec/world.md` §3, `docs/spec/gameplay.md` §2
and §8, `docs/spec/architecture.md` §2 and §5 and `docs/spec/testing.md` §5. **Written:**
2026-11-19 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** the branch `feature/0039-the-lamp-from-the-start` exists and holds this
plan. It is cut from `a95079b`, the head of the pull request of feature 0037 (#48), which the
author is merging: `main` gets the same files with that merge. Work on this branch. If `main`
already holds 0037 when you start — a commit titled `Feature 0037: the case of Support` —
merge it into the branch before Task 1; if not, go on, and merge it in Task 5. **No pull
request for 0039 is opened before 0037 is on `main`.** The spec 0038 is approved, has no plan
yet, and is **not** built here.

**Goal:** the player has the lamp from the first step. Nobody hands it over: after the call a
line at the bottom names its key, and `Space` shines at once. The data protection officer
says her three pages from the first talk.

**Approach:** the feature takes rules out of the game and adds none. Three code tasks, each
green on its own. The lamp from the first step (T1): a new game starts with the lamp, the
first meeting goes out of `game/cast` and `update`, and the intern's hint no longer asks for
the lamp — after this task the game behaves as the spec says, and the state still has the
field `owned`, which is `true` everywhere. The field (T2): `LampState.owned` goes, with the
three rules that still asked for it. The words (T3): the two keys nobody says any more leave
both tables. Then the documents (T4), the full check with the container (T5), the walk (T6)
and the pull request (T7).

**How this plan was checked:** the code and the tests of Tasks 1 to 3 were run once as a
prototype on 2026-11-19 and then replayed task by task, each task's tests before its code:
they failed as the steps say, and after each of the three tasks typecheck and Biome were
clean and the unit tests green — 1609, 1609 and 1610 tests (1623 before: the tests of the
first meeting and of the player without the lamp go). The blocks of this file, applied in
order to a clean tree, gave the prototype's files. `npm run check` with the build passed on
the whole prototype, and the smoke spec passed twice against a dev server of it: 20 passed,
3 skipped. The two changed smoke tests were run once before the code of Task 1 and failed,
and once with that code and passed. The prototype was thrown away; nothing of it is on the
branch. If a step does not behave as written, the cause is a difference to that state — stop
and look; do not bend a test. The game was **not** played in a browser — that is the walk —
and the container was **not** run with the prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- INV-1: `LampState` ends with the fields `on`, `strength` and `used`, and no other. No field
  is added to `GameState`.
- INV-2: nothing in `src/game/` gets a new import.
- INV-4: two keys leave both tables in Task 3; `de` and `en` keep the same keys.
- INV-6, INV-7: no image and no map changes.
- **Nothing is added.** No line of the story says where the lamp comes from, no words of the
  call or of the data protection officer change, and no new notice appears: `notice.lamp`
  is the line that was there, shown from the first step of a new game.
- **`createInitialState` stays the game past its opening:** its lamp was used, so its notice
  is none. `newGame` starts with the lamp not yet used.
- **The order of `update` does not change.** While the card is shown or the call is open the
  step is theirs, and `Space` does nothing — that follows from the order, not from a rule
  about the lamp.
- **A press of `talk` with `lamp` held opens no dialogue,** from the first step: the rule of
  0017 without the exception of 0026.
- **Between Task 1 and Task 2** the state still has `lamp.owned`, `true` in every state the
  game makes. The rules that ask for it are dead code for one commit; Task 2 removes them.
- **Task 2 changes 52 literals of the lamp in the tests** with one replacement: the text
  `owned: true, ` or `owned: false, ` goes. The plan shows the result as diffs; the same
  replacement by hand or by a script gives it.
- **The two recorded digests of 600 steps** (`RECORDED` in `tests/unit/journal.test.ts` and
  in `tests/unit/help.test.ts`) are never recorded again. They hash the lamp as `on` and
  `strength` and pass unchanged — criterion 10.
- A local helper in a test must not be named `after`, `before`, `beforeEach` or `afterEach`.
- What is out of the spec is not built: no battery, no other key for the lamp, no tutorial
  screen, no sound.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox; if signing fails, retry once, then stop and ask — never
  pass `--no-gpg-sign`), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`. Do not stop a dev server that is
  not yours. Push nothing before the walk has passed.

## File structure

| File | Change |
|---|---|
| `src/game/update.ts` | a new game has the lamp; no handover; the hint without the lamp's argument (T1); no `acting` input (T2) |
| `src/game/cast.ts` | `Meeting`, `FIRST_MEETING`, `figuresIn`, `isFirstMeeting` go; the intern's page |
| `src/game/hints.ts` | `HINT_LAMP` goes; `hintOf(progress, cases?, hints?)` |
| `src/render/draw-scene.ts` | the speakers of the frame without the first meeting |
| `src/game/state.ts` | `LampState` without `owned` |
| `src/game/talk.ts`, `src/game/notice.ts` | the rules without `owned` |
| `src/text/de.ts`, `src/text/en.ts` | `talk.officer-meeting-2` and `talk.intern-lamp` go |
| `tests/unit/*.test.ts`, `tests/e2e/smoke.spec.ts` | as the tasks say |
| `docs/spec/*`, `README.md` | Task 4 |

---

### Task 1: The lamp from the first step

**Files:**
- Modify: `src/game/update.ts`, `src/game/cast.ts`, `src/game/hints.ts`,
  `src/render/draw-scene.ts`
- Test: `tests/unit/opening.test.ts`, `tests/unit/cast.test.ts`, `tests/unit/hints.test.ts`,
  `tests/unit/notice.test.ts`, `tests/unit/rest.test.ts`, `tests/unit/draw-scene.test.ts`,
  `tests/unit/card.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `newGame(map).lamp` is `{ on: false, strength: 1, owned: true, used: false }`;
  `hintOf(progress, cases?, hints?)`; `CAST[1].pages` is `[talk.intern-sales-start]`.
- Removed: `Meeting`, `FIRST_MEETING`, `figuresIn`, `isFirstMeeting` of `game/cast`;
  `HINT_LAMP` of `game/hints`.

- [x] **Step 1: The opening.** The tests of the player without the lamp and of the first
  meeting go; in their place stand the lamp from the first step and the officer's own pages
  from the first talk:

```diff
--- a/tests/unit/opening.test.ts
+++ b/tests/unit/opening.test.ts
@@ -1,9 +1,9 @@
 import { describe, expect, it } from 'vitest';
 import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
-import { figuresIn, figuresOf } from '../../src/game/cast';
+import { figuresOf } from '../../src/game/cast';
 import { routesOf } from '../../src/game/mover';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
-import type { Dialogue, GameState } from '../../src/game/state';
+import type { GameState } from '../../src/game/state';
 import { pagesOf, speakersOf } from '../../src/game/talk';
 import { createInitialState, newGame, update } from '../../src/game/update';
 import { textKey } from '../../src/text/text';
@@ -59,10 +59,11 @@
       );
 
 describe('the two starts (0026)', () => {
-  it('starts a played game with the card, the call open under it, and without the lamp', () => {
+  it('starts a played game with the card, the call open under it, and the lamp not yet used', () => {
+    // The lamp is the player's from the first step (0039).
     expect(newGame(MAP)).toStrictEqual({
       ...createInitialState(MAP),
-      lamp: { on: false, strength: 1, owned: false, used: false },
+      lamp: { on: false, strength: 1, owned: true, used: false },
       dialogue: { speaker: 'story', index: 0, page: 0 },
       presented: null,
     });
@@ -74,13 +75,11 @@
     expect(state.dialogue).toBeNull();
   });
 
-  it('survives a JSON round trip: at the start, on page 2 of the call, after the first meeting (INV-1)', () => {
+  it('survives a JSON round trip: at the start, on page 2 of the call, after the call (INV-1)', () => {
     const start = opening(MAP);
     const second = run(MAP, start, TALK, NONE, TALK);
-    const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
     expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 2 });
-    expect(met.lamp.owned).toBe(true);
-    for (const state of [start, second, met, createInitialState(MAP)]) {
+    for (const state of [start, second, called(MAP), createInitialState(MAP)]) {
       expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
     }
   });
@@ -134,18 +133,19 @@
 });
 
 describe('no record of when the opening ended (0031)', () => {
-  it('has no field `started`: not at either start, not after the call, the meeting and the wake', () => {
+  it('has no field `started`: not at either start, not after the call, a talk and the wake', () => {
     const closed = called(MAP);
-    const met = run(MAP, closed, NONE, TALK, NONE, TALK, NONE, TALK);
-    expect(met.lamp.owned).toBe(true);
-    const woken = update({ ...met, dark: 44 }, NONE, MAP);
+    // The officer's three pages, read to the end.
+    const talked = run(MAP, closed, NONE, TALK, NONE, TALK, NONE, TALK, NONE, TALK);
+    expect(talked.dialogue).toBeNull();
+    const woken = update({ ...talked, dark: 44 }, NONE, MAP);
     expect(woken.dark).toBe(45);
     for (const state of [
       createInitialState(MAP),
       opening(MAP),
       closed,
       steps(MAP, closed, RIGHT, 600),
-      met,
+      talked,
       woken,
     ]) {
       expect(Object.keys(state)).not.toContain('started');
@@ -153,7 +153,7 @@
   });
 });
 
-describe('without the lamp (0026)', () => {
+describe('the lamp from the first step (0039)', () => {
   const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
     name,
     x,
@@ -175,157 +175,104 @@
   );
   const start = called(LIT);
 
-  it('has the map for it: with the lamp owned the same keys light all three', () => {
-    const owned = steps(LIT, createInitialState(LIT), SHINE, 10);
-    expect(owned.lamp.on).toBe(true);
-    expect(owned.shadowWalls[0]?.lit).toBe(true);
-    expect(owned.traces[0]?.light).toBe(10);
-    expect(owned.creatures[0]?.light).toBe(10);
+  it('is on in the first step with the key held, right after the call, and was used from then', () => {
+    expect(start.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    const first = update(start, SHINE, LIT);
+    expect(first.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
   });
 
-  it('leaves the lamp off for 600 steps with the key held, and lights nothing', () => {
-    let state = start;
-    for (let i = 0; i < 600; i += 1) {
-      state = update(state, SHINE, LIT);
-      expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
-      expect(state.creatures.every((creature) => creature.light === 0)).toBe(true);
-      expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
-      expect(state.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
+  it('lights the snippet, the wall and the trace of a new game, as in a game past its opening', () => {
+    for (const from of [start, createInitialState(LIT)]) {
+      const lit = steps(LIT, from, SHINE, 10);
+      expect(lit.lamp.on).toBe(true);
+      expect(lit.shadowWalls[0]?.lit).toBe(true);
+      expect(lit.traces[0]?.light).toBe(10);
+      expect(lit.creatures[0]?.light).toBe(10);
     }
-    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0 });
   });
 
-  it('counts the key as not held: the world steps as without it, step for step', () => {
-    let held = start;
-    let free = start;
-    for (let i = 0; i < 600; i += 1) {
-      held = update(held, SHINE, LIT);
-      free = update(free, NONE, LIT);
-      expect({ ...held, held: NONE }).toStrictEqual(free);
-    }
-  });
-
-  it('lets the figure walk with the key held, as without it', () => {
+  it('holds the figure in place with the key held, as 0007 says', () => {
     const both: GameInput = { ...RIGHT, lamp: true };
-    let held = start;
-    let free = start;
-    for (let i = 0; i < 60; i += 1) {
-      held = update(held, both, LIT);
-      free = update(free, RIGHT, LIT);
-      expect(held.player).toStrictEqual(free.player);
-    }
-    expect(held.player.x).toBeGreaterThan(104 + 50);
+    const held = steps(LIT, start, both, 60);
+    expect(held.player.x).toBe(104);
+    expect(held.lamp.on).toBe(true);
   });
 
-  it('holds the figure in place with the lamp owned, as 0007 says', () => {
-    const both: GameInput = { ...RIGHT, lamp: true };
-    const owned = steps(LIT, createInitialState(LIT), both, 60);
-    expect(owned.player.x).toBe(104);
-    expect(owned.lamp.on).toBe(true);
+  it('does nothing while the card is shown and while the call is open: 600 steps with the key held', () => {
+    // The card ends by itself in step 180; the call under it stays open without a press of talk.
+    const waiting = steps(LIT, newGame(LIT), SHINE, 600);
+    expect(waiting.presented).toBe(180);
+    expect(waiting.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 0 });
+    expect(waiting.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    expect(waiting.creatures.every((creature) => creature.light === 0)).toBe(true);
+    expect(waiting.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
   });
 
-  it('is hit as always, and wakes without the lamp', () => {
+  it('is hit as always, and wakes with the lamp', () => {
     const hit = steps(LIT, start, NONE, 120);
     expect(hit.overview.current).toBeLessThan(5);
-    const woken = update({ ...start, dark: 44 }, SHINE, LIT);
+    const woken = update({ ...start, dark: 44 }, NONE, LIT);
     expect(woken.dark).toBe(45);
-    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
+    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    expect(update(woken, SHINE, LIT).dark).toBe(46);
   });
 });
 
-describe('the first meeting (0026)', () => {
+describe('the data protection officer from the first talk (0039)', () => {
   const start = called(MAP);
   const TALK_SHINE: GameInput = { ...TALK, lamp: true };
+  const HERS = [
+    textKey('talk.officer-rules-1'),
+    textKey('talk.officer-rules-2'),
+    textKey('talk.officer-rules-3'),
+  ];
 
-  it('opens with the key of the lamp held while the player has none', () => {
-    const opened = run(MAP, start, NONE, TALK_SHINE);
-    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
-    expect(opened.lamp.on).toBe(false);
+  it('opens no talk with the key of the lamp held, in a new game as in a game past its opening', () => {
+    for (const from of [update(start, NONE, MAP), createInitialState(MAP)]) {
+      const held = update(from, TALK_SHINE, MAP);
+      expect(held.dialogue).toBeNull();
+      expect(held.lamp.on).toBe(true);
+    }
   });
 
-  it('does not open with the lamp held once the lamp is owned, as in 0017', () => {
-    const held = run(MAP, createInitialState(MAP), TALK_SHINE);
-    expect(held.dialogue).toBeNull();
-    expect(held.lamp.on).toBe(true);
-  });
-
-  it('has her first page and the page that hands the lamp over', () => {
+  it('says her own three pages in the first talk of a new game: there is no first meeting', () => {
     const opened = run(MAP, start, NONE, TALK);
     expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
-    const figures = figuresIn(figuresOf(MAP.points), opened.lamp.owned);
-    expect(pagesOf(opened.dialogue as Dialogue, speakersOf(figures, [], []))).toStrictEqual([
-      textKey('talk.officer-rules-1'),
-      textKey('talk.officer-meeting-2'),
-    ]);
-    const second = run(MAP, opened, NONE, TALK);
-    expect(second.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 1 });
-    // A third press closes it: the meeting has two pages.
-    expect(run(MAP, second, NONE, TALK).dialogue).toBeNull();
+    expect(spoken(MAP, opened)).toStrictEqual(HERS);
+    const third = run(MAP, opened, NONE, TALK, NONE, TALK);
+    expect(third.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 2 });
+    // A fourth press closes it.
+    expect(run(MAP, third, NONE, TALK).dialogue).toBeNull();
   });
 
-  it('hands the lamp over in the step that closes it, and changes nothing else', () => {
-    const second = run(MAP, start, NONE, TALK, NONE, TALK, NONE);
-    expect(second.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
-    const closed = update(second, TALK, MAP);
+  it('changes nothing but tick, held and dialogue in the step that closes her talk', () => {
+    const third = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK, NONE);
+    expect(third.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 2 });
+    const closed = update(third, TALK, MAP);
     expect(closed).toStrictEqual({
-      ...second,
-      tick: second.tick + 1,
+      ...third,
+      tick: third.tick + 1,
       held: TALK,
       dialogue: null,
-      lamp: { on: false, strength: 1, owned: true, used: false },
     });
+    expect(closed.lamp).toStrictEqual(start.lamp);
   });
 
-  it('gives no lamp while the dialogue is open, on either page', () => {
-    for (const inputs of [
-      [NONE, TALK],
-      [NONE, TALK, NONE, TALK],
-      [NONE, TALK, NONE, TALK, NONE],
-    ]) {
-      expect(run(MAP, start, ...inputs).lamp.owned).toBe(false);
-    }
+  it('says the same three pages in a game past its opening', () => {
+    const opened = run(MAP, createInitialState(MAP), TALK);
+    expect(spoken(MAP, opened)).toStrictEqual(HERS);
   });
-
-  it('gives none for the saying of a colleague', () => {
-    // 32 px below the colleague and 24 px left of the officer: the officer is nearer. Away from her:
-    const near: GameState = { ...start, player: { ...start.player, x: 136, y: 72 } };
-    const opened = run(MAP, near, NONE, TALK);
-    expect(opened.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
-    const closed = run(MAP, opened, NONE, TALK);
-    expect(closed.dialogue).toBeNull();
-    expect(closed.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
-  });
-
-  it('says her own three pages once the lamp is owned, and closing them changes neither field', () => {
-    const met = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK);
-    const again = run(MAP, met, NONE, TALK);
-    expect(again.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
-    // The two pages of 0017 and the third of 0036.
-    const closed = run(MAP, again, NONE, TALK, NONE, TALK, NONE, TALK);
-    expect(closed.dialogue).toBeNull();
-    expect(closed.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
-    const past = run(MAP, createInitialState(MAP), TALK, NONE, TALK, NONE, TALK, NONE, TALK);
-    expect(past.dialogue).toBeNull();
-    expect(past.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
-  });
-
-  it('keeps both fields through the wake', () => {
-    const met = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK);
-    const woken = update({ ...met, dark: 44 }, NONE, MAP);
-    expect(woken.dark).toBe(45);
-    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
-  });
 });
 
 describe('the lamp used for the first time (0026)', () => {
-  const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
+  const start = called(MAP);
 
   it('is not used by steps without the key', () => {
-    expect(steps(MAP, met, RIGHT, 600).lamp.used).toBe(false);
+    expect(steps(MAP, start, RIGHT, 600).lamp.used).toBe(false);
   });
 
   it('is used from the first step in which the lamp is on, and stays so', () => {
-    const first = run(MAP, met, NONE, SHINE);
+    const first = run(MAP, start, NONE, SHINE);
     expect(first.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
     const off = update(first, NONE, MAP);
     expect(off.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
@@ -335,8 +282,8 @@
 
   it('is not used by a key held during a push: the lamp is off there', () => {
     const pushed: GameState = {
-      ...met,
-      player: { ...met.player, recoil: { dx: 3, dy: 0, steps: 8 } },
+      ...start,
+      player: { ...start.player, recoil: { dx: 3, dy: 0, steps: 8 } },
     };
     const during = update(pushed, SHINE, MAP);
     expect(during.lamp.on).toBe(false);
@@ -344,8 +291,8 @@
   });
 });
 
-describe('card, call and first meeting in a row (0036)', () => {
-  it('goes from the card through the call to the lamp, one press each', () => {
+describe('card, call and the first light in a row (0039)', () => {
+  it('goes from the card through the call to the lamp, with no talk in between', () => {
     let state = newGame(MAP);
     expect(state.presented).toBeNull();
     // The press that ends the card.
@@ -356,31 +303,13 @@
     // Three presses read the call.
     state = run(MAP, state, NONE, TALK, NONE, TALK, NONE, TALK);
     expect(state.dialogue).toBeNull();
-    expect(state.lamp.owned).toBe(false);
-    // Three more are the first meeting: the lamp is handed over.
-    state = run(MAP, state, NONE, TALK, NONE, TALK, NONE, TALK);
-    expect(state.dialogue).toBeNull();
-    expect(state.lamp.owned).toBe(true);
+    expect(state.lamp.used).toBe(false);
+    // The lamp shines at the first held key: nobody had to hand it over.
+    state = run(MAP, state, NONE, SHINE);
+    expect(state.lamp.on).toBe(true);
+    expect(state.lamp.used).toBe(true);
     // The same game as one that began past the card, two steps later.
-    const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
-    expect(state).toStrictEqual({ ...met, tick: met.tick + 2, presented: 1 });
+    const lit = run(MAP, called(MAP), NONE, SHINE);
+    expect(state).toStrictEqual({ ...lit, tick: lit.tick + 2, presented: 1 });
   });
 });
-
-describe('the officer after the meeting (0036)', () => {
-  it('says her three pages once the lamp is handed over, and a fourth press closes them', () => {
-    const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
-    expect(met.lamp.owned).toBe(true);
-    const opened = run(MAP, met, NONE, TALK);
-    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
-    // The third is the page that names Harmonic; the first meeting did not have it.
-    expect(spoken(MAP, opened)).toStrictEqual([
-      textKey('talk.officer-rules-1'),
-      textKey('talk.officer-rules-2'),
-      textKey('talk.officer-rules-3'),
-    ]);
-    const third = run(MAP, opened, NONE, TALK, NONE, TALK);
-    expect(third.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 2 });
-    expect(run(MAP, third, NONE, TALK).dialogue).toBeNull();
-  });
-});
```

- [x] **Step 2: The cast and the hints.** The first meeting leaves the tests of the cast;
  `hintOf` loses its first argument everywhere:

```diff
--- a/tests/unit/cast.test.ts
+++ b/tests/unit/cast.test.ts
@@ -4,14 +4,9 @@
   CAST,
   type CastMember,
   COLLEAGUES,
-  FIRST_MEETING,
-  type Figure,
   figuresFrom,
-  figuresIn,
   figuresOf,
   isFigurePoint,
-  isFirstMeeting,
-  type Meeting,
   pagesOfRoute,
 } from '../../src/game/cast';
 import { creaturesFrom } from '../../src/game/creature';
@@ -28,9 +23,10 @@
     expect(CAST[0]).toStrictEqual({ id: 'officer', pages: [FIRST, SECOND, THIRD] });
   });
 
-  it('has the intern after her, with the one page he has before anything is known (0033)', () => {
+  it('has the intern after her, with the page he has before a step has picked one (0033, 0039)', () => {
     expect(CAST.map((member) => member.id)).toStrictEqual(['officer', 'intern']);
-    expect(CAST[1]?.pages).toStrictEqual([textKey('talk.intern-lamp')]);
+    // The first hint of a new game: where Sales is.
+    expect(CAST[1]?.pages).toStrictEqual([textKey('talk.intern-sales-start')]);
   });
 
   it('gives every member at least one page', () => {
@@ -132,44 +128,3 @@
     expect(pagesOfRoute('person:sales', table)).toStrictEqual([]);
   });
 });
-
-describe('the first meeting (0026)', () => {
-  const HANDS_OVER = textKey('talk.officer-meeting-2');
-  const officer: Figure = { id: 'officer', pages: [FIRST, SECOND], x: 160, y: 96 };
-  const other: Figure = { id: 'director', pages: [SECOND], x: 40, y: 40 };
-
-  it('is the officer with her first page and the page that hands the lamp over', () => {
-    expect(FIRST_MEETING).toStrictEqual({ figure: 'officer', pages: [FIRST, HANDS_OVER] });
-    expect(CAST.some((member) => member.id === FIRST_MEETING.figure)).toBe(true);
-  });
-
-  it('gives her the pages of the meeting while the lamp is not owned, and nobody else', () => {
-    expect(figuresIn([other, officer], false)).toStrictEqual([
-      other,
-      { ...officer, pages: [FIRST, HANDS_OVER] },
-    ]);
-  });
-
-  it('gives every figure its own pages once the lamp is owned', () => {
-    expect(figuresIn([other, officer], true)).toStrictEqual([other, officer]);
-  });
-
-  it('reads the meeting it is given: the game passes its own', () => {
-    const meeting: Meeting = { figure: 'director', pages: [FIRST] };
-    expect(figuresIn([other, officer], false, meeting)).toStrictEqual([
-      { ...other, pages: [FIRST] },
-      officer,
-    ]);
-  });
-
-  it('is the dialogue of that figure while the lamp is not owned, and no other', () => {
-    const figures = [other, officer];
-    expect(isFirstMeeting({ speaker: 'figure', index: 1, page: 1 }, figures, false)).toBe(true);
-    expect(isFirstMeeting({ speaker: 'figure', index: 1, page: 0 }, figures, false)).toBe(true);
-    expect(isFirstMeeting({ speaker: 'figure', index: 1, page: 1 }, figures, true)).toBe(false);
-    expect(isFirstMeeting({ speaker: 'figure', index: 0, page: 0 }, figures, false)).toBe(false);
-    expect(isFirstMeeting({ speaker: 'mover', index: 1, page: 0 }, figures, false)).toBe(false);
-    expect(isFirstMeeting({ speaker: 'story', index: 1, page: 0 }, figures, false)).toBe(false);
-    expect(isFirstMeeting({ speaker: 'figure', index: 5, page: 0 }, figures, false)).toBe(false);
-  });
-});
```

```diff
--- a/tests/unit/hints.test.ts
+++ b/tests/unit/hints.test.ts
@@ -1,12 +1,11 @@
 import { describe, expect, it } from 'vitest';
 import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
 import { CASES, type Case, type Progress } from '../../src/game/cases';
-import { CAST, FIRST_MEETING, type Figure, figuresIn, figuresOf } from '../../src/game/cast';
+import { CAST, type Figure, figuresOf } from '../../src/game/cast';
 import {
   type CaseHints,
   HINT_DONE,
   HINT_FIGURE,
-  HINT_LAMP,
   HINTS,
   hintOf,
   withHint,
@@ -71,81 +70,73 @@
         source: textKey('talk.intern-support-source'),
       },
     });
-    expect([HINT_LAMP, HINT_DONE]).toStrictEqual([
-      textKey('talk.intern-lamp'),
-      textKey('talk.intern-done'),
-    ]);
+    // No page sends the player for the lamp (0039): he has it.
+    expect(HINT_DONE).toBe(textKey('talk.intern-done'));
   });
 });
 
 describe('the hint of a moment (0033)', () => {
-  it('is the page of the lamp while the player has none, whatever is found or solved', () => {
-    expect(hintOf(false, progress([]))).toBe(HINT_LAMP);
-    expect(hintOf(false, progress([0, 1, 2, 3]))).toBe(HINT_LAMP);
-    expect(hintOf(false, progress([0, 1, 2, 3], 'sales', 'marketing'))).toBe(HINT_LAMP);
-  });
-
   it('is the start of Sales while no trace of Sales is found', () => {
-    expect(hintOf(true, progress([]))).toBe(SALES.start);
+    expect(hintOf(progress([]))).toBe(SALES.start);
   });
 
   it('is what to look at while some traces of Sales are found and not all', () => {
-    expect(hintOf(true, progress([0]))).toBe(SALES.traces);
-    expect(hintOf(true, progress([1]))).toBe(SALES.traces);
+    expect(hintOf(progress([0]))).toBe(SALES.traces);
+    expect(hintOf(progress([1]))).toBe(SALES.traces);
   });
 
   it('is whom to ask once every trace of Sales is found and the case is not solved', () => {
-    expect(hintOf(true, progress([0, 1]))).toBe(SALES.source);
+    expect(hintOf(progress([0, 1]))).toBe(SALES.source);
   });
 
   it('stays with Sales whatever is found or solved in Marketing', () => {
-    expect(hintOf(true, progress([2]))).toBe(SALES.start);
-    expect(hintOf(true, progress([2, 3]))).toBe(SALES.start);
-    expect(hintOf(true, progress([0, 2, 3]))).toBe(SALES.traces);
-    expect(hintOf(true, progress([0, 1, 2, 3]))).toBe(SALES.source);
-    expect(hintOf(true, progress([2, 3], 'marketing'))).toBe(SALES.start);
-    expect(hintOf(true, progress([0, 2, 3], 'marketing'))).toBe(SALES.traces);
+    expect(hintOf(progress([2]))).toBe(SALES.start);
+    expect(hintOf(progress([2, 3]))).toBe(SALES.start);
+    expect(hintOf(progress([0, 2, 3]))).toBe(SALES.traces);
+    expect(hintOf(progress([0, 1, 2, 3]))).toBe(SALES.source);
+    expect(hintOf(progress([2, 3], 'marketing'))).toBe(SALES.start);
+    expect(hintOf(progress([0, 2, 3], 'marketing'))).toBe(SALES.traces);
   });
 
   it('goes on to Marketing once Sales is solved, by the same rule', () => {
-    expect(hintOf(true, progress([0, 1], 'sales'))).toBe(MARKETING.start);
-    expect(hintOf(true, progress([0, 1, 2], 'sales'))).toBe(MARKETING.traces);
-    expect(hintOf(true, progress([0, 1, 2, 3], 'sales'))).toBe(MARKETING.source);
+    expect(hintOf(progress([0, 1], 'sales'))).toBe(MARKETING.start);
+    expect(hintOf(progress([0, 1, 2], 'sales'))).toBe(MARKETING.traces);
+    expect(hintOf(progress([0, 1, 2, 3], 'sales'))).toBe(MARKETING.source);
   });
 
   it('goes on to Support once Sales and Marketing are solved, by the same rule (0037)', () => {
     const both = ['sales', 'marketing'] as const;
-    expect(hintOf(true, progress([0, 1, 2, 3], ...both))).toBe(SUPPORT.start);
-    expect(hintOf(true, progress([0, 1, 2, 3, 4], ...both))).toBe(SUPPORT.traces);
-    expect(hintOf(true, progress([0, 1, 2, 3, 4, 5], ...both))).toBe(SUPPORT.source);
+    expect(hintOf(progress([0, 1, 2, 3], ...both))).toBe(SUPPORT.start);
+    expect(hintOf(progress([0, 1, 2, 3, 4], ...both))).toBe(SUPPORT.traces);
+    expect(hintOf(progress([0, 1, 2, 3, 4, 5], ...both))).toBe(SUPPORT.source);
     // Whatever is found in Support, the earlier cases come first.
-    expect(hintOf(true, progress([4, 5]))).toBe(SALES.start);
-    expect(hintOf(true, progress([0, 1, 4, 5], 'sales'))).toBe(MARKETING.start);
+    expect(hintOf(progress([4, 5]))).toBe(SALES.start);
+    expect(hintOf(progress([0, 1, 4, 5], 'sales'))).toBe(MARKETING.start);
   });
 
   it('is the last page once every case is solved, in any order', () => {
     const all = [0, 1, 2, 3, 4, 5];
-    expect(hintOf(true, progress(all, 'sales', 'marketing', 'support'))).toBe(HINT_DONE);
-    expect(hintOf(true, progress(all, 'support', 'marketing', 'sales'))).toBe(HINT_DONE);
-    expect(hintOf(true, progress(all, 'marketing', 'support', 'sales'))).toBe(HINT_DONE);
+    expect(hintOf(progress(all, 'sales', 'marketing', 'support'))).toBe(HINT_DONE);
+    expect(hintOf(progress(all, 'support', 'marketing', 'sales'))).toBe(HINT_DONE);
+    expect(hintOf(progress(all, 'marketing', 'support', 'sales'))).toBe(HINT_DONE);
   });
 
   it('asks the cases in the order of the table it is given: the game passes its own', () => {
     const turned: readonly Case[] = [...CASES].reverse();
-    expect(hintOf(true, progress([]), turned)).toBe(SUPPORT.start);
-    expect(hintOf(true, progress([0]), turned)).toBe(SUPPORT.start);
-    expect(hintOf(true, progress([], 'support'), turned)).toBe(MARKETING.start);
-    expect(hintOf(true, progress([], 'support', 'marketing'), turned)).toBe(SALES.start);
+    expect(hintOf(progress([]), turned)).toBe(SUPPORT.start);
+    expect(hintOf(progress([0]), turned)).toBe(SUPPORT.start);
+    expect(hintOf(progress([], 'support'), turned)).toBe(MARKETING.start);
+    expect(hintOf(progress([], 'support', 'marketing'), turned)).toBe(SALES.start);
   });
 
   it('points to the start of a region that has no trace on the map', () => {
     const none: Progress = { traces: [], places: [], solved: [] };
-    expect(hintOf(true, none)).toBe(SALES.start);
+    expect(hintOf(none)).toBe(SALES.start);
   });
 
   it('passes over a case without hints', () => {
-    expect(hintOf(true, progress([]), CASES, { marketing: MARKETING })).toBe(MARKETING.start);
-    expect(hintOf(true, progress([]), CASES, {})).toBe(HINT_DONE);
+    expect(hintOf(progress([]), CASES, { marketing: MARKETING })).toBe(MARKETING.start);
+    expect(hintOf(progress([]), CASES, {})).toBe(HINT_DONE);
   });
 });
 
@@ -180,8 +171,8 @@
   /** What the figures say in a state, as `update` and the scene put it together. */
   const pagesIn = (state: GameState) => {
     const said = withHint(
-      figuresIn(figuresOf(MAP.points), state.lamp.owned),
-      hintOf(state.lamp.owned, {
+      figuresOf(MAP.points),
+      hintOf({
         traces: state.traces,
         places: [{ region: 'sales', box: { x: 240, y: 32, width: 16, height: 16 } }],
         solved: state.solved,
@@ -211,21 +202,21 @@
     });
   });
 
-  it('says the page of the lamp in a game that has none, and the officer the first meeting', () => {
+  it('says where Sales is in a new game, and the officer her own pages (0039)', () => {
     // Past the card (0036).
-    const without: GameState = { ...newGame(MAP), presented: 0 };
-    expect(pagesIn(without)).toStrictEqual({
-      intern: [HINT_LAMP],
-      officer: FIRST_MEETING.pages,
+    const fresh: GameState = { ...newGame(MAP), presented: 0 };
+    expect(pagesIn(fresh)).toStrictEqual({
+      intern: [SALES.start],
+      officer: CAST[0]?.pages,
     });
-    // One press closes the call's last page first: the talk opens afterwards.
-    let state: GameState = { ...without, dialogue: null };
+    // The page the cast gives him is the same one.
+    expect(CAST[1]?.pages).toStrictEqual([SALES.start]);
+    // With the call closed, a press opens his talk and the next closes it.
+    let state: GameState = { ...fresh, dialogue: null };
     state = update(state, TALK, MAP);
     expect(state.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
     state = update(update(state, NONE, MAP), TALK, MAP);
     expect(state.dialogue).toBeNull();
-    // Reading the hint hands no lamp over.
-    expect(state.lamp.owned).toBe(false);
   });
 
   it('says the hint of the moment, and the officer her own pages', () => {
```

- [x] **Step 3: The notice, the rest, the scene and the card:**

```diff
--- a/tests/unit/notice.test.ts
+++ b/tests/unit/notice.test.ts
@@ -117,29 +117,27 @@
     inputs.reduce((state, input) => update(state, input, map), start);
   // Past the card (0036): the first press turns the page of the call.
   const called = run({ ...newGame(map), presented: 0 }, TALK, NONE, TALK, NONE, TALK);
-  const met = run(called, NONE, TALK, NONE, TALK, NONE, TALK);
 
   it('is the key `notice.lamp`', () => {
     expect(NOTICE_LAMP).toBe(textKey('notice.lamp'));
   });
 
-  it('is not shown in a new game, under the call or after it, before the first meeting', () => {
-    expect(noticeOf(newGame(map))).toBeNull();
-    expect(noticeOf(called)).toBeNull();
-    expect(noticeOf(run(called, NONE, TALK, NONE, TALK, NONE))).toBeNull();
-  });
-
-  it('is shown from the step that hands the lamp over, for as long as the lamp is not held', () => {
-    expect(met.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
-    let state = met;
+  it('is the notice of a new game from its first step, for as long as the lamp is not held (0039)', () => {
+    expect(noticeOf(newGame(map))).toBe(NOTICE_LAMP);
+    expect(called.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    let state = called;
     for (let step = 0; step < 600; step += 1) {
       expect(noticeOf(state), `step ${step}`).toBe(NOTICE_LAMP);
       state = update(state, { ...NONE, right: step % 2 === 0 }, map);
     }
+    // A talk with the officer does not take it away.
+    const talked = run(called, NONE, TALK, NONE, TALK, NONE, TALK, NONE, TALK);
+    expect(talked.dialogue).toBeNull();
+    expect(noticeOf(talked)).toBe(NOTICE_LAMP);
   });
 
   it('is gone with the first step in which the lamp is on, and does not come back', () => {
-    const lit = run(met, NONE, SHINE);
+    const lit = run(called, NONE, SHINE);
     expect(noticeOf(lit)).toBeNull();
     let state = lit;
     for (let step = 0; step < 600; step += 1) {
```

```diff
--- a/tests/unit/rest.test.ts
+++ b/tests/unit/rest.test.ts
@@ -313,13 +313,18 @@
     expect(during.overview).toStrictEqual({ current: 2, max: 5 });
   });
 
-  it('is taken with Space held by a player who has no lamp: there is none to hold (0026)', () => {
+  it("is not taken with Space held in a new game either: the lamp is the player's from the first step (0039)", () => {
     // Past the card (0036): the first press turns the page of the call.
     const past: GameState = { ...newGame(OPEN), presented: 0 };
     const called = run(OPEN, past, TALK, NONE, TALK, NONE, TALK, NONE);
-    expect(called.lamp.owned).toBe(false);
-    const drunk = update(called, { ...TALK, lamp: true }, OPEN);
-    expect(drunk.rested).toStrictEqual({ at: called.tick + 1, result: 'full' });
+    const held = update(called, { ...TALK, lamp: true }, OPEN);
+    expect(held.rested).toBeNull();
+    expect(held.lamp.on).toBe(true);
+    // Without the lamp held the same press takes the coffee.
+    expect(update(called, TALK, OPEN).rested).toStrictEqual({
+      at: called.tick + 1,
+      result: 'full',
+    });
   });
 
   it('is not taken out of reach: the step is an ordinary one', () => {
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -1561,29 +1561,29 @@
     expect(owned.sheets).toContain(CONTENT.lampSheet);
   });
 
-  it('draws the page that hands the lamp over while the lamp is not owned, and her own page after', () => {
+  it('draws her own second page from the first talk: no page hands the lamp over (0039)', () => {
     const content: SceneContent = {
       ...CONTENT,
       map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
     };
-    const meeting = (lamp: GameState['lamp']): GameState => ({
+    const talking = (page: number): GameState => ({
       ...state({ x: 20, y: 30 }),
-      lamp,
+      lamp: NO_LAMP,
       figures: [{ figure: 0, facing: 'left' }],
-      dialogue: { speaker: 'figure', index: 0, page: 1 },
+      dialogue: { speaker: 'figure', index: 0, page },
     });
-    const first = recordingRenderer();
-    drawScene(first, meeting(NO_LAMP), content);
-    // `Nimm die Lampe: …`: `N` is glyph 46.
-    expect(fontCalls(first, content)[0]).toBe('drawSprite 46 at 12,138');
+    const second = recordingRenderer();
+    drawScene(second, talking(1), content);
+    // `Mit der Lampe hältst du fest, …`: `M` is glyph 45.
+    expect(fontCalls(second, content)[0]).toBe('drawSprite 45 at 12,138');
     const english = recordingRenderer();
-    drawScene(english, meeting(NO_LAMP), content, ENGLISH);
-    // `Take the lamp: …`: `T` is glyph 52.
+    drawScene(english, talking(1), content, ENGLISH);
+    // `The lamp holds still …`: `T` is glyph 52.
     expect(fontCalls(english, content)[0]).toBe('drawSprite 52 at 12,138');
-    const later = recordingRenderer();
-    drawScene(later, meeting({ ...NO_LAMP, owned: true }), content);
-    // `Mit der Lampe hältst du fest, …`: `M` is glyph 45.
-    expect(fontCalls(later, content)[0]).toBe('drawSprite 45 at 12,138');
+    const third = recordingRenderer();
+    drawScene(third, talking(2), content);
+    // `Die Lampe hast nur du. …`: `D` is glyph 36.
+    expect(fontCalls(third, content)[0]).toBe('drawSprite 36 at 12,138');
   });
 
   it("shows the lamp's line in the bar from the hand-over until the lamp was held once", () => {
@@ -1989,15 +1989,6 @@
     expect(firstGlyph(beside(talking), ENGLISH)).toBe('drawSprite 51 at 12,138');
   });
 
-  it('draws the page of the lamp while the player has none: `D` or `O`', () => {
-    const without = beside({
-      ...talking,
-      lamp: { on: false, strength: 1, owned: false, used: false },
-    });
-    expect(firstGlyph(without)).toBe('drawSprite 36 at 12,138');
-    expect(firstGlyph(without, ENGLISH)).toBe('drawSprite 47 at 12,138');
-  });
-
   it('draws the page that follows from the traces and the cases', () => {
     const found = beside({ ...talking, traces: [{ trace: 0, light: 0, found: 5 }] });
     // All traces of Sales found: `Du weißt doch …`, `D`.
```

```diff
--- a/tests/unit/card.test.ts
+++ b/tests/unit/card.test.ts
@@ -2,7 +2,7 @@
 import type { TileMap } from '../../src/engine/tiled';
 import { CARD_PRESENTS, CARD_STEPS, CARD_TITLE, cardShown, stepCard } from '../../src/game/card';
 import { CASES } from '../../src/game/cases';
-import { CAST, COLLEAGUES, FIRST_MEETING } from '../../src/game/cast';
+import { CAST, COLLEAGUES } from '../../src/game/cast';
 import { HINTS } from '../../src/game/hints';
 import { type GameInput, NO_INPUT } from '../../src/game/player';
 import type { GameState } from '../../src/game/state';
@@ -131,16 +131,7 @@
   });
 
   it('is the only place of the presenter: no table of the world data holds either name', () => {
-    const world = JSON.stringify([
-      REGIONS,
-      UPGRADES,
-      CAST,
-      FIRST_MEETING,
-      COLLEAGUES,
-      CASES,
-      SCENES,
-      HINTS,
-    ]);
+    const world = JSON.stringify([REGIONS, UPGRADES, CAST, COLLEAGUES, CASES, SCENES, HINTS]);
     // The cast, the cases and the scenes hold keys, never words: LMIS is on the card alone,
     // and Harmonic is a word in three pages of talk (vision.md §10).
     expect(world.toLowerCase().includes('lmis')).toBe(false);
```

- [x] **Step 4: The smoke tests** of the opening and of the lamp:

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -88,7 +88,7 @@
   }
 }
 
-test('the game opens with the call, without the lamp, and three presses of E close it', async ({
+test('the game opens with the call and the lamp, and three presses of E close it', async ({
   page,
 }) => {
   await page.goto('/');
@@ -100,16 +100,16 @@
           const state = window.shadowAi?.state;
           return state === undefined ? undefined : { dialogue: state.dialogue, lamp: state.lamp };
         }),
-      { message: 'a new game: the call on page 0, no lamp' },
+      { message: 'a new game: the call on page 0, the lamp not yet used' },
     )
     .toStrictEqual({
       dialogue: call(0),
-      lamp: { on: false, strength: 1, owned: false, used: false },
+      lamp: { on: false, strength: 1, owned: true, used: false },
     });
   await start(page);
   const state = await page.evaluate(() => window.shadowAi?.state);
   expect(state?.dialogue).toBeNull();
-  expect(state?.lamp.owned).toBe(false);
+  expect(state?.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
 });
 
 test('the page loads with its title, its canvas and the dark background', async ({ page }) => {
@@ -168,7 +168,7 @@
   expect(state?.player.facing).toBe('right');
 });
 
-test('without the lamp a held Space turns no light on and does not hold the figure', async ({
+test('a held Space turns the lamp on and holds the figure, from the first step after the call', async ({
   page,
 }) => {
   await start(page);
@@ -178,21 +178,22 @@
     })
     .toBe(256);
   await page.keyboard.down('Space');
+  // Nobody hands the lamp over (0039): it shines at the first held key.
   await expect
-    .poll(() => page.evaluate(() => window.shadowAi?.state.held.lamp), {
-      message: 'the state has seen Space held',
+    .poll(() => page.evaluate(() => window.shadowAi?.state.lamp), {
+      message: 'Space turns the lamp on',
     })
-    .toBe(true);
+    .toStrictEqual({ on: true, strength: 1, owned: true, used: true });
   await page.keyboard.down('ArrowRight');
-  await page.waitForTimeout(500);
+  await page.waitForTimeout(300);
   const held = await page.evaluate(() => window.shadowAi?.state);
-  // The player has no lamp before the first meeting (0026): Space counts as not held. The lamp
-  // that shines and holds the figure is covered by the unit tests.
-  expect(held?.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
-  expect(held?.player.x).toBeGreaterThanOrEqual(256 + 20);
+  // Nothing moves while the lamp is on; the direction key only turns the figure.
+  expect(held?.player.x).toBe(256);
   expect(held?.player.facing).toBe('right');
-  await page.keyboard.up('ArrowRight');
+  expect(held?.lamp.on).toBe(true);
   await page.keyboard.up('Space');
+  await expect.poll(() => page.evaluate(() => window.shadowAi?.state.lamp.on)).toBe(false);
+  await page.keyboard.up('ArrowRight');
 });
 
 test('the floor starts with three snippets and three mirages, and nothing captured', async ({
```

- [x] **Step 5: Run** `npx tsc --noEmit` — 29 errors, all in `hints.test.ts`: `hintOf` still
  takes the lamp first. Run `npx vitest run`. Expected: 28 tests fail in six files — twelve
  of the opening, twelve of the hints, and one each of the cast, the rest, the notice and the
  scene. With a dev server running,
  `npx playwright test -g "and the lamp|a held Space"` fails twice: the lamp of a new game is
  not owned, and Space turns nothing on.

- [x] **Step 6: A new game has the lamp, and no talk hands it over:**

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -2,7 +2,7 @@
 import { followPlayer } from './camera';
 import { cardShown, stepCard } from './card';
 import { answeredCase, clearRegion, earn, progressOf, solve } from './cases';
-import { figuresFrom, figuresIn, figuresOf, isFirstMeeting } from './cast';
+import { figuresFrom, figuresOf } from './cast';
 import { creaturesFrom, noCaptures, stepCreatures } from './creature';
 import { openHelp, stepHelp } from './help';
 import { hintOf, withHint } from './hints';
@@ -87,22 +87,22 @@
 
 /**
  * The state a played game starts with (0026): the initial state with the call open on its
- * first page and the lamp not yet owned — and, before the call, the card that says who
- * presents the game (0036). `main.ts` starts with it; the tests of the earlier features step
- * from `createInitialState`.
+ * first page and the lamp not yet used — and, before the call, the card that says who
+ * presents the game (0036). The lamp is the player's from the first step (0039). `main.ts`
+ * starts with it; the tests of the earlier features step from `createInitialState`.
  */
 export function newGame(map: TileMap): GameState {
   return {
     ...createInitialState(map),
-    lamp: { on: false, strength: BASE_STRENGTH, owned: false, used: false },
+    lamp: { on: false, strength: BASE_STRENGTH, owned: true, used: false },
     dialogue: { speaker: 'story', index: OPENING_SCENE, page: 0 },
     presented: null,
   };
 }
 
 /**
- * What the step that closed a dialogue changes besides closing it (0024, 0025, 0026). Closing
- * the first meeting hands the lamp over. Closing the source's answer of a ready case solves the
+ * What the step that closed a dialogue changes besides closing it (0024, 0025). Closing the
+ * source's answer of a ready case solves the
  * case, earns the upgrade of its region if it has one (0029), and what is left of the region's
  * shadow goes with it. Closing the close sets `finished` to the step's tick, so it opens once
  * (0034). Every other closing — that of the call among them — changes nothing more.
@@ -116,9 +116,6 @@
   if (dialogue.speaker === 'story') {
     return dialogue.index === CLOSE_SCENE ? { ...stepped, finished: stepped.tick } : stepped;
   }
-  if (isFirstMeeting(dialogue, figuresOf(content.points), before.lamp.owned)) {
-    return { ...stepped, lamp: { ...stepped.lamp, owned: true } };
-  }
   const answered = answeredCase(
     dialogue,
     before,
@@ -175,12 +172,8 @@
   }
   const routes = routesOf(content.points);
   const progress = progressOf(state, content);
-  // Without the lamp the data protection officer says the first meeting (0026); the intern
-  // says the hint of this moment (0033).
-  const figures = withHint(
-    figuresIn(figuresOf(content.points), state.lamp.owned),
-    hintOf(state.lamp.owned, progress),
-  );
+  // The intern says the hint of this moment (0033); every other figure its own pages.
+  const figures = withHint(figuresOf(content.points), hintOf(progress));
   const speakers = speakersOf(figures, state.movers, routes, undefined, progress);
   if (state.dialogue !== null) {
     const stepped = stepDialogue(state, state.dialogue, input, speakers);
```

- [x] **Step 7: The cast without the first meeting:**

```diff
--- a/src/game/cast.ts
+++ b/src/game/cast.ts
@@ -1,6 +1,6 @@
 import type { NamedPoint, Point } from '../engine/tiled';
 import { type TextKey, textKey } from '../text/text';
-import type { Dialogue, FigureState } from './state';
+import type { FigureState } from './state';
 
 /**
  * The cast (world.md §3, feature 0017): the figures that can be spoken to and what they say.
@@ -22,8 +22,8 @@
 export const CAST: readonly CastMember[] = [
   {
     id: 'officer',
-    // Her third page names Harmonic (0036, vision.md §10); the pages of the first meeting do
-    // not: the line compares it with the lamp, which she has handed over by then.
+    // Her third page names Harmonic (0036, vision.md §10): the line compares it with the
+    // lamp, which the player has from the first step (0039).
     pages: [
       textKey('talk.officer-rules-1'),
       textKey('talk.officer-rules-2'),
@@ -31,25 +31,10 @@
     ],
   },
   // The intern (0033). What he says is picked in every step by `game/hints`; this is the
-  // page he has before anything is known.
-  { id: 'intern', pages: [textKey('talk.intern-lamp')] },
+  // page he has before a step has picked one: the first hint of a new game (0039).
+  { id: 'intern', pages: [textKey('talk.intern-sales-start')] },
 ];
 
-/**
- * The first meeting (world.md §3, feature 0026): while the player has no lamp, this figure says
- * these pages instead of its own, and the step that closes them hands the lamp over.
- */
-export interface Meeting {
-  /** The id of the figure in the cast. */
-  readonly figure: string;
-  readonly pages: readonly TextKey[];
-}
-
-export const FIRST_MEETING: Meeting = {
-  figure: 'officer',
-  pages: [textKey('talk.officer-rules-1'), textKey('talk.officer-meeting-2')],
-};
-
 /** The lines of a colleague who walks the floor (0018), by the name of its route. */
 export interface Colleague {
   /** The route's name, `person:<room>`. */
@@ -114,35 +99,3 @@
 export function figuresFrom(figures: readonly Figure[]): FigureState[] {
   return figures.map((_figure, figure) => ({ figure, facing: 'down' }));
 }
-
-/**
- * The figures as they speak in a step (0026): while the lamp is not owned, the figure of the
- * first meeting has the meeting's pages; with the lamp owned every figure has its own.
- */
-export function figuresIn(
-  figures: readonly Figure[],
-  lampOwned: boolean,
-  meeting: Meeting = FIRST_MEETING,
-): readonly Figure[] {
-  if (lampOwned) {
-    return figures;
-  }
-  return figures.map((figure) =>
-    figure.id === meeting.figure ? { ...figure, pages: meeting.pages } : figure,
-  );
-}
-
-/**
- * Whether the dialogue is the first meeting: the lamp is not owned, and the speaker is the
- * figure that hands it over. The step that closes such a dialogue gives the lamp.
- */
-export function isFirstMeeting(
-  dialogue: Dialogue,
-  figures: readonly Figure[],
-  lampOwned: boolean,
-  meeting: Meeting = FIRST_MEETING,
-): boolean {
-  return (
-    !lampOwned && dialogue.speaker === 'figure' && figures[dialogue.index]?.id === meeting.figure
-  );
-}
```

- [x] **Step 8: The hints without the lamp:**

```diff
--- a/src/game/hints.ts
+++ b/src/game/hints.ts
@@ -4,9 +4,8 @@
 
 /**
  * The hints (world.md §3, feature 0033): the intern in the break room says where the next step
- * is. He says exactly one page, picked from how far the player has come: before the lamp, per
- * case where the room is, what to look at and whom to ask, and at the end that he knows no
- * more. He does not see the shadow: he speaks of rooms, devices and people. The hint is
+ * is. He says exactly one page, picked from how far the player has come: per case where the
+ * room is, what to look at and whom to ask, and at the end that he knows no more. He does not see the shadow: he speaks of rooms, devices and people. The hint is
  * derived from the state on every call and kept nowhere. Pure data and pure functions.
  */
 
@@ -42,26 +41,20 @@
   },
 };
 
-/** The page while the player has no lamp. */
-export const HINT_LAMP: TextKey = textKey('talk.intern-lamp');
 /** The page when every case is solved. */
 export const HINT_DONE: TextKey = textKey('talk.intern-done');
 
 /**
- * The hint of this moment. Without the lamp: HINT_LAMP. Else the cases are asked in their
- * order, and the first that is not solved decides, whatever is found in a later one: its
+ * The hint of this moment. The cases are asked in their order, and the first that is not
+ * solved decides, whatever is found in a later one: its
  * `start` page while no trace of its region is found, its `traces` page while some are and
  * not all, its `source` page once it is ready. With every case solved: HINT_DONE.
  */
 export function hintOf(
-  lampOwned: boolean,
   progress: Progress,
   cases: readonly Case[] = CASES,
   hints: Readonly<Partial<Record<string, CaseHints>>> = HINTS,
 ): TextKey {
-  if (!lampOwned) {
-    return HINT_LAMP;
-  }
   for (const { region } of cases) {
     const pages = hints[region];
     if (pages === undefined || isSolved(region, progress.solved)) {
```

- [x] **Step 9: The scene** builds the speakers as `update` does:

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -2,7 +2,7 @@
 import { type Box, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { cardShown } from '../game/card';
 import { progressOf } from '../game/cases';
-import { type Figure, figuresIn, figuresOf } from '../game/cast';
+import { type Figure, figuresOf } from '../game/cast';
 import { CREATURE_SIZE, HABITS, isWatched } from '../game/creature';
 import { hintOf, withHint } from '../game/hints';
 import { FRAME_APEX, LAMP_HEIGHT, WIDE_CONE, WIDE_FRAME_APEX } from '../game/lamp';
@@ -513,9 +513,8 @@
       : pagesOf(
           state.dialogue,
           speakersOf(
-            // As in `update`: without the lamp the officer says the first meeting (0026), and
-            // the intern says the hint of this moment (0033).
-            withHint(figuresIn(figures, state.lamp.owned), hintOf(state.lamp.owned, progress)),
+            // As in `update`: the intern says the hint of this moment (0033).
+            withHint(figures, hintOf(progress)),
             state.movers,
             routesOf(content.map.points),
             undefined,
```

- [x] **Step 10: Run** `npm run check` — 1609 unit tests. Then
  `npx playwright test -g "and the lamp|a held Space"`: 2 passed.

- [x] **Step 11: Commit** — `Give the player the lamp from the first step`. Body: the
  handover made Space mean something only after a talk; now the keys mean the same from the
  first second, and the data protection officer explains the lamp without giving it.

---

### Task 2: The field goes

**Files:**
- Modify: `src/game/state.ts`, `src/game/update.ts`, `src/game/talk.ts`, `src/game/notice.ts`
- Test: twelve files of `tests/unit/` and `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `LampState` is `{ on: boolean; strength: number; used: boolean }`.

- [x] **Step 1: The literals.** In every file under `tests/`, the text `owned: true, ` or
  `owned: false, ` goes — 52 places. Two literals of `tests/unit/state.test.ts` hold the field
  on a line of its own; that line goes. A few tests get a name or a comment that no longer
  speaks of owning, one test of the opening asserts the three fields of the lamp, and one
  test of the scene changes its meaning: after the call the bar holds the lamp's line.

```diff
--- a/tests/unit/opening.test.ts
+++ b/tests/unit/opening.test.ts
@@ -60,18 +60,19 @@
 
 describe('the two starts (0026)', () => {
   it('starts a played game with the card, the call open under it, and the lamp not yet used', () => {
-    // The lamp is the player's from the first step (0039).
+    // The lamp is the player's from the first step (0039): the state has no field that says so.
+    expect(Object.keys(newGame(MAP).lamp)).toStrictEqual(['on', 'strength', 'used']);
     expect(newGame(MAP)).toStrictEqual({
       ...createInitialState(MAP),
-      lamp: { on: false, strength: 1, owned: true, used: false },
+      lamp: { on: false, strength: 1, used: false },
       dialogue: { speaker: 'story', index: 0, page: 0 },
       presented: null,
     });
   });
 
-  it('keeps the initial state a game past its opening: the lamp owned and used, no dialogue', () => {
+  it('keeps the initial state a game past its opening: the lamp used, no dialogue', () => {
     const state = createInitialState(MAP);
-    expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
+    expect(state.lamp).toStrictEqual({ on: false, strength: 1, used: true });
     expect(state.dialogue).toBeNull();
   });
 
@@ -176,9 +177,9 @@
   const start = called(LIT);
 
   it('is on in the first step with the key held, right after the call, and was used from then', () => {
-    expect(start.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    expect(start.lamp).toStrictEqual({ on: false, strength: 1, used: false });
     const first = update(start, SHINE, LIT);
-    expect(first.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
+    expect(first.lamp).toStrictEqual({ on: true, strength: 1, used: true });
   });
 
   it('lights the snippet, the wall and the trace of a new game, as in a game past its opening', () => {
@@ -203,7 +204,7 @@
     const waiting = steps(LIT, newGame(LIT), SHINE, 600);
     expect(waiting.presented).toBe(180);
     expect(waiting.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 0 });
-    expect(waiting.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    expect(waiting.lamp).toStrictEqual({ on: false, strength: 1, used: false });
     expect(waiting.creatures.every((creature) => creature.light === 0)).toBe(true);
     expect(waiting.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
   });
@@ -213,7 +214,7 @@
     expect(hit.overview.current).toBeLessThan(5);
     const woken = update({ ...start, dark: 44 }, NONE, LIT);
     expect(woken.dark).toBe(45);
-    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, used: false });
     expect(update(woken, SHINE, LIT).dark).toBe(46);
   });
 });
@@ -273,9 +274,9 @@
 
   it('is used from the first step in which the lamp is on, and stays so', () => {
     const first = run(MAP, start, NONE, SHINE);
-    expect(first.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
+    expect(first.lamp).toStrictEqual({ on: true, strength: 1, used: true });
     const off = update(first, NONE, MAP);
-    expect(off.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
+    expect(off.lamp).toStrictEqual({ on: false, strength: 1, used: true });
     expect(steps(MAP, off, NONE, 600).lamp.used).toBe(true);
     expect(update({ ...off, dark: 44 }, NONE, MAP).lamp.used).toBe(true);
   });
```

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -101,7 +101,7 @@
         recoil: { dx: 0, dy: 0, steps: 0 },
       },
       camera: { x: 0, y: 12 },
-      lamp: { on: false, strength: 1, owned: true, used: true },
+      lamp: { on: false, strength: 1, used: true },
       creatures: [],
       movers: [],
       shadowWalls: [],
@@ -129,7 +129,7 @@
     expect(Number.isInteger(state.player.x), 'x is fractional after a diagonal').toBe(false);
     expect(state.player.facing).toBe('left');
     expect(state.camera).toStrictEqual({ x: 0, y: 0 });
-    expect(state.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
+    expect(state.lamp).toStrictEqual({ on: true, strength: 1, used: true });
     const copy: unknown = JSON.parse(JSON.stringify(state));
     expect(copy).toStrictEqual(state);
   });
@@ -165,7 +165,7 @@
         upgrades: [],
         player,
         camera: { x: 0, y: 12 },
-        lamp: { on: false, strength: 1, owned: true, used: true },
+        lamp: { on: false, strength: 1, used: true },
         creatures: [],
         movers: [],
         shadowWalls: [],
@@ -197,7 +197,7 @@
       upgrades: [],
       player,
       camera: { x: 0, y: 12 },
-      lamp: { on: false, strength: 1, owned: true, used: true },
+      lamp: { on: false, strength: 1, used: true },
       creatures: [],
       movers: [],
       shadowWalls: [],
@@ -221,7 +221,7 @@
       upgrades: [],
       player,
       camera: { x: 0, y: 12 },
-      lamp: { on: false, strength: 1, owned: true, used: true },
+      lamp: { on: false, strength: 1, used: true },
       creatures: [],
       movers: [],
       shadowWalls: [],
@@ -277,14 +277,13 @@
     expect(createInitialState(MAP).lamp).toStrictEqual({
       on: false,
       strength: 1,
-      owned: true,
       used: true,
     });
   });
 
   it('is on in a step whose input holds lamp; the figure stays, turns, and the camera stays on it', () => {
     const state = update(createInitialState(MAP), { ...SHINE, right: true }, MAP);
-    expect(state.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
+    expect(state.lamp).toStrictEqual({ on: true, strength: 1, used: true });
     expect([state.player.x, state.player.y, state.player.facing]).toStrictEqual([
       136,
       120,
@@ -299,7 +298,6 @@
     expect(update(shone, NONE, MAP).lamp).toStrictEqual({
       on: false,
       strength: 1,
-      owned: true,
       used: true,
     });
   });
@@ -518,7 +516,7 @@
 
   it('starts with every wall of the map standing and a lamp of strength 1', () => {
     const state = createInitialState(WALLS_MAP);
-    expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
+    expect(state.lamp).toStrictEqual({ on: false, strength: 1, used: true });
     expect(state.shadowWalls).toStrictEqual([
       { wall: 0, lit: false, light: 0 },
       { wall: 1, lit: false, light: 0 },
@@ -630,7 +628,7 @@
     const woken = run(map, before, [1, SHINE]);
     expect(woken.dark).toBe(45);
     expect(woken.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
-    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
+    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, used: true });
   });
 
   it('steps a state without standing walls exactly as a map without walls (600 steps)', () => {
```

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -204,7 +204,7 @@
   upgrades: [],
   player: player(fields),
   camera,
-  lamp: { on: lampOn, strength: 1, owned: true, used: true },
+  lamp: { on: lampOn, strength: 1, used: true },
   creatures: [],
   movers: [],
   shadowWalls: [],
@@ -778,7 +778,7 @@
     for (const scene of [
       holding({ shadowWalls: [{ wall: 0, lit: true, light: 1 }] }),
       holding({ shadowWalls: [] }),
-      holding({ lamp: { on: false, strength: 1, owned: true, used: true } }),
+      holding({ lamp: { on: false, strength: 1, used: true } }),
     ]) {
       const renderer = recordingRenderer();
       drawScene(renderer, scene, CONTENT);
@@ -1080,7 +1080,7 @@
 
   it('leaves the bar to the notice of 0016, which itself changes its language', () => {
     const holding = quiet(100, {
-      lamp: { on: true, strength: 1, owned: true, used: true },
+      lamp: { on: true, strength: 1, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     });
     const renderer = recordingRenderer();
@@ -1204,13 +1204,17 @@
     }
   });
 
-  it('is not drawn after the call either, while the lamp is not owned', () => {
-    const closed = { lamp: { on: false, strength: 1, owned: false, used: false } };
+  it("holds the lamp's line after the call and no start hint, whatever the tick (0039)", () => {
+    const closed = { lamp: { on: false, strength: 1, used: false } };
     for (const tick of [5, 100, 604, 605]) {
       const renderer = recordingRenderer();
       drawScene(renderer, fresh(tick, closed), CONTENT);
-      expect(renderer.calls, `tick ${tick}`).not.toContain(BAR);
-      expect(fontCalls(renderer)).toStrictEqual([]);
+      expect(
+        renderer.calls.filter((call) => call === BAR),
+        `tick ${tick}`,
+      ).toHaveLength(1);
+      // `Die Lampe: Leertaste halten.`: 25 glyphs, and nothing else in the game's font.
+      expect(fontCalls(renderer), `tick ${tick}`).toHaveLength(25);
     }
   });
 
@@ -1442,7 +1446,7 @@
     const renderer = recordingRenderer();
     drawScene(
       renderer,
-      { ...cleared('sales', 40), lamp: { on: true, strength: 1, owned: true, used: true } },
+      { ...cleared('sales', 40), lamp: { on: true, strength: 1, used: true } },
       content,
     );
     const detail = renderer.calls.indexOf('drawTile 4 at 16,16');
@@ -1483,8 +1487,9 @@
 describe('the story in the scene (0026)', () => {
   const BOX = 'fillRect 8,134 304x42 #181425';
   const BAR = 'fillRect 8,158 304x18 #181425';
-  const NO_LAMP = { on: false, strength: 1, owned: false, used: false };
-  /** A new game on the 3x2 map: the call open on `page`, no lamp. */
+  /** The lamp of a new game: off, and not yet used (0039). */
+  const NO_LAMP = { on: false, strength: 1, used: false };
+  /** A new game on the 3x2 map: the call open on `page`. */
   const calling = (page: number, tick = 0): GameState => ({
     ...state({ x: 20, y: 30 }),
     tick,
@@ -1552,13 +1557,13 @@
     expect(renderer.calls).not.toContain(BOX);
   });
 
-  it('draws no cone while the lamp is not owned, whatever is held', () => {
+  it('draws no cone while the lamp is off, and the cone as soon as it is on', () => {
     const renderer = recordingRenderer();
     drawScene(renderer, { ...calling(0), dialogue: null }, CONTENT);
     expect(renderer.sheets).not.toContain(CONTENT.lampSheet);
-    const owned = recordingRenderer();
-    drawScene(owned, state({ x: 20, y: 30 }, { x: 0, y: 0 }, true), CONTENT);
-    expect(owned.sheets).toContain(CONTENT.lampSheet);
+    const lit = recordingRenderer();
+    drawScene(lit, state({ x: 20, y: 30 }, { x: 0, y: 0 }, true), CONTENT);
+    expect(lit.sheets).toContain(CONTENT.lampSheet);
   });
 
   it('draws her own second page from the first talk: no page hands the lamp over (0039)', () => {
@@ -1586,10 +1591,10 @@
     expect(fontCalls(third, content)[0]).toBe('drawSprite 36 at 12,138');
   });
 
-  it("shows the lamp's line in the bar from the hand-over until the lamp was held once", () => {
+  it("shows the lamp's line in the bar from the first step until the lamp was held once", () => {
     const waiting: GameState = {
       ...state({ x: 20, y: 30 }),
-      lamp: { on: false, strength: 1, owned: true, used: false },
+      lamp: { on: false, strength: 1, used: false },
     };
     const renderer = recordingRenderer();
     drawScene(renderer, waiting, CONTENT);
@@ -1685,7 +1690,7 @@
       [
         'the call',
         playing({
-          lamp: { on: false, strength: 1, owned: false, used: false },
+          lamp: { on: false, strength: 1, used: false },
           dialogue: { speaker: 'story', index: 0, page: 0 },
         }),
         GERMAN,
@@ -1695,7 +1700,7 @@
       [
         'a notice',
         playing({
-          lamp: { on: true, strength: 1, owned: true, used: true },
+          lamp: { on: true, strength: 1, used: true },
           shadowWalls: [{ wall: 0, lit: true, light: 0 }],
         }),
         GERMAN,
@@ -2050,10 +2055,10 @@
 });
 
 describe('the card in the scene (0036)', () => {
-  /** A new game as the scene gets it: the card shown, the call open under it, no lamp. */
+  /** A new game as the scene gets it: the card shown, the call open under it. */
   const card = (fields: Partial<GameState> = {}): GameState => ({
     ...state({ x: 8, y: 8 }),
-    lamp: { on: false, strength: 1, owned: false, used: false },
+    lamp: { on: false, strength: 1, used: false },
     dialogue: { speaker: 'story', index: 0, page: 0 },
     presented: null,
     ...fields,
```

```diff
--- a/tests/unit/notice.test.ts
+++ b/tests/unit/notice.test.ts
@@ -32,7 +32,7 @@
 const BASE = createInitialState(grassMap(20, 12, { x: 152, y: 96 }));
 const withWalls = (lampOn: boolean, ...shadowWalls: ShadowWallState[]): GameState => ({
   ...BASE,
-  lamp: { on: lampOn, strength: 1, owned: true, used: true },
+  lamp: { on: lampOn, strength: 1, used: true },
   shadowWalls,
 });
 
@@ -124,7 +124,7 @@
 
   it('is the notice of a new game from its first step, for as long as the lamp is not held (0039)', () => {
     expect(noticeOf(newGame(map))).toBe(NOTICE_LAMP);
-    expect(called.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+    expect(called.lamp).toStrictEqual({ on: false, strength: 1, used: false });
     let state = called;
     for (let step = 0; step < 600; step += 1) {
       expect(noticeOf(state), `step ${step}`).toBe(NOTICE_LAMP);
@@ -155,7 +155,7 @@
     const waiting: GameState = {
       ...BASE,
       tick: 1000,
-      lamp: { on: false, strength: 1, owned: true, used: false },
+      lamp: { on: false, strength: 1, used: false },
     };
     expect(noticeOf(waiting)).toBe(NOTICE_LAMP);
     expect(noticeOf({ ...waiting, traces: [{ trace: 0, light: 0, found: 950 }] })).toBe(
@@ -215,7 +215,7 @@
     expect(
       noticeOf({
         ...coffee,
-        lamp: { on: true, strength: 1, owned: true, used: true },
+        lamp: { on: true, strength: 1, used: true },
         shadowWalls: [HOLDS],
       }),
     ).toBe(NOTICE_SHADOW_TOO_DENSE);
@@ -232,7 +232,7 @@
   });
 
   it("comes before the line that names the lamp's key, which is back when it is over", () => {
-    const waiting = { on: false, strength: 1, owned: true, used: false };
+    const waiting = { on: false, strength: 1, used: false };
     expect(noticeOf({ ...rested('full', 10), lamp: waiting })).toBe(NOTICE_REST.full);
     expect(noticeOf({ ...rested('full', 120), lamp: waiting })).toBe(NOTICE_LAMP);
   });
@@ -318,7 +318,7 @@
   it('comes after a wall that holds and before a found trace, a rest and the lamp key', () => {
     const holds: GameState = {
       ...earned(150),
-      lamp: { on: true, strength: 2, owned: true, used: true },
+      lamp: { on: true, strength: 2, used: true },
       shadowWalls: [HOLDS],
     };
     expect(noticeOf(holds)).toBe(NOTICE_SHADOW_TOO_DENSE);
@@ -326,7 +326,7 @@
       ...earned(150),
       traces: [{ trace: 0, light: 0, found: 1140 }],
       rested: { at: 1140, result: 'restored' },
-      lamp: { on: false, strength: 2, owned: true, used: false },
+      lamp: { on: false, strength: 2, used: false },
     };
     expect(noticeOf(found)).toBe(WIDER);
     expect(noticeOf({ ...found, tick: 1240 })).toBe(NOTICE_TRACE_FOUND);
```

```diff
--- a/tests/unit/cases.test.ts
+++ b/tests/unit/cases.test.ts
@@ -294,7 +294,7 @@
     expect(noticeOf({ ...both, solved: [] })).toBe(textKey('notice.trace-found'));
     const holding: GameState = {
       ...both,
-      lamp: { on: true, strength: 1, owned: true, used: true },
+      lamp: { on: true, strength: 1, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     };
     expect(noticeOf(holding)).toBe(textKey('notice.shadow-too-dense'));
```

```diff
--- a/tests/unit/draw-help.test.ts
+++ b/tests/unit/draw-help.test.ts
@@ -110,7 +110,7 @@
     recoil: NO_RECOIL,
   },
   camera: { x: 0, y: 0 },
-  lamp: { on: false, strength: 1, owned: true, used: true },
+  lamp: { on: false, strength: 1, used: true },
   creatures: [],
   movers: [],
   shadowWalls: [],
@@ -349,7 +349,7 @@
   it('leaves the notice of 0016 under it', () => {
     const holding = playing({
       help: true,
-      lamp: { on: true, strength: 1, owned: true, used: true },
+      lamp: { on: true, strength: 1, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     });
     const calls = scene(holding);
```

```diff
--- a/tests/unit/draw-journal.test.ts
+++ b/tests/unit/draw-journal.test.ts
@@ -107,7 +107,7 @@
     recoil: NO_RECOIL,
   },
   camera: { x: 0, y: 0 },
-  lamp: { on: true, strength: 1, owned: true, used: true },
+  lamp: { on: true, strength: 1, used: true },
   creatures: [],
   movers: [],
   shadowWalls: [],
```

```diff
--- a/tests/unit/help.test.ts
+++ b/tests/unit/help.test.ts
@@ -54,7 +54,7 @@
     const pushed: GameState = {
       ...start,
       player: { ...start.player, frame: 2, recoil: { dx: -3, dy: 0, steps: 4 } },
-      lamp: { on: true, strength: 1, owned: true, used: true },
+      lamp: { on: true, strength: 1, used: true },
     };
     expect(update(pushed, input, OPEN)).toStrictEqual({
       ...pushed,
@@ -211,7 +211,7 @@
   const start: GameState = {
     ...run(map, createInitialState(map), NONE, NONE, NONE),
     shadowWalls: [{ wall: 0, lit: true, light: 30 }],
-    lamp: { on: true, strength: 1, owned: true, used: true },
+    lamp: { on: true, strength: 1, used: true },
   };
   /** Every key but `help`. */
   const ALL_OTHERS: GameInput = {
```

```diff
--- a/tests/unit/journal.test.ts
+++ b/tests/unit/journal.test.ts
@@ -132,7 +132,7 @@
     const pushed: GameState = {
       ...start,
       player: { ...start.player, frame: 2, recoil: { dx: -3, dy: 0, steps: 4 } },
-      lamp: { on: true, strength: 1, owned: true, used: true },
+      lamp: { on: true, strength: 1, used: true },
     };
     expect(update(pushed, input, OPEN)).toStrictEqual({
       ...pushed,
@@ -275,7 +275,7 @@
   const start: GameState = {
     ...run(map, createInitialState(map), NONE, NONE, NONE),
     shadowWalls: [{ wall: 0, lit: true, light: 30 }],
-    lamp: { on: true, strength: 1, owned: true, used: true },
+    lamp: { on: true, strength: 1, used: true },
   };
   const ALL_OTHERS: GameInput = { ...NONE, up: true, down: true, lamp: true, talk: true };
 
```

```diff
--- a/tests/unit/overview.test.ts
+++ b/tests/unit/overview.test.ts
@@ -168,7 +168,7 @@
     upgrades: [],
     player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
     camera: { x: 140, y: 106 },
-    lamp: { on: true, strength: 1, owned: true, used: true },
+    lamp: { on: true, strength: 1, used: true },
     creatures: [snippet(310, 200)],
     movers: [],
     shadowWalls: [{ wall: 1, lit: true, light: 30 }],
@@ -199,7 +199,7 @@
       finished: null,
       presented: 0,
       upgrades: [],
-      lamp: { on: false, strength: 1, owned: true, used: true },
+      lamp: { on: false, strength: 1, used: true },
       dark: 44,
     });
   });
@@ -215,7 +215,7 @@
       upgrades: [],
       player,
       camera: followPlayer(player, MAP),
-      lamp: { on: false, strength: 1, owned: true, used: true },
+      lamp: { on: false, strength: 1, used: true },
       creatures: [{ ...snippet(40, 40), home: { x: 40, y: 40 } }],
       movers: [],
       shadowWalls: [{ wall: 1, lit: false, light: 0 }],
```

```diff
--- a/tests/unit/shadow.test.ts
+++ b/tests/unit/shadow.test.ts
@@ -162,7 +162,7 @@
     wall({ x: 160, y: 80, width: 4, height: 32 }, 'hr', 2),
   ];
   const PLAYER = figure(152, 80, 'down');
-  const BASIC = { on: true, strength: 1, owned: true, used: true };
+  const BASIC = { on: true, strength: 1, used: true };
   const run = (
     standing: readonly ShadowWallState[],
     steps: number,
@@ -207,7 +207,7 @@
 
   it('a wall of density 2 holds against strength 1 however long, and is gone after 60 steps of strength 2', () => {
     expect(run(standingWalls(WALLS), 600)).toStrictEqual([{ wall: 1, lit: true, light: 0 }]);
-    const strong = { on: true, strength: 2, owned: true, used: true };
+    const strong = { on: true, strength: 2, used: true };
     expect(run([{ wall: 1, lit: false, light: 0 }], 59, strong)).toStrictEqual([
       { wall: 1, lit: true, light: 59 },
     ]);
@@ -217,7 +217,7 @@
   it('a step out of the light starts the second again', () => {
     const half = run(standingWalls(WALLS), 30);
     expect(half[0]).toStrictEqual({ wall: 0, lit: true, light: 30 });
-    const broken = run(half, 1, { on: false, strength: 1, owned: true, used: true });
+    const broken = run(half, 1, { on: false, strength: 1, used: true });
     expect(broken).toStrictEqual([
       { wall: 0, lit: false, light: 0 },
       { wall: 1, lit: false, light: 0 },
@@ -324,7 +324,7 @@
   it('steps a wall at the wider edge with the wider cone only', () => {
     const walls = [wall({ x: 126, y: 140, width: 16, height: 4 })];
     const player = figure(100, 112, 'down');
-    const lamp = { on: true, strength: 1, owned: true, used: true };
+    const lamp = { on: true, strength: 1, used: true };
     expect(stepWalls(standingWalls(walls), walls, player, lamp, OPEN, WIDE_SPREAD)).toStrictEqual([
       { wall: 0, lit: true, light: 1 },
     ]);
```

```diff
--- a/tests/unit/trace.test.ts
+++ b/tests/unit/trace.test.ts
@@ -280,7 +280,7 @@
   it('gives way to the notice of a wall that holds', () => {
     const state: GameState = {
       ...found,
-      lamp: { on: true, strength: 1, owned: true, used: true },
+      lamp: { on: true, strength: 1, used: true },
       shadowWalls: [{ wall: 0, lit: true, light: 0 }],
     };
     expect(noticeOf(state)).toBe(textKey('notice.shadow-too-dense'));
```

```diff
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -104,12 +104,12 @@
     )
     .toStrictEqual({
       dialogue: call(0),
-      lamp: { on: false, strength: 1, owned: true, used: false },
+      lamp: { on: false, strength: 1, used: false },
     });
   await start(page);
   const state = await page.evaluate(() => window.shadowAi?.state);
   expect(state?.dialogue).toBeNull();
-  expect(state?.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
+  expect(state?.lamp).toStrictEqual({ on: false, strength: 1, used: false });
 });
 
 test('the page loads with its title, its canvas and the dark background', async ({ page }) => {
@@ -183,7 +183,7 @@
     .poll(() => page.evaluate(() => window.shadowAi?.state.lamp), {
       message: 'Space turns the lamp on',
     })
-    .toStrictEqual({ on: true, strength: 1, owned: true, used: true });
+    .toStrictEqual({ on: true, strength: 1, used: true });
   await page.keyboard.down('ArrowRight');
   await page.waitForTimeout(300);
   const held = await page.evaluate(() => window.shadowAi?.state);
```

- [x] **Step 2: Run** `npx tsc --noEmit` — 33 errors in eleven test files: the literals lack
  a field the type still has. Run `npx vitest run`. Expected: 18 tests fail in four files —
  seven of the state, six of the opening, three of the notice and two of the scene: the
  states the game makes still hold `owned`.

- [x] **Step 3: The type:**

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -35,16 +35,14 @@
 }
 
 /**
- * The lamp (0007, 0014, 0026): on in every step whose input holds `lamp`, once the player has
- * it. Later field: charge (M6).
+ * The lamp (0007, 0014, 0026, 0039): on in every step whose input holds `lamp`. The player has
+ * it from the first step. Later field: charge (M6).
  */
 export interface LampState {
   readonly on: boolean;
   /** Against a region's density (gameplay.md §5): BASE_STRENGTH plus the upgrades earned. */
   readonly strength: number;
-  /** Whether the player has the lamp (0026). Without it the input's `lamp` counts as not held. */
-  readonly owned: boolean;
-  /** Whether the lamp was on in any step since it was owned (0026). It never goes back. */
+  /** Whether the lamp was on in any step of the game (0026). It never goes back. */
   readonly used: boolean;
 }
 
```

- [x] **Step 4: The rules that asked for it:**

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -34,7 +34,7 @@
  * every standing figure of the map facing down and no dialogue (0017); the journal closed and
  * no key remembered (0020); the help closed (0021); every trace of the map unseen and not found
  * (0022); no case solved (0024); no upgrade earned (0029). It is a game past its opening
- * (0026): the lamp is owned and was used, no scene is open, and the card ended at tick 0
+ * (0026): the lamp was used, no scene is open, and the card ended at tick 0
  * (0036); `newGame` is the state a player starts with.
  * A map with two wake points, a route that is malformed or crosses a solid tile, a
  * rectangle of no known kind, a shadow wall or a trace the world data or the grid refuses, an
@@ -64,7 +64,7 @@
     tick: 0,
     player,
     camera: followPlayer(player, map),
-    lamp: { on: false, strength: BASE_STRENGTH, owned: true, used: true },
+    lamp: { on: false, strength: BASE_STRENGTH, used: true },
     upgrades: [],
     creatures: creaturesFrom(map.points),
     movers: moversFrom(routes),
@@ -94,7 +94,7 @@
 export function newGame(map: TileMap): GameState {
   return {
     ...createInitialState(map),
-    lamp: { on: false, strength: BASE_STRENGTH, owned: true, used: false },
+    lamp: { on: false, strength: BASE_STRENGTH, used: false },
     dialogue: { speaker: 'story', index: OPENING_SCENE, page: 0 },
     presented: null,
   };
@@ -193,13 +193,11 @@
   if (opened !== null) {
     return opened;
   }
-  // Without the lamp the input's `lamp` counts as not held: for the light and for the figure.
-  const acting: GameInput = { ...input, lamp: input.lamp && state.lamp.owned };
-  // A press at a coffee machine in reach takes the rest (0027); the step goes on from there.
-  const rest = takeRest(state, acting, content);
+  // A press at a coffee machine in reach takes the rest (0027); the step goes on from there.
+  const rest = takeRest(state, input, content);
   const rested = rest === null ? state.rested : rest.rested;
   const before = rest === null ? state.overview : rest.overview;
-  const on = acting.lamp && state.player.recoil.steps === 0;
+  const on = input.lamp && state.player.recoil.steps === 0;
   const lamp: LampState = { ...state.lamp, on, used: state.lamp.used || on };
   // The cone is as wide as the upgrades make it (0029): for the creatures, the walls and the
   // traces.
@@ -207,7 +205,7 @@
   const walls = wallsOf(content.rects);
   // The figure, the push and the creatures meet the walls standing at the start of the step.
   const walled = withWalls(content, walls, state.shadowWalls);
-  const stepped = stepPlayer(state.player, acting, walled);
+  const stepped = stepPlayer(state.player, input, walled);
   const { creatures, captured } = stepCreatures(
     state.creatures,
     state.captured,
```

```diff
--- a/src/game/talk.ts
+++ b/src/game/talk.ts
@@ -152,9 +152,8 @@
 
 /**
  * The state after a press that opens a dialogue, or null when this step opens none: `talk` is
- * not pressed, the lamp is held, the player is being pushed, or no speaker is in reach. A
- * player without the lamp holds none, whatever the input says (0026). The player and the
- * speaker turn to each other, the player stands, a colleague stands where it is, the lamp is
+ * not pressed, the lamp is held, the player is being pushed, or no speaker is in reach. The
+ * player and the speaker turn to each other, the player stands, a colleague stands where it is, the lamp is
  * off; nothing else is stepped.
  */
 export function openDialogue(
@@ -163,8 +162,7 @@
   speakers: readonly Speaker[],
   map: TileMap,
 ): GameState | null {
-  const lampHeld = state.lamp.owned && input.lamp;
-  if (!talkPressed(state, input) || lampHeld || state.player.recoil.steps > 0) {
+  if (!talkPressed(state, input) || input.lamp || state.player.recoil.steps > 0) {
     return null;
   }
   const { player } = state;
```

```diff
--- a/src/game/notice.ts
+++ b/src/game/notice.ts
@@ -70,8 +70,8 @@
  * an upgrade (0029). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was
  * found (0022).
  * Then, for REST_NOTICE_STEPS steps from a press at a rest, what the rest gave (0027). Last,
- * while the lamp is owned and was never on, the line that names its key (0026): it has no time,
- * and it does not come back.
+ * while the lamp was never on, the line that names its key (0026, 0039): it has no time, and
+ * it does not come back.
  */
 export function noticeOf(state: GameState): TextKey | null {
   const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
@@ -95,5 +95,5 @@
   if (state.rested !== null && state.tick - state.rested.at < REST_NOTICE_STEPS) {
     return NOTICE_REST[state.rested.result];
   }
-  return state.lamp.owned && !state.lamp.used ? NOTICE_LAMP : null;
+  return state.lamp.used ? null : NOTICE_LAMP;
 }
```

- [x] **Step 5: Run** `npm run check` — 1609 unit tests. Then `npm run test:e2e`: 20 passed,
  3 skipped.

- [x] **Step 6: Commit** — `Take the lamp's ownership out of the state`. Body: the player
  always has the lamp, so a field that is always true and the rules that read it are gone.

---

### Task 3: The words that nobody says

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

- [x] **Step 1: Write the failing tests:**

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -473,10 +473,6 @@
       textOf(textKey(id), 'de').split('\n')[0] ?? '',
       textOf(textKey(id), 'en').split('\n')[0] ?? '',
     ];
-    expect(first('talk.intern-lamp')).toStrictEqual([
-      'Du willst in den Vertrieb? Geh erst nach',
-      'Off to Sales? Go next door first, to the data',
-    ]);
     expect(first('talk.intern-sales-start')).toStrictEqual([
       'Vertrieb? Am Ende des Flurs nach Osten.',
       'Sales? At the end of the corridor to the east.',
@@ -510,9 +506,10 @@
       'kommst du jetzt in HR und Buchhaltung rein –',
       'was da los ist, erzählst du mir.',
     ]);
-    // Eight keys of 0033 and the three of Support (0037), each one page of three lines.
+    // Seven keys of 0033 — the page that sent for the lamp went with 0039 — and the three of
+    // Support (0037), each one page of three lines.
     const ids = Object.keys(TABLE.de).filter((id) => id.startsWith('talk.intern-'));
-    expect(ids).toHaveLength(11);
+    expect(ids).toHaveLength(10);
     for (const language of LANGUAGES) {
       for (const id of ids) {
         expect(TABLE[language][id as TextId].split('\n'), `${language} ${id}`).toHaveLength(3);
@@ -646,7 +643,19 @@
     ]);
   });
 
-  it('holds the words of the call, the first meeting and the lamp in both languages (0026)', () => {
+  it('has no page that hands the lamp over and none that sends for it (0039)', () => {
+    for (const language of LANGUAGES) {
+      const ids = Object.keys(TABLE[language]);
+      expect(ids, language).not.toContain('talk.officer-meeting-2');
+      expect(ids, language).not.toContain('talk.intern-lamp');
+      // No page of either table tells the player to take or to fetch the lamp.
+      const words = Object.values(TABLE[language]).join('\n');
+      expect(words.includes('Nimm die Lampe'), language).toBe(false);
+      expect(words.includes('Take the lamp'), language).toBe(false);
+    }
+  });
+
+  it('holds the words of the call and the lamp in both languages (0026)', () => {
     const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
       textOf(textKey(id), language).split('\n');
     expect(lines('story.call-1', 'de')).toStrictEqual([
@@ -679,16 +688,6 @@
       'that was not there before. Next door, the',
       'data protection officer has her light on.',
     ]);
-    expect(lines('talk.officer-meeting-2', 'de')).toStrictEqual([
-      'Nimm die Lampe: Sie hält fest, was sich darin',
-      'regt – nicht um es zu vertreiben, sondern um',
-      'es zu verstehen.',
-    ]);
-    expect(lines('talk.officer-meeting-2', 'en')).toStrictEqual([
-      'Take the lamp: it holds still whatever stirs',
-      'in it – not to drive it away, but to',
-      'understand it.',
-    ]);
     expect(lines('notice.lamp', 'de')).toStrictEqual(['Die Lampe: Leertaste halten.']);
     expect(lines('notice.lamp', 'en')).toStrictEqual(['The lamp: hold Space.']);
   });
```

- [x] **Step 2: Run them** — `npx vitest run tests/unit/text.test.ts`. Expected: FAIL, 2 of 35
  tests: `holds the eight pages of the intern in both languages (0033)` counts eleven keys
  where it expects ten, and `has no page that hands the lamp over and none that sends for it
  (0039)`.

- [x] **Step 3: The two keys leave both tables:**

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -63,11 +63,6 @@
     'würde dem Haus zeigen, welche KI hier läuft',
     'und wohin die Daten gehen.',
   ].join('\n'),
-  'talk.officer-meeting-2': [
-    'Nimm die Lampe: Sie hält fest, was sich darin',
-    'regt – nicht um es zu vertreiben, sondern um',
-    'es zu verstehen.',
-  ].join('\n'),
   'story.call-1': [
     'Montagmorgen. Das Telefon – ein Kunde:',
     '„Sätze aus unserem vertraulichen Angebot stehen',
@@ -179,11 +174,6 @@
     'freigegebenen Liste – und nur von dort. Fehlt',
     'eines, sag es: Dann kommt es auf die Liste.',
   ].join('\n'),
-  'talk.intern-lamp': [
-    'Du willst in den Vertrieb? Geh erst nach',
-    'nebenan, zur Datenschutzbeauftragten. Sie hat',
-    'etwas, das du brauchen wirst.',
-  ].join('\n'),
   'talk.intern-sales-start': [
     'Vertrieb? Am Ende des Flurs nach Osten.',
     'Die tippen ihre Angebote neuerdings nicht mehr',
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -59,11 +59,6 @@
     'would show the house which AI runs here',
     'and where the data goes.',
   ].join('\n'),
-  'talk.officer-meeting-2': [
-    'Take the lamp: it holds still whatever stirs',
-    'in it – not to drive it away, but to',
-    'understand it.',
-  ].join('\n'),
   'story.call-1': [
     'Monday morning. The phone – a customer:',
     '“Sentences from our confidential offer are in',
@@ -174,11 +169,6 @@
     'list – and only from there. If one is missing,',
     'say so: then it gets onto the list.',
   ].join('\n'),
-  'talk.intern-lamp': [
-    'Off to Sales? Go next door first, to the data',
-    'protection officer. She has something you',
-    'are going to need.',
-  ].join('\n'),
   'talk.intern-sales-start': [
     'Sales? At the end of the corridor to the east.',
     'They no longer type their offers themselves.',
```

- [x] **Step 4: Run** `npm run check` — 1610 unit tests.

- [x] **Step 5: Commit** — `Remove the page that handed the lamp over and the hint that sent
  for it`.

---

### Task 4: The documents

**Files:**
- Modify: `docs/spec/vision.md`, `docs/spec/world.md`, `docs/spec/gameplay.md`,
  `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md`

The diffs are against the branch as it stands before Task 1. If a line has moved, put the
text where the diff means it; do not change the words without a reason.

- [x] **Step 1: `vision.md`** §4 and §10:

```diff
--- a/docs/spec/vision.md
+++ b/docs/spec/vision.md
@@ -61,7 +61,8 @@
 the managing director say one sentence each and are not on the map in the first act. The
 managing director stops the player at the reception, where the game begins: the floor has no
 room of the player's own, so nobody can stand in its door. The third page points next door, to
-the data protection officer, who hands the lamp over in the first talk.
+the data protection officer. Until feature 0039 she handed the lamp over in the first talk;
+since then the player has it from the first step, and she says what it is for.
 
 *As built* (feature 0034): while the game is unfinished, the story speaks once more after the
 last case there is — three pages, five seconds after it is solved. The evening, and nobody got
@@ -233,7 +234,7 @@
 card has no line about Harmonic; one is added if the person who checks the release asks for it.
 
 The three voices, each on one page of talk. The data protection officer, on the third page of
-her own talk, once the lamp is handed over: `Die Lampe hast nur du. Etwas wie Harmonic würde
+her talk: `Die Lampe hast nur du. Etwas wie Harmonic würde
 dem Haus zeigen, welche KI hier läuft und wohin die Daten gehen.` The colleague of Sales, on
 the page after the case: `Hätte mir etwas wie Harmonic vorher gezeigt, wohin der Text geht –
 ich hätte es gelassen.` The management, on the second page of the close: `Mit Harmonic hätten
```

- [x] **Step 2: `world.md`** §3:

```diff
--- a/docs/spec/world.md
+++ b/docs/spec/world.md
@@ -226,6 +226,8 @@
   and then `Nimm die Lampe: …` — three sentences in all — and the press that closes it hands
   the lamp over. From then on she says the two pages of 0017 and, since feature 0036, a third
   that names Harmonic (`vision.md` §10).
+  Feature 0039 takes the first meeting out again: the player has the lamp from the first step,
+  and she says her three pages from the first talk. Nothing in the game needs the visit.
 - **The vendor.** See `vision.md` §4. Recurring in every department, never an enemy, changing
   over the game from seller to advisor. As advisor he supplies the approved alternatives that
   solve the later cases. They are fictional products; Harmonic is not his (`vision.md` §10).
@@ -234,9 +236,9 @@
   without a walkthrough, this matters more than it sounds.
   *As built* (feature 0033): he stands, until the art pass gives him a chair — in the middle
   of tile (38, 30), four tiles below the counter of the break room, in a blue shirt. He says one
-  page, picked from how far the player has come: before the lamp, that the data protection
-  officer has something; per case where the room is, what to look at, and whom to ask; and at
-  the end that he knows no more. The cases are asked in their order, Sales first, whatever the
+  page, picked from how far the player has come: per case where the room is, what to look at,
+  and whom to ask; and at the end that he knows no more. Until feature 0039 he had a page
+  before the lamp, which sent the player to the data protection officer. The cases are asked in their order, Sales first, whatever the
   player has begun. He does not see the shadow and never speaks of it: he speaks of rooms,
   screens, the printer and shirts. Nothing is shown unasked — no arrow, no marker.
 - **The works council.** Not a global character but part of the HR case. Nothing moves there
```

- [x] **Step 3: `gameplay.md`** §2 and §8:

```diff
--- a/docs/spec/gameplay.md
+++ b/docs/spec/gameplay.md
@@ -42,6 +42,12 @@
 the bottom says `Die Lampe: Leertaste halten.`, until the lamp is held once; it does not come
 back.
 
+**As built** (feature 0039): the player has the lamp from the first step, and nobody hands it
+over. Space shines as soon as the call is closed; while the card is shown or the call is open
+it does nothing, as every key but E. The line `Die Lampe: Leertaste halten.` stands at the
+bottom from the end of the call until the lamp is held once, and does not come back. A figure
+that falls into the dark wakes with the lamp.
+
 **As built** (feature 0008): a creature whose body is in the cone, with no solid tile between it
 and the figure, freezes. After one second of unbroken light — 60 steps, *tune* — it is captured
 and gone. A break starts the second again. Solid tiles block the light: walls, and fences and
@@ -336,6 +342,11 @@
 this feature, the one that compares Harmonic with the lamp; the first meeting keeps its two
 pages, so she says it only once the lamp is handed over.
 
+**As built** (feature 0039): there is no first meeting. The data protection officer says her
+three pages from the first talk, and closing them changes nothing. A press of E with Space
+held opens no dialogue, from the first step of a game: the keys mean the same everywhere. The
+intern's first hint is where Sales is; his page that sent the player for the lamp is gone.
+
 **As built** (feature 0027): E and Enter also take a coffee at a coffee machine (§4). A
 colleague or a figure in reach comes first: then the press opens the dialogue. The press does
 nothing at a machine while the lamp is held or the figure is being pushed. The help still lists
```

- [x] **Step 4: `architecture.md`** §2, §4, §5 and §8:

```diff
--- a/docs/spec/architecture.md
+++ b/docs/spec/architecture.md
@@ -140,10 +140,10 @@
 types and constants only.
 
 There are two starts (feature 0026). `createInitialState(map)` is a game **past its opening**:
-no dialogue open, the lamp owned and used. The tests of the earlier features step
+no dialogue open, the lamp used. The tests of the earlier features step
 from it. `newGame(map)` is what a player gets, and what `main.ts` starts with: the same state
 with `dialogue` `{ speaker: 'story', index: 0, page: 0 }` — the call on its first page —,
-`lamp` `{ on: false, strength: 1, owned: false, used: false }` and, since feature 0036,
+`lamp` `{ on: false, strength: 1, used: false }` — the lamp not yet used — and, since feature 0036,
 `presented` `null`: the card is shown.
 
 `presented` is the tick of the step in which the card ended, or `null` while it is shown
@@ -159,13 +159,11 @@
 The state does not record when the opening ended. Feature 0026 kept that as `started`, for the
 start hint of the help alone; feature 0031 took the hint and the field away.
 
-`lamp` is `{ on, strength, owned, used }` (features 0007, 0014, 0026): `owned` says whether the
-player has the lamp, and `used` whether it was on in any step since — `false` after the first
-meeting, `true` from the first step in which `on` is `true`, and never `false` again. While the
-lamp is not owned, the input's `lamp` counts as not held everywhere in `update`: `on` stays
-`false`, `stepPlayer` gets the input without it, so the figure walks, and a press of `talk`
-opens a dialogue with the key held. `held` still remembers the input as it came. The wake keeps
-`owned` and `used`. `on` is true in every step whose input holds `lamp` once the lamp is owned,
+`lamp` is `{ on, strength, used }` (features 0007, 0014, 0026, 0039): `used` says whether the
+lamp was on in any step of the game — `false` in a new game, `true` from the first step in
+which `on` is `true`, and never `false` again. The player has the lamp from the first step:
+feature 0039 took the field `owned` out of the state, and with it every rule that asked for
+it. The wake keeps `used`. `on` is true in every step whose input holds `lamp`,
 derived from the input and kept in the state so the renderer knows what to draw; `strength` is
 `BASE_STRENGTH`, 1, from `createInitialState` on, and no step changes it before the upgrades of
 M6 — the wake keeps it. A later field, charge (M6), joins them. While it is on, `stepPlayer` keeps the feet where they are, resets
@@ -337,23 +335,22 @@
 game, and the wake keeps it. Whether the close is due is derived in every step and is not in
 the state.
 
-The **first meeting** (feature 0026) is data of `game/cast`: `FIRST_MEETING` names the figure
-that hands the lamp over, `officer`, and its pages, `talk.officer-rules-1` and
-`talk.officer-meeting-2`. While the lamp is not owned, `figuresIn(figures, owned)` gives that
-figure the meeting's pages instead of its own; `update` and the scene both build the speakers
-from it, so the box shows the pages the dialogue has. Her own pages are three since feature
-0036: `talk.officer-rules-3` names Harmonic, and the meeting's pages do not.
+The **first meeting** of feature 0026 — `FIRST_MEETING`, `figuresIn` and `isFirstMeeting` in
+`game/cast` — is gone since feature 0039: every figure says its own pages from the first
+talk, and `update` and the scene build the speakers from `figuresOf` and the hint alone. The
+data protection officer's pages are three since feature 0036: `talk.officer-rules-3` names
+Harmonic.
 
 The **hints** (feature 0033) are data and one rule of `game/hints`. `HINT_FIGURE` names the
 figure that says them, `intern`; `HINTS` holds per case — by its region — three pages, `start`,
-`traces` and `source`; `HINT_LAMP` and `HINT_DONE` are the page before the lamp and the page
-after the last case. `hintOf(lampOwned, progress)` picks one: without the lamp `HINT_LAMP`;
-else the first case of `CASES` that is not solved decides — `start` while no trace of its
+`traces` and `source`; `HINT_DONE` is the page after the last case. `hintOf(progress)` picks
+one (since feature 0039 it no longer asks for the lamp, and `HINT_LAMP` is gone): the first
+case of `CASES` that is not solved decides — `start` while no trace of its
 region is found, `traces` while some are and not all, `source` once it is ready (`isReady`);
 with every case solved `HINT_DONE`. Since feature 0037 `HINTS` holds the three pages of Support
 too, and the cases are asked in the order Sales, Marketing, Support.
 `withHint(figures, hint)` gives `HINT_FIGURE` that one page
-instead of its own, after `figuresIn`; `update` and the scene both do it, so the box shows the
+instead of its own; `update` and the scene both do it, so the box shows the
 page the dialogue has. The hint is derived on every call and is not in the state; a talk with
 the intern changes what a talk changes and nothing more. `CAST` holds the intern as its second
 member, with the page of the lamp as the page he has before anything is known.
@@ -412,15 +409,13 @@
 change, and a creature at home outside the region stays. The step changes
 `tick`, `held`, `dialogue`, `solved`, `overview`, `shadowWalls` and `creatures` and nothing
 else; no other step solves a case, and a solved case is not solved again. The wake brings back
-only the creatures still in `creatures`, so none that left this way. One more closing changes
-something (feature 0026): the step that closes the first meeting
-(`isFirstMeeting`: the lamp is not owned, and the speaker is the figure of `FIRST_MEETING`) sets
-`lamp.owned` to `true` and leaves `lamp.used` `false`. Closing any other dialogue changes
-neither. **Ordinary:** otherwise, a press of `journal` opens the journal on `creatures`, whatever else
+only the creatures still in `creatures`, so none that left this way. Closing any other
+dialogue of a figure or a colleague changes nothing more: since feature 0039 no talk hands
+anything over. **Ordinary:** otherwise, a press of `journal` opens the journal on `creatures`, whatever else
 the input holds: `tick` grows by 1, `held` is set, and nothing else changes in this step — a
 figure in mid-step, a push and a lamp that is on stay as they are and go on when it closes
 (`openJournal`). This comes before a press of `talk` is looked at. Otherwise a press of `talk` while the input does not
-hold `lamp` — or the player has no lamp to hold (feature 0026) —, the player is not pushed and a speaker stands at most 40 px (`TALK_DISTANCE`) from
+hold `lamp`, the player is not pushed and a speaker stands at most 40 px (`TALK_DISTANCE`) from
 the player's feet and in sight opens a dialogue with the nearest one — the first in the speakers'
 order of two equally near — on page 0, and nothing else is stepped. In sight (`inSight`) is the
 lamp's `sightBlocked` between the centres of the two boxes, (x, y − 4) of each, against the opaque
@@ -533,8 +528,8 @@
 before the content has loaded the key does nothing. The game still gets its eight actions.
 
 The input is what the keys say, not what the player can do with them: `lamp` is on while Space
-is held also before the player has the lamp (feature 0026). `update` is the place that knows
-the lamp is not owned and counts the action as not held; `held` keeps the input as it came.
+is held, also while the card is shown or a dialogue is open. `update` is the place that knows
+whose step it is; `held` keeps the input as it came.
 
 ## 5. The renderer interface
 
@@ -689,7 +684,7 @@
 is open the dialogue box is drawn in the notice's place, on the surface and not shifted by the
 camera, and no notice is drawn. The page is the speaker's (feature 0018) or the scene's (feature
 0026): the scene finds it with `pagesOf` among the speakers of the frame — built with
-`progressOf(state, map)` (feature 0024) and `figuresIn(figures, lamp.owned)` (feature 0026), as
+`progressOf(state, map)` (feature 0024) and the hint of the moment (feature 0033), as
 in `update` — and draws no box when neither the map nor the story has it.
 The box is a rectangle (8, 134, 304, 42) in `#181425` — the notice's bar
 grown upwards to three lines, with the same bottom edge —, the page's lines left-aligned from
@@ -1250,9 +1245,10 @@
 the player has it — `notice.upgrade-wide-cone` (0029, `NOTICE_UPGRADE`); otherwise, for two
 seconds from the last find of a trace, `notice.trace-found` (0022); otherwise, for two seconds
 (`REST_NOTICE_STEPS`, 120) from a press at a rest, the line of its result — `notice.rest`,
-`notice.rest-full` or `notice.rest-shadow` (0027, `NOTICE_REST`); otherwise, while the lamp is
-owned and was never on, `notice.lamp`, the line that names its key (0026) — it has no time and
-does not come back; otherwise there is none.
+`notice.rest-full` or `notice.rest-shadow` (0027, `NOTICE_REST`); otherwise, while the lamp
+was never on, `notice.lamp`, the line that names its key (0026) — in a new game from its first
+step (0039), drawn once the call is closed; it has no time and does not come back; otherwise
+there is none.
 The state has no field for it (INV-1). A notice stays one line.
 
 The language is a setting of the player (feature 0019), not a fact of the game. `main.ts` holds
@@ -1306,8 +1302,9 @@
 test of that rule covers both kinds. `game/story` names the pages by key in `SCENES`. The close
 (feature 0034) adds three pages of the kind, `story.close-1` to `story.close-3`; none of them
 holds a number.
-`talk.officer-meeting-2` is the page of the first meeting that hands the lamp over, named in
-`FIRST_MEETING`; `notice.lamp` is a notice.
+`notice.lamp` is a notice. Feature 0039 took two keys out of both tables:
+`talk.officer-meeting-2`, the page that handed the lamp over, and `talk.intern-lamp`, the hint
+that sent the player for it.
 
 ## 9. Tooling
 
```

- [x] **Step 5: `testing.md`** §2:

```diff
--- a/docs/spec/testing.md
+++ b/docs/spec/testing.md
@@ -19,7 +19,7 @@
 
 | Invariant | Test |
 |---|---|
-| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the first meeting (0026); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the wider cone earned, by hand and by solving the case of Marketing (0029); the initial state, one with the close open and one after it (0034); a new game with the card shown, one in the middle of it and one after it (0036); the initial state and one with the help open (0021) |
+| INV-1 plain state | `JSON.parse(JSON.stringify(state))` deep-equals a populated `GameState` whose player has walked and whose lamp is on, and one with a frozen creature and a captured count of 1, one in the middle of a push and one at step 30 of the dark; the initial state with a standing figure, and one with a dialogue open on page 1 (0017); one with a colleague speaking, on maps built in the test and on `talkers.tmj` (0018); the initial state and one with the journal open on the cases (0020); the initial state on `traces.tmj` and one with a trace found (0022); the initial state and one with the case of Sales solved, on a map built in the test and on `case.tmj` (0024); one in the middle of a clearing, 60 steps after the case was solved (0025); a new game, one with the call on its last page and one after the call (0026, 0039); the initial state on `rests.tmj` and one after a coffee (0027); the initial state and one with the wider cone earned, by hand and by solving the case of Marketing (0029); the initial state, one with the close open and one after it (0034); a new game with the card shown, one in the middle of it and one after it (0036); the initial state and one with the help open (0021) |
 | INV-2 no browser in `game/` | `tests/arch/` fails on any import of `render/` or any occurrence of `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` in `src/game/`, and on the type `Language` there — the game does not know the language (0019) |
 | INV-3 fixed step | loop tests: 16.7 ms elapsed yields one step, 100 ms yields five and drops the rest, 8 ms yields none and carries the remainder; frames alternating 16.5 and 16.8 ms yield exactly one step each, frames of 8.4 ms one every second frame, 17 ms is not snapped; the loop driver with a fake frame scheduler advances at most five steps after a ten-second gap; the input is read once per frame and every step of the frame sees it |
 | INV-4 text through keys | the compiler, via `TextKey`: `drawText`, `textOf` and `textKey` are type-tested with `expectTypeOf` — a string is no `TextKey` and `textKey` accepts only the ids of the table (0016); unit tests that `de` and `en` have identical key sets and no empty string, that every character of both tables has a glyph in the font — line breaks skipped —, and that every notice fits the bar and has no line break; every page of the kind `talk` has at most three lines of at most 47 characters and no empty line, in both languages, and fits the dialogue box (0017); a tab's title of the journal is one line of at most 16 characters, a tab's line for nothing one line of at most 47, a species' name one line of at most 24, and a species' text two to four lines of at most 47 with no empty line, in both languages (0020); a region's name one line of at most 24, and `journal.traces` and `journal.of` one line of at most 16 each, in both languages, and `drawNumber` takes a number and nothing else (0022); a case's outcome is one line of at most 47 characters, and a policy block two to four lines of at most 47 with no empty line, in both languages (0024); a name of a key in the help is one line of at most 17 characters, and what it does one line of at most 16, in both languages (0021); a page of the story obeys the rule of a page of talk, in both languages (0026); each line of the card is one line that fits the surface, no other key of either table holds the presenter's name, and the name Harmonic is in three pages of talk and in no other key (0036); the scene tests draw the notice and a page in both languages, and the smoke test switches the language with `L` (0019) |
```

- [x] **Step 6: `README.md`:**

```diff
--- a/README.md
+++ b/README.md
@@ -47,8 +47,9 @@
 the case is solved, the journal records its outcome and the first block of the policy, and
 overview grows by one (feature 0024). In the same moment the room gets its colours back, its
 veil thins out over two seconds, and its shadow wall and the snippets that were left in it are
-gone (feature 0025). The game opens with the call — three pages of story — and without the
-lamp: the data protection officer next door hands it over in the first talk (feature 0026).
+gone (feature 0025). The game opens with the call — three pages of story (feature 0026). The
+player has the lamp from the first step: a line at the bottom names its key until it is held
+once, and the data protection officer next door says what it is for (feature 0039).
 A coffee at a coffee machine wins overview back — in the break room from the start, in a
 department once its case is solved (feature 0027). M6, the second act, has begun: Marketing
 has five traces of its own, on four screens and on the printer, and the colleague in the red
```

- [x] **Step 7:** `npm run check`, then commit — `Move the lamp from the start into the spec`.

---

### Task 5: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green: 20 passed, 3 skipped.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 5 in this file and commit —
  `Tick the full check of 0039`.

---

### Task 6: The acceptance walk

- [ ] **Step 1:** start the dev server as the spec's preconditions say (`npm run dev`), and tell
  the author in one message: the URL — **not to be loaded yet**, because the walk begins with
  loading the page —, a desktop browser, a window of at least 1280x720, and the keys of the
  spec's preconditions. Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–14 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 5, and start again at step 1.
- [ ] **Step 4:** after step 14 ask the three feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–14`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0039`. A feel note that wants something
  else — a sentence about where the lamp comes from, other words for the line, another key —
  becomes a new draft, not a change on this branch.

---

### Task 7: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 5. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`. In `docs/plan.md` §4, in the M6 section, the sentence about the
  seventh feature says that 0039 is approved; say that it is implemented, and that 0038 is
  the one still approved. Commit — `Mark 0039 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0039: the lamp from the start`, with the walk's result and feel notes in its
  description. CI must be green. The author merges.
