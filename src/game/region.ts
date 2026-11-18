import type { Box } from '../engine/collision';
import { type NamedRect, type Point, TILE_SIZE } from '../engine/tiled';
import { REGION_PREFIX, rectsOf } from './rects';
import type { SolvedCase } from './state';
import { densityOf } from './world';

/**
 * The areas of the regions (world.md §1, feature 0023). An area is a rectangle of the map
 * named `region:<id>`: whole cells that belong to a region of the world data. A region may
 * have several. A cell in an area of a region with shadow is under shadow, and its veil is the
 * region's density — until the region's case is solved: a solved region is cleared, its cells
 * are no longer under shadow, and its veil thins out over CLEAR_STEPS steps (0025). Pure data
 * and pure functions; the areas are read from the map's rectangles on every call and kept
 * nowhere.
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

/** Whether a point lies in an area: inside its rectangle, the left and the upper edge included. */
export function inArea(area: Area, point: Point): boolean {
  const { box } = area;
  return (
    point.x >= box.x &&
    point.x < box.x + box.width &&
    point.y >= box.y &&
    point.y < box.y + box.height
  );
}

/**
 * The veil of the cell (column, row): the density of the area it lies in, the largest when
 * areas overlap, and 0 when it lies in no area or only in areas without shadow. A cell with a
 * veil above 0 is under shadow. Given the areas still under shadow (`shadowedAreas`), a cell
 * of a cleared region has no veil (0025).
 */
export function veilOf(areas: readonly Area[], column: number, row: number): number {
  const corner: Point = { x: column * TILE_SIZE, y: row * TILE_SIZE };
  let veil = 0;
  for (const area of areas) {
    if (area.density > veil && inArea(area, corner)) {
      veil = area.density;
    }
  }
  return veil;
}

/** A cleared region's veil thins out for this many steps, two seconds, and is gone (0025). */
export const CLEAR_STEPS = 120;
/** The clearing has three parts of equal length: the region's own veil, then the two thin ones. */
export const CLEAR_PART_STEPS = CLEAR_STEPS / 3;
/**
 * The two veils of a clearing, after the three of the densities: 16 and 8 pixels a cell. Like
 * every veil, each is drawn from the frame veil − 1 of the veil's sheet: frames 3 and 4.
 */
export const THIN_VEIL = 4;
export const THINNEST_VEIL = 5;

/** The tick of the step that cleared a region — the one that solved its case — or null. */
export function clearedAt(region: string, solved: readonly SolvedCase[]): number | null {
  return solved.find((entry) => entry.region === region)?.at ?? null;
}

/** The areas still under shadow: those of the regions that are not cleared. */
export function shadowedAreas(areas: readonly Area[], solved: readonly SolvedCase[]): Area[] {
  return areas.filter((area) => clearedAt(area.region, solved) === null);
}

/**
 * The veil over a region of the given density, `elapsed` steps after it was cleared: its own
 * for the first part, THIN_VEIL for the second, THINNEST_VEIL for the third, and none from
 * CLEAR_STEPS on. A region without shadow has none at any time.
 */
export function clearingVeil(density: number, elapsed: number): number {
  if (density === 0 || elapsed >= CLEAR_STEPS) {
    return 0;
  }
  if (elapsed < CLEAR_PART_STEPS) {
    return density;
  }
  return elapsed < 2 * CLEAR_PART_STEPS ? THIN_VEIL : THINNEST_VEIL;
}

/**
 * The veil drawn over the cell (column, row) at step `tick`: where the cell is under shadow,
 * the veil of its density (`veilOf` on the areas still under shadow); else the clearing veil of
 * the first area in file order that the cell lies in and whose region is still clearing; else
 * 0. The cell's tiles do not follow it: they are in colour from the step that cleared it.
 */
export function shownVeil(
  areas: readonly Area[],
  solved: readonly SolvedCase[],
  tick: number,
  column: number,
  row: number,
): number {
  const standing = veilOf(shadowedAreas(areas, solved), column, row);
  if (standing > 0) {
    return standing;
  }
  const corner: Point = { x: column * TILE_SIZE, y: row * TILE_SIZE };
  for (const area of areas) {
    const at = clearedAt(area.region, solved);
    if (at !== null && inArea(area, corner)) {
      const veil = clearingVeil(area.density, tick - at);
      if (veil > 0) {
        return veil;
      }
    }
  }
  return 0;
}
