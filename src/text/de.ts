/**
 * German, the first language (vision.md §7): its keys are the keys of the table. A key is
 * `<kind>.<what>` in lower-case letters, digits and hyphens. A page of talk is one key; its
 * lines are joined by line breaks — the break is written here, the game computes none (0017).
 * Every string a player can read is here or in `en.ts` (INV-4).
 */
export const de = {
  'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
  'talk.officer-rules-1': [
    'Du siehst den Schatten also auch.',
    'Er bleibt überall dort zurück, wo Daten das',
    'Haus verlassen und niemand hinsieht.',
  ].join('\n'),
  'talk.officer-rules-2': [
    'Mit der Lampe hältst du fest, was sich darin',
    'regt – nicht um es zu vertreiben, sondern um',
    'es zu verstehen.',
  ].join('\n'),
} as const;
