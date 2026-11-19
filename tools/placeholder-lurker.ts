import { type PaletteColour, SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder lurker sheet (visual.md §5, feature 0038): an eye, four 16x16 frames in one
 * row. Frame 0 and frame 1, the pupil one pixel to the right, alternate while the creature is
 * free; frame 2, the inside white, is the creature frozen in the light; frame 3 is the lurker
 * in its window on a screen, where no light holds it. The lids, the pupil and the window's
 * frame are the signature colour — a shadow asset. Pure — it returns pixels;
 * tools/gen-sprites.ts writes the file.
 */

export const LURKER_FRAME_SIZE = 16;
export const LURKER_FRAMES = 4;
export const LURKER_SHEET_WIDTH = LURKER_FRAMES * LURKER_FRAME_SIZE;
export const LURKER_SHEET_HEIGHT = LURKER_FRAME_SIZE;
export const LURKER_GROUND: PaletteColour = '#c0cbdc';
export const LURKER_LIT: PaletteColour = '#ffffff';
/** The frame of the lurker in its window. */
export const LURKER_PANE_FRAME = 3;

/** The pupil: columns `from` and `from` + 1, rows 7–9. */
function pupil(i: number, j: number, from: number): boolean {
  return i >= from && i <= from + 1 && j >= 7 && j <= 9;
}

/**
 * Pixel (i, j) of the eye, its pupil starting at column `from`: rows 6 and 10 in columns 5–10
 * and columns 4 and 11 in rows 7–9 are `edge`, and so is the pupil; the rest of the inside,
 * columns 5–10 and rows 7–9, is `ground`.
 */
export function eyeInk(i: number, j: number, from: number): 'edge' | 'ground' | null {
  const lids = (j === 6 || j === 10) && i >= 5 && i <= 10;
  const corners = (i === 4 || i === 11) && j >= 7 && j <= 9;
  if (lids || corners) {
    return 'edge';
  }
  if (i < 5 || i > 10 || j < 7 || j > 9) {
    return null;
  }
  return pupil(i, j, from) ? 'edge' : 'ground';
}

/**
 * Pixel (i, j) of the window: the rectangle columns 2–13, rows 3–12. Its border and row 4, the
 * title bar, are `edge`, and so is the pupil in columns 7–8; the rest of the inside is `ground`.
 */
export function paneInk(i: number, j: number): 'edge' | 'ground' | null {
  if (i < 2 || i > 13 || j < 3 || j > 12) {
    return null;
  }
  if (i === 2 || i === 13 || j === 3 || j === 12 || j === 4) {
    return 'edge';
  }
  return pupil(i, j, 7) ? 'edge' : 'ground';
}

/** RGBA, row-major, LURKER_SHEET_WIDTH × LURKER_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderLurker(): Uint8Array {
  const data = new Uint8Array(LURKER_SHEET_WIDTH * LURKER_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < LURKER_FRAMES; frame += 1) {
    for (let j = 0; j < LURKER_FRAME_SIZE; j += 1) {
      for (let i = 0; i < LURKER_FRAME_SIZE; i += 1) {
        // Frame 1 looks to the side: the pupil one pixel to the right.
        const ink = frame === LURKER_PANE_FRAME ? paneInk(i, j) : eyeInk(i, j, frame === 1 ? 8 : 7);
        if (ink === null) {
          continue;
        }
        const ground = frame === 2 ? LURKER_LIT : LURKER_GROUND;
        const colour = ink === 'edge' ? SHADOW_COLOUR : ground;
        data.set(
          [...rgb(colour), 255],
          (j * LURKER_SHEET_WIDTH + frame * LURKER_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
