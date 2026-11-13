import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { DOG_SHEET_HEIGHT, DOG_SHEET_WIDTH, renderDog } from './placeholder-dog.ts';
import { DRONE_SHEET_HEIGHT, DRONE_SHEET_WIDTH, renderDrone } from './placeholder-drone.ts';
import { LAMP_SHEET_HEIGHT, LAMP_SHEET_WIDTH, renderLamp } from './placeholder-lamp.ts';
import {
  OVERVIEW_SHEET_HEIGHT,
  OVERVIEW_SHEET_WIDTH,
  renderOverview,
} from './placeholder-overview.ts';
import { PERSON_SHIRTS, renderPerson } from './placeholder-person.ts';
import { renderPlayer, SHEET_HEIGHT, SHEET_WIDTH } from './placeholder-player.ts';
import { renderSnippet, SNIPPET_SHEET_HEIGHT, SNIPPET_SHEET_WIDTH } from './placeholder-snippet.ts';
import { renderVacuum, VACUUM_SHEET_HEIGHT, VACUUM_SHEET_WIDTH } from './placeholder-vacuum.ts';

/**
 * `npm run gen-sprites`: writes public/sprites/player.png from tools/placeholder-player.ts and
 * public/sprites/lamp.png from tools/placeholder-lamp.ts, public/sprites/snippet.png from
 * tools/placeholder-snippet.ts and public/sprites/overview.png from
 * tools/placeholder-overview.ts; and the movers' seven sheets of 0015 —
 * public/sprites/person-1.png to person-4.png from tools/placeholder-person.ts, dog.png,
 * vacuum.png and drone.png from tools/placeholder-dog.ts, -vacuum.ts and -drone.ts. Deterministic — pngjs writes no
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

export function encodeOverviewPng(): Buffer {
  const png = new PNG({ width: OVERVIEW_SHEET_WIDTH, height: OVERVIEW_SHEET_HEIGHT });
  png.data = Buffer.from(renderOverview());
  return PNG.sync.write(png);
}

/** A person of `look` n is person-(n + 1).png (0015). */
export function encodePersonPng(look: number): Buffer {
  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
  png.data = Buffer.from(renderPerson(look));
  return PNG.sync.write(png);
}

export function encodeDogPng(): Buffer {
  const png = new PNG({ width: DOG_SHEET_WIDTH, height: DOG_SHEET_HEIGHT });
  png.data = Buffer.from(renderDog());
  return PNG.sync.write(png);
}

export function encodeVacuumPng(): Buffer {
  const png = new PNG({ width: VACUUM_SHEET_WIDTH, height: VACUUM_SHEET_HEIGHT });
  png.data = Buffer.from(renderVacuum());
  return PNG.sync.write(png);
}

export function encodeDronePng(): Buffer {
  const png = new PNG({ width: DRONE_SHEET_WIDTH, height: DRONE_SHEET_HEIGHT });
  png.data = Buffer.from(renderDrone());
  return PNG.sync.write(png);
}

if (import.meta.main) {
  mkdirSync('public/sprites', { recursive: true });
  writeFileSync('public/sprites/player.png', encodePng());
  writeFileSync('public/sprites/lamp.png', encodeLampPng());
  writeFileSync('public/sprites/snippet.png', encodeSnippetPng());
  writeFileSync('public/sprites/overview.png', encodeOverviewPng());
  for (const look of PERSON_SHIRTS.keys()) {
    writeFileSync(`public/sprites/person-${look + 1}.png`, encodePersonPng(look));
  }
  writeFileSync('public/sprites/dog.png', encodeDogPng());
  writeFileSync('public/sprites/vacuum.png', encodeVacuumPng());
  writeFileSync('public/sprites/drone.png', encodeDronePng());
}
