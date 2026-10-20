import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Lays its content out at natural size, then scales it down (never up) so it
 * fits inside the safe screen area – keeps menus and dialogs whole on small
 * phones and in landscape.
 */
export function Fit({ children, margin = 12 }: { children: React.ReactNode; margin?: number }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const availW = width - insets.left - insets.right - margin * 2;
  const availH = height - insets.top - insets.bottom - margin * 2;
  const scale = size ? Math.min(1, availW / size.w, availH / size.h) : 1;
  return (
    <View
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ alignItems: 'center', transform: [{ scale }], opacity: size ? 1 : 0 }}
    >
      {children}
    </View>
  );
}
