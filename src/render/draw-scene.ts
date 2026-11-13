import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import type { Point, TileMap } from '../engine/tiled';
import { CREATURE_SIZE } from '../game/creature';
import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
import { DARK_STEPS } from '../game/overview';
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
import {
  type Renderer,
  type SpriteSheet,
  SURFACE_HEIGHT,
  SURFACE_WIDTH,
  type TilesetImage,
} from './renderer';

/** Everything a frame draws from, loaded once by main.ts. */
export interface SceneContent {
  readonly map: TileMap;
  readonly tileset: TilesetImage;
  readonly playerSheet: SpriteSheet;
  /** Four 48x48 frames, one per facing in FACINGS order (0007). */
  readonly lampSheet: SpriteSheet;
  /** One sheet per species: three 16x16 frames — two free, one frozen (0008). */
  readonly creatureSheets: Readonly<Record<Species, SpriteSheet>>;
  /** Two 8x8 frames: a light that is on, a light that is out (0009). */
  readonly overviewSheet: SpriteSheet;
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

/** The lights of overview (0009): 8x8, 4 px from the corner, one every 10 px. */
export const LIGHT_SIZE = 8;
export const LIGHT_MARGIN = 4;
export const LIGHT_PITCH = 10;
const LIGHT_ON_FRAME = 0;
const LIGHT_OUT_FRAME = 1;

/** A safe figure is left out in every second group of four steps. */
export const BLINK_STEPS = 4;

export function playerVisible(player: PlayerState): boolean {
  return Math.floor(player.grace / BLINK_STEPS) % 2 === 0;
}

/** The lids move 3 px per step: closed, 90 px each, from step 30 to step 60 of the dark. */
export const LID_PX_PER_STEP = 3;
const LID_CLOSED = SURFACE_HEIGHT / 2;

/** The height of each lid at step `dark`: 3d closing, 90 closed, 3 × (90 − d) opening; 0 at 0. */
export function lidHeight(dark: number): number {
  return Math.min(LID_PX_PER_STEP * Math.min(dark, DARK_STEPS - dark), LID_CLOSED);
}

/**
 * One frame: ground, detail, the cone when the lamp is on, the creatures in array order, the
 * player, above, all shifted by the camera. The sprite's top-left corner is at (round(x) − 8 − camera.x, round(y) − 24 −
 * camera.y): the feet are its bottom centre, and the camera is already whole pixels
 * (engine/camera). The cone lies under the figure, so the body hides the apex. After `above`
 * come the lights of overview, on the surface and not shifted by the camera, and the two lids of
 * the dark (0009). A safe figure blinks; its cone does not.
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
  if (playerVisible(player)) {
    renderer.drawSprite(
      content.playerSheet,
      playerFrame(player),
      Math.round(player.x) - FRAME_WIDTH / 2 - camera.x,
      Math.round(player.y) - FRAME_HEIGHT - camera.y,
    );
  }
  drawLayer(renderer, content.map, content.tileset, 'above', camera);
  for (let i = 0; i < state.overview.max; i += 1) {
    renderer.drawSprite(
      content.overviewSheet,
      i < state.overview.current ? LIGHT_ON_FRAME : LIGHT_OUT_FRAME,
      LIGHT_MARGIN + i * LIGHT_PITCH,
      LIGHT_MARGIN,
    );
  }
  const lid = lidHeight(state.dark);
  if (lid > 0) {
    renderer.fillRect(0, 0, SURFACE_WIDTH, lid, PAGE_BACKGROUND);
    renderer.fillRect(0, SURFACE_HEIGHT - lid, SURFACE_WIDTH, lid, PAGE_BACKGROUND);
  }
}
