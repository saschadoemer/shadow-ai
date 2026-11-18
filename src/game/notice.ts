import { type TextKey, textKey } from '../text/text';
import type { GameState } from './state';

/**
 * The notice (gameplay.md §2, feature 0016): one line the game itself says, shown at the
 * bottom of the screen while its cause lasts. Derived from the state in every frame and kept
 * nowhere — the state has no field for it. One notice is shown at a time. Pure.
 */

/** A shadow wall holds against the lamp: its density is above the lamp's strength (0014). */
export const NOTICE_SHADOW_TOO_DENSE: TextKey = textKey('notice.shadow-too-dense');

/** A case was solved (0024). */
export const NOTICE_CASE_SOLVED: TextKey = textKey('notice.case-solved');
/** Tune: two seconds from the solving step. */
export const CASE_NOTICE_STEPS = 120;

/** A trace was found and is in the journal now (0022). */
export const NOTICE_TRACE_FOUND: TextKey = textKey('notice.trace-found');
/** Tune: two seconds from the find. */
export const TRACE_NOTICE_STEPS = 120;

/**
 * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
 * is on and cannot lift: a wall that gives way counts from 1 in its first step; that notice
 * comes first. Then, for CASE_NOTICE_STEPS steps from the solving step, that a case is solved
 * (0024). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was found (0022).
 */
export function noticeOf(state: GameState): TextKey | null {
  const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
  if (state.lamp.on && holds) {
    return NOTICE_SHADOW_TOO_DENSE;
  }
  const solved = state.solved.some((entry) => state.tick - entry.at < CASE_NOTICE_STEPS);
  if (solved) {
    return NOTICE_CASE_SOLVED;
  }
  const found = state.traces.some(
    (trace) => trace.found !== null && state.tick - trace.found < TRACE_NOTICE_STEPS,
  );
  return found ? NOTICE_TRACE_FOUND : null;
}
