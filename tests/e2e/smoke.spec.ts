import http from 'node:http';
import https from 'node:https';
import { expect, type Page, test } from '@playwright/test';

/** Set when the spec runs against a served build — the container or the live service. */
const containerUrl = process.env.BASE_URL;

/** ops.md §2, on every response. */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

interface RawResponse {
  readonly status: number;
  readonly headers: http.IncomingHttpHeaders;
  readonly body: string;
}

/**
 * A plain GET that reports headers exactly as sent — nothing decompresses or redirects. The
 * module follows the scheme: the local container speaks HTTP, the live service HTTPS.
 */
function get(url: string, headers: Record<string, string> = {}): Promise<RawResponse> {
  const client = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    client
      .get(url, { headers }, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      })
      .on('error', reject);
  });
}

function container(): string {
  if (containerUrl === undefined) {
    throw new Error('BASE_URL is not set');
  }
  return containerUrl.replace(/\/$/, '');
}

/** The call on its page, as the state holds it (0026). */
const call = (page: number) => ({ speaker: 'story', index: 0, page });

/** Waits until the state has seen E let go, so that the next press is a press. */
async function letGo(page: Page): Promise<void> {
  await page.keyboard.up('KeyE');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.held.talk), {
      message: 'E was let go',
    })
    .toBe(false);
}

/**
 * Loads the game, ends the card with one press of E (0036) and reads the call to its end
 * (0026): three more. The game reads the held keys once per frame, so a key stays down until
 * the state shows what it did, and the next press waits until the state has seen the key let go.
 */
async function start(page: Page): Promise<void> {
  await page.goto('/');
  const presented = () => page.evaluate(() => window.shadowAi?.state.presented);
  await expect.poll(presented, { message: 'the game opens with the card' }).toBeNull();
  await page.keyboard.down('KeyE');
  await expect
    .poll(async () => typeof (await presented()), { message: 'E ends the card' })
    .toBe('number');
  await letGo(page);
  const dialogue = () => page.evaluate(() => window.shadowAi?.state.dialogue);
  await expect
    .poll(dialogue, { message: 'the game opens with the call on its first page' })
    .toStrictEqual(call(0));
  for (const next of [call(1), call(2), null]) {
    await page.keyboard.down('KeyE');
    await expect.poll(dialogue, { message: 'E turns the page of the call' }).toStrictEqual(next);
    await letGo(page);
  }
}

test('the game opens with the call and the lamp, and three presses of E close it', async ({
  page,
}) => {
  await page.goto('/');
  // One poll for the whole value: nothing is read from a page that might still be loading.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const state = window.shadowAi?.state;
          return state === undefined ? undefined : { dialogue: state.dialogue, lamp: state.lamp };
        }),
      { message: 'a new game: the call on page 0, the lamp not yet used' },
    )
    .toStrictEqual({
      dialogue: call(0),
      lamp: { on: false, strength: 1, used: false },
    });
  await start(page);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.dialogue).toBeNull();
  expect(state?.lamp).toStrictEqual({ on: false, strength: 1, used: false });
});

test('the page loads with its title, its canvas and the dark background', async ({ page }) => {
  await start(page);
  await expect(page).toHaveTitle('Shadow AI');
  await expect(page.locator('canvas#game')).toHaveCount(1);
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(24, 20, 37)');
  await expect(page.locator('body')).toHaveText('');
});

test('the map is drawn at the full factor, unclipped', async ({ page }) => {
  await start(page);
  const canvas = page.locator('canvas#game');
  // Desktop Chrome in Playwright: a 1280x720 page area at device pixel ratio 1, so factor 4.
  await expect
    .poll(() => canvas.evaluate((element: HTMLCanvasElement) => [element.width, element.height]))
    .toStrictEqual([1280, 720]);
  expect(await canvas.boundingBox()).toStrictEqual({ x: 0, y: 0, width: 1280, height: 720 });
  // Polled: the first frame waits for the map, the tileset and its image.
  await expect
    .poll(
      () =>
        canvas.evaluate((element: HTMLCanvasElement) =>
          Array.from(element.getContext('2d')?.getImageData(0, 0, 1, 1).data ?? []),
        ),
      {
        message:
          "the top-left pixel is carpet #8b9bb4 at tile (6, 39), the view's corner at the spawn: the map is drawn",
      },
    )
    .toStrictEqual([0x8b, 0x9b, 0xb4, 255]);
});

test('one second of ArrowRight moves the figure and the camera right by at least 70 px', async ({
  page,
}) => {
  await start(page);
  // The handle appears with the first frame; the figure starts at the floor's spawn, x = 256.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.player.x), {
      message: 'window.shadowAi.state.player.x is the spawn: the game runs',
    })
    .toBe(256);
  expect(await page.evaluate(() => window.shadowAi?.state.camera)).toStrictEqual({
    x: 96,
    y: 624,
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1000);
  await page.keyboard.up('ArrowRight');
  const state = await page.evaluate(() => window.shadowAi?.state);
  // 60 steps of 1.333 px are 80; CI may drop a few frames. Row 44 is free to x = 458.
  expect(state?.player.x).toBeGreaterThanOrEqual(256 + 70);
  expect(state?.camera.x).toBeGreaterThanOrEqual(96 + 70);
  expect(state?.player.facing).toBe('right');
});

test('a held Space turns the lamp on and holds the figure, from the first step after the call', async ({
  page,
}) => {
  await start(page);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.player.x), {
      message: 'window.shadowAi.state.player.x is the spawn: the game runs',
    })
    .toBe(256);
  await page.keyboard.down('Space');
  // Nobody hands the lamp over (0039): it shines at the first held key.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.lamp), {
      message: 'Space turns the lamp on',
    })
    .toStrictEqual({ on: true, strength: 1, used: true });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  const held = await page.evaluate(() => window.shadowAi?.state);
  // Nothing moves while the lamp is on; the direction key only turns the figure.
  expect(held?.player.x).toBe(256);
  expect(held?.player.facing).toBe('right');
  expect(held?.lamp.on).toBe(true);
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => window.shadowAi?.state.lamp.on)).toBe(false);
  await page.keyboard.up('ArrowRight');
});

test('the floor starts with three snippets and three mirages, and nothing captured', async ({
  page,
}) => {
  await start(page);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.creatures.length), {
      message: 'window.shadowAi.state.creatures holds the six creatures of the floor',
    })
    .toBe(6);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.creatures[0]).toStrictEqual({
    species: 'snippet',
    x: 1224,
    y: 622,
    light: 0,
    home: { x: 1224, y: 622 },
  });
  expect(state?.creatures.map((creature) => creature.species)).toStrictEqual([
    'snippet',
    'snippet',
    'snippet',
    'mirage',
    'mirage',
    'mirage',
  ]);
  expect(state?.captured).toStrictEqual({ snippet: 0, mirage: 0, lurker: 0 });
});

test('the floor starts with its 22 movers and draws the person of the reception', async ({
  page,
}) => {
  await start(page);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.movers.length), {
      message: 'window.shadowAi.state.movers holds the 22 movers of the floor',
    })
    .toBe(22);
  // The person stands at feet (200, 648) for its first five seconds: its frame's corner is at
  // (96, 0) on the surface, its shirt at (7, 13) in the frame, and the factor is 4.
  const canvas = page.locator('canvas#game');
  await expect
    .poll(
      () =>
        canvas.evaluate((element: HTMLCanvasElement) =>
          Array.from(element.getContext('2d')?.getImageData((96 + 7) * 4, 13 * 4, 1, 1).data ?? []),
        ),
      { message: 'the pixel is the shirt #3e8948 of the person in the reception' },
    )
    .toStrictEqual([0x3e, 0x89, 0x48, 255]);
});

test('the floor starts with its eight shadow walls standing and a lamp of strength 1', async ({
  page,
}) => {
  await start(page);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.shadowWalls.length), {
      message: 'window.shadowAi.state.shadowWalls holds the eight walls of the floor',
    })
    .toBe(8);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.shadowWalls).toStrictEqual(
    Array.from({ length: 8 }, (_, wall) => ({ wall, lit: false, light: 0 })),
  );
  expect(state?.lamp.strength).toBe(1);
});

test('the floor starts with the officer and the intern standing and no dialogue open', async ({
  page,
}) => {
  await start(page);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.figures.length), {
      message: 'window.shadowAi.state.figures holds the two figures of the floor',
    })
    .toBe(2);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.figures).toStrictEqual([
    { figure: 0, facing: 'down' },
    { figure: 1, facing: 'down' },
  ]);
  expect(state?.dialogue).toBeNull();
  expect(state?.held.talk).toBe(false);
});

test('the game starts with full overview and outside the dark', async ({ page }) => {
  await start(page);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.overview), {
      message: 'window.shadowAi.state.overview is five of five',
    })
    .toStrictEqual({ current: 5, max: 5 });
  expect(await page.evaluate(() => window.shadowAi?.state.dark)).toBe(0);
});

test.describe('served by the container', () => {
  test.skip(containerUrl === undefined, 'header checks run against a served build (BASE_URL)');

  test('the page and a 404 carry the four security headers', async () => {
    const page = await get(`${container()}/`);
    expect(page.status).toBe(200);
    const missing = await get(`${container()}/does-not-exist`);
    expect(missing.status).toBe(404);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(page.headers[name], name).toBe(value);
      expect(missing.headers[name], name).toBe(value);
    }
  });

  test('index.html is revalidated, hashed assets are immutable', async () => {
    const page = await get(`${container()}/`);
    expect(page.headers['cache-control']).toBe('no-cache');
    const script = /src="(\/assets\/[^"]+\.js)"/.exec(page.body)?.[1];
    expect(script, 'index.html links a hashed script under /assets/').toBeDefined();
    const asset = await get(`${container()}${script}`);
    expect(asset.status).toBe(200);
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  test('text responses are gzip-compressed when the client accepts it', async () => {
    const page = await get(`${container()}/`, { 'accept-encoding': 'gzip' });
    expect(page.headers['content-encoding']).toBe('gzip');
  });
});

test('L switches the language once per press, and the page says which one is on', async ({
  page,
}) => {
  await start(page);
  const language = () => page.evaluate(() => window.shadowAi?.language);
  const lang = () => page.evaluate(() => document.documentElement.lang);
  await expect
    .poll(language, { message: 'window.shadowAi.language is German after loading' })
    .toBe('de');
  expect(await lang()).toBe('de');
  await page.keyboard.press('KeyL');
  await expect.poll(language, { message: 'one press of L switches to English' }).toBe('en');
  expect(await lang()).toBe('en');
  // A second keydown without a keyup is the repeat of a held key: it switches nothing.
  await page.keyboard.down('KeyL');
  await page.keyboard.down('KeyL');
  await page.keyboard.up('KeyL');
  await expect.poll(language, { message: 'a held L switches once, back to German' }).toBe('de');
  expect(await lang()).toBe('de');
});

test('J opens the journal on the creatures and closes it again', async ({ page }) => {
  await start(page);
  const journal = () => page.evaluate(() => window.shadowAi?.state.journal);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.held.journal), {
      message: 'window.shadowAi.state.held is there: the game runs, and J is not held',
    })
    .toBe(false);
  expect(await journal()).toBeNull();
  // The game reads the held keys once per frame, so a key stays down until the state shows it.
  await page.keyboard.down('KeyJ');
  await expect.poll(journal, { message: 'J opens the journal' }).toStrictEqual({
    tab: 'creatures',
    page: 0,
  });
  await page.keyboard.up('KeyJ');
  await page.keyboard.down('ArrowRight');
  await expect.poll(journal, { message: 'the right arrow turns to the cases' }).toStrictEqual({
    tab: 'cases',
    page: 0,
  });
  await page.keyboard.up('ArrowRight');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.held.journal), {
      message: 'J was let go',
    })
    .toBe(false);
  await page.keyboard.down('KeyJ');
  await expect.poll(journal, { message: 'a second press of J closes it' }).toBeNull();
  await page.keyboard.up('KeyJ');
});

test('the floor starts with its fifteen traces, none seen and none found', async ({ page }) => {
  await start(page);
  // One poll for the whole value: nothing is read from a page that might still be loading.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.traces), {
      message:
        'window.shadowAi.state.traces holds five traces each of Sales, Marketing and Support',
    })
    .toStrictEqual(Array.from({ length: 15 }, (_, trace) => ({ trace, light: 0, found: null })));
});

test('H opens the help, the game stands still under it, and H closes it again', async ({
  page,
}) => {
  await start(page);
  const help = () => page.evaluate(() => window.shadowAi?.state.help);
  await expect
    .poll(help, { message: 'window.shadowAi.state.help is there: the game runs, the help closed' })
    .toBe(false);
  // The game reads the held keys once per frame, so a key stays down until the state shows it.
  await page.keyboard.down('KeyH');
  await expect.poll(help, { message: 'H opens the help' }).toBe(true);
  await page.keyboard.up('KeyH');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.held.help), {
      message: 'H was let go',
    })
    .toBe(false);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.shadowAi?.state.player.x)).toBe(256);
  expect(await help()).toBe(true);
  await page.keyboard.down('KeyH');
  await expect.poll(help, { message: 'a second press of H closes it' }).toBe(false);
  await page.keyboard.up('KeyH');
});

test('the reception keeps its colours: no shadow lies over it', async ({ page }) => {
  await start(page);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.camera), {
      message: 'the first view is the reception',
    })
    .toStrictEqual({ x: 96, y: 624 });
  // Cell (7, 43) is carpet, with no furniture and on no route. Its corner is at (16, 64) on the
  // surface, the factor is 4, and the corner pixel of the carpet tile is its base colour.
  const canvas = page.locator('canvas#game');
  await expect
    .poll(
      () =>
        canvas.evaluate((element: HTMLCanvasElement) =>
          Array.from(element.getContext('2d')?.getImageData(16 * 4, 64 * 4, 1, 1).data ?? []),
        ),
      { message: 'the pixel is the carpet #8b9bb4, not its grey under shadow #5a6988' },
    )
    .toStrictEqual([0x8b, 0x9b, 0xb4, 255]);
});

test('the game starts with no case solved and five hearts', async ({ page }) => {
  await start(page);
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.solved), {
      message: 'window.shadowAi.state.solved is there and empty',
    })
    .toStrictEqual([]);
  expect(await page.evaluate(() => window.shadowAi?.state.overview)).toStrictEqual({
    current: 5,
    max: 5,
  });
});

test('the game starts with no rest taken', async ({ page }) => {
  await start(page);
  // One poll for the whole value: nothing is read from a page that might still be loading.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.rested), {
      message: 'window.shadowAi.state.rested is there and null: no coffee yet',
    })
    .toBeNull();
});

test('the game starts with no upgrade of the lamp', async ({ page }) => {
  await start(page);
  // One poll for the whole value: nothing is read from a page that might still be loading.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.upgrades), {
      message: 'window.shadowAi.state.upgrades is there and empty',
    })
    .toStrictEqual([]);
  expect(await page.evaluate(() => window.shadowAi?.state.lamp.strength)).toBe(1);
});

test('the game starts with the close not closed', async ({ page }) => {
  await start(page);
  // One poll for the whole value: nothing is read from a page that might still be loading.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.finished), {
      message: 'window.shadowAi.state.finished is there and null: the close has not been read',
    })
    .toBeNull();
});

test('the game opens with the card of its presenter, and a press of E goes on to the call', async ({
  page,
}) => {
  await page.goto('/');
  const shown = () =>
    page.evaluate(() => {
      const state = window.shadowAi?.state;
      return state === undefined
        ? undefined
        : { presented: state.presented === null ? null : 'ended', dialogue: state.dialogue };
    });
  // One poll for the whole value: nothing is read from a page that might still be loading.
  await expect
    .poll(shown, { message: 'a new game: the card is shown, the call waits under it' })
    .toStrictEqual({ presented: null, dialogue: call(0) });
  const canvas = page.locator('canvas#game');
  /** The game pixel (0, 0), and how many pixels of the dialogue box are not background. */
  const drawn = () =>
    canvas.evaluate((element: HTMLCanvasElement) => {
      // Desktop Chrome in Playwright draws at factor 4; the box is (8, 134, 304, 42).
      const context = element.getContext('2d');
      const box = context?.getImageData(32, 536, 1216, 168).data ?? [];
      let ink = 0;
      for (let i = 0; i < box.length; i += 4) {
        if (box[i] !== 0x18 || box[i + 1] !== 0x14 || box[i + 2] !== 0x25) {
          ink += 1;
        }
      }
      return { corner: Array.from(context?.getImageData(0, 0, 1, 1).data ?? []), ink };
    });
  await expect
    .poll(drawn, { message: 'the card: no map in the corner, no page of the call drawn' })
    .toStrictEqual({ corner: [0x18, 0x14, 0x25, 255], ink: 0 });
  await page.keyboard.down('KeyE');
  await expect
    .poll(shown, { message: 'E ends the card; the press does not turn the page of the call' })
    .toStrictEqual({ presented: 'ended', dialogue: call(0) });
  await expect
    .poll(async () => (await drawn()).ink, { message: 'the call is drawn in its box' })
    .toBeGreaterThan(0);
  expect((await drawn()).corner).toStrictEqual([0x8b, 0x9b, 0xb4, 255]);
  // Still held, E turns nothing: the call stays on its first page.
  expect((await shown())?.dialogue).toStrictEqual(call(0));
  await letGo(page);
  await page.keyboard.down('KeyE');
  await expect
    .poll(async () => (await shown())?.dialogue, { message: 'a new press turns the page' })
    .toStrictEqual(call(1));
  await page.keyboard.up('KeyE');
});
