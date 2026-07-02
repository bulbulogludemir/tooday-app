"use client";

import dayjs, { Dayjs } from "dayjs";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useSettingsStore } from "@/stores/useSettingsStore";

interface WeekStripProps {
  selected: Dayjs;
  onSelect: (d: Dayjs) => void;
}

export default function WeekStrip({ selected, onSelect }: WeekStripProps) {
  const startDay = useSettingsStore((s) => s.startDay);
  const weekStart = selected.subtract((selected.day() - startDay + 7) % 7, "day");
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
  const today = dayjs();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 rounded-2xl bg-surface px-2 py-1.5">
        {days.map((d) => {
          const active = d.isSame(selected, "day");
          const isToday = d.isSame(today, "day");
          return (
            <button
              key={d.format("YYYY-MM-DD")}
              onClick={() => onSelect(d)}
              className={`flex w-[72px] flex-col items-center rounded-xl border px-2 py-1.5 transition-colors ${
                active
                  ? "border-transparent bg-surface-2"
                  : isToday
                    ? "border-dashed border-white/20 hover:bg-white/5"
                    : "border-transparent hover:bg-white/5"
              }`}
            >
              <span
                className={`text-sm ${
                  active ? "text-foreground" : "text-muted"
                }`}
              >
                {d.format("ddd")}
              </span>
              <span className="text-sm">
                <span className="text-muted">{d.format("MMM")} </span>
                <span className="font-medium text-foreground">
                  {d.format("DD")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <IconButton
          label="Previous day"
          onClick={() => onSelect(selected.subtract(1, "day"))}
        >
          <ChevronLeft size={14} />
        </IconButton>
        <IconButton label="Go to today" onClick={() => onSelect(dayjs())}>
          <CalendarDays size={14} />
        </IconButton>
        <IconButton
          label="Next day"
          onClick={() => onSelect(selected.add(1, "day"))}
        >
          <ChevronRight size={14} />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}
