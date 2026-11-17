import type { de } from './de';

/** English, the second language: exactly the keys of `de`, or it does not compile. */
export const en: Readonly<Record<keyof typeof de, string>> = {
  'notice.shadow-too-dense': 'This shadow is too dense for the lamp.',
};
