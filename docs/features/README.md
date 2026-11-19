# Feature specs

One file per feature, numbered in the order they were drafted. Each carries a status; the
workflow that moves it is `CLAUDE.md` §3 and is repeated here in one line each:

- `draft` — written by an agent, may change freely, builds nothing.
- `approved` — the author said so in conversation; the agent recorded the date. Code may now be
  written, and only what the spec says.
- `implemented` — tests green, spec files updated, the author has walked the acceptance plan
  with the agent. Set on the branch after the walk, in the feature's own pull request, which the
  author merges.
- `rejected` — turned down by the author, as a draft or in its walk. Nothing of it is on
  `main`; the file stays as history.

A feature spec refines the specification in `docs/spec/`; it never contradicts it. Where it
would, the spec is changed first. Once a feature is implemented, what is durable about it lives in
`docs/spec/`, and the feature file stays as history of how it got there.

Use `0000-template.md`. Numbers are numbers: "80 px/s", not "a comfortable speed". Every spec
carries an acceptance plan for the manual test (`docs/spec/testing.md` §5); without one it is not
approved, and without a passed walk no pull request is opened. A feature is the smallest change
the author can test by hand in a few minutes — when the plan grows past that, the feature is cut
in two.

| # | Feature | Milestone | Status |
|---|---|---|---|
| [0001](0001-toolchain-ci-container.md) | Toolchain, CI and container | M2 | implemented 2026-11-02 |
| [0002](0002-surface-loop-scaling.md) | Surface, loop and scaling | M2 | implemented 2026-11-02 |
| [0003](0003-tile-map.md) | Tile map | M2 | implemented 2026-11-02 |
| [0004](0004-the-figure.md) | The figure | M2 | implemented 2026-11-03 |
| [0005](0005-collision.md) | Collision | M2 | implemented 2026-11-08 |
| [0006](0006-camera-and-campus.md) | Camera and campus | M2 | implemented 2026-11-11 |
| [0007](0007-the-lamp.md) | The lamp | M3 | implemented 2026-11-12 |
| [0008](0008-the-first-creature.md) | The first creature | M3 | implemented 2026-11-12 |
| [0009](0009-overview.md) | Overview | M3 | implemented 2026-11-13 |
| [0010](0010-the-floor.md) | The floor | M3 | implemented 2026-11-13 |
| [0011](0011-the-furniture.md) | The furniture | M3 | implemented 2026-11-13 |
| [0012](0012-overview-hearts.md) | Overview hearts | M3 | implemented 2026-11-13 |
| [0013](0013-lounge-and-gadgets.md) | Lounge and gadgets | M3 | implemented 2026-11-13 |
| [0014](0014-shadow-walls-and-density.md) | Shadow walls and density | M3 | implemented 2026-11-16 |
| [0015](0015-the-moving-floor.md) | The moving floor | M3 | implemented 2026-11-13 |
| [0016](0016-text-on-screen.md) | Text on screen | M4 | implemented 2026-11-17 |
| [0017](0017-talking.md) | Talking | M4 | implemented 2026-11-17 |
| [0018](0018-everyday-lines.md) | Everyday lines | M4 | implemented 2026-11-18 |
| [0019](0019-the-language-switch.md) | The language switch | M4 | implemented 2026-11-18 |
| [0020](0020-the-journal.md) | The journal | M4 | implemented 2026-11-18 |
| [0021](0021-help.md) | Help | M4 | implemented 2026-11-18 |
| [0022](0022-traces.md) | Traces | M5 | implemented 2026-11-18 |
| [0023](0023-the-shadow-over-the-regions.md) | The shadow over the regions | M5 | implemented 2026-11-18 |
| [0024](0024-the-case-of-sales.md) | The case of Sales | M5 | implemented 2026-11-18 |
| [0025](0025-the-cleared-region.md) | The cleared region | M5 | implemented 2026-11-18 |
| [0026](0026-the-call.md) | The call | M5 | implemented 2026-11-18 |
| [0027](0027-overview-won-back.md) | Overview won back | M5 | implemented 2026-11-18 |
| [0028](0028-the-case-of-marketing.md) | The case of Marketing | M6 | implemented 2026-11-18 |
| [0029](0029-the-wider-cone.md) | The wider cone | M6 | implemented 2026-11-19 |
| [0030](0030-cloud-run-deployment.md) | Cloud Run deployment | M8 | implemented 2026-11-18 |
| [0031](0031-the-help-label.md) | The help label | M5 | implemented 2026-11-19 |
| [0032](0032-the-creature-of-marketing.md) | The creature of Marketing | M6 | implemented 2026-11-19 |
| [0033](0033-the-intern.md) | The intern | M6 | implemented 2026-11-19 |
| [0034](0034-the-close.md) | The close | M6 | implemented 2026-11-19 |
| [0035](0035-the-harmonic-station.md) | The Harmonic station | M5 | rejected 2026-11-19 |
| [0036](0036-lmis-and-harmonic.md) | LMIS and Harmonic | M5 | implemented 2026-11-19 |
| [0037](0037-the-case-of-support.md) | The case of Support | M6 | approved 2026-11-19 |
| [0038](0038-the-creature-of-support.md) | The creature of Support | M6 | approved 2026-11-19 |
