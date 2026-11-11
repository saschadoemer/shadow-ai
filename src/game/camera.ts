import { cameraFor } from '../engine/camera';
import { type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { collisionBox } from './player';
import type { PlayerState } from './state';

/**
 * The view's top-left corner for a figure (feature 0006): centred on the centre of its collision
 * box — (x, y − 4) for feet at (x, y) — and clamped to the map, in pixels. The map's size is in
 * tiles; this is the one place that converts it.
 */
export function followPlayer(player: PlayerState, map: TileMap): Point {
  const box = collisionBox(player);
  return cameraFor(
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    { width: map.width * TILE_SIZE, height: map.height * TILE_SIZE },
  );
}
