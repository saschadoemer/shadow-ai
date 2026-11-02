import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { ENDESGA_32, PAGE_BACKGROUND, SHADOW_COLOUR } from '../../src/render/palette';
import { checkPng } from './png-check';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const RULES = { palette: new Set<string>(ENDESGA_32), reserved: SHADOW_COLOUR };
const FIXTURE = 'tests/fixtures/off-palette.png';

function read(file: string): Buffer {
  return readFileSync(join(ROOT, file));
}

/** A 1x1 PNG with the given RGBA, encoded for real so the decoder is exercised. */
function onePixel(r: number, g: number, b: number, a: number): Buffer {
  const png = new PNG({ width: 1, height: 1 });
  png.data[0] = r;
  png.data[1] = g;
  png.data[2] = b;
  png.data[3] = a;
  return PNG.sync.write(png);
}

describe('Endesga 32 palette data', () => {
  it('has 32 distinct lowercase #rrggbb colours', () => {
    expect(ENDESGA_32).toHaveLength(32);
    expect(new Set(ENDESGA_32).size).toBe(32);
    for (const colour of ENDESGA_32) {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('contains the reserved shadow colour and the page background', () => {
    expect(SHADOW_COLOUR).toBe('#68386c');
    expect(PAGE_BACKGROUND).toBe('#181425');
    expect(ENDESGA_32).toContain(SHADOW_COLOUR);
    expect(ENDESGA_32).toContain(PAGE_BACKGROUND);
  });
});

describe('every PNG under public/ is a palette PNG (INV-6)', () => {
  it('finds no off-palette, semi-transparent or reserved pixel under public/', () => {
    const files = globSync('public/**/*.png', { cwd: ROOT }).sort();
    const findings = files.flatMap((file) => checkPng(file, read(file), RULES));
    expect(findings).toStrictEqual([]);
  });

  it('finds every tileset under public/tiles/ sized in multiples of 16', () => {
    const files = globSync('public/tiles/**/*.png', { cwd: ROOT }).sort();
    const findings = files.flatMap((file) =>
      checkPng(file, read(file), { ...RULES, multipleOf16: true }),
    );
    expect(findings).toStrictEqual([]);
  });

  it('rejects the off-palette fixture, naming file, position and colour', () => {
    expect(checkPng(FIXTURE, read(FIXTURE), RULES)).toStrictEqual([
      `${FIXTURE}: pixel (1, 1) has colour #123456, which is not in Endesga 32`,
    ]);
  });

  it('rejects the reserved shadow colour wherever it appears', () => {
    expect(checkPng('x.png', onePixel(0x68, 0x38, 0x6c, 255), RULES)).toStrictEqual([
      'x.png: pixel (0, 0) uses the reserved shadow colour #68386c',
    ]);
  });

  it('rejects a semi-transparent pixel', () => {
    expect(checkPng('x.png', onePixel(0x18, 0x14, 0x25, 128), RULES)).toStrictEqual([
      'x.png: pixel (0, 0) has alpha 128; only 0 or 255 are allowed',
    ]);
  });

  it('ignores the colour of a fully transparent pixel', () => {
    expect(checkPng('x.png', onePixel(0x12, 0x34, 0x56, 0), RULES)).toStrictEqual([]);
  });

  it('rejects a tileset whose size is not a multiple of 16', () => {
    const findings = checkPng(FIXTURE, read(FIXTURE), { ...RULES, multipleOf16: true });
    expect(findings[0]).toBe(`${FIXTURE}: size 2x2 is not a multiple of 16`);
  });
});
