import { type TextKey, textKey } from '../text/text';
import { CASES, type Case } from './cases';
import type { GameInput } from './player';
import type { GameState, SolvedCase } from './state';

/**
 * The story (vision.md §4, feature 0026). A scene is text the story itself says: pages in the
 * dialogue box, with no figure that speaks. The game opens a scene, never a press; nobody
 * turns to anybody. The close (0034) follows the last case of the game: the story says once
 * that the rest of the floor follows. Pure data and pure functions.
 */

export interface Scene {
  readonly id: string;
  /** What the story says, page by page; at least one. */
  readonly pages: readonly TextKey[];
}

export const SCENES: readonly Scene[] = [
  {
    id: 'call',
    pages: [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')],
  },
  {
    id: 'close',
    pages: [textKey('story.close-1'), textKey('story.close-2'), textKey('story.close-3')],
  },
];

/** The scene a new game opens with: the call. The step that closes it ends the game's opening. */
export const OPENING_SCENE = 0;
/** The scene that follows the last case of the game (0034): the close. */
export const CLOSE_SCENE = 1;
/** Tune: five seconds from the step that solved the last case to the close. */
export const CLOSE_DELAY_STEPS = 300;

/**
 * Whether the close is due (0034): it was not closed before, every case is solved, and at
 * least CLOSE_DELAY_STEPS steps have passed since the step that solved the last of them. A
 * table without a case never makes it due. Derived on every call; the state has no field for
 * it. A case that joins the table moves the close behind it.
 */
export function closeDue(
  tick: number,
  solved: readonly SolvedCase[],
  finished: number | null,
  cases: readonly Pick<Case, 'region'>[] = CASES,
): boolean {
  if (finished !== null || cases.length === 0) {
    return false;
  }
  let last = 0;
  for (const { region } of cases) {
    const entry = solved.find((candidate) => candidate.region === region);
    if (entry === undefined) {
      return false;
    }
    last = Math.max(last, entry.at);
  }
  return tick - last >= CLOSE_DELAY_STEPS;
}

/**
 * The state after a step in which the game opens a scene by itself (0034): the scene on its
 * first page, the figure standing, the lamp off, the tick grown and the input remembered, as
 * when a talk opens (0017). Nothing else changes, and nothing else is stepped.
 */
export function openScene(state: GameState, input: GameInput, scene: number): GameState {
  return {
    ...state,
    tick: state.tick + 1,
    held: input,
    player: { ...state.player, frame: 0, frameTimer: 0 },
    lamp: { ...state.lamp, on: false },
    dialogue: { speaker: 'story', index: scene, page: 0 },
  };
}

/** The pages of the scene with this index; none when there is no such scene. */
export function scenePages(index: number, scenes: readonly Scene[] = SCENES): readonly TextKey[] {
  return scenes[index]?.pages ?? [];
}
