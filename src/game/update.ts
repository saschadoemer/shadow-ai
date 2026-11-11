import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { type MovementInput, stepPlayer } from './player';
import type { GameState, PlayerState } from './state';

/** The state before the first step: the player at the map's spawn, facing down, standing; the camera on it. */
export function createInitialState(map: TileMap): GameState {
  const player: PlayerState = {
    x: map.spawn.x,
    y: map.spawn.y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
  };
  return { tick: 0, player, camera: followPlayer(player, map) };
}

/**
 * Advances the game by exactly one logic step and returns the new state; its arguments are not
 * mutated. The camera follows the stepped player, after collision and clamp.
 */
export function update(state: GameState, input: MovementInput, content: TileMap): GameState {
  const player = stepPlayer(state.player, input, content);
  return { tick: state.tick + 1, player, camera: followPlayer(player, content) };
}
