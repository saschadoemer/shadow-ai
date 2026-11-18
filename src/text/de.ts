/**
 * German, the first language (vision.md §7): its keys are the keys of the table. A key is
 * `<kind>.<what>` in lower-case letters, digits and hyphens. A page of talk is one key; its
 * lines are joined by line breaks — the break is written here, the game computes none (0017).
 * Every string a player can read is here or in `en.ts` (INV-4).
 */
export const de = {
  'notice.shadow-too-dense': 'Dieser Schatten ist zu dicht für die Lampe.',
  'notice.language': 'Sprache: Deutsch',
  'notice.trace-found': 'Spur gefunden. Sie steht im Journal.',
  'notice.help': 'Hilfe: Taste H',
  'help.key-walk': 'Pfeiltasten, WASD',
  'help.do-walk': 'Gehen',
  'help.key-lamp': 'Leertaste',
  'help.do-lamp': 'Lampe halten',
  'help.key-talk': 'E, Enter',
  'help.do-talk': 'Sprechen, weiter',
  'help.key-journal': 'J',
  'help.do-journal': 'Journal',
  'help.key-language': 'L',
  'help.do-language': 'Sprache wechseln',
  'help.key-fullscreen': 'F',
  'help.do-fullscreen': 'Vollbild',
  'help.key-help': 'H',
  'help.do-help': 'Hilfe schließen',
  'journal.tab-creatures': 'Kreaturen',
  'journal.tab-cases': 'Fälle',
  'journal.tab-policy': 'Richtlinie',
  'journal.no-creatures': 'Noch keine Kreatur gefangen.',
  'journal.no-cases': 'Noch kein Fall aufgenommen.',
  'journal.no-policy': 'Die Richtlinie ist noch leer.',
  'journal.traces': 'Spuren:',
  'journal.of': 'von',
  'region.sales': 'Vertrieb',
  'creature.snippet-name': 'Schnipsel',
  'creature.snippet-text': [
    'Ein Stück Text, das jemand in einen',
    'öffentlichen Chatbot kopiert hat. Es lebt von',
    'allem, was dort eingefügt wird – und geht,',
    'sobald klar ist, welche Daten wohin dürfen.',
  ].join('\n'),
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
  'talk.officer-meeting-2': [
    'Nimm die Lampe: Sie hält fest, was sich darin',
    'regt – nicht um es zu vertreiben, sondern um',
    'es zu verstehen.',
  ].join('\n'),
  'story.call-1': [
    'Montagmorgen. Das Telefon – ein Kunde:',
    '„Sätze aus unserem vertraulichen Angebot stehen',
    'in der Antwort eines öffentlichen Chatbots.“',
  ].join('\n'),
  'story.call-2': [
    'Die Geschäftsführung fängt dich am Empfang ab:',
    '„Das Angebot kam aus dem Vertrieb. Finde',
    'heraus, wie das passieren konnte.“',
  ].join('\n'),
  'story.call-3': [
    'Über den Türen im Flur liegt etwas, das',
    'vorher nicht da war. Nebenan, bei der',
    'Datenschutzbeauftragten, brennt Licht.',
  ].join('\n'),
  'notice.lamp': 'Die Lampe: Leertaste halten.',
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
  'talk.sales-source-1': [
    'Das ist von meinem Bildschirm, ich weiß.',
    'Ich habe die Angebote in einen Chatbot kopiert,',
    'damit sie besser klingen – drei bis zum Abend.',
  ].join('\n'),
  'talk.sales-source-2': ['Wohin der Text damit geht, habe ich mir nicht', 'überlegt.'].join('\n'),
  'talk.sales-after': [
    'Danke, dass du gefragt hast statt zu schimpfen.',
    'Sag mir einfach, womit ich es beim nächsten Mal',
    'machen darf.',
  ].join('\n'),
  'case.sales-outcome': 'Gelöst: Angebote gingen in einen Chatbot.',
  'policy.sales': [
    'Jeder Text hat eine Stufe: offen, intern oder',
    'vertraulich. Vertrauliches bleibt in den',
    'Werkzeugen, die wir freigegeben haben. Und wer',
    'unsicher ist, fragt – ohne Ärger.',
  ].join('\n'),
  'notice.case-solved': 'Der Fall ist gelöst. Sieh ins Journal.',
  'talk.sales-everyday': [
    'Drei Angebote bis heute Abend, und jedes soll',
    'klingen, als hätte ich eine Woche Zeit gehabt.',
    'Erst mal Kaffee.',
  ].join('\n'),
} as const;
