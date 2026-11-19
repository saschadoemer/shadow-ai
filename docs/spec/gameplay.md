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
checkerboard under the figure. The battery arrives with M6.

**As built** (feature 0026): the player starts without the lamp. Until the data protection
officer hands it over, Space does nothing: no cone, nothing freezes, no wall is lit, no trace is
seen, and the figure walks with the key held. The creatures hit as always, and the dark wakes
the figure in her office — beside her. From the step that closes the first meeting a line at
the bottom says `Die Lampe: Leertaste halten.`, until the lamp is held once; it does not come
back.

**As built** (feature 0008): a creature whose body is in the cone, with no solid tile between it
and the figure, freezes. After one second of unbroken light — 60 steps, *tune* — it is captured
and gone. A break starts the second again. Solid tiles block the light: walls, and fences and
water too. The cone's picture is not cut at a wall.

**As built** (feature 0014): the lamp has a strength, 1 at the start; nothing raises it before
M6. A shadow wall is in the light when its box, edges included, meets the cone and nothing
opaque lies on the line from the centre of the figure's box to the nearest point of the wall —
the last pixel along the wall, not the corner past its end. After one second of unbroken light,
60 steps as for a creature, a wall whose density the strength meets is lifted for good. A denser
wall stands still in the light and holds. A standing wall is solid for the figure, the push and
the creatures, and the light stops at it; other walls do not count on the line to a wall.

**As built** (feature 0016): while a wall holds against the lamp, the game says so in one line
at the bottom of the screen — `Dieser Schatten ist zu dicht für die Lampe.` The line is there as
long as the light is on the wall and gone with it: when Space is let go, when the figure turns
away, when it is pushed.

**As built** (feature 0022): a trace is shadow residue on a device. It cannot be seen until the
lamp's light is on it; in the light it shows and grows. After one second of unbroken light — 60
steps, the number of a capture — it is found and gone from the world. A break starts the second
again. The light test is the shadow wall's, but against the map with the walls standing, as for
a creature: a trace is not found through a standing shadow wall. A desk, a screen and a
partition are low and do not stop the light. When a trace is found, the line at the bottom says
`Spur gefunden. Sie steht im Journal.` for two seconds; a wall that holds says its own line
first.

**As built** (feature 0029): the wider cone is the first upgrade. It comes with the step that
solves the case of Marketing; nobody hands it over. From then on the cone opens with slope 3/4
to each side instead of 1/2 — 72 px wide at its end, one and a half times as wide, *tune* —
and stays 48 px long. Everything the light does, it does in the wider cone: a creature
freezes, a wall is lit and a trace is seen. The same step raises the lamp's strength to 2. A
line at the bottom says `Die Lampe leuchtet jetzt breiter und stärker.` for two seconds, after
the two seconds of the solved case's line. Larger creatures that only the wider cone captures
come with the first of them.

## 3. Three layers of opposition

Combat matters but is never the whole answer. Every piece of shadow belongs to one layer:

1. **Small creatures** give way to the lamp. The snippet (0008) is the first: it rests until the
   figure is closer than four tiles, comes straight at it at half the figure's speed, and stops
   at its feet. A wall or a fence holds it. Free and within 10 px of the figure's feet it takes
   one point of overview (§4); frozen in the light it takes nothing.
2. **Medium creatures** need an action in the environment first — unplug the device, close the
   browser window — and then the lamp.
3. **The source** of a case gives way only to the conversation with the person behind it.

**As built** (feature 0025): when a case is solved, what is left of its region's shadow goes
with it. The creatures whose home is in the region and that were not captured leave the game
in that step — they are not captured, and the journal does not count them — and so does the
region's shadow wall if it still stands. A creature whose home is outside the region stays,
wherever it is at that moment: the snippet of the east corridor is still there after Sales.

**As built** (feature 0032): the mirage is the second small creature, and it does not come as
the snippet does. It moves only while it is not looked at — while it is not ahead of the figure,
or something opaque stands between them. Looked at, it stands at any distance; not looked at, it
comes straight at the figure from closer than six tiles, at three quarters of the figure's
speed, and stops at its feet. Ahead is half of the map: everything in front of the figure, by
its facing. So one mirage is harmless while the player faces it, and two are a problem: finding
a trace means looking at a screen with the back to the room. In the light it is frozen and
captured like the snippet, and it hits like the snippet.

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
at their places, and what was captured stays captured.

**As built** (feature 0027): overview is won back with a coffee. A press of E or Enter at a
coffee machine — at most two tiles from its cell, and not through a wall — fills the hearts,
all of them, as often as the player walks there: the walk is the price. A line at the bottom
answers every press for two seconds: `Kaffee. Der Überblick ist wieder da.`, or
`Kaffee. Den Überblick hast du schon.` when the hearts were full. Every coffee machine of the
floor counts, but one in a room under shadow gives nothing — `Dieser Kaffee schmeckt nach
nichts.` — until that room is cleared. At the start only the two of the break room work; every
solved case brings a safe place nearer. The game goes on while the figure drinks: a creature
that reaches it in the same moment still hits. A coffee never raises the maximum; only a solved
case does.

**As built** (feature 0024): the step that solves a case raises the maximum by one and fills
overview to it, whatever it stood at — six full hearts after Sales.

## 5. Progression

One rule gates the world: **shadow density against light strength.** Every region has a density
(`world.md` §1); the lamp has a strength that the upgrades raise. A shadow wall gives way when
strength meets density. The same number decides which creatures can be captured and which regions
can be entered, and it is tested once.

**As built** (feature 0014): the rule lives in `src/game/world.ts` — the density of every region,
the lamp's base strength of 1, and the upgrades in the order they are earned, each with the region
it is earned in and each raising the strength by 1. `gatingFaults` checks the order: no density
outside 0–3, none above what the lamp reaches with every upgrade, and no upgrade earned in a region
the lamp cannot open before it. Nothing earns an upgrade before M6.

**As built** (feature 0029): the step that solves a case earns the upgrade of its region, when
the table has one and the player does not have it yet. The upgrades the player has are in the
state, in the order they were earned, and the lamp's strength is the base strength plus their
number. Solving Marketing earns the wider cone and a strength of 2: the shadow walls of HR and
Accounting give way after one second of light, and the wall of Development still holds.
Solving Sales earns nothing. The rooms of HR and Accounting can be entered from then on; their
cases come with their own features.

Two keys where the story demands them: the keycard to the server room, handed over by the
convinced managing director, and one further door chosen in the case specs.

There is no money and no shop. Everything the player has was earned by solving a case.

## 6. Resolving a case

Linear and lean, by decision for the first draft (`docs/plan.md`, deferred, records the richer
alternative):

1. Traces found in the region are shadow residue on devices, visible in the lamp's light; each
   goes into the journal. *As built* (feature 0022): the five traces of Sales; (feature 0028)
   the five of Marketing; (feature 0037) the five of Support.
2. Conversations in the department and the break room lead to the source — the person where the
   data flow begins.
3. At the source the player **shows a matching trace** from the journal. It is a gesture, not an
   accusation: *I know what is going on, and I am not here to punish you.* The source speaks
   honestly.
4. The case resolves. The region clears for good, the journal gains a case entry and a policy
   block, more colleagues see the shadow, maximum overview grows by one.

There is no interrogation, no evidence puzzle and no choice of outcome.

**As built** (feature 0024): the case of Sales. Its source is the colleague in the pink shirt
who walks between the cubicles and the coffee. While a trace of Sales is missing, the colleague
says the everyday line. With all five found, a talk is the gesture: the colleague answers
honestly in two pages, and the hero says nothing. There is no key, no screen and no picture for
the gesture. The press that closes the answer solves the case: the journal gains the outcome
and the policy block, a notice says so for two seconds, and overview grows by one. Afterwards
the colleague says something else, every time. Picking a creature from the journal comes with
the second species (M6).

**As built** (feature 0025): the solved case clears its region for good. In the frame after
the press the room is in its colours again, and the violet veil over it thins out in three
parts over two seconds and is gone (`visual.md` §4). The game goes on while it happens. A
region is cleared exactly when its case is solved; nothing else is stored about it. More
colleagues who see the shadow, as a rule of the game, come with M6, and the first act has no
end card: it ends in the cleared room, and the game goes on.

**As built** (feature 0034): the game says when the player has done everything there is. This
is no end card of an act: it follows the last case of the game, not Act 1, and nothing ends.
Five seconds after the step that solved the last case — the line of the solved case and the
line of an upgrade are over, and a second of quiet has followed — the story opens a scene of
three pages by itself (`vision.md` §4). It waits while the dark, the help, the journal, a talk
or a push has the step, and it comes before the journal and before a talk in the step it
opens. E or Enter turns its pages; the last press closes it, and it never opens again. The
rule reads the list of the cases: a case that is added moves the close behind it.

**As built** (feature 0028): the case of Marketing, by the same rules and with nothing added
to them. Its source is the colleague in the red shirt who walks between the desk islands and
the printer. Its five traces lie on four screens and on the printer. With all five found the
colleague answers in two pages, and the press that closes the answer solves the case and
clears the room: overview grows by one again, to seven with both cases solved. The two cases
do not depend on each other: Marketing is open from the start, and the player may solve it
before Sales. What a case of Act 2 has more than the first — its species, the upgrade it
earns, the vendor — comes with features of their own.

**As built** (feature 0037): the case of Support, by the same rules. Its source is the
colleague in the orange shirt who walks between the cubicles and the printer. Its five traces
lie on five screens, at least one in each row of cubicles. With all five found the colleague
answers in two pages, and the press that closes the answer solves the case and clears the
room: overview grows by one, to eight with all three cases solved. The three cases do not
depend on each other and may be solved in any order. The case earns no upgrade. The close
(feature 0034) follows the last case of the game, so it now waits for Support too.

**As built** (feature 0036): three pages of talk name Harmonic, and no rule of a case changed
(`vision.md` §10). The page the colleague of Sales says after the case no longer asks what to
use next time: it says that something like Harmonic would have shown where the text goes. On
the second page of the close the management says that with Harmonic the house would have seen
it before the customer did. The third is a page of the data protection officer (§8). No page
of an answer and no everyday line holds the name.

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

The help (feature 0021) is no second screen: it is a box over whatever is on screen, as the
dialogue box is.

**As built** (feature 0020): a press of J opens the journal on the creatures, and a second press
closes it. The left and right keys of walking turn the three tabs, one tab per press, and stop
at either end; the journal always opens on the creatures. The game stands still while it is
open: nothing moves, nothing can hurt the player, and everything goes on where it stood when it
closes. A species has its entry as soon as one of it is captured: its own 16x16 picture, its
name and two to four lines. The cases and the policy say in one line that they are empty; their
content comes with M5. There is no count of captures and no pages within a tab yet. J does
nothing with a dialogue open and nothing in the dark.

**As built** (feature 0022): the cases tab lists every department of which a trace is found, in
the order of the world data — its name and `found of all`, as in `Vertrieb` and
`Spuren: 1 von 5` below it. Until a trace is found it shows its line for nothing. People spoken
to, the source and the outcome come with 0024.

**As built** (feature 0024): a solved case gets a third line, its outcome, as in
`Gelöst: Angebote gingen in einen Chatbot.` People spoken to and the source are not listed. The
policy tab shows one block per solved case, in the order they were solved, two to four lines
each; until a case is solved it shows its line for nothing. Two blocks fit the screen; pages
within the tab come with the third (M6).

**As built** (feature 0028): with two cases the cases tab shows two entries, the second 36 px
below the first, in the order of the world data — Sales, then Marketing — whichever was
solved first. The policy tab shows the two blocks in the order they were solved, the second
60 px below the first.

**As built** (feature 0037): with three cases the cases tab shows three entries, 36 px apart,
in the order Sales, Marketing, Support. The policy tab stacks its blocks by their height: the
first starts at (16, 36), and each further one 12 px below the last line of the block before
it — after a block of four lines 60 px lower, as before, and after a block of three lines 48
px lower. The three blocks of today, of four, three and three lines, fit the screen in every
order: the last line ends at y = 178. Pages on this tab come with the fourth block.

**As built** (feature 0032): with a second species the creatures tab shows two entries, the
second 72 px below the first, in the order of the species — the snippet, then the mirage —
whichever was captured first. Two entries fit the screen; pages come with the third species.

**As built** (feature 0026): the journal does not open while the call is read, like under any
dialogue. After it, J opens it with or without the lamp.

## 8. Controls and presentation

Desktop browser with keyboard; a gamepad is deferred (`docs/plan.md` §5); touch and
mobile are non-goals. Arrow keys or WASD walk, Space holds the lamp, E or Enter talks to a
figure and turns the pages of what it says, J opens and closes the journal, F toggles
fullscreen, L switches between German and English, H opens and closes the help.
Scrolling camera on a 320x180 internal resolution (`visual.md`). Movement,
collision and camera behaviour are specified in the feature that introduces them.

**As built** (feature 0017): a press of E or Enter within 40 px of a standing figure (feature
0018; it was 24) — between the feet of the two — opens a dialogue. The two turn to each other, and the figure's first page
appears in a box at the bottom of the screen. A press turns to the next page; a press on the
last page closes the box. While it is open the world stands still: nothing moves, nothing can
hurt the player, the lamp is off and the other keys do nothing. A press does not open a dialogue
while the lamp is held or while the player is being pushed. A held key counts once.

**As built** (feature 0018): the four colleagues who walk the floor can be spoken to as well. A
press reaches a speaker — a standing figure or a colleague — at most 40 px away and in sight,
that is with nothing opaque between the two: a counter, a desk or a chair does not stop a
conversation, a wall does. The colleague stands where it is and turns to the player. Each has one
saying of one page, the same every time. After it the colleague goes on its round, and keeps its
facing until it moves.

**As built** (feature 0033): a player who does not know where to go asks the intern in the break
room. He is spoken to like the data protection officer and has one page — the hint of that
moment (`world.md` §3). Asking costs nothing and changes nothing. At a coffee machine a press
of E still takes the coffee: he stands out of reach of every place from which a machine is in
reach.

**As built** (feature 0019): a press of L switches the language at any moment — while walking,
with the lamp held, with a dialogue open, in the dark. Every text on screen changes at once: the
notice, and the page of an open dialogue, which shows the same page in the other language.
Where no text is on screen, a line in the notice's bar names the language that is on, in that
language, for two seconds: `Sprache: Deutsch` or `Language: English`. A held key switches once.
Every load starts in German, and nothing is remembered. The title screen of M8 will hold the
switch.

**As built** (feature 0026): the game opens with the call — three pages in the dialogue box
that the story itself says, with no figure speaking. E or Enter turns the page and closes the
third; until then the world stands still and the other keys do nothing, as with every dialogue.
There is no way to skip it before M8. In the first meeting the data protection officer says her
first page and then the page that hands the lamp over; afterwards she says her two pages of
0017. A press of E opens a dialogue with Space held as long as the player has no lamp.

**As built** (feature 0036): before the call a game shows a card — a dark screen with two
lines in its middle, `LMIS präsentiert` and, below it, `Shadow AI`. It ends by itself after
three seconds, or at a press of E or Enter, and the call follows on its first page; the press
that ended the card does not turn that page. While the card is shown no other key of the game
does anything. L switches the language on it as everywhere, and F toggles fullscreen. The
card is the stand-in for the title screen of M8 and goes when that comes. A page that is
loaded anew shows it again. The data protection officer's own talk has a third page since
this feature, the one that compares Harmonic with the lamp; the first meeting keeps its two
pages, so she says it only once the lamp is handed over.

**As built** (feature 0027): E and Enter also take a coffee at a coffee machine (§4). A
colleague or a figure in reach comes first: then the press opens the dialogue. The press does
nothing at a machine while the lamp is held or the figure is being pushed. The help still lists
E as the key to talk.

**As built** (feature 0021): a press of H opens the help, a box over the game with seven rows —
a key and what it does — and a second press closes it. The game stands still while it is open,
and everything goes on where it stood when it closes. The help opens over a dialogue and over
the journal, which keep their page and their tab, and not in the dark. A held key counts once.

**As built** (feature 0031): a small label in the top right corner names the key of the help
for as long as the world is on screen — `H Hilfe` or `H Help` — also during a dialogue and with
the help open. The journal's screen does not have it. The line that named the key at the start
is gone.

## 9. Deliberately simple in the first draft

Named here so nobody adds them by habit: no branching case outcomes, no morality or reputation
system, no partial clearing of regions, no speaking hero, no dialogue choices beyond the trace
gesture, no crafting, no money. Each is either a non-goal (`vision.md` §8) or deferred with its
reason in `docs/plan.md`.
