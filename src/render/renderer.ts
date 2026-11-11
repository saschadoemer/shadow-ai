import type { PaletteColour } from './palette';

/** The game surface is the view (engine/camera): one 320 and one 180 in the code. */
export { VIEW_HEIGHT as SURFACE_HEIGHT, VIEW_WIDTH as SURFACE_WIDTH } from '../engine/camera';

/** A decoded tileset image and how many tiles one of its rows holds. */
export interface TilesetImage {
  readonly image: ImageBitmap;
  readonly columns: number;
}

/** A decoded sprite sheet: frames of FRAME_WIDTH × FRAME_HEIGHT in one row (engine/sprite). */
export interface SpriteSheet {
  readonly image: ImageBitmap;
}

/**
 * What the game needs drawn, in whole game pixels on the 320x180 surface (architecture.md §5).
 * Colours are palette colours, so a colour outside Endesga 32 does not compile.
 */
export interface Renderer {
  clear(colour: PaletteColour): void;
  fillRect(x: number, y: number, width: number, height: number, colour: PaletteColour): void;
  /** Draws tile `id` of the tileset with its top-left corner at (x, y), 16x16. */
  drawTile(tileset: TilesetImage, id: number, x: number, y: number): void;
  /** Draws frame `frame` of the sheet with its top-left corner at (x, y), 16x24. */
  drawSprite(sheet: SpriteSheet, frame: number, x: number, y: number): void;
}
