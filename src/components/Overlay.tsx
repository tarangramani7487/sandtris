import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { Fit } from './Fit';

/** Dimmed full-screen overlay with the navy, light-bordered panel used by all dialogs. */
export function Overlay({ children, width = 300 }: { children: React.ReactNode; width?: number }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }).start();
  }, [anim]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
      <Fit>
        <Animated.View
          style={[styles.panel, { width, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}
        >
          <View style={styles.inner}>{children}</View>
        </Animated.View>
      </Fit>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(8,8,30,0.62)', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 20 },
  panel: {
    maxWidth: '100%',
    borderRadius: 18,
    backgroundColor: colors.panel,
    borderWidth: 4,
    borderColor: colors.panelBorder,
  },
  inner: { paddingVertical: 22, paddingHorizontal: 22, gap: 14, alignItems: 'center' },
});
