import { SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder veil sheet (visual.md §4, feature 0023): the shadow over a region, three
 * 16x16 frames in one row, one per density. A frame is a pattern in the signature colour that
 * repeats every 4 px, so the frames join without a seam from cell to cell: 32, 64 and 128
 * pixels. The fourth shadow asset. Pure — it returns pixels; tools/gen-sprites.ts writes the
 * file.
 */

export const VEIL_FRAME_SIZE = 16;
export const VEIL_FRAMES = 3;
export const VEIL_SHEET_WIDTH = VEIL_FRAMES * VEIL_FRAME_SIZE;
export const VEIL_SHEET_HEIGHT = VEIL_FRAME_SIZE;

/** Whether pixel (i, j) of frame `frame` is veil: frame d − 1 is the veil of density d. */
export function veilInk(frame: number, i: number, j: number): boolean {
  switch (frame) {
    case 0:
      // Both multiples of 4, or both 2 more than one: one pixel in eight.
      return (i % 4 === 0 && j % 4 === 0) || (i % 4 === 2 && j % 4 === 2);
    case 1:
      // Diagonal lines: one pixel in four.
      return (i + j) % 4 === 0;
    case 2:
      // A checkerboard: every second pixel.
      return (i + j) % 2 === 0;
    default:
      return false;
  }
}

/** RGBA, row-major, VEIL_SHEET_WIDTH × VEIL_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderVeil(): Uint8Array {
  const data = new Uint8Array(VEIL_SHEET_WIDTH * VEIL_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < VEIL_FRAMES; frame += 1) {
    for (let j = 0; j < VEIL_FRAME_SIZE; j += 1) {
      for (let i = 0; i < VEIL_FRAME_SIZE; i += 1) {
        if (veilInk(frame, i, j)) {
          data.set(
            [...rgb(SHADOW_COLOUR), 255],
            (j * VEIL_SHEET_WIDTH + frame * VEIL_FRAME_SIZE + i) * 4,
          );
        }
      }
    }
  }
  return data;
}
