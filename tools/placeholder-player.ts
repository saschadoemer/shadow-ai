import { FRAME_HEIGHT, FRAME_WIDTH } from '../src/engine/sprite.ts';
import { FACINGS, type Facing, PHASES_PER_FACING } from '../src/game/state.ts';
import type { PaletteColour } from '../src/render/palette.ts';
import { rgb } from './placeholder-tiles.ts';

/**
 * The placeholder figure (visual.md §5): the player as twenty 16x24 frames in one row, drawn
 * from code in six Endesga 32 colours. Pure — it returns pixels; tools/gen-sprites.ts writes the
 * file. Frame index = facing × PHASES_PER_FACING + phase, facings in FACINGS order.
 */

/** 4 facings × 5 phases. */
export const FRAME_COUNT = FACINGS.length * PHASES_PER_FACING;
export const SHEET_WIDTH = FRAME_COUNT * FRAME_WIDTH;
export const SHEET_HEIGHT = FRAME_HEIGHT;

/** One letter per colour; `.` is transparent. */
export const INKS = {
  H: '#3e2731', // hair
  S: '#e8b796', // skin
  T: '#124e89', // shirt
  P: '#262b44', // trousers
  K: '#181425', // shoes and eyes
  L: '#feae34', // lanyard
} as const satisfies Record<string, PaletteColour>;

const COLOURS = new Map<string, PaletteColour>(Object.entries(INKS));

type Rows = readonly string[];

const BLANK = '................';

// Rows 2–10, the head. Columns are 0–15 from the left.

const HEAD_DOWN: Rows = [
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HSSSSH.....',
  '.....SSSSSS.....',
  '.....SKSSKS.....', // two eyes at columns 6 and 9
  '.....SSSSSS.....',
  '......SSSS......',
  '.......SS.......',
];
const HEAD_UP: Rows = [
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '......HHHH......',
  '.......SS.......', // the neck
];
const HEAD_LEFT: Rows = [
  '......HHHH......',
  '.....HHHHHH.....',
  '.....HHHHHH.....',
  '.....HSSSHH.....',
  '.....SSSSHH.....',
  '.....KSSSHH.....', // one eye at column 5, the left edge of the face
  '.....SSSSHH.....',
  '......SSSH......',
  '.......SS.......',
];

// Rows 11–16, the torso.

const TORSO_DOWN: Rows = [
  '.....TLTTLT.....',
  '....TTLTTLTT....',
  '....TTTLLTTT....',
  '....TTTLLTTT....',
  '....STTTTTTS....',
  '.....TTTTTT.....',
];
const TORSO_UP: Rows = [
  '.....TTTTTT.....',
  '....TTTTTTTT....',
  '....TTTTTTTT....',
  '....TTTTTTTT....',
  '....STTTTTTS....',
  '.....TTTTTT.....',
];
const TORSO_LEFT_STANDING: Rows = [
  '.....LTTTTT.....',
  '....TLTTTTTT....',
  '....TLTTTTTT....',
  '....TLTTTTTT....',
  '....STTTTTTS....',
  '.....TTTTTT.....',
];
const TORSO_LEFT_HAND_FORWARD: Rows = [
  '.....LTTTTT.....',
  '....TLTTTTTT....',
  '....TLTTTTTT....',
  '...STLTTTTTT....', // the front hand at (3, 14)
  '.....TTTTTTS....',
  '.....TTTTTT.....',
];
const TORSO_LEFT_HAND_BACK: Rows = [
  '.....LTTTTT.....',
  '....TLTTTTTT....',
  '....TLTTTTTT....',
  '....TLTTTTTTS...', // the back hand at (12, 14)
  '....STTTTTT.....',
  '.....TTTTTT.....',
];

// Rows 17–23, the legs. "Left" and "right" are the viewer's in every facing.

const LEGS_STANDING: Rows = [
  '.....PPPPPP.....',
  '.....PPPPPP.....',
  '.....PP..PP.....',
  '.....PP..PP.....',
  '.....PP..PP.....',
  '.....KK..KK.....',
  '.....KK..KK.....',
];
const LEGS_FRONT_LEFT_FORWARD: Rows = [
  '.....PPPPPP.....',
  '.....PPPPPP.....',
  '.....PP..PP.....',
  '.....PP..PP.....',
  '.....PP..KK.....',
  '.....KK..KK.....',
  '.....KK.........',
];
const LEGS_LEFT_STRIDE_FORWARD: Rows = [
  '.....PPPPPP.....',
  '....PPPPPPP.....',
  '...PP....PP.....',
  '...PP....PP.....',
  '...PP....KK.....',
  '...KK....KK.....',
  '...KK...........',
];
const LEGS_LEFT_STRIDE_BACK: Rows = [
  '.....PPPPPP.....',
  '.....PPPPPPP....',
  '.....PP....PP...',
  '.....PP....PP...',
  '.....KK....PP...',
  '.....KK....KK...',
  '...........KK...',
];

/** Every row reversed: facing right is facing left mirrored. */
function mirror(rows: Rows): Rows {
  return rows.map((row) => [...row].reverse().join(''));
}

/** One pixel up; row 0 was blank, so nothing is lost. */
function raised(rows: Rows): Rows {
  return [...rows.slice(1), BLANK];
}

/** 2 + 9 + 6 + 7 = 24 rows. */
function pose(head: Rows, torso: Rows, legs: Rows): Rows {
  return [BLANK, BLANK, ...head, ...torso, ...legs];
}

interface Poses {
  readonly standing: Rows;
  readonly stride1: Rows;
  readonly stride3: Rows;
}

const LEFT: Poses = {
  standing: pose(HEAD_LEFT, TORSO_LEFT_STANDING, LEGS_STANDING),
  stride1: pose(HEAD_LEFT, TORSO_LEFT_HAND_FORWARD, LEGS_LEFT_STRIDE_FORWARD),
  stride3: pose(HEAD_LEFT, TORSO_LEFT_HAND_BACK, LEGS_LEFT_STRIDE_BACK),
};

const POSES: Readonly<Record<Facing, Poses>> = {
  down: {
    standing: pose(HEAD_DOWN, TORSO_DOWN, LEGS_STANDING),
    stride1: pose(HEAD_DOWN, TORSO_DOWN, LEGS_FRONT_LEFT_FORWARD),
    stride3: pose(HEAD_DOWN, TORSO_DOWN, mirror(LEGS_FRONT_LEFT_FORWARD)),
  },
  // The back view uses the front view's legs.
  up: {
    standing: pose(HEAD_UP, TORSO_UP, LEGS_STANDING),
    stride1: pose(HEAD_UP, TORSO_UP, LEGS_FRONT_LEFT_FORWARD),
    stride3: pose(HEAD_UP, TORSO_UP, mirror(LEGS_FRONT_LEFT_FORWARD)),
  },
  left: LEFT,
  right: {
    standing: mirror(LEFT.standing),
    stride1: mirror(LEFT.stride1),
    stride3: mirror(LEFT.stride3),
  },
};

/** The 24 rows of 16 letters of one frame. */
export function frameRows(facing: Facing, phase: number): readonly string[] {
  const poses = POSES[facing];
  if (phase === 0) {
    return poses.standing;
  }
  if (phase === 1) {
    return poses.stride1;
  }
  if (phase === 3) {
    return poses.stride3;
  }
  if (phase === 2 || phase === 4) {
    return raised(poses.standing);
  }
  throw new Error(`phase ${phase} is not one of 0–4`);
}

/** RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderPlayer(): Uint8Array {
  const data = new Uint8Array(SHEET_WIDTH * SHEET_HEIGHT * 4);
  for (const [f, facing] of FACINGS.entries()) {
    for (let phase = 0; phase < PHASES_PER_FACING; phase += 1) {
      const n = f * PHASES_PER_FACING + phase;
      const rows = frameRows(facing, phase);
      if (rows.length !== FRAME_HEIGHT) {
        throw new Error(`${facing} phase ${phase} has ${rows.length} rows, not ${FRAME_HEIGHT}`);
      }
      for (const [y, row] of rows.entries()) {
        if (row.length !== FRAME_WIDTH) {
          throw new Error(
            `${facing} phase ${phase} row ${y} has ${row.length} characters, not ${FRAME_WIDTH}`,
          );
        }
        for (const [x, letter] of [...row].entries()) {
          if (letter === '.') {
            continue;
          }
          const colour = COLOURS.get(letter);
          if (colour === undefined) {
            throw new Error(`${facing} phase ${phase} row ${y}: '${letter}' is not in INKS`);
          }
          data.set([...rgb(colour), 255], (y * SHEET_WIDTH + n * FRAME_WIDTH + x) * 4);
        }
      }
    }
  }
  return data;
}
