import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  type NamedPoint,
  type NamedRect,
  parseTileMap,
  parseTileset,
  type TileMap,
} from '../../src/engine/tiled';
import { ENTRY_TEXT, entriesOf, openJournal, stepJournal, TAB_TEXT } from '../../src/game/journal';
import { type GameInput, NO_INPUT, pressed } from '../../src/game/player';
import { type GameState, JOURNAL_TABS, SPECIES } from '../../src/game/state';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const JOURNAL: GameInput = { ...NONE, journal: true };
const LEFT: GameInput = { ...NONE, left: true };
const RIGHT: GameInput = { ...NONE, right: true };
const TALK: GameInput = { ...NONE, talk: true };
/** 20x12 cells of open floor with the player at (x, y). */
const mapAt = (
  x: number,
  y: number,
  points: readonly NamedPoint[] = [],
  rects: readonly NamedRect[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);
const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, map), start);
const OPEN = mapAt(160, 96);
const opened = update(createInitialState(OPEN), JOURNAL, OPEN);

describe('the press of an action (0020)', () => {
  it.each(['talk', 'journal', 'left', 'right'] as const)(
    'sees %s pressed in exactly one of 600 steps with the key held',
    (action) => {
      const input: GameInput = { ...NONE, [action]: true };
      let state = createInitialState(OPEN);
      let presses = 0;
      for (let step = 0; step < 600; step += 1) {
        presses += pressed(state.held, input, action) ? 1 : 0;
        state = update(state, input, OPEN);
      }
      expect(presses).toBe(1);
    },
  );

  it('sees a press again after a step without the key', () => {
    const held = run(OPEN, createInitialState(OPEN), LEFT, LEFT);
    expect(pressed(held.held, LEFT, 'left')).toBe(false);
    const released = update(held, NONE, OPEN);
    expect(pressed(released.held, LEFT, 'left')).toBe(true);
    expect(pressed(released.held, NONE, 'left')).toBe(false);
  });

  it('remembers the whole input in every kind of step: ordinary, dark, dialogue and journal', () => {
    const both: GameInput = { ...NONE, left: true, lamp: true };
    const start = createInitialState(OPEN);
    expect(start.held).toStrictEqual(NO_INPUT);
    expect(update(start, both, OPEN).held).toStrictEqual(both);
    expect(update({ ...start, dark: 5 }, both, OPEN).held).toStrictEqual(both);
    expect(update(opened, both, OPEN).held).toStrictEqual(both);
    const talking = mapAt(184, 96, [{ name: 'figure:officer', x: 160, y: 96 }]);
    const dialogue = update(createInitialState(talking), TALK, talking);
    expect(dialogue.dialogue).not.toBeNull();
    expect(update(dialogue, both, talking).held).toStrictEqual(both);
  });
});

describe("the journal's data (0020)", () => {
  it('has three tabs: creatures, cases, policy', () => {
    expect(JOURNAL_TABS).toStrictEqual(['creatures', 'cases', 'policy']);
  });

  it('gives every tab a title and a line for nothing', () => {
    expect(TAB_TEXT).toStrictEqual({
      creatures: {
        title: textKey('journal.tab-creatures'),
        nothing: textKey('journal.no-creatures'),
      },
      cases: { title: textKey('journal.tab-cases'), nothing: textKey('journal.no-cases') },
      policy: { title: textKey('journal.tab-policy'), nothing: textKey('journal.no-policy') },
    });
  });

  it('gives the snippet its name and its text', () => {
    expect(ENTRY_TEXT.snippet).toStrictEqual({
      name: textKey('creature.snippet-name'),
      text: textKey('creature.snippet-text'),
    });
  });

  it('gives the mirage its name and its text, and has an entry for every species (0032)', () => {
    expect(ENTRY_TEXT.mirage).toStrictEqual({
      name: textKey('creature.mirage-name'),
      text: textKey('creature.mirage-text'),
    });
    expect(Object.keys(ENTRY_TEXT)).toStrictEqual([...SPECIES]);
  });

  it('lists the captured species in the order of the species, not of the captures (0032)', () => {
    expect(entriesOf({ snippet: 0, mirage: 1 })).toStrictEqual(['mirage']);
    expect(entriesOf({ snippet: 2, mirage: 1 })).toStrictEqual(['snippet', 'mirage']);
  });

  it('lists a species as soon as one of it is captured', () => {
    expect(entriesOf({ snippet: 0, mirage: 0 })).toStrictEqual([]);
    expect(entriesOf({ snippet: 1, mirage: 0 })).toStrictEqual(['snippet']);
    expect(entriesOf({ snippet: 3, mirage: 0 })).toStrictEqual(['snippet']);
  });
});

describe('opening the journal (0020)', () => {
  it('opens on the creatures with a press, and changes nothing else', () => {
    const start = createInitialState(OPEN);
    expect(start.journal).toBeNull();
    expect(opened).toStrictEqual({
      ...start,
      tick: 1,
      held: JOURNAL,
      journal: { tab: 'creatures' },
    });
  });

  it('opens whatever else is held, and in the middle of a push: nothing is stepped', () => {
    const input: GameInput = { ...JOURNAL, right: true, lamp: true, talk: true };
    const start = createInitialState(OPEN);
    const pushed: GameState = {
      ...start,
      player: { ...start.player, frame: 2, recoil: { dx: -3, dy: 0, steps: 4 } },
      lamp: { on: true, strength: 1, owned: true, used: true },
    };
    expect(update(pushed, input, OPEN)).toStrictEqual({
      ...pushed,
      tick: 1,
      held: input,
      journal: { tab: 'creatures' },
    });
  });

  it('opens instead of a dialogue when both keys are pressed next to a figure', () => {
    const map = mapAt(184, 96, [{ name: 'figure:officer', x: 160, y: 96 }]);
    const next = update(createInitialState(map), { ...JOURNAL, talk: true }, map);
    expect(next.journal).toStrictEqual({ tab: 'creatures' });
    expect(next.dialogue).toBeNull();
  });

  it('is what openJournal returns, and null without a press', () => {
    const start = createInitialState(OPEN);
    expect(openJournal(start, JOURNAL)).toStrictEqual(opened);
    expect(openJournal(start, NONE)).toBeNull();
    expect(openJournal({ ...start, held: JOURNAL }, JOURNAL)).toBeNull();
  });

  it('does not open with a dialogue open', () => {
    const map = mapAt(184, 96, [{ name: 'figure:officer', x: 160, y: 96 }]);
    const talking = update(createInitialState(map), TALK, map);
    const next = run(map, talking, NONE, JOURNAL);
    expect(next.journal).toBeNull();
    expect(next.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
  });

  it('does not open in the dark, and not after it by the key still held', () => {
    const dark = update({ ...createInitialState(OPEN), dark: 88 }, JOURNAL, OPEN);
    expect(dark.dark).toBe(89);
    expect(dark.journal).toBeNull();
    const awake = update(dark, JOURNAL, OPEN);
    expect(awake.dark).toBe(0);
    expect(update(awake, JOURNAL, OPEN).journal).toBeNull();
  });
});

describe('the tabs of the journal (0020)', () => {
  const tab = (state: GameState): string | undefined => state.journal?.tab;

  it('turns right to the cases and to the policy, and stays there', () => {
    const cases = run(OPEN, opened, NONE, RIGHT);
    expect(tab(cases)).toBe('cases');
    const policy = run(OPEN, cases, NONE, RIGHT);
    expect(tab(policy)).toBe('policy');
    expect(tab(run(OPEN, policy, NONE, RIGHT))).toBe('policy');
  });

  it('turns left back to the creatures, and stays there', () => {
    const policy = run(OPEN, opened, NONE, RIGHT, NONE, RIGHT);
    const cases = run(OPEN, policy, NONE, LEFT);
    expect(tab(cases)).toBe('cases');
    const creatures = run(OPEN, cases, NONE, LEFT);
    expect(tab(creatures)).toBe('creatures');
    expect(tab(run(OPEN, creatures, NONE, LEFT))).toBe('creatures');
  });

  it('turns one tab for a key held for 600 steps', () => {
    let state = update(opened, NONE, OPEN);
    for (let step = 0; step < 600; step += 1) {
      state = update(state, RIGHT, OPEN);
    }
    expect(tab(state)).toBe('cases');
  });

  it('turns none when left and right are pressed in the same step', () => {
    const cases = run(OPEN, opened, NONE, RIGHT, NONE);
    expect(tab(update(cases, { ...NONE, left: true, right: true }, OPEN))).toBe('cases');
  });

  it('turns right when right is pressed while left is only held', () => {
    const held = run(OPEN, opened, NONE, RIGHT, NONE, LEFT, LEFT);
    expect(tab(held)).toBe('creatures');
    expect(tab(update(held, { ...LEFT, right: true }, OPEN))).toBe('cases');
  });

  it('turns no tab with a direction key that was held when the journal opened', () => {
    const walking = run(OPEN, createInitialState(OPEN), RIGHT, RIGHT);
    const input: GameInput = { ...RIGHT, journal: true };
    const state = run(OPEN, walking, input, input, RIGHT, RIGHT);
    expect(tab(state)).toBe('creatures');
    expect(state.player).toStrictEqual(walking.player);
  });

  it('is what stepJournal returns: the tick, the input and the tab, nothing else', () => {
    const stepped = stepJournal(opened, { tab: 'creatures' }, RIGHT);
    expect(stepped).toStrictEqual({ ...opened, tick: 2, held: RIGHT, journal: { tab: 'cases' } });
  });
});

describe('closing the journal (0020)', () => {
  it('closes with a press, and the next step is an ordinary one', () => {
    const closed = run(OPEN, opened, NONE, JOURNAL);
    expect(closed.journal).toBeNull();
    expect(closed.tick).toBe(3);
    expect(closed.player.x).toBe(160);
    const walked = run(OPEN, closed, RIGHT);
    expect(walked.player.x).toBeCloseTo(160 + 80 / 60, 6);
  });

  it('closes even when a direction is pressed in the same step', () => {
    const closed = run(OPEN, opened, NONE, { ...JOURNAL, right: true });
    expect(closed.journal).toBeNull();
  });

  it('stays open while the key that opened it is held', () => {
    expect(run(OPEN, opened, JOURNAL, JOURNAL).journal).toStrictEqual({ tab: 'creatures' });
  });

  it('opens on the creatures again, whatever tab it was closed on', () => {
    const closed = run(OPEN, opened, NONE, RIGHT, NONE, JOURNAL);
    expect(closed.journal).toBeNull();
    expect(run(OPEN, closed, NONE, JOURNAL).journal).toStrictEqual({ tab: 'creatures' });
  });

  it('walks the figure at once with a direction key held through the closing', () => {
    const closed = run(OPEN, opened, RIGHT, { ...RIGHT, journal: true });
    expect(closed.journal).toBeNull();
    expect(closed.player.x).toBe(160);
    expect(update(closed, RIGHT, OPEN).player.x).toBeCloseTo(160 + 80 / 60, 6);
  });
});

describe('the world while the journal is open (0020)', () => {
  /** A snippet 30 px from the player, a colleague on a leg and a wall that was giving way. */
  const map = mapAt(
    104,
    48,
    [
      { name: 'snippet', x: 134, y: 48 },
      { name: 'person:reception:1', x: 64, y: 80, pause: 0 },
      { name: 'person:reception:2', x: 128, y: 80 },
    ],
    [{ name: 'shadow:marketing', x: 128, y: 160, width: 48, height: 4 }],
  );
  const start: GameState = {
    ...run(map, createInitialState(map), NONE, NONE, NONE),
    shadowWalls: [{ wall: 0, lit: true, light: 30 }],
    lamp: { on: true, strength: 1, owned: true, used: true },
  };
  const ALL_OTHERS: GameInput = { ...NONE, up: true, down: true, lamp: true, talk: true };

  it('is not stepped in the step that opens it', () => {
    expect(start.movers[0]?.x).toBeGreaterThan(64);
    const open = update(start, JOURNAL, map);
    expect(open).toStrictEqual({ ...start, tick: 4, held: JOURNAL, journal: { tab: 'creatures' } });
  });

  it('stands still for 600 steps with every key but journal, left and right held', () => {
    const open = update(start, JOURNAL, map);
    let state = open;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, ALL_OTHERS, map);
    }
    expect(state).toStrictEqual({ ...open, tick: open.tick + 600, held: ALL_OTHERS });
  });

  it('moves again once the journal is closed', () => {
    const closed = run(map, update(start, JOURNAL, map), NONE, JOURNAL);
    expect(closed.journal).toBeNull();
    const later = run(map, closed, NONE, NONE);
    expect(later.creatures[0]?.x).toBeLessThan(start.creatures[0]?.x ?? 0);
    expect(later.movers[0]?.x).toBeGreaterThan(start.movers[0]?.x ?? 0);
    expect(later.lamp.on).toBe(false);
  });
});

describe('the journal in a saved state (INV-1, 0020)', () => {
  it('survives a JSON round trip at the start and open on the cases', () => {
    const start = createInitialState(OPEN);
    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
    const cases = run(OPEN, opened, NONE, RIGHT);
    expect(cases.journal).toStrictEqual({ tab: 'cases' });
    expect(JSON.parse(JSON.stringify(cases))).toStrictEqual(cases);
  });
});

describe('a game in which the journal is never opened (0020)', () => {
  const ROOT = fileURLToPath(new URL('../../', import.meta.url));
  const read = (file: string): unknown => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  const FLOOR = parseTileMap(
    read('public/maps/floor.tmj'),
    parseTileset(read('public/tiles/placeholder.tsj'), 'public/tiles/placeholder.tsj'),
    'public/maps/floor.tmj',
  );
  const within = (i: number, from: number, to: number): boolean => i >= from && i < to;
  /** To the counter, a word with the colleague behind it, the lamp, then right and down. */
  const inputAt = (i: number): GameInput => ({
    up: within(i, 0, 40),
    left: within(i, 40, 70),
    talk: within(i, 100, 103) || within(i, 140, 143),
    lamp: within(i, 200, 260),
    right: within(i, 300, 400),
    down: within(i, 450, 500),
    journal: false,
    help: false,
  });
  /** Everything of the state but what this feature added or replaced. */
  const world = (state: GameState): unknown => [
    state.tick,
    state.player,
    state.camera,
    // The lamp as it was recorded: without the two fields of 0026.
    { on: state.lamp.on, strength: state.lamp.strength },
    // The creatures and the count as they were recorded: the snippets, before 0032.
    state.creatures.filter((creature) => creature.species === 'snippet'),
    state.movers,
    state.shadowWalls,
    state.figures,
    state.dialogue,
    { snippet: state.captured.snippet },
    state.overview,
    state.dark,
  ];
  /** SHA-256 over the 600 states, recorded with the code of 0019 before this feature. */
  const RECORDED = '2556614ed7a215891b4389c620458f8965e7cd54e6b190c59b81f8f02ce070e0';

  it('steps exactly as before: 600 steps on the floor against the recording', () => {
    const hash = createHash('sha256');
    let state = createInitialState(FLOOR);
    let talked = false;
    for (let i = 0; i < 600; i += 1) {
      state = update(state, inputAt(i), FLOOR);
      hash.update(JSON.stringify(world(state)));
      talked ||= state.dialogue !== null;
      expect(state.journal).toBeNull();
    }
    expect(talked).toBe(true);
    expect(hash.digest('hex')).toBe(RECORDED);
  });
});
