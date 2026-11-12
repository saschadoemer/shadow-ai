import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { FRAME_HEIGHT, FRAME_WIDTH } from '../../src/engine/sprite';
import { FRAME_APEX, inCone } from '../../src/game/lamp';
import { FACINGS, PHASES_PER_FACING } from '../../src/game/state';
import { SHADOW_COLOUR } from '../../src/render/palette';
import { encodeLampPng, encodePng, encodeSnippetPng } from '../../tools/gen-sprites.ts';
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
import {
  renderSnippet,
  SNIPPET_FRAME_SIZE,
  SNIPPET_FRAMES,
  SNIPPET_LIT,
  SNIPPET_PAPER,
  SNIPPET_SHEET_HEIGHT,
  SNIPPET_SHEET_WIDTH,
} from '../../tools/placeholder-snippet.ts';

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

const SNIPPET_FILE = join(ROOT, 'public/sprites/snippet.png');
const SNIPPET = renderSnippet();

/** The colour of pixel (i, j) of frame `index` of the snippet sheet, or null when transparent. */
function snippetPixel(index: number, i: number, j: number): string | null {
  const o = (j * SNIPPET_SHEET_WIDTH + index * SNIPPET_FRAME_SIZE + i) * 4;
  if (SNIPPET[o + 3] !== 255) {
    return null;
  }
  return `#${[SNIPPET[o], SNIPPET[o + 1], SNIPPET[o + 2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Frame `index` as 16 rows of 16 colours or nulls. */
function snippetFrame(index: number): (string | null)[][] {
  return Array.from({ length: SNIPPET_FRAME_SIZE }, (_, j) =>
    Array.from({ length: SNIPPET_FRAME_SIZE }, (_, i) => snippetPixel(index, i, j)),
  );
}

describe('the placeholder snippet generator (0008)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeSnippetPng().equals(encodeSnippetPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(SNIPPET_FILE));
    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
    expect(Buffer.from(SNIPPET).equals(committed.data)).toBe(true);
  });

  it('is 48x16: three 16x16 frames in one row', () => {
    expect([
      SNIPPET_SHEET_WIDTH,
      SNIPPET_SHEET_HEIGHT,
      SNIPPET_FRAME_SIZE,
      SNIPPET_FRAMES,
    ]).toStrictEqual([48, 16, 16, 3]);
    expect(SNIPPET).toHaveLength(48 * 16 * 4);
  });

  it('has 100 opaque pixels per frame, 52 of them the signature colour', () => {
    for (let index = 0; index < SNIPPET_FRAMES; index += 1) {
      const pixels = snippetFrame(index).flat();
      expect(
        pixels.filter((colour) => colour !== null),
        `frame ${index}`,
      ).toHaveLength(100);
      expect(
        pixels.filter((colour) => colour === SHADOW_COLOUR),
        `frame ${index}`,
      ).toHaveLength(52);
    }
  });

  it('draws frame 0 as the spec says: the square 3–12 × 4–13, its border and three lines violet', () => {
    expect(snippetPixel(0, 3, 4)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 12, 13)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 2, 4)).toBeNull();
    expect(snippetPixel(0, 3, 14)).toBeNull();
    expect(snippetPixel(0, 4, 5)).toBe(SNIPPET_PAPER);
    expect(snippetPixel(0, 5, 7)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 10, 9)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 11, 9)).toBe(SNIPPET_PAPER);
    expect(snippetPixel(0, 8, 11)).toBe(SHADOW_COLOUR);
    expect(snippetPixel(0, 9, 11)).toBe(SNIPPET_PAPER);
    expect(snippetPixel(0, 5, 8)).toBe(SNIPPET_PAPER);
    expect([SNIPPET_PAPER, SNIPPET_LIT]).toStrictEqual(['#c0cbdc', '#ffffff']);
  });

  it('frame 1 is frame 0 moved up by 2 px', () => {
    const blank = new Array<string | null>(SNIPPET_FRAME_SIZE).fill(null);
    expect(snippetFrame(1)).toStrictEqual([...snippetFrame(0).slice(2), blank, blank]);
  });

  it('frame 2 is frame 0 with white paper', () => {
    const lit = snippetFrame(0).map((row) =>
      row.map((colour) => (colour === SNIPPET_PAPER ? SNIPPET_LIT : colour)),
    );
    expect(snippetFrame(2)).toStrictEqual(lit);
  });
});
