"use client";

import { useEffect, useRef } from "react";
import { dayKey, minutesToHHmm } from "@/lib/time";
import { usePlanStore } from "@/stores/usePlanStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Fires a browser notification when an activity starts and 5 minutes
 * before it ends. Checks twice a minute; each event fires only once.
 */
export default function NotificationsWatcher() {
  const enabled = useSettingsStore((s) => s.notificationsEnabled);
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      if (
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      )
        return;
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const key = dayKey(now);
      const acts = usePlanStore.getState().plans[key] ?? [];
      const fire = (id: string, title: string, body: string) => {
        if (fired.current.has(id)) return;
        fired.current.add(id);
        try {
          new Notification(title, { body, icon: "/icon.svg" });
        } catch {
          // notification construction can fail on some platforms; ignore
        }
      };
      for (const a of acts) {
        if (a.start === mins)
          fire(
            `start-${key}-${a.id}`,
            `${a.name} started`,
            `${minutesToHHmm(a.start)} – ${minutesToHHmm(a.start + a.duration)}`
          );
        if (a.start + a.duration - 5 === mins)
          fire(
            `end-${key}-${a.id}`,
            `${a.name} ends in 5 minutes`,
            `Wraps up at ${minutesToHHmm(a.start + a.duration)}`
          );
      }
    };

    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [enabled]);

  return null;
}
