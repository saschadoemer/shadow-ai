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

Use `0000-template.md`. Numbers are numbers: "80 px/s", not "a comfortable speed".

| # | Feature | Milestone | Status |
|---|---|---|---|
| [0001](0001-walk-the-campus.md) | Walk the campus | M2 | draft |
