import { de } from './de';
import { en } from './en';

/**
 * The language table and its keys (architecture.md §8, INV-4). `game/` and `render/` pass a
 * `TextKey`; only `render/draw-text` turns one into characters. Pure data and pure functions.
 */

/** German first, English second (vision.md §7). */
export const LANGUAGES = ['de', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
/** The language the game shows until it can be switched (0019). */
export const DEFAULT_LANGUAGE: Language = 'de';

/** The ids of the table: the keys of `de`. */
export type TextId = keyof typeof de;

declare const brand: unique symbol;
/**
 * A key of the language table. A branded string: only `textKey` makes one, so a literal does
 * not compile where a key is asked for. At run time it is its id, a plain string.
 */
export type TextKey = TextId & { readonly [brand]: true };

export const TABLE: Readonly<Record<Language, Readonly<Record<TextId, string>>>> = { de, en };

/** The key of an id. A misspelt id does not compile. */
export function textKey(id: TextId): TextKey {
  return id as TextKey;
}

/** The string of a key in a language. */
export function textOf(key: TextKey, language: Language): string {
  // The brand is a type only; the key is its id. Indexing with the branded type does not compile.
  const id: TextId = key;
  return TABLE[language][id];
}
