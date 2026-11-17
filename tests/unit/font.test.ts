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
          if (character === '\n') {
            continue;
          }
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
