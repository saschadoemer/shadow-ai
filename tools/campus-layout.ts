import { EMPTY, type Point, TILE_SIZE } from '../src/engine/tiled.ts';

/**
 * The campus as data (feature 0006, world.md §1): rectangles of path and water on `ground`,
 * buildings and fences on `detail`, the spawn and the creatures' points. The tables of the feature spec are the
 * layout; this file mirrors them, one entry per row, columns c0–c1 and rows r0–r1 inclusive.
 * Pure — it returns the layers and the .tmj object; tools/gen-campus.ts writes the file. Retired
 * when the art pass takes the map over by hand in Tiled (visual.md §5).
 */

export const CAMPUS_WIDTH = 128;
export const CAMPUS_HEIGHT = 96;

/** Tileset ids of the placeholder tileset (architecture.md §7). */
export const GRASS = 0;
export const PATH = 1;
export const WALL = 2;
export const WATER = 3;
export const FENCE = 4;
export const DOOR = 5;
export const ROOF = 6;

/** A rectangle of cells as the spec's tables write it: columns c0–c1, rows r0–r1, both ends inclusive. */
export interface CellRect {
  readonly c0: number;
  readonly c1: number;
  readonly r0: number;
  readonly r1: number;
}

function cells(c0: number, c1: number, r0: number, r1: number): CellRect {
  return { c0, c1, r0, r1 };
}

export interface Area {
  readonly name: string;
  readonly cells: CellRect;
}

/** A block of roof tiles whose lowest row is wall, with its doors in that row. */
export interface Building {
  readonly name: string;
  readonly footprint: CellRect;
  /** Door cells; each lies in the footprint's last row. */
  readonly doors: readonly Point[];
}

/** The border of a rectangle, minus the gap cells. */
export interface Fence {
  readonly name: string;
  readonly ring: CellRect;
  readonly gaps: readonly Point[];
}

export const PATHS: readonly Area[] = [
  { name: 'courtyard', cells: cells(56, 71, 42, 51) },
  { name: 'west avenue', cells: cells(20, 55, 46, 48) },
  { name: 'east avenue', cells: cells(72, 107, 46, 48) },
  { name: 'north avenue', cells: cells(20, 107, 20, 22) },
  { name: 'west link', cells: cells(40, 42, 23, 45) },
  { name: 'east link', cells: cells(84, 86, 23, 45) },
  { name: 'south avenue', cells: cells(62, 65, 52, 75) },
  { name: 'parking road', cells: cells(22, 61, 72, 75) },
  { name: 'south-east avenue', cells: cells(66, 107, 72, 75) },
  { name: 'reception path', cells: cells(55, 61, 62, 62) },
  { name: 'parking lot', cells: cells(6, 23, 68, 89) },
];

export const WATERS: readonly Area[] = [
  { name: 'pond', cells: cells(30, 37, 62, 69) },
  { name: 'canal', cells: cells(120, 126, 1, 94) },
];

export const BUILDINGS: readonly Building[] = [
  {
    name: 'main building',
    footprint: cells(56, 71, 28, 41),
    doors: [
      { x: 64, y: 41 },
      { x: 57, y: 41 },
    ],
  },
  {
    name: "data protection officer's office",
    footprint: cells(46, 53, 41, 45),
    doors: [{ x: 49, y: 45 }],
  },
  { name: 'reception', footprint: cells(55, 60, 58, 61), doors: [{ x: 58, y: 61 }] },
  { name: 'sales', footprint: cells(90, 105, 38, 45), doors: [{ x: 97, y: 45 }] },
  { name: 'marketing', footprint: cells(70, 85, 64, 71), doors: [{ x: 77, y: 71 }] },
  { name: 'support', footprint: cells(92, 107, 64, 71), doors: [{ x: 99, y: 71 }] },
  { name: 'hr', footprint: cells(20, 35, 12, 19), doors: [{ x: 27, y: 19 }] },
  { name: 'accounting', footprint: cells(20, 35, 38, 45), doors: [{ x: 27, y: 45 }] },
  { name: 'development', footprint: cells(92, 111, 10, 19), doors: [{ x: 101, y: 19 }] },
  { name: 'meeting rooms', footprint: cells(90, 101, 26, 31), doors: [{ x: 95, y: 31 }] },
  { name: 'canteen', footprint: cells(40, 55, 64, 71), doors: [{ x: 47, y: 71 }] },
];

export const FENCES: readonly Fence[] = [
  { name: 'outer ring', ring: cells(0, 127, 0, 95), gaps: [] },
  {
    name: 'parking lot',
    ring: cells(5, 24, 67, 90),
    gaps: [
      { x: 24, y: 72 },
      { x: 24, y: 73 },
      { x: 24, y: 74 },
      { x: 24, y: 75 },
    ],
  },
  { name: 'meeting rooms', ring: cells(88, 103, 24, 34), gaps: [{ x: 95, y: 34 }] },
];

/** The spawn in pixels: tile (64, 45), in the courtyard in front of the main building's entrance. */
export const SPAWN: Point = { x: 1024, y: 734 };

/**
 * The snippets of feature 0008, feet in pixels: two on the east avenue — tile (80, 47) and
 * tile (97, 47), in front of the Sales door — and one inside the meeting rooms' fence, tile
 * (99, 33). Placeholders like the campus; they move inside when Sales has an interior (M5).
 */
export const SNIPPETS: readonly Point[] = [
  { x: 1288, y: 760 },
  { x: 1560, y: 760 },
  { x: 1592, y: 540 },
];

function index(column: number, row: number): number {
  return row * CAMPUS_WIDTH + column;
}

function fill(layer: number[], rect: CellRect, id: number): void {
  for (let row = rect.r0; row <= rect.r1; row += 1) {
    for (let column = rect.c0; column <= rect.c1; column += 1) {
      layer[index(column, row)] = id;
    }
  }
}

/** Places a structure tile on `detail`; two structures never share a cell. */
function put(detail: number[], column: number, row: number, id: number, what: string): void {
  const at = index(column, row);
  if (detail[at] !== EMPTY) {
    throw new Error(`${what}: cell (${column}, ${row}) is already taken`);
  }
  detail[at] = id;
}

function onRing(rect: CellRect, column: number, row: number): boolean {
  return row === rect.r0 || row === rect.r1 || column === rect.c0 || column === rect.c1;
}

export interface CampusLayers {
  readonly ground: readonly number[];
  readonly detail: readonly number[];
}

/** The two layers as tileset ids, row-major; `detail` is EMPTY where nothing stands. */
export function buildLayers(): CampusLayers {
  const ground = new Array<number>(CAMPUS_WIDTH * CAMPUS_HEIGHT).fill(GRASS);
  const detail = new Array<number>(CAMPUS_WIDTH * CAMPUS_HEIGHT).fill(EMPTY);
  for (const path of PATHS) {
    fill(ground, path.cells, PATH);
  }
  for (const water of WATERS) {
    fill(ground, water.cells, WATER);
  }
  for (const { name, ring, gaps } of FENCES) {
    for (let row = ring.r0; row <= ring.r1; row += 1) {
      for (let column = ring.c0; column <= ring.c1; column += 1) {
        const gap = gaps.some((cell) => cell.x === column && cell.y === row);
        if (onRing(ring, column, row) && !gap) {
          put(detail, column, row, FENCE, `fence ${name}`);
        }
      }
    }
  }
  for (const { name, footprint, doors } of BUILDINGS) {
    const { c0, c1, r0, r1 } = footprint;
    for (const door of doors) {
      if (door.y !== r1 || door.x < c0 || door.x > c1) {
        throw new Error(`${name}: door (${door.x}, ${door.y}) is not in the wall row ${r1}`);
      }
    }
    for (let row = r0; row < r1; row += 1) {
      for (let column = c0; column <= c1; column += 1) {
        put(detail, column, row, ROOF, name);
      }
    }
    for (let column = c0; column <= c1; column += 1) {
      const door = doors.some((cell) => cell.x === column);
      put(detail, column, r1, door ? DOOR : WALL, name);
    }
  }
  return { ground, detail };
}

interface TileLayerJson {
  readonly data: readonly number[];
  readonly height: number;
  readonly id: number;
  readonly name: string;
  readonly opacity: 1;
  readonly type: 'tilelayer';
  readonly visible: true;
  readonly width: number;
  readonly x: 0;
  readonly y: 0;
}

interface PointJson {
  readonly height: 0;
  readonly id: number;
  readonly name: string;
  readonly point: true;
  readonly rotation: 0;
  readonly type: '';
  readonly visible: true;
  readonly width: 0;
  readonly x: number;
  readonly y: number;
}

interface ObjectLayerJson {
  readonly draworder: 'topdown';
  readonly id: number;
  readonly name: 'objects';
  readonly objects: readonly PointJson[];
  readonly opacity: 1;
  readonly type: 'objectgroup';
  readonly visible: true;
  readonly x: 0;
  readonly y: 0;
}

/** The .tmj object, keys in Tiled's order (as Tiled 1.11 writes a map), so the file opens in Tiled. */
export interface MapJson {
  readonly compressionlevel: -1;
  readonly height: number;
  readonly infinite: false;
  readonly layers: readonly [TileLayerJson, TileLayerJson, ObjectLayerJson];
  readonly nextlayerid: number;
  readonly nextobjectid: number;
  readonly orientation: 'orthogonal';
  readonly renderorder: 'right-down';
  readonly tiledversion: '1.11.2';
  readonly tileheight: number;
  readonly tilesets: readonly [{ readonly firstgid: 1; readonly source: string }];
  readonly tilewidth: number;
  readonly type: 'map';
  readonly version: '1.10';
  readonly width: number;
}

/** Tileset ids as gids: EMPTY is 0, id n is n + 1 (firstgid 1). */
function gids(ids: readonly number[]): number[] {
  return ids.map((id) => (id === EMPTY ? 0 : id + 1));
}

function tileLayer(id: number, name: string, ids: readonly number[]): TileLayerJson {
  return {
    data: gids(ids),
    height: CAMPUS_HEIGHT,
    id,
    name,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: CAMPUS_WIDTH,
    x: 0,
    y: 0,
  };
}

function pointObject(id: number, name: string, at: Point): PointJson {
  return {
    height: 0,
    id,
    name,
    point: true,
    rotation: 0,
    type: '',
    visible: true,
    width: 0,
    x: at.x,
    y: at.y,
  };
}

export function campusJson(): MapJson {
  const { ground, detail } = buildLayers();
  return {
    compressionlevel: -1,
    height: CAMPUS_HEIGHT,
    infinite: false,
    layers: [
      tileLayer(1, 'ground', ground),
      tileLayer(2, 'detail', detail),
      {
        draworder: 'topdown',
        id: 3,
        name: 'objects',
        objects: [
          pointObject(1, 'spawn', SPAWN),
          ...SNIPPETS.map((feet, n) => pointObject(n + 2, 'snippet', feet)),
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
    nextlayerid: 4,
    nextobjectid: SNIPPETS.length + 2,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.2',
    tileheight: TILE_SIZE,
    tilesets: [{ firstgid: 1, source: '../tiles/placeholder.tsj' }],
    tilewidth: TILE_SIZE,
    type: 'map',
    version: '1.10',
    width: CAMPUS_WIDTH,
  };
}
