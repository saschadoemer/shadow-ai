import type { Box } from '../engine/collision';
import { type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { isCell, PANE_PREFIX, rectsOf } from './rects';
import type { PaneState } from './state';
import { densityOf } from './world';

/**
 * The panes (gameplay.md §3, feature 0038). On a screen of the room a small pane is open that
 * nobody opened, and a lurker sits in it where no light holds it. The text of the game and the
 * spec call the thing by its everyday name; in the map, in the state and in this directory it
 * is a pane, because the architecture test keeps that browser name out of `src/game/` (INV-2).
 * A pane is a rectangle of the map named `pane:<region>`, exactly one cell, on the cell of a
 * desk with a screen. While it is open it hides the trace on its cell; a press of `talk` in
 * reach closes it, and its lurker drops to the floor. Pure data and pure functions; the panes
 * are read from the map on every call and kept nowhere.
 */

export interface Pane {
  readonly region: string;
  /** Map pixels: one cell. */
  readonly box: Box;
  /** The feet of the lurker that drops when the pane is closed, in map pixels. */
  readonly drop: Point;
}

/**
 * Where the lurker of a pane drops: the middle of the cell two to the right of the pane and
 * one below — inside the cubicle, beside the chair.
 */
export function dropPoint(box: Box): Point {
  return { x: box.x + 2 * TILE_SIZE + TILE_SIZE / 2, y: box.y + TILE_SIZE + TILE_SIZE / 2 };
}

/** Whether a point lies in the map and in no solid box of its cell. */
function isFree(point: Point, map: TileMap): boolean {
  const column = Math.floor(point.x / TILE_SIZE);
  const row = Math.floor(point.y / TILE_SIZE);
  if (column < 0 || row < 0 || column >= map.width || row >= map.height) {
    return false;
  }
  const boxes = map.solids[row * map.width + column] ?? [];
  return !boxes.some(
    (box) =>
      point.x >= box.x &&
      point.x < box.x + box.width &&
      point.y >= box.y &&
      point.y < box.y + box.height,
  );
}

/**
 * The panes of a map, in the order of its rectangles. Rejects a box that is not one cell, a
 * region the world data does not know, and a pane whose drop point lies outside the map or
 * in a solid box.
 */
export function panesOf(map: TileMap): Pane[] {
  return rectsOf(map.rects, PANE_PREFIX).map((rect) => {
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    const at = `(${box.x}, ${box.y}, ${box.width}, ${box.height})`;
    if (!isCell(box)) {
      throw new Error(`pane ${rect.name} ${at} is not one cell`);
    }
    const region = rect.name.slice(PANE_PREFIX.length);
    if (densityOf(region) === undefined) {
      throw new Error(`pane ${rect.name} names no region`);
    }
    const drop = dropPoint(box);
    if (!isFree(drop, map)) {
      throw new Error(`pane ${rect.name} ${at} has no free drop point`);
    }
    return { region, box, drop };
  });
}

/** Every pane of the map open and not lit: the panes a game starts with. */
export function openPanes(panes: readonly Pane[]): PaneState[] {
  return panes.map((_pane, pane) => ({ pane, lit: false }));
}

/** The panes when the figure wakes (0009): the open ones stay open, and none is lit. */
export function restedPanes(states: readonly PaneState[]): PaneState[] {
  return states.map((state) => ({ ...state, lit: false }));
}
