import { loadImage, loadJson, resolvePath } from './engine/assets';
import { type Bindings, createKeyboard, listenToKeyboard, resolveActions } from './engine/input';
import { runLoop } from './engine/loop';
import { FRAME_HEIGHT, FRAME_WIDTH } from './engine/sprite';
import { parseTileMap, parseTileset, TILE_SIZE, tilesetSource } from './engine/tiled';
import { CAST } from './game/cast';
import { CREATURE_SIZE } from './game/creature';
import { CONE_LENGTH, WIDE_FRAME_SIZE } from './game/lamp';
import { MOVER_SIZE } from './game/mover';
import type { GameInput } from './game/player';
import type { GameState } from './game/state';
import { newGame, update } from './game/update';
import { createCanvas2dRenderer } from './render/canvas2d/canvas2d-renderer';
import { drawScene, HEART_SIZE, type SceneContent, type SceneSettings } from './render/draw-scene';
import { GLYPH_HEIGHT, GLYPH_WIDTH } from './render/font';
import { computeLayout } from './render/scale';
import { DEFAULT_LANGUAGE, type Language, nextLanguage } from './text/text';

declare global {
  interface Window {
    /**
     * The game's one global (0004): the state passed to the last render and the language it was
     * drawn in (0019), so that the smoke test can read them. Read-only by convention; absent
     * until the content loaded.
     */
    shadowAi?: { state: GameState; language: Language };
  }
}

const MAP_URL = '/maps/floor.tmj';
const PLAYER_SHEET_URL = '/sprites/player.png';
const LAMP_SHEET_URL = '/sprites/lamp.png';
const LAMP_WIDE_SHEET_URL = '/sprites/lamp-wide.png';
const SNIPPET_SHEET_URL = '/sprites/snippet.png';
const MIRAGE_SHEET_URL = '/sprites/mirage.png';
const OVERVIEW_SHEET_URL = '/sprites/overview.png';
/** The movers' sheets (0015): a person of look n is person-(n + 1).png. */
const PERSON_SHEET_URLS = [
  '/sprites/person-1.png',
  '/sprites/person-2.png',
  '/sprites/person-3.png',
  '/sprites/person-4.png',
];
const DOG_SHEET_URL = '/sprites/dog.png';
const VACUUM_SHEET_URL = '/sprites/vacuum.png';
const DRONE_SHEET_URL = '/sprites/drone.png';
const SHADOW_WALL_SHEET_URL = '/sprites/shadow-wall.png';
const TRACE_SHEET_URL = '/sprites/trace.png';
const VEIL_SHEET_URL = '/sprites/shadow-veil.png';
/** The shadow tileset lies beside the tileset's image, with this before `.png` (0023). */
const SHADOW_SUFFIX = '-shadow';
const FONT_SHEET_URL = '/sprites/font.png';

/**
 * The map, its tileset and the tileset's image, each resolved against the file naming it, then
 * the player's sprite sheet, the lamp's, one sheet per creature species, the overview sheet and
 * the movers' seven sheets (0015), the shadow-wall sheet (0014), the font sheet (0016) and one
 * sheet per figure of the cast (0017).
 */
async function loadContent(): Promise<SceneContent> {
  const mapJson = await loadJson(MAP_URL);
  const tilesetUrl = resolvePath(tilesetSource(mapJson, MAP_URL), MAP_URL);
  const tileset = parseTileset(await loadJson(tilesetUrl), tilesetUrl);
  const map = parseTileMap(mapJson, tileset, MAP_URL);
  const image = await loadImage(resolvePath(tileset.image, tilesetUrl));
  const shadowImage = await loadImage(
    resolvePath(tileset.image.replace(/\.png$/, `${SHADOW_SUFFIX}.png`), tilesetUrl),
  );
  return {
    map,
    tileset: { image, columns: tileset.columns },
    shadowTileset: { image: shadowImage, columns: tileset.columns },
    veilSheet: {
      image: await loadImage(VEIL_SHEET_URL),
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    },
    playerSheet: {
      image: await loadImage(PLAYER_SHEET_URL),
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    },
    lampSheet: {
      image: await loadImage(LAMP_SHEET_URL),
      frameWidth: CONE_LENGTH,
      frameHeight: CONE_LENGTH,
    },
    lampWideSheet: {
      image: await loadImage(LAMP_WIDE_SHEET_URL),
      frameWidth: WIDE_FRAME_SIZE,
      frameHeight: WIDE_FRAME_SIZE,
    },
    creatureSheets: {
      snippet: {
        image: await loadImage(SNIPPET_SHEET_URL),
        frameWidth: CREATURE_SIZE,
        frameHeight: CREATURE_SIZE,
      },
      mirage: {
        image: await loadImage(MIRAGE_SHEET_URL),
        frameWidth: CREATURE_SIZE,
        frameHeight: CREATURE_SIZE,
      },
    },
    overviewSheet: {
      image: await loadImage(OVERVIEW_SHEET_URL),
      frameWidth: HEART_SIZE,
      frameHeight: HEART_SIZE,
    },
    shadowWallSheet: {
      image: await loadImage(SHADOW_WALL_SHEET_URL),
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    },
    traceSheet: {
      image: await loadImage(TRACE_SHEET_URL),
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    },
    moverSheets: {
      person: await Promise.all(
        PERSON_SHEET_URLS.map(async (url) => ({
          image: await loadImage(url),
          frameWidth: FRAME_WIDTH,
          frameHeight: FRAME_HEIGHT,
        })),
      ),
      dog: {
        image: await loadImage(DOG_SHEET_URL),
        frameWidth: MOVER_SIZE,
        frameHeight: MOVER_SIZE,
      },
      vacuum: {
        image: await loadImage(VACUUM_SHEET_URL),
        frameWidth: MOVER_SIZE,
        frameHeight: MOVER_SIZE,
      },
      drone: {
        image: await loadImage(DRONE_SHEET_URL),
        frameWidth: MOVER_SIZE,
        frameHeight: MOVER_SIZE,
      },
    },
    fontSheet: {
      image: await loadImage(FONT_SHEET_URL),
      frameWidth: GLYPH_WIDTH,
      frameHeight: GLYPH_HEIGHT,
    },
    // A figure of the cast `<id>` has the sheet /sprites/<id>.png (0017).
    figureSheets: Object.fromEntries(
      await Promise.all(
        CAST.map(async ({ id }) => [
          id,
          {
            image: await loadImage(`/sprites/${id}.png`),
            frameWidth: FRAME_WIDTH,
            frameHeight: FRAME_HEIGHT,
          },
        ]),
      ),
    ),
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

/**
 * The player's settings (0019): the language, German on every load, and the tick of its last
 * switch. Not part of the game's state: a saved game does not carry them.
 */
let settings: SceneSettings = { language: DEFAULT_LANGUAGE, switchedAt: null };

/** L goes to the next language. Before the content has loaded there is no tick to note. */
function switchLanguage(): void {
  const handle = window.shadowAi;
  if (handle === undefined) {
    return;
  }
  settings = { language: nextLanguage(settings.language), switchedAt: handle.state.tick };
  document.documentElement.lang = settings.language;
}

type Action = keyof GameInput | 'fullscreen' | 'language';

/** architecture.md §4: the one table from physical keys to actions. */
const BINDINGS: Bindings<Action> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  lamp: ['Space'],
  talk: ['KeyE', 'Enter'],
  journal: ['KeyJ'],
  help: ['KeyH'],
  fullscreen: ['KeyF'],
  language: ['KeyL'],
};
const BOUND_CODES: ReadonlySet<string> = new Set(Object.values(BINDINGS).flat());

const keyboard = createKeyboard();
listenToKeyboard(keyboard, window);

// A bound key without Ctrl, Alt or Cmd belongs to the game: its default is prevented, so the
// arrows never scroll the page and Space neither scrolls nor clicks a focused control; with a
// modifier the browser keeps its own shortcut. F toggles fullscreen and L switches the language,
// each once per press, here: neither reaches the game.
window.addEventListener('keydown', (event) => {
  if (!BOUND_CODES.has(event.code) || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  event.preventDefault();
  if (BINDINGS.fullscreen.includes(event.code) && !event.repeat) {
    toggleFullscreen();
  }
  if (BINDINGS.language.includes(event.code) && !event.repeat) {
    switchLanguage();
  }
});

/** The game's actions of this frame; `fullscreen` and `language` stay in main.ts. */
function readInput(): GameInput {
  const { up, down, left, right, lamp, talk, journal, help } = resolveActions(
    keyboard.held,
    BINDINGS,
  );
  return { up, down, left, right, lamp, talk, journal, help };
}

/** Loading finishes before the first frame; until then the page shows its background. */
async function start(): Promise<void> {
  const renderer = createCanvas2dRenderer(findCanvas());
  const content = await loadContent();
  const handle = { state: newGame(content.map), language: settings.language };
  window.shadowAi = handle;
  runLoop(
    handle.state,
    {
      readInput,
      update: (state, input) => update(state, input, content.map),
      render(state) {
        handle.state = state;
        handle.language = settings.language;
        drawScene(renderer, state, content, settings);
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
