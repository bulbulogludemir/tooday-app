import { nanoid } from "nanoid";
import { z } from "zod";
import { dayKey } from "@/lib/time";
import { useAreasStore, type AreaBlock } from "@/stores/useAreasStore";
import { areaToolSchemas, type AreaToolName } from "./areaTools";
import type { ToolExecutionResult } from "./executeTool";

type Input<N extends AreaToolName> = z.infer<(typeof areaToolSchemas)[N]>;

function requireArea(areaId: string): string | null {
  return useAreasStore.getState().areas.some((a) => a.id === areaId)
    ? null
    : `Unknown area "${areaId}".`;
}

/**
 * Upsert helper: with blockId, the block must exist and keeps its id;
 * without, a new block is appended.
 */
function upsert(
  areaId: string,
  blockId: string | undefined,
  build: (id: string) => AreaBlock,
): ToolExecutionResult {
  const store = useAreasStore.getState();
  if (blockId) {
    const existing = (store.blocks[areaId] ?? []).find((b) => b.id === blockId);
    if (!existing) {
      return {
        ok: false,
        error: `No block with id "${blockId}". Call area_get to list blocks.`,
      };
    }
  }
  const id = blockId ?? nanoid(6);
  const block = build(id);
  store.upsertBlock(areaId, block);
  return {
    ok: true,
    data: { blockId: id },
    summary: `${blockId ? "Updated" : "Added"} ${block.type} "${block.title}"`,
  };
}

const handlers: {
  [N in AreaToolName]: (areaId: string, input: Input<N>) => ToolExecutionResult;
} = {
  area_get: (areaId) => {
    const s = useAreasStore.getState();
    const area = s.areas.find((a) => a.id === areaId);
    return {
      ok: true,
      data: {
        name: area?.name,
        memory: s.memories[areaId] ?? "",
        blocks: s.blocks[areaId] ?? [],
      },
      summary: "Read area",
    };
  },

  area_set_note: (areaId, { blockId, title, markdown }) =>
    upsert(areaId, blockId, (id) => ({ id, type: "note", title, markdown })),

  area_set_table: (areaId, { blockId, title, columns, rows }) => {
    if (rows.some((r) => r.length !== columns.length)) {
      return {
        ok: false,
        error: `Every row must have exactly ${columns.length} cells to match the columns.`,
      };
    }
    return upsert(areaId, blockId, (id) => ({
      id,
      type: "table",
      title,
      columns,
      rows,
    }));
  },

  area_set_metric: (areaId, { blockId, title, unit, history }) =>
    upsert(areaId, blockId, (id) => ({
      id,
      type: "metric",
      title,
      unit,
      history: history ?? [],
    })),

  area_add_metric_point: (areaId, { blockId, value, date }) => {
    const block = (useAreasStore.getState().blocks[areaId] ?? []).find(
      (b) => b.id === blockId,
    );
    if (!block || block.type !== "metric") {
      return { ok: false, error: `No metric block with id "${blockId}".` };
    }
    const point = { date: date ?? dayKey(), value };
    useAreasStore.getState().upsertBlock(areaId, {
      ...block,
      history: [...block.history, point],
    });
    return {
      ok: true,
      data: { blockId, point },
      summary: `Logged ${value}${block.unit} to "${block.title}"`,
    };
  },

  area_set_routine: (areaId, { blockId, title, days }) =>
    upsert(areaId, blockId, (id) => ({ id, type: "routine", title, days })),

  area_set_checklist: (areaId, { blockId, title, items }) =>
    upsert(areaId, blockId, (id) => ({
      id,
      type: "checklist",
      title,
      items: items.map((i) => ({ id: nanoid(6), text: i.text, done: i.done })),
    })),

  area_set_links: (areaId, { blockId, title, items }) =>
    upsert(areaId, blockId, (id) => ({ id, type: "links", title, items })),

  area_delete_block: (areaId, { blockId }) => {
    const block = (useAreasStore.getState().blocks[areaId] ?? []).find(
      (b) => b.id === blockId,
    );
    if (!block) return { ok: false, error: `No block with id "${blockId}".` };
    useAreasStore.getState().deleteBlock(areaId, blockId);
    return {
      ok: true,
      data: { blockId },
      summary: `Deleted "${block.title}"`,
    };
  },

  area_update_memory: (areaId, { memory }) => {
    useAreasStore.getState().setMemory(areaId, memory);
    return { ok: true, data: {}, summary: "Memory updated" };
  },
};

export function executeAreaTool(
  areaId: string,
  toolName: string,
  rawInput: unknown,
): ToolExecutionResult {
  const schema = areaToolSchemas[toolName as AreaToolName];
  if (!schema) return { ok: false, error: `Unknown tool "${toolName}"` };
  const missing = requireArea(areaId);
  if (missing) return { ok: false, error: missing };
  const parsed = schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Invalid input — ${issues}` };
  }
  const handler = handlers[toolName as AreaToolName] as (
    areaId: string,
    input: unknown,
  ) => ToolExecutionResult;
  return handler(areaId, parsed.data);
}
