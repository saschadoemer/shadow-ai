import { PNG } from 'pngjs';

export interface PngRules {
  /** Allowed colours as lowercase `#rrggbb`. */
  readonly palette: ReadonlySet<string>;
  /** A palette colour that may appear nowhere in the file. */
  readonly reserved: string;
  /** Require width and height to be multiples of 16 (tilesets). */
  readonly multipleOf16?: boolean;
}

function hex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Decodes a PNG and returns one finding per violation of the palette rule (INV-6): a pixel passes
 * when its alpha is 0, or when its alpha is 255 and its colour is in the palette and not the
 * reserved colour. The empty array means the file is clean.
 */
export function checkPng(file: string, buffer: Buffer, rules: PngRules): string[] {
  const png = PNG.sync.read(buffer);
  const findings: string[] = [];
  if (rules.multipleOf16 === true && (png.width % 16 !== 0 || png.height % 16 !== 0)) {
    findings.push(`${file}: size ${png.width}x${png.height} is not a multiple of 16`);
  }
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (png.width * y + x) * 4;
      const alpha = png.data.readUInt8(offset + 3);
      if (alpha === 0) {
        continue;
      }
      if (alpha !== 255) {
        findings.push(`${file}: pixel (${x}, ${y}) has alpha ${alpha}; only 0 or 255 are allowed`);
        continue;
      }
      const colour = hex(
        png.data.readUInt8(offset),
        png.data.readUInt8(offset + 1),
        png.data.readUInt8(offset + 2),
      );
      if (colour === rules.reserved) {
        findings.push(`${file}: pixel (${x}, ${y}) uses the reserved shadow colour ${colour}`);
      } else if (!rules.palette.has(colour)) {
        findings.push(
          `${file}: pixel (${x}, ${y}) has colour ${colour}, which is not in Endesga 32`,
        );
      }
    }
  }
  return findings;
}
