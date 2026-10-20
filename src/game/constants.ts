/** Board is 12 blocks wide and 18 blocks tall; each block is BLOCK x BLOCK grains. */
export const BLOCK = 8;
/** Simulation grid width in sand cells. */
export const COLS = 12 * BLOCK;
/** Simulation grid height in sand cells. */
export const ROWS = 18 * BLOCK;

/** Fixed simulation rate. */
export const SIM_HZ = 60;
export const STEP_MS = 1000 / SIM_HZ;
/** Upper bound on fixed steps processed in one frame (avoids spiral of death). */
export const MAX_STEPS_PER_TICK = 6;
/** Sand gravity sub-steps per fixed step (cells a grain can fall per step). */
export const SAND_SUBSTEPS = 4;

/** Consecutive motionless steps before the board counts as settled. */
export const SETTLE_STEPS = 4;
/** Steps a cleared component sparkles before it is removed. */
export const CLEAR_FLASH_STEPS = 32;

/** Red line: sand that settles above this row overflows the board. */
export const DANGER_ROW = 3 * BLOCK + 2;

/**
 * A dropped piece accelerates gently from DROP_START_SPEED up to DROP_MAX_SPEED
 * (cells/s): a full-height fall takes about 0.6 s, so the drop reads as smooth motion.
 */
export const DROP_START_SPEED = 50;
export const DROP_ACCEL = 600;
export const DROP_MAX_SPEED = 260;

/** Fraction of the top layer of a landing piece that splashes into loose grains. */
export const SPLASH_FRACTION = 0.3;
export const FLYER_GRAVITY = 260;

/** 4 = orthogonal connectivity for colour clears; 8 also joins diagonal grains. */
export const CLEAR_CONNECTIVITY: 4 | 8 = 4;

/** Score milestones shown on the progress bar; passing them adds colours. */
export const MILESTONES = [100, 800, 3200, 8000, 16000, 32000, 64000, 128000, 256000];
export const START_COLORS = 2;
export const MAX_COLORS = 6;

/** Speeding-up mode: SPEED 1..10, one step every SPEED_LEVEL_MS. */
export const SPEED_LEVELS = 10;
export const SPEED_LEVEL_MS = 12000;
/** Auto-drop delay at speed 1 and speed 10. */
export const AUTO_DROP_SLOW_MS = 3000;
export const AUTO_DROP_FAST_MS = 700;

/** Each clear: one point per CELLS_PER_POINT grains, times the chain number. */
export const CELLS_PER_POINT = 4;

/** Daily goal (classic). */
export const DAILY_LINES = 2;
export const DAILY_BONUS = 500;

/** Charges of the CLEAR power-up at start; one more is earned every N lines. */
export const START_CLEAR_CHARGES = 1;
export const LINES_PER_CLEAR_CHARGE = 5;

/** Per-grain shade variation (gives the sand texture). */
export const SHADES = 4;
