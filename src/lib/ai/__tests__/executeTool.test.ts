import { beforeEach, describe, expect, it } from "vitest";
import { usePlanStore } from "@/stores/usePlanStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { dayKey } from "@/lib/time";
import {
  describeToolCall,
  executeTool,
  serializeResult,
} from "../executeTool";

const DAY = "2026-07-03";

function seedPlan() {
  usePlanStore.setState({
    plans: {
      [DAY]: [
        {
          id: "act-1",
          name: "Gym",
          category: "cat-1",
          start: 540, // 09:00
          duration: 60,
          repeat: [],
        },
      ],
    },
    categories: [
      { id: "cat-1", name: "Health", color: "emerald", type: "offline" },
    ],
    todos: [
      {
        id: "todo-1",
        text: "Buy milk",
        done: false,
        createdAt: "2026-07-01T10:00:00.000Z",
        activity: null,
      },
    ],
    templates: [],
  });
}

beforeEach(() => {
  seedPlan();
  usePomodoroStore.setState({
    round: 0,
    totalWorkingRounds: 8,
    completedByDay: {},
    remainingSeconds: 25 * 60,
    isTicking: false,
  });
  useSettingsStore.setState({ showPomodoro: false });
});

describe("read tools", () => {
  it("get_plan returns mapped activities for a day", () => {
    const res = executeTool("get_plan", { day: DAY });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual({
      day: DAY,
      activities: [
        {
          id: "act-1",
          name: "Gym",
          start: "09:00",
          end: "10:00",
          durationMinutes: 60,
          category: "Health",
          repeatWeekdays: [],
        },
      ],
    });
  });

  it("get_plan defaults to today", () => {
    const res = executeTool("get_plan", {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect((res.data as { day: string }).day).toBe(dayKey());
  });

  it("get_todos returns todos", () => {
    const res = executeTool("get_todos", {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual({
      todos: [
        { id: "todo-1", text: "Buy milk", done: false, activity: null },
      ],
    });
  });

  it("get_pomodoro_status reports phase and counts", () => {
    const res = executeTool("get_pomodoro_status", {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual({
      phase: "focus",
      running: false,
      remainingSeconds: 1500,
      completedToday: 0,
    });
  });
});

describe("add_activity", () => {
  it("adds a non-conflicting activity", () => {
    const res = executeTool("add_activity", {
      day: DAY,
      name: "Study",
      start: "11:00",
      durationMinutes: 90,
      categoryName: "Health",
    });
    expect(res.ok).toBe(true);
    const list = usePlanStore.getState().plans[DAY];
    expect(list).toHaveLength(2);
    const added = list.find((a) => a.name === "Study")!;
    expect(added.start).toBe(660);
    expect(added.duration).toBe(90);
    expect(added.category).toBe("cat-1");
  });

  it("rejects an overlapping activity with a suggestion", () => {
    const res = executeTool("add_activity", {
      day: DAY,
      name: "Clash",
      start: "09:30",
      durationMinutes: 30,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("overlaps");
    expect(usePlanStore.getState().plans[DAY]).toHaveLength(1);
  });

  it("rejects an unknown category and lists valid names", () => {
    const res = executeTool("add_activity", {
      day: DAY,
      name: "X",
      start: "12:00",
      durationMinutes: 30,
      categoryName: "Nope",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("Health");
  });

  it("rejects invalid input via schema", () => {
    const res = executeTool("add_activity", { day: DAY, name: "X" });
    expect(res.ok).toBe(false);
  });
});

describe("update_activity / delete_activity", () => {
  it("updates fields and keeps the rest", () => {
    const res = executeTool("update_activity", {
      day: DAY,
      activityId: "act-1",
      start: "10:00",
      name: "Gym 2",
    });
    expect(res.ok).toBe(true);
    const a = usePlanStore.getState().plans[DAY][0];
    expect(a).toMatchObject({
      id: "act-1",
      name: "Gym 2",
      start: 600,
      duration: 60,
    });
  });

  it("errors on missing activity", () => {
    const res = executeTool("update_activity", {
      day: DAY,
      activityId: "nope",
      name: "X",
    });
    expect(res.ok).toBe(false);
  });

  it("deletes and exposes a working undo", () => {
    const res = executeTool("delete_activity", {
      day: DAY,
      activityId: "act-1",
    });
    expect(res.ok).toBe(true);
    expect(usePlanStore.getState().plans[DAY]).toHaveLength(0);
    if (!res.ok) return;
    res.undo?.();
    expect(usePlanStore.getState().plans[DAY]).toHaveLength(1);
  });
});

describe("todo tools", () => {
  it("add_todo prepends a todo", () => {
    const res = executeTool("add_todo", { text: "New task" });
    expect(res.ok).toBe(true);
    expect(usePlanStore.getState().todos[0].text).toBe("New task");
  });

  it("complete_todo marks done and is idempotent", () => {
    expect(executeTool("complete_todo", { todoId: "todo-1" }).ok).toBe(true);
    expect(usePlanStore.getState().todos[0].done).toBe(true);
    expect(executeTool("complete_todo", { todoId: "todo-1" }).ok).toBe(true);
    expect(usePlanStore.getState().todos[0].done).toBe(true);
  });

  it("delete_todo removes it; unknown id errors", () => {
    expect(executeTool("delete_todo", { todoId: "todo-1" }).ok).toBe(true);
    expect(usePlanStore.getState().todos).toHaveLength(0);
    expect(executeTool("delete_todo", { todoId: "todo-1" }).ok).toBe(false);
  });
});

describe("pomodoro tools", () => {
  it("start_pomodoro starts ticking and reveals the bar", () => {
    const res = executeTool("start_pomodoro", {});
    expect(res.ok).toBe(true);
    expect(usePomodoroStore.getState().isTicking).toBe(true);
    expect(useSettingsStore.getState().showPomodoro).toBe(true);
  });

  it("stop_pomodoro pauses", () => {
    usePomodoroStore.setState({ isTicking: true });
    const res = executeTool("stop_pomodoro", {});
    expect(res.ok).toBe(true);
    expect(usePomodoroStore.getState().isTicking).toBe(false);
  });
});

describe("plumbing", () => {
  it("unknown tool errors", () => {
    expect(executeTool("nope", {}).ok).toBe(false);
  });

  it("serializeResult strips undo", () => {
    const res = executeTool("delete_activity", {
      day: DAY,
      activityId: "act-1",
    });
    const wire = serializeResult(res);
    expect(wire).not.toHaveProperty("undo");
    expect(wire.ok).toBe(true);
  });

  it("describeToolCall renders a human preview", () => {
    const text = describeToolCall("add_activity", {
      day: DAY,
      name: "Study",
      start: "11:00",
      durationMinutes: 90,
    });
    expect(text).toContain("Study");
    expect(text).toContain("11:00");
    expect(text).toContain("12:30");
  });
});
