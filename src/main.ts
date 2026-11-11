import { loadImage, loadJson, resolvePath } from './engine/assets';
import { type Bindings, createKeyboard, listenToKeyboard, resolveActions } from './engine/input';
import { runLoop } from './engine/loop';
import { parseTileMap, parseTileset, tilesetSource } from './engine/tiled';
import type { GameInput } from './game/player';
import type { GameState } from './game/state';
import { createInitialState, update } from './game/update';
import { createCanvas2dRenderer } from './render/canvas2d/canvas2d-renderer';
import { drawScene, type SceneContent } from './render/draw-scene';
import { computeLayout } from './render/scale';

declare global {
  interface Window {
    /**
     * The game's one global (0004): the state passed to the last render, so that the smoke test
     * can read the player's position. Read-only by convention; absent until the content loaded.
     */
    shadowAi?: { state: GameState };
  }
}

const MAP_URL = '/maps/campus.tmj';
const PLAYER_SHEET_URL = '/sprites/player.png';

/**
 * The map, its tileset and the tileset's image, each resolved against the file naming it, then
 * the player's sprite sheet.
 */
async function loadContent(): Promise<SceneContent> {
  const mapJson = await loadJson(MAP_URL);
  const tilesetUrl = resolvePath(tilesetSource(mapJson, MAP_URL), MAP_URL);
  const tileset = parseTileset(await loadJson(tilesetUrl), tilesetUrl);
  const map = parseTileMap(mapJson, tileset, MAP_URL);
  const image = await loadImage(resolvePath(tileset.image, tilesetUrl));
  return {
    map,
    tileset: { image, columns: tileset.columns },
    playerSheet: { image: await loadImage(PLAYER_SHEET_URL) },
  };
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

type Action = keyof GameInput | 'fullscreen';

/** architecture.md §4: the one table from physical keys to actions. */
const BINDINGS: Bindings<Action> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  lamp: ['Space'],
  fullscreen: ['KeyF'],
};
const BOUND_CODES: ReadonlySet<string> = new Set(Object.values(BINDINGS).flat());

const keyboard = createKeyboard();
listenToKeyboard(keyboard, window);

// A bound key without Ctrl, Alt or Cmd belongs to the game: its default is prevented, so the
// arrows never scroll the page and Space neither scrolls nor clicks a focused control; with a
// modifier the browser keeps its own shortcut. F toggles fullscreen once per press here and
// never reaches the game.
window.addEventListener('keydown', (event) => {
  if (!BOUND_CODES.has(event.code) || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  event.preventDefault();
  if (BINDINGS.fullscreen.includes(event.code) && !event.repeat) {
    toggleFullscreen();
  }
});

/** The game's actions of this frame; `fullscreen` stays in main.ts. */
function readInput(): GameInput {
  const { up, down, left, right, lamp } = resolveActions(keyboard.held, BINDINGS);
  return { up, down, left, right, lamp };
}

/** Loading finishes before the first frame; until then the page shows its background. */
async function start(): Promise<void> {
  const renderer = createCanvas2dRenderer(findCanvas());
  const content = await loadContent();
  const handle = { state: createInitialState(content.map) };
  window.shadowAi = handle;
  runLoop(
    handle.state,
    {
      readInput,
      update: (state, input) => update(state, input, content.map),
      render(state) {
        handle.state = state;
        drawScene(renderer, state, content);
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
