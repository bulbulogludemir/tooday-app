"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { AnimatePresence } from "framer-motion";
import ClockDial, { type DialSegment } from "@/components/clock/ClockDial";
import StatusChip from "@/components/clock/StatusChip";
import ActivityDetailModal from "@/components/clock/ActivityDetailModal";
import ActiveTodos from "@/components/clock/ActiveTodos";
import Onboarding from "@/components/Onboarding";
import ActivityCard from "@/components/ActivityCard";
import TimeTicker from "@/components/ui/TimeTicker";
import { useNow } from "@/lib/useNow";
import { dayKey, nowMinutes } from "@/lib/time";
import { ARC_UNCATEGORIZED, colorArc } from "@/lib/colors";
import {
  usePlanStore,
  categoryOf,
  type Activity,
} from "@/stores/usePlanStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function ClockPage() {
  const now = useNow(1000);
  const [detail, setDetail] = useState<Activity | null>(null);
  const plans = usePlanStore((s) => s.plans);
  const categories = usePlanStore((s) => s.categories);
  const clockFormat = useSettingsStore((s) => s.clockFormat);

  if (!now) return <main className="min-h-screen" />;

  const today = plans[dayKey(now)] ?? [];
  const mins = nowMinutes(now);

  const segments: DialSegment[] = today.map((a) => {
    const cat = categoryOf(a, categories);
    return {
      id: a.id,
      start: a.start,
      duration: a.duration,
      color: cat ? colorArc(cat.color) : ARC_UNCATEGORIZED,
      label: a.name,
    };
  });

  const activeActivity = today.find(
    (a) => mins >= a.start && mins < a.start + a.duration
  );
  const sceneTint = activeActivity
    ? colorArc(categoryOf(activeActivity, categories)?.color)
    : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center">
      {/* ambient scene light tinted by the running activity */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 transition-[background] duration-1000"
        style={{
          background: `radial-gradient(55% 45% at 50% 32%, ${
            sceneTint ? `${sceneTint}0d` : "rgba(255,255,255,0.02)"
          }, transparent 70%)`,
        }}
      />
      {/* today's activity list */}
      <div className="absolute left-4 top-1/2 flex w-72 -translate-y-1/2 flex-col gap-2 max-lg:hidden">
        <AnimatePresence initial={false}>
          {today.map((a, i) => (
            <ActivityCard
              key={a.id}
              activity={a}
              categories={categories}
              state={
                mins >= a.start + a.duration
                  ? "past"
                  : mins >= a.start
                    ? "active"
                    : "upcoming"
              }
              index={i}
              onClick={() => setDetail(a)}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted">
            {dayjs(now).format("DD MMM YYYY")}
          </span>
          <span className="flex items-baseline gap-2">
            <TimeTicker
              value={dayjs(now).format(
                clockFormat === "12h" ? "hh:mm" : "HH:mm"
              )}
              className="font-display text-6xl font-bold tracking-tight"
            />
            {clockFormat === "12h" && (
              <span className="font-display text-lg font-semibold text-muted">
                {dayjs(now).format("A")}
              </span>
            )}
          </span>
        </div>

        <ClockDial
          segments={segments}
          needleMinutes={mins}
          size={320}
          onSegmentClick={(id) => {
            const a = today.find((x) => x.id === id);
            if (a) setDetail(a);
          }}
        />

        <StatusChip
          activities={today}
          nowMinutes={mins}
          categories={categories}
        />

        <ActiveTodos activityName={activeActivity?.name ?? null} />

        {/* mobile: cards below the clock instead of floating left */}
        <div className="mt-6 flex w-full max-w-sm flex-col gap-2 px-4 pb-10 lg:hidden">
          {today.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              categories={categories}
              state={
                mins >= a.start + a.duration
                  ? "past"
                  : mins >= a.start
                    ? "active"
                    : "upcoming"
              }
              onClick={() => setDetail(a)}
            />
          ))}
        </div>
      </div>

      <ActivityDetailModal
        activity={detail}
        categories={categories}
        onClose={() => setDetail(null)}
      />

      <Onboarding />
    </main>
  );
}
