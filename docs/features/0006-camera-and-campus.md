# 0006 — Camera and campus

**Status:** draft
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

The camera follows the figure across a map larger than the screen, and that map is the company's
campus: every region of `world.md` §1 laid out as a footprint. After this feature there is a
world to walk, and M2 is complete.

## Scope

**In:**

- `src/engine/camera.ts`: the camera is centred on the collision box's centre, clamped so the
  320x180 view never leaves the map, and rounded to integer pixels before drawing
- the renderer draws tiles and the player relative to the camera; only tiles inside the view are
  drawn
- `public/maps/campus.tmj`: **128x96 tiles** (2048x1536 px), authored in Tiled with the
  placeholder tileset. Every region of `world.md` §1 as a footprint: the courtyard with reception
  and the data protection officer's office as closed buildings, the seven department buildings
  with doors, the meeting rooms, the canteen, the parking lot, the basement entrance to the
  server room as a door in the ground floor of the main building; paths connecting them, fences,
  green and water as boundaries; the outer ring solid. `spawn` in the courtyard.
- `main.ts` loads the campus instead of the test map; the test map moves to
  `tests/fixtures/test-map.tmj`
- the loader additionally checks that `spawn` is on a walkable tile

**Out, explicitly:** entering any building (M6) · camera smoothing or dead zone (deferred,
`plan.md` §5) · region names on screen or any text (M4) · shadow density data (M3).

## Behaviour

- Camera x = round(clamp(playerCentreX − 160, 0, mapWidth − 320)); y likewise with 90 and 180.
  The clamp keeps the view inside the map; the rounding keeps tile edges seamless.
- With the camera at integer positions and the player drawn at a rounded position, no seam or
  shimmer appears at any scale factor.
- Drawing iterates only the tile columns and rows that intersect the view: at most 21x13 tiles
  per layer per frame.

## Acceptance criteria

1. The game opens on the courtyard with the figure at the spawn; the view is inside the map.
2. Walking moves the camera with the figure; the figure stays centred except near map edges.
3. At every edge and corner of the map the view stops at the map boundary and the figure walks
   toward the screen edge; nothing outside the map is ever visible.
4. No seams between tiles and no shimmering edges while scrolling, at factors 3, 4 and 6.
5. Every region of `world.md` §1 can be reached on foot and identified by its footprint: the
   courtyard, the seven department buildings, meeting rooms, canteen, parking lot, the server-room
   door.
6. Every building is closed: its footprint is solid and its door is a closed-door tile.
7. Camera unit tests pass: centring, all four clamps, rounding.
8. The loader rejects a map whose `spawn` is on a solid tile.
9. CI is green.

## Test plan

- `tests/unit/camera.test.ts` — centring on a 2048x1536 map; clamping at each edge and corner;
  rounding of a fractional centre; a map exactly the size of the view yields camera (0, 0).
- `tests/unit/tiled.test.ts` extended — rejects `tests/fixtures/spawn-on-solid.tmj`.
- `tests/unit/campus.test.ts` — the committed campus loads, is 128x96, has its spawn on a
  walkable tile, and its outer ring is solid.
- Smoke spec unchanged in intent, now on the campus.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080.

1. Open `http://localhost:5173`.
2. Expected: the figure stands in a courtyard between buildings; the whole view is map.
3. Walk in any direction for three seconds.
4. Expected: the map scrolls, the figure stays near the centre of the screen.
5. Walk to the top-left corner of the campus.
6. Expected: the view stops at the map's edge and the figure walks to the corner of the screen; no
   dark area appears beyond the map.
7. Repeat for the bottom-right corner.
8. Expected: the same.
9. While scrolling, watch the tile edges.
10. Expected: no flicker, no thin lines between tiles.
11. Resize the window to about 1000x600 and scroll again.
12. Expected: still no flicker or lines.
13. Walk the campus and find: the parking lot, the canteen, the meeting rooms, the large main
    building with the server-room door, each department building.
14. Expected: all are found without help, and every door is closed.

**Feel:** Does the campus read as a company's grounds in placeholder tiles? Which region is hardest
to identify? Does the map feel large enough to explore — or too large to walk?

**Result:** pass or fail per step.

## Open questions

None.
