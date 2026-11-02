import type { PaletteColour } from '../palette';
import { type Renderer, SURFACE_HEIGHT, SURFACE_WIDTH } from '../renderer';
import type { Layout } from '../scale';

/** The Canvas 2D renderer: draws to an offscreen 320x180 surface and blits it scaled. */
export interface SurfaceRenderer extends Renderer {
  /** Sizes and places the visible canvas for the layout, then blits the surface onto it. */
  present(layout: Layout): void;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('Canvas 2D is not available');
  }
  return context;
}

function sameLayout(a: Layout | undefined, b: Layout): boolean {
  return (
    a !== undefined &&
    a.width === b.width &&
    a.height === b.height &&
    a.cssWidth === b.cssWidth &&
    a.cssHeight === b.cssHeight &&
    a.cssLeft === b.cssLeft &&
    a.cssTop === b.cssTop
  );
}

export function createCanvas2dRenderer(visible: HTMLCanvasElement): SurfaceRenderer {
  const surface = document.createElement('canvas');
  surface.width = SURFACE_WIDTH;
  surface.height = SURFACE_HEIGHT;
  const draw = context2d(surface);
  const screen = context2d(visible);
  let applied: Layout | undefined;

  function fill(x: number, y: number, width: number, height: number, colour: PaletteColour): void {
    draw.fillStyle = colour;
    draw.fillRect(x, y, width, height);
  }

  return {
    clear(colour) {
      fill(0, 0, SURFACE_WIDTH, SURFACE_HEIGHT, colour);
    },
    fillRect: fill,
    present(layout) {
      if (!sameLayout(applied, layout)) {
        visible.width = layout.width;
        visible.height = layout.height;
        visible.style.width = `${layout.cssWidth}px`;
        visible.style.height = `${layout.cssHeight}px`;
        visible.style.left = `${layout.cssLeft}px`;
        visible.style.top = `${layout.cssTop}px`;
        applied = layout;
      }
      // Resizing a canvas resets its context, so smoothing is switched off on every blit.
      screen.imageSmoothingEnabled = false;
      screen.drawImage(surface, 0, 0, layout.width, layout.height);
    },
  };
}
