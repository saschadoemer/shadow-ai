# 0018 — Everyday lines

**Status:** approved 2026-11-18
**Milestone:** M4
**Drafted:** 2026-11-17

## Goal

The player can talk to the four colleagues who walk the floor. A key press near one stops it
where it is; the two turn to each other, and it says a few everyday lines. After that it goes
on its round. The receptionist can be spoken to across the counter, and nobody through a wall.

## Scope

Built on 0017 as merged. No tile changes, no map changes, no new sprite.

**In:**

- The colleagues' lines as data in `src/game/cast.ts`, one saying of one page for each of the
  four `person` routes of the floor.
- Speakers: a standing figure or a colleague with lines. `game/talk` finds the speaker in
  reach among both.
- Reach is 40 px instead of 24, and a speaker must be in sight: nothing opaque on the line
  between the two.
- `GameState.dialogue` names its speaker: `{ speaker, index, page }`.
- A colleague that is spoken to stands and turns to the player; after the dialogue it goes on
  as in 0015.
- The language table gets four pages in German and English.
- With the implementation: `gameplay.md` §8; `world.md` §1 and §3; `architecture.md` §2 and
  §8; `testing.md` §2; the README.

**Out, explicitly:** more than one saying per colleague, sayings that change with the story
or with what the player has done — they come with the cases (M5), where what people say
depends on progress · names for the colleagues, a name over the box (0017 left it out) ·
talking to a dog, a vacuum or a drone · the intern and the break room's hints (M5) · a
colleague that follows the player with its eyes while the player walks round it · a pause
after the dialogue before the colleague walks on · shadow walls on the sight line — none
stands within 90 px of a speaker's place · sound.

## Behaviour

Refines `gameplay.md` §8, `world.md` §1 and §3 and `architecture.md` §2 and §8, and changes
two things of 0017: the reach and the shape of `GameState.dialogue`. In this section the
player is the hero's figure, a figure is one of the standing cast, and a colleague is a mover
of the kind `person`.

### Who can be spoken to

`src/game/cast.ts` gets `COLLEAGUES`, the lines of the colleagues by the name of their route:

| Route | Shirt | Pages |
|---|---|---|
| `person:reception` | green | `talk.reception-everyday` |
| `person:marketing` | red | `talk.marketing-everyday` |
| `person:support` | orange | `talk.support-everyday` |
| `person:sales` | pink | `talk.sales-everyday` |

A **speaker** is a standing figure of the map (0017) or a colleague whose route is in
`COLLEAGUES`. A colleague whose route is not in the table has nothing to say and cannot be
spoken to; an entry whose route the map does not have is simply not there. Dogs, vacuums and
drones are no speakers.

The speakers of a step are listed in this order: the standing figures in file order, then the
colleagues in the order of `GameState.movers`. A speaker's place is its feet: a figure's
point of the map, a colleague's `x` and `y` in the state, not rounded.

### Reach

`TALK_DISTANCE` becomes 40 px, two and a half tiles, *tune* — it was 24. The feet of someone
behind a counter are 32 px from the feet of someone in front of it, so 24 px did not reach
across.

A speaker is **in reach** when both hold:

1. the distance between the player's feet and the speaker's place is at most `TALK_DISTANCE`;
2. the speaker is **in sight**: no opaque box of the map lies on the line from the centre of
   the player's box, (x, y − 4), to the point 4 px above the speaker's place. The test is the
   lamp's (`sightBlocked`), against the map as loaded.

Low furniture is not opaque: a counter, a desk or a chair does not stop a conversation. A
wall does. On the floor this matters in two places: the colleague of Sales at the coffee
machine stands 24 px from the north corridor, and the round of the reception passes 40 px
from the data protection officer's office.

The speaker a press talks to is the nearest one in reach; of two equally near, the first in
the order above.

### Talking to a colleague

`GameState.dialogue` is `null`, or `{ speaker, index, page }`: `speaker` is `'figure'` or
`'mover'`, `index` is the index in `GameState.figures` or in `GameState.movers`, and `page`
counts from 0. A dialogue with a figure is `{ speaker: 'figure', index, page }` and behaves
as in 0017.

The three cases of a step of 0017 stay. What is new when the dialogue opens with a colleague:

- The colleague stands where it is: `frame` 0 and `frameTimer` 0. Its `x`, `y`, `target` and
  `wait` do not change.
- It turns to the player, and the player to it, by the rule of 0017: left or right when the
  horizontal distance is the larger one, up or down otherwise, as before on the same spot.
- As in 0017 the player stands, the lamp is off, `tick` grows by 1 and nothing else is
  stepped in this step. The conditions are those of 0017: `talk` is pressed, the input does
  not hold `lamp`, the player is not being pushed.

While the dialogue is open nothing in the world is stepped (0017), so the colleague does not
move and its pause does not run down. A press on the last page closes the dialogue; a saying
of this feature has one page, so the first press after the opening closes it.

After the dialogue the colleague is stepped as in 0015 again: it stands while the player's
feet are closer than 20 px, otherwise it waits what is left of its pause or walks on to its
target. It keeps the facing of the dialogue until it moves; a step in which it moves sets the
facing of the leg. The talk costs it no part of its round: the steps it needs to its next
point are the same as without it.

### The text

Four pages of the kind `talk`, each a saying of one page, by the rule of 0017: at most three
lines of at most 47 characters. A slash stands for a line break.

| Key | `de` | `en` |
|---|---|---|
| `talk.reception-everyday` | `Morgen! Heute haben schon drei Leute gefragt,` / `ob wir endlich ein WLAN für Gäste haben.` / `Ich sage dann immer: Frag die IT. Also dich.` | `Morning! Three people have asked already` / `whether we finally have a network for guests.` / `I always say: ask IT. So – you.` |
| `talk.marketing-everyday` | `Der Drucker druckt seit Montag alles doppelt.` / `Angeblich hat ihn jemand „optimiert“.` / `Ich hole trotzdem jedes Blatt einzeln ab.` | `The printer has printed everything twice` / `since Monday. They say someone “optimised” it.` / `I still pick up every single sheet.` |
| `talk.support-everyday` | `Vierzig Tickets vor dem ersten Kaffee.` / `Die Hälfte davon in Sprachen, die hier` / `keiner spricht. Irgendwie geht es immer.` | `Forty tickets before the first coffee.` / `Half of them in languages nobody here` / `speaks. Somehow it always works out.` |
| `talk.sales-everyday` | `Drei Angebote bis heute Abend, und jedes soll` / `klingen, als hätte ich eine Woche Zeit gehabt.` / `Erst mal Kaffee.` | `Three offers by tonight, and each one should` / `sound as if I had had a week for it.` / `Coffee first.` |

Each saying is at most three sentences, warm and dry (`vision.md` §6). The receptionist names
a gap nobody fills and hands it to the player, who is the head of IT. The printer somebody
"optimised" is the tone sheet's own example. Support and Sales say why the day is tight,
before anybody asks about a tool — the cases of M5 and M6 start from exactly this.

### Drawing

The box, the lines and the marker are those of 0017. The page is the speaker's:
`pages[page]` of the figure, or of the colleague's route in `COLLEAGUES`. A colleague is drawn
as in 0015, from its sheet with the frame facing × 5 + `frame` — so in a dialogue it shows
the standing frame of the facing it turned to.

## Acceptance criteria

1. `COLLEAGUES` holds the four routes of the table, each with its one page; every `person`
   route of `floor.tmj` has an entry.
2. `de` and `en` hold the four pages of the spec; each obeys the page rule of 0017.
3. A press with the feet 40 px from a standing figure opens the dialogue; at 40.1 px it does
   not, and the step is an ordinary one.
4. A press in reach of a colleague opens `{ speaker: 'mover', index, page: 0 }` with its
   index in `movers`. The colleague has `frame` 0 and `frameTimer` 0 and faces the player by
   the turning rule; its `x`, `y`, `target` and `wait` are as before. The player faces it,
   stands, and the lamp is off.
5. A press next to a person whose route has no lines, a dog, a vacuum or a drone opens
   nothing, and the step is an ordinary one.
6. With an opaque box on the line between the two, a press at 24 px opens nothing; with a
   box that is solid and not opaque on the line, it opens the dialogue.
7. Of two speakers in reach the nearer one speaks; of two equally near, a figure before a
   colleague, and of two colleagues the earlier in `movers`.
8. With a dialogue with a colleague open, 600 steps with every key but `talk` held change
   nothing but `tick` and `talkHeld`; the colleague's `x`, `y`, `target`, `wait`, `frame` and
   `facing` are as at the opening.
9. A press closes the one-page dialogue. In the next step the colleague stands when the
   player's feet are closer than 20 px, and otherwise waits or moves as in 0015; it keeps the
   dialogue's facing until the step in which it moves.
10. A colleague spoken to on a leg reaches its target after exactly as many moving steps as
    in a run without the dialogue.
11. The state survives a JSON round trip with a dialogue with a colleague open.
12. On the floor, a press with the feet at (200, 680), below the counter, reaches the
    colleague of the reception on its point 1 at (200, 648). A press at (1672, 416), in the
    north corridor, does not reach the colleague of Sales on its point 3 at (1672, 440).
13. The scene draws the colleague's page in the box while `dialogue.speaker` is `'mover'`,
    and the figure's page while it is `'figure'`.
14. A state without speakers in which `talk` is never held steps exactly as before this
    feature: the player, the creatures, the movers and the walls of 600 recorded steps are
    the same.

## Test plan

- **Unit, `game/cast`:** the four entries of `COLLEAGUES`; the pages of a route, and none
  for a route that is not in the table.
- **Unit, `game/talk`, reach:** on an open 20x12 grid with one figure at (160, 96): a press
  with the feet at (200, 96) opens, at (200.1, 96) does not. Criterion 6 on a map built in
  the test, with one opaque box and with one box that is only solid between the two.
- **Unit, `game/talk`, a colleague:** on the fixture below: criterion 4 with the colleague
  waiting on its point and with the colleague on a leg, for the four sides and a diagonal;
  criterion 5 with a route outside the test's table, and with a dog; criterion 7 on a test
  table with two colleagues and one figure — the table is a parameter of the functions, the
  game passes its own.
- **Unit, `game/talk`, pages:** criterion 8; criterion 9 with the player at 19 px and at
  21 px after the dialogue; criterion 10 against a run without `talk`.
- **Unit, state:** the round trip of criterion 11; the 600 steps of criterion 14 on a map
  without figure points and without person routes.
- **Unit, floor:** every `person` route has lines; the two presses of criterion 12 on the
  floor as loaded, each with the colleague put on its point in the state.
- **Unit, text:** the four pages in both languages; the page rule and the glyph test of 0016
  and 0017 cover them.
- **Unit, scene:** criterion 13 — the first glyph of the colleague's page at (12, 138); the
  colleague's frame while it speaks.
- **Architecture, assets:** unchanged.
- **Smoke:** unchanged; `state.dialogue` is `null` after loading.
- **Fixtures:** `tests/fixtures/maps/talkers.tmj`, 20x12 on the tiles of `points.tmj`: the
  spawn, `figure:officer` at (160, 96), the route `person:reception` with point 1 at
  (64, 48), pause 600, and point 2 at (128, 48), pause 0, and a route `dog:reception` of two
  points.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp, `E` or `Enter` talks.

**Steps:**

1. Walk up to the counter and stand below its right end, in front of the colleague in the
   green shirt. If it has left the counter, wait until it stands behind it again. Press `E`.
2. Expected: the colleague looks down at the figure and the figure up at it, across the
   counter. The box shows three lines, the first
   `Morgen! Heute haben schon drei Leute gefragt,`, and the white triangle blinks.
3. Press `E`.
4. Expected: the box is gone, and the colleague still looks down at the figure.
5. Stay where you are for ten seconds.
6. Expected: within about five seconds the colleague walks off to the right, looking where
   it walks.
7. Walk to it while it walks, and press `E` when the figure is beside it.
8. Expected: it stands, it turns to the figure and the figure to it, and the box shows the
   same three lines.
9. Press `E` and stay beside it for five seconds.
10. Expected: there is no box; the colleague stands and keeps looking at the figure.
11. Walk four tiles away from it and press `E`.
12. Expected: no box appears, and within about five seconds the colleague walks on along
    its round.
13. Stand beside the dog of the reception and press `E`.
14. Expected: nothing happens.
15. Walk right into the corridor and down it to the wide corridor at its end. Hold the lamp
    on the violet strip in the doorway at the left of its lower wall until it is gone, and
    walk through the doorway. Walk to the colleague in the red shirt and press `E`.
16. Expected: the two turn to each other, and the first line is
    `Der Drucker druckt seit Montag alles doppelt.`
17. Press `E`. Leave the room, walk right along the wide corridor to the next violet strip in
    its lower wall, lift it and walk in. Walk to the colleague in the orange shirt and press
    `E`.
18. Expected: the first line is `Vierzig Tickets vor dem ersten Kaffee.`
19. Press `E`. Leave the room and walk up the corridor that leads up above this doorway. Hold
    the lamp on the scrap that comes for the figure until it is gone. Lift the violet strip
    in the doorway on the right and walk in; capture the two scraps there or keep away from
    them. Walk to the colleague in the pink shirt and press `E`.
20. Expected: the first line is `Drei Angebote bis heute Abend, und jedes soll`.
21. Press `E`. Leave the room, walk up the corridor into the wide corridor along the top and
    right to its end. Stand at its lower wall, above the coffee machine of the room below.
    When the colleague in the pink shirt stands at the coffee machine, press `E`.
22. Expected: nothing happens.

**Feel:**

- Is 40 px the right reach — across the counter, and in the open, where it is two and a half
  tiles?
- After the talk the colleague walks on at once when the figure is not beside it. Is that
  abrupt — should it wait a moment?
- Each colleague has one saying, the same every time. Is that enough until the cases come?
- Are the four sayings right in tone and in content?
- The world stands still while a colleague speaks who was walking a moment ago. Still right?

**Result:** passed 2026-11-18, steps 1–22. Feel: the reach of 40 px is right, across the counter
and in the open; the colleague walking on at once after the talk is fine, no pause wanted; one
saying each is enough until the cases come; the four sayings are right in tone and content; the
world standing still while a colleague speaks is still right.

## Open questions

None. Three were settled on 2026-11-18, each as drafted:

- The four sayings: the pages of the table under "The text", in German and English.
- One saying each: every colleague says the same page every time, like the data protection
  officer. Several sayings in turn come with the cases of M5, where what people say changes
  with progress.
- Reach and sight: the reach grows from 24 px to 40 px, so that the receptionist can be
  spoken to across the counter, and a speaker must be in sight, so that nobody is spoken to
  through a wall. Both apply to the data protection officer too.
