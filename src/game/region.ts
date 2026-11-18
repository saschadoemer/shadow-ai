import type { Box } from '../engine/collision';
import { type NamedRect, TILE_SIZE } from '../engine/tiled';
import { REGION_PREFIX, rectsOf } from './rects';
import { densityOf } from './world';

/**
 * The areas of the regions (world.md §1, feature 0023). An area is a rectangle of the map
 * named `region:<id>`: whole cells that belong to a region of the world data. A region may
 * have several. A cell in an area of a region with shadow is under shadow, and its veil is the
 * region's density. Pure data and pure functions; the areas are read from the map's
 * rectangles on every call and kept nowhere.
 */

export interface Area {
  readonly region: string;
  /** The region's density, 0–3 (game/world); 0 is a region without shadow. */
  readonly density: number;
  /** Map pixels: whole cells. */
  readonly box: Box;
}

function isCells(box: Box): boolean {
  const onGrid = box.x % TILE_SIZE === 0 && box.y % TILE_SIZE === 0;
  const spans =
    box.width > 0 && box.height > 0 && box.width % TILE_SIZE === 0 && box.height % TILE_SIZE === 0;
  return onGrid && spans;
}

/**
 * The areas of a map, in the order of its rectangles. Rejects a region the world data does
 * not know and a box that is not whole cells.
 */
export function areasOf(rects: readonly NamedRect[]): Area[] {
  return rectsOf(rects, REGION_PREFIX).map((rect) => {
    const region = rect.name.slice(REGION_PREFIX.length);
    const density = densityOf(region);
    if (density === undefined) {
      throw new Error(`region ${rect.name} names no region`);
    }
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (!isCells(box)) {
      throw new Error(
        `region ${rect.name} (${box.x}, ${box.y}, ${box.width}, ${box.height}) is not whole cells`,
      );
    }
    return { region, density, box };
  });
}

/**
 * The veil of the cell (column, row): the density of the area it lies in, the largest when
 * areas overlap, and 0 when it lies in no area or only in areas without shadow. A cell with a
 * veil above 0 is under shadow.
 */
export function veilOf(areas: readonly Area[], column: number, row: number): number {
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  let veil = 0;
  for (const { density, box } of areas) {
    if (
      density > veil &&
      x >= box.x &&
      x < box.x + box.width &&
      y >= box.y &&
      y < box.y + box.height
    ) {
      veil = density;
    }
  }
  return veil;
}
