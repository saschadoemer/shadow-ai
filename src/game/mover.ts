import type { Box, SolidGrid } from '../engine/collision';
import { type NamedPoint, type Point, TILE_SIZE } from '../engine/tiled';
import { BOX_HEIGHT, BOX_WIDTH } from './player';
import { MOVER_KINDS, type MoverKind, type MoverState } from './state';

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
