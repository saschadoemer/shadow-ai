import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import {
  REGION_PREFIX,
  REST_PREFIX,
  rectsOf,
  TRACE_PREFIX,
  WALL_PREFIX,
} from '../../src/game/rects';
import { areasOf } from '../../src/game/region';
import {
  REST_DISTANCE,
  type Rest,
  restCentre,
  restInReach,
  restsOf,
  restUnderShadow,
} from '../../src/game/rest';
import { wallsOf } from '../../src/game/shadow';
import { tracesOf } from '../../src/game/trace';
import { createInitialState } from '../../src/game/update';
import { grassMap } from './grass-map';

const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});
/** A coffee machine on cell (10, 5): its centre is (168, 88). */
const COFFEE = rect('rest:coffee', 160, 80);
/** A second one on cell (4, 5), centre (72, 88), in a room of HR: the cells (2, 3) to (6, 7). */
const SHADOWED = rect('rest:coffee', 64, 80);
const HR = rect('region:hr', 32, 48, 80, 80);
/** 20x12 cells of open floor with the player at (x, y). */
const mapAt = (
  x: number,
  y: number,
  rects: readonly NamedRect[] = [COFFEE],
  points: readonly NamedPoint[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);

describe('the rests among the rectangles of a map (0027)', () => {
  const rects = [
    rect('shadow:hr', 32, 48, 16, 4),
    rect('trace:sales', 160, 112),
    HR,
    COFFEE,
    SHADOWED,
  ];

  it('are known by the prefix of the name: the fourth kind of rectangle', () => {
    expect(REST_PREFIX).toBe('rest:');
    expect(rectsOf(rects, REST_PREFIX)).toStrictEqual([COFFEE, SHADOWED]);
  });

  it('are read in file order, each with what it is and its cell', () => {
    expect(restsOf(rects)).toStrictEqual([
      { what: 'coffee', box: { x: 160, y: 80, width: 16, height: 16 } },
      { what: 'coffee', box: { x: 64, y: 80, width: 16, height: 16 } },
    ]);
    expect(restsOf([rect('rest:sofa', 0, 0)])).toStrictEqual([
      { what: 'sofa', box: { x: 0, y: 0, width: 16, height: 16 } },
    ]);
  });

  it('are skipped by the walls, the traces and the areas, and skip them', () => {
    expect(wallsOf(rects)).toHaveLength(1);
    expect(tracesOf(rects)).toHaveLength(1);
    expect(areasOf(rects)).toHaveLength(1);
    expect(rectsOf(rects, WALL_PREFIX)).toHaveLength(1);
    expect(rectsOf(rects, TRACE_PREFIX)).toHaveLength(1);
    expect(rectsOf(rects, REGION_PREFIX)).toHaveLength(1);
  });

  it('are none on a map without them', () => {
    expect(restsOf([])).toStrictEqual([]);
    expect(restsOf([HR, rect('trace:sales', 160, 112)])).toStrictEqual([]);
  });

  it('do not excuse a rectangle of no known kind', () => {
    expect(() => restsOf([COFFEE, rect('door:hr', 0, 0)])).toThrow(
      'unknown rectangle object "door:hr"',
    );
  });

  it.each([
    [568, 418, 16, 16],
    [570, 416, 16, 16],
    [560, 416, 32, 16],
    [560, 416, 16, 4],
  ])('refuses the box (%d, %d, %d, %d): it is not one cell', (x, y, width, height) => {
    expect(() => restsOf([rect('rest:coffee', x, y, width, height)])).toThrow(
      `rest rest:coffee (${x}, ${y}, ${width}, ${height}) is not one cell`,
    );
  });

  it('refuses such a map before the game starts', () => {
    const map = mapAt(40, 40, [rect('rest:coffee', 568, 418)]);
    expect(() => createInitialState(map)).toThrow(
      'rest rest:coffee (568, 418, 16, 16) is not one cell',
    );
  });

  it('starts a map with rests like one without: the state has nothing of them', () => {
    expect(createInitialState(mapAt(40, 40))).toStrictEqual(createInitialState(mapAt(40, 40, [])));
  });
});

describe('a rest in reach (0027)', () => {
  const map = mapAt(40, 40);
  const [coffee] = restsOf(map.rects) as [Rest];
  const reached = (x: number, y: number, on: TileMap = map): boolean =>
    restInReach({ x, y }, restsOf(on.rects), on) !== null;
  /** The map with a wall strip on the upper edge of the rest's cell, as on the floor. */
  const walled: TileMap = {
    ...map,
    opaque: map.opaque.map((boxes, cell) => {
      const strip: Box = { x: 160, y: 80, width: 16, height: 4 };
      return cell === 5 * map.width + 10 ? [strip] : boxes;
    }),
  };

  it('is two tiles: from the feet to the centre of the cell', () => {
    expect(REST_DISTANCE).toBe(32);
    expect(restCentre(coffee)).toStrictEqual({ x: 168, y: 88 });
  });

  it.each([
    ['below', 168, 120, 168, 120.1],
    ['above', 168, 56, 168, 55.9],
    ['left', 136, 88, 135.9, 88],
    ['right', 200, 88, 200.1, 88],
  ])('is in reach at 32 px from %s and not at 32.1 px', (_side, x, y, farX, farY) => {
    expect(reached(x, y)).toBe(true);
    expect(reached(farX, farY)).toBe(false);
  });

  it('is in reach on a diagonal inside the circle and not outside it', () => {
    expect(reached(168 + 20, 88 + 24)).toBe(true);
    expect(reached(168 + 24, 88 + 24)).toBe(false);
  });

  it('is in reach standing on its cell', () => {
    expect(reached(168, 96)).toBe(true);
    expect(restInReach({ x: 168, y: 96 }, restsOf(map.rects), map)).toStrictEqual(coffee);
  });

  it('is not in reach at 8 px with an opaque box on the line: from behind the wall', () => {
    expect(reached(168, 80)).toBe(true);
    expect(reached(168, 80, walled)).toBe(false);
    // From the room's side the same wall is not on the line.
    expect(reached(168, 104, walled)).toBe(true);
  });

  it('is not stopped by a box that is solid and not opaque: a counter', () => {
    const counter: TileMap = {
      ...map,
      solids: map.solids.map((boxes, cell) =>
        cell === 5 * map.width + 10 ? [{ x: 160, y: 80, width: 16, height: 16 }] : boxes,
      ),
    };
    expect(reached(168, 104, counter)).toBe(true);
  });

  it('is none on a map without rests', () => {
    const bare = mapAt(40, 40, []);
    expect(restInReach({ x: 168, y: 96 }, restsOf(bare.rects), bare)).toBeNull();
  });

  it('is the nearer of two in reach, and the first in the file of two equally near', () => {
    const left = rect('rest:coffee', 144, 80);
    const right = rect('rest:tea', 176, 80);
    const both = mapAt(40, 40, [left, right]);
    const at = (x: number, order: readonly NamedRect[] = [left, right]): string | undefined =>
      restInReach({ x, y: 104 }, restsOf(order), both)?.what;
    expect(at(160)).toBe('coffee');
    expect(at(176)).toBe('tea');
    // (168, 104) is as far from the centre (152, 88) as from (184, 88).
    expect(at(168)).toBe('coffee');
    expect(at(168, [right, left])).toBe('tea');
  });
});

describe('a rest under shadow (0027)', () => {
  const rects = [COFFEE, SHADOWED, HR];
  const [open, shadowed] = restsOf(rects) as [Rest, Rest];

  it('is one whose cell lies in an area of a region with shadow', () => {
    expect(restUnderShadow(open, rects, [])).toBe(false);
    expect(restUnderShadow(shadowed, rects, [])).toBe(true);
  });

  it('is not under shadow in a region without shadow, or on a map without areas', () => {
    const reception = [SHADOWED, rect('region:reception', 32, 48, 80, 80)];
    expect(restUnderShadow(shadowed, reception, [])).toBe(false);
    expect(restUnderShadow(shadowed, [SHADOWED], [])).toBe(false);
  });

  it('is not under shadow once the region is cleared, from the step that solved its case', () => {
    expect(restUnderShadow(shadowed, rects, [{ region: 'hr', at: 500 }])).toBe(false);
    expect(restUnderShadow(shadowed, rects, [{ region: 'sales', at: 500 }])).toBe(true);
  });
});
