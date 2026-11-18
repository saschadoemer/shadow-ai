# 0024 — The case of Sales

**Status:** approved 2026-11-18
**Milestone:** M5
**Drafted:** 2026-11-18

## Goal

The player can solve the first case. When all five traces of Sales are found, the colleague in
the pink shirt — the source — no longer says the everyday line: shown what the lamp found, the
colleague says honestly what happened. With that the case is solved: the journal records the
outcome and gains the first building block of the policy, and overview grows by one. Nobody
gets into trouble.

## Scope

Built on 0022 as merged. It needs nothing of 0023. No tile changes, no map changes, no new
sprite.

**In:**

- The cases as data in `src/game/cases.ts`: per region its source and what the source says
  before, when the case can be solved, and after.
- A colleague's saying follows from the state: everyday, the source's answer, or the saying
  after the case.
- `GameState.solved`: the solved cases with the step in which each was solved.
- The step that closes the source's answer solves the case: `solved` grows, and overview
  grows by one and is full.
- A third notice, for two seconds after a case is solved.
- The journal: the outcome on the cases tab, and the policy tab's first block.
- The language table gets six keys in German and English.
- With the implementation: `gameplay.md` §4, §6 and §7; `world.md` §2 and §3;
  `architecture.md` §1, §2, §5 and §8; `testing.md` §2; the README.

**Out, explicitly:** the region's colours coming back, its shadow wall and its creatures
(0025) · picking a creature from the journal to show — with one species there is nothing to
pick; the choice comes with the second species (M6) · a picture of the gesture · hints from
other colleagues, the break room and the intern (M6) · the vendor (M6) · the head of
department and further figures of Sales · more colleagues who see the shadow, as a rule of
the game (0025 changes what Sales says; the rule is M6) · the upgrade a case earns — Sales
earns none (`world.md` §1) · a second case · pages on the policy tab — two blocks fit, the
third brings them (M6) · sound.

## Behaviour

Refines `gameplay.md` §4, §6 and §7, `world.md` §2 and §3 and `architecture.md` §2, §5 and
§8. In this section a colleague is a mover of the kind `person` with lines (0018).

### The cases

`src/game/cases.ts` holds the cases as data, one entry in this feature:

| Region | Source | The source's answer | Afterwards | Outcome | Policy block |
|---|---|---|---|---|---|
| `sales` | `person:sales` | `talk.sales-source-1`, `talk.sales-source-2` | `talk.sales-after` | `case.sales-outcome` | `policy.sales` |

The source of a case is a colleague, named by its route. A case is **ready** when the map
has at least one trace of its region and every one of them is found (0022). A case is
**solved** when its region is in `GameState.solved`.

### What a colleague says

The pages a colleague says follow from the state, in every step and every frame:

1. the colleague is the source of a solved case: the pages of "Afterwards";
2. the colleague is the source of a case that is ready and not solved: the source's answer;
3. otherwise: the everyday pages of 0018.

A colleague who is no source says its everyday pages as before. The standing figures are
unchanged.

### Solving the case

`GameState.solved` is a list of `{ region, at }`: the region of a solved case and the `tick`
of the step that solved it, in the order they were solved. It is empty at the start.

The gesture of `gameplay.md` §6 has no key and no screen of its own in this feature. The
player talks to the source with `E`, as to anyone (0018). When the case is ready, the source
answers what it is shown: its two pages are its honest answer. The hero says nothing.

The step in which a press closes the source's answer — a press on its last page — solves
the case. Besides what a closing step changes (0017), it changes exactly this:

- `solved` gains `{ region, at }` with the step's `tick`;
- `overview` becomes `{ current: max + 1, max: max + 1 }`: the maximum grows by one, and the
  player has all of it.

Nothing else changes in that step. A dialogue closes only by a press on its last page
(0017), so the answer cannot be left half read. The wake of 0009 keeps `solved`. A case is
solved once: afterwards the source says "Afterwards", every time.

### The notice

`CASE_NOTICE_STEPS` is 120, two seconds, *tune*. `game/notice` gains a third notice,
`notice.case-solved`, shown while a case has `tick` − `at` < `CASE_NOTICE_STEPS`. The order
when several are due: a wall that holds (0016), a solved case, a found trace (0022).

### The journal

**The cases tab.** A solved case's entry gets a third line: the key of its outcome, from
(16, 60 + 36k), under the name and the count of 0022. An entry is three lines at most and
still 36 px high.

**The policy tab.** Its entries are the solved cases, in the order they were solved. Block
k, counted from 0, is the key of the case's policy block, drawn from (16, 36 + 60k) with the
line pitch of 12. Without a solved case the tab shows its line for nothing, as in 0020. Two
blocks fit the screen.

### The text

A slash stands for a line break.

| Key | `de` | `en` |
|---|---|---|
| `talk.sales-source-1` | `Das ist von meinem Bildschirm, ich weiß.` / `Ich habe die Angebote in einen Chatbot kopiert,` / `damit sie besser klingen – drei bis zum Abend.` | `That is from my screen, I know.` / `I pasted the offers into a chatbot to make` / `them sound better – three due by tonight.` |
| `talk.sales-source-2` | `Wohin der Text damit geht, habe ich mir nicht` / `überlegt.` | `Where the text goes from there, I never` / `thought about.` |
| `talk.sales-after` | `Danke, dass du gefragt hast statt zu schimpfen.` / `Sag mir einfach, womit ich es beim nächsten Mal` / `machen darf.` | `Thanks for asking instead of telling me off.` / `Just tell me what I may use for it` / `next time.` |
| `case.sales-outcome` | `Gelöst: Angebote gingen in einen Chatbot.` | `Solved: offers went into a chatbot.` |
| `policy.sales` | `Jeder Text hat eine Stufe: offen, intern oder` / `vertraulich. Vertrauliches bleibt in den` / `Werkzeugen, die wir freigegeben haben. Und wer` / `unsicher ist, fragt – ohne Ärger.` | `Every text has a level: open, internal or` / `confidential. Confidential text stays in tools` / `we have approved. And whoever is unsure` / `asks – without trouble.` |
| `notice.case-solved` | `Der Fall ist gelöst. Sieh ins Journal.` | `The case is solved. See the journal.` |

The source's answer is three sentences over two pages, the most anyone says
(`vision.md` §6). It says why before anybody asks whether: three offers were due by the
evening. "Afterwards" is the relief of a solved case, and it names what is still missing —
an approved way to do the same thing. The policy block is the case's lesson in plain words:
which data may go where (`world.md` §2).

The rules, held by a test in both languages: the pages of the kind `talk` by the rule of
0017; a case's outcome is one line of at most 47 characters; a policy block has two to four
lines of at most 47 characters and no empty line; the notice is one line and fits the bar.

## Acceptance criteria

1. `CASES` holds the one case of the table; its source is a route of the floor that has
   lines, and its region has traces on the floor.
2. A case is ready exactly when the map has a trace of its region and all of them are found:
   with four of five found it is not, with five it is, and a region without traces is never
   ready.
3. The colleague of Sales says its everyday pages while the case is not ready, the source's
   answer while it is ready and not solved, and "Afterwards" once it is solved; the other
   three colleagues say their everyday pages in all three states.
4. The initial state has `solved` empty and survives a JSON round trip at the start and with
   the case solved.
5. With the case ready, a press next to the source opens its answer on page 0; a press turns
   to page 1; the press on page 1 closes the dialogue and solves the case: `solved` is
   `[{ region: 'sales', at }]` with that step's `tick`, and `overview` is
   `{ current: 6, max: 6 }` from `{ current: 5, max: 5 }`.
6. From `{ current: 2, max: 5 }` the solving step gives `{ current: 6, max: 6 }`.
7. The solving step changes nothing but `tick`, `held`, `dialogue`, `solved` and `overview`;
   600 steps with the answer open and every key but `talk` held solve nothing.
8. Closing the everyday saying or "Afterwards" solves nothing; a solved case is not solved
   again: `solved` and `overview` stay as they are.
9. The wake keeps `solved`.
10. The notice is `notice.case-solved` for 120 steps from the solving step and none after; a
    wall that holds comes before it, and it comes before a found trace.
11. `de` and `en` hold the six keys of the spec, each by its rule.
12. The cases tab draws the outcome of a solved case from (16, 60) under its name and its
    count, and no third line for a case that is not solved.
13. The policy tab draws the four lines of `policy.sales` from (16, 36) when Sales is solved,
    and its line for nothing otherwise; in English it draws the English lines.
14. A state in which no case is ready steps exactly as before this feature: the 600 recorded
    steps of 0020 give the same digest.

## Test plan

- **Unit, `game/cases`:** the table; criterion 2 on traces built in the test — none, four of
  five, five of five, and two regions of which one is ready; the saying of a route in the
  three states, and of a route that is no source.
- **Unit, `game/talk`:** criterion 3 through `speakersOf` on a fixture state; criterion 5
  step by step on the fixture below; criteria 6, 7 and 8; a held key turns one page and does
  not solve.
- **Unit, state:** the initial state; the round trips of criterion 4; the wake; the digest
  of criterion 14.
- **Unit, `game/notice`:** criterion 10 at 0, 119 and 120 steps; the three orders.
- **Unit, floor:** criterion 1 — the source's route among the floor's routes, the traces of
  its region.
- **Unit, text:** the six keys in both languages; their rules.
- **Unit, `draw-journal`:** criteria 12 and 13 in both languages; the creatures tab as in
  0020; a case that is not solved as in 0022.
- **Architecture, assets:** unchanged, now covering `src/game/cases.ts`.
- **Smoke:** after loading, `window.shadowAi.state.solved` is empty.
- **Fixtures:** `tests/fixtures/maps/case.tmj`, 20x12 on the tiles of `points.tmj`: the
  spawn, the route `person:sales` of two points with a pause of 600 on the first, and two
  rectangles `trace:sales`.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp, `E` or `Enter` talks, `J` opens and closes the journal, `L` switches the language.

**Steps:**

1. Walk right into the corridor and down it to the wide corridor at its end, right along
   that to the second doorway in its lower wall, and up the corridor that leads up above
   that doorway. Hold the lamp on the scrap that comes for the figure until it is gone, and
   on the violet strip in the doorway on the right until it is gone. Walk in and capture the
   two scraps in the room.
2. Expected: the top-left corner shows five hearts.
3. Walk to the colleague in the pink shirt and press `E`.
4. Expected: the first line is `Drei Angebote bis heute Abend, und jedes soll`.
5. Press `E`. Find four traces, each from below the chair of its desk: the first and the
   fourth desk of the first row, the third desk of the second row, the second desk of the
   third row. Walk to the colleague and press `E`.
6. Expected: the line is still `Drei Angebote bis heute Abend, und jedes soll`.
7. Press `E`. Find the fifth trace, on the fourth desk of the fourth row. Walk to the
   colleague and press `E`.
8. Expected: the two turn to each other, and the box shows three lines, the first
   `Das ist von meinem Bildschirm, ich weiß.`
9. Press the arrow keys and `J`, then `E`.
10. Expected: nothing happened before `E`; now the box shows two lines, the first
    `Wohin der Text damit geht, habe ich mir nicht`.
11. Press `E`.
12. Expected: the box is gone. The corner shows six hearts, all full. A line at the bottom
    says `Der Fall ist gelöst. Sieh ins Journal.` for about two seconds.
13. Press `J`, then the right arrow.
14. Expected: the tab `Fälle` shows three lines: `Vertrieb`, `Spuren: 5 von 5` and
    `Gelöst: Angebote gingen in einen Chatbot.`
15. Press the right arrow.
16. Expected: the tab `Richtlinie` shows four lines, the first
    `Jeder Text hat eine Stufe: offen, intern oder`. The line
    `Die Richtlinie ist noch leer.` is gone.
17. Press `L`.
18. Expected: the first line is `Every text has a level: open, internal or`.
19. Press `L`, then `J`. Press `E` next to the colleague in the pink shirt.
20. Expected: the first line is `Danke, dass du gefragt hast statt zu schimpfen.`
21. Press `E`, then `E` again next to the colleague.
22. Expected: the same line again, and the corner still shows six hearts.

**Feel:**

- The hero says nothing and shows nothing on screen; the colleague answers. Is it understood
  that the traces are what made the colleague speak?
- Does the answer sound like a person — tired, honest, not caught?
- Is the solving a moment — the hearts, the line — or does it pass unnoticed?
- Does the policy block read as something a colleague would accept, not as a slide?
- Must it be all five traces, or would the colleague speak earlier?

**Result:** passed 2026-11-18, steps 1–22. Feel: the author answered all five questions with
"pass" — the traces are understood to make the colleague speak, the answer sounds like a person,
the solving is a moment, the policy block reads as something a colleague would accept, and all
five traces stay.

## Open questions

None. Six were settled on 2026-11-18, each as drafted:

- The source: the colleague in the pink shirt, who walks between the cubicles and the coffee
  since 0015 and says since 0018 why the day is tight. No new figure.
- All five traces: the colleague answers only when every trace of Sales is found.
- The gesture: the talk itself is the gesture — no key, no screen, no picture. Picking a
  creature from the journal comes with the second species (M6).
- Overview: solving the case raises the maximum from five to six and fills it.
- The words: the source's answer, "Afterwards", the outcome, the policy block and the
  notice as in the table under "The text", in German and English.
- One feature: the talk that solves, the journal's two tabs and the overview are built
  together.
