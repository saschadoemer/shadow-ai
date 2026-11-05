import { EMPTY, type Point, type TileMap } from '../../src/engine/tiled';

/**
 * The solid grid of tests/fixtures/maps/corridor.tmj as a picture: a wall in column 10 with a
 * one-tile gap in row 6, a lone tile at (4, 3) and one at (2, 2). collision.test.ts asserts that
 * the loaded fixture and this picture agree.
 */
export const CORRIDOR: readonly string[] = [
  '....................',
  '....................',
  '..#.......#.........',
  '....#.....#.........',
  '..........#.........',
  '..........#.........',
  '....................',
  '..........#.........',
  '..........#.........',
  '..........#.........',
  '....................',
  '....................',
];

/**
 * An in-memory map from a picture, one string per row: `#` is a solid cell, `.` an open one.
 * `ground` is all grass (id 0) and `detail` and `above` are empty, so only `solid` carries the
 * picture — a test that needs walls shows them.
 */
export function pictureMap(rows: readonly string[], spawn: Point): TileMap {
  const [first] = rows;
  if (first === undefined) {
    throw new Error('a picture needs at least one row');
  }
  const width = first.length;
  const solid: boolean[] = [];
  for (const [index, row] of rows.entries()) {
    if (row.length !== width) {
      throw new Error(`row ${index} has ${row.length} cells; ${width} are required`);
    }
    for (const cell of row) {
      if (cell !== '#' && cell !== '.') {
        throw new Error(`row ${index} has "${cell}"; only # and . are allowed`);
      }
      solid.push(cell === '#');
    }
  }
  const cells = width * rows.length;
  return {
    width,
    height: rows.length,
    ground: new Array<number>(cells).fill(0),
    detail: new Array<number>(cells).fill(EMPTY),
    above: new Array<number>(cells).fill(EMPTY),
    spawn,
    solid,
  };
}
