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
