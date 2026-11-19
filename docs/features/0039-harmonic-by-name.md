# 0039 — Harmonic by name

**Status:** draft
**Milestone:** M5
**Drafted:** 2026-11-19

## Goal

After the case of Sales is solved, the colleague who was its source says what the offers are
written in from now on: Harmonic. It is one line of a talk, and nothing else changes. The one
real product of the game is named where the game tells its message: the shadow gives way
where there is an approved way.

## Scope

Built on 0034 as merged. No map changes, no state, no drawing: two entries of the language
table get new words. It takes the place of 0035, the Harmonic station, which was rejected in
its walk.

**In:**

- The words of `talk.sales-after`, in German and English.
- A test that holds the name to this one line.
- With the implementation: `gameplay.md` §6; `testing.md` §2; the README.

**Out, explicitly:** anything in the world that carries the name — a desk, a plate, a carpet
(0035, rejected) · any effect on the play (`vision.md` §10) · a line that recommends
Harmonic, says what it costs or where to get it (`vision.md` §6) · LMIS in a talk — LMIS
presents the game on its card (0036) and no figure names it (`vision.md` §10) · a second
line that names Harmonic, in Marketing or in Support — a number in the budget first
(`docs/plan.md` §3) · a third page of the answer, so that the line comes within the talk that
solves the case (see the open questions) · the name in the journal: the outcome and the
policy block of Sales stay as they are · sound.

## Behaviour

Refines `vision.md` §10 and the case of Sales (`gameplay.md` §6, feature 0024).

### The line

The source of Sales says the page `talk.sales-after` in every talk after its case is solved
(0024). The rule stays; the page gets new words. Its first line stays as it is. The second
and third no longer ask what to use next time: they say it.

| Key | `de` | `en` |
|---|---|---|
| `talk.sales-after` | `Danke, dass du gefragt hast statt zu schimpfen.` / `Die Angebote schreibe ich jetzt in Harmonic.` / `Das ist freigegeben.` | `Thanks for asking instead of telling me off.` / `I write the offers in Harmonic now.` / `That one is approved.` |

The page has three lines, and none is longer than the 47 characters a line of the dialogue
box holds: 47, 44 and 20 in German, 44, 35 and 21 in English.

The colleague states a fact about their own work. The line does not say that Harmonic is
good, what it costs or where it comes from, and the hero says nothing, as ever.

### Where the name is not

Before the case of Sales is solved no text of the game shows the name: the everyday line and
the two pages of the answer stay as they are. No other key of the language table holds it,
in either language. No table of the world data — the cast, the cases, the hints, the regions,
the species — holds the name Harmonic or the name LMIS.

Nothing in `src/game/` and nothing in `src/render/` changes: the case of Sales names the same
key as before.

## Acceptance criteria

1. `talk.sales-after` reads, in German, `Danke, dass du gefragt hast statt zu schimpfen.`,
   `Die Angebote schreibe ich jetzt in Harmonic.` and `Das ist freigegeben.`, and in English
   `Thanks for asking instead of telling me off.`, `I write the offers in Harmonic now.` and
   `That one is approved.` — three lines each.
2. No line of the page is longer than 47 characters, in either language.
3. No other key of either table holds `harmonic`, in any case of letters.
4. No table of the world data holds `harmonic` or `lmis`, in any case of letters.
5. After the case of Sales is solved, a talk with its source has exactly one page, the one of
   criterion 1; before it is solved, no page the source says holds the name.
6. No file of `src/game/` and `src/render/` changes: the 600 recorded steps of 0020 give the
   same digest.

## Test plan

- **Unit, text:** criterion 1 line by line in both languages — the test of 0024 for this key
  gets the new words; criterion 2; criterion 3 over every key of both tables.
- **Unit, world data:** criterion 4 over the tables of `src/game/`.
- **Unit, cases:** criterion 5 — the tests of 0024 pass unchanged, and one new test reads the
  pages before and after the case for the name.
- **Unit, state:** the digest of criterion 6, unchanged.
- **Architecture, assets, smoke:** unchanged.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the call (0026) is read and the lamp fetched. Arrow keys or WASD walk,
`Space` holds the lamp, `E` or `Enter` talks, `J` opens and closes the journal, `L` switches
the language.

**Steps:**

1. Walk to Sales, hold the lamp on the scrap of paper in front of its doorway until it is
   gone, lift the violet strip and walk in. Talk to the colleague in the pink shirt.
2. Expected: the colleague says the everyday line about three offers and coffee. The word
   `Harmonic` is not in it.
3. Find the five traces on the screens of the room with the lamp. Talk to the colleague in
   the pink shirt again and read both pages to the end.
4. Expected: neither page says `Harmonic`. After the second the line at the bottom says the
   case is solved, and the room is in its colours.
5. Talk to the colleague once more.
6. Expected: the box says `Danke, dass du gefragt hast statt zu schimpfen.`, then
   `Die Angebote schreibe ich jetzt in Harmonic.`, then `Das ist freigegeben.` — three
   lines on one page.
7. Close the box with `E` and talk to the colleague again.
8. Expected: the same three lines.
9. Close the box, press `L` and talk to the colleague again.
10. Expected: `Thanks for asking instead of telling me off.`, then
    `I write the offers in Harmonic now.`, then `That one is approved.`
11. Close the box and press `L`. Press `J` and look at every tab with the arrow keys.
12. Expected: no tab says `Harmonic`.

**Feel:**

- Does the line sound like something a colleague says — or like advertising?
- Does it answer the case, or does the name come out of nowhere?
- Would you have talked to the colleague again after the case without being told to?
- Is once enough?

**Result:** not yet walked.

## Open questions

Four, each with the answer the draft is written for:

- **The words.** As in the table. The author knows the product: is "writing offers in
  Harmonic" something a colleague in Sales would do with it?
- **The place.** The line after the case, which only a player reads who talks to the
  colleague again. The other place is a third page of the answer, which every player reads
  who solves the case; it would have the colleague name the tool while the case is not solved
  yet, and it changes a talk that is built and walked (0024). Drafted for the line after.
- **How many.** One line, in Sales. A line in another department is a number in the budget
  first.
- **The order.** 0039 first, then 0036, 0037 and 0038. Without an object of 0035 in the map,
  the ids of 0037 are 133 to 137 and those of 0038 are 138 to 140.

Settled on 2026-11-19: no carpets and nothing else in the world carries a name; LMIS stands
only on its card (0036) and in no talk.

Who checks stays as settled for 0035: whether the advertising is recognizable enough, and how
the licences leave out the two names (`vision.md` §9 and §10), is checked by a competent
person before the address of 0030 is announced to anybody outside. It is a condition of
announcing, not of merging this feature.
