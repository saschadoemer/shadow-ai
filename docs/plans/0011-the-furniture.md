# 0011 — Implementation plan: the furniture

**Spec:** [`docs/features/0011-the-furniture.md`](../features/0011-the-furniture.md) (approved
2026-11-13). The plan argues from the spec; where they differ, the spec wins. Read the spec
first, then `CLAUDE.md`, then `docs/spec/architecture.md` §1, §6 and §7, `docs/spec/testing.md`
§1–§3, §5 and §6, `docs/spec/visual.md` §3 and `docs/spec/world.md` §1. **Written:** 2026-11-13
on the planning model. A working document, not specification: once the feature is implemented,
what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The
placement numbers in the spec — the tile counts, the 795 cells, reachability, the first view —
come from a model the planning session ran on 2026-11-13 on the merged floor of 0010; the model
worked on whole cells, the test's flood works on a 2 px lattice. If a test disagrees with its
number, read the spec's "Behaviour" again and redo the arithmetic before touching either side;
if the spec and the number really disagree, stop and ask. The last two tasks are the acceptance
walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is the author's and is guided one
step per message; the agent never runs it on its own, and no pull request is opened before it
has passed.

**Goal:** the floor of 0010 is furnished. The tileset learns `low`, the map carries `opaque`
beside `solids`, the lamp's light is blocked by `opaque` only; the placeholder tileset holds
seventeen furniture tiles; `public/maps/floor.tmj` gets a `detail` and an `above` layer from
the placement tables in `tools/floor-layout.ts`.

**Approach:** bottom up, each task green on its own. First the loader learns `low` and
`opaque` while nothing uses them (T1). Then the light reads `opaque` (T2) — the game is
unchanged, because no tile is low yet. Then the seventeen tiles are added to the sheet (T3);
the map does not use them yet. Then the furniture is placed (T4). Then the documents (T5), the
full check with the container (T6), the walk (T7) and the pull request (T8).

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- No new dependency, runtime or development.
- `src/engine/` imports nothing from the project; `src/game/` imports only `src/engine/`
  (INV-2). `tests/arch/` scans the source text of `src/game/`, comments included, for the words
  `window`, `document`, `HTMLCanvasElement`, `Image` and `fetch` as whole words.
- The map is content, not state: `GameState` does not change in this feature (INV-1).
- INV-6: `public/tiles/placeholder.png` uses only Endesga 32, alpha 0 or 255, and never
  `#68386c`. Furniture tiles are transparent where nothing is drawn.
- INV-7: `solid`, `low` and the collision rectangles are properties of the tile in the
  tileset. No code under `src/` names a tile id to decide what is solid or low.
- `src/engine/tiled.ts` is run by Node for `tools/`: erasable TypeScript only — no `enum`, no
  parameter properties, no namespaces.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on, `verbatimModuleSyntax` forces `import type`. Run
  `npx biome check --write .` before `npm run check`.
- `npm run check` is typecheck, Biome, build, Vitest. `npm run test:e2e` runs the smoke spec
  against the dev server; with `BASE_URL` set it runs against that URL.
- Fixtures are hand-made and committed, never generated (`testing.md` §6).
  `tests/fixtures/maps/floor-furniture.txt` is already committed: the planning session copied
  the picture out of the spec. It is not regenerated from the generator.
- No real product, company or person names, in tiles, names or tests.
- Branch `feature/0011-the-furniture`, cut from the tip of `claude/office-furnishings-rooms-6ce281`,
  which carries the spec, its approval, this plan and the fixture on top of `main` at 3d0f768
  (feature 0010). Before Task 1, merge `main` if it has moved (`CLAUDE.md` §4). Commit
  messages: imperative subject, a body with the why, and the `Co-Authored-By` trailer the
  session's own attribution reminder names. Commits are signed through 1Password, which fails
  inside the Bash sandbox: run `git commit` with the sandbox disabled.
- Feature specs and plans 0001–0010 are history and are not edited. 0012 is approved and is
  not built here: no sofa, no coffee machine, no tile id above 29.

## Design notes

- **`low` is a second boolean beside the boxes.** `Tileset.low[id]` is true for a tile whose
  boxes stop feet but not light. `TileMap.opaque` is built exactly like `TileMap.solids`, from
  the tiles whose `low` is false. A cell with no opaque box shares the empty array.
- **`sightBlocked` does not change.** It takes a `SolidGrid`; `isLit` hands it
  `{ width, height, solids: map.opaque }`. `moveBox` keeps taking the map, so walking is
  blocked by `solids` for the figure and the snippets alike.
- **Rule 13 stays on `solids`:** a spawn or a point inside a low box is still rejected.
- **Tops have no tile entry.** `cabinet-top` and `plant-top` carry no box and no property, so
  the `.tsj` lists nothing for ids 22 and 24, as it lists nothing for carpet.
- **The sheet becomes a grid.** 240x32, fifteen columns, two rows; the tile with id n sits at
  column n mod 15, row ⌊n / 15⌋. `renderTiles` starts from transparent pixels; a painter
  returns a colour or `null`.
- **Furniture is data, then layers.** `tools/floor-layout.ts` holds the room table as a list
  of placements and one function that turns it into the `detail` and `above` layers. A second
  tile on a cell is an error in the generator, not a silent overwrite.
- **A 2 px partition holds a 3 px push.** The resolver snaps a box back when it overlaps a
  solid box after the move; the figure's box is 12x8, so no displacement below 8 px can carry
  it across a strip. The sentence "below 4 px per call, the thinnest wall" in
  `architecture.md` §1 and in the header of `engine/collision.ts` is reworded in T5 and T1; a
  test in T1 pins the 3 px push against a 2 px strip.
- **A table of two rows shows its edge twice.** Every `table` tile draws its own front edge,
  so the meeting tables and the café tables carry a dark line through the middle. That is the
  placeholder; the art pass draws tables as wholes.

## File map

| File | Change |
|---|---|
| `src/engine/tiled.ts` | `Tileset.low`; the rejection of a low tile without a box; `TileMap.opaque` (T1) |
| `src/engine/collision.ts` | the header comment only (T1) |
| `src/game/creature.ts` | `isLit` reads `map.opaque` (T2) |
| `tests/fixtures/maps/low.tsj`, `low.tmj`, `low-without-box.tsj` | new (T1) |
| `tests/unit/grass-map.ts`, `picture-map.ts`, `draw-map.test.ts`, `draw-scene.test.ts` | `opaque` in the in-memory maps (T1) |
| `tools/placeholder-tiles.ts`, `public/tiles/placeholder.png`, `placeholder.tsj` | thirty tiles, 240x32 (T3) |
| `tools/floor-layout.ts`, `public/maps/floor.tmj` | the furniture (T4) |
| `tests/fixtures/maps/floor-furniture.txt` | committed by the planning session; read in T4 |
| `docs/spec/*.md`, `README.md` | as built (T5) |

Tests: `tiled.test.ts`, `collision.test.ts` (T1); `creature.test.ts` (T2); `gen-tiles.test.ts`
(T3); `floor.test.ts`, `draw-scene.test.ts` (T4).

---

### Task 1: `low` in the tileset, `opaque` in the map

**Files:** modify `src/engine/tiled.ts`, `src/engine/collision.ts` (comment),
`tests/unit/tiled.test.ts`, `tests/unit/collision.test.ts`, `tests/unit/grass-map.ts`,
`tests/unit/picture-map.ts`, `tests/unit/draw-map.test.ts`, `tests/unit/draw-scene.test.ts`;
create the three fixtures.

**Interfaces — produces:**

```ts
export interface Tileset {
  readonly image: string;
  readonly columns: number;
  readonly tileCount: number;
  readonly boxes: readonly (readonly Box[])[];
  /** Index: tile id. True for a tile whose boxes stop feet but not light (feature 0011). */
  readonly low: readonly boolean[];
}

export interface TileMap {
  // … as before …
  readonly solids: readonly (readonly Box[])[];
  /** Row-major, width × height: the boxes of the cell's tiles that are not low, in map pixels. Light stops at these. */
  readonly opaque: readonly (readonly Box[])[];
}
```

- [ ] **Fixtures**, by hand, in the format of `boxes.tsj` and `thin-walls.tmj`:
  - `low.tsj` — `columns` 4, `tilecount` 4, image `fixture-tiles.png` as the other fixtures
    name theirs. Tile 0 has no entry (open ground). Tile 1: `solid`. Tile 2: `solid` and `low`
    (two properties, both `bool`, both `true`). Tile 3: an `objectgroup` with one rectangle
    (0, 0, 16, 2) and the property `low`.
  - `low.tmj` — 20x12, tileset `low.tsj`, `ground` all gid 1, a `detail` layer with gid 2 at
    (1, 2), gid 3 at (3, 2), gid 4 at (5, 2) and 0 elsewhere, `objects` with the spawn at
    (160, 96).
  - `low-without-box.tsj` — `low.tsj` with tile 3's `objectgroup` removed, so tile 3 is low
    and has no box.
- [ ] **Failing tests** in `tests/unit/tiled.test.ts`, a new `describe('low tiles (0011)')`:

```ts
it('reads `low` per tile and keeps the boxes', () => {
  const tileset = parseTileset(load('low.tsj'), 'low.tsj');
  expect(tileset.low).toStrictEqual([false, false, true, true]);
  expect(tileset.boxes[2]).toStrictEqual([{ x: 0, y: 0, width: 16, height: 16 }]);
  expect(tileset.boxes[3]).toStrictEqual([{ x: 0, y: 0, width: 16, height: 2 }]);
});

it('rejects a low tile without a collision box', () => {
  expect(() => parseTileset(load('low-without-box.tsj'), 'low-without-box.tsj')).toThrow(
    'low-without-box.tsj: tile 3 is low but has no collision box',
  );
});

it('puts every box into `solids` and only the boxes of tiles that are not low into `opaque`', () => {
  const tileset = parseTileset(load('low.tsj'), 'low.tsj');
  const map = parseTileMap(load('low.tmj'), tileset, 'low.tmj');
  const cell = (column: number, row: number): number => row * 20 + column;
  expect(map.solids[cell(1, 2)]).toStrictEqual([{ x: 16, y: 32, width: 16, height: 16 }]);
  expect(map.solids[cell(3, 2)]).toStrictEqual([{ x: 48, y: 32, width: 16, height: 16 }]);
  expect(map.solids[cell(5, 2)]).toStrictEqual([{ x: 80, y: 32, width: 16, height: 2 }]);
  expect(map.opaque[cell(1, 2)]).toStrictEqual([{ x: 16, y: 32, width: 16, height: 16 }]);
  expect(map.opaque.filter((boxes) => boxes.length > 0)).toHaveLength(1);
  expect(map.opaque).toHaveLength(240);
});
```

  (`load` stands for whatever helper the file already uses to read a fixture; use that one.)
  Add one line to an existing test of a map without low tiles — `corridor.tmj` — that
  `map.opaque` equals `map.solids` with `toStrictEqual`.
- [ ] **Failing tests** in `tests/unit/collision.test.ts`, with `solidsWith` from
  `tests/unit/solids.ts` on a 20x12 grid:

```ts
it('stops flush under a 2 px strip (0011)', () => {
  const grid = { width: 20, height: 12, solids: solidsWith(20, 12, [
    { column: 2, row: 6, box: { x: 32, y: 96, width: 16, height: 2 } },
  ]) };
  let box = { x: 34, y: 102, width: 12, height: 8 };
  for (let step = 0; step < 6; step += 1) {
    box = { ...box, ...moveBox(box, 0, -1, grid) };
  }
  expect(box.y).toBe(98);
});

it('holds a 3 px push at a 2 px strip (0011)', () => {
  const grid = { width: 20, height: 12, solids: solidsWith(20, 12, [
    { column: 2, row: 6, box: { x: 32, y: 96, width: 16, height: 2 } },
  ]) };
  expect(moveBox({ x: 34, y: 99, width: 12, height: 8 }, 0, -3, grid).y).toBe(98);
  expect(moveBox({ x: 34, y: 98, width: 12, height: 8 }, 0, -3, grid).y).toBe(98);
});

it("stops at a chair's box, smaller than its cell (0011)", () => {
  const grid = { width: 20, height: 12, solids: solidsWith(20, 12, [
    { column: 4, row: 4, box: { x: 67, y: 67, width: 10, height: 10 } },
  ]) };
  expect(moveBox({ x: 50, y: 68, width: 12, height: 8 }, 8, 0, grid).x).toBe(55);
});

it('stops flush under a screen, a 4 px panel through the middle of its cell (0011)', () => {
  const grid = { width: 20, height: 12, solids: solidsWith(20, 12, [
    { column: 2, row: 6, box: { x: 32, y: 102, width: 16, height: 4 } },
  ]) };
  let box = { x: 34, y: 110, width: 12, height: 8 };
  for (let step = 0; step < 6; step += 1) {
    box = { ...box, ...moveBox(box, 0, -1, grid) };
  }
  expect(box.y).toBe(106);
});
```

  The four collision tests pass without a code change — the resolver already works on boxes.
  They are the spec's test plan and pin the numbers; run them and see them green. The three
  loader tests fail.
- [ ] **Implement** in `src/engine/tiled.ts`:
  - `isLowProperty`, written like `isSolidProperty`, for the name `low`.
  - In `parseTileset`: `const low = properties.some(isLow…)`; after the solid-and-shape check,
    `if (low && !solid && shapes.length === 0) fail(file, \`tile ${id} is low but has no collision box\`)`;
    collect the low ids in a `Set<number>`; return
    `low: Array.from({ length: tileCount }, (_, id) => lowIds.has(id))`.
  - In `parseTileMap`: a second helper beside `boxesOf` —
    `opaqueOf = (id) => id === undefined || id === EMPTY || tileset.low[id] === true ? NO_BOXES : (tileset.boxes[id] ?? NO_BOXES)`
    — and `opaque` built by the same mapping as `solids`. Extract the shared mapping into one
    local function that takes the per-id lookup, so the two layers cannot drift. Return
    `opaque` in the map.
- [ ] **Follow the compiler:** every literal `Tileset` and `TileMap` in the tests needs the new
  field. `grassMap`: `opaque: Array.from({ length: cells }, () => [])`. `pictureMap`: build
  the boxes once, `const solids = solidsOf(solid, width)`, and return `solids, opaque: solids`
  — a `#` is a wall. The maps in `draw-map.test.ts` and `draw-scene.test.ts`: `opaque` equal
  to their `solids`; their tilesets: `low` all false. `tools/` builds no `Tileset` by hand.
- [ ] **Comment** in `src/engine/collision.ts`, the header's last sentence, reworded: the
  displacement is assumed to be below 8 px per call, the smaller side of the figure's box —
  a box cannot be carried across a strip by less; the thinnest box is the 2 px partition of
  0011; this is not a swept test.
- [ ] `npm run check`; **commit** — `Read low tiles and build the opaque boxes`; why: furniture
  stops feet but most of it must not stop the lamp.

---

### Task 2: The light stops at `opaque` only

**Files:** modify `src/game/creature.ts`, `tests/unit/creature.test.ts`.

- [ ] **Failing tests** in `tests/unit/creature.test.ts`, beside the 4 px strip case of 0010,
  with that case's `CREATURE`, `RIGHT` and `OPEN` and the same cell (7, 5):

```ts
it('is lit across a low box, and the same box still stops its walk (0011)', () => {
  const box = { x: 112, y: 80, width: 16, height: 16 };
  const low = { ...OPEN, solids: solidsWith(20, 12, [{ column: 7, row: 5, box }]) };
  expect(isLit(CREATURE, RIGHT, true, low)).toBe(true);
  const walking = stepCreature(CREATURE, RIGHT, false, low);
  const free = stepCreature(CREATURE, RIGHT, false, OPEN);
  expect(walking?.x).toBeGreaterThan(free?.x ?? 0);
});

it('is not lit behind an opaque box (0011)', () => {
  const box = { x: 112, y: 80, width: 16, height: 16 };
  const placed = solidsWith(20, 12, [{ column: 7, row: 5, box }]);
  expect(isLit(CREATURE, RIGHT, true, { ...OPEN, solids: placed, opaque: placed })).toBe(false);
});
```

  The walk assertion says "the low box holds the creature back": the creature approaches the
  figure to its left, so stopped by the box its x stays larger than without it. Before writing
  it, read where `CREATURE` and `RIGHT` stand in that `describe`; if the box at (7, 5) is not
  on the creature's way, move the box onto the straight line between the two, one cell from
  the creature, and say so in the test's comment. The assertion's direction follows from
  which side the figure is on.
- [ ] **The 0010 case changes with it:** "is not lit behind a 4 px left strip" builds
  `{ ...OPEN, solids: … }`; a wall is opaque, so it now sets `opaque` to the same boxes. So do
  the other cases in the file that expect a wall to block light through `pictureMap` — those
  pass unchanged, because `pictureMap` sets `opaque` to `solids` since T1.
- [ ] **Implement** in `isLit`:

```ts
!sightBlocked(
  { x: player.x, y: player.y - BOX_HEIGHT / 2 },
  body,
  { width: map.width, height: map.height, solids: map.opaque },
)
```

  and extend the function's comment: no opaque box on the line — furniture that is low does
  not block the light (feature 0011).
- [ ] `npm run check`; **commit** — `Let the lamp shine over low furniture`; why: the light is
  blocked by what is as tall as a person, walking by everything.

---

### Task 3: Seventeen furniture tiles

**Files:** modify `tools/placeholder-tiles.ts`, `tests/unit/gen-tiles.test.ts`; regenerate
`public/tiles/placeholder.png` and `placeholder.tsj` with `npm run gen-tiles`.

**Interfaces — produces**, in `tools/placeholder-tiles.ts`:

```ts
export interface TileKind {
  readonly id: number;
  readonly name: string;
  readonly solid: boolean;
  readonly boxes: readonly Box[];
  /** Stops feet but not light: the `low` property in the .tsj (feature 0011). */
  readonly low: boolean;
}
export const PARTITION_TOP = 13;
export const PARTITION_LEFT = 14;
export const PARTITION_CORNER = 15;
export const DESK = 16;
export const DESK_MONITOR = 17;
export const DESK_PARTITION = 18;
export const DESK_MONITOR_PARTITION = 19;
export const CHAIR = 20;
export const CABINET = 21;
export const CABINET_TOP = 22;
export const PLANT = 23;
export const PLANT_TOP = 24;
export const TABLE = 25;
export const COUNTER = 26;
export const PRINTER = 27;
export const SCREEN = 28;
export const SCREEN_SIDE = 29;
export const SHEET_COLUMNS = 15;
export const SHEET_WIDTH = 240;
export const SHEET_HEIGHT = 32;
```

The thirteen tiles of 0010 get `low: false`. The seventeen new kinds, boxes and `low` as in
the spec's table: `solid: true` for 16–19, 21, 25–27; boxes for 13 (0, 0, 16, 2), 14
(0, 0, 2, 16), 15 both, 20 (3, 3, 10, 10), 23 (4, 6, 8, 10), 28 (0, 6, 16, 4), 29
(6, 0, 4, 16); nothing for 22 and 24; `low: true` for all but 21, 22 and 24.

**The pictures.** A painter is `(x, y) => PaletteColour | null`, `null` transparent; the
painters of 0010 keep returning a colour for every pixel. Pixel by pixel, x and y from 0 to
15, ranges inclusive:

| Tile | Pixels |
|---|---|
| partition-top | y 0: `#c0cbdc`; y 1: the shade (see below); else transparent |
| partition-left | x 0: `#c0cbdc`; x 1: the shade; else transparent |
| partition-corner | the top strip where y ≤ 1, else the left strip where x ≤ 1, else transparent |
| desk | y 0–12: `#e4a672`; y 13–15: `#b86f50` |
| desk-monitor | the desk; over it x 4–11, y 2–8 `#262b44`; x 5–10, y 3–6 `#2ce8f5`; x 7–8, y 9–10 `#262b44` |
| desk-partition | the desk; over it the top strip of partition-top on y 0–1 |
| desk-monitor-partition | desk-monitor; over it the top strip on y 0–1 |
| chair | x 3–12, y 3–5: `#3a4466`; x 3–12, y 6–12: `#5a6988`; else transparent |
| cabinet | `#c28569`; the border — x 0, x 15, y 0, y 15 — and the door line x 7–8 `#733e39` |
| cabinet-top | y 8–15: `#e8b796`, its border — y 8, x 0, x 15 — `#c28569`; y 0–7 transparent |
| plant | x 4–11, y 10–15: `#be4a2f`; x 7–8, y 0–9: `#265c42`; else transparent |
| plant-top | x 2–13, y 4–15 without the four corners (x < 4 or x > 11) and (y < 6 or y > 13): `#63c74d` where (x + y) mod 3 = 0, else `#3e8948`; else transparent |
| table | y 0–12: `#b86f50`; y 13–15: `#733e39` |
| counter | y 0–12: `#ffffff`; y 13–15: `#c0cbdc` |
| printer | `#c0cbdc`; x 3–12, y 1–4 `#ffffff`; x 3–12, y 10–12 `#3a4466` |
| screen | x 0–15, y 6–8: `#0099db`; y 9: `#124e89`; x 0–1 and x 14–15, y 10–11: `#3a4466`; else transparent |
| screen-side | x 6–8, y 0–15: `#0099db`; x 9: `#124e89`; x 10–11, y 0–1 and y 14–15: `#3a4466`; else transparent |

**The partition's shade** is the open question at the end of this plan: the spec says
`#8b9bb4`, which is the carpet's own base colour, so on carpet the strip would show as one
pixel. Do not start this task before the author has answered; use the colour of the answer.

- [ ] **Failing tests** in `tests/unit/gen-tiles.test.ts`. Replace the "208x16" and "thirteen
  tiles" cases and add:
  - the sheet is 240x32, `SHEET_COLUMNS` 15, `TILE_KINDS` has 30 entries with ids 0–29 in
    order; the `.tsj` says `columns` 15, `tilecount` 30, `imagewidth` 240, `imageheight` 32;
  - `hexAt` and every pixel loop address a tile by its grid cell: tile n at
    (16 × (n mod 15), 16 × ⌊n / 15⌋). The 0010 cases for ids 0–12 pass with that addressing
    and no other change;
  - parsed through `parseTileset`: `low` is true exactly for ids 13–20, 23 and 25–29; the
    boxes of ids 13–29 are the table's; ids 22 and 24 have no boxes and no entry in
    `tilesetJson().tiles`;
  - for 13, 14 and 15 the opaque pixels are exactly the pixels inside the tile's boxes; for
    20, 28 and 29 every pixel inside the box is opaque (the screens' feet lie outside it);
  - ids 16–19, 21 and 25–27 have 256 opaque pixels; 22 has 128, all in y 8–15; 24 has no
    opaque pixel in y 0–3;
  - one pixel per tile from the table above, as a table-driven case: 16 (0, 0) `#e4a672` and
    (0, 15) `#b86f50`; 17 (5, 3) `#2ce8f5`; 18 (0, 0) `#c0cbdc`; 20 (3, 3) `#3a4466` and
    (3, 12) `#5a6988`; 21 (0, 0) `#733e39` and (3, 3) `#c28569`; 22 (3, 12) `#e8b796`; 23
    (4, 10) `#be4a2f` and (7, 0) `#265c42`; 24 (6, 6) `#63c74d` and (6, 7) `#3e8948`; 25
    (0, 0) `#b86f50`; 26 (0, 0) `#ffffff`; 27 (3, 1) `#ffffff` and (3, 10) `#3a4466`; 28
    (0, 6) `#0099db`, (0, 9) `#124e89` and (0, 10) `#3a4466`; 29 (6, 0) `#0099db`, (9, 0)
    `#124e89` and (10, 0) `#3a4466`;
  - no pixel of the sheet is `#68386c`; every alpha is 0 or 255.
- [ ] **Implement.** `renderTiles` allocates the sheet zeroed — transparent — and writes a
  pixel only when the painter returns a colour, at
  `((row * 16 + y) * SHEET_WIDTH + column * 16 + x) * 4`. `tilesetJson`: `columns` from
  `SHEET_COLUMNS`; a tile's entry carries `properties` with `solid` and, when low, `low`
  after it, and an `objectgroup` when it has boxes; a tile with boxes and `low` carries both
  keys, `objectgroup` before `properties` as Tiled orders keys alphabetically. Widen
  `TileEntry.properties` to a union of the two property shapes. Update the file's header
  comment: thirty tiles in two rows, furniture transparent where nothing is drawn.
- [ ] `npm run gen-tiles`; look at `public/tiles/placeholder.png` once, enlarged, and check
  it against the table by eye.
- [ ] `npm run check` — `assets.test.ts` must be green on the new sheet without a change, and
  `floor.test.ts` too: the floor uses ids 0–12 only and they have not moved.
- [ ] **Commit** — `Add seventeen furniture tiles to the placeholder tileset`; why: the floor
  needs desks, partitions, cabinets and plants to read as an office.

---

### Task 4: The furniture on the floor

**Files:** modify `tools/floor-layout.ts`, `tests/unit/floor.test.ts`,
`tests/unit/draw-scene.test.ts`; regenerate `public/maps/floor.tmj` with `npm run gen-floor`.

**Interfaces — produces**, in `tools/floor-layout.ts`:

```ts
/** One row of the spec's room table: a piece at its top-left cell. */
export type Placement =
  | { readonly piece: 'workplace' | 'cubicle' | 'island' | 'cafe-table' | 'chair' | 'printer' | 'plant'; readonly x: number; readonly y: number }
  | { readonly piece: 'bank' | 'screens-across' | 'screens-down'; readonly x: number; readonly y: number; readonly n: number }
  | { readonly piece: 'table' | 'counter'; readonly cells: CellRect }
  | { readonly piece: 'cabinets'; readonly c0: number; readonly c1: number; readonly row: number };

export const FURNITURE: readonly { readonly area: string; readonly placements: readonly Placement[] }[];

/** The `detail` and `above` layers as tileset ids, row-major, EMPTY where nothing stands. */
export function buildFurniture(): { readonly detail: number[]; readonly above: number[] };
```

`area` is the name in `ROOMS` or `CORRIDORS`. The data, row by row from the spec's table —
copy it from here, it is the model the counts were taken from:

```ts
const at = (piece: 'workplace' | 'cubicle' | 'island' | 'cafe-table' | 'chair' | 'printer' | 'plant', x: number, y: number): Placement => ({ piece, x, y });
const run = (piece: 'bank' | 'screens-across' | 'screens-down', x: number, y: number, n: number): Placement => ({ piece, x, y, n });
const block = (piece: 'table' | 'counter', c0: number, c1: number, r0: number, r1: number): Placement => ({ piece, cells: cells(c0, c1, r0, r1) });
const cabinets = (c0: number, c1: number, row: number): Placement => ({ piece: 'cabinets', c0, c1, row });

export const FURNITURE = [
  { area: 'sales', placements: [
    run('bank', 82, 28, 4), run('bank', 82, 34, 4), run('bank', 82, 40, 4), run('bank', 82, 46, 4),
    cabinets(104, 106, 51), at('plant', 80, 50),
  ] },
  { area: 'support', placements: [
    run('bank', 51, 61, 5), run('bank', 82, 61, 4), run('bank', 51, 67, 5), run('bank', 82, 67, 4),
    run('bank', 51, 73, 5), run('bank', 82, 73, 4),
    cabinets(105, 106, 78), at('printer', 76, 78),
  ] },
  { area: 'development', placements: [
    run('bank', 46, 3, 3), run('bank', 67, 3, 3), run('bank', 46, 9, 3), run('bank', 67, 9, 3),
    run('bank', 46, 15, 3), run('bank', 67, 15, 3),
    cabinets(83, 84, 19), at('plant', 44, 19),
  ] },
  { area: 'hr', placements: [
    at('workplace', 3, 3), at('workplace', 14, 3), at('workplace', 3, 10),
    run('screens-down', 9, 3, 2),
    block('table', 13, 14, 10, 11), at('chair', 12, 10), at('chair', 15, 11),
    cabinets(16, 19, 19), at('plant', 1, 18),
  ] },
  { area: 'accounting', placements: [
    at('workplace', 25, 3), at('workplace', 36, 3), at('workplace', 25, 10), at('workplace', 36, 10),
    run('screens-across', 25, 7, 3), run('screens-across', 36, 7, 3),
    cabinets(22, 25, 19), cabinets(39, 43, 19), at('printer', 43, 7),
  ] },
  { area: "data protection officer's office", placements: [
    at('workplace', 4, 28), run('screens-down', 9, 30, 4),
    block('table', 12, 14, 31, 32), at('chair', 11, 31), at('chair', 15, 32),
    cabinets(2, 7, 37), at('plant', 21, 36),
  ] },
  { area: 'reception', placements: [
    block('counter', 8, 12, 41, 41), at('chair', 10, 40),
    at('plant', 2, 41), at('plant', 21, 40), at('plant', 21, 50),
  ] },
  { area: 'break room', placements: [
    block('counter', 32, 45, 26, 26),
    at('cafe-table', 33, 32), at('cafe-table', 41, 32), at('cafe-table', 33, 42), at('cafe-table', 41, 42),
    at('plant', 47, 50),
  ] },
  { area: 'marketing', placements: [
    at('island', 5, 62), at('island', 14, 62), at('island', 32, 62), at('island', 41, 62),
    at('island', 5, 70), at('island', 14, 70), at('island', 32, 70), at('island', 41, 70),
    run('screens-down', 10, 62, 2), run('screens-down', 37, 62, 2),
    run('screens-down', 10, 70, 2), run('screens-down', 37, 70, 2),
    cabinets(2, 9, 78), at('plant', 47, 78), at('printer', 27, 78),
  ] },
  { area: 'meeting room north', placements: [
    block('table', 94, 101, 4, 5), at('chair', 95, 3), at('chair', 98, 3), at('chair', 95, 6), at('chair', 98, 6),
  ] },
  { area: 'meeting room south', placements: [
    block('table', 94, 101, 14, 15), at('chair', 95, 13), at('chair', 98, 13), at('chair', 95, 16), at('chair', 98, 16),
    at('plant', 105, 19),
  ] },
  { area: 'north corridor', placements: [at('printer', 52, 20), at('plant', 34, 25), at('plant', 70, 25)] },
  { area: 'south corridor', placements: [at('printer', 40, 57), at('plant', 10, 57), at('plant', 90, 57)] },
] as const satisfies readonly { readonly area: string; readonly placements: readonly Placement[] }[];
```

(Biome will reflow this; let it.) The pieces, as the spec's "The pieces" defines them:

- `workplace (x, y)`: DESK_MONITOR (x, y), DESK (x + 1, y), CHAIR (x, y + 1).
- `cubicle (x, y)`: PARTITION_CORNER (x, y); DESK_MONITOR_PARTITION (x + 1, y);
  DESK_PARTITION (x + 2, y); PARTITION_TOP (x + 3, y), (x + 4, y); PARTITION_LEFT (x, y + 1),
  (x, y + 2); CHAIR (x + 1, y + 1).
- `bank (x, y, n)`: cubicles at (x + 5k, y), k = 0 … n − 1; PARTITION_LEFT at (x + 5n, y),
  (x + 5n, y + 1), (x + 5n, y + 2).
- `island (x, y)`: DESK_MONITOR (x, y), (x + 1, y); DESK (x, y + 1), (x + 1, y + 1); CHAIR
  (x − 1, y), (x + 2, y), (x − 1, y + 1), (x + 2, y + 1).
- `cafe-table (x, y)`: TABLE on (x, y)–(x + 1, y + 1); CHAIR (x − 1, y), (x + 2, y + 1).
- `screens-across (x, y, n)`: SCREEN at (x + k, y); `screens-down (x, y, n)`: SCREEN_SIDE at
  (x, y + k).
- `table`, `counter`: the tile on every cell of the rectangle. `chair`, `printer`: one tile.
- `cabinets (c0, c1, row)`: CABINET on `detail` at (c, row) and CABINET_TOP on `above` at
  (c, row − 1), for every c. `plant (x, y)`: PLANT on `detail`, PLANT_TOP on `above` at
  (x, y − 1).

`buildFurniture` writes through one `put(layer, column, row, id)` that throws
`furniture overlaps at (c, r)` when the cell of that layer is not EMPTY. `floorJson` returns
the layers in the order `ground`, `detail`, `above`, `objects`; `ground` keeps layer id 1 and
`objects` id 2, `detail` gets 3, `above` 4, `nextlayerid` 5 — as Tiled numbers layers added
later. Widen `MapJson.layers` to the four-tuple.

- [ ] **Failing tests** in `tests/unit/floor.test.ts`. Change the 0010 case "with `ground` and
  `objects` only" to the four layers in their order. Move the 0010 reach probe
  `['bottom-right corner', 106, 78]` to `(106, 76)`: (106, 78) now holds a cabinet. Then a new
  `describe('the furniture (0011)')`:
  - **The picture.** Read `tests/fixtures/maps/floor-furniture.txt`, 80 rows of 108
    characters. For every cell: `~` → 13, `!` → 14, `*` → 15, `m` → 17 or 19, `d` → 16 or 18,
    `c` → 20, `C` → 21, `P` → 23, `T` → 25, `K` → 26, `R` → 27, `_` → 28, `i` → 29; any other
    character → EMPTY on `detail`. One assertion per cell with the cell in its message. This
    is the check that `detail` is empty elsewhere.
  - **The counts** on `detail`: 13 → 122, 14 → 170, 15 → 61, 16 → 24, 17 → 24, 18 → 61,
    19 → 61, 20 → 122, 21 → 34, 23 → 14, 25 → 58, 26 → 19, 27 → 5, 28 → 6, 29 → 14; 795 cells
    not EMPTY. On `above`: 22 → 34, 24 → 14; 48 cells not EMPTY.
  - **The pieces**, from `FURNITURE`, spot checks that do not go through `buildFurniture`:
    the cubicle of Sales at (82, 28) cell by cell, eight cells; the island of Marketing at
    (5, 62), eight cells; the workplace of the data protection officer at (4, 28), three
    cells; `detail` at (9, 30)–(9, 33) is 29 and at (25, 7)–(27, 7) is 28.
  - **Where nothing stands:** no cell of `detail` or `above` other than EMPTY on the outer
    ring, in the lift, the stairwell, the west corridor, the east corridor or the side
    passage — by the rectangles in `ROOMS` and `CORRIDORS`.
  - **Tall things:** for every cell (c, r) of `above` that is 22 or 24: `detail` at
    (c, r + 1) is 21 or 23 respectively; (c, r) and (c, r + 1) lie in the same area; the
    ground tile of (c, r + 1) has no top strip (its id is not `WALL_TOP`, `WALL_CORNER` or
    their corridor forms, nor `DOOR_CLOSED`); `detail` at (c, r) is EMPTY, 21 or 23. And the
    reverse: every 21 and 23 on `detail` has its top above it.
  - **What stays true:** the 0010 cases for the spawn's box, row 44, the corner cell, the
    snippets and the wake point run unchanged and stay green — they read `floor.solids`,
    which now holds the furniture. Add: `detail` and `above` at (6, 39) are EMPTY.
  - **Reach:** with `reached` of the 0010 cases, for every bank in `FURNITURE` and every
    cubicle (x, y) of it: `reached(feetIn(x + 2, y + 1))` and `reached(feetIn(x, y + 2))`,
    the cubicle in the message. 61 cubicles.
  - **The first view:** with the camera (96, 624) of the 0010 case, the cells (8, 41)–(12, 41)
    lie inside [96, 416) × [624, 804) with all four corners.
  - **Low and opaque on the real floor:** `floor.opaque` at the cabinet (104, 51) holds one
    full box; at the desk (83, 28), the chair (83, 29), the partition (82, 29), the plant
    (80, 50) and the screen (10, 62) it is empty while `floor.solids` is not.
- [ ] **Failing test** in `tests/unit/draw-scene.test.ts`: the existing order case already
  lists `above` after the player; add one case named for 0011 that finds the index of the
  player's draw call and of the `above` tile's draw call in the recorded calls and expects
  the second to be larger. If the existing case asserts exactly that, do not duplicate it:
  rename nothing, add a one-line comment that it is criterion 5's test, and say so in the
  commit body.
- [ ] **Implement** the data, the pieces, `buildFurniture` and the two layers in `floorJson`;
  update the header comment of `tools/floor-layout.ts`: furniture on `detail`, tops on
  `above`.
- [ ] `npm run gen-floor`; `npm run check`.
- [ ] `npm run test:e2e` — the smoke spec is unchanged and must stay green: the corner pixel
  is carpet, the walk right along row 44 is free, the first snippet stands where it stood.
- [ ] `npm run dev` and look once: the reception shows the counter, the chair and two plants;
  the figure passes behind a plant's leaves. This is the agent's own look that the build
  draws, not the walk — do not go through the acceptance plan.
- [ ] **Commit** — `Furnish the floor`; why: an interim state shown to others has to read as
  an office, and the rooms are told apart by what stands in them.

---

### Task 5: The documents

**Files:** `docs/spec/world.md`, `visual.md`, `architecture.md`, `testing.md`, `README.md`.

- [ ] `docs/spec/world.md` §1 — one sentence per room on what stands in it, from the spec's
  room table in words, not coordinates: cubicles in Sales, Support and Development; single
  desks, a screen and cabinets in HR, Accounting and the data protection officer's office;
  desk islands with screens in Marketing; the counter in the reception; the counter and four
  small tables in the break room; one long table per meeting room; a printer and two plants
  in each wide corridor; the lift, the stairwell, the west and east corridors and the side
  passage empty.
- [ ] `docs/spec/visual.md` §3 — the rule for tall things: a cabinet or a plant is a body on
  `detail` and a top on `above` one row higher; a figure in the top's row is drawn behind it;
  a tall thing never stands in the first row below a wall. Partitions are strips 2 px thick;
  a screen is a panel 4 px thick through the middle of its cell.
- [ ] `docs/spec/architecture.md` — §1: the displacement sentence as reworded in T1's
  comment. §6: the tile property `low`, its rejection message, `TileMap.opaque`, and that
  `isLit` hands `opaque` to `sightBlocked` while `moveBox` reads `solids`. §7: the sheet
  240x32 in fifteen columns, the seventeen tiles by name and id, `FURNITURE` and
  `buildFurniture` in the generator, the four layers of `floor.tmj`.
- [ ] `docs/spec/testing.md` §1, the Unit row — add, in the row's own style: low tiles and
  the opaque boxes in the loader with their rejection; a 2 px strip, a 3 px push against it,
  a chair's box and a screen in the resolver; the light across a low box and behind an opaque
  one; the furniture tiles pixel by pixel; the furnished floor against the spec's picture,
  its counts, its tall things, every cubicle reached. §2 — INV-7's test now covers `low`.
- [ ] `README.md` — the status paragraph: the floor is furnished.
- [ ] `docs/plan.md` §4 M3 — no change needed; check that it still agrees.
- [ ] `npm run check`; **commit** — `Describe the furniture in the specification`; why: the
  spec is the source of truth and `low` is a rule of the map format.

---

### Task 6: The full check

- [ ] `npm run check`, `npm run test:e2e`.
- [ ] Build and run the container as `docs/spec/ops.md` §3 says, then
  `BASE_URL=http://localhost:<port> npm run test:e2e`.
- [ ] Report failures as failures. Nothing is committed in this task unless something was
  fixed.

---

### Task 7: The acceptance walk

`CLAUDE.md` §3.4 and `docs/spec/testing.md` §5. Start `npm run dev`, state the preconditions
of the spec's acceptance plan in one message — if port 5173 is taken, say which port the dev
server took — and wait for the author. Then one action step with its expected step per
message, 1–18, in the spec's words; record each answer as given. A `fail` ends the walk: fix
on the branch or ask, rerun Task 6, start again at step 1. After step 18 the feel questions,
one per message. Then write the `Result` line — `passed YYYY-MM-DD, steps 1–18`, followed by
the feel notes — and commit it: `Record the acceptance walk of 0011`.

The feel answers matter beyond this feature: 0012 places seating, coffee, water, coat racks
and gadgets between this furniture. If the author would move, add or remove furniture, that
is a revision of 0012's tables with the author before 0012 is implemented — and, when it
changes what 0011 says, a change of this spec first, not a quiet change on the branch after a
passed walk.

---

### Task 8: The pull request

`CLAUDE.md` §3.5. Merge `main` into the branch; rerun Task 6; if the merge changed code, run
Task 7 again. Set `Status: implemented` with the date in the spec and in the table of
`docs/features/README.md` and commit that on the branch — the status travels with the pull
request. Open the pull request against `main`: title `Feature 0011: the furniture`; the
description says what was built, quotes the `Result` line, and ends with the attribution line
the session's reminder names. Bind it with the app's PR tools and read CI; CI must be green.
The author merges.

## Self-review against the spec

- Scope "In": the seventeen tiles and the 240x32 sheet → T3; `low`, `parseTileset`,
  `TileMap.opaque` → T1; `sightBlocked` given `opaque` → T2; `detail`, `above` and the
  placement tables → T4; the documents → T5. Scope "Out": nothing here adds figures at desks,
  usable furniture, animated tiles, glass, a second tileset, anything of 0012, or furniture in
  the lift and the stairwell.
- Behaviour "Low and tall" → T1 (property, rejection, `opaque`), T2 (light), T4 (tall things
  and their rule). "The tiles" → T3. "The pieces", "The rooms", the counts, what stays true,
  the first view → T4.
- Acceptance criteria: 1 → T4 first view, walk 1–2; 2 → T4 picture and counts, walk 15–18;
  3 → T1 collision cases, walk 3–4, 7–8, 13–14; 4 → T4 reach, walk 7–8; 5 → T4 draw order and
  tall things, walk 5–6, 11–12; 6 → T2, T4 low and opaque on the floor, walk 9–10; 7 → T1;
  8 → T4 what stays true; 9 → T8.
- Test plan: `tiled.test.ts` → T1; `collision.test.ts` → T1; `creature.test.ts` → T2;
  `gen-tiles.test.ts` → T3; `draw-scene.test.ts` → T4; `floor.test.ts` → T4; smoke → T4,
  unchanged.

## Decisions by the planning session

Readings the spec leaves to the implementation, decided on 2026-11-13 so that the work does
not stop. None changes what the author sees in the walk, except where the pictures are fixed
pixel by pixel — the spec names colours, the plan names pixels.

1. **`Tileset.low` is an array of booleans by tile id,** beside `boxes`.
2. **`isLit` builds the grid for `sightBlocked` from `map.opaque`;** `sightBlocked` and
   `SolidGrid` do not change.
3. **`low.tsj` has four tiles:** the spec's three and an open tile 0 for the ground of
   `low.tmj`.
4. **The order of the tileset's checks** gains one at the end: low without a box.
5. **The sheet is a grid of fifteen columns;** a tile's place follows from its id.
6. **The pixels of every furniture tile** are the table in Task 3.
7. **`FURNITURE` is exported data and `buildFurniture` reads it;** the test checks the result
   against the spec's picture, which the planning session committed as a fixture.
8. **Layer ids in `floor.tmj`:** `ground` 1, `objects` 2, `detail` 3, `above` 4.
9. **The 0010 reach probe "bottom-right corner" moves from (106, 78) to (106, 76),** because
   Support's cabinets stand at (105, 78) and (106, 78).
10. **The displacement bound is reworded, not changed in code:** a 2 px strip holds every
    displacement the game makes; a test pins the 3 px push.

## Questions for the author

1. **The partition's second colour.** The spec gives a partition strip `#c0cbdc` with its
   lower row, or right column, in `#8b9bb4`. That is the carpet's base colour, and every
   partition stands on carpet, so the strip would show 1 px thin instead of 2. The planning
   session proposes `#5a6988` for that row and column — the carpet's speck colour, darker
   than the carpet and lighter than a wall. Task 3 waits for the answer; the spec's tile
   table is changed with it.
