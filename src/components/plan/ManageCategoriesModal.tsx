"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { COLOR_NAMES } from "@/lib/colors";
import type { Category } from "@/stores/usePlanStore";
import { usePlanStore } from "@/stores/usePlanStore";
import Modal from "@/components/ui/Modal";
import ColorDot from "@/components/ui/ColorDot";

interface ManageCategoriesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ManageCategoriesModal({
  open,
  onClose,
}: ManageCategoriesModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Manage Categories"
      width={460}
    >
      {/* remounts on every open, so the draft always starts from the store */}
      {open && <CategoriesForm onClose={onClose} />}
    </Modal>
  );
}

function CategoriesForm({ onClose }: { onClose: () => void }) {
  const setCategories = usePlanStore((s) => s.setCategories);
  const [draft, setDraft] = useState<Category[]>(() =>
    usePlanStore.getState().categories
  );

  const addRow = () =>
    setDraft((d) => [
      ...d,
      {
        id: nanoid(),
        name: "",
        color: COLOR_NAMES[d.length % COLOR_NAMES.length],
        type: "offline",
      },
    ]);

  const patchRow = (id: string, patch: Partial<Category>) =>
    setDraft((d) => d.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const removeRow = (id: string) =>
    setDraft((d) => d.filter((c) => c.id !== id));

  const save = () => {
    setCategories(
      draft
        .map((c) => ({ ...c, name: c.name.trim() }))
        .filter((c) => c.name.length > 0)
    );
    onClose();
  };

  return (
    <>
      <div className="flex min-h-[90px] flex-col gap-2">
        <AnimatePresence initial={false}>
          {draft.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
              className="group flex items-center gap-3"
            >
              {/* color picker */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    aria-label="Pick color"
                    className="rounded-full p-1 transition-colors hover:bg-white/5"
                  >
                    <ColorDot color={c.color} size={14} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="start"
                    sideOffset={4}
                    className="z-[70] max-h-72 overflow-y-auto rounded-lg bg-surface-2 p-1 shadow-xl"
                  >
                    {COLOR_NAMES.map((name) => (
                      <DropdownMenu.Item
                        key={name}
                        onSelect={() => patchRow(c.id, { color: name })}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-white/5"
                      >
                        <span className="w-3">
                          {c.color === name && <Check size={12} />}
                        </span>
                        <ColorDot color={name} size={12} />
                        <span>{name}</span>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {/* name */}
              <input
                value={c.name}
                onChange={(e) => patchRow(c.id, { name: e.target.value })}
                placeholder="New Category"
                className="h-10 flex-1 rounded-lg bg-surface-2 px-3 text-sm outline-none placeholder:text-muted/60 focus:ring-1 focus:ring-accent/40"
              />

              {/* storage type */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="rounded-lg bg-surface-2 px-3 py-2 text-xs capitalize text-muted transition-colors hover:text-foreground">
                    {c.type}
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    className="z-[70] rounded-lg bg-surface-2 p-1 shadow-xl"
                  >
                    {(["offline", "online"] as const).map((t) => (
                      <DropdownMenu.Item
                        key={t}
                        onSelect={() => patchRow(c.id, { type: t })}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs capitalize outline-none data-[highlighted]:bg-white/5"
                      >
                        <span className="w-3">
                          {c.type === t && <Check size={12} />}
                        </span>
                        {t}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {/* delete row */}
              <button
                aria-label="Delete category"
                onClick={() => removeRow(c.id)}
                className="p-1 text-muted/0 transition-colors hover:text-red-400 group-hover:text-muted"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {draft.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-4 text-sm text-muted/60">
            <Bookmark size={14} className="mr-2" /> No categories yet
          </div>
        )}
      </div>

      {/* footer */}
      <div className="-mx-6 -mb-5 mt-4 flex items-center justify-between rounded-b-2xl bg-surface-2/50 px-6 py-4">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <Plus size={14} /> New Category
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-colors hover:text-foreground"
          >
            Close
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-[var(--accent-strong)] px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
