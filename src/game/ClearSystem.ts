import type { ParticleGrid } from './ParticleGrid';

export interface ClearComponent {
  color: number;
  cells: number[];
}

/**
 * Finds connected same-colour components that touch both the left and right
 * walls. Flood fills start only from left-wall grains, so each component is
 * visited once; buffers are reused between calls (generation-stamped visit
 * marks avoid re-zeroing).
 */
export class ClearSystem {
  private visited: Uint32Array;
  private stack: Int32Array;
  private generation = 0;

  constructor(
    private cols: number,
    private rows: number,
    private connectivity: 4 | 8 = 4,
  ) {
    this.visited = new Uint32Array(cols * rows);
    this.stack = new Int32Array(cols * rows);
  }

  findSpanning(grid: ParticleGrid): ClearComponent[] {
    const { cols, rows } = this;
    const { color, clearing } = grid;
    const visited = this.visited;
    const stack = this.stack;
    const gen = ++this.generation;
    const diag = this.connectivity === 8;
    const found: ClearComponent[] = [];

    for (let y = 0; y < rows; y++) {
      const start = y * cols;
      const c = color[start];
      if (c === 0 || clearing[start] !== 0 || visited[start] === gen) continue;

      const cells: number[] = [];
      let touchesRight = false;
      let sp = 0;
      stack[sp++] = start;
      visited[start] = gen;

      while (sp > 0) {
        const i = stack[--sp];
        cells.push(i);
        const x = i % cols;
        const cy = (i - x) / cols;
        if (x === cols - 1) touchesRight = true;

        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= rows) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (!diag && dx !== 0 && dy !== 0) continue;
            const nx = x + dx;
            if (nx < 0 || nx >= cols) continue;
            const n = ny * cols + nx;
            if (visited[n] === gen || color[n] !== c || clearing[n] !== 0) continue;
            visited[n] = gen;
            stack[sp++] = n;
          }
        }
      }

      if (touchesRight) found.push({ color: c, cells });
    }
    return found;
  }
}
