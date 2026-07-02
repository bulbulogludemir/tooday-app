import { tool } from "ai";
import { z } from "zod";
import { COLOR_NAMES } from "@/lib/colors";

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
  clear_completed_todos: z.object({}),
  start_pomodoro: z.object({}),
  stop_pomodoro: z.object({}),
  get_templates: z.object({}),
  get_settings: z.object({}),
  add_category: z.object({
    name: z.string().min(1),
    color: z.enum(COLOR_NAMES),
    type: z
      .enum(["offline", "online"])
      .optional()
      .describe("offline = real-world activity, online = screen activity. Default offline."),
  }),
  update_category: z.object({
    categoryName: z.string().describe("Current name of the category to change"),
    newName: z.string().min(1).optional(),
    color: z.enum(COLOR_NAMES).optional(),
    type: z.enum(["offline", "online"]).optional(),
  }),
  delete_category: z.object({ categoryName: z.string() }),
  copy_day: z.object({ fromDay: dayKeyString, toDay: dayKeyString }),
  save_template: z.object({
    name: z.string().min(1).describe("Template name"),
    day: dayKeyString.describe("Day whose plan becomes the template"),
  }),
  apply_template: z.object({ templateName: z.string(), day: dayKeyString }),
  delete_template: z.object({ templateName: z.string() }),
  update_settings: z.object({
    clockFormat: z.enum(["24h", "12h"]).optional(),
    startDay: z
      .number()
      .int()
      .min(0)
      .max(1)
      .optional()
      .describe("Week starts on 0=Sunday or 1=Monday"),
    accent: z.enum(["indigo", "mint", "rose", "amber"]).optional(),
    notificationsEnabled: z.boolean().optional(),
  }),
};

export type ChatToolName = keyof typeof toolSchemas;

export const WRITE_TOOL_NAMES = [
  "add_activity",
  "update_activity",
  "delete_activity",
  "add_todo",
  "complete_todo",
  "delete_todo",
  "clear_completed_todos",
  "start_pomodoro",
  "stop_pomodoro",
  "add_category",
  "update_category",
  "delete_category",
  "copy_day",
  "save_template",
  "apply_template",
  "delete_template",
  "update_settings",
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
  clear_completed_todos:
    "Remove all completed todos from the list. Requires user approval.",
  start_pomodoro:
    "Start the pomodoro timer (25min focus / 5min break rounds). Requires user approval.",
  stop_pomodoro: "Pause the pomodoro timer. Requires user approval.",
  get_templates:
    "Read saved day templates (name and the activities they contain).",
  get_settings:
    "Read app settings: clock format, week start day, accent color, notifications, pomodoro bar visibility.",
  add_category:
    "Create a new activity category with a name and color. Requires user approval.",
  update_category:
    "Rename a category or change its color/type. Requires user approval.",
  delete_category:
    "Delete a category; its activities become uncategorized. Requires user approval.",
  copy_day:
    "Copy all activities from one day to another, skipping conflicts. Requires user approval.",
  save_template:
    "Save a day's plan as a reusable template. Requires user approval.",
  apply_template:
    "Apply a saved template's activities to a day, skipping conflicts. Requires user approval.",
  delete_template: "Delete a saved template. Requires user approval.",
  update_settings:
    "Change app settings: clock format (24h/12h), week start day, accent color, notifications. Requires user approval.",
};

// Schema-only tools (no execute): every call is forwarded to the client,
// where the data lives.
export const chatTools = {
  get_plan: tool({ description: descriptions.get_plan, inputSchema: toolSchemas.get_plan }),
  get_todos: tool({ description: descriptions.get_todos, inputSchema: toolSchemas.get_todos }),
  get_categories: tool({ description: descriptions.get_categories, inputSchema: toolSchemas.get_categories }),
  get_pomodoro_status: tool({ description: descriptions.get_pomodoro_status, inputSchema: toolSchemas.get_pomodoro_status }),
  add_activity: tool({ description: descriptions.add_activity, inputSchema: toolSchemas.add_activity }),
  update_activity: tool({ description: descriptions.update_activity, inputSchema: toolSchemas.update_activity }),
  delete_activity: tool({ description: descriptions.delete_activity, inputSchema: toolSchemas.delete_activity }),
  add_todo: tool({ description: descriptions.add_todo, inputSchema: toolSchemas.add_todo }),
  complete_todo: tool({ description: descriptions.complete_todo, inputSchema: toolSchemas.complete_todo }),
  delete_todo: tool({ description: descriptions.delete_todo, inputSchema: toolSchemas.delete_todo }),
  start_pomodoro: tool({ description: descriptions.start_pomodoro, inputSchema: toolSchemas.start_pomodoro }),
  stop_pomodoro: tool({ description: descriptions.stop_pomodoro, inputSchema: toolSchemas.stop_pomodoro }),
  clear_completed_todos: tool({ description: descriptions.clear_completed_todos, inputSchema: toolSchemas.clear_completed_todos }),
  get_templates: tool({ description: descriptions.get_templates, inputSchema: toolSchemas.get_templates }),
  get_settings: tool({ description: descriptions.get_settings, inputSchema: toolSchemas.get_settings }),
  add_category: tool({ description: descriptions.add_category, inputSchema: toolSchemas.add_category }),
  update_category: tool({ description: descriptions.update_category, inputSchema: toolSchemas.update_category }),
  delete_category: tool({ description: descriptions.delete_category, inputSchema: toolSchemas.delete_category }),
  copy_day: tool({ description: descriptions.copy_day, inputSchema: toolSchemas.copy_day }),
  save_template: tool({ description: descriptions.save_template, inputSchema: toolSchemas.save_template }),
  apply_template: tool({ description: descriptions.apply_template, inputSchema: toolSchemas.apply_template }),
  delete_template: tool({ description: descriptions.delete_template, inputSchema: toolSchemas.delete_template }),
  update_settings: tool({ description: descriptions.update_settings, inputSchema: toolSchemas.update_settings }),
};
