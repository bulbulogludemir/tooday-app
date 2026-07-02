"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlarmClock,
  CalendarDays,
  Clock3,
  CopyPlus,
  LayoutTemplate,
  ListChecks,
  PieChart,
  Plus,
  Scissors,
  Search,
} from "lucide-react";
import dayjs from "dayjs";
import { dayKey, minutesToHHmm, formatDuration } from "@/lib/time";
import { parseQuickAdd } from "@/lib/schedule";
import { hasOverlap, usePlanStore } from "@/stores/usePlanStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useUiStore } from "@/stores/useUiStore";
import { useToastStore } from "@/stores/useToastStore";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

/**
 * ⌘K command palette: navigation, quick actions, template application and
 * natural-language task creation ("gym 9-10.30" adds it to today).
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const templates = usePlanStore((s) => s.templates);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setIndex(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const quickAdd = useMemo(() => parseQuickAdd(query), [query]);

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false);
    const show = useToastStore.getState().show;
    const base: Command[] = [
      {
        id: "nav-clock",
        label: "Go to Clock",
        icon: <Clock3 size={15} />,
        hint: "⌥1",
        run: () => {
          router.push("/");
          close();
        },
      },
      {
        id: "nav-plan",
        label: "Go to Plan",
        icon: <CalendarDays size={15} />,
        hint: "⌥2",
        run: () => {
          router.push("/plan");
          close();
        },
      },
      {
        id: "nav-todos",
        label: "Go to Todos",
        icon: <ListChecks size={15} />,
        hint: "⌥3",
        run: () => {
          router.push("/todos");
          close();
        },
      },
      {
        id: "nav-report",
        label: "Go to Report",
        icon: <PieChart size={15} />,
        hint: "⌥4",
        run: () => {
          router.push("/report");
          close();
        },
      },
      {
        id: "toggle-pomodoro",
        label: "Toggle Pomodoro",
        icon: <AlarmClock size={15} />,
        hint: "⌥P",
        run: () => {
          useSettingsStore.getState().togglePomodoro();
          close();
        },
      },
      {
        id: "toggle-cut",
        label: "Toggle Cut Mode",
        icon: <Scissors size={15} />,
        hint: "⌥C",
        run: () => {
          useUiStore.getState().toggleCutMode();
          router.push("/plan");
          close();
        },
      },
      {
        id: "copy-tomorrow",
        label: "Copy today → tomorrow",
        icon: <CopyPlus size={15} />,
        run: () => {
          const today = dayKey(new Date());
          const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
          const copied = usePlanStore.getState().copyDay(today, tomorrow);
          show(
            copied > 0
              ? `${copied} task${copied > 1 ? "s" : ""} copied to tomorrow`
              : "Nothing copied — tomorrow is occupied"
          );
          close();
        },
      },
      ...templates.map((t) => ({
        id: `tpl-${t.id}`,
        label: `Apply template: ${t.name}`,
        icon: <LayoutTemplate size={15} />,
        run: () => {
          const applied = usePlanStore
            .getState()
            .applyTemplate(t.id, dayKey(new Date()));
          show(
            applied > 0
              ? `"${t.name}" applied to today`
              : "Nothing to add — today is occupied"
          );
          close();
        },
      })),
    ];
    const q = query.trim().toLowerCase();
    return q
      ? base.filter((c) => c.label.toLowerCase().includes(q))
      : base;
  }, [query, router, templates]);

  /** quick-add entry, shown above the commands when the query parses */
  const runQuickAdd = () => {
    if (!quickAdd) return;
    const today = dayKey(new Date());
    const existing = usePlanStore.getState().plans[today] ?? [];
    const show = useToastStore.getState().show;
    if (hasOverlap(existing, quickAdd.start, quickAdd.duration)) {
      show("That time overlaps an existing task");
      return;
    }
    usePlanStore.getState().addActivityWithRepeat(today, {
      name: quickAdd.name,
      category: null,
      start: quickAdd.start,
      duration: quickAdd.duration,
      repeat: [],
    });
    show(
      `"${quickAdd.name}" added · ${minutesToHHmm(quickAdd.start)}-${minutesToHHmm(quickAdd.start + quickAdd.duration)}`
    );
    setOpen(false);
  };

  const total = (quickAdd ? 1 : 0) + commands.length;
  const clampedIndex = Math.min(index, Math.max(0, total - 1));

  const runAt = (i: number) => {
    if (quickAdd && i === 0) return runQuickAdd();
    const cmd = commands[i - (quickAdd ? 1 : 0)];
    cmd?.run();
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="elev-3 fixed left-1/2 top-[18%] z-[80] w-[520px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-2xl border-t border-white/[0.08] bg-surface/90 outline-none backdrop-blur-2xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, total - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              runAt(clampedIndex);
            }
          }}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3">
            <Search size={15} className="shrink-0 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              placeholder="Type a command, or “gym 9-10.30” to add a task…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
            <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted">
              esc
            </kbd>
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {quickAdd && (
              <button
                onClick={runQuickAdd}
                onMouseEnter={() => setIndex(0)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm ${
                  clampedIndex === 0 ? "bg-white/5" : ""
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-strong)] text-white">
                  <Plus size={13} />
                </span>
                <span className="flex-1">
                  Add <span className="font-semibold">{quickAdd.name}</span>{" "}
                  <span className="text-muted">
                    today · {minutesToHHmm(quickAdd.start)}-
                    {minutesToHHmm(quickAdd.start + quickAdd.duration)} (
                    {formatDuration(quickAdd.duration)})
                  </span>
                </span>
                <kbd className="text-[10px] text-muted">↵</kbd>
              </button>
            )}
            {commands.map((c, i) => {
              const idx = i + (quickAdd ? 1 : 0);
              return (
                <button
                  key={c.id}
                  onClick={c.run}
                  onMouseEnter={() => setIndex(idx)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm ${
                    clampedIndex === idx ? "bg-white/5" : ""
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-muted">
                    {c.icon}
                  </span>
                  <span className="flex-1">{c.label}</span>
                  {c.hint && (
                    <kbd className="text-[10px] text-muted">{c.hint}</kbd>
                  )}
                </button>
              );
            })}
            {total === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted/60">
                No matching commands. Try “name 9-10.30” to add a task.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-white/5 px-4 py-2 text-[10px] text-muted/60">
            <span>↑↓ navigate</span>
            <span>↵ run</span>
            <span className="ml-auto">⌘K to toggle</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
