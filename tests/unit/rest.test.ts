import { describe, expect, it } from 'vitest';
import type { Box } from '../../src/engine/collision';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import { type GameInput, NO_INPUT } from '../../src/game/player';
import {
  REGION_PREFIX,
  REST_PREFIX,
  rectsOf,
  TRACE_PREFIX,
  WALL_PREFIX,
} from '../../src/game/rects';
import { areasOf } from '../../src/game/region';
import {
  REST_DISTANCE,
  type Rest,
  restCentre,
  restInReach,
  restsOf,
  restUnderShadow,
  takeRest,
} from '../../src/game/rest';
import { wallsOf } from '../../src/game/shadow';
import { type GameState, REST_RESULTS } from '../../src/game/state';
import { tracesOf } from '../../src/game/trace';
import { createInitialState, newGame, update } from '../../src/game/update';
import { grassMap } from './grass-map';

const NONE = NO_INPUT;
const TALK: GameInput = { ...NONE, talk: true };
const rect = (name: string, x: number, y: number, width = 16, height = 16): NamedRect => ({
  name,
  x,
  y,
  width,
  height,
});
/** A coffee machine on cell (10, 5): its centre is (168, 88). */
const COFFEE = rect('rest:coffee', 160, 80);
/** A second one on cell (4, 5), centre (72, 88), in a room of HR: the cells (2, 3) to (6, 7). */
const SHADOWED = rect('rest:coffee', 64, 80);
const HR = rect('region:hr', 32, 48, 80, 80);
/** 20x12 cells of open floor with the player at (x, y). */
const mapAt = (
  x: number,
  y: number,
  rects: readonly NamedRect[] = [COFFEE],
  points: readonly NamedPoint[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);
const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, map), start);
/** The state with `current` of five hearts. */
const tired = (map: TileMap, current = 2): GameState => ({
  ...createInitialState(map),
  overview: { current, max: 5 },
});

describe('the rests among the rectangles of a map (0027)', () => {
  const rects = [
    rect('shadow:hr', 32, 48, 16, 4),
    rect('trace:sales', 160, 112),
    HR,
    COFFEE,
    SHADOWED,
  ];

  it('are known by the prefix of the name: the fourth kind of rectangle', () => {
    expect(REST_PREFIX).toBe('rest:');
    expect(rectsOf(rects, REST_PREFIX)).toStrictEqual([COFFEE, SHADOWED]);
  });

  it('are read in file order, each with what it is and its cell', () => {
    expect(restsOf(rects)).toStrictEqual([
      { what: 'coffee', box: { x: 160, y: 80, width: 16, height: 16 } },
      { what: 'coffee', box: { x: 64, y: 80, width: 16, height: 16 } },
    ]);
    expect(restsOf([rect('rest:sofa', 0, 0)])).toStrictEqual([
      { what: 'sofa', box: { x: 0, y: 0, width: 16, height: 16 } },
    ]);
  });

  it('are skipped by the walls, the traces and the areas, and skip them', () => {
    expect(wallsOf(rects)).toHaveLength(1);
    expect(tracesOf(rects)).toHaveLength(1);
    expect(areasOf(rects)).toHaveLength(1);
    expect(rectsOf(rects, WALL_PREFIX)).toHaveLength(1);
    expect(rectsOf(rects, TRACE_PREFIX)).toHaveLength(1);
    expect(rectsOf(rects, REGION_PREFIX)).toHaveLength(1);
  });

  it('are none on a map without them', () => {
    expect(restsOf([])).toStrictEqual([]);
    expect(restsOf([HR, rect('trace:sales', 160, 112)])).toStrictEqual([]);
  });

  it('do not excuse a rectangle of no known kind', () => {
    expect(() => restsOf([COFFEE, rect('door:hr', 0, 0)])).toThrow(
      'unknown rectangle object "door:hr"',
    );
  });

  it.each([
    [568, 418, 16, 16],
    [570, 416, 16, 16],
    [560, 416, 32, 16],
    [560, 416, 16, 4],
  ])('refuses the box (%d, %d, %d, %d): it is not one cell', (x, y, width, height) => {
    expect(() => restsOf([rect('rest:coffee', x, y, width, height)])).toThrow(
      `rest rest:coffee (${x}, ${y}, ${width}, ${height}) is not one cell`,
    );
  });

  it('refuses such a map before the game starts', () => {
    const map = mapAt(40, 40, [rect('rest:coffee', 568, 418)]);
    expect(() => createInitialState(map)).toThrow(
      'rest rest:coffee (568, 418, 16, 16) is not one cell',
    );
  });

  it('starts a map with rests like one without: the state has nothing of them', () => {
    expect(createInitialState(mapAt(40, 40))).toStrictEqual(createInitialState(mapAt(40, 40, [])));
    expect(createInitialState(mapAt(40, 40)).rested).toBeNull();
  });
});

describe('a rest in reach (0027)', () => {
  const map = mapAt(40, 40);
  const [coffee] = restsOf(map.rects) as [Rest];
  const reached = (x: number, y: number, on: TileMap = map): boolean =>
    restInReach({ x, y }, restsOf(on.rects), on) !== null;
  /** The map with a wall strip on the upper edge of the rest's cell, as on the floor. */
  const walled: TileMap = {
    ...map,
    opaque: map.opaque.map((boxes, cell) => {
      const strip: Box = { x: 160, y: 80, width: 16, height: 4 };
      return cell === 5 * map.width + 10 ? [strip] : boxes;
    }),
  };

  it('is two tiles: from the feet to the centre of the cell', () => {
    expect(REST_DISTANCE).toBe(32);
    expect(restCentre(coffee)).toStrictEqual({ x: 168, y: 88 });
  });

  it.each([
    ['below', 168, 120, 168, 120.1],
    ['above', 168, 56, 168, 55.9],
    ['left', 136, 88, 135.9, 88],
    ['right', 200, 88, 200.1, 88],
  ])('is in reach at 32 px from %s and not at 32.1 px', (_side, x, y, farX, farY) => {
    expect(reached(x, y)).toBe(true);
    expect(reached(farX, farY)).toBe(false);
  });

  it('is in reach on a diagonal inside the circle and not outside it', () => {
    expect(reached(168 + 20, 88 + 24)).toBe(true);
    expect(reached(168 + 24, 88 + 24)).toBe(false);
  });

  it('is in reach standing on its cell', () => {
    expect(reached(168, 96)).toBe(true);
    expect(restInReach({ x: 168, y: 96 }, restsOf(map.rects), map)).toStrictEqual(coffee);
  });

  it('is not in reach at 8 px with an opaque box on the line: from behind the wall', () => {
    expect(reached(168, 80)).toBe(true);
    expect(reached(168, 80, walled)).toBe(false);
    // From the room's side the same wall is not on the line.
    expect(reached(168, 104, walled)).toBe(true);
  });

  it('is not stopped by a box that is solid and not opaque: a counter', () => {
    const counter: TileMap = {
      ...map,
      solids: map.solids.map((boxes, cell) =>
        cell === 5 * map.width + 10 ? [{ x: 160, y: 80, width: 16, height: 16 }] : boxes,
      ),
    };
    expect(reached(168, 104, counter)).toBe(true);
  });

  it('is none on a map without rests', () => {
    const bare = mapAt(40, 40, []);
    expect(restInReach({ x: 168, y: 96 }, restsOf(bare.rects), bare)).toBeNull();
  });

  it('is the nearer of two in reach, and the first in the file of two equally near', () => {
    const left = rect('rest:coffee', 144, 80);
    const right = rect('rest:tea', 176, 80);
    const both = mapAt(40, 40, [left, right]);
    const at = (x: number, order: readonly NamedRect[] = [left, right]): string | undefined =>
      restInReach({ x, y: 104 }, restsOf(order), both)?.what;
    expect(at(160)).toBe('coffee');
    expect(at(176)).toBe('tea');
    // (168, 104) is as far from the centre (152, 88) as from (184, 88).
    expect(at(168)).toBe('coffee');
    expect(at(168, [right, left])).toBe('tea');
  });
});

describe('a rest under shadow (0027)', () => {
  const rects = [COFFEE, SHADOWED, HR];
  const [open, shadowed] = restsOf(rects) as [Rest, Rest];

  it('is one whose cell lies in an area of a region with shadow', () => {
    expect(restUnderShadow(open, rects, [])).toBe(false);
    expect(restUnderShadow(shadowed, rects, [])).toBe(true);
  });

  it('is not under shadow in a region without shadow, or on a map without areas', () => {
    const reception = [SHADOWED, rect('region:reception', 32, 48, 80, 80)];
    expect(restUnderShadow(shadowed, reception, [])).toBe(false);
    expect(restUnderShadow(shadowed, [SHADOWED], [])).toBe(false);
  });

  it('is not under shadow once the region is cleared, from the step that solved its case', () => {
    expect(restUnderShadow(shadowed, rects, [{ region: 'hr', at: 500 }])).toBe(false);
    expect(restUnderShadow(shadowed, rects, [{ region: 'sales', at: 500 }])).toBe(true);
  });
});

describe('a coffee (0027)', () => {
  const rects = [COFFEE, SHADOWED, HR];
  /** The player 24 px below the open machine. */
  const OPEN = mapAt(168, 112, rects);
  /** The player 24 px below the machine in HR. */
  const DARK = mapAt(72, 112, rects);

  it('has three results', () => {
    expect(REST_RESULTS).toStrictEqual(['restored', 'full', 'shadow']);
  });

  it('fills overview at a rest that is not under shadow, and remembers the step', () => {
    const start = tired(OPEN);
    const drunk = update(start, TALK, OPEN);
    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
    expect(drunk.rested).toStrictEqual({ at: 1, result: 'restored' });
    expect(drunk.tick).toBe(1);
  });

  it('fills it from any number of hearts, and to a maximum a solved case has raised', () => {
    for (const current of [0, 1, 4]) {
      expect(update(tired(OPEN, current), TALK, OPEN).overview).toStrictEqual({
        current: 5,
        max: 5,
      });
    }
    const grown: GameState = { ...tired(OPEN), overview: { current: 3, max: 6 } };
    expect(update(grown, TALK, OPEN).overview).toStrictEqual({ current: 6, max: 6 });
  });

  it('changes no heart with overview full, and says so', () => {
    const drunk = update(createInitialState(OPEN), TALK, OPEN);
    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
    expect(drunk.rested).toStrictEqual({ at: 1, result: 'full' });
  });

  it('changes no heart at a rest under shadow, whatever the hearts', () => {
    for (const current of [2, 5]) {
      const drunk = update(tired(DARK, current), TALK, DARK);
      expect(drunk.overview).toStrictEqual({ current, max: 5 });
      expect(drunk.rested).toStrictEqual({ at: 1, result: 'shadow' });
    }
  });

  it('restores at that rest once its region is cleared', () => {
    const cleared: GameState = { ...tired(DARK), tick: 700, solved: [{ region: 'hr', at: 650 }] };
    const drunk = update(cleared, TALK, DARK);
    expect(drunk.overview).toStrictEqual({ current: 5, max: 5 });
    expect(drunk.rested).toStrictEqual({ at: 701, result: 'restored' });
  });

  it('is an ordinary step otherwise: only overview, rested, tick and held change', () => {
    const start = tired(OPEN);
    expect(update(start, TALK, OPEN)).toStrictEqual({
      ...start,
      tick: 1,
      held: TALK,
      overview: { current: 5, max: 5 },
      rested: { at: 1, result: 'restored' },
    });
  });

  it('lets the world go on in the same step: the figure walks', () => {
    const walking = update(tired(OPEN), { ...TALK, right: true }, OPEN);
    expect(walking.player.x).toBeGreaterThan(168);
    expect(walking.rested?.result).toBe('restored');
  });

  it('does not save from a creature that reaches the figure in the same step', () => {
    // A snippet at 6-8-10 from the spawn hits in step 1 (0009).
    const map = mapAt(168, 112, rects, [{ name: 'snippet', x: 162, y: 104 }]);
    const hit = update(tired(map), TALK, map);
    expect(hit.rested).toStrictEqual({ at: 1, result: 'restored' });
    expect(hit.overview).toStrictEqual({ current: 4, max: 5 });
  });

  it('is taken once by a key that is held: the next press takes the next', () => {
    const held = run(OPEN, tired(OPEN), TALK, TALK, TALK);
    expect(held.rested).toStrictEqual({ at: 1, result: 'restored' });
    const again = run(OPEN, held, NONE, TALK);
    expect(again.rested).toStrictEqual({ at: 5, result: 'full' });
  });

  it('is not taken with the lamp held or during a push', () => {
    const start = tired(OPEN);
    expect(update(start, { ...TALK, lamp: true }, OPEN).rested).toBeNull();
    const pushed: GameState = {
      ...start,
      player: { ...start.player, recoil: { dx: 3, dy: 0, steps: 8 } },
    };
    const during = update(pushed, TALK, OPEN);
    expect(during.rested).toBeNull();
    expect(during.overview).toStrictEqual({ current: 2, max: 5 });
  });

  it('is taken with Space held by a player who has no lamp: there is none to hold (0026)', () => {
    // Past the card (0036): the first press turns the page of the call.
    const past: GameState = { ...newGame(OPEN), presented: 0 };
    const called = run(OPEN, past, TALK, NONE, TALK, NONE, TALK, NONE);
    expect(called.lamp.owned).toBe(false);
    const drunk = update(called, { ...TALK, lamp: true }, OPEN);
    expect(drunk.rested).toStrictEqual({ at: called.tick + 1, result: 'full' });
  });

  it('is not taken out of reach: the step is an ordinary one', () => {
    const far = mapAt(168, 121, rects);
    expect(update(tired(far), TALK, far).rested).toBeNull();
  });

  it('is not taken in the dark, with the help open, with the journal open or in a dialogue', () => {
    const start = tired(OPEN);
    const frozen: readonly GameState[] = [
      { ...start, dark: 10 },
      { ...start, help: true },
      { ...start, journal: { tab: 'creatures' } },
      { ...start, dialogue: { speaker: 'story', index: 0, page: 0 } },
    ];
    for (const state of frozen) {
      const stepped = update(state, TALK, OPEN);
      expect(stepped.rested).toBeNull();
      expect(stepped.overview.current).toBeLessThanOrEqual(2);
    }
  });

  it('is not taken by the press that opens the journal', () => {
    const opened = update(tired(OPEN), { ...TALK, journal: true }, OPEN);
    expect(opened.journal).toStrictEqual({ tab: 'creatures' });
    expect(opened.rested).toBeNull();
  });

  it('gives way to a speaker in reach: the press opens the dialogue and takes no rest', () => {
    const map = mapAt(168, 112, rects, [{ name: 'figure:officer', x: 192, y: 112 }]);
    const opened = update(tired(map), TALK, map);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(opened.rested).toBeNull();
    expect(opened.overview).toStrictEqual({ current: 2, max: 5 });
  });

  it('is what takeRest says, and takeRest changes nothing itself', () => {
    const start = tired(OPEN);
    const before = JSON.stringify(start);
    expect(takeRest(start, TALK, OPEN)).toStrictEqual({
      overview: { current: 5, max: 5 },
      rested: { at: 1, result: 'restored' },
    });
    expect(takeRest(start, NONE, OPEN)).toBeNull();
    expect(takeRest({ ...start, held: TALK }, TALK, OPEN)).toBeNull();
    expect(JSON.stringify(start)).toBe(before);
  });

  it('survives a JSON round trip after a coffee (INV-1)', () => {
    const drunk = update(tired(OPEN), TALK, OPEN);
    expect(JSON.parse(JSON.stringify(drunk))).toStrictEqual(drunk);
  });
});
