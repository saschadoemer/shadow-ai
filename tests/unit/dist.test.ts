import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findUrls } from './dist-scan';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TEXT_FILES = 'dist/**/*.{html,js,css,json,svg,txt,webmanifest}';

describe('the build output references no other host (INV-5)', () => {
  it('has a build to scan', () => {
    expect(existsSync(join(ROOT, 'dist')), 'dist/ is missing — run `npm run build` first').toBe(
      true,
    );
  });

  it('contains no http:// or https:// URL', () => {
    const files = globSync(TEXT_FILES, { cwd: ROOT }).sort();
    expect(files.length).toBeGreaterThan(0);
    const findings = files.flatMap((file) =>
      findUrls(readFileSync(join(ROOT, file), 'utf8')).map(
        (hit) => `${file}:${hit.line}: ${hit.url}`,
      ),
    );
    expect(findings).toStrictEqual([]);
  });

  it('the scan reports a URL with its line', () => {
    expect(findUrls('const a = 1;\nfetch("https://evil.example/x");\n')).toStrictEqual([
      { line: 2, url: 'https://evil.example/x' },
    ]);
  });

  it('the scan reports plain http too, and several per line', () => {
    expect(findUrls("['http://a.example', 'https://b.example/']")).toStrictEqual([
      { line: 1, url: 'http://a.example' },
      { line: 1, url: 'https://b.example/' },
    ]);
  });

  it('the scan passes clean text', () => {
    expect(findUrls('<link rel="stylesheet" href="/assets/index.css">')).toStrictEqual([]);
  });
});
