import { type PaletteColour, SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder shadow-wall sheet (visual.md §4, feature 0014): sixteen 16x16 frames in one
 * row, frame = orientation × 8 + look. Orientation 0 is a horizontal wall, a strip on the
 * frame's rows 0–3; orientation 1 a vertical wall, the same strip on its columns 0–3. Looks 0
 * and 1 are a wall of density 1 in its two phases, 2 and 3 density 2, 4 and 5 density 3; looks
 * 6 and 7 are a wall that gives way. A denser wall has more pixels. The second shadow asset:
 * the signature colour, and one dark colour for the densest wall's pattern. Pure — it returns
 * pixels; tools/gen-sprites.ts writes the file.
 */

export const WALL_FRAME_SIZE = 16;
/** The strip is as thick as a wall. */
export const WALL_STRIP = 4;
export const WALL_LOOKS = 8;
export const WALL_ORIENTATIONS = 2;
export const WALL_SHEET_WIDTH = WALL_ORIENTATIONS * WALL_LOOKS * WALL_FRAME_SIZE;
export const WALL_SHEET_HEIGHT = WALL_FRAME_SIZE;
export const WALL_DARK: PaletteColour = '#181425';

/** Pixel (i, j) of a strip of `look`: i counts along it, 0–15, j across it, 0–3. */
export function wallInk(look: number, i: number, j: number): PaletteColour | null {
  switch (look) {
    case 0:
      return (i + j) % 2 === 0 ? SHADOW_COLOUR : null;
    case 1:
      return (i + j) % 2 === 1 ? SHADOW_COLOUR : null;
    case 2:
      return i % 2 === 0 && j % 2 === 0 ? null : SHADOW_COLOUR;
    case 3:
      return i % 2 === 1 && j % 2 === 1 ? null : SHADOW_COLOUR;
    case 4:
      return SHADOW_COLOUR;
    case 5:
      return (i + j) % 4 === 0 ? WALL_DARK : SHADOW_COLOUR;
    case 6:
      return (i + j) % 2 === 0 && i % 4 <= 1 ? SHADOW_COLOUR : null;
    case 7:
      return (i + j) % 8 === 0 ? SHADOW_COLOUR : null;
    default:
      throw new Error(`a shadow wall has looks 0 to ${WALL_LOOKS - 1}, not ${look}`);
  }
}

/** RGBA, row-major, WALL_SHEET_WIDTH × WALL_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderShadowWall(): Uint8Array {
  const data = new Uint8Array(WALL_SHEET_WIDTH * WALL_SHEET_HEIGHT * 4);
  for (let orientation = 0; orientation < WALL_ORIENTATIONS; orientation += 1) {
    for (let look = 0; look < WALL_LOOKS; look += 1) {
      const left = (orientation * WALL_LOOKS + look) * WALL_FRAME_SIZE;
      for (let i = 0; i < WALL_FRAME_SIZE; i += 1) {
        for (let j = 0; j < WALL_STRIP; j += 1) {
          const colour = wallInk(look, i, j);
          if (colour === null) {
            continue;
          }
          const x = orientation === 0 ? i : j;
          const y = orientation === 0 ? j : i;
          data.set([...rgb(colour), 255], (y * WALL_SHEET_WIDTH + left + x) * 4);
        }
      }
    }
  }
  return data;
}
