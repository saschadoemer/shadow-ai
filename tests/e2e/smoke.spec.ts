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

test('the pattern is drawn at the full factor, unclipped, and moves', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas#game');
  // Desktop Chrome in Playwright: a 1280x720 page area at device pixel ratio 1, so factor 4.
  await expect
    .poll(() => canvas.evaluate((element: HTMLCanvasElement) => [element.width, element.height]))
    .toStrictEqual([1280, 720]);
  expect(await canvas.boundingBox()).toStrictEqual({ x: 0, y: 0, width: 1280, height: 720 });
  const corner = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')?.getImageData(0, 0, 1, 1).data ?? []),
  );
  expect(corner, 'the top-left pixel is the border colour #c0cbdc').toStrictEqual([
    0xc0, 0xcb, 0xdc, 255,
  ]);
  const read = () => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  const first = await read();
  await page.waitForTimeout(500);
  expect(await read(), 'the picture changes, so the loop runs').not.toBe(first);
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
