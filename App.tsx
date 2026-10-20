import { PixelifySans_500Medium, PixelifySans_700Bold, useFonts } from '@expo-google-fonts/pixelify-sans';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { feedback } from './src/audio/feedback';
import { Background } from './src/components/Background';
import { HowToPlay } from './src/components/HowToPlay';
import type { GameMode } from './src/game/types';
import { GameScreen } from './src/screens/GameScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { MenuScreen } from './src/screens/MenuScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import {
  DEFAULT_SETTINGS,
  loadBestScores,
  loadDaily,
  loadProgress,
  loadSettings,
  saveBestScores,
  saveDaily,
  saveProgress,
  saveSettings,
  type BestScores,
  type Daily,
  type Progress,
  type Settings,
} from './src/storage/gameStorage';
import { colors } from './src/theme/colors';

type Screen =
  | { name: 'loading' }
  | { name: 'menu' }
  | { name: 'howto'; then: Screen }
  | { name: 'game'; mode: GameMode; run: number }
  | { name: 'result'; mode: GameMode; score: number; isNewBest: boolean };

export default function App() {
  const [fontsLoaded] = useFonts({ PixelifySans_500Medium, PixelifySans_700Bold });
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
  const [best, setBest] = useState<BestScores>({ classic: 0, speed: 0 });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>({ seenHowTo: false });
  const [daily, setDaily] = useState<Daily | null>(null);

  useEffect(() => {
    feedback.init();
    loadBestScores().then(setBest);
    loadSettings().then(setSettings);
    loadProgress().then(setProgress);
    loadDaily().then(setDaily);
  }, []);

  useEffect(() => {
    feedback.soundEnabled = settings.sound;
    feedback.hapticsEnabled = settings.haptics;
  }, [settings]);

  const updateSettings = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const updateDaily = useCallback((d: Daily) => {
    setDaily(d);
    saveDaily(d);
  }, []);

  const startGame = useCallback(
    (mode: GameMode) => {
      const game: Screen = { name: 'game', mode, run: Date.now() };
      if (!progress.seenHowTo) {
        const p = { ...progress, seenHowTo: true };
        setProgress(p);
        saveProgress(p);
        setScreen({ name: 'howto', then: game });
      } else {
        setScreen(game);
      }
    },
    [progress],
  );

  const onGameOver = useCallback(
    (mode: GameMode, score: number) => {
      const isNewBest = score > best[mode];
      setScreen({ name: 'result', mode, score, isNewBest });
      if (isNewBest) {
        const next = { ...best, [mode]: score };
        setBest(next);
        saveBestScores(next);
      }
    },
    [best],
  );

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" />
        {screen.name === 'loading' && <LoadingScreen onDone={() => setScreen({ name: 'menu' })} />}
        {screen.name === 'menu' && (
          <MenuScreen onPlay={startGame} onHowTo={() => setScreen({ name: 'howto', then: { name: 'menu' } })} />
        )}
        {screen.name === 'howto' && (
          <View style={styles.howto}>
            <Background variant="menu" />
            <HowToPlay onPlay={() => setScreen(screen.then)} />
          </View>
        )}
        {screen.name === 'game' && (
          <GameScreen
            key={screen.run}
            mode={screen.mode}
            best={best[screen.mode]}
            daily={daily}
            settings={settings}
            onSettings={updateSettings}
            onDaily={updateDaily}
            onGameOver={(score) => onGameOver(screen.mode, score)}
            onExit={() => setScreen({ name: 'menu' })}
          />
        )}
        {screen.name === 'result' && (
          <ResultScreen
            score={screen.score}
            best={best[screen.mode]}
            isNewBest={screen.isNewBest}
            onHome={() => setScreen({ name: 'menu' })}
            onPlayAgain={() => startGame(screen.mode)}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.menuTop },
  howto: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
});
