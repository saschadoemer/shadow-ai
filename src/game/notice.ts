import { type TextKey, textKey } from '../text/text';
import type { GameState } from './state';

/**
 * The notice (gameplay.md §2, feature 0016): one line the game itself says, shown at the
 * bottom of the screen while its cause lasts. Derived from the state in every frame and kept
 * nowhere — the state has no field for it. There is one notice. Pure.
 */

/** A shadow wall holds against the lamp: its density is above the lamp's strength (0014). */
export const NOTICE_SHADOW_TOO_DENSE: TextKey = textKey('notice.shadow-too-dense');

/**
 * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
 * is on and cannot lift: a wall that gives way counts from 1 in its first step. In the dark
 * the lamp is off, so there is no notice.
 */
export function noticeOf(state: GameState): TextKey | null {
  const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
  return state.lamp.on && holds ? NOTICE_SHADOW_TOO_DENSE : null;
}
