import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { LAMP_SHEET_HEIGHT, LAMP_SHEET_WIDTH, renderLamp } from './placeholder-lamp.ts';
import { renderPlayer, SHEET_HEIGHT, SHEET_WIDTH } from './placeholder-player.ts';
import { renderSnippet, SNIPPET_SHEET_HEIGHT, SNIPPET_SHEET_WIDTH } from './placeholder-snippet.ts';

/**
 * `npm run gen-sprites`: writes public/sprites/player.png from tools/placeholder-player.ts and
 * public/sprites/lamp.png from tools/placeholder-lamp.ts and public/sprites/snippet.png from
 * tools/placeholder-snippet.ts. Deterministic — pngjs writes no
 * timestamp — and Node runs this TypeScript file directly, without a transpiler.
 */

export function encodePng(): Buffer {
  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
  png.data = Buffer.from(renderPlayer());
  return PNG.sync.write(png);
}

export function encodeLampPng(): Buffer {
  const png = new PNG({ width: LAMP_SHEET_WIDTH, height: LAMP_SHEET_HEIGHT });
  png.data = Buffer.from(renderLamp());
  return PNG.sync.write(png);
}

export function encodeSnippetPng(): Buffer {
  const png = new PNG({ width: SNIPPET_SHEET_WIDTH, height: SNIPPET_SHEET_HEIGHT });
  png.data = Buffer.from(renderSnippet());
  return PNG.sync.write(png);
}

if (import.meta.main) {
  mkdirSync('public/sprites', { recursive: true });
  writeFileSync('public/sprites/player.png', encodePng());
  writeFileSync('public/sprites/lamp.png', encodeLampPng());
  writeFileSync('public/sprites/snippet.png', encodeSnippetPng());
}
