"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Activity, Category } from "@/stores/usePlanStore";
import { categoryOf } from "@/stores/usePlanStore";
import ColorDot from "@/components/ui/ColorDot";

interface StatusChipProps {
  activities: Activity[]; // today's activities, sorted by start
  nowMinutes: number;
  categories: Category[];
}

/**
 * Figures out the current block (an activity or an empty gap), how many
 * minutes remain until it ends, and which activity comes next.
 */
function currentBlock(activities: Activity[], now: number) {
  const active = activities.find(
    (a) => now >= a.start && now < a.start + a.duration
  );
  if (active) {
    const next = activities.find(
      (a) => a.start >= active.start + active.duration
    );
    return { active, endsIn: active.start + active.duration - now, next };
  }
  const next = activities.find((a) => a.start > now);
  return { active: null, endsIn: (next ? next.start : 1440) - now, next };
}

export default function StatusChip({
  activities,
  nowMinutes,
  categories,
}: StatusChipProps) {
  const [expanded, setExpanded] = useState(false);
  const { active, endsIn, next } = currentBlock(activities, nowMinutes);
  const hours = Math.floor(endsIn / 60);
  const mins = endsIn % 60;

  return (
    <div className="relative flex flex-col items-center">
      {/* current block chip */}
      <motion.button
        layout
        onClick={() => next && setExpanded((v) => !v)}
        className="glass elev-2 relative z-10 flex items-center gap-4 rounded-2xl px-5 py-3"
      >
        <span className="text-[10px] text-muted/50">·</span>
        <span className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-1.5 text-sm font-medium">
          <ColorDot color={active ? categoryOf(active, categories)?.color : null} />
          {active ? active.name : "Empty"}
        </span>
        <span className="text-sm text-muted">ends in</span>
        <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
          {hours > 0 && (
            <span className="rounded-md bg-surface-2 px-2 py-1">
              {hours}
              <span className="font-normal text-muted">hr</span>
            </span>
          )}
          <span className="rounded-md bg-surface-2 px-2 py-1">
            {mins}
            <span className="font-normal text-muted">m</span>
          </span>
        </span>
        <span className="text-[10px] text-muted/50">·</span>
      </motion.button>

      {/* next activity chip — barely peeks out behind, expands below on click */}
      <AnimatePresence initial={false}>
        {next && (
          <motion.div
            key={expanded ? "below" : "behind"}
            initial={{ opacity: 0, y: expanded ? -18 : -32 }}
            animate={{
              opacity: expanded ? 1 : 0.85,
              y: expanded ? 6 : -20,
              scale: expanded ? 1 : 0.93,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`flex items-center gap-2 rounded-2xl border-t border-white/5 px-5 py-2.5 text-xs text-muted ${
              expanded
                ? "glass elev-1"
                : "pointer-events-none absolute top-full -z-10 bg-surface/80"
            }`}
          >
            <span className="text-[10px] text-muted/50">·</span>
            Next activity is
            <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 font-medium text-foreground">
              <ColorDot color={categoryOf(next, categories)?.color} size={5} />
              {next.name}
            </span>
            <span className="text-[10px] text-muted/50">·</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
