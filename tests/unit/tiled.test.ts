import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EMPTY, parseTileMap, parseTileset, tilesetSource } from '../../src/engine/tiled';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURES = 'tests/fixtures/maps';

/** A fixture's path as the error messages name it, and its parsed JSON. */
function fixture(name: string): { readonly file: string; readonly json: unknown } {
  const file = `${FIXTURES}/${name}`;
  return { file, json: JSON.parse(readFileSync(join(ROOT, file), 'utf8')) };
}

describe('parseTileset', () => {
  it('reads image, columns, tile count and the solid property per tile', () => {
    const { file, json } = fixture('fixture-tiles.tsj');
    expect(parseTileset(json, file)).toStrictEqual({
      image: 'fixture-tiles.png',
      columns: 2,
      tileCount: 2,
      solid: [false, true],
    });
  });

  it('rejects a tile size other than 16x16 (rule 5)', () => {
    const { file, json } = fixture('fixture-tiles-32.tsj');
    expect(() => parseTileset(json, file)).toThrow(
      'tests/fixtures/maps/fixture-tiles-32.tsj: tile size is 32x32; tiles are 16x16',
    );
  });

  it('rejects a tileset that is not an object', () => {
    expect(() => parseTileset([], 'x.tsj')).toThrow('x.tsj: tileset is not an object');
  });

  it('rejects an animated tile (rule 12)', () => {
    const { file, json } = fixture('fixture-tiles.tsj');
    const animated = structuredClone(json) as { tiles: Record<string, unknown>[] };
    for (const tile of animated.tiles) {
      tile.animation = [
        { duration: 100, tileid: 0 },
        { duration: 100, tileid: 1 },
      ];
    }
    expect(messageOf(() => parseTileset(animated, file))).toBe(
      `${file}: tile 1 is animated; animated tiles are not supported`,
    );
  });

  it('accepts an empty animation list', () => {
    const { file, json } = fixture('fixture-tiles.tsj');
    const still = structuredClone(json) as { tiles: Record<string, unknown>[] };
    for (const tile of still.tiles) {
      tile.animation = [];
    }
    expect(parseTileset(still, file).solid).toStrictEqual([false, true]);
  });
});

describe('tilesetSource', () => {
  const MAP = '/maps/test.tmj';

  it("returns the source of the map's one external tileset, as written", () => {
    const map = { tilesets: [{ firstgid: 1, source: '../tiles/placeholder.tsj' }] };
    expect(tilesetSource(map, MAP)).toBe('../tiles/placeholder.tsj');
  });

  it('rejects a map without a tileset (rule 10)', () => {
    expect(() => tilesetSource({ tilesets: [] }, MAP)).toThrow(
      '/maps/test.tmj: map has no tileset',
    );
  });

  it('rejects a map with more than one tileset (rule 10)', () => {
    const map = {
      tilesets: [
        { firstgid: 1, source: 'a.tsj' },
        { firstgid: 8, source: 'b.tsj' },
      ],
    };
    expect(() => tilesetSource(map, MAP)).toThrow(
      '/maps/test.tmj: map has 2 tilesets; exactly one is required',
    );
  });

  it('rejects an embedded tileset (rule 10)', () => {
    const map = { tilesets: [{ firstgid: 1, name: 'inline', tilecount: 7 }] };
    expect(() => tilesetSource(map, MAP)).toThrow(
      '/maps/test.tmj: tileset is embedded; an external .tsj is required',
    );
  });

  it('rejects a source that does not end in .tsj (rule 10)', () => {
    const map = { tilesets: [{ firstgid: 1, source: '../tiles/placeholder.tsx' }] };
    expect(() => tilesetSource(map, MAP)).toThrow(
      '/maps/test.tmj: tileset source "../tiles/placeholder.tsx" does not end in .tsj',
    );
  });
});

describe('parseTileMap on the corridor', () => {
  const tiles = fixture('fixture-tiles.tsj');
  const tileset = parseTileset(tiles.json, tiles.file);
  const corridor = fixture('corridor.tmj');
  const map = parseTileMap(corridor.json, tileset, corridor.file);
  const cell = (column: number, row: number) => row * 20 + column;

  it('reads the size in tiles', () => {
    expect([map.width, map.height]).toStrictEqual([20, 12]);
  });

  it('turns gids into tileset ids: floor everywhere on ground', () => {
    expect(map.ground).toHaveLength(240);
    expect(map.ground.every((id) => id === 0)).toBe(true);
  });

  it('turns gid 0 into EMPTY and keeps every layer in its own array', () => {
    expect(map.detail).toHaveLength(240);
    expect(map.detail[cell(4, 3)]).toBe(1);
    expect(map.detail[cell(10, 6)]).toBe(EMPTY);
    expect(map.detail[cell(10, 5)]).toBe(1);
    expect(map.above).toHaveLength(240);
    expect(map.above[cell(2, 2)]).toBe(1);
    expect(map.above[cell(3, 2)]).toBe(EMPTY);
  });

  it('reads the spawn point in pixels', () => {
    expect(map.spawn).toStrictEqual({ x: 40, y: 56 });
  });

  it('builds the solid grid as the union of the three tile layers (INV-7)', () => {
    expect(map.solid).toHaveLength(240);
    expect(map.solid[cell(4, 3)]).toBe(true);
    expect(map.solid[cell(10, 6)]).toBe(false);
    expect(map.solid[cell(10, 5)]).toBe(true);
    expect(map.solid[cell(2, 2)], 'from above').toBe(true);
    expect(map.solid[0]).toBe(false);
    expect(map.solid.filter(Boolean)).toHaveLength(9);
  });

  it('fills absent detail and above layers with EMPTY', () => {
    const json = structuredClone(corridor.json) as { layers: { name: string }[] };
    json.layers = json.layers.filter((layer) => layer.name !== 'detail' && layer.name !== 'above');
    const bare = parseTileMap(json, tileset, corridor.file);
    expect(bare.detail).toStrictEqual(new Array(240).fill(EMPTY));
    expect(bare.above).toStrictEqual(new Array(240).fill(EMPTY));
    expect(bare.solid.filter(Boolean)).toHaveLength(0);
  });

  it('is plain data: it survives a JSON round trip unchanged', () => {
    expect(JSON.parse(JSON.stringify(map))).toStrictEqual(map);
  });
});

/** The message a call throws, exactly; a call that does not throw fails the comparison. */
function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return '(no error)';
}

interface LayerJson {
  [key: string]: unknown;
  name: string;
  type: string;
  data?: unknown;
  objects?: Record<string, unknown>[];
}

interface MapJson {
  [key: string]: unknown;
  layers: LayerJson[];
}

describe('parseTileMap rejects', () => {
  const tiles = fixture('fixture-tiles.tsj');
  const tileset = parseTileset(tiles.json, tiles.file);
  const corridor = fixture('corridor.tmj');
  const FILE = corridor.file;

  function layer(map: MapJson, name: string): LayerJson {
    const found = map.layers.find((candidate) => candidate.name === name);
    if (found === undefined) {
      throw new Error(`the corridor has no layer "${name}"`);
    }
    return found;
  }

  function groundData(map: MapJson): unknown[] {
    const data = layer(map, 'ground').data;
    if (!Array.isArray(data)) {
      throw new Error('the corridor ground has no data array');
    }
    return data;
  }

  /** A copy of the corridor with one change. */
  function variant(change: (map: MapJson) => void): MapJson {
    const copy = structuredClone(corridor.json) as MapJson;
    change(copy);
    return copy;
  }

  function rejection(json: unknown, file = FILE): string {
    return messageOf(() => parseTileMap(json, tileset, file));
  }

  it('an orientation other than orthogonal (rule 11)', () => {
    const map = variant((m) => {
      m.orientation = 'isometric';
    });
    expect(rejection(map)).toBe(
      `${FILE}: orientation "isometric" is not supported; only orthogonal`,
    );
  });

  it('an infinite map (rule 7)', () => {
    const map = variant((m) => {
      m.infinite = true;
    });
    expect(rejection(map)).toBe(`${FILE}: infinite maps are not supported`);
  });

  it('a tile size other than 16x16 (rule 5)', () => {
    const { file, json } = fixture('tile-32.tmj');
    expect(rejection(json, file)).toBe(`${file}: tile size is 32x32; tiles are 16x16`);
  });

  it('a map smaller than 20x12 tiles (rule 6)', () => {
    const { file, json } = fixture('too-small.tmj');
    expect(rejection(json, file)).toBe(
      `${file}: map is 10x6 tiles; at least 20x12 (320x180 px) is required`,
    );
  });

  it('a map smaller than 20x12 tiles before reading any layer (rule 6)', () => {
    const { file, json } = fixture('too-small.tmj');
    const map = structuredClone(json) as MapJson;
    map.layers.push({ name: 'decor', type: 'tilelayer', data: [] });
    expect(rejection(map, file)).toBe(
      `${file}: map is 10x6 tiles; at least 20x12 (320x180 px) is required`,
    );
  });

  it('a layer name outside ground, detail, above, objects (rule 1)', () => {
    const { file, json } = fixture('unknown-layer.tmj');
    expect(rejection(json, file)).toBe(
      `${file}: layer "decor" is not one of ground, detail, above, objects`,
    );
  });

  it('an unknown layer name whatever its type (rule 1)', () => {
    const map = variant((m) => {
      m.layers.push({ name: 'triggers', type: 'objectgroup', objects: [] });
    });
    expect(rejection(map)).toBe(
      `${FILE}: layer "triggers" is not one of ground, detail, above, objects`,
    );
  });

  it('an objects layer that is not an object layer (rule 2)', () => {
    const map = variant((m) => {
      layer(m, 'objects').type = 'tilelayer';
    });
    expect(rejection(map)).toBe(`${FILE}: layer "objects" must be an object layer`);
  });

  it('a ground layer that is not a tile layer (rule 2)', () => {
    const map = variant((m) => {
      layer(m, 'ground').type = 'objectgroup';
    });
    expect(rejection(map)).toBe(`${FILE}: layer "ground" must be a tile layer`);
  });

  it('a layer name used twice (rule 3)', () => {
    const map = variant((m) => {
      m.layers.push(structuredClone(layer(m, 'ground')));
    });
    expect(rejection(map)).toBe(`${FILE}: layer "ground" appears twice`);
  });

  it('a missing ground layer (rule 3)', () => {
    const map = variant((m) => {
      m.layers = m.layers.filter((candidate) => candidate.name !== 'ground');
    });
    expect(rejection(map)).toBe(`${FILE}: layer "ground" is missing`);
  });

  it('a missing objects layer (rule 3)', () => {
    const map = variant((m) => {
      m.layers = m.layers.filter((candidate) => candidate.name !== 'objects');
    });
    expect(rejection(map)).toBe(`${FILE}: layer "objects" is missing`);
  });

  it('no point object named spawn (rule 4)', () => {
    const { file, json } = fixture('no-spawn.tmj');
    expect(rejection(json, file)).toBe(
      `${file}: layer "objects" has no point object named "spawn"`,
    );
  });

  it('a spawn that is not a point object (rule 4)', () => {
    const map = variant((m) => {
      for (const object of layer(m, 'objects').objects ?? []) {
        object.point = false;
      }
    });
    expect(rejection(map)).toBe(`${FILE}: layer "objects" has no point object named "spawn"`);
  });

  it('more than one spawn (rule 4)', () => {
    const map = variant((m) => {
      layer(m, 'objects').objects?.push({ id: 2, name: 'spawn', point: true, x: 8, y: 8 });
    });
    expect(rejection(map)).toBe(
      `${FILE}: layer "objects" has 2 point objects named "spawn"; exactly one is required`,
    );
  });

  it('layer data with an encoding (rule 7)', () => {
    const map = variant((m) => {
      layer(m, 'ground').encoding = 'base64';
      layer(m, 'ground').data = 'AQAAAAEAAAA=';
    });
    expect(rejection(map)).toBe(
      `${FILE}: layer "ground" uses encoding "base64"; only CSV (an array of numbers) is supported`,
    );
  });

  it('layer data with a compression (rule 7)', () => {
    const map = variant((m) => {
      layer(m, 'ground').compression = 'zlib';
    });
    expect(rejection(map)).toBe(
      `${FILE}: layer "ground" uses compression "zlib"; only CSV (an array of numbers) is supported`,
    );
  });

  it('layer data whose length is not width × height (rule 7)', () => {
    const map = variant((m) => {
      layer(m, 'ground').data = [1, 1, 1];
    });
    expect(rejection(map)).toBe(`${FILE}: layer "ground" has 3 cells; 240 are required`);
  });

  it('a cell that is not a whole number (rule 7)', () => {
    const map = variant((m) => {
      groundData(m)[0] = 1.5;
    });
    expect(rejection(map)).toBe(`${FILE}: layer "ground" cell (0, 0) is not a whole number`);
  });

  it('a flipped or rotated tile (rule 8)', () => {
    const map = variant((m) => {
      groundData(m)[0] = 0x80000001;
    });
    expect(rejection(map)).toBe(
      `${FILE}: layer "ground" cell (0, 0) is flipped or rotated; flipped or rotated tiles are not supported`,
    );
  });

  it('every one of the four flag bits (rule 8)', () => {
    for (const flag of [0x80000000, 0x40000000, 0x20000000, 0x10000000]) {
      const map = variant((m) => {
        groundData(m)[0] = flag + 1;
      });
      expect(rejection(map), flag.toString(16)).toBe(
        `${FILE}: layer "ground" cell (0, 0) is flipped or rotated; flipped or rotated tiles are not supported`,
      );
    }
  });

  it('a gid outside the tileset (rule 9)', () => {
    const map = variant((m) => {
      groundData(m)[5] = 3;
    });
    expect(rejection(map)).toBe(
      `${FILE}: layer "ground" cell (5, 0) has tile id 3, which is outside the tileset (1–2)`,
    );
  });

  it('a gid below the first gid of the tileset (rule 9)', () => {
    const map = variant((m) => {
      m.tilesets = [{ firstgid: 2, source: 'fixture-tiles.tsj' }];
      groundData(m).fill(2);
      groundData(m)[5] = 1;
    });
    expect(rejection(map)).toBe(
      `${FILE}: layer "ground" cell (5, 0) has tile id 1, which is outside the tileset (2–3)`,
    );
  });

  it('accepts encoding "csv" and compression "" as absent (rule 7)', () => {
    const map = variant((m) => {
      layer(m, 'ground').encoding = 'csv';
      layer(m, 'ground').compression = '';
    });
    expect(rejection(map)).toBe('(no error)');
  });

  it('a spawn on a solid tile (rule 13)', () => {
    const { file, json } = fixture('spawn-on-solid.tmj');
    expect(rejection(json, file)).toBe(`${file}: spawn (24, 40) is on a solid tile (1, 2)`);
  });

  it('a spawn outside the map (rule 13)', () => {
    const moved = (x: number, y: number) =>
      variant((m) => {
        for (const object of layer(m, 'objects').objects ?? []) {
          object.x = x;
          object.y = y;
        }
      });
    expect(rejection(moved(330, 40))).toBe(
      `${FILE}: spawn (330, 40) is outside the map (320x192 px)`,
    );
    expect(rejection(moved(40, 192))).toBe(
      `${FILE}: spawn (40, 192) is outside the map (320x192 px)`,
    );
    expect(rejection(moved(-1, 40))).toBe(
      `${FILE}: spawn (-1, 40) is outside the map (320x192 px)`,
    );
  });

  it('accepts a spawn on the last pixel row, y = 191 (rule 13)', () => {
    const map = variant((m) => {
      for (const object of layer(m, 'objects').objects ?? []) {
        object.y = 191;
      }
    });
    expect(rejection(map)).toBe('(no error)');
  });

  it('names the map file at the start of every message', () => {
    const map = variant((m) => {
      m.infinite = true;
    });
    expect(rejection(map, 'maps/elsewhere.tmj')).toBe(
      'maps/elsewhere.tmj: infinite maps are not supported',
    );
  });
});
