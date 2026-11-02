/**
 * The fixed-step loop (INV-3, architecture.md §3): logic advances in steps of exactly 1/60 s,
 * rendering happens once per browser frame, and after a stall at most five steps are caught up.
 *
 * The accumulator counts steps, not milliseconds. In milliseconds floating point loses a step:
 * 5 × (1000 / 60) minus 1000 / 60 five times leaves 16.66666666666666, so only four would run.
 */

export const STEP_MS = 1000 / 60;
export const MAX_CATCH_UP_STEPS = 5;
export const SNAP_TOLERANCE_MS = 0.25;

/**
 * Frame times this close to half a step, one step or two steps count as exactly that. On a
 * 60 Hz or 120 Hz display the remainder would otherwise sit on the threshold, and clock jitter
 * would give none and then two steps in a row — visible stutter.
 */
const SNAP_TARGETS_IN_STEPS = [0.5, 1, 2] as const;

export interface Advance {
  /** Logic steps to run this frame, 0 to MAX_CATCH_UP_STEPS. */
  readonly steps: number;
  /** The remainder carried to the next frame, in steps: at least 0, below 1. */
  readonly accumulator: number;
}

function frameTimeInSteps(elapsedMs: number): number {
  for (const target of SNAP_TARGETS_IN_STEPS) {
    if (Math.abs(elapsedMs - target * STEP_MS) <= SNAP_TOLERANCE_MS) {
      return target;
    }
  }
  return Math.max(0, elapsedMs) / STEP_MS;
}

/** How many steps a frame of `elapsedMs` runs, given the remainder carried from the last. */
export function advance(accumulator: number, elapsedMs: number): Advance {
  const total = accumulator + Math.min(frameTimeInSteps(elapsedMs), MAX_CATCH_UP_STEPS);
  const steps = Math.floor(total);
  return { steps, accumulator: total - steps };
}

export type FrameCallback = (timestampMs: number) => void;

/** Schedules the callback for the next frame — `requestAnimationFrame` in the browser. */
export type RequestFrame = (callback: FrameCallback) => void;

export interface LoopCallbacks<S> {
  update(state: S): S;
  render(state: S): void;
}

/** Runs the loop forever: each frame advances the state by whole steps, then renders it once. */
export function runLoop<S>(
  initial: S,
  callbacks: LoopCallbacks<S>,
  requestFrame: RequestFrame,
): void {
  let state = initial;
  let accumulator = 0;
  let previous: number | undefined;

  const frame: FrameCallback = (timestamp) => {
    const result = advance(accumulator, previous === undefined ? 0 : timestamp - previous);
    previous = timestamp;
    accumulator = result.accumulator;
    for (let i = 0; i < result.steps; i += 1) {
      state = callbacks.update(state);
    }
    callbacks.render(state);
    requestFrame(frame);
  };

  requestFrame(frame);
}
