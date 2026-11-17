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
