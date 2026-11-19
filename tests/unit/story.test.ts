import { describe, expect, it } from 'vitest';
import type { NamedPoint, TileMap } from '../../src/engine/tiled';
import { figuresOf } from '../../src/game/cast';
import { routesOf } from '../../src/game/mover';
import type { Dialogue } from '../../src/game/state';
import {
  CLOSE_DELAY_STEPS,
  CLOSE_SCENE,
  closeDue,
  OPENING_SCENE,
  SCENES,
  type Scene,
  scenePages,
} from '../../src/game/story';
import { pagesOf, speakerOf, speakersOf } from '../../src/game/talk';
import { createInitialState } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const CALL = [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')];
const RULES = [
  textKey('talk.officer-rules-1'),
  textKey('talk.officer-rules-2'),
  textKey('talk.officer-rules-3'),
];
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
    // The first of the scenes; the close of 0034 follows it.
    expect(SCENES[0]).toStrictEqual({ id: 'call', pages: CALL });
    expect(OPENING_SCENE).toBe(0);
    expect(SCENES[OPENING_SCENE]?.id).toBe('call');
  });

  it('gives the pages of a scene by its index, and none for an index without a scene', () => {
    expect(scenePages(0)).toStrictEqual(CALL);
    expect(scenePages(SCENES.length)).toStrictEqual([]);
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

describe('the close (0034)', () => {
  const CLOSE = [textKey('story.close-1'), textKey('story.close-2'), textKey('story.close-3')];
  const SALES = { region: 'sales', at: 400 };
  const MARKETING = { region: 'marketing', at: 500 };
  /** The third case of the game since 0037. */
  const SUPPORT = { region: 'support', at: 600 };
  /** The fourth case since 0040, and here the one solved last. */
  const HR = { region: 'hr', at: 700 };
  const ALL = [SALES, MARKETING, SUPPORT, HR];

  it('is the second scene, with its three pages', () => {
    expect(SCENES).toStrictEqual([
      { id: 'call', pages: CALL },
      { id: 'close', pages: CLOSE },
    ]);
    expect(CLOSE_SCENE).toBe(1);
    expect(scenePages(CLOSE_SCENE)).toStrictEqual(CLOSE);
    expect(CLOSE_DELAY_STEPS).toBe(300);
  });

  it('has the pages of its dialogue, whoever stands near', () => {
    const story: Dialogue = { speaker: 'story', index: CLOSE_SCENE, page: 0 };
    expect(pagesOf(story, [])).toStrictEqual(CLOSE);
  });

  it('is never due while a case is not solved, however many steps pass', () => {
    expect(closeDue(100000, [], null)).toBe(false);
    expect(closeDue(100000, [SALES], null)).toBe(false);
    expect(closeDue(100000, [MARKETING], null)).toBe(false);
    // With Sales and Marketing solved and Support not, it is not due (0037).
    expect(closeDue(100000, [SALES, MARKETING], null)).toBe(false);
    expect(closeDue(100000, [SUPPORT, SALES], null)).toBe(false);
    // With the first three solved and HR not, it is not due (0040).
    expect(closeDue(100000, [SALES, MARKETING, SUPPORT], null)).toBe(false);
    expect(closeDue(100000, [HR, SUPPORT, SALES], null)).toBe(false);
  });

  it('is due 300 steps after the step that solved the last case, and not one before', () => {
    expect(closeDue(700, ALL, null)).toBe(false);
    expect(closeDue(999, ALL, null)).toBe(false);
    expect(closeDue(1000, ALL, null)).toBe(true);
    expect(closeDue(5000, ALL, null)).toBe(true);
  });

  it('counts from the latest case, in any order', () => {
    const turned = [
      { region: 'hr', at: 400 },
      { region: 'support', at: 500 },
      { region: 'sales', at: 600 },
      { region: 'marketing', at: 700 },
    ];
    expect(closeDue(999, turned, null)).toBe(false);
    expect(closeDue(1000, turned, null)).toBe(true);
    expect(closeDue(1000, [HR, SUPPORT, MARKETING, SALES], null)).toBe(true);
  });

  it('is not due once it was closed', () => {
    expect(closeDue(1000, ALL, 1010)).toBe(false);
    expect(closeDue(100000, ALL, 0)).toBe(false);
  });

  it('follows the table of cases it is given: a third case moves it behind that case', () => {
    const three = [{ region: 'sales' }, { region: 'marketing' }, { region: 'support' }];
    expect(closeDue(100000, [SALES, MARKETING], null, three)).toBe(false);
    const all = [SALES, MARKETING, { region: 'support', at: 900 }];
    expect(closeDue(1199, all, null, three)).toBe(false);
    expect(closeDue(1200, all, null, three)).toBe(true);
    // A table without a case never makes it due.
    expect(closeDue(100000, all, null, [])).toBe(false);
  });
});
