import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import type { Point, TileMap } from '../engine/tiled';
import { CREATURE_SIZE } from '../game/creature';
import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
import {
  type CreatureState,
  FACINGS,
  type GameState,
  PHASES_PER_FACING,
  type PlayerState,
  type Species,
} from '../game/state';
import { drawLayer } from './draw-map';
import { PAGE_BACKGROUND } from './palette';
import type { Renderer, SpriteSheet, TilesetImage } from './renderer';

/** Everything a frame draws from, loaded once by main.ts. */
export interface SceneContent {
  readonly map: TileMap;
  readonly tileset: TilesetImage;
  readonly playerSheet: SpriteSheet;
  /** Four 48x48 frames, one per facing in FACINGS order (0007). */
  readonly lampSheet: SpriteSheet;
  /** One sheet per species: three 16x16 frames — two free, one frozen (0008). */
  readonly creatureSheets: Readonly<Record<Species, SpriteSheet>>;
}

/** The frame in the player sheet: facing × 5 + phase, facings in FACINGS order. */
export function playerFrame(player: PlayerState): number {
  return FACINGS.indexOf(player.facing) * PHASES_PER_FACING + player.frame;
}

/** The frame in the lamp sheet: the facing's index. */
export function lampFrame(player: PlayerState): number {
  return FACINGS.indexOf(player.facing);
}

/**
 * The top-left corner of the lamp frame on the surface (0007): the apex, (round(x),
 * round(y) − 12), rounded as the figure's sprite rounds, minus the frame's apex pixel, minus
 * the camera — so cone and figure agree pixel for pixel.
 */
export function lampFrameOrigin(player: PlayerState, camera: Point): Point {
  const apex = FRAME_APEX[player.facing];
  return {
    x: Math.round(player.x) - apex.x - camera.x,
    y: Math.round(player.y) - LAMP_HEIGHT - apex.y - camera.y,
  };
}

/** A free creature changes its frame every 15 steps: four changes per second. */
export const FLUTTER_STEPS = 15;
export const FROZEN_FRAME = 2;

/** Frozen in the light: frame 2, still. Free: frames 0 and 1 in turn, by the state's tick. */
export function creatureFrame(creature: CreatureState, tick: number): number {
  return creature.light > 0 ? FROZEN_FRAME : Math.floor(tick / FLUTTER_STEPS) % 2;
}

/** The top-left corner of a creature's frame on the surface: the feet are its bottom centre. */
export function creatureOrigin(creature: CreatureState, camera: Point): Point {
  return {
    x: Math.round(creature.x) - CREATURE_SIZE / 2 - camera.x,
    y: Math.round(creature.y) - CREATURE_SIZE - camera.y,
  };
}

/**
 * One frame: ground, detail, the cone when the lamp is on, the creatures in array order, the
 * player, above, all shifted by the camera. The sprite's top-left corner is at (round(x) − 8 − camera.x, round(y) − 24 −
 * camera.y): the feet are its bottom centre, and the camera is already whole pixels
 * (engine/camera). The cone lies under the figure, so the body hides the apex.
 */
export function drawScene(renderer: Renderer, state: GameState, content: SceneContent): void {
  const { player, camera } = state;
  renderer.clear(PAGE_BACKGROUND);
  drawLayer(renderer, content.map, content.tileset, 'ground', camera);
  drawLayer(renderer, content.map, content.tileset, 'detail', camera);
  if (state.lamp.on) {
    const origin = lampFrameOrigin(player, camera);
    renderer.drawSprite(content.lampSheet, lampFrame(player), origin.x, origin.y);
  }
  for (const creature of state.creatures) {
    const origin = creatureOrigin(creature, camera);
    renderer.drawSprite(
      content.creatureSheets[creature.species],
      creatureFrame(creature, state.tick),
      origin.x,
      origin.y,
    );
  }
  renderer.drawSprite(
    content.playerSheet,
    playerFrame(player),
    Math.round(player.x) - FRAME_WIDTH / 2 - camera.x,
    Math.round(player.y) - FRAME_HEIGHT - camera.y,
  );
  drawLayer(renderer, content.map, content.tileset, 'above', camera);
}
