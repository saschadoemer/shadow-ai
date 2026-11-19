# 0038 — The creature of Support

**Status:** draft
**Milestone:** M6
**Drafted:** 2026-11-19

## Goal

Support has a creature of its own, and the lamp alone does not get it: the lurker sits in a
window that is open on a screen, and the light does not hold it there. The player closes the
window with `E`; the lurker drops to the floor, comes at the figure and can be captured.
Two of the five traces of Support lie under such a window. It is the first creature of the
second layer — an action in the room first, then the lamp — and with a third species the
journal's creatures tab gets pages.

## Scope

Built on 0037 as merged. No tile changes; the floor gets three rectangles.

**In:**

- A sixth kind of rectangle, `window:<region>`, and three windows in Support in
  `tools/floor-layout.ts` and `floor.tmj`.
- `GameState.windows`: the windows that are open.
- The press that closes a window, and the lurker that drops from it.
- A third species, `lurker`, in `SPECIES`; on the floor it goes by the snippet's rule.
- An open window hides the trace on its cell and holds against the light, with a notice.
- `public/sprites/lurker.png`, the species' sheet, from a generator of its own.
- The species' entry in the journal, and pages on the creatures tab.
- The language table gets three keys in German and English, and one page of the intern
  changes.
- With the implementation: `world.md` §4; `gameplay.md` §3, §6 and §7; `architecture.md`
  §2, §5, §6 and §7; `visual.md` §4; `testing.md` §2; the README.

**Out, explicitly:** a second medium creature, and devices that are unplugged (with their
cases) · a creature that only the wider cone captures (`gameplay.md` §2) · pages on the
cases tab and the policy tab — four cases and three blocks fit (with the fifth case and the
fourth block) · a Harmonic station in Support (`world.md` §6: decided in a case spec of
Act 2; not this one) · a window that opens again · a window in another department ·
picking a creature at the source (`gameplay.md` §6, with a later case) · sound.

## Behaviour

Refines `world.md` §4, `gameplay.md` §3, §6 and §7, `architecture.md` §2 and §5 and
`visual.md` §4. What is not said here is as for the snippet (0008, 0009).

### The windows

A rectangle named `window:support` in the `objects` layer is a window: exactly one cell, on
the cell of a desk with a screen. `floor.tmj` gets three, written after the objects of 0037
with the ids 139 to 141; `nextobjectid` is 142. No object of an earlier feature changes its
id.

| Window | Cell | Rectangle | Under it | Where the lurker drops |
|---|---|---|---|---|
| `window:support` | (72, 61) | (1152, 976, 16, 16) | a trace (0037) | (74, 62), feet (1192, 1000) |
| `window:support` | (93, 67) | (1488, 1072, 16, 16) | nothing | (95, 68), feet (1528, 1096) |
| `window:support` | (62, 73) | (992, 1168, 16, 16) | a trace (0037) | (64, 74), feet (1032, 1192) |

The drop point of a window is the middle of the cell two to the right of it and one below:
inside the cubicle, beside the chair, about 36 px from a player who stands below the chair.

`game/window` reads the windows of a map from its rectangles, as the rests are read (0027).
It refuses, each with its message: a box that is not one cell; a region the world data does
not know; and a window whose drop point lies outside the map or in a solid box.

`GameState.windows` is the list of the open windows, `{ window, lit }`, in the map's order:
`window` is the index among the windows of the map, `lit` says whether the lamp's light was
on it in the last step. At the start every window of the map is open. A closed window has
left the list for good.

### An open window

- **It hides its trace.** A trace whose cell is the cell of an open window is not in the
  light, whatever the lamp does: its count stays 0 and it is not drawn. The other traces
  are found as before.
- **It holds against the light.** A window is in the light by the test of a trace (0022).
  While it is, `lit` is true, nothing else happens to it, and the notice says
  `notice.window-open`. A lurker in its window is no entry of `creatures`: it cannot be
  frozen, cannot be captured and does not hit.

### Closing a window

A press of `talk` closes a window when all of this holds: no speaker is in reach — a talk
comes first —, the input does not hold `lamp` as `update` counts it, the figure is not
being pushed, and an open window is **in reach**: the centre of its cell is at most 40 px
from the figure's feet, and no opaque box lies on the line from the centre of the figure's
box, (x, y − 4), to that centre. A desk, a chair and a partition are low and do not block
the line. A window comes before a station (0035) and a rest (0027).

In that step the window leaves `windows`, and a lurker joins `creatures` at the end of the
list: `{ species: 'lurker', light: 0 }` with its feet and its home at the window's drop
point. The step goes on from there as an ordinary step; the new creature is stepped from
the next step on.

From then on the trace under the window, if there is one, is found like any other.

### The lurker on the floor

It goes by the snippet's rule in everything: it rests until the figure is closer than 64 px,
comes straight at it at 40 px per second, stops 8 px from its feet, hits by the rule of
0009, freezes in the lamp's cone and is captured after 60 lit steps. Its home is its drop
point; the wake brings it back there.

### When the case of Support is solved

What is left of the region's shadow goes with it (0025). Every window of the region that is
still open leaves `windows`; no lurker drops from it, and none is counted. Every lurker
whose home lies in the area of Support leaves `creatures`, captured or not.

### The state

`SPECIES` becomes `['snippet', 'mirage', 'lurker']`, so `captured` has a third count,
`lurker`, 0 at the start. `CreatureState` does not change. The wake keeps `windows` and sets
`lit` to false in each.

### Drawing

`public/sprites/lurker.png` is 64x16: four 16x16 frames in one row, from
`tools/placeholder-lurker.ts`. It is a shadow asset — the sixth file that may use the
signature colour `#68386c`.

- **Frame 0:** an eye. Rows 6 and 10, columns 5–10, and columns 4 and 11 in rows 7–9, are
  the signature colour; the inside, columns 5–10 and rows 7–9, is `#c0cbdc`; the pupil,
  columns 7–8 and rows 7–9, is the signature colour.
- **Frame 1:** frame 0 with the pupil on columns 8–9: it looks to the side.
- **Frame 2:** frame 0 with the inside `#ffffff`: the lurker in the light.
- **Frame 3:** the lurker in its window. A rectangle, columns 2–13 and rows 3–12: its
  border, 1 px, and row 4 inside it — the title bar — are the signature colour, the rest of
  its inside is `#c0cbdc`, and the pupil, columns 7–8 and rows 7–9, is the signature
  colour.

An open window is drawn with frame 3 on its cell, after the traces and before every figure,
in the light or not. A lurker on the floor is drawn as every creature: frames 0 and 1 in
turn, 15 steps each, and frame 2 while it is frozen.

### The notice

| Key | `de` | `en` |
|---|---|---|
| `notice.window-open` | `Hier liest etwas mit. Das Licht hält es nicht.` | `It reads along here. The light does not hold it.` |

It is shown while the lamp is on and an open window has `lit` true — as long as the light
is on it, like the line of a shadow wall that holds (0016). It says what is and tells the
player nothing to do. In the order of the notices it comes right after a wall that holds.

### The intern

One page of 0037 changes, because a player who does not think of `E` at a screen could
never solve the case. The hint that is said while traces of Support are missing becomes:

| Key | `de` | `en` |
|---|---|---|
| `talk.intern-support-traces` | `Im Support sind es wieder die Bildschirme.` / `Auf manchen ist ein Fenster offen, das keiner` / `aufgemacht hat – mach es ruhig zu.` | `In Support it is the screens again. On some` / `a window is open that nobody opened – go` / `ahead and close it.` |

### The journal

The creatures tab shows the lurker's entry once one is captured: frame 2 of its sheet, its
name and its text.

| Key | `de` | `en` |
|---|---|---|
| `creature.lurker-name` | `Mitleser` | `Lurker` |
| `creature.lurker-text` | `Eine Erweiterung im Browser, die jemand` / `installiert hat und die seither alles mitliest.` / `Solange ihr Fenster offen ist, hält sie kein` / `Licht – sie geht, wenn nur Freigegebenes läuft.` | `A browser extension somebody installed, which` / `has read everything along ever since. While` / `its window is open no light holds it – it` / `goes when only approved tools are running.` |

**Pages.** Two entries fit the screen, so the creatures tab gets pages of two entries. The
journal's state gets `page`, from 0; it is 0 when the journal opens and after every turn to
another tab. On the creatures tab a press of `down` alone turns to the next page and a
press of `up` alone to the one before; at either end the page stays. With more than one
page the tab shows which one is open — `1 von 2`, `2 of 2` — on the line of the first
entry's name, right-aligned to x = 304: the number of the page, `journal.of`, the number of
pages, with one empty cell between two parts. With one page it shows nothing more than
before. The cases tab and the policy tab have no pages; `up` and `down` do nothing there.

## Acceptance criteria

1. `floor.tmj` holds the three rectangles of the table with the ids 139 to 141 after the
   objects of 0037, which are unchanged; each lies on a desk with a screen in the area of
   Support, and each drop point is the middle of a cell without a solid box, reached on
   foot.
2. `game/window` reads them as windows with their drop points and refuses the three faulty
   maps of the spec, each with its message.
3. `SPECIES` is `['snippet', 'mirage', 'lurker']`. The initial state of the floor has three
   open windows, none lit, six creatures and `captured` `{ snippet: 0, mirage: 0, lurker:
   0 }`, and survives a JSON round trip at the start, with a window closed and with a
   lurker captured.
4. With its window open, the trace on cell (72, 61) is not found in 600 lit steps and is
   never drawn; the trace on (52, 61), which has no window, is found in the 60th.
5. While the light is on an open window its `lit` is true and the notice is
   `notice.window-open`; with the lamp off or turned away it is false and the notice is
   gone. The window stays open, and nothing is captured.
6. A press of `talk` in reach of an open window removes it from `windows` and adds one
   lurker at its drop point, with that point as its home; `captured` does not change.
7. The press is not taken out of reach, behind an opaque box, with `lamp` held or during a
   push; with a speaker in reach the talk opens instead; at a closed window it does
   nothing.
8. After the window on (72, 61) is closed, its trace is found in the 60th lit step.
9. A lurker on the floor steps exactly as a snippet at the same place would, is captured in
   the 60th lit step, and `captured.lurker` becomes 1.
10. Solving the case of Support removes every open window and every lurker of the region;
    no lurker is added and none is counted.
11. The case of Support cannot be made ready while the windows on (72, 61) and (62, 73)
    are open, and can be once both are closed.
12. The wake keeps the open windows open and the closed ones closed, sets `lit` to false
    and brings a free lurker back to its drop point.
13. `lurker.png` is 64x16, equals its generator's output, holds the four frames of the
    spec, uses only Endesga 32 with the signature colour, and is listed as a shadow asset.
14. The scene draws an open window with frame 3 on its cell, after the traces and before
    the figures, and a closed one not at all; a lurker on the floor with frames 0, 1 and 2
    by the rule of a creature.
15. With three species captured the creatures tab shows the snippet and the mirage on page
    0 and the lurker on page 1; `down` turns to page 1 and `up` back, each once per press,
    and neither goes past an end. The page is 0 after the journal opens and after a turn of
    the tab.
16. With two pages the tab draws `1 von 2` or `2 von 2` right-aligned to x = 304 on the
    line y = 35, in both languages; with one page it draws exactly what it drew before this
    feature.
17. `up` and `down` change nothing on the cases tab and the policy tab.
18. `de` and `en` hold the three new keys and the changed page of the intern, each by its
    rule.
19. A game in which no window is in the map steps exactly as before: the 600 recorded steps
    of 0020 give the same digest, with the counts of the earlier species hashed as they
    were recorded.

## Test plan

- **Unit, `game/window`:** reading and the three refusals; in reach; criteria 5 to 8, 10
  and 12 through `update` on maps built in the test.
- **Unit, `game/trace`:** criterion 4; a trace beside an open window is not hidden.
- **Unit, `game/creature`:** criterion 9 — a lurker and a snippet side by side, step for
  step.
- **Unit, `game/notice`:** the line of an open window, and its place in the order.
- **Unit, floor:** the three rectangles and their ids; the objects before them against a
  recorded digest; criterion 1; criterion 11 on the floor as loaded; every window in reach
  from the cell below its chair.
- **Unit, `game/journal`, `draw-journal`:** criteria 15 to 17; the tests of 0020 and 0032
  for one and two entries unchanged.
- **Unit, sprites, assets:** the generator against the committed sheet; criterion 13; the
  list of the shadow assets has six files.
- **Unit, scene:** criterion 14.
- **Unit, state:** criterion 3; the digest of criterion 19.
- **Unit, text:** the keys in both languages; the changed page of the intern.
- **Architecture:** unchanged.
- **Smoke:** after loading, `window.shadowAi.state.windows` holds three open windows.
- **Fixtures:** none; the maps are built in the tests.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game
has just loaded; the figure stands in the reception with the lamp — the card (0036) and the
call (0026) are passed and the lamp fetched first. Arrow keys or WASD walk, `Space` holds
the lamp, `E` or `Enter` talks, `J` opens and closes the journal.

**Steps:**

1. Walk to the doorway of Support, at the right of the lower wall of the wide corridor at
   the south of the floor. Lift the violet strip and walk in.
2. Expected: on three screens of the room a small window with an eye is open.
3. Walk to the upper row of cubicles, to the fifth cubicle of the left block — the one with
   such a window. Stand below its chair, face up and hold `Space` for three seconds.
4. Expected: nothing grows on the screen, the eye stays, and the line at the bottom says
   `Hier liest etwas mit. Das Licht hält es nicht.`
5. Let go of `Space` and press `E`.
6. Expected: the window is gone, and an eye sits on the floor to the right, inside the
   cubicle. It comes at the figure.
7. Turn to it and hold `Space` on it.
8. Expected: it turns white and is gone after about a second.
9. Face up again and hold `Space` on the screen.
10. Expected: the violet pattern grows on the screen and goes, and the line says
    `Spur gefunden. Sie steht im Journal.`
11. Capture a scrap of paper and a framed picture, if none of each is in the journal yet.
    Press `J`.
12. Expected: the tab `Kreaturen` shows two entries and, at the right of the first name,
    `1 von 2`.
13. Press the down arrow.
14. Expected: the tab shows one entry, the eye, with the name `Mitleser`, four lines, the
    first `Eine Erweiterung im Browser, die jemand`, and `2 von 2`.
15. Press the up arrow, then `J`. Walk to the break room and press `E` beside the figure in
    the blue shirt — after the cases of Sales and Marketing are solved, or else skip this
    step and the next.
16. Expected: the first line is `Im Support sind es wieder die Bildschirme.` and the second
    `Auf manchen ist ein Fenster offen, das keiner`.

**Feel:**

- Without the intern: would you have pressed `E` at the screen?
- Does the line under the lamp say enough, or too much?
- The lurker drops beside the figure. Fair, or a cheap hit?
- On the floor it is a snippet with another face. Enough, or does it need a move of its own?
- Two pages in the journal: found without being told?

**Result:** not yet walked.

## Open questions

None. Ten were settled on 2026-11-19, each as drafted:

- A medium creature, the first of the second layer: an action in the room, then the lamp.
- The name: `Mitleser` / `Lurker`, dictionary words used for a species; no trademark
  register was searched (`world.md` §5).
- Three windows on the screens of the table, two of them over a trace.
- The drop two cells beside the chair, and the snippet's rule on the floor.
- Windows that are still open close with the solved case; no lurker drops from them.
- The words of the journal entry, the notice and the intern's page.
- Pages on the creatures tab come with this feature, because a feature of pages alone
  could not be walked.
- The keys of the pages: `down` and `up`, with `1 von 2` at the right of the first name.
- The look: an eye on the floor, and the eye in a small window on a screen, until the art
  pass.
- The order of a press of `E`: a talk, then a window, then a station, then a coffee.
