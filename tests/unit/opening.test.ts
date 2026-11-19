import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { figuresOf } from '../../src/game/cast';
import { routesOf } from '../../src/game/mover';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { GameState } from '../../src/game/state';
import { pagesOf, speakersOf } from '../../src/game/talk';
import { createInitialState, newGame, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
const SHINE: GameInput = { ...NONE, lamp: true };
const RIGHT: GameInput = { ...NONE, right: true };
/** Every key but `talk`. */
const OTHERS: GameInput = {
  up: true,
  down: false,
  left: true,
  right: false,
  lamp: true,
  talk: false,
  journal: true,
  help: false,
};
const CALL = [textKey('story.call-1'), textKey('story.call-2'), textKey('story.call-3')];
const OFFICER: NamedPoint = { name: 'figure:officer', x: 160, y: 96 };
/** The colleague of the reception, waiting ten seconds 32 px above the spawn. */
const COLLEAGUE: readonly NamedPoint[] = [
  { name: 'person:reception:1', x: 136, y: 64, pause: 600 },
  { name: 'person:reception:2', x: 64, y: 64 },
];
/** 20x12 cells of open floor: the spawn 24 px left of the officer and 32 px below the colleague. */
const MAP: TileMap = grassMap(20, 12, { x: 136, y: 96 }, [OFFICER, ...COLLEAGUE]);
const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, map), start);
const steps = (map: TileMap, start: GameState, input: GameInput, count: number): GameState => {
  let state = start;
  for (let i = 0; i < count; i += 1) {
    state = update(state, input, map);
  }
  return state;
};
/**
 * The new game past its card (0036): the call open on its first page, as a game began when
 * these tests were written. The card has its own tests.
 */
const opening = (map: TileMap): GameState => ({ ...newGame(map), presented: 0 });
/** The new game with the call read to its end: five steps, three presses. */
const called = (map: TileMap): GameState => run(map, opening(map), TALK, NONE, TALK, NONE, TALK);
/** The pages of the state's open dialogue, as `update` and the scene look them up. */
const spoken = (map: TileMap, state: GameState) =>
  state.dialogue === null
    ? null
    : pagesOf(
        state.dialogue,
        speakersOf(figuresOf(map.points), state.movers, routesOf(map.points)),
      );

describe('the two starts (0026)', () => {
  it('starts a played game with the card, the call open under it, and the lamp not yet used', () => {
    // The lamp is the player's from the first step (0039): the state has no field that says so.
    expect(Object.keys(newGame(MAP).lamp)).toStrictEqual(['on', 'strength', 'used']);
    expect(newGame(MAP)).toStrictEqual({
      ...createInitialState(MAP),
      lamp: { on: false, strength: 1, used: false },
      dialogue: { speaker: 'story', index: 0, page: 0 },
      presented: null,
    });
  });

  it('keeps the initial state a game past its opening: the lamp used, no dialogue', () => {
    const state = createInitialState(MAP);
    expect(state.lamp).toStrictEqual({ on: false, strength: 1, used: true });
    expect(state.dialogue).toBeNull();
  });

  it('survives a JSON round trip: at the start, on page 2 of the call, after the call (INV-1)', () => {
    const start = opening(MAP);
    const second = run(MAP, start, TALK, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 2 });
    for (const state of [start, second, called(MAP), createInitialState(MAP)]) {
      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    }
  });
});

describe('the call (0026)', () => {
  it('shows its pages one by one and closes with the third press', () => {
    const start = opening(MAP);
    expect(spoken(MAP, start)).toStrictEqual(CALL);
    const pages: (number | null)[] = [];
    let state = start;
    for (const input of [TALK, NONE, TALK, NONE, TALK]) {
      state = update(state, input, MAP);
      pages.push(state.dialogue?.page ?? null);
    }
    expect(pages).toStrictEqual([1, 1, 2, 2, null]);
  });

  it('stands still for 600 steps with every key but talk held: only the tick and the held keys change', () => {
    const start = opening(MAP);
    const later = steps(MAP, start, OTHERS, 600);
    expect(later).toStrictEqual({ ...start, tick: 600, held: OTHERS });
  });

  it('turns nobody: the figure, the colleague and the player look where they looked', () => {
    const start = opening(MAP);
    const closed = called(MAP);
    expect(closed.dialogue).toBeNull();
    expect(closed.figures).toStrictEqual(start.figures);
    expect(closed.movers).toStrictEqual(start.movers);
    expect(closed.player).toStrictEqual(start.player);
  });

  it('is not the dialogue of the figure or the colleague in reach', () => {
    const second = run(MAP, opening(MAP), TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 1 });
    expect(spoken(MAP, second)).toStrictEqual(CALL);
  });

  it('changes nothing but tick, held and dialogue, also in the step that closes it (0031)', () => {
    const start = opening(MAP);
    const closed = called(MAP);
    expect(closed).toStrictEqual({ ...start, tick: 5, held: TALK, dialogue: null });
  });

  it('lets the game run once it is closed', () => {
    const walked = steps(MAP, called(MAP), RIGHT, 10);
    expect(walked.player.x).toBeGreaterThan(136);
    expect(walked.dialogue).toBeNull();
  });
});

describe('no record of when the opening ended (0031)', () => {
  it('has no field `started`: not at either start, not after the call, a talk and the wake', () => {
    const closed = called(MAP);
    // The officer's three pages, read to the end.
    const talked = run(MAP, closed, NONE, TALK, NONE, TALK, NONE, TALK, NONE, TALK);
    expect(talked.dialogue).toBeNull();
    const woken = update({ ...talked, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    for (const state of [
      createInitialState(MAP),
      opening(MAP),
      closed,
      steps(MAP, closed, RIGHT, 600),
      talked,
      woken,
    ]) {
      expect(Object.keys(state)).not.toContain('started');
    }
  });
});

describe('the lamp from the first step (0039)', () => {
  const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
    name,
    x,
    y,
    width,
    height,
  });
  /**
   * 20x12 cells of open floor: the figure at (104, 100) looks down at a snippet 40 px below it,
   * with a shadow wall of Sales right of the snippet's way and a trace of Sales left of it,
   * both in the cone.
   */
  const LIT: TileMap = grassMap(
    20,
    12,
    { x: 104, y: 100 },
    [{ name: 'snippet', x: 104, y: 140 }],
    [rect('shadow:sales', 112, 128, 16, 4), rect('trace:sales', 80, 128, 16, 16)],
  );
  const start = called(LIT);

  it('is on in the first step with the key held, right after the call, and was used from then', () => {
    expect(start.lamp).toStrictEqual({ on: false, strength: 1, used: false });
    const first = update(start, SHINE, LIT);
    expect(first.lamp).toStrictEqual({ on: true, strength: 1, used: true });
  });

  it('lights the snippet, the wall and the trace of a new game, as in a game past its opening', () => {
    for (const from of [start, createInitialState(LIT)]) {
      const lit = steps(LIT, from, SHINE, 10);
      expect(lit.lamp.on).toBe(true);
      expect(lit.shadowWalls[0]?.lit).toBe(true);
      expect(lit.traces[0]?.light).toBe(10);
      expect(lit.creatures[0]?.light).toBe(10);
    }
  });

  it('holds the figure in place with the key held, as 0007 says', () => {
    const both: GameInput = { ...RIGHT, lamp: true };
    const held = steps(LIT, start, both, 60);
    expect(held.player.x).toBe(104);
    expect(held.lamp.on).toBe(true);
  });

  it('does nothing while the card is shown and while the call is open: 600 steps with the key held', () => {
    // The card ends by itself in step 180; the call under it stays open without a press of talk.
    const waiting = steps(LIT, newGame(LIT), SHINE, 600);
    expect(waiting.presented).toBe(180);
    expect(waiting.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 0 });
    expect(waiting.lamp).toStrictEqual({ on: false, strength: 1, used: false });
    expect(waiting.creatures.every((creature) => creature.light === 0)).toBe(true);
    expect(waiting.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
  });

  it('is hit as always, and wakes with the lamp', () => {
    const hit = steps(LIT, start, NONE, 120);
    expect(hit.overview.current).toBeLessThan(5);
    const woken = update({ ...start, dark: 44 }, NONE, LIT);
    expect(woken.dark).toBe(45);
    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, used: false });
    expect(update(woken, SHINE, LIT).dark).toBe(46);
  });
});

describe('the data protection officer from the first talk (0039)', () => {
  const start = called(MAP);
  const TALK_SHINE: GameInput = { ...TALK, lamp: true };
  const HERS = [
    textKey('talk.officer-rules-1'),
    textKey('talk.officer-rules-2'),
    textKey('talk.officer-rules-3'),
  ];

  it('opens no talk with the key of the lamp held, in a new game as in a game past its opening', () => {
    for (const from of [update(start, NONE, MAP), createInitialState(MAP)]) {
      const held = update(from, TALK_SHINE, MAP);
      expect(held.dialogue).toBeNull();
      expect(held.lamp.on).toBe(true);
    }
  });

  it('says her own three pages in the first talk of a new game: there is no first meeting', () => {
    const opened = run(MAP, start, NONE, TALK);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(spoken(MAP, opened)).toStrictEqual(HERS);
    const third = run(MAP, opened, NONE, TALK, NONE, TALK);
    expect(third.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 2 });
    // A fourth press closes it.
    expect(run(MAP, third, NONE, TALK).dialogue).toBeNull();
  });

  it('changes nothing but tick, held and dialogue in the step that closes her talk', () => {
    const third = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK, NONE);
    expect(third.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 2 });
    const closed = update(third, TALK, MAP);
    expect(closed).toStrictEqual({
      ...third,
      tick: third.tick + 1,
      held: TALK,
      dialogue: null,
    });
    expect(closed.lamp).toStrictEqual(start.lamp);
  });

  it('says the same three pages in a game past its opening', () => {
    const opened = run(MAP, createInitialState(MAP), TALK);
    expect(spoken(MAP, opened)).toStrictEqual(HERS);
  });
});

describe('the lamp used for the first time (0026)', () => {
  const start = called(MAP);

  it('is not used by steps without the key', () => {
    expect(steps(MAP, start, RIGHT, 600).lamp.used).toBe(false);
  });

  it('is used from the first step in which the lamp is on, and stays so', () => {
    const first = run(MAP, start, NONE, SHINE);
    expect(first.lamp).toStrictEqual({ on: true, strength: 1, used: true });
    const off = update(first, NONE, MAP);
    expect(off.lamp).toStrictEqual({ on: false, strength: 1, used: true });
    expect(steps(MAP, off, NONE, 600).lamp.used).toBe(true);
    expect(update({ ...off, dark: 44 }, NONE, MAP).lamp.used).toBe(true);
  });

  it('is not used by a key held during a push: the lamp is off there', () => {
    const pushed: GameState = {
      ...start,
      player: { ...start.player, recoil: { dx: 3, dy: 0, steps: 8 } },
    };
    const during = update(pushed, SHINE, MAP);
    expect(during.lamp.on).toBe(false);
    expect(during.lamp.used).toBe(false);
  });
});

describe('card, call and the first light in a row (0039)', () => {
  it('goes from the card through the call to the lamp, with no talk in between', () => {
    let state = newGame(MAP);
    expect(state.presented).toBeNull();
    // The press that ends the card.
    state = update(state, TALK, MAP);
    expect(state.presented).toBe(1);
    expect(spoken(MAP, state)).toStrictEqual(CALL);
    expect(state.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 0 });
    // Three presses read the call.
    state = run(MAP, state, NONE, TALK, NONE, TALK, NONE, TALK);
    expect(state.dialogue).toBeNull();
    expect(state.lamp.used).toBe(false);
    // The lamp shines at the first held key: nobody had to hand it over.
    state = run(MAP, state, NONE, SHINE);
    expect(state.lamp.on).toBe(true);
    expect(state.lamp.used).toBe(true);
    // The same game as one that began past the card, two steps later.
    const lit = run(MAP, called(MAP), NONE, SHINE);
    expect(state).toStrictEqual({ ...lit, tick: lit.tick + 2, presented: 1 });
  });
});
