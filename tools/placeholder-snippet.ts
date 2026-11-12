import { type PaletteColour, SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder snippet sheet (visual.md §5, feature 0008): a scrap of paper with three lines
 * of text, three 16x16 frames in one row. Frame 0 and frame 1, two pixels higher, alternate
 * while the creature is free; frame 2, the paper white, is the creature frozen in the light.
 * Border and text are the signature colour — this is the first shadow asset. Pure — it returns
 * pixels; tools/gen-sprites.ts writes the file.
 */

export const SNIPPET_FRAME_SIZE = 16;
export const SNIPPET_FRAMES = 3;
export const SNIPPET_SHEET_WIDTH = SNIPPET_FRAMES * SNIPPET_FRAME_SIZE;
export const SNIPPET_SHEET_HEIGHT = SNIPPET_FRAME_SIZE;
export const SNIPPET_PAPER: PaletteColour = '#c0cbdc';
export const SNIPPET_LIT: PaletteColour = '#ffffff';

/** The lines of text: row → first and last column. */
const LINES: Readonly<Record<number, readonly [number, number]>> = {
  7: [5, 10],
  9: [5, 10],
  11: [5, 8],
};

/** Pixel (i, j) of frame 0: the square columns 3–12, rows 4–13; its border and the lines are `edge`. */
export function snippetInk(i: number, j: number): 'edge' | 'paper' | null {
  if (i < 3 || i > 12 || j < 4 || j > 13) {
    return null;
  }
  if (i === 3 || i === 12 || j === 4 || j === 13) {
    return 'edge';
  }
  const line = LINES[j];
  return line !== undefined && i >= line[0] && i <= line[1] ? 'edge' : 'paper';
}

/** RGBA, row-major, SNIPPET_SHEET_WIDTH × SNIPPET_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderSnippet(): Uint8Array {
  const data = new Uint8Array(SNIPPET_SHEET_WIDTH * SNIPPET_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < SNIPPET_FRAMES; frame += 1) {
    for (let j = 0; j < SNIPPET_FRAME_SIZE; j += 1) {
      for (let i = 0; i < SNIPPET_FRAME_SIZE; i += 1) {
        // Frame 1 is frame 0 moved up by two pixels.
        const ink = snippetInk(i, frame === 1 ? j + 2 : j);
        if (ink === null) {
          continue;
        }
        const paper = frame === 2 ? SNIPPET_LIT : SNIPPET_PAPER;
        const colour = ink === 'edge' ? SHADOW_COLOUR : paper;
        data.set(
          [...rgb(colour), 255],
          (j * SNIPPET_SHEET_WIDTH + frame * SNIPPET_FRAME_SIZE + i) * 4,
        );
      }
    }
  }
  return data;
}
