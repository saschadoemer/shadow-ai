/**
 * Everything that changes while playing (INV-1): plain data only — numbers, strings, booleans,
 * arrays and plain objects. Empty until feature 0002 adds the first field.
 */
export type GameState = Record<string, never>;

export function createInitialState(): GameState {
  return {};
}
