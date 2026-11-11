# 0007 — The lamp

**Status:** draft
**Milestone:** M3
**Drafted:** 2026-11-11

## Goal

The player holds the lamp and a cone of light appears in front of the figure; the direction keys
sweep it. After this feature the game has its second verb, *shine*, and a cone the first creature
(0008) can freeze in. Nothing is lit yet: the cone itself is the whole feature.

## Scope

**In:**

- `src/game/lamp.ts`: the cone as data and one predicate — `CONE_LENGTH` 48, `lampCone(player)`,
  the apex and the facing, and `inCone(point, cone)`, the test with which 0008 freezes a
  creature; and the constants the renderer places the cone with (see behaviour)
- `update`'s input type, `GameInput`: the four movement actions plus `lamp`, a fifth boolean;
  `main.ts`'s binding table gains `lamp` ← Space, and its `readInput` returns the five actions
- `GameState.lamp = { on }`: on in every step whose input holds `lamp`, off otherwise;
  `createInitialState` starts it off
- `src/game/player.ts`: while the lamp is on the figure stands and turns in place — the direction
  keys change the facing by the rule of 0004, nothing moves, the walk cycle is standing
- `tools/placeholder-lamp.ts`, pure, in the pattern of the figure (`architecture.md` §7), and
  `npm run gen-sprites`, which now also writes `public/sprites/lamp.png`: four 48x48 frames in
  one row, one per facing, a checkerboard of `#fee761` cut to the cone, drawn from the same
  predicate the logic uses
- `SpriteSheet` gains `frameWidth` and `frameHeight`, and `Renderer.drawSprite` draws frames of
  the sheet's own size: the player sheet's are 16x24, the lamp sheet's 48x48
- `render/draw-scene.ts`: when the lamp is on, the cone is drawn after `detail` and before the
  player
- with the implementation: `architecture.md` §2 the lamp in the state and the fifth action, §4
  the binding and that the lamp needs no key-press edge, §5 the draw order and the frame size,
  §7 the lamp generator; `gameplay.md` §2 the lamp as built and §8 the key; `testing.md` §1 and
  §2 the new tests and the smoke change; `plan.md` §4 M3's feature list; the README its status

**Out, explicitly:** anything the light acts on — creatures (0008), shadow walls and traces
(0010, M5) · light strength and the density rule (0010; `gameplay.md` §5) · the battery and the
upgrades (M6) · a lamp-holding pose for the figure (the art pass, `visual.md` §5) · a key-press
edge in `engine/input`, "went down this step" — the lamp is held, not toggled, so the journal
(M4) is the first to need one · gamepad (before M5) · a sound (audio, after M5) · walls that
block the light — decided by the first feature that puts something behind a wall.

## Behaviour

### Holding the lamp

- `lamp` is an action like the four movement actions (`architecture.md` §4): on while any of
  its keys is down, resolved once per frame, the same for every step of the frame. Its key is
  Space. Space is a bound key: pressed without Ctrl, Alt or Cmd its default is prevented, so it
  never scrolls the page.
- The lamp is on in exactly the steps whose input has `lamp` true. No toggle, no edge, no delay:
  the first step that sees Space down has the lamp on, the first step that sees it up has it off.
- `GameState.lamp = { on: boolean }`. It is derived from the input every step and kept in the
  state so that the renderer, which reads state and nothing else, knows what to draw — and so
  that later fields, strength (0010) and charge (M6), join it without a restructure.
- On `blur` and when the tab is hidden every key is released (0004), Space among them: the lamp
  goes off and stays off until Space is pressed again.

### Standing and turning

- While the lamp is on the figure does not move: `x` and `y` stay as they are; no collision and
  no clamp runs.
- The direction keys turn it. The facing follows the movement vector by 0004's rule: a horizontal
  component wins, so down-left faces left; a vertical vector alone faces up or down; a zero
  vector — no key, or keys that cancel — keeps the facing. Turning is immediate: the step that
  sees the key shows the new facing.
- The walk cycle is standing in every step with the lamp on: phase 0, timer 0. A figure that was
  mid-stride when Space went down shows the standing frame in that very step, at the position it
  had reached.
- The step that sees Space up again is an ordinary step of 0004 and 0005: with a direction held
  the figure walks from standing, phase 1, timer 0, 1.333 px; without one it stands.

### The cone

- The apex is the lamp in the hand, held at chest height: 12 px above the feet, on the feet's
  column — (x, y − 12) in map pixels, floating point in the logic like the feet themselves.
- The direction is the facing's unit vector: down (0, 1), up (0, −1), left (−1, 0), right (1, 0).
- A point p is in the cone when, with d its distance from the apex along the direction and s its
  distance from the axis, 0 ≤ d < 48 and |s| ≤ d / 2. The length is half-open like the
  collision intervals of 0005: d = 48 is out. The cone opens with slope 1/2 to each side, so it
  is as wide at its end as it is long — a 48x48 box holds it — an opening of about 53°. The apex
  is in the cone; a point beside the apex is not.
- Both numbers are *tune*: 48 px is three tiles, a quarter of the view's height.
- The cone ignores the map: nothing blocks light in this feature.

### The sprite sheet

- `public/sprites/lamp.png` is 192x48: four 48x48 frames in one row, in `FACINGS` order — down
  (0), up (1), left (2), right (3). The frame index is the facing's index.
- Each frame holds the cone with its apex at one pixel of the frame, in frame coordinates
  (column, row): down (24, 0), up (24, 47), left (47, 24), right (0, 24).
- Pixel (i, j) of a frame is opaque `#fee761` when the point (i, j) lies in the cone whose apex
  is the frame's apex pixel and whose direction is the frame's facing — the rule above on
  integers — and i + j is even; every other pixel is transparent. A checkerboard, so the ground
  shows through the light; opaque pixels never leave the cone, and the picture is the rule. For
  the right-facing frame that is column i lit in rows 24 − ⌊i / 2⌋ … 24 + ⌊i / 2⌋: column 0 is
  the apex alone, column 47 spans rows 1–47, row 0 is never lit. Every frame has 1152 pixels in
  its cone and exactly 576 of them opaque.
- The sheet obeys INV-6 like every PNG under `public/`: one palette colour, alpha 0 or 255, never
  the reserved colour. `#fee761` is the palette's yellow; it is neither the grass `#63c74d` nor
  the path `#e8b796` of the placeholder tiles, so the cone reads on both. The sheet is not a
  tileset: no `.tsj`, and the multiple-of-16 rule does not apply to `public/sprites/`.
- `tools/placeholder-lamp.ts` returns the pixels as data, drawn from `inCone` of
  `src/game/lamp.ts`; `npm run gen-sprites` writes the file beside `player.png`. The file is
  committed, the generator is deterministic, and a unit test fails when the two disagree. When
  the art pass draws the cone by hand (`visual.md` §5), the hand-drawn PNG replaces the file
  under the same name, frame order and apex pixels, and the generator and its tests go; the
  frame size and the apex pixels stay, because the renderer places the frame by them.

### Drawing

- The draw order of a frame becomes: clear, `ground`, `detail`, **the cone, when `lamp.on`**,
  the player, `above`. The cone lies under the figure: the body hides the apex, and the legs or
  the head cover the cone's root, so the figure stays readable on the light.
- With A = (round(x), round(y) − 12) — the apex rounded as the sprite rounds, so cone and figure
  agree pixel for pixel — the frame's top-left corner, before the camera is subtracted, is:

  | Facing | Top-left corner |
  |---|---|
  | down | (A.x − 24, A.y) |
  | up | (A.x − 24, A.y − 47) |
  | left | (A.x − 47, A.y − 24) |
  | right | (A.x, A.y − 24) |

  At the spawn, feet (1024, 734), camera (864, 640): A is (1024, 722), the figure's sprite is at
  screen (152, 70) and the down-facing cone's frame at (136, 82) — its apex at (160, 82), the
  figure's chest row.
- `drawSprite(sheet, frame, x, y)` draws frame `frame` of a sheet whose frames are
  `sheet.frameWidth × sheet.frameHeight` in one row, with its top-left corner at (x, y): the
  source rectangle is (frame × frameWidth, 0, frameWidth, frameHeight), smoothing off as before.
  `engine/sprite`'s `FRAME_WIDTH` and `FRAME_HEIGHT` stay the figure's 16 and 24.
- Near the map's edge a frame may reach beyond the map. The view never does — the camera is
  clamped to the map (0006) — so the surface clips the cone like a tile at the view's edge.

### State

- `GameState = { tick, player, camera, lamp }` with `lamp = { on }`: plain data, the JSON round
  trip exact (INV-1).
- `createInitialState(map)`: the lamp off.
- `update(state, input, content)` sets `lamp: { on: input.lamp }`, steps the player with the
  whole input, and lets the camera follow as before.

## Acceptance criteria

1. Holding Space shows a cone of light in the facing direction, from the figure's chest outward,
   48 px long and as wide at its end, a checkerboard of yellow; releasing Space removes it in the
   same frame.
2. While Space is held the figure does not move; the direction keys turn it in place and the
   cone turns with it; a diagonal faces horizontally; cancelling keys keep the facing.
3. Pressing Space mid-walk stops the figure in that step, in the standing frame, with its facing;
   releasing Space with a direction held resumes walking at once.
4. The cone is drawn over the tiles and under the figure.
5. Switching tabs with Space held turns the lamp off; on return it stays off until Space is
   pressed again.
6. `inCone` is proven by unit tests for each facing: the apex is in, the axis at d = 47.99 is in
   and at d = 48 out, the edges |s| = d / 2 are in and a hundredth beyond out, a point behind the
   apex is out.
7. `npm run gen-sprites` twice in a row leaves `git status` clean; `lamp.png` is 192x48; the
   asset tests pass on it; every opaque pixel is `#fee761`, lies in its frame's cone and on the
   checkerboard; each frame has exactly 576 opaque pixels.
8. The state carries the lamp and survives the JSON round trip with the lamp on.
9. `window.shadowAi.state.lamp.on` is true while Space is held in the smoke test and the figure
   has not moved though ArrowRight was held with it; after the release it is false.
10. CI is green, both smoke runs.

## Test plan

Every number is a pixel.

- `tests/unit/lamp.test.ts` — `lampCone` puts the apex at (x, y − 12) with the player's facing.
  `inCone`, for each of the four facings with the apex at (100, 100): the apex is in; on the
  axis d = 47.99 is in and d = 48 is out; at d = 40, s = 20 and s = −20 are in, s = 20.01 and
  s = −20.01 out; at d = 10, s = 5 is in and s = 5.5 out; d = −0.01 on the axis is out; d = 0
  with s = 0.5 is out.
- `tests/unit/player.test.ts` extended — with `lamp` true: no movement for right, for up-left
  and for all four held, on open ground; the facing follows the keys: right → right, up+left →
  left, up → up, left+right → kept, none → kept; the walk cycle is reset: from phase 3, timer 4
  to phase 0, timer 0 in one step, the position kept; the step after the release with right held
  is phase 1, timer 0 and moves 1.333 px.
- `tests/unit/state.test.ts` extended — the initial state has `lamp: { on: false }`; a step with
  `lamp` true sets `on` true and leaves `x` and `y`; the populated round-trip state ends with the
  lamp on; `update` keeps the camera on the standing figure.
- `tests/unit/draw-scene.test.ts` extended — with the lamp on, `drawSprite` of the lamp sheet
  comes after the last `detail` tile and before the player's sprite, with the facing's index as
  its frame; for feet (20.4, 30.6) and camera (5, 7) the top-left corners are down (−9, 12), up
  (−9, −35), left (−32, −12), right (15, −12); with the lamp off the call list is 0006's and the
  lamp sheet is not touched. The player's sprite keeps frame facing × 5 + phase.
- `tests/unit/gen-sprites.test.ts` extended — the lamp sheet: two runs byte-identical and equal
  to the committed file; 192x48; every opaque pixel `#fee761`; pixel by pixel, opaque ⇔ in the
  frame's cone by `inCone` and i + j even; 576 opaque pixels per frame; the player sheet's tests
  unchanged, now with the sheet's frame size from the sheet.
- `tests/unit/input.test.ts` extended — `resolveActions` with a `lamp` action bound to Space.
- `tests/arch/` unchanged; `src/game/lamp.ts` falls under its rule.
- Smoke spec extended (`testing.md` §1): after the handle appears, `keyboard.down('Space')` and
  poll `state.lamp.on` to be true; `keyboard.down('ArrowRight')`, wait 300 ms; `player.x` is
  still 1024, `player.facing` is right, `player.frame` is 0; `keyboard.up('Space')` and poll
  `state.lamp.on` to be false; `keyboard.up('ArrowRight')`.
- No new fixtures.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not
maximized; the campus of 0006, the figure at the spawn in the courtyard; a terminal in the
repository root on the feature branch.

1. Open `http://localhost:5173`.
2. Expected: the figure stands in the courtyard facing down; no cone of light anywhere.
3. Hold `Space`.
4. Expected: a yellow checkerboard cone appears below the figure — it begins under the body and
   reaches about two tiles below the feet, as wide at its end as it is long; the figure does not
   move.
5. Keep `Space` held and press `D`, then `W`, then `A`, each for a moment.
6. Expected: the figure turns right, then up, then left without moving a pixel; the cone swings
   to each side with it; the figure is drawn over the cone.
7. Keep `Space` and `A` held and add `S`.
8. Expected: the figure keeps facing left and stays in place.
9. Release `Space`, keep `A` held.
10. Expected: the cone vanishes at once and the figure walks left.
11. Release `A`. Hold `D` and, while the figure walks, press and hold `Space`.
12. Expected: the figure stops at once in the standing pose, facing right; the cone points right.
13. With `Space` held, switch to another browser tab, wait two seconds, switch back.
14. Expected: no cone; the figure stands facing right; the cone comes back only when `Space` is
    pressed again.
15. Walk up to the main building's facade, face up, hold `Space`.
16. Expected: the cone lies over the wall and the roof tiles; nothing blocks the light.
17. In the terminal run `npm run gen-sprites`, then again, then `git status`.
18. Expected: no changes.
19. Open `public/sprites/lamp.png` in an image viewer.
20. Expected: four 48x48 frames in one row — the cone pointing down, up, left, right — each a
    yellow checkerboard.

**Feel:** Does 48 px read as a lamp's reach, or as a candle's? Write down the length you would
prefer. Does the checkerboard read as light at factor 6, or as noise? Does standing still while
shining feel deliberate, or does it make you want to walk with the lamp? Is the cone too narrow
or too wide?

**Result:** not yet walked.

## Open questions

None.
