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
import * as help from '../../src/game/help';
import { openHelp, stepHelp } from '../../src/game/help';
import { type GameInput, NO_INPUT, pressed } from '../../src/game/player';
import type { GameState } from '../../src/game/state';
import { createInitialState, update } from '../../src/game/update';
import { TABLE } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const HELP: GameInput = { ...NONE, help: true };
const JOURNAL: GameInput = { ...NONE, journal: true };
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
const opened = update(createInitialState(OPEN), HELP, OPEN);
/** The officer one and a half tiles left of the player: a press of `talk` opens a dialogue. */
const OFFICER = mapAt(184, 96, [{ name: 'figure:officer', x: 160, y: 96 }]);
/** A dialogue on its first page, with no key held. */
const talking = run(OFFICER, createInitialState(OFFICER), TALK, NONE);
/** The journal on the cases, with no key held. */
const reading = run(OPEN, createInitialState(OPEN), JOURNAL, NONE, RIGHT, NONE);

describe('opening the help (0021)', () => {
  it('opens with a press, and changes nothing else', () => {
    const start = createInitialState(OPEN);
    expect(start.help).toBe(false);
    expect(opened).toStrictEqual({ ...start, tick: 1, held: HELP, help: true });
  });

  it('opens whatever else is held, and in the middle of a push: nothing is stepped', () => {
    const input: GameInput = { ...HELP, right: true, lamp: true, talk: true };
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
      help: true,
    });
  });

  it('opens over a dialogue, which keeps its page', () => {
    expect(talking.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(update(talking, HELP, OFFICER)).toStrictEqual({
      ...talking,
      tick: talking.tick + 1,
      held: HELP,
      help: true,
    });
  });

  it('opens over the journal on the cases, which keeps its tab', () => {
    expect(reading.journal).toStrictEqual({ tab: 'cases' });
    expect(update(reading, HELP, OPEN)).toStrictEqual({
      ...reading,
      tick: reading.tick + 1,
      held: HELP,
      help: true,
    });
  });

  it('opens and not the journal when both keys are pressed in the same step', () => {
    const next = update(createInitialState(OPEN), { ...HELP, journal: true }, OPEN);
    expect(next.help).toBe(true);
    expect(next.journal).toBeNull();
  });

  it('opens and not a dialogue when both keys are pressed next to a figure', () => {
    const next = update(createInitialState(OFFICER), { ...HELP, talk: true }, OFFICER);
    expect(next.help).toBe(true);
    expect(next.dialogue).toBeNull();
  });

  it('is what openHelp returns, and null without a press', () => {
    const start = createInitialState(OPEN);
    expect(openHelp(start, HELP)).toStrictEqual(opened);
    expect(openHelp(start, NONE)).toBeNull();
    expect(openHelp({ ...start, held: HELP }, HELP)).toBeNull();
  });

  it('does not open in the dark, and not after it by the key still held', () => {
    const dark = update({ ...createInitialState(OPEN), dark: 88 }, HELP, OPEN);
    expect(dark.dark).toBe(89);
    expect(dark.help).toBe(false);
    expect(dark.held).toStrictEqual(HELP);
    const awake = update(dark, HELP, OPEN);
    expect(awake.dark).toBe(0);
    expect(update(awake, HELP, OPEN).help).toBe(false);
  });
});

describe('the help while it is open (0021)', () => {
  it('is what stepHelp returns: the tick and the input, nothing else', () => {
    expect(stepHelp(opened, RIGHT)).toStrictEqual({ ...opened, tick: 2, held: RIGHT });
    expect(stepHelp({ ...opened, held: NONE }, HELP)).toStrictEqual({
      ...opened,
      tick: 2,
      held: HELP,
      help: false,
    });
  });

  it('opens once for a key held for 600 steps, and does not close', () => {
    let state = createInitialState(OPEN);
    let presses = 0;
    for (let step = 0; step < 600; step += 1) {
      presses += pressed(state.held, HELP, 'help') ? 1 : 0;
      state = update(state, HELP, OPEN);
    }
    expect(presses).toBe(1);
    expect(state.help).toBe(true);
    expect(state.tick).toBe(600);
  });

  it('turns no page of the dialogue under it', () => {
    const over = run(OFFICER, talking, HELP, NONE, TALK, NONE, TALK);
    expect(over.help).toBe(true);
    expect(over.dialogue).toStrictEqual(talking.dialogue);
  });

  it('turns no tab of the journal under it, and a press of `journal` does not close that', () => {
    const over = run(OPEN, reading, HELP, NONE, RIGHT, NONE, JOURNAL, NONE);
    expect(over.help).toBe(true);
    expect(over.journal).toStrictEqual({ tab: 'cases' });
  });
});

describe('closing the help (0021)', () => {
  it('closes with a press, and the next step is an ordinary one', () => {
    const closed = run(OPEN, opened, NONE, HELP);
    expect(closed.help).toBe(false);
    expect(closed.tick).toBe(3);
    expect(closed.player.x).toBe(160);
    const walked = run(OPEN, closed, RIGHT);
    expect(walked.player.x).toBeCloseTo(160 + 80 / 60, 6);
  });

  it('closes even when other keys are pressed in the same step', () => {
    const closed = run(OPEN, opened, NONE, { ...HELP, right: true, journal: true, talk: true });
    expect(closed.help).toBe(false);
    expect(closed.journal).toBeNull();
    expect(closed.dialogue).toBeNull();
  });

  it('walks the figure at once with a direction key held through the closing', () => {
    const closed = run(OPEN, opened, RIGHT, { ...RIGHT, help: true });
    expect(closed.help).toBe(false);
    expect(closed.player.x).toBe(160);
    expect(update(closed, RIGHT, OPEN).player.x).toBeCloseTo(160 + 80 / 60, 6);
  });

  it('leaves the dialogue on its page when `talk` is held since before the closing', () => {
    const closed = run(OFFICER, talking, HELP, TALK, { ...TALK, help: true });
    expect(closed.help).toBe(false);
    expect(closed.dialogue).toStrictEqual(talking.dialogue);
    expect(update(closed, TALK, OFFICER).dialogue).toStrictEqual(talking.dialogue);
    // Let go and pressed again, the key turns the page as ever.
    expect(run(OFFICER, closed, NONE, TALK).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 1,
    });
  });

  it('leaves the journal on its tab when `right` is held since before the closing', () => {
    const closed = run(OPEN, reading, HELP, RIGHT, { ...RIGHT, help: true });
    expect(closed.help).toBe(false);
    expect(closed.journal).toStrictEqual({ tab: 'cases' });
    expect(update(closed, RIGHT, OPEN).journal).toStrictEqual({ tab: 'cases' });
    expect(run(OPEN, closed, NONE, RIGHT).journal).toStrictEqual({ tab: 'policy' });
  });
});

describe('the world while the help is open (0021)', () => {
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
  /** Every key but `help`. */
  const ALL_OTHERS: GameInput = {
    up: true,
    down: true,
    left: true,
    right: true,
    lamp: true,
    talk: true,
    journal: true,
    help: false,
  };

  it('is not stepped in the step that opens it', () => {
    expect(start.movers[0]?.x).toBeGreaterThan(64);
    expect(update(start, HELP, map)).toStrictEqual({ ...start, tick: 4, held: HELP, help: true });
  });

  it('stands still for 600 steps with every key but help held', () => {
    const open = update(start, HELP, map);
    let state = open;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, ALL_OTHERS, map);
    }
    expect(state).toStrictEqual({ ...open, tick: open.tick + 600, held: ALL_OTHERS });
  });

  it('moves again once the help is closed', () => {
    const closed = run(map, update(start, HELP, map), NONE, HELP);
    expect(closed.help).toBe(false);
    const later = run(map, closed, NONE, NONE);
    expect(later.creatures[0]?.x).toBeLessThan(start.creatures[0]?.x ?? 0);
    expect(later.movers[0]?.x).toBeGreaterThan(start.movers[0]?.x ?? 0);
    expect(later.lamp.on).toBe(false);
  });
});

describe('what game/help knows (0031)', () => {
  it('is the step of the help and nothing of a hint', () => {
    expect(Object.keys(help).sort()).toStrictEqual(['openHelp', 'stepHelp']);
  });

  it("has no words of its own: the label that names the key is the scene's", () => {
    expect(Object.keys(TABLE.de)).not.toContain('notice.help');
    expect(Object.keys(TABLE.en)).not.toContain('notice.help');
  });
});

describe('the help in a saved state (INV-1, 0021)', () => {
  it('survives a JSON round trip at the start and with the help open', () => {
    const start = createInitialState(OPEN);
    expect(JSON.parse(JSON.stringify(start))).toStrictEqual(start);
    expect(opened.help).toBe(true);
    expect(JSON.parse(JSON.stringify(opened))).toStrictEqual(opened);
  });
});

describe('a game in which the help is never opened (0021)', () => {
  const ROOT = fileURLToPath(new URL('../../', import.meta.url));
  const read = (file: string): unknown => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  const FLOOR = parseTileMap(
    read('public/maps/floor.tmj'),
    parseTileset(read('public/tiles/placeholder.tsj'), 'public/tiles/placeholder.tsj'),
    'public/maps/floor.tmj',
  );
  const within = (i: number, from: number, to: number): boolean => i >= from && i < to;
  /**
   * To the counter, a word with the colleague behind it, the lamp, then right and down, and
   * the journal: opened, turned to the cases and closed.
   */
  const inputAt = (i: number): GameInput => ({
    up: within(i, 0, 40),
    left: within(i, 40, 70),
    talk: within(i, 100, 103) || within(i, 140, 143),
    lamp: within(i, 200, 260),
    right: within(i, 300, 400) || within(i, 530, 533),
    down: within(i, 450, 500),
    journal: within(i, 520, 523) || within(i, 560, 563),
    help: false,
  });
  /** Everything of the state but what this feature added, and `held`, which gained a key. */
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
    // The figure that was recorded: the officer, before the intern of 0033.
    state.figures.slice(0, 1),
    state.dialogue,
    state.journal,
    { snippet: state.captured.snippet },
    state.overview,
    state.dark,
  ];
  /** SHA-256 over the 600 states, recorded with the code of 0020 before this feature. */
  const RECORDED = '8bb15385ddcc2eb8f089ff891070119b18f56ce7d563acb6dfcadcded53cad44';

  it('steps exactly as before: 600 steps on the floor against the recording', () => {
    const hash = createHash('sha256');
    let state = createInitialState(FLOOR);
    let talked = false;
    let turned = false;
    for (let i = 0; i < 600; i += 1) {
      state = update(state, inputAt(i), FLOOR);
      hash.update(JSON.stringify(world(state)));
      talked ||= state.dialogue !== null;
      turned ||= state.journal?.tab === 'cases';
      expect(state.help).toBe(false);
    }
    expect(talked).toBe(true);
    expect(turned).toBe(true);
    expect(hash.digest('hex')).toBe(RECORDED);
  });
});
