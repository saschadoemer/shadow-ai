# 0022 — Traces

**Status:** implemented 2026-11-18
**Milestone:** M5
**Drafted:** 2026-11-18

## Goal

The player can find traces. A trace is shadow residue on a device: it cannot be seen until the
lamp's light is on it, it shows more of itself the longer the light stays, and after one second
it is found. A found trace goes into the journal: the cases tab gets its first entry — the
department, and how many of its traces are found. Sales has five.

## Scope

Built on 0020 as merged. No tile changes; the floor gets five rectangles.

**In:**

- Traces as rectangles of the map named `trace:<region>`, one cell each, on a device.
- `src/game/trace.ts`: the traces of a map, the light test, one step of a trace; and
  `GameState.traces`.
- The lamp finds a trace after one second of unbroken light.
- `public/sprites/trace.png`, the third shadow asset; the scene draws a trace while the light
  is on it.
- A second notice, for two seconds after a find.
- The cases tab of the journal: one entry per department with a found trace — its name and
  `found of all`.
- `drawNumber`: the game draws whole numbers.
- The language table gets four keys in German and English.
- With the implementation: `gameplay.md` §2, §6 and §7; `world.md` §2; `architecture.md` §1,
  §2, §5, §6 and §8; `visual.md` §3 and §4; `testing.md` §2; the README.
- With this draft: `docs/plan.md` §4 cuts M5 into features.

**Out, explicitly:** what a trace says — its own name or text in the journal (0024, with the
case) · the gesture that shows a trace to the source, and the source itself (0024) · people
spoken to, the source and the outcome on the cases tab (0024) · traces in other departments
(M6, one case at a time) · hidden traces that need the colour filter (M6) · a trace a
creature guards, or one that needs an action in the environment first (M6) · the number of
captures on the creatures tab — `drawNumber` makes it possible, a draft of its own decides it ·
sound.

## Behaviour

Refines `gameplay.md` §2, §6 and §7, `world.md` §2, `architecture.md` §2, §5, §6 and §8 and
`visual.md` §4.

### Traces in the map

A rectangle of the `objects` layer named `trace:<region>` is a trace: exactly one cell,
16x16 with its corner on the grid, on the cell of the device it lies on. A region may have
several; they share the name. `src/game/trace.ts` reads the traces from the map's rectangles
in file order and refuses the map in `createInitialState`:

- a region the world data does not know: `trace trace:cellar names no region`;
- a box that is not one cell: `trace trace:sales (1330, 448, 16, 16) is not one cell`.

`game/shadow` no longer refuses every rectangle that is no wall: `wallsOf` skips the
rectangles named `trace:`, and a rectangle that is neither is still an error. A map without
such rectangles has no traces.

On the floor, `tools/floor-layout.ts` gets `TRACES`, and `floor.tmj` five more rectangles
after the figure's point, with the ids 101 to 105; `nextobjectid` is 106. Each lies on a desk
with a screen in a cubicle of Sales:

| Trace | Cell | Rectangle | Cubicle |
|---|---|---|---|
| `trace:sales` | (83, 28) | (1328, 448, 16, 16) | first row, first from the left |
| `trace:sales` | (98, 28) | (1568, 448, 16, 16) | first row, fourth from the left |
| `trace:sales` | (93, 34) | (1488, 544, 16, 16) | second row, third from the left |
| `trace:sales` | (88, 40) | (1408, 640, 16, 16) | third row, second from the left |
| `trace:sales` | (98, 46) | (1568, 736, 16, 16) | fourth row, fourth from the left |

Sales has sixteen such desks, in four rows of four; eleven carry nothing. Every row has at
least one trace.

### Finding a trace

`GameState.traces` holds one entry per trace of the map, in file order, for the whole game:
`{ trace, light, found }` — the index among the map's traces, the steps the light has been on
it without a break, 0 to 59, and the `tick` of the step in which it was found, or `null`. At
the start every trace has `light` 0 and `found` `null`.

A trace that is not found is **in the light** in a step when the lamp is on, its box, edges
included, meets the cone, and no opaque box lies on the line from the centre of the player's
box to the nearest pixel of the trace's box. The test is the shadow wall's of 0014, with one
difference: the line is tested against the map with the shadow walls standing, as for a
creature, so a trace is not found through a standing wall. A desk, a screen and a partition
are low and do not stop the light.

`FIND_STEPS` is 60, one second, *tune* — the number of a capture and of a lifted wall. In an
ordinary step, after the player is stepped:

- a trace in the light: `light` grows by 1; when it reaches `FIND_STEPS`, the trace is
  **found**: `found` is the step's `tick`, `light` is 0;
- a trace not in the light: `light` is 0;
- a found trace never changes again.

The lamp has no strength to meet here: every trace of this feature gives way to the basic
lamp. The wake of 0009 sets every `light` to 0 and keeps what was found. While a dialogue or
the journal is open, nothing is stepped (0017, 0020).

### The notice

`TRACE_NOTICE_STEPS` is 120, two seconds, *tune*. `game/notice` gains a second notice:
`notice.trace-found`, shown while a trace has `found` not `null` and
`tick` − `found` < `TRACE_NOTICE_STEPS`. The notice of 0016 — a wall that holds — comes
first when both are due. The notice is drawn where the notice of 0016 is drawn, and before
the language line of 0019. A second find within the two seconds starts them again.

### The journal

The **entries** of the cases tab are the regions of which at least one trace is found, in the
order of the world data. They are derived in every frame from `GameState.traces` and the
map's traces; the state has no field for them. Without an entry the tab shows its line for
nothing, as in 0020.

Entry k, counted from 0, is two lines:

1. the region's name, the key `region.<id>`, from (16, 36 + 36k);
2. from (16, 48 + 36k): the key `journal.traces`, a space, the number of found traces of the
   region, a space, the key `journal.of`, a space, and the number of all its traces on the
   map. One empty cell of 6 px lies between two parts.

In German the second line of Sales reads `Spuren: 1 von 5`: the label from x = 16, `1` at
x = 64, `von` from x = 76, `5` at x = 100. In English it reads `Traces: 1 of 5`, with `of`
from x = 76 and `5` at x = 94.

`src/render/draw-text.ts` gets `drawNumber(renderer, font, value, x, y)`: the decimal digits
of a whole number of 0 or more, from the left, 6 px apart. It takes a number and nothing
else; a number is no text of a language and needs no key (INV-4 is untouched: `drawText`
still takes a `TextKey` only).

### The text

| Key | `de` | `en` |
|---|---|---|
| `region.sales` | `Vertrieb` | `Sales` |
| `journal.traces` | `Spuren:` | `Traces:` |
| `journal.of` | `von` | `of` |
| `notice.trace-found` | `Spur gefunden. Sie steht im Journal.` | `Trace found. It is in the journal.` |

The rules, held by a test in both languages: a region's name is one line of at most 24
characters; `journal.traces` and `journal.of` are one line of at most 16; the notice is one
line and fits the bar (0016). Every region with a trace on the floor has a name.

### Drawing

`public/sprites/trace.png` is 48x16: three 16x16 frames, the third shadow asset
(`visual.md` §4). Frame k holds a checkerboard in the signature colour `#68386c` inside a
centred square of 6, 10 and 14 px — 18, 50 and 98 pixels; everything else is transparent.
`tools/placeholder-trace.ts` generates it.

A trace with `light` above 0 is drawn with the frame ⌊(`light` − 1) / 20⌋ and its top-left
corner at (x − camera.x, y − camera.y) of its rectangle, after the standing shadow walls and
before the movers, the figures and the creatures. A trace with `light` 0 is not drawn — a
found one never. So the residue grows on the screen for a second and is gone: form and
motion beside the colour.

## Acceptance criteria

1. The loader's rectangles and `game/trace` give the floor five traces, all of `sales`, on
   the cells of the table; a map with a `trace:` rectangle of an unknown region or of another
   size does not start, each with its message; a map without such rectangles starts with
   `traces` empty.
2. `floor.tmj` holds the five rectangles with the ids 101 to 105 after the objects of 0017,
   which are unchanged; `wallsOf` still gives the eight walls of 0014.
3. Each trace of the floor lies on a cell whose `detail` tile is a desk with a screen, with
   the desk's chair on the cell below it, and is in the light of a player who looks up from
   any place on the cell below that chair.
4. The initial state has `traces` with `light` 0 and `found` `null` for each, and survives a
   JSON round trip at the start and with one trace found.
5. A trace in the light for 59 steps has `light` 59 and is not found; the 60th step finds it:
   `found` is that step's `tick` and `light` is 0. A step without the light before the 60th
   sets `light` to 0, and the trace needs 60 steps again.
6. A trace is not in the light with the lamp off, outside the cone, behind an opaque box, or
   behind a standing shadow wall; a low box on the line does not stop the light.
7. A found trace is not stepped again: 600 lit steps change nothing of it.
8. The wake sets `light` to 0 and keeps `found`; with a dialogue or the journal open, 600
   steps change no trace.
9. The notice is `notice.trace-found` for 120 steps from the find and none after; a wall that
   holds shows its own notice instead.
10. `de` and `en` hold the four keys of the spec, each by its rule; `region.sales` exists.
11. `trace.png` is 48x16, equals its generator's output, has 18, 50 and 98 opaque pixels in
    its frames, all `#68386c`, and passes the asset test as the third shadow asset; the test
    rejects the colour in every other PNG as before.
12. The scene draws a trace with `light` 1, 20, 21, 40, 41 and 59 with the frames 0, 0, 1, 1,
    2 and 2 at its cell, after the walls and before the movers; it draws none with `light` 0
    and none that is found.
13. `drawNumber` draws 0, 7, 10 and 123 as 1, 1, 2 and 3 glyphs from x, 6 px apart.
14. With one of the five traces found, the cases tab draws `Vertrieb` from (16, 36) and
    `Spuren:`, `1`, `von` and `5` from (16, 48), (64, 48), (76, 48) and (100, 48), and not its
    line for nothing; in English `Sales`, `Traces:`, `1`, `of` and `5` from x = 16, 16, 64,
    76 and 94. With none found it draws its line for nothing.
15. A state on a map without traces steps exactly as before this feature: the 600 recorded
    steps of 0020 give the same digest.

## Test plan

- **Unit, `game/trace`, the map:** the traces of a map in file order; the two refusals; a map
  without trace rectangles; `wallsOf` on rectangles that include traces, and its refusal of a
  rectangle that is neither.
- **Unit, `game/trace`, the light:** on an open 20x12 grid with one trace on cell (10, 5):
  criterion 5 step by step; a break at step 30; criterion 6 with the lamp off, with the
  player turned away, with one opaque box and with one low box on the line, and with a
  standing wall between the two; criterion 7.
- **Unit, state:** the initial state of the floor; the round trips of criterion 4; the wake;
  criterion 8 with a dialogue and with the journal; the digest of criterion 15.
- **Unit, `game/notice`:** criterion 9 at 0, 119 and 120 steps after the find; both notices
  due; two finds 60 steps apart.
- **Unit, floor:** the five rectangles and their ids; the objects of 0017 unchanged;
  criterion 3 — the `detail` tiles under and below each trace, and the light from every
  feet position on the cell below the chair; every region with a trace has a name key.
- **Unit, text:** the four keys in both languages; their rules; the rule test of 0020 covers
  `journal.traces` and `journal.of`.
- **Unit, `draw-text`:** criterion 13.
- **Unit, scene:** criterion 12 — the frame per `light`, the place, the order against a wall
  and a mover.
- **Unit, `draw-journal`:** criterion 14 in both languages, with one and with five found;
  the creatures tab and the policy tab as in 0020.
- **Unit, sprites:** the generator against the committed sheet; the pixel counts.
- **Assets:** the sheet against Endesga 32, and the list of shadow assets.
- **Architecture:** unchanged, now covering `src/game/trace.ts`.
- **Smoke:** after loading, `window.shadowAi.state.traces` holds five traces, none found.
- **Fixtures:** `tests/fixtures/maps/traces.tmj`, 20x12 on the tiles of `points.tmj`: the
  spawn, a rectangle `trace:sales` on cell (10, 5) and a rectangle `shadow:marketing`.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp, `J` opens and closes the journal, `L` switches the language.

**Steps:**

1. Press `J`, then the right arrow.
2. Expected: the tab `Fälle` shows `Noch kein Fall aufgenommen.`
3. Press `J`. Walk right into the corridor and down it to the wide corridor at its end, right
   along that to the second doorway in its lower wall, and up the corridor that leads up
   above that doorway. Hold the lamp on the scrap that comes for the figure until it is
   gone. Stay in the corridor, face the violet strip in the doorway on the right and look at
   the desks behind it.
4. Expected: the desks and their screens show nothing violet.
5. Hold the lamp on the strip until it is gone and walk in. Capture the two scraps in the
   room or keep away from them. Walk to the first row of desks, to the desk at its left end,
   stand below its chair and face up. Hold `Space`.
6. Expected: a violet pattern appears on the screen of the desk and grows in two steps. After
   about a second it is gone, and a line at the bottom says
   `Spur gefunden. Sie steht im Journal.` for about two seconds.
7. Keep holding `Space` for three seconds.
8. Expected: nothing more appears on that screen.
9. Walk to the next desk of the same row, stand below its chair, face up and hold `Space`
   for three seconds.
10. Expected: nothing appears: this screen has no trace.
11. Walk to the second row of desks, to the third desk from the left. Stand below its
    chair, face up, hold `Space` for about half a second and let go.
12. Expected: the violet pattern appears, small, and is gone at once when `Space` is let go.
    No line appears at the bottom.
13. Hold `Space` again until the pattern is gone.
14. Expected: the pattern starts small again, grows, and is gone after about a second; the
    line `Spur gefunden. Sie steht im Journal.` appears.
15. Press `J`, then the right arrow.
16. Expected: the tab `Fälle` shows `Vertrieb` and below it `Spuren: 2 von 5`. The line
    `Noch kein Fall aufgenommen.` is gone.
17. Press `L`.
18. Expected: the entry reads `Sales` and `Traces: 2 of 5`.
19. Press `L`, then `J`. Find the trace of the desk at the right end of the first row, of the
    second desk from the left in the third row, and of the desk at the right end of the
    fourth row, each from below its chair.
20. Expected: at each of the three the pattern grows and goes, and the line appears at the
    bottom.
21. Press `J`, then the right arrow.
22. Expected: `Spuren: 5 von 5`.

**Feel:**

- A trace cannot be seen until the lamp is on it. Is searching sixteen desks for five a
  pleasure or a chore — should the room give a hint where to look?
- Is one second right for a find? Is the growing pattern read as "something is coming off"?
- Is the line at the bottom the right answer to a find — and are two seconds right?
- Does `Spuren: 2 von 5` say enough on the cases tab for now?
- Do the scraps in the room make the search tense in a good way, or do they only disturb?

**Result:** passed 2026-11-18, steps 1–22. Feel:

- The search: searching sixteen desks for five traces is right as it is; the room needs no hint.
- The find: one second is right, and the growing pattern reads as residue coming off.
- The line: it is the right answer to a find, and two seconds are right.
- The cases tab: `Spuren: 2 von 5` says enough for now.
- The scraps: they make the search tense in a good way.

## Open questions

None. Six were settled on 2026-11-18; five as drafted, one changed:

- Seen only in the light: a trace is invisible until the lamp is on it, and the count on the
  cases tab tells how many are left.
- Five in Sales — the draft had three: on the desks of the table, spread over the room, at
  least one in every row.
- One second, and gone: a trace is found by one second of unbroken light and is not drawn
  again.
- The words: `Vertrieb`, `Spuren: 1 von 5` and `Spur gefunden. Sie steht im Journal.`, with
  their English, as in the table under "The text".
- One feature: the trace in the world, its line on the cases tab and `drawNumber` are built
  together.
- The cut of M5: six features — 0022 traces · 0023 the shadow over the regions · 0024 the
  case of Sales · 0025 the cleared region · 0026 the call · 0027 overview won back.
