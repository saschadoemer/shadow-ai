# 0015 — The moving floor

**Status:** draft
**Milestone:** M3
**Drafted:** 2026-11-13

## Goal

The floor of 0013 stands still. After this feature it moves: four colleagues walk between
their desk and a printer, a coat rack or the coffee, a dog circles a seating corner in every
room, a robot vacuum drives its lanes in every room, and two drones fly over desks. Nothing of
it can be talked to, touched or caught; the player walks through it, and what walks on the
ground stops while the player is close.

## Scope

Built on 0013 as merged: every route below is checked against the floor of 0013. If the walk of
0013 moves furniture, the route tables here are revised with the author before the
implementation starts. Built before 0014: the walk visits all eight rooms, and a shadow wall in
a doorway would close some of them.

**In:**

- Four kinds of mover: `person` (4), `dog` (8), `vacuum` (8), `drone` (2) — 22 in all, one
  route each.
- 86 named points in the `objects` layer of `public/maps/floor.tmj`, from a route table in
  `tools/floor-layout.ts`; each point may carry the custom property `pause`.
- `GameState.movers`, and `src/game/mover.ts` with the routes read from the map and the step.
- The loader reads the `pause` property of a point object.
- Four placeholder generators and seven sheets under `public/sprites/`: `person-1.png` to
  `person-4.png`, `dog.png`, `vacuum.png`, `drone.png`.
- The scene draws the movers.
- With the implementation: `world.md` §1 a paragraph on what moves and §3 the four colleagues
  as the first of the cast; `architecture.md` §3 the state, §5 the draw order, §6 the `pause`
  property, §7 the generators; `visual.md` §3 the sizes of the four kinds; `testing.md` §2;
  the README.

**Out, explicitly:** talking to a person, a name, a line of text (M4) · petting the dog, using
the vacuum, anything else to interact with (not planned) · a mover that blocks the figure, a
creature or the light · path finding, random wandering, a mover that leaves its room (a new
draft, if the walk asks for it) · a drop shadow under the drone: a dark patch on the floor would
read as the shadow of the game · movers in the data protection officer's office, the meeting
rooms, the lift, the stairwell and the corridors · the data protection officer, the intern, the
vendor and every other named figure of `world.md` §3 (M4, M5) · sitting on chairs (M4) · sound ·
movers on the top floor and in the basement (their own maps, later).

## Behaviour

Refines `world.md` §1 and §3, `architecture.md` §3, §5 and §6, `visual.md` §3.

### The kinds

| Kind | Count | Sprite | Speed | Yields to the figure |
|---|---|---|---|---|
| `person` | 4 | 16x24 | 40 px/s, 2/3 px per step | yes |
| `dog` | 8 | 16x16 | 60 px/s, 1 px per step | yes |
| `vacuum` | 8 | 16x16 | 20 px/s, 1/3 px per step | yes |
| `drone` | 2 | 16x16 | 30 px/s, 1/2 px per step | no |

A mover's position is its feet in map pixels, floating point: the bottom centre of its sprite,
as for the figure and the creatures. Its box, used only to check a route, is the figure's:
`[x − 6, x + 6) × [y − 8, y)`.

### Routes in the map

A route is two to four points in the `objects` layer, named `<kind>:<room>:<n>` with `n` from 1
without a gap. `<kind>` is one of the four kinds; `<room>` is `hr`, `accounting`, `development`,
`reception`, `break-room`, `sales`, `marketing` or `support`. A point may carry the Tiled custom
property `pause`, type `int`, 0 to 600: the steps a mover waits there. Without the property the
pause is 0. The loader reads `pause` into the point; it reads no other property of an object.

`game/mover` builds the routes from `map.points`, in the order in which each route's first
point appears in the file. It refuses the map, each with its message:

- a route with one point or more than four: `route dog:hr has 1 point, 2 to 4 are allowed`;
- a number missing or used twice: `route dog:hr has no point 2`, `route dog:hr has two points 2`;
- a name with a kind and no room or number, or a room not in the list: `point dog:hr is not a
  route point`, `point dog:cellar:1 names no room`;
- a `pause` that is no whole number from 0 to 600: `point dog:hr:1 has pause 700, 0 to 600 are
  allowed`;
- a leg that is neither horizontal nor vertical, the leg from the last point to the first
  included: `route dog:hr leg 2 is not straight`;
- for `person`, `dog` and `vacuum`, a leg on which the mover's box meets a solid box, the leg
  from the last point to the first included: `route dog:hr leg 2 crosses a solid tile (c, r)`.
  A drone's legs may cross anything.

Every route point lies outside every solid box, the drone's included: that is rule 13 of 0010,
unchanged. A point whose name has no `:` is not a route point and is handled as before.

### The step

`GameState.movers` is an array, one entry per route in route order:
`{ kind, look, route, x, y, facing, frame, frameTimer, target, wait }`.

- `route` is the index of the route; the points stay in the map, not in the state.
- `look` picks the sheet or the row: for a person its number among the persons, 0–3; for a dog
  its number among the dogs modulo 2; 0 for the others.
- At the start a mover stands on point 1, facing down, `frame` 0, `frameTimer` 0, `target` 1
  (the index of point 2) and `wait` the pause of point 1.

`update` steps the player, the creatures and the hit as before, then every mover against the
stepped player. In the dark (0009) no mover is stepped. One mover, one step, in this order:

1. **Yield.** For `person`, `dog` and `vacuum`: when the distance between the figure's feet and
   the mover's feet is under 20 px, the mover stands — `frame` 0, `frameTimer` 0 — and nothing
   else changes; `wait` is not counted down.
2. **Wait.** Otherwise, when `wait` is above 0, it falls by 1. A person's `frame` is 0, a dog's
   `frame` is 2 (it sits).
3. **Move.** Otherwise the mover moves toward the target point by its speed per step, or by what
   is left. `facing` is the leg's direction. When it arrives it stands exactly on the point,
   `wait` becomes the point's pause and `target` the next point, the first after the last.
   While it moves, a person's `frame` runs 1, 2, 3, 4, 1 … with 15 steps per phase, a dog's
   `frame` changes between 0 and 1 every 8 steps; `frameTimer` counts the steps in the phase.
   A vacuum and a drone keep `frame` 0 and facing down.

A hit, the push, grace, the lamp and the wake leave the movers as they are. A creature neither
sees nor avoids a mover. No mover is in `solids` or `opaque`: the figure, the creatures and the
light pass.

### The routes

A cell (c, r) stands for the point (16c + 8, 16r + 8), the middle of the cell. The number after
a cell is its `pause` in steps. The rows of each table are the order in the file: persons, then
dogs, then vacuums, then drones, with the ids following the five points of 0010.

**Persons**

| Route | Points | What it reads as |
|---|---|---|
| `person:reception` | (12, 40) 300 · (19, 40) 0 · (19, 47) 180 · (19, 40) 0 | from behind the counter to the coat rack |
| `person:marketing` | (8, 64) 300 · (28, 64) 0 · (28, 78) 180 · (28, 64) 0 | from the desk islands to the printer |
| `person:support` | (70, 64) 300 · (77, 64) 0 · (77, 78) 180 · (77, 64) 0 | from the cubicles to the printer |
| `person:sales` | (86, 31) 300 · (104, 31) 0 · (104, 27) 180 · (104, 31) 0 | from the cubicles to the coffee |

**Dogs** — each walks round a seating corner; in Development it walks along the sofa.

| Route | Points |
|---|---|
| `dog:hr` | (2, 14) 300 · (7, 14) 180 · (7, 16) 420 · (2, 16) 240 |
| `dog:accounting` | (38, 13) 300 · (42, 13) 180 · (42, 15) 420 · (38, 15) 240 |
| `dog:development` | (68, 18) 300 · (76, 18) 420 |
| `dog:reception` | (11, 47) 300 · (16, 47) 180 · (16, 49) 420 · (11, 49) 240 |
| `dog:break-room` | (35, 35) 300 · (40, 35) 180 · (40, 37) 420 · (35, 37) 240 |
| `dog:sales` | (83, 49) 300 · (88, 49) 180 · (88, 51) 420 · (83, 51) 240 |
| `dog:marketing` | (19, 65) 300 · (24, 65) 180 · (24, 67) 420 · (19, 67) 240 |
| `dog:support` | (85, 76) 300 · (90, 76) 180 · (90, 78) 420 · (85, 78) 240 |

**Vacuums** — each drives two lanes; every point has `pause` 60.

| Route | Points |
|---|---|
| `vacuum:hr` | (2, 7) · (20, 7) · (20, 8) · (2, 8) |
| `vacuum:accounting` | (24, 5) · (42, 5) · (42, 6) · (24, 6) |
| `vacuum:development` | (46, 7) · (83, 7) · (83, 8) · (46, 8) |
| `vacuum:reception` | (2, 45) · (21, 45) · (21, 46) · (2, 46) |
| `vacuum:break-room` | (31, 44) · (47, 44) · (47, 45) · (31, 45) |
| `vacuum:sales` | (81, 44) · (105, 44) · (105, 45) · (81, 45) |
| `vacuum:marketing` | (2, 72) · (47, 72) · (47, 73) · (2, 73) |
| `vacuum:support` | (51, 71) · (105, 71) · (105, 72) · (51, 72) |

**Drones** — each flies a rectangle whose two vertical legs cross desks; every point has
`pause` 120.

| Route | Points |
|---|---|
| `drone:development` | (48, 6) · (58, 6) · (58, 12) · (48, 12) |
| `drone:marketing` | (5, 61) · (15, 61) · (15, 72) · (5, 72) |

**What stays true from 0010, 0011 and 0013.** No tile changes; `ground`, `detail` and `above`
are byte for byte those of 0013. The spawn, the three snippets and `wake` keep their ids, their
order and their places.

**The first view** (camera (96, 624)) shows the person of the reception at feet (200, 648) and
the dog of the reception at feet (184, 760). The vacuum of the reception starts outside it.

### The sheets

All in Endesga 32; none uses `#68386c`. No name, logo or likeness of a real product: the vacuum
is a plain disc, the drone a body with four rotors.

| Sheet | Size | Frames | Picture |
|---|---|---|---|
| `person-1.png` … `person-4.png` | as `player.png` | the figure's 20 frames in the figure's order, without the lanyard | shirt `#3e8948`, `#e43b44`, `#f77622`, `#b55088`; hair, skin, trousers and shoes as the figure |
| `dog.png` | 192x32 | two rows of twelve 16x16 frames: facing × 3 + phase, facings in `FACINGS` order; phase 0 stands, 1 steps, 2 sits; row = `look` | row 0 coat `#b86f50`, row 1 coat `#ead4aa`; ears, nose and eyes `#3e2731` |
| `vacuum.png` | 32x16 | two 16x16 frames | a disc 12 px wide in the lower 12 px, body `#3a4466`, rim `#262b44`, a light of 2x2 px: `#63c74d` in frame 0, `#265c42` in frame 1 |
| `drone.png` | 32x16 | two 16x16 frames | body `#5a6988` 6x4 px, four rotors `#c0cbdc`, drawn as bars in frame 0 and as dots in frame 1, a light `#e43b44` |

A person of `look` n uses `person-(n + 1).png`: reception 1, marketing 2, support 3, sales 4.

### Drawing

The order of a frame: `ground`, `detail`, the cone, the ground movers whose feet y is at most
the figure's feet y, in array order, the creatures, the figure, the other ground movers in
array order, `above`, the drones, the hearts, the lids. A ground mover is a person, a dog or a
vacuum.

- A person's frame has its top-left corner at (round(x) − 8 − camera.x, round(y) − 24 −
  camera.y); its frame is facing × 5 + `frame`, as the figure's.
- A dog's, a vacuum's and a drone's frame has its top-left corner at (round(x) − 8 − camera.x,
  round(y) − 16 − camera.y).
- A dog's frame is facing × 3 + `frame` in the row of its `look`.
- A vacuum's frame is floor(tick / 30) mod 2.
- A drone's frame is floor(tick / 4) mod 2, and the drone is drawn 1 px higher while
  floor(tick / 30) mod 2 is 1.

The blink of a safe figure (0009) does not touch the movers.

## Acceptance criteria

1. `floor.tmj` holds 86 route points in 22 routes — 4 persons, 8 dogs, 8 vacuums, 2 drones —
   with the cells and pauses of the tables, after the five points of 0010 and in table order;
   its tile layers are those of 0013.
2. The initial state has 22 movers in route order, each on its point 1, facing down, with
   `wait` the pause of point 1, and the persons' `look` 0–3, the dogs' alternating 0, 1.
3. The state with its movers survives a JSON round trip unchanged, at the start and after 600
   steps.
4. A mover that is not yielding waits the pause of a point in steps, then reaches the next
   point after ceil(distance / speed per step) steps and stands exactly on it; after the last
   point it goes to the first.
5. A person, a dog and a vacuum change nothing but `frame` and `frameTimer` in a step in which
   the figure's feet are under 20 px from theirs, and go on in the first step in which they are
   not; at exactly 20 px they go on. A drone never yields.
6. A person shows frame 0 while it waits or yields and the walk cycle at 15 steps per phase
   while it moves; a dog shows 2 while it waits, 0 while it yields, 0 and 1 in turn every 8
   steps while it moves. Both face along the leg.
7. In the dark no mover changes; after the wake each goes on from where it was.
8. The figure's position after any input is the same with and without movers in the state; so
   is every creature's, and so is whether a creature is lit.
9. `game/mover` refuses a map with each of the faults listed under "Routes in the map", with
   the message given there.
10. Each leg of each ground route in `floor.tmj`, the closing leg included, keeps the mover's
    box out of every solid box.
11. The scene draws in the order given under "Drawing", each mover at the origin and with the
    frame given there.
12. The seven sheets have the sizes and frames of the table, equal their generators' output,
    and pass the asset test.
13. `src/game/mover.ts` passes the architecture test: no import from `src/render/`, no DOM name.

## Test plan

- **Unit, `game/mover`:** building routes from points — order, `look`, and the eight rejections
  with their messages; the step — wait, move, arrival on the exact point, the wrap to the first
  point, a two-point route, the speeds of the four kinds, facing per leg, the frames of a person
  and a dog, yield at 19.9 px, 20 px and 20.1 px, the drone that does not yield.
- **Unit, state:** the initial movers of the floor; the JSON round trip; `update` with movers —
  the dark, and criterion 8 as a run of 600 steps with a recorded input against the same run
  with `movers` empty.
- **Unit, loader:** a point with `pause`, without it, with a `pause` of another type; the other
  properties of an object are ignored.
- **Unit, floor:** the 86 points against the tables; criterion 10 over every leg; the tile
  layers against the fixture of 0013; the two movers of the first view.
- **Unit, scene:** the draw order with a mover above and one below the figure, a drone, the
  origins, the frames by `tick`, the drone's 1 px.
- **Unit, sprites:** each generator against its committed sheet; the vacuum and the drone pixel
  by pixel.
- **Assets:** the seven sheets against Endesga 32 and the reserved colour.
- **Architecture:** unchanged, now covering `src/game/mover.ts`.
- **Smoke:** after loading, the pixel of the reception person's shirt at its place in the first
  view has the colour `#3e8948`.
- **Fixtures:** `tests/fixtures/maps/routes.tmj`, a small map with one route of each kind, and
  one faulty copy per rejection.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys walk, the lamp key is the one of
0007.

**Steps:**

1. Load the game and do not press a key.
2. Expected: a person in a green shirt stands behind the counter, right of its chair, and a
   cream-coloured dog sits left of the seating corner below the figure.
3. Wait fifteen seconds without pressing a key.
4. Expected: within about five seconds the person walks to the right with a walk cycle, turns
   down, and stops beside the coat rack.
5. Expected: in the same time the dog gets up, walks to the right above the sofa and sits down
   again at the corner's upper right.
6. Keep watching the dog for twenty seconds.
7. Expected: it goes round the seating corner clockwise and sits at each of the four corners,
   for different lengths of time.
8. Walk to the dog while it walks and stop next to it.
9. Expected: the dog stops and stands — it does not sit — while the figure is within about one
   tile.
10. Walk through the dog and on, two tiles away.
11. Expected: the figure is not held, and the dog walks on.
12. Walk to the person and stand directly above it, then directly below it, overlapping.
13. Expected: above, the person covers the figure's legs; below, the figure covers the
    person's.
14. Hold the lamp on the person, then on the dog.
15. Expected: nothing happens to either.
16. Walk to the left half of the reception, below the counter.
17. Expected: a dark disc with a blinking green light drives slowly along a lane, turns at the
    end and comes back one row lower; it stops while the figure is within about one tile.
18. Walk into the break room.
19. Expected: a brown dog circles the seating corner and a vacuum drives across the lower half
    of the room.
20. Walk into Sales.
21. Expected: a person in a pink shirt walks between the cubicles and the coffee at the upper
    right, a dog circles the seating corner at the bottom, a vacuum drives across the room —
    and the snippets come for the figure as before and take no notice of any of them.
22. Walk into Support.
23. Expected: a person in an orange shirt walks between the cubicles and the printer at the
    bottom, a dog circles the seating corner at the bottom, a vacuum drives across the room.
24. Walk into Marketing and to the desk islands at its upper left.
25. Expected: a drone with turning rotors flies a rectangle over the islands, bobs slightly,
    hovers at each corner, and is drawn over the desks, the cabinets' tops and the figure; it
    does not stop when the figure stands under it.
26. Look round Marketing.
27. Expected: a person in a red shirt walks between the islands and the printer at the bottom,
    a dog circles the seating corner, a vacuum drives across the lower part of the room.
28. Walk through HR, Accounting and Development.
29. Expected: each has one dog and one vacuum, no person; in Development the dog walks back and
    forth above the sofa and a second drone flies over the cubicles at the upper left.
30. Expected, over the whole walk: no mover ever stood in furniture or a wall, left its room or
    held the figure.

**Feel:**

- Are the speeds right — the person (40 px/s), the dog (60), the vacuum (20), the drone (30)?
  Which would you change, and to what?
- Is 20 px the right distance for stopping, or do they stop too early or too late?
- Does the dog read as a dog on a fixed route, or as clockwork? Should it wander instead?
- Is one dog and one vacuum in every room too much anywhere?
- Does a mover ever get in the way of catching a snippet in Sales?

**Result:** not yet walked.

## Open questions

None. The order against 0014 was settled on 2026-11-13: 0015 is built first (see Scope).
