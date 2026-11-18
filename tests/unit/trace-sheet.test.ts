import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { SHADOW_COLOUR } from '../../src/render/palette';
import { encodeTracePng } from '../../tools/gen-sprites.ts';
import { rgb } from '../../tools/placeholder-tiles.ts';
import {
  renderTrace,
  TRACE_FRAME_SIZE,
  TRACE_FRAMES,
  TRACE_SHEET_HEIGHT,
  TRACE_SHEET_WIDTH,
  TRACE_SQUARES,
  traceInk,
} from '../../tools/placeholder-trace.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TRACE = renderTrace();
/** Whether pixel (i, j) of frame `frame` is opaque, and that an opaque pixel is the signature colour. */
function inked(frame: number, i: number, j: number): boolean {
  const at = (j * TRACE_SHEET_WIDTH + frame * TRACE_FRAME_SIZE + i) * 4;
  const [r, g, b, a] = TRACE.slice(at, at + 4);
  if (a === 0) {
    return false;
  }
  expect([r, g, b, a]).toStrictEqual([...rgb(SHADOW_COLOUR), 255]);
  return true;
}

describe('the placeholder trace generator (0022)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeTracePng().equals(encodeTracePng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(join(ROOT, 'public/sprites/trace.png')));
    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
    expect(Buffer.from(TRACE).equals(committed.data)).toBe(true);
  });

  it('is 48x16: three 16x16 frames in one row', () => {
    expect([TRACE_SHEET_WIDTH, TRACE_SHEET_HEIGHT, TRACE_FRAME_SIZE, TRACE_FRAMES]).toStrictEqual([
      48, 16, 16, 3,
    ]);
    expect(TRACE).toHaveLength(48 * 16 * 4);
  });

  it('holds 18, 50 and 98 pixels of the signature colour, and nothing else', () => {
    expect(TRACE_SQUARES).toStrictEqual([6, 10, 14]);
    const counts = [0, 1, 2].map((frame) => {
      let count = 0;
      for (let j = 0; j < TRACE_FRAME_SIZE; j += 1) {
        for (let i = 0; i < TRACE_FRAME_SIZE; i += 1) {
          count += inked(frame, i, j) ? 1 : 0;
        }
      }
      return count;
    });
    expect(counts).toStrictEqual([18, 50, 98]);
  });

  it('draws a checkerboard inside a centred square: 6, 10 and 14 px', () => {
    // Frame 0: the square is the columns and rows 5 to 10.
    expect([traceInk(0, 5, 5), traceInk(0, 6, 5), traceInk(0, 10, 10)]).toStrictEqual([
      true,
      false,
      true,
    ]);
    expect([traceInk(0, 4, 4), traceInk(0, 11, 11)]).toStrictEqual([false, false]);
    // Frame 2: the columns and rows 1 to 14.
    expect([traceInk(2, 1, 1), traceInk(2, 14, 14), traceInk(2, 0, 0)]).toStrictEqual([
      true,
      true,
      false,
    ]);
    for (let frame = 0; frame < TRACE_FRAMES; frame += 1) {
      for (let j = 0; j < TRACE_FRAME_SIZE; j += 1) {
        for (let i = 0; i < TRACE_FRAME_SIZE; i += 1) {
          expect(inked(frame, i, j)).toBe(traceInk(frame, i, j));
        }
      }
    }
  });

  it('grows: every pixel of a frame is in the next', () => {
    for (let j = 0; j < TRACE_FRAME_SIZE; j += 1) {
      for (let i = 0; i < TRACE_FRAME_SIZE; i += 1) {
        expect(!traceInk(0, i, j) || traceInk(1, i, j)).toBe(true);
        expect(!traceInk(1, i, j) || traceInk(2, i, j)).toBe(true);
      }
    }
  });
});
