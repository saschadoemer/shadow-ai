# 0005 — Collision

**Status:** approved 2026-11-04
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

Solid tiles stop the figure, and the figure slides along them instead of sticking. This is the
one place where "feels right" is decided by the numbers: the size of the collision box, the
order in which the two axes are resolved, and what counts as touching.

## Scope

**In:**

- the figure's **collision box**: 12x8 px, the lowest 8 px of the sprite, centred under it — with
  the feet at (x, y) the box covers [x − 6, x + 6) × [y − 8, y)
- `src/engine/collision.ts`, generic and game-agnostic (`architecture.md` §1):
  `moveBox(box, dx, dy, grid)` moves an axis-aligned box against a solid grid, first on X, then
  on Y, and snaps the box flush to the solid cell it would enter. A `Box` is its top-left corner,
  width and height; a `SolidGrid` is `width`, `height` and the row-major `solid` array — a
  `TileMap` already is one; the result is the box's new top-left corner
- `src/game/player.ts`: the step becomes vector → `moveBox` → the map-edge clamp of 0004 → facing
  and walk cycle; the clamp stays as a second guard
- `tests/unit/picture-map.ts`: an in-memory `TileMap` from an ASCII picture, `#` solid and `.`
  open, so that a test shows the wall it talks about
- tests that pin the numbers at walls, corners and gaps (test plan), one of them on the loaded
  corridor fixture
- with the implementation: `architecture.md` §2 carries the collision box and the step order;
  `testing.md` §1 the new tests; the README its status

**Out, explicitly:** collision with anything but tiles — NPCs and objects arrive with their
features · pushing, bouncing or knock-back (M3) · corner correction, the nudge that lets a box
which overlaps a corner by a pixel slip past it — the feel step of the acceptance plan decides
whether a later spec wants it · a swept test: the resolver assumes a displacement below one tile
per call, which the step guarantees (1.333 px) · a check that the spawn is on open ground
(0006) · any change to the smoke spec.

## Behaviour

### The box and the grid

- The feet position (x, y) of 0004 stays the player's position. The collision box is the lowest
  8 px of the 16x24 sprite, 12 px wide, centred: left edge x − 6, right edge x + 6, top edge
  y − 8, bottom edge y. The 2 px of sprite left and right of the box may overlap a wall on
  screen; the upper 16 px of the sprite are not collided at all, so the figure stands in front
  of a wall with its body drawn over the wall's tiles (`visual.md` §3).
- Tile (c, r) covers [16c, 16c + 16) × [16r, 16r + 16). A cell is solid when the map's solid
  grid says so: the union of `ground`, `detail` and `above` (INV-7, `architecture.md` §6). The
  `above` layer counts: the roof's lower edge is as solid as the roof.
- Intervals are half-open, and the box overlaps a cell only when their open intersection is not
  empty: a box whose right edge is exactly at a cell's left edge does not overlap it. A box flush
  against a wall therefore moves freely along it, and a figure stopped by a wall ends at
  distance 0, not 1. The cells a box covers are columns ⌊left / 16⌋ to ⌈right / 16⌉ − 1 and
  rows ⌊top / 16⌋ to ⌈bottom / 16⌉ − 1.
- Cells outside the map are not solid. The map edge is the clamp's job, as in 0004.

### Resolving a step

Per step, in this order:

1. The movement vector and "moving" as in 0004: the sum of the actions, normalized; moving means
   the vector is non-zero, before collision and clamp.
2. dx = vector.x × 1.333, dy = vector.y × 1.333.
3. X: when dx is not 0, the box moves by dx. If it then overlaps any solid cell, it is moved back
   flush: for dx > 0 its right edge goes to the smallest left edge among the overlapped solid
   cells, for dx < 0 its left edge to the largest right edge among them. When dx is 0, nothing
   happens on X.
4. Y: the same with dy: for dy > 0 the bottom edge goes to the smallest top edge among the
   overlapped solid cells, for dy < 0 the top edge to the largest bottom edge.
5. The clamp of 0004: feet x within [8, mapWidth − 8], feet y within [24, mapHeight].
6. Facing and walk cycle from the vector, as in 0004.

What follows from the order:

- **Stopping.** Walking into a wall ends with the box flush against it: from the left the feet x
  is the wall's left edge − 6, from the right its right edge + 6, from above the feet y is the
  wall's top edge, from below its bottom edge + 8. A figure held by a wall is still moving: it
  keeps its facing and its walk cycle and steps in place, like a figure held by the clamp.
- **Sliding.** Moving diagonally into a wall keeps the component along the wall: the blocked axis
  is snapped, the free axis moves its 0.943 px, so the figure slides at 0.943 px per step —
  56.6 px/s, 71 % of walking speed. Nothing is renormalized. Facing follows the input, not the
  movement: a figure sliding up a wall on its right while `D` and `W` are held faces right.
- **Corners.** X is resolved before Y, and each axis is checked only against the cells the box
  overlaps after that axis moved. A box approaching a convex corner diagonally is caught by the
  axis that actually overlaps the cell: a box below a wall that moves up-right keeps its full x
  movement and is stopped on y; a box left of a wall that moves up-right is stopped on x and
  keeps its y movement. When both would overlap, X is snapped first and Y then moves freely. The
  figure never stops dead at a corner: it slides along the face it touched until the box has
  cleared the cell, then continues diagonally.
- **Gaps.** The box is 12 px wide and 8 px high, so a 16-px gap lets it through, and it stands
  in a one-tile doorway. Sliding along a wall into a gap enters it: the first step whose box
  lies inside the gap's column moves on y. The window is small — for a doorway at column c the
  feet x must lie within [16c + 6, 16c + 10], 4 px wide — and a slide crosses it in five steps,
  so the figure enters within five steps of reaching the doorway.
- **Already inside.** Only an axis that moved is resolved, so a box placed inside a solid cell and
  standing still stays there; one that moves on an axis is pushed out against that movement.
  Where the figure may start is the map's business; 0006 adds the check.

## Acceptance criteria

1. Walking straight into a solid tile stops the figure with the box flush against it: the feet x
   at the tile's edge ± 6, or the feet y at the tile's top edge or at its bottom edge + 8. The
   figure keeps facing its input and keeps its walk cycle.
2. Walking diagonally into a wall slides the figure along it at 0.943 px per step, facing the
   input's horizontal direction.
3. Walking diagonally past a wall's convex corner neither stops nor jerks the figure: it slides
   along the face until the box clears the corner, then continues diagonally.
4. The figure walks through a one-tile gap and stands in it; sliding along a wall into the gap
   enters it.
5. The pond, the fence, the closed door, the roof and the roof's lower edge from `above` stop the
   figure like the wall does.
6. The unit tests of the test plan pass: `collision.test.ts` and the extended `player.test.ts`.
7. The smoke spec is unchanged and green; CI is green.

## Test plan

Every number below is a pixel; a box in the resolver tests is 12x8 and named by its top-left
corner. `tests/unit/picture-map.ts` builds a `TileMap` from rows of `#` and `.`: `ground` all
grass, `detail` and `above` all `EMPTY`, `solid` from the picture, the spawn as given. The
picture below is the solid grid of `tests/fixtures/maps/corridor.tmj`, 20x12: a wall in column
10 with a one-tile gap in row 6, a lone tile at (4, 3) and one at (2, 2).

```
    01234567890123456789
 0  ....................
 1  ....................
 2  ..#.......#.........
 3  ....#.....#.........
 4  ..........#.........
 5  ..........#.........
 6  ....................
 7  ..........#.........
 8  ..........#.........
 9  ..........#.........
10  ....................
11  ....................
```

- `tests/unit/collision.test.ts` — `moveBox` on the picture above:
  - stop flush: box (147, 64) moved (2, 0) ends at (148, 64), its right edge at 160; box
    (177, 64) moved (−2, 0) ends at (176, 64); box (66, 39) moved (0, 2) ends at (66, 40), its
    bottom edge at 48; box (66, 65) moved (0, −2) ends at (66, 64);
  - a larger displacement is snapped the same way: box (147, 64) moved (10, 0) ends at (148, 64);
  - touching is not overlapping: box (148, 64), flush against the wall, moved (0, 2) ends at
    (148, 66); moved (2, 0) it stays at (148, 64);
  - sliding: box (148, 64) moved (0.943, 0.943) ends at (148, 64.943);
  - corners, no snag: box (51, 65), one pixel left of and below the tile at (4, 3), moved (2, −2)
    ends at (53, 64) — full x, snapped y; box (81, 39), one pixel right of and above it, moved
    (−2, 2) ends at (79, 40); box (51, 60), left of the tile and overlapping its rows, moved
    (2, −2) ends at (52, 58) — snapped x, full y;
  - the gap: box (148, 100) moved (2, 0) twenty times ends at (188, 100), through the wall; box
    (148, 94), which covers rows 5 and 6, moved (2, 0) stays at (148, 94);
  - no movement, no resolution: box (66, 52), inside the tile at (4, 3), moved (0, 0) stays;
  - outside the map is open: box (1, 64) moved (−2, 0) ends at (−1, 64); box (308, 64) moved
    (2, 0) ends at (310, 64);
  - the fixture: the gap case once more on `corridor.tmj` loaded through `parseTileset` and
    `parseTileMap`, which proves that the loaded grid is the grid the resolver reads.
- `tests/unit/player.test.ts` extended — `stepPlayer` on the picture map, feet positions:
  - into a wall from the left: from (152, 72), `right` held, two steps end at x = 154 — the
    wall's left edge 160 minus 6 — and ten steps still at 154, facing right, phase 2 and timer
    1.5 after ten steps as on open ground;
  - into a tile from below and from above: from (72, 74), `up` held, two steps end at y = 72 —
    the tile's bottom edge 64 plus 8; from (72, 46), `down` held, two steps end at y = 48, the
    tile's top edge;
  - sliding: from (154, 72), `up` and `right` held, one step ends at (154, 71.057), facing right;
  - past a corner: from (154, 150), `down` and `right` held, 20 steps leave x at 154 while y
    grows by 0.943 per step; after 30 steps the feet are at (163.43, 178.28) ± 0.01 — ten
    steps of x movement once the box cleared the wall's lower end;
  - through the gap: from (140, 108), `right` held, 30 steps end at x = 180; from (140, 100),
    whose box covers rows 5 and 6, 30 steps end at x = 154;
  - sliding into the gap: from (154, 120), `up` and `right` held, 9 steps leave x at 154 with
    y = 111.51; after 38 steps y is 104 — the box's top against the gap's ceiling — and x is
    181.34 ± 0.01: the figure slid up the wall, entered the gap and slid along its ceiling;
    after 40 steps it is through, at (183.23, 102.11) ± 0.01, rising again on open ground; at no
    step of the 40 does x shrink;
  - the clamp still holds at the map's edge on open ground, as in 0004.
- `tests/unit/state.test.ts` unchanged: the player's shape does not change.
- Smoke spec unchanged.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not maximized;
the test map of 0003. Its landmarks, in tile columns and rows counted from 0 at the top left:
the wall ring at columns 12–16, rows 1–4, with its one-tile opening in the bottom edge at
column 14 and the closed door in its left side at row 2; the roof patch at columns 2–5, rows 1–3,
whose lowest row is the roof's edge drawn over the figure; the pond at columns 3–6, rows 8–10;
the fence in row 9, columns 11–18. The figure spawns below and left of the path crossing.

1. Open `http://localhost:5173`.
2. Expected: the figure stands at the spawn, facing down, as in 0004.
3. Hold `W` for between half a second and one second, so that the figure's feet are level with
   the ring's left side. Then hold `D` until the figure stops moving, and keep holding it.
4. Expected: the figure stops with its feet at the wall's left edge; the right two pixel columns
   of the sprite overlap the wall. It faces right and keeps stepping in place.
5. Open the browser console and enter `shadowAi.state.player.x`.
6. Expected: `186`.
7. Keep holding `D` and add `W`.
8. Expected: the figure slides up along the wall, visibly slower than it walks on open ground,
   facing right, past the door tile, until it reaches the top of the map and steps in place.
9. Release `W`. Keep holding `D` and add `S`.
10. Expected: the figure slides down along the wall and, at the ring's bottom-left corner,
    continues down-right under the ring without a stop or a jerk.
11. Release both keys. Hold `W` until the figure stops under the ring's bottom edge. Then add
    `D` if the figure is left of the opening, or `A` if it is right of it, and keep both held.
12. Expected: the figure slides along the ring's bottom edge, enters the opening without a stop,
    slides up the opening's side into the ring, and ends against the ring's inner walls,
    stepping in place.
13. Release both keys. Walk back into the opening and release when the figure stands in it.
14. Expected: the figure stands in the opening; the sprite overlaps the wall on one side by at
    most two pixel columns.
15. Walk to the pond at the lower left and into it from the right.
16. Expected: the figure stops at the pond's edge and keeps stepping in place.
17. Walk around the pond and into it from above.
18. Expected: the figure stops with its feet on the pond's upper edge.
19. Walk into the fence line from above.
20. Expected: the figure stops with its feet just above the fence; the fence stays visible below
    the figure.
21. Walk around the fence's right end, along the right edge of the map, and into the fence from
    below.
22. Expected: the figure stops with its upper body drawn over the fence; where they overlap the
    fence is hidden behind the figure.
23. Walk to the ring's left side and against the door tile, the second tile from the top.
24. Expected: the door is solid; the figure stops as at the wall.
25. Walk to the roof patch at the top left and up into it from below.
26. Expected: the figure stops; only its legs show below the roof's lower edge, the body is
    hidden behind the roof.
27. Walk into the roof patch from the right.
28. Expected: the figure stops at the roof's right edge as at the wall.

**Feel:** Does the figure ever catch on a corner when brushing past it? Does stopping at a wall
feel instant or mushy? Does the slide along a wall, at 71 % of walking speed, feel natural or
sluggish? Is the box right: can the figure get close enough to things, and is the one-tile
opening passable without fiddling? Note the number you would change.

**Result:** pass or fail per step.

## Open questions

None.
