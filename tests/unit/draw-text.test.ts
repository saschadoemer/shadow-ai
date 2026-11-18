import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { drawNumber, drawText, LINE_PITCH } from '../../src/render/draw-text';
import type { Renderer, SpriteSheet } from '../../src/render/renderer';
import { type TextKey, textKey } from '../../src/text/text';

/**
 * The tables hold no character the font lacks (font.test.ts), and drawText takes a key only
 * (INV-4). To see what it draws for such a character, the test lets textOf return a string of
 * its choosing; every other test sees the real table.
 */
const replacement = vi.hoisted(() => ({ text: null as string | null }));
vi.mock('../../src/text/text', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/text/text')>();
  return {
    ...actual,
    textOf: (...args: Parameters<typeof actual.textOf>): string =>
      replacement.text ?? actual.textOf(...args),
  };
});
afterEach(() => {
  replacement.text = null;
});

const FONT: SpriteSheet = { image: {} as ImageBitmap, frameWidth: 6, frameHeight: 10 };
const KEY = textKey('notice.shadow-too-dense');

/** A renderer that records its sprite calls as `frame at x,y` and fails on anything else. */
function recorder(): { readonly renderer: Renderer; readonly calls: string[] } {
  const calls: string[] = [];
  const unexpected = (): never => {
    throw new Error('drawText draws sprites only');
  };
  return {
    calls,
    renderer: {
      clear: unexpected,
      fillRect: unexpected,
      drawTile: unexpected,
      drawSprite(sheet, frame, x, y) {
        expect(sheet).toBe(FONT);
        calls.push(`${frame} at ${x},${y}`);
      },
    },
  };
}

describe('drawText (0016)', () => {
  it('draws character n at (x + 6n, y) with the frame of its place in the glyph order', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'de', 31, 162);
    // "Dieser Schatten ist zu dicht für die Lampe.": D is 36, i 73, e 69, s 83, r 82.
    expect(calls.slice(0, 6)).toStrictEqual([
      '36 at 31,162',
      '73 at 37,162',
      '69 at 43,162',
      '83 at 49,162',
      '69 at 55,162',
      '82 at 61,162',
    ]);
  });

  it('draws nothing for a space; the space still takes its 6 pixels', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'de', 31, 162);
    expect(calls).toHaveLength(36);
    // After "Dieser" comes a space at n = 6; "S" is character 7.
    expect(calls[6]).toBe('51 at 73,162');
  });

  it('draws an umlaut from its own glyph: the ü of "für" is frame 100, character 30', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'de', 31, 162);
    expect(calls).toContain('100 at 211,162');
    expect(calls.at(-1)).toBe('14 at 283,162');
  });

  it('draws the string of the language it is given', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'en', 0, 0);
    expect(calls).toHaveLength(31);
    expect(calls[0]).toBe('52 at 0,0');
    expect(calls.at(-1)).toBe('14 at 222,0');
  });

  it('draws `?` for a character the font does not have', () => {
    replacement.text = 'a€b';
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, KEY, 'de', 10, 20);
    // a is 65, ? is 31, b is 66.
    expect(calls).toStrictEqual(['65 at 10,20', '31 at 16,20', '66 at 22,20']);
  });

  it('starts a new line 12 px lower at a line break, from x again (0017)', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, textKey('talk.officer-rules-1'), 'de', 12, 138);
    expect(LINE_PITCH).toBe(12);
    // 33, 43 and 36 characters with 5, 7 and 4 spaces: 28, 36 and 32 glyphs.
    expect(calls).toHaveLength(96);
    expect(calls[0]).toBe('36 at 12,138'); // D
    expect(calls[28]).toBe('37 at 12,150'); // E
    expect(calls[64]).toBe('40 at 12,162'); // H
    expect(calls.at(-1)).toBe('14 at 222,162'); // the full stop, character 35 of line 2
  });

  it('asks for a TextKey: a literal does not compile (INV-4)', () => {
    expectTypeOf(drawText).parameter(2).toEqualTypeOf<TextKey>();
    expectTypeOf<string>().not.toExtend<TextKey>();
  });
});

describe('drawNumber (0022)', () => {
  const drawn = (value: number, x = 64, y = 48): string[] => {
    const { renderer, calls } = recorder();
    drawNumber(renderer, FONT, value, x, y);
    return calls;
  };

  it('draws the decimal digits of a whole number from the left, 6 px apart', () => {
    // The digits 0 to 9 are the glyphs 16 to 25.
    expect(drawn(0)).toStrictEqual(['16 at 64,48']);
    expect(drawn(7)).toStrictEqual(['23 at 64,48']);
    expect(drawn(10)).toStrictEqual(['17 at 64,48', '16 at 70,48']);
    expect(drawn(123, 16, 36)).toStrictEqual(['17 at 16,36', '18 at 22,36', '19 at 28,36']);
  });

  it('takes a number and nothing else: no key, no string', () => {
    expectTypeOf(drawNumber).parameter(2).toEqualTypeOf<number>();
  });

  it('draws a number below 0 as 0 and a fraction as its whole part', () => {
    expect(drawn(-3)).toStrictEqual(['16 at 64,48']);
    expect(drawn(4.9)).toStrictEqual(['20 at 64,48']);
  });
});
