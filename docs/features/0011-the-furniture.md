# 0011 — The furniture

**Status:** draft
**Milestone:** M3
**Drafted:** 2026-11-13

## Goal

The floor of 0010 is furnished: cubicles in Sales, Support and Development, desks and cabinets
in the offices, desk islands in Marketing, tables in the meeting rooms and the break room, a
counter in the reception, mobile screens between open desks, printers and plants in the
corridors. After this feature every room
is recognized by what stands in it, the figure walks round furniture and behind tall things,
and the lamp shines over everything that is lower than a person.

## Scope

Built on 0010 as merged; its walk left the rooms' sizes as they are.

**In:**

- Seventeen furniture tiles in the placeholder tileset, ids 13–29; the sheet becomes 240x32,
  fifteen columns, two rows, so ids 0–12 keep their place.
- The tile property `low`: a tile that blocks walking but not light. `parseTileset` reads it;
  `TileMap.opaque` holds, per cell, the boxes of the tiles that are not low; `sightBlocked` is
  given those. `TileMap.solids` and `moveBox` are unchanged.
- `public/maps/floor.tmj` gets a `detail` layer with the furniture and an `above` layer with
  the tops of the tall things; `tools/floor-layout.ts` holds the placement tables below.
- With the implementation: `world.md` §1 one sentence per room on what stands in it;
  `visual.md` §3 the rule for tall things; `architecture.md` §6 `low` and `opaque`, §7 the
  seventeen tiles and the furniture in the generator; `testing.md` §1 and §2; the README.

**Out, explicitly:** figures at the desks (M4, M5) · furniture that can be used, opened or
moved · screens that show something, animated tiles · glass walls · a second tileset · sofas,
armchairs, beanbags, coffee machines, water dispensers, coat racks and gadgets (0012) ·
whiteboards and other decoration (the art pass, `visual.md` §5) · furniture in the lift and the
stairwell.

## Behaviour

### Low and tall

- `low` is a boolean tile property like `solid`. A tile with `low: true` and no box is
  rejected: `tile N is low but has no collision box`.
- `TileMap.opaque` is built like `solids`, from the tiles that are not low. Walls, the outer
  wall, closed doors and cabinets are opaque; everything else in this feature is low.
- The lamp's light (0008) is blocked by `opaque` only: a snippet beyond a desk or a partition
  is lit, one beyond a wall or a cabinet is not. Walking is blocked by `solids` as before, for
  the figure and for the snippets alike.
- A **tall thing** — a cabinet or a plant — is two tiles: its body on `detail` at (c, r) and
  its top on `above` at (c, r − 1). The top has no box. A figure standing in row r − 1 is drawn
  behind the top; a figure in row r + 1 is drawn in front of the body. The cell (c, r − 1)
  must lie in the same room or corridor as (c, r) and carry no furniture other than another
  tall thing's body — so a tall thing never stands in the first row below a wall.

### The tiles

Furniture tiles are transparent where nothing is drawn. A partition is a strip 2 px thick
along the top or left edge of its cell, like a wall but thinner and lighter. A screen is a
mobile partition: a panel 4 px thick through the middle of its cell, on two feet, so it stands
free of walls and desks and is told from a fixed partition by its place and its colour.

| Id | Name | Boxes | Low | Picture |
|---|---|---|---|---|
| 13 | partition-top | (0, 0, 16, 2) | yes | strip `#c0cbdc`, its lower row `#8b9bb4` |
| 14 | partition-left | (0, 0, 2, 16) | yes | strip `#c0cbdc`, its right column `#8b9bb4` |
| 15 | partition-corner | (0, 0, 16, 2) and (0, 0, 2, 16) | yes | both strips |
| 16 | desk | `solid` | yes | top `#e4a672`, edge `#b86f50` |
| 17 | desk-monitor | `solid` | yes | the desk, a monitor `#262b44` with a screen `#2ce8f5` |
| 18 | desk-partition | `solid` | yes | the desk, a partition strip on its top edge |
| 19 | desk-monitor-partition | `solid` | yes | the desk with monitor, a partition strip on its top edge |
| 20 | chair | (3, 3, 10, 10) | yes | seat `#5a6988`, back `#3a4466` |
| 21 | cabinet | `solid` | no | front `#c28569`, doors and edge `#733e39` |
| 22 | cabinet-top | — | — | the cabinet's upper side, `#e8b796` with edge `#c28569`, in the lower 8 px |
| 23 | plant | (4, 6, 8, 10) | yes | pot `#be4a2f`, stem `#265c42` |
| 24 | plant-top | — | — | leaves `#3e8948` and `#63c74d`, in the lower 12 px |
| 25 | table | `solid` | yes | top `#b86f50`, edge `#733e39` |
| 26 | counter | `solid` | yes | top `#ffffff`, edge `#c0cbdc` |
| 27 | printer | `solid` | yes | body `#c0cbdc`, paper tray `#ffffff`, panel `#3a4466` |
| 28 | screen | (0, 6, 16, 4) | yes | panel `#0099db`, its lower row `#124e89`; a foot `#3a4466`, 2 px wide and 2 px below the panel, at each end |
| 29 | screen-side | (6, 0, 4, 16) | yes | panel `#0099db`, its right column `#124e89`; a foot `#3a4466`, 2 px high and 2 px right of the panel, at each end |

No tile uses `#68386c`.

### The pieces

Placement is written in pieces; (x, y) is the piece's top-left cell.

- **Workplace (x, y):** desk-monitor at (x, y), desk at (x + 1, y), chair at (x, y + 1).
- **Cubicle (x, y):** five cells wide, three high, open to the south. Partition-corner at
  (x, y); desk-monitor-partition at (x + 1, y); desk-partition at (x + 2, y); partition-top at
  (x + 3, y) and (x + 4, y); partition-left at (x, y + 1) and (x, y + 2); chair at
  (x + 1, y + 1).
- **Bank (x, y, n):** n cubicles at (x + 5k, y), k = 0 … n − 1, closed on the right by
  partition-left at (x + 5n, y), (x + 5n, y + 1) and (x + 5n, y + 2). Banks stand three rows
  apart, so every aisle between them is 48 px.
- **Island (x, y):** desk-monitor at (x, y) and (x + 1, y); desk at (x, y + 1) and
  (x + 1, y + 1); chairs at (x − 1, y), (x + 2, y), (x − 1, y + 1) and (x + 2, y + 1).
- **Café table (x, y):** table at (x, y)–(x + 1, y + 1), four cells; chairs at (x − 1, y) and
  (x + 2, y + 1).
- **Screens across (x, y, n):** screen at (x + k, y), k = 0 … n − 1 — one panel n cells wide.
- **Screens down (x, y, n):** screen-side at (x, y + k), k = 0 … n − 1.
- **Cabinets c0–c1 × r**, **plant (c, r):** tall things, their tops one row above.

### The rooms

| Room | Furniture |
|---|---|
| Sales | banks (82, 28, 4), (82, 34, 4), (82, 40, 4), (82, 46, 4) — 16 cubicles, aisles in rows 31–33, 37–39 (level with the doorway) and 43–45, and columns 79–81 along the doorway's wall; cabinets 104–106 × 51; plant (80, 50) |
| Support | banks (51, y, 5) and (82, y, 4) for y = 61, 67, 73 — 27 cubicles, the aisle of columns 76–81 below the doorway; cabinets 105–106 × 78; printer (76, 78) |
| Development | banks (46, y, 3) and (67, y, 3) for y = 3, 9, 15 — 18 cubicles, the aisle of columns 61–66 above the doorway; cabinets 83–84 × 19; plant (44, 19) |
| HR | workplaces (3, 3), (14, 3), (3, 10); screens down (9, 3, 2); table (13, 10)–(14, 11) with chairs (12, 10) and (15, 11); cabinets 16–19 × 19; plant (1, 18) |
| Accounting | workplaces (25, 3), (36, 3), (25, 10), (36, 10); screens across (25, 7, 3) and (36, 7, 3); cabinets 22–25 × 19 and 39–43 × 19; printer (43, 7) |
| Data protection officer's office | workplace (4, 28); screens down (9, 30, 4); table (12, 31)–(14, 32) with chairs (11, 31) and (15, 32); cabinets 2–7 × 37; plant (21, 36) |
| Reception | counter 8–12 × 41 with a chair at (10, 40); plants (2, 41), (21, 40), (21, 50) |
| Break room | counter 32–45 × 26; café tables (33, 32), (41, 32), (33, 42), (41, 42); plant (47, 50) |
| Marketing | islands (5, y), (14, y), (32, y), (41, y) for y = 62, 70 — 8 islands, columns 18–30 free below the doorway; screens down (10, y, 2) and (37, y, 2) for y = 62, 70, between the islands of each pair; cabinets 2–9 × 78; plant (47, 78); printer (27, 78) |
| Meeting room north | table (94, 4)–(101, 5); chairs (95, 3), (98, 3), (95, 6), (98, 6) |
| Meeting room south | table (94, 14)–(101, 15); chairs (95, 13), (98, 13), (95, 16), (98, 16); plant (105, 19) |
| North corridor | printer (52, 20); plants (34, 25), (70, 25) |
| South corridor | printer (40, 57); plants (10, 57), (90, 57) |

The lift, the stairwell, the west and east corridors and the side passage stay empty.

**What that makes**, as tile counts on `detail`: partition-top 122, partition-left 170,
partition-corner 61, desk 24, desk-monitor 24, desk-partition 61, desk-monitor-partition 61,
chair 122, cabinet 34, plant 14, table 58, counter 19, printer 5, screen 6, screen-side 14 —
795 cells; on `above`:
cabinet-top 34, plant-top 14.

**What stays true from 0010.** The spawn (256, 718) and its box are free; row 44 is free from
x = 256 to x = 458; the view's top-left cell at the spawn, (6, 39), has nothing on `detail` or
`above`, so the corner pixel stays carpet; the three snippets' boxes and the wake point's box are free. Every corridor
and every room except the lift and the stairwell is reachable by the flood of 0010, and so is
every cubicle: its cells (x + 2, y + 1) and (x, y + 2).

**The first view** shows the reception's counter with the chair behind it, two of its plants,
and the opening to the corridor.

The picture is the furnished floor, for orientation only — the tables are the truth. As in
0010, and on top: `~` partition top, `!` partition left, `*` both, `m` desk with monitor, `d`
desk, `c` chair, `C` cabinet, `P` plant, `T` table, `K` counter, `R` printer, `_` screen, `i` screen-side. Tops are not drawn.

```
##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo####
#.....................|.....................|........................................|:::|.................#
o.....................|.....................|........................................|:::|.................o
o..md....i....md......|..md.........md......|.*md~~*md~~*md~~!.....*md~~*md~~*md~~!..|:::|.....c..c........o
#..c.....i....c.......|..c..........c.......|.!c...!c...!c...!.....!c...!c...!c...!..|:::.....TTTTTTTT.....#
#.....................|.....................|.!....!....!....!.....!....!....!....!..|:::.....TTTTTTTT.....#
o.....................|.....................|........................................|:::......c..c........o
o.....................|..___........___....R|........................................|:::|.................o
#.....................|.....................|........................................|:::|.................#
#.....................|.....................|.*md~~*md~~*md~~!.....*md~~*md~~*md~~!..|:::|.................#
o..md.......cTT.......|..md.........md......|.!c...!c...!c...!.....!c...!c...!c...!..|:::+-----------------o
o..c.........TTc......|..c..........c.......|.!....!....!....!.....!....!....!....!..|:::|.................o
#.....................|.....................|........................................|:::|.................#
#.....................|.....................|........................................|:::|.....c..c........#
o.....................|.....................|........................................|:::.....TTTTTTTT.....o
o.....................|.....................|.*md~~*md~~*md~~!.....*md~~*md~~*md~~!..|:::.....TTTTTTTT.....o
#.....................|.....................|.!c...!c...!c...!.....!c...!c...!c...!..|:::......c..c........#
#.....................|.....................|.!....!....!....!.....!....!....!....!..|:::|.................#
oP....................|.....................|........................................|:::|.................o
o...............CCCC..CCCC.............CCCCCP......................................CC|:::|...............P.o
#---------:::------------------:::------------------R----------:::-------------------':::------------------#
#::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::#
o::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::o
o::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::o
#::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::#
#:::::::::::::::::::::::::::::::::P:::::::::::::::::::::::::::::::::::P::::::::::::::::::::::::::::::::::::#
o----------------------|:::::+--KKKKKKKKKKKKKK---+-----------+-----------|:::::+---------------------------o
o......................|:::::|...................|...........|...........|:::::|...........................o
#...md.................|:::::|...................|...........|...........|:::::|..*md~~*md~~*md~~*md~~!....#
#...c..................|:::::|...................|...........|...........|:::::|..!c...!c...!c...!c...!....#
o........i.............::::::|...................|...........|...........|:::::|..!....!....!....!....!....o
o........i.cTTT........::::::|...................|...........|...........|:::::|...........................o
#........i..TTTc.......::::::|..cTT.....cTT......|...........|...........|:::::|...........................#
#........i.............|:::::|...TTc.....TTc.....|...........|...........|:::::|...........................#
o......................|:::::|...................|...........|...........|:::::|..*md~~*md~~*md~~*md~~!....o
o......................|:::::|...................|...........|...........|:::::|..!c...!c...!c...!c...!....o
#....................P.|:::::|...................|...........|...........|:::::|..!....!....!....!....!....#
#.CCCCCC...............|:::::....................|...........|...........|:::::............................#
o----------------------|:::::....................|...........|...........|:::::............................o
o......................|:::::....................|...........|...........|:::::............................o
#.........c..........P.|:::::|...................|...........|...........|:::::|..*md~~*md~~*md~~*md~~!....#
#.P.....KKKKK..........|:::::|...................|...........|...........|:::::|..!c...!c...!c...!c...!....#
o......................::::::|..cTT.....cTT......|...........|...........|:::::|..!....!....!....!....!....o
o......................::::::|...TTc.....TTc.....|...........|...........|:::::|...........................o
#......................::::::|...................|...........|...........|:::::|...........................#
#......................::::::|...................|...........|...........|:::::|...........................#
o......................::::::|...................|...........|...........|:::::|..*md~~*md~~*md~~*md~~!....o
o......................|:::::|...................|...........|...........|:::::|..!c...!c...!c...!c...!....o
#......................|:::::|...................|...........|...........|:::::|..!....!....!....!....!....#
#......................|:::::|...................|...........|...........|:::::|...........................#
o....................P.|:::::|.................P.|...........|...........|:::::|P..........................o
o......................|:::::|...................|...........|...........|:::::|........................CCCo
#----------------------':::::-------------------------==----------==-----':::::----------------------------#
#::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::#
o::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::o
o::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::o
#::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::#
#:::::::::P:::::::::::::::::::::::::::::R:::::::::::::::::::::::::::::::::::::::::::::::::P::::::::::::::::#
o----------------------...-----------------------+---------------------------...---------------------------o
o................................................|.........................................................o
#................................................|.........................................................#
#................................................|.*md~~*md~~*md~~*md~~*md~~!.....*md~~*md~~*md~~*md~~!....#
o...cmmc..i..cmmc..............cmmc..i..cmmc.....|.!c...!c...!c...!c...!c...!.....!c...!c...!c...!c...!....o
o...cddc..i..cddc..............cddc..i..cddc.....|.!....!....!....!....!....!.....!....!....!....!....!....o
#................................................|.........................................................#
#................................................|.........................................................#
o................................................|.........................................................o
o................................................|.*md~~*md~~*md~~*md~~*md~~!.....*md~~*md~~*md~~*md~~!....o
#................................................|.!c...!c...!c...!c...!c...!.....!c...!c...!c...!c...!....#
#................................................|.!....!....!....!....!....!.....!....!....!....!....!....#
o...cmmc..i..cmmc..............cmmc..i..cmmc.....|.........................................................o
o...cddc..i..cddc..............cddc..i..cddc.....|.........................................................o
#................................................|.........................................................#
#................................................|.*md~~*md~~*md~~*md~~*md~~!.....*md~~*md~~*md~~*md~~!....#
o................................................|.!c...!c...!c...!c...!c...!.....!c...!c...!c...!c...!....o
o................................................|.!....!....!....!....!....!.....!....!....!....!....!....o
#................................................|.........................................................#
#................................................|.........................................................#
#.CCCCCCCC.................R...................P.|..........................R............................CC#
##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo####
```

## Acceptance criteria

1. The game opens on the furnished reception: a white counter with a chair behind it, plants,
   the opening to the corridor.
2. Every room carries the furniture of its row in the table and nothing else.
3. Furniture stops the figure at its box: flush against desks, tables, counters, cabinets and
   printers; 2 px partitions; 4 px screens; chairs and plant pots with their smaller boxes.
4. Every cubicle can be entered from its aisle and left again.
5. A figure above a cabinet or a plant is drawn behind its top; below it, in front of its body.
6. The lamp lights a snippet beyond a partition, a screen, a desk, a chair, a table, a counter,
   a plant or a printer, and does not light one beyond a cabinet or a wall.
7. `parseTileset` reads `low` and rejects a low tile without a box; `TileMap.opaque` holds the
   boxes of the tiles that are not low.
8. Everything 0010 proved about the floor still holds: spawn, first cell, snippets,
   reachability, the closed rooms.
9. CI is green, both smoke runs.

## Test plan

- `tests/unit/tiled.test.ts` extended — `low.tsj` under `tests/fixtures/maps/` (three tiles:
  `solid`; `solid` and `low`; a rectangle (0, 0, 16, 2) and `low`) and `low.tmj` (20x12, the
  three tiles at (1, 2), (3, 2), (5, 2) on `detail`): `solids` has all three cells, `opaque`
  only (1, 2). `low-without-box.tsj` is rejected with its message.
- `tests/unit/collision.test.ts` extended — a 2 px strip, the box (32, 96, 16, 2): the 12x8
  box at (34, 102) moved by (0, −1) six times ends at y = 98; a chair's box (3, 3, 10, 10) in
  cell (4, 4), that is (67, 67, 10, 10): the 12x8 box at (50, 68) moved by (8, 0) ends at
  x = 55; a screen's box (0, 6, 16, 4) in cell (2, 6), that is (32, 102, 16, 4): the 12x8 box at
  (34, 110) moved by (0, −1) six times ends at y = 106.
- `tests/unit/creature.test.ts` extended — a snippet in the cone with a low solid cell on the
  line is lit; with an opaque cell on the line it is not; the snippet's own walk is stopped by
  the low cell.
- `tests/unit/gen-tiles.test.ts` — 240x32, 30 tiles, the boxes and `low` of the table, tops
  without boxes, no pixel in `#68386c`.
- `tests/unit/draw-scene.test.ts` — unchanged order; one case asserts an `above` tile is drawn
  after the player.
- `tests/unit/floor.test.ts` extended — `detail` and `above` exist; the fifteen tile counts
  on `detail` and the two on `above`; every piece of the room table stands where the table
  says, and `detail` is empty elsewhere; no furniture on the outer ring, in the lift or in the
  stairwell; every top lies one row above its body, in the same area, on a cell with no
  furniture but a tall thing's body; the clauses of 0010 that "stay true"; every cubicle's two
  cells are reached by the flood; the cells (8, 41)–(12, 41) lie in the first view.
- Smoke spec — unchanged from 0010: the corner pixel, the spawn, the walk right, the lamp, the
  first snippet.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not
maximized. The figure starts in the reception; Sales is the large room on the right side of
the floor, reached along either wide corridor.

1. Open `http://localhost:5173`.
2. Expected: the figure stands in the reception; up and to the left a white counter with a
   chair behind it, a plant in each right-hand corner of the room, the opening to the corridor
   on the right.
3. Walk up against the counter from below and hold `W`.
4. Expected: the figure stops flush at the counter's lower edge, its head over the counter.
5. Walk to the plant in the lower right corner of the room and stand directly above it, then
   directly below it.
6. Expected: above it, the leaves cover the figure's legs; below it, the figure covers the pot.
7. Walk to Sales and enter a cubicle from the aisle below it; push against the desk, the chair
   and the partitions on both sides, then walk out again.
8. Expected: each stops the figure at its edge; the figure does not catch on the partitions'
   ends when leaving.
9. Find a scrap of paper in Sales and stand in a cubicle so that a desk or a partition is
   between the figure and the scrap; face it and hold `Space`.
10. Expected: the scrap freezes in the light across the furniture and is captured after one
    second.
11. Walk to the cabinets in the lower right corner of Sales and stand directly above them.
12. Expected: the cabinets' upper side covers the figure's legs.
13. Walk to Marketing, to the blue screen between the two desk islands on the upper left; push
    against it from the left and from the right, then walk round its upper end.
14. Expected: the figure stops at the panel on both sides, 6 px inside the cell's edge, and
    passes its end without catching.
15. Visit every other room: Support, the break room, the data protection officer's office, HR,
    Accounting, Development and the two meeting rooms.
16. Expected: Support and Development are rows of cubicles, Marketing desk islands with blue
    screens between them, the break room a long counter and four small tables, the offices
    single desks with cabinets and a screen, the meeting rooms one long table each; all are
    told apart without help.
17. Walk the north and the south corridor from end to end.
18. Expected: a printer and two plants in each; none blocks the way; no flicker or jitter
    while scrolling.

**Feel:** Does the floor now read as a classic office? Which room is hardest to tell from the
others? Is walking between the cubicles comfortable — are the three-tile aisles wide enough? Do
the partitions read as lower than the walls, and the screens as something that could be rolled
away? Is any room too full or too empty?

**Result:** not yet walked.

## Open questions

None.
