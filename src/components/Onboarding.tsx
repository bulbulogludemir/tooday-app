"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Command, MousePointerClick } from "lucide-react";
import { dayKey } from "@/lib/time";
import { usePlanStore } from "@/stores/usePlanStore";
import { useToastStore } from "@/stores/useToastStore";

const FLAG = "tooday-onboarded";

/** First-visit welcome card: a 3-line tour + an optional sample day */
export default function Onboarding() {
  const plans = usePlanStore((s) => s.plans);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(FLAG) === "1"
  );

  const hasAnyPlan = Object.values(plans).some((list) => list.length > 0);
  if (dismissed || hasAnyPlan) return null;

  const finish = () => {
    localStorage.setItem(FLAG, "1");
    setDismissed(true);
  };

  const createSampleDay = () => {
    const store = usePlanStore.getState();
    let workCat = store.categories.find((c) => c.name === "Work");
    if (!workCat) {
      store.setCategories([
        ...store.categories,
        { id: "sample-work", name: "Work", color: "emerald", type: "offline" },
      ]);
      workCat = { id: "sample-work", name: "Work", color: "emerald", type: "offline" };
    }
    const today = dayKey(new Date());
    const samples = [
      { name: "Morning Routine", category: null, start: 480, duration: 60 },
      { name: "Deep Work", category: workCat.id, start: 570, duration: 120 },
      { name: "Lunch", category: null, start: 720, duration: 60 },
      { name: "Meetings", category: workCat.id, start: 840, duration: 90 },
    ];
    for (const s of samples)
      store.addActivityWithRepeat(today, { ...s, repeat: [] });
    useToastStore.getState().show("Sample day created — make it yours!");
    finish();
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="elev-3 w-[420px] max-w-[92vw] rounded-2xl border-t border-white/[0.08] bg-surface/90 p-7 backdrop-blur-2xl"
      >
        <h2 className="font-display text-2xl font-bold">
          Welcome to <span className="text-accent">tooday</span>
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Your day, wrapped around a clock.
        </p>

        <div className="mt-5 flex flex-col gap-3.5 text-sm">
          <span className="flex items-start gap-3">
            <CalendarDays size={16} className="mt-0.5 shrink-0 text-accent" />
            Plan tasks on the timeline — click an empty spot, drag to move,
            stretch the edges.
          </span>
          <span className="flex items-start gap-3">
            <MousePointerClick size={16} className="mt-0.5 shrink-0 text-accent" />
            The dial shows your whole day; the running task glows.
          </span>
          <span className="flex items-start gap-3">
            <Command size={16} className="mt-0.5 shrink-0 text-accent" />
            Press <kbd className="rounded border border-white/10 px-1">⌘K</kbd>{" "}
            and type “gym 9-10.30” to add a task instantly.
          </span>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={finish}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-colors hover:text-foreground"
          >
            Start empty
          </button>
          <button
            onClick={createSampleDay}
            className="rounded-lg bg-[var(--accent-strong)] px-4 py-2 text-sm font-medium text-white transition-[filter] hover:brightness-110"
          >
            Create a sample day
          </button>
        </div>
      </motion.div>
    </div>
  );
}
