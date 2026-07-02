"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { usePlanStore } from "@/stores/usePlanStore";
import { dayKey, nowMinutes } from "@/lib/time";
import { useNow } from "@/lib/useNow";

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PomodoroBar() {
  const show = useSettingsStore((s) => s.showPomodoro);
  const pathname = usePathname();
  const now = useNow(30_000);
  const plans = usePlanStore((s) => s.plans);
  const { round, remainingSeconds, isTicking, start, pause, tick, skip } =
    usePomodoroStore();
  const isFocus = round % 2 === 0;

  // while focusing, show what you're focusing ON
  const activeName = (() => {
    if (!now) return null;
    const mins = nowMinutes(now);
    const a = (plans[dayKey(now)] ?? []).find(
      (x) => mins >= x.start && mins < x.start + x.duration
    );
    return a?.name ?? null;
  })();

  useEffect(() => {
    if (!isTicking) return;
    const t = setInterval(() => tick(), 1000);
    return () => clearInterval(t);
  }, [isTicking, tick]);

  // like the original, the bar only lives on the clock view — the timer
  // itself keeps ticking globally
  const visible = show && pathname === "/";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -48, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: -48, x: "-50%", opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="glass elev-2 fixed left-1/2 top-8 z-50 flex items-center overflow-hidden rounded-full"
        >
          <span
            className={`max-w-44 truncate px-4 py-2 text-sm font-semibold text-white ${
              isFocus
                ? "bg-gradient-to-r from-blue-600 to-transparent"
                : "bg-gradient-to-r from-emerald-600 to-transparent"
            }`}
          >
            {isFocus ? (activeName ?? "Focus") : "Break"}
          </span>
          <span className="min-w-14 pr-1 text-center text-sm tabular-nums text-foreground">
            {fmt(remainingSeconds)}
          </span>
          <button
            aria-label={isTicking ? "Pause" : "Start"}
            onClick={isTicking ? pause : start}
            className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:text-accent"
          >
            {isTicking ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            aria-label="Skip"
            onClick={skip}
            className="mr-1 flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:text-accent"
          >
            <SkipForward size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
