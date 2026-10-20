import { Canvas, Picture, Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Random } from '../game/Random';

const COLORS = ['#FF5C7A', '#FFB4C2', '#2BD48F', '#1F8F6A', '#FF9E5C', '#FFD8A8', '#7FD8FF', '#C38BFF'];

interface Piece {
  x: number;
  y: number;
  vy: number;
  sway: number;
  phase: number;
  spin: number;
  w: number;
  h: number;
  color: number;
}

/** Falling paper confetti drawn in one Skia picture per frame (stops on unmount). */
export function Confetti({ count = 90 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo<Piece[]>(() => {
    const rng = new Random(7);
    const out: Piece[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        x: rng.next() * width,
        y: rng.next() * height - height,
        vy: 40 + rng.next() * 70,
        sway: 10 + rng.next() * 30,
        phase: rng.next() * Math.PI * 2,
        spin: 1 + rng.next() * 3,
        w: 7 + rng.next() * 7,
        h: 9 + rng.next() * 8,
        color: i % COLORS.length,
      });
    }
    return out;
  }, [count, width, height]);
  const paints = useMemo(
    () =>
      COLORS.map((c) => {
        const p = Skia.Paint();
        p.setColor(Skia.Color(c));
        return p;
      }),
    [],
  );
  const [picture, setPicture] = useState<SkPicture | null>(null);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      setPicture(
        createPicture((canvas) => {
          for (const p of pieces) {
            const y = ((p.y + p.vy * t) % (height + 40) + height + 40) % (height + 40) - 20;
            const x = p.x + Math.sin(t * 1.5 + p.phase) * p.sway;
            // flip like paper: scale x by cos to fake 3D rotation
            const flip = Math.max(0.15, Math.abs(Math.cos(t * p.spin + p.phase)));
            canvas.save();
            canvas.translate(x, y);
            canvas.rotate(((t * p.spin * 40 + p.phase * 57) % 360), 0, 0);
            canvas.drawRect(Skia.XYWHRect((-p.w * flip) / 2, -p.h / 2, p.w * flip, p.h), paints[p.color]);
            canvas.restore();
          }
        }),
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pieces, paints, height]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {picture && <Picture picture={picture} />}
    </Canvas>
  );
}
