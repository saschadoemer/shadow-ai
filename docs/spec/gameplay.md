# Gameplay — Shadow AI

The mechanics that hold across the whole game. Each one arrives as a feature with its own spec in
`docs/features/`; this file records what is settled, so a later feature does not reinvent it.
Numbers marked *tune* are starting values, changed by playing.

## 1. The core loop

Explore → find traces → investigate → talk → find the source → resolve → the region clears.

The player walks a scrolling tile map, shines the lamp on the shadow, captures creatures, reads
and talks, and brings one case after the other into the light. The five verbs of the game, in the
order they arrive as features: *walk · shine · talk · collect · resolve*.

## 2. The lamp

The lamp is the weapon and the only tool. It is a directed cone of light the player holds and
sweeps. Creatures inside the light freeze; a frozen creature is **captured** into the journal. The
lamp also reveals traces on devices and lifts thin shadow walls.

Captured means understood. Nothing in this game is killed. "Capture, not defeat" is the sentence
the player should be able to repeat after the first minute.

Three upgrades over the game, each changing what the player can do:

| Upgrade | Effect |
|---|---|
| Wider cone | Captures larger creatures, lifts denser shadow |
| Colour filter | Reveals hidden traces and hidden paths; required for Management |
| Longer battery | Longer holding, for the dense zones of the server room |

**As built** (feature 0007): Space holds the lamp; there is no toggle. A figure that is being pushed cannot hold it (0009). While it is held the
figure stands and the direction keys turn it, so a sweep is a deliberate act. The cone starts at
the chest, 12 px above the feet, is 48 px long — three tiles — and opens with slope 1/2 to each
side, so it is as wide at its end as it is long; both numbers *tune*. It is drawn as a yellow
checkerboard under the figure. Nothing is lit yet: strength and the density rule arrive with
0010, the battery with M6.

**As built** (feature 0008): a creature whose body is in the cone, with no solid tile between it
and the figure, freezes. After one second of unbroken light — 60 steps, *tune* — it is captured
and gone. A break starts the second again. Solid tiles block the light: walls, and fences and
water too. The cone's picture is not cut at a wall.

## 3. Three layers of opposition

Combat matters but is never the whole answer. Every piece of shadow belongs to one layer:

1. **Small creatures** give way to the lamp. The snippet (0008) is the first: it rests until the
   figure is closer than four tiles, comes straight at it at half the figure's speed, and stops
   at its feet. A wall or a fence holds it. Free and within 10 px of the figure's feet it takes
   one point of overview (§4); frozen in the light it takes nothing.
2. **Medium creatures** need an action in the environment first — unplug the device, close the
   browser window — and then the lamp.
3. **The source** of a case gives way only to the conversation with the person behind it.

## 4. Overview

Health is called **overview**. Hits from creatures take it. At zero the player is in the dark and
wakes up in the data protection officer's office beside the reception. There is no death and no
game over, only a way back. The maximum grows by one with every solved case.

**As built** (features 0009, 0012): the figure starts with five points, shown as five small
hearts in the top-left corner. A hit takes one, pushes the figure a tile and a half straight away
from the creature — a wall holds the push — and leaves it safe for a second and a half, blinking;
all three numbers *tune*. The start value tunes as well. A frozen creature never hits: the lamp is the defence. At zero the screen
closes like an eye and opens again a second and a half later: the figure stands in the data
protection officer's office (feature 0010) with full overview, the creatures still in the world are back
at their places, and what was captured stays captured. **Open:** how overview is won back
without falling into the dark — a conversation, a place, a find — is decided when there are
figures to talk to and rooms to enter (M4, M5). The maximum grows with the first solved case
(M5).

## 5. Progression

One rule gates the world: **shadow density against light strength.** Every region has a density
(`world.md` §1); the lamp has a strength that the upgrades raise. A shadow wall gives way when
strength meets density. The same number decides which creatures can be captured and which regions
can be entered, and it is tested once.

Two keys where the story demands them: the keycard to the server room, handed over by the
convinced managing director, and one further door chosen in the case specs.

There is no money and no shop. Everything the player has was earned by solving a case.

## 6. Resolving a case

Linear and lean, by decision for the first draft (`docs/plan.md`, deferred, records the richer
alternative):

1. Traces found in the region are shadow residue on devices, visible in the lamp's light; each
   goes into the journal.
2. Conversations in the department and the break room lead to the source — the person where the
   data flow begins.
3. At the source the player **shows a matching trace** from the journal. It is a gesture, not an
   accusation: *I know what is going on, and I am not here to punish you.* The source speaks
   honestly.
4. The case resolves. The region clears for good, the journal gains a case entry and a policy
   block, more colleagues see the shadow, maximum overview grows by one.

There is no interrogation, no evidence puzzle and no choice of outcome.

## 7. The journal

The only screen besides the game itself, and the only inventory. One screen, three tabs, nothing
to click except turning pages:

- **Creatures** — every captured species: a pixel image and two to four lines on what it is in
  reality, what it feeds on, and what drives it away. The trace gesture (§6) picks from this tab.
- **Cases** — per department: traces found, people spoken to, the source, the outcome. This is
  also the progress record.
- **Policy** — one building block per solved case, two or three sentences in plain language. At
  the finale the policy is complete, and the epilogue reads it out.

There is no map in the journal. The map itself shows by colour what has been cleared.

## 8. Controls and presentation

Desktop browser with keyboard; a gamepad is a feature before the first trade fair; touch and
mobile are non-goals. Arrow keys or WASD walk, Space holds the lamp, F toggles fullscreen.
Scrolling camera on a 320x180 internal resolution (`visual.md`). Movement,
collision and camera behaviour are specified in the feature that introduces them.

## 9. Deliberately simple in the first draft

Named here so nobody adds them by habit: no branching case outcomes, no morality or reputation
system, no partial clearing of regions, no speaking hero, no dialogue choices beyond the trace
gesture, no crafting, no money. Each is either a non-goal (`vision.md` §8) or deferred with its
reason in `docs/plan.md`.
