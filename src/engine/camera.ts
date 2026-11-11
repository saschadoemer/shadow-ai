/**
 * The view and where it sits on the map (architecture.md §5, feature 0006). A view of
 * VIEW_WIDTH × VIEW_HEIGHT pixels is centred on a target and clamped so it never leaves the
 * map; its top-left corner is rounded to whole pixels, so everything drawn from it is drawn on
 * whole pixels. Pure: a function of the target and the map's size.
 */
import type { Point } from './tiled';

/** The view in game pixels (visual.md §1). It never changes size. */
export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 180;

/** A map's size in pixels — not a TileMap, whose width and height are tiles. */
export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The view's top-left corner for a view centred on `target`: clamped to
 * [0, map.width − VIEW_WIDTH] × [0, map.height − VIEW_HEIGHT], then rounded, per axis. The
 * loader accepts no map smaller than the view, so the clamp's bounds are never inverted.
 */
export function cameraFor(target: Point, map: PixelSize): Point {
  return {
    x: Math.round(clamp(target.x - VIEW_WIDTH / 2, 0, map.width - VIEW_WIDTH)),
    y: Math.round(clamp(target.y - VIEW_HEIGHT / 2, 0, map.height - VIEW_HEIGHT)),
  };
}
