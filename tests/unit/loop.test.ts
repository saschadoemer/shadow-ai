import { describe, expect, it } from 'vitest';
import { advance, type FrameCallback, runLoop, STEP_MS } from '../../src/engine/loop';

/** Steps per frame for a run of frame times, each frame carrying the remainder of the last. */
function stepsPerFrame(frameTimes: readonly number[]): number[] {
  let accumulator = 0;
  return frameTimes.map((elapsed) => {
    const result = advance(accumulator, elapsed);
    accumulator = result.accumulator;
    return result.steps;
  });
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe('advance: the fixed 60 Hz step (INV-3)', () => {
  it('has a step of 1/60 s', () => {
    expect(STEP_MS).toBeCloseTo(16.6667, 4);
  });

  it('turns 16.7 ms into one step', () => {
    expect(advance(0, 16.7)).toStrictEqual({ steps: 1, accumulator: 0 });
  });

  it('turns 100 ms into five steps and drops the rest', () => {
    expect(advance(0, 100)).toStrictEqual({ steps: 5, accumulator: 0 });
  });

  it('keeps a carried remainder when it caps a stall', () => {
    const result = advance(0.48, 100);
    expect(result.steps).toBe(5);
    expect(result.accumulator).toBeCloseTo(0.48, 9);
  });

  it('turns 8 ms into no step and carries the remainder to the next frame', () => {
    const first = advance(0, 8);
    expect(first.steps).toBe(0);
    expect(first.accumulator).toBeCloseTo(8 / STEP_MS, 9);
    // 8.7 ms alone is not a step; with the carried 8 ms it is.
    expect(advance(0, 8.7).steps).toBe(0);
    expect(advance(first.accumulator, 8.7).steps).toBe(1);
  });

  it('counts a negative frame time as zero', () => {
    expect(advance(0.5, -3)).toStrictEqual({ steps: 0, accumulator: 0.5 });
  });
});

describe('advance: snapping frame times near ½, 1 and 2 steps', () => {
  it('gives exactly one step per frame for 1,000 frames alternating 16.5 and 16.8 ms', () => {
    const frames = Array.from({ length: 1000 }, (_, i) => (i % 2 === 0 ? 16.5 : 16.8));
    const steps = stepsPerFrame(frames);
    expect(sum(steps)).toBe(1000);
    expect(new Set(steps)).toStrictEqual(new Set([1]));
  });

  it('gives exactly 1,000 steps for 2,000 frames of 8.4 ms, one every second frame', () => {
    const steps = stepsPerFrame(Array.from({ length: 2000 }, () => 8.4));
    expect(sum(steps)).toBe(1000);
    expect(steps.slice(0, 6)).toStrictEqual([0, 1, 0, 1, 0, 1]);
  });

  it('turns 33.5 ms into exactly two steps', () => {
    expect(advance(0, 33.5)).toStrictEqual({ steps: 2, accumulator: 0 });
  });

  it('snaps within 0.25 ms of a step and not beyond', () => {
    expect(advance(0, STEP_MS + 0.24)).toStrictEqual({ steps: 1, accumulator: 0 });
    expect(advance(0, STEP_MS - 0.24)).toStrictEqual({ steps: 1, accumulator: 0 });
    expect(advance(0, STEP_MS + 0.26).accumulator).toBeGreaterThan(0);
    expect(advance(0, STEP_MS - 0.26).steps).toBe(0);
  });

  it('does not snap 17 ms, 0.33 ms off a step: sixty frames give 61 steps', () => {
    const first = advance(0, 17);
    expect(first.steps).toBe(1);
    expect(first.accumulator).toBeCloseTo(0.02, 9);
    expect(sum(stepsPerFrame(Array.from({ length: 60 }, () => 17)))).toBe(61);
  });
});

/** A frame scheduler driven by hand: the test decides when a frame happens and at what time. */
function fakeFrames() {
  let pending: FrameCallback | undefined;
  return {
    request(callback: FrameCallback): void {
      pending = callback;
    },
    fire(timestamp: number): void {
      const callback = pending;
      pending = undefined;
      if (callback === undefined) {
        throw new Error('no frame was requested');
      }
      callback(timestamp);
    },
  };
}

function startCounting() {
  const frames = fakeFrames();
  const rendered: number[] = [];
  runLoop(0, { update: (n: number) => n + 1, render: (n) => rendered.push(n) }, frames.request);
  return { frames, rendered };
}

describe('runLoop with a fake clock (INV-3)', () => {
  it('renders the initial state on the first frame and advances nothing', () => {
    const { frames, rendered } = startCounting();
    frames.fire(5000);
    expect(rendered).toStrictEqual([0]);
  });

  it('renders once per frame and advances one step per 60 Hz frame', () => {
    const { frames, rendered } = startCounting();
    for (let i = 0; i <= 60; i += 1) {
      frames.fire(1000 + i * STEP_MS);
    }
    expect(rendered).toHaveLength(61);
    expect(rendered.at(-1)).toBe(60);
  });

  it('advances at most five steps after a ten-second background tab', () => {
    const { frames, rendered } = startCounting();
    frames.fire(1000);
    frames.fire(1000 + STEP_MS);
    frames.fire(11_000 + STEP_MS);
    expect(rendered).toStrictEqual([0, 1, 6]);
  });

  it('requests the next frame after every frame', () => {
    const { frames } = startCounting();
    frames.fire(0);
    frames.fire(10);
    expect(() => frames.fire(20)).not.toThrow();
  });
});
