import type { de } from './de';

/** English, the second language: exactly the keys of `de`, or it does not compile. */
export const en: Readonly<Record<keyof typeof de, string>> = {
  'notice.shadow-too-dense': 'This shadow is too dense for the lamp.',
  'talk.officer-rules-1': [
    'So you can see the shadow too.',
    'It stays behind wherever data leaves the house',
    'and nobody is looking.',
  ].join('\n'),
  'talk.officer-rules-2': [
    'The lamp holds still whatever stirs in it –',
    'not to drive it away, but to understand it.',
  ].join('\n'),
};
