import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/game/state';

describe('GameState (INV-1)', () => {
  it('survives a JSON round trip unchanged', () => {
    const state = createInitialState();
    const copy: unknown = JSON.parse(JSON.stringify(state));
    expect(copy).toStrictEqual(state);
  });

  it('is a plain object', () => {
    const state = createInitialState();
    expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
  });
});
