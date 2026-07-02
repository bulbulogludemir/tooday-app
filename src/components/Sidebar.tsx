"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock3,
  CalendarDays,
  Check,
  LayoutGrid,
  ListChecks,
  PieChart,
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { useSettingsStore, type Accent } from "@/stores/useSettingsStore";
import { ACCENTS } from "@/components/ThemeApplier";
import { useUiStore } from "@/stores/useUiStore";
import { useToastStore } from "@/stores/useToastStore";
import { Tooltip, TooltipProvider, Kbd } from "@/components/ui/Tooltip";

const VIEWS = [
  { href: "/", label: "Tooday", icon: Clock3, shortcut: "1" },
  { href: "/plan", label: "Plan", icon: CalendarDays, shortcut: "2" },
  { href: "/todos", label: "Todos", icon: ListChecks, shortcut: "3" },
  { href: "/report", label: "Report", icon: PieChart, shortcut: "4" },
  { href: "/areas", label: "Areas", icon: LayoutGrid, shortcut: "5" },
] as const;

export default function Sidebar() {
  const open = useUiStore((s) => s.railOpen);
  const setOpen = useUiStore((s) => s.setRailOpen);
  const pathname = usePathname();
  const router = useRouter();
  const togglePomodoro = useSettingsStore((s) => s.togglePomodoro);
  const toggleCutMode = useUiStore((s) => s.toggleCutMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      // e.code is layout-independent (Alt+digit types symbols on macOS)
      if (e.code === "Digit1") router.push("/");
      else if (e.code === "Digit2") router.push("/plan");
      else if (e.code === "Digit3") router.push("/todos");
      else if (e.code === "Digit4") router.push("/report");
      else if (e.code === "Digit5") router.push("/areas");
      else if (e.code === "KeyP") togglePomodoro();
      else if (e.code === "KeyC") toggleCutMode();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, togglePomodoro, toggleCutMode]);

  return (
    <TooltipProvider>
      <div className="fixed right-0 top-1/2 z-40 -translate-y-1/2">
        <AnimatePresence initial={false} mode="wait">
          {open ? (
            <motion.div
              key="rail"
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mr-2 flex flex-col items-center gap-1"
            >
              <div className="glass elev-1 flex flex-col items-center gap-1 rounded-full p-1.5">
                {VIEWS.map((v) => {
                  const active =
                    v.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(v.href);
                  const Icon = v.icon;
                  return (
                    <Tooltip
                      key={v.href}
                      content={
                        <>
                          {v.label}
                          <span className="flex items-center gap-0.5">
                            <Kbd>⌥</Kbd>
                            <Kbd>{v.shortcut}</Kbd>
                          </span>
                        </>
                      }
                    >
                      <button
                        aria-label={v.label}
                        onClick={() => router.push(v.href)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                          active
                            ? "bg-foreground text-background"
                            : "text-muted hover:bg-white/5 hover:text-foreground"
                        }`}
                      >
                        <Icon size={16} />
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
              <div className="glass elev-1 flex flex-col items-center gap-1 rounded-full p-1.5">
                <Tooltip
                  content={
                    <>
                      Pomodoro
                      <span className="flex items-center gap-0.5">
                        <Kbd>⌥</Kbd>
                        <Kbd>P</Kbd>
                      </span>
                    </>
                  }
                >
                  <button
                    aria-label="Pomodoro"
                    onClick={togglePomodoro}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <AlarmClock size={16} />
                  </button>
                </Tooltip>
                <SettingsMenu />
              </div>
              <button
                aria-label="Collapse sidebar"
                onClick={() => setOpen(false)}
                className="mt-1 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
              >
                <ChevronRight size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="opener"
              initial={{ x: 8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              aria-label="Expand sidebar"
              onClick={() => setOpen(true)}
              className="flex h-9 w-5 items-center justify-center rounded-l-lg bg-surface-2/80 text-muted transition-colors hover:text-foreground"
            >
              <ChevronLeft size={13} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

function SettingsMenu() {
  const {
    clockFormat,
    startDay,
    notificationsEnabled,
    accent,
    setClockFormat,
    setStartDay,
    setNotificationsEnabled,
    setAccent,
  } = useSettingsStore();
  const show = useToastStore((s) => s.show);

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      return;
    }
    if (typeof Notification === "undefined") {
      show("Notifications aren't supported in this browser");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      show("Notifications on — you'll hear about starts & endings");
    } else {
      show("Notification permission was denied");
    }
  };

  const item =
    "flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs outline-none data-[highlighted]:bg-white/5";

  return (
    <DropdownMenu.Root>
      <Tooltip content="Settings">
        <DropdownMenu.Trigger asChild>
          <button
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <Settings2 size={15} />
          </button>
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="left"
          sideOffset={10}
          className="elev-2 z-[60] w-48 rounded-lg border-t border-white/[0.07] bg-surface-2/90 p-1 backdrop-blur-md"
        >
          <DropdownMenu.Label className="px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted/60">
            Clock format
          </DropdownMenu.Label>
          {(["24h", "12h"] as const).map((f) => (
            <DropdownMenu.Item
              key={f}
              onSelect={(e) => {
                e.preventDefault();
                setClockFormat(f);
              }}
              className={item}
            >
              <span className="w-3">
                {clockFormat === f && <Check size={12} />}
              </span>
              {f === "24h" ? "24-hour" : "12-hour"}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-white/5" />
          <DropdownMenu.Label className="px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted/60">
            Week starts on
          </DropdownMenu.Label>
          {[
            { d: 0, label: "Sunday" },
            { d: 1, label: "Monday" },
          ].map(({ d, label }) => (
            <DropdownMenu.Item
              key={d}
              onSelect={(e) => {
                e.preventDefault();
                setStartDay(d);
              }}
              className={item}
            >
              <span className="w-3">
                {startDay === d && <Check size={12} />}
              </span>
              {label}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-white/5" />
          <DropdownMenu.Label className="px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted/60">
            Accent
          </DropdownMenu.Label>
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            {(Object.keys(ACCENTS) as Accent[]).map((a) => (
              <button
                key={a}
                aria-label={`Accent ${a}`}
                onClick={() => setAccent(a)}
                className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                  accent === a ? "ring-2 ring-white/60 ring-offset-2 ring-offset-surface-2" : ""
                }`}
                style={{ background: ACCENTS[a][0] }}
              />
            ))}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-white/5" />
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              toggleNotifications();
            }}
            className={item}
          >
            <span className="w-3">
              {notificationsEnabled && <Check size={12} />}
            </span>
            Notifications
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
