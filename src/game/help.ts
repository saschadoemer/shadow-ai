import { type GameInput, pressed } from './player';
import type { GameState } from './state';

/**
 * The help (gameplay.md §8, feature 0021): a box over the game that lists every key. A press
 * of `help` opens it over whatever is there — the world, an open dialogue, the open journal —
 * and a press closes it. While it is open nothing is stepped: time passes, and that is all.
 * The label that names its key is drawn by the scene and is no matter of the game (feature
 * 0031). Pure data and pure functions.
 */

/**
 * The state after a press that opens the help, or null when `help` is not pressed: the help
 * open, the tick grown, the input remembered. Nothing else changes, whatever else is open and
 * whatever else the input holds: a dialogue keeps its page, the journal its tab, and a figure
 * in mid-step, a push and a lamp that is on stay as they are.
 */
export function openHelp(state: GameState, input: GameInput): GameState | null {
  if (!pressed(state.held, input, 'help')) {
    return null;
  }
  return { ...state, tick: state.tick + 1, held: input, help: true };
}

/**
 * One step with the help open: the tick grows and the input is remembered. A press of `help`
 * closes it; the other keys do nothing. Nothing else changes.
 */
export function stepHelp(state: GameState, input: GameInput): GameState {
  return {
    ...state,
    tick: state.tick + 1,
    held: input,
    help: !pressed(state.held, input, 'help'),
  };
}
