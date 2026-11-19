import { type TextKey, textKey } from '../text/text';
import { CASES, type Case, isReady, isSolved, type Progress } from './cases';
import type { Figure } from './cast';

/**
 * The hints (world.md §3, feature 0033): the intern in the break room says where the next step
 * is. He says exactly one page, picked from how far the player has come: before the lamp, per
 * case where the room is, what to look at and whom to ask, and at the end that he knows no
 * more. He does not see the shadow: he speaks of rooms, devices and people. The hint is
 * derived from the state on every call and kept nowhere. Pure data and pure functions.
 */

/** The figure of the cast that says the hint. */
export const HINT_FIGURE = 'intern';

/** The three pages of a case, one for each stand of its traces. */
export interface CaseHints {
  /** No trace of the region is found: where the room is and what is odd there. */
  readonly start: TextKey;
  /** Some traces are found and not all: what to look at. */
  readonly traces: TextKey;
  /** All are found and the case is not solved: whom to ask. */
  readonly source: TextKey;
}

/** The hints of the cases, by the region of the case. Every case has an entry; a test says so. */
export const HINTS: Readonly<Partial<Record<string, CaseHints>>> = {
  sales: {
    start: textKey('talk.intern-sales-start'),
    traces: textKey('talk.intern-sales-traces'),
    source: textKey('talk.intern-sales-source'),
  },
  marketing: {
    start: textKey('talk.intern-marketing-start'),
    traces: textKey('talk.intern-marketing-traces'),
    source: textKey('talk.intern-marketing-source'),
  },
};

/** The page while the player has no lamp. */
export const HINT_LAMP: TextKey = textKey('talk.intern-lamp');
/** The page when every case is solved. */
export const HINT_DONE: TextKey = textKey('talk.intern-done');

/**
 * The hint of this moment. Without the lamp: HINT_LAMP. Else the cases are asked in their
 * order, and the first that is not solved decides, whatever is found in a later one: its
 * `start` page while no trace of its region is found, its `traces` page while some are and
 * not all, its `source` page once it is ready. With every case solved: HINT_DONE.
 */
export function hintOf(
  lampOwned: boolean,
  progress: Progress,
  cases: readonly Case[] = CASES,
  hints: Readonly<Partial<Record<string, CaseHints>>> = HINTS,
): TextKey {
  if (!lampOwned) {
    return HINT_LAMP;
  }
  for (const { region } of cases) {
    const pages = hints[region];
    if (pages === undefined || isSolved(region, progress.solved)) {
      continue;
    }
    if (isReady(region, progress)) {
      return pages.source;
    }
    const found = progress.traces.some(
      (state) => state.found !== null && progress.places[state.trace]?.region === region,
    );
    return found ? pages.traces : pages.start;
  }
  return HINT_DONE;
}

/** The figures as they speak with the hint of this moment: HINT_FIGURE says that one page. */
export function withHint(figures: readonly Figure[], hint: TextKey): readonly Figure[] {
  return figures.map((figure) =>
    figure.id === HINT_FIGURE ? { ...figure, pages: [hint] } : figure,
  );
}
