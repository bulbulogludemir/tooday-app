"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { usePlanStore } from "@/stores/usePlanStore";
import { useToastStore } from "@/stores/useToastStore";
import Modal from "@/components/ui/Modal";

interface TemplatesModalProps {
  open: boolean;
  day: string; // day the template gets applied to / saved from
  onClose: () => void;
}

/** Save the current day's layout as a reusable template, or apply one */
export default function TemplatesModal({
  open,
  day,
  onClose,
}: TemplatesModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Day Templates"
      width={440}
    >
      {open && <TemplatesBody day={day} onClose={onClose} />}
    </Modal>
  );
}

function TemplatesBody({ day, onClose }: { day: string; onClose: () => void }) {
  const { templates, plans, saveTemplate, applyTemplate, deleteTemplate } =
    usePlanStore();
  const show = useToastStore((s) => s.show);
  const [name, setName] = useState("");
  const dayCount = (plans[day] ?? []).length;

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed || dayCount === 0) return;
    saveTemplate(trimmed, day);
    setName("");
    show(`Template "${trimmed}" saved`);
  };

  const apply = (id: string, tplName: string) => {
    const applied = applyTemplate(id, day);
    show(
      applied > 0
        ? `"${tplName}" applied — ${applied} task${applied > 1 ? "s" : ""} added`
        : `Nothing to add — the day is already occupied`
    );
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* save current day */}
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={
            dayCount > 0
              ? `Save this day (${dayCount} tasks) as…`
              : "This day is empty — nothing to save"
          }
          disabled={dayCount === 0}
          className="h-10 flex-1 rounded-lg bg-surface-2 px-3 text-sm outline-none placeholder:text-muted/60 focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
        />
        <button
          onClick={save}
          disabled={!name.trim() || dayCount === 0}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-[var(--accent-strong)] px-4 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40"
        >
          <Plus size={14} /> Save
        </button>
      </div>

      {/* template list */}
      <div className="flex min-h-[80px] flex-col gap-2">
        <AnimatePresence initial={false}>
          {templates.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
              className="group flex items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5"
            >
              <LayoutTemplate size={14} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t.name}</p>
                <p className="text-[11px] text-muted">
                  {t.activities.length} task
                  {t.activities.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => apply(t.id, t.name)}
                className="rounded-full bg-[var(--accent-strong)]/90 px-3 py-1 text-xs font-medium text-white transition-colors hover:brightness-110"
              >
                Apply
              </button>
              <button
                aria-label="Delete template"
                onClick={() => deleteTemplate(t.id)}
                className="p-1 text-muted/0 transition-colors hover:text-red-400 group-hover:text-muted"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {templates.length === 0 && (
          <p className="py-6 text-center text-sm text-muted/60">
            No templates yet. Save a planned day above to reuse it later.
          </p>
        )}
      </div>
    </div>
  );
}
