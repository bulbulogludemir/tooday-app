"use client";

import { useEffect } from "react";
import { useSettingsStore, type Accent } from "@/stores/useSettingsStore";

/** [soft 400 tone, strong 600 tone] per accent choice */
export const ACCENTS: Record<Accent, [string, string]> = {
  indigo: ["#818cf8", "#4f46e5"],
  mint: ["#34d399", "#059669"],
  rose: ["#fb7185", "#e11d48"],
  amber: ["#fbbf24", "#d97706"],
};

/** Pushes the chosen accent into CSS variables on <html> */
export default function ThemeApplier() {
  const accent = useSettingsStore((s) => s.accent);
  useEffect(() => {
    const [soft, strong] = ACCENTS[accent] ?? ACCENTS.indigo;
    const root = document.documentElement;
    root.style.setProperty("--accent", soft);
    root.style.setProperty("--accent-strong", strong);
  }, [accent]);
  return null;
}
