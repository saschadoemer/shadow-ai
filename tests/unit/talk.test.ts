import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import type { Colleague, Figure } from '../../src/game/cast';
import { routesOf } from '../../src/game/mover';
import type { GameInput } from '../../src/game/player';
import type { Facing, GameState, MoverState } from '../../src/game/state';
import {
  facingToward,
  inSight,
  openDialogue,
  type Speaker,
  speakerInReach,
  speakerOf,
  speakersOf,
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
  journal: false,
  help: false,
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

describe('who can be talked to (0017, 0018)', () => {
  it('is 40 px: across a counter', () => {
    expect(TALK_DISTANCE).toBe(40);
  });

  it('is the nearest figure within reach, the first of two equally near, none beyond', () => {
    const open = mapAt(0, 0, []);
    const speakers = speakersOf([figure(160, 96, 'a'), figure(240, 96, 'b')], [], []);
    const index = (x: number): number | undefined =>
      speakerInReach({ x, y: 96 }, speakers, open)?.index;
    expect(index(204)).toBe(1);
    expect(index(200)).toBe(0);
    expect(index(120)).toBe(0);
    expect(index(119.9)).toBeUndefined();
    expect(speakerInReach({ x: 184, y: 96 }, [], open)).toBeNull();
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
  it('opens on page 0 at 40 px: both turn, the player stands, the lamp is off, nothing moves', () => {
    const map = mapAt(200, 96);
    const start = createInitialState(map);
    const opened = update(start, TALK, map);
    expect(opened).toStrictEqual({
      ...start,
      tick: 1,
      held: TALK,
      player: { ...start.player, facing: 'left' },
      figures: [{ figure: 0, facing: 'right' }],
      dialogue: { speaker: 'figure', index: 0, page: 0 },
    });
  });

  it('does not open at 40.1 px: the step is an ordinary one', () => {
    const map = mapAt(200.1, 96);
    const next = update(createInitialState(map), TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.held).toStrictEqual(TALK);
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
    expect(run(map, next, NONE, TALK).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 0,
    });
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
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
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
    const speakers = speakersOf([figure(160, 96, 'a'), figure(200, 96, 'b')], [], []);
    const opened = openDialogue(state, TALK, speakers, map);
    expect(opened?.dialogue).toStrictEqual({ speaker: 'figure', index: 1, page: 0 });
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
    expect(run(map, opened, TALK, TALK).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 0,
    });
    const released = update(opened, NONE, map);
    expect(released.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
    expect(released.held).toStrictEqual(NONE);
    expect(update(released, TALK, map).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 1,
    });
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
    expect(second.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 1 });
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
    journal: false,
    help: false,
  };

  it('is not stepped in the step that opens it', () => {
    const opened = update(start, TALK, map);
    expect(opened.dialogue).toStrictEqual({ speaker: 'figure', index: 0, page: 0 });
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
    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, held: ALL_BUT_TALK });
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
      journal: false,
      help: false,
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

/** A colleague with lines: a route of two points, 64 px apart, with ten seconds on the first. */
const WALKER: readonly NamedPoint[] = [
  { name: 'person:reception:1', x: 64, y: 48, pause: 600 },
  { name: 'person:reception:2', x: 128, y: 48 },
];
const SAYING = textKey('talk.reception-everyday');
/** The state of `map` with its first mover changed. */
const withMover = (map: TileMap, fields: Partial<MoverState>): GameState => {
  const start = createInitialState(map);
  return {
    ...start,
    movers: start.movers.map((mover, i) => (i === 0 ? { ...mover, ...fields } : mover)),
  };
};
const MOVER_TALK = { speaker: 'mover', index: 0, page: 0 } as const;

describe('the speakers of a step (0018)', () => {
  const routes = routesOf([
    ...WALKER,
    { name: 'dog:reception:1', x: 40, y: 152 },
    { name: 'dog:reception:2', x: 104, y: 152 },
    { name: 'person:hr:1', x: 200, y: 152 },
    { name: 'person:hr:2', x: 264, y: 152 },
  ]);
  const movers = createInitialState(
    mapAt(300, 20, [
      ...WALKER,
      { name: 'dog:reception:1', x: 40, y: 152 },
      { name: 'dog:reception:2', x: 104, y: 152 },
      { name: 'person:hr:1', x: 200, y: 152 },
      { name: 'person:hr:2', x: 264, y: 152 },
    ]),
  ).movers;

  it('are the standing figures, then the colleagues whose route has lines', () => {
    expect(movers.map((mover) => mover.kind)).toStrictEqual(['person', 'dog', 'person']);
    expect(speakersOf([figure(160, 96)], movers, routes)).toStrictEqual([
      { speaker: 'figure', index: 0, x: 160, y: 96, pages: [textKey('talk.officer-rules-1')] },
      { speaker: 'mover', index: 0, x: 64, y: 48, pages: [SAYING] },
    ]);
  });

  it('take a colleague where it is in the state, not where its route starts', () => {
    const moved = movers.map((mover, i) => (i === 0 ? { ...mover, x: 90.5, y: 48 } : mover));
    expect(speakersOf([], moved, routes)).toStrictEqual([
      { speaker: 'mover', index: 0, x: 90.5, y: 48, pages: [SAYING] },
    ]);
  });

  it('read the lines from the table they are given: the game passes its own', () => {
    const table: readonly Colleague[] = [{ route: 'person:hr', pages: [SAYING] }];
    expect(speakersOf([], movers, routes, table)).toStrictEqual([
      { speaker: 'mover', index: 2, x: 200, y: 152, pages: [SAYING] },
    ]);
    expect(speakersOf([], movers, routes, [])).toStrictEqual([]);
  });

  it('find the speaker of a dialogue by its kind and its index', () => {
    const speakers = speakersOf([figure(160, 96)], movers, routes);
    expect(speakerOf({ speaker: 'mover', index: 0, page: 0 }, speakers)?.pages).toStrictEqual([
      SAYING,
    ]);
    expect(speakerOf({ speaker: 'figure', index: 0, page: 0 }, speakers)?.x).toBe(160);
    expect(speakerOf({ speaker: 'mover', index: 1, page: 0 }, speakers)).toBeUndefined();
  });
});

describe('in sight (0018)', () => {
  /** A box 4 px wide in cell (10, 5), on the line between the officer and (184, 96). */
  const BOX = { x: 170, y: 80, width: 4, height: 16 };
  const boxed = (map: TileMap, ...layers: readonly ('solids' | 'opaque')[]): TileMap => {
    const cells = (layer: 'solids' | 'opaque') =>
      map[layer].map((boxes, cell) => (cell === 5 * map.width + 10 ? [BOX] : boxes));
    return {
      ...map,
      solids: layers.includes('solids') ? cells('solids') : map.solids,
      opaque: layers.includes('opaque') ? cells('opaque') : map.opaque,
    };
  };

  it('is the line between the two box centres against the opaque boxes', () => {
    const open = mapAt(184, 96);
    expect(inSight({ x: 184, y: 96 }, { x: 160, y: 96 }, open)).toBe(true);
    expect(inSight({ x: 184, y: 96 }, { x: 160, y: 96 }, boxed(open, 'solids'))).toBe(true);
    expect(inSight({ x: 184, y: 96 }, { x: 160, y: 96 }, boxed(open, 'opaque'))).toBe(false);
    // Below the box the line is free again.
    expect(inSight({ x: 184, y: 104 }, { x: 160, y: 104 }, boxed(open, 'opaque'))).toBe(true);
  });

  it('opens no dialogue through a wall at 24 px: the step is an ordinary one', () => {
    const map = boxed(mapAt(184, 96), 'solids', 'opaque');
    const next = update(createInitialState(map), TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.held).toStrictEqual(TALK);
    expect(next.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
  });

  it('opens the dialogue across a box that is solid and not opaque', () => {
    const map = boxed(mapAt(184, 96), 'solids');
    expect(update(createInitialState(map), TALK, map).dialogue).toStrictEqual({
      speaker: 'figure',
      index: 0,
      page: 0,
    });
  });

  it('passes over a nearer speaker behind a wall for a farther one in sight', () => {
    const map = boxed(mapAt(184, 96), 'opaque');
    const speakers = speakersOf([figure(160, 96, 'a'), figure(214, 96, 'b')], [], []);
    expect(speakerInReach({ x: 184, y: 96 }, speakers, map)?.index).toBe(1);
  });
});

describe('talking to a colleague (0018)', () => {
  it('opens with a colleague that waits: it turns, the player turns, nothing else changes', () => {
    const map = mapAt(104, 48, WALKER);
    const start = createInitialState(map);
    expect(start.movers[0]).toMatchObject({ kind: 'person', x: 64, y: 48, wait: 600, target: 1 });
    const opened = update(start, TALK, map);
    expect(opened).toStrictEqual({
      ...start,
      tick: 1,
      held: TALK,
      player: { ...start.player, facing: 'left' },
      movers: [{ ...start.movers[0], facing: 'right' }],
      dialogue: MOVER_TALK,
    });
  });

  it.each<readonly [number, number, Facing, Facing]>([
    [104, 48, 'left', 'right'],
    [24, 48, 'right', 'left'],
    [64, 88, 'up', 'down'],
    [64, 8, 'down', 'up'],
    [90, 68, 'left', 'right'],
  ])('from (%d, %d) the player looks %s and the colleague looks %s', (x, y, player, colleague) => {
    const map = mapAt(x, y, WALKER);
    const opened = update(createInitialState(map), TALK, map);
    expect(opened.dialogue).toStrictEqual(MOVER_TALK);
    expect(opened.player.facing).toBe(player);
    expect(opened.movers[0]?.facing).toBe(colleague);
  });

  it('stands a colleague still that was on a leg: frame 0, timer 0, its place and its target kept', () => {
    const map = mapAt(90, 80, WALKER);
    const walking = withMover(map, { x: 90, facing: 'right', frame: 3, frameTimer: 7, wait: 0 });
    const opened = update(walking, TALK, map);
    expect(opened.dialogue).toStrictEqual(MOVER_TALK);
    expect(opened.movers[0]).toStrictEqual({
      ...walking.movers[0],
      facing: 'down',
      frame: 0,
      frameTimer: 0,
    });
    expect(opened.player.facing).toBe('up');
  });

  it('does not open at 40.1 px', () => {
    const map = mapAt(104.1, 48, WALKER);
    expect(update(createInitialState(map), TALK, map).dialogue).toBeNull();
  });

  it('opens nothing next to a person without lines or next to a dog', () => {
    const silent = mapAt(74, 48, [
      { name: 'person:hr:1', x: 64, y: 48, pause: 600 },
      { name: 'person:hr:2', x: 128, y: 48 },
    ]);
    const next = update(createInitialState(silent), TALK, silent);
    expect(next.dialogue).toBeNull();
    expect(next.held).toStrictEqual(TALK);
    const dog = mapAt(74, 48, [
      { name: 'dog:reception:1', x: 64, y: 48, pause: 600 },
      { name: 'dog:reception:2', x: 128, y: 48 },
    ]);
    expect(update(createInitialState(dog), TALK, dog).dialogue).toBeNull();
  });

  it('speaks to the nearer of two, a figure before a colleague, the earlier of two colleagues', () => {
    const open = mapAt(0, 0, []);
    const at = (speaker: Speaker['speaker'], index: number, x: number): Speaker => ({
      speaker,
      index,
      x,
      y: 96,
      pages: [SAYING],
    });
    const mixed = [at('figure', 0, 160), at('mover', 3, 200)];
    const chosen = (x: number, speakers: readonly Speaker[]) => {
      const speaker = speakerInReach({ x, y: 96 }, speakers, open);
      return speaker === null ? null : [speaker.speaker, speaker.index];
    };
    expect(chosen(190, mixed)).toStrictEqual(['mover', 3]);
    expect(chosen(170, mixed)).toStrictEqual(['figure', 0]);
    expect(chosen(180, mixed)).toStrictEqual(['figure', 0]);
    expect(chosen(180, [at('mover', 1, 160), at('mover', 2, 200)])).toStrictEqual(['mover', 1]);
    expect(chosen(180, [at('mover', 2, 200), at('mover', 1, 160)])).toStrictEqual(['mover', 2]);
  });
});

describe('a colleague during and after its saying (0018)', () => {
  const ALL_BUT_TALK: GameInput = {
    up: true,
    down: true,
    left: true,
    right: true,
    lamp: true,
    talk: false,
    journal: false,
    help: false,
  };

  it('stands still for 600 steps with every other key held: only the tick grows', () => {
    const map = mapAt(
      104,
      48,
      [...WALKER, { name: 'snippet', x: 134, y: 48 }],
      [{ name: 'shadow:marketing', x: 128, y: 160, width: 48, height: 4 }],
    );
    const start: GameState = {
      ...withMover(map, { x: 70, facing: 'right', frame: 2, frameTimer: 3, wait: 0 }),
      shadowWalls: [{ wall: 0, lit: true, light: 30 }],
    };
    const opened = update(start, TALK, map);
    expect(opened.dialogue).toStrictEqual(MOVER_TALK);
    expect(opened.movers[0]).toStrictEqual({
      ...start.movers[0],
      facing: 'right',
      frame: 0,
      frameTimer: 0,
    });
    let state = opened;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, ALL_BUT_TALK, map);
    }
    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, held: ALL_BUT_TALK });
  });

  it('closes with the first press after the opening: a saying has one page', () => {
    const map = mapAt(104, 48, WALKER);
    const opened = update(createInitialState(map), TALK, map);
    expect(run(map, opened, TALK, TALK).dialogue).toStrictEqual(MOVER_TALK);
    const closed = run(map, opened, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.tick).toBe(3);
    expect(closed.movers).toStrictEqual(opened.movers);
  });

  it('stands on while the player is closer than 20 px, and keeps looking at where the player was', () => {
    const map = mapAt(83, 48, WALKER);
    const closed = run(map, withMover(map, { wait: 0 }), TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    const later = run(map, closed, NONE, NONE, NONE);
    expect(later.movers[0]).toStrictEqual({ ...closed.movers[0] });
    expect(later.movers[0]).toMatchObject({ x: 64, facing: 'right', frame: 0, wait: 0 });
  });

  it('waits what is left of its pause at 21 px, still looking at the player', () => {
    const map = mapAt(85, 48, WALKER);
    const closed = run(map, createInitialState(map), TALK, NONE, TALK);
    expect(closed.movers[0]).toMatchObject({ wait: 600, facing: 'right' });
    const later = run(map, closed, NONE, NONE, NONE);
    expect(later.movers[0]).toMatchObject({ x: 64, wait: 597, facing: 'right', frame: 0 });
  });

  it('takes the facing of its leg in the step in which it moves again', () => {
    const map = mapAt(64, 69, WALKER);
    const closed = run(map, withMover(map, { wait: 0 }), TALK, NONE, TALK);
    expect(closed.movers[0]).toMatchObject({ x: 64, facing: 'down', frame: 0 });
    const moved = update(closed, NONE, map);
    expect(moved.movers[0]?.facing).toBe('right');
    expect(moved.movers[0]?.frame).toBe(1);
    expect(moved.movers[0]?.x).toBeCloseTo(64 + 40 / 60, 6);
  });

  it('reaches its target after as many moving steps as without the talk', () => {
    const map = mapAt(64, 69, WALKER);
    const start = withMover(map, { wait: 0 });
    /** The step after which the colleague stands on its point 2, with the inputs given first. */
    const arrival = (...first: readonly GameInput[]): number => {
      let state = start;
      for (let step = 1; step <= 200; step += 1) {
        state = update(state, first[step - 1] ?? NONE, map);
        if (state.movers[0]?.x === 128) {
          return step;
        }
      }
      return -1;
    };
    const quiet = arrival();
    expect(quiet).toBe(96);
    const thirty = Array.from({ length: 30 }, () => NONE);
    // Thirty steps on the leg, then the press, a step without the key and the press that closes.
    expect(arrival(...thirty, TALK, NONE, TALK)).toBe(quiet + 3);
  });

  it('survives a JSON round trip with a colleague speaking (INV-1)', () => {
    const map = mapAt(104, 48, WALKER);
    const opened = update(createInitialState(map), TALK, map);
    expect(opened.dialogue).toStrictEqual(MOVER_TALK);
    expect(JSON.parse(JSON.stringify(opened))).toStrictEqual(opened);
  });
});

describe('a game without speakers (0018)', () => {
  it('steps as before when talk is never held: 600 recorded steps', () => {
    const points: readonly NamedPoint[] = [
      { name: 'snippet', x: 200, y: 152 },
      { name: 'dog:reception:1', x: 40, y: 40, pause: 60 },
      { name: 'dog:reception:2', x: 104, y: 40 },
    ];
    const withSpeakers = mapAt(40, 152, [OFFICER, ...points, ...WALKER]);
    const without = mapAt(40, 152, points);
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
      talk: false,
      journal: false,
      help: false,
    }));
    let a = createInitialState(withSpeakers);
    let b = createInitialState(without);
    for (const input of inputs) {
      a = update(a, input, withSpeakers);
      b = update(b, input, without);
    }
    expect({
      ...a,
      figures: [],
      movers: a.movers.filter((mover) => mover.kind !== 'person'),
    }).toStrictEqual(b);
  });
});
