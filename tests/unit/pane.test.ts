import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { SPREAD } from '../../src/game/lamp';
import { NOTICE_PANE_OPEN, NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
import {
  coveredCells,
  dropPoint,
  openPanes,
  panesOf,
  restedPanes,
  stepPanes,
} from '../../src/game/pane';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import { PANE_PREFIX, rectsOf } from '../../src/game/rects';
import { restsOf } from '../../src/game/rest';
import type { GameState } from '../../src/game/state';
import { stepTraces, tracesOf } from '../../src/game/trace';
import { createInitialState, newGame, update } from '../../src/game/update';
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
/** A pane on cell (6, 8): its centre is (104, 136), 36 px below the spawn. */
const NEAR = rect('pane:support', 96, 128);
/** A second pane on cell (15, 3), far from the spawn, over nothing. */
const FAR = rect('pane:support', 240, 48);
/** The trace under the near pane, and a trace beside it that no pane covers. */
const UNDER = rect('trace:support', 96, 128);
const BESIDE = rect('trace:support', 80, 128);
const RECTS: readonly NamedRect[] = [UNDER, BESIDE, NEAR, FAR];
/** 20x12 cells of open floor; the figure at (x, y) looks down. */
const mapAt = (
  x = 104,
  y = 100,
  rects: readonly NamedRect[] = RECTS,
  points: readonly NamedPoint[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);
const MAP = mapAt();
const steps = (start: GameState, input: GameInput, count: number, map = MAP): GameState => {
  let state = start;
  for (let i = 0; i < count; i += 1) {
    state = update(state, input, map);
  }
  return state;
};

describe('the panes among the rectangles of a map (0038)', () => {
  it('are known by the prefix of the name: the sixth kind of rectangle', () => {
    expect(PANE_PREFIX).toBe('pane:');
    expect(rectsOf(RECTS, PANE_PREFIX)).toStrictEqual([NEAR, FAR]);
  });

  it('are read in file order, each with its region, its cell and its drop point', () => {
    expect(panesOf(MAP)).toStrictEqual([
      {
        region: 'support',
        box: { x: 96, y: 128, width: 16, height: 16 },
        drop: { x: 136, y: 152 },
      },
      {
        region: 'support',
        box: { x: 240, y: 48, width: 16, height: 16 },
        drop: { x: 280, y: 72 },
      },
    ]);
  });

  it('drop their lurker in the middle of the cell two to the right and one below', () => {
    const cell = (x: number, y: number) => dropPoint({ x, y, width: 16, height: 16 });
    // The three of the floor: (72, 61), (93, 67) and (62, 73).
    expect(cell(1152, 976)).toStrictEqual({ x: 1192, y: 1000 });
    expect(cell(1488, 1072)).toStrictEqual({ x: 1528, y: 1096 });
    expect(cell(992, 1168)).toStrictEqual({ x: 1032, y: 1192 });
  });

  it('are skipped by the traces and the rests, and skip them', () => {
    expect(tracesOf(RECTS)).toHaveLength(2);
    expect(restsOf(RECTS)).toStrictEqual([]);
    expect(panesOf(mapAt(104, 100, [UNDER, rect('rest:coffee', 0, 0)]))).toStrictEqual([]);
    expect(panesOf(mapAt(104, 100, []))).toStrictEqual([]);
  });

  it.each([
    [98, 128, 16, 16],
    [96, 130, 16, 16],
    [96, 128, 32, 16],
    [96, 128, 16, 4],
  ])('refuses the box (%d, %d, %d, %d): it is not one cell', (x, y, width, height) => {
    expect(() => panesOf(mapAt(104, 100, [rect('pane:support', x, y, width, height)]))).toThrow(
      `pane pane:support (${x}, ${y}, ${width}, ${height}) is not one cell`,
    );
  });

  it('refuses a region the world data does not know', () => {
    expect(() => panesOf(mapAt(104, 100, [rect('pane:cellar', 96, 128)]))).toThrow(
      'pane pane:cellar names no region',
    );
  });

  it('refuses a pane whose drop point lies outside the map', () => {
    // Two cells from the right edge, and in the lowest row.
    expect(() => panesOf(mapAt(104, 100, [rect('pane:support', 288, 80)]))).toThrow(
      'pane pane:support (288, 80, 16, 16) has no free drop point',
    );
    expect(() => panesOf(mapAt(104, 100, [rect('pane:support', 96, 176)]))).toThrow(
      'pane pane:support (96, 176, 16, 16) has no free drop point',
    );
  });

  it('refuses a pane whose drop point lies in a solid box, and takes one beside the box', () => {
    // The drop point of the near pane is (136, 152), in cell (8, 9).
    const withBox = (box: { x: number; y: number; width: number; height: number }): TileMap => ({
      ...MAP,
      solids: MAP.solids.map((boxes, i) => (i === 9 * 20 + 8 ? [box] : boxes)),
    });
    expect(() => panesOf(withBox({ x: 128, y: 144, width: 16, height: 16 }))).toThrow(
      'pane pane:support (96, 128, 16, 16) has no free drop point',
    );
    // A strip on the cell's top edge does not hold the point.
    expect(panesOf(withBox({ x: 128, y: 144, width: 16, height: 4 }))).toHaveLength(2);
  });

  it('refuses such a map before the game starts', () => {
    expect(() => createInitialState(mapAt(104, 100, [rect('pane:cellar', 96, 128)]))).toThrow(
      'pane pane:cellar names no region',
    );
    expect(() => createInitialState(mapAt(104, 100, [rect('pane:support', 288, 80)]))).toThrow(
      'pane pane:support (288, 80, 16, 16) has no free drop point',
    );
  });
});

describe('the panes in the state (0038)', () => {
  const start = createInitialState(MAP);

  it('start open and not lit, in the order of the map', () => {
    const open = [
      { pane: 0, lit: false },
      { pane: 1, lit: false },
    ];
    expect(start.panes).toStrictEqual(open);
    expect(newGame(MAP).panes).toStrictEqual(open);
    expect(openPanes(panesOf(MAP))).toStrictEqual(open);
  });

  it('are none on a map without them', () => {
    expect(createInitialState(mapAt(104, 100, [])).panes).toStrictEqual([]);
  });

  it('stay open through 600 steps in which nothing is pressed', () => {
    expect(steps(start, NONE, 600).panes).toStrictEqual(start.panes);
    expect(steps(start, { ...NONE, right: true }, 60).panes).toStrictEqual(start.panes);
  });

  it('survive the wake: the open ones stay open, the closed ones closed, and none is lit', () => {
    expect(restedPanes([{ pane: 1, lit: true }])).toStrictEqual([{ pane: 1, lit: false }]);
    expect(restedPanes([])).toStrictEqual([]);
    // The 44th step of the dark is the wake (0009).
    const woken = update({ ...start, panes: [{ pane: 1, lit: true }], dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.panes).toStrictEqual([{ pane: 1, lit: false }]);
  });

  it('survives a JSON round trip at the start and with a pane closed (INV-1)', () => {
    for (const state of [start, { ...start, panes: [{ pane: 1, lit: true }] }]) {
      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    }
  });
});

describe('an open pane (0038)', () => {
  const start = createInitialState(MAP);
  const LIT = [
    { pane: 0, lit: true },
    { pane: 1, lit: false },
  ];

  it('is lit while the light is on its cell, and not with the lamp off or turned away', () => {
    const lit = update(start, SHINE, MAP);
    expect(lit.panes).toStrictEqual(LIT);
    expect(update(lit, NONE, MAP).panes).toStrictEqual(start.panes);
    // With the lamp on a direction key only turns the figure: up, away from the pane.
    const away = update(lit, { ...SHINE, up: true }, MAP);
    expect([away.lamp.on, away.player.facing]).toStrictEqual([true, 'up']);
    expect(away.panes).toStrictEqual(start.panes);
  });

  it('is what stepPanes returns: the same state while nothing changes', () => {
    const panes = panesOf(MAP);
    expect(stepPanes(start.panes, panes, start.player, true, MAP)).toStrictEqual(LIT);
    const dark = stepPanes(start.panes, panes, start.player, false, MAP);
    expect(dark).toStrictEqual(start.panes);
    expect(dark[0]).toBe(start.panes[0]);
  });

  it('holds against the light: 600 lit steps close nothing and capture nothing', () => {
    const held = steps(start, SHINE, 600);
    expect(held.panes).toStrictEqual(LIT);
    expect(held.creatures).toStrictEqual([]);
    expect(held.captured).toStrictEqual(start.captured);
  });

  it('hides the trace on its cell: it is not found in 600 lit steps, and its count stays 0', () => {
    let state = start;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, SHINE, MAP);
      expect(state.traces[0], `step ${step}`).toStrictEqual({ trace: 0, light: 0, found: null });
    }
  });

  it('does not hide the trace beside it: that one is found in the 60th lit step', () => {
    const before = steps(start, SHINE, 59);
    expect(before.traces[1]).toStrictEqual({ trace: 1, light: 59, found: null });
    expect(update(before, SHINE, MAP).traces[1]).toStrictEqual({ trace: 1, light: 0, found: 60 });
  });

  it('is told to the traces as a covered cell: out of the light, whatever the lamp does', () => {
    const traces = tracesOf(RECTS);
    const covered = coveredCells(start.panes, panesOf(MAP));
    expect(covered).toStrictEqual([
      { x: 96, y: 128, width: 16, height: 16 },
      { x: 240, y: 48, width: 16, height: 16 },
    ]);
    expect(coveredCells([{ pane: 1, lit: false }], panesOf(MAP))).toStrictEqual([covered[1]]);
    const lights = (cells: typeof covered): number[] =>
      stepTraces(start.traces, traces, start.player, true, MAP, 5, SPREAD, cells).map(
        (trace) => trace.light,
      );
    expect(lights(covered)).toStrictEqual([0, 1]);
    expect(lights([])).toStrictEqual([1, 1]);
  });

  it('says so in the notice while the light is on it, and no longer', () => {
    expect(NOTICE_PANE_OPEN).toBe(textKey('notice.pane-open'));
    expect(noticeOf(start)).toBeNull();
    const lit = update(start, SHINE, MAP);
    expect(noticeOf(lit)).toBe(NOTICE_PANE_OPEN);
    expect(noticeOf(steps(lit, SHINE, 300))).toBe(NOTICE_PANE_OPEN);
    expect(noticeOf(update(lit, NONE, MAP))).toBeNull();
  });

  it('comes right after a wall that holds in the order of the notices, before everything else', () => {
    const lit = update(start, SHINE, MAP);
    const walled: GameState = { ...lit, shadowWalls: [{ wall: 0, lit: true, light: 0 }] };
    expect(noticeOf(walled)).toBe(NOTICE_SHADOW_TOO_DENSE);
    // A case solved and a trace found in this very step, and a coffee taken: the pane's line.
    const busy: GameState = {
      ...lit,
      solved: [{ region: 'sales', at: lit.tick }],
      traces: [
        { trace: 0, light: 0, found: lit.tick },
        { trace: 1, light: 0, found: null },
      ],
      rested: { at: lit.tick, result: 'restored' },
    };
    expect(noticeOf(busy)).toBe(NOTICE_PANE_OPEN);
  });
});
