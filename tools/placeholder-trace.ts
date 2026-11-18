import { SHADOW_COLOUR } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder trace sheet (visual.md §4, feature 0022): shadow residue on a device, three
 * 16x16 frames in one row — the trace as it grows in the lamp's light. Frame k holds a
 * checkerboard in the signature colour inside a centred square of 6, 10 and 14 px; everything
 * else is transparent. The third shadow asset. Pure — it returns pixels; tools/gen-sprites.ts
 * writes the file.
 */

export const TRACE_FRAME_SIZE = 16;
export const TRACE_FRAMES = 3;
export const TRACE_SHEET_WIDTH = TRACE_FRAMES * TRACE_FRAME_SIZE;
export const TRACE_SHEET_HEIGHT = TRACE_FRAME_SIZE;
/** The side of the square of each frame: 18, 50 and 98 pixels of the checkerboard. */
export const TRACE_SQUARES = [6, 10, 14] as const;

/** Whether pixel (i, j) of frame `frame` is residue. */
export function traceInk(frame: number, i: number, j: number): boolean {
  const side = TRACE_SQUARES[frame] ?? 0;
  const first = (TRACE_FRAME_SIZE - side) / 2;
  const inside = i >= first && i < first + side && j >= first && j < first + side;
  return inside && (i + j) % 2 === 0;
}

/** RGBA, row-major, TRACE_SHEET_WIDTH × TRACE_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderTrace(): Uint8Array {
  const data = new Uint8Array(TRACE_SHEET_WIDTH * TRACE_SHEET_HEIGHT * 4);
  for (let frame = 0; frame < TRACE_FRAMES; frame += 1) {
    for (let j = 0; j < TRACE_FRAME_SIZE; j += 1) {
      for (let i = 0; i < TRACE_FRAME_SIZE; i += 1) {
        if (traceInk(frame, i, j)) {
          data.set(
            [...rgb(SHADOW_COLOUR), 255],
            (j * TRACE_SHEET_WIDTH + frame * TRACE_FRAME_SIZE + i) * 4,
          );
        }
      }
    }
  }
  return data;
}
