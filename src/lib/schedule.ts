import type { Activity } from "@/stores/usePlanStore";

const DAY = 1440;
const MIN_DURATION = 15;

/** true when [start, start+duration) collides with any other activity */
export function hasOverlap(
  list: Pick<Activity, "id" | "start" | "duration">[],
  start: number,
  duration: number,
  excludeId?: string
): boolean {
  const end = start + duration;
  return list.some(
    (a) => a.id !== excludeId && start < a.start + a.duration && a.start < end
  );
}

/** free ranges of a day around the given activities */
export function findGaps(
  list: Pick<Activity, "start" | "duration">[]
): { from: number; to: number }[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const gaps: { from: number; to: number }[] = [];
  let cursor = 0;
  for (const a of sorted) {
    if (a.start > cursor) gaps.push({ from: cursor, to: a.start });
    cursor = Math.max(cursor, a.start + a.duration);
  }
  if (cursor < DAY) gaps.push({ from: cursor, to: DAY });
  return gaps;
}

/**
 * First slot of `duration` minutes that fits, preferring slots at or after
 * `preferredStart`. Returns the new start, or null when the day is full.
 */
export function findFreeSlot(
  list: Pick<Activity, "id" | "start" | "duration">[],
  duration: number,
  preferredStart: number,
  excludeId?: string
): number | null {
  const others = list.filter((a) => a.id !== excludeId);
  const fits = findGaps(others).filter((g) => g.to - g.from >= duration);
  if (fits.length === 0) return null;
  const later = fits.find((g) => g.to > preferredStart);
  const slot = later ?? fits[0];
  return Math.max(slot.from, Math.min(preferredStart, slot.to - duration));
}

export interface QuickAdd {
  name: string;
  start: number;
  duration: number;
}

/**
 * Parses quick-add strings like "gym 9-10.30", "deep work 09:00-11:15",
 * "lunch 12 - 13". Returns null when the text doesn't look like a task.
 */
export function parseQuickAdd(input: string): QuickAdd | null {
  const m =
    /^(.+?)\s+(\d{1,2})(?:[:.](\d{2}))?\s*[-–]\s*(\d{1,2})(?:[:.](\d{2}))?$/.exec(
      input.trim()
    );
  if (!m) return null;
  const name = m[1].trim();
  const sh = Number(m[2]);
  const sm = Number(m[3] ?? 0);
  const eh = Number(m[4]);
  const em = Number(m[5] ?? 0);
  if (!name || sh > 23 || eh > 24 || sm > 59 || em > 59) return null;
  const start = sh * 60 + sm;
  const end = Math.min(eh * 60 + em, DAY);
  if (end - start < MIN_DURATION) return null;
  return { name, start, duration: end - start };
}
