import { FRAME_HEIGHT, FRAME_WIDTH } from '../src/engine/sprite.ts';
import { FACINGS, PHASES_PER_FACING } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { frameRows, INKS, SHEET_HEIGHT, SHEET_WIDTH } from './placeholder-player.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder colleagues (feature 0015): the figure's twenty frames in the figure's order,
 * in another shirt and without the lanyard — its pixels take the shirt's colour. Pure.
 */

/** One shirt per person, in route order: reception, marketing, support, sales. */
export const PERSON_SHIRTS: readonly PaletteColour[] = ['#3e8948', '#e43b44', '#f77622', '#b55088'];

/** RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderPerson(look: number): Uint8Array {
  const shirt = PERSON_SHIRTS[look];
  if (shirt === undefined) {
    throw new Error(`person ${look} has no shirt`);
  }
  const colours = new Map<string, PaletteColour>(Object.entries({ ...INKS, T: shirt, L: shirt }));
  const data = new Uint8Array(SHEET_WIDTH * SHEET_HEIGHT * 4);
  for (const [f, facing] of FACINGS.entries()) {
    for (let phase = 0; phase < PHASES_PER_FACING; phase += 1) {
      const n = f * PHASES_PER_FACING + phase;
      for (const [y, row] of frameRows(facing, phase).entries()) {
        for (const [x, letter] of [...row].entries()) {
          const colour = colours.get(letter);
          if (colour !== undefined && x < FRAME_WIDTH && y < FRAME_HEIGHT) {
            data.set([...rgb(colour), 255], (y * SHEET_WIDTH + n * FRAME_WIDTH + x) * 4);
          }
        }
      }
    }
  }
  return data;
}
