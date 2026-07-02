"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Accent = "indigo" | "mint" | "rose" | "amber";

interface SettingsState {
  startDay: number; // 0 = Sunday, 1 = Monday
  clockFormat: "24h" | "12h";
  darkMode: boolean;
  showPomodoro: boolean;
  notificationsEnabled: boolean;
  accent: Accent;
  setClockFormat: (f: "24h" | "12h") => void;
  setStartDay: (d: number) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setAccent: (a: Accent) => void;
  togglePomodoro: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      startDay: 0,
      clockFormat: "24h",
      darkMode: true,
      showPomodoro: false,
      notificationsEnabled: false,
      accent: "indigo",
      setAccent: (accent) => set({ accent }),
      setClockFormat: (clockFormat) => set({ clockFormat }),
      setStartDay: (startDay) => set({ startDay }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      togglePomodoro: () => set((s) => ({ showPomodoro: !s.showPomodoro })),
    }),
    { name: "settings-storage" }
  )
);
