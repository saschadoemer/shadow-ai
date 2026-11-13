import type { SolidGrid } from '../../src/engine/collision';
import { type Box, type Point, TILE_SIZE } from '../../src/engine/tiled';

/**
 * Reachability on foot (feature 0010): the feet on a 2 px lattice, four-connected from `from`,
 * the figure's box of 0005 — [x − 6, x + 6) × [y − 8, y) — inside the map and free of every
 * solid box at each position. Returns a probe: whether a feet position was reached. Throws
 * when `from` itself is not free.
 */
export function reachableFeet(map: SolidGrid, from: Point): (feet: Point) => boolean {
  const widthPx = map.width * TILE_SIZE;
  const heightPx = map.height * TILE_SIZE;
  const columns = widthPx / 2;
  const rows = heightPx / 2;
  const reached = new Uint8Array(columns * rows);
  const free = (x: number, y: number): boolean => {
    const box: Box = { x: x - 6, y: y - 8, width: 12, height: 8 };
    if (box.x < 0 || box.y < 0 || box.x + box.width > widthPx || box.y + box.height > heightPx) {
      return false;
    }
    const firstColumn = Math.floor(box.x / TILE_SIZE);
    const lastColumn = Math.ceil((box.x + box.width) / TILE_SIZE) - 1;
    const firstRow = Math.floor(box.y / TILE_SIZE);
    const lastRow = Math.ceil((box.y + box.height) / TILE_SIZE) - 1;
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        for (const solid of map.solids[row * map.width + column] ?? []) {
          if (
            box.x < solid.x + solid.width &&
            box.x + box.width > solid.x &&
            box.y < solid.y + solid.height &&
            box.y + box.height > solid.y
          ) {
            return false;
          }
        }
      }
    }
    return true;
  };
  if (from.x % 2 !== 0 || from.y % 2 !== 0 || !free(from.x, from.y)) {
    throw new Error(`the flood's start (${from.x}, ${from.y}) is not a free lattice position`);
  }
  const stack: number[] = [(from.y / 2) * columns + from.x / 2];
  reached[stack[0] ?? 0] = 1;
  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    const i = next % columns;
    const j = Math.floor(next / columns);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= columns || nj >= rows) {
        continue;
      }
      const at = nj * columns + ni;
      if (reached[at] === 0 && free(ni * 2, nj * 2)) {
        reached[at] = 1;
        stack.push(at);
      }
    }
  }
  return (feet) =>
    feet.x % 2 === 0 && feet.y % 2 === 0 && reached[(feet.y / 2) * columns + feet.x / 2] === 1;
}

/** A cell's probe point: the feet at (16c + 8, 16r + 14), the box inside the cell's lower half. */
export function feetIn(column: number, row: number): Point {
  return { x: column * TILE_SIZE + 8, y: row * TILE_SIZE + 14 };
}
