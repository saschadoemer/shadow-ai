import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Box, moveBox, type SolidGrid, sightBlocked } from '../../src/engine/collision';
import { parseTileMap, parseTileset } from '../../src/engine/tiled';
import { CORRIDOR, pictureMap } from './picture-map';
import { solidsOf, solidsWith } from './solids';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The corridor picture in pixels: the wall in column 10 spans x [160, 176); the lone tile at
 * (4, 3) spans [64, 80) × [48, 64); the gap in row 6 spans y [96, 112).
 */
const GRID = pictureMap(CORRIDOR, { x: 40, y: 56 });

/** The figure's box, 12x8, named by its top-left corner. */
function box(x: number, y: number): Box {
  return { x, y, width: 12, height: 8 };
}

/** Where the box ends up, as [x, y]. */
function moved(from: Box, dx: number, dy: number, grid: SolidGrid = GRID): [number, number] {
  const to = moveBox(from, dx, dy, grid);
  return [to.x, to.y];
}

/** Twenty moves of (2, 0) from (148, 100): through the gap when the grid is the corridor. */
function throughTheGap(grid: SolidGrid): [number, number] {
  let current = box(148, 100);
  for (let i = 0; i < 20; i += 1) {
    current = { ...current, ...moveBox(current, 2, 0, grid) };
  }
  return [current.x, current.y];
}

describe('moveBox: stopping flush against a solid cell', () => {
  it("moving right ends with the right edge at the cell's left edge", () => {
    expect(moved(box(147, 64), 2, 0)).toStrictEqual([148, 64]);
  });

  it("moving left ends with the left edge at the cell's right edge", () => {
    expect(moved(box(177, 64), -2, 0)).toStrictEqual([176, 64]);
  });

  it("moving down ends with the bottom edge at the cell's top edge", () => {
    expect(moved(box(66, 39), 0, 2)).toStrictEqual([66, 40]);
  });

  it("moving up ends with the top edge at the cell's bottom edge", () => {
    expect(moved(box(66, 65), 0, -2)).toStrictEqual([66, 64]);
  });

  it('snaps a larger displacement the same way', () => {
    expect(moved(box(147, 64), 10, 0)).toStrictEqual([148, 64]);
  });
});

describe('moveBox: touching is not overlapping', () => {
  it('moves freely along a wall it is flush against', () => {
    expect(moved(box(148, 64), 0, 2)).toStrictEqual([148, 66]);
  });

  it('stays flush when pushed into the wall', () => {
    expect(moved(box(148, 64), 2, 0)).toStrictEqual([148, 64]);
  });

  it('keeps the free component of a diagonal: the slide', () => {
    const to = moveBox(box(148, 64), 0.943, 0.943, GRID);
    expect(to.x).toBe(148);
    expect(to.y).toBeCloseTo(64.943, 6);
  });
});

describe('moveBox: corners do not snag', () => {
  it('from below-left, moving up-right: full x, stopped on y', () => {
    expect(moved(box(51, 65), 2, -2)).toStrictEqual([53, 64]);
  });

  it('from above-right, moving down-left: full x, stopped on y', () => {
    expect(moved(box(81, 39), -2, 2)).toStrictEqual([79, 40]);
  });

  it('from the left with overlapping rows, moving up-right: stopped on x, full y', () => {
    expect(moved(box(51, 60), 2, -2)).toStrictEqual([52, 58]);
  });
});

describe('moveBox: the gap, standing still and the grid edge', () => {
  it('passes a one-tile gap', () => {
    expect(throughTheGap(GRID)).toStrictEqual([188, 100]);
  });

  it('is stopped when the box also covers the row above the gap', () => {
    expect(moved(box(148, 94), 2, 0)).toStrictEqual([148, 94]);
  });

  it('resolves nothing without movement, even inside a solid cell', () => {
    expect(moved(box(66, 52), 0, 0)).toStrictEqual([66, 52]);
  });

  it('treats cells outside the grid as open', () => {
    expect(moved(box(1, 64), -2, 0)).toStrictEqual([-1, 64]);
    expect(moved(box(308, 64), 2, 0)).toStrictEqual([310, 64]);
  });

  it('leaves its input unchanged', () => {
    const from = box(147, 64);
    moveBox(from, 2, 0, GRID);
    expect(from).toStrictEqual(box(147, 64));
  });
});

describe('moveBox on the loaded corridor fixture', () => {
  const FIXTURES = 'tests/fixtures/maps';
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(join(ROOT, FIXTURES, name), 'utf8'));
  const tileset = parseTileset(read('fixture-tiles.tsj'), `${FIXTURES}/fixture-tiles.tsj`);
  const corridor = parseTileMap(read('corridor.tmj'), tileset, `${FIXTURES}/corridor.tmj`);

  it('has the solid grid the picture draws', () => {
    expect(corridor.solids).toStrictEqual(GRID.solids);
  });

  it('reads the loaded grid: through the gap, stopped above it', () => {
    expect(throughTheGap(corridor)).toStrictEqual([188, 100]);
    expect(moved(box(148, 94), 2, 0, corridor)).toStrictEqual([148, 94]);
  });
});

describe('sightBlocked (0008)', () => {
  /** 4x3 cells; the only solid cell is (2, 1), the square [32, 48) × [16, 32). */
  const ONE: SolidGrid = {
    width: 4,
    height: 3,
    solids: solidsOf(
      [false, false, false, false, false, false, true, false, false, false, false, false],
      4,
    ),
  };
  const blocked = (ax: number, ay: number, bx: number, by: number): boolean =>
    sightBlocked({ x: ax, y: ay }, { x: bx, y: by }, ONE);

  it('is blocked by a solid cell on the line, in both directions', () => {
    expect(blocked(24, 24, 56, 24)).toBe(true);
    expect(blocked(56, 24, 24, 24)).toBe(true);
    expect(blocked(40, 0, 40, 40)).toBe(true);
  });

  it('is clear above and below the cell', () => {
    expect(blocked(24, 8, 56, 8)).toBe(false);
    expect(blocked(24, 40, 56, 40)).toBe(false);
  });

  it("treats the cell as half-open: y = 32 is the next row, y = 31.5 is the cell's", () => {
    expect(blocked(24, 32, 56, 32)).toBe(false);
    expect(blocked(24, 31.5, 56, 31.5)).toBe(true);
  });

  it('tests a single point when both ends are the same', () => {
    expect(blocked(24, 24, 24, 24)).toBe(false);
    expect(blocked(40, 24, 40, 24)).toBe(true);
  });

  it('treats cells outside the grid as open', () => {
    expect(blocked(24, 8, -20, 8)).toBe(false);
  });
});

describe('boxes thinner than a cell (0010)', () => {
  /** 10x10 cells: a left strip in cell (5, 3) and a top strip in cell (2, 6). */
  const STRIPS: SolidGrid = {
    width: 10,
    height: 10,
    solids: solidsWith(10, 10, [
      { column: 5, row: 3, box: { x: 80, y: 48, width: 4, height: 16 } },
      { column: 2, row: 6, box: { x: 32, y: 96, width: 16, height: 4 } },
    ]),
  };
  /** 10x10 cells: a post in cell (3, 3). */
  const POST: SolidGrid = {
    width: 10,
    height: 10,
    solids: solidsWith(10, 10, [{ column: 3, row: 3, box: { x: 48, y: 48, width: 4, height: 4 } }]),
  };
  /** 10x10 cells: top strips in cells (1, 8) and (4, 8), a doorway at (2, 8) and (3, 8). */
  const DOORWAY: SolidGrid = {
    width: 10,
    height: 10,
    solids: solidsWith(10, 10, [
      { column: 1, row: 8, box: { x: 16, y: 128, width: 16, height: 4 } },
      { column: 4, row: 8, box: { x: 64, y: 128, width: 16, height: 4 } },
    ]),
  };
  const blocked = (ax: number, ay: number, bx: number, by: number): boolean =>
    sightBlocked({ x: ax, y: ay }, { x: bx, y: by }, STRIPS);

  it('stops flush at a left strip from either side', () => {
    expect(moved(box(60, 52), 10, 0, STRIPS)).toStrictEqual([68, 52]);
    expect(moved(box(90, 52), -8, 0, STRIPS)).toStrictEqual([84, 52]);
    expect(moved(box(86, 52), -1.5, 0, STRIPS)).toStrictEqual([84.5, 52]);
    expect(moved(box(84, 52), -1, 0, STRIPS)).toStrictEqual([84, 52]);
  });

  it('slides along a strip it is flush against', () => {
    expect(moved(box(68, 52), 1, 1, STRIPS)).toStrictEqual([68, 53]);
  });

  it('stops flush at a top strip from either side', () => {
    expect(moved(box(34, 104), 0, -6, STRIPS)).toStrictEqual([34, 100]);
    expect(moved(box(34, 86), 0, 4, STRIPS)).toStrictEqual([34, 88]);
  });

  it('moves freely inside a wall cell below its strip', () => {
    expect(moved(box(34, 102), 2, 0, STRIPS)).toStrictEqual([36, 102]);
    expect(moved(box(34, 102), -2, 0, STRIPS)).toStrictEqual([32, 102]);
  });

  it('stops at a post from below and from the right', () => {
    expect(moved(box(40, 53), 0, -3, POST)).toStrictEqual([40, 52]);
    expect(moved(box(52, 44), -3, 0, POST)).toStrictEqual([52, 44]);
  });

  it('passes a doorway between two top strips and is stopped beside it', () => {
    const up = (x: number): number => {
      let current = box(x, 140);
      for (let i = 0; i < 20; i += 1) {
        current = { ...current, ...moveBox(current, 0, -1, DOORWAY) };
      }
      return current.y;
    };
    expect(up(42)).toBe(120);
    expect(up(20)).toBe(132);
  });

  it('blocks the sight line only where it crosses a strip', () => {
    expect(blocked(70, 56, 95, 56)).toBe(true);
    expect(blocked(70, 56, 79, 56)).toBe(false);
    expect(blocked(20, 110, 60, 110)).toBe(false);
    expect(blocked(40, 90, 40, 104)).toBe(true);
  });
});
