import { type TextKey, textKey } from '../text/text';

/**
 * The story (vision.md §4, feature 0026). A scene is text the story itself says: pages in the
 * dialogue box, with no figure that speaks. The game opens a scene, never a press; nobody
 * turns to anybody. Pure data.
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
];

/** The scene a new game opens with: the call. The step that closes it ends the game's opening. */
export const OPENING_SCENE = 0;

/** The pages of the scene with this index; none when there is no such scene. */
export function scenePages(index: number, scenes: readonly Scene[] = SCENES): readonly TextKey[] {
  return scenes[index]?.pages ?? [];
}
