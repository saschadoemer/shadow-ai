# 0039 — The carpets

**Status:** draft
**Milestone:** M5
**Drafted:** 2026-11-19

## Goal

Two carpets lie in the corridors of the floor: one says LMIS, one says Harmonic. A player
walks over them and reads the names, and nothing else happens. The two real names of the game
are in its world as decoration, and no rule of the play knows them.

## Scope

Built on 0034 as merged. The floor gets two rectangles; no tile changes. It takes the place of
0035, the Harmonic station, which was rejected in its walk.

**In:**

- A fifth kind of rectangle, `carpet:<name>`, and the two carpets in `tools/floor-layout.ts`
  and `floor.tmj`.
- `game/carpet`: the carpets of a map, and the names a carpet may carry.
- The scene draws a carpet: a frame, a field and the name.
- The language table gets two keys in German and English.
- With the implementation: `vision.md` §10; `world.md` §6; `architecture.md` §5 and §6;
  `visual.md` §3; `testing.md` §2; the README.

**Out, explicitly:** any effect on the play — a carpet is not solid, takes no press, slows
nobody and hides nothing, and no creature, mover or figure knows it · a line of a figure, a
notice or an entry of the journal about either name (`vision.md` §10) · a logo, a picture or
a colour that stands for a brand (`vision.md` §10: a name, never a logo) · a third carpet, or
a carpet in a room — a number in the budget first (`docs/plan.md` §3) · a tile of its own for
a carpet (art pass) · the card on which LMIS presents the game (0036) · anything of the
Harmonic station (0035, rejected) · sound.

## Behaviour

Builds what `vision.md` §10 and `world.md` §6 settle, and refines them where they leave a
place open: the cells, the size, the look and the words.

### The two carpets

Two rectangles in the `objects` layer, written after the objects of 0033; `nextobjectid` is
135. No object of an earlier feature changes its id, and no tile of the floor changes.

| Rectangle | Cells | Box | Id |
|---|---|---|---|
| `carpet:lmis` | columns 24–27, rows 43–45 | (384, 688, 64, 48) | 133 |
| `carpet:harmonic` | columns 74–77, rows 40–42 | (1184, 640, 64, 48) | 134 |

Each is four cells wide and three high, and lies in the middle four of the six columns of its
corridor.

- **LMIS** lies in the west corridor in front of the opening of the reception, rows 42 to 46.
  The figure starts on cell (16, 44), level with the carpet's middle row: whoever walks east
  out of the reception walks over it.
- **Harmonic** lies in the east corridor, directly below the doorway of Sales, rows 37 to 39.
  It is clear of the cell (76, 38), where the snippet of the corridor waits, and its name is
  in the picture for a figure that stands anywhere in the doorway.

Every cell of a carpet has the corridor tile on `ground`, no tile on `detail` and none on
`above`, and lies in no area of a region. No route of a mover leads over one.

### What a carpet is

`game/carpet` reads the carpets of a map from its rectangles, in the order of the file, as
`{ name, box }`. It holds the names a carpet may carry, each with its key: `lmis` and
`harmonic`. It refuses, each with its message:

- a name it does not hold: `carpet carpet:acme names no carpet`;
- a box that is not on the grid — a corner or a size that is no multiple of 16:
  `carpet carpet:lmis (390, 688, 64, 48) is not on the grid`;
- a second carpet of a name: `carpet carpet:lmis is the second of its name`.

A carpet is nothing else. It has no solid and no opaque box. `GameState` gets no field, and no
step reads a carpet: a game steps exactly as before. No coordinate of a carpet is in `src/`
(INV-7).

### The look

A carpet is drawn over its box, in map pixels minus the camera:

- a frame of 1 px in `#262b44`, the whole box;
- inside it the field in `#124e89`, the box less 1 px on every side;
- the name in the game's font, white, centred on the box: a name of n characters starts at
  x = box.x + (box.width − 6n) / 2 and y = box.y + (box.height − 10) / 2.

So `LMIS` starts at (404, 707) and `Harmonic` at (1192, 659).

A carpet is floor: it is drawn after the `ground` layer and before `detail`. The cone, the
traces, every figure, mover and creature are in front of it. It is drawn in every frame in
which the world is drawn, wherever the camera stands. The corridors are not under shadow
(`visual.md` §4), so a carpet has no grey form and gets no veil.

With the figure on its start cell the camera stands at (96, 624): the left half of the LMIS
carpet is in the first picture of a game, from (288, 64) to the right edge, with the letters
`LM` from (308, 83).

### The words

| Key | `de` | `en` |
|---|---|---|
| `carpet.lmis` | `LMIS` | `LMIS` |
| `carpet.harmonic` | `Harmonic` | `Harmonic` |

No other text of the game holds either name.

## Acceptance criteria

1. `floor.tmj` holds the two rectangles of the table with the ids 133 and 134 after the
   objects of 0033, which are unchanged; `nextobjectid` is 135; the three tile layers are
   unchanged.
2. Every cell of both carpets has the corridor tile on `ground`, no tile on `detail` and
   `above`, no solid box, and lies in no area of a region.
3. `game/carpet` reads the two carpets of the floor as `{ name: 'lmis', box }` and
   `{ name: 'harmonic', box }` with the boxes of the table, and refuses the three faulty maps
   of the spec, each with its message.
4. The loaded floor has the solid and the opaque boxes it had before, and `GameState` has no
   new field: the 600 recorded steps of 0020 give the same digest.
5. For each carpet the scene draws exactly a rectangle of the box in `#262b44`, a rectangle
   of the box less 1 px on every side in `#124e89`, and the name from the centred point —
   after the last tile of `ground` and before the first of `detail`, in both languages alike.
6. With the figure on its start cell the frame of the LMIS carpet is drawn from (288, 64),
   its field from (289, 65) with 62x46, and its name from (308, 83).
7. With the journal open, no carpet is drawn.
8. `de` and `en` hold the two keys of the spec, and each name fits its carpet: 6n + 4 is at
   most the width of its box.
9. No other key of either table holds `lmis` or `harmonic`, in any case of letters; no page
   of a figure does, and no table of the world data.

## Test plan

- **Unit, `game/carpet`:** reading in file order; the three refusals; a map without a carpet
  gives none.
- **Unit, floor:** the two rectangles, their ids and `nextobjectid`; the objects before them
  and the three tile layers against a recorded digest; criterion 2 cell by cell; the solid and
  opaque boxes of the loaded floor against those of the map without the two rectangles.
- **Unit, scene:** criteria 5 to 7 on a map built in the test and at the start cell of the
  floor, in both languages.
- **Unit, state:** the digest of criterion 4.
- **Unit, text:** the two keys; criterion 8; criterion 9.
- **Architecture:** `game/carpet` is one more file of `src/game/` and passes the boundary
  test. **Assets:** unchanged.
- **Smoke:** after loading, with the figure on its start cell, the pixel (296, 72) of the
  surface is `#124e89`.
- **Fixtures:** none; the maps are built in the tests.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded and the call (0026) is read to its end; the figure stands in the reception.
Arrow keys or WASD walk, `Space` holds the lamp, `E` or `Enter` talks, `J` opens and closes
the journal.

**Steps:**

1. Walk right, out of the reception through its opening, and stop in the corridor.
2. Expected: in front of the opening lies a dark blue carpet with a dark edge, four cells
   wide and three high, and in its middle, in white, `LMIS`.
3. Walk across the carpet, stop on the name, and walk on.
4. Expected: the figure walks over it as over the floor and is drawn over the name; no line
   appears.
5. Stand on the carpet and press `E`.
6. Expected: nothing happens.
7. Fetch the lamp from the data protection officer. Then walk down to the south corridor,
   along it to the right, and up the east corridor to the doorway of Sales.
8. Expected: just below the doorway lies a carpet of the same look that says `Harmonic`.
9. Stand on that carpet and hold the lamp on the scrap of paper that comes at the figure
   until it is gone.
10. Expected: the yellow cone and the scrap are in front of the carpet, and the scrap is
    caught as ever.
11. Press `J` and look at every tab with the arrow keys.
12. Expected: no tab names LMIS or Harmonic.

**Feel:**

- Do the two read as carpets, part of the floor — or as signs that lie about?
- Dark blue on the sand of the corridor: fitting, or too loud?
- Is one of each enough to be noticed, or too little?
- Does the LMIS carpet in front of the reception read as "presented by" — or as "this is the
  office of LMIS"?
- The first picture of a game shows `LM` at its right edge. A nuisance?

**Result:** not yet walked.

## Open questions

Six, each with the answer the draft is written for:

- **The cells.** LMIS in front of the reception, Harmonic directly below the doorway of
  Sales. Drafted so that every player passes both in Act 1.
- **How many.** One of each; the budget says 2. More is a number first.
- **The look.** 64x48 px, a field in `#124e89` with a frame in `#262b44`, the name in white
  in the game's font. Drawn by the scene from a rectangle of the map, with the name from the
  language table — not painted into a tile, so that the name stays the font's and INV-4
  holds to the letter.
- **LMIS in the world.** `vision.md` §10 said "LMIS is the frame, not the world"; with a
  carpet it says "the frame, not the company". The house the data leaks from then has the
  name LMIS on the floor in front of its reception. Drafted as the author asked; the
  presenter's line of 0036 is what says whose name it is.
- **0036 stays.** The card `LMIS präsentiert` is built after the carpets, unchanged but for
  two lines: it is built on 0039, and its criterion 9 lets the carpet's key hold the name.
- **The order.** 0039 first, then 0036, 0037 and 0038. The object ids of 0037 and 0038 move
  up by one: 135 to 139 and 140 to 142.

Who checks stays as settled for 0035: whether the advertising is recognizable enough, and how
the licences leave out the two names (`vision.md` §9 and §10), is checked by a competent
person before the address of 0030 is announced to anybody outside. It is a condition of
announcing, not of merging this feature.
