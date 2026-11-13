import type { Box, SolidGrid } from '../engine/collision';
import { STEPS_PER_SECOND } from '../engine/loop';
import { type NamedPoint, type Point, TILE_SIZE } from '../engine/tiled';
import { BOX_HEIGHT, BOX_WIDTH } from './player';
import {
  type Facing,
  MOVER_KINDS,
  type MoverKind,
  type MoverState,
  type PlayerState,
} from './state';

/**
 * The movers (world.md §1, feature 0015): colleagues, dogs, robot vacuums and drones on fixed
 * routes. A route is two to four points of the map, named `<kind>:<room>:<n>`; a mover goes
 * from point to point in a straight line, waits each point's pause and starts again after the
 * last. Nothing here is solid. Pure data and pure functions; the routes are read from the
 * map's points on every call and kept nowhere.
 */

/** The rooms that have movers; `<room>` in a point's name. */
export const ROOMS = [
  'hr',
  'accounting',
  'development',
  'reception',
  'break-room',
  'sales',
  'marketing',
  'support',
] as const;

export const MIN_ROUTE_POINTS = 2;
export const MAX_ROUTE_POINTS = 4;
/** Ten seconds. */
export const MAX_PAUSE = 600;
/** Dogs come in two coats. */
export const DOG_LOOKS = 2;

/** Tune: half the figure's speed for a person; a dog trots, a vacuum crawls. */
export const SPEED_PX_PER_SECOND: Readonly<Record<MoverKind, number>> = {
  person: 40,
  dog: 60,
  vacuum: 20,
  drone: 30,
};
/** Tune: closer than this to the figure's feet, a ground mover stands. */
export const YIELD_DISTANCE = 20;
/** Tune: four phases per second, half the figure's rate at half its speed. */
export const PERSON_STEPS_PER_PHASE = 15;
export const PERSON_WALK_PHASES = 4;
export const DOG_STEPS_PER_PHASE = 8;
export const DOG_SIT_FRAME = 2;
/** A dog's, a vacuum's and a drone's sprite is one tile; a person's is the figure's 16x24. */
export const MOVER_SIZE = 16;

/** Sums of thirds do not land exactly; this is far below a pixel and far above the error. */
const ARRIVAL_SLACK = 1e-6;

export interface RoutePoint extends Point {
  /** Steps a mover waits here. */
  readonly pause: number;
}

export interface Route {
  /** `<kind>:<room>`. */
  readonly name: string;
  readonly kind: MoverKind;
  readonly points: readonly RoutePoint[];
}

/** A route point has a colon in its name; every other point is a creature's or `wake`. */
export function isRoutePoint(name: string): boolean {
  return name.includes(':');
}

function isKind(value: string | undefined): value is MoverKind {
  return (MOVER_KINDS as readonly (string | undefined)[]).includes(value);
}

function isRoom(value: string): boolean {
  return (ROOMS as readonly string[]).includes(value);
}

/**
 * The routes of a map, in the order in which each route's first point appears. Rejects a name
 * that is no route point, an unknown room, a pause outside 0–MAX_PAUSE, a number used twice, a
 * route with fewer than two or more than four points, and a gap in the numbers.
 */
export function routesOf(points: readonly NamedPoint[]): Route[] {
  const groups = new Map<string, { kind: MoverKind; numbered: Map<number, RoutePoint> }>();
  for (const point of points) {
    if (!isRoutePoint(point.name)) {
      continue;
    }
    const [kind, room, n, ...rest] = point.name.split(':');
    if (
      !isKind(kind) ||
      room === undefined ||
      n === undefined ||
      rest.length > 0 ||
      !/^[1-9]\d*$/.test(n)
    ) {
      throw new Error(`point ${point.name} is not a route point`);
    }
    if (!isRoom(room)) {
      throw new Error(`point ${point.name} names no room`);
    }
    const pause = point.pause ?? 0;
    if (!Number.isInteger(pause) || pause < 0 || pause > MAX_PAUSE) {
      throw new Error(`point ${point.name} has pause ${pause}, 0 to ${MAX_PAUSE} are allowed`);
    }
    const name = `${kind}:${room}`;
    const group = groups.get(name) ?? { kind, numbered: new Map<number, RoutePoint>() };
    groups.set(name, group);
    const number = Number(n);
    if (group.numbered.has(number)) {
      throw new Error(`route ${name} has two points ${number}`);
    }
    group.numbered.set(number, { x: point.x, y: point.y, pause });
  }
  return [...groups].map(([name, group]) => {
    const count = group.numbered.size;
    if (count < MIN_ROUTE_POINTS || count > MAX_ROUTE_POINTS) {
      throw new Error(
        `route ${name} has ${count} ${count === 1 ? 'point' : 'points'}, ${MIN_ROUTE_POINTS} to ${MAX_ROUTE_POINTS} are allowed`,
      );
    }
    const ordered: RoutePoint[] = [];
    for (let number = 1; number <= count; number += 1) {
      const point = group.numbered.get(number);
      if (point === undefined) {
        throw new Error(`route ${name} has no point ${number}`);
      }
      ordered.push(point);
    }
    return { name, kind: group.kind, points: ordered };
  });
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** The first cell, row by row, in which the box meets a solid box; null when it meets none. */
function firstSolidCell(box: Box, grid: SolidGrid): Point | null {
  const lastColumn = Math.min(Math.ceil((box.x + box.width) / TILE_SIZE) - 1, grid.width - 1);
  const lastRow = Math.min(Math.ceil((box.y + box.height) / TILE_SIZE) - 1, grid.height - 1);
  for (let row = Math.max(Math.floor(box.y / TILE_SIZE), 0); row <= lastRow; row += 1) {
    for (
      let column = Math.max(Math.floor(box.x / TILE_SIZE), 0);
      column <= lastColumn;
      column += 1
    ) {
      const solids = grid.solids[row * grid.width + column] ?? [];
      if (solids.some((solid) => overlaps(box, solid))) {
        return { x: column, y: row };
      }
    }
  }
  return null;
}

/**
 * Every leg, the one from the last point to the first included, is horizontal or vertical; on
 * a ground route the mover's box — the figure's, [x − 6, x + 6) × [y − 8, y) — meets no solid
 * box on the way. A drone's legs may cross anything.
 */
export function checkRoutes(routes: readonly Route[], grid: SolidGrid): void {
  for (const route of routes) {
    for (const [index, from] of route.points.entries()) {
      const to = route.points[(index + 1) % route.points.length];
      if (to === undefined) {
        continue;
      }
      if (from.x !== to.x && from.y !== to.y) {
        throw new Error(`route ${route.name} leg ${index + 1} is not straight`);
      }
      if (route.kind === 'drone') {
        continue;
      }
      const cell = firstSolidCell(
        {
          x: Math.min(from.x, to.x) - BOX_WIDTH / 2,
          y: Math.min(from.y, to.y) - BOX_HEIGHT,
          width: Math.abs(to.x - from.x) + BOX_WIDTH,
          height: Math.abs(to.y - from.y) + BOX_HEIGHT,
        },
        grid,
      );
      if (cell !== null) {
        throw new Error(
          `route ${route.name} leg ${index + 1} crosses a solid tile (${cell.x}, ${cell.y})`,
        );
      }
    }
  }
}

/** One mover per route, in route order: on point 1, facing down, waiting point 1's pause. */
export function moversFrom(routes: readonly Route[]): MoverState[] {
  return routes.flatMap((route, index) => {
    const first = route.points[0];
    if (first === undefined) {
      return [];
    }
    const earlier = routes.slice(0, index).filter((other) => other.kind === route.kind).length;
    const look = route.kind === 'person' ? earlier : route.kind === 'dog' ? earlier % DOG_LOOKS : 0;
    return [
      {
        kind: route.kind,
        look,
        route: index,
        x: first.x,
        y: first.y,
        facing: 'down' as const,
        frame: 0,
        frameTimer: 0,
        target: 1,
        wait: first.pause,
      },
    ];
  });
}

/** The frame of a mover that moves in this step. */
function walkFrame(mover: MoverState): { readonly frame: number; readonly frameTimer: number } {
  if (mover.kind === 'person') {
    if (mover.frame === 0) {
      return { frame: 1, frameTimer: 0 };
    }
    return mover.frameTimer + 1 < PERSON_STEPS_PER_PHASE
      ? { frame: mover.frame, frameTimer: mover.frameTimer + 1 }
      : { frame: (mover.frame % PERSON_WALK_PHASES) + 1, frameTimer: 0 };
  }
  if (mover.kind === 'dog') {
    if (mover.frame === DOG_SIT_FRAME) {
      return { frame: 0, frameTimer: 0 };
    }
    return mover.frameTimer + 1 < DOG_STEPS_PER_PHASE
      ? { frame: mover.frame, frameTimer: mover.frameTimer + 1 }
      : { frame: 1 - mover.frame, frameTimer: 0 };
  }
  return { frame: 0, frameTimer: 0 };
}

function legFacing(mover: MoverState, dx: number, dy: number): Facing {
  if (mover.kind === 'vacuum' || mover.kind === 'drone') {
    return 'down';
  }
  if (dx !== 0) {
    return dx > 0 ? 'right' : 'left';
  }
  if (dy !== 0) {
    return dy > 0 ? 'down' : 'up';
  }
  return mover.facing;
}

/**
 * One mover, one step (0015). A ground mover closer than YIELD_DISTANCE to the figure's feet
 * stands, and nothing else changes. Otherwise it waits, or moves toward its target by its speed
 * or by what is left; on arrival it stands on the point, takes the point's pause and turns to
 * the next point, the first after the last. A leg is straight (`checkRoutes`), so |dx| + |dy|
 * is its length and only one of the two signs is not 0.
 */
export function stepMover(mover: MoverState, route: Route, player: PlayerState): MoverState {
  if (
    mover.kind !== 'drone' &&
    Math.hypot(player.x - mover.x, player.y - mover.y) < YIELD_DISTANCE
  ) {
    return { ...mover, frame: 0, frameTimer: 0 };
  }
  if (mover.wait > 0) {
    return {
      ...mover,
      wait: mover.wait - 1,
      frame: mover.kind === 'dog' ? DOG_SIT_FRAME : 0,
      frameTimer: 0,
    };
  }
  const target = route.points[mover.target];
  if (target === undefined) {
    return mover;
  }
  const dx = target.x - mover.x;
  const dy = target.y - mover.y;
  const left = Math.abs(dx) + Math.abs(dy);
  const distance = SPEED_PX_PER_SECOND[mover.kind] / STEPS_PER_SECOND;
  const moving = { ...mover, ...walkFrame(mover), facing: legFacing(mover, dx, dy) };
  if (left <= distance + ARRIVAL_SLACK) {
    return {
      ...moving,
      x: target.x,
      y: target.y,
      target: (mover.target + 1) % route.points.length,
      wait: target.pause,
    };
  }
  return {
    ...moving,
    x: mover.x + Math.sign(dx) * distance,
    y: mover.y + Math.sign(dy) * distance,
  };
}

/** Every mover against the figure, in array order. */
export function stepMovers(
  movers: readonly MoverState[],
  routes: readonly Route[],
  player: PlayerState,
): MoverState[] {
  return movers.map((mover) => {
    const route = routes[mover.route];
    return route === undefined ? mover : stepMover(mover, route, player);
  });
}
