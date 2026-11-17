import type { Point } from '../engine/tiled';
import type { Figure } from './cast';
import type { GameInput } from './player';
import type { Dialogue, Facing, GameState } from './state';

/**
 * Talking (gameplay.md §8, feature 0017). A press of `talk` next to a standing figure opens a
 * dialogue: the two turn to each other and the figure's first page is shown. A press turns to
 * the next page; a press on the last page closes the dialogue. While it is open nothing in
 * the world is stepped — time passes, and that is all. Pure data and pure functions.
 */

/** Tune: a tile and a half between the feet of the two. */
export const TALK_DISTANCE = 24;

/**
 * Whether `talk` is pressed in this step: the input holds it and the last step's did not. The
 * keyboard keeps no press (architecture.md §4), so the state does, in `talkHeld`.
 */
export function talkPressed(state: GameState, input: GameInput): boolean {
  return input.talk && !state.talkHeld;
}

/**
 * Where one looks whose feet are at `from` when the other's are at `to`: left or right when
 * the horizontal distance is the larger one, up or down otherwise, and `current` when both
 * stand on the same spot.
 */
export function facingToward(from: Point, to: Point, current: Facing): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) {
    return current;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

/**
 * The index of the figure a press speaks to: the nearest whose feet are at most TALK_DISTANCE
 * from the player's, the first in the map's order of two equally near; null when none is.
 */
export function figureInReach(player: Point, figures: readonly Figure[]): number | null {
  let nearest: number | null = null;
  let reach = TALK_DISTANCE;
  for (const [index, figure] of figures.entries()) {
    const distance = Math.hypot(figure.x - player.x, figure.y - player.y);
    if (distance <= reach && (nearest === null || distance < reach)) {
      nearest = index;
      reach = distance;
    }
  }
  return nearest;
}

/**
 * The state after a press that opens a dialogue, or null when this step opens none: `talk` is
 * not pressed, the lamp is held, the player is being pushed, or no figure is in reach. The
 * player and the figure turn to each other, the player stands, the lamp is off; nothing else
 * is stepped.
 */
export function openDialogue(
  state: GameState,
  input: GameInput,
  figures: readonly Figure[],
): GameState | null {
  if (!talkPressed(state, input) || input.lamp || state.player.recoil.steps > 0) {
    return null;
  }
  const { player } = state;
  const index = figureInReach(player, figures);
  const figure = index === null ? undefined : figures[index];
  if (index === null || figure === undefined) {
    return null;
  }
  return {
    ...state,
    tick: state.tick + 1,
    talkHeld: true,
    player: {
      ...player,
      facing: facingToward(player, figure, player.facing),
      frame: 0,
      frameTimer: 0,
    },
    lamp: { on: false, strength: state.lamp.strength },
    figures: state.figures.map((standing) =>
      standing.figure === index
        ? { figure: index, facing: facingToward(figure, player, standing.facing) }
        : standing,
    ),
    dialogue: { figure: index, page: 0 },
  };
}

/**
 * One step with a dialogue open: the tick grows, the key is remembered, and a press turns to
 * the next page or, on the last page, closes the dialogue. Nothing else changes.
 */
export function stepDialogue(
  state: GameState,
  dialogue: Dialogue,
  input: GameInput,
  figures: readonly Figure[],
): GameState {
  const pages = figures[dialogue.figure]?.pages.length ?? 0;
  const page = talkPressed(state, input) ? dialogue.page + 1 : dialogue.page;
  return {
    ...state,
    tick: state.tick + 1,
    talkHeld: input.talk,
    dialogue: page < pages ? { figure: dialogue.figure, page } : null,
  };
}
