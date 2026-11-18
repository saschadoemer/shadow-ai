# 0031 — The help label

**Status:** draft
**Milestone:** M5
**Drafted:** 2026-11-18

## Goal

The player sees at any moment which key opens the help: a small label in the top right corner
of the screen says `H Hilfe`. The line that named the key in the bar at the bottom for ten
seconds is gone.

The feature comes from the author's note of 2026-11-18, after 0021 and 0026 were walked: the
line at the start is on screen too long, and what is wanted is a pointer to the help that
stays and is less conspicuous. The walk of 0021 had answered "ten seconds are right, and it
does not need to come back"; this spec replaces that answer.

## Scope

Built on 0026 as merged: the game opens with the call, and the start hint counts from
`GameState.started`. No tile changes, no map changes, no new sprite, no new colour.

**In:**

- The label: the key `help.label` in a framed field in the top right corner, drawn in every
  frame in which the scene draws the world.
- `src/render/draw-help.ts` gets the label's numbers and `drawHelpLabel`; the scene draws it
  after the hearts.
- The start hint goes: the key `notice.help`, and `HELP_HINT`, `HELP_HINT_STEPS`,
  `helpHintDue` and `startHintDue` in `src/game/help.ts`.
- `GameState.started` goes. 0026 added it for the start hint alone, and nothing else reads
  it.
- The language table loses one key and gets one, in German and English.
- With the implementation: `gameplay.md` §8; `vision.md` §2; `visual.md` §3;
  `architecture.md` §1, §2, §5 and §8; `testing.md` §1; the README.
- With the approval: `docs/plan.md` §4 names 0031 as the seventh feature of M5. The content
  budget of `docs/plan.md` §3 is not touched.

**Out, explicitly:** a label that shrinks, fades or leaves after a time — the point of this
feature is that nothing about the pointer is timed · a picture of a key or a question mark
in place of the words; that would be a new sprite, and the words name the key by themselves ·
a second colour of the font, so that the label could do without its field · the label on the
journal's screen — the journal's third tab has that corner · labels for other keys: the
lamp's key keeps its notice of 0026, and the journal's key stays in the help · opening the
help with a click on the label (0021 has no click either) · a setting that hides the label ·
any change to the help's box, its rows or its key · the title screen and what it shows of the
keys (M8); it decides then whether the label stays · the hint that comes back for the next
visitor at a booth, which 0021 left for later: the label is there for every visitor, so
nothing has to come back.

## Behaviour

Refines `gameplay.md` §8, `vision.md` §2, `visual.md` §3 and `architecture.md` §2, §5 and §8.

### What this settles in the specification

1. **`vision.md` §2 names "one line at the start that names its key".** The sentence becomes:
   *"The help (feature 0021) is not tutorial text: a list of keys the player calls up, and a
   small label in a corner of the screen that names its key (feature 0031)."* The label says
   which key, and nothing about why, so the game still has no tutorial text.
2. **`gameplay.md` §8, as built by 0021 and 0026, describes the ten seconds.** The paragraph
   of 0021 loses its sentences on the line, from "For the first ten seconds" to "hide the
   line.", and §8 gets: *"**As built** (feature 0031): a small label in the top right corner
   names the key of the help for as long as the world is on screen — `H Hilfe` or `H Help` —
   also during a dialogue and with the help open. The journal's screen does not have it. The
   line that named the key at the start is gone."*
3. **`visual.md` §3 says "Two things are drawn over the world".** It becomes three: the
   hearts, the help label, and the notice. The sentence on the start hint in the bar goes,
   and the paragraph gets the label's numbers from "Drawing" below.
4. **`architecture.md` §2 holds `GameState.started`.** The field goes, with the sentences
   that describe it. The state then has nothing that only a hint read. No save state exists
   yet (M8), so no stored state loses a field.

### The text

| Key | `de` | `en` |
|---|---|---|
| `help.label` | `H Hilfe` | `H Help` |

`notice.help` is removed from both languages. The rule, held by a test in both languages: a
key of the form `help.label` is one line of at most 8 characters. The label names the key
first and the thing second, as the rows of the help do.

### Drawing

`src/render/draw-help.ts` draws the label in the language of the scene's settings (0019), on
the surface and not shifted by the camera. With n the number of characters of `help.label`
in that language:

1. the frame: the rectangle (311 − 6n, 4, 6n + 5, 14) in `#3a4466`;
2. the field: the rectangle (312 − 6n, 5, 6n + 3, 12) in `#181425`, so that 1 px of the
   frame is left on every side;
3. the text from (314 − 6n, 6).

| | n | frame | field | text from |
|---|---|---|---|---|
| `de` | 7 | (269, 4, 47, 14) | (270, 5, 45, 12) | (272, 6) |
| `en` | 6 | (275, 4, 41, 14) | (276, 5, 39, 12) | (278, 6) |

The frame's right edge is 4 px from the surface's right edge in both languages and its top
edge 4 px from the top, as the hearts are 4 px from their corner. 2 px of the field lie left
and right of the letters. A capital begins 2 px below the field's upper edge, and the
descender of `p` ends 1 px above its lower edge. The colours are those of the help's box, so
the label looks like the thing it opens.

The label is 47x14 in German: about an eighth of the bar's 304x18. It keeps clear of
everything else on the surface: seven hearts (0028) end at x = 71, and a label of 8
characters begins at x = 263; the help's box begins at y = 30, and the label ends at y = 17;
the dialogue box begins at y = 134.

### When it is drawn

In every frame in which the scene draws the world — that is, whenever the journal is not
open — directly after the hearts and before the dialogue box, the bar and the help's box.
Nothing else decides it: not `tick`, not the lamp, not a dialogue, not a notice, not the
help, not the dark. So the label is there from the first frame, under the call of 0026; it
stays while the help is open, where the last row of the box says what `H` does now; and the
lids of the dark close over it as over everything.

On the journal's screen the scene draws no label, also with the help open over the journal.
The journal is drawn instead of the world (`gameplay.md` §7), and its third tab, (212, 6,
100, 16), has that corner. `H` opens the help there as before.

When the language is switched, the label is drawn in the new language from the next frame.
Its right edge stays; its left edge moves by 6 px.

### What goes

- **The start hint.** `quietLine` names the language line when it is due and nothing
  otherwise; with the help open it names nothing, as before. The bar's order is: the
  dialogue box, then the notice, then the language line.
- **`game/help`** keeps `openHelp` and `stepHelp` and loses `HELP_HINT`, `HELP_HINT_STEPS`,
  `helpHintDue` and `startHintDue`.
- **`GameState.started`.** `createInitialState` and `newGame` have no such field; the step
  that closes the call changes `tick`, `held` and `dialogue` and nothing else; the wake of
  0009 has nothing to keep. `newGame` differs from `createInitialState` in the lamp and the
  open call only.

Nothing of the game reads the label: it is not in the state, and `src/game/` does not know
it. The step of a game is the same as before but for the missing field.

### Edge cases

- **The call.** The label is on screen while the call is open, and `H` opens the help over
  it (0021). A player who reads the three pages has seen the label before the first step.
- **A notice or a dialogue.** Both are at the bottom; the label stays where it is.
- **The dark.** The upper lid covers the label from the sixth step of the dark and uncovers
  it at the end; `H` does nothing in the dark (0021), and the label does not say otherwise
  for longer than the lids take.
- **Before the content has loaded** nothing is drawn, and no label either.
- **A string longer than 8 characters** fails the rule's test; the drawing has no case for
  it.

### For the smoke test

`window.shadowAi` is unchanged. The test of the opening no longer reads `state.started`: a
new game has the call on page 0 and no lamp, and after three presses of `E` no dialogue.

## Acceptance criteria

1. `de` and `en` hold `help.label` as `H Hilfe` and `H Help`, and neither holds
   `notice.help`. Every key of the form `help.label` is one line of at most 8 characters in
   both languages.
2. The frame of a label of n characters is (311 − 6n, 4, 6n + 5, 14), its field
   (312 − 6n, 5, 6n + 3, 12) and its text origin (314 − 6n, 6), for n = 1, 6, 7 and 8.
3. With the world on screen and five hearts, the scene draws after the last heart, in this
   order: the frame (269, 4, 47, 14) in `#3a4466`, the field (270, 5, 45, 12) in `#181425`,
   and six glyphs, the first — `H` — at (272, 6) and the last — `e` — at (308, 6). With the
   settings' language `en`: the frame (275, 4, 41, 14), the field (276, 5, 39, 12), and five
   glyphs, the first at (278, 6) and the last — `p` — at (308, 6).
4. The calls of criterion 3 are the same at `tick` 0, 599, 600 and 100000; with the camera at
   (0, 0) and at (48, 32); in the state of `newGame`, with the call open; with a dialogue
   open; with a notice showing; with the language line due; with the help open; and with
   `dark` 30.
5. With a dialogue open, the label's calls come before the dialogue box; with a notice
   showing, before the bar; with the help open, before the help's frame; with `dark` 30,
   before the lids.
6. With the journal open, with and without the help over it, the scene draws none of the
   calls of criterion 3.
7. With no dialogue open, no notice showing and the language line not due, the scene draws
   no bar and no glyph but the label's — at `tick` 0, 100 and 599, in the state of
   `createInitialState` and in a state of `newGame` after the call is closed.
8. For 120 steps after a switch of the language the bar holds the language line, and from
   the 121st the bar is not drawn, at any `tick`.
9. The states of `createInitialState` and of `newGame` have no field `started` and survive a
   JSON round trip. The step that closes the call changes `tick`, `held` and `dialogue` and
   nothing else.
10. `game/help` exports `openHelp` and `stepHelp` and nothing of the hint; criteria 2 to 7 of
    0021 hold as before.
11. The player, the creatures, the movers, the walls, the dialogue and the journal of 600
    recorded steps are the same as before this feature.

## Test plan

- **Unit, text:** criterion 1 — the key in both languages, the absence of `notice.help`, and
  the rule of the form `help.label` beside the two rules of 0021.
- **Unit, `draw-help`:** criteria 2 and 3 — the three numbers for the four lengths; the two
  rectangles, their colours and the glyphs of the label in German and in English.
- **Unit, scene:** criteria 4 to 8. The tests of 0021 and 0026 on the start hint go; the
  tests of 0019 on the language line expect an empty bar again where they expected the hint.
  The scene tests of the earlier features compare whole lists of calls and keep their
  lists: one helper of the test file takes the label's calls out of a recorded list, and a
  test of this feature holds the helper to the calls of criterion 3.
- **Unit, `game/help`:** the tests on the hint and on the hint after the call go; the tests
  on opening, closing and stepping stay.
- **Unit, state and opening:** criteria 9 and 11 — the two initial states, the round trips,
  the closing step of the call, the 600 steps against the recording. The fixtures of the
  other test files lose their `started`.
- **Architecture, assets:** unchanged.
- **Smoke:** the test of the opening without `started`, as under "For the smoke test".
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. Arrow keys or
WASD walk, `E` or `Enter` talks, `J` opens and closes the journal, `L` switches the language,
`H` opens and closes the help. The walk begins with a reload.

**Steps:**

1. Reload the page and press no key.
2. Expected: the box of the call is at the bottom of the screen. In the top right corner is
   a small dark label with a thin lighter frame that says `H Hilfe`. The hearts are in the
   top left corner.
3. Press `E` three times.
4. Expected: the box is gone and no bar is at the bottom of the screen. The label is where
   it was.
5. Wait twenty seconds without pressing a key.
6. Expected: no bar appeared at the bottom of the screen in that time. The label has not
   changed.
7. Walk right into the corridor and along it for five seconds.
8. Expected: the floor moves and the label stays in its corner. `H Hilfe` can be read over
   every floor it passes.
9. Press `L`.
10. Expected: the label says `H Help` and is a little narrower; its right edge has not
    moved. A bar at the bottom says `Language: English` for about two seconds and is then
    gone.
11. Press `H`.
12. Expected: the help's box lies over the middle of the floor. The label is still in its
    corner, and the two do not touch.
13. Press `H`, then `L`.
14. Expected: the box is gone and the label says `H Hilfe` again. A bar at the bottom says
    `Sprache: Deutsch` for about two seconds and is then gone.
15. Press `J`.
16. Expected: the journal with its three tabs. There is no label on this screen.
17. Press `H`.
18. Expected: the help's box lies over the journal, below the tabs. There is still no label.
19. Press `H`, then `J`.
20. Expected: the floor is back, and the label is in its corner.

**Feel:**

- Is the label quiet enough — do you forget it while you play, and find it when you look for
  it?
- Did you see it at the start without looking for it? Do you miss the line at the bottom?
- Do the words say "press H for help" — `H Hilfe`, `H Help` — or do they need a colon?
- Are the frame, the size and the corner right?
- The label stays while the help is open and during a dialogue. Right?
- The journal's screen has no label. Right?

**Result:** not yet walked.

## Open questions

Five, each with the answer this draft is written to:

1. **The words.** `H Hilfe` and `H Help`, the key first and no colon — or `H: Hilfe`, or
   `Hilfe: H`? Drafted: `H Hilfe`.
2. **The look.** A field in `#181425` with a frame of 1 px in `#3a4466`, 47x14, 4 px from
   the top right corner — or the field without a frame, as the notice's bar has none?
   Drafted: with the frame, as the help's box.
3. **Where it shows.** Whenever the world is on screen, also during a dialogue, with the
   help open and under the call; not on the journal's screen. Drafted so.
4. **The start hint.** It goes entirely, and `notice.help` and `GameState.started` go with
   it — or a shorter line stays at the start beside the label? Drafted: it goes.
5. **The milestone and the order.** M5, as its seventh feature, built after 0027 has merged
   — 0027 adds a field to the state while this feature takes one away, so one after the
   other spares a conflict. Drafted so.
