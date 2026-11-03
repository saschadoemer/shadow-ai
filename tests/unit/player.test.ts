import { describe, expect, it } from 'vitest';
import { type MovementInput, movementVector, stepPlayer } from '../../src/game/player';
import { createInitialState, type Facing, type PlayerState } from '../../src/game/state';
import { grassMap } from './grass-map';

/** 20x12 tiles, 320x192 px, like the test map; the player starts mid-map. */
const MAP = grassMap(20, 12, { x: 160, y: 96 });
const NONE: MovementInput = { up: false, down: false, left: false, right: false };

function press(...actions: readonly (keyof MovementInput)[]): MovementInput {
  return {
    up: actions.includes('up'),
    down: actions.includes('down'),
    left: actions.includes('left'),
    right: actions.includes('right'),
  };
}

function standing(x: number, y: number, facing: Facing = 'down'): PlayerState {
  return { x, y, facing, frame: 0, frameTimer: 0 };
}

function walk(player: PlayerState, input: MovementInput, steps: number): PlayerState {
  let current = player;
  for (let i = 0; i < steps; i += 1) {
    current = stepPlayer(current, input, MAP);
  }
  return current;
}

describe('movementVector', () => {
  it('is zero for no input, for opposite actions and for all four', () => {
    for (const input of [
      NONE,
      press('left', 'right'),
      press('up', 'down'),
      press('up', 'down', 'left', 'right'),
    ]) {
      expect(movementVector(input)).toStrictEqual({ x: 0, y: 0 });
    }
  });

  it('has length 1 on an axis and on a diagonal', () => {
    expect(movementVector(press('right'))).toStrictEqual({ x: 1, y: 0 });
    expect(movementVector(press('up'))).toStrictEqual({ x: 0, y: -1 });
    const diagonal = movementVector(press('down', 'right'));
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 4);
    expect(diagonal.y).toBeCloseTo(Math.SQRT1_2, 4);
  });
});

describe('stepPlayer: movement at 80 px/s', () => {
  it('moves 1.333 px per step on an axis', () => {
    const moved = stepPlayer(standing(160, 96), press('right'), MAP);
    expect(moved.x).toBeCloseTo(161.3333, 3);
    expect(moved.y).toBe(96);
  });

  it('moves 0.943 px on each axis per diagonal step, so diagonal speed equals axis speed', () => {
    const moved = stepPlayer(standing(160, 96), press('up', 'left'), MAP);
    expect(moved.x).toBeCloseTo(159.0572, 3);
    expect(moved.y).toBeCloseTo(95.0572, 3);
  });

  it('crosses the 304 px from the left edge to the right edge in 228 steps: 3.8 s', () => {
    expect(walk(standing(8, 96), press('right'), 227).x).toBeLessThan(312);
    expect(walk(standing(8, 96), press('right'), 228).x).toBeCloseTo(312, 6);
  });

  it('does not move when opposite actions cancel or all four are held', () => {
    for (const input of [
      press('left', 'right'),
      press('up', 'down'),
      press('up', 'down', 'left', 'right'),
    ]) {
      const moved = stepPlayer(standing(160, 96), input, MAP);
      expect([moved.x, moved.y]).toStrictEqual([160, 96]);
    }
  });

  it('leaves its input unchanged', () => {
    const player = standing(160, 96);
    stepPlayer(player, press('right'), MAP);
    expect(player).toStrictEqual(standing(160, 96));
  });
});

describe('stepPlayer: facing', () => {
  it('follows the horizontal component on a diagonal', () => {
    expect(stepPlayer(standing(160, 96), press('down', 'right'), MAP).facing).toBe('right');
    expect(stepPlayer(standing(160, 96), press('up', 'left'), MAP).facing).toBe('left');
  });

  it('faces up or down on vertical movement alone', () => {
    expect(stepPlayer(standing(160, 96), press('up'), MAP).facing).toBe('up');
    expect(stepPlayer(standing(160, 96, 'left'), press('down'), MAP).facing).toBe('down');
  });

  it('keeps the last facing when standing still and when opposite actions cancel', () => {
    const faced = walk(standing(160, 96), press('right'), 3);
    expect(stepPlayer(faced, NONE, MAP).facing).toBe('right');
    expect(stepPlayer(faced, press('left', 'right'), MAP).facing).toBe('right');
    expect(stepPlayer(standing(160, 96, 'up'), NONE, MAP).facing).toBe('up');
  });
});

describe('stepPlayer: the clamp keeps the whole sprite inside the map', () => {
  it('keeps the feet x within [8, mapWidth − 8]', () => {
    expect(stepPlayer(standing(8.5, 96), press('left'), MAP).x).toBe(8);
    expect(stepPlayer(standing(311.5, 96), press('right'), MAP).x).toBe(312);
  });

  it('keeps the feet y within [24, mapHeight]', () => {
    expect(stepPlayer(standing(160, 24.5), press('up'), MAP).y).toBe(24);
    expect(stepPlayer(standing(160, 191.5), press('down'), MAP).y).toBe(192);
  });

  it('holds the figure at a corner on a diagonal', () => {
    const cornered = walk(standing(10, 26), press('up', 'left'), 5);
    expect([cornered.x, cornered.y]).toStrictEqual([8, 24]);
  });

  it('leaves a figure held by the clamp facing its actions', () => {
    const held = walk(standing(8, 96), press('left'), 3);
    expect([held.x, held.facing]).toStrictEqual([8, 'left']);
  });
});

describe('createInitialState', () => {
  it("puts the player at the map's spawn, facing down, standing", () => {
    expect(createInitialState(grassMap(20, 12, { x: 40, y: 56 })).player).toStrictEqual({
      x: 40,
      y: 56,
      facing: 'down',
      frame: 0,
      frameTimer: 0,
    });
  });
});
