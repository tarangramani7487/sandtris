import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '../components/Background';
import { Confetti } from '../components/Confetti';
import { Fit } from '../components/Fit';
import { PixelButton } from '../components/PixelButton';
import { PixelIcon } from '../components/PixelIcon';
import { PixelText } from '../components/PixelText';
import { colors } from '../theme/colors';

interface Props {
  score: number;
  best: number;
  isNewBest: boolean;
  onHome: () => void;
  onPlayAgain: () => void;
}

/** End-of-run screen: ribbon, score card, confetti; Home and Play again. */
export function ResultScreen({ score, best, isNewBest, onHome, onPlayAgain }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Background variant="menu" />
      {isNewBest && <Confetti />}
      <Fit>
        <View style={styles.content}>
          <View style={styles.ribbonWrap}>
            <View style={[styles.ribbonTail, styles.tailLeft]} />
            <View style={[styles.ribbonTail, styles.tailRight]} />
            <View style={styles.ribbon}>
              <PixelText size={24} color={colors.gold} outline={colors.ribbonShadow} outlineWidth={2}>
                {isNewBest ? 'Congratulations!' : 'Game over'}
              </PixelText>
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.sparkleRow}>
              <PixelIcon name="sparkle" size={34} />
              <PixelText size={22}>Your score</PixelText>
              <PixelIcon name="sparkle" size={34} />
            </View>
            <PixelText size={54}>{score.toLocaleString()}</PixelText>
            <PixelText size={13} color={colors.gold} upper>
              {isNewBest ? 'New best' : `Best ${best.toLocaleString()}`}
            </PixelText>
          </View>
          <View style={styles.buttons}>
            <PixelButton
              variant="blue"
              width={58}
              height={52}
              onPress={onHome}
              accessibilityLabel="Home"
              icon={<PixelIcon name="home" size={28} />}
            />
            <PixelButton
              variant="orange"
              width={58}
              height={52}
              onPress={onPlayAgain}
              accessibilityLabel="Restart"
              icon={<PixelIcon name="restart" size={28} />}
            />
            <PixelButton
              label="Play"
              variant="green"
              width={150}
              height={52}
              textSize={26}
              outlinedText
              onPress={onPlayAgain}
              icon={<PixelIcon name="play" size={30} />}
            />
          </View>
        </View>
      </Fit>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  content: { alignItems: 'center', gap: 22, width: 320 },
  ribbonWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: -34, zIndex: 2 },
  ribbon: {
    backgroundColor: colors.ribbon,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 8,
    borderBottomWidth: 5,
    borderBottomColor: colors.ribbonShadow,
    transform: [{ rotate: '-3deg' }],
  },
  ribbonTail: { position: 'absolute', width: 40, height: 34, backgroundColor: colors.ribbonShadow, top: 14 },
  tailLeft: { left: -26, transform: [{ skewY: '12deg' }] },
  tailRight: { right: -26, transform: [{ skewY: '-12deg' }] },
  card: {
    width: '100%',
    maxWidth: 300,
    paddingTop: 44,
    paddingBottom: 26,
    borderRadius: 18,
    backgroundColor: colors.purplePanel,
    borderWidth: 4,
    borderColor: colors.purplePanelBorder,
    alignItems: 'center',
    gap: 10,
  },
  sparkleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  buttons: { flexDirection: 'row', gap: 14, alignItems: 'center' },
});
