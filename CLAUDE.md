# CLAUDE.md — Shadow AI

Authoritative root of the specification. This file holds only what is true in every session. The
detail lives in `docs/` and is read when you work in that area — see the file map in §7. When an
instruction here conflicts with a habit, a framework default or a "best practice" you would
otherwise apply, **this document wins**. When something is genuinely not covered anywhere, ask
rather than invent.

Code and documentation live in one repository, strictly apart. `src/`, `public/`, `tools/` and
`tests/` hold code and what the game loads at run time. `docs/` holds everything we know about the
game. Knowledge goes into `docs/`, never into code comments or TODOs. A TODO is not a spec.

---

## 1. What this is

**Shadow AI** is a browser game with pixel-art 2D graphics in the tradition of early top-down
adventures (The Legend of Zelda, Ocean's Heart). The player is the head of IT of a mid-sized
company. All over the building people use AI tools nobody approved — because the tools fill gaps
nobody else fills. Where data leaves the house unseen, a shadow remains that at first only the
player can see. The weapon is a lamp. Creatures are captured and understood, never killed.

Two purposes, in this order: a **conversation opener** for customers and trade fairs — the first
act is a fifteen-minute teaser — and a **game people play at home** afterwards, two to three
hours, distributed as a public URL. German first, English second.

The message everything is checked against: **the enemy is not the colleague who uses a tool. The
enemy is the shadow — the absence of safe, approved ways. You win by making the shadow
unnecessary, not by forbidding.** `docs/spec/vision.md` holds the story, the pillars and the tone.

Technically: TypeScript (strict), Canvas 2D, Vite, Vitest, no game framework (ADR-0001). A static
site served by nginx from a container. Cloud Run is the target; until the end of the project the
container runs locally.

---

## 2. Hard invariants

Violating one is a defect even if the feature works. Each names the test that enforces it; a
change that weakens the test has violated the invariant.

- **INV-1 — Game logic is plain data and pure functions.** `GameState` is a plain object that
  survives a JSON round trip unchanged: no classes with behaviour, no functions in state, no
  hidden state in modules. `src/game/` updates state and does nothing else. *Test:* a round-trip
  equality test on a populated state, plus INV-2. *Why:* save states (M8) become a feature, not a
  rewrite, and every rule in the game can be tested without a browser.
- **INV-2 — `src/game/` touches no browser and no renderer.** No import from `src/render/`, no
  `window`, `document`, `HTMLCanvasElement`, `Image`, `fetch` or any other DOM name inside
  `src/game/`. Rendering reads state and never changes it. *Test:* `tests/arch/` walks the import
  graph and the source text for forbidden names.
- **INV-3 — Fixed logic step at 60 Hz.** The game advances in steps of exactly 1/60 s. Rendering
  happens once per browser frame. After a stall at most five steps are caught up; the rest is
  dropped. *Test:* unit tests on the loop with a fake clock.
- **INV-4 — Every visible string goes through a key.** No literal text a player can read exists
  in `src/`. Text comes from the language table — `de` first, `en` second — from the first line
  of text in the game. *Test:* the text renderer accepts only a `TextKey`, a branded type that only
  the language table produces, so a literal does not compile; a unit test checks that every key
  in `de` exists in `en`.
- **INV-5 — The game talks only to its own origin.** No analytics, no cookies, no accounts, no
  third-party script, font or asset. nginx sends `Content-Security-Policy: default-src 'self'`,
  so the browser enforces it. *Test:* the build output contains no `http://` or `https://` URL;
  the smoke test asserts the CSP header.
- **INV-6 — Every pixel is a palette pixel.** Every PNG under `public/` uses only Endesga 32. One
  colour of it is reserved for the shadow and appears nowhere else. Every tileset has dimensions
  in multiples of 16. *Test:* `tests/unit/assets`.
- **INV-7 — Map truth lives in the map data.** Whether a tile is solid is a property of the tile
  in the tileset — not a separate collision layer, not code. Layer names are fixed: `ground`,
  `detail`, `above`, `objects`. Shadow densities live in the world data, and no region requires
  an upgrade that cannot be earned before it. *Test:* the map loader rejects unknown layers; a
  world-data test checks the gating order.

### Prohibitions that follow

- No game framework, no physics engine, no scene library. A focused library for one bounded
  concern — audio, for example — needs an ADR first.
- No `any`, no `@ts-ignore`, no disabled lint rule without a comment that says why.
- No fractional scaling, no `imageSmoothingEnabled = true`, no sub-pixel camera position.
- No real product, company or person names in the game, in content or in tests. A fictional name
  is checked against real trademarks before it is fixed.
- No feature, however small, without an approved spec (§3).

---

## 3. The feature workflow

The game is built feature by feature. Nothing is built that was not approved.

1. **Draft.** A feature gets a spec at `docs/features/NNNN-<name>.md`, from
   `docs/features/0000-template.md`, with `Status: draft`. It states the goal, the scope (in, and
   explicitly out), the exact behaviour, testable acceptance criteria, the test plan and the open
   questions. Numbers are numbers, not adjectives.
2. **Approval.** Only the author approves, in conversation. The agent then sets
   `Status: approved` with the date and commits that change. An agent never approves a spec.
3. **Implementation.** Only for `approved`. One branch per feature, named
   `feature/NNNN-<name>`, pull request against `main`, CI green. What is not in the spec is not
   built; it becomes a new draft. Tests come first for logic (§4).
4. **Acceptance.** A feature is done when all tests are green (unit, architecture, assets, smoke),
   typecheck and Biome are clean, the build and the container run, the affected files in
   `docs/spec/` are updated — and **the author has played it and accepted it.** The author merges
   the pull request; the merge is the acceptance. Then `Status: implemented`. What is durable has
   moved into `docs/spec/`; the feature spec stays as history.

Harness changes approved in conversation may go directly to `main`.

---

## 4. How to work

- **Tests first for logic.** Write the failing test, make it pass, then clean up. Movement,
  collision, camera, map loading, gating — all of it is testable without a browser, so all of it
  is tested that way.
- **Nothing is "done" that has not run.** Run the tests, run the build, start the game and look
  at it in a browser before saying a visual change works. Report failures as failures.
- **Small commits with a why.** Imperative subject; the body explains the reason. A decision is
  recorded by changing the spec text, and the reason travels in the commit message. There is no
  decision log — `git log` is the history. Architectural decisions get an ADR in `docs/adr/`.
- **Stay in scope.** If a task seems to need something the spec does not cover, stop and ask.
- **Respect the content budget** in `docs/plan.md` §3. More content means changing the number
  first, then the content.

---

## 5. How to answer

- Conversation in the language the other side uses — with the author, German. Code, comments,
  documentation, commit messages and asset names: English.
- Lead with the result. Expand when asked, or when a decision turns on a trade-off.
- Plain English in documents: short sentences, common words; precise technical terms are welcome.
- When something is genuinely not covered, ask rather than invent.

---

## 6. Non-goals

Considered and deliberately cut. Do not implement, do not scaffold, do not leave TODOs. If a
requirement seems to demand one of these, stop and ask.

No quiz · no compliance training, no certificate · no real product or company names · no
multiplayer · no mobile or touch version · no money, no shop · no character editor · no analytics,
no accounts · no branching case outcomes or morality system in the first draft (deferred,
`docs/plan.md` §5) · no speaking hero · no game framework.

---

## 7. File map and precedence

Read the file that covers what you are working on. Do not guess at a rule that lives in one of
these.

| File | Covers |
|---|---|
| `docs/spec/vision.md` | purpose, message, the story in three acts, the vendor, design pillars, tone sheet, language, non-goals, title and licence |
| `docs/spec/world.md` | the campus and its regions, shadow densities, the cases, order and gating, the cast, creature rules, the naming rule |
| `docs/spec/gameplay.md` | the lamp, the three layers, overview, progression, resolving a case, the journal |
| `docs/spec/visual.md` | 320x180, integer scaling, tiles and figures, Endesga 32 and the signature colour, the asset pipeline, frame rate |
| `docs/spec/architecture.md` | directory structure, the state model, the loop, input, the renderer interface, maps and the Tiled pipeline, text plumbing, tooling, dependency policy |
| `docs/spec/ops.md` | build, the container, nginx and headers, running locally, CI, the Cloud Run target |
| `docs/spec/testing.md` | the four test layers, the test behind each invariant, test-first, what is not tested, human acceptance |
| `docs/plan.md` | roadmap M1–M8, content budget, open milestones, deferred ideas — **not** a source of product rules |
| `docs/features/` | one spec per feature with its status, and the template |
| `docs/adr/` | architecture decision records; ADR-0001 is the engine decision |

**Precedence.** `CLAUDE.md` and `docs/spec/` are the specification. `docs/plan.md` controls scope
and sequence and may not contradict them. `docs/features/` are work orders: a feature spec may
refine the specification, never contradict it — where it would, the spec is changed first, in the
open.
