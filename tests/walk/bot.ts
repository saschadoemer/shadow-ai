import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/engine/camera';
import type { Box } from '../../src/engine/collision';
import {
  type Point,
  parseTileMap,
  parseTileset,
  TILE_SIZE,
  type TileMap,
} from '../../src/engine/tiled';
import { CASES, progressOf } from '../../src/game/cases';
import { figuresOf } from '../../src/game/cast';
import { isLit } from '../../src/game/creature';
import { hintOf, withHint } from '../../src/game/hints';
import { lampCone, spreadOf } from '../../src/game/lamp';
import { type Route, routesOf } from '../../src/game/mover';
import { BOX_HEIGHT, BOX_WIDTH } from '../../src/game/player';
import { areasOf, inArea } from '../../src/game/region';
import { meetsCone, wallsOf, withWalls } from '../../src/game/shadow';
import {
  type CreatureState,
  FACINGS,
  type Facing,
  type GameState,
  type JournalTab,
  NO_RECOIL,
  type PlayerState,
} from '../../src/game/state';
import { pagesOf, speakersOf } from '../../src/game/talk';
import { type Trace, traceInLight, tracesOf } from '../../src/game/trace';
import { type Language, textOf } from '../../src/text/text';

/**
 * The player of the acceptance walks (docs/spec/testing.md §5). It does what the author would
 * do at the keyboard and nothing else: it holds and lets go of keys, and it reads the game's
 * state to know where it stands. It never writes a state. The map it plans its way on is the
 * map the game loads; the rules it asks — what a step would hit, what the lamp lights — are
 * the game's own pure functions.
 */

/** The lattice the bot plans on: every fourth pixel. */
const STEP = 4;
/** The room the bot keeps to every solid box when it plans, in pixels. */
const MARGIN = 2;
/** A thing counts as in the picture when it is this far from the picture's edge, in px. */
const EDGE = 16;
const KEY: Readonly<Record<Facing, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};
const DELTA: Readonly<Record<Facing, Point>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let cached: TileMap | undefined;

/** The floor as the game loads it. */
export function floor(): TileMap {
  if (cached === undefined) {
    const tiles = 'public/tiles/placeholder.tsj';
    const map = 'public/maps/floor.tmj';
    const tileset = parseTileset(JSON.parse(readFileSync(tiles, 'utf8')), tiles);
    cached = parseTileMap(JSON.parse(readFileSync(map, 'utf8')), tileset, map);
  }
  return cached;
}

/** The game's state as the page shows it: a copy, read and never written. */
export async function read(page: Page): Promise<GameState> {
  // The page loads its content before the first frame: until then there is no state.
  for (let tries = 0; tries < 400; tries += 1) {
    const state = await page.evaluate(() => window.shadowAi?.state);
    if (state !== undefined) {
      return state;
    }
    await page.waitForTimeout(25);
  }
  throw new Error('the game has not started: window.shadowAi is not there');
}

/** Waits until the state satisfies `done`; returns that state. */
export async function until(
  page: Page,
  done: (state: GameState) => boolean,
  what: string,
  timeout = 10_000,
): Promise<GameState> {
  const end = Date.now() + timeout;
  for (;;) {
    const state = await read(page);
    if (done(state)) {
      return state;
    }
    if (Date.now() > end) {
      throw new Error(`timed out waiting for: ${what}`);
    }
    await page.waitForTimeout(15);
  }
}

/** One press of a key: down until the state shows what it did, then up and seen as let go. */
export async function press(
  page: Page,
  key: string,
  did: (state: GameState) => boolean,
  what: string,
): Promise<GameState> {
  await page.keyboard.down(key);
  let state: GameState;
  try {
    state = await until(page, did, what, 5_000);
  } finally {
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(60);
  return state;
}

/** The map the figure walks on in this state: the floor with the standing shadow walls. */
export function walled(state: GameState): TileMap {
  const map = floor();
  return withWalls(map, wallsOf(map.rects), state.shadowWalls);
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Whether a figure with its feet at (x, y) would stand in a solid box, with MARGIN to spare. */
function blocked(x: number, y: number, map: TileMap, margin = MARGIN): boolean {
  const box: Box = {
    x: x - BOX_WIDTH / 2 - margin,
    y: y - BOX_HEIGHT - margin,
    width: BOX_WIDTH + 2 * margin,
    height: BOX_HEIGHT + 2 * margin,
  };
  if (
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > map.width * TILE_SIZE ||
    box.y + box.height > map.height * TILE_SIZE
  ) {
    return true;
  }
  const c0 = Math.floor(box.x / TILE_SIZE);
  const c1 = Math.floor((box.x + box.width - 1) / TILE_SIZE);
  const r0 = Math.floor(box.y / TILE_SIZE);
  const r1 = Math.floor((box.y + box.height - 1) / TILE_SIZE);
  for (let row = r0; row <= r1; row += 1) {
    for (let column = c0; column <= c1; column += 1) {
      for (const solid of map.solids[row * map.width + column] ?? []) {
        if (overlaps(box, solid)) {
          return true;
        }
      }
    }
  }
  return false;
}

/** The lattice of a map: which nodes are free, and the way from one node to every other. */
class Lattice {
  readonly columns: number;
  readonly rows: number;
  private readonly free: Int8Array;
  private readonly from: Int32Array;
  private readonly distance: Int32Array;

  constructor(
    private readonly map: TileMap,
    start: Point,
  ) {
    this.columns = Math.floor((map.width * TILE_SIZE) / STEP) + 1;
    this.rows = Math.floor((map.height * TILE_SIZE) / STEP) + 1;
    this.free = new Int8Array(this.columns * this.rows).fill(-1);
    this.from = new Int32Array(this.columns * this.rows).fill(-1);
    this.distance = new Int32Array(this.columns * this.rows).fill(-1);
    const first = this.nearestFree(start);
    if (first === -1) {
      return;
    }
    this.distance[first] = 0;
    const queue = [first];
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head] ?? 0;
      const column = node % this.columns;
      const row = Math.floor(node / this.columns);
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const c = column + dc;
        const r = row + dr;
        if (c < 0 || r < 0 || c >= this.columns || r >= this.rows) {
          continue;
        }
        const next = r * this.columns + c;
        if (this.distance[next] !== -1 || !this.isFree(next)) {
          continue;
        }
        this.distance[next] = (this.distance[node] ?? 0) + 1;
        this.from[next] = node;
        queue.push(next);
      }
    }
  }

  point(node: number): Point {
    return { x: (node % this.columns) * STEP, y: Math.floor(node / this.columns) * STEP };
  }

  node(point: Point): number {
    return Math.round(point.y / STEP) * this.columns + Math.round(point.x / STEP);
  }

  isFree(node: number): boolean {
    if (this.free[node] === -1) {
      const { x, y } = this.point(node);
      this.free[node] = blocked(x, y, this.map) ? 0 : 1;
    }
    return this.free[node] === 1;
  }

  /** The free node nearest to a point, within 12 px; -1 when there is none. */
  nearestFree(point: Point): number {
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let dy = -12; dy <= 12; dy += STEP) {
      for (let dx = -12; dx <= 12; dx += STEP) {
        const candidate = { x: point.x + dx, y: point.y + dy };
        if (candidate.x < 0 || candidate.y < 0) {
          continue;
        }
        const node = this.node(candidate);
        const at = this.point(node);
        const distance = Math.hypot(at.x - point.x, at.y - point.y);
        if (node >= 0 && node < this.free.length && this.isFree(node) && distance < bestDistance) {
          best = node;
          bestDistance = distance;
        }
      }
    }
    return best;
  }

  /** How many lattice steps a node is from the start; -1 when no way leads there. */
  steps(node: number): number {
    return node < 0 ? -1 : (this.distance[node] ?? -1);
  }

  /** The way to a node as corner points: one per change of direction, the node last. */
  way(node: number): Point[] {
    const nodes: number[] = [];
    for (let at = node; at !== -1; at = this.from[at] ?? -1) {
      nodes.push(at);
    }
    nodes.reverse();
    const corners: Point[] = [];
    for (let i = 1; i < nodes.length; i += 1) {
      const before = this.point(nodes[i - 1] ?? 0);
      const here = this.point(nodes[i] ?? 0);
      const after = i + 1 < nodes.length ? this.point(nodes[i + 1] ?? 0) : undefined;
      const turns =
        after === undefined ||
        after.x - here.x !== here.x - before.x ||
        after.y - here.y !== here.y - before.y;
      if (turns) {
        corners.push(here);
      }
    }
    return corners;
  }
}

/** Waits out what the figure cannot walk in: the dark, a push, an open box. */
async function steady(page: Page): Promise<GameState> {
  return until(
    page,
    (state) => state.dark === 0 && state.player.recoil.steps === 0,
    'the figure can walk again',
    15_000,
  );
}

/** Holds one direction until the figure has passed `to` on that axis, or no longer gets on. */
async function leg(page: Page, facing: Facing, to: Point): Promise<void> {
  const along = (point: Point): number => point.x * DELTA[facing].x + point.y * DELTA[facing].y;
  const goal = along(to);
  await page.keyboard.down(KEY[facing]);
  try {
    let last = Number.NaN;
    let still = 0;
    for (;;) {
      const state = await read(page);
      const now = along(state.player);
      // Let go a step and a half early: the key is read once more before it is up.
      if (now >= goal - 2) {
        return;
      }
      if (state.dark > 0 || state.player.recoil.steps > 0 || state.dialogue !== null) {
        return;
      }
      still = now === last ? still + 1 : 0;
      if (still > 40) {
        return;
      }
      last = now;
      await page.waitForTimeout(12);
    }
  } finally {
    await page.keyboard.up(KEY[facing]);
    await page.waitForTimeout(40);
  }
}

/** Walks the figure to a point of the map, by the keys, around whatever stands in the way. */
export async function walkTo(page: Page, target: Point, tolerance = 4): Promise<GameState> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const state = await steady(page);
    const { player } = state;
    if (Math.hypot(player.x - target.x, player.y - target.y) <= tolerance) {
      return state;
    }
    const lattice = new Lattice(walled(state), player);
    const goal = lattice.nearestFree(target);
    if (lattice.steps(goal) === -1) {
      throw new Error(
        `no way from (${Math.round(player.x)}, ${Math.round(player.y)}) to (${target.x}, ${target.y})`,
      );
    }
    const corners = lattice.way(goal);
    if (corners.length === 0) {
      return state;
    }
    let at: Point = player;
    for (const corner of corners) {
      const dx = corner.x - at.x;
      const dy = corner.y - at.y;
      const facing: Facing =
        Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      await leg(page, facing, corner);
      const now = (await read(page)).player;
      // Off the planned line by more than the margin: plan again from where the figure is.
      const off =
        facing === 'left' || facing === 'right'
          ? Math.abs(now.y - corner.y)
          : Math.abs(now.x - corner.x);
      const short = Math.hypot(now.x - corner.x, now.y - corner.y) > 6;
      at = now;
      if (off > 3 || short) {
        break;
      }
    }
  }
  const { player } = await read(page);
  throw new Error(
    `did not reach (${target.x}, ${target.y}): the figure stands at (${Math.round(player.x)}, ${Math.round(player.y)})`,
  );
}

/** Where a figure would stand, looking one way: what the game's rules of light are asked with. */
function standing(at: Point, facing: Facing): PlayerState {
  return { x: at.x, y: at.y, facing, frame: 0, frameTimer: 0, grace: 0, recoil: NO_RECOIL };
}

/**
 * The nearest place from which `lit` holds, and which way to look there. A place counts only
 * when the four places 4 px beside it do too, so that a figure that stops a little off still
 * has what it came for in the light.
 */
function vantage(
  state: GameState,
  around: Point,
  reach: number,
  lit: (player: PlayerState, map: TileMap) => boolean,
): { at: Point; facing: Facing } | null {
  const map = walled(state);
  const lattice = new Lattice(map, state.player);
  let best: { at: Point; facing: Facing } | null = null;
  let bestSteps = Number.POSITIVE_INFINITY;
  for (let dy = -reach; dy <= reach; dy += STEP) {
    for (let dx = -reach; dx <= reach; dx += STEP) {
      const at = {
        x: Math.round((around.x + dx) / STEP) * STEP,
        y: Math.round((around.y + dy) / STEP) * STEP,
      };
      if (at.x < 0 || at.y < 0) {
        continue;
      }
      const steps = lattice.steps(lattice.node(at));
      if (steps === -1 || steps >= bestSteps) {
        continue;
      }
      for (const facing of FACINGS) {
        const holds = [
          at,
          { x: at.x + STEP, y: at.y },
          { x: at.x - STEP, y: at.y },
          { x: at.x, y: at.y + STEP },
          { x: at.x, y: at.y - STEP },
        ].every((place) => lit(standing(place, facing), map));
        if (holds) {
          best = { at, facing };
          bestSteps = steps;
          break;
        }
      }
    }
  }
  return best;
}

/**
 * Holds the lamp, looking one way, until `done` or until the figure is pushed or the time is
 * up. With the lamp held a direction key only turns the figure.
 */
export async function shine(
  page: Page,
  facing: Facing,
  done: (state: GameState) => boolean,
  timeout = 4_000,
): Promise<boolean> {
  await steady(page);
  await page.keyboard.down('Space');
  try {
    await until(page, (state) => state.lamp.on || state.player.recoil.steps > 0, 'the lamp is on');
    if ((await read(page)).player.facing !== facing) {
      await page.keyboard.down(KEY[facing]);
      await until(page, (state) => state.player.facing === facing, `the figure looks ${facing}`);
      await page.keyboard.up(KEY[facing]);
    }
    const end = Date.now() + timeout;
    for (;;) {
      const state = await read(page);
      if (done(state)) {
        return true;
      }
      if (state.player.recoil.steps > 0 || state.dark > 0 || Date.now() > end) {
        return false;
      }
      await page.waitForTimeout(15);
    }
  } finally {
    await page.keyboard.up(KEY[facing]);
    await page.keyboard.up('Space');
    await page.waitForTimeout(60);
  }
}

/** The spread of the lamp in this state. */
function spread(state: GameState): number {
  return spreadOf(state.upgrades);
}

/** Finds trace `index` of the map: walks to a place from which it is lit, and holds the lamp. */
export async function findTrace(page: Page, index: number): Promise<GameState> {
  const trace: Trace | undefined = tracesOf(floor().rects)[index];
  if (trace === undefined) {
    throw new Error(`the map has no trace ${index}`);
  }
  const centre = { x: trace.box.x + 8, y: trace.box.y + 8 };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = await steady(page);
    if (state.traces[index]?.found !== null) {
      return state;
    }
    const place = vantage(state, centre, 60, (player, map) =>
      traceInLight(trace, player, true, map, spread(state)),
    );
    if (place === null) {
      throw new Error(`no place lights trace ${index} at (${trace.box.x}, ${trace.box.y})`);
    }
    await walkTo(page, place.at);
    await shine(page, place.facing, (now) => now.traces[index]?.found !== null);
  }
  throw new Error(`trace ${index} was not found in twelve tries`);
}

function sameHome(a: CreatureState, b: CreatureState): boolean {
  return a.species === b.species && a.home.x === b.home.x && a.home.y === b.home.y;
}

/** Captures the creature whose home this is: gets it into the cone and holds the lamp. */
export async function capture(page: Page, creature: CreatureState): Promise<GameState> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const state = await steady(page);
    const now = state.creatures.find((candidate) => sameHome(candidate, creature));
    if (now === undefined) {
      return state;
    }
    const map = walled(state);
    // Lit from where the figure stands, looking some way: hold the lamp there.
    const here = FACINGS.find((facing) =>
      isLit(now, { ...state.player, facing }, true, map, spread(state)),
    );
    if (here !== undefined) {
      await shine(
        page,
        here,
        (later) => !later.creatures.some((candidate) => sameHome(candidate, creature)),
        2_500,
      );
      continue;
    }
    const place = vantage(state, { x: now.x, y: now.y - 8 }, 44, (player, walls) =>
      isLit(now, player, true, walls, spread(state)),
    );
    if (place === null) {
      // It is on its way to the figure: wait a moment for it.
      await page.waitForTimeout(300);
      continue;
    }
    await walkTo(page, place.at);
    await shine(
      page,
      place.facing,
      (later) => !later.creatures.some((candidate) => sameHome(candidate, creature)),
      2_500,
    );
  }
  throw new Error(
    `the ${creature.species} at home at (${creature.home.x}, ${creature.home.y}) was not captured`,
  );
}

/** Lifts the standing shadow walls of a region: holds the lamp on each from where it is lit. */
export async function liftWalls(page: Page, region: string): Promise<GameState> {
  const walls = wallsOf(floor().rects);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const state = await steady(page);
    const standingWall = state.shadowWalls.find((wall) => walls[wall.wall]?.region === region);
    const wall = standingWall === undefined ? undefined : walls[standingWall.wall];
    if (standingWall === undefined || wall === undefined) {
      return state;
    }
    const centre = { x: wall.box.x + wall.box.width / 2, y: wall.box.y + wall.box.height / 2 };
    const place = vantage(state, centre, 40, (player) =>
      meetsCone(wall.box, lampCone(player), spread(state)),
    );
    if (place === null) {
      throw new Error(`no place lights the wall of ${region}`);
    }
    await walkTo(page, place.at);
    await shine(
      page,
      place.facing,
      (later) => !later.shadowWalls.some((other) => other.wall === standingWall.wall),
      3_000,
    );
  }
  throw new Error(`the wall of ${region} did not give way`);
}

/** The index of the mover on a route, by the route's name. */
function moverOn(state: GameState, route: string): number {
  const routes: Route[] = routesOf(floor().points);
  return state.movers.findIndex((mover) => routes[mover.route]?.name === route);
}

/**
 * Opens a talk with the colleague of a route: waits until the colleague stands, walks beside
 * it and presses E. Returns the state with the box open on its first page.
 */
export async function talkTo(page: Page, route: string): Promise<GameState> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const waiting = await until(
      page,
      (state) => (state.movers[moverOn(state, route)]?.wait ?? 0) > 90 && state.dark === 0,
      `the colleague of ${route} stands`,
      30_000,
    );
    const index = moverOn(waiting, route);
    const mover = waiting.movers[index];
    if (mover === undefined) {
      throw new Error(`nobody walks the route ${route}`);
    }
    const lattice = new Lattice(walled(waiting), waiting.player);
    let best: Point | null = null;
    let bestSteps = Number.POSITIVE_INFINITY;
    for (let dy = -28; dy <= 28; dy += STEP) {
      for (let dx = -28; dx <= 28; dx += STEP) {
        const at = {
          x: Math.round((mover.x + dx) / STEP) * STEP,
          y: Math.round((mover.y + dy) / STEP) * STEP,
        };
        const distance = Math.hypot(at.x - mover.x, at.y - mover.y);
        const steps = lattice.steps(lattice.node(at));
        if (distance < 16 || distance > 28 || steps === -1 || steps >= bestSteps) {
          continue;
        }
        best = at;
        bestSteps = steps;
      }
    }
    if (best === null) {
      await page.waitForTimeout(500);
      continue;
    }
    await walkTo(page, best);
    const beside = await read(page);
    const there = beside.movers[index];
    if (
      there === undefined ||
      Math.hypot(there.x - beside.player.x, there.y - beside.player.y) > 38
    ) {
      continue;
    }
    const opened = await press(page, 'KeyE', (state) => state.dialogue !== null, 'E opens a talk');
    if (opened.dialogue?.speaker === 'mover' && opened.dialogue.index === index) {
      return opened;
    }
    // Somebody else was nearer: read that talk to its end and try again.
    await closeTalk(page);
  }
  throw new Error(`no talk with the colleague of ${route} was opened`);
}

/** Reads an open box to its end: one press of E per page. */
export async function closeTalk(page: Page): Promise<GameState> {
  for (let pages = 0; pages < 12; pages += 1) {
    const state = await read(page);
    if (state.dialogue === null) {
      return state;
    }
    const { page: open } = state.dialogue;
    await press(
      page,
      'KeyE',
      (later) => later.dialogue === null || later.dialogue.page !== open,
      'E turns the page',
    );
  }
  throw new Error('the box did not close after twelve presses');
}

/** Loads the game and passes the card and the call: where every walk begins. */
export async function begin(page: Page): Promise<GameState> {
  await page.goto('/');
  await until(page, (state) => state.presented === null, 'the game opens with the card');
  await press(page, 'KeyE', (state) => state.presented !== null, 'E ends the card');
  return closeTalk(page);
}

/**
 * Solves the case of a region as a player would: lifts its wall, captures the creatures at
 * home in it, finds its traces and reads the answer of its source to the end.
 */
export async function solveCase(page: Page, region: string): Promise<GameState> {
  const map = floor();
  const mine = CASES.find((candidate) => candidate.region === region);
  if (mine === undefined) {
    throw new Error(`there is no case of ${region}`);
  }
  let state = await liftWalls(page, region);
  const areas = areasOf(map.rects).filter((area) => area.region === region);
  const atHome = state.creatures.filter((creature) =>
    areas.some((area) => inArea(area, creature.home)),
  );
  for (const creature of atHome) {
    state = await capture(page, creature);
  }
  const traces = tracesOf(map.rects);
  for (const [index, trace] of traces.entries()) {
    if (trace.region === region) {
      state = await findTrace(page, index);
    }
  }
  await talkTo(page, mine.source);
  state = await closeTalk(page);
  expect(state.solved.map((entry) => entry.region)).toContain(region);
  return state;
}

/** The lines of the page that is open in the box, as the scene looks them up; none when no box is open. */
export function linesShown(state: GameState, language: Language = 'de'): string[] {
  if (state.dialogue === null) {
    return [];
  }
  const map = floor();
  const progress = progressOf(state, map);
  const speakers = speakersOf(
    withHint(figuresOf(map.points), hintOf(progress)),
    state.movers,
    routesOf(map.points),
    undefined,
    progress,
  );
  const key = pagesOf(state.dialogue, speakers)[state.dialogue.page];
  return key === undefined ? [] : textOf(key, language).split('\n');
}

/** Opens the journal on a tab: J, then the right arrow as often as it takes. */
export async function openJournal(page: Page, tab: JournalTab): Promise<GameState> {
  let state = await press(page, 'KeyJ', (now) => now.journal !== null, 'J opens the journal');
  for (let turns = 0; turns < 3 && state.journal?.tab !== tab; turns += 1) {
    const from = state.journal?.tab;
    state = await press(
      page,
      'ArrowRight',
      (now) => now.journal?.tab !== from,
      'the right arrow turns the tab',
    );
  }
  return state;
}

/** Closes the journal with J. */
export async function closeJournal(page: Page): Promise<GameState> {
  return press(page, 'KeyJ', (now) => now.journal === null, 'J closes the journal');
}

/** Whether a point of the map lies in the picture, a tile away from its edge. */
export function inView(state: GameState, point: Point): boolean {
  const x = point.x - state.camera.x;
  const y = point.y - state.camera.y;
  return x >= EDGE && x < VIEW_WIDTH - EDGE && y >= EDGE && y < VIEW_HEIGHT - EDGE;
}

/** Saves the picture of an expected step: walk-results/<walk>/step-NN.png. */
export async function picture(page: Page, walk: string, step: number, part = ''): Promise<string> {
  const path = `walk-results/${walk}/step-${String(step).padStart(2, '0')}${part}.png`;
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path });
  return path;
}
