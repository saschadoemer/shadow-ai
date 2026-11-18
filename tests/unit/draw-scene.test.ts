import { describe, expect, it } from 'vitest';
import { EMPTY, type TileMap } from '../../src/engine/tiled';
import { WIDE_FRAME_APEX } from '../../src/game/lamp';
import { NO_INPUT } from '../../src/game/player';
import {
  type CreatureState,
  type FigureState,
  type GameState,
  type MoverState,
  NO_RECOIL,
  type PlayerState,
  type ShadowWallState,
} from '../../src/game/state';
import {
  creatureFrame,
  creatureOrigin,
  DIALOGUE_BOX,
  DIALOGUE_LINE_CAPACITY,
  DIALOGUE_LINES,
  DIALOGUE_MARKER,
  DIALOGUE_TEXT,
  drawScene as drawSceneWith,
  figureFrame,
  figureOrigin,
  HEART_MARGIN,
  HEART_PITCH,
  HEART_SIZE,
  LANGUAGE_NOTICE_STEPS,
  lampFrame,
  lampFrameOrigin,
  languageNoticeVisible,
  lidHeight,
  MARKER_BLINK_STEPS,
  markerVisible,
  moverFrame,
  moverOrigin,
  NOTICE_BAR,
  NOTICE_CAPACITY,
  noticeOrigin,
  playerFrame,
  playerVisible,
  type SceneContent,
  type SceneSettings,
  TRACE_LOOKS,
  traceFrame,
  wallLook,
  wallSegments,
} from '../../src/render/draw-scene';
import { GLYPH_WIDTH } from '../../src/render/font';
import type { Renderer, SpriteSheet } from '../../src/render/renderer';
import { LANGUAGES, TABLE } from '../../src/text/text';
import { solidsOf } from './solids';

/** A renderer that only records what it was asked to draw, one line per call. */
function recordingRenderer(): Renderer & {
  readonly calls: string[];
  readonly sheets: SpriteSheet[];
  readonly tilesets: unknown[];
} {
  const calls: string[] = [];
  const sheets: SpriteSheet[] = [];
  const tilesets: unknown[] = [];
  return {
    calls,
    sheets,
    tilesets,
    clear(colour) {
      calls.push(`clear ${colour}`);
    },
    fillRect(x, y, width, height, colour) {
      calls.push(`fillRect ${x},${y} ${width}x${height} ${colour}`);
    },
    drawTile(tileset, id, x, y) {
      tilesets.push(tileset);
      calls.push(`drawTile ${id} at ${x},${y}`);
    },
    drawSprite(sheet, frame, x, y) {
      sheets.push(sheet);
      calls.push(`drawSprite ${frame} at ${x},${y}`);
    },
  };
}

/** The 3x2 map of draw-map.test.ts: ground with one empty cell, one detail tile, one above tile. */
const MAP: TileMap = {
  width: 3,
  height: 2,
  ground: [0, 1, EMPTY, 2, 2, 2],
  detail: [EMPTY, EMPTY, EMPTY, EMPTY, 4, EMPTY],
  above: [6, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  spawn: { x: 8, y: 8 },
  points: [],
  rects: [],
  solids: solidsOf([false, false, false, true, true, true], 3),
  opaque: solidsOf([false, false, false, true, true, true], 3),
};
const CONTENT: SceneContent = {
  map: MAP,
  tileset: { image: {} as ImageBitmap, columns: 7 },
  // Its own image, so that toStrictEqual tells the two tilesets apart.
  shadowTileset: { image: { shadow: true } as unknown as ImageBitmap, columns: 7 },
  veilSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
  playerSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 },
  lampSheet: { image: {} as ImageBitmap, frameWidth: 48, frameHeight: 48 },
  lampWideSheet: { image: {} as ImageBitmap, frameWidth: 72, frameHeight: 72 },
  creatureSheets: { snippet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 } },
  overviewSheet: { image: {} as ImageBitmap, frameWidth: 8, frameHeight: 8 },
  shadowWallSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
  traceSheet: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
  moverSheets: {
    person: [0, 1, 2, 3].map(() => ({
      image: {} as ImageBitmap,
      frameWidth: 16,
      frameHeight: 24,
    })),
    dog: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
    vacuum: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
    drone: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 },
  },
  fontSheet: { image: {} as ImageBitmap, frameWidth: 6, frameHeight: 10 },
  figureSheets: { officer: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 } },
};
/** The settings of a game in which the language was never switched (0019). */
const GERMAN: SceneSettings = { language: 'de', switchedAt: null };
const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
/** The scene with the settings of a fresh game, unless a test hands over its own. */
const drawScene = (
  renderer: Renderer,
  scene: GameState,
  content: SceneContent,
  settings: SceneSettings = GERMAN,
): void => drawSceneWith(renderer, scene, content, settings);
const player = (fields: Partial<PlayerState>): PlayerState => ({
  x: 0,
  y: 0,
  facing: 'down',
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
  ...fields,
});
/**
 * A tick past the start hint (0021). 600 is a multiple of every period a frame is chosen by —
 * 4, 15, 30 and 60 steps — so a scene at 600 + n shows the frames of tick n.
 */
const QUIET_TICK = 600;
const state = (
  fields: Partial<PlayerState>,
  camera = { x: 0, y: 0 },
  lampOn = false,
): GameState => ({
  tick: QUIET_TICK,
  started: 0,
  rested: null,
  upgrades: [],
  player: player(fields),
  camera,
  lamp: { on: lampOn, strength: 1, owned: true, used: true },
  creatures: [],
  movers: [],
  shadowWalls: [],
  traces: [],
  solved: [],
  figures: [],
  dialogue: null,
  journal: null,
  help: false,
  held: NO_INPUT,
  captured: { snippet: 0 },
  // No hearts: the call lists of the earlier features stay as they were (0009).
  overview: { current: 0, max: 0 },
  dark: 0,
});

describe('playerFrame', () => {
  it('is facing × 5 + phase, facings in the order down, up, left, right', () => {
    expect(playerFrame(player({ facing: 'down', frame: 0 }))).toBe(0);
    expect(playerFrame(player({ facing: 'down', frame: 4 }))).toBe(4);
    expect(playerFrame(player({ facing: 'up', frame: 3 }))).toBe(8);
    expect(playerFrame(player({ facing: 'left', frame: 1 }))).toBe(11);
    expect(playerFrame(player({ facing: 'right', frame: 4 }))).toBe(19);
  });
});

describe('drawScene', () => {
  // Criterion 5 of 0011 (a figure is drawn behind the top of a tall thing) rests on this case.
  it('clears, then draws ground, detail, the player, above', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }), CONTENT);
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
      'drawTile 0 at 0,0',
      'drawTile 1 at 16,0',
      'drawTile 2 at 0,16',
      'drawTile 2 at 16,16',
      'drawTile 2 at 32,16',
      'drawTile 4 at 16,16',
      'drawSprite 13 at 12,7', // round(20.4) − 8, round(30.6) − 24
      'drawTile 6 at 0,0',
    ]);
    expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet]);
  });

  it('puts the sprite so that the feet are its bottom centre: the spawn (136, 120) draws at (128, 96)', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 136, y: 120 }), CONTENT);
    expect(renderer.calls).toContain('drawSprite 0 at 128,96');
  });

  it('rounds the feet position before subtracting the offset', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 10.5, y: 24.5 }), CONTENT);
    expect(renderer.calls).toContain('drawSprite 0 at 3,1'); // round(10.5) = 11, round(24.5) = 25
  });

  it('shifts tiles and sprite by the camera: camera (5, 7), feet (20.4, 30.6) draw the sprite at (7, 0)', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }, { x: 5, y: 7 }),
      CONTENT,
    );
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
      'drawTile 0 at -5,-7',
      'drawTile 1 at 11,-7',
      'drawTile 2 at -5,9',
      'drawTile 2 at 11,9',
      'drawTile 2 at 27,9',
      'drawTile 4 at 11,9',
      'drawSprite 13 at 7,0', // round(20.4) − 8 − 5, round(30.6) − 24 − 7
      'drawTile 6 at -5,-7',
    ]);
    expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet]);
  });
});

describe('the lamp in the scene (0007)', () => {
  const camera = { x: 5, y: 7 };

  it('draws the cone after detail and before the player, from the lamp sheet, when the lamp is on', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }, camera, true),
      CONTENT,
    );
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
      'drawTile 0 at -5,-7',
      'drawTile 1 at 11,-7',
      'drawTile 2 at -5,9',
      'drawTile 2 at 11,9',
      'drawTile 2 at 27,9',
      'drawTile 4 at 11,9',
      'drawSprite 2 at -32,-12', // the cone facing left: apex (20, 19) − (47, 24) − camera
      'drawSprite 13 at 7,0',
      'drawTile 6 at -5,-7',
    ]);
    expect(renderer.sheets).toStrictEqual([CONTENT.lampSheet, CONTENT.playerSheet]);
  });

  it('places the frame by the facing: feet (20.4, 30.6), camera (5, 7)', () => {
    const feet = { x: 20.4, y: 30.6 };
    expect(lampFrameOrigin(player({ ...feet, facing: 'down' }), camera)).toStrictEqual({
      x: -9,
      y: 12,
    });
    expect(lampFrameOrigin(player({ ...feet, facing: 'up' }), camera)).toStrictEqual({
      x: -9,
      y: -35,
    });
    expect(lampFrameOrigin(player({ ...feet, facing: 'left' }), camera)).toStrictEqual({
      x: -32,
      y: -12,
    });
    expect(lampFrameOrigin(player({ ...feet, facing: 'right' }), camera)).toStrictEqual({
      x: 15,
      y: -12,
    });
  });

  it('puts the down-facing frame at (136, 82) at the spawn, its apex on the chest row (160, 82)', () => {
    expect(lampFrameOrigin(player({ x: 1024, y: 734 }), { x: 864, y: 640 })).toStrictEqual({
      x: 136,
      y: 82,
    });
  });

  it("uses the facing's index as the frame", () => {
    expect(lampFrame(player({ facing: 'down' }))).toBe(0);
    expect(lampFrame(player({ facing: 'up' }))).toBe(1);
    expect(lampFrame(player({ facing: 'left' }))).toBe(2);
    expect(lampFrame(player({ facing: 'right' }))).toBe(3);
  });
});

describe('the creatures in the scene (0008)', () => {
  const camera = { x: 5, y: 7 };
  const snippet = (x: number, y: number, light = 0): CreatureState => ({
    species: 'snippet',
    x,
    y,
    light,
    home: { x: 0, y: 0 },
  });

  it('draws them after the cone and before the player, in array order', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      {
        ...state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }, camera, true),
        tick: QUIET_TICK + 15,
        creatures: [snippet(40.4, 50.6), snippet(60, 40, 5)],
      },
      CONTENT,
    );
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
      'drawTile 0 at -5,-7',
      'drawTile 1 at 11,-7',
      'drawTile 2 at -5,9',
      'drawTile 2 at 11,9',
      'drawTile 2 at 27,9',
      'drawTile 4 at 11,9',
      'drawSprite 2 at -32,-12', // the cone
      'drawSprite 1 at 27,28', // free at tick 15: frame 1; round(40.4) − 8 − 5, round(50.6) − 16 − 7
      'drawSprite 2 at 47,17', // frozen: frame 2; 60 − 8 − 5, 40 − 16 − 7
      'drawSprite 13 at 7,0',
      'drawTile 6 at -5,-7',
    ]);
    expect(renderer.sheets).toStrictEqual([
      CONTENT.lampSheet,
      CONTENT.creatureSheets.snippet,
      CONTENT.creatureSheets.snippet,
      CONTENT.playerSheet,
    ]);
  });

  it('places the frame by the feet: (40.4, 50.6) with camera (5, 7) is (27, 28)', () => {
    expect(creatureOrigin(snippet(40.4, 50.6), camera)).toStrictEqual({ x: 27, y: 28 });
  });

  it('bobs every 15 steps while free and shows frame 2 while frozen', () => {
    expect([0, 14, 15, 29, 30].map((tick) => creatureFrame(snippet(0, 0), tick))).toStrictEqual([
      0, 0, 1, 1, 0,
    ]);
    expect(creatureFrame(snippet(0, 0, 1), 0)).toBe(2);
    expect(creatureFrame(snippet(0, 0, 59), 15)).toBe(2);
  });
});

describe('overview in the scene (0009, 0012)', () => {
  const scene = (fields: Partial<GameState>): GameState => ({
    ...state({ x: 20.4, y: 30.6, facing: 'left', frame: 3 }),
    ...fields,
  });
  const MAP_CALLS = [
    'clear #181425',
    'drawTile 0 at 0,0',
    'drawTile 1 at 16,0',
    'drawTile 2 at 0,16',
    'drawTile 2 at 16,16',
    'drawTile 2 at 32,16',
    'drawTile 4 at 16,16',
  ];

  it('draws one heart per point of the maximum after above: full, full, empty for 2 of 3', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene({ overview: { current: 2, max: 3 } }), CONTENT);
    expect(renderer.calls).toStrictEqual([
      ...MAP_CALLS,
      'drawSprite 13 at 12,7',
      'drawTile 6 at 0,0',
      'drawSprite 0 at 4,4',
      'drawSprite 0 at 14,4',
      'drawSprite 1 at 24,4',
    ]);
    expect(renderer.sheets).toStrictEqual([
      CONTENT.playerSheet,
      CONTENT.overviewSheet,
      CONTENT.overviewSheet,
      CONTENT.overviewSheet,
    ]);
  });

  it('does not shift the hearts with the camera', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      { ...scene({ overview: { current: 1, max: 1 } }), camera: { x: 5, y: 7 } },
      CONTENT,
    );
    expect(renderer.calls.at(-1)).toBe('drawSprite 0 at 4,4');
  });

  it('draws five hearts for 3 of 5: three full, two empty, 10 px apart', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene({ overview: { current: 3, max: 5 } }), CONTENT);
    expect(renderer.calls.slice(-5)).toStrictEqual([
      'drawSprite 0 at 4,4',
      'drawSprite 0 at 14,4',
      'drawSprite 0 at 24,4',
      'drawSprite 1 at 34,4',
      'drawSprite 1 at 44,4',
    ]);
  });

  it('names the row by its picture', () => {
    expect([HEART_SIZE, HEART_MARGIN, HEART_PITCH]).toStrictEqual([8, 4, 10]);
  });

  it('draws no lid while the game runs', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene({ overview: { current: 3, max: 3 } }), CONTENT);
    expect(renderer.calls.filter((call) => call.startsWith('fillRect'))).toStrictEqual([]);
  });

  it('draws the two lids last, in the page colour', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene({ overview: { current: 0, max: 3 }, dark: 15 }), CONTENT);
    expect(renderer.calls.slice(-3)).toStrictEqual([
      'drawSprite 1 at 24,4',
      'fillRect 0,0 320x45 #181425',
      'fillRect 0,135 320x45 #181425',
    ]);
  });

  it('the lids close in 30 steps, stay closed for 30 and open in 30', () => {
    expect([0, 1, 15, 30, 45, 60, 75, 89].map(lidHeight)).toStrictEqual([
      0, 3, 45, 90, 90, 90, 45, 3,
    ]);
  });

  it('leaves the figure out in every second group of four steps while it is safe', () => {
    const visible = (grace: number): boolean => playerVisible(player({ grace }));
    expect([90, 88, 87, 84, 83, 4, 3, 0].map(visible)).toStrictEqual([
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      true,
    ]);
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 20.4, y: 30.6, grace: 87 }), CONTENT);
    expect(renderer.calls).toStrictEqual([...MAP_CALLS, 'drawTile 6 at 0,0']);
  });

  it('still draws the cone while the figure blinks', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 20.4, y: 30.6, grace: 87 }, { x: 0, y: 0 }, true), CONTENT);
    expect(renderer.sheets).toStrictEqual([CONTENT.lampSheet]);
  });
});

const mover = (fields: Partial<MoverState> & Pick<MoverState, 'kind'>): MoverState => ({
  look: 0,
  route: 0,
  x: 0,
  y: 0,
  facing: 'down',
  frame: 0,
  frameTimer: 0,
  target: 1,
  wait: 0,
  ...fields,
});

describe('the movers in the scene (0015)', () => {
  it('frames: a person as the figure, a dog by look, facing and phase, the others by the tick', () => {
    expect(moverFrame(mover({ kind: 'person', facing: 'left', frame: 3 }), 0)).toBe(2 * 5 + 3);
    expect(moverFrame(mover({ kind: 'dog', look: 1, facing: 'up', frame: 2 }), 0)).toBe(12 + 3 + 2);
    expect(
      [0, 29, 30, 59, 60].map((tick) => moverFrame(mover({ kind: 'vacuum' }), tick)),
    ).toStrictEqual([0, 0, 1, 1, 0]);
    expect([0, 3, 4, 7, 8].map((tick) => moverFrame(mover({ kind: 'drone' }), tick))).toStrictEqual(
      [0, 0, 1, 1, 0],
    );
  });

  it('origins: the feet are the bottom centre; a drone is 1 px higher in every second half second', () => {
    const camera = { x: 10, y: 20 };
    expect(moverOrigin(mover({ kind: 'person', x: 100.4, y: 80.6 }), camera, 0)).toStrictEqual({
      x: 82,
      y: 37,
    });
    expect(moverOrigin(mover({ kind: 'dog', x: 100.4, y: 80.6 }), camera, 0)).toStrictEqual({
      x: 82,
      y: 45,
    });
    expect(moverOrigin(mover({ kind: 'drone', x: 100, y: 80 }), camera, 29)).toStrictEqual({
      x: 82,
      y: 44,
    });
    expect(moverOrigin(mover({ kind: 'drone', x: 100, y: 80 }), camera, 30)).toStrictEqual({
      x: 82,
      y: 43,
    });
    expect(moverOrigin(mover({ kind: 'vacuum', x: 100, y: 80 }), camera, 30)).toStrictEqual({
      x: 82,
      y: 44,
    });
  });

  it('draws ground movers at or above the figure before the creatures, the others after the figure, drones after `above`', () => {
    const renderer = recordingRenderer();
    const base = state({ x: 20, y: 30 });
    drawScene(
      renderer,
      {
        ...base,
        tick: QUIET_TICK + 30,
        creatures: [{ species: 'snippet', x: 40, y: 20, light: 0, home: { x: 40, y: 20 } }],
        overview: { current: 1, max: 1 },
        movers: [
          mover({ kind: 'drone', x: 24, y: 20 }),
          mover({ kind: 'dog', look: 1, facing: 'left', frame: 1, x: 20, y: 31 }),
          mover({ kind: 'person', look: 2, x: 20, y: 30 }),
          mover({ kind: 'vacuum', x: 20, y: 29 }),
        ],
      },
      CONTENT,
    );
    const names = new Map<SpriteSheet, string>([
      [CONTENT.playerSheet, 'player'],
      [CONTENT.creatureSheets.snippet, 'snippet'],
      [CONTENT.overviewSheet, 'heart'],
      [CONTENT.moverSheets.dog, 'dog'],
      [CONTENT.moverSheets.vacuum, 'vacuum'],
      [CONTENT.moverSheets.drone, 'drone'],
      ...CONTENT.moverSheets.person.map((sheet, n) => [sheet, `person ${n}`] as const),
    ]);
    expect(renderer.sheets.map((sheet) => names.get(sheet))).toStrictEqual([
      'person 2',
      'vacuum',
      'snippet',
      'player',
      'dog',
      'drone',
      'heart',
    ]);
    const sprites = renderer.calls.filter((call) => call.startsWith('drawSprite'));
    expect(sprites).toStrictEqual([
      'drawSprite 0 at 12,6', // person: (20 − 8, 30 − 24), facing down, frame 0
      'drawSprite 1 at 12,13', // vacuum: tick 30 shows frame 1
      'drawSprite 0 at 32,4', // snippet: tick 30 is its frame 0
      'drawSprite 0 at 12,6', // player
      'drawSprite 19 at 12,15', // dog: look 1 × 12 + left 2 × 3 + phase 1
      'drawSprite 1 at 16,3', // drone: rotors frame 1 at tick 30, 1 px higher
      'drawSprite 0 at 4,4', // heart
    ]);
    // The drone comes after the tile of `above` (id 6) and before the heart.
    const aboveAt = renderer.calls.indexOf('drawTile 6 at 0,0');
    const droneAt = renderer.calls.indexOf('drawSprite 1 at 16,3');
    expect(aboveAt).toBeGreaterThan(renderer.calls.indexOf('drawSprite 19 at 12,15'));
    expect(droneAt).toBeGreaterThan(aboveAt);
  });

  it('draws the movers while a safe figure blinks', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      { ...state({ x: 20, y: 30, grace: 4 }), movers: [mover({ kind: 'dog', x: 60, y: 20 })] },
      CONTENT,
    );
    expect(renderer.sheets).toStrictEqual([CONTENT.moverSheets.dog]);
  });
});

describe('the shadow walls in the scene (0014)', () => {
  /** A thin horizontal wall and a dense vertical one, three segments each. */
  const WALLED: SceneContent = {
    ...CONTENT,
    map: {
      ...MAP,
      rects: [
        { name: 'shadow:marketing', x: 16, y: 16, width: 48, height: 4 },
        { name: 'shadow:hr', x: 32, y: 0, width: 4, height: 48 },
      ],
    },
  };
  const standing = (wall: number, fields: Partial<ShadowWallState> = {}): ShadowWallState => ({
    wall,
    lit: false,
    light: 0,
    ...fields,
  });

  it('flickers every 15 steps by its density while the light is not on it', () => {
    const looks = (density: number) =>
      [0, 14, 15, 29, 30].map((tick) => wallLook(standing(0), density, tick));
    expect(looks(1)).toStrictEqual([0, 0, 1, 1, 0]);
    expect(looks(2)).toStrictEqual([2, 2, 3, 3, 2]);
    expect(looks(3)).toStrictEqual([4, 4, 5, 5, 4]);
  });

  it('stands still while it holds against the light', () => {
    expect([0, 15, 30].map((tick) => wallLook(standing(0, { lit: true }), 2, tick))).toStrictEqual([
      2, 2, 2,
    ]);
    expect(wallLook(standing(0, { lit: true }), 3, 15)).toBe(4);
  });

  it('thins out in thirds while it gives way, whatever the tick', () => {
    const look = (light: number) => wallLook(standing(0, { lit: true, light }), 1, 15);
    expect([1, 19, 20, 39, 40, 59].map(look)).toStrictEqual([0, 0, 6, 6, 7, 7]);
  });

  it('cuts a wall into 16 px segments from the corner of its box, shifted by the camera', () => {
    expect(wallSegments({ x: 16, y: 16, width: 48, height: 4 }, { x: 5, y: 7 })).toStrictEqual({
      orientation: 0,
      origins: [
        { x: 11, y: 9 },
        { x: 27, y: 9 },
        { x: 43, y: 9 },
      ],
    });
    expect(wallSegments({ x: 32, y: 0, width: 4, height: 48 }, { x: 5, y: 7 })).toStrictEqual({
      orientation: 1,
      origins: [
        { x: 27, y: -7 },
        { x: 27, y: 9 },
        { x: 27, y: 25 },
      ],
    });
  });

  it('draws the walls after the cone and before the ground movers, in array order', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      {
        ...state({ x: 20, y: 30 }, { x: 5, y: 7 }, true),
        movers: [mover({ kind: 'dog', x: 60, y: 20 })],
        shadowWalls: [standing(0), standing(1)],
      },
      WALLED,
    );
    expect(renderer.sheets[0]).toBe(WALLED.lampSheet);
    expect(renderer.sheets.slice(1, 7).every((sheet) => sheet === WALLED.shadowWallSheet)).toBe(
      true,
    );
    expect(renderer.sheets[7]).toBe(WALLED.moverSheets.dog);
    expect(renderer.sheets[8]).toBe(WALLED.playerSheet);
    expect(
      renderer.calls.filter((call) => call.startsWith('drawSprite')).slice(1, 7),
    ).toStrictEqual([
      'drawSprite 0 at 11,9',
      'drawSprite 0 at 27,9',
      'drawSprite 0 at 43,9',
      'drawSprite 10 at 27,-7',
      'drawSprite 10 at 27,9',
      'drawSprite 10 at 27,25',
    ]);
  });

  it('draws no lifted wall, and no wall on a map without them', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...state({ x: 20, y: 30 }), shadowWalls: [standing(1)] }, WALLED);
    expect(renderer.sheets.filter((sheet) => sheet === WALLED.shadowWallSheet)).toHaveLength(3);
    const bare = recordingRenderer();
    drawScene(bare, state({ x: 20, y: 30 }), CONTENT);
    expect(bare.sheets.filter((sheet) => sheet === CONTENT.shadowWallSheet)).toHaveLength(0);
  });
});

describe('the notice in the scene (0016)', () => {
  /** The lamp is on a wall that holds; one full and one empty heart. */
  const holding = (fields: Partial<GameState> = {}): GameState => ({
    ...state({ x: 20, y: 30 }, { x: 0, y: 0 }, true),
    shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    overview: { current: 1, max: 2 },
    ...fields,
  });
  const BAR = 'fillRect 8,158 304x18 #181425';
  /** The sprite calls that went to a sheet, in order. */
  const spritesOn = (renderer: ReturnType<typeof recordingRenderer>, sheet: unknown): string[] =>
    renderer.calls
      .filter((call) => call.startsWith('drawSprite'))
      .filter((_call, i) => renderer.sheets[i] === sheet);

  it('places the bar and the line as the spec says', () => {
    expect(NOTICE_BAR).toStrictEqual({ x: 8, y: 158, width: 304, height: 18 });
    expect(NOTICE_CAPACITY).toBe(49);
    expect(noticeOrigin(43)).toStrictEqual({ x: 31, y: 162 });
    expect(noticeOrigin(38)).toStrictEqual({ x: 46, y: 162 });
    expect(noticeOrigin(49)).toStrictEqual({ x: 13, y: 162 });
  });

  it('draws the bar and then the German line, after the hearts', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, holding(), CONTENT);
    const bar = renderer.calls.indexOf(BAR);
    expect(bar).toBeGreaterThan(renderer.calls.indexOf('drawSprite 1 at 14,4'));
    expect(renderer.calls.indexOf('drawSprite 0 at 4,4')).toBeGreaterThan(-1);
    const line = renderer.calls.slice(bar + 1);
    expect(line).toHaveLength(36);
    expect(line[0]).toBe('drawSprite 36 at 31,162');
    expect(line).toContain('drawSprite 100 at 211,162');
    expect(line.at(-1)).toBe('drawSprite 14 at 283,162');
    expect(spritesOn(renderer, CONTENT.fontSheet)).toStrictEqual(line);
  });

  it('draws the lids over it', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, holding({ dark: 10 }), CONTENT);
    expect(renderer.calls.slice(-2)).toStrictEqual([
      'fillRect 0,0 320x30 #181425',
      'fillRect 0,150 320x30 #181425',
    ]);
    expect(renderer.calls.indexOf(BAR)).toBeGreaterThan(-1);
    expect(renderer.calls.indexOf('drawSprite 14 at 283,162')).toBe(renderer.calls.length - 3);
  });

  it('draws the English line when the language is `en`', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, holding(), CONTENT, ENGLISH);
    const line = spritesOn(renderer, CONTENT.fontSheet);
    expect(line).toHaveLength(31);
    expect(line[0]).toBe('drawSprite 52 at 46,162');
    expect(line.at(-1)).toBe('drawSprite 14 at 268,162');
  });

  it('draws neither bar nor line without a notice', () => {
    for (const scene of [
      holding({ shadowWalls: [{ wall: 0, lit: true, light: 1 }] }),
      holding({ shadowWalls: [] }),
      holding({ lamp: { on: false, strength: 1, owned: true, used: true } }),
    ]) {
      const renderer = recordingRenderer();
      drawScene(renderer, scene, CONTENT);
      expect(renderer.calls.some((call) => call.startsWith('fillRect'))).toBe(false);
      expect(spritesOn(renderer, CONTENT.fontSheet)).toStrictEqual([]);
    }
  });

  it('fits every notice of the table into the bar, in both languages', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (key.startsWith('notice.')) {
          expect(text.length, `${language} ${key}`).toBeLessThanOrEqual(NOTICE_CAPACITY);
        }
      }
    }
  });
});

describe('the standing figures in the scene (0017)', () => {
  /** The officer at (40, y) on the 3x2 map; the player stands at (20, 30). */
  const withOfficer = (y: number): SceneContent => ({
    ...CONTENT,
    map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y }] },
  });
  const standing = (facing: FigureState['facing']): FigureState => ({ figure: 0, facing });
  const snippet = { species: 'snippet', x: 60, y: 25, light: 0, home: { x: 0, y: 0 } } as const;

  it('shows a figure standing: the frame is facing × 5', () => {
    expect(
      (['down', 'up', 'left', 'right'] as const).map((facing) => figureFrame(standing(facing))),
    ).toStrictEqual([0, 5, 10, 15]);
  });

  it('puts the frame so that the feet are its bottom centre, shifted by the camera', () => {
    expect(figureOrigin({ x: 40, y: 20 }, { x: 0, y: 0 })).toStrictEqual({ x: 32, y: -4 });
    expect(figureOrigin({ x: 264, y: 472 }, { x: 136, y: 410 })).toStrictEqual({ x: 120, y: 38 });
  });

  it('draws a figure at or above the player after the ground movers of that group and before the creatures', () => {
    const renderer = recordingRenderer();
    const content = withOfficer(20);
    drawScene(
      renderer,
      {
        ...state({ x: 20, y: 30 }),
        movers: [mover({ kind: 'dog', x: 60, y: 10 })],
        creatures: [snippet],
        figures: [standing('left')],
      },
      content,
    );
    expect(renderer.sheets).toStrictEqual([
      content.moverSheets.dog,
      content.figureSheets.officer,
      content.creatureSheets.snippet,
      content.playerSheet,
    ]);
    expect(renderer.calls).toContain('drawSprite 10 at 32,-4');
  });

  it('draws a figure below the player after the player and before the other ground movers', () => {
    const renderer = recordingRenderer();
    const content = withOfficer(40);
    drawScene(
      renderer,
      {
        ...state({ x: 20, y: 30 }),
        movers: [mover({ kind: 'dog', x: 60, y: 50 })],
        creatures: [snippet],
        figures: [standing('down')],
      },
      content,
    );
    expect(renderer.sheets).toStrictEqual([
      content.creatureSheets.snippet,
      content.playerSheet,
      content.figureSheets.officer,
      content.moverSheets.dog,
    ]);
    expect(renderer.calls).toContain('drawSprite 0 at 32,16');
  });

  it('draws no figure the map does not have', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...state({ x: 20, y: 30 }), figures: [standing('down')] }, CONTENT);
    expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet]);
  });
});

describe('the dialogue box in the scene (0017)', () => {
  const content: SceneContent = {
    ...CONTENT,
    map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
  };
  const talking = (page: number, tick = 0): GameState => ({
    ...state({ x: 20, y: 30 }),
    tick,
    figures: [{ figure: 0, facing: 'left' }],
    dialogue: { speaker: 'figure', index: 0, page },
    overview: { current: 1, max: 2 },
  });
  const BOX = 'fillRect 8,134 304x42 #181425';
  const MARKER = [
    'fillRect 299,169 5x1 #ffffff',
    'fillRect 300,170 3x1 #ffffff',
    'fillRect 301,171 1x1 #ffffff',
  ];
  const spritesOn = (renderer: ReturnType<typeof recordingRenderer>, sheet: unknown): string[] =>
    renderer.calls
      .filter((call) => call.startsWith('drawSprite'))
      .filter((_call, i) => renderer.sheets[i] === sheet);

  it('places the box, the lines and the marker as the spec says', () => {
    expect(DIALOGUE_BOX).toStrictEqual({ x: 8, y: 134, width: 304, height: 42 });
    expect(DIALOGUE_TEXT).toStrictEqual({ x: 12, y: 138 });
    expect([DIALOGUE_LINES, DIALOGUE_LINE_CAPACITY, MARKER_BLINK_STEPS]).toStrictEqual([3, 47, 30]);
    expect(DIALOGUE_MARKER).toStrictEqual([
      { x: 299, y: 169, width: 5, height: 1 },
      { x: 300, y: 170, width: 3, height: 1 },
      { x: 301, y: 171, width: 1, height: 1 },
    ]);
    // The same bottom edge as the notice's bar, and the longest line ends left of the marker.
    expect(DIALOGUE_BOX.y + DIALOGUE_BOX.height).toBe(NOTICE_BAR.y + NOTICE_BAR.height);
    expect(DIALOGUE_TEXT.x + DIALOGUE_LINE_CAPACITY * GLYPH_WIDTH).toBeLessThan(299);
  });

  it('blinks the marker once a second: on for 30 steps, off for 30', () => {
    expect([0, 29, 30, 59, 60].map(markerVisible)).toStrictEqual([true, true, false, false, true]);
  });

  it('draws the box, the first page and the marker after the hearts', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, talking(0), content);
    const box = renderer.calls.indexOf(BOX);
    expect(box).toBeGreaterThan(renderer.calls.indexOf('drawSprite 1 at 14,4'));
    const after = renderer.calls.slice(box + 1);
    expect(after).toHaveLength(96 + 3);
    expect(after[0]).toBe('drawSprite 36 at 12,138');
    expect(after[28]).toBe('drawSprite 37 at 12,150');
    expect(after[64]).toBe('drawSprite 40 at 12,162');
    expect(after.slice(-3)).toStrictEqual(MARKER);
    expect(spritesOn(renderer, content.fontSheet)).toHaveLength(96);
  });

  it('draws the second page, and no marker in the second half second', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, talking(1, 30), content);
    const after = renderer.calls.slice(renderer.calls.indexOf(BOX) + 1);
    expect(after).toHaveLength(86);
    expect(after[0]).toBe('drawSprite 45 at 12,138');
    expect(renderer.calls.some((call) => call.endsWith('#ffffff'))).toBe(false);
  });

  it('draws the page in English when the language is `en`', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, talking(0), content, ENGLISH);
    const line = spritesOn(renderer, content.fontSheet);
    expect(line).toHaveLength(82);
    expect(line[0]).toBe('drawSprite 51 at 12,138');
  });

  it('draws the lids over the box', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, talking(0, 30), content);
    drawScene(renderer, { ...talking(0, 30), dark: 10 }, content);
    expect(renderer.calls.slice(-2)).toStrictEqual([
      'fillRect 0,0 320x30 #181425',
      'fillRect 0,150 320x30 #181425',
    ]);
  });

  it('draws the page of a colleague that speaks, and the colleague standing as it turned (0018)', () => {
    const walking: SceneContent = {
      ...CONTENT,
      map: {
        ...MAP,
        points: [
          { name: 'person:reception:1', x: 40, y: 20, pause: 600 },
          { name: 'person:reception:2', x: 40, y: 28 },
        ],
      },
    };
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      {
        ...state({ x: 20, y: 30 }),
        movers: [mover({ kind: 'person', x: 40, y: 20, facing: 'left' })],
        dialogue: { speaker: 'mover', index: 0, page: 0 },
      },
      walking,
    );
    const after = renderer.calls.slice(renderer.calls.indexOf(BOX) + 1);
    expect(after[0]).toBe('drawSprite 45 at 12,138');
    expect(spritesOn(renderer, walking.fontSheet)).toHaveLength(108);
    expect(renderer.calls).toContain('drawSprite 10 at 32,-4');
  });

  it('draws no box for a dialogue whose speaker the map does not have', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      { ...state({ x: 20, y: 30 }), dialogue: { speaker: 'mover', index: 0, page: 0 } },
      CONTENT,
    );
    expect(renderer.calls).not.toContain(BOX);
  });

  it('draws no box without a dialogue', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...talking(0, QUIET_TICK), dialogue: null }, content);
    expect(renderer.calls).not.toContain(BOX);
    expect(spritesOn(renderer, content.fontSheet)).toStrictEqual([]);
  });

  it('holds every page of the table to the box: its lines and their length', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (key.startsWith('talk.')) {
          const lines = text.split('\n');
          expect(lines.length, `${language} ${key}`).toBeLessThanOrEqual(DIALOGUE_LINES);
          expect(
            Math.max(...lines.map((line) => line.length)),
            `${language} ${key}`,
          ).toBeLessThanOrEqual(DIALOGUE_LINE_CAPACITY);
        }
      }
    }
  });
});

describe('the language line in the scene (0019)', () => {
  const BAR = 'fillRect 8,158 304x18 #181425';
  /** One full and one empty heart, no notice, no dialogue. */
  const quiet = (tick: number, fields: Partial<GameState> = {}): GameState => ({
    ...state({ x: 20, y: 30 }),
    tick,
    overview: { current: 1, max: 2 },
    ...fields,
  });
  const switched = (language: SceneSettings['language'], switchedAt: number | null) => ({
    language,
    switchedAt,
  });
  const fontCalls = (renderer: ReturnType<typeof recordingRenderer>): string[] =>
    renderer.calls
      .filter((call) => call.startsWith('drawSprite'))
      .filter((_call, i) => renderer.sheets[i] === CONTENT.fontSheet);

  it('is due for 120 steps from the switch, and never without one', () => {
    expect(LANGUAGE_NOTICE_STEPS).toBe(120);
    expect([99, 100, 219, 220].map((tick) => languageNoticeVisible(tick, 100))).toStrictEqual([
      false,
      true,
      true,
      false,
    ]);
    expect(languageNoticeVisible(0, 0)).toBe(true);
    expect(languageNoticeVisible(100, null)).toBe(false);
  });

  it('names the language that is on, in that language, centred in the bar after the hearts', () => {
    const english = recordingRenderer();
    drawScene(english, quiet(100), CONTENT, switched('en', 100));
    const bar = english.calls.indexOf(BAR);
    expect(bar).toBeGreaterThan(english.calls.indexOf('drawSprite 1 at 14,4'));
    const line = english.calls.slice(bar + 1);
    // `Language: English` has 17 characters, 16 of them drawn; `L` is glyph 44.
    expect(line).toHaveLength(16);
    expect(line[0]).toBe('drawSprite 44 at 109,162');
    expect(line.at(-1)).toBe('drawSprite 72 at 205,162');
    expect(fontCalls(english)).toStrictEqual(line);

    const german = recordingRenderer();
    drawScene(german, quiet(219), CONTENT, switched('de', 100));
    // `Sprache: Deutsch` has 16 characters, 15 of them drawn; `S` is glyph 51.
    const lineDe = german.calls.slice(german.calls.indexOf(BAR) + 1);
    expect(lineDe).toHaveLength(15);
    expect(lineDe[0]).toBe('drawSprite 51 at 112,162');
  });

  it('draws neither bar nor line before the switch, after two seconds, or without a switch', () => {
    // Past the start hint (0021): the ticks of 0019, 600 later.
    for (const [tick, switchedAt] of [
      [699, 700],
      [820, 700],
      [700, null],
    ] as const) {
      const renderer = recordingRenderer();
      drawScene(renderer, quiet(tick), CONTENT, switched('en', switchedAt));
      expect(renderer.calls, `tick ${tick}`).not.toContain(BAR);
      expect(fontCalls(renderer)).toStrictEqual([]);
    }
  });

  it('leaves the bar to the start hint where the line is not due in the first ten seconds (0021)', () => {
    for (const [tick, switchedAt] of [
      [99, 100],
      [220, 100],
      [100, null],
    ] as const) {
      const renderer = recordingRenderer();
      drawScene(renderer, quiet(tick), CONTENT, switched('en', switchedAt));
      expect(renderer.calls.filter((call) => call === BAR)).toHaveLength(1);
      // `Help: press H`: 13 characters, 11 of them drawn; `H` is glyph 40.
      const line = fontCalls(renderer);
      expect(line, `tick ${tick}`).toHaveLength(11);
      expect(line[0]).toBe('drawSprite 40 at 121,162');
    }
  });

  it('leaves the bar to the notice of 0016, which itself changes its language', () => {
    const holding = quiet(100, {
      lamp: { on: true, strength: 1, owned: true, used: true },
      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    });
    const renderer = recordingRenderer();
    drawScene(renderer, holding, CONTENT, switched('en', 100));
    const line = fontCalls(renderer);
    // `This shadow is too dense for the lamp.`: 38 characters, 31 drawn, `T` is glyph 52.
    expect(line).toHaveLength(31);
    expect(line[0]).toBe('drawSprite 52 at 46,162');
    expect(renderer.calls.filter((call) => call === BAR)).toHaveLength(1);
  });

  it('draws no line while a dialogue is open: the page changes its language instead', () => {
    const content: SceneContent = {
      ...CONTENT,
      map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
    };
    const talking = quiet(100, {
      figures: [{ figure: 0, facing: 'left' }],
      dialogue: { speaker: 'figure', index: 0, page: 0 },
    });
    const renderer = recordingRenderer();
    drawScene(renderer, talking, content, switched('en', 100));
    expect(renderer.calls).not.toContain(BAR);
    const page = fontCalls(renderer);
    expect(page).toHaveLength(82);
    expect(page[0]).toBe('drawSprite 51 at 12,138');
  });

  it('closes the lids over the line', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, quiet(100, { dark: 10 }), CONTENT, switched('en', 100));
    expect(renderer.calls).toContain(BAR);
    expect(renderer.calls.slice(-2)).toStrictEqual([
      'fillRect 0,0 320x30 #181425',
      'fillRect 0,150 320x30 #181425',
    ]);
  });
});

describe('the traces in the scene (0022)', () => {
  /** A wall strip under cell (0, 0) and a trace on cell (1, 0) of the 3x2 map. */
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...MAP,
      rects: [
        { name: 'shadow:marketing', x: 0, y: 16, width: 16, height: 4 },
        { name: 'trace:sales', x: 16, y: 0, width: 16, height: 16 },
      ],
    },
  };
  const seen = (light: number, found: number | null = null): GameState => ({
    ...state({ x: 20, y: 30 }),
    shadowWalls: [{ wall: 0, lit: false, light: 0 }],
    traces: [{ trace: 0, light, found }],
    movers: [mover({ kind: 'dog', x: 60, y: 10 })],
  });

  it('has three looks, one per third of a second', () => {
    expect(TRACE_LOOKS).toBe(3);
    expect(
      [1, 20, 21, 40, 41, 59].map((light) => traceFrame({ trace: 0, light, found: null })),
    ).toStrictEqual([0, 0, 1, 1, 2, 2]);
  });

  it('draws a trace the light is on at its cell, after the walls and before the movers', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, seen(21), content);
    expect(renderer.sheets).toStrictEqual([
      content.shadowWallSheet,
      content.traceSheet,
      content.moverSheets.dog,
      content.playerSheet,
    ]);
    expect(renderer.calls).toContain('drawSprite 1 at 16,0');
  });

  it('shifts it by the camera', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...seen(59), camera: { x: 5, y: 7 } }, content);
    expect(renderer.calls).toContain('drawSprite 2 at 11,-7');
  });

  it('draws no trace the light is not on, and none that is found', () => {
    for (const scene of [seen(0), seen(0, 60)]) {
      const renderer = recordingRenderer();
      drawScene(renderer, scene, content);
      expect(renderer.sheets).not.toContain(content.traceSheet);
    }
  });

  it('draws no trace the map does not have', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...seen(21), shadowWalls: [] }, CONTENT);
    expect(renderer.sheets).not.toContain(CONTENT.traceSheet);
  });
});

describe('the start hint in the scene (0021)', () => {
  const BAR = 'fillRect 8,158 304x18 #181425';
  /** One full and one empty heart, no notice, no dialogue, at `tick`. */
  const fresh = (tick: number, fields: Partial<GameState> = {}): GameState => ({
    ...state({ x: 20, y: 30 }),
    tick,
    overview: { current: 1, max: 2 },
    ...fields,
  });
  const fontCalls = (renderer: ReturnType<typeof recordingRenderer>): string[] =>
    renderer.calls
      .filter((call) => call.startsWith('drawSprite'))
      .filter((_call, i) => renderer.sheets[i] === CONTENT.fontSheet);

  it('names the key of the help for the first 600 steps, centred in the bar after the hearts', () => {
    for (const tick of [0, 599]) {
      const german = recordingRenderer();
      drawScene(german, fresh(tick), CONTENT);
      const bar = german.calls.indexOf(BAR);
      expect(bar).toBeGreaterThan(german.calls.indexOf('drawSprite 1 at 14,4'));
      const line = german.calls.slice(bar + 1);
      // `Hilfe: Taste H` has 14 characters, 12 of them drawn; `H` is glyph 40.
      expect(line, `tick ${tick}`).toHaveLength(12);
      expect(line[0]).toBe('drawSprite 40 at 118,162');
      expect(line.at(-1)).toBe('drawSprite 40 at 196,162');
      expect(fontCalls(german)).toStrictEqual(line);

      const english = recordingRenderer();
      drawScene(english, fresh(tick), CONTENT, ENGLISH);
      // `Help: press H` has 13 characters, 11 of them drawn.
      const lineEn = english.calls.slice(english.calls.indexOf(BAR) + 1);
      expect(lineEn, `tick ${tick}`).toHaveLength(11);
      expect(lineEn[0]).toBe('drawSprite 40 at 121,162');
      expect(lineEn.at(-1)).toBe('drawSprite 40 at 193,162');
    }
  });

  it('is gone at step 600', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, fresh(600), CONTENT);
    expect(renderer.calls).not.toContain(BAR);
    expect(fontCalls(renderer)).toStrictEqual([]);
  });

  it('leaves the bar to the notice of 0016', () => {
    const holding = fresh(100, {
      lamp: { on: true, strength: 1, owned: true, used: true },
      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    });
    const renderer = recordingRenderer();
    drawScene(renderer, holding, CONTENT);
    // `Dieser Schatten ist zu dicht für die Lampe.`: 43 characters, 36 drawn, `D` is glyph 36.
    const line = fontCalls(renderer);
    expect(line).toHaveLength(36);
    expect(line[0]).toBe('drawSprite 36 at 31,162');
    expect(renderer.calls.filter((call) => call === BAR)).toHaveLength(1);
  });

  it('leaves the bar to the language line, and has it back when the two seconds are over', () => {
    const settings: SceneSettings = { language: 'en', switchedAt: 50 };
    const line = recordingRenderer();
    drawScene(line, fresh(169), CONTENT, settings);
    // `Language: English`: 16 glyphs, `L` is glyph 44.
    expect(fontCalls(line)).toHaveLength(16);
    expect(fontCalls(line)[0]).toBe('drawSprite 44 at 109,162');
    const hint = recordingRenderer();
    drawScene(hint, fresh(170), CONTENT, settings);
    expect(fontCalls(hint)).toHaveLength(11);
    expect(fontCalls(hint)[0]).toBe('drawSprite 40 at 121,162');
  });

  it('is not drawn with a dialogue open, with the journal open or with the help open', () => {
    const content: SceneContent = {
      ...CONTENT,
      map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
    };
    for (const fields of [
      {
        figures: [{ figure: 0, facing: 'left' }],
        dialogue: { speaker: 'figure', index: 0, page: 0 },
      },
      { journal: { tab: 'creatures' } },
      { help: true },
    ] as const satisfies readonly Partial<GameState>[]) {
      const renderer = recordingRenderer();
      drawScene(renderer, fresh(100, fields), content);
      expect(renderer.calls, Object.keys(fields).join()).not.toContain(BAR);
      // The first glyph of `Hilfe: Taste H`, at its place in the bar.
      expect(renderer.calls).not.toContain('drawSprite 40 at 118,162');
    }
  });
});

describe('the shadow over the regions in the scene (0023)', () => {
  /** The left column of the 3x2 map is HR, density 2; the middle column is the reception. */
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...MAP,
      rects: [
        { name: 'region:hr', x: 0, y: 0, width: 16, height: 32 },
        { name: 'region:reception', x: 16, y: 0, width: 16, height: 32 },
      ],
    },
  };

  it('draws the cells under shadow from the shadow tileset on all three layers', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 40, y: 30 }), content);
    const tiles = renderer.calls.filter((call) => call.startsWith('drawTile'));
    expect(tiles).toStrictEqual([
      'drawTile 0 at 0,0',
      'drawTile 1 at 16,0',
      'drawTile 2 at 0,16',
      'drawTile 2 at 16,16',
      'drawTile 2 at 32,16',
      'drawTile 4 at 16,16',
      'drawTile 6 at 0,0',
    ]);
    expect(renderer.tilesets).toStrictEqual([
      content.shadowTileset,
      content.tileset,
      content.shadowTileset,
      content.tileset,
      content.tileset,
      content.tileset,
      content.shadowTileset,
    ]);
  });

  it('lays the veil of the density over them after detail and before the cone', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 40, y: 30 }, { x: 0, y: 0 }, true), content);
    const detail = renderer.calls.indexOf('drawTile 4 at 16,16');
    expect(renderer.calls.slice(detail + 1, detail + 3)).toStrictEqual([
      'drawSprite 1 at 0,0',
      'drawSprite 1 at 0,16',
    ]);
    expect(renderer.sheets.slice(0, 4)).toStrictEqual([
      content.veilSheet,
      content.veilSheet,
      content.lampSheet,
      content.playerSheet,
    ]);
  });

  it('draws no veil over a region without shadow or outside every area', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 40, y: 30 }), content);
    const veils = renderer.calls.filter(
      (_call, i) => renderer.calls[i]?.startsWith('drawSprite') === true,
    );
    expect(renderer.sheets.filter((sheet) => sheet === content.veilSheet)).toHaveLength(2);
    expect(veils).not.toContain('drawSprite 1 at 16,0');
    expect(veils).not.toContain('drawSprite 1 at 32,16');
  });

  it('shifts the veil with the camera', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 40, y: 30 }, { x: 5, y: 7 }), content);
    expect(renderer.calls).toContain('drawSprite 1 at -5,-7');
    expect(renderer.calls).toContain('drawSprite 1 at -5,9');
  });

  it('draws the player, the movers and the creatures from their own sheets, over the veil', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      {
        ...state({ x: 8, y: 30 }),
        movers: [mover({ kind: 'dog', x: 8, y: 10 })],
        creatures: [{ species: 'snippet', x: 8, y: 25, light: 0, home: { x: 0, y: 0 } }],
      },
      content,
    );
    expect(renderer.sheets).toStrictEqual([
      content.veilSheet,
      content.veilSheet,
      content.moverSheets.dog,
      content.creatureSheets.snippet,
      content.playerSheet,
    ]);
  });

  it('draws a map without areas exactly as before: every tile from the tileset, no veil', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, state({ x: 40, y: 30 }), CONTENT);
    expect(renderer.tilesets.every((tileset) => tileset === CONTENT.tileset)).toBe(true);
    expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet]);
  });
});

describe('the cleared region in the scene (0025)', () => {
  /**
   * The 3x2 map in three rooms: the left column is Sales and the middle one Marketing, both of
   * density 1; the right column is Development, density 3.
   */
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...MAP,
      rects: [
        { name: 'region:sales', x: 0, y: 0, width: 16, height: 32 },
        { name: 'region:marketing', x: 16, y: 0, width: 16, height: 32 },
        { name: 'region:development', x: 32, y: 0, width: 16, height: 32 },
      ],
    },
  };
  /** The scene `elapsed` steps after the case of `region` was solved. */
  const cleared = (region: string, elapsed: number): GameState => ({
    ...state({ x: 40, y: 30 }),
    solved: [{ region, at: QUIET_TICK - elapsed }],
  });
  /** The frames of the veil's sheet the scene drew, each with its place. */
  const veils = (scene: GameState): string[] => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene, content);
    const sprites = renderer.calls.filter((call) => call.startsWith('drawSprite'));
    return sprites.filter((_call, i) => renderer.sheets[i] === content.veilSheet);
  };
  /** Marketing and Development, row by row, as long as they are under shadow. */
  const OTHERS_TOP = ['drawSprite 0 at 16,0', 'drawSprite 2 at 32,0'];
  const OTHERS_BOTTOM = ['drawSprite 0 at 16,16', 'drawSprite 2 at 32,16'];

  it('draws the three rooms under shadow before a case is solved', () => {
    expect(veils(state({ x: 40, y: 30 }))).toStrictEqual([
      'drawSprite 0 at 0,0',
      ...OTHERS_TOP,
      'drawSprite 0 at 0,16',
      ...OTHERS_BOTTOM,
    ]);
  });

  it('draws the cells of the cleared region from the tileset on all three layers, at once', () => {
    for (const elapsed of [0, 39, 40, 119, 120, 5000]) {
      const renderer = recordingRenderer();
      drawScene(renderer, cleared('sales', elapsed), content);
      const tiles = renderer.calls.filter((call) => call.startsWith('drawTile'));
      expect(tiles).toStrictEqual([
        'drawTile 0 at 0,0',
        'drawTile 1 at 16,0',
        'drawTile 2 at 0,16',
        'drawTile 2 at 16,16',
        'drawTile 2 at 32,16',
        'drawTile 4 at 16,16',
        'drawTile 6 at 0,0',
      ]);
      expect(renderer.tilesets, `${elapsed} steps`).toStrictEqual([
        content.tileset,
        content.shadowTileset,
        content.tileset,
        content.shadowTileset,
        content.shadowTileset,
        content.shadowTileset,
        content.tileset,
      ]);
    }
  });

  it.each([
    [0, 0],
    [39, 0],
    [40, 3],
    [79, 3],
    [80, 4],
    [119, 4],
  ])(
    '%d steps after the solving it draws frame %d of the veil over the cleared cells',
    (elapsed, frame) => {
      expect(veils(cleared('sales', elapsed))).toStrictEqual([
        `drawSprite ${frame} at 0,0`,
        ...OTHERS_TOP,
        `drawSprite ${frame} at 0,16`,
        ...OTHERS_BOTTOM,
      ]);
    },
  );

  it('draws no veil over them from 120 steps on, and the other rooms as before', () => {
    for (const elapsed of [120, 121, 5000]) {
      expect(veils(cleared('sales', elapsed))).toStrictEqual([...OTHERS_TOP, ...OTHERS_BOTTOM]);
    }
  });

  it.each([
    [0, 2],
    [39, 2],
    [40, 3],
    [79, 3],
    [80, 4],
    [119, 4],
  ])('over a cleared region of density 3 it draws, after %d steps, frame %d', (elapsed, frame) => {
    expect(veils(cleared('development', elapsed))).toStrictEqual([
      'drawSprite 0 at 0,0',
      'drawSprite 0 at 16,0',
      `drawSprite ${frame} at 32,0`,
      'drawSprite 0 at 0,16',
      'drawSprite 0 at 16,16',
      `drawSprite ${frame} at 32,16`,
    ]);
  });

  it('lays the thinning veil where the veil lies: after detail and before the cone', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      { ...cleared('sales', 40), lamp: { on: true, strength: 1, owned: true, used: true } },
      content,
    );
    const detail = renderer.calls.indexOf('drawTile 4 at 16,16');
    expect(renderer.calls[detail + 1]).toBe('drawSprite 3 at 0,0');
    expect(renderer.sheets.slice(0, 7)).toStrictEqual([
      content.veilSheet,
      content.veilSheet,
      content.veilSheet,
      content.veilSheet,
      content.veilSheet,
      content.veilSheet,
      content.lampSheet,
    ]);
  });

  it('shifts the thinning veil with the camera', () => {
    const scene: GameState = { ...cleared('sales', 80), camera: { x: 5, y: 7 } };
    expect(veils(scene)).toContain('drawSprite 4 at -5,-7');
    expect(veils(scene)).toContain('drawSprite 4 at -5,9');
  });

  it('draws a scene in which every region is cleared long ago like a map without areas', () => {
    const renderer = recordingRenderer();
    const scene: GameState = {
      ...state({ x: 40, y: 30 }),
      solved: [
        { region: 'sales', at: 0 },
        { region: 'marketing', at: 100 },
        { region: 'development', at: 200 },
      ],
    };
    drawScene(renderer, scene, content);
    expect(renderer.tilesets.every((tileset) => tileset === content.tileset)).toBe(true);
    expect(renderer.sheets).toStrictEqual([content.playerSheet]);
  });
});

describe('the story in the scene (0026)', () => {
  const BOX = 'fillRect 8,134 304x42 #181425';
  const BAR = 'fillRect 8,158 304x18 #181425';
  const NO_LAMP = { on: false, strength: 1, owned: false, used: false };
  /** A new game on the 3x2 map: the call open on `page`, no lamp, the opening not ended. */
  const calling = (page: number, tick = 0): GameState => ({
    ...state({ x: 20, y: 30 }),
    tick,
    started: null,
    lamp: NO_LAMP,
    dialogue: { speaker: 'story', index: 0, page },
    overview: { current: 1, max: 2 },
  });
  const fontCalls = (
    renderer: ReturnType<typeof recordingRenderer>,
    content: SceneContent = CONTENT,
  ): string[] =>
    renderer.calls
      .filter((call) => call.startsWith('drawSprite'))
      .filter((_call, i) => renderer.sheets[i] === content.fontSheet);

  it("draws the call's first page in the dialogue box, on a map without any figure", () => {
    const renderer = recordingRenderer();
    drawScene(renderer, calling(0), CONTENT);
    const box = renderer.calls.indexOf(BOX);
    expect(box).toBeGreaterThan(renderer.calls.indexOf('drawSprite 1 at 14,4'));
    const line = fontCalls(renderer);
    // `Montagmorgen. Das Telefon – ein Kunde:` — `M` is glyph 45; the second line opens with `„`.
    expect(line[0]).toBe('drawSprite 45 at 12,138');
    expect(line[33]).toBe('drawSprite 102 at 12,150');
    // 33, 42 and 39 glyphs on its three lines.
    expect(line).toHaveLength(114);
    expect(renderer.calls).not.toContain(BAR);
  });

  it('draws it in English when the language is `en`', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, calling(0), CONTENT, ENGLISH);
    const line = fontCalls(renderer);
    // `Monday morning. The phone – a customer:` — the second line opens with `“`.
    expect(line[0]).toBe('drawSprite 45 at 12,138');
    expect(line[33]).toBe('drawSprite 103 at 12,150');
    // 33, 39 and 27 glyphs.
    expect(line).toHaveLength(99);
  });

  it('draws the second and the third page, and the marker of 0017', () => {
    const second = recordingRenderer();
    drawScene(second, calling(1), CONTENT);
    // `Die Geschäftsführung …`: `D` is glyph 36.
    expect(fontCalls(second)[0]).toBe('drawSprite 36 at 12,138');
    expect(second.calls.slice(-3)).toStrictEqual([
      'fillRect 299,169 5x1 #ffffff',
      'fillRect 300,170 3x1 #ffffff',
      'fillRect 301,171 1x1 #ffffff',
    ]);
    const third = recordingRenderer();
    drawScene(third, calling(2, 30), CONTENT);
    // `Über den Türen …`: `Ü` is glyph 97. No marker in the second half second.
    expect(fontCalls(third)[0]).toBe('drawSprite 97 at 12,138');
    expect(third.calls.some((call) => call.endsWith('#ffffff'))).toBe(false);
  });

  it('draws no box for a scene the story does not have', () => {
    const renderer = recordingRenderer();
    drawScene(
      renderer,
      { ...calling(0), dialogue: { speaker: 'story', index: 4, page: 0 } },
      CONTENT,
    );
    expect(renderer.calls).not.toContain(BOX);
  });

  it('shows no start hint while the opening has not ended, and counts it from the end of the call', () => {
    const quiet = (tick: number, started: number | null): string[] => {
      const renderer = recordingRenderer();
      drawScene(renderer, { ...calling(0, tick), started, dialogue: null }, CONTENT);
      return fontCalls(renderer);
    };
    expect(quiet(10, null)).toStrictEqual([]);
    expect(quiet(5000, null)).toStrictEqual([]);
    // `Hilfe: Taste H`, as in 0021, for 600 steps from the step that closed the call.
    expect(quiet(900, 900)[0]).toBe('drawSprite 40 at 118,162');
    expect(quiet(1499, 900)).toHaveLength(12);
    expect(quiet(1500, 900)).toStrictEqual([]);
  });

  it('draws no cone while the lamp is not owned, whatever is held', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...calling(0), dialogue: null, started: 5 }, CONTENT);
    expect(renderer.sheets).not.toContain(CONTENT.lampSheet);
    const owned = recordingRenderer();
    drawScene(owned, state({ x: 20, y: 30 }, { x: 0, y: 0 }, true), CONTENT);
    expect(owned.sheets).toContain(CONTENT.lampSheet);
  });

  it('draws the page that hands the lamp over while the lamp is not owned, and her own page after', () => {
    const content: SceneContent = {
      ...CONTENT,
      map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
    };
    const meeting = (lamp: GameState['lamp']): GameState => ({
      ...state({ x: 20, y: 30 }),
      lamp,
      figures: [{ figure: 0, facing: 'left' }],
      dialogue: { speaker: 'figure', index: 0, page: 1 },
    });
    const first = recordingRenderer();
    drawScene(first, meeting(NO_LAMP), content);
    // `Nimm die Lampe: …`: `N` is glyph 46.
    expect(fontCalls(first, content)[0]).toBe('drawSprite 46 at 12,138');
    const english = recordingRenderer();
    drawScene(english, meeting(NO_LAMP), content, ENGLISH);
    // `Take the lamp: …`: `T` is glyph 52.
    expect(fontCalls(english, content)[0]).toBe('drawSprite 52 at 12,138');
    const later = recordingRenderer();
    drawScene(later, meeting({ ...NO_LAMP, owned: true }), content);
    // `Mit der Lampe hältst du fest, …`: `M` is glyph 45.
    expect(fontCalls(later, content)[0]).toBe('drawSprite 45 at 12,138');
  });

  it("shows the lamp's line in the bar from the hand-over until the lamp was held once", () => {
    const waiting: GameState = {
      ...state({ x: 20, y: 30 }),
      lamp: { on: false, strength: 1, owned: true, used: false },
    };
    const renderer = recordingRenderer();
    drawScene(renderer, waiting, CONTENT);
    expect(renderer.calls.filter((call) => call === BAR)).toHaveLength(1);
    // `Die Lampe: Leertaste halten.`: 28 characters, 25 drawn, `D` is glyph 36.
    const line = fontCalls(renderer);
    expect(line).toHaveLength(25);
    expect(line[0]).toBe('drawSprite 36 at 76,162');
    const used = recordingRenderer();
    drawScene(used, { ...waiting, lamp: { ...waiting.lamp, used: true } }, CONTENT);
    expect(used.calls).not.toContain(BAR);
  });
});

describe('the wider cone in the scene (0029)', () => {
  const camera = { x: 5, y: 7 };
  const feet = { x: 20.4, y: 30.6 };
  /** The lamp on, with the wider cone earned or not. */
  const shining = (facing: PlayerState['facing'], wide: boolean): GameState => ({
    ...state({ ...feet, facing }, camera, true),
    upgrades: wide ? ['wide-cone'] : [],
  });
  const cone = (scene: GameState): { call: string | undefined; sheet: unknown } => {
    const renderer = recordingRenderer();
    drawScene(renderer, scene, CONTENT);
    return {
      call: renderer.calls.find((call) => call.startsWith('drawSprite')),
      sheet: renderer.sheets[0],
    };
  };

  it('places a frame of the wide sheet by its own apex: feet (20.4, 30.6), camera (5, 7)', () => {
    // The apex is (20, 19) on the map: (15, 12) on the surface.
    const origin = (facing: PlayerState['facing']) =>
      lampFrameOrigin(player({ ...feet, facing }), camera, WIDE_FRAME_APEX);
    expect(origin('down')).toStrictEqual({ x: -21, y: 12 });
    expect(origin('up')).toStrictEqual({ x: -21, y: -59 });
    expect(origin('left')).toStrictEqual({ x: -56, y: -24 });
    expect(origin('right')).toStrictEqual({ x: 15, y: -24 });
  });

  it('draws the cone from the wide sheet, by the facing, when the player has the wider cone', () => {
    expect(cone(shining('down', true))).toStrictEqual({
      call: 'drawSprite 0 at -21,12',
      sheet: CONTENT.lampWideSheet,
    });
    expect(cone(shining('up', true))).toStrictEqual({
      call: 'drawSprite 1 at -21,-59',
      sheet: CONTENT.lampWideSheet,
    });
    expect(cone(shining('left', true))).toStrictEqual({
      call: 'drawSprite 2 at -56,-24',
      sheet: CONTENT.lampWideSheet,
    });
    expect(cone(shining('right', true))).toStrictEqual({
      call: 'drawSprite 3 at 15,-24',
      sheet: CONTENT.lampWideSheet,
    });
  });

  it('draws the cone from the lamp sheet as in 0007 without it', () => {
    expect(cone(shining('down', false))).toStrictEqual({
      call: 'drawSprite 0 at -9,12',
      sheet: CONTENT.lampSheet,
    });
    expect(cone(shining('left', false))).toStrictEqual({
      call: 'drawSprite 2 at -32,-12',
      sheet: CONTENT.lampSheet,
    });
    expect(CONTENT.lampWideSheet).not.toStrictEqual(CONTENT.lampSheet);
  });

  it('draws it where the narrow cone is drawn: after detail and before the player', () => {
    const calls = (wide: boolean): string[] => {
      const renderer = recordingRenderer();
      drawScene(renderer, shining('left', wide), CONTENT);
      return renderer.calls;
    };
    const narrow = calls(false);
    const wide = calls(true);
    expect(wide).toHaveLength(narrow.length);
    const at = narrow.indexOf('drawSprite 2 at -32,-12');
    expect(wide[at]).toBe('drawSprite 2 at -56,-24');
    expect(wide.filter((_call, n) => n !== at)).toStrictEqual(
      narrow.filter((_call, n) => n !== at),
    );
  });

  it('draws no cone with the lamp off, whatever the upgrades', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...shining('down', true), lamp: state({}).lamp }, CONTENT);
    expect(renderer.sheets).not.toContain(CONTENT.lampWideSheet);
    expect(renderer.sheets).not.toContain(CONTENT.lampSheet);
  });
});
