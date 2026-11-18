import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import {
  renderShadowTiles,
  renderTiles,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  tilesetJson,
} from './placeholder-tiles.ts';

/**
 * `npm run gen-tiles`: writes public/tiles/placeholder.png and placeholder.tsj from
 * tools/placeholder-tiles.ts, and public/tiles/placeholder-shadow.png, the same sheet in the
 * greys of a region under shadow (0023). Deterministic — pngjs writes no timestamp — and Node runs this
 * TypeScript file directly, without a transpiler.
 */

export function encodePng(): Buffer {
  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
  png.data = Buffer.from(renderTiles());
  return PNG.sync.write(png);
}

/** The shadow tileset (0023): it has no .tsj of its own and is drawn with the tileset's ids. */
export function encodeShadowPng(): Buffer {
  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
  png.data = Buffer.from(renderShadowTiles());
  return PNG.sync.write(png);
}

export function encodeTsj(): string {
  return `${JSON.stringify(tilesetJson(), null, 2)}\n`;
}

if (import.meta.main) {
  mkdirSync('public/tiles', { recursive: true });
  writeFileSync('public/tiles/placeholder.png', encodePng());
  writeFileSync('public/tiles/placeholder-shadow.png', encodeShadowPng());
  writeFileSync('public/tiles/placeholder.tsj', encodeTsj());
}
