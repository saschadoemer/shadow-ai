# Shadow AI

A browser game in pixel-art 2D, in the tradition of early top-down adventures, about shadow AI
in a mid-sized company. You are the head of IT. All over the building people use AI tools nobody
approved — because the tools fill gaps nobody else fills. Where data leaves the house unseen, a
shadow remains that at first only you can see. Your weapon is a lamp. Creatures are captured and
understood, never killed.

The game is a conversation opener for customers and trade fairs, and afterwards a two-to-three
hour game to play at home. German first, English second.

## Status

Early. The specification is written; the first feature — walking the campus — is drafted and not
yet built. There is nothing to run yet. The roadmap is in [docs/plan.md](docs/plan.md).

## How it is built

Spec-first, feature by feature, with AI agents working from the specification. Nothing is built
that was not approved first.

| Where | What |
|---|---|
| [CLAUDE.md](CLAUDE.md) | the root of the specification: what the game is, the hard invariants, the feature workflow, the non-goals |
| [docs/spec/](docs/spec/) | one file per area: vision, world, gameplay, visual, architecture, ops, testing |
| [docs/plan.md](docs/plan.md) | roadmap, content budget, deferred ideas |
| [docs/features/](docs/features/) | one spec per feature, with its status |
| [docs/adr/](docs/adr/) | architecture decision records |
| `src/`, `public/`, `tools/`, `tests/` | the code and what the game loads — kept strictly apart from `docs/` |

TypeScript, Canvas 2D, Vite, Vitest — and no game framework, for the reasons in
[ADR-0001](docs/adr/0001-own-engine-on-canvas-2d.md). The deliverable is a container that serves
static files.

## Licence

Code is licensed under the [MIT License](LICENSE). Art, maps and texts will carry a separate
licence, fixed before the first public release; the proposal is CC BY-NC 4.0.
