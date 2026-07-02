"use client";

import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { AnimatePresence } from "framer-motion";
import ClockDial, { type DialSegment } from "@/components/clock/ClockDial";
import ActivityCard from "@/components/ActivityCard";
import WeekStrip from "@/components/plan/WeekStrip";
import WeekView from "@/components/plan/WeekView";
import TimelineBar from "@/components/plan/TimelineBar";
import ActivityModal from "@/components/plan/ActivityModal";
import TimeTicker from "@/components/ui/TimeTicker";
import ManageCategoriesModal from "@/components/plan/ManageCategoriesModal";
import TemplatesModal from "@/components/plan/TemplatesModal";
import PlanToolsRail from "@/components/plan/PlanToolsRail";
import { useNow } from "@/lib/useNow";
import { dayKey, nowMinutes } from "@/lib/time";
import { ARC_UNCATEGORIZED, colorArc } from "@/lib/colors";
import {
  usePlanStore,
  categoryOf,
  type Activity,
} from "@/stores/usePlanStore";
import { useUiStore } from "@/stores/useUiStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useToastStore } from "@/stores/useToastStore";

export default function PlanPage() {
  const now = useNow(1000);
  const [selected, setSelected] = useState<Dayjs>(() => dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [createAt, setCreateAt] = useState<number | null>(null);
  const [view, setView] = useState<"day" | "week">("day");

  const plans = usePlanStore((s) => s.plans);
  const categories = usePlanStore((s) => s.categories);
  const removeActivity = usePlanStore((s) => s.removeActivity);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const cutMode = useUiStore((s) => s.cutMode);
  const setCutMode = useUiStore((s) => s.setCutMode);

  // leaving the page always exits cut mode
  useEffect(() => () => setCutMode(false), [setCutMode]);

  if (!now) return <main className="min-h-screen" />;

  const key = dayKey(selected);
  const activities = plans[key] ?? [];
  const isToday = selected.isSame(dayjs(now), "day");
  const mins = nowMinutes(now);

  const segments: DialSegment[] = activities.map((a) => {
    const cat = categoryOf(a, categories);
    return {
      id: a.id,
      start: a.start,
      duration: a.duration,
      color: cat ? colorArc(cat.color) : ARC_UNCATEGORIZED,
      label: a.name,
    };
  });

  const openNew = () => {
    setEditing(null);
    setCreateAt(null);
    setModalOpen(true);
  };

  /** clicking an empty spot on the timeline creates a task at that time */
  const openCreateAt = (startMinutes: number) => {
    setEditing(null);
    setCreateAt(startMinutes);
    setModalOpen(true);
  };

  /** In cut mode a click deletes instantly; otherwise open the edit modal */
  const handleActivityClick = (a: Activity, dk: string = key) => {
    if (cutMode) {
      removeActivity(dk, a.id);
      useToastStore.getState().show(`"${a.name}" deleted`, {
        actionLabel: "Undo",
        onAction: () => usePlanStore.getState().restoreActivity(dk, a),
      });
      return;
    }
    setEditing(a);
    setModalOpen(true);
  };

  return (
    <main
      className={`relative flex min-h-screen flex-col items-center justify-between pt-4 ${
        cutMode ? "cursor-crosshair" : ""
      }`}
    >
      <div className="flex flex-col items-center gap-3">
        <WeekStrip selected={selected} onSelect={setSelected} />
        {/* day / week toggle */}
        <div className="flex items-center rounded-full bg-surface p-1 text-xs">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3.5 py-1 capitalize transition-colors ${
                view === v
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* selected day's activity list */}
      {view === "day" && (
        <div className="absolute left-4 top-1/2 flex w-72 -translate-y-1/2 flex-col gap-2 max-lg:hidden">
          <AnimatePresence initial={false}>
            {activities.map((a, i) => (
              <ActivityCard
                key={a.id}
                activity={a}
                categories={categories}
                cutMode={cutMode}
                index={i}
                onClick={() => handleActivityClick(a)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {view === "week" && (
        <WeekView
          selected={selected}
          plans={plans}
          categories={categories}
          nowMinutes={mins}
          onSelectDay={(d) => {
            setSelected(d);
            setView("day");
          }}
          onSelectActivity={(d, a) => {
            setSelected(d);
            handleActivityClick(a, dayKey(d));
          }}
          onCreateAt={(d, startMinutes) => {
            setSelected(d);
            openCreateAt(startMinutes);
          }}
        />
      )}

      <div
        className={`flex flex-col items-center gap-8 ${
          view === "week" ? "hidden" : ""
        }`}
      >
        <span className="flex items-baseline gap-2">
          <TimeTicker
            value={dayjs(now).format(
              clockFormat === "12h" ? "hh:mm" : "HH:mm"
            )}
            className="font-display text-5xl font-bold tracking-tight"
          />
          {clockFormat === "12h" && (
            <span className="font-display text-base font-semibold text-muted">
              {dayjs(now).format("A")}
            </span>
          )}
        </span>
        <ClockDial
          segments={segments}
          needleMinutes={isToday ? mins : undefined}
          size={285}
          onSegmentClick={(id) => {
            const a = activities.find((x) => x.id === id);
            if (a) handleActivityClick(a);
          }}
        />

        {/* mobile: cards below the dial instead of floating left */}
        <div className="mt-4 flex w-full max-w-sm flex-col gap-2 px-4 lg:hidden">
          {activities.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              categories={categories}
              cutMode={cutMode}
              onClick={() => handleActivityClick(a)}
            />
          ))}
        </div>
      </div>

      {view === "day" ? (
        <TimelineBar
          day={key}
          selected={selected}
          onSelect={setSelected}
          activities={activities}
          categories={categories}
          nowMinutes={isToday ? mins : undefined}
          onSelectActivity={handleActivityClick}
          onCreateAt={openCreateAt}
        />
      ) : (
        <span />
      )}

      <PlanToolsRail
        onNewActivity={openNew}
        onManageCategories={() => setCategoriesOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onCopyDay={(offset) => {
          const target = selected.add(offset, "day");
          const copied = usePlanStore
            .getState()
            .copyDay(key, dayKey(target));
          useToastStore
            .getState()
            .show(
              copied > 0
                ? `${copied} task${copied > 1 ? "s" : ""} copied to ${target.format("ddd, DD MMM")}`
                : "Nothing copied — target day is occupied"
            );
        }}
      />

      <ActivityModal
        open={modalOpen}
        day={key}
        editing={editing}
        initial={
          createAt !== null
            ? {
                start: createAt,
                // default hour, clipped to the next activity's start
                end: Math.min(
                  createAt + 60,
                  activities.reduce(
                    (next, a) =>
                      a.start >= createAt + 15 ? Math.min(next, a.start) : next,
                    1439
                  )
                ),
              }
            : null
        }
        onClose={() => setModalOpen(false)}
      />
      <ManageCategoriesModal
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />
      <TemplatesModal
        open={templatesOpen}
        day={key}
        onClose={() => setTemplatesOpen(false)}
      />
    </main>
  );
}
