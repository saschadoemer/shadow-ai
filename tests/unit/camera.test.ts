import { describe, expect, it } from 'vitest';
import { cameraFor, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/engine/camera';
import type { Point } from '../../src/engine/tiled';
import { SURFACE_HEIGHT, SURFACE_WIDTH } from '../../src/render/renderer';

/** A 128x96 map, 2048x1536 px; the camera ranges over [0, 1728] × [0, 1356]. */
const LARGE = { width: 2048, height: 1536 };

function at(x: number, y: number, map = LARGE): Point {
  return cameraFor({ x, y }, map);
}

describe('cameraFor on a 128x96 map', () => {
  it('centres the view on the target: (1024, 730) gives (864, 640)', () => {
    expect(at(1024, 730)).toStrictEqual({ x: 864, y: 640 });
  });

  it('clamps at the left, right, top and bottom edges', () => {
    expect(at(100, 730).x).toBe(0);
    expect(at(2000, 730).x).toBe(1728);
    expect(at(1024, 50).y).toBe(0);
    expect(at(1024, 1500).y).toBe(1356);
  });

  it('holds at the corners', () => {
    expect(at(0, 0)).toStrictEqual({ x: 0, y: 0 });
    expect(at(2048, 1536)).toStrictEqual({ x: 1728, y: 1356 });
  });

  it('rounds half up after clamping', () => {
    expect(at(1024.4, 730.5)).toStrictEqual({ x: 864, y: 641 });
    expect(at(1024.6, 730.4)).toStrictEqual({ x: 865, y: 640 });
  });
});

describe('cameraFor on small maps', () => {
  it('is (0, 0) for every target on a map the size of the view', () => {
    const view = { width: 320, height: 180 };
    expect(at(160, 90, view)).toStrictEqual({ x: 0, y: 0 });
    expect(at(10, 10, view)).toStrictEqual({ x: 0, y: 0 });
  });

  it('moves on y only, by at most 12, on the smallest map the loader accepts, 320x192', () => {
    expect(at(300, 191, { width: 320, height: 192 })).toStrictEqual({ x: 0, y: 12 });
  });
});

describe('the view', () => {
  it('is 320x180, and the renderer surface is the same size', () => {
    expect([VIEW_WIDTH, VIEW_HEIGHT]).toStrictEqual([320, 180]);
    expect([SURFACE_WIDTH, SURFACE_HEIGHT]).toStrictEqual([VIEW_WIDTH, VIEW_HEIGHT]);
  });
});
