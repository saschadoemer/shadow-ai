import { describe, expect, it } from 'vitest';
import { followPlayer } from '../../src/game/camera';
import type { GameInput } from '../../src/game/player';
import { FACINGS, type GameState, PHASES_PER_FACING, type PlayerState } from '../../src/game/state';
import { createInitialState, update } from '../../src/game/update';
import { grassMap } from './grass-map';

/** The test map's size and spawn, in memory: 20x12 tiles, spawn at (136, 120). */
const MAP = grassMap(20, 12, { x: 136, y: 120 });

const NONE: GameInput = { up: false, down: false, left: false, right: false, lamp: false };
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
      lamp: { on: false },
      creatures: [],
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
    expect(state.lamp).toStrictEqual({ on: true });
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
        lamp: { on: false },
        creatures: [],
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
      lamp: { on: false },
      creatures: [],
      captured: { snippet: 0 },
      overview: { current: 3, max: 3 },
      dark: 0,
    };
    update(state, RIGHT, MAP);
    expect(state).toStrictEqual({
      tick: 7,
      player,
      camera: { x: 0, y: 12 },
      lamp: { on: false },
      creatures: [],
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
    expect(createInitialState(MAP).lamp).toStrictEqual({ on: false });
  });

  it('is on in a step whose input holds lamp; the figure stays, turns, and the camera stays on it', () => {
    const state = update(createInitialState(MAP), { ...SHINE, right: true }, MAP);
    expect(state.lamp).toStrictEqual({ on: true });
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
    expect(update(shone, NONE, MAP).lamp).toStrictEqual({ on: false });
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
