import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTileMap, parseTileset } from '../../src/engine/tiled';
import {
  bodyPoint,
  CAPTURE_STEPS,
  CREATURE_SPEED_PX_PER_SECOND,
  creaturesFrom,
  isLit,
  NOTICE_RADIUS,
  noCaptures,
  stepCreature,
  stepCreatures,
  TOUCH_DISTANCE,
} from '../../src/game/creature';
import { type CreatureState, type Facing, NO_RECOIL, type PlayerState } from '../../src/game/state';
import { grassMap } from './grass-map';
import { pictureMap } from './picture-map';
import { solidsWith } from './solids';

/** Open ground, 20x12 tiles: 320x192 px. */
const OPEN = grassMap(20, 12, { x: 160, y: 100 });

const figure = (x: number, y: number, facing: Facing = 'down'): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
});
/** Every test creature has the same home, so that two of them compare equal after a move. */
const HOME = { x: 0, y: 0 };
const snippet = (x: number, y: number, light = 0): CreatureState => ({
  species: 'snippet',
  x,
  y,
  light,
  home: HOME,
});
/** One step with the lamp off; the creature is never captured that way. */
function approached(creature: CreatureState, player: PlayerState, map = OPEN): CreatureState {
  const next = stepCreature(creature, player, false, map);
  if (next === null) {
    throw new Error('captured with the lamp off');
  }
  return next;
}

describe('the constants (0008)', () => {
  it('are the spec numbers', () => {
    expect([
      NOTICE_RADIUS,
      TOUCH_DISTANCE,
      CREATURE_SPEED_PX_PER_SECOND,
      CAPTURE_STEPS,
    ]).toStrictEqual([64, 8, 40, 60]);
  });

  it('puts the body point 8 px above the feet', () => {
    expect(bodyPoint(snippet(130, 100))).toStrictEqual({ x: 130, y: 92 });
  });
});

describe('rest and approach', () => {
  const AT = figure(160, 100);

  it('moves 2/3 px toward the figure when it is closer than 64 px', () => {
    const next = approached(snippet(100, 100), AT);
    expect(next.x).toBeCloseTo(100.6667, 3);
    expect(next.y).toBe(100);
  });

  it('rests at exactly 64 px', () => {
    expect(approached(snippet(96, 100), AT)).toStrictEqual(snippet(96, 100));
  });

  it('stops exactly 8 px away: from 8.5 px it moves half a pixel', () => {
    expect(approached(snippet(151.5, 100), AT)).toStrictEqual(snippet(152, 100));
  });

  it('rests at 8 px and closer', () => {
    expect(approached(snippet(152, 100), AT)).toStrictEqual(snippet(152, 100));
    expect(approached(snippet(155, 100), AT)).toStrictEqual(snippet(155, 100));
  });

  it('moves along the straight line: from (130, 60), 50 px away, by (0.4, 0.533)', () => {
    const next = approached(snippet(130, 60), AT);
    expect(next.x).toBeCloseTo(130.4, 6);
    expect(next.y).toBeCloseTo(60.5333, 3);
  });
});

describe('walls and the map edge', () => {
  /** One solid cell at (10, 5): [160, 176) × [80, 96). */
  const WALL = pictureMap(
    [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '..........#.........',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
    { x: 40, y: 40 },
  );

  it('is held by a solid cell: flush left of it, the figure straight behind', () => {
    // The box [148, 160) × [84, 92) touches the cell's left edge.
    expect(approached(snippet(154, 92), figure(200, 92), WALL)).toStrictEqual(snippet(154, 92));
  });

  it('slides: with the figure down-right it keeps x and moves down', () => {
    const next = approached(snippet(154, 92), figure(190, 122), WALL);
    expect(next.x).toBe(154);
    expect(next.y).toBeCloseTo(92.4268, 3);
  });

  it('is clamped so the sprite stays on the map', () => {
    expect(approached(snippet(8.2, 50), figure(-20, 50)).x).toBe(8);
    expect(approached(snippet(50, 16.2), figure(50, -20)).y).toBe(16);
  });
});

describe('in the light', () => {
  const RIGHT = figure(100, 100, 'right');

  it('is lit in the cone with the lamp on: body (130, 92), d = 30, s = 4', () => {
    expect(isLit(snippet(130, 100), RIGHT, true, OPEN)).toBe(true);
  });

  it('does not move and counts one step', () => {
    expect(stepCreature(snippet(130, 100), RIGHT, true, OPEN)).toStrictEqual(snippet(130, 100, 1));
  });

  it('is still in the world after 59 lit steps and captured in the 60th', () => {
    expect(stepCreature(snippet(130, 100, 58), RIGHT, true, OPEN)).toStrictEqual(
      snippet(130, 100, 59),
    );
    expect(stepCreature(snippet(130, 100, 59), RIGHT, true, OPEN)).toBeNull();
  });

  it('is not lit with the lamp off, with the figure facing away, or beside the cone', () => {
    expect(isLit(snippet(130, 100), RIGHT, false, OPEN)).toBe(false);
    expect(isLit(snippet(130, 100), figure(100, 100, 'left'), true, OPEN)).toBe(false);
    // Body (130, 112): s = 24 against d / 2 = 15.
    expect(isLit(snippet(130, 120), RIGHT, true, OPEN)).toBe(false);
  });

  it('starts again after a break: light 30, not lit, becomes 0 and it moves 2/3 px in that step', () => {
    const next = approached(snippet(130, 100, 30), RIGHT);
    expect(next.light).toBe(0);
    expect(next.x).toBeCloseTo(129.3333, 3);
    expect(next.y).toBe(100);
  });
});

describe('a wall in the light', () => {
  const rows = (wallRow: number): string[] =>
    Array.from({ length: 12 }, (_, row) =>
      row === wallRow ? '.......#............' : '....................',
    );
  /** The figure's box centre is (100, 96); the creature's body is (136, 92). */
  const RIGHT = figure(100, 100, 'right');
  const CREATURE = snippet(136, 100);

  it('is not lit when a solid cell lies between the figure and its body', () => {
    // Cell (7, 5) is [112, 128) × [80, 96); the line passes it at y ≈ 94.
    const map = pictureMap(rows(5), { x: 40, y: 40 });
    expect(isLit(CREATURE, RIGHT, true, map)).toBe(false);
    const next = stepCreature(CREATURE, RIGHT, true, map);
    expect(next?.light).toBe(0);
    expect(next?.x).toBeLessThan(136);
  });

  it('is lit when the cell lies beside the line', () => {
    const map = pictureMap(rows(3), { x: 40, y: 40 });
    expect(isLit(CREATURE, RIGHT, true, map)).toBe(true);
  });

  it('is not lit behind a 4 px left strip in the cone, and lit without it (0010)', () => {
    // The strip [112, 116) × [80, 96) in cell (7, 5); the line crosses it at y ≈ 94.
    // A wall stops light as well as feet: its boxes are opaque too (0011).
    const boxes = solidsWith(20, 12, [
      { column: 7, row: 5, box: { x: 112, y: 80, width: 4, height: 16 } },
    ]);
    const strip = { ...OPEN, solids: boxes, opaque: boxes };
    expect(isLit(CREATURE, RIGHT, true, strip)).toBe(false);
    expect(isLit(CREATURE, RIGHT, true, OPEN)).toBe(true);
  });

  it('is lit across a low box, and the same box still stops its walk (0011)', () => {
    // The box [112, 128) × [80, 96) in cell (7, 5) lies on the creature's way to the figure on
    // its left. Its own box starts at x = 130, 2 px from the cell: one step of 2/3 px does not
    // reach it, so the walk runs six steps — with the box it stops flush at x = 128 + 6 = 134,
    // without it it reaches 136 − 4 = 132.
    const box = { x: 112, y: 80, width: 16, height: 16 };
    const low = { ...OPEN, solids: solidsWith(20, 12, [{ column: 7, row: 5, box }]) };
    expect(isLit(CREATURE, RIGHT, true, low)).toBe(true);
    const walked = (map: typeof OPEN): number => {
      let current = CREATURE;
      for (let step = 0; step < 6; step += 1) {
        current = approached(current, RIGHT, map);
      }
      return current.x;
    };
    expect(walked(low)).toBeGreaterThan(walked(OPEN));
  });

  it('is not lit behind an opaque box (0011)', () => {
    const box = { x: 112, y: 80, width: 16, height: 16 };
    const placed = solidsWith(20, 12, [{ column: 7, row: 5, box }]);
    expect(isLit(CREATURE, RIGHT, true, { ...OPEN, solids: placed, opaque: placed })).toBe(false);
  });
});

describe('the arcade cabinet and a beanbag in the light (0013)', () => {
  // The placeholder tileset on a 20x12 map: the arcade cabinet in cell (5, 5), [80, 96) × [80, 96),
  // and a beanbag in cell (9, 5), its box [147, 157) × [85, 94). The sight line runs from 4 px
  // above the figure's feet to 8 px above the snippet's: y = 92 to y = 90, through both boxes.
  const json = (file: string): unknown =>
    JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'));
  const tileset = parseTileset(json('public/tiles/placeholder.tsj'), 'placeholder.tsj');
  const map = parseTileMap(json('tests/fixtures/maps/arcade.tmj'), tileset, 'arcade.tmj');

  it('is not lit beyond the arcade cabinet', () => {
    expect(isLit(snippet(106, 98), figure(70, 96, 'right'), true, map)).toBe(false);
  });

  it('is lit beyond the beanbag, whose box the line crosses', () => {
    const behind = snippet(170, 98);
    const before = figure(134, 96, 'right');
    expect(isLit(behind, before, true, map)).toBe(true);
    expect(isLit(behind, before, true, { ...map, opaque: map.solids })).toBe(false);
  });
});

describe('stepCreatures', () => {
  it('steps every creature in order, drops the captured one and counts it', () => {
    const RIGHT = figure(100, 100, 'right');
    const result = stepCreatures(
      [snippet(130, 100, 59), snippet(136, 100, 3)],
      { snippet: 4 },
      RIGHT,
      true,
      OPEN,
    );
    expect(result).toStrictEqual({ creatures: [snippet(136, 100, 4)], captured: { snippet: 5 } });
  });

  it('leaves its arguments unchanged', () => {
    const creatures = [snippet(130, 100, 59)];
    const captured = { snippet: 0 };
    stepCreatures(creatures, captured, figure(100, 100, 'right'), true, OPEN);
    expect(creatures).toStrictEqual([snippet(130, 100, 59)]);
    expect(captured).toStrictEqual({ snippet: 0 });
  });
});

describe('creaturesFrom', () => {
  it('makes one creature per point whose name is a species, light 0, in order', () => {
    expect(
      creaturesFrom([
        { name: 'snippet', x: 1288, y: 760 },
        { name: 'snippet', x: 1560, y: 760 },
      ]),
    ).toStrictEqual([
      { species: 'snippet', x: 1288, y: 760, light: 0, home: { x: 1288, y: 760 } },
      { species: 'snippet', x: 1560, y: 760, light: 0, home: { x: 1560, y: 760 } },
    ]);
  });

  it("sets a creature's home to its point, and a step leaves the home unchanged (0009)", () => {
    const [made] = creaturesFrom([{ name: 'snippet', x: 100, y: 100 }]);
    expect(made).toStrictEqual({
      species: 'snippet',
      x: 100,
      y: 100,
      light: 0,
      home: { x: 100, y: 100 },
    });
    if (made === undefined) {
      throw new Error('no creature');
    }
    const moved = stepCreature(made, figure(160, 100), false, OPEN);
    expect(moved?.x).toBeCloseTo(100.6667, 3);
    expect(moved?.home).toStrictEqual({ x: 100, y: 100 });
  });

  it('makes no creature from the wake point (0009)', () => {
    expect(
      creaturesFrom([
        { name: 'wake', x: 80, y: 60 },
        { name: 'snippet', x: 100, y: 100 },
      ]),
    ).toHaveLength(1);
    expect(() => creaturesFrom([{ name: 'wak', x: 80, y: 60 }])).toThrow(
      'unknown point object "wak" at (80, 60)',
    );
  });

  it('rejects a name that is no species', () => {
    expect(() => creaturesFrom([{ name: 'snipet', x: 1070, y: 734 }])).toThrow(
      'unknown point object "snipet" at (1070, 734)',
    );
  });

  it('starts every count at 0', () => {
    expect(noCaptures()).toStrictEqual({ snippet: 0 });
  });
});
