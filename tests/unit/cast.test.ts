import { describe, expect, it } from 'vitest';
import type { NamedPoint } from '../../src/engine/tiled';
import {
  CAST,
  type CastMember,
  COLLEAGUES,
  figuresFrom,
  figuresOf,
  isFigurePoint,
  pagesOfRoute,
} from '../../src/game/cast';
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

describe('the colleagues and their lines (0018)', () => {
  it('gives each of the four routes of the floor one saying of one page', () => {
    expect(COLLEAGUES).toStrictEqual([
      { route: 'person:reception', pages: [textKey('talk.reception-everyday')] },
      { route: 'person:marketing', pages: [textKey('talk.marketing-everyday')] },
      { route: 'person:support', pages: [textKey('talk.support-everyday')] },
      { route: 'person:sales', pages: [textKey('talk.sales-everyday')] },
    ]);
  });

  it('finds the pages of a route, and none for a route without lines', () => {
    expect(pagesOfRoute('person:sales')).toStrictEqual([textKey('talk.sales-everyday')]);
    expect(pagesOfRoute('person:hr')).toStrictEqual([]);
    expect(pagesOfRoute('dog:reception')).toStrictEqual([]);
  });

  it('reads a table it is given: the game passes its own', () => {
    const table = [{ route: 'person:hr', pages: [FIRST] }];
    expect(pagesOfRoute('person:hr', table)).toStrictEqual([FIRST]);
    expect(pagesOfRoute('person:sales', table)).toStrictEqual([]);
  });
});
