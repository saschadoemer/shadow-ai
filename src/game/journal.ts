import { type TextKey, textKey } from '../text/text';
import { type GameInput, pressed } from './player';
import {
  type Captured,
  type GameState,
  JOURNAL_TABS,
  type JournalState,
  type JournalTab,
  SPECIES,
  type Species,
} from './state';

/**
 * The journal (gameplay.md §7, feature 0020): the only screen besides the game itself. A press
 * of `journal` opens it on the creatures; `left` and `right` turn its three tabs; a press of
 * `journal` closes it. While it is open nothing in the world is stepped — time passes, and
 * that is all. What a tab shows is derived from the state. Pure data and pure functions.
 */

/** A tab's title, and the line it shows while it has nothing. */
export interface TabText {
  readonly title: TextKey;
  readonly nothing: TextKey;
}

export const TAB_TEXT: Readonly<Record<JournalTab, TabText>> = {
  creatures: {
    title: textKey('journal.tab-creatures'),
    nothing: textKey('journal.no-creatures'),
  },
  cases: { title: textKey('journal.tab-cases'), nothing: textKey('journal.no-cases') },
  policy: { title: textKey('journal.tab-policy'), nothing: textKey('journal.no-policy') },
};

/** A species' entry: its name and what it is, what it lives on and what makes it go. */
export interface EntryText {
  readonly name: TextKey;
  readonly text: TextKey;
}

/** A literal over the species, so a new species does not compile until it has its entry. */
export const ENTRY_TEXT: Readonly<Record<Species, EntryText>> = {
  snippet: { name: textKey('creature.snippet-name'), text: textKey('creature.snippet-text') },
  mirage: { name: textKey('creature.mirage-name'), text: textKey('creature.mirage-text') },
  lurker: { name: textKey('creature.lurker-name'), text: textKey('creature.lurker-text') },
};

/** The words of a region's line on the cases tab (0022): `Spuren: 1 von 5`. */
export const CASE_TEXT = {
  traces: textKey('journal.traces'),
  of: textKey('journal.of'),
} as const;

/** The displayed names of the regions that have traces, by the region's id (0022). */
export const REGION_NAME: Readonly<Partial<Record<string, TextKey>>> = {
  sales: textKey('region.sales'),
  marketing: textKey('region.marketing'),
  support: textKey('region.support'),
  hr: textKey('region.hr'),
};

/** The entries of the creatures tab: every species captured at least once, in SPECIES order. */
export function entriesOf(captured: Captured): Species[] {
  return SPECIES.filter((species) => captured[species] > 0);
}

/** Two entries fit the screen: the creatures tab has pages of two (0038). */
export const ENTRIES_PER_PAGE = 2;

/** How many pages the creatures tab has: at least one, also while nothing is captured. */
export function entryPages(captured: Captured): number {
  return Math.max(1, Math.ceil(entriesOf(captured).length / ENTRIES_PER_PAGE));
}

/** The entries of one page of the creatures tab, in SPECIES order. */
export function entriesOn(captured: Captured, page: number): Species[] {
  return entriesOf(captured).slice(page * ENTRIES_PER_PAGE, (page + 1) * ENTRIES_PER_PAGE);
}

/**
 * The state after a press that opens the journal, or null when `journal` is not pressed: the
 * journal on its first tab, the tick grown, the input remembered. Nothing else changes,
 * whatever else the input holds: a figure in mid-step, a push and a lamp that is on stay as
 * they are and go on when the journal closes.
 */
export function openJournal(state: GameState, input: GameInput): GameState | null {
  if (!pressed(state.held, input, 'journal')) {
    return null;
  }
  return {
    ...state,
    tick: state.tick + 1,
    held: input,
    journal: { tab: JOURNAL_TABS[0], page: 0 },
  };
}

/**
 * One step with the journal open: the tick grows and the input is remembered. A press of
 * `journal` closes it. Otherwise a press of `right` alone turns to the next tab and a press of
 * `left` alone to the one before; at either end the tab stays. A turn to another tab opens it
 * on page 0. On the creatures tab a press of `down` alone turns to the next page and a press
 * of `up` alone to the one before; at either end the page stays (0038). Nothing else changes.
 */
export function stepJournal(state: GameState, journal: JournalState, input: GameInput): GameState {
  const stepped = { ...state, tick: state.tick + 1, held: input };
  if (pressed(state.held, input, 'journal')) {
    return { ...stepped, journal: null };
  }
  const turn =
    (pressed(state.held, input, 'right') ? 1 : 0) - (pressed(state.held, input, 'left') ? 1 : 0);
  const tab = JOURNAL_TABS[JOURNAL_TABS.indexOf(journal.tab) + turn] ?? journal.tab;
  if (tab !== journal.tab) {
    return { ...stepped, journal: { tab, page: 0 } };
  }
  if (tab !== 'creatures') {
    return { ...stepped, journal };
  }
  const leaf =
    (pressed(state.held, input, 'down') ? 1 : 0) - (pressed(state.held, input, 'up') ? 1 : 0);
  const last = entryPages(state.captured) - 1;
  const page = Math.min(Math.max(journal.page + leaf, 0), last);
  return { ...stepped, journal: { tab, page } };
}
