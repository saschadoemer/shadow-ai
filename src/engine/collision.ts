/**
 * An axis-aligned box against a grid of solid cells (architecture.md §1, feature 0005). The box
 * moves on X, then on Y; on each axis it is snapped flush to the solid cell it would enter.
 * Intervals are half-open, so a box whose edge lies exactly on a cell's edge does not overlap
 * that cell: a box flush against a wall slides along it. Cells outside the grid are open; the
 * map edge is the caller's business. The displacement is assumed to be below one cell per call
 * — this is not a swept test.
 */
import { type Point, TILE_SIZE } from './tiled';

export interface Box {
  /** The top-left corner, in pixels. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** What the resolver asks of a map: its size in cells and the row-major solid grid. A TileMap is one. */
export interface SolidGrid {
  readonly width: number;
  readonly height: number;
  readonly solid: readonly boolean[];
}

function isSolid(grid: SolidGrid, column: number, row: number): boolean {
  if (column < 0 || row < 0 || column >= grid.width || row >= grid.height) {
    return false;
  }
  return grid.solid[row * grid.width + column] === true;
}

/** The first and last cell an interval [from, to) touches: ⌊from / 16⌋ to ⌈to / 16⌉ − 1. */
function cellRange(from: number, to: number): readonly [number, number] {
  return [Math.floor(from / TILE_SIZE), Math.ceil(to / TILE_SIZE) - 1];
}

/** The solid cells the box overlaps, as (column, row). */
function overlappedSolidCells(box: Box, grid: SolidGrid): Point[] {
  const [firstColumn, lastColumn] = cellRange(box.x, box.x + box.width);
  const [firstRow, lastRow] = cellRange(box.y, box.y + box.height);
  const cells: Point[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      if (isSolid(grid, column, row)) {
        cells.push({ x: column, y: row });
      }
    }
  }
  return cells;
}

/**
 * Moves the box by (dx, dy): X first, then Y. On each axis the box is moved back flush against
 * the nearest solid cell it overlaps afterwards — for a positive displacement its far edge goes
 * to the smallest near edge among them, for a negative one the other way round. An axis with
 * no displacement is not resolved. Returns the new top-left corner.
 */
export function moveBox(box: Box, dx: number, dy: number, grid: SolidGrid): Point {
  let { x, y } = box;
  if (dx !== 0) {
    x += dx;
    const hits = overlappedSolidCells({ ...box, x, y }, grid);
    if (hits.length > 0) {
      x =
        dx > 0
          ? Math.min(...hits.map((cell) => cell.x)) * TILE_SIZE - box.width
          : (Math.max(...hits.map((cell) => cell.x)) + 1) * TILE_SIZE;
    }
  }
  if (dy !== 0) {
    y += dy;
    const hits = overlappedSolidCells({ ...box, x, y }, grid);
    if (hits.length > 0) {
      y =
        dy > 0
          ? Math.min(...hits.map((cell) => cell.y)) * TILE_SIZE - box.height
          : (Math.max(...hits.map((cell) => cell.y)) + 1) * TILE_SIZE;
    }
  }
  return { x, y };
}

/**
 * Whether a solid cell lies on the straight line from a to b (feature 0008): the line is
 * tested at n + 1 points a + (b − a) × i / n, n = max(1, ⌈|b − a|⌉), so the points are at most
 * one pixel apart. A point is in the cell (⌊x / 16⌋, ⌊y / 16⌋); cells outside the grid are open.
 * A line that cuts less than a pixel off a cell's corner may pass.
 */
export function sightBlocked(a: Point, b: Point, grid: SolidGrid): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let i = 0; i <= steps; i += 1) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    if (isSolid(grid, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE))) {
      return true;
    }
  }
  return false;
}
