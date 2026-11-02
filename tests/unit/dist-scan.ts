export interface UrlHit {
  readonly line: number;
  readonly url: string;
}

const URL = /https?:\/\/[^\s"'`<>)\]]*/g;

/** Every `http://` or `https://` URL in the text, with its 1-based line (INV-5). */
export function findUrls(text: string): UrlHit[] {
  const hits: UrlHit[] = [];
  for (const [index, line] of text.split('\n').entries()) {
    for (const match of line.matchAll(URL)) {
      hits.push({ line: index + 1, url: match[0] });
    }
  }
  return hits;
}
