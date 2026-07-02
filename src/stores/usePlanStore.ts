"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import { hasOverlap } from "@/lib/schedule";

export interface Category {
  id: string;
  name: string;
  color: string; // tailwind color name, e.g. "emerald"
  type: "offline" | "online";
}

export interface Activity {
  id: string;
  name: string;
  category: string | null; // category id
  start: number; // minutes since midnight
  duration: number; // minutes
  repeat: number[]; // weekday indexes (0-6) for repeating activities
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: string; // ISO date
  /** optional activity name this todo belongs to */
  activity?: string | null;
}

export interface DayTemplate {
  id: string;
  name: string;
  activities: Omit<Activity, "id">[];
}

interface PlanState {
  plans: Record<string, Activity[]>; // keyed by "YYYY-MM-DD"
  categories: Category[];
  todos: Todo[];
  templates: DayTemplate[];
  addActivity: (day: string, a: Omit<Activity, "id">) => void;
  /** adds to the given day and, when repeat weekdays are set, copies the
   *  activity onto matching days for the next 4 weeks */
  addActivityWithRepeat: (day: string, a: Omit<Activity, "id">) => void;
  updateActivity: (day: string, a: Activity) => void;
  removeActivity: (day: string, id: string) => void;
  /** puts a deleted activity back with its original id (undo) */
  restoreActivity: (day: string, a: Activity) => void;
  /** copies a day's activities onto another day, skipping conflicts */
  copyDay: (fromDay: string, toDay: string) => number;
  saveTemplate: (name: string, day: string) => void;
  applyTemplate: (id: string, day: string) => number;
  deleteTemplate: (id: string) => void;
  setCategories: (categories: Category[]) => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  clearCompletedTodos: () => void;
  setTodoActivity: (id: string, activity: string | null) => void;
}

function sortByStart(list: Activity[]): Activity[] {
  return [...list].sort((a, b) => a.start - b.start);
}

export { hasOverlap };

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plans: {},
      categories: [],
      todos: [],
      templates: [],
      addActivity: (day, a) =>
        set((s) => ({
          plans: {
            ...s.plans,
            [day]: sortByStart([...(s.plans[day] ?? []), { ...a, id: nanoid() }]),
          },
        })),
      addActivityWithRepeat: (day, a) =>
        set((s) => {
          const plans = { ...s.plans };
          // skip days where the copy would collide with an existing activity
          const put = (k: string) => {
            const existing = plans[k] ?? [];
            if (hasOverlap(existing, a.start, a.duration)) return;
            plans[k] = sortByStart([...existing, { ...a, id: nanoid() }]);
          };
          put(day);
          if (a.repeat.length > 0) {
            const base = dayjs(day);
            for (let i = 1; i <= 28; i++) {
              const d = base.add(i, "day");
              if (a.repeat.includes(d.day())) put(d.format("YYYY-MM-DD"));
            }
          }
          return { plans };
        }),
      updateActivity: (day, a) =>
        set((s) => ({
          plans: {
            ...s.plans,
            [day]: sortByStart(
              (s.plans[day] ?? []).map((x) => (x.id === a.id ? a : x))
            ),
          },
        })),
      removeActivity: (day, id) =>
        set((s) => ({
          plans: {
            ...s.plans,
            [day]: (s.plans[day] ?? []).filter((x) => x.id !== id),
          },
        })),
      restoreActivity: (day, a) =>
        set((s) => {
          if (hasOverlap(s.plans[day] ?? [], a.start, a.duration)) return s;
          return {
            plans: {
              ...s.plans,
              [day]: sortByStart([...(s.plans[day] ?? []), a]),
            },
          };
        }),
      copyDay: (fromDay, toDay) => {
        const source = get().plans[fromDay] ?? [];
        let copied = 0;
        set((s) => {
          let target = [...(s.plans[toDay] ?? [])];
          for (const a of source) {
            if (hasOverlap(target, a.start, a.duration)) continue;
            target = sortByStart([...target, { ...a, id: nanoid() }]);
            copied++;
          }
          return { plans: { ...s.plans, [toDay]: target } };
        });
        return copied;
      },
      saveTemplate: (name, day) =>
        set((s) => ({
          templates: [
            ...s.templates,
            {
              id: nanoid(),
              name,
              activities: (s.plans[day] ?? []).map((a) => ({
                name: a.name,
                category: a.category,
                start: a.start,
                duration: a.duration,
                repeat: a.repeat,
              })),
            },
          ],
        })),
      applyTemplate: (id, day) => {
        const tpl = get().templates.find((t) => t.id === id);
        if (!tpl) return 0;
        let applied = 0;
        set((s) => {
          let target = [...(s.plans[day] ?? [])];
          for (const a of tpl.activities) {
            if (hasOverlap(target, a.start, a.duration)) continue;
            target = sortByStart([...target, { ...a, id: nanoid() }]);
            applied++;
          }
          return { plans: { ...s.plans, [day]: target } };
        });
        return applied;
      },
      deleteTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      setCategories: (categories) => set({ categories }),
      addTodo: (text) =>
        set((s) => ({
          todos: [
            { id: nanoid(), text, done: false, createdAt: new Date().toISOString() },
            ...s.todos,
          ],
        })),
      toggleTodo: (id) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      removeTodo: (id) =>
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      clearCompletedTodos: () =>
        set((s) => ({ todos: s.todos.filter((t) => !t.done) })),
      setTodoActivity: (id, activity) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, activity } : t)),
        })),
    }),
    { name: "plan-storage" }
  )
);

export function categoryOf(
  a: Activity,
  categories: Category[]
): Category | null {
  return categories.find((c) => c.id === a.category) ?? null;
}
