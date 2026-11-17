import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  TABLE,
  type TextId,
  type TextKey,
  textKey,
  textOf,
} from '../../src/text/text';

describe('the language table (INV-4, 0016)', () => {
  it('has German first and English second, and German is the default', () => {
    expect(LANGUAGES).toStrictEqual(['de', 'en']);
    expect(DEFAULT_LANGUAGE).toBe('de');
  });

  it('has the same keys in `de` and in `en`', () => {
    expect(Object.keys(TABLE.en).sort()).toStrictEqual(Object.keys(TABLE.de).sort());
  });

  it('names every key `<kind>.<what>` in lower-case letters, digits and hyphens', () => {
    for (const key of Object.keys(TABLE.de)) {
      expect(key).toMatch(/^[a-z]+\.[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('has no empty string', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        expect(text.trim(), `${language} ${key}`).not.toBe('');
      }
    }
  });

  it('holds the sentence of 0016 in both languages', () => {
    const key = textKey('notice.shadow-too-dense');
    expect(textOf(key, 'de')).toBe('Dieser Schatten ist zu dicht für die Lampe.');
    expect(textOf(key, 'en')).toBe('This shadow is too dense for the lamp.');
  });

  it('holds the two pages of the officer in both languages (0017)', () => {
    const first = textKey('talk.officer-rules-1');
    const second = textKey('talk.officer-rules-2');
    expect(textOf(first, 'de').split('\n')).toStrictEqual([
      'Du siehst den Schatten also auch.',
      'Er bleibt überall dort zurück, wo Daten das',
      'Haus verlassen und niemand hinsieht.',
    ]);
    expect(textOf(second, 'de').split('\n')).toStrictEqual([
      'Mit der Lampe hältst du fest, was sich darin',
      'regt – nicht um es zu vertreiben, sondern um',
      'es zu verstehen.',
    ]);
    expect(textOf(first, 'en').split('\n')).toStrictEqual([
      'So you can see the shadow too.',
      'It stays behind wherever data leaves the house',
      'and nobody is looking.',
    ]);
    expect(textOf(second, 'en').split('\n')).toStrictEqual([
      'The lamp holds still whatever stirs in it –',
      'not to drive it away, but to understand it.',
    ]);
  });

  it('gives a page of talk at most three lines of at most 47 characters, none empty', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (!key.startsWith('talk.')) {
          continue;
        }
        const lines = text.split('\n');
        expect(lines.length, `${language} ${key}`).toBeLessThanOrEqual(3);
        for (const line of lines) {
          expect(line.length, `${language} ${key}: "${line}"`).toBeLessThanOrEqual(47);
          expect(line.trim(), `${language} ${key}`).not.toBe('');
        }
      }
    }
  });

  it('keeps a notice on one line', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (key.startsWith('notice.')) {
          expect(text.includes('\n'), `${language} ${key}`).toBe(false);
        }
      }
    }
  });

  it('makes a key that is a plain string at run time, so a state that holds one stays plain data', () => {
    const key = textKey('notice.shadow-too-dense');
    expect(key).toBe('notice.shadow-too-dense');
    expect(JSON.parse(JSON.stringify({ key }))).toStrictEqual({ key });
  });
});

describe('TextKey (INV-4): a literal does not compile where a key is asked for', () => {
  it('is made by textKey from an id of the table and from nothing else', () => {
    expectTypeOf(textKey).parameter(0).toEqualTypeOf<TextId>();
    expectTypeOf(textKey).returns.toEqualTypeOf<TextKey>();
    expectTypeOf<string>().not.toExtend<TextId>();
  });

  it('is asked for by textOf, and neither a string nor an id is one', () => {
    expectTypeOf(textOf).parameter(0).toEqualTypeOf<TextKey>();
    expectTypeOf<string>().not.toExtend<TextKey>();
    expectTypeOf<TextId>().not.toExtend<TextKey>();
    expectTypeOf<'notice.shadow-too-dense'>().not.toExtend<TextKey>();
    expectTypeOf<TextKey>().toExtend<string>();
  });
});
