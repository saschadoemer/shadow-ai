import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { dropPoint, openPanes, panesOf, restedPanes } from '../../src/game/pane';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import { PANE_PREFIX, rectsOf } from '../../src/game/rects';
import { restsOf } from '../../src/game/rest';
import type { GameState } from '../../src/game/state';
import { tracesOf } from '../../src/game/trace';
import { createInitialState, newGame, update } from '../../src/game/update';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
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
