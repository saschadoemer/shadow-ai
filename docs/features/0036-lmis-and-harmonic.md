# 0036 — LMIS and Harmonic

**Status:** approved 2026-11-19
**Milestone:** M5
**Drafted:** 2026-11-19

First approved on 2026-11-19 as *LMIS presents*, with the card alone. The three lines that
name Harmonic were added the same day, in place of the rejected station (0035), and the
whole was approved again.

## Goal

The game says who presents it before it begins, and it names the one real product in three
talks. A dark card with two lines — `LMIS präsentiert` and the title — is the first thing a
player sees; after three seconds, or at a press of `E` or `Enter`, the call follows. In the
game three voices say, each once, what Harmonic would have shown: the data protection
officer, the colleague of Sales and the management. Nothing in the play changes.

## Scope

Built on 0034 as merged. No map changes, no new sprite.

**In:**

- The card: what it shows, how long, and what ends it.
- `GameState.presented`: the step in which the card ended.
- The three lines: a third page of the data protection officer, new words for the page of
  the source of Sales after its case, new words for the second page of the close.
- The language table gets three keys, and two keys get new words, in German and English.
- With the implementation: `vision.md` §10; `gameplay.md` §6 and §8; `world.md` §3;
  `architecture.md` §2, §3 and §5; `visual.md` §3; `testing.md` §2; the README.

**Out, explicitly:** the title screen with its menu, the language choice and a start button
(M8) — the card is its stand-in and goes when it comes · a logo of LMIS or of anything
(`vision.md` §10: a name, never a logo) · a line about Harmonic on the card · credits, an
imprint, a privacy note or a licence text (M8, with the first public release) · LMIS
anywhere in the world of the game, and LMIS in a talk (`vision.md` §10) · anything in the
world that carries the name Harmonic — a desk, a plate, a carpet (0035, rejected) · any
effect of Harmonic on the play (`vision.md` §10) · a line that says Harmonic is good, tells
the player to get it, says what it costs or where to get it (`vision.md` §6) · a fourth line
that names it — the source of Marketing, the intern: a number in the budget first
(`docs/plan.md` §3) · the name in the journal: outcomes and policy blocks stay as they are ·
sound.

## Behaviour

Refines `vision.md` §10, which leaves the place of the presenter's line and the words of
the three voices to this feature, and `gameplay.md` §6 and §8.

### The card

A new game starts with the card. While it is shown, the scene draws nothing of the world:
the surface is cleared to the page background `#181425`, and two lines are drawn in the
game's font, each centred on the 320 px of the surface:

| Line | Key | `de` | `en` | y |
|---|---|---|---|---|
| The presenter | `card.presents` | `LMIS präsentiert` | `LMIS presents` | 74 |
| The title | `card.title` | `Shadow AI` | `Shadow AI` | 94 |

A line of n characters starts at x = 160 − 3n: the presenter's line at 112 in German and at
121 in English, the title at 133. Nothing else is on the card: no hearts, no label of the
help, no notice.

### How it ends

The card ends in the step in which `talk` is pressed, or in the step with which it has been
shown for `CARD_STEPS`, 180 steps — three seconds, *tune* — whichever comes first. That
step sets `presented` to its own `tick`; from the next frame the scene draws the world with
the call open on its first page, as a new game began before this feature.

While the card is shown a step does nothing else: `tick` grows, the input is remembered,
and nothing of the world is stepped. The help, the journal and the lamp do nothing. The
press that ends the card does not turn the page of the call: a held key is no second press
(0020). `L` switches the language on the card as everywhere (0019).

The card is shown once per game. The wake keeps `presented`. A page that is loaded anew
starts with the card again, as it starts with the call.

### The state

`GameState.presented` is the `tick` of the step in which the card ended, or `null` while it
is shown. `newGame` starts with `null`. `createInitialState`, the game past its opening
(0026), starts with 0: the tests of the earlier features never see the card.

### The three lines

Harmonic is a monitoring product: it shows a company which AI tools are used in it and where
data leaves it (`vision.md` §10). Three voices say what it would have shown. Each says it
once, in hindsight or as a wish, and none says the product is good.

| Who | Key | When |
|---|---|---|
| The data protection officer | `talk.officer-rules-3`, new | the third page of her own talk |
| The source of Sales | `talk.sales-after`, new words | the page after its case (0024) |
| The management | `story.close-2`, new words | the second page of the close (0034) |

**The data protection officer.** Her own talk gets a third page: `talk.officer-rules-1`,
`talk.officer-rules-2`, `talk.officer-rules-3`. The first meeting (0026) keeps its two
pages, and neither holds the name: she names Harmonic only once the lamp is handed over,
because the line compares the two.

**The source of Sales.** The page after the case keeps its first line. The second and third
no longer ask what to use next time: they answer the second page of the answer, `Wohin der
Text damit geht, habe ich mir nicht überlegt.`

**The management.** The close keeps its three pages and its rule (0034). On the second page
the managing director still says `Gut.`, and then the line; the page still ends with the
shadow over the other doors.

| Key | `de` | `en` |
|---|---|---|
| `talk.officer-rules-3` | `Die Lampe hast nur du. Etwas wie Harmonic` / `würde dem Haus zeigen, welche KI hier läuft` / `und wohin die Daten gehen.` | `Only you have the lamp. Something like Harmonic` / `would show the house which AI runs here` / `and where the data goes.` |
| `talk.sales-after` | `Danke, dass du gefragt hast statt zu schimpfen.` / `Hätte mir etwas wie Harmonic vorher gezeigt,` / `wohin der Text geht – ich hätte es gelassen.` | `Thanks for asking instead of telling me off.` / `Had something like Harmonic shown me where` / `the text goes, I would have left it.` |
| `story.close-2` | `Die Geschäftsführung ruft an: „Gut. Mit` / `Harmonic hätten wir es vor dem Kunden gesehen.“` / `Über den anderen Türen liegt der Schatten noch.` | `The managing director calls: “Good. With` / `Harmonic we would have seen it before the` / `customer did.” Other doors are still in shadow.` |

Every page has three lines, and no line is longer than the 47 characters a line of the
dialogue box holds.

No line is about finding out a person or about consequences for one: each is about seeing.
No other text of the game holds the name Harmonic, and no table of the world data — the
cast, the cases, the hints, the regions, the species — holds either name.

Nothing else changes: the case of Sales and the close name the same keys as before, and the
only change in `src/game/` besides the card is the third key in the officer's pages.

## Acceptance criteria

1. A new game has `presented` `null`; the game past its opening has 0. The state survives a
   JSON round trip with the card shown and after it.
2. While `presented` is `null` the scene draws exactly: the clear to `#181425`, the
   presenter's line from (112, 74) in German and from (121, 74) in English, and the title
   from (133, 94) — no tile, no figure, no heart, no box.
3. Without a press, the steps 1 to 179 leave `presented` `null` and change nothing but
   `tick` and `held`; step 180 sets `presented` to 180.
4. A press of `talk` in step n, below 180, sets `presented` to n.
5. The step after the card draws the world with the call on page 0; the press that ended
   the card, still held, does not turn it; a new press does.
6. While the card is shown, `help`, `journal`, `lamp` and the four directions change nothing
   but `held`.
7. The wake keeps `presented`, and the card never comes back in a game.
8. `de` and `en` hold the two keys of the spec; each is one line that fits the surface.
9. No other text of the game holds the name LMIS, and no figure, region or company of the
   world data does.
10. A game past its opening steps and is drawn exactly as before: the 600 recorded steps of
    0020 give the same digest, and the tests of 0026 pass with `presented` 0.
11. `talk.officer-rules-3`, `talk.sales-after` and `story.close-2` read as in the table of
    the spec, line by line, in both languages; each has three lines and none is longer than
    47 characters.
12. The data protection officer's own talk has the three pages `talk.officer-rules-1`,
    `talk.officer-rules-2`, `talk.officer-rules-3`, in this order; the first meeting has its
    two pages as before, and neither holds the name Harmonic.
13. After the case of Sales is solved, a talk with its source has exactly one page,
    `talk.sales-after`; before, no page the source says holds the name.
14. The close has its three pages as before, and its second is `story.close-2`.
15. No key of either table but these three holds `harmonic`, in any case of letters.
16. No table of the world data holds `harmonic` or `lmis`, in any case of letters.

## Test plan

- **Unit, state:** criterion 1; criteria 3 to 6 through `update` from `newGame`; the wake;
  the digest of criterion 10.
- **Unit, scene:** criterion 2 in both languages, and the frame after the card.
- **Unit, text:** the two keys of the card; the centring for both languages; a test that no
  other key of either table contains the name LMIS — criterion 9; criterion 11 line by line —
  the tests of 0024 and 0034 for the two keys get the new words; criterion 15 over every key
  of both tables.
- **Unit, opening (0026):** its tests start past the card and pass unchanged; one new test
  plays card, call and first meeting in a row; the first meeting has its two pages.
- **Unit, cast and talk:** criterion 12 — a talk with the officer after the lamp is handed
  over turns three pages.
- **Unit, cases and story:** criteria 13 and 14 — the tests of 0024 and 0034 pass unchanged.
- **Unit, world data:** criterion 16 over the tables of `src/game/`.
- **Architecture, assets:** unchanged.
- **Smoke:** the page opens with `presented` `null` and no dialogue drawn; after a press of
  `E` the call is open. The helper that starts a game for the other smoke tests presses `E`
  once more.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The page
is not loaded yet. Arrow keys or WASD walk, `Space` holds the lamp, `E` or `Enter` talks,
`J` opens and closes the journal, `L` switches the language. The walk solves both cases and
takes about twenty minutes.

**Steps:**

1. Load the page and press nothing.
2. Expected: a dark screen with two lines in its middle: `LMIS präsentiert` and, below it,
   `Shadow AI`. Nothing else is on it.
3. Wait.
4. Expected: after about three seconds the reception is there, with the box of the call
   open: `Montagmorgen. Das Telefon – ein Kunde:`
5. Reload the page and press `E` as soon as the two lines are there.
6. Expected: the reception and the call are there at once, on the first page of the call.
7. Reload the page and press `L` as soon as the two lines are there.
8. Expected: the first line reads `LMIS presents`.
9. Press `L` to switch back, and read the call to its end with `E`. Walk to the data
   protection officer next door, talk to her and read to the end.
10. Expected: two pages, the second begins `Nimm die Lampe:`. Neither says `Harmonic`.
11. Talk to her again and read to the end.
12. Expected: three pages. The third reads `Die Lampe hast nur du. Etwas wie Harmonic`,
    `würde dem Haus zeigen, welche KI hier läuft`, `und wohin die Daten gehen.`
13. Press `L`, talk to her again and read to the third page.
14. Expected: `Only you have the lamp. Something like Harmonic`, `would show the house
    which AI runs here`, `and where the data goes.`
15. Close the box and press `L`. Solve the case of Sales: find its five traces and talk to
    the colleague in the pink shirt to the end of both pages.
16. Expected: neither page says `Harmonic`; the line at the bottom says the case is solved.
17. Talk to the colleague in the pink shirt again.
18. Expected: one page: `Danke, dass du gefragt hast statt zu schimpfen.`, `Hätte mir etwas
    wie Harmonic vorher gezeigt,`, `wohin der Text geht – ich hätte es gelassen.`
19. Solve the case of Marketing: find its five traces and talk to the colleague in the red
    shirt to the end of both pages. Then stand still and wait.
20. Expected: after about five seconds a box opens by itself: `Abend. Auf der Etage ist es
    ruhiger geworden.`
21. Press `E`.
22. Expected: the second page reads `Die Geschäftsführung ruft an: „Gut. Mit`, `Harmonic
    hätten wir es vor dem Kunden gesehen.“`, `Über den anderen Türen liegt der Schatten
    noch.`
23. Press `E` twice. Press `J` and look at every tab with the arrow keys.
24. Expected: no tab says `Harmonic` or `LMIS`.

**Feel:**

- Three seconds: long enough to read, short enough not to wait?
- Does the card read as a frame round the game — or as an advertisement before it?
- Is the step from the card to the call too hard a cut?
- Do the three lines sound like the people who say them — or like advertising?
- Does the comparison with the lamp land?
- The management's line is nearly the last word of the game. Too much there?
- Three times: right, too few, too many?

**Result:** not yet walked.

## Open questions

None. Five were settled on 2026-11-19 for the three lines, each as drafted:

- **The words of the three lines.** As in the table. Each says something about what the
  product does: it shows the house which AI runs in it and where the data goes; it would
  have shown the outflow before the customer saw it; it can show a colleague beforehand
  where a text goes. The author knows the product and confirmed each.
- **The places.** The data protection officer, the source of Sales after its case, the
  management in the close. Not the source of Marketing and not the intern.
- **The rule.** `CLAUDE.md` §2 and `vision.md` §6 said that no figure recommends Harmonic.
  They now say that a figure may say what Harmonic would have shown, in hindsight or as a
  wish, and that nobody says it is good, tells the player to get it, says what it costs or
  where to get it.
- **One feature, one long walk.** The line of the close is reached only with both cases
  solved, so the walk takes about twenty minutes. It stays one feature.
- **The order.** 0036, then 0037 and 0038. Without an object of 0035 in the map, the ids of
  0037 are 133 to 137 and those of 0038 are 138 to 140.

Settled on 2026-11-19 for the card, each as drafted:

- The place: a card before the call, on an empty screen, the stand-in for the title screen
  of M8.
- The words: `LMIS präsentiert` / `LMIS presents` over the title `Shadow AI`.
- How it ends: after three seconds by itself, or at a press of `E` or `Enter`.
- No line about Harmonic on the card. Whether the presenter's line is enough is for the
  person who checks the release (`vision.md` §10); a line is added if that person asks for
  it.
- The milestone: M5, built now.

Settled on 2026-11-19 for the names: Harmonic acts on nothing and stands on nothing in the
world; LMIS is on the card and in no talk.

Who checks: whether the advertising is recognizable enough, whether the lines say only what
the product does, and how the licences leave out the two names (`vision.md` §9 and §10), is
checked by a competent person before the address of 0030 is announced to anybody outside.
It is a condition of announcing, not of merging this feature.
