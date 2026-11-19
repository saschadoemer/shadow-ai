import { type Box, sightBlocked } from '../engine/collision';
import { type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { SPREAD } from './lamp';
import { BOX_HEIGHT, type GameInput, pressed } from './player';
import { isCell, PANE_PREFIX, rectsOf } from './rects';
import type { CreatureState, GameState, PaneState, PlayerState } from './state';
import { traceInLight } from './trace';
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

/** The cells of the open panes: a trace on one of them is hidden. */
export function coveredCells(states: readonly PaneState[], panes: readonly Pane[]): Box[] {
  return states.flatMap((state) => {
    const pane = panes[state.pane];
    return pane === undefined ? [] : [pane.box];
  });
}

/**
 * One step of the open panes against the stepped figure and the lamp of that step: a pane
 * is lit while the light is on its cell, by the test of a trace — and nothing else happens to
 * it. The light does not hold a lurker in its pane. `map` is the map with the shadow walls
 * standing, as for a trace.
 */
export function stepPanes(
  states: readonly PaneState[],
  panes: readonly Pane[],
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
  spread: number = SPREAD,
): PaneState[] {
  return states.map((state) => {
    const pane = panes[state.pane];
    const lit = pane !== undefined && traceInLight(pane, player, lampOn, map, spread);
    return lit === state.lit ? state : { ...state, lit };
  });
}

/** Tune: the reach of a talk (0017), two and a half tiles from the feet to the cell's centre. */
export const PANE_DISTANCE = 40;

/** The centre of a pane's cell. */
export function paneCentre(pane: Pane): Point {
  return { x: pane.box.x + pane.box.width / 2, y: pane.box.y + pane.box.height / 2 };
}

/**
 * The open pane a press closes: the nearest whose cell centre is at most PANE_DISTANCE from
 * the player's feet and in sight — no opaque box of the map as loaded on the line from the
 * centre of the player's box to that centre, the test of a talk — the first in the map's order
 * of two equally near; null when none is. A desk, a chair and a partition are low and do not
 * block the line.
 */
export function paneInReach(
  player: Point,
  states: readonly PaneState[],
  panes: readonly Pane[],
  map: TileMap,
): PaneState | null {
  let nearest: PaneState | null = null;
  let reach = PANE_DISTANCE;
  for (const state of states) {
    const pane = panes[state.pane];
    if (pane === undefined) {
      continue;
    }
    const centre = paneCentre(pane);
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
      nearest = state;
      reach = distance;
    }
  }
  return nearest;
}

/**
 * What a press at an open pane in reach changes, or null when this step closes none: `talk`
 * is not pressed, the lamp is held, the player is being pushed, or no open pane is in reach.
 * The pane leaves the open ones for good, and its lurker drops to the floor: a creature at
 * the pane's drop point, which is its home too. The caller steps the world from the result
 * and adds the lurker after the creatures of the step: it is stepped from the next step on.
 */
export function closePane(
  state: GameState,
  input: GameInput,
  map: TileMap,
): { readonly panes: PaneState[]; readonly lurker: CreatureState } | null {
  if (!pressed(state.held, input, 'talk') || input.lamp || state.player.recoil.steps > 0) {
    return null;
  }
  const panes = panesOf(map);
  const open = paneInReach(state.player, state.panes, panes, map);
  const pane = open === null ? undefined : panes[open.pane];
  if (open === null || pane === undefined) {
    return null;
  }
  const { drop } = pane;
  return {
    panes: state.panes.filter((candidate) => candidate !== open),
    lurker: { species: 'lurker', x: drop.x, y: drop.y, light: 0, home: { x: drop.x, y: drop.y } },
  };
}

/** The panes when the figure wakes (0009): the open ones stay open, and none is lit. */
export function restedPanes(states: readonly PaneState[]): PaneState[] {
  return states.map((state) => ({ ...state, lit: false }));
}
