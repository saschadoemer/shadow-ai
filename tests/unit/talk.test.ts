import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import type { Figure } from '../../src/game/cast';
import type { GameInput } from '../../src/game/player';
import type { Facing, GameState } from '../../src/game/state';
import {
  facingToward,
  figureInReach,
  openDialogue,
  TALK_DISTANCE,
  talkPressed,
} from '../../src/game/talk';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE: GameInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  lamp: false,
  talk: false,
};
const TALK: GameInput = { ...NONE, talk: true };
const RIGHT: GameInput = { ...NONE, right: true };
const OFFICER: NamedPoint = { name: 'figure:officer', x: 160, y: 96 };
/** 20x12 cells of open floor with the officer at (160, 96) and the player at (x, y). */
const mapAt = (
  x: number,
  y: number,
  points: readonly NamedPoint[] = [OFFICER],
  rects: readonly NamedRect[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);
const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, map), start);
const figure = (x: number, y: number, id = 'officer'): Figure => ({
  id,
  x,
  y,
  pages: [textKey('talk.officer-rules-1')],
});

describe('the press of talk (0017)', () => {
  it('is seen in exactly one of 600 steps with the key held', () => {
    const map = mapAt(40, 40, []);
    let state = createInitialState(map);
    let presses = 0;
    for (let step = 0; step < 600; step += 1) {
      presses += talkPressed(state, TALK) ? 1 : 0;
      state = update(state, TALK, map);
    }
    expect(presses).toBe(1);
  });

  it('is seen again after a step without the key', () => {
    const map = mapAt(40, 40, []);
    const held = run(map, createInitialState(map), TALK, TALK);
    expect(talkPressed(held, TALK)).toBe(false);
    const released = update(held, NONE, map);
    expect(talkPressed(released, TALK)).toBe(true);
    expect(talkPressed(released, NONE)).toBe(false);
  });

  it('is not seen after the dark by a key held through it', () => {
    const map = mapAt(40, 40, []);
    const dark = update({ ...createInitialState(map), dark: 88 }, TALK, map);
    expect(dark.dark).toBe(89);
    expect(talkPressed(dark, TALK)).toBe(false);
  });
});

describe('who can be talked to (0017)', () => {
  it('is 24 px', () => {
    expect(TALK_DISTANCE).toBe(24);
  });

  it('is the nearest figure within reach, the first of two equally near, none beyond', () => {
    const figures = [figure(160, 96, 'a'), figure(200, 96, 'b')];
    expect(figureInReach({ x: 184, y: 96 }, figures)).toBe(1);
    expect(figureInReach({ x: 180, y: 96 }, figures)).toBe(0);
    expect(figureInReach({ x: 136, y: 96 }, figures)).toBe(0);
    expect(figureInReach({ x: 135.9, y: 96 }, figures)).toBeNull();
    expect(figureInReach({ x: 184, y: 96 }, [])).toBeNull();
  });

  it('looks along the line to the other: sideways when that distance is the larger one', () => {
    const at = { x: 100, y: 100 };
    expect(facingToward(at, { x: 110, y: 104 }, 'up')).toBe('right');
    expect(facingToward(at, { x: 90, y: 104 }, 'up')).toBe('left');
    expect(facingToward(at, { x: 104, y: 110 }, 'up')).toBe('down');
    expect(facingToward(at, { x: 104, y: 90 }, 'down')).toBe('up');
    expect(facingToward(at, { x: 110, y: 110 }, 'up')).toBe('down');
    expect(facingToward(at, { x: 110, y: 90 }, 'down')).toBe('up');
    expect(facingToward(at, at, 'left')).toBe('left');
  });
});

describe('opening a dialogue (0017)', () => {
  it('opens on page 0 at 24 px: both turn, the player stands, the lamp is off, nothing moves', () => {
    const map = mapAt(184, 96);
    const start = createInitialState(map);
    const opened = update(start, TALK, map);
    expect(opened).toStrictEqual({
      ...start,
      tick: 1,
      talkHeld: true,
      player: { ...start.player, facing: 'left' },
      figures: [{ figure: 0, facing: 'right' }],
      dialogue: { figure: 0, page: 0 },
    });
  });

  it('does not open at 24.1 px: the step is an ordinary one', () => {
    const map = mapAt(184.1, 96);
    const next = update(createInitialState(map), TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.talkHeld).toBe(true);
    expect(next.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(next.player.facing).toBe('down');
  });

  it('does not open while the lamp is held', () => {
    const map = mapAt(184, 96);
    const next = update(createInitialState(map), { ...TALK, lamp: true }, map);
    expect(next.dialogue).toBeNull();
    expect(next.lamp.on).toBe(true);
  });

  it('does not open during a push, and not after it by the key still held', () => {
    const map = mapAt(184, 96);
    const start = createInitialState(map);
    const pushed: GameState = {
      ...start,
      player: { ...start.player, recoil: { dx: -3, dy: 0, steps: 1 } },
    };
    const next = update(pushed, TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.player.x).toBe(181);
    expect(update(next, TALK, map).dialogue).toBeNull();
    expect(run(map, next, NONE, TALK).dialogue).toStrictEqual({ figure: 0, page: 0 });
  });

  it.each<readonly [number, number, Facing, Facing]>([
    [184, 96, 'left', 'right'],
    [136, 96, 'right', 'left'],
    [160, 120, 'up', 'down'],
    [160, 72, 'down', 'up'],
    [178, 110, 'left', 'right'],
    [160, 96, 'down', 'down'],
  ])('from (%d, %d) the player looks %s and she looks %s', (x, y, player, officer) => {
    const map = mapAt(x, y);
    const opened = update(createInitialState(map), TALK, map);
    expect(opened.dialogue).toStrictEqual({ figure: 0, page: 0 });
    expect(opened.player.facing).toBe(player);
    expect(opened.figures).toStrictEqual([{ figure: 0, facing: officer }]);
  });

  it('stands a walking player still: phase 0, timer 0', () => {
    const map = mapAt(170, 96);
    const walking = run(map, createInitialState(map), RIGHT, RIGHT, RIGHT);
    expect(walking.player.frame).toBe(1);
    const opened = update(walking, TALK, map);
    expect([opened.player.frame, opened.player.frameTimer]).toStrictEqual([0, 0]);
    expect(opened.player.x).toBe(walking.player.x);
  });

  it('turns only the figure that speaks', () => {
    const map = mapAt(184, 96);
    const state: GameState = {
      ...createInitialState(map),
      figures: [
        { figure: 0, facing: 'down' },
        { figure: 1, facing: 'down' },
      ],
    };
    const opened = openDialogue(state, TALK, [figure(160, 96, 'a'), figure(200, 96, 'b')]);
    expect(opened?.dialogue).toStrictEqual({ figure: 1, page: 0 });
    expect(opened?.figures).toStrictEqual([
      { figure: 0, facing: 'down' },
      { figure: 1, facing: 'left' },
    ]);
    expect(opened?.player.facing).toBe('right');
  });
});

describe('the pages of a dialogue (0017)', () => {
  const map = mapAt(184, 96);
  const opened = update(createInitialState(map), TALK, map);

  it('stays on its page while the key is held, and turns with the next press', () => {
    expect(run(map, opened, TALK, TALK).dialogue).toStrictEqual({ figure: 0, page: 0 });
    const released = update(opened, NONE, map);
    expect(released.dialogue).toStrictEqual({ figure: 0, page: 0 });
    expect(released.talkHeld).toBe(false);
    expect(update(released, TALK, map).dialogue).toStrictEqual({ figure: 0, page: 1 });
  });

  it('closes with a press on the last page; she keeps her facing; the next step is an ordinary one', () => {
    const closed = run(map, opened, NONE, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.tick).toBe(5);
    expect(closed.figures).toStrictEqual([{ figure: 0, facing: 'right' }]);
    expect(closed.player.x).toBe(184);
    const walked = run(map, closed, NONE, RIGHT);
    expect(walked.player.x).toBeCloseTo(184 + 80 / 60, 6);
  });

  it('survives a JSON round trip on page 1 (INV-1)', () => {
    const second = run(map, opened, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ figure: 0, page: 1 });
    expect(JSON.parse(JSON.stringify(second))).toStrictEqual(second);
  });
});

describe('the world while a dialogue is open (0017)', () => {
  /** A snippet 30 px from the player, a dog on its route and a wall that was giving way. */
  const map = mapAt(
    184,
    96,
    [
      OFFICER,
      { name: 'snippet', x: 214, y: 96 },
      { name: 'dog:hr:1', x: 40, y: 152 },
      { name: 'dog:hr:2', x: 104, y: 152 },
    ],
    [{ name: 'shadow:marketing', x: 128, y: 160, width: 48, height: 4 }],
  );
  const start: GameState = {
    ...createInitialState(map),
    shadowWalls: [{ wall: 0, lit: true, light: 30 }],
  };
  const ALL_BUT_TALK: GameInput = {
    up: true,
    down: true,
    left: true,
    right: true,
    lamp: true,
    talk: false,
  };

  it('is not stepped in the step that opens it', () => {
    const opened = update(start, TALK, map);
    expect(opened.dialogue).toStrictEqual({ figure: 0, page: 0 });
    expect(opened.creatures).toStrictEqual(start.creatures);
    expect(opened.movers).toStrictEqual(start.movers);
    expect(opened.shadowWalls).toStrictEqual(start.shadowWalls);
  });

  it('stands still for 600 steps with every other key held: only the tick grows', () => {
    const opened = update(start, TALK, map);
    let state = opened;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, ALL_BUT_TALK, map);
    }
    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, talkHeld: false });
  });

  it('moves again once it is closed', () => {
    const opened = update(start, TALK, map);
    const closed = run(map, opened, NONE, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    const later = run(map, closed, NONE, NONE);
    expect(later.creatures[0]?.x).toBeLessThan(214);
    expect(later.movers).not.toStrictEqual(closed.movers);
  });
});

describe('a game without figures (0017)', () => {
  it('steps as before when talk is never held: 600 recorded steps', () => {
    const withFigure = mapAt(40, 152, [OFFICER, { name: 'snippet', x: 200, y: 152 }]);
    const without = mapAt(40, 152, [{ name: 'snippet', x: 200, y: 152 }]);
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
      talk: false,
    }));
    let a = createInitialState(withFigure);
    let b = createInitialState(without);
    for (const input of inputs) {
      a = update(a, input, withFigure);
      b = update(b, input, without);
    }
    expect({ ...a, figures: [] }).toStrictEqual(b);
  });
});
