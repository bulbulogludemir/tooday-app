import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

export interface Area {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

export type AreaBlock =
  | { id: string; type: "note"; title: string; markdown: string }
  | {
      id: string;
      type: "table";
      title: string;
      columns: string[];
      rows: string[][];
    }
  | {
      id: string;
      type: "metric";
      title: string;
      unit: string;
      history: { date: string; value: number }[];
    }
  | {
      id: string;
      type: "routine";
      title: string;
      days: { day: string; items: string[] }[];
    }
  | {
      id: string;
      type: "checklist";
      title: string;
      items: { id: string; text: string; done: boolean }[];
    }
  | {
      id: string;
      type: "links";
      title: string;
      items: { label: string; url: string; note?: string }[];
    };

interface AreasState {
  areas: Area[];
  blocks: Record<string, AreaBlock[]>;
  memories: Record<string, string>;
  chats: Record<string, unknown[]>;
  addArea: (name: string, icon: string, color: string) => string;
  renameArea: (id: string, name: string) => void;
  deleteArea: (id: string) => void;
  restoreArea: (
    area: Area,
    blocks: AreaBlock[],
    memory: string,
    chat: unknown[],
  ) => void;
  upsertBlock: (areaId: string, block: AreaBlock) => void;
  deleteBlock: (areaId: string, blockId: string) => void;
  setMemory: (areaId: string, memory: string) => void;
  setChat: (areaId: string, messages: unknown[]) => void;
  toggleChecklistItem: (
    areaId: string,
    blockId: string,
    itemId: string,
  ) => void;
}

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export const useAreasStore = create<AreasState>()(
  persist(
    (set) => ({
      areas: [],
      blocks: {},
      memories: {},
      chats: {},

      addArea: (name, icon, color) => {
        const id = nanoid(8);
        set((s) => ({
          areas: [
            ...s.areas,
            { id, name, icon, color, createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },

      renameArea: (id, name) =>
        set((s) => ({
          areas: s.areas.map((a) => (a.id === id ? { ...a, name } : a)),
        })),

      deleteArea: (id) =>
        set((s) => ({
          areas: s.areas.filter((a) => a.id !== id),
          blocks: omit(s.blocks, id),
          memories: omit(s.memories, id),
          chats: omit(s.chats, id),
        })),

      restoreArea: (area, blocks, memory, chat) =>
        set((s) => ({
          areas: [...s.areas, area],
          blocks: { ...s.blocks, [area.id]: blocks },
          memories: { ...s.memories, [area.id]: memory },
          chats: { ...s.chats, [area.id]: chat },
        })),

      upsertBlock: (areaId, block) =>
        set((s) => {
          const list = s.blocks[areaId] ?? [];
          const exists = list.some((b) => b.id === block.id);
          return {
            blocks: {
              ...s.blocks,
              [areaId]: exists
                ? list.map((b) => (b.id === block.id ? block : b))
                : [...list, block],
            },
          };
        }),

      deleteBlock: (areaId, blockId) =>
        set((s) => ({
          blocks: {
            ...s.blocks,
            [areaId]: (s.blocks[areaId] ?? []).filter((b) => b.id !== blockId),
          },
        })),

      setMemory: (areaId, memory) =>
        set((s) => ({ memories: { ...s.memories, [areaId]: memory } })),

      setChat: (areaId, messages) =>
        set((s) => ({ chats: { ...s.chats, [areaId]: messages } })),

      toggleChecklistItem: (areaId, blockId, itemId) =>
        set((s) => ({
          blocks: {
            ...s.blocks,
            [areaId]: (s.blocks[areaId] ?? []).map((b) =>
              b.id === blockId && b.type === "checklist"
                ? {
                    ...b,
                    items: b.items.map((i) =>
                      i.id === itemId ? { ...i, done: !i.done } : i,
                    ),
                  }
                : b,
            ),
          },
        })),
    }),
    { name: "areas-storage" },
  ),
);
