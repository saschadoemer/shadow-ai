import { EMPTY, TILE_LAYER_NAMES, TILE_SIZE, type TileMap } from '../engine/tiled';
import { PAGE_BACKGROUND } from './palette';
import type { Renderer, TilesetImage } from './renderer';

/**
 * Draws the map layer by layer — ground, detail, above — every non-empty cell (column, row) at
 * (column × 16, row × 16). The camera is fixed at the top-left corner until 0006; the surface
 * clips what lies beyond 320x180.
 */
export function drawMap(renderer: Renderer, map: TileMap, tileset: TilesetImage): void {
  renderer.clear(PAGE_BACKGROUND);
  for (const name of TILE_LAYER_NAMES) {
    for (const [index, id] of map[name].entries()) {
      if (id === EMPTY) {
        continue;
      }
      const column = index % map.width;
      const row = Math.floor(index / map.width);
      renderer.drawTile(tileset, id, column * TILE_SIZE, row * TILE_SIZE);
    }
  }
}
