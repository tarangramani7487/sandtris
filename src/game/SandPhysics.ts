import type { ParticleGrid } from './ParticleGrid';
import type { Random } from './Random';

/**
 * One cellular-automaton gravity pass. Rows are scanned bottom-up so a grain
 * moves at most one cell per pass (it only ever moves into an already-scanned
 * row). Horizontal scan direction alternates per row and per pass, and the
 * diagonal choice is random, so piles don't lean to one side.
 *
 * Only the grid's active row range is scanned; the pass then narrows it to
 * the rows around this pass's moves, so a settled board costs almost nothing.
 *
 * Grains that are flashing for removal are frozen and act as solid.
 *
 * @returns number of grains that moved.
 */
export function stepSand(grid: ParticleGrid, rng: Random, pass: number): number {
  const { cols, rows, color, shade, clearing } = grid;
  let moves = 0;
  let minY = rows;
  let maxY = -1;
  const from = Math.min(grid.activeBottom, rows - 2);
  const to = Math.max(grid.activeTop, 0);

  for (let y = from; y >= to; y--) {
    const ltr = ((y + pass) & 1) === 0;
    const rowBase = y * cols;
    for (let k = 0; k < cols; k++) {
      const x = ltr ? k : cols - 1 - k;
      const i = rowBase + x;
      const c = color[i];
      if (c === 0 || clearing[i] !== 0) continue;

      const below = i + cols;
      let target = -1;
      if (color[below] === 0) {
        target = below;
      } else {
        const canL = x > 0 && color[below - 1] === 0;
        const canR = x < cols - 1 && color[below + 1] === 0;
        if (canL && canR) target = rng.next() < 0.5 ? below - 1 : below + 1;
        else if (canL) target = below - 1;
        else if (canR) target = below + 1;
      }

      if (target >= 0) {
        color[target] = c;
        shade[target] = shade[i];
        color[i] = 0;
        shade[i] = 0;
        moves++;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Next pass: grains that moved (now one row lower) and those above the cells they left.
  grid.activeTop = moves > 0 ? Math.max(0, minY - 1) : rows;
  grid.activeBottom = moves > 0 ? Math.min(rows - 2, maxY + 1) : -1;
  if (moves > 0) grid.version++;
  return moves;
}
