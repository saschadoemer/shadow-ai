# 0026 — The call

**Status:** approved 2026-11-18
**Milestone:** M5
**Drafted:** 2026-11-18

## Goal

The game begins with its story. Three pages of text open it: the customer's call, the managing
director's order, and the first sight of the shadow. The player starts without the lamp. The
data protection officer, next door, sees the shadow too and hands the lamp over in their first
talk; from then on the game is the one the player knows.

## Scope

Built on 0025 as merged. It needs nothing of 0022 to 0025 and can be built before them: it
rests on the dialogue of 0017 and the lamp of 0007. No tile changes, no map changes, no new
sprite.

**In:**

- Scenes: text the story itself says, shown in the dialogue box without a figure. One
  scene, the call, in `src/game/story.ts`.
- `newGame`: the state a played game starts with — the call open, the lamp not yet owned.
  `main.ts` starts with it.
- The lamp can be owned or not: `LampState.owned`. Without it `Space` does nothing.
- The first meeting: while the player has no lamp, the data protection officer says her
  first page and a second one that hands the lamp over; the step that closes it gives the
  lamp.
- A fourth notice that names the lamp's key, until the lamp is held for the first time.
- The language table gets five keys in German and English.
- With the implementation: `vision.md` §4; `gameplay.md` §2 and §8; `world.md` §3;
  `architecture.md` §1, §2, §4 and §8; `testing.md` §2; the README.
- With the settled questions of this draft: `vision.md` §2 allows the one line that names
  the lamp's key.

**Out, explicitly:** the managing director and the customer as figures on the map — in the
first act both are text; the managing director stands in Management with its map (M6) · a
room of the player's own · a title screen before the call, and skipping the call (M8) · a
saved game that starts after the call (M8) · the walk to Sales as a guided sequence: the
player walks · pictures in the scene's box, a name over it · the vendor's first appearance
(M6) · a way to give the lamp back or to lose it · sound.

## Behaviour

Refines `vision.md` §4, `gameplay.md` §2 and §8, `world.md` §3 and `architecture.md` §2, §4
and §8.

### Scenes

A **scene** is text the story says: pages in the dialogue box of 0017, with no figure that
speaks. `src/game/story.ts` holds the scenes as data, one in this feature:

| Scene | Pages |
|---|---|
| `call` | `story.call-1`, `story.call-2`, `story.call-3` |

`GameState.dialogue` gets a third kind of speaker: `{ speaker: 'story', index, page }`, with
`index` the index of the scene. A scene's dialogue is stepped like any other (0017): nothing
in the world is stepped while it is open, a press of `talk` turns the page, a press on the
last page closes it. Nobody turns to anybody. The box, the lines and the marker are those of
0017. A scene is opened by the game, never by a press; in this feature only at the start.

### The start

`src/game/update.ts` gets `newGame(map)`: the initial state of 0020 with two differences —
`dialogue` is `{ speaker: 'story', index: 0, page: 0 }`, the call on its first page, and the
lamp is not owned (below). `main.ts` starts the game with `newGame`.

`createInitialState` stays what it is: a game past its opening, with the lamp owned and no
dialogue open. The tests of the earlier features step from it.

The figure stands at the spawn in the reception while the call is read. After the third
page the game runs.

### The lamp, owned or not

`LampState` gets two fields:

- `owned`: whether the player has the lamp. `false` in a new game, `true` after the first
  meeting and in `createInitialState`.
- `used`: whether the lamp was on in any step since it was owned. `false` in a new game and
  after the first meeting; `true` from the first step in which the lamp is on, and in
  `createInitialState`.

While the lamp is not owned, the input's `lamp` counts as not held, everywhere:

- `lamp.on` is `false` in every step, so nothing freezes, no wall is lit, no trace is seen
  and no cone is drawn;
- the figure walks with `Space` held, as without it (0007 made it stand);
- a press of `talk` opens a dialogue also while `Space` is held (0017 forbade it for a held
  lamp).

Everything else is as before: the creatures come for the figure and hit, and the dark wakes
it in the data protection officer's office — beside her.

### The first meeting

While the lamp is not owned, the data protection officer's pages are `talk.officer-rules-1`
and `talk.officer-meeting-2`. Once it is owned they are the two pages of 0017 again.

The step in which a press closes that first dialogue hands the lamp over: `lamp.owned`
becomes `true`; `lamp.used` stays `false`. Nothing else changes in that step besides what a
closing step changes. The wake of 0009 keeps both fields.

Her first meeting is three sentences, as `world.md` §3 says: that she sees the shadow too,
where it stays behind, and — handing the lamp over — what the lamp is for.

### The notice

`game/notice` gains a fourth notice, `notice.lamp`: shown while `lamp.owned` is `true` and
`lamp.used` is `false`. It has no time: it stays until the lamp is held once, and never
comes back. The order when several are due: a wall that holds (0016), a solved case (0024),
a found trace (0022), the lamp's key. The first three need the lamp to have been used, so in
practice the lamp's line stands alone.

### The text

A slash stands for a line break.

| Key | `de` | `en` |
|---|---|---|
| `story.call-1` | `Montagmorgen. Das Telefon – ein Kunde:` / `„Sätze aus unserem vertraulichen Angebot stehen` / `in der Antwort eines öffentlichen Chatbots.“` | `Monday morning. The phone – a customer:` / `“Sentences from our confidential offer are in` / `the answer of a public chatbot.”` |
| `story.call-2` | `Die Geschäftsführung fängt dich am Empfang ab:` / `„Das Angebot kam aus dem Vertrieb. Finde` / `heraus, wie das passieren konnte.“` | `The managing director stops you at reception:` / `“The offer came from Sales. Find out how` / `that could happen.”` |
| `story.call-3` | `Über den Türen im Flur liegt etwas, das` / `vorher nicht da war. Nebenan, bei der` / `Datenschutzbeauftragten, brennt Licht.` | `Something lies over the doors in the corridor` / `that was not there before. Next door, the` / `data protection officer has her light on.` |
| `talk.officer-meeting-2` | `Nimm die Lampe: Sie hält fest, was sich darin` / `regt – nicht um es zu vertreiben, sondern um` / `es zu verstehen.` | `Take the lamp: it holds still whatever stirs` / `in it – not to drive it away, but to` / `understand it.` |
| `notice.lamp` | `Die Lampe: Leertaste halten.` | `The lamp: hold Space.` |

The call is the trigger of `vision.md` §4 in three pages: who calls and why, who sends the
player and where the offer came from, and what the player sees — with a pointer to the one
person who can help. The customer and the managing director say one sentence each. The hero
says nothing. The managing director stops the player at the reception, where the game
begins; the vision's "stands in your door" would need a room the floor does not have.

A page of the kind `story` obeys the page rule of 0017: at most three lines of at most 47
characters, none empty. The notice is one line and fits the bar.

## Acceptance criteria

1. `SCENES` holds the call with its three pages; `de` and `en` hold the five keys of the
   spec, each by its rule.
2. `newGame` gives the state of `createInitialState` with `dialogue`
   `{ speaker: 'story', index: 0, page: 0 }` and `lamp` `{ on: false, strength: 1,
   owned: false, used: false }`, and survives a JSON round trip; `createInitialState` has
   `owned` and `used` `true` and no dialogue.
3. With the call open, 600 steps with every key but `talk` held change nothing but `tick`
   and `held`; three presses close it, page by page, and nobody has turned.
4. Without the lamp, 600 steps with `lamp` held leave `lamp.on` `false`, freeze no creature,
   light no wall and find no trace; with `lamp` and `right` held the figure walks as with
   `right` alone.
5. Without the lamp, a press of `talk` beside the data protection officer with `lamp` held
   opens her dialogue; with the lamp owned it does not, as in 0017.
6. Without the lamp her pages are `talk.officer-rules-1` and `talk.officer-meeting-2`; with
   it they are the two pages of 0017.
7. The step that closes her first dialogue sets `lamp.owned` to `true` and changes nothing
   else besides `tick`, `held` and `dialogue`; `lamp.used` is `false`.
8. Closing a colleague's saying, or her dialogue once the lamp is owned, changes neither
   field.
9. In the first step in which the lamp is on, `lamp.used` becomes `true`, and it stays so.
10. The notice is `notice.lamp` exactly while the lamp is owned and not used; it is none
    before the first meeting and none in a state of `createInitialState`.
11. The wake keeps `owned` and `used`; a figure hit to zero before the first meeting wakes
    without the lamp.
12. The scene draws a scene's page in the dialogue box as it draws a figure's, in both
    languages, and no cone while the lamp is not owned.
13. A state of `createInitialState` steps exactly as before this feature: the 600 recorded
    steps of 0020 give the same digest.

## Test plan

- **Unit, `game/story`:** the scene and its pages; the speaker of a `story` dialogue among
  the speakers of a step.
- **Unit, state:** criterion 2 — both initial states and the round trips, also with the
  call on page 2 and after the first meeting; the digest of criterion 13.
- **Unit, `game/talk`:** criterion 3 on a map with a figure and a colleague in reach — the
  call is not theirs, and they do not turn; criteria 5 to 8 on the fixture of 0017.
- **Unit, the lamp:** criterion 4 on a map with a snippet in the cone's reach, a wall and a
  trace; criterion 9 in the step after the meeting and 600 steps later.
- **Unit, `game/notice`:** criterion 10 in the four states — a new game, after the meeting,
  after the first light, a state of `createInitialState`.
- **Unit, the wake:** criterion 11.
- **Unit, text:** the five keys in both languages; the page rule covers the kind `story`.
- **Unit, scene:** criterion 12 — the first glyph of the call's first page at (12, 138) in
  German and in English; no sprite of the lamp sheet without the lamp.
- **Architecture, assets:** unchanged, now covering `src/game/story.ts`.
- **Smoke:** after loading, `state.dialogue` is the call on page 0 and `state.lamp.owned` is
  `false`. Every other smoke test first closes the call with three presses of `E`. The
  smoke test of 0007 changes: after the call a held `Space` turns no lamp on and does not
  hold the figure; the lamp that shines is covered by the unit tests.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. Arrow keys or
WASD walk, `Space` holds the lamp, `E` or `Enter` talks, `L` switches the language. The walk
begins with a reload.

**Steps:**

1. Reload the page and press no key.
2. Expected: the reception is there, and a dark box at the bottom shows three lines, the
   first `Montagmorgen. Das Telefon – ein Kunde:`. The colleague in the green shirt stands
   behind the counter and does not move, however long it takes.
3. Press the arrow keys, `Space` and `J`.
4. Expected: nothing happens.
5. Press `L`.
6. Expected: the first line is `Monday morning. The phone – a customer:`.
7. Press `L`, then `E`.
8. Expected: the first line is `Die Geschäftsführung fängt dich am Empfang ab:`.
9. Press `E`.
10. Expected: the first line is `Über den Türen im Flur liegt etwas, das`.
11. Press `E`.
12. Expected: the box is gone, and the colleague in green starts its round within about
    five seconds.
13. Hold `Space` and walk right into the corridor with it held.
14. Expected: the figure walks. No yellow cone appears, and there is no line at the bottom.
15. Walk up the corridor to the next doorway on the left and through it into the room above
    the reception. Stand beside the colleague in the light grey shirt, hold `Space` and
    press `E`.
16. Expected: the box shows three lines, the first `Du siehst den Schatten also auch.`
17. Let go of `Space` and press `E`.
18. Expected: the first line is `Nimm die Lampe: Sie hält fest, was sich darin`.
19. Press `E`.
20. Expected: the box is gone, and a line at the bottom says
    `Die Lampe: Leertaste halten.`
21. Walk about for ten seconds without `Space`.
22. Expected: the line is still there.
23. Hold `Space`.
24. Expected: the yellow cone appears, the figure stands, and the line is gone.
25. Let go of `Space`, wait five seconds, and press `E` beside the colleague in grey twice.
26. Expected: the line at the bottom has not come back. Her second page now begins
    `Mit der Lampe hältst du fest, was sich darin`.

**Feel:**

- Three pages before the first step: is that the right length for a start, also at a booth?
- Does the third page send you next door — would you have found her without it?
- Is the walk without the lamp a good minute, or only a detour?
- The line names a key. Is that right, or should the game say nothing?
- Is the managing director as a sentence of text enough, or is a person missed?

**Result:** not yet walked.

## Open questions

None. Seven were settled on 2026-11-18, each as drafted:

- Text, no figures: the call is three pages in the dialogue box; the customer and the
  managing director are sentences, and the game starts in the reception.
- The words: the three pages of the call, the officer's second page of the first meeting
  and the lamp's line as in the table under "The text", in German and English.
- The pointer: the third page of the call ends with the light next door at the data
  protection officer.
- The first meeting: her first page of 0017, then `Nimm die Lampe: Sie hält fest, …`; three
  sentences in all. Afterwards she says the two pages of 0017.
- The lamp's line: `Die Lampe: Leertaste halten.` stays until the lamp is held once.
  `vision.md` §2 is changed with this decision: it allows this one line.
- Hits without the lamp: the creatures hit as always, and the dark wakes the player beside
  the data protection officer.
- Two starts: `newGame` is what a player gets, `createInitialState` stays a game past its
  opening for the tests. Every acceptance walk begins with the call and the way to the lamp
  until M8 brings saved games.
