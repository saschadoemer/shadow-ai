import { describe, expect, it } from 'vitest';
import type { TileMap } from '../../src/engine/tiled';
import {
  type GameInput,
  type MovementInput,
  movementVector,
  stepPlayer,
} from '../../src/game/player';
import { type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';
import { createInitialState } from '../../src/game/update';
import { grassMap } from './grass-map';
import { CORRIDOR, pictureMap } from './picture-map';
import { solidsWith } from './solids';

/** 20x12 tiles, 320x192 px, like the test map; the player starts mid-map. */
const MAP = grassMap(20, 12, { x: 160, y: 96 });
const NONE: GameInput = { up: false, down: false, left: false, right: false, lamp: false };

function press(...actions: readonly (keyof MovementInput)[]): GameInput {
  return {
    up: actions.includes('up'),
    down: actions.includes('down'),
    left: actions.includes('left'),
    right: actions.includes('right'),
    lamp: false,
  };
}

/** The movement actions with Space held: the lamp on. */
function shining(...actions: readonly (keyof MovementInput)[]): GameInput {
  return { ...press(...actions), lamp: true };
}

function standing(x: number, y: number, facing: Facing = 'down'): PlayerState {
  return { x, y, facing, frame: 0, frameTimer: 0, grace: 0, recoil: NO_RECOIL };
}

function walk(
  player: PlayerState,
  input: GameInput,
  steps: number,
  map: TileMap = MAP,
): PlayerState {
  let current = player;
  for (let i = 0; i < steps; i += 1) {
    current = stepPlayer(current, input, map);
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

describe('stepPlayer: the walk cycle at 8 frames per second', () => {
  const at = (steps: number): [number, number] => {
    const walked = walk(standing(160, 96), press('right'), steps);
    return [walked.frame, walked.frameTimer];
  };

  it('shows phase 1 with timer 0 on the step that starts moving', () => {
    expect(at(1)).toStrictEqual([1, 0]);
  });

  it('advances the phase after 8, then 7 steps, exactly, and cycles 1–4', () => {
    expect(at(8)).toStrictEqual([1, 7]);
    expect(at(9)).toStrictEqual([2, 0.5]);
    expect(at(15)).toStrictEqual([2, 6.5]);
    expect(at(16)).toStrictEqual([3, 0]);
    expect(at(23)).toStrictEqual([3, 7]);
    expect(at(24)).toStrictEqual([4, 0.5]);
    expect(at(30)).toStrictEqual([4, 6.5]);
    expect(at(31)).toStrictEqual([1, 0]);
    // 60 steps after the origin are 8 phases of 7.5: the cycle is back where it started.
    expect(at(61)).toStrictEqual([1, 0]);
  });

  it('keeps the timer a multiple of 0.5 over a long walk: the arithmetic is exact', () => {
    let player = standing(160, 96);
    for (let step = 1; step <= 600; step += 1) {
      player = stepPlayer(player, press('down', 'left'), MAP);
      expect(Number.isInteger(player.frameTimer * 2), `step ${step}`).toBe(true);
      expect(player.frame, `step ${step}`).toBeGreaterThanOrEqual(1);
      expect(player.frame, `step ${step}`).toBeLessThanOrEqual(4);
    }
  });

  it('resets to the standing frame and timer 0 when the figure stops', () => {
    const walking = walk(standing(160, 96), press('right'), 5);
    expect([walking.frame, walking.frameTimer]).toStrictEqual([1, 4]);
    const stopped = stepPlayer(walking, NONE, MAP);
    expect([stopped.frame, stopped.frameTimer]).toStrictEqual([0, 0]);
  });

  it('resets when opposite actions cancel', () => {
    const walking = walk(standing(160, 96), press('right'), 5);
    const cancelled = stepPlayer(walking, press('left', 'right'), MAP);
    expect([cancelled.frame, cancelled.frameTimer]).toStrictEqual([0, 0]);
  });

  it('keeps stepping in place when the clamp holds the figure', () => {
    const held = walk(standing(8, 96), press('left'), 9);
    expect([held.x, held.facing, held.frame, held.frameTimer]).toStrictEqual([8, 'left', 2, 0.5]);
  });
});

describe('stepPlayer: holding the lamp (0007)', () => {
  it('does not move on an axis, on a diagonal or with all four held', () => {
    for (const input of [
      shining('right'),
      shining('up', 'left'),
      shining('up', 'down', 'left', 'right'),
    ]) {
      const held = stepPlayer(standing(160, 96), input, MAP);
      expect([held.x, held.y]).toStrictEqual([160, 96]);
    }
  });

  it('turns in place by the walking rule: horizontal wins, vertical alone, cancelling keeps', () => {
    expect(stepPlayer(standing(160, 96), shining('right'), MAP).facing).toBe('right');
    expect(stepPlayer(standing(160, 96), shining('up', 'left'), MAP).facing).toBe('left');
    expect(stepPlayer(standing(160, 96), shining('up'), MAP).facing).toBe('up');
    expect(stepPlayer(standing(160, 96, 'right'), shining('left', 'right'), MAP).facing).toBe(
      'right',
    );
    expect(stepPlayer(standing(160, 96, 'up'), shining(), MAP).facing).toBe('up');
  });

  it('shows the standing frame at once, at the position reached: phase 3, timer 4 becomes 0, 0', () => {
    const walking = walk(standing(160, 96), press('right'), 20);
    expect([walking.frame, walking.frameTimer]).toStrictEqual([3, 4]);
    const stopped = stepPlayer(walking, shining('right'), MAP);
    expect([stopped.frame, stopped.frameTimer, stopped.facing]).toStrictEqual([0, 0, 'right']);
    expect(stopped.x).toBeCloseTo(186.6667, 3);
    expect(stopped.y).toBe(96);
  });

  it('walks from standing on the step after the release: phase 1, timer 0, 1.333 px', () => {
    const stopped = stepPlayer(walk(standing(160, 96), press('right'), 20), shining('right'), MAP);
    const resumed = stepPlayer(stopped, press('right'), MAP);
    expect([resumed.frame, resumed.frameTimer]).toStrictEqual([1, 0]);
    expect(resumed.x).toBeCloseTo(188, 6);
  });

  it('leaves its input unchanged', () => {
    const input = shining('right');
    stepPlayer(standing(160, 96), input, MAP);
    expect(input).toStrictEqual(shining('right'));
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
      grace: 0,
      recoil: NO_RECOIL,
    });
  });
});

describe('stepPlayer: solid tiles stop the figure (0005)', () => {
  /**
   * The corridor picture in pixels: the wall in column 10 spans x [160, 176), so a figure flush
   * against it from the left has its feet at x = 154; the lone tile at (4, 3) spans
   * [64, 80) × [48, 64); the gap in row 6 spans y [96, 112).
   */
  const WALLS = pictureMap(CORRIDOR, { x: 40, y: 56 });

  it("stops flush against a wall from the left: feet x at the wall's left edge − 6", () => {
    expect(walk(standing(152, 72), press('right'), 2, WALLS).x).toBe(154);
  });

  it('keeps stepping in place and facing its input while held by a wall', () => {
    const held = walk(standing(152, 72), press('right'), 10, WALLS);
    expect([held.x, held.y, held.facing, held.frame, held.frameTimer]).toStrictEqual([
      154,
      72,
      'right',
      2,
      1.5,
    ]);
  });

  it('stops flush against a tile from below (feet at its bottom edge + 8) and from above (feet at its top edge)', () => {
    expect(walk(standing(72, 74), press('up'), 2, WALLS).y).toBe(72);
    expect(walk(standing(72, 46), press('down'), 2, WALLS).y).toBe(48);
  });

  it('slides along a wall at the component speed, facing the input', () => {
    const slid = stepPlayer(standing(154, 72), press('up', 'right'), WALLS);
    expect(slid.x).toBe(154);
    expect(slid.y).toBeCloseTo(71.057, 3);
    expect(slid.facing).toBe('right');
  });

  it('passes a corner without a snag: held on x until the box clears the wall, then diagonal', () => {
    const held = walk(standing(154, 150), press('down', 'right'), 20, WALLS);
    expect(held.x).toBe(154);
    expect(held.y).toBeCloseTo(168.856, 2);
    const past = walk(standing(154, 150), press('down', 'right'), 30, WALLS);
    expect(past.x).toBeCloseTo(163.428, 2);
    expect(past.y).toBeCloseTo(178.284, 2);
  });

  it('walks through a one-tile gap, and is stopped when the box also covers the row above it', () => {
    expect(walk(standing(140, 108), press('right'), 30, WALLS).x).toBeCloseTo(180, 6);
    expect(walk(standing(140, 100), press('right'), 30, WALLS).x).toBe(154);
  });

  it("slides along a wall into the gap and along the gap's ceiling through it", () => {
    const atWall = walk(standing(154, 120), press('up', 'right'), 9, WALLS);
    expect(atWall.x).toBe(154);
    expect(atWall.y).toBeCloseTo(111.515, 2);
    const inGap = walk(standing(154, 120), press('up', 'right'), 38, WALLS);
    expect(inGap.y).toBe(104);
    expect(inGap.x).toBeCloseTo(181.341, 2);
    const through = walk(standing(154, 120), press('up', 'right'), 40, WALLS);
    expect(through.x).toBeCloseTo(183.227, 2);
    expect(through.y).toBeCloseTo(102.114, 2);
  });

  it('never moves x backwards while sliding into the gap', () => {
    let current = standing(154, 120);
    for (let step = 1; step <= 40; step += 1) {
      const next = stepPlayer(current, press('up', 'right'), WALLS);
      expect(next.x, `step ${step}`).toBeGreaterThanOrEqual(current.x);
      current = next;
    }
  });

  it('still clamps the feet at the map edge on open ground', () => {
    expect(walk(standing(8.5, 96), press('left'), 1, WALLS).x).toBe(8);
    expect(walk(standing(160, 191.5), press('down'), 1, WALLS).y).toBe(192);
  });
});

describe('grace and the push (0009)', () => {
  const figureWith = (fields: Partial<PlayerState>): PlayerState => ({
    ...standing(160, 96, 'right'),
    ...fields,
  });

  it('grace drops by one per step, walking, standing or shining, and stops at 0', () => {
    expect(stepPlayer(figureWith({ grace: 2 }), NONE, MAP).grace).toBe(1);
    expect(stepPlayer(figureWith({ grace: 2 }), press('left'), MAP).grace).toBe(1);
    expect(stepPlayer(figureWith({ grace: 2 }), shining(), MAP).grace).toBe(1);
    expect(stepPlayer(figureWith({ grace: 0 }), NONE, MAP).grace).toBe(0);
  });

  it('a push moves the figure by (dx, dy) and ignores the keys', () => {
    const next = stepPlayer(
      figureWith({ grace: 90, recoil: { dx: 3, dy: 0, steps: 8 } }),
      shining('left'),
      MAP,
    );
    expect(next).toStrictEqual({
      x: 163,
      y: 96,
      facing: 'right',
      frame: 0,
      frameTimer: 0,
      grace: 89,
      recoil: { dx: 3, dy: 0, steps: 7 },
    });
  });

  it('eight steps of 3 px are 24 px, then the push is over and the keys work again', () => {
    const pushed = walk(figureWith({ recoil: { dx: 3, dy: 0, steps: 8 } }), press('left'), 8);
    expect(pushed.x).toBe(184);
    expect(pushed.facing).toBe('right');
    expect(pushed.recoil).toStrictEqual({ dx: 0, dy: 0, steps: 0 });
    const after = stepPlayer(pushed, press('left'), MAP);
    expect(after.x).toBeCloseTo(182.6667, 3);
    expect(after.facing).toBe('left');
  });

  it('a diagonal push ends with no push left', () => {
    const next = stepPlayer(figureWith({ recoil: { dx: 1.8, dy: 2.4, steps: 1 } }), NONE, MAP);
    expect(next.x).toBeCloseTo(161.8, 6);
    expect(next.y).toBeCloseTo(98.4, 6);
    expect(next.recoil).toStrictEqual({ dx: 0, dy: 0, steps: 0 });
  });

  it('a push resets the walk cycle to standing', () => {
    const next = stepPlayer(
      figureWith({ frame: 3, frameTimer: 2.5, recoil: { dx: 3, dy: 0, steps: 2 } }),
      press('right'),
      MAP,
    );
    expect([next.frame, next.frameTimer]).toStrictEqual([0, 0]);
  });

  it('a wall holds the push: a solid cell 10 px behind the box stops it flush', () => {
    // Column 7 is [112, 128). The box of feet (96, 100) is [90, 102) × [92, 100): rows 5 and 6.
    const rows = Array.from({ length: 12 }, (_, row) =>
      row === 5 || row === 6 ? '.......#............' : '....................',
    );
    const walled = pictureMap(rows, { x: 96, y: 100 });
    const pushed = walk(
      { ...standing(96, 100, 'left'), recoil: { dx: 3, dy: 0, steps: 8 } },
      NONE,
      8,
      walled,
    );
    expect(pushed.x).toBe(106); // the box's right edge at 112
    expect(pushed.y).toBe(100);
  });

  it('a wall strip holds the push: a left strip 10 px right of the box stops it flush (0010)', () => {
    // The box of feet (144, 92) is [138, 150) × [84, 92); the strip [160, 164) × [80, 96).
    const strip = {
      ...MAP,
      solids: solidsWith(20, 12, [
        { column: 10, row: 5, box: { x: 160, y: 80, width: 4, height: 16 } },
      ]),
    };
    const pushed = walk(
      { ...standing(144, 92, 'left'), recoil: { dx: 3, dy: 0, steps: 8 } },
      NONE,
      8,
      strip,
    );
    expect([pushed.x, pushed.y]).toStrictEqual([154, 92]);
  });

  it("the map's edge holds the push: the clamp keeps x at 8", () => {
    const pushed = walk(
      { ...standing(10, 96, 'right'), recoil: { dx: -3, dy: 0, steps: 8 } },
      NONE,
      8,
    );
    expect(pushed.x).toBe(8);
  });
});
