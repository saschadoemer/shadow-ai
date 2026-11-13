import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/engine/camera';
import { moveBox } from '../../src/engine/collision';
import { type Box, EMPTY, type Point, parseTileMap, parseTileset } from '../../src/engine/tiled';
import {
  type CellRect,
  CLOSED_DOORS,
  CORRIDORS,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  FURNITURE,
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
  ARCADE,
  ARCADE_TOP,
  ARMCHAIR,
  BEANBAG,
  CABINET,
  CABINET_TOP,
  CARPET,
  CHAIR,
  COAT_RACK,
  COAT_RACK_TOP,
  CORRIDOR,
  CORRIDOR_WALLS,
  COUNTER,
  COUNTER_COFFEE,
  DESK,
  DESK_CUBE,
  DESK_DUCK,
  DESK_LAVA_LAMP,
  DESK_MONITOR,
  DESK_MONITOR_PARTITION,
  DESK_PARTITION,
  DESK_ROBOT,
  DOOR_CLOSED,
  FOOSBALL_LEFT,
  FOOSBALL_RIGHT,
  OUTER_WALL,
  PARTITION_CORNER,
  PARTITION_LEFT,
  PARTITION_TOP,
  PLANT,
  PLANT_TOP,
  PRINTER,
  SCREEN,
  SCREEN_SIDE,
  SIDE_TABLE,
  SOFA_LEFT,
  SOFA_RIGHT,
  TABLE,
  TILE_KINDS,
  WALL_CORNER,
  WALL_TOP,
  WATER_DISPENSER,
  WATER_DISPENSER_TOP,
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

  it('is 108x80 tiles with `ground`, `detail`, `above` and `objects` and the spawn at (256, 718)', () => {
    expect([floor.width, floor.height]).toStrictEqual([108, 80]);
    const layers = (JSON.parse(read(MAP_FILE)) as { layers: { name: string }[] }).layers;
    expect(layers.map((layer) => layer.name)).toStrictEqual([
      'ground',
      'detail',
      'above',
      'objects',
    ]);
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
      // (106, 78) holds Support's cabinet since 0011.
      ['bottom-right corner', 106, 76],
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

/** The picture of 0011's spec, character → the ids it allows on `detail`. */
const PICTURE_IDS: Readonly<Record<string, readonly number[]>> = {
  '~': [PARTITION_TOP],
  '!': [PARTITION_LEFT],
  '*': [PARTITION_CORNER],
  m: [DESK_MONITOR, DESK_MONITOR_PARTITION],
  d: [DESK, DESK_PARTITION],
  c: [CHAIR],
  C: [CABINET],
  P: [PLANT],
  T: [TABLE],
  K: [COUNTER],
  R: [PRINTER],
  _: [SCREEN],
  i: [SCREEN_SIDE],
};

const detailAt = (column: number, row: number): number | undefined =>
  floor.detail[cell(column, row)];
const aboveAt = (column: number, row: number): number | undefined => floor.above[cell(column, row)];

/** The cells of 0011 that 0013 replaces, "column,row" → the id that stands there now. */
const REPLACED: Readonly<Record<string, number>> = {
  '35,26': COUNTER_COFFEE,
  '42,26': COUNTER_COFFEE,
  '48,3': DESK_DUCK,
  '74,9': DESK_DUCK,
  '58,3': DESK_LAVA_LAMP,
  '69,15': DESK_LAVA_LAMP,
  '53,9': DESK_CUBE,
  '79,3': DESK_CUBE,
  '48,15': DESK_ROBOT,
  '79,15': DESK_ROBOT,
};

/** The picture of 0013's spec: the characters of 0011 and the ten new ones. */
const LOUNGE_IDS: Readonly<Record<string, readonly number[]>> = {
  ...PICTURE_IDS,
  S: [SOFA_LEFT, SOFA_RIGHT],
  a: [ARMCHAIR],
  t: [SIDE_TABLE],
  b: [BEANBAG],
  k: [COUNTER_COFFEE],
  W: [WATER_DISPENSER],
  G: [COAT_RACK],
  A: [ARCADE],
  F: [FOOSBALL_LEFT, FOOSBALL_RIGHT],
  g: [DESK_DUCK, DESK_LAVA_LAMP, DESK_CUBE, DESK_ROBOT],
};

/** A tall thing's top → its body (0011, 0013). */
const BODY_OF: ReadonlyMap<number, number> = new Map([
  [CABINET_TOP, CABINET],
  [PLANT_TOP, PLANT],
  [WATER_DISPENSER_TOP, WATER_DISPENSER],
  [COAT_RACK_TOP, COAT_RACK],
  [ARCADE_TOP, ARCADE],
]);
const TOP_OF: ReadonlyMap<number, number> = new Map([...BODY_OF].map(([top, body]) => [body, top]));

const pictureRows = (file: string): string[] => {
  const rows = read(file).trimEnd().split('\n');
  expect(rows).toHaveLength(80);
  for (const line of rows) {
    expect(line).toHaveLength(108);
  }
  return rows;
};

const AREAS = [...ROOMS, ...CORRIDORS];
const areaOf = (column: number, row: number): string | undefined =>
  AREAS.find(({ cells: r }) => column >= r.c0 && column <= r.c1 && row >= r.r0 && row <= r.r1)
    ?.name;

describe('the furniture (0011)', () => {
  it('still stands where its spec draws it, but for the ten cells 0013 replaces', () => {
    pictureRows('tests/fixtures/maps/floor-furniture.txt').forEach((line, row) => {
      [...line].forEach((character, column) => {
        const allowed = PICTURE_IDS[character];
        if (allowed === undefined) {
          return;
        }
        const replaced = REPLACED[`${column},${row}`];
        const where = `(${column}, ${row}) "${character}"`;
        if (replaced === undefined) {
          expect(allowed, where).toContain(detailAt(column, row));
        } else {
          expect(detailAt(column, row), where).toBe(replaced);
        }
      });
    });
  });

  // 0013 turned eight desk-partitions into gadget desks and added four counters.
  it('has the fifteen tile counts on `detail` and the two on `above`', () => {
    const count = (layer: readonly number[], id: number): number =>
      layer.filter((value) => value === id).length;
    expect(
      [
        PARTITION_TOP,
        PARTITION_LEFT,
        PARTITION_CORNER,
        DESK,
        DESK_MONITOR,
        DESK_PARTITION,
        DESK_MONITOR_PARTITION,
        CHAIR,
        CABINET,
        PLANT,
        TABLE,
        COUNTER,
        PRINTER,
        SCREEN,
        SCREEN_SIDE,
      ].map((id) => count(floor.detail, id)),
    ).toStrictEqual([122, 170, 61, 24, 24, 53, 61, 122, 34, 14, 58, 23, 5, 6, 14]);
    expect([count(floor.above, CABINET_TOP), count(floor.above, PLANT_TOP)]).toStrictEqual([
      34, 14,
    ]);
  });

  it('builds the pieces as the spec defines them', () => {
    const placements = FURNITURE.flatMap((entry) => entry.placements);
    expect(placements).toContainEqual({ piece: 'bank', x: 82, y: 28, n: 4 });
    expect(placements).toContainEqual({ piece: 'island', x: 5, y: 62 });
    expect(placements).toContainEqual({ piece: 'workplace', x: 4, y: 28 });
    // The first cubicle of Sales' first bank, (82, 28).
    expect([
      detailAt(82, 28),
      detailAt(83, 28),
      detailAt(84, 28),
      detailAt(85, 28),
      detailAt(86, 28),
      detailAt(82, 29),
      detailAt(82, 30),
      detailAt(83, 29),
    ]).toStrictEqual([15, 19, 18, 13, 13, 14, 14, 20]);
    // The island of Marketing at (5, 62).
    expect([
      detailAt(5, 62),
      detailAt(6, 62),
      detailAt(5, 63),
      detailAt(6, 63),
      detailAt(4, 62),
      detailAt(7, 62),
      detailAt(4, 63),
      detailAt(7, 63),
    ]).toStrictEqual([17, 17, 16, 16, 20, 20, 20, 20]);
    // The data protection officer's workplace at (4, 28).
    expect([detailAt(4, 28), detailAt(5, 28), detailAt(4, 29)]).toStrictEqual([17, 16, 20]);
    expect([30, 31, 32, 33].map((row) => detailAt(9, row))).toStrictEqual([29, 29, 29, 29]);
    expect([25, 26, 27].map((column) => detailAt(column, 7))).toStrictEqual([28, 28, 28]);
  });

  it('leaves the outer ring, the lift, the stairwell, the west and east corridors and the side passage empty', () => {
    for (let row = 0; row < 80; row += 1) {
      for (let column = 0; column < 108; column += 1) {
        const onRing = row === 0 || row === 79 || column === 0 || column === 107;
        if (onRing) {
          expect(
            [detailAt(column, row), aboveAt(column, row)],
            `(${column}, ${row})`,
          ).toStrictEqual([EMPTY, EMPTY]);
        }
      }
    }
    const empty = ['lift', 'stairwell', 'west corridor', 'east corridor', 'side passage'];
    for (const area of AREAS.filter(({ name }) => empty.includes(name))) {
      for (const at of cellsOf(area.cells)) {
        expect(
          [detailAt(at.x, at.y), aboveAt(at.x, at.y)],
          `${area.name} (${at.x}, ${at.y})`,
        ).toStrictEqual([EMPTY, EMPTY]);
      }
    }
  });

  it('puts every top one row above its body, in the same area, never below a wall', () => {
    const topStripIds = [
      WALL_TOP,
      WALL_CORNER,
      WALL_TOP + CORRIDOR_WALLS,
      WALL_CORNER + CORRIDOR_WALLS,
      DOOR_CLOSED,
    ];
    for (let row = 0; row < 80; row += 1) {
      for (let column = 0; column < 108; column += 1) {
        const top = aboveAt(column, row) ?? EMPTY;
        const where = `(${column}, ${row})`;
        if (top !== EMPTY) {
          expect(BODY_OF.has(top), `${where} holds ${top}`).toBe(true);
          expect(detailAt(column, row + 1), where).toBe(BODY_OF.get(top));
          expect(areaOf(column, row), where).toBeDefined();
          expect(areaOf(column, row), where).toBe(areaOf(column, row + 1));
          expect(topStripIds, where).not.toContain(tileAt(column, row + 1));
          expect([EMPTY, ...TOP_OF.keys()], where).toContain(detailAt(column, row));
        }
        const body = TOP_OF.get(detailAt(column, row) ?? EMPTY);
        if (body !== undefined) {
          expect(aboveAt(column, row - 1), `top of ${where}`).toBe(body);
        }
      }
    }
  });

  it("keeps the view's top-left cell at the spawn, (6, 39), free of furniture", () => {
    expect([detailAt(6, 39), aboveAt(6, 39)]).toStrictEqual([EMPTY, EMPTY]);
  });

  it('reaches both open cells of every cubicle on foot', () => {
    let cubicles = 0;
    for (const { placements } of FURNITURE) {
      for (const placement of placements) {
        if (placement.piece !== 'bank') {
          continue;
        }
        for (let k = 0; k < placement.n; k += 1) {
          const x = placement.x + 5 * k;
          const { y } = placement;
          expect(reached(feetIn(x + 2, y + 1)), `cubicle (${x}, ${y}) beside the chair`).toBe(true);
          expect(reached(feetIn(x, y + 2)), `cubicle (${x}, ${y}) at its open side`).toBe(true);
          cubicles += 1;
        }
      }
    }
    expect(cubicles).toBe(61);
  });

  it("shows the reception's counter in the first view: cells (8, 41)–(12, 41) inside camera (96, 624)", () => {
    const camera = cameraFor({ x: 256, y: 714 }, MAP_PX);
    expect(camera).toStrictEqual({ x: 96, y: 624 });
    for (let column = 8; column <= 12; column += 1) {
      expect(detailAt(column, 41)).toBe(COUNTER);
      const left = column * 16;
      const top = 41 * 16;
      for (const [x, y] of [
        [left, top],
        [left + 15, top],
        [left, top + 15],
        [left + 15, top + 15],
      ] as const) {
        const inView = x >= camera.x && x < camera.x + 320 && y >= camera.y && y < camera.y + 180;
        expect(inView, `(${column}, 41) corner (${x}, ${y})`).toBe(true);
      }
    }
  });

  it('lets light pass the low furniture and stops it at the cabinets', () => {
    expect(floor.opaque[cell(104, 51)]).toStrictEqual([
      { x: 104 * 16, y: 51 * 16, width: 16, height: 16 },
    ]);
    for (const [name, column, row] of [
      ['desk', 83, 28],
      ['chair', 83, 29],
      ['partition', 82, 29],
      ['plant', 80, 50],
      ['screen', 10, 62],
    ] as const) {
      expect(floor.opaque[cell(column, row)], name).toStrictEqual([]);
      expect(floor.solids[cell(column, row)]?.length ?? 0, name).toBeGreaterThan(0);
    }
  });
});

describe('lounge and gadgets (0013)', () => {
  const count = (layer: readonly number[], id: number): number =>
    layer.filter((value) => value === id).length;

  it('stands where the spec draws it, and nowhere else on `detail`', () => {
    pictureRows('tests/fixtures/maps/floor-lounge.txt').forEach((line, row) => {
      [...line].forEach((character, column) => {
        const allowed = LOUNGE_IDS[character] ?? [EMPTY];
        expect(allowed, `(${column}, ${row}) "${character}"`).toContain(detailAt(column, row));
      });
    });
  });

  it('has the fifteen new tile counts on `detail` and the three on `above`', () => {
    expect(
      [
        SOFA_LEFT,
        SOFA_RIGHT,
        ARMCHAIR,
        SIDE_TABLE,
        BEANBAG,
        COUNTER_COFFEE,
        WATER_DISPENSER,
        COAT_RACK,
        ARCADE,
        FOOSBALL_LEFT,
        FOOSBALL_RIGHT,
        DESK_DUCK,
        DESK_LAVA_LAMP,
        DESK_CUBE,
        DESK_ROBOT,
      ].map((id) => count(floor.detail, id)),
    ).toStrictEqual([8, 8, 10, 16, 20, 8, 5, 11, 1, 1, 1, 2, 2, 2, 2]);
    expect(floor.detail.filter((id) => id !== EMPTY)).toHaveLength(888);
    expect(
      [WATER_DISPENSER_TOP, COAT_RACK_TOP, ARCADE_TOP].map((id) => count(floor.above, id)),
    ).toStrictEqual([5, 11, 1]);
    expect(floor.above.filter((id) => id !== EMPTY)).toHaveLength(65);
  });

  it('builds the pieces as the spec defines them', () => {
    const placements = FURNITURE.flatMap((entry) => entry.placements);
    expect(placements).toContainEqual({ piece: 'seating-corner', x: 12, y: 48 });
    expect(placements).toContainEqual({ piece: 'beanbag-circle', x: 37, y: 47 });
    expect(placements).toContainEqual({ piece: 'coffee-machine', x: 35, y: 26 });
    const row = (y: number, from: number, to: number): (number | undefined)[] =>
      Array.from({ length: to - from + 1 }, (_, k) => detailAt(from + k, y));
    // The reception's seating corner at (12, 48): sofa, side-table, armchair.
    expect(row(48, 12, 15)).toStrictEqual([30, 31, 33, 32]);
    // HR's armchair pair is Accounting's, at (39, 14): armchair, side-table, armchair.
    expect(row(14, 39, 41)).toStrictEqual([32, 33, 32]);
    // The break room's beanbag circle at (37, 47).
    expect(row(47, 37, 39)).toStrictEqual([EMPTY, 34, EMPTY]);
    expect(row(48, 37, 39)).toStrictEqual([34, 33, 34]);
    // Accounting's coffee corner at (27, 19) and the break room's two machines in its counter.
    expect(row(19, 27, 28)).toStrictEqual([35, 26]);
    expect(row(26, 32, 45)).toStrictEqual([26, 26, 26, 35, 26, 26, 26, 26, 26, 26, 35, 26, 26, 26]);
    // The table football at (31, 48) and the arcade at (44, 49) with its top.
    expect(row(48, 31, 32)).toStrictEqual([42, 43]);
    expect([detailAt(44, 49), aboveAt(44, 48)]).toStrictEqual([40, 41]);
    // Development's bottom row: sofa, side-table, a free cell, two beanbags.
    expect(row(19, 70, 75)).toStrictEqual([30, 31, 33, EMPTY, 34, 34]);
    // The south corridor's sofa between the lift's and the stairwell's doors.
    expect(row(53, 60, 62)).toStrictEqual([30, 31, 33]);
    // A coat rack and a water dispenser with their tops.
    expect([detailAt(20, 48), aboveAt(20, 47)]).toStrictEqual([38, 39]);
    expect([detailAt(20, 25), aboveAt(20, 24)]).toStrictEqual([36, 37]);
  });

  it('puts a gadget on eight desks of Development, in the place of a desk-partition', () => {
    for (const [key, id] of Object.entries(REPLACED)) {
      const [column, row] = key.split(',').map(Number) as [number, number];
      expect(detailAt(column, row), key).toBe(id);
      if (id !== COUNTER_COFFEE) {
        expect(areaOf(column, row), key).toBe('development');
        expect(detailAt(column - 1, row), key).toBe(DESK_MONITOR_PARTITION);
      }
    }
  });

  it('leaves row 18 of Development empty on `detail`, columns 45–84', () => {
    for (let column = 45; column <= 84; column += 1) {
      expect(detailAt(column, 18), `(${column}, 18)`).toBe(EMPTY);
    }
  });

  it('reaches every cell without a solid box outside the lift and the stairwell', () => {
    let cells = 0;
    for (const area of AREAS.filter(({ name }) => name !== 'lift' && name !== 'stairwell')) {
      for (const at of cellsOf(area.cells)) {
        if ((floor.solids[cell(at.x, at.y)] ?? []).length === 0) {
          expect(reached(feetIn(at.x, at.y)), `${area.name} (${at.x}, ${at.y})`).toBe(true);
          cells += 1;
        }
      }
    }
    expect(cells).toBe(6198);
  });

  it("shows the reception's seating corner and coat rack in the first view", () => {
    const camera = cameraFor({ x: 256, y: 714 }, MAP_PX);
    expect(camera).toStrictEqual({ x: 96, y: 624 });
    for (const [column, row] of [
      [12, 48],
      [13, 48],
      [14, 48],
      [15, 48],
      [20, 47],
      [20, 48],
    ] as const) {
      const inView =
        column * 16 >= camera.x &&
        column * 16 + 16 <= camera.x + 320 &&
        row * 16 >= camera.y &&
        row * 16 + 16 <= camera.y + 180;
      expect(inView, `(${column}, ${row})`).toBe(true);
    }
  });

  it('lets light pass everything new but the arcade cabinet', () => {
    expect(floor.opaque[cell(44, 49)]).toStrictEqual([
      { x: 44 * 16, y: 49 * 16, width: 16, height: 16 },
    ]);
    for (const [name, column, row] of [
      ['sofa', 12, 48],
      ['armchair', 15, 48],
      ['side-table', 14, 48],
      ['beanbag', 38, 47],
      // Not the break room's: its counter stands in the wall's row, and the wall is opaque.
      ['counter-coffee', 27, 19],
      ['water dispenser', 47, 28],
      ['coat rack', 20, 48],
      ['table football', 31, 48],
      ['gadget desk', 48, 3],
    ] as const) {
      expect(floor.opaque[cell(column, row)], name).toStrictEqual([]);
      expect(floor.solids[cell(column, row)]?.length ?? 0, name).toBeGreaterThan(0);
    }
  });
});
