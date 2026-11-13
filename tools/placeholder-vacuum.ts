import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder robot vacuum (feature 0015): a plain disc, 12 px wide, in the lower 12 px of
 * a 16x16 frame, with a light of 2x2 px that is on in frame 0 and off in frame 1. Pure.
 */

export const VACUUM_FRAME_SIZE = 16;
export const VACUUM_FRAMES = 2;
export const VACUUM_SHEET_WIDTH = VACUUM_FRAMES * VACUUM_FRAME_SIZE;
export const VACUUM_SHEET_HEIGHT = VACUUM_FRAME_SIZE;
export const VACUUM_BODY: PaletteColour = '#3a4466';
export const VACUUM_RIM: PaletteColour = '#262b44';
export const VACUUM_LIGHTS: readonly [PaletteColour, PaletteColour] = ['#63c74d', '#265c42'];

/** Rows 4–15; `R` rim, `B` body, `L` light. */
const DISC: readonly string[] = [
  '.....RRRRRR.....',
  '...RRBBBBBBRR...',
  '..RBBBBBBBBBBR..',
  '..RBBBBBBBBBBR..',
  '..RBBBBLLBBBBR..',
  '..RBBBBLLBBBBR..',
  '..RBBBBBBBBBBR..',
  '..RBBBBBBBBBBR..',
  '..RBBBBBBBBBBR..',
  '..RBBBBBBBBBBR..',
  '...RRBBBBBBRR...',
  '.....RRRRRR.....',
];
const INK = { R: 'rim', B: 'body', L: 'light' } as const;

/** Pixel (i, j) of a frame. */
export function vacuumInk(i: number, j: number): 'rim' | 'body' | 'light' | null {
  const letter = DISC[j - 4]?.[i];
  return letter === 'R' || letter === 'B' || letter === 'L' ? INK[letter] : null;
}

/** RGBA, row-major, VACUUM_SHEET_WIDTH × VACUUM_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderVacuum(): Uint8Array {
  const data = new Uint8Array(VACUUM_SHEET_WIDTH * VACUUM_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < VACUUM_FRAMES; frame += 1) {
    const light = VACUUM_LIGHTS[frame] ?? VACUUM_LIGHTS[0];
    for (let j = 0; j < VACUUM_FRAME_SIZE; j += 1) {
      for (let i = 0; i < VACUUM_FRAME_SIZE; i += 1) {
        const ink = vacuumInk(i, j);
        if (ink === null) {
          continue;
        }
        const colour = ink === 'rim' ? VACUUM_RIM : ink === 'body' ? VACUUM_BODY : light;
        data.set(
          [...rgb(colour), 255],
          (j * VACUUM_SHEET_WIDTH + frame * VACUUM_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
