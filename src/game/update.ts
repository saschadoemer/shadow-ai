import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { answeredCase, clearRegion, progressOf, solve } from './cases';
import { figuresFrom, figuresOf } from './cast';
import { creaturesFrom, noCaptures, stepCreatures } from './creature';
import { openHelp, stepHelp } from './help';
import { openJournal, stepJournal } from './journal';
import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
import { type GameInput, NO_INPUT, stepPlayer } from './player';
import { areasOf } from './region';
import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
import { type GameState, type LampState, NO_RECOIL, type PlayerState } from './state';
import { openDialogue, speakersOf, stepDialogue } from './talk';
import { hiddenTraces, stepTraces, tracesOf } from './trace';
import { BASE_STRENGTH } from './world';

/**
 * The state before the first step: the player at the map's spawn, facing down, standing, not
 * pushed and not safe; the camera on it; the lamp off; one creature per named point of the map
 * (0008); overview full and the dark not running (0009); one mover per route on its point 1
 * (0015); a lamp of strength BASE_STRENGTH and every shadow wall of the map standing (0014);
 * every standing figure of the map facing down and no dialogue (0017); the journal closed and
 * no key remembered (0020); the help closed (0021); every trace of the map unseen and not found
 * (0022); no case solved (0024). It is a game past its opening (0026): the lamp is owned and
 * was used, no scene is open, and the opening ended at tick 0; `newGame` is the state a player
 * starts with. A map with two wake points, a route that is malformed or crosses a solid tile, a
 * rectangle of no known kind, a shadow wall or a trace the world data or the grid refuses, an
 * area of a region the world data does not know or of a box that is not whole cells (0023), or
 * a figure point the cast does not know or names twice is rejected here, before the game starts.
 */
export function createInitialState(map: TileMap): GameState {
  wakePoint(map);
  const routes = routesOf(map.points);
  checkRoutes(routes, map);
  const walls = wallsOf(map.rects);
  // The areas of the regions are only drawn (0023); a map with a faulty one still does not start.
  areasOf(map.rects);
  const figures = figuresOf(map.points);
  const player: PlayerState = {
    x: map.spawn.x,
    y: map.spawn.y,
    facing: 'down',
    frame: 0,
    frameTimer: 0,
    grace: 0,
    recoil: NO_RECOIL,
  };
  return {
    tick: 0,
    started: 0,
    player,
    camera: followPlayer(player, map),
    lamp: { on: false, strength: BASE_STRENGTH, owned: true, used: true },
    creatures: creaturesFrom(map.points),
    movers: moversFrom(routes),
    shadowWalls: standingWalls(walls),
    traces: hiddenTraces(tracesOf(map.rects)),
    solved: [],
    figures: figuresFrom(figures),
    dialogue: null,
    journal: null,
    help: false,
    held: NO_INPUT,
    captured: noCaptures(),
    overview: initialOverview(),
    dark: 0,
  };
}

/**
 * Advances the game by exactly one logic step and returns the new state; its arguments are not
 * mutated. In the dark the step is the dark sequence and nothing else (0009). With the help open
 * the step is the help's and nothing else, and a press of `help` opens it over whatever is there
 * — an open journal and an open dialogue too (0021). With the journal open the step is the
 * journal's and nothing else (0020). With a dialogue open the step is the dialogue's and nothing
 * else; the step that closes the source's answer of a ready case solves the case (0024) and
 * removes the region's standing shadow walls and the creatures at home in it (0025). A press of `journal` opens the journal instead of an ordinary
 * step, before a press of `talk` is looked at (0020); a press of `talk` near a speaker — a
 * standing figure or a colleague — in reach and in sight opens a dialogue instead of an
 * ordinary step (0017, 0018). Otherwise: the lamp is on when the input holds
 * it and the figure is not being pushed; the figure is stepped; each creature is stepped
 * against the stepped figure (0008); the first free creature within reach of a figure that is
 * not safe hits; the camera follows the figure; each mover is stepped against the figure after
 * the hit, on routes rebuilt from the map's points (0015). The figure and the creatures are
 * stepped against the map with the walls standing at the start of the step; then every
 * standing wall is stepped against the stepped figure, on walls rebuilt from the map's
 * rectangles (0014); every trace is stepped against the stepped figure, on the map with the
 * walls standing at the start of the step, so that none is found through a wall (0022). Every
 * step, the dark's included, remembers the whole input in `held`, so
 * that the next step can tell a press from a held key (0017, 0020).
 */
export function update(state: GameState, input: GameInput, content: TileMap): GameState {
  if (state.dark > 0) {
    return { ...stepDark(state, content), held: input };
  }
  if (state.help) {
    return stepHelp(state, input);
  }
  const help = openHelp(state, input);
  if (help !== null) {
    return help;
  }
  if (state.journal !== null) {
    return stepJournal(state, state.journal, input);
  }
  const routes = routesOf(content.points);
  const progress = progressOf(state, content);
  const speakers = speakersOf(figuresOf(content.points), state.movers, routes, undefined, progress);
  if (state.dialogue !== null) {
    const stepped = stepDialogue(state, state.dialogue, input, speakers);
    // The step that closes the source's answer solves its case (0024), and what is left of the
    // region's shadow goes with it (0025).
    const answered =
      stepped.dialogue === null ? answeredCase(state.dialogue, state, routes, progress) : null;
    return answered === null
      ? stepped
      : clearRegion(solve(stepped, answered.region), answered.region, content);
  }
  const journal = openJournal(state, input);
  if (journal !== null) {
    return journal;
  }
  // In sight is tested against the map as loaded: a shadow wall does not stop a conversation.
  const opened = openDialogue(state, input, speakers, content);
  if (opened !== null) {
    return opened;
  }
  const lamp: LampState = {
    ...state.lamp,
    on: input.lamp && state.player.recoil.steps === 0,
  };
  const walls = wallsOf(content.rects);
  // The figure, the push and the creatures meet the walls standing at the start of the step.
  const walled = withWalls(content, walls, state.shadowWalls);
  const stepped = stepPlayer(state.player, input, walled);
  const { creatures, captured } = stepCreatures(
    state.creatures,
    state.captured,
    stepped,
    lamp.on,
    walled,
  );
  const hitter = hittingCreature(creatures, stepped);
  const { player, overview, dark } =
    hitter === null
      ? { player: stepped, overview: state.overview, dark: 0 }
      : applyHit(stepped, state.overview, hitter);
  return {
    tick: state.tick + 1,
    started: state.started,
    player,
    camera: followPlayer(player, content),
    lamp,
    creatures,
    movers: stepMovers(state.movers, routes, player),
    // The light on a wall is tested against the map as loaded: a wall does not block itself.
    shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content),
    // A trace is tested against the map with the walls standing: none is found through one.
    traces: stepTraces(
      state.traces,
      tracesOf(content.rects),
      stepped,
      lamp.on,
      walled,
      state.tick + 1,
    ),
    solved: state.solved,
    figures: state.figures,
    dialogue: null,
    journal: null,
    help: false,
    held: input,
    captured,
    overview,
    dark,
  };
}
