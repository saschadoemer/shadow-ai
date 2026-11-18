import { FRAME_HEIGHT, FRAME_WIDTH } from '../engine/sprite';
import { type Box, type Point, TILE_SIZE, type TileMap } from '../engine/tiled';
import { progressOf } from '../game/cases';
import { type Figure, figuresIn, figuresOf } from '../game/cast';
import { CREATURE_SIZE } from '../game/creature';
import { HELP_HINT, startHintDue } from '../game/help';
import { FRAME_APEX, LAMP_HEIGHT } from '../game/lamp';
import { DOG_LOOKS, MOVER_SIZE, routesOf } from '../game/mover';
import { noticeOf } from '../game/notice';
import { DARK_STEPS } from '../game/overview';
import { areasOf, shadowedAreas, shownVeil, veilOf } from '../game/region';
import { LIFT_STEPS, wallsOf } from '../game/shadow';
import {
  type CreatureState,
  FACINGS,
  type FigureState,
  type GameState,
  type MoverState,
  PHASES_PER_FACING,
  type PlayerState,
  type ShadowWallState,
  type Species,
  type TraceState,
} from '../game/state';
import { pagesOf, speakersOf } from '../game/talk';
import { FIND_STEPS, tracesOf } from '../game/trace';
import { type Language, type TextKey, textKey, textOf } from '../text/text';
import { drawHelp } from './draw-help';
import { drawJournal } from './draw-journal';
import { drawLayer, drawVeil, type Shadow } from './draw-map';
import { drawText } from './draw-text';
import { GLYPH_HEIGHT, GLYPH_WIDTH } from './font';
import { PAGE_BACKGROUND, type PaletteColour } from './palette';
import {
  type Renderer,
  type SpriteSheet,
  SURFACE_HEIGHT,
  SURFACE_WIDTH,
  type TilesetImage,
} from './renderer';

/** Everything a frame draws from, loaded once by main.ts. */
export interface SceneContent {
  readonly map: TileMap;
  readonly tileset: TilesetImage;
  /** The tileset's sheet in the greys of a region under shadow: same size, same ids (0023). */
  readonly shadowTileset: TilesetImage;
  /** Five 16x16 frames: the veil of density 1, 2 and 3 (0023), and the two of a clearing (0025). */
  readonly veilSheet: SpriteSheet;
  readonly playerSheet: SpriteSheet;
  /** Four 48x48 frames, one per facing in FACINGS order (0007). */
  readonly lampSheet: SpriteSheet;
  /** One sheet per species: three 16x16 frames — two free, one frozen (0008). */
  readonly creatureSheets: Readonly<Record<Species, SpriteSheet>>;
  /** Two 8x8 frames: a full heart, an empty heart (0009, 0012). */
  readonly overviewSheet: SpriteSheet;
  /** Sixteen 16x16 frames: orientation × 8 + look (0014). */
  readonly shadowWallSheet: SpriteSheet;
  /** Three 16x16 frames: a trace as it grows in the light (0022). */
  readonly traceSheet: SpriteSheet;
  /** The movers' sheets (0015): one per person, the dogs' 24 frames, two frames each for the vacuum and the drone. */
  readonly moverSheets: {
    readonly person: readonly SpriteSheet[];
    readonly dog: SpriteSheet;
    readonly vacuum: SpriteSheet;
    readonly drone: SpriteSheet;
  };
  /** 108 glyphs of 6x10 in one row, in the order of render/font (0016). */
  readonly fontSheet: SpriteSheet;
  /** One sheet per figure of the cast, by its id: twenty 16x24 frames like the player's (0017). */
  readonly figureSheets: Readonly<Record<string, SpriteSheet>>;
}

/**
 * The player's settings of the scene (0019): not part of the game's state and not loaded
 * content — main.ts holds them and hands them over with every frame.
 */
export interface SceneSettings {
  /** The language text is drawn in. */
  readonly language: Language;
  /** The state's tick at the last switch of the language; null when it was never switched. */
  readonly switchedAt: number | null;
}

/** The frame in the player sheet: facing × 5 + phase, facings in FACINGS order. */
export function playerFrame(player: PlayerState): number {
  return FACINGS.indexOf(player.facing) * PHASES_PER_FACING + player.frame;
}

/** The frame in the lamp sheet: the facing's index. */
export function lampFrame(player: PlayerState): number {
  return FACINGS.indexOf(player.facing);
}

/**
 * The top-left corner of the lamp frame on the surface (0007): the apex, (round(x),
 * round(y) − 12), rounded as the figure's sprite rounds, minus the frame's apex pixel, minus
 * the camera — so cone and figure agree pixel for pixel.
 */
export function lampFrameOrigin(player: PlayerState, camera: Point): Point {
  const apex = FRAME_APEX[player.facing];
  return {
    x: Math.round(player.x) - apex.x - camera.x,
    y: Math.round(player.y) - LAMP_HEIGHT - apex.y - camera.y,
  };
}

/** A free creature changes its frame every 15 steps: four changes per second. */
export const FLUTTER_STEPS = 15;
export const FROZEN_FRAME = 2;

/** Frozen in the light: frame 2, still. Free: frames 0 and 1 in turn, by the state's tick. */
export function creatureFrame(creature: CreatureState, tick: number): number {
  return creature.light > 0 ? FROZEN_FRAME : Math.floor(tick / FLUTTER_STEPS) % 2;
}

/** The top-left corner of a creature's frame on the surface: the feet are its bottom centre. */
export function creatureOrigin(creature: CreatureState, camera: Point): Point {
  return {
    x: Math.round(creature.x) - CREATURE_SIZE / 2 - camera.x,
    y: Math.round(creature.y) - CREATURE_SIZE - camera.y,
  };
}

/** A dog's sheet holds, per look, facing × 3 + phase (0015). */
export const DOG_PHASES = 3;
export const DOG_FRAMES_PER_LOOK = FACINGS.length * DOG_PHASES;
/** The vacuum's light changes twice a second; the rotors change 15 times a second. */
export const VACUUM_BLINK_STEPS = 30;
export const DRONE_ROTOR_STEPS = 4;
/** The drone hangs 1 px higher in every second half second. */
export const DRONE_BOB_STEPS = 30;

/** The frame of a mover in its sheet (0015). */
export function moverFrame(mover: MoverState, tick: number): number {
  const facing = FACINGS.indexOf(mover.facing);
  switch (mover.kind) {
    case 'person':
      return facing * PHASES_PER_FACING + mover.frame;
    case 'dog':
      return (mover.look % DOG_LOOKS) * DOG_FRAMES_PER_LOOK + facing * DOG_PHASES + mover.frame;
    case 'vacuum':
      return Math.floor(tick / VACUUM_BLINK_STEPS) % 2;
    case 'drone':
      return Math.floor(tick / DRONE_ROTOR_STEPS) % 2;
  }
}

/** The top-left corner of a mover's frame on the surface: the feet are its bottom centre. */
export function moverOrigin(mover: MoverState, camera: Point, tick: number): Point {
  const height = mover.kind === 'person' ? FRAME_HEIGHT : MOVER_SIZE;
  const bob = mover.kind === 'drone' ? Math.floor(tick / DRONE_BOB_STEPS) % 2 : 0;
  return {
    x: Math.round(mover.x) - MOVER_SIZE / 2 - camera.x,
    y: Math.round(mover.y) - height - bob - camera.y,
  };
}

function moverSheet(content: SceneContent, mover: MoverState): SpriteSheet | undefined {
  return mover.kind === 'person'
    ? content.moverSheets.person[mover.look]
    : content.moverSheets[mover.kind];
}

function drawMovers(
  renderer: Renderer,
  movers: readonly MoverState[],
  state: GameState,
  content: SceneContent,
): void {
  for (const mover of movers) {
    const sheet = moverSheet(content, mover);
    if (sheet === undefined) {
      continue;
    }
    const origin = moverOrigin(mover, state.camera, state.tick);
    renderer.drawSprite(sheet, moverFrame(mover, state.tick), origin.x, origin.y);
  }
}

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

/** The shadow-wall sheet (0014): frame = orientation × WALL_LOOKS + look. */
export const WALL_LOOKS = 8;
/** A wall the light is not on changes its phase every 15 steps: four changes per second. */
export const WALL_FLICKER_STEPS = 15;
/** The looks of a wall that gives way, one per third of LIFT_STEPS. */
const GIVING_WAY_LOOKS = [0, 6, 7] as const;

/**
 * The look of a standing wall. Giving way: the thin wall's still look, then the two thinner
 * ones, a third of LIFT_STEPS each. Holding against the light: its density's first look,
 * still. Otherwise its density's two looks in turn, by the state's tick.
 */
export function wallLook(wall: ShadowWallState, density: number, tick: number): number {
  if (wall.light > 0) {
    const third = Math.floor((wall.light * GIVING_WAY_LOOKS.length) / LIFT_STEPS);
    return GIVING_WAY_LOOKS[Math.min(third, GIVING_WAY_LOOKS.length - 1)] ?? 0;
  }
  const still = (density - 1) * 2;
  return wall.lit ? still : still + (Math.floor(tick / WALL_FLICKER_STEPS) % 2);
}

/**
 * A wall's frames on the surface: one per 16 px of its length, from the corner of its box. A
 * wall wider than high is horizontal, orientation 0; the camera is whole pixels and so is the
 * box.
 */
export function wallSegments(
  box: Box,
  camera: Point,
): { readonly orientation: number; readonly origins: readonly Point[] } {
  const horizontal = box.width > box.height;
  const count = (horizontal ? box.width : box.height) / TILE_SIZE;
  return {
    orientation: horizontal ? 0 : 1,
    origins: Array.from({ length: count }, (_, k) => ({
      x: box.x + (horizontal ? k * TILE_SIZE : 0) - camera.x,
      y: box.y + (horizontal ? 0 : k * TILE_SIZE) - camera.y,
    })),
  };
}

/** The trace sheet (0022) has three looks, one per third of FIND_STEPS. */
export const TRACE_LOOKS = 3;

/** The frame of a trace the light is on: ⌊(light − 1) / 20⌋ — small, larger, largest. */
export function traceFrame(trace: TraceState): number {
  return Math.floor(((trace.light - 1) * TRACE_LOOKS) / FIND_STEPS);
}

/** The hearts of overview (0009, 0012): 8x8, 4 px from the corner, one every 10 px. */
export const HEART_SIZE = 8;
export const HEART_MARGIN = 4;
export const HEART_PITCH = 10;
const HEART_FULL_FRAME = 0;
const HEART_EMPTY_FRAME = 1;

/** The notice (0016): a dark bar at the bottom of the surface, with one line centred in it. */
export const NOTICE_BAR: Box = { x: 8, y: 158, width: 304, height: 18 };
/** The room between the bar's edge and the line, on every side. */
export const NOTICE_PADDING = (NOTICE_BAR.height - GLYPH_HEIGHT) / 2;
/** The longest line the bar holds, in characters. */
export const NOTICE_CAPACITY = Math.floor((NOTICE_BAR.width - 2 * NOTICE_PADDING) / GLYPH_WIDTH);

/** The top-left corner of a line of `length` characters, centred on the surface: (160 − 3n, 162). */
export function noticeOrigin(length: number): Point {
  return {
    x: SURFACE_WIDTH / 2 - (length * GLYPH_WIDTH) / 2,
    y: NOTICE_BAR.y + NOTICE_PADDING,
  };
}

/** The language line (0019): which language is on, in that language, in the notice's bar. */
export const LANGUAGE_NOTICE = textKey('notice.language');
/** Tune: two seconds. */
export const LANGUAGE_NOTICE_STEPS = 120;

/** Whether the language line is due at `tick`: for LANGUAGE_NOTICE_STEPS steps from the switch. */
export function languageNoticeVisible(tick: number, switchedAt: number | null): boolean {
  return switchedAt !== null && tick >= switchedAt && tick - switchedAt < LANGUAGE_NOTICE_STEPS;
}

/**
 * The line the bar shows where no dialogue is open and no notice shows, or null. Where a text
 * is on screen, that text changes with the language; the language line answers a switch only
 * where nothing else would (0019). The start hint has the last place (0021). With the help
 * open the bar shows neither: the box is the answer.
 */
export function quietLine(state: GameState, settings: SceneSettings): TextKey | null {
  if (state.help) {
    return null;
  }
  if (languageNoticeVisible(state.tick, settings.switchedAt)) {
    return LANGUAGE_NOTICE;
  }
  return startHintDue(state) ? HELP_HINT : null;
}

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

/** A safe figure is left out in every second group of four steps. */
export const BLINK_STEPS = 4;

export function playerVisible(player: PlayerState): boolean {
  return Math.floor(player.grace / BLINK_STEPS) % 2 === 0;
}

/** The lids move 3 px per step: closed, 90 px each, from step 30 to step 60 of the dark. */
export const LID_PX_PER_STEP = 3;
const LID_CLOSED = SURFACE_HEIGHT / 2;

/** The height of each lid at step `dark`: 3d closing, 90 closed, 3 × (90 − d) opening; 0 at 0. */
export function lidHeight(dark: number): number {
  return Math.min(LID_PX_PER_STEP * Math.min(dark, DARK_STEPS - dark), LID_CLOSED);
}

/**
 * One frame: ground and detail — a cell under shadow from the shadow tileset (0023) — the veil
 * over the cells under shadow (0023) and, thinning, over those of a region cleared less than two
 * seconds ago (0025), the cone when the lamp is on, the standing shadow walls in array
 * order (0014), the traces the light is on (0022), the ground movers whose feet are at or above
 * the player's, then the standing figures whose feet are at or above the player's (0017), the
 * creatures in array order, the player, the other standing figures, the other ground movers,
 * above, the drones (0015), all shifted by the camera. The sprite's top-left corner is at (round(x) − 8 − camera.x,
 * round(y) − 24 − camera.y): the feet are its bottom centre, and the camera is already whole
 * pixels (engine/camera). The cone lies under the figure, so the body hides the apex. After
 * `above` come the hearts of overview, on the surface and not shifted by the camera; then,
 * while a dialogue is open, the dialogue box with the page's lines and its blinking marker
 * (0017), else the notice — the bar and its line (0016) — else, for two seconds after a switch
 * of the language, the language line in the same bar (0019); all on the surface and not
 * shifted by the camera; and last the two lids of the dark (0009). Every text is drawn in the
 * language of the settings. A safe figure blinks; its cone and the movers do not. While the
 * journal is open the frame is the journal's alone (0020, render/draw-journal).
 * While the help is open (0021, render/draw-help) its box is drawn last but for the lids, over
 * the world and over the journal alike, and the bar shows neither the language line nor the
 * start hint — the line that names the help's key in the first ten seconds of a game, which
 * has the bar only where nothing else has it.
 */
export function drawScene(
  renderer: Renderer,
  state: GameState,
  content: SceneContent,
  settings: SceneSettings,
): void {
  if (state.journal !== null) {
    drawJournal(renderer, state, state.journal, content, settings);
    if (state.help) {
      drawHelp(renderer, content.fontSheet, settings.language);
    }
    return;
  }
  const { language } = settings;
  const { player, camera } = state;
  renderer.clear(PAGE_BACKGROUND);
  // A map without areas has no shadow, and is drawn exactly as before 0023.
  const areas = areasOf(content.map.rects);
  // A cleared region is in colour at once (0025); its veil thins out for two seconds more.
  const shadowed = shadowedAreas(areas, state.solved);
  const shadow: Shadow | undefined =
    areas.length === 0
      ? undefined
      : {
          tileset: content.shadowTileset,
          veilOf: (column, row) => veilOf(shadowed, column, row),
        };
  drawLayer(renderer, content.map, content.tileset, 'ground', camera, shadow);
  drawLayer(renderer, content.map, content.tileset, 'detail', camera, shadow);
  if (shadow !== undefined) {
    drawVeil(renderer, content.map, content.veilSheet, camera, (column, row) =>
      shownVeil(areas, state.solved, state.tick, column, row),
    );
  }
  if (state.lamp.on) {
    const origin = lampFrameOrigin(player, camera);
    renderer.drawSprite(content.lampSheet, lampFrame(player), origin.x, origin.y);
  }
  const walls = wallsOf(content.map.rects);
  for (const standing of state.shadowWalls) {
    const wall = walls[standing.wall];
    if (wall === undefined) {
      continue;
    }
    const { orientation, origins } = wallSegments(wall.box, camera);
    const frame = orientation * WALL_LOOKS + wallLook(standing, wall.density, state.tick);
    for (const origin of origins) {
      renderer.drawSprite(content.shadowWallSheet, frame, origin.x, origin.y);
    }
  }
  const traces = tracesOf(content.map.rects);
  for (const seen of state.traces) {
    const trace = traces[seen.trace];
    // A trace shows only while the light is on it; a found one never.
    if (trace === undefined || seen.found !== null || seen.light === 0) {
      continue;
    }
    renderer.drawSprite(
      content.traceSheet,
      traceFrame(seen),
      trace.box.x - camera.x,
      trace.box.y - camera.y,
    );
  }
  const figures = figuresOf(content.map.points);
  const ground = state.movers.filter((mover) => mover.kind !== 'drone');
  drawMovers(
    renderer,
    ground.filter((mover) => mover.y <= player.y),
    state,
    content,
  );
  drawFigures(renderer, state.figures, figures, (at) => at.y <= player.y, state, content);
  for (const creature of state.creatures) {
    const origin = creatureOrigin(creature, camera);
    renderer.drawSprite(
      content.creatureSheets[creature.species],
      creatureFrame(creature, state.tick),
      origin.x,
      origin.y,
    );
  }
  if (playerVisible(player)) {
    renderer.drawSprite(
      content.playerSheet,
      playerFrame(player),
      Math.round(player.x) - FRAME_WIDTH / 2 - camera.x,
      Math.round(player.y) - FRAME_HEIGHT - camera.y,
    );
  }
  drawFigures(renderer, state.figures, figures, (at) => at.y > player.y, state, content);
  drawMovers(
    renderer,
    ground.filter((mover) => mover.y > player.y),
    state,
    content,
  );
  drawLayer(renderer, content.map, content.tileset, 'above', camera, shadow);
  drawMovers(
    renderer,
    state.movers.filter((mover) => mover.kind === 'drone'),
    state,
    content,
  );
  for (let i = 0; i < state.overview.max; i += 1) {
    renderer.drawSprite(
      content.overviewSheet,
      i < state.overview.current ? HEART_FULL_FRAME : HEART_EMPTY_FRAME,
      HEART_MARGIN + i * HEART_PITCH,
      HEART_MARGIN,
    );
  }
  const page =
    state.dialogue === null
      ? undefined
      : pagesOf(
          state.dialogue,
          speakersOf(
            // As in `update`: without the lamp the officer says the first meeting (0026).
            figuresIn(figures, state.lamp.owned),
            state.movers,
            routesOf(content.map.points),
            undefined,
            progressOf(state, content.map),
          ),
        )[state.dialogue.page];
  const notice = noticeOf(state);
  if (page !== undefined) {
    renderer.fillRect(
      DIALOGUE_BOX.x,
      DIALOGUE_BOX.y,
      DIALOGUE_BOX.width,
      DIALOGUE_BOX.height,
      PAGE_BACKGROUND,
    );
    drawText(renderer, content.fontSheet, page, language, DIALOGUE_TEXT.x, DIALOGUE_TEXT.y);
    if (markerVisible(state.tick)) {
      for (const part of DIALOGUE_MARKER) {
        renderer.fillRect(part.x, part.y, part.width, part.height, MARKER_COLOUR);
      }
    }
  } else {
    const line = notice ?? quietLine(state, settings);
    if (line !== null) {
      renderer.fillRect(
        NOTICE_BAR.x,
        NOTICE_BAR.y,
        NOTICE_BAR.width,
        NOTICE_BAR.height,
        PAGE_BACKGROUND,
      );
      const origin = noticeOrigin(textOf(line, language).length);
      drawText(renderer, content.fontSheet, line, language, origin.x, origin.y);
    }
  }
  if (state.help) {
    drawHelp(renderer, content.fontSheet, language);
  }
  const lid = lidHeight(state.dark);
  if (lid > 0) {
    renderer.fillRect(0, 0, SURFACE_WIDTH, lid, PAGE_BACKGROUND);
    renderer.fillRect(0, SURFACE_HEIGHT - lid, SURFACE_WIDTH, lid, PAGE_BACKGROUND);
  }
}
