import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/engine/camera';
import { moveBox } from '../../src/engine/collision';
import { type Box, EMPTY, type Point, parseTileMap, parseTileset } from '../../src/engine/tiled';
import { CASES, isReady, progressOf } from '../../src/game/cases';
import { COLLEAGUES, figuresOf, pagesOfRoute } from '../../src/game/cast';
import { isWatched, MIRAGE_NOTICE_RADIUS } from '../../src/game/creature';
import { HINT_FIGURE, HINTS } from '../../src/game/hints';
import { REGION_NAME } from '../../src/game/journal';
import { checkRoutes, isRoutePoint, routesOf } from '../../src/game/mover';
import { NOTICE_SHADOW_TOO_DENSE, noticeOf } from '../../src/game/notice';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import { areasOf, inArea, shadowedAreas, veilOf } from '../../src/game/region';
import { restInReach, restsOf, restUnderShadow } from '../../src/game/rest';
import { standingWalls, wallsOf, withWalls } from '../../src/game/shadow';
import { type GameState, NO_RECOIL } from '../../src/game/state';
import { CLOSE_SCENE } from '../../src/game/story';
import { speakerInReach, speakersOf, TALK_DISTANCE } from '../../src/game/talk';
import { traceInLight, tracesOf } from '../../src/game/trace';
import { createInitialState, update } from '../../src/game/update';
import {
  areaBox,
  type CellRect,
  CLOSED_DOORS,
  CORRIDORS,
  FIGURES,
  FIRST_FIGURES,
  FIRST_TRACES,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  FURNITURE,
  floorJson,
  HORIZONTAL_WALLS,
  MIRAGES,
  POSTS,
  REGION_AREAS,
  RESTS,
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
      Array.from({ length: 132 }, (_, i) => i + 1),
    );
    expect(json.nextobjectid).toBe(133);
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
    expect(floor.points).toHaveLength(95);
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
    // The first of the figures; the intern of 0033 follows her.
    expect(FIGURES[0]).toStrictEqual({ id: 'officer', at: OFFICER });
    // The 91st point; the mirages of 0032 follow it.
    expect(floor.points[90]).toStrictEqual({ name: 'figure:officer', ...OFFICER });
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

  it('gives the floor the officer as its first figure, with her three pages', () => {
    // The intern of 0033 is the second.
    expect(
      figures.slice(0, 1).map((figure) => [figure.id, figure.x, figure.y, figure.pages.length]),
    ).toStrictEqual([['officer', 264, 472, 3]]);
    expect(createInitialState(floor).figures[0]).toStrictEqual({ figure: 0, facing: 'down' });
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

  it('has six speakers: the two standing figures, then the four colleagues in the order of the movers', () => {
    const speakers = speakersOf(figuresOf(floor.points), start.movers, routes);
    expect(speakers.map((speaker) => [speaker.speaker, speaker.index])).toStrictEqual([
      ['figure', 0],
      // The intern (0033).
      ['figure', 1],
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

  it('are five, all of Sales, on the cells of the spec: the first five of the floor', () => {
    // The five of Marketing follow them (0028).
    expect(traces.slice(0, 5)).toStrictEqual(TABLE.map(([region, , , box]) => ({ region, box })));
    expect(
      TRACES.slice(0, 5).map((trace) => [trace.region, trace.cell.x, trace.cell.y]),
    ).toStrictEqual(TABLE.map(([region, column, row]) => [region, column, row]));
    expect(TRACES.slice(0, 5).map((trace) => traceBox(trace.cell))).toStrictEqual(
      TABLE.map(([, , , box]) => box),
    );
  });

  it('are five rectangles with the ids 101 to 105, after the objects of 0017', () => {
    // The areas of 0023 follow them.
    const objects = floorJson().layers[3].objects.slice(100, 105);
    expect(objects.map((object) => [object.id, object.name])).toStrictEqual(
      [101, 102, 103, 104, 105].map((id) => [id, 'trace:sales']),
    );
    expect(objects.some((object) => 'point' in object)).toBe(false);
    expect(floor.rects.slice(8, 13).every((rect) => rect.name === 'trace:sales')).toBe(true);
    expect(floor.points).toHaveLength(95);
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
    // Five of Sales and, since 0028, five of Marketing.
    expect(createInitialState(floor).traces).toHaveLength(10);
  });
});

describe('the areas of the regions on the floor (0023)', () => {
  /** Region, the room's cells and its box, in file order: the spec's table. */
  const TABLE: readonly (readonly [string, CellRect, Box, number])[] = [
    ['hr', { c0: 1, c1: 21, r0: 1, r1: 19 }, { x: 16, y: 16, width: 336, height: 304 }, 2],
    [
      'accounting',
      { c0: 22, c1: 43, r0: 1, r1: 19 },
      { x: 352, y: 16, width: 352, height: 304 },
      2,
    ],
    [
      'development',
      { c0: 44, c1: 84, r0: 1, r1: 19 },
      { x: 704, y: 16, width: 656, height: 304 },
      3,
    ],
    [
      'meeting-rooms',
      { c0: 89, c1: 106, r0: 1, r1: 9 },
      { x: 1424, y: 16, width: 288, height: 144 },
      1,
    ],
    [
      'meeting-rooms',
      { c0: 89, c1: 106, r0: 10, r1: 19 },
      { x: 1424, y: 160, width: 288, height: 160 },
      1,
    ],
    ['reception', { c0: 1, c1: 22, r0: 38, r1: 51 }, { x: 16, y: 608, width: 352, height: 224 }, 0],
    [
      'break-room',
      { c0: 29, c1: 48, r0: 26, r1: 51 },
      { x: 464, y: 416, width: 320, height: 416 },
      0,
    ],
    ['sales', { c0: 79, c1: 106, r0: 26, r1: 51 }, { x: 1264, y: 416, width: 448, height: 416 }, 1],
    ['marketing', { c0: 1, c1: 48, r0: 58, r1: 78 }, { x: 16, y: 928, width: 768, height: 336 }, 1],
    [
      'support',
      { c0: 49, c1: 106, r0: 58, r1: 78 },
      { x: 784, y: 928, width: 928, height: 336 },
      1,
    ],
  ];
  const areas = areasOf(floor.rects);

  it('are the ten of the spec, each with its region, its box and its density', () => {
    expect(areas).toStrictEqual(
      TABLE.map(([region, , box, density]) => ({ region, density, box })),
    );
    expect(REGION_AREAS).toStrictEqual(TABLE.map(([region, cells]) => ({ region, cells })));
    expect(REGION_AREAS.map((area) => areaBox(area.cells))).toStrictEqual(
      TABLE.map(([, , box]) => box),
    );
  });

  it('are ten rectangles with the ids 106 to 115, after the traces and before the rests of 0027', () => {
    const objects = floorJson().layers[3].objects;
    expect(objects.slice(105, 115).map((object) => [object.id, object.name])).toStrictEqual(
      TABLE.map(([region], i) => [106 + i, `region:${region}`]),
    );
    expect(objects.slice(105, 115).some((object) => 'point' in object)).toBe(false);
    expect(areasOf(floor.rects)).toHaveLength(10);
  });

  it('leave the walls and the traces as they were', () => {
    expect(wallsOf(floor.rects)).toHaveLength(8);
    // The five of 0022; the five of 0028 came later.
    expect(tracesOf(floor.rects)).toHaveLength(10);
    expect(floor.points).toHaveLength(95);
  });

  it('give every room of a region its area, with exactly the cells of the room', () => {
    const rooms = ROOMS.filter(
      (room) => !['lift', 'stairwell', "data protection officer's office"].includes(room.name),
    );
    expect(rooms.map((room) => room.cells)).toStrictEqual(TABLE.map(([, cells]) => cells));
    expect(REGION_AREAS).toHaveLength(ROOMS.length - 3);
  });

  it('put the right veil on the cells of the spec', () => {
    const veil = (column: number, row: number): number => veilOf(areas, column, row);
    expect([veil(90, 30), veil(10, 70), veil(100, 70), veil(95, 5)]).toStrictEqual([1, 1, 1, 1]);
    expect([veil(5, 5), veil(30, 10)]).toStrictEqual([2, 2]);
    expect(veil(60, 10)).toBe(3);
    // The reception, the break room, the west corridor, the officer's office and the lift.
    expect([veil(10, 45), veil(40, 40), veil(25, 30), veil(10, 30), veil(55, 40)]).toStrictEqual([
      0, 0, 0, 0, 0,
    ]);
  });

  it('leave every cell of the corridors, the lift, the stairwell and the office without a veil', () => {
    const open = [
      ...CORRIDORS,
      ...ROOMS.filter((room) =>
        ['lift', 'stairwell', "data protection officer's office"].includes(room.name),
      ),
    ];
    for (const { name, cells } of open) {
      for (let row = cells.r0; row <= cells.r1; row += 1) {
        for (let column = cells.c0; column <= cells.c1; column += 1) {
          expect(veilOf(areas, column, row), `${name} (${column}, ${row})`).toBe(0);
        }
      }
    }
  });

  it('put a veil on every cell of a shadowed room, its upper and its left wall included', () => {
    for (const [region, cells, , density] of TABLE) {
      expect(veilOf(areas, cells.c0, cells.r0), region).toBe(density);
      expect(veilOf(areas, cells.c1, cells.r1), region).toBe(density);
    }
    // The wall below Sales lies on the cells of the south corridor: no veil.
    expect(veilOf(areas, 90, 52)).toBe(0);
  });
});

describe('the case of Sales on the floor (0024)', () => {
  it('has a source that walks the floor and has lines, and a region with traces', () => {
    const routes = routesOf(floor.points).map((route) => route.name);
    const traces = tracesOf(floor.rects);
    for (const { region, source } of CASES) {
      expect(routes, source).toContain(source);
      expect(pagesOfRoute(source), source).not.toHaveLength(0);
      expect(
        traces.some((trace) => trace.region === region),
        region,
      ).toBe(true);
      expect(REGION_NAME[region], region).toBeDefined();
    }
  });

  it('is not ready at the start, nor with four of its five traces found, and ready with five', () => {
    const start = createInitialState(floor);
    expect(isReady('sales', progressOf(start, floor))).toBe(false);
    const four = { ...start, traces: start.traces.map((t, i) => (i < 4 ? { ...t, found: 1 } : t)) };
    expect(isReady('sales', progressOf(four, floor))).toBe(false);
    const five = { ...start, traces: start.traces.map((t) => ({ ...t, found: 1 })) };
    expect(isReady('sales', progressOf(five, floor))).toBe(true);
  });
});

describe('the cleared region on the floor (0025)', () => {
  const TALK: GameInput = { ...NO_INPUT, talk: true };
  const areas = areasOf(floor.rects);
  const walls = wallsOf(floor.rects);
  const start = createInitialState(floor);
  const source = start.movers.find(
    (mover) => routesOf(floor.points)[mover.route]?.name === 'person:sales',
  );
  /** Every trace found long ago, the figure 24 px below the colleague of Sales. */
  const ready: GameState = {
    ...start,
    tick: 1000,
    player: { ...start.player, x: source?.x ?? 0, y: (source?.y ?? 0) + 24 },
    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
  };
  const solve = (from: GameState): GameState =>
    [TALK, NO_INPUT, TALK, NO_INPUT, TALK].reduce(
      (state, input) => update(state, input, floor),
      from,
    );
  const regionsOf = (state: GameState): (string | undefined)[] =>
    state.shadowWalls.map((standing) => walls[standing.wall]?.region);

  it('has two of the three snippets at home in the area of Sales, and one in the east corridor', () => {
    const sales = areas.filter((area) => area.region === 'sales');
    expect(sales).toHaveLength(1);
    expect(SNIPPETS.map((home) => sales.some((area) => inArea(area, home)))).toStrictEqual([
      false,
      true,
      true,
    ]);
    // The corridor is no region: the first snippet's home lies in no area at all.
    expect(areas.some((area) => inArea(area, SNIPPETS[0] as Point))).toBe(false);
  });

  it('solves the case of Sales from beside its source', () => {
    expect(solve(ready).solved).toStrictEqual([{ region: 'sales', at: 1005 }]);
  });

  it('leaves one snippet when nothing was captured: the one whose home is (1224, 622)', () => {
    const solved = solve(ready);
    // The mirages of Marketing (0032) are at home in another region and stay.
    expect(solved.creatures.map((creature) => creature.home)).toStrictEqual([
      { x: 1224, y: 622 },
      ...MIRAGES,
    ]);
    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
  });

  it('removes none when both snippets of Sales were captured before', () => {
    const corridor = start.creatures.slice(0, 1);
    const solved = solve({ ...ready, creatures: corridor, captured: { snippet: 2, mirage: 0 } });
    expect(solved.creatures).toStrictEqual(corridor);
    expect(solved.captured).toStrictEqual({ snippet: 2, mirage: 0 });
  });

  it('removes the shadow wall of Sales if it still stands, and no other', () => {
    expect(regionsOf(ready).filter((region) => region === 'sales')).toHaveLength(1);
    const solved = solve(ready);
    expect(regionsOf(solved)).not.toContain('sales');
    expect(solved.shadowWalls).toHaveLength(ready.shadowWalls.length - 1);
    const lifted = ready.shadowWalls.filter((standing) => walls[standing.wall]?.region !== 'sales');
    expect(solve({ ...ready, shadowWalls: lifted }).shadowWalls).toStrictEqual(lifted);
  });

  it('takes the shadow from the cells of Sales and leaves it on every other region', () => {
    const cleared = shadowedAreas(areas, solve(ready).solved);
    const veil = (column: number, row: number): number => veilOf(cleared, column, row);
    expect(veilOf(areas, 90, 30)).toBe(1);
    expect(veil(90, 30)).toBe(0);
    expect([veil(10, 70), veil(100, 70), veil(95, 5)]).toStrictEqual([1, 1, 1]);
    expect([veil(5, 5), veil(30, 10), veil(60, 10)]).toStrictEqual([2, 2, 3]);
  });
});

describe('the rests of the floor (0027)', () => {
  /** Cell, room and the veil of the cell at the start: the spec's table. */
  const TABLE: readonly (readonly [number, number, string, number])[] = [
    [104, 8, 'meeting room north', 1],
    [27, 19, 'accounting', 2],
    [52, 19, 'development', 3],
    [35, 26, 'break room', 0],
    [42, 26, 'break room', 0],
    [104, 26, 'sales', 1],
    [12, 78, 'marketing', 1],
    [52, 78, 'support', 1],
  ];
  const rests = restsOf(floor.rects);
  const areas = areasOf(floor.rects);
  const reached = (x: number, y: number) => restInReach({ x, y }, rests, floor);

  it('are the eight of the table, in the layout and in the file', () => {
    expect(RESTS).toStrictEqual(TABLE.map(([x, y]) => ({ what: 'coffee', cell: { x, y } })));
    expect(rests).toStrictEqual(
      TABLE.map(([x, y]) => ({
        what: 'coffee',
        box: { x: 16 * x, y: 16 * y, width: 16, height: 16 },
      })),
    );
  });

  it('are eight rectangles with the ids 116 to 123, after the areas and before the traces of 0028', () => {
    const objects = floorJson().layers[3].objects;
    expect(objects.slice(115, 123).map((object) => [object.id, object.name])).toStrictEqual(
      TABLE.map((_row, i) => [116 + i, 'rest:coffee']),
    );
    expect(objects.slice(115, 123).some((object) => 'point' in object)).toBe(false);
    expect(floor.rects.slice(23, 31).every((rect) => rect.name === 'rest:coffee')).toBe(true);
  });

  it('leave the objects of 0023 and before as they were', () => {
    expect(wallsOf(floor.rects)).toHaveLength(8);
    // The five of 0022; the five of 0028 came later.
    expect(tracesOf(floor.rects)).toHaveLength(10);
    expect(areas).toHaveLength(10);
    expect(floor.points).toHaveLength(95);
  });

  it('lie each on a counter with a coffee machine, and the floor has no such tile without one', () => {
    const machines: string[] = [];
    floor.detail.forEach((id, at) => {
      if (id === COUNTER_COFFEE) {
        machines.push(`${at % 108},${Math.floor(at / 108)}`);
      }
    });
    expect(machines.sort()).toStrictEqual(TABLE.map(([x, y]) => `${x},${y}`).sort());
  });

  it('lie each in its room', () => {
    for (const [x, y, name] of TABLE) {
      const room = ROOMS.find((candidate) => candidate.name === name);
      expect(room, name).toBeDefined();
      const { c0, c1, r0, r1 } = room?.cells ?? { c0: 0, c1: 0, r0: 0, r1: 0 };
      expect(x >= c0 && x <= c1 && y >= r0 && y <= r1, `(${x}, ${y}) in ${name}`).toBe(true);
    }
  });

  it('have the veil of the table: only the two of the break room are not under shadow at the start', () => {
    expect(TABLE.map(([x, y]) => veilOf(areas, x, y))).toStrictEqual(
      TABLE.map(([, , , veil]) => veil),
    );
    expect(rests.map((rest) => restUnderShadow(rest, floor.rects, []))).toStrictEqual([
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
    ]);
  });

  it('are in reach from inside their room and not from the corridor behind the wall', () => {
    // The machine of Sales, cell (104, 26): from below it, and from the north corridor.
    expect(reached(1672, 440)).toStrictEqual(rests[5]);
    expect(reached(1672, 416)).toBeNull();
    // The left machine of the break room, cell (35, 26).
    expect(reached(568, 440)).toStrictEqual(rests[3]);
    expect(reached(568, 416)).toBeNull();
  });

  it('give the machine of Sales its use once Sales is solved', () => {
    const sales = rests[5];
    expect(sales).toBeDefined();
    if (sales !== undefined) {
      expect(restUnderShadow(sales, floor.rects, [])).toBe(true);
      expect(restUnderShadow(sales, floor.rects, [{ region: 'sales', at: 1005 }])).toBe(false);
    }
  });
});

describe('the traces of Marketing on the floor (0028)', () => {
  /** Cell, box and the tile of the device, in file order: the spec's table. */
  const TABLE: readonly (readonly [number, number, Box, number])[] = [
    [6, 62, { x: 96, y: 992, width: 16, height: 16 }, DESK_MONITOR],
    [15, 62, { x: 240, y: 992, width: 16, height: 16 }, DESK_MONITOR],
    [41, 62, { x: 656, y: 992, width: 16, height: 16 }, DESK_MONITOR],
    [5, 70, { x: 80, y: 1120, width: 16, height: 16 }, DESK_MONITOR],
    [27, 78, { x: 432, y: 1248, width: 16, height: 16 }, PRINTER],
  ];
  const traces = tracesOf(floor.rects);
  const start = createInitialState(floor);
  /** The state with the traces of the given indices found. */
  const found = (...indices: readonly number[]): GameState => ({
    ...start,
    traces: start.traces.map((trace, i) => (indices.includes(i) ? { ...trace, found: 1 } : trace)),
  });

  it('are five, on the cells of the spec, after the five of Sales', () => {
    expect(FIRST_TRACES).toBe(5);
    expect(traces).toHaveLength(10);
    expect(traces.slice(0, 5).every((trace) => trace.region === 'sales')).toBe(true);
    expect(traces.slice(5)).toStrictEqual(TABLE.map(([, , box]) => ({ region: 'marketing', box })));
    expect(TRACES.slice(5)).toStrictEqual(
      TABLE.map(([x, y]) => ({ region: 'marketing', cell: { x, y } })),
    );
  });

  it('are five rectangles with the ids 124 to 128, after the rests and before the mirages of 0032', () => {
    const objects = floorJson().layers[3].objects;
    expect(objects.slice(123, 128).map((object) => [object.id, object.name])).toStrictEqual(
      [124, 125, 126, 127, 128].map((id) => [id, 'trace:marketing']),
    );
    expect(objects.slice(123, 128).some((object) => 'point' in object)).toBe(false);
    expect(floor.rects).toHaveLength(36);
  });

  it('leave the 123 objects of 0027 and before exactly as they were', () => {
    // SHA-256 over the first 123 objects, recorded from the generator before this feature.
    const before = JSON.stringify(floorJson().layers[3].objects.slice(0, 123));
    expect(createHash('sha256').update(before).digest('hex')).toBe(
      '958d049dff30dc32799e5239794ad7c18aabafe0f9f81d984eb503b392a14cbb',
    );
  });

  it('lie in the area of Marketing, four on a desk with a screen and one on the printer', () => {
    const marketing = areasOf(floor.rects).filter((area) => area.region === 'marketing');
    expect(marketing).toHaveLength(1);
    const mine = traces.filter((trace) => trace.region === 'marketing');
    expect(mine).toHaveLength(5);
    for (const [i, { box }] of mine.entries()) {
      const column = box.x / 16;
      const row = box.y / 16;
      expect(
        marketing.some((area) => inArea(area, { x: box.x, y: box.y })),
        `(${column}, ${row})`,
      ).toBe(true);
      expect(floor.detail[cell(column, row)], `(${column}, ${row})`).toBe(TABLE[i]?.[3]);
      // The cell above the device is free: the player stands there.
      expect(floor.detail[cell(column, row - 1)], `(${column}, ${row - 1})`).toBe(EMPTY);
    }
  });

  it('are in the light of a player who looks down from any place on the cell above', () => {
    for (const [column, row] of TABLE) {
      const trace = traces.find(
        (candidate) => candidate.box.x === column * 16 && candidate.box.y === row * 16,
      );
      let places = 0;
      for (let x = column * 16; x <= column * 16 + 16; x += 2) {
        for (let y = (row - 1) * 16 + 2; y <= row * 16; y += 2) {
          if (!reached({ x, y })) {
            continue;
          }
          places += 1;
          const player = {
            x,
            y,
            facing: 'down',
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
      expect(places, `(${column}, ${row})`).toBe(72);
    }
  });

  it('leave twelve of the sixteen screens of Marketing without a trace, and it has one printer', () => {
    const room = ROOMS.find((candidate) => candidate.name === 'marketing');
    const { c0, c1, r0, r1 } = room?.cells ?? { c0: 0, c1: -1, r0: 0, r1: -1 };
    const count = (tile: number): number => {
      let cells = 0;
      for (let row = r0; row <= r1; row += 1) {
        for (let column = c0; column <= c1; column += 1) {
          cells += floor.detail[cell(column, row)] === tile ? 1 : 0;
        }
      }
      return cells;
    };
    expect(count(DESK_MONITOR)).toBe(16);
    expect(count(PRINTER)).toBe(1);
  });

  it('start unseen in the state: ten traces, none found, Sales 0 to 4 and Marketing 5 to 9', () => {
    expect(start.traces).toStrictEqual(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({ trace, light: 0, found: null })),
    );
    expect(start.traces.map((state) => traces[state.trace]?.region)).toStrictEqual([
      ...Array.from({ length: 5 }, () => 'sales'),
      ...Array.from({ length: 5 }, () => 'marketing'),
    ]);
    expect(REGION_NAME.marketing).toBeDefined();
  });

  it('make Marketing ready exactly when its five are found, whatever is found in Sales', () => {
    const ready = (state: GameState): boolean[] => [
      isReady('sales', progressOf(state, floor)),
      isReady('marketing', progressOf(state, floor)),
    ];
    expect(ready(start)).toStrictEqual([false, false]);
    // Five: those of Sales, or those of Marketing.
    expect(ready(found(0, 1, 2, 3, 4))).toStrictEqual([true, false]);
    expect(ready(found(5, 6, 7, 8, 9))).toStrictEqual([false, true]);
    // Nine: all but one of Marketing, or all but one of Sales.
    expect(ready(found(0, 1, 2, 3, 4, 5, 6, 7, 8))).toStrictEqual([true, false]);
    expect(ready(found(1, 2, 3, 4, 5, 6, 7, 8, 9))).toStrictEqual([false, true]);
    // Ten.
    expect(ready(found(0, 1, 2, 3, 4, 5, 6, 7, 8, 9))).toStrictEqual([true, true]);
  });
});

describe('the case of Marketing on the floor (0028)', () => {
  const TALK: GameInput = { ...NO_INPUT, talk: true };
  const areas = areasOf(floor.rects);
  const walls = wallsOf(floor.rects);
  const routes = routesOf(floor.points);
  const start = createInitialState(floor);
  const sourceOf = (route: string) =>
    start.movers.find((mover) => routes[mover.route]?.name === route);
  /** The figure 24 px below the colleague of the given route, where it stands at the start. */
  const beside = (state: GameState, route: string): GameState => ({
    ...state,
    player: {
      ...state.player,
      x: sourceOf(route)?.x ?? 0,
      y: (sourceOf(route)?.y ?? 0) + 24,
    },
  });
  /** Every trace of the floor found long ago. */
  const ready: GameState = {
    ...start,
    tick: 1000,
    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
  };
  const answer = (from: GameState): GameState =>
    [TALK, NO_INPUT, TALK, NO_INPUT, TALK, NO_INPUT].reduce(
      (state, input) => update(state, input, floor),
      from,
    );
  const regionsOf = (state: GameState): (string | undefined)[] =>
    state.shadowWalls.map((standing) => walls[standing.wall]?.region);
  const marketing = answer(beside(ready, 'person:marketing'));

  it('has a source that stands free at the start, with room 24 px below it', () => {
    expect(sourceOf('person:marketing')).toBeDefined();
    expect(reached(beside(ready, 'person:marketing').player)).toBe(true);
  });

  it('is solved from beside its source, before Sales: six of six', () => {
    expect(marketing.solved).toStrictEqual([{ region: 'marketing', at: 1005 }]);
    expect(marketing.overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('takes the shadow from the cells of Marketing and leaves it on Sales', () => {
    const cleared = shadowedAreas(areas, marketing.solved);
    expect(veilOf(areas, 10, 70)).toBe(1);
    expect(veilOf(cleared, 10, 70)).toBe(0);
    expect(veilOf(cleared, 90, 30)).toBe(1);
    expect([veilOf(cleared, 100, 70), veilOf(cleared, 5, 5)]).toStrictEqual([1, 2]);
  });

  it('removes the shadow wall of Marketing and no other, and no snippet', () => {
    expect(regionsOf(ready).filter((region) => region === 'marketing')).toHaveLength(1);
    expect(regionsOf(marketing)).not.toContain('marketing');
    expect(regionsOf(marketing)).toContain('sales');
    expect(marketing.shadowWalls).toHaveLength(ready.shadowWalls.length - 1);
    // The mirages of 0032 are at home in Marketing and go with its shadow; the snippets stay.
    expect(marketing.creatures).toStrictEqual(
      ready.creatures.filter((creature) => creature.species === 'snippet'),
    );
  });

  it('is followed by Sales: both solved in that order, seven of seven, both rooms clear', () => {
    const both = answer(beside(marketing, 'person:sales'));
    expect(both.solved).toStrictEqual([
      { region: 'marketing', at: 1005 },
      { region: 'sales', at: 1011 },
    ]);
    expect(both.overview).toStrictEqual({ current: 7, max: 7 });
    const cleared = shadowedAreas(areas, both.solved);
    expect([veilOf(cleared, 10, 70), veilOf(cleared, 90, 30)]).toStrictEqual([0, 0]);
    expect(
      regionsOf(both).filter((region) => region === 'sales' || region === 'marketing'),
    ).toStrictEqual([]);
  });

  it('gives the machine of Marketing its use once Marketing is solved', () => {
    const machine = restsOf(floor.rects)[6];
    expect(machine).toBeDefined();
    if (machine !== undefined) {
      expect(restUnderShadow(machine, floor.rects, [])).toBe(true);
      expect(restUnderShadow(machine, floor.rects, marketing.solved)).toBe(false);
    }
  });
});

describe('the wider cone on the floor (0029)', () => {
  const TALK: GameInput = { ...NO_INPUT, talk: true };
  const SHINE: GameInput = { ...NO_INPUT, lamp: true };
  const walls = wallsOf(floor.rects);
  const routes = routesOf(floor.points);
  const start = createInitialState(floor);
  const sourceOf = (route: string) =>
    start.movers.find((mover) => routes[mover.route]?.name === route);
  /** Every trace found long ago, the figure 24 px below the colleague of the given route. */
  const beside = (route: string): GameState => ({
    ...start,
    tick: 1000,
    player: {
      ...start.player,
      x: sourceOf(route)?.x ?? 0,
      y: (sourceOf(route)?.y ?? 0) + 24,
    },
    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
  });
  const answer = (from: GameState): GameState =>
    [TALK, NO_INPUT, TALK, NO_INPUT, TALK, NO_INPUT].reduce(
      (state, input) => update(state, input, floor),
      from,
    );
  /** The state with the figure 20 px below the wall of a region in the top corridor, looking up. */
  const below = (state: GameState, region: string): GameState => {
    const box = walls.find((wall) => wall.region === region)?.box ?? { x: 0, y: 0, width: 0 };
    return {
      ...state,
      player: { ...state.player, x: box.x + box.width / 2, y: box.y + 24, facing: 'up' },
    };
  };
  const shine = (from: GameState, count: number): GameState => {
    let state = from;
    for (let step = 0; step < count; step += 1) {
      state = update(state, SHINE, floor);
    }
    return state;
  };
  const regionsOf = (state: GameState): (string | undefined)[] =>
    state.shadowWalls.map((standing) => walls[standing.wall]?.region);
  const marketing = answer(beside('person:marketing'));

  it('has room for the figure below the walls of HR, Accounting and Development', () => {
    for (const region of ['hr', 'accounting', 'development']) {
      expect(reached(below(start, region).player), region).toBe(true);
    }
  });

  it('is earned by the case of Marketing and not by the case of Sales', () => {
    expect(marketing.upgrades).toStrictEqual(['wide-cone']);
    expect(marketing.lamp.strength).toBe(2);
    const sales = answer(beside('person:sales'));
    expect(sales.upgrades).toStrictEqual([]);
    expect(sales.lamp.strength).toBe(1);
  });

  it('holds the walls of HR and Accounting before it, with the basic lamp', () => {
    for (const region of ['hr', 'accounting']) {
      const held = shine(below(start, region), 180);
      expect(regionsOf(held), region).toContain(region);
      expect(noticeOf(held), region).toBe(NOTICE_SHADOW_TOO_DENSE);
    }
  });

  it('lifts the walls of HR and Accounting after it, each in the 60th lit step', () => {
    for (const region of ['hr', 'accounting']) {
      const almost = shine(below(marketing, region), 59);
      expect(regionsOf(almost), region).toContain(region);
      expect(regionsOf(update(almost, SHINE, floor)), region).not.toContain(region);
    }
  });

  it('still holds the wall of Development, with the notice of 0016', () => {
    const held = shine(below(marketing, 'development'), 180);
    expect(regionsOf(held)).toContain('development');
    expect(noticeOf(held)).toBe(NOTICE_SHADOW_TOO_DENSE);
  });
});

describe('the mirages of the floor (0032)', () => {
  /** Cell and feet, in file order: the spec's table. */
  const TABLE: readonly (readonly [number, number, Point])[] = [
    [10, 67, { x: 168, y: 1080 }],
    [38, 65, { x: 616, y: 1048 }],
    [22, 75, { x: 360, y: 1208 }],
  ];
  const TALK: GameInput = { ...NO_INPUT, talk: true };
  const start = createInitialState(floor);
  const mirages = start.creatures.filter((creature) => creature.species === 'mirage');
  const marketing = areasOf(floor.rects).filter((area) => area.region === 'marketing');
  const standing = withWalls(floor, wallsOf(floor.rects), start.shadowWalls);

  it('are the three of the table, the middle of a cell each', () => {
    expect(MIRAGES).toStrictEqual(TABLE.map(([, , feet]) => feet));
    expect(TABLE.map(([column, row]) => ({ x: 16 * column + 8, y: 16 * row + 8 }))).toStrictEqual([
      ...MIRAGES,
    ]);
  });

  it('are three points with the ids 129 to 131, after the traces of 0028 and before the intern of 0033', () => {
    const objects = floorJson().layers[3].objects;
    expect(objects.slice(128, 131).map((object) => [object.id, object.name])).toStrictEqual(
      [129, 130, 131].map((id) => [id, 'mirage']),
    );
    expect(objects.slice(128, 131).every((object) => 'point' in object)).toBe(true);
    expect(floor.points.slice(91, 94)).toStrictEqual(
      TABLE.map(([, , feet]) => ({ name: 'mirage', ...feet })),
    );
  });

  it('leave the 128 objects of 0028 and before exactly as they were', () => {
    // SHA-256 over the first 128 objects, recorded from the generator before this feature.
    const before = JSON.stringify(floorJson().layers[3].objects.slice(0, 128));
    expect(createHash('sha256').update(before).digest('hex')).toBe(
      '785fe89a847f7c06716adefdbcd3420bcf0c2277c8a8cc806268b33433679c0e',
    );
  });

  it('give the floor six creatures: the three snippets, then the three mirages', () => {
    expect(start.creatures.map((creature) => creature.species)).toStrictEqual([
      'snippet',
      'snippet',
      'snippet',
      'mirage',
      'mirage',
      'mirage',
    ]);
    expect(mirages.map((creature) => creature.home)).toStrictEqual([...MIRAGES]);
    expect(start.captured).toStrictEqual({ snippet: 0, mirage: 0 });
  });

  it('stand each on a free cell of Marketing that is reached on foot, at home in its area', () => {
    expect(marketing).toHaveLength(1);
    expect(mirages).toHaveLength(3);
    for (const { home } of mirages) {
      const column = Math.floor(home.x / 16);
      const row = Math.floor(home.y / 16);
      expect(floor.detail[cell(column, row)], `(${column}, ${row})`).toBe(EMPTY);
      expect(floor.solids[cell(column, row)], `(${column}, ${row})`).toStrictEqual([]);
      expect(blocked(boxAt(home)), `(${column}, ${row})`).toBe(false);
      expect(reached(home), `(${column}, ${row})`).toBe(true);
      expect(
        marketing.some((area) => inArea(area, home)),
        `(${column}, ${row})`,
      ).toBe(true);
    }
  });

  it('are at least 96 px from every cell of the doorway of Marketing', () => {
    // The doorway cells (23, 58) to (25, 58): the pixels [368, 416) × [928, 944).
    expect(mirages).toHaveLength(3);
    for (const { home } of mirages) {
      const dx = Math.max(368 - home.x, 0, home.x - 416);
      const dy = Math.max(928 - home.y, 0, home.y - 944);
      expect(Math.hypot(dx, dy), `(${home.x}, ${home.y})`).toBeGreaterThanOrEqual(
        MIRAGE_NOTICE_RADIUS,
      );
    }
  });

  it('rest while the figure stands in the doorway, whichever way it looks', () => {
    for (const facing of ['down', 'up', 'left', 'right'] as const) {
      const entered: GameState = {
        ...start,
        player: { ...start.player, x: 392, y: 956, facing },
      };
      const next = update(entered, NO_INPUT, floor);
      expect(next.creatures.slice(3), facing).toHaveLength(3);
      expect(next.creatures.slice(3), facing).toStrictEqual(mirages);
    }
  });

  it('come from behind while the figure looks at a screen of the lower row or at the printer', () => {
    // Above the left screen of the first island of the lower row, and above the printer.
    for (const [x, y] of [
      [88, 1116],
      [440, 1244],
    ] as const) {
      const player = { ...start.player, x, y, facing: 'down' } as const;
      const near = mirages.filter(
        (creature) => Math.hypot(creature.x - x, creature.y - y) < MIRAGE_NOTICE_RADIUS,
      );
      expect(near, `(${x}, ${y})`).toHaveLength(1);
      expect(near.map((creature) => isWatched(creature, player, standing))).toStrictEqual([false]);
      const next = update({ ...start, player }, NO_INPUT, floor);
      const moved = next.creatures.filter(
        (creature, n) =>
          creature.x !== start.creatures[n]?.x || creature.y !== start.creatures[n]?.y,
      );
      expect(moved.map((creature) => creature.home)).toStrictEqual(near.map((c) => c.home));
    }
  });

  it('go with the shadow of Marketing when its case is solved: none is captured, the snippets stay', () => {
    const routes = routesOf(floor.points);
    const source = start.movers.find((mover) => routes[mover.route]?.name === 'person:marketing');
    const ready: GameState = {
      ...start,
      tick: 1000,
      player: { ...start.player, x: source?.x ?? 0, y: (source?.y ?? 0) + 24 },
      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
    };
    const solved = [TALK, NO_INPUT, TALK, NO_INPUT, TALK].reduce(
      (state, input) => update(state, input, floor),
      ready,
    );
    expect(solved.solved).toStrictEqual([{ region: 'marketing', at: 1005 }]);
    expect(solved.creatures.map((creature) => creature.species)).toStrictEqual([
      'snippet',
      'snippet',
      'snippet',
    ]);
    expect(solved.captured).toStrictEqual({ snippet: 0, mirage: 0 });
  });
});

describe('the intern of the floor (0033)', () => {
  const INTERN = { x: 616, y: 488 };
  const TALK: GameInput = { ...NO_INPUT, talk: true };
  const figures = figuresOf(floor.points);
  const start = createInitialState(floor);
  const rests = restsOf(floor.rects);
  const breakRoom = ROOMS.find((room) => room.name === 'break room');

  it('is the second figure of the layout, and the only one written at the end of the file', () => {
    expect(FIGURES[1]).toStrictEqual({ id: 'intern', at: INTERN });
    expect(FIGURES).toHaveLength(2);
    expect(FIRST_FIGURES).toBe(1);
    expect(HINT_FIGURE).toBe('intern');
  });

  it('is the last object of the file, the point figure:intern with the id 132', () => {
    const objects = floorJson().layers[3].objects;
    expect(objects).toHaveLength(132);
    const his = objects[131];
    expect([his?.id, his?.name, his?.x, his?.y]).toStrictEqual([132, 'figure:intern', 616, 488]);
    expect(his !== undefined && 'point' in his).toBe(true);
    expect(floorJson().nextobjectid).toBe(133);
    expect(floor.points.at(-1)).toStrictEqual({ name: 'figure:intern', ...INTERN });
  });

  it('leaves the 131 objects of 0032 and before exactly as they were', () => {
    // SHA-256 over the first 131 objects, recorded from the generator before this feature.
    const before = JSON.stringify(floorJson().layers[3].objects.slice(0, 131));
    expect(createHash('sha256').update(before).digest('hex')).toBe(
      'db04c22504878d1281eac2cb8dd3e7c9e789f5ef8ac201420bead11da87d8e92',
    );
  });

  it('gives the floor two figures: the officer, then the intern with one page', () => {
    expect(
      figures.map((figure) => [figure.id, figure.x, figure.y, figure.pages.length]),
    ).toStrictEqual([
      ['officer', 264, 472, 3],
      ['intern', 616, 488, 1],
    ]);
    expect(start.figures).toStrictEqual([
      { figure: 0, facing: 'down' },
      { figure: 1, facing: 'down' },
    ]);
  });

  it('stands in the middle of tile (38, 30), in the break room, four tiles below the counter', () => {
    expect(figures[1]).toMatchObject(INTERN);
    expect([(INTERN.x - 8) / 16, (INTERN.y - 8) / 16]).toStrictEqual([38, 30]);
    const { c0, c1, r0, r1 } = breakRoom?.cells ?? { c0: 0, c1: -1, r0: 0, r1: -1 };
    expect(38 >= c0 && 38 <= c1 && 30 >= r0 && 30 <= r1).toBe(true);
    // The counter with the two coffee machines is row 26.
    expect(floor.detail[cell(35, 26)]).toBe(COUNTER_COFFEE);
    expect(floor.detail[cell(42, 26)]).toBe(COUNTER_COFFEE);
    expect(floor.detail[cell(38, 26)]).toBe(COUNTER);
  });

  it('is free of every solid box and reached on foot from the spawn', () => {
    expect(figures[1]).toMatchObject(INTERN);
    expect(floor.solids[cell(38, 30)]).toStrictEqual([]);
    expect(blocked(boxAt(INTERN))).toBe(false);
    expect(reached(INTERN)).toBe(true);
  });

  it('has no route passing within 24 px of him', () => {
    expect(figures[1]).toMatchObject(INTERN);
    for (const route of routesOf(floor.points)) {
      route.points.forEach((from, i) => {
        const to = route.points[(i + 1) % route.points.length] ?? from;
        const x = Math.min(Math.max(INTERN.x, Math.min(from.x, to.x)), Math.max(from.x, to.x));
        const y = Math.min(Math.max(INTERN.y, Math.min(from.y, to.y)), Math.max(from.y, to.y));
        expect(
          Math.hypot(x - INTERN.x, y - INTERN.y),
          `${route.name} leg ${i + 1}`,
        ).toBeGreaterThan(24);
      });
    }
  });

  it('is out of reach from every place where a coffee machine is in reach: the coffee stays a press', () => {
    const { c0, c1, r0, r1 } = breakRoom?.cells ?? { c0: 0, c1: -1, r0: 0, r1: -1 };
    const speakers = speakersOf(figures, [], []);
    expect(speakers.map((speaker) => [speaker.x, speaker.y])).toContainEqual([INTERN.x, INTERN.y]);
    let places = 0;
    for (let x = c0 * 16; x <= (c1 + 1) * 16; x += 2) {
      for (let y = r0 * 16; y <= (r1 + 1) * 16; y += 2) {
        if (!reached({ x, y }) || restInReach({ x, y }, rests, floor) === null) {
          continue;
        }
        places += 1;
        expect(speakerInReach({ x, y }, speakers, floor), `(${x}, ${y})`).toBeNull();
      }
    }
    expect(places).toBeGreaterThan(0);
  });

  it('takes a coffee at the machine and opens no talk there', () => {
    // Below the left machine of the break room, cell (35, 26).
    const there: GameState = {
      ...start,
      player: { ...start.player, x: 568, y: 440 },
      overview: { current: 2, max: 5 },
    };
    const drunk = update(there, TALK, floor);
    expect(drunk.dialogue).toBeNull();
    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
  });

  it('is spoken to from 24 px below him, and has one page', () => {
    const there: GameState = {
      ...start,
      player: { ...start.player, x: INTERN.x, y: INTERN.y + 24 },
    };
    expect(reached(there.player)).toBe(true);
    const opened = update(there, TALK, floor);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 1, page: 0 });
    expect(opened.figures[1]).toStrictEqual({ figure: 1, facing: 'down' });
    expect(opened.player.facing).toBe('up');
    const closed = update(update(opened, NO_INPUT, floor), TALK, floor);
    expect(closed.dialogue).toBeNull();
  });

  it('has hints for every case that has traces on the floor', () => {
    const regions = [...new Set(tracesOf(floor.rects).map((trace) => trace.region))];
    expect(regions).toStrictEqual(CASES.map((entry) => entry.region));
    for (const region of regions) {
      expect(HINTS[region], region).toBeDefined();
    }
  });
});

describe('the close on the floor (0034)', () => {
  const TALK: GameInput = { ...NO_INPUT, talk: true };
  const routes = routesOf(floor.points);
  const start = createInitialState(floor);
  /** The state with the figure 24 px below the colleague of the given route, where it is now. */
  const beside = (state: GameState, route: string): GameState => {
    const source = state.movers.find((mover) => routes[mover.route]?.name === route);
    return {
      ...state,
      player: { ...state.player, x: source?.x ?? 0, y: (source?.y ?? 0) + 24 },
    };
  };
  const answer = (from: GameState): GameState =>
    [TALK, NO_INPUT, TALK, NO_INPUT, TALK, NO_INPUT].reduce(
      (state, input) => update(state, input, floor),
      from,
    );
  /** Every trace found long ago. */
  const ready: GameState = {
    ...start,
    tick: 1000,
    traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
  };

  it('opens 300 steps after the second of the two cases of the floor, and not after the first', () => {
    let state = answer(beside(ready, 'person:sales'));
    expect(state.solved.map((entry) => entry.region)).toStrictEqual(['sales']);
    for (let step = 0; step < 400; step += 1) {
      state = update(state, NO_INPUT, floor);
    }
    expect(state.dialogue).toBeNull();
    state = answer(beside(state, 'person:marketing'));
    const last = state.solved[1];
    expect(last?.region).toBe('marketing');
    while (state.tick < (last?.at ?? 0) + 300) {
      state = update(state, NO_INPUT, floor);
      expect(state.dialogue).toBeNull();
    }
    state = update(state, NO_INPUT, floor);
    expect(state.dialogue).toStrictEqual({ speaker: 'story', index: CLOSE_SCENE, page: 0 });
    expect(state.finished).toBeNull();
  });
});
