import { runLoop } from './engine/loop';
import { createInitialState } from './game/state';
import { update } from './game/update';
import { createCanvas2dRenderer } from './render/canvas2d/canvas2d-renderer';
import { computeLayout } from './render/scale';
import { drawTestPattern } from './render/test-pattern';

function findCanvas(): HTMLCanvasElement {
  const element = document.getElementById('game');
  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error('index.html has no <canvas id="game">');
  }
  return element;
}

/** F enters and leaves fullscreen; Escape leaves it through the browser itself. */
function toggleFullscreen(): void {
  const request =
    document.fullscreenElement === null
      ? document.documentElement.requestFullscreen()
      : document.exitFullscreen();
  request.catch((error: unknown) => {
    console.warn('Fullscreen request failed', error);
  });
}

// One listener until 0004 brings the action table; then F becomes the action `fullscreen`.
// A held key toggles once, and with Ctrl, Alt or Cmd the browser keeps its own shortcut.
window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyF' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  toggleFullscreen();
});

const renderer = createCanvas2dRenderer(findCanvas());

runLoop(
  createInitialState(),
  {
    update,
    render(state) {
      drawTestPattern(renderer, state);
      // Read every frame: this covers resize, zoom, fullscreen and a move to another monitor.
      renderer.present(
        computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio),
      );
    },
  },
  (callback) => {
    window.requestAnimationFrame(callback);
  },
);
