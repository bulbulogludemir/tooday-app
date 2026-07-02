"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const FOCUS_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;

interface PomodoroState {
  round: number; // 0-based; even = focus, odd = break
  totalWorkingRounds: number;
  /** completed focus rounds per day ("YYYY-MM-DD") for the report */
  completedByDay: Record<string, number>;
  remainingSeconds: number;
  isTicking: boolean;
  start: () => void;
  pause: () => void;
  tick: () => void;
  skip: () => void;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function phaseLength(round: number): number {
  return round % 2 === 0 ? FOCUS_SECONDS : BREAK_SECONDS;
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set) => ({
      round: 0,
      totalWorkingRounds: 0,
      completedByDay: {},
      remainingSeconds: FOCUS_SECONDS,
      isTicking: false,
      start: () => set({ isTicking: true }),
      pause: () => set({ isTicking: false }),
      tick: () =>
        set((s) => {
          if (!s.isTicking) return s;
          if (s.remainingSeconds > 1)
            return { remainingSeconds: s.remainingSeconds - 1 };
          const nextRound = s.round + 1;
          const finishedFocus = s.round % 2 === 0;
          const key = todayKey();
          return {
            round: nextRound,
            totalWorkingRounds: finishedFocus
              ? s.totalWorkingRounds + 1
              : s.totalWorkingRounds,
            completedByDay: finishedFocus
              ? { ...s.completedByDay, [key]: (s.completedByDay[key] ?? 0) + 1 }
              : s.completedByDay,
            remainingSeconds: phaseLength(nextRound),
            isTicking: false,
          };
        }),
      skip: () =>
        set((s) => {
          const nextRound = s.round + 1;
          return {
            round: nextRound,
            remainingSeconds: phaseLength(nextRound),
            isTicking: false,
          };
        }),
    }),
    { name: "pomodoro-storage" }
  )
);
