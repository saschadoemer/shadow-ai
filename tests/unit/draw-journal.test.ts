import { describe, expect, it } from 'vitest';
import { NO_INPUT } from '../../src/game/player';
import { type GameState, type JournalTab, NO_RECOIL, type TraceState } from '../../src/game/state';
import {
  CASE_LINE,
  CASE_NAME,
  CASE_OUTCOME,
  CASE_PITCH,
  drawJournal,
  ENTRY_FRAME,
  ENTRY_LINES,
  ENTRY_NAME,
  ENTRY_PICTURE,
  ENTRY_PITCH,
  JOURNAL_RULE,
  NOTHING_TEXT,
  POLICY_BLOCK,
  POLICY_GAP,
  policyOrigins,
  TAB_CLOSED,
  TAB_OPEN,
  tabBox,
  tabTitleOrigin,
} from '../../src/render/draw-journal';
import {
  drawScene,
  FROZEN_FRAME,
  type SceneContent,
  type SceneSettings,
} from '../../src/render/draw-scene';
import type { Renderer, SpriteSheet } from '../../src/render/renderer';
import { textKey, textOf } from '../../src/text/text';
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
const CONTENT: SceneContent = {
  map: grassMap(20, 12, { x: 160, y: 96 }),
  tileset: { image: {} as ImageBitmap, columns: 7 },
  shadowTileset: { image: {} as ImageBitmap, columns: 7 },
  veilSheet: sheet(16, 16),
  playerSheet: sheet(16, 24),
  lampSheet: sheet(48, 48),
  lampWideSheet: sheet(72, 72),
  creatureSheets: {
    snippet: sheet(16, 16),
    // Its own image, so that the two sheets can be told apart.
    mirage: { ...sheet(16, 16), image: { mirage: true } as unknown as ImageBitmap },
  },
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
const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
/** A game with the journal open on `tab`: five hearts, the lamp on, `snippets` captured. */
const reading = (tab: JournalTab, snippets = 0): GameState => ({
  tick: 100,
  rested: null,
  finished: null,
  presented: 0,
  upgrades: [],
  player: {
    x: 160,
    y: 96,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
    grace: 0,
    recoil: NO_RECOIL,
  },
  camera: { x: 0, y: 0 },
  lamp: { on: true, strength: 1, used: true },
  creatures: [],
  movers: [],
  shadowWalls: [],
  traces: [],
  solved: [],
  figures: [],
  dialogue: null,
  journal: { tab },
  help: false,
  held: NO_INPUT,
  captured: { snippet: snippets, mirage: 0 },
  overview: { current: 5, max: 5 },
  dark: 0,
});
const draw = (state: GameState, settings = GERMAN) => {
  const renderer = recordingRenderer();
  if (state.journal !== null) {
    drawJournal(renderer, state, state.journal, CONTENT, settings);
  }
  return renderer;
};
const RULE = 'fillRect 8,22 304x2 #3a4466';

describe('the journal on the surface (0020)', () => {
  it('places the tabs, the rule and the content as the spec says', () => {
    expect([0, 1, 2].map(tabBox)).toStrictEqual([
      { x: 8, y: 6, width: 100, height: 16 },
      { x: 110, y: 6, width: 100, height: 16 },
      { x: 212, y: 6, width: 100, height: 16 },
    ]);
    expect([TAB_OPEN, TAB_CLOSED]).toStrictEqual(['#3a4466', '#262b44']);
    expect(JOURNAL_RULE).toStrictEqual({ x: 8, y: 22, width: 304, height: 2 });
    expect(NOTHING_TEXT).toStrictEqual({ x: 16, y: 36 });
    expect([ENTRY_PICTURE, ENTRY_NAME, ENTRY_LINES]).toStrictEqual([
      { x: 16, y: 32 },
      { x: 40, y: 35 },
      { x: 16, y: 54 },
    ]);
    expect(ENTRY_PITCH).toBe(72);
    // The creature as the light shows it.
    expect(ENTRY_FRAME).toBe(FROZEN_FRAME);
    // A second entry of four lines ends at y = 172, on the surface.
    expect(ENTRY_LINES.y + ENTRY_PITCH + 3 * 12 + 10).toBe(172);
  });

  it('centres a title of n characters in tab k: (58 + 102k − 3n, 9)', () => {
    expect(tabTitleOrigin(0, 9)).toStrictEqual({ x: 31, y: 9 });
    expect(tabTitleOrigin(1, 5)).toStrictEqual({ x: 145, y: 9 });
    expect(tabTitleOrigin(2, 10)).toStrictEqual({ x: 232, y: 9 });
    expect(tabTitleOrigin(2, 6)).toStrictEqual({ x: 244, y: 9 });
    expect(tabTitleOrigin(0, 16)).toStrictEqual({ x: 10, y: 9 });
  });

  it('draws the clear, the three tabs with their titles, the rule and the line for nothing', () => {
    const { calls, sheets } = draw(reading('creatures'));
    expect(calls[0]).toBe('clear #181425');
    expect(calls[1]).toBe('fillRect 8,6 100x16 #3a4466');
    // `Kreaturen`: nine glyphs, the first is `K`.
    expect(calls[2]).toBe('drawSprite 43 at 31,9');
    expect(calls[11]).toBe('fillRect 110,6 100x16 #262b44');
    // `Fälle`: five glyphs.
    expect(calls[12]).toBe('drawSprite 38 at 145,9');
    expect(calls[17]).toBe('fillRect 212,6 100x16 #262b44');
    // `Richtlinie`: ten glyphs.
    expect(calls[18]).toBe('drawSprite 50 at 232,9');
    expect(calls[28]).toBe(RULE);
    // `Noch keine Kreatur gefangen.`: 28 characters, 25 of them drawn.
    expect(calls[29]).toBe('drawSprite 46 at 16,36');
    expect(calls).toHaveLength(29 + 25);
    expect(calls.at(-1)).toBe('drawSprite 14 at 178,36');
    // Nothing of the world: no tile, and every sprite is a glyph.
    expect(calls.some((call) => call.startsWith('drawTile'))).toBe(false);
    expect(sheets.every((used) => used === CONTENT.fontSheet)).toBe(true);
  });

  it.each<readonly [JournalTab, number, string]>([
    ['creatures', 0, 'drawSprite 46 at 16,36'],
    ['cases', 1, 'drawSprite 46 at 16,36'],
    ['policy', 2, 'drawSprite 36 at 16,36'],
  ])('lights the tab %s and shows its line for nothing', (tab, open, first) => {
    const { calls } = draw(reading(tab));
    const tabs = calls.filter((call) => call.startsWith('fillRect') && call.includes(' 100x16 '));
    expect(tabs).toStrictEqual(
      [8, 110, 212].map((x, k) => `fillRect ${x},6 100x16 ${k === open ? '#3a4466' : '#262b44'}`),
    );
    expect(calls[calls.indexOf(RULE) + 1]).toBe(first);
  });

  it('shows the cases and the policy empty also when a snippet is captured', () => {
    for (const tab of ['cases', 'policy'] as const) {
      expect(draw(reading(tab, 2)).calls).toStrictEqual(draw(reading(tab)).calls);
    }
  });

  it("shows a captured snippet's entry: its picture, its name and its four lines", () => {
    const { calls, sheets } = draw(reading('creatures', 1));
    const entry = calls.slice(calls.indexOf(RULE) + 1);
    expect(entry[0]).toBe('drawSprite 2 at 16,32');
    // Five calls before it are no sprites: the clear, the three tabs and the rule.
    expect(sheets[calls.indexOf(RULE) + 1 - 5]).toBe(CONTENT.creatureSheets.snippet);
    // `Schnipsel`: nine glyphs from (40, 35).
    expect(entry[1]).toBe('drawSprite 51 at 40,35');
    expect(entry[9]).toBe('drawSprite 76 at 88,35');
    const text = entry.slice(10);
    // 35 + 45 + 42 + 43 characters with 6 + 6 + 7 + 6 spaces: 140 glyphs.
    expect(text).toHaveLength(140);
    expect(text[0]).toBe('drawSprite 37 at 16,54');
    expect(text).toContain('drawSprite 99 at 16,66');
    expect(text).toContain('drawSprite 65 at 16,78');
    expect(text).toContain('drawSprite 83 at 16,90');
    // The line for nothing is gone: nothing is drawn at its place.
    expect(calls.some((call) => call.endsWith(' at 16,36'))).toBe(false);
    // One capture or three: the same entry.
    expect(draw(reading('creatures', 3)).calls).toStrictEqual(calls);
  });

  it('draws in the language of the settings', () => {
    const { calls } = draw(reading('creatures', 1), ENGLISH);
    // `Creatures`, `Cases`, `Policy`.
    expect(calls[2]).toBe('drawSprite 35 at 31,9');
    expect(calls[12]).toBe('drawSprite 35 at 145,9');
    expect(calls[18]).toBe('drawSprite 48 at 244,9');
    const entry = calls.slice(calls.indexOf(RULE) + 1);
    // `Snippet`: seven glyphs, then `A piece of text …`.
    expect(entry[1]).toBe('drawSprite 51 at 40,35');
    expect(entry[8]).toBe('drawSprite 33 at 16,54');
    const nothing = draw(reading('cases'), ENGLISH).calls;
    // `No case opened yet.`: 19 characters, 16 drawn.
    expect(nothing.slice(nothing.indexOf(RULE) + 1)).toHaveLength(16);
  });
});

describe('the journal in the scene (0020)', () => {
  it('is all the scene draws while it is open: no world, no heart, no notice, no lid', () => {
    for (const settings of [GERMAN, ENGLISH, { language: 'en', switchedAt: 100 } as const]) {
      const scene = recordingRenderer();
      drawScene(scene, reading('creatures', 1), CONTENT, settings);
      expect(scene.calls).toStrictEqual(draw(reading('creatures', 1), settings).calls);
    }
  });

  it('gives way to the world when it is closed', () => {
    const scene = recordingRenderer();
    drawScene(scene, { ...reading('creatures'), journal: null }, CONTENT, GERMAN);
    expect(scene.calls.filter((call) => call.startsWith('drawTile')).length).toBeGreaterThan(0);
    expect(scene.calls).not.toContain(RULE);
    expect(scene.sheets).toContain(CONTENT.playerSheet);
    expect(scene.sheets).toContain(CONTENT.overviewSheet);
  });
});

describe('the cases tab (0022)', () => {
  /** Five traces of Sales, as on the floor; where they lie does not matter to the journal. */
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...CONTENT.map,
      rects: [0, 1, 2, 3, 4].map((n) => ({
        name: 'trace:sales',
        x: 16 * n,
        y: 0,
        width: 16,
        height: 16,
      })),
    },
  };
  const traces = (found: number): TraceState[] =>
    [0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: trace < found ? 60 : null }));
  const cases = (found: number, settings = GERMAN): string[] => {
    const renderer = recordingRenderer();
    const state: GameState = { ...reading('cases'), traces: traces(found) };
    drawJournal(renderer, state, { tab: 'cases' }, content, settings);
    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
  };

  it('places a case as the spec says', () => {
    expect([CASE_NAME, CASE_LINE, CASE_PITCH]).toStrictEqual([
      { x: 16, y: 36 },
      { x: 16, y: 48 },
      36,
    ]);
  });

  it('shows its line for nothing while no trace is found', () => {
    expect(cases(0)).toStrictEqual(
      draw(reading('cases')).calls.slice(draw(reading('cases')).calls.indexOf(RULE) + 1),
    );
    expect(cases(0)[0]).toBe('drawSprite 46 at 16,36');
  });

  it('shows the region and `Spuren: 1 von 5` with one of five found', () => {
    const entry = cases(1);
    // `Vertrieb` 8 glyphs, `Spuren:` 7, `1`, `von` 3, `5`.
    expect(entry).toHaveLength(8 + 7 + 1 + 3 + 1);
    expect(entry[0]).toBe('drawSprite 54 at 16,36');
    expect(entry[8]).toBe('drawSprite 51 at 16,48');
    expect(entry[15]).toBe('drawSprite 17 at 64,48');
    expect(entry[16]).toBe('drawSprite 86 at 76,48');
    expect(entry[19]).toBe('drawSprite 21 at 100,48');
  });

  it('counts up to `5 von 5`', () => {
    const entry = cases(5);
    expect(entry[15]).toBe('drawSprite 21 at 64,48');
    expect(entry[19]).toBe('drawSprite 21 at 100,48');
  });

  it('reads `Sales` and `Traces: 2 of 5` in English', () => {
    const entry = cases(2, ENGLISH);
    // `Sales` 5 glyphs, `Traces:` 7, `2`, `of` 2, `5`.
    expect(entry).toHaveLength(5 + 7 + 1 + 2 + 1);
    expect(entry[0]).toBe('drawSprite 51 at 16,36');
    expect(entry[5]).toBe('drawSprite 52 at 16,48');
    expect(entry[12]).toBe('drawSprite 18 at 64,48');
    expect(entry[13]).toBe('drawSprite 79 at 76,48');
    expect(entry[15]).toBe('drawSprite 21 at 94,48');
  });

  it('leaves the creatures and the policy as they were', () => {
    for (const tab of ['creatures', 'policy'] as const) {
      const renderer = recordingRenderer();
      drawJournal(renderer, { ...reading(tab), traces: traces(3) }, { tab }, content, GERMAN);
      expect(renderer.calls).toStrictEqual(draw(reading(tab)).calls);
    }
  });
});

describe('a solved case in the journal (0024)', () => {
  /** Five traces of Sales, all found. */
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...CONTENT.map,
      rects: [0, 1, 2, 3, 4].map((n) => ({
        name: 'trace:sales',
        x: 16 * n,
        y: 0,
        width: 16,
        height: 16,
      })),
    },
  };
  const all: TraceState[] = [0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: 60 }));
  const shown = (tab: JournalTab, solved: boolean, settings = GERMAN): string[] => {
    const renderer = recordingRenderer();
    const state: GameState = {
      ...reading(tab),
      traces: all,
      solved: solved ? [{ region: 'sales', at: 900 }] : [],
    };
    drawJournal(renderer, state, { tab }, content, settings);
    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
  };

  it('places the outcome and the blocks as the spec says', () => {
    expect([CASE_OUTCOME, POLICY_BLOCK, POLICY_GAP]).toStrictEqual([
      { x: 16, y: 60 },
      { x: 16, y: 36 },
      12,
    ]);
    // Since 0037 a block starts 12 px below the last line of the block before it.
  });

  it('adds the outcome as the third line of the case, under its name and its count', () => {
    const open = shown('cases', false);
    const solved = shown('cases', true);
    // `Gelöst: Angebote gingen in einen Chatbot.`: 41 characters, 36 drawn; `G` is glyph 39.
    expect(solved).toHaveLength(open.length + 36);
    expect(solved.slice(0, open.length)).toStrictEqual(open);
    expect(solved[open.length]).toBe('drawSprite 39 at 16,60');
    expect(open.some((call) => call.endsWith(',60'))).toBe(false);
  });

  it('shows the block of the solved case on the policy tab, and its line for nothing before', () => {
    expect(shown('policy', false)).toStrictEqual(
      draw(reading('policy')).calls.slice(draw(reading('policy')).calls.indexOf(RULE) + 1),
    );
    const block = shown('policy', true);
    // 45 + 40 + 46 + 33 characters with 7 + 4 + 6 + 5 spaces: 142 glyphs.
    expect(block).toHaveLength(142);
    expect(block[0]).toBe('drawSprite 42 at 16,36');
    expect(block).toContain('drawSprite 86 at 16,48');
    expect(block).toContain('drawSprite 55 at 16,60');
    expect(block).toContain('drawSprite 85 at 16,72');
  });

  it('draws both in English with the language `en`', () => {
    // `Solved: …` starts with glyph 51, `Every text …` with glyph 37.
    const cases = shown('cases', true, ENGLISH);
    expect(cases).toContain('drawSprite 51 at 16,60');
    expect(shown('policy', true, ENGLISH)[0]).toBe('drawSprite 37 at 16,36');
  });

  it('leaves the creatures tab as it was', () => {
    const renderer = recordingRenderer();
    drawJournal(
      renderer,
      { ...reading('creatures', 1), solved: [{ region: 'sales', at: 900 }] },
      { tab: 'creatures' },
      content,
      GERMAN,
    );
    expect(renderer.calls).toStrictEqual(draw(reading('creatures', 1)).calls);
  });
});

describe('the cases tab with two regions (0028)', () => {
  /** Five traces of Sales and five of Marketing, in the order of the floor. */
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...CONTENT.map,
      rects: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
        name: n < 5 ? 'trace:sales' : 'trace:marketing',
        x: 16 * n,
        y: 0,
        width: 16,
        height: 16,
      })),
    },
  };
  /** The traces with those of the given indices found. */
  const traces = (...found: readonly number[]): TraceState[] =>
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({
      trace,
      light: 0,
      found: found.includes(trace) ? 60 : null,
    }));
  const cases = (found: readonly number[], settings = GERMAN): string[] => {
    const renderer = recordingRenderer();
    const state: GameState = { ...reading('cases'), traces: traces(...found) };
    drawJournal(renderer, state, { tab: 'cases' }, content, settings);
    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
  };

  it('shows Marketing alone, in the first place, while no trace of Sales is found', () => {
    const entry = cases([5, 6]);
    // `Marketing` 9 glyphs, `Spuren:` 7, `2`, `von` 3, `5`.
    expect(entry).toHaveLength(9 + 7 + 1 + 3 + 1);
    expect(entry[0]).toBe('drawSprite 45 at 16,36');
    expect(entry[9]).toBe('drawSprite 51 at 16,48');
    expect(entry[16]).toBe('drawSprite 18 at 64,48');
    expect(entry[20]).toBe('drawSprite 21 at 100,48');
  });

  it('shows Sales first and Marketing second, 36 px lower, with a trace of each found', () => {
    const both = cases([0, 9]);
    const sales = cases([0]);
    // The entry of Sales is what it was; the 21 glyphs of Marketing follow it.
    expect(both.slice(0, sales.length)).toStrictEqual(sales);
    const marketing = both.slice(sales.length);
    expect(marketing).toHaveLength(9 + 7 + 1 + 3 + 1);
    expect(marketing[0]).toBe('drawSprite 45 at 16,72');
    expect(marketing[9]).toBe('drawSprite 51 at 16,84');
    expect(marketing[16]).toBe('drawSprite 17 at 64,84');
  });

  it('reads `Marketing` and `Traces: 5 of 5` in English', () => {
    const entry = cases([5, 6, 7, 8, 9], ENGLISH);
    // `Marketing` 9 glyphs, `Traces:` 7, `5`, `of` 2, `5`.
    expect(entry).toHaveLength(9 + 7 + 1 + 2 + 1);
    expect(entry[0]).toBe('drawSprite 45 at 16,36');
    expect(entry[9]).toBe('drawSprite 52 at 16,48');
    expect(entry[16]).toBe('drawSprite 21 at 64,48');
  });
});

describe('two solved cases in the journal (0028)', () => {
  /** Five traces of Sales and five of Marketing, in the order of the floor. */
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...CONTENT.map,
      rects: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
        name: n < 5 ? 'trace:sales' : 'trace:marketing',
        x: 16 * n,
        y: 0,
        width: 16,
        height: 16,
      })),
    },
  };
  const MARKETING = { region: 'marketing', at: 900 };
  const SALES = { region: 'sales', at: 950 };
  const shown = (
    tab: JournalTab,
    found: readonly number[],
    solved: GameState['solved'],
    settings = GERMAN,
  ): string[] => {
    const renderer = recordingRenderer();
    const state: GameState = {
      ...reading(tab),
      traces: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((trace) => ({
        trace,
        light: 0,
        found: found.includes(trace) ? 60 : null,
      })),
      solved,
    };
    drawJournal(renderer, state, { tab }, content, settings);
    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
  };
  const ALL_OF_MARKETING = [5, 6, 7, 8, 9];

  it('shows Marketing alone with its count and its outcome when only Marketing is solved', () => {
    const entry = shown('cases', ALL_OF_MARKETING, [MARKETING]);
    // `Marketing` 9, `Spuren: 5 von 5` 12, `Gelöst: Bilder gingen ungeprüft raus.` 33 glyphs.
    expect(entry).toHaveLength(9 + 12 + 33);
    expect(entry[0]).toBe('drawSprite 45 at 16,36');
    expect(entry[9]).toBe('drawSprite 51 at 16,48');
    expect(entry[16]).toBe('drawSprite 21 at 64,48');
    expect(entry[21]).toBe('drawSprite 39 at 16,60');
  });

  it('shows Sales first and Marketing 36 px lower with one trace of Sales found too', () => {
    const entries = shown('cases', [0, ...ALL_OF_MARKETING], [MARKETING]);
    // `Vertrieb` 8 and `Spuren: 1 von 5` 12 glyphs, and no outcome: Sales is not solved.
    expect(entries).toHaveLength(8 + 12 + 9 + 12 + 33);
    expect(entries[0]).toBe('drawSprite 54 at 16,36');
    expect(entries.slice(0, 20).some((call) => call.endsWith(',60'))).toBe(false);
    expect(entries[20]).toBe('drawSprite 45 at 16,72');
    expect(entries[29]).toBe('drawSprite 51 at 16,84');
    expect(entries[41]).toBe('drawSprite 39 at 16,96');
  });

  it('draws the block of the case solved first from (16, 36) and the other 12 px below its last line', () => {
    const all = [0, 1, 2, 3, 4, ...ALL_OF_MARKETING];
    // `Was eine Maschine …`: three lines of 35, 36 and 31 glyphs; `Jeder Text …`: 142.
    // After the three lines of Marketing the second block starts at y = 84 (0037).
    const marketingFirst = shown('policy', all, [MARKETING, SALES]);
    expect(marketingFirst).toHaveLength(102 + 142);
    expect(marketingFirst[0]).toBe('drawSprite 55 at 16,36');
    expect(marketingFirst[102]).toBe('drawSprite 42 at 16,84');
    expect(marketingFirst.slice(0, 102).every((call) => /,(36|48|60)$/.test(call))).toBe(true);
    expect(marketingFirst.slice(102).every((call) => /,(84|96|108|120)$/.test(call))).toBe(true);
    // After the four lines of Sales it starts at y = 96, as before.
    const salesFirst = shown('policy', all, [
      { region: 'sales', at: 900 },
      { region: 'marketing', at: 950 },
    ]);
    expect(salesFirst).toHaveLength(142 + 102);
    expect(salesFirst[0]).toBe('drawSprite 42 at 16,36');
    expect(salesFirst[142]).toBe('drawSprite 55 at 16,96');
  });

  it('draws the block of Marketing alone from (16, 36) when only Marketing is solved', () => {
    const block = shown('policy', ALL_OF_MARKETING, [MARKETING]);
    expect(block).toHaveLength(102);
    expect(block[0]).toBe('drawSprite 55 at 16,36');
  });

  it('draws both tabs in English with the language `en`', () => {
    // `Solved: images went out unchecked.`: 30 glyphs; `What a machine …` and `Every text …`.
    const cases = shown('cases', ALL_OF_MARKETING, [MARKETING], ENGLISH);
    expect(cases).toHaveLength(9 + 11 + 30);
    expect(cases[20]).toBe('drawSprite 51 at 16,60');
    const blocks = shown('policy', ALL_OF_MARKETING, [MARKETING, SALES], ENGLISH);
    expect(blocks[0]).toBe('drawSprite 55 at 16,36');
    expect(blocks).toContain('drawSprite 37 at 16,84');
  });
});

describe('the second entry of the creatures tab (0032)', () => {
  const shown = (captured: GameState['captured'], settings = GERMAN) => {
    const renderer = recordingRenderer();
    const state: GameState = { ...reading('creatures'), captured };
    drawJournal(renderer, state, { tab: 'creatures' }, CONTENT, settings);
    const from = renderer.calls.indexOf(RULE) + 1;
    return { calls: renderer.calls.slice(from), sheets: renderer.sheets.slice(from - 5) };
  };

  it('draws the mirage alone in the first place when only a mirage is captured', () => {
    const { calls } = shown({ snippet: 0, mirage: 1 });
    expect(calls[0]).toBe(`drawSprite ${ENTRY_FRAME} at 16,32`);
    // `Trugbild`: `T` is glyph 52; the text starts with `Ein Bild …`, `E` is glyph 37.
    expect(calls[1]).toBe('drawSprite 52 at 40,35');
    expect(calls[9]).toBe('drawSprite 37 at 16,54');
  });

  it('draws it from its own sheet', () => {
    const only = recordingRenderer();
    drawJournal(
      only,
      { ...reading('creatures'), captured: { snippet: 0, mirage: 1 } },
      { tab: 'creatures' },
      CONTENT,
      GERMAN,
    );
    expect(only.sheets).toContain(CONTENT.creatureSheets.mirage);
    expect(only.sheets).not.toContain(CONTENT.creatureSheets.snippet);
  });

  it('draws the mirage 72 px below the snippet when both are captured', () => {
    const both = shown({ snippet: 1, mirage: 2 }).calls;
    const snippetOnly = shown({ snippet: 1, mirage: 0 }).calls;
    const mirageOnly = shown({ snippet: 0, mirage: 1 }).calls;
    // The first entry is what it was; the second is the mirage's, every call 72 px lower.
    expect(both.slice(0, snippetOnly.length)).toStrictEqual(snippetOnly);
    const lower = (call: string): string =>
      call.replace(/,(\d+)$/, (_all, y: string) => `,${Number(y) + ENTRY_PITCH}`);
    expect(both.slice(snippetOnly.length)).toStrictEqual(mirageOnly.map(lower));
    expect(both[snippetOnly.length]).toBe(`drawSprite ${ENTRY_FRAME} at 16,104`);
  });

  it('fits the screen with both: no line starts below y = 162', () => {
    const rows = shown({ snippet: 1, mirage: 1 }).calls.map((call) =>
      Number(call.slice(call.lastIndexOf(',') + 1)),
    );
    expect(Math.max(...rows)).toBe(162);
  });

  it('reads `Mirage` in English', () => {
    // `M` is glyph 45; the text starts with `A picture …`, `A` is glyph 33.
    const { calls } = shown({ snippet: 0, mirage: 1 }, ENGLISH);
    expect(calls[1]).toBe('drawSprite 45 at 40,35');
    expect(calls[7]).toBe('drawSprite 33 at 16,54');
  });
});

describe('the cases tab with three regions (0037)', () => {
  /** Five traces each of Sales, Marketing and Support, in the order of the floor. */
  const REGION_OF = ['sales', 'marketing', 'support'] as const;
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...CONTENT.map,
      rects: Array.from({ length: 15 }, (_, n) => ({
        name: `trace:${REGION_OF[Math.floor(n / 5)]}`,
        x: 16 * n,
        y: 0,
        width: 16,
        height: 16,
      })),
    },
  };
  const cases = (found: readonly number[], settings = GERMAN): string[] => {
    const renderer = recordingRenderer();
    const traces: TraceState[] = Array.from({ length: 15 }, (_, trace) => ({
      trace,
      light: 0,
      found: found.includes(trace) ? 60 : null,
    }));
    drawJournal(renderer, { ...reading('cases'), traces }, { tab: 'cases' }, content, settings);
    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
  };

  it('shows Support alone, in the first place, while no trace of the other two is found', () => {
    const entry = cases([10]);
    // `Support` 7 and `Spuren: 1 von 5` 12 glyphs.
    expect(entry).toHaveLength(7 + 12);
    expect(entry[0]).toBe('drawSprite 51 at 16,36');
    expect(entry[7]).toBe('drawSprite 51 at 16,48');
  });

  it('shows Sales, Marketing and Support 36 px apart, with a trace of each found', () => {
    const entries = cases([0, 5, 10]);
    // `Vertrieb` 8, `Marketing` 9 and `Support` 7 glyphs, each with its count of 12.
    expect(entries).toHaveLength(8 + 12 + 9 + 12 + 7 + 12);
    expect(entries[0]).toBe('drawSprite 54 at 16,36');
    expect(entries[20]).toBe('drawSprite 45 at 16,72');
    expect(entries[41]).toBe('drawSprite 51 at 16,108');
    expect(entries[48]).toBe('drawSprite 51 at 16,120');
  });

  it('reads `Support` and `Traces: 5 of 5` in English', () => {
    const entry = cases([10, 11, 12, 13, 14], ENGLISH);
    expect(entry).toHaveLength(7 + 11);
    expect(entry[0]).toBe('drawSprite 51 at 16,36');
    expect(entry[7]).toBe('drawSprite 52 at 16,48');
  });
});

describe('the policy tab stacks its blocks (0037)', () => {
  const SALES = textKey('policy.sales');
  const MARKETING = textKey('policy.marketing');
  const SUPPORT = textKey('policy.support');

  it('starts the first block at (16, 36) and each further one 12 px below the last line before it', () => {
    expect(policyOrigins([], 'de')).toStrictEqual([]);
    expect(policyOrigins([SALES], 'de')).toStrictEqual([{ x: 16, y: 36 }]);
    // Four lines, then 12 px: 36 + 4 × 12 + 12.
    expect(policyOrigins([SALES, MARKETING], 'de')).toStrictEqual([
      { x: 16, y: 36 },
      { x: 16, y: 96 },
    ]);
    // Three lines, then 12 px: 36 + 3 × 12 + 12.
    expect(policyOrigins([MARKETING, SALES], 'de')).toStrictEqual([
      { x: 16, y: 36 },
      { x: 16, y: 84 },
    ]);
    expect(policyOrigins([SUPPORT, SALES], 'en')).toStrictEqual([
      { x: 16, y: 36 },
      { x: 16, y: 84 },
    ]);
  });

  it('fits the three blocks of today on the surface in every order, in both languages', () => {
    const orders = [
      [SALES, MARKETING, SUPPORT],
      [SALES, SUPPORT, MARKETING],
      [MARKETING, SALES, SUPPORT],
      [MARKETING, SUPPORT, SALES],
      [SUPPORT, SALES, MARKETING],
      [SUPPORT, MARKETING, SALES],
    ];
    for (const language of ['de', 'en'] as const) {
      for (const order of orders) {
        const origins = policyOrigins(order, language);
        const last = order[2];
        const lines = last === undefined ? 0 : textOf(last, language).split('\n').length;
        // The top of the last line is y = 168: it ends at 178, inside the 180 px.
        expect((origins[2]?.y ?? 0) + (lines - 1) * 12, `${language} ${order.join()}`).toBe(168);
      }
    }
  });
});

describe('three solved cases in the journal (0037)', () => {
  /** Five traces each of Sales, Marketing and Support, in the order of the floor. */
  const REGION_OF = ['sales', 'marketing', 'support'] as const;
  const content: SceneContent = {
    ...CONTENT,
    map: {
      ...CONTENT.map,
      rects: Array.from({ length: 15 }, (_, n) => ({
        name: `trace:${REGION_OF[Math.floor(n / 5)]}`,
        x: 16 * n,
        y: 0,
        width: 16,
        height: 16,
      })),
    },
  };
  const shown = (tab: JournalTab, solved: GameState['solved'], settings = GERMAN): string[] => {
    const renderer = recordingRenderer();
    const state: GameState = {
      ...reading(tab),
      traces: Array.from({ length: 15 }, (_, trace) => ({ trace, light: 0, found: 60 })),
      solved,
    };
    drawJournal(renderer, state, { tab }, content, settings);
    return renderer.calls.slice(renderer.calls.indexOf(RULE) + 1);
  };
  /** The calls that draw on the line with its top at y. */
  const at = (calls: readonly string[], y: number): string[] =>
    calls.filter((call) => call.endsWith(`,${y}`));
  /** The lowest top of a line that is drawn. */
  const lowest = (calls: readonly string[]): number =>
    Math.max(...calls.map((call) => Number(call.slice(call.lastIndexOf(',') + 1))));
  const SALES = { region: 'sales', at: 900 };
  const MARKETING = { region: 'marketing', at: 930 };
  const SUPPORT = { region: 'support', at: 960 };

  it('draws three entries on the cases tab, 36 px apart, each with its outcome', () => {
    const entries = shown('cases', [SUPPORT, SALES, MARKETING]);
    // The order is that of the cases, not the order they were solved in: `V`, `M`, `S`.
    expect(at(entries, 36)[0]).toBe('drawSprite 54 at 16,36');
    expect(at(entries, 72)[0]).toBe('drawSprite 45 at 16,72');
    expect(at(entries, 108)[0]).toBe('drawSprite 51 at 16,108');
    expect(at(entries, 108)).toHaveLength(7);
    // `Spuren: 5 von 5`, and `Gelöst: …` on the third line of each entry.
    expect(at(entries, 120)).toHaveLength(12);
    expect([60, 96, 132].map((y) => at(entries, y)[0])).toStrictEqual([
      'drawSprite 39 at 16,60',
      'drawSprite 39 at 16,96',
      'drawSprite 39 at 16,132',
    ]);
    // `Gelöst: Kundenmails gingen in einen Übersetzer.`: 42 glyphs.
    expect(at(entries, 132)).toHaveLength(42);
    expect(lowest(entries)).toBe(132);
  });

  it('draws the block of Support alone from (16, 36): three lines', () => {
    const block = shown('policy', [SUPPORT]);
    // `Werkzeuge und Erweiterungen …`: `W`.
    expect(block[0]).toBe('drawSprite 55 at 16,36');
    expect(block.every((call) => /,(36|48|60)$/.test(call))).toBe(true);
  });

  it('stacks the three blocks in the order they were solved, and none below y = 168', () => {
    // Support, Marketing, Sales: three, three and four lines.
    const calls = shown('policy', [SUPPORT, MARKETING, SALES]);
    expect(at(calls, 36)[0]).toBe('drawSprite 55 at 16,36');
    expect(at(calls, 84)[0]).toBe('drawSprite 55 at 16,84');
    expect(at(calls, 132)[0]).toBe('drawSprite 42 at 16,132');
    expect(at(calls, 72)).toStrictEqual([]);
    expect(at(calls, 120)).toStrictEqual([]);
    expect(lowest(calls)).toBe(168);
    // Sales first: its four lines, then Support from y = 96 and Marketing from y = 144.
    const salesFirst = shown('policy', [SALES, SUPPORT, MARKETING]);
    expect(at(salesFirst, 36)[0]).toBe('drawSprite 42 at 16,36');
    expect(at(salesFirst, 96)[0]).toBe('drawSprite 55 at 16,96');
    expect(at(salesFirst, 144)[0]).toBe('drawSprite 55 at 16,144');
    expect(lowest(salesFirst)).toBe(168);
  });

  it('keeps every order of the three inside the surface, in both languages', () => {
    const orders = [
      [SALES, MARKETING, SUPPORT],
      [SALES, SUPPORT, MARKETING],
      [MARKETING, SALES, SUPPORT],
      [MARKETING, SUPPORT, SALES],
      [SUPPORT, SALES, MARKETING],
      [SUPPORT, MARKETING, SALES],
    ];
    for (const settings of [GERMAN, ENGLISH]) {
      for (const order of orders) {
        expect(lowest(shown('policy', order, settings))).toBe(168);
      }
    }
  });

  it('draws the cases tab in English: `Support`, and its outcome 42 glyphs', () => {
    const entries = shown('cases', [SUPPORT], ENGLISH);
    expect(at(entries, 108)[0]).toBe('drawSprite 51 at 16,108');
    // `Solved: customer mails went into a translator.`
    expect(at(entries, 132)[0]).toBe('drawSprite 51 at 16,132');
    expect(at(entries, 132)).toHaveLength(40);
  });
});
