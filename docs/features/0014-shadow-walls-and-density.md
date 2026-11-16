# 0014 — Shadow walls and density

**Status:** approved 2026-11-16
**Milestone:** M3
**Drafted:** 2026-11-16

## Goal

Every region gets a shadow density, and the doorway of every region under shadow is closed by a
shadow wall. After this feature the player lifts a thin wall by holding the lamp on it for a
second and walks into Sales, Marketing, Support and the meeting rooms; the denser walls of HR,
Accounting and Development hold against the basic lamp. The one gating rule of the game —
density against light strength — is in the world data and tested.

## Scope

Built on 0015 as merged. No tile changes and no point moves.

**In:**

- `src/game/world.ts`: the world data — the regions of the floor with their densities, the base
  strength of the lamp, the two upgrades that gate regions of the floor with the region each is
  earned in — and `gatingFaults`, the check behind INV-7.
- `GameState.lamp.strength`, 1 at the start, and `GameState.shadowWalls`.
- The loader reads rectangle objects of the `objects` layer into `TileMap.rects`.
- `src/game/shadow.ts`: the walls read from the map's rectangles, the light test and the step.
- Eight rectangles in `public/maps/floor.tmj`, from a table in `tools/floor-layout.ts`.
- A standing wall is solid for the figure, the push and the creatures, and stops the light.
- `tools/placeholder-shadow-wall.ts` and `public/sprites/shadow-wall.png`; the scene draws the
  walls.
- With the implementation: `gameplay.md` §2 and §5; `world.md` §1 the density table and the
  walls; `architecture.md` §1, §2, §5, §6 and §7; `visual.md` §4 the second shadow asset and the
  wall's look; `testing.md` §1, §2 (INV-7) and §6; `plan.md` §4; the README.

**Out, explicitly:** earning an upgrade, a lamp stronger than 1 in play (M6) · the densities of
Management and the server room, the third upgrade and the two keys (M6, M7, with their maps) ·
the shadow as a region's colour: desaturation, violet dithering, clearing (M5) · a creature's
own density — the snippet stays capturable by the basic lamp (M6, with the second species) ·
a word on screen that the lamp is too weak (M4) · walls that come back, walls outside doorways,
dense zones (M7) · hidden paths and the colour filter (M6) · a switch that opens every wall for
a demonstration (not planned) · sound · saving which walls are lifted across a reload (M8).

## Behaviour

Refines `gameplay.md` §2 and §5, `world.md` §1, `architecture.md` §2, §5, §6 and §7,
`visual.md` §4. INV-7 keeps its text: a shadow wall is not a tile — its place is an object in
the map, its density world data, and nothing about it is code.

### The world data

`src/game/world.ts` holds constants and one pure function; it is content, not state.

| Region id | Density |
|---|---|
| `reception` | 0 |
| `break-room` | 0 |
| `sales` | 1 |
| `marketing` | 1 |
| `support` | 1 |
| `meeting-rooms` | 1 |
| `hr` | 2 |
| `accounting` | 2 |
| `development` | 3 |

The data protection officer's office and the corridors are no regions and have no shadow.
`BASE_STRENGTH` is 1. `UPGRADES`, in the order they are earned:

| # | Id | Earned in | Strength after |
|---|---|---|---|
| 1 | `wide-cone` | `marketing` | 2 |
| 2 | `filter` | `hr` | 3 |

The lamp's strength is `BASE_STRENGTH` plus the upgrades earned. Nothing earns one in this
feature. Each upgrade is earned in the first region of its pair in `world.md`; the place is
fixed here so that the gating test has something to check. A case spec of M6 may move it, and
the test then guards the new place. Management, the server room and the third upgrade join the
tables with their maps.

`gatingFaults(regions, upgrades)` returns a list of messages, empty when the data is
consistent:

- a density that is no whole number from 0 to 3: `region hr has density 2.5, 0 to 3 are
  allowed` — the sheet has three looks;
- a density above `BASE_STRENGTH` plus the number of upgrades: `region development has density
  3, the lamp reaches 2`;
- an upgrade earned in no region of the table: `upgrade wide-cone is earned in cellar, which is
  no region`;
- upgrade n earned in a region whose density is above n, the strength before it: `upgrade
  wide-cone is earned in hr, density 2, with a lamp of strength 1`.

### Rectangles in the map

An object of the `objects` layer is a point (`point: true`) or a rectangle: an object with none
of `point`, `ellipse`, `polygon`, `polyline`, `text` and `gid`. `TileMap.rects` holds the
rectangles as `{ name, x, y, width, height }` in file order; `engine/` does not know what a
name means. The loader rejects, after the rules for points and with the file in front:

- any other object: `layer "objects" has an object that is neither a point nor a rectangle`;
- a rectangle without a name: `layer "objects" has a rectangle object without a name`;
- a rotation other than 0: `rectangle "shadow:sales" is rotated`;
- a fractional number, a width or height below 1, or any part outside the map: `rectangle
  "shadow:sales" (x, y, w, h) is not whole pixels inside the map`.

A map without rectangles has `rects` empty.

### The walls of the floor

A shadow wall is a rectangle named `shadow:<region>`. It is a strip 4 px thick on the top or
the left edge of whole cells, exactly where the doorway's wall strip is missing. A region may
have more than one. `game/shadow` reads the walls from `map.rects` in file order — a wall is
`{ region, density, box }` — and refuses the map in `createInitialState`:

- a rectangle with another name: `unknown rectangle object "door"`;
- a region not in the world data: `shadow wall shadow:cellar names no region`;
- a region of density 0: `shadow wall shadow:reception stands in a region without shadow`;
- `x` or `y` no multiple of 16, or a size that is neither 4 px high and a multiple of 16 px
  wide nor 4 px wide and a multiple of 16 px high: `shadow wall shadow:sales (x, y, w, h) is no
  strip on a cell edge`.

`tools/floor-layout.ts` gets `SHADOW_WALLS`; the eight rectangles follow the 91 points in
`floor.tmj` with the ids 92 to 99, in this order, and `nextobjectid` is 100.

| # | Name | Doorway cells | Box (x, y, w, h) | Density | Lit from |
|---|---|---|---|---|---|
| 0 | `shadow:sales` | (79, 37)–(79, 39) | (1264, 592, 4, 48) | 1 | the east corridor |
| 1 | `shadow:marketing` | (23, 58)–(25, 58) | (368, 928, 48, 4) | 1 | the south corridor |
| 2 | `shadow:support` | (77, 58)–(79, 58) | (1232, 928, 48, 4) | 1 | the south corridor |
| 3 | `shadow:meeting-rooms` | (89, 4)–(89, 6) | (1424, 64, 4, 48) | 1 | the side passage |
| 4 | `shadow:meeting-rooms` | (89, 14)–(89, 16) | (1424, 224, 4, 48) | 1 | the side passage |
| 5 | `shadow:hr` | (10, 20)–(12, 20) | (160, 320, 48, 4) | 2 | the north corridor |
| 6 | `shadow:accounting` | (31, 20)–(33, 20) | (496, 320, 48, 4) | 2 | the north corridor |
| 7 | `shadow:development` | (63, 20)–(65, 20) | (1008, 320, 48, 4) | 3 | the north corridor |

The openings of the reception, the data protection officer's office, the break room and the
side passage stay open. With all eight walls standing, the reception, the office, the break
room and the five corridors are reached on foot and no other room is. With the walls of
density 1 lifted, Sales, Marketing, Support and both meeting rooms are reached too; with those
of density 2, HR and Accounting; with all lifted, Development.

### The wall in the state

`GameState.lamp` is `{ on, strength }`; `strength` is 1 from `createInitialState` on and no
step changes it. `GameState.shadowWalls` is an array of `{ wall, lit, light }`, one entry per
wall still standing, in the map's order:

- `wall` is the index of the wall among the map's walls; its box stays in the map.
- `lit` says whether the light was on it in the last step.
- `light` counts the steps it has been giving way without a break, 0–59.

At the start every wall stands: `{ wall: n, lit: false, light: 0 }`. A lifted wall leaves the
array and never comes back. `update` rebuilds the walls from `map.rects` in every step and
keeps them nowhere, as it does with the routes of 0015.

### In the light

The cone is the one of 0007: the apex 12 px above the feet, 48 px long, slope 1/2. In the
cone's own coordinates a wall's box, its edges included, spans d0 to d1 along the facing and s0
to s1 across it. With near = max(d0, 0), far = min(d1, 48) and gap the distance from 0 to the
interval [s0, s1] — 0 when it contains 0 — the box **meets the cone** when

near ≤ far, near < 48 and gap ≤ far / 2.

That is every case in which a point of the box lies in the cone, and the limiting case in
which the box touches the cone's end at exactly 48 px. A figure flush against a wall lights it
from each of the four sides, also from below, where the apex lies on the wall's far edge.

A wall is **in the light** in a step when the lamp is on, its box meets the cone of the
stepped figure, and no opaque box of the map lies on the line from the centre of the figure's
box, (x, y − 4), to the point of the wall's box nearest to that centre (`sightBlocked` against
`map.opaque`). Along the wall the box ends, for this point, at its last pixel — x + w − 1 for
a horizontal wall, y + h − 1 for a vertical one: the corner beyond it belongs to the next wall
strip, whose box is half-open, and the line would end inside that strip. Other walls do not
count on that line.

### The step

In the dark (0009) no wall is stepped. Otherwise `update` steps the figure and the creatures
against the walls standing at the start of the step (see "Solid and opaque"), and then every
standing wall against the stepped figure, with the lamp of that step:

1. **Not in the light:** `lit` false, `light` 0.
2. **In the light, the lamp too weak** — `lamp.strength` below the wall's density: `lit` true,
   `light` 0. The wall holds.
3. **In the light, the lamp strong enough:** `lit` true and `light` grows by 1. In the step it
   would reach 60 — `LIFT_STEPS`, one second, *tune* — the wall leaves the array.

A break starts the second again, as with a creature. A lifted wall is open from the next step
on. When the figure wakes (step 45 of the dark), every standing wall has `lit` false and
`light` 0; what was lifted stays lifted.

### Solid and opaque

In a step, the box of every wall standing at its start counts as a solid box and as an opaque
box in each cell it covers, beside the map's own. So:

- the figure stops flush at a wall and slides along it, as at a wall strip; a push of 0009 is
  held by it;
- a creature is held by it;
- a creature behind it is not lit: the light stops at a standing wall, however thin;
- the movers are not concerned — no route crosses a doorway.

A state whose `shadowWalls` is empty steps exactly as before this feature.

### The sheet

`public/sprites/shadow-wall.png`, 256x16: sixteen 16x16 frames in one row, frame =
orientation × 8 + look. Orientation 0 is a horizontal wall, the strip on the frame's rows 0–3;
orientation 1 a vertical wall, the strip on its columns 0–3; every other pixel is transparent.
In a strip, i counts along it, 0–15, and j across it, 0–3: the pixel is (i, j) in orientation
0 and (j, i) in orientation 1.

| Look | Shows | Opaque pixels |
|---|---|---|
| 0 | density 1, phase 0 | `#68386c` where i + j is even — 32 |
| 1 | density 1, phase 1 | `#68386c` where i + j is odd — 32 |
| 2 | density 2, phase 0 | `#68386c` everywhere but where i and j are both even — 48 |
| 3 | density 2, phase 1 | `#68386c` everywhere but where i and j are both odd — 48 |
| 4 | density 3, phase 0 | `#68386c` everywhere — 64 |
| 5 | density 3, phase 1 | `#181425` where (i + j) mod 4 = 0 — 16; `#68386c` elsewhere — 48 |
| 6 | giving way, second third | `#68386c` where i + j is even and i mod 4 is 0 or 1 — 16 |
| 7 | giving way, last third | `#68386c` where (i + j) mod 8 = 0 — 8 |

A denser wall has more pixels; a wall that gives way loses them. The sheet is the second shadow
asset: the asset test's list becomes `sprites/snippet.png`, `sprites/shadow-wall.png`.

### Drawing

The walls are drawn after the cone and before the ground movers, the creatures and the figure,
in array order: `ground`, `detail`, the cone, the walls, then as in 0015. A wall whose box is
(x, y, w, h) is drawn as w / 16 frames of orientation 0 at (x + 16k − camera.x, y − camera.y),
or as h / 16 frames of orientation 1 at (x − camera.x, y + 16k − camera.y), k from 0. Its look:

- `light` 1–19: look 0; 20–39: look 6; 40–59: look 7 — still, whatever its density;
- `lit` with `light` 0, the wall that holds: look (density − 1) × 2, still;
- otherwise: look (density − 1) × 2 + ⌊tick / 15⌋ mod 2 — it flickers four times a second.

So the shadow has colour, form and motion (`visual.md` §4), and stands still in the light like
the snippet.

## Acceptance criteria

1. `gatingFaults` returns nothing for the world data of the tables, and each of its four
   messages for a table built to provoke it.
2. The loader reads rectangle objects into `rects` in file order, leaves `rects` empty on a map
   without them, and rejects the four cases with their messages.
3. `floor.tmj` holds the eight rectangles of the table after its 91 points, with the ids 92–99;
   its tile layers and its points are those of 0015.
4. `game/shadow` reads the eight walls of the floor with region, density and box, and refuses
   a map with each of the four faults listed under "The walls of the floor", with its message.
5. The initial state has `lamp.strength` 1 and eight entries in `shadowWalls`,
   `{ wall: n, lit: false, light: 0 }` for n from 0 to 7.
6. The state survives a JSON round trip unchanged with a wall at `light` 30 and with a wall
   lifted.
7. A box meets the cone exactly as the rule under "In the light" says, for the positions of the
   test plan; an opaque box on the line keeps a wall out of the light.
8. A wall of density 1 in the light of a lamp of strength 1 has `light` 59 after 59 steps and
   is gone after the 60th; a step out of the light sets `lit` false and `light` 0.
9. A wall of density 2 in the light of a lamp of strength 1 has `lit` true and `light` 0 after
   any number of steps; with strength 2 it is gone after 60.
10. A standing wall stops the figure flush, holds a push and a creature, and keeps a creature
    behind it from being lit; in the step after it is lifted none of that holds.
11. In the dark no wall changes; at the wake every standing wall has `lit` false and `light` 0
    and no lifted wall is back.
12. On the floor, reachability on foot is as the last paragraph of "The walls of the floor"
    says, for all eight walls standing and for the walls of density 1, of 1 and 2, and all
    lifted; the spawn's box, the wake's and every snippet's is clear of every wall's box.
13. The scene draws the walls after the cone and before the ground movers, each segment at the
    origin and with the look given under "Drawing".
14. `shadow-wall.png` has the size, frames and pixel counts of the table, equals its
    generator's output and passes the asset test as a shadow asset; no other PNG may use
    `#68386c` but the snippet.
15. `src/game/world.ts` and `src/game/shadow.ts` pass the architecture test.

## Test plan

- **Unit, `game/world`:** the tables of the spec; `gatingFaults` on the real data and on four
  tables with one fault each; the strength after each upgrade.
- **Unit, loader:** `walls.tmj` — its three rectangles in file order beside its points; a map
  without rectangles; the four rejections on their fixtures.
- **Unit, `game/shadow`, reading:** the walls of `walls.tmj`; the four refusals on rectangles
  built in the test.
- **Unit, `game/shadow`, the light,** on an open 20x12 grid with the horizontal box
  (128, 96, 48, 4) and the vertical box (240, 32, 4, 48), feet and facing → meets:
  (152, 96) down → yes; (152, 61) down → yes; (152, 60) down → no; (120, 88) down → yes;
  (110, 88) down → no; (152, 96) up → no; (152, 88) left → no; (152, 108) up → yes, flush from
  below; (118, 108) up → no; (152.4, 116) up → yes; (234, 60) right → yes; (234, 40) right →
  yes; (234, 36) right → no. With the lamp off none is in the light. A full opaque tile
  between the figure and the box keeps it out of the light; a low box does not. With a wall
  strip (176, 96, 16, 4) beside the horizontal box, (186, 88) down → in the light: the line
  ends on the wall's last pixel, not in the strip.
- **Unit, `game/shadow`, the step:** criteria 8 and 9 step by step; a break at `light` 30; two
  walls in the cone at once both count; the wall that leaves the array keeps the others'
  `wall` indices.
- **Unit, state:** the initial walls of the floor and `lamp.strength`; the round trips of
  criterion 6; `update` — the figure walked into a standing wall from each side stops flush and
  slides; a push of 3 px per step is held; a snippet beyond a standing wall is not lit and is
  held by it; the same after the wall is lifted; the dark and the wake; a state with
  `shadowWalls` empty against the same run on a map without rectangles, 600 recorded steps.
- **Unit, floor:** the eight rectangles against the table and their ids; each box lies on the
  cells of its opening and meets no solid box of the map; the four floods of criterion 12 with
  the probe cells of 0010; the boxes of the spawn, the wake and the snippets against the walls'
  boxes; the tile layers and the points against 0015.
- **Unit, scene:** the place in the draw order; a horizontal and a vertical wall of three
  segments with their origins; the look for each density by `tick`, for a wall that holds, and
  for `light` 1, 19, 20, 39, 40 and 59.
- **Unit, sprites:** the generator against the committed sheet; every frame pixel by pixel from
  the rule of its look; the pixel counts.
- **Assets:** the sheet against Endesga 32; the list of shadow assets has exactly two entries;
  the reserved colour is rejected in a file that is not on it.
- **Architecture:** unchanged, now covering `src/game/world.ts` and `src/game/shadow.ts`.
- **Smoke:** after loading, `window.shadowAi.state.shadowWalls` holds eight walls, none lit,
  and `state.lamp.strength` is 1.
- **Fixtures:** `tests/fixtures/maps/walls.tmj`, 20x12 on the tiles of `points.tmj`, with
  `shadow:marketing` (128, 96, 48, 4), `shadow:sales` (240, 32, 4, 48) and `shadow:hr`
  (32, 96, 48, 4); `rect-without-name.tmj`, `rect-rotated.tmj`, `rect-outside.tmj` and
  `object-ellipse.tmj`, each rejected.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp.

**Steps:**

1. Walk right into the corridor, then down it to the wide corridor at its end.
2. Expected: in the lower wall of the wide corridor, at its left, a doorway three tiles wide is
   closed by a violet strip that flickers; the room behind it and what moves in it can be seen.
3. Walk down against the strip and keep holding the key.
4. Expected: the figure stops at the strip as at a wall and slides along it.
5. Standing at the strip, face down and hold `Space` for two seconds.
6. Expected: the strip stops flickering as soon as the light is on it, thins out twice and is
   gone after about one second.
7. Walk through the doorway into the room and back out.
8. Expected: the figure passes, and the strip does not come back.
9. Walk right along the wide corridor to the next violet strip in its lower wall. Face it,
   hold `Space` for about half a second and let go.
10. Expected: the strip stands still and thins out once; when the key is let go it is whole
    again and flickers.
11. Step about half a tile left of that doorway and about one tile above the wall, face down
    and hold `Space`.
12. Expected: only the edge of the cone reaches the end of the strip, and the strip gives way
    all the same.
13. Walk up the corridor that leads up from the wide corridor above this doorway, to the scrap
    of paper and the violet strip in its right wall.
14. Expected: the scrap comes for the figure; the strip closes the doorway of the large room on
    the right.
15. Capture the scrap, then face the strip and hold `Space` until it is gone. Walk into the
    room.
16. Expected: the strip gives way like the first one, and the scraps in the room come for the
    figure as before.
17. Let the scraps touch the figure, without the lamp, until the last heart is empty.
18. Expected: the screen closes and opens, and the figure stands in the room above the
    reception with five hearts.
19. Walk back to the first doorway of step 2.
20. Expected: it is still open.
21. Walk up the corridor into the wide corridor along the top, to the leftmost violet strip in
    its upper wall.
22. Expected: this strip is denser than the three before: more violet, fewer gaps.
23. Stand directly below it, face up and hold `Space` for three seconds; then walk against it.
24. Expected: while the light is on it the strip stands still and does not thin out; when the
    key is let go it flickers again; the figure does not pass.
25. Walk right along that corridor past the next two violet strips and try the lamp on each.
26. Expected: the second looks like the first of this corridor and holds; the third is a solid
    violet strip with a dark pattern that flickers, and holds.
27. Walk on to the right, up the narrow passage, to the two violet strips in its right wall.
28. Expected: both are thin, like the first three.
29. Lift one of them and walk into the room behind it.
30. Expected: the strip gives way after about one second and the room can be entered; the other
    strip still stands.
31. Reload the page and walk to the doorway of step 2.
32. Expected: the strip stands again.

**Feel:**

- Does a strip 4 px thick read as a wall of shadow, at factor 6 and at factor 3? If not: thicker,
  or drawn differently?
- Can the three densities be told apart at a glance?
- Is one second the right time to lift a thin wall — or shorter, or longer?
- Can a wall that holds against the lamp be told from a wall the light misses?
- HR, Accounting and Development can be seen but not entered until the upgrades exist (M6).
  Does that tease, or does it disturb?

**Result:** not yet walked.

## Open questions

None. Three were settled on 2026-11-16, each as drafted:

- The densities and the walls: the table under "The world data", the meeting rooms at 1, one
  wall in each of their two doorways and none at the mouth of the side passage. HR, Accounting
  and Development stay closed until M6.
- Where the two upgrades are earned: the wider cone in Marketing, the filter in HR.
- How a wall gives way: one second of unbroken light, lifted for good, also through the dark;
  solid for creatures and closed to the light while it stands.
