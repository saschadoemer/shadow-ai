import { type TextKey, textKey } from '../text/text';
import { type GameInput, pressed } from './player';
import type { GameState } from './state';

/**
 * The card a game opens with (vision.md §10, feature 0036): two lines on an empty screen that
 * say who presents the game — the stand-in for the title screen of M8. It is shown while
 * `presented` is null, and ends by itself or at a press of `talk`. Pure data and pure
 * functions.
 */

/** The presenter's line. */
export const CARD_PRESENTS: TextKey = textKey('card.presents');
/** The title of the game. */
export const CARD_TITLE: TextKey = textKey('card.title');
/** Tune: three seconds. The card ends in the step with which it has been shown this long. */
export const CARD_STEPS = 180;

/** Whether the card is shown: it has not ended yet. */
export function cardShown(state: GameState): boolean {
  return state.presented === null;
}

/**
 * One step of the card: the tick grows and the input is remembered, and nothing of the world
 * is stepped. A press of `talk`, or the step with which the card has been shown for
 * CARD_STEPS, ends it: `presented` becomes the tick of that step. No other key does anything.
 */
export function stepCard(state: GameState, input: GameInput): GameState {
  const tick = state.tick + 1;
  const ends = pressed(state.held, input, 'talk') || tick >= CARD_STEPS;
  return { ...state, tick, held: input, presented: ends ? tick : null };
}
