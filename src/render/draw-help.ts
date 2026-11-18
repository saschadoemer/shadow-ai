import type { Box, Point } from '../engine/tiled';
import { type Language, type TextKey, textKey, textOf } from '../text/text';
import { drawText } from './draw-text';
import { GLYPH_HEIGHT, GLYPH_WIDTH } from './font';
import { PAGE_BACKGROUND, type PaletteColour } from './palette';
import { type Renderer, type SpriteSheet, SURFACE_WIDTH } from './renderer';

/**
 * The help (gameplay.md §8, visual.md §3, feature 0021): a framed box over whatever is on
 * screen, with one row per thing the player can do — the key, and what it does. It is drawn on
 * the surface, not shifted by the camera, in the language of the scene's settings. The rows
 * are what the box shows and no rule of the game reads them, so they live here. So does the
 * label (feature 0031): the words in the top right corner that name the help's key for as long
 * as the world is on screen.
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

/** The label (0031): the key of the help and the word for it, as the rows name a key first. */
export const HELP_LABEL: TextKey = textKey('help.label');
/** The longest label, in characters; a test holds both languages to it. */
export const HELP_LABEL_CAPACITY = 8;
/** The frame is this far from the surface's right edge and from its top, as the hearts are from their corner. */
const LABEL_MARGIN = 4;
/** The frame's width on every side of the field. */
const LABEL_FRAME = 1;
/** The field left and right of the letters; a glyph's cell ends with an empty column. */
const LABEL_PADDING_X = 2;
/** The field above and below a glyph's cell. */
const LABEL_PADDING_Y = 1;

/** Where a label of `length` characters is drawn: its frame, the field inside it, and its words. */
export interface HelpLabelPlace {
  readonly frame: Box;
  readonly field: Box;
  readonly text: Point;
}

/**
 * The place of a label of `length` characters: the frame (311 − 6n, 4, 6n + 5, 14), the field
 * (312 − 6n, 5, 6n + 3, 12) and the words from (314 − 6n, 6). The right edge stays where it is
 * in every language; the left edge moves with the words.
 */
export function helpLabelPlace(length: number): HelpLabelPlace {
  // The last cell's empty column is not part of the letters.
  const letters = length * GLYPH_WIDTH - 1;
  const field: Box = {
    x: SURFACE_WIDTH - LABEL_MARGIN - LABEL_FRAME - letters - 2 * LABEL_PADDING_X,
    y: LABEL_MARGIN + LABEL_FRAME,
    width: letters + 2 * LABEL_PADDING_X,
    height: GLYPH_HEIGHT + 2 * LABEL_PADDING_Y,
  };
  return {
    frame: {
      x: field.x - LABEL_FRAME,
      y: field.y - LABEL_FRAME,
      width: field.width + 2 * LABEL_FRAME,
      height: field.height + 2 * LABEL_FRAME,
    },
    field,
    text: { x: field.x + LABEL_PADDING_X, y: field.y + LABEL_PADDING_Y },
  };
}

/** The label in `language`: the frame, the field in it, and the words — in the help's colours. */
export function drawHelpLabel(renderer: Renderer, font: SpriteSheet, language: Language): void {
  const { frame, field, text } = helpLabelPlace(textOf(HELP_LABEL, language).length);
  renderer.fillRect(frame.x, frame.y, frame.width, frame.height, HELP_FRAME_COLOUR);
  renderer.fillRect(field.x, field.y, field.width, field.height, PAGE_BACKGROUND);
  drawText(renderer, font, HELP_LABEL, language, text.x, text.y);
}
