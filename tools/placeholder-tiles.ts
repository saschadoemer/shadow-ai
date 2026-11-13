import { type Box, TILE_SIZE } from '../src/engine/tiled.ts';
import type { PaletteColour } from '../src/render/palette.ts';

/**
 * The placeholder tileset (visual.md §5, features 0010 and 0011): thirty 16x16 office tiles in
 * fifteen columns and two rows, drawn from code in Endesga 32; the tile with id n sits at column
 * n mod 15, row ⌊n / 15⌋. Pure — it returns pixels and the .tsj object; tools/gen-tiles.ts
 * writes the files. A wall is a strip 4 px thick on the top or the left edge of a cell, drawn
 * over the cell's floor; its pixels are exactly its collision boxes. Pixel (0, 0) of the two
 * floor tiles is their base colour. The furniture of 0011 (ids 13–29) is transparent where
 * nothing is drawn, so it stands on whatever floor lies below it on `ground`.
 */

export { TILE_SIZE };

export interface TileKind {
  readonly id: number;
  readonly name: string;
  /** The whole tile is solid: the `solid` property in the .tsj. */
  readonly solid: boolean;
  /** Collision rectangles in tile-local pixels, for a tile that is solid in part. */
  readonly boxes: readonly Box[];
  /** Stops feet but not light: the `low` property in the .tsj (feature 0011). */
  readonly low: boolean;
}

export const CARPET = 0;
export const CORRIDOR = 1;
export const OUTER_WALL = 2;
export const WINDOW = 3;
/** The wall tiles on carpet. */
export const WALL_TOP = 4;
export const WALL_LEFT = 5;
export const WALL_CORNER = 6;
export const WALL_POST = 7;
/** The id of a wall tile on corridor is the id of the same wall on carpet plus this. */
export const CORRIDOR_WALLS = 4;
export const DOOR_CLOSED = 12;
/** The furniture (0011). */
export const PARTITION_TOP = 13;
export const PARTITION_LEFT = 14;
export const PARTITION_CORNER = 15;
export const DESK = 16;
export const DESK_MONITOR = 17;
export const DESK_PARTITION = 18;
export const DESK_MONITOR_PARTITION = 19;
export const CHAIR = 20;
export const CABINET = 21;
export const CABINET_TOP = 22;
export const PLANT = 23;
export const PLANT_TOP = 24;
export const TABLE = 25;
export const COUNTER = 26;
export const PRINTER = 27;
export const SCREEN = 28;
export const SCREEN_SIDE = 29;

/** Fifteen columns, two rows: 15 × 16 by 2 × 16. */
export const SHEET_COLUMNS = 15;
export const SHEET_WIDTH = 240;
export const SHEET_HEIGHT = 32;

const TOP: Box = { x: 0, y: 0, width: TILE_SIZE, height: 4 };
const LEFT: Box = { x: 0, y: 0, width: 4, height: TILE_SIZE };
const POST: Box = { x: 0, y: 0, width: 4, height: 4 };
/** A partition: a strip 2 px thick (0011). */
const PARTITION_TOP_BOX: Box = { x: 0, y: 0, width: TILE_SIZE, height: 2 };
const PARTITION_LEFT_BOX: Box = { x: 0, y: 0, width: 2, height: TILE_SIZE };

export const TILE_KINDS: readonly TileKind[] = [
  { id: CARPET, name: 'carpet', solid: false, boxes: [], low: false },
  { id: CORRIDOR, name: 'corridor', solid: false, boxes: [], low: false },
  { id: OUTER_WALL, name: 'outer-wall', solid: true, boxes: [], low: false },
  { id: WINDOW, name: 'window', solid: true, boxes: [], low: false },
  { id: WALL_TOP, name: 'wall-top-carpet', solid: false, boxes: [TOP], low: false },
  { id: WALL_LEFT, name: 'wall-left-carpet', solid: false, boxes: [LEFT], low: false },
  { id: WALL_CORNER, name: 'wall-corner-carpet', solid: false, boxes: [TOP, LEFT], low: false },
  { id: WALL_POST, name: 'wall-post-carpet', solid: false, boxes: [POST], low: false },
  {
    id: WALL_TOP + CORRIDOR_WALLS,
    name: 'wall-top-corridor',
    solid: false,
    boxes: [TOP],
    low: false,
  },
  {
    id: WALL_LEFT + CORRIDOR_WALLS,
    name: 'wall-left-corridor',
    solid: false,
    boxes: [LEFT],
    low: false,
  },
  {
    id: WALL_CORNER + CORRIDOR_WALLS,
    name: 'wall-corner-corridor',
    solid: false,
    boxes: [TOP, LEFT],
    low: false,
  },
  {
    id: WALL_POST + CORRIDOR_WALLS,
    name: 'wall-post-corridor',
    solid: false,
    boxes: [POST],
    low: false,
  },
  { id: DOOR_CLOSED, name: 'door-closed', solid: false, boxes: [TOP], low: false },
  { id: PARTITION_TOP, name: 'partition-top', solid: false, boxes: [PARTITION_TOP_BOX], low: true },
  {
    id: PARTITION_LEFT,
    name: 'partition-left',
    solid: false,
    boxes: [PARTITION_LEFT_BOX],
    low: true,
  },
  {
    id: PARTITION_CORNER,
    name: 'partition-corner',
    solid: false,
    boxes: [PARTITION_TOP_BOX, PARTITION_LEFT_BOX],
    low: true,
  },
  { id: DESK, name: 'desk', solid: true, boxes: [], low: true },
  { id: DESK_MONITOR, name: 'desk-monitor', solid: true, boxes: [], low: true },
  { id: DESK_PARTITION, name: 'desk-partition', solid: true, boxes: [], low: true },
  { id: DESK_MONITOR_PARTITION, name: 'desk-monitor-partition', solid: true, boxes: [], low: true },
  {
    id: CHAIR,
    name: 'chair',
    solid: false,
    boxes: [{ x: 3, y: 3, width: 10, height: 10 }],
    low: true,
  },
  { id: CABINET, name: 'cabinet', solid: true, boxes: [], low: false },
  { id: CABINET_TOP, name: 'cabinet-top', solid: false, boxes: [], low: false },
  {
    id: PLANT,
    name: 'plant',
    solid: false,
    boxes: [{ x: 4, y: 6, width: 8, height: 10 }],
    low: true,
  },
  { id: PLANT_TOP, name: 'plant-top', solid: false, boxes: [], low: false },
  { id: TABLE, name: 'table', solid: true, boxes: [], low: true },
  { id: COUNTER, name: 'counter', solid: true, boxes: [], low: true },
  { id: PRINTER, name: 'printer', solid: true, boxes: [], low: true },
  {
    id: SCREEN,
    name: 'screen',
    solid: false,
    boxes: [{ x: 0, y: 6, width: TILE_SIZE, height: 4 }],
    low: true,
  },
  {
    id: SCREEN_SIDE,
    name: 'screen-side',
    solid: false,
    boxes: [{ x: 6, y: 0, width: 4, height: TILE_SIZE }],
    low: true,
  },
];

const WALL_DARK: PaletteColour = '#262b44';
const WALL_LIGHT: PaletteColour = '#3a4466';
const DOOR: PaletteColour = '#733e39';
const DOOR_LINE: PaletteColour = '#3e2731';

function within(value: number, from: number, to: number): boolean {
  return value >= from && value <= to;
}

function scatter(
  base: PaletteColour,
  second: PaletteColour,
  points: readonly (readonly [number, number])[],
): (x: number, y: number) => PaletteColour {
  return (x, y) => (points.some(([px, py]) => px === x && py === y) ? second : base);
}

const carpet = scatter('#8b9bb4', '#5a6988', [
  [2, 3],
  [9, 1],
  [13, 6],
  [5, 10],
  [11, 12],
  [1, 14],
]);

const corridor = scatter('#ead4aa', '#e4a672', [
  [3, 2],
  [10, 4],
  [6, 8],
  [13, 11],
  [1, 13],
  [8, 14],
]);

/** Brick joints: four mortar rows, the vertical joints offset from course to course. */
function outerWall(x: number, y: number): PaletteColour {
  const row = y === 3 || y === 7 || y === 11 || y === 15;
  const upper = x === 7 && (within(y, 0, 2) || within(y, 8, 10));
  const lower = (x === 3 || x === 11) && (within(y, 4, 6) || within(y, 12, 14));
  return row || upper || lower ? WALL_DARK : WALL_LIGHT;
}

/** A frame 2 px wide round the glass. */
function window(x: number, y: number): PaletteColour {
  const frame = [0, 1, 14, 15];
  return frame.includes(x) || frame.includes(y) ? WALL_LIGHT : '#2ce8f5';
}

function inBox(box: Box, x: number, y: number): boolean {
  return x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height;
}

/**
 * A wall tile: the floor, unless the pixel lies in a strip. A strip is dark with its inner line
 * — the row y = 3 of a top strip, the column x = 3 of a left strip — lighter; where two strips
 * meet, and in a post, the square is dark.
 */
function wall(
  floor: (x: number, y: number) => PaletteColour,
  boxes: readonly Box[],
): (x: number, y: number) => PaletteColour {
  return (x, y) => {
    const hits = boxes.filter((box) => inBox(box, x, y));
    if (hits.length === 0) {
      return floor(x, y);
    }
    const [hit] = hits;
    if (hit === undefined || hits.length > 1) {
      return WALL_DARK;
    }
    if (hit.width === TILE_SIZE) {
      return y === 3 ? WALL_LIGHT : WALL_DARK;
    }
    if (hit.height === TILE_SIZE) {
      return x === 3 ? WALL_LIGHT : WALL_DARK;
    }
    return WALL_DARK;
  };
}

/** The closed door: corridor, the top strip in door colours, its row y = 3 darker. */
function doorClosed(x: number, y: number): PaletteColour {
  if (!inBox(TOP, x, y)) {
    return corridor(x, y);
  }
  return y === 3 ? DOOR_LINE : DOOR;
}

/** A pixel's colour, or null where the tile is transparent (0011). */
type Painter = (x: number, y: number) => PaletteColour | null;

/** A partition strip: the light outer line, the darker inner one (0011). */
function partitionTop(_x: number, y: number): PaletteColour | null {
  if (y === 0) {
    return '#c0cbdc';
  }
  return y === 1 ? '#5a6988' : null;
}

function partitionLeft(x: number, _y: number): PaletteColour | null {
  if (x === 0) {
    return '#c0cbdc';
  }
  return x === 1 ? '#5a6988' : null;
}

function partitionCorner(x: number, y: number): PaletteColour | null {
  return y <= 1 ? partitionTop(x, y) : partitionLeft(x, y);
}

/** A whole-tile surface: its top, and a 3 px front edge at the bottom. */
function surface(top: PaletteColour, edge: PaletteColour): Painter {
  return (_x, y) => (y <= 12 ? top : edge);
}

const desk = surface('#e4a672', '#b86f50');

function deskMonitor(x: number, y: number): PaletteColour | null {
  if (within(x, 5, 10) && within(y, 3, 6)) {
    return '#2ce8f5';
  }
  if ((within(x, 4, 11) && within(y, 2, 8)) || (within(x, 7, 8) && within(y, 9, 10))) {
    return '#262b44';
  }
  return desk(x, y);
}

/** A desk with the partition's top strip drawn over its first two rows. */
function withPartition(under: Painter): Painter {
  return (x, y) => (y <= 1 ? partitionTop(x, y) : under(x, y));
}

function chair(x: number, y: number): PaletteColour | null {
  if (!within(x, 3, 12)) {
    return null;
  }
  if (within(y, 3, 5)) {
    return '#3a4466';
  }
  return within(y, 6, 12) ? '#5a6988' : null;
}

function cabinet(x: number, y: number): PaletteColour {
  const line = x === 0 || x === 15 || y === 0 || y === 15 || within(x, 7, 8);
  return line ? '#733e39' : '#c28569';
}

function cabinetTop(x: number, y: number): PaletteColour | null {
  if (y < 8) {
    return null;
  }
  return y === 8 || x === 0 || x === 15 ? '#c28569' : '#e8b796';
}

function plant(x: number, y: number): PaletteColour | null {
  if (within(x, 4, 11) && within(y, 10, 15)) {
    return '#be4a2f';
  }
  return within(x, 7, 8) && within(y, 0, 9) ? '#265c42' : null;
}

function plantTop(x: number, y: number): PaletteColour | null {
  const inside = within(x, 2, 13) && within(y, 4, 15);
  const corner = (x < 4 || x > 11) && (y < 6 || y > 13);
  if (!inside || corner) {
    return null;
  }
  return (x + y) % 3 === 0 ? '#63c74d' : '#3e8948';
}

function printer(x: number, y: number): PaletteColour {
  if (within(x, 3, 12) && within(y, 1, 4)) {
    return '#ffffff';
  }
  if (within(x, 3, 12) && within(y, 10, 12)) {
    return '#3a4466';
  }
  return '#c0cbdc';
}

/** A mobile screen across its cell: a panel 4 px thick through the middle, on two feet. */
function screen(x: number, y: number): PaletteColour | null {
  if (within(y, 6, 8)) {
    return '#0099db';
  }
  if (y === 9) {
    return '#124e89';
  }
  return (x <= 1 || x >= 14) && within(y, 10, 11) ? '#3a4466' : null;
}

/** The screen turned: a panel down the middle of its cell, its feet to the right. */
function screenSide(x: number, y: number): PaletteColour | null {
  if (within(x, 6, 8)) {
    return '#0099db';
  }
  if (x === 9) {
    return '#124e89';
  }
  return within(x, 10, 11) && (y <= 1 || y >= 14) ? '#3a4466' : null;
}

/** The picture of a tile, by id. */
function painter(kind: TileKind): Painter {
  switch (kind.id) {
    case CARPET:
      return carpet;
    case CORRIDOR:
      return corridor;
    case OUTER_WALL:
      return outerWall;
    case WINDOW:
      return window;
    case DOOR_CLOSED:
      return doorClosed;
    case PARTITION_TOP:
      return partitionTop;
    case PARTITION_LEFT:
      return partitionLeft;
    case PARTITION_CORNER:
      return partitionCorner;
    case DESK:
      return desk;
    case DESK_MONITOR:
      return deskMonitor;
    case DESK_PARTITION:
      return withPartition(desk);
    case DESK_MONITOR_PARTITION:
      return withPartition(deskMonitor);
    case CHAIR:
      return chair;
    case CABINET:
      return cabinet;
    case CABINET_TOP:
      return cabinetTop;
    case PLANT:
      return plant;
    case PLANT_TOP:
      return plantTop;
    case TABLE:
      return surface('#b86f50', '#733e39');
    case COUNTER:
      return surface('#ffffff', '#c0cbdc');
    case PRINTER:
      return printer;
    case SCREEN:
      return screen;
    case SCREEN_SIDE:
      return screenSide;
    default:
      return wall(kind.id < WALL_TOP + CORRIDOR_WALLS ? carpet : corridor, kind.boxes);
  }
}

export function rgb(colour: PaletteColour): readonly [number, number, number] {
  return [
    Number.parseInt(colour.slice(1, 3), 16),
    Number.parseInt(colour.slice(3, 5), 16),
    Number.parseInt(colour.slice(5, 7), 16),
  ];
}

/**
 * RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes. The sheet starts transparent; a pixel
 * is written, opaque, only where the painter returns a colour.
 */
export function renderTiles(): Uint8Array {
  const data = new Uint8Array(SHEET_WIDTH * SHEET_HEIGHT * 4);
  for (const kind of TILE_KINDS) {
    const paint = painter(kind);
    const column = kind.id % SHEET_COLUMNS;
    const row = Math.floor(kind.id / SHEET_COLUMNS);
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const colour = paint(x, y);
        if (colour !== null) {
          const offset = ((row * TILE_SIZE + y) * SHEET_WIDTH + column * TILE_SIZE + x) * 4;
          data.set([...rgb(colour), 255], offset);
        }
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

interface LowProperty {
  readonly name: 'low';
  readonly type: 'bool';
  readonly value: true;
}

/** A collision rectangle as Tiled 1.11 writes it, keys in Tiled's order. */
interface CollisionObject {
  readonly height: number;
  readonly id: number;
  readonly name: '';
  readonly rotation: 0;
  readonly type: '';
  readonly visible: true;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface CollisionGroup {
  readonly draworder: 'index';
  readonly id: number;
  readonly name: '';
  readonly objects: readonly CollisionObject[];
  readonly opacity: 1;
  readonly type: 'objectgroup';
  readonly visible: true;
  readonly x: 0;
  readonly y: 0;
}

/** A tile entry: a solid property or a collision group, and `low` when the tile is low. */
export interface TileEntry {
  readonly id: number;
  readonly objectgroup?: CollisionGroup;
  readonly properties?: readonly (SolidProperty | LowProperty)[];
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
  readonly tiles: readonly TileEntry[];
  readonly tilewidth: number;
  readonly type: 'tileset';
  readonly version: '1.10';
}

function collisionGroup(boxes: readonly Box[]): CollisionGroup {
  return {
    draworder: 'index',
    id: 2,
    name: '',
    objects: boxes.map((box, n) => ({
      height: box.height,
      id: n + 1,
      name: '',
      rotation: 0,
      type: '',
      visible: true,
      width: box.width,
      x: box.x,
      y: box.y,
    })),
    opacity: 1,
    type: 'objectgroup',
    visible: true,
    x: 0,
    y: 0,
  };
}

/** Keys in Tiled's own order, so that a save in Tiled changes as little as possible. */
export function tilesetJson(): TilesetJson {
  const tiles: TileEntry[] = [];
  const low: readonly LowProperty[] = [{ name: 'low', type: 'bool', value: true }];
  for (const kind of TILE_KINDS) {
    const lowProperties = kind.low ? low : [];
    if (kind.solid) {
      tiles.push({
        id: kind.id,
        properties: [{ name: 'solid', type: 'bool', value: true }, ...lowProperties],
      });
    } else if (kind.boxes.length > 0) {
      tiles.push({
        id: kind.id,
        objectgroup: collisionGroup(kind.boxes),
        ...(kind.low ? { properties: low } : {}),
      });
    }
  }
  return {
    columns: SHEET_COLUMNS,
    image: 'placeholder.png',
    imageheight: SHEET_HEIGHT,
    imagewidth: SHEET_WIDTH,
    margin: 0,
    name: 'placeholder',
    spacing: 0,
    tilecount: TILE_KINDS.length,
    tileheight: TILE_SIZE,
    tiles,
    tilewidth: TILE_SIZE,
    type: 'tileset',
    version: '1.10',
  };
}
