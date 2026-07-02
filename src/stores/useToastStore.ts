"use client";

import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: Toast[];
  show: (
    message: string,
    opts?: { actionLabel?: string; onAction?: () => void; duration?: number }
  ) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (message, opts) => {
    const id = nextId++;
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id, message, actionLabel: opts?.actionLabel, onAction: opts?.onAction },
      ],
    }));
    setTimeout(() => get().dismiss(id), opts?.duration ?? 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
