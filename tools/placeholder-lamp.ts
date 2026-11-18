import {
  CONE_LENGTH,
  FRAME_APEX,
  inCone,
  WIDE_FRAME_APEX,
  WIDE_FRAME_SIZE,
  WIDE_SPREAD,
} from '../src/game/lamp.ts';
import { FACINGS, type Facing } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder lamp sheet (visual.md §5, feature 0007): the cone of light as four 48x48
 * frames in one row, one per facing in FACINGS order, each a checkerboard of one palette colour
 * cut to the cone from the frame's apex pixel (game/lamp, FRAME_APEX). Drawn from the same
 * predicate the game tests with, so the picture is the rule. The wider cone of 0029 has a sheet
 * of its own, four 72x72 frames, drawn the same way with the wider spread. Pure — it returns
 * pixels; tools/gen-sprites.ts writes the files.
 */

/** The palette's yellow: neither the grass nor the path of the placeholder tiles. */
export const LAMP_COLOUR: PaletteColour = '#fee761';
export const LAMP_FRAME_SIZE = CONE_LENGTH;
export const LAMP_SHEET_WIDTH = FACINGS.length * LAMP_FRAME_SIZE;
export const LAMP_SHEET_HEIGHT = LAMP_FRAME_SIZE;
export const WIDE_LAMP_FRAME_SIZE = WIDE_FRAME_SIZE;
export const WIDE_LAMP_SHEET_WIDTH = FACINGS.length * WIDE_LAMP_FRAME_SIZE;
export const WIDE_LAMP_SHEET_HEIGHT = WIDE_LAMP_FRAME_SIZE;

/** Pixel (i, j) of a facing's frame is lit when it lies in the cone from the frame's apex and i + j is even. */
export function isLit(facing: Facing, i: number, j: number): boolean {
  return (i + j) % 2 === 0 && inCone({ x: i, y: j }, { apex: FRAME_APEX[facing], facing });
}

/** The same for a frame of the wider cone's sheet: the cone of WIDE_SPREAD from its apex (0029). */
export function isLitWide(facing: Facing, i: number, j: number): boolean {
  return (
    (i + j) % 2 === 0 &&
    inCone({ x: i, y: j }, { apex: WIDE_FRAME_APEX[facing], facing }, WIDE_SPREAD)
  );
}

/** Four square frames of `size` in one row, one per facing: RGBA, row-major, alpha 0 or 255. */
function renderSheet(
  size: number,
  lit: (facing: Facing, i: number, j: number) => boolean,
): Uint8Array {
  const width = FACINGS.length * size;
  const data = new Uint8Array(width * size * 4);
  const [r, g, b] = rgb(LAMP_COLOUR);
  for (const [n, facing] of FACINGS.entries()) {
    for (let j = 0; j < size; j += 1) {
      for (let i = 0; i < size; i += 1) {
        if (lit(facing, i, j)) {
          data.set([r, g, b, 255], (j * width + n * size + i) * 4);
        }
      }
    }
  }
  return data;
}

/** RGBA, row-major, LAMP_SHEET_WIDTH × LAMP_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderLamp(): Uint8Array {
  return renderSheet(LAMP_FRAME_SIZE, isLit);
}

/** RGBA, row-major, WIDE_LAMP_SHEET_WIDTH × WIDE_LAMP_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderWideLamp(): Uint8Array {
  return renderSheet(WIDE_LAMP_FRAME_SIZE, isLitWide);
}
