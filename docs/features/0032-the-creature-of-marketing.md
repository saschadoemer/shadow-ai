# 0032 — The creature of Marketing

**Status:** approved 2026-11-19
**Milestone:** M6
**Drafted:** 2026-11-19

## Goal

Marketing has a creature of its own, and it plays differently from the snippet: it moves only
while nobody looks at it. The player has to keep it in view, catch it with the lamp, and finds
it in the journal afterwards. The second room of the game is no longer a room without
opposition.

## Scope

Built on 0029 as merged. No tile changes; the floor gets three points.

**In:**

- A second species, `mirage`, in `SPECIES`, with its behaviour.
- Three of them in Marketing: three points in `tools/floor-layout.ts` and `floor.tmj`.
- `public/sprites/mirage.png`, the species' sheet, from a generator of its own.
- The species' entry on the journal's creatures tab.
- The language table gets two keys in German and English.
- With the implementation: `world.md` §4; `gameplay.md` §3 and §7; `architecture.md` §2, §5,
  §6 and §7; `visual.md` §4; `testing.md` §2; the README.
- With this draft: `docs/plan.md` §4 names the next three features of M6.

**Out, explicitly:** picking a creature from the journal at the source (`gameplay.md` §6,
with a later case) · pages on the creatures tab — two entries fit the screen (with the third
species) · medium creatures that need an action in the environment (`gameplay.md` §3, M6) ·
a creature that only the wider cone captures (`gameplay.md` §2, with the first medium
creature) · a species for Support, HR or Accounting (with their cases) · sound (after M5) ·
a count of captures in the journal.

## Behaviour

Refines `world.md` §4, `gameplay.md` §3 and §7, `architecture.md` §2 and §5 and `visual.md`
§4. What is not said here is as for the snippet (0008, 0009): the lamp freezes a creature,
60 lit steps capture it, a free creature within 10 px of the figure's feet takes one point of
overview and pushes the figure.

### The species

The mirage (*Trugbild*) is a picture a machine has made and nobody has checked: a small
framed portrait of nobody. It is small, layer 1 (`gameplay.md` §3). Its weakness is the
countermeasure of its case: somebody looks at it.

- **Looked at.** A mirage is looked at when it is in front of the figure and in its sight:
  with C the centre of the figure's collision box, (x, y − 4), and B the mirage's body
  point, the vector from C to B has a component above 0 along the figure's facing, and no
  opaque box lies on the line from C to B. The map is the one with the shadow walls
  standing, as for the lamp's light on a creature. The facing has four values, so
  everything in the half of the map ahead of the figure counts, *tune*.
- **Looked at, it stands.** It does not move, at any distance.
- **Not looked at, it comes.** When the figure's feet are closer than
  `MIRAGE_NOTICE_RADIUS`, 96 px — six tiles, *tune* — and farther than 8 px, it moves
  straight toward them by 1 px per step — 60 px per second, three quarters of the figure's
  speed, *tune* — or by what is left to 8 px. Solid boxes hold it as they hold the snippet.
  At 96 px and beyond it rests.
- **In the light** it is frozen like every creature, whether looked at or not, and the count
  of its lit steps starts again when the light breaks.

So one mirage is harmless as long as the player faces it, and two are a problem: while the
player looks at one, the other comes from behind. Finding a trace means looking at a screen
for a second, with the back to the room.

### Where they are

Three points named `mirage` in the `objects` layer, written after the objects of 0028 with
the ids 129 to 131; `nextobjectid` is 132. No object of an earlier feature changes its id.
Each is the middle of a free cell of Marketing:

| Point | Cell | Feet | Where |
|---|---|---|---|
| `mirage` | (10, 67) | (168, 1080) | between the two rows of desk islands, left |
| `mirage` | (38, 65) | (616, 1048) | between the two rows of desk islands, right |
| `mirage` | (22, 75) | (360, 1208) | in the lower part of the room, left of the table |

None is closer than 96 px to the doorway, so nothing comes at a player who has just walked
in. Their home is in the area of Marketing: by the rule of 0025 the ones that are not
captured leave the game in the step that solves the case of Marketing.

The creatures of the state are in the order of the map's points: the three snippets, then
the three mirages.

### The state

`SPECIES` becomes `['snippet', 'mirage']`, so `captured` has a second count, `mirage`, 0 at
the start. `CreatureState` does not change. Whether a mirage is looked at is derived in
every step and every frame; the state has no field for it.

### Drawing

`public/sprites/mirage.png` is 48x16: three 16x16 frames in one row, from
`tools/placeholder-mirage.ts`. It is a shadow asset — the fifth file that may use the
signature colour `#68386c`.

- **Frame 0:** a rectangle, columns 3–12 and rows 2–13. Its border, 1 px, is the signature
  colour; its inside is `#c0cbdc`. Inside, in the signature colour: a head, columns 7–8 and
  rows 5–6, and shoulders, columns 6–9 in row 8 and columns 5–10 in rows 9–12.
- **Frame 1:** frame 0 moved one pixel to the right.
- **Frame 2:** frame 0 with the inside `#ffffff`: the mirage in the light.

A mirage in the light shows frame 2, as the snippet does. One that is looked at and not in
the light shows frame 0 and holds still. One that is not looked at shows frames 0 and 1 in
turn, 15 steps each, whether it moves or rests: it sways while nobody looks.

### The journal

The creatures tab shows the mirage as its second entry, 72 px below the first, once one is
captured: frame 2 of its sheet, its name and its text. With only a mirage captured it is the
first entry.

| Key | `de` | `en` |
|---|---|---|
| `creature.mirage-name` | `Trugbild` | `Mirage` |
| `creature.mirage-text` | `Ein Bild, das eine Maschine erzeugt hat und das` / `keiner geprüft hat. Es bewegt sich nur, solange` / `niemand hinsieht – und geht, sobald jemand` / `draufschaut, bevor es das Haus verlässt.` | `A picture a machine made and nobody checked.` / `It only moves while nobody is looking – and it` / `goes as soon as somebody looks at it before` / `it leaves the house.` |

A slash stands for a line break. The text says what it is, what it lives on and what makes
it go — the lesson of its case (`world.md` §2). No brand and no person is named.

## Acceptance criteria

1. `SPECIES` is `['snippet', 'mirage']`; the initial state has `captured`
   `{ snippet: 0, mirage: 0 }` and survives a JSON round trip, also with a mirage captured.
2. `floor.tmj` holds the three points of the table with the ids 129 to 131 after the objects
   of 0028, which are unchanged; the initial state of the floor has six creatures, three
   snippets and then three mirages.
3. Each of the three stands on a cell of Marketing without a solid box, reached on foot, with
   its home in the area of Marketing and at least 96 px from every cell of the doorway.
4. A mirage 50 px in front of the figure, in its sight, does not move in 600 steps without
   the lamp.
5. A mirage 50 px behind the figure moves 1 px toward its feet per step, and stops 8 px from
   them; one at exactly 96 px rests.
6. A mirage in front of the figure with an opaque box on the line between them is not looked
   at and comes; with a low box on the line it is looked at and stands.
7. A mirage exactly beside the figure — the component along the facing is 0 — is not looked
   at.
8. In the cone of the lamp a mirage is frozen and is captured in the 60th lit step:
   `captured.mirage` becomes 1 and it leaves `creatures`. A break of the light starts the
   count again.
9. A free mirage within 10 px of the figure's feet takes one point of overview and pushes
   the figure, by the rule of 0009.
10. The snippet steps as before: the tests of 0008 pass unchanged, and the 600 recorded
    steps of 0020 give the same digest, with the count of the snippet hashed as it was
    recorded.
11. Solving the case of Marketing removes every mirage that is left, captures none, and
    leaves the snippet of the east corridor.
12. `mirage.png` is 48x16, equals its generator's output, holds the three frames of the
    spec, uses only Endesga 32 with the signature colour, and is listed as a shadow asset.
13. The scene draws a mirage with frame 2 in the light, with frame 0 when it is looked at,
    and with frames 0 and 1 in turn, 15 steps each, when it is not.
14. The creatures tab draws the mirage's entry 72 px below the snippet's when both are
    captured, and in the first place when only a mirage is; both fit the screen.
15. `de` and `en` hold the two keys of the spec, each by its rule.

## Test plan

- **Unit, `game/creature`:** looked at — in front, behind, beside, behind an opaque box,
  across a low one, for the four facings; criteria 4 to 9; a snippet and a mirage in one step
  each go by their own rule.
- **Unit, floor:** the three points and their ids; the 128 objects before them against a
  recorded digest; criterion 3; the six creatures of the initial state; criterion 11 on the
  floor.
- **Unit, state:** criterion 1; the digest of criterion 10.
- **Unit, sprites:** the generator against the committed sheet; criterion 12 pixel by pixel.
- **Assets:** the sheet against Endesga 32; the list of the shadow assets has five files.
- **Unit, scene:** criterion 13 for the three cases.
- **Unit, `draw-journal`:** criterion 14 in both languages.
- **Unit, text:** the two keys in both languages; the rules of 0020 cover them.
- **Architecture:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.creatures` holds six creatures and
  `captured` is `{ snippet: 0, mirage: 0 }`.
- **Fixtures:** none; the maps are built in the tests.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the figure stands in the reception with the lamp — where the game opens
with the call (0026), the call is read and the lamp fetched first. Arrow keys or WASD walk,
`Space` holds the lamp, `J` opens and closes the journal.

**Steps:**

1. Walk right into the corridor and down it to the wide corridor at its end. Lift the violet
   strip in the doorway at the left of its lower wall and walk in.
2. Expected: nothing comes at the figure in the doorway.
3. Walk down past the upper row of desk islands and then right, along the open floor between
   the two rows, toward the small framed picture that stands there, until it is about four
   tiles ahead.
4. Expected: while the figure faces it, the picture stands still and does not sway.
5. Turn the figure round, away from the picture, and wait two seconds.
6. Expected: within those two seconds the figure is hit from behind: a heart goes empty and
   the figure is pushed.
7. Turn to face the picture and hold `Space` on it.
8. Expected: it turns white at once and is gone after about a second.
9. Press `J`.
10. Expected: the tab `Kreaturen` shows the picture, the name `Trugbild` and four lines, the
    first `Ein Bild, das eine Maschine erzeugt hat und das`.
11. Press `J`. Walk to the left end of the open floor between the two rows. Stand above the
    left screen of the first island of the lower row, face down and hold `Space`.
12. Expected: either the violet pattern on the screen grows and the trace is found, or the
    figure is hit from behind before that.
13. Face the picture that came from behind, walk up to it and hold `Space` on it. Then do
    the same with the third one, in the lower part of the room.
14. Expected: each stands while it is faced and is gone after a second of light. The room
    has no picture left.

**Feel:**

- Is it clear without a word that it only moves while nobody looks?
- Three in the room: tense, or tiresome?
- Six tiles and three quarters of the figure's speed: is there time to turn round?
- Does a framed picture read as "something a machine made"?
- Does the snippet now feel too simple beside it?

**Result:** not yet walked.

## Open questions

None. Five were settled on 2026-11-19, each as drafted:

- The behaviour: the mirage moves only while it is not looked at, and "looked at" is
  everything in front of the figure and in its sight.
- The name: `Trugbild` / `Mirage`, dictionary words used for a species; no trademark
  register was searched, as for the snippet (`world.md` §5).
- The numbers: three in Marketing on the cells of the table, 96 px, 1 px per step — all
  *tune* after the walk.
- The cut: no picking of a creature at the source and no pages on the creatures tab in this
  feature; the pages come with the third species (0038).
- The words of the journal entry, in German and English, as in the table.
