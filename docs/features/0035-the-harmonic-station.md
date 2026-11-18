# 0035 — The Harmonic station

**Status:** draft
**Milestone:** M5
**Drafted:** 2026-11-19

## Goal

A desk stands on the way into Sales with a plate that says Harmonic. Once the player has
captured a snippet, a press of `E` at the desk sets Harmonic running: the snippets of the
room leave, one line says so, and the case of Sales carries a mark in the journal. The
traces and the talk with the source stay the player's. Every player meets the one real
product of the game once, and sees what a safe, approved way does to a room.

## Scope

Built on 0034 as merged. The floor gets one desk and one rectangle; no tile changes.

**In:**

- A fifth kind of rectangle, `station:<region>`, and the station of Sales in
  `tools/floor-layout.ts` and `floor.tmj`, with its desk.
- The press at a station: it runs, or it says that it cannot yet.
- `GameState.stations` and `GameState.stationed`.
- The species of a region in the world data.
- Two notices; the plate over the desk; the mark on the journal's cases tab.
- The language table gets three keys in German and English.
- With the implementation: `gameplay.md` §10; `world.md` §6; `vision.md` §10;
  `architecture.md` §2, §5, §6 and §8; `visual.md` §3; `testing.md` §2; the README.

**Out, explicitly:** the two stations of Act 2 (each with its case, `world.md` §6) · a logo
or a picture of the product (`vision.md` §10: a name, never a logo) · any figure who speaks
of Harmonic — no recommendation, no price, no place to get it (`vision.md` §6) · a tile of
its own for the desk (art pass) · a station that lifts a shadow wall, clears a region,
finds a trace or answers for the source (`gameplay.md` §10) · the line that says LMIS
presents the game (0036) · sound.

## Behaviour

Builds what `gameplay.md` §10 and `world.md` §6 settled, and refines them where they left a
place open: the cell, the plate, the reach, the words and the mark.

### The station of Sales

A rectangle named `station:sales` in the `objects` layer: exactly one cell, (81, 40), box
(1296, 640, 16, 16), written after the objects of 0033 with the id 133; `nextobjectid` is
134. On that cell the `detail` layer gets a desk with a screen — the tile of the desks of
Marketing — as one new piece of furniture of Sales.

The cell lies two cells inside the doorway of Sales, on the lower edge of the three rows a
player walks in through: nobody enters the room without passing it. The cells (80, 40) and
(81, 39) beside and above it stay free.

`game/station` reads the stations of a map from its rectangles, as the rests are read
(0027). It refuses, each with its message: a box that is not one cell; a region the world
data does not know; a region without shadow; a region without a species; and a second
station of a region.

### The species of a region

The world data gets, per region with a case, the species that lives there:
`sales: 'snippet'`, `marketing: 'mirage'`. A station can run only when its region's species
is in the journal — `captured` of that species is above 0.

### The press

A press of `talk` takes a station when all of this holds: no speaker is in reach — a talk
comes first, as with a rest (0027) —, the input does not hold `lamp` as `update` counts it,
the figure is not being pushed, and a station is **in reach**: the centre of its cell is at
most 40 px from the figure's feet, and no opaque box lies on the line from the centre of
the figure's box, (x, y − 4), to that centre — reach and sight of a talk (0017). A desk is
low and does not block the line. A station comes before a rest; the two of Sales are 23
cells apart.

What the press does depends on the station:

- **It has run:** nothing. The press is not taken: the step is an ordinary step.
- **Its species is not in the journal:** nothing changes but `stationed`, which becomes
  `{ at, result: 'not-yet' }`.
- **Otherwise it runs:** its region joins `stations` with the tick of the step, every
  creature whose home lies in an area of the region leaves `creatures` — by the rule of a
  solved case (0025): none is captured, and none comes back —, and `stationed` becomes
  `{ at, result: 'ran' }`.

`at` is the `tick` of the state the step gives, as for a rest. The step goes on from
there, as with a rest: the figure and the world are stepped as in every ordinary step.

A station runs once and stays running, also through the wake. It lifts no wall, clears no
region and finds no trace. The snippet of the east corridor has its home in no region and
stays. A station can run after its case is solved: then no creature is left to go, and the
line and the mark come all the same.

### The state

- `stations` is the list of `{ region, at }`, the stations that run, in the order they were
  started. Empty at the start.
- `stationed` is the last press at a station that was taken, `{ at, result }` with `result`
  `'ran'` or `'not-yet'`, or `null`. The notice follows from it.

### The notices

For `STATION_NOTICE_STEPS`, 120 steps, from a taken press:

| Key | `de` | `en` |
|---|---|---|
| `notice.station-ran` | `Harmonic läuft. Im Raum wird es still.` | `Harmonic is running. The room goes quiet.` |
| `notice.station-not-yet` | `Was hier umgeht, ist noch nicht verstanden.` | `What goes round here is not understood yet.` |

The first is the one dry line that names the product (`vision.md` §10). The second says
what is and tells the player nothing to do (`gameplay.md` §10): captured means understood
(`gameplay.md` §2), and a room can only be left alone by what is understood.

In the order of the notices a station's line comes after a found trace and before a rest.

### The plate

The name is written over the desk, in the game's own font: a plate of 52x14 px — a frame of
1 px in `#3a4466`, a field in `#181425` — with the text `station.name` in it, 2 px from the
frame. Its lower edge is the upper edge of the station's cell, and it is centred on the
cell: the plate of Sales covers the map pixels (1278, 626) to (1330, 640). It is drawn
after the traces and before every figure, so a figure that walks past is in front of it. It
is drawn in every frame in which the world is drawn, running or not.

| Key | `de` | `en` |
|---|---|---|
| `station.name` | `Harmonic` | `Harmonic` |

### The journal

On the cases tab, the entry of a region whose station runs carries the mark: `station.name`
on the line of the region's name, right-aligned to x = 304 — it starts at x = 256. A region
without an entry — no trace of it is found yet — shows no mark until it has one.

## Acceptance criteria

1. `floor.tmj` holds the rectangle `station:sales` on cell (81, 40) with the id 133 after
   the objects of 0033, which are unchanged, and the `detail` tile of that cell is a desk
   with a screen; no other tile of the floor changed.
2. The cell lies in the area of Sales; the cells (80, 40) and (81, 39) have no solid box;
   every cell of the floor that was reached on foot before is still reached.
3. `game/station` reads the station of the floor as `{ region: 'sales', box }` and refuses
   the five faulty maps of the spec, each with its message.
4. The initial state has `stations` empty and `stationed` `null`, and survives a JSON round
   trip at the start, after a press that could not run and with the station running.
5. With no snippet captured, a press in reach changes nothing but `tick`, `held` and
   `stationed`, which is `{ at, result: 'not-yet' }`; the creatures stay.
6. With one snippet captured, a press in reach sets `stations` to
   `[{ region: 'sales', at }]`, removes the two snippets whose home is in Sales, leaves the
   one of the east corridor and leaves `captured` as it was.
7. A second press at the running station is not taken: `stations` and `stationed` do not
   change.
8. A press is not taken out of reach, behind an opaque box, with `lamp` held, or during a
   push; with a speaker in reach the talk opens instead.
9. Running the station leaves `shadowWalls`, `traces`, `solved` and `overview` as they
   were, and the cells of Sales stay under shadow.
10. The notice is the key of the result for 120 steps from the press and none after; it
    comes after a found trace and before a rest.
11. The wake keeps `stations` and `stationed`; no creature that left comes back.
12. The scene draws the plate at (1278, 626) minus the camera, with the name in both
    languages, after the traces and before the figures, whether the station runs or not.
13. With the station running and a trace of Sales found, the cases tab draws the mark from
    (256, 36) on the line of `Vertrieb`; without the station running it draws none.
14. `de` and `en` hold the three keys of the spec; the two notices fit the bar.
15. No text of the game but these three keys holds the name, and no page of a figure does.
16. A game in which no station is pressed steps exactly as before: the 600 recorded steps of
    0020 give the same digest.

## Test plan

- **Unit, `game/station`:** reading and the five refusals; in reach — distance, sight over a
  low box and behind an opaque one; the three results of a press; criteria 5 to 9 through
  `update` on a map built in the test.
- **Unit, floor:** the rectangle, its id and its tile; the objects before it against a
  recorded digest; criterion 2 with the reachability of 0010 and 0013; the press on the
  floor with a snippet captured.
- **Unit, `game/world`:** every case has a species, and every species of the table is a
  species of the game.
- **Unit, `game/notice`:** criterion 10 at 0, 119 and 120 steps and in the order.
- **Unit, state:** criterion 4; the wake; the digest of criterion 16.
- **Unit, scene, `draw-journal`:** criteria 12 and 13 in both languages.
- **Unit, text:** the three keys; a test that no other key of either table contains the
  name — criterion 15.
- **Architecture, assets:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.stations` is empty.
- **Fixtures:** none; the maps are built in the tests.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the figure stands in the reception with the lamp — where the game opens
with the call (0026), the call is read and the lamp fetched first. Arrow keys or WASD walk,
`Space` holds the lamp, `E` or `Enter` talks, `J` opens and closes the journal.

**Steps:**

1. Walk to the doorway of Sales, in the corridor at the east of the floor. Hold the lamp on
   the scrap of paper that comes at the figure until it is gone. Lift the violet strip in
   the doorway, walk in and stop.
2. Expected: two cells inside, at the lower edge of the way in, stands a desk with a dark
   plate over it that says `Harmonic`.
3. Stand above the desk and press `E`.
4. Expected: the line at the bottom says `Harmonic läuft. Im Raum wird es still.`
5. Walk through the room, past every row of cubicles.
6. Expected: no scrap of paper is left in it, and nothing comes at the figure.
7. Walk back to the desk, stand above it and press `E` again.
8. Expected: nothing happens; no line appears.
9. Find one trace on a screen of the room. Press `J`, then the right arrow.
10. Expected: the tab `Fälle` shows `Vertrieb` and, at the right end of that line,
    `Harmonic`.
11. Press `J`. Look round the room.
12. Expected: the room is still grey under its violet dots, and the plate still says
    `Harmonic`.

**Feel:**

- Can the desk be missed on the way in?
- One press, and the room is quiet. Too easy, or just right for the first room?
- Does the line read as dry, or as advertising?
- Does the room feel emptier in a good way, or was the fight missed?
- Is the plate readable, and does it look like part of the room?

**Result:** not yet walked.

## Open questions

1. **The cell.** (81, 40): two cells inside the doorway, at the lower edge of the way in.
   Draft: this cell.
2. **The plate.** `gameplay.md` §10 says the screen shows the name; a screen of this size
   cannot. The name stands on a plate over the desk, in the game's font. Draft: the plate,
   and `gameplay.md` §10 says so.
3. **The two lines.** `Harmonic läuft. Im Raum wird es still.` and
   `Was hier umgeht, ist noch nicht verstanden.` Draft: these, in German and English.
4. **The mark.** The name at the right end of the region's line on the cases tab. Draft: as
   written.
5. **After the case.** A station can run in a room whose case is solved; it then only says
   its line and sets its mark. Draft: allowed — a station runs once, whenever.
6. **The milestone.** `docs/plan.md` names this station under M5, for the teaser. Draft:
   M5, built now.
7. **What the walk does not reach.** The line of a station that cannot run yet. On the
   floor the snippet of the corridor stands in front of the doorway (`world.md` §6), so a
   player has captured one before the desk is in reach. Draft: the tests hold that line;
   the walk does not.
8. **Who checks.** `vision.md` §10 leaves open whether the advertising is recognizable
   enough, and §9 how the licences leave out the two names: both are for a competent person
   to check before the first public release. The address of 0030 is public and not
   announced. Draft: build the station; the check stays a condition of announcing the
   address, not of merging.
