import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Background } from '../components/Background';
import { PixelText } from '../components/PixelText';
import { SAND_COLORS, colors, rgbHex, shadeRgb } from '../theme/colors';
import { Logo } from './MenuScreen';

const SEGMENTS = 14;

interface Props {
  /** How long the bar takes to fill, in ms. */
  duration?: number;
  onDone: () => void;
}

/** Start-up screen: logo, pixel progress bar filling with sand colours, then calls onDone. */
export function LoadingScreen({ duration = 2500, onDone }: Props) {
  const [filled, setFilled] = useState(0);
  const [fade] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -6, duration: 500, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();

    const step = duration / SEGMENTS;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setFilled(n);
      if (n >= SEGMENTS) {
        clearInterval(id);
        Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => doneRef.current());
      }
    }, step);
    return () => {
      clearInterval(id);
      loop.stop();
    };
  }, [duration, fade, bob]);

  const pct = Math.round((filled / SEGMENTS) * 100);

  return (
    <View style={styles.root}>
      <Background variant="menu" />
      <Animated.View style={[styles.content, { opacity: fade }]}>
        <Animated.View style={{ transform: [{ translateY: bob }] }}>
          <Logo size={42} />
        </Animated.View>
        <View style={styles.bar}>
          {Array.from({ length: SEGMENTS }, (_, i) => {
            const c = SAND_COLORS[i % SAND_COLORS.length];
            const on = i < filled;
            return (
              <View
                key={i}
                style={[
                  styles.segment,
                  on && { backgroundColor: c, borderBottomColor: rgbHex(shadeRgb(c, -0.35)) },
                ]}
              />
            );
          })}
        </View>
        <PixelText size={14} upper outline={colors.outline}>
          {`Loading... ${pct}%`}
        </PixelText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    gap: 3,
    padding: 5,
    backgroundColor: colors.boardInner,
    borderWidth: 3,
    borderColor: colors.outline,
  },
  segment: {
    width: 14,
    height: 18,
    backgroundColor: colors.chip,
    borderBottomWidth: 4,
    borderBottomColor: colors.sideBtnShadow,
  },
});
