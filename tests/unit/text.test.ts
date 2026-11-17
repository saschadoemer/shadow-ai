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

  it('names every key `<kind>.<what>` in lower case', () => {
    for (const key of Object.keys(TABLE.de)) {
      expect(key).toMatch(/^[a-z]+\.[a-z]+(-[a-z]+)*$/);
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
