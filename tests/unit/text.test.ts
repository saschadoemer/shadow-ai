import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  nextLanguage,
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

  it('goes from each language to the next, and from the last to the first (0019)', () => {
    expect(nextLanguage('de')).toBe('en');
    expect(nextLanguage('en')).toBe('de');
    expect(LANGUAGES.map(nextLanguage)).toStrictEqual(['en', 'de']);
  });

  it('names the language that is on, in that language (0019)', () => {
    const key = textKey('notice.language');
    expect(textOf(key, 'de')).toBe('Sprache: Deutsch');
    expect(textOf(key, 'en')).toBe('Language: English');
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

  it('holds the four sayings of the colleagues in both languages (0018)', () => {
    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
      textOf(textKey(id), language).split('\n');
    expect(lines('talk.reception-everyday', 'de')).toStrictEqual([
      'Morgen! Heute haben schon drei Leute gefragt,',
      'ob wir endlich ein WLAN für Gäste haben.',
      'Ich sage dann immer: Frag die IT. Also dich.',
    ]);
    expect(lines('talk.reception-everyday', 'en')).toStrictEqual([
      'Morning! Three people have asked already',
      'whether we finally have a network for guests.',
      'I always say: ask IT. So – you.',
    ]);
    expect(lines('talk.marketing-everyday', 'de')).toStrictEqual([
      'Der Drucker druckt seit Montag alles doppelt.',
      'Angeblich hat ihn jemand „optimiert“.',
      'Ich hole trotzdem jedes Blatt einzeln ab.',
    ]);
    expect(lines('talk.marketing-everyday', 'en')).toStrictEqual([
      'The printer has printed everything twice',
      'since Monday. They say someone “optimised” it.',
      'I still pick up every single sheet.',
    ]);
    expect(lines('talk.support-everyday', 'de')).toStrictEqual([
      'Vierzig Tickets vor dem ersten Kaffee.',
      'Die Hälfte davon in Sprachen, die hier',
      'keiner spricht. Irgendwie geht es immer.',
    ]);
    expect(lines('talk.support-everyday', 'en')).toStrictEqual([
      'Forty tickets before the first coffee.',
      'Half of them in languages nobody here',
      'speaks. Somehow it always works out.',
    ]);
    expect(lines('talk.sales-everyday', 'de')).toStrictEqual([
      'Drei Angebote bis heute Abend, und jedes soll',
      'klingen, als hätte ich eine Woche Zeit gehabt.',
      'Erst mal Kaffee.',
    ]);
    expect(lines('talk.sales-everyday', 'en')).toStrictEqual([
      'Three offers by tonight, and each one should',
      'sound as if I had had a week for it.',
      'Coffee first.',
    ]);
  });

  it('holds the words of the journal in both languages (0020)', () => {
    const both = (id: Parameters<typeof textKey>[0]): string[] => [
      textOf(textKey(id), 'de'),
      textOf(textKey(id), 'en'),
    ];
    expect(both('journal.tab-creatures')).toStrictEqual(['Kreaturen', 'Creatures']);
    expect(both('journal.tab-cases')).toStrictEqual(['Fälle', 'Cases']);
    expect(both('journal.tab-policy')).toStrictEqual(['Richtlinie', 'Policy']);
    expect(both('journal.no-creatures')).toStrictEqual([
      'Noch keine Kreatur gefangen.',
      'No creature captured yet.',
    ]);
    expect(both('journal.no-cases')).toStrictEqual([
      'Noch kein Fall aufgenommen.',
      'No case opened yet.',
    ]);
    expect(both('journal.no-policy')).toStrictEqual([
      'Die Richtlinie ist noch leer.',
      'The policy is still empty.',
    ]);
    expect(both('creature.snippet-name')).toStrictEqual(['Schnipsel', 'Snippet']);
    expect(textOf(textKey('creature.snippet-text'), 'de').split('\n')).toStrictEqual([
      'Ein Stück Text, das jemand in einen',
      'öffentlichen Chatbot kopiert hat. Es lebt von',
      'allem, was dort eingefügt wird – und geht,',
      'sobald klar ist, welche Daten wohin dürfen.',
    ]);
    expect(textOf(textKey('creature.snippet-text'), 'en').split('\n')).toStrictEqual([
      'A piece of text somebody pasted into a public',
      'chatbot. It lives on whatever is pasted',
      'there – and it goes as soon as everyone knows',
      'which data may go where.',
    ]);
  });

  it('holds the words of the traces in both languages (0022)', () => {
    const both = (id: Parameters<typeof textKey>[0]): string[] => [
      textOf(textKey(id), 'de'),
      textOf(textKey(id), 'en'),
    ];
    expect(both('region.sales')).toStrictEqual(['Vertrieb', 'Sales']);
    expect(both('journal.traces')).toStrictEqual(['Spuren:', 'Traces:']);
    expect(both('journal.of')).toStrictEqual(['von', 'of']);
    expect(both('notice.trace-found')).toStrictEqual([
      'Spur gefunden. Sie steht im Journal.',
      'Trace found. It is in the journal.',
    ]);
  });

  it('holds the words of the case of Sales in both languages (0024)', () => {
    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
      textOf(textKey(id), language).split('\n');
    expect(lines('talk.sales-source-1', 'de')).toStrictEqual([
      'Das ist von meinem Bildschirm, ich weiß.',
      'Ich habe die Angebote in einen Chatbot kopiert,',
      'damit sie besser klingen – drei bis zum Abend.',
    ]);
    expect(lines('talk.sales-source-1', 'en')).toStrictEqual([
      'That is from my screen, I know.',
      'I pasted the offers into a chatbot to make',
      'them sound better – three due by tonight.',
    ]);
    expect(lines('talk.sales-source-2', 'de')).toStrictEqual([
      'Wohin der Text damit geht, habe ich mir nicht',
      'überlegt.',
    ]);
    expect(lines('talk.sales-source-2', 'en')).toStrictEqual([
      'Where the text goes from there, I never',
      'thought about.',
    ]);
    expect(lines('talk.sales-after', 'de')).toStrictEqual([
      'Danke, dass du gefragt hast statt zu schimpfen.',
      'Sag mir einfach, womit ich es beim nächsten Mal',
      'machen darf.',
    ]);
    expect(lines('talk.sales-after', 'en')).toStrictEqual([
      'Thanks for asking instead of telling me off.',
      'Just tell me what I may use for it',
      'next time.',
    ]);
    expect(lines('case.sales-outcome', 'de')).toStrictEqual([
      'Gelöst: Angebote gingen in einen Chatbot.',
    ]);
    expect(lines('case.sales-outcome', 'en')).toStrictEqual([
      'Solved: offers went into a chatbot.',
    ]);
    expect(lines('policy.sales', 'de')).toStrictEqual([
      'Jeder Text hat eine Stufe: offen, intern oder',
      'vertraulich. Vertrauliches bleibt in den',
      'Werkzeugen, die wir freigegeben haben. Und wer',
      'unsicher ist, fragt – ohne Ärger.',
    ]);
    expect(lines('policy.sales', 'en')).toStrictEqual([
      'Every text has a level: open, internal or',
      'confidential. Confidential text stays in tools',
      'we have approved. And whoever is unsure',
      'asks – without trouble.',
    ]);
    expect(lines('notice.case-solved', 'de')).toStrictEqual([
      'Der Fall ist gelöst. Sieh ins Journal.',
    ]);
    expect(lines('notice.case-solved', 'en')).toStrictEqual([
      'The case is solved. See the journal.',
    ]);
  });

  it('holds the words of the case of Marketing in both languages (0028)', () => {
    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
      textOf(textKey(id), language).split('\n');
    expect(lines('region.marketing', 'de')).toStrictEqual(['Marketing']);
    expect(lines('region.marketing', 'en')).toStrictEqual(['Marketing']);
    expect(lines('talk.marketing-source-1', 'de')).toStrictEqual([
      'Die Motive macht ein Bildgenerator – in zehn',
      'Minuten statt in zwei Tagen, und die Agentur',
      'haben wir uns gespart.',
    ]);
    expect(lines('talk.marketing-source-1', 'en')).toStrictEqual([
      'An image generator makes the visuals – in ten',
      'minutes instead of two days, and we saved',
      'the agency.',
    ]);
    expect(lines('talk.marketing-source-2', 'de')).toStrictEqual([
      'Dass fremde Logos und Gesichter darin stecken,',
      'habe ich erst auf dem Plakat gesehen.',
      'Geprüft hat das vor dem Druck niemand.',
    ]);
    expect(lines('talk.marketing-source-2', 'en')).toStrictEqual([
      'That other logos and faces are in them,',
      'I only saw on the poster.',
      'Nobody checked it before it went to print.',
    ]);
    expect(lines('talk.marketing-after', 'de')).toStrictEqual([
      'Danke. Ab jetzt schaut jemand drauf, bevor',
      'etwas rausgeht – und sei es nur jemand vom',
      'Nachbartisch.',
    ]);
    expect(lines('talk.marketing-after', 'en')).toStrictEqual([
      'Thanks. From now on somebody looks at it',
      'before it goes out – even if it is only',
      'somebody at the next desk.',
    ]);
    expect(lines('case.marketing-outcome', 'de')).toStrictEqual([
      'Gelöst: Bilder gingen ungeprüft raus.',
    ]);
    expect(lines('case.marketing-outcome', 'en')).toStrictEqual([
      'Solved: images went out unchecked.',
    ]);
    expect(lines('policy.marketing', 'de')).toStrictEqual([
      'Was eine Maschine erzeugt hat, sieht sich',
      'ein Mensch an, bevor es das Haus verlässt.',
      'Bild oder Text – lieber einmal zu viel.',
    ]);
    expect(lines('policy.marketing', 'en')).toStrictEqual([
      'What a machine has made, a person looks at',
      'before it leaves the house.',
      'Image or text – rather once too often.',
    ]);
  });

  it('holds the eight pages of the intern in both languages (0033)', () => {
    const first = (id: Parameters<typeof textKey>[0]): string[] => [
      textOf(textKey(id), 'de').split('\n')[0] ?? '',
      textOf(textKey(id), 'en').split('\n')[0] ?? '',
    ];
    expect(first('talk.intern-lamp')).toStrictEqual([
      'Du willst in den Vertrieb? Geh erst nach',
      'Off to Sales? Go next door first, to the data',
    ]);
    expect(first('talk.intern-sales-start')).toStrictEqual([
      'Vertrieb? Am Ende des Flurs nach Osten.',
      'Sales? At the end of the corridor to the east.',
    ]);
    expect(first('talk.intern-sales-traces')).toStrictEqual([
      'Im Vertrieb stehen sechzehn Bildschirme, und',
      'Sales has sixteen screens, and you have not',
    ]);
    expect(first('talk.intern-sales-source')).toStrictEqual([
      'Du weißt doch längst, wer es war. Rosa Hemd,',
      'You know who it was by now. Pink shirt,',
    ]);
    expect(first('talk.intern-marketing-start')).toStrictEqual([
      'Als Nächstes? Marketing, unten links am',
      'Next? Marketing, down at the left of the',
    ]);
    expect(first('talk.intern-marketing-traces')).toStrictEqual([
      'Im Marketing sind es die Bildschirme auf den',
      'In Marketing it is the screens on the desk',
    ]);
    expect(first('talk.intern-marketing-source')).toStrictEqual([
      'Rotes Hemd, pendelt zwischen den Tischinseln',
      'Red shirt, goes back and forth between the',
    ]);
    expect(first('talk.intern-done')).toStrictEqual([
      'Mehr weiß ich gerade auch nicht. Am Nordflur',
      'That is all I know for now. Off the north',
    ]);
    expect(textOf(textKey('talk.intern-done'), 'de').split('\n')).toStrictEqual([
      'Mehr weiß ich gerade auch nicht. Am Nordflur',
      'kommst du jetzt in HR und Buchhaltung rein –',
      'was da los ist, erzählst du mir.',
    ]);
    // Eight keys, each one page of three lines.
    const ids = Object.keys(TABLE.de).filter((id) => id.startsWith('talk.intern-'));
    expect(ids).toHaveLength(8);
    for (const language of LANGUAGES) {
      for (const id of ids) {
        expect(TABLE[language][id as TextId].split('\n'), `${language} ${id}`).toHaveLength(3);
      }
    }
  });

  it('holds the words of the mirage in both languages (0032)', () => {
    expect(textOf(textKey('creature.mirage-name'), 'de')).toBe('Trugbild');
    expect(textOf(textKey('creature.mirage-name'), 'en')).toBe('Mirage');
    expect(textOf(textKey('creature.mirage-text'), 'de').split('\n')).toStrictEqual([
      'Ein Bild, das eine Maschine erzeugt hat und das',
      'keiner geprüft hat. Es bewegt sich nur, solange',
      'niemand hinsieht – und geht, sobald jemand',
      'draufschaut, bevor es das Haus verlässt.',
    ]);
    expect(textOf(textKey('creature.mirage-text'), 'en').split('\n')).toStrictEqual([
      'A picture a machine made and nobody checked.',
      'It only moves while nobody is looking – and it',
      'goes as soon as somebody looks at it before',
      'it leaves the house.',
    ]);
  });

  it('holds the line of the wider cone in both languages (0029)', () => {
    expect(textOf(textKey('notice.upgrade-wide-cone'), 'de')).toBe(
      'Die Lampe leuchtet jetzt breiter und stärker.',
    );
    expect(textOf(textKey('notice.upgrade-wide-cone'), 'en')).toBe(
      'The lamp now shines wider and stronger.',
    );
  });

  it('holds every text of the journal to the rule of its kind (0020, 0022, 0024)', () => {
    /** The most lines and the most characters per line a key may have, by what its id starts or ends with. */
    const rules: readonly (readonly [(id: string) => boolean, number, number, number])[] = [
      [(id) => id.startsWith('journal.tab-'), 1, 1, 16],
      [(id) => id.startsWith('journal.no-'), 1, 1, 47],
      [(id) => id === 'journal.traces' || id === 'journal.of', 1, 1, 16],
      [(id) => id.startsWith('region.'), 1, 1, 24],
      [(id) => id.startsWith('case.') && id.endsWith('-outcome'), 1, 1, 47],
      [(id) => id.startsWith('policy.'), 2, 4, 47],
      [(id) => id.startsWith('creature.') && id.endsWith('-name'), 1, 1, 24],
      [(id) => id.startsWith('creature.') && id.endsWith('-text'), 2, 4, 47],
    ];
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (
          !['journal.', 'creature.', 'region.', 'case.', 'policy.'].some((kind) =>
            key.startsWith(kind),
          )
        ) {
          continue;
        }
        const rule = rules.find(([applies]) => applies(key));
        expect(rule, `${key} has a rule`).toBeDefined();
        const [, fewest, most, width] = rule ?? [null, 0, 0, 0];
        const lines = text.split('\n');
        expect(lines.length, `${language} ${key}`).toBeGreaterThanOrEqual(fewest);
        expect(lines.length, `${language} ${key}`).toBeLessThanOrEqual(most);
        for (const line of lines) {
          expect(line.length, `${language} ${key}: "${line}"`).toBeLessThanOrEqual(width);
          expect(line.trim(), `${language} ${key}`).not.toBe('');
        }
      }
    }
  });

  it('holds the words of the help in both languages (0021)', () => {
    const both = (id: Parameters<typeof textKey>[0]): string[] => [
      textOf(textKey(id), 'de'),
      textOf(textKey(id), 'en'),
    ];
    expect(both('help.key-walk')).toStrictEqual(['Pfeiltasten, WASD', 'Arrow keys, WASD']);
    expect(both('help.do-walk')).toStrictEqual(['Gehen', 'Walk']);
    expect(both('help.key-lamp')).toStrictEqual(['Leertaste', 'Space']);
    expect(both('help.do-lamp')).toStrictEqual(['Lampe halten', 'Hold the lamp']);
    expect(both('help.key-talk')).toStrictEqual(['E, Enter', 'E, Enter']);
    expect(both('help.do-talk')).toStrictEqual(['Sprechen, weiter', 'Talk, next page']);
    expect(both('help.key-journal')).toStrictEqual(['J', 'J']);
    expect(both('help.do-journal')).toStrictEqual(['Journal', 'Journal']);
    expect(both('help.key-language')).toStrictEqual(['L', 'L']);
    expect(both('help.do-language')).toStrictEqual(['Sprache wechseln', 'Switch language']);
    expect(both('help.key-fullscreen')).toStrictEqual(['F', 'F']);
    expect(both('help.do-fullscreen')).toStrictEqual(['Vollbild', 'Fullscreen']);
    expect(both('help.key-help')).toStrictEqual(['H', 'H']);
    expect(both('help.do-help')).toStrictEqual(['Hilfe schließen', 'Close help']);
  });

  it('holds the words of the help label in both languages (0031)', () => {
    expect(textOf(textKey('help.label'), 'de')).toBe('H Hilfe');
    expect(textOf(textKey('help.label'), 'en')).toBe('H Help');
  });

  it('holds every text of the help to the rule of its kind (0021, 0031)', () => {
    /** The most characters a key of the help may have, by what its id starts with. */
    const rules: readonly (readonly [string, number])[] = [
      ['help.key-', 17],
      ['help.do-', 16],
      ['help.label', 8],
    ];
    const ids = Object.keys(TABLE.de).filter((key) => key.startsWith('help.'));
    expect(ids).toHaveLength(15);
    for (const language of LANGUAGES) {
      for (const id of ids) {
        const rule = rules.find(([start]) => id.startsWith(start));
        expect(rule, `${id} has a rule`).toBeDefined();
        const text = TABLE[language][id as TextId];
        expect(text.includes('\n'), `${language} ${id}`).toBe(false);
        expect(text.length, `${language} ${id}: "${text}"`).toBeLessThanOrEqual(rule?.[1] ?? 0);
      }
    }
  });

  it('holds the words of a coffee in both languages (0027)', () => {
    const both = (id: Parameters<typeof textKey>[0]): string[] => [
      textOf(textKey(id), 'de'),
      textOf(textKey(id), 'en'),
    ];
    expect(both('notice.rest')).toStrictEqual([
      'Kaffee. Der Überblick ist wieder da.',
      'Coffee. Your overview is back.',
    ]);
    expect(both('notice.rest-full')).toStrictEqual([
      'Kaffee. Den Überblick hast du schon.',
      'Coffee. You have your overview already.',
    ]);
    expect(both('notice.rest-shadow')).toStrictEqual([
      'Dieser Kaffee schmeckt nach nichts.',
      'This coffee tastes of nothing.',
    ]);
  });

  it('holds the words of the call, the first meeting and the lamp in both languages (0026)', () => {
    const lines = (id: Parameters<typeof textKey>[0], language: 'de' | 'en'): string[] =>
      textOf(textKey(id), language).split('\n');
    expect(lines('story.call-1', 'de')).toStrictEqual([
      'Montagmorgen. Das Telefon – ein Kunde:',
      '„Sätze aus unserem vertraulichen Angebot stehen',
      'in der Antwort eines öffentlichen Chatbots.“',
    ]);
    expect(lines('story.call-1', 'en')).toStrictEqual([
      'Monday morning. The phone – a customer:',
      '“Sentences from our confidential offer are in',
      'the answer of a public chatbot.”',
    ]);
    expect(lines('story.call-2', 'de')).toStrictEqual([
      'Die Geschäftsführung fängt dich am Empfang ab:',
      '„Das Angebot kam aus dem Vertrieb. Finde',
      'heraus, wie das passieren konnte.“',
    ]);
    expect(lines('story.call-2', 'en')).toStrictEqual([
      'The managing director stops you at reception:',
      '“The offer came from Sales. Find out how',
      'that could happen.”',
    ]);
    expect(lines('story.call-3', 'de')).toStrictEqual([
      'Über den Türen im Flur liegt etwas, das',
      'vorher nicht da war. Nebenan, bei der',
      'Datenschutzbeauftragten, brennt Licht.',
    ]);
    expect(lines('story.call-3', 'en')).toStrictEqual([
      'Something lies over the doors in the corridor',
      'that was not there before. Next door, the',
      'data protection officer has her light on.',
    ]);
    expect(lines('talk.officer-meeting-2', 'de')).toStrictEqual([
      'Nimm die Lampe: Sie hält fest, was sich darin',
      'regt – nicht um es zu vertreiben, sondern um',
      'es zu verstehen.',
    ]);
    expect(lines('talk.officer-meeting-2', 'en')).toStrictEqual([
      'Take the lamp: it holds still whatever stirs',
      'in it – not to drive it away, but to',
      'understand it.',
    ]);
    expect(lines('notice.lamp', 'de')).toStrictEqual(['Die Lampe: Leertaste halten.']);
    expect(lines('notice.lamp', 'en')).toStrictEqual(['The lamp: hold Space.']);
  });

  it('gives a page of talk and of the story at most three lines of at most 47 characters, none empty', () => {
    const kinds = new Set<string>();
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (!key.startsWith('talk.') && !key.startsWith('story.')) {
          continue;
        }
        kinds.add(key.slice(0, key.indexOf('.')));
        const lines = text.split('\n');
        expect(lines.length, `${language} ${key}`).toBeLessThanOrEqual(3);
        for (const line of lines) {
          expect(line.length, `${language} ${key}: "${line}"`).toBeLessThanOrEqual(47);
          expect(line.trim(), `${language} ${key}`).not.toBe('');
        }
      }
    }
    expect([...kinds].sort()).toStrictEqual(['story', 'talk']);
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
