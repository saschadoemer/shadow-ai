import { VIEW_HEIGHT, VIEW_WIDTH } from '../engine/camera';
import { EMPTY, type Point, TILE_SIZE, type TileLayerName, type TileMap } from '../engine/tiled';
import type { Renderer, TilesetImage } from './renderer';

/** The first and last cell a span of `length` pixels from `offset` touches, cut to `count` cells. */
function cellRange(offset: number, length: number, count: number): readonly [number, number] {
  return [
    Math.max(0, Math.floor(offset / TILE_SIZE)),
    Math.min(count - 1, Math.floor((offset + length - 1) / TILE_SIZE)),
  ];
}

/**
 * Draws one layer as the camera sees it: every non-empty cell (column, row) the view
 * intersects, at (16 × column − camera.x, 16 × row − camera.y), row by row. At most 21 columns
 * and 13 rows; a cell at the view's edge is drawn partly off the surface and clipped by it.
 */
export function drawLayer(
  renderer: Renderer,
  map: TileMap,
  tileset: TilesetImage,
  name: TileLayerName,
  camera: Point,
): void {
  const [firstColumn, lastColumn] = cellRange(camera.x, VIEW_WIDTH, map.width);
  const [firstRow, lastRow] = cellRange(camera.y, VIEW_HEIGHT, map.height);
  const cells = map[name];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const id = cells[row * map.width + column];
      if (id === undefined || id === EMPTY) {
        continue;
      }
      renderer.drawTile(tileset, id, column * TILE_SIZE - camera.x, row * TILE_SIZE - camera.y);
    }
  }
}
