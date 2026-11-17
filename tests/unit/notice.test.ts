import { describe, expect, it } from 'vitest';
import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
import type { GameInput } from '../../src/game/player';
import type { GameState, ShadowWallState } from '../../src/game/state';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE: GameInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  lamp: false,
  talk: false,
};
const SHINE: GameInput = { ...NONE, lamp: true };
const HOLDS: ShadowWallState = { wall: 0, lit: true, light: 0 };
const BASE = createInitialState(grassMap(20, 12, { x: 152, y: 96 }));
const withWalls = (lampOn: boolean, ...shadowWalls: ShadowWallState[]): GameState => ({
  ...BASE,
  lamp: { on: lampOn, strength: 1 },
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
