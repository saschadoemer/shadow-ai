import { describe, expect, it } from 'vitest';
import {
  CASE_NOTICE_STEPS,
  NOTICE_CASE_SOLVED,
  NOTICE_LAMP,
  NOTICE_REST,
  NOTICE_SHADOW_TOO_DENSE,
  NOTICE_TRACE_FOUND,
  NOTICE_UPGRADE,
  noticeOf,
  REST_NOTICE_STEPS,
  UPGRADE_NOTICE_STEPS,
} from '../../src/game/notice';
import type { GameInput } from '../../src/game/player';
import { type GameState, REST_RESULTS, type ShadowWallState } from '../../src/game/state';
import { createInitialState, newGame, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE: GameInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  lamp: false,
  talk: false,
  journal: false,
  help: false,
};
const SHINE: GameInput = { ...NONE, lamp: true };
const HOLDS: ShadowWallState = { wall: 0, lit: true, light: 0 };
const BASE = createInitialState(grassMap(20, 12, { x: 152, y: 96 }));
const withWalls = (lampOn: boolean, ...shadowWalls: ShadowWallState[]): GameState => ({
  ...BASE,
  lamp: { on: lampOn, strength: 1, used: true },
  shadowWalls,
});

describe('noticeOf (0016)', () => {
  it('is the sentence of the dense shadow while the lamp is on a wall that holds', () => {
    expect(NOTICE_SHADOW_TOO_DENSE).toBe(textKey('notice.shadow-too-dense'));
    expect(noticeOf(withWalls(true, HOLDS))).toBe(NOTICE_SHADOW_TOO_DENSE);
  });

  it('is the same with a second wall that does not hold', () => {
    expect(
      noticeOf(withWalls(true, { wall: 0, lit: false, light: 0 }, { ...HOLDS, wall: 1 })),
    ).toBe(NOTICE_SHADOW_TOO_DENSE);
    expect(
      noticeOf(withWalls(true, { wall: 0, lit: true, light: 12 }, { ...HOLDS, wall: 1 })),
    ).toBe(NOTICE_SHADOW_TOO_DENSE);
  });

  it('is nothing with the lamp off', () => {
    expect(noticeOf(withWalls(false, HOLDS))).toBeNull();
  });

  it('is nothing for a wall that gives way, at any count', () => {
    for (const light of [1, 30, 59]) {
      expect(noticeOf(withWalls(true, { wall: 0, lit: true, light }))).toBeNull();
    }
  });

  it('is nothing when no wall is in the light, and when no wall stands', () => {
    expect(noticeOf(withWalls(true, { wall: 0, lit: false, light: 0 }))).toBeNull();
    expect(noticeOf(withWalls(true))).toBeNull();
    expect(noticeOf(BASE)).toBeNull();
  });
});

describe('the notice in play (0016)', () => {
  /** The figure stands flush above a wall at (128, 96, 48, 4) and faces down. */
  const mapWith = (name: string) =>
    grassMap(20, 12, { x: 152, y: 96 }, [], [{ name, x: 128, y: 96, width: 48, height: 4 }]);

  it('appears with the first step of light on a dense wall and is gone with the first step without', () => {
    const map = mapWith('shadow:hr');
    const start = createInitialState(map);
    expect(noticeOf(start)).toBeNull();
    const lit = update(start, SHINE, map);
    expect(noticeOf(lit)).toBe(NOTICE_SHADOW_TOO_DENSE);
    expect(noticeOf(update(lit, NONE, map))).toBeNull();
  });

  it('is gone when the figure turns away with the lamp still on', () => {
    const map = mapWith('shadow:hr');
    const lit = update(createInitialState(map), SHINE, map);
    const turned = update(lit, { ...SHINE, up: true }, map);
    expect(turned.lamp.on).toBe(true);
    expect(noticeOf(turned)).toBeNull();
  });

  it('never appears while a thin wall gives way', () => {
    const map = mapWith('shadow:marketing');
    let state = createInitialState(map);
    for (let step = 0; step < 60; step += 1) {
      state = update(state, SHINE, map);
      expect(noticeOf(state), `step ${step + 1}`).toBeNull();
    }
    expect(state.shadowWalls).toStrictEqual([]);
  });

  it('is gone in the dark: the lamp is off from its first step', () => {
    const map = mapWith('shadow:hr');
    const lit = update(createInitialState(map), SHINE, map);
    const dark = update({ ...lit, dark: 1 }, SHINE, map);
    expect(dark.shadowWalls).toStrictEqual([HOLDS]);
    expect(noticeOf(dark)).toBeNull();
  });
});

describe("the line that names the lamp's key (0026)", () => {
  const TALK: GameInput = { ...NONE, talk: true };
  /** The officer 24 px right of the spawn. */
  const map = grassMap(20, 12, { x: 136, y: 96 }, [{ name: 'figure:officer', x: 160, y: 96 }]);
  const run = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
    inputs.reduce((state, input) => update(state, input, map), start);
  // Past the card (0036): the first press turns the page of the call.
  const called = run({ ...newGame(map), presented: 0 }, TALK, NONE, TALK, NONE, TALK);

  it('is the key `notice.lamp`', () => {
    expect(NOTICE_LAMP).toBe(textKey('notice.lamp'));
  });

  it('is the notice of a new game from its first step, for as long as the lamp is not held (0039)', () => {
    expect(noticeOf(newGame(map))).toBe(NOTICE_LAMP);
    expect(called.lamp).toStrictEqual({ on: false, strength: 1, used: false });
    let state = called;
    for (let step = 0; step < 600; step += 1) {
      expect(noticeOf(state), `step ${step}`).toBe(NOTICE_LAMP);
      state = update(state, { ...NONE, right: step % 2 === 0 }, map);
    }
    // A talk with the officer does not take it away.
    const talked = run(called, NONE, TALK, NONE, TALK, NONE, TALK, NONE, TALK);
    expect(talked.dialogue).toBeNull();
    expect(noticeOf(talked)).toBe(NOTICE_LAMP);
  });

  it('is gone with the first step in which the lamp is on, and does not come back', () => {
    const lit = run(called, NONE, SHINE);
    expect(noticeOf(lit)).toBeNull();
    let state = lit;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, NONE, map);
      expect(noticeOf(state)).toBeNull();
    }
  });

  it('is never shown in a game past its opening', () => {
    expect(noticeOf(createInitialState(map))).toBeNull();
    expect(noticeOf(BASE)).toBeNull();
  });

  it('has the last place: a wall that holds, a solved case and a found trace come first', () => {
    const waiting: GameState = {
      ...BASE,
      tick: 1000,
      lamp: { on: false, strength: 1, used: false },
    };
    expect(noticeOf(waiting)).toBe(NOTICE_LAMP);
    expect(noticeOf({ ...waiting, traces: [{ trace: 0, light: 0, found: 950 }] })).toBe(
      NOTICE_TRACE_FOUND,
    );
    expect(noticeOf({ ...waiting, solved: [{ region: 'sales', at: 950 }] })).toBe(
      NOTICE_CASE_SOLVED,
    );
    expect(
      noticeOf({
        ...waiting,
        lamp: { ...waiting.lamp, on: true },
        shadowWalls: [HOLDS],
      }),
    ).toBe(NOTICE_SHADOW_TOO_DENSE);
    // Once their time is over the lamp's line is back: it has none of its own.
    expect(noticeOf({ ...waiting, traces: [{ trace: 0, light: 0, found: 100 }] })).toBe(
      NOTICE_LAMP,
    );
  });
});

describe('the notice of a rest (0027)', () => {
  /** A game at step 1000, a rest taken `elapsed` steps ago with `result`. */
  const rested = (result: (typeof REST_RESULTS)[number], elapsed: number): GameState => ({
    ...BASE,
    tick: 1000,
    rested: { at: 1000 - elapsed, result },
  });

  it('has a line for each result, and two seconds', () => {
    expect(NOTICE_REST).toStrictEqual({
      restored: textKey('notice.rest'),
      full: textKey('notice.rest-full'),
      shadow: textKey('notice.rest-shadow'),
    });
    expect(Object.keys(NOTICE_REST)).toStrictEqual([...REST_RESULTS]);
    expect(REST_NOTICE_STEPS).toBe(120);
  });

  it.each(REST_RESULTS)(
    'shows the line of `%s` for 120 steps from the press, and none after',
    (result) => {
      expect(noticeOf(rested(result, 0))).toBe(NOTICE_REST[result]);
      expect(noticeOf(rested(result, 119))).toBe(NOTICE_REST[result]);
      expect(noticeOf(rested(result, 120))).toBeNull();
      expect(noticeOf(rested(result, 5000))).toBeNull();
    },
  );

  it('shows none while no rest was taken', () => {
    expect(noticeOf({ ...BASE, tick: 1000, rested: null })).toBeNull();
  });

  it('comes after a wall that holds, a solved case and a found trace', () => {
    const coffee = rested('restored', 10);
    expect(
      noticeOf({
        ...coffee,
        lamp: { on: true, strength: 1, used: true },
        shadowWalls: [HOLDS],
      }),
    ).toBe(NOTICE_SHADOW_TOO_DENSE);
    expect(noticeOf({ ...coffee, solved: [{ region: 'sales', at: 950 }] })).toBe(
      NOTICE_CASE_SOLVED,
    );
    expect(noticeOf({ ...coffee, traces: [{ trace: 0, light: 0, found: 950 }] })).toBe(
      NOTICE_TRACE_FOUND,
    );
    // Once theirs are over, the coffee's is still due.
    expect(noticeOf({ ...coffee, traces: [{ trace: 0, light: 0, found: 100 }] })).toBe(
      NOTICE_REST.restored,
    );
  });

  it("comes before the line that names the lamp's key, which is back when it is over", () => {
    const waiting = { on: false, strength: 1, used: false };
    expect(noticeOf({ ...rested('full', 10), lamp: waiting })).toBe(NOTICE_REST.full);
    expect(noticeOf({ ...rested('full', 120), lamp: waiting })).toBe(NOTICE_LAMP);
  });

  it('follows the game: a press at a coffee machine, and 120 steps later it is gone', () => {
    const TALK: GameInput = { ...NONE, talk: true };
    /** The player 24 px below a machine on cell (10, 5). */
    const map = grassMap(
      20,
      12,
      { x: 168, y: 112 },
      [],
      [{ name: 'rest:coffee', x: 160, y: 80, width: 16, height: 16 }],
    );
    let state = update(createInitialState(map), TALK, map);
    expect(noticeOf(state)).toBe(NOTICE_REST.full);
    for (let step = 0; step < 119; step += 1) {
      state = update(state, NONE, map);
      expect(noticeOf(state), `step ${step}`).toBe(NOTICE_REST.full);
    }
    expect(noticeOf(update(state, NONE, map))).toBeNull();
  });
});

describe('the notice of an upgrade (0029)', () => {
  const WIDER = textKey('notice.upgrade-wide-cone');
  /** Marketing was solved at step 1000 and earned the wider cone; `since` steps have passed. */
  const earned = (since: number): GameState => ({
    ...BASE,
    tick: 1000 + since,
    solved: [{ region: 'marketing', at: 1000 }],
    upgrades: ['wide-cone'],
    lamp: { ...BASE.lamp, strength: 2 },
  });

  it('is the line of the wider cone, for two seconds', () => {
    expect(NOTICE_UPGRADE['wide-cone']).toBe(WIDER);
    expect([CASE_NOTICE_STEPS, UPGRADE_NOTICE_STEPS]).toStrictEqual([120, 120]);
  });

  it('follows the notice of the solved case: the case for 120 steps, the upgrade for the next 120', () => {
    expect(noticeOf(earned(0))).toBe(NOTICE_CASE_SOLVED);
    expect(noticeOf(earned(119))).toBe(NOTICE_CASE_SOLVED);
    expect(noticeOf(earned(120))).toBe(WIDER);
    expect(noticeOf(earned(239))).toBe(WIDER);
    expect(noticeOf(earned(240))).toBeNull();
    expect(noticeOf(earned(6000))).toBeNull();
  });

  it('is not shown after Sales is solved: that case earns nothing', () => {
    for (const since of [0, 119, 120, 239, 240]) {
      const sales: GameState = { ...earned(since), solved: [{ region: 'sales', at: 1000 }] };
      expect(noticeOf(sales), `${since}`).toBe(since < 120 ? NOTICE_CASE_SOLVED : null);
    }
  });

  it('is not shown for a solved case whose upgrade the player does not have', () => {
    expect(noticeOf({ ...earned(150), upgrades: [] })).toBeNull();
    expect(noticeOf({ ...earned(150), upgrades: ['filter'] })).toBeNull();
  });

  it('counts from the case that earned it, with Sales solved before or after', () => {
    const before: GameState = {
      ...earned(150),
      solved: [
        { region: 'sales', at: 400 },
        { region: 'marketing', at: 1000 },
      ],
    };
    expect(noticeOf(before)).toBe(WIDER);
    // Sales solved 30 steps ago: its notice comes first, the upgrade's when it is over.
    const after: GameState = {
      ...earned(150),
      solved: [
        { region: 'marketing', at: 1000 },
        { region: 'sales', at: 1120 },
      ],
    };
    expect(noticeOf(after)).toBe(NOTICE_CASE_SOLVED);
    expect(noticeOf({ ...after, tick: 1239 })).toBe(NOTICE_CASE_SOLVED);
  });

  it('comes after a wall that holds and before a found trace, a rest and the lamp key', () => {
    const holds: GameState = {
      ...earned(150),
      lamp: { on: true, strength: 2, used: true },
      shadowWalls: [HOLDS],
    };
    expect(noticeOf(holds)).toBe(NOTICE_SHADOW_TOO_DENSE);
    const found: GameState = {
      ...earned(150),
      traces: [{ trace: 0, light: 0, found: 1140 }],
      rested: { at: 1140, result: 'restored' },
      lamp: { on: false, strength: 2, used: false },
    };
    expect(noticeOf(found)).toBe(WIDER);
    expect(noticeOf({ ...found, tick: 1240 })).toBe(NOTICE_TRACE_FOUND);
  });

  it('is what a game shows that solves Marketing: the case, then the upgrade, then nothing', () => {
    const map = grassMap(
      20,
      12,
      { x: 104, y: 144 },
      [
        { name: 'person:marketing:1', x: 64, y: 144, pause: 600 },
        { name: 'person:marketing:2', x: 128, y: 144 },
      ],
      [{ name: 'trace:marketing', x: 240, y: 128, width: 16, height: 16 }],
    );
    const TALK: GameInput = { ...NONE, talk: true };
    const start = createInitialState(map);
    let state: GameState = {
      ...start,
      tick: 1000,
      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
    };
    for (const input of [TALK, NONE, TALK, NONE, TALK]) {
      state = update(state, input, map);
    }
    expect(state.solved).toStrictEqual([{ region: 'marketing', at: 1005 }]);
    const shown: (string | null)[] = [];
    for (let step = 0; step < 242; step += 1) {
      shown.push(noticeOf(state));
      state = update(state, NONE, map);
    }
    expect(shown.slice(0, 120).every((key) => key === NOTICE_CASE_SOLVED)).toBe(true);
    expect(shown.slice(120, 240).every((key) => key === WIDER)).toBe(true);
    expect(shown.slice(240)).toStrictEqual([null, null]);
  });
});

describe('the notice of the filter (0040)', () => {
  const FILTER = textKey('notice.upgrade-filter');
  /** HR was solved at step 1000 with the wider cone and earned the filter; `since` steps have passed. */
  const earned = (since: number): GameState => ({
    ...BASE,
    tick: 1000 + since,
    solved: [
      { region: 'marketing', at: 400 },
      { region: 'hr', at: 1000 },
    ],
    upgrades: ['wide-cone', 'filter'],
    lamp: { ...BASE.lamp, strength: 3 },
  });

  it('is the line of the filter, for two seconds', () => {
    expect(NOTICE_UPGRADE.filter).toBe(FILTER);
  });

  it('follows the notice of the solved case: the case for 120 steps, the filter for the next 120', () => {
    expect(noticeOf(earned(0))).toBe(NOTICE_CASE_SOLVED);
    expect(noticeOf(earned(119))).toBe(NOTICE_CASE_SOLVED);
    expect(noticeOf(earned(120))).toBe(FILTER);
    expect(noticeOf(earned(239))).toBe(FILTER);
    expect(noticeOf(earned(240))).toBeNull();
    expect(noticeOf(earned(6000))).toBeNull();
  });

  it('is what a game shows that solves HR with the wider cone: the case, then the filter, then nothing', () => {
    const map = grassMap(
      20,
      12,
      { x: 104, y: 144 },
      [
        { name: 'person:hr:1', x: 64, y: 144, pause: 600 },
        { name: 'person:hr:2', x: 128, y: 144 },
      ],
      [{ name: 'trace:hr', x: 240, y: 128, width: 16, height: 16 }],
    );
    const TALK: GameInput = { ...NONE, talk: true };
    const start = createInitialState(map);
    let state: GameState = {
      ...start,
      tick: 1000,
      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
      solved: [{ region: 'marketing', at: 400 }],
      upgrades: ['wide-cone'],
      lamp: { ...start.lamp, strength: 2 },
    };
    for (const input of [TALK, NONE, TALK, NONE, TALK]) {
      state = update(state, input, map);
    }
    expect(state.solved.at(-1)).toStrictEqual({ region: 'hr', at: 1005 });
    expect(state.upgrades).toStrictEqual(['wide-cone', 'filter']);
    expect(state.lamp.strength).toBe(3);
    const shown: (string | null)[] = [];
    for (let step = 0; step < 242; step += 1) {
      shown.push(noticeOf(state));
      state = update(state, NONE, map);
    }
    expect(shown.slice(0, 120).every((key) => key === NOTICE_CASE_SOLVED)).toBe(true);
    expect(shown.slice(120, 240).every((key) => key === FILTER)).toBe(true);
    expect(shown.slice(240)).toStrictEqual([null, null]);
  });
});
