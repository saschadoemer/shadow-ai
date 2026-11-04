import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Box, moveBox, type SolidGrid } from '../../src/engine/collision';
import { parseTileMap, parseTileset } from '../../src/engine/tiled';
import { CORRIDOR, pictureMap } from './picture-map';

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
    expect(corridor.solid).toStrictEqual(GRID.solid);
  });

  it('reads the loaded grid: through the gap, stopped above it', () => {
    expect(throughTheGap(corridor)).toStrictEqual([188, 100]);
    expect(moved(box(148, 94), 2, 0, corridor)).toStrictEqual([148, 94]);
  });
});
