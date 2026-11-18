# 0023 — The shadow over the regions

**Status:** draft
**Milestone:** M5
**Drafted:** 2026-11-18

## Goal

A region under shadow looks it. Its floor, its walls and its furniture are drawn darker and
without colour, and a violet veil lies over them — thin in Sales, dense in Development. The
reception, the break room and the corridors keep their colours. The player sees at a glance
where the shadow is, and later where it is gone.

## Scope

Built on 0022 as merged. No change to the state, the input or the rules of the game: this
feature draws what the world data already says. The floor gets ten rectangles.

**In:**

- Region areas as rectangles of the map named `region:<id>`, on whole cells.
- `src/game/region.ts`: the areas of a map, and which cell is under shadow.
- The shadow tileset `public/tiles/placeholder-shadow.png`: the tileset's image in six greys,
  one step darker, generated with it.
- The veil `public/sprites/shadow-veil.png`, the fourth shadow asset: one frame per density.
- The scene draws the cells under shadow from the shadow tileset and lays the veil over
  them.
- With the implementation: `world.md` §1; `architecture.md` §1, §5, §6 and §7; `visual.md`
  §4 and §5; `testing.md` §2; the README.

**Out, explicitly:** a region that clears and gets its colours back — nothing clears a
region before a case is solved (0025) · `GameState.cleared` (0025) · the figures, the
colleagues, the creatures, the shadow walls and the traces without colour or under the veil:
they are drawn as they are · a veil that moves or flickers · the shadow over single devices
(the traces of 0022) · darkness that hides anything: nothing in a shadowed room is harder to
find or to walk · Management and the server room (M6, M7, with their maps) · the art pass
for either new file.

## Behaviour

Refines `world.md` §1, `architecture.md` §5 and §6 and `visual.md` §4 and §5.

### Region areas in the map

A rectangle of the `objects` layer named `region:<id>` is an area of a region of the world
data (`src/game/world.ts`): whole cells, its corner on the grid, its width and its height
multiples of 16. A region may have several areas; they share the name.
`src/game/region.ts` reads the areas from the map's rectangles in file order and refuses the
map in `createInitialState`:

- a region the world data does not know: `region region:cellar names no region`;
- a box that is not whole cells: `region region:sales (1264, 418, 448, 416) is not whole cells`.

`wallsOf` and the traces of 0022 skip the rectangles named `region:`; a rectangle of no
known kind is still an error. A map without such rectangles has no areas, and a region of
the world data without an area on a map is simply not on it.

On the floor, `tools/floor-layout.ts` builds the areas from its rooms, and `floor.tmj` gets
ten more rectangles after the traces, with the ids 104 to 113; `nextobjectid` is 114. An
area is the room as the layout knows it: its cells with its upper and its left wall, which
are strips on those cells (0010).

| Rectangle | Cells | Box | Density |
|---|---|---|---|
| `region:hr` | (1, 1)–(21, 19) | (16, 16, 336, 304) | 2 |
| `region:accounting` | (22, 1)–(43, 19) | (352, 16, 352, 304) | 2 |
| `region:development` | (44, 1)–(84, 19) | (704, 16, 656, 304) | 3 |
| `region:meeting-rooms` | (89, 1)–(106, 9) | (1424, 16, 288, 144) | 1 |
| `region:meeting-rooms` | (89, 10)–(106, 19) | (1424, 160, 288, 160) | 1 |
| `region:reception` | (1, 38)–(22, 51) | (16, 608, 352, 224) | 0 |
| `region:break-room` | (29, 26)–(48, 51) | (464, 416, 320, 416) | 0 |
| `region:sales` | (79, 26)–(106, 51) | (1264, 416, 448, 416) | 1 |
| `region:marketing` | (1, 58)–(48, 78) | (16, 928, 768, 336) | 1 |
| `region:support` | (49, 58)–(106, 78) | (784, 928, 928, 336) | 1 |

The corridors, the side passage, the lift, the stairwell and the data protection officer's
office are no regions and have no area.

### Under shadow

A cell is **under shadow** when it lies in an area of a region whose density is above 0. Its
**veil** is that density; where two such areas overlap, the larger one counts. A cell in no
area, or only in areas of density 0, is not under shadow. Nothing in the state decides this
in this feature: it follows from the map and the world data. Lifting the shadow wall of a
doorway changes nothing in the room behind it — the wall was the door, not the shadow.

### The shadow tileset

`public/tiles/placeholder-shadow.png` has the size of the tileset's image, 256x48, and the
same tiles at the same places. `tools/placeholder-tiles.ts` renders it from the tileset's
pixels: a transparent pixel stays transparent, and an opaque pixel becomes a grey.

The **ramp** is six colours of the palette, from dark to light: `#181425`, `#262b44`,
`#3a4466`, `#5a6988`, `#8b9bb4`, `#c0cbdc`. The **weight** of a colour is
299 × R + 587 × G + 114 × B. The grey of a colour is found in two steps:

1. the ramp colour whose weight is nearest to the colour's weight — no colour of the palette
   lies exactly between two;
2. one step darker on the ramp; `#181425` stays.

So the carpet's `#8b9bb4` becomes `#5a6988`, a desk's `#e4a672` becomes `#8b9bb4`, a plant's
`#3e8948` becomes `#3a4466`, and white becomes `#8b9bb4`. The step darker matters: the
carpet of the rooms is grey already, and without it only the furniture would change.

The shadow tileset has no `.tsj` of its own. It is drawn with the tileset's ids; the game
finds it beside the tileset's image, by the name with `-shadow` before `.png`.

### The veil

`public/sprites/shadow-veil.png` is 48x16: three 16x16 frames, one per density, the fourth
shadow asset (`visual.md` §4). Every opaque pixel is the signature colour `#68386c`; with
x and y counted in the frame:

| Frame | Density | Opaque where | Pixels |
|---|---|---|---|
| 0 | 1 | x and y are both multiples of 4, or both 2 more than one | 32 |
| 1 | 2 | x + y is a multiple of 4 | 64 |
| 2 | 3 | x + y is a multiple of 2 | 128 |

Each pattern repeats every 4 px, so the frames join without a seam from cell to cell.
`tools/placeholder-veil.ts` generates the sheet. The numbers *tune*.

### Drawing

The scene changes in two places:

1. **The tile layers.** `ground`, `detail` and `above` draw a cell under shadow from the
   shadow tileset — the same id at the same place — and every other cell from the tileset.
2. **The veil.** After `detail` and before the lamp's cone, every cell under shadow that the
   view touches gets the veil's frame for its density − 1, with its top-left corner at
   (16 × column − camera.x, 16 × row − camera.y).

Everything else is drawn as before and after the veil: the cone, the shadow walls, the
traces, the movers, the figures, the creatures and the player keep their colours, and
`above` is drawn without a veil. So a person in a room under shadow stands out in colour
against a floor that has none.

`SceneContent` gets the shadow tileset and the veil's sheet; `main.ts` loads both.

## Acceptance criteria

1. `floor.tmj` holds the ten rectangles of the table with the ids 104 to 113 after the
   objects of 0022, which are unchanged; `wallsOf` still gives eight walls and the traces
   three.
2. `game/region` gives the floor ten areas with the regions, boxes and densities of the
   table; a map with a `region:` rectangle of an unknown region or of a box that is not whole
   cells does not start, each with its message; a map without such rectangles has no areas.
3. Every room of the layout that is a region has its area, with exactly the room's cells;
   the corridors, the lift, the stairwell and the office have none.
4. On the floor the veil of the cells (90, 30), (10, 70), (100, 70) and (95, 5) is 1, of
   (5, 5) and (30, 10) it is 2, of (60, 10) it is 3; the cells (10, 45), (40, 40), (25, 30),
   (10, 30) and (55, 40) are not under shadow.
5. Where an area of density 1 and one of density 3 overlap, the veil is 3; a cell on the
   last column and the last row of an area is under shadow, and the cell beyond is not.
6. The grey of `#8b9bb4` is `#5a6988`, of `#e4a672` `#8b9bb4`, of `#3e8948` `#3a4466`, of
   `#ffffff` `#8b9bb4`, of `#262b44` `#181425` and of `#181425` `#181425`; every colour of
   the palette has a grey of the ramp.
7. `placeholder-shadow.png` is 256x48, equals its generator's output, has the alpha of
   `placeholder.png` pixel for pixel, and every opaque pixel is the grey of the pixel at its
   place; it passes the asset test.
8. `shadow-veil.png` is 48x16, equals its generator's output, has 32, 64 and 128 opaque
   pixels in its frames, all `#68386c`, at the places of the table, and passes the asset
   test as the fourth shadow asset.
9. The scene draws a cell under shadow from the shadow tileset on each of the three layers,
   with the id and the place it has in the tileset, and a cell that is not from the tileset.
10. The scene draws the veil's frame density − 1 on every cell under shadow that the view
    touches, after `detail` and before the cone, and on no other cell.
11. The sprites of the player, the movers, the figures, the creatures, the walls and the
    traces are drawn from their own sheets at their places, as before.
12. `GameState` and `GameInput` are unchanged, and the 600 recorded steps of 0020 give the
    same digest.

## Test plan

- **Unit, `game/region`:** the areas of a map in file order; the two refusals; a map without
  areas; `wallsOf` and the traces on rectangles that include areas, and the refusal of a
  rectangle of no known kind; criterion 5 on two areas built in the test.
- **Unit, floor:** the ten rectangles and their ids; the objects of 0022 unchanged; criterion
  3 against the layout's rooms; criterion 4 on the floor as loaded.
- **Unit, tiles:** criterion 6; every palette colour against the ramp and the rule, and that
  no weight lies exactly between two of the ramp; the generator against the committed
  shadow sheet; criterion 7 pixel for pixel against `renderTiles`.
- **Unit, sprites:** the veil's generator against the committed sheet; the pixel counts and
  the places of criterion 8; the patterns repeat every 4 px.
- **Assets:** both files against Endesga 32; the shadow tileset without the reserved colour;
  the list of shadow assets with the veil.
- **Unit, `draw-map`:** a layer with two cells under shadow and two that are not — which
  tileset each is drawn from.
- **Unit, scene:** criteria 9 to 11 on a map with one area of density 2 — the tile calls per
  tileset, the veil's calls with their frame and place, their position in the call list
  between `detail` and the cone, and the sheets of the sprites; a map without areas draws
  exactly what it drew before.
- **Unit, state:** the digest of criterion 12.
- **Architecture:** unchanged, now covering `src/game/region.ts`.
- **Smoke:** after loading, the pixel at the middle of a carpet cell of the reception has
  the carpet's colour as before; the test of 0015 on the shirt of the reception's colleague
  still holds.
- **Fixtures:** `tests/fixtures/maps/regions.tmj`, 20x12 on the tiles of `points.tmj`: the
  spawn, `region:hr` on the cells (2, 2)–(9, 9) and `region:reception` on (12, 2)–(17, 9).

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp.

**Steps:**

1. Look at the reception.
2. Expected: it is in colour as before — the carpet, the counter, the plants, the colleague
   in green and the dog.
3. Walk right into the corridor and down it to the wide corridor at its end.
4. Expected: the corridors are in colour. Below the wide corridor, the large room on the
   left is darker than the reception and has no colour: its floor, its walls and its desks
   are grey, and small violet dots lie over them in a regular pattern.
5. Hold the lamp on the violet strip in the doorway at the left of the lower wall until it
   is gone.
6. Expected: the strip is gone, and the room behind it looks as it did.
7. Walk into the room and to the colleague in the red shirt.
8. Expected: the figure, the colleague, the dog and the drone are in full colour and carry
   no dots; the floor and the furniture around them are grey under the dots.
9. Hold `Space` and turn once round.
10. Expected: the yellow cone lies over the dots and the grey floor in every direction.
11. Walk back and forth across the doorway.
12. Expected: the grey and the dots end at the room's upper wall; the corridor above it is
    in colour. Nothing flickers or shimmers while the view scrolls.
13. Leave the room, walk right along the wide corridor and look at the large room at the
    right of its lower wall. Then walk up the corridor that leads up above its doorway,
    hold the lamp on the scrap that comes for the figure until it is gone, and look at the
    room on the right.
14. Expected: both rooms are grey under the same thin dots as the first.
15. Walk on up into the wide corridor along the top and left to its end, and look at the
    rooms above it on the way.
16. Expected: the rooms at the right end have the thin dots; the long room in the middle is
    the darkest — every second pixel of it is violet; the two rooms on the left have more
    violet than the first and less than the long one, in diagonal lines.
17. Walk down the corridor at the left and look into the room on the right, between the two
    wide corridors, and then into the room above the reception.
18. Expected: both are in colour, without dots.
19. Press `J`.
20. Expected: the journal looks as before.

**Feel:**

- Is the room under shadow dark enough, or too dark? Can everything in it still be found?
- Do the grey and the violet read as shadow, or as a display fault?
- Can the three densities be told apart at a glance?
- The people keep their colours in a grey room. Right, or should they lose theirs too?
- The veil stands still. Should it move?

**Result:** not yet walked.

## Open questions

1. **Darker and grey.** A shadowed room is drawn in greys one step darker than its colours.
   With the placeholder tiles the carpet is grey already, so a room that only lost its
   colours would look almost the same. The alternative is the same brightness without
   colour. I propose the step darker; it is also what `vision.md` §4 says: the shadow
   darkens rooms.
2. **The veil.** One, two and four of sixteen pixels in violet for the densities 1, 2 and 3,
   standing still. `visual.md` §4 asks for form and motion beside the colour; the veil has
   form, and the walls and the creatures carry the motion. A veil that moves over whole
   rooms risks the shimmer that `visual.md` §2 warns of. Are these the densities, and may
   the veil stand still?
3. **People in colour.** The player, the colleagues, the dogs, the creatures and everything
   else that is not a tile keep their colours and get no veil. I propose it: nobody in the
   game is shadow, and they stay easy to see.
4. **The areas.** A region's area is its room as the layout knows it — with its upper and
   left wall, without the walls it shares with what lies below and right of it. So the grey
   ends a few pixels differently on the four sides. The exact alternative is a rule for
   walls, which I propose to leave to the art pass.
5. **One feature.** The grey tiles and the veil are one feature here. They can be cut in
   two; I propose one, because each alone is half a look, and the walk is short.
6. **No clearing yet.** Nothing gets its colours back in this feature: the first region
   clears with the case of Sales (0024, 0025). Until then four rooms the player can enter
   are grey for good. Is that acceptable for the time between the features?
