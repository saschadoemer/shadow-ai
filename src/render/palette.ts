/**
 * Endesga 32, the one palette of the game (visual.md §4). Every pixel under public/ is one of
 * these colours; the asset test enforces it (INV-6).
 */
export const ENDESGA_32 = [
  '#be4a2f',
  '#d77643',
  '#ead4aa',
  '#e4a672',
  '#b86f50',
  '#733e39',
  '#3e2731',
  '#a22633',
  '#e43b44',
  '#f77622',
  '#feae34',
  '#fee761',
  '#63c74d',
  '#3e8948',
  '#265c42',
  '#193c3e',
  '#124e89',
  '#0099db',
  '#2ce8f5',
  '#ffffff',
  '#c0cbdc',
  '#8b9bb4',
  '#5a6988',
  '#3a4466',
  '#262b44',
  '#181425',
  '#ff0044',
  '#68386c',
  '#b55088',
  '#f6757a',
  '#e8b796',
  '#c28569',
] as const;

export type PaletteColour = (typeof ENDESGA_32)[number];

/** Reserved for the shadow and for nothing else in the world (visual.md §4). */
export const SHADOW_COLOUR: PaletteColour = '#68386c';

/** The page behind the canvas and, from 0002 on, the letterbox around it. */
export const PAGE_BACKGROUND: PaletteColour = '#181425';
