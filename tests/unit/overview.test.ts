import { describe, expect, it } from 'vitest';
import {
  applyHit,
  DARK_STEPS,
  GRACE_STEPS,
  HIT_DISTANCE,
  hittingCreature,
  INITIAL_OVERVIEW,
  initialOverview,
  RECOIL_PX_PER_STEP,
  RECOIL_STEPS,
  recoilFrom,
  WAKE_STEP,
} from '../../src/game/overview';
import { type CreatureState, type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';

const figure = (
  x: number,
  y: number,
  facing: Facing = 'right',
  fields: Partial<PlayerState> = {},
): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
  ...fields,
});
const snippet = (x: number, y: number, light = 0): CreatureState => ({
  species: 'snippet',
  x,
  y,
  light,
  home: { x: 40, y: 40 },
});
const AT = figure(160, 100);

describe('the constants (0009)', () => {
  it('are the spec numbers', () => {
    expect([
      INITIAL_OVERVIEW,
      HIT_DISTANCE,
      GRACE_STEPS,
      RECOIL_STEPS,
      RECOIL_PX_PER_STEP,
      DARK_STEPS,
      WAKE_STEP,
    ]).toStrictEqual([3, 10, 90, 8, 3, 90, 45]);
    expect(initialOverview()).toStrictEqual({ current: 3, max: 3 });
  });
});

describe('hittingCreature', () => {
  it('is a free creature at most 10 px from the feet', () => {
    expect(hittingCreature([snippet(150, 100)], AT)).toStrictEqual(snippet(150, 100));
    expect(hittingCreature([snippet(154, 92)], AT)).toStrictEqual(snippet(154, 92)); // 6-8-10
    expect(hittingCreature([snippet(149.9, 100)], AT)).toBeNull();
    expect(hittingCreature([], AT)).toBeNull();
  });

  it('is never a frozen creature, however close', () => {
    expect(hittingCreature([snippet(155, 100, 1)], AT)).toBeNull();
    expect(hittingCreature([snippet(160, 100, 59)], AT)).toBeNull();
  });

  it('is the first in array order', () => {
    const creatures = [snippet(200, 100), snippet(170, 100), snippet(150, 100)];
    expect(hittingCreature(creatures, AT)).toStrictEqual(snippet(170, 100));
  });

  it('is nobody while the figure is safe', () => {
    expect(
      hittingCreature([snippet(150, 100)], figure(160, 100, 'right', { grace: 1 })),
    ).toBeNull();
  });
});

describe('recoilFrom', () => {
  it('pushes 3 px per step for 8 steps, straight away from the creature', () => {
    expect(recoilFrom(snippet(150, 100), AT)).toStrictEqual({ dx: 3, dy: 0, steps: 8 });
    expect(recoilFrom(snippet(160, 108), AT)).toStrictEqual({ dx: 0, dy: -3, steps: 8 });
  });

  it('follows the line between the feet: from (154.4, 92.533) it is (1.8, 2.4)', () => {
    const recoil = recoilFrom(snippet(154.4, 100 - 7.4667), AT);
    expect(recoil.dx).toBeCloseTo(1.8, 3);
    expect(recoil.dy).toBeCloseTo(2.4, 3);
    expect(recoil.steps).toBe(8);
  });

  it('on the same spot it is the opposite of the facing, without a negated zero', () => {
    expect(recoilFrom(snippet(160, 100), AT)).toStrictEqual({ dx: -3, dy: 0, steps: 8 });
    expect(recoilFrom(snippet(160, 100), figure(160, 100, 'up'))).toStrictEqual({
      dx: 0,
      dy: 3,
      steps: 8,
    });
  });
});

describe('applyHit', () => {
  it('takes one point, makes the figure safe for 90 steps and pushes it', () => {
    expect(applyHit(AT, { current: 3, max: 3 }, snippet(150, 100))).toStrictEqual({
      player: { ...AT, grace: 90, recoil: { dx: 3, dy: 0, steps: 8 } },
      overview: { current: 2, max: 3 },
      dark: 0,
    });
  });

  it('the last point starts the dark and leaves grace and the push as they are', () => {
    expect(applyHit(AT, { current: 1, max: 3 }, snippet(150, 100))).toStrictEqual({
      player: AT,
      overview: { current: 0, max: 3 },
      dark: 1,
    });
  });
});
