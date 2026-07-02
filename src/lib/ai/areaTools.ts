import { tool } from "ai";
import { z } from "zod";

const blockId = z
  .string()
  .optional()
  .describe("Existing block id to replace; omit to create a new block");
const title = z.string().min(1).max(80);

export const areaToolSchemas = {
  area_get: z.object({}),
  area_set_note: z.object({
    blockId,
    title,
    markdown: z.string().max(8000).describe("Markdown body of the note"),
  }),
  area_set_table: z.object({
    blockId,
    title,
    columns: z.array(z.string()).min(1).max(8),
    rows: z.array(z.array(z.string())).max(100),
  }),
  area_set_metric: z.object({
    blockId,
    title,
    unit: z.string().max(20).describe('e.g. "kg", "$", "hrs"'),
    history: z
      .array(z.object({ date: z.string(), value: z.number() }))
      .max(200)
      .optional()
      .describe("Dated values, oldest first. Omit to start empty."),
  }),
  area_add_metric_point: z.object({
    blockId: z.string().describe("Metric block id"),
    value: z.number(),
    date: z
      .string()
      .optional()
      .describe("YYYY-MM-DD; omit for today"),
  }),
  area_set_routine: z.object({
    blockId,
    title,
    days: z
      .array(
        z.object({
          day: z.string().describe('e.g. "Monday" or "Mon/Wed/Fri"'),
          items: z.array(z.string()).max(20),
        }),
      )
      .min(1)
      .max(14),
  }),
  area_set_checklist: z.object({
    blockId,
    title,
    items: z
      .array(z.object({ text: z.string(), done: z.boolean().default(false) }))
      .max(50),
  }),
  area_set_links: z.object({
    blockId,
    title,
    items: z
      .array(
        z.object({
          label: z.string(),
          url: z.url(),
          note: z.string().optional(),
        }),
      )
      .max(30),
  }),
  area_delete_block: z.object({ blockId: z.string() }),
  area_update_memory: z.object({
    memory: z
      .string()
      .max(4000)
      .describe(
        "The full replacement memory note: durable facts, goals, preferences, decisions. Keep it a tight, current summary — not a chat log.",
      ),
  }),
};

export type AreaToolName = keyof typeof areaToolSchemas;

export function isAreaTool(name: string): name is AreaToolName {
  return name in areaToolSchemas;
}

const descriptions: Record<AreaToolName, string> = {
  area_get:
    "Read this area's current state: memory note and all content blocks with their ids.",
  area_set_note: "Create or replace a markdown note block in this area.",
  area_set_table:
    "Create or replace a table block (e.g. holdings, subscriptions).",
  area_set_metric:
    "Create or replace a tracked metric block (unit + dated history).",
  area_add_metric_point: "Append a dated value to an existing metric block.",
  area_set_routine:
    "Create or replace a weekly routine block (e.g. training split, study plan).",
  area_set_checklist: "Create or replace a checklist block.",
  area_set_links: "Create or replace a resource-links block.",
  area_delete_block: "Delete a block from this area.",
  area_update_memory:
    "Replace your durable memory note for this area. Do this whenever you learn lasting facts, goals, or decisions.",
};

export const areaTools = Object.fromEntries(
  (Object.keys(areaToolSchemas) as AreaToolName[]).map((name) => [
    name,
    tool({
      description: descriptions[name],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: areaToolSchemas[name] as any,
    }),
  ]),
);
