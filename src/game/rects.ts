import type { NamedRect } from '../engine/tiled';

/**
 * The kinds of rectangle a map may hold (architecture.md §6): what a rectangle is, is the
 * game's business, and its name says it. A shadow wall is `shadow:<region>` (0014), a trace
 * `trace:<region>` (0022). Pure.
 */

/** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
export const WALL_PREFIX = 'shadow:';
/** A rectangle whose name starts with this is a trace; the rest of the name is its region. */
export const TRACE_PREFIX = 'trace:';

const PREFIXES: readonly string[] = [WALL_PREFIX, TRACE_PREFIX];

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
