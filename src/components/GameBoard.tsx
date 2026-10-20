import { memo } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import type { GameEngine } from '../game/GameEngine';
import type { GameActions } from '../hooks/useGameEngine';
import { colors } from '../theme/colors';
import { SandRenderer } from './SandRenderer';

interface Props {
  engine: GameEngine;
  actions: GameActions;
  cellSize: number;
  subscribeFrame: (fn: () => void) => () => void;
  children?: React.ReactNode;
}

const FRAME = 4;

/**
 * Touch surface over the sand. Touching or dragging aims the hovering piece
 * at the finger; lifting the finger drops it (so a tap = aim + drop there).
 * With a mouse on web, simply moving the pointer aims and a click drops.
 */
function GameBoardImpl({ engine, actions, cellSize, subscribeFrame, children }: Props) {
  const width = engine.grid.cols * cellSize;
  const height = engine.grid.rows * cellSize;
  const aimAt = (e: GestureResponderEvent) => actions.aim(e.nativeEvent.locationX / cellSize);

  return (
    <View style={[styles.frame, { width: width + FRAME * 2, height: height + FRAME * 2 }]}>
      <View
        style={[{ width, height }, styles.surface, Platform.OS === 'web' && webNoScroll]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={aimAt}
        onResponderMove={aimAt}
        onResponderRelease={(e) => {
          aimAt(e);
          actions.drop();
        }}
        onPointerMove={(e) => {
          if (e.nativeEvent.pointerType === 'mouse') actions.aim(e.nativeEvent.offsetX / cellSize);
        }}
      >
        <SandRenderer engine={engine} cellSize={cellSize} subscribeFrame={subscribeFrame} />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {children}
        </View>
      </View>
    </View>
  );
}

// touch-action / user-select are web-only style keys.
const webNoScroll = { touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as object;

const styles = StyleSheet.create({
  frame: {
    padding: FRAME - 1,
    borderRadius: 12,
    backgroundColor: colors.board,
    borderWidth: 2,
    borderColor: colors.boardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: { overflow: 'hidden', borderRadius: 8, backgroundColor: colors.board },
});

export const GameBoard = memo(GameBoardImpl);
