import { type Box, TILE_SIZE } from '../src/engine/tiled.ts';
import type { PaletteColour } from '../src/render/palette.ts';

/**
 * The placeholder tileset (visual.md §5, feature 0010): thirteen 16x16 office tiles in one row,
 * drawn from code in Endesga 32. Pure — it returns pixels and the .tsj object; tools/gen-tiles.ts
 * writes the files. A wall is a strip 4 px thick on the top or the left edge of a cell, drawn
 * over the cell's floor; its pixels are exactly its collision boxes. Pixel (0, 0) of the two
 * floor tiles is their base colour.
 */

export { TILE_SIZE };

export interface TileKind {
  readonly id: number;
  readonly name: string;
  /** The whole tile is solid: the `solid` property in the .tsj. */
  readonly solid: boolean;
  /** Collision rectangles in tile-local pixels, for a tile that is solid in part. */
  readonly boxes: readonly Box[];
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

/** 13 × 16. */
export const SHEET_WIDTH = 208;
export const SHEET_HEIGHT = 16;

const TOP: Box = { x: 0, y: 0, width: TILE_SIZE, height: 4 };
const LEFT: Box = { x: 0, y: 0, width: 4, height: TILE_SIZE };
const POST: Box = { x: 0, y: 0, width: 4, height: 4 };

export const TILE_KINDS: readonly TileKind[] = [
  { id: CARPET, name: 'carpet', solid: false, boxes: [] },
  { id: CORRIDOR, name: 'corridor', solid: false, boxes: [] },
  { id: OUTER_WALL, name: 'outer-wall', solid: true, boxes: [] },
  { id: WINDOW, name: 'window', solid: true, boxes: [] },
  { id: WALL_TOP, name: 'wall-top-carpet', solid: false, boxes: [TOP] },
  { id: WALL_LEFT, name: 'wall-left-carpet', solid: false, boxes: [LEFT] },
  { id: WALL_CORNER, name: 'wall-corner-carpet', solid: false, boxes: [TOP, LEFT] },
  { id: WALL_POST, name: 'wall-post-carpet', solid: false, boxes: [POST] },
  { id: WALL_TOP + CORRIDOR_WALLS, name: 'wall-top-corridor', solid: false, boxes: [TOP] },
  { id: WALL_LEFT + CORRIDOR_WALLS, name: 'wall-left-corridor', solid: false, boxes: [LEFT] },
  {
    id: WALL_CORNER + CORRIDOR_WALLS,
    name: 'wall-corner-corridor',
    solid: false,
    boxes: [TOP, LEFT],
  },
  { id: WALL_POST + CORRIDOR_WALLS, name: 'wall-post-corridor', solid: false, boxes: [POST] },
  { id: DOOR_CLOSED, name: 'door-closed', solid: false, boxes: [TOP] },
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

/** The picture of a tile, by id. */
function painter(kind: TileKind): (x: number, y: number) => PaletteColour {
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

/** RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes; every pixel opaque. */
export function renderTiles(): Uint8Array {
  const data = new Uint8Array(SHEET_WIDTH * SHEET_HEIGHT * 4);
  for (const kind of TILE_KINDS) {
    const paint = painter(kind);
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const offset = (y * SHEET_WIDTH + kind.id * TILE_SIZE + x) * 4;
        data.set([...rgb(paint(x, y)), 255], offset);
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

/** A tile entry: a solid property, or a collision group. */
export interface TileEntry {
  readonly id: number;
  readonly objectgroup?: CollisionGroup;
  readonly properties?: readonly SolidProperty[];
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
  for (const kind of TILE_KINDS) {
    if (kind.solid) {
      tiles.push({ id: kind.id, properties: [{ name: 'solid', type: 'bool', value: true }] });
    } else if (kind.boxes.length > 0) {
      tiles.push({ id: kind.id, objectgroup: collisionGroup(kind.boxes) });
    }
  }
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
    tiles,
    tilewidth: TILE_SIZE,
    type: 'tileset',
    version: '1.10',
  };
}
