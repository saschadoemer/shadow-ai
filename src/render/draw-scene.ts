import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import type { Point, TileMap } from '../engine/tiled';
import { CREATURE_SIZE } from '../game/creature';
import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
import { DOG_LOOKS, MOVER_SIZE } from '../game/mover';
import { DARK_STEPS } from '../game/overview';
import {
  type CreatureState,
  FACINGS,
  type GameState,
  type MoverState,
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
  /** Two 8x8 frames: a full heart, an empty heart (0009, 0012). */
  readonly overviewSheet: SpriteSheet;
  /** The movers' sheets (0015): one per person, the dogs' 24 frames, two frames each for the vacuum and the drone. */
  readonly moverSheets: {
    readonly person: readonly SpriteSheet[];
    readonly dog: SpriteSheet;
    readonly vacuum: SpriteSheet;
    readonly drone: SpriteSheet;
  };
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

/** A dog's sheet holds, per look, facing × 3 + phase (0015). */
export const DOG_PHASES = 3;
export const DOG_FRAMES_PER_LOOK = FACINGS.length * DOG_PHASES;
/** The vacuum's light changes twice a second; the rotors change 15 times a second. */
export const VACUUM_BLINK_STEPS = 30;
export const DRONE_ROTOR_STEPS = 4;
/** The drone hangs 1 px higher in every second half second. */
export const DRONE_BOB_STEPS = 30;

/** The frame of a mover in its sheet (0015). */
export function moverFrame(mover: MoverState, tick: number): number {
  const facing = FACINGS.indexOf(mover.facing);
  switch (mover.kind) {
    case 'person':
      return facing * PHASES_PER_FACING + mover.frame;
    case 'dog':
      return (mover.look % DOG_LOOKS) * DOG_FRAMES_PER_LOOK + facing * DOG_PHASES + mover.frame;
    case 'vacuum':
      return Math.floor(tick / VACUUM_BLINK_STEPS) % 2;
    case 'drone':
      return Math.floor(tick / DRONE_ROTOR_STEPS) % 2;
  }
}

/** The top-left corner of a mover's frame on the surface: the feet are its bottom centre. */
export function moverOrigin(mover: MoverState, camera: Point, tick: number): Point {
  const height = mover.kind === 'person' ? FRAME_HEIGHT : MOVER_SIZE;
  const bob = mover.kind === 'drone' ? Math.floor(tick / DRONE_BOB_STEPS) % 2 : 0;
  return {
    x: Math.round(mover.x) - MOVER_SIZE / 2 - camera.x,
    y: Math.round(mover.y) - height - bob - camera.y,
  };
}

function moverSheet(content: SceneContent, mover: MoverState): SpriteSheet | undefined {
  return mover.kind === 'person'
    ? content.moverSheets.person[mover.look]
    : content.moverSheets[mover.kind];
}

function drawMovers(
  renderer: Renderer,
  movers: readonly MoverState[],
  state: GameState,
  content: SceneContent,
): void {
  for (const mover of movers) {
    const sheet = moverSheet(content, mover);
    if (sheet === undefined) {
      continue;
    }
    const origin = moverOrigin(mover, state.camera, state.tick);
    renderer.drawSprite(sheet, moverFrame(mover, state.tick), origin.x, origin.y);
  }
}

/** The hearts of overview (0009, 0012): 8x8, 4 px from the corner, one every 10 px. */
export const HEART_SIZE = 8;
export const HEART_MARGIN = 4;
export const HEART_PITCH = 10;
const HEART_FULL_FRAME = 0;
const HEART_EMPTY_FRAME = 1;

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
 * One frame: ground, detail, the cone when the lamp is on, the ground movers whose feet are at
 * or above the figure's, the creatures in array order, the player, the other ground movers,
 * above, the drones (0015), all shifted by the camera. The sprite's top-left corner is at (round(x) − 8 − camera.x, round(y) − 24 −
 * camera.y): the feet are its bottom centre, and the camera is already whole pixels
 * (engine/camera). The cone lies under the figure, so the body hides the apex. After `above`
 * come the hearts of overview, on the surface and not shifted by the camera, and the two lids of
 * the dark (0009). A safe figure blinks; its cone and the movers do not.
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
  const ground = state.movers.filter((mover) => mover.kind !== 'drone');
  drawMovers(
    renderer,
    ground.filter((mover) => mover.y <= player.y),
    state,
    content,
  );
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
  drawMovers(
    renderer,
    ground.filter((mover) => mover.y > player.y),
    state,
    content,
  );
  drawLayer(renderer, content.map, content.tileset, 'above', camera);
  drawMovers(
    renderer,
    state.movers.filter((mover) => mover.kind === 'drone'),
    state,
    content,
  );
  for (let i = 0; i < state.overview.max; i += 1) {
    renderer.drawSprite(
      content.overviewSheet,
      i < state.overview.current ? HEART_FULL_FRAME : HEART_EMPTY_FRAME,
      HEART_MARGIN + i * HEART_PITCH,
      HEART_MARGIN,
    );
  }
  const lid = lidHeight(state.dark);
  if (lid > 0) {
    renderer.fillRect(0, 0, SURFACE_WIDTH, lid, PAGE_BACKGROUND);
    renderer.fillRect(0, SURFACE_HEIGHT - lid, SURFACE_WIDTH, lid, PAGE_BACKGROUND);
  }
}
