import { describe, expect, it } from 'vitest';
import type { PaletteColour } from '../../src/render/palette';
import type { Renderer } from '../../src/render/renderer';
import { drawTestPattern, squareX } from '../../src/render/test-pattern';

type Call =
  | { readonly kind: 'clear'; readonly colour: PaletteColour }
  | {
      readonly kind: 'fillRect';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly colour: PaletteColour;
    };

/** A renderer that only records what it was asked to draw. */
function recordingRenderer(): Renderer & { readonly calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    clear(colour) {
      calls.push({ kind: 'clear', colour });
    },
    fillRect(x, y, width, height, colour) {
      calls.push({ kind: 'fillRect', x, y, width, height, colour });
    },
  };
}

function draw(tick: number): Call[] {
  const renderer = recordingRenderer();
  drawTestPattern(renderer, { tick });
  return renderer.calls;
}

type FillRect = Extract<Call, { readonly kind: 'fillRect' }>;

function rects(calls: readonly Call[], colour: PaletteColour): FillRect[] {
  return calls.filter(
    (call): call is FillRect => call.kind === 'fillRect' && call.colour === colour,
  );
}

const DARK = '#262b44';
const LIGHT = '#3a4466';
const BORDER = '#c0cbdc';
const SQUARE = '#feae34';

describe('the test pattern', () => {
  it('puts the square at x = tick % 320', () => {
    expect(squareX(0)).toBe(0);
    expect(squareX(319)).toBe(319);
    expect(squareX(320)).toBe(0);
  });

  it('draws the checkerboard, then the square, then the border', () => {
    const calls = draw(100);
    const colours = calls.map((call) => call.colour);
    expect(calls[0]).toStrictEqual({ kind: 'clear', colour: DARK });
    const lastLight = colours.lastIndexOf(LIGHT);
    const square = colours.indexOf(SQUARE);
    const firstBorder = colours.indexOf(BORDER);
    expect(lastLight).toBeLessThan(square);
    expect(square).toBeLessThan(firstBorder);
    expect(colours.slice(firstBorder)).toStrictEqual([BORDER, BORDER, BORDER, BORDER]);
  });

  it('draws one 16x16 square on row y = 82', () => {
    expect(rects(draw(100), SQUARE)).toStrictEqual([
      { kind: 'fillRect', x: 100, y: 82, width: 16, height: 16, colour: SQUARE },
    ]);
  });

  it('leaves clipping at the right edge to the surface', () => {
    expect(rects(draw(310), SQUARE)).toStrictEqual([
      { kind: 'fillRect', x: 310, y: 82, width: 16, height: 16, colour: SQUARE },
    ]);
  });

  it('lays a 16-px checkerboard over the dark ground, dark in the top-left corner', () => {
    const light = rects(draw(0), LIGHT);
    // 20 columns by 12 rows, every second tile light.
    expect(light).toHaveLength(120);
    const at = (x: number, y: number) => light.some((call) => call.x === x && call.y === y);
    expect(at(0, 0)).toBe(false);
    expect(at(16, 0)).toBe(true);
    expect(at(0, 16)).toBe(true);
    expect(at(16, 16)).toBe(false);
  });

  it('makes the bottom checkerboard row a 4-px strip, because 180 = 11 × 16 + 4', () => {
    const bottom = rects(draw(0), LIGHT).filter((call) => call.y === 176);
    expect(bottom).toHaveLength(10);
    for (const call of bottom) {
      expect(call).toMatchObject({ width: 16, height: 4 });
    }
    const above = rects(draw(0), LIGHT).filter((call) => call.y < 176);
    for (const call of above) {
      expect(call).toMatchObject({ width: 16, height: 16 });
    }
  });

  it('frames the surface with a 1-px border on all four sides', () => {
    const border = rects(draw(0), BORDER).map((call) =>
      [call.x, call.y, call.width, call.height].join(),
    );
    expect(new Set(border)).toStrictEqual(
      new Set(['0,0,320,1', '0,179,320,1', '0,0,1,180', '319,0,1,180']),
    );
  });

  it('draws on whole game pixels only', () => {
    for (const call of draw(1234)) {
      if (call.kind === 'fillRect') {
        for (const value of [call.x, call.y, call.width, call.height]) {
          expect(Number.isInteger(value)).toBe(true);
        }
      }
    }
  });
});
