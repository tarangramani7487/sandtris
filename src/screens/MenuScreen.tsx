import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '../components/Background';
import { Fit } from '../components/Fit';
import { PixelButton } from '../components/PixelButton';
import { PixelText } from '../components/PixelText';
import type { GameMode } from '../game/types';
import { SAND_COLORS, rgbHex, shadeRgb } from '../theme/colors';

const TITLE = 'GRAINFALL';
const TITLE_COLORS = ['#FF3B4E', '#FF8C1A', '#FFD21A', '#22EE3A', '#12D8FF', '#B44DFF', '#FF3B8E', '#FF3B4E', '#FF8C1A'];

/** Rainbow block-letter logo: each letter has a darker drop "extrusion" under it. */
export function Logo({ size = 50 }: { size?: number }) {
  return (
    <View style={styles.logo}>
      {TITLE.split('').map((ch, i) => {
        const c = TITLE_COLORS[i % TITLE_COLORS.length];
        return (
          <View key={i}>
            <PixelText size={size} color={rgbHex(shadeRgb(c, -0.45))} style={{ position: 'absolute', top: size * 0.08 }}>
              {ch}
            </PixelText>
            <PixelText size={size} color={c} outline={rgbHex(shadeRgb(c, -0.3))} outlineWidth={2}>
              {ch}
            </PixelText>
          </View>
        );
      })}
    </View>
  );
}

interface Props {
  onPlay: (mode: GameMode) => void;
  onHowTo: () => void;
}

export function MenuScreen({ onPlay, onHowTo }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Background variant="menu" />
      <Fit>
        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Logo />
            <PixelText size={16} color={SAND_COLORS[0]} upper>
              Pixel sand puzzle
            </PixelText>
          </View>
          <View style={styles.buttons}>
            <PixelButton label="Classic" variant="green" width={190} onPress={() => onPlay('classic')} />
            <PixelButton label="Speeding up" variant="orange" width={190} onPress={() => onPlay('speed')} />
            <Pressable onPress={onHowTo} hitSlop={10} style={{ marginTop: 10 }}>
              <PixelText size={11} upper style={{ textDecorationLine: 'underline' }}>
                How to play
              </PixelText>
            </Pressable>
          </View>
        </View>
      </Fit>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 44 },
  titleBlock: { alignItems: 'center', gap: 6 },
  logo: { flexDirection: 'row' },
  buttons: { alignItems: 'center', gap: 18 },
});
