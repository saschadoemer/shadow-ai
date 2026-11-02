/** The fields of a .tsj that must agree with its PNG (testing.md §1, INV-6). */
export interface TilesetFacts {
  readonly tilewidth: number;
  readonly tileheight: number;
  readonly columns: number;
  readonly tilecount: number;
  readonly imagewidth: number;
  readonly imageheight: number;
  readonly image: string;
}

const TILE_SIZE = 16;

/** Findings for one .tsj against the size of its PNG; [] means consistent. */
export function checkTileset(
  file: string,
  tsj: TilesetFacts,
  png: { readonly width: number; readonly height: number },
): string[] {
  const findings: string[] = [];
  if (tsj.imagewidth !== png.width || tsj.imageheight !== png.height) {
    findings.push(
      `${file}: image size ${tsj.imagewidth}x${tsj.imageheight} does not match the PNG (${png.width}x${png.height})`,
    );
  }
  if (tsj.tilewidth !== TILE_SIZE || tsj.tileheight !== TILE_SIZE) {
    findings.push(`${file}: tile size is ${tsj.tilewidth}x${tsj.tileheight}; tiles are 16x16`);
  }
  if (tsj.columns !== tsj.imagewidth / TILE_SIZE) {
    findings.push(
      `${file}: columns ${tsj.columns} does not match imagewidth / 16 = ${tsj.imagewidth / TILE_SIZE}`,
    );
  }
  const tiles = tsj.columns * (tsj.imageheight / TILE_SIZE);
  if (tsj.tilecount !== tiles) {
    findings.push(`${file}: tilecount ${tsj.tilecount} does not match columns × rows = ${tiles}`);
  }
  return findings;
}
