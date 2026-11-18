import { VIEW_HEIGHT, VIEW_WIDTH } from '../engine/camera';
import { EMPTY, type Point, TILE_SIZE, type TileLayerName, type TileMap } from '../engine/tiled';
import type { Renderer, SpriteSheet, TilesetImage } from './renderer';

/** The first and last cell a span of `length` pixels from `offset` touches, cut to `count` cells. */
function cellRange(offset: number, length: number, count: number): readonly [number, number] {
  return [
    Math.max(0, Math.floor(offset / TILE_SIZE)),
    Math.min(count - 1, Math.floor((offset + length - 1) / TILE_SIZE)),
  ];
}

/** The shadow over the cells (0023): the tileset in greys, and each cell's veil — 0 for none. */
export interface Shadow {
  readonly tileset: TilesetImage;
  readonly veilOf: (column: number, row: number) => number;
}

/**
 * Draws one layer as the camera sees it: every non-empty cell (column, row) the view
 * intersects, at (16 × column − camera.x, 16 × row − camera.y), row by row. At most 21 columns
 * and 13 rows; a cell at the view's edge is drawn partly off the surface and clipped by it.
 * With a shadow, a cell under it is drawn from the shadow's tileset — the same id at the same
 * place — and every other cell from the tileset (0023).
 */
export function drawLayer(
  renderer: Renderer,
  map: TileMap,
  tileset: TilesetImage,
  name: TileLayerName,
  camera: Point,
  shadow?: Shadow,
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
      const under = shadow !== undefined && shadow.veilOf(column, row) > 0;
      renderer.drawTile(
        under ? shadow.tileset : tileset,
        id,
        column * TILE_SIZE - camera.x,
        row * TILE_SIZE - camera.y,
      );
    }
  }
}

/**
 * The veil (0023): on every cell under shadow the view intersects, the frame of its veil − 1,
 * at the cell's place. Row by row, like a layer; a cell without a veil gets nothing.
 */
export function drawVeil(
  renderer: Renderer,
  map: TileMap,
  sheet: SpriteSheet,
  camera: Point,
  veilOf: (column: number, row: number) => number,
): void {
  const [firstColumn, lastColumn] = cellRange(camera.x, VIEW_WIDTH, map.width);
  const [firstRow, lastRow] = cellRange(camera.y, VIEW_HEIGHT, map.height);
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const veil = veilOf(column, row);
      if (veil > 0) {
        renderer.drawSprite(
          sheet,
          veil - 1,
          column * TILE_SIZE - camera.x,
          row * TILE_SIZE - camera.y,
        );
      }
    }
  }
}
