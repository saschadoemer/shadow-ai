/**
 * Everything that changes while playing (INV-1): plain data only — numbers, strings, booleans,
 * arrays and plain objects.
 */
export interface GameState {
  /** Logic steps since the start; one step is 1/60 s (INV-3). */
  readonly tick: number;
}

export function createInitialState(): GameState {
  return { tick: 0 };
}
