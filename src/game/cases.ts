import type { TileMap } from '../engine/tiled';
import { type TextKey, textKey } from '../text/text';
import type { Route } from './mover';
import type { Dialogue, GameState, SolvedCase, TraceState } from './state';
import { type Trace, tracesOf } from './trace';

/**
 * The cases (gameplay.md §6, world.md §2, feature 0024). A case belongs to a region and has a
 * source: the colleague where the data flow begins. When every trace of the region is found,
 * the case is ready, and the source no longer says its everyday line: shown what the lamp
 * found, it answers honestly. The step that closes that answer solves the case. Nobody gets
 * into trouble. Pure data and pure functions.
 */

export interface Case {
  readonly region: string;
  /** The route of the colleague who is the source, `person:<room>`. */
  readonly source: string;
  /** What the source says when the case is ready: its honest answer, page by page. */
  readonly answer: readonly TextKey[];
  /** What the source says once the case is solved. */
  readonly after: readonly TextKey[];
  /** The case's line on the journal's cases tab once it is solved. */
  readonly outcome: TextKey;
  /** The case's building block of the policy. */
  readonly policy: TextKey;
}

export const CASES: readonly Case[] = [
  {
    region: 'sales',
    source: 'person:sales',
    answer: [textKey('talk.sales-source-1'), textKey('talk.sales-source-2')],
    after: [textKey('talk.sales-after')],
    outcome: textKey('case.sales-outcome'),
    policy: textKey('policy.sales'),
  },
];

/** Solving a case raises the maximum of overview by this much, and fills it. */
export const CASE_OVERVIEW = 1;

/** What the cases follow from: the traces in the state, their places in the map, what is solved. */
export interface Progress {
  readonly traces: readonly TraceState[];
  readonly places: readonly Trace[];
  readonly solved: readonly SolvedCase[];
}

export function progressOf(state: GameState, map: TileMap): Progress {
  return { traces: state.traces, places: tracesOf(map.rects), solved: state.solved };
}

/** Solved: the region is in the list of solved cases. */
export function isSolved(region: string, solved: readonly SolvedCase[]): boolean {
  return solved.some((entry) => entry.region === region);
}

/** Ready: the map has at least one trace of the region, and every one of them is found. */
export function isReady(region: string, progress: Progress): boolean {
  const mine = progress.traces.filter((state) => progress.places[state.trace]?.region === region);
  return mine.length > 0 && mine.every((state) => state.found !== null);
}

/**
 * The pages a colleague says, by the name of its route: the source of a solved case says
 * "afterwards"; the source of a case that is ready and not solved says its answer; everyone
 * else, and a source before its case is ready, says the everyday pages.
 */
export function pagesIn(
  progress: Progress,
  route: string,
  everyday: readonly TextKey[],
  cases: readonly Case[] = CASES,
): readonly TextKey[] {
  const mine = cases.find((candidate) => candidate.source === route);
  if (mine === undefined) {
    return everyday;
  }
  if (isSolved(mine.region, progress.solved)) {
    return mine.after;
  }
  return isReady(mine.region, progress) ? mine.answer : everyday;
}

/**
 * The case a closing dialogue solves, or null: the dialogue was a colleague's, the colleague
 * is the source of a case, and the case was ready and not solved — so what was just read to
 * its end was the source's answer.
 */
export function answeredCase(
  dialogue: Dialogue,
  state: GameState,
  routes: readonly Route[],
  progress: Progress,
  cases: readonly Case[] = CASES,
): Case | null {
  if (dialogue.speaker !== 'mover') {
    return null;
  }
  const route = routes[state.movers[dialogue.index]?.route ?? -1]?.name;
  const mine = cases.find((candidate) => candidate.source === route);
  if (mine === undefined || isSolved(mine.region, progress.solved)) {
    return null;
  }
  return isReady(mine.region, progress) ? mine : null;
}

/**
 * The state with a case solved in this step: the region joins `solved` with the state's tick,
 * and overview grows by CASE_OVERVIEW and is full. Nothing else changes.
 */
export function solve(state: GameState, region: string): GameState {
  const max = state.overview.max + CASE_OVERVIEW;
  return {
    ...state,
    solved: [...state.solved, { region, at: state.tick }],
    overview: { current: max, max },
  };
}

/** The policy blocks of the journal: the solved cases' blocks, in the order they were solved. */
export function policyBlocks(
  solved: readonly SolvedCase[],
  cases: readonly Case[] = CASES,
): TextKey[] {
  return solved.flatMap((entry) => {
    const mine = cases.find((candidate) => candidate.region === entry.region);
    return mine === undefined ? [] : [mine.policy];
  });
}

/** The outcome line of a region's case when it is solved, or null. */
export function outcomeOf(
  region: string,
  solved: readonly SolvedCase[],
  cases: readonly Case[] = CASES,
): TextKey | null {
  const mine = cases.find((candidate) => candidate.region === region);
  return mine !== undefined && isSolved(region, solved) ? mine.outcome : null;
}
