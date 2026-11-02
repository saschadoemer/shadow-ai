import type { GameState } from '../game/state';
import type { PaletteColour } from './palette';
import { type Renderer, SURFACE_HEIGHT, SURFACE_WIDTH } from './renderer';

/**
 * The test pattern of feature 0002, replaced by the map in 0003. It makes scale and timing
 * visible: a checkerboard shows sharp edges at every factor, the border shows that no edge is
 * cut, and the square crosses the surface in 320 steps, 5.33 s.
 */

const TILE = 16;
const SQUARE_SIZE = 16;
/** Vertically centred: (180 − 16) / 2. */
const SQUARE_Y = 82;

const DARK: PaletteColour = '#262b44';
const LIGHT: PaletteColour = '#3a4466';
const BORDER: PaletteColour = '#c0cbdc';
const SQUARE: PaletteColour = '#feae34';

export function squareX(tick: number): number {
  return tick % SURFACE_WIDTH;
}

/** Draws the pattern for this state; it reads the state and nothing else. */
export function drawTestPattern(renderer: Renderer, state: GameState): void {
  renderer.clear(DARK);
  // 180 = 11 × 16 + 4: the bottom row is a 4-px strip.
  for (let y = 0; y < SURFACE_HEIGHT; y += TILE) {
    for (let x = 0; x < SURFACE_WIDTH; x += TILE) {
      if ((x / TILE + y / TILE) % 2 === 1) {
        renderer.fillRect(x, y, TILE, Math.min(TILE, SURFACE_HEIGHT - y), LIGHT);
      }
    }
  }
  // Past x = 304 the square runs off the right edge; the surface clips it.
  renderer.fillRect(squareX(state.tick), SQUARE_Y, SQUARE_SIZE, SQUARE_SIZE, SQUARE);
  // Last, so all four edges stay visible while the square passes over them.
  renderer.fillRect(0, 0, SURFACE_WIDTH, 1, BORDER);
  renderer.fillRect(0, SURFACE_HEIGHT - 1, SURFACE_WIDTH, 1, BORDER);
  renderer.fillRect(0, 0, 1, SURFACE_HEIGHT, BORDER);
  renderer.fillRect(SURFACE_WIDTH - 1, 0, 1, SURFACE_HEIGHT, BORDER);
}
