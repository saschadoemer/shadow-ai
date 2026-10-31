# 0004 — The figure

**Status:** draft
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

The player's figure stands on the test map and walks in eight directions with a walk animation,
drawn between the ground and the `above` layer. Walls do not stop it yet; that is 0005.

## Scope

**In:**

- `tools/gen-sprites.ts`, run with `npm run gen-sprites`: writes `public/sprites/player.png`
  deterministically — a 16x24 placeholder figure, four facings (down, up, left, right), five frames
  each (one standing, four walking), 20 frames in one row; palette colours, facing readable by the
  position of two eye pixels and the lanyard
- `src/engine/input.ts`: keyboard state — which keys are down this step — and release of all keys
  on `blur` and `visibilitychange`
- the action table in `main.ts`: `up` ← ArrowUp, W; `down` ← ArrowDown, S; `left` ← ArrowLeft,
  A; `right` ← ArrowRight, D; `fullscreen` ← F
- `GameState.player`: `x`, `y` (feet position in pixels, floating point), `facing`, `frame`,
  `frameTimer`; the player starts at the map's `spawn`
- `src/game/player.ts`: movement at **80 px/s** (*tune*), diagonal vector normalized, opposite
  actions cancel; facing follows the horizontal component on diagonals and stays when standing
  still; walk cycle at 8 frames per second while moving, standing frame when not; the figure is
  clamped to the map so its feet stay inside it
- `Renderer.drawSprite(image, frame, x, y)` and draw order `ground`, `detail`, player, `above`

**Out, explicitly:** collision with solid tiles (0005) · a following camera (0006) · gamepad
(before M5) · remappable keys (with the first menu).

## Behaviour

- Position is kept as floating point and rounded only for drawing, so 80 px/s produces an even
  walk at 60 Hz (1.333 px per step).
- Diagonal speed equals axis speed: a diagonal step moves 0.943 px on each axis.
- Holding left and right together produces no horizontal movement; the same for up and down.
- When the window loses focus every key counts as released: the figure stops and shows its
  standing frame.
- The figure's drawing position is its feet position minus 8 px horizontally and 24 px
  vertically, so the feet sit on the tile grid.

## Acceptance criteria

1. The figure appears at the spawn point of the test map, facing down, standing.
2. Arrow keys and WASD both move it; eight directions work; the walk cycle runs while moving and
   stops on release.
3. Walking straight across the 320 px width takes 4.0 s ± 0.2 s.
4. Facing: moving down-right shows the right-facing frames; after stopping, the last facing is
   kept.
5. Opposite keys cancel.
6. Switching tabs while holding a key stops the figure; on return it stands.
7. Standing just below the roof patch, the figure's upper body is hidden by the roof edge from
   `above`; standing on the fence line, the figure is drawn over it.
8. The figure cannot leave the map.
9. `npm run gen-sprites` is deterministic; the asset test passes on the sprite sheet.
10. CI is green.

## Test plan

- `tests/unit/player.test.ts` — step distances on an axis and on a diagonal; opposite keys
  cancel; facing on diagonals and after stopping; frame advances every 7.5 steps while moving and
  resets when standing; clamping at the map edge.
- `tests/unit/input.test.ts` — the key-to-action table; blur releases everything.
- `tests/unit/state.test.ts` — round trip with a populated player.
- `tests/arch/` unchanged, now with real code to check.
- Smoke spec extended: hold `ArrowRight` for one second; the player's x in the exposed debug
  state has grown by at least 70 px.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080; the test map of 0003.

1. Open `http://localhost:5173`.
2. Expected: the figure stands at the spawn point, facing down, not animating.
3. Hold `ArrowRight` for about two seconds, release.
4. Expected: the figure walks right with a visible step cycle and stops facing right.
5. Hold `W` and `A` together for two seconds, release.
6. Expected: it walks up-left at the same pace as in step 4 and stops facing left.
7. Hold `ArrowLeft` and `ArrowRight` together.
8. Expected: it does not move.
9. Walk to the left edge of the map and keep holding `A`.
10. Expected: it stops at the edge and keeps walking in place facing left.
11. Walk onto the fence line.
12. Expected: the figure is drawn over the fence.
13. Walk to just below the roof patch.
14. Expected: the roof's lower edge covers the figure's head and shoulders.
15. Hold `D`, switch to another tab, wait two seconds, switch back.
16. Expected: the figure stands still where it was when you switched.

**Feel:** Does 80 px/s feel brisk but controlled? Write down the speed you would prefer. Does
the walk cycle look like walking, or like sliding?

**Result:** pass or fail per step.

## Open questions

None.
