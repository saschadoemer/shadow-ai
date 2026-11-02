import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTileset, tilesetSource } from '../../src/engine/tiled';

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
