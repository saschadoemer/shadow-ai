import { describe, expect, it } from 'vitest';
import type { NamedRect } from '../../src/engine/tiled';
import { REGION_PREFIX, rectsOf, TRACE_PREFIX, WALL_PREFIX } from '../../src/game/rects';
import { type Area, areasOf, veilOf } from '../../src/game/region';
import { wallsOf } from '../../src/game/shadow';
import { tracesOf } from '../../src/game/trace';
import { createInitialState } from '../../src/game/update';
import { grassMap } from './grass-map';

const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});
/** The cells (2, 2) to (9, 9), density 2, and (12, 2) to (17, 9), density 0. */
const HR = rect('region:hr', 32, 32, 128, 128);
const RECEPTION = rect('region:reception', 192, 32, 96, 128);

describe('the areas among the rectangles of a map (0023)', () => {
  it('are known by the prefix of the name', () => {
    expect(REGION_PREFIX).toBe('region:');
    const rects = [HR, rect('trace:sales', 160, 80, 16, 16), rect('shadow:hr', 32, 32, 48, 4)];
    expect(rectsOf(rects, REGION_PREFIX)).toStrictEqual([HR]);
    expect(rectsOf(rects, TRACE_PREFIX)).toHaveLength(1);
    expect(rectsOf(rects, WALL_PREFIX)).toHaveLength(1);
  });

  it('are skipped by the walls and the traces, and skip them', () => {
    const rects = [HR, rect('trace:sales', 160, 80, 16, 16), rect('shadow:hr', 32, 32, 48, 4)];
    expect(wallsOf(rects)).toHaveLength(1);
    expect(tracesOf(rects)).toHaveLength(1);
    expect(areasOf(rects)).toHaveLength(1);
  });

  it('do not excuse a rectangle of no known kind', () => {
    expect(() => areasOf([HR, rect('door:hr', 0, 0, 16, 16)])).toThrow(
      'unknown rectangle object "door:hr"',
    );
  });
});

describe('the areas of a map (0023)', () => {
  it('reads them in file order, each with its region, its density and its box', () => {
    expect(areasOf([RECEPTION, HR])).toStrictEqual([
      { region: 'reception', density: 0, box: { x: 192, y: 32, width: 96, height: 128 } },
      { region: 'hr', density: 2, box: { x: 32, y: 32, width: 128, height: 128 } },
    ]);
    expect(areasOf([])).toStrictEqual([]);
  });

  it('gives a region with two areas both of them', () => {
    const rooms = [
      rect('region:meeting-rooms', 0, 0, 32, 32),
      rect('region:meeting-rooms', 0, 32, 32, 48),
    ];
    expect(areasOf(rooms).map((area) => [area.region, area.density, area.box.y])).toStrictEqual([
      ['meeting-rooms', 1, 0],
      ['meeting-rooms', 1, 32],
    ]);
  });

  it('refuses a region the world data does not know', () => {
    expect(() => areasOf([rect('region:cellar', 32, 32, 128, 128)])).toThrow(
      'region region:cellar names no region',
    );
  });

  it.each([
    [1264, 418, 448, 416],
    [1270, 416, 448, 416],
    [1264, 416, 440, 416],
    [1264, 416, 448, 4],
  ])('refuses the box (%d, %d, %d, %d): it is not whole cells', (x, y, width, height) => {
    expect(() => areasOf([rect('region:sales', x, y, width, height)])).toThrow(
      `region region:sales (${x}, ${y}, ${width}, ${height}) is not whole cells`,
    );
  });

  it('refuses such a map before the game starts', () => {
    const map = grassMap(20, 12, { x: 40, y: 40 }, [], [rect('region:cellar', 32, 32, 128, 128)]);
    expect(() => createInitialState(map)).toThrow('region region:cellar names no region');
  });

  it('starts a map with areas like one without: the state has nothing of them', () => {
    const plain = grassMap(20, 12, { x: 40, y: 40 });
    const shadowed = grassMap(20, 12, { x: 40, y: 40 }, [], [HR, RECEPTION]);
    expect(createInitialState(shadowed)).toStrictEqual(createInitialState(plain));
  });
});

describe('the veil of a cell (0023)', () => {
  const areas = areasOf([HR, RECEPTION]);

  it("is the density of the area's region, on every cell of the area", () => {
    expect(veilOf(areas, 2, 2)).toBe(2);
    expect(veilOf(areas, 5, 5)).toBe(2);
    expect(veilOf(areas, 9, 9)).toBe(2);
    expect(veilOf(areas, 9, 2)).toBe(2);
    expect(veilOf(areas, 2, 9)).toBe(2);
  });

  it('is 0 beyond the last column and the last row, and before the first', () => {
    expect(veilOf(areas, 10, 5)).toBe(0);
    expect(veilOf(areas, 5, 10)).toBe(0);
    expect(veilOf(areas, 1, 5)).toBe(0);
    expect(veilOf(areas, 5, 1)).toBe(0);
  });

  it('is 0 in an area of a region without shadow, and where no area is', () => {
    expect(veilOf(areas, 12, 2)).toBe(0);
    expect(veilOf(areas, 17, 9)).toBe(0);
    expect(veilOf(areas, 19, 11)).toBe(0);
    expect(veilOf([], 5, 5)).toBe(0);
  });

  it('is the larger density where two areas overlap, in either order', () => {
    const thin: Area = { region: 'sales', density: 1, box: { x: 0, y: 0, width: 64, height: 64 } };
    const dense: Area = {
      region: 'development',
      density: 3,
      box: { x: 32, y: 32, width: 64, height: 64 },
    };
    for (const both of [
      [thin, dense],
      [dense, thin],
    ]) {
      expect(veilOf(both, 1, 1)).toBe(1);
      expect(veilOf(both, 2, 2)).toBe(3);
      expect(veilOf(both, 3, 3)).toBe(3);
      expect(veilOf(both, 4, 4)).toBe(3);
      expect(veilOf(both, 6, 6)).toBe(0);
    }
  });
});
