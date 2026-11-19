import { type PaletteColour, SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder mirage sheet (visual.md §5, feature 0032): a small framed portrait of
 * nobody, three 16x16 frames in one row. Frame 0 and frame 1, one pixel to the right, alternate
 * while nobody looks at the creature; frame 2, the ground white, is the creature frozen in the
 * light. Frame, head and shoulders are the signature colour — a shadow asset. Pure — it returns
 * pixels; tools/gen-sprites.ts writes the file.
 */

export const MIRAGE_FRAME_SIZE = 16;
export const MIRAGE_FRAMES = 3;
export const MIRAGE_SHEET_WIDTH = MIRAGE_FRAMES * MIRAGE_FRAME_SIZE;
export const MIRAGE_SHEET_HEIGHT = MIRAGE_FRAME_SIZE;
export const MIRAGE_GROUND: PaletteColour = '#c0cbdc';
export const MIRAGE_LIT: PaletteColour = '#ffffff';

/**
 * Pixel (i, j) of frame 0: the rectangle columns 3–12, rows 2–13. Its border is `edge`; so are
 * the head, columns 7–8 and rows 5–6, and the shoulders, columns 6–9 in row 8 and columns 5–10
 * in rows 9–12. The rest of the inside is `ground`.
 */
export function mirageInk(i: number, j: number): 'edge' | 'ground' | null {
  if (i < 3 || i > 12 || j < 2 || j > 13) {
    return null;
  }
  if (i === 3 || i === 12 || j === 2 || j === 13) {
    return 'edge';
  }
  const head = i >= 7 && i <= 8 && j >= 5 && j <= 6;
  const neck = j === 8 && i >= 6 && i <= 9;
  const shoulders = j >= 9 && j <= 12 && i >= 5 && i <= 10;
  return head || neck || shoulders ? 'edge' : 'ground';
}

/** RGBA, row-major, MIRAGE_SHEET_WIDTH × MIRAGE_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderMirage(): Uint8Array {
  const data = new Uint8Array(MIRAGE_SHEET_WIDTH * MIRAGE_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < MIRAGE_FRAMES; frame += 1) {
    for (let j = 0; j < MIRAGE_FRAME_SIZE; j += 1) {
      for (let i = 0; i < MIRAGE_FRAME_SIZE; i += 1) {
        // Frame 1 is frame 0 moved one pixel to the right.
        const ink = mirageInk(frame === 1 ? i - 1 : i, j);
        if (ink === null) {
          continue;
        }
        const ground = frame === 2 ? MIRAGE_LIT : MIRAGE_GROUND;
        const colour = ink === 'edge' ? SHADOW_COLOUR : ground;
        data.set(
          [...rgb(colour), 255],
          (j * MIRAGE_SHEET_WIDTH + frame * MIRAGE_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
