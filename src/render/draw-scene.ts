import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import type { TileMap } from '../engine/tiled';
import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../game/state';
import { drawLayer } from './draw-map';
import { PAGE_BACKGROUND } from './palette';
import type { Renderer, SpriteSheet, TilesetImage } from './renderer';

/** Everything a frame draws from, loaded once by main.ts. */
export interface SceneContent {
  readonly map: TileMap;
  readonly tileset: TilesetImage;
  readonly playerSheet: SpriteSheet;
}

/** The frame in the player sheet: facing × 5 + phase, facings in FACINGS order. */
export function playerFrame(player: PlayerState): number {
  return FACINGS.indexOf(player.facing) * PHASES_PER_FACING + player.frame;
}

/**
 * One frame: ground, detail, the player, above, all shifted by the camera. The sprite's top-left
 * corner is at (round(x) − 8 − camera.x, round(y) − 24 − camera.y): the feet are its bottom
 * centre, and the camera is already whole pixels (engine/camera).
 */
export function drawScene(renderer: Renderer, state: GameState, content: SceneContent): void {
  const { player, camera } = state;
  renderer.clear(PAGE_BACKGROUND);
  drawLayer(renderer, content.map, content.tileset, 'ground', camera);
  drawLayer(renderer, content.map, content.tileset, 'detail', camera);
  renderer.drawSprite(
    content.playerSheet,
    playerFrame(player),
    Math.round(player.x) - FRAME_WIDTH / 2 - camera.x,
    Math.round(player.y) - FRAME_HEIGHT - camera.y,
  );
  drawLayer(renderer, content.map, content.tileset, 'above', camera);
}
