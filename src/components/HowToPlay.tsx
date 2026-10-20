import { StyleSheet, View } from 'react-native';
import { SAND_COLORS, colors } from '../theme/colors';
import { Fit } from './Fit';
import { PixelButton } from './PixelButton';
import { PixelIcon } from './PixelIcon';
import { PixelText } from './PixelText';

const CYAN = SAND_COLORS[0];
const GREEN = SAND_COLORS[1];

/** Little sand slope drawn from stacked bars (illustration). */
function Slope({ dir }: { dir: 'left' | 'right' }) {
  const steps = 10;
  return (
    <View style={[styles.slope, { flexDirection: dir === 'left' ? 'row' : 'row-reverse' }]}>
      {Array.from({ length: steps }, (_, i) => {
        const h = 46 - i * 4;
        return (
          <View key={i} style={{ width: 9, height: h, justifyContent: 'flex-end' }}>
            <View style={{ height: 4, backgroundColor: GREEN }} />
            <View style={{ height: h - 4, backgroundColor: CYAN }} />
          </View>
        );
      })}
    </View>
  );
}

/** "How to play" card: place the block, match colours, skip a wrong colour. */
export function HowToPlay({ onPlay }: { onPlay: () => void }) {
  return (
    <Fit>
      <View style={styles.wrap}>
        <PixelText size={24}>How to play</PixelText>
        <View style={styles.card}>
          <View style={styles.section}>
            <PixelText size={14}>Place the block</PixelText>
            <View style={styles.rowCenter}>
              <View style={styles.plus}>
                <View style={[styles.plusBar, { width: 20, height: 60 }]} />
                <View style={[styles.plusBar, { width: 60, height: 20, position: 'absolute' }]} />
                <View style={styles.hand}>
                  <PixelIcon name="hand" size={26} />
                </View>
              </View>
              <PixelText size={10} style={styles.caption}>
                Drag the block{'\n'}to the correct place{'\n'}above the red line,{'\n'}then let go to drop
              </PixelText>
            </View>
          </View>
          <View style={[styles.section, styles.darker]}>
            <PixelText size={14}>Match the colors</PixelText>
            <PixelText size={10} style={styles.caption}>
              Connect one color{'\n'}from wall to wall
            </PixelText>
            <View style={styles.slopes}>
              <Slope dir="left" />
              <Slope dir="right" />
            </View>
          </View>
          <View style={styles.section}>
            <PixelText size={14}>Wrong color?</PixelText>
            <View style={styles.rowCenter}>
              <PixelText size={10} style={styles.caption}>
                Tap SKIP{'\n'}to replace it
              </PixelText>
              <View style={styles.skip}>
                <PixelText size={11}>SKIP</PixelText>
              </View>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <View style={[styles.cell]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <View style={[styles.cell]} />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <View style={[styles.cell]} />
                  <View style={[styles.cell]} />
                </View>
              </View>
            </View>
          </View>
        </View>
        <PixelButton label="Let's play!" variant="green" width={220} height={52} textSize={24} outlinedText onPress={onPlay} />
      </View>
    </Fit>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, width: 340 },
  card: {
    width: '100%',
    backgroundColor: colors.panel,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.panelBorder,
    overflow: 'hidden',
  },
  section: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, gap: 8 },
  darker: { backgroundColor: colors.boardInner },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  caption: { lineHeight: 14 },
  plus: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  plusBar: { backgroundColor: CYAN },
  hand: { position: 'absolute', right: -14, bottom: -8 },
  slopes: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 },
  slope: { alignItems: 'flex-end' },
  skip: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: colors.sideBtn,
    borderBottomWidth: 3,
    borderBottomColor: colors.sideBtnShadow,
  },
  cell: { width: 16, height: 16, backgroundColor: CYAN },
});
