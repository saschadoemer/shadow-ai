/**
 * Tiled JSON → TileMap (architecture.md §6). Pure functions over parsed JSON: they read only
 * what the game uses and throw an Error whose message starts with the file and names the
 * problem. Node runs this file directly for tools/, so it uses erasable TypeScript only.
 */

export const TILE_SIZE = 16;
/** A cell with no tile: gid 0 in Tiled. */
export const EMPTY = -1;
/** The tile layers, in draw order: `ground` and `detail` below the player, `above` over it. */
export const TILE_LAYER_NAMES = ['ground', 'detail', 'above'] as const;
export type TileLayerName = (typeof TILE_LAYER_NAMES)[number];
export const OBJECT_LAYER_NAME = 'objects';

export interface Tileset {
  /** The image path as written in the .tsj, relative to it. */
  readonly image: string;
  readonly columns: number;
  readonly tileCount: number;
  /** Index: tile id. */
  readonly solid: readonly boolean[];
}

type Json = Record<string, unknown>;

function fail(file: string, problem: string): never {
  throw new Error(`${file}: ${problem}`);
}

function asRecord(value: unknown, file: string, what: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(file, `${what} is not an object`);
  }
  return value as Json;
}

function asArray(value: unknown, file: string, what: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(file, `${what} is not an array`);
  }
  return value;
}

function asNumber(value: unknown, file: string, what: string): number {
  if (typeof value !== 'number') {
    fail(file, `${what} is not a number`);
  }
  return value;
}

function asString(value: unknown, file: string, what: string): string {
  if (typeof value !== 'string') {
    fail(file, `${what} is not a string`);
  }
  return value;
}

/** Rule 5: tiles are 16x16, in the map and in the tileset. */
function checkTileSize(json: Json, file: string): void {
  const width = asNumber(json.tilewidth, file, 'tilewidth');
  const height = asNumber(json.tileheight, file, 'tileheight');
  if (width !== TILE_SIZE || height !== TILE_SIZE) {
    fail(file, `tile size is ${width}x${height}; tiles are 16x16`);
  }
}

function isSolidProperty(value: unknown, file: string): boolean {
  const property = asRecord(value, file, 'tile property');
  return property.name === 'solid' && property.type === 'bool' && property.value === true;
}

export function parseTileset(json: unknown, file: string): Tileset {
  const tileset = asRecord(json, file, 'tileset');
  checkTileSize(tileset, file);
  const columns = asNumber(tileset.columns, file, 'columns');
  const tileCount = asNumber(tileset.tilecount, file, 'tilecount');
  const image = asString(tileset.image, file, 'image');
  const solidIds = new Set<number>();
  const tiles = tileset.tiles === undefined ? [] : asArray(tileset.tiles, file, 'tiles');
  for (const entry of tiles) {
    const tile = asRecord(entry, file, 'tile');
    const properties =
      tile.properties === undefined ? [] : asArray(tile.properties, file, 'tile properties');
    if (properties.some((property) => isSolidProperty(property, file))) {
      solidIds.add(asNumber(tile.id, file, 'tile id'));
    }
  }
  return {
    image,
    columns,
    tileCount,
    solid: Array.from({ length: tileCount }, (_, id) => solidIds.has(id)),
  };
}

/** The map's one tileset reference (rule 10). */
function tilesetEntry(map: Json, mapFile: string): Json {
  const tilesets = asArray(map.tilesets, mapFile, 'tilesets');
  if (tilesets.length === 0) {
    fail(mapFile, 'map has no tileset');
  }
  if (tilesets.length > 1) {
    fail(mapFile, `map has ${tilesets.length} tilesets; exactly one is required`);
  }
  return asRecord(tilesets[0], mapFile, 'tileset');
}

/** The `source` of the map's one external tileset, as written (relative to the map). */
export function tilesetSource(mapJson: unknown, mapFile: string): string {
  const entry = tilesetEntry(asRecord(mapJson, mapFile, 'map'), mapFile);
  if (entry.source === undefined) {
    fail(mapFile, 'tileset is embedded; an external .tsj is required');
  }
  const source = asString(entry.source, mapFile, 'tileset source');
  if (!source.endsWith('.tsj')) {
    fail(mapFile, `tileset source "${source}" does not end in .tsj`);
  }
  return source;
}
