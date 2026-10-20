import { GameEngine } from './GameEngine';
import { GameLoop, type FrameScheduler } from './GameLoop';
import type { GameMode, HudState } from './types';

function hudChanged(a: HudState, b: HudState): boolean {
  for (const k of Object.keys(b) as (keyof HudState)[]) {
    if (a[k] !== b[k]) return true;
  }
  return false;
}

/**
 * Binds one engine to one frame loop. Each frame ticks the engine, notifies
 * frame subscribers (the renderer) and pushes a HUD snapshot only when a
 * displayed value changed. The loop stops itself when play stops.
 */
export class GameSession {
  readonly engine: GameEngine;
  readonly loop: GameLoop;
  private frameSubs = new Set<() => void>();
  private hud: HudState;
  private onHud: ((hud: HudState) => void) | null = null;

  constructor(mode: GameMode, scheduler?: FrameScheduler, seed?: number) {
    this.engine = new GameEngine({ mode, seed });
    this.hud = this.engine.getHud();
    this.loop = new GameLoop((dt) => {
      this.engine.tick(dt);
      this.refresh();
      if (this.engine.status !== 'playing') this.loop.stop();
    }, scheduler);
  }

  /** Register the HUD listener (one at a time). */
  connect(onHud: (hud: HudState) => void): void {
    this.onHud = onHud;
  }

  getHud(): HudState {
    return this.hud;
  }

  subscribeFrame = (fn: () => void): (() => void) => {
    this.frameSubs.add(fn);
    return () => {
      this.frameSubs.delete(fn);
    };
  };

  /** Push the current state to the renderer and (if changed) the HUD. */
  refresh(): void {
    this.frameSubs.forEach((fn) => fn());
    const next = this.engine.getHud();
    if (hudChanged(this.hud, next)) {
      this.hud = next;
      this.onHud?.(next);
    }
  }

  start(): void {
    if (this.engine.status === 'playing') this.loop.start();
  }

  pause(): void {
    this.engine.pause();
    this.loop.stop();
    this.refresh();
  }

  resume(): void {
    this.engine.resume();
    this.start();
    this.refresh();
  }

  restart(mode?: GameMode): void {
    this.loop.stop();
    this.engine.reset(mode ?? this.engine.mode);
    this.loop.start();
    this.refresh();
  }

  dispose(): void {
    this.loop.stop();
    this.onHud = null;
  }
}
