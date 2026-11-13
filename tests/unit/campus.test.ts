import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/engine/camera';
import {
  EMPTY,
  type Point,
  parseTileMap,
  parseTileset,
  type TileMap,
} from '../../src/engine/tiled';
import { BUILDINGS, DOOR, GRASS, PATH, SNIPPETS, SPAWN, WAKE } from '../../tools/campus-layout.ts';
import { encodeCampus } from '../../tools/gen-campus.ts';

/**
 * The campus the game loads, read from public/ on purpose (testing.md §6 forbids generated
 * fixtures, not tests of the shipped content): the committed file equals the generator, and the
 * layout obeys the spec — closed buildings, reachable doors, a solid ring, a free spawn.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MAP_FILE = 'public/maps/campus.tmj';
const TILESET_FILE = 'public/tiles/placeholder.tsj';

function read(file: string): string {
  return readFileSync(join(ROOT, file), 'utf8');
}

const tileset = parseTileset(JSON.parse(read(TILESET_FILE)), TILESET_FILE);
const campus = parseTileMap(JSON.parse(read(MAP_FILE)), tileset, MAP_FILE);
const cell = (column: number, row: number): number => row * campus.width + column;

/** The four neighbours of a cell: right, left, down, up. */
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Which cells a figure reaches from `from` over open cells, four-connected; index → reached. */
function reachableFrom(map: TileMap, from: Point): boolean[] {
  const reached = new Array<boolean>(map.width * map.height).fill(false);
  const queue: number[] = [from.y * map.width + from.x];
  reached[from.y * map.width + from.x] = true;
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const column = next % map.width;
    const row = Math.floor(next / map.width);
    for (const [dc, dr] of DIRECTIONS) {
      const c = column + dc;
      const r = row + dr;
      if (c < 0 || r < 0 || c >= map.width || r >= map.height) {
        continue;
      }
      const at = r * map.width + c;
      if (!reached[at] && map.solid[at] !== true) {
        reached[at] = true;
        queue.push(at);
      }
    }
  }
  return reached;
}

/** The spawn's cell, (64, 45), and the cell in front of a door: the one below it. */
const SPAWN_CELL: Point = { x: 64, y: 45 };
const front = (door: Point): Point => ({ x: door.x, y: door.y + 1 });

describe('public/maps/campus.tmj (acceptance criterion 9)', () => {
  it('is generated deterministically and equals the committed file', () => {
    expect(encodeCampus()).toBe(encodeCampus());
    expect(read(MAP_FILE)).toBe(encodeCampus());
  });

  it('is 128x96 tiles with the spawn at (1024, 734)', () => {
    expect([campus.width, campus.height]).toStrictEqual([128, 96]);
    expect(campus.spawn).toStrictEqual(SPAWN);
    expect(SPAWN).toStrictEqual({ x: 1024, y: 734 });
  });

  it("every building's footprint is solid and its doors are door tiles with an open cell in front", () => {
    for (const { name, footprint, doors } of BUILDINGS) {
      for (let row = footprint.r0; row <= footprint.r1; row += 1) {
        for (let column = footprint.c0; column <= footprint.c1; column += 1) {
          expect(campus.solid[cell(column, row)], `${name} (${column}, ${row})`).toBe(true);
        }
      }
      expect(doors.length, name).toBeGreaterThan(0);
      for (const door of doors) {
        expect(campus.detail[cell(door.x, door.y)], `${name} door`).toBe(DOOR);
        expect(campus.solid[cell(front(door).x, front(door).y)], `${name} door front`).toBe(false);
      }
    }
  });

  it("every door's front cell and the parking lot are reachable from the spawn", () => {
    const reached = reachableFrom(campus, SPAWN_CELL);
    for (const { name, doors } of BUILDINGS) {
      for (const door of doors) {
        expect(reached[cell(front(door).x, front(door).y)], `${name} door front`).toBe(true);
      }
    }
    expect(reached[cell(14, 78)], 'the parking lot').toBe(true);
  });

  it('the meeting rooms are found, not on the way: their front is reached only through the gap (95, 34)', () => {
    expect(reachableFrom(campus, SPAWN_CELL)[cell(95, 32)]).toBe(true);
    const closed = campus.solid.map((solid, at) => solid || at === cell(95, 34));
    expect(reachableFrom({ ...campus, solid: closed }, SPAWN_CELL)[cell(95, 32)]).toBe(false);
  });

  it('the outer ring is solid', () => {
    for (let column = 0; column < campus.width; column += 1) {
      expect(campus.solid[cell(column, 0)], `(${column}, 0)`).toBe(true);
      expect(campus.solid[cell(column, 95)], `(${column}, 95)`).toBe(true);
    }
    for (let row = 0; row < campus.height; row += 1) {
      expect(campus.solid[cell(0, row)], `(0, ${row})`).toBe(true);
      expect(campus.solid[cell(127, row)], `(127, ${row})`).toBe(true);
    }
  });

  it("the spawn's box is free and row 45 is path from column 64 to 71", () => {
    // The box [1018, 1030) × [726, 734) covers cells (63, 45) and (64, 45).
    expect(campus.solid[cell(63, 45)]).toBe(false);
    expect(campus.solid[cell(64, 45)]).toBe(false);
    for (let column = 64; column <= 71; column += 1) {
      expect(campus.ground[cell(column, 45)], `(${column}, 45)`).toBe(PATH);
    }
  });

  it("the view's top-left cell at the spawn is grass with nothing on detail, on a tile corner", () => {
    // The box's centre is (1024, 730); the smoke test reads the surface's pixel (0, 0).
    const camera = cameraFor({ x: 1024, y: 730 }, { width: 2048, height: 1536 });
    expect(camera).toStrictEqual({ x: 864, y: 640 });
    expect([camera.x % 16, camera.y % 16]).toStrictEqual([0, 0]);
    expect(campus.ground[cell(54, 40)]).toBe(GRASS);
    expect(campus.detail[cell(54, 40)]).toBe(EMPTY);
  });

  it('holds the three snippets of 0008, in order', () => {
    expect(SNIPPETS).toStrictEqual([
      { x: 1288, y: 760 },
      { x: 1560, y: 760 },
      { x: 1592, y: 540 },
    ]);
    expect(campus.points).toStrictEqual([
      ...SNIPPETS.map((feet) => ({ name: 'snippet', ...feet })),
      { name: 'wake', ...WAKE },
    ]);
  });

  it('holds the wake point of 0009 in front of the door of the data protection office', () => {
    expect(WAKE).toStrictEqual({ x: 792, y: 744 });
    // The box [786, 798) × [736, 744) lies in cell (49, 46), flush under the door (49, 45).
    expect([Math.floor(WAKE.x / 16), Math.floor((WAKE.y - 1) / 16)]).toStrictEqual([49, 46]);
    const office = BUILDINGS.find((building) => building.name.startsWith('data protection'));
    expect(office?.doors).toStrictEqual([{ x: 49, y: 45 }]);
    expect(campus.detail[cell(49, 45)]).toBe(DOOR);
    expect(campus.solid[cell(49, 46)]).toBe(false);
    expect(reachableFrom(campus, SPAWN_CELL)[cell(49, 46)]).toBe(true);
    expect(cameraFor({ x: WAKE.x, y: WAKE.y - 4 }, { width: 2048, height: 1536 })).toStrictEqual({
      x: 632,
      y: 650,
    });
  });

  it("every snippet's box is free and its cell is reachable from the spawn", () => {
    const reached = reachableFrom(campus, SPAWN_CELL);
    for (const { x, y } of campus.points) {
      // The box [x − 6, x + 6) × [y − 8, y).
      for (let row = Math.floor((y - 8) / 16); row <= Math.ceil(y / 16) - 1; row += 1) {
        for (
          let column = Math.floor((x - 6) / 16);
          column <= Math.ceil((x + 6) / 16) - 1;
          column += 1
        ) {
          expect(campus.solid[cell(column, row)], `(${column}, ${row})`).toBe(false);
        }
      }
      expect(reached[cell(Math.floor(x / 16), Math.floor(y / 16))], `(${x}, ${y})`).toBe(true);
    }
  });

  it('no snippet is in the first view or within 64 px of the spawn', () => {
    // The first view is [864, 1184) × [640, 820); a sprite is [x − 8, x + 8) × [y − 16, y).
    for (const { x, y } of campus.points) {
      const inView = x + 8 > 864 && x - 8 < 1184 && y > 640 && y - 16 < 820;
      expect(inView, `(${x}, ${y})`).toBe(false);
      expect(Math.hypot(x - SPAWN.x, y - SPAWN.y)).toBeGreaterThanOrEqual(64);
    }
  });

  it('the third snippet stands inside the meeting rooms fence, on tile (99, 33)', () => {
    const closed = campus.solid.map((solid, at) => solid || at === cell(95, 34));
    expect(reachableFrom({ ...campus, solid: closed }, SPAWN_CELL)[cell(99, 33)]).toBe(false);
  });
});
