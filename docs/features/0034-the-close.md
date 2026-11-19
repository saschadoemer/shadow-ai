# 0034 — The close

**Status:** draft
**Milestone:** M6
**Drafted:** 2026-11-19

## Goal

The game says when the player has done everything there is to do. Five seconds after the
last case of the game is solved, the story speaks once more — the evening, a second call —
and says that the rest of the floor follows. Then the game goes on. A player who was sent
the address knows where the build ends, and nobody searches empty rooms for a third case.

## Scope

Built on 0033 as merged. No tile changes, no map changes, no new sprite.

**In:**

- A second scene of the story, `close`, three pages.
- The rule that opens it: every case of `CASES` is solved, and 300 steps have passed.
- `GameState.finished`: the step in which the scene was closed, so that it opens once.
- The language table gets three keys in German and English.
- With the implementation: `vision.md` §4; `gameplay.md` §6; `architecture.md` §2 and §8;
  `testing.md` §2; the README.

**Out, explicitly:** an end of the game — nothing stops, nothing is locked, no credits (M7,
M8) · an end card of Act 1 — the first act still ends in the cleared room (`gameplay.md`
§6) · a title screen and the line that LMIS presents the game (M8, `vision.md` §10) · the
managing director as a figure on the map (M6, with Management) · a count of what was
captured or found · a way to read the scene again · save states (M8) · the epilogue (M7),
which replaces this scene.

## Behaviour

Refines `vision.md` §4 and `gameplay.md` §6. A scene is as built by 0026: pages of the story
in the dialogue box, no figure speaks, `E` or `Enter` turns the page, and the world stands
still while it is open.

### When it opens

The close is **due** when all of this holds:

- every case of `CASES` is solved — today Sales and Marketing;
- at least `CLOSE_DELAY_STEPS`, 300 steps — five seconds, *tune* — have passed since the
  step that solved the last of them: the line of the solved case and the line of the upgrade
  (0029) are over, and one second of quiet has followed;
- `finished` is `null`: the scene was not closed before.

A step in which the close is due, and which would otherwise be an ordinary step or open the
journal or a talk, opens the scene instead: `dialogue` becomes
`{ speaker: 'story', index: 1, page: 0 }`, the lamp is off and the figure stands, as when a
talk opens (0017). It waits while something else has the step — the dark, the help, the
journal, an open dialogue — and while the figure is being pushed, and opens in the first
step after it.

The rule reads `CASES`: a feature that adds a case moves the close behind that case without
a change here.

### What it says

Three pages, turned with `E` or `Enter`. A slash stands for a line break.

| Key | `de` | `en` |
|---|---|---|
| `story.close-1` | `Abend. Auf der Etage ist es ruhiger geworden.` / `Wo du warst, sind die Farben zurück – und` / `niemand hat Ärger bekommen.` | `Evening. The floor has grown quieter.` / `Where you have been, the colours are back –` / `and nobody got into trouble.` |
| `story.close-2` | `Die Geschäftsführung ruft an: „Gut. Aber das` / `war erst der Anfang, oder?“ Über den anderen` / `Türen liegt der Schatten noch.` | `The managing director calls: “Good. But that` / `was only the beginning, was it not?” The` / `shadow still lies over the other doors.` |
| `story.close-3` | `So weit reicht das Spiel bis heute.` / `Die übrigen Abteilungen folgen. Du kannst` / `dich weiter auf der Etage umsehen.` | `This is how far the game goes today.` / `The other departments will follow. You can` / `go on looking round the floor.` |

The first two pages are the story's: the note of a solved case is relief, not triumph
(`vision.md` §6), and the managing director says one sentence, as in the call. The third
page is the game speaking about itself — the one place where it does. It is there because
the build is shown to people while it is unfinished, and it goes when the story has its
real end. No page names a number of cases, so the text holds when a case is added.

### After it

The step that closes the last page sets `finished` to its own `tick`. Nothing else changes:
the figure stands where it stood, every room stays as it is, and the game goes on. The scene
does not open again — not after the wake, and not in a later step. A game that is loaded
anew starts from the call, as every game does until M8.

### The state

`GameState.finished` is the `tick` of the step that closed the close, or `null`. It is
`null` at the start and in a new game, and the wake keeps it. Whether the close is due is
derived in every step; the state has no field for it.

## Acceptance criteria

1. `SCENES` holds the call and then the close, with its three pages; `CLOSE_SCENE` is 1.
2. The initial state and a new game have `finished` `null`; the state survives a JSON round
   trip at the start, with the close open and after it.
3. With one of the two cases solved the close is never due, however many steps pass.
4. With both solved, the last at step T, the step with `tick` T + 299 before it is an
   ordinary step, and the step with `tick` T + 300 before it opens the scene on page 0:
   the figure does not move in it, and the lamp is off.
5. The order of the two cases does not matter: the 300 steps count from the later one.
6. Two presses of `talk` turn to pages 1 and 2; the third closes the box and sets `finished`
   to that step's `tick`. A held key turns one page.
7. While the scene is open nothing else is stepped, and `J` does nothing, as under the call.
8. After it the close is never due again: 6000 steps later no dialogue has opened by itself,
   and the wake keeps `finished`.
9. When the close falls due in the dark, with the help or the journal open, in a talk or
   during a push, it opens in the first step after that.
10. A press of `journal` or of `talk` beside a speaker in the step the close opens does not
    open the journal or the talk.
11. With a table of three cases given to the rule, two solved cases do not make the close
    due, and the third does.
12. The scene draws the pages in the dialogue box in both languages, as it draws the call.
13. `de` and `en` hold the three keys of the spec, each a page by the rule of 0026.
14. A game in which not every case is solved steps exactly as before: the 600 recorded steps
    of 0020 give the same digest.

## Test plan

- **Unit, `game/story`:** criterion 1; the rule that says whether the close is due —
  criteria 3, 5 and 11, and the step counts of criterion 4.
- **Unit, state:** criterion 2; criteria 4, 6, 7 and 8 through `update` on a map built in
  the test with both sources; criteria 9 and 10; the wake; the digest of criterion 14.
- **Unit, floor:** on the floor as loaded, both cases solved from beside their sources, 300
  steps later the scene is open.
- **Unit, scene:** criterion 12.
- **Unit, text:** the three keys in both languages; the rule of a page of the story covers
  them.
- **Architecture, assets:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.finished` is `null`.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the figure stands in the reception with the lamp — where the game opens
with the call (0026), the call is read and the lamp fetched first. Arrow keys or WASD walk,
`Space` holds the lamp, `E` or `Enter` talks.

**Steps:**

1. Solve the case of Sales: find its five traces and press `E` three times beside the
   colleague in the pink shirt, a moment apart.
2. Expected: the room clears, and the line says `Der Fall ist gelöst. Sieh ins Journal.`
3. Wait ten seconds without pressing a key.
4. Expected: no box opens by itself.
5. Solve the case of Marketing: find its five traces and press `E` three times beside the
   colleague in the red shirt, a moment apart.
6. Expected: the room clears; the line says that the case is solved and then that the lamp
   shines wider and stronger.
7. Wait without pressing a key.
8. Expected: about five seconds after the answer closed — a moment after the second line is
   gone — a box opens by itself. Its first line is
   `Abend. Auf der Etage ist es ruhiger geworden.`
9. Press `E`.
10. Expected: the first line is `Die Geschäftsführung ruft an: „Gut. Aber das`.
11. Press `E`.
12. Expected: the first line is `So weit reicht das Spiel bis heute.`
13. Press `E`.
14. Expected: the box is gone, and the figure walks again.
15. Walk round for twenty seconds, and hold `Space` once.
16. Expected: no box opens by itself again.

**Feel:**

- Does it feel like a close, or like an interruption?
- Five seconds after the case: too early, too late?
- The third page speaks about the game itself. Honest, or a break in the story?
- Is it clear afterwards that walking on is possible and nothing more is to be found?

**Result:** not yet walked.

## Open questions

None. Five were settled on 2026-11-19, each as drafted:

- A close at all: it follows the last case of the game, not Act 1, and the game goes on
  after it; `gameplay.md` §6 says what the difference to an end card is.
- The third page, in which the game says how far it goes today, stays while the game is
  unfinished; the feature that brings the real end removes it.
- When: 300 steps after the last case, by itself, once.
- The words, three pages in German and English, with a second call of the managing
  director, as in the table.
- Nothing is counted on any page.
