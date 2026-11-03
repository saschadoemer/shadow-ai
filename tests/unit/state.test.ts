import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  FACINGS,
  type GameState,
  PHASES_PER_FACING,
} from '../../src/game/state';
import { update } from '../../src/game/update';
import { grassMap } from './grass-map';

/** The test map's size and spawn, in memory: 20x12 tiles, spawn at (136, 120). */
const MAP = grassMap(20, 12, { x: 136, y: 120 });

function afterSteps(steps: number): GameState {
  let state = createInitialState(MAP);
  for (let i = 0; i < steps; i += 1) {
    state = update(state);
  }
  return state;
}

describe('GameState (INV-1)', () => {
  it('starts at tick 0 with the player at the spawn, facing down, standing', () => {
    expect(createInitialState(MAP)).toStrictEqual({
      tick: 0,
      player: { x: 136, y: 120, facing: 'down', frame: 0, frameTimer: 0 },
    });
  });

  it('takes the spawn from the map it is given', () => {
    const state = createInitialState(grassMap(20, 12, { x: 40, y: 56 }));
    expect([state.player.x, state.player.y]).toStrictEqual([40, 56]);
  });

  it('survives a JSON round trip unchanged when populated', () => {
    const state = afterSteps(1234);
    expect(state.tick).toBe(1234);
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('is a plain object', () => {
    expect(Object.getPrototypeOf(afterSteps(3))).toBe(Object.prototype);
  });

  it('lists the facings in sprite-sheet order with five phases each', () => {
    expect(FACINGS).toStrictEqual(['down', 'up', 'left', 'right']);
    expect(PHASES_PER_FACING).toBe(5);
  });
});

describe('update', () => {
  const player = { x: 136, y: 120, facing: 'down', frame: 0, frameTimer: 0 } as const;

  it('advances tick by exactly one', () => {
    expect(update({ tick: 41, player })).toStrictEqual({ tick: 42, player });
  });

  it('leaves its input unchanged', () => {
    const state: GameState = { tick: 7, player };
    update(state);
    expect(state).toStrictEqual({ tick: 7, player });
  });
});
