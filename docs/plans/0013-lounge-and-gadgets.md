# 0013 — Implementation plan: lounge and gadgets

**Spec:** [`docs/features/0013-lounge-and-gadgets.md`](../features/0013-lounge-and-gadgets.md)
(approved 2026-11-13; drafted as 0012 and renumbered when "Overview hearts" took that number).
The plan argues from the spec; where they differ, the spec wins. Read the spec first, then
`CLAUDE.md`, then `docs/spec/architecture.md` §7, `docs/spec/testing.md` §1, §2, §5 and §6,
`docs/spec/visual.md` §3 and `docs/spec/world.md` §1. **Written:** 2026-11-13 on the planning
model, on `main` at 25d7033 (feature 0011 merged). A working document, not specification: once
the feature is implemented, what is durable lives in `docs/spec/`.

**For the implementation session (Opus):** work task by task, test first, one commit per task,
`npm run check` green before every commit. Steps use checkboxes. When the spec and this plan
leave a question open, stop and ask the author — do not decide it with more tokens. The last
two tasks are the acceptance walk (`CLAUDE.md` §3.4) and the pull request (§3.5): the walk is
the author's and is guided one step per message; the agent never runs it on its own, and no
pull request is opened before it has passed.

**This plan was run once.** The planning session applied every diff below to `main` at
25d7033, generated the sheet and the floor, and ran the checks: `npm run check` green with 544
tests, the six game tests of the smoke spec green against the dev server. The trial code was
then discarded; only this plan and three fixtures were committed. So every number here — the
888 cells, the 65 tops, the 6198 reached cells, the pixels — is measured, not modelled. If a
test disagrees with its number after you applied a diff as written, the cause is a slip in
applying it or a `main` that has moved: compare with the diff before touching either side.

**Goal:** the furnished floor of 0011 gets seating, coffee, water, coat racks and gadgets. The
placeholder tileset grows by eighteen tiles (ids 30–47) to 256x48; `tools/floor-layout.ts`
learns the new pieces and the placements of the spec's room table; `public/maps/floor.tmj` is
generated again. Nothing under `src/` changes.

**Approach:** two code tasks, each green on its own. First the eighteen tiles (T1): the sheet
changes its shape, the map does not use the new ids yet. Then the pieces and placements (T2).
Then the documents (T3), the full check with the container (T4), the walk (T5) and the pull
request (T6).

**Tech stack:** TypeScript strict, Vitest, Playwright, Biome, pngjs for the generators. No new
dependency.

## Global constraints

- **No file under `src/` changes** (criterion 7). `git diff --stat origin/main -- src/` is
  empty at every commit — against `origin/main`, because a local `main` may be stale. If a
  step seems to need a change there, stop and ask.
- No new dependency, runtime or development.
- INV-6: `public/tiles/placeholder.png` uses only Endesga 32, alpha 0 or 255, and never
  `#68386c`. Furniture tiles are transparent where nothing is drawn.
- INV-7: `solid`, `low` and the collision rectangles are properties of the tile in the
  tileset; the generator only writes them.
- Biome and `tsc` are the arbiters: no `any`, no disabled rule, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on. Run `npx biome check --write .` before `npm run check`.
- `npm run check` is typecheck, Biome, build, Vitest. `npm run gen-tiles` and
  `npm run gen-floor` write the committed files under `public/`; a unit test fails when the
  committed files and the generators disagree, so run the generator in the task that changes it.
- `npm run test:e2e` starts the Vite dev server on port 5173 or **reuses whatever answers
  there**. On the author's machine another project often holds 5173; the spec then fails on the
  page title. In that case start `npx vite --port <free port> --strictPort` yourself and run
  `BASE_URL=http://localhost:<port> npm run test:e2e`: the six game tests must pass, and the
  three tests under "served by the container" fail against a dev server by design — they are
  for the container (T4).
- Fixtures are hand-made and committed, never generated (`testing.md` §6). The planning session
  committed three, and none is regenerated: `tests/fixtures/maps/floor-lounge.txt` (the picture
  of the spec, copied out of it), `tests/fixtures/maps/arcade.tmj` (20x12, carpet, the arcade
  at (5, 5) with its top at (5, 4), a beanbag at (9, 5), the spawn at (160, 160), the
  placeholder tileset by relative path) and `tests/fixtures/tiles/placeholder-0011.png` (the
  sheet as 0011 committed it, 240x32, for the test that ids 0–29 kept their pixels).
  `tests/fixtures/maps/floor-furniture.txt` of 0011 stays and is still read.
- No real product, company or person names, in tiles, names or tests: the arcade shows three
  blocks, the cube nine pixels, the robot a box with two eyes.
- Branch `feature/0013-lounge-and-gadgets`, cut from the tip of `plan/0013-lounge-and-gadgets`,
  which carries this plan and the fixtures on top of `main` at 25d7033. Before Task 1, merge
  `main` if it has moved (`CLAUDE.md` §4). Commit messages: imperative subject, a body with the
  why, and the `Co-Authored-By` trailer the session's own attribution reminder names. Commits
  are signed through 1Password, which fails inside the Bash sandbox: run `git commit` with the
  sandbox disabled.
- Feature specs and plans 0001–0012 are history and are not edited.

## Design notes

- **The sheet is 256x48: sixteen columns, three rows, exactly forty-eight tiles.** The tile
  with id n sits at column n mod 16, row ⌊n / 16⌋. Every id keeps its value, so no map changes
  for that reason; on the sheet the tiles 15–29 move, because the column count changes. The
  test compares ids 0–29 pixel by pixel with the sheet of 0011, each tile at its old and its
  new place. See "Questions for the author", 1.
- **Tops have no tile entry.** `water-dispenser-top`, `coat-rack-top` and `arcade-top` carry no
  box and no property, like the two tops of 0011.
- **Three kinds of placement replace a tile of 0011.** The generator's `put` throws when a cell
  is taken — that stays. A second function, `swap`, replaces a named tile by another and throws
  when the cell does not hold the tile it expects: `coffee-machine` turns a `counter` into
  `counter-coffee`, `desk-duck`, `desk-lava-lamp`, `desk-cube` and `desk-robot` turn a
  `desk-partition` into the gadget desk. A replacement is listed after the piece it changes, in
  the same area.
- **The gadget desks are drawn over the desk-partition's painter,** so the partition strip and
  the desk's edge are those of tile 18 by construction.
- **The side-table carries a rim.** Its top is `#ead4aa`, the corridor's base colour, and one
  table stands in the south corridor at (62, 53). The spec names "top `#ead4aa`, edge
  `#b86f50`"; the plan draws the edge as a rim 1 px wide round the top and a front edge 2 px
  high, so the table keeps its outline on either floor. See "Decisions", 4.
- **The break room's counter is not a probe for light.** It stands in row 26, the row of the
  room's top wall strip, so those cells carry an opaque box from `ground`. The test for "low"
  uses Accounting's coffee corner at (27, 19).

## File map

| File | Change |
|---|---|
| `tools/placeholder-tiles.ts` | eighteen tiles, their painters, the sheet 256x48 (T1) |
| `public/tiles/placeholder.png`, `placeholder.tsj` | generated again (T1) |
| `tools/floor-layout.ts` | the pieces of 0013, `swap`, the placements (T2) |
| `public/maps/floor.tmj` | generated again (T2) |
| `tests/unit/gen-tiles.test.ts`, `tests/unit/creature.test.ts` | T1 |
| `tests/unit/floor.test.ts` | T2 |
| `tests/fixtures/maps/floor-lounge.txt`, `arcade.tmj`, `tests/fixtures/tiles/placeholder-0011.png` | committed by the planning session; read in T1 and T2 |
| `docs/spec/world.md`, `architecture.md`, `testing.md`, `README.md` | as built (T3) |

The diffs below are against `main` at 25d7033, with two lines of context. Apply them by hand or
with `git apply`; if a hunk does not apply, `main` has moved — read the hunk and place it by
its context.

---

### Task 1: Eighteen tiles

**Files:** modify `tests/unit/gen-tiles.test.ts`, `tests/unit/creature.test.ts`,
`tools/placeholder-tiles.ts`; generate `public/tiles/placeholder.png` and `placeholder.tsj`.

**Produces**, for T2 — the ids, exported from `tools/placeholder-tiles.ts`: `SOFA_LEFT` 30,
`SOFA_RIGHT` 31, `ARMCHAIR` 32, `SIDE_TABLE` 33, `BEANBAG` 34, `COUNTER_COFFEE` 35,
`WATER_DISPENSER` 36, `WATER_DISPENSER_TOP` 37, `COAT_RACK` 38, `COAT_RACK_TOP` 39, `ARCADE` 40,
`ARCADE_TOP` 41, `FOOSBALL_LEFT` 42, `FOOSBALL_RIGHT` 43, `DESK_DUCK` 44, `DESK_LAVA_LAMP` 45,
`DESK_CUBE` 46, `DESK_ROBOT` 47; `SHEET_COLUMNS` 16, `SHEET_WIDTH` 256, `SHEET_HEIGHT` 48.

**The pixels**, tile-local, x and y from 0 to 15, both ends inclusive. Where nothing is named
the pixel is transparent. The spec names the colours; this table fixes the pixels.

| Id | Pixels |
|---|---|
| 30 sofa-left | `#a22633` where x ≤ 2 or y ≤ 4; `#e43b44` elsewhere; all 256 px |
| 31 sofa-right | `#a22633` where x ≥ 13 or y ≤ 4; `#e43b44` elsewhere |
| 32 armchair | its box x 2–13, y 3–14: `#a22633` where x ≤ 3, x ≥ 12 or y ≤ 6; `#e43b44` elsewhere |
| 33 side-table | its box x 4–11, y 5–12: `#b86f50` where x = 4, x = 11, y = 5 or y ≥ 11; `#ead4aa` elsewhere |
| 34 beanbag | its box x 3–12, y 5–13 without the three pixels of each corner (those whose distances to the two nearest box edges add up to less than 2); `#feae34` at x 5–8, y 6–7; `#f77622` elsewhere — 78 px |
| 35 counter-coffee | the counter (26): `#ffffff` for y ≤ 12, `#c0cbdc` below; on it the machine `#262b44` at x 4–11, y 2–10, the cup `#ffffff` at x 7–8, y 7–9, the light `#e43b44` at (10, 3) |
| 36 water-dispenser | its box x 4–11, y 6–15 `#c0cbdc`; taps at y 9–10: `#e43b44` at x = 6, `#0099db` at x = 9 |
| 37 water-dispenser-top | the bottle `#2ce8f5` at x 5–10, y 6–13, its neck at x 7–8, y 14–15; the row y = 8 `#0099db` |
| 38 coat-rack | `#3e2731`: the pole x 7–8, y 0–13; the foot x 5–10, y 14–15 |
| 39 coat-rack-top | from y = 4 down: the pole `#3e2731` at x 7–8 and the bar of hooks at y = 5, x 3–12; from y = 6 down a coat `#124e89` at x 2–6 and a coat `#feae34` at x 9–13 |
| 40 arcade | `#124e89`; the control panel `#262b44` at y 2–6; buttons at y 3–4: `#e43b44` at x 4–5, `#fee761` at x 10–11; all 256 px |
| 41 arcade-top | from y = 2 down `#124e89`; the marquee `#f77622` at x 1–14, y 3–5; the screen `#181425` at x 2–13, y 7–14 with three blocks of 2x2 px: `#63c74d` at (3–4, 11–12), `#fee761` at (7–8, 9–10), `#2ce8f5` at (11–12, 11–12) |
| 42 foosball-left | the field `#3e8948`; the frame `#733e39` at x = 0, y ≤ 1 and y ≥ 14; a rod `#c0cbdc` at x 7–8 over the whole height; two players `#e43b44` at x 6–9, y 4–5 and y 10–11 |
| 43 foosball-right | the same mirrored: the frame at x = 15, the players `#0099db` |
| 44 desk-duck | desk-partition (18); the duck `#fee761`: head x 8–10, y 4–6, body x 5–9, y 7–10; the beak `#f77622` at (11, 5) |
| 45 desk-lava-lamp | desk-partition; `#5a6988` at x 7–8, y 3 and x 6–9, y 10–11; the glass `#f77622` at x 6–9, y 4–9; blobs `#e43b44` at (7, 5), (8, 7), (7, 8) |
| 46 desk-cube | desk-partition; at x 7–9, y 6–8, row by row: `#e43b44` `#fee761` `#63c74d` / `#0099db` `#ffffff` `#f77622` / `#63c74d` `#e43b44` `#0099db` |
| 47 desk-robot | desk-partition; the body `#c0cbdc` at x 5–10, y 4–10; eyes `#2ce8f5` at (6, 6) and (9, 6) |

- [ ] **Step 1: the failing tests.** Apply to `tests/unit/gen-tiles.test.ts`:

```diff
--- a/tests/unit/gen-tiles.test.ts
+++ b/tests/unit/gen-tiles.test.ts
@@ -35,10 +35,10 @@ function hexAt(data: Uint8Array, x: number, y: number): string {
 }
 
-/** The left edge of tile `id` in the sheet: column id mod 15 (0011). */
+/** The left edge of tile `id` in the sheet: column id mod 16 (0013). */
 function tileX(id: number): number {
   return (id % SHEET_COLUMNS) * TILE_SIZE;
 }
 
-/** The top edge of tile `id` in the sheet: row ⌊id / 15⌋ (0011). */
+/** The top edge of tile `id` in the sheet: row ⌊id / 16⌋ (0013). */
 function tileY(id: number): number {
   return Math.floor(id / SHEET_COLUMNS) * TILE_SIZE;
@@ -83,21 +83,21 @@ describe('the placeholder tileset generator', () => {
   });
 
-  it('is 240x32: thirty tiles in fifteen columns and two rows (0011)', () => {
-    expect([SHEET_WIDTH, SHEET_HEIGHT, SHEET_COLUMNS]).toStrictEqual([240, 32, 15]);
+  it('is 256x48: forty-eight tiles in sixteen columns and three rows (0013)', () => {
+    expect([SHEET_WIDTH, SHEET_HEIGHT, SHEET_COLUMNS]).toStrictEqual([256, 48, 16]);
     expect(TILE_KINDS.map((kind) => kind.id)).toStrictEqual(
-      Array.from({ length: 30 }, (_, i) => i),
+      Array.from({ length: 48 }, (_, i) => i),
     );
     expect(renderTiles()).toHaveLength(SHEET_WIDTH * SHEET_HEIGHT * 4);
   });
 
-  it('describes thirty tiles in the .tsj, solid as a whole on ids 2, 3, 16–19, 21 and 25–27', () => {
+  it('describes forty-eight tiles in the .tsj, solid as a whole on twenty of them', () => {
     const tsj = tilesetJson();
     expect(tsj).toMatchObject({
-      columns: 15,
-      tilecount: 30,
+      columns: 16,
+      tilecount: 48,
       tilewidth: 16,
       tileheight: 16,
-      imagewidth: 240,
-      imageheight: 32,
+      imagewidth: 256,
+      imageheight: 48,
       image: 'placeholder.png',
     });
@@ -105,5 +105,7 @@ describe('the placeholder tileset generator', () => {
       (tile.properties ?? []).some((p) => p.name === 'solid' && p.value === true),
     );
-    expect(solid.map((tile) => tile.id)).toStrictEqual([2, 3, 16, 17, 18, 19, 21, 25, 26, 27]);
+    expect(solid.map((tile) => tile.id)).toStrictEqual([
+      2, 3, 16, 17, 18, 19, 21, 25, 26, 27, 30, 31, 35, 40, 42, 43, 44, 45, 46, 47,
+    ]);
   });
 
@@ -135,5 +137,5 @@ describe('the placeholder tileset generator', () => {
     const left = { x: 0, y: 0, width: 2, height: 16 };
     const tileset = parseTileset(tilesetJson(), 'placeholder.tsj');
-    expect(tileset.boxes.slice(13)).toStrictEqual([
+    expect(tileset.boxes.slice(13, 30)).toStrictEqual([
       [top],
       [left],
@@ -155,5 +157,5 @@ describe('the placeholder tileset generator', () => {
     ]);
     const low = [13, 14, 15, 16, 17, 18, 19, 20, 23, 25, 26, 27, 28, 29];
-    expect(tileset.low.flatMap((isLow, id) => (isLow ? [id] : []))).toStrictEqual(low);
+    expect(tileset.low.slice(0, 30).flatMap((isLow, id) => (isLow ? [id] : []))).toStrictEqual(low);
     expect(tilesetJson().tiles.map((tile) => tile.id)).not.toContain(22);
     expect(tilesetJson().tiles.map((tile) => tile.id)).not.toContain(24);
@@ -192,4 +194,22 @@ describe('the placeholder tileset generator', () => {
       'screen',
       'screen-side',
+      'sofa-left',
+      'sofa-right',
+      'armchair',
+      'side-table',
+      'beanbag',
+      'counter-coffee',
+      'water-dispenser',
+      'water-dispenser-top',
+      'coat-rack',
+      'coat-rack-top',
+      'arcade',
+      'arcade-top',
+      'foosball-left',
+      'foosball-right',
+      'desk-duck',
+      'desk-lava-lamp',
+      'desk-cube',
+      'desk-robot',
     ]);
   });
@@ -332,2 +352,182 @@ describe('the furniture tiles (0011)', () => {
   });
 });
+
+describe('the lounge and gadget tiles (0013)', () => {
+  const data = renderTiles();
+  const tileset = parseTileset(tilesetJson(), 'placeholder.tsj');
+  const opaque = (id: number): [number, number][] =>
+    pixels().filter(([x, y]) => tileAlpha(data, id, x, y) === 255);
+
+  it('reads back with the boxes and `low` of the spec', () => {
+    const full = { x: 0, y: 0, width: 16, height: 16 };
+    expect(tileset.boxes.slice(30)).toStrictEqual([
+      [full],
+      [full],
+      [{ x: 2, y: 3, width: 12, height: 12 }],
+      [{ x: 4, y: 5, width: 8, height: 8 }],
+      [{ x: 3, y: 5, width: 10, height: 9 }],
+      [full],
+      [{ x: 4, y: 6, width: 8, height: 10 }],
+      [],
+      [{ x: 5, y: 8, width: 6, height: 8 }],
+      [],
+      [full],
+      [],
+      [full],
+      [full],
+      [full],
+      [full],
+      [full],
+      [full],
+    ]);
+    const low = [30, 31, 32, 33, 34, 35, 36, 38, 42, 43, 44, 45, 46, 47];
+    expect(tileset.low.flatMap((isLow, id) => (isLow && id >= 30 ? [id] : []))).toStrictEqual(low);
+  });
+
+  it('gives the three tops no entry, and makes the arcade the only new tile that stops light', () => {
+    const entries = tilesetJson().tiles.map((tile) => tile.id);
+    for (const top of [37, 39, 41]) {
+      expect(entries).not.toContain(top);
+    }
+    const stopsLight = tileset.boxes.flatMap((boxes, id) =>
+      id >= 30 && boxes.length > 0 && tileset.low[id] !== true ? [id] : [],
+    );
+    expect(stopsLight).toStrictEqual([40]);
+  });
+
+  it('keeps the pixels of ids 0–29 as 0011 drew them', () => {
+    // The sheet of 0011, 240x32 in fifteen columns, as it was committed before this feature.
+    const before = PNG.sync.read(
+      readFileSync(join(ROOT, 'tests/fixtures/tiles/placeholder-0011.png')),
+    );
+    expect([before.width, before.height]).toStrictEqual([240, 32]);
+    for (let id = 0; id < 30; id += 1) {
+      for (const [x, y] of pixels()) {
+        const was = (((Math.floor(id / 15) * 16 + y) * 240 + (id % 15) * 16 + x) * 4) as number;
+        const now = ((tileY(id) + y) * SHEET_WIDTH + tileX(id) + x) * 4;
+        expect(
+          [data[now], data[now + 1], data[now + 2], data[now + 3]],
+          `tile ${id} (${x}, ${y})`,
+        ).toStrictEqual([
+          before.data[was],
+          before.data[was + 1],
+          before.data[was + 2],
+          before.data[was + 3],
+        ]);
+      }
+    }
+  });
+
+  it('fills the solid tiles', () => {
+    for (const id of [30, 31, 35, 40, 42, 43, 44, 45, 46, 47]) {
+      expect(opaque(id), `tile ${id}`).toHaveLength(256);
+    }
+  });
+
+  it('draws the armchair, the side-table and the water dispenser exactly in their boxes', () => {
+    for (const id of [32, 33, 36]) {
+      for (const [x, y] of pixels()) {
+        const expected = inBoxes(tileset.boxes[id] ?? [], x, y) ? 255 : 0;
+        expect(tileAlpha(data, id, x, y), `tile ${id} (${x}, ${y})`).toBe(expected);
+      }
+    }
+  });
+
+  it('draws the beanbag inside its box, three pixels cut from each corner', () => {
+    expect(opaque(34)).toHaveLength(78);
+    expect(opaque(34).every(([x, y]) => inBoxes(tileset.boxes[34] ?? [], x, y))).toBe(true);
+    for (const [x, y] of [
+      [3, 5],
+      [4, 5],
+      [3, 6],
+      [12, 13],
+    ] as const) {
+      expect(tileAlpha(data, 34, x, y), `(${x}, ${y})`).toBe(0);
+    }
+  });
+
+  it('draws the coat rack as a pole on a foot that fills the width of its box', () => {
+    expect(opaque(38)).toHaveLength(2 * 14 + 6 * 2);
+    for (let x = 5; x <= 10; x += 1) {
+      expect(tileAlpha(data, 38, x, 15)).toBe(255);
+    }
+  });
+
+  it('keeps the tops in the lower 10, 12 and 14 px', () => {
+    expect(opaque(37).some(([, y]) => y < 6)).toBe(false);
+    expect(opaque(39).some(([, y]) => y < 4)).toBe(false);
+    expect(opaque(41).some(([, y]) => y < 2)).toBe(false);
+    expect(opaque(41)).toHaveLength(14 * 16);
+  });
+
+  it.each([
+    [30, 0, 8, '#a22633'],
+    [30, 8, 0, '#a22633'],
+    [30, 8, 8, '#e43b44'],
+    [30, 15, 8, '#e43b44'],
+    [31, 15, 8, '#a22633'],
+    [31, 0, 8, '#e43b44'],
+    [32, 2, 10, '#a22633'],
+    [32, 13, 10, '#a22633'],
+    [32, 8, 4, '#a22633'],
+    [32, 8, 10, '#e43b44'],
+    [33, 4, 8, '#b86f50'],
+    [33, 8, 5, '#b86f50'],
+    [33, 8, 8, '#ead4aa'],
+    [33, 8, 11, '#b86f50'],
+    [34, 8, 10, '#f77622'],
+    [34, 6, 6, '#feae34'],
+    [35, 0, 0, '#ffffff'],
+    [35, 0, 15, '#c0cbdc'],
+    [35, 5, 5, '#262b44'],
+    [35, 7, 8, '#ffffff'],
+    [35, 10, 3, '#e43b44'],
+    [36, 4, 6, '#c0cbdc'],
+    [36, 6, 9, '#e43b44'],
+    [36, 9, 10, '#0099db'],
+    [37, 5, 6, '#2ce8f5'],
+    [37, 5, 8, '#0099db'],
+    [37, 7, 15, '#2ce8f5'],
+    [38, 7, 0, '#3e2731'],
+    [38, 5, 14, '#3e2731'],
+    [39, 7, 4, '#3e2731'],
+    [39, 3, 5, '#3e2731'],
+    [39, 2, 6, '#124e89'],
+    [39, 13, 15, '#feae34'],
+    [40, 0, 0, '#124e89'],
+    [40, 0, 2, '#262b44'],
+    [40, 4, 3, '#e43b44'],
+    [40, 11, 4, '#fee761'],
+    [41, 0, 2, '#124e89'],
+    [41, 1, 3, '#f77622'],
+    [41, 2, 7, '#181425'],
+    [41, 3, 11, '#63c74d'],
+    [41, 7, 9, '#fee761'],
+    [41, 12, 12, '#2ce8f5'],
+    [42, 0, 8, '#733e39'],
+    [42, 15, 8, '#3e8948'],
+    [42, 7, 0, '#c0cbdc'],
+    [42, 6, 4, '#e43b44'],
+    [43, 15, 8, '#733e39'],
+    [43, 0, 8, '#3e8948'],
+    [43, 9, 11, '#0099db'],
+    [44, 0, 0, '#c0cbdc'],
+    [44, 0, 1, '#5a6988'],
+    [44, 0, 15, '#b86f50'],
+    [44, 5, 7, '#fee761'],
+    [44, 11, 5, '#f77622'],
+    [45, 6, 10, '#5a6988'],
+    [45, 6, 4, '#f77622'],
+    [45, 7, 5, '#e43b44'],
+    [46, 7, 6, '#e43b44'],
+    [46, 8, 7, '#ffffff'],
+    [46, 9, 8, '#0099db'],
+    [46, 6, 6, '#e4a672'],
+    [47, 5, 4, '#c0cbdc'],
+    [47, 6, 6, '#2ce8f5'],
+    [47, 9, 6, '#2ce8f5'],
+  ])('tile %i at (%i, %i) is %s', (id, x, y, colour) => {
+    expect(tileAlpha(data, id, x, y)).toBe(255);
+    expect(tileHex(data, id, x, y)).toBe(colour);
+  });
+});
```

  And to `tests/unit/creature.test.ts` — the arcade is the first tile of the floor's furniture
  besides the cabinet that stops light, and the beanbag stands for everything low. The sight
  line runs from 4 px above the figure's feet to 8 px above the snippet's; the second
  assertion of the beanbag test proves that the line really crosses the beanbag's box:

```diff
--- a/tests/unit/creature.test.ts
+++ b/tests/unit/creature.test.ts
@@ -1,3 +1,5 @@
+import { readFileSync } from 'node:fs';
 import { describe, expect, it } from 'vitest';
+import { parseTileMap, parseTileset } from '../../src/engine/tiled';
 import {
   bodyPoint,
@@ -220,4 +222,25 @@ describe('a wall in the light', () => {
 });
 
+describe('the arcade cabinet and a beanbag in the light (0013)', () => {
+  // The placeholder tileset on a 20x12 map: the arcade cabinet in cell (5, 5), [80, 96) × [80, 96),
+  // and a beanbag in cell (9, 5), its box [147, 157) × [85, 94). The sight line runs from 4 px
+  // above the figure's feet to 8 px above the snippet's: y = 92 to y = 90, through both boxes.
+  const json = (file: string): unknown =>
+    JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'));
+  const tileset = parseTileset(json('public/tiles/placeholder.tsj'), 'placeholder.tsj');
+  const map = parseTileMap(json('tests/fixtures/maps/arcade.tmj'), tileset, 'arcade.tmj');
+
+  it('is not lit beyond the arcade cabinet', () => {
+    expect(isLit(snippet(106, 98), figure(70, 96, 'right'), true, map)).toBe(false);
+  });
+
+  it('is lit beyond the beanbag, whose box the line crosses', () => {
+    const behind = snippet(170, 98);
+    const before = figure(134, 96, 'right');
+    expect(isLit(behind, before, true, map)).toBe(true);
+    expect(isLit(behind, before, true, { ...map, opaque: map.solids })).toBe(false);
+  });
+});
+
 describe('stepCreatures', () => {
   it('steps every creature in order, drops the captured one and counts it', () => {
```

- [ ] **Step 2: run them.** `npx vitest run tests/unit/gen-tiles.test.ts tests/unit/creature.test.ts`.
  Expected: `gen-tiles` fails on the sheet size, the tile count, the names and the whole new
  block; the new block of `creature.test.ts` fails while loading its map with `arcade.tmj:
  layer "detail" cell (5, 5) has tile id 41, which is outside the tileset (1–30)`.

- [ ] **Step 3: the tiles.** Apply to `tools/placeholder-tiles.ts`:

```diff
--- a/tools/placeholder-tiles.ts
+++ b/tools/placeholder-tiles.ts
@@ -3,11 +3,11 @@ import type { PaletteColour } from '../src/render/palette.ts';
 
 /**
- * The placeholder tileset (visual.md §5, features 0010 and 0011): thirty 16x16 office tiles in
- * fifteen columns and two rows, drawn from code in Endesga 32; the tile with id n sits at column
- * n mod 15, row ⌊n / 15⌋. Pure — it returns pixels and the .tsj object; tools/gen-tiles.ts
+ * The placeholder tileset (visual.md §5, features 0010, 0011 and 0013): forty-eight 16x16 office
+ * tiles in sixteen columns and three rows, drawn from code in Endesga 32; the tile with id n sits
+ * at column n mod 16, row ⌊n / 16⌋. Pure — it returns pixels and the .tsj object; tools/gen-tiles.ts
  * writes the files. A wall is a strip 4 px thick on the top or the left edge of a cell, drawn
  * over the cell's floor; its pixels are exactly its collision boxes. Pixel (0, 0) of the two
- * floor tiles is their base colour. The furniture of 0011 (ids 13–29) is transparent where
- * nothing is drawn, so it stands on whatever floor lies below it on `ground`.
+ * floor tiles is their base colour. The furniture of 0011 and 0013 (ids 13–47) is transparent
+ * where nothing is drawn, so it stands on whatever floor lies below it on `ground`.
  */
 
@@ -55,9 +55,28 @@ export const PRINTER = 27;
 export const SCREEN = 28;
 export const SCREEN_SIDE = 29;
-
-/** Fifteen columns, two rows: 15 × 16 by 2 × 16. */
-export const SHEET_COLUMNS = 15;
-export const SHEET_WIDTH = 240;
-export const SHEET_HEIGHT = 32;
+/** Lounge and gadgets (0013). */
+export const SOFA_LEFT = 30;
+export const SOFA_RIGHT = 31;
+export const ARMCHAIR = 32;
+export const SIDE_TABLE = 33;
+export const BEANBAG = 34;
+export const COUNTER_COFFEE = 35;
+export const WATER_DISPENSER = 36;
+export const WATER_DISPENSER_TOP = 37;
+export const COAT_RACK = 38;
+export const COAT_RACK_TOP = 39;
+export const ARCADE = 40;
+export const ARCADE_TOP = 41;
+export const FOOSBALL_LEFT = 42;
+export const FOOSBALL_RIGHT = 43;
+export const DESK_DUCK = 44;
+export const DESK_LAVA_LAMP = 45;
+export const DESK_CUBE = 46;
+export const DESK_ROBOT = 47;
+
+/** Sixteen columns, three rows: 16 × 16 by 3 × 16. */
+export const SHEET_COLUMNS = 16;
+export const SHEET_WIDTH = 256;
+export const SHEET_HEIGHT = 48;
 
 const TOP: Box = { x: 0, y: 0, width: TILE_SIZE, height: 4 };
@@ -159,4 +178,52 @@ export const TILE_KINDS: readonly TileKind[] = [
     low: true,
   },
+  { id: SOFA_LEFT, name: 'sofa-left', solid: true, boxes: [], low: true },
+  { id: SOFA_RIGHT, name: 'sofa-right', solid: true, boxes: [], low: true },
+  {
+    id: ARMCHAIR,
+    name: 'armchair',
+    solid: false,
+    boxes: [{ x: 2, y: 3, width: 12, height: 12 }],
+    low: true,
+  },
+  {
+    id: SIDE_TABLE,
+    name: 'side-table',
+    solid: false,
+    boxes: [{ x: 4, y: 5, width: 8, height: 8 }],
+    low: true,
+  },
+  {
+    id: BEANBAG,
+    name: 'beanbag',
+    solid: false,
+    boxes: [{ x: 3, y: 5, width: 10, height: 9 }],
+    low: true,
+  },
+  { id: COUNTER_COFFEE, name: 'counter-coffee', solid: true, boxes: [], low: true },
+  {
+    id: WATER_DISPENSER,
+    name: 'water-dispenser',
+    solid: false,
+    boxes: [{ x: 4, y: 6, width: 8, height: 10 }],
+    low: true,
+  },
+  { id: WATER_DISPENSER_TOP, name: 'water-dispenser-top', solid: false, boxes: [], low: false },
+  {
+    id: COAT_RACK,
+    name: 'coat-rack',
+    solid: false,
+    boxes: [{ x: 5, y: 8, width: 6, height: 8 }],
+    low: true,
+  },
+  { id: COAT_RACK_TOP, name: 'coat-rack-top', solid: false, boxes: [], low: false },
+  { id: ARCADE, name: 'arcade', solid: true, boxes: [], low: false },
+  { id: ARCADE_TOP, name: 'arcade-top', solid: false, boxes: [], low: false },
+  { id: FOOSBALL_LEFT, name: 'foosball-left', solid: true, boxes: [], low: true },
+  { id: FOOSBALL_RIGHT, name: 'foosball-right', solid: true, boxes: [], low: true },
+  { id: DESK_DUCK, name: 'desk-duck', solid: true, boxes: [], low: true },
+  { id: DESK_LAVA_LAMP, name: 'desk-lava-lamp', solid: true, boxes: [], low: true },
+  { id: DESK_CUBE, name: 'desk-cube', solid: true, boxes: [], low: true },
+  { id: DESK_ROBOT, name: 'desk-robot', solid: true, boxes: [], low: true },
 ];
 
@@ -364,4 +431,177 @@ function screenSide(x: number, y: number): PaletteColour | null {
 }
 
+/** A sofa half: the back in the upper 5 px, an arm 3 px wide on the outer side (0013). */
+function sofa(arm: 'left' | 'right'): Painter {
+  return (x, y) => {
+    const onArm = arm === 'left' ? x <= 2 : x >= 13;
+    return onArm || y <= 4 ? '#a22633' : '#e43b44';
+  };
+}
+
+function armchair(x: number, y: number): PaletteColour | null {
+  if (!within(x, 2, 13) || !within(y, 3, 14)) {
+    return null;
+  }
+  return x <= 3 || x >= 12 || y <= 6 ? '#a22633' : '#e43b44';
+}
+
+/** A small table: a rim 1 px wide round its top, a front edge 2 px high. */
+function sideTable(x: number, y: number): PaletteColour | null {
+  if (!within(x, 4, 11) || !within(y, 5, 12)) {
+    return null;
+  }
+  return x === 4 || x === 11 || y === 5 || y >= 11 ? '#b86f50' : '#ead4aa';
+}
+
+/** A beanbag: its box with three pixels cut from each corner, a highlight on the upper left. */
+function beanbag(x: number, y: number): PaletteColour | null {
+  if (!within(x, 3, 12) || !within(y, 5, 13)) {
+    return null;
+  }
+  if (Math.min(x - 3, 12 - x) + Math.min(y - 5, 13 - y) < 2) {
+    return null;
+  }
+  return within(x, 5, 8) && within(y, 6, 7) ? '#feae34' : '#f77622';
+}
+
+const counter = surface('#ffffff', '#c0cbdc');
+
+function counterCoffee(x: number, y: number): PaletteColour | null {
+  if (x === 10 && y === 3) {
+    return '#e43b44';
+  }
+  if (within(x, 7, 8) && within(y, 7, 9)) {
+    return '#ffffff';
+  }
+  return within(x, 4, 11) && within(y, 2, 10) ? '#262b44' : counter(x, y);
+}
+
+function waterDispenser(x: number, y: number): PaletteColour | null {
+  if (!within(x, 4, 11) || !within(y, 6, 15)) {
+    return null;
+  }
+  if (within(y, 9, 10) && (x === 6 || x === 9)) {
+    return x === 6 ? '#e43b44' : '#0099db';
+  }
+  return '#c0cbdc';
+}
+
+/** The bottle, neck down, in the lower 10 px. */
+function waterDispenserTop(x: number, y: number): PaletteColour | null {
+  const bottle = within(x, 5, 10) && within(y, 6, 13);
+  const neck = within(x, 7, 8) && within(y, 14, 15);
+  if (!bottle && !neck) {
+    return null;
+  }
+  return y === 8 ? '#0099db' : '#2ce8f5';
+}
+
+function coatRack(x: number, y: number): PaletteColour | null {
+  const pole = within(x, 7, 8) && y <= 13;
+  const foot = within(x, 5, 10) && y >= 14;
+  return pole || foot ? '#3e2731' : null;
+}
+
+/** The pole, a bar of hooks and a coat on each side, in the lower 12 px. */
+function coatRackTop(x: number, y: number): PaletteColour | null {
+  if (y < 4) {
+    return null;
+  }
+  if (within(x, 7, 8) || (y === 5 && within(x, 3, 12))) {
+    return '#3e2731';
+  }
+  if (y >= 6 && within(x, 2, 6)) {
+    return '#124e89';
+  }
+  return y >= 6 && within(x, 9, 13) ? '#feae34' : null;
+}
+
+function arcade(x: number, y: number): PaletteColour {
+  if (within(y, 3, 4) && within(x, 4, 5)) {
+    return '#e43b44';
+  }
+  if (within(y, 3, 4) && within(x, 10, 11)) {
+    return '#fee761';
+  }
+  return within(y, 2, 6) ? '#262b44' : '#124e89';
+}
+
+/** The cabinet's head in the lower 14 px: a marquee, and a screen with three blocks. */
+function arcadeTop(x: number, y: number): PaletteColour | null {
+  if (y < 2) {
+    return null;
+  }
+  if (within(x, 1, 14) && within(y, 3, 5)) {
+    return '#f77622';
+  }
+  if (!within(x, 2, 13) || !within(y, 7, 14)) {
+    return '#124e89';
+  }
+  if (within(x, 3, 4) && within(y, 11, 12)) {
+    return '#63c74d';
+  }
+  if (within(x, 7, 8) && within(y, 9, 10)) {
+    return '#fee761';
+  }
+  return within(x, 11, 12) && within(y, 11, 12) ? '#2ce8f5' : '#181425';
+}
+
+/** Half a table football: the frame on three sides, a rod down the middle with two players. */
+function foosball(side: 'left' | 'right'): Painter {
+  return (x, y) => {
+    if (within(x, 6, 9) && (within(y, 4, 5) || within(y, 10, 11))) {
+      return side === 'left' ? '#e43b44' : '#0099db';
+    }
+    if (within(x, 7, 8)) {
+      return '#c0cbdc';
+    }
+    const outer = side === 'left' ? x === 0 : x === 15;
+    return outer || y <= 1 || y >= 14 ? '#733e39' : '#3e8948';
+  };
+}
+
+/** A desk-partition (18) with a gadget drawn on its top (0013). */
+function gadgetDesk(gadget: (x: number, y: number) => PaletteColour | null): Painter {
+  const under = withPartition(desk);
+  return (x, y) => gadget(x, y) ?? under(x, y);
+}
+
+function duck(x: number, y: number): PaletteColour | null {
+  if (x === 11 && y === 5) {
+    return '#f77622';
+  }
+  const head = within(x, 8, 10) && within(y, 4, 6);
+  const body = within(x, 5, 9) && within(y, 7, 10);
+  return head || body ? '#fee761' : null;
+}
+
+function lavaLamp(x: number, y: number): PaletteColour | null {
+  if ((within(x, 7, 8) && y === 3) || (within(x, 6, 9) && within(y, 10, 11))) {
+    return '#5a6988';
+  }
+  if (!within(x, 6, 9) || !within(y, 4, 9)) {
+    return null;
+  }
+  const blob = (x === 7 && y === 5) || (x === 8 && y === 7) || (x === 7 && y === 8);
+  return blob ? '#e43b44' : '#f77622';
+}
+
+const CUBE: readonly (readonly PaletteColour[])[] = [
+  ['#e43b44', '#fee761', '#63c74d'],
+  ['#0099db', '#ffffff', '#f77622'],
+  ['#63c74d', '#e43b44', '#0099db'],
+];
+
+function cube(x: number, y: number): PaletteColour | null {
+  return CUBE[y - 6]?.[x - 7] ?? null;
+}
+
+function robot(x: number, y: number): PaletteColour | null {
+  if (!within(x, 5, 10) || !within(y, 4, 10)) {
+    return null;
+  }
+  return y === 6 && (x === 6 || x === 9) ? '#2ce8f5' : '#c0cbdc';
+}
+
 /** The picture of a tile, by id. */
 function painter(kind: TileKind): Painter {
@@ -404,5 +644,5 @@ function painter(kind: TileKind): Painter {
       return surface('#b86f50', '#733e39');
     case COUNTER:
-      return surface('#ffffff', '#c0cbdc');
+      return counter;
     case PRINTER:
       return printer;
@@ -411,4 +651,40 @@ function painter(kind: TileKind): Painter {
     case SCREEN_SIDE:
       return screenSide;
+    case SOFA_LEFT:
+      return sofa('left');
+    case SOFA_RIGHT:
+      return sofa('right');
+    case ARMCHAIR:
+      return armchair;
+    case SIDE_TABLE:
+      return sideTable;
+    case BEANBAG:
+      return beanbag;
+    case COUNTER_COFFEE:
+      return counterCoffee;
+    case WATER_DISPENSER:
+      return waterDispenser;
+    case WATER_DISPENSER_TOP:
+      return waterDispenserTop;
+    case COAT_RACK:
+      return coatRack;
+    case COAT_RACK_TOP:
+      return coatRackTop;
+    case ARCADE:
+      return arcade;
+    case ARCADE_TOP:
+      return arcadeTop;
+    case FOOSBALL_LEFT:
+      return foosball('left');
+    case FOOSBALL_RIGHT:
+      return foosball('right');
+    case DESK_DUCK:
+      return gadgetDesk(duck);
+    case DESK_LAVA_LAMP:
+      return gadgetDesk(lavaLamp);
+    case DESK_CUBE:
+      return gadgetDesk(cube);
+    case DESK_ROBOT:
+      return gadgetDesk(robot);
     default:
       return wall(kind.id < WALL_TOP + CORRIDOR_WALLS ? carpet : corridor, kind.boxes);
```

- [ ] **Step 4: generate and run.** `npm run gen-tiles`, then `npm run gen-floor` — the floor's
  bytes do not change yet, the command only proves that. `npx biome check --write .`, then
  `npm run check`. Expected: green, 536 tests. `tests/unit/assets.test.ts` is unchanged and
  green on the new sheet. `git diff --stat origin/main -- src/` is empty.

- [ ] **Step 5: commit** — `Draw the eighteen tiles of the lounge and the gadgets`; why: the
  floor of 0011 has work furniture only; the sheet grows to sixteen columns and three rows so
  that forty-eight tiles fill it exactly, and every id keeps its value.

---

### Task 2: The pieces on the floor

**Files:** modify `tests/unit/floor.test.ts`, `tools/floor-layout.ts`; generate
`public/maps/floor.tmj`.

**Consumes** the ids of T1. **Produces** the placements of the spec's room table in
`FURNITURE`, in these piece names: `sofa`, `seating-corner`, `armchair-pair`, `beanbag-circle`,
`beanbag`, `side-table`, `coffee-corner`, `coat-rack`, `water-dispenser`, `arcade`,
`table-football`, and the replacements `coffee-machine`, `desk-duck`, `desk-lava-lamp`,
`desk-cube`, `desk-robot`. Each is `{ piece, x, y }`; (x, y) is the piece's top-left cell, for
a tall thing the cell of its body.

What the tests of this task pin, all measured on the trial run:

- `detail` equals the picture `floor-lounge.txt` cell by cell — 888 cells — and the fifteen new
  counts are sofa-left 8, sofa-right 8, armchair 10, side-table 16, beanbag 20, counter-coffee
  8, water-dispenser 5, coat-rack 11, arcade 1, foosball-left 1, foosball-right 1 and two of
  each gadget desk; `above` holds 65 tiles, among them 5, 11 and 1 new tops.
- Nothing of 0011 moved: every cell of 0011's picture still holds its tile, but for the ten
  cells the spec replaces — (35, 26) and (42, 26) in the break room and the eight gadget desks.
  Two counts of 0011 change with that and are corrected in its own test: desk-partition 61 →
  53, counter 19 → 23. The totals 795 and 48 move from the 0011 block to the new one as 888 and
  65.
- The rule for tops holds for all five kinds of tall thing; the 0011 test is widened from two
  kinds to a map of top → body.
- Every cell without a solid box in a room or corridor other than the lift and the stairwell
  is reached on the 2 px lattice: 6198 cells.
- Row 18 of Development is empty on `detail` from column 45 to 84; the reception's seating
  corner and coat rack lie whole inside the first view; the arcade's cell is opaque, the other
  new things are solid and not opaque.

- [ ] **Step 1: the failing tests.** Apply to `tests/unit/floor.test.ts`:

```diff
--- a/tests/unit/floor.test.ts
+++ b/tests/unit/floor.test.ts
@@ -23,16 +23,29 @@ import {
 import { encodeFloor } from '../../tools/gen-floor.ts';
 import {
+  ARCADE,
+  ARCADE_TOP,
+  ARMCHAIR,
+  BEANBAG,
   CABINET,
   CABINET_TOP,
   CARPET,
   CHAIR,
+  COAT_RACK,
+  COAT_RACK_TOP,
   CORRIDOR,
   CORRIDOR_WALLS,
   COUNTER,
+  COUNTER_COFFEE,
   DESK,
+  DESK_CUBE,
+  DESK_DUCK,
+  DESK_LAVA_LAMP,
   DESK_MONITOR,
   DESK_MONITOR_PARTITION,
   DESK_PARTITION,
+  DESK_ROBOT,
   DOOR_CLOSED,
+  FOOSBALL_LEFT,
+  FOOSBALL_RIGHT,
   OUTER_WALL,
   PARTITION_CORNER,
@@ -44,8 +57,13 @@ import {
   SCREEN,
   SCREEN_SIDE,
+  SIDE_TABLE,
+  SOFA_LEFT,
+  SOFA_RIGHT,
   TABLE,
   TILE_KINDS,
   WALL_CORNER,
   WALL_TOP,
+  WATER_DISPENSER,
+  WATER_DISPENSER_TOP,
   WINDOW,
 } from '../../tools/placeholder-tiles.ts';
@@ -373,5 +391,5 @@ describe('public/maps/floor.tmj (feature 0010)', () => {
 });
 
-/** The spec's picture of the furnished floor, character → the ids it allows on `detail`. */
+/** The picture of 0011's spec, character → the ids it allows on `detail`. */
 const PICTURE_IDS: Readonly<Record<string, readonly number[]>> = {
   '~': [PARTITION_TOP],
@@ -394,4 +412,52 @@ const detailAt = (column: number, row: number): number | undefined =>
 const aboveAt = (column: number, row: number): number | undefined => floor.above[cell(column, row)];
 
+/** The cells of 0011 that 0013 replaces, "column,row" → the id that stands there now. */
+const REPLACED: Readonly<Record<string, number>> = {
+  '35,26': COUNTER_COFFEE,
+  '42,26': COUNTER_COFFEE,
+  '48,3': DESK_DUCK,
+  '74,9': DESK_DUCK,
+  '58,3': DESK_LAVA_LAMP,
+  '69,15': DESK_LAVA_LAMP,
+  '53,9': DESK_CUBE,
+  '79,3': DESK_CUBE,
+  '48,15': DESK_ROBOT,
+  '79,15': DESK_ROBOT,
+};
+
+/** The picture of 0013's spec: the characters of 0011 and the ten new ones. */
+const LOUNGE_IDS: Readonly<Record<string, readonly number[]>> = {
+  ...PICTURE_IDS,
+  S: [SOFA_LEFT, SOFA_RIGHT],
+  a: [ARMCHAIR],
+  t: [SIDE_TABLE],
+  b: [BEANBAG],
+  k: [COUNTER_COFFEE],
+  W: [WATER_DISPENSER],
+  G: [COAT_RACK],
+  A: [ARCADE],
+  F: [FOOSBALL_LEFT, FOOSBALL_RIGHT],
+  g: [DESK_DUCK, DESK_LAVA_LAMP, DESK_CUBE, DESK_ROBOT],
+};
+
+/** A tall thing's top → its body (0011, 0013). */
+const BODY_OF: ReadonlyMap<number, number> = new Map([
+  [CABINET_TOP, CABINET],
+  [PLANT_TOP, PLANT],
+  [WATER_DISPENSER_TOP, WATER_DISPENSER],
+  [COAT_RACK_TOP, COAT_RACK],
+  [ARCADE_TOP, ARCADE],
+]);
+const TOP_OF: ReadonlyMap<number, number> = new Map([...BODY_OF].map(([top, body]) => [body, top]));
+
+const pictureRows = (file: string): string[] => {
+  const rows = read(file).trimEnd().split('\n');
+  expect(rows).toHaveLength(80);
+  for (const line of rows) {
+    expect(line).toHaveLength(108);
+  }
+  return rows;
+};
+
 const AREAS = [...ROOMS, ...CORRIDORS];
 const areaOf = (column: number, row: number): string | undefined =>
@@ -400,16 +466,23 @@ const areaOf = (column: number, row: number): string | undefined =>
 
 describe('the furniture (0011)', () => {
-  it('stands where the spec draws it, and nowhere else on `detail`', () => {
-    const rows = read('tests/fixtures/maps/floor-furniture.txt').trimEnd().split('\n');
-    expect(rows).toHaveLength(80);
-    rows.forEach((line, row) => {
-      expect(line, `row ${row}`).toHaveLength(108);
+  it('still stands where its spec draws it, but for the ten cells 0013 replaces', () => {
+    pictureRows('tests/fixtures/maps/floor-furniture.txt').forEach((line, row) => {
       [...line].forEach((character, column) => {
-        const allowed = PICTURE_IDS[character] ?? [EMPTY];
-        expect(allowed, `(${column}, ${row}) "${character}"`).toContain(detailAt(column, row));
+        const allowed = PICTURE_IDS[character];
+        if (allowed === undefined) {
+          return;
+        }
+        const replaced = REPLACED[`${column},${row}`];
+        const where = `(${column}, ${row}) "${character}"`;
+        if (replaced === undefined) {
+          expect(allowed, where).toContain(detailAt(column, row));
+        } else {
+          expect(detailAt(column, row), where).toBe(replaced);
+        }
       });
     });
   });
 
+  // 0013 turned eight desk-partitions into gadget desks and added four counters.
   it('has the fifteen tile counts on `detail` and the two on `above`', () => {
     const count = (layer: readonly number[], id: number): number =>
@@ -433,10 +506,8 @@ describe('the furniture (0011)', () => {
         SCREEN_SIDE,
       ].map((id) => count(floor.detail, id)),
-    ).toStrictEqual([122, 170, 61, 24, 24, 61, 61, 122, 34, 14, 58, 19, 5, 6, 14]);
-    expect(floor.detail.filter((id) => id !== EMPTY)).toHaveLength(795);
+    ).toStrictEqual([122, 170, 61, 24, 24, 53, 61, 122, 34, 14, 58, 23, 5, 6, 14]);
     expect([count(floor.above, CABINET_TOP), count(floor.above, PLANT_TOP)]).toStrictEqual([
       34, 14,
     ]);
-    expect(floor.above.filter((id) => id !== EMPTY)).toHaveLength(48);
   });
 
@@ -507,20 +578,17 @@ describe('the furniture (0011)', () => {
     for (let row = 0; row < 80; row += 1) {
       for (let column = 0; column < 108; column += 1) {
-        const top = aboveAt(column, row);
+        const top = aboveAt(column, row) ?? EMPTY;
         const where = `(${column}, ${row})`;
-        if (top === CABINET_TOP || top === PLANT_TOP) {
-          expect(detailAt(column, row + 1), where).toBe(top === CABINET_TOP ? CABINET : PLANT);
+        if (top !== EMPTY) {
+          expect(BODY_OF.has(top), `${where} holds ${top}`).toBe(true);
+          expect(detailAt(column, row + 1), where).toBe(BODY_OF.get(top));
           expect(areaOf(column, row), where).toBeDefined();
           expect(areaOf(column, row), where).toBe(areaOf(column, row + 1));
           expect(topStripIds, where).not.toContain(tileAt(column, row + 1));
-          expect([EMPTY, CABINET, PLANT], where).toContain(detailAt(column, row));
-        } else {
-          expect(top, where).toBe(EMPTY);
+          expect([EMPTY, ...TOP_OF.keys()], where).toContain(detailAt(column, row));
         }
-        const body = detailAt(column, row);
-        if (body === CABINET || body === PLANT) {
-          expect(aboveAt(column, row - 1), `top of ${where}`).toBe(
-            body === CABINET ? CABINET_TOP : PLANT_TOP,
-          );
+        const body = TOP_OF.get(detailAt(column, row) ?? EMPTY);
+        if (body !== undefined) {
+          expect(aboveAt(column, row - 1), `top of ${where}`).toBe(body);
         }
       }
@@ -586,2 +654,143 @@ describe('the furniture (0011)', () => {
   });
 });
+
+describe('lounge and gadgets (0013)', () => {
+  const count = (layer: readonly number[], id: number): number =>
+    layer.filter((value) => value === id).length;
+
+  it('stands where the spec draws it, and nowhere else on `detail`', () => {
+    pictureRows('tests/fixtures/maps/floor-lounge.txt').forEach((line, row) => {
+      [...line].forEach((character, column) => {
+        const allowed = LOUNGE_IDS[character] ?? [EMPTY];
+        expect(allowed, `(${column}, ${row}) "${character}"`).toContain(detailAt(column, row));
+      });
+    });
+  });
+
+  it('has the fifteen new tile counts on `detail` and the three on `above`', () => {
+    expect(
+      [
+        SOFA_LEFT,
+        SOFA_RIGHT,
+        ARMCHAIR,
+        SIDE_TABLE,
+        BEANBAG,
+        COUNTER_COFFEE,
+        WATER_DISPENSER,
+        COAT_RACK,
+        ARCADE,
+        FOOSBALL_LEFT,
+        FOOSBALL_RIGHT,
+        DESK_DUCK,
+        DESK_LAVA_LAMP,
+        DESK_CUBE,
+        DESK_ROBOT,
+      ].map((id) => count(floor.detail, id)),
+    ).toStrictEqual([8, 8, 10, 16, 20, 8, 5, 11, 1, 1, 1, 2, 2, 2, 2]);
+    expect(floor.detail.filter((id) => id !== EMPTY)).toHaveLength(888);
+    expect(
+      [WATER_DISPENSER_TOP, COAT_RACK_TOP, ARCADE_TOP].map((id) => count(floor.above, id)),
+    ).toStrictEqual([5, 11, 1]);
+    expect(floor.above.filter((id) => id !== EMPTY)).toHaveLength(65);
+  });
+
+  it('builds the pieces as the spec defines them', () => {
+    const placements = FURNITURE.flatMap((entry) => entry.placements);
+    expect(placements).toContainEqual({ piece: 'seating-corner', x: 12, y: 48 });
+    expect(placements).toContainEqual({ piece: 'beanbag-circle', x: 37, y: 47 });
+    expect(placements).toContainEqual({ piece: 'coffee-machine', x: 35, y: 26 });
+    const row = (y: number, from: number, to: number): (number | undefined)[] =>
+      Array.from({ length: to - from + 1 }, (_, k) => detailAt(from + k, y));
+    // The reception's seating corner at (12, 48): sofa, side-table, armchair.
+    expect(row(48, 12, 15)).toStrictEqual([30, 31, 33, 32]);
+    // HR's armchair pair is Accounting's, at (39, 14): armchair, side-table, armchair.
+    expect(row(14, 39, 41)).toStrictEqual([32, 33, 32]);
+    // The break room's beanbag circle at (37, 47).
+    expect(row(47, 37, 39)).toStrictEqual([EMPTY, 34, EMPTY]);
+    expect(row(48, 37, 39)).toStrictEqual([34, 33, 34]);
+    // Accounting's coffee corner at (27, 19) and the break room's two machines in its counter.
+    expect(row(19, 27, 28)).toStrictEqual([35, 26]);
+    expect(row(26, 32, 45)).toStrictEqual([26, 26, 26, 35, 26, 26, 26, 26, 26, 26, 35, 26, 26, 26]);
+    // The table football at (31, 48) and the arcade at (44, 49) with its top.
+    expect(row(48, 31, 32)).toStrictEqual([42, 43]);
+    expect([detailAt(44, 49), aboveAt(44, 48)]).toStrictEqual([40, 41]);
+    // Development's bottom row: sofa, side-table, a free cell, two beanbags.
+    expect(row(19, 70, 75)).toStrictEqual([30, 31, 33, EMPTY, 34, 34]);
+    // The south corridor's sofa between the lift's and the stairwell's doors.
+    expect(row(53, 60, 62)).toStrictEqual([30, 31, 33]);
+    // A coat rack and a water dispenser with their tops.
+    expect([detailAt(20, 48), aboveAt(20, 47)]).toStrictEqual([38, 39]);
+    expect([detailAt(20, 25), aboveAt(20, 24)]).toStrictEqual([36, 37]);
+  });
+
+  it('puts a gadget on eight desks of Development, in the place of a desk-partition', () => {
+    for (const [key, id] of Object.entries(REPLACED)) {
+      const [column, row] = key.split(',').map(Number) as [number, number];
+      expect(detailAt(column, row), key).toBe(id);
+      if (id !== COUNTER_COFFEE) {
+        expect(areaOf(column, row), key).toBe('development');
+        expect(detailAt(column - 1, row), key).toBe(DESK_MONITOR_PARTITION);
+      }
+    }
+  });
+
+  it('leaves row 18 of Development empty on `detail`, columns 45–84', () => {
+    for (let column = 45; column <= 84; column += 1) {
+      expect(detailAt(column, 18), `(${column}, 18)`).toBe(EMPTY);
+    }
+  });
+
+  it('reaches every cell without a solid box outside the lift and the stairwell', () => {
+    let cells = 0;
+    for (const area of AREAS.filter(({ name }) => name !== 'lift' && name !== 'stairwell')) {
+      for (const at of cellsOf(area.cells)) {
+        if ((floor.solids[cell(at.x, at.y)] ?? []).length === 0) {
+          expect(reached(feetIn(at.x, at.y)), `${area.name} (${at.x}, ${at.y})`).toBe(true);
+          cells += 1;
+        }
+      }
+    }
+    expect(cells).toBe(6198);
+  });
+
+  it("shows the reception's seating corner and coat rack in the first view", () => {
+    const camera = cameraFor({ x: 256, y: 714 }, MAP_PX);
+    expect(camera).toStrictEqual({ x: 96, y: 624 });
+    for (const [column, row] of [
+      [12, 48],
+      [13, 48],
+      [14, 48],
+      [15, 48],
+      [20, 47],
+      [20, 48],
+    ] as const) {
+      const inView =
+        column * 16 >= camera.x &&
+        column * 16 + 16 <= camera.x + 320 &&
+        row * 16 >= camera.y &&
+        row * 16 + 16 <= camera.y + 180;
+      expect(inView, `(${column}, ${row})`).toBe(true);
+    }
+  });
+
+  it('lets light pass everything new but the arcade cabinet', () => {
+    expect(floor.opaque[cell(44, 49)]).toStrictEqual([
+      { x: 44 * 16, y: 49 * 16, width: 16, height: 16 },
+    ]);
+    for (const [name, column, row] of [
+      ['sofa', 12, 48],
+      ['armchair', 15, 48],
+      ['side-table', 14, 48],
+      ['beanbag', 38, 47],
+      // Not the break room's: its counter stands in the wall's row, and the wall is opaque.
+      ['counter-coffee', 27, 19],
+      ['water dispenser', 47, 28],
+      ['coat rack', 20, 48],
+      ['table football', 31, 48],
+      ['gadget desk', 48, 3],
+    ] as const) {
+      expect(floor.opaque[cell(column, row)], name).toStrictEqual([]);
+      expect(floor.solids[cell(column, row)]?.length ?? 0, name).toBeGreaterThan(0);
+    }
+  });
+});
```

- [ ] **Step 2: run it.** `npx vitest run tests/unit/floor.test.ts`. Expected: eight tests
  fail — in the 0011 block the picture with its replaced cells and the two changed counts, in
  the block "lounge and gadgets (0013)" everything but row 18 of Development and the first
  view, which hold on the empty floor too; the tests of 0010 stay green.

- [ ] **Step 3: the pieces and the placements.** Apply to `tools/floor-layout.ts`:

```diff
--- a/tools/floor-layout.ts
+++ b/tools/floor-layout.ts
@@ -1,16 +1,29 @@
 import { EMPTY, type Point, TILE_SIZE } from '../src/engine/tiled.ts';
 import {
+  ARCADE,
+  ARCADE_TOP,
+  ARMCHAIR,
+  BEANBAG,
   CABINET,
   CABINET_TOP,
   CARPET,
   CHAIR,
+  COAT_RACK,
+  COAT_RACK_TOP,
   CORRIDOR,
   CORRIDOR_WALLS,
   COUNTER,
+  COUNTER_COFFEE,
   DESK,
+  DESK_CUBE,
+  DESK_DUCK,
+  DESK_LAVA_LAMP,
   DESK_MONITOR,
   DESK_MONITOR_PARTITION,
   DESK_PARTITION,
+  DESK_ROBOT,
   DOOR_CLOSED,
+  FOOSBALL_LEFT,
+  FOOSBALL_RIGHT,
   OUTER_WALL,
   PARTITION_CORNER,
@@ -22,4 +35,7 @@ import {
   SCREEN,
   SCREEN_SIDE,
+  SIDE_TABLE,
+  SOFA_LEFT,
+  SOFA_RIGHT,
   TABLE,
   WALL_CORNER,
@@ -27,4 +43,6 @@ import {
   WALL_POST,
   WALL_TOP,
+  WATER_DISPENSER,
+  WATER_DISPENSER_TOP,
   WINDOW,
 } from './placeholder-tiles.ts';
@@ -35,7 +53,9 @@ import {
  * creatures' points and the wake point. The tables of the feature spec are the layout; this file
  * mirrors them, one entry per row, columns c0–c1 and rows r0–r1 inclusive. Every wall lives on
- * `ground`: a wall tile is its floor with the strip drawn in. The furniture of feature 0011 is
- * placed in pieces from the room table, one tile per cell on `detail`; the tops of the tall
- * things — cabinets and plants — go on `above`, one row higher. Pure — it returns the layers and
+ * `ground`: a wall tile is its floor with the strip drawn in. The furniture of features 0011 and
+ * 0013 is placed in pieces from the room tables, one tile per cell on `detail`; the tops of the
+ * tall things — cabinets, plants, coat racks, water dispensers and the arcade cabinet — go on
+ * `above`, one row higher. A few pieces of 0013 replace a tile of 0011: a coffee machine on a
+ * counter, a gadget on a desk. Pure — it returns the layers and
  * the .tmj object; tools/gen-floor.ts writes the file. Retired when the art pass takes the map over
  * by hand in Tiled (visual.md §5).
@@ -239,18 +259,33 @@ export function buildGround(): number[] {
 }
 
-/** One row of the spec's room table: a piece at its top-left cell (0011). */
+/** The pieces that stand at one cell (x, y), their top-left (0011, 0013). */
+type PieceAt =
+  | 'workplace'
+  | 'cubicle'
+  | 'island'
+  | 'cafe-table'
+  | 'chair'
+  | 'printer'
+  | 'plant'
+  | 'sofa'
+  | 'seating-corner'
+  | 'armchair-pair'
+  | 'beanbag-circle'
+  | 'beanbag'
+  | 'side-table'
+  | 'coffee-corner'
+  | 'coat-rack'
+  | 'water-dispenser'
+  | 'arcade'
+  | 'table-football'
+  | 'coffee-machine'
+  | 'desk-duck'
+  | 'desk-lava-lamp'
+  | 'desk-cube'
+  | 'desk-robot';
+
+/** One row of the spec's room table: a piece at its top-left cell (0011, 0013). */
 export type Placement =
-  | {
-      readonly piece:
-        | 'workplace'
-        | 'cubicle'
-        | 'island'
-        | 'cafe-table'
-        | 'chair'
-        | 'printer'
-        | 'plant';
-      readonly x: number;
-      readonly y: number;
-    }
+  | { readonly piece: PieceAt; readonly x: number; readonly y: number }
   | {
       readonly piece: 'bank' | 'screens-across' | 'screens-down';
@@ -262,9 +297,5 @@ export type Placement =
   | { readonly piece: 'cabinets'; readonly c0: number; readonly c1: number; readonly row: number };
 
-const at = (
-  piece: 'workplace' | 'cubicle' | 'island' | 'cafe-table' | 'chair' | 'printer' | 'plant',
-  x: number,
-  y: number,
-): Placement => ({ piece, x, y });
+const at = (piece: PieceAt, x: number, y: number): Placement => ({ piece, x, y });
 const run = (
   piece: 'bank' | 'screens-across' | 'screens-down',
@@ -301,4 +332,9 @@ export const FURNITURE: readonly {
       cabinets(104, 106, 51),
       at('plant', 80, 50),
+      at('coffee-corner', 104, 26),
+      at('beanbag-circle', 104, 33),
+      at('coat-rack', 80, 35),
+      at('water-dispenser', 80, 42),
+      at('seating-corner', 84, 50),
     ],
   },
@@ -314,4 +350,9 @@ export const FURNITURE: readonly {
       cabinets(105, 106, 78),
       at('printer', 76, 78),
+      at('coat-rack', 81, 60),
+      at('water-dispenser', 104, 60),
+      at('seating-corner', 86, 77),
+      at('beanbag-circle', 60, 77),
+      at('coffee-corner', 52, 78),
     ],
   },
@@ -327,4 +368,19 @@ export const FURNITURE: readonly {
       cabinets(83, 84, 19),
       at('plant', 44, 19),
+      at('beanbag-circle', 62, 1),
+      at('sofa', 70, 19),
+      at('side-table', 72, 19),
+      at('beanbag', 74, 19),
+      at('beanbag', 75, 19),
+      at('coffee-corner', 52, 19),
+      at('coat-rack', 67, 19),
+      at('desk-duck', 48, 3),
+      at('desk-duck', 74, 9),
+      at('desk-lava-lamp', 58, 3),
+      at('desk-lava-lamp', 69, 15),
+      at('desk-cube', 53, 9),
+      at('desk-cube', 79, 3),
+      at('desk-robot', 48, 15),
+      at('desk-robot', 79, 15),
     ],
   },
@@ -341,4 +397,6 @@ export const FURNITURE: readonly {
       cabinets(16, 19, 19),
       at('plant', 1, 18),
+      at('seating-corner', 3, 15),
+      at('coat-rack', 8, 18),
     ],
   },
@@ -355,4 +413,7 @@ export const FURNITURE: readonly {
       cabinets(39, 43, 19),
       at('printer', 43, 7),
+      at('armchair-pair', 39, 14),
+      at('coffee-corner', 27, 19),
+      at('coat-rack', 35, 18),
     ],
   },
@@ -367,4 +428,6 @@ export const FURNITURE: readonly {
       cabinets(2, 7, 37),
       at('plant', 21, 36),
+      at('armchair-pair', 15, 35),
+      at('coat-rack', 20, 28),
     ],
   },
@@ -377,4 +440,6 @@ export const FURNITURE: readonly {
       at('plant', 21, 40),
       at('plant', 21, 50),
+      at('seating-corner', 12, 48),
+      at('coat-rack', 20, 48),
     ],
   },
@@ -388,4 +453,12 @@ export const FURNITURE: readonly {
       at('cafe-table', 41, 42),
       at('plant', 47, 50),
+      at('coffee-machine', 35, 26),
+      at('coffee-machine', 42, 26),
+      at('water-dispenser', 47, 28),
+      at('coat-rack', 30, 35),
+      at('seating-corner', 36, 36),
+      at('beanbag-circle', 37, 47),
+      at('table-football', 31, 48),
+      at('arcade', 44, 49),
     ],
   },
@@ -408,4 +481,9 @@ export const FURNITURE: readonly {
       at('plant', 47, 78),
       at('printer', 27, 78),
+      at('coat-rack', 21, 60),
+      at('seating-corner', 20, 66),
+      at('beanbag-circle', 44, 66),
+      at('beanbag-circle', 25, 74),
+      at('coffee-corner', 12, 78),
     ],
   },
@@ -418,4 +496,6 @@ export const FURNITURE: readonly {
       at('chair', 95, 6),
       at('chair', 98, 6),
+      at('coat-rack', 91, 2),
+      at('coffee-corner', 104, 8),
     ],
   },
@@ -429,17 +509,32 @@ export const FURNITURE: readonly {
       at('chair', 98, 16),
       at('plant', 105, 19),
+      at('coat-rack', 91, 12),
     ],
   },
   {
     area: 'north corridor',
-    placements: [at('printer', 52, 20), at('plant', 34, 25), at('plant', 70, 25)],
+    placements: [
+      at('printer', 52, 20),
+      at('plant', 34, 25),
+      at('plant', 70, 25),
+      at('water-dispenser', 20, 25),
+    ],
   },
   {
     area: 'south corridor',
-    placements: [at('printer', 40, 57), at('plant', 10, 57), at('plant', 90, 57)],
+    placements: [
+      at('printer', 40, 57),
+      at('plant', 10, 57),
+      at('plant', 90, 57),
+      at('sofa', 60, 53),
+      at('side-table', 62, 53),
+      at('water-dispenser', 60, 57),
+    ],
   },
 ];
 
 type Put = (layer: 'detail' | 'above', column: number, row: number, id: number) => void;
+/** Replaces the tile `from` on `detail` by `to`; the cell must hold `from` (0013). */
+type Swap = (column: number, row: number, from: number, to: number) => void;
 
 /** One cubicle (x, y): five cells wide, three high, open to the south. */
@@ -461,7 +556,69 @@ function tall(put: Put, x: number, y: number, body: number, top: number): void {
 }
 
+function sofa(put: Put, x: number, y: number): void {
+  put('detail', x, y, SOFA_LEFT);
+  put('detail', x + 1, y, SOFA_RIGHT);
+}
+
 /** Every cell of a piece, as the spec's "The pieces" defines it. */
-function place(put: Put, placement: Placement): void {
+function place(put: Put, swap: Swap, placement: Placement): void {
   switch (placement.piece) {
+    case 'sofa':
+      sofa(put, placement.x, placement.y);
+      return;
+    case 'seating-corner':
+      sofa(put, placement.x, placement.y);
+      put('detail', placement.x + 2, placement.y, SIDE_TABLE);
+      put('detail', placement.x + 3, placement.y, ARMCHAIR);
+      return;
+    case 'armchair-pair':
+      put('detail', placement.x, placement.y, ARMCHAIR);
+      put('detail', placement.x + 1, placement.y, SIDE_TABLE);
+      put('detail', placement.x + 2, placement.y, ARMCHAIR);
+      return;
+    case 'beanbag-circle':
+      put('detail', placement.x + 1, placement.y, BEANBAG);
+      put('detail', placement.x, placement.y + 1, BEANBAG);
+      put('detail', placement.x + 1, placement.y + 1, SIDE_TABLE);
+      put('detail', placement.x + 2, placement.y + 1, BEANBAG);
+      return;
+    case 'beanbag':
+      put('detail', placement.x, placement.y, BEANBAG);
+      return;
+    case 'side-table':
+      put('detail', placement.x, placement.y, SIDE_TABLE);
+      return;
+    case 'coffee-corner':
+      put('detail', placement.x, placement.y, COUNTER_COFFEE);
+      put('detail', placement.x + 1, placement.y, COUNTER);
+      return;
+    case 'coat-rack':
+      tall(put, placement.x, placement.y, COAT_RACK, COAT_RACK_TOP);
+      return;
+    case 'water-dispenser':
+      tall(put, placement.x, placement.y, WATER_DISPENSER, WATER_DISPENSER_TOP);
+      return;
+    case 'arcade':
+      tall(put, placement.x, placement.y, ARCADE, ARCADE_TOP);
+      return;
+    case 'table-football':
+      put('detail', placement.x, placement.y, FOOSBALL_LEFT);
+      put('detail', placement.x + 1, placement.y, FOOSBALL_RIGHT);
+      return;
+    case 'coffee-machine':
+      swap(placement.x, placement.y, COUNTER, COUNTER_COFFEE);
+      return;
+    case 'desk-duck':
+      swap(placement.x, placement.y, DESK_PARTITION, DESK_DUCK);
+      return;
+    case 'desk-lava-lamp':
+      swap(placement.x, placement.y, DESK_PARTITION, DESK_LAVA_LAMP);
+      return;
+    case 'desk-cube':
+      swap(placement.x, placement.y, DESK_PARTITION, DESK_CUBE);
+      return;
+    case 'desk-robot':
+      swap(placement.x, placement.y, DESK_PARTITION, DESK_ROBOT);
+      return;
     case 'workplace':
       put('detail', placement.x, placement.y, DESK_MONITOR);
@@ -557,7 +714,14 @@ export function buildFurniture(): { readonly detail: number[]; readonly above: n
     layers[layer][at] = id;
   };
+  const swap: Swap = (column, row, from, to) => {
+    const at = index(column, row);
+    if (layers.detail[at] !== from) {
+      throw new Error(`(${column}, ${row}) does not hold tile ${from} to replace`);
+    }
+    layers.detail[at] = to;
+  };
   for (const { placements } of FURNITURE) {
     for (const placement of placements) {
-      place(put, placement);
+      place(put, swap, placement);
     }
   }
```

- [ ] **Step 4: generate and run.** `npm run gen-floor`, `npx biome check --write .`,
  `npm run check`. Expected: green, 544 tests. The generator throws on an overlap or on a
  replacement that does not find its tile; if it does, a coordinate was mistyped — compare
  with the spec's room table. `git diff --stat origin/main -- src/` is empty.

- [ ] **Step 5: look at it.** Start the dev server and look at the reception, the break room's
  lower part and the bottom row of Development in a browser (`CLAUDE.md` §4: nothing is done
  that has not run). This is a look, not the walk: do not go through the acceptance plan.

- [ ] **Step 6: commit** — `Place seating, coffee, water, coat racks and gadgets on the floor`;
  why: an interim state shown to others has to read as an office people spend their day in;
  the placements are the spec's room table, and two kinds of piece replace a tile of 0011.

---

### Task 3: The documents

**Files:** `docs/spec/world.md`, `docs/spec/architecture.md`, `docs/spec/testing.md`,
`README.md`. `docs/spec/visual.md` is not edited (the spec's scope says so).

- [ ] `docs/spec/world.md` §1 — after the paragraph "**The furniture** (feature 0011) …", a
  paragraph in the same style, in words, not coordinates: every room has a coat rack near its
  entrance and somewhere to sit that is not a desk chair — a sofa with a small table and an
  armchair, a pair of armchairs, or beanbags round a small table; Accounting, Development,
  Sales, Support, Marketing and the north meeting room have a coffee machine on a short
  counter; the break room has two machines on its long counter, a water dispenser, a seating
  corner, beanbags, a table football and an arcade cabinet; Sales and Support have a water
  dispenser, and so has each of the two wide corridors; the south corridor has a sofa between
  the lift and the stairwell; eight desks in Development carry a gadget — a duck, a lava lamp,
  a colour cube, a toy robot. The lift, the stairwell, the west and east corridors and the side
  passage stay empty. The tables in `docs/features/0013-lounge-and-gadgets.md` are the
  placement until the art pass.
- [ ] `docs/spec/architecture.md` §7 —
  - the sheet sentence: 256x48, forty-eight tiles in sixteen columns and three rows (features
    0010, 0011 and 0013); the tile with id n sits at column n mod 16, row ⌊n / 16⌋; every id
    kept its value when the sheet grew, and a tile's place on the sheet follows from its id.
  - the id table: eighteen rows, 30–47, with the names of the spec and, in the third column,
    `solid`, low for 30, 31, 35, 42–47; the box and low for 32 (2, 3, 12, 12), 33 (4, 5, 8, 8),
    34 (3, 5, 10, 9), 36 (4, 6, 8, 10), 38 (5, 8, 6, 8); `solid` for 40; — for 37, 39, 41.
  - the paragraph on the furniture tiles: tiles 13–47; and the `.tsj` sentence: `columns` 16,
    `tilecount` 48, a `solid` property on tiles 2, 3, 16–19, 21, 25–27, 30, 31, 35, 40 and
    42–47, a collision `objectgroup` on tiles 4–15, 20, 23, 28, 29, 32–34, 36 and 38, a `low`
    property on every tile but 0–12, 21, 22, 24, 37 and 39–41; the five tops — 22, 24, 37, 39
    and 41 — have no entry.
  - the generator paragraph: the pieces of 0013 beside those of 0011; a replacement swaps a
    named tile of 0011 for another and fails when the cell does not hold it; and, in the list
    of what the unit test proves, the floor against the picture of 0013, that nothing of 0011
    moved but the ten replaced cells, and every cell without a solid box reached.
- [ ] `docs/spec/testing.md` §1, the Unit row, in the row's own style — after "the furnished
  floor against the spec's picture, …": the lounge and the gadgets against the picture of
  0013, their counts and pieces, the ten replaced cells, every cell without a solid box
  reached, row 18 of Development, the seating corner in the first view; after "the light
  across a low box … behind an opaque one": the arcade cabinet and a beanbag of the
  placeholder tileset in the light; after "the furniture tiles pixel by pixel with their boxes
  and `low`": the tiles of 0013 likewise, and ids 0–29 against the sheet of 0011. §2: read the
  rows of INV-6 and INV-7; they stay true as written — if so, §2 is not edited, and the commit
  message says that.
- [ ] `README.md` — the status paragraph, after the sentence on feature 0011: the floor is
  lived in (feature 0013): sofas, armchairs, beanbags, coffee machines, water dispensers, coat
  racks, a table football, an arcade cabinet and a few gadgets on desks.
- [ ] `docs/plan.md` — no change needed; check that M3's paragraph still agrees.
- [ ] `npm run check`; **commit** — `Describe the lounge and the gadgets in the specification`;
  why: the spec is the source of truth, and the tileset's ids are what maps depend on.

---

### Task 4: The full check

- [ ] `npm run check`, then the smoke spec as "Global constraints" says for port 5173.
- [ ] Build and run the container as `docs/spec/ops.md` §3 says, then
  `BASE_URL=http://localhost:<port> npm run test:e2e` — all nine tests green.
- [ ] `git diff --stat origin/main -- src/` is empty.
- [ ] Report failures as failures. Nothing is committed in this task unless something was
  fixed.

---

### Task 5: The acceptance walk

`CLAUDE.md` §3.4 and `docs/spec/testing.md` §5. Start `npm run dev`, state the preconditions
of the spec's acceptance plan in one message — if port 5173 is taken, say which port the dev
server took and that step 1's URL uses it — and wait for the author. Then one action step with
its expected step per message, 1–16, in the spec's words; record each answer as given. A
`fail` ends the walk: fix on the branch or ask, rerun Task 4, start again at step 1. After
step 16 the feel questions, one per message. Then write the `Result` line — `passed
YYYY-MM-DD, steps 1–16`, followed by the feel notes — and commit it: `Record the acceptance
walk of 0013`.

The feel answers may ask for other colours or places. A change of a colour, a pixel or a
coordinate changes the spec's tables first, with the author, then the code and the fixture
`floor-lounge.txt`, and the walk starts again — not a quiet change on the branch after a
passed walk.

---

### Task 6: The pull request

`CLAUDE.md` §3.5. Merge `main` into the branch; rerun Task 4; if the merge changed code, run
Task 5 again. Set `Status: implemented` with the date in the spec and in the table of
`docs/features/README.md` and commit that on the branch — the status travels with the pull
request. Open the pull request against `main`: title `Feature 0013: lounge and gadgets`; the
description says what was built, quotes the `Result` line, states that `src/` is unchanged,
and ends with the attribution line the session's reminder names. Bind it with the app's PR
tools and read CI; CI must be green. The author merges.

## Self-review against the spec

- Scope "In": eighteen tiles, ids 30–47, 256x48 → T1; the pieces, the placement table and the
  regenerated floor, `detail` and `above` only → T2; the documents → T3. Scope "Out": nothing
  here can be used, nothing is animated, no kitchen, nothing on a wall, no 3D printer, no
  change under `src/`, nothing in the lift, the stairwell, the west and east corridors or the
  side passage — the 0011 test for the empty areas runs unchanged.
- Behaviour "The tiles" → T1, table and tests. "The pieces", "The rooms", the counts, "What
  stays true", "The first view", the picture → T2.
- Acceptance criteria: 1 → T2 first view, walk 1–2; 2 → T2 picture, counts and the ten
  replaced cells, walk 5–8, 11–16; 3 → T1 boxes, walk 3–4, 9–10; 4 → T2 tops, walk 3–4, 9–10;
  5 → T1 `creature.test.ts`, T2 opaque; 6 → T2 the flood over 6198 cells and the cubicles of
  0011; 7 → T4 and every commit; 8 → the tests of 0010 and 0011, which keep running; 9 → T6.
- Test plan: `gen-tiles.test.ts` → T1; `assets.test.ts` unchanged → T1 step 4;
  `floor.test.ts` → T2; `creature.test.ts` with `arcade.tmj` → T1; `tests/arch/` unchanged;
  smoke unchanged → T4.

## Decisions by the planning session

Readings the spec leaves to the implementation, decided on 2026-11-13 so that the work does
not stop. The spec names colours; the plan names pixels.

1. **The pixels of every tile** are the table in Task 1.
2. **Replacements are pieces of their own** (`coffee-machine`, `desk-duck`, …) carried out by
   `swap`, so the room table of 0011 stays as it is and the overlap check stays strict.
3. **The beanbags and the lone side-tables of Development and the south corridor** are the
   pieces `beanbag` and `side-table`; the spec lists them as single tiles beside the sofa.
4. **The side-table's edge is a rim and a front edge,** because its top has the corridor's
   base colour. Within the spec's words; the author sees it in walk step 2 and 16.
5. **`arcade.tmj` uses the placeholder tileset by relative path** and puts the spawn at
   (160, 160), away from both things; the two sight lines are those of the test's comment.
6. **"The pixels of ids 0–29 are those of 0011" is tested against a committed copy of 0011's
   sheet,** `tests/fixtures/tiles/placeholder-0011.png` — a snapshot of a shipped asset, not
   the output of the code under test.
7. **The 0011 test block is edited where 0013 changes what it counted:** the picture test
   allows the ten replaced cells, two counts and the tops' rule are updated; its other tests
   run unchanged.
8. **The reach test counts 6198 cells:** every cell of a room or corridor, without the lift
   and the stairwell, whose `solids` entry is empty. Cells with a wall strip are left out —
   the probe point of a cell with a left strip lies in the strip.
9. **`visual.md` §3 still says "a cabinet or a plant"** for tall things. The spec says the file
   is unchanged, so it is; see "Questions for the author", 2.

## Questions for the author

Neither blocks Task 1; both are one sentence in a document.

1. **The spec's sheet sentence contradicts itself in half a clause:** "the sheet becomes
   256x48, sixteen columns, three rows, so ids 0–29 keep their place". With sixteen columns
   every id keeps its *value*, which is all a map depends on, but the tiles 15–29 move on the
   sheet. The plan follows the numbers — 256x48, sixteen columns. Proposed wording for the
   spec: "… three rows; every id keeps its value". The alternative that keeps the pixels in
   place is 240x64, fifteen columns and four rows, with twelve empty cells.
2. **`visual.md` §3 names "a cabinet or a plant" as the tall things;** after this feature
   there are five kinds. The spec says `visual.md` is unchanged. Proposed: change the clause
   to "a cabinet, a plant, a coat rack, a water dispenser or the arcade cabinet" in T3.
