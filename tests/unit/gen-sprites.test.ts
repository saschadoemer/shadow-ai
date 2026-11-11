import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { FRAME_HEIGHT, FRAME_WIDTH } from '../../src/engine/sprite';
import { FRAME_APEX, inCone } from '../../src/game/lamp';
import { FACINGS, PHASES_PER_FACING } from '../../src/game/state';
import { encodeLampPng, encodePng } from '../../tools/gen-sprites.ts';
import {
  LAMP_COLOUR,
  LAMP_FRAME_SIZE,
  LAMP_SHEET_HEIGHT,
  LAMP_SHEET_WIDTH,
  renderLamp,
} from '../../tools/placeholder-lamp.ts';
import {
  FRAME_COUNT,
  frameRows,
  INKS,
  renderPlayer,
  SHEET_HEIGHT,
  SHEET_WIDTH,
} from '../../tools/placeholder-player.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PNG_FILE = join(ROOT, 'public/sprites/player.png');
const BLANK = '................';
/** Colour → letter, the generator's own notation, so a failure prints a readable frame. */
const LETTERS = new Map<string, string>(
  Object.entries(INKS).map(([letter, colour]) => [colour, letter]),
);

/** Frame `index` of the sheet as 24 rows of letters; `.` is transparent, `?` an unknown colour. */
function frameText(data: Uint8Array, index: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    let row = '';
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      const o = (y * SHEET_WIDTH + index * FRAME_WIDTH + x) * 4;
      const colour = `#${[data[o], data[o + 1], data[o + 2]]
        .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
        .join('')}`;
      row += data[o + 3] === 0 ? '.' : (LETTERS.get(colour) ?? '?');
    }
    rows.push(row);
  }
  return rows;
}

const SHEET = renderPlayer();
const frame = (facing: number, phase: number) =>
  frameText(SHEET, facing * PHASES_PER_FACING + phase);

describe('the placeholder figure generator', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodePng().equals(encodePng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(PNG_FILE));
    expect([committed.width, committed.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
    expect(Buffer.from(SHEET).equals(committed.data)).toBe(true);
  });

  it('is 320x24: twenty 16x24 frames in one row', () => {
    expect(FRAME_COUNT).toBe(FACINGS.length * PHASES_PER_FACING);
    expect([SHEET_WIDTH, SHEET_HEIGHT]).toStrictEqual([320, 24]);
    expect(SHEET).toHaveLength(320 * 24 * 4);
  });

  it('uses only the six figure colours, each pixel opaque or transparent', () => {
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      expect(frameText(SHEET, index).join('\n'), `frame ${index}`).not.toContain('?');
    }
  });

  it('differs the standing frame from every walking frame, per facing', () => {
    for (const [f, facing] of FACINGS.entries()) {
      for (let phase = 1; phase < PHASES_PER_FACING; phase += 1) {
        expect(frame(f, phase), `${facing} phase ${phase}`).not.toStrictEqual(frame(f, 0));
      }
    }
  });

  it('differs the four standing frames from each other', () => {
    for (let a = 0; a < FACINGS.length; a += 1) {
      for (let b = a + 1; b < FACINGS.length; b += 1) {
        expect(frame(a, 0), `${FACINGS[a]} vs ${FACINGS[b]}`).not.toStrictEqual(frame(b, 0));
      }
    }
  });

  it('rejects a phase outside 0–4', () => {
    expect(() => frameRows('down', 5)).toThrow();
    expect(() => frameRows('down', -1)).toThrow();
  });

  it('draws facing right as facing left mirrored, phase by phase', () => {
    for (let phase = 0; phase < PHASES_PER_FACING; phase += 1) {
      const mirrored = frame(2, phase).map((row) => row.split('').reverse().join(''));
      expect(frame(3, phase), `phase ${phase}`).toStrictEqual(mirrored);
    }
  });

  it('raises phases 2 and 4 by one pixel from the standing pose', () => {
    for (const [f, facing] of FACINGS.entries()) {
      const raised = [...frame(f, 0).slice(1), BLANK];
      expect(frame(f, 2), facing).toStrictEqual(raised);
      expect(frame(f, 4), facing).toStrictEqual(raised);
    }
  });

  it('shows the facing by the eyes and the lanyard', () => {
    const [down, up, left, right] = [frame(0, 0), frame(1, 0), frame(2, 0), frame(3, 0)];
    expect([down[7]?.[6], down[7]?.[9]], 'two eyes facing down').toStrictEqual(['K', 'K']);
    expect(down.join(''), 'the lanyard facing down').toContain('L');
    expect(up.slice(2, 10).join(''), 'hair only facing up').toMatch(/^[H.]+$/);
    expect(up.join(''), 'no lanyard facing up').not.toContain('L');
    expect(left[7]?.[5], 'the eye at the left edge of the face').toBe('K');
    expect(left[7]?.[10]).not.toBe('K');
    expect(right[7]?.[10], 'the eye at the right edge of the face').toBe('K');
    expect(right[7]?.[5]).not.toBe('K');
    expect(left[11]?.[5], 'the strap at the chest front facing left').toBe('L');
    expect(right[11]?.[10], 'the strap at the chest front facing right').toBe('L');
  });

  it('keeps everything outside the figure transparent: the first and last rows of a standing frame', () => {
    expect(frame(0, 0)[0]).toBe(BLANK);
    expect(frame(0, 2)[23]).toBe(BLANK);
  });
});

const LAMP_FILE = join(ROOT, 'public/sprites/lamp.png');
const LAMP = renderLamp();

/** The byte offset of pixel (i, j) of frame `index` of the lamp sheet. */
function lampOffset(index: number, i: number, j: number): number {
  return (j * LAMP_SHEET_WIDTH + index * LAMP_FRAME_SIZE + i) * 4;
}

function lampColour(index: number, i: number, j: number): string {
  const o = lampOffset(index, i, j);
  return `#${[LAMP[o], LAMP[o + 1], LAMP[o + 2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('the placeholder lamp generator (0007)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeLampPng().equals(encodeLampPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(LAMP_FILE));
    expect([committed.width, committed.height]).toStrictEqual([
      LAMP_SHEET_WIDTH,
      LAMP_SHEET_HEIGHT,
    ]);
    expect(Buffer.from(LAMP).equals(committed.data)).toBe(true);
  });

  it('is 192x48: four 48x48 frames in one row, one per facing', () => {
    expect([LAMP_SHEET_WIDTH, LAMP_SHEET_HEIGHT]).toStrictEqual([192, 48]);
    expect(LAMP_FRAME_SIZE).toBe(48);
    expect(LAMP).toHaveLength(192 * 48 * 4);
  });

  it("lights exactly the checkerboard inside each frame's cone, in the lamp colour, pixel by pixel", () => {
    for (const [index, facing] of FACINGS.entries()) {
      const cone = { apex: FRAME_APEX[facing], facing };
      for (let j = 0; j < LAMP_FRAME_SIZE; j += 1) {
        for (let i = 0; i < LAMP_FRAME_SIZE; i += 1) {
          const lit = (i + j) % 2 === 0 && inCone({ x: i, y: j }, cone);
          const alpha = LAMP[lampOffset(index, i, j) + 3];
          expect(alpha, `${facing} (${i}, ${j})`).toBe(lit ? 255 : 0);
          if (lit) {
            expect(lampColour(index, i, j), `${facing} (${i}, ${j})`).toBe(LAMP_COLOUR);
          }
        }
      }
    }
  });

  it('has exactly 576 opaque pixels per frame', () => {
    for (const [index, facing] of FACINGS.entries()) {
      let opaque = 0;
      for (let j = 0; j < LAMP_FRAME_SIZE; j += 1) {
        for (let i = 0; i < LAMP_FRAME_SIZE; i += 1) {
          if (LAMP[lampOffset(index, i, j) + 3] === 255) {
            opaque += 1;
          }
        }
      }
      expect(opaque, facing).toBe(576);
    }
  });

  it('starts the right-facing cone at the apex alone and ends it 47 rows wide, with row 0 dark', () => {
    const right = FACINGS.indexOf('right');
    expect(LAMP[lampOffset(right, 0, 24) + 3]).toBe(255);
    expect(LAMP[lampOffset(right, 0, 23) + 3]).toBe(0);
    expect(LAMP[lampOffset(right, 0, 25) + 3]).toBe(0);
    expect(LAMP[lampOffset(right, 47, 1) + 3]).toBe(255); // 47 + 1 is even
    expect(LAMP[lampOffset(right, 47, 47) + 3]).toBe(255);
    expect(LAMP[lampOffset(right, 47, 0) + 3]).toBe(0);
  });
});
