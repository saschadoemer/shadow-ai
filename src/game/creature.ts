import { moveBox, sightBlocked } from '../engine/collision';
import { STEPS_PER_SECOND } from '../engine/loop';
import { type NamedPoint, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { inCone, lampCone } from './lamp';
import { BOX_HEIGHT, BOX_WIDTH } from './player';
import {
  type Captured,
  type CreatureState,
  type PlayerState,
  SPECIES,
  type Species,
} from './state';

/**
 * The creatures (gameplay.md §2 and §3, feature 0008). A small creature rests until the figure
 * is near, comes straight toward it, freezes while the lamp's light is on it and is captured
 * when the light has been held for CAPTURE_STEPS steps without a break. Pure data and pure
 * functions: one creature, one step.
 */

/** Tune: four tiles. At this distance and beyond a creature rests. */
export const NOTICE_RADIUS = 64;
/** Tune: by its own movement a creature never comes closer than this. */
export const TOUCH_DISTANCE = 8;
/** Tune: half the figure's speed, 2/3 px per step. */
export const CREATURE_SPEED_PX_PER_SECOND = 40;
/** Tune: one second of unbroken light. */
export const CAPTURE_STEPS = 60;
/** A creature's sprite is one tile, 16x16; its feet are the bottom centre. */
export const CREATURE_SIZE = 16;

const STEP_DISTANCE = CREATURE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND;

/** The centre of the sprite: the point the lamp is tested against. */
export function bodyPoint(creature: CreatureState): Point {
  return { x: creature.x, y: creature.y - CREATURE_SIZE / 2 };
}

/**
 * Lit: the lamp is on, the body point is in the cone, and no solid cell lies on the line from
 * the centre of the figure's collision box to the body point. The line starts at the box and
 * not at the cone's apex, because the apex is inside a wall when the figure stands under one.
 */
export function isLit(
  creature: CreatureState,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): boolean {
  if (!lampOn) {
    return false;
  }
  const body = bodyPoint(creature);
  return (
    inCone(body, lampCone(player)) &&
    !sightBlocked({ x: player.x, y: player.y - BOX_HEIGHT / 2 }, body, map)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Not lit: the count starts again, and the creature moves toward the figure's feet when they are
 * closer than NOTICE_RADIUS and farther than TOUCH_DISTANCE — by 2/3 px, or by what is left to
 * TOUCH_DISTANCE. The figure's box against the solid grid, X then Y, then the clamp to the map.
 */
function approach(creature: CreatureState, player: PlayerState, map: TileMap): CreatureState {
  const dx = player.x - creature.x;
  const dy = player.y - creature.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= NOTICE_RADIUS || distance <= TOUCH_DISTANCE) {
    return { ...creature, light: 0 };
  }
  const reach = Math.min(STEP_DISTANCE, distance - TOUCH_DISTANCE);
  const box = moveBox(
    {
      x: creature.x - BOX_WIDTH / 2,
      y: creature.y - BOX_HEIGHT,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
    },
    (dx / distance) * reach,
    (dy / distance) * reach,
    map,
  );
  const half = CREATURE_SIZE / 2;
  return {
    ...creature,
    x: clamp(box.x + BOX_WIDTH / 2, half, map.width * TILE_SIZE - half),
    y: clamp(box.y + BOX_HEIGHT, CREATURE_SIZE, map.height * TILE_SIZE),
    light: 0,
  };
}

/** One step of one creature against the stepped figure; null in the step it is captured. */
export function stepCreature(
  creature: CreatureState,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): CreatureState | null {
  if (!isLit(creature, player, lampOn, map)) {
    return approach(creature, player, map);
  }
  const light = creature.light + 1;
  return light >= CAPTURE_STEPS ? null : { ...creature, light };
}

/** One step of all creatures, in order: the captured ones leave the list and are counted. */
export function stepCreatures(
  creatures: readonly CreatureState[],
  captured: Captured,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): { readonly creatures: readonly CreatureState[]; readonly captured: Captured } {
  const remaining: CreatureState[] = [];
  const counts: Record<Species, number> = { ...captured };
  for (const creature of creatures) {
    const next = stepCreature(creature, player, lampOn, map);
    if (next === null) {
      counts[creature.species] += 1;
    } else {
      remaining.push(next);
    }
  }
  return { creatures: remaining, captured: counts };
}

function isSpecies(name: string): name is Species {
  return (SPECIES as readonly string[]).includes(name);
}

/**
 * The creatures a map starts with: one per named point, whose name is its species. Any other
 * name is an error, so a typing mistake in the map is not a silently missing creature.
 */
export function creaturesFrom(points: readonly NamedPoint[]): CreatureState[] {
  return points.map((point) => {
    if (!isSpecies(point.name)) {
      throw new Error(`unknown point object "${point.name}" at (${point.x}, ${point.y})`);
    }
    return {
      species: point.name,
      x: point.x,
      y: point.y,
      light: 0,
      home: { x: point.x, y: point.y },
    };
  });
}

/** Nothing captured yet. A literal, so a new species does not compile until it is listed. */
export function noCaptures(): Captured {
  return { snippet: 0 };
}
