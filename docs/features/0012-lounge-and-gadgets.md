# 0012 — Lounge and gadgets

**Status:** approved 2026-11-13
**Milestone:** M3
**Drafted:** 2026-11-13

## Goal

The furnished floor of 0011 becomes a place people spend their day in: sofas and seating
corners with small tables, beanbags, coffee machines, water dispensers and a coat rack at every
room's entrance — and a few things that say who works here: an arcade cabinet and a table
football in the break room, a rubber duck, a lava lamp, a colour cube and a toy robot on desks
in Development. After this feature no room and no wide corridor looks empty.

## Scope

Built on 0011 as merged. If the walk of 0011 moves furniture, the tables here are revised with
the author before the implementation starts.

**In:**

- Eighteen tiles in the placeholder tileset, ids 30–47; the sheet becomes 256x48, sixteen
  columns, three rows, so ids 0–29 keep their place.
- `tools/floor-layout.ts` gets the pieces and the placement table below; `public/maps/floor.tmj`
  is generated again. `detail` and `above` only — `ground`, the points and the walls are
  unchanged.
- With the implementation: `world.md` §1 the rooms' sentences extended; `architecture.md` §7
  the eighteen tiles and the new pieces in the generator; `testing.md` §2; the README.
  `visual.md` is unchanged: the rule for tall things is the one of 0011.

**Out, explicitly:** anything that can be used — no coffee, no game on the arcade cabinet, no
sitting down (M4 at the earliest, with the first figures) · animated tiles: the arcade screen
and the lava lamp stand still · sound · a kitchen beyond the counter of 0011: no fridge, no
sink, no dishwasher (the art pass, `visual.md` §5) · whiteboards, pictures, clocks and anything
else on a wall (the art pass) · a 3D printer · new code in `src/`: no new tile property, no
change to the loader, collision, light or drawing · furniture in the lift, the stairwell, the
west and east corridors and the side passage.

## Behaviour

Everything here uses what 0011 built: `low` decides whether light passes, a tall thing is a
body on `detail` and a top on `above` one row higher, with the same rule for the top's cell.
The arcade cabinet is the only tile of this feature that is not low.

No name, logo or likeness of a real product appears: the arcade cabinet shows three coloured
blocks, the colour cube is a square of nine coloured pixels, the robot is a box with two eyes.

### The tiles

| Id | Name | Boxes | Low | Picture |
|---|---|---|---|---|
| 30 | sofa-left | `solid` | yes | back `#a22633` in the upper 5 px, seat `#e43b44`, an arm `#a22633` 3 px wide on the left |
| 31 | sofa-right | `solid` | yes | the same, the arm on the right |
| 32 | armchair | (2, 3, 12, 12) | yes | back `#a22633`, seat `#e43b44`, an arm on each side |
| 33 | side-table | (4, 5, 8, 8) | yes | top `#ead4aa`, edge `#b86f50` |
| 34 | beanbag | (3, 5, 10, 9) | yes | body `#f77622`, highlight `#feae34`, a rounded outline |
| 35 | counter-coffee | `solid` | yes | the counter of 0011 with a machine on it: body `#262b44`, a cup `#ffffff`, a light `#e43b44` |
| 36 | water-dispenser | (4, 6, 8, 10) | yes | body `#c0cbdc`, taps `#e43b44` and `#0099db` |
| 37 | water-dispenser-top | — | — | the bottle `#2ce8f5` with its water line `#0099db`, in the lower 10 px |
| 38 | coat-rack | (5, 8, 6, 8) | yes | foot and pole `#3e2731` |
| 39 | coat-rack-top | — | — | the pole, a coat `#124e89` and a coat `#feae34` on its hooks, in the lower 12 px |
| 40 | arcade | `solid` | no | cabinet `#124e89`, control panel `#262b44`, buttons `#e43b44` and `#fee761` |
| 41 | arcade-top | — | — | the cabinet's head `#124e89`, a screen `#181425` with three blocks `#63c74d`, `#fee761`, `#2ce8f5`, a marquee `#f77622`, in the lower 14 px |
| 42 | foosball-left | `solid` | yes | frame `#733e39`, field `#3e8948`, a rod `#c0cbdc` with two players `#e43b44` |
| 43 | foosball-right | `solid` | yes | the same, the players `#0099db` |
| 44 | desk-duck | `solid` | yes | desk-partition (18) with a duck: body `#fee761`, beak `#f77622` |
| 45 | desk-lava-lamp | `solid` | yes | desk-partition with a lamp: base `#5a6988`, glass `#f77622`, blobs `#e43b44` |
| 46 | desk-cube | `solid` | yes | desk-partition with a cube of 3x3 px: `#e43b44`, `#fee761`, `#63c74d`, `#0099db`, `#ffffff`, `#f77622` |
| 47 | desk-robot | `solid` | yes | desk-partition with a robot: body `#c0cbdc`, eyes `#2ce8f5` |

No tile uses `#68386c`.

### The pieces

(x, y) is the piece's top-left cell. A sofa faces south.

- **Sofa (x, y):** sofa-left at (x, y), sofa-right at (x + 1, y).
- **Seating corner (x, y):** a sofa at (x, y), side-table at (x + 2, y), armchair at (x + 3, y).
- **Armchair pair (x, y):** armchair at (x, y) and (x + 2, y), side-table at (x + 1, y).
- **Beanbag circle (x, y):** beanbag at (x + 1, y), (x, y + 1) and (x + 2, y + 1); side-table at
  (x + 1, y + 1).
- **Coffee corner (x, y):** counter-coffee at (x, y), counter (26) at (x + 1, y).
- **Coat rack (c, r)**, **water dispenser (c, r)**, **arcade (c, r):** tall things, their tops
  one row above.
- **Table football (x, y):** foosball-left at (x, y), foosball-right at (x + 1, y).

### The rooms

What is added to the furniture of 0011; nothing of 0011 moves. Two kinds of cell are replaced:
the counter of the break room at (35, 26) and (42, 26) becomes counter-coffee, and in
Development the desk-partition of eight cubicles becomes a gadget desk.

| Room | Added |
|---|---|
| Break room | counter-coffee at (35, 26) and (42, 26); water dispenser (47, 28); coat rack (30, 35); seating corner (36, 36); beanbag circle (37, 47); table football (31, 48); arcade (44, 49) |
| Reception | seating corner (12, 48); coat rack (20, 48) |
| Data protection officer's office | armchair pair (15, 35); coat rack (20, 28) |
| HR | seating corner (3, 15); coat rack (8, 18) |
| Accounting | armchair pair (39, 14); coffee corner (27, 19); coat rack (35, 18) |
| Development | beanbag circle (62, 1); sofa (70, 19) with a side-table at (72, 19); beanbags (74, 19) and (75, 19); coffee corner (52, 19); coat rack (67, 19); desk-duck at (48, 3) and (74, 9); desk-lava-lamp at (58, 3) and (69, 15); desk-cube at (53, 9) and (79, 3); desk-robot at (48, 15) and (79, 15) |
| Meeting room north | coat rack (91, 2); coffee corner (104, 8) |
| Meeting room south | coat rack (91, 12) |
| Sales | coffee corner (104, 26); beanbag circle (104, 33); coat rack (80, 35); water dispenser (80, 42); seating corner (84, 50) |
| Support | coat rack (81, 60); water dispenser (104, 60); seating corner (86, 77); beanbag circle (60, 77); coffee corner (52, 78) |
| Marketing | coat rack (21, 60); seating corner (20, 66); beanbag circles (44, 66) and (25, 74); coffee corner (12, 78) |
| North corridor | water dispenser (20, 25) |
| South corridor | sofa (60, 53) with a side-table at (62, 53), between the lift and the stairwell; water dispenser (60, 57) |

**What that makes**, as tile counts on `detail`: sofa-left 8, sofa-right 8, armchair 10,
side-table 16, beanbag 20, counter-coffee 8, water-dispenser 5, coat-rack 11, arcade 1,
foosball-left 1, foosball-right 1, desk-duck 2, desk-lava-lamp 2, desk-cube 2, desk-robot 2;
counter rises from 19 to 23 and desk-partition falls from 61 to 53; every other count of 0011
is unchanged — 888 cells. On `above`: water-dispenser-top 5, coat-rack-top 11, arcade-top 1,
beside the 34 cabinet-tops and 14 plant-tops of 0011.

**What stays true from 0010 and 0011.** The spawn (256, 718) and its box are free; row 44 is
free from x = 256 to x = 458; the cell (6, 39) has nothing on `detail` or `above`; the three
snippets' boxes and the wake point's box are free. Every cell without a solid tile outside the
lift and the stairwell is reached by the flood of 0010, every cubicle included. Row 18 of
Development carries nothing on `detail` from column 45 to column 84, so the cubicles of its last banks are
entered past the furniture on row 19.

**The first view** shows, beside what 0011 put there, the reception's seating corner below the
figure and the coat rack to its lower right.

The picture is the floor after this feature, for orientation only — the tables are the truth.
As in 0011, and on top: `S` sofa, `a` armchair, `t` side-table, `b` beanbag, `k` counter-coffee,
`W` water dispenser, `G` coat rack, `A` arcade, `F` table football, `g` a desk with a gadget.

```
##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo####
#.....................|.....................|..................b.....................|:::|.................#
o.....................|.....................|.................btb....................|:::|.G...............o
o..md....i....md......|..md.........md......|.*mg~~*md~~*mg~~!.....*md~~*md~~*mg~~!..|:::|.....c..c........o
#..c.....i....c.......|..c..........c.......|.!c...!c...!c...!.....!c...!c...!c...!..|:::.....TTTTTTTT.....#
#.....................|.....................|.!....!....!....!.....!....!....!....!..|:::.....TTTTTTTT.....#
o.....................|.....................|........................................|:::......c..c........o
o.....................|..___........___....R|........................................|:::|.................o
#.....................|.....................|........................................|:::|..............kK.#
#.....................|.....................|.*md~~*mg~~*md~~!.....*md~~*mg~~*md~~!..|:::|.................#
o..md.......cTT.......|..md.........md......|.!c...!c...!c...!.....!c...!c...!c...!..|:::+-----------------o
o..c.........TTc......|..c..........c.......|.!....!....!....!.....!....!....!....!..|:::|.................o
#.....................|.....................|........................................|:::|.G...............#
#.....................|.....................|........................................|:::|.....c..c........#
o.....................|................ata..|........................................|:::.....TTTTTTTT.....o
o..SSta...............|.....................|.*mg~~*md~~*md~~!.....*mg~~*md~~*mg~~!..|:::.....TTTTTTTT.....o
#.....................|.....................|.!c...!c...!c...!.....!c...!c...!c...!..|:::......c..c........#
#.....................|.....................|.!....!....!....!.....!....!....!....!..|:::|.................#
oP......G.............|............G........|........................................|:::|.................o
o...............CCCC..CCCC.kK..........CCCCCP.......kK.............G..SSt.bb.......CC|:::|...............P.o
#---------:::------------------:::------------------R----------:::-------------------':::------------------#
#::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::#
o::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::o
o::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::o
#::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::#
#:::::::::::::::::::W:::::::::::::P:::::::::::::::::::::::::::::::::::P::::::::::::::::::::::::::::::::::::#
o----------------------|:::::+--KKKkKKKKKKkKKK---+-----------+-----------|:::::+------------------------kK-o
o......................|:::::|...................|...........|...........|:::::|...........................o
#...md..............G..|:::::|.................W.|...........|...........|:::::|..*md~~*md~~*md~~*md~~!....#
#...c..................|:::::|...................|...........|...........|:::::|..!c...!c...!c...!c...!....#
o........i.............::::::|...................|...........|...........|:::::|..!....!....!....!....!....o
o........i.cTTT........::::::|...................|...........|...........|:::::|...........................o
#........i..TTTc.......::::::|..cTT.....cTT......|...........|...........|:::::|...........................#
#........i.............|:::::|...TTc.....TTc.....|...........|...........|:::::|.........................b.#
o......................|:::::|...................|...........|...........|:::::|..*md~~*md~~*md~~*md~~!.btbo
o..............ata.....|:::::|G..................|...........|...........|:::::|G.!c...!c...!c...!c...!....o
#....................P.|:::::|......SSta.........|...........|...........|:::::|..!....!....!....!....!....#
#.CCCCCC...............|:::::....................|...........|...........|:::::............................#
o----------------------|:::::....................|...........|...........|:::::............................o
o......................|:::::....................|...........|...........|:::::............................o
#.........c..........P.|:::::|...................|...........|...........|:::::|..*md~~*md~~*md~~*md~~!....#
#.P.....KKKKK..........|:::::|...................|...........|...........|:::::|..!c...!c...!c...!c...!....#
o......................::::::|..cTT.....cTT......|...........|...........|:::::|W.!....!....!....!....!....o
o......................::::::|...TTc.....TTc.....|...........|...........|:::::|...........................o
#......................::::::|...................|...........|...........|:::::|...........................#
#......................::::::|...................|...........|...........|:::::|...........................#
o......................::::::|...................|...........|...........|:::::|..*md~~*md~~*md~~*md~~!....o
o......................|:::::|........b..........|...........|...........|:::::|..!c...!c...!c...!c...!....o
#...........SSta....G..|:::::|.FF....btb.........|...........|...........|:::::|..!....!....!....!....!....#
#......................|:::::|..............A....|...........|...........|:::::|...........................#
o....................P.|:::::|.................P.|...........|...........|:::::|P...SSta...................o
o......................|:::::|...................|...........|...........|:::::|........................CCCo
#----------------------':::::-------------------------==----------==-----':::::----------------------------#
#:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::SSt::::::::::::::::::::::::::::::::::::::::::::#
o::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::o
o::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::o
#::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::#
#:::::::::P:::::::::::::::::::::::::::::R:::::::::::::::::::W:::::::::::::::::::::::::::::P::::::::::::::::#
o----------------------...-----------------------+---------------------------...---------------------------o
o................................................|.........................................................o
#....................G...........................|...............................G......................W..#
#................................................|.*md~~*md~~*md~~*md~~*md~~!.....*md~~*md~~*md~~*md~~!....#
o...cmmc..i..cmmc..............cmmc..i..cmmc.....|.!c...!c...!c...!c...!c...!.....!c...!c...!c...!c...!....o
o...cddc..i..cddc..............cddc..i..cddc.....|.!....!....!....!....!....!.....!....!....!....!....!....o
#................................................|.........................................................#
#................................................|.........................................................#
o...................SSta.....................b...|.........................................................o
o...........................................btb..|.*md~~*md~~*md~~*md~~*md~~!.....*md~~*md~~*md~~*md~~!....o
#................................................|.!c...!c...!c...!c...!c...!.....!c...!c...!c...!c...!....#
#................................................|.!....!....!....!....!....!.....!....!....!....!....!....#
o...cmmc..i..cmmc..............cmmc..i..cmmc.....|.........................................................o
o...cddc..i..cddc..............cddc..i..cddc.....|.........................................................o
#................................................|.........................................................#
#................................................|.*md~~*md~~*md~~*md~~*md~~!.....*md~~*md~~*md~~*md~~!....#
o.........................b......................|.!c...!c...!c...!c...!c...!.....!c...!c...!c...!c...!....o
o........................btb.....................|.!....!....!....!....!....!.....!....!....!....!....!....o
#................................................|.........................................................#
#................................................|...........b........................SSta.................#
#.CCCCCCCC..kK.............R...................P.|..kK......btb.............R............................CC#
##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo##oo####
```

## Acceptance criteria

1. The game opens on the reception with a red sofa, a small table and an armchair below the
   figure and a coat rack to the lower right; the counter, chair and plants of 0011 stand as
   before.
2. Every room and corridor carries what its row in the table adds, on top of 0011, and nothing
   else.
3. Each new thing stops the figure at its box: flush against sofas, coffee counters, the table
   football and the arcade cabinet; armchairs, side-tables, beanbags, water dispensers and coat
   racks with their smaller boxes.
4. A figure above a coat rack, a water dispenser or the arcade cabinet is drawn behind its top;
   below it, in front of its body.
5. The lamp lights a snippet beyond every new thing except the arcade cabinet — by test, not
   in the walk: the snippets of 0010 do not stand behind any of them.
6. Every cell that 0011 left reachable and that carries no new solid tile is still reachable;
   every cubicle can still be entered.
7. No file under `src/` changes.
8. Everything 0010 and 0011 proved about the floor still holds.
9. CI is green, both smoke runs.

## Test plan

- `tests/unit/gen-tiles.test.ts` — 256x48, 48 tiles; the boxes and `low` of the table above;
  the three tops without boxes; `arcade` is the only new tile that is not low; no pixel in
  `#68386c`; the pixels of ids 0–29 are those of 0011.
- `tests/unit/assets.test.ts` — unchanged, and green on the new sheet: Endesga 32 only,
  dimensions in multiples of 16.
- `tests/unit/floor.test.ts` extended — the seventeen changed or new counts on `detail` and the
  three new ones on `above`; every piece of the table stands where the table says; `detail`
  differs from 0011's only in the cells the table names; no furniture on the outer ring, in the
  lift, the stairwell, the west and east corridors or the side passage; every new top lies one
  row above its body under the rule of 0011; the clauses that "stay true"; the flood reaches
  every cell without a solid tile outside the lift and the stairwell; cells (45, 18)–(84, 18)
  are empty on `detail`; the cells (12, 48)–(15, 48) and (20, 47)–(20, 48) lie in the first view.
- `tests/unit/creature.test.ts` extended — `arcade.tmj` under `tests/fixtures/maps/` (20x12,
  the placeholder tileset, arcade at (5, 5) with its top at (5, 4), beanbag at (9, 5)): a
  snippet in the cone beyond the arcade is not lit, one beyond the beanbag is.
- `tests/arch/` — unchanged; criterion 7 is checked in review by `git diff --stat main -- src/`
  being empty.
- Smoke spec — unchanged: the corner pixel, the spawn, the walk right, the lamp, the first
  snippet.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 1920x1080, 100 % zoom, window not
maximized. The figure starts in the reception. The break room is the room across the west
corridor, entered through the doorway a little above the reception's opening; Development is
the long room at the top, entered from the north corridor.

1. Open `http://localhost:5173`.
2. Expected: the figure stands in the reception; below it a red sofa, a small table and a red
   armchair in a row; to the lower right a coat rack with a blue and a yellow coat.
3. Walk down against the sofa and hold `S`, then walk round to the coat rack and stand directly
   above it, then directly below it.
4. Expected: the sofa stops the figure at its upper edge; above the coat rack the coats cover
   the figure's legs, below it the figure covers the pole.
5. Walk into the break room and look along the counter at the top.
6. Expected: two coffee machines stand on the counter, each a dark box with a white cup; a
   water dispenser with a light blue bottle stands to the right of the counter.
7. Walk to the lower part of the break room.
8. Expected: a table football on the left, three orange beanbags round a small table in the
   middle, an arcade cabinet on the right; the arcade's screen shows three coloured blocks and
   does not move.
9. Walk between the beanbags to the small table, then push against the table football and the
   arcade cabinet from every side that can be reached.
10. Expected: the figure passes between the beanbags without catching, and stops flush at the
    table football and the arcade cabinet; standing above the arcade cabinet, its head covers
    the figure's legs.
11. Walk to Development, into the first cubicle of the top left bank, and look at the desks of
    that bank.
12. Expected: the first desk carries a yellow duck, the third a lava lamp; the second is bare.
13. Walk along the bottom of Development from the left wall to the cabinets on the right.
14. Expected: a coffee counter, a coat rack, a sofa with a small table and two beanbags stand
    along the bottom wall; the figure walks the row above them without being stopped, and
    every cubicle of the last banks can be entered.
15. Visit Marketing, Support, HR, Accounting, the data protection officer's office and the two
    meeting rooms, and walk the north and the south corridor.
16. Expected: every room has a coat rack near its entrance and somewhere to sit that is not a
    desk chair; a water dispenser stands in each of the two corridors, a sofa between the lift
    and the stairwell; nothing blocks a doorway; no flicker or jitter while scrolling.

**Feel:** Does the floor now look lived in? Is any room still too empty, or now too full? Do
the gadgets read as what they are — which one does not? Is red right for the sofas, next to the
blue screens of 0011? Is the row along the bottom of Development too tight to walk?

**Result:** not yet walked.

## Open questions

None.
