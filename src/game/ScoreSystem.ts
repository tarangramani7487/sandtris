import {
  AUTO_DROP_FAST_MS,
  AUTO_DROP_SLOW_MS,
  CELLS_PER_POINT,
  MAX_COLORS,
  MILESTONES,
  SPEED_LEVELS,
  SPEED_LEVEL_MS,
  START_COLORS,
} from './constants';

/** Chain n (1 = first clear after a drop) multiplies points by n. */
export function pointsForClear(cells: number, chain: number): number {
  return Math.ceil(cells / CELLS_PER_POINT) * Math.max(1, chain);
}

/** Number of milestones reached by `score`. */
export function milestonesPassed(score: number): number {
  let n = 0;
  while (n < MILESTONES.length && score >= MILESTONES[n]) n++;
  return n;
}

/** Progress-bar bounds for the current score. */
export function milestoneRange(score: number): { prev: number; next: number } {
  const n = milestonesPassed(score);
  const prev = n === 0 ? 0 : MILESTONES[n - 1];
  const next = n < MILESTONES.length ? MILESTONES[n] : prev * 2;
  return { prev, next };
}

/** Colours in play: two at first, one more per milestone after the first. */
export function colorsForScore(score: number): number {
  return Math.min(MAX_COLORS, Math.max(START_COLORS, 1 + milestonesPassed(score)));
}

/** Speeding-up mode level (1..10) from elapsed play time. */
export function speedLevelFor(elapsedMs: number): number {
  return Math.min(SPEED_LEVELS, 1 + Math.floor(elapsedMs / SPEED_LEVEL_MS));
}

/** Speeding-up mode: extra colours join at speed 4 and 7. */
export function colorsForSpeed(level: number): number {
  return START_COLORS + (level >= 4 ? 1 : 0) + (level >= 7 ? 1 : 0);
}

export function autoDropDelayMs(level: number): number {
  const t = (level - 1) / (SPEED_LEVELS - 1);
  return Math.round(AUTO_DROP_SLOW_MS + (AUTO_DROP_FAST_MS - AUTO_DROP_SLOW_MS) * t);
}
