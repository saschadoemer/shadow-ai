import type { Box, Point } from '../engine/tiled';
import { ENTRY_TEXT, entriesOf, TAB_TEXT } from '../game/journal';
import { type GameState, JOURNAL_TABS, type JournalState } from '../game/state';
import { textOf } from '../text/text';
import type { SceneContent, SceneSettings } from './draw-scene';
import { drawText } from './draw-text';
import { GLYPH_WIDTH } from './font';
import { PAGE_BACKGROUND, type PaletteColour } from './palette';
import type { Renderer } from './renderer';

/**
 * The journal's screen (gameplay.md §7, visual.md §3, feature 0020): three tabs along the top,
 * a rule under them, and the open tab's content — its entries, or one line that it has none.
 * It is drawn instead of the world, on the surface, in the language of the scene's settings.
 */

/** Tab k, from 0, is TAB_WIDTH wide and starts TAB_PITCH right of tab k − 1. */
export const TAB_LEFT = 8;
export const TAB_TOP = 6;
export const TAB_WIDTH = 100;
export const TAB_HEIGHT = 16;
export const TAB_PITCH = 102;
/** The room above a title in its tab: the title is 10 px high in 16. */
export const TAB_TITLE_INSET = 3;
export const TAB_OPEN: PaletteColour = '#3a4466';
export const TAB_CLOSED: PaletteColour = '#262b44';
/** The rule the open tab stands on, in the open tab's colour. */
export const JOURNAL_RULE: Box = { x: 8, y: 22, width: 304, height: 2 };
/** Where a tab's line for nothing starts. */
export const NOTHING_TEXT: Point = { x: 16, y: 36 };
/** Entry k, from 0, starts ENTRY_PITCH below entry k − 1: the picture, the name, the text. */
export const ENTRY_PICTURE: Point = { x: 16, y: 32 };
export const ENTRY_NAME: Point = { x: 40, y: 35 };
export const ENTRY_LINES: Point = { x: 16, y: 54 };
export const ENTRY_PITCH = 72;
/** The creature as the light shows it: the frozen frame of its sheet. */
export const ENTRY_FRAME = 2;

/** The rectangle of tab k. */
export function tabBox(k: number): Box {
  return { x: TAB_LEFT + k * TAB_PITCH, y: TAB_TOP, width: TAB_WIDTH, height: TAB_HEIGHT };
}

/** Where a title of `length` characters starts in tab k: centred, (58 + 102k − 3n, 9). */
export function tabTitleOrigin(k: number, length: number): Point {
  const box = tabBox(k);
  return {
    x: box.x + (box.width - length * GLYPH_WIDTH) / 2,
    y: box.y + TAB_TITLE_INSET,
  };
}

export function drawJournal(
  renderer: Renderer,
  state: GameState,
  journal: JournalState,
  content: SceneContent,
  settings: SceneSettings,
): void {
  const { language } = settings;
  renderer.clear(PAGE_BACKGROUND);
  for (const [k, tab] of JOURNAL_TABS.entries()) {
    const box = tabBox(k);
    renderer.fillRect(
      box.x,
      box.y,
      box.width,
      box.height,
      tab === journal.tab ? TAB_OPEN : TAB_CLOSED,
    );
    const { title } = TAB_TEXT[tab];
    const origin = tabTitleOrigin(k, textOf(title, language).length);
    drawText(renderer, content.fontSheet, title, language, origin.x, origin.y);
  }
  renderer.fillRect(
    JOURNAL_RULE.x,
    JOURNAL_RULE.y,
    JOURNAL_RULE.width,
    JOURNAL_RULE.height,
    TAB_OPEN,
  );
  // Only the creatures have entries so far; the cases and the policy come with M5.
  const entries = journal.tab === 'creatures' ? entriesOf(state.captured) : [];
  if (entries.length === 0) {
    drawText(
      renderer,
      content.fontSheet,
      TAB_TEXT[journal.tab].nothing,
      language,
      NOTHING_TEXT.x,
      NOTHING_TEXT.y,
    );
    return;
  }
  for (const [k, species] of entries.entries()) {
    const down = k * ENTRY_PITCH;
    const { name, text } = ENTRY_TEXT[species];
    renderer.drawSprite(
      content.creatureSheets[species],
      ENTRY_FRAME,
      ENTRY_PICTURE.x,
      ENTRY_PICTURE.y + down,
    );
    drawText(renderer, content.fontSheet, name, language, ENTRY_NAME.x, ENTRY_NAME.y + down);
    drawText(renderer, content.fontSheet, text, language, ENTRY_LINES.x, ENTRY_LINES.y + down);
  }
}
