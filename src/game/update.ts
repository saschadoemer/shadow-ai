import type { GameState } from './state';

/** Advances the game by exactly one logic step and returns the new state; the input is kept. */
export function update(state: GameState): GameState {
  return { ...state, tick: state.tick + 1 };
}
