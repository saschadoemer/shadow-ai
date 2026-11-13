import { EMPTY, type Point, TILE_SIZE } from '../src/engine/tiled.ts';
import {
  CABINET,
  CABINET_TOP,
  CARPET,
  CHAIR,
  CORRIDOR,
  CORRIDOR_WALLS,
  COUNTER,
  DESK,
  DESK_MONITOR,
  DESK_MONITOR_PARTITION,
  DESK_PARTITION,
  DOOR_CLOSED,
  OUTER_WALL,
  PARTITION_CORNER,
  PARTITION_LEFT,
  PARTITION_TOP,
  PLANT,
  PLANT_TOP,
  PRINTER,
  SCREEN,
  SCREEN_SIDE,
  TABLE,
  WALL_CORNER,
  WALL_LEFT,
  WALL_POST,
  WALL_TOP,
  WINDOW,
} from './placeholder-tiles.ts';

/**
 * The office floor as data (feature 0010, world.md §1): the corridors and rooms as rectangles of
 * floor, the walls as lines of strips with their openings, the closed doors, the spawn, the
 * creatures' points and the wake point. The tables of the feature spec are the layout; this file
 * mirrors them, one entry per row, columns c0–c1 and rows r0–r1 inclusive. Every wall lives on
 * `ground`: a wall tile is its floor with the strip drawn in. The furniture of feature 0011 is
 * placed in pieces from the room table, one tile per cell on `detail`; the tops of the tall
 * things — cabinets and plants — go on `above`, one row higher. Pure — it returns the layers and
 * the .tmj object; tools/gen-floor.ts writes the file. Retired when the art pass takes the map over
 * by hand in Tiled (visual.md §5).
 */

export const FLOOR_WIDTH = 108;
export const FLOOR_HEIGHT = 80;

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

export const CORRIDORS: readonly Area[] = [
  { name: 'north corridor', cells: cells(1, 106, 20, 25) },
  { name: 'south corridor', cells: cells(1, 106, 52, 57) },
  { name: 'west corridor', cells: cells(23, 28, 26, 51) },
  { name: 'east corridor', cells: cells(73, 78, 26, 51) },
  { name: 'side passage', cells: cells(85, 88, 1, 19) },
];

export const ROOMS: readonly Area[] = [
  { name: 'hr', cells: cells(1, 21, 1, 19) },
  { name: 'accounting', cells: cells(22, 43, 1, 19) },
  { name: 'development', cells: cells(44, 84, 1, 19) },
  { name: 'meeting room north', cells: cells(89, 106, 1, 9) },
  { name: 'meeting room south', cells: cells(89, 106, 10, 19) },
  { name: "data protection officer's office", cells: cells(1, 22, 26, 37) },
  { name: 'reception', cells: cells(1, 22, 38, 51) },
  { name: 'break room', cells: cells(29, 48, 26, 51) },
  { name: 'lift', cells: cells(49, 60, 26, 51) },
  { name: 'stairwell', cells: cells(61, 72, 26, 51) },
  { name: 'sales', cells: cells(79, 106, 26, 51) },
  { name: 'marketing', cells: cells(1, 48, 58, 78) },
  { name: 'support', cells: cells(49, 106, 58, 78) },
];

/** A top strip on the cells (from..to, row), minus the openings (columns). */
export interface HorizontalWall {
  readonly row: number;
  readonly from: number;
  readonly to: number;
  readonly openings: readonly number[];
}

/** A left strip on the cells (column, from..to), minus the openings (rows). */
export interface VerticalWall {
  readonly column: number;
  readonly from: number;
  readonly to: number;
  readonly openings: readonly number[];
}

export const HORIZONTAL_WALLS: readonly HorizontalWall[] = [
  { row: 20, from: 1, to: 106, openings: [10, 11, 12, 31, 32, 33, 63, 64, 65, 85, 86, 87, 88] },
  { row: 26, from: 1, to: 22, openings: [] },
  { row: 26, from: 29, to: 72, openings: [] },
  { row: 26, from: 79, to: 106, openings: [] },
  { row: 52, from: 1, to: 22, openings: [] },
  { row: 52, from: 29, to: 72, openings: [] },
  { row: 52, from: 79, to: 106, openings: [] },
  { row: 58, from: 1, to: 106, openings: [23, 24, 25, 77, 78, 79] },
  { row: 38, from: 1, to: 22, openings: [] },
  { row: 10, from: 89, to: 106, openings: [] },
];

export const VERTICAL_WALLS: readonly VerticalWall[] = [
  { column: 22, from: 1, to: 19, openings: [] },
  { column: 44, from: 1, to: 19, openings: [] },
  { column: 85, from: 1, to: 19, openings: [] },
  { column: 89, from: 1, to: 19, openings: [4, 5, 6, 14, 15, 16] },
  { column: 23, from: 26, to: 51, openings: [30, 31, 32, 42, 43, 44, 45, 46] },
  { column: 29, from: 26, to: 51, openings: [37, 38, 39] },
  { column: 49, from: 26, to: 51, openings: [] },
  { column: 61, from: 26, to: 51, openings: [] },
  { column: 73, from: 26, to: 51, openings: [] },
  { column: 79, from: 26, to: 51, openings: [37, 38, 39] },
  { column: 49, from: 58, to: 78, openings: [] },
];

/** Closed doors, in the wall of row 52: the lift, the stairwell. They replace the wall tile. */
export const CLOSED_DOORS: readonly Point[] = [
  { x: 54, y: 52 },
  { x: 55, y: 52 },
  { x: 66, y: 52 },
  { x: 67, y: 52 },
];

/** The posts the rule must yield; the layout derives them, the test compares. */
export const POSTS: readonly Point[] = [
  { x: 85, y: 20 },
  { x: 23, y: 52 },
  { x: 73, y: 52 },
];

/** Feet in pixels: tile (16, 44), in the reception, level with its opening. */
export const SPAWN: Point = { x: 256, y: 718 };

/** Feet in pixels: tiles (76, 38), (88, 32), (98, 44) — before the Sales doorway, and two in Sales. */
export const SNIPPETS: readonly Point[] = [
  { x: 1224, y: 622 },
  { x: 1416, y: 526 },
  { x: 1576, y: 718 },
];

/** Where the figure wakes (0009), feet in pixels: the middle of tile (18, 31), in the data protection officer's office. */
export const WAKE: Point = { x: 296, y: 504 };

function index(column: number, row: number): number {
  return row * FLOOR_WIDTH + column;
}

function fill(layer: number[], rect: CellRect, id: number): void {
  for (let row = rect.r0; row <= rect.r1; row += 1) {
    for (let column = rect.c0; column <= rect.c1; column += 1) {
      layer[index(column, row)] = id;
    }
  }
}

/** Whether the outer ring has a window at this cell: two in every four, from column or row 2. */
function isWindow(column: number, row: number): boolean {
  const alongRow =
    (row === 0 || row === FLOOR_HEIGHT - 1) && column >= 2 && column <= FLOOR_WIDTH - 3;
  const alongColumn =
    (column === 0 || column === FLOOR_WIDTH - 1) && row >= 2 && row <= FLOOR_HEIGHT - 3;
  return (alongRow && column % 4 >= 2) || (alongColumn && row % 4 >= 2);
}

/**
 * The one tile layer as tileset ids, row-major: carpet everywhere; the corridors' floor; then
 * per interior cell its wall tile on its own floor — both strips a corner, one a top or a left
 * strip, neither but a top strip on the left and a left strip above a post; the closed doors
 * over their wall tiles; last the outer ring of wall and windows.
 */
export function buildGround(): number[] {
  const ground = new Array<number>(FLOOR_WIDTH * FLOOR_HEIGHT).fill(CARPET);
  for (const corridor of CORRIDORS) {
    fill(ground, corridor.cells, CORRIDOR);
  }
  const top = new Array<boolean>(FLOOR_WIDTH * FLOOR_HEIGHT).fill(false);
  const left = new Array<boolean>(FLOOR_WIDTH * FLOOR_HEIGHT).fill(false);
  for (const wall of HORIZONTAL_WALLS) {
    for (let column = wall.from; column <= wall.to; column += 1) {
      if (!wall.openings.includes(column)) {
        top[index(column, wall.row)] = true;
      }
    }
  }
  for (const wall of VERTICAL_WALLS) {
    for (let row = wall.from; row <= wall.to; row += 1) {
      if (!wall.openings.includes(row)) {
        left[index(wall.column, row)] = true;
      }
    }
  }
  for (let row = 1; row < FLOOR_HEIGHT - 1; row += 1) {
    for (let column = 1; column < FLOOR_WIDTH - 1; column += 1) {
      const at = index(column, row);
      const shift = ground[at] === CORRIDOR ? CORRIDOR_WALLS : 0;
      if (top[at] && left[at]) {
        ground[at] = WALL_CORNER + shift;
      } else if (top[at]) {
        ground[at] = WALL_TOP + shift;
      } else if (left[at]) {
        ground[at] = WALL_LEFT + shift;
      } else if (top[index(column - 1, row)] && left[index(column, row - 1)]) {
        ground[at] = WALL_POST + shift;
      }
    }
  }
  for (const door of CLOSED_DOORS) {
    const at = index(door.x, door.y);
    if (ground[at] !== WALL_TOP + CORRIDOR_WALLS) {
      throw new Error(`closed door (${door.x}, ${door.y}) is not on a top wall on corridor`);
    }
    ground[at] = DOOR_CLOSED;
  }
  for (let row = 0; row < FLOOR_HEIGHT; row += 1) {
    for (let column = 0; column < FLOOR_WIDTH; column += 1) {
      const onRing =
        row === 0 || row === FLOOR_HEIGHT - 1 || column === 0 || column === FLOOR_WIDTH - 1;
      if (onRing) {
        ground[index(column, row)] = isWindow(column, row) ? WINDOW : OUTER_WALL;
      }
    }
  }
  return ground;
}

/** One row of the spec's room table: a piece at its top-left cell (0011). */
export type Placement =
  | {
      readonly piece:
        | 'workplace'
        | 'cubicle'
        | 'island'
        | 'cafe-table'
        | 'chair'
        | 'printer'
        | 'plant';
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly piece: 'bank' | 'screens-across' | 'screens-down';
      readonly x: number;
      readonly y: number;
      readonly n: number;
    }
  | { readonly piece: 'table' | 'counter'; readonly cells: CellRect }
  | { readonly piece: 'cabinets'; readonly c0: number; readonly c1: number; readonly row: number };

const at = (
  piece: 'workplace' | 'cubicle' | 'island' | 'cafe-table' | 'chair' | 'printer' | 'plant',
  x: number,
  y: number,
): Placement => ({ piece, x, y });
const run = (
  piece: 'bank' | 'screens-across' | 'screens-down',
  x: number,
  y: number,
  n: number,
): Placement => ({ piece, x, y, n });
const block = (
  piece: 'table' | 'counter',
  c0: number,
  c1: number,
  r0: number,
  r1: number,
): Placement => ({ piece, cells: cells(c0, c1, r0, r1) });
const cabinets = (c0: number, c1: number, row: number): Placement => ({
  piece: 'cabinets',
  c0,
  c1,
  row,
});

/** The spec's room table, one entry per area; `area` is a name in ROOMS or CORRIDORS. */
export const FURNITURE: readonly {
  readonly area: string;
  readonly placements: readonly Placement[];
}[] = [
  {
    area: 'sales',
    placements: [
      run('bank', 82, 28, 4),
      run('bank', 82, 34, 4),
      run('bank', 82, 40, 4),
      run('bank', 82, 46, 4),
      cabinets(104, 106, 51),
      at('plant', 80, 50),
    ],
  },
  {
    area: 'support',
    placements: [
      run('bank', 51, 61, 5),
      run('bank', 82, 61, 4),
      run('bank', 51, 67, 5),
      run('bank', 82, 67, 4),
      run('bank', 51, 73, 5),
      run('bank', 82, 73, 4),
      cabinets(105, 106, 78),
      at('printer', 76, 78),
    ],
  },
  {
    area: 'development',
    placements: [
      run('bank', 46, 3, 3),
      run('bank', 67, 3, 3),
      run('bank', 46, 9, 3),
      run('bank', 67, 9, 3),
      run('bank', 46, 15, 3),
      run('bank', 67, 15, 3),
      cabinets(83, 84, 19),
      at('plant', 44, 19),
    ],
  },
  {
    area: 'hr',
    placements: [
      at('workplace', 3, 3),
      at('workplace', 14, 3),
      at('workplace', 3, 10),
      run('screens-down', 9, 3, 2),
      block('table', 13, 14, 10, 11),
      at('chair', 12, 10),
      at('chair', 15, 11),
      cabinets(16, 19, 19),
      at('plant', 1, 18),
    ],
  },
  {
    area: 'accounting',
    placements: [
      at('workplace', 25, 3),
      at('workplace', 36, 3),
      at('workplace', 25, 10),
      at('workplace', 36, 10),
      run('screens-across', 25, 7, 3),
      run('screens-across', 36, 7, 3),
      cabinets(22, 25, 19),
      cabinets(39, 43, 19),
      at('printer', 43, 7),
    ],
  },
  {
    area: "data protection officer's office",
    placements: [
      at('workplace', 4, 28),
      run('screens-down', 9, 30, 4),
      block('table', 12, 14, 31, 32),
      at('chair', 11, 31),
      at('chair', 15, 32),
      cabinets(2, 7, 37),
      at('plant', 21, 36),
    ],
  },
  {
    area: 'reception',
    placements: [
      block('counter', 8, 12, 41, 41),
      at('chair', 10, 40),
      at('plant', 2, 41),
      at('plant', 21, 40),
      at('plant', 21, 50),
    ],
  },
  {
    area: 'break room',
    placements: [
      block('counter', 32, 45, 26, 26),
      at('cafe-table', 33, 32),
      at('cafe-table', 41, 32),
      at('cafe-table', 33, 42),
      at('cafe-table', 41, 42),
      at('plant', 47, 50),
    ],
  },
  {
    area: 'marketing',
    placements: [
      at('island', 5, 62),
      at('island', 14, 62),
      at('island', 32, 62),
      at('island', 41, 62),
      at('island', 5, 70),
      at('island', 14, 70),
      at('island', 32, 70),
      at('island', 41, 70),
      run('screens-down', 10, 62, 2),
      run('screens-down', 37, 62, 2),
      run('screens-down', 10, 70, 2),
      run('screens-down', 37, 70, 2),
      cabinets(2, 9, 78),
      at('plant', 47, 78),
      at('printer', 27, 78),
    ],
  },
  {
    area: 'meeting room north',
    placements: [
      block('table', 94, 101, 4, 5),
      at('chair', 95, 3),
      at('chair', 98, 3),
      at('chair', 95, 6),
      at('chair', 98, 6),
    ],
  },
  {
    area: 'meeting room south',
    placements: [
      block('table', 94, 101, 14, 15),
      at('chair', 95, 13),
      at('chair', 98, 13),
      at('chair', 95, 16),
      at('chair', 98, 16),
      at('plant', 105, 19),
    ],
  },
  {
    area: 'north corridor',
    placements: [at('printer', 52, 20), at('plant', 34, 25), at('plant', 70, 25)],
  },
  {
    area: 'south corridor',
    placements: [at('printer', 40, 57), at('plant', 10, 57), at('plant', 90, 57)],
  },
];

type Put = (layer: 'detail' | 'above', column: number, row: number, id: number) => void;

/** One cubicle (x, y): five cells wide, three high, open to the south. */
function cubicle(put: Put, x: number, y: number): void {
  put('detail', x, y, PARTITION_CORNER);
  put('detail', x + 1, y, DESK_MONITOR_PARTITION);
  put('detail', x + 2, y, DESK_PARTITION);
  put('detail', x + 3, y, PARTITION_TOP);
  put('detail', x + 4, y, PARTITION_TOP);
  put('detail', x, y + 1, PARTITION_LEFT);
  put('detail', x, y + 2, PARTITION_LEFT);
  put('detail', x + 1, y + 1, CHAIR);
}

/** A tall thing: its body on `detail` at (x, y), its top on `above` one row higher. */
function tall(put: Put, x: number, y: number, body: number, top: number): void {
  put('detail', x, y, body);
  put('above', x, y - 1, top);
}

/** Every cell of a piece, as the spec's "The pieces" defines it. */
function place(put: Put, placement: Placement): void {
  switch (placement.piece) {
    case 'workplace':
      put('detail', placement.x, placement.y, DESK_MONITOR);
      put('detail', placement.x + 1, placement.y, DESK);
      put('detail', placement.x, placement.y + 1, CHAIR);
      return;
    case 'cubicle':
      cubicle(put, placement.x, placement.y);
      return;
    case 'bank':
      for (let k = 0; k < placement.n; k += 1) {
        cubicle(put, placement.x + 5 * k, placement.y);
      }
      for (let row = 0; row < 3; row += 1) {
        put('detail', placement.x + 5 * placement.n, placement.y + row, PARTITION_LEFT);
      }
      return;
    case 'island': {
      const { x, y } = placement;
      put('detail', x, y, DESK_MONITOR);
      put('detail', x + 1, y, DESK_MONITOR);
      put('detail', x, y + 1, DESK);
      put('detail', x + 1, y + 1, DESK);
      for (const [column, row] of [
        [x - 1, y],
        [x + 2, y],
        [x - 1, y + 1],
        [x + 2, y + 1],
      ] as const) {
        put('detail', column, row, CHAIR);
      }
      return;
    }
    case 'cafe-table': {
      const { x, y } = placement;
      for (const column of [x, x + 1]) {
        for (const row of [y, y + 1]) {
          put('detail', column, row, TABLE);
        }
      }
      put('detail', x - 1, y, CHAIR);
      put('detail', x + 2, y + 1, CHAIR);
      return;
    }
    case 'screens-across':
      for (let k = 0; k < placement.n; k += 1) {
        put('detail', placement.x + k, placement.y, SCREEN);
      }
      return;
    case 'screens-down':
      for (let k = 0; k < placement.n; k += 1) {
        put('detail', placement.x, placement.y + k, SCREEN_SIDE);
      }
      return;
    case 'table':
    case 'counter': {
      const { c0, c1, r0, r1 } = placement.cells;
      for (let row = r0; row <= r1; row += 1) {
        for (let column = c0; column <= c1; column += 1) {
          put('detail', column, row, placement.piece === 'table' ? TABLE : COUNTER);
        }
      }
      return;
    }
    case 'chair':
      put('detail', placement.x, placement.y, CHAIR);
      return;
    case 'printer':
      put('detail', placement.x, placement.y, PRINTER);
      return;
    case 'plant':
      tall(put, placement.x, placement.y, PLANT, PLANT_TOP);
      return;
    case 'cabinets':
      for (let column = placement.c0; column <= placement.c1; column += 1) {
        tall(put, column, placement.row, CABINET, CABINET_TOP);
      }
      return;
  }
}

/** The `detail` and `above` layers as tileset ids, row-major, EMPTY where nothing stands. */
export function buildFurniture(): { readonly detail: number[]; readonly above: number[] } {
  const layers = {
    detail: new Array<number>(FLOOR_WIDTH * FLOOR_HEIGHT).fill(EMPTY),
    above: new Array<number>(FLOOR_WIDTH * FLOOR_HEIGHT).fill(EMPTY),
  };
  const put: Put = (layer, column, row, id) => {
    const at = index(column, row);
    if (layers[layer][at] !== EMPTY) {
      throw new Error(`furniture overlaps at (${column}, ${row})`);
    }
    layers[layer][at] = id;
  };
  for (const { placements } of FURNITURE) {
    for (const placement of placements) {
      place(put, placement);
    }
  }
  return layers;
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
  readonly layers: readonly [TileLayerJson, TileLayerJson, TileLayerJson, ObjectLayerJson];
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
    height: FLOOR_HEIGHT,
    id,
    name,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: FLOOR_WIDTH,
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

export function floorJson(): MapJson {
  const { detail, above } = buildFurniture();
  return {
    compressionlevel: -1,
    height: FLOOR_HEIGHT,
    infinite: false,
    layers: [
      tileLayer(1, 'ground', buildGround()),
      tileLayer(3, 'detail', detail),
      tileLayer(4, 'above', above),
      {
        draworder: 'topdown',
        id: 2,
        name: 'objects',
        objects: [
          pointObject(1, 'spawn', SPAWN),
          ...SNIPPETS.map((feet, n) => pointObject(n + 2, 'snippet', feet)),
          pointObject(SNIPPETS.length + 2, 'wake', WAKE),
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
    nextlayerid: 5,
    nextobjectid: SNIPPETS.length + 3,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.2',
    tileheight: TILE_SIZE,
    tilesets: [{ firstgid: 1, source: '../tiles/placeholder.tsj' }],
    tilewidth: TILE_SIZE,
    type: 'map',
    version: '1.10',
    width: FLOOR_WIDTH,
  };
}
