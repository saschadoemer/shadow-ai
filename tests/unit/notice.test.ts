import { describe, expect, it } from 'vitest';
import {
  NOTICE_CASE_SOLVED,
  NOTICE_LAMP,
  NOTICE_SHADOW_TOO_DENSE,
  NOTICE_TRACE_FOUND,
  noticeOf,
} from '../../src/game/notice';
import type { GameInput } from '../../src/game/player';
import type { GameState, ShadowWallState } from '../../src/game/state';
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
  lamp: { on: lampOn, strength: 1, owned: true, used: true },
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
  const called = run(newGame(map), TALK, NONE, TALK, NONE, TALK);
  const met = run(called, NONE, TALK, NONE, TALK, NONE, TALK);

  it('is the key `notice.lamp`', () => {
    expect(NOTICE_LAMP).toBe(textKey('notice.lamp'));
  });

  it('is not shown in a new game, under the call or after it, before the first meeting', () => {
    expect(noticeOf(newGame(map))).toBeNull();
    expect(noticeOf(called)).toBeNull();
    expect(noticeOf(run(called, NONE, TALK, NONE, TALK, NONE))).toBeNull();
  });

  it('is shown from the step that hands the lamp over, for as long as the lamp is not held', () => {
    expect(met.lamp).toStrictEqual({ on: false, strength: 1, owned: true, used: false });
    let state = met;
    for (let step = 0; step < 600; step += 1) {
      expect(noticeOf(state), `step ${step}`).toBe(NOTICE_LAMP);
      state = update(state, { ...NONE, right: step % 2 === 0 }, map);
    }
  });

  it('is gone with the first step in which the lamp is on, and does not come back', () => {
    const lit = run(met, NONE, SHINE);
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
      lamp: { on: false, strength: 1, owned: true, used: false },
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
