/**
 * Fixed-size particle grid backed by typed arrays. A particle's grid
 * coordinates are its index; `color` doubles as occupancy (0 = empty).
 */
export class ParticleGrid {
  readonly cols: number;
  readonly rows: number;
  readonly size: number;
  /** 0 = empty, otherwise 1-based palette index. */
  readonly color: Uint8Array;
  /** Per-grain shade variation. */
  readonly shade: Uint8Array;
  /** Non-zero while a grain is flashing before removal; such grains are frozen. */
  readonly clearing: Uint8Array;
  /** Bumped whenever the grid contents change (used to skip redundant renders). */
  version = 0;
  /**
   * Rows [activeTop, activeBottom] may hold grains that can move; the physics
   * pass only scans this range. Empty when activeTop > activeBottom.
   */
  activeTop: number;
  activeBottom = -1;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.size = cols * rows;
    this.color = new Uint8Array(this.size);
    this.shade = new Uint8Array(this.size);
    this.clearing = new Uint8Array(this.size);
    this.activeTop = rows;
  }

  /** A cell in row y changed: its grain may move (row y) and grains above may fall into it (row y - 1). */
  markActive(y: number): void {
    if (y - 1 < this.activeTop) this.activeTop = Math.max(0, y - 1);
    if (y > this.activeBottom) this.activeBottom = y;
  }

  index(x: number, y: number): number {
    return y * this.cols + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  get(x: number, y: number): number {
    return this.inBounds(x, y) ? this.color[y * this.cols + x] : 0;
  }

  isEmpty(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.color[y * this.cols + x] === 0;
  }

  set(x: number, y: number, color: number, shade = 0): void {
    const i = y * this.cols + x;
    this.color[i] = color;
    this.shade[i] = shade;
    this.clearing[i] = 0;
    this.markActive(y);
    this.version++;
  }

  removeAt(i: number): void {
    this.color[i] = 0;
    this.shade[i] = 0;
    this.clearing[i] = 0;
    this.markActive((i / this.cols) | 0);
  }

  count(): number {
    let n = 0;
    for (let i = 0; i < this.size; i++) if (this.color[i] !== 0) n++;
    return n;
  }

  /** True if any grain occupies a row above `row`. */
  hasSandAbove(row: number): boolean {
    const end = Math.min(row, this.rows) * this.cols;
    for (let i = 0; i < end; i++) if (this.color[i] !== 0) return true;
    return false;
  }

  reset(): void {
    this.color.fill(0);
    this.shade.fill(0);
    this.clearing.fill(0);
    this.activeTop = this.rows;
    this.activeBottom = -1;
    this.version++;
  }
}
