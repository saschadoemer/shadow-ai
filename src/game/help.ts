import { type TextKey, textKey } from '../text/text';
import { type GameInput, pressed } from './player';
import type { GameState } from './state';

/**
 * The help (gameplay.md §8, feature 0021): a box over the game that lists every key. A press
 * of `help` opens it over whatever is there — the world, an open dialogue, the open journal —
 * and a press closes it. While it is open nothing is stepped: time passes, and that is all.
 * For the first seconds of a game one line names its key. Pure data and pure functions.
 */

/** The start hint: the line that names the key of the help. */
export const HELP_HINT: TextKey = textKey('notice.help');
/** Tune: ten seconds. */
export const HELP_HINT_STEPS = 600;

/**
 * Whether the start hint is due at `tick`: for the first HELP_HINT_STEPS steps of a game. The
 * tick grows in every step, so the time runs on behind an open help, dialogue or journal; the
 * scene decides what else has the bar first.
 */
export function helpHintDue(tick: number): boolean {
  return tick < HELP_HINT_STEPS;
}

/**
 * Whether the start hint is due in a state (0026): the game's opening has ended, and fewer
 * than HELP_HINT_STEPS steps have passed since. While the call is open it is not due, so the
 * call does not use its ten seconds up. A game past its opening started at 0, and there this
 * is `helpHintDue(tick)`.
 */
export function startHintDue(state: Pick<GameState, 'tick' | 'started'>): boolean {
  return state.started !== null && helpHintDue(state.tick - state.started);
}

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
