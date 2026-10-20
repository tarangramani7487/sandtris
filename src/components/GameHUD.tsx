import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DAILY_BONUS, DAILY_LINES, SPEED_LEVELS } from '../game/constants';
import type { HudState } from '../game/types';
import type { Daily } from '../storage/gameStorage';
import { SAND_COLORS, colors } from '../theme/colors';
import { PixelIcon } from './PixelIcon';
import { PixelText } from './PixelText';

interface Props {
  hud: HudState;
  best: number;
  daily: Daily | null;
  compact: boolean;
  onSettings: () => void;
}

function ProgressBar({ value, width }: { value: number; width: number }) {
  return (
    <View style={[styles.bar, { width }]}>
      <View style={[styles.barFill, { width: Math.max(0, Math.min(1, value)) * (width - 4) }]} />
    </View>
  );
}

/** "DAY n" with a 7-dot weekly streak: filled = completed days, outlined = today (pending). */
function DayStreak({ daily }: { daily: Daily }) {
  const filled = daily.streak === 0 ? 0 : ((daily.streak - 1) % 7) + 1;
  const today = daily.done ? -1 : filled % 7;
  return (
    <View style={styles.dayRow}>
      <PixelText size={9} color={colors.gold} upper>
        Day {daily.done ? daily.streak : daily.streak + 1}
      </PixelText>
      {Array.from({ length: 7 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dayDot,
            i < filled && !(today === 0 && filled === 7) && styles.dayDotDone,
            i === today && styles.dayDotToday,
          ]}
        />
      ))}
      <PixelText size={9} color={colors.gold}>
        +{DAILY_BONUS}
      </PixelText>
    </View>
  );
}

function GameHUDImpl({ hud, best, daily, compact, onSettings }: Props) {
  const barW = compact ? 120 : 150;
  const progress = (hud.score - hud.prevTarget) / Math.max(1, hud.nextTarget - hud.prevTarget);
  return (
    <View style={styles.row}>
      {/* left: best trophy + daily goal */}
      <View style={styles.left}>
        <View style={styles.trophyRow}>
          <View style={styles.trophy}>
            <PixelIcon name="trophy" size={compact ? 22 : 26} />
            <PixelText size={10}>{Math.max(best, 0).toLocaleString()}</PixelText>
          </View>
          {hud.mode === 'classic' && daily && (
            <View style={styles.dailyChip}>
              <View style={[styles.dot, { backgroundColor: daily.done ? colors.green : SAND_COLORS[0] }]} />
              <PixelText size={10} upper>
                {daily.done ? 'Done!' : `${daily.lines}/${DAILY_LINES} lines`}
              </PixelText>
            </View>
          )}
        </View>
      </View>

      {/* centre: score + milestone bar */}
      <View style={styles.center}>
        <View style={styles.scoreLine}>
          {hud.mode === 'speed' && (
            <PixelText size={10} upper style={styles.speedLabel}>
              Speed {hud.speedLevel}/{SPEED_LEVELS}
            </PixelText>
          )}
          <PixelText size={compact ? 24 : 28}>{hud.score.toLocaleString()}</PixelText>
          <PixelText size={9} color={colors.textDim} style={styles.target}>
            {hud.nextTarget.toLocaleString()}
          </PixelText>
        </View>
        <ProgressBar value={progress} width={barW} />
        {hud.mode === 'classic' && daily && <DayStreak daily={daily} />}
      </View>

      {/* right: settings */}
      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={onSettings}
          hitSlop={8}
          style={({ pressed }) => [styles.gear, pressed && { opacity: 0.7 }]}
        >
          <PixelIcon name="gear" size={22} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' },
  left: { flex: 1, alignItems: 'flex-start' },
  center: { alignItems: 'center' },
  right: { flex: 1, alignItems: 'flex-end' },
  trophyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  trophy: { alignItems: 'center' },
  dailyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dot: { width: 7, height: 7 },
  scoreLine: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  speedLabel: { position: 'absolute', right: '100%', marginRight: 10, bottom: 8, width: 90, textAlign: 'right' },
  target: { position: 'absolute', left: '100%', marginLeft: 8, top: 4 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.boardInner, padding: 2, marginTop: 2 },
  barFill: { height: 4, borderRadius: 2, backgroundColor: colors.gold },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  dayDot: { width: 7, height: 7, backgroundColor: colors.boardInner },
  dayDotDone: { backgroundColor: colors.gold },
  dayDotToday: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gold },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.sideBtn,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: colors.sideBtnShadow,
  },
});

export const GameHUD = memo(GameHUDImpl);
