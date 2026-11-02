import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadJson, resolvePath } from '../../src/engine/assets';

describe('resolvePath', () => {
  it('resolves a path relative to the file that references it', () => {
    expect(resolvePath('../tiles/placeholder.tsj', '/maps/test.tmj')).toBe(
      '/tiles/placeholder.tsj',
    );
    expect(resolvePath('placeholder.png', '/tiles/placeholder.tsj')).toBe('/tiles/placeholder.png');
  });

  it('keeps an absolute path', () => {
    expect(resolvePath('/x.json', '/maps/test.tmj')).toBe('/x.json');
  });
});

describe('loadJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves to the parsed body of a successful response', async () => {
    const fetch = vi.fn(async () => Response.json({ width: 20 }));
    vi.stubGlobal('fetch', fetch);
    await expect(loadJson('/maps/test.tmj')).resolves.toStrictEqual({ width: 20 });
    expect(fetch).toHaveBeenCalledWith('/maps/test.tmj');
  });

  it('rejects with the URL and the status when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not found', { status: 404 })),
    );
    await expect(loadJson('/maps/missing.tmj')).rejects.toThrow('/maps/missing.tmj: HTTP 404');
  });
});
