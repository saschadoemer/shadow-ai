import { describe, expect, it } from 'vitest';
import { NO_INPUT } from '../../src/game/player';
import { type GameState, NO_RECOIL } from '../../src/game/state';
import {
  drawHelp,
  HELP_DOES,
  HELP_DOES_CAPACITY,
  HELP_FIELD,
  HELP_FRAME,
  HELP_FRAME_COLOUR,
  HELP_KEY_CAPACITY,
  HELP_KEYS,
  HELP_ROW_PITCH,
  HELP_ROWS,
} from '../../src/render/draw-help';
import { JOURNAL_RULE } from '../../src/render/draw-journal';
import {
  DIALOGUE_BOX,
  drawScene,
  HEART_MARGIN,
  HEART_SIZE,
  type SceneContent,
  type SceneSettings,
} from '../../src/render/draw-scene';
import { GLYPH_HEIGHT, GLYPH_WIDTH } from '../../src/render/font';
import type { Renderer, SpriteSheet } from '../../src/render/renderer';
import { LANGUAGES, textKey, textOf } from '../../src/text/text';
import { grassMap } from './grass-map';

/** A renderer that only records what it was asked to draw, one line per call. */
function recordingRenderer(): Renderer & {
  readonly calls: string[];
  readonly sheets: SpriteSheet[];
} {
  const calls: string[] = [];
  const sheets: SpriteSheet[] = [];
  return {
    calls,
    sheets,
    clear(colour) {
      calls.push(`clear ${colour}`);
    },
    fillRect(x, y, width, height, colour) {
      calls.push(`fillRect ${x},${y} ${width}x${height} ${colour}`);
    },
    drawTile(_tileset, id, x, y) {
      calls.push(`drawTile ${id} at ${x},${y}`);
    },
    drawSprite(sheet, frame, x, y) {
      sheets.push(sheet);
      calls.push(`drawSprite ${frame} at ${x},${y}`);
    },
  };
}

const sheet = (frameWidth: number, frameHeight: number): SpriteSheet => ({
  image: {} as ImageBitmap,
  frameWidth,
  frameHeight,
});
/** Open floor with the officer at (160, 96), so that a dialogue has its speaker. */
const CONTENT: SceneContent = {
  map: grassMap(20, 12, { x: 184, y: 96 }, [{ name: 'figure:officer', x: 160, y: 96 }]),
  tileset: { image: {} as ImageBitmap, columns: 7 },
  shadowTileset: { image: {} as ImageBitmap, columns: 7 },
  veilSheet: sheet(16, 16),
  playerSheet: sheet(16, 24),
  lampSheet: sheet(48, 48),
  creatureSheets: { snippet: sheet(16, 16) },
  overviewSheet: sheet(8, 8),
  shadowWallSheet: sheet(16, 16),
  traceSheet: sheet(16, 16),
  moverSheets: {
    person: [0, 1, 2, 3].map(() => sheet(16, 24)),
    dog: sheet(16, 16),
    vacuum: sheet(16, 16),
    drone: sheet(16, 16),
  },
  fontSheet: sheet(6, 10),
  figureSheets: { officer: sheet(16, 24) },
};
const GERMAN: SceneSettings = { language: 'de', switchedAt: null };
const FRAME = 'fillRect 48,30 224x98 #3a4466';
const FIELD = 'fillRect 49,31 222x96 #181425';
const BAR = 'fillRect 8,158 304x18 #181425';
/** A game past the start hint with five hearts and the officer standing; the help as `fields` say. */
const playing = (fields: Partial<GameState> = {}): GameState => ({
  tick: 700,
  player: {
    x: 184,
    y: 96,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
    grace: 0,
    recoil: NO_RECOIL,
  },
  camera: { x: 0, y: 0 },
  lamp: { on: false, strength: 1 },
  creatures: [],
  movers: [],
  shadowWalls: [],
  traces: [],
  figures: [{ figure: 0, facing: 'down' }],
  dialogue: null,
  journal: null,
  help: false,
  held: NO_INPUT,
  captured: { snippet: 0 },
  overview: { current: 5, max: 5 },
  dark: 0,
  ...fields,
});
const help = (language: SceneSettings['language']): string[] => {
  const renderer = recordingRenderer();
  drawHelp(renderer, CONTENT.fontSheet, language);
  return renderer.calls;
};
const scene = (state: GameState, settings = GERMAN): string[] => {
  const renderer = recordingRenderer();
  drawScene(renderer, state, CONTENT, settings);
  return renderer.calls;
};

describe('the help on the surface (0021)', () => {
  it('places the frame, the field and the rows as the spec says', () => {
    expect(HELP_FRAME).toStrictEqual({ x: 48, y: 30, width: 224, height: 98 });
    expect(HELP_FRAME_COLOUR).toBe('#3a4466');
    expect(HELP_FIELD).toStrictEqual({ x: 49, y: 31, width: 222, height: 96 });
    expect([HELP_KEYS, HELP_DOES, HELP_ROW_PITCH]).toStrictEqual([
      { x: 56, y: 38 },
      { x: 170, y: 38 },
      12,
    ]);
    expect([HELP_KEY_CAPACITY, HELP_DOES_CAPACITY]).toStrictEqual([17, 16]);
    // A key of 17 characters ends at x = 158, 12 px left of the second column, which ends at 266.
    expect(HELP_KEYS.x + HELP_KEY_CAPACITY * GLYPH_WIDTH).toBe(158);
    expect(HELP_DOES.x - 158).toBe(12);
    expect(HELP_DOES.x + HELP_DOES_CAPACITY * GLYPH_WIDTH).toBe(266);
    expect(266).toBeLessThan(HELP_FIELD.x + HELP_FIELD.width);
    // The last row ends at y = 120: 7 px to the field's edge below, as above the first row.
    const bottom = HELP_KEYS.y + (HELP_ROWS.length - 1) * HELP_ROW_PITCH + GLYPH_HEIGHT;
    expect(bottom).toBe(120);
    expect(HELP_FIELD.y + HELP_FIELD.height - bottom).toBe(7);
    expect(HELP_KEYS.y - HELP_FIELD.y).toBe(7);
  });

  it('keeps clear of the hearts, of the tabs of the journal and of the dialogue box', () => {
    expect(HELP_FRAME.y).toBeGreaterThan(HEART_MARGIN + HEART_SIZE);
    expect(HELP_FRAME.y).toBeGreaterThan(JOURNAL_RULE.y + JOURNAL_RULE.height);
    expect(HELP_FRAME.y + HELP_FRAME.height).toBeLessThan(DIALOGUE_BOX.y);
  });

  it('lists the seven rows in the order of the spec', () => {
    expect(HELP_ROWS).toStrictEqual([
      { key: textKey('help.key-walk'), does: textKey('help.do-walk') },
      { key: textKey('help.key-lamp'), does: textKey('help.do-lamp') },
      { key: textKey('help.key-talk'), does: textKey('help.do-talk') },
      { key: textKey('help.key-journal'), does: textKey('help.do-journal') },
      { key: textKey('help.key-language'), does: textKey('help.do-language') },
      { key: textKey('help.key-fullscreen'), does: textKey('help.do-fullscreen') },
      { key: textKey('help.key-help'), does: textKey('help.do-help') },
    ]);
  });

  it('holds every row to its two columns, in both languages', () => {
    for (const language of LANGUAGES) {
      for (const row of HELP_ROWS) {
        expect(textOf(row.key, language).length, `${language} ${row.key}`).toBeLessThanOrEqual(
          HELP_KEY_CAPACITY,
        );
        expect(textOf(row.does, language).length, `${language} ${row.does}`).toBeLessThanOrEqual(
          HELP_DOES_CAPACITY,
        );
      }
    }
  });

  it('draws the frame, the field and the seven rows in German', () => {
    const calls = help('de');
    expect(calls[0]).toBe(FRAME);
    expect(calls[1]).toBe(FIELD);
    // The first glyph of every row's key and of what it does: `Pfeiltasten, WASD` – `Gehen`,
    // `Leertaste` – `Lampe halten`, `E, Enter` – `Sprechen, weiter`, `J` – `Journal`, `L` –
    // `Sprache wechseln`, `F` – `Vollbild`, `H` – `Hilfe schließen`.
    expect(calls[2]).toBe('drawSprite 48 at 56,38');
    expect(calls[18]).toBe('drawSprite 39 at 170,38');
    expect(calls[23]).toBe('drawSprite 44 at 56,50');
    expect(calls[32]).toBe('drawSprite 44 at 170,50');
    expect(calls[43]).toBe('drawSprite 37 at 56,62');
    expect(calls[50]).toBe('drawSprite 51 at 170,62');
    expect(calls[65]).toBe('drawSprite 42 at 56,74');
    expect(calls[66]).toBe('drawSprite 42 at 170,74');
    expect(calls[73]).toBe('drawSprite 44 at 56,86');
    expect(calls[74]).toBe('drawSprite 51 at 170,86');
    expect(calls[89]).toBe('drawSprite 38 at 56,98');
    expect(calls[90]).toBe('drawSprite 54 at 170,98');
    expect(calls[98]).toBe('drawSprite 40 at 56,110');
    expect(calls[99]).toBe('drawSprite 40 at 170,110');
    // 111 glyphs after the two rectangles; the last is the `n` of `schließen`.
    expect(calls).toHaveLength(2 + 111);
    expect(calls.at(-1)).toBe('drawSprite 78 at 254,110');
  });

  it('draws the rows in English', () => {
    const calls = help('en');
    expect(calls.slice(0, 2)).toStrictEqual([FRAME, FIELD]);
    // `Arrow keys, WASD` – `Walk`, … , `H` – `Close help`.
    expect(calls[2]).toBe('drawSprite 33 at 56,38');
    expect(calls[16]).toBe('drawSprite 55 at 170,38');
    expect(calls[20]).toBe('drawSprite 51 at 56,50');
    expect(calls[90]).toBe('drawSprite 40 at 56,110');
    expect(calls[91]).toBe('drawSprite 35 at 170,110');
    expect(calls).toHaveLength(2 + 98);
    expect(calls.at(-1)).toBe('drawSprite 80 at 224,110');
  });

  it('draws nothing but the two rectangles and glyphs', () => {
    const renderer = recordingRenderer();
    drawHelp(renderer, CONTENT.fontSheet, 'de');
    expect(renderer.calls.filter((call) => call.startsWith('fillRect'))).toHaveLength(2);
    expect(renderer.sheets).toHaveLength(111);
    expect(renderer.sheets.every((used) => used === CONTENT.fontSheet)).toBe(true);
  });
});

describe('the help in the scene (0021)', () => {
  it('lies over the world: everything the scene draws without it, then the help, and nothing after', () => {
    const without = scene(playing());
    expect(without).not.toContain(FRAME);
    expect(without.at(-1)).toBe('drawSprite 0 at 44,4');
    expect(scene(playing({ help: true }))).toStrictEqual([...without, ...help('de')]);
  });

  it('is drawn in the language of the settings', () => {
    const english = scene(playing({ help: true }), { language: 'en', switchedAt: null });
    expect(english.slice(-100)).toStrictEqual(help('en'));
  });

  it('shows no language line and no start hint while it is open', () => {
    for (const tick of [100, 219, 700, 819]) {
      for (const switchedAt of [100, 700, null]) {
        const calls = scene(playing({ help: true, tick }), { language: 'en', switchedAt });
        expect(calls, `tick ${tick}, switched at ${switchedAt}`).not.toContain(BAR);
      }
    }
    // Without the help the same frames have the bar: the hint, or the language line.
    expect(scene(playing({ tick: 100 }))).toContain(BAR);
    expect(scene(playing({ tick: 700 }), { language: 'en', switchedAt: 700 })).toContain(BAR);
  });

  it('leaves the notice of 0016 under it', () => {
    const holding = playing({
      help: true,
      lamp: { on: true, strength: 1 },
      shadowWalls: [{ wall: 0, lit: true, light: 0 }],
    });
    const calls = scene(holding);
    expect(calls.indexOf(BAR)).toBeGreaterThan(-1);
    expect(calls.indexOf(FRAME)).toBeGreaterThan(calls.indexOf(BAR));
    expect(calls.slice(-113)).toStrictEqual(help('de'));
  });

  it('lies over an open dialogue: the dialogue box and its page, then the help', () => {
    const talking = playing({ dialogue: { speaker: 'figure', index: 0, page: 0 } });
    const without = scene(talking);
    expect(without).toContain('fillRect 8,134 304x42 #181425');
    expect(scene({ ...talking, help: true })).toStrictEqual([...without, ...help('de')]);
  });

  it('lies over the journal: the journal, then the help', () => {
    const reading = playing({ journal: { tab: 'cases' } });
    const without = scene(reading);
    expect(without[0]).toBe('clear #181425');
    expect(without).toContain('fillRect 8,22 304x2 #3a4466');
    expect(scene({ ...reading, help: true })).toStrictEqual([...without, ...help('de')]);
  });
});
