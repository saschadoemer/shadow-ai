import { sightBlocked } from '../engine/collision';
import type { Point, TileMap } from '../engine/tiled';
import type { TextKey } from '../text/text';
import { type Progress, pagesIn } from './cases';
import { COLLEAGUES, type Colleague, type Figure, pagesOfRoute } from './cast';
import type { Route } from './mover';
import { BOX_HEIGHT, type GameInput, pressed } from './player';
import type { Dialogue, Facing, GameState, MoverState, SpeakerKind } from './state';

/**
 * Talking (gameplay.md §8, features 0017 and 0018). A press of `talk` near a speaker — a
 * standing figure, or a colleague on its round — opens a dialogue: the two turn to each other
 * and the speaker's first page is shown. A press turns to the next page; a press on the last
 * page closes the dialogue. While it is open nothing in the world is stepped — time passes,
 * and that is all. Pure data and pure functions.
 */

/** Tune: two and a half tiles between the feet of the two — across a counter (0018). */
export const TALK_DISTANCE = 40;

/**
 * Whether `talk` is pressed in this step: the input holds it and the last step's did not. The
 * keyboard keeps no press (architecture.md §4), so the state does, in `held`.
 */
export function talkPressed(state: GameState, input: GameInput): boolean {
  return pressed(state.held, input, 'talk');
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

/** Someone who can be spoken to, where it is in this step: the feet in map pixels. */
export interface Speaker extends Point {
  readonly speaker: SpeakerKind;
  /** The index in `GameState.figures` or in `GameState.movers`. */
  readonly index: number;
  readonly pages: readonly TextKey[];
}

/**
 * The speakers of a step (0018): the standing figures in the map's order, then the colleagues
 * — the movers of the kind `person` whose route has lines — in the order of the state's
 * movers. A person without lines, a dog, a vacuum and a drone are no speakers. With the
 * progress of the cases, the source of a case says its answer or its "afterwards" (0024).
 */
export function speakersOf(
  figures: readonly Figure[],
  movers: readonly MoverState[],
  routes: readonly Route[],
  colleagues: readonly Colleague[] = COLLEAGUES,
  progress?: Progress,
): Speaker[] {
  const standing = figures.map(
    (figure, index): Speaker => ({
      speaker: 'figure',
      index,
      x: figure.x,
      y: figure.y,
      pages: figure.pages,
    }),
  );
  const walking = movers.flatMap((mover, index): Speaker[] => {
    const route = routes[mover.route]?.name ?? '';
    const everyday = mover.kind === 'person' ? pagesOfRoute(route, colleagues) : [];
    // What a colleague says follows from the cases (0024); without them, the everyday pages.
    const pages =
      progress === undefined || everyday.length === 0
        ? everyday
        : pagesIn(progress, route, everyday);
    return pages.length === 0 ? [] : [{ speaker: 'mover', index, x: mover.x, y: mover.y, pages }];
  });
  return [...standing, ...walking];
}

/** The speaker of a dialogue among the speakers of the step; undefined when it is not there. */
export function speakerOf(dialogue: Dialogue, speakers: readonly Speaker[]): Speaker | undefined {
  return speakers.find(
    (speaker) => speaker.speaker === dialogue.speaker && speaker.index === dialogue.index,
  );
}

/**
 * In sight (0018): no opaque box of the map lies on the line from the centre of the player's
 * box to the point as high above the other's feet. The lamp's test, against the map as loaded:
 * a wall stops a conversation; a counter, a desk or a chair does not.
 */
export function inSight(player: Point, place: Point, map: TileMap): boolean {
  return !sightBlocked(
    { x: player.x, y: player.y - BOX_HEIGHT / 2 },
    { x: place.x, y: place.y - BOX_HEIGHT / 2 },
    { width: map.width, height: map.height, solids: map.opaque },
  );
}

/**
 * The speaker a press speaks to: the nearest whose feet are at most TALK_DISTANCE from the
 * player's and who is in sight, the first in the speakers' order of two equally near; null
 * when none is.
 */
export function speakerInReach(
  player: Point,
  speakers: readonly Speaker[],
  map: TileMap,
): Speaker | null {
  let nearest: Speaker | null = null;
  let reach = TALK_DISTANCE;
  for (const speaker of speakers) {
    const distance = Math.hypot(speaker.x - player.x, speaker.y - player.y);
    if (
      distance <= reach &&
      (nearest === null || distance < reach) &&
      inSight(player, speaker, map)
    ) {
      nearest = speaker;
      reach = distance;
    }
  }
  return nearest;
}

/**
 * The state after a press that opens a dialogue, or null when this step opens none: `talk` is
 * not pressed, the lamp is held, the player is being pushed, or no speaker is in reach. The
 * player and the speaker turn to each other, the player stands, a colleague stands where it
 * is, the lamp is off; nothing else is stepped.
 */
export function openDialogue(
  state: GameState,
  input: GameInput,
  speakers: readonly Speaker[],
  map: TileMap,
): GameState | null {
  if (!talkPressed(state, input) || input.lamp || state.player.recoil.steps > 0) {
    return null;
  }
  const { player } = state;
  const speaker = speakerInReach(player, speakers, map);
  if (speaker === null) {
    return null;
  }
  return {
    ...state,
    tick: state.tick + 1,
    held: input,
    player: {
      ...player,
      facing: facingToward(player, speaker, player.facing),
      frame: 0,
      frameTimer: 0,
    },
    lamp: { ...state.lamp, on: false },
    figures:
      speaker.speaker === 'figure'
        ? state.figures.map((standing, index) =>
            index === speaker.index
              ? { ...standing, facing: facingToward(speaker, player, standing.facing) }
              : standing,
          )
        : state.figures,
    movers:
      speaker.speaker === 'mover'
        ? state.movers.map((mover, index) =>
            index === speaker.index
              ? {
                  ...mover,
                  facing: facingToward(speaker, player, mover.facing),
                  frame: 0,
                  frameTimer: 0,
                }
              : mover,
          )
        : state.movers,
    dialogue: { speaker: speaker.speaker, index: speaker.index, page: 0 },
  };
}

/**
 * One step with a dialogue open: the tick grows, the input is remembered, and a press turns to
 * the next page or, on the last page, closes the dialogue. Nothing else changes.
 */
export function stepDialogue(
  state: GameState,
  dialogue: Dialogue,
  input: GameInput,
  speakers: readonly Speaker[],
): GameState {
  const pages = speakerOf(dialogue, speakers)?.pages.length ?? 0;
  const page = talkPressed(state, input) ? dialogue.page + 1 : dialogue.page;
  return {
    ...state,
    tick: state.tick + 1,
    held: input,
    dialogue: page < pages ? { ...dialogue, page } : null,
  };
}
