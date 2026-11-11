import { describe, expect, it } from 'vitest';
import type { Point } from '../../src/engine/tiled';
import {
  CONE_LENGTH,
  type Cone,
  DIRECTIONS,
  FRAME_APEX,
  inCone,
  LAMP_HEIGHT,
  lampCone,
} from '../../src/game/lamp';
import { FACINGS, type Facing, type PlayerState } from '../../src/game/state';

const APEX: Point = { x: 100, y: 100 };

/** The point `along` pixels from the apex in the facing's direction and `aside` pixels to its side. */
function at(facing: Facing, along: number, aside: number): Point {
  const d = DIRECTIONS[facing];
  return { x: APEX.x + d.x * along - d.y * aside, y: APEX.y + d.y * along + d.x * aside };
}

describe('lampCone', () => {
  it('puts the apex 12 px above the feet, in the facing', () => {
    const player: PlayerState = { x: 20.4, y: 30.6, facing: 'left', frame: 0, frameTimer: 0 };
    expect(lampCone(player)).toStrictEqual({ apex: { x: 20.4, y: 18.6 }, facing: 'left' });
    expect(LAMP_HEIGHT).toBe(12);
  });
});

describe.each(FACINGS)('inCone, facing %s', (facing) => {
  const cone: Cone = { apex: APEX, facing };
  const inside = (along: number, aside: number): boolean => inCone(at(facing, along, aside), cone);

  it('holds the apex', () => {
    expect(inCone(APEX, cone)).toBe(true);
  });

  it('is 48 px long, half-open: 47.99 on the axis is in, 48 is out', () => {
    expect(CONE_LENGTH).toBe(48);
    expect(inside(47.99, 0)).toBe(true);
    expect(inside(48, 0)).toBe(false);
  });

  it('opens with slope 1/2 to each side: at d = 40, s = ±20 is in and ±20.01 is out', () => {
    expect(inside(40, 20)).toBe(true);
    expect(inside(40, -20)).toBe(true);
    expect(inside(40, 20.01)).toBe(false);
    expect(inside(40, -20.01)).toBe(false);
  });

  it('is 10 px wide at d = 10: s = 5 is in, 5.5 is out', () => {
    expect(inside(10, 5)).toBe(true);
    expect(inside(10, 5.5)).toBe(false);
  });

  it('excludes what lies behind the apex and beside it', () => {
    expect(inside(-0.01, 0)).toBe(false);
    expect(inside(0, 0.5)).toBe(false);
  });
});

describe('the directions and the frame apexes', () => {
  it('has one unit vector per facing', () => {
    expect(DIRECTIONS).toStrictEqual({
      down: { x: 0, y: 1 },
      up: { x: 0, y: -1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    });
  });

  it("puts each frame's apex at the middle of the edge the cone opens from", () => {
    expect(FRAME_APEX).toStrictEqual({
      down: { x: 24, y: 0 },
      up: { x: 24, y: 47 },
      left: { x: 47, y: 24 },
      right: { x: 0, y: 24 },
    });
  });
});
