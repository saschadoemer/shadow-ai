import type { Overview } from './state';

/**
 * Overview (gameplay.md §4, feature 0009): the hit of a free creature, the push and the safe
 * time it leaves, and the dark the figure falls into at zero. Pure data and pure functions.
 */

/** The points of overview the game starts with; the maximum grows with solved cases (M5). */
export const INITIAL_OVERVIEW = 3;
/** Tune: a free creature this close to the figure's feet hits; 2 px more than its stop at 8. */
export const HIT_DISTANCE = 10;
/** Tune: 1.5 s safe after a hit. */
export const GRACE_STEPS = 90;
/** Tune: the push lasts 8 steps of 3 px: 24 px, a tile and a half. */
export const RECOIL_STEPS = 8;
export const RECOIL_PX_PER_STEP = 3;
/** Tune: the dark sequence, 1.5 s; the world is set right in its 45th step. */
export const DARK_STEPS = 90;
export const WAKE_STEP = 45;

export function initialOverview(): Overview {
  return { current: INITIAL_OVERVIEW, max: INITIAL_OVERVIEW };
}
