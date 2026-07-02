import { z } from "zod";
import { findFreeSlot } from "@/lib/schedule";
import { dayKey, hhmmToMinutes, minutesToHHmm } from "@/lib/time";
import {
  categoryOf,
  hasOverlap,
  usePlanStore,
  type Activity,
} from "@/stores/usePlanStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { toolSchemas, type ChatToolName } from "./tools";

export type ToolExecutionResult =
  | { ok: true; data: unknown; summary: string; undo?: () => void }
  | { ok: false; error: string };

type Input<N extends ChatToolName> = z.infer<(typeof toolSchemas)[N]>;

function endOf(startMinutes: number, duration: number): string {
  return minutesToHHmm(Math.min(startMinutes + duration, 1439));
}

function resolveCategoryId(name: string): { id: string } | { error: string } {
  const categories = usePlanStore.getState().categories;
  const match = categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (!match) {
    const valid = categories.map((c) => c.name).join(", ") || "(none)";
    return { error: `Unknown category "${name}". Valid categories: ${valid}` };
  }
  return { id: match.id };
}

function findActivity(
  day: string,
  activityId: string,
): { activity: Activity } | { error: string } {
  const activity = (usePlanStore.getState().plans[day] ?? []).find(
    (a) => a.id === activityId,
  );
  if (!activity) {
    return {
      error: `No activity with id "${activityId}" on ${day}. Use get_plan to list activities.`,
    };
  }
  return { activity };
}

const handlers: {
  [N in ChatToolName]: (input: Input<N>) => ToolExecutionResult;
} = {
  get_plan: ({ day }) => {
    const target = day ?? dayKey();
    const { plans, categories } = usePlanStore.getState();
    const activities = (plans[target] ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      start: minutesToHHmm(a.start),
      end: endOf(a.start, a.duration),
      durationMinutes: a.duration,
      category: categoryOf(a, categories)?.name ?? null,
      repeatWeekdays: a.repeat,
    }));
    return {
      ok: true,
      data: { day: target, activities },
      summary: `Read ${activities.length} activities for ${target}`,
    };
  },

  get_todos: () => {
    const todos = usePlanStore.getState().todos.map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      activity: t.activity ?? null,
    }));
    return { ok: true, data: { todos }, summary: `Read ${todos.length} todos` };
  },

  get_categories: () => {
    const categories = usePlanStore
      .getState()
      .categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
    return {
      ok: true,
      data: { categories },
      summary: `Read ${categories.length} categories`,
    };
  },

  get_pomodoro_status: () => {
    const s = usePomodoroStore.getState();
    return {
      ok: true,
      data: {
        phase: s.round % 2 === 0 ? "focus" : "break",
        running: s.isTicking,
        remainingSeconds: s.remainingSeconds,
        completedToday: s.completedByDay[dayKey()] ?? 0,
      },
      summary: "Read pomodoro status",
    };
  },

  add_activity: (input) => {
    const start = hhmmToMinutes(input.start);
    if (start === null) {
      return { ok: false, error: `Invalid start time "${input.start}"` };
    }
    let categoryId: string | null = null;
    if (input.categoryName) {
      const resolved = resolveCategoryId(input.categoryName);
      if ("error" in resolved) return { ok: false, error: resolved.error };
      categoryId = resolved.id;
    }
    const list = usePlanStore.getState().plans[input.day] ?? [];
    if (hasOverlap(list, start, input.durationMinutes)) {
      const free = findFreeSlot(list, input.durationMinutes, start);
      const hint =
        free !== null
          ? ` Nearest free slot: ${minutesToHHmm(free)}.`
          : " No free slot of that length today.";
      return {
        ok: false,
        error: `"${input.name}" overlaps an existing activity on ${input.day}.${hint}`,
      };
    }
    const draft = {
      name: input.name,
      category: categoryId,
      start,
      duration: input.durationMinutes,
      repeat: input.repeatWeekdays ?? [],
    };
    if (draft.repeat.length > 0) {
      usePlanStore.getState().addActivityWithRepeat(input.day, draft);
    } else {
      usePlanStore.getState().addActivity(input.day, draft);
    }
    const added = usePlanStore
      .getState()
      .plans[input.day].find((a) => a.name === input.name && a.start === start);
    return {
      ok: true,
      data: { id: added?.id ?? null },
      summary: `Added "${input.name}" on ${input.day} at ${input.start}–${endOf(start, input.durationMinutes)}`,
    };
  },

  update_activity: (input) => {
    const found = findActivity(input.day, input.activityId);
    if ("error" in found) return { ok: false, error: found.error };
    const prev = found.activity;
    let categoryId = prev.category;
    if (input.categoryName === null) categoryId = null;
    else if (typeof input.categoryName === "string") {
      const resolved = resolveCategoryId(input.categoryName);
      if ("error" in resolved) return { ok: false, error: resolved.error };
      categoryId = resolved.id;
    }
    let start = prev.start;
    if (input.start !== undefined) {
      const parsed = hhmmToMinutes(input.start);
      if (parsed === null) {
        return { ok: false, error: `Invalid start time "${input.start}"` };
      }
      start = parsed;
    }
    const duration = input.durationMinutes ?? prev.duration;
    const list = usePlanStore.getState().plans[input.day] ?? [];
    if (hasOverlap(list, start, duration, prev.id)) {
      return {
        ok: false,
        error: `The new time overlaps another activity on ${input.day}.`,
      };
    }
    const next: Activity = {
      ...prev,
      name: input.name ?? prev.name,
      category: categoryId,
      start,
      duration,
    };
    usePlanStore.getState().updateActivity(input.day, next);
    return {
      ok: true,
      data: { id: next.id },
      summary: `Updated "${next.name}" on ${input.day} (${minutesToHHmm(start)}–${endOf(start, duration)})`,
      undo: () => usePlanStore.getState().updateActivity(input.day, prev),
    };
  },

  delete_activity: (input) => {
    const found = findActivity(input.day, input.activityId);
    if ("error" in found) return { ok: false, error: found.error };
    const removed = found.activity;
    usePlanStore.getState().removeActivity(input.day, removed.id);
    return {
      ok: true,
      data: { id: removed.id },
      summary: `Deleted "${removed.name}" from ${input.day}`,
      undo: () => usePlanStore.getState().restoreActivity(input.day, removed),
    };
  },

  add_todo: ({ text }) => {
    usePlanStore.getState().addTodo(text);
    const added = usePlanStore.getState().todos[0];
    return { ok: true, data: { id: added.id }, summary: `Added todo "${text}"` };
  },

  complete_todo: ({ todoId }) => {
    const todo = usePlanStore.getState().todos.find((t) => t.id === todoId);
    if (!todo) return { ok: false, error: `No todo with id "${todoId}"` };
    if (!todo.done) usePlanStore.getState().toggleTodo(todoId);
    return {
      ok: true,
      data: { id: todoId },
      summary: `Completed "${todo.text}"`,
    };
  },

  delete_todo: ({ todoId }) => {
    const todo = usePlanStore.getState().todos.find((t) => t.id === todoId);
    if (!todo) return { ok: false, error: `No todo with id "${todoId}"` };
    usePlanStore.getState().removeTodo(todoId);
    return {
      ok: true,
      data: { id: todoId },
      summary: `Deleted todo "${todo.text}"`,
    };
  },

  start_pomodoro: () => {
    const settings = useSettingsStore.getState();
    if (!settings.showPomodoro) settings.togglePomodoro();
    usePomodoroStore.getState().start();
    return { ok: true, data: {}, summary: "Pomodoro started" };
  },

  stop_pomodoro: () => {
    usePomodoroStore.getState().pause();
    return { ok: true, data: {}, summary: "Pomodoro paused" };
  },
};

export function executeTool(
  toolName: string,
  rawInput: unknown,
): ToolExecutionResult {
  const schema = toolSchemas[toolName as ChatToolName];
  if (!schema) return { ok: false, error: `Unknown tool "${toolName}"` };
  const parsed = schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Invalid input — ${issues}` };
  }
  const handler = handlers[toolName as ChatToolName] as (
    input: unknown,
  ) => ToolExecutionResult;
  return handler(parsed.data);
}

export function serializeResult(r: ToolExecutionResult): {
  ok: boolean;
  data?: unknown;
  summary?: string;
  error?: string;
} {
  return r.ok
    ? { ok: true, data: r.data, summary: r.summary }
    : { ok: false, error: r.error };
}

export function describeToolCall(toolName: string, input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  switch (toolName) {
    case "add_activity": {
      const start = typeof i.start === "string" ? i.start : "?";
      const mins =
        typeof i.durationMinutes === "number" ? i.durationMinutes : 0;
      const parsed = typeof i.start === "string" ? hhmmToMinutes(i.start) : null;
      const end = parsed !== null ? endOf(parsed, mins) : "?";
      const repeat =
        Array.isArray(i.repeatWeekdays) && i.repeatWeekdays.length > 0
          ? ", repeating weekly"
          : "";
      return `Add "${String(i.name)}" on ${String(i.day)}, ${start}–${end}${
        i.categoryName ? ` (${String(i.categoryName)})` : ""
      }${repeat}`;
    }
    case "update_activity": {
      const changes = ["name", "start", "durationMinutes", "categoryName"]
        .filter((k) => i[k] !== undefined)
        .map((k) => `${k} → ${i[k] === null ? "none" : String(i[k])}`)
        .join(", ");
      return `Update activity on ${String(i.day)}: ${changes || "no changes"}`;
    }
    case "delete_activity":
      return `Delete an activity from ${String(i.day)}`;
    case "add_todo":
      return `Add todo "${String(i.text)}"`;
    case "complete_todo":
      return "Mark a todo as done";
    case "delete_todo":
      return "Delete a todo";
    case "start_pomodoro":
      return "Start the pomodoro timer";
    case "stop_pomodoro":
      return "Pause the pomodoro timer";
    default:
      return toolName;
  }
}
