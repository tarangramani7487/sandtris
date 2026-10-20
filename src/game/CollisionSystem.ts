import { BLOCK } from './constants';
import type { ParticleGrid } from './ParticleGrid';
import type { Matrix } from './types';

/**
 * True if a piece with `matrix` whose top-left cell is (x, row) would overlap
 * a wall, the floor or any grain. Cells above the top edge are allowed.
 */
export function collides(grid: ParticleGrid, matrix: Matrix, x: number, row: number): boolean {
  for (let by = 0; by < matrix.length; by++) {
    const line = matrix[by];
    for (let bx = 0; bx < line.length; bx++) {
      if (!line[bx]) continue;
      const cx0 = x + bx * BLOCK;
      const cy0 = row + by * BLOCK;
      if (cx0 < 0 || cx0 + BLOCK > grid.cols || cy0 + BLOCK > grid.rows) return true;
      for (let cy = Math.max(0, cy0); cy < cy0 + BLOCK; cy++) {
        const base = cy * grid.cols;
        for (let cx = cx0; cx < cx0 + BLOCK; cx++) {
          if (grid.color[base + cx] !== 0) return true;
        }
      }
    }
  }
  return false;
}
