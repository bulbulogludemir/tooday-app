import { nanoid } from "nanoid";
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

  clear_completed_todos: () => {
    const done = usePlanStore.getState().todos.filter((t) => t.done).length;
    usePlanStore.getState().clearCompletedTodos();
    return {
      ok: true,
      data: { removed: done },
      summary: `Cleared ${done} completed todos`,
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

  get_templates: () => {
    const templates = usePlanStore.getState().templates.map((t) => ({
      name: t.name,
      activities: t.activities.map((a) => ({
        name: a.name,
        start: minutesToHHmm(a.start),
        durationMinutes: a.duration,
      })),
    }));
    return {
      ok: true,
      data: { templates },
      summary: `Read ${templates.length} templates`,
    };
  },

  get_settings: () => {
    const s = useSettingsStore.getState();
    return {
      ok: true,
      data: {
        clockFormat: s.clockFormat,
        startDay: s.startDay === 1 ? "Monday" : "Sunday",
        accent: s.accent,
        notificationsEnabled: s.notificationsEnabled,
        pomodoroBarVisible: s.showPomodoro,
      },
      summary: "Read settings",
    };
  },

  add_category: (input) => {
    const { categories, setCategories } = usePlanStore.getState();
    if (categories.some((c) => c.name.toLowerCase() === input.name.toLowerCase())) {
      return { ok: false, error: `Category "${input.name}" already exists.` };
    }
    const created = {
      id: nanoid(6),
      name: input.name,
      color: input.color,
      type: input.type ?? ("offline" as const),
    };
    setCategories([...categories, created]);
    return {
      ok: true,
      data: { id: created.id },
      summary: `Added category "${input.name}" (${input.color})`,
    };
  },

  update_category: (input) => {
    const { categories, setCategories } = usePlanStore.getState();
    const target = categories.find(
      (c) => c.name.toLowerCase() === input.categoryName.toLowerCase(),
    );
    if (!target) {
      const resolved = resolveCategoryId(input.categoryName);
      return { ok: false, error: "error" in resolved ? resolved.error : "Category not found." };
    }
    if (
      input.newName &&
      categories.some(
        (c) =>
          c.id !== target.id &&
          c.name.toLowerCase() === input.newName!.toLowerCase(),
      )
    ) {
      return { ok: false, error: `Category "${input.newName}" already exists.` };
    }
    const next = {
      ...target,
      name: input.newName ?? target.name,
      color: input.color ?? target.color,
      type: input.type ?? target.type,
    };
    setCategories(categories.map((c) => (c.id === target.id ? next : c)));
    return {
      ok: true,
      data: { id: target.id },
      summary: `Updated category "${target.name}"${input.newName ? ` → "${input.newName}"` : ""}`,
      undo: () => {
        const now = usePlanStore.getState().categories;
        usePlanStore
          .getState()
          .setCategories(now.map((c) => (c.id === target.id ? target : c)));
      },
    };
  },

  delete_category: (input) => {
    const { categories, setCategories } = usePlanStore.getState();
    const target = categories.find(
      (c) => c.name.toLowerCase() === input.categoryName.toLowerCase(),
    );
    if (!target) {
      const resolved = resolveCategoryId(input.categoryName);
      return { ok: false, error: "error" in resolved ? resolved.error : "Category not found." };
    }
    setCategories(categories.filter((c) => c.id !== target.id));
    return {
      ok: true,
      data: { id: target.id },
      summary: `Deleted category "${target.name}"`,
      undo: () =>
        usePlanStore
          .getState()
          .setCategories([...usePlanStore.getState().categories, target]),
    };
  },

  copy_day: (input) => {
    const copied = usePlanStore.getState().copyDay(input.fromDay, input.toDay);
    return {
      ok: true,
      data: { copied },
      summary: `Copied ${copied} activities from ${input.fromDay} to ${input.toDay}`,
    };
  },

  save_template: (input) => {
    const dayActivities = usePlanStore.getState().plans[input.day] ?? [];
    if (dayActivities.length === 0) {
      return { ok: false, error: `${input.day} has no activities to save.` };
    }
    usePlanStore.getState().saveTemplate(input.name, input.day);
    return {
      ok: true,
      data: { activities: dayActivities.length },
      summary: `Saved "${input.name}" template (${dayActivities.length} activities)`,
    };
  },

  apply_template: (input) => {
    const template = usePlanStore
      .getState()
      .templates.find(
        (t) => t.name.toLowerCase() === input.templateName.toLowerCase(),
      );
    if (!template) {
      const names =
        usePlanStore.getState().templates.map((t) => t.name).join(", ") ||
        "(none)";
      return {
        ok: false,
        error: `Unknown template "${input.templateName}". Saved templates: ${names}`,
      };
    }
    const applied = usePlanStore.getState().applyTemplate(template.id, input.day);
    return {
      ok: true,
      data: { applied },
      summary: `Applied "${template.name}" to ${input.day} (${applied} activities)`,
    };
  },

  delete_template: (input) => {
    const template = usePlanStore
      .getState()
      .templates.find(
        (t) => t.name.toLowerCase() === input.templateName.toLowerCase(),
      );
    if (!template) {
      return { ok: false, error: `Unknown template "${input.templateName}"` };
    }
    usePlanStore.getState().deleteTemplate(template.id);
    return {
      ok: true,
      data: { id: template.id },
      summary: `Deleted template "${template.name}"`,
    };
  },

  update_settings: (input) => {
    const s = useSettingsStore.getState();
    const changes: string[] = [];
    if (input.clockFormat !== undefined) {
      s.setClockFormat(input.clockFormat);
      changes.push(`clock ${input.clockFormat}`);
    }
    if (input.startDay !== undefined) {
      s.setStartDay(input.startDay);
      changes.push(`week starts ${input.startDay === 1 ? "Monday" : "Sunday"}`);
    }
    if (input.accent !== undefined) {
      s.setAccent(input.accent);
      changes.push(`accent ${input.accent}`);
    }
    if (input.notificationsEnabled !== undefined) {
      s.setNotificationsEnabled(input.notificationsEnabled);
      changes.push(
        `notifications ${input.notificationsEnabled ? "on" : "off"}`,
      );
    }
    if (changes.length === 0) {
      return { ok: false, error: "No settings provided to change." };
    }
    return {
      ok: true,
      data: {},
      summary: `Settings updated: ${changes.join(", ")}`,
    };
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
    case "clear_completed_todos":
      return "Clear all completed todos";
    case "start_pomodoro":
      return "Start the pomodoro timer";
    case "stop_pomodoro":
      return "Pause the pomodoro timer";
    case "add_category":
      return `Create category "${String(i.name)}" (${String(i.color)}${
        i.type ? `, ${String(i.type)}` : ""
      })`;
    case "update_category": {
      const changes = ["newName", "color", "type"]
        .filter((k) => i[k] !== undefined)
        .map((k) => `${k === "newName" ? "name" : k} → ${String(i[k])}`)
        .join(", ");
      return `Update category "${String(i.categoryName)}": ${changes || "no changes"}`;
    }
    case "delete_category":
      return `Delete category "${String(i.categoryName)}" (its activities become uncategorized)`;
    case "copy_day":
      return `Copy all activities from ${String(i.fromDay)} to ${String(i.toDay)}`;
    case "save_template":
      return `Save ${String(i.day)} as template "${String(i.name)}"`;
    case "apply_template":
      return `Apply template "${String(i.templateName)}" to ${String(i.day)}`;
    case "delete_template":
      return `Delete template "${String(i.templateName)}"`;
    case "update_settings": {
      const changes = ["clockFormat", "startDay", "accent", "notificationsEnabled"]
        .filter((k) => i[k] !== undefined)
        .map((k) => `${k} → ${String(i[k])}`)
        .join(", ");
      return `Change settings: ${changes || "nothing"}`;
    }
    default:
      return toolName;
  }
}
