/**
 * An axis-aligned box against the solid boxes of a grid of cells (architecture.md §1, features
 * 0005 and 0010). A cell holds the boxes of its tiles in map pixels: a whole tile, or a strip
 * thinner than a tile. The box moves on X, then on Y; on each axis it is snapped flush to the
 * solid boxes it would enter. Intervals are half-open, so a box whose edge lies exactly on a
 * solid box's edge does not overlap it: a box flush against a wall slides along it. Cells
 * outside the grid are open; the map edge is the caller's business. The displacement is assumed
 * to be below 4 px per call, the thinnest wall — this is not a swept test.
 */
import { type Box, type Point, TILE_SIZE } from './tiled';

export type { Box } from './tiled';

/** What the resolver asks of a map: its size in cells and the row-major solid boxes per cell. A TileMap is one. */
export interface SolidGrid {
  readonly width: number;
  readonly height: number;
  /** Row-major, width × height: the cell's solid boxes in map pixels; [] is an open cell. */
  readonly solids: readonly (readonly Box[])[];
}

/** The solid boxes of a cell; cells outside the grid are open. */
function solidsAt(grid: SolidGrid, column: number, row: number): readonly Box[] {
  if (column < 0 || row < 0 || column >= grid.width || row >= grid.height) {
    return [];
  }
  return grid.solids[row * grid.width + column] ?? [];
}

/** The first and last cell an interval [from, to) touches: ⌊from / 16⌋ to ⌈to / 16⌉ − 1. */
function cellRange(from: number, to: number): readonly [number, number] {
  return [Math.floor(from / TILE_SIZE), Math.ceil(to / TILE_SIZE) - 1];
}

/** Half-open overlap: touching edges do not overlap. */
function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** The solid boxes the box overlaps: those of every cell it touches. */
function overlappedSolids(box: Box, grid: SolidGrid): Box[] {
  const [firstColumn, lastColumn] = cellRange(box.x, box.x + box.width);
  const [firstRow, lastRow] = cellRange(box.y, box.y + box.height);
  const hits: Box[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      for (const solid of solidsAt(grid, column, row)) {
        if (overlaps(box, solid)) {
          hits.push(solid);
        }
      }
    }
  }
  return hits;
}

/**
 * Moves the box by (dx, dy): X first, then Y. On each axis the box is moved back flush against
 * the solid boxes it overlaps afterwards — for a positive displacement its far edge goes to the
 * smallest near edge among them, for a negative one its near edge to the largest far edge. An
 * axis with no displacement is not resolved. Returns the new top-left corner.
 */
export function moveBox(box: Box, dx: number, dy: number, grid: SolidGrid): Point {
  let { x, y } = box;
  if (dx !== 0) {
    x += dx;
    const hits = overlappedSolids({ ...box, x, y }, grid);
    if (hits.length > 0) {
      x =
        dx > 0
          ? Math.min(...hits.map((hit) => hit.x)) - box.width
          : Math.max(...hits.map((hit) => hit.x + hit.width));
    }
  }
  if (dy !== 0) {
    y += dy;
    const hits = overlappedSolids({ ...box, x, y }, grid);
    if (hits.length > 0) {
      y =
        dy > 0
          ? Math.min(...hits.map((hit) => hit.y)) - box.height
          : Math.max(...hits.map((hit) => hit.y + hit.height));
    }
  }
  return { x, y };
}

/** Whether a solid box of the point's cell contains the point, half-open. */
function inSolid(point: Point, grid: SolidGrid): boolean {
  const column = Math.floor(point.x / TILE_SIZE);
  const row = Math.floor(point.y / TILE_SIZE);
  return solidsAt(grid, column, row).some(
    (solid) =>
      point.x >= solid.x &&
      point.x < solid.x + solid.width &&
      point.y >= solid.y &&
      point.y < solid.y + solid.height,
  );
}

/**
 * Whether a solid box lies on the straight line from a to b (features 0008, 0010): the line is
 * tested at n + 1 points a + (b − a) × i / n, n = max(1, ⌈|b − a|⌉), so the points are at most
 * one pixel apart and a 4 px wall cannot be stepped over. A point is blocked when a box of its
 * cell (⌊x / 16⌋, ⌊y / 16⌋) contains it; cells outside the grid are open. A line that cuts less
 * than a pixel off a box's corner may pass.
 */
export function sightBlocked(a: Point, b: Point, grid: SolidGrid): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let i = 0; i <= steps; i += 1) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    if (inSolid({ x, y }, grid)) {
      return true;
    }
  }
  return false;
}
