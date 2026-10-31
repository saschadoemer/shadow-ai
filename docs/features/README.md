# Feature specs

One file per feature, numbered in the order they were drafted. Each carries a status; the
workflow that moves it is `CLAUDE.md` §3 and is repeated here in one line each:

- `draft` — written by an agent, may change freely, builds nothing.
- `approved` — the author said so in conversation; the agent recorded the date. Code may now be
  written, and only what the spec says.
- `implemented` — tests green, spec files updated, the author has played it and merged the pull
  request.

A feature spec refines the specification in `docs/spec/`; it never contradicts it. Where it
would, the spec is changed first. Once a feature is implemented, what is durable about it lives in
`docs/spec/`, and the feature file stays as history of how it got there.

Use `0000-template.md`. Numbers are numbers: "80 px/s", not "a comfortable speed". Every spec
carries an acceptance plan for the manual test (`docs/spec/testing.md` §5); without one it is not
approved. A feature is the smallest change the author can test by hand in a few minutes — when
the plan grows past that, the feature is cut in two.

| # | Feature | Milestone | Status |
|---|---|---|---|
| [0001](0001-toolchain-ci-container.md) | Toolchain, CI and container | M2 | draft |
| [0002](0002-surface-loop-scaling.md) | Surface, loop and scaling | M2 | draft |
| [0003](0003-tile-map.md) | Tile map | M2 | draft |
| [0004](0004-the-figure.md) | The figure | M2 | draft |
| [0005](0005-collision.md) | Collision | M2 | draft |
| [0006](0006-camera-and-campus.md) | Camera and campus | M2 | draft |
