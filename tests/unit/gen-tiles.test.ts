import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { parseTileset } from '../../src/engine/tiled';
import { encodePng, encodeTsj } from '../../tools/gen-tiles.ts';
import {
  CARPET,
  CORRIDOR,
  DOOR_CLOSED,
  renderTiles,
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

  it('is 208x16: thirteen tiles in one row', () => {
    expect(SHEET_WIDTH).toBe(13 * TILE_SIZE);
    expect(TILE_KINDS).toHaveLength(13);
    expect(renderTiles()).toHaveLength(SHEET_WIDTH * SHEET_HEIGHT * 4);
  });

  it('describes thirteen tiles in the .tsj, solid as a whole on ids 2 and 3 only', () => {
    const tsj = tilesetJson();
    expect(tsj).toMatchObject({
      columns: 13,
      tilecount: 13,
      tilewidth: 16,
      tileheight: 16,
      imagewidth: 208,
      imageheight: 16,
      image: 'placeholder.png',
    });
    const solid = tsj.tiles.filter((tile) =>
      (tile.properties ?? []).some((p) => p.name === 'solid' && p.value === true),
    );
    expect(solid.map((tile) => tile.id)).toStrictEqual([2, 3]);
  });

  it('reads back, through the loader, with the boxes of the spec', () => {
    const top = { x: 0, y: 0, width: 16, height: 4 };
    const left = { x: 0, y: 0, width: 4, height: 16 };
    const post = { x: 0, y: 0, width: 4, height: 4 };
    const full = { x: 0, y: 0, width: 16, height: 16 };
    expect(parseTileset(tilesetJson(), 'placeholder.tsj').boxes).toStrictEqual([
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
    ]);
  });

  it('puts the base colour at pixel (0, 0) of the two floor tiles', () => {
    const data = renderTiles();
    expect(hexAt(data, CARPET * TILE_SIZE, 0)).toBe('#8b9bb4');
    expect(hexAt(data, CORRIDOR * TILE_SIZE, 0)).toBe('#ead4aa');
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
          const colour = hexAt(data, id * TILE_SIZE + x, y);
          if (inBox) {
            expect(strip, `tile ${id} (${x}, ${y})`).toContain(colour);
          } else {
            expect(colour, `tile ${id} (${x}, ${y})`).toBe(hexAt(data, floor * TILE_SIZE + x, y));
            expect(strip, `tile ${id} (${x}, ${y}) outside its boxes`).not.toContain(colour);
          }
        }
      }
    }
  });

  it('draws the inner line of a strip lighter and the corner square dark', () => {
    const data = renderTiles();
    const at = (id: number, x: number, y: number) => hexAt(data, id * TILE_SIZE + x, y);
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
    const at = (x: number, y: number) => hexAt(data, WINDOW * TILE_SIZE + x, y);
    expect([at(0, 8), at(1, 8), at(14, 8), at(15, 8), at(8, 0), at(8, 15)]).toStrictEqual(
      new Array(6).fill('#3a4466'),
    );
    expect(at(2, 2)).toBe('#2ce8f5');
    expect(at(13, 13)).toBe('#2ce8f5');
  });

  it('is opaque everywhere and never uses the shadow colour', () => {
    const data = renderTiles();
    for (let y = 0; y < SHEET_HEIGHT; y += 1) {
      for (let x = 0; x < SHEET_WIDTH; x += 1) {
        expect(data[(y * SHEET_WIDTH + x) * 4 + 3]).toBe(255);
        expect(hexAt(data, x, y)).not.toBe('#68386c');
      }
    }
  });
});
