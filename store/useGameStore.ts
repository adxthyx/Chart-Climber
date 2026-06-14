import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Phase = 'menu' | 'loading' | 'playing' | 'crashed';

export type Hud = {
  distance: number;
  price: number;
  speed: number;
  fuel: number;
  score: number;
  coins: number;
  airborne: boolean;
  flips: number;
};

const EMPTY_HUD: Hud = {
  distance: 0,
  price: 0,
  speed: 0,
  fuel: 0,
  score: 0,
  coins: 0,
  airborne: false,
  flips: 0,
};

type GameStore = {
  phase: Phase;
  hud: Hud;
  finished: boolean;
  reason: 'crash' | 'fuel' | 'fell' | null;
  best: Record<string, number>; // best score per symbol (persisted)

  setPhase: (p: Phase) => void;
  setHud: (h: Hud) => void;
  endRun: (
    symbol: string,
    score: number,
    finished: boolean,
    reason: 'crash' | 'fuel' | 'fell' | null,
  ) => void;
  resetRun: () => void;
  bestFor: (symbol: string) => number;
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      phase: 'loading',
      hud: EMPTY_HUD,
      finished: false,
      reason: null,
      best: {},

      setPhase: (phase) => set({ phase }),
      setHud: (hud) => set({ hud }),
      endRun: (symbol, score, finished, reason) =>
        set((s) => ({
          phase: 'crashed',
          finished,
          reason,
          best: { ...s.best, [symbol]: Math.max(s.best[symbol] ?? 0, score) },
        })),
      resetRun: () =>
        set({ phase: 'loading', hud: EMPTY_HUD, finished: false, reason: null }),
      bestFor: (symbol) => get().best[symbol] ?? 0,
    }),
    {
      name: 'chart-climber',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ best: s.best }),
    },
  ),
);
