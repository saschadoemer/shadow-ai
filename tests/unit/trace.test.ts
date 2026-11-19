import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import type { NamedRect, TileMap } from '../../src/engine/tiled';
import { WIDE_SPREAD } from '../../src/game/lamp';
import { noticeOf, TRACE_NOTICE_STEPS } from '../../src/game/notice';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import { rectsOf, TRACE_PREFIX, WALL_PREFIX } from '../../src/game/rects';
import { wallsOf } from '../../src/game/shadow';
import type { Facing, GameState, TraceState } from '../../src/game/state';
import {
  caseEntries,
  FIND_STEPS,
  hiddenTraces,
  restedTraces,
  stepTraces,
  type Trace,
  traceInLight,
  tracesOf,
} from '../../src/game/trace';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const SHINE: GameInput = { ...NONE, lamp: true };
const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});
/** One trace on cell (10, 5). */
const TRACE = rect('trace:sales', 160, 80);
/** A wall strip on the top edge of the cells (9, 7) to (11, 7), between the trace and (168, 128). */
const strip = (region: string): NamedRect => rect(`shadow:${region}`, 144, 112, 48, 4);
/** 20x12 cells of open floor with the player at (x, y) and the given rectangles. */
const mapAt = (x: number, y: number, rects: readonly NamedRect[] = [TRACE]): TileMap =>
  grassMap(20, 12, { x, y }, [], rects);
/** The start of `map` with the player looking `facing`. */
const facing = (map: TileMap, to: Facing): GameState => {
  const start = createInitialState(map);
  return { ...start, player: { ...start.player, facing: to } };
};
const steps = (map: TileMap, start: GameState, input: GameInput, count: number): GameState => {
  let state = start;
  for (let step = 0; step < count; step += 1) {
    state = update(state, input, map);
  }
  return state;
};
/** The map with one box put into the cell (10, 6), on the line from (168, 124) to the trace. */
const boxed = (map: TileMap, ...layers: readonly ('solids' | 'opaque')[]): TileMap => {
  const box: Box = { x: 160, y: 100, width: 16, height: 4 };
  const cells = (layer: 'solids' | 'opaque') =>
    map[layer].map((boxes, cell) => (cell === 6 * map.width + 10 ? [box] : boxes));
  return {
    ...map,
    solids: layers.includes('solids') ? cells('solids') : map.solids,
    opaque: layers.includes('opaque') ? cells('opaque') : map.opaque,
  };
};
const BELOW = mapAt(168, 128);

describe('the rectangles of a map by their kind (0022)', () => {
  it('knows a wall and a trace by the prefix of the name', () => {
    expect([WALL_PREFIX, TRACE_PREFIX]).toStrictEqual(['shadow:', 'trace:']);
    const rects = [TRACE, strip('marketing'), rect('trace:sales', 32, 32)];
    expect(rectsOf(rects, TRACE_PREFIX)).toStrictEqual([TRACE, rect('trace:sales', 32, 32)]);
    expect(rectsOf(rects, WALL_PREFIX)).toStrictEqual([strip('marketing')]);
    expect(rectsOf([], TRACE_PREFIX)).toStrictEqual([]);
  });

  it('refuses a rectangle of no known kind, whatever kind is asked for', () => {
    const rects = [TRACE, rect('door:sales', 0, 0)];
    expect(() => rectsOf(rects, TRACE_PREFIX)).toThrow('unknown rectangle object "door:sales"');
    expect(() => wallsOf(rects)).toThrow('unknown rectangle object "door:sales"');
    expect(() => tracesOf(rects)).toThrow('unknown rectangle object "door:sales"');
  });

  it('lets the walls skip the traces and the traces skip the walls', () => {
    const rects = [TRACE, strip('marketing')];
    expect(wallsOf(rects)).toStrictEqual([
      { region: 'marketing', density: 1, box: { x: 144, y: 112, width: 48, height: 4 } },
    ]);
    expect(tracesOf(rects)).toStrictEqual([
      { region: 'sales', box: { x: 160, y: 80, width: 16, height: 16 } },
    ]);
  });
});

describe('the traces of a map (0022)', () => {
  it('reads them in file order, each with its region and its cell', () => {
    expect(tracesOf([rect('trace:sales', 32, 48), rect('trace:hr', 0, 0)])).toStrictEqual([
      { region: 'sales', box: { x: 32, y: 48, width: 16, height: 16 } },
      { region: 'hr', box: { x: 0, y: 0, width: 16, height: 16 } },
    ]);
    expect(tracesOf([])).toStrictEqual([]);
  });

  it('refuses a region the world data does not know', () => {
    expect(() => tracesOf([rect('trace:cellar', 160, 80)])).toThrow(
      'trace trace:cellar names no region',
    );
  });

  it.each([
    [1330, 448, 16, 16],
    [160, 80, 32, 16],
    [160, 80, 16, 4],
    [160, 82, 16, 16],
  ])('refuses the box (%d, %d, %d, %d): it is not one cell', (x, y, width, height) => {
    expect(() => tracesOf([rect('trace:sales', x, y, width, height)])).toThrow(
      `trace trace:sales (${x}, ${y}, ${width}, ${height}) is not one cell`,
    );
  });

  it('refuses such a map before the game starts', () => {
    expect(() => createInitialState(mapAt(40, 40, [rect('trace:cellar', 160, 80)]))).toThrow(
      'trace trace:cellar names no region',
    );
  });

  it('starts every trace unseen and not found, and a map without traces with none', () => {
    expect(hiddenTraces(tracesOf([TRACE, rect('trace:sales', 32, 32)]))).toStrictEqual([
      { trace: 0, light: 0, found: null },
      { trace: 1, light: 0, found: null },
    ]);
    expect(createInitialState(BELOW).traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    expect(createInitialState(mapAt(40, 40, [])).traces).toStrictEqual([]);
  });
});

describe('a trace in the light (0022)', () => {
  const trace: Trace = { region: 'sales', box: { x: 160, y: 80, width: 16, height: 16 } };
  const player = (x: number, y: number, to: Facing) => ({
    ...createInitialState(BELOW).player,
    x,
    y,
    facing: to,
  });

  it('is one second', () => {
    expect(FIND_STEPS).toBe(60);
  });

  it('is lit when the lamp is on, its box meets the cone and nothing opaque is between', () => {
    expect(traceInLight(trace, player(168, 128, 'up'), true, BELOW)).toBe(true);
    expect(traceInLight(trace, player(168, 128, 'up'), false, BELOW)).toBe(false);
    expect(traceInLight(trace, player(168, 128, 'down'), true, BELOW)).toBe(false);
    // 48 px is the cone's length: from two cells farther down the light does not reach.
    expect(traceInLight(trace, player(168, 160, 'up'), true, BELOW)).toBe(false);
    // From the side, a cell left of it.
    expect(traceInLight(trace, player(140, 96, 'right'), true, BELOW)).toBe(true);
  });

  it('is not lit behind an opaque box, and is lit over a low one', () => {
    expect(traceInLight(trace, player(168, 128, 'up'), true, boxed(BELOW, 'opaque'))).toBe(false);
    expect(traceInLight(trace, player(168, 128, 'up'), true, boxed(BELOW, 'solids'))).toBe(true);
  });

  it('counts the lit steps and is found in the 60th: its tick is kept', () => {
    const lit59 = steps(BELOW, facing(BELOW, 'up'), SHINE, 59);
    expect(lit59.traces).toStrictEqual([{ trace: 0, light: 59, found: null }]);
    const found = update(lit59, SHINE, BELOW);
    expect(found.tick).toBe(60);
    expect(found.traces).toStrictEqual([{ trace: 0, light: 0, found: 60 }]);
  });

  it('starts again after a step without the light', () => {
    const lit30 = steps(BELOW, facing(BELOW, 'up'), SHINE, 30);
    expect(lit30.traces[0]?.light).toBe(30);
    const dark = update(lit30, NONE, BELOW);
    expect(dark.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    const again = steps(BELOW, dark, SHINE, 59);
    expect(again.traces).toStrictEqual([{ trace: 0, light: 59, found: null }]);
    expect(update(again, SHINE, BELOW).traces[0]?.found).toBe(91);
  });

  it('stays unseen with the lamp off, with the player turned away, and behind an opaque box', () => {
    const hidden = [{ trace: 0, light: 0, found: null }];
    expect(steps(BELOW, facing(BELOW, 'up'), NONE, 120).traces).toStrictEqual(hidden);
    expect(steps(BELOW, facing(BELOW, 'down'), SHINE, 120).traces).toStrictEqual(hidden);
    const wall = boxed(BELOW, 'solids', 'opaque');
    expect(steps(wall, facing(wall, 'up'), SHINE, 120).traces).toStrictEqual(hidden);
  });

  it('is found over a box that is solid and not opaque', () => {
    const desk = boxed(BELOW, 'solids');
    expect(steps(desk, facing(desk, 'up'), SHINE, 60).traces[0]?.found).toBe(60);
  });

  it('is not found through a standing shadow wall, and a second after the wall is lifted', () => {
    const map = mapAt(168, 128, [TRACE, strip('marketing')]);
    const lifting = steps(map, facing(map, 'up'), SHINE, 60);
    expect(lifting.shadowWalls).toStrictEqual([]);
    expect(lifting.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    const after = steps(map, lifting, SHINE, 59);
    expect(after.traces).toStrictEqual([{ trace: 0, light: 59, found: null }]);
    expect(update(after, SHINE, map).traces[0]?.found).toBe(120);
  });

  it('is never found behind a wall that holds', () => {
    const map = mapAt(168, 128, [TRACE, strip('hr')]);
    const held = steps(map, facing(map, 'up'), SHINE, 600);
    expect(held.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
    expect(held.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
  });

  it('never changes once it is found: 600 lit steps', () => {
    const found = steps(BELOW, facing(BELOW, 'up'), SHINE, 60);
    expect(steps(BELOW, found, SHINE, 600).traces).toStrictEqual(found.traces);
  });

  it('finds two traces in one cone in the same step', () => {
    const map = mapAt(168, 128, [TRACE, rect('trace:sales', 176, 80)]);
    expect(steps(map, facing(map, 'up'), SHINE, 60).traces).toStrictEqual([
      { trace: 0, light: 0, found: 60 },
      { trace: 1, light: 0, found: 60 },
    ]);
  });
});

describe('the traces when the figure wakes (0022)', () => {
  it('start their second again and keep what was found', () => {
    const states: TraceState[] = [
      { trace: 0, light: 30, found: null },
      { trace: 1, light: 0, found: 77 },
    ];
    expect(restedTraces(states)).toStrictEqual([
      { trace: 0, light: 0, found: null },
      { trace: 1, light: 0, found: 77 },
    ]);
  });

  it('rest in the step of the wake', () => {
    const map = mapAt(168, 128, [TRACE, rect('trace:sales', 32, 32)]);
    const start: GameState = {
      ...createInitialState(map),
      traces: [
        { trace: 0, light: 30, found: null },
        { trace: 1, light: 0, found: 12 },
      ],
      dark: 44,
    };
    const woken = update(start, NONE, map);
    expect(woken.dark).toBe(45);
    expect(woken.traces).toStrictEqual([
      { trace: 0, light: 0, found: null },
      { trace: 1, light: 0, found: 12 },
    ]);
  });
});

describe('the notice of a find (0022)', () => {
  const found = steps(BELOW, facing(BELOW, 'up'), SHINE, 60);
  const key = textKey('notice.trace-found');

  it('is shown for 120 steps from the find and not after', () => {
    expect(TRACE_NOTICE_STEPS).toBe(120);
    expect(noticeOf(steps(BELOW, facing(BELOW, 'up'), SHINE, 59))).toBeNull();
    expect(noticeOf(found)).toBe(key);
    expect(noticeOf(steps(BELOW, found, NONE, 119))).toBe(key);
    expect(noticeOf(steps(BELOW, found, NONE, 120))).toBeNull();
  });

  it('starts again with a second find', () => {
    const state: GameState = {
      ...found,
      tick: 130,
      traces: [
        { trace: 0, light: 0, found: 60 },
        { trace: 1, light: 0, found: 120 },
      ],
    };
    expect(noticeOf(state)).toBe(key);
    expect(noticeOf({ ...state, tick: 240 })).toBeNull();
  });

  it('gives way to the notice of a wall that holds', () => {
    const state: GameState = {
      ...found,
      lamp: { on: true, strength: 1, used: true },
      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    };
    expect(noticeOf(state)).toBe(textKey('notice.shadow-too-dense'));
  });
});

describe('the cases the traces open (0022)', () => {
  const traces: Trace[] = [
    { region: 'sales', box: { x: 0, y: 0, width: 16, height: 16 } },
    { region: 'hr', box: { x: 16, y: 0, width: 16, height: 16 } },
    { region: 'sales', box: { x: 32, y: 0, width: 16, height: 16 } },
    { region: 'marketing', box: { x: 48, y: 0, width: 16, height: 16 } },
  ];
  const state = (...found: readonly (number | null)[]): TraceState[] =>
    found.map((tick, trace) => ({ trace, light: 0, found: tick }));

  it('are none while no trace is found', () => {
    expect(caseEntries(state(null, null, null, null), traces)).toStrictEqual([]);
    expect(caseEntries([], [])).toStrictEqual([]);
  });

  it('are the regions with a found trace, with how many of all their traces are found', () => {
    expect(caseEntries(state(60, null, null, null), traces)).toStrictEqual([
      { region: 'sales', found: 1, all: 2 },
    ]);
    expect(caseEntries(state(60, null, 90, null), traces)).toStrictEqual([
      { region: 'sales', found: 2, all: 2 },
    ]);
  });

  it('come in the order of the world data, not of the map', () => {
    expect(caseEntries(state(60, 70, null, 80), traces)).toStrictEqual([
      { region: 'sales', found: 1, all: 2 },
      { region: 'marketing', found: 1, all: 1 },
      { region: 'hr', found: 1, all: 1 },
    ]);
  });
});

describe('a trace and the wider cone (0029)', () => {
  /**
   * The player at (168, 128) looks up: the apex is (168, 116). The trace on cell (12, 5) begins
   * 24 px beside the axis and ends 36 px along it: outside the narrow cone, inside the wider.
   */
  const map = mapAt(168, 128, [rect('trace:sales', 192, 80)]);
  const [trace] = tracesOf(map.rects);
  const player = facing(map, 'up').player;

  it('is in the light at the wider edge with the wider cone, and not with the narrow one', () => {
    expect(trace).toBeDefined();
    if (trace !== undefined) {
      expect(traceInLight(trace, player, true, map, WIDE_SPREAD)).toBe(true);
      expect(traceInLight(trace, player, true, map)).toBe(false);
      expect(traceInLight(trace, player, false, map, WIDE_SPREAD)).toBe(false);
    }
  });

  it('counts its lit steps with the wider cone only', () => {
    const hidden = hiddenTraces(tracesOf(map.rects));
    expect(
      stepTraces(hidden, tracesOf(map.rects), player, true, map, 7, WIDE_SPREAD),
    ).toStrictEqual([{ trace: 0, light: 1, found: null }]);
    expect(stepTraces(hidden, tracesOf(map.rects), player, true, map, 7)).toStrictEqual(hidden);
  });
});
