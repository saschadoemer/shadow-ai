# 0002 — Implementation plan: surface, loop and scaling

**Spec:** [`docs/features/0002-surface-loop-scaling.md`](../features/0002-surface-loop-scaling.md)
(approved 2026-11-02). The plan argues from the spec; where they differ, the spec wins.
**Written:** 2026-11-02. A working document, not specification: once the feature is
implemented, what is durable lives in `docs/spec/`.

**Goal:** the 320x180 surface on screen, scaled by a whole factor counted in device pixels,
driven by the fixed 60 Hz loop, with `F` for fullscreen, showing the test pattern.

**Approach:** every rule that can be a pure function is one, and is tested in Node before it
exists: the step count per frame, the layout for a page area, the pattern's draw calls, the
state update. The browser-facing parts — the Canvas 2D renderer, the frame scheduler, the `F`
listener — are thin and are covered by the smoke spec and the acceptance plan. Work is
test-first and lands in small commits on `feature/0002-surface-loop-scaling`.

## Global constraints

- No new dependency, runtime or development.
- `src/game/` imports nothing from `src/render/` and names no DOM API (INV-2); `src/engine/`
  imports nothing from the project.
- `GameState` stays plain data (INV-1). The loop driver keeps its accumulator in a closure, not
  in a module.
- No literal text a player can read (INV-4); there is no text in this feature.
- Colours are `PaletteColour`; no colour string outside `src/render/palette.ts` and the pattern.

## Design notes

- **The accumulator counts steps, not milliseconds.** In milliseconds floating point loses a
  step: `5 × (1000 / 60)` minus `1000 / 60` five times leaves 16.66666666666666, so only four
  steps run. In steps the cap is exactly 5 and a snapped frame adds exactly 0.5, 1 or 2.
- **Snapping** compares the frame time in milliseconds against ½, 1 and 2 steps with a
  tolerance of 0.25 ms and returns the exact step count; otherwise `elapsed / STEP_MS`. Negative
  frame times count as zero.
- **Layout** is computed every frame from `innerWidth`, `innerHeight` and `devicePixelRatio`;
  the renderer writes canvas size and style only when they change. This covers resize, zoom,
  fullscreen and a move to another monitor with one code path. Resizing a canvas resets its
  context, so `imageSmoothingEnabled = false` is set on every blit.
- **Letterbox** is the page background `#181425` from 0001; the visible canvas is exactly
  `320·f × 180·f` device pixels and positioned absolutely on whole device pixels.
- **`F`** is `event.code === 'KeyF'`, ignored on `repeat` and with `Ctrl`, `Alt` or `Cmd` held, so
  the browser's own shortcuts such as `Cmd` + `F` keep working.

## File map

| File | Responsibility |
|---|---|
| `src/game/state.ts` | `GameState { tick }`, `createInitialState()` |
| `src/game/update.ts` | `update(state)`: one logic step, `tick + 1` |
| `src/engine/loop.ts` | `STEP_MS`, `MAX_CATCH_UP_STEPS`, `SNAP_TOLERANCE_MS`; pure `advance(accumulator, elapsedMs)`; `runLoop(initial, { update, render }, requestFrame)` |
| `src/render/renderer.ts` | `SURFACE_WIDTH`, `SURFACE_HEIGHT`, the `Renderer` interface: `clear`, `fillRect` |
| `src/render/scale.ts` | pure `computeLayout(viewportWidth, viewportHeight, devicePixelRatio)`: factor, device box, CSS box |
| `src/render/test-pattern.ts` | `squareX(tick)`, `drawTestPattern(renderer, state)` |
| `src/render/canvas2d/canvas2d-renderer.ts` | offscreen 320x180 canvas, `clear`, `fillRect`, `present(layout)` |
| `src/main.ts`, `src/style.css` | wiring, the `F` listener; canvas `position: absolute`, `image-rendering: pixelated` |
| `tests/unit/state.test.ts` | INV-1 round trip with `tick`; `update` advances by one and leaves its input unchanged |
| `tests/unit/loop.test.ts` | INV-3: criterion 6, the 17 ms counter-case, the first frame, negative time; `runLoop` with fake frames, including the ten-second background tab |
| `tests/unit/scale.test.ts` | criterion 1 at ratios 1, 2 and 1.25; the maximized-window case; factor 1 below the surface |
| `tests/unit/pattern.test.ts` | `squareX` for 0, 319, 320; draw order; the 4-px bottom row; the border on all four sides |
| `tests/e2e/smoke.spec.ts` | canvas 1280x720, top-left pixel `#c0cbdc`, two readings 0.5 s apart differ |
| `docs/spec/{architecture,visual,testing}.md`, `README.md` | snapping and step-counting accumulator; device-pixel scaling; the new tests; status |

## Tasks

Each task ends with `npm run check` green and one commit.

1. **State and update (INV-1).** Extend `state.test.ts`: a state after 1,234 updates survives the
   round trip and is a plain object; `update` returns `tick + 1` and does not change its input.
   See it fail; write `state.ts` and `update.ts`. Commit.
2. **The loop (INV-3).** `loop.test.ts` against `advance` and against `runLoop` driven by a fake
   frame scheduler. See it fail; write `loop.ts`. Commit.
3. **Scaling.** `scale.test.ts` with the page areas of criterion 1 and the edge cases. See it
   fail; write `scale.ts`. Commit.
4. **Renderer and pattern.** `pattern.test.ts` with a recording fake renderer. See it fail;
   write `renderer.ts` and `test-pattern.ts`; then the Canvas 2D renderer. Commit.
5. **Wiring and smoke.** Extend the smoke spec; see it fail against the dev server; wire
   `main.ts`, the `F` listener and the CSS; see it pass. Commit.
6. **Spec and README.** `architecture.md` §3 and §5, `visual.md` §2 and §6, `testing.md` §1 and
   §2, the README status. Commit.
7. **Acceptance.** Merge `origin/main`, rerun `npm run check` and both smoke runs, dev server and
   container. Run the acceptance plan in the browser pane against both, plus criterion 1 with
   emulated page areas; push; open the pull request with every step's result.
