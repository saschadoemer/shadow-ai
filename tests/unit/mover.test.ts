import { describe, expect, it } from 'vitest';
import type { SolidGrid } from '../../src/engine/collision';
import type { NamedPoint } from '../../src/engine/tiled';
import { creaturesFrom } from '../../src/game/creature';
import {
  checkRoutes,
  isRoutePoint,
  moversFrom,
  type Route,
  routesOf,
  stepMover,
  YIELD_DISTANCE,
} from '../../src/game/mover';
import { type MoverKind, type MoverState, NO_RECOIL, type PlayerState } from '../../src/game/state';
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

function playerAt(x: number, y: number): PlayerState {
  return { x, y, facing: 'down', frame: 0, frameTimer: 0, grace: 0, recoil: NO_RECOIL };
}
const FAR = playerAt(1000, 1000);

/** A route of `kind` from (24, 24) right to (136, 24): 112 px, pauses 3 and 2. */
function line(kind: MoverKind): Route {
  return routesOf([at(`${kind}:hr:1`, 1, 1, 3), at(`${kind}:hr:2`, 8, 1, 2)])[0] as Route;
}
function start(route: Route): MoverState {
  return moversFrom([route])[0] as MoverState;
}
function run(mover: MoverState, route: Route, steps: number, player = FAR): MoverState {
  let current = mover;
  for (let i = 0; i < steps; i += 1) {
    current = stepMover(current, route, player);
  }
  return current;
}

describe('stepMover', () => {
  it('waits the pause of its point, then moves by its speed', () => {
    const route = line('dog');
    const waited = run(start(route), route, 3);
    expect(waited).toMatchObject({ x: 24, y: 24, wait: 0, frame: 2 });
    expect(run(waited, route, 1)).toMatchObject({ x: 25, y: 24, facing: 'right', frame: 0 });
  });

  it.each([
    ['person', 168],
    ['dog', 112],
    ['vacuum', 336],
    ['drone', 224],
  ] as const)('a %s covers 112 px in %i steps and stands exactly on the point', (kind, steps) => {
    const route = line(kind);
    const before = run(start(route), route, 3 + steps - 1);
    expect(before.x).toBeLessThan(136);
    expect(before.target).toBe(1);
    const arrived = run(before, route, 1);
    expect(arrived).toMatchObject({ x: 136, y: 24, target: 0, wait: 2 });
  });

  it('goes back to the first point after the last', () => {
    const route = line('dog');
    const back = run(start(route), route, 3 + 112 + 2 + 112);
    expect(back).toMatchObject({ x: 24, y: 24, target: 1, wait: 3, facing: 'left' });
  });

  it('faces along each leg of a square', () => {
    const route = routesOf([
      at('dog:hr:1', 1, 1),
      at('dog:hr:2', 2, 1),
      at('dog:hr:3', 2, 2),
      at('dog:hr:4', 1, 2),
    ])[0] as Route;
    const facings = [1, 17, 33, 49].map((steps) => run(start(route), route, steps).facing);
    expect(facings).toStrictEqual(['right', 'down', 'left', 'up']);
  });

  it('a person stands while it waits and walks 1, 2, 3, 4, 1 at 15 steps per phase', () => {
    const route = line('person');
    const waited = run(start(route), route, 3);
    expect(waited.frame).toBe(0);
    const frames = [1, 15, 16, 31, 46, 61].map((steps) => run(waited, route, steps).frame);
    expect(frames).toStrictEqual([1, 1, 2, 3, 4, 1]);
  });

  it('a dog sits while it waits and steps 0, 1 in turn every 8 steps', () => {
    const route = line('dog');
    const waited = run(start(route), route, 3);
    const frames = [1, 8, 9, 17].map((steps) => run(waited, route, steps).frame);
    expect(frames).toStrictEqual([0, 0, 1, 0]);
  });

  it('a vacuum and a drone keep frame 0 and face down', () => {
    for (const kind of ['vacuum', 'drone'] as const) {
      const route = line(kind);
      expect(run(start(route), route, 20)).toMatchObject({ frame: 0, facing: 'down' });
    }
  });

  it('yields under 20 px: only frame and frameTimer change, and wait is not counted', () => {
    const route = line('dog');
    const walking = run(start(route), route, 3 + 12);
    const near = playerAt(walking.x + 19.9, walking.y);
    const held = run(walking, route, 30, near);
    expect(held).toStrictEqual({ ...walking, frame: 0, frameTimer: 0 });
    const waiting = start(route);
    expect(run(waiting, route, 30, playerAt(24, 24))).toStrictEqual({
      ...waiting,
      frame: 0,
      frameTimer: 0,
    });
  });

  it('goes on at exactly 20 px and beyond', () => {
    const route = line('dog');
    const walking = run(start(route), route, 3 + 12);
    for (const distance of [YIELD_DISTANCE, 20.1]) {
      const moved = stepMover(walking, route, playerAt(walking.x, walking.y + distance));
      expect(moved.x).toBe(walking.x + 1);
    }
  });

  it('a drone does not yield', () => {
    const route = line('drone');
    const flying = run(start(route), route, 3 + 12);
    expect(stepMover(flying, route, playerAt(flying.x, flying.y)).x).toBe(flying.x + 0.5);
  });
});
