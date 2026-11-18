import { describe, expect, it } from 'vitest';
import type { NamedRect } from '../../src/engine/tiled';
import { REGION_PREFIX, rectsOf, TRACE_PREFIX, WALL_PREFIX } from '../../src/game/rects';
import {
  type Area,
  areasOf,
  CLEAR_PART_STEPS,
  CLEAR_STEPS,
  clearedAt,
  clearingVeil,
  inArea,
  shadowedAreas,
  shownVeil,
  THIN_VEIL,
  THINNEST_VEIL,
  veilOf,
} from '../../src/game/region';
import { wallsOf } from '../../src/game/shadow';
import type { SolvedCase } from '../../src/game/state';
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

describe('a point in an area (0025)', () => {
  const [hr] = areasOf([HR]) as [Area];

  it('lies in it inside the rectangle, the left and the upper edge included', () => {
    expect(inArea(hr, { x: 32, y: 32 })).toBe(true);
    expect(inArea(hr, { x: 100.5, y: 90 })).toBe(true);
    expect(inArea(hr, { x: 159.9, y: 159.9 })).toBe(true);
  });

  it('does not lie in it on the right or the lower edge, or outside', () => {
    expect(inArea(hr, { x: 160, y: 90 })).toBe(false);
    expect(inArea(hr, { x: 90, y: 160 })).toBe(false);
    expect(inArea(hr, { x: 31.9, y: 90 })).toBe(false);
    expect(inArea(hr, { x: 90, y: 31.9 })).toBe(false);
  });
});

describe('a cleared region (0025)', () => {
  /** Two rooms of density 1: the cells (2, 2) to (5, 5) and (10, 2) to (13, 5). */
  const areas = areasOf([
    rect('region:sales', 32, 32, 64, 64),
    rect('region:marketing', 160, 32, 64, 64),
  ]);
  const sales: SolvedCase = { region: 'sales', at: 500 };
  const marketing: SolvedCase = { region: 'marketing', at: 700 };
  const under = (solved: readonly SolvedCase[], column: number, row: number): boolean =>
    veilOf(shadowedAreas(areas, solved), column, row) > 0;

  it('is cleared exactly when its case is solved, since the step that solved it', () => {
    expect(clearedAt('sales', [])).toBeNull();
    expect(clearedAt('sales', [sales])).toBe(500);
    expect(clearedAt('marketing', [sales])).toBeNull();
    expect(clearedAt('marketing', [sales, marketing])).toBe(700);
  });

  it('is cleared from step 0 on: a case solved at tick 0 counts', () => {
    expect(clearedAt('sales', [{ region: 'sales', at: 0 }])).toBe(0);
  });

  it('is under shadow while its case is not solved, and not once it is', () => {
    expect([under([], 3, 3), under([], 11, 3)]).toStrictEqual([true, true]);
    expect([under([sales], 3, 3), under([sales], 11, 3)]).toStrictEqual([false, true]);
    expect([under([sales, marketing], 3, 3), under([sales, marketing], 11, 3)]).toStrictEqual([
      false,
      false,
    ]);
  });

  it('keeps the areas of the other regions as they are, in file order', () => {
    expect(shadowedAreas(areas, [])).toStrictEqual(areas);
    expect(shadowedAreas(areas, [sales])).toStrictEqual([areas[1]]);
    expect(shadowedAreas(areas, [marketing, sales])).toStrictEqual([]);
  });

  it('loses every area of a region with two', () => {
    const rooms = areasOf([
      rect('region:meeting-rooms', 0, 0, 32, 32),
      rect('region:sales', 32, 32, 64, 64),
      rect('region:meeting-rooms', 0, 32, 32, 48),
    ]);
    const left = shadowedAreas(rooms, [{ region: 'meeting-rooms', at: 9 }]);
    expect(left.map((area) => area.region)).toStrictEqual(['sales']);
  });
});

describe('the veil of a clearing (0025)', () => {
  it('lasts two seconds in three parts, and has two veils of its own after the three densities', () => {
    expect([CLEAR_STEPS, CLEAR_PART_STEPS, THIN_VEIL, THINNEST_VEIL]).toStrictEqual([
      120, 40, 4, 5,
    ]);
  });

  it.each([
    [0, 1],
    [39, 1],
    [40, 4],
    [79, 4],
    [80, 5],
    [119, 5],
    [120, 0],
    [5000, 0],
  ])('of density 1 is, %d steps after the clearing, the veil %d', (elapsed, veil) => {
    expect(clearingVeil(1, elapsed)).toBe(veil);
  });

  it.each([
    [0, 3],
    [39, 3],
    [40, 4],
    [79, 4],
    [80, 5],
    [119, 5],
    [120, 0],
  ])('of density 3 is, %d steps after the clearing, the veil %d', (elapsed, veil) => {
    expect(clearingVeil(3, elapsed)).toBe(veil);
  });

  it('is none at any time over a region without shadow', () => {
    expect([0, 39, 40, 80, 119, 120].map((elapsed) => clearingVeil(0, elapsed))).toStrictEqual([
      0, 0, 0, 0, 0, 0,
    ]);
  });
});

describe('the veil drawn over a cell (0025)', () => {
  /** Sales and Marketing, density 1, and Development, density 3; the reception has no shadow. */
  const areas = areasOf([
    rect('region:sales', 32, 32, 64, 64),
    rect('region:marketing', 160, 32, 64, 64),
    rect('region:development', 32, 112, 64, 64),
    rect('region:reception', 160, 112, 64, 64),
  ]);
  const TICKS = [500, 539, 540, 579, 580, 619, 620, 9000];

  it('is the veil of the density everywhere while no case is solved', () => {
    for (let row = 0; row < 12; row += 1) {
      for (let column = 0; column < 20; column += 1) {
        expect(shownVeil(areas, [], 777, column, row)).toBe(veilOf(areas, column, row));
      }
    }
  });

  it('thins out over a cleared region, step for step by the table of the spec', () => {
    const solved: SolvedCase[] = [{ region: 'sales', at: 500 }];
    expect(TICKS.map((tick) => shownVeil(areas, solved, tick, 3, 3))).toStrictEqual([
      1, 1, 4, 4, 5, 5, 0, 0,
    ]);
    expect(TICKS.map((tick) => shownVeil(areas, solved, tick, 5, 5))).toStrictEqual([
      1, 1, 4, 4, 5, 5, 0, 0,
    ]);
  });

  it('stays as it was over the regions that are not cleared, and outside every area', () => {
    const solved: SolvedCase[] = [{ region: 'sales', at: 500 }];
    for (const tick of TICKS) {
      expect(shownVeil(areas, solved, tick, 11, 3)).toBe(1);
      expect(shownVeil(areas, solved, tick, 3, 8)).toBe(3);
      expect(shownVeil(areas, solved, tick, 8, 3)).toBe(0);
    }
  });

  it('starts from the veil of the density: a region of density 3 shows 3, then 4 and 5', () => {
    const solved: SolvedCase[] = [{ region: 'development', at: 500 }];
    expect(TICKS.map((tick) => shownVeil(areas, solved, tick, 3, 8))).toStrictEqual([
      3, 3, 4, 4, 5, 5, 0, 0,
    ]);
  });

  it('is none over a cleared region without shadow', () => {
    const solved: SolvedCase[] = [{ region: 'reception', at: 500 }];
    expect(TICKS.map((tick) => shownVeil(areas, solved, tick, 11, 8))).toStrictEqual([
      0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it('is the standing shadow where a cleared area and one under shadow overlap', () => {
    const thin: Area = { region: 'sales', density: 1, box: { x: 0, y: 0, width: 64, height: 64 } };
    const dense: Area = {
      region: 'development',
      density: 3,
      box: { x: 32, y: 32, width: 64, height: 64 },
    };
    const solved: SolvedCase[] = [{ region: 'sales', at: 500 }];
    for (const both of [
      [thin, dense],
      [dense, thin],
    ]) {
      expect(TICKS.map((tick) => shownVeil(both, solved, tick, 2, 2))).toStrictEqual([
        3, 3, 3, 3, 3, 3, 3, 3,
      ]);
      expect(TICKS.map((tick) => shownVeil(both, solved, tick, 1, 1))).toStrictEqual([
        1, 1, 4, 4, 5, 5, 0, 0,
      ]);
    }
  });

  it('is that of the first area in the file where two clearing areas overlap', () => {
    const first: Area = { region: 'sales', density: 1, box: { x: 0, y: 0, width: 64, height: 64 } };
    const second: Area = {
      region: 'marketing',
      density: 1,
      box: { x: 32, y: 32, width: 64, height: 64 },
    };
    const solved: SolvedCase[] = [
      { region: 'sales', at: 500 },
      { region: 'marketing', at: 560 },
    ];
    // At 590 Sales is in its third part and Marketing in its first.
    expect(shownVeil([first, second], solved, 590, 2, 2)).toBe(5);
    expect(shownVeil([second, first], solved, 590, 2, 2)).toBe(1);
    // At 625 the clearing of Sales is over, and Marketing is in its second part.
    expect(shownVeil([first, second], solved, 625, 2, 2)).toBe(4);
    expect(shownVeil([second, first], solved, 625, 2, 2)).toBe(4);
    expect(shownVeil([first, second], solved, 680, 2, 2)).toBe(0);
  });
});
