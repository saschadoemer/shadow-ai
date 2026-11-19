# 0039 — The lamp from the start

**Status:** approved 2026-11-19
**Milestone:** M6
**Drafted:** 2026-11-19

## Goal

The player has the lamp from the first step. Nobody hands it over: after the call, a line at
the bottom names its key, and `Space` shines at once. The data protection officer still
explains the shadow and the lamp, but a player who walks past her loses nothing. The keys of
the game mean the same from the first second: `E` talks, `Space` holds the lamp.

## Scope

Built on 0037 as merged. No map changes, no new sprite. The feature takes rules out of the
game and adds none.

**In:**

- `LampState.owned` goes: the lamp is always the player's.
- The first meeting goes: the data protection officer says her own three pages from the
  first talk.
- The intern's page for a player without the lamp goes.
- Two keys leave the language table, in German and English.
- With the implementation: `vision.md` §4 and §10; `world.md` §3; `gameplay.md` §2 and §8;
  `architecture.md` §2 and §5; `testing.md` §2; the README.

**Out, explicitly:** a line of the story that says where the lamp comes from — the head of IT
has it, as the figure has shoes (see the open questions) · new words for the call or for the
data protection officer · a lamp that can be lost, given back or switched off for good · the
battery (M6, `gameplay.md` §2) · another key for the lamp, or a lamp that is toggled instead
of held (0007) · a tutorial screen: the line that names the key stays the only help of its
kind (`vision.md` §2) · sound.

## Behaviour

Changes what feature 0026 built, and what `world.md` §3 says of the data protection officer:
she explains the lamp and no longer gives it. With the approval that sentence of `world.md` §3
was changed, and 0038 is built on this feature: its walk begins without fetching the lamp.

### The lamp

`LampState` has three fields: `on`, `strength` and `used`. `owned` is gone, and with it every
rule that asked for it:

- A new game starts with `lamp` `{ on: false, strength: 1, used: false }`. The game past its
  opening, `createInitialState`, has `used` `true`, as before.
- The input's `lamp` counts from the first step of a game. While the card (0036) is shown or
  the call is open, the step is theirs and `Space` does nothing, as every key but `E`.
- A press of `talk` with `lamp` held opens no dialogue, from the first step: the rule of 0017,
  without the exception 0026 made for a player without the lamp.
- `used` becomes `true` in the first step in which the lamp is on, and stays so (0026).

### The line that names the key

`notice.lamp` — `Die Lampe: Leertaste halten.` / `The lamp: hold Space.` — is the notice
exactly while `lamp.used` is `false`. In a new game that is from the first step; the line is
drawn as soon as the call is closed, because the dialogue box stands in the notice's place
until then. It goes in the step in which the lamp is on for the first time and never comes
back. Its place in the order of the notices stays the last.

### The data protection officer

She has her own three pages from the first talk: `talk.officer-rules-1`,
`talk.officer-rules-2`, `talk.officer-rules-3`. There is no first meeting: `FIRST_MEETING`,
`figuresIn` and `isFirstMeeting` go, and closing her talk changes nothing but `tick`, `held`
and `dialogue`. The key `talk.officer-meeting-2` leaves both tables.

The third page of the call still points to her — `Nebenan, bei der Datenschutzbeauftragten,
brennt Licht.` — and she still explains what the lamp is for. Visiting her is no longer a
step the game needs.

### The intern

His page for a player without the lamp, `talk.intern-lamp`, leaves both tables. `hintOf`
loses its first argument: his hint follows from the cases alone, and in a new game it is
`talk.intern-sales-start`. That is also the page the cast gives him before a step has picked
one.

## Acceptance criteria

1. `LampState` has the fields `on`, `strength` and `used` and no other. A new game has `lamp`
   `{ on: false, strength: 1, used: false }`, the game past its opening
   `{ on: false, strength: 1, used: true }`. Both survive a JSON round trip.
2. In a new game past the card and the call, the first step with `lamp` held and nothing in
   its way sets `lamp.on` and `lamp.used` to `true`; the figure stands, as in 0007.
3. While the card is shown and while the call is open, 600 steps with `lamp` held leave
   `lamp.on` and `lamp.used` `false`.
4. The notice is `notice.lamp` exactly while `lamp.used` is `false`: in a new game from the
   first step, and never in a state of `createInitialState`. With the call closed and the
   lamp not yet held, the scene draws the line; with the call open it draws the box instead.
5. A press of `talk` beside the data protection officer with `lamp` held opens no dialogue,
   in a new game as in a game past its opening.
6. Her talk has the three pages `talk.officer-rules-1`, `talk.officer-rules-2`,
   `talk.officer-rules-3` from the first talk of a new game, and the step that closes it
   changes nothing but `tick`, `held` and `dialogue`.
7. The intern's hint in a new game is `talk.intern-sales-start`, and the cast gives him that
   page; with every case solved it is `talk.intern-done`, as before.
8. Neither table holds `talk.officer-meeting-2` or `talk.intern-lamp`, and `de` and `en` have
   the same keys.
9. The wake keeps `used`. A figure hit to zero in a new game wakes with the lamp.
10. A game past its opening steps exactly as before: the 600 recorded steps of 0020 give the
    same digest.

## Test plan

- **Unit, state:** criterion 1; criterion 9; the digest of criterion 10. Every full literal
  of the state loses `owned`.
- **Unit, the lamp:** criteria 2 and 3 through `update` from `newGame` on a map with a
  snippet in the cone's reach; `used` in the step the lamp is first on and 600 steps later.
- **Unit, opening (0026):** the tests of the first meeting and of the player without the
  lamp go; the tests of the call stay. One new test plays card, call and the first step with
  the lamp in a row.
- **Unit, `game/notice`:** criterion 4 in three states — a new game, after the lamp was
  held, the game past its opening.
- **Unit, cast and talk:** criteria 5 and 6; `FIRST_MEETING` is gone.
- **Unit, hints:** criterion 7; the tests of the page without the lamp go.
- **Unit, scene:** the line of criterion 4 in both languages; the cone in the first frame
  in which the lamp is on in a new game.
- **Unit, text:** criterion 8.
- **Architecture, assets:** unchanged.
- **Smoke:** after the card and the call, `state.lamp` is `{ on: false, strength: 1, used:
  false }`; a held `Space` turns the lamp on and holds the figure — the smoke test of 0007 as
  it was before 0026.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The page
is not loaded yet. Arrow keys or WASD walk, `Space` holds the lamp, `E` or `Enter` talks.

**Steps:**

1. Load the page, press `E` on the card and read the call to its end with `E`.
2. Expected: the figure stands in the reception, and the line at the bottom says
   `Die Lampe: Leertaste halten.`
3. Hold `Space`.
4. Expected: the yellow cone lies in front of the figure, and the line at the bottom is
   gone.
5. Let go, walk a few steps and hold `Space` again.
6. Expected: the cone is there again; the line does not come back.
7. Walk next door to the data protection officer and talk to her, to the end.
8. Expected: three pages. The first begins `Du siehst den Schatten also auch.`, the second
   `Mit der Lampe hältst du fest,`, the third `Die Lampe hast nur du.` No page says `Nimm die
   Lampe`.
9. Stand beside her, hold `Space` and press `E`.
10. Expected: no box opens; the cone stays.
11. Reload the page, pass the card and the call, and walk to the intern in the break room
    without visiting the data protection officer. Talk to him.
12. Expected: he says where Sales is: `Vertrieb? Am Ende des Flurs nach Osten.` He does not
    send the figure to the data protection officer.
13. Walk to the doorway of Sales and hold the lamp on the scrap of paper that comes at the
    figure.
14. Expected: the scrap stops in the light and is caught, as ever.

**Feel:**

- Is the line at the bottom enough to learn the key — or is it missed?
- Is the data protection officer still worth the walk next door?
- Does the game say clearly enough what the lamp is for, for a player who never talks to
  her?

**Result:** passed 2026-11-19, steps 1–14. Feel: the line at the bottom is enough to learn the
key — fits; the data protection officer is still worth the walk next door — yes, fits; the game
says clearly enough what the lamp is for, for a player who never talks to her — yes, fits.

## Open questions

None. Five were settled on 2026-11-19, each as drafted:

- **Where the lamp comes from.** Nowhere: the player has it. No page of the call and no
  figure says so. The other way is one more sentence on the third page of the call.
- **The data protection officer.** She keeps her three pages and her place, and the call
  still points to her. Nothing in the game needs the visit any more.
- **The key.** The line `Die Lampe: Leertaste halten.` stands from the end of the call until
  the lamp is held once. It is the only place that names the key besides the help.
- **The field.** `LampState.owned` is taken out of the state, with the rules that asked for
  it, and not kept as a field that is always `true`.
- **The order.** 0037 first, then this feature, then 0038. The walk of 0038 begins without
  fetching the lamp.
