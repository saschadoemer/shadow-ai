import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { creaturesFrom, noCaptures, stepCreatures } from './creature';
import { checkRoutes, moversFrom, routesOf, stepMovers } from './mover';
import { applyHit, hittingCreature, initialOverview, stepDark, wakePoint } from './overview';
import { type GameInput, stepPlayer } from './player';
import { type GameState, NO_RECOIL, type PlayerState } from './state';

/**
 * The state before the first step: the player at the map's spawn, facing down, standing, not
 * pushed and not safe; the camera on it; the lamp off; one creature per named point of the map
 * (0008); overview full and the dark not running (0009); one mover per route on its point 1
 * (0015). A map with two wake points, or a route that is malformed or crosses a solid tile, is
 * rejected here, before the game starts.
 */
export function createInitialState(map: TileMap): GameState {
  wakePoint(map);
  const routes = routesOf(map.points);
  checkRoutes(routes, map);
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
    lamp: { on: false },
    creatures: creaturesFrom(map.points),
    movers: moversFrom(routes),
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
 * against the figure after the hit, on routes rebuilt from the map's points (0015).
 */
export function update(state: GameState, input: GameInput, content: TileMap): GameState {
  if (state.dark > 0) {
    return stepDark(state, content);
  }
  const lampOn = input.lamp && state.player.recoil.steps === 0;
  const stepped = stepPlayer(state.player, input, content);
  const { creatures, captured } = stepCreatures(
    state.creatures,
    state.captured,
    stepped,
    lampOn,
    content,
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
    lamp: { on: lampOn },
    creatures,
    movers: stepMovers(state.movers, routesOf(content.points), player),
    captured,
    overview,
    dark,
  };
}
