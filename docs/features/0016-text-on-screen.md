# 0016 — Text on screen

**Status:** approved 2026-11-17
**Milestone:** M4
**Drafted:** 2026-11-16

## Goal

The game shows its first line of text. When a shadow wall holds against the lamp, one sentence
at the bottom of the screen says why. With it come the three things every later text needs: a
pixel font of the game's own, the language table in German and English, and the `TextKey` that
keeps literal text out of the code (INV-4).

## Scope

Built on 0014 as merged. No change to the map, to the state or to any rule of play.

**In:**

- `src/text/`: the language table — `de` and `en`, the same keys — the types `Language` and
  `TextKey`, and the lookup of a key in a language.
- The placeholder font: `src/render/font.ts` with the glyph order and the cell size,
  `tools/placeholder-font.ts` and `public/sprites/font.png`.
- `src/render/draw-text.ts`: one line of text drawn from the font sheet, by `TextKey` only.
- `src/game/notice.ts`: which notice a state shows, if any. One notice exists.
- The scene draws the notice: a dark bar with the line, over the world.
- With the implementation: `architecture.md` §1, §5, §7 and §8; `visual.md` §3 the display and
  §5 the font; `gameplay.md` §2; `testing.md` §2 (INV-4); the README.
- With this draft: `docs/plan.md` §4 names the four features of M4.

**Out, explicitly:** talking to a figure, the dialogue box, more than one line, line wrapping
and pages (0017) · English on screen and the language switch (0018) — English is in the table
and tested from this feature on, but nothing switches to it · the journal (0019) · any other
notice · a notice that stays for a time after its cause is gone · text that appears letter by
letter · coloured or bold text, a second font size · names over figures · a title screen (M8) ·
sound.

## Behaviour

Refines `architecture.md` §5 and §8, `visual.md` §3 and §5 and `gameplay.md` §2. INV-4 keeps
its text and gets its test.

### The language table

`src/text/` holds one object per language. `de` is written first and defines the keys; `en` must
have exactly the same keys, and the compiler checks it. A key is a dotted name in lower case,
`<kind>.<what>`. This feature has one:

| Key | `de` | `en` |
|---|---|---|
| `notice.shadow-too-dense` | `Dieser Schatten ist zu dicht für die Lampe.` | `This shadow is too dense for the lamp.` |

`Language` is `'de' | 'en'`; `DEFAULT_LANGUAGE` is `'de'`. `TextKey` is a branded string type.
The only way to get one is `textKey(id)`, which accepts the keys of the table and nothing else:
a misspelt key does not compile. `textOf(key, language)` returns the string. `game/` and
`render/` pass keys; only `render/draw-text` turns a key into characters. The strings of the
tables are the only text a player can read in `src/`.

### The font

One font, monospaced, white. A glyph is a cell of 6x10 pixels: the glyph itself in columns 0–4,
column 5 always empty, so two glyphs never touch. The rows:

| Rows | Hold |
|---|---|
| 0 | the dots of `Ä`, `Ö`, `Ü` |
| 1–7 | capitals and digits, seven pixels high; the baseline is under row 7 |
| 3–7 | the body of a lower-case letter; ascenders start in row 1, the dots of `ä`, `ö`, `ü` and of `i` and `j` lie in row 1 |
| 8–9 | descenders: `g`, `j`, `p`, `q`, `y` |

The font has 108 glyphs, in this order: the 95 printable ASCII characters from the space (32)
to the tilde (126), then `Ä Ö Ü ä ö ü ß „ “ ” – … ’`. That is every character German and
English dialogue needs, typographic quotes included, so that 0017 draws no new glyph.

`public/sprites/font.png` is 648x10: the 108 cells in one row, in that order. Every opaque
pixel is `#ffffff`; the space is empty. The glyphs are drawn for this game, as pictures in
`tools/placeholder-font.ts`; no font file of anyone else is copied or shipped (INV-5,
`visual.md` §5). The art pass may replace the PNG, same size, same order.

### One line of text

`drawText` draws the string of a key in a language from the font sheet: character n, counted
from 0, with its top-left corner at (x + 6n, y). A space is not drawn; it only takes its 6
pixels. A character the font does not have is drawn as `?` — a test keeps that from happening
(see the test plan). There is no wrapping: a line is as long as its string.

### The notice

`noticeOf(state)` returns the key of the notice a state shows, or nothing. It returns
`notice.shadow-too-dense` when the lamp is on and at least one standing shadow wall has `lit`
true and `light` 0 — a wall that is in the light and holds (0014). In every other state it
returns nothing: the lamp off, no wall in the light, only walls that give way. In the dark
(0009) the lamp is off, so there is no notice. The notice is derived from the state in every
frame; the state gets no new field.

So the line is there from the first frame the light is on a wall it cannot lift, and gone with
the first frame it is not: when Space is let go, when the figure turns away, when the figure
is pushed.

### Drawing

The notice is drawn on the surface, not shifted by the camera, after the hearts of overview and
before the lids of the dark:

1. the bar: a rectangle (8, 158, 304, 18) in `#181425`;
2. the line, centred in it: a string of n characters starts at x = 160 − 3n, y = 162.

The bar leaves 4 px above and below the 10 px line, and 8 px to the left, the right and the
bottom edge of the surface. It holds at most 49 characters: (304 − 2 × 4) / 6, rounded down. A
notice longer than 49 characters in either language is a defect of the table, and a test
rejects it. The German sentence has 43 characters and starts at x = 31; the English one has 38
and starts at x = 46.

Without a notice neither the bar nor a glyph is drawn. The language drawn is the one in the
scene's content; `main.ts` sets it to `DEFAULT_LANGUAGE`.

## Acceptance criteria

1. `de` and `en` have the same keys, and no string is empty; the table has the key and the two
   strings of the spec.
2. A string that is not a `TextKey` is not accepted where a `TextKey` is asked for, and
   `textKey` does not accept a key the table does not have — both at compile time.
3. `textOf` returns the German string for `de` and the English one for `en`.
4. Every character of every string of both languages is one of the 108 glyphs.
5. `font.png` is 648x10, equals its generator's output and passes the asset test; every opaque
   pixel is `#ffffff`.
6. Every glyph but the space has at least one pixel, the space has none, column 5 of every cell
   is empty, and no two glyphs are the same picture.
7. Capitals `A`–`Z` and the digits have pixels in row 1 and in row 7 and none in rows 0, 8 and
   9; `Ä`, `Ö`, `Ü` have pixels in row 0; of the letters `a`–`z` exactly `g`, `j`, `p`, `q`
   and `y` have pixels below row 7.
8. `drawText` draws character n at (x + 6n, y) with the frame of its place in the glyph order,
   draws nothing for a space, and draws `?` for a character the font does not have.
9. `noticeOf` returns `notice.shadow-too-dense` exactly in the states "The notice" names, and
   nothing in the others.
10. Every notice of the table has at most 49 characters in both languages.
11. With a notice the scene draws the bar (8, 158, 304, 18) in `#181425` and then the line, from
    x = 160 − 3n at y = 162, after the hearts and before the lids; without one it draws neither.
12. The scene draws the English string when its content's language is `en`.
13. The state is unchanged by this feature: `GameState` has no new field, and `update` returns
    what it returned before.

## Test plan

- **Unit, text:** the key sets of `de` and `en`; no empty string; the two strings of the
  spec; `textOf` in both languages; the type tests of criterion 2 with `expectTypeOf`, without
  a suppressed compiler error; every character of both tables against the glyph order.
- **Unit, font:** the glyph order — 108 characters, none twice, the ASCII block first; the
  generator against the committed sheet; the size; criteria 6 and 7 glyph by glyph.
- **Unit, `draw-text`:** a string with a space and an umlaut — the calls, their frames and
  their positions; an unknown character.
- **Unit, `game/notice`:** a wall that holds, with the lamp on → the key; the same wall with
  the lamp off; a wall with `light` 1; a wall not lit; no wall; two walls of which one holds →
  the key; a state in the dark.
- **Unit, table and notice:** every key that starts with `notice.` has at most 49 characters
  in `de` and in `en`.
- **Unit, scene:** a state with a wall that holds — the rectangle, then 36 sprite calls for
  the German sentence (43 characters, 7 spaces) with the first at (31, 162), all after the
  hearts and before the lids; the same with the language `en`, 31 calls, the first at
  (46, 162); a state without a notice — no rectangle and no call on the font sheet.
- **Unit, state:** the existing tests, unchanged: they hold criterion 13.
- **Assets:** `font.png` against Endesga 32; the list of shadow assets still has two entries.
- **Architecture:** unchanged; it now covers `src/game/notice.ts`, which imports from `text/`.
- **Smoke:** unchanged. The game does not start when the font sheet fails to load, so every
  smoke test covers the loading. The walk to a dense wall is too long for a smoke test.
- **Fixtures:** none.

## Acceptance plan (manual test)

**Preconditions:** `npm run dev`, a desktop browser, the window at least 1280x720. The game has
just loaded; the figure stands in the reception. Arrow keys or WASD walk, `Space` holds the
lamp, `F` toggles fullscreen.

**Steps:**

1. Walk right into the corridor and look at the whole picture.
2. Expected: there is no text and no bar anywhere; the five hearts are in the top-left corner.
3. Walk up the corridor into the wide corridor along the top, then left to the leftmost violet
   strip in its upper wall. Stand below it, face up and hold `Space`.
4. Expected: the strip stands still and does not thin out. At the bottom of the picture a dark
   bar appears, almost as wide as the picture, with one white line in its middle:
   `Dieser Schatten ist zu dicht für die Lampe.`
5. Keep holding `Space` and read the line letter by letter.
6. Expected: every letter is sharp and can be told from the others; no letter touches its
   neighbour; the `ü` has two dots; the full stop is there; the line lies inside the bar with
   the same space to its left and to its right.
7. Keep holding `Space` and press `F`.
8. Expected: the picture fills the screen; the line is as sharp as before, every pixel of a
   letter a square.
9. Press `F` again, then let go of `Space`.
10. Expected: the bar and the line are gone at once; the strip flickers again.
11. Hold `Space` again and, while holding it, press the down key once.
12. Expected: the figure turns away from the strip, the lamp still shines, and the bar is
    gone.
13. Still holding `Space`, press the up key.
14. Expected: the bar and the line are back.
15. Walk right along the corridor to the next two violet strips and hold the lamp on each.
16. Expected: the same line appears at each.
17. Walk down the corridor to the wide corridor at its end, to the violet strip in its lower
    wall at the left. Face it and hold `Space` until the strip is gone.
18. Expected: the strip thins out and is gone after about one second; at no moment is there a
    bar or a line.

**Feel:**

- Can the line be read without effort — in fullscreen, and in a window of about 1000x600?
- Every letter is the same width. Does that read well, or should narrow letters like `i` and
  `l` take less room?
- Is the bar at the right place and the right size? Does it need a border?
- The line is gone the moment the light leaves the wall. Is that long enough to read it, or
  should it stay for a moment?
- Is the sentence right in tone — and is it right that the game says a sentence here at all?

**Result:** passed 2026-11-17, steps 1–18. Feel: the line reads without effort, in fullscreen and
in a window of about 1000x600; letters of one width read well and stay; the bar is at the right
place and the right size and needs no border; the line may go the moment the light leaves the
wall; the sentence is right in tone, and it is right that the game says it here.

## Open questions

None. Three were settled on 2026-11-17, each as drafted:

- The font: drawn in-house and generated from pictures in the repository, monospaced, 6x10 per
  glyph, 108 glyphs. The glyphs this walk does not show are judged with 0017.
- The first sentence: a line of the game itself, in a bar at the bottom, while a wall holds —
  `Dieser Schatten ist zu dicht für die Lampe.` / `This shadow is too dense for the lamp.`
- The cut of M4: 0016 text on screen · 0017 talking · 0018 the language switch · 0019 the
  journal. Until 0018 the game shows German only; English is in the table and tested.
