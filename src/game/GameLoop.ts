export type FrameScheduler = {
  request: (cb: (t: number) => void) => number;
  cancel: (id: number) => void;
  now: () => number;
};

const defaultScheduler: FrameScheduler = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
};

/**
 * A requestAnimationFrame loop that can only ever have one pending frame.
 * start() while running is a no-op, so pause/resume can never stack loops.
 */
export class GameLoop {
  private rafId: number | null = null;
  private last = 0;

  constructor(
    private onFrame: (dtMs: number) => void,
    private scheduler: FrameScheduler = defaultScheduler,
  ) {}

  get running(): boolean {
    return this.rafId !== null;
  }

  start(): void {
    if (this.rafId !== null) return;
    this.last = this.scheduler.now();
    this.rafId = this.scheduler.request(this.frame);
  }

  stop(): void {
    if (this.rafId !== null) this.scheduler.cancel(this.rafId);
    this.rafId = null;
  }

  private frame = (t: number): void => {
    if (this.rafId === null) return;
    const dt = Math.max(0, t - this.last);
    this.last = t;
    this.rafId = this.scheduler.request(this.frame);
    this.onFrame(dt);
  };
}
