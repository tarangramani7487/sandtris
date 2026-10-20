import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BLOCK } from '../game/constants';
import { matrixFor } from '../game/PieceGenerator';
import type { HudState } from '../game/types';
import { SAND_COLORS, colors } from '../theme/colors';
import { PixelIcon } from './PixelIcon';
import { PixelText } from './PixelText';

interface Props {
  hud: HudState;
  width: number;
  boardCell: number;
  /** Landscape: height of the board, so the column never outgrows it. */
  height?: number;
  /** Portrait: NEXT and the buttons in one row under the board. */
  horizontal?: boolean;
  onSkip: () => void;
  onClear: () => void;
  onHome: () => void;
}

function NextBox({ hud, width, height, boardCell }: { hud: HudState; width: number; height: number; boardCell: number }) {
  const m = matrixFor(hud.next);
  // next piece at ~60% of board scale, fitted to the box
  const block = Math.min(boardCell * BLOCK * 0.6, (width - 14) / Math.max(m[0].length, 2), (height - 10) / Math.max(m.length, 2));
  return (
    <View style={[styles.nextBox, { width, height }]}>
      {m.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.map((v, x) => (
            <View key={x} style={{ width: block, height: block, backgroundColor: v ? SAND_COLORS[hud.next.color - 1] : 'transparent' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function SideButton({
  label,
  onPress,
  disabled,
  highlight,
  icon,
  width,
  badge,
  compact,
  height,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  highlight?: boolean;
  icon?: React.ReactNode;
  width: number;
  badge?: number;
  compact?: boolean;
  height?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sideBtn,
        { width },
        compact && styles.sideBtnRow,
        height !== undefined && { height, minHeight: 0, marginBottom: 0, paddingVertical: 2 },
        highlight && styles.sideBtnHighlight,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <PixelText size={icon ? 8 : 11} upper>
        {label}
      </PixelText>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <PixelText size={9} color={colors.outline}>
            {badge}
          </PixelText>
        </View>
      )}
    </Pressable>
  );
}

/** NEXT preview and the SKIP / CLEAR / HOME column beside the board. */
function SidePanelImpl({ hud, width, boardCell, height, horizontal, onSkip, onClear, onHome }: Props) {
  const playing = hud.status === 'playing';
  if (horizontal) {
    const btnW = Math.min(76, (width - 110) / 3 - 8);
    return (
      <View style={[styles.row, { width }]}>
        <View style={styles.nextRow}>
          <PixelText size={11} upper>
            Next
          </PixelText>
          <NextBox hud={hud} width={92} height={50} boardCell={boardCell} />
        </View>
        <SideButton compact label="Skip" width={btnW} onPress={onSkip} disabled={!playing || !hud.canSkip} />
        <SideButton
          compact
          label="Clear"
          width={btnW}
          onPress={onClear}
          disabled={!playing || hud.clearCharges <= 0}
          highlight={playing && hud.clearCharges > 0}
          badge={hud.clearCharges}
          icon={<PixelIcon name="video" size={18} />}
        />
        <SideButton compact label="Home" width={btnW} onPress={onHome} icon={<PixelIcon name="home" size={18} />} />
      </View>
    );
  }
  // Column sized from the board height: NEXT box ~1/3 of it, three buttons share the rest.
  const H = height ?? width * 5;
  const nextH = Math.min(width * 1.9, H * 0.34);
  const btnH = Math.max(30, Math.min(50, (H - 22 - nextH - 24) / 3 - 8));
  return (
    <View style={[styles.col, { width, height: H }]}>
      <PixelText size={13} upper>
        Next
      </PixelText>
      <NextBox hud={hud} width={width} height={nextH} boardCell={boardCell} />
      <View style={styles.flexSpacer} />
      <SideButton label="Skip" width={width} height={btnH} onPress={onSkip} disabled={!playing || !hud.canSkip} />
      <SideButton
        label="Clear"
        width={width}
        height={btnH}
        onPress={onClear}
        disabled={!playing || hud.clearCharges <= 0}
        highlight={playing && hud.clearCharges > 0}
        badge={hud.clearCharges}
        icon={<PixelIcon name="video" size={18} />}
      />
      <SideButton label="Home" width={width} height={btnH} onPress={onHome} icon={<PixelIcon name="home" size={18} />} />
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  nextRow: { alignItems: 'center', gap: 3 },
  sideBtnRow: { marginBottom: 0, height: 50 },
  nextBox: {
    backgroundColor: colors.board,
    borderWidth: 2,
    borderColor: colors.boardBorder,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexSpacer: { flex: 1, maxHeight: 40 },
  sideBtn: {
    minHeight: 40,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.sideBtn,
    borderBottomWidth: 3,
    borderBottomColor: colors.sideBtnShadow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 10,
  },
  sideBtnHighlight: { borderWidth: 2, borderColor: colors.gold, borderBottomWidth: 3, borderBottomColor: colors.goldDark },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ translateY: 2 }] },
});

export const SidePanel = memo(SidePanelImpl);
