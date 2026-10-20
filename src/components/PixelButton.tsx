import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { PixelText } from './PixelText';

type Variant = 'green' | 'blue' | 'orange' | 'navy' | 'outline' | 'goldOutline';

const FILL: Record<Variant, { bg: string; shadow: string; border?: string }> = {
  green: { bg: colors.green, shadow: colors.greenShadow },
  blue: { bg: colors.blue, shadow: colors.blueShadow },
  orange: { bg: colors.orange, shadow: colors.orangeShadow },
  navy: { bg: colors.sideBtn, shadow: colors.sideBtnShadow },
  outline: { bg: colors.panel, shadow: 'transparent', border: colors.panelBorder },
  goldOutline: { bg: colors.panel, shadow: 'transparent', border: colors.gold },
};

interface Props {
  label?: string;
  onPress?: () => void;
  variant?: Variant;
  width?: number | `${number}%`;
  height?: number;
  textSize?: number;
  disabled?: boolean;
  /** Content drawn before the label (icon). */
  icon?: React.ReactNode;
  /** Use outlined text like the big "Play" buttons. */
  outlinedText?: boolean;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: React.ReactNode;
}

/** Chunky rounded arcade button with a darker bottom edge that compresses when pressed. */
export function PixelButton({
  label,
  onPress,
  variant = 'green',
  width,
  height = 48,
  textSize = 16,
  disabled,
  icon,
  outlinedText,
  textColor,
  style,
  accessibilityLabel,
  children,
}: Props) {
  const f = FILL[variant];
  const depth = f.shadow === 'transparent' ? 0 : 4;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[{ width, height: height + depth }, disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <View style={[styles.shadow, { backgroundColor: f.shadow, height: height + depth, borderRadius: 10 }]}>
          <View
            style={[
              styles.face,
              {
                backgroundColor: f.bg,
                height,
                transform: [{ translateY: pressed ? depth : 0 }],
                borderWidth: f.border ? 3 : 0,
                borderColor: f.border,
              },
            ]}
          >
            {icon}
            {label ? (
              <PixelText
                size={textSize}
                upper={!outlinedText}
                color={textColor ?? (variant === 'goldOutline' ? colors.gold : colors.text)}
                outline={outlinedText ? colors.outline : undefined}
                outlineWidth={2}
              >
                {label}
              </PixelText>
            ) : null}
            {children}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { width: '100%' },
  face: {
    width: '100%',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  disabled: { opacity: 0.45 },
});
