import { ClearSystem } from './ClearSystem';
import { collides } from './CollisionSystem';
import {
  BLOCK,
  CLEAR_CONNECTIVITY,
  CLEAR_FLASH_STEPS,
  COLS,
  DANGER_ROW,
  DROP_ACCEL,
  DROP_MAX_SPEED,
  DROP_START_SPEED,
  FLYER_GRAVITY,
  LINES_PER_CLEAR_CHARGE,
  MAX_STEPS_PER_TICK,
  ROWS,
  SAND_SUBSTEPS,
  SETTLE_STEPS,
  SHADES,
  SIM_HZ,
  SPLASH_FRACTION,
  START_CLEAR_CHARGES,
  STEP_MS,
} from './constants';
import { ParticleGrid } from './ParticleGrid';
import { PieceGenerator, leftForCenter, matrixWidthCells, spawnPiece } from './PieceGenerator';
import { Random } from './Random';
import { stepSand } from './SandPhysics';
import {
  autoDropDelayMs,
  colorsForScore,
  colorsForSpeed,
  milestoneRange,
  milestonesPassed,
  pointsForClear,
  speedLevelFor,
} from './ScoreSystem';
import type { ActivePiece, Flyer, GameEvent, GameMode, GameStatus, HudState, PieceSpec } from './types';

export interface EngineOptions {
  mode?: GameMode;
  seed?: number;
  cols?: number;
  rows?: number;
}

type Listener = (e: GameEvent) => void;

const DT = 1 / SIM_HZ;
/** Weighted shade pick: mostly base colour, some light and dark speckles. */
const SHADE_WEIGHTS = [0.55, 0.25, 0.12, 0.08];

/**
 * Framework-free game state machine. React only reads from it (grid arrays,
 * active piece, flyers, HUD snapshot) and forwards input.
 *
 * Flow: a piece hovers above the red line following the aim point; drop()
 * (tap/click, or the speed-mode timer) lets it fall; on contact it turns into
 * grains (a few splash out as loose flyers) and the next piece appears.
 * Each fixed step then runs sand gravity, flyers, the clear sparkle and – once
 * the board is still – the wall-to-wall colour check and overflow check.
 */
export class GameEngine {
  readonly grid: ParticleGrid;
  readonly rng: Random;
  private generator: PieceGenerator;
  private clearSystem: ClearSystem;
  private listeners = new Set<Listener>();

  mode: GameMode;
  status: GameStatus = 'playing';
  piece: ActivePiece | null = null;
  next!: PieceSpec;
  flyers: Flyer[] = [];

  score = 0;
  lines = 0;
  chain = 0;
  maxChain = 0;
  elapsedMs = 0;
  speedLevel = 1;
  dropped = 0;
  canSkip = true;
  clearCharges = START_CLEAR_CHARGES;
  saveUsed = false;
  /** Aim point (piece centre) in cells. */
  aimX: number;

  /** Bumped when anything visible changes; renderers skip frames otherwise. */
  renderVersion = 0;
  /** Steps remaining in the current clear sparkle (0 = none). */
  clearFlash = 0;
  /** Milliseconds the current piece has been aiming (speed-mode auto drop). */
  aimMs = 0;

  private accumulator = 0;
  private pass = 0;
  private stillSteps = 0;
  private checkedVersion = -1;
  private milestoneCount = 0;
  /**
   * Set when a piece lands with sand above the red line: the next piece is held
   * back until the board resolves (a clear brings it back below → spawn; still
   * above once settled → overflow).
   */
  private awaitingSpawn = false;

  constructor(opts: EngineOptions = {}) {
    this.mode = opts.mode ?? 'classic';
    this.grid = new ParticleGrid(opts.cols ?? COLS, opts.rows ?? ROWS);
    this.rng = new Random(opts.seed ?? Date.now());
    this.generator = new PieceGenerator(this.rng);
    this.clearSystem = new ClearSystem(this.grid.cols, this.grid.rows, CLEAR_CONNECTIVITY);
    this.aimX = this.grid.cols / 2;
    this.reset(this.mode, opts.seed);
  }

  // ---------------------------------------------------------------- lifecycle

  /** Fully reset grid, score, timers, pieces, flyers and pending animations. */
  reset(mode: GameMode = this.mode, seed?: number): void {
    if (seed !== undefined) this.rng.seed(seed);
    this.mode = mode;
    this.grid.reset();
    this.generator.reset();
    this.status = 'playing';
    this.flyers = [];
    this.score = 0;
    this.lines = 0;
    this.chain = 0;
    this.maxChain = 0;
    this.elapsedMs = 0;
    this.speedLevel = 1;
    this.dropped = 0;
    this.canSkip = true;
    this.clearCharges = START_CLEAR_CHARGES;
    this.saveUsed = false;
    this.clearFlash = 0;
    this.aimMs = 0;
    this.accumulator = 0;
    this.pass = 0;
    this.stillSteps = 0;
    this.checkedVersion = -1;
    this.milestoneCount = 0;
    this.awaitingSpawn = false;
    this.aimX = this.grid.cols / 2;
    this.next = this.generator.next(this.palette());
    this.piece = null;
    this.spawn();
    this.renderVersion++;
  }

  pause(): void {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.renderVersion++;
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'playing';
      this.accumulator = 0;
      this.renderVersion++;
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: GameEvent): void {
    this.listeners.forEach((fn) => fn(e));
  }

  // -------------------------------------------------------------------- input

  /** Point the hovering piece at column `centerX` (cells, may be fractional). */
  aim(centerX: number): void {
    if (this.status !== 'playing') return;
    this.aimX = Math.max(0, Math.min(this.grid.cols, centerX));
    const p = this.piece;
    if (p && p.phase === 'aiming') {
      p.x = leftForCenter(p.matrix, this.aimX, this.grid.cols);
      this.renderVersion++;
    }
  }

  /** Move the aim by whole blocks (keyboard). */
  moveBy(blocks: number): void {
    const p = this.piece;
    if (!p || p.phase !== 'aiming') return;
    this.aim(p.x + matrixWidthCells(p.matrix) / 2 + blocks * BLOCK);
  }

  /** Release the hovering piece. */
  drop(): void {
    const p = this.piece;
    if (!p || p.phase !== 'aiming' || this.status !== 'playing') return;
    p.phase = 'dropping';
    p.vy = DROP_START_SPEED;
    this.dropped++;
    this.canSkip = true;
    this.emit({ type: 'drop' });
    this.renderVersion++;
    if (collides(this.grid, p.matrix, p.x, Math.floor(p.y))) this.land();
  }

  /** Replace the hovering piece with the next one (once per drop). */
  skip(): boolean {
    const p = this.piece;
    if (!p || p.phase !== 'aiming' || !this.canSkip || this.status !== 'playing') return false;
    this.piece = spawnPiece(this.next, this.aimX, this.grid.cols);
    this.next = this.generator.next(this.palette());
    this.canSkip = false;
    this.aimMs = 0;
    this.renderVersion++;
    return true;
  }

  /** CLEAR power-up: wipe every grain of the colour that reaches highest. */
  useClear(): boolean {
    if (this.clearCharges <= 0 || this.status !== 'playing' || this.clearFlash > 0) return false;
    if (!this.wipeTallestColor()) return false;
    this.clearCharges--;
    return true;
  }

  /** Overflow rescue: free once per run, then by spending a CLEAR charge. Wipes the tallest colour. */
  saveRun(): boolean {
    if (this.status !== 'overflow' || !this.canSave()) return false;
    if (!this.saveUsed) this.saveUsed = true;
    else this.clearCharges--;
    this.status = 'playing';
    this.wipeTallestColor();
    this.renderVersion++;
    return true;
  }

  canSave(): boolean {
    return !this.saveUsed || this.clearCharges > 0;
  }

  /** Overflow → final game over. */
  giveUp(): void {
    if (this.status === 'overflow') this.gameOver();
  }

  /** Add bonus points (e.g. daily goal). */
  addBonus(points: number): void {
    this.score += points;
    this.checkMilestones();
  }

  // --------------------------------------------------------------- simulation

  /** Advance by real elapsed time using a fixed timestep. */
  tick(dtMs: number): void {
    if (this.status !== 'playing') return;
    this.accumulator += Math.min(dtMs, 250);
    let steps = 0;
    while (this.accumulator >= STEP_MS && steps < MAX_STEPS_PER_TICK) {
      this.step();
      this.accumulator -= STEP_MS;
      steps++;
      if (this.status !== 'playing') break;
    }
    if (steps === MAX_STEPS_PER_TICK) this.accumulator = 0;
  }

  /** One fixed simulation step. */
  step(): void {
    if (this.status !== 'playing') return;
    this.elapsedMs += STEP_MS;

    if (this.mode === 'speed') {
      const lvl = speedLevelFor(this.elapsedMs);
      if (lvl !== this.speedLevel) {
        this.speedLevel = lvl;
        this.emit({ type: 'speedup', level: lvl });
      }
    }

    const p = this.piece;
    if (p && p.phase === 'aiming') {
      this.aimMs += STEP_MS;
      if (this.mode === 'speed' && this.aimMs >= autoDropDelayMs(this.speedLevel)) this.drop();
    }
    if (this.piece && this.piece.phase === 'dropping') this.advanceDrop(this.piece);

    let moves = 0;
    for (let s = 0; s < SAND_SUBSTEPS; s++) moves += stepSand(this.grid, this.rng, this.pass++);
    if (this.flyers.length > 0) {
      this.advanceFlyers();
      moves++;
    }
    if (moves > 0) this.stillSteps = 0;
    else this.stillSteps++;

    if (this.clearFlash > 0) {
      this.clearFlash--;
      if (this.clearFlash === 0) this.removeClearing();
    } else if (this.stillSteps >= SETTLE_STEPS) {
      if (this.grid.version !== this.checkedVersion) {
        this.checkedVersion = this.grid.version;
        this.checkClears();
      }
      if (this.clearFlash === 0) this.checkSettledOutcome();
    }

    // A held-back piece appears as soon as the pile is below the red line again.
    if (this.awaitingSpawn && this.status === 'playing' && !this.grid.hasSandAbove(DANGER_ROW)) {
      this.awaitingSpawn = false;
      this.spawn();
    }

    this.renderVersion++;
  }

  private advanceDrop(p: ActivePiece): void {
    p.prevY = p.y;
    p.vy = Math.min(DROP_MAX_SPEED, p.vy + DROP_ACCEL * DT);
    const newY = p.y + p.vy * DT;
    for (let row = Math.floor(p.y) + 1; row <= Math.floor(newY); row++) {
      if (collides(this.grid, p.matrix, p.x, row)) {
        p.y = row - 1;
        this.land();
        return;
      }
    }
    p.y = newY;
  }

  private pickShade(): number {
    const r = this.rng.next();
    let acc = 0;
    for (let s = 0; s < SHADES; s++) {
      acc += SHADE_WEIGHTS[s];
      if (r < acc) return s;
    }
    return 0;
  }

  /** Transform the piece into grains; part of its top surface splashes out. */
  private land(): void {
    const p = this.piece!;
    const row = Math.floor(p.y);
    const { grid } = this;
    const m = p.matrix;
    for (let by = 0; by < m.length; by++) {
      for (let bx = 0; bx < m[by].length; bx++) {
        if (!m[by][bx]) continue;
        const topExposed = by === 0 || !m[by - 1][bx];
        for (let cy = 0; cy < BLOCK; cy++) {
          for (let cx = 0; cx < BLOCK; cx++) {
            const x = p.x + bx * BLOCK + cx;
            const y = row + by * BLOCK + cy;
            const shade = this.pickShade();
            if (topExposed && cy < 2 && this.rng.next() < SPLASH_FRACTION) {
              this.flyers.push({
                x: x + 0.5,
                y: Math.max(0, y) + 0.5,
                vx: (this.rng.next() - 0.5) * 70,
                vy: -(20 + this.rng.next() * 55),
                color: p.color,
                shade,
              });
            } else if (grid.isEmpty(x, y)) {
              grid.set(x, y, p.color, shade);
            }
          }
        }
      }
    }
    this.piece = null;
    this.chain = 0;
    this.stillSteps = 0;
    this.emit({ type: 'land' });
    if (this.grid.hasSandAbove(DANGER_ROW)) this.awaitingSpawn = true;
    else this.spawn();
  }

  /** Move loose grains ballistically; they rejoin the grid on contact. */
  private advanceFlyers(): void {
    const { grid } = this;
    const keep: Flyer[] = [];
    for (const f of this.flyers) {
      f.vy += FLYER_GRAVITY * DT;
      const dx = f.vx * DT;
      const dy = f.vy * DT;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
      let landed = false;
      for (let i = 0; i < n && !landed; i++) {
        let nx = f.x + dx / n;
        const ny = f.y + dy / n;
        if (nx < 0 || nx >= grid.cols) {
          f.vx = -f.vx * 0.4;
          nx = Math.max(0, Math.min(grid.cols - 0.01, nx));
        }
        const cx = Math.floor(nx);
        const cy = Math.floor(ny);
        if (f.vy > 0 && (cy >= grid.rows || (cy >= 0 && grid.color[cy * grid.cols + cx] !== 0))) {
          this.settleFlyer(f);
          landed = true;
        } else {
          f.x = nx;
          f.y = ny;
        }
      }
      if (!landed) keep.push(f);
    }
    this.flyers = keep;
  }

  private settleFlyer(f: Flyer): void {
    const { grid } = this;
    const x = Math.max(0, Math.min(grid.cols - 1, Math.floor(f.x)));
    for (let y = Math.min(grid.rows - 1, Math.max(0, Math.floor(f.y))); y >= 0; y--) {
      if (grid.isEmpty(x, y)) {
        grid.set(x, y, f.color, f.shade);
        return;
      }
    }
  }

  private spawn(): void {
    this.piece = spawnPiece(this.next, this.aimX, this.grid.cols);
    this.next = this.generator.next(this.palette());
    this.aimMs = 0;
  }

  private checkClears(): void {
    const comps = this.clearSystem.findSpanning(this.grid);
    if (comps.length === 0) return;
    this.chain++;
    this.maxChain = Math.max(this.maxChain, this.chain);
    const { clearing } = this.grid;
    for (const comp of comps) {
      for (const i of comp.cells) clearing[i] = 1;
      const points = pointsForClear(comp.cells.length, this.chain);
      this.score += points;
      this.lines++;
      if (this.lines % LINES_PER_CLEAR_CHARGE === 0) this.clearCharges++;
      this.emit({ type: 'clear', cells: comp.cells.length, chain: this.chain, points, color: comp.color });
    }
    this.clearFlash = CLEAR_FLASH_STEPS;
    this.grid.version++;
    this.checkMilestones();
  }

  /** Mark every grain of the highest-reaching colour for removal. */
  private wipeTallestColor(): boolean {
    const { color, clearing, size } = this.grid;
    let target = 0;
    for (let i = 0; i < size; i++) {
      if (color[i] !== 0 && clearing[i] === 0) {
        target = color[i];
        break;
      }
    }
    if (!target) return false;
    for (let i = 0; i < size; i++) if (color[i] === target) clearing[i] = 1;
    this.clearFlash = CLEAR_FLASH_STEPS;
    this.grid.version++;
    return true;
  }

  private removeClearing(): void {
    const { clearing, size } = this.grid;
    for (let i = 0; i < size; i++) if (clearing[i] !== 0) this.grid.removeAt(i);
    this.grid.version++;
    this.stillSteps = 0;
  }

  /** With the board still and nothing pending: has the sand reached the red line? */
  private checkSettledOutcome(): void {
    if (this.flyers.length > 0 || (this.piece && this.piece.phase === 'dropping')) return;
    if (this.grid.hasSandAbove(DANGER_ROW)) {
      this.status = 'overflow';
      this.emit({ type: 'overflow' });
    }
  }

  private checkMilestones(): void {
    const n = milestonesPassed(this.score);
    while (this.milestoneCount < n) {
      this.milestoneCount++;
      this.emit({ type: 'milestone', index: this.milestoneCount, colors: this.palette().length });
    }
  }

  /** Colour ids pieces are drawn from right now. */
  palette(): number[] {
    let n = colorsForScore(this.score);
    if (this.mode === 'speed') n = Math.max(n, colorsForSpeed(this.speedLevel));
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  private gameOver(): void {
    this.status = 'gameover';
    this.renderVersion++;
    this.emit({ type: 'gameover', score: this.score });
  }

  // ------------------------------------------------------------------- output

  /** How far (0..1) real time has run past the last fixed step; used to interpolate motion. */
  get interpolation(): number {
    return Math.min(1, this.accumulator / STEP_MS);
  }

  /** Piece top edge to draw this frame, between its previous and current step positions. */
  pieceDrawY(p: ActivePiece): number {
    if (p.phase !== 'dropping' || this.status !== 'playing') return p.y;
    return p.prevY + (p.y - p.prevY) * this.interpolation;
  }

  getHud(): HudState {
    const { prev, next } = milestoneRange(this.score);
    return {
      status: this.status,
      mode: this.mode,
      score: this.score,
      lines: this.lines,
      chain: this.chain,
      maxChain: this.maxChain,
      next: this.next,
      prevTarget: prev,
      nextTarget: next,
      colors: this.palette().length,
      speedLevel: this.speedLevel,
      canSkip: this.canSkip && !!this.piece && this.piece.phase === 'aiming',
      clearCharges: this.clearCharges,
      canSave: this.canSave(),
      dropped: this.dropped,
    };
  }
}
