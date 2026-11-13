import type { TileMap } from '../engine/tiled';
import { followPlayer } from './camera';
import { creaturesFrom, noCaptures, stepCreatures } from './creature';
import { initialOverview } from './overview';
import { type GameInput, stepPlayer } from './player';
import { type GameState, NO_RECOIL, type PlayerState } from './state';

/**
 * The state before the first step: the player at the map's spawn, facing down, standing, not
 * pushed and not safe; the camera on it; the lamp off; one creature per named point of the map
 * (0008); overview full and the dark not running (0009).
 */
export function createInitialState(map: TileMap): GameState {
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
    captured: noCaptures(),
    overview: initialOverview(),
    dark: 0,
  };
}

/**
 * Advances the game by exactly one logic step and returns the new state; its arguments are not
 * mutated. The camera follows the stepped player, after collision and clamp; the lamp is on in
 * exactly the steps whose input holds it (0007). Each creature is stepped against the stepped
 * player (0008). Overview and the dark are carried unchanged until the hit is wired in (0009).
 */
export function update(state: GameState, input: GameInput, content: TileMap): GameState {
  const player = stepPlayer(state.player, input, content);
  const { creatures, captured } = stepCreatures(
    state.creatures,
    state.captured,
    player,
    input.lamp,
    content,
  );
  return {
    tick: state.tick + 1,
    player,
    camera: followPlayer(player, content),
    lamp: { on: input.lamp },
    creatures,
    captured,
    overview: state.overview,
    dark: state.dark,
  };
}
