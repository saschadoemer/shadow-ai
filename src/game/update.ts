import type { TileMap } from '../engine/tiled';
import { type MovementInput, stepPlayer } from './player';
import type { GameState } from './state';

/** Advances the game by exactly one logic step and returns the new state; the input is kept. */
export function update(state: GameState, input: MovementInput, content: TileMap): GameState {
  return { tick: state.tick + 1, player: stepPlayer(state.player, input, content) };
}
