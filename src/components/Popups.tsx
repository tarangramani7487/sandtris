import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { PixelText } from './PixelText';

export interface Popup {
  key: number;
  word: string;
  /** e.g. "x2" for chains */
  mult?: string;
  sub?: string;
  color?: string;
}

/** Praise word for a clear in a chain. */
export function praiseFor(chain: number): string {
  if (chain <= 1) return 'Nice!';
  if (chain === 2) return 'Good job!';
  if (chain === 3) return 'Great!';
  return 'Amazing!';
}

/** Big outlined word that pops, holds and fades (one at a time, keyed). */
export function PopupView({ popup }: { popup: Popup }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1300, useNativeDriver: true }).start();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const scale = anim.interpolate({ inputRange: [0, 0.12, 0.2, 1], outputRange: [0.4, 1.15, 1, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -24] });
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity, transform: [{ translateY }, { scale }] }]}>
      {popup.mult && (
        <PixelText size={26} outline={colors.outline}>
          {popup.mult}
        </PixelText>
      )}
      <View style={styles.wordBox}>
        <PixelText size={30} color={colors.text} outline={colors.popOutline} outlineWidth={3}>
          {popup.word}
        </PixelText>
      </View>
      {popup.sub && (
        <PixelText size={14} color={popup.color ?? colors.gold} outline={colors.outline}>
          {popup.sub}
        </PixelText>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center', gap: 6 },
  wordBox: { paddingHorizontal: 6 },
});
