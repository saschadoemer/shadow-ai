# 0004 — The figure

**Status:** draft
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

The player's figure stands on the test map and walks in eight directions with a walk animation,
drawn between the ground and the `above` layer. Walls do not stop it yet; that is 0005.

## Scope

**In:**

- `tools/placeholder-player.ts` and `tools/gen-sprites.ts`, run with `npm run gen-sprites`, in
  the pattern of the tile generator (`architecture.md` §7): the first returns the pixels as
  data, the second writes `public/sprites/player.png` deterministically — a 16x24 placeholder
  figure, four facings, five frames each, 20 frames in one row, palette colours; the facing is
  readable by the eyes and the lanyard (see behaviour)
- `src/engine/input.ts`: the keyboard — which key codes are down — with release of every key on
  `blur` and on `visibilitychange` to hidden, and a pure function that resolves the held keys
  through a binding table into actions
- the binding table in `main.ts` (`architecture.md` §4): `up` ← ArrowUp, W; `down` ← ArrowDown,
  S; `left` ← ArrowLeft, A; `right` ← ArrowRight, D; `fullscreen` ← F
- `GameState.player`: `x`, `y` (the feet position in pixels, floating point), `facing`, `frame`,
  `frameTimer`; the initial state is built from the map, and the player starts at its `spawn`
- `update(state, input, content)` as `architecture.md` §2: `input` is the four movement actions
  as booleans, `content` the loaded map
- `src/game/player.ts`: movement at **80 px/s** (*tune*), diagonal vector normalized, opposite
  actions cancel; facing follows the horizontal component on diagonals and stays when standing
  still; walk cycle at 8 frames per second while moving, the standing frame when not; the figure
  is clamped so that it stays inside the map
- `Renderer.drawSprite(sheet, frame, x, y)` and `src/render/draw-scene.ts`, which draws
  `ground`, `detail`, the player, `above`; `draw-map.ts` gains a per-layer entry point for it
- `main.ts` keeps the state it rendered last and exposes it as `window.shadowAi.state`, the
  game's one global, so the smoke test can read the player's position
- with the implementation: `architecture.md` §1, §2, §4, §5 and §7 carry the player state, the
  input path, `drawSprite`, the sprite generator and the debug handle; `testing.md` §1 and §2
  the new tests and the smoke change; the README its status

**Out, explicitly:** collision with solid tiles (0005) — the figure walks over the pond, the
fence and the walls · a following camera (0006) · gamepad (before M5) · remappable keys (with
the first menu) · a key-press edge for the game, "went down this step" in `architecture.md` §4:
nothing in the game needs one yet, and `lamp` (M3) brings it.

## Behaviour

### The sprite sheet

- `public/sprites/player.png` is 320x24: 20 frames of 16x24 in one row. Frame index =
  facing × 5 + phase, facings in the order down (0–4), up (5–9), left (10–14), right (15–19);
  phase 0 is standing, phases 1–4 are the walk cycle in order.
- The placeholder figure, in Endesga 32: hair `#3e2731`, skin `#e8b796`, shirt `#124e89`,
  trousers `#262b44`, shoes and eyes `#181425`, lanyard `#feae34`. Everything outside the figure
  is transparent (alpha 0). Facing down shows two eyes and the lanyard; facing up shows hair only
  and no lanyard; facing left shows one eye at the left edge of the face, facing right one at the
  right edge. Phases 1 and 3 have one leg forward, left then right; phases 2 and 4 are the
  standing pose raised by 1 px. So the standing frame differs from every walking frame, and the
  four facings differ from each other.
- The sheet is not a tileset: it lives under `public/sprites/`, has no `.tsj`, and the
  multiple-of-16 rule applies to `public/tiles/` only. The palette, alpha and reserved-colour
  rules apply to it like to every PNG under `public/` (INV-6).
- `drawSprite(sheet, frame, x, y)` draws frame `frame` of a sheet of 16x24 frames with its
  top-left corner at (x, y), from the decoded image like `drawTile`, smoothing off.

### Input

- `engine/input` records `keydown` and `keyup` by `event.code`, so the physical key counts and
  the layout does not matter: W is W on QWERTZ and on QWERTY. A `keydown` with `repeat` changes
  nothing.
- On `blur` of the window and on `visibilitychange` to hidden every key is released.
- Once per frame, before the steps of that frame, `main.ts` resolves the held keys through the
  binding table into the four movement actions; every step of that frame sees the same actions.
  An action is on when any of its keys is down.
- `fullscreen` stays what 0002 made it: toggled in `main.ts` on the `keydown` of F without
  `repeat` and without Ctrl, Alt or Cmd. It never reaches the game.
- The default of a bound key pressed without a modifier is prevented, so the arrow keys never
  scroll the page.

### Movement

- Speed is 80 px/s: 1.333 px per step. The position is kept as floating point and rounded with
  `Math.round` only for drawing, so the walk is even at 60 Hz.
- The movement vector is the sum of the active actions, normalized: a diagonal step moves
  0.943 px on each axis, so diagonal speed equals axis speed.
- Opposite actions cancel: left and right together give no horizontal movement, up and down
  together none vertical. With all four held the vector is zero.
- "Moving" means the vector is non-zero, before the clamp. Facing follows the vector: a
  horizontal component wins, so down-right faces right; a vertical vector alone faces up or
  down; a zero vector keeps the facing.
- Clamp: the feet x stays within [8, mapWidth − 8] and the feet y within [24, mapHeight], both in
  pixels, so the whole 16x24 sprite stays inside the map. A figure held by the clamp is still
  moving: it keeps its facing and its walk cycle and steps in place.
- On the test map the camera is fixed (0006), so the lowest 12 px of the map lie below the
  surface: a figure walking there is clipped at the bottom edge. Expected until 0006.

### Animation

- `frame` is the phase, 0–4; `frameTimer` counts steps. While moving, `frameTimer` grows by 1
  per step; when it reaches 7.5 the phase advances, 1 → 2 → 3 → 4 → 1, and 7.5 is subtracted.
  The cycle thus runs at 8 frames per second, alternating 8 and 7 steps per frame. The first
  step of moving shows phase 1 at once.
- When not moving the phase is 0 and the timer 0.
- The sprite's top-left corner is at (round(x) − 8, round(y) − 24): the feet are the bottom
  centre of the sprite, so they sit on the tile grid and the figure stands on its tile.

### State

- `GameState.player = { x, y, facing, frame, frameTimer }`, with `facing` one of `'down'`,
  `'up'`, `'left'`, `'right'`: numbers and strings, so the JSON round trip is exact (INV-1).
- The initial state is built from the map: the player starts at `spawn`, facing down, phase 0,
  timer 0.

### The debug handle

- `main.ts` keeps the state it passed to the last `render` and exposes it as
  `window.shadowAi.state`, read-only by convention. It is the game's only global and exists in
  every build, because the smoke test runs against the dev server and against the container
  alike. `src/game/` does not know it (INV-2); nothing in the game reads it.

## Acceptance criteria

1. The figure appears at the spawn point of the test map, facing down, standing.
2. Arrow keys and WASD both move it; eight directions work; the walk cycle runs while moving and
   stops on release.
3. Walking from the left edge of the map to the right edge takes 3.8 s ± 0.2 s: 304 px at
   80 px/s.
4. Facing: moving down-right shows the right-facing frames; after stopping, the last facing is
   kept.
5. Opposite keys cancel.
6. Switching tabs while holding a key stops the figure; on return it stands.
7. Standing just below the roof patch, the figure's upper body is hidden by the roof edge from
   `above`; standing on the fence line, the figure is drawn over it.
8. The figure cannot leave the map: it stops at every edge with its whole sprite still inside
   and keeps stepping in place.
9. `npm run gen-sprites` twice in a row leaves `git status` clean; the asset tests pass on
   `public/sprites/player.png`.
10. `window.shadowAi.state.player` reports the position: after one second of `ArrowRight` from
    the spawn, `x` has grown by at least 70 px.
11. CI is green.

## Test plan

- `tests/unit/player.test.ts` — step distances on an axis (1.333 px) and on a diagonal
  (0.943 px per axis); opposite actions cancel; all four held gives no movement; facing on
  diagonals, on vertical movement and after stopping; the phase advances after 8, then 7 steps
  and cycles 1–4; standing resets phase and timer; the clamp at each of the four edges, and a
  clamped figure still animates and faces its actions; the initial state from a map's spawn.
- `tests/unit/input.test.ts` — a key goes down and up by code; `repeat` changes nothing;
  release-all clears every key; a binding table resolves held keys to actions, one action from
  either of two keys.
- `tests/unit/gen-sprites.test.ts` — two runs in memory are byte-identical and equal to the
  committed PNG; the sheet is 320x24; for each facing the standing frame differs from every
  walking frame; the four standing frames differ from each other.
- `tests/unit/draw-scene.test.ts` — with a recording fake renderer: the player is drawn after
  `detail` and before `above`, at (round(x) − 8, round(y) − 24), with frame facing × 5 + phase.
- `tests/unit/state.test.ts` — the round trip with a populated player.
- `tests/arch/` unchanged, now with real code in `src/game/` to check.
- Smoke spec extended (`testing.md` §1): `page.keyboard.down('ArrowRight')`, wait 1000 ms,
  `page.keyboard.up`; `window.shadowAi.state.player.x` read through `page.evaluate` has grown by
  at least 70 px from the spawn's 136.
- No new fixtures: the player tests use a small in-memory map; the smoke test uses the test map.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not
maximized; the test map of 0003; a terminal in the repository root on the feature branch.

1. Open `http://localhost:5173`.
2. Expected: the figure stands below and left of the path crossing, facing down — both eyes and
   the lanyard visible — not animating.
3. Hold `ArrowRight` for about two seconds, release.
4. Expected: the figure walks right with a visible step cycle and stops facing right.
5. Hold `W` and `A` together for two seconds, release.
6. Expected: it walks up-left at the same pace as in step 4 and stops facing left.
7. Hold `ArrowLeft` and `ArrowRight` together.
8. Expected: it does not move and shows the standing frame.
9. Walk to the left edge of the map and keep holding `A`.
10. Expected: it stops with its left side at the edge of the map and keeps stepping in place,
    facing left.
11. Walk onto the fence line at the bottom right.
12. Expected: the figure is drawn over the fence.
13. Walk to just below the roof patch at the top left, the feet one tile below the roof's lower
    edge.
14. Expected: the roof's lower edge covers the figure's head and shoulders; the feet stay
    visible.
15. Hold `D`, switch to another tab, wait two seconds, switch back.
16. Expected: the figure stands still where it was when you switched, facing right.
17. Open the browser console and enter `shadowAi.state.player`.
18. Expected: an object with `x`, `y`, `facing: "right"`, `frame: 0` and `frameTimer: 0`.
19. In the terminal run `npm run gen-sprites`, then again, then `git status`.
20. Expected: no changes.
21. Open `public/sprites/player.png` in an image viewer.
22. Expected: 20 frames of 16x24 in one row — five facing down, five up, five left, five right —
    the first of each five standing.

**Feel:** Does 80 px/s feel brisk but controlled? Write down the speed you would prefer. Does
the walk cycle at 8 frames per second look like walking, or like sliding? Does the figure read
as a person at 16x24?

**Result:** pass or fail per step.

## Open questions

None.
