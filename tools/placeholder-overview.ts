import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder overview sheet (feature 0009): a small light, two 8x8 frames in one row.
 * Frame 0 is the light that is on, frame 1 the light that is out. A disc of 32 pixels with a
 * dark rim, so that it reads on grass, path and roof alike. Pure — it returns pixels;
 * tools/gen-sprites.ts writes the file.
 */

export const OVERVIEW_FRAME_SIZE = 8;
export const OVERVIEW_FRAMES = 2;
export const OVERVIEW_SHEET_WIDTH = OVERVIEW_FRAMES * OVERVIEW_FRAME_SIZE;
export const OVERVIEW_SHEET_HEIGHT = OVERVIEW_FRAME_SIZE;
export const OVERVIEW_RIM: PaletteColour = '#181425';
export const OVERVIEW_ON: PaletteColour = '#fee761';
export const OVERVIEW_OUT: PaletteColour = '#3a4466';

/**
 * Pixel (i, j) of a frame: the disc is rows 1 and 6 in columns 2–5 and rows 2–5 in columns
 * 1–6; its rim is rows 1 and 6 and columns 1 and 6, the 4x4 inside is the glow.
 */
export function overviewInk(i: number, j: number): 'rim' | 'glow' | null {
  const inDisc = j === 1 || j === 6 ? i >= 2 && i <= 5 : j >= 2 && j <= 5 && i >= 1 && i <= 6;
  if (!inDisc) {
    return null;
  }
  return i === 1 || i === 6 || j === 1 || j === 6 ? 'rim' : 'glow';
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
        const glow = frame === 0 ? OVERVIEW_ON : OVERVIEW_OUT;
        data.set(
          [...rgb(ink === 'rim' ? OVERVIEW_RIM : glow), 255],
          (j * OVERVIEW_SHEET_WIDTH + frame * OVERVIEW_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
