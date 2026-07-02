"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { usePlanStore } from "@/stores/usePlanStore";

/** Open todos linked to the running activity, right under the status chip */
export default function ActiveTodos({
  activityName,
}: {
  activityName: string | null;
}) {
  const todos = usePlanStore((s) => s.todos);
  const toggleTodo = usePlanStore((s) => s.toggleTodo);

  if (!activityName) return null;
  const linked = todos
    .filter((t) => !t.done && t.activity === activityName)
    .slice(0, 4);
  if (linked.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-4 flex w-72 flex-col gap-1.5"
    >
      <span className="px-1 text-[10px] uppercase tracking-wide text-muted/60">
        Todos for {activityName}
      </span>
      <AnimatePresence initial={false}>
        {linked.map((t) => (
          <motion.button
            key={t.id}
            layout
            exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
            onClick={() => toggleTodo(t.id)}
            className="group flex items-center gap-2.5 rounded-full bg-surface/70 px-3 py-2 text-left text-xs backdrop-blur-sm transition-colors hover:bg-surface-2"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/20 transition-colors group-hover:border-indigo-400">
              <Check
                size={10}
                className="text-white opacity-0 transition-opacity group-hover:opacity-40"
              />
            </span>
            <span className="truncate text-foreground/85">{t.text}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
