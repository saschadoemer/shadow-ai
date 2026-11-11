import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { type GameInput, stepPlayer } from './player';
import type { GameState, PlayerState } from './state';

/** The state before the first step: the player at the map's spawn, facing down, standing; the camera on it; the lamp off. */
export function createInitialState(map: TileMap): GameState {
  const player: PlayerState = {
    x: map.spawn.x,
    y: map.spawn.y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
  };
  return { tick: 0, player, camera: followPlayer(player, map), lamp: { on: false } };
}

/**
 * Advances the game by exactly one logic step and returns the new state; its arguments are not
 * mutated. The camera follows the stepped player, after collision and clamp; the lamp is on in
 * exactly the steps whose input holds it (0007).
 */
export function update(state: GameState, input: GameInput, content: TileMap): GameState {
  const player = stepPlayer(state.player, input, content);
  return {
    tick: state.tick + 1,
    player,
    camera: followPlayer(player, content),
    lamp: { on: input.lamp },
  };
}
