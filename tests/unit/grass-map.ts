import { EMPTY, type NamedPoint, type Point, type TileMap } from '../../src/engine/tiled';

/** A map of width × height grass tiles (id 0), nothing solid, with the given spawn and named points. */
export function grassMap(
  width: number,
  height: number,
  spawn: Point,
  points: readonly NamedPoint[] = [],
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
    solids: Array.from({ length: cells }, () => []),
  };
}
