import type { Box, Point } from '../engine/tiled';
import { type Language, type TextKey, textKey } from '../text/text';
import { drawText } from './draw-text';
import { PAGE_BACKGROUND, type PaletteColour } from './palette';
import type { Renderer, SpriteSheet } from './renderer';

/**
 * The help (gameplay.md §8, visual.md §3, feature 0021): a framed box over whatever is on
 * screen, with one row per thing the player can do — the key, and what it does. It is drawn on
 * the surface, not shifted by the camera, in the language of the scene's settings. The rows
 * are what the box shows and no rule of the game reads them, so they live here.
 */

/** A row of the help: the name of the key, and what it does. */
export interface HelpRow {
  readonly key: TextKey;
  readonly does: TextKey;
}

/** The seven rows, in the order they are drawn. */
export const HELP_ROWS: readonly HelpRow[] = [
  { key: textKey('help.key-walk'), does: textKey('help.do-walk') },
  { key: textKey('help.key-lamp'), does: textKey('help.do-lamp') },
  { key: textKey('help.key-talk'), does: textKey('help.do-talk') },
  { key: textKey('help.key-journal'), does: textKey('help.do-journal') },
  { key: textKey('help.key-language'), does: textKey('help.do-language') },
  { key: textKey('help.key-fullscreen'), does: textKey('help.do-fullscreen') },
  { key: textKey('help.key-help'), does: textKey('help.do-help') },
];

/** The frame: it makes the box a box on the journal's screen, which has the field's colour. */
export const HELP_FRAME: Box = { x: 48, y: 30, width: 224, height: 98 };
export const HELP_FRAME_COLOUR: PaletteColour = '#3a4466';
/** The field inside the frame: 1 px of the frame is left on every side. */
export const HELP_FIELD: Box = { x: 49, y: 31, width: 222, height: 96 };
/** Where the key of row 0 starts, and where what it does starts; row k is HELP_ROW_PITCH × k lower. */
export const HELP_KEYS: Point = { x: 56, y: 38 };
export const HELP_DOES: Point = { x: 170, y: 38 };
export const HELP_ROW_PITCH = 12;
/** The longest name of a key and the longest text of what it does, in characters. */
export const HELP_KEY_CAPACITY = 17;
export const HELP_DOES_CAPACITY = 16;

export function drawHelp(renderer: Renderer, font: SpriteSheet, language: Language): void {
  renderer.fillRect(
    HELP_FRAME.x,
    HELP_FRAME.y,
    HELP_FRAME.width,
    HELP_FRAME.height,
    HELP_FRAME_COLOUR,
  );
  renderer.fillRect(
    HELP_FIELD.x,
    HELP_FIELD.y,
    HELP_FIELD.width,
    HELP_FIELD.height,
    PAGE_BACKGROUND,
  );
  for (const [k, row] of HELP_ROWS.entries()) {
    const down = k * HELP_ROW_PITCH;
    drawText(renderer, font, row.key, language, HELP_KEYS.x, HELP_KEYS.y + down);
    drawText(renderer, font, row.does, language, HELP_DOES.x, HELP_DOES.y + down);
  }
}
