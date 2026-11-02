/**
 * Loading content from the game's own origin (INV-5). Paths inside a file are relative to that
 * file, so a map names its tileset and a tileset its image the way Tiled writes them.
 */

/**
 * Resolves a path as written in a file against that file's own URL path, e.g.
 * ('../tiles/placeholder.tsj', '/maps/test.tmj') → '/tiles/placeholder.tsj'.
 */
export function resolvePath(relative: string, baseFile: string): string {
  // The dist scan forbids http:// in the bundle (INV-5); file:/// is a URL base without one.
  return new URL(relative, new URL(baseFile, 'file:///')).pathname;
}

/** GET from the game's own origin; rejects with `${url}: HTTP ${status}` when not ok. */
export async function loadJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return response.json();
}

/** GET and decode; rejects like loadJson, or with the decoder's error. */
export async function loadImage(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return createImageBitmap(await response.blob());
}
