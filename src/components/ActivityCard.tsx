"use client";

import { motion } from "framer-motion";
import { minutesToHHmm } from "@/lib/time";
import type { Activity, Category } from "@/stores/usePlanStore";
import { categoryOf } from "@/stores/usePlanStore";
import ColorDot from "@/components/ui/ColorDot";

export type CardState = "past" | "active" | "upcoming" | "plain";

interface ActivityCardProps {
  activity: Activity;
  categories: Category[];
  /** past = shrunk & faded, active = grown & bright, upcoming = slightly dim */
  state?: CardState;
  cutMode?: boolean;
  onClick?: () => void;
  index?: number;
}

const STATE_STYLES: Record<
  CardState,
  { scale: number; opacity: number; bg: string; text: string }
> = {
  past: { scale: 0.9, opacity: 0.45, bg: "bg-surface", text: "text-neutral-400/50" },
  active: { scale: 1.06, opacity: 1, bg: "bg-surface-2", text: "text-foreground" },
  upcoming: { scale: 1, opacity: 0.75, bg: "bg-surface", text: "text-neutral-200/60" },
  plain: { scale: 1, opacity: 1, bg: "bg-surface", text: "text-neutral-200/60" },
};

export default function ActivityCard({
  activity,
  categories,
  state = "plain",
  cutMode = false,
  onClick,
  index = 0,
}: ActivityCardProps) {
  const cat = categoryOf(activity, categories);
  const s = STATE_STYLES[state];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: s.opacity, x: 0, scale: s.scale }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      style={{ transformOrigin: "left center" }}
      className="flex items-center"
    >
      {/* leader dash, like a clock tick pointing at the list */}
      <span className="ml-1 mr-4 h-px w-6 shrink-0 bg-white/10" />
      <button
        onClick={onClick}
        className={`flex h-[34px] w-fit min-w-[230px] items-center gap-1.5 rounded-full border-t border-white/5 px-3 py-1 text-left shadow-sm transition-all ${s.bg} ${
          state === "active" ? "shadow-lg shadow-black/30" : ""
        } ${
          cutMode
            ? "hover:border-red-400/40 hover:bg-red-500/10"
            : onClick
              ? "hover:bg-surface-2"
              : "cursor-default"
        }`}
      >
        <ColorDot color={cat?.color} className="mr-1" />
        <span className="text-xs text-neutral-500">
          {cat?.name ?? "Uncategorized"}:
        </span>
        <span className={`max-w-[120px] truncate pr-2 text-sm ${s.text}`}>
          {activity.name}
        </span>
        <span className="ml-auto mr-1 whitespace-nowrap text-xs tabular-nums text-neutral-400/40">
          {minutesToHHmm(activity.start)}-
          {minutesToHHmm(activity.start + activity.duration)}
        </span>
      </button>
    </motion.div>
  );
}
