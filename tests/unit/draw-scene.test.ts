import { describe, expect, it } from 'vitest';
import { EMPTY, type TileMap } from '../../src/engine/tiled';
import type { GameState, PlayerState } from '../../src/game/state';
import { drawScene, playerFrame, type SceneContent } from '../../src/render/draw-scene';
import type { Renderer, SpriteSheet } from '../../src/render/renderer';

/** A renderer that only records what it was asked to draw, one line per call. */
function recordingRenderer(): Renderer & {
  readonly calls: string[];
  readonly sheets: SpriteSheet[];
} {
  const calls: string[] = [];
  const sheets: SpriteSheet[] = [];
  return {
    calls,
    sheets,
    clear(colour) {
      calls.push(`clear ${colour}`);
    },
    fillRect(x, y, width, height, colour) {
      calls.push(`fillRect ${x},${y} ${width}x${height} ${colour}`);
    },
    drawTile(_tileset, id, x, y) {
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
  solid: [false, false, false, true, true, true],
};
const CONTENT: SceneContent = {
  map: MAP,
  tileset: { image: {} as ImageBitmap, columns: 7 },
  playerSheet: { image: {} as ImageBitmap },
};
const player = (fields: Partial<PlayerState>): PlayerState => ({
  x: 0,
  y: 0,
  facing: 'down',
  frame: 0,
  frameTimer: 0,
  ...fields,
});
const state = (fields: Partial<PlayerState>, camera = { x: 0, y: 0 }): GameState => ({
  tick: 0,
  player: player(fields),
  camera,
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
  });
});
