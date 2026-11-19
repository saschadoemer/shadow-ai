import { describe, expect, it } from 'vitest';
import {
  CAPTURE_STEPS,
  HABITS,
  NOTICE_RADIUS,
  noCaptures,
  stepCreature,
  stepCreatures,
} from '../../src/game/creature';
import { ENTRY_TEXT, entriesOf } from '../../src/game/journal';
import {
  type CreatureState,
  type Facing,
  NO_RECOIL,
  type PlayerState,
  SPECIES,
  type Species,
} from '../../src/game/state';
import { textKey } from '../../src/text/text';
import { grassMap } from './grass-map';

/** 20x12 cells of open floor. */
const MAP = grassMap(20, 12, { x: 40, y: 40 });
const at = (species: Species, x: number, y: number): CreatureState => ({
  species,
  x,
  y,
  light: 0,
  home: { x, y },
});
const figure = (x: number, y: number, facing: Facing = 'down'): PlayerState => ({
  x,
  y,
  facing,
  frame: 0,
  frameTimer: 0,
  grace: 0,
  recoil: NO_RECOIL,
});

describe('the lurker, the third species (0038)', () => {
  it('comes after the snippet and the mirage, with a count from the start', () => {
    expect(SPECIES).toStrictEqual(['snippet', 'mirage', 'lurker']);
    expect(noCaptures()).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
  });

  it('has the habits of the snippet on the floor', () => {
    expect(HABITS.lurker).toStrictEqual(HABITS.snippet);
    expect(HABITS.lurker.shy).toBe(false);
  });

  it('steps exactly as a snippet at the same place would, step for step', () => {
    const player = figure(160, 100, 'up');
    let lurker = at('lurker', 200, 100);
    let snippet = at('snippet', 200, 100);
    for (let step = 0; step < 120; step += 1) {
      lurker = stepCreature(lurker, player, false, MAP) ?? lurker;
      snippet = stepCreature(snippet, player, false, MAP) ?? snippet;
      expect({ ...lurker, species: 'snippet' }, `step ${step}`).toStrictEqual(snippet);
    }
    // It came, and stopped 8 px from the feet.
    expect(lurker.x).toBeCloseTo(168, 6);
    // At the notice radius and beyond it rests.
    const far = at('lurker', 160 + NOTICE_RADIUS, 100);
    expect(stepCreature(far, player, false, MAP)).toStrictEqual(far);
  });

  it('freezes in the light and is captured in the 60th lit step: its count grows', () => {
    const player = figure(104, 100, 'down');
    let state = {
      creatures: [at('lurker', 104, 140)] as readonly CreatureState[],
      captured: noCaptures(),
    };
    for (let step = 1; step < CAPTURE_STEPS; step += 1) {
      state = stepCreatures(state.creatures, state.captured, player, true, MAP);
      expect(state.creatures).toStrictEqual([{ ...at('lurker', 104, 140), light: step }]);
    }
    state = stepCreatures(state.creatures, state.captured, player, true, MAP);
    expect(state).toStrictEqual({
      creatures: [],
      captured: { snippet: 0, mirage: 0, lurker: 1 },
    });
    expect(CAPTURE_STEPS).toBe(60);
  });

  it('has its entry in the journal, after the other two', () => {
    expect(ENTRY_TEXT.lurker).toStrictEqual({
      name: textKey('creature.lurker-name'),
      text: textKey('creature.lurker-text'),
    });
    expect(entriesOf({ snippet: 1, mirage: 1, lurker: 1 })).toStrictEqual([...SPECIES]);
    expect(entriesOf({ snippet: 0, mirage: 0, lurker: 2 })).toStrictEqual(['lurker']);
  });
});
