import type { PaletteColour } from '../src/render/palette.ts';

/**
 * The placeholder tileset (visual.md §5): seven 16x16 tiles in one row, drawn from code in
 * Endesga 32. Pure — it returns pixels and the .tsj object; tools/gen-tiles.ts writes the files.
 * Pixel (0, 0) of every tile is its base colour.
 */

export const TILE_SIZE = 16;

export interface TileKind {
  readonly id: number;
  readonly name: string;
  readonly base: PaletteColour;
  readonly second: PaletteColour;
  readonly solid: boolean;
}

export const TILE_KINDS: readonly TileKind[] = [
  { id: 0, name: 'grass', base: '#63c74d', second: '#3e8948', solid: false },
  { id: 1, name: 'path', base: '#e8b796', second: '#c28569', solid: false },
  { id: 2, name: 'wall', base: '#8b9bb4', second: '#5a6988', solid: true },
  { id: 3, name: 'water', base: '#0099db', second: '#2ce8f5', solid: true },
  { id: 4, name: 'fence', base: '#b86f50', second: '#733e39', solid: true },
  { id: 5, name: 'door-closed', base: '#733e39', second: '#3e2731', solid: true },
  { id: 6, name: 'roof', base: '#be4a2f', second: '#a22633', solid: true },
];

/** 7 × 16. */
export const SHEET_WIDTH = 112;
export const SHEET_HEIGHT = 16;

/** Which colour a tile-local pixel gets; `clear` is transparent, alpha 0. */
type Ink = 'base' | 'second' | 'clear';

function within(value: number, from: number, to: number): boolean {
  return value >= from && value <= to;
}

function scatter(points: readonly (readonly [number, number])[]): (x: number, y: number) => Ink {
  return (x, y) => (points.some(([px, py]) => px === x && py === y) ? 'second' : 'base');
}

/** Brick joints: four mortar rows, the vertical joints offset from course to course. */
function joints(x: number, y: number): Ink {
  const row = y === 3 || y === 7 || y === 11 || y === 15;
  const upper = x === 7 && (within(y, 0, 2) || within(y, 8, 10));
  const lower = (x === 3 || x === 11) && (within(y, 4, 6) || within(y, 12, 14));
  return row || upper || lower ? 'second' : 'base';
}

/** The patterns in tile-local pixels (x, y), 0–15, by tile id. */
const PATTERNS: readonly ((x: number, y: number) => Ink)[] = [
  scatter([
    [2, 3],
    [9, 1],
    [13, 6],
    [5, 10],
    [11, 12],
    [1, 14],
  ]),
  scatter([
    [3, 2],
    [10, 4],
    [6, 8],
    [13, 11],
    [1, 13],
    [8, 14],
  ]),
  joints,
  (x, y) =>
    ((y === 3 || y === 9) && within(x, 2, 6)) || ((y === 6 || y === 12) && within(x, 9, 13))
      ? 'second'
      : 'base',
  // Posts come last, in the base colour, over the rails; the rest is transparent.
  (x, y) => {
    if (x === 0 || x === 1 || x === 8 || x === 9) {
      return 'base';
    }
    return y === 4 || y === 5 || y === 11 || y === 12 ? 'second' : 'clear';
  },
  (x, y) =>
    ((x === 2 || x === 13) && within(y, 2, 15)) ||
    (y === 2 && within(x, 2, 13)) ||
    (x === 11 && y === 9)
      ? 'second'
      : 'base',
  joints,
];

function rgb(colour: PaletteColour): readonly [number, number, number] {
  return [
    Number.parseInt(colour.slice(1, 3), 16),
    Number.parseInt(colour.slice(3, 5), 16),
    Number.parseInt(colour.slice(5, 7), 16),
  ];
}

/** RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderTiles(): Uint8Array {
  const data = new Uint8Array(SHEET_WIDTH * SHEET_HEIGHT * 4);
  for (const kind of TILE_KINDS) {
    const pattern = PATTERNS[kind.id];
    if (pattern === undefined) {
      throw new Error(`tile ${kind.id} (${kind.name}) has no pattern`);
    }
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const ink = pattern(x, y);
        if (ink === 'clear') {
          continue;
        }
        const offset = (y * SHEET_WIDTH + kind.id * TILE_SIZE + x) * 4;
        data.set([...rgb(ink === 'base' ? kind.base : kind.second), 255], offset);
      }
    }
  }
  return data;
}

interface SolidProperty {
  readonly name: 'solid';
  readonly type: 'bool';
  readonly value: true;
}

/** The .tsj object, as Tiled reads it. */
export interface TilesetJson {
  readonly columns: number;
  readonly image: string;
  readonly imageheight: number;
  readonly imagewidth: number;
  readonly margin: number;
  readonly name: string;
  readonly spacing: number;
  readonly tilecount: number;
  readonly tileheight: number;
  readonly tiles: readonly { readonly id: number; readonly properties: readonly SolidProperty[] }[];
  readonly tilewidth: number;
  readonly type: 'tileset';
  readonly version: '1.10';
}

/** Keys in Tiled's own order, so that a save in Tiled changes as little as possible. */
export function tilesetJson(): TilesetJson {
  return {
    columns: SHEET_WIDTH / TILE_SIZE,
    image: 'placeholder.png',
    imageheight: SHEET_HEIGHT,
    imagewidth: SHEET_WIDTH,
    margin: 0,
    name: 'placeholder',
    spacing: 0,
    tilecount: TILE_KINDS.length,
    tileheight: TILE_SIZE,
    tiles: TILE_KINDS.filter((kind) => kind.solid).map((kind) => ({
      id: kind.id,
      properties: [{ name: 'solid', type: 'bool', value: true }],
    })),
    tilewidth: TILE_SIZE,
    type: 'tileset',
    version: '1.10',
  };
}
