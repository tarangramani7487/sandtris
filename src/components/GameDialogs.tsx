import { Pressable, StyleSheet, View } from 'react-native';
import type { Settings } from '../storage/gameStorage';
import { colors } from '../theme/colors';
import { Overlay } from './Overlay';
import { PixelButton } from './PixelButton';
import { PixelIcon } from './PixelIcon';
import { PixelText } from './PixelText';

export function LeaveDialog({ onKeep, onMenu }: { onKeep: () => void; onMenu: () => void }) {
  return (
    <Overlay>
      <PixelText size={20} upper>
        Leave the game?
      </PixelText>
      <PixelText size={13} upper style={styles.body}>
        You will lose{'\n'}this run
      </PixelText>
      <PixelButton label="Keep playing" variant="green" width={200} onPress={onKeep} />
      <PixelButton label="Menu" variant="outline" width={140} onPress={onMenu} />
    </Overlay>
  );
}

export function SaveRunDialog({
  canSave,
  usesCharge,
  onSave,
  onGiveUp,
}: {
  canSave: boolean;
  usesCharge: boolean;
  onSave: () => void;
  onGiveUp: () => void;
}) {
  return (
    <Overlay>
      <PixelText size={20} upper>
        Save this run
      </PixelText>
      <PixelText size={13} upper style={styles.body}>
        The pile reached the top{'\n'}
        {canSave ? 'wipe the tallest color\nand keep going' : 'no saves left this run'}
      </PixelText>
      {canSave && (
        <PixelButton
          label={usesCharge ? 'Use a clear' : 'Save me'}
          variant="goldOutline"
          width={200}
          onPress={onSave}
          icon={<PixelIcon name="video" size={18} tint={colors.gold} />}
        />
      )}
      <PixelButton label="Give up" variant="outline" width={200} onPress={onGiveUp} />
    </Overlay>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.toggle}
    >
      <PixelText size={14} upper>
        {label}
      </PixelText>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export function SettingsDialog({
  settings,
  onSettings,
  onResume,
  onHowTo,
}: {
  settings: Settings;
  onSettings: (s: Settings) => void;
  onResume: () => void;
  onHowTo: () => void;
}) {
  return (
    <Overlay>
      <PixelText size={20} upper>
        Settings
      </PixelText>
      <View style={styles.divider} />
      <Toggle label="Sound" value={settings.sound} onChange={(sound) => onSettings({ ...settings, sound })} />
      <Toggle label="Vibration" value={settings.haptics} onChange={(haptics) => onSettings({ ...settings, haptics })} />
      <PixelButton label="Resume" variant="green" width={200} onPress={onResume} />
      <Pressable onPress={onHowTo} hitSlop={8}>
        <PixelText size={11} upper style={styles.link}>
          How to play
        </PixelText>
      </Pressable>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  body: { lineHeight: 22 },
  divider: { height: 2, alignSelf: 'stretch', backgroundColor: colors.panelDivider },
  toggle: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switch: { width: 46, height: 24, borderRadius: 12, backgroundColor: colors.chip, padding: 3 },
  switchOn: { backgroundColor: colors.green },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textDim },
  knobOn: { backgroundColor: colors.text, transform: [{ translateX: 22 }] },
  link: { textDecorationLine: 'underline' },
});
