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
  SPREAD,
  spreadOf,
  WIDE_CONE,
  WIDE_FRAME_APEX,
  WIDE_FRAME_SIZE,
  WIDE_SPREAD,
} from '../../src/game/lamp';
import { FACINGS, type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';
import { UPGRADES } from '../../src/game/world';

const APEX: Point = { x: 100, y: 100 };

/** The point `along` pixels from the apex in the facing's direction and `aside` pixels to its side. */
function at(facing: Facing, along: number, aside: number): Point {
  const d = DIRECTIONS[facing];
  return { x: APEX.x + d.x * along - d.y * aside, y: APEX.y + d.y * along + d.x * aside };
}

describe('lampCone', () => {
  it('puts the apex 12 px above the feet, in the facing', () => {
    const player: PlayerState = {
      x: 20.4,
      y: 30.6,
      facing: 'left',
      frame: 0,
      frameTimer: 0,
      grace: 0,
      recoil: NO_RECOIL,
    };
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

describe('the spread of the cone (0029)', () => {
  it('is one half without the wider cone and three quarters with it', () => {
    expect([SPREAD, WIDE_SPREAD]).toStrictEqual([0.5, 0.75]);
    expect(spreadOf([])).toBe(0.5);
    expect(spreadOf(['wide-cone'])).toBe(0.75);
    expect(spreadOf(['filter'])).toBe(0.5);
    expect(spreadOf(['filter', 'wide-cone'])).toBe(0.75);
  });

  it('follows from an upgrade the world data has', () => {
    expect(WIDE_CONE).toBe('wide-cone');
    expect(UPGRADES.map((upgrade) => upgrade.id)).toContain(WIDE_CONE);
  });
});

describe.each(FACINGS)('inCone with a spread, facing %s (0029)', (facing) => {
  const cone: Cone = { apex: APEX, facing };
  const inside = (along: number, aside: number, spread: number): boolean =>
    inCone(at(facing, along, aside), cone, spread);

  it('with one half: 40 px along, 20 px beside the axis is in and 20.5 px is not', () => {
    expect(inside(40, 20, SPREAD)).toBe(true);
    expect(inside(40, -20, SPREAD)).toBe(true);
    expect(inside(40, 20.5, SPREAD)).toBe(false);
    expect(inside(40, -20.5, SPREAD)).toBe(false);
  });

  it('with three quarters: 40 px along, 30 px beside the axis is in and 30.5 px is not', () => {
    expect(inside(40, 30, WIDE_SPREAD)).toBe(true);
    expect(inside(40, -30, WIDE_SPREAD)).toBe(true);
    expect(inside(40, 30.5, WIDE_SPREAD)).toBe(false);
    expect(inside(40, -30.5, WIDE_SPREAD)).toBe(false);
  });

  it('is 48 px long with either: 47.99 on the axis is in, 48 is out', () => {
    for (const spread of [SPREAD, WIDE_SPREAD]) {
      expect(inside(47.99, 0, spread)).toBe(true);
      expect(inside(48, 0, spread)).toBe(false);
      expect(inside(-0.01, 0, spread)).toBe(false);
    }
  });

  it('gives without a spread what it gives with one half', () => {
    for (let along = -4; along <= 52; along += 4) {
      for (let aside = -40; aside <= 40; aside += 0.5) {
        const point = at(facing, along, aside);
        expect(inCone(point, cone), `${along}, ${aside}`).toBe(inCone(point, cone, SPREAD));
      }
    }
  });
});

describe('the frames of the wider cone (0029)', () => {
  it('are 72 px wide: the width of the cone of three quarters at its end', () => {
    expect(WIDE_FRAME_SIZE).toBe(72);
    expect(WIDE_FRAME_SIZE).toBe(2 * CONE_LENGTH * WIDE_SPREAD);
  });

  it("puts each frame's apex at the middle of the edge the cone opens from", () => {
    expect(WIDE_FRAME_APEX).toStrictEqual({
      down: { x: 36, y: 0 },
      up: { x: 36, y: 71 },
      left: { x: 71, y: 36 },
      right: { x: 0, y: 36 },
    });
  });

  it('holds the whole cone in the frame, for every facing', () => {
    for (const facing of FACINGS) {
      const cone: Cone = { apex: WIDE_FRAME_APEX[facing], facing };
      // One pixel round the frame: none of it is in the cone.
      for (let k = -1; k <= WIDE_FRAME_SIZE; k += 1) {
        for (const point of [
          { x: k, y: -1 },
          { x: k, y: WIDE_FRAME_SIZE },
          { x: -1, y: k },
          { x: WIDE_FRAME_SIZE, y: k },
        ]) {
          expect(inCone(point, cone, WIDE_SPREAD), `${facing} (${point.x}, ${point.y})`).toBe(
            false,
          );
        }
      }
    }
  });
});
