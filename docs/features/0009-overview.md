# 0009 — Overview

**Status:** approved 2026-11-13
**Milestone:** M3
**Drafted:** 2026-11-12

## Goal

The touch of a creature now costs something. The figure has three points of overview, shown as
three small lights in the corner of the screen; a free creature that reaches the figure takes
one, pushes the figure back and leaves it safe for a moment. At zero the screen closes like an
eye, and the figure wakes up in front of the data protection officer's office with full
overview. After this feature the lamp is a defence as well as a tool, and the player has seen
that there is no game over, only a way back.

## Scope

**In:**

- `GameState.overview`, `{ current, max }`, both 3 at the start, and `GameState.dark`, the step
  of the dark sequence
- `src/game/overview.ts`: the hit rule and the dark sequence as pure functions, with the
  constants `INITIAL_OVERVIEW` 3, `HIT_DISTANCE` 10, `GRACE_STEPS` 90, `RECOIL_STEPS` 8,
  `RECOIL_PX_PER_STEP` 3, `DARK_STEPS` 90 and `WAKE_STEP` 45
- the player gains `grace`, the steps it is still safe, and `recoil`, the push it is still
  carrying out; a creature gains `home`, the point of the map it started at
- the hit: a creature that is not frozen and is within 10 px of the figure takes one point,
  pushes the figure 24 px away and leaves it safe for 90 steps
- the dark: at zero the game holds for 90 steps while the screen closes and opens; in the middle
  the figure is moved to the wake point, overview is full again and every creature still in the
  world is back at its home
- the wake point: a point object named `wake` in the campus map, in front of the door of the
  data protection officer's office, at feet (792, 744)
- the display: `public/sprites/overview.png`, two 8x8 frames — a light that is on, a light that
  is out — drawn as one row in the top-left corner, one light per point of the maximum
- `tools/placeholder-overview.ts`, pure, in the pattern of the other placeholders, and
  `npm run gen-sprites`, which now also writes the new sheet
- `render/draw-scene.ts`: the lights and the two lids of the closing screen are drawn after
  `above`; the figure blinks while it is safe
- with the implementation: `architecture.md` §1 the new module and tool, §2 the new state and
  the order of a step, §5 the draw order, the lights and the lids, §7 the new generator;
  `gameplay.md` §3 the snippet's touch and §4 overview as built, with the open point named
  below; `visual.md` the display; `world.md` §1 the wake point as built; `testing.md` §1 and §2
  the new tests; the README its status

**Out, explicitly:** the growth of the maximum — it grows with the first solved case (M5); this
feature only carries the number · any way to win overview back other than the dark: no pickup,
no resting place, no gain from a capture. The answer is decided when there are figures to talk
to and rooms to enter (M4, M5), and `gameplay.md` §4 records it as open · the office's interior
and the data protection officer himself (M5) — the figure wakes outside the door · a sign that a
capture is running, the feel note of 0008 (its own draft) · different costs per species and hits
from medium creatures (M6) · a push or any other reaction of the creature that hit · a sound
(audio, after M5) · text of any kind: the display is pictures only, the language table arrives
with M4 · a darker screen at low overview · a pause · light strength, density and shadow walls
(0010) · saving (M8) · more than one map: the wake point is a point of the campus map; where the
figure wakes when it falls in an interior is decided with the first interior (M5).

## Behaviour

Every number is a pixel or a logic step (1/60 s). Numbers marked *tune* are starting values.
This refines `gameplay.md` §3 and §4.

### The state

- `GameState.overview` is `{ current, max }`, two whole numbers with 0 ≤ `current` ≤ `max`.
  `createInitialState` sets both to `INITIAL_OVERVIEW`, 3.
- `GameState.dark` is a whole number from 0 to 89. 0 means the game runs; above 0 the dark
  sequence is at that step.
- `PlayerState.grace` is a whole number from 0 to 90: the steps the figure is still safe from a
  hit. `PlayerState.recoil` is `{ dx, dy, steps }`: the push per step in pixels and the steps it
  still lasts, 0 to 8. With `steps` 0, `dx` and `dy` are 0. The initial player has `grace` 0 and
  `recoil` `{ dx: 0, dy: 0, steps: 0 }`.
- `CreatureState.home` is `{ x, y }`, the position of the map point the creature was made from.
  It never changes.
- `GameState = { tick, player, camera, lamp, creatures, captured, overview, dark }`: plain data,
  the JSON round trip exact (INV-1).

### One step

`update(state, input, content)` keeps its signature. With `dark` above 0 the step is the dark
sequence (below) and nothing else. Otherwise, in this order:

1. **The lamp.** The lamp is on in this step when the input holds `lamp` and the figure is not
   being pushed: `recoil.steps` is 0 at the start of the step. This refines 0007.
2. **The figure.** With `recoil.steps` above 0 the figure is pushed (below) and the input does
   not move or turn it. Otherwise it is stepped as in 0007. In both cases `grace` drops by 1,
   not below 0.
3. **The creatures**, each against the stepped figure, as in 0008.
4. **The hit.** When `grace` is now 0, the creatures still in the world are tested in array
   order. The first one that is free — `light` is 0 after its own step — and whose feet are at
   most `HIT_DISTANCE`, 10 px (*tune*), from the figure's feet hits. One step holds at most one
   hit.
5. The camera follows the figure as before.

A frozen creature never hits, however close it is: the lamp is the defence. A creature that is
released from the light within 10 px of the figure hits in that step, when `grace` is 0. No
sight line is tested for a hit: two boxes on the two sides of a wall or a fence are at least
24 px apart.

`HIT_DISTANCE` is 2 px more than the 8 px at which a creature stops (0008), so that a rounding
error in its last move cannot decide whether it hits. A creature hits on its way in, before it
comes to rest.

### The hit

- `overview.current` drops by 1.
- When it is still above 0: `grace` becomes `GRACE_STEPS`, 90 (*tune*, 1.5 s), and `recoil`
  becomes `{ dx: 3u.x, dy: 3u.y, steps: 8 }`, where u is the unit vector from the creature's
  feet to the figure's feet. When the two are on the same spot, u is the opposite of the
  figure's facing. The creature is not changed.
- When it is 0: `dark` becomes 1. `grace` and `recoil` stay as they are; the dark sequence
  resets them.
- After a hit in step n the next hit is possible in step n + 90 at the earliest.

### The push

- In each of the next `RECOIL_STEPS`, 8, steps the figure's box is moved by (`dx`, `dy`) through
  `moveBox`, X then Y, and the feet are clamped to the map, as when it walks (0005). So the push
  is 3 px per step (*tune*), 24 px in all, a tile and a half, and a wall, a fence or the map's
  edge holds it.
- During the push the facing is kept, the walk cycle is standing — phase 0, timer 0 — and the
  lamp is off. `recoil.steps` drops by 1 per step; when it reaches 0, `dx` and `dy` become 0.
- The creature keeps coming at 2/3 px per step, so after the push the two are about 29 px apart
  and the figure is safe for another 82 steps: time to turn and raise the lamp, or to walk away.

### The dark

- The hit that takes the last point sets `dark` to 1. From then on each step adds 1 to `dark`
  and to `tick` and changes nothing else: the input is ignored, the figure and the creatures
  are not stepped, the lamp is off.
- **Waking.** In the step in which `dark` becomes `WAKE_STEP`, 45, the world is set right:
  - the figure stands on the wake point, facing down, phase 0, timer 0, `grace` 0, `recoil`
    `{ dx: 0, dy: 0, steps: 0 }`;
  - `overview.current` becomes `overview.max`;
  - every creature in `creatures` is at its `home` with `light` 0. Captured creatures stay
    captured, and `captured` is unchanged;
  - the camera follows the figure.
- In the step in which `dark` would become `DARK_STEPS`, 90, it becomes 0. The step after that
  is a normal step again. From the hit to the first step with input 90 steps pass, 1.5 s
  (*tune*).
- **The wake point** is the map's point named `wake`. A map without one wakes the figure at its
  spawn; a map with more than one stops the game before it starts:
  `more than one point object "wake"`. `wake` joins the species as a name the game knows; any
  other name is still rejected with 0008's message. A `wake` point makes no creature. It passes
  the loader's checks like every point: inside the map, on a cell that is not solid.

### The campus

- One more point in `objects`, after the three snippets, with id 5: `wake` at feet (792, 744),
  the middle of tile (49, 46). The door of the data protection officer's office is tile (49, 45),
  straight above it; the figure's box, [786, 798) × [736, 744), stands flush under the door.
- The camera at the wake point is (632, 650).
- Nothing of the first view changes: the point is not drawn.

### The lights

- `public/sprites/overview.png` is 16x8: two 8x8 frames in one row.
- Frame 0, the light that is on, in frame coordinates (column, row): a disc of 32 pixels — rows
  1 and 6 in columns 2–5, rows 2–5 in columns 1–6. Its rim, the 16 pixels of rows 1 and 6 and of
  columns 1 and 6, is `#181425`. The 16 pixels inside, columns 2–5 in rows 2–5, are `#fee761`.
  Everything else is transparent.
- Frame 1, the light that is out, is frame 0 with `#3a4466` in place of `#fee761`.
- `tools/placeholder-overview.ts` returns the pixels as data; `npm run gen-sprites` writes the
  file beside the other three. Committed, deterministic, and a unit test fails when file and
  generator disagree. The art pass replaces the file under the same name and frame order.
- The row is drawn on the surface, not in the world: light i, counted from 0, has its top-left
  corner at (4 + 10i, 4), for i from 0 to `max` − 1. It shows frame 0 when i < `current`, else
  frame 1. With the largest maximum of the game, 11, the row ends at x = 112.
- The lights are always drawn, also while the lamp is on and during the dark.

### Drawing

- The draw order of a frame becomes: clear, `ground`, `detail`, the cone when the lamp is on,
  the creatures, the player, `above`, **the lights, the lids**.
- **The blink.** While `grace` is above 0 the player's sprite is left out in every frame in
  which ⌊`grace` / 4⌋ is odd: four steps gone, four steps there. The cone is not affected.
- **The lids.** With `dark` = d above 0 the screen closes from the top and the bottom and opens
  again. The lid height is L = 3d for d ≤ 30, 90 for 30 ≤ d ≤ 60, and 3 × (90 − d) for d ≥ 60.
  Two rectangles in `#181425` are drawn with `fillRect`: (0, 0, 320, L) and (0, 180 − L, 320, L).
  From d = 30 to d = 60 the screen is black, lights included; the figure is moved at d = 45,
  unseen. With `dark` 0 no rectangle is drawn.
- The lids are whole rectangles in a palette colour. Nothing is blended, so no pixel leaves the
  palette.

## Acceptance criteria

1. The game opens as in 0008, with three lights that are on in the top-left corner;
   `overview` is `{ current: 3, max: 3 }` and `dark` is 0.
2. A free snippet within 10 px of the figure's feet takes one point of overview: one light goes
   out.
3. With that hit the figure is pushed 24 px straight away from the snippet in 8 steps, and a
   wall, a fence or the map's edge holds it. During the push the keys do not move or turn the
   figure, and the lamp is off.
4. For 90 steps from a hit the figure blinks and cannot be hit; the next hit comes in the 90th
   step after it at the earliest.
5. A frozen snippet does not hit, at any distance.
6. The hit that takes the last point starts the dark: for 89 steps the keys do nothing, and the
   screen closes to black in 30 steps, stays black for 30 and opens in 30.
7. In the 45th step of the dark the figure stands at the wake point facing down, overview is
   full, every snippet still in the world is at its home with `light` 0, and `captured` is
   unchanged.
8. The hit rule, the push and the dark sequence are proven by unit tests with the numbers of the
   test plan.
9. The game takes the wake point from the map's point `wake`, uses the spawn when there is none,
   rejects a second one with its message, and still rejects an unknown name.
10. The campus map holds the point `wake` at (792, 744); its box is free of solid cells, its
    cell is reachable on foot from the spawn, and the cell above it is the office's door.
11. `npm run gen-sprites` and `npm run gen-campus`, each twice in a row, leave `git status`
    clean; `overview.png` is 16x8 with 32 opaque pixels per frame, 16 of them `#181425`.
12. The state carries the overview, the dark step, the grace, the push and the creatures' homes,
    and survives the JSON round trip in the middle of a push.
13. In the smoke test `window.shadowAi.state.overview` is `{ current: 3, max: 3 }`, `dark` is 0,
    and the top-left pixel of the canvas is still grass.
14. CI is green, both smoke runs.

## Test plan

- `tests/unit/overview.test.ts`, new, on an open grass map, the lamp off unless said, the
  figure's feet at (160, 100) facing right, overview 3 of 3, `grace` 0:
  - the hit: a creature at (150, 100), D = 10, moves to x = 150.667 and hits in that step:
    overview is 2 of 3, `grace` is 90, `recoil` is `{ dx: 3, dy: 0, steps: 8 }`, and the
    creature is where its own step put it; a creature at (149, 100), D = 11, moves to 149.667,
    D = 10.333, and does not hit; one step later, at 150.333, it does;
  - the direction: a creature at (154, 92), D = 10, moves to (154.4, 92.533) and hits with
    `recoil` (1.8, 2.4); a creature at (160, 100), on the figure's spot, hits with `recoil`
    (−3, 0), the opposite of facing right;
  - the push: after the hit from (150, 100), with `left` and `lamp` held, the figure's x is 163
    after one step and 184 after eight; its facing is still right, its phase 0, `lamp.on` false
    in all eight; after the eighth `recoil` is `{ dx: 0, dy: 0, steps: 0 }`; in the ninth step
    the lamp is on and the figure turns left; on a picture grid with a solid cell 10 px behind
    the figure the push ends flush against that cell;
  - the grace: with `grace` 2 and a creature at D = 9 there is no hit and `grace` is 1; one
    step later there is a hit; from a hit, 89 further steps with a creature kept at D = 9 lose
    no further point, and the 90th does;
  - the lamp as defence: the lamp on, a creature at (170, 100), so B = (170, 92), d = 10, s = 4:
    it is lit, `light` is 1, and overview stays 3; the same step with the lamp off is a hit;
  - one hit per step: two creatures at (150, 100) and (170, 100) take one point, not two, and
    the push is away from the first;
  - the last point: with overview 1 of 3 a hit gives `current` 0 and `dark` 1, and `grace` and
    `recoil` are unchanged;
  - the dark: from `dark` 1, with every key held, a figure at (300, 200), one creature at
    (310, 200) with `light` 0 and home (40, 40), and a wake point at (80, 60): after 43 steps
    `dark` is 44 and the figure, the creature and overview are unchanged, `lamp.on` is false and
    `tick` has grown by 43; after the 44th `dark` is 45, the figure is at (80, 60) facing down
    in phase 0 with `grace` 0, overview is 3 of 3, the creature is at (40, 40), `captured` is
    unchanged and the camera is the one `followPlayer` gives for the figure; after 88 steps
    `dark` is 89; after the 89th it is 0; the 90th is a normal step: the figure moves.
- `tests/unit/creature.test.ts` extended — `creaturesFrom` sets `home` to the point's position;
  a step leaves `home` unchanged; a `wake` point makes no creature.
- `tests/unit/state.test.ts` extended — the initial state has overview 3 of 3, `dark` 0,
  `grace` 0 and `recoil` `{ dx: 0, dy: 0, steps: 0 }`; a map with one `wake` point starts; a map
  with two throws `more than one point object "wake"`; a map with none wakes the figure at the
  spawn; a point named `snipet` still throws 0008's message; the populated round-trip state has
  overview 2 of 3, `grace` 85, `recoil` `{ dx: 1.8, dy: 2.4, steps: 3 }` and a creature away
  from its home; a second one has `dark` 30.
- `tests/unit/campus.test.ts` extended — the map's points are the three snippets and `wake` at
  (792, 744), in that order; the box [786, 798) × [736, 744) is free of solid cells; cell
  (49, 46) is reachable from the spawn; cell (49, 45) is the door of the data protection
  officer's office; file and generator still agree.
- `tests/unit/draw-scene.test.ts` extended — with overview 2 of 3 the three `drawSprite` calls
  of the overview sheet come after the last tile of `above`, with frames 0, 0, 1 at (4, 4),
  (14, 4), (24, 4); with `dark` 0 there is no `fillRect`; with `dark` 1, 15, 30, 45, 60, 75 and
  89 the two `fillRect` calls come last, in `#181425`, with L = 3, 45, 90, 90, 90, 45 and 3; the
  player's sprite is drawn with `grace` 90, 3 and 0 and left out with `grace` 87 and 4.
- `tests/unit/gen-sprites.test.ts` extended — the overview sheet: two runs byte-identical and
  equal to the committed file; 16x8; per frame 32 opaque pixels, 16 of them `#181425`; frame 1
  differs from frame 0 only in `#3a4466` for `#fee761`.
- `tests/unit/assets.test.ts` unchanged: the new sheet falls under the palette rule, and the
  reserved colour is not in it.
- `tests/arch/` unchanged; `src/game/overview.ts` falls under its rule.
- Smoke spec extended: after the handle appears, `state.overview` is `{ current: 3, max: 3 }`
  and `state.dark` is 0; the first creature now carries `home: { x: 1288, y: 760 }`. The check
  of the top-left pixel stays as it is: the first light's pixels start at surface (5, 5).
- No new fixture files: the maps of these tests are built in the test, like the grass map.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not
maximized, the developer console open beside the game; the campus of 0008, the figure at the
spawn in the courtyard; a terminal in the repository root on the feature branch.

1. Open `http://localhost:5173`.
2. Expected: the figure stands in the courtyard facing down. In the top-left corner of the game
   three small yellow lights stand in a row.
3. Walk right along the beige path until the first scrap comes toward the figure. Stand still,
   do not press `Space`, and let it reach the figure.
4. Expected: as the scrap arrives, the figure is thrown about a tile and a half away from it and
   blinks. The right one of the three lights is now dark.
5. Keep standing and do not press anything until the figure has been thrown a second time.
6. Expected: the scrap comes back to the figure's feet and waits there while the figure blinks.
   About a second and a half after the first hit the blinking stops, the figure is thrown again
   and the middle light goes dark.
7. At once hold `A` for about one second, release, tap `D` so the figure faces the scrap, and
   hold `Space` until the scrap has vanished.
8. Expected: the scrap freezes in the light and vanishes after about one second. One light is
   still on; no further light went dark.
9. Walk right along the path to the second scrap, in front of a door. Stand still and let it
   reach the figure.
10. Expected: the screen closes from the top and the bottom to black in about half a second,
    stays black for about half a second and opens again.
11. Expected: the figure now stands in front of the door of a building at the left side of the
    courtyard, facing down. All three lights are on.
12. In the console enter `shadowAi.state.captured.snippet`, then
    `shadowAi.state.creatures.length`.
13. Expected: `1`, then `2`.
14. Walk right, back along the path to the door where the second scrap was.
15. Expected: the scrap is at its old place in front of the door and comes toward the figure
    again.
16. Walk around the scrap to the wall beside the door, stand with the figure's head against the
    wall, tap `S` so the figure faces down, and let the scrap reach the figure from below.
17. Expected: one light goes dark and the figure blinks. The figure stays in front of the wall;
    it is not pushed into it.
18. Hold `Space` on the scrap until it vanishes.
19. Expected: the scrap freezes and vanishes; two lights are on.
20. In the terminal run `npm run gen-sprites`, `npm run gen-campus`, both again, then
    `git status`.
21. Expected: no changes.
22. Open `public/sprites/overview.png` in an image viewer.
23. Expected: two 8x8 frames side by side: a yellow disc with a dark rim, and a grey-blue disc
    with a dark rim.

**Feel:** Is the push — a tile and a half — too far, too short or right? Is a second and a half
of safety enough to turn and raise the lamp, or so long that the scrap stops being a danger? Does
the blinking read as "safe for now"? Can you read the three lights at a glance, and do they read
as overview, or as something else? Is the hit clear without a sound? Is the closing and opening
of the screen the right length, and does it read as losing overview and waking up — or as a
loading screen? Does waking in front of the office feel like a way back and not like a
punishment? Are three points the right number against this creature?

**Result:** not yet walked.

## Open questions

None.
