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
      player: { x: 136, y: 120, facing: 'down', frame: 0, frameTimer: 0 },
      camera: { x: 0, y: 12 },
      lamp: { on: false },
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
  const player = { x: 136, y: 120, facing: 'down', frame: 0, frameTimer: 0 } as const;

  it('advances tick by exactly one and steps the player', () => {
    const next = update(
      { tick: 41, player, camera: { x: 0, y: 12 }, lamp: { on: false } },
      RIGHT,
      MAP,
    );
    expect(next.tick).toBe(42);
    expect(next.player.x).toBeCloseTo(137.3333, 3);
    expect(next.player.facing).toBe('right');
  });

  it('leaves its input unchanged', () => {
    const state: GameState = { tick: 7, player, camera: { x: 0, y: 12 }, lamp: { on: false } };
    update(state, RIGHT, MAP);
    expect(state).toStrictEqual({ tick: 7, player, camera: { x: 0, y: 12 }, lamp: { on: false } });
  });
});

describe('the camera in the state (0006)', () => {
  /** The campus's size and spawn on open ground: 128x96 tiles, the spawn at (1024, 734). */
  const CAMPUS = grassMap(128, 96, { x: 1024, y: 734 });
  const feet = (x: number, y: number): PlayerState => ({
    x,
    y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
  });

  it('starts centred on the spawn: (864, 640)', () => {
    expect(createInitialState(CAMPUS).camera).toStrictEqual({ x: 864, y: 640 });
  });

  it('follows the player: 60 steps right move the player and the camera 80 px', () => {
    let state = createInitialState(CAMPUS);
    for (let i = 0; i < 60; i += 1) {
      state = update(state, RIGHT, CAMPUS);
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
