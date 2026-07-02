import dayjs from "dayjs";

/** "YYYY-MM-DD" key used to index plans per day */
export function dayKey(d: Date | dayjs.Dayjs = new Date()): string {
  return dayjs(d).format("YYYY-MM-DD");
}

/** minutes since midnight -> "HH:mm" */
export function minutesToHHmm(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "HH:mm" -> minutes since midnight, or null when invalid */
export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** minutes since midnight for a given date's current time */
export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** e.g. 90 -> "1hr 30m", 40 -> "40m", 120 -> "2hr" */
export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}hr`;
  return `${h}hr ${m}m`;
}
