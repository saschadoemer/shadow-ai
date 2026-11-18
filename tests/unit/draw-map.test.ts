import { describe, expect, it } from 'vitest';
import { EMPTY, type TileMap } from '../../src/engine/tiled';
import { drawLayer, drawVeil, type Shadow } from '../../src/render/draw-map';
import type { Renderer, SpriteSheet, TilesetImage } from '../../src/render/renderer';
import { grassMap } from './grass-map';
import { solidsOf } from './solids';

/** A renderer that only records what it was asked to draw, one line per call. */
function recordingRenderer(): Renderer & {
  readonly calls: string[];
  readonly tilesets: TilesetImage[];
} {
  const calls: string[] = [];
  const tilesets: TilesetImage[] = [];
  return {
    calls,
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
    drawSprite(_sheet, frame, x, y) {
      calls.push(`drawSprite ${frame} at ${x},${y}`);
    },
  };
}

const TILESET: TilesetImage = { image: {} as ImageBitmap, columns: 7 };

/** 3x2 tiles: ground with one empty cell, one detail tile, one above tile. */
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

/** 40x30 grass tiles, 640x480 px: larger than the view in both directions. */
const WIDE = grassMap(40, 30, { x: 0, y: 0 });

describe('drawLayer draws the cells the view intersects', () => {
  function drawn(camera: { x: number; y: number }): string[] {
    const renderer = recordingRenderer();
    drawLayer(renderer, WIDE, TILESET, 'ground', camera);
    return renderer.calls;
  }

  it('camera (0, 0): columns 0–19 and rows 0–11, from (0, 0) to (304, 176)', () => {
    const calls = drawn({ x: 0, y: 0 });
    expect(calls).toHaveLength(240);
    expect(calls[0]).toBe('drawTile 0 at 0,0');
    expect(calls[19]).toBe('drawTile 0 at 304,0');
    expect(calls[20]).toBe('drawTile 0 at 0,16');
    expect(calls.at(-1)).toBe('drawTile 0 at 304,176');
  });

  it('camera (8, 8): columns 0–20 and rows 0–11, the first at (−8, −8)', () => {
    const calls = drawn({ x: 8, y: 8 });
    expect(calls).toHaveLength(252);
    expect(calls[0]).toBe('drawTile 0 at -8,-8');
    expect(calls.at(-1)).toBe('drawTile 0 at 312,168');
  });

  it('camera (15, 15): columns 0–20 and rows 0–12, 273 cells', () => {
    const calls = drawn({ x: 15, y: 15 });
    expect(calls).toHaveLength(273);
    expect(calls[0]).toBe('drawTile 0 at -15,-15');
    expect(calls.at(-1)).toBe('drawTile 0 at 305,177');
  });

  it('camera (320, 300), the far corner of a 640x480 map: columns 20–39 and rows 18–29', () => {
    const calls = drawn({ x: 320, y: 300 });
    expect(calls).toHaveLength(240);
    expect(calls[0]).toBe('drawTile 0 at 0,-12');
    expect(calls[20]).toBe('drawTile 0 at 0,4');
    expect(calls.at(-1)).toBe('drawTile 0 at 304,164');
  });
});

describe('drawLayer on the 3x2 map', () => {
  it('skips empty cells and draws only the named layer, without clearing', () => {
    const renderer = recordingRenderer();
    drawLayer(renderer, MAP, TILESET, 'ground', { x: 0, y: 0 });
    drawLayer(renderer, MAP, TILESET, 'detail', { x: 0, y: 0 });
    drawLayer(renderer, MAP, TILESET, 'above', { x: 0, y: 0 });
    expect(renderer.calls).toStrictEqual([
      'drawTile 0 at 0,0',
      'drawTile 1 at 16,0',
      'drawTile 2 at 0,16',
      'drawTile 2 at 16,16',
      'drawTile 2 at 32,16',
      'drawTile 4 at 16,16',
      'drawTile 6 at 0,0',
    ]);
  });

  it('draws every tile from the tileset it was given', () => {
    const renderer = recordingRenderer();
    drawLayer(renderer, MAP, TILESET, 'ground', { x: 0, y: 0 });
    expect(renderer.tilesets).toHaveLength(5);
    expect(renderer.tilesets.every((tileset) => tileset === TILESET)).toBe(true);
  });

  it('draws nothing for a layer of empty cells', () => {
    const renderer = recordingRenderer();
    const empty = new Array<number>(6).fill(EMPTY);
    drawLayer(renderer, { ...MAP, ground: empty }, TILESET, 'ground', { x: 0, y: 0 });
    expect(renderer.calls).toStrictEqual([]);
  });
});

describe('a layer under shadow (0023)', () => {
  const SHADOW_TILESET: TilesetImage = { image: {} as ImageBitmap, columns: 7 };
  /** The left column of the 3x2 map is under a veil of 2; the rest is not. */
  const shadow: Shadow = {
    tileset: SHADOW_TILESET,
    veilOf: (column) => (column === 0 ? 2 : 0),
  };

  it('draws a cell under shadow from the shadow tileset, with the same id at the same place', () => {
    const plain = recordingRenderer();
    drawLayer(plain, MAP, TILESET, 'ground', { x: 0, y: 0 });
    const renderer = recordingRenderer();
    drawLayer(renderer, MAP, TILESET, 'ground', { x: 0, y: 0 }, shadow);
    expect(renderer.calls).toStrictEqual(plain.calls);
    // Ground: (0, 0), (1, 0), (0, 1), (1, 1), (2, 1) — the cells of column 0 are the 1st and 3rd.
    expect(renderer.tilesets).toStrictEqual([
      SHADOW_TILESET,
      TILESET,
      SHADOW_TILESET,
      TILESET,
      TILESET,
    ]);
  });

  it('does so on every layer', () => {
    const renderer = recordingRenderer();
    drawLayer(renderer, MAP, TILESET, 'detail', { x: 0, y: 0 }, shadow);
    drawLayer(renderer, MAP, TILESET, 'above', { x: 0, y: 0 }, shadow);
    expect(renderer.calls).toStrictEqual(['drawTile 4 at 16,16', 'drawTile 6 at 0,0']);
    expect(renderer.tilesets).toStrictEqual([TILESET, SHADOW_TILESET]);
  });

  it('draws every cell from the tileset where no veil lies', () => {
    const renderer = recordingRenderer();
    drawLayer(
      renderer,
      MAP,
      TILESET,
      'ground',
      { x: 0, y: 0 },
      {
        tileset: SHADOW_TILESET,
        veilOf: () => 0,
      },
    );
    expect(renderer.tilesets.every((tileset) => tileset === TILESET)).toBe(true);
  });
});

describe('drawVeil (0023)', () => {
  const VEIL: SpriteSheet = { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 16 };

  it('draws the frame of the veil − 1 on every cell under shadow, row by row, empty cells too', () => {
    const renderer = recordingRenderer();
    // Column 0 has the veil 2, column 2 the veil 3; cell (2, 0) has no ground tile.
    drawVeil(renderer, MAP, VEIL, { x: 0, y: 0 }, (column) => [2, 0, 3][column] ?? 0);
    expect(renderer.calls).toStrictEqual([
      'drawSprite 1 at 0,0',
      'drawSprite 2 at 32,0',
      'drawSprite 1 at 0,16',
      'drawSprite 2 at 32,16',
    ]);
  });

  it('shifts the veil by the camera and draws only the cells the view intersects', () => {
    const renderer = recordingRenderer();
    drawVeil(renderer, WIDE, VEIL, { x: 100, y: 50 }, (column, row) =>
      column === 6 && row <= 4 ? 1 : 0,
    );
    // The view starts in cell (6, 3): rows 3 and 4 of column 6, at x = 96 − 100.
    expect(renderer.calls).toStrictEqual(['drawSprite 0 at -4,-2', 'drawSprite 0 at -4,14']);
  });

  it('draws nothing where no cell has a veil', () => {
    const renderer = recordingRenderer();
    drawVeil(renderer, WIDE, VEIL, { x: 0, y: 0 }, () => 0);
    expect(renderer.calls).toStrictEqual([]);
  });
});
