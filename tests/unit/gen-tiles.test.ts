import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { type Box, parseTileset } from '../../src/engine/tiled';
import { encodePng, encodeTsj } from '../../tools/gen-tiles.ts';
import {
  CARPET,
  CORRIDOR,
  DOOR_CLOSED,
  renderTiles,
  SHEET_COLUMNS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_KINDS,
  TILE_SIZE,
  tilesetJson,
  WALL_CORNER,
  WALL_LEFT,
  WALL_POST,
  WALL_TOP,
  WINDOW,
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

/** The left edge of tile `id` in the sheet: column id mod 16 (0013). */
function tileX(id: number): number {
  return (id % SHEET_COLUMNS) * TILE_SIZE;
}

/** The top edge of tile `id` in the sheet: row ⌊id / 16⌋ (0013). */
function tileY(id: number): number {
  return Math.floor(id / SHEET_COLUMNS) * TILE_SIZE;
}

/** The colour of pixel (x, y) of tile `id`. */
function tileHex(data: Uint8Array, id: number, x: number, y: number): string {
  return hexAt(data, tileX(id) + x, tileY(id) + y);
}

/** The alpha of pixel (x, y) of tile `id`. */
function tileAlpha(data: Uint8Array, id: number, x: number, y: number): number {
  return data[((tileY(id) + y) * SHEET_WIDTH + tileX(id) + x) * 4 + 3] ?? -1;
}

/** Every pixel of tile `id` as [x, y]. */
function pixels(): [number, number][] {
  const all: [number, number][] = [];
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      all.push([x, y]);
    }
  }
  return all;
}

function inBoxes(boxes: readonly Box[], x: number, y: number): boolean {
  return boxes.some((b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height);
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

  it('is 256x48: forty-eight tiles in sixteen columns and three rows (0013)', () => {
    expect([SHEET_WIDTH, SHEET_HEIGHT, SHEET_COLUMNS]).toStrictEqual([256, 48, 16]);
    expect(TILE_KINDS.map((kind) => kind.id)).toStrictEqual(
      Array.from({ length: 48 }, (_, i) => i),
    );
    expect(renderTiles()).toHaveLength(SHEET_WIDTH * SHEET_HEIGHT * 4);
  });

  it('describes forty-eight tiles in the .tsj, solid as a whole on twenty of them', () => {
    const tsj = tilesetJson();
    expect(tsj).toMatchObject({
      columns: 16,
      tilecount: 48,
      tilewidth: 16,
      tileheight: 16,
      imagewidth: 256,
      imageheight: 48,
      image: 'placeholder.png',
    });
    const solid = tsj.tiles.filter((tile) =>
      (tile.properties ?? []).some((p) => p.name === 'solid' && p.value === true),
    );
    expect(solid.map((tile) => tile.id)).toStrictEqual([
      2, 3, 16, 17, 18, 19, 21, 25, 26, 27, 30, 31, 35, 40, 42, 43, 44, 45, 46, 47,
    ]);
  });

  it('reads back, through the loader, with the boxes of the spec', () => {
    const top = { x: 0, y: 0, width: 16, height: 4 };
    const left = { x: 0, y: 0, width: 4, height: 16 };
    const post = { x: 0, y: 0, width: 4, height: 4 };
    const full = { x: 0, y: 0, width: 16, height: 16 };
    expect(parseTileset(tilesetJson(), 'placeholder.tsj').boxes.slice(0, 13)).toStrictEqual([
      [],
      [],
      [full],
      [full],
      [top],
      [left],
      [top, left],
      [post],
      [top],
      [left],
      [top, left],
      [post],
      [top],
    ]);
  });

  it('reads back the furniture with the boxes and `low` of the spec (0011)', () => {
    const full = { x: 0, y: 0, width: 16, height: 16 };
    const top = { x: 0, y: 0, width: 16, height: 2 };
    const left = { x: 0, y: 0, width: 2, height: 16 };
    const tileset = parseTileset(tilesetJson(), 'placeholder.tsj');
    expect(tileset.boxes.slice(13, 30)).toStrictEqual([
      [top],
      [left],
      [top, left],
      [full],
      [full],
      [full],
      [full],
      [{ x: 3, y: 3, width: 10, height: 10 }],
      [full],
      [],
      [{ x: 4, y: 6, width: 8, height: 10 }],
      [],
      [full],
      [full],
      [full],
      [{ x: 0, y: 6, width: 16, height: 4 }],
      [{ x: 6, y: 0, width: 4, height: 16 }],
    ]);
    const low = [13, 14, 15, 16, 17, 18, 19, 20, 23, 25, 26, 27, 28, 29];
    expect(tileset.low.slice(0, 30).flatMap((isLow, id) => (isLow ? [id] : []))).toStrictEqual(low);
    expect(tilesetJson().tiles.map((tile) => tile.id)).not.toContain(22);
    expect(tilesetJson().tiles.map((tile) => tile.id)).not.toContain(24);
  });

  it('names the tiles as the spec does', () => {
    expect(TILE_KINDS.map((kind) => kind.name)).toStrictEqual([
      'carpet',
      'corridor',
      'outer-wall',
      'window',
      'wall-top-carpet',
      'wall-left-carpet',
      'wall-corner-carpet',
      'wall-post-carpet',
      'wall-top-corridor',
      'wall-left-corridor',
      'wall-corner-corridor',
      'wall-post-corridor',
      'door-closed',
      'partition-top',
      'partition-left',
      'partition-corner',
      'desk',
      'desk-monitor',
      'desk-partition',
      'desk-monitor-partition',
      'chair',
      'cabinet',
      'cabinet-top',
      'plant',
      'plant-top',
      'table',
      'counter',
      'printer',
      'screen',
      'screen-side',
      'sofa-left',
      'sofa-right',
      'armchair',
      'side-table',
      'beanbag',
      'counter-coffee',
      'water-dispenser',
      'water-dispenser-top',
      'coat-rack',
      'coat-rack-top',
      'arcade',
      'arcade-top',
      'foosball-left',
      'foosball-right',
      'desk-duck',
      'desk-lava-lamp',
      'desk-cube',
      'desk-robot',
    ]);
  });

  it('puts the base colour at pixel (0, 0) of the two floor tiles', () => {
    const data = renderTiles();
    expect(tileHex(data, CARPET, 0, 0)).toBe('#8b9bb4');
    expect(tileHex(data, CORRIDOR, 0, 0)).toBe('#ead4aa');
  });

  it("draws each strip's pixels exactly in its boxes and the floor everywhere else", () => {
    const data = renderTiles();
    const boxes = parseTileset(tilesetJson(), 'placeholder.tsj').boxes;
    for (let id = 4; id <= 12; id += 1) {
      const floor = id < 8 ? CARPET : CORRIDOR;
      const strip = id === DOOR_CLOSED ? ['#733e39', '#3e2731'] : ['#262b44', '#3a4466'];
      for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          const inBox = (boxes[id] ?? []).some(
            (b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height,
          );
          const colour = tileHex(data, id, x, y);
          if (inBox) {
            expect(strip, `tile ${id} (${x}, ${y})`).toContain(colour);
          } else {
            expect(colour, `tile ${id} (${x}, ${y})`).toBe(tileHex(data, floor, x, y));
            expect(strip, `tile ${id} (${x}, ${y}) outside its boxes`).not.toContain(colour);
          }
        }
      }
    }
  });

  it('draws the inner line of a strip lighter and the corner square dark', () => {
    const data = renderTiles();
    const at = (id: number, x: number, y: number) => tileHex(data, id, x, y);
    expect([at(WALL_TOP, 8, 0), at(WALL_TOP, 8, 3)]).toStrictEqual(['#262b44', '#3a4466']);
    expect([at(WALL_LEFT, 0, 8), at(WALL_LEFT, 3, 8)]).toStrictEqual(['#262b44', '#3a4466']);
    expect(at(WALL_CORNER, 3, 3)).toBe('#262b44');
    expect(at(WALL_CORNER, 8, 3)).toBe('#3a4466');
    expect(at(WALL_CORNER, 3, 8)).toBe('#3a4466');
    expect(at(WALL_POST, 3, 3)).toBe('#262b44');
    expect([at(DOOR_CLOSED, 8, 0), at(DOOR_CLOSED, 8, 3)]).toStrictEqual(['#733e39', '#3e2731']);
  });

  it('draws the window as a 2 px frame round glass', () => {
    const data = renderTiles();
    const at = (x: number, y: number) => tileHex(data, WINDOW, x, y);
    expect([at(0, 8), at(1, 8), at(14, 8), at(15, 8), at(8, 0), at(8, 15)]).toStrictEqual(
      new Array(6).fill('#3a4466'),
    );
    expect(at(2, 2)).toBe('#2ce8f5');
    expect(at(13, 13)).toBe('#2ce8f5');
  });

  it('draws the tiles of 0010 opaque everywhere', () => {
    const data = renderTiles();
    for (let id = 0; id <= 12; id += 1) {
      for (const [x, y] of pixels()) {
        expect(tileAlpha(data, id, x, y), `tile ${id} (${x}, ${y})`).toBe(255);
      }
    }
  });

  it('uses alpha 0 or 255 only and never the shadow colour (0011)', () => {
    const data = renderTiles();
    for (let y = 0; y < SHEET_HEIGHT; y += 1) {
      for (let x = 0; x < SHEET_WIDTH; x += 1) {
        expect([0, 255]).toContain(data[(y * SHEET_WIDTH + x) * 4 + 3]);
        expect(hexAt(data, x, y)).not.toBe('#68386c');
      }
    }
  });
});

describe('the furniture tiles (0011)', () => {
  const data = renderTiles();
  const boxes = parseTileset(tilesetJson(), 'placeholder.tsj').boxes;
  const opaque = (id: number): [number, number][] =>
    pixels().filter(([x, y]) => tileAlpha(data, id, x, y) === 255);

  it('draws a partition exactly in its boxes', () => {
    for (const id of [13, 14, 15]) {
      for (const [x, y] of pixels()) {
        const expected = inBoxes(boxes[id] ?? [], x, y) ? 255 : 0;
        expect(tileAlpha(data, id, x, y), `tile ${id} (${x}, ${y})`).toBe(expected);
      }
    }
  });

  it('fills the box of the chair and the screens', () => {
    for (const id of [20, 28, 29]) {
      for (const [x, y] of pixels()) {
        if (inBoxes(boxes[id] ?? [], x, y)) {
          expect(tileAlpha(data, id, x, y), `tile ${id} (${x}, ${y})`).toBe(255);
        }
      }
    }
  });

  it('fills the solid tiles, half the cabinet top and nothing in the top rows of the leaves', () => {
    for (const id of [16, 17, 18, 19, 21, 25, 26, 27]) {
      expect(opaque(id), `tile ${id}`).toHaveLength(256);
    }
    expect(opaque(22)).toHaveLength(128);
    expect(opaque(22).every(([, y]) => y >= 8)).toBe(true);
    expect(opaque(24).some(([, y]) => y <= 3)).toBe(false);
  });

  it.each([
    [16, 0, 0, '#e4a672'],
    [16, 0, 15, '#b86f50'],
    [17, 5, 3, '#2ce8f5'],
    [18, 0, 0, '#c0cbdc'],
    [18, 0, 1, '#5a6988'],
    [13, 0, 1, '#5a6988'],
    [14, 1, 0, '#5a6988'],
    [20, 3, 3, '#3a4466'],
    [20, 3, 12, '#5a6988'],
    [21, 0, 0, '#733e39'],
    [21, 3, 3, '#c28569'],
    [22, 3, 12, '#e8b796'],
    [23, 4, 10, '#be4a2f'],
    [23, 7, 0, '#265c42'],
    [24, 6, 6, '#63c74d'],
    [24, 6, 7, '#3e8948'],
    [25, 0, 0, '#b86f50'],
    [26, 0, 0, '#ffffff'],
    [27, 3, 1, '#ffffff'],
    [27, 3, 10, '#3a4466'],
    [28, 0, 6, '#0099db'],
    [28, 0, 9, '#124e89'],
    [28, 0, 10, '#3a4466'],
    [29, 6, 0, '#0099db'],
    [29, 9, 0, '#124e89'],
    [29, 10, 0, '#3a4466'],
  ])('tile %i at (%i, %i) is %s', (id, x, y, colour) => {
    expect(tileAlpha(data, id, x, y)).toBe(255);
    expect(tileHex(data, id, x, y)).toBe(colour);
  });
});

describe('the lounge and gadget tiles (0013)', () => {
  const data = renderTiles();
  const tileset = parseTileset(tilesetJson(), 'placeholder.tsj');
  const opaque = (id: number): [number, number][] =>
    pixels().filter(([x, y]) => tileAlpha(data, id, x, y) === 255);

  it('reads back with the boxes and `low` of the spec', () => {
    const full = { x: 0, y: 0, width: 16, height: 16 };
    expect(tileset.boxes.slice(30)).toStrictEqual([
      [full],
      [full],
      [{ x: 2, y: 3, width: 12, height: 12 }],
      [{ x: 4, y: 5, width: 8, height: 8 }],
      [{ x: 3, y: 5, width: 10, height: 9 }],
      [full],
      [{ x: 4, y: 6, width: 8, height: 10 }],
      [],
      [{ x: 5, y: 8, width: 6, height: 8 }],
      [],
      [full],
      [],
      [full],
      [full],
      [full],
      [full],
      [full],
      [full],
    ]);
    const low = [30, 31, 32, 33, 34, 35, 36, 38, 42, 43, 44, 45, 46, 47];
    expect(tileset.low.flatMap((isLow, id) => (isLow && id >= 30 ? [id] : []))).toStrictEqual(low);
  });

  it('gives the three tops no entry, and makes the arcade the only new tile that stops light', () => {
    const entries = tilesetJson().tiles.map((tile) => tile.id);
    for (const top of [37, 39, 41]) {
      expect(entries).not.toContain(top);
    }
    const stopsLight = tileset.boxes.flatMap((boxes, id) =>
      id >= 30 && boxes.length > 0 && tileset.low[id] !== true ? [id] : [],
    );
    expect(stopsLight).toStrictEqual([40]);
  });

  it('keeps the pixels of ids 0–29 as 0011 drew them', () => {
    // The sheet of 0011, 240x32 in fifteen columns, as it was committed before this feature.
    const before = PNG.sync.read(
      readFileSync(join(ROOT, 'tests/fixtures/tiles/placeholder-0011.png')),
    );
    expect([before.width, before.height]).toStrictEqual([240, 32]);
    for (let id = 0; id < 30; id += 1) {
      for (const [x, y] of pixels()) {
        const was = (((Math.floor(id / 15) * 16 + y) * 240 + (id % 15) * 16 + x) * 4) as number;
        const now = ((tileY(id) + y) * SHEET_WIDTH + tileX(id) + x) * 4;
        expect(
          [data[now], data[now + 1], data[now + 2], data[now + 3]],
          `tile ${id} (${x}, ${y})`,
        ).toStrictEqual([
          before.data[was],
          before.data[was + 1],
          before.data[was + 2],
          before.data[was + 3],
        ]);
      }
    }
  });

  it('fills the solid tiles', () => {
    for (const id of [30, 31, 35, 40, 42, 43, 44, 45, 46, 47]) {
      expect(opaque(id), `tile ${id}`).toHaveLength(256);
    }
  });

  it('draws the armchair, the side-table and the water dispenser exactly in their boxes', () => {
    for (const id of [32, 33, 36]) {
      for (const [x, y] of pixels()) {
        const expected = inBoxes(tileset.boxes[id] ?? [], x, y) ? 255 : 0;
        expect(tileAlpha(data, id, x, y), `tile ${id} (${x}, ${y})`).toBe(expected);
      }
    }
  });

  it('draws the beanbag inside its box, three pixels cut from each corner', () => {
    expect(opaque(34)).toHaveLength(78);
    expect(opaque(34).every(([x, y]) => inBoxes(tileset.boxes[34] ?? [], x, y))).toBe(true);
    for (const [x, y] of [
      [3, 5],
      [4, 5],
      [3, 6],
      [12, 13],
    ] as const) {
      expect(tileAlpha(data, 34, x, y), `(${x}, ${y})`).toBe(0);
    }
  });

  it('draws the coat rack as a pole on a foot that fills the width of its box', () => {
    expect(opaque(38)).toHaveLength(2 * 14 + 6 * 2);
    for (let x = 5; x <= 10; x += 1) {
      expect(tileAlpha(data, 38, x, 15)).toBe(255);
    }
  });

  it('keeps the tops in the lower 10, 12 and 14 px', () => {
    expect(opaque(37).some(([, y]) => y < 6)).toBe(false);
    expect(opaque(39).some(([, y]) => y < 4)).toBe(false);
    expect(opaque(41).some(([, y]) => y < 2)).toBe(false);
    expect(opaque(41)).toHaveLength(14 * 16);
  });

  it.each([
    [30, 0, 8, '#a22633'],
    [30, 8, 0, '#a22633'],
    [30, 8, 8, '#e43b44'],
    [30, 15, 8, '#e43b44'],
    [31, 15, 8, '#a22633'],
    [31, 0, 8, '#e43b44'],
    [32, 2, 10, '#a22633'],
    [32, 13, 10, '#a22633'],
    [32, 8, 4, '#a22633'],
    [32, 8, 10, '#e43b44'],
    [33, 4, 8, '#b86f50'],
    [33, 8, 5, '#b86f50'],
    [33, 8, 8, '#ead4aa'],
    [33, 8, 11, '#b86f50'],
    [34, 8, 10, '#f77622'],
    [34, 6, 6, '#feae34'],
    [35, 0, 0, '#ffffff'],
    [35, 0, 15, '#c0cbdc'],
    [35, 5, 5, '#262b44'],
    [35, 7, 8, '#ffffff'],
    [35, 10, 3, '#e43b44'],
    [36, 4, 6, '#c0cbdc'],
    [36, 6, 9, '#e43b44'],
    [36, 9, 10, '#0099db'],
    [37, 5, 6, '#2ce8f5'],
    [37, 5, 8, '#0099db'],
    [37, 7, 15, '#2ce8f5'],
    [38, 7, 0, '#3e2731'],
    [38, 5, 14, '#3e2731'],
    [39, 7, 4, '#3e2731'],
    [39, 3, 5, '#3e2731'],
    [39, 2, 6, '#124e89'],
    [39, 13, 15, '#feae34'],
    [40, 0, 0, '#124e89'],
    [40, 0, 2, '#262b44'],
    [40, 4, 3, '#e43b44'],
    [40, 11, 4, '#fee761'],
    [41, 0, 2, '#124e89'],
    [41, 1, 3, '#f77622'],
    [41, 2, 7, '#181425'],
    [41, 3, 11, '#63c74d'],
    [41, 7, 9, '#fee761'],
    [41, 12, 12, '#2ce8f5'],
    [42, 0, 8, '#733e39'],
    [42, 15, 8, '#3e8948'],
    [42, 7, 0, '#c0cbdc'],
    [42, 6, 4, '#e43b44'],
    [43, 15, 8, '#733e39'],
    [43, 0, 8, '#3e8948'],
    [43, 9, 11, '#0099db'],
    [44, 0, 0, '#c0cbdc'],
    [44, 0, 1, '#5a6988'],
    [44, 0, 15, '#b86f50'],
    [44, 5, 7, '#fee761'],
    [44, 11, 5, '#f77622'],
    [45, 6, 10, '#5a6988'],
    [45, 6, 4, '#f77622'],
    [45, 7, 5, '#e43b44'],
    [46, 7, 6, '#e43b44'],
    [46, 8, 7, '#ffffff'],
    [46, 9, 8, '#0099db'],
    [46, 6, 6, '#e4a672'],
    [47, 5, 4, '#c0cbdc'],
    [47, 6, 6, '#2ce8f5'],
    [47, 9, 6, '#2ce8f5'],
  ])('tile %i at (%i, %i) is %s', (id, x, y, colour) => {
    expect(tileAlpha(data, id, x, y)).toBe(255);
    expect(tileHex(data, id, x, y)).toBe(colour);
  });
});
