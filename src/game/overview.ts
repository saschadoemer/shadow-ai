import { DIRECTIONS } from './lamp';
import type { CreatureState, Overview, PlayerState, Recoil } from './state';

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

/**
 * The creature that hits in this step, or null: the first in array order that is free — not
 * frozen in the light — and at most HIT_DISTANCE from the figure's feet. Nobody hits a figure
 * that is still safe. Called with the creatures and the figure after their own steps.
 */
export function hittingCreature(
  creatures: readonly CreatureState[],
  player: PlayerState,
): CreatureState | null {
  if (player.grace > 0) {
    return null;
  }
  for (const creature of creatures) {
    const distance = Math.hypot(player.x - creature.x, player.y - creature.y);
    if (creature.light === 0 && distance <= HIT_DISTANCE) {
      return creature;
    }
  }
  return null;
}

/**
 * The push a hit leaves: RECOIL_PX_PER_STEP along the line from the creature's feet to the
 * figure's, for RECOIL_STEPS steps. On the same spot the line is the opposite of the facing;
 * `0 - value` and not `-value`, so that no component is a negated zero.
 */
export function recoilFrom(creature: CreatureState, player: PlayerState): Recoil {
  const dx = player.x - creature.x;
  const dy = player.y - creature.y;
  const distance = Math.hypot(dx, dy);
  const facing = DIRECTIONS[player.facing];
  const unit =
    distance === 0 ? { x: 0 - facing.x, y: 0 - facing.y } : { x: dx / distance, y: dy / distance };
  return {
    dx: unit.x * RECOIL_PX_PER_STEP,
    dy: unit.y * RECOIL_PX_PER_STEP,
    steps: RECOIL_STEPS,
  };
}

/** What a hit leaves behind. `dark` is 1 when it took the last point, else 0. */
export interface HitResult {
  readonly player: PlayerState;
  readonly overview: Overview;
  readonly dark: number;
}

/**
 * One point less. Above zero the figure is safe for GRACE_STEPS and is pushed away; at zero
 * the dark begins and the figure is left as it is — the dark sets it right.
 */
export function applyHit(
  player: PlayerState,
  overview: Overview,
  creature: CreatureState,
): HitResult {
  const left: Overview = { current: overview.current - 1, max: overview.max };
  if (left.current <= 0) {
    return { player, overview: { current: 0, max: overview.max }, dark: 1 };
  }
  return {
    player: { ...player, grace: GRACE_STEPS, recoil: recoilFrom(creature, player) },
    overview: left,
    dark: 0,
  };
}
