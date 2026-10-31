# 0002 — Surface, loop and scaling

**Status:** draft
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

The 320x180 game surface appears on screen, scaled by an integer factor, driven by the fixed
60 Hz loop, with fullscreen on `F`. What it shows is a test pattern that makes scale and timing
visible; the pattern is replaced by the map in 0003.

## Scope

**In:**

- the `Renderer` interface in `src/render/renderer.ts` with the minimum this feature needs:
  `clear(colour)` and `fillRect(x, y, w, h, colour)`; its Canvas 2D implementation drawing to an
  offscreen 320x180 canvas and blitting it to the visible canvas
- integer scaling: factor `floor(min(windowWidth / 320, windowHeight / 180))`, at least 1,
  centred, the rest filled with `#181425`; `imageSmoothingEnabled = false`; recomputed on resize
- the fixed-step loop in `src/engine/loop.ts`: step 1/60 s, at most 5 catch-up steps, driven by
  `requestAnimationFrame`
- `GameState` with one field, `tick`, advanced by one per step
- the test pattern, a pure function of state: a 16-px checkerboard in `#262b44` and `#3a4466`, a
  1-px border in `#c0cbdc`, and a 16x16 square in `#feae34` whose x position is `tick % 320` on
  row y = 82 — it crosses the surface in 5.33 s and wraps
- `F` toggles fullscreen through the Fullscreen API

**Out, explicitly:** any other input (0004) · images, tiles, sprites (0003) · interpolation
between steps (never, `architecture.md` §3).

## Behaviour

- Each browser frame: elapsed time is added to an accumulator, capped at 5 steps; while the
  accumulator holds a step, `update` advances `tick` by one; then the pattern is drawn from the
  latest state. A background tab that returns after ten seconds advances at most 5 steps.
- The surface is drawn once per browser frame at the current factor. On `resize` the factor is
  recomputed and the visible canvas resized; the surface itself never changes size.
- `F` requests fullscreen on the document; `F` again, or `Escape`, leaves it. In fullscreen the
  factor follows the screen size.

## Acceptance criteria

1. At a window of 1920x1080 the pattern fills the window exactly (factor 6); at 1280x720 exactly
   (factor 4); at 1000x600 it is 960x540 centred with a `#181425` border (factor 3).
2. Checkerboard edges are crisp at every factor: no blur, no half-tiles at the border.
3. The square crosses the surface in 5.3 s ± 0.2 s and wraps.
4. `F` enters fullscreen, `F` or `Escape` leaves it, and the factor adapts both times.
5. After the tab was hidden for ten seconds, the square has moved at most 5 px on return.
6. Loop unit tests: 16.7 ms yields one step; 100 ms yields 5 steps and drops the rest; 8 ms yields
   none and carries the remainder to the next frame.
7. `GameState` round trip passes with `tick` populated.
8. All layers of 0001 still pass; CI is green.

## Test plan

- `tests/unit/loop.test.ts` — the three timings with a fake clock (INV-3).
- `tests/unit/scale.test.ts` — the factor for the three window sizes and for a window smaller
  than the surface (factor 1).
- `tests/unit/pattern.test.ts` — the square's x for `tick` 0, 319, 320.
- `tests/unit/state.test.ts` — round trip extended with `tick`.
- Smoke spec extended: after two seconds the canvas is not uniformly dark (something was drawn).

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome with the window set to 1920x1080 (or a screen of
that size, window maximized).

1. Open `http://localhost:5173`.
2. Expected: a checkerboard fills the whole window; a yellow square moves left to right.
3. Count the square's crossings over 16 seconds.
4. Expected: three crossings.
5. Resize the window to about 1000x600.
6. Expected: the pattern shrinks to a centred rectangle with a dark border; the checkerboard
   squares are still sharp.
7. Press `F`.
8. Expected: fullscreen; the pattern fills the screen exactly.
9. Press `Escape`.
10. Expected: back to the window; the pattern is the size of step 6.
11. Note where the square is, switch to another tab for ten seconds, switch back.
12. Expected: the square is within a few pixels of where it was, not a full crossing further.

**Feel:** Does the movement look perfectly smooth, with no stutter? If not, note how often it
stutters.

**Result:** pass or fail per step.

## Open questions

None.
