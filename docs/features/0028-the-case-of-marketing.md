# 0028 — The case of Marketing

**Status:** approved 2026-11-18
**Milestone:** M6
**Drafted:** 2026-11-18

## Goal

The player can solve a second case. Marketing has five traces — on four screens and on the
printer. When all are found, the colleague in the red shirt answers honestly: an image
generator makes the visuals, and nobody looks at them before they go out. The case is solved
by the rules of the first one; the journal gains its second entry and its second block of
the policy, overview grows to seven, and Marketing gets its colours back.

## Scope

Built on 0025 as merged. The rules are those of 0022, 0024 and 0025; this feature adds a
case to them and changes none. No tile changes, no new sprite; the floor gets five
rectangles.

**In:**

- Five traces of Marketing in `tools/floor-layout.ts` and `floor.tmj`.
- The second entry of `CASES`: Marketing, its source, its answer, its "afterwards", its
  outcome and its policy block.
- The name of the region for the journal.
- The language table gets six keys in German and English.
- With the implementation: `world.md` §2 and §3; `gameplay.md` §6 and §7; `testing.md` §2;
  the README.
- With this draft: `docs/plan.md` §4 opens M6 and names its first three features.

**Out, explicitly:** the species of Marketing — every case has one (`world.md` §4); it
comes with its own feature (0031) · the upgrade the case earns, the wider cone (0029) · the
vendor, who is in every department of Act 2 (M6) · the intern and the hints (M6) · a rule
for who sees the shadow (M6) · three outcomes per case and the mirror case
(`docs/plan.md` §5) · the pages of the policy tab — two blocks fit · the generated visuals
themselves as pictures on the walls (art pass) · a second saying for the other colleagues.

## Behaviour

Refines `world.md` §2 and §3 and `gameplay.md` §6 and §7. Everything that happens is defined
by 0022 (finding a trace), 0024 (the source's answer, the solving step, the journal) and
0025 (the cleared region). This section names what is added to their data.

### The traces

`TRACES` in `tools/floor-layout.ts` gets five entries of the region `marketing`, after the
five of Sales, and `floor.tmj` five more rectangles, with the ids 124 to 128; `nextobjectid`
is 129. The generator writes the five of Sales where 0022 put them and the new five at the
end, after the rests of 0027, so that no object of an earlier feature changes its id. Each
lies on a device of Marketing:

| Trace | Cell | Rectangle | Device |
|---|---|---|---|
| `trace:marketing` | (6, 62) | (96, 992, 16, 16) | upper row, first island, right screen |
| `trace:marketing` | (15, 62) | (240, 992, 16, 16) | upper row, second island, right screen |
| `trace:marketing` | (41, 62) | (656, 992, 16, 16) | upper row, fourth island, left screen |
| `trace:marketing` | (5, 70) | (80, 1120, 16, 16) | lower row, first island, left screen |
| `trace:marketing` | (27, 78) | (432, 1248, 16, 16) | the printer at the lower wall |

Marketing has sixteen desks with a screen, in eight islands of two, and one printer. A
screen and the printer are low: the light reaches them. From any place on the cell above a
device, a player who looks down has it in the light.

The traces of Sales keep their indices 0 to 4; those of Marketing are 5 to 9. The state of
a new game has ten traces.

### The case

`CASES` gets a second entry, after Sales:

| Region | Source | The source's answer | Afterwards | Outcome | Policy block |
|---|---|---|---|---|---|
| `marketing` | `person:marketing` | `talk.marketing-source-1`, `talk.marketing-source-2` | `talk.marketing-after` | `case.marketing-outcome` | `policy.marketing` |

The source is the colleague in the red shirt, who walks between the desk islands and the
printer since 0015 and says since 0018 that the printer prints everything twice. The region
gets its name for the journal: `region.marketing`.

The two cases do not depend on each other: Marketing is open from the start (`world.md` §2),
and the player may solve it before Sales. `solved` holds them in the order they were solved.

With both solved, the journal's cases tab shows two entries — Sales first, then Marketing,
the order of the world data — and the policy tab two blocks in the order they were solved.
The maximum of overview is seven.

### The text

A slash stands for a line break.

| Key | `de` | `en` |
|---|---|---|
| `region.marketing` | `Marketing` | `Marketing` |
| `talk.marketing-source-1` | `Die Motive macht ein Bildgenerator – in zehn` / `Minuten statt in zwei Tagen, und die Agentur` / `haben wir uns gespart.` | `An image generator makes the visuals – in ten` / `minutes instead of two days, and we saved` / `the agency.` |
| `talk.marketing-source-2` | `Dass fremde Logos und Gesichter darin stecken,` / `habe ich erst auf dem Plakat gesehen.` / `Geprüft hat das vor dem Druck niemand.` | `That other logos and faces are in them,` / `I only saw on the poster.` / `Nobody checked it before it went to print.` |
| `talk.marketing-after` | `Danke. Ab jetzt schaut jemand drauf, bevor` / `etwas rausgeht – und sei es nur jemand vom` / `Nachbartisch.` | `Thanks. From now on somebody looks at it` / `before it goes out – even if it is only` / `somebody at the next desk.` |
| `case.marketing-outcome` | `Gelöst: Bilder gingen ungeprüft raus.` | `Solved: images went out unchecked.` |
| `policy.marketing` | `Was eine Maschine erzeugt hat, sieht sich` / `ein Mensch an, bevor es das Haus verlässt.` / `Bild oder Text – lieber einmal zu viel.` | `What a machine has made, a person looks at` / `before it leaves the house.` / `Image or text – rather once too often.` |

The answer is three sentences over two pages. It says why first — ten minutes instead of two
days, and no agency — and then what went wrong: other companies' logos and faces, seen only
on the poster, and nobody who looked before the print. "Afterwards" is the countermeasure in
the colleague's own words. The block is the lesson of the case: generated content is
reviewed before it goes out (`world.md` §2). No brand and no person is named.

The rules of 0022 and 0024 hold every key: the pages of the kind `talk`, the region's name,
the outcome and the block.

## Acceptance criteria

1. `floor.tmj` holds the five rectangles of the table with the ids 124 to 128 after the
   objects of 0027, which are unchanged; the traces of Sales keep their order.
2. Each of the five lies in the area of Marketing on a cell whose `detail` tile is a desk
   with a screen or the printer, and is in the light of a player who looks down from any
   place on the cell above it.
3. The initial state of the floor has ten traces, none found.
4. `CASES` holds Sales and Marketing, in this order; the source of Marketing is a route of
   the floor with lines, and `region.marketing` exists.
5. Marketing is ready exactly when its five traces are found, whatever is found in Sales;
   Sales is ready exactly when its five are, whatever is found in Marketing.
6. With Marketing ready, the colleague of Marketing says the answer and the colleague of
   Sales its everyday pages; with Marketing solved, "afterwards".
7. Solving Marketing first gives `solved` `[{ region: 'marketing', at }]` and overview six
   of six; solving Sales after it gives both, in that order, and seven of seven.
8. With Marketing solved, the cells of its area are not under shadow, its standing wall has
   left `shadowWalls`, and the cells of Sales still are under shadow.
9. With only Marketing solved, the cases tab draws one entry — `Marketing`, `Spuren: 5 von
   5` and its outcome — and, with one trace of Sales found too, Sales first and Marketing
   second, 36 px lower.
10. With both solved, the policy tab draws the block of the case solved first from (16, 36)
    and the other from (16, 96).
11. `de` and `en` hold the six keys of the spec, each by its rule.
12. A state in which no trace of Marketing is found steps exactly as before this feature:
    the 600 recorded steps of 0020 give the same digest.

## Test plan

- **Unit, floor:** the five rectangles and their ids; the objects of 0027 unchanged;
  criterion 2 — the tile under each trace, the area, and the light from every feet position
  on the cell above; criterion 3.
- **Unit, `game/cases`:** criterion 4; criterion 5 on the floor's traces with five, nine and
  ten found; criterion 6 through the speakers of a step; criterion 7 in both orders.
- **Unit, `game/region`, the scene:** criterion 8 on the floor as loaded, with each case
  solved alone.
- **Unit, `draw-journal`:** criteria 9 and 10 in both languages; one case and two.
- **Unit, text:** the six keys in both languages; the rules of 0022 and 0024 cover them.
- **Unit, state:** the digest of criterion 12.
- **Architecture, assets:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.traces` holds ten traces.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the figure stands in the reception with the lamp — where the game opens
with the call (0026), the call is read and the lamp fetched first. Arrow keys or WASD walk,
`Space` holds the lamp, `E` or `Enter` talks, `J` opens and closes the journal.

**Steps:**

1. Walk right into the corridor and down it to the wide corridor at its end. Hold the lamp
   on the violet strip in the doorway at the left of its lower wall until it is gone, and
   walk in.
2. Expected: the room is grey under thin violet dots. A colleague in a red shirt walks in
   it.
3. Walk to the colleague and press `E`.
4. Expected: the first line is `Der Drucker druckt seit Montag alles doppelt.`
5. Press `E`. Walk to the upper row of desk islands. Stand above the right screen of the
   first island from the left, face down and hold `Space` until the pattern is gone. Do the
   same above the right screen of the second island and above the left screen of the fourth.
6. Expected: three times the violet pattern grows and goes, and the line
   `Spur gefunden. Sie steht im Journal.` appears.
7. Walk to the lower row of islands and find the trace on the left screen of the first
   island in the same way. Then walk to the printer at the room's lower wall, stand above it,
   face down and hold `Space`.
8. Expected: the pattern grows on the screen and then on the printer, each with its line.
9. Press `J`, then the right arrow.
10. Expected: the tab `Fälle` shows `Marketing` and `Spuren: 5 von 5`.
11. Press `J`. Walk to the colleague in the red shirt and press `E`.
12. Expected: the first line is `Die Motive macht ein Bildgenerator – in zehn`.
13. Press `E`.
14. Expected: the first line is `Dass fremde Logos und Gesichter darin stecken,`.
15. Press `E`.
16. Expected: the box is gone. The corner shows six full hearts, the room is in colour, its
    dots thin out and are gone, and a line says `Der Fall ist gelöst. Sieh ins Journal.`
17. Press `J`, then the right arrow.
18. Expected: the tab `Fälle` shows three lines: `Marketing`, `Spuren: 5 von 5` and
    `Gelöst: Bilder gingen ungeprüft raus.`
19. Press the right arrow.
20. Expected: the tab `Richtlinie` shows three lines, the first
    `Was eine Maschine erzeugt hat, sieht sich`.
21. Press `J`, then `E` beside the colleague.
22. Expected: the first line is `Danke. Ab jetzt schaut jemand drauf, bevor`.

**Feel:**

- A second case by the same rules: is it still a pleasure, or does it need something new?
- Four screens and the printer: is the printer a good place for a trace?
- Does the answer sound like this colleague — the one with the printer?
- Is the block of the policy something a team would accept?
- Marketing can be solved before Sales. Does that fit the story the call tells?

**Result:** not yet walked.

## Open questions

None. Seven were settled on 2026-11-18, each as drafted:

- A case that is only content: this case uses the rules of the first without a change. What
  a case of Act 2 has more — its species, the vendor, the upgrade — comes as features of
  their own.
- Five traces, on these devices: four screens and the printer of the table.
- The words: the answer, "Afterwards", the outcome and the block as in the table under "The
  text", in German and English.
- Before Sales: nothing makes the player solve Sales first.
- The cut of M6: 0028 the case of Marketing · 0029 the wider cone · 0031 the creature of
  Marketing; the rest is named in `docs/plan.md` §4 without a number.
- Three outcomes per case: Act 2 stays linear. `docs/plan.md` §5 keeps the idea deferred.
- The mirror case: not yet. It stays deferred; the budget stays at seven cases and one side
  case.
