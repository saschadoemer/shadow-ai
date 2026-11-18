import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import { type NamedRect, parseTileMap, parseTileset, type TileMap } from '../../src/engine/tiled';
import { lampCone } from '../../src/game/lamp';
import {
  LIFT_STEPS,
  meetsCone,
  restedWalls,
  type ShadowWall,
  standingWalls,
  stepWalls,
  wallInLight,
  wallsOf,
  withWalls,
} from '../../src/game/shadow';
import {
  type Facing,
  NO_RECOIL,
  type PlayerState,
  type ShadowWallState,
} from '../../src/game/state';
import { grassMap } from './grass-map';
import { solidsWith } from './solids';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function loadMap(mapFile: string, tilesetFile: string): TileMap {
  const read = (file: string): unknown => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  return parseTileMap(read(mapFile), parseTileset(read(tilesetFile), tilesetFile), mapFile);
}

const WALLS_MAP = loadMap('tests/fixtures/maps/walls.tmj', 'tests/fixtures/maps/fixture-tiles.tsj');

/** The horizontal and the vertical box of the spec's test plan. */
const H: Box = { x: 128, y: 96, width: 48, height: 4 };
const V: Box = { x: 240, y: 32, width: 4, height: 48 };
/** 20x12 cells of open floor. */
const OPEN = grassMap(20, 12, { x: 40, y: 152 });

const figure = (x: number, y: number, facing: Facing): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
});
const wall = (box: Box, region = 'marketing', density = 1): ShadowWall => ({
  region,
  density,
  box,
});
const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});

describe('wallsOf (0014)', () => {
  it('reads the walls of a map with region, density and box, in file order', () => {
    expect(wallsOf(WALLS_MAP.rects)).toStrictEqual([
      { region: 'marketing', density: 1, box: H },
      { region: 'sales', density: 1, box: V },
      { region: 'hr', density: 2, box: { x: 32, y: 96, width: 48, height: 4 } },
    ]);
  });

  it('reads no wall from a map without rectangles', () => {
    expect(wallsOf([])).toStrictEqual([]);
  });

  it.each([
    [rect('door', 128, 96, 48, 4), 'unknown rectangle object "door"'],
    [rect('shadow:cellar', 128, 96, 48, 4), 'shadow wall shadow:cellar names no region'],
    [
      rect('shadow:reception', 128, 96, 48, 4),
      'shadow wall shadow:reception stands in a region without shadow',
    ],
    [rect('shadow:sales', 130, 96, 48, 4), '(130, 96, 48, 4) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 98, 48, 4), '(128, 98, 48, 4) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 96, 40, 4), '(128, 96, 40, 4) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 96, 48, 8), '(128, 96, 48, 8) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 96, 4, 40), '(128, 96, 4, 40) is no strip on a cell edge'],
    [rect('shadow:sales', 128, 96, 4, 4), '(128, 96, 4, 4) is no strip on a cell edge'],
  ])('refuses %o', (bad, message) => {
    expect(() => wallsOf([bad])).toThrow(message);
  });

  it('names the wall in the message of a strip that is none', () => {
    expect(() => wallsOf([rect('shadow:sales', 130, 96, 48, 4)])).toThrow(
      'shadow wall shadow:sales (130, 96, 48, 4) is no strip on a cell edge',
    );
  });
});

describe('a wall in the light (0014)', () => {
  const CASES: readonly (readonly [Box, number, number, Facing, boolean])[] = [
    [H, 152, 96, 'down', true],
    [H, 152, 61, 'down', true],
    [H, 152, 60, 'down', false],
    [H, 120, 88, 'down', true],
    [H, 110, 88, 'down', false],
    [H, 152, 96, 'up', false],
    [H, 152, 88, 'left', false],
    [H, 152, 108, 'up', true],
    [H, 118, 108, 'up', false],
    [H, 152.4, 116, 'up', true],
    [V, 234, 60, 'right', true],
    [V, 234, 40, 'right', true],
    [V, 234, 36, 'right', false],
  ];

  it.each(CASES)(
    'box %o, feet (%d, %d) facing %s: meets the cone %s',
    (box, x, y, facing, meets) => {
      expect(meetsCone(box, lampCone(figure(x, y, facing)))).toBe(meets);
      expect(wallInLight(wall(box), figure(x, y, facing), true, OPEN)).toBe(meets);
    },
  );

  it('is not in the light with the lamp off', () => {
    for (const [box, x, y, facing] of CASES) {
      expect(wallInLight(wall(box), figure(x, y, facing), false, OPEN)).toBe(false);
    }
  });

  it('is kept out of the light by a full opaque tile on the line, not by a low box', () => {
    const tile = { x: 144, y: 64, width: 16, height: 16 };
    const boxes = solidsWith(20, 12, [{ column: 9, row: 4, box: tile }]);
    const player = figure(152, 61, 'down');
    expect(wallInLight(wall(H), player, true, { ...OPEN, solids: boxes, opaque: boxes })).toBe(
      false,
    );
    expect(wallInLight(wall(H), player, true, { ...OPEN, solids: boxes })).toBe(true);
  });

  it('is lit past its far end, where the next wall strip begins', () => {
    const strip = { x: 176, y: 96, width: 16, height: 4 };
    const boxes = solidsWith(20, 12, [{ column: 11, row: 6, box: strip }]);
    const map = { ...OPEN, solids: boxes, opaque: boxes };
    expect(wallInLight(wall(H), figure(186, 88, 'down'), true, map)).toBe(true);
  });

  it('is lit past the far end of a vertical wall too', () => {
    const strip = { x: 240, y: 80, width: 4, height: 16 };
    const boxes = solidsWith(20, 12, [{ column: 15, row: 5, box: strip }]);
    const map = { ...OPEN, solids: boxes, opaque: boxes };
    expect(wallInLight(wall(V, 'sales'), figure(230, 96, 'right'), true, map)).toBe(true);
  });
});

describe('the step of the walls (0014)', () => {
  /** A thin horizontal wall and a dense vertical one, both in the cone of a figure at (152, 80) facing down. */
  const WALLS: readonly ShadowWall[] = [
    wall(H),
    wall({ x: 160, y: 80, width: 4, height: 32 }, 'hr', 2),
  ];
  const PLAYER = figure(152, 80, 'down');
  const BASIC = { on: true, strength: 1, owned: true, used: true };
  const run = (
    standing: readonly ShadowWallState[],
    steps: number,
    lamp = BASIC,
    player = PLAYER,
  ): readonly ShadowWallState[] => {
    let next = standing;
    for (let i = 0; i < steps; i += 1) {
      next = stepWalls(next, WALLS, player, lamp, OPEN);
    }
    return next;
  };

  it('every wall stands at the start, unlit', () => {
    expect(standingWalls(WALLS)).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(LIFT_STEPS).toBe(60);
  });

  it('two walls in the cone both count: the thin one gives way, the dense one holds', () => {
    expect(run(standingWalls(WALLS), 1)).toStrictEqual([
      { wall: 0, lit: true, light: 1 },
      { wall: 1, lit: true, light: 0 },
    ]);
  });

  it('a wall of density 1 has light 59 after 59 steps and is gone after the 60th', () => {
    expect(run(standingWalls(WALLS), 59)).toStrictEqual([
      { wall: 0, lit: true, light: 59 },
      { wall: 1, lit: true, light: 0 },
    ]);
    expect(run(standingWalls(WALLS), 60)).toStrictEqual([{ wall: 1, lit: true, light: 0 }]);
  });

  it('the wall that leaves keeps the index of the others', () => {
    const left = run(standingWalls(WALLS), 60);
    expect(left.map((standing) => standing.wall)).toStrictEqual([1]);
    expect(run(left, 1)).toStrictEqual([{ wall: 1, lit: true, light: 0 }]);
  });

  it('a wall of density 2 holds against strength 1 however long, and is gone after 60 steps of strength 2', () => {
    expect(run(standingWalls(WALLS), 600)).toStrictEqual([{ wall: 1, lit: true, light: 0 }]);
    const strong = { on: true, strength: 2, owned: true, used: true };
    expect(run([{ wall: 1, lit: false, light: 0 }], 59, strong)).toStrictEqual([
      { wall: 1, lit: true, light: 59 },
    ]);
    expect(run([{ wall: 1, lit: false, light: 0 }], 60, strong)).toStrictEqual([]);
  });

  it('a step out of the light starts the second again', () => {
    const half = run(standingWalls(WALLS), 30);
    expect(half[0]).toStrictEqual({ wall: 0, lit: true, light: 30 });
    const broken = run(half, 1, { on: false, strength: 1, owned: true, used: true });
    expect(broken).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(run(broken, 1)[0]).toStrictEqual({ wall: 0, lit: true, light: 1 });
  });

  it('a figure that turns away breaks the light as well', () => {
    const half = run(standingWalls(WALLS), 30);
    expect(run(half, 1, BASIC, figure(152, 80, 'up'))).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
      { wall: 1, lit: false, light: 0 },
    ]);
  });

  it('rests the standing walls and brings no lifted wall back', () => {
    expect(restedWalls([{ wall: 1, lit: true, light: 30 }])).toStrictEqual([
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(restedWalls([])).toStrictEqual([]);
  });
});

describe('the map with its standing walls (0014)', () => {
  const WALLS: readonly ShadowWall[] = [wall(H), wall(V, 'sales')];

  it('is the map itself when no wall stands', () => {
    expect(withWalls(OPEN, WALLS, [])).toBe(OPEN);
  });

  it('adds the box of a standing wall to every cell it covers, as solid and as opaque', () => {
    const walled = withWalls(OPEN, WALLS, [{ wall: 0, lit: false, light: 0 }]);
    const cellsWith = (grid: readonly (readonly Box[])[]) =>
      grid.flatMap((boxes, at) => (boxes.length > 0 ? [at] : []));
    expect(cellsWith(walled.solids)).toStrictEqual([6 * 20 + 8, 6 * 20 + 9, 6 * 20 + 10]);
    expect(cellsWith(walled.opaque)).toStrictEqual([6 * 20 + 8, 6 * 20 + 9, 6 * 20 + 10]);
    expect(walled.solids[6 * 20 + 9]).toStrictEqual([H]);
    expect(cellsWith(OPEN.solids)).toStrictEqual([]);
  });

  it('covers three rows for a vertical wall and keeps the boxes the map already has', () => {
    const tile = { x: 240, y: 32, width: 16, height: 16 };
    const boxes = solidsWith(20, 12, [{ column: 15, row: 2, box: tile }]);
    const walled = withWalls({ ...OPEN, solids: boxes, opaque: boxes }, WALLS, [
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(walled.solids[2 * 20 + 15]).toStrictEqual([tile, V]);
    expect(walled.solids[3 * 20 + 15]).toStrictEqual([V]);
    expect(walled.solids[4 * 20 + 15]).toStrictEqual([V]);
    expect(walled.solids[5 * 20 + 15]).toStrictEqual([]);
  });
});
