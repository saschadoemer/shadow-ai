import {
  EMPTY,
  type NamedPoint,
  type NamedRect,
  type Point,
  type TileMap,
} from '../../src/engine/tiled';

/** A map of width × height grass tiles (id 0), nothing solid, with the given spawn, named points and rectangles. */
export function grassMap(
  width: number,
  height: number,
  spawn: Point,
  points: readonly NamedPoint[] = [],
  rects: readonly NamedRect[] = [],
): TileMap {
  const cells = width * height;
  return {
    width,
    height,
    ground: new Array<number>(cells).fill(0),
    detail: new Array<number>(cells).fill(EMPTY),
    above: new Array<number>(cells).fill(EMPTY),
    spawn,
    points,
    rects,
    solids: Array.from({ length: cells }, () => []),
    opaque: Array.from({ length: cells }, () => []),
  };
}
