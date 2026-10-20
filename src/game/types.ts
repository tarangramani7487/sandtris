export type GameMode = 'classic' | 'speed';

/**
 * playing        – normal play
 * paused         – frozen
 * overflow       – sand reached the red line; waiting for "save" or "give up"
 * gameover       – run finished
 */
export type GameStatus = 'playing' | 'paused' | 'overflow' | 'gameover';

/** aiming: piece hovers above the red line following the pointer; dropping: falling. */
export type PiecePhase = 'aiming' | 'dropping';

export type ShapeId = 'I' | 'O' | 'T' | 'L' | 'J' | 'S' | 'Z' | 'P';

/** Row-major 0/1 matrix in block units. */
export type Matrix = number[][];

export interface PieceSpec {
  shape: ShapeId;
  /** 1-based colour index into the palette. */
  color: number;
  /** Clockwise quarter turns applied at spawn. */
  turns: number;
}

export interface ActivePiece extends PieceSpec {
  matrix: Matrix;
  /** Left edge in cells (integer). */
  x: number;
  /** Top edge in cells (fractional while falling). */
  y: number;
  /** y at the previous fixed step (renderers interpolate between prevY and y). */
  prevY: number;
  phase: PiecePhase;
  /** Current fall speed while dropping, cells/s. */
  vy: number;
}

/** A loose grain flying through the air (landing splash). */
export interface Flyer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  shade: number;
}

export type GameEvent =
  | { type: 'drop' }
  | { type: 'land' }
  | { type: 'clear'; cells: number; chain: number; points: number; color: number }
  | { type: 'milestone'; index: number; colors: number }
  | { type: 'speedup'; level: number }
  | { type: 'daily'; bonus: number }
  | { type: 'overflow' }
  | { type: 'gameover'; score: number };

export interface HudState {
  status: GameStatus;
  mode: GameMode;
  score: number;
  lines: number;
  chain: number;
  maxChain: number;
  next: PieceSpec;
  /** Milestone progress: previous and next target. */
  prevTarget: number;
  nextTarget: number;
  colors: number;
  speedLevel: number;
  canSkip: boolean;
  clearCharges: number;
  canSave: boolean;
  dropped: number;
}
