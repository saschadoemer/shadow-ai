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
    // Rule 12: the game has no animated tiles; drawing the still image instead would hide that.
    if (Array.isArray(tile.animation) && tile.animation.length > 0) {
      fail(
        file,
        `tile ${asNumber(tile.id, file, 'tile id')} is animated; animated tiles are not supported`,
      );
    }
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

const LAYER_NAMES = [...TILE_LAYER_NAMES, OBJECT_LAYER_NAME].join(', ');

/** The smallest map that covers the 320x180 surface (rule 6): 20 columns, 12 rows. */
const MIN_COLUMNS = 20;
const MIN_ROWS = 12;

/** Any gid at or above this has one of Tiled's four flip and rotation bits set (rule 8). */
const FIRST_FLAGGED_GID = 0x10000000;

/** What a tile layer's cells need to know about the map and its tileset. */
interface CellContext {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly firstGid: number;
  readonly tileCount: number;
}

/** Rule 7: only Tiled's default, CSV, where `data` is an array of numbers. */
function checkFormat(layer: Json, name: TileLayerName, file: string): void {
  for (const field of ['encoding', 'compression'] as const) {
    const value = layer[field];
    const absent = value === undefined || (field === 'encoding' ? value === 'csv' : value === '');
    if (!absent) {
      fail(
        file,
        `layer "${name}" uses ${field} ${JSON.stringify(value)}; only CSV (an array of numbers) is supported`,
      );
    }
  }
}

/** Layer data as tileset ids: gid 0 is EMPTY, gid g is g − firstgid (rules 7, 8, 9). */
function readCells(layer: Json, name: TileLayerName, context: CellContext): number[] {
  const { file, width, height, firstGid, tileCount } = context;
  checkFormat(layer, name, file);
  const data = asArray(layer.data, file, `layer "${name}" data`);
  if (data.length !== width * height) {
    fail(file, `layer "${name}" has ${data.length} cells; ${width * height} are required`);
  }
  const lastGid = firstGid + tileCount - 1;
  return data.map((gid, index) => {
    const cell = `layer "${name}" cell (${index % width}, ${Math.floor(index / width)})`;
    if (typeof gid !== 'number' || !Number.isInteger(gid) || gid < 0) {
      fail(file, `${cell} is not a whole number`);
    }
    if (gid >= FIRST_FLAGGED_GID) {
      fail(file, `${cell} is flipped or rotated; flipped or rotated tiles are not supported`);
    }
    if (gid === 0) {
      return EMPTY;
    }
    if (gid < firstGid || gid > lastGid) {
      fail(
        file,
        `${cell} has tile id ${gid}, which is outside the tileset (${firstGid}–${lastGid})`,
      );
    }
    return gid - firstGid;
  });
}

/** Rule 4: exactly one point object named `spawn`. */
function readSpawn(layer: Json, file: string): Point {
  const what = `layer "${OBJECT_LAYER_NAME}"`;
  const spawns = asArray(layer.objects, file, `${what} objects`)
    .map((value) => asRecord(value, file, 'object'))
    .filter((object) => object.point === true && object.name === 'spawn');
  const [spawn] = spawns;
  if (spawn === undefined) {
    fail(file, `${what} has no point object named "spawn"`);
  }
  if (spawns.length > 1) {
    fail(file, `${what} has ${spawns.length} point objects named "spawn"; exactly one is required`);
  }
  return { x: asNumber(spawn.x, file, 'spawn x'), y: asNumber(spawn.y, file, 'spawn y') };
}

/** Rules 11, 7, 5 and 6: what the map as a whole must be, before any layer is read. */
function checkMap(map: Json, file: string): { readonly width: number; readonly height: number } {
  const orientation = asString(map.orientation, file, 'orientation');
  if (orientation !== 'orthogonal') {
    fail(file, `orientation "${orientation}" is not supported; only orthogonal`);
  }
  if (map.infinite === true) {
    fail(file, 'infinite maps are not supported');
  }
  checkTileSize(map, file);
  const width = asNumber(map.width, file, 'width');
  const height = asNumber(map.height, file, 'height');
  if (width < MIN_COLUMNS || height < MIN_ROWS) {
    fail(
      file,
      `map is ${width}x${height} tiles; at least ${MIN_COLUMNS}x${MIN_ROWS} (320x180 px) is required`,
    );
  }
  return { width, height };
}

/** Rules 1 and 2: a known name, and the layer type that goes with it. */
function checkLayer(layer: Json, file: string): TileLayerName | typeof OBJECT_LAYER_NAME {
  const name = asString(layer.name, file, 'layer name');
  if (name !== OBJECT_LAYER_NAME && !isTileLayerName(name)) {
    fail(file, `layer "${name}" is not one of ${LAYER_NAMES}`);
  }
  const type = asString(layer.type, file, `layer "${name}" type`);
  if (name === OBJECT_LAYER_NAME && type !== 'objectgroup') {
    fail(file, `layer "${name}" must be an object layer`);
  }
  if (name !== OBJECT_LAYER_NAME && type !== 'tilelayer') {
    fail(file, `layer "${name}" must be a tile layer`);
  }
  return name;
}

/** Rule 13: the spawn lies inside the map, on a cell that is not solid. The cell, not a box. */
function checkSpawn(
  spawn: Point,
  width: number,
  height: number,
  solid: readonly boolean[],
  file: string,
): void {
  const widthPx = width * TILE_SIZE;
  const heightPx = height * TILE_SIZE;
  if (spawn.x < 0 || spawn.y < 0 || spawn.x >= widthPx || spawn.y >= heightPx) {
    fail(file, `spawn (${spawn.x}, ${spawn.y}) is outside the map (${widthPx}x${heightPx} px)`);
  }
  const column = Math.floor(spawn.x / TILE_SIZE);
  const row = Math.floor(spawn.y / TILE_SIZE);
  if (solid[row * width + column] === true) {
    fail(file, `spawn (${spawn.x}, ${spawn.y}) is on a solid tile (${column}, ${row})`);
  }
}

export function parseTileMap(mapJson: unknown, tileset: Tileset, mapFile: string): TileMap {
  const map = asRecord(mapJson, mapFile, 'map');
  const { width, height } = checkMap(map, mapFile);
  const firstGid = asNumber(tilesetEntry(map, mapFile).firstgid, mapFile, 'firstgid');
  const context: CellContext = {
    file: mapFile,
    width,
    height,
    firstGid,
    tileCount: tileset.tileCount,
  };
  const layers: Partial<Record<TileLayerName, number[]>> = {};
  const seen = new Set<string>();
  let objects: Json | undefined;
  for (const value of asArray(map.layers, mapFile, 'layers')) {
    const layer = asRecord(value, mapFile, 'layer');
    const name = checkLayer(layer, mapFile);
    if (seen.has(name)) {
      fail(mapFile, `layer "${name}" appears twice`);
    }
    seen.add(name);
    if (name === OBJECT_LAYER_NAME) {
      objects = layer;
    } else {
      layers[name] = readCells(layer, name, context);
    }
  }
  const { ground } = layers;
  if (ground === undefined) {
    fail(mapFile, 'layer "ground" is missing');
  }
  if (objects === undefined) {
    fail(mapFile, `layer "${OBJECT_LAYER_NAME}" is missing`);
  }
  const spawn = readSpawn(objects, mapFile);
  const empty = () => new Array<number>(width * height).fill(EMPTY);
  const detail = layers.detail ?? empty();
  const above = layers.above ?? empty();
  const isSolid = (id: number | undefined) => id !== undefined && tileset.solid[id] === true;
  const solid = ground.map(
    (id, index) => isSolid(id) || isSolid(detail[index]) || isSolid(above[index]),
  );
  checkSpawn(spawn, width, height, solid, mapFile);
  return { width, height, ground, detail, above, spawn, solid };
}
