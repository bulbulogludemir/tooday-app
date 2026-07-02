import { beforeEach, describe, expect, it } from "vitest";
import { useAreasStore } from "@/stores/useAreasStore";
import { dayKey } from "@/lib/time";
import { executeAreaTool } from "../executeAreaTool";

let AREA = "";

beforeEach(() => {
  useAreasStore.setState({ areas: [], blocks: {}, memories: {}, chats: {} });
  AREA = useAreasStore.getState().addArea("Finance", "Wallet", "emerald");
});

describe("store basics", () => {
  it("addArea/deleteArea cascades", () => {
    useAreasStore.getState().setMemory(AREA, "m");
    useAreasStore.getState().setChat(AREA, [{ id: "x" }]);
    useAreasStore.getState().deleteArea(AREA);
    const s = useAreasStore.getState();
    expect(s.areas).toHaveLength(0);
    expect(s.blocks[AREA]).toBeUndefined();
    expect(s.memories[AREA]).toBeUndefined();
    expect(s.chats[AREA]).toBeUndefined();
  });

  it("toggleChecklistItem flips one item", () => {
    executeAreaTool(AREA, "area_set_checklist", {
      title: "Tasks",
      items: [{ text: "a", done: false }],
    });
    const block = useAreasStore.getState().blocks[AREA][0];
    if (block.type !== "checklist") throw new Error("wrong type");
    useAreasStore.getState().toggleChecklistItem(AREA, block.id, block.items[0].id);
    const after = useAreasStore.getState().blocks[AREA][0];
    if (after.type !== "checklist") throw new Error("wrong type");
    expect(after.items[0].done).toBe(true);
  });
});

describe("block upsert semantics", () => {
  it("creates without blockId, replaces with blockId", () => {
    const created = executeAreaTool(AREA, "area_set_note", {
      title: "Strategy",
      markdown: "v1",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = (created.data as { blockId: string }).blockId;

    const updated = executeAreaTool(AREA, "area_set_note", {
      blockId: id,
      title: "Strategy",
      markdown: "v2",
    });
    expect(updated.ok).toBe(true);
    const blocks = useAreasStore.getState().blocks[AREA];
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ id, markdown: "v2" });
  });

  it("errors on unknown blockId", () => {
    const res = executeAreaTool(AREA, "area_set_note", {
      blockId: "nope",
      title: "X",
      markdown: "y",
    });
    expect(res.ok).toBe(false);
  });

  it("table rejects ragged rows", () => {
    const res = executeAreaTool(AREA, "area_set_table", {
      title: "Holdings",
      columns: ["Asset", "Amount"],
      rows: [["BTC"]],
    });
    expect(res.ok).toBe(false);
  });

  it("metric point appends with default date", () => {
    const created = executeAreaTool(AREA, "area_set_metric", {
      title: "Weight",
      unit: "kg",
    });
    if (!created.ok) throw new Error("create failed");
    const id = (created.data as { blockId: string }).blockId;
    const res = executeAreaTool(AREA, "area_add_metric_point", {
      blockId: id,
      value: 82.5,
    });
    expect(res.ok).toBe(true);
    const block = useAreasStore.getState().blocks[AREA][0];
    if (block.type !== "metric") throw new Error("wrong type");
    expect(block.history).toEqual([{ date: dayKey(), value: 82.5 }]);
  });

  it("delete_block removes; unknown id errors", () => {
    const created = executeAreaTool(AREA, "area_set_links", {
      title: "Resources",
      items: [{ label: "Docs", url: "https://example.com" }],
    });
    if (!created.ok) throw new Error("create failed");
    const id = (created.data as { blockId: string }).blockId;
    expect(executeAreaTool(AREA, "area_delete_block", { blockId: id }).ok).toBe(true);
    expect(useAreasStore.getState().blocks[AREA]).toHaveLength(0);
    expect(executeAreaTool(AREA, "area_delete_block", { blockId: id }).ok).toBe(false);
  });
});

describe("memory and reads", () => {
  it("area_update_memory replaces the note", () => {
    expect(
      executeAreaTool(AREA, "area_update_memory", { memory: "Goal: save 20%" }).ok,
    ).toBe(true);
    expect(useAreasStore.getState().memories[AREA]).toBe("Goal: save 20%");
  });

  it("area_get returns name, memory, blocks", () => {
    executeAreaTool(AREA, "area_update_memory", { memory: "m" });
    executeAreaTool(AREA, "area_set_note", { title: "N", markdown: "x" });
    const res = executeAreaTool(AREA, "area_get", {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatchObject({ name: "Finance", memory: "m" });
    expect((res.data as { blocks: unknown[] }).blocks).toHaveLength(1);
  });

  it("unknown area errors", () => {
    expect(executeAreaTool("ghost", "area_get", {}).ok).toBe(false);
  });

  it("invalid input rejected by schema (bad url)", () => {
    const res = executeAreaTool(AREA, "area_set_links", {
      title: "R",
      items: [{ label: "x", url: "not-a-url" }],
    });
    expect(res.ok).toBe(false);
  });
});
