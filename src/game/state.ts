import type { Point } from '../engine/tiled';
import type { GameInput } from './player';

/** The facings in sprite-sheet order: frame index = facing × PHASES_PER_FACING + phase. */
export const FACINGS = ['down', 'up', 'left', 'right'] as const;
export type Facing = (typeof FACINGS)[number];

/** Phase 0 stands; phases 1–WALK_PHASES are the walk cycle, in order. */
export const WALK_PHASES = 4;
export const PHASES_PER_FACING = WALK_PHASES + 1;

/** The push a hit leaves (0009): the move per step in pixels and the steps it still lasts, 0–8. */
export interface Recoil {
  readonly dx: number;
  readonly dy: number;
  readonly steps: number;
}

/** No push. With `steps` 0, `dx` and `dy` are 0. */
export const NO_RECOIL: Recoil = { dx: 0, dy: 0, steps: 0 };

export interface PlayerState {
  /** The feet position in map pixels, floating point; rounded only for drawing. */
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  /** The phase, 0–WALK_PHASES. */
  readonly frame: number;
  /** Steps spent in the current phase; a multiple of 0.5, which floating point holds exactly. */
  readonly frameTimer: number;
  /** Steps the figure is still safe from a hit, 0–90 (0009). */
  readonly grace: number;
  /** The push the figure is still carrying out (0009). */
  readonly recoil: Recoil;
}

/** The lamp (0007, 0014): on in every step whose input holds `lamp`. Later field: charge (M6). */
export interface LampState {
  readonly on: boolean;
  /** Against a region's density (gameplay.md §5): BASE_STRENGTH plus the upgrades earned. */
  readonly strength: number;
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
  /** The map point it started at; it returns there when the figure wakes (0009). Never changes. */
  readonly home: Point;
}

/** What moves on the floor without a role in a case (0015), in the order of the spec's tables. */
export const MOVER_KINDS = ['person', 'dog', 'vacuum', 'drone'] as const;
export type MoverKind = (typeof MOVER_KINDS)[number];

/** A mover on its route (0015). The route's points stay in the map. */
export interface MoverState {
  readonly kind: MoverKind;
  /** Which picture: a person's number among the persons, a dog's among the dogs modulo 2, else 0. */
  readonly look: number;
  /** The index of its route in `routesOf(map.points)`. */
  readonly route: number;
  /** The feet in map pixels, floating point: the bottom centre of its sprite. */
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  /** A person: 0 stands, 1–4 walk. A dog: 0 stands, 1 steps, 2 sits. Others: 0. */
  readonly frame: number;
  /** Steps spent in the current phase. */
  readonly frameTimer: number;
  /** The index of the route point it is heading for. */
  readonly target: number;
  /** Steps it still waits on the point it stands on. */
  readonly wait: number;
}

/** A shadow wall still standing (0014). Its box stays in the map, its density in the world data. */
export interface ShadowWallState {
  /** The index of the wall in `wallsOf(map.rects)`. */
  readonly wall: number;
  /** Whether the light was on it in the last step. */
  readonly lit: boolean;
  /** Steps it has been giving way without a break, 0–59. */
  readonly light: number;
}

/** A standing figure of the cast (0017). Its place stays in the map, its pages in game/cast. */
export interface FigureState {
  /** The index of the figure in `figuresOf(map.points)`. */
  readonly figure: number;
  /** Where it looks: `down` at the start, then to whoever spoke to it last. */
  readonly facing: Facing;
}

/** Who speaks in a dialogue (0018): a standing figure of the cast, or a colleague on its round. */
export const SPEAKER_KINDS = ['figure', 'mover'] as const;
export type SpeakerKind = (typeof SPEAKER_KINDS)[number];

/** An open dialogue (0017, 0018). */
export interface Dialogue {
  readonly speaker: SpeakerKind;
  /** The index of the speaker in `GameState.figures` or in `GameState.movers`. */
  readonly index: number;
  /** The page shown, from 0. */
  readonly page: number;
}

/** The tabs of the journal (gameplay.md §7), in their order on the screen (0020). */
export const JOURNAL_TABS = ['creatures', 'cases', 'policy'] as const;
export type JournalTab = (typeof JOURNAL_TABS)[number];

/** The open journal (0020). What its tabs show is derived from the rest of the state. */
export interface JournalState {
  readonly tab: JournalTab;
}

/** How many creatures of each species were captured. */
export type Captured = Readonly<Record<Species, number>>;

/** Overview is the game's health (gameplay.md §4): whole numbers, 0 ≤ current ≤ max. */
export interface Overview {
  readonly current: number;
  readonly max: number;
}

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
  /** The movers on their routes, in route order (0015). */
  readonly movers: readonly MoverState[];
  /** The shadow walls still standing, in the map's order (0014); a lifted wall has left it for good. */
  readonly shadowWalls: readonly ShadowWallState[];
  /** The standing figures of the map, in file order (0017). */
  readonly figures: readonly FigureState[];
  /** The dialogue that is open, or null. While it is open nothing else is stepped (0017). */
  readonly dialogue: Dialogue | null;
  /** The journal that is open, or null. While it is open nothing else is stepped (0020). */
  readonly journal: JournalState | null;
  /**
   * Whether the help is open (0021). While it is, nothing else is stepped — not the world, not
   * an open dialogue and not the open journal: it lies over whatever is there.
   */
  readonly help: boolean;
  /** The last step's input: an action is pressed when it is held now and was not then (0020). */
  readonly held: GameInput;
  /** Captured creatures per species; the journal (M4) reads it. */
  readonly captured: Captured;
  readonly overview: Overview;
  /** The step of the dark sequence, 1–89; 0 while the game runs (0009). */
  readonly dark: number;
}
