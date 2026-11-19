import { type TextKey, textKey } from '../text/text';
import type { GameState, RestResult } from './state';
import { UPGRADES } from './world';

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

/** An upgrade was earned with a solved case (0029): what it does, by the upgrade's id. */
export const NOTICE_UPGRADE: Readonly<Partial<Record<string, TextKey>>> = {
  'wide-cone': textKey('notice.upgrade-wide-cone'),
  // The second upgrade (0040): the lamp's strength for the densest shadow.
  filter: textKey('notice.upgrade-filter'),
};
/** Tune: two seconds, after the two seconds of the solved case's notice. */
export const UPGRADE_NOTICE_STEPS = 120;

/** A trace was found and is in the journal now (0022). */
export const NOTICE_TRACE_FOUND: TextKey = textKey('notice.trace-found');
/** Tune: two seconds from the find. */
export const TRACE_NOTICE_STEPS = 120;

/** A rest was taken (0027): what the coffee did, by its result. */
export const NOTICE_REST: Readonly<Record<RestResult, TextKey>> = {
  restored: textKey('notice.rest'),
  full: textKey('notice.rest-full'),
  shadow: textKey('notice.rest-shadow'),
};
/** Tune: two seconds from the press. */
export const REST_NOTICE_STEPS = 120;

/** The light is on an open pane (0038): shown while it is, like the line of a wall that holds. */
export const NOTICE_PANE_OPEN: TextKey = textKey('notice.pane-open');

/** The lamp's key (0026): shown from the step the lamp is handed over until it is held once. */
export const NOTICE_LAMP: TextKey = textKey('notice.lamp');

/**
 * The notice of an upgrade, or null (0029): a case was solved at least CASE_NOTICE_STEPS and
 * less than CASE_NOTICE_STEPS + UPGRADE_NOTICE_STEPS steps ago, the world data has an upgrade
 * that is earned in its region, the player has it, and the upgrade has a line.
 */
function upgradeNotice(state: GameState): TextKey | null {
  for (const entry of state.solved) {
    const since = state.tick - entry.at;
    if (since < CASE_NOTICE_STEPS || since >= CASE_NOTICE_STEPS + UPGRADE_NOTICE_STEPS) {
      continue;
    }
    const earned = UPGRADES.find(
      (upgrade) => upgrade.earnedIn === entry.region && state.upgrades.includes(upgrade.id),
    );
    const key = earned === undefined ? undefined : NOTICE_UPGRADE[earned.id];
    if (key !== undefined) {
      return key;
    }
  }
  return null;
}

/**
 * The notice a state shows, or null. A wall that is lit with a count of 0 is a wall the light
 * is on and cannot lift: a wall that gives way counts from 1 in its first step; that notice
 * comes first; then, while the light is on an open pane, that the light does not hold what
 * reads along there (0038). Then, for CASE_NOTICE_STEPS steps from the solving step, that a case is solved
 * (0024), and for the UPGRADE_NOTICE_STEPS steps after them what the case earned, if it earned
 * an upgrade (0029). Then, for TRACE_NOTICE_STEPS steps from the last find, that a trace was
 * found (0022).
 * Then, for REST_NOTICE_STEPS steps from a press at a rest, what the rest gave (0027). Last,
 * while the lamp was never on, the line that names its key (0026, 0039): it has no time, and
 * it does not come back.
 */
export function noticeOf(state: GameState): TextKey | null {
  const holds = state.shadowWalls.some((wall) => wall.lit && wall.light === 0);
  if (state.lamp.on && holds) {
    return NOTICE_SHADOW_TOO_DENSE;
  }
  // The light is on an open pane, and does not hold what sits in it (0038).
  if (state.lamp.on && state.panes.some((pane) => pane.lit)) {
    return NOTICE_PANE_OPEN;
  }
  const solved = state.solved.some((entry) => state.tick - entry.at < CASE_NOTICE_STEPS);
  if (solved) {
    return NOTICE_CASE_SOLVED;
  }
  const earned = upgradeNotice(state);
  if (earned !== null) {
    return earned;
  }
  const found = state.traces.some(
    (trace) => trace.found !== null && state.tick - trace.found < TRACE_NOTICE_STEPS,
  );
  if (found) {
    return NOTICE_TRACE_FOUND;
  }
  if (state.rested !== null && state.tick - state.rested.at < REST_NOTICE_STEPS) {
    return NOTICE_REST[state.rested.result];
  }
  return state.lamp.used ? null : NOTICE_LAMP;
}
