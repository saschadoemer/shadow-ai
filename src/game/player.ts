import { STEPS_PER_SECOND } from '../engine/loop';
import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import { TILE_SIZE, type TileMap } from '../engine/tiled';
import { type Facing, type PlayerState, WALK_PHASES } from './state';

/** The four movement actions, resolved by main.ts once per frame from the held keys. */
export interface MovementInput {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
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

/**
 * One step: move along the vector, clamp the feet so the whole 16x24 sprite stays inside the
 * map, turn. "Moving" is the vector before the clamp, so a figure held at an edge keeps its
 * facing and its walk cycle.
 */
export function stepPlayer(player: PlayerState, input: MovementInput, map: TileMap): PlayerState {
  const vector = movementVector(input);
  const moving = vector.x !== 0 || vector.y !== 0;
  const halfWidth = FRAME_WIDTH / 2;
  return {
    x: clamp(player.x + vector.x * STEP_DISTANCE, halfWidth, map.width * TILE_SIZE - halfWidth),
    y: clamp(player.y + vector.y * STEP_DISTANCE, FRAME_HEIGHT, map.height * TILE_SIZE),
    facing: facingOf(vector, player.facing),
    ...walkCycle(player, moving),
  };
}
