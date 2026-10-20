import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GameSession } from '../game/GameSession';
import type { GameEvent, GameMode, HudState } from '../game/types';

export interface GameActions {
  aim: (centerX: number) => void;
  moveBy: (blocks: number) => void;
  drop: () => void;
  skip: () => boolean;
  useClear: () => boolean;
  saveRun: () => void;
  giveUp: () => void;
  addBonus: (points: number) => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  restart: () => void;
}

/**
 * Owns one GameSession (engine + frame loop) for the lifetime of the game
 * screen. The renderer subscribes to frames directly; React state is only
 * updated when HUD values actually change.
 */
export function useGameEngine(mode: GameMode, onEvent: (e: GameEvent, actions: GameActions) => void) {
  const [session] = useState(() => new GameSession(mode));
  const { engine } = session;
  const [hud, setHud] = useState<HudState>(() => session.getHud());

  const onEventRef = useRef(onEvent);
  useLayoutEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const actions = useMemo<GameActions>(() => {
    // Actions that change state outside the loop push a refresh so the HUD/board update even when paused.
    const withRefresh =
      <A extends unknown[], R>(fn: (...a: A) => R) =>
      (...a: A): R => {
        const r = fn(...a);
        session.refresh();
        return r;
      };
    return {
      aim: (x) => engine.aim(x),
      moveBy: (b) => engine.moveBy(b),
      drop: () => engine.drop(),
      skip: withRefresh(() => engine.skip()),
      useClear: withRefresh(() => engine.useClear()),
      saveRun: () => {
        if (engine.saveRun()) session.start();
        session.refresh();
      },
      giveUp: withRefresh(() => engine.giveUp()),
      addBonus: withRefresh((p: number) => engine.addBonus(p)),
      pause: () => session.pause(),
      resume: () => session.resume(),
      togglePause: () => (engine.status === 'paused' ? session.resume() : session.pause()),
      restart: () => session.restart(),
    };
  }, [engine, session]);

  // Wire HUD + events, start the loop; tear everything down on unmount.
  useEffect(() => {
    session.connect(setHud);
    const unsubscribe = session.engine.subscribe((e) => onEventRef.current(e, actions));
    session.start();
    return () => {
      unsubscribe();
      session.dispose();
    };
  }, [session, actions]);

  // Pause when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') actions.pause();
    });
    return () => sub.remove();
  }, [actions]);

  // Keyboard controls on web.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      let handled = true;
      if (k === 'p' || k === 'escape') {
        if (engine.status === 'playing' || engine.status === 'paused') actions.togglePause();
      } else if (engine.status !== 'playing') {
        handled = false;
      } else if (k === 'arrowleft' || k === 'a') actions.moveBy(-1);
      else if (k === 'arrowright' || k === 'd') actions.moveBy(1);
      else if (k === 'arrowdown' || k === 's' || k === ' ' || k === 'enter') actions.drop();
      else if (k === 'q') actions.skip();
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [actions, engine]);

  return { engine, hud, actions, subscribeFrame: session.subscribeFrame };
}
