import { loadImage, loadJson, resolvePath } from './engine/assets';
import { runLoop } from './engine/loop';
import { parseTileMap, parseTileset, type TileMap, tilesetSource } from './engine/tiled';
import { createInitialState } from './game/state';
import { update } from './game/update';
import { createCanvas2dRenderer } from './render/canvas2d/canvas2d-renderer';
import { drawMap } from './render/draw-map';
import type { TilesetImage } from './render/renderer';
import { computeLayout } from './render/scale';

const MAP_URL = '/maps/test.tmj';

/** The map, its tileset and the tileset's image, each resolved against the file naming it. */
async function loadContent(): Promise<{ map: TileMap; tileset: TilesetImage }> {
  const mapJson = await loadJson(MAP_URL);
  const tilesetUrl = resolvePath(tilesetSource(mapJson, MAP_URL), MAP_URL);
  const tileset = parseTileset(await loadJson(tilesetUrl), tilesetUrl);
  const map = parseTileMap(mapJson, tileset, MAP_URL);
  const image = await loadImage(resolvePath(tileset.image, tilesetUrl));
  return { map, tileset: { image, columns: tileset.columns } };
}

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

/** Loading finishes before the first frame; until then the page shows its background. */
async function start(): Promise<void> {
  const renderer = createCanvas2dRenderer(findCanvas());
  const content = await loadContent();
  runLoop(
    createInitialState(content.map),
    {
      update,
      render() {
        drawMap(renderer, content.map, content.tileset);
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
}

start().catch((error: unknown) => {
  // A map that does not load stops the game before it starts; the message names the problem.
  console.error(error);
});
