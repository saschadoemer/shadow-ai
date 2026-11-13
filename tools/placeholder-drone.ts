import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder drone (feature 0015): a body of 6x4 px with a light, four arms and four
 * rotors — bars of 5 px in frame 0, dots in frame 1, so the rotors turn. Pure.
 */

export const DRONE_FRAME_SIZE = 16;
export const DRONE_FRAMES = 2;
export const DRONE_SHEET_WIDTH = DRONE_FRAMES * DRONE_FRAME_SIZE;
export const DRONE_SHEET_HEIGHT = DRONE_FRAME_SIZE;
export const DRONE_BODY: PaletteColour = '#5a6988';
export const DRONE_ROTOR: PaletteColour = '#c0cbdc';
export const DRONE_LIGHT: PaletteColour = '#e43b44';

/** Rows 4–11 of each frame; `R` rotor, `B` body and arms, `L` light. */
const FRAMES: readonly (readonly string[])[] = [
  [
    '.RRRRR....RRRRR.',
    '....B......B....',
    '.....BBBBBB.....',
    '.....BBLLBB.....',
    '.....BBBBBB.....',
    '.....BBBBBB.....',
    '....B......B....',
    '.RRRRR....RRRRR.',
  ],
  [
    '...R........R...',
    '....B......B....',
    '.....BBBBBB.....',
    '.....BBLLBB.....',
    '.....BBBBBB.....',
    '.....BBBBBB.....',
    '....B......B....',
    '...R........R...',
  ],
];
const INK = { R: 'rotor', B: 'body', L: 'light' } as const;

/** Pixel (i, j) of frame `frame`. */
export function droneInk(frame: number, i: number, j: number): 'rotor' | 'body' | 'light' | null {
  const letter = FRAMES[frame]?.[j - 4]?.[i];
  return letter === 'R' || letter === 'B' || letter === 'L' ? INK[letter] : null;
}

/** RGBA, row-major, DRONE_SHEET_WIDTH × DRONE_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderDrone(): Uint8Array {
  const data = new Uint8Array(DRONE_SHEET_WIDTH * DRONE_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < DRONE_FRAMES; frame += 1) {
    for (let j = 0; j < DRONE_FRAME_SIZE; j += 1) {
      for (let i = 0; i < DRONE_FRAME_SIZE; i += 1) {
        const ink = droneInk(frame, i, j);
        if (ink === null) {
          continue;
        }
        const colour = ink === 'rotor' ? DRONE_ROTOR : ink === 'body' ? DRONE_BODY : DRONE_LIGHT;
        data.set([...rgb(colour), 255], (j * DRONE_SHEET_WIDTH + frame * DRONE_FRAME_SIZE + i) * 4);
      }
    }
  }
  return data;
}
