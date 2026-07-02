"use client";

import { useEffect, useState } from "react";

/** Re-renders every `intervalMs` with the current Date. Returns null before mount (SSR-safe). */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const raf = requestAnimationFrame(update);
    const t = setInterval(update, intervalMs);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, [intervalMs]);
  return now;
}
