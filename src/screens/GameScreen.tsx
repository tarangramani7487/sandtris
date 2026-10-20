import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedback } from '../audio/feedback';
import { Background } from '../components/Background';
import { GameBoard } from '../components/GameBoard';
import { LeaveDialog, SaveRunDialog, SettingsDialog } from '../components/GameDialogs';
import { GameHUD } from '../components/GameHUD';
import { HowToPlay } from '../components/HowToPlay';
import { PixelText } from '../components/PixelText';
import { PopupView, praiseFor, type Popup } from '../components/Popups';
import { SidePanel } from '../components/SidePanel';
import { COLS, DAILY_BONUS, DAILY_LINES, ROWS } from '../game/constants';
import type { GameEvent, GameMode } from '../game/types';
import { useGameEngine, type GameActions } from '../hooks/useGameEngine';
import { addDailyLines, type Daily, type Settings } from '../storage/gameStorage';
import { SAND_COLORS, colors } from '../theme/colors';

interface Props {
  mode: GameMode;
  best: number;
  daily: Daily | null;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onDaily: (d: Daily) => void;
  onGameOver: (score: number) => void;
  onExit: () => void;
}

type Dialog = 'none' | 'settings' | 'leave' | 'howto';

const PAD_X = 10;
const GAP_PORTRAIT = 10;

export function GameScreen(props: Props) {
  const { mode, best, daily, settings, onSettings, onDaily, onGameOver, onExit } = props;
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const landscape = window.width > window.height;
  const [popup, setPopup] = useState<Popup | null>(null);
  const [dialog, setDialog] = useState<Dialog>('none');
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [hudH, setHudH] = useState(0);

  const show = (p: Omit<Popup, 'key'>) => setPopup({ ...p, key: Date.now() + Math.random() });
  // Latest daily state for event handlers (several clears can land in one frame).
  const dailyRef = useRef(daily);
  useLayoutEffect(() => {
    dailyRef.current = daily;
  }, [daily]);

  const onEvent = useCallback(
    (e: GameEvent, actions: GameActions) => {
      switch (e.type) {
        case 'land':
          feedback.play('land');
          feedback.haptic('light');
          break;
        case 'clear': {
          feedback.play(e.chain > 1 ? 'chain' : 'clear');
          feedback.haptic(e.chain > 1 ? 'success' : 'medium');
          let sub = `+${e.points.toLocaleString()}`;
          if (mode === 'classic' && dailyRef.current) {
            const r = addDailyLines(dailyRef.current, 1);
            dailyRef.current = r.daily;
            onDaily(r.daily);
            if (r.completed) {
              actions.addBonus(DAILY_BONUS);
              sub += `  Daily +${DAILY_BONUS}`;
            }
          }
          show({ word: praiseFor(e.chain), mult: e.chain > 1 ? `x${e.chain}` : undefined, sub, color: SAND_COLORS[e.color - 1] });
          break;
        }
        case 'milestone':
          if (e.index > 1) show({ word: 'New color!', color: SAND_COLORS[e.colors - 1], sub: 'Keep going' });
          break;
        case 'speedup':
          show({ word: 'Speed up!', sub: `Speed ${e.level}/10` });
          break;
        case 'overflow':
          feedback.play('gameover');
          feedback.haptic('error');
          break;
        case 'gameover':
          onGameOver(e.score);
          break;
        default:
          break;
      }
    },
    [mode, onDaily, onGameOver],
  );

  const { engine, hud, actions, subscribeFrame } = useGameEngine(mode, onEvent);

  // Layout size includes the column's horizontal padding; keep only the content width.
  const onArea = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width - PAD_X * 2, h: height });
  };

  // Landscape (like the original): board centred under the HUD with the NEXT/SKIP/CLEAR/HOME
  // column on its right. Portrait: full-width board with that panel as a row underneath.
  // The board always keeps the 2:3 grid ratio and the whole block is centred vertically.
  const GAP = 10;
  const BAR_H = 80;
  const sideW = landscape ? Math.max(56, Math.min(78, area.h * 0.2)) : 0;
  const availH = area.h - hudH - GAP - 12 - (landscape ? 0 : BAR_H + GAP);
  const availW = landscape ? area.w - 2 * (sideW + 16) - 12 : area.w - 12;
  const cellSize = area.w > 0 && hudH > 0 ? Math.max(1.5, Math.min(availW / COLS, availH / ROWS)) : 0;
  const boardW = COLS * cellSize + 12;
  const compact = area.w < 360;

  const openDialog = (d: Dialog) => {
    actions.pause();
    setDialog(d);
  };
  const closeDialog = () => {
    setDialog('none');
    actions.resume();
  };

  const firstHint = hud.dropped === 0 && hud.status === 'playing';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <Background variant="game" />
      <View style={[styles.column, !landscape && styles.columnPortrait]} onLayout={onArea}>
        <View onLayout={(e) => setHudH(e.nativeEvent.layout.height)}>
          <GameHUD hud={hud} best={best} daily={daily} compact={compact} onSettings={() => openDialog('settings')} />
        </View>
        <View style={[landscape ? styles.playRow : styles.playColumn, { marginTop: GAP }]}>
          {cellSize > 0 && (
            <>
              {landscape && <View style={{ width: sideW }} />}
              <GameBoard engine={engine} actions={actions} cellSize={cellSize} subscribeFrame={subscribeFrame}>
                {firstHint && (
                  <View style={styles.hints}>
                    {mode === 'classic' && daily && !daily.done && (
                      <View style={styles.dailyHint}>
                        <View style={styles.dailyHintRow}>
                          <View style={[styles.dot, { backgroundColor: SAND_COLORS[0] }]} />
                          <PixelText size={16} upper>
                            Make {DAILY_LINES} lines
                          </PixelText>
                        </View>
                        <PixelText size={12} color={colors.gold} upper>
                          +{DAILY_BONUS} daily
                        </PixelText>
                      </View>
                    )}
                    <View style={styles.tapHint}>
                      <View style={styles.ring}>
                        <View style={styles.ringDot} />
                      </View>
                      <PixelText size={11} upper>
                        Tap to drop
                      </PixelText>
                    </View>
                  </View>
                )}
                {popup && <PopupView key={popup.key} popup={popup} />}
              </GameBoard>
              <SidePanel
                hud={hud}
                horizontal={!landscape}
                width={landscape ? sideW : boardW}
                height={landscape ? ROWS * cellSize + 12 : undefined}
                boardCell={cellSize}
                onSkip={() => {
                  if (actions.skip()) feedback.play('tick');
                }}
                onClear={() => {
                  if (actions.useClear()) {
                    feedback.play('clear');
                    feedback.haptic('medium');
                  }
                }}
                onHome={() => openDialog('leave')}
              />
            </>
          )}
        </View>
      </View>

      {dialog === 'settings' && (
        <SettingsDialog settings={settings} onSettings={onSettings} onResume={closeDialog} onHowTo={() => setDialog('howto')} />
      )}
      {dialog === 'howto' && (
        <View style={[StyleSheet.absoluteFill, styles.howto]}>
          <HowToPlay onPlay={closeDialog} />
        </View>
      )}
      {dialog === 'leave' && <LeaveDialog onKeep={closeDialog} onMenu={onExit} />}
      {hud.status === 'overflow' && (
        <SaveRunDialog canSave={hud.canSave} usesCharge={engine.saveUsed} onSave={actions.saveRun} onGiveUp={actions.giveUp} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', paddingHorizontal: PAD_X, justifyContent: 'center' },
  columnPortrait: { maxWidth: 620 },
  playRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 16 },
  playColumn: { alignItems: 'center', gap: GAP_PORTRAIT },
  hints: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: '20%',
  },
  dailyHint: { alignItems: 'center', gap: 4 },
  dailyHintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12 },
  tapHint: { alignItems: 'center', gap: 8 },
  ring: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.text },
  howto: { backgroundColor: 'rgba(8,8,30,0.7)', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 30 },
});
