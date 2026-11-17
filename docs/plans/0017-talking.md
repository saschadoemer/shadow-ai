# 0017 — Implementation plan: talking

**Spec:** [`docs/features/0017-talking.md`](../features/0017-talking.md) (approved 2026-11-17).
The plan argues from the spec; where they differ, the spec wins. Read the spec first, then
`CLAUDE.md`, then `docs/spec/architecture.md` §2, §4, §5, §6 and §8 and `docs/spec/testing.md`
§5. **Written:** 2026-11-17 on the planning model. A working document, not specification.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**Precondition:** feature 0016 is merged into `main` (`d620c07` or later). The branch
`feature/0017-talking` exists, cut from that `main`, and holds the draft, the approval and this
plan. Work on it; merge the latest `main` into it before Task 1.

**Goal:** a press of `E` or `Enter` within 24 px of the data protection officer opens a box
with her two pages; a press turns the page, a press on the last page closes it; nothing in the
world is stepped while it is open.

**Approach:** seven code tasks, each green on its own. The text: her pages in the table and
more than one line in `drawText` (T1). The cast, the standing figures and the new fields of
the state and the input, passed through unchanged (T2). The rules of talking (T3) — pure,
tested without a browser. Then the data: her point on the floor (T4) and her sheet (T5). Then
the scene and `main.ts` (T6) and the smoke spec (T7). Then the documents (T8), the full check
with the container (T9), the walk (T10) and the pull request (T11).

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- Words: in the code and in this plan the **player** is the hero's figure (`PlayerState`); a
  **figure** is one of the cast, standing in the map.
- INV-1: `GameState.figures`, `GameState.dialogue` and `GameState.talkHeld` are plain data;
  `dialogue` is `null` or an object, never `undefined`. The figures' places and pages are
  **not** in the state and **not** cached: `update` and `drawScene` build them from
  `map.points` on every call with `figuresOf`.
- INV-2: `src/game/cast.ts` and `src/game/talk.ts` import nothing from `src/render/` and use
  no DOM name.
- INV-4: her words live in `src/text/de.ts` and `src/text/en.ts` only. `cast.ts` holds keys.
  `drawText` stays the only function that draws text, and it takes a `TextKey`.
- INV-6: `officer.png` uses Endesga 32 only and never `#68386c`.
- INV-7: her place is a point of `public/maps/floor.tmj`; no coordinate of a figure appears in
  `src/`.
- The press is state, not keyboard: `engine/input` is **not** changed. `talkHeld` is set from
  the input in **every** step — ordinary, dialogue and dark.
- With a dialogue open, `update` returns the state with `tick`, `talkHeld` and `dialogue`
  changed and nothing else. Do not step "just the animations".
- No tile changes; the 91 points and the 8 rectangles of `floor.tmj` stay as 0014 left them.
- No `any`, no `@ts-ignore`. Commits: imperative subject, a body that says why, signed (run
  `git commit` outside the sandbox). Format with `npx biome check --write <files>` before
  `npm run check`.
- The numbers, verbatim from the spec: `talk` ← `KeyE` or `Enter`; `TALK_DISTANCE` 24 px; a
  page has at most 3 lines of at most 47 characters; lines are 12 px apart; the box is
  (8, 134, 304, 42) in `#181425`; the lines start at (12, 138); the marker is the rectangles
  (299, 169, 5, 1), (300, 170, 3, 1) and (301, 171, 1, 1) in `#ffffff`, drawn while
  ⌊tick / 30⌋ is even; `figure:officer` is at (264, 472) with the id 100, `nextobjectid` 101;
  her shirt is `#c0cbdc`.

## File structure

| File | Responsibility |
|---|---|
| `src/text/de.ts`, `src/text/en.ts` (modify) | her two pages |
| `src/render/draw-text.ts` (modify) | line breaks, `LINE_PITCH` |
| `src/game/cast.ts` (create) | the cast, figure points, `figuresOf`, `figuresFrom` |
| `src/game/state.ts`, `src/game/player.ts` (modify) | `FigureState`, `Dialogue`, three fields; `GameInput.talk` |
| `src/game/mover.ts`, `src/game/creature.ts` (modify) | skip `figure:` points |
| `src/game/talk.ts` (create) | the press, reach, turning, opening, pages |
| `src/game/update.ts`, `src/game/overview.ts` (modify) | the new fields in every step |
| `tools/floor-layout.ts` (modify) | `FIGURES` and the point object |
| `tools/placeholder-person.ts`, `tools/gen-sprites.ts` (modify) | `officer.png` |
| `src/render/draw-scene.ts` (modify) | the standing figures, the dialogue box |
| `src/main.ts` (modify) | the binding, the figures' sheets |
| `tests/unit/cast.test.ts`, `tests/unit/talk.test.ts` (create) | one file per module |
| `tests/fixtures/maps/figures.tmj` (create) | a map with one figure |

---

### Task 1: Her pages, and more than one line

**Files:**
- Modify: `src/text/de.ts`, `src/text/en.ts`, `src/text/text.ts` (a comment),
  `src/render/draw-text.ts`
- Test: `tests/unit/text.test.ts`, `tests/unit/font.test.ts`, `tests/unit/draw-text.test.ts`

**Interfaces:**
- Produces: the ids `talk.officer-rules-1` and `talk.officer-rules-2`; `LINE_PITCH` (12) in
  `draw-text`; `drawText` starts a new line at a line break.

- [x] **Step 1: Write the failing tests.** In `tests/unit/text.test.ts` replace the test of the
  key names and add the three tests after the sentence of 0016:

```ts
  it('names every key `<kind>.<what>` in lower-case letters, digits and hyphens', () => {
    for (const key of Object.keys(TABLE.de)) {
      expect(key).toMatch(/^[a-z]+\.[a-z0-9]+(-[a-z0-9]+)*$/);
    }
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

  it('gives a page of talk at most three lines of at most 47 characters, none empty', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (!key.startsWith('talk.')) {
          continue;
        }
        const lines = text.split('\n');
        expect(lines.length, `${language} ${key}`).toBeLessThanOrEqual(3);
        for (const line of lines) {
          expect(line.length, `${language} ${key}: "${line}"`).toBeLessThanOrEqual(47);
          expect(line.trim(), `${language} ${key}`).not.toBe('');
        }
      }
    }
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
```

  In `tests/unit/font.test.ts`, in the test of the glyph for every character, skip the line
  break: the loop body becomes

```ts
        for (const character of text) {
          if (character === '\n') {
            continue;
          }
          expect(GLYPHS.includes(character), `${language} ${key}: "${character}"`).toBe(true);
        }
```

  In `tests/unit/draw-text.test.ts` import `LINE_PITCH` and add:

```ts
  it('starts a new line 12 px lower at a line break, from x again (0017)', () => {
    const { renderer, calls } = recorder();
    drawText(renderer, FONT, textKey('talk.officer-rules-1'), 'de', 12, 138);
    expect(LINE_PITCH).toBe(12);
    // 33, 43 and 36 characters with 5, 7 and 4 spaces: 28, 36 and 32 glyphs.
    expect(calls).toHaveLength(96);
    expect(calls[0]).toBe('36 at 12,138'); // D
    expect(calls[28]).toBe('37 at 12,150'); // E
    expect(calls[64]).toBe('40 at 12,162'); // H
    expect(calls.at(-1)).toBe('14 at 222,162'); // the full stop, character 35 of line 2
  });
```

- [x] **Step 2: Run** `npx vitest run tests/unit/text.test.ts tests/unit/draw-text.test.ts` —
  expected: the new tests fail, and the typecheck rejects the two ids.

- [x] **Step 3: Implement.** `src/text/de.ts` — one array entry per line on screen:

```ts
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
```

  `src/text/en.ts`:

```ts
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
```

  The dash is the en dash `–` (U+2013), which the font has; a hyphen would be another glyph.
  In `src/text/text.ts` the comment of `DEFAULT_LANGUAGE` names 0019 instead of 0018.
  `src/render/draw-text.ts`:

```ts
/** Two lines are 12 px apart: a glyph is 10 px high, and 2 px lie between the lines (0017). */
export const LINE_PITCH = 12;

/**
 * Text (architecture.md §8, features 0016 and 0017): the string of a key in a language, drawn
 * from the font sheet. Character n of a line, counted from 0, has its top-left corner at
 * (x + 6n, y + 12k) on line k. A line break in the string starts the next line. A space is
 * not drawn; it only takes its width. A character the font does not have is drawn as `?`.
 * There is no wrapping. The only way to draw text: it takes a TextKey, so a literal does not
 * compile (INV-4).
 */
export function drawText(
  renderer: Renderer,
  font: SpriteSheet,
  key: TextKey,
  language: Language,
  x: number,
  y: number,
): void {
  let column = 0;
  let line = 0;
  for (const character of textOf(key, language)) {
    if (character === '\n') {
      line += 1;
      column = 0;
      continue;
    }
    if (character !== ' ') {
      renderer.drawSprite(
        font,
        glyphIndex(character),
        x + column * GLYPH_WIDTH,
        y + line * LINE_PITCH,
      );
    }
    column += 1;
  }
}
```

- [x] **Step 4: Run** `npm run check` — expected: green; the tests of 0016 are unchanged and
  still pass.

- [x] **Step 5: Commit** — `Give the officer her two pages`, body: a page is one key and its
  line breaks are written in the table, so a translation decides its own breaks and the game
  measures nothing.

---

### Task 2: The cast, and the new fields of the state

**Files:**
- Create: `src/game/cast.ts`, `tests/unit/cast.test.ts`, `tests/fixtures/maps/figures.tmj`
- Modify: `src/game/state.ts`, `src/game/player.ts`, `src/game/mover.ts`,
  `src/game/creature.ts`, `src/game/update.ts`, `src/game/overview.ts`, `src/main.ts`
- Test: `tests/unit/state.test.ts`, and the literals of `tests/unit/overview.test.ts`,
  `tests/unit/draw-scene.test.ts`, `tests/unit/notice.test.ts`, `tests/unit/player.test.ts`

**Interfaces:**
- Consumes: the ids of T1.
- Produces, in `cast.ts`: `FIGURE_PREFIX`, `CastMember { id; pages }`, `CAST`,
  `isFigurePoint(name)`, `Figure { id; pages; x; y }`,
  `figuresOf(points, cast = CAST): Figure[]`, `figuresFrom(figures): FigureState[]`. In
  `state.ts`: `FigureState { figure; facing }`, `Dialogue { figure; page }`,
  `GameState.figures`, `GameState.dialogue: Dialogue | null`, `GameState.talkHeld`. In
  `player.ts`: `GameInput.talk`.

- [x] **Step 1: Make the fixture.** Copy `tests/fixtures/maps/walls.tmj` to
  `tests/fixtures/maps/figures.tmj`, set `nextobjectid` to `4` and replace the `objects` array
  by these three, in the file's own style:

```json
[
  { "height": 0, "id": 1, "name": "spawn", "point": true, "rotation": 0, "type": "", "visible": true, "width": 0, "x": 40, "y": 152 },
  { "height": 0, "id": 2, "name": "snippet", "point": true, "rotation": 0, "type": "", "visible": true, "width": 0, "x": 200, "y": 152 },
  { "height": 0, "id": 3, "name": "figure:officer", "point": true, "rotation": 0, "type": "", "visible": true, "width": 0, "x": 160, "y": 96 }
]
```

- [x] **Step 2: Write the failing tests** in `tests/unit/cast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NamedPoint } from '../../src/engine/tiled';
import { CAST, type CastMember, figuresFrom, figuresOf, isFigurePoint } from '../../src/game/cast';
import { creaturesFrom } from '../../src/game/creature';
import { isRoutePoint, routesOf } from '../../src/game/mover';
import { textKey } from '../../src/text/text';

const point = (name: string, x: number, y: number): NamedPoint => ({ name, x, y });
const FIRST = textKey('talk.officer-rules-1');
const SECOND = textKey('talk.officer-rules-2');

describe('the cast (0017)', () => {
  it('has the officer with her two pages', () => {
    expect(CAST).toStrictEqual([{ id: 'officer', pages: [FIRST, SECOND] }]);
  });

  it('gives every member at least one page', () => {
    for (const member of CAST) {
      expect(member.pages.length, member.id).toBeGreaterThan(0);
    }
  });
});

describe('figuresOf (0017)', () => {
  it('reads the figures of a map in file order, with their place and their pages', () => {
    const points = [
      point('snippet', 200, 152),
      point('figure:officer', 160, 96),
      point('wake', 40, 40),
    ];
    expect(figuresOf(points)).toStrictEqual([
      { id: 'officer', pages: [FIRST, SECOND], x: 160, y: 96 },
    ]);
  });

  it('reads no figure from a map without figure points', () => {
    expect(figuresOf([point('snippet', 200, 152)])).toStrictEqual([]);
    expect(figuresOf([])).toStrictEqual([]);
  });

  it('refuses an id the cast does not have', () => {
    expect(() => figuresOf([point('figure:cellar', 160, 96)])).toThrow(
      'figure point figure:cellar names no figure',
    );
  });

  it('refuses two points with the same id', () => {
    expect(() =>
      figuresOf([point('figure:officer', 160, 96), point('figure:officer', 200, 96)]),
    ).toThrow('more than one point object "figure:officer"');
  });

  it('reads a cast it is given: the game passes its own', () => {
    const cast: readonly CastMember[] = [
      { id: 'a', pages: [FIRST] },
      { id: 'b', pages: [SECOND] },
    ];
    expect(figuresOf([point('figure:b', 200, 96), point('figure:a', 160, 96)], cast)).toStrictEqual(
      [
        { id: 'b', pages: [SECOND], x: 200, y: 96 },
        { id: 'a', pages: [FIRST], x: 160, y: 96 },
      ],
    );
  });

  it('starts every figure facing down, in the order of the map', () => {
    const figures = figuresOf([point('figure:officer', 160, 96)]);
    expect(figuresFrom(figures)).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(figuresFrom([])).toStrictEqual([]);
  });
});

describe('a figure point among the other points (0017)', () => {
  it('is known by its prefix', () => {
    expect(isFigurePoint('figure:officer')).toBe(true);
    expect(isFigurePoint('person:reception:1')).toBe(false);
    expect(isFigurePoint('snippet')).toBe(false);
  });

  it('is no route point', () => {
    expect(isRoutePoint('figure:officer')).toBe(false);
    expect(isRoutePoint('dog:hr:1')).toBe(true);
    expect(routesOf([point('figure:officer', 160, 96)])).toStrictEqual([]);
  });

  it('makes no creature', () => {
    const creatures = creaturesFrom([point('figure:officer', 160, 96), point('snippet', 200, 152)]);
    expect(creatures.map((creature) => [creature.species, creature.x])).toStrictEqual([
      ['snippet', 200],
    ]);
  });
});
```

  In `tests/unit/state.test.ts`: every `GameInput` literal of the test files gets
  `talk: false` — `NONE` here and in `overview.test.ts` (`NONE` and `ALL`), `notice.test.ts`
  and `player.test.ts`, and the two arrays of 600 recorded inputs here. Every `GameState`
  literal gets, after `shadowWalls`, `figures: [], dialogue: null, talkHeld: false,` — the four
  literals of `state.test.ts`, `FALLEN` and the woken state of `overview.test.ts`, and the
  helper `state` of `draw-scene.test.ts`. Add beside `WALLS_MAP`:

```ts
/** One standing figure and one snippet on open floor (0017). */
const FIGURES_MAP = loadMap(
  'tests/fixtures/maps/figures.tmj',
  'tests/fixtures/maps/fixture-tiles.tsj',
);
```

  and at the end of the file:

```ts
describe('standing figures in the state (0017)', () => {
  const TALK: GameInput = { ...NONE, talk: true };

  it('starts with one entry per figure of the map, facing down, no dialogue, the key not held', () => {
    const state = createInitialState(FIGURES_MAP);
    expect(state.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(state.dialogue).toBeNull();
    expect(state.talkHeld).toBe(false);
    expect(state.creatures).toHaveLength(1);
    expect(state.movers).toStrictEqual([]);
  });

  it('starts without figures on a map without figure points', () => {
    expect(createInitialState(MAP).figures).toStrictEqual([]);
  });

  it('refuses a map with a figure the cast does not have before the game starts', () => {
    const map = grassMap(20, 12, { x: 40, y: 152 }, [{ name: 'figure:cellar', x: 160, y: 96 }]);
    expect(() => createInitialState(map)).toThrow('figure point figure:cellar names no figure');
  });

  it('remembers in every step whether talk was held: an ordinary step and a step of the dark', () => {
    const start = createInitialState(MAP);
    const held = update(start, TALK, MAP);
    expect(held.talkHeld).toBe(true);
    expect(update(held, NONE, MAP).talkHeld).toBe(false);
    const dark = update({ ...start, dark: 1 }, TALK, MAP);
    expect(dark.dark).toBe(2);
    expect(dark.talkHeld).toBe(true);
    expect(update(dark, NONE, MAP).talkHeld).toBe(false);
  });

  it('keeps the figures through the wake', () => {
    let state: GameState = { ...createInitialState(FIGURES_MAP), dark: 44 };
    state = update(state, NONE, FIGURES_MAP);
    expect(state.dark).toBe(45);
    expect(state.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(state.dialogue).toBeNull();
  });

  it('survives a JSON round trip at the start (INV-1)', () => {
    const state = createInitialState(FIGURES_MAP);
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
  });
});
```

- [x] **Step 3: Run** `npx vitest run tests/unit/cast.test.ts tests/unit/state.test.ts` —
  expected: fails, the module does not exist.

- [x] **Step 4: Implement.** `src/game/state.ts`, before `Captured`:

```ts
/** A standing figure of the cast (0017). Its place stays in the map, its pages in game/cast. */
export interface FigureState {
  /** The index of the figure in `figuresOf(map.points)`. */
  readonly figure: number;
  /** Where it looks: `down` at the start, then to whoever spoke to it last. */
  readonly facing: Facing;
}

/** An open dialogue (0017). */
export interface Dialogue {
  /** The index of the figure that speaks. */
  readonly figure: number;
  /** The page shown, from 0. */
  readonly page: number;
}
```

  and in `GameState`, after `shadowWalls`:

```ts
  /** The standing figures of the map, in file order (0017). */
  readonly figures: readonly FigureState[];
  /** The dialogue that is open, or null. While it is open nothing else is stepped (0017). */
  readonly dialogue: Dialogue | null;
  /** Whether the last step's input held `talk`: a press is held now and not then (0017). */
  readonly talkHeld: boolean;
```

  `src/game/player.ts`, in `GameInput`:

```ts
/** Everything the game reads from the keys: the movement actions, `lamp`, on while Space is held (0007), and `talk`, on while E or Enter is held (0017). */
export interface GameInput extends MovementInput {
  readonly lamp: boolean;
  readonly talk: boolean;
}
```

  `src/game/cast.ts`:

```ts
import type { NamedPoint, Point } from '../engine/tiled';
import { type TextKey, textKey } from '../text/text';
import type { FigureState } from './state';

/**
 * The cast (world.md §3, feature 0017): the figures that can be spoken to and what they say.
 * Where a figure stands is a point of the map named `figure:<id>` (INV-7); who it is and its
 * pages are data here. Pure data and pure functions; the figures are read from the map's
 * points on every call and kept nowhere.
 */

/** A point whose name starts with this is where a figure stands; the rest of the name is its id. */
export const FIGURE_PREFIX = 'figure:';

export interface CastMember {
  /** Also the name of its sprite sheet, `<id>.png`. */
  readonly id: string;
  /** What it says, page by page; at least one. */
  readonly pages: readonly TextKey[];
}

export const CAST: readonly CastMember[] = [
  {
    id: 'officer',
    pages: [textKey('talk.officer-rules-1'), textKey('talk.officer-rules-2')],
  },
];

export function isFigurePoint(name: string): boolean {
  return name.startsWith(FIGURE_PREFIX);
}

/** A figure of the cast where the map puts it: the feet in map pixels. */
export interface Figure extends Point {
  readonly id: string;
  readonly pages: readonly TextKey[];
}

/**
 * The figures of a map, in the order of its points. Rejects an id the cast does not have and
 * a second point with the same id, so that a typing mistake in the map is not a silently
 * missing figure. A member of the cast without a point is simply not in this map.
 */
export function figuresOf(
  points: readonly NamedPoint[],
  cast: readonly CastMember[] = CAST,
): Figure[] {
  const figures: Figure[] = [];
  for (const point of points) {
    if (!isFigurePoint(point.name)) {
      continue;
    }
    const id = point.name.slice(FIGURE_PREFIX.length);
    const member = cast.find((candidate) => candidate.id === id);
    if (member === undefined) {
      throw new Error(`figure point ${point.name} names no figure`);
    }
    if (figures.some((figure) => figure.id === id)) {
      throw new Error(`more than one point object "${point.name}"`);
    }
    figures.push({ id, pages: member.pages, x: point.x, y: point.y });
  }
  return figures;
}

/** Every figure of the map looking down: the figures a game starts with. */
export function figuresFrom(figures: readonly Figure[]): FigureState[] {
  return figures.map((_figure, figure) => ({ figure, facing: 'down' }));
}
```

  `src/game/mover.ts`: import `isFigurePoint` from `./cast`, and

```ts
/** A route point has a colon in its name and is no figure point (0017); every other point is a creature's, a figure's or `wake`. */
export function isRoutePoint(name: string): boolean {
  return name.includes(':') && !isFigurePoint(name);
}
```

  `src/game/creature.ts`, in `creaturesFrom`: import `isFigurePoint` and filter with
  `point.name !== WAKE_POINT && !isRoutePoint(point.name) && !isFigurePoint(point.name)`;
  name the figure points in its comment. `src/game/update.ts`: import `figuresFrom` and
  `figuresOf` from `./cast`. In `createInitialState`, after `const walls = …`,
  `const figures = figuresOf(map.points);`, and in the returned state, after `shadowWalls`:

```ts
    figures: figuresFrom(figures),
    dialogue: null,
    talkHeld: false,
```

  In `update`, the dark becomes

```ts
  if (state.dark > 0) {
    return { ...stepDark(state, content), talkHeld: input.talk };
  }
```

  and the returned state of the ordinary step gets, after `shadowWalls`:

```ts
    figures: state.figures,
    dialogue: null,
    talkHeld: input.talk,
```

  Extend both comments by the figures and the remembered key. `src/game/overview.ts`, in
  `woken`, after `shadowWalls`: `figures: state.figures, dialogue: null, talkHeld:
  state.talkHeld,`. `src/main.ts`: the table gets `talk: ['KeyE', 'Enter'],` after `lamp`, and
  `readInput` returns `talk` with the others.

- [x] **Step 5: Run** `npm run check` — expected: green. Every remaining type error is a
  `GameInput` or `GameState` literal in a test that needs a new field.

- [x] **Step 6: Commit** — `Add the cast and the fields talking needs`, body: a figure's place
  is map truth and its words are data; the state remembers the key so that a press needs no
  change to the keyboard and stays testable in a pure step.

---

### Task 3: Talking

**Files:**
- Create: `src/game/talk.ts`, `tests/unit/talk.test.ts`
- Modify: `src/game/update.ts`

**Interfaces:**
- Consumes: `Figure`, `figuresOf` (T2); `GameInput.talk`, `Dialogue`, `FigureState`, the three
  fields (T2).
- Produces: `TALK_DISTANCE` (24), `talkPressed(state, input): boolean`,
  `facingToward(from: Point, to: Point, current: Facing): Facing`,
  `figureInReach(player: Point, figures: readonly Figure[]): number | null`,
  `openDialogue(state, input, figures): GameState | null`,
  `stepDialogue(state, dialogue, input, figures): GameState`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/talk.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NamedPoint, NamedRect, TileMap } from '../../src/engine/tiled';
import type { Figure } from '../../src/game/cast';
import type { GameInput } from '../../src/game/player';
import type { Facing, GameState } from '../../src/game/state';
import {
  facingToward,
  figureInReach,
  openDialogue,
  TALK_DISTANCE,
  talkPressed,
} from '../../src/game/talk';
import { createInitialState, update } from '../../src/game/update';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

const NONE: GameInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  lamp: false,
  talk: false,
};
const TALK: GameInput = { ...NONE, talk: true };
const RIGHT: GameInput = { ...NONE, right: true };
const OFFICER: NamedPoint = { name: 'figure:officer', x: 160, y: 96 };
/** 20x12 cells of open floor with the officer at (160, 96) and the player at (x, y). */
const mapAt = (
  x: number,
  y: number,
  points: readonly NamedPoint[] = [OFFICER],
  rects: readonly NamedRect[] = [],
): TileMap => grassMap(20, 12, { x, y }, points, rects);
const run = (map: TileMap, start: GameState, ...inputs: readonly GameInput[]): GameState =>
  inputs.reduce((state, input) => update(state, input, map), start);
const figure = (x: number, y: number, id = 'officer'): Figure => ({
  id,
  x,
  y,
  pages: [textKey('talk.officer-rules-1')],
});

describe('the press of talk (0017)', () => {
  it('is seen in exactly one of 600 steps with the key held', () => {
    const map = mapAt(40, 40, []);
    let state = createInitialState(map);
    let presses = 0;
    for (let step = 0; step < 600; step += 1) {
      presses += talkPressed(state, TALK) ? 1 : 0;
      state = update(state, TALK, map);
    }
    expect(presses).toBe(1);
  });

  it('is seen again after a step without the key', () => {
    const map = mapAt(40, 40, []);
    const held = run(map, createInitialState(map), TALK, TALK);
    expect(talkPressed(held, TALK)).toBe(false);
    const released = update(held, NONE, map);
    expect(talkPressed(released, TALK)).toBe(true);
    expect(talkPressed(released, NONE)).toBe(false);
  });

  it('is not seen after the dark by a key held through it', () => {
    const map = mapAt(40, 40, []);
    const dark = update({ ...createInitialState(map), dark: 88 }, TALK, map);
    expect(dark.dark).toBe(89);
    expect(talkPressed(dark, TALK)).toBe(false);
  });
});

describe('who can be talked to (0017)', () => {
  it('is 24 px', () => {
    expect(TALK_DISTANCE).toBe(24);
  });

  it('is the nearest figure within reach, the first of two equally near, none beyond', () => {
    const figures = [figure(160, 96, 'a'), figure(200, 96, 'b')];
    expect(figureInReach({ x: 184, y: 96 }, figures)).toBe(1);
    expect(figureInReach({ x: 180, y: 96 }, figures)).toBe(0);
    expect(figureInReach({ x: 136, y: 96 }, figures)).toBe(0);
    expect(figureInReach({ x: 135.9, y: 96 }, figures)).toBeNull();
    expect(figureInReach({ x: 184, y: 96 }, [])).toBeNull();
  });

  it('looks along the line to the other: sideways when that distance is the larger one', () => {
    const at = { x: 100, y: 100 };
    expect(facingToward(at, { x: 110, y: 104 }, 'up')).toBe('right');
    expect(facingToward(at, { x: 90, y: 104 }, 'up')).toBe('left');
    expect(facingToward(at, { x: 104, y: 110 }, 'up')).toBe('down');
    expect(facingToward(at, { x: 104, y: 90 }, 'down')).toBe('up');
    expect(facingToward(at, { x: 110, y: 110 }, 'up')).toBe('down');
    expect(facingToward(at, { x: 110, y: 90 }, 'down')).toBe('up');
    expect(facingToward(at, at, 'left')).toBe('left');
  });
});

describe('opening a dialogue (0017)', () => {
  it('opens on page 0 at 24 px: both turn, the player stands, the lamp is off, nothing moves', () => {
    const map = mapAt(184, 96);
    const start = createInitialState(map);
    const opened = update(start, TALK, map);
    expect(opened).toStrictEqual({
      ...start,
      tick: 1,
      talkHeld: true,
      player: { ...start.player, facing: 'left' },
      figures: [{ figure: 0, facing: 'right' }],
      dialogue: { figure: 0, page: 0 },
    });
  });

  it('does not open at 24.1 px: the step is an ordinary one', () => {
    const map = mapAt(184.1, 96);
    const next = update(createInitialState(map), TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.talkHeld).toBe(true);
    expect(next.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
    expect(next.player.facing).toBe('down');
  });

  it('does not open while the lamp is held', () => {
    const map = mapAt(184, 96);
    const next = update(createInitialState(map), { ...TALK, lamp: true }, map);
    expect(next.dialogue).toBeNull();
    expect(next.lamp.on).toBe(true);
  });

  it('does not open during a push, and not after it by the key still held', () => {
    const map = mapAt(184, 96);
    const start = createInitialState(map);
    const pushed: GameState = {
      ...start,
      player: { ...start.player, recoil: { dx: -3, dy: 0, steps: 1 } },
    };
    const next = update(pushed, TALK, map);
    expect(next.dialogue).toBeNull();
    expect(next.player.x).toBe(181);
    expect(update(next, TALK, map).dialogue).toBeNull();
    expect(run(map, next, NONE, TALK).dialogue).toStrictEqual({ figure: 0, page: 0 });
  });

  it.each<readonly [number, number, Facing, Facing]>([
    [184, 96, 'left', 'right'],
    [136, 96, 'right', 'left'],
    [160, 120, 'up', 'down'],
    [160, 72, 'down', 'up'],
    [178, 110, 'left', 'right'],
    [160, 96, 'down', 'down'],
  ])('from (%d, %d) the player looks %s and she looks %s', (x, y, player, officer) => {
    const map = mapAt(x, y);
    const opened = update(createInitialState(map), TALK, map);
    expect(opened.dialogue).toStrictEqual({ figure: 0, page: 0 });
    expect(opened.player.facing).toBe(player);
    expect(opened.figures).toStrictEqual([{ figure: 0, facing: officer }]);
  });

  it('stands a walking player still: phase 0, timer 0', () => {
    const map = mapAt(170, 96);
    const walking = run(map, createInitialState(map), RIGHT, RIGHT, RIGHT);
    expect(walking.player.frame).toBe(1);
    const opened = update(walking, TALK, map);
    expect([opened.player.frame, opened.player.frameTimer]).toStrictEqual([0, 0]);
    expect(opened.player.x).toBe(walking.player.x);
  });

  it('turns only the figure that speaks', () => {
    const map = mapAt(184, 96);
    const state: GameState = {
      ...createInitialState(map),
      figures: [
        { figure: 0, facing: 'down' },
        { figure: 1, facing: 'down' },
      ],
    };
    const opened = openDialogue(state, TALK, [figure(160, 96, 'a'), figure(200, 96, 'b')]);
    expect(opened?.dialogue).toStrictEqual({ figure: 1, page: 0 });
    expect(opened?.figures).toStrictEqual([
      { figure: 0, facing: 'down' },
      { figure: 1, facing: 'left' },
    ]);
    expect(opened?.player.facing).toBe('right');
  });
});

describe('the pages of a dialogue (0017)', () => {
  const map = mapAt(184, 96);
  const opened = update(createInitialState(map), TALK, map);

  it('stays on its page while the key is held, and turns with the next press', () => {
    expect(run(map, opened, TALK, TALK).dialogue).toStrictEqual({ figure: 0, page: 0 });
    const released = update(opened, NONE, map);
    expect(released.dialogue).toStrictEqual({ figure: 0, page: 0 });
    expect(released.talkHeld).toBe(false);
    expect(update(released, TALK, map).dialogue).toStrictEqual({ figure: 0, page: 1 });
  });

  it('closes with a press on the last page; she keeps her facing; the next step is an ordinary one', () => {
    const closed = run(map, opened, NONE, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    expect(closed.tick).toBe(5);
    expect(closed.figures).toStrictEqual([{ figure: 0, facing: 'right' }]);
    expect(closed.player.x).toBe(184);
    const walked = run(map, closed, NONE, RIGHT);
    expect(walked.player.x).toBeCloseTo(184 + 80 / 60, 6);
  });

  it('survives a JSON round trip on page 1 (INV-1)', () => {
    const second = run(map, opened, NONE, TALK);
    expect(second.dialogue).toStrictEqual({ figure: 0, page: 1 });
    expect(JSON.parse(JSON.stringify(second))).toStrictEqual(second);
  });
});

describe('the world while a dialogue is open (0017)', () => {
  /** A snippet 30 px from the player, a dog on its route and a wall that was giving way. */
  const map = mapAt(
    184,
    96,
    [
      OFFICER,
      { name: 'snippet', x: 214, y: 96 },
      { name: 'dog:hr:1', x: 40, y: 152 },
      { name: 'dog:hr:2', x: 104, y: 152 },
    ],
    [{ name: 'shadow:marketing', x: 128, y: 160, width: 48, height: 4 }],
  );
  const start: GameState = {
    ...createInitialState(map),
    shadowWalls: [{ wall: 0, lit: true, light: 30 }],
  };
  const ALL_BUT_TALK: GameInput = {
    up: true,
    down: true,
    left: true,
    right: true,
    lamp: true,
    talk: false,
  };

  it('is not stepped in the step that opens it', () => {
    const opened = update(start, TALK, map);
    expect(opened.dialogue).toStrictEqual({ figure: 0, page: 0 });
    expect(opened.creatures).toStrictEqual(start.creatures);
    expect(opened.movers).toStrictEqual(start.movers);
    expect(opened.shadowWalls).toStrictEqual(start.shadowWalls);
  });

  it('stands still for 600 steps with every other key held: only the tick grows', () => {
    const opened = update(start, TALK, map);
    let state = opened;
    for (let step = 0; step < 600; step += 1) {
      state = update(state, ALL_BUT_TALK, map);
    }
    expect(state).toStrictEqual({ ...opened, tick: opened.tick + 600, talkHeld: false });
  });

  it('moves again once it is closed', () => {
    const opened = update(start, TALK, map);
    const closed = run(map, opened, NONE, TALK, NONE, TALK);
    expect(closed.dialogue).toBeNull();
    const later = run(map, closed, NONE, NONE);
    expect(later.creatures[0]?.x).toBeLessThan(214);
    expect(later.movers).not.toStrictEqual(closed.movers);
  });
});

describe('a game without figures (0017)', () => {
  it('steps as before when talk is never held: 600 recorded steps', () => {
    const withFigure = mapAt(40, 152, [OFFICER, { name: 'snippet', x: 200, y: 152 }]);
    const without = mapAt(40, 152, [{ name: 'snippet', x: 200, y: 152 }]);
    const inputs = Array.from({ length: 600 }, (_, i) => ({
      up: i % 240 >= 180,
      down: i % 240 >= 60 && i % 240 < 120,
      left: i % 240 >= 120 && i % 240 < 180,
      right: i % 240 < 60,
      lamp: i % 97 < 20,
      talk: false,
    }));
    let a = createInitialState(withFigure);
    let b = createInitialState(without);
    for (const input of inputs) {
      a = update(a, input, withFigure);
      b = update(b, input, without);
    }
    expect({ ...a, figures: [] }).toStrictEqual(b);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/talk.test.ts` — expected: fails, the module
  does not exist.

- [ ] **Step 3: Implement** `src/game/talk.ts`:

```ts
import type { Point } from '../engine/tiled';
import type { Figure } from './cast';
import type { GameInput } from './player';
import type { Dialogue, Facing, GameState } from './state';

/**
 * Talking (gameplay.md §8, feature 0017). A press of `talk` next to a standing figure opens a
 * dialogue: the two turn to each other and the figure's first page is shown. A press turns to
 * the next page; a press on the last page closes the dialogue. While it is open nothing in
 * the world is stepped — time passes, and that is all. Pure data and pure functions.
 */

/** Tune: a tile and a half between the feet of the two. */
export const TALK_DISTANCE = 24;

/**
 * Whether `talk` is pressed in this step: the input holds it and the last step's did not. The
 * keyboard keeps no press (architecture.md §4), so the state does, in `talkHeld`.
 */
export function talkPressed(state: GameState, input: GameInput): boolean {
  return input.talk && !state.talkHeld;
}

/**
 * Where one looks whose feet are at `from` when the other's are at `to`: left or right when
 * the horizontal distance is the larger one, up or down otherwise, and `current` when both
 * stand on the same spot.
 */
export function facingToward(from: Point, to: Point, current: Facing): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) {
    return current;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

/**
 * The index of the figure a press speaks to: the nearest whose feet are at most TALK_DISTANCE
 * from the player's, the first in the map's order of two equally near; null when none is.
 */
export function figureInReach(player: Point, figures: readonly Figure[]): number | null {
  let nearest: number | null = null;
  let reach = TALK_DISTANCE;
  for (const [index, figure] of figures.entries()) {
    const distance = Math.hypot(figure.x - player.x, figure.y - player.y);
    if (distance <= reach && (nearest === null || distance < reach)) {
      nearest = index;
      reach = distance;
    }
  }
  return nearest;
}

/**
 * The state after a press that opens a dialogue, or null when this step opens none: `talk` is
 * not pressed, the lamp is held, the player is being pushed, or no figure is in reach. The
 * player and the figure turn to each other, the player stands, the lamp is off; nothing else
 * is stepped.
 */
export function openDialogue(
  state: GameState,
  input: GameInput,
  figures: readonly Figure[],
): GameState | null {
  if (!talkPressed(state, input) || input.lamp || state.player.recoil.steps > 0) {
    return null;
  }
  const { player } = state;
  const index = figureInReach(player, figures);
  const figure = index === null ? undefined : figures[index];
  if (index === null || figure === undefined) {
    return null;
  }
  return {
    ...state,
    tick: state.tick + 1,
    talkHeld: true,
    player: {
      ...player,
      facing: facingToward(player, figure, player.facing),
      frame: 0,
      frameTimer: 0,
    },
    lamp: { on: false, strength: state.lamp.strength },
    figures: state.figures.map((standing) =>
      standing.figure === index
        ? { figure: index, facing: facingToward(figure, player, standing.facing) }
        : standing,
    ),
    dialogue: { figure: index, page: 0 },
  };
}

/**
 * One step with a dialogue open: the tick grows, the key is remembered, and a press turns to
 * the next page or, on the last page, closes the dialogue. Nothing else changes.
 */
export function stepDialogue(
  state: GameState,
  dialogue: Dialogue,
  input: GameInput,
  figures: readonly Figure[],
): GameState {
  const pages = figures[dialogue.figure]?.pages.length ?? 0;
  const page = talkPressed(state, input) ? dialogue.page + 1 : dialogue.page;
  return {
    ...state,
    tick: state.tick + 1,
    talkHeld: input.talk,
    dialogue: page < pages ? { figure: dialogue.figure, page } : null,
  };
}
```

  `figureInReach`: the first figure at exactly the same distance keeps its place, because a
  later one must be strictly nearer. `src/game/update.ts`: import `openDialogue` and
  `stepDialogue` from `./talk`; after the dark and before the lamp:

```ts
  const figures = figuresOf(content.points);
  if (state.dialogue !== null) {
    return stepDialogue(state, state.dialogue, input, figures);
  }
  const opened = openDialogue(state, input, figures);
  if (opened !== null) {
    return opened;
  }
```

  Extend the comment of `update`: with a dialogue open the step is the dialogue's and nothing
  else; a press of `talk` next to a figure opens one instead of an ordinary step (0017).

- [ ] **Step 4: Run** `npm run check` — expected: green. In the test of the opening at 24 px
  the whole state is compared: if a field differs that the spec does not name, the step
  stepped something it must not.

- [ ] **Step 5: Commit** — `Open, turn and close a dialogue`, body: reading must be safe, so a
  dialogue stops the world instead of racing it; the press is derived from the remembered key,
  so a held key turns one page however many steps a frame runs.

---

### Task 4: The officer on the floor

**Files:**
- Modify: `tools/floor-layout.ts`, `public/maps/floor.tmj` (generated)
- Test: `tests/unit/floor.test.ts`

**Interfaces:**
- Consumes: `figuresOf` (T2), `TALK_DISTANCE` (T3).
- Produces: `FIGURES` in `tools/floor-layout.ts`; one more point object in `floor.tmj`.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/floor.test.ts`: import `figuresOf`
  from `../../src/game/cast`, `TALK_DISTANCE` from `../../src/game/talk` and `FIGURES` from
  `../../tools/floor-layout.ts`. Change the tests that count objects: in `keeps the five points
  of 0010 first, with their ids` the ids become `Array.from({ length: 100 }, (_, i) => i + 1)`
  and `nextobjectid` `101`; in the test of the eight rectangles of 0014 the two
  `objects.slice(91)` become `objects.slice(91, 99)` and `floor.points` has length `91`. Add
  at the end of the file:

```ts
describe('the standing figures of the floor (0017)', () => {
  const OFFICER = { x: 264, y: 472 };
  const figures = figuresOf(floor.points);

  it('holds the point figure:officer after the rectangles, with the id 100', () => {
    expect(FIGURES).toStrictEqual([{ id: 'officer', at: OFFICER }]);
    expect(floor.points.at(-1)).toStrictEqual({ name: 'figure:officer', ...OFFICER });
    const objects = floorJson().layers[3].objects;
    expect(objects).toHaveLength(100);
    const last = objects.at(-1);
    expect([last?.id, last?.name, last?.x, last?.y]).toStrictEqual([100, 'figure:officer', 264, 472]);
    expect(last !== undefined && 'point' in last).toBe(true);
    expect(floorJson().nextobjectid).toBe(101);
  });

  it('gives the floor one figure, the officer, with her two pages', () => {
    expect(figures.map((figure) => [figure.id, figure.x, figure.y, figure.pages.length])).toStrictEqual(
      [['officer', 264, 472, 2]],
    );
    expect(createInitialState(floor).figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
  });

  it("stands in the middle of tile (16, 29), in the data protection officer's office", () => {
    expect([(OFFICER.x - 8) / 16, (OFFICER.y - 8) / 16]).toStrictEqual([16, 29]);
    const office = ROOMS.find((room) => room.name === "data protection officer's office");
    expect(office?.cells).toStrictEqual({ c0: 1, c1: 22, r0: 26, r1: 37 });
  });

  it('is free of every solid box and reached on foot from the spawn', () => {
    expect(blocked(boxAt(OFFICER))).toBe(false);
    expect(reached(OFFICER)).toBe(true);
  });

  it('lies in the view of the wake point, and out of reach of it', () => {
    const camera = cameraFor({ x: WAKE.x, y: WAKE.y - 4 }, MAP_PX);
    expect(camera).toStrictEqual({ x: 136, y: 410 });
    expect(OFFICER.x - 8).toBeGreaterThanOrEqual(camera.x);
    expect(OFFICER.x + 8).toBeLessThanOrEqual(camera.x + 320);
    expect(OFFICER.y - 24).toBeGreaterThanOrEqual(camera.y);
    expect(OFFICER.y).toBeLessThanOrEqual(camera.y + 180);
    expect(Math.hypot(WAKE.x - OFFICER.x, WAKE.y - OFFICER.y)).toBeGreaterThan(TALK_DISTANCE);
  });

  it('has no route passing within reach of her', () => {
    for (const route of routesOf(floor.points)) {
      route.points.forEach((from, i) => {
        const to = route.points[(i + 1) % route.points.length] ?? from;
        // The legs are horizontal or vertical: the nearest point of a leg is a clamp.
        const x = Math.min(Math.max(OFFICER.x, Math.min(from.x, to.x)), Math.max(from.x, to.x));
        const y = Math.min(Math.max(OFFICER.y, Math.min(from.y, to.y)), Math.max(from.y, to.y));
        expect(
          Math.hypot(x - OFFICER.x, y - OFFICER.y),
          `${route.name} leg ${i + 1}`,
        ).toBeGreaterThan(TALK_DISTANCE);
      });
    }
  });
});
```

  `blocked`, `boxAt`, `reached`, `cameraFor`, `MAP_PX`, `WAKE`, `ROOMS`, `routesOf`,
  `floorJson` and `createInitialState` are already imported or declared in the file.

- [ ] **Step 2: Run** `npx vitest run tests/unit/floor.test.ts` — expected: the new tests fail
  (`FIGURES` does not exist).

- [ ] **Step 3: Implement** in `tools/floor-layout.ts`. After `SHADOW_WALLS` and its helper:

```ts
/**
 * The standing figures (0017): per figure its id in the cast and its feet in pixels. The
 * data protection officer stands in the middle of tile (16, 29), in her office — two tiles
 * left of and two above the wake point, in the view when the player wakes.
 */
export const FIGURES: readonly { readonly id: string; readonly at: Point }[] = [
  { id: 'officer', at: { x: 264, y: 472 } },
];
```

  In `floorJson`: `const firstFigure = firstWall + SHADOW_WALLS.length;`; after the rectangles
  in `objects`:

```ts
          ...FIGURES.map((figure, i) =>
            pointObject(firstFigure + i, `figure:${figure.id}`, figure.at),
          ),
```

  and `nextobjectid: firstFigure + FIGURES.length,`. Extend the file's head comment by the
  standing figures of 0017.

- [ ] **Step 4: Generate** — `npm run gen-floor`. Then check that only one object was added:
  `git diff -U0 public/maps/floor.tmj | grep -c '^[-+] *"data"'` prints `0`, and the diff
  shows the new point, the comma after the last rectangle and `nextobjectid`.

- [ ] **Step 5: Run** `npm run check` and `npm run test:e2e` — expected: green. Her place was
  checked against the map when the spec was written: the cell is free, reached from the spawn
  and in the wake's view. If one of these fails, stop and ask; do not move her.

- [ ] **Step 6: Commit** — `Put the data protection officer into her office`, body: she is the
  first of the cast who can be spoken to, and she stands where the player wakes, so the first
  thing seen after the dark is somebody to ask.

---

### Task 5: Her sheet

**Files:**
- Modify: `tools/placeholder-person.ts`, `tools/gen-sprites.ts`
- Create: `public/sprites/officer.png` (generated)
- Test: `tests/unit/gen-sprites.test.ts`, `tests/unit/assets.test.ts`

**Interfaces:**
- Produces: `OFFICER_SHIRT` (`#c0cbdc`), `renderFigure(shirt: PaletteColour): Uint8Array` in
  `tools/placeholder-person.ts`; `encodeOfficerPng(): Buffer` in `tools/gen-sprites.ts`.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/gen-sprites.test.ts` import
  `encodeOfficerPng`, `OFFICER_SHIRT` and `renderFigure`, and add inside the `describe` of the
  movers' sheets — it has the helpers `file` and `read`:

```ts
  it('officer.png equals its generator and is the player in a light grey shirt, without the lanyard (0017)', () => {
    const png = read('officer.png');
    expect([png.width, png.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
    expect(encodeOfficerPng().equals(file('officer.png'))).toBe(true);
    expect(OFFICER_SHIRT).toBe('#c0cbdc');
    expect(PERSON_SHIRTS).not.toContain(OFFICER_SHIRT);
    expect(OFFICER_SHIRT).not.toBe(INKS.T);
    const officer = renderFigure(OFFICER_SHIRT);
    const player = renderPlayer();
    const shirt = [...rgb(OFFICER_SHIRT), 255].join();
    const playerShirt = [...rgb(INKS.T), 255].join();
    const lanyard = [...rgb(INKS.L), 255].join();
    for (let i = 0; i < player.length; i += 4) {
      const was = [...player.slice(i, i + 4)].join();
      const is = [...officer.slice(i, i + 4)].join();
      expect(is).toBe(was === playerShirt || was === lanyard ? shirt : was);
    }
  });

  it('a person is a figure in its shirt: the two generators agree', () => {
    for (const [look, shirt] of PERSON_SHIRTS.entries()) {
      expect(Buffer.from(renderPerson(look)).equals(Buffer.from(renderFigure(shirt)))).toBe(true);
    }
  });
```

  In `tests/unit/assets.test.ts` add:

```ts
  it('checks the officer sheet under public/sprites/ with every other PNG (0017)', () => {
    expect(globSync('public/**/*.png', { cwd: ROOT })).toContain('public/sprites/officer.png');
  });
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/gen-sprites.test.ts` — expected: fails,
  `renderFigure` does not exist.

- [ ] **Step 3: Implement.** In `tools/placeholder-person.ts` move the body of `renderPerson`
  into `renderFigure` and keep `renderPerson` as its caller:

```ts
/** The data protection officer's shirt (0017): light grey, the colour of no other shirt. */
export const OFFICER_SHIRT: PaletteColour = '#c0cbdc';

/** The player's twenty frames in a shirt of `shirt`, without the lanyard. RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes. */
export function renderFigure(shirt: PaletteColour): Uint8Array {
  const colours = new Map<string, PaletteColour>(Object.entries({ ...INKS, T: shirt, L: shirt }));
  const data = new Uint8Array(SHEET_WIDTH * SHEET_HEIGHT * 4);
  for (const [f, facing] of FACINGS.entries()) {
    for (let phase = 0; phase < PHASES_PER_FACING; phase += 1) {
      const n = f * PHASES_PER_FACING + phase;
      for (const [y, row] of frameRows(facing, phase).entries()) {
        for (const [x, letter] of [...row].entries()) {
          const colour = colours.get(letter);
          if (colour !== undefined && x < FRAME_WIDTH && y < FRAME_HEIGHT) {
            data.set([...rgb(colour), 255], (y * SHEET_WIDTH + n * FRAME_WIDTH + x) * 4);
          }
        }
      }
    }
  }
  return data;
}

/** A colleague who walks (0015): the figure of look `look`'s shirt. */
export function renderPerson(look: number): Uint8Array {
  const shirt = PERSON_SHIRTS[look];
  if (shirt === undefined) {
    throw new Error(`person ${look} has no shirt`);
  }
  return renderFigure(shirt);
}
```

  Extend the file's head comment by the officer. `tools/gen-sprites.ts`: import
  `OFFICER_SHIRT` and `renderFigure`, add

```ts
/** The data protection officer (0017): the first figure of the cast with a sheet of its own. */
export function encodeOfficerPng(): Buffer {
  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
  png.data = Buffer.from(renderFigure(OFFICER_SHIRT));
  return PNG.sync.write(png);
}
```

  write `public/sprites/officer.png` in the main block, and name the file in the head comment.

- [ ] **Step 4: Generate** — `npm run gen-sprites`; `git status --short public/sprites` shows
  one new file and no changed one: the four person sheets are byte for byte what they were.

- [ ] **Step 5: Run** `npm run check` — expected: green.

- [ ] **Step 6: Commit** — `Draw the data protection officer`, body: she must be told from the
  colleagues who walk at a glance; a shirt no one else wears does that until the art pass.

---

### Task 6: The figures and the box in the scene

**Files:**
- Modify: `src/render/draw-scene.ts`, `src/main.ts`
- Test: `tests/unit/draw-scene.test.ts`

**Interfaces:**
- Consumes: `figuresOf`, `Figure`, `CAST` (T2); `FigureState`, `Dialogue` (T2); `drawText`,
  `LINE_PITCH` (T1).
- Produces: `SceneContent.figureSheets: Readonly<Record<string, SpriteSheet>>`;
  `DIALOGUE_BOX`, `DIALOGUE_TEXT`, `DIALOGUE_LINES` (3), `DIALOGUE_LINE_CAPACITY` (47),
  `DIALOGUE_MARKER`, `MARKER_BLINK_STEPS` (30), `markerVisible(tick): boolean`,
  `figureFrame(figure: FigureState): number`, `figureOrigin(at: Point, camera: Point): Point`.

- [ ] **Step 1: Write the failing tests.** In `tests/unit/draw-scene.test.ts`: `CONTENT` gets
  `figureSheets: { officer: { image: {} as ImageBitmap, frameWidth: 16, frameHeight: 24 } },`;
  import the names above, `GLYPH_WIDTH` from `../../src/render/font` and `type FigureState`;
  add at the end:

```ts
describe('the standing figures in the scene (0017)', () => {
  /** The officer at (40, y) on the 3x2 map; the player stands at (20, 30). */
  const withOfficer = (y: number): SceneContent => ({
    ...CONTENT,
    map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y }] },
  });
  const standing = (facing: FigureState['facing']): FigureState => ({ figure: 0, facing });
  const snippet = { species: 'snippet', x: 60, y: 25, light: 0, home: { x: 0, y: 0 } } as const;

  it('shows a figure standing: the frame is facing × 5', () => {
    expect(
      (['down', 'up', 'left', 'right'] as const).map((facing) => figureFrame(standing(facing))),
    ).toStrictEqual([0, 5, 10, 15]);
  });

  it('puts the frame so that the feet are its bottom centre, shifted by the camera', () => {
    expect(figureOrigin({ x: 40, y: 20 }, { x: 0, y: 0 })).toStrictEqual({ x: 32, y: -4 });
    expect(figureOrigin({ x: 264, y: 472 }, { x: 136, y: 410 })).toStrictEqual({ x: 120, y: 38 });
  });

  it('draws a figure at or above the player after the ground movers of that group and before the creatures', () => {
    const renderer = recordingRenderer();
    const content = withOfficer(20);
    drawScene(
      renderer,
      {
        ...state({ x: 20, y: 30 }),
        movers: [mover({ kind: 'dog', x: 60, y: 10 })],
        creatures: [snippet],
        figures: [standing('left')],
      },
      content,
    );
    expect(renderer.sheets).toStrictEqual([
      content.moverSheets.dog,
      content.figureSheets.officer,
      content.creatureSheets.snippet,
      content.playerSheet,
    ]);
    expect(renderer.calls).toContain('drawSprite 10 at 32,-4');
  });

  it('draws a figure below the player after the player and before the other ground movers', () => {
    const renderer = recordingRenderer();
    const content = withOfficer(40);
    drawScene(
      renderer,
      {
        ...state({ x: 20, y: 30 }),
        movers: [mover({ kind: 'dog', x: 60, y: 50 })],
        creatures: [snippet],
        figures: [standing('down')],
      },
      content,
    );
    expect(renderer.sheets).toStrictEqual([
      content.creatureSheets.snippet,
      content.playerSheet,
      content.figureSheets.officer,
      content.moverSheets.dog,
    ]);
    expect(renderer.calls).toContain('drawSprite 0 at 32,16');
  });

  it('draws no figure the map does not have', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...state({ x: 20, y: 30 }), figures: [standing('down')] }, CONTENT);
    expect(renderer.sheets).toStrictEqual([CONTENT.playerSheet]);
  });
});

describe('the dialogue box in the scene (0017)', () => {
  const content: SceneContent = {
    ...CONTENT,
    map: { ...MAP, points: [{ name: 'figure:officer', x: 40, y: 20 }] },
  };
  const talking = (page: number, tick = 0): GameState => ({
    ...state({ x: 20, y: 30 }),
    tick,
    figures: [{ figure: 0, facing: 'left' }],
    dialogue: { figure: 0, page },
    overview: { current: 1, max: 2 },
  });
  const BOX = 'fillRect 8,134 304x42 #181425';
  const MARKER = [
    'fillRect 299,169 5x1 #ffffff',
    'fillRect 300,170 3x1 #ffffff',
    'fillRect 301,171 1x1 #ffffff',
  ];
  const spritesOn = (renderer: ReturnType<typeof recordingRenderer>, sheet: unknown): string[] =>
    renderer.calls
      .filter((call) => call.startsWith('drawSprite'))
      .filter((_call, i) => renderer.sheets[i] === sheet);

  it('places the box, the lines and the marker as the spec says', () => {
    expect(DIALOGUE_BOX).toStrictEqual({ x: 8, y: 134, width: 304, height: 42 });
    expect(DIALOGUE_TEXT).toStrictEqual({ x: 12, y: 138 });
    expect([DIALOGUE_LINES, DIALOGUE_LINE_CAPACITY, MARKER_BLINK_STEPS]).toStrictEqual([3, 47, 30]);
    expect(DIALOGUE_MARKER).toStrictEqual([
      { x: 299, y: 169, width: 5, height: 1 },
      { x: 300, y: 170, width: 3, height: 1 },
      { x: 301, y: 171, width: 1, height: 1 },
    ]);
    // The same bottom edge as the notice's bar, and the longest line ends left of the marker.
    expect(DIALOGUE_BOX.y + DIALOGUE_BOX.height).toBe(NOTICE_BAR.y + NOTICE_BAR.height);
    expect(DIALOGUE_TEXT.x + DIALOGUE_LINE_CAPACITY * GLYPH_WIDTH).toBeLessThan(299);
  });

  it('blinks the marker once a second: on for 30 steps, off for 30', () => {
    expect([0, 29, 30, 59, 60].map(markerVisible)).toStrictEqual([true, true, false, false, true]);
  });

  it('draws the box, the first page and the marker after the hearts', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, talking(0), content);
    const box = renderer.calls.indexOf(BOX);
    expect(box).toBeGreaterThan(renderer.calls.indexOf('drawSprite 1 at 14,4'));
    const after = renderer.calls.slice(box + 1);
    expect(after).toHaveLength(96 + 3);
    expect(after[0]).toBe('drawSprite 36 at 12,138');
    expect(after[28]).toBe('drawSprite 37 at 12,150');
    expect(after[64]).toBe('drawSprite 40 at 12,162');
    expect(after.slice(-3)).toStrictEqual(MARKER);
    expect(spritesOn(renderer, content.fontSheet)).toHaveLength(96);
  });

  it('draws the second page, and no marker in the second half second', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, talking(1, 30), content);
    const after = renderer.calls.slice(renderer.calls.indexOf(BOX) + 1);
    expect(after).toHaveLength(86);
    expect(after[0]).toBe('drawSprite 45 at 12,138');
    expect(renderer.calls.some((call) => call.endsWith('#ffffff'))).toBe(false);
  });

  it('draws the page in English when the language is `en`', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, talking(0), { ...content, language: 'en' });
    const line = spritesOn(renderer, content.fontSheet);
    expect(line).toHaveLength(82);
    expect(line[0]).toBe('drawSprite 51 at 12,138');
  });

  it('draws the lids over the box', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, talking(0, 30), content);
    drawScene(renderer, { ...talking(0, 30), dark: 10 }, content);
    expect(renderer.calls.slice(-2)).toStrictEqual([
      'fillRect 0,0 320x30 #181425',
      'fillRect 0,150 320x30 #181425',
    ]);
  });

  it('draws no box without a dialogue', () => {
    const renderer = recordingRenderer();
    drawScene(renderer, { ...talking(0), dialogue: null }, content);
    expect(renderer.calls).not.toContain(BOX);
    expect(spritesOn(renderer, content.fontSheet)).toStrictEqual([]);
  });

  it('holds every page of the table to the box: its lines and their length', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(TABLE[language])) {
        if (key.startsWith('talk.')) {
          const lines = text.split('\n');
          expect(lines.length, `${language} ${key}`).toBeLessThanOrEqual(DIALOGUE_LINES);
          expect(
            Math.max(...lines.map((line) => line.length)),
            `${language} ${key}`,
          ).toBeLessThanOrEqual(DIALOGUE_LINE_CAPACITY);
        }
      }
    }
  });
});
```

  `mover`, `LANGUAGES`, `TABLE` and `NOTICE_BAR` are already in the file. The frames: `D` is
  36, `E` 37, `H` 40, `M` 45, `S` 51.

- [ ] **Step 2: Run** `npx vitest run tests/unit/draw-scene.test.ts` — expected: the new tests
  fail, and the typecheck names `CONTENT`.

- [ ] **Step 3: Implement** in `src/render/draw-scene.ts`. Imports: `type Figure` and
  `figuresOf` from `../game/cast`, `type FigureState` from `../game/state`,
  `type PaletteColour` from `./palette`. In `SceneContent`:

```ts
  /** One sheet per figure of the cast, by its id: twenty 16x24 frames like the player's (0017). */
  readonly figureSheets: Readonly<Record<string, SpriteSheet>>;
```

  After the movers' functions:

```ts
/** The frame of a standing figure in its sheet (0017): its facing, standing. */
export function figureFrame(figure: FigureState): number {
  return FACINGS.indexOf(figure.facing) * PHASES_PER_FACING;
}

/** The top-left corner of a standing figure's frame on the surface: the feet are its bottom centre. */
export function figureOrigin(at: Point, camera: Point): Point {
  return {
    x: Math.round(at.x) - FRAME_WIDTH / 2 - camera.x,
    y: Math.round(at.y) - FRAME_HEIGHT - camera.y,
  };
}

function drawFigures(
  renderer: Renderer,
  standing: readonly FigureState[],
  figures: readonly Figure[],
  wanted: (at: Figure) => boolean,
  state: GameState,
  content: SceneContent,
): void {
  for (const figure of standing) {
    const at = figures[figure.figure];
    const sheet = at === undefined ? undefined : content.figureSheets[at.id];
    if (at === undefined || sheet === undefined || !wanted(at)) {
      continue;
    }
    const origin = figureOrigin(at, state.camera);
    renderer.drawSprite(sheet, figureFrame(figure), origin.x, origin.y);
  }
}
```

  After the notice's constants:

```ts
/** The dialogue box (0017): the notice's bar grown upwards to three lines, the same bottom edge. */
export const DIALOGUE_BOX: Box = { x: 8, y: 134, width: 304, height: 42 };
/** Where the first line of a page starts; the lines are left-aligned. */
export const DIALOGUE_TEXT: Point = { x: 12, y: 138 };
export const DIALOGUE_LINES = 3;
/** The longest line of a page, in characters: it ends at x = 294, left of the marker. */
export const DIALOGUE_LINE_CAPACITY = 47;
/** A small triangle that points down, in the box's lower right corner: a press goes on. */
export const DIALOGUE_MARKER: readonly Box[] = [
  { x: 299, y: 169, width: 5, height: 1 },
  { x: 300, y: 170, width: 3, height: 1 },
  { x: 301, y: 171, width: 1, height: 1 },
];
const MARKER_COLOUR: PaletteColour = '#ffffff';
/** The marker is on for half a second and off for half a second. */
export const MARKER_BLINK_STEPS = 30;

export function markerVisible(tick: number): boolean {
  return Math.floor(tick / MARKER_BLINK_STEPS) % 2 === 0;
}
```

  In `drawScene`: after the shadow walls, `const figures = figuresOf(content.map.points);`.
  After the first `drawMovers` (the ground movers at or above the player):

```ts
  drawFigures(renderer, state.figures, figures, (at) => at.y <= player.y, state, content);
```

  After the player's sprite and before the second `drawMovers`:

```ts
  drawFigures(renderer, state.figures, figures, (at) => at.y > player.y, state, content);
```

  Replace the notice's block after the hearts:

```ts
  const page =
    state.dialogue === null
      ? undefined
      : figures[state.dialogue.figure]?.pages[state.dialogue.page];
  const notice = noticeOf(state);
  if (page !== undefined) {
    renderer.fillRect(
      DIALOGUE_BOX.x,
      DIALOGUE_BOX.y,
      DIALOGUE_BOX.width,
      DIALOGUE_BOX.height,
      PAGE_BACKGROUND,
    );
    drawText(
      renderer,
      content.fontSheet,
      page,
      content.language,
      DIALOGUE_TEXT.x,
      DIALOGUE_TEXT.y,
    );
    if (markerVisible(state.tick)) {
      for (const part of DIALOGUE_MARKER) {
        renderer.fillRect(part.x, part.y, part.width, part.height, MARKER_COLOUR);
      }
    }
  } else if (notice !== null) {
    renderer.fillRect(
      NOTICE_BAR.x,
      NOTICE_BAR.y,
      NOTICE_BAR.width,
      NOTICE_BAR.height,
      PAGE_BACKGROUND,
    );
    const origin = noticeOrigin(textOf(notice, content.language).length);
    drawText(renderer, content.fontSheet, notice, content.language, origin.x, origin.y);
  }
```

  Extend the comment of `drawScene`: the standing figures are drawn with the ground movers, by
  their feet; after the hearts comes the dialogue box while a dialogue is open, else the
  notice. `src/main.ts`: import `CAST` from `./game/cast`, and in `loadContent`:

```ts
    // A figure of the cast `<id>` has the sheet /sprites/<id>.png (0017).
    figureSheets: Object.fromEntries(
      await Promise.all(
        CAST.map(async ({ id }) => [
          id,
          {
            image: await loadImage(`/sprites/${id}.png`),
            frameWidth: FRAME_WIDTH,
            frameHeight: FRAME_HEIGHT,
          },
        ]),
      ),
    ),
```

  and name the figures' sheets in the comment of `loadContent`. If the compiler does not
  infer the entries as pairs, give the mapped function the return type
  `Promise<readonly [string, SpriteSheet]>` and import `type SpriteSheet` from
  `./render/renderer`.

- [ ] **Step 4: Run** `npm run check` — expected: green. Then `npm run dev` and look once: the
  game loads without an error in the console. Looking is not walking the plan — do not go
  through the acceptance steps.

- [ ] **Step 5: Commit** — `Draw the standing figures and the dialogue box`, body: the box is
  the notice's bar grown upwards, so text has one place on the screen; a figure is drawn by
  its feet like everyone on the floor.

---

### Task 7: The smoke spec

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Add the test** after the test of the shadow walls:

```ts
test('the floor starts with the officer standing and no dialogue open', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.figures.length), {
      message: 'window.shadowAi.state.figures holds the one figure of the floor',
    })
    .toBe(1);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
  expect(state?.dialogue).toBeNull();
  expect(state?.talkHeld).toBe(false);
});
```

- [ ] **Step 2: Run** `npm run test:e2e` — expected: green, the existing tests included.

- [ ] **Step 3: Commit** — `Check the standing figure in the smoke spec`, body: the real
  browser must load her point and her sheet; the unit tests cannot see that.

---

### Task 8: The documents

**Files:**
- Modify: `docs/spec/gameplay.md`, `docs/spec/world.md`, `docs/spec/architecture.md`,
  `docs/spec/visual.md`, `docs/spec/testing.md`, `README.md`

- [ ] **Step 1: `gameplay.md` §8:** `E` or `Enter` talks to a figure and turns the pages of
  what it says. Add a paragraph **As built** (feature 0017): a press within 24 px of a
  standing figure opens a dialogue; the two turn to each other; a press turns the page, a
  press on the last page closes it; the world stands still while it is open; not while the
  lamp is held or during a push.

- [ ] **Step 2: `world.md` §3**, at the data protection officer: she stands in her office
  since 0017, at tile (16, 29), two tiles from the wake point, and says the three sentences
  that explain the shadow and the lamp — every time, until M5 brings the first meeting; she
  has no name yet and is not solid.

- [ ] **Step 3: `architecture.md`.** §1 directory list: `game/cast.ts`, `game/talk.ts`; the
  person generator also draws the officer. §2: `figures`, `dialogue` and `talkHeld` — the
  fields, that places and pages stay in the map and in `game/cast`, the three kinds of step
  (dark, dialogue, ordinary) and what a dialogue step changes. §4: the action `talk` ← E or
  Enter; the press is derived in the state from `talkHeld`, the keyboard still keeps no edge;
  the sentence that the journal is the first to need one names 0017 instead. §5: the standing
  figures in the draw order, their frame and origin; the dialogue box — the rectangle, the
  lines from (12, 138), 12 px apart, the marker and its blink — drawn in the notice's place.
  §6: the point name `figure:<id>`, the two refusals of `game/cast`, that it is no route point
  and no creature. §7: `officer.png`. §8: a string may hold line breaks; a page of talk is one
  key with at most three lines of 47 characters; the key rule with digits.

- [ ] **Step 4: `visual.md` §3:** a standing figure is 16x24 like a colleague, in a shirt no
  one else wears — the officer's is `#c0cbdc`; "The display" gains the dialogue box: the
  notice's bar grown to three lines, left-aligned, with a white triangle that blinks once a
  second in its lower right corner.

- [ ] **Step 5: `testing.md`.** §2: the INV-1 row gains the round trip with a dialogue open;
  the INV-4 row the page rule (three lines, 47 characters) and the glyph test that skips line
  breaks; the INV-7 row the figure points and their refusals. §6: `figures.tmj`.

- [ ] **Step 6: `README.md`:** one sentence after the first text — the data protection officer
  stands in her office and can be spoken to with E or Enter (feature 0017). Add `E`/`Enter`
  where the README lists the keys, if it does.

- [ ] **Step 7: Run** `npm run check`, **commit** — `Move talking into the spec`.

---

### Task 9: The full check

- [ ] **Step 1:** merge the latest `main` into the branch; resolve on the branch.
- [ ] **Step 2:** `npm run check` and `npm run test:e2e` — green.
- [ ] **Step 3:** build and run the container as `docs/spec/ops.md` §3 says, and run the smoke
  spec against it with `BASE_URL` set — green, the CSP header included.
- [ ] **Step 4:** `git status` is clean; `npm run gen-floor`, `npm run gen-sprites` and
  `npm run gen-tiles` change nothing.

---

### Task 10: The acceptance walk

- [ ] **Step 1:** start the game as the spec's preconditions say (`npm run dev`), and tell the
  author in one message: the URL, a desktop browser, a window of at least 1280x720, the figure
  in the reception, arrow keys or WASD to walk, `Space` for the lamp, `E` or `Enter` to talk.
  Wait until the author is ready.
- [ ] **Step 2:** guide the author through steps 1–22 of the spec's acceptance plan, one action
  step with its expected step per message, in the spec's numbering and words. Record each answer
  as given. Never answer a step yourself.
- [ ] **Step 3:** a failed step ends the walk: fix on the branch — or ask, when the fix needs a
  decision — rerun Task 9, and start again at step 1.
- [ ] **Step 4:** after step 22 ask the six feel questions, one per message.
- [ ] **Step 5:** write `**Result:** passed YYYY-MM-DD, steps 1–22`, followed by the feel notes,
  into the spec and commit it — `Record the walk of 0017`. A feel note that wants something
  else — a solid figure, a world that goes on, other words — becomes a new draft, not a change
  on this branch.

---

### Task 11: The pull request

- [ ] **Step 1:** merge the latest `main` again and rerun Task 9. If the merge changed code,
  the walk is run again.
- [ ] **Step 2:** set `**Status:** implemented YYYY-MM-DD` in the spec and in the table of
  `docs/features/README.md`; commit — `Mark 0017 implemented`.
- [ ] **Step 3:** push the branch and open the pull request against `main`, titled
  `Feature 0017: talking`, with the walk's result and feel notes in its description. CI must
  be green. The author merges.
