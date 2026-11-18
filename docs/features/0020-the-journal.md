# 0020 — The journal

**Status:** implemented 2026-11-18
**Milestone:** M4
**Drafted:** 2026-11-17

## Goal

The player can open the journal: one screen with three tabs — creatures, cases, policy. The
game stands still while it is open. A captured snippet has its entry under the creatures: its
picture, its name, and four lines on what it is, what it lives on and what makes it go. The
other two tabs say that they are still empty.

## Scope

Built on 0019 as merged, which contains 0018. No tile changes, no map changes, no new sprite.

**In:**

- The action `journal`, on `J`, and its press. The state remembers the whole input of the
  last step: `GameState.held` replaces `GameState.talkHeld`.
- `src/game/journal.ts`: the tabs, the entries, opening, turning tabs and closing; and
  `GameState.journal`.
- While the journal is open, nothing in the world is stepped.
- `src/render/draw-journal.ts`: the screen. The scene draws it instead of the world.
- The creatures tab with the snippet's entry once a snippet is captured; one line each for a
  tab that has nothing.
- The language table gets eight keys in German and English; the snippet's displayed name and
  its journal text are fixed.
- With the implementation: `gameplay.md` §7 and §8; `world.md` §4; `architecture.md` §1, §2,
  §4, §5 and §8; `visual.md` §3; `testing.md` §2; the README.

**Out, explicitly:** the cases tab's content — traces found, people spoken to, the source,
the outcome (M5) · the policy tab's building blocks (M5) · the trace gesture that picks from
the creatures tab (M5) · how many of a species were captured — the game has no way to draw a
number yet; it comes with the cases tab, where a count is needed first · pages within a tab —
two entries fit the screen, the third species brings the pages (M6) · a larger picture than
the creature's own sprite (art pass) · a hint that names the keys · opening the journal with
a click · sound.

## Behaviour

Refines `gameplay.md` §7 and §8, `world.md` §4, `architecture.md` §2, §4, §5 and §8 and
`visual.md` §3.

### The action and the presses

The input table of `main.ts` gets `journal` ← `KeyJ`, and the game's input the boolean
`journal`. The game now has seven actions.

The journal needs presses of three actions: `journal` opens and closes it, `left` and `right`
turn its tabs. So the state no longer remembers one key but the whole input:
`GameState.held` is the input of the last step, every action false at the start, and
`GameState.talkHeld` is gone. An action is **pressed** in a step when the input holds it and
`held` does not. Every step sets `held` from its input — a step of the dark, of a dialogue
and of the journal too. `talk` is pressed exactly when it was in 0017.

### The journal's data

`src/game/journal.ts` holds what the journal shows, as data:

- `JOURNAL_TABS`: `creatures`, `cases`, `policy`, in this order.
- Per tab its title and the line it shows while it has nothing:

  | Tab | Title | Nothing yet |
  |---|---|---|
  | `creatures` | `journal.tab-creatures` | `journal.no-creatures` |
  | `cases` | `journal.tab-cases` | `journal.no-cases` |
  | `policy` | `journal.tab-policy` | `journal.no-policy` |

- Per species its entry: the name and the text. One species exists:

  | Species | Name | Text |
  |---|---|---|
  | `snippet` | `creature.snippet-name` | `creature.snippet-text` |

The **entries** of the creatures tab are the species of which at least one was captured, in
the order of `SPECIES`. They are derived from `GameState.captured` in every frame; the state
has no field for them. The cases tab and the policy tab have no entries in this feature.

### Opening, turning, closing

`GameState.journal` is `null`, or `{ tab }` with one of the three tabs. In a step that is not
a step of the dark:

1. **The journal is open.** `tick` grows by 1 and `held` is set; nothing else is stepped —
   not the player, the lamp, the creatures, the movers, the walls or a figure. When `journal`
   is pressed, `journal` becomes `null`. Otherwise, when `right` is pressed and `left` is
   not, the tab becomes the next one; on `policy` it stays. When `left` is pressed and
   `right` is not, the tab becomes the one before; on `creatures` it stays. The other keys
   do nothing.
2. **A dialogue is open.** The step is the dialogue's, as in 0017 and 0018; `journal` does
   nothing.
3. **Neither is open, and `journal` is pressed.** `journal` becomes `{ tab: 'creatures' }`,
   whatever else the input holds. `tick` grows by 1, `held` is set, and nothing else is
   stepped in this step.
4. **Otherwise** the step is the one of 0018.

In the dark `journal` does nothing. The journal always opens on `creatures`; it does not
remember the tab it was closed on.

Nothing in the state changes when the journal opens: a figure in mid-step, a push that is
running, a creature in the light and a lamp that is on stay as they are and go on when it
closes. The first ordinary step after the journal sets the lamp from the input as every
ordinary step does. A direction key that is held while the journal opens is not pressed, so
it turns no tab; held on while the journal closes, it walks the figure from the next step.

### The text

| Key | `de` | `en` |
|---|---|---|
| `journal.tab-creatures` | `Kreaturen` | `Creatures` |
| `journal.tab-cases` | `Fälle` | `Cases` |
| `journal.tab-policy` | `Richtlinie` | `Policy` |
| `journal.no-creatures` | `Noch keine Kreatur gefangen.` | `No creature captured yet.` |
| `journal.no-cases` | `Noch kein Fall aufgenommen.` | `No case opened yet.` |
| `journal.no-policy` | `Die Richtlinie ist noch leer.` | `The policy is still empty.` |
| `creature.snippet-name` | `Schnipsel` | `Snippet` |
| `creature.snippet-text` | `Ein Stück Text, das jemand in einen` / `öffentlichen Chatbot kopiert hat. Es lebt von` / `allem, was dort eingefügt wird – und geht,` / `sobald klar ist, welche Daten wohin dürfen.` | `A piece of text somebody pasted into a public` / `chatbot. It lives on whatever is pasted` / `there – and it goes as soon as everyone knows` / `which data may go where.` |

A slash stands for a line break. The rules, held by a test in both languages:

- a tab's title is one line of at most 16 characters;
- a tab's line for nothing is one line of at most 47 characters;
- a species' name is one line of at most 24 characters;
- a species' text has two to four lines of at most 47 characters and no empty line
  (`gameplay.md` §7).

The snippet's text says what it is in reality, what it lives on and what makes it go — the
countermeasure of the Sales case in plain words: knowing which data may go where
(`world.md` §2 and §4).

### Drawing

While `GameState.journal` is not `null`, the scene draws the journal and nothing else: no
tile, no figure, no heart, no notice, no language line. `src/render/draw-journal.ts` draws,
in the language of the scene's settings (0019):

1. the surface cleared in `#181425`;
2. the three tabs: tab k, counted from 0, is a rectangle (8 + 102k, 6, 100, 16) — in
   `#3a4466` for the open tab, in `#262b44` for the other two — with its title centred in
   it: a title of n characters starts at (58 + 102k − 3n, 9);
3. a rule under the tabs: the rectangle (8, 22, 304, 2) in `#3a4466`, the colour of the open
   tab, so that the open tab stands on it;
4. the open tab's content:
   - without entries, the tab's line for nothing from (16, 36);
   - with entries, entry k, counted from 0: frame 2 of the species' sheet — the creature as
     the light shows it — with its top-left corner at (16, 32 + 72k); the name from
     (40, 35 + 72k); the text from (16, 54 + 72k), with the line pitch of 12.

A text line of 47 characters ends at x = 298. Two entries fit the screen: the second ends at
y = 172.

## Acceptance criteria

1. An action is pressed in the first step in which the input holds it and not again until it
   has been let go, for `talk`, `journal`, `left` and `right`; `GameState.talkHeld` does not
   exist, and the tests of 0017 and 0018 pass on `held`.
2. The initial state has `journal` `null` and `held` with every action false, and survives a
   JSON round trip at the start and with the journal open on `cases`.
3. A press of `journal` with no dialogue open and outside the dark opens the journal on
   `creatures`, also while `right`, `lamp` and `talk` are held and during a push.
4. With the journal open, 600 steps with every key but `journal`, `left` and `right` held
   change nothing but `tick` and `held`: the player, the lamp, the creatures, the movers, the
   walls, the figures, overview and `dark` are as they were.
5. A press of `right` turns from `creatures` to `cases` and from `cases` to `policy`, and
   changes nothing on `policy`; `left` turns back and changes nothing on `creatures`; a key
   held for 600 steps turns one tab; `left` and `right` pressed in the same step turn none.
6. A press of `journal` closes the journal, and the next step is an ordinary one.
7. `journal` does nothing with a dialogue open and nothing in the dark.
8. The entries are empty at the start and `snippet` as soon as `captured.snippet` is 1 or
   more.
9. `de` and `en` hold the eight keys of the spec, and every one obeys the rule of its kind.
10. With the journal open on `creatures` and nothing captured, the scene draws the clear, the
    three rectangles — the first in `#3a4466`, the others in `#262b44` — the three titles
    from (31, 9), (145, 9) and (232, 9) in German, the rule, and the line from (16, 36); it
    draws no tile, no sprite of the world and no heart.
11. With a snippet captured, the creatures tab draws frame 2 of the snippet sheet at
    (16, 32), the name from (40, 35) and the four lines from (16, 54), and not the line for
    nothing.
12. The cases tab and the policy tab draw their line from (16, 36), with a snippet captured
    or not, and their own rectangle in `#3a4466`.
13. With the settings' language `en` the journal draws the English strings, the title of
    `policy` from (244, 9).
14. A state in which `journal` is never held steps exactly as before this feature: the
    player, the creatures, the movers, the walls and the dialogue of 600 recorded steps are
    the same.

## Test plan

- **Unit, the press:** criterion 1 for the four actions on 600 held steps; a second press
  after a step without the key; the dark sets `held` too.
- **Unit, `game/journal`, stepping:** criteria 3 to 7 step by step — opening with other keys
  held and with a push of one step left; the tabs to both ends; closing; a dialogue open; a
  step of the dark. Criterion 4 with a snippet 30 px from the player, a colleague on a leg
  and a wall at `light` 30.
- **Unit, `game/journal`, entries:** criterion 8 with `captured.snippet` 0, 1 and 3.
- **Unit, state:** the initial state; the round trips of criterion 2; the 600 steps of
  criterion 14 against the recording made before this feature.
- **Unit, text:** the eight keys in both languages; the four rules of criterion 9; the key
  rule and the glyph test cover them.
- **Unit, `draw-journal`:** criteria 10 to 13 — the order of the calls, the rectangles and
  their colours for each open tab, the first glyph of every title and of every line, the
  sprite call of the entry.
- **Unit, scene:** with the journal open `drawScene` draws what `drawJournal` draws and
  nothing else; with `journal` `null` it draws what it drew before.
- **Architecture:** unchanged, now covering `src/game/journal.ts`.
- **Smoke:** after loading, `window.shadowAi.state.journal` is `null`; after a press of `J`
  it is `{ tab: 'creatures' }`; after a second press it is `null`.
- **Assets, fixtures:** unchanged.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. Arrow keys or
WASD walk, `Space` holds the lamp, `E` or `Enter` talks, `L` switches the language, `J` opens
and closes the journal. The walk begins with a reload.

**Steps:**

1. Reload the page and press `J` within three seconds.
2. Expected: the floor is gone. A dark screen shows three tabs along the top — `Kreaturen`,
   `Fälle`, `Richtlinie` — the first lighter than the other two, and below them the line
   `Noch keine Kreatur gefangen.`
3. Press the right arrow.
4. Expected: `Fälle` is the lighter tab, and the line is `Noch kein Fall aufgenommen.`
5. Press the right arrow twice.
6. Expected: `Richtlinie` is the lighter tab, and the line is `Die Richtlinie ist noch leer.`
   The second press changed nothing.
7. Hold the left arrow down for three seconds.
8. Expected: `Fälle` is the lighter tab — the held key went one tab back, not two.
9. Press `L`.
10. Expected: the tabs read `Creatures`, `Cases`, `Policy`, the line is
    `No case opened yet.`, and no language line appears.
11. Press `L`, then `E`, `Space`, the up arrow and the down arrow.
12. Expected: the screen is German again, and none of the four other keys changes anything.
13. Wait until ten seconds have passed since step 1, then press `J`.
14. Expected: the floor is back. The colleague in the green shirt stands behind the counter
    as at the start, and walks off only some seconds later.
15. Walk to the counter, stand below its right end and press `E` when the colleague stands
    behind it. With the box open, press `J`.
16. Expected: the box stays, and the journal does not open.
17. Press `E`. Hold the right arrow so that the figure walks, and press `J` while holding it.
18. Expected: the journal opens with `Kreaturen` as the lighter tab and stays on it while
    the arrow is held.
19. Let go of the arrow and press `J`. Walk right into the corridor and down it to the wide
    corridor at its end, right along that to the second doorway in its lower wall, and up
    the corridor that leads up above that doorway. When a scrap comes for the figure, hold
    the lamp on it until it is gone. Press `J`.
20. Expected: under `Kreaturen` there is a small white scrap of paper, beside it the name
    `Schnipsel`, and below it four lines, the first `Ein Stück Text, das jemand in einen`.
    The line `Noch keine Kreatur gefangen.` is gone.
21. Press the right arrow, then the left arrow.
22. Expected: `Fälle` shows `Noch kein Fall aufgenommen.` as before, and back on `Kreaturen`
    the entry is there again.
23. Press `L`.
24. Expected: the name is `Snippet`, and the first of the four lines is
    `A piece of text somebody pasted into a public`.
25. Press `L`, then `J`.
26. Expected: the floor is back as it was left, and the figure walks again.

**Feel:**

- Is `J` the key you would look for? Are the arrows right for the tabs?
- Does the dark screen with its two blues read as a journal?
- Is the creature's own picture, 16x16, large enough beside the text?
- Do the four lines on the snippet say what it is and what makes it go — without lecturing?
- Is something missing on the screen: how many were captured, a hint which key closes?
- The game stands still while the journal is open. Right?

**Result:** passed 2026-11-18, steps 1–26. Feel:

- The keys: `J` is the key to look for, and the arrows are right for the tabs.
- The screen: the dark screen with its two blues reads as a journal.
- The picture: the creature's own 16x16 sprite is large enough beside the text.
- The words: the four lines on the snippet say what it is and what makes it go, without
  lecturing.
- Nothing is missing on the screen: no count and no hint on the keys are wanted now.
- The game standing still while the journal is open is right.

## Open questions

None. Five were settled on 2026-11-18, each as drafted:

- The keys: `J` opens and closes the journal; the left and right keys of walking turn the
  tabs.
- The words: the titles, the three lines for an empty tab, and the snippet's name and text
  as in the table under "The text", in German and English.
- The name check: `Schnipsel` and `Snippet` are fixed as dictionary words for a scrap of
  paper, used for a species and not for a product, a company or a tool. That is the author's
  decision on this basis; no trademark register was searched.
- Picture and count: the entry shows the creature's own 16x16 sprite and no number of
  captures. A larger picture is the art pass; a count comes with the cases tab in M5.
- One feature: the screen, the tabs and the first entry are built together.
