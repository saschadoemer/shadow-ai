import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { figuresIn, figuresOf } from '../../src/game/cast';
import { routesOf } from '../../src/game/mover';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { Dialogue, GameState } from '../../src/game/state';
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
/** The new game with the call read to its end: five steps, three presses. */
const called = (map: TileMap): GameState => run(map, newGame(map), TALK, NONE, TALK, NONE, TALK);
/** The pages of the state's open dialogue, as `update` and the scene look them up. */
const spoken = (map: TileMap, state: GameState) =>
  state.dialogue === null
    ? null
    : pagesOf(
        state.dialogue,
        speakersOf(figuresOf(map.points), state.movers, routesOf(map.points)),
      );

describe('the two starts (0026)', () => {
  it('starts a played game with the call open and without the lamp', () => {
    expect(newGame(MAP)).toStrictEqual({
      ...createInitialState(MAP),
      lamp: { on: false, strength: 1, owned: false, used: false },
      dialogue: { speaker: 'story', index: 0, page: 0 },
    });
  });

  it('keeps the initial state a game past its opening: the lamp owned and used, no dialogue', () => {
    const state = createInitialState(MAP);
    expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
    expect(state.dialogue).toBeNull();
  });

  it('survives a JSON round trip: at the start, on page 2 of the call, after the first meeting (INV-1)', () => {
    const start = newGame(MAP);
    const second = run(MAP, start, TALK, NONE, TALK);
    const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 2 });
    expect(met.lamp.owned).toBe(true);
    for (const state of [start, second, met, createInitialState(MAP)]) {
      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    }
  });
});

describe('the call (0026)', () => {
  it('shows its pages one by one and closes with the third press', () => {
    const start = newGame(MAP);
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
    const start = newGame(MAP);
    const later = steps(MAP, start, OTHERS, 600);
    expect(later).toStrictEqual({ ...start, tick: 600, held: OTHERS });
  });

  it('turns nobody: the figure, the colleague and the player look where they looked', () => {
    const start = newGame(MAP);
    const closed = called(MAP);
    expect(closed.dialogue).toBeNull();
    expect(closed.figures).toStrictEqual(start.figures);
    expect(closed.movers).toStrictEqual(start.movers);
    expect(closed.player).toStrictEqual(start.player);
  });

  it('is not the dialogue of the figure or the colleague in reach', () => {
    const second = run(MAP, newGame(MAP), TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'story', index: 0, page: 1 });
    expect(spoken(MAP, second)).toStrictEqual(CALL);
  });

  it('changes nothing but tick, held and dialogue, also in the step that closes it (0031)', () => {
    const start = newGame(MAP);
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
  it('has no field `started`: not at either start, not after the call, the meeting and the wake', () => {
    const closed = called(MAP);
    const met = run(MAP, closed, NONE, TALK, NONE, TALK, NONE, TALK);
    expect(met.lamp.owned).toBe(true);
    const woken = update({ ...met, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    for (const state of [
      createInitialState(MAP),
      newGame(MAP),
      closed,
      steps(MAP, closed, RIGHT, 600),
      met,
      woken,
    ]) {
      expect(Object.keys(state)).not.toContain('started');
    }
  });
});

describe('without the lamp (0026)', () => {
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

  it('has the map for it: with the lamp owned the same keys light all three', () => {
    const owned = steps(LIT, createInitialState(LIT), SHINE, 10);
    expect(owned.lamp.on).toBe(true);
    expect(owned.shadowWalls[0]?.lit).toBe(true);
    expect(owned.traces[0]?.light).toBe(10);
    expect(owned.creatures[0]?.light).toBe(10);
  });

  it('leaves the lamp off for 600 steps with the key held, and lights nothing', () => {
    let state = start;
    for (let i = 0; i < 600; i += 1) {
      state = update(state, SHINE, LIT);
      expect(state.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
      expect(state.creatures.every((creature) => creature.light === 0)).toBe(true);
      expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
      expect(state.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    }
    expect(state.captured).toStrictEqual({ snippet: 0, mirage: 0 });
  });

  it('counts the key as not held: the world steps as without it, step for step', () => {
    let held = start;
    let free = start;
    for (let i = 0; i < 600; i += 1) {
      held = update(held, SHINE, LIT);
      free = update(free, NONE, LIT);
      expect({ ...held, held: NONE }).toStrictEqual(free);
    }
  });

  it('lets the figure walk with the key held, as without it', () => {
    const both: GameInput = { ...RIGHT, lamp: true };
    let held = start;
    let free = start;
    for (let i = 0; i < 60; i += 1) {
      held = update(held, both, LIT);
      free = update(free, RIGHT, LIT);
      expect(held.player).toStrictEqual(free.player);
    }
    expect(held.player.x).toBeGreaterThan(104 + 50);
  });

  it('holds the figure in place with the lamp owned, as 0007 says', () => {
    const both: GameInput = { ...RIGHT, lamp: true };
    const owned = steps(LIT, createInitialState(LIT), both, 60);
    expect(owned.player.x).toBe(104);
    expect(owned.lamp.on).toBe(true);
  });

  it('is hit as always, and wakes without the lamp', () => {
    const hit = steps(LIT, start, NONE, 120);
    expect(hit.overview.current).toBeLessThan(5);
    const woken = update({ ...start, dark: 44 }, SHINE, LIT);
    expect(woken.dark).toBe(45);
    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
  });
});

describe('the first meeting (0026)', () => {
  const start = called(MAP);
  const TALK_SHINE: GameInput = { ...TALK, lamp: true };

  it('opens with the key of the lamp held while the player has none', () => {
    const opened = run(MAP, start, NONE, TALK_SHINE);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(opened.lamp.on).toBe(false);
  });

  it('does not open with the lamp held once the lamp is owned, as in 0017', () => {
    const held = run(MAP, createInitialState(MAP), TALK_SHINE);
    expect(held.dialogue).toBeNull();
    expect(held.lamp.on).toBe(true);
  });

  it('has her first page and the page that hands the lamp over', () => {
    const opened = run(MAP, start, NONE, TALK);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    const figures = figuresIn(figuresOf(MAP.points), opened.lamp.owned);
    expect(pagesOf(opened.dialogue as Dialogue, speakersOf(figures, [], []))).toStrictEqual([
      textKey('talk.officer-rules-1'),
      textKey('talk.officer-meeting-2'),
    ]);
    const second = run(MAP, opened, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 1 });
    // A third press closes it: the meeting has two pages.
    expect(run(MAP, second, NONE, TALK).dialogue).toBeNull();
  });

  it('hands the lamp over in the step that closes it, and changes nothing else', () => {
    const second = run(MAP, start, NONE, TALK, NONE, TALK, NONE);
    expect(second.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
    const closed = update(second, TALK, MAP);
    expect(closed).toStrictEqual({
      ...second,
      tick: second.tick + 1,
      held: TALK,
      dialogue: null,
      lamp: { on: false, strength: 1, owned: true, used: false },
    });
  });

  it('gives no lamp while the dialogue is open, on either page', () => {
    for (const inputs of [
      [NONE, TALK],
      [NONE, TALK, NONE, TALK],
      [NONE, TALK, NONE, TALK, NONE],
    ]) {
      expect(run(MAP, start, ...inputs).lamp.owned).toBe(false);
    }
  });

  it('gives none for the saying of a colleague', () => {
    // 32 px below the colleague and 24 px left of the officer: the officer is nearer. Away from her:
    const near: GameState = { ...start, player: { ...start.player, x: 136, y: 72 } };
    const opened = run(MAP, near, NONE, TALK);
    expect(opened.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
    const closed = run(MAP, opened, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.lamp).toStrictEqual({ on: false, strength: 1, owned: false, used: false });
  });

  it('says the two pages of 0017 once the lamp is owned, and closing them changes neither field', () => {
    const met = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK);
    const again = run(MAP, met, NONE, TALK);
    expect(again.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    const closed = run(MAP, again, NONE, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
    const past = run(MAP, createInitialState(MAP), TALK, NONE, TALK, NONE, TALK);
    expect(past.dialogue).toBeNull();
    expect(past.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
  });

  it('keeps both fields through the wake', () => {
    const met = run(MAP, start, NONE, TALK, NONE, TALK, NONE, TALK);
    const woken = update({ ...met, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
  });
});

describe('the lamp used for the first time (0026)', () => {
  const met = run(MAP, called(MAP), NONE, TALK, NONE, TALK, NONE, TALK);

  it('is not used by steps without the key', () => {
    expect(steps(MAP, met, RIGHT, 600).lamp.used).toBe(false);
  });

  it('is used from the first step in which the lamp is on, and stays so', () => {
    const first = run(MAP, met, NONE, SHINE);
    expect(first.lamp).toStrictEqual({ on: true, strength: 1, owned: true, used: true });
    const off = update(first, NONE, MAP);
    expect(off.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: true });
    expect(steps(MAP, off, NONE, 600).lamp.used).toBe(true);
    expect(update({ ...off, dark: 44 }, NONE, MAP).lamp.used).toBe(true);
  });

  it('is not used by a key held during a push: the lamp is off there', () => {
    const pushed: GameState = {
      ...met,
      player: { ...met.player, recoil: { dx: 3, dy: 0, steps: 8 } },
    };
    const during = update(pushed, SHINE, MAP);
    expect(during.lamp.on).toBe(false);
    expect(during.lamp.used).toBe(false);
  });
});
