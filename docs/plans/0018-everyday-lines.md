# 0018 — Implementation plan: everyday lines

**Spec:** [`docs/features/0018-everyday-lines.md`](../features/0018-everyday-lines.md) (approved
2026-11-18). The plan argues from the spec; where they differ, the spec wins. Read the spec
first, then `CLAUDE.md`, then `docs/spec/architecture.md` §2, §5 and §8 and
`docs/spec/testing.md` §5. **Written:** 2026-11-18 on the planning model. A working document,
not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0017 is merged into `main` (`f05c576` or later). The branch
`feature/0018-everyday-lines` exists, cut from that `main`, and holds the drafts of 0018, 0019
and 0020, the approval of 0018 and this plan. Work on it; merge the latest `main` into it
before Task 1. The drafts of 0019 and 0020 travel with this branch and are **not** built here.

**Goal:** a press of `E` or `Enter` within 40 px and in sight of one of the four colleagues who
walk the floor stops it, turns the two to each other and shows its saying; the next press
closes the box and the colleague goes on its round.

**Approach:** five code tasks, each green on its own. The four sayings in the table (T1). The
colleagues' lines in the cast (T2). The rules — speakers, the reach of 40 px, in sight, a
dialogue that names its speaker — with the one line of the scene that looks the page up (T3).
Then the proof on a parsed fixture (T4) and on the floor (T5). Then the documents (T6), the
full check with the container (T7), the walk (T8) and the pull request (T9).

**How this plan was checked:** the code and the tests of Tasks 1 to 5 were run once as a
prototype on 2026-11-18, on `main` at `f05c576`: typecheck, Biome, the build and 868 unit
tests were green (829 before). The prototype was thrown away; nothing of it is on the branch.
If a step does not behave as written, the cause is a difference to that state — stop and
look; do not bend a test. The smoke spec and the container were **not** run with the
prototype.

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome. No new dependency.

## Global constraints

- Words: the **player** is the hero's figure (`PlayerState`); a **figure** is one of the
  standing cast; a **colleague** is a mover of the kind `person`; a **speaker** is a figure or
  a colleague whose route has lines.
- INV-1: `GameState.dialogue` stays plain data: `null` or `{ speaker, index, page }`. The
  speakers are **not** in the state and **not** cached: `update` and `drawScene` build them on
  every call with `speakersOf` from the map's points and the state's movers.
- INV-2: `src/game/talk.ts` and `src/game/cast.ts` import nothing from `src/render/` and use no
  DOM name. `talk.ts` may import `sightBlocked` from `src/engine/collision` — `game/creature`
  does the same.
- INV-4: the sayings live in `src/text/de.ts` and `src/text/en.ts` only; `cast.ts` holds keys.
- INV-7: no coordinate of a colleague appears in `src/`; a colleague's place is its mover's
  `x` and `y` in the state, its route is in the map.
- `src/game/mover.ts` is **not** changed. A colleague goes on after the dialogue because
  nothing but its `facing`, `frame` and `frameTimer` was changed at the opening.
- With a dialogue open, `update` returns the state with `tick`, `talkHeld` and `dialogue`
  changed and nothing else.
- In sight is tested against the map as loaded (`content`), not against the map with the
  shadow walls standing.
- No tile changes, no map changes, no new sprite, no change to `main.ts`.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox), ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Format with
  `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: `TALK_DISTANCE` 40 px (it was 24); the sight line runs
  from (x, y − 4) of the player to (x, y − 4) of the speaker's place, against the opaque
  boxes; a colleague stands while the player's feet are closer than 20 px (0015, unchanged); a
  saying is one page of at most 3 lines of at most 47 characters; the four routes are
  `person:reception`, `person:marketing`, `person:support`, `person:sales`.

## File structure

| File | Change |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` | four keys `talk.<room>-everyday` |
| `src/game/cast.ts` | `Colleague`, `COLLEAGUES`, `pagesOfRoute` |
| `src/game/state.ts` | `SPEAKER_KINDS`, `SpeakerKind`; `Dialogue` becomes `{ speaker, index, page }` |
| `src/game/talk.ts` | rewritten: `TALK_DISTANCE` 40, `Speaker`, `speakersOf`, `speakerOf`, `inSight`, `speakerInReach`; `openDialogue` and `stepDialogue` take speakers; `figureInReach` is gone |
| `src/game/update.ts` | builds the speakers once per step and passes them |
| `src/render/draw-scene.ts` | looks the page up through `speakerOf` |
| `tests/unit/text.test.ts`, `cast.test.ts`, `talk.test.ts`, `draw-scene.test.ts`, `state.test.ts`, `floor.test.ts` | as the tasks say |
| `tests/fixtures/maps/talkers.tmj` | new fixture |
| `docs/spec/*`, `README.md` | Task 6 |

---

### Task 1: The four sayings

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: the text ids `talk.reception-everyday`, `talk.marketing-everyday`,
  `talk.support-everyday`, `talk.sales-everyday`, in both languages.

- [x] **Step 1: Write the failing test.** Add one test to `tests/unit/text.test.ts`, before
  the page rule:

```diff
--- a/tests/unit/text.test.ts
+++ b/tests/unit/text.test.ts
@@ -63,6 +63,51 @@ describe('the language table (INV-4, 0016)', () => {
     ]);
   });
 
+  it('holds the four sayings of the colleagues in both languages (0018)', () => {
+    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
+      textOf(textKey(id), language).split('\n');
+    expect(lines('talk.reception-everyday', 'de')).toStrictEqual([
+      'Morgen! Heute haben schon drei Leute gefragt,',
+      'ob wir endlich ein WLAN für Gäste haben.',
+      'Ich sage dann immer: Frag die IT. Also dich.',
+    ]);
+    expect(lines('talk.reception-everyday', 'en')).toStrictEqual([
+      'Morning! Three people have asked already',
+      'whether we finally have a network for guests.',
+      'I always say: ask IT. So – you.',
+    ]);
+    expect(lines('talk.marketing-everyday', 'de')).toStrictEqual([
+      'Der Drucker druckt seit Montag alles doppelt.',
+      'Angeblich hat ihn jemand „optimiert“.',
+      'Ich hole trotzdem jedes Blatt einzeln ab.',
+    ]);
+    expect(lines('talk.marketing-everyday', 'en')).toStrictEqual([
+      'The printer has printed everything twice',
+      'since Monday. They say someone “optimised” it.',
+      'I still pick up every single sheet.',
+    ]);
+    expect(lines('talk.support-everyday', 'de')).toStrictEqual([
+      'Vierzig Tickets vor dem ersten Kaffee.',
+      'Die Hälfte davon in Sprachen, die hier',
+      'keiner spricht. Irgendwie geht es immer.',
+    ]);
+    expect(lines('talk.support-everyday', 'en')).toStrictEqual([
+      'Forty tickets before the first coffee.',
+      'Half of them in languages nobody here',
+      'speaks. Somehow it always works out.',
+    ]);
+    expect(lines('talk.sales-everyday', 'de')).toStrictEqual([
+      'Drei Angebote bis heute Abend, und jedes soll',
+      'klingen, als hätte ich eine Woche Zeit gehabt.',
+      'Erst mal Kaffee.',
+    ]);
+    expect(lines('talk.sales-everyday', 'en')).toStrictEqual([
+      'Three offers by tonight, and each one should',
+      'sound as if I had had a week for it.',
+      'Coffee first.',
+    ]);
+  });
+
   it('gives a page of talk at most three lines of at most 47 characters, none empty', () => {
     for (const language of LANGUAGES) {
       for (const [key, text] of Object.entries(TABLE[language])) {
```

- [x] **Step 2: Run it and see it fail.**

Run: `npx vitest run tests/unit/text.test.ts`
Expected: FAIL in the new test — the ids do not exist, so `textOf` returns `undefined`.
`npm run typecheck` also fails: the four ids are no `TextId`.

- [x] **Step 3: Add the strings.** The quotes in the Marketing saying are the typographic
  ones the font has: `„` and `“` in German, `“` and `”` in English. The dash is `–`.

```diff
--- a/src/text/de.ts
+++ b/src/text/de.ts
@@ -16,4 +16,24 @@ export const de = {
     'regt – nicht um es zu vertreiben, sondern um',
     'es zu verstehen.',
   ].join('\n'),
+  'talk.reception-everyday': [
+    'Morgen! Heute haben schon drei Leute gefragt,',
+    'ob wir endlich ein WLAN für Gäste haben.',
+    'Ich sage dann immer: Frag die IT. Also dich.',
+  ].join('\n'),
+  'talk.marketing-everyday': [
+    'Der Drucker druckt seit Montag alles doppelt.',
+    'Angeblich hat ihn jemand „optimiert“.',
+    'Ich hole trotzdem jedes Blatt einzeln ab.',
+  ].join('\n'),
+  'talk.support-everyday': [
+    'Vierzig Tickets vor dem ersten Kaffee.',
+    'Die Hälfte davon in Sprachen, die hier',
+    'keiner spricht. Irgendwie geht es immer.',
+  ].join('\n'),
+  'talk.sales-everyday': [
+    'Drei Angebote bis heute Abend, und jedes soll',
+    'klingen, als hätte ich eine Woche Zeit gehabt.',
+    'Erst mal Kaffee.',
+  ].join('\n'),
 } as const;
```

```diff
--- a/src/text/en.ts
+++ b/src/text/en.ts
@@ -12,4 +12,24 @@ export const en: Readonly<Record<keyof typeof de, string>> = {
     'The lamp holds still whatever stirs in it –',
     'not to drive it away, but to understand it.',
   ].join('\n'),
+  'talk.reception-everyday': [
+    'Morning! Three people have asked already',
+    'whether we finally have a network for guests.',
+    'I always say: ask IT. So – you.',
+  ].join('\n'),
+  'talk.marketing-everyday': [
+    'The printer has printed everything twice',
+    'since Monday. They say someone “optimised” it.',
+    'I still pick up every single sheet.',
+  ].join('\n'),
+  'talk.support-everyday': [
+    'Forty tickets before the first coffee.',
+    'Half of them in languages nobody here',
+    'speaks. Somehow it always works out.',
+  ].join('\n'),
+  'talk.sales-everyday': [
+    'Three offers by tonight, and each one should',
+    'sound as if I had had a week for it.',
+    'Coffee first.',
+  ].join('\n'),
 };
```

- [x] **Step 4: Run the tests.**

Run: `npx vitest run tests/unit/text.test.ts tests/unit/font.test.ts tests/unit/draw-scene.test.ts`
Expected: PASS. The glyph test, the page rule (three lines, 47 characters) and the box test
of 0017 cover the new pages without a change.

- [x] **Step 5:** `npm run check`, then commit — `Give the four colleagues their sayings`.

---

### Task 2: The colleagues' lines in the cast

**Files:**
- Modify: `src/game/cast.ts`
- Test: `tests/unit/cast.test.ts`

**Interfaces:**
- Consumes: the four text ids of Task 1.
- Produces: `interface Colleague { readonly route: string; readonly pages: readonly TextKey[] }`,
  `COLLEAGUES: readonly Colleague[]`,
  `pagesOfRoute(route: string, colleagues?: readonly Colleague[]): readonly TextKey[]` — an
  empty array for a route without lines.

- [x] **Step 1: Write the failing tests.**

```diff
--- a/tests/unit/cast.test.ts
+++ b/tests/unit/cast.test.ts
@@ -1,6 +1,14 @@
 import { describe, expect, it } from 'vitest';
 import type { NamedPoint } from '../../src/engine/tiled';
-import { CAST, type CastMember, figuresFrom, figuresOf, isFigurePoint } from '../../src/game/cast';
+import {
+  CAST,
+  type CastMember,
+  COLLEAGUES,
+  figuresFrom,
+  figuresOf,
+  isFigurePoint,
+  pagesOfRoute,
+} from '../../src/game/cast';
 import { creaturesFrom } from '../../src/game/creature';
 import { isRoutePoint, routesOf } from '../../src/game/mover';
 import { textKey } from '../../src/text/text';
@@ -90,3 +98,26 @@ describe('a figure point among the other points (0017)', () => {
     ]);
   });
 });
+
+describe('the colleagues and their lines (0018)', () => {
+  it('gives each of the four routes of the floor one saying of one page', () => {
+    expect(COLLEAGUES).toStrictEqual([
+      { route: 'person:reception', pages: [textKey('talk.reception-everyday')] },
+      { route: 'person:marketing', pages: [textKey('talk.marketing-everyday')] },
+      { route: 'person:support', pages: [textKey('talk.support-everyday')] },
+      { route: 'person:sales', pages: [textKey('talk.sales-everyday')] },
+    ]);
+  });
+
+  it('finds the pages of a route, and none for a route without lines', () => {
+    expect(pagesOfRoute('person:sales')).toStrictEqual([textKey('talk.sales-everyday')]);
+    expect(pagesOfRoute('person:hr')).toStrictEqual([]);
+    expect(pagesOfRoute('dog:reception')).toStrictEqual([]);
+  });
+
+  it('reads a table it is given: the game passes its own', () => {
+    const table = [{ route: 'person:hr', pages: [FIRST] }];
+    expect(pagesOfRoute('person:hr', table)).toStrictEqual([FIRST]);
+    expect(pagesOfRoute('person:sales', table)).toStrictEqual([]);
+  });
+});
```

- [x] **Step 2: Run them and see them fail.**

Run: `npx vitest run tests/unit/cast.test.ts`
Expected: FAIL — `COLLEAGUES` and `pagesOfRoute` are not exported.

- [x] **Step 3: Add the table and the lookup**, above `isFigurePoint`:

```diff
--- a/src/game/cast.ts
+++ b/src/game/cast.ts
@@ -26,6 +26,29 @@ export const CAST: readonly CastMember[] = [
   },
 ];
 
+/** The lines of a colleague who walks the floor (0018), by the name of its route. */
+export interface Colleague {
+  /** The route's name, `person:<room>`. */
+  readonly route: string;
+  /** What it says, page by page; at least one. */
+  readonly pages: readonly TextKey[];
+}
+
+export const COLLEAGUES: readonly Colleague[] = [
+  { route: 'person:reception', pages: [textKey('talk.reception-everyday')] },
+  { route: 'person:marketing', pages: [textKey('talk.marketing-everyday')] },
+  { route: 'person:support', pages: [textKey('talk.support-everyday')] },
+  { route: 'person:sales', pages: [textKey('talk.sales-everyday')] },
+];
+
+/** The pages of the colleague on a route; none when the route has no lines. */
+export function pagesOfRoute(
+  route: string,
+  colleagues: readonly Colleague[] = COLLEAGUES,
+): readonly TextKey[] {
+  return colleagues.find((colleague) => colleague.route === route)?.pages ?? [];
+}
+
 export function isFigurePoint(name: string): boolean {
   return name.startsWith(FIGURE_PREFIX);
 }
```

- [x] **Step 4: Run the tests.** `npx vitest run tests/unit/cast.test.ts` — PASS.

- [x] **Step 5:** `npm run check`, then commit — `Add the colleagues' lines to the cast`.

---

### Task 3: Speakers, reach and sight

The rules of the feature. The shape of `Dialogue` changes, so the state, `talk.ts`, `update.ts`,
the scene's page lookup and their tests change in one commit; no smaller cut compiles.

**Files:**
- Modify: `src/game/state.ts`, `src/game/talk.ts` (rewritten), `src/game/update.ts`,
  `src/render/draw-scene.ts`
- Test: `tests/unit/talk.test.ts` (rewritten), `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `COLLEAGUES`, `Colleague`, `pagesOfRoute`, `Figure` from `game/cast`; `Route` and
  `routesOf` from `game/mover`; `sightBlocked` from `engine/collision`; `BOX_HEIGHT` (8) from
  `game/player`.
- Produces, in `game/state`: `SPEAKER_KINDS`, `type SpeakerKind = 'figure' | 'mover'`,
  `interface Dialogue { speaker: SpeakerKind; index: number; page: number }`.
- Produces, in `game/talk`: `TALK_DISTANCE = 40`;
  `interface Speaker extends Point { speaker: SpeakerKind; index: number; pages: readonly TextKey[] }`;
  `speakersOf(figures, movers, routes, colleagues?): Speaker[]`;
  `speakerOf(dialogue, speakers): Speaker | undefined`;
  `inSight(player: Point, place: Point, map: TileMap): boolean`;
  `speakerInReach(player: Point, speakers, map): Speaker | null`;
  `openDialogue(state, input, speakers, map): GameState | null`;
  `stepDialogue(state, dialogue, input, speakers): GameState`.
  `talkPressed` and `facingToward` are unchanged. `figureInReach` is removed.

- [x] **Step 1: Replace `tests/unit/talk.test.ts`** with the file below. The tests of 0017
  stay, with three changes: the reach is 40 px, `figureInReach` became `speakerInReach`, and
  a dialogue is `{ speaker: 'figure', index, page }`. The tests of 0018 follow them.

```ts
import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import type { Colleague, Figure } from '../../src/game/cast';
import { routesOf } from '../../src/game/mover';
import type { GameInput } from '../../src/game/player';
import type { Facing, GameState, MoverState } from '../../src/game/state';
import {
  facingToward,
  inSight,
  openDialogue,
  type Speaker,
  speakerInReach,
  speakerOf,
  speakersOf,
  TALK_DISTANCE,
  talkPressed,
} from '../../src/game/talk';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE: GameInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  lamp: false,
  talk: false,
};
const TALK: GameInput = { ...NONE, talk: true };
const RIGHT: GameInput = { ...NONE, right: true };
const OFFICER: NamedPoint = { name: 'figure:officer', x: 160, y: 96 };
/** 20x12 cells of open floor with the officer at (160, 96) and the player at (x, y). */
const mapAt = (
  x: number,
  y: number,
  points: readonly NamedPoint[] = [OFFICER],
  rects: readonly NamedRect[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);
const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, map), start);
const figure = (x: number, y: number, id = 'officer'): Figure => ({
  id,
  x,
  y,
  pages: [textKey('talk.officer-rules-1')],
});

describe('the press of talk (0017)', () => {
  it('is seen in exactly one of 600 steps with the key held', () => {
    const map = mapAt(40, 40, []);
    let state = createInitialState(map);
    let presses = 0;
    for (let step = 0; step < 600; step += 1) {
      presses += talkPressed(state, TALK) ? 1 : 0;
      state = update(state, TALK, map);
    }
    expect(presses).toBe(1);
  });

  it('is seen again after a step without the key', () => {
    const map = mapAt(40, 40, []);
    const held = run(map, createInitialState(map), TALK, TALK);
    expect(talkPressed(held, TALK)).toBe(false);
    const released = update(held, NONE, map);
    expect(talkPressed(released, TALK)).toBe(true);
    expect(talkPressed(released, NONE)).toBe(false);
  });

  it('is not seen after the dark by a key held through it', () => {
    const map = mapAt(40, 40, []);
    const dark = update({ ...createInitialState(map), dark: 88 }, TALK, map);
    expect(dark.dark).toBe(89);
    expect(talkPressed(dark, TALK)).toBe(false);
  });
});

describe('who can be talked to (0017, 0018)', () => {
  it('is 40 px: across a counter', () => {
    expect(TALK_DISTANCE).toBe(40);
  });

  it('is the nearest figure within reach, the first of two equally near, none beyond', () => {
    const open = mapAt(0, 0, []);
    const speakers = speakersOf([figure(160, 96, 'a'), figure(240, 96, 'b')], [], []);
    const index = (x: number): number | undefined =>
      speakerInReach({ x, y: 96 }, speakers, open)?.index;
    expect(index(204)).toBe(1);
    expect(index(200)).toBe(0);
    expect(index(120)).toBe(0);
    expect(index(119.9)).toBeUndefined();
    expect(speakerInReach({ x: 184, y: 96 }, [], open)).toBeNull();
  });

  it('looks along the line to the other: sideways when that distance is the larger one', () => {
    const at = { x: 100, y: 100 };
    expect(facingToward(at, { x: 110, y: 104 }, 'up')).toBe('right');
    expect(facingToward(at, { x: 90, y: 104 }, 'up')).toBe('left');
    expect(facingToward(at, { x: 104, y: 110 }, 'up')).toBe('down');
    expect(facingToward(at, { x: 104, y: 90 }, 'down')).toBe('up');
    expect(facingToward(at, { x: 110, y: 110 }, 'up')).toBe('down');
    expect(facingToward(at, { x: 110, y: 90 }, 'down')).toBe('up');
    expect(facingToward(at, at, 'left')).toBe('left');
  });
});

describe('opening a dialogue (0017)', () => {
  it('opens on page 0 at 40 px: both turn, the player stands, the lamp is off, nothing moves', () => {
    const map = mapAt(200, 96);
    const start = createInitialState(map);
    const opened = update(start, TALK, map);
    expect(opened).toStrictEqual({
      ...start,
      tick: 1,
      talkHeld: true,
      player: { ...start.player, facing: 'left' },
      figures: [{ figure: 0, facing: 'right' }],
      dialogue: { speaker: 'figure', index: 0, page: 0 },
    });
  });

  it('does not open at 40.1 px: the step is an ordinary one', () => {
    const map = mapAt(200.1, 96);
    const next = update(createInitialState(map), TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.talkHeld).toBe(true);
    expect(next.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(next.player.facing).toBe('down');
  });

  it('does not open while the lamp is held', () => {
    const map = mapAt(184, 96);
    const next = update(createInitialState(map), { ...TALK, lamp: true }, map);
    expect(next.dialogue).toBeNull();
    expect(next.lamp.on).toBe(true);
  });

  it('does not open during a push, and not after it by the key still held', () => {
    const map = mapAt(184, 96);
    const start = createInitialState(map);
    const pushed: GameState = {
      ...start,
      player: { ...start.player, recoil: { dx: -3, dy: 0, steps: 1 } },
    };
    const next = update(pushed, TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.player.x).toBe(181);
    expect(update(next, TALK, map).dialogue).toBeNull();
    expect(run(map, next, NONE, TALK).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 0,
    });
  });

  it.each<readonly [number, number, Facing, Facing]>([
    [184, 96, 'left', 'right'],
    [136, 96, 'right', 'left'],
    [160, 120, 'up', 'down'],
    [160, 72, 'down', 'up'],
    [178, 110, 'left', 'right'],
    [160, 96, 'down', 'down'],
  ])('from (%d, %d) the player looks %s and she looks %s', (x, y, player, officer) => {
    const map = mapAt(x, y);
    const opened = update(createInitialState(map), TALK, map);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(opened.player.facing).toBe(player);
    expect(opened.figures).toStrictEqual([{ figure: 0, facing: officer }]);
  });

  it('stands a walking player still: phase 0, timer 0', () => {
    const map = mapAt(170, 96);
    const walking = run(map, createInitialState(map), RIGHT, RIGHT, RIGHT);
    expect(walking.player.frame).toBe(1);
    const opened = update(walking, TALK, map);
    expect([opened.player.frame, opened.player.frameTimer]).toStrictEqual([0, 0]);
    expect(opened.player.x).toBe(walking.player.x);
  });

  it('turns only the figure that speaks', () => {
    const map = mapAt(184, 96);
    const state: GameState = {
      ...createInitialState(map),
      figures: [
        { figure: 0, facing: 'down' },
        { figure: 1, facing: 'down' },
      ],
    };
    const speakers = speakersOf([figure(160, 96, 'a'), figure(200, 96, 'b')], [], []);
    const opened = openDialogue(state, TALK, speakers, map);
    expect(opened?.dialogue).toStrictEqual({ speaker: 'figure', index: 1, page: 0 });
    expect(opened?.figures).toStrictEqual([
      { figure: 0, facing: 'down' },
      { figure: 1, facing: 'left' },
    ]);
    expect(opened?.player.facing).toBe('right');
  });
});

describe('the pages of a dialogue (0017)', () => {
  const map = mapAt(184, 96);
  const opened = update(createInitialState(map), TALK, map);

  it('stays on its page while the key is held, and turns with the next press', () => {
    expect(run(map, opened, TALK, TALK).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 0,
    });
    const released = update(opened, NONE, map);
    expect(released.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(released.talkHeld).toBe(false);
    expect(update(released, TALK, map).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 1,
    });
  });

  it('closes with a press on the last page; she keeps her facing; the next step is an ordinary one', () => {
    const closed = run(map, opened, NONE, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.tick).toBe(5);
    expect(closed.figures).toStrictEqual([{ figure: 0, facing: 'right' }]);
    expect(closed.player.x).toBe(184);
    const walked = run(map, closed, NONE, RIGHT);
    expect(walked.player.x).toBeCloseTo(184 + 80 / 60, 6);
  });

  it('survives a JSON round trip on page 1 (INV-1)', () => {
    const second = run(map, opened, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 1 });
    expect(JSON.parse(JSON.stringify(second))).toStrictEqual(second);
  });
});

describe('the world while a dialogue is open (0017)', () => {
  /** A snippet 30 px from the player, a dog on its route and a wall that was giving way. */
  const map = mapAt(
    184,
    96,
    [
      OFFICER,
      { name: 'snippet', x: 214, y: 96 },
      { name: 'dog:hr:1', x: 40, y: 152 },
      { name: 'dog:hr:2', x: 104, y: 152 },
    ],
    [{ name: 'shadow:marketing', x: 128, y: 160, width: 48, height: 4 }],
  );
  const start: GameState = {
    ...createInitialState(map),
    shadowWalls: [{ wall: 0, lit: true, light: 30 }],
  };
  const ALL_BUT_TALK: GameInput = {
    up: true,
    down: true,
    left: true,
    right: true,
    lamp: true,
    talk: false,
  };

  it('is not stepped in the step that opens it', () => {
    const opened = update(start, TALK, map);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(opened.creatures).toStrictEqual(start.creatures);
    expect(opened.movers).toStrictEqual(start.movers);
    expect(opened.shadowWalls).toStrictEqual(start.shadowWalls);
  });

  it('stands still for 600 steps with every other key held: only the tick grows', () => {
    const opened = update(start, TALK, map);
    let state = opened;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, ALL_BUT_TALK, map);
    }
    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, talkHeld: false });
  });

  it('moves again once it is closed', () => {
    const opened = update(start, TALK, map);
    const closed = run(map, opened, NONE, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    const later = run(map, closed, NONE, NONE);
    expect(later.creatures[0]?.x).toBeLessThan(214);
    expect(later.movers).not.toStrictEqual(closed.movers);
  });
});

describe('a game without figures (0017)', () => {
  it('steps as before when talk is never held: 600 recorded steps', () => {
    const withFigure = mapAt(40, 152, [OFFICER, { name: 'snippet', x: 200, y: 152 }]);
    const without = mapAt(40, 152, [{ name: 'snippet', x: 200, y: 152 }]);
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
      talk: false,
    }));
    let a = createInitialState(withFigure);
    let b = createInitialState(without);
    for (const input of inputs) {
      a = update(a, input, withFigure);
      b = update(b, input, without);
    }
    expect({ ...a, figures: [] }).toStrictEqual(b);
  });
});

/** A colleague with lines: a route of two points, 64 px apart, with ten seconds on the first. */
const WALKER: readonly NamedPoint[] = [
  { name: 'person:reception:1', x: 64, y: 48, pause: 600 },
  { name: 'person:reception:2', x: 128, y: 48 },
];
const SAYING = textKey('talk.reception-everyday');
/** The state of `map` with its first mover changed. */
const withMover = (map: TileMap, fields: Partial<MoverState>): GameState => {
  const start = createInitialState(map);
  return {
    ...start,
    movers: start.movers.map((mover, i) => (i === 0 ? { ...mover, ...fields } : mover)),
  };
};
const MOVER_TALK = { speaker: 'mover', index: 0, page: 0 } as const;

describe('the speakers of a step (0018)', () => {
  const routes = routesOf([
    ...WALKER,
    { name: 'dog:reception:1', x: 40, y: 152 },
    { name: 'dog:reception:2', x: 104, y: 152 },
    { name: 'person:hr:1', x: 200, y: 152 },
    { name: 'person:hr:2', x: 264, y: 152 },
  ]);
  const movers = createInitialState(
    mapAt(300, 20, [
      ...WALKER,
      { name: 'dog:reception:1', x: 40, y: 152 },
      { name: 'dog:reception:2', x: 104, y: 152 },
      { name: 'person:hr:1', x: 200, y: 152 },
      { name: 'person:hr:2', x: 264, y: 152 },
    ]),
  ).movers;

  it('are the standing figures, then the colleagues whose route has lines', () => {
    expect(movers.map((mover) => mover.kind)).toStrictEqual(['person', 'dog', 'person']);
    expect(speakersOf([figure(160, 96)], movers, routes)).toStrictEqual([
      { speaker: 'figure', index: 0, x: 160, y: 96, pages: [textKey('talk.officer-rules-1')] },
      { speaker: 'mover', index: 0, x: 64, y: 48, pages: [SAYING] },
    ]);
  });

  it('take a colleague where it is in the state, not where its route starts', () => {
    const moved = movers.map((mover, i) => (i === 0 ? { ...mover, x: 90.5, y: 48 } : mover));
    expect(speakersOf([], moved, routes)).toStrictEqual([
      { speaker: 'mover', index: 0, x: 90.5, y: 48, pages: [SAYING] },
    ]);
  });

  it('read the lines from the table they are given: the game passes its own', () => {
    const table: readonly Colleague[] = [{ route: 'person:hr', pages: [SAYING] }];
    expect(speakersOf([], movers, routes, table)).toStrictEqual([
      { speaker: 'mover', index: 2, x: 200, y: 152, pages: [SAYING] },
    ]);
    expect(speakersOf([], movers, routes, [])).toStrictEqual([]);
  });

  it('find the speaker of a dialogue by its kind and its index', () => {
    const speakers = speakersOf([figure(160, 96)], movers, routes);
    expect(speakerOf({ speaker: 'mover', index: 0, page: 0 }, speakers)?.pages).toStrictEqual([
      SAYING,
    ]);
    expect(speakerOf({ speaker: 'figure', index: 0, page: 0 }, speakers)?.x).toBe(160);
    expect(speakerOf({ speaker: 'mover', index: 1, page: 0 }, speakers)).toBeUndefined();
  });
});

describe('in sight (0018)', () => {
  /** A box 4 px wide in cell (10, 5), on the line between the officer and (184, 96). */
  const BOX = { x: 170, y: 80, width: 4, height: 16 };
  const boxed = (map: TileMap, ...layers: readonly ('solids' | 'opaque')[]): TileMap => {
    const cells = (layer: 'solids' | 'opaque') =>
      map[layer].map((boxes, cell) => (cell === 5 * map.width + 10 ? [BOX] : boxes));
    return {
      ...map,
      solids: layers.includes('solids') ? cells('solids') : map.solids,
      opaque: layers.includes('opaque') ? cells('opaque') : map.opaque,
    };
  };

  it('is the line between the two box centres against the opaque boxes', () => {
    const open = mapAt(184, 96);
    expect(inSight({ x: 184, y: 96 }, { x: 160, y: 96 }, open)).toBe(true);
    expect(inSight({ x: 184, y: 96 }, { x: 160, y: 96 }, boxed(open, 'solids'))).toBe(true);
    expect(inSight({ x: 184, y: 96 }, { x: 160, y: 96 }, boxed(open, 'opaque'))).toBe(false);
    // Below the box the line is free again.
    expect(inSight({ x: 184, y: 104 }, { x: 160, y: 104 }, boxed(open, 'opaque'))).toBe(true);
  });

  it('opens no dialogue through a wall at 24 px: the step is an ordinary one', () => {
    const map = boxed(mapAt(184, 96), 'solids', 'opaque');
    const next = update(createInitialState(map), TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.talkHeld).toBe(true);
    expect(next.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
  });

  it('opens the dialogue across a box that is solid and not opaque', () => {
    const map = boxed(mapAt(184, 96), 'solids');
    expect(update(createInitialState(map), TALK, map).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 0,
    });
  });

  it('passes over a nearer speaker behind a wall for a farther one in sight', () => {
    const map = boxed(mapAt(184, 96), 'opaque');
    const speakers = speakersOf([figure(160, 96, 'a'), figure(214, 96, 'b')], [], []);
    expect(speakerInReach({ x: 184, y: 96 }, speakers, map)?.index).toBe(1);
  });
});

describe('talking to a colleague (0018)', () => {
  it('opens with a colleague that waits: it turns, the player turns, nothing else changes', () => {
    const map = mapAt(104, 48, WALKER);
    const start = createInitialState(map);
    expect(start.movers[0]).toMatchObject({ kind: 'person', x: 64, y: 48, wait: 600, target: 1 });
    const opened = update(start, TALK, map);
    expect(opened).toStrictEqual({
      ...start,
      tick: 1,
      talkHeld: true,
      player: { ...start.player, facing: 'left' },
      movers: [{ ...start.movers[0], facing: 'right' }],
      dialogue: MOVER_TALK,
    });
  });

  it.each<readonly [number, number, Facing, Facing]>([
    [104, 48, 'left', 'right'],
    [24, 48, 'right', 'left'],
    [64, 88, 'up', 'down'],
    [64, 8, 'down', 'up'],
    [90, 68, 'left', 'right'],
  ])('from (%d, %d) the player looks %s and the colleague looks %s', (x, y, player, colleague) => {
    const map = mapAt(x, y, WALKER);
    const opened = update(createInitialState(map), TALK, map);
    expect(opened.dialogue).toStrictEqual(MOVER_TALK);
    expect(opened.player.facing).toBe(player);
    expect(opened.movers[0]?.facing).toBe(colleague);
  });

  it('stands a colleague still that was on a leg: frame 0, timer 0, its place and its target kept', () => {
    const map = mapAt(90, 80, WALKER);
    const walking = withMover(map, { x: 90, facing: 'right', frame: 3, frameTimer: 7, wait: 0 });
    const opened = update(walking, TALK, map);
    expect(opened.dialogue).toStrictEqual(MOVER_TALK);
    expect(opened.movers[0]).toStrictEqual({
      ...walking.movers[0],
      facing: 'down',
      frame: 0,
      frameTimer: 0,
    });
    expect(opened.player.facing).toBe('up');
  });

  it('does not open at 40.1 px', () => {
    const map = mapAt(104.1, 48, WALKER);
    expect(update(createInitialState(map), TALK, map).dialogue).toBeNull();
  });

  it('opens nothing next to a person without lines or next to a dog', () => {
    const silent = mapAt(74, 48, [
      { name: 'person:hr:1', x: 64, y: 48, pause: 600 },
      { name: 'person:hr:2', x: 128, y: 48 },
    ]);
    const next = update(createInitialState(silent), TALK, silent);
    expect(next.dialogue).toBeNull();
    expect(next.talkHeld).toBe(true);
    const dog = mapAt(74, 48, [
      { name: 'dog:reception:1', x: 64, y: 48, pause: 600 },
      { name: 'dog:reception:2', x: 128, y: 48 },
    ]);
    expect(update(createInitialState(dog), TALK, dog).dialogue).toBeNull();
  });

  it('speaks to the nearer of two, a figure before a colleague, the earlier of two colleagues', () => {
    const open = mapAt(0, 0, []);
    const at = (speaker: Speaker['speaker'], index: number, x: number): Speaker => ({
      speaker,
      index,
      x,
      y: 96,
      pages: [SAYING],
    });
    const mixed = [at('figure', 0, 160), at('mover', 3, 200)];
    const chosen = (x: number, speakers: readonly Speaker[]) => {
      const speaker = speakerInReach({ x, y: 96 }, speakers, open);
      return speaker === null ? null : [speaker.speaker, speaker.index];
    };
    expect(chosen(190, mixed)).toStrictEqual(['mover', 3]);
    expect(chosen(170, mixed)).toStrictEqual(['figure', 0]);
    expect(chosen(180, mixed)).toStrictEqual(['figure', 0]);
    expect(chosen(180, [at('mover', 1, 160), at('mover', 2, 200)])).toStrictEqual(['mover', 1]);
    expect(chosen(180, [at('mover', 2, 200), at('mover', 1, 160)])).toStrictEqual(['mover', 2]);
  });
});

describe('a colleague during and after its saying (0018)', () => {
  const ALL_BUT_TALK: GameInput = {
    up: true,
    down: true,
    left: true,
    right: true,
    lamp: true,
    talk: false,
  };

  it('stands still for 600 steps with every other key held: only the tick grows', () => {
    const map = mapAt(
      104,
      48,
      [...WALKER, { name: 'snippet', x: 134, y: 48 }],
      [{ name: 'shadow:marketing', x: 128, y: 160, width: 48, height: 4 }],
    );
    const start: GameState = {
      ...withMover(map, { x: 70, facing: 'right', frame: 2, frameTimer: 3, wait: 0 }),
      shadowWalls: [{ wall: 0, lit: true, light: 30 }],
    };
    const opened = update(start, TALK, map);
    expect(opened.dialogue).toStrictEqual(MOVER_TALK);
    expect(opened.movers[0]).toStrictEqual({
      ...start.movers[0],
      facing: 'right',
      frame: 0,
      frameTimer: 0,
    });
    let state = opened;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, ALL_BUT_TALK, map);
    }
    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, talkHeld: false });
  });

  it('closes with the first press after the opening: a saying has one page', () => {
    const map = mapAt(104, 48, WALKER);
    const opened = update(createInitialState(map), TALK, map);
    expect(run(map, opened, TALK, TALK).dialogue).toStrictEqual(MOVER_TALK);
    const closed = run(map, opened, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.tick).toBe(3);
    expect(closed.movers).toStrictEqual(opened.movers);
  });

  it('stands on while the player is closer than 20 px, and keeps looking at where the player was', () => {
    const map = mapAt(83, 48, WALKER);
    const closed = run(map, withMover(map, { wait: 0 }), TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    const later = run(map, closed, NONE, NONE, NONE);
    expect(later.movers[0]).toStrictEqual({ ...closed.movers[0] });
    expect(later.movers[0]).toMatchObject({ x: 64, facing: 'right', frame: 0, wait: 0 });
  });

  it('waits what is left of its pause at 21 px, still looking at the player', () => {
    const map = mapAt(85, 48, WALKER);
    const closed = run(map, createInitialState(map), TALK, NONE, TALK);
    expect(closed.movers[0]).toMatchObject({ wait: 600, facing: 'right' });
    const later = run(map, closed, NONE, NONE, NONE);
    expect(later.movers[0]).toMatchObject({ x: 64, wait: 597, facing: 'right', frame: 0 });
  });

  it('takes the facing of its leg in the step in which it moves again', () => {
    const map = mapAt(64, 69, WALKER);
    const closed = run(map, withMover(map, { wait: 0 }), TALK, NONE, TALK);
    expect(closed.movers[0]).toMatchObject({ x: 64, facing: 'down', frame: 0 });
    const moved = update(closed, NONE, map);
    expect(moved.movers[0]?.facing).toBe('right');
    expect(moved.movers[0]?.frame).toBe(1);
    expect(moved.movers[0]?.x).toBeCloseTo(64 + 40 / 60, 6);
  });

  it('reaches its target after as many moving steps as without the talk', () => {
    const map = mapAt(64, 69, WALKER);
    const start = withMover(map, { wait: 0 });
    /** The step after which the colleague stands on its point 2, with the inputs given first. */
    const arrival = (...first: readonly GameInput[]): number => {
      let state = start;
      for (let step = 1; step <= 200; step += 1) {
        state = update(state, first[step - 1] ?? NONE, map);
        if (state.movers[0]?.x === 128) {
          return step;
        }
      }
      return -1;
    };
    const quiet = arrival();
    expect(quiet).toBe(96);
    const thirty = Array.from({ length: 30 }, () => NONE);
    // Thirty steps on the leg, then the press, a step without the key and the press that closes.
    expect(arrival(...thirty, TALK, NONE, TALK)).toBe(quiet + 3);
  });

  it('survives a JSON round trip with a colleague speaking (INV-1)', () => {
    const map = mapAt(104, 48, WALKER);
    const opened = update(createInitialState(map), TALK, map);
    expect(opened.dialogue).toStrictEqual(MOVER_TALK);
    expect(JSON.parse(JSON.stringify(opened))).toStrictEqual(opened);
  });
});

describe('a game without speakers (0018)', () => {
  it('steps as before when talk is never held: 600 recorded steps', () => {
    const points: readonly NamedPoint[] = [
      { name: 'snippet', x: 200, y: 152 },
      { name: 'dog:reception:1', x: 40, y: 40, pause: 60 },
      { name: 'dog:reception:2', x: 104, y: 40 },
    ];
    const withSpeakers = mapAt(40, 152, [OFFICER, ...points, ...WALKER]);
    const without = mapAt(40, 152, points);
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
      talk: false,
    }));
    let a = createInitialState(withSpeakers);
    let b = createInitialState(without);
    for (const input of inputs) {
      a = update(a, input, withSpeakers);
      b = update(b, input, without);
    }
    expect({
      ...a,
      figures: [],
      movers: a.movers.filter((mover) => mover.kind !== 'person'),
    }).toStrictEqual(b);
  });
});
```

- [x] **Step 2: Change the scene tests.** In `tests/unit/draw-scene.test.ts` the dialogue of
  the box tests gets its new shape, and two tests are added before "draws no box without a
  dialogue". The German saying of the reception has 108 characters that are not spaces, and
  its first is `M`, glyph 45.

```diff
--- a/tests/unit/draw-scene.test.ts
+++ b/tests/unit/draw-scene.test.ts
@@ -794,7 +794,7 @@ describe('the dialogue box in the scene (0017)', () => {
     ...state({ x: 20, y: 30 }),
     tick,
     figures: [{ figure: 0, facing: 'left' }],
-    dialogue: { figure: 0, page },
+    dialogue: { speaker: 'figure', index: 0, page },
     overview: { current: 1, max: 2 },
   });
   const BOX = 'fillRect 8,134 304x42 #181425';
@@ -867,6 +867,43 @@ describe('the dialogue box in the scene (0017)', () => {
     ]);
   });
 
+  it('draws the page of a colleague that speaks, and the colleague standing as it turned (0018)', () => {
+    const walking: SceneContent = {
+      ...CONTENT,
+      map: {
+        ...MAP,
+        points: [
+          { name: 'person:reception:1', x: 40, y: 20, pause: 600 },
+          { name: 'person:reception:2', x: 40, y: 28 },
+        ],
+      },
+    };
+    const renderer = recordingRenderer();
+    drawScene(
+      renderer,
+      {
+        ...state({ x: 20, y: 30 }),
+        movers: [mover({ kind: 'person', x: 40, y: 20, facing: 'left' })],
+        dialogue: { speaker: 'mover', index: 0, page: 0 },
+      },
+      walking,
+    );
+    const after = renderer.calls.slice(renderer.calls.indexOf(BOX) + 1);
+    expect(after[0]).toBe('drawSprite 45 at 12,138');
+    expect(spritesOn(renderer, walking.fontSheet)).toHaveLength(108);
+    expect(renderer.calls).toContain('drawSprite 10 at 32,-4');
+  });
+
+  it('draws no box for a dialogue whose speaker the map does not have', () => {
+    const renderer = recordingRenderer();
+    drawScene(
+      renderer,
+      { ...state({ x: 20, y: 30 }), dialogue: { speaker: 'mover', index: 0, page: 0 } },
+      CONTENT,
+    );
+    expect(renderer.calls).not.toContain(BOX);
+  });
+
   it('draws no box without a dialogue', () => {
     const renderer = recordingRenderer();
     drawScene(renderer, { ...talking(0), dialogue: null }, content);
```

- [x] **Step 3: Run and see them fail.**

Run: `npm run typecheck`
Expected: errors in both test files — `speakerInReach`, `speakersOf`, `speakerOf`, `inSight`
and `Speaker` are not exported, and `speaker` is no property of `Dialogue`.

- [x] **Step 4: Change the state.** In `src/game/state.ts`:

```diff
--- a/src/game/state.ts
+++ b/src/game/state.ts
@@ -99,10 +99,15 @@ export interface FigureState {
   readonly facing: Facing;
 }
 
-/** An open dialogue (0017). */
+/** Who speaks in a dialogue (0018): a standing figure of the cast, or a colleague on its round. */
+export const SPEAKER_KINDS = ['figure', 'mover'] as const;
+export type SpeakerKind = (typeof SPEAKER_KINDS)[number];
+
+/** An open dialogue (0017, 0018). */
 export interface Dialogue {
-  /** The index of the figure that speaks. */
-  readonly figure: number;
+  readonly speaker: SpeakerKind;
+  /** The index of the speaker in `GameState.figures` or in `GameState.movers`. */
+  readonly index: number;
   /** The page shown, from 0. */
   readonly page: number;
 }
```

- [x] **Step 5: Replace `src/game/talk.ts`** with:

```ts
import { sightBlocked } from '../engine/collision';
import type { Point, TileMap } from '../engine/tiled';
import type { TextKey } from '../text/text';
import { COLLEAGUES, type Colleague, type Figure, pagesOfRoute } from './cast';
import type { Route } from './mover';
import { BOX_HEIGHT, type GameInput } from './player';
import type { Dialogue, Facing, GameState, MoverState, SpeakerKind } from './state';

/**
 * Talking (gameplay.md §8, features 0017 and 0018). A press of `talk` near a speaker — a
 * standing figure, or a colleague on its round — opens a dialogue: the two turn to each other
 * and the speaker's first page is shown. A press turns to the next page; a press on the last
 * page closes the dialogue. While it is open nothing in the world is stepped — time passes,
 * and that is all. Pure data and pure functions.
 */

/** Tune: two and a half tiles between the feet of the two — across a counter (0018). */
export const TALK_DISTANCE = 40;

/**
 * Whether `talk` is pressed in this step: the input holds it and the last step's did not. The
 * keyboard keeps no press (architecture.md §4), so the state does, in `talkHeld`.
 */
export function talkPressed(state: GameState, input: GameInput): boolean {
  return input.talk && !state.talkHeld;
}

/**
 * Where one looks whose feet are at `from` when the other's are at `to`: left or right when
 * the horizontal distance is the larger one, up or down otherwise, and `current` when both
 * stand on the same spot.
 */
export function facingToward(from: Point, to: Point, current: Facing): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) {
    return current;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

/** Someone who can be spoken to, where it is in this step: the feet in map pixels. */
export interface Speaker extends Point {
  readonly speaker: SpeakerKind;
  /** The index in `GameState.figures` or in `GameState.movers`. */
  readonly index: number;
  readonly pages: readonly TextKey[];
}

/**
 * The speakers of a step (0018): the standing figures in the map's order, then the colleagues
 * — the movers of the kind `person` whose route has lines — in the order of the state's
 * movers. A person without lines, a dog, a vacuum and a drone are no speakers.
 */
export function speakersOf(
  figures: readonly Figure[],
  movers: readonly MoverState[],
  routes: readonly Route[],
  colleagues: readonly Colleague[] = COLLEAGUES,
): Speaker[] {
  const standing = figures.map(
    (figure, index): Speaker => ({
      speaker: 'figure',
      index,
      x: figure.x,
      y: figure.y,
      pages: figure.pages,
    }),
  );
  const walking = movers.flatMap((mover, index): Speaker[] => {
    const pages =
      mover.kind === 'person' ? pagesOfRoute(routes[mover.route]?.name ?? '', colleagues) : [];
    return pages.length === 0 ? [] : [{ speaker: 'mover', index, x: mover.x, y: mover.y, pages }];
  });
  return [...standing, ...walking];
}

/** The speaker of a dialogue among the speakers of the step; undefined when it is not there. */
export function speakerOf(dialogue: Dialogue, speakers: readonly Speaker[]): Speaker | undefined {
  return speakers.find(
    (speaker) => speaker.speaker === dialogue.speaker && speaker.index === dialogue.index,
  );
}

/**
 * In sight (0018): no opaque box of the map lies on the line from the centre of the player's
 * box to the point as high above the other's feet. The lamp's test, against the map as loaded:
 * a wall stops a conversation; a counter, a desk or a chair does not.
 */
export function inSight(player: Point, place: Point, map: TileMap): boolean {
  return !sightBlocked(
    { x: player.x, y: player.y - BOX_HEIGHT / 2 },
    { x: place.x, y: place.y - BOX_HEIGHT / 2 },
    { width: map.width, height: map.height, solids: map.opaque },
  );
}

/**
 * The speaker a press speaks to: the nearest whose feet are at most TALK_DISTANCE from the
 * player's and who is in sight, the first in the speakers' order of two equally near; null
 * when none is.
 */
export function speakerInReach(
  player: Point,
  speakers: readonly Speaker[],
  map: TileMap,
): Speaker | null {
  let nearest: Speaker | null = null;
  let reach = TALK_DISTANCE;
  for (const speaker of speakers) {
    const distance = Math.hypot(speaker.x - player.x, speaker.y - player.y);
    if (
      distance <= reach &&
      (nearest === null || distance < reach) &&
      inSight(player, speaker, map)
    ) {
      nearest = speaker;
      reach = distance;
    }
  }
  return nearest;
}

/**
 * The state after a press that opens a dialogue, or null when this step opens none: `talk` is
 * not pressed, the lamp is held, the player is being pushed, or no speaker is in reach. The
 * player and the speaker turn to each other, the player stands, a colleague stands where it
 * is, the lamp is off; nothing else is stepped.
 */
export function openDialogue(
  state: GameState,
  input: GameInput,
  speakers: readonly Speaker[],
  map: TileMap,
): GameState | null {
  if (!talkPressed(state, input) || input.lamp || state.player.recoil.steps > 0) {
    return null;
  }
  const { player } = state;
  const speaker = speakerInReach(player, speakers, map);
  if (speaker === null) {
    return null;
  }
  return {
    ...state,
    tick: state.tick + 1,
    talkHeld: true,
    player: {
      ...player,
      facing: facingToward(player, speaker, player.facing),
      frame: 0,
      frameTimer: 0,
    },
    lamp: { on: false, strength: state.lamp.strength },
    figures:
      speaker.speaker === 'figure'
        ? state.figures.map((standing, index) =>
            index === speaker.index
              ? { ...standing, facing: facingToward(speaker, player, standing.facing) }
              : standing,
          )
        : state.figures,
    movers:
      speaker.speaker === 'mover'
        ? state.movers.map((mover, index) =>
            index === speaker.index
              ? {
                  ...mover,
                  facing: facingToward(speaker, player, mover.facing),
                  frame: 0,
                  frameTimer: 0,
                }
              : mover,
          )
        : state.movers,
    dialogue: { speaker: speaker.speaker, index: speaker.index, page: 0 },
  };
}

/**
 * One step with a dialogue open: the tick grows, the key is remembered, and a press turns to
 * the next page or, on the last page, closes the dialogue. Nothing else changes.
 */
export function stepDialogue(
  state: GameState,
  dialogue: Dialogue,
  input: GameInput,
  speakers: readonly Speaker[],
): GameState {
  const pages = speakerOf(dialogue, speakers)?.pages.length ?? 0;
  const page = talkPressed(state, input) ? dialogue.page + 1 : dialogue.page;
  return {
    ...state,
    tick: state.tick + 1,
    talkHeld: input.talk,
    dialogue: page < pages ? { ...dialogue, page } : null,
  };
}
```

  Biome sorts the imports; run `npx biome check --write src/game/talk.ts`.

- [x] **Step 6: Pass the speakers in `update`.** The routes are built once per step now and
  used for the speakers and for the movers:

```diff
--- a/src/game/update.ts
+++ b/src/game/update.ts
@@ -7,7 +7,7 @@ import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from
 import { type GameInput, stepPlayer } from './player';
 import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
 import { type GameState, type LampState, NO_RECOIL, type PlayerState } from './state';
-import { openDialogue, stepDialogue } from './talk';
+import { openDialogue, speakersOf, stepDialogue } from './talk';
 import { BASE_STRENGTH } from './world';
 
 /**
@@ -70,11 +70,13 @@ export function update(state: GameState, input: GameInput, content: TileMap): Ga
   if (state.dark > 0) {
     return { ...stepDark(state, content), talkHeld: input.talk };
   }
-  const figures = figuresOf(content.points);
+  const routes = routesOf(content.points);
+  const speakers = speakersOf(figuresOf(content.points), state.movers, routes);
   if (state.dialogue !== null) {
-    return stepDialogue(state, state.dialogue, input, figures);
+    return stepDialogue(state, state.dialogue, input, speakers);
   }
-  const opened = openDialogue(state, input, figures);
+  // In sight is tested against the map as loaded: a shadow wall does not stop a conversation.
+  const opened = openDialogue(state, input, speakers, content);
   if (opened !== null) {
     return opened;
   }
@@ -104,7 +106,7 @@ export function update(state: GameState, input: GameInput, content: TileMap): Ga
     camera: followPlayer(player, content),
     lamp,
     creatures,
-    movers: stepMovers(state.movers, routesOf(content.points), player),
+    movers: stepMovers(state.movers, routes, player),
     // The light on a wall is tested against the map as loaded: a wall does not block itself.
     shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content),
     figures: state.figures,
```

  Update the doc comment of `update` in the same file: a press of `talk` near a speaker — a
  standing figure or a colleague — in reach and in sight opens a dialogue (0017, 0018).

- [x] **Step 7: Look the page up through the speaker in the scene:**

```diff
--- a/src/render/draw-scene.ts
+++ b/src/render/draw-scene.ts
@@ -3,7 +3,7 @@ import { type Box, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
 import { type Figure, figuresOf } from '../game/cast';
 import { CREATURE_SIZE } from '../game/creature';
 import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
-import { DOG_LOOKS, MOVER_SIZE } from '../game/mover';
+import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
 import { noticeOf } from '../game/notice';
 import { DARK_STEPS } from '../game/overview';
 import { LIFT_STEPS, wallsOf } from '../game/shadow';
@@ -18,6 +18,7 @@ import {
   type ShadowWallState,
   type Species,
 } from '../game/state';
+import { speakerOf, speakersOf } from '../game/talk';
 import { type Language, textOf } from '../text/text';
 import { drawLayer } from './draw-map';
 import { drawText } from './draw-text';
@@ -373,7 +374,8 @@ export function drawScene(renderer: Renderer, state: GameState, content: SceneCo
   const page =
     state.dialogue === null
       ? undefined
-      : figures[state.dialogue.figure]?.pages[state.dialogue.page];
+      : speakerOf(state.dialogue, speakersOf(figures, state.movers, routesOf(content.map.points)))
+          ?.pages[state.dialogue.page];
   const notice = noticeOf(state);
   if (page !== undefined) {
     renderer.fillRect(
```

- [x] **Step 8: Run the tests.**

Run: `npx vitest run tests/unit/talk.test.ts tests/unit/draw-scene.test.ts`
Expected: PASS — `talk.test.ts` has 51 tests. Then `npm run test`: every file green. The
floor tests of 0017 that use `TALK_DISTANCE` still hold with 40: the wake point is 45.3 px
from the officer, and the nearest route point is 176 px from her.

- [x] **Step 9:** `npm run check`, then commit —
  `Talk to a colleague on its round, in sight and within 40 px`. The body says why the reach
  grew (32 px across the counter) and why sight is tested (the coffee machine of Sales stands
  24 px from the north corridor).

---

### Task 4: The fixture and the state

A map that went through the loader, with a colleague's `pause` as a Tiled property. These
tests pass as soon as they are written: they prove that Task 3 holds on parsed data.

**Files:**
- Create: `tests/fixtures/maps/talkers.tmj`
- Test: `tests/unit/state.test.ts`

- [x] **Step 1: Create the fixture** from `figures.tmj` with a one-off script. Do not commit
  the script. Run from the repository root:

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';

const map = JSON.parse(readFileSync('tests/fixtures/maps/figures.tmj', 'utf8'));
const point = (id, name, x, y, pause) => ({
  height: 0,
  id,
  name,
  point: true,
  ...(pause === undefined ? {} : { properties: [{ name: 'pause', type: 'int', value: pause }] }),
  rotation: 0,
  type: '',
  visible: true,
  width: 0,
  x,
  y,
});
const objects = map.layers.find((layer) => layer.type === 'objectgroup');
objects.objects = [
  point(1, 'spawn', 104, 48),
  point(2, 'figure:officer', 160, 96),
  point(3, 'person:reception:1', 64, 48, 600),
  point(4, 'person:reception:2', 128, 48),
  point(5, 'dog:reception:1', 40, 152),
  point(6, 'dog:reception:2', 104, 152),
];
map.nextobjectid = 7;
const text = JSON.stringify(map, null, 2).replace(
  /"data": \[[^\]]*\]/,
  (data) => data.replace(/\s+/g, ' ').replace('[ ', '[').replace(' ]', ']'),
);
writeFileSync('tests/fixtures/maps/talkers.tmj', `${text}\n`);
EOF
```

  The fixture then holds six point objects, ids 1 to 6, `nextobjectid` 7: `spawn` (104, 48);
  `figure:officer` (160, 96); `person:reception:1` (64, 48) with the `int` property `pause`
  600; `person:reception:2` (128, 48); `dog:reception:1` (40, 152); `dog:reception:2`
  (104, 152). The tile layer is that of `figures.tmj`.

- [x] **Step 2: Add the tests** to `tests/unit/state.test.ts`:

```diff
--- a/tests/unit/state.test.ts
+++ b/tests/unit/state.test.ts
@@ -32,6 +32,11 @@ const FIGURES_MAP = loadMap(
   'tests/fixtures/maps/figures.tmj',
   'tests/fixtures/maps/fixture-tiles.tsj',
 );
+/** The officer, a colleague with lines on a route of two points and a dog, on open floor (0018). */
+const TALKERS_MAP = loadMap(
+  'tests/fixtures/maps/talkers.tmj',
+  'tests/fixtures/maps/fixture-tiles.tsj',
+);
 /** The floor the game loads. */
 const FLOOR_MAP = loadMap('public/maps/floor.tmj', 'public/tiles/placeholder.tsj');
 
@@ -630,3 +635,34 @@ describe('standing figures in the state (0017)', () => {
     expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
   });
 });
+
+describe('colleagues with lines in the state (0018)', () => {
+  const TALK: GameInput = { ...NONE, talk: true };
+
+  it('starts on the fixture with the officer, the colleague waiting on its point 1 and the dog', () => {
+    const state = createInitialState(TALKERS_MAP);
+    expect(state.player).toMatchObject({ x: 104, y: 48 });
+    expect(state.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
+    expect(state.movers.map((mover) => mover.kind)).toStrictEqual(['person', 'dog']);
+    expect(state.movers[0]).toMatchObject({ x: 64, y: 48, wait: 600, target: 1, facing: 'down' });
+    expect(state.dialogue).toBeNull();
+  });
+
+  it('opens a dialogue with the colleague 40 px from the spawn, and closes it with the next press', () => {
+    const start = createInitialState(TALKERS_MAP);
+    const opened = update(start, TALK, TALKERS_MAP);
+    expect(opened.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
+    expect(opened.movers[0]).toStrictEqual({ ...start.movers[0], facing: 'right' });
+    expect(opened.movers[1]).toStrictEqual(start.movers[1]);
+    expect(opened.figures).toStrictEqual(start.figures);
+    const closed = update(update(opened, NONE, TALKERS_MAP), TALK, TALKERS_MAP);
+    expect(closed.dialogue).toBeNull();
+    expect(closed.tick).toBe(3);
+  });
+
+  it('survives a JSON round trip with the colleague speaking (INV-1)', () => {
+    const opened = update(createInitialState(TALKERS_MAP), TALK, TALKERS_MAP);
+    expect(opened.dialogue).not.toBeNull();
+    expect(JSON.parse(JSON.stringify(opened))).toStrictEqual(opened);
+  });
+});
```

- [x] **Step 3: Run.** `npx vitest run tests/unit/state.test.ts` — PASS.

- [x] **Step 4:** `npm run check`, then commit —
  `Prove a colleague's dialogue on a parsed fixture`.

---

### Task 5: The floor

Criteria 1 and 12 of the spec on `floor.tmj`. These tests also pass as soon as they are
written; they guard the two places for which the reach and the sight rule were made.

**Files:**
- Test: `tests/unit/floor.test.ts`

- [x] **Step 1: Add the tests:**

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -5,10 +5,10 @@ import { describe, expect, it } from 'vitest';
 import { cameraFor } from '../../src/engine/camera';
 import { moveBox } from '../../src/engine/collision';
 import { type Box, EMPTY, type Point, parseTileMap, parseTileset } from '../../src/engine/tiled';
-import { figuresOf } from '../../src/game/cast';
+import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
 import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
 import { standingWalls, wallsOf, withWalls } from '../../src/game/shadow';
-import { TALK_DISTANCE } from '../../src/game/talk';
+import { speakerInReach, speakersOf, TALK_DISTANCE } from '../../src/game/talk';
 import { createInitialState } from '../../src/game/update';
 import {
   type CellRect,
@@ -1121,3 +1121,64 @@ describe('the standing figures of the floor (0017)', () => {
     }
   });
 });
+
+describe('the colleagues of the floor and their lines (0018)', () => {
+  const routes = routesOf(floor.points);
+  const start = createInitialState(floor);
+  /** The speakers of the floor with the colleague of `route` put on its point `n`, from 1. */
+  const speakersWith = (route: string, n: number) => {
+    const index = routes.findIndex((candidate) => candidate.name === route);
+    const at = routes[index]?.points[n - 1] ?? { x: -1, y: -1 };
+    const movers = start.movers.map((mover) =>
+      mover.route === index ? { ...mover, x: at.x, y: at.y } : mover,
+    );
+    return { at, speakers: speakersOf(figuresOf(floor.points), movers, routes) };
+  };
+
+  it('gives every person route its lines, and has no lines for a route the floor lacks', () => {
+    const persons = routes.filter((route) => route.kind === 'person').map((route) => route.name);
+    expect(persons).toStrictEqual(COLLEAGUES.map((colleague) => colleague.route));
+    for (const name of persons) {
+      expect(pagesOfRoute(name), name).toHaveLength(1);
+    }
+  });
+
+  it('has five speakers: the officer, then the four colleagues in the order of the movers', () => {
+    const speakers = speakersOf(figuresOf(floor.points), start.movers, routes);
+    expect(speakers.map((speaker) => [speaker.speaker, speaker.index])).toStrictEqual([
+      ['figure', 0],
+      ['mover', 0],
+      ['mover', 1],
+      ['mover', 2],
+      ['mover', 3],
+    ]);
+  });
+
+  it('reaches the colleague of the reception across the counter', () => {
+    const { at, speakers } = speakersWith('person:reception', 1);
+    expect(at).toMatchObject({ x: 200, y: 648 });
+    expect(reached({ x: 200, y: 680 })).toBe(true);
+    expect(blocked(boxAt({ x: 200, y: 664 }))).toBe(true);
+    expect(speakerInReach({ x: 200, y: 680 }, speakers, floor)).toMatchObject({
+      speaker: 'mover',
+      index: 0,
+    });
+    // 40 px is enough for the 32 px across the counter, a tile to either side.
+    expect(speakerInReach({ x: 176, y: 680 }, speakers, floor)?.index).toBe(0);
+    expect(speakerInReach({ x: 224, y: 680 }, speakers, floor)?.index).toBe(0);
+  });
+
+  it('does not reach the colleague of Sales at the coffee from the north corridor', () => {
+    const { at, speakers } = speakersWith('person:sales', 3);
+    expect(at).toMatchObject({ x: 1672, y: 440 });
+    expect(reached({ x: 1672, y: 416 })).toBe(true);
+    expect(Math.hypot(0, 440 - 416)).toBeLessThan(TALK_DISTANCE);
+    expect(speakerInReach({ x: 1672, y: 416 }, speakers, floor)).toBeNull();
+    // From inside the room, as far below the colleague, it is reached.
+    expect(reached({ x: 1672, y: 464 })).toBe(true);
+    expect(speakerInReach({ x: 1672, y: 464 }, speakers, floor)).toMatchObject({
+      speaker: 'mover',
+      index: 3,
+    });
+  });
+});
```

- [x] **Step 2: Run.** `npx vitest run tests/unit/floor.test.ts` — PASS.

- [x] **Step 3:** `npm run check`, then commit — `Guard the counter and the coffee on the floor`.

---

### Task 6: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/architecture.md`,
  `docs/spec/testing.md`, `README.md`

- [x] **Step 1: `gameplay.md` §8.** In the paragraph **As built** (feature 0017) the reach
  becomes 40 px, with "(feature 0018; it was 24)". Add a paragraph **As built** (feature
  0018): the four colleagues who walk the floor can be spoken to; a press reaches a speaker —
  a standing figure or a colleague — at most 40 px away and in sight, that is with nothing
  opaque between the two: a counter, a desk or a chair does not stop a conversation, a wall
  does; the colleague stands where it is and turns to the player; each has one saying of one
  page, the same every time; after it the colleague goes on its round and keeps its facing
  until it moves.

- [x] **Step 2: `world.md`.** §1, "What moves": one sentence — since feature 0018 the four
  colleagues can be spoken to and stop where they are while they speak. §3, at "Per
  department": the colleagues of the reception, Marketing, Support and Sales have one everyday
  saying each since feature 0018; they still have no name. At the data protection officer:
  nothing but the distance changed for her.

- [x] **Step 3: `architecture.md`.** §1 directory list: `game/cast.ts` also holds the
  colleagues' lines (0018). §2: `dialogue` is `null` or `{ speaker, index, page }` —
  `speaker` is `'figure'` or `'mover'`, `index` the index in `figures` or in `movers`; the
  speakers of a step (`speakersOf`): the standing figures in file order, then the movers of
  the kind `person` whose route is in `COLLEAGUES`, in the order of `movers`, each where it is
  in the state; a press opens a dialogue with the nearest speaker at most 40 px
  (`TALK_DISTANCE`) away and in sight (`inSight`: the lamp's `sightBlocked` between the two
  box centres, against the map as loaded), the first in that order of two equally near; a
  colleague that is spoken to gets `frame` 0 and `frameTimer` 0 and the facing toward the
  player, and nothing else of it changes, so `game/mover` steps it on unchanged after the
  dialogue; replace "a state without figures … steps exactly as before 0017" by the same
  sentence for speakers and 0018. §5, where the dialogue box is described: the page is the
  speaker's. §8: the cast names its pages by key, and so does `COLLEAGUES`.

- [x] **Step 4: `testing.md`.** §2: the INV-1 row gains the round trip with a colleague
  speaking (0018). §6: `talkers.tmj`, if the section lists the fixtures.

- [x] **Step 5: `README.md`:** one sentence after the one on the data protection officer —
  the four colleagues who walk the floor can be spoken to as well, across the counter too,
  and each has a saying (feature 0018).

- [x] **Step 6:** `npm run check`, then commit — `Move the everyday lines into the spec`.

---

### Task 7: The full check

- [x] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [x] **Step 2:** `npm run check` and `npm run test:e2e` — green. The smoke spec is unchanged:
  after loading `state.dialogue` is `null`.
- [x] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [x] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.
- [x] **Step 5:** tick the boxes of Tasks 1 to 7 in this file and commit —
  `Tick the full check of 0018`.

---

### Task 8: The acceptance walk

- [x] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk.
  Wait until the author is ready.
- [x] **Step 2:** guide the author through steps 1–22 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [x] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 7, and start again at step 1.
- [x] **Step 4:** after step 22 ask the five feel questions, one per message.
- [x] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–22`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0018`. A feel note that wants something
  else — another reach, a pause before the colleague walks on, other words, more sayings —
  becomes a new draft, not a change on this branch.

---

### Task 9: The pull request

- [x] **Step 1:** merge the latest `main` again and rerun Task 7. If the merge changed code,
  the walk is run again.
- [x] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`, and in `docs/plan.md` §4 change "0018 is approved" to say that
  0018 is implemented; commit — `Mark 0018 implemented`. The rows of 0019 and 0020 stay
  `draft`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0018: everyday lines`, with the walk's result and feel notes in its description,
  and one line that the branch also carries the drafts of 0019 and 0020. CI must be green.
  The author merges.
