import type { Point } from '../engine/tiled';

/** The facings in sprite-sheet order: frame index = facing × PHASES_PER_FACING + phase. */
export const FACINGS = ['down', 'up', 'left', 'right'] as const;
export type Facing = (typeof FACINGS)[number];

/** Phase 0 stands; phases 1–WALK_PHASES are the walk cycle, in order. */
export const WALK_PHASES = 4;
export const PHASES_PER_FACING = WALK_PHASES + 1;

export interface PlayerState {
  /** The feet position in map pixels, floating point; rounded only for drawing. */
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  /** The phase, 0–WALK_PHASES. */
  readonly frame: number;
  /** Steps spent in the current phase; a multiple of 0.5, which floating point holds exactly. */
  readonly frameTimer: number;
}

/** The lamp (0007): on in every step whose input holds `lamp`. Later fields: strength (0010), charge (M6). */
export interface LampState {
  readonly on: boolean;
}

/** The creature species (world.md §4), in journal order. 0008 brings the first. */
export const SPECIES = ['snippet'] as const;
export type Species = (typeof SPECIES)[number];

/** A creature still in the world (0008). */
export interface CreatureState {
  readonly species: Species;
  /** The feet in map pixels, floating point: the bottom centre of its 16x16 sprite. */
  readonly x: number;
  readonly y: number;
  /** Steps lit without a break, 0–59; above 0 the creature is frozen. */
  readonly light: number;
}

/** How many creatures of each species were captured. */
export type Captured = Readonly<Record<Species, number>>;

/**
 * Everything that changes while playing (INV-1): plain data only — numbers, strings, booleans,
 * arrays and plain objects.
 */
export interface GameState {
  /** Logic steps since the start; one step is 1/60 s (INV-3). */
  readonly tick: number;
  readonly player: PlayerState;
  /**
   * The view's top-left corner in map pixels, two integers (0006). Derived from the player after
   * every step and kept here so a saved game comes back as it was left.
   */
  readonly camera: Point;
  /** Derived from the input every step and kept here so the renderer knows what to draw. */
  readonly lamp: LampState;
  /** The creatures still in the world, in the order of the map's points (0008). */
  readonly creatures: readonly CreatureState[];
  /** Captured creatures per species; the journal (M4) reads it. */
  readonly captured: Captured;
}
