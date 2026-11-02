import { describe, expect, it } from 'vitest';
import { EMPTY, type TileMap } from '../../src/engine/tiled';
import { drawMap } from '../../src/render/draw-map';
import type { Renderer, TilesetImage } from '../../src/render/renderer';

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
  solid: [false, false, false, true, true, true],
};

describe('drawMap', () => {
  it('clears, then draws ground, detail and above in that order, skipping empty cells', () => {
    const renderer = recordingRenderer();
    drawMap(renderer, MAP, TILESET);
    expect(renderer.calls).toStrictEqual([
      'clear #181425',
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
    drawMap(renderer, MAP, TILESET);
    expect(renderer.tilesets).toHaveLength(7);
    expect(renderer.tilesets.every((tileset) => tileset === TILESET)).toBe(true);
  });

  it('draws nothing but the clear for a map of empty cells', () => {
    const renderer = recordingRenderer();
    const empty = new Array<number>(6).fill(EMPTY);
    drawMap(renderer, { ...MAP, ground: empty, detail: empty, above: empty }, TILESET);
    expect(renderer.calls).toStrictEqual(['clear #181425']);
  });
});
