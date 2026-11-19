import { moveBox, sightBlocked } from '../engine/collision';
import { STEPS_PER_SECOND } from '../engine/loop';
import { type NamedPoint, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { isFigurePoint } from './cast';
import { DIRECTIONS, inCone, lampCone, SPREAD } from './lamp';
import { isRoutePoint } from './mover';
import { WAKE_POINT } from './overview';
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
 * when the light has been held for CAPTURE_STEPS steps without a break. Each species has its
 * habits (0032): how near the figure must be, how fast it comes, and whether it moves only
 * while nobody looks at it. Pure data and pure functions: one creature, one step.
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
/** Tune: six tiles. At this distance and beyond a mirage rests (0032). */
export const MIRAGE_NOTICE_RADIUS = 96;
/** Tune: three quarters of the figure's speed, 1 px per step (0032). */
export const MIRAGE_SPEED_PX_PER_SECOND = 60;

/** What a species does while the lamp is not on it. */
export interface Habits {
  /** At this distance from the figure's feet and beyond it rests. */
  readonly noticeRadius: number;
  /** How far it moves in one step, in pixels. */
  readonly stepDistance: number;
  /** Whether it moves only while it is not looked at. */
  readonly shy: boolean;
}

/** A literal over the species, so a new species does not compile until it has its habits. */
export const HABITS: Readonly<Record<Species, Habits>> = {
  snippet: {
    noticeRadius: NOTICE_RADIUS,
    stepDistance: CREATURE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND,
    shy: false,
  },
  mirage: {
    noticeRadius: MIRAGE_NOTICE_RADIUS,
    stepDistance: MIRAGE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND,
    shy: true,
  },
  // On the floor a lurker goes by the snippet's rule in everything (0038).
  lurker: {
    noticeRadius: NOTICE_RADIUS,
    stepDistance: CREATURE_SPEED_PX_PER_SECOND / STEPS_PER_SECOND,
    shy: false,
  },
};

/** The centre of the sprite: the point the lamp is tested against. */
export function bodyPoint(creature: CreatureState): Point {
  return { x: creature.x, y: creature.y - CREATURE_SIZE / 2 };
}

/**
 * Lit: the lamp is on, the body point is in the cone, and no opaque box lies on the line from
 * the centre of the figure's collision box to the body point. The line starts at the box and
 * not at the cone's apex, because the apex is inside a wall when the figure stands under one.
 * Furniture that is low does not block the light; it still stops the walk (feature 0011).
 * `spread` is the cone's (0029).
 */
export function isLit(
  creature: CreatureState,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
  spread: number = SPREAD,
): boolean {
  if (!lampOn) {
    return false;
  }
  const body = bodyPoint(creature);
  return (
    inCone(body, lampCone(player), spread) &&
    !sightBlocked({ x: player.x, y: player.y - BOX_HEIGHT / 2 }, body, {
      width: map.width,
      height: map.height,
      solids: map.opaque,
    })
  );
}

/**
 * Looked at (0032): the creature is in front of the figure and in its sight. With C the centre
 * of the figure's collision box and B the creature's body point, the vector from C to B has a
 * component above 0 along the figure's facing, and no opaque box lies on the line from C to B.
 * A creature exactly beside the figure is not looked at. `map` is the map with the shadow
 * walls standing, as for the lamp's light.
 */
export function isWatched(creature: CreatureState, player: PlayerState, map: TileMap): boolean {
  const eye = { x: player.x, y: player.y - BOX_HEIGHT / 2 };
  const body = bodyPoint(creature);
  const direction = DIRECTIONS[player.facing];
  const ahead = (body.x - eye.x) * direction.x + (body.y - eye.y) * direction.y;
  return (
    ahead > 0 &&
    !sightBlocked(eye, body, { width: map.width, height: map.height, solids: map.opaque })
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Not lit: the count starts again. A shy creature that is looked at stands. Otherwise the
 * creature moves toward the figure's feet when they are closer than its notice radius and
 * farther than TOUCH_DISTANCE — by its step distance, or by what is left to TOUCH_DISTANCE.
 * The figure's box against the solid boxes, X then Y, then the clamp to the map.
 */
function approach(creature: CreatureState, player: PlayerState, map: TileMap): CreatureState {
  const habits = HABITS[creature.species];
  const dx = player.x - creature.x;
  const dy = player.y - creature.y;
  const distance = Math.hypot(dx, dy);
  if (
    distance >= habits.noticeRadius ||
    distance <= TOUCH_DISTANCE ||
    (habits.shy && isWatched(creature, player, map))
  ) {
    return { ...creature, light: 0 };
  }
  const reach = Math.min(habits.stepDistance, distance - TOUCH_DISTANCE);
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
  spread: number = SPREAD,
): CreatureState | null {
  if (!isLit(creature, player, lampOn, map, spread)) {
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
  spread: number = SPREAD,
): { readonly creatures: readonly CreatureState[]; readonly captured: Captured } {
  const remaining: CreatureState[] = [];
  const counts: Record<Species, number> = { ...captured };
  for (const creature of creatures) {
    const next = stepCreature(creature, player, lampOn, map, spread);
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
 * The creatures a map starts with: one per named point, whose name is its species. The `wake`
 * point (0009), the route points of the movers (0015) and the points of the standing figures
 * (0017) are the names besides the species, and they make no creature. Any other name is an error, so a typing mistake in the map is not a
 * silently missing creature.
 */
export function creaturesFrom(points: readonly NamedPoint[]): CreatureState[] {
  return points
    .filter(
      (point) =>
        point.name !== WAKE_POINT && !isRoutePoint(point.name) && !isFigurePoint(point.name),
    )
    .map((point) => {
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
  return { snippet: 0, mirage: 0, lurker: 0 };
}
