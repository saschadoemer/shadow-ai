import type { PaletteColour } from './palette';

/** The game surface in game pixels (visual.md §1). It never changes size. */
export const SURFACE_WIDTH = 320;
export const SURFACE_HEIGHT = 180;

/**
 * What the game needs drawn, in whole game pixels on the 320x180 surface (architecture.md §5).
 * Colours are palette colours, so a colour outside Endesga 32 does not compile.
 */
export interface Renderer {
  clear(colour: PaletteColour): void;
  fillRect(x: number, y: number, width: number, height: number, colour: PaletteColour): void;
}
