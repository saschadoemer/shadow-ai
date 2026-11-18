import { describe, expect, it } from 'vitest';
import type { NamedPoint, TileMap } from '../../src/engine/tiled';
import { figuresOf } from '../../src/game/cast';
import { routesOf } from '../../src/game/mover';
import type { Dialogue } from '../../src/game/state';
import { OPENING_SCENE, SCENES, type Scene, scenePages } from '../../src/game/story';
import { pagesOf, speakerOf, speakersOf } from '../../src/game/talk';
import { createInitialState } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const CALL = [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')];
const RULES = [textKey('talk.officer-rules-1'), textKey('talk.officer-rules-2')];
const OFFICER: NamedPoint = { name: 'figure:officer', x: 160, y: 96 };
/** The colleague of the reception, waiting ten seconds 32 px above the spawn. */
const COLLEAGUE: readonly NamedPoint[] = [
  { name: 'person:reception:1', x: 136, y: 64, pause: 600 },
  { name: 'person:reception:2', x: 64, y: 64 },
];
/** 20x12 cells of open floor: the spawn 24 px left of the officer and 32 px below the colleague. */
const MAP: TileMap = grassMap(20, 12, { x: 136, y: 96 }, [OFFICER, ...COLLEAGUE]);

describe('the scenes of the story (0026)', () => {
  it('holds the call with its three pages, and opens a game with it', () => {
    expect(SCENES).toStrictEqual([{ id: 'call', pages: CALL }]);
    expect(OPENING_SCENE).toBe(0);
    expect(SCENES[OPENING_SCENE]?.id).toBe('call');
  });

  it('gives the pages of a scene by its index, and none for an index without a scene', () => {
    expect(scenePages(0)).toStrictEqual(CALL);
    expect(scenePages(1)).toStrictEqual([]);
    expect(scenePages(-1)).toStrictEqual([]);
    const scenes: readonly Scene[] = [{ id: 'other', pages: [textKey('notice.language')] }];
    expect(scenePages(0, scenes)).toStrictEqual([textKey('notice.language')]);
  });

  it('is no speaker of a step: the pages of its dialogue are its own, whoever stands near', () => {
    const state = createInitialState(MAP);
    const speakers = speakersOf(figuresOf(MAP.points), state.movers, routesOf(MAP.points));
    expect(speakers.map((speaker) => speaker.speaker)).toStrictEqual(['figure', 'mover']);
    const story: Dialogue = { speaker: 'story', index: 0, page: 0 };
    expect(speakerOf(story, speakers)).toBeUndefined();
    expect(pagesOf(story, speakers)).toStrictEqual(CALL);
    expect(pagesOf(story, [])).toStrictEqual(CALL);
    expect(pagesOf({ speaker: 'story', index: 7, page: 0 }, speakers)).toStrictEqual([]);
  });

  it('leaves the pages of a figure and of a colleague to the speakers of the step', () => {
    const state = createInitialState(MAP);
    const speakers = speakersOf(figuresOf(MAP.points), state.movers, routesOf(MAP.points));
    expect(pagesOf({ speaker: 'figure', index: 0, page: 0 }, speakers)).toStrictEqual(RULES);
    expect(pagesOf({ speaker: 'mover', index: 0, page: 0 }, speakers)).toStrictEqual([
      textKey('talk.reception-everyday'),
    ]);
    expect(pagesOf({ speaker: 'figure', index: 3, page: 0 }, speakers)).toStrictEqual([]);
  });
});
