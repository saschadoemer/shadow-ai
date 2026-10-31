# ADR-0001 — Own minimal engine on TypeScript and Canvas 2D, no game framework

**Status:** accepted
**Date:** 2026-10-31

## Context

Shadow AI is a browser game with pixel-art 2D graphics in the style of early top-down adventures
(The Legend of Zelda, Ocean's Heart): a scrolling tile map, a player sprite, later NPCs, dialogue
and objects to inspect. The first stage is one large map the player can walk around in.

Three facts about *how* it is built matter more than the genre:

- It is developed spec-first, feature by feature, by AI agents working from `CLAUDE.md` and
  `docs/`. A rule in the specification has to be enforceable against the code. Every framework
  default the spec has to override is a place where the two can drift apart.
- Game logic must be provable without a browser. The testing strategy (`docs/spec/testing.md`)
  rests on unit tests for movement, collision and map rules.
- The retro scope is small: 16x16 tiles, a few layers, at most a few hundred sprites on screen.
  This never needs WebGL.

Game frameworks were evaluated: Phaser 4 (released April 2026 with a new renderer and a changed
API; agent knowledge mostly covers Phaser 3), Excalibur.js, KAPLAY, LittleJS, and PixiJS as a
renderer only.

## Decision

Build the game on TypeScript (strict), the Canvas 2D API, Vite and Vitest, with no game
framework. Write the small engine parts ourselves: game loop, input, tile map loading and
rendering, camera, collision, sprite animation. Keep game logic as plain data and pure functions,
independent of the DOM. Put all drawing behind one renderer interface, so the Canvas 2D
implementation can be replaced without touching game logic. Add a focused library only for one
well-bounded concern (for example audio) — never a framework that owns the loop.

## Alternatives considered

- **Phaser 4.** Everything is included: Tiled import, camera, arcade physics, loader, tweens,
  audio, scenes. Lost because the framework owns the loop and its scene model pulls logic into
  framework classes, which makes headless tests hard; because version 4 is six months old with a
  changed API while agents mostly know version 3, a steady source of subtle mistakes; and because
  the bundle is over 1 MB for a game that draws 16x16 tiles.
- **Excalibur.js** (and KAPLAY, LittleJS). TypeScript-native, lighter than Phaser, official Tiled
  plugin. Lost for the same structural reason — a framework owning the loop — with a smaller
  community on top. KAPLAY is aimed at game jams and changes its API often; LittleJS is tiny with
  thin documentation.
- **PixiJS as renderer only, own logic.** The closest alternative to this decision. Lost for now
  because Canvas 2D is enough for the scope, and PixiJS adds a dependency and a WebGL context the
  game does not need yet. The renderer interface keeps this door open.

## Consequences

Easy: pixel-perfect rendering (`imageSmoothingEnabled = false`, integer scaling); unit tests on
logic with no browser; the whole engine is readable in the repository and governed by the spec; a
small bundle; no version drift.

Hard: every piece of infrastructure the game needs later — audio, scene transitions, text
rendering, particles, save state — is written here, not imported. Each one is a feature with a
spec, not a line in `package.json`. That is the accepted cost.

Ruled out: adopting a game framework later without a new ADR that supersedes this one.

## Revisit when

Any of these happens:

- A feature needs effects Canvas 2D cannot deliver at 60 fps (shaders, lighting, a CRT filter).
  Then evaluate PixiJS behind the existing renderer interface — not a framework.
- Frame time stays above budget with the sprite counts the world spec allows, after the obvious
  optimizations (layer caching, dirty rectangles).
- The third time a subsystem is rebuilt because the first version was not good enough. That is
  the signal that the "small engine" assumption was wrong.

## References

`docs/spec/architecture.md` (module structure, renderer interface), `docs/spec/testing.md`
(headless logic tests), `docs/spec/visual.md` (resolution and scaling rules).
