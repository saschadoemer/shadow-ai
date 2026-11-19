import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { FRAME_HEIGHT, FRAME_WIDTH } from '../../src/engine/sprite';
import { FRAME_APEX, inCone, WIDE_FRAME_APEX, WIDE_SPREAD } from '../../src/game/lamp';
import { FACINGS, PHASES_PER_FACING } from '../../src/game/state';
import { type PaletteColour, SHADOW_COLOUR } from '../../src/render/palette';
import {
  encodeDogPng,
  encodeDronePng,
  encodeLampPng,
  encodeLampWidePng,
  encodeMiragePng,
  encodeOfficerPng,
  encodeOverviewPng,
  encodePersonPng,
  encodePng,
  encodeShadowWallPng,
  encodeSnippetPng,
  encodeVacuumPng,
} from '../../tools/gen-sprites.ts';
import { renderDog } from '../../tools/placeholder-dog.ts';
import { droneInk, renderDrone } from '../../tools/placeholder-drone.ts';
import {
  LAMP_COLOUR,
  LAMP_FRAME_SIZE,
  LAMP_SHEET_HEIGHT,
  LAMP_SHEET_WIDTH,
  renderLamp,
  renderWideLamp,
  WIDE_LAMP_FRAME_SIZE,
  WIDE_LAMP_SHEET_HEIGHT,
  WIDE_LAMP_SHEET_WIDTH,
} from '../../tools/placeholder-lamp.ts';
import {
  MIRAGE_FRAME_SIZE,
  MIRAGE_FRAMES,
  MIRAGE_GROUND,
  MIRAGE_LIT,
  MIRAGE_SHEET_HEIGHT,
  MIRAGE_SHEET_WIDTH,
  renderMirage,
} from '../../tools/placeholder-mirage.ts';
import {
  OVERVIEW_EMPTY,
  OVERVIEW_FRAME_SIZE,
  OVERVIEW_FRAMES,
  OVERVIEW_FULL,
  OVERVIEW_RIM,
  OVERVIEW_SHEET_HEIGHT,
  OVERVIEW_SHEET_WIDTH,
  renderOverview,
} from '../../tools/placeholder-overview.ts';
import {
  OFFICER_SHIRT,
  PERSON_SHIRTS,
  renderFigure,
  renderPerson,
} from '../../tools/placeholder-person.ts';
import {
  FRAME_COUNT,
  frameRows,
  INKS,
  renderPlayer,
  SHEET_HEIGHT,
  SHEET_WIDTH,
} from '../../tools/placeholder-player.ts';
import {
  renderShadowWall,
  WALL_DARK,
  WALL_FRAME_SIZE,
  WALL_LOOKS,
  WALL_ORIENTATIONS,
  WALL_SHEET_HEIGHT,
  WALL_SHEET_WIDTH,
  WALL_STRIP,
  wallInk,
} from '../../tools/placeholder-shadow-wall.ts';
import {
  renderSnippet,
  SNIPPET_FRAME_SIZE,
  SNIPPET_FRAMES,
  SNIPPET_LIT,
  SNIPPET_PAPER,
  SNIPPET_SHEET_HEIGHT,
  SNIPPET_SHEET_WIDTH,
} from '../../tools/placeholder-snippet.ts';
import { rgb } from '../../tools/placeholder-tiles.ts';
import { renderVacuum, vacuumInk } from '../../tools/placeholder-vacuum.ts';

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

const LAMP_WIDE_FILE = join(ROOT, 'public/sprites/lamp-wide.png');
const LAMP_WIDE = renderWideLamp();

/** The byte offset of pixel (i, j) of frame `index` of the wider cone's sheet. */
function wideOffset(index: number, i: number, j: number): number {
  return (j * WIDE_LAMP_SHEET_WIDTH + index * WIDE_LAMP_FRAME_SIZE + i) * 4;
}

describe('the sheet of the wider cone (0029)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeLampWidePng().equals(encodeLampWidePng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(LAMP_WIDE_FILE));
    expect([committed.width, committed.height]).toStrictEqual([288, 72]);
    expect(Buffer.from(LAMP_WIDE).equals(committed.data)).toBe(true);
  });

  it('is 288x72: four 72x72 frames in one row, one per facing', () => {
    expect([WIDE_LAMP_SHEET_WIDTH, WIDE_LAMP_SHEET_HEIGHT]).toStrictEqual([288, 72]);
    expect(WIDE_LAMP_FRAME_SIZE).toBe(72);
    expect(LAMP_WIDE).toHaveLength(288 * 72 * 4);
  });

  it("lights exactly the checkerboard inside each frame's cone of three quarters, pixel by pixel", () => {
    const [r, g, b] = [0xfe, 0xe7, 0x61];
    expect(LAMP_COLOUR).toBe('#fee761');
    for (const [index, facing] of FACINGS.entries()) {
      const cone = { apex: WIDE_FRAME_APEX[facing], facing };
      for (let j = 0; j < WIDE_LAMP_FRAME_SIZE; j += 1) {
        for (let i = 0; i < WIDE_LAMP_FRAME_SIZE; i += 1) {
          const lit = (i + j) % 2 === 0 && inCone({ x: i, y: j }, cone, WIDE_SPREAD);
          const o = wideOffset(index, i, j);
          expect(
            [LAMP_WIDE[o], LAMP_WIDE[o + 1], LAMP_WIDE[o + 2], LAMP_WIDE[o + 3]],
            `${facing} (${i}, ${j})`,
          ).toStrictEqual(lit ? [r, g, b, 255] : [0, 0, 0, 0]);
        }
      }
    }
  });

  it('has exactly 852 opaque pixels per frame', () => {
    const counts = FACINGS.map((_facing, index) => {
      let opaque = 0;
      for (let j = 0; j < WIDE_LAMP_FRAME_SIZE; j += 1) {
        for (let i = 0; i < WIDE_LAMP_FRAME_SIZE; i += 1) {
          opaque += LAMP_WIDE[wideOffset(index, i, j) + 3] === 255 ? 1 : 0;
        }
      }
      return opaque;
    });
    expect(counts).toStrictEqual([852, 852, 852, 852]);
  });

  it('starts the right-facing cone at the apex alone and ends it 71 rows wide', () => {
    const right = FACINGS.indexOf('right');
    expect(LAMP_WIDE[wideOffset(right, 0, 36) + 3]).toBe(255);
    expect(LAMP_WIDE[wideOffset(right, 0, 35) + 3]).toBe(0);
    expect(LAMP_WIDE[wideOffset(right, 0, 37) + 3]).toBe(0);
    expect(LAMP_WIDE[wideOffset(right, 47, 1) + 3]).toBe(255); // 47 + 1 is even
    expect(LAMP_WIDE[wideOffset(right, 47, 71) + 3]).toBe(255);
    expect(LAMP_WIDE[wideOffset(right, 47, 0) + 3]).toBe(0);
    // The cone is 48 px long: the frame's last 24 columns are empty.
    for (let i = 48; i < 72; i += 1) {
      for (let j = 0; j < 72; j += 1) {
        expect(LAMP_WIDE[wideOffset(right, i, j) + 3], `(${i}, ${j})`).toBe(0);
      }
    }
  });

  it('leaves the lamp sheet of 0007 as it was', () => {
    const committed = PNG.sync.read(readFileSync(LAMP_FILE));
    expect(Buffer.from(renderLamp()).equals(committed.data)).toBe(true);
  });
});

const MIRAGE_FILE = join(ROOT, 'public/sprites/mirage.png');
const MIRAGE = renderMirage();

/** The colour of pixel (i, j) of frame `index` of the mirage sheet, or null when transparent. */
function miragePixel(index: number, i: number, j: number): string | null {
  const o = (j * MIRAGE_SHEET_WIDTH + index * MIRAGE_FRAME_SIZE + i) * 4;
  if (MIRAGE[o + 3] !== 255) {
    return null;
  }
  return `#${[MIRAGE[o], MIRAGE[o + 1], MIRAGE[o + 2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mirageFrame(index: number): (string | null)[][] {
  return Array.from({ length: MIRAGE_FRAME_SIZE }, (_, j) =>
    Array.from({ length: MIRAGE_FRAME_SIZE }, (_, i) => miragePixel(index, i, j)),
  );
}

describe('the placeholder mirage generator (0032)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeMiragePng().equals(encodeMiragePng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(MIRAGE_FILE));
    expect([committed.width, committed.height]).toStrictEqual([48, 16]);
    expect(Buffer.from(MIRAGE).equals(committed.data)).toBe(true);
  });

  it('is 48x16: three 16x16 frames in one row', () => {
    expect([
      MIRAGE_SHEET_WIDTH,
      MIRAGE_SHEET_HEIGHT,
      MIRAGE_FRAME_SIZE,
      MIRAGE_FRAMES,
    ]).toStrictEqual([48, 16, 16, 3]);
    expect(MIRAGE).toHaveLength(48 * 16 * 4);
  });

  it('has 120 opaque pixels per frame, 72 of them the signature colour', () => {
    for (let index = 0; index < MIRAGE_FRAMES; index += 1) {
      const pixels = mirageFrame(index).flat();
      expect(
        pixels.filter((colour) => colour !== null),
        `frame ${index}`,
      ).toHaveLength(120);
      expect(
        pixels.filter((colour) => colour === SHADOW_COLOUR),
        `frame ${index}`,
      ).toHaveLength(72);
    }
  });

  it('draws frame 0 as the spec says: the rectangle 3–12 × 2–13, its border, a head and shoulders violet', () => {
    // The border.
    expect(miragePixel(0, 3, 2)).toBe(SHADOW_COLOUR);
    expect(miragePixel(0, 12, 13)).toBe(SHADOW_COLOUR);
    expect(miragePixel(0, 2, 2)).toBeNull();
    expect(miragePixel(0, 3, 14)).toBeNull();
    expect(miragePixel(0, 13, 7)).toBeNull();
    // The head: columns 7–8, rows 5–6.
    expect(miragePixel(0, 7, 5)).toBe(SHADOW_COLOUR);
    expect(miragePixel(0, 8, 6)).toBe(SHADOW_COLOUR);
    expect(miragePixel(0, 6, 5)).toBe(MIRAGE_GROUND);
    expect(miragePixel(0, 7, 4)).toBe(MIRAGE_GROUND);
    expect(miragePixel(0, 7, 7)).toBe(MIRAGE_GROUND);
    // The shoulders: columns 6–9 in row 8, columns 5–10 in rows 9–12.
    expect(miragePixel(0, 6, 8)).toBe(SHADOW_COLOUR);
    expect(miragePixel(0, 9, 8)).toBe(SHADOW_COLOUR);
    expect(miragePixel(0, 5, 8)).toBe(MIRAGE_GROUND);
    expect(miragePixel(0, 5, 9)).toBe(SHADOW_COLOUR);
    expect(miragePixel(0, 10, 12)).toBe(SHADOW_COLOUR);
    expect(miragePixel(0, 4, 9)).toBe(MIRAGE_GROUND);
    expect(miragePixel(0, 11, 12)).toBe(MIRAGE_GROUND);
    expect([MIRAGE_GROUND, MIRAGE_LIT]).toStrictEqual(['#c0cbdc', '#ffffff']);
  });

  it('frame 1 is frame 0 moved one pixel to the right', () => {
    expect(mirageFrame(1)).toStrictEqual(
      mirageFrame(0).map((row) => [null, ...row.slice(0, MIRAGE_FRAME_SIZE - 1)]),
    );
  });

  it('frame 2 is frame 0 with a white ground', () => {
    const lit = mirageFrame(0).map((row) =>
      row.map((colour) => (colour === MIRAGE_GROUND ? MIRAGE_LIT : colour)),
    );
    expect(mirageFrame(2)).toStrictEqual(lit);
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

const OVERVIEW_FILE = join(ROOT, 'public/sprites/overview.png');
const OVERVIEW = renderOverview();

/** The colour of pixel (i, j) of frame `index` of the overview sheet, or null when transparent. */
function overviewPixel(index: number, i: number, j: number): string | null {
  const o = (j * OVERVIEW_SHEET_WIDTH + index * OVERVIEW_FRAME_SIZE + i) * 4;
  if (OVERVIEW[o + 3] !== 255) {
    return null;
  }
  return `#${[OVERVIEW[o], OVERVIEW[o + 1], OVERVIEW[o + 2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Frame `index` as 8 rows of 8 colours or nulls. */
function overviewFrame(index: number): (string | null)[][] {
  return Array.from({ length: OVERVIEW_FRAME_SIZE }, (_, j) =>
    Array.from({ length: OVERVIEW_FRAME_SIZE }, (_, i) => overviewPixel(index, i, j)),
  );
}

describe('the placeholder overview generator (0012)', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeOverviewPng().equals(encodeOverviewPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(OVERVIEW_FILE));
    expect([committed.width, committed.height]).toStrictEqual([16, 8]);
    expect(Buffer.from(OVERVIEW).equals(committed.data)).toBe(true);
  });

  it('is 16x8: two 8x8 frames in one row', () => {
    expect([
      OVERVIEW_SHEET_WIDTH,
      OVERVIEW_SHEET_HEIGHT,
      OVERVIEW_FRAME_SIZE,
      OVERVIEW_FRAMES,
    ]).toStrictEqual([16, 8, 8, 2]);
    expect(OVERVIEW).toHaveLength(16 * 8 * 4);
  });

  it('has 34 opaque pixels per frame, 16 of them the rim', () => {
    expect([OVERVIEW_RIM, OVERVIEW_FULL, OVERVIEW_EMPTY]).toStrictEqual([
      '#181425',
      '#e43b44',
      '#3a4466',
    ]);
    for (let index = 0; index < OVERVIEW_FRAMES; index += 1) {
      const pixels = overviewFrame(index).flat();
      expect(
        pixels.filter((colour) => colour !== null),
        `frame ${index}`,
      ).toHaveLength(34);
      expect(
        pixels.filter((colour) => colour === OVERVIEW_RIM),
        `frame ${index}`,
      ).toHaveLength(16);
    }
  });

  it('draws frame 0 as the spec says: a heart with a dark rim, red inside', () => {
    const R = OVERVIEW_RIM;
    const F = OVERVIEW_FULL;
    const N = null;
    expect(overviewFrame(0)).toStrictEqual([
      [N, R, R, N, R, R, N, N],
      [R, F, F, R, F, F, R, N],
      [R, F, F, F, F, F, R, N],
      [R, F, F, F, F, F, R, N],
      [N, R, F, F, F, R, N, N],
      [N, N, R, F, R, N, N, N],
      [N, N, N, R, N, N, N, N],
      [N, N, N, N, N, N, N, N],
    ]);
  });

  it('frame 1 is frame 0 with the heart empty', () => {
    const empty = overviewFrame(0).map((row) =>
      row.map((colour) => (colour === OVERVIEW_FULL ? OVERVIEW_EMPTY : colour)),
    );
    expect(overviewFrame(1)).toStrictEqual(empty);
  });
});

describe('the movers’ sheets (0015)', () => {
  const file = (name: string) => readFileSync(join(ROOT, 'public/sprites', name));
  const read = (name: string) => PNG.sync.read(file(name));
  const pixel = (data: Uint8Array, width: number, x: number, y: number) => [
    ...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4),
  ];

  it('officer.png equals its generator and is the player in a light grey shirt, without the lanyard (0017)', () => {
    const png = read('officer.png');
    expect([png.width, png.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
    expect(encodeOfficerPng().equals(file('officer.png'))).toBe(true);
    expect(OFFICER_SHIRT).toBe('#c0cbdc');
    expect(PERSON_SHIRTS).not.toContain(OFFICER_SHIRT);
    expect(OFFICER_SHIRT).not.toBe(INKS.T);
    const officer = renderFigure(OFFICER_SHIRT);
    const player = renderPlayer();
    const shirt = [...rgb(OFFICER_SHIRT), 255].join();
    const playerShirt = [...rgb(INKS.T), 255].join();
    const lanyard = [...rgb(INKS.L), 255].join();
    for (let i = 0; i < player.length; i += 4) {
      const was = [...player.slice(i, i + 4)].join();
      const is = [...officer.slice(i, i + 4)].join();
      expect(is).toBe(was === playerShirt || was === lanyard ? shirt : was);
    }
  });

  it('a person is a figure in its shirt: the two generators agree', () => {
    for (const [look, shirt] of PERSON_SHIRTS.entries()) {
      expect(Buffer.from(renderPerson(look)).equals(Buffer.from(renderFigure(shirt)))).toBe(true);
    }
  });

  it.each([0, 1, 2, 3])(
    'person %i equals its generator and is the figure in another shirt',
    (look) => {
      const png = read(`person-${look + 1}.png`);
      expect([png.width, png.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
      expect(encodePersonPng(look).equals(file(`person-${look + 1}.png`))).toBe(true);
      const person = renderPerson(look);
      const player = renderPlayer();
      const shirt = [...rgb(PERSON_SHIRTS[look] as PaletteColour), 255].join();
      const figureShirt = [...rgb(INKS.T), 255].join();
      const lanyard = [...rgb(INKS.L), 255].join();
      for (let i = 0; i < player.length; i += 4) {
        const was = [...player.slice(i, i + 4)].join();
        const is = [...person.slice(i, i + 4)].join();
        expect(is).toBe(was === figureShirt || was === lanyard ? shirt : was);
      }
    },
  );

  it('the shirts are green, red, orange and pink, none the figure’s', () => {
    expect(PERSON_SHIRTS).toStrictEqual(['#3e8948', '#e43b44', '#f77622', '#b55088']);
  });

  it('the down-facing standing frame has shirt at (7, 13): the smoke test reads it', () => {
    expect(['T', 'L']).toContain(frameRows('down', 0)[13]?.[7]);
  });

  it('dog.png is 384x16, equals its generator, and holds two coats of twelve frames', () => {
    const png = read('dog.png');
    expect([png.width, png.height]).toStrictEqual([384, 16]);
    expect(encodeDogPng().equals(file('dog.png'))).toBe(true);
    const data = renderDog();
    const colours = (from: number) => {
      const seen = new Set<string>();
      for (let x = from; x < from + 192; x += 1) {
        for (let y = 0; y < 16; y += 1) {
          const [r, g, b, a] = pixel(data, 384, x, y);
          if (a === 255) {
            seen.add(`${r},${g},${b}`);
          }
        }
      }
      return seen;
    };
    expect(colours(0)).toStrictEqual(new Set([rgb('#b86f50').join(), rgb('#3e2731').join()]));
    expect(colours(192)).toStrictEqual(new Set([rgb('#ead4aa').join(), rgb('#3e2731').join()]));
    for (let frame = 0; frame < 24; frame += 1) {
      const alphas = Array.from(
        { length: 256 },
        (_, n) => pixel(data, 384, frame * 16 + (n % 16), Math.floor(n / 16))[3],
      );
      expect(alphas.includes(255), `frame ${frame} has pixels`).toBe(true);
    }
    // Facing left (index 2) is facing right (index 3) mirrored, in both coats.
    for (const look of [0, 1]) {
      for (let phase = 0; phase < 3; phase += 1) {
        for (let y = 0; y < 16; y += 1) {
          for (let x = 0; x < 16; x += 1) {
            expect(pixel(data, 384, (look * 12 + 2 * 3 + phase) * 16 + x, y)).toStrictEqual(
              pixel(data, 384, (look * 12 + 3 * 3 + phase) * 16 + (15 - x), y),
            );
          }
        }
      }
    }
  });

  it('vacuum.png is 32x16: a disc 12 px wide in the lower 12 px, the light on and off', () => {
    const png = read('vacuum.png');
    expect([png.width, png.height]).toStrictEqual([32, 16]);
    expect(encodeVacuumPng().equals(file('vacuum.png'))).toBe(true);
    const data = renderVacuum();
    const colour = { rim: '#262b44', body: '#3a4466' } as const;
    for (let frame = 0; frame < 2; frame += 1) {
      for (let j = 0; j < 16; j += 1) {
        for (let i = 0; i < 16; i += 1) {
          const ink = vacuumInk(i, j);
          const expected =
            ink === null
              ? [0, 0, 0, 0]
              : [
                  ...rgb(ink === 'light' ? (frame === 0 ? '#63c74d' : '#265c42') : colour[ink]),
                  255,
                ];
          expect(pixel(data, 32, frame * 16 + i, j)).toStrictEqual(expected);
        }
      }
    }
    const span = Array.from({ length: 16 }, (_, n) => n);
    const columns = span.filter((i) => span.some((j) => vacuumInk(i, j) !== null));
    const rows = span.filter((j) => span.some((i) => vacuumInk(i, j) !== null));
    expect([columns[0], columns.at(-1), rows[0], rows.at(-1)]).toStrictEqual([2, 13, 4, 15]);
    expect([7, 8].flatMap((i) => [8, 9].map((j) => vacuumInk(i, j)))).toStrictEqual([
      'light',
      'light',
      'light',
      'light',
    ]);
  });

  it('drone.png is 32x16: a 6x4 body, a light, rotors as bars and as dots', () => {
    const png = read('drone.png');
    expect([png.width, png.height]).toStrictEqual([32, 16]);
    expect(encodeDronePng().equals(file('drone.png'))).toBe(true);
    const data = renderDrone();
    const colour = { body: '#5a6988', rotor: '#c0cbdc', light: '#e43b44' } as const;
    for (let frame = 0; frame < 2; frame += 1) {
      for (let j = 0; j < 16; j += 1) {
        for (let i = 0; i < 16; i += 1) {
          const ink = droneInk(frame, i, j);
          expect(pixel(data, 32, frame * 16 + i, j)).toStrictEqual(
            ink === null ? [0, 0, 0, 0] : [...rgb(colour[ink]), 255],
          );
        }
      }
    }
    const count = (frame: number, ink: string) =>
      Array.from({ length: 256 }, (_, n) => droneInk(frame, n % 16, Math.floor(n / 16))).filter(
        (found) => found === ink,
      ).length;
    expect([count(0, 'rotor'), count(1, 'rotor')]).toStrictEqual([20, 4]);
    expect(count(0, 'light')).toBe(2);
    expect(count(0, 'body')).toBe(6 * 4 - 2 + 4);
  });
});

describe('the placeholder shadow-wall generator (0014)', () => {
  const FILE = join(ROOT, 'public/sprites/shadow-wall.png');
  const WALL = renderShadowWall();
  /** The colour of pixel (x, y) of a frame, or null when it is transparent. */
  const pixel = (frame: number, x: number, y: number): string | null => {
    const o = (y * WALL_SHEET_WIDTH + frame * WALL_FRAME_SIZE + x) * 4;
    if (WALL[o + 3] === 0) {
      return null;
    }
    expect(WALL[o + 3]).toBe(255);
    return `#${[WALL[o], WALL[o + 1], WALL[o + 2]]
      .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
      .join('')}`;
  };
  const frameOf = (frame: number): (string | null)[] =>
    Array.from({ length: 256 }, (_, at) => pixel(frame, at % 16, Math.floor(at / 16)));

  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodeShadowWallPng().equals(encodeShadowWallPng())).toBe(true);
  });

  it('matches the committed file', () => {
    const committed = PNG.sync.read(readFileSync(FILE));
    expect([committed.width, committed.height]).toStrictEqual([256, 16]);
    expect(Buffer.from(WALL).equals(committed.data)).toBe(true);
  });

  it('is 256x16: sixteen 16x16 frames in one row, two orientations of eight looks', () => {
    expect([
      WALL_SHEET_WIDTH,
      WALL_SHEET_HEIGHT,
      WALL_FRAME_SIZE,
      WALL_STRIP,
      WALL_ORIENTATIONS,
      WALL_LOOKS,
    ]).toStrictEqual([256, 16, 16, 4, 2, 8]);
    expect(WALL).toHaveLength(256 * 16 * 4);
  });

  it('draws every look by its rule', () => {
    const violet = SHADOW_COLOUR;
    const rules: readonly ((i: number, j: number) => string | null)[] = [
      (i, j) => ((i + j) % 2 === 0 ? violet : null),
      (i, j) => ((i + j) % 2 === 1 ? violet : null),
      (i, j) => (i % 2 === 0 && j % 2 === 0 ? null : violet),
      (i, j) => (i % 2 === 1 && j % 2 === 1 ? null : violet),
      () => violet,
      (i, j) => ((i + j) % 4 === 0 ? '#181425' : violet),
      (i, j) => ((i + j) % 2 === 0 && i % 4 <= 1 ? violet : null),
      (i, j) => ((i + j) % 8 === 0 ? violet : null),
    ];
    rules.forEach((rule, look) => {
      for (let i = 0; i < 16; i += 1) {
        for (let j = 0; j < 4; j += 1) {
          expect(wallInk(look, i, j), `look ${look} (${i}, ${j})`).toBe(rule(i, j));
          expect(pixel(look, i, j), `horizontal look ${look} (${i}, ${j})`).toBe(rule(i, j));
          expect(pixel(8 + look, j, i), `vertical look ${look} (${i}, ${j})`).toBe(rule(i, j));
        }
      }
    });
  });

  it('has the pixel counts of the spec: a denser wall has more, a wall that gives way loses them', () => {
    for (const orientation of [0, 1]) {
      const frames = Array.from({ length: 8 }, (_, look) => frameOf(orientation * 8 + look));
      expect(frames.map((frame) => frame.filter((colour) => colour !== null).length)).toStrictEqual(
        [32, 32, 48, 48, 64, 64, 16, 8],
      );
      expect(
        frames.map((frame) => frame.filter((colour) => colour === SHADOW_COLOUR).length),
      ).toStrictEqual([32, 32, 48, 48, 64, 48, 16, 8]);
      expect(frames[5]?.filter((colour) => colour === WALL_DARK)).toHaveLength(16);
    }
  });

  it('keeps everything outside the strip transparent: rows 4–15 or columns 4–15', () => {
    for (let look = 0; look < 8; look += 1) {
      for (let a = 0; a < 16; a += 1) {
        for (let b = 4; b < 16; b += 1) {
          expect(pixel(look, a, b)).toBeNull();
          expect(pixel(8 + look, b, a)).toBeNull();
        }
      }
    }
  });

  it('rejects a look outside 0–7', () => {
    expect(() => wallInk(8, 0, 0)).toThrow('a shadow wall has looks 0 to 7, not 8');
  });
});
