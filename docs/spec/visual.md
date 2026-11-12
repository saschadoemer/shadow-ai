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

Integer factors only, nearest-neighbour sampling, the largest factor that fits the page area —
**counted in device pixels**:

```
factor = max(1, floor(min(innerWidth × dpr / 320, innerHeight × dpr / 180)))
```

where `dpr` is the device pixel ratio. Every game pixel is then exactly factor × factor physical
pixels on every display. A factor counted in CSS pixels would not be: on a Retina display, where
a CSS pixel is 2x2 device pixels, the browser would resample the finished image and soften it;
on a laptop at 125 % a factor of 3 would make game pixels 3.75 device pixels wide, so columns
alternate between 3 and 4. The visible canvas is exactly `320·f × 180·f` device pixels, placed on
whole device pixels; `image-rendering: pixelated` is the safety net should the browser resample
anyway. The same picture thus reads factor 6 on a 1920x1080 screen and 12 on a Retina display of
the same CSS size.

Remaining space is the page background, `#181425`. Fractional scaling is never used — the
shimmer it produces on movement is the most common defect in browser pixel games. Fullscreen
through the Fullscreen API, on `F`, for the booth.

## 3. Tiles and figures

Tiles are **16x16**. Figures are **16x24**: one tile wide, one and a half high, as in A Link to
the Past and Ocean's Heart. A 16x16 figure reads as squat for office people. The collision box of
a figure is only its lower part — the feet — so a figure can walk "behind" desks and plants.

## 4. Palette

Every colour in the game comes from **Endesga 32** — thirty-two colours, warm, enough for office
interiors and outdoor grounds. A test checks every PNG under `public/` against the palette; a
pixel outside it fails the build. A pixel is either opaque or fully transparent — alpha 255 or
0, nothing between, because a half-transparent pixel blends into a colour outside the palette.
The colour of a transparent pixel is not checked. The palette is data in
`src/render/palette.ts`.

**The signature colour.** One violet of the palette, `#68386c`, is reserved for the shadow and
for nothing else in the world; the asset test rejects it in every PNG under `public/` except the
shadow assets, a list in the test whose first entry is `sprites/snippet.png` (feature 0008).
Every trace of shadow AI glows in
it. The player learns in seconds what to look for, without a word of text. Because colour alone
excludes colour-blind players, the signature colour is always accompanied by **form and
motion** — flicker, dithering — so the shadow is unmistakable without it. The snippet carries
the colour on its border and its lines of text, and it bobs while it is free — form and motion —
and stands still in the light.

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
are drawn twice; after a stall at most five logic steps are caught up. Frame times near a step are
snapped, so 60 Hz and 120 Hz displays move without stutter (`architecture.md` §3).
