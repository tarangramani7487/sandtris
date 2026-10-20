import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAILY_LINES } from '../game/constants';

export interface Settings {
  sound: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true };

export interface BestScores {
  classic: number;
  speed: number;
}

export interface Progress {
  seenHowTo: boolean;
}

/** Daily goal: clear DAILY_LINES lines in Classic once per day; consecutive days build a streak. */
export interface Daily {
  date: string;
  lines: number;
  done: boolean;
  streak: number;
  lastDoneDate: string | null;
}

const BEST_KEY = 'grainfall.best.v2';
const SETTINGS_KEY = 'grainfall.settings.v2';
const PROGRESS_KEY = 'grainfall.progress.v1';
const DAILY_KEY = 'grainfall.daily.v1';

async function readJson<T extends object>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is a convenience; the game keeps working without it.
  }
}

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const yesterday = () => today(new Date(Date.now() - 86400000));

export const loadBestScores = () => readJson<BestScores>(BEST_KEY, { classic: 0, speed: 0 });
export const saveBestScores = (best: BestScores) => writeJson(BEST_KEY, best);
export const loadSettings = () => readJson<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => writeJson(SETTINGS_KEY, s);
export const loadProgress = () => readJson<Progress>(PROGRESS_KEY, { seenHowTo: false });
export const saveProgress = (p: Progress) => writeJson(PROGRESS_KEY, p);

/** Load today's daily state (rolls over to a new day, resetting a broken streak). */
export async function loadDaily(): Promise<Daily> {
  const d = await readJson<Daily>(DAILY_KEY, { date: today(), lines: 0, done: false, streak: 0, lastDoneDate: null });
  if (d.date === today()) return d;
  const keepStreak = d.lastDoneDate === yesterday() || d.lastDoneDate === today();
  return { date: today(), lines: 0, done: false, streak: keepStreak ? d.streak : 0, lastDoneDate: d.lastDoneDate };
}

/** Count cleared lines toward today's goal; returns the new state and whether it was just completed. */
export function addDailyLines(d: Daily, lines: number): { daily: Daily; completed: boolean } {
  if (d.done) return { daily: d, completed: false };
  const total = Math.min(DAILY_LINES, d.lines + lines);
  if (total < DAILY_LINES) return { daily: { ...d, lines: total }, completed: false };
  return {
    daily: { ...d, lines: total, done: true, streak: d.streak + 1, lastDoneDate: d.date },
    completed: true,
  };
}

export const saveDaily = (d: Daily) => writeJson(DAILY_KEY, d);
