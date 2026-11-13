import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/engine/camera';
import { moveBox } from '../../src/engine/collision';
import { type Box, type Point, parseTileMap, parseTileset } from '../../src/engine/tiled';
import {
  type CellRect,
  CLOSED_DOORS,
  CORRIDORS,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  HORIZONTAL_WALLS,
  POSTS,
  ROOMS,
  SNIPPETS,
  SPAWN,
  VERTICAL_WALLS,
  WAKE,
} from '../../tools/floor-layout.ts';
import { encodeFloor } from '../../tools/gen-floor.ts';
import {
  CARPET,
  CORRIDOR,
  DOOR_CLOSED,
  OUTER_WALL,
  TILE_KINDS,
  WINDOW,
} from '../../tools/placeholder-tiles.ts';
import { feetIn, reachableFeet } from './flood';

/**
 * The floor the game loads (feature 0010), read from public/ on purpose (testing.md §6 forbids
 * generated fixtures, not tests of the shipped content): the committed file equals the
 * generator, and the map obeys the spec's tables — the ring, the areas, the walls and their
 * openings, the posts, the closed doors, the tile counts, the spawn, the points and what is
 * reachable on foot.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MAP_FILE = 'public/maps/floor.tmj';
const TILESET_FILE = 'public/tiles/placeholder.tsj';

function read(file: string): string {
  return readFileSync(join(ROOT, file), 'utf8');
}

const tileset = parseTileset(JSON.parse(read(TILESET_FILE)), TILESET_FILE);
const floor = parseTileMap(JSON.parse(read(MAP_FILE)), tileset, MAP_FILE);
const cell = (column: number, row: number): number => row * floor.width + column;
const tileAt = (column: number, row: number): number | undefined => floor.ground[cell(column, row)];

const sameBox = (a: Box, b: Box): boolean =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
const hasBox = (column: number, row: number, box: Box): boolean =>
  (floor.solids[cell(column, row)] ?? []).some((solid) => sameBox(solid, box));
const topStrip = (column: number, row: number): Box => ({
  x: column * 16,
  y: row * 16,
  width: 16,
  height: 4,
});
const leftStrip = (column: number, row: number): Box => ({
  x: column * 16,
  y: row * 16,
  width: 4,
  height: 16,
});

function* cellsOf(rect: CellRect): Generator<Point> {
  for (let row = rect.r0; row <= rect.r1; row += 1) {
    for (let column = rect.c0; column <= rect.c1; column += 1) {
      yield { x: column, y: row };
    }
  }
}

/** The figure's box for feet (x, y), as in 0005. */
const boxAt = (feet: Point): Box => ({ x: feet.x - 6, y: feet.y - 8, width: 12, height: 8 });

/** Whether the box overlaps a solid box of a cell it touches. */
function blocked(box: Box): boolean {
  for (
    let row = Math.floor(box.y / 16);
    row <= Math.ceil((box.y + box.height) / 16) - 1;
    row += 1
  ) {
    for (
      let column = Math.floor(box.x / 16);
      column <= Math.ceil((box.x + box.width) / 16) - 1;
      column += 1
    ) {
      for (const solid of floor.solids[cell(column, row)] ?? []) {
        if (
          box.x < solid.x + solid.width &&
          box.x + box.width > solid.x &&
          box.y < solid.y + solid.height &&
          box.y + box.height > solid.y
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

const reached = reachableFeet(floor, SPAWN);
const MAP_PX = { width: FLOOR_WIDTH * 16, height: FLOOR_HEIGHT * 16 };

describe('public/maps/floor.tmj (feature 0010)', () => {
  it('is what the generator writes, and the generator is deterministic', () => {
    expect(encodeFloor()).toBe(encodeFloor());
    expect(read(MAP_FILE)).toBe(encodeFloor());
  });

  it('is 108x80 tiles with `ground` and `objects` only and the spawn at (256, 718)', () => {
    expect([floor.width, floor.height]).toStrictEqual([108, 80]);
    const layers = (JSON.parse(read(MAP_FILE)) as { layers: { name: string }[] }).layers;
    expect(layers.map((layer) => layer.name)).toStrictEqual(['ground', 'objects']);
    expect(floor.spawn).toStrictEqual({ x: 256, y: 718 });
    expect(SPAWN).toStrictEqual(floor.spawn);
  });

  it('closes the ring with 180 windows and 192 wall tiles, by the rule', () => {
    let windows = 0;
    let walls = 0;
    for (let row = 0; row < 80; row += 1) {
      for (let column = 0; column < 108; column += 1) {
        const onRing = row === 0 || row === 79 || column === 0 || column === 107;
        if (!onRing) {
          continue;
        }
        const window =
          ((row === 0 || row === 79) && column >= 2 && column <= 105 && column % 4 >= 2) ||
          ((column === 0 || column === 107) && row >= 2 && row <= 77 && row % 4 >= 2);
        expect(tileAt(column, row), `(${column}, ${row})`).toBe(window ? WINDOW : OUTER_WALL);
        if (window) {
          windows += 1;
        } else {
          walls += 1;
        }
      }
    }
    expect([windows, walls]).toStrictEqual([180, 192]);
  });

  it("gives every area's cells its floor, and every interior cell lies in exactly one area", () => {
    const count = new Array<number>(108 * 80).fill(0);
    for (const [areas, floorId] of [
      [CORRIDORS, CORRIDOR],
      [ROOMS, CARPET],
    ] as const) {
      for (const area of areas) {
        for (const at of cellsOf(area.cells)) {
          count[cell(at.x, at.y)] = (count[cell(at.x, at.y)] ?? 0) + 1;
          const id = tileAt(at.x, at.y) ?? -1;
          const onFloor =
            floorId === CARPET ? id === CARPET || (id >= 4 && id <= 7) : id === CORRIDOR || id >= 8;
          expect(onFloor, `${area.name} (${at.x}, ${at.y}) has tile ${id}`).toBe(true);
        }
      }
    }
    for (let row = 1; row <= 78; row += 1) {
      for (let column = 1; column <= 106; column += 1) {
        expect(count[cell(column, row)], `(${column}, ${row})`).toBe(1);
      }
    }
  });

  it('puts a strip on every wall cell of the tables and none on an opening', () => {
    for (const wall of HORIZONTAL_WALLS) {
      for (let column = wall.from; column <= wall.to; column += 1) {
        const open = wall.openings.includes(column);
        expect(
          hasBox(column, wall.row, topStrip(column, wall.row)),
          `(${column}, ${wall.row})`,
        ).toBe(!open);
      }
    }
    for (const wall of VERTICAL_WALLS) {
      for (let row = wall.from; row <= wall.to; row += 1) {
        const open = wall.openings.includes(row);
        expect(
          hasBox(wall.column, row, leftStrip(wall.column, row)),
          `(${wall.column}, ${row})`,
        ).toBe(!open);
      }
    }
  });

  it('has the three posts and no other', () => {
    const posts: Point[] = [];
    floor.ground.forEach((id, at) => {
      if (id === 7 || id === 11) {
        posts.push({ x: at % 108, y: Math.floor(at / 108) });
      }
    });
    expect(posts).toStrictEqual([...POSTS].sort((a, b) => a.y - b.y || a.x - b.x));
    expect(POSTS).toStrictEqual([
      { x: 85, y: 20 },
      { x: 23, y: 52 },
      { x: 73, y: 52 },
    ]);
  });

  it('has the four closed doors in the wall of row 52', () => {
    const doors: Point[] = [];
    floor.ground.forEach((id, at) => {
      if (id === DOOR_CLOSED) {
        doors.push({ x: at % 108, y: Math.floor(at / 108) });
      }
    });
    expect(doors).toStrictEqual([
      { x: 54, y: 52 },
      { x: 55, y: 52 },
      { x: 66, y: 52 },
      { x: 67, y: 52 },
    ]);
    expect(CLOSED_DOORS).toStrictEqual(doors);
  });

  it('has the eleven tile counts of the spec', () => {
    const counts = new Map<string, number>();
    for (const id of floor.ground) {
      const name = TILE_KINDS[id]?.name ?? `id ${id}`;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    expect({
      carpet: counts.get('carpet') ?? 0,
      corridor: counts.get('corridor') ?? 0,
      'wall-top-carpet': counts.get('wall-top-carpet') ?? 0,
      'wall-left-carpet': counts.get('wall-left-carpet') ?? 0,
      'wall-corner-carpet': counts.get('wall-corner-carpet') ?? 0,
      'wall-post-carpet': counts.get('wall-post-carpet') ?? 0,
      'wall-top-corridor': counts.get('wall-top-corridor') ?? 0,
      'wall-left-corridor': counts.get('wall-left-corridor') ?? 0,
      'wall-corner-corridor': counts.get('wall-corner-corridor') ?? 0,
      'wall-post-corridor': counts.get('wall-post-corridor') ?? 0,
      'door-closed': counts.get('door-closed') ?? 0,
    }).toStrictEqual({
      carpet: 6210,
      corridor: 1407,
      'wall-top-carpet': 228,
      'wall-left-carpet': 164,
      'wall-corner-carpet': 6,
      'wall-post-carpet': 0,
      'wall-top-corridor': 183,
      'wall-left-corridor': 63,
      'wall-corner-corridor': 0,
      'wall-post-corridor': 3,
      'door-closed': 4,
    });
  });

  it("frees the spawn's box and row 44 from x = 256 to x = 458, where column 29 stops it", () => {
    expect(blocked(boxAt(SPAWN))).toBe(false);
    for (let x = 256; x <= 458; x += 1) {
      expect(blocked(boxAt({ x, y: 718 })), `feet (${x}, 718)`).toBe(false);
    }
    let box = boxAt(SPAWN);
    for (let step = 0; step < 300; step += 1) {
      box = { ...box, ...moveBox(box, 4 / 3, 0, floor) };
    }
    expect(box.x + 6).toBe(458);
  });

  it("puts carpet in the view's top-left cell at the spawn: camera (96, 624), cell (6, 39)", () => {
    const camera = cameraFor({ x: 256, y: 714 }, MAP_PX);
    expect(camera).toStrictEqual({ x: 96, y: 624 });
    expect(tileAt(camera.x / 16, camera.y / 16)).toBe(CARPET);
  });

  it('reaches every corridor and room on foot but the lift and the stairwell', () => {
    const probes: readonly (readonly [string, number, number])[] = [
      ['hr', 11, 17],
      ['accounting', 32, 17],
      ['development', 64, 13],
      ['side passage', 86, 2],
      ['meeting room north', 91, 8],
      ['meeting room south', 91, 18],
      ['data protection officer', 19, 34],
      ['reception', 5, 48],
      ['break room', 38, 38],
      ['sales', 80, 38],
      ['marketing', 24, 60],
      ['support', 78, 59],
      ['north corridor', 2, 21],
      ['south corridor', 105, 56],
      ['west corridor', 24, 27],
      ['east corridor', 77, 50],
      ['top-left corner', 1, 1],
      ['bottom-right corner', 106, 78],
      ['bottom-left corner', 1, 78],
    ];
    for (const [name, column, row] of probes) {
      expect(reached(feetIn(column, row)), name).toBe(true);
    }
    expect(reached(feetIn(55, 38)), 'lift').toBe(false);
    expect(reached(feetIn(67, 38)), 'stairwell').toBe(false);
  });

  it("reaches neither meeting room with the side passage's opening closed", () => {
    const solids = floor.solids.map((boxes, at) => {
      const column = at % 108;
      const row = Math.floor(at / 108);
      return row === 20 && column >= 85 && column <= 88 ? [...boxes, topStrip(column, row)] : boxes;
    });
    const closed = reachableFeet({ ...floor, solids }, SPAWN);
    expect(closed(feetIn(91, 8))).toBe(false);
    expect(closed(feetIn(91, 18))).toBe(false);
  });

  it('places the three snippets free and reached, away from the first view and the spawn', () => {
    expect(floor.points.slice(0, 3)).toStrictEqual(
      SNIPPETS.map((feet) => ({ name: 'snippet', ...feet })),
    );
    expect(SNIPPETS).toStrictEqual([
      { x: 1224, y: 622 },
      { x: 1416, y: 526 },
      { x: 1576, y: 718 },
    ]);
    for (const feet of SNIPPETS) {
      expect(blocked(boxAt(feet)), `(${feet.x}, ${feet.y}) free`).toBe(false);
      expect(reached(feet), `(${feet.x}, ${feet.y}) reached`).toBe(true);
      const inView = feet.x >= 96 && feet.x < 416 && feet.y >= 624 && feet.y < 804;
      expect(inView, `(${feet.x}, ${feet.y}) in the first view`).toBe(false);
      expect(Math.hypot(feet.x - SPAWN.x, feet.y - SPAWN.y)).toBeGreaterThan(64);
    }
  });

  it("places the wake point in the data protection officer's office, after the snippets", () => {
    expect(floor.points).toStrictEqual([
      ...SNIPPETS.map((feet) => ({ name: 'snippet', ...feet })),
      { name: 'wake', x: 296, y: 504 },
    ]);
    expect(WAKE).toStrictEqual({ x: 296, y: 504 });
    expect(blocked(boxAt(WAKE))).toBe(false);
    expect(reached(WAKE)).toBe(true);
    const office = ROOMS.find((room) => room.name === "data protection officer's office");
    expect(office?.cells).toStrictEqual({ c0: 1, c1: 22, r0: 26, r1: 37 });
    expect([Math.floor(WAKE.x / 16), Math.floor((WAKE.y - 1) / 16)]).toStrictEqual([18, 31]);
    expect(cameraFor({ x: 296, y: 500 }, MAP_PX)).toStrictEqual({ x: 136, y: 410 });
  });
});
