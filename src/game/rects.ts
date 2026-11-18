import type { Box } from '../engine/collision';
import { type NamedRect, TILE_SIZE } from '../engine/tiled';

/**
 * The kinds of rectangle a map may hold (architecture.md §6): what a rectangle is, is the
 * game's business, and its name says it. A shadow wall is `shadow:<region>` (0014), a trace
 * `trace:<region>` (0022), an area of a region `region:<id>` (0023), a rest `rest:<what>`
 * (0027). Pure.
 */

/** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
export const WALL_PREFIX = 'shadow:';
/** A rectangle whose name starts with this is a trace; the rest of the name is its region. */
export const TRACE_PREFIX = 'trace:';
/** A rectangle whose name starts with this is an area of a region; the rest is the region (0023). */
export const REGION_PREFIX = 'region:';
/** A rectangle whose name starts with this is a rest; the rest of the name is what it is (0027). */
export const REST_PREFIX = 'rest:';

const PREFIXES: readonly string[] = [WALL_PREFIX, TRACE_PREFIX, REGION_PREFIX, REST_PREFIX];

/** Exactly one cell: the corner on the grid, a tile wide and a tile high. */
export function isCell(box: Box): boolean {
  return (
    box.x % TILE_SIZE === 0 &&
    box.y % TILE_SIZE === 0 &&
    box.width === TILE_SIZE &&
    box.height === TILE_SIZE
  );
}

/**
 * The rectangles of one kind, in the order of the map. Rejects a rectangle of no known kind,
 * so that a typing mistake in the map is not a silently missing wall or trace.
 */
export function rectsOf(rects: readonly NamedRect[], prefix: string): NamedRect[] {
  for (const rect of rects) {
    if (!PREFIXES.some((known) => rect.name.startsWith(known))) {
      throw new Error(`unknown rectangle object "${rect.name}"`);
    }
  }
  return rects.filter((rect) => rect.name.startsWith(prefix));
}
