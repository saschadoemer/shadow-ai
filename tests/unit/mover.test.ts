import { describe, expect, it } from 'vitest';
import type { SolidGrid } from '../../src/engine/collision';
import type { NamedPoint } from '../../src/engine/tiled';
import { creaturesFrom } from '../../src/game/creature';
import { checkRoutes, isRoutePoint, moversFrom, routesOf } from '../../src/game/mover';
import { solidsOf } from './solids';

/** Cell (c, r) as the spec writes it: the middle of the cell. */
function at(name: string, c: number, r: number, pause?: number): NamedPoint {
  const point = { name, x: 16 * c + 8, y: 16 * r + 8 };
  return pause === undefined ? point : { ...point, pause };
}

/** 10x6 cells, all open but (5, 2). */
const GRID: SolidGrid = {
  width: 10,
  height: 6,
  solids: solidsOf(
    Array.from({ length: 60 }, (_, i) => i === 2 * 10 + 5),
    10,
  ),
};

const DOG = [at('dog:hr:1', 1, 1, 300), at('dog:hr:2', 3, 1), at('dog:hr:3', 3, 3, 420)];

describe('routesOf', () => {
  it('builds a route from its points, in number order, pause 0 when absent', () => {
    expect(routesOf([DOG[2], DOG[0], DOG[1]] as NamedPoint[])).toStrictEqual([
      {
        name: 'dog:hr',
        kind: 'dog',
        points: [
          { x: 24, y: 24, pause: 300 },
          { x: 56, y: 24, pause: 0 },
          { x: 56, y: 56, pause: 420 },
        ],
      },
    ]);
  });

  it('orders routes by the first appearance of one of their points and skips other points', () => {
    const routes = routesOf([
      at('snippet', 0, 0),
      at('vacuum:sales:2', 2, 0),
      at('dog:hr:1', 1, 1),
      at('wake', 0, 1),
      at('vacuum:sales:1', 1, 0),
      at('dog:hr:2', 3, 1),
    ]);
    expect(routes.map((route) => route.name)).toStrictEqual(['vacuum:sales', 'dog:hr']);
  });

  it.each([
    [[at('dog:hr:1', 1, 1)], 'route dog:hr has 1 point, 2 to 4 are allowed'],
    [
      [1, 2, 3, 4, 5].map((n) => at(`dog:hr:${n}`, n, 1)),
      'route dog:hr has 5 points, 2 to 4 are allowed',
    ],
    [[at('dog:hr:1', 1, 1), at('dog:hr:3', 3, 1)], 'route dog:hr has no point 2'],
    [
      [at('dog:hr:1', 1, 1), at('dog:hr:2', 3, 1), at('dog:hr:2', 3, 3)],
      'route dog:hr has two points 2',
    ],
    [[at('dog:hr', 1, 1)], 'point dog:hr is not a route point'],
    [[at('cat:hr:1', 1, 1)], 'point cat:hr:1 is not a route point'],
    [[at('dog:hr:0', 1, 1)], 'point dog:hr:0 is not a route point'],
    [[at('dog:hr:1:2', 1, 1)], 'point dog:hr:1:2 is not a route point'],
    [[at('dog:cellar:1', 1, 1)], 'point dog:cellar:1 names no room'],
    [[at('dog:hr:1', 1, 1, 700)], 'point dog:hr:1 has pause 700, 0 to 600 are allowed'],
    [[at('dog:hr:1', 1, 1, -1)], 'point dog:hr:1 has pause -1, 0 to 600 are allowed'],
    [[at('dog:hr:1', 1, 1, 1.5)], 'point dog:hr:1 has pause 1.5, 0 to 600 are allowed'],
  ])('rejects %#', (points, message) => {
    expect(() => routesOf(points)).toThrow(message);
  });
});

describe('checkRoutes', () => {
  it('accepts straight legs on open cells, the closing leg included', () => {
    const square = [
      at('dog:hr:1', 1, 1),
      at('dog:hr:2', 3, 1),
      at('dog:hr:3', 3, 3),
      at('dog:hr:4', 1, 3),
    ];
    expect(() => checkRoutes(routesOf(square), GRID)).not.toThrow();
  });

  it('rejects a closing leg that is not straight', () => {
    expect(() => checkRoutes(routesOf(DOG), GRID)).toThrow('route dog:hr leg 3 is not straight');
  });

  it('rejects a ground leg across a solid cell and names the cell', () => {
    const across = [at('vacuum:hr:1', 3, 2), at('vacuum:hr:2', 7, 2)];
    expect(() => checkRoutes(routesOf(across), GRID)).toThrow(
      'route vacuum:hr leg 1 crosses a solid tile (5, 2)',
    );
  });

  it('lets a box pass flush beside a solid cell: the box is 12 px wide and 8 px high', () => {
    // Feet on row 1's middle: the box is y 16–24, the solid cell starts at y 32.
    const beside = [at('person:hr:1', 3, 1), at('person:hr:2', 7, 1)];
    expect(() => checkRoutes(routesOf(beside), GRID)).not.toThrow();
  });

  it('lets a drone cross anything', () => {
    const over = [at('drone:hr:1', 3, 2), at('drone:hr:2', 7, 2)];
    expect(() => checkRoutes(routesOf(over), GRID)).not.toThrow();
  });
});

describe('moversFrom', () => {
  it('puts each mover on its point 1, facing down, waiting its pause, heading for point 2', () => {
    expect(moversFrom(routesOf(DOG))).toStrictEqual([
      {
        kind: 'dog',
        look: 0,
        route: 0,
        x: 24,
        y: 24,
        facing: 'down',
        frame: 0,
        frameTimer: 0,
        target: 1,
        wait: 300,
      },
    ]);
  });

  it('numbers persons 0–3 and dogs 0, 1 in turn; vacuums and drones are 0', () => {
    const pair = (name: string, r: number) => [at(`${name}:1`, 1, r), at(`${name}:2`, 3, r)];
    const routes = routesOf([
      ...pair('person:hr', 0),
      ...pair('dog:hr', 1),
      ...pair('person:sales', 2),
      ...pair('dog:sales', 3),
      ...pair('dog:support', 4),
      ...pair('vacuum:hr', 5),
      ...pair('vacuum:sales', 0),
      ...pair('drone:hr', 1),
    ]);
    expect(moversFrom(routes).map((mover) => `${mover.kind} ${mover.look}`)).toStrictEqual([
      'person 0',
      'dog 0',
      'person 1',
      'dog 1',
      'dog 0',
      'vacuum 0',
      'vacuum 0',
      'drone 0',
    ]);
  });
});

describe('route points and creatures', () => {
  it('knows a route point by its colon', () => {
    expect(isRoutePoint('dog:hr:1')).toBe(true);
    expect(isRoutePoint('snippet')).toBe(false);
  });

  it('creaturesFrom skips route points and still rejects an unknown name', () => {
    expect(creaturesFrom([at('dog:hr:1', 1, 1), at('snippet', 2, 2)])).toHaveLength(1);
    expect(() => creaturesFrom([at('ghost', 1, 1)])).toThrow('unknown point object "ghost"');
  });
});
