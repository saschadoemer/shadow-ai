# 0033 — The intern

**Status:** approved 2026-11-19
**Milestone:** M6
**Drafted:** 2026-11-19

## Goal

A player who does not know where to go next walks to the break room and asks the intern. He
stands at the counter, knows what goes on in every department, and says in one page what the
next step is — which room, what to look at, whom to ask. What he says follows from how far
the player has come.

## Scope

Built on 0032 as merged. No tile changes; the floor gets one point.

**In:**

- A second standing figure of the cast, `intern`, in the break room: one point in
  `tools/floor-layout.ts` and `floor.tmj`.
- `public/sprites/intern.png`, his sheet, from the figures' generator.
- The hints: per case three pages, one before the lamp and one when every case is solved,
  and the rule that picks one.
- The language table gets eight keys in German and English.
- With the implementation: `world.md` §3; `gameplay.md` §8; `architecture.md` §2, §6 and §7;
  `testing.md` §2; the README.

**Out, explicitly:** a hint that is shown without being asked — no arrow, no marker, no line
at the bottom (`vision.md` §2) · hints for a case the game does not have yet (with each
case) · a name for the intern · a second page of small talk · the intern seeing the shadow
— who sees it is its own rule (M6) · a chair to sit on (art pass) · hints about the
creatures, the coffee or the keys of the game (the help of 0021 has the keys) · the vendor
(M6).

## Behaviour

Refines `world.md` §3 and `gameplay.md` §8. Talking is as built: reach and sight, the box,
`E` or `Enter` (0017). The intern is spoken to like the data protection officer, and he
turns to whoever speaks to him.

### Where he stands

A point named `figure:intern` in the `objects` layer, written after the objects of 0032 with
the id 132; `nextobjectid` is 133. He stands in the middle of tile (38, 30), feet (616,
488), in the break room: four tiles below the counter, between its two coffee machines.

From every place where a coffee machine is in reach (0027) he is out of reach, 40 px, so a
press of `E` at a machine still takes the coffee. No route passes within 24 px of him.

His sheet, `public/sprites/intern.png`, is 320x24: the twenty 16x24 frames of a figure in a
shirt of `#0099db`, blue, which no other shirt of the floor has.

### What he says

He says exactly one page, picked when the talk opens (`hintOf`). The first rule that applies
decides:

1. **The player has no lamp:** `talk.intern-lamp`.
2. **A case is not solved.** The cases are asked in the order of `CASES` — Sales, then
   Marketing — and the first one that is not solved decides, whatever is found in a later
   one:
   - no trace of its region is found: its `start` page — where the room is and what is odd
     there;
   - some of its traces are found and not all: its `traces` page — what to look at;
   - all are found, so the case is ready: its `source` page — who to ask.
3. **Every case is solved:** `talk.intern-done`.

`HINTS` in `game/hints` holds the three pages of every case, by its region; a case without
hints is a fault a test finds. The hint is derived from the state when the talk opens and
while it is open; the state has no field for it. Reading a hint changes nothing.

He does not speak of the shadow: he does not see it. He speaks of people, rooms and devices.

### The text

A slash stands for a line break.

| Key | `de` | `en` |
|---|---|---|
| `talk.intern-lamp` | `Du willst in den Vertrieb? Geh erst nach` / `nebenan, zur Datenschutzbeauftragten. Sie hat` / `etwas, das du brauchen wirst.` | `Off to Sales? Go next door first, to the data` / `protection officer. She has something you` / `are going to need.` |
| `talk.intern-sales-start` | `Vertrieb? Am Ende des Flurs nach Osten.` / `Die tippen ihre Angebote neuerdings nicht mehr` / `selbst. Schau dir mal die Bildschirme an.` | `Sales? At the end of the corridor to the east.` / `They no longer type their offers themselves.` / `Have a look at their screens.` |
| `talk.intern-sales-traces` | `Im Vertrieb stehen sechzehn Bildschirme, und` / `du hast noch nicht alle gesehen. In jeder` / `Reihe lohnt sich einer.` | `Sales has sixteen screens, and you have not` / `seen them all. One in every row is worth` / `a look.` |
| `talk.intern-sales-source` | `Du weißt doch längst, wer es war. Rosa Hemd,` / `läuft zwischen Schreibtisch und Kaffee.` / `Frag einfach – da beißt keiner.` | `You know who it was by now. Pink shirt,` / `walks between the desks and the coffee.` / `Just ask – nobody bites.` |
| `talk.intern-marketing-start` | `Als Nächstes? Marketing, unten links am` / `Südflur. Deren Plakate sehen seit Kurzem` / `verdächtig gut aus.` | `Next? Marketing, down at the left of the` / `south corridor. Their posters have looked` / `suspiciously good lately.` |
| `talk.intern-marketing-traces` | `Im Marketing sind es die Bildschirme auf den` / `Tischinseln. Und vergiss den Drucker nicht –` / `der druckt ja alles doppelt.` | `In Marketing it is the screens on the desk` / `islands. And do not forget the printer – it` / `prints everything twice, after all.` |
| `talk.intern-marketing-source` | `Rotes Hemd, pendelt zwischen den Tischinseln` / `und dem Drucker. Die Antwort kennst du schon,` / `du musst sie nur noch hören.` | `Red shirt, goes back and forth between the` / `desk islands and the printer. You know the` / `answer already – you only have to hear it.` |
| `talk.intern-done` | `Mehr weiß ich gerade auch nicht. Am Nordflur` / `kommst du jetzt in HR und Buchhaltung rein –` / `was da los ist, erzählst du mir.` | `That is all I know for now. Off the north` / `corridor you can get into HR and Accounting` / `now – what goes on there, you tell me.` |

Each is one page of the kind `talk`: at most three lines of at most 47 characters, at most
three sentences (`vision.md` §6). He knows everything and likes to say it; he mocks nobody
and warns nobody. A hint names the room, the device or the shirt, never a key to press.

`talk.intern-done` names HR and Accounting because the last case of today's `CASES` opens
them (0029). A feature that adds a case changes this page with it.

## Acceptance criteria

1. `floor.tmj` holds the point `figure:intern` with the id 132 after the objects of 0032,
   which are unchanged; the floor has two figures, the officer and the intern.
2. He stands in the middle of tile (38, 30) in the break room, on a cell without a solid
   box, reached on foot from the spawn; no route leg passes within 24 px of him.
3. From every reached feet position from which a coffee machine is in reach, he is out of
   reach: a press of `talk` there takes the coffee and opens no dialogue.
4. Without the lamp he says `talk.intern-lamp`; the data protection officer still says the
   first meeting.
5. With the lamp and no trace of Sales found he says `talk.intern-sales-start`; with one to
   four found, `talk.intern-sales-traces`; with five found and Sales not solved,
   `talk.intern-sales-source` — whatever is found or solved in Marketing.
6. With Sales solved he says the three pages of Marketing by the same rule; with both
   solved, `talk.intern-done`.
7. Every case of `CASES` has its three pages in `HINTS`, and `HINTS` has no region without a
   case.
8. His talk has one page: the press that follows closes the box. It changes nothing but
   what a talk changes (0017): his facing.
9. The scene draws him from his own sheet, and the page of the hint that holds at that
   moment, in both languages.
10. `intern.png` is 320x24, equals its generator's output, passes the asset test, and its
    shirt colour is the shirt of no other sheet.
11. `de` and `en` hold the eight keys of the spec, each a page by the rule of 0017.
12. A game in which nobody speaks to him steps exactly as before: the 600 recorded steps of
    0020 give the same digest.

## Test plan

- **Unit, `game/hints`:** the rule — criteria 4 to 6 for every stand of the two cases, with
  a table of cases built in the test for the order; criterion 7.
- **Unit, `game/cast`, talk:** the cast has two members; the speakers of a step give the
  intern the page of `hintOf`; criterion 8 through `update`.
- **Unit, floor:** the point and its id; the objects before it against a recorded digest;
  criteria 2 and 3 on the floor as loaded.
- **Unit, sprites, assets:** the sheet against its generator and Endesga 32; criterion 10.
- **Unit, scene:** criterion 9.
- **Unit, text:** the eight keys in both languages; the rule of a page covers them.
- **Unit, state:** the digest of criterion 12.
- **Architecture:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.figures` holds two figures.
- **Fixtures:** none; the maps are built in the tests.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded and the call is read: the figure stands in the reception **without** the
lamp. Arrow keys or WASD walk, `Space` holds the lamp, `E` or `Enter` talks.

**Steps:**

1. Walk right out of the reception into the corridor and through the opening in its right
   wall, into the break room. Walk up to the figure in the blue shirt, who stands below the
   counter at the top of the room, and press `E`.
2. Expected: a box opens. Its first line is `Du willst in den Vertrieb? Geh erst nach`.
3. Press `E`.
4. Expected: the box is gone.
5. Walk up to the left coffee machine on the counter, stand below it and press `E`.
6. Expected: no box opens; a line at the bottom speaks of the coffee.
7. Fetch the lamp from the data protection officer beside the reception. Come back to the
   figure in the blue shirt and press `E`.
8. Expected: the first line is `Vertrieb? Am Ende des Flurs nach Osten.`
9. Press `E`. Walk to Sales, find one trace on a screen, come back and press `E` beside him.
10. Expected: the first line is `Im Vertrieb stehen sechzehn Bildschirme, und`.
11. Press `E`. Find the other four traces of Sales, come back and press `E` beside him.
12. Expected: the first line is `Du weißt doch längst, wer es war. Rosa Hemd,`.
13. Press `E`. Solve the case of Sales with the colleague in the pink shirt, come back and
    press `E` beside him.
14. Expected: the first line is `Als Nächstes? Marketing, unten links am`.

**Feel:**

- Does he help without taking the finding away?
- Does he sound like somebody who knows everything and likes to say it — and still likeable?
- Is one page enough, or does he need a first line of his own before the hint?
- Would you have found him without being told that he is there?

**Result:** not yet walked.

## Open questions

None. Six were settled on 2026-11-19, each as drafted:

- Where the hint comes from: one figure who is asked, and nothing that is shown unasked.
- The order: he always points to the first case of `CASES` that is not solved, also when
  the player has begun with a later one.
- The place: the middle of tile (38, 30), standing until the art pass; `world.md` §3 says
  so.
- What he does not see: he never speaks of the shadow, the strips or the traces.
- The words, eight pages in German and English, as in the table.
- The walk covers five of the eight pages and takes the case of Sales; the tests hold the
  other three.
