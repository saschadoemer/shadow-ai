import type { Box } from '../../src/engine/tiled';

/** One full 16x16 box, in map pixels, for every true flag; row-major, `width` cells per row. */
export function solidsOf(flags: readonly boolean[], width: number): Box[][] {
  return flags.map((solid, index) =>
    solid
      ? [{ x: (index % width) * 16, y: Math.floor(index / width) * 16, width: 16, height: 16 }]
      : [],
  );
}

/** A grid of width × height open cells with the given boxes, in map pixels, put at their cells. */
export function solidsWith(
  width: number,
  height: number,
  placed: readonly { readonly column: number; readonly row: number; readonly box: Box }[],
): Box[][] {
  const solids = Array.from({ length: width * height }, (): Box[] => []);
  for (const { column, row, box } of placed) {
    solids[row * width + column]?.push(box);
  }
  return solids;
}
