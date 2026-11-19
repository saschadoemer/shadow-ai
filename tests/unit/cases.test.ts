import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import {
  answeredCase,
  CASE_OVERVIEW,
  CASES,
  type Case,
  clearRegion,
  earn,
  isReady,
  isSolved,
  outcomeOf,
  type Progress,
  pagesIn,
  policyBlocks,
  progressOf,
  solve,
} from '../../src/game/cases';
import { routesOf } from '../../src/game/mover';
import { CASE_NOTICE_STEPS, noticeOf } from '../../src/game/notice';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import type { CreatureState, GameState, TraceState } from '../../src/game/state';
import { speakerOf, speakersOf } from '../../src/game/talk';
import type { Trace } from '../../src/game/trace';
import { createInitialState, update } from '../../src/game/update';
import { UPGRADES } from '../../src/game/world';
import { type TextKey, textKey, textOf } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
const EVERYDAY = [textKey('talk.sales-everyday')];
const ANSWER = [textKey('talk.sales-source-1'), textKey('talk.sales-source-2')];
const AFTER = [textKey('talk.sales-after')];
/** The colleague of Sales on a route of two points, waiting ten seconds on the first. */
const SOURCE: readonly NamedPoint[] = [
  { name: 'person:sales:1', x: 64, y: 48, pause: 600 },
  { name: 'person:sales:2', x: 128, y: 48 },
];
const trace = (x: number): NamedRect => ({ name: 'trace:sales', x, y: 80, width: 16, height: 16 });
/** 20x12 cells of open floor: the player 40 px right of the source, two traces of Sales. */
const MAP: TileMap = grassMap(20, 12, { x: 104, y: 48 }, SOURCE, [trace(160), trace(192)]);
const found = (...ticks: readonly (number | null)[]): TraceState[] =>
  ticks.map((tick, index) => ({ trace: index, light: 0, found: tick }));
/** The start of MAP with its two traces found, or not, as given. */
const withTraces = (...ticks: readonly (number | null)[]): GameState => ({
  ...createInitialState(MAP),
  traces: found(...ticks),
});
const run = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, MAP), start);
/** The pages of the speaker of the state's open dialogue. */
const spoken = (state: GameState) =>
  state.dialogue === null
    ? null
    : speakerOf(
        state.dialogue,
        speakersOf([], state.movers, routesOf(MAP.points), undefined, progressOf(state, MAP)),
      )?.pages;
/** Both traces were found long ago: the game is at step 1000, and no notice of a find is due. */
const T0 = 1000;
const READY: GameState = { ...withTraces(10, 20), tick: T0 };

describe('the cases (0024)', () => {
  it('holds the case of Sales first: its source, its answer, its afterwards, its outcome, its block', () => {
    expect(CASES[0]).toStrictEqual({
      region: 'sales',
      source: 'person:sales',
      answer: ANSWER,
      after: AFTER,
      outcome: textKey('case.sales-outcome'),
      policy: textKey('policy.sales'),
    });
    expect(CASE_OVERVIEW).toBe(1);
  });
});

describe('a case that is ready (0024)', () => {
  const places: Trace[] = [
    { region: 'sales', box: { x: 0, y: 0, width: 16, height: 16 } },
    { region: 'sales', box: { x: 16, y: 0, width: 16, height: 16 } },
    { region: 'hr', box: { x: 32, y: 0, width: 16, height: 16 } },
  ];
  const progress = (...ticks: readonly (number | null)[]): Progress => ({
    traces: found(...ticks),
    places,
    solved: [],
  });

  it('is ready exactly when every trace of its region on the map is found', () => {
    expect(isReady('sales', progress(null, null, null))).toBe(false);
    expect(isReady('sales', progress(10, null, 30))).toBe(false);
    expect(isReady('sales', progress(10, 20, null))).toBe(true);
    expect(isReady('hr', progress(10, 20, null))).toBe(false);
    expect(isReady('hr', progress(null, null, 30))).toBe(true);
  });

  it('is never ready for a region without traces on the map', () => {
    expect(isReady('marketing', progress(10, 20, 30))).toBe(false);
    expect(isReady('sales', { traces: [], places: [], solved: [] })).toBe(false);
  });

  it('with four of five found is not ready, and with five it is', () => {
    const five: Trace[] = [0, 1, 2, 3, 4].map((n) => ({
      region: 'sales',
      box: { x: 16 * n, y: 0, width: 16, height: 16 },
    }));
    const of = (...ticks: readonly (number | null)[]): Progress => ({
      traces: found(...ticks),
      places: five,
      solved: [],
    });
    expect(isReady('sales', of(1, 2, 3, 4, null))).toBe(false);
    expect(isReady('sales', of(1, 2, 3, 4, 5))).toBe(true);
  });

  it('is solved when its region is in the list', () => {
    expect(isSolved('sales', [])).toBe(false);
    expect(isSolved('sales', [{ region: 'sales', at: 9 }])).toBe(true);
    expect(isSolved('hr', [{ region: 'sales', at: 9 }])).toBe(false);
  });
});

describe('what a colleague says (0024)', () => {
  const places: Trace[] = [{ region: 'sales', box: { x: 0, y: 0, width: 16, height: 16 } }];
  const at = (tick: number | null, solved = false): Progress => ({
    traces: found(tick),
    places,
    solved: solved ? [{ region: 'sales', at: 50 }] : [],
  });

  it('is the everyday line of the source while its case is not ready', () => {
    expect(pagesIn(at(null), 'person:sales', EVERYDAY)).toBe(EVERYDAY);
  });

  it("is the source's answer while the case is ready and not solved", () => {
    expect(pagesIn(at(10), 'person:sales', EVERYDAY)).toStrictEqual(ANSWER);
  });

  it('is "afterwards" once the case is solved', () => {
    expect(pagesIn(at(10, true), 'person:sales', EVERYDAY)).toStrictEqual(AFTER);
  });

  it('stays the everyday line of everyone who is no source, in all three states', () => {
    const lines = [textKey('talk.reception-everyday')];
    for (const progress of [at(null), at(10), at(10, true)]) {
      // The colleague of Marketing is a source since 0028.
      for (const route of ['person:reception', 'person:support']) {
        expect(pagesIn(progress, route, lines)).toBe(lines);
      }
    }
  });

  it('reads the cases it is given: the game passes its own', () => {
    const cases: readonly Case[] = [{ ...(CASES[0] as Case), source: 'person:hr' }];
    expect(pagesIn(at(10), 'person:hr', EVERYDAY, cases)).toStrictEqual(ANSWER);
    expect(pagesIn(at(10), 'person:sales', EVERYDAY, cases)).toBe(EVERYDAY);
  });

  it('reaches the dialogue through the speakers of the step', () => {
    expect(spoken(run(withTraces(10, null), TALK))).toStrictEqual(EVERYDAY);
    expect(spoken(run(READY, TALK))).toStrictEqual(ANSWER);
    const solved: GameState = { ...READY, solved: [{ region: 'sales', at: 1 }] };
    expect(spoken(run(solved, TALK))).toStrictEqual(AFTER);
  });
});

describe('solving the case (0024)', () => {
  it('starts with no case solved', () => {
    expect(createInitialState(MAP).solved).toStrictEqual([]);
  });

  it('opens the answer on page 0, turns to page 1, and the press on page 1 solves', () => {
    const opened = run(READY, TALK);
    expect(opened.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
    expect(opened.solved).toStrictEqual([]);
    const second = run(opened, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 1 });
    expect(second.solved).toStrictEqual([]);
    const closed = run(second, NONE, TALK);
    expect(closed.tick).toBe(T0 + 5);
    expect(closed.dialogue).toBeNull();
    expect(closed.solved).toStrictEqual([{ region: 'sales', at: T0 + 5 }]);
    expect(closed.overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('changes nothing in that step but the tick, the input, the dialogue, solved and overview', () => {
    const second = run(READY, TALK, NONE, TALK, NONE);
    const closed = update(second, TALK, MAP);
    expect(closed).toStrictEqual({
      ...second,
      tick: T0 + 5,
      held: TALK,
      dialogue: null,
      solved: [{ region: 'sales', at: T0 + 5 }],
      overview: { current: 6, max: 6 },
    });
  });

  it('fills overview from any stand: two of five become six of six', () => {
    const hurt: GameState = { ...READY, overview: { current: 2, max: 5 } };
    expect(run(hurt, TALK, NONE, TALK, NONE, TALK).overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('solves nothing while the answer is open: 600 steps with every key but talk', () => {
    const opened = run(READY, TALK);
    const others: GameInput = {
      ...NONE,
      up: true,
      down: true,
      left: true,
      right: true,
      lamp: true,
    };
    let state = opened;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, others, MAP);
    }
    expect(state.solved).toStrictEqual([]);
    expect(state.dialogue).toStrictEqual(opened.dialogue);
    expect(state.overview).toStrictEqual(opened.overview);
  });

  it('solves nothing by a held key: it turns one page', () => {
    const held = run(READY, TALK, TALK, TALK, TALK);
    expect(held.dialogue).toStrictEqual({ speaker: 'mover', index: 0, page: 0 });
    expect(held.solved).toStrictEqual([]);
  });

  it('solves nothing when the everyday line is closed', () => {
    const closed = run(withTraces(10, null), TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.solved).toStrictEqual([]);
    expect(closed.overview).toStrictEqual({ current: 5, max: 5 });
  });

  it('solves a case once: closing "afterwards" changes neither solved nor overview', () => {
    const solved = run(READY, TALK, NONE, TALK, NONE, TALK);
    const again = run(solved, NONE, TALK);
    expect(spoken(again)).toStrictEqual(AFTER);
    const closed = run(again, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.solved).toStrictEqual(solved.solved);
    expect(closed.overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('is what answeredCase and solve say', () => {
    const second = run(READY, TALK, NONE, TALK, NONE);
    const routes = routesOf(MAP.points);
    const dialogue = second.dialogue ?? { speaker: 'mover', index: 0, page: 1 };
    expect(answeredCase(dialogue, second, routes, progressOf(second, MAP))?.region).toBe('sales');
    const figure = { speaker: 'figure', index: 0, page: 0 } as const;
    expect(answeredCase(figure, second, routes, progressOf(second, MAP))).toBeNull();
    const notReady = withTraces(10, null);
    expect(answeredCase(dialogue, notReady, routes, progressOf(notReady, MAP))).toBeNull();
    expect(solve({ ...second, tick: 40 }, 'sales')).toStrictEqual({
      ...second,
      tick: 40,
      solved: [{ region: 'sales', at: 40 }],
      overview: { current: 6, max: 6 },
    });
  });

  it('keeps the solved case through the wake', () => {
    const solved = run(READY, TALK, NONE, TALK, NONE, TALK);
    const woken = update({ ...solved, dark: 44 }, NONE, MAP);
    expect(woken.dark).toBe(45);
    expect(woken.solved).toStrictEqual([{ region: 'sales', at: T0 + 5 }]);
    expect(woken.overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('survives a JSON round trip with the case solved (INV-1)', () => {
    const solved = run(READY, TALK, NONE, TALK, NONE, TALK);
    expect(JSON.parse(JSON.stringify(solved))).toStrictEqual(solved);
  });
});

describe('the notice of a solved case (0024)', () => {
  const solved = run(READY, TALK, NONE, TALK, NONE, TALK);
  const key = textKey('notice.case-solved');

  it('is shown for 120 steps from the solving step and not after', () => {
    expect(CASE_NOTICE_STEPS).toBe(120);
    expect(noticeOf(run(READY, TALK, NONE, TALK, NONE))).toBeNull();
    expect(noticeOf(solved)).toBe(key);
    expect(noticeOf({ ...solved, tick: T0 + 5 + 119 })).toBe(key);
    expect(noticeOf({ ...solved, tick: T0 + 5 + 120 })).toBeNull();
  });

  it('comes before a found trace and after a wall that holds', () => {
    // Both traces found a step before the case was solved: both notices are due.
    const both: GameState = { ...solved, traces: found(T0 + 4, T0 + 4) };
    expect(noticeOf(both)).toBe(key);
    expect(noticeOf({ ...both, solved: [] })).toBe(textKey('notice.trace-found'));
    const holding: GameState = {
      ...both,
      lamp: { on: true, strength: 1, used: true },
      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    };
    expect(noticeOf(holding)).toBe(textKey('notice.shadow-too-dense'));
  });
});

describe('what the journal takes from the cases (0024)', () => {
  it('gives a solved case its outcome and an unsolved one none', () => {
    expect(outcomeOf('sales', [])).toBeNull();
    expect(outcomeOf('sales', [{ region: 'sales', at: 5 }])).toBe(textKey('case.sales-outcome'));
    expect(outcomeOf('hr', [{ region: 'hr', at: 5 }])).toBeNull();
  });

  it('gives the policy one block per solved case, in the order they were solved', () => {
    expect(policyBlocks([])).toStrictEqual([]);
    expect(policyBlocks([{ region: 'sales', at: 5 }])).toStrictEqual([textKey('policy.sales')]);
    const two: readonly Case[] = [
      { ...(CASES[0] as Case), region: 'hr', policy: textKey('policy.sales') },
      CASES[0] as Case,
    ];
    expect(
      policyBlocks(
        [
          { region: 'sales', at: 5 },
          { region: 'hr', at: 9 },
        ],
        two,
      ),
    ).toHaveLength(2);
  });
});

describe('what goes with the shadow of a solved region (0025)', () => {
  const rect = (name: string, x: number, y: number, width: number, height: number): NamedRect => ({
    name,
    x,
    y,
    width,
    height,
  });
  /**
   * 20x12 cells of open floor. Sales is the cells (2, 2) to (7, 7), Marketing the cells (12, 2)
   * to (17, 7); each has a shadow wall on the upper edge of its first cell.
   */
  const ROOMS: TileMap = grassMap(
    20,
    12,
    { x: 160, y: 160 },
    [],
    [
      rect('region:sales', 32, 32, 96, 96),
      rect('region:marketing', 192, 32, 96, 96),
      rect('shadow:sales', 32, 32, 16, 4),
      rect('shadow:marketing', 192, 32, 16, 4),
    ],
  );
  const snippet = (home: { x: number; y: number }, at = home): CreatureState => ({
    species: 'snippet',
    x: at.x,
    y: at.y,
    light: 0,
    home,
  });
  /** At home in Sales and out of it; at home outside and standing in Sales; at home in Marketing. */
  const LEFT_HOME = snippet({ x: 80, y: 80 }, { x: 300, y: 170 });
  const VISITOR = snippet({ x: 160, y: 150 }, { x: 80, y: 80 });
  const NEIGHBOUR = snippet({ x: 240, y: 80 });
  const start: GameState = {
    ...createInitialState(ROOMS),
    creatures: [LEFT_HOME, VISITOR, NEIGHBOUR],
    captured: { snippet: 2, mirage: 0, lurker: 0 },
  };

  it('starts with both walls standing', () => {
    expect(start.shadowWalls.map((wall) => wall.wall)).toStrictEqual([0, 1]);
  });

  it('removes every standing wall of the region and leaves the walls of the other regions', () => {
    expect(clearRegion(start, 'sales', ROOMS).shadowWalls).toStrictEqual([
      { wall: 1, lit: false, light: 0 },
    ]);
    expect(clearRegion(start, 'marketing', ROOMS).shadowWalls).toStrictEqual([
      { wall: 0, lit: false, light: 0 },
    ]);
  });

  it('removes a wall that is giving way, and none where the wall was lifted before', () => {
    const giving: GameState = { ...start, shadowWalls: [{ wall: 0, lit: true, light: 30 }] };
    expect(clearRegion(giving, 'sales', ROOMS).shadowWalls).toStrictEqual([]);
    const lifted: GameState = { ...start, shadowWalls: [{ wall: 1, lit: false, light: 0 }] };
    expect(clearRegion(lifted, 'sales', ROOMS).shadowWalls).toStrictEqual(lifted.shadowWalls);
  });

  it('removes every creature at home in the region, wherever it is, and keeps the others', () => {
    expect(clearRegion(start, 'sales', ROOMS).creatures).toStrictEqual([VISITOR, NEIGHBOUR]);
    expect(clearRegion(start, 'marketing', ROOMS).creatures).toStrictEqual([LEFT_HOME, VISITOR]);
  });

  it('counts the left and the upper edge of the area to it, and not the right or the lower', () => {
    const edges = [
      snippet({ x: 32, y: 32 }),
      snippet({ x: 127.5, y: 127.5 }),
      snippet({ x: 128, y: 80 }),
      snippet({ x: 80, y: 128 }),
    ];
    const cleared = clearRegion({ ...start, creatures: edges }, 'sales', ROOMS);
    expect(cleared.creatures).toStrictEqual([edges[2], edges[3]]);
  });

  it('captures nothing, and changes nothing else', () => {
    expect(clearRegion(start, 'sales', ROOMS)).toStrictEqual({
      ...start,
      shadowWalls: [{ wall: 1, lit: false, light: 0 }],
      creatures: [VISITOR, NEIGHBOUR],
    });
    expect(clearRegion(start, 'sales', ROOMS).captured).toStrictEqual({
      snippet: 2,
      mirage: 0,
      lurker: 0,
    });
  });

  it('removes the creatures of every area of a region with two', () => {
    const two = grassMap(
      20,
      12,
      { x: 160, y: 160 },
      [],
      [rect('region:meeting-rooms', 0, 0, 32, 32), rect('region:meeting-rooms', 64, 0, 32, 48)],
    );
    const creatures = [
      snippet({ x: 8, y: 8 }),
      snippet({ x: 48, y: 8 }),
      snippet({ x: 72, y: 40 }),
    ];
    const cleared = clearRegion({ ...createInitialState(two), creatures }, 'meeting-rooms', two);
    expect(cleared.creatures).toStrictEqual([creatures[1]]);
  });

  it('changes nothing on a map without areas and walls, or for a region the map does not have', () => {
    const state: GameState = { ...createInitialState(MAP), creatures: [VISITOR] };
    expect(clearRegion(state, 'sales', MAP)).toStrictEqual(state);
    expect(clearRegion(start, 'hr', ROOMS)).toStrictEqual(start);
  });

  it('does not change its arguments', () => {
    const before = JSON.stringify(start);
    clearRegion(start, 'sales', ROOMS);
    expect(JSON.stringify(start)).toBe(before);
  });
});

describe('the case of Marketing (0028)', () => {
  const SALES_EVERYDAY = [textKey('talk.sales-everyday')];
  const MARKETING_EVERYDAY = [textKey('talk.marketing-everyday')];
  const MARKETING_ANSWER = [textKey('talk.marketing-source-1'), textKey('talk.marketing-source-2')];
  const MARKETING_AFTER = [textKey('talk.marketing-after')];
  /** Both sources, each waiting ten seconds on its first point, 96 px apart. */
  const SOURCES: readonly NamedPoint[] = [
    { name: 'person:sales:1', x: 64, y: 48, pause: 600 },
    { name: 'person:sales:2', x: 128, y: 48 },
    { name: 'person:marketing:1', x: 64, y: 144, pause: 600 },
    { name: 'person:marketing:2', x: 128, y: 144 },
  ];
  const rect = (name: string, x: number, y: number): NamedRect => ({
    name,
    x,
    y,
    width: 16,
    height: 16,
  });
  /** 20x12 cells of open floor: two traces of Sales, then two of Marketing. */
  const BOTH: TileMap = grassMap(20, 12, { x: 104, y: 48 }, SOURCES, [
    rect('trace:sales', 240, 32),
    rect('trace:sales', 272, 32),
    rect('trace:marketing', 240, 128),
    rect('trace:marketing', 272, 128),
  ]);
  /** The start of BOTH at step 1000 with its four traces found, or not, as given. */
  const having = (...ticks: readonly (number | null)[]): GameState => ({
    ...createInitialState(BOTH),
    tick: T0,
    traces: found(...ticks),
  });
  /** The figure 40 px right of the colleague of Sales, or of the colleague of Marketing. */
  const beside = (state: GameState, source: 'sales' | 'marketing'): GameState => ({
    ...state,
    player: { ...state.player, x: 104, y: source === 'sales' ? 48 : 144 },
  });
  const step = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
    inputs.reduce((state, input) => update(state, input, BOTH), start);
  /** Three presses of talk: the answer opens, turns to its second page and closes. */
  const answer = (start: GameState): GameState => step(start, TALK, NONE, TALK, NONE, TALK, NONE);
  const said = (state: GameState) =>
    state.dialogue === null
      ? null
      : speakerOf(
          state.dialogue,
          speakersOf([], state.movers, routesOf(BOTH.points), undefined, progressOf(state, BOTH)),
        )?.pages;

  it('is the second case, after Sales: its source, its answer, its afterwards, its outcome, its block', () => {
    // Support is the third (0037).
    expect(CASES.slice(0, 2).map((entry) => entry.region)).toStrictEqual(['sales', 'marketing']);
    expect(CASES[1]).toStrictEqual({
      region: 'marketing',
      source: 'person:marketing',
      answer: MARKETING_ANSWER,
      after: MARKETING_AFTER,
      outcome: textKey('case.marketing-outcome'),
      policy: textKey('policy.marketing'),
    });
  });

  it('gives each source its answer only when its own case is ready', () => {
    const marketing = having(null, null, 10, 20);
    expect(said(step(beside(marketing, 'marketing'), TALK))).toStrictEqual(MARKETING_ANSWER);
    expect(said(step(beside(marketing, 'sales'), TALK))).toStrictEqual(SALES_EVERYDAY);
    const sales = having(10, 20, null, null);
    expect(said(step(beside(sales, 'marketing'), TALK))).toStrictEqual(MARKETING_EVERYDAY);
    expect(said(step(beside(sales, 'sales'), TALK))).toStrictEqual(ANSWER);
    // One trace of Marketing is missing: the everyday line, whatever is found in Sales.
    const almost = having(10, 20, 30, null);
    expect(said(step(beside(almost, 'marketing'), TALK))).toStrictEqual(MARKETING_EVERYDAY);
  });

  it('says "afterwards" once its case is solved, and Sales still its everyday line', () => {
    const solved = answer(beside(having(null, null, 10, 20), 'marketing'));
    expect(said(step(solved, TALK))).toStrictEqual(MARKETING_AFTER);
    expect(said(step(beside(solved, 'sales'), TALK))).toStrictEqual(SALES_EVERYDAY);
  });

  it('is solved first when the player solves it first: six of six, then seven of seven', () => {
    const first = answer(beside(having(10, 20, 30, 40), 'marketing'));
    expect(first.solved).toStrictEqual([{ region: 'marketing', at: T0 + 5 }]);
    expect(first.overview).toStrictEqual({ current: 6, max: 6 });
    const second = answer(beside(first, 'sales'));
    expect(second.solved).toStrictEqual([
      { region: 'marketing', at: T0 + 5 },
      { region: 'sales', at: T0 + 11 },
    ]);
    expect(second.overview).toStrictEqual({ current: 7, max: 7 });
  });

  it('is solved second when Sales is solved first', () => {
    const first = answer(beside(having(10, 20, 30, 40), 'sales'));
    expect(first.solved).toStrictEqual([{ region: 'sales', at: T0 + 5 }]);
    const second = answer(beside(first, 'marketing'));
    expect(second.solved.map((entry) => entry.region)).toStrictEqual(['sales', 'marketing']);
    expect(second.overview).toStrictEqual({ current: 7, max: 7 });
  });

  it('gives the journal its outcome and its block, the blocks in the order they were solved', () => {
    const marketing = [{ region: 'marketing', at: 5 }];
    expect(outcomeOf('marketing', [])).toBeNull();
    expect(outcomeOf('marketing', marketing)).toBe(textKey('case.marketing-outcome'));
    expect(outcomeOf('sales', marketing)).toBeNull();
    expect(policyBlocks(marketing)).toStrictEqual([textKey('policy.marketing')]);
    expect(policyBlocks([...marketing, { region: 'sales', at: 9 }])).toStrictEqual([
      textKey('policy.marketing'),
      textKey('policy.sales'),
    ]);
    expect(policyBlocks([{ region: 'sales', at: 5 }, ...marketing])).toStrictEqual([
      textKey('policy.sales'),
      textKey('policy.marketing'),
    ]);
  });
});

describe('the upgrade a case earns (0029)', () => {
  /** Both sources, each waiting ten seconds on its first point, 96 px apart. */
  const SOURCES: readonly NamedPoint[] = [
    { name: 'person:sales:1', x: 64, y: 48, pause: 600 },
    { name: 'person:sales:2', x: 128, y: 48 },
    { name: 'person:marketing:1', x: 64, y: 144, pause: 600 },
    { name: 'person:marketing:2', x: 128, y: 144 },
  ];
  /** 20x12 cells of open floor: one trace of Sales, one of Marketing. */
  const BOTH: TileMap = grassMap(20, 12, { x: 104, y: 48 }, SOURCES, [
    { name: 'trace:sales', x: 240, y: 32, width: 16, height: 16 },
    { name: 'trace:marketing', x: 240, y: 128, width: 16, height: 16 },
  ]);
  /** Both traces found long ago: both cases are ready. */
  const ready: GameState = { ...createInitialState(BOTH), tick: T0, traces: found(10, 20) };
  /** The figure 40 px right of the colleague of Sales, or of the colleague of Marketing. */
  const beside = (state: GameState, source: 'sales' | 'marketing'): GameState => ({
    ...state,
    player: { ...state.player, x: 104, y: source === 'sales' ? 48 : 144 },
  });
  const step = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
    inputs.reduce((state, input) => update(state, input, BOTH), start);
  /** Three presses of talk: the pages of a colleague open, turn and close. */
  const talk = (start: GameState): GameState => step(start, TALK, NONE, TALK, NONE, TALK, NONE);

  it('is the upgrade of the region, with a strength one above the base', () => {
    const earned = earn(ready, 'marketing');
    expect(earned).toStrictEqual({
      ...ready,
      upgrades: ['wide-cone'],
      lamp: { ...ready.lamp, strength: 2 },
    });
    expect(ready.upgrades).toStrictEqual([]);
  });

  it('is nothing in a region without an upgrade: the state itself', () => {
    expect(earn(ready, 'sales')).toBe(ready);
    expect(earn(ready, 'reception')).toBe(ready);
    expect(earn(ready, 'cellar')).toBe(ready);
  });

  it('is never earned twice', () => {
    const once = earn(ready, 'marketing');
    expect(earn(once, 'marketing')).toBe(once);
  });

  it('holds for every upgrade of the table: the second makes a strength of 3', () => {
    const second = earn(earn(ready, 'marketing'), 'hr');
    expect(second.upgrades).toStrictEqual(['wide-cone', 'filter']);
    expect(second.lamp.strength).toBe(3);
    // The strength follows from how many upgrades there are, not from which.
    expect(earn(ready, 'hr').lamp.strength).toBe(2);
    expect(earn(ready, 'hr').upgrades).toStrictEqual(['filter']);
  });

  it('reads the table it is given: the game passes its own', () => {
    const table = [{ id: 'battery', earnedIn: 'sales' }];
    expect(earn(ready, 'sales', table).upgrades).toStrictEqual(['battery']);
    expect(earn(ready, 'marketing', table)).toBe(ready);
  });

  it('comes with the step that solves Marketing: the wider cone and a strength of 2', () => {
    const before = step(beside(ready, 'marketing'), TALK, NONE, TALK, NONE);
    expect(before.upgrades).toStrictEqual([]);
    expect(before.lamp.strength).toBe(1);
    const solved = update(before, TALK, BOTH);
    expect(solved.solved).toStrictEqual([{ region: 'marketing', at: T0 + 5 }]);
    expect(solved.upgrades).toStrictEqual(['wide-cone']);
    expect(solved.lamp.strength).toBe(2);
    expect(solved.overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('does not come with the step that solves Sales', () => {
    const solved = talk(beside(ready, 'sales'));
    expect(solved.solved).toStrictEqual([{ region: 'sales', at: T0 + 5 }]);
    expect(solved.upgrades).toStrictEqual([]);
    expect(solved.lamp.strength).toBe(1);
  });

  it('is the same in either order of the two cases', () => {
    const marketingFirst = talk(beside(talk(beside(ready, 'marketing')), 'sales'));
    const salesFirst = talk(beside(talk(beside(ready, 'sales')), 'marketing'));
    for (const state of [marketingFirst, salesFirst]) {
      expect(state.solved).toHaveLength(2);
      expect(state.upgrades).toStrictEqual(['wide-cone']);
      expect(state.lamp.strength).toBe(2);
    }
  });

  it('is not earned again by a talk with the source of the solved case', () => {
    const solved = talk(beside(ready, 'marketing'));
    // "Afterwards" is one page: a press opens it, the next closes it.
    const again = step(solved, TALK, NONE, TALK, NONE);
    expect(again.dialogue).toBeNull();
    expect(again.solved).toStrictEqual(solved.solved);
    expect(again.upgrades).toStrictEqual(['wide-cone']);
    expect(again.lamp.strength).toBe(2);
  });

  it('is never earned in a region without a case', () => {
    const without = UPGRADES.filter(
      (upgrade) => !CASES.some((entry) => entry.region === upgrade.earnedIn),
    ).map((upgrade) => upgrade.id);
    expect(without).toStrictEqual(['filter']);
    const all = talk(beside(talk(beside(ready, 'marketing')), 'sales'));
    expect(all.upgrades).not.toContain('filter');
  });

  it('survives a JSON round trip with the upgrade earned (INV-1)', () => {
    const solved = talk(beside(ready, 'marketing'));
    expect(JSON.parse(JSON.stringify(solved))).toStrictEqual(solved);
  });
});

describe('Harmonic in the case of Sales (0036)', () => {
  /** Whether a page of these names the product, in either language. */
  const named = (keys: readonly TextKey[]): boolean =>
    keys.some((key) =>
      (['de', 'en'] as const).some((language) => textOf(key, language).includes('Harmonic')),
    );

  it('is named by the source on the page after the case, and on no page before it', () => {
    const sales = CASES[0];
    expect(sales?.region).toBe('sales');
    expect(named(EVERYDAY)).toBe(false);
    expect(named(sales?.answer ?? [])).toBe(false);
    expect(sales?.after).toStrictEqual(AFTER);
    expect(named(AFTER)).toBe(true);
  });
});

describe('the case of Support (0037)', () => {
  type Region = 'sales' | 'marketing' | 'support';
  const REGIONS_IN_ORDER: readonly Region[] = ['sales', 'marketing', 'support'];
  const EVERYDAY_OF: Readonly<Record<Region, readonly TextKey[]>> = {
    sales: [textKey('talk.sales-everyday')],
    marketing: [textKey('talk.marketing-everyday')],
    support: [textKey('talk.support-everyday')],
  };
  const SUPPORT_ANSWER = [textKey('talk.support-source-1'), textKey('talk.support-source-2')];
  const SUPPORT_AFTER = [textKey('talk.support-after')];
  const ROW: Readonly<Record<Region, number>> = { sales: 48, marketing: 96, support: 144 };
  /** The three sources, each waiting ten seconds on its first point, 48 px apart. */
  const SOURCES: readonly NamedPoint[] = REGIONS_IN_ORDER.flatMap((region) => [
    { name: `person:${region}:1`, x: 64, y: ROW[region], pause: 600 },
    { name: `person:${region}:2`, x: 128, y: ROW[region] },
  ]);
  /** 20x12 cells of open floor: two traces of each region, in the order of the cases. */
  const THREE: TileMap = grassMap(
    20,
    12,
    { x: 104, y: 48 },
    SOURCES,
    REGIONS_IN_ORDER.flatMap((region): NamedRect[] =>
      [240, 272].map((x) => ({
        name: `trace:${region}`,
        x,
        y: ROW[region] - 16,
        width: 16,
        height: 16,
      })),
    ),
  );
  /** The start of THREE at step 1000 with its six traces found, or not, as given. */
  const having = (...ticks: readonly (number | null)[]): GameState => ({
    ...createInitialState(THREE),
    tick: T0,
    traces: found(...ticks),
  });
  const ALL = having(10, 20, 30, 40, 50, 60);
  /** The figure 40 px right of the colleague of the region: in reach of that one alone. */
  const beside = (state: GameState, region: Region): GameState => ({
    ...state,
    player: { ...state.player, x: 104, y: ROW[region] },
  });
  const step = (start: GameState, ...inputs: readonly GameInput[]): GameState =>
    inputs.reduce((state, input) => update(state, input, THREE), start);
  /** Three presses of talk: the answer opens, turns to its second page and closes. */
  const answer = (start: GameState): GameState => step(start, TALK, NONE, TALK, NONE, TALK, NONE);
  const said = (state: GameState) =>
    state.dialogue === null
      ? null
      : speakerOf(
          state.dialogue,
          speakersOf([], state.movers, routesOf(THREE.points), undefined, progressOf(state, THREE)),
        )?.pages;

  it('is the third case, after Marketing: its source, its answer, its afterwards, its outcome, its block', () => {
    expect(CASES).toHaveLength(3);
    expect(CASES.map((entry) => entry.region)).toStrictEqual(REGIONS_IN_ORDER);
    expect(CASES[2]).toStrictEqual({
      region: 'support',
      source: 'person:support',
      answer: SUPPORT_ANSWER,
      after: SUPPORT_AFTER,
      outcome: textKey('case.support-outcome'),
      policy: textKey('policy.support'),
    });
  });

  it('is ready exactly when its own traces are found, whatever is found in the other two', () => {
    const ready = (state: GameState): boolean[] =>
      REGIONS_IN_ORDER.map((region) => isReady(region, progressOf(state, THREE)));
    expect(ready(having(null, null, null, null, 10, 20))).toStrictEqual([false, false, true]);
    expect(ready(having(10, 20, 30, 40, 50, null))).toStrictEqual([true, true, false]);
    expect(ready(having(10, null, 30, null, 50, 60))).toStrictEqual([false, false, true]);
    expect(ready(ALL)).toStrictEqual([true, true, true]);
  });

  it('gives its source the answer when it is ready, and the other two their everyday pages', () => {
    const support = having(null, null, null, null, 10, 20);
    expect(said(step(beside(support, 'support'), TALK))).toStrictEqual(SUPPORT_ANSWER);
    expect(said(step(beside(support, 'sales'), TALK))).toStrictEqual(EVERYDAY_OF.sales);
    expect(said(step(beside(support, 'marketing'), TALK))).toStrictEqual(EVERYDAY_OF.marketing);
    // One trace of Support is missing: the everyday line, whatever is found elsewhere.
    const almost = having(10, 20, 30, 40, 50, null);
    expect(said(step(beside(almost, 'support'), TALK))).toStrictEqual(EVERYDAY_OF.support);
    expect(said(step(beside(almost, 'sales'), TALK))).toStrictEqual(ANSWER);
  });

  it('says "afterwards" once its case is solved, and the other two still their everyday lines', () => {
    const solved = answer(beside(having(null, null, null, null, 10, 20), 'support'));
    expect(said(step(solved, TALK))).toStrictEqual(SUPPORT_AFTER);
    expect(said(step(beside(solved, 'sales'), TALK))).toStrictEqual(EVERYDAY_OF.sales);
    expect(said(step(beside(solved, 'marketing'), TALK))).toStrictEqual(EVERYDAY_OF.marketing);
  });

  it('is solved first when the player solves it first: six of six, and it earns no upgrade', () => {
    const first = answer(beside(ALL, 'support'));
    expect(first.solved).toStrictEqual([{ region: 'support', at: T0 + 5 }]);
    expect(first.overview).toStrictEqual({ current: 6, max: 6 });
    expect(first.upgrades).toStrictEqual([]);
  });

  it('gives eight of eight and the wider cone with all three solved, in every order', () => {
    const orders: readonly (readonly Region[])[] = [
      ['sales', 'marketing', 'support'],
      ['sales', 'support', 'marketing'],
      ['marketing', 'sales', 'support'],
      ['marketing', 'support', 'sales'],
      ['support', 'sales', 'marketing'],
      ['support', 'marketing', 'sales'],
    ];
    for (const order of orders) {
      const all = order.reduce((state, region) => answer(beside(state, region)), ALL);
      expect(
        all.solved.map((entry) => entry.region),
        order.join(),
      ).toStrictEqual(order);
      expect(all.overview, order.join()).toStrictEqual({ current: 8, max: 8 });
      expect(all.upgrades, order.join()).toStrictEqual(['wide-cone']);
    }
  });

  it('gives the journal its outcome and its block, the blocks in the order they were solved', () => {
    const support = [{ region: 'support', at: 5 }];
    expect(outcomeOf('support', [])).toBeNull();
    expect(outcomeOf('support', support)).toBe(textKey('case.support-outcome'));
    expect(outcomeOf('sales', support)).toBeNull();
    expect(policyBlocks(support)).toStrictEqual([textKey('policy.support')]);
    expect(
      policyBlocks([{ region: 'marketing', at: 2 }, ...support, { region: 'sales', at: 9 }]),
    ).toStrictEqual([
      textKey('policy.marketing'),
      textKey('policy.support'),
      textKey('policy.sales'),
    ]);
  });
});
