/**
 * German, the first language (vision.md §7): its keys are the keys of the table. A key is
 * `<kind>.<what>` in lower-case letters, digits and hyphens. A page of talk is one key; its
 * lines are joined by line breaks — the break is written here, the game computes none (0017).
 * Every string a player can read is here or in `en.ts` (INV-4).
 */
export const de = {
  'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
  'notice.language': 'Sprache: Deutsch',
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
  'talk.reception-everyday': [
    'Morgen! Heute haben schon drei Leute gefragt,',
    'ob wir endlich ein WLAN für Gäste haben.',
    'Ich sage dann immer: Frag die IT. Also dich.',
  ].join('\n'),
  'talk.marketing-everyday': [
    'Der Drucker druckt seit Montag alles doppelt.',
    'Angeblich hat ihn jemand „optimiert“.',
    'Ich hole trotzdem jedes Blatt einzeln ab.',
  ].join('\n'),
  'talk.support-everyday': [
    'Vierzig Tickets vor dem ersten Kaffee.',
    'Die Hälfte davon in Sprachen, die hier',
    'keiner spricht. Irgendwie geht es immer.',
  ].join('\n'),
  'talk.sales-everyday': [
    'Drei Angebote bis heute Abend, und jedes soll',
    'klingen, als hätte ich eine Woche Zeit gehabt.',
    'Erst mal Kaffee.',
  ].join('\n'),
} as const;
