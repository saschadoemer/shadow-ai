# 0037 — The case of Support

**Status:** approved 2026-11-19
**Milestone:** M6
**Drafted:** 2026-11-19

## Goal

The player can solve a third case. Support has five traces on five of its screens. When all
are found, the colleague in the orange shirt answers honestly: the customers' mails go into
a translator from the web, and a browser extension reads the whole mailbox along. The case
is solved by the rules of the first two; the journal gains its third entry and its third
block of the policy, overview grows to eight, and Support gets its colours back. The room
behind the third open door is no longer empty.

## Scope

Built on 0036 as merged. The rules of the cases are those of 0022, 0024, 0025 and 0028;
this feature adds a case to them and changes one rule of the journal's layout. No tile
changes, no new sprite; the floor gets five rectangles.

**In:**

- Five traces of Support in `tools/floor-layout.ts` and `floor.tmj`.
- The third entry of `CASES`: Support, its source, its answer, its "afterwards", its outcome
  and its policy block.
- The name of the region for the journal.
- The policy tab stacks its blocks by their height, so that three fit the screen.
- The three hints of the intern for the case (0033).
- The language table gets nine keys in German and English.
- With the implementation: `world.md` §2 and §3; `gameplay.md` §6 and §7; `architecture.md`
  §5, §6 and §8; `testing.md` §2; the README.

**Out, explicitly:** the species of Support — every case has one (`world.md` §4); it comes
with the next feature, 0038 · a Harmonic station in Support (`world.md` §6: decided in a
case spec of Act 2; not this one) · an upgrade — the world
data has none for Support · the vendor (M6) · pages on the policy tab — three blocks fit;
pages come with the fourth · the mailbox and the translator as things on the screens (art
pass) · the browser extension as a creature or a device of its own · a second saying for
the other colleagues.

## Behaviour

Refines `world.md` §2 and §3 and `gameplay.md` §6 and §7. Everything that happens is defined
by 0022 (finding a trace), 0024 (the source's answer, the solving step, the journal), 0025
(the cleared region), 0033 (the hints) and 0034 (the close). This section names what is
added to their data, and the one rule that changes.

### The traces

`TRACES` gets five entries of the region `support`, after the five of Marketing, and
`floor.tmj` five more rectangles, written after the objects of 0035 with the ids 134 to
138; `nextobjectid` is 139. No object of an earlier feature changes its id. Each lies on
the desk with a screen of a cubicle:

| Trace | Cell | Rectangle | Where |
|---|---|---|---|
| `trace:support` | (52, 61) | (832, 976, 16, 16) | upper row, left block, first cubicle |
| `trace:support` | (72, 61) | (1152, 976, 16, 16) | upper row, left block, fifth cubicle |
| `trace:support` | (88, 67) | (1408, 1072, 16, 16) | middle row, right block, second cubicle |
| `trace:support` | (62, 73) | (992, 1168, 16, 16) | lower row, left block, third cubicle |
| `trace:support` | (98, 73) | (1568, 1168, 16, 16) | lower row, right block, fourth cubicle |

Support has twenty-seven cubicles in three rows, each a desk with a screen and a chair on
the cell below it, as in Sales. Every row has at least one trace. From any place on the
cell below a chair, a player who looks up has the screen in the light.

The traces of Sales keep their indices 0 to 4 and those of Marketing 5 to 9; those of
Support are 10 to 14. The state of a new game has fifteen traces.

### The case

`CASES` gets a third entry, after Marketing:

| Region | Source | The source's answer | Afterwards | Outcome | Policy block |
|---|---|---|---|---|---|
| `support` | `person:support` | `talk.support-source-1`, `talk.support-source-2` | `talk.support-after` | `case.support-outcome` | `policy.support` |

The source is the colleague in the orange shirt, who walks between the cubicles and the
printer since 0015 and says since 0018 that forty tickets come before the first coffee, half
of them in languages nobody here speaks. The region gets its name for the journal:
`region.support`.

The three cases do not depend on each other: Support is open from the start (`world.md`
§2), and the player may solve the three in any order. The case earns no upgrade. The
maximum of overview is eight.

### The policy tab

Until now a block of the policy started 60 px below the block before it. Three blocks do
not fit that way. From this feature on the blocks are **stacked**: the first starts at
(16, 36), and each further one starts 12 px below the last line of the block before it — a
block of n lines is followed by the next one 12n + 12 px lower. With a first block of four
lines the second starts at (16, 96), as before; with a first block of three lines it
starts at (16, 84).

The block of Support has three lines. With the three blocks of today — four, three and
three lines — the last line ends at y = 178 in every order, inside the 180 px of the
surface.

### The hints

`HINTS` (0033) gets the three pages of Support, and the intern asks the cases in the order
of `CASES`: Sales, Marketing, Support. `talk.intern-done` stays as it is: when all three
are solved, HR and Accounting are still what is open.

### The close

The close (0034) follows the last case of `CASES`. With this feature it is due only when
Support is solved too. Nothing of 0034 changes.

### The text

A slash stands for a line break.

| Key | `de` | `en` |
|---|---|---|
| `region.support` | `Support` | `Support` |
| `talk.support-source-1` | `Die Mails kommen in elf Sprachen. Ich kopiere` / `sie in einen Übersetzer aus dem Netz – sonst` / `wartet der Kunde drei Tage auf Antwort.` | `The mails come in eleven languages. I paste` / `them into a translator from the web – or the` / `customer waits three days for an answer.` |
| `talk.support-source-2` | `Dass da Namen und Adressen drinstehen, war mir` / `klar. Dass die Erweiterung im Browser gleich` / `das ganze Postfach mitliest, nicht.` | `That names and addresses are in them, I knew.` / `That the browser extension reads the whole` / `mailbox along with it, I did not.` |
| `talk.support-after` | `Danke. Sag mir, welchen Übersetzer ich nehmen` / `darf – und die Erweiterung fliegt heute noch` / `raus.` | `Thanks. Tell me which translator I may use –` / `and the extension goes today.` |
| `case.support-outcome` | `Gelöst: Kundenmails gingen in einen Übersetzer.` | `Solved: customer mails went into a translator.` |
| `policy.support` | `Werkzeuge und Erweiterungen kommen von der` / `freigegebenen Liste – und nur von dort. Fehlt` / `eines, sag es: Dann kommt es auf die Liste.` | `Tools and extensions come from the approved` / `list – and only from there. If one is missing,` / `say so: then it gets onto the list.` |
| `talk.intern-support-start` | `Dann der Support, unten rechts am Südflur.` / `Die beantworten Mails in elf Sprachen –` / `frag dich mal, wie.` | `Support next, down at the right of the south` / `corridor. They answer mails in eleven` / `languages – ask yourself how.` |
| `talk.intern-support-traces` | `Im Support sind es wieder die Bildschirme.` / `Drei Reihen, und in jeder sitzt jemand, der` / `gerade etwas übersetzen lässt.` | `In Support it is the screens again. Three` / `rows, and in each somebody is having` / `something translated right now.` |
| `talk.intern-support-source` | `Oranges Hemd, läuft zwischen den Tischen und` / `dem Drucker hin und her. Vierzig Tickets vor` / `dem ersten Kaffee – frag nach den Sprachen.` | `Orange shirt, walks between the desks and the` / `printer. Forty tickets before the first` / `coffee – ask about the languages.` |

The answer says why first — eleven languages, and a customer who would wait three days —
and then what went wrong: names and addresses in a tool from the web, and an extension that
reads the whole mailbox. "Afterwards" is the countermeasure in the colleague's own words.
The block is the lesson of the case: approved tools and extensions, and only those
(`world.md` §2) — with the way to get a missing one approved, because a list that only
forbids is the shadow's cause. No brand and no person is named.

## Acceptance criteria

1. `floor.tmj` holds the five rectangles of the table with the ids 134 to 138 after the
   objects of 0035, which are unchanged; the traces of Sales and Marketing keep their order.
2. Each of the five lies in the area of Support on a cell whose `detail` tile is a desk
   with a screen, with a chair on the cell below, and is in the light of a player who looks
   up from any place on the cell below that chair; every row of cubicles has at least one.
3. The initial state of the floor has fifteen traces, none found.
4. `CASES` holds Sales, Marketing and Support, in this order; the source of Support is a
   route of the floor with lines, and `region.support` exists.
5. Support is ready exactly when its five traces are found, whatever is found in the other
   two regions, and each of the other two exactly when its own five are.
6. With Support ready, its colleague says the answer and the other two sources their
   everyday pages; with Support solved, "afterwards".
7. Solving Support first gives `solved` `[{ region: 'support', at }]`, overview six of six
   and no upgrade; with all three solved, in any order, overview is eight of eight and
   `upgrades` is `['wide-cone']`.
8. With Support solved, the cells of its area are not under shadow, its standing wall has
   left `shadowWalls`, the coffee machine of Support fills overview, and the cells of the
   other regions under shadow still are.
9. With all three cases solved and a trace of each found, the cases tab draws three
   entries, 36 px apart, in the order Sales, Marketing, Support, each with its outcome.
10. The policy tab draws the blocks in the order they were solved, the first from (16, 36)
    and each further one 12 px below the last line of the one before: with Sales first the
    second from (16, 96), with Marketing or Support first from (16, 84). With all three, in
    every order, no line is drawn below y = 168.
11. The intern says the three pages of Support by the rule of 0033 once Sales and Marketing
    are solved, and `talk.intern-done` once Support is solved too.
12. With Sales and Marketing solved and Support not, the close of 0034 is not due; 300 steps
    after Support is solved as the last case, it opens.
13. `de` and `en` hold the nine keys of the spec, each by its rule.
14. A state in which no trace of Support is found steps exactly as before this feature: the
    600 recorded steps of 0020 give the same digest.

## Test plan

- **Unit, floor:** the five rectangles and their ids; the objects before them against a
  recorded digest; criterion 2; criterion 3; criteria 7 and 8 on the floor as loaded.
- **Unit, `game/cases`:** criterion 4; criterion 5 with five, ten and fifteen found;
  criterion 6 through the speakers of a step; criterion 7 in three orders.
- **Unit, `draw-journal`:** criteria 9 and 10 in both languages; the tests of 0024 and 0028
  for one and two blocks, with the second block of 0028 at its new place when Marketing is
  solved first.
- **Unit, `game/hints`:** criterion 11; every case has its hints.
- **Unit, `game/story`:** criterion 12.
- **Unit, text:** the nine keys in both languages; the rules of 0017, 0022 and 0024 cover
  them.
- **Unit, state:** the digest of criterion 14.
- **Architecture, assets:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.traces` holds fifteen traces.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the figure stands in the reception with the lamp — where the game opens
with the card (0036) and the call (0026), both are passed and the lamp fetched first. Arrow
keys or WASD walk, `Space` holds the lamp, `E` or `Enter` talks, `J` opens and closes the
journal.

**Steps:**

1. Walk right into the corridor and down it to the wide corridor at its end. Walk right
   along it to the violet strip in its lower wall, hold the lamp on it until it is gone,
   and walk in.
2. Expected: the room is grey under thin violet dots. A colleague in an orange shirt walks
   in it.
3. Walk to the colleague and press `E`.
4. Expected: the first line is `Vierzig Tickets vor dem ersten Kaffee.`
5. Press `E`. Walk to the upper row of cubicles. Stand below the chair of the first cubicle
   from the left, face up and hold `Space` until the pattern is gone. Do the same at the
   fifth cubicle of that row.
6. Expected: twice the violet pattern grows on the screen and goes, and the line
   `Spur gefunden. Sie steht im Journal.` appears.
7. Find the other three in the same way: the second cubicle of the right block in the
   middle row, the third cubicle of the left block in the lower row, and the fourth cubicle
   of the right block in the lower row.
8. Expected: each time the pattern grows and goes, with its line.
9. Press `J`, then the right arrow.
10. Expected: the tab `Fälle` shows `Support` and `Spuren: 5 von 5`.
11. Press `J`. Walk to the colleague in the orange shirt and press `E`.
12. Expected: the first line is `Die Mails kommen in elf Sprachen. Ich kopiere`.
13. Press `E`.
14. Expected: the first line is `Dass da Namen und Adressen drinstehen, war mir`.
15. Press `E`.
16. Expected: the box is gone. The corner shows six full hearts, the room is in colour, its
    dots thin out and are gone, and a line says `Der Fall ist gelöst. Sieh ins Journal.`
17. Press `J`, then the right arrow twice.
18. Expected: the tab `Richtlinie` shows three lines, the first
    `Werkzeuge und Erweiterungen kommen von der`.
19. Press `J`. Walk to the coffee machine at the room's lower wall, stand above it and
    press `E`.
20. Expected: a line at the bottom speaks of the coffee, and it is not
    `Dieser Kaffee schmeckt nach nichts.`
21. Walk to the break room and press `E` beside the figure in the blue shirt.
22. Expected: the first line is `Vertrieb? Am Ende des Flurs nach Osten.`

**Feel:**

- A third case by the same rules: still a pleasure, or does it now need its own creature?
- Twenty-seven screens and five traces: a search, or a chore? Does the intern's hint help?
- Does the answer sound like the colleague with the forty tickets?
- Is the block of the policy something a team would accept — also the part about the list?
- Three cases in any order: does the game still tell one story?

**Result:** not yet walked.

## Open questions

None. Six were settled on 2026-11-19:

- The cut: this feature is the case. Its species comes at once, as a feature of its own:
  0038, the creature of Support.
- Five traces, on the screens of the table, as drafted.
- The words — the answer, "afterwards", the outcome and the block — as drafted.
- The policy tab stacks its blocks by their height, as drafted; pages come with the fourth
  block.
- The three hints of the intern, as drafted; 0038 changes the second of them.
- The order: by number, 0032 to 0038.
