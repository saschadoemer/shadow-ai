import { describe, expect, it } from 'vitest';
import {
  BASE_STRENGTH,
  densityOf,
  gatingFaults,
  MAX_DENSITY,
  REGIONS,
  strengthAfter,
  UPGRADES,
  type Upgrade,
} from '../../src/game/world';

const WIDE_CONE: Upgrade = { id: 'wide-cone', earnedIn: 'marketing' };
const FILTER: Upgrade = { id: 'filter', earnedIn: 'hr' };

describe('the world data (0014)', () => {
  it('gives every region of the floor its density', () => {
    expect(REGIONS).toStrictEqual([
      { id: 'reception', density: 0 },
      { id: 'break-room', density: 0 },
      { id: 'sales', density: 1 },
      { id: 'marketing', density: 1 },
      { id: 'support', density: 1 },
      { id: 'meeting-rooms', density: 1 },
      { id: 'hr', density: 2 },
      { id: 'accounting', density: 2 },
      { id: 'development', density: 3 },
    ]);
  });

  it('lists the two upgrades in the order they are earned, each with its region', () => {
    expect(UPGRADES).toStrictEqual([WIDE_CONE, FILTER]);
  });

  it('starts the lamp at strength 1 and raises it by 1 with every upgrade', () => {
    expect([BASE_STRENGTH, MAX_DENSITY]).toStrictEqual([1, 3]);
    expect([0, 1, 2].map(strengthAfter)).toStrictEqual([1, 2, 3]);
  });

  it('looks a density up by the region id, and knows no other id', () => {
    expect(densityOf('hr')).toBe(2);
    expect(densityOf('reception')).toBe(0);
    expect(densityOf('cellar')).toBeUndefined();
  });
});

describe('gatingFaults: no region needs an upgrade that cannot be earned before it (INV-7)', () => {
  it('finds no fault in the world data', () => {
    expect(gatingFaults(REGIONS, UPGRADES)).toStrictEqual([]);
  });

  it('reports a density that is no whole number from 0 to 3', () => {
    expect(gatingFaults([{ id: 'hr', density: 2.5 }], [])).toStrictEqual([
      'region hr has density 2.5, 0 to 3 are allowed',
    ]);
    expect(gatingFaults([{ id: 'hr', density: 4 }], [])).toStrictEqual([
      'region hr has density 4, 0 to 3 are allowed',
    ]);
    expect(gatingFaults([{ id: 'hr', density: -1 }], [])).toStrictEqual([
      'region hr has density -1, 0 to 3 are allowed',
    ]);
  });

  it('reports a density the lamp never reaches', () => {
    expect(gatingFaults(REGIONS, [WIDE_CONE])).toStrictEqual([
      'region development has density 3, the lamp reaches 2',
    ]);
  });

  it('reports an upgrade earned in no region of the table', () => {
    expect(gatingFaults(REGIONS, [{ id: 'wide-cone', earnedIn: 'cellar' }, FILTER])).toStrictEqual([
      'upgrade wide-cone is earned in cellar, which is no region',
    ]);
  });

  it('reports an upgrade earned behind a wall the lamp cannot lift yet', () => {
    expect(gatingFaults(REGIONS, [{ id: 'wide-cone', earnedIn: 'hr' }, FILTER])).toStrictEqual([
      'upgrade wide-cone is earned in hr, density 2, with a lamp of strength 1',
    ]);
  });

  it('reports every fault, regions first, then upgrades', () => {
    expect(
      gatingFaults(
        [
          { id: 'sales', density: 1 },
          { id: 'hr', density: 3 },
        ],
        [{ id: 'wide-cone', earnedIn: 'hr' }],
      ),
    ).toStrictEqual([
      'region hr has density 3, the lamp reaches 2',
      'upgrade wide-cone is earned in hr, density 3, with a lamp of strength 1',
    ]);
  });
});
