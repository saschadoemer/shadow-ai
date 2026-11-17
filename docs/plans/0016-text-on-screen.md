# 0016 — Implementation plan: text on screen

**Spec:** [`docs/features/0016-text-on-screen.md`](../features/0016-text-on-screen.md)
(approved 2026-11-17). The plan argues from the spec; where they differ, the spec wins. Read the
spec first, then `CLAUDE.md`, then `docs/spec/architecture.md` §5 and §8, `docs/spec/visual.md`
§3 and §5 and `docs/spec/testing.md` §5. **Written:** 2026-11-17 on the planning model. A
working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0014 is merged into `main` (`07c39c8` or later). The branch
`feature/0016-text-on-screen` exists, cut from that `main`, and holds the draft, the approval
and this plan. Work on it; merge the latest `main` into it before Task 1.

**Goal:** while a shadow wall holds against the lamp, a dark bar at the bottom of the screen
shows one sentence, drawn in the game's own pixel font from a language table in German and
English, by `TextKey` only (INV-4).

**Approach:** five code tasks, each green on its own. The language table and `TextKey` (T1).
The font: the glyph order, the generator with its 108 pictures and the sheet (T2). One line of
text from the sheet (T3). Which notice a state shows (T4). The scene and `main.ts` (T5). Then
the documents (T6), the full check with the container (T7), the walk (T8) and the pull request
(T9).

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- INV-1: `GameState` gets **no** new field. The notice is derived from the state in every
  frame by `noticeOf`.
- INV-2: `src/game/notice.ts` imports from `./state` and `../text/text`, nothing from
  `src/render/`, and uses no DOM name.
- INV-4: the two strings of the spec live in `src/text/de.ts` and `src/text/en.ts` and nowhere
  else in `src/`. Nothing exported draws a plain string: `drawText` takes a `TextKey`. Do not
  add a helper that takes a `string` "for tests".
- INV-5: no font file is added, copied or loaded. The font is the PNG the generator writes
  from the pictures in this plan.
- INV-6: `font.png` uses `#ffffff` only. It is no shadow asset; the list of shadow assets keeps
  its two entries.
- `src/render/font.ts` imports nothing: Node runs `tools/` directly and imports it with its
  `.ts` extension, as it does `src/render/palette.ts`.
- No `any`, no `@ts-ignore`, no `@ts-expect-error`: the type tests use `expectTypeOf`, which
  `npm run typecheck` checks because `tests/` is in `tsconfig.json`.
- Commits: imperative subject, a body that says why, signed (run `git commit` outside the
  sandbox). Format with `npx biome check --write <files>` before `npm run check`.
- The numbers, verbatim from the spec: a glyph cell is 6x10, the glyph in columns 0–4; 108
  glyphs — ASCII 32–126, then `ÄÖÜäöüß„“”–…’`; the sheet is 648x10, every opaque pixel
  `#ffffff`; the bar is (8, 158, 304, 18) in `#181425`; a line of n characters starts at
  (160 − 3n, 162); a notice has at most 49 characters; the German sentence has 43 characters
  and starts at x = 31, the English one 38 and starts at x = 46.

## File structure

| File | Responsibility |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` (create) | the strings, one object per language |
| `src/text/text.ts` (create) | `Language`, `TextId`, `TextKey`, `TABLE`, `textKey`, `textOf` |
| `src/render/font.ts` (create) | the glyph order, the cell size, `glyphIndex` |
| `tools/placeholder-font.ts` (create) | the 108 pictures and the sheet as pure pixel data |
| `tools/gen-sprites.ts` (modify) | writes `font.png` |
| `src/render/draw-text.ts` (create) | one line of text from the font sheet, by `TextKey` |
| `src/game/notice.ts` (create) | which notice a state shows |
| `src/render/draw-scene.ts` (modify) | the bar and the line, their place in the draw order |
| `src/main.ts` (modify) | loads the font sheet, sets the language |
| `tests/unit/text.test.ts`, `font.test.ts`, `draw-text.test.ts`, `notice.test.ts` (create) | one file per module |

---

### Task 1: The language table

**Files:**
- Create: `src/text/de.ts`, `src/text/en.ts`, `src/text/text.ts`, `tests/unit/text.test.ts`

**Interfaces:**
- Produces: `LANGUAGES`, `Language`, `DEFAULT_LANGUAGE`, `TextId`, `TextKey`, `TABLE`,
  `textKey(id: TextId): TextKey`, `textOf(key: TextKey, language: Language): string`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/text.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  TABLE,
  type TextId,
  type TextKey,
  textKey,
  textOf,
} from '../../src/text/text';

describe('the language table (INV-4, 0016)', () => {
  it('has German first and English second, and German is the default', () => {
    expect(LANGUAGES).toStrictEqual(['de', 'en']);
    expect(DEFAULT_LANGUAGE).toBe('de');
  });

  it('has the same keys in `de` and in `en`', () => {
    expect(Object.keys(TABLE.en).sort()).toStrictEqual(Object.keys(TABLE.de).sort());
  });

  it('names every key `<kind>.<what>` in lower case', () => {
    for (const key of Object.keys(TABLE.de)) {
      expect(key).toMatch(/^[a-z]+\.[a-z]+(-[a-z]+)*$/);
    }
  });

  it('has no empty string', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        expect(text.trim(), `${language} ${key}`).not.toBe('');
      }
    }
  });

  it('holds the sentence of 0016 in both languages', () => {
    const key = textKey('notice.shadow-too-dense');
    expect(textOf(key, 'de')).toBe('Dieser Schatten ist zu dicht für die Lampe.');
    expect(textOf(key, 'en')).toBe('This shadow is too dense for the lamp.');
  });

  it('makes a key that is a plain string at run time, so a state that holds one stays plain data', () => {
    const key = textKey('notice.shadow-too-dense');
    expect(key).toBe('notice.shadow-too-dense');
    expect(JSON.parse(JSON.stringify({ key }))).toStrictEqual({ key });
  });
});

describe('TextKey (INV-4): a literal does not compile where a key is asked for', () => {
  it('is made by textKey from an id of the table and from nothing else', () => {
    expectTypeOf(textKey).parameter(0).toEqualTypeOf<TextId>();
    expectTypeOf(textKey).returns.toEqualTypeOf<TextKey>();
    expectTypeOf<string>().not.toExtend<TextId>();
  });

  it('is asked for by textOf, and neither a string nor an id is one', () => {
    expectTypeOf(textOf).parameter(0).toEqualTypeOf<TextKey>();
    expectTypeOf<string>().not.toExtend<TextKey>();
    expectTypeOf<TextId>().not.toExtend<TextKey>();
    expectTypeOf<'notice.shadow-too-dense'>().not.toExtend<TextKey>();
    expectTypeOf<TextKey>().toExtend<string>();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/text.test.ts` — expected: fails, the module
  does not exist.

- [ ] **Step 3: Implement.** `src/text/de.ts`:

```ts
/**
 * German, the first language (vision.md §7): its keys are the keys of the table. A key is
 * `<kind>.<what>` in lower case. Every string a player can read is here or in `en.ts` (INV-4).
 */
export const de = {
  'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
} as const;
```

  `src/text/en.ts`:

```ts
import type { de } from './de';

/** English, the second language: exactly the keys of `de`, or it does not compile. */
export const en: Readonly<Record<keyof typeof de, string>> = {
  'notice.shadow-too-dense': 'This shadow is too dense for the lamp.',
};
```

  `src/text/text.ts`:

```ts
import { de } from './de';
import { en } from './en';

/**
 * The language table and its keys (architecture.md §8, INV-4). `game/` and `render/` pass a
 * `TextKey`; only `render/draw-text` turns one into characters. Pure data and pure functions.
 */

/** German first, English second (vision.md §7). */
export const LANGUAGES = ['de', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
/** The language the game shows until it can be switched (0018). */
export const DEFAULT_LANGUAGE: Language = 'de';

/** The ids of the table: the keys of `de`. */
export type TextId = keyof typeof de;

declare const brand: unique symbol;
/**
 * A key of the language table. A branded string: only `textKey` makes one, so a literal does
 * not compile where a key is asked for. At run time it is its id, a plain string.
 */
export type TextKey = TextId & { readonly [brand]: true };

export const TABLE: Readonly<Record<Language, Readonly<Record<TextId, string>>>> = { de, en };

/** The key of an id. A misspelt id does not compile. */
export function textKey(id: TextId): TextKey {
  return id as TextKey;
}

/** The string of a key in a language. */
export function textOf(key: TextKey, language: Language): string {
  // The brand is a type only; the key is its id. Indexing with the branded type does not compile.
  const id: TextId = key;
  return TABLE[language][id];
}
```

- [ ] **Step 4: Run** `npm run check` — expected: green. This code was compiled when the plan
  was written: `textOf('notice.shadow-too-dense', 'de')` and `textKey('notice.shadow-to-dense')`
  are both rejected by `tsc`.

- [ ] **Step 5: Commit** — `Add the language table and the text key`, body: INV-4 asks for
  keys from the first line of text; a branded key makes a literal a compile error instead of a
  review finding.

---

### Task 2: The font

**Files:**
- Create: `src/render/font.ts`, `tools/placeholder-font.ts`, `public/sprites/font.png`
  (generated), `tests/unit/font.test.ts`
- Modify: `tools/gen-sprites.ts`, `tests/unit/assets.test.ts`

**Interfaces:**
- Consumes: `LANGUAGES`, `TABLE` (T1).
- Produces, in `src/render/font.ts`: `GLYPH_WIDTH` (6), `GLYPH_HEIGHT` (10), `GLYPHS` (108
  characters), `UNKNOWN_GLYPH` (`?`), `glyphIndex(character: string): number`. In
  `tools/placeholder-font.ts`: `FONT_COLOUR`, `FONT_SHEET_WIDTH` (648), `FONT_SHEET_HEIGHT`
  (10), `PICTURES`, `glyphRows(character): readonly string[]`, `renderFont(): Uint8Array`. In
  `tools/gen-sprites.ts`: `encodeFontPng(): Buffer`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/font.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import {
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  GLYPHS,
  glyphIndex,
  UNKNOWN_GLYPH,
} from '../../src/render/font';
import { LANGUAGES, TABLE } from '../../src/text/text';
import { encodeFontPng } from '../../tools/gen-sprites.ts';
import {
  FONT_COLOUR,
  FONT_SHEET_HEIGHT,
  FONT_SHEET_WIDTH,
  glyphRows,
  PICTURES,
  renderFont,
} from '../../tools/placeholder-font.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FILE = join(ROOT, 'public/sprites/font.png');
const SHEET = renderFont();
const CAPITALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

/** The cell of a character as ten rows of six, read from the sheet: `#` is a white pixel. */
function cell(character: string): string[] {
  const left = GLYPHS.indexOf(character) * GLYPH_WIDTH;
  return Array.from({ length: GLYPH_HEIGHT }, (_row, y) =>
    Array.from({ length: GLYPH_WIDTH }, (_column, x) => {
      const o = (y * FONT_SHEET_WIDTH + left + x) * 4;
      if (SHEET[o + 3] === 0) {
        return '.';
      }
      expect([SHEET[o], SHEET[o + 1], SHEET[o + 2], SHEET[o + 3]]).toStrictEqual([
        255, 255, 255, 255,
      ]);
      return '#';
    }).join(''),
  );
}

/** The rows of a character's cell that hold a pixel. */
const rowsOf = (character: string): number[] =>
  cell(character).flatMap((row, y) => (row.includes('#') ? [y] : []));

describe('the glyph order (0016)', () => {
  it('is 108 characters, none twice: ASCII 32 to 126, then the German letters and the typographic marks', () => {
    expect(GLYPHS).toHaveLength(108);
    expect(new Set(GLYPHS).size).toBe(108);
    expect(GLYPHS.slice(0, 95)).toBe(
      Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join(''),
    );
    expect(GLYPHS.slice(95)).toBe('ÄÖÜäöüß„“”–…’');
    expect([GLYPH_WIDTH, GLYPH_HEIGHT]).toStrictEqual([6, 10]);
  });

  it('gives a character its place in the order, and the place of `?` to one it does not have', () => {
    expect(glyphIndex(' ')).toBe(0);
    expect(glyphIndex('A')).toBe(33);
    expect(glyphIndex('ü')).toBe(100);
    expect(UNKNOWN_GLYPH).toBe('?');
    expect(glyphIndex('€')).toBe(31);
    expect(glyphIndex('é')).toBe(31);
  });

  it('has a glyph for every character of every string of both languages', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        for (const character of text) {
          expect(GLYPHS.includes(character), `${language} ${key}: "${character}"`).toBe(true);
        }
      }
    }
  });
});

describe('the placeholder font generator (0016)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeFontPng().equals(encodeFontPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(FILE));
    expect([committed.width, committed.height]).toStrictEqual([648, 10]);
    expect(Buffer.from(SHEET).equals(committed.data)).toBe(true);
  });

  it('is 648x10: 108 cells of 6x10 in one row, in white', () => {
    expect([FONT_SHEET_WIDTH, FONT_SHEET_HEIGHT]).toStrictEqual([648, 10]);
    expect(SHEET).toHaveLength(648 * 10 * 4);
    expect(FONT_COLOUR).toBe('#ffffff');
  });

  it('has one picture per glyph, in the glyph order', () => {
    expect(PICTURES.map(([character]) => character).join('')).toBe(GLYPHS);
  });

  it('draws every glyph as its picture, with column 5 empty', () => {
    for (const character of GLYPHS) {
      expect(cell(character), character).toStrictEqual(
        glyphRows(character).map((row) => `${row}.`),
      );
    }
  });

  it('gives every glyph but the space at least one pixel, and no two glyphs the same picture', () => {
    const seen = new Map<string, string>();
    for (const character of GLYPHS) {
      const picture = cell(character).join(' ');
      expect(picture.includes('#'), character).toBe(character !== ' ');
      expect(seen.get(picture), `${character} looks like another glyph`).toBeUndefined();
      seen.set(picture, character);
    }
  });

  it('stands capitals and digits on the baseline: rows 1 to 7, nothing above or below', () => {
    for (const character of CAPITALS + DIGITS) {
      const rows = rowsOf(character);
      expect([rows[0], rows.at(-1)], character).toStrictEqual([1, 7]);
    }
  });

  it('puts the dots of Ä, Ö and Ü in row 0', () => {
    for (const character of 'ÄÖÜ') {
      expect(rowsOf(character)[0], character).toBe(0);
    }
  });

  it('lets exactly g, j, p, q and y reach below the baseline, and no letter a–z use row 0', () => {
    const below = [...LETTERS].filter((character) => (rowsOf(character).at(-1) ?? 0) > 7);
    expect(below).toStrictEqual(['g', 'j', 'p', 'q', 'y']);
    for (const character of LETTERS) {
      expect(rowsOf(character)[0], character).toBeGreaterThanOrEqual(1);
    }
  });

  it('knows no picture for a character outside the font', () => {
    expect(() => glyphRows('€')).toThrow('the font has no glyph for "€"');
  });
});
```

  In `tests/unit/assets.test.ts` add after the test of the shadow-wall sheet:

```ts
  it('checks the font sheet under public/sprites/ with every other PNG (0016)', () => {
    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/font.png');
  });
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/font.test.ts` — expected: fails, the modules
  do not exist.

- [ ] **Step 3: Implement** `src/render/font.ts`:

```ts
/**
 * The game's one font (visual.md §5, feature 0016): monospaced, a cell of 6x10 pixels per
 * glyph — the glyph in columns 0–4, column 5 empty. The sheet holds the glyphs in one row in
 * the order of GLYPHS; a glyph's frame is its place in it. This file imports nothing: the
 * generator in tools/ reads the order from it.
 */

export const GLYPH_WIDTH = 6;
export const GLYPH_HEIGHT = 10;

/** The 95 printable ASCII characters, from the space (32) to the tilde (126). */
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');

/** Every character the font has: ASCII, then what German and typographic quotes need. */
export const GLYPHS = `${ASCII}ÄÖÜäöüß„“”–…’`;

/** Drawn for a character the font does not have; a test keeps the tables free of such. */
export const UNKNOWN_GLYPH = '?';

/** The frame of a character in the font sheet. */
export function glyphIndex(character: string): number {
  const index = GLYPHS.indexOf(character);
  return index >= 0 ? index : GLYPHS.indexOf(UNKNOWN_GLYPH);
}
```

  `tools/placeholder-font.ts` — the pictures below were drawn for this game and checked when
  the plan was written (every rule of the spec's criteria 6 and 7 holds, and a preview was
  read). Copy them exactly; do not redraw a glyph:

```ts
import { GLYPH_HEIGHT, GLYPH_WIDTH, GLYPHS } from '../src/render/font.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder font sheet (visual.md §5, feature 0016): 108 glyphs of 6x10 in one row, in
 * the order of GLYPHS, white on transparent. A picture is a glyph's ten rows of five pixels,
 * top to bottom, `#` set and `.` empty; the sixth column of a cell stays empty. Row 0 holds
 * the dots of Ä, Ö and Ü; capitals and digits fill rows 1–7; the body of a lower-case letter
 * rows 3–7; descenders rows 8–9. Drawn for this game — no font file is copied or shipped.
 * Pure — it returns pixels; tools/gen-sprites.ts writes the file.
 */

export const FONT_COLOUR: PaletteColour = '#ffffff';
export const FONT_SHEET_WIDTH = GLYPHS.length * GLYPH_WIDTH;
export const FONT_SHEET_HEIGHT = GLYPH_HEIGHT;
/** A picture leaves the cell's last column empty. */
const PICTURE_WIDTH = GLYPH_WIDTH - 1;
const PICTURE_ROW = new RegExp(`^[#.]{${PICTURE_WIDTH}}$`);

/** Per glyph: the character and its ten rows, separated by spaces. In the order of GLYPHS. */
export const PICTURES: readonly (readonly [string, string])[] = [
  [' ', '..... ..... ..... ..... ..... ..... ..... ..... ..... .....'],
  ['!', '..... ..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#.. ..... .....'],
  ['"', '..... .#.#. .#.#. ..... ..... ..... ..... ..... ..... .....'],
  ['#', '..... .#.#. .#.#. ##### .#.#. ##### .#.#. .#.#. ..... .....'],
  ['$', '..... ..#.. .#### #.#.. .###. ..#.# ####. ..#.. ..... .....'],
  ['%', '..... ##... ##..# ...#. ..#.. .#... #..## ...## ..... .....'],
  ['&', '..... .##.. #..#. #.#.. .#... #.#.# #..#. .##.# ..... .....'],
  ["'", '..... ..#.. ..#.. ..... ..... ..... ..... ..... ..... .....'],
  ['(', '..... ...#. ..#.. .#... .#... .#... ..#.. ...#. ..... .....'],
  [')', '..... .#... ..#.. ...#. ...#. ...#. ..#.. .#... ..... .....'],
  ['*', '..... ..... ..#.. #.#.# .###. #.#.# ..#.. ..... ..... .....'],
  ['+', '..... ..... ..#.. ..#.. ##### ..#.. ..#.. ..... ..... .....'],
  [',', '..... ..... ..... ..... ..... ..... .##.. .##.. ..#.. .#...'],
  ['-', '..... ..... ..... ..... .###. ..... ..... ..... ..... .....'],
  ['.', '..... ..... ..... ..... ..... ..... .##.. .##.. ..... .....'],
  ['/', '..... ....# ....# ...#. ..#.. .#... #.... #.... ..... .....'],
  ['0', '..... .###. #...# #..## #.#.# ##..# #...# .###. ..... .....'],
  ['1', '..... ..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###. ..... .....'],
  ['2', '..... .###. #...# ....# ...#. ..#.. .#... ##### ..... .....'],
  ['3', '..... .###. #...# ....# ..##. ....# #...# .###. ..... .....'],
  ['4', '..... ...#. ..##. .#.#. #..#. ##### ...#. ...#. ..... .....'],
  ['5', '..... ##### #.... ####. ....# ....# #...# .###. ..... .....'],
  ['6', '..... ..##. .#... #.... ####. #...# #...# .###. ..... .....'],
  ['7', '..... ##### ....# ...#. ..#.. .#... .#... .#... ..... .....'],
  ['8', '..... .###. #...# #...# .###. #...# #...# .###. ..... .....'],
  ['9', '..... .###. #...# #...# .#### ....# ...#. .##.. ..... .....'],
  [':', '..... ..... ..... .##.. .##.. ..... .##.. .##.. ..... .....'],
  [';', '..... ..... ..... .##.. .##.. ..... .##.. .##.. ..#.. .#...'],
  ['<', '..... ...#. ..#.. .#... #.... .#... ..#.. ...#. ..... .....'],
  ['=', '..... ..... ..... ##### ..... ##### ..... ..... ..... .....'],
  ['>', '..... .#... ..#.. ...#. ....# ...#. ..#.. .#... ..... .....'],
  ['?', '..... .###. #...# ....# ...#. ..#.. ..... ..#.. ..... .....'],
  ['@', '..... .###. #...# #.### #.#.# #.### #.... .###. ..... .....'],
  ['A', '..... .###. #...# #...# ##### #...# #...# #...# ..... .....'],
  ['B', '..... ####. #...# #...# ####. #...# #...# ####. ..... .....'],
  ['C', '..... .###. #...# #.... #.... #.... #...# .###. ..... .....'],
  ['D', '..... ####. #...# #...# #...# #...# #...# ####. ..... .....'],
  ['E', '..... ##### #.... #.... ####. #.... #.... ##### ..... .....'],
  ['F', '..... ##### #.... #.... ####. #.... #.... #.... ..... .....'],
  ['G', '..... .###. #...# #.... #.### #...# #...# .###. ..... .....'],
  ['H', '..... #...# #...# #...# ##### #...# #...# #...# ..... .....'],
  ['I', '..... .###. ..#.. ..#.. ..#.. ..#.. ..#.. .###. ..... .....'],
  ['J', '..... ..### ...#. ...#. ...#. ...#. #..#. .##.. ..... .....'],
  ['K', '..... #...# #..#. #.#.. ##... #.#.. #..#. #...# ..... .....'],
  ['L', '..... #.... #.... #.... #.... #.... #.... ##### ..... .....'],
  ['M', '..... #...# ##.## #.#.# #.#.# #...# #...# #...# ..... .....'],
  ['N', '..... #...# ##..# #.#.# #..## #...# #...# #...# ..... .....'],
  ['O', '..... .###. #...# #...# #...# #...# #...# .###. ..... .....'],
  ['P', '..... ####. #...# #...# ####. #.... #.... #.... ..... .....'],
  ['Q', '..... .###. #...# #...# #...# #.#.# #..#. .##.# ..... .....'],
  ['R', '..... ####. #...# #...# ####. #.#.. #..#. #...# ..... .....'],
  ['S', '..... .#### #.... #.... .###. ....# ....# ####. ..... .....'],
  ['T', '..... ##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..... .....'],
  ['U', '..... #...# #...# #...# #...# #...# #...# .###. ..... .....'],
  ['V', '..... #...# #...# #...# #...# #...# .#.#. ..#.. ..... .....'],
  ['W', '..... #...# #...# #...# #.#.# #.#.# ##.## #...# ..... .....'],
  ['X', '..... #...# #...# .#.#. ..#.. .#.#. #...# #...# ..... .....'],
  ['Y', '..... #...# #...# .#.#. ..#.. ..#.. ..#.. ..#.. ..... .....'],
  ['Z', '..... ##### ....# ...#. ..#.. .#... #.... ##### ..... .....'],
  ['[', '..... .###. .#... .#... .#... .#... .#... .###. ..... .....'],
  ['\\', '..... #.... #.... .#... ..#.. ...#. ....# ....# ..... .....'],
  [']', '..... .###. ...#. ...#. ...#. ...#. ...#. .###. ..... .....'],
  ['^', '..... ..#.. .#.#. #...# ..... ..... ..... ..... ..... .....'],
  ['_', '..... ..... ..... ..... ..... ..... ..... ..... ##### .....'],
  ['`', '..... .#... ..#.. ..... ..... ..... ..... ..... ..... .....'],
  ['a', '..... ..... ..... .###. ....# .#### #...# .#### ..... .....'],
  ['b', '..... #.... #.... ####. #...# #...# #...# ####. ..... .....'],
  ['c', '..... ..... ..... .###. #...# #.... #...# .###. ..... .....'],
  ['d', '..... ....# ....# .#### #...# #...# #...# .#### ..... .....'],
  ['e', '..... ..... ..... .###. #...# ##### #.... .###. ..... .....'],
  ['f', '..... ..##. .#... ###.. .#... .#... .#... .#... ..... .....'],
  ['g', '..... ..... ..... .#### #...# #...# #...# .#### ....# .###.'],
  ['h', '..... #.... #.... ####. #...# #...# #...# #...# ..... .....'],
  ['i', '..... ..#.. ..... .##.. ..#.. ..#.. ..#.. .###. ..... .....'],
  ['j', '..... ...#. ..... ..##. ...#. ...#. ...#. ...#. #..#. .##..'],
  ['k', '..... #.... #.... #..#. #.#.. ##... #.#.. #..#. ..... .....'],
  ['l', '..... .##.. ..#.. ..#.. ..#.. ..#.. ..#.. .###. ..... .....'],
  ['m', '..... ..... ..... ##.#. #.#.# #.#.# #.#.# #.#.# ..... .....'],
  ['n', '..... ..... ..... ####. #...# #...# #...# #...# ..... .....'],
  ['o', '..... ..... ..... .###. #...# #...# #...# .###. ..... .....'],
  ['p', '..... ..... ..... ####. #...# #...# #...# ####. #.... #....'],
  ['q', '..... ..... ..... .#### #...# #...# #...# .#### ....# ....#'],
  ['r', '..... ..... ..... #.##. ##..# #.... #.... #.... ..... .....'],
  ['s', '..... ..... ..... .#### #.... .###. ....# ####. ..... .....'],
  ['t', '..... .#... .#... ###.. .#... .#... .#..# ..##. ..... .....'],
  ['u', '..... ..... ..... #...# #...# #...# #...# .#### ..... .....'],
  ['v', '..... ..... ..... #...# #...# #...# .#.#. ..#.. ..... .....'],
  ['w', '..... ..... ..... #...# #...# #.#.# #.#.# .#.#. ..... .....'],
  ['x', '..... ..... ..... #...# .#.#. ..#.. .#.#. #...# ..... .....'],
  ['y', '..... ..... ..... #...# #...# #...# #...# .#### ....# .###.'],
  ['z', '..... ..... ..... ##### ...#. ..#.. .#... ##### ..... .....'],
  ['{', '..... ...## ..#.. ..#.. .#... ..#.. ..#.. ...## ..... .....'],
  ['|', '..... ..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..... .....'],
  ['}', '..... ##... ..#.. ..#.. ...#. ..#.. ..#.. ##... ..... .....'],
  ['~', '..... ..... ..... .#... #.#.# ...#. ..... ..... ..... .....'],
  ['Ä', '.#.#. ..... .###. #...# #...# ##### #...# #...# ..... .....'],
  ['Ö', '.#.#. ..... .###. #...# #...# #...# #...# .###. ..... .....'],
  ['Ü', '.#.#. ..... #...# #...# #...# #...# #...# .###. ..... .....'],
  ['ä', '..... .#.#. ..... .###. ....# .#### #...# .#### ..... .....'],
  ['ö', '..... .#.#. ..... .###. #...# #...# #...# .###. ..... .....'],
  ['ü', '..... .#.#. ..... #...# #...# #...# #...# .#### ..... .....'],
  ['ß', '..... .##.. #..#. #..#. #.##. #...# #...# #.##. ..... .....'],
  ['„', '..... ..... ..... ..... ..... ..... .#.#. .#.#. #.#.. .....'],
  ['“', '..... ..#.# .#.#. .#.#. ..... ..... ..... ..... ..... .....'],
  ['”', '..... .#.#. .#.#. #.#.. ..... ..... ..... ..... ..... .....'],
  ['–', '..... ..... ..... ..... ##### ..... ..... ..... ..... .....'],
  ['…', '..... ..... ..... ..... ..... ..... #.#.# #.#.# ..... .....'],
  ['’', '..... ..#.. ..#.. .#... ..... ..... ..... ..... ..... .....'],
];

/** The ten rows of a glyph's picture, five pixels each. */
export function glyphRows(character: string): readonly string[] {
  const picture = PICTURES.find(([name]) => name === character);
  if (picture === undefined) {
    throw new Error(`the font has no glyph for "${character}"`);
  }
  const rows = picture[1].split(' ');
  if (rows.length !== GLYPH_HEIGHT || rows.some((row) => !PICTURE_ROW.test(row))) {
    throw new Error(
      `the glyph "${character}" is not ${GLYPH_HEIGHT} rows of ${PICTURE_WIDTH} pixels`,
    );
  }
  return rows;
}

/** RGBA, row-major, FONT_SHEET_WIDTH × FONT_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderFont(): Uint8Array {
  if (PICTURES.map(([character]) => character).join('') !== GLYPHS) {
    throw new Error('the pictures are not in the order of GLYPHS');
  }
  const data = new Uint8Array(FONT_SHEET_WIDTH * FONT_SHEET_HEIGHT * 4);
  [...GLYPHS].forEach((character, index) => {
    glyphRows(character).forEach((row, y) => {
      [...row].forEach((pixel, x) => {
        if (pixel === '#') {
          data.set(
            [...rgb(FONT_COLOUR), 255],
            (y * FONT_SHEET_WIDTH + index * GLYPH_WIDTH + x) * 4,
          );
        }
      });
    });
  });
  return data;
}
```

  `tools/gen-sprites.ts`: import `FONT_SHEET_HEIGHT`, `FONT_SHEET_WIDTH` and `renderFont` from
  `./placeholder-font.ts`, add

```ts
export function encodeFontPng(): Buffer {
  const png = new PNG({ width: FONT_SHEET_WIDTH, height: FONT_SHEET_HEIGHT });
  png.data = Buffer.from(renderFont());
  return PNG.sync.write(png);
}
```

  write `public/sprites/font.png` in the main block, and name the file in the head comment.

- [ ] **Step 4: Generate** — `npm run gen-sprites`; `git status --short public/sprites` shows
  one new file and no changed one.

- [ ] **Step 5: Run** `npm run check` — expected: green. If a test of the glyphs' rows fails, a
  picture was copied wrong — compare it with this plan; do not change the test.

- [ ] **Step 6: Commit** — `Draw the game's font`, body: text needs a font from the game's own
  origin (INV-5); drawing it in the repository keeps it in the palette, deterministic and free
  of licence questions, and the art pass can replace the PNG.

---

### Task 3: One line of text

**Files:**
- Create: `src/render/draw-text.ts`, `tests/unit/draw-text.test.ts`

**Interfaces:**
- Consumes: `textOf`, `Language`, `TextKey` (T1); `GLYPH_WIDTH`, `glyphIndex` (T2); `Renderer`,
  `SpriteSheet` from `src/render/renderer`.
- Produces: `drawText(renderer: Renderer, font: SpriteSheet, key: TextKey, language: Language,
  x: number, y: number): void`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/draw-text.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import { drawText } from '../../src/render/draw-text';
import type { Renderer, SpriteSheet } from '../../src/render/renderer';
import { type TextKey, textKey } from '../../src/text/text';

const FONT: SpriteSheet = { image: {} as ImageBitmap, frameWidth: 6, frameHeight: 10 };
const KEY = textKey('notice.shadow-too-dense');

/** A renderer that records its sprite calls as `frame at x,y` and fails on anything else. */
function recorder(): { readonly renderer: Renderer; readonly calls: string[] } {
  const calls: string[] = [];
  const unexpected = (): never => {
    throw new Error('drawText draws sprites only');
  };
  return {
    calls,
    renderer: {
      clear: unexpected,
      fillRect: unexpected,
      drawTile: unexpected,
      drawSprite(sheet, frame, x, y) {
        expect(sheet).toBe(FONT);
        calls.push(`${frame} at ${x},${y}`);
      },
    },
  };
}

describe('drawText (0016)', () => {
  it('draws character n at (x + 6n, y) with the frame of its place in the glyph order', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'de', 31, 162);
    // "Dieser Schatten ist zu dicht für die Lampe.": D is 36, i 73, e 69, s 83, r 82.
    expect(calls.slice(0, 6)).toStrictEqual([
      '36 at 31,162',
      '73 at 37,162',
      '69 at 43,162',
      '83 at 49,162',
      '69 at 55,162',
      '82 at 61,162',
    ]);
  });

  it('draws nothing for a space; the space still takes its 6 pixels', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'de', 31, 162);
    expect(calls).toHaveLength(36);
    // After "Dieser" comes a space at n = 6; "S" is character 7.
    expect(calls[6]).toBe('51 at 73,162');
  });

  it('draws an umlaut from its own glyph: the ü of "für" is frame 100, character 30', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'de', 31, 162);
    expect(calls).toContain('100 at 211,162');
    expect(calls.at(-1)).toBe('14 at 283,162');
  });

  it('draws the string of the language it is given', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'en', 0, 0);
    expect(calls).toHaveLength(31);
    expect(calls[0]).toBe('52 at 0,0');
    expect(calls.at(-1)).toBe('14 at 222,0');
  });

  it('asks for a TextKey: a literal does not compile (INV-4)', () => {
    expectTypeOf(drawText).parameter(2).toEqualTypeOf<TextKey>();
    expectTypeOf<string>().not.toExtend<TextKey>();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/draw-text.test.ts` — expected: fails, the
  module does not exist.

- [ ] **Step 3: Implement** `src/render/draw-text.ts`:

```ts
import { type Language, type TextKey, textOf } from '../text/text';
import { GLYPH_WIDTH, glyphIndex } from './font';
import type { Renderer, SpriteSheet } from './renderer';

/**
 * One line of text (architecture.md §8, feature 0016): the string of a key in a language,
 * drawn from the font sheet. Character n, counted from 0, has its top-left corner at
 * (x + 6n, y). A space is not drawn; it only takes its width. A character the font does not
 * have is drawn as `?`. There is no wrapping. The only way to draw text: it takes a TextKey,
 * so a literal does not compile (INV-4).
 */
export function drawText(
  renderer: Renderer,
  font: SpriteSheet,
  key: TextKey,
  language: Language,
  x: number,
  y: number,
): void {
  let column = 0;
  for (const character of textOf(key, language)) {
    if (character !== ' ') {
      renderer.drawSprite(font, glyphIndex(character), x + column * GLYPH_WIDTH, y);
    }
    column += 1;
  }
}
```

  That the unknown character becomes `?` is tested on `glyphIndex` in Task 2: the tables hold
  no such character, and a string-taking twin of `drawText` only to test it would be the
  loophole INV-4 closes.

- [ ] **Step 4: Run** `npm run check` — expected: green.

- [ ] **Step 5: Commit** — `Draw a line of text from the font sheet`, body: the renderer
  interface stays as it is — a glyph is a sprite — and the one function that draws text takes a
  key, not a string.

---

### Task 4: The notice

**Files:**
- Create: `src/game/notice.ts`, `tests/unit/notice.test.ts`

**Interfaces:**
- Consumes: `TextKey`, `textKey` (T1); `GameState` from `src/game/state`.
- Produces: `NOTICE_SHADOW_TOO_DENSE: TextKey`, `noticeOf(state: GameState): TextKey | null`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/notice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
import type { GameInput } from '../../src/game/player';
import type { GameState, ShadowWallState } from '../../src/game/state';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE: GameInput = { up: false, down: false, left: false, right: false, lamp: false };
const SHINE: GameInput = { ...NONE, lamp: true };
const HOLDS: ShadowWallState = { wall: 0, lit: true, light: 0 };
const BASE = createInitialState(grassMap(20, 12, { x: 152, y: 96 }));
const withWalls = (lampOn: boolean, ...shadowWalls: ShadowWallState[]): GameState => ({
  ...BASE,
  lamp: { on: lampOn, strength: 1 },
  shadowWalls,
});

describe('noticeOf (0016)', () => {
  it('is the sentence of the dense shadow while the lamp is on a wall that holds', () => {
    expect(NOTICE_SHADOW_TOO_DENSE).toBe(textKey('notice.shadow-too-dense'));
    expect(noticeOf(withWalls(true, HOLDS))).toBe(NOTICE_SHADOW_TOO_DENSE);
  });

  it('is the same with a second wall that does not hold', () => {
    expect(noticeOf(withWalls(true, { wall: 0, lit: false, light: 0 }, { ...HOLDS, wall: 1 }))).toBe(
      NOTICE_SHADOW_TOO_DENSE,
    );
    expect(noticeOf(withWalls(true, { wall: 0, lit: true, light: 12 }, { ...HOLDS, wall: 1 }))).toBe(
      NOTICE_SHADOW_TOO_DENSE,
    );
  });

  it('is nothing with the lamp off', () => {
    expect(noticeOf(withWalls(false, HOLDS))).toBeNull();
  });

  it('is nothing for a wall that gives way, at any count', () => {
    for (const light of [1, 30, 59]) {
      expect(noticeOf(withWalls(true, { wall: 0, lit: true, light }))).toBeNull();
    }
  });

  it('is nothing when no wall is in the light, and when no wall stands', () => {
    expect(noticeOf(withWalls(true, { wall: 0, lit: false, light: 0 }))).toBeNull();
    expect(noticeOf(withWalls(true))).toBeNull();
    expect(noticeOf(BASE)).toBeNull();
  });
});

describe('the notice in play (0016)', () => {
  /** The figure stands flush above a wall at (128, 96, 48, 4) and faces down. */
  const mapWith = (name: string) =>
    grassMap(20, 12, { x: 152, y: 96 }, [], [{ name, x: 128, y: 96, width: 48, height: 4 }]);

  it('appears with the first step of light on a dense wall and is gone with the first step without', () => {
    const map = mapWith('shadow:hr');
    const start = createInitialState(map);
    expect(noticeOf(start)).toBeNull();
    const lit = update(start, SHINE, map);
    expect(noticeOf(lit)).toBe(NOTICE_SHADOW_TOO_DENSE);
    expect(noticeOf(update(lit, NONE, map))).toBeNull();
  });

  it('is gone when the figure turns away with the lamp still on', () => {
    const map = mapWith('shadow:hr');
    const lit = update(createInitialState(map), SHINE, map);
    const turned = update(lit, { ...SHINE, up: true }, map);
    expect(turned.lamp.on).toBe(true);
    expect(noticeOf(turned)).toBeNull();
  });

  it('never appears while a thin wall gives way', () => {
    const map = mapWith('shadow:marketing');
    let state = createInitialState(map);
    for (let step = 0; step < 60; step += 1) {
      state = update(state, SHINE, map);
      expect(noticeOf(state), `step ${step + 1}`).toBeNull();
    }
    expect(state.shadowWalls).toStrictEqual([]);
  });

  it('is gone in the dark: the lamp is off from its first step', () => {
    const map = mapWith('shadow:hr');
    const lit = update(createInitialState(map), SHINE, map);
    const dark = update({ ...lit, dark: 1 }, SHINE, map);
    expect(dark.shadowWalls).toStrictEqual([HOLDS]);
    expect(noticeOf(dark)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/notice.test.ts` — expected: fails, the module
  does not exist.

- [ ] **Step 3: Implement** `src/game/notice.ts`:

```ts
import { type TextKey, textKey } from '../text/text';
import type { GameState } from './state';

/**
 * The notice (gameplay.md §2, feature 0016): one line the game itself says, shown at the
 * bottom of the screen while its cause lasts. Derived from the state in every frame and kept
 * nowhere — the state has no field for it. There is one notice. Pure.
 */

/** A shadow wall holds against the lamp: its density is above the lamp's strength (0014). */
export const NOTICE_SHADOW_TOO_DENSE: TextKey = textKey('notice.shadow-too-dense');

/**
 * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
 * is on and cannot lift: a wall that gives way counts from 1 in its first step. In the dark
 * the lamp is off, so there is no notice.
 */
export function noticeOf(state: GameState): TextKey | null {
  const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
  return state.lamp.on && holds ? NOTICE_SHADOW_TOO_DENSE : null;
}
```

- [ ] **Step 4: Run** `npm run check` — expected: green. The architecture test now lists
  `notice.ts` and finds it clean; it imports from `text/`, which the test allows.

- [ ] **Step 5: Commit** — `Derive the notice from the state`, body: 0014 left the word that
  the lamp is too weak to M4; deriving it keeps the state as it is (INV-1) and makes the line
  appear and vanish with its cause.

---

### Task 5: The notice in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`, `src/main.ts`
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `noticeOf` (T4), `drawText` (T3), `GLYPH_WIDTH`, `GLYPH_HEIGHT` (T2), `textOf`,
  `Language`, `DEFAULT_LANGUAGE`, `TABLE`, `LANGUAGES` (T1).
- Produces: `SceneContent.fontSheet`, `SceneContent.language`; `NOTICE_BAR`, `NOTICE_PADDING`
  (4), `NOTICE_CAPACITY` (49), `noticeOrigin(length: number): Point`.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/draw-scene.test.ts`: `CONTENT` gets

```ts
  fontSheet: { image: {} as ImageBitmap, frameWidth: 6, frameHeight: 10 },
  language: 'de',
```

  import `NOTICE_BAR`, `NOTICE_CAPACITY` and `noticeOrigin` from `draw-scene` and `LANGUAGES`
  and `TABLE` from `../../src/text/text`, and add at the end:

```ts
describe('the notice in the scene (0016)', () => {
  /** The lamp is on a wall that holds; one full and one empty heart. */
  const holding = (fields: Partial<GameState> = {}): GameState => ({
    ...state({ x: 20, y: 30 }, { x: 0, y: 0 }, true),
    shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    overview: { current: 1, max: 2 },
    ...fields,
  });
  const BAR = 'fillRect 8,158 304x18 #181425';
  /** The sprite calls that went to a sheet, in order. */
  const spritesOn = (renderer: ReturnType<typeof recordingRenderer>, sheet: unknown): string[] =>
    renderer.calls
      .filter((call) => call.startsWith('drawSprite'))
      .filter((_call, i) => renderer.sheets[i] === sheet);

  it('places the bar and the line as the spec says', () => {
    expect(NOTICE_BAR).toStrictEqual({ x: 8, y: 158, width: 304, height: 18 });
    expect(NOTICE_CAPACITY).toBe(49);
    expect(noticeOrigin(43)).toStrictEqual({ x: 31, y: 162 });
    expect(noticeOrigin(38)).toStrictEqual({ x: 46, y: 162 });
    expect(noticeOrigin(49)).toStrictEqual({ x: 13, y: 162 });
  });

  it('draws the bar and then the German line, after the hearts', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, holding(), CONTENT);
    const bar = renderer.calls.indexOf(BAR);
    expect(bar).toBeGreaterThan(renderer.calls.indexOf('drawSprite 1 at 14,4'));
    expect(renderer.calls.indexOf('drawSprite 0 at 4,4')).toBeGreaterThan(-1);
    const line = renderer.calls.slice(bar + 1);
    expect(line).toHaveLength(36);
    expect(line[0]).toBe('drawSprite 36 at 31,162');
    expect(line).toContain('drawSprite 100 at 211,162');
    expect(line.at(-1)).toBe('drawSprite 14 at 283,162');
    expect(spritesOn(renderer, CONTENT.fontSheet)).toStrictEqual(line);
  });

  it('draws the lids over it', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, holding({ dark: 10 }), CONTENT);
    expect(renderer.calls.slice(-2)).toStrictEqual([
      'fillRect 0,0 320x30 #181425',
      'fillRect 0,150 320x30 #181425',
    ]);
    expect(renderer.calls.indexOf(BAR)).toBeGreaterThan(-1);
    expect(renderer.calls.indexOf('drawSprite 14 at 283,162')).toBe(renderer.calls.length - 3);
  });

  it('draws the English line when the language is `en`', () => {
    const renderer = recordingRenderer();
    const english: SceneContent = { ...CONTENT, language: 'en' };
    drawScene(renderer, holding(), english);
    const line = spritesOn(renderer, CONTENT.fontSheet);
    expect(line).toHaveLength(31);
    expect(line[0]).toBe('drawSprite 52 at 46,162');
    expect(line.at(-1)).toBe('drawSprite 14 at 268,162');
  });

  it('draws neither bar nor line without a notice', () => {
    for (const scene of [
      holding({ shadowWalls: [{ wall: 0, lit: true, light: 1 }] }),
      holding({ shadowWalls: [] }),
      holding({ lamp: { on: false, strength: 1 } }),
    ]) {
      const renderer = recordingRenderer();
      drawScene(renderer, scene, CONTENT);
      expect(renderer.calls.some((call) => call.startsWith('fillRect'))).toBe(false);
      expect(spritesOn(renderer, CONTENT.fontSheet)).toStrictEqual([]);
    }
  });

  it('fits every notice of the table into the bar, in both languages', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (key.startsWith('notice.')) {
          expect(text.length, `${language} ${key}`).toBeLessThanOrEqual(NOTICE_CAPACITY);
        }
      }
    }
  });
});
```

  The wall of `holding` has no rectangle in `MAP`, so no wall sprite is drawn; `noticeOf` reads
  the state alone. The sheets of `CONTENT` are separate objects, so `spritesOn` tells them
  apart.

- [ ] **Step 2: Run** `npx vitest run tests/unit/draw-scene.test.ts` — expected: the new tests
  fail, and the typecheck names `CONTENT`.

- [ ] **Step 3: Implement** in `src/render/draw-scene.ts`. Imports: `noticeOf` from
  `../game/notice`, `type Language` and `textOf` from `../text/text`, `drawText` from
  `./draw-text`, `GLYPH_HEIGHT` and `GLYPH_WIDTH` from `./font`. In `SceneContent`:

```ts
  /** 108 glyphs of 6x10 in one row, in the order of render/font (0016). */
  readonly fontSheet: SpriteSheet;
  /** The language text is drawn in. */
  readonly language: Language;
```

  After the hearts' constants:

```ts
/** The notice (0016): a dark bar at the bottom of the surface, with one line centred in it. */
export const NOTICE_BAR: Box = { x: 8, y: 158, width: 304, height: 18 };
/** The room between the bar's edge and the line, on every side. */
export const NOTICE_PADDING = (NOTICE_BAR.height - GLYPH_HEIGHT) / 2;
/** The longest line the bar holds, in characters. */
export const NOTICE_CAPACITY = Math.floor((NOTICE_BAR.width - 2 * NOTICE_PADDING) / GLYPH_WIDTH);

/** The top-left corner of a line of `length` characters, centred on the surface: (160 − 3n, 162). */
export function noticeOrigin(length: number): Point {
  return {
    x: SURFACE_WIDTH / 2 - (length * GLYPH_WIDTH) / 2,
    y: NOTICE_BAR.y + NOTICE_PADDING,
  };
}
```

  In `drawScene`, after the loop of the hearts and before `const lid = …`:

```ts
  const notice = noticeOf(state);
  if (notice !== null) {
    renderer.fillRect(
      NOTICE_BAR.x,
      NOTICE_BAR.y,
      NOTICE_BAR.width,
      NOTICE_BAR.height,
      PAGE_BACKGROUND,
    );
    const origin = noticeOrigin(textOf(notice, content.language).length);
    drawText(renderer, content.fontSheet, notice, content.language, origin.x, origin.y);
  }
```

  Extend the comment of `drawScene`: after the hearts comes the notice — the bar and its line,
  on the surface and not shifted by the camera (0016) — then the lids. `src/main.ts`:
  `const FONT_SHEET_URL = '/sprites/font.png';`, import `GLYPH_HEIGHT` and `GLYPH_WIDTH` from
  `./render/font` and `DEFAULT_LANGUAGE` from `./text/text`, and in `loadContent`:

```ts
    fontSheet: {
      image: await loadImage(FONT_SHEET_URL),
      frameWidth: GLYPH_WIDTH,
      frameHeight: GLYPH_HEIGHT,
    },
    language: DEFAULT_LANGUAGE,
```

  and name the font sheet in the comment of `loadContent`.

- [ ] **Step 4: Run** `npm run check` and `npm run test:e2e` — expected: green; the smoke spec
  is unchanged and proves the font sheet loads, because the game does not start without it.
  Then `npm run dev` and look once: the game loads without an error in the console, and no bar
  is on screen in the reception. Looking is not walking the plan — do not go through the
  acceptance steps.

- [ ] **Step 5: Commit** — `Show the notice in the scene`, body: the line lies over the world
  like the hearts and under the lids of the dark; the bar's place and the line's length are
  constants a test holds against the language table.

---

### Task 6: The documents

**Files:**
- Modify: `docs/spec/architecture.md`, `docs/spec/visual.md`, `docs/spec/gameplay.md`,
  `docs/spec/testing.md`, `README.md`

- [ ] **Step 1: `architecture.md`.** §1 directory list: `text/` with `de.ts`, `en.ts` and
  `text.ts`; `render/font.ts` and `render/draw-text.ts`; `game/notice.ts`;
  `tools/placeholder-font.ts`; `gen-sprites.ts` writes the font sheet. In "What may import
  what": `render/` imports the keys and the lookup of `text/`. §5: the draw order gains the
  notice after the hearts and before the lids — the bar (8, 158, 304, 18) in `#181425`, the
  line from (160 − 3n, 162); text is drawn as sprites from the font sheet by `drawText`, which
  takes a `TextKey`; the sentence "later text from a bitmap font" becomes what was built. §7:
  the generator and the sheet — 648x10, 108 cells of 6x10 in the order of `GLYPHS`, the rows a
  glyph uses. §8: as built — one object per language, `en` typed by the keys of `de`,
  `TextKey` branded and made by `textKey` alone, `textOf`, `DEFAULT_LANGUAGE`; the notice is
  derived by `game/notice` and is not in the state; the sentence that the first stage has no
  text goes.

- [ ] **Step 2: `visual.md`.** §3 "The display": besides the hearts, the notice — a bar in
  `#181425` at the bottom, 8 px from the left, the right and the bottom edge, with one white
  line centred in it; "no text" goes. §5: the font is drawn in-house — monospaced, 6x10 per
  glyph, 108 glyphs, white, generated from pictures in `tools/placeholder-font.ts`; the art
  pass may replace the PNG in the same size and order; the sentence that the first stage
  needs no text goes.

- [ ] **Step 3: `gameplay.md` §2**, after the paragraph of 0014: while a wall holds against
  the lamp the game says so in one line at the bottom of the screen (feature 0016); the line
  is there as long as the light is on the wall and gone with it.

- [ ] **Step 4: `testing.md` §2**, the INV-4 row: the compiler, via `TextKey` — `drawText`,
  `textOf` and `textKey` are type-tested with `expectTypeOf`; unit tests that `de` and `en`
  have identical key sets and no empty string, that every character of both tables has a
  glyph, and that every notice fits the bar.

- [ ] **Step 5: `README.md`:** one sentence after the shadow walls — the game shows its first
  text (feature 0016): a wall that holds against the lamp says so in one line, in the game's
  own pixel font, from a language table in German and English. Add the font sheet to the
  comment of `npm run gen-sprites`.

- [ ] **Step 6: Run** `npm run check`, **commit** — `Move the text into the spec`.

---

### Task 7: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [ ] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.

---

### Task 8: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp, `F` for fullscreen. Wait
  until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–18 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 7, and start again at step 1. A letter the author cannot read is a
  failed step 6; ask which letter, and change only that picture.
- [ ] **Step 4:** after step 18 ask the five feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–18`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0016`. A feel note that wants another
  number — a wider bar, a line that stays, letters of their own width — becomes a new draft,
  not a change on this branch.

---

### Task 9: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 7. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`; commit — `Mark 0016 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0016: text on screen`, with the walk's result and feel notes in its description.
  CI must be green. The author merges.
