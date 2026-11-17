import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { drawText } from '../../src/render/draw-text';
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

  it('asks for a TextKey: a literal does not compile (INV-4)', () => {
    expectTypeOf(drawText).parameter(2).toEqualTypeOf<TextKey>();
    expectTypeOf<string>().not.toExtend<TextKey>();
  });
});
