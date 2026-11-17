import { type Language, type TextKey, textOf } from '../text/text';
import { GLYPH_WIDTH, glyphIndex } from './font';
import type { Renderer, SpriteSheet } from './renderer';

/** Two lines are 12 px apart: a glyph is 10 px high, and 2 px lie between the lines (0017). */
export const LINE_PITCH = 12;

/**
 * Text (architecture.md §8, features 0016 and 0017): the string of a key in a language, drawn
 * from the font sheet. Character n of a line, counted from 0, has its top-left corner at
 * (x + 6n, y + 12k) on line k. A line break in the string starts the next line. A space is
 * not drawn; it only takes its width. A character the font does not have is drawn as `?`.
 * There is no wrapping. The only way to draw text: it takes a TextKey, so a literal does not
 * compile (INV-4).
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
  let line = 0;
  for (const character of textOf(key, language)) {
    if (character === '\n') {
      line += 1;
      column = 0;
      continue;
    }
    if (character !== ' ') {
      renderer.drawSprite(
        font,
        glyphIndex(character),
        x + column * GLYPH_WIDTH,
        y + line * LINE_PITCH,
      );
    }
    column += 1;
  }
}
