# 0002 — Surface, loop and scaling

**Status:** approved 2026-11-02
**Milestone:** M2
**Drafted:** 2026-10-31

## Goal

The 320x180 game surface appears on screen, scaled by an integer factor, driven by the fixed
60 Hz loop, with fullscreen on `F`. What it shows is a test pattern that makes scale and timing
visible; the pattern is replaced by the map in 0003.

## Scope

**In:**

- the `Renderer` interface in `src/render/renderer.ts` with the minimum this feature needs:
  `clear(colour)` and `fillRect(x, y, w, h, colour)`, colours typed as `PaletteColour`, so a
  colour outside Endesga 32 does not compile; its Canvas 2D implementation in
  `src/render/canvas2d/` drawing to an offscreen 320x180 canvas and blitting it to the visible
  canvas
- integer scaling in device pixels: factor
  `floor(min(innerWidth × dpr / 320, innerHeight × dpr / 180))`, at least 1, where `dpr` is
  `window.devicePixelRatio`; the visible canvas is `320·f × 180·f` device pixels, centred, and
  the page background `#181425` fills the rest; `imageSmoothingEnabled = false` on the blit and
  `image-rendering: pixelated` on the visible canvas; recomputed when the window size or the
  device pixel ratio changes (browser zoom, another monitor)
- the fixed-step loop in `src/engine/loop.ts`: step 1/60 s, at most 5 catch-up steps, driven by
  `requestAnimationFrame`
- `GameState` with one field, `tick`, advanced by one per step by `update` in `src/game/`
- the test pattern in `src/render/test-pattern.ts`, a pure function of state — it lives in
  `render/` because it needs palette colours and `src/game/` may not import from `src/render/`
  (INV-2): a 16-px checkerboard in `#262b44` and `#3a4466`, a 1-px border in `#c0cbdc`, and a
  16x16 square in `#feae34` whose x position is `tick % 320` on row y = 82 — it crosses the
  surface in 5.33 s and wraps
- `F` toggles fullscreen through the Fullscreen API: one `keydown` listener in `main.ts`; 0004
  moves it into the action table as `fullscreen`

**Out, explicitly:** any other input (0004) · images, tiles, sprites (0003) · interpolation
between steps (never, `architecture.md` §3).

## Behaviour

- Each browser frame: the time since the previous frame is snapped (next bullet), then added to an
  accumulator, capped at 5 steps; while the accumulator holds a step, `update` advances `tick` by
  one; then the pattern is drawn from the latest state. The first frame has no previous frame and
  advances nothing. A background tab that returns after ten seconds advances at most 5 steps.
- A frame time within 0.25 ms of half a step, one step or two steps counts as exactly that. A
  60 Hz display then advances exactly one step per frame and a 120 Hz display one step every
  second frame, instead of jittering between none and two when the remainder sits at the
  threshold; on 59.94 Hz the game runs 0.1 % slow, which nobody sees. This refines
  `architecture.md` §3.
- The surface is drawn once per browser frame at the current factor. When the window size or the
  device pixel ratio changes, the factor is recomputed and the visible canvas resized; the
  surface itself never changes size.
- The pattern is drawn checkerboard first, then the square, then the border, so all four edges
  stay visible while the square passes over them. From x = 305 the square runs off the right
  edge, clipped; at `tick` 320 it reappears whole at x = 0.
- `F` requests fullscreen on the document; `F` again leaves it, and `Escape` leaves it through
  the browser itself. A held `F` toggles once: key repeats are ignored. In fullscreen the factor
  follows the screen size.

## Acceptance criteria

1. Sizes are page areas — the viewport inside the browser window, in CSS pixels. At 1920x1080 the
   pattern fills the page area exactly: factor 6 at device pixel ratio 1, factor 12 at ratio 2.
   At 1280x720 exactly: factor 4 or 8. At 1000x600 it is 960x540 centred with a `#181425` border:
   factor 3 or 6. At 1536x864 and ratio 1.25 — a 1920x1080 laptop at 125 % — it fills exactly at
   factor 6.
2. Every game pixel is exactly f × f device pixels at every factor: no blur, no uneven rows or
   columns. The 1-px border is visible on all four sides at the same thickness. The bottom
   checkerboard row is a 4-px strip by design: 180 = 11 × 16 + 4.
3. The square crosses the surface in 5.3 s ± 0.2 s and wraps.
4. `F` enters fullscreen, `F` or `Escape` leaves it, and the factor adapts both times.
5. After the tab was hidden for ten seconds, the square has moved at most 5 px on return.
6. Loop unit tests: 16.7 ms yields one step; 100 ms yields 5 steps and drops the rest; 8 ms yields
   none and carries the remainder to the next frame; 1,000 frames alternating between 16.5 ms and
   16.8 ms yield exactly 1,000 steps; 2,000 frames of 8.4 ms yield exactly 1,000 steps.
7. `GameState` round trip passes with `tick` populated.
8. All layers of 0001 still pass; CI is green.

## Test plan

- `tests/unit/loop.test.ts` — with a fake clock (INV-3): the three timings and the two snapping
  cases of criterion 6; a frame of 17 ms, 0.33 ms off a step, is not snapped; the first frame
  advances nothing.
- `tests/unit/scale.test.ts` — factor, canvas size and centring offset for the page areas of
  criterion 1 at ratios 1 and 2, for the laptop at 125 %, and for a page area smaller than the
  surface (factor 1); offsets are whole device pixels.
- `tests/unit/pattern.test.ts` — the square's x for `tick` 0, 319, 320; with a recording fake
  renderer: the draw order checkerboard, square, border, and the bottom checkerboard row 4 px
  high.
- `tests/unit/state.test.ts` — round trip extended with `tick`; `update` advances `tick` by
  exactly one.
- `tests/arch/` unchanged; it now checks real code in `src/game/`.
- Smoke spec extended: at Playwright's 1280x720 page area the visible canvas is 1280x720 device
  pixels; its top-left pixel is the border colour `#c0cbdc`; two readings of the canvas 0.5 s
  apart differ, so the loop runs.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev` running; Chrome at 100 % zoom, in a window that is not maximized,
on any screen. The exact sizes of criterion 1 are proven by `scale.test.ts` and by the agent's
run with emulated page areas, not by this plan.

1. Open `http://localhost:5173`.
2. Expected: a checkerboard with a light 1-px frame, centred on the dark page; a yellow square
   moves left to right through the middle and reappears at the left.
3. Start a stopwatch the moment the square reappears at the left edge; stop it when it has
   reappeared three more times.
4. Expected: 16 s ± 0.6 s.
5. Drag the window's corner slowly to make it smaller, then larger.
6. Expected: the pattern changes size in jumps, never in between; it stays centred; the frame
   stays visible on all four sides; the squares stay sharp.
7. Press `F`.
8. Expected: fullscreen; the pattern is centred and as large as fits in whole steps. On a
   1920x1080 or 3840x2160 screen it fills the screen exactly; on a MacBook display a dark border
   remains.
9. Press `F`.
10. Expected: back to the window; the pattern has the size it had before step 7.
11. Press `F`, then `Escape`.
12. Expected: fullscreen, then back to the window at the size of step 10.
13. Hold `F` for two seconds, then release it.
14. Expected: fullscreen once, without flickering in and out.
15. Press `Escape`. Then press `Cmd` + `+` twice and `Cmd` + `0` (`Ctrl` on Windows).
16. Expected: at each zoom level the pattern stays sharp and about the same size on screen.
17. Note where the square is, switch to another tab for ten seconds, switch back.
18. Expected: the square is within a few pixels of where it was, not a full crossing further.

**Feel:** Does the movement look perfectly smooth, with no stutter? If not, note how often it
stutters. On a 120 Hz display, such as a MacBook Pro, the same question.

**Result:** pass or fail per step.

## Open questions

None.
