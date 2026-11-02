import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EMPTY, parseTileMap, parseTileset, tilesetSource } from '../../src/engine/tiled';

/**
 * The shipped test map obeys the loader. Unlike the fixtures, this reads public/ on purpose:
 * it proves the map the game loads, with the tileset the generator wrote.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MAP_FILE = 'public/maps/test.tmj';

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
}

describe('public/maps/test.tmj', () => {
  const mapJson = readJson(MAP_FILE);
  const source = tilesetSource(mapJson, MAP_FILE);
  const tilesetFile = join('public/maps', source);
  const tileset = parseTileset(readJson(tilesetFile), tilesetFile);
  const map = parseTileMap(mapJson, tileset, MAP_FILE);
  const cell = (column: number, row: number) => row * map.width + column;

  it('references the generated placeholder tileset', () => {
    expect(source).toBe('../tiles/placeholder.tsj');
    expect(tilesetFile).toBe('public/tiles/placeholder.tsj');
  });

  it('is 20x12 tiles, 320x192 px', () => {
    expect([map.width, map.height]).toStrictEqual([20, 12]);
  });

  it('puts the spawn at pixel (136, 120), on grass in tile (8, 7)', () => {
    expect(map.spawn).toStrictEqual({ x: 136, y: 120 });
    expect(map.ground[cell(8, 7)]).toBe(0);
    expect(map.solid[cell(8, 7)]).toBe(false);
  });

  it('has grass with nothing above it at tile (0, 0), the smoke test reads it', () => {
    expect(map.ground[0]).toBe(0);
    expect(map.detail[0]).toBe(EMPTY);
    expect(map.above[0]).toBe(EMPTY);
  });

  it('closes the wall ring except for the doorway', () => {
    expect(map.solid[cell(12, 1)]).toBe(true);
    expect(map.solid[cell(14, 4)]).toBe(false);
    expect(map.ground[cell(12, 2)], 'the closed door').toBe(5);
  });

  it('draws the lower edge of the roof from above, over grass', () => {
    for (const column of [2, 3, 4, 5]) {
      expect(map.above[cell(column, 3)]).toBe(6);
      expect(map.ground[cell(column, 3)]).toBe(0);
    }
  });
});
