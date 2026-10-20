import { ClearSystem } from '../ClearSystem';
import { collides } from '../CollisionSystem';
import { AUTO_DROP_SLOW_MS, BLOCK, CLEAR_FLASH_STEPS, COLS, DANGER_ROW, ROWS, SETTLE_STEPS, STEP_MS } from '../constants';
import { GameEngine } from '../GameEngine';
import { GameLoop, type FrameScheduler } from '../GameLoop';
import { GameSession } from '../GameSession';
import { ParticleGrid } from '../ParticleGrid';
import { PieceGenerator, SHAPE_IDS, SHAPES, matrixFor, matrixHeightCells, matrixWidthCells, rotateMatrix, spawnPiece } from '../PieceGenerator';
import { Random } from '../Random';
import { stepSand } from '../SandPhysics';
import {
  autoDropDelayMs,
  colorsForScore,
  milestoneRange,
  pointsForClear,
  speedLevelFor,
} from '../ScoreSystem';
import type { GameEvent } from '../types';

function settle(grid: ParticleGrid, rng = new Random(1), max = 800): number {
  let pass = 0;
  for (let i = 0; i < max; i++) if (stepSand(grid, rng, pass++) === 0) return i;
  return max;
}

function fillRow(grid: ParticleGrid, y: number, color: number, from = 0, to = grid.cols - 1) {
  for (let x = from; x <= to; x++) grid.set(x, y, color);
}

/** Run fixed steps until the predicate holds (or fail after `max`). */
function runUntil(engine: GameEngine, pred: () => boolean, max = 8000) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    engine.step();
  }
  throw new Error('condition not reached');
}

/** An engine with no hovering piece, so tests own the board. */
function bareEngine(seed: number) {
  const e = new GameEngine({ seed, mode: 'classic' });
  e.piece = null;
  return e;
}

const totalGrains = (e: GameEngine) => e.grid.count() + e.flyers.length;

describe('pieces', () => {
  test('1. every shape/orientation spawns inside the board, above the red line', () => {
    const grid = new ParticleGrid(COLS, ROWS);
    for (const shape of SHAPE_IDS) {
      for (let turns = 0; turns < 4; turns++) {
        for (const cx of [-50, 0, COLS / 3, COLS / 2, COLS, 500]) {
          const p = spawnPiece({ shape, color: 1, turns }, cx);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x + matrixWidthCells(p.matrix)).toBeLessThanOrEqual(COLS);
          expect(p.y).toBeGreaterThanOrEqual(0);
          if (shape !== 'I' || turns % 2 === 0) expect(p.y + matrixHeightCells(p.matrix)).toBeLessThan(DANGER_ROW);
          expect(collides(grid, p.matrix, p.x, p.y)).toBe(false);
          expect(p.phase).toBe('aiming');
        }
      }
    }
  });

  test('generator uses a shuffled bag and only colours from the palette', () => {
    const gen = new PieceGenerator(new Random(42));
    const seen = new Set<string>();
    for (let i = 0; i < SHAPE_IDS.length; i++) {
      const spec = gen.next([1, 3]);
      seen.add(spec.shape);
      expect([1, 3]).toContain(spec.color);
      if (spec.shape === 'I') expect(spec.turns).toBe(0);
    }
    expect(seen.size).toBe(SHAPE_IDS.length);
  });

  test('rotation keeps block count', () => {
    for (const id of SHAPE_IDS) {
      const count = (m: number[][]) => m.flat().reduce((a, b) => a + b, 0);
      expect(count(rotateMatrix(SHAPES[id]))).toBe(count(SHAPES[id]));
      expect(count(matrixFor({ shape: id, color: 1, turns: 3 }))).toBe(count(SHAPES[id]));
    }
  });

  test('2. aiming respects board boundaries', () => {
    const e = new GameEngine({ seed: 3 });
    const p = e.piece!;
    e.aim(-100);
    expect(p.x).toBe(0);
    e.aim(1000);
    expect(p.x + matrixWidthCells(p.matrix)).toBe(COLS);
    e.moveBy(1);
    expect(p.x + matrixWidthCells(p.matrix)).toBe(COLS);
    e.moveBy(-100);
    expect(p.x).toBe(0);
    // aiming never lets the piece fall
    const y = p.y;
    for (let i = 0; i < 600; i++) e.step();
    expect(p.y).toBe(y);
    expect(p.phase).toBe('aiming');
  });

  test('3. a dropped piece lands on sand and turns into grains of its colour', () => {
    const e = new GameEngine({ seed: 5 });
    // alternating colours 5/6 (not in play) so the floor can never clear
    for (let x = 0; x < COLS; x++) e.grid.set(x, ROWS - 1, 5 + (x % 2));
    const p = e.piece!;
    const cellsInPiece = p.matrix.flat().filter(Boolean).length * BLOCK * BLOCK;
    const events: GameEvent[] = [];
    e.subscribe((ev) => events.push(ev));
    e.drop();
    expect(p.phase).toBe('dropping');
    runUntil(e, () => events.some((ev) => ev.type === 'land'));
    expect(totalGrains(e)).toBe(COLS + cellsInPiece);
    expect(e.flyers.length).toBeGreaterThan(0); // landing splash
    for (let x = 0; x < COLS; x++) expect(e.grid.get(x, ROWS - 1)).toBe(5 + (x % 2));
    // next piece is already hovering
    expect(e.piece).not.toBeNull();
    expect(e.piece!.phase).toBe('aiming');
    // splash grains rejoin the grid
    runUntil(e, () => e.flyers.length === 0);
    expect(e.grid.count()).toBe(COLS + cellsInPiece);
  });

  test('a drop is smooth: a full-height fall takes about 0.6 s and accelerates', () => {
    const e = new GameEngine({ seed: 6 });
    const p = e.piece!;
    e.drop();
    const ys: number[] = [];
    let steps = 0;
    while (e.piece === p && steps < 600) {
      e.step();
      ys.push(p.y);
      steps++;
    }
    const seconds = (steps * STEP_MS) / 1000;
    expect(seconds).toBeGreaterThan(0.45);
    expect(seconds).toBeLessThan(0.8);
    // every step moves less than one block, and later steps move further than early ones
    const deltas = ys.slice(1).map((y, i) => y - ys[i]);
    expect(Math.max(...deltas)).toBeLessThan(BLOCK);
    expect(deltas[deltas.length - 2]).toBeGreaterThan(deltas[0]);
  });

  test('drawn position interpolates between fixed steps', () => {
    const e = new GameEngine({ seed: 7 });
    const p = e.piece!;
    e.drop();
    e.tick(STEP_MS * 3);
    for (const extra of [0, STEP_MS * 0.25, STEP_MS * 0.5, STEP_MS * 0.9]) {
      const f = new GameEngine({ seed: 7 });
      f.drop();
      f.tick(STEP_MS * 3 + extra);
      const q = f.piece!;
      const drawY = f.pieceDrawY(q);
      expect(drawY).toBeGreaterThanOrEqual(q.prevY);
      expect(drawY).toBeLessThanOrEqual(q.y);
    }
    // an aiming piece is drawn exactly where it is
    expect(e.pieceDrawY(spawnPiece(e.next))).toBe(spawnPiece(e.next).y);
    expect(p.phase).toBe('dropping');
  });

  test('skip replaces the hovering piece once per drop', () => {
    const e = new GameEngine({ seed: 8 });
    const next = e.next;
    expect(e.skip()).toBe(true);
    expect(e.piece!.shape).toBe(next.shape);
    expect(e.piece!.color).toBe(next.color);
    expect(e.skip()).toBe(false);
    e.drop();
    runUntil(e, () => e.piece !== null && e.piece.phase === 'aiming' && e.dropped === 1);
    expect(e.skip()).toBe(true);
  });

  test('classic never auto-drops; speed mode drops on a timer', () => {
    const c = new GameEngine({ seed: 9, mode: 'classic' });
    for (let i = 0; i < (AUTO_DROP_SLOW_MS * 2) / STEP_MS; i++) c.step();
    expect(c.dropped).toBe(0);
    const s = new GameEngine({ seed: 9, mode: 'speed' });
    for (let i = 0; i < (AUTO_DROP_SLOW_MS + 100) / STEP_MS; i++) s.step();
    expect(s.dropped).toBe(1);
  });
});

describe('sand physics', () => {
  test('4. particles move down when space is available', () => {
    const g = new ParticleGrid(5, 5);
    g.set(2, 0, 1);
    stepSand(g, new Random(1), 0);
    expect(g.get(2, 0)).toBe(0);
    expect(g.get(2, 1)).toBe(1);
    settle(g);
    expect(g.get(2, 4)).toBe(1);
  });

  test('5. particles slide diagonally when blocked', () => {
    const g = new ParticleGrid(5, 5);
    g.set(2, 4, 1);
    g.set(2, 3, 2);
    stepSand(g, new Random(1), 0);
    expect(g.get(2, 3)).toBe(0);
    expect(g.get(1, 4) === 2 || g.get(3, 4) === 2).toBe(true);
  });

  test('diagonal choice is unbiased', () => {
    let left = 0;
    const rng = new Random(9);
    for (let t = 0; t < 400; t++) {
      const g = new ParticleGrid(5, 3);
      g.set(2, 2, 1);
      g.set(2, 1, 2);
      stepSand(g, rng, t);
      if (g.get(1, 2) === 2) left++;
    }
    expect(left).toBeGreaterThan(150);
    expect(left).toBeLessThan(250);
  });

  test('6. particles never overlap (grain count conserved)', () => {
    const g = new ParticleGrid(COLS, ROWS);
    const rng = new Random(7);
    for (let i = 0; i < 5000; i++) {
      const x = rng.int(COLS);
      const y = rng.int(ROWS / 2);
      if (g.isEmpty(x, y)) g.set(x, y, 1 + rng.int(4));
    }
    const before = g.count();
    for (let s = 0; s < 300; s++) {
      stepSand(g, rng, s);
      expect(g.count()).toBe(before);
    }
  });

  test('active-row tracking never strands a movable grain', () => {
    const g = new ParticleGrid(COLS, ROWS);
    const rng = new Random(77);
    const canMove = () => {
      for (let y = 0; y < ROWS - 1; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!g.get(x, y)) continue;
          if (g.isEmpty(x, y + 1) || g.isEmpty(x - 1, y + 1) || g.isEmpty(x + 1, y + 1)) return true;
        }
      }
      return false;
    };
    for (let round = 0; round < 6; round++) {
      // drop a few blobs, also carve holes (removals) inside the pile
      for (let i = 0; i < 400; i++) {
        const x = rng.int(COLS);
        const y = rng.int(ROWS / 3);
        if (g.isEmpty(x, y)) g.set(x, y, 1 + rng.int(3));
      }
      for (let i = 0; i < 150; i++) {
        const idx = rng.int(g.size);
        if (g.color[idx]) g.removeAt(idx);
      }
      let pass = round * 1000;
      while (stepSand(g, rng, pass++) > 0);
      expect(g.activeBottom).toBeLessThan(g.activeTop);
      expect(canMove()).toBe(false);
    }
  });

  test('7. sand settles into gaps and becomes stable', () => {
    const g = new ParticleGrid(9, 6);
    fillRow(g, 5, 1, 0, 3);
    fillRow(g, 5, 1, 5, 8);
    g.set(4, 0, 2);
    settle(g);
    expect(g.get(4, 5)).toBe(2);
    expect(stepSand(g, new Random(2), 1)).toBe(0);
  });

  test('a tall column collapses into a pile', () => {
    const g = new ParticleGrid(21, 12);
    for (let y = 0; y < 12; y++) g.set(10, y, 1);
    settle(g);
    let maxHeight = 0;
    for (let x = 0; x < 21; x++) {
      let h = 0;
      for (let y = 0; y < 12; y++) if (g.get(x, y)) h++;
      maxHeight = Math.max(maxHeight, h);
    }
    expect(maxHeight).toBeLessThan(12);
    expect(g.count()).toBe(12);
  });
});

describe('clearing', () => {
  test('8. a connected wall-to-wall path clears', () => {
    const g = new ParticleGrid(10, 6);
    fillRow(g, 5, 1, 0, 4);
    g.set(4, 4, 1);
    fillRow(g, 4, 1, 5, 9);
    const comps = new ClearSystem(10, 6, 4).findSpanning(g);
    expect(comps).toHaveLength(1);
    expect(comps[0].color).toBe(1);
    expect(comps[0].cells).toHaveLength(11);
  });

  test('9. matching grains without a connected path do not clear', () => {
    const g = new ParticleGrid(10, 6);
    fillRow(g, 5, 1, 0, 4);
    fillRow(g, 5, 2, 5, 5);
    fillRow(g, 5, 1, 6, 9);
    expect(new ClearSystem(10, 6, 4).findSpanning(g)).toHaveLength(0);
    const d = new ParticleGrid(4, 4);
    d.set(0, 3, 1);
    d.set(1, 2, 1);
    d.set(2, 1, 1);
    d.set(3, 0, 1);
    expect(new ClearSystem(4, 4, 4).findSpanning(d)).toHaveLength(0);
    expect(new ClearSystem(4, 4, 8).findSpanning(d)).toHaveLength(1);
  });

  test('10. unrelated colours remain after a clear and fall into place', () => {
    const e = bareEngine(11);
    fillRow(e.grid, ROWS - 1, 1);
    fillRow(e.grid, ROWS - 2, 2, 0, 5);
    const events: GameEvent[] = [];
    e.subscribe((ev) => events.push(ev));
    runUntil(e, () => events.some((ev) => ev.type === 'clear'));
    runUntil(e, () => e.clearFlash === 0);
    for (let i = 0; i < 60; i++) e.step();
    let c1 = 0;
    let c2 = 0;
    for (let i = 0; i < e.grid.size; i++) {
      if (e.grid.color[i] === 1) c1++;
      if (e.grid.color[i] === 2) c2++;
    }
    expect(c1).toBe(0);
    expect(c2).toBe(6);
    expect(e.grid.get(0, ROWS - 1)).toBe(2);
  });

  test('11. chain reactions are processed safely', () => {
    const e = bareEngine(13);
    const R = ROWS;
    const half = COLS / 2;
    // Colour 1: full floor row plus a right-hand shelf -> spans, clears first.
    fillRow(e.grid, R - 1, 1);
    fillRow(e.grid, R - 2, 1, half, COLS - 1);
    // Colour 2: left half at R-2, right half at R-3 (only diagonal contact -> not connected).
    fillRow(e.grid, R - 2, 2, 0, half - 1);
    fillRow(e.grid, R - 3, 2, half, COLS - 1);
    const clears: Extract<GameEvent, { type: 'clear' }>[] = [];
    e.subscribe((ev) => ev.type === 'clear' && clears.push(ev));
    runUntil(e, () => clears.length >= 1);
    expect(clears[0]).toMatchObject({ color: 1, chain: 1, cells: COLS + half });
    runUntil(e, () => clears.length >= 2);
    expect(clears[1]).toMatchObject({ color: 2, chain: 2, cells: COLS });
    expect(clears[1].points).toBe(pointsForClear(COLS, 2));
    runUntil(e, () => e.clearFlash === 0);
    for (let i = 0; i < 30; i++) e.step();
    expect(e.grid.count()).toBe(0);
    expect(e.maxChain).toBe(2);
    expect(e.lines).toBe(2);
    expect(e.status).toBe('playing');
  });
});

describe('score, milestones, colours', () => {
  test('12. points, chain bonus and progression', () => {
    expect(pointsForClear(400, 1)).toBe(100);
    expect(pointsForClear(400, 2)).toBe(200);
    expect(pointsForClear(401, 1)).toBe(101);
    expect(milestoneRange(0)).toEqual({ prev: 0, next: 100 });
    expect(milestoneRange(608)).toEqual({ prev: 100, next: 800 });
    expect(milestoneRange(2072)).toEqual({ prev: 800, next: 3200 });
    expect(colorsForScore(0)).toBe(2);
    expect(colorsForScore(608)).toBe(2);
    expect(colorsForScore(2072)).toBe(3);
    expect(colorsForScore(1e9)).toBe(6);
    expect(speedLevelFor(0)).toBe(1);
    expect(speedLevelFor(1e9)).toBe(10);
    expect(autoDropDelayMs(10)).toBeLessThan(autoDropDelayMs(1));
  });

  test('engine awards points and adds colours at milestones', () => {
    const e = bareEngine(23);
    expect(e.palette()).toEqual([1, 2]);
    e.addBonus(900);
    expect(e.palette()).toEqual([1, 2, 3]);
    fillRow(e.grid, ROWS - 1, 1);
    runUntil(e, () => e.lines === 1);
    expect(e.score).toBe(900 + pointsForClear(COLS, 1));
  });

  test('CLEAR power-up wipes the tallest colour and uses a charge', () => {
    const e = bareEngine(24);
    fillRow(e.grid, ROWS - 1, 5, 0, 10);
    for (let y = ROWS - 10; y < ROWS - 1; y++) e.grid.set(50, y, 3);
    for (let i = 0; i < 20; i++) e.step();
    const charges = e.clearCharges;
    expect(e.useClear()).toBe(true);
    expect(e.clearCharges).toBe(charges - 1);
    runUntil(e, () => e.clearFlash === 0);
    let c3 = 0;
    for (let i = 0; i < e.grid.size; i++) if (e.grid.color[i] === 3) c3++;
    expect(c3).toBe(0);
    expect(e.score).toBe(0);
  });
});

describe('overflow, game over and restart', () => {
  /** Alternating-colour wall reaching the danger zone (cannot clear). */
  function buildTower(e: GameEngine) {
    for (let y = DANGER_ROW - 2; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) e.grid.set(x, y, 1 + ((x + y) % 2));
    }
  }

  test('13. overflow triggers when settled sand reaches the red line', () => {
    const e = bareEngine(29);
    buildTower(e);
    const events: GameEvent[] = [];
    e.subscribe((ev) => events.push(ev));
    runUntil(e, () => e.status !== 'playing');
    expect(e.status).toBe('overflow');
    e.giveUp();
    expect(e.status).toBe('gameover');
    expect(events.map((ev) => ev.type)).toEqual(expect.arrayContaining(['overflow', 'gameover']));
  });

  test('save run wipes the tallest colour once and continues', () => {
    const e = bareEngine(30);
    buildTower(e);
    runUntil(e, () => e.status === 'overflow');
    expect(e.saveRun()).toBe(true);
    expect(e.status).toBe('playing');
    runUntil(e, () => e.clearFlash === 0);
    for (let i = 0; i < 300; i++) e.step();
    // one colour of the tower is gone and the rest collapsed below the line
    expect(e.grid.hasSandAbove(DANGER_ROW)).toBe(false);
    expect(e.saveRun()).toBe(false); // not overflowing
    // second overflow: the free save is used, a CLEAR charge pays for the next one
    e.clearCharges = 1;
    buildTower(e);
    runUntil(e, () => e.status === 'overflow');
    expect(e.saveRun()).toBe(true);
    expect(e.clearCharges).toBe(0);
    runUntil(e, () => e.clearFlash === 0);
    buildTower(e);
    runUntil(e, () => e.status === 'overflow');
    expect(e.canSave()).toBe(false);
    expect(e.saveRun()).toBe(false);
  });

  test('no new piece appears once a landing pushes sand over the red line', () => {
    const e = new GameEngine({ seed: 32 });
    // alternating-colour pile whose top is just under the red line (cannot clear)
    for (let y = DANGER_ROW + 2; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) e.grid.set(x, y, 1 + ((x + y) % 2));
    }
    let landed = false;
    e.subscribe((ev) => {
      if (ev.type === 'land') landed = true;
    });
    // keep tapping "drop" every step, like a player spamming the board
    for (let i = 0; i < 3000 && e.status === 'playing'; i++) {
      e.drop();
      e.step();
      if (landed && e.grid.hasSandAbove(DANGER_ROW)) {
        // while sand sits over the line, no new piece may be spawned
        expect(e.piece).toBeNull();
      }
    }
    expect(landed).toBe(true);
    expect(e.status).toBe('overflow');
    expect(e.dropped).toBe(1);
  });

  test('after Save this run the held-back piece appears again', () => {
    const e = new GameEngine({ seed: 33 });
    for (let y = DANGER_ROW + 2; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) e.grid.set(x, y, 1 + ((x + y) % 2));
    }
    for (let i = 0; i < 3000 && e.status === 'playing'; i++) {
      e.drop();
      e.step();
    }
    expect(e.status).toBe('overflow');
    expect(e.piece).toBeNull();
    expect(e.saveRun()).toBe(true);
    runUntil(e, () => e.piece !== null);
    expect(e.grid.hasSandAbove(DANGER_ROW)).toBe(false);
    expect(e.status).toBe('playing');
  });

  test('no overflow while sand above the red line is still falling', () => {
    const e = bareEngine(31);
    e.grid.set(5, 0, 1);
    for (let i = 0; i < SETTLE_STEPS + 200; i++) e.step();
    expect(e.status).toBe('playing');
  });

  test('14. restart resets everything', () => {
    const e = new GameEngine({ seed: 37, mode: 'speed' });
    for (let i = 0; i < 3000 && e.status === 'playing'; i++) {
      if (i % 20 === 0) e.drop();
      e.step();
    }
    e.score = 999;
    e.clearFlash = CLEAR_FLASH_STEPS;
    e.useClear();
    e.reset('classic');
    expect(e.status).toBe('playing');
    expect(e.mode).toBe('classic');
    expect(e.score).toBe(0);
    expect(e.lines).toBe(0);
    expect(e.chain).toBe(0);
    expect(e.dropped).toBe(0);
    expect(e.speedLevel).toBe(1);
    expect(e.elapsedMs).toBe(0);
    expect(e.clearFlash).toBe(0);
    expect(e.flyers).toHaveLength(0);
    expect(e.saveUsed).toBe(false);
    expect(e.grid.count()).toBe(0);
    expect(e.piece!.phase).toBe('aiming');
  });

  test('same seed gives the same game', () => {
    const a = new GameEngine({ seed: 41 });
    const b = new GameEngine({ seed: 41 });
    for (let i = 0; i < 3000; i++) {
      if (i % 45 === 0) {
        a.aim((i * 7) % COLS);
        b.aim((i * 7) % COLS);
        a.drop();
        b.drop();
      }
      a.step();
      b.step();
    }
    expect(Array.from(a.grid.color)).toEqual(Array.from(b.grid.color));
    expect(a.score).toBe(b.score);
  });
});

describe('pause / loop', () => {
  function fakeScheduler() {
    let id = 0;
    const pending = new Map<number, (t: number) => void>();
    let now = 0;
    const s: FrameScheduler = {
      request: (cb) => {
        pending.set(++id, cb);
        return id;
      },
      cancel: (i) => void pending.delete(i),
      now: () => now,
    };
    return {
      s,
      pending,
      flush(dt = 16) {
        now += dt;
        const cbs = [...pending.values()];
        pending.clear();
        cbs.forEach((cb) => cb(now));
      },
    };
  }

  test('15. pause/resume never creates duplicate loops', () => {
    const f = fakeScheduler();
    let frames = 0;
    const loop = new GameLoop(() => frames++, f.s);
    loop.start();
    loop.start();
    loop.start();
    expect(f.pending.size).toBe(1);
    f.flush();
    expect(frames).toBe(1);
    loop.stop();
    loop.start();
    loop.stop();
    loop.start();
    expect(f.pending.size).toBe(1);
    f.flush();
    f.flush();
    expect(frames).toBe(3);
    loop.stop();
    expect(f.pending.size).toBe(0);
    f.flush();
    expect(frames).toBe(3);
  });

  test('15b. session pause/resume/restart keeps exactly one pending frame', () => {
    const f = fakeScheduler();
    const session = new GameSession('classic', f.s, 99);
    let frames = 0;
    session.subscribeFrame(() => frames++);
    session.start();
    session.start();
    expect(f.pending.size).toBe(1);
    f.flush();
    session.pause();
    expect(f.pending.size).toBe(0);
    expect(session.engine.status).toBe('paused');
    session.resume();
    session.resume();
    expect(f.pending.size).toBe(1);
    session.restart();
    session.restart();
    expect(f.pending.size).toBe(1);
    session.dispose();
    expect(f.pending.size).toBe(0);
    expect(frames).toBeGreaterThan(0);
  });

  test('paused engine does not advance', () => {
    const e = new GameEngine({ seed: 43 });
    e.drop();
    e.tick(50);
    const y = e.piece!.y;
    e.pause();
    e.tick(1000);
    e.aim(0);
    expect(e.piece!.y).toBe(y);
    e.resume();
    e.tick(50);
    expect(e.piece!.y).toBeGreaterThan(y);
  });
});
