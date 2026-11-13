import { type Box, moveBox } from '../engine/collision';
import { STEPS_PER_SECOND } from '../engine/loop';
import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import { type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { type Facing, NO_RECOIL, type PlayerState, WALK_PHASES } from './state';

/** The four movement actions, resolved by main.ts once per frame from the held keys. */
export interface MovementInput {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

/** Everything the game reads from the keys (0007): the movement actions and `lamp`, on while Space is held. */
export interface GameInput extends MovementInput {
  readonly lamp: boolean;
}

/** Tune: 80 px/s is 1.333 px per step. */
export const SPEED_PX_PER_SECOND = 80;
const STEP_DISTANCE = SPEED_PX_PER_SECOND / STEPS_PER_SECOND;

export interface Vector {
  readonly x: number;
  readonly y: number;
}

/** The sum of the active actions, normalized: opposite actions cancel; a diagonal has length 1. */
export function movementVector(input: MovementInput): Vector {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

/** A horizontal component wins; a vertical one alone faces up or down; nothing keeps the facing. */
function facingOf(vector: Vector, current: Facing): Facing {
  if (vector.x !== 0) {
    return vector.x > 0 ? 'right' : 'left';
  }
  if (vector.y !== 0) {
    return vector.y > 0 ? 'down' : 'up';
  }
  return current;
}

export const WALK_FRAMES_PER_SECOND = 8;
/**
 * Steps per phase: 7.5, so phases take 8 and 7 steps in turn. Every timer value is a multiple
 * of 0.5, which floating point holds exactly; the cycle never drifts.
 */
export const STEPS_PER_PHASE = STEPS_PER_SECOND / WALK_FRAMES_PER_SECOND;

/** Standing: phase 0, timer 0. The step that starts moving: phase 1, timer 0. Then +1 per step; at 7.5 the next phase. */
function walkCycle(
  player: PlayerState,
  moving: boolean,
): { readonly frame: number; readonly frameTimer: number } {
  if (!moving) {
    return { frame: 0, frameTimer: 0 };
  }
  if (player.frame === 0) {
    return { frame: 1, frameTimer: 0 };
  }
  const frameTimer = player.frameTimer + 1;
  if (frameTimer < STEPS_PER_PHASE) {
    return { frame: player.frame, frameTimer };
  }
  return { frame: (player.frame % WALK_PHASES) + 1, frameTimer: frameTimer - STEPS_PER_PHASE };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The collision box (0005): the lowest 8 px of the 16x24 sprite, 12 px wide, centred under the feet. */
export const BOX_WIDTH = 12;
export const BOX_HEIGHT = 8;

/** The box of a figure whose feet are at (x, y): [x − 6, x + 6) × [y − 8, y). 0006 centres the camera on it. */
export function collisionBox(player: PlayerState): Box {
  return {
    x: player.x - BOX_WIDTH / 2,
    y: player.y - BOX_HEIGHT,
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  };
}

/** The feet from a moved box, clamped so the whole 16x24 sprite stays inside the map. */
function feetOf(box: Point, map: TileMap): { readonly x: number; readonly y: number } {
  const halfWidth = FRAME_WIDTH / 2;
  return {
    x: clamp(box.x + BOX_WIDTH / 2, halfWidth, map.width * TILE_SIZE - halfWidth),
    y: clamp(box.y + BOX_HEIGHT, FRAME_HEIGHT, map.height * TILE_SIZE),
  };
}

/**
 * One step of a push (0009): the box moves by the push against the solid grid and the clamp,
 * like a walking step. The keys are not read, the facing stays, the walk cycle is standing.
 */
function pushed(player: PlayerState, grace: number, map: TileMap): PlayerState {
  const { dx, dy, steps } = player.recoil;
  return {
    ...feetOf(moveBox(collisionBox(player), dx, dy, map), map),
    facing: player.facing,
    frame: 0,
    frameTimer: 0,
    grace,
    recoil: steps > 1 ? { dx, dy, steps: steps - 1 } : NO_RECOIL,
  };
}

/**
 * One step. `grace` drops by 1, not below 0 (0009). A figure that is being pushed is moved by
 * the push and nothing else. With the lamp on (0007) the figure stands where it is and the
 * direction keys only turn it, by the same rule as walking; the walk cycle is standing.
 * Otherwise: move the box along the vector against the solid grid, X then Y (engine/collision),
 * clamp the feet so the whole 16x24 sprite stays inside the map, turn. "Moving" is the vector
 * before collision and clamp, so a figure held by a wall or an edge keeps its facing and its
 * walk cycle.
 */
export function stepPlayer(player: PlayerState, input: GameInput, map: TileMap): PlayerState {
  const grace = Math.max(0, player.grace - 1);
  if (player.recoil.steps > 0) {
    return pushed(player, grace, map);
  }
  const vector = movementVector(input);
  if (input.lamp) {
    return { ...player, facing: facingOf(vector, player.facing), frame: 0, frameTimer: 0, grace };
  }
  const moving = vector.x !== 0 || vector.y !== 0;
  const box = moveBox(
    collisionBox(player),
    vector.x * STEP_DISTANCE,
    vector.y * STEP_DISTANCE,
    map,
  );
  return {
    ...feetOf(box, map),
    facing: facingOf(vector, player.facing),
    ...walkCycle(player, moving),
    grace,
    recoil: player.recoil,
  };
}
