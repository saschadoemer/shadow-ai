import { FACINGS, type Facing } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder office dog (feature 0015): 24 frames of 16x16 in one row — per coat twelve,
 * frame = look × 12 + facing × 3 + phase, facings in FACINGS order; phase 0 stands, 1 steps,
 * 2 sits. `C` is the coat, `D` ears, nose, eyes and tail tip. Pure.
 */

export const DOG_FRAME_SIZE = 16;
export const DOG_PHASES = 3;
export const DOG_COATS: readonly PaletteColour[] = ['#b86f50', '#ead4aa'];
export const DOG_DARK: PaletteColour = '#3e2731';
export const DOG_FRAMES = DOG_COATS.length * FACINGS.length * DOG_PHASES;
export const DOG_SHEET_WIDTH = DOG_FRAMES * DOG_FRAME_SIZE;
export const DOG_SHEET_HEIGHT = DOG_FRAME_SIZE;

type Rows = readonly string[];
const BLANK = '................';
const blanks = (count: number): Rows => Array.from({ length: count }, () => BLANK);

const RIGHT_HEAD: Rows = [
  '...........D.D..',
  '...........CCCC.',
  'D..........CDCD.',
  '.C.........CCCC.',
];
const RIGHT_BODY: Rows = ['.CCCCCCCCCCCC...', '.CCCCCCCCCCCC...', '.CCCCCCCCCCCC...'];
const RIGHT_STAND: Rows = [
  ...blanks(6),
  ...RIGHT_HEAD,
  ...RIGHT_BODY,
  '.CC......CC.....',
  '.CC......CC.....',
  '.CC......CC.....',
];
const RIGHT_STEP: Rows = [
  ...blanks(6),
  ...RIGHT_HEAD,
  ...RIGHT_BODY,
  '.CC......CC.....',
  'CC........CC....',
  'C..........C....',
];
const RIGHT_SIT: Rows = [
  ...blanks(5),
  '...........D.D..',
  '...........CCCC.',
  '...........CDCD.',
  '...........CCCC.',
  '..........CCCC..',
  '.........CCCCC..',
  '........CCCCCC..',
  '.......CCCCCCC..',
  '......CCCCCCCC..',
  '.....CCCCCC.CC..',
  '.D..CCCCCCC.CC..',
];

const DOWN_HEAD: Rows = [
  '.....D....D.....',
  '.....CCCCCC.....',
  '.....CDCCDC.....',
  '.....CCDDCC.....',
  '.....CCCCCC.....',
];
const UP_HEAD: Rows = [
  '.....D....D.....',
  '.....CCCCCC.....',
  '.....CCCCCC.....',
  '.....CCCCCC.....',
  '.....CCCCCC.....',
];
const FRONT_BODY: Rows = [
  '....CCCCCCCC....',
  '....CCCCCCCC....',
  '....CCCCCCCC....',
  '....CCCCCCCC....',
];
const BACK_BODY: Rows = [
  '....CCCCCCCC....',
  '....CCCDDCCC....',
  '....CCCCCCCC....',
  '....CCCCCCCC....',
];
const FRONT_LEGS: Rows = ['....CC....CC....', '....CC....CC....'];
const FRONT_LEGS_STEP: Rows = ['....CC....CC....', '....CC..........'];
const SIT_BODY: Rows = [
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '....CC....CC....',
];

function mirror(rows: Rows): Rows {
  return rows.map((row) => [...row].reverse().join(''));
}

/** Per facing: stand, step, sit. */
const POSES: Readonly<Record<Facing, readonly Rows[]>> = {
  down: [
    [...blanks(5), ...DOWN_HEAD, ...FRONT_BODY, ...FRONT_LEGS],
    [...blanks(5), ...DOWN_HEAD, ...FRONT_BODY, ...FRONT_LEGS_STEP],
    [...blanks(5), ...DOWN_HEAD, ...SIT_BODY],
  ],
  up: [
    [...blanks(5), ...UP_HEAD, ...BACK_BODY, ...FRONT_LEGS],
    [...blanks(5), ...UP_HEAD, ...BACK_BODY, ...FRONT_LEGS_STEP],
    [...blanks(5), ...UP_HEAD, ...SIT_BODY],
  ],
  left: [mirror(RIGHT_STAND), mirror(RIGHT_STEP), mirror(RIGHT_SIT)],
  right: [RIGHT_STAND, RIGHT_STEP, RIGHT_SIT],
};

/** RGBA, row-major, DOG_SHEET_WIDTH × DOG_SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderDog(): Uint8Array {
  const data = new Uint8Array(DOG_SHEET_WIDTH * DOG_SHEET_HEIGHT * 4);
  for (const [look, coat] of DOG_COATS.entries()) {
    for (const [f, facing] of FACINGS.entries()) {
      for (const [phase, rows] of POSES[facing].entries()) {
        const frame = look * FACINGS.length * DOG_PHASES + f * DOG_PHASES + phase;
        if (rows.length !== DOG_FRAME_SIZE || rows.some((row) => row.length !== DOG_FRAME_SIZE)) {
          throw new Error(`dog ${facing} phase ${phase} is not 16x16`);
        }
        for (const [y, row] of rows.entries()) {
          for (const [x, letter] of [...row].entries()) {
            if (letter === '.') {
              continue;
            }
            const colour = letter === 'C' ? coat : DOG_DARK;
            data.set([...rgb(colour), 255], (y * DOG_SHEET_WIDTH + frame * DOG_FRAME_SIZE + x) * 4);
          }
        }
      }
    }
  }
  return data;
}
