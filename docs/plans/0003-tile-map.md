# 0003 — Implementation plan: tile map

**Spec:** [`docs/features/0003-tile-map.md`](../features/0003-tile-map.md) (approved 2026-11-02).
The plan argues from the spec; where they differ, the spec wins. Read the spec first, then
`CLAUDE.md`, then `docs/spec/architecture.md` §1, §2, §5–§7 and `docs/spec/testing.md`.
**Written:** 2026-11-02 on the planning model. A working document, not specification: once the
feature is implemented, what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens.

**Goal:** the test map authored in Tiled's JSON format renders on the surface from the generated
placeholder tileset, layer by layer, and the loader refuses every map that breaks the rules.

**Approach:** every rule is a pure function tested in Node before it exists: the tile generator
(pixels and `.tsj`), the Tiled parser (tileset, tileset reference, map), path resolution, and the
draw order. The browser-facing parts — `fetch`, `createImageBitmap`, `drawImage` — are thin and
are covered by the smoke spec and the acceptance plan.

## Global constraints

- No new dependency, runtime or development. `pngjs` is already there; Node 26 runs `.ts` files
  natively (checked: `node tools/x.ts` with `.ts`-extension imports and a named import from
  `pngjs` both work; `import.meta.main` exists).
- `src/game/` does not change in this feature. `GameState` stays `{ tick }` (INV-1, INV-2).
- `src/engine/` imports nothing from the project; `src/render/` may import `src/engine/` and
  `src/game/` types (`architecture.md` §1).
- No literal text a player can read (INV-4). Error messages go to the console; they are not
  player text.
- Colours are `PaletteColour`; the generator takes them from `src/render/palette.ts`.
- **The dist scan forbids `http://` and `https://` anywhere in `dist/`** (INV-5). Path resolution
  must not embed a dummy `http://` origin — use `file:///` (Task 6).
- Biome and `tsc` are the arbiters: no `any`, no `!` non-null assertions where a check reads
  better, `noUncheckedIndexedAccess` is on, so iterate with `entries()` or check `undefined`.
- Branch `feature/0003-tile-map` (this worktree). Commit messages: imperative subject, a body
  with the why, and the trailer `Co-Authored-By:` for the model that wrote the commit.

## Design notes

- **Three parse functions, all pure** (`src/engine/tiled.ts`): `tilesetSource(mapJson, mapFile)`
  finds the one external tileset's `source`; `parseTileset(json, file)` reads a `.tsj`;
  `parseTileMap(mapJson, tileset, mapFile)` reads the map against the parsed tileset. `main.ts`
  threads them together with `loadJson`. Each throws a plain `Error` whose message starts with
  the file: `` `${file}: ${problem}` ``. The exact problem texts are in Task 5; tests assert them.
- **Cells hold tileset ids, `EMPTY` is −1.** Gid 0 becomes `EMPTY`; gid `g` becomes
  `g − firstgid`. The spec's rules 8 and 9 are checked per cell before the subtraction.
- **Flag bits without bitwise arithmetic:** any gid `≥ 0x10000000` (268 435 456) has one of
  Tiled's four flag bits set. Tilesets are tiny, so this single comparison is rule 8.
- **Generator split in two files:** `tools/placeholder-tiles.ts` is pure — it returns the RGBA
  pixels and the `.tsj` object — and is what the unit test imports; `tools/gen-tiles.ts` encodes
  and writes the files and is what `npm run gen-tiles` runs. The committed-file test compares
  the `.tsj` text byte for byte and the PNG by decoded pixels and size, not by bytes: zlib output
  may differ between Node builds, pixels never do. The two-runs test compares bytes.
- **The renderer gets a `TilesetImage`:** `{ image: ImageBitmap, columns }`. Tests pass
  `{} as ImageBitmap`; only the Canvas 2D implementation touches the image.
- **`drawMap` clears first** with `PAGE_BACKGROUND`, then draws `ground`, `detail`, `above`;
  every non-empty cell, no culling (240 cells × 3 layers is nothing; 0006 adds the camera).
- **Fixtures are Tiled files.** They carry the fields Tiled writes (`compressionlevel`,
  `nextlayerid`, `nextobjectid`, `renderorder`, `tiledversion`, `version`) so that Tiled opens
  them; the parser ignores those fields. Fixture maps reference `fixture-tiles.tsj`, never the
  generated tileset (`testing.md` §6). The parser never loads an image, so fixtures need no PNG.

## File map

| File | Responsibility |
|---|---|
| `tools/placeholder-tiles.ts` | pure: `TILE_KINDS`, `renderTiles()` → RGBA buffer 112x16, `tilesetJson()` → the `.tsj` object |
| `tools/gen-tiles.ts` | `node` entry: encodes the PNG with `pngjs`, writes both files under `public/tiles/` |
| `public/tiles/placeholder.png`, `public/tiles/placeholder.tsj` | generated, committed |
| `public/maps/test.tmj` | the test map, Tiled JSON, layout from the spec |
| `src/engine/tiled.ts` | `TILE_SIZE`, `EMPTY`, `TileLayerName`, `Tileset`, `TileMap`, `tilesetSource`, `parseTileset`, `parseTileMap` |
| `src/engine/assets.ts` | `resolvePath(relative, baseFile)`, `loadJson(url)`, `loadImage(url)` |
| `src/render/renderer.ts` | `TilesetImage`; `Renderer.drawTile(tileset, id, x, y)` |
| `src/render/canvas2d/canvas2d-renderer.ts` | `drawTile` with `drawImage` from the sprite sheet |
| `src/render/draw-map.ts` | `drawMap(renderer, map, tileset)` |
| `src/main.ts` | loads map, tileset and image, then starts the loop drawing the map |
| `src/render/test-pattern.ts`, `tests/unit/pattern.test.ts` | deleted |
| `tests/unit/gen-tiles.test.ts` | determinism, committed files, size, base pixels, `solid` set |
| `tests/unit/tileset-check.ts`, `tests/unit/assets.test.ts` | `.tsj` against PNG, with a negative case |
| `tests/unit/tiled.test.ts` | happy path on the corridor; rules 1–11 |
| `tests/unit/asset-loading.test.ts` | `resolvePath`; `loadJson` with a stubbed `fetch` |
| `tests/unit/draw-map.test.ts` | layer order, empty cells, positions, clear first |
| `tests/fixtures/maps/*.tmj`, `*.tsj` | corridor, unknown-layer, no-spawn, tile-32, too-small; fixture-tiles, fixture-tiles-32 |
| `tests/e2e/smoke.spec.ts` | corner pixel `#63c74d`; motion check removed |
| `tsconfig.json`, `package.json` | `allowImportingTsExtensions`; script `gen-tiles` |
| `docs/spec/architecture.md`, `docs/spec/testing.md`, `README.md` | §6, §7; §1, §2; status |

---

### Task 1: The placeholder tileset generator

**Files:**
- Create: `tools/placeholder-tiles.ts`, `tools/gen-tiles.ts`, `tests/unit/gen-tiles.test.ts`
- Create (generated): `public/tiles/placeholder.png`, `public/tiles/placeholder.tsj`
- Modify: `tsconfig.json` (add `"allowImportingTsExtensions": true` to `compilerOptions`),
  `package.json` (add `"gen-tiles": "node tools/gen-tiles.ts"` to `scripts`)

**Interfaces — produces:**

```ts
// tools/placeholder-tiles.ts
import { type PaletteColour } from '../src/render/palette.ts';   // .ts extension: Node runs this file

export const TILE_SIZE = 16;
export interface TileKind {
  readonly id: number;
  readonly name: string;
  readonly base: PaletteColour;
  readonly second: PaletteColour;
  readonly solid: boolean;
}
export const TILE_KINDS: readonly TileKind[];                  // the spec's table, ids 0–6
export const SHEET_WIDTH = 112;                                 // 7 × 16
export const SHEET_HEIGHT = 16;
/** RGBA, row-major, SHEET_WIDTH × SHEET_HEIGHT × 4 bytes; alpha 0 or 255. */
export function renderTiles(): Uint8Array;
/** The .tsj object, as Tiled reads it. */
export function tilesetJson(): TilesetJson;
export interface TilesetJson { columns: number; image: string; imageheight: number; imagewidth: number; margin: number; name: string; spacing: number; tilecount: number; tileheight: number; tiles: { id: number; properties: { name: 'solid'; type: 'bool'; value: true }[] }[]; tilewidth: number; type: 'tileset'; version: '1.10' }
```

The kinds, from the spec:

| id | name | base | second | solid |
|---|---|---|---|---|
| 0 | grass | `#63c74d` | `#3e8948` | false |
| 1 | path | `#e8b796` | `#c28569` | false |
| 2 | wall | `#8b9bb4` | `#5a6988` | true |
| 3 | water | `#0099db` | `#2ce8f5` | true |
| 4 | fence | `#b86f50` | `#733e39` | true |
| 5 | door-closed | `#733e39` | `#3e2731` | true |
| 6 | roof | `#be4a2f` | `#a22633` | true |

The patterns, in tile-local pixels (x, y), 0–15. Each tile is first filled with its base colour
(the fence with transparent, alpha 0), then the second colour is placed; the fence's posts come
last in the base colour. Pixel (0, 0) of every tile ends up in its base colour — the spec relies
on that, and the test checks it.

- **grass:** second at (2, 3), (9, 1), (13, 6), (5, 10), (11, 12), (1, 14).
- **path:** second at (3, 2), (10, 4), (6, 8), (13, 11), (1, 13), (8, 14).
- **wall:** second on rows y ∈ {3, 7, 11, 15} for all x; and on x = 7 for y ∈ 0–2 and 8–10;
  and on x ∈ {3, 11} for y ∈ 4–6 and 12–14.
- **water:** second on y ∈ {3, 9} for x ∈ 2–6; and on y ∈ {6, 12} for x ∈ 9–13.
- **fence:** everything transparent; rails in the second colour on y ∈ {4, 5, 11, 12} for all x;
  then posts in the base colour on x ∈ {0, 1, 8, 9} for all y.
- **door-closed:** second on x ∈ {2, 13} for y ∈ 2–15, on y = 2 for x ∈ 2–13, and a handle at
  (11, 9).
- **roof:** second on rows y ∈ {3, 7, 11, 15} for all x; and on x = 7 for y ∈ 0–2 and 8–10; and
  on x ∈ {3, 11} for y ∈ 4–6 and 12–14 (the wall's joints in the roof's colours).

`tilesetJson()` returns, with keys in this order:

```json
{
  "columns": 7, "image": "placeholder.png", "imageheight": 16, "imagewidth": 112,
  "margin": 0, "name": "placeholder", "spacing": 0, "tilecount": 7, "tileheight": 16,
  "tiles": [
    { "id": 2, "properties": [{ "name": "solid", "type": "bool", "value": true }] },
    { "id": 3, "properties": [{ "name": "solid", "type": "bool", "value": true }] },
    { "id": 4, "properties": [{ "name": "solid", "type": "bool", "value": true }] },
    { "id": 5, "properties": [{ "name": "solid", "type": "bool", "value": true }] },
    { "id": 6, "properties": [{ "name": "solid", "type": "bool", "value": true }] }
  ],
  "tilewidth": 16, "type": "tileset", "version": "1.10"
}
```

`tools/gen-tiles.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { renderTiles, SHEET_HEIGHT, SHEET_WIDTH, tilesetJson } from './placeholder-tiles.ts';

export function encodePng(): Buffer {
  const png = new PNG({ width: SHEET_WIDTH, height: SHEET_HEIGHT });
  png.data = Buffer.from(renderTiles());
  return PNG.sync.write(png);
}
export function encodeTsj(): string {
  return `${JSON.stringify(tilesetJson(), null, 2)}\n`;
}
if (import.meta.main) {
  mkdirSync('public/tiles', { recursive: true });
  writeFileSync('public/tiles/placeholder.png', encodePng());
  writeFileSync('public/tiles/placeholder.tsj', encodeTsj());
}
```

- [ ] **Step 1: tooling.** Add `allowImportingTsExtensions` to `tsconfig.json` and the
  `gen-tiles` script to `package.json`. Run `npm run typecheck` — still green.
- [ ] **Step 2: write the failing test** `tests/unit/gen-tiles.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { encodePng, encodeTsj } from '../../tools/gen-tiles.ts';
import { renderTiles, SHEET_HEIGHT, SHEET_WIDTH, TILE_KINDS, TILE_SIZE, tilesetJson } from '../../tools/placeholder-tiles.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PNG_FILE = join(ROOT, 'public/tiles/placeholder.png');
const TSJ_FILE = join(ROOT, 'public/tiles/placeholder.tsj');

function hexAt(data: Uint8Array, x: number, y: number): string {
  const o = (y * SHEET_WIDTH + x) * 4;
  return `#${[data[o], data[o + 1], data[o + 2]].map((c) => (c ?? 0).toString(16).padStart(2, '0')).join('')}`;
}

describe('the placeholder tileset generator', () => {
  it('is deterministic: two runs give byte-identical files', () => {
    expect(encodePng().equals(encodePng())).toBe(true);
    expect(encodeTsj()).toBe(encodeTsj());
  });
  it('matches the committed files', () => {
    const committed = PNG.sync.read(readFileSync(PNG_FILE));
    expect([committed.width, committed.height]).toStrictEqual([SHEET_WIDTH, SHEET_HEIGHT]);
    expect(Buffer.from(renderTiles()).equals(committed.data)).toBe(true);
    expect(readFileSync(TSJ_FILE, 'utf8')).toBe(encodeTsj());
  });
  it('is 112x16: seven tiles in one row', () => {
    expect(SHEET_WIDTH).toBe(7 * TILE_SIZE);
    expect(renderTiles()).toHaveLength(SHEET_WIDTH * SHEET_HEIGHT * 4);
  });
  it('puts every tile\'s base colour at its pixel (0, 0)', () => {
    const data = renderTiles();
    for (const kind of TILE_KINDS) {
      expect(hexAt(data, kind.id * TILE_SIZE, 0), kind.name).toBe(kind.base);
      expect(data[(kind.id * TILE_SIZE) * 4 + 3], `${kind.name} alpha`).toBe(255);
    }
  });
  it('marks exactly tiles 2–6 solid in the .tsj', () => {
    const tsj = tilesetJson();
    expect(tsj.tiles.map((t) => t.id)).toStrictEqual([2, 3, 4, 5, 6]);
    expect(tsj).toMatchObject({ columns: 7, tilecount: 7, tilewidth: 16, tileheight: 16, imagewidth: 112, imageheight: 16, image: 'placeholder.png' });
  });
});
```

- [ ] **Step 3: run it, see it fail** (`npx vitest run tests/unit/gen-tiles.test.ts`): modules
  missing.
- [ ] **Step 4: write `tools/placeholder-tiles.ts`** with `TILE_KINDS`, the pattern functions
  above and `tilesetJson()`. Helper: `put(data, x, y, colour)` writes RGBA from `#rrggbb`;
  `fillTile(data, id, colour | null)`. Then `tools/gen-tiles.ts` as given.
- [ ] **Step 5: generate** — `npm run gen-tiles`; then run the test file: green. Run
  `npm run gen-tiles` a second time and `git status`: no change beyond the two new files.
- [ ] **Step 6: `npm run check`** — the asset test now checks a real PNG: palette, alpha, 16-px
  alignment. Green.
- [ ] **Step 7: commit** — `Add the placeholder tileset generator` with the why: deterministic,
  in-palette tiles fix tileset size and ids before any art exists (`visual.md` §5).

---

### Task 2: The `.tsj`-against-PNG asset check

**Files:**
- Create: `tests/unit/tileset-check.ts`
- Modify: `tests/unit/assets.test.ts`

**Interfaces — produces:**

```ts
// tests/unit/tileset-check.ts
export interface TilesetFacts { readonly tilewidth: number; readonly tileheight: number; readonly columns: number; readonly tilecount: number; readonly imagewidth: number; readonly imageheight: number; readonly image: string }
/** Findings for one .tsj against the size of its PNG; [] means consistent. */
export function checkTileset(file: string, tsj: TilesetFacts, png: { width: number; height: number }): string[];
```

Findings, in this order, each prefixed `${file}: `:
- `image size ${tsj.imagewidth}x${tsj.imageheight} does not match the PNG (${png.width}x${png.height})`
- `tile size is ${tilewidth}x${tileheight}; tiles are 16x16`
- `columns ${columns} does not match imagewidth / 16 = ${imagewidth / 16}`
- `tilecount ${tilecount} does not match columns × rows = ${columns * (imageheight / 16)}`

- [ ] **Step 1: failing tests** in `assets.test.ts`, a new `describe('every tileset under
  public/tiles/ matches its PNG (INV-6)')`: (a) for every `public/tiles/**/*.tsj`, parse JSON,
  read the PNG named by `image` relative to the `.tsj`, `checkTileset` → `[]`; (b) negative:
  `checkTileset('x.tsj', { ...facts, tilecount: 8 }, { width: 112, height: 16 })` →
  `['x.tsj: tilecount 8 does not match columns × rows = 7']`; (c) negative: image size
  mismatch message.
- [ ] **Step 2: see them fail; write `tileset-check.ts`; see them pass.**
- [ ] **Step 3: `npm run check`; commit** — `Check every tileset's .tsj against its PNG` (why:
  `testing.md` §1 promised it; the first `.tsj` makes it real).

---

### Task 3: Parsing a tileset and finding the map's tileset

**Files:**
- Create: `src/engine/tiled.ts`, `tests/unit/tiled.test.ts`,
  `tests/fixtures/maps/fixture-tiles.tsj`, `tests/fixtures/maps/fixture-tiles-32.tsj`

**Interfaces — produces:**

```ts
// src/engine/tiled.ts
export const TILE_SIZE = 16;
export const EMPTY = -1;
export const TILE_LAYER_NAMES = ['ground', 'detail', 'above'] as const;
export type TileLayerName = (typeof TILE_LAYER_NAMES)[number];
export const OBJECT_LAYER_NAME = 'objects';

export interface Tileset {
  /** The image path as written in the .tsj, relative to it. */
  readonly image: string;
  readonly columns: number;
  readonly tileCount: number;
  /** Index: tile id. */
  readonly solid: readonly boolean[];
}

/** The `source` of the map's one external tileset, as written (relative to the map). */
export function tilesetSource(mapJson: unknown, mapFile: string): string;
export function parseTileset(json: unknown, file: string): Tileset;
```

Internal helpers (same file, not exported):

```ts
type Json = Record<string, unknown>;
function fail(file: string, problem: string): never { throw new Error(`${file}: ${problem}`); }
function asRecord(value: unknown, file: string, what: string): Json;      // `${what} is not an object`
function asArray(value: unknown, file: string, what: string): unknown[];  // `${what} is not an array`
function asNumber(value: unknown, file: string, what: string): number;    // `${what} is not a number`
function asString(value: unknown, file: string, what: string): string;    // `${what} is not a string`
```

`parseTileset` reads `tilewidth`, `tileheight`, `columns`, `tilecount`, `image`, `tiles` (may be
absent). Rule 5: `tile size is ${w}x${h}; tiles are 16x16`. `solid[id]` is true when a tile
entry has a property `{ name: 'solid', type: 'bool', value: true }`; entries without it, and ids
without an entry, are false; `solid.length === tilecount`.

`tilesetSource` reads `tilesets`: `map has no tileset` when empty; `map has ${n} tilesets;
exactly one is required` when more than one; `tileset is embedded; an external .tsj is
required` when the entry has no `source`; `tileset source "${source}" does not end in .tsj`
otherwise. (Rule 10; "cannot be loaded" is `loadJson`'s error in Task 6.)

`tests/fixtures/maps/fixture-tiles.tsj` (hand-written, Tiled's fields):

```json
{
 "columns":2,
 "image":"fixture-tiles.png",
 "imageheight":16,
 "imagewidth":32,
 "margin":0,
 "name":"fixture-tiles",
 "spacing":0,
 "tilecount":2,
 "tiledversion":"1.11.2",
 "tileheight":16,
 "tiles":[
        {
         "id":1,
         "properties":[
                {
                 "name":"solid",
                 "type":"bool",
                 "value":true
                }]
        }],
 "tilewidth":16,
 "type":"tileset",
 "version":"1.10"
}
```

`fixture-tiles-32.tsj`: the same with `tilewidth` and `tileheight` 32, `imagewidth` 64,
`imageheight` 32.

- [ ] **Step 1: failing tests** in `tiled.test.ts`, `describe('parseTileset')`: the fixture
  gives `{ image: 'fixture-tiles.png', columns: 2, tileCount: 2, solid: [false, true] }`; the
  32 fixture throws `tests/fixtures/maps/fixture-tiles-32.tsj: tile size is 32x32; tiles are
  16x16`; a non-object input throws `x.tsj: tileset is not an object`. `describe('tilesetSource')`
  with in-memory maps: `{ tilesets: [{ firstgid: 1, source: '../tiles/placeholder.tsj' }] }` →
  `'../tiles/placeholder.tsj'`; the four rejections above with their exact messages.
- [ ] **Step 2: see them fail; write the two functions and the helpers; see them pass.**
- [ ] **Step 3: one `TILE_SIZE`.** Replace the generator's own `TILE_SIZE` in
  `tools/placeholder-tiles.ts` with `import { TILE_SIZE } from '../src/engine/tiled.ts'`;
  the test of Task 1 keeps importing it from the tools module, which re-exports it.
- [ ] **Step 4: `npm run check`; commit** — `Parse Tiled tilesets and find a map's tileset`.

---

### Task 4: Parsing a map — the happy path on the corridor

**Files:**
- Modify: `src/engine/tiled.ts`, `tests/unit/tiled.test.ts`
- Create: `tests/fixtures/maps/corridor.tmj`

**Interfaces — produces:**

```ts
export interface Point { readonly x: number; readonly y: number }
export interface TileMap {
  readonly width: number;    // tiles
  readonly height: number;   // tiles
  /** Row-major, width × height, tileset ids or EMPTY. */
  readonly ground: readonly number[];
  readonly detail: readonly number[];
  readonly above: readonly number[];
  /** Pixels; 0004 uses it as the feet position. */
  readonly spawn: Point;
  /** Row-major, width × height: a solid tile on any of the three layers. */
  readonly solid: readonly boolean[];
}
export function parseTileMap(mapJson: unknown, tileset: Tileset, mapFile: string): TileMap;
```

An absent `detail` or `above` layer yields an array of `EMPTY`. The cell index of (column,
row) is `row * width + column`.

`corridor.tmj` — 20x12, floor everywhere (gid 1), walls (gid 2) on `detail`: column 10 for
rows 2–9 except row 6 (the gap), and the lone tile (4, 3); one wall on `above` at (2, 2); spawn
at pixel (40, 56). Written as Tiled writes it (layer `data` is one flat array; the line breaks
below are only for reading):

```json
{
 "compressionlevel":-1,
 "height":12,
 "infinite":false,
 "layers":[
        {
         "data":[ 240 × 1 ],
         "height":12,
         "id":1,
         "name":"ground",
         "opacity":1,
         "type":"tilelayer",
         "visible":true,
         "width":20,
         "x":0,
         "y":0
        },
        {
         "data":[
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,
          0,0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
         "height":12,
         "id":2,
         "name":"detail",
         "opacity":1,
         "type":"tilelayer",
         "visible":true,
         "width":20,
         "x":0,
         "y":0
        },
        {
         "data":[ 240 × 0, except index 42 (column 2, row 2) = 2 ],
         "height":12,
         "id":3,
         "name":"above",
         "opacity":1,
         "type":"tilelayer",
         "visible":true,
         "width":20,
         "x":0,
         "y":0
        },
        {
         "draworder":"topdown",
         "id":4,
         "name":"objects",
         "objects":[
                {
                 "height":0,
                 "id":1,
                 "name":"spawn",
                 "point":true,
                 "rotation":0,
                 "type":"",
                 "visible":true,
                 "width":0,
                 "x":40,
                 "y":56
                }],
         "opacity":1,
         "type":"objectgroup",
         "visible":true,
         "x":0,
         "y":0
        }],
 "nextlayerid":5,
 "nextobjectid":2,
 "orientation":"orthogonal",
 "renderorder":"right-down",
 "tiledversion":"1.11.2",
 "tileheight":16,
 "tilesets":[
        {
         "firstgid":1,
         "source":"fixture-tiles.tsj"
        }],
 "tilewidth":16,
 "type":"map",
 "version":"1.10",
 "width":20
}
```

- [ ] **Step 1: failing tests**, `describe('parseTileMap on the corridor')`, loading both
  fixtures with `readFileSync` + `JSON.parse` and `parseTileset` from Task 3:
  - `width` 20, `height` 12; `ground` has 240 entries, all `0`; `detail[3 * 20 + 4]` is `1`;
    `detail[6 * 20 + 10]` is `EMPTY`; `detail[5 * 20 + 10]` is `1`; `above[2 * 20 + 2]` is `1`;
  - `spawn` is `{ x: 40, y: 56 }`;
  - `solid[3 * 20 + 4]` true, `solid[6 * 20 + 10]` false, `solid[5 * 20 + 10]` true,
    `solid[2 * 20 + 2]` true (from `above`), `solid[0]` false; `solid.filter(Boolean)` has
    length 9;
  - a map without `detail` and `above` (in-memory: the corridor with those two layers removed)
    gives arrays of 240 `EMPTY` for both;
  - the result survives `JSON.parse(JSON.stringify(map))` unchanged (it is content, but plain
    data costs nothing and 0005 keeps it beside the state).
- [ ] **Step 2: see them fail; implement `parseTileMap`** — read the fields, find the layers by
  name, convert gids, build `solid`. Leave the rejections of Task 5 for Task 5, but structure
  the code so each rule is one check with one message.
- [ ] **Step 3: see them pass; `npm run check`; commit** — `Parse a Tiled map into layers, spawn
  and solid grid`.

---

### Task 5: The loader rejects what the game cannot read

**Files:**
- Modify: `src/engine/tiled.ts`, `tests/unit/tiled.test.ts`
- Create: `tests/fixtures/maps/unknown-layer.tmj`, `no-spawn.tmj`, `tile-32.tmj`, `too-small.tmj`

The exact messages (after `${mapFile}: `). Cells are named (column, row).

| Rule | Trigger | Message |
|---|---|---|
| 11 | `orientation` ≠ `orthogonal` | `orientation "isometric" is not supported; only orthogonal` |
| 7 | `infinite === true` | `infinite maps are not supported` |
| 5 | map `tilewidth`/`tileheight` ≠ 16 | `tile size is 32x32; tiles are 16x16` |
| 6 | `width < 20` or `height < 12` | `map is 10x6 tiles; at least 20x12 (320x180 px) is required` |
| 1 | unknown layer name | `layer "decor" is not one of ground, detail, above, objects` |
| 2 | type mismatch | `layer "objects" must be an object layer` / `layer "ground" must be a tile layer` |
| 3 | duplicate | `layer "ground" appears twice` |
| 3 | missing | `layer "ground" is missing` / `layer "objects" is missing` |
| 4 | no spawn | `layer "objects" has no point object named "spawn"` |
| 4 | two spawns | `layer "objects" has 2 point objects named "spawn"; exactly one is required` |
| 7 | encoding | `layer "ground" uses encoding "base64"; only CSV (an array of numbers) is supported` |
| 7 | compression | `layer "ground" uses compression "zlib"; only CSV (an array of numbers) is supported` |
| 7 | length | `layer "ground" has 3 cells; 240 are required` |
| 7 | not a whole number | `layer "ground" cell (0, 0) is not a whole number` |
| 8 | gid ≥ 0x10000000 | `layer "ground" cell (0, 0) is flipped or rotated; flipped or rotated tiles are not supported` |
| 9 | gid > firstgid + tileCount − 1 | `layer "ground" cell (5, 0) has tile id 3, which is outside the tileset (1–2)` |

Check order: orientation, infinite, tile size, map size, then layers in file order (name, type,
duplicate, data), then missing layers, then spawn. `encoding` of `"csv"` and `compression` of
`""` are accepted as absent. Gid 0 is never range-checked.

Fixtures: `unknown-layer.tmj` is the corridor with a third tile layer named `decor` (all 0);
`no-spawn.tmj` is the corridor whose only object is a point named `door`; `tile-32.tmj` is the
corridor with `tilewidth` and `tileheight` 32 referencing `fixture-tiles-32.tsj`;
`too-small.tmj` is a 10x6 map (60 cells per layer) with `ground` and `objects` + spawn only.
Keep every fixture a file Tiled would open.

- [ ] **Step 1: failing tests**, `describe('parseTileMap rejects')`: one `it` per row of the
  table. The four fixtures load from disk; every other row uses
  `variant((m) => { ... })` — `structuredClone` of the parsed corridor plus a mutation — e.g.
  `variant((m) => { m.layers[0].data = [1.5, ...rest] })`. Type the corridor JSON loosely in the
  test as `Record<string, unknown>` with a small `layer(m, name)` accessor; `any` stays
  forbidden. Also assert that `too-small.tmj` is rejected *before* layers are read (message is
  the size one).
- [ ] **Step 2: see them fail; add the checks; see them pass.** Add a negative test that a
  message starts with the map file name.
- [ ] **Step 3: `npm run check`; commit** — `Reject maps the game cannot read, naming the
  problem` (why: a guard without a test that fires is a comment, `testing.md` §3).

---

### Task 6: Loading from the game's origin

**Files:**
- Create: `src/engine/assets.ts`, `tests/unit/asset-loading.test.ts`

**Interfaces — produces:**

```ts
// src/engine/assets.ts
/** Resolves a path as written in a file against that file's own URL path, e.g.
 *  ('../tiles/placeholder.tsj', '/maps/test.tmj') → '/tiles/placeholder.tsj'. */
export function resolvePath(relative: string, baseFile: string): string;
/** GET from the game's own origin; rejects with `${url}: HTTP ${status}` when not ok. */
export function loadJson(url: string): Promise<unknown>;
/** GET + decode; rejects like loadJson, or with the decoder's error. */
export function loadImage(url: string): Promise<ImageBitmap>;
```

```ts
export function resolvePath(relative: string, baseFile: string): string {
  // The dist scan forbids http:// in the bundle (INV-5); file:/// is a URL base without one.
  return new URL(relative, new URL(baseFile, 'file:///')).pathname;
}
export async function loadJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
export async function loadImage(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return createImageBitmap(await response.blob());
}
```

- [ ] **Step 1: failing tests**: `resolvePath('../tiles/placeholder.tsj', '/maps/test.tmj')`
  → `/tiles/placeholder.tsj`; `resolvePath('placeholder.png', '/tiles/placeholder.tsj')` →
  `/tiles/placeholder.png`; `resolvePath('/x.json', '/maps/test.tmj')` → `/x.json`. `loadJson`
  with `vi.stubGlobal('fetch', ...)`: a 200 `Response` with JSON resolves to the object; a 404
  rejects with `/maps/missing.tmj: HTTP 404`. (`Response` exists in Node 26.) Restore with
  `vi.unstubAllGlobals()` in `afterEach`.
- [ ] **Step 2: see them fail; write `assets.ts`; see them pass.** `loadImage` has no unit
  test (no `createImageBitmap` in Node); the smoke spec covers it.
- [ ] **Step 3: `npm run check`** — the dist scan still passes (no `http://`). Commit —
  `Load JSON and images from the game's own origin`.

---

### Task 7: Drawing tiles and the map

**Files:**
- Modify: `src/render/renderer.ts`, `src/render/canvas2d/canvas2d-renderer.ts`
- Create: `src/render/draw-map.ts`, `tests/unit/draw-map.test.ts`

**Interfaces — produces:**

```ts
// src/render/renderer.ts (additions)
export interface TilesetImage {
  readonly image: ImageBitmap;
  readonly columns: number;
}
export interface Renderer {
  clear(colour: PaletteColour): void;
  fillRect(x: number, y: number, width: number, height: number, colour: PaletteColour): void;
  /** Draws tile `id` of the tileset with its top-left corner at (x, y), 16x16. */
  drawTile(tileset: TilesetImage, id: number, x: number, y: number): void;
}

// src/render/draw-map.ts
export function drawMap(renderer: Renderer, map: TileMap, tileset: TilesetImage): void;
```

```ts
// draw-map.ts
import { EMPTY, TILE_LAYER_NAMES, TILE_SIZE, type TileMap } from '../engine/tiled';
import { PAGE_BACKGROUND } from './palette';
import type { Renderer, TilesetImage } from './renderer';

export function drawMap(renderer: Renderer, map: TileMap, tileset: TilesetImage): void {
  renderer.clear(PAGE_BACKGROUND);
  for (const name of TILE_LAYER_NAMES) {
    for (const [index, id] of map[name].entries()) {
      if (id === EMPTY) continue;
      renderer.drawTile(tileset, id, (index % map.width) * TILE_SIZE, Math.floor(index / map.width) * TILE_SIZE);
    }
  }
}
```

Canvas 2D: `drawTile` computes `sx = (id % columns) * 16`, `sy = Math.floor(id / columns) * 16`
and calls `draw.drawImage(image, sx, sy, 16, 16, x, y, 16, 16)`; set
`draw.imageSmoothingEnabled = false` once after creating the offscreen context.

- [ ] **Step 1: failing test** `draw-map.test.ts` with a recording fake renderer (`calls:
  string[]`, each call pushed as `clear #181425` / `drawTile 3 at 32,16`) on an in-memory 3x2
  `TileMap` (`width: 3, height: 2`, `ground: [0, 1, EMPTY, 2, 2, 2]`, `detail: [EMPTY, EMPTY,
  EMPTY, EMPTY, 4, EMPTY]`, `above: [6, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]`, any spawn, any
  solid). Expected calls, in order: `clear #181425`, `drawTile 0 at 0,0`, `drawTile 1 at 16,0`,
  `drawTile 2 at 0,16`, `drawTile 2 at 16,16`, `drawTile 2 at 32,16`, `drawTile 4 at 16,16`,
  `drawTile 6 at 0,0`. The tileset is `{ image: {} as ImageBitmap, columns: 7 }`.
- [ ] **Step 2: see it fail; add `TilesetImage` and `drawTile` to the interface, the Canvas 2D
  implementation and `draw-map.ts`; see it pass.** `pattern.test.ts`'s fake renderer needs
  `drawTile` too for now — it goes in Task 8.
- [ ] **Step 3: `npm run check`; commit** — `Draw tiles from a tileset and a map layer by layer`.

---

### Task 8: The test map, the wiring and the smoke spec

**Files:**
- Create: `public/maps/test.tmj`
- Modify: `src/main.ts`, `tests/e2e/smoke.spec.ts`
- Delete: `src/render/test-pattern.ts`, `tests/unit/pattern.test.ts`

`public/maps/test.tmj` — 20x12, tileset `{ "firstgid": 1, "source": "../tiles/placeholder.tsj" }`,
the same Tiled fields as the corridor (`compressionlevel`, `nextlayerid` 5, `nextobjectid` 2,
`orientation`, `renderorder`, `tiledversion`, `version` `"1.10"`, `type` `"map"`), spawn point
at `x: 136, y: 120`. Gids: grass 1, path 2, wall 3, water 4, fence 5, door 6, roof 7. Layer
data (rows for reading; the file holds one flat array per layer):

`ground`:

```
1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,
1,1,7,7,7,7,1,1,1,2,1,1,3,3,3,3,3,1,1,1,
1,1,7,7,7,7,1,1,1,2,1,1,6,1,1,1,3,1,1,1,
1,1,1,1,1,1,1,1,1,2,1,1,3,1,1,1,3,1,1,1,
1,1,1,1,1,1,1,1,1,2,1,1,3,3,1,3,3,1,1,1,
1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,
2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,
1,1,1,4,4,4,4,1,1,2,1,1,1,1,1,1,1,1,1,1,
1,1,1,4,4,4,4,1,1,2,1,1,1,1,1,1,1,1,1,1,
1,1,1,4,4,4,4,1,1,2,1,1,1,1,1,1,1,1,1,1,
1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1
```

`detail`: all 0 except row 9: `0,0,0,0,0,0,0,0,0,0,0,5,5,5,5,5,5,5,5,0`.

`above`: all 0 except row 3: `0,0,7,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0`.

Cross-check against the spec's layout table before committing: roof (2–5, 1–2) on ground and
(2–5, 3) on above; wall ring border of (12–16, 1–4) with (14, 4) grass and (12, 2) door; pond
(3–6, 8–10); fence row 9 columns 11–18; path row 6 and column 9; spawn tile (8, 7) is grass.

`src/main.ts` — replace the pattern with loading and the map:

```ts
import { loadImage, loadJson, resolvePath } from './engine/assets';
import { runLoop } from './engine/loop';
import { parseTileMap, parseTileset, type TileMap, tilesetSource } from './engine/tiled';
import { createInitialState } from './game/state';
import { update } from './game/update';
import { createCanvas2dRenderer } from './render/canvas2d/canvas2d-renderer';
import { drawMap } from './render/draw-map';
import type { TilesetImage } from './render/renderer';
import { computeLayout } from './render/scale';

const MAP_URL = '/maps/test.tmj';

async function loadContent(): Promise<{ map: TileMap; tileset: TilesetImage }> {
  const mapJson = await loadJson(MAP_URL);
  const tilesetUrl = resolvePath(tilesetSource(mapJson, MAP_URL), MAP_URL);
  const tileset = parseTileset(await loadJson(tilesetUrl), tilesetUrl);
  const map = parseTileMap(mapJson, tileset, MAP_URL);
  const image = await loadImage(resolvePath(tileset.image, tilesetUrl));
  return { map, tileset: { image, columns: tileset.columns } };
}

// findCanvas, toggleFullscreen and the F listener stay as they are.

async function start(): Promise<void> {
  const renderer = createCanvas2dRenderer(findCanvas());
  const content = await loadContent();
  runLoop(createInitialState(), {
    update,
    render(state) {
      drawMap(renderer, content.map, content.tileset);
      renderer.present(computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio));
    },
  }, (callback) => { window.requestAnimationFrame(callback); });
}

start().catch((error: unknown) => {
  // A map that does not load stops the game before it starts; the message names the problem.
  console.error(error);
});
```

(`state` is unused in `render` for now — name it `_state` or drop the parameter if the loop's
type allows; Biome must stay clean without a disabled rule.)

Smoke spec — replace the test `'the pattern is drawn at the full factor, unclipped, and moves'`
with `'the map is drawn at the full factor, unclipped'`: keep the size and bounding-box
assertions; replace the corner assertion with a polled one, because the first frame waits for
the assets:

```ts
await expect
  .poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')?.getImageData(0, 0, 1, 1).data ?? [])))
  .toStrictEqual([0x63, 0xc7, 0x4d, 255]);   // grass at tile (0, 0): the map is drawn
```

Drop the `toDataURL` motion check; it returns in 0004.

- [ ] **Step 1: write `test.tmj`.** Run `node -e` or a tiny Vitest `it` to parse it through
  `parseTileset`/`parseTileMap` with the real tileset JSON, asserting `spawn` and that `solid`
  is true at (12, 1) and false at (14, 4) — then delete that throwaway test or keep it as
  `tests/unit/test-map.test.ts` (keep it: it proves the shipped map obeys the loader; it reads
  `public/` on purpose, unlike fixtures).
- [ ] **Step 2: update the smoke spec; run `npm run test:e2e`; see the corner assertion fail**
  (still the border colour).
- [ ] **Step 3: wire `main.ts`; delete the pattern and its test; run `npm run test:e2e`; green.**
- [ ] **Step 4: look at it.** `npm run dev`, open `http://localhost:5173` in the browser pane:
  the map of the spec's acceptance plan steps 1–4. Fix what is off before committing.
- [ ] **Step 5: `npm run check`; commit** — `Show the test map instead of the test pattern`.

---

### Task 9: Specification and README

**Files:**
- Modify: `docs/spec/architecture.md` §6 and §7, `docs/spec/testing.md` §1 and §2, `README.md`

- [ ] `architecture.md` §6: the three parse functions, the accepted format (CSV, one external
  `.tsj`, orthogonal, finite, 16-px, ≥ 20x12) and the rejection list in one sentence each;
  `EMPTY` cells; the solid grid as the union of the three layers; paths resolved against the
  referencing file. §7: `tools/placeholder-tiles.ts` + `tools/gen-tiles.ts`, the `.tsj` the
  generator writes, the committed-file test, the `.tsj`-against-PNG check.
- [ ] `testing.md` §1 smoke row: "the picture's corner shows the map's first tile; from 0004,
  one second of 'right' moves the player". §2 INV-7 row: the rejection list as in the spec.
- [ ] `README.md` status: the tile map is in (0003); the figure is 0004; mention
  `npm run gen-tiles` under "Run it".
- [ ] Commit — `Record the Tiled pipeline as built`.

---

### Task 10: Acceptance

- [ ] Merge `origin/main` into the branch (`git fetch origin && git merge origin/main`);
  rerun `npm run check`, `npm run test:e2e`, then `docker build -t shadow-ai .`,
  `docker run --rm -p 8080:8080 shadow-ai` and `BASE_URL=http://localhost:8080 npm run test:e2e`.
- [ ] Run the spec's acceptance plan in the browser pane, steps 1–14, and report every step
  with its result. Steps 15–21 need Tiled, which the agent does not have: report them as
  "not run — needs Tiled; for the author".
- [ ] Push `feature/0003-tile-map`; open the pull request against `main` with the step results,
  the one-line dependency note ("no new dependency"), and the attribution trailer. Bind the PR
  with the app's PR tools and read CI.
- [ ] Hand back to the author for the acceptance run. The merge is the acceptance; then the
  author or a follow-up sets `Status: implemented`.

## Self-review against the spec

- Scope "In": generator (T1), parser (T3–T5), assets (T6), `drawTile` + `draw-map` (T7),
  `test.tmj` + wiring + deletion of the pattern (T8), `.tsj` check (T2), tsconfig (T1),
  docs (T9). Scope "Out": nothing here builds a player, camera, state field or flip support.
- Behaviour: layout table → T8 data; files and paths → T6 + T8; what the loader reads → T3–T5;
  rules 1–11 → T5 table (rule 10's "cannot be loaded" → T6 `loadJson`); determinism → T1;
  `.tsj` shape → T1; `.tsj` check → T2.
- Acceptance criteria 1–9: 1, 2, 3 → T8; 4 → T1 step 5; 5 → T1 + T2; 6 → T4 + T5; 7 → author,
  T10; 8 → T8; 9 → T10.
- Names used across tasks: `TILE_SIZE`, `EMPTY`, `TILE_LAYER_NAMES`, `Tileset`, `TileMap`,
  `Point`, `tilesetSource`, `parseTileset`, `parseTileMap`, `resolvePath`, `loadJson`,
  `loadImage`, `TilesetImage`, `drawTile`, `drawMap`, `renderTiles`, `tilesetJson`,
  `encodePng`, `encodeTsj`, `checkTileset` — each defined once above and used with the same
  signature.
