# Visual design — Shadow AI

Resolution, scale, palette and the rules that make the game read as retro. These are hard rules:
assets that break them fail a test, not a review.

## 1. Internal resolution

The game renders into a fixed **320x180** canvas (16:9) and is scaled up from there. On a
1920x1080 screen that is exactly 6x, on 4K exactly 12x — a trade-fair screen is filled edge to
edge. With 16-pixel tiles the view shows 20 by 11.25 tiles; the quarter row is harmless with a
scrolling camera.

Alternatives considered: 256x224 (SNES, authentic but letterboxed on every modern screen) and
384x216 (shows more world, figures look smaller).

## 2. Scaling

Integer factors only, nearest-neighbour sampling, the largest factor that fits the window.
Remaining space is filled with a dark palette colour. Fractional scaling is never used — the
shimmer it produces on movement is the most common defect in browser pixel games. Fullscreen
through the Fullscreen API, for the booth.

## 3. Tiles and figures

Tiles are **16x16**. Figures are **16x24**: one tile wide, one and a half high, as in A Link to
the Past and Ocean's Heart. A 16x16 figure reads as squat for office people. The collision box of
a figure is only its lower part — the feet — so a figure can walk "behind" desks and plants.

## 4. Palette

Every colour in the game comes from **Endesga 32** — thirty-two colours, warm, enough for office
interiors and outdoor grounds. A test checks every PNG under `public/` against the palette; a
pixel outside it fails the build.

**The signature colour.** One violet/magenta of the palette is reserved for the shadow and for
nothing else in the world. Every trace of shadow AI glows in it. The player learns in seconds what
to look for, without a word of text. Because colour alone excludes colour-blind players, the
signature colour is always accompanied by **form and motion** — flicker, dithering — so the shadow
is unmistakable without it.

**Shadowed and cleared.** A region under shadow renders desaturated with violet dithering; a
cleared region renders in the full palette. The world shows progress by colour (`vision.md` §5).

## 5. Assets

The art pipeline is stable from the first stage, whatever the art source:

- In the first stage a script in the repository **generates the placeholder tiles** from code —
  in the palette, deterministic, free of licence questions. Tileset sizes, tile ids and the Tiled
  integration are fixed by it.
- Later an **art pass** replaces the generated graphics file by file — by hand, by a pixel artist
  or by the author — in the same size and the same palette, without any change to code.
- Text is drawn with a bitmap font, either drawn in-house or an OFL-licensed pixel font. The first
  stage needs no text.

Every tileset has dimensions in multiples of 16. Every asset ships from the game's own origin;
nothing is loaded from a third party at run time (`vision.md` §5).

## 6. Frame rate

Logic runs at a fixed 60 Hz; rendering happens once per browser frame. On a 120 Hz display frames
are drawn twice; after a stall at most five logic steps are caught up.
