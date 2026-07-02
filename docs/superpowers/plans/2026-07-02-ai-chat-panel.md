# AI Chat Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agentic AI chat panel (slide-in drawer) that reads/writes tooday's plan, todos, and pomodoro via tool calling through OpenRouter, with user confirmation before every write.

**Architecture:** A single `/api/chat` route streams from OpenRouter (server key) with tools declared schema-only (no `execute`), so every tool call is forwarded to the client where the data lives (zustand + localStorage). A pure client-side `executeTool` bridge maps tool calls to store actions. Write tools render a confirmation card; nothing mutates until the user clicks Apply.

**Tech Stack:** Next.js 16 App Router, `ai@6.0.219`, `@ai-sdk/react@3.0.221`, `@openrouter/ai-sdk-provider@2.10.0`, `zod@4`, zustand 5, Radix, framer-motion, Tailwind 4, vitest.

## Global Constraints

- Already done (do NOT redo): deps installed in package.json; `OPENROUTER_API_KEY` lives in `.env.local` (gitignored via `.env*`). Never commit `.env.local` or print the key.
- Model allowlist, exactly: `google/gemini-3.5-flash` (default), `openai/gpt-5.5`, `anthropic/claude-opus-4.8`. Route rejects anything else.
- AI SDK v6 API (verified against installed `node_modules/ai/dist/index.d.ts`): `tool({description, inputSchema})`, `streamText`, `stepCountIs`, `convertToModelMessages`, `result.toUIMessageStreamResponse()`, `DefaultChatTransport` + `prepareSendMessagesRequest`, `useChat` from `@ai-sdk/react` returning `{ messages, sendMessage, status, error, clearError, stop, addToolOutput, setMessages }`, options `onToolCall`, `sendAutomaticallyWhen`, helper `lastAssistantMessageIsCompleteWithToolCalls` from `ai`.
- UI copy is English (matches existing app copy: "Undo", CommandPalette etc.). The model replies in the user's language by itself.
- Write tools NEVER execute in `onToolCall`; they wait for the user's Apply click. Read tools auto-execute in `onToolCall`.
- Tool outputs sent via `addToolOutput` must be JSON-serializable: always `{ ok, data?, summary?, error? }` — never include functions (strip `undo`).
- Visual language: dark glass (`glass`, `elev-2`/`elev-3`), `rounded-2xl` panels, `rounded-lg` inputs/buttons, accent via `var(--accent)` / `var(--accent-strong)`, `bg-surface`/`bg-surface-2`, `text-muted`, lucide icons, framer-motion `AnimatePresence`.
- Z-index ladder: Sidebar z-40, Modal z-50, Toaster z-[70], CommandPalette z-[80]. Chat panel uses **z-[60]** (under toasts), floating button z-[45].
- Store facts (verified): activities live in `usePlanStore` as `plans: Record<"YYYY-MM-DD", Activity[]>`; `Activity = {id, name, category: string|null (category id), start: minutes-since-midnight, duration: minutes, repeat: number[]}`; todos also in `usePlanStore`. `getState()` outside React is the established pattern. Pomodoro tick only runs while `PomodoroBar` is visible → `start_pomodoro` must also enable `showPomodoro`.
- Run commands from repo root `/Users/demir/Projects/tooday`. Tests: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`.

---

### Task 1: Tool schemas and model allowlist

**Files:**
- Create: `src/lib/ai/tools.ts`
- Modify: (none — package.json/package-lock.json already changed by install; commit them here)

**Interfaces:**
- Consumes: `tool` from `ai`, `z` from `zod`.
- Produces (used by Tasks 2-5):
  - `AI_MODELS: readonly {id, label}[]`, `type AiModelId`, `DEFAULT_MODEL_ID`
  - `toolSchemas: Record<ChatToolName, z.ZodType>` (raw zod schemas)
  - `chatTools` (ToolSet for `streamText`), `type ChatToolName`
  - `WRITE_TOOL_NAMES`, `isWriteTool(name: string): boolean`

- [ ] **Step 1: Write `src/lib/ai/tools.ts`**

```ts
import { tool } from "ai";
import { z } from "zod";

export const AI_MODELS = [
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "openai/gpt-5.5", label: "GPT-5.5" },
  { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8" },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];
export const DEFAULT_MODEL_ID: AiModelId = "google/gemini-3.5-flash";

const hhmm = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "time must be HH:mm");
const dayKeyString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "day must be YYYY-MM-DD");

export const toolSchemas = {
  get_plan: z.object({
    day: dayKeyString
      .optional()
      .describe("Day to read, YYYY-MM-DD. Omit for today."),
  }),
  get_todos: z.object({}),
  get_categories: z.object({}),
  get_pomodoro_status: z.object({}),
  add_activity: z.object({
    day: dayKeyString,
    name: z.string().min(1).describe("Activity title"),
    start: hhmm.describe("Start time HH:mm"),
    durationMinutes: z.number().int().min(5).max(1439),
    categoryName: z
      .string()
      .optional()
      .describe("Existing category name; check get_categories first"),
    repeatWeekdays: z
      .array(z.number().int().min(0).max(6))
      .optional()
      .describe("Weekday indexes to repeat on (0=Sunday..6=Saturday)"),
  }),
  update_activity: z.object({
    day: dayKeyString,
    activityId: z.string(),
    name: z.string().min(1).optional(),
    start: hhmm.optional(),
    durationMinutes: z.number().int().min(5).max(1439).optional(),
    categoryName: z
      .string()
      .nullable()
      .optional()
      .describe("New category name, or null to clear"),
  }),
  delete_activity: z.object({
    day: dayKeyString,
    activityId: z.string(),
  }),
  add_todo: z.object({ text: z.string().min(1) }),
  complete_todo: z.object({ todoId: z.string() }),
  delete_todo: z.object({ todoId: z.string() }),
  start_pomodoro: z.object({}),
  stop_pomodoro: z.object({}),
};

export type ChatToolName = keyof typeof toolSchemas;

export const WRITE_TOOL_NAMES = [
  "add_activity",
  "update_activity",
  "delete_activity",
  "add_todo",
  "complete_todo",
  "delete_todo",
  "start_pomodoro",
  "stop_pomodoro",
] as const satisfies readonly ChatToolName[];

export function isWriteTool(name: string): boolean {
  return (WRITE_TOOL_NAMES as readonly string[]).includes(name);
}

const descriptions: Record<ChatToolName, string> = {
  get_plan:
    "Read the schedule for one day: activities with id, name, start/end times, duration, and category name.",
  get_todos: "Read the todo list (id, text, done, optional activity tag).",
  get_categories: "Read available activity categories (id, name, type).",
  get_pomodoro_status:
    "Read pomodoro state: phase (focus/break), running or paused, remaining seconds, focus rounds completed today.",
  add_activity:
    "Add an activity to a day's plan. Fails if it overlaps an existing activity (a free-slot suggestion is returned). Requires user approval.",
  update_activity:
    "Change an existing activity's name, time, duration, or category. Requires user approval.",
  delete_activity: "Delete an activity from a day. Requires user approval.",
  add_todo: "Add a todo item. Requires user approval.",
  complete_todo: "Mark a todo as done. Requires user approval.",
  delete_todo: "Delete a todo item. Requires user approval.",
  start_pomodoro:
    "Start the pomodoro timer (25min focus / 5min break rounds). Requires user approval.",
  stop_pomodoro: "Pause the pomodoro timer. Requires user approval.",
};

// Schema-only tools (no execute): every call is forwarded to the client,
// where the data lives.
export const chatTools = Object.fromEntries(
  (Object.keys(toolSchemas) as ChatToolName[]).map((name) => [
    name,
    tool({ description: descriptions[name], inputSchema: toolSchemas[name] }),
  ]),
);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/ai/tools.ts
git commit -m "feat(ai): add AI SDK deps, tool schemas, and model allowlist"
```

---

### Task 2: Client-side tool executor (TDD)

**Files:**
- Create: `src/lib/ai/executeTool.ts`
- Test: `src/lib/ai/__tests__/executeTool.test.ts`

**Interfaces:**
- Consumes: `toolSchemas`, `ChatToolName` from `./tools`; `usePlanStore`, `categoryOf`, `hasOverlap`, `Activity` from `@/stores/usePlanStore`; `usePomodoroStore` (`FOCUS_SECONDS`); `useSettingsStore`; `dayKey`, `hhmmToMinutes`, `minutesToHHmm` from `@/lib/time`; `findFreeSlot` from `@/lib/schedule`.
- Produces (used by Task 4-5):
  - `type ToolExecutionResult = { ok: true; data: unknown; summary: string; undo?: () => void } | { ok: false; error: string }`
  - `executeTool(toolName: string, rawInput: unknown): ToolExecutionResult`
  - `describeToolCall(toolName: string, input: unknown): string` — one-line human preview for confirmation cards.
  - `serializeResult(r: ToolExecutionResult): { ok: boolean; data?: unknown; summary?: string; error?: string }` — strips `undo` for `addToolOutput`.

- [ ] **Step 1: Write the failing tests**

`src/lib/ai/__tests__/executeTool.test.ts`:

```ts
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
    expect(a).toMatchObject({ id: "act-1", name: "Gym 2", start: 600, duration: 60 });
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
    const res = executeTool("delete_activity", { day: DAY, activityId: "act-1" });
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
    const res = executeTool("delete_activity", { day: DAY, activityId: "act-1" });
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/ai/__tests__/executeTool.test.ts`
Expected: FAIL — cannot resolve `../executeTool`. (A zustand persist warning about missing localStorage in node is expected and harmless.)

- [ ] **Step 3: Write `src/lib/ai/executeTool.ts`**

```ts
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

const handlers: { [N in ChatToolName]: (input: Input<N>) => ToolExecutionResult } = {
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
    if (start === null) return { ok: false, error: `Invalid start time "${input.start}"` };
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
      if (parsed === null) return { ok: false, error: `Invalid start time "${input.start}"` };
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
    return { ok: true, data: { id: todoId }, summary: `Completed "${todo.text}"` };
  },

  delete_todo: ({ todoId }) => {
    const todo = usePlanStore.getState().todos.find((t) => t.id === todoId);
    if (!todo) return { ok: false, error: `No todo with id "${todoId}"` };
    usePlanStore.getState().removeTodo(todoId);
    return { ok: true, data: { id: todoId }, summary: `Deleted todo "${todo.text}"` };
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
      const mins = typeof i.durationMinutes === "number" ? i.durationMinutes : 0;
      const parsed = typeof i.start === "string" ? hhmmToMinutes(i.start) : null;
      const end = parsed !== null ? endOf(parsed, mins) : "?";
      const repeat = Array.isArray(i.repeatWeekdays) && i.repeatWeekdays.length > 0
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/ai/__tests__/executeTool.test.ts`
Expected: PASS (all tests). Also run the full suite: `npx vitest run` — the two existing lib test files must still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/executeTool.ts src/lib/ai/__tests__/executeTool.test.ts
git commit -m "feat(ai): client-side tool executor with store bridge and undo"
```

---

### Task 3: Chat API route

**Files:**
- Create: `src/app/api/chat/route.ts`

**Interfaces:**
- Consumes: `chatTools`, `AI_MODELS` from `@/lib/ai/tools`; `createOpenRouter` from `@openrouter/ai-sdk-provider`; `convertToModelMessages`, `stepCountIs`, `streamText`, `UIMessage` from `ai`.
- Produces: `POST /api/chat` accepting `{ messages: UIMessage[], modelId: string, context?: { now?: string; today?: string; clockFormat?: string } }`, returning a UI message stream (or JSON error with status 400/503).

- [ ] **Step 1: Write `src/app/api/chat/route.ts`**

```ts
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { AI_MODELS, chatTools } from "@/lib/ai/tools";

export const maxDuration = 60;

type ChatContext = { now?: string; today?: string; clockFormat?: string };

type ChatRequestBody = {
  messages: UIMessage[];
  modelId: string;
  context?: ChatContext;
};

function systemPrompt(context: ChatContext | undefined): string {
  return [
    "You are the assistant inside tooday, a clock-first daily planner app.",
    "The user's data: a per-day schedule of activities (title, start time, duration, category), a todo list, and a pomodoro timer (25min focus / 5min break).",
    context?.now ? `Current local time: ${context.now}.` : "",
    context?.today ? `Today's date key: ${context.today}.` : "",
    context?.clockFormat ? `The user displays times in ${context.clockFormat} format.` : "",
    "Rules:",
    "- Always read current data with tools (get_plan, get_todos, get_categories) before answering questions about it or modifying it. Never guess ids.",
    "- Modifying tools require the user to approve each call in the UI; if a tool result says the user rejected it, do not retry — ask what they want instead.",
    "- If add_activity fails due to overlap, offer the suggested free slot.",
    "- Times in tool inputs are 24h HH:mm. Day keys are YYYY-MM-DD.",
    "- Be concise. Reply in the language the user writes in.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI is not configured (missing OPENROUTER_API_KEY)." },
      { status: 503 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, modelId, context } = body;
  if (!AI_MODELS.some((m) => m.id === modelId)) {
    return Response.json({ error: `Unknown model "${modelId}".` }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages must be a non-empty array." }, { status: 400 });
  }

  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter.chat(modelId),
    system: systemPrompt(context),
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : "The model request failed.",
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test the route with curl**

Start dev server in background: `npm run dev` (leave running for Tasks 4-6).
Then:

```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"modelId":"google/gemini-3.5-flash","messages":[{"id":"m1","role":"user","parts":[{"type":"text","text":"Say only the word ping."}]}]}' | head -20
```

Expected: SSE stream containing `text-delta` chunks with "ping" (NOT a JSON error).
Also verify rejection: same curl with `"modelId":"evil/model"` → `{"error":"Unknown model \"evil/model\"."}` with status 400.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(ai): streaming chat route with OpenRouter and model allowlist"
```

---

### Task 4: ToolCard component

**Files:**
- Create: `src/components/ai/ToolCard.tsx`

**Interfaces:**
- Consumes: `describeToolCall` from `@/lib/ai/executeTool`; `isWriteTool` from `@/lib/ai/tools`.
- Produces: `<ToolCard part={...} onApply={(toolCallId, toolName, input) => void} onReject={(toolCallId, toolName) => void} />` where `part` is:

```ts
export type ToolPartLike = {
  type: string; // "tool-<name>"
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
};
```

- [ ] **Step 1: Write `src/components/ai/ToolCard.tsx`**

```tsx
"use client";

import { Check, Eye, Loader2, TriangleAlert, Wrench, X } from "lucide-react";
import { describeToolCall } from "@/lib/ai/executeTool";
import { isWriteTool } from "@/lib/ai/tools";

export type ToolPartLike = {
  type: string;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

type WireResult = {
  ok?: boolean;
  summary?: string;
  error?: string;
};

const READ_LABELS: Record<string, string> = {
  get_plan: "Reading the plan",
  get_todos: "Reading todos",
  get_categories: "Reading categories",
  get_pomodoro_status: "Reading pomodoro status",
};

export default function ToolCard({
  part,
  onApply,
  onReject,
}: {
  part: ToolPartLike;
  onApply: (toolCallId: string, toolName: string, input: unknown) => void;
  onReject: (toolCallId: string, toolName: string) => void;
}) {
  const toolName = part.type.slice("tool-".length);
  const write = isWriteTool(toolName);
  const output = (part.output ?? undefined) as WireResult | undefined;

  // Read tools: a subtle status chip.
  if (!write) {
    const label = READ_LABELS[toolName] ?? toolName;
    return (
      <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
        {part.state === "output-available" ? (
          <Eye size={12} />
        ) : (
          <Loader2 size={12} className="animate-spin" />
        )}
        {label}
      </div>
    );
  }

  // Write tools: confirmation card lifecycle.
  const description = describeToolCall(toolName, part.input);

  if (part.state === "input-streaming") {
    return (
      <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
        <Loader2 size={12} className="animate-spin" /> Preparing action…
      </div>
    );
  }

  if (part.state === "input-available") {
    return (
      <div className="glass elev-1 self-stretch rounded-xl border-t border-white/[0.07] p-3">
        <div className="flex items-start gap-2 text-sm">
          <Wrench size={14} className="mt-0.5 shrink-0 text-accent" />
          <span>{description}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onApply(part.toolCallId, toolName, part.input)}
            className="rounded-lg bg-[var(--accent-strong)] px-4 py-1.5 text-sm font-medium text-white hover:brightness-110"
          >
            Apply
          </button>
          <button
            onClick={() => onReject(part.toolCallId, toolName)}
            className="rounded-lg border border-white/10 px-4 py-1.5 text-sm text-neutral-300 hover:border-red-400/40 hover:text-red-400"
          >
            Reject
          </button>
        </div>
      </div>
    );
  }

  if (part.state === "output-available") {
    if (output?.ok) {
      return (
        <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs text-emerald-400/90">
          <Check size={12} /> {output.summary ?? description}
        </div>
      );
    }
    const rejected = output?.error === "User rejected this action.";
    return (
      <div
        className={`flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs ${
          rejected ? "text-muted" : "text-red-400/90"
        }`}
      >
        {rejected ? <X size={12} /> : <TriangleAlert size={12} />}
        {rejected ? "Rejected" : output?.error ?? "Failed"}
      </div>
    );
  }

  // output-error (transport-level failure)
  return (
    <div className="flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs text-red-400/90">
      <TriangleAlert size={12} /> {part.errorText ?? "Tool failed"}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ai/ToolCard.tsx
git commit -m "feat(ai): tool call rendering with apply/reject confirmation cards"
```

---

### Task 5: ChatPanel and layout mount

**Files:**
- Create: `src/components/ai/ChatPanel.tsx`
- Modify: `src/app/layout.tsx` (mount `<ChatPanel />` right after `<CommandPalette />` inside `<MotionProvider>`)

**Interfaces:**
- Consumes: `useChat` from `@ai-sdk/react`; `DefaultChatTransport`, `lastAssistantMessageIsCompleteWithToolCalls` from `ai`; `executeTool`, `serializeResult` from `@/lib/ai/executeTool`; `AI_MODELS`, `DEFAULT_MODEL_ID`, `isWriteTool`, type `AiModelId` from `@/lib/ai/tools`; `ToolCard`, type `ToolPartLike` from `./ToolCard`; `dayKey` from `@/lib/time`; `useSettingsStore`, `useToastStore`.
- Produces: `<ChatPanel />` — self-contained floating button + drawer; no props.

- [ ] **Step 1: Write `src/components/ai/ChatPanel.tsx`**

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, SendHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  executeTool,
  serializeResult,
} from "@/lib/ai/executeTool";
import {
  AI_MODELS,
  DEFAULT_MODEL_ID,
  isWriteTool,
  type AiModelId,
} from "@/lib/ai/tools";
import { dayKey } from "@/lib/time";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useToastStore } from "@/stores/useToastStore";
import ToolCard, { type ToolPartLike } from "./ToolCard";

const SUGGESTIONS = [
  "What's on my plan today?",
  "Add a 1 hour workout tomorrow morning",
  "Start a focus session",
];

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState<AiModelId>(DEFAULT_MODEL_ID);
  const modelIdRef = useRef<AiModelId>(modelId);
  modelIdRef.current = modelId;
  const scrollRef = useRef<HTMLDivElement>(null);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            modelId: modelIdRef.current,
            context: {
              now: new Date().toString(),
              today: dayKey(),
              clockFormat: useSettingsStore.getState().clockFormat,
            },
          },
        }),
      }),
  );

  const { messages, sendMessage, status, error, clearError, addToolOutput } =
    useChat({
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall: ({ toolCall }) => {
        // Read tools run immediately; write tools wait for Apply/Reject.
        if (isWriteTool(toolCall.toolName)) return;
        const result = executeTool(toolCall.toolName, toolCall.input);
        addToolOutput({
          tool: toolCall.toolName as never,
          toolCallId: toolCall.toolCallId,
          output: serializeResult(result) as never,
        });
      },
    });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const applyTool = (toolCallId: string, toolName: string, input: unknown) => {
    const result = executeTool(toolName, input);
    if (result.ok) {
      useToastStore.getState().show(
        result.summary,
        result.undo
          ? { actionLabel: "Undo", onAction: result.undo }
          : undefined,
      );
    }
    addToolOutput({
      tool: toolName as never,
      toolCallId,
      output: serializeResult(result) as never,
    });
  };

  const rejectTool = (toolCallId: string, toolName: string) => {
    addToolOutput({
      tool: toolName as never,
      toolCallId,
      output: { ok: false, error: "User rejected this action." } as never,
    });
  };

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    clearError();
    void sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="ai-fab"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setOpen(true)}
            aria-label="Open AI assistant"
            className="glass elev-2 fixed bottom-6 right-6 z-[45] flex h-11 w-11 items-center justify-center rounded-full text-accent hover:bg-white/10"
          >
            <Sparkles size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            key="ai-panel"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="elev-3 fixed inset-y-0 right-0 z-[60] flex w-full flex-col border-l border-white/[0.07] bg-surface/90 backdrop-blur-2xl sm:w-[400px]"
          >
            <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Sparkles size={16} className="text-accent" />
              <span className="font-display text-sm font-semibold">
                Assistant
              </span>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value as AiModelId)}
                className="ml-auto rounded-lg bg-surface-2 px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-accent/60"
                aria-label="Model"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-muted hover:bg-white/5 hover:text-foreground"
              >
                <X size={16} />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="mt-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-sm text-muted">
                    Ask about your day, or tell me what to plan.
                  </p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col gap-2 ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                            message.role === "user"
                              ? "bg-[var(--accent-strong)]/80 text-white"
                              : "bg-surface-2 text-foreground"
                          }`}
                        >
                          {part.text}
                        </div>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      return (
                        <ToolCard
                          key={`${message.id}-${i}`}
                          part={part as unknown as ToolPartLike}
                          onApply={applyTool}
                          onReject={rejectTool}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Loader2 size={12} className="animate-spin" /> Thinking…
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-400">
                  {error.message || "Something went wrong."}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
              className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message…"
                className="h-10 w-full rounded-lg border border-transparent bg-surface-2 px-3 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-strong)] text-white hover:brightness-110 disabled:opacity-40"
              >
                <SendHorizontal size={16} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Mount in `src/app/layout.tsx`**

Add the import and render `<ChatPanel />` immediately after `<CommandPalette />` (inside `<MotionProvider>`):

```tsx
import ChatPanel from "@/components/ai/ChatPanel";
// ... inside MotionProvider, after <CommandPalette />:
<ChatPanel />
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. If `addToolOutput`'s generic typing fights the `as never` casts, prefer widening the useChat generic over suppressing with eslint-disable.

- [ ] **Step 4: Commit**

```bash
git add src/components/ai/ChatPanel.tsx src/app/layout.tsx
git commit -m "feat(ai): chat panel drawer with model picker and confirm flow"
```

---

### Task 6: End-to-end verification and wiki log

**Files:**
- Modify: `wiki/log.md` (append entry)

- [ ] **Step 1: Manual E2E against the dev server** (dev server from Task 3 still running; key comes from `.env.local`)

In the browser at `http://localhost:3000`:
1. Sparkles button appears bottom-right; opens the drawer; Esc closes it.
2. Ask "What's on my plan today?" → read-tool chip appears, streamed answer matches the actual plan.
3. Ask "Add a 30 minute walk today at the first free slot after 18:00" → confirmation card appears with a human-readable description; click **Apply** → activity appears on the clock/plan, toast shows; assistant confirms.
4. Ask it to delete that activity → confirmation card → **Apply** → toast with **Undo**; click Undo → activity returns.
5. Trigger a **Reject** → assistant acknowledges without retrying the same call.
6. Switch model to GPT-5.5, send one message → still streams (check the network tab request body has the new modelId).
7. Add a todo via chat, verify it on /todos.

- [ ] **Step 2: Full test suite and build**

Run: `npx vitest run && npm run build`
Expected: all tests pass; production build succeeds.

- [ ] **Step 3: Append wiki log entry**

Append to `wiki/log.md`:

```markdown
## [2026-07-02] feature | AI chat panel shipped

Agentic chat drawer on all pages: OpenRouter server key, 3-model picker
(Gemini 3.5 Flash default, GPT-5.5, Opus 4.8), schema-only tools executed
client-side against zustand stores, approval cards before every write.
```

- [ ] **Step 4: Final commit**

```bash
git add wiki/log.md docs/superpowers/plans/2026-07-02-ai-chat-panel.md
git commit -m "docs: record AI chat panel completion in wiki log"
```
