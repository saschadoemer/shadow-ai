import { describe, expect, it } from 'vitest';
import { followPlayer } from '../../src/game/camera';
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
  stepDark,
  WAKE_POINT,
  WAKE_STEP,
  wakePoint,
} from '../../src/game/overview';
import {
  type CreatureState,
  type Facing,
  type GameState,
  NO_RECOIL,
  type PlayerState,
} from '../../src/game/state';
import { grassMap } from './grass-map';

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

describe('wakePoint', () => {
  const spawn = { x: 160, y: 100 };

  it("is the map's point named wake", () => {
    expect(WAKE_POINT).toBe('wake');
    const map = grassMap(20, 12, spawn, [
      { name: 'snippet', x: 30, y: 30 },
      { name: 'wake', x: 80, y: 60 },
    ]);
    expect(wakePoint(map)).toStrictEqual({ x: 80, y: 60 });
  });

  it('is the spawn on a map without one', () => {
    expect(wakePoint(grassMap(20, 12, spawn))).toStrictEqual(spawn);
  });

  it('rejects a second one', () => {
    const map = grassMap(20, 12, spawn, [
      { name: 'wake', x: 80, y: 60 },
      { name: 'wake', x: 90, y: 60 },
    ]);
    expect(() => wakePoint(map)).toThrow('more than one point object "wake"');
  });
});

describe('stepDark', () => {
  /** 40x30 tiles, 640x480 px, with the wake point at (80, 60). */
  const MAP = grassMap(40, 30, { x: 320, y: 240 }, [{ name: 'wake', x: 80, y: 60 }]);
  const FALLEN: GameState = {
    tick: 500,
    player: figure(300, 200, 'left', { frame: 2, frameTimer: 3.5 }),
    camera: { x: 140, y: 106 },
    lamp: { on: true },
    creatures: [snippet(310, 200)],
    captured: { snippet: 2 },
    overview: { current: 0, max: 3 },
    dark: 1,
  };
  const darkSteps = (steps: number): GameState => {
    let state = FALLEN;
    for (let i = 0; i < steps; i += 1) {
      state = stepDark(state, MAP);
    }
    return state;
  };

  it('for 43 steps only dark and tick grow, and the lamp is off', () => {
    expect(darkSteps(43)).toStrictEqual({ ...FALLEN, tick: 543, lamp: { on: false }, dark: 44 });
  });

  it('the 44th step, dark 45, sets the world right', () => {
    const woken = darkSteps(44);
    const player = figure(80, 60, 'down');
    expect(woken).toStrictEqual({
      tick: 544,
      player,
      camera: followPlayer(player, MAP),
      lamp: { on: false },
      creatures: [{ ...snippet(40, 40), home: { x: 40, y: 40 } }],
      captured: { snippet: 2 },
      overview: { current: 3, max: 3 },
      dark: 45,
    });
    expect(woken.camera).toStrictEqual({ x: 0, y: 0 });
  });

  it('a frozen creature comes home free', () => {
    const state = stepDark({ ...FALLEN, creatures: [snippet(310, 200, 30)], dark: 44 }, MAP);
    expect(state.creatures).toStrictEqual([snippet(40, 40)]);
  });

  it('after 88 steps dark is 89, and the 89th ends it', () => {
    expect(darkSteps(88).dark).toBe(89);
    const ended = darkSteps(89);
    expect(ended.dark).toBe(0);
    expect(ended.tick).toBe(589);
    expect(ended.player).toStrictEqual(figure(80, 60, 'down'));
  });
});
