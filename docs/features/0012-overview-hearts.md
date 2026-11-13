# 0012 — Overview hearts

**Status:** approved 2026-11-13
**Milestone:** M3
**Drafted:** 2026-11-13

## Goal

Overview is shown as a row of small pixel hearts instead of lights, and the figure starts with
five points instead of three. After this feature the player reads the display at a glance as
"what I have left", the way other games of this kind taught them — the feel note of 0009's walk.

## Scope

**In:**

- `INITIAL_OVERVIEW` in `src/game/overview.ts` becomes 5: the figure starts with
  `{ current: 5, max: 5 }` and wakes from the dark with five
- `public/sprites/overview.png` redrawn: two 8x8 frames — a full heart, an empty heart — under
  the same name, size and frame order
- `tools/placeholder-overview.ts` draws the heart; `npm run gen-sprites` writes it
- `render/draw-scene.ts`: the names of the display's constants follow the picture (`HEART_SIZE`,
  `HEART_MARGIN`, `HEART_PITCH`, the full and the empty frame); position, pitch and draw order
  are unchanged
- with the implementation: `gameplay.md` §4 as built — five points, five hearts;
  `visual.md` §3 the display; `architecture.md` §2 the start value, §5 the hearts, §7 the
  generator; `testing.md` where it names the lights; `docs/plan.md` §4 the list of M3's
  features; the README its status

**Out, explicitly:** half hearts and any point smaller than one — a hit takes a whole heart ·
an animation of a heart that is lost, a beat at low overview, a shake of the row (polish, M8) ·
a sound (audio, after M5) · a new name for the health: it stays **overview** in the
specification and in the code; only the picture changes · any change to the hit, the push, the
safe time or the dark (0009) · the growth of the maximum (M5) and any way to win overview back
other than the dark (M4, M5; `gameplay.md` §4) · text or a number beside the row (M4) · the
final art: this is a placeholder like the other sheets, the art pass replaces it under the same
name and frame order.

## Behaviour

Every number is a pixel or a whole point. This refines `gameplay.md` §4 and `visual.md` §3 and
replaces the section "The lights" of 0009.

### The number

- `INITIAL_OVERVIEW` is 5 (*tune*). `createInitialState` sets `overview` to
  `{ current: 5, max: 5 }`.
- Nothing else in the rules changes: a hit takes 1, the fifth hit starts the dark, and waking
  sets `current` to `max`, now 5.
- The rule of `gameplay.md` §4 stays: the maximum grows by one with every solved case (M5). With
  the eight cases of the game the largest maximum is 13.

### The sheet

- `public/sprites/overview.png` stays 16x8: two 8x8 frames in one row.
- Frame 0, the full heart, in frame coordinates (column, row). The heart is 7 wide and 7 high,
  34 opaque pixels; column 7 and row 7 are transparent, like every pixel not named here:

  | Row | Rim `#181425`, columns | Fill, columns |
  |---|---|---|
  | 0 | 1, 2, 4, 5 | — |
  | 1 | 0, 3, 6 | 1, 2, 4, 5 |
  | 2 | 0, 6 | 1–5 |
  | 3 | 0, 6 | 1–5 |
  | 4 | 1, 5 | 2–4 |
  | 5 | 2, 4 | 3 |
  | 6 | 3 | — |

  The rim has 16 pixels, the fill 18. The fill of frame 0 is `#e43b44`, the red of the palette.
- Frame 1, the empty heart, is frame 0 with `#3a4466` in place of `#e43b44`.
- Neither frame holds the signature colour `#68386c` (INV-6).
- `tools/placeholder-overview.ts` returns the pixels as data; `npm run gen-sprites` writes the
  file. Committed, deterministic, and a unit test fails when file and generator disagree.

### The row

- Unchanged from 0009 in every number: heart i, counted from 0, has its top-left corner at
  surface (4 + 10i, 4), for i from 0 to `max` − 1; frame 0 when i < `current`, else frame 1.
  Hearts are lost from the right.
- With five hearts the row covers x from 4 to 50, with the largest maximum, 13, to 130; between
  two hearts 3 px are free.
- The row is drawn on the surface, not shifted by the camera, after `above` and before the lids
  of the dark, also while the lamp is on.

## Acceptance criteria

1. The game opens with `overview` `{ current: 5, max: 5 }` and five full hearts in the top-left
   corner.
2. Each hit takes one point and turns the rightmost full heart into an empty one.
3. The fifth hit, and no earlier one, starts the dark; the figure wakes with
   `{ current: 5, max: 5 }` and five full hearts.
4. `public/sprites/overview.png` is 16x8 and holds exactly the pixels of the table: per frame
   34 opaque pixels, 16 of them `#181425`, 18 of them `#e43b44` in frame 0 and `#3a4466` in
   frame 1.
5. Heart i is drawn at (4 + 10i, 4), independent of the camera, after `above` and before the
   lids.
6. `npm run gen-sprites` run twice leaves the working tree unchanged.
7. No name in `src/` or `tools/` calls the display a light any more; the lamp's light is not
   affected.
8. All checks are green: unit, architecture, assets, smoke, typecheck, Biome, build, container.

## Test plan

- `tests/unit/overview.test.ts` and `tests/unit/state.test.ts` — the start value is 5: the
  initial state is five of five; five hits in a row, each 90 steps after the last, bring
  `current` to 4, 3, 2, 1 and 0, and only the fifth sets `dark` to 1; waking gives five of five.
  Tests that build their own state with `max: 3` stay as they are — they test the rule, not the
  start value.
- `tests/unit/draw-scene.test.ts` — with `{ current: 3, max: 5 }` five sprites are drawn at
  x = 4, 14, 24, 34 and 44, y = 4, the first three with frame 0, the last two with frame 1; the
  camera does not shift them; the order after `above` and before the lids as before.
- `tests/unit/gen-sprites.test.ts` — the overview sheet: two runs byte-identical and equal to
  the committed file; 16x8; frame 0 equals the table pixel by pixel; frame 1 differs from
  frame 0 only in `#3a4466` for `#e43b44`; 34 opaque pixels per frame, 16 of them the rim.
- `tests/unit/assets.test.ts` unchanged: the sheet falls under the palette rule.
- `tests/arch/` unchanged.
- Smoke spec — `state.overview` is `{ current: 5, max: 5 }` after the handle appears.
- No new fixtures.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not
maximized, the developer console open beside the game; the floor of 0010, the figure at the
spawn in the reception; a terminal in the repository root on the feature branch.

1. Open `http://localhost:5173`.
2. Expected: in the top-left corner of the game five small red hearts with a dark outline stand
   in a row. No yellow lights are there.
3. In the console enter `shadowAi.state.overview`.
4. Expected: `{current: 5, max: 5}`.
5. Walk to the corridor on the right side of the block, to the scrap of paper in front of the
   doorway of the large room. Stand still, do not press `Space`, and let it reach the figure.
6. Expected: the figure is thrown back and blinks. The rightmost heart is now grey-blue; four
   hearts are red.
7. Keep standing and do not press anything until the figure has been thrown a second time.
8. Expected: the fourth heart from the left is grey-blue as well; three hearts are red.
9. Face the scrap and hold `Space` until it has vanished, then keep `Space` held and walk a few
   tiles up and down the corridor.
10. Expected: the scrap is captured; three hearts stay red. The row stays in the corner of the
    screen while the view moves, and the light of the lamp does not cover it.
11. Walk into the large room behind the doorway and let its scraps touch the figure, without
    the lamp, until the screen closes.
12. Expected: the first touch leaves two red hearts, the second one; the screen closes only
    with the third touch in this room, the fifth in all.
13. Expected: after the screen opens the figure stands in the room above the reception, and
    all five hearts are red.
14. Press `F` for fullscreen and look at the hearts; leave fullscreen with `F`, shrink the
    window to about 1000x600 and look again.
15. Expected: at factor 6 and at factor 3 the hearts are sharp, each one the same shape, and
    read as hearts.
16. In the terminal run `npm run gen-sprites` twice, then `git status`.
17. Expected: no changes.
18. Open `public/sprites/overview.png` in an image viewer.
19. Expected: two 8x8 frames side by side: a red heart with a dark outline, and a grey-blue
    heart with the same outline.

**Feel:** Do the hearts read as hearts at a glance, also at factor 3? Is the red right against
carpet, corridor and wall, and is the empty heart clearly empty? Is the row the right size, or
too small, too large, too tight? Are five points the right number against the scraps — is the
dark still a threat?

**Result:** passed 2026-11-13, steps 1–19 (dev server on port 5174, as 5173 was taken by
another project). Feel: the hearts read as hearts at a glance, also at factor 3; the red fits
carpet, corridor and wall, and the empty heart is clearly empty; the size of the row and the
gap between hearts are right; five points are the right number, and the dark stays a threat.

## Open questions

None.
