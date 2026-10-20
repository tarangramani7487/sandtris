import { BLOCK, COLS, DANGER_ROW } from './constants';
import { Random } from './Random';
import type { ActivePiece, Matrix, PieceSpec, ShapeId } from './types';

export const SHAPES: Record<ShapeId, Matrix> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0],
  ],
  L: [
    [1, 1, 1],
    [1, 0, 0],
  ],
  J: [
    [1, 1, 1],
    [0, 0, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  // plus-shaped pentomino
  P: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
};

export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];

/** Rotate a block matrix 90 degrees clockwise. */
export function rotateMatrix(m: Matrix): Matrix {
  const h = m.length;
  const w = m[0].length;
  const out: Matrix = [];
  for (let x = 0; x < w; x++) {
    const row: number[] = [];
    for (let y = h - 1; y >= 0; y--) row.push(m[y][x]);
    out.push(row);
  }
  return out;
}

export function matrixFor(spec: PieceSpec): Matrix {
  let m = SHAPES[spec.shape].map((r) => [...r]);
  for (let i = 0; i < spec.turns % 4; i++) m = rotateMatrix(m);
  return m;
}

export function matrixWidthCells(m: Matrix): number {
  return m[0].length * BLOCK;
}

export function matrixHeightCells(m: Matrix): number {
  return m.length * BLOCK;
}

/**
 * Produces shapes from a shuffled bag (no long droughts), a random spawn
 * orientation, and random colours from `palette`, avoiding three identical
 * colours in a row.
 */
export class PieceGenerator {
  private bag: ShapeId[] = [];
  private lastColors: number[] = [];

  constructor(private rng: Random) {}

  reset(): void {
    this.bag = [];
    this.lastColors = [];
  }

  next(palette: number[]): PieceSpec {
    if (this.bag.length === 0) this.refill();
    const shape = this.bag.pop()!;
    let color = palette[this.rng.int(palette.length)];
    const [a, b] = this.lastColors;
    if (a === color && b === color && palette.length > 1) {
      const others = palette.filter((c) => c !== color);
      color = others[this.rng.int(others.length)];
    }
    this.lastColors = [color, a];
    // Long pieces stay horizontal so they always fit above the red line.
    const turns = shape === 'I' ? 0 : this.rng.int(4);
    return { shape, color, turns };
  }

  private refill(): void {
    const bag = [...SHAPE_IDS];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.bag = bag;
  }
}

/** Row at which an aiming piece hovers: vertically centred in the zone above the red line. */
export function hoverRow(m: Matrix): number {
  return Math.max(0, Math.floor((DANGER_ROW - 1 - matrixHeightCells(m)) / 2));
}

/** Left edge for a piece centred on `centerX` (cells), snapped to whole cells and clamped. */
export function leftForCenter(m: Matrix, centerX: number, cols: number = COLS): number {
  const w = matrixWidthCells(m);
  return Math.max(0, Math.min(cols - w, Math.round(centerX - w / 2)));
}

/** Create an aiming piece centred on `centerX`. */
export function spawnPiece(spec: PieceSpec, centerX: number = COLS / 2, cols: number = COLS): ActivePiece {
  const matrix = matrixFor(spec);
  const y = hoverRow(matrix);
  return { ...spec, matrix, x: leftForCenter(matrix, centerX, cols), y, prevY: y, phase: 'aiming', vy: 0 };
}
