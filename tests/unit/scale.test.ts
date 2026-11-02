import { describe, expect, it } from 'vitest';
import { computeLayout } from '../../src/render/scale';

describe('computeLayout: the largest whole factor in device pixels (visual.md §2)', () => {
  it.each([
    // page area in CSS px, device pixel ratio, factor, canvas size in device px
    [1920, 1080, 1, 6, 1920, 1080],
    [1920, 1080, 2, 12, 3840, 2160],
    [1280, 720, 1, 4, 1280, 720],
    [1280, 720, 2, 8, 2560, 1440],
    [1536, 864, 1.25, 6, 1920, 1080],
  ])(
    'fills %ix%i at ratio %f exactly with factor %i',
    (width, height, ratio, factor, deviceWidth, deviceHeight) => {
      expect(computeLayout(width, height, ratio)).toStrictEqual({
        factor,
        width: deviceWidth,
        height: deviceHeight,
        left: 0,
        top: 0,
        cssWidth: width,
        cssHeight: height,
        cssLeft: 0,
        cssTop: 0,
      });
    },
  );

  it('centres 960x540 in a 1000x600 page area at ratio 1, factor 3', () => {
    expect(computeLayout(1000, 600, 1)).toStrictEqual({
      factor: 3,
      width: 960,
      height: 540,
      left: 20,
      top: 30,
      cssWidth: 960,
      cssHeight: 540,
      cssLeft: 20,
      cssTop: 30,
    });
  });

  it('shows the same 960x540 on screen at ratio 2, with factor 6', () => {
    expect(computeLayout(1000, 600, 2)).toStrictEqual({
      factor: 6,
      width: 1920,
      height: 1080,
      left: 40,
      top: 60,
      cssWidth: 960,
      cssHeight: 540,
      cssLeft: 20,
      cssTop: 30,
    });
  });

  it('fits only factor 5 in a maximized window on a 1920x1080 screen, about 1920x970 of page', () => {
    const layout = computeLayout(1920, 970, 1);
    expect(layout.factor).toBe(5);
    expect([layout.width, layout.height, layout.left, layout.top]).toStrictEqual([
      1600, 900, 160, 35,
    ]);
  });

  it('keeps factor 1 for a page area smaller than the surface, centred and cropped', () => {
    const layout = computeLayout(300, 150, 1);
    expect(layout.factor).toBe(1);
    expect([layout.width, layout.height, layout.left, layout.top]).toStrictEqual([
      320, 180, -10, -15,
    ]);
  });

  it('keeps factor 1 for an empty page area', () => {
    expect(computeLayout(0, 0, 1).factor).toBe(1);
  });

  it('places the canvas on whole device pixels for an odd remainder and a fractional ratio', () => {
    for (const [width, height, ratio] of [
      [1001, 601, 1],
      [1163, 727, 2.2],
      [1067, 601, 1.5],
    ] as const) {
      const layout = computeLayout(width, height, ratio);
      for (const value of [layout.width, layout.height, layout.left, layout.top]) {
        expect(Number.isInteger(value), `${width}x${height} at ${ratio}: ${value}`).toBe(true);
      }
      expect(layout.width).toBe(320 * layout.factor);
      expect(layout.height).toBe(180 * layout.factor);
      expect(layout.width).toBeLessThanOrEqual(width * ratio);
      expect(layout.height).toBeLessThanOrEqual(height * ratio);
    }
  });

  it('gives the CSS box as the device box divided by the ratio', () => {
    const layout = computeLayout(1067, 601, 1.5);
    expect(layout.factor).toBe(5);
    expect(layout.cssWidth).toBeCloseTo(1600 / 1.5, 9);
    expect(layout.cssLeft).toBeCloseTo(layout.left / 1.5, 9);
  });
});
