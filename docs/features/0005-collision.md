# 0005 — Collision

**Status:** draft
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

Solid tiles stop the figure, and the figure slides along them instead of sticking. This is the
one place where "feels right" is decided by the numbers.

## Scope

**In:**

- the figure's collision box: **12x8 px**, centred horizontally under the sprite, its bottom edge
  at the feet position
- `src/engine/collision.ts`: resolve a movement against the solid grid on the X axis first, then
  on the Y axis, each clamped to the nearest solid edge the box would cross
- `src/game/player.ts` uses it; the map-edge clamp of 0004 stays as a second guard
- fixtures and tests that pin the behaviour at walls and corners

**Out, explicitly:** collision with anything but tiles (NPCs and objects arrive with their
features) · pushing, bouncing or knock-back (M3).

## Behaviour

- Per step the X movement is applied and, if the box then overlaps a solid tile, the box is
  moved back flush to that tile's edge. Then the same for Y. Moving diagonally into a wall thus
  keeps the component along the wall: the figure slides.
- A box that approaches a solid tile's corner diagonally is not caught on it: whichever axis would
  overlap is resolved, the other keeps moving.
- The box is smaller than a tile, so the figure fits through one-tile gaps and can stand in a
  one-tile doorway.
- Solid is what the tileset says (`solid` property, INV-7). `ground`, `detail` and `above` all
  contribute to the solid grid; a solid tile on any layer is solid.

## Acceptance criteria

1. Walking into the wall block stops the figure with its feet flush against the wall; no overlap,
   no gap larger than one pixel.
2. Walking diagonally into a wall slides the figure along it at the component speed.
3. Walking diagonally past a wall's corner does not snag.
4. The figure walks through a one-tile gap and stands in it.
5. The pond and the fence stop the figure like the wall does; the closed door and the roof are
   solid.
6. Unit tests on the corridor fixture pass: stopping distance, sliding, corner, gap.
7. CI is green.

## Test plan

- `tests/unit/collision.test.ts` on `tests/fixtures/corridor.tmj` (a corridor with one solid
  tile, a corner and a one-tile gap): moving 2 px into a wall from 1 px away ends 0 px away;
  moving (1, 1) along a wall ends moved (0, 1); approaching a corner at (1, 1) from a position
  that overlaps only in x ends moved (0, 1); a 12-px box passes a 16-px gap.
- `tests/unit/player.test.ts` extended: the player uses the resolver.
- Smoke spec unchanged.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080; the test map of 0003.

1. Open `http://localhost:5173`. Walk right into the wall block and keep holding `D`.
2. Expected: the figure stops at the wall and walks in place; its feet touch the wall, the upper
   body overlaps the wall tiles above the feet.
3. Still at the wall, hold `D` and `W` together.
4. Expected: the figure slides upward along the wall at walking pace.
5. Walk to a corner of the wall block and move diagonally past it.
6. Expected: it passes without a stop or a jerk.
7. Walk into the one-tile doorway in the wall.
8. Expected: it enters and can stand there.
9. Walk into the pond, then into the fence line.
10. Expected: both stop the figure like the wall.
11. Walk against the closed door and the roof patch.
12. Expected: both are solid.

**Feel:** Does the figure ever catch on a corner when brushing past it? Does stopping at a wall
feel instant or mushy?

**Result:** pass or fail per step.

## Open questions

None.
