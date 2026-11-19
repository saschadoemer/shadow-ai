import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { CASES, type Case, type Progress } from '../../src/game/cases';
import { CAST, type Figure, figuresOf } from '../../src/game/cast';
import {
  type CaseHints,
  HINT_DONE,
  HINT_FIGURE,
  HINTS,
  hintOf,
  withHint,
} from '../../src/game/hints';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { GameState, SolvedCase, TraceState } from '../../src/game/state';
import type { Trace } from '../../src/game/trace';
import { createInitialState, newGame, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
const box = { x: 0, y: 0, width: 16, height: 16 };
/** Two traces of Sales, then two of Marketing, two of Support (0037) and two of HR (0040). */
const PLACES: readonly Trace[] = [
  { region: 'sales', box },
  { region: 'sales', box },
  { region: 'marketing', box },
  { region: 'marketing', box },
  { region: 'support', box },
  { region: 'support', box },
  { region: 'hr', box },
  { region: 'hr', box },
];
/** The progress with the traces of the given indices found and the given regions solved. */
const progress = (found: readonly number[], ...solved: readonly string[]): Progress => ({
  traces: PLACES.map(
    (_place, trace): TraceState => ({
      trace,
      light: 0,
      found: found.includes(trace) ? 10 : null,
    }),
  ),
  places: PLACES,
  solved: solved.map((region, n): SolvedCase => ({ region, at: 100 + n })),
});
const SALES = HINTS.sales as CaseHints;
const MARKETING = HINTS.marketing as CaseHints;
const SUPPORT = HINTS.support as CaseHints;
const HR = HINTS.hr as CaseHints;

describe('the hints (0033)', () => {
  it('are said by the intern, a member of the cast', () => {
    expect(HINT_FIGURE).toBe('intern');
    expect(CAST.map((member) => member.id)).toContain(HINT_FIGURE);
  });

  it('are three pages for every case, and for no region without a case', () => {
    expect(Object.keys(HINTS)).toStrictEqual(CASES.map((entry) => entry.region));
    expect(HINTS).toStrictEqual({
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
      support: {
        start: textKey('talk.intern-support-start'),
        traces: textKey('talk.intern-support-traces'),
        source: textKey('talk.intern-support-source'),
      },
      hr: {
        start: textKey('talk.intern-hr-start'),
        traces: textKey('talk.intern-hr-traces'),
        source: textKey('talk.intern-hr-source'),
      },
    });
    // No page sends the player for the lamp (0039): he has it.
    expect(HINT_DONE).toBe(textKey('talk.intern-done'));
  });
});

describe('the hint of a moment (0033)', () => {
  it('is the start of Sales while no trace of Sales is found', () => {
    expect(hintOf(progress([]))).toBe(SALES.start);
  });

  it('is what to look at while some traces of Sales are found and not all', () => {
    expect(hintOf(progress([0]))).toBe(SALES.traces);
    expect(hintOf(progress([1]))).toBe(SALES.traces);
  });

  it('is whom to ask once every trace of Sales is found and the case is not solved', () => {
    expect(hintOf(progress([0, 1]))).toBe(SALES.source);
  });

  it('stays with Sales whatever is found or solved in Marketing', () => {
    expect(hintOf(progress([2]))).toBe(SALES.start);
    expect(hintOf(progress([2, 3]))).toBe(SALES.start);
    expect(hintOf(progress([0, 2, 3]))).toBe(SALES.traces);
    expect(hintOf(progress([0, 1, 2, 3]))).toBe(SALES.source);
    expect(hintOf(progress([2, 3], 'marketing'))).toBe(SALES.start);
    expect(hintOf(progress([0, 2, 3], 'marketing'))).toBe(SALES.traces);
  });

  it('goes on to Marketing once Sales is solved, by the same rule', () => {
    expect(hintOf(progress([0, 1], 'sales'))).toBe(MARKETING.start);
    expect(hintOf(progress([0, 1, 2], 'sales'))).toBe(MARKETING.traces);
    expect(hintOf(progress([0, 1, 2, 3], 'sales'))).toBe(MARKETING.source);
  });

  it('goes on to Support once Sales and Marketing are solved, by the same rule (0037)', () => {
    const both = ['sales', 'marketing'] as const;
    expect(hintOf(progress([0, 1, 2, 3], ...both))).toBe(SUPPORT.start);
    expect(hintOf(progress([0, 1, 2, 3, 4], ...both))).toBe(SUPPORT.traces);
    expect(hintOf(progress([0, 1, 2, 3, 4, 5], ...both))).toBe(SUPPORT.source);
    // Whatever is found in Support, the earlier cases come first.
    expect(hintOf(progress([4, 5]))).toBe(SALES.start);
    expect(hintOf(progress([0, 1, 4, 5], 'sales'))).toBe(MARKETING.start);
  });

  it('goes on to HR once Sales, Marketing and Support are solved, by the same rule (0040)', () => {
    const three = ['sales', 'marketing', 'support'] as const;
    expect(hintOf(progress([0, 1, 2, 3, 4, 5], ...three))).toBe(HR.start);
    expect(hintOf(progress([0, 1, 2, 3, 4, 5, 7], ...three))).toBe(HR.traces);
    expect(hintOf(progress([0, 1, 2, 3, 4, 5, 6, 7], ...three))).toBe(HR.source);
    // Whatever is found in HR, the earlier cases come first.
    expect(hintOf(progress([6, 7]))).toBe(SALES.start);
    expect(hintOf(progress([0, 1, 2, 3, 6, 7], 'sales', 'marketing'))).toBe(SUPPORT.start);
  });

  it('is the last page once every case is solved, in any order', () => {
    const all = [0, 1, 2, 3, 4, 5, 6, 7];
    expect(hintOf(progress(all, 'sales', 'marketing', 'support', 'hr'))).toBe(HINT_DONE);
    expect(hintOf(progress(all, 'hr', 'support', 'marketing', 'sales'))).toBe(HINT_DONE);
    expect(hintOf(progress(all, 'marketing', 'hr', 'support', 'sales'))).toBe(HINT_DONE);
    // With the first three solved and HR not, the last page is not yet said.
    expect(hintOf(progress(all, 'sales', 'marketing', 'support'))).toBe(HR.source);
  });

  it('asks the cases in the order of the table it is given: the game passes its own', () => {
    const turned: readonly Case[] = [...CASES].reverse();
    expect(hintOf(progress([]), turned)).toBe(HR.start);
    expect(hintOf(progress([0]), turned)).toBe(HR.start);
    expect(hintOf(progress([], 'hr'), turned)).toBe(SUPPORT.start);
    expect(hintOf(progress([], 'hr', 'support'), turned)).toBe(MARKETING.start);
    expect(hintOf(progress([], 'hr', 'support', 'marketing'), turned)).toBe(SALES.start);
  });

  it('points to the start of a region that has no trace on the map', () => {
    const none: Progress = { traces: [], places: [], solved: [] };
    expect(hintOf(none)).toBe(SALES.start);
  });

  it('passes over a case without hints', () => {
    expect(hintOf(progress([]), CASES, { marketing: MARKETING })).toBe(MARKETING.start);
    expect(hintOf(progress([]), CASES, {})).toBe(HINT_DONE);
  });
});

describe('the intern speaks (0033)', () => {
  const figure = (id: string, x: number): Figure => ({
    id,
    x,
    y: 48,
    pages: [textKey('talk.officer-rules-1')],
  });

  it('gives the intern the hint as his one page, and leaves every other figure as it is', () => {
    const officer = figure('officer', 40);
    const intern = figure('intern', 80);
    const spoken = withHint([officer, intern], SALES.traces);
    expect(spoken[0]).toBe(officer);
    expect(spoken[1]).toStrictEqual({ ...intern, pages: [SALES.traces] });
    expect(withHint([officer], SALES.traces)).toStrictEqual([officer]);
  });

  /** The intern at (64, 48), the officer 96 px below him, and one trace of Sales. */
  const POINTS: readonly NamedPoint[] = [
    { name: 'figure:intern', x: 64, y: 48 },
    { name: 'figure:officer', x: 64, y: 144 },
  ];
  const RECTS: readonly NamedRect[] = [
    { name: 'trace:sales', x: 240, y: 32, width: 16, height: 16 },
  ];
  /** 20x12 cells of open floor; the spawn stands 40 px right of the intern. */
  const MAP: TileMap = grassMap(20, 12, { x: 104, y: 48 }, POINTS, RECTS);
  const start = createInitialState(MAP);
  /** What the figures say in a state, as `update` and the scene put it together. */
  const pagesIn = (state: GameState) => {
    const said = withHint(
      figuresOf(MAP.points),
      hintOf({
        traces: state.traces,
        places: [{ region: 'sales', box: { x: 240, y: 32, width: 16, height: 16 } }],
        solved: state.solved,
      }),
    );
    return Object.fromEntries(said.map((speaker) => [speaker.id, speaker.pages]));
  };

  it('opens a talk with him at a press, and the next press closes it: he has one page', () => {
    const opened = update(start, TALK, MAP);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    const closed = update(update(opened, NONE, MAP), TALK, MAP);
    expect(closed.dialogue).toBeNull();
  });

  it('changes nothing but what a talk changes: the two turn to each other', () => {
    const closed = update(update(update(start, TALK, MAP), NONE, MAP), TALK, MAP);
    expect(closed).toStrictEqual({
      ...start,
      tick: 3,
      held: TALK,
      player: { ...start.player, facing: 'left' },
      figures: [
        { figure: 0, facing: 'right' },
        { figure: 1, facing: 'down' },
      ],
    });
  });

  it('says where Sales is in a new game, and the officer her own pages (0039)', () => {
    // Past the card (0036).
    const fresh: GameState = { ...newGame(MAP), presented: 0 };
    expect(pagesIn(fresh)).toStrictEqual({
      intern: [SALES.start],
      officer: CAST[0]?.pages,
    });
    // The page the cast gives him is the same one.
    expect(CAST[1]?.pages).toStrictEqual([SALES.start]);
    // With the call closed, a press opens his talk and the next closes it.
    let state: GameState = { ...fresh, dialogue: null };
    state = update(state, TALK, MAP);
    expect(state.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    state = update(update(state, NONE, MAP), TALK, MAP);
    expect(state.dialogue).toBeNull();
  });

  it('says the hint of the moment, and the officer her own pages', () => {
    expect(pagesIn(start).intern).toStrictEqual([SALES.start]);
    expect(pagesIn(start).officer).toStrictEqual(CAST[0]?.pages);
    const ready: GameState = { ...start, traces: [{ trace: 0, light: 0, found: 5 }] };
    expect(pagesIn(ready).intern).toStrictEqual([SALES.source]);
    const solved: GameState = { ...ready, solved: [{ region: 'sales', at: 9 }] };
    expect(pagesIn(solved).intern).toStrictEqual([MARKETING.start]);
  });

  it('survives a JSON round trip with his talk open (INV-1)', () => {
    const opened = update(start, TALK, MAP);
    expect(JSON.parse(JSON.stringify(opened))).toStrictEqual(opened);
  });
});
