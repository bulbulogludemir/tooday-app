"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Tag, Trash2 } from "lucide-react";
import { usePlanStore, type Todo } from "@/stores/usePlanStore";
import { dayKey } from "@/lib/time";
import { useNow } from "@/lib/useNow";

export default function TodosPage() {
  const now = useNow(60_000);
  const { todos, plans, addTodo, toggleTodo, removeTodo, clearCompletedTodos } =
    usePlanStore();
  const [text, setText] = useState("");

  if (!now) return <main className="min-h-screen" />;

  // today's activity names, usable as todo tags
  const activityNames = [
    ...new Set((plans[dayKey(now)] ?? []).map((a) => a.name)),
  ];

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addTodo(trimmed);
    setText("");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 pt-28">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Todos{" "}
          <span className="text-sm font-normal text-muted">
            ({open.length} open)
          </span>
        </h1>
        {done.length > 0 && (
          <button
            onClick={clearCompletedTodos}
            className="text-xs text-muted transition-colors hover:text-red-400"
          >
            Clear completed
          </button>
        )}
      </div>

      {/* add input */}
      <div className="mb-6 flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 focus-within:ring-1 focus-within:ring-accent/40">
        <Plus size={16} className="shrink-0 text-muted" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a todo…"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
        />
        {text.trim() && (
          <button
            onClick={submit}
            className="rounded-full bg-[var(--accent-strong)] px-3 py-1 text-xs font-medium text-white transition-colors hover:brightness-110"
          >
            Add
          </button>
        )}
      </div>

      {/* open todos */}
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {open.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              activityNames={activityNames}
              onToggle={toggleTodo}
              onRemove={removeTodo}
            />
          ))}
        </AnimatePresence>
        {todos.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center text-sm text-muted/60"
          >
            Nothing to do yet. Add your first todo above.
          </motion.p>
        )}
      </div>

      {/* completed */}
      {done.length > 0 && (
        <>
          <div className="mb-2 mt-8 flex items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-muted/60">
              Completed
            </span>
            <span className="h-px flex-1 bg-white/5" />
          </div>
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {done.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  activityNames={activityNames}
                  onToggle={toggleTodo}
                  onRemove={removeTodo}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </main>
  );
}

function TodoRow({
  todo,
  activityNames,
  onToggle,
  onRemove,
}: {
  todo: Todo;
  activityNames: string[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const setTodoActivity = usePlanStore((s) => s.setTodoActivity);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group flex items-center gap-3 rounded-full border-t border-white/5 bg-surface px-4 py-2.5 shadow-sm"
    >
      {/* animated checkbox */}
      <button
        aria-label={todo.done ? "Mark as not done" : "Mark as done"}
        onClick={() => onToggle(todo.id)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          todo.done
            ? "border-indigo-500 bg-indigo-500"
            : "border-white/20 hover:border-indigo-400"
        }`}
      >
        <AnimatePresence>
          {todo.done && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Check size={12} className="text-white" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* label with animated strike-through */}
      <span className="relative min-w-0 flex-1 truncate text-sm">
        <span
          className={`transition-colors duration-300 ${
            todo.done ? "text-muted/50" : "text-foreground"
          }`}
        >
          {todo.text}
        </span>
        <motion.span
          aria-hidden
          className="absolute left-0 top-1/2 h-px bg-muted/60"
          initial={false}
          animate={{ width: todo.done ? "100%" : "0%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </span>

      {/* link the todo to one of today's activities */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            aria-label="Link to activity"
            className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] transition-colors ${
              todo.activity
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-muted/0 hover:text-foreground group-hover:text-muted"
            }`}
          >
            <Tag size={11} />
            {todo.activity && (
              <span className="max-w-24 truncate">{todo.activity}</span>
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="elev-2 z-[60] min-w-40 rounded-lg border-t border-white/[0.07] bg-surface-2/90 p-1 backdrop-blur-md"
          >
            <DropdownMenu.Item
              onSelect={() => setTodoActivity(todo.id, null)}
              className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs outline-none data-[highlighted]:bg-white/5"
            >
              <span className="w-3">{!todo.activity && <Check size={12} />}</span>
              No activity
            </DropdownMenu.Item>
            {activityNames.map((name) => (
              <DropdownMenu.Item
                key={name}
                onSelect={() => setTodoActivity(todo.id, name)}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs outline-none data-[highlighted]:bg-white/5"
              >
                <span className="w-3">
                  {todo.activity === name && <Check size={12} />}
                </span>
                <span className="truncate">{name}</span>
              </DropdownMenu.Item>
            ))}
            {activityNames.length === 0 && (
              <p className="px-2.5 py-1.5 text-[11px] text-muted/60">
                No activities planned today
              </p>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <button
        aria-label="Delete todo"
        onClick={() => onRemove(todo.id)}
        className="p-1 text-muted/0 transition-colors hover:text-red-400 group-hover:text-muted"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}
