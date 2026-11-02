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

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface TileMap {
  /** In tiles. */
  readonly width: number;
  /** In tiles. */
  readonly height: number;
  /** Row-major, width × height, tileset ids or EMPTY. */
  readonly ground: readonly number[];
  readonly detail: readonly number[];
  readonly above: readonly number[];
  /** Pixels; 0004 uses it as the feet position. */
  readonly spawn: Point;
  /** Row-major, width × height: a solid tile on any of the three layers. */
  readonly solid: readonly boolean[];
}

function isTileLayerName(name: string): name is TileLayerName {
  return (TILE_LAYER_NAMES as readonly string[]).includes(name);
}

/** What a tile layer's cells need to know about the map and its tileset. */
interface CellContext {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly firstGid: number;
}

/** Layer data as tileset ids: gid 0 is EMPTY, gid g is g − firstgid. */
function readCells(layer: Json, name: TileLayerName, context: CellContext): number[] {
  const data = asArray(layer.data, context.file, `layer "${name}" data`);
  return data.map((value, index) => {
    const gid = asNumber(value, context.file, `layer "${name}" cell ${index}`);
    return gid === 0 ? EMPTY : gid - context.firstGid;
  });
}

function readSpawn(layer: Json, file: string): Point {
  const objects = asArray(layer.objects, file, `layer "${OBJECT_LAYER_NAME}" objects`).map(
    (value) => asRecord(value, file, 'object'),
  );
  const spawn = objects.find((object) => object.point === true && object.name === 'spawn');
  if (spawn === undefined) {
    fail(file, `layer "${OBJECT_LAYER_NAME}" has no point object named "spawn"`);
  }
  return { x: asNumber(spawn.x, file, 'spawn x'), y: asNumber(spawn.y, file, 'spawn y') };
}

export function parseTileMap(mapJson: unknown, tileset: Tileset, mapFile: string): TileMap {
  const map = asRecord(mapJson, mapFile, 'map');
  const width = asNumber(map.width, mapFile, 'width');
  const height = asNumber(map.height, mapFile, 'height');
  const firstGid = asNumber(tilesetEntry(map, mapFile).firstgid, mapFile, 'firstgid');
  const context: CellContext = { file: mapFile, width, height, firstGid };
  const layers: Partial<Record<TileLayerName, number[]>> = {};
  let spawn: Point | undefined;
  for (const value of asArray(map.layers, mapFile, 'layers')) {
    const layer = asRecord(value, mapFile, 'layer');
    const name = asString(layer.name, mapFile, 'layer name');
    if (name === OBJECT_LAYER_NAME) {
      spawn = readSpawn(layer, mapFile);
    } else if (isTileLayerName(name)) {
      layers[name] = readCells(layer, name, context);
    }
  }
  if (spawn === undefined) {
    fail(mapFile, `layer "${OBJECT_LAYER_NAME}" is missing`);
  }
  const empty = () => new Array<number>(width * height).fill(EMPTY);
  const ground = layers.ground ?? empty();
  const detail = layers.detail ?? empty();
  const above = layers.above ?? empty();
  const isSolid = (id: number | undefined) => id !== undefined && tileset.solid[id] === true;
  const solid = ground.map(
    (_, index) => isSolid(ground[index]) || isSolid(detail[index]) || isSolid(above[index]),
  );
  return { width, height, ground, detail, above, spawn, solid };
}
