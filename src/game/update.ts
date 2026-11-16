import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { creaturesFrom, noCaptures, stepCreatures } from './creature';
import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
import { type GameInput, stepPlayer } from './player';
import { standingWalls, stepWalls, wallsOf, withWalls } from './shadow';
import { type GameState, type LampState, NO_RECOIL, type PlayerState } from './state';
import { BASE_STRENGTH } from './world';

/**
 * The state before the first step: the player at the map's spawn, facing down, standing, not
 * pushed and not safe; the camera on it; the lamp off; one creature per named point of the map
 * (0008); overview full and the dark not running (0009); one mover per route on its point 1
 * (0015); a lamp of strength BASE_STRENGTH and every shadow wall of the map standing (0014). A
 * map with two wake points, a route that is malformed or crosses a solid tile, or a rectangle
 * that is no shadow wall is rejected here, before the game starts.
 */
export function createInitialState(map: TileMap): GameState {
  wakePoint(map);
  const routes = routesOf(map.points);
  checkRoutes(routes, map);
  const walls = wallsOf(map.rects);
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
    player,
    camera: followPlayer(player, map),
    lamp: { on: false, strength: BASE_STRENGTH },
    creatures: creaturesFrom(map.points),
    movers: moversFrom(routes),
    shadowWalls: standingWalls(walls),
    captured: noCaptures(),
    overview: initialOverview(),
    dark: 0,
  };
}

/**
 * Advances the game by exactly one logic step and returns the new state; its arguments are not
 * mutated. In the dark the step is the dark sequence and nothing else (0009). Otherwise: the
 * lamp is on when the input holds it and the figure is not being pushed; the figure is stepped;
 * each creature is stepped against the stepped figure (0008); the first free creature within
 * reach of a figure that is not safe hits; the camera follows the figure; each mover is stepped
 * against the figure after the hit, on routes rebuilt from the map's points (0015). The figure
 * and the creatures are stepped against the map with the walls standing at the start of the
 * step; then every standing wall is stepped against the stepped figure, on walls rebuilt from
 * the map's rectangles (0014).
 */
export function update(state: GameState, input: GameInput, content: TileMap): GameState {
  if (state.dark > 0) {
    return stepDark(state, content);
  }
  const lamp: LampState = {
    on: input.lamp && state.player.recoil.steps === 0,
    strength: state.lamp.strength,
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
    player,
    camera: followPlayer(player, content),
    lamp,
    creatures,
    movers: stepMovers(state.movers, routesOf(content.points), player),
    // The light on a wall is tested against the map as loaded: a wall does not block itself.
    shadowWalls: stepWalls(state.shadowWalls, walls, stepped, lamp, content),
    captured,
    overview,
    dark,
  };
}
