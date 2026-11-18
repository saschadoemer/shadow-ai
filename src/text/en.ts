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
  'talk.reception-everyday': [
    'Morning! Three people have asked already',
    'whether we finally have a network for guests.',
    'I always say: ask IT. So – you.',
  ].join('\n'),
  'talk.marketing-everyday': [
    'The printer has printed everything twice',
    'since Monday. They say someone “optimised” it.',
    'I still pick up every single sheet.',
  ].join('\n'),
  'talk.support-everyday': [
    'Forty tickets before the first coffee.',
    'Half of them in languages nobody here',
    'speaks. Somehow it always works out.',
  ].join('\n'),
  'talk.sales-everyday': [
    'Three offers by tonight, and each one should',
    'sound as if I had had a week for it.',
    'Coffee first.',
  ].join('\n'),
};
