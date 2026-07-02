"use client";

import dayjs, { Dayjs } from "dayjs";
import { motion } from "framer-motion";
import { dayKey } from "@/lib/time";
import { colorArc, ARC_UNCATEGORIZED } from "@/lib/colors";
import type { Activity, Category } from "@/stores/usePlanStore";
import { categoryOf } from "@/stores/usePlanStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const DAY_MINUTES = 1440;

interface WeekViewProps {
  selected: Dayjs;
  plans: Record<string, Activity[]>;
  categories: Category[];
  /** current time in minutes (today's column shows a now-line) */
  nowMinutes: number;
  onSelectDay: (d: Dayjs) => void;
  onSelectActivity: (day: Dayjs, a: Activity) => void;
  /** click on empty column space -> create on that day at that time */
  onCreateAt: (day: Dayjs, startMinutes: number) => void;
}

/** Seven vertical mini-timelines side by side — the whole week at a glance */
export default function WeekView({
  selected,
  plans,
  categories,
  nowMinutes,
  onSelectDay,
  onSelectActivity,
  onCreateAt,
}: WeekViewProps) {
  const startDay = useSettingsStore((s) => s.startDay);
  const weekStart = selected.subtract(
    (selected.day() - startDay + 7) % 7,
    "day"
  );
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
  const today = dayjs();

  const handleColumnClick = (
    e: React.MouseEvent<HTMLDivElement>,
    day: Dayjs
  ) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mins =
      Math.floor(
        (((e.clientY - rect.top) / rect.height) * DAY_MINUTES) / 30
      ) * 30;
    onCreateAt(day, Math.max(0, Math.min(mins, DAY_MINUTES - 60)));
  };

  return (
    <div className="w-full max-w-screen-xl px-6">
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const key = dayKey(d);
          const acts = plans[key] ?? [];
          const isToday = d.isSame(today, "day");
          const isSelected = d.isSame(selected, "day");
          return (
            <div key={key} className="flex min-w-0 flex-col gap-1.5">
              {/* day header */}
              <button
                onClick={() => onSelectDay(d)}
                className={`flex flex-col items-center rounded-xl border px-1 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-transparent bg-surface-2"
                    : isToday
                      ? "border-dashed border-white/20 hover:bg-white/5"
                      : "border-transparent hover:bg-white/5"
                }`}
              >
                <span className={isSelected ? "text-foreground" : "text-muted"}>
                  {d.format("ddd")}
                </span>
                <span className="font-medium">{d.format("DD")}</span>
              </button>

              {/* vertical day strip */}
              <div
                onClick={(e) => handleColumnClick(e, d)}
                className="relative h-[46vh] min-h-[280px] cursor-copy rounded-xl border-t border-white/[0.05] bg-surface/50 shadow-inner shadow-black/20 backdrop-blur-sm"
                title="Click an empty spot to add a task"
              >
                {/* quarter-day gridlines */}
                {[6, 12, 18].map((h) => (
                  <span
                    key={h}
                    className="pointer-events-none absolute left-0 right-0 h-px bg-white/5"
                    style={{ top: `${(h / 24) * 100}%` }}
                  />
                ))}
                {/* now line */}
                {isToday && (
                  <span
                    className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-white/70"
                    style={{ top: `${(nowMinutes / DAY_MINUTES) * 100}%` }}
                  >
                    <span className="absolute -left-[2px] -top-[3px] h-[7px] w-[7px] rounded-full bg-white" />
                  </span>
                )}
                {/* activity blocks */}
                {acts.map((a) => {
                  const cat = categoryOf(a, categories);
                  const color = cat ? colorArc(cat.color) : ARC_UNCATEGORIZED;
                  const top = (a.start / DAY_MINUTES) * 100;
                  const height = (a.duration / DAY_MINUTES) * 100;
                  return (
                    <motion.button
                      key={a.id}
                      initial={{ opacity: 0, scaleX: 0.7 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.25 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectActivity(d, a);
                      }}
                      title={a.name}
                      className="absolute left-1 right-1 z-10 overflow-hidden rounded-md px-1 text-left shadow-sm shadow-black/30 transition-[filter] hover:brightness-110"
                      style={{
                        top: `${top}%`,
                        height: `max(${height}%, 8px)`,
                        background: `linear-gradient(to bottom, ${color}, ${color}cc)`,
                      }}
                    >
                      {height > 5 && (
                        <span className="block truncate pt-0.5 text-[9px] font-semibold text-black/60">
                          {a.name}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
