import { type Box, sightBlocked } from '../engine/collision';
import type { NamedRect, Point, TileMap } from '../engine/tiled';
import { BOX_HEIGHT } from './player';
import { isCell, REST_PREFIX, rectsOf } from './rects';
import { areasOf, shadowedAreas, veilOf } from './region';
import type { SolvedCase } from './state';

/**
 * The rests (gameplay.md §4, feature 0027): where overview is won back without falling into
 * the dark. A rest is a rectangle of the map named `rest:<what>`, exactly one cell, on the cell
 * of the thing it is — a coffee machine. Pure data and pure functions; the rests are read from
 * the map's rectangles on every call and kept nowhere.
 */

export interface Rest {
  /** What the rest is: `coffee`. */
  readonly what: string;
  /** Map pixels: one cell. */
  readonly box: Box;
}

/** Tune: two tiles from the player's feet to the centre of the rest's cell. */
export const REST_DISTANCE = 32;

/** The rests of a map, in the order of its rectangles. Rejects a box that is not one cell. */
export function restsOf(rects: readonly NamedRect[]): Rest[] {
  return rectsOf(rects, REST_PREFIX).map((rect) => {
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (!isCell(box)) {
      throw new Error(
        `rest ${rect.name} (${box.x}, ${box.y}, ${box.width}, ${box.height}) is not one cell`,
      );
    }
    return { what: rect.name.slice(REST_PREFIX.length), box };
  });
}

/** The centre of a rest's cell. */
export function restCentre(rest: Rest): Point {
  return { x: rest.box.x + rest.box.width / 2, y: rest.box.y + rest.box.height / 2 };
}

/**
 * The rest a press takes: the nearest whose cell centre is at most REST_DISTANCE from the
 * player's feet and in sight — no opaque box of the map as loaded on the line from the centre
 * of the player's box to the centre of the cell, the lamp's test — the first in the file of two
 * equally near; null when none is. A machine behind a wall is not in reach, however near.
 */
export function restInReach(player: Point, rests: readonly Rest[], map: TileMap): Rest | null {
  let nearest: Rest | null = null;
  let reach = REST_DISTANCE;
  for (const rest of rests) {
    const centre = restCentre(rest);
    const distance = Math.hypot(centre.x - player.x, centre.y - player.y);
    if (
      distance <= reach &&
      (nearest === null || distance < reach) &&
      !sightBlocked({ x: player.x, y: player.y - BOX_HEIGHT / 2 }, centre, {
        width: map.width,
        height: map.height,
        solids: map.opaque,
      })
    ) {
      nearest = rest;
      reach = distance;
    }
  }
  return nearest;
}

/** Whether a rest's cell is under shadow: in an area of a region with shadow that is not cleared. */
export function restUnderShadow(
  rest: Rest,
  rects: readonly NamedRect[],
  solved: readonly SolvedCase[],
): boolean {
  const areas = shadowedAreas(areasOf(rects), solved);
  return veilOf(areas, rest.box.x / rest.box.width, rest.box.y / rest.box.height) > 0;
}
