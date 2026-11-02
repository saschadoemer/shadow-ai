import { SURFACE_HEIGHT, SURFACE_WIDTH } from './renderer';

/** Where and how large the visible canvas is, in device pixels and in CSS pixels. */
export interface Layout {
  /** Device pixels per game pixel, a whole number of at least 1. */
  readonly factor: number;
  /** The visible canvas's backing store, in device pixels. */
  readonly width: number;
  readonly height: number;
  /** Its top-left corner from the page's top-left, in whole device pixels. */
  readonly left: number;
  readonly top: number;
  /** The same box in CSS pixels, for the canvas's style. */
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly cssLeft: number;
  readonly cssTop: number;
}

/**
 * The largest whole factor that fits, counted in device pixels (visual.md §2), so that every game
 * pixel is exactly factor × factor physical pixels whatever the device pixel ratio.
 */
export function computeLayout(
  viewportWidth: number,
  viewportHeight: number,
  devicePixelRatio: number,
): Layout {
  const deviceWidth = viewportWidth * devicePixelRatio;
  const deviceHeight = viewportHeight * devicePixelRatio;
  const factor = Math.max(
    1,
    Math.floor(Math.min(deviceWidth / SURFACE_WIDTH, deviceHeight / SURFACE_HEIGHT)),
  );
  const width = SURFACE_WIDTH * factor;
  const height = SURFACE_HEIGHT * factor;
  const left = Math.floor((deviceWidth - width) / 2);
  const top = Math.floor((deviceHeight - height) / 2);
  return {
    factor,
    width,
    height,
    left,
    top,
    cssWidth: width / devicePixelRatio,
    cssHeight: height / devicePixelRatio,
    cssLeft: left / devicePixelRatio,
    cssTop: top / devicePixelRatio,
  };
}
