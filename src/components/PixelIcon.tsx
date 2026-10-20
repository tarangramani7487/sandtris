import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

/**
 * Original pixel-art icons. Each icon is a list of rows; characters map to
 * palette entries ('.' = transparent). Rendered as one Skia path per colour.
 */
const ICONS: Record<string, { rows: string[]; palette: Record<string, string> }> = {
  trophy: {
    palette: { y: '#FFD21F', o: '#E0A800', d: '#9E7400' },
    rows: [
      '..yyyyyyyy..',
      'yyyyyyyyyyyy',
      'y.yyyyyyyy.y',
      'y.yyyyyyoo.y',
      '.yyyyyyyoo..',
      '..yyyyyyoo..',
      '...yyyyoo...',
      '.....yo.....',
      '.....yo.....',
      '....yyoo....',
      '..yyyyyyoo..',
      '..dddddddd..',
    ],
  },
  gear: {
    palette: { w: '#FFFFFF' },
    rows: [
      '....ww....',
      '.w.wwww.w.',
      '..wwwwwww.',
      '.www..www.',
      'www....www',
      'www....www',
      '.www..www.',
      '..wwwwwww.',
      '.w.wwww.w.',
      '....ww....',
    ],
  },
  home: {
    palette: { w: '#FFFFFF' },
    rows: [
      '.....ww.....',
      '....wwww....',
      '...wwwwww...',
      '..wwwwwwww..',
      '.wwwwwwwwww.',
      'wwwwwwwwwwww',
      '.ww......ww.',
      '.ww.wwww.ww.',
      '.ww.w..w.ww.',
      '.wwww..wwww.',
    ],
  },
  video: {
    palette: { w: '#FFFFFF', k: '#2A3060' },
    rows: [
      'wwwwwwwwwwww',
      'wwwwkwwwwwww',
      'wwwwkkwwwwww',
      'wwwwkkkwwwww',
      'wwwwkkkkwwww',
      'wwwwkkkwwwww',
      'wwwwkkwwwwww',
      'wwwwkwwwwwww',
      'wwwwwwwwwwww',
    ],
  },
  play: {
    palette: { w: '#FFFFFF', g: '#2FB82F' },
    rows: [
      'wwwwwwwwwwww',
      'wwggwwwwwwww',
      'wwgggwwwwwww',
      'wwggggwwwwww',
      'wwgggggwwwww',
      'wwggggwwwwww',
      'wwgggwwwwwww',
      'wwggwwwwwwww',
      'wwwwwwwwwwww',
    ],
  },
  sparkle: {
    palette: { y: '#FFE14A', o: '#F0B400' },
    rows: [
      '....y....',
      '....y....',
      '...yyy...',
      '..yyyyy..',
      'yyyyoyyyy',
      '..yyyyy..',
      '...yyy...',
      '....y....',
      '....y....',
    ],
  },
  restart: {
    palette: { w: '#FFFFFF' },
    rows: [
      '...wwwww....',
      '..ww...ww...',
      '.ww.....ww..',
      '.w.......w..',
      '.w.......w..',
      '.w.....wwwww',
      '.ww.....www.',
      '..ww.....w..',
      '...wwwww....',
    ],
  },
  hand: {
    palette: { w: '#FFFFFF', k: '#1A1440' },
    rows: [
      '...kk.......',
      '..kwwk......',
      '..kwwk......',
      '..kwwkkkk...',
      '..kwwkwwkkk.',
      'kkkwwkwwkwwk',
      'kwkwwwwwwwwk',
      'kwwwwwwwwwwk',
      '.kwwwwwwwwk.',
      '..kwwwwwwk..',
      '...kkkkkk...',
    ],
  },
};

export type IconName = keyof typeof ICONS;

function PixelIconImpl({ name, size = 24, tint }: { name: IconName; size?: number; tint?: string }) {
  const icon = ICONS[name];
  const cols = Math.max(...icon.rows.map((r) => r.length));
  const rows = icon.rows.length;
  const px = size / Math.max(cols, rows);
  const primary = Object.keys(icon.palette)[0];
  const paths = useMemo(() => {
    const byColor: Record<string, string> = {};
    icon.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        // tint recolours only the icon's primary (first) palette colour
        const c = tint && ch === primary ? tint : icon.palette[ch];
        if (!c) continue;
        byColor[c] = (byColor[c] ?? '') + `M${x * px} ${y * px}h${px}v${px}h${-px}z`;
      }
    });
    return Object.entries(byColor).map(([c, d]) => ({ c, p: Skia.Path.MakeFromSVGString(d)! }));
  }, [icon, px, tint, primary]);
  return (
    <Canvas style={{ width: cols * px, height: rows * px }}>
      {paths.map(({ c, p }) => (
        <Path key={c} path={p} color={c} antiAlias={false} />
      ))}
    </Canvas>
  );
}

export const PixelIcon = memo(PixelIconImpl);
