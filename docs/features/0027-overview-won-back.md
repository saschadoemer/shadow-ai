# 0027 — Overview won back

**Status:** approved 2026-11-18
**Milestone:** M5
**Drafted:** 2026-11-18

## Goal

The player can win overview back without falling into the dark: with a coffee. A press of `E`
at a coffee machine in a room without shadow fills the hearts, and a line says so. A machine
in a room under shadow gives nothing — until that room is cleared.

## Scope

Built on 0025 as merged. No tile changes; the floor gets eight rectangles. It closes the
question `gameplay.md` §4 has left open since 0009.

**In:**

- Rests as rectangles of the map named `rest:<what>`, one cell each, on a coffee machine.
- `src/game/rest.ts`: the rests of a map, which one is in reach, and what a press at it
  does; and `GameState.rested`.
- A press of `talk` at a rest in reach: overview is filled where the rest's cell is not under
  shadow.
- A notice for two seconds after the press: that overview is back, that it was full
  already, or that this coffee does nothing.
- The language table gets three keys in German and English.
- With the implementation: `gameplay.md` §4 and §8; `world.md` §1; `architecture.md` §1, §2
  and §6; `testing.md` §2; the README.

**Out, explicitly:** a cup, a picture or a sound · a wait between two coffees, or a number
of coffees per day · a coffee that fills one heart only · the water dispensers, the sofas
and the table football as rests · the intern, who sits in the break room and gives hints
(M6) · winning overview back by talking to someone · a rest that raises the maximum — only a
solved case does (0024) · the key in the help of 0021: `E` is listed there as the key to
talk, and stays so.

## Behaviour

Refines `gameplay.md` §4 and §8, `world.md` §1 and `architecture.md` §2 and §6.

### Rests in the map

A rectangle of the `objects` layer named `rest:<what>` is a rest: exactly one cell, 16x16
with its corner on the grid, on the cell of the thing it is. `rest:` is the fourth kind of
rectangle (`game/rects`). `src/game/rest.ts` reads the rests from the map's rectangles in
file order and refuses the map in `createInitialState` when a box is not one cell:
`rest rest:coffee (568, 418, 16, 16) is not one cell`. The walls, the traces and the areas
skip the rests.

On the floor, `tools/floor-layout.ts` gets `RESTS`, and `floor.tmj` eight more rectangles
after the areas, with the ids 116 to 123; `nextobjectid` is 124. Every coffee machine of
the floor is a rest:

| Rest | Cell | Room | Veil of the cell |
|---|---|---|---|
| `rest:coffee` | (104, 8) | meeting room north | 1 |
| `rest:coffee` | (27, 19) | Accounting | 2 |
| `rest:coffee` | (52, 19) | Development | 3 |
| `rest:coffee` | (35, 26) | break room | 0 |
| `rest:coffee` | (42, 26) | break room | 0 |
| `rest:coffee` | (104, 26) | Sales | 1 |
| `rest:coffee` | (12, 78) | Marketing | 1 |
| `rest:coffee` | (52, 78) | Support | 1 |

At the start only the two machines of the break room stand in a room without shadow.

### In reach

`REST_DISTANCE` is 32 px, two tiles, *tune*. A rest is **in reach** when both hold:

1. the distance from the player's feet to the centre of the rest's cell is at most
   `REST_DISTANCE`;
2. no opaque box of the map lies on the line from the centre of the player's box,
   (x, y − 4), to the centre of the cell. The test is the lamp's (`sightBlocked`), against
   the map as loaded.

The coffee machines stand in the wall's row of their room, so the second rule matters: from
the corridor behind the wall a machine is 8 px away and not in reach. Of two rests in reach
the nearer one counts; of two equally near, the first in the file.

### A coffee

In a step that is not the dark's, the help's, the journal's or a dialogue's, and in which
no journal and no dialogue opens: when `talk` is pressed, the input does not hold `lamp`,
the player is not being pushed and a rest is in reach, the player **takes** it. A speaker in
reach comes first: then the press opens the dialogue (0018) and no rest is taken.

Taking a rest sets `GameState.rested` to `{ at, result }` — the step's `tick`, and one of
three results:

| Result | When | What changes |
|---|---|---|
| `shadow` | the rest's cell is under shadow (0023, 0025) | nothing |
| `full` | otherwise, and `overview.current` equals `overview.max` | nothing |
| `restored` | otherwise | `overview.current` becomes `overview.max` |

The step is then an ordinary one, stepped from that state: the world goes on, and a creature
that reaches the player in the same step still hits. `rested` is `null` at the start. The
wake of 0009 keeps it. There is no limit and no wait: every press takes a coffee.

A rest in a room under shadow starts to work when the room is cleared (0025): the rule asks
the cell, and nothing is stored about it.

### The notice

`REST_NOTICE_STEPS` is 120, two seconds, *tune*. `game/notice` gains the notice of a rest,
shown while `rested` is not `null` and `tick` − `at` < `REST_NOTICE_STEPS`; its key follows
the result. The order when several are due: a wall that holds (0016), a solved case (0024),
a found trace (0022), a rest.

| Result | Key | `de` | `en` |
|---|---|---|---|
| `restored` | `notice.rest` | `Kaffee. Der Überblick ist wieder da.` | `Coffee. Your overview is back.` |
| `full` | `notice.rest-full` | `Kaffee. Den Überblick hast du schon.` | `Coffee. You have your overview already.` |
| `shadow` | `notice.rest-shadow` | `Dieser Kaffee schmeckt nach nichts.` | `This coffee tastes of nothing.` |

Each is one line and fits the bar. A press always has an answer.

## Acceptance criteria

1. `floor.tmj` holds the eight rectangles of the table with the ids 116 to 123 after the
   objects of 0023, which are unchanged; each lies on a cell whose `detail` tile is a counter
   with a coffee machine, and the floor has no such tile without a rest.
2. A map with a `rest:` rectangle that is not one cell does not start, with its message; the
   walls, the traces and the areas skip the rests; a map without rests has none.
3. The veil of the eight cells is that of the table: only the two of the break room are not
   under shadow at the start.
4. A rest is in reach at 32 px from the centre of its cell and not at 32.1 px; with an
   opaque box on the line it is not in reach at 8 px.
5. On the floor, the machine of Sales is in reach from the feet (1672, 440) inside the room
   and not from (1672, 416) in the north corridor; a machine of the break room is in reach
   from (568, 440) and not from (568, 416).
6. A press at a rest that is not under shadow, with `overview` `{ current: 2, max: 5 }`,
   gives `{ current: 5, max: 5 }` and `rested` `{ at, result: 'restored' }` with the step's
   `tick`.
7. The same press with overview full changes no heart and gives the result `full`; at a
   rest under shadow it changes no heart and gives `shadow`, whatever the hearts.
8. No rest is taken with `lamp` held, during a push, by a key that is only held, with a
   dialogue, the journal or the help open, or in the dark; a press with a speaker and a rest
   both in reach opens the dialogue and takes no rest.
9. With Sales solved (0024, 0025), a press at the machine of Sales restores overview.
10. The notice is the result's key for 120 steps from the press and none after; a wall that
    holds, a solved case and a found trace come before it.
11. The initial state has `rested` `null` and survives a JSON round trip at the start and
    after a coffee; the wake keeps `rested`.
12. `de` and `en` hold the three keys of the table; each is one line and fits the bar.
13. A state in which `talk` is never pressed at a rest steps exactly as before this feature:
    the 600 recorded steps of 0020 give the same digest.

## Test plan

- **Unit, `game/rest`, the map:** the rests of a map in file order; the refusal; the other
  kinds of rectangle skip them; a map without rests.
- **Unit, `game/rest`, reach:** criterion 4 on an open 20x12 grid with one rest on cell
  (10, 5), from the four sides and a diagonal, and with one opaque box built into the map;
  two rests in reach, the nearer and the first of two equally near.
- **Unit, `game/rest`, a coffee:** criteria 6, 7 and 8 step by step, on a map with an area
  of a region with shadow over one of two rests; criterion 9 with the region in `solved`.
- **Unit, `game/notice`:** criterion 10 for the three results at 0, 119 and 120 steps, and
  the four orders.
- **Unit, state:** the initial state; the round trips of criterion 11; the wake; the digest
  of criterion 13.
- **Unit, floor:** the eight rectangles and their ids; the objects of 0023 unchanged;
  criteria 1, 3 and 5 on the floor as loaded.
- **Unit, text:** the three keys in both languages; the notice rules cover them.
- **Architecture, assets:** unchanged, now covering `src/game/rest.ts`.
- **Smoke:** after loading, `window.shadowAi.state.rested` is `null`.
- **Fixtures:** `tests/fixtures/maps/rests.tmj`, 20x12 on the tiles of `points.tmj`: the
  spawn, two rectangles `rest:coffee` and a rectangle `region:hr` over one of them.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the figure stands in the reception with the lamp — where the game opens
with the call (0026), the call is read and the lamp fetched first. Arrow keys or WASD walk,
`Space` holds the lamp, `E` or `Enter` talks.

**Steps:**

1. Walk right into the corridor, a few steps up it, and through the opening on the right
   into the large room. Walk up to its upper wall and stand below the left of the two coffee
   machines on the long counter. Press `E`.
2. Expected: the corner shows five hearts as before, and a line at the bottom says
   `Kaffee. Den Überblick hast du schon.` for about two seconds.
3. Leave the room and walk down the corridor to the wide corridor at its end, right along
   it to the second doorway in its lower wall, and up the corridor that leads up above that
   doorway. Let the scrap that comes for the figure touch it twice, then hold the lamp on
   it until it is gone.
4. Expected: the corner shows three full hearts and two empty ones.
5. Hold the lamp on the violet strip in the doorway on the right until it is gone and walk
   in. Capture the two scraps in the room. Walk to the coffee machine on the counter at the
   room's upper right, stand below it and press `E`.
6. Expected: the line says `Dieser Kaffee schmeckt nach nichts.`, and the hearts stay as
   they are.
7. Walk back to the large room with the two coffee machines, stand below one of them and
   press `E`.
8. Expected: the corner shows five full hearts, and the line says
   `Kaffee. Der Überblick ist wieder da.`
9. Hold `E` down for three seconds.
10. Expected: the line `Kaffee. Den Überblick hast du schon.` appears once and is gone
    after about two seconds although the key is held.
11. Leave the room into the corridor, walk up it to the wide corridor along the top, and
    stand at its lower wall above the right of the two coffee machines. Press `E`.
12. Expected: nothing happens: the machine is behind the wall.

**Feel:**

- Is coffee the right way to win overview back — and the break room the right place?
- All hearts at once: right, or too generous?
- Is the walk to the break room a price, or only a detour?
- `Dieser Kaffee schmeckt nach nichts.` — does it say that the room is the reason?
- Should something be seen at the machine — a cup, steam?

**Result:** not yet walked.

## Open questions

None. Five were settled on 2026-11-18, each as drafted:

- Coffee: overview comes back with a coffee — a place, not a conversation and not a find.
- Machines under shadow: every coffee machine of the floor is a rest; one in a room under
  shadow gives nothing and says so, and works once the room is cleared.
- All hearts: a coffee fills overview completely, as often as the player walks there.
- The words: the three lines of the table, in German and English.
- The same key: `E` talks and takes a coffee; a colleague in reach comes first.
