import type { Point } from '../engine/tiled';
import type { Facing, PlayerState } from './state';

/**
 * The lamp's cone of light (gameplay.md §2, feature 0007): a sector from an apex at chest
 * height in the facing's direction, CONE_LENGTH long, opening with slope 1/2 to each side so it
 * is as wide at its end as it is long. `inCone` is the one test the game makes on it; 0008
 * freezes a creature whose point passes it. Pure data and pure functions: the renderer draws the
 * same cone from a sprite sheet whose frames hold it (FRAME_APEX), the generator draws that sheet
 * from `inCone`.
 */

/** Tune: 48 px is three tiles. Half-open: a point at exactly 48 is outside. */
export const CONE_LENGTH = 48;
/** The lamp is held at chest height: the apex is this many pixels above the feet. */
export const LAMP_HEIGHT = 12;

export interface Cone {
  /** Map pixels, floating point like the feet. */
  readonly apex: Point;
  readonly facing: Facing;
}

/** The unit vector of each facing. */
export const DIRECTIONS: Readonly<Record<Facing, Point>> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Where the apex sits in a CONE_LENGTH × CONE_LENGTH frame of the lamp sheet, per facing, as
 * (column, row): the middle of the edge the cone opens from. The renderer places a frame by
 * subtracting this from the apex; the generator draws the cone from it. Literals, so that no
 * value is a negated zero.
 */
export const FRAME_APEX: Readonly<Record<Facing, Point>> = {
  down: { x: 24, y: 0 },
  up: { x: 24, y: 47 },
  left: { x: 47, y: 24 },
  right: { x: 0, y: 24 },
};

/** The cone the figure's lamp casts: the apex LAMP_HEIGHT above the feet, in the facing. */
export function lampCone(player: PlayerState): Cone {
  return { apex: { x: player.x, y: player.y - LAMP_HEIGHT }, facing: player.facing };
}

/**
 * Whether a point lies in the cone: with d its distance from the apex along the direction and
 * s its distance from the axis, 0 ≤ d < CONE_LENGTH and |s| ≤ d / 2. The apex is in; a point
 * beside it or behind it is not.
 */
export function inCone(point: Point, cone: Cone): boolean {
  const direction = DIRECTIONS[cone.facing];
  const dx = point.x - cone.apex.x;
  const dy = point.y - cone.apex.y;
  const along = dx * direction.x + dy * direction.y;
  const aside = Math.abs(dx * direction.y - dy * direction.x);
  return along >= 0 && along < CONE_LENGTH && aside <= along / 2;
}
