/** Sand palette; index i is colour id i + 1 in the engine. Order = order colours join the game. */
export const SAND_COLORS = [
  '#12D8FF', // cyan
  '#22EE3A', // green
  '#FF3460', // red
  '#FFD21A', // yellow
  '#B44DFF', // purple
  '#FF8C1A', // orange
] as const;

export const SAND_NAMES = ['Cyan', 'Green', 'Red', 'Yellow', 'Purple', 'Orange'] as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Mix toward white (amount > 0) or black (amount < 0). */
export function shadeRgb(hex: string, amount: number): [number, number, number] {
  const t = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return hexToRgb(hex).map((c) => clamp(c * (1 - a) + t * a)) as [number, number, number];
}

export function rgbHex([r, g, b]: [number, number, number]): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Grain shades: base, slightly light, slightly dark, dark speckle (matches engine SHADES = 4). */
export const SAND_RGB = SAND_COLORS.map((c) => [shadeRgb(c, 0), shadeRgb(c, 0.16), shadeRgb(c, -0.14), shadeRgb(c, -0.38)]);

export const colors = {
  // gameplay background (blue-indigo) and menu background (purple)
  gameTop: '#36418C',
  gameBottom: '#4453A6',
  menuTop: '#4A12A6',
  menuBottom: '#8E58E6',
  stripe: 'rgba(255,255,255,0.05)',

  board: '#2D3363',
  boardBorder: '#4B5596',
  boardInner: '#262B57',
  dangerLine: '#D23452',

  panel: '#2E3566',
  panelBorder: '#5A6ABF',
  panelDivider: '#4B5596',
  chip: '#262B57',

  sideBtn: '#2A3060',
  sideBtnShadow: '#1B1F45',

  green: '#3DDC3D',
  greenShadow: '#25A62A',
  blue: '#76BDF5',
  blueShadow: '#4A8ED6',
  orange: '#FF8A1C',
  orangeShadow: '#D2620A',
  purplePanel: '#5B1FB8',
  purplePanelBorder: '#7A45D9',
  ribbon: '#F0315A',
  ribbonShadow: '#B81E42',

  text: '#FFFFFF',
  textDim: '#B9C1EE',
  textFaint: '#7C86C4',
  gold: '#FFD21F',
  goldDark: '#C99A00',
  outline: '#1A1440',
  popOutline: '#6A2BD9',
  lock: '#C98A3A',
  danger: '#FF3B3B',
} as const;
