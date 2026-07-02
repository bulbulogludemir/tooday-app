import { describe, expect, it } from "vitest";
import {
  findFreeSlot,
  findGaps,
  hasOverlap,
  parseQuickAdd,
} from "../schedule";

const acts = [
  { id: "a", start: 0, duration: 120 }, // 00:00-02:00
  { id: "b", start: 540, duration: 120 }, // 09:00-11:00
];

describe("hasOverlap", () => {
  it("detects collisions", () => {
    expect(hasOverlap(acts, 60, 60)).toBe(true); // inside a
    expect(hasOverlap(acts, 500, 60)).toBe(true); // crosses b's start
    expect(hasOverlap(acts, 600, 30)).toBe(true); // inside b
  });

  it("allows touching edges and free ranges", () => {
    expect(hasOverlap(acts, 120, 60)).toBe(false); // starts where a ends
    expect(hasOverlap(acts, 300, 120)).toBe(false);
    expect(hasOverlap(acts, 660, 60)).toBe(false); // starts where b ends
  });

  it("excludes the edited activity itself", () => {
    expect(hasOverlap(acts, 0, 120, "a")).toBe(false);
  });
});

describe("findGaps", () => {
  it("returns the free ranges of the day", () => {
    expect(findGaps(acts)).toEqual([
      { from: 120, to: 540 },
      { from: 660, to: 1440 },
    ]);
  });

  it("covers the whole day when empty", () => {
    expect(findGaps([])).toEqual([{ from: 0, to: 1440 }]);
  });
});

describe("findFreeSlot", () => {
  it("prefers a slot at or after the requested start", () => {
    expect(findFreeSlot(acts, 60, 600)).toBe(660);
  });

  it("keeps the requested start when it already fits", () => {
    expect(findFreeSlot(acts, 60, 300)).toBe(300);
  });

  it("falls back to the earlier gap, as close to the preferred start as fits", () => {
    const packed = [
      { id: "x", start: 300, duration: 1140 }, // 05:00-24:00
    ];
    // only 00:00-05:00 is free; a 2h block lands at 03:00-05:00
    expect(findFreeSlot(packed, 120, 600)).toBe(180);
  });

  it("returns null when the day is full", () => {
    expect(findFreeSlot([{ id: "x", start: 0, duration: 1440 }], 30, 0)).toBe(
      null
    );
  });
});

describe("parseQuickAdd", () => {
  it("parses hour-only ranges", () => {
    expect(parseQuickAdd("gym 9-10")).toEqual({
      name: "gym",
      start: 540,
      duration: 60,
    });
  });

  it("parses colon and dot minutes", () => {
    expect(parseQuickAdd("deep work 09:15-11:45")).toEqual({
      name: "deep work",
      start: 555,
      duration: 150,
    });
    expect(parseQuickAdd("gym 9-10.30")).toEqual({
      name: "gym",
      start: 540,
      duration: 90,
    });
  });

  it("rejects non-task text and invalid ranges", () => {
    expect(parseQuickAdd("go to plan")).toBeNull();
    expect(parseQuickAdd("gym 10-9")).toBeNull();
    expect(parseQuickAdd("gym 25-26")).toBeNull();
    expect(parseQuickAdd("9-10")).toBeNull();
  });
});
