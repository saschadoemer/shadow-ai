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
 * One frame: ground, detail, the player, above. The sprite's top-left corner is at
 * (round(x) − 8, round(y) − 24): the feet are its bottom centre.
 */
export function drawScene(renderer: Renderer, state: GameState, content: SceneContent): void {
  renderer.clear(PAGE_BACKGROUND);
  drawLayer(renderer, content.map, content.tileset, 'ground');
  drawLayer(renderer, content.map, content.tileset, 'detail');
  const { player } = state;
  renderer.drawSprite(
    content.playerSheet,
    playerFrame(player),
    Math.round(player.x) - FRAME_WIDTH / 2,
    Math.round(player.y) - FRAME_HEIGHT,
  );
  drawLayer(renderer, content.map, content.tileset, 'above');
}
