import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SOURCES = {
  land: require('../../assets/sounds/land.wav'),
  clear: require('../../assets/sounds/clear.wav'),
  chain: require('../../assets/sounds/chain.wav'),
  gameover: require('../../assets/sounds/gameover.wav'),
  tick: require('../../assets/sounds/tick.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const VOLUME: Record<SoundName, number> = { land: 0.55, clear: 0.8, chain: 0.8, gameover: 0.7, tick: 0.3 };

/**
 * Sound + haptics. Every call is fire-and-forget and swallows failures so the
 * game stays playable where audio or haptics are unavailable.
 */
class Feedback {
  private players: Partial<Record<SoundName, AudioPlayer>> = {};
  private ready = false;
  soundEnabled = true;
  hapticsEnabled = true;

  init(): void {
    if (this.ready) return;
    this.ready = true;
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    (Object.keys(SOURCES) as SoundName[]).forEach((name) => {
      try {
        const p = createAudioPlayer(SOURCES[name]);
        p.volume = VOLUME[name];
        this.players[name] = p;
      } catch {
        // leave this sound unavailable
      }
    });
  }

  play(name: SoundName): void {
    if (!this.soundEnabled) return;
    const p = this.players[name];
    if (!p) return;
    try {
      p.seekTo(0).catch(() => {});
      p.play();
    } catch {
      // ignore
    }
  }

  haptic(kind: 'light' | 'medium' | 'success' | 'error'): void {
    if (!this.hapticsEnabled || Platform.OS === 'web') return;
    const run =
      kind === 'light'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : kind === 'medium'
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          : Haptics.notificationAsync(
              kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
            );
    run.catch(() => {});
  }
}

export const feedback = new Feedback();
