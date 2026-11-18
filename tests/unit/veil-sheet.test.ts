import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { SHADOW_COLOUR } from '../../src/render/palette';
import { encodeVeilPng } from '../../tools/gen-sprites.ts';
import { rgb } from '../../tools/placeholder-tiles.ts';
import {
  renderVeil,
  VEIL_FRAME_SIZE,
  VEIL_FRAMES,
  VEIL_SHEET_HEIGHT,
  VEIL_SHEET_WIDTH,
  veilInk,
} from '../../tools/placeholder-veil.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const VEIL = renderVeil();
/** Whether pixel (i, j) of frame `frame` is opaque, and that an opaque pixel is the signature colour. */
function inked(frame: number, i: number, j: number): boolean {
  const at = (j * VEIL_SHEET_WIDTH + frame * VEIL_FRAME_SIZE + i) * 4;
  const [r, g, b, a] = VEIL.slice(at, at + 4);
  if (a === 0) {
    return false;
  }
  expect([r, g, b, a]).toStrictEqual([...rgb(SHADOW_COLOUR), 255]);
  return true;
}
const everyPixel = (visit: (i: number, j: number) => void): void => {
  for (let j = 0; j < VEIL_FRAME_SIZE; j += 1) {
    for (let i = 0; i < VEIL_FRAME_SIZE; i += 1) {
      visit(i, j);
    }
  }
};

describe('the placeholder veil generator (0023)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeVeilPng().equals(encodeVeilPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(join(ROOT, 'public/sprites/shadow-veil.png')));
    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
    expect(Buffer.from(VEIL).equals(committed.data)).toBe(true);
  });

  it('is 48x16: three 16x16 frames in one row, one per density', () => {
    expect([VEIL_SHEET_WIDTH, VEIL_SHEET_HEIGHT, VEIL_FRAME_SIZE, VEIL_FRAMES]).toStrictEqual([
      48, 16, 16, 3,
    ]);
    expect(VEIL).toHaveLength(48 * 16 * 4);
  });

  it('holds 32, 64 and 128 pixels of the signature colour, and nothing else', () => {
    const counts = [0, 1, 2].map((frame) => {
      let count = 0;
      everyPixel((i, j) => {
        count += inked(frame, i, j) ? 1 : 0;
      });
      return count;
    });
    expect(counts).toStrictEqual([32, 64, 128]);
  });

  it('puts the pixels where the spec says', () => {
    everyPixel((i, j) => {
      const dots = (i % 4 === 0 && j % 4 === 0) || (i % 4 === 2 && j % 4 === 2);
      expect(inked(0, i, j), `frame 0 (${i}, ${j})`).toBe(dots);
      expect(inked(1, i, j), `frame 1 (${i}, ${j})`).toBe((i + j) % 4 === 0);
      expect(inked(2, i, j), `frame 2 (${i}, ${j})`).toBe((i + j) % 2 === 0);
    });
    expect([veilInk(0, 0, 0), veilInk(0, 2, 2), veilInk(0, 2, 0)]).toStrictEqual([
      true,
      true,
      false,
    ]);
  });

  it('repeats every 4 px, so that the frames join without a seam', () => {
    for (let frame = 0; frame < VEIL_FRAMES; frame += 1) {
      everyPixel((i, j) => {
        expect(veilInk(frame, i, j)).toBe(veilInk(frame, (i + 4) % 16, j));
        expect(veilInk(frame, i, j)).toBe(veilInk(frame, i, (j + 4) % 16));
      });
    }
  });

  it('grows with the density: every pixel of a frame is in the next', () => {
    everyPixel((i, j) => {
      expect(!veilInk(0, i, j) || veilInk(1, i, j)).toBe(true);
      expect(!veilInk(1, i, j) || veilInk(2, i, j)).toBe(true);
    });
  });

  it('has no fourth frame', () => {
    everyPixel((i, j) => {
      expect(veilInk(3, i, j)).toBe(false);
    });
  });
});
