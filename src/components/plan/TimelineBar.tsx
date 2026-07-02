"use client";

import { useRef, useState } from "react";
import { Dayjs } from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDuration, minutesToHHmm } from "@/lib/time";
import { colorArc } from "@/lib/colors";
import type { Activity, Category } from "@/stores/usePlanStore";
import { categoryOf, usePlanStore } from "@/stores/usePlanStore";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { useUiStore } from "@/stores/useUiStore";

const DAY_MINUTES = 1440;
const SNAP = 5; // drag snaps to 5-minute steps
const MIN_DURATION = 15;

interface TimelineBarProps {
  day: string; // YYYY-MM-DD key of the shown day
  selected: Dayjs;
  onSelect: (d: Dayjs) => void;
  activities: Activity[];
  categories: Category[];
  /** current time in minutes when the shown day is today */
  nowMinutes?: number;
  /** plain click on a block (edit / cut) */
  onSelectActivity?: (a: Activity) => void;
  /** click on empty bar space -> create at that time */
  onCreateAt?: (startMinutes: number) => void;
}

interface DragState {
  id: string;
  mode: "move" | "start" | "end";
  clientX: number;
  origStart: number;
  origDuration: number;
  moved: boolean;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export default function TimelineBar({
  day,
  selected,
  onSelect,
  activities,
  categories,
  nowMinutes,
  onSelectActivity,
  onCreateAt,
}: TimelineBarProps) {
  const cutMode = useUiStore((s) => s.cutMode);
  const updateActivity = usePlanStore((s) => s.updateActivity);
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const hours = Array.from({ length: 23 }, (_, i) => i + 1);

  /** shared drag engine: move the block or stretch either edge */
  const beginDrag = (
    e: React.PointerEvent,
    a: Activity,
    mode: DragState["mode"]
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragRef.current = {
      id: a.id,
      mode,
      clientX: e.clientX,
      origStart: a.start,
      origDuration: a.duration,
      moved: false,
    };
    setDraggingId(a.id);

    // an activity owns its slot: movement is confined to the free corridor
    // between the neighbors around its original position
    const others = (usePlanStore.getState().plans[day] ?? []).filter(
      (x) => x.id !== a.id
    );
    const origEnd = a.start + a.duration;
    const corridorStart = others.reduce(
      (lo, o) => (o.start + o.duration <= a.start ? Math.max(lo, o.start + o.duration) : lo),
      0
    );
    const corridorEnd = others.reduce(
      (hi, o) => (o.start >= origEnd ? Math.min(hi, o.start) : hi),
      DAY_MINUTES
    );

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      const bar = barRef.current;
      if (!d || !bar) return;
      const rect = bar.getBoundingClientRect();
      const deltaMin =
        Math.round(
          (((ev.clientX - d.clientX) / rect.width) * DAY_MINUTES) / SNAP
        ) * SNAP;
      if (deltaMin !== 0) d.moved = true;
      if (!d.moved) return;
      const current = usePlanStore
        .getState()
        .plans[day]?.find((x) => x.id === d.id);
      if (!current) return;
      let start = current.start;
      let duration = current.duration;
      if (d.mode === "move") {
        start = clamp(
          d.origStart + deltaMin,
          corridorStart,
          corridorEnd - d.origDuration
        );
        duration = d.origDuration;
      } else if (d.mode === "end") {
        duration = clamp(
          d.origDuration + deltaMin,
          MIN_DURATION,
          corridorEnd - d.origStart
        );
      } else {
        const end = d.origStart + d.origDuration;
        start = clamp(d.origStart + deltaMin, corridorStart, end - MIN_DURATION);
        duration = end - start;
      }
      if (start !== current.start || duration !== current.duration)
        updateActivity(day, { ...current, start, duration });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      const d = dragRef.current;
      dragRef.current = null;
      setDraggingId(null);
      // no movement -> treat as a click (open edit, or cut in cut mode)
      if (d && !d.moved && mode === "move") {
        const a2 = usePlanStore.getState().plans[day]?.find((x) => x.id === d.id);
        if (a2) onSelectActivity?.(a2);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  /** click on empty bar space creates a task starting at that spot */
  const handleBarClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget || !onCreateAt || cutMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mins =
      Math.floor(
        (((e.clientX - rect.left) / rect.width) * DAY_MINUTES) / 15
      ) * 15;
    onCreateAt(clamp(mins, 0, DAY_MINUTES - 60));
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-screen-xl px-6 pb-6">
        <div className="flex items-center gap-3">
          <NavButton
            label="Previous day"
            onClick={() => onSelect(selected.subtract(1, "day"))}
          >
            <ChevronLeft size={15} />
          </NavButton>

          <div className="min-w-0 flex-1 overflow-x-auto pb-1">
            <div className="min-w-[720px]">
            {/* hour labels */}
            <div className="relative mb-1.5 h-12">
              {hours.map((h) => (
                <span
                  key={h}
                  className="absolute bottom-0 origin-bottom-left -translate-x-[14px] -rotate-90 text-[11px] text-muted"
                  style={{ left: `${(h / 24) * 100}%` }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>

            {/* the editable day strip */}
            <div
              ref={barRef}
              onClick={handleBarClick}
              title={cutMode ? undefined : "Click an empty spot to add a task"}
              className={`relative h-16 rounded-xl border-t border-white/[0.06] bg-surface/60 shadow-inner shadow-black/30 backdrop-blur-md ${
                onCreateAt && !cutMode ? "cursor-copy" : ""
              }`}
            >
              {/* hour gridlines */}
              {hours.map((h) => (
                <span
                  key={h}
                  className="pointer-events-none absolute top-0 h-full w-px bg-white/5"
                  style={{ left: `${(h / 24) * 100}%` }}
                />
              ))}

              {/* current time line */}
              {nowMinutes !== undefined && (
                <span
                  className="pointer-events-none absolute -top-1 bottom-0 z-20 w-px bg-white/70"
                  style={{ left: `${(nowMinutes / DAY_MINUTES) * 100}%` }}
                >
                  <span className="absolute -left-[3px] -top-1 h-[7px] w-[7px] rounded-full bg-white" />
                </span>
              )}

              {/* live time label while dragging */}
              {draggingId &&
                (() => {
                  const a = activities.find((x) => x.id === draggingId);
                  if (!a) return null;
                  const center =
                    ((a.start + a.duration / 2) / DAY_MINUTES) * 100;
                  return (
                    <span
                      className="elev-2 pointer-events-none absolute -top-11 z-40 -translate-x-1/2 whitespace-nowrap rounded-lg border-t border-white/[0.07] bg-surface-2/90 px-2.5 py-1 text-[11px] font-semibold tabular-nums backdrop-blur-md"
                      style={{ left: `${center}%` }}
                    >
                      {minutesToHHmm(a.start)} –{" "}
                      {minutesToHHmm(a.start + a.duration)}
                      <span className="ml-1.5 font-normal text-muted">
                        {formatDuration(a.duration)}
                      </span>
                    </span>
                  );
                })()}
              <AnimatePresence initial={false}>
                {activities.map((a) => {
                  const color = colorArc(categoryOf(a, categories)?.color);
                  const left = (a.start / DAY_MINUTES) * 100;
                  const width = (a.duration / DAY_MINUTES) * 100;
                  const isDragging = draggingId === a.id;
                  return (
                    <Tooltip
                      key={a.id}
                      side="top"
                      content={
                        <span className="flex flex-col items-center gap-0.5 py-0.5 text-center">
                          <span className="font-medium">{a.name}</span>
                          <span className="tabular-nums text-muted">
                            {minutesToHHmm(a.start)}-
                            {minutesToHHmm(a.start + a.duration)}
                          </span>
                          <span className="font-semibold">
                            {formatDuration(a.duration)}
                          </span>
                        </span>
                      }
                    >
                      <motion.div
                        role="button"
                        onPointerDown={(e) => beginDrag(e, a, "move")}
                        initial={{ opacity: 0, scaleY: 0.6 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{
                          opacity: 0,
                          scaleY: 0.6,
                          transition: { duration: 0.12 },
                        }}
                        className={`absolute top-1.5 z-10 flex h-[52px] select-none items-center justify-center overflow-hidden rounded-lg text-[11px] font-semibold shadow-md shadow-black/30 transition-[filter] ${
                          isDragging
                            ? "z-30 ring-1 ring-white/40 brightness-110"
                            : cutMode
                              ? "ring-1 ring-red-400/60 hover:brightness-75"
                              : "hover:brightness-110"
                        } ${
                          cutMode
                            ? "cursor-pointer"
                            : "cursor-grab active:cursor-grabbing"
                        }`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: `linear-gradient(to bottom, ${color}, ${color}cc)`,
                          touchAction: "none",
                        }}
                      >
                        {/* resize handles */}
                        {!cutMode && (
                          <>
                            <span
                              onPointerDown={(e) => beginDrag(e, a, "start")}
                              className="absolute left-0 top-0 z-10 h-full w-3 cursor-ew-resize"
                            >
                              <span className="absolute bottom-2 left-1 top-2 w-1 rounded-full bg-black/25" />
                            </span>
                            <span
                              onPointerDown={(e) => beginDrag(e, a, "end")}
                              className="absolute right-0 top-0 z-10 h-full w-3 cursor-ew-resize"
                            >
                              <span className="absolute bottom-2 right-1 top-2 w-1 rounded-full bg-black/25" />
                            </span>
                          </>
                        )}
                        {width > 3 && (
                          <span className="pointer-events-none truncate rounded-full bg-black/35 px-2.5 py-1 text-white/90">
                            {a.name}
                          </span>
                        )}
                      </motion.div>
                    </Tooltip>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* day caption */}
            <div className="mt-2 text-center text-xs text-muted">
              {selected.format("dddd, DD MMM")}
            </div>
            </div>
          </div>

          <NavButton
            label="Next day"
            onClick={() => onSelect(selected.add(1, "day"))}
          >
            <ChevronRight size={15} />
          </NavButton>
        </div>
      </div>
    </TooltipProvider>
  );
}

function NavButton({
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}
