import { describe, expect, it } from "vitest";
import {
  dayKey,
  formatDuration,
  hhmmToMinutes,
  minutesToHHmm,
} from "../time";

describe("minutesToHHmm", () => {
  it("formats minutes since midnight", () => {
    expect(minutesToHHmm(0)).toBe("00:00");
    expect(minutesToHHmm(540)).toBe("09:00");
    expect(minutesToHHmm(1439)).toBe("23:59");
  });

  it("wraps values beyond a day", () => {
    expect(minutesToHHmm(1440)).toBe("00:00");
    expect(minutesToHHmm(-60)).toBe("23:00");
  });
});

describe("hhmmToMinutes", () => {
  it("parses valid times", () => {
    expect(hhmmToMinutes("00:00")).toBe(0);
    expect(hhmmToMinutes("9:30")).toBe(570);
    expect(hhmmToMinutes("23:59")).toBe(1439);
  });

  it("rejects invalid input", () => {
    expect(hhmmToMinutes("24:00")).toBeNull();
    expect(hhmmToMinutes("12:60")).toBeNull();
    expect(hhmmToMinutes("abc")).toBeNull();
    expect(hhmmToMinutes("")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(40)).toBe("40m");
    expect(formatDuration(120)).toBe("2hr");
    expect(formatDuration(90)).toBe("1hr 30m");
  });
});

describe("dayKey", () => {
  it("produces YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 6, 2))).toBe("2026-07-02");
  });
});
