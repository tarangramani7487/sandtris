import {
  AlphaType,
  Canvas,
  ColorType,
  FilterMode,
  MipmapMode,
  Picture,
  Skia,
  TileMode,
  createPicture,
  type SkImage,
  type SkPaint,
  type SkPicture,
} from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useState } from 'react';
import { BLOCK, CLEAR_FLASH_STEPS, DANGER_ROW } from '../game/constants';
import type { GameEngine } from '../game/GameEngine';
import type { ActivePiece } from '../game/types';
import { SAND_RGB, colors } from '../theme/colors';

interface Props {
  engine: GameEngine;
  cellSize: number;
  subscribeFrame: (fn: () => void) => () => void;
}

const SHADE_COUNT = SAND_RGB[0].length;
/** Packed little-endian RGBA (0xAABBGGRR) per colour id and shade; index = color * SHADE_COUNT + shade. */
const PACKED = new Uint32Array((SAND_RGB.length + 1) * SHADE_COUNT);
SAND_RGB.forEach((shades, c) =>
  shades.forEach(([r, g, b], s) => {
    PACKED[(c + 1) * SHADE_COUNT + s] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }),
);
const WHITE = 0xffffffff;
/** Recent frames whose pictures stay alive (see redraw). */
const PICTURE_TRAIL = 8;

/** Cheap deterministic hash for the clear sparkle and piece texture. */
const hash = (i: number, t: number) => {
  let h = (i * 374761393 + t * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const beamColor = (c: number, alpha: number) => {
  const [r, g, b] = SAND_RGB[c - 1][0];
  return `rgba(${r},${g},${b},${alpha})`;
};

function makePaint(hex: string): SkPaint {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(hex));
  paint.setAntiAlias(false);
  return paint;
}

const imageInfo = (width: number, height: number) => ({
  width,
  height,
  colorType: ColorType.RGBA_8888,
  alphaType: AlphaType.Unpremul,
});

/** Small textured image of a piece (made once per piece). */
function pieceImage(p: ActivePiece): SkImage | null {
  const w = p.matrix[0].length * BLOCK;
  const h = p.matrix.length * BLOCK;
  const px = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!p.matrix[(y / BLOCK) | 0][(x / BLOCK) | 0]) continue;
      const r = hash(x * 31 + y * 977, p.color);
      px[y * w + x] = PACKED[p.color * SHADE_COUNT + (r < 0.7 ? 0 : r < 0.88 ? 1 : 2)];
    }
  }
  return makeImage(px, w, h);
}

/** Upload RGBA pixels as an SkImage (the temporary SkData handle is released right away). */
function makeImage(px: Uint32Array, w: number, h: number): SkImage | null {
  const data = Skia.Data.fromBytes(new Uint8Array(px.buffer, px.byteOffset, px.byteLength));
  const image = Skia.Image.MakeImage(imageInfo(w, h), data, w * 4);
  data.dispose();
  return image;
}

/**
 * Renders the board as one SkPicture per frame; only this small component
 * re-renders. The sand is one COLS x ROWS image scaled with nearest-neighbour
 * sampling and is rebuilt only when grains actually change; the piece is a
 * cached image. Every replaced Skia object is disposed immediately so no
 * garbage builds up (GC pauses would show up as stutter on phones).
 */
function SandRendererImpl({ engine, cellSize, subscribeFrame }: Props) {
  const { cols, rows } = engine.grid;
  const w = cols * cellSize;
  const h = rows * cellSize;
  const [picture, setPicture] = useState<SkPicture | null>(null);

  const paints = useMemo(() => ({ line: makePaint(colors.dangerLine), image: makePaint('#FFFFFF') }), []);

  useEffect(() => {
    const pixels = new Uint32Array(cols * rows);
    let sandImage: SkImage | null = null;
    let sandVersion = -1;
    let lastRender = -1;
    let cachedPiece: ActivePiece | null = null;
    let cachedPieceImage: SkImage | null = null;
    let cachedMatrix: number[][] | null = null;
    const issued: SkPicture[] = [];

    const rebuildSand = () => {
      const { color, shade, clearing } = engine.grid;
      const flashT = CLEAR_FLASH_STEPS - engine.clearFlash;
      const sparkle = engine.clearFlash > 0 ? Math.min(1, flashT / (CLEAR_FLASH_STEPS * 0.7)) : 0;
      const tick = flashT >> 1;
      for (let i = 0; i < pixels.length; i++) {
        const c = color[i];
        if (c === 0) pixels[i] = 0;
        else if (clearing[i] !== 0 && hash(i, tick) < 0.25 + sparkle * 0.75) pixels[i] = WHITE;
        else pixels[i] = PACKED[c * SHADE_COUNT + shade[i]];
      }
      for (const f of engine.flyers) {
        const x = f.x | 0;
        const y = f.y | 0;
        if (x >= 0 && y >= 0 && x < cols && y < rows) pixels[y * cols + x] = PACKED[f.color * SHADE_COUNT + f.shade];
      }
      sandImage?.dispose();
      sandImage = makeImage(pixels, cols, rows);
    };

    const redraw = () => {
      // A falling piece is interpolated between steps, so it is redrawn on every frame.
      const falling = engine.piece?.phase === 'dropping';
      if (engine.renderVersion === lastRender && !falling) return;
      lastRender = engine.renderVersion;
      // The sand image changes only when grains move, flyers fly or a clear sparkles.
      if (engine.grid.version !== sandVersion || engine.flyers.length > 0 || engine.clearFlash > 0 || !sandImage) {
        sandVersion = engine.grid.version;
        rebuildSand();
      }
      const p = engine.piece;
      if (p && (p !== cachedPiece || p.matrix !== cachedMatrix)) {
        cachedPiece = p;
        cachedMatrix = p.matrix;
        cachedPieceImage?.dispose();
        cachedPieceImage = pieceImage(p);
      }
      const next = createPicture(
        (canvas) => {
          if (p && p.phase === 'aiming') {
            const bx = p.x * cellSize;
            const bw = p.matrix[0].length * BLOCK * cellSize;
            const by = (p.y + p.matrix.length * BLOCK) * cellSize;
            const bh = h * 0.72 - by;
            if (bh > 0) {
              const beam = Skia.Paint();
              beam.setShader(
                Skia.Shader.MakeLinearGradient(
                  { x: 0, y: by },
                  { x: 0, y: by + bh },
                  [Skia.Color(beamColor(p.color, 0.7)), Skia.Color(beamColor(p.color, 0))],
                  null,
                  TileMode.Clamp,
                ),
              );
              canvas.drawRect(Skia.XYWHRect(bx, by, bw, bh), beam);
            }
          }
          if (sandImage) {
            canvas.drawImageRectOptions(sandImage, Skia.XYWHRect(0, 0, cols, rows), Skia.XYWHRect(0, 0, w, h), FilterMode.Nearest, MipmapMode.None, paints.image);
          }
          if (p && cachedPieceImage) {
            const pw = p.matrix[0].length * BLOCK;
            const ph = p.matrix.length * BLOCK;
            canvas.drawImageRectOptions(
              cachedPieceImage,
              Skia.XYWHRect(0, 0, pw, ph),
              Skia.XYWHRect(p.x * cellSize, engine.pieceDrawY(p) * cellSize, pw * cellSize, ph * cellSize),
              FilterMode.Nearest,
              MipmapMode.None,
              paints.image,
            );
          }
          canvas.drawRect(Skia.XYWHRect(0, DANGER_ROW * cellSize, w, Math.max(1.5, cellSize * 0.6)), paints.line);
        },
        { width: w, height: h },
      );
      // Skia's renderer may still draw a picture a few frames after we replace it,
      // so pictures are released only once they are PICTURE_TRAIL frames old.
      issued.push(next);
      while (issued.length > PICTURE_TRAIL) issued.shift()!.dispose();
      setPicture(next);
    };

    redraw();
    const unsubscribe = subscribeFrame(redraw);
    return () => {
      unsubscribe();
      sandImage?.dispose();
      cachedPieceImage?.dispose();
    };
  }, [engine, cellSize, cols, rows, w, h, paints, subscribeFrame]);

  return (
    <Canvas style={{ width: w, height: h }}>
      {picture && <Picture picture={picture} />}
    </Canvas>
  );
}

export const SandRenderer = memo(SandRendererImpl);
