import { type Box, sightBlocked } from '../engine/collision';
import { type NamedRect, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { CONE_LENGTH, type Cone, DIRECTIONS, lampCone } from './lamp';
import { BOX_HEIGHT } from './player';
import type { PlayerState } from './state';
import { densityOf } from './world';

/**
 * The shadow walls (gameplay.md §2 and §5, feature 0014). A wall is a rectangle of the map
 * named `shadow:<region>`: a strip 4 px thick on the top or the left edge of whole cells, in a
 * doorway. It has its region's density. While it stands it is solid and stops the light; the
 * lamp lifts it for good when its light has been on it for LIFT_STEPS steps without a break
 * and its strength meets the density. Pure data and pure functions; the walls are read from
 * the map's rectangles on every call and kept nowhere.
 */

/** A rectangle whose name starts with this is a shadow wall; the rest of the name is its region. */
export const WALL_PREFIX = 'shadow:';
/** A wall is as thick as a wall strip (0010). */
export const WALL_THICKNESS = 4;

export interface ShadowWall {
  readonly region: string;
  /** The region's density, 1–3 (game/world). */
  readonly density: number;
  /** Map pixels. */
  readonly box: Box;
}

function isSpan(length: number): boolean {
  return length > 0 && length % TILE_SIZE === 0;
}

/** A strip on a cell edge: the corner on the grid, 4 px one way and whole cells the other. */
function isStrip(box: Box): boolean {
  const onGrid = box.x % TILE_SIZE === 0 && box.y % TILE_SIZE === 0;
  const horizontal = box.height === WALL_THICKNESS && isSpan(box.width);
  const vertical = box.width === WALL_THICKNESS && isSpan(box.height);
  return onGrid && (horizontal || vertical);
}

/**
 * The shadow walls of a map, in the order of its rectangles. Rejects a rectangle with another
 * name, a region the world data does not know, a region without shadow and a box that is no
 * strip on a cell edge, so that a typing mistake in the map is not a silently missing wall.
 */
export function wallsOf(rects: readonly NamedRect[]): ShadowWall[] {
  return rects.map((rect) => {
    if (!rect.name.startsWith(WALL_PREFIX)) {
      throw new Error(`unknown rectangle object "${rect.name}"`);
    }
    const region = rect.name.slice(WALL_PREFIX.length);
    const density = densityOf(region);
    if (density === undefined) {
      throw new Error(`shadow wall ${rect.name} names no region`);
    }
    if (density === 0) {
      throw new Error(`shadow wall ${rect.name} stands in a region without shadow`);
    }
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (!isStrip(box)) {
      throw new Error(
        `shadow wall ${rect.name} (${box.x}, ${box.y}, ${box.width}, ${box.height}) is no strip on a cell edge`,
      );
    }
    return { region, density, box };
  });
}

/** The distance from 0 to the interval [from, to]; 0 when it contains 0. */
function gapTo(from: number, to: number): number {
  if (from > 0) {
    return from;
  }
  return to < 0 ? 0 - to : 0;
}

/**
 * Whether a box, its edges included, meets the cone. In the cone's own coordinates the box
 * spans d0 to d1 along the facing and s0 to s1 across it. With near = max(d0, 0), far =
 * min(d1, CONE_LENGTH) and gap the distance from 0 to [s0, s1], it meets the cone when
 * near ≤ far, near < CONE_LENGTH and gap ≤ far / 2: every case in which a point of the box
 * lies in the cone (lamp.inCone), and the limiting case in which the box touches the cone's
 * end. A sample of points would miss a figure flush below a wall, whose apex lies on the
 * wall's far edge.
 */
export function meetsCone(box: Box, cone: Cone): boolean {
  const direction = DIRECTIONS[cone.facing];
  const left = box.x - cone.apex.x;
  const right = left + box.width;
  const top = box.y - cone.apex.y;
  const bottom = top + box.height;
  const sideways = direction.x !== 0;
  const [a0, a1] = sideways ? [left, right] : [top, bottom];
  const [s0, s1] = sideways ? [top, bottom] : [left, right];
  // Facing left or up, "along" runs against the axis: the interval is mirrored.
  const forward = direction.x + direction.y > 0;
  const d0 = forward ? a0 : 0 - a1;
  const d1 = forward ? a1 : 0 - a0;
  const near = Math.max(d0, 0);
  const far = Math.min(d1, CONE_LENGTH);
  return near <= far && near < CONE_LENGTH && gapTo(s0, s1) <= far / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The point of the wall's box nearest to `from`. Along the wall the box ends at its last
 * pixel: the corner beyond it belongs to the next wall strip, whose box is half-open, and a
 * line that ended there would end inside that strip.
 */
function sightTarget(box: Box, from: Point): Point {
  const horizontal = box.width > box.height;
  return {
    x: clamp(from.x, box.x, box.x + box.width - (horizontal ? 1 : 0)),
    y: clamp(from.y, box.y, box.y + box.height - (horizontal ? 0 : 1)),
  };
}

/**
 * In the light: the lamp is on, the wall's box meets the cone, and no opaque box of the map
 * lies on the line from the centre of the figure's collision box to the nearest point of the
 * wall's box. `map` is the map as loaded, without the standing walls: against the map with
 * walls, a wall would block its own light, and other walls do not count on that line.
 */
export function wallInLight(
  wall: ShadowWall,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): boolean {
  if (!lampOn || !meetsCone(wall.box, lampCone(player))) {
    return false;
  }
  const centre = { x: player.x, y: player.y - BOX_HEIGHT / 2 };
  return !sightBlocked(centre, sightTarget(wall.box, centre), {
    width: map.width,
    height: map.height,
    solids: map.opaque,
  });
}
