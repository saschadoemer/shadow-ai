import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/engine/camera';
import { moveBox } from '../../src/engine/collision';
import { type Box, EMPTY, type Point, parseTileMap, parseTileset } from '../../src/engine/tiled';
import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
import { REGION_NAME } from '../../src/game/journal';
import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
import { standingWalls, wallsOf, withWalls } from '../../src/game/shadow';
import { NO_RECOIL } from '../../src/game/state';
import { speakerInReach, speakersOf, TALK_DISTANCE } from '../../src/game/talk';
import { traceInLight, tracesOf } from '../../src/game/trace';
import { createInitialState } from '../../src/game/update';
import {
  type CellRect,
  CLOSED_DOORS,
  CORRIDORS,
  FIGURES,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  FURNITURE,
  floorJson,
  HORIZONTAL_WALLS,
  POSTS,
  ROOMS,
  ROUTES,
  SHADOW_WALLS,
  SNIPPETS,
  SPAWN,
  shadowWallBox,
  TRACES,
  traceBox,
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
    expect(floor.points.slice(0, 4)).toStrictEqual([
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

describe('the routes of the floor (0015)', () => {
  const routes = routesOf(floor.points);
  const cellsOf = (points: readonly { x: number; y: number; pause: number }[]) =>
    points.map((p) => [(p.x - 8) / 16, (p.y - 8) / 16, p.pause]);

  it('holds 86 route points in 22 routes: 4 persons, 8 dogs, 8 vacuums, 2 drones, in table order', () => {
    expect(floor.points.filter((point) => isRoutePoint(point.name))).toHaveLength(86);
    expect(routes.map((route) => route.name)).toStrictEqual([
      'person:reception',
      'person:marketing',
      'person:support',
      'person:sales',
      'dog:hr',
      'dog:accounting',
      'dog:development',
      'dog:reception',
      'dog:break-room',
      'dog:sales',
      'dog:marketing',
      'dog:support',
      'vacuum:hr',
      'vacuum:accounting',
      'vacuum:development',
      'vacuum:reception',
      'vacuum:break-room',
      'vacuum:sales',
      'vacuum:marketing',
      'vacuum:support',
      'drone:development',
      'drone:marketing',
    ]);
  });

  it('has the cells and pauses of the spec', () => {
    const cells = (name: string) => {
      const route = routes.find((candidate) => candidate.name === name);
      return route === undefined ? undefined : cellsOf(route.points);
    };
    expect(cells('person:reception')).toStrictEqual([
      [12, 40, 300],
      [19, 40, 0],
      [19, 47, 180],
      [19, 40, 0],
    ]);
    expect(cells('dog:development')).toStrictEqual([
      [68, 18, 300],
      [76, 18, 420],
    ]);
    expect(cells('dog:reception')).toStrictEqual([
      [11, 47, 300],
      [16, 47, 180],
      [16, 49, 420],
      [11, 49, 240],
    ]);
    expect(cells('vacuum:support')).toStrictEqual([
      [51, 71, 60],
      [105, 71, 60],
      [105, 72, 60],
      [51, 72, 60],
    ]);
    expect(cells('drone:marketing')).toStrictEqual([
      [5, 61, 120],
      [15, 61, 120],
      [15, 72, 120],
      [5, 72, 120],
    ]);
    expect(routes.map((route) => cellsOf(route.points))).toStrictEqual(
      ROUTES.map((route) => route.cells.map((cell) => [...cell])),
    );
    expect(routes.map((route) => route.name)).toStrictEqual(ROUTES.map((route) => route.name));
  });

  it('keeps every ground leg clear of every solid box and every leg straight (criterion 10)', () => {
    expect(() => checkRoutes(routes, floor)).not.toThrow();
  });

  it('keeps the five points of 0010 first, with their ids', () => {
    expect(floor.points.slice(0, 4).map((point) => point.name)).toStrictEqual([
      'snippet',
      'snippet',
      'snippet',
      'wake',
    ]);
    const json = floorJson();
    expect(json.layers[3].objects.map((object) => object.id)).toStrictEqual(
      Array.from({ length: 105 }, (_, i) => i + 1),
    );
    expect(json.nextobjectid).toBe(106);
  });

  it('shows the person and the dog of the reception in the first view, not the vacuum', () => {
    const movers = createInitialState(floor).movers;
    const inView = (m: { x: number; y: number }) =>
      m.x >= 96 && m.x < 96 + 320 && m.y >= 624 && m.y < 624 + 180;
    expect(movers.filter(inView).map((m) => [m.kind, m.x, m.y])).toStrictEqual([
      ['person', 200, 648],
      ['dog', 184, 760],
    ]);
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

describe('the shadow walls of the floor (0014)', () => {
  /** The spec's table: region, density, box. */
  const TABLE: readonly (readonly [string, number, Box])[] = [
    ['sales', 1, { x: 1264, y: 592, width: 4, height: 48 }],
    ['marketing', 1, { x: 368, y: 928, width: 48, height: 4 }],
    ['support', 1, { x: 1232, y: 928, width: 48, height: 4 }],
    ['meeting-rooms', 1, { x: 1424, y: 64, width: 4, height: 48 }],
    ['meeting-rooms', 1, { x: 1424, y: 224, width: 4, height: 48 }],
    ['hr', 2, { x: 160, y: 320, width: 48, height: 4 }],
    ['accounting', 2, { x: 496, y: 320, width: 48, height: 4 }],
    ['development', 3, { x: 1008, y: 320, width: 48, height: 4 }],
  ];
  const walls = wallsOf(floor.rects);
  const overlap = (a: Box, b: Box): boolean =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  it('holds the eight rectangles of the spec after the 91 points, with the ids 92–99', () => {
    // The walls are the first eight rectangles; the traces of 0022 follow them.
    expect(floor.rects.slice(0, 8)).toStrictEqual(
      TABLE.map(([region, , box]) => ({ name: `shadow:${region}`, ...box })),
    );
    const objects = floorJson().layers[3].objects;
    expect(objects.slice(0, 91).every((object) => 'point' in object)).toBe(true);
    expect(objects.slice(91, 99).map((object) => [object.id, object.name])).toStrictEqual(
      TABLE.map(([region], i) => [92 + i, `shadow:${region}`]),
    );
    expect(objects.slice(91, 99).some((object) => 'point' in object)).toBe(false);
    expect(floor.points).toHaveLength(91);
  });

  it('builds the boxes from the doorway cells of the layout', () => {
    expect(SHADOW_WALLS.map((wall) => [wall.region, shadowWallBox(wall.cells)])).toStrictEqual(
      TABLE.map(([region, , box]) => [region, box]),
    );
  });

  it('reads them as walls with region, density and box', () => {
    expect(walls).toStrictEqual(TABLE.map(([region, density, box]) => ({ region, density, box })));
  });

  it('puts each wall on the cells of exactly one opening', () => {
    for (const { region, box } of walls) {
      const column = box.x / 16;
      const row = box.y / 16;
      if (box.height === 4) {
        const line = HORIZONTAL_WALLS.find(
          (wall) => wall.row === row && wall.from <= column && column <= wall.to,
        );
        const columns = Array.from({ length: box.width / 16 }, (_, k) => column + k);
        expect(
          columns.every((c) => line?.openings.includes(c)),
          region,
        ).toBe(true);
        expect(line?.openings.includes(column - 1), region).toBe(false);
        expect(line?.openings.includes(column + columns.length), region).toBe(false);
      } else {
        const line = VERTICAL_WALLS.find(
          (wall) => wall.column === column && wall.from <= row && row <= wall.to,
        );
        const rows = Array.from({ length: box.height / 16 }, (_, k) => row + k);
        expect(
          rows.every((r) => line?.openings.includes(r)),
          region,
        ).toBe(true);
        expect(line?.openings.includes(row - 1), region).toBe(false);
        expect(line?.openings.includes(row + rows.length), region).toBe(false);
      }
    }
  });

  it('keeps every wall clear of every solid box of the map', () => {
    for (const { region, box } of walls) {
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
            expect(overlap(box, solid), `${region} at (${column}, ${row})`).toBe(false);
          }
        }
      }
    }
  });

  it('keeps the spawn, the wake point and the snippets clear of every wall', () => {
    for (const feet of [SPAWN, WAKE, ...SNIPPETS]) {
      for (const { region, box } of walls) {
        expect(overlap(boxAt(feet), box), `(${feet.x}, ${feet.y}) against ${region}`).toBe(false);
      }
    }
  });

  describe('reachability on foot', () => {
    const OPEN: readonly (readonly [string, number, number])[] = [
      ['data protection officer', 19, 34],
      ['reception', 5, 48],
      ['break room', 38, 38],
      ['north corridor', 2, 21],
      ['south corridor', 105, 56],
      ['west corridor', 24, 27],
      ['east corridor', 77, 50],
      ['side passage', 86, 2],
    ];
    const THIN: readonly (readonly [string, number, number])[] = [
      ['sales', 80, 38],
      ['marketing', 24, 60],
      ['support', 78, 59],
      ['meeting room north', 91, 8],
      ['meeting room south', 91, 18],
    ];
    const DENSE: readonly (readonly [string, number, number])[] = [
      ['hr', 11, 17],
      ['accounting', 32, 17],
    ];
    const DENSEST: readonly (readonly [string, number, number])[] = [['development', 64, 13]];
    /** The flood with every wall of a density up to `lifted` gone. */
    const flood = (lifted: number) =>
      reachableFeet(
        withWalls(
          floor,
          walls,
          standingWalls(walls).filter(({ wall }) => (walls[wall]?.density ?? 0) > lifted),
        ),
        SPAWN,
      );
    const names = (
      reached: (feet: Point) => boolean,
      probes: readonly (readonly [string, number, number])[],
    ) => probes.filter(([, column, row]) => reached(feetIn(column, row))).map(([name]) => name);
    const all = (probes: readonly (readonly [string, number, number])[]) =>
      probes.map(([name]) => name);

    it.each([
      [0, all(OPEN), [], [], []],
      [1, all(OPEN), all(THIN), [], []],
      [2, all(OPEN), all(THIN), all(DENSE), []],
      [3, all(OPEN), all(THIN), all(DENSE), all(DENSEST)],
    ])('with the walls up to density %d lifted', (lifted, open, thin, dense, densest) => {
      const reached = flood(lifted);
      expect(names(reached, OPEN)).toStrictEqual(open);
      expect(names(reached, THIN)).toStrictEqual(thin);
      expect(names(reached, DENSE)).toStrictEqual(dense);
      expect(names(reached, DENSEST)).toStrictEqual(densest);
    });
  });
});

describe('the standing figures of the floor (0017)', () => {
  const OFFICER = { x: 264, y: 472 };
  const figures = figuresOf(floor.points);

  it('holds the point figure:officer after the rectangles, with the id 100', () => {
    expect(FIGURES).toStrictEqual([{ id: 'officer', at: OFFICER }]);
    expect(floor.points.at(-1)).toStrictEqual({ name: 'figure:officer', ...OFFICER });
    const objects = floorJson().layers[3].objects;
    // The hundredth object; the traces of 0022 follow it.
    const hers = objects[99];
    expect([hers?.id, hers?.name, hers?.x, hers?.y]).toStrictEqual([
      100,
      'figure:officer',
      264,
      472,
    ]);
    expect(hers !== undefined && 'point' in hers).toBe(true);
  });

  it('gives the floor one figure, the officer, with her two pages', () => {
    expect(
      figures.map((figure) => [figure.id, figure.x, figure.y, figure.pages.length]),
    ).toStrictEqual([['officer', 264, 472, 2]]);
    expect(createInitialState(floor).figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
  });

  it("stands in the middle of tile (16, 29), in the data protection officer's office", () => {
    expect([(OFFICER.x - 8) / 16, (OFFICER.y - 8) / 16]).toStrictEqual([16, 29]);
    const office = ROOMS.find((room) => room.name === "data protection officer's office");
    expect(office?.cells).toStrictEqual({ c0: 1, c1: 22, r0: 26, r1: 37 });
  });

  it('is free of every solid box and reached on foot from the spawn', () => {
    expect(blocked(boxAt(OFFICER))).toBe(false);
    expect(reached(OFFICER)).toBe(true);
  });

  it('lies in the view of the wake point, and out of reach of it', () => {
    const camera = cameraFor({ x: WAKE.x, y: WAKE.y - 4 }, MAP_PX);
    expect(camera).toStrictEqual({ x: 136, y: 410 });
    expect(OFFICER.x - 8).toBeGreaterThanOrEqual(camera.x);
    expect(OFFICER.x + 8).toBeLessThanOrEqual(camera.x + 320);
    expect(OFFICER.y - 24).toBeGreaterThanOrEqual(camera.y);
    expect(OFFICER.y).toBeLessThanOrEqual(camera.y + 180);
    expect(Math.hypot(WAKE.x - OFFICER.x, WAKE.y - OFFICER.y)).toBeGreaterThan(TALK_DISTANCE);
  });

  it('has no route passing within reach of her', () => {
    for (const route of routesOf(floor.points)) {
      route.points.forEach((from, i) => {
        const to = route.points[(i + 1) % route.points.length] ?? from;
        // The legs are horizontal or vertical: the nearest point of a leg is a clamp.
        const x = Math.min(Math.max(OFFICER.x, Math.min(from.x, to.x)), Math.max(from.x, to.x));
        const y = Math.min(Math.max(OFFICER.y, Math.min(from.y, to.y)), Math.max(from.y, to.y));
        expect(
          Math.hypot(x - OFFICER.x, y - OFFICER.y),
          `${route.name} leg ${i + 1}`,
        ).toBeGreaterThan(TALK_DISTANCE);
      });
    }
  });
});

describe('the colleagues of the floor and their lines (0018)', () => {
  const routes = routesOf(floor.points);
  const start = createInitialState(floor);
  /** The speakers of the floor with the colleague of `route` put on its point `n`, from 1. */
  const speakersWith = (route: string, n: number) => {
    const index = routes.findIndex((candidate) => candidate.name === route);
    const at = routes[index]?.points[n - 1] ?? { x: -1, y: -1 };
    const movers = start.movers.map((mover) =>
      mover.route === index ? { ...mover, x: at.x, y: at.y } : mover,
    );
    return { at, speakers: speakersOf(figuresOf(floor.points), movers, routes) };
  };

  it('gives every person route its lines, and has no lines for a route the floor lacks', () => {
    const persons = routes.filter((route) => route.kind === 'person').map((route) => route.name);
    expect(persons).toStrictEqual(COLLEAGUES.map((colleague) => colleague.route));
    for (const name of persons) {
      expect(pagesOfRoute(name), name).toHaveLength(1);
    }
  });

  it('has five speakers: the officer, then the four colleagues in the order of the movers', () => {
    const speakers = speakersOf(figuresOf(floor.points), start.movers, routes);
    expect(speakers.map((speaker) => [speaker.speaker, speaker.index])).toStrictEqual([
      ['figure', 0],
      ['mover', 0],
      ['mover', 1],
      ['mover', 2],
      ['mover', 3],
    ]);
  });

  it('reaches the colleague of the reception across the counter', () => {
    const { at, speakers } = speakersWith('person:reception', 1);
    expect(at).toMatchObject({ x: 200, y: 648 });
    expect(reached({ x: 200, y: 680 })).toBe(true);
    expect(blocked(boxAt({ x: 200, y: 664 }))).toBe(true);
    expect(speakerInReach({ x: 200, y: 680 }, speakers, floor)).toMatchObject({
      speaker: 'mover',
      index: 0,
    });
    // 40 px is enough for the 32 px across the counter, a tile to either side.
    expect(speakerInReach({ x: 176, y: 680 }, speakers, floor)?.index).toBe(0);
    expect(speakerInReach({ x: 224, y: 680 }, speakers, floor)?.index).toBe(0);
  });

  it('does not reach the colleague of Sales at the coffee from the north corridor', () => {
    const { at, speakers } = speakersWith('person:sales', 3);
    expect(at).toMatchObject({ x: 1672, y: 440 });
    expect(reached({ x: 1672, y: 416 })).toBe(true);
    expect(Math.hypot(0, 440 - 416)).toBeLessThan(TALK_DISTANCE);
    expect(speakerInReach({ x: 1672, y: 416 }, speakers, floor)).toBeNull();
    // From inside the room, as far below the colleague, it is reached.
    expect(reached({ x: 1672, y: 464 })).toBe(true);
    expect(speakerInReach({ x: 1672, y: 464 }, speakers, floor)).toMatchObject({
      speaker: 'mover',
      index: 3,
    });
  });
});

describe('the traces of the floor (0022)', () => {
  /** Region, cell and box, in file order: the spec's table. */
  const TABLE: readonly (readonly [string, number, number, Box])[] = [
    ['sales', 83, 28, { x: 1328, y: 448, width: 16, height: 16 }],
    ['sales', 98, 28, { x: 1568, y: 448, width: 16, height: 16 }],
    ['sales', 93, 34, { x: 1488, y: 544, width: 16, height: 16 }],
    ['sales', 88, 40, { x: 1408, y: 640, width: 16, height: 16 }],
    ['sales', 98, 46, { x: 1568, y: 736, width: 16, height: 16 }],
  ];
  const traces = tracesOf(floor.rects);

  it('are five, all of Sales, on the cells of the spec', () => {
    expect(traces).toStrictEqual(TABLE.map(([region, , , box]) => ({ region, box })));
    expect(TRACES.map((trace) => [trace.region, trace.cell.x, trace.cell.y])).toStrictEqual(
      TABLE.map(([region, column, row]) => [region, column, row]),
    );
    expect(TRACES.map((trace) => traceBox(trace.cell))).toStrictEqual(
      TABLE.map(([, , , box]) => box),
    );
  });

  it('are the last five objects of the file, rectangles with the ids 101 to 105', () => {
    const objects = floorJson().layers[3].objects;
    expect(objects).toHaveLength(105);
    expect(objects.slice(100).map((object) => [object.id, object.name])).toStrictEqual(
      [101, 102, 103, 104, 105].map((id) => [id, 'trace:sales']),
    );
    expect(objects.slice(100).some((object) => 'point' in object)).toBe(false);
    expect(floorJson().nextobjectid).toBe(106);
    expect(floor.rects).toHaveLength(13);
    expect(floor.points).toHaveLength(91);
  });

  it('lie in Sales, each on a desk with a screen whose chair stands on the cell below', () => {
    const sales = ROOMS.find((room) => room.name === 'sales');
    for (const [, column, row] of TABLE) {
      expect(sales !== undefined && column >= sales.cells.c0 && column <= sales.cells.c1).toBe(
        true,
      );
      expect(sales !== undefined && row >= sales.cells.r0 && row <= sales.cells.r1).toBe(true);
      expect(floor.detail[cell(column, row)], `(${column}, ${row})`).toBe(DESK_MONITOR_PARTITION);
      expect(floor.detail[cell(column, row + 1)], `(${column}, ${row + 1})`).toBe(CHAIR);
      expect(floor.detail[cell(column, row + 2)], `(${column}, ${row + 2})`).toBe(EMPTY);
    }
  });

  it('are in the light of a player who looks up from any place on the cell below the chair', () => {
    for (const [, column, row] of TABLE) {
      const trace = traces.find(
        (candidate) => candidate.box.x === column * 16 && candidate.box.y === row * 16,
      );
      let places = 0;
      for (let x = column * 16; x <= column * 16 + 16; x += 2) {
        for (let y = (row + 2) * 16 + 2; y <= (row + 3) * 16; y += 2) {
          if (!reached({ x, y })) {
            continue;
          }
          places += 1;
          const player = {
            x,
            y,
            facing: 'up',
            frame: 0,
            frameTimer: 0,
            grace: 0,
            recoil: NO_RECOIL,
          } as const;
          expect(
            trace !== undefined && traceInLight(trace, player, true, floor),
            `(${column}, ${row}) from (${x}, ${y})`,
          ).toBe(true);
        }
      }
      expect(places, `(${column}, ${row})`).toBe(54);
    }
  });

  it('leave eleven of the sixteen screens of Sales without a trace, and no row without one', () => {
    const screens: [number, number][] = [];
    for (let row = 26; row <= 51; row += 1) {
      for (let column = 79; column <= 106; column += 1) {
        if (floor.detail[cell(column, row)] === DESK_MONITOR_PARTITION) {
          screens.push([column, row]);
        }
      }
    }
    expect(screens).toHaveLength(16);
    const rows = [...new Set(screens.map(([, row]) => row))];
    expect(rows).toStrictEqual([28, 34, 40, 46]);
    for (const row of rows) {
      expect(
        TABLE.some(([, , traceRow]) => traceRow === row),
        `row ${row}`,
      ).toBe(true);
    }
  });

  it('have a name for their region, and start unseen in the state', () => {
    for (const { region } of traces) {
      expect(REGION_NAME[region], region).toBeDefined();
    }
    expect(createInitialState(floor).traces).toHaveLength(5);
  });
});
