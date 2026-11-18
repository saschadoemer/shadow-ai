import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTileMap, parseTileset, type TileMap } from '../../src/engine/tiled';
import { followPlayer } from '../../src/game/camera';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../../src/game/state';
import { createInitialState, update } from '../../src/game/update';
import { grassMap } from './grass-map';

/** The test map's size and spawn, in memory: 20x12 tiles, spawn at (136, 120). */
const MAP = grassMap(20, 12, { x: 136, y: 120 });

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** A map file and its tileset, read and parsed as the game does. */
function loadMap(mapFile: string, tilesetFile: string): TileMap {
  const read = (file: string): unknown => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  return parseTileMap(read(mapFile), parseTileset(read(tilesetFile), tilesetFile), mapFile);
}

/** One route of each kind on open floor (0015). */
const ROUTES_MAP = loadMap(
  'tests/fixtures/maps/routes.tmj',
  'tests/fixtures/maps/fixture-tiles.tsj',
);
/** Three walls on open floor (0014): marketing and hr horizontal, sales vertical. */
const WALLS_MAP = loadMap('tests/fixtures/maps/walls.tmj', 'tests/fixtures/maps/fixture-tiles.tsj');
/** One standing figure and one snippet on open floor (0017). */
const FIGURES_MAP = loadMap(
  'tests/fixtures/maps/figures.tmj',
  'tests/fixtures/maps/fixture-tiles.tsj',
);
/** The officer, a colleague with lines on a route of two points and a dog, on open floor (0018). */
const TALKERS_MAP = loadMap(
  'tests/fixtures/maps/talkers.tmj',
  'tests/fixtures/maps/fixture-tiles.tsj',
);
/** One trace on cell (10, 5) behind a wall strip of Marketing, the spawn below both (0022). */
const TRACES_MAP = loadMap(
  'tests/fixtures/maps/traces.tmj',
  'tests/fixtures/maps/fixture-tiles.tsj',
);
/** The colleague of Sales and two traces of Sales on open floor, the spawn 40 px from it (0024). */
const CASE_MAP = loadMap('tests/fixtures/maps/case.tmj', 'tests/fixtures/maps/fixture-tiles.tsj');
/** The floor the game loads. */
const FLOOR_MAP = loadMap('public/maps/floor.tmj', 'public/tiles/placeholder.tsj');

const NONE: GameInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  lamp: false,
  talk: false,
  journal: false,
  help: false,
};
const RIGHT: GameInput = { ...NONE, right: true };
const UP_LEFT: GameInput = { ...NONE, up: true, left: true };
const SHINE: GameInput = { ...NONE, lamp: true };

/** Runs `steps` steps of each input in turn, from the initial state. */
function afterSteps(...legs: readonly (readonly [number, GameInput])[]): GameState {
  let state = createInitialState(MAP);
  for (const [steps, input] of legs) {
    for (let i = 0; i < steps; i += 1) {
      state = update(state, input, MAP);
    }
  }
  return state;
}

describe('GameState (INV-1)', () => {
  it('starts at tick 0 with the player at the spawn, facing down, standing, the camera on it', () => {
    expect(createInitialState(MAP)).toStrictEqual({
      tick: 0,
      player: {
        x: 136,
        y: 120,
        facing: 'down',
        frame: 0,
        frameTimer: 0,
        grace: 0,
        recoil: { dx: 0, dy: 0, steps: 0 },
      },
      camera: { x: 0, y: 12 },
      lamp: { on: false, strength: 1 },
      creatures: [],
      movers: [],
      shadowWalls: [],
      traces: [],
      solved: [],
      figures: [],
      dialogue: null,
      journal: null,
      help: false,
      held: NO_INPUT,
      captured: { snippet: 0 },
      overview: { current: 5, max: 5 },
      dark: 0,
    });
  });

  it('takes the spawn from the map it is given', () => {
    const state = createInitialState(grassMap(20, 12, { x: 40, y: 56 }));
    expect([state.player.x, state.player.y]).toStrictEqual([40, 56]);
  });

  it('survives a JSON round trip unchanged when populated: a player that has walked, the lamp on', () => {
    const state = afterSteps([100, RIGHT], [37, UP_LEFT], [1096, NONE], [1, SHINE]);
    expect(state.tick).toBe(1234);
    expect(Number.isInteger(state.player.x), 'x is fractional after a diagonal').toBe(false);
    expect(state.player.facing).toBe('left');
    expect(state.camera).toStrictEqual({ x: 0, y: 0 });
    expect(state.lamp).toStrictEqual({ on: true, strength: 1 });
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('is a plain object', () => {
    expect(Object.getPrototypeOf(afterSteps([3, RIGHT]))).toBe(Object.prototype);
  });

  it('lists the facings in sprite-sheet order with five phases each', () => {
    expect(FACINGS).toStrictEqual(['down', 'up', 'left', 'right']);
    expect(PHASES_PER_FACING).toBe(5);
  });
});

describe('update', () => {
  const player = {
    x: 136,
    y: 120,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
    grace: 0,
    recoil: { dx: 0, dy: 0, steps: 0 },
  } as const;

  it('advances tick by exactly one and steps the player', () => {
    const next = update(
      {
        tick: 41,
        player,
        camera: { x: 0, y: 12 },
        lamp: { on: false, strength: 1 },
        creatures: [],
        movers: [],
        shadowWalls: [],
        traces: [],
        solved: [],
        figures: [],
        dialogue: null,
        journal: null,
        help: false,
        held: NO_INPUT,
        captured: { snippet: 0 },
        overview: { current: 3, max: 3 },
        dark: 0,
      },
      RIGHT,
      MAP,
    );
    expect(next.tick).toBe(42);
    expect(next.player.x).toBeCloseTo(137.3333, 3);
    expect(next.player.facing).toBe('right');
  });

  it('leaves its input unchanged', () => {
    const state: GameState = {
      tick: 7,
      player,
      camera: { x: 0, y: 12 },
      lamp: { on: false, strength: 1 },
      creatures: [],
      movers: [],
      shadowWalls: [],
      traces: [],
      solved: [],
      figures: [],
      dialogue: null,
      journal: null,
      help: false,
      held: NO_INPUT,
      captured: { snippet: 0 },
      overview: { current: 3, max: 3 },
      dark: 0,
    };
    update(state, RIGHT, MAP);
    expect(state).toStrictEqual({
      tick: 7,
      player,
      camera: { x: 0, y: 12 },
      lamp: { on: false, strength: 1 },
      creatures: [],
      movers: [],
      shadowWalls: [],
      traces: [],
      solved: [],
      figures: [],
      dialogue: null,
      journal: null,
      help: false,
      held: NO_INPUT,
      captured: { snippet: 0 },
      overview: { current: 3, max: 3 },
      dark: 0,
    });
  });
});

describe('the camera in the state (0006)', () => {
  /** A 128x96 map of open ground, the spawn at (1024, 734). */
  const LARGE = grassMap(128, 96, { x: 1024, y: 734 });
  const feet = (x: number, y: number): PlayerState => ({
    x,
    y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
    grace: 0,
    recoil: { dx: 0, dy: 0, steps: 0 },
  });

  it('starts centred on the spawn: (864, 640)', () => {
    expect(createInitialState(LARGE).camera).toStrictEqual({ x: 864, y: 640 });
  });

  it('follows the player: 60 steps right move the player and the camera 80 px', () => {
    let state = createInitialState(LARGE);
    for (let i = 0; i < 60; i += 1) {
      state = update(state, RIGHT, LARGE);
    }
    expect(state.player.x).toBeCloseTo(1104, 6); // 60 × 1.3333… within floating-point noise
    expect(state.camera).toStrictEqual({ x: 944, y: 640 });
  });

  it('followPlayer on the 20x12 map is clamped to x 0 and y 0–12', () => {
    expect(followPlayer(feet(136, 120), MAP)).toStrictEqual({ x: 0, y: 12 });
    expect(followPlayer(feet(160, 94), MAP)).toStrictEqual({ x: 0, y: 0 });
    expect(followPlayer(feet(300, 191), MAP)).toStrictEqual({ x: 0, y: 12 });
  });
});

describe('the lamp in the state (0007)', () => {
  it('starts off', () => {
    expect(createInitialState(MAP).lamp).toStrictEqual({ on: false, strength: 1 });
  });

  it('is on in a step whose input holds lamp; the figure stays, turns, and the camera stays on it', () => {
    const state = update(createInitialState(MAP), { ...SHINE, right: true }, MAP);
    expect(state.lamp).toStrictEqual({ on: true, strength: 1 });
    expect([state.player.x, state.player.y, state.player.facing]).toStrictEqual([
      136,
      120,
      'right',
    ]);
    expect([state.player.frame, state.player.frameTimer]).toStrictEqual([0, 0]);
    expect(state.camera).toStrictEqual({ x: 0, y: 12 });
  });

  it('is off again in the first step without it', () => {
    const shone = update(createInitialState(MAP), SHINE, MAP);
    expect(update(shone, NONE, MAP).lamp).toStrictEqual({ on: false, strength: 1 });
  });
});

describe('the creatures in the state (0008)', () => {
  /** A 128x96 map of open ground with the spawn at (1024, 734), one snippet 46 px right of the spawn. */
  const point = (name: string, x: number, y: number) => ({ name, x, y });
  const MAP_ONE = grassMap(128, 96, { x: 1024, y: 734 }, [point('snippet', 1070, 734)]);
  const RIGHT_SHINE: GameInput = { ...NONE, right: true, lamp: true };
  const DOWN_SHINE: GameInput = { ...NONE, down: true, lamp: true };
  const run = (map: typeof MAP_ONE, ...legs: readonly (readonly [number, GameInput])[]) => {
    let state = createInitialState(map);
    for (const [steps, input] of legs) {
      for (let i = 0; i < steps; i += 1) {
        state = update(state, input, map);
      }
    }
    return state;
  };

  it('starts with one creature per point, light 0, and nothing captured', () => {
    const state = createInitialState(MAP_ONE);
    expect(state.creatures).toStrictEqual([
      { species: 'snippet', x: 1070, y: 734, light: 0, home: { x: 1070, y: 734 } },
    ]);
    expect(state.captured).toStrictEqual({ snippet: 0 });
  });

  it('rejects a point whose name is no species', () => {
    const map = grassMap(128, 96, { x: 1024, y: 734 }, [point('snipet', 1070, 734)]);
    expect(() => createInitialState(map)).toThrow('unknown point object "snipet" at (1070, 734)');
  });

  it('a creature 46 px away comes 2/3 px closer in one step', () => {
    const [creature] = run(MAP_ONE, [1, NONE]).creatures;
    expect(creature?.x).toBeCloseTo(1069.3333, 3);
    expect(creature?.light).toBe(0);
  });

  it('in the light from the first step it never moves, has light 59 after 59 steps, and is captured in the 60th', () => {
    // The figure turns right in step 1: apex (1024, 722), body (1070, 726), d = 46, s = 4.
    expect(run(MAP_ONE, [59, RIGHT_SHINE]).creatures).toStrictEqual([
      { species: 'snippet', x: 1070, y: 734, light: 59, home: { x: 1070, y: 734 } },
    ]);
    const done = run(MAP_ONE, [60, RIGHT_SHINE]);
    expect(done.creatures).toStrictEqual([]);
    expect(done.captured).toStrictEqual({ snippet: 1 });
  });

  it('survives a JSON round trip with a frozen creature and a count of 1 (INV-1)', () => {
    // The second snippet rests 101 px below the spawn while the first is captured. Then the
    // figure walks 60 px down; from its 28th step the snippet comes 2/3 px closer per step, 12 px
    // in all. Then the figure holds the light on it for 30 steps, 29 px away. (101 and not 100:
    // at 100 the 27th step puts the snippet exactly 64 px away, where rounding decides.)
    const map = grassMap(128, 96, { x: 1024, y: 734 }, [
      point('snippet', 1070, 734),
      point('snippet', 1024, 835),
    ]);
    const DOWN: GameInput = { ...NONE, down: true };
    const state = run(map, [60, RIGHT_SHINE], [45, DOWN], [30, DOWN_SHINE]);
    expect(state.captured).toStrictEqual({ snippet: 1 });
    expect(state.creatures).toHaveLength(1);
    expect(state.creatures[0]?.light).toBe(30);
    expect(state.creatures[0]?.x).toBe(1024);
    expect(state.creatures[0]?.y).toBeCloseTo(823, 6);
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });
});

describe('overview in the state (0009)', () => {
  const point = (name: string, x: number, y: number) => ({ name, x, y });
  const SPAWN = { x: 1024, y: 734 };
  /** A snippet at 6-8-10 from the spawn: it hits in step 1 and pushes along (0.6, 0.8). */
  const MAP_HIT = grassMap(128, 96, SPAWN, [point('snippet', 1018, 726)]);
  const run = (steps: number): GameState => {
    let state = createInitialState(MAP_HIT);
    for (let i = 0; i < steps; i += 1) {
      state = update(state, NONE, MAP_HIT);
    }
    return state;
  };

  it('a map with one wake point starts, and the point makes no creature', () => {
    const map = grassMap(128, 96, SPAWN, [point('wake', 792, 744)]);
    expect(createInitialState(map).creatures).toStrictEqual([]);
  });

  it('a map with two wake points does not start', () => {
    const map = grassMap(128, 96, SPAWN, [point('wake', 792, 744), point('wake', 800, 744)]);
    expect(() => createInitialState(map)).toThrow('more than one point object "wake"');
  });

  it('survives a JSON round trip in the middle of a push (INV-1)', () => {
    const state = run(6); // the hit in step 1, five steps of the push
    expect(state.overview).toStrictEqual({ current: 4, max: 5 });
    expect(state.player.grace).toBe(85);
    expect(state.player.recoil.dx).toBeCloseTo(1.8, 3);
    expect(state.player.recoil.dy).toBeCloseTo(2.4, 3);
    expect(state.player.recoil.steps).toBe(3);
    expect(state.creatures[0]?.x).not.toBe(1018);
    expect(state.creatures[0]?.home).toStrictEqual({ x: 1018, y: 726 });
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('five hits, 90 steps apart, lead into the dark; it survives the round trip at step 30', () => {
    expect([1, 91, 181, 271].map((steps) => run(steps).overview.current)).toStrictEqual([
      4, 3, 2, 1,
    ]);
    expect(run(90).overview.current).toBe(4);
    expect(run(360).dark).toBe(0);
    expect(run(361).dark).toBe(1);
    const state = run(390);
    expect(state.overview).toStrictEqual({ current: 0, max: 5 });
    expect(state.dark).toBe(30);
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('without a wake point the figure wakes at the spawn, the creature at its home', () => {
    const state = run(405); // 361 + 44: dark is 45
    expect(state.dark).toBe(45);
    expect([state.player.x, state.player.y]).toStrictEqual([1024, 734]);
    expect(state.overview).toStrictEqual({ current: 5, max: 5 });
    expect(state.creatures).toStrictEqual([
      { species: 'snippet', x: 1018, y: 726, light: 0, home: { x: 1018, y: 726 } },
    ]);
  });
});

describe('movers in the state (0015)', () => {
  it('starts with one mover per route, in route order, on point 1', () => {
    const state = createInitialState(ROUTES_MAP);
    expect(state.movers.map((m) => [m.kind, m.x, m.y, m.wait, m.target])).toStrictEqual([
      ['person', 40, 40, 3, 1],
      ['dog', 40, 72, 3, 1],
      ['vacuum', 40, 104, 0, 1],
      ['drone', 40, 136, 0, 1],
    ]);
    expect(state.creatures).toStrictEqual([]);
  });

  it('refuses a map whose route crosses a solid tile before the game starts', () => {
    const blocked = {
      ...ROUTES_MAP,
      solids: ROUTES_MAP.solids.map((boxes, i) =>
        i === 4 * ROUTES_MAP.width + 4 ? [{ x: 64, y: 64, width: 16, height: 16 }] : boxes,
      ),
    };
    expect(() => createInitialState(blocked)).toThrow(
      'route dog:hr leg 1 crosses a solid tile (4, 4)',
    );
  });

  it('steps the movers and survives a JSON round trip at the start and after 600 steps', () => {
    let state = createInitialState(ROUTES_MAP);
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    for (let i = 0; i < 600; i += 1) {
      state = update(state, NONE, ROUTES_MAP);
    }
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    expect(state.movers.some((m) => m.x !== 40)).toBe(true);
  });

  it('moves no mover in the dark', () => {
    const running = createInitialState(ROUTES_MAP);
    const dark = { ...running, dark: 1 };
    expect(update(dark, NONE, ROUTES_MAP).movers).toStrictEqual(dark.movers);
  });

  it('leaves the figure and the creatures as they are without movers (criterion 8)', () => {
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
      talk: false,
      journal: false,
      help: false,
    }));
    let withMovers = createInitialState(FLOOR_MAP);
    let without: GameState = { ...withMovers, movers: [] };
    for (const input of inputs) {
      withMovers = update(withMovers, input, FLOOR_MAP);
      without = update(without, input, FLOOR_MAP);
    }
    expect({ ...withMovers, movers: [] }).toStrictEqual(without);
  });
});

describe('shadow walls in the state (0014)', () => {
  const DOWN: GameInput = { ...NONE, down: true };
  const UP: GameInput = { ...NONE, up: true };
  const LEFT: GameInput = { ...NONE, left: true };
  const THIN = { name: 'shadow:marketing', x: 128, y: 96, width: 48, height: 4 };
  const DENSE = { name: 'shadow:hr', x: 128, y: 96, width: 48, height: 4 };
  const SIDE = { name: 'shadow:sales', x: 240, y: 32, width: 4, height: 48 };
  const run = (
    map: TileMap,
    start: GameState,
    ...legs: readonly (readonly [number, GameInput])[]
  ): GameState => {
    let state = start;
    for (const [steps, input] of legs) {
      for (let i = 0; i < steps; i += 1) {
        state = update(state, input, map);
      }
    }
    return state;
  };
  const from = (map: TileMap, ...legs: readonly (readonly [number, GameInput])[]): GameState =>
    run(map, createInitialState(map), ...legs);

  it('starts with every wall of the map standing and a lamp of strength 1', () => {
    const state = createInitialState(WALLS_MAP);
    expect(state.lamp).toStrictEqual({ on: false, strength: 1 });
    expect(state.shadowWalls).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
      { wall: 1, lit: false, light: 0 },
      { wall: 2, lit: false, light: 0 },
    ]);
  });

  it('starts without walls on a map without rectangles', () => {
    expect(createInitialState(MAP).shadowWalls).toStrictEqual([]);
  });

  it('refuses a map with a rectangle that is no shadow wall before the game starts', () => {
    const map = grassMap(20, 12, { x: 40, y: 152 }, [], [{ ...THIN, name: 'door' }]);
    expect(() => createInitialState(map)).toThrow('unknown rectangle object "door"');
  });

  it('stops the figure flush at a standing wall from each of the four sides', () => {
    const above = from(grassMap(20, 12, { x: 152, y: 80 }, [], [THIN]), [30, DOWN]);
    expect([above.player.x, above.player.y]).toStrictEqual([152, 96]);
    const below = from(grassMap(20, 12, { x: 152, y: 124 }, [], [THIN]), [30, UP]);
    expect([below.player.x, below.player.y]).toStrictEqual([152, 108]);
    const left = from(grassMap(20, 12, { x: 220, y: 60 }, [], [SIDE]), [30, RIGHT]);
    expect([left.player.x, left.player.y]).toStrictEqual([234, 60]);
    const right = from(grassMap(20, 12, { x: 260, y: 60 }, [], [SIDE]), [30, LEFT]);
    expect([right.player.x, right.player.y]).toStrictEqual([250, 60]);
  });

  it('lets the figure slide along a standing wall', () => {
    const map = grassMap(20, 12, { x: 152, y: 80 }, [], [THIN]);
    const state = from(map, [30, DOWN], [10, { ...NONE, down: true, right: true }]);
    expect(state.player.y).toBe(96);
    expect(state.player.x).toBeCloseTo(152 + (10 * (80 / 60)) / Math.SQRT2, 6);
  });

  it('holds a push of 3 px per step', () => {
    const map = grassMap(20, 12, { x: 152, y: 90 }, [], [THIN]);
    const start = createInitialState(map);
    const pushed = run(
      map,
      { ...start, player: { ...start.player, recoil: { dx: 0, dy: 3, steps: 8 } } },
      [8, NONE],
    );
    expect([pushed.player.x, pushed.player.y]).toStrictEqual([152, 96]);
    expect(pushed.player.recoil.steps).toBe(0);
  });

  describe('a snippet beyond a wall', () => {
    /** The figure at (152, 80) faces down; the snippet's body point (152, 112) is in the cone. */
    const map = grassMap(20, 12, { x: 152, y: 80 }, [{ name: 'snippet', x: 152, y: 120 }], [DENSE]);

    it('is not lit through a standing wall and is held by it', () => {
      const state = from(map, [90, SHINE]);
      expect(state.creatures).toStrictEqual([
        { species: 'snippet', x: 152, y: 108, light: 0, home: { x: 152, y: 120 } },
      ]);
      expect(state.captured).toStrictEqual({ snippet: 0 });
      expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 0 }]);
    });

    it('is lit and captured once the wall is lifted', () => {
      const lifted: GameState = { ...createInitialState(map), shadowWalls: [] };
      const state = run(map, lifted, [60, SHINE]);
      expect(state.creatures).toStrictEqual([]);
      expect(state.captured).toStrictEqual({ snippet: 1 });
    });

    it('walks through the doorway once the wall is lifted', () => {
      const lifted: GameState = { ...createInitialState(map), shadowWalls: [] };
      const state = run(map, lifted, [30, NONE]);
      expect(state.creatures[0]?.y).toBeCloseTo(100, 6);
    });
  });

  it('lifts a thin wall in the 60th step of light; from the next step the doorway is open', () => {
    const map = grassMap(20, 12, { x: 152, y: 96 }, [], [THIN]);
    expect(from(map, [3, DOWN]).player.y).toBe(96);
    const almost = from(map, [59, SHINE]);
    expect(almost.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 59 }]);
    const lifted = run(map, almost, [1, SHINE]);
    expect(lifted.shadowWalls).toStrictEqual([]);
    expect(lifted.player.y).toBe(96);
    expect(run(map, lifted, [3, DOWN]).player.y).toBeCloseTo(100, 6);
  });

  it('survives a JSON round trip with a wall at light 30 and with a wall lifted (INV-1)', () => {
    const map = grassMap(20, 12, { x: 152, y: 96 }, [], [THIN, SIDE]);
    const half = from(map, [30, SHINE]);
    expect(half.shadowWalls).toStrictEqual([
      { wall: 0, lit: true, light: 30 },
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(JSON.parse(JSON.stringify(half))).toStrictEqual(half);
    const lifted = run(map, half, [30, SHINE]);
    expect(lifted.shadowWalls).toStrictEqual([{ wall: 1, lit: false, light: 0 }]);
    expect(JSON.parse(JSON.stringify(lifted))).toStrictEqual(lifted);
  });

  it('changes no wall in the dark, rests the standing ones at the wake and brings none back', () => {
    const map = grassMap(20, 12, { x: 152, y: 96 }, [], [THIN, SIDE]);
    const half = from(map, [30, SHINE]);
    const fallen: GameState = {
      ...half,
      shadowWalls: [{ wall: 0, lit: true, light: 30 }],
      dark: 1,
    };
    const before = run(map, fallen, [43, SHINE]);
    expect(before.dark).toBe(44);
    expect(before.shadowWalls).toStrictEqual([{ wall: 0, lit: true, light: 30 }]);
    const woken = run(map, before, [1, SHINE]);
    expect(woken.dark).toBe(45);
    expect(woken.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
    expect(woken.lamp).toStrictEqual({ on: false, strength: 1 });
  });

  it('steps a state without standing walls exactly as a map without walls (600 steps)', () => {
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
      talk: false,
      journal: false,
      help: false,
    }));
    // Without its walls; the traces of 0022 are rectangles too, and they stay.
    const bare: TileMap = {
      ...FLOOR_MAP,
      rects: FLOOR_MAP.rects.filter((rect) => !rect.name.startsWith('shadow:')),
    };
    let open: GameState = { ...createInitialState(FLOOR_MAP), shadowWalls: [] };
    let without = createInitialState(bare);
    expect(open).toStrictEqual(without);
    for (const input of inputs) {
      open = update(open, input, FLOOR_MAP);
      without = update(without, input, bare);
    }
    expect(open).toStrictEqual(without);
  });
});

describe('standing figures in the state (0017)', () => {
  const TALK: GameInput = { ...NONE, talk: true };

  it('starts with one entry per figure of the map, facing down, no dialogue, the key not held', () => {
    const state = createInitialState(FIGURES_MAP);
    expect(state.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(state.dialogue).toBeNull();
    expect(state.held).toStrictEqual(NO_INPUT);
    expect(state.creatures).toHaveLength(1);
    expect(state.movers).toStrictEqual([]);
  });

  it('starts without figures on a map without figure points', () => {
    expect(createInitialState(MAP).figures).toStrictEqual([]);
  });

  it('refuses a map with a figure the cast does not have before the game starts', () => {
    const map = grassMap(20, 12, { x: 40, y: 152 }, [{ name: 'figure:cellar', x: 160, y: 96 }]);
    expect(() => createInitialState(map)).toThrow('figure point figure:cellar names no figure');
  });

  it('remembers in every step whether talk was held: an ordinary step and a step of the dark', () => {
    const start = createInitialState(MAP);
    const held = update(start, TALK, MAP);
    expect(held.held).toStrictEqual(TALK);
    expect(update(held, NONE, MAP).held).toStrictEqual(NONE);
    const dark = update({ ...start, dark: 1 }, TALK, MAP);
    expect(dark.dark).toBe(2);
    expect(dark.held).toStrictEqual(TALK);
    expect(update(dark, NONE, MAP).held).toStrictEqual(NONE);
  });

  it('keeps the figures through the wake', () => {
    let state: GameState = { ...createInitialState(FIGURES_MAP), dark: 44 };
    state = update(state, NONE, FIGURES_MAP);
    expect(state.dark).toBe(45);
    expect(state.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(state.dialogue).toBeNull();
  });

  it('survives a JSON round trip at the start (INV-1)', () => {
    const state = createInitialState(FIGURES_MAP);
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
  });
});

describe('colleagues with lines in the state (0018)', () => {
  const TALK: GameInput = { ...NONE, talk: true };

  it('starts on the fixture with the officer, the colleague waiting on its point 1 and the dog', () => {
    const state = createInitialState(TALKERS_MAP);
    expect(state.player).toMatchObject({ x: 104, y: 48 });
    expect(state.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(state.movers.map((mover) => mover.kind)).toStrictEqual(['person', 'dog']);
    expect(state.movers[0]).toMatchObject({ x: 64, y: 48, wait: 600, target: 1, facing: 'down' });
    expect(state.dialogue).toBeNull();
  });

  it('opens a dialogue with the colleague 40 px from the spawn, and closes it with the next press', () => {
    const start = createInitialState(TALKERS_MAP);
    const opened = update(start, TALK, TALKERS_MAP);
    expect(opened.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
    expect(opened.movers[0]).toStrictEqual({ ...start.movers[0], facing: 'right' });
    expect(opened.movers[1]).toStrictEqual(start.movers[1]);
    expect(opened.figures).toStrictEqual(start.figures);
    const closed = update(update(opened, NONE, TALKERS_MAP), TALK, TALKERS_MAP);
    expect(closed.dialogue).toBeNull();
    expect(closed.tick).toBe(3);
  });

  it('survives a JSON round trip with the colleague speaking (INV-1)', () => {
    const opened = update(createInitialState(TALKERS_MAP), TALK, TALKERS_MAP);
    expect(opened.dialogue).not.toBeNull();
    expect(JSON.parse(JSON.stringify(opened))).toStrictEqual(opened);
  });
});

describe('the journal in the state (0020)', () => {
  const JOURNAL: GameInput = { ...NONE, journal: true };

  it('starts closed, with no key remembered', () => {
    const state = createInitialState(FLOOR_MAP);
    expect(state.journal).toBeNull();
    expect(state.held).toStrictEqual(NO_INPUT);
    expect(NONE).toStrictEqual(NO_INPUT);
  });

  it('opens on the floor with a press and closes with the next, and nothing has moved', () => {
    const start = createInitialState(FLOOR_MAP);
    const open = update(start, JOURNAL, FLOOR_MAP);
    expect(open).toStrictEqual({ ...start, tick: 1, held: JOURNAL, journal: { tab: 'creatures' } });
    const closed = update(update(open, NONE, FLOOR_MAP), JOURNAL, FLOOR_MAP);
    expect(closed).toStrictEqual({ ...start, tick: 3, held: JOURNAL });
  });

  it('keeps the journal closed through the wake', () => {
    let state: GameState = { ...createInitialState(FLOOR_MAP), dark: 44 };
    state = update(state, JOURNAL, FLOOR_MAP);
    expect(state.dark).toBe(45);
    expect(state.journal).toBeNull();
    expect(state.held).toStrictEqual(JOURNAL);
  });
});

describe('traces in the state (0022)', () => {
  const JOURNAL: GameInput = { ...NONE, journal: true };
  const TALK: GameInput = { ...NONE, talk: true };
  const lookingUp = (map: TileMap): GameState => {
    const start = createInitialState(map);
    return { ...start, player: { ...start.player, facing: 'up' } };
  };
  const stepping = (map: TileMap, start: GameState, input: GameInput, count: number): GameState => {
    let state = start;
    for (let step = 0; step < count; step += 1) {
      state = update(state, input, map);
    }
    return state;
  };

  it('starts on the floor with five traces, unseen and not found', () => {
    expect(createInitialState(FLOOR_MAP).traces).toStrictEqual(
      [0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: null })),
    );
    expect(createInitialState(MAP).traces).toStrictEqual([]);
  });

  it('reads a trace and a wall from a parsed map, each by its kind', () => {
    const state = createInitialState(TRACES_MAP);
    expect(state.player).toMatchObject({ x: 168, y: 128 });
    expect(state.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    expect(state.shadowWalls).toStrictEqual([{ wall: 0, lit: false, light: 0 }]);
  });

  it('lifts the wall in a second and finds the trace behind it in the next', () => {
    const lifted = stepping(TRACES_MAP, lookingUp(TRACES_MAP), SHINE, 60);
    expect(lifted.shadowWalls).toStrictEqual([]);
    expect(lifted.traces).toStrictEqual([{ trace: 0, light: 0, found: null }]);
    const found = stepping(TRACES_MAP, lifted, SHINE, 60);
    expect(found.traces).toStrictEqual([{ trace: 0, light: 0, found: 120 }]);
  });

  it('survives a JSON round trip at the start and with a trace found (INV-1)', () => {
    const start = createInitialState(TRACES_MAP);
    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
    const found = stepping(TRACES_MAP, lookingUp(TRACES_MAP), SHINE, 120);
    expect(found.traces[0]?.found).toBe(120);
    expect(JSON.parse(JSON.stringify(found))).toStrictEqual(found);
  });

  it('steps no trace while the journal is open: 600 steps with the lamp held', () => {
    const lit = stepping(
      TRACES_MAP,
      stepping(TRACES_MAP, lookingUp(TRACES_MAP), SHINE, 60),
      SHINE,
      30,
    );
    expect(lit.traces).toStrictEqual([{ trace: 0, light: 30, found: null }]);
    const open = update(lit, { ...SHINE, journal: true }, TRACES_MAP);
    expect(open.journal).not.toBeNull();
    expect(stepping(TRACES_MAP, open, SHINE, 600).traces).toStrictEqual(lit.traces);
    expect(open.traces).toStrictEqual(lit.traces);
    expect(JOURNAL.journal).toBe(true);
  });

  it('steps no trace while a dialogue is open', () => {
    const map = grassMap(
      20,
      12,
      { x: 168, y: 128 },
      [{ name: 'figure:officer', x: 190, y: 128 }],
      [{ name: 'trace:sales', x: 160, y: 80, width: 16, height: 16 }],
    );
    const lit = stepping(map, lookingUp(map), SHINE, 30);
    expect(lit.traces).toStrictEqual([{ trace: 0, light: 30, found: null }]);
    // Without the lamp the count starts again in an ordinary step; the step that opens steps nothing.
    const talking = update(update(lit, NONE, map), TALK, map);
    expect(talking.dialogue).not.toBeNull();
    expect(stepping(map, talking, SHINE, 600).traces).toStrictEqual(talking.traces);
  });
});

describe('the solved cases in the state (0024)', () => {
  const TALK: GameInput = { ...NONE, talk: true };
  const through = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
    inputs.reduce((state, input) => update(state, input, CASE_MAP), start);

  it('starts with none, on the floor and on the fixture', () => {
    expect(createInitialState(FLOOR_MAP).solved).toStrictEqual([]);
    const state = createInitialState(CASE_MAP);
    expect(state.solved).toStrictEqual([]);
    expect(state.traces).toHaveLength(2);
    expect(state.movers.map((mover) => mover.kind)).toStrictEqual(['person']);
  });

  it('solves the case of a parsed map: both traces found, three presses beside the source', () => {
    const start = createInitialState(CASE_MAP);
    const ready: GameState = {
      ...start,
      tick: 1000,
      traces: start.traces.map((trace) => ({ ...trace, found: 10 })),
    };
    const solved = through(ready, TALK, NONE, TALK, NONE, TALK);
    expect(solved.dialogue).toBeNull();
    expect(solved.solved).toStrictEqual([{ region: 'sales', at: 1005 }]);
    expect(solved.overview).toStrictEqual({ current: 6, max: 6 });
    expect(JSON.parse(JSON.stringify(solved))).toStrictEqual(solved);
  });

  it('solves nothing on the same map with one trace still to find', () => {
    const start = createInitialState(CASE_MAP);
    const one: GameState = {
      ...start,
      tick: 1000,
      traces: start.traces.map((trace, i) => (i === 0 ? { ...trace, found: 10 } : trace)),
    };
    const closed = through(one, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.solved).toStrictEqual([]);
  });
});
