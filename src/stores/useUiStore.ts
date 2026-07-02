"use client";

import { create } from "zustand";

interface UiState {
  cutMode: boolean;
  railOpen: boolean; // right-hand rail (nav + plan tools) expanded
  toggleCutMode: () => void;
  setCutMode: (v: boolean) => void;
  setRailOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  cutMode: false,
  railOpen: true,
  toggleCutMode: () => set((s) => ({ cutMode: !s.cutMode })),
  setCutMode: (cutMode) => set({ cutMode }),
  setRailOpen: (railOpen) => set({ railOpen }),
}));
