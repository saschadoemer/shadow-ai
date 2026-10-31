# Plan — Shadow AI

The roadmap, the content budget and the decisions that were deferred. This file controls scope
and sequence. It is **not** a source of product rules — those live in `CLAUDE.md` and
`docs/spec/`, and this file may not contradict them.

## 1. What is being built, restated

A browser game in pixel-art 2D, in the tradition of early top-down adventures, about shadow AI
in a mid-sized company. The player is the head of IT, the weapon is a lamp, the enemy is the
shadow that remains where data leaves the house unseen. Two to three hours of play; the first act
doubles as a fifteen-minute trade-fair teaser. German first, English second. Public repository,
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
| M8 | **Save states, title screen, polish, English complete, the Cloud Run pipeline** | **Distribution** |

Audio arrives after M5 and before M8. A silent booth is normal; a silent distributed game is
not. A gamepad arrives before M5. Until M8 the game runs locally from its container
(`docs/spec/ops.md` §3); the Dockerfile and CI exist from M2.

## 3. Content budget

Upper limits. Whoever wants more changes the number here first, then the content.

| | Budget |
|---|---|
| Department cases | 7, plus 1 side case (meeting rooms) |
| Dungeons | 1 (server room) |
| Figures | about 30 |
| Creature species | 8–10 (one per case, two or three for the server room) |
| Lamp upgrades | 3 |
| Keys | 2 |
| Policy blocks | 8 |
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
done when 0006 is implemented.

## 5. Deferred, with reasons

Ideas judged good and set aside for the first draft. Each records why, so it is not re-argued
from scratch and not forgotten.

- **Three outcomes per case — forbid, replace, approve.** Forbidding would be instant but clear a
  region only partially (grey, not colour); replacing would need an approved alternative, often
  from the vendor once he is an advisor; approving would need a matching policy block; a grey
  region could be upgraded later by returning. The attitude the game is about would become its
  mechanic, and backtracking would have a purpose. Deferred because it multiplies dialogue per
  source and needs balancing the first draft cannot afford. Revisit after M5, when the linear
  version has been played.
- **The mirror case.** A case in IT itself — an admin running an unapproved model under his desk
  — so the player has to bring his own house into the light. Cut from the first draft to keep the
  case count at seven; the humility it adds is wanted. Revisit when Act 2 is being filled.
- **Environmental puzzles as resolution.** Rerouting data flows, switches, light beams. Kept as a
  *way* to the source in dense regions and the server room, not as the resolution of a case.
- **Camera lerp and dead zone.** Centred and clamped first; softened only if play demands it.
- **Audio source.** Chiptune and effects — generated, licence-free or home-made — decided when
  audio becomes a feature.
