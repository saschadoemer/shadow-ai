# 0012 — Implementation plan: overview hearts

**Spec:** [`docs/features/0012-overview-hearts.md`](../features/0012-overview-hearts.md)
(approved 2026-11-13). The plan argues from the spec; where they differ, the spec wins. Read the
spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §5 and §7 and
`docs/spec/testing.md` §5. **Written:** 2026-11-13 on the planning model. A working document,
not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Goal:** overview starts at five and is drawn as five small hearts: `INITIAL_OVERVIEW` is 5,
`public/sprites/overview.png` holds a full and an empty heart, and no name in `src/` or
`tools/` calls the display a light.

**Approach:** three small code tasks, each green on its own. The number first (T1), because it
is pure logic. Then the sheet (T2): the generator, its test and the committed PNG change
together. Then the names in the renderer (T3) — geometry and draw order do not change, so this
is a rename plus one new test. Then the smoke spec (T4), the documents (T5), the full check
with the container (T6), the walk (T7) and the pull request (T8).

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generator. No new
dependency.

## Global constraints

- No new dependency.
- `GameState` keeps its shape; only the start value changes (INV-1). `src/game/` imports
  nothing from `src/render/` (INV-2).
- INV-6: the sheet uses only `#181425`, `#e43b44` and `#3a4466`, alpha 0 or 255, never
  `#68386c`.
- The file name `public/sprites/overview.png`, its size 16x8 and the frame order — 0 full,
  1 empty — do not change.
- The health is still called overview. Only the names of the picture change: light → heart,
  on → full, out → empty. The lamp's light, `CreatureState.light` and everything in
  `game/lamp` are not touched.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule. Run `npx biome check --write .`
  before `npm run check`.
- `npm run check` is typecheck, Biome, build, Vitest. `npm run test:e2e` runs the smoke spec
  against the dev server; with `BASE_URL` set it runs against that URL.
- Branch `feature/0012-overview-hearts`, this worktree; it carries the spec, its approval and
  this plan, and is based on `main` at 3d0f768. Before Task 1, merge `main` if it has moved
  (`CLAUDE.md` §4). Commit messages: imperative subject, a body that says why, and the
  attribution line the session's reminder names. Commits are signed; signing fails inside the
  Bash sandbox, so commit with the sandbox disabled.

## File map

| File | Change |
|---|---|
| `src/game/overview.ts` | `INITIAL_OVERVIEW` 3 → 5 |
| `tests/unit/overview.test.ts`, `tests/unit/state.test.ts` | the values that follow from the start value |
| `tools/placeholder-overview.ts` | the heart in place of the disc; `OVERVIEW_FULL`, `OVERVIEW_EMPTY` |
| `public/sprites/overview.png` | regenerated |
| `tests/unit/gen-sprites.test.ts` | the overview block rewritten for the heart |
| `src/render/draw-scene.ts`, `src/main.ts` | `LIGHT_*` → `HEART_*`, comments |
| `tests/unit/draw-scene.test.ts` | test names, one new test |
| `tests/e2e/smoke.spec.ts` | five of five |
| `docs/spec/gameplay.md`, `visual.md`, `architecture.md`, `testing.md`, `docs/plan.md` | as built |

---

### Task 1: The start value

**Files:** `tests/unit/overview.test.ts`, `tests/unit/state.test.ts`, `src/game/overview.ts`.

- [ ] **Step 1: change the tests.** Only values that follow from `createInitialState` change.
  States a test builds by hand with `max: 3` stay — they test the rule, not the start value.

  `tests/unit/overview.test.ts`:
  - "are the spec numbers": the array becomes `[5, 10, 90, 8, 3, 90, 45]` and
    `initialOverview()` equals `{ current: 5, max: 5 }`.
  - "a creature at 10 px …": `next.overview` equals `{ current: 4, max: 5 }`.
  - "a creature at 11 px …": `first.overview.current` is 5, after the second step 4.
  - "with grace 2 …": `[5, 1]`, then 4.
  - "a creature that stays at the figure …": 4 in the loop, then 3.
  - "the lamp is the defence …": `lit.overview.current` is 5, the unlit run gives 4.
  - "one step holds one hit …": 4.
  - "the last point starts the dark" and "in the dark the keys do nothing …" pass
    `overview: { current: 1, max: 3 }` themselves and stay as they are.

  `tests/unit/state.test.ts`:
  - the expected initial state (the first `toStrictEqual` with `tick`, `player`, `camera`):
    `overview: { current: 5, max: 5 }`. The two hand-built states in "advances the tick …" and
    "leaves its input unchanged" stay at 3 of 3.
  - "survives a JSON round trip in the middle of a push": `{ current: 4, max: 5 }`.
  - Replace the test "three hits, 90 steps apart, …" by:

    ```ts
    it('five hits, 90 steps apart, lead into the dark; it survives the round trip at step 30', () => {
      expect([1, 91, 181, 271].map((steps) => run(steps).overview.current)).toStrictEqual([
        4, 3, 2, 1,
      ]);
      expect(run(90).overview.current).toBe(4);
      expect(run(360).dark).toBe(0);
      expect(run(361).dark).toBe(1);
      const state = run(390);
      expect(state.overview).toStrictEqual({ current: 0, max: 5 });
      expect(state.dark).toBe(30);
      const copy: unknown = JSON.parse(JSON.stringify(state));
      expect(copy).toStrictEqual(state);
    });
    ```

  - "without a wake point …": `run(405)` with the comment `// 361 + 44: dark is 45`, and
    `state.overview` equals `{ current: 5, max: 5 }`.

  The numbers assume the cadence the old test proved — a hit in step 1 and every 90 steps after
  it. If hit four or five comes at another step, the creature lost the figure on this map: stop
  and report it, do not bend the numbers.
- [ ] **Step 2:** `npx vitest run tests/unit/overview.test.ts tests/unit/state.test.ts` —
  expected: the changed tests fail with 3 where 5 is expected.
- [ ] **Step 3:** in `src/game/overview.ts` set `export const INITIAL_OVERVIEW = 5;`. If the
  constant's comment names three, correct it.
- [ ] **Step 4:** `npm run check` — green. If another test fails on 3 of 3 from the initial
  state, it follows the start value: change it to 5 of 5.
- [ ] **Step 5: commit** — `Start with five points of overview`.

---

### Task 2: The heart sheet

**Files:** `tests/unit/gen-sprites.test.ts`, `tools/placeholder-overview.ts`,
`public/sprites/overview.png`.

**Produces:** `OVERVIEW_FULL` `'#e43b44'`, `OVERVIEW_EMPTY` `'#3a4466'`, `OVERVIEW_RIM`
`'#181425'`, `overviewInk(i, j): 'rim' | 'fill' | null`, `renderOverview(): Uint8Array` —
`OVERVIEW_ON` and `OVERVIEW_OUT` are gone.

- [ ] **Step 1: change the test.** In the import, `OVERVIEW_ON`, `OVERVIEW_OUT` become
  `OVERVIEW_EMPTY`, `OVERVIEW_FULL` (Biome sorts them). The describe is named
  `'the placeholder overview generator (0012)'`. The first three tests stay. The last three
  become:

  ```ts
  it('has 34 opaque pixels per frame, 16 of them the rim', () => {
    expect([OVERVIEW_RIM, OVERVIEW_FULL, OVERVIEW_EMPTY]).toStrictEqual([
      '#181425',
      '#e43b44',
      '#3a4466',
    ]);
    for (let index = 0; index < OVERVIEW_FRAMES; index += 1) {
      const pixels = overviewFrame(index).flat();
      expect(
        pixels.filter((colour) => colour !== null),
        `frame ${index}`,
      ).toHaveLength(34);
      expect(
        pixels.filter((colour) => colour === OVERVIEW_RIM),
        `frame ${index}`,
      ).toHaveLength(16);
    }
  });

  it('draws frame 0 as the spec says: a heart with a dark rim, red inside', () => {
    const R = OVERVIEW_RIM;
    const F = OVERVIEW_FULL;
    const N = null;
    expect(overviewFrame(0)).toStrictEqual([
      [N, R, R, N, R, R, N, N],
      [R, F, F, R, F, F, R, N],
      [R, F, F, F, F, F, R, N],
      [R, F, F, F, F, F, R, N],
      [N, R, F, F, F, R, N, N],
      [N, N, R, F, R, N, N, N],
      [N, N, N, R, N, N, N, N],
      [N, N, N, N, N, N, N, N],
    ]);
  });

  it('frame 1 is frame 0 with the heart empty', () => {
    const empty = overviewFrame(0).map((row) =>
      row.map((colour) => (colour === OVERVIEW_FULL ? OVERVIEW_EMPTY : colour)),
    );
    expect(overviewFrame(1)).toStrictEqual(empty);
  });
  ```

- [ ] **Step 2:** `npx vitest run tests/unit/gen-sprites.test.ts` — expected: fails, the names
  do not exist.
- [ ] **Step 3: the generator.** Replace everything in `tools/placeholder-overview.ts` from the
  doc comment to `overviewInk` by the following; in `renderOverview` only the two lines that
  pick the colour change.

  ```ts
  /**
   * The placeholder overview sheet (features 0009, 0012): a small heart, two 8x8 frames in one
   * row. Frame 0 is the full heart, frame 1 the empty one. 7 wide and 7 high with a dark rim,
   * so that it reads on carpet, corridor and wall alike. Pure — it returns pixels;
   * tools/gen-sprites.ts writes the file.
   */

  export const OVERVIEW_FRAME_SIZE = 8;
  export const OVERVIEW_FRAMES = 2;
  export const OVERVIEW_SHEET_WIDTH = OVERVIEW_FRAMES * OVERVIEW_FRAME_SIZE;
  export const OVERVIEW_SHEET_HEIGHT = OVERVIEW_FRAME_SIZE;
  export const OVERVIEW_RIM: PaletteColour = '#181425';
  export const OVERVIEW_FULL: PaletteColour = '#e43b44';
  export const OVERVIEW_EMPTY: PaletteColour = '#3a4466';

  /** The heart, row by row: `#` is the rim, `o` the fill, `.` transparent. */
  const HEART = [
    '.##.##..',
    '#oo#oo#.',
    '#ooooo#.',
    '#ooooo#.',
    '.#ooo#..',
    '..#o#...',
    '...#....',
    '........',
  ] as const;

  /** Pixel (i, j) of a frame: 16 pixels of rim, 18 of fill, the rest transparent. */
  export function overviewInk(i: number, j: number): 'rim' | 'fill' | null {
    const cell = HEART[j]?.[i];
    if (cell === '#') {
      return 'rim';
    }
    return cell === 'o' ? 'fill' : null;
  }
  ```

  In `renderOverview`:

  ```ts
  const fill = frame === 0 ? OVERVIEW_FULL : OVERVIEW_EMPTY;
  data.set(
    [...rgb(ink === 'rim' ? OVERVIEW_RIM : fill), 255],
    (j * OVERVIEW_SHEET_WIDTH + frame * OVERVIEW_FRAME_SIZE + i) * 4,
  );
  ```

- [ ] **Step 4:** `npm run gen-sprites`, then `git status` — only
  `public/sprites/overview.png` changed among the sprites. Run it again: no further change.
- [ ] **Step 5:** `npm run check` — green; `tests/unit/assets` passes on the new sheet.
- [ ] **Step 6: commit** — `Draw overview as a heart`.

---

### Task 3: The names in the renderer

**Files:** `tests/unit/draw-scene.test.ts`, `src/render/draw-scene.ts`, `src/main.ts`.

- [ ] **Step 1: the test.** The describe becomes `'overview in the scene (0009, 0012)'`; in
  the test names "light"/"lights" become "heart"/"hearts" and "on, on, out" becomes "full,
  full, empty". Add:

  ```ts
  it('draws five hearts for 3 of 5: three full, two empty, 10 px apart', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene({ overview: { current: 3, max: 5 } }), CONTENT);
    expect(renderer.calls.slice(-5)).toStrictEqual([
      'drawSprite 0 at 4,4',
      'drawSprite 0 at 14,4',
      'drawSprite 0 at 24,4',
      'drawSprite 1 at 34,4',
      'drawSprite 1 at 44,4',
    ]);
  });

  it('names the row by its picture', () => {
    expect([HEART_SIZE, HEART_MARGIN, HEART_PITCH]).toStrictEqual([8, 4, 10]);
  });
  ```

  and import `HEART_MARGIN`, `HEART_PITCH`, `HEART_SIZE` from `../../src/render/draw-scene`.
- [ ] **Step 2:** run the file — expected: fails, the names do not exist.
- [ ] **Step 3: rename** in `src/render/draw-scene.ts`: `LIGHT_SIZE` → `HEART_SIZE`,
  `LIGHT_MARGIN` → `HEART_MARGIN`, `LIGHT_PITCH` → `HEART_PITCH`, `LIGHT_ON_FRAME` →
  `HEART_FULL_FRAME`, `LIGHT_OUT_FRAME` → `HEART_EMPTY_FRAME`. The comments: on
  `overviewSheet` — `Two 8x8 frames: a full heart, an empty heart (0009, 0012).`; on the
  constants — `The hearts of overview (0009, 0012): 8x8, 4 px from the corner, one every
  10 px.`; in the doc comment of `drawScene` "the lights of overview" becomes "the hearts of
  overview". In `src/main.ts` the import and the two uses follow.
- [ ] **Step 4:** criterion 7 —
  `grep -rniE "light" src tools | grep -iE "overview|LIGHT_"` prints nothing. Lines about the
  lamp's light and `CreatureState.light` are correct and stay.
- [ ] **Step 5:** `npm run check` — green.
- [ ] **Step 6: commit** — `Name the overview row by its hearts`.

---

### Task 4: The smoke spec

**Files:** `tests/e2e/smoke.spec.ts`.

- [ ] In "the game starts with full overview and outside the dark" the message becomes
  `'window.shadowAi.state.overview is five of five'` and the value
  `{ current: 5, max: 5 }`.
- [ ] `npm run test:e2e` — green. The corner-pixel check must still pass: the heart's first
  pixel is at surface (5, 4), the corner (0, 0) is map.
- [ ] Commit — `Expect five of five in the smoke spec`.

---

### Task 5: The documents

One commit: `Describe the hearts in the specification`. English, plain, as built.

- [ ] `docs/spec/gameplay.md` §4, "As built": "(feature 0009): the figure starts with three
  points, shown as three small lights in the top-left corner" becomes "(features 0009, 0012):
  the figure starts with five points, shown as five small hearts in the top-left corner"; "all
  three numbers *tune*" stays — it means the push, the safe time and the hit. Add after that
  sentence: "The start value tunes as well."
- [ ] `docs/spec/visual.md` §3, "The display": "the row of overview lights … (feature 0009)"
  becomes "the row of overview hearts … (features 0009, 0012)"; add the sentence: "A heart is
  7x7 with a rim in `#181425`, red `#e43b44` when full and `#3a4466` when empty."
- [ ] `docs/spec/architecture.md`: §1 the line of `placeholder-overview.ts` — "two 8x8 frames,
  a full and an empty heart"; §2 "3 of 3 at the start" → "5 of 5 at the start (feature 0012)";
  §5 "the lights of overview" → "the hearts of overview" in the draw order and in the
  paragraph "The lights of overview (feature 0009) …", where "light i" becomes "heart i" and
  the feature reference "(features 0009, 0012)"; §7 the paragraph on
  `tools/placeholder-overview.ts`: a heart 7 wide and 7 high, 34 opaque pixels, a rim of 16 in
  `#181425`, inside 18 in `#e43b44` for the full heart and `#3a4466` for the empty one.
- [ ] `docs/spec/testing.md`: `grep -n -i "light" docs/spec/testing.md`; where a sentence
  means the overview display or names "three of three", it follows — hearts, five of five.
  Sentences about the lamp stay.
- [ ] `docs/plan.md` §4, M3: "Six features" → "Seven features"; the list ends "… 0011 the
  furniture · 0012 overview hearts · 0013 shadow walls and density"; add one sentence: "The
  hearts follow the feel note of 0009's walk and come before the density rule because they are
  small." Any other "0012" in `docs/plan.md` that means shadow walls becomes 0013.
- [ ] `grep -rn -i "three lights\|overview lights\|lights of overview" docs/spec docs/plan.md`
  prints nothing. `docs/features/0009` and `0010` are history and are not edited.
- [ ] `npm run check`, then commit.

---

### Task 6: The full check

- [ ] `npm run check` and `npm run test:e2e`.
- [ ] Build and run the container as `docs/spec/ops.md` §3 says, then
  `BASE_URL=http://localhost:<port> npm run test:e2e`.
- [ ] `npm run gen-sprites` twice, `git status` clean (criterion 6).
- [ ] Report failures as failures. Nothing is committed in this task unless something was
  fixed.

---

### Task 7: The acceptance walk

`CLAUDE.md` §3.4 and `docs/spec/testing.md` §5. Start `npm run dev`, state the preconditions of
the spec's acceptance plan in one message — with the real port if 5173 is taken — and wait for
the author. Then one action step with its expected step or steps per message, 1–19, in the
spec's words; record each answer as given. A `fail` ends the walk: fix on the branch or ask,
rerun Task 6, start again at step 1. After step 19 the four feel questions, one per message.
Then write the `Result` line — `passed YYYY-MM-DD, steps 1–19`, followed by the feel notes —
and commit it: `Record the acceptance walk of 0012`.

If the author finds that the shape does not read as a heart, that is a failed step 15: the
pixel table in the spec is changed first, in conversation, then the generator and its test.

---

### Task 8: The pull request

`CLAUDE.md` §3.5. Merge `main` into the branch; rerun Task 6; if the merge changed code, run
Task 7 again. Set `Status: implemented` with the date in the spec and in the table of
`docs/features/README.md` and commit that on the branch. Open the pull request against `main`:
title `Feature 0012: overview hearts`; the description says what was built, quotes the `Result`
line, and ends with the attribution line the session's reminder names. Bind it with the app's
PR tools and read CI; CI must be green. The author merges.

## Self-review against the spec

- Criteria 1 and 3: Task 1 and Task 4. Criterion 2 and 5: Task 3, on top of 0009's unchanged
  tests. Criterion 4: Task 2. Criterion 6: Task 2 step 4 and Task 6. Criterion 7: Task 3
  step 4. Criterion 8: Task 6.
- The spec's document list: Task 5 covers `gameplay.md`, `visual.md`, `architecture.md`,
  `testing.md` and `docs/plan.md`; the README's status changes in Task 8.

## Decisions by the planning session

- The heart is held as eight strings in the generator, not as arithmetic: the spec gives a
  table, and the table is what a reader checks against.
- `HEART_FULL_FRAME` and `HEART_EMPTY_FRAME` stay private, as the two frame constants were.
- The feature and approval commits are on this branch; the README row for 0012 was added with
  the approval.

## Questions for the author

None.
