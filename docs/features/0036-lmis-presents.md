# 0036 — LMIS presents

**Status:** approved 2026-11-19
**Milestone:** M5
**Drafted:** 2026-11-19

## Goal

The game says who presents it before it begins. A dark card with two lines — `LMIS
präsentiert` and the title — is the first thing a player sees; after three seconds, or at a
press of `E` or `Enter`, the call follows. A player knows from the first second whose game
this is, and that the one real product in it is there on purpose.

## Scope

Built on 0039 as merged. No map changes, no new sprite.

**In:**

- The card: what it shows, how long, and what ends it.
- `GameState.presented`: the step in which the card ended.
- The language table gets two keys in German and English.
- With the implementation: `vision.md` §10; `gameplay.md` §8; `architecture.md` §2, §3 and
  §5; `visual.md` §3; `testing.md` §2; the README.

**Out, explicitly:** the title screen with its menu, the language choice and a start button
(M8) — the card is its stand-in and goes when it comes · a logo of LMIS or of anything
(`vision.md` §10: a name, never a logo) · a line about Harmonic on the card (see the open
questions) · credits, an imprint, a privacy note or a licence text (M8, with the first
public release) · LMIS anywhere in the world of the game but on its carpet (0039) · the name at
the close of 0034 · sound.

## Behaviour

Refines `vision.md` §10, which leaves the place of the line to this feature, and
`gameplay.md` §8.

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
9. No text of the game but this line and the carpet's (`carpet.lmis`, 0039) holds the name
   LMIS, and no figure, region or company of the world data does.
10. A game past its opening steps and is drawn exactly as before: the 600 recorded steps of
    0020 give the same digest, and the tests of 0026 pass with `presented` 0.

## Test plan

- **Unit, state:** criterion 1; criteria 3 to 6 through `update` from `newGame`; the wake;
  the digest of criterion 10.
- **Unit, scene:** criterion 2 in both languages, and the frame after the card.
- **Unit, text:** the two keys; the centring for both languages; a test that no key
  of either table but the two contains the name — criterion 9.
- **Unit, opening (0026):** its tests start past the card and pass unchanged; one new test
  plays card, call and first meeting in a row.
- **Architecture, assets:** unchanged.
- **Smoke:** the page opens with `presented` `null` and no dialogue drawn; after a press of
  `E` the call is open. The helper that starts a game for the other smoke tests presses `E`
  once more.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The page
is not loaded yet. `E` or `Enter` talks, `L` switches the language.

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

**Feel:**

- Three seconds: long enough to read, short enough not to wait?
- Does it read as a frame round the game — or as an advertisement before it?
- Is the step from the card to the call too hard a cut?

**Result:** not yet walked.

## Open questions

None. Five were settled on 2026-11-19, each as drafted:

- The place: a card before the call, on an empty screen, the stand-in for the title screen
  of M8.
- The words: `LMIS präsentiert` / `LMIS presents` over the title `Shadow AI`.
- How it ends: after three seconds by itself, or at a press of `E` or `Enter`.
- No line about Harmonic on the card now. Whether the presenter's line is enough is for the
  person who checks the release (`vision.md` §10); a line is added if that person asks for
  it.
- The milestone: M5, built now.
