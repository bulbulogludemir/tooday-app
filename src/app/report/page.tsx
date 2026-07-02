"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { ChevronDown } from "lucide-react";
import { useNow } from "@/lib/useNow";
import { dayKey } from "@/lib/time";
import { usePlanStore, categoryOf } from "@/stores/usePlanStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { colorSolid } from "@/lib/colors";

const FILTERS = [
  { label: "Today", days: 1 },
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
] as const;

interface Row {
  name: string;
  color: string;
  totalMinutes: number;
  perDay: number[]; // minutes per day within range, oldest first
  dayCount: number;
}

export default function ReportPage() {
  const now = useNow(60_000);
  const plans = usePlanStore((s) => s.plans);
  const categories = usePlanStore((s) => s.categories);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(FILTERS[1]);
  const [filterOpen, setFilterOpen] = useState(false);
  const completedByDay = usePomodoroStore((s) => s.completedByDay);

  const { rows, rangeLabel } = useMemo(() => {
    if (!now) return { rows: [] as Row[], rangeLabel: "" };
    const end = dayjs(now);
    const start = end.subtract(filter.days - 1, "day");
    const byName = new Map<string, Row>();
    let plannedTotal = 0;

    for (let i = 0; i < filter.days; i++) {
      const day = start.add(i, "day");
      const acts = plans[dayKey(day)] ?? [];
      for (const a of acts) {
        const color = colorSolid(categoryOf(a, categories)?.color);
        const row = byName.get(a.name) ?? {
          name: a.name,
          color,
          totalMinutes: 0,
          perDay: Array(filter.days).fill(0),
          dayCount: 0,
        };
        if (row.perDay[i] === 0) row.dayCount += 1;
        row.perDay[i] += a.duration;
        row.totalMinutes += a.duration;
        plannedTotal += a.duration;
        byName.set(a.name, row);
      }
    }

    const rows = [...byName.values()].sort(
      (a, b) => b.totalMinutes - a.totalMinutes
    );

    // unplanned = whole range minus planned time
    const unplanned = filter.days * 1440 - plannedTotal;
    if (unplanned > 0) {
      rows.unshift({
        name: "Unplanned",
        color: colorSolid(null),
        totalMinutes: unplanned,
        perDay: Array(filter.days).fill(0),
        dayCount: filter.days,
      });
    }

    const rangeLabel =
      filter.days === 1
        ? end.format("DD MMM")
        : `${start.format("DD MMM")} - ${end.format("DD MMM")}`;
    return { rows, rangeLabel };
  }, [now, plans, categories, filter]);

  if (!now) return <main className="min-h-screen" />;

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-lg px-6 pt-28">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Summary{" "}
          <span className="text-sm font-normal text-muted">({rangeLabel})</span>
          {(() => {
            if (!now) return null;
            const end = dayjs(now);
            let rounds = 0;
            for (let i = 0; i < filter.days; i++) {
              rounds +=
                completedByDay[
                  end.subtract(i, "day").format("YYYY-MM-DD")
                ] ?? 0;
            }
            return rounds > 0 ? (
              <span className="ml-2 rounded-full bg-surface px-2.5 py-1 text-xs font-normal text-muted">
                🍅 {rounds} focus round{rounds > 1 ? "s" : ""}
              </span>
            ) : null;
          })()}
        </h1>
        <div className="relative flex items-center gap-2 text-sm">
          <span className="text-muted">Filter By</span>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-surface px-3 py-1.5 transition-colors hover:bg-surface-2"
          >
            {filter.label} <ChevronDown size={13} className="text-muted" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg bg-surface-2 p-1 shadow-xl">
              {FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => {
                    setFilter(f);
                    setFilterOpen(false);
                  }}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/5"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No activities in this range yet. Plan your day to see a summary here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <SummaryCard key={row.name} row={row} />
          ))}
        </div>
      )}
    </main>
  );
}

function SummaryCard({ row }: { row: Row }) {
  const hours = Math.round(row.totalMinutes / 60);
  const max = Math.max(...row.perDay, 1);
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: row.color }}
          />
          {row.name}
        </span>
        <span className="text-sm">
          <span className="font-semibold">{hours}</span>
          <span className="text-muted"> hr</span>
        </span>
      </div>
      {/* mini per-day bar chart */}
      <div className="mb-3 flex h-12 items-end gap-1 border-t border-white/5 pt-2">
        {row.perDay.map((m, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-indigo-400/40 to-indigo-300/10"
            style={{ height: `${(m / max) * 100}%`, minHeight: m > 0 ? 3 : 0 }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: `${row.color}88` }}
        />
        <span>
          <span className="font-semibold text-foreground">{row.dayCount}</span>{" "}
          day{row.dayCount > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
