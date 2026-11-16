/**
 * The world data (world.md §1, gameplay.md §5, feature 0014): the regions of the floor with
 * their shadow density, the lamp's strength and the upgrades that raise it. One rule gates the
 * world — density against strength — and `gatingFaults` checks that the data obeys it: no
 * region requires an upgrade that cannot be earned before it (INV-7). Content, not state: pure
 * data and one pure function. Management, the server room and the third upgrade join the
 * tables with their maps (M6, M7).
 */

export interface Region {
  readonly id: string;
  /** Shadow density, a whole number from 0 to MAX_DENSITY; 0 is a region without shadow. */
  readonly density: number;
}

export interface Upgrade {
  readonly id: string;
  /** The id of the region whose case earns it. */
  readonly earnedIn: string;
}

/** The lamp's strength before any upgrade. */
export const BASE_STRENGTH = 1;
/** The densest shadow there is: the wall sheet has three looks. */
export const MAX_DENSITY = 3;

export const REGIONS: readonly Region[] = [
  { id: 'reception', density: 0 },
  { id: 'break-room', density: 0 },
  { id: 'sales', density: 1 },
  { id: 'marketing', density: 1 },
  { id: 'support', density: 1 },
  { id: 'meeting-rooms', density: 1 },
  { id: 'hr', density: 2 },
  { id: 'accounting', density: 2 },
  { id: 'development', density: 3 },
];

/** In the order they are earned: each raises the lamp's strength by 1. */
export const UPGRADES: readonly Upgrade[] = [
  { id: 'wide-cone', earnedIn: 'marketing' },
  { id: 'filter', earnedIn: 'hr' },
];

/** The lamp's strength with the first `earned` upgrades. */
export function strengthAfter(earned: number): number {
  return BASE_STRENGTH + earned;
}

/** The density of the region with this id, or undefined when the id names none. */
export function densityOf(id: string, regions: readonly Region[] = REGIONS): number | undefined {
  return regions.find((region) => region.id === id)?.density;
}

/**
 * What is wrong with the gating order, one message per fault; empty when the data is
 * consistent. Regions first, in table order: a density that is no whole number from 0 to
 * MAX_DENSITY, or one above the strength of a lamp with every upgrade. Then the upgrades, in
 * the order they are earned: one earned in no region of the table, or in a region denser than
 * the lamp is before it.
 */
export function gatingFaults(regions: readonly Region[], upgrades: readonly Upgrade[]): string[] {
  const faults: string[] = [];
  const reach = strengthAfter(upgrades.length);
  for (const { id, density } of regions) {
    if (!Number.isInteger(density) || density < 0 || density > MAX_DENSITY) {
      faults.push(`region ${id} has density ${density}, 0 to ${MAX_DENSITY} are allowed`);
    } else if (density > reach) {
      faults.push(`region ${id} has density ${density}, the lamp reaches ${reach}`);
    }
  }
  upgrades.forEach((upgrade, earnedBefore) => {
    const density = densityOf(upgrade.earnedIn, regions);
    const strength = strengthAfter(earnedBefore);
    if (density === undefined) {
      faults.push(`upgrade ${upgrade.id} is earned in ${upgrade.earnedIn}, which is no region`);
    } else if (density > strength) {
      faults.push(
        `upgrade ${upgrade.id} is earned in ${upgrade.earnedIn}, density ${density}, with a lamp of strength ${strength}`,
      );
    }
  });
  return faults;
}
