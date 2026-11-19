import type { Box, Point } from '../engine/tiled';
import { outcomeOf, policyBlocks } from '../game/cases';
import { CASE_TEXT, ENTRY_TEXT, entriesOf, REGION_NAME, TAB_TEXT } from '../game/journal';
import { type GameState, JOURNAL_TABS, type JournalState } from '../game/state';
import { caseEntries, tracesOf } from '../game/trace';
import { type Language, type TextKey, textOf } from '../text/text';
import type { SceneContent, SceneSettings } from './draw-scene';
import { drawNumber, drawText, LINE_PITCH } from './draw-text';
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
/** A case k, from 0, starts CASE_PITCH below case k − 1: the region's name, then its traces (0022). */
export const CASE_NAME: Point = { x: 16, y: 36 };
export const CASE_LINE: Point = { x: 16, y: 48 };
export const CASE_PITCH = 36;
/** The third line of a solved case: its outcome (0024). */
export const CASE_OUTCOME: Point = { x: 16, y: 60 };
/** The first block of the policy starts here (0024). */
export const POLICY_BLOCK: Point = { x: 16, y: 36 };
/** A block starts this far below the last line of the block before it (0037). */
export const POLICY_GAP = 12;

/**
 * Where the blocks of the policy start (0037): they are stacked by their height. The first
 * starts at POLICY_BLOCK, and each further one POLICY_GAP below the last line of the block
 * before it — a block of n lines is followed by the next one 12n + 12 px lower. The lines of
 * a block are those of the language it is drawn in.
 */
export function policyOrigins(blocks: readonly TextKey[], language: Language): Point[] {
  const origins: Point[] = [];
  let y = POLICY_BLOCK.y;
  for (const block of blocks) {
    origins.push({ x: POLICY_BLOCK.x, y });
    y += textOf(block, language).split('\n').length * LINE_PITCH + POLICY_GAP;
  }
  return origins;
}

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
  const entries = journal.tab === 'creatures' ? entriesOf(state.captured) : [];
  // The cases are the regions with a found trace (0022).
  const cases =
    journal.tab === 'cases' ? caseEntries(state.traces, tracesOf(content.map.rects)) : [];
  // The policy is one block per solved case (0024).
  const blocks = journal.tab === 'policy' ? policyBlocks(state.solved) : [];
  if (entries.length === 0 && cases.length === 0 && blocks.length === 0) {
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
  for (const [k, entry] of cases.entries()) {
    const down = k * CASE_PITCH;
    const name = REGION_NAME[entry.region];
    if (name !== undefined) {
      drawText(renderer, content.fontSheet, name, language, CASE_NAME.x, CASE_NAME.y + down);
    }
    // `Spuren: 1 von 5`: four parts, one empty cell between two.
    let x = CASE_LINE.x;
    const y = CASE_LINE.y + down;
    const word = (key: TextKey): void => {
      drawText(renderer, content.fontSheet, key, language, x, y);
      x += (textOf(key, language).length + 1) * GLYPH_WIDTH;
    };
    const count = (value: number): void => {
      drawNumber(renderer, content.fontSheet, value, x, y);
      x += (String(value).length + 1) * GLYPH_WIDTH;
    };
    word(CASE_TEXT.traces);
    count(entry.found);
    word(CASE_TEXT.of);
    count(entry.all);
    const outcome = outcomeOf(entry.region, state.solved);
    if (outcome !== null) {
      drawText(
        renderer,
        content.fontSheet,
        outcome,
        language,
        CASE_OUTCOME.x,
        CASE_OUTCOME.y + down,
      );
    }
  }
  const origins = policyOrigins(blocks, language);
  for (const [k, block] of blocks.entries()) {
    const origin = origins[k] ?? POLICY_BLOCK;
    drawText(renderer, content.fontSheet, block, language, origin.x, origin.y);
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
