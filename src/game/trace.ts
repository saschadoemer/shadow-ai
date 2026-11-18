import { type Box, sightBlocked } from '../engine/collision';
import { type NamedRect, TILE_SIZE, type TileMap } from '../engine/tiled';
import { lampCone } from './lamp';
import { BOX_HEIGHT } from './player';
import { rectsOf, TRACE_PREFIX } from './rects';
import { meetsCone } from './shadow';
import type { PlayerState, TraceState } from './state';
import { densityOf, REGIONS, type Region } from './world';

/**
 * The traces (gameplay.md §2 and §6, feature 0022): shadow residue on devices. A trace is a
 * rectangle of the map named `trace:<region>`, exactly one cell, on the cell of its device. It
 * cannot be seen until the lamp's light is on it; after FIND_STEPS steps of unbroken light it
 * is found and goes into the journal. Pure data and pure functions; the traces are read from
 * the map's rectangles on every call and kept nowhere.
 */

export interface Trace {
  readonly region: string;
  /** Map pixels: one cell. */
  readonly box: Box;
}

/** Tune: one second of unbroken light finds a trace, as it captures a creature and lifts a wall. */
export const FIND_STEPS = 60;

function isCell(box: Box): boolean {
  return (
    box.x % TILE_SIZE === 0 &&
    box.y % TILE_SIZE === 0 &&
    box.width === TILE_SIZE &&
    box.height === TILE_SIZE
  );
}

/**
 * The traces of a map, in the order of its rectangles. Rejects a region the world data does
 * not know and a box that is not one cell.
 */
export function tracesOf(rects: readonly NamedRect[]): Trace[] {
  return rectsOf(rects, TRACE_PREFIX).map((rect) => {
    const region = rect.name.slice(TRACE_PREFIX.length);
    if (densityOf(region) === undefined) {
      throw new Error(`trace ${rect.name} names no region`);
    }
    const box: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (!isCell(box)) {
      throw new Error(
        `trace ${rect.name} (${box.x}, ${box.y}, ${box.width}, ${box.height}) is not one cell`,
      );
    }
    return { region, box };
  });
}

/** Every trace of the map unseen and not found: the traces a game starts with. */
export function hiddenTraces(traces: readonly Trace[]): TraceState[] {
  return traces.map((_trace, trace) => ({ trace, light: 0, found: null }));
}

/** The traces when the figure wakes (0009): the second not begun; what was found stays found. */
export function restedTraces(states: readonly TraceState[]): TraceState[] {
  return states.map((state) => ({ ...state, light: 0 }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * In the light: the lamp is on, the trace's box, its edges included, meets the cone, and no
 * opaque box lies on the line from the centre of the figure's collision box to the nearest
 * pixel of the trace's box. `map` is the map with the shadow walls standing, as for a
 * creature: a trace is not found through a standing wall. A desk, a screen and a partition
 * are low and do not stop the light.
 */
export function traceInLight(
  trace: Trace,
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
): boolean {
  if (!lampOn || !meetsCone(trace.box, lampCone(player))) {
    return false;
  }
  const { box } = trace;
  const centre = { x: player.x, y: player.y - BOX_HEIGHT / 2 };
  const nearest = {
    x: clamp(centre.x, box.x, box.x + box.width - 1),
    y: clamp(centre.y, box.y, box.y + box.height - 1),
  };
  return !sightBlocked(centre, nearest, {
    width: map.width,
    height: map.height,
    solids: map.opaque,
  });
}

/**
 * One step of the traces against the stepped figure and the lamp of that step. A found trace
 * never changes. A trace in the light counts one step more, and in the step it reaches
 * FIND_STEPS it is found: `found` is `tick`, the tick of this step, and the count is 0 again.
 * A trace out of the light starts again from 0.
 */
export function stepTraces(
  states: readonly TraceState[],
  traces: readonly Trace[],
  player: PlayerState,
  lampOn: boolean,
  map: TileMap,
  tick: number,
): TraceState[] {
  return states.map((state) => {
    const trace = traces[state.trace];
    if (state.found !== null || trace === undefined) {
      return state;
    }
    if (!traceInLight(trace, player, lampOn, map)) {
      return state.light === 0 ? state : { ...state, light: 0 };
    }
    return state.light + 1 < FIND_STEPS
      ? { ...state, light: state.light + 1 }
      : { ...state, light: 0, found: tick };
  });
}

/** A region's line on the cases tab: how many of its traces on this map are found. */
export interface CaseEntry {
  readonly region: string;
  readonly found: number;
  readonly all: number;
}

/**
 * The entries of the journal's cases tab: the regions of which at least one trace is found, in
 * the order of the world data. Derived from the state and the map; kept nowhere.
 */
export function caseEntries(
  states: readonly TraceState[],
  traces: readonly Trace[],
  regions: readonly Region[] = REGIONS,
): CaseEntry[] {
  return regions.flatMap(({ id }) => {
    const mine = states.filter((state) => traces[state.trace]?.region === id);
    const found = mine.filter((state) => state.found !== null).length;
    return found === 0 ? [] : [{ region: id, found, all: mine.length }];
  });
}
