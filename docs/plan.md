# Plan — Shadow AI

The roadmap, the content budget and the decisions that were deferred. This file controls scope
and sequence. It is **not** a source of product rules — those live in `CLAUDE.md` and
`docs/spec/`, and this file may not contradict them.

## 1. What is being built, restated

A browser game in pixel-art 2D, in the tradition of early top-down adventures, about shadow AI
in a mid-sized company. The player is the head of IT, the weapon is a lamp, the enemy is the
shadow that remains where data leaves the house unseen. Two to three hours of play; the first act
doubles as a fifteen-minute trade-fair teaser. Presented by LMIS, with one real product named
in it, Harmonic. German first, English second. Public repository,
MIT code. Built spec-first, feature by feature, each feature approved before any code.

## 2. Roadmap

Each milestone is several feature specs in `docs/features/`. The list is the sequence, not the
specification.

| # | Milestone | Marks |
|---|---|---|
| M1 | **Harness** — the base documentation: `CLAUDE.md`, `docs/spec/`, ADRs, this plan, the feature workflow | |
| M2 | **Walk the campus** — toolchain and container, surface and loop, tile map, the figure, collision, camera and the campus map (features 0001–0006) | |
| M3 | **The lamp and the first creature** — the cone of light, freezing, capturing, overview | |
| M4 | **Dialogue, language table and journal** — talking to figures, German and English through keys, the three tabs | |
| M5 | **Act 1 complete** — the call, Sales, the data protection officer, the first cleared region | **Trade-fair teaser** |
| M6 | **The cases of Act 2** — one department at a time, the upgrades and keys between them, the meeting-room side case | |
| M7 | **Server room, core and epilogue** — the dungeon, the boss, the all-hands | |
| M8 | **Save states, title screen, polish, English complete, the custom domain** | **Distribution** |

Audio arrives after M5 and before M8. A silent booth is normal; a silent distributed game is
not. A gamepad is deferred (§5). The Dockerfile and CI exist from M2. From feature 0030 on, every
merge to `main` is deployed to Cloud Run (`docs/spec/ops.md` §5): until M8 that address is a
preview of an unfinished game and is not announced; distribution stays with M8.

## 3. Content budget

Upper limits. Whoever wants more changes the number here first, then the content.

| | Budget |
|---|---|
| Department cases | 7, plus 1 side case (meeting rooms) |
| Dungeons | 1 (server room) |
| Figures | about 30 |
| Movers without a role (dogs, robot vacuums, drones) | 18 |
| Creature species | 8–10 (one per case, two or three for the server room) |
| Lamp upgrades | 3 |
| Keys | 2 |
| Policy blocks | 8 |
| Carpets with a name | 2 (LMIS, Harmonic) |
| Playing time | 2–3 hours in total; Act 1 about 15 minutes |

## 4. Open milestones, specified

### M1 — Harness

**Goal:** a repository in which an agent session can start, read `CLAUDE.md`, and know what the
game is, what must never happen, where the detail lives, and how a feature goes from idea to
code. Done when `CLAUDE.md`, every file in `docs/spec/`, `docs/adr/0001`, this plan and the
feature workflow exist, agree with each other, and the author has read and approved them.

### M2 — Walk the campus

Six features, each its own pull request with its own acceptance plan, in this order: 0001
toolchain, CI and container · 0002 surface, loop and scaling · 0003 tile map · 0004 the figure ·
0005 collision · 0006 camera and campus. Map before figure, so the figure walks on something from
the start; collision before camera, because the camera needs a map larger than the screen. M2 is
done: 0006 was the last of the six.

### M3 — The lamp and the first creature

Nine features, each its own pull request with its own acceptance plan, in this order: 0007 the
lamp · 0008 the first creature · 0009 overview · 0010 the floor · 0011 the furniture · 0012
overview hearts · 0013 lounge and gadgets · 0015 the moving floor · 0014 shadow walls and
density. The lamp before the
creature, so there is something to freeze with; overview after the creature, because a hit needs
something that hits. The hearts follow the feel note of 0009's walk and come early because they
are small. Then the world is rebuilt before more is placed in it: the campus of M2 becomes one
office floor with thin walls (0010), its furniture (0011) and what makes it lived in — seating,
coffee, coat racks and a few gadgets (0013) — because an interim state shown to others has to
read as an office. Then the floor moves (0015): four colleagues,
a dog and a robot vacuum in every room and two drones, on fixed routes. The four colleagues are
the first of the cast and come before M4 without a line of text, for the same reason — an
office in which nothing moves does not read as one — and before 0014, because its walk enters
every room. The density rule last, together with the first thing it gates — the shadow
walls, which stand in the doorways of the floor — because 0006 left the density data to M3. The
shadow as a region's colour — desaturation, the violet dithering, the clearing — arrives with the
first cleared region in M5. M3 is done: 0014 was the last of the nine.

### M4 — Dialogue, language table and journal

Six features, each its own pull request with its own acceptance plan, in this order: 0016 text
on screen · 0017 talking · 0018 everyday lines · 0019 the language switch · 0020 the journal ·
0021 help.
Text first, because everything else in the milestone is made of it: the font, the language
table in German and English and the `TextKey` arrive with one sentence — the line that says a
shadow wall is too dense for the lamp, which 0014 left to M4. Talking after it, so the dialogue
box has a font to draw with: a key to speak to a figure, lines over more than one page, and the
data protection officer as the first figure with text — one who stands, so that talking itself
is the whole feature. Then everyday lines for the four colleagues who walk the floor since
0015: they have to stop and turn before they can be spoken to. The language switch after that,
when there is enough text for English to be worth looking at; the title screen that will hold
the switch is M8, so M4 needs an interim one. The journal after it: its three tabs are text and
pictures, and its first content — the captured snippet — exists since 0008. Help last: a box
that lists every key, and a line at the start that names its own. It came out of the walk of
0019, and it follows the journal because it lists the journal's key and uses its press. All six
are implemented. M4 is done: 0021 was the last of the six.

### M5 — Act 1 complete

Seven features, each its own pull request with its own acceptance plan, in this order: 0022
traces · 0023 the shadow over the regions · 0024 the case of Sales · 0025 the cleared region ·
0026 the call · 0027 overview won back · 0031 the help label. Traces first, because finding them is the next verb of
the game and every case begins with it: shadow residue on devices, seen only in the lamp's
light, counted on the journal's cases tab. Then the shadow over the regions, so that a room
under shadow looks it before the first one is cleared — `visual.md` §4 has asked for the grey
and the violet veil since M1. The case of Sales after it: the conversations that lead to the
source, the trace shown to it, the entry and the policy block in the journal. The cleared
region next, because it is the answer to the case and the picture the teaser ends on: colour
returns, more colleagues see the shadow, overview grows by one. The call last of the story:
the customer on the phone, the first sight of the shadow and the lamp handed over can be told
once there is a case to walk into. Overview won back after it; `gameplay.md` §4 has left it
open since 0009. The help label closes the milestone: the line that named the help's key for
ten seconds, right after the call, was on screen too long, and a small label in the corner
that stays takes its place. It comes after 0027 because it takes a field out of the state to
which 0027 adds one. All seven are implemented; the two named below are not, so M5 stays
open until they are built.

Two more, both for the teaser (`vision.md` §10): 0039 the carpets — the names LMIS and
Harmonic, each on a carpet in a corridor — and 0036 LMIS presents — the line that says so, on
a card before the call, which needs a place before the title screen of M8. They are built
with the features of M6 that make the build playable (below). 0035, the Harmonic station,
was built and rejected in its acceptance walk: a desk that emptied a room of its creatures
took too much of the play.

### M6 — The cases of Act 2

The cases come one department at a time, and each brings what Act 2 has more than Act 1. The
first three features, each its own pull request with its own acceptance plan: 0028 the case
of Marketing · 0029 the wider cone · 0032 the creature of Marketing. The case first, by the
rules the case of Sales set — traces, the source's answer, the journal, the cleared room — so
that a second case proves the first one's rules before anything is added to them. The wider
cone after it, because the case of Marketing earns it and HR and Accounting open with it. The
creature of Marketing third: every case has its species (`world.md` §4), and the second
species brings what the journal still lacks — a choice among its entries, and pages.

Seven features for a build that can be played from the call to a close by somebody who was
only sent the address: 0032 the creature of Marketing · 0033 the intern · 0034 the close ·
0039 the carpets · 0036 LMIS presents · 0037 the case of Support · 0038 the creature of
Support. They are built in this order. 0032 to 0034 are implemented; 0039 is a draft; the
other three are approved.
The creature first, so that the second room has opposition; it is cut small — the choice
among the journal's entries and its pages wait for a later case and the third species. The
intern after it: the hint system `world.md` §3 has named since M1, one figure in the break
room who says where the next step is. The close last, because it follows whatever the last
case is: the story says once that the rest of the floor follows, and the game goes on.
Then the two that M5 still names for the teaser — the carpets with the names LMIS and
Harmonic, and the card on which LMIS presents the game — and
then the case of Support, by the rules of the first two, so that the third open door leads
somewhere. Last its creature, the first of the second layer (`gameplay.md` §3): it sits in
a window on a screen, and the player closes the window before the lamp can hold it. With a
third species the journal's creatures tab gets pages.

Named here without a number and specified when their turn comes: the
cases of HR and Accounting · the colour filter · the case of Development · the meeting rooms'
side case · the vendor in every department ·
who sees the shadow · the two keys · Management and the last case. 0028 and 0029 are implemented.

## 5. Deferred, with reasons

Ideas judged good and set aside for the first draft. Each records why, so it is not re-argued
from scratch and not forgotten.

- **Three outcomes per case — forbid, replace, approve.** Forbidding would be instant but clear a
  region only partially (grey, not colour); replacing would need an approved alternative, often
  from the vendor once he is an advisor; approving would need a matching policy block; a grey
  region could be upgraded later by returning. The attitude the game is about would become its
  mechanic, and backtracking would have a purpose. Deferred because it multiplies dialogue per
  source and needs balancing the first draft cannot afford. Looked at again on 2026-11-18,
  when M6 was cut and the first case had been played: Act 2 stays linear. The idea stays
  here, without a date.
- **The mirror case.** A case in IT itself — an admin running an unapproved model under his desk
  — so the player has to bring his own house into the light. Cut from the first draft to keep the
  case count at seven; the humility it adds is wanted. Looked at again on 2026-11-18, when M6
  was cut: not yet. It would need a room for IT on the floor and an eighth case in the
  budget of §3; it stays here.
- **Environmental puzzles as resolution.** Rerouting data flows, switches, light beams. Kept as a
  *way* to the source in dense regions and the server room, not as the resolution of a case.
- **Gamepad.** The directional pad or the left stick walks, one button holds the lamp, beside
  the keyboard. Deferred because the first use of the game is the public URL, played at a desk
  with a keyboard, not the booth; a pad earns its place only where people play standing up.
  The game reads named actions, so a pad stays an addition to the input table
  (`architecture.md` §4). Fullscreen cannot be started from a pad — browsers grant it only on a
  key press or a click. Revisit before the first trade fair.
- **Camera lerp and dead zone.** Centred and clamped first; softened only if play demands it.
- **Audio source.** Chiptune and effects — generated, licence-free or home-made — decided when
  audio becomes a feature.
