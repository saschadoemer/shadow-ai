# 0025 — The cleared region

**Status:** draft
**Milestone:** M5
**Drafted:** 2026-11-18

## Goal

A solved case clears its region for good. In the moment the case of Sales is solved, the room
gets its colours back, and the violet veil thins out over two seconds and is gone. The shadow
wall of the region and the creatures that still live in it go with it. It is the picture the
first act ends on: the player stands in a room that is in colour again.

## Scope

Built on 0023 and 0024 as merged. No change to the map, the input or the text.

**In:**

- A region is cleared when its case is solved; a cleared region is not under shadow.
- The clearing: colour at once, and the veil thinning in three parts over two seconds.
- Two more frames on the veil's sheet for the thinning.
- In the step that solves a case, the standing shadow walls of its region and the creatures
  whose home lies in it leave the game.
- With the implementation: `gameplay.md` §3 and §6; `world.md` §1 and §4;
  `architecture.md` §2 and §5; `visual.md` §4; `testing.md` §2; the README.

**Out, explicitly:** more colleagues who see the shadow, as a rule of the game — who sees
it, and what changes for those who do (M6); in this feature Sales shows it only by what its
colleague says since 0024 · a title or an end card for the teaser (M8) · a region cleared
in part, in grey (`docs/plan.md` §5, deferred) · creatures outside the region: the snippet
in the east corridor stays · the regions of the other cases (M6) · a sound for the clearing ·
overview and the journal: 0024 changed them.

## Behaviour

Refines `gameplay.md` §3 and §6, `world.md` §1 and §4, `architecture.md` §2 and §5 and
`visual.md` §4.

### Cleared

A region is **cleared** when it is in `GameState.solved` (0024). No field is added to the
state: `solved` already says which regions are cleared and since which step.

The rule of 0023 is narrowed by it: a cell is **under shadow** when it lies in an area of a
region whose density is above 0 **and that is not cleared**. A cell of a cleared region is
drawn from the tileset, in its colours, from the frame after the solving step.

### The clearing

`CLEAR_STEPS` is 120, two seconds, *tune*. For that long after a region is cleared, its
cells still carry a veil that thins out. With e = `tick` − `at`, the steps since the case
was solved:

| e | The veil over the region's cells |
|---|---|
| 0 to 39 | the frame of the region's density, as before the clearing |
| 40 to 79 | frame 3: 16 pixels |
| 80 to 119 | frame 4: 8 pixels |
| 120 and more | none |

The veil is drawn where 0023 draws it, after `detail` and before the lamp's cone. The colours
come back at once and the veil goes in three steps: the room does not fade, it comes clear.
The game goes on while it happens; the dialogue that solved the case is closed, and the
player can walk.

`public/sprites/shadow-veil.png` grows from three frames to five, 80x16. The first three are
those of 0023. With x and y counted in the frame:

| Frame | Opaque where | Pixels |
|---|---|---|
| 3 | x and y are both multiples of 4 | 16 |
| 4 | x and y are both multiples of 4, and x + y is a multiple of 8 | 8 |

Every opaque pixel is `#68386c`. Both patterns repeat every 8 px and join without a seam.

### What goes with the shadow

The step that solves a case (0024) also changes, for the region of that case:

- every shadow wall of the region that still stands leaves `shadowWalls`, as a lifted wall
  does (0014);
- every creature whose home lies in an area of the region leaves `creatures`. It is not
  captured: `captured` does not change. A creature that was captured before is already gone
  and stays counted.

The home is the map point a creature started at (0008); it lies in an area when it is inside
the area's rectangle, the left and the upper edge included. A creature whose home lies in no
area of the region stays, wherever it is at that moment.

On the floor, solving Sales removes its shadow wall, if it should still stand, and the two
snippets of Sales that are not yet captured. The snippet whose home is in the east corridor
stays: the corridor is no region. The wake of 0009 brings back no creature that left this
way.

## Acceptance criteria

1. A region is cleared exactly when `solved` holds it; `GameState` has no field that this
   feature added.
2. A cell of an area of Sales is under shadow while `solved` is empty and is not once Sales
   is solved; the cells of Marketing, of density 1 too, stay under shadow.
3. From the frame after the solving step, the scene draws the cells of Sales from the
   tileset on all three layers.
4. With e steps since the solving, the scene draws over the cells of Sales the veil's frame
   0 for e = 0 and 39, frame 3 for e = 40 and 79, frame 4 for e = 80 and 119, and no veil
   for e = 120; over Marketing it draws frame 0 throughout.
5. For a region of density 3 the first part of the clearing shows frame 2, then frames 3
   and 4.
6. `shadow-veil.png` is 80x16, equals its generator's output, has 32, 64, 128, 16 and 8
   opaque pixels in its frames, all `#68386c`, at the places of the two tables, and its
   first three frames are those of 0023 pixel for pixel.
7. The solving step removes every standing wall of the solved region from `shadowWalls` and
   leaves the walls of the other regions as they are.
8. The solving step removes every creature whose home lies in an area of the solved region,
   wherever it is, and keeps every other creature, also one that stands inside the region
   at that moment; `captured` is unchanged.
9. On the floor, with nothing captured, solving Sales leaves one creature — the one whose
   home is (1224, 622) — and with both snippets of Sales captured before, it removes none.
10. The wake after a solved case brings back only the creatures that are still in
    `creatures`.
11. A state in which no case is solved steps and is drawn exactly as before this feature:
    the 600 recorded steps of 0020 give the same digest, and the scene tests of 0023 pass
    unchanged.

## Test plan

- **Unit, `game/region`:** criterion 2 on two areas built in the test, with `solved` empty,
  with one and with both regions solved; the veil of a cell by e for densities 1 and 3
  (criteria 4 and 5), at each boundary.
- **Unit, `game/cases`:** criteria 7 and 8 on a state with two walls of two regions and
  three creatures — one at home in the region, one at home outside and standing inside, one
  at home in another region; `captured` before and after.
- **Unit, state:** criterion 10; the digest of criterion 11; a JSON round trip in the middle
  of a clearing.
- **Unit, floor:** criterion 9 on the floor as loaded, with the case made ready in the
  state; the homes of the three snippets against the area of Sales.
- **Unit, sprites:** the generator against the committed sheet; criterion 6 — the pixel
  counts, the places, the first three frames against 0023, the 8 px period of the new two.
- **Assets:** the sheet against Endesga 32; it stays in the list of shadow assets.
- **Unit, scene:** criteria 3 and 4 — the tileset of the region's cells and the veil's frame
  at e = 0, 39, 40, 79, 80, 119 and 120, on a map with two areas of which one is solved.
- **Architecture:** unchanged.
- **Smoke:** unchanged.
- **Fixtures:** none; the tests build their maps from those of 0023 and 0024.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp, `E` or `Enter` talks.

**Steps:**

1. Walk right into the corridor and down it to the wide corridor at its end, right along
   that to the second doorway in its lower wall, and up the corridor that leads up above
   that doorway. Keep away from the scrap that comes for the figure, or walk past it; do
   not capture it. Hold the lamp on the violet strip in the doorway on the right until it
   is gone, and walk in.
2. Expected: the room is grey under thin violet dots. Two scraps come for the figure.
3. Capture one of the two scraps and keep away from the other. Find the five traces, each
   from below the chair of its desk: the first and the fourth desk of the first row, the
   third of the second row, the second of the third row, the fourth of the fourth row.
4. Expected: after the fifth, one scrap is still in the room.
5. Walk to the colleague in the pink shirt and press `E` three times, a moment apart.
6. Expected: with the third press the box is gone, and in the same moment the room is in
   colour: the carpet is lighter, the desks are brown, the plants green. The violet dots
   are still there.
7. Watch the room for three seconds.
8. Expected: the dots thin out twice and are gone after about two seconds. The room looks
   like the reception: colours, no dots.
9. Look for the scrap that was left in the room.
10. Expected: it is gone.
11. Walk out through the doorway into the corridor.
12. Expected: the scrap of the corridor is still there and comes for the figure. The room
    behind the figure stays in colour.
13. Walk down to the wide corridor and look at the large room at the right of its lower
    wall.
14. Expected: that room is still grey under its dots.
15. Walk back into the first room.
16. Expected: it is in colour, without dots, and no scrap is in it.

**Feel:**

- Is the clearing a moment — is it seen, is it enough for the end of the first act?
- Colour at once and the dots in three steps: right, or should the colour come last?
- Are two seconds right?
- The scrap that was left simply is not there any more. Does it need to be seen going?
- Does the room read as a different place afterwards?

**Result:** not yet walked.

## Open questions

None. Six were settled on 2026-11-18, each as drafted:

- Colour at once, the veil in three steps: the colours come back in the frame after the
  case is solved, and the veil thins out in two seconds.
- The creatures that are left: creatures whose home is in the cleared region leave the game
  without being captured, and the journal does not count them.
- The corridor's snippet stays: its home is in the east corridor, which is no region.
- The wall: a shadow wall of the cleared region that still stands goes with the case.
- Who sees the shadow: nothing in the game counts or shows it in this feature; the rule is
  left to M6.
- No end card: the first act ends in the cleared room and the game goes on; a card belongs
  to the title screen of M8.
