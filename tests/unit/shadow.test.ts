import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import { type NamedRect, parseTileMap, parseTileset, type TileMap } from '../../src/engine/tiled';
import { lampCone } from '../../src/game/lamp';
import { meetsCone, type ShadowWall, wallInLight, wallsOf } from '../../src/game/shadow';
import { type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';
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
