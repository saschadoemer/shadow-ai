import { describe, expect, it } from 'vitest';
import type { TileMap } from '../../src/engine/tiled';
import { CARD_PRESENTS, CARD_STEPS, CARD_TITLE, cardShown, stepCard } from '../../src/game/card';
import { CASES } from '../../src/game/cases';
import { CAST, COLLEAGUES, FIRST_MEETING } from '../../src/game/cast';
import { HINTS } from '../../src/game/hints';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { GameState } from '../../src/game/state';
import { SCENES } from '../../src/game/story';
import { createInitialState, newGame, update } from '../../src/game/update';
import { REGIONS, UPGRADES } from '../../src/game/world';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
/** Every key but `talk`. */
const OTHERS: GameInput = {
  up: true,
  down: false,
  left: true,
  right: false,
  lamp: true,
  talk: false,
  journal: true,
  help: true,
};
/** 20x12 cells of open floor, the officer 24 px right of the spawn. */
const MAP: TileMap = grassMap(20, 12, { x: 136, y: 96 }, [
  { name: 'figure:officer', x: 160, y: 96 },
]);
const steps = (start: GameState, input: GameInput, count: number): GameState => {
  let state = start;
  for (let i = 0; i < count; i += 1) {
    state = update(state, input, MAP);
  }
  return state;
};
const CALL = { speaker: 'story', index: 0 } as const;

describe('the card a game opens with (0036)', () => {
  const start = newGame(MAP);

  it('has two lines and three seconds', () => {
    expect(CARD_PRESENTS).toBe(textKey('card.presents'));
    expect(CARD_TITLE).toBe(textKey('card.title'));
    expect(CARD_STEPS).toBe(180);
  });

  it('is shown in a new game and not in a game past its opening', () => {
    expect(start.presented).toBeNull();
    expect(cardShown(start)).toBe(true);
    expect(createInitialState(MAP).presented).toBe(0);
    expect(cardShown(createInitialState(MAP))).toBe(false);
  });

  it('survives a JSON round trip while it is shown and after it (INV-1)', () => {
    for (const state of [start, steps(start, NONE, 90), update(start, TALK, MAP)]) {
      expect('presented' in state).toBe(true);
      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    }
  });

  it('stays for 179 steps without a press and changes nothing but the tick', () => {
    let state = start;
    for (let n = 1; n < 180; n += 1) {
      state = update(state, NONE, MAP);
      expect(state, `step ${n}`).toStrictEqual({ ...start, tick: n });
    }
  });

  it('ends by itself in step 180', () => {
    const ended = steps(start, NONE, 180);
    expect(ended).toStrictEqual({ ...start, tick: 180, presented: 180 });
    expect(cardShown(ended)).toBe(false);
  });

  it.each([1, 37, 179])('ends at a press of talk in step %i', (n) => {
    const ended = update(steps(start, NONE, n - 1), TALK, MAP);
    expect(ended).toStrictEqual({ ...start, tick: n, held: TALK, presented: n });
  });

  it('does not end at a key that was held before: only a press ends it', () => {
    const held: GameState = { ...start, held: TALK };
    expect(update(held, TALK, MAP).presented).toBeNull();
    expect(update(update(held, NONE, MAP), TALK, MAP).presented).toBe(2);
  });

  it('takes no other key: help, journal, lamp and the directions change nothing but `held`', () => {
    const pressed = steps(start, OTHERS, 100);
    expect(pressed).toStrictEqual({ ...start, tick: 100, held: OTHERS });
    expect(stepCard(start, OTHERS)).toStrictEqual({ ...start, tick: 1, held: OTHERS });
  });

  it('gives way to the call on its first page: the press that ended it does not turn the page', () => {
    const ended = update(start, TALK, MAP);
    expect(ended.dialogue).toStrictEqual({ ...CALL, page: 0 });
    // Still held: a held key is no second press (0020).
    const held = steps(ended, TALK, 30);
    expect(held.dialogue).toStrictEqual({ ...CALL, page: 0 });
    expect(held.presented).toBe(1);
    // Let go and pressed again, it turns the page.
    const turned = update(update(held, NONE, MAP), TALK, MAP);
    expect(turned.dialogue).toStrictEqual({ ...CALL, page: 1 });
  });

  it('gives way to the call when it ended by itself too, and a press turns the page', () => {
    const ended = steps(start, NONE, 180);
    expect(ended.dialogue).toStrictEqual({ ...CALL, page: 0 });
    expect(update(ended, TALK, MAP).dialogue).toStrictEqual({ ...CALL, page: 1 });
  });

  it('never comes back: later steps and the wake keep `presented`', () => {
    const read = [TALK, NONE, TALK, NONE, TALK, NONE, TALK].reduce(
      (state, input) => update(state, input, MAP),
      start,
    );
    expect(read.dialogue).toBeNull();
    expect(read.presented).toBe(1);
    expect(steps(read, NONE, 600).presented).toBe(1);
    // The 44th step of the dark is the wake (0009).
    const woken = update({ ...read, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.presented).toBe(1);
  });

  it('is never seen by a game past its opening: its first step is an ordinary step', () => {
    const first = update(createInitialState(MAP), { ...NONE, right: true }, MAP);
    expect(first.presented).toBe(0);
    expect(first.player.x).toBeGreaterThan(136);
  });

  it('is the only place of the presenter: no table of the world data holds either name', () => {
    const world = JSON.stringify([
      REGIONS,
      UPGRADES,
      CAST,
      FIRST_MEETING,
      COLLEAGUES,
      CASES,
      SCENES,
      HINTS,
    ]);
    // The cast, the cases and the scenes hold keys, never words: LMIS is on the card alone,
    // and Harmonic is a word in three pages of talk (vision.md §10).
    expect(world.toLowerCase().includes('lmis')).toBe(false);
    expect(world.toLowerCase().includes('harmonic')).toBe(false);
  });
});
