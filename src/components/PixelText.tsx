import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

interface Props {
  children: React.ReactNode;
  size?: number;
  color?: string;
  /** Draws a solid outline of this colour around the glyphs. */
  outline?: string;
  outlineWidth?: number;
  bold?: boolean;
  upper?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

const OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

/** Text in the pixel font, optionally with a chunky outline (layered copies). */
export function PixelText({
  children,
  size = 14,
  color = colors.text,
  outline,
  outlineWidth = 2,
  bold = true,
  upper = false,
  align = 'center',
  style,
  numberOfLines,
}: Props) {
  const base: TextStyle = {
    fontFamily: bold ? fonts.bold : fonts.regular,
    fontSize: size,
    lineHeight: Math.round(size * 1.2),
    textAlign: align,
    textTransform: upper ? 'uppercase' : 'none',
    includeFontPadding: false,
  };
  if (!outline) {
    return (
      <Text style={[base, { color }, style]} numberOfLines={numberOfLines}>
        {children}
      </Text>
    );
  }
  return (
    <View>
      {OFFSETS.map(([dx, dy], i) => (
        <Text
          key={i}
          accessible={false}
          importantForAccessibility="no"
          numberOfLines={numberOfLines}
          style={[base, StyleSheet.absoluteFill, { color: outline, transform: [{ translateX: dx * outlineWidth }, { translateY: dy * outlineWidth }] }, style]}
        >
          {children}
        </Text>
      ))}
      <Text style={[base, { color }, style]} numberOfLines={numberOfLines}>
        {children}
      </Text>
    </View>
  );
}
