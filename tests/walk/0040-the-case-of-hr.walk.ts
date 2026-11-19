import { expect, test } from '@playwright/test';
import { blocksOn, REGION_NAME } from '../../src/game/journal';
import { routesOf } from '../../src/game/mover';
import {
  NOTICE_CASE_SOLVED,
  NOTICE_TRACE_FOUND,
  NOTICE_UPGRADE,
  noticeOf,
} from '../../src/game/notice';
import { areasOf, inArea, shadowedAreas } from '../../src/game/region';
import { wallsOf } from '../../src/game/shadow';
import { caseEntries, tracesOf } from '../../src/game/trace';
import { textOf } from '../../src/text/text';
import {
  begin,
  closeJournal,
  closeTalk,
  findTrace,
  floor,
  inView,
  liftWalls,
  linesShown,
  openJournal,
  picture,
  press,
  read,
  solveCase,
  talkTo,
  until,
  walkTo,
} from './bot';

/**
 * The acceptance walk of feature 0040, the case of HR: the steps of the spec's acceptance plan,
 * in its numbering and its words, played by the keys. Every expected step is compared with the
 * game's state and saved as a picture under walk-results/0040/.
 */
const WALK = '0040';

test('0040 — the case of HR: the acceptance plan, steps 1 to 22', async ({ page }) => {
  const map = floor();
  const areas = areasOf(map.rects);
  const hr = areas.filter((area) => area.region === 'hr');
  const walls = wallsOf(map.rects);
  const traces = tracesOf(map.rects);

  await test.step('Preconditions: the card and the call are passed, the case of Marketing is solved', async () => {
    await begin(page);
    const solved = await solveCase(page, 'marketing');
    expect(solved.upgrades).toStrictEqual(['wide-cone']);
  });

  await test.step('1. Walk to the violet strip in the upper wall of the north corridor, lift it and walk in', async () => {
    await liftWalls(page, 'hr');
    await walkTo(page, { x: 11 * 16 + 8, y: 16 * 16 + 8 });
  });

  await test.step('2. Expected: the room is grey under violet lines; a colleague in a yellow shirt walks in it', async () => {
    const state = await read(page);
    expect(hr.some((area) => inArea(area, state.player))).toBe(true);
    // Under its shadow, of density 2: the veil of diagonal lines.
    const shadowed = shadowedAreas(areas, state.solved).filter((area) => area.region === 'hr');
    expect(shadowed.map((area) => area.density)).toStrictEqual([2]);
    const routes = routesOf(map.points);
    const colleague = state.movers.find((mover) => routes[mover.route]?.name === 'person:hr');
    // The fifth person: the yellow shirt of `person-5.png`.
    expect([colleague?.kind, colleague?.look]).toStrictEqual(['person', 4]);
    // The picture is taken with the colleague in it.
    await until(
      page,
      (now) =>
        now.movers.some((mover) => routes[mover.route]?.name === 'person:hr' && inView(now, mover)),
      'the colleague of HR walks into the picture',
      40_000,
    );
    await picture(page, WALK, 2);
  });

  await test.step('3. Walk to the colleague and press E', async () => {
    await talkTo(page, 'person:hr');
  });

  await test.step('4. Expected: the first line is `Zweihundert Bewerbungen auf eine Stelle,`', async () => {
    expect(linesShown(await read(page))[0]).toBe('Zweihundert Bewerbungen auf eine Stelle,');
    await picture(page, WALK, 4);
  });

  await test.step('5. and 6. Press E; hold the lamp on the three screens. Expected: each trace is found, with its line', async () => {
    await closeTalk(page);
    for (const [n, index] of [15, 16, 17].entries()) {
      expect(traces[index]?.region).toBe('hr');
      const found = await findTrace(page, index);
      expect(found.traces[index]?.found).not.toBeNull();
      const line = noticeOf(await read(page));
      expect(line).toBe(NOTICE_TRACE_FOUND);
      expect(textOf(NOTICE_TRACE_FOUND, 'de')).toBe('Spur gefunden. Sie steht im Journal.');
      await picture(page, WALK, 6, ['a', 'b', 'c'][n]);
    }
  });

  await test.step('7. Press J, then the right arrow', async () => {
    await openJournal(page, 'cases');
  });

  await test.step('8. Expected: the tab `Fälle` shows `Personal` and `Spuren: 3 von 3`', async () => {
    const state = await read(page);
    expect(state.journal).toStrictEqual({ tab: 'cases', page: 0 });
    expect(caseEntries(state.traces, traces)).toContainEqual({ region: 'hr', found: 3, all: 3 });
    const name = REGION_NAME.hr;
    expect(name === undefined ? '' : textOf(name, 'de')).toBe('Personal');
    await picture(page, WALK, 8);
  });

  await test.step('9. Press J. Walk to the colleague in the yellow shirt and press E', async () => {
    await closeJournal(page);
    await talkTo(page, 'person:hr');
  });

  await test.step('10. Expected: the first line is `Ein Werkzeug sortiert die Bewerbungen vor.`', async () => {
    expect(linesShown(await read(page))[0]).toBe('Ein Werkzeug sortiert die Bewerbungen vor.');
    await picture(page, WALK, 10);
  });

  await test.step('11. Press E', async () => {
    await press(page, 'KeyE', (state) => state.dialogue?.page === 1, 'E turns to the second page');
  });

  await test.step('12. Expected: the first line is `Wonach es sortiert, weiß ich nicht. Und die`', async () => {
    expect(linesShown(await read(page))[0]).toBe('Wonach es sortiert, weiß ich nicht. Und die');
    await picture(page, WALK, 12);
  });

  const before = await read(page);
  let solvedAt = 0;

  await test.step('13. Press E', async () => {
    const closed = await press(
      page,
      'KeyE',
      (state) => state.dialogue === null,
      'E closes the box',
    );
    solvedAt = closed.solved.find((entry) => entry.region === 'hr')?.at ?? 0;
  });

  await test.step('14. Expected: one heart more, all full; the room in colour; `Der Fall ist gelöst. Sieh ins Journal.`', async () => {
    const state = await read(page);
    expect(state.dialogue).toBeNull();
    expect(state.solved.map((entry) => entry.region)).toContain('hr');
    expect(state.overview.max).toBe(before.overview.max + 1);
    expect(state.overview.current).toBe(state.overview.max);
    expect(shadowedAreas(areas, state.solved).some((area) => area.region === 'hr')).toBe(false);
    expect(noticeOf(state)).toBe(NOTICE_CASE_SOLVED);
    expect(textOf(NOTICE_CASE_SOLVED, 'de')).toBe('Der Fall ist gelöst. Sieh ins Journal.');
    await picture(page, WALK, 14);
  });

  await test.step('15. Wait two seconds', async () => {
    await until(page, (state) => state.tick >= solvedAt + 130, 'two seconds have passed');
  });

  await test.step('16. Expected: the line says `Die Lampe schafft jetzt auch dichten Schatten.`', async () => {
    const state = await read(page);
    expect(state.upgrades).toStrictEqual(['wide-cone', 'filter']);
    expect(state.lamp.strength).toBe(3);
    const line = noticeOf(state);
    expect(line).toBe(NOTICE_UPGRADE.filter);
    expect(line === null ? '' : textOf(line, 'de')).toBe(
      'Die Lampe schafft jetzt auch dichten Schatten.',
    );
    await picture(page, WALK, 16);
  });

  await test.step('17. Press J, then the right arrow twice', async () => {
    await openJournal(page, 'policy');
  });

  await test.step('18. Expected: the tab `Richtlinie` shows a block that begins `Über Menschen entscheidet ein Mensch. Was eine`', async () => {
    const state = await read(page);
    expect(state.journal?.tab).toBe('policy');
    const blocks = blocksOn(state.solved, state.journal?.page ?? 0).map(
      (block) => textOf(block, 'de').split('\n')[0],
    );
    expect(blocks).toContain('Über Menschen entscheidet ein Mensch. Was eine');
    await picture(page, WALK, 18);
  });

  await test.step('19. and 20. Only with all four cases solved: the second page of the policy', async () => {
    const state = await read(page);
    // The plan lets these two steps be skipped when Sales and Support are not solved.
    test.info().annotations.push({
      type: 'steps 19 and 20',
      description:
        state.solved.length === 4
          ? 'played'
          : `skipped, as the plan allows: ${state.solved.length} of four cases are solved`,
    });
  });

  await test.step('21. Press J. Hold the lamp on the next violet strip but one in the upper wall of the north corridor', async () => {
    await closeJournal(page);
    await liftWalls(page, 'development');
  });

  await test.step('22. Expected: the strip gives way after about a second', async () => {
    const state = await read(page);
    const standing = state.shadowWalls.map((wall) => walls[wall.wall]?.region);
    expect(standing).not.toContain('development');
    await picture(page, WALK, 22);
  });
});
