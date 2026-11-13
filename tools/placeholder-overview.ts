import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder overview sheet (features 0009, 0012): a small heart, two 8x8 frames in one
 * row. Frame 0 is the full heart, frame 1 the empty one. 7 wide and 7 high with a dark rim,
 * so that it reads on carpet, corridor and wall alike. Pure — it returns pixels;
 * tools/gen-sprites.ts writes the file.
 */

export const OVERVIEW_FRAME_SIZE = 8;
export const OVERVIEW_FRAMES = 2;
export const OVERVIEW_SHEET_WIDTH = OVERVIEW_FRAMES * OVERVIEW_FRAME_SIZE;
export const OVERVIEW_SHEET_HEIGHT = OVERVIEW_FRAME_SIZE;
export const OVERVIEW_RIM: PaletteColour = '#181425';
export const OVERVIEW_FULL: PaletteColour = '#e43b44';
export const OVERVIEW_EMPTY: PaletteColour = '#3a4466';

/** The heart, row by row: `#` is the rim, `o` the fill, `.` transparent. */
const HEART = [
  '.##.##..',
  '#oo#oo#.',
  '#ooooo#.',
  '#ooooo#.',
  '.#ooo#..',
  '..#o#...',
  '...#....',
  '........',
] as const;

/** Pixel (i, j) of a frame: 16 pixels of rim, 18 of fill, the rest transparent. */
export function overviewInk(i: number, j: number): 'rim' | 'fill' | null {
  const cell = HEART[j]?.[i];
  if (cell === '#') {
    return 'rim';
  }
  return cell === 'o' ? 'fill' : null;
}

/** RGBA, row-major, OVERVIEW_SHEET_WIDTH × OVERVIEW_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderOverview(): Uint8Array {
  const data = new Uint8Array(OVERVIEW_SHEET_WIDTH * OVERVIEW_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < OVERVIEW_FRAMES; frame += 1) {
    for (let j = 0; j < OVERVIEW_FRAME_SIZE; j += 1) {
      for (let i = 0; i < OVERVIEW_FRAME_SIZE; i += 1) {
        const ink = overviewInk(i, j);
        if (ink === null) {
          continue;
        }
        const fill = frame === 0 ? OVERVIEW_FULL : OVERVIEW_EMPTY;
        data.set(
          [...rgb(ink === 'rim' ? OVERVIEW_RIM : fill), 255],
          (j * OVERVIEW_SHEET_WIDTH + frame * OVERVIEW_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
