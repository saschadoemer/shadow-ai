import { mkdirSync, writeFileSync } from 'node:fs';
import { campusJson } from './campus-layout.ts';

/**
 * `npm run gen-campus`: writes public/maps/campus.tmj from tools/campus-layout.ts. Deterministic,
 * and Node runs this TypeScript file directly. The layer data goes on one line per layer, as
 * Tiled writes it; JSON.stringify alone would write one cell per line, 12288 lines per layer.
 */

export function encodeCampus(): string {
  const dataLines: string[] = [];
  const text = JSON.stringify(
    campusJson(),
    (key, value: unknown) => {
      if (key === 'data' && Array.isArray(value)) {
        dataLines.push(`[${value.join(', ')}]`);
        return `__DATA_${dataLines.length - 1}__`;
      }
      return value;
    },
    2,
  );
  return `${text.replace(/"__DATA_(\d+)__"/g, (_match, i: string) => dataLines[Number(i)] ?? '')}\n`;
}

if (import.meta.main) {
  mkdirSync('public/maps', { recursive: true });
  writeFileSync('public/maps/campus.tmj', encodeCampus());
}
