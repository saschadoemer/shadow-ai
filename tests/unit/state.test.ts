import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../../src/game/state';
import { update } from '../../src/game/update';

function afterSteps(steps: number): GameState {
  let state = createInitialState();
  for (let i = 0; i < steps; i += 1) {
    state = update(state);
  }
  return state;
}

describe('GameState (INV-1)', () => {
  it('starts at tick 0', () => {
    expect(createInitialState()).toStrictEqual({ tick: 0 });
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
});

describe('update', () => {
  it('advances tick by exactly one', () => {
    expect(update({ tick: 41 })).toStrictEqual({ tick: 42 });
  });

  it('leaves its input unchanged', () => {
    const state: GameState = { tick: 7 };
    update(state);
    expect(state).toStrictEqual({ tick: 7 });
  });
});
