import { CARD_PRESENTS, CARD_TITLE } from '../game/card';
import { type Language, textOf } from '../text/text';
import { drawText } from './draw-text';
import { GLYPH_WIDTH } from './font';
import { PAGE_BACKGROUND } from './palette';
import { type Renderer, type SpriteSheet, SURFACE_WIDTH } from './renderer';

/**
 * The card a game opens with (vision.md §10, visual.md §3, feature 0036): the page background
 * and two centred lines in the game's font — who presents the game, and its title. Nothing of
 * the world is on it: no tile, no figure, no heart, no label, no bar.
 */

/** The top of the presenter's line. */
export const CARD_PRESENTS_Y = 74;
/** The top of the title, 20 px below. */
export const CARD_TITLE_Y = 94;

/** Where a line of `length` characters starts so that it is centred on the surface: 160 − 3n. */
export function centredX(length: number): number {
  return SURFACE_WIDTH / 2 - (length * GLYPH_WIDTH) / 2;
}

export function drawCard(renderer: Renderer, font: SpriteSheet, language: Language): void {
  renderer.clear(PAGE_BACKGROUND);
  for (const [key, y] of [
    [CARD_PRESENTS, CARD_PRESENTS_Y],
    [CARD_TITLE, CARD_TITLE_Y],
  ] as const) {
    drawText(renderer, font, key, language, centredX(textOf(key, language).length), y);
  }
}
