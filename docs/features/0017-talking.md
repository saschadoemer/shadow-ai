# 0017 — Talking

**Status:** implemented 2026-11-17
**Milestone:** M4
**Drafted:** 2026-11-17

## Goal

The player can talk to a figure. The data protection officer stands in her office beside the
reception; a key press next to her opens a box with what she says, page by page, and the game
stands still while it is open. She is the first figure with text, and she says the three
sentences that explain the shadow and the lamp.

## Scope

Built on 0016 as merged. No tile changes; the points and the rectangles of the floor stay as
they are, and one point is added.

**In:**

- The action `talk`, on `E` and on `Enter`, and its press: the state remembers whether the key
  was down in the last step.
- Standing figures: a point of the map named `figure:<id>`, the cast in `src/game/cast.ts`, and
  `GameState.figures`. One figure exists: `officer`.
- `src/game/talk.ts`: who can be talked to, opening, turning pages and closing; and
  `GameState.dialogue`.
- While a dialogue is open, nothing in the world is stepped.
- The dialogue box: up to three lines per page, a marker that there is more to press.
- `drawText` draws more than one line; the language table gets the two pages in German and
  English.
- `public/sprites/officer.png` from the person generator; the scene draws the standing
  figures and the box.
- With the implementation: `gameplay.md` §8; `world.md` §3; `architecture.md` §1, §2, §4, §5,
  §6, §7 and §8; `visual.md` §3; `testing.md` §2 and §6; the README.
- With this draft: `docs/plan.md` §4 cuts M4 into five features.

**Out, explicitly:** lines for the colleagues who walk the floor — they have to stop and turn
first (0018) · the language switch (0019) · the journal and its record of people spoken to
(0020, M5) · the first meeting of the story and the handing over of the lamp (M5) — until then
she says the same two pages every time · a name or a role over the box, a portrait · solid
figures: the player walks through her, as through every colleague since 0015 · a sight test
between the two — no figure stands within reach of a wall · choices, answers of the hero ·
text that appears letter by letter · wrapping computed by the game · sound.

## Behaviour

Refines `gameplay.md` §8, `world.md` §3, `architecture.md` §2, §4, §5, §6 and §8 and
`visual.md` §3. In this section the player is the hero's figure, and a figure is one of the
cast.

### The action and its press

The input table of `main.ts` gets `talk` ← `KeyE` or `Enter`, and the game's input the boolean
`talk`. A press is what talking needs, not a held key, and the keyboard does not keep one
(`architecture.md` §4). So the state does: `GameState.talkHeld` is the `talk` of the last
step's input, false at the start. `talk` is **pressed** in a step when the input holds it and
`talkHeld` is false. Every step sets `talkHeld` from its input — also a step of the dark and a
step with a dialogue open. A key held down is therefore pressed once, in its first step,
however many steps a frame runs and however long it is held.

### Standing figures

A point of the `objects` layer named `figure:<id>` is where a figure of the cast stands; its
position is the feet. `src/game/cast.ts` holds the cast as data, in this feature one entry:

| Id | Sheet | Pages |
|---|---|---|
| `officer` | `officer.png` | `talk.officer-rules-1`, `talk.officer-rules-2` |

`game/cast` reads the figures from the map's points in file order and refuses the map in
`createInitialState`:

- an id the cast does not have: `figure point figure:cellar names no figure`;
- two points with the same id: `more than one point object "figure:officer"`.

A map without such points has no figures; a figure of the cast without a point is simply not
there. A `figure:` point is no route point and makes no creature: `game/mover` and
`game/creature` skip it.

`GameState.figures` holds one entry per figure of the map, in file order: `{ figure, facing }`
— the index among the map's figures, and where it looks. The facing is `down` at the start.
The place stays in the map; `update` reads the figures' points in every step, as it does the
routes. A standing figure never moves and is not solid.

On the floor, `tools/floor-layout.ts` gets `FIGURES` with one entry, and `floor.tmj` one more
point object after the rectangles: `figure:officer` at (264, 472), the middle of tile (16, 29)
in the data protection officer's office, with the id 100; `nextobjectid` is 101. She stands two
tiles left of and two tiles above the wake point (296, 504), in the view when the player wakes.

### Talking

`TALK_DISTANCE` is 24 px, a tile and a half, between the feet of the two, *tune*.

`GameState.dialogue` is `null`, or `{ figure, page }`: the index of the figure that speaks and
the page shown, from 0. In a step that is not a step of the dark:

1. **A dialogue is open.** `tick` grows by 1 and `talkHeld` is set; nothing else is stepped —
   not the player, the lamp, the creatures, the movers or the walls. When `talk` is pressed,
   `page` grows by 1; pressed on the last page, `dialogue` becomes `null`. The other keys do
   nothing.
2. **No dialogue, and `talk` is pressed** while the input does not hold `lamp`, the player is
   not being pushed, and at least one standing figure is at most `TALK_DISTANCE` away: the
   dialogue opens with the nearest of them — the first in file order when two are equally near
   — on page 0. Both turn to each other (below). The player stands: phase 0, timer 0. The lamp
   is off. `tick` grows by 1, and nothing else is stepped in this step.
3. **Otherwise** the step is the one of 0016, and `talkHeld` is set.

**Turning.** Each of the two looks along the line to the other's feet: left or right when the
horizontal distance is the larger one, up or down otherwise, and as before when both stand on
the same spot. The standing figure keeps that facing after the dialogue.

Nothing can hurt the player while the box is open: no creature moves. The dark cannot begin, and the
notice of 0016 cannot show, because the lamp is off.

### The text

A string of the table may hold line breaks; each starts a new line. The key rule of 0016 is
widened to digits: `<kind>.<what>`, lower-case letters, digits and hyphens. A page of dialogue
is one key of the kind `talk`, with at most three lines of at most 47 characters; the break is
written in the table, the game computes none. A notice stays one line.

| Key | `de` | `en` |
|---|---|---|
| `talk.officer-rules-1` | `Du siehst den Schatten also auch.` / `Er bleibt überall dort zurück, wo Daten das` / `Haus verlassen und niemand hinsieht.` | `So you can see the shadow too.` / `It stays behind wherever data leaves the house` / `and nobody is looking.` |
| `talk.officer-rules-2` | `Mit der Lampe hältst du fest, was sich darin` / `regt – nicht um es zu vertreiben, sondern um` / `es zu verstehen.` | `The lamp holds still whatever stirs in it –` / `not to drive it away, but to understand it.` |

A slash in the table stands for a line break. That is three sentences (`vision.md` §6), and
the second page is the game's first pillar in her words.

`drawText` draws line k of a string, counted from 0, at (x, y + 12k): a line is 10 px high, and
2 px lie between two lines.

### Drawing

A standing figure is drawn like a colleague of 0015 that stands: from its sheet, the frame
facing × 5, with its top-left corner at (x − 8 − camera.x, y − 24 − camera.y). Figures whose
feet y is at most the player's are drawn after the ground movers of that group and before the
creatures; the others after the player and before the other ground movers.

`public/sprites/officer.png` is 320x24: the player's twenty frames from the person generator,
in a shirt of `#c0cbdc` — light grey, the colour of no other shirt — and without the lanyard.

While a dialogue is open, the box is drawn on the surface, after the hearts and before the
lids, where the notice is drawn otherwise:

1. the box: a rectangle (8, 134, 304, 42) in `#181425` — the notice's bar grown upwards to
   three lines, with the same bottom edge;
2. the page's lines, left-aligned, from (12, 138);
3. the marker, while ⌊tick / 30⌋ is even: three rectangles in `#ffffff`, (299, 169, 5, 1),
   (300, 170, 3, 1) and (301, 171, 1, 1) — a small triangle that points down, in the box's
   lower right corner. It blinks once a second and is drawn on every page, the last included:
   a press always does something.

A line of 47 characters ends at x = 294, left of the marker.

## Acceptance criteria

1. `talk` is pressed in the first step in which the input holds it and not again until it has
   been let go: with the key held for 600 steps, exactly one step sees a press.
2. The loader's points and `game/cast` give the floor one figure, `officer`, at (264, 472);
   a map with an unknown `figure:` id or with two points of one id does not start, each with
   its message; a map without figure points starts with `figures` empty.
3. `floor.tmj` holds the point `figure:officer` with the id 100 after its 91 points and 8
   rectangles, which are those of 0014; the point is no route point and makes no creature.
4. The officer's box is free of every solid box, she is reached on foot from the spawn, no
   route passes within 24 px of her, and she lies in the view of the wake point.
5. The initial state has `figures` `[{ figure: 0, facing: 'down' }]` on the floor, `dialogue`
   `null` and `talkHeld` false, and survives a JSON round trip at the start and with a dialogue
   open on page 1.
6. A press at 24 px opens the dialogue on page 0; at 24.1 px, with `lamp` held, or during a
   push it does not, and the step is an ordinary one.
7. When the dialogue opens, each of the two faces the other by the rule under "Turning", for
   the four sides and for a diagonal; the player's phase is 0 and the lamp is off.
8. With a dialogue open, 600 steps with every key but `talk` held change nothing but `tick`
   and `talkHeld`: the player, the creatures, the movers, the walls, overview and `dark` are
   as they were.
9. A press turns to the next page; a press on the last page closes the dialogue, and the next
   step is an ordinary one.
10. Of two figures within reach the nearer one speaks; of two equally near, the first in file
    order.
11. `de` and `en` hold the two pages of the spec; every page of the kind `talk` has at most
    three lines of at most 47 characters and no empty line, in both languages; no notice has a
    line break.
12. `drawText` draws line k at y + 12k, each line from x.
13. `officer.png` is 320x24, equals its generator's output, has the shirt `#c0cbdc` where the
    player has its shirt and its lanyard, and passes the asset test.
14. The scene draws a standing figure with the frame facing × 5 at (x − 8 − camera.x,
    y − 24 − camera.y), before the creatures when its feet y is at most the player's and
    after the player otherwise.
15. With a dialogue open the scene draws the box (8, 134, 304, 42), the page's lines from
    (12, 138) and, while ⌊tick / 30⌋ is even, the three rectangles of the marker, after the
    hearts and before the lids; without one it draws none of it.
16. A state without figures, in which `talk` is never held, steps exactly as before this
    feature: the player, the creatures, the movers and the walls of 600 recorded steps are the
    same.

## Test plan

- **Unit, `game/talk`, the press:** criterion 1; a second press after a step without the key;
  the dark sets `talkHeld` too.
- **Unit, `game/cast`:** the figures of a map; the two refusals; a map without figure points;
  `routesOf` and `creaturesFrom` on points that include a `figure:` point.
- **Unit, `game/talk`, opening:** on an open 20x12 grid with one figure at (160, 96): a press
  with the feet at (184, 96) opens, at (184.1, 96) does not; with `lamp` held; with a push of
  one step left. Turning from (184, 96), (136, 96), (160, 120), (160, 72) and (178, 110); the
  same spot keeps both facings.
- **Unit, `game/talk`, pages:** criterion 9 step by step; a held key turns one page;
  criterion 8 with a snippet 30 px from the player, a mover on its route and a wall at
  `light` 30.
- **Unit, `game/talk`, two figures:** criterion 10 on a test cast with two figures — the cast
  is a parameter of the functions, the game passes its own.
- **Unit, state:** the initial state of the floor; the round trips of criterion 5; the 600
  steps of criterion 16 against the same run with the figures taken out of the map.
- **Unit, floor:** the point and its id; the tile layers, the 91 points and the 8 rectangles
  against 0014; criterion 4 — the box against the solid boxes, the flood, every route leg's
  distance to her feet, the camera of the wake point.
- **Unit, text:** the two pages in both languages; the key rule with digits; criterion 11; the
  glyph test of 0016 skips line breaks.
- **Unit, `draw-text`:** a page of three lines — the first glyph of each line at (x, y),
  (x, y + 12) and (x, y + 24).
- **Unit, scene:** a standing figure above and below the player in the draw order, its frame
  for each facing; the box, the lines and the marker at `tick` 0 and none at `tick` 30; no
  box without a dialogue; the notice of 0016 as before.
- **Unit, sprites:** the generator against the committed sheet; the shirt and the lanyard
  pixels of the down-facing standing frame.
- **Assets:** the sheet against Endesga 32.
- **Architecture:** unchanged, now covering `src/game/cast.ts` and `src/game/talk.ts`.
- **Smoke:** after loading, `window.shadowAi.state.figures` holds one figure facing down, and
  `state.dialogue` is `null`.
- **Fixtures:** `tests/fixtures/maps/figures.tmj`, 20x12 on the tiles of `points.tmj`, with
  the spawn, a snippet and `figure:officer` at (160, 96).

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp, `E` or `Enter` talks.

**Steps:**

1. Walk right into the corridor, up it to the next doorway on the left, and through that
   doorway into the room above the reception.
2. Expected: a colleague in a light grey shirt stands in the room, a few tiles left of the
   doorway, and looks down. There is no box and no text.
3. Stay at the doorway and press `E`.
4. Expected: nothing happens.
5. Walk to her, stand directly right of her and press `E` once.
6. Expected: she turns to the figure and the figure to her. A dark box appears at the bottom
   with three white lines, the first `Du siehst den Schatten also auch.` In its lower right
   corner a small white triangle blinks.
7. Press the arrow keys, then hold `Space` for a moment.
8. Expected: the figure neither walks nor turns, and the lamp does not shine.
9. Press `E`.
10. Expected: the box shows three other lines, the first
    `Mit der Lampe hältst du fest, was sich darin`.
11. Press `E`.
12. Expected: the box is gone; she still looks at where the figure stands; the arrow keys
    walk again.
13. Walk below her, face anywhere, and hold `E` down for three seconds.
14. Expected: she turns down to the figure, the figure up to her; the first page appears and
    stays for as long as the key is held.
15. Let go of `E`, then press `Enter` twice.
16. Expected: the second page, then no box.
17. Walk straight through her, from below to above.
18. Expected: the figure passes. Below her it is drawn in front of her, above her behind her.
19. Stand above her and to her left, a little more above than left, and press `E`.
20. Expected: she looks up and the figure down.
21. Press `E` twice, then hold `Space` beside her and press `E` while holding it.
22. Expected: the lamp shines and no box appears.

**Feel:**

- Do three lines of this length read well in the box? Is the box at the right place?
- Is `E` the key the hand finds? Is `Enter` wanted beside it?
- Is the triangle noticed — is it clear that a press goes on?
- The figure walks through her. Does that disturb — should a standing figure be solid?
- The world stands still while she speaks. Right, or should it go on?
- Are the three sentences right in tone and in content?

**Result:** passed 2026-11-17, steps 1–22. Feel: three lines of this length read well and the
box sits right; `E` is the key the hand finds and `Enter` stays beside it; the triangle is noticed
and says that a press goes on; walking through her does not disturb — she stays not solid; the
world standing still while she speaks is right; the three sentences are right in tone and
content.

## Open questions

None. Four were settled on 2026-11-17, each as drafted:

- Her words: the two pages of the table under "The text", in German and English, said every
  time until M5 brings the story's first meeting.
- The keys: `E` and `Enter` both talk and turn pages; `Space` stays the lamp and does nothing
  in a dialogue.
- Not solid, no name: she can be walked through, and the box shows no name and no role. A
  solid figure and a name are features of their own.
- The cut of M4: five features — 0016 text on screen · 0017 talking · 0018 everyday lines ·
  0019 the language switch · 0020 the journal.
