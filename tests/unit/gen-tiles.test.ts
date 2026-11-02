import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { encodePng, encodeTsj } from '../../tools/gen-tiles.ts';
import {
  renderTiles,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_KINDS,
  TILE_SIZE,
  tilesetJson,
} from '../../tools/placeholder-tiles.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PNG_FILE = join(ROOT, 'public/tiles/placeholder.png');
const TSJ_FILE = join(ROOT, 'public/tiles/placeholder.tsj');

function hexAt(data: Uint8Array, x: number, y: number): string {
  const o = (y * SHEET_WIDTH + x) * 4;
  return `#${[data[o], data[o + 1], data[o + 2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('the placeholder tileset generator', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodePng().equals(encodePng())).toBe(true);
    expect(encodeTsj()).toBe(encodeTsj());
  });

  it('matches the committed files', () => {
    const committed = PNG.sync.read(readFileSync(PNG_FILE));
    expect([committed.width, committed.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
    expect(Buffer.from(renderTiles()).equals(committed.data)).toBe(true);
    expect(readFileSync(TSJ_FILE, 'utf8')).toBe(encodeTsj());
  });

  it('is 112x16: seven tiles in one row', () => {
    expect(SHEET_WIDTH).toBe(7 * TILE_SIZE);
    expect(renderTiles()).toHaveLength(SHEET_WIDTH * SHEET_HEIGHT * 4);
  });

  it("puts every tile's base colour at its pixel (0, 0)", () => {
    const data = renderTiles();
    for (const kind of TILE_KINDS) {
      expect(hexAt(data, kind.id * TILE_SIZE, 0), kind.name).toBe(kind.base);
      expect(data[kind.id * TILE_SIZE * 4 + 3], `${kind.name} alpha`).toBe(255);
    }
  });

  it('marks exactly tiles 2–6 solid in the .tsj', () => {
    const tsj = tilesetJson();
    expect(tsj.tiles.map((t) => t.id)).toStrictEqual([2, 3, 4, 5, 6]);
    expect(tsj).toMatchObject({
      columns: 7,
      tilecount: 7,
      tilewidth: 16,
      tileheight: 16,
      imagewidth: 112,
      imageheight: 16,
      image: 'placeholder.png',
    });
  });
});
