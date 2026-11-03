import { EMPTY, type Point, type TileMap } from '../../src/engine/tiled';

/** A map of width × height grass tiles (id 0), nothing solid, with the given spawn. */
export function grassMap(width: number, height: number, spawn: Point): TileMap {
  const cells = width * height;
  return {
    width,
    height,
    ground: new Array<number>(cells).fill(0),
    detail: new Array<number>(cells).fill(EMPTY),
    above: new Array<number>(cells).fill(EMPTY),
    spawn,
    solid: new Array<boolean>(cells).fill(false),
  };
}
