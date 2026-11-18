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
  POLICY_PITCH,
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
const ENGLISH: SceneSettings = { language: 'en', switchedAt: null };
/** A game with the journal open on `tab`: five hearts, the lamp on, `snippets` captured. */
const reading = (tab: JournalTab, snippets = 0): GameState => ({
  tick: 100,
  started: 0,
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
  lamp: { on: true, strength: 1, owned: true, used: true },
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
  captured: { snippet: snippets },
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
    expect([CASE_OUTCOME, POLICY_BLOCK, POLICY_PITCH]).toStrictEqual([
      { x: 16, y: 60 },
      { x: 16, y: 36 },
      60,
    ]);
    // Two blocks of four lines fit the surface: the second ends at y = 142.
    expect(POLICY_BLOCK.y + POLICY_PITCH + 3 * 12 + 10).toBe(142);
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
