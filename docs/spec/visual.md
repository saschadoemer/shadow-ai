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
Interior walls are strips 4 px thick on a tile's top or left edge (feature 0010).

**Furniture** (feature 0011) stands on `detail` and is transparent where nothing is drawn.
Partitions are strips 2 px thick, lighter than walls; a mobile screen is a panel 4 px thick
through the middle of its cell, on two feet. A **tall thing** — a cabinet, a plant, a coat
rack, a water dispenser or the arcade cabinet (features 0011 and 0013) — is two tiles: its body
on `detail` and its top on `above`, one row higher. A figure in the top's row is drawn behind the
top, a figure below the body in front of it. A tall thing never stands in the first row below a
wall, so its top always lies in the same room as its body.

**The movers** (feature 0015). A colleague is 16x24 like the figure, drawn from the figure's
frames in another shirt. An office dog, a robot vacuum and a drone are 16x16, one tile. The
vacuum is a plain disc and the drone a body with four rotors, so neither shows a real product.
The drone has no drop shadow: a dark patch on the floor would read as the shadow of the game.

**The standing figures** (feature 0017). A figure of the cast that stands in the map is 16x24
like a colleague, drawn from the figure's frames in a shirt no one else wears, so it is told from
the colleagues at a glance. The data protection officer's shirt is `#c0cbdc`, light grey.

**The lamp's cone** (features 0007, 0029) is a yellow checkerboard, `#fee761`, on the floor
under every figure: a 48x48 frame per facing, as wide at its end as it is long. With the wider
cone it is a 72x72 frame per facing from a sheet of its own, `lamp-wide.png`: 72 px wide at
its end and still 48 px long, so a third of the frame along the facing stays empty. Either
frame is placed by its apex pixel, the middle of the edge the cone opens from.

**The display.** Three things are drawn over the world. The row of overview hearts in the
top-left corner (features 0009, 0012): 8x8, 4 px from the corner, one every 10 px, one per point
of the maximum. The help label in the top-right corner (feature 0031): the words `H Hilfe` or
`H Help` in white on a field in `#181425` with a frame of 1 px in `#3a4466` — the colours of the
help's box —, 47x14 in German and 41x14 in English, 4 px from the corner; the frame's right edge
stays where it is in both languages. And the notice (feature 0016), while there is one: a bar in `#181425` at the
bottom, 8 px from the left, the right and the bottom edge, 304x18, with one white line centred in
it. While a dialogue is open the dialogue box (feature 0017) is drawn in the notice's place: the
notice's bar grown upwards to three lines, (8, 134, 304, 42) in `#181425`, with the page's white
lines left-aligned from (12, 138), 12 px apart, and in its lower right corner a small white
triangle that points down and blinks once a second — a press goes on. A heart is 7x7 with a rim
in `#181425`, red `#e43b44` when full and
`#3a4466` when empty. The screen of the dark is two rectangles in `#181425` that close from the top
and the bottom; nothing is blended, so no pixel leaves the palette.

**The help** (feature 0021) is a box over the game, (48, 30, 224, 98): a frame of 1 px in
`#3a4466` around a field in `#181425`, with seven white rows in two columns — the key on the
left, what it does on the right. It keeps clear of the hearts, of the journal's tabs and of the
dialogue box, so the floor stays visible on all four sides and a dialogue's page stays readable
under it.

**The journal** (feature 0020) is drawn instead of the world, not over it: a dark screen in
`#181425` with three tabs along the top in two blues — `#3a4466` for the open tab, `#262b44` for
the other two — each with its title centred in white, and under them a rule in the open tab's
colour, so that the open tab stands on it. A captured species shows its own 16x16 picture, the
frame the light shows, with its name beside it and its lines below. A case on the cases tab
(feature 0022) is two white lines: the department's name, and below it its count —
`Spuren: 1 von 5`. The help is the one thing drawn over the journal; its frame is what makes it
a box on the journal's screen, which has the field's colour.

## 4. Palette

Every colour in the game comes from **Endesga 32** — thirty-two colours, warm, enough for office
interiors and outdoor grounds. A test checks every PNG under `public/` against the palette; a
pixel outside it fails the build. A pixel is either opaque or fully transparent — alpha 255 or
0, nothing between, because a half-transparent pixel blends into a colour outside the palette.
The colour of a transparent pixel is not checked. The palette is data in
`src/render/palette.ts`.

**The signature colour.** One violet of the palette, `#68386c`, is reserved for the shadow and
for nothing else in the world; the asset test rejects it in every PNG under `public/` except the
shadow assets, a list in the test: `sprites/snippet.png` (feature 0008),
`sprites/shadow-wall.png` (feature 0014), `sprites/trace.png` (feature 0022),
`sprites/shadow-veil.png` (features 0023 and 0025) and `sprites/mirage.png` (feature 0032).
Every trace of shadow AI glows in
it. The player learns in seconds what to look for, without a word of text. Because colour alone
excludes colour-blind players, the signature colour is always accompanied by **form and
motion** — flicker, dithering — so the shadow is unmistakable without it. The snippet carries
the colour on its border and its lines of text, and it bobs while it is free — form and motion —
and stands still in the light. The mirage (feature 0032) carries it on its frame and on the head
and shoulders of the portrait in it; it sways one pixel to the side while nobody looks at it,
holds still while it is looked at, and turns white in the light.

The shadow wall (feature 0014) is the second shadow asset: a dithered strip 4 px thick in the
signature colour, with `#181425` for the pattern of the densest wall. Its density is read from how
many pixels it has — 32 per 16 px segment for density 1, 48 for density 2, 64 for density 3 — and
it flickers four times a second between two phases of that look. In the light it stands still; a
wall that holds keeps its density's first look, a wall that gives way thins out to 16 and then 8
pixels per segment before it is gone.

The trace (feature 0022) is the third shadow asset: a checkerboard in the signature colour on
the screen of a device. It is drawn only while the lamp's light is on it, and it grows in three
looks — a centred square of 6, 10 and 14 px — over the second the light needs to find it; then it
is gone and is not drawn again. Form and motion beside the colour: the residue appears, grows
and vanishes.

**Shadowed and cleared.** A region under shadow renders desaturated with violet dithering; a
cleared region renders in the full palette. The world shows progress by colour (`vision.md` §5).

*As built* (feature 0023). A cell in an area of a region with a density above 0 (`world.md` §1)
is under shadow. Its tiles — `ground`, `detail` and `above` — are drawn from the shadow tileset,
the tileset in greys, and the veil lies over it. The greys are a **ramp** of six colours of the
palette, from dark to light: `#181425`, `#262b44`, `#3a4466`, `#5a6988`, `#8b9bb4`, `#c0cbdc`.
The **weight** of a colour is 299 × R + 587 × G + 114 × B. The grey of a colour is the ramp
colour nearest in weight — no colour of the palette lies exactly between two — and from there
one step darker; `#181425` stays. So the carpet's `#8b9bb4` becomes `#5a6988`, a desk's
`#e4a672` becomes `#8b9bb4` and white becomes `#8b9bb4`. The step darker matters: the carpet of
the rooms is grey already, and without it only the furniture would change. The shadow tileset
never uses the signature colour; the veil carries it.

The veil is the fourth shadow asset: three 16x16 frames, one per density, a pattern in the
signature colour that repeats every 4 px — 32, 64 and 128 of 256 pixels, dots, diagonal lines
and a checkerboard. It stands still. It is drawn over `ground` and `detail` and under everything
else: the cone, the shadow walls, the traces, the people, the dogs, the machines, the creatures
and the player keep their colours and get no veil, and `above` is drawn grey without one. So a
person in a room under shadow stands out in colour against a floor that has none. The form
beside the colour is the grey itself and the dithering of the veil, whose density tells the
regions apart. The reception, the break room and the corridors are not under shadow.

*As built* (feature 0025). A region whose case is solved is cleared: from the frame after the
solving step its cells are drawn from the tileset, in their colours, on all three layers. The
veil stays a moment longer and thins out over `CLEAR_STEPS`, 120 steps or two seconds, *tune*,
in three parts of 40 steps: first the veil of the region's density as before, then a veil of 16
pixels a cell, then one of 8, then none. So the room does not fade: it comes clear. The colours
come at once and the dots go in three steps. The veil's sheet has two more frames for it, after
the three of the densities: frame 3 holds the pixels where x and y, counted in the frame, are
both multiples of 4, and frame 4 those of them where x + y is a multiple of 8. Both are in the
signature colour, repeat every 8 px and join without a seam. A cleared room looks like the
reception: colours, no dots.

## 5. Assets

The art pipeline is stable from the first stage, whatever the art source:

- In the first stage a script in the repository **generates the placeholder tiles** from code —
  in the palette, deterministic, free of licence questions. Tileset sizes, tile ids and the Tiled
  integration are fixed by it. Beside each tileset it writes the tileset's shadow sheet, the same
  tiles in the greys of §4, named with `-shadow` before `.png` (feature 0023).
- Later an **art pass** replaces the generated graphics file by file — by hand, by a pixel artist
  or by the author — in the same size and the same palette, without any change to code.
- Text is drawn with a bitmap font drawn in-house (feature 0016): one font, monospaced, white,
  6x10 per glyph with the glyph in the left five columns, 108 glyphs — every character German and
  English dialogue needs. It is generated from pictures in `tools/placeholder-font.ts`; no font
  file of anyone else is copied or shipped. The art pass may replace the PNG in the same size and
  order.

Every tileset has dimensions in multiples of 16. Every asset ships from the game's own origin;
nothing is loaded from a third party at run time (`vision.md` §5).

## 6. Frame rate

Logic runs at a fixed 60 Hz; rendering happens once per browser frame. On a 120 Hz display frames
are drawn twice; after a stall at most five logic steps are caught up. Frame times near a step are
snapped, so 60 Hz and 120 Hz displays move without stutter (`architecture.md` §3).
