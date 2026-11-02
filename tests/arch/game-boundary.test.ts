import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkGameSource } from './game-boundary';

const GAME_DIR = fileURLToPath(new URL('../../src/game', import.meta.url));

function typescriptFilesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

describe('src/game/ touches no browser and no renderer (INV-2)', () => {
  const files = typescriptFilesUnder(GAME_DIR);

  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => [relative(GAME_DIR, file), file]))('%s is clean', (_name, file) => {
    expect(checkGameSource(file, readFileSync(file, 'utf8'))).toStrictEqual([]);
  });

  it('reports a static import from src/render/', () => {
    const findings = checkGameSource('src/game/bad.ts', "import { x } from '../render/palette';\n");
    expect(findings).toStrictEqual([
      "src/game/bad.ts:1: imports from src/render/ ('../render/palette')",
    ]);
  });

  it('reports re-exports and dynamic imports from src/render/', () => {
    const source =
      "export { y } from '../render/renderer';\nconst m = import('../render/canvas2d');\n";
    const findings = checkGameSource('src/game/bad.ts', source);
    expect(findings).toStrictEqual([
      "src/game/bad.ts:1: imports from src/render/ ('../render/renderer')",
      "src/game/bad.ts:2: imports from src/render/ ('../render/canvas2d')",
    ]);
  });

  it('reports every forbidden browser name with its line', () => {
    const source = [
      'const w = window;',
      'const d = document;',
      'let c: HTMLCanvasElement;',
      'const i = new Image();',
      'fetch(url);',
    ].join('\n');
    const findings = checkGameSource('src/game/bad.ts', source);
    expect(findings).toStrictEqual([
      "src/game/bad.ts:1: uses the browser name 'window'",
      "src/game/bad.ts:2: uses the browser name 'document'",
      "src/game/bad.ts:3: uses the browser name 'HTMLCanvasElement'",
      "src/game/bad.ts:4: uses the browser name 'Image'",
      "src/game/bad.ts:5: uses the browser name 'fetch'",
    ]);
  });

  it('reports a forbidden name inside a comment, because the rule is over the source text', () => {
    const findings = checkGameSource('src/game/bad.ts', '// later: read window.innerWidth\n');
    expect(findings).toHaveLength(1);
  });

  it('does not flag identifiers that merely contain a forbidden word', () => {
    const source = 'const imageData = 1;\nconst windowless = 2;\nconst prefetched = 3;\n';
    expect(checkGameSource('src/game/ok.ts', source)).toStrictEqual([]);
  });

  it('allows imports from engine/ and text/', () => {
    const source =
      "import { clamp } from '../engine/math';\nimport type { TextKey } from '../text/keys';\n";
    expect(checkGameSource('src/game/ok.ts', source)).toStrictEqual([]);
  });
});
