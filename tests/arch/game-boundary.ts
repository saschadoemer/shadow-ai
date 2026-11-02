/**
 * The rule behind INV-2: nothing in src/game/ reaches src/render/ or the browser. The check runs
 * over the source text, line by line — comments included — so a forbidden name cannot hide.
 */

const FORBIDDEN_NAMES = ['window', 'document', 'HTMLCanvasElement', 'Image', 'fetch'] as const;

/** `from '…'`, `import '…'` and `import('…')` — the specifier is group 1. */
const IMPORT_SPECIFIER = /\b(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g;

/** A path with a `render` segment: `../render/x`, `./render`, `src/render/x`. */
const RENDER_PATH = /(^|\/)render(\/|$)/;

export function checkGameSource(file: string, source: string): string[] {
  const findings: string[] = [];
  const lines = source.split('\n');
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    for (const match of line.matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1];
      if (specifier !== undefined && RENDER_PATH.test(specifier)) {
        findings.push(`${file}:${lineNumber}: imports from src/render/ ('${specifier}')`);
      }
    }
    for (const name of FORBIDDEN_NAMES) {
      if (new RegExp(`\\b${name}\\b`).test(line)) {
        findings.push(`${file}:${lineNumber}: uses the browser name '${name}'`);
      }
    }
  }
  return findings;
}
