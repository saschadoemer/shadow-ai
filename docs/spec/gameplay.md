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

## 3. Three layers of opposition

Combat matters but is never the whole answer. Every piece of shadow belongs to one layer:

1. **Small creatures** give way to the lamp.
2. **Medium creatures** need an action in the environment first — unplug the device, close the
   browser window — and then the lamp.
3. **The source** of a case gives way only to the conversation with the person behind it.

## 4. Overview

Health is called **overview**. Hits from creatures take it. At zero the player is in the dark and
wakes up in the data protection officer's office on the courtyard. There is no death and no game
over, only a way back. The maximum grows by one with every solved case.

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
2. Conversations in the department and the canteen lead to the source — the person where the
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
mobile are non-goals. Scrolling camera on a 320x180 internal resolution (`visual.md`). Movement,
collision and camera behaviour are specified in the feature that introduces them.

## 9. Deliberately simple in the first draft

Named here so nobody adds them by habit: no branching case outcomes, no morality or reputation
system, no partial clearing of regions, no speaking hero, no dialogue choices beyond the trace
gesture, no crafting, no money. Each is either a non-goal (`vision.md` §8) or deferred with its
reason in `docs/plan.md`.
