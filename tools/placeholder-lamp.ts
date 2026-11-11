import { CONE_LENGTH, FRAME_APEX, inCone } from '../src/game/lamp.ts';
import { FACINGS, type Facing } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder lamp sheet (visual.md §5, feature 0007): the cone of light as four 48x48
 * frames in one row, one per facing in FACINGS order, each a checkerboard of one palette colour
 * cut to the cone from the frame's apex pixel (game/lamp, FRAME_APEX). Drawn from the same
 * predicate the game tests with, so the picture is the rule. Pure — it returns pixels;
 * tools/gen-sprites.ts writes the file.
 */

/** The palette's yellow: neither the grass nor the path of the placeholder tiles. */
export const LAMP_COLOUR: PaletteColour = '#fee761';
export const LAMP_FRAME_SIZE = CONE_LENGTH;
export const LAMP_SHEET_WIDTH = FACINGS.length * LAMP_FRAME_SIZE;
export const LAMP_SHEET_HEIGHT = LAMP_FRAME_SIZE;

/** Pixel (i, j) of a facing's frame is lit when it lies in the cone from the frame's apex and i + j is even. */
export function isLit(facing: Facing, i: number, j: number): boolean {
  return (i + j) % 2 === 0 && inCone({ x: i, y: j }, { apex: FRAME_APEX[facing], facing });
}

/** RGBA, row-major, LAMP_SHEET_WIDTH × LAMP_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderLamp(): Uint8Array {
  const data = new Uint8Array(LAMP_SHEET_WIDTH * LAMP_SHEET_HEIGHT * 4);
  const [r, g, b] = rgb(LAMP_COLOUR);
  for (const [n, facing] of FACINGS.entries()) {
    for (let j = 0; j < LAMP_FRAME_SIZE; j += 1) {
      for (let i = 0; i < LAMP_FRAME_SIZE; i += 1) {
        if (isLit(facing, i, j)) {
          data.set([r, g, b, 255], (j * LAMP_SHEET_WIDTH + n * LAMP_FRAME_SIZE + i) * 4);
        }
      }
    }
  }
  return data;
}
