import http from 'node:http';
import { expect, test } from '@playwright/test';

/** Set when the spec runs against the container; the header checks need nginx. */
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

/** A plain HTTP GET that reports headers exactly as sent — nothing decompresses or redirects. */
function get(url: string, headers: Record<string, string> = {}): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    http
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

test('the page loads with its title, its canvas and the dark background', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Shadow AI');
  await expect(page.locator('canvas#game')).toHaveCount(1);
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(24, 20, 37)');
  await expect(page.locator('body')).toHaveText('');
});

test('the map is drawn at the full factor, unclipped', async ({ page }) => {
  await page.goto('/');
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
  await page.goto('/');
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

test('a held Space turns the lamp on and holds the figure in place', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.player.x), {
      message: 'window.shadowAi.state.player.x is the spawn: the game runs',
    })
    .toBe(256);
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => window.shadowAi?.state.lamp.on)).toBe(true);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  const held = await page.evaluate(() => window.shadowAi?.state);
  // Nothing moves while the lamp is on; the direction key only turns the figure.
  expect(held?.player.x).toBe(256);
  expect(held?.player.facing).toBe('right');
  expect(held?.player.frame).toBe(0);
  expect(held?.lamp.on).toBe(true);
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => window.shadowAi?.state.lamp.on)).toBe(false);
  await page.keyboard.up('ArrowRight');
});

test('the floor starts with three snippets and nothing captured', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.creatures.length), {
      message: 'window.shadowAi.state.creatures holds the three snippets of the floor',
    })
    .toBe(3);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.creatures[0]).toStrictEqual({
    species: 'snippet',
    x: 1224,
    y: 622,
    light: 0,
    home: { x: 1224, y: 622 },
  });
  expect(state?.captured).toStrictEqual({ snippet: 0 });
});

test('the floor starts with its 22 movers and draws the person of the reception', async ({
  page,
}) => {
  await page.goto('/');
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
  await page.goto('/');
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

test('the floor starts with the officer standing and no dialogue open', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.figures.length), {
      message: 'window.shadowAi.state.figures holds the one figure of the floor',
    })
    .toBe(1);
  const state = await page.evaluate(() => window.shadowAi?.state);
  expect(state?.figures).toStrictEqual([{ figure: 0, facing: 'down' }]);
  expect(state?.dialogue).toBeNull();
  expect(state?.held.talk).toBe(false);
});

test('the game starts with full overview and outside the dark', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.overview), {
      message: 'window.shadowAi.state.overview is five of five',
    })
    .toStrictEqual({ current: 5, max: 5 });
  expect(await page.evaluate(() => window.shadowAi?.state.dark)).toBe(0);
});

test.describe('served by the container', () => {
  test.skip(containerUrl === undefined, 'header checks run against the container (BASE_URL)');

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
  await page.goto('/');
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
  await page.goto('/');
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
  });
  await page.keyboard.up('KeyJ');
  await page.keyboard.down('ArrowRight');
  await expect.poll(journal, { message: 'the right arrow turns to the cases' }).toStrictEqual({
    tab: 'cases',
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

test('the floor starts with its five traces, none seen and none found', async ({ page }) => {
  await page.goto('/');
  // One poll for the whole value: nothing is read from a page that might still be loading.
  await expect
    .poll(() => page.evaluate(() => window.shadowAi?.state.traces), {
      message: 'window.shadowAi.state.traces holds the five traces of Sales',
    })
    .toStrictEqual([0, 1, 2, 3, 4].map((trace) => ({ trace, light: 0, found: null })));
});

test('H opens the help, the game stands still under it, and H closes it again', async ({
  page,
}) => {
  await page.goto('/');
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
  await page.goto('/');
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
